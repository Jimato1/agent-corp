"""Shared pytest fixtures. Points scratch/static dirs at tmp and builds a client."""
from __future__ import annotations

import io
import os
from pathlib import Path

import pikepdf
import pytest


@pytest.fixture(scope="session")
def _dirs(tmp_path_factory: pytest.TempPathFactory) -> tuple[Path, Path]:
    static = tmp_path_factory.mktemp("static")
    (static / "assets").mkdir()
    (static / "index.html").write_text("<!doctype html><title>pdf-forge</title><div id=root></div>")
    (static / "assets" / "app.js").write_text("// built asset")
    jobs = tmp_path_factory.mktemp("jobs")
    return static, jobs


def _fresh_client(static: Path, jobs: Path, **env: str):
    # Clear any PDFFORGE_ overrides from a prior test so each client starts clean.
    for k in [k for k in os.environ if k.startswith("PDFFORGE_")]:
        os.environ.pop(k, None)
    os.environ["PDFFORGE_STATIC_DIR"] = str(static)
    os.environ["PDFFORGE_JOBS_DIR"] = str(jobs)
    os.environ["PDFFORGE_QUEUE_MAXSIZE"] = "8"
    os.environ["PDFFORGE_WORKER_COUNT"] = "1"
    for k, v in env.items():
        os.environ[k] = v

    from app.config import get_settings

    get_settings.cache_clear()
    import app.jobs.manager as mgr

    mgr._manager = None  # fresh registry per test

    from fastapi.testclient import TestClient
    from app.main import create_app

    return TestClient(create_app())


@pytest.fixture()
def client(_dirs):
    static, jobs = _dirs
    for k in ("PDFFORGE_JOB_TTL_SECONDS", "PDFFORGE_QUEUE_MAXSIZE", "PDFFORGE_WORKER_COUNT"):
        os.environ.pop(k, None)
    with _fresh_client(static, jobs) as c:
        yield c


@pytest.fixture()
def make_client(_dirs):
    """Factory for a client with custom env (e.g. TTL=0, queue=0)."""
    static, jobs = _dirs
    created = []

    def _factory(**env: str):
        c = _fresh_client(static, jobs, **env)
        c.__enter__()
        created.append(c)
        return c

    yield _factory
    for c in created:
        c.__exit__(None, None, None)


_TERMINAL = {"succeeded", "failed", "expired", "canceled"}


def poll_job(client, job_id: str, timeout: float = 30.0):
    """Poll GET /api/jobs/{id} until terminal; return the final status body."""
    import time

    deadline = time.time() + timeout
    while time.time() < deadline:
        body = client.get(f"/api/jobs/{job_id}").json()
        if body["state"] in _TERMINAL:
            return body
        time.sleep(0.15)
    raise AssertionError("job did not reach a terminal state in time")


def download(client, job_id: str, index: int | None = None) -> bytes:
    """Fetch a job result (or a specific artifact); assert 200 and return bytes."""
    url = f"/api/jobs/{job_id}/result" if index is None else f"/api/jobs/{job_id}/result/{index}"
    r = client.get(url)
    assert r.status_code == 200, r.text
    return r.content


def submit_and_wait(client, op: str, content: bytes, filename: str = "sample.pdf", options: str = "{}",
                    field: str = "file", timeout: float = 30.0):
    """POST a job then poll until terminal; returns (submit_response, final_json)."""
    files = {field: (filename, content, "application/pdf")}
    r = client.post(f"/api/jobs/{op}", files=files, data={"options": options})
    if r.status_code != 202:
        return r, None
    return r, poll_job(client, r.json()["id"], timeout=timeout)


def make_pdf(pages: int = 2, *, with_active_content: bool = False, with_attachment: bool = False) -> bytes:
    """Build a small valid PDF in-memory (US Letter blank pages)."""
    pdf = pikepdf.new()
    for _ in range(pages):
        pdf.add_blank_page(page_size=(612, 792))
    if with_active_content:
        pdf.Root.OpenAction = pikepdf.Dictionary(S=pikepdf.Name("/JavaScript"), JS=pikepdf.String("app.alert('x');"))
        pdf.Root.Names = pikepdf.Dictionary(
            JavaScript=pikepdf.Dictionary(
                Names=pikepdf.Array([pikepdf.String("evil"), pikepdf.Dictionary(S=pikepdf.Name("/JavaScript"), JS=pikepdf.String("1;"))])
            )
        )
    if with_attachment:
        pdf.attachments["note.txt"] = b"secret attachment"
    buf = io.BytesIO()
    pdf.save(buf)
    return buf.getvalue()


@pytest.fixture()
def sample_pdf() -> bytes:
    return make_pdf(2)


@pytest.fixture()
def sample_pdf_3() -> bytes:
    return make_pdf(3)


def make_encrypted_pdf(password: str, pages: int = 2) -> bytes:
    pdf = pikepdf.new()
    for _ in range(pages):
        pdf.add_blank_page(page_size=(612, 792))
    buf = io.BytesIO()
    pdf.save(buf, encryption=pikepdf.Encryption(owner=password, user=password, R=6, aes=True))
    return buf.getvalue()


@pytest.fixture()
def not_a_pdf() -> bytes:
    return b"this is plainly not a pdf file, just text\n" * 4
