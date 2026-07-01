"""Repair — libqpdf attempts recovery on open, then the file exits via the
canonical finalize pass (normalize + linearize + scrub)."""
from __future__ import annotations

from .base import OpContext, OpResult, artifact
from .finalize import finalize_file


def run_repair(ctx: OpContext) -> OpResult:
    out = ctx.out("output.pdf")
    finalize_file(ctx.primary_input, out)
    return OpResult(artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}-repaired.pdf")],
                    meta={"op": "repair"})


def register_ops(register) -> None:  # noqa: ANN001
    register("repair", run_repair)
