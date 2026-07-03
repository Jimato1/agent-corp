"""Extract text (poppler pdftotext) → a single .txt artifact (no finalize; the
output isn't a PDF)."""
from __future__ import annotations

from app.engines import poppler
from .base import OpContext, OpResult, artifact
from .pageranges import parse_pages


def run_extract_text(ctx: OpContext) -> OpResult:
    import pikepdf

    opts = ctx.options
    pages_expr = getattr(opts, "pages", None)
    first = last = None
    if pages_expr:
        with pikepdf.open(str(ctx.primary_input)) as pdf:
            total = len(pdf.pages)
        idx = parse_pages(pages_expr, total)
        first, last = min(idx) + 1, max(idx) + 1  # pdftotext takes a contiguous -f/-l window

    out = ctx.out("text.txt")
    poppler.extract_text(ctx.primary_input, out, first=first, last=last, timeout=ctx.job_timeout)
    return OpResult(artifacts=[artifact(out, "text/plain", f"{ctx.primary_stem}.txt")],
                    meta={"op": "extract-text"})


def register_ops(register) -> None:  # noqa: ANN001
    register("extract-text", run_extract_text)
