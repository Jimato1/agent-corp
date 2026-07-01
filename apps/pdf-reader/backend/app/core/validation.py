"""3-stage upload validation, in fixed order (SCOPE §5c, API §3.2):

  1. extension allow-list
  2. magic bytes (libmagic if available, else a signature sniff) — a filter only
  3. structural open with pikepdf (libqpdf) — THE authority

libmagic passes polyglots, so pikepdf's structural open is the authority. An
encrypted-but-structurally-valid PDF is accepted (it is a real PDF; ops like
decrypt need it). The client Content-Type is never trusted.
"""
from __future__ import annotations

from pathlib import Path

from .errors import AppError, bad_pdf_structure, not_a_pdf

_PDF_SIG = b"%PDF-"
_IMAGE_SIGS: tuple[tuple[bytes, str], ...] = (
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"II*\x00", "image/tiff"),
    (b"MM\x00*", "image/tiff"),
)


def _ext_ok(filename: str, allowed: tuple[str, ...]) -> bool:
    lower = filename.lower()
    return any(lower.endswith(ext) for ext in allowed)


def _sniff(path: Path, n: int = 2048) -> bytes:
    with path.open("rb") as fh:
        return fh.read(n)


def _looks_like_pdf(head: bytes) -> bool:
    # %PDF- may sit within the first ~1KB (some producers add a leading comment).
    return _PDF_SIG in head[:1024]


def _looks_like_image(head: bytes) -> bool:
    return any(head.startswith(sig) for sig, _ in _IMAGE_SIGS)


def validate_pdf(path: Path, orig_filename: str, *, allowed_ext: tuple[str, ...], max_pages: int) -> None:
    """Raise an AppError if ``path`` is not an acceptable PDF; return None if OK.

    Encrypted-but-structurally-valid PDFs pass here (page count unknown); the
    per-op page cap is re-checked in the worker after decrypt (services.base).
    """
    # Stage 1 — extension allow-list.
    if not _ext_ok(orig_filename, allowed_ext):
        raise not_a_pdf()

    # Stage 2 — magic bytes (filter only).
    head = _sniff(path)
    if not _looks_like_pdf(head):
        raise not_a_pdf()

    # Stage 3 — structural pikepdf open (authority).
    import pikepdf

    try:
        with pikepdf.open(path) as pdf:
            page_count = len(pdf.pages)
    except pikepdf.PasswordError:
        return  # structurally valid but encrypted — a real PDF
    except Exception as exc:  # noqa: BLE001 — any parse failure is a bad structure
        raise bad_pdf_structure() from exc

    if page_count > max_pages:
        raise AppError("too_many_pages", f"That document has more than {max_pages} pages.", 400, {"max_pages": max_pages})


def validate_image(path: Path, orig_filename: str, *, allowed_ext: tuple[str, ...]) -> None:
    """Raise an AppError if ``path`` is not an acceptable image; return None if OK."""
    if not _ext_ok(orig_filename, allowed_ext):
        raise AppError("not_an_image", "That isn't an allowed image type.", 415)
    head = _sniff(path)
    if not _looks_like_image(head):
        raise AppError("not_an_image", "That file's contents are not a supported image.", 415)
    # Authority: Pillow must be able to identify it.
    try:
        from PIL import Image

        with Image.open(path) as im:
            im.verify()
    except Exception as exc:  # noqa: BLE001
        raise AppError("bad_image", "Couldn't read that image.", 400) from exc
