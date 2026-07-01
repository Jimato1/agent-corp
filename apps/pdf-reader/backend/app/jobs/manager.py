"""In-memory job registry + bounded scheduler (D1/D3).

- Concurrency is capped by an asyncio semaphore of ``worker_count``; a job waits
  in ``queued`` until a slot frees, then flips to ``running``.
- Submit-over-capacity (queued + running ≥ worker_count + queue_maxsize) is
  rejected with 429 BEFORE a job record is created (never enters ``queued``).
- Each job runs in its own OS subprocess (``python -m app.jobs.worker``) so it
  can be hard-killed on cancel/timeout; on POSIX it starts a new session so the
  whole process group (incl. gs/tesseract grandchildren) can be killed.
- A janitor sweeps job dirs older than the TTL → ``expired``.
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import os
import signal
import sys
from datetime import timedelta
from pathlib import Path
from typing import Any

from app.config import get_settings
from app.core.errors import queue_full
from app.core.tempdir import new_job_dir, remove_job_dir
from app.jobs.models import InternalArtifact, Job, _now
from app.schemas.jobs import JobState

log = logging.getLogger("pdfforge")

# backend/ root (parent of the `app` package) — cwd + PYTHONPATH for the worker.
_PACKAGE_ROOT = Path(__file__).resolve().parents[2]
_IS_POSIX = os.name == "posix"


class JobManager:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.jobs: dict[str, Job] = {}
        self._sem = asyncio.Semaphore(self.settings.worker_count)
        self._tasks: dict[str, asyncio.Task] = {}
        self._procs: dict[str, asyncio.subprocess.Process] = {}
        self._janitor: asyncio.Task | None = None
        self._started = False

    # ---- lifecycle ----
    def start(self) -> None:
        if self._started:
            return
        self._started = True
        # Reconcile the volume on boot: a fresh process tracks no jobs, so any dir
        # already on disk is an orphan from a prior crash/restart — reclaim it.
        with contextlib.suppress(Exception):
            self._reconcile_orphans(startup=True)
        with contextlib.suppress(RuntimeError):
            self._janitor = asyncio.get_running_loop().create_task(self._janitor_loop())

    def shutdown(self) -> None:
        if self._janitor:
            self._janitor.cancel()
        for proc in list(self._procs.values()):
            self._kill(proc)
        self._procs.clear()
        self._started = False

    # ---- capacity ----
    def _active_count(self) -> int:
        return sum(1 for j in self.jobs.values() if j.state in {JobState.queued, JobState.running})

    def _capacity(self) -> int:
        return self.settings.worker_count + self.settings.queue_maxsize

    def new_scratch(self, job_id: str) -> Path:
        return new_job_dir(self.settings.jobs_dir, job_id)

    # ---- submit ----
    def submit(self, *, job_id: str, op: str, input_paths: list[Path], input_names: list[str], input_bytes: int,
               options_json: str | None, submitted_by: str | None, engine: str | None = None) -> Job:
        if self._active_count() >= self._capacity():
            raise queue_full(self.settings.retry_after_seconds)

        job_dir = input_paths[0].parent
        job = Job(
            id=job_id, op=op, job_dir=job_dir,
            input_filename=input_names[0] if input_names else "input.pdf",
            input_bytes=input_bytes, state=JobState.queued, engine=engine, submitted_by=submitted_by,
        )
        self.jobs[job_id] = job

        spec: dict[str, Any] = {
            "op": op,
            "job_dir": str(job_dir),
            "inputs": [str(p) for p in input_paths],
            "input_names": input_names,
            "options_json": options_json,
            "ctx": {
                "job_timeout": self.settings.job_timeout_seconds,
                "ocr_timeout": self.settings.ocr_timeout_seconds,
                "ocr_languages": list(self.settings.ocr_languages),
                "max_pages": self.settings.max_page_count,
                "rlimit_cpu": self.settings.rlimit_cpu_seconds,
                "rlimit_fsize_mb": self.settings.rlimit_fsize_mb,
                "max_output_bytes": self.settings.max_output_bytes,
                "max_output_artifacts": self.settings.max_output_artifacts,
            },
        }
        self._tasks[job_id] = asyncio.get_running_loop().create_task(self._run(job, spec))
        return job

    # ---- run one job ----
    async def _run(self, job: Job, spec: dict[str, Any]) -> None:
        try:
            async with self._sem:
                if job.state == JobState.canceled:
                    return
                job.state = JobState.running
                job.stage = "running"
                job.touch()
                outcome = await self._exec_subprocess(job, spec)
                self._apply_outcome(job, outcome)
        except asyncio.CancelledError:
            self._mark_canceled(job)
            raise
        except Exception:  # noqa: BLE001
            log.exception("job %s crashed in scheduler", job.id)
            self._fail(job, "engine_error", "The operation could not be completed.")
        finally:
            self._tasks.pop(job.id, None)
            self._procs.pop(job.id, None)

    async def _exec_subprocess(self, job: Job, spec: dict[str, Any]) -> tuple:
        spec_path = job.job_dir / "_spec.json"
        result_path = job.job_dir / "_result.json"
        # Keep the options JSON (which may carry document passwords) OUT of the
        # on-disk spec — pass it to the child via env only, never to durable disk.
        disk_spec = dict(spec)
        secret_options = disk_spec.pop("options_json", None)
        spec_path.write_text(json.dumps(disk_spec))
        with contextlib.suppress(OSError):
            os.chmod(spec_path, 0o600)

        env = {**os.environ, "PYTHONPATH": str(_PACKAGE_ROOT), "TMPDIR": str(job.job_dir / "tmp"),
               "OMP_THREAD_LIMIT": "1", "PDFFORGE_JOB_OPTIONS": secret_options or ""}
        kwargs: dict[str, Any] = {"cwd": str(_PACKAGE_ROOT), "env": env,
                                  "stdout": asyncio.subprocess.DEVNULL, "stderr": asyncio.subprocess.DEVNULL}
        if _IS_POSIX:
            kwargs["start_new_session"] = True  # own process group → killpg reaches gs/tesseract

        proc = await asyncio.create_subprocess_exec(
            sys.executable, "-m", "app.jobs.worker", str(spec_path), **kwargs
        )
        self._procs[job.id] = proc
        try:
            await asyncio.wait_for(proc.wait(), timeout=self.settings.job_timeout_seconds + 5)
        except (asyncio.TimeoutError, TimeoutError):
            self._kill(proc)
            return ("timeout",)

        if job.state == JobState.canceled:
            return ("killed",)
        if not result_path.exists():
            return ("killed",)
        try:
            payload = json.loads(result_path.read_text())
        except Exception:  # noqa: BLE001
            return ("err", "engine_error", "The operation produced no readable result.")
        if payload.get("ok"):
            return ("ok", payload["result"])
        return ("err", payload.get("code", "engine_error"), payload.get("message", "The operation failed."))

    @staticmethod
    def _kill(proc: asyncio.subprocess.Process) -> None:
        with contextlib.suppress(ProcessLookupError, Exception):
            if _IS_POSIX:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
            else:
                proc.kill()

    # ---- outcome handling ----
    def _apply_outcome(self, job: Job, outcome: tuple) -> None:
        kind = outcome[0]
        if kind == "ok":
            self._succeed(job, outcome[1])
        elif kind == "err":
            self._fail(job, outcome[1], outcome[2])
        elif kind == "timeout":
            self._fail(job, "timeout", "The job hit the time limit and was stopped.")
        else:  # killed
            if job.state == JobState.canceled:
                self._mark_canceled(job)
            else:
                self._fail(job, "engine_error", "The worker stopped unexpectedly.")

    def _succeed(self, job: Job, result: dict) -> None:
        job.artifacts = [
            InternalArtifact(index=a["index"], path=Path(a["path"]), media_type=a["media_type"],
                             filename=a["filename"], bytes=a["bytes"])
            for a in result["artifacts"]
        ]
        b = result.get("bundle")
        job.bundle = (
            InternalArtifact(index=-1, path=Path(b["path"]), media_type=b["media_type"], filename=b["filename"], bytes=b["bytes"])
            if b else None
        )
        job.meta = result.get("meta") or {}
        job.state = JobState.succeeded
        job.stage = "done"
        job.expires_at = _now() + timedelta(seconds=self.settings.job_ttl_seconds)
        job.touch()
        log.info("job %s op=%s succeeded artifacts=%d", job.id, job.op, len(job.artifacts))

    def _fail(self, job: Job, code: str, message: str) -> None:
        job.state = JobState.failed
        job.error_code = code
        job.error_message = message
        job.expires_at = _now() + timedelta(seconds=self.settings.job_ttl_seconds)
        job.touch()
        remove_job_dir(job.job_dir)
        log.info("job %s op=%s failed code=%s", job.id, job.op, code)

    def _mark_canceled(self, job: Job) -> None:
        job.state = JobState.canceled
        job.touch()
        remove_job_dir(job.job_dir)
        log.info("job %s op=%s canceled", job.id, job.op)

    # ---- external ops ----
    def get(self, job_id: str) -> Job | None:
        return self.jobs.get(job_id)

    async def cancel(self, job_id: str) -> Job | None:
        job = self.jobs.get(job_id)
        if job is None:
            return None
        if job.is_terminal:
            remove_job_dir(job.job_dir)
            if job.state == JobState.succeeded:
                job.state = JobState.canceled
                job.artifacts = []
                job.bundle = None
            return job
        job.state = JobState.canceled
        proc = self._procs.get(job_id)
        if proc is not None:
            self._kill(proc)
        task = self._tasks.get(job_id)
        if task is not None:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await task
        remove_job_dir(job.job_dir)
        return job

    # ---- janitor ----
    async def _janitor_loop(self) -> None:
        interval = max(30, self.settings.janitor_interval_seconds)
        while True:
            try:
                await asyncio.sleep(interval)
                self._sweep()
            except asyncio.CancelledError:
                break
            except Exception:  # noqa: BLE001
                log.exception("janitor sweep failed")

    def _sweep(self) -> None:
        now = _now()
        for job in list(self.jobs.values()):
            if job.expires_at and now >= job.expires_at and job.state not in {JobState.queued, JobState.running}:
                remove_job_dir(job.job_dir)
                if job.state == JobState.succeeded:
                    job.state = JobState.expired
                    job.artifacts = []
                    job.bundle = None
                elif job.state in {JobState.failed, JobState.canceled}:
                    # Bound registry growth: drop long-terminal records entirely.
                    self.jobs.pop(job.id, None)
        self._reconcile_orphans()

    def _reconcile_orphans(self, *, startup: bool = False) -> None:
        """Remove job dirs on the volume that no live job tracks (crash/restart
        orphans, or unregistered leaks). Never touches the shared TMPDIR."""
        root = self.settings.jobs_dir
        tracked = {str(j.job_dir) for j in self.jobs.values()}
        now_ts = _now().timestamp()
        with contextlib.suppress(OSError):
            for p in root.iterdir():
                if not p.is_dir() or p.name == "tmp" or str(p) in tracked:
                    continue
                if startup:
                    remove_job_dir(p)
                    continue
                with contextlib.suppress(OSError):
                    if now_ts - p.stat().st_mtime > self.settings.job_ttl_seconds:
                        remove_job_dir(p)

    def sweep_now(self) -> None:
        self._sweep()


_manager: JobManager | None = None


def get_manager() -> JobManager:
    global _manager
    if _manager is None:
        _manager = JobManager()
    return _manager
