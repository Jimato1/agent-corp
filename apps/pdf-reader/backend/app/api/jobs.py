"""Job lifecycle endpoints (API §4) + POST /api/jobs/{op} submit.

The HTTP layer parses, validates, writes inputs to a per-job scratch dir, and
enqueues — it never calls an engine directly (that happens in the worker).
"""
from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, Request, Response, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse, JSONResponse

from app.config import get_settings
from app.core import upload as upload_core
from app.core.errors import (
    file_too_large,
    invalid_options,
    job_not_found,
    job_not_terminal,
    result_gone,
    unknown_op,
)
from app.core.tempdir import remove_job_dir
from app.core.validation import validate_image, validate_pdf
from app.jobs.manager import get_manager
from app.jobs.models import Job
from app.schemas.jobs import JobDescriptor, JobState
from app.schemas.ops import IMAGE_INPUT_OPS, OP_PARAMS, OptionsError, parse_options

router = APIRouter(tags=["jobs"])

# Public ops = the 14 contract ops; `noop` is an internal harness op.
PUBLIC_OPS = set(OP_PARAMS)
SUBMITTABLE = PUBLIC_OPS | {"noop"}


@router.post("/jobs/{op}", status_code=202)
async def submit_job(
    op: str,
    request: Request,
    response: Response,
    file: list[UploadFile] = File(...),
    options: str | None = Form(default=None),
) -> JobDescriptor:
    if op not in SUBMITTABLE:
        raise unknown_op(op)

    settings = get_settings()
    manager = get_manager()

    # Validate options early (422 before we touch disk).
    try:
        parse_options("finalize" if op == "noop" else op, options)
    except OptionsError as exc:
        raise invalid_options(exc.message) from exc

    # Bound the number of parts BEFORE reserving disk or streaming (DoS defense).
    if len(file) > settings.max_input_files:
        raise invalid_options(f"Too many files in one request (max {settings.max_input_files}).")

    upload_core.disk_precheck(settings.jobs_dir, settings.max_upload_bytes,
                              settings.disk_reserve_factor, file_count=len(file))

    job_id = uuid.uuid4().hex
    job_dir = manager.new_scratch(job_id)
    try:
        input_paths, input_names, total = await _receive_inputs(
            file, job_dir, settings, is_image_op=op in IMAGE_INPUT_OPS,
        )
        submitted_by = getattr(request.state, "remote_user", None) or getattr(request.state, "remote_email", None)
        job = manager.submit(
            job_id=job_id,
            op=op,
            input_paths=input_paths,
            input_names=input_names,
            input_bytes=total,
            options_json=options,
            submitted_by=submitted_by,
        )
    except Exception:  # any failure after the dir exists → clean it up, then re-raise
        remove_job_dir(job_dir)
        raise

    response.headers["Location"] = f"/api/jobs/{job.id}"
    return job.descriptor()


async def _receive_inputs(files: list[UploadFile], job_dir: Path, settings, *, is_image_op: bool):  # noqa: ANN001
    """Stream each upload to the job dir and validate it (3-stage, off-loop).

    Enforces the aggregate-size cap and runs the CPU-bound structural open in a
    threadpool so one pathological file can't freeze the event loop."""
    input_paths: list[Path] = []
    input_names: list[str] = []
    total = 0
    for idx, uf in enumerate(files):
        orig = uf.filename or ("image" if is_image_op else "input.pdf")
        ext = Path(orig).suffix.lower() or (".png" if is_image_op else ".pdf")
        dest = job_dir / upload_core.server_input_name(idx, ext)
        total += await upload_core.stream_to_file(uf, dest, settings.max_upload_bytes)
        if total > settings.max_total_upload_bytes:
            raise file_too_large(settings.max_total_upload_mb)
        if is_image_op:
            await run_in_threadpool(validate_image, dest, orig, allowed_ext=settings.allowed_image_ext)
        else:
            await run_in_threadpool(
                validate_pdf, dest, orig,
                allowed_ext=settings.allowed_pdf_ext, max_pages=settings.max_page_count,
            )
        input_paths.append(dest)
        input_names.append(orig)
    if not input_paths:
        raise invalid_options("no input file provided")
    return input_paths, input_names, total


def _load_job(job_id: str, *, require_succeeded: bool = False) -> Job:
    """Fetch a job or raise the canonical lifecycle error (404 / gone / 409)."""
    job = get_manager().get(job_id)
    if job is None:
        raise job_not_found()
    if job.state == JobState.expired:
        raise result_gone()
    if require_succeeded and job.state != JobState.succeeded:
        raise job_not_terminal()
    return job


@router.get("/jobs/{job_id}")
async def get_job(job_id: str) -> JobDescriptor:
    return _load_job(job_id).descriptor()


@router.get("/jobs/{job_id}/result")
async def get_result(job_id: str, disposition: str = "attachment") -> Response:
    job = _load_job(job_id, require_succeeded=True)
    art = job.primary_artifact
    if art is None or not art.path.exists():
        raise result_gone()
    return _stream_artifact(job, art, disposition, delete_dir=True)


@router.get("/jobs/{job_id}/result/{index}")
async def get_artifact(job_id: str, index: int, disposition: str = "attachment") -> Response:
    job = _load_job(job_id, require_succeeded=True)
    match = next((a for a in job.artifacts if a.index == index), None)
    if match is None or not match.path.exists():
        raise result_gone()
    # Individual-artifact fetches do NOT delete the dir (siblings may still be wanted).
    return _stream_artifact(job, match, disposition, delete_dir=False)


@router.delete("/jobs/{job_id}")
async def delete_job(job_id: str) -> JSONResponse:
    job = await get_manager().cancel(job_id)
    if job is None:
        raise job_not_found()
    return JSONResponse({"id": job.id, "state": job.state.value})


_CD_UNSAFE = str.maketrans({'"': "_", "\\": "_", "\r": "", "\n": ""})


def _content_disposition(disp: str, filename: str) -> str:
    """Build a safe Content-Disposition. Strips quote/CRLF break-out chars and
    ASCII-encodes so a hostile filename can't inject header params or 500 the
    response encoder (defense-in-depth; artifact names are also safe_stem'd)."""
    ascii_name = filename.translate(_CD_UNSAFE).encode("ascii", "replace").decode("ascii") or "download"
    return f'{disp}; filename="{ascii_name}"'


def _stream_artifact(job, art, disposition: str, *, delete_dir: bool) -> Response:  # noqa: ANN001
    disp = "inline" if disposition == "inline" else "attachment"
    headers = {"Content-Disposition": _content_disposition(disp, art.filename)}
    background = None
    if delete_dir:
        from starlette.background import BackgroundTask

        def _cleanup(path: Path = job.job_dir) -> None:
            remove_job_dir(path)

        background = BackgroundTask(_cleanup)
    return FileResponse(art.path, media_type=art.media_type, headers=headers, background=background)
