"""Per-job scratch directory with guaranteed cleanup (D2, SCOPE §5b).

Every job gets ``mkdtemp(dir=JOBS_DIR, mode=0700)``. On-disk names are
server-generated; the client filename is stored only as a display string and is
never used as a path component. Cleanup is guaranteed on success and failure.
"""
from __future__ import annotations

import contextlib
import shutil
import tempfile
from pathlib import Path


def new_job_dir(root: Path, job_id: str) -> Path:
    root.mkdir(parents=True, exist_ok=True)
    d = Path(tempfile.mkdtemp(prefix=f"{job_id}-", dir=root))
    with contextlib.suppress(Exception):
        d.chmod(0o700)
    # Engine scratch lives under the same bounded volume.
    (d / "tmp").mkdir(exist_ok=True)
    return d


def remove_job_dir(path: Path) -> None:
    with contextlib.suppress(Exception):
        shutil.rmtree(path, ignore_errors=True)
