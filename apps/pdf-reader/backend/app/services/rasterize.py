"""Rasterize pages → images (png/jpeg) or an image-only PDF (poppler render)."""
from __future__ import annotations

from app.engines import poppler
from .base import OpContext, OpResult, artifact, enforce_max_pages
from .finalize import finalize_file
from .pageranges import parse_pages


def run_rasterize(ctx: OpContext) -> OpResult:
    import pikepdf

    opts = ctx.options
    dpi = int(getattr(opts, "dpi", 150))
    fmt = getattr(opts, "format", "png")
    with pikepdf.open(str(ctx.primary_input)) as pdf:
        total = len(pdf.pages)
    enforce_max_pages(total, ctx.max_pages)
    pages_expr = getattr(opts, "pages", None)
    pages = parse_pages(pages_expr, total) if pages_expr else list(range(total))

    img_fmt = "png" if fmt == "pdf" else fmt  # PDF output is built from PNGs
    images = []
    for n in pages:  # n is 0-based
        stem = ctx.out(f"page-{n + 1}")
        images.append(poppler.render_page(ctx.primary_input, stem, n + 1, dpi=dpi, fmt=img_fmt, timeout=ctx.job_timeout))

    if fmt == "pdf":
        import img2pdf

        out = ctx.out("output.pdf")
        pre = ctx.out("raster.pdf")
        with open(pre, "wb") as fh:
            fh.write(img2pdf.convert([str(p) for p in images]))
        finalize_file(pre, out)
        return OpResult(artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}-raster.pdf")],
                        meta={"op": "rasterize", "pages": len(images), "dpi": dpi})

    media = "image/png" if img_fmt == "png" else "image/jpeg"
    ext = "png" if img_fmt == "png" else "jpg"
    arts = [artifact(p, media, f"{ctx.primary_stem}-p{pages[i] + 1}.{ext}") for i, p in enumerate(images)]
    return OpResult(
        artifacts=arts,
        meta={"op": "rasterize", "pages": len(arts), "dpi": dpi},
        zip_name=f"{ctx.primary_stem}-images.zip" if len(arts) > 1 else None,
    )


def register_ops(register) -> None:  # noqa: ANN001
    register("rasterize", run_rasterize)
