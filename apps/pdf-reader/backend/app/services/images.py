"""Image → PDF (img2pdf lossless; Pillow flattens alpha/CMYK when img2pdf rejects
the input), then finalize."""
from __future__ import annotations

from pathlib import Path

from .base import OpContext, OpResult, artifact
from .finalize import finalize_file

_A4 = ("210mm", "297mm")
_LETTER = ("8.5in", "11in")


def _layout(page_size: str):  # noqa: ANN001
    import img2pdf

    if page_size == "a4":
        return img2pdf.get_layout_fun((img2pdf.mm_to_pt(210), img2pdf.mm_to_pt(297)))
    if page_size == "letter":
        return img2pdf.get_layout_fun((img2pdf.in_to_pt(8.5), img2pdf.in_to_pt(11)))
    return None  # auto → each image at its own natural size


def _flatten(paths: list[Path], tmp_dir: Path) -> list[Path]:
    """Re-encode images img2pdf can't embed (alpha / CMYK / palette) to RGB PNG."""
    from PIL import Image

    out = []
    for i, p in enumerate(paths):
        with Image.open(p) as im:
            if im.mode in ("RGB", "L", "1"):
                out.append(p)
                continue
            conv = im.convert("RGB")
            dest = tmp_dir / f"flat-{i}.png"
            conv.save(dest, "PNG")
            out.append(dest)
    return out


def run_image_to_pdf(ctx: OpContext) -> OpResult:
    import img2pdf

    layout = _layout(getattr(ctx.options, "page_size", "auto"))
    pre = ctx.out("images.pdf")
    paths = list(ctx.inputs)
    try:
        data = img2pdf.convert([str(p) for p in paths], layout_fun=layout)
    except Exception:  # noqa: BLE001 — alpha/CMYK etc.: flatten and retry
        paths = _flatten(paths, ctx.tmp_dir)
        data = img2pdf.convert([str(p) for p in paths], layout_fun=layout)
    pre.write_bytes(data)

    out = ctx.out("output.pdf")
    finalize_file(pre, out)
    return OpResult(artifacts=[artifact(out, "application/pdf", f"{ctx.primary_stem}.pdf")],
                    meta={"op": "image-to-pdf", "images": len(ctx.inputs)})


def register_ops(register) -> None:  # noqa: ANN001
    register("image-to-pdf", run_image_to_pdf)
