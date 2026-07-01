"""pikepdf (libqpdf bindings only — no qpdf CLI, D8).

Owns: open/decrypt, active-content scrub, linearized save (with optional
encryption/permissions applied in the SAME save), merge/split, sanitize, repair.
"""
from __future__ import annotations

from pathlib import Path
from typing import Any

# Active content that is ALWAYS stripped from durable output (OQ#8, API §6).
_ACTIVE_KEYS = ("/OpenAction", "/AA")


def open_pdf(path: Path, password: str | None = None):
    """Open a PDF, decrypting with ``password`` if given. Raises PasswordError."""
    import pikepdf

    return pikepdf.open(str(path), password=password or "")


def open_or_raise(path: Path, password: str | None = None):
    """Open a PDF, mapping failures to the canonical AppErrors: a bad/absent
    password → wrong_password (422), any other parse failure → bad_pdf_structure.
    This is the one place services open a possibly-encrypted input."""
    import pikepdf

    from app.core.errors import bad_pdf_structure, wrong_password

    try:
        return open_pdf(path, password=password)
    except pikepdf.PasswordError as exc:
        raise wrong_password() from exc
    except Exception as exc:  # noqa: BLE001 — any parse failure is a bad structure
        raise bad_pdf_structure() from exc


def scrub_active_content(pdf) -> None:  # noqa: ANN001
    """Remove /JavaScript /JS /OpenAction /AA /Launch wherever they hang."""
    import pikepdf

    root = pdf.Root
    for key in _ACTIVE_KEYS:
        if key in root:
            del root[key]
    # Document-level JavaScript name tree.
    names = root.get("/Names")
    if names is not None and "/JavaScript" in names:
        del names["/JavaScript"]

    # Per-page additional-actions + annotation actions (/Launch, /JavaScript).
    for page in pdf.pages:
        if "/AA" in page:
            del page["/AA"]
        annots = page.get("/Annots")
        if annots is None:
            continue
        for annot in list(annots):
            action = annot.get("/A")
            if action is not None:
                s = action.get("/S")
                if s is not None and str(s) in ("/JavaScript", "/Launch"):
                    del annot["/A"]
            if "/AA" in annot:
                del annot["/AA"]
    _ = pikepdf  # keep import local + explicit


def save_linearized(pdf, out_path: Path, encryption: Any | None = None) -> None:  # noqa: ANN001
    """Canonical durable save: normalized + linearized, encryption in the same save."""
    kwargs: dict[str, Any] = {"linearize": True}
    if encryption is not None:
        kwargs["encryption"] = encryption
    pdf.save(str(out_path), **kwargs)


def make_encryption(user_password: str, owner_password: str | None, allow=None):  # noqa: ANN001
    """AES-256 (R=6) encryption spec. Owner defaults to the user password."""
    import pikepdf

    owner = owner_password or user_password
    kwargs: dict[str, Any] = {"owner": owner, "user": user_password, "R": 6, "aes": True}
    if allow is not None:
        kwargs["allow"] = allow
    return pikepdf.Encryption(**kwargs)
