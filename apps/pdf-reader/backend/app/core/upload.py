"""Streaming upload intake (SCOPE §5c, §5d).

- A streaming byte-counter enforces the size cap → 413 (never trusts
  Content-Length).
- On-disk names are server-generated (``input.pdf`` / ``input-N.ext``); the client
  filename is kept only as a display string, never a path component.
- A disk precheck (free < factor × max upload) → 507 before accepting bytes.
"""
from __future__ import annotations

import shutil
from pathlib import Path

from fastapi import UploadFile

from .errors import disk_full, file_too_large

_CHUNK = 1024 * 1024  # 1 MiB


def disk_precheck(target_dir: Path, max_upload_bytes: int, reserve_factor: int, file_count: int = 1) -> None:
    """Require free space for the actual inbound bytes (count × per-file cap) PLUS
    output headroom (reserve_factor × per-file). Scales with the number of parts so
    a many-file request can't slip past a single-file reservation."""
    try:
        usage = shutil.disk_usage(target_dir)
    except OSError:
        return  # can't stat — don't block; container has bounded volume anyway
    needed = (reserve_factor + max(1, file_count)) * max_upload_bytes
    if usage.free < needed:
        raise disk_full()


async def stream_to_file(upload: UploadFile, dest: Path, max_bytes: int) -> int:
    """Write an UploadFile to ``dest`` while enforcing ``max_bytes`` → 413.

    Returns the number of bytes written. Deletes the partial file on overflow.
    """
    written = 0
    with dest.open("wb") as fh:
        while True:
            chunk = await upload.read(_CHUNK)
            if not chunk:
                break
            written += len(chunk)
            if written > max_bytes:
                fh.close()
                dest.unlink(missing_ok=True)
                raise file_too_large(max_bytes // (1024 * 1024))
            fh.write(chunk)
    return written


def server_input_name(index: int, ext: str) -> str:
    """Deterministic server-generated on-disk name (never the client filename)."""
    ext = ext if ext.startswith(".") else f".{ext}"
    return "input" + ext if index == 0 else f"input-{index}{ext}"
