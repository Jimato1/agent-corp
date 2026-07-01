"""★ The canonical write pass (API §6, OQ#8).

Every durable artifact exits through here: pikepdf normalize + ``save(linearize=
True)``, ALWAYS stripping active content. Encrypted inputs are decrypted first;
for encrypt/permissions the encryption is applied in the SAME save. Embedded
files are preserved by default and removed only by explicit Sanitize.
"""
from __future__ import annotations

import contextlib
from pathlib import Path
from typing import Any

from app.core.errors import AppError
from app.engines import pikepdf_engine as pk
from .base import OpContext, OpResult, artifact


def finalize_file(
    input_path: Path,
    out_path: Path,
    *,
    password: str | None = None,
    strip_attachments: bool = False,
    strip_metadata: bool = False,
    encryption: Any | None = None,
) -> None:
    """Run the canonical pass on ``input_path`` → ``out_path``."""
    with pk.open_or_raise(input_path, password=password) as pdf:
        pk.scrub_active_content(pdf)
        if strip_metadata:
            _strip_metadata(pdf)
        if strip_attachments:
            _strip_attachments(pdf)
        try:
            pk.save_linearized(pdf, out_path, encryption=encryption)
        except Exception as exc:  # noqa: BLE001
            raise AppError("engine_error", "Couldn't finalize the PDF.", 500) from exc


def _strip_metadata(pdf) -> None:  # noqa: ANN001
    with contextlib.suppress(Exception):
        if "/Metadata" in pdf.Root:
            del pdf.Root["/Metadata"]
    with contextlib.suppress(Exception):
        del pdf.docinfo


def _strip_attachments(pdf) -> None:  # noqa: ANN001
    with contextlib.suppress(Exception):
        names = pdf.Root.get("/Names")
        if names is not None and "/EmbeddedFiles" in names:
            del names["/EmbeddedFiles"]
    with contextlib.suppress(Exception):
        pdf.attachments.clear()


def run_finalize(ctx: OpContext) -> OpResult:
    out = ctx.out("output.pdf")
    finalize_file(ctx.primary_input, out)
    return OpResult(
        artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}.pdf")],
        meta={"op": ctx.op, "linearized": True},
    )


def register_ops(register) -> None:  # noqa: ANN001
    # linearize is finalize exposed directly (M6 re-uses this).
    register("finalize", run_finalize)
    register("linearize", run_finalize)
