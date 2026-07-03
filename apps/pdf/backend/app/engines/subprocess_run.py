"""Shared bounded engine runner (D3).

- argv lists only, ``shell=False`` — NEVER string interpolation (SCOPE §security).
- server-generated paths only (callers pass Paths, never client filenames).
- wall-clock timeout; on POSIX the child starts a new session so the whole
  process group (gs/tesseract grandchildren) can be SIGKILLed; on Windows a new
  process group is terminated.
- stderr is captured for server logs only and NEVER surfaced to the client.
"""
from __future__ import annotations

import logging
import os
import signal
import subprocess
from pathlib import Path

from app.core.errors import AppError

log = logging.getLogger("pdfforge")
_IS_POSIX = os.name == "posix"


class EngineError(AppError):
    def __init__(self, message: str = "The engine failed to process this file."):
        super().__init__("engine_error", message, 500)


class EngineTimeout(AppError):
    def __init__(self) -> None:
        super().__init__("timeout", "The job hit the time limit and was stopped.", 500)


def run(argv: list[str], *, timeout: int, cwd: Path | None = None, env_extra: dict[str, str] | None = None,
        ok_codes: tuple[int, ...] = (0,)) -> subprocess.CompletedProcess:
    """Run an engine binary under a bounded, killable subprocess."""
    env = {**os.environ, **(env_extra or {})}
    popen_kwargs: dict = {
        "cwd": str(cwd) if cwd else None,
        "env": env,
        "stdout": subprocess.PIPE,
        "stderr": subprocess.PIPE,
    }
    if _IS_POSIX:
        popen_kwargs["start_new_session"] = True
    else:  # Windows: own process group so we can signal the whole tree
        popen_kwargs["creationflags"] = getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)

    try:
        proc = subprocess.Popen(argv, **popen_kwargs)  # noqa: S603 — argv list, shell=False
    except FileNotFoundError as exc:
        # Engine binary not installed (e.g. local dev without gs/tesseract/poppler).
        raise AppError("engine_unavailable", f"{argv[0]} is not available on this server.", 500) from exc

    try:
        out, err = proc.communicate(timeout=timeout)
    except subprocess.TimeoutExpired:
        _kill(proc)
        proc.communicate()
        raise EngineTimeout()

    if proc.returncode not in ok_codes:
        log.info("engine %s exited %s: %s", argv[0], proc.returncode, (err or b"")[:400].decode("utf-8", "replace"))
        raise EngineError()
    return subprocess.CompletedProcess(argv, proc.returncode, out, err)


def _kill(proc: subprocess.Popen) -> None:
    try:
        if _IS_POSIX:
            os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
        else:
            proc.kill()
    except (ProcessLookupError, OSError):
        pass
