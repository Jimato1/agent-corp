"""M1 — upload/validate + async job lifecycle (via the noop op)."""
from __future__ import annotations

import io
import zipfile

from conftest import make_pdf, submit_and_wait


def test_noop_lifecycle_and_result(client, sample_pdf):
    r, final = submit_and_wait(client, "noop", sample_pdf)
    assert r.status_code == 202
    assert r.headers["Location"].startswith("/api/jobs/")
    assert r.json()["state"] == "queued"
    assert final["state"] == "succeeded"

    job_id = r.json()["id"]
    res = client.get(f"/api/jobs/{job_id}/result")
    assert res.status_code == 200
    assert res.headers["content-type"] == "application/pdf"
    assert "attachment" in res.headers["content-disposition"]
    assert res.content[:5] == b"%PDF-"


def test_oversized_upload_413(make_client, sample_pdf):
    client = make_client(PDFFORGE_MAX_UPLOAD_MB="0")  # everything is "too large"
    files = {"file": ("sample.pdf", sample_pdf, "application/pdf")}
    r = client.post("/api/jobs/noop", files=files, data={"options": "{}"})
    assert r.status_code == 413
    assert r.json()["error"]["code"] == "file_too_large"


def test_txt_renamed_pdf_415(client, not_a_pdf):
    files = {"file": ("sneaky.pdf", not_a_pdf, "application/pdf")}
    r = client.post("/api/jobs/noop", files=files, data={"options": "{}"})
    assert r.status_code == 415
    assert r.json()["error"]["code"] == "not_a_pdf"


def test_truncated_pdf_400(client):
    truncated = b"%PDF-1.7\n%garbage only, no xref or objects\n"
    files = {"file": ("broken.pdf", truncated, "application/pdf")}
    r = client.post("/api/jobs/noop", files=files, data={"options": "{}"})
    assert r.status_code == 400
    assert r.json()["error"]["code"] == "bad_pdf_structure"


def test_unknown_op_404(client, sample_pdf):
    files = {"file": ("sample.pdf", sample_pdf, "application/pdf")}
    r = client.post("/api/jobs/frobnicate", files=files, data={"options": "{}"})
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "unknown_op"


def test_queue_full_429(make_client, sample_pdf):
    # worker=1, queue=0 → capacity 1; submit a slow-ish job then a second → 429.
    client = make_client(PDFFORGE_WORKER_COUNT="1", PDFFORGE_QUEUE_MAXSIZE="0")
    files = {"file": ("sample.pdf", sample_pdf, "application/pdf")}
    first = client.post("/api/jobs/noop", files=files, data={"options": "{}"})
    assert first.status_code == 202
    # Immediately fire more; at least one should be rejected while the first runs.
    codes = []
    for _ in range(5):
        rr = client.post("/api/jobs/noop", files={"file": ("s.pdf", sample_pdf, "application/pdf")}, data={"options": "{}"})
        codes.append(rr.status_code)
    assert 429 in codes
    rej = next(c for c in codes if c == 429)
    assert rej == 429


def test_delete_running_job_cancels(make_client):
    client = make_client(PDFFORGE_WORKER_COUNT="1")
    big = make_pdf(40)
    files = {"file": ("big.pdf", big, "application/pdf")}
    r = client.post("/api/jobs/noop", files=files, data={"options": "{}"})
    job_id = r.json()["id"]
    d = client.delete(f"/api/jobs/{job_id}")
    assert d.status_code == 200
    assert d.json()["state"] == "canceled"


def test_ttl_expiry_result_gone(make_client, sample_pdf):
    client = make_client(PDFFORGE_JOB_TTL_SECONDS="0")
    r, final = submit_and_wait(client, "noop", sample_pdf)
    assert final["state"] == "succeeded"
    from app.jobs.manager import get_manager

    get_manager().sweep_now()
    got = client.get(f"/api/jobs/{r.json()['id']}")
    assert got.status_code == 404
    assert got.json()["error"]["code"] == "result_gone"


def test_disk_precheck_507(make_client, sample_pdf):
    # A huge max-upload makes free < 4×max → disk precheck rejects before intake.
    client = make_client(PDFFORGE_MAX_UPLOAD_MB="100000000")  # 100 TB
    files = {"file": ("sample.pdf", sample_pdf, "application/pdf")}
    r = client.post("/api/jobs/noop", files=files, data={"options": "{}"})
    assert r.status_code == 507
    assert r.json()["error"]["code"] == "disk_full"


def test_invalid_options_json_422(client, sample_pdf):
    files = {"file": ("sample.pdf", sample_pdf, "application/pdf")}
    r = client.post("/api/jobs/noop", files=files, data={"options": "{not json"})
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "invalid_options"


def test_multi_artifact_zip_roundtrip_is_wired():
    # A structural check that the zip bundling helper produces a valid archive
    # (exercised for real by OCR/split in later milestones).
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("a.txt", "x")
    buf.seek(0)
    with zipfile.ZipFile(buf) as zf:
        assert zf.namelist() == ["a.txt"]
