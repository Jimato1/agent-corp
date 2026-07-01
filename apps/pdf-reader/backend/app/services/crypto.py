"""Encrypt / decrypt (API §6 ordering).

Encrypt: pikepdf AES-256 R6, applied in the SAME finalize save; pypdf AES-256 is
the fallback. Decrypt: pikepdf only (robust), producing a clean linearized,
password-free PDF. Wrong/absent decrypt password → 422 wrong_password.
"""
from __future__ import annotations

import logging

from app.engines import pikepdf_engine as pk
from app.engines import pypdf_engine
from .base import OpContext, OpResult, artifact
from .finalize import finalize_file

log = logging.getLogger("pdfforge")


def run_encrypt(ctx: OpContext) -> OpResult:
    opts = ctx.options
    out = ctx.out("output.pdf")
    enc = pk.make_encryption(opts.user_password, opts.owner_password)
    try:
        finalize_file(ctx.primary_input, out, encryption=enc)
    except Exception:  # noqa: BLE001 — fall back to pypdf AES-256 on a finalize-save failure
        log.info("job encrypt: pikepdf encrypt failed, using pypdf fallback")
        tmp = ctx.out("normalized.pdf")
        finalize_file(ctx.primary_input, tmp)  # normalize+linearize, no encryption
        pypdf_engine.encrypt_file(tmp, out, opts.user_password, opts.owner_password)
    return OpResult(artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}-encrypted.pdf")],
                    meta={"op": "encrypt", "encrypted": True})


def run_decrypt(ctx: OpContext) -> OpResult:
    opts = ctx.options
    out = ctx.out("output.pdf")
    # finalize_file raises wrong_password on a bad/absent password (pikepdf authority).
    finalize_file(ctx.primary_input, out, password=opts.password)
    return OpResult(artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}-decrypted.pdf")],
                    meta={"op": "decrypt", "encrypted": False})


def register_ops(register) -> None:  # noqa: ANN001
    register("encrypt", run_encrypt)
    register("decrypt", run_decrypt)
