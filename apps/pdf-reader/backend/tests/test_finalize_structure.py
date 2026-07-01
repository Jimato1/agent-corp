"""M2 — finalize (strip active content, preserve attachments, linearize) + merge/split."""
from __future__ import annotations

import io
import zipfile

import pikepdf
from conftest import download as _download
from conftest import make_encrypted_pdf, make_pdf, poll_job, submit_and_wait


def test_finalize_strips_active_content_preserves_attachments(client):
    src = make_pdf(2, with_active_content=True, with_attachment=True)
    # sanity: the input really has the active content + attachment
    with pikepdf.open(io.BytesIO(src)) as pdf:
        assert "/OpenAction" in pdf.Root
        assert "note.txt" in pdf.attachments

    r, final = submit_and_wait(client, "finalize", src)
    assert final["state"] == "succeeded", final
    out = _download(client, r.json()["id"])

    with pikepdf.open(io.BytesIO(out)) as pdf:
        assert "/OpenAction" not in pdf.Root
        names = pdf.Root.get("/Names")
        assert names is None or "/JavaScript" not in names
        assert "note.txt" in pdf.attachments  # preserved by default
        assert pdf.is_linearized


def test_merge_page_counts(client):
    a, b = make_pdf(2), make_pdf(3)
    files = [("file", ("a.pdf", a, "application/pdf")), ("file", ("b.pdf", b, "application/pdf"))]
    r = client.post("/api/jobs/merge", files=files, data={"options": "{}"})
    assert r.status_code == 202, r.text
    job_id = r.json()["id"]
    final = poll_job(client, job_id)
    assert final["state"] == "succeeded", final
    out = _download(client, job_id)
    with pikepdf.open(io.BytesIO(out)) as pdf:
        assert len(pdf.pages) == 5


def test_merge_decrypts_encrypted_input_first(client):
    enc = make_encrypted_pdf("secret", pages=2)
    plain = make_pdf(1)
    files = [("file", ("enc.pdf", enc, "application/pdf")), ("file", ("p.pdf", plain, "application/pdf"))]
    r = client.post("/api/jobs/merge", files=files, data={"options": '{"passwords": ["secret"]}'})
    assert r.status_code == 202, r.text
    job_id = r.json()["id"]
    final = poll_job(client, job_id)
    assert final["state"] == "succeeded", final
    out = _download(client, job_id)
    with pikepdf.open(io.BytesIO(out)) as pdf:  # opens with NO password → decrypted
        assert len(pdf.pages) == 3


def test_split_by_ranges_three_artifacts(client):
    src = make_pdf(25)
    r = client.post("/api/jobs/split", files={"file": ("doc.pdf", src, "application/pdf")},
                    data={"options": '{"mode":"ranges","ranges":["1-10","11-20","21-end"]}'})
    assert r.status_code == 202, r.text
    job_id = r.json()["id"]
    final = poll_job(client, job_id)
    assert final["state"] == "succeeded", final
    assert len(final["result"]["artifacts"]) == 3

    # primary result is a zip of the three
    zbytes = _download(client, job_id)  # deletes the dir after → fetch artifacts BEFORE this in real use
    with zipfile.ZipFile(io.BytesIO(zbytes)) as zf:
        assert len(zf.namelist()) == 3


def test_split_bad_range_out_of_range(client):
    src = make_pdf(5)
    r = client.post("/api/jobs/split", files={"file": ("doc.pdf", src, "application/pdf")},
                    data={"options": '{"mode":"ranges","ranges":["1-99"]}'})
    job_id = r.json()["id"]
    final = poll_job(client, job_id)
    assert final["state"] == "failed"
    assert final["error"]["code"] == "out_of_range"
