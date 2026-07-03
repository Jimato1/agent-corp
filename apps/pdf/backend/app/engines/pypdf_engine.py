"""pypdf — AES-256 encrypt FALLBACK only (never used for decrypt; pikepdf is the
decrypt authority for robustness, D8)."""
from __future__ import annotations

from pathlib import Path


def encrypt_file(input_path: Path, out_path: Path, user_password: str, owner_password: str | None) -> None:
    from pypdf import PdfReader, PdfWriter

    reader = PdfReader(str(input_path))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(
        user_password=user_password,
        owner_password=owner_password or user_password,
        algorithm="AES-256-R6",
    )
    with out_path.open("wb") as fh:
        writer.write(fh)
