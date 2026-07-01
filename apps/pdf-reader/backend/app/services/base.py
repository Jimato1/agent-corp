"""The service contract shared by every operation.

A service takes an :class:`OpContext` (job scratch dir + validated inputs +
typed options) and returns an :class:`OpResult` (one or more artifact files it
wrote into the job dir). The runner turns artifacts into the HTTP result
descriptor, zipping when there is more than one.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class OpContext:
    op: str
    job_dir: Path
    tmp_dir: Path
    inputs: list[Path]
    input_names: list[str]  # client display names (never used as paths)
    options: Any            # the typed params model for this op
    # settings-derived values (picklable, passed into the worker)
    job_timeout: int = 300
    ocr_timeout: int = 120
    ocr_languages: tuple[str, ...] = ("eng", "deu")
    max_pages: int = 5000

    @property
    def primary_input(self) -> Path:
        return self.inputs[0]

    @property
    def primary_stem(self) -> str:
        return safe_stem(self.input_names[0] if self.input_names else "document")

    def out(self, name: str) -> Path:
        return self.job_dir / name


@dataclass
class Artifact:
    path: Path
    media_type: str
    filename: str


@dataclass
class OpResult:
    artifacts: list[Artifact]
    meta: dict[str, Any] = field(default_factory=dict)
    # For multi-artifact ops, the display name of the bundle zip.
    zip_name: str | None = None


_SAFE = re.compile(r"[^A-Za-z0-9._-]+")


def safe_stem(filename: str) -> str:
    """Strip any path components and unsafe chars → a bare filename stem."""
    base = filename.replace("\\", "/").split("/")[-1]
    base = base.rsplit(".", 1)[0] if "." in base else base
    cleaned = _SAFE.sub("_", base).strip("._") or "document"
    return cleaned[:120]


def artifact(path: Path, media_type: str, filename: str) -> Artifact:
    return Artifact(path=path, media_type=media_type, filename=filename)


def enforce_max_pages(count: int, max_pages: int) -> None:
    """Worker-side page-count guard. The upload validator skips this for encrypted
    inputs, so every op re-checks it after open/decrypt (canonical single check)."""
    from app.core.errors import AppError

    if count > max_pages:
        raise AppError("too_many_pages", f"That document has more than {max_pages} pages.", 400)
