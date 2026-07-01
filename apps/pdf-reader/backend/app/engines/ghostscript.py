"""Ghostscript wrapper — compression and image→PDF. Explicit flag CONSTANTS
(OQ#14), never preset defaults, so downsampling is reproducible across GS builds.
"""
from __future__ import annotations

from pathlib import Path

from . import subprocess_run

GS_BIN = "gs"

# Base flags shared by all pdfwrite invocations.
_BASE = [
    "-dNOPAUSE", "-dBATCH", "-dQUIET", "-dSAFER",
    "-sDEVICE=pdfwrite",
    "-dCompatibilityLevel=1.7",
    "-dAutoRotatePages=/None",
    "-dColorConversionStrategy=/LeaveColorUnchanged",
]


def compress(input_path: Path, out_path: Path, *, preset: str, color_dpi: int, timeout: int) -> None:
    mono_dpi = max(300, color_dpi * 2)
    argv = [
        GS_BIN, *_BASE,
        f"-dPDFSETTINGS=/{preset}",
        "-dDownsampleColorImages=true", f"-dColorImageResolution={color_dpi}", "-dColorImageDownsampleType=/Average",
        "-dDownsampleGrayImages=true", f"-dGrayImageResolution={color_dpi}", "-dGrayImageDownsampleType=/Average",
        "-dDownsampleMonoImages=true", f"-dMonoImageResolution={mono_dpi}", "-dMonoImageDownsampleType=/Subsample",
        f"-sOutputFile={out_path}",
        str(input_path),
    ]
    subprocess_run.run(argv, timeout=timeout)
