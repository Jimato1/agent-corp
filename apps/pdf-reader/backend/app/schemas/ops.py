"""Per-operation parameter models (API §5). Parsed from the multipart ``options``
JSON part; unknown fields are ignored (forward-compatible)."""
from __future__ import annotations

import json
import re
from typing import Literal

from pydantic import BaseModel, Field, ValidationError, field_validator

_LANG_RE = re.compile(r"[a-z]{3}(_[A-Za-z]+)?")


class _Params(BaseModel):
    model_config = {"extra": "ignore"}


class FinalizeParams(_Params):
    pass


class MergeParams(_Params):
    output_filename: str | None = None
    # Passwords for any encrypted inputs, positional by file order (decrypt-first, D7).
    passwords: list[str] | None = None


class SplitParams(_Params):
    mode: Literal["ranges", "every_n", "single"] = "ranges"
    ranges: list[str] = Field(default_factory=list)
    every_n: int = Field(default=1, ge=1)
    password: str | None = None


class CompressParams(_Params):
    preset: Literal["screen", "ebook", "printer", "prepress"] = "ebook"
    color_dpi: int = Field(default=150, ge=72, le=600)


class OcrParams(_Params):
    languages: list[str] = Field(default_factory=lambda: ["eng"], max_length=8)
    redo_ocr: bool = False

    @field_validator("languages")
    @classmethod
    def _check_langs(cls, v: list[str]) -> list[str]:
        # Constrain to Tesseract-style codes at the boundary; the service further
        # intersects with the installed packs before reaching the engine.
        for code in v:
            if not _LANG_RE.fullmatch(code):
                raise ValueError(f"invalid language code: {code!r}")
        return v
    force_ocr: bool = False
    deskew: bool = True
    rotate_pages: bool = False
    sidecar: bool = False
    output_type: Literal["auto", "pdf", "pdfa"] = "auto"


class EncryptParams(_Params):
    user_password: str = Field(min_length=1)
    owner_password: str | None = None


class DecryptParams(_Params):
    password: str = Field(min_length=1)


class PermissionsParams(_Params):
    # print: none | low (150 dpi) | high (full)
    print: Literal["none", "low", "high"] = "high"
    modify: bool = True
    extract: bool = True
    annotate: bool = True
    owner_password: str | None = None


class RasterizeParams(_Params):
    pages: str = "1-end"
    dpi: int = Field(default=150, ge=36, le=600)
    format: Literal["png", "jpeg", "pdf"] = "png"


class ImageToPdfParams(_Params):
    page_size: Literal["auto", "a4", "letter"] = "auto"
    lossless: bool = False


class ExtractTextParams(_Params):
    pages: str | None = None  # None → all


class SanitizeParams(_Params):
    strip_metadata: bool = True
    strip_attachments: bool = True


class LinearizeParams(_Params):
    pass


class RepairParams(_Params):
    pass


OP_PARAMS: dict[str, type[_Params]] = {
    "finalize": FinalizeParams,
    "merge": MergeParams,
    "split": SplitParams,
    "compress": CompressParams,
    "ocr": OcrParams,
    "encrypt": EncryptParams,
    "decrypt": DecryptParams,
    "permissions": PermissionsParams,
    "rasterize": RasterizeParams,
    "image-to-pdf": ImageToPdfParams,
    "extract-text": ExtractTextParams,
    "sanitize": SanitizeParams,
    "linearize": LinearizeParams,
    "repair": RepairParams,
}

# Ops whose input is one (or more) image files rather than a PDF.
IMAGE_INPUT_OPS = {"image-to-pdf"}


class OptionsError(ValueError):
    def __init__(self, message: str):
        super().__init__(message)
        self.message = message


def parse_options(op: str, raw: str | None) -> _Params:
    """Parse the ``options`` JSON part for an op into its typed model."""
    model = OP_PARAMS.get(op)
    if model is None:
        raise OptionsError(f"unknown operation: {op}")
    data: dict = {}
    if raw:
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise OptionsError("options is not valid JSON") from exc
        if not isinstance(parsed, dict):
            raise OptionsError("options must be a JSON object")
        data = parsed
    try:
        return model(**data)
    except ValidationError as exc:
        first = exc.errors()[0] if exc.errors() else {}
        loc = ".".join(str(p) for p in first.get("loc", ()))
        msg = first.get("msg", "invalid options")
        raise OptionsError(f"{loc}: {msg}" if loc else msg) from exc
