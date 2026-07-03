"""Job worker CLI: ``python -m app.jobs.worker <spec.json>``.

Runs one operation in its own OS process (so the manager can hard-kill it on
cancel/timeout, and engine grandchildren are contained). Reads the job spec from
a JSON file, runs the op, and writes the outcome to ``<job_dir>/_result.json``.
Exit code 0 = wrote a result (ok or handled error); non-zero = crashed.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        return 2
    spec_path = Path(argv[1])
    spec = json.loads(spec_path.read_text())
    # Options (possibly carrying passwords) are passed via env, not the on-disk spec.
    spec["options_json"] = os.environ.get("PDFFORGE_JOB_OPTIONS") or None
    result_path = Path(spec["job_dir"]) / "_result.json"

    from app.jobs.runner import execute

    try:
        result = execute(spec)
        result_path.write_text(json.dumps({"ok": True, "result": result}))
    except Exception as exc:  # noqa: BLE001
        from app.core.errors import AppError

        code = getattr(exc, "code", None)
        message = getattr(exc, "message", None)
        if isinstance(exc, AppError):
            code, message = exc.code, exc.message
        if not code:
            code, message = "engine_error", "The operation could not be completed."
        result_path.write_text(json.dumps({"ok": False, "code": code, "message": message}))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
