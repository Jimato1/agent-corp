"""noop / echo op — validate → passthrough (no engine). Exercises the harness
end-to-end (M1). Not part of the public 14-op contract."""
from __future__ import annotations

import shutil

from .base import OpContext, OpResult, artifact


def run(ctx: OpContext) -> OpResult:
    out = ctx.out("output.pdf")
    shutil.copyfile(ctx.primary_input, out)
    return OpResult(
        artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}.pdf")],
        meta={"op": "noop"},
    )
