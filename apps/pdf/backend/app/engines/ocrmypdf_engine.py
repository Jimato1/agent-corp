"""ocrmypdf / Tesseract wrapper (container only; imported lazily). Bounded per
D3: jobs=1, tesseract-timeout, skip-big, OMP_THREAD_LIMIT=1 (set by the worker)."""
from __future__ import annotations

from pathlib import Path


def ocr(
    input_path: Path,
    out_path: Path,
    *,
    languages: list[str],
    deskew: bool,
    rotate_pages: bool,
    force_ocr: bool,
    redo_ocr: bool,
    sidecar_path: Path | None,
    output_type: str,
    tesseract_timeout: int,
    skip_big: float | None = 50.0,
) -> None:
    import ocrmypdf

    lang = "+".join(languages) if languages else "eng"
    kwargs: dict = {
        "language": lang,
        "jobs": 1,
        "tesseract_timeout": tesseract_timeout,
        "progress_bar": False,
        "deskew": deskew,
        "rotate_pages": rotate_pages,
        "output_type": output_type,
    }
    if skip_big is not None:
        kwargs["skip_big"] = skip_big
    # redo_ocr and force_ocr are mutually exclusive with each other and skip.
    if redo_ocr:
        kwargs["redo_ocr"] = True
        kwargs.pop("skip_big", None)
    elif force_ocr:
        kwargs["force_ocr"] = True
    else:
        kwargs["skip_text"] = True  # don't re-OCR pages that already have text
    if sidecar_path is not None:
        kwargs["sidecar"] = str(sidecar_path)

    ocrmypdf.ocr(str(input_path), str(out_path), **kwargs)
