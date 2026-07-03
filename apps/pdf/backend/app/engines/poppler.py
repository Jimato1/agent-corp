"""poppler-utils wrapper — pdftocairo (render) + pdftotext (text extract)."""
from __future__ import annotations

from pathlib import Path

from . import subprocess_run


def render_page(input_path: Path, out_stem: Path, page: int, *, dpi: int, fmt: str, timeout: int) -> Path:
    """Render ONE page (1-based) to a single image file. Returns its path.

    ``-singlefile`` makes pdftocairo write exactly ``<out_stem>.<ext>`` with no
    page-number padding to guess.
    """
    flag = {"png": "-png", "jpeg": "-jpeg"}.get(fmt, "-png")
    ext = "png" if fmt == "png" else "jpg"
    argv = ["pdftocairo", flag, "-singlefile", "-r", str(dpi), "-f", str(page), "-l", str(page),
            str(input_path), str(out_stem)]
    subprocess_run.run(argv, timeout=timeout)
    return out_stem.with_suffix(f".{ext}")


def extract_text(input_path: Path, out_txt: Path, *, first: int | None, last: int | None, timeout: int) -> None:
    argv = ["pdftotext", "-layout"]
    if first is not None:
        argv += ["-f", str(first)]
    if last is not None:
        argv += ["-l", str(last)]
    argv += [str(input_path), str(out_txt)]
    subprocess_run.run(argv, timeout=timeout)
