"""Compress (Ghostscript) → finalize. Keeps the smaller of input/output; if GS
would grow the file, returns the input byte-identical (meta.kept="input")."""
from __future__ import annotations

import shutil

from app.engines import ghostscript
from .base import OpContext, OpResult, artifact
from .finalize import finalize_file


def run_compress(ctx: OpContext) -> OpResult:
    opts = ctx.options
    gs_out = ctx.out("gs.pdf")
    ghostscript.compress(
        ctx.primary_input, gs_out,
        preset=getattr(opts, "preset", "ebook"),
        color_dpi=getattr(opts, "color_dpi", 150),
        timeout=ctx.job_timeout,
    )
    fin = ctx.out("finalized.pdf")
    finalize_file(gs_out, fin)

    in_size = ctx.primary_input.stat().st_size
    out_size = fin.stat().st_size
    result_path = ctx.out("output.pdf")
    if out_size < in_size:
        shutil.move(fin, result_path)
        kept, final_size = "output", out_size
    else:
        # GS grew it — keep the original, byte-identical.
        shutil.copyfile(ctx.primary_input, result_path)
        kept, final_size = "input", in_size

    return OpResult(
        artifacts=[artifact(result_path, "application/pdf", f"{ctx.primary_stem}-compressed.pdf")],
        meta={"op": "compress", "kept": kept, "input_bytes": in_size, "output_bytes": final_size},
    )


def register_ops(register) -> None:  # noqa: ANN001
    register("compress", run_compress)
