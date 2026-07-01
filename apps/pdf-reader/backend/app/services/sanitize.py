"""Sanitize — the ONLY op that removes embedded files/metadata (finalize always
strips active content; sanitize additionally strips attachments + metadata)."""
from __future__ import annotations

from .base import OpContext, OpResult, artifact
from .finalize import finalize_file


def run_sanitize(ctx: OpContext) -> OpResult:
    opts = ctx.options
    out = ctx.out("output.pdf")
    finalize_file(
        ctx.primary_input, out,
        strip_metadata=bool(getattr(opts, "strip_metadata", True)),
        strip_attachments=bool(getattr(opts, "strip_attachments", True)),
    )
    return OpResult(artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}-sanitized.pdf")],
                    meta={"op": "sanitize"})


def register_ops(register) -> None:  # noqa: ANN001
    register("sanitize", run_sanitize)
