"""OCR (ocrmypdf/Tesseract) → finalize. Optional sidecar .txt → the result is a
zip of {searchable PDF, extracted text}."""
from __future__ import annotations

from app.engines import ocrmypdf_engine
from .base import OpContext, OpResult, artifact
from .finalize import finalize_file


def run_ocr(ctx: OpContext) -> OpResult:
    opts = ctx.options
    ocr_out = ctx.out("ocr.pdf")
    want_sidecar = bool(getattr(opts, "sidecar", False))
    sidecar = ctx.out("text.txt") if want_sidecar else None

    # Only honor languages that are actually installed (config allow-list);
    # fall back to the installed set if the request names none of them.
    requested = list(getattr(opts, "languages", None) or [])
    installed = set(ctx.ocr_languages)
    languages = [c for c in requested if c in installed] or list(ctx.ocr_languages)

    ocrmypdf_engine.ocr(
        ctx.primary_input, ocr_out,
        languages=languages,
        deskew=bool(getattr(opts, "deskew", False)),
        rotate_pages=bool(getattr(opts, "rotate_pages", False)),
        force_ocr=bool(getattr(opts, "force_ocr", False)),
        redo_ocr=bool(getattr(opts, "redo_ocr", False)),
        sidecar_path=sidecar,
        output_type=getattr(opts, "output_type", "pdf"),
        tesseract_timeout=ctx.ocr_timeout,
    )

    out = ctx.out("output.pdf")
    finalize_file(ocr_out, out)
    arts = [artifact(out, "application/pdf", f"{ctx.primary_stem}-ocr.pdf")]
    if sidecar is not None and sidecar.exists():
        arts.append(artifact(sidecar, "text/plain", f"{ctx.primary_stem}.txt"))
    return OpResult(
        artifacts=arts,
        meta={"op": "ocr", "sidecar": sidecar is not None},
        zip_name=f"{ctx.primary_stem}-ocr.zip" if len(arts) > 1 else None,
    )


def register_ops(register) -> None:  # noqa: ANN001
    register("ocr", run_ocr)
