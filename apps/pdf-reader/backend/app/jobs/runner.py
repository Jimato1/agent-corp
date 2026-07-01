"""Op dispatch + per-job resource limits (D3), called from the worker CLI
(``app.jobs.worker``) which runs in its own OS subprocess so the manager can
hard-kill it on cancel/timeout. Takes/returns plain JSON-able dicts.
"""
from __future__ import annotations

import os
import sys
import zipfile
from pathlib import Path
from typing import Any


def _apply_rlimits(cpu_seconds: int, fsize_mb: int) -> None:
    """POSIX only — cap CPU time and output file size as a backstop."""
    if sys.platform == "win32":
        return
    try:
        import resource

        resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds + 5))
        fsize = fsize_mb * 1024 * 1024
        resource.setrlimit(resource.RLIMIT_FSIZE, (fsize, fsize))
    except Exception:  # noqa: BLE001 — never fail the job over a limit-set hiccup
        pass


def _build_context(spec: dict[str, Any]):
    from app.schemas.ops import OP_PARAMS, parse_options
    from app.services.base import OpContext

    ctx_meta = spec["ctx"]
    op = spec["op"]
    parse_op = op if op in OP_PARAMS else "finalize"  # internal ops (noop) reuse finalize params
    return OpContext(
        op=op,
        job_dir=Path(spec["job_dir"]),
        tmp_dir=Path(spec["job_dir"]) / "tmp",
        inputs=[Path(p) for p in spec["inputs"]],
        input_names=list(spec["input_names"]),
        options=parse_options(parse_op, spec["options_json"]),
        job_timeout=ctx_meta["job_timeout"],
        ocr_timeout=ctx_meta["ocr_timeout"],
        ocr_languages=tuple(ctx_meta["ocr_languages"]),
        max_pages=ctx_meta["max_pages"],
    )


def execute(spec: dict[str, Any]) -> dict[str, Any]:
    """Run the op and return a result dict (artifacts + optional bundle + meta)."""
    from app.services import registry
    from app.services.base import OpResult

    _apply_rlimits(spec["ctx"]["rlimit_cpu"], spec["ctx"]["rlimit_fsize_mb"])
    os.environ.setdefault("TMPDIR", str(Path(spec["job_dir"]) / "tmp"))

    fn = registry.get(spec["op"])
    if fn is None:
        raise _ServiceError("unknown_op", f"Unknown operation: {spec['op']}.")

    ctx = _build_context(spec)
    result: OpResult = fn(ctx)

    # Fan-out DoS defense: bound artifact COUNT and CUMULATIVE bytes. RLIMIT_FSIZE
    # only caps a single file, so a high-DPI rasterize / split-single over many
    # pages could otherwise fill the volume.
    max_artifacts = spec["ctx"].get("max_output_artifacts", 2000)
    max_output_bytes = spec["ctx"].get("max_output_bytes", 1024 * 1024 * 1024)
    if len(result.artifacts) > max_artifacts:
        raise _ServiceError("output_too_large", "This operation would produce too many files.")

    artifacts = []
    total_out = 0
    for i, a in enumerate(result.artifacts):
        p = Path(a.path)
        size = p.stat().st_size
        total_out += size
        if total_out > max_output_bytes:
            raise _ServiceError("output_too_large", "The result is larger than the allowed limit.")
        artifacts.append(
            {"index": i, "path": str(p), "media_type": a.media_type, "filename": a.filename, "bytes": size}
        )

    bundle = None
    if len(artifacts) > 1:
        zip_name = result.zip_name or f"{ctx.primary_stem}.zip"
        zip_path = Path(spec["job_dir"]) / "bundle.zip"
        with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
            for a in artifacts:
                zf.write(a["path"], arcname=a["filename"])
        bundle = {"path": str(zip_path), "media_type": "application/zip", "filename": zip_name, "bytes": zip_path.stat().st_size}

    return {"artifacts": artifacts, "bundle": bundle, "meta": result.meta or {}}


class _ServiceError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message
