"""M3/M4/M6 — compress, OCR, rasterize, image→PDF, extract-text, sanitize,
linearize, repair.

pikepdf/img2pdf ops run fully here. Ops needing gs/poppler/tesseract run their
happy path only when the binary is present (container); locally they assert the
failure path (missing engine → sanitized failed job)."""
from __future__ import annotations

import io
import shutil

import pikepdf
import pytest
from conftest import download as _download
from conftest import make_pdf, poll_job, submit_and_wait

HAVE_GS = shutil.which("gs") is not None
HAVE_POPPLER = shutil.which("pdftocairo") is not None
HAVE_PDFTOTEXT = shutil.which("pdftotext") is not None
HAVE_TESS = shutil.which("tesseract") is not None


def _png_bytes(w: int = 40, h: int = 30) -> bytes:
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (w, h), (30, 120, 160)).save(buf, "PNG")
    return buf.getvalue()


# ---------------- pikepdf-only ops (always run) ----------------

def test_linearize(client):
    r, final = submit_and_wait(client, "linearize", make_pdf(3))
    assert final["state"] == "succeeded", final
    with pikepdf.open(io.BytesIO(_download(client, r.json()["id"]))) as pdf:
        assert pdf.is_linearized


def test_repair_recovers(client):
    r, final = submit_and_wait(client, "repair", make_pdf(2, with_active_content=True))
    assert final["state"] == "succeeded", final
    with pikepdf.open(io.BytesIO(_download(client, r.json()["id"]))) as pdf:
        assert len(pdf.pages) == 2
        assert "/OpenAction" not in pdf.Root


def test_sanitize_strips_metadata_and_attachments(client):
    # Build an input carrying docinfo + an attachment.
    pdf = pikepdf.new()
    pdf.add_blank_page(page_size=(612, 792))
    with pdf.open_metadata() as m:
        m["dc:title"] = "secret title"
    pdf.attachments["note.txt"] = pikepdf.AttachedFileSpec(pdf, b"hi", filename="note.txt")
    buf = io.BytesIO()
    pdf.save(buf)

    r, final = submit_and_wait(client, "sanitize", buf.getvalue())
    assert final["state"] == "succeeded", final
    with pikepdf.open(io.BytesIO(_download(client, r.json()["id"]))) as out:
        assert len(out.attachments) == 0
        assert "/Metadata" not in out.Root


def test_image_to_pdf(client):
    r = client.post("/api/jobs/image-to-pdf",
                    files={"file": ("pic.png", _png_bytes(), "image/png")},
                    data={"options": '{"page_size":"a4"}'})
    assert r.status_code == 202, r.text
    job_id = r.json()["id"]
    final = poll_job(client, job_id)
    assert final["state"] == "succeeded", final
    with pikepdf.open(io.BytesIO(_download(client, job_id))) as pdf:
        assert len(pdf.pages) == 1


def test_image_to_pdf_rejects_non_image(client):
    r = client.post("/api/jobs/image-to-pdf",
                    files={"file": ("pic.png", b"not really a png", "image/png")},
                    data={"options": "{}"})
    assert r.status_code == 415


# ---------------- compress (Ghostscript) ----------------

@pytest.mark.skipif(not HAVE_GS, reason="ghostscript not installed (container-only)")
def test_compress_happy(client):
    r, final = submit_and_wait(client, "compress", make_pdf(5), options='{"preset":"ebook"}')
    assert final["state"] == "succeeded", final
    assert final["result"]["meta"]["kept"] in ("input", "output")


@pytest.mark.skipif(HAVE_GS, reason="only meaningful when gs is absent")
def test_compress_missing_engine_fails_cleanly(client):
    r, final = submit_and_wait(client, "compress", make_pdf(2))
    assert final["state"] == "failed"
    assert final["error"]["code"] in ("engine_unavailable", "engine_error")
    assert "traceback" not in (final["error"].get("message", "").lower())


# ---------------- rasterize (poppler) ----------------

@pytest.mark.skipif(not HAVE_POPPLER, reason="poppler not installed (container-only)")
def test_rasterize_happy(client):
    r, final = submit_and_wait(client, "rasterize", make_pdf(2), options='{"pages":"1","format":"png","dpi":72}')
    assert final["state"] == "succeeded", final
    assert final["result"]["artifacts"][0]["media_type"] == "image/png"


@pytest.mark.skipif(HAVE_POPPLER, reason="only meaningful when poppler is absent")
def test_rasterize_missing_engine_fails_cleanly(client):
    r, final = submit_and_wait(client, "rasterize", make_pdf(1), options='{"pages":"1"}')
    assert final["state"] == "failed"
    assert final["error"]["code"] in ("engine_unavailable", "engine_error")


# ---------------- extract-text (poppler) ----------------

@pytest.mark.skipif(not HAVE_PDFTOTEXT, reason="pdftotext not installed (container-only)")
def test_extract_text_happy(client):
    r, final = submit_and_wait(client, "extract-text", make_pdf(1))
    assert final["state"] == "succeeded", final
    assert final["result"]["artifacts"][0]["media_type"] == "text/plain"


@pytest.mark.skipif(HAVE_PDFTOTEXT, reason="only meaningful when pdftotext is absent")
def test_extract_text_missing_engine_fails_cleanly(client):
    r, final = submit_and_wait(client, "extract-text", make_pdf(1))
    assert final["state"] == "failed"
    assert final["error"]["code"] in ("engine_unavailable", "engine_error")


# ---------------- OCR (tesseract) ----------------

@pytest.mark.skipif(not HAVE_TESS, reason="tesseract not installed (container-only)")
def test_ocr_happy(client):
    r, final = submit_and_wait(client, "ocr", make_pdf(1), options='{"sidecar":true}')
    assert final["state"] == "succeeded", final


@pytest.mark.skipif(HAVE_TESS, reason="only meaningful when tesseract is absent")
def test_ocr_missing_engine_fails_cleanly(client):
    r, final = submit_and_wait(client, "ocr", make_pdf(1))
    assert final["state"] == "failed"
    assert final["error"]["code"] in ("engine_unavailable", "engine_error")
