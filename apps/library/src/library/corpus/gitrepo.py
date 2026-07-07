"""library.corpus.gitrepo — thin git plumbing over the corpus repo.

Every corpus mutation is one git commit by the service, committer identity carrying
the acting `sub` (PLAN §1.1). Push to the configured remote on every admission-lane
and audit-lane commit; **push failure never blocks the local commit** (the local
commit is the canonical record) — it raises a loud degraded-durability signal
instead (surfaced by index-status, PLAN §1.1 finding F17).

git is invoked as a subprocess (no third-party dep). If git is unavailable the store
still works as a plain filesystem corpus (commits become no-ops) so the app boots and
tests run anywhere — but a MISSING GIT REMOTE in production is a durability defect the
index-status banner reports (ARCHITECTURE §10: the corpus git remote is mandatory).
"""
from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass


@dataclass
class PushState:
    remote_configured: bool
    last_push_ok: bool
    pending_commits: int
    last_error: str = ""


class GitRepo:
    def __init__(self, root: str, remote: str = ""):
        self.root = root
        self.remote = remote
        self.git = shutil.which("git")
        self.available = self.git is not None
        self._pending_push = 0
        self._last_push_ok = True
        self._last_error = ""

    # ── plumbing ──────────────────────────────────────────────────────────────
    def _run(self, *args: str, check: bool = True) -> subprocess.CompletedProcess:
        return subprocess.run(
            [self.git, "-C", self.root, *args],
            check=check,
            capture_output=True,
            text=True,
        )

    def init(self) -> None:
        os.makedirs(self.root, exist_ok=True)
        if not self.available:
            return
        if not os.path.isdir(os.path.join(self.root, ".git")):
            self._run("init", "-q")
            self._run("config", "user.email", "library@service.local")
            self._run("config", "user.name", "library-service")
        if self.remote:
            existing = self._run("remote", check=False)
            if "origin" not in existing.stdout.split():
                self._run("remote", "add", "origin", self.remote, check=False)

    def head(self) -> str:
        if not self.available:
            return ""
        r = self._run("rev-parse", "HEAD", check=False)
        return r.stdout.strip() if r.returncode == 0 else ""

    def is_ancestor(self, maybe_ancestor: str, descendant: str) -> bool:
        """True iff `maybe_ancestor` is an ancestor-or-equal of `descendant`.
        Used by the corpus↔index restore rule (PLAN §1.5 finding F9)."""
        if not self.available or not maybe_ancestor or not descendant:
            return maybe_ancestor == descendant
        if maybe_ancestor == descendant:
            return True
        r = self._run("merge-base", "--is-ancestor", maybe_ancestor, descendant, check=False)
        return r.returncode == 0

    def commit(self, message: str, sub: str, *, push: bool = False) -> str:
        """Stage everything and commit as the acting principal. Returns commit sha
        (or "" when git is unavailable). Pushes when asked; push failure is captured,
        never raised (F17)."""
        if not self.available:
            return ""
        self._run("add", "-A")
        status = self._run("status", "--porcelain", check=False)
        if not status.stdout.strip():
            return self.head()  # nothing to commit
        # committer identity carries the acting sub (audit trail, PLAN §1.1)
        self._run(
            "-c", f"user.name={sub or 'library-service'}",
            "-c", "user.email=library@service.local",
            "commit", "-q", "-m", message,
        )
        sha = self.head()
        if push:
            self._push()
        return sha

    def _push(self) -> None:
        if not self.remote or not self.available:
            return
        self._pending_push += 1
        r = self._run("push", "origin", "HEAD", check=False)
        if r.returncode == 0:
            self._pending_push = 0
            self._last_push_ok = True
            self._last_error = ""
        else:
            # push failed — local commit is canonical; raise a durability banner, not an error.
            self._last_push_ok = False
            self._last_error = (r.stderr or "push failed").strip()[:400]

    def push_state(self) -> PushState:
        return PushState(
            remote_configured=bool(self.remote),
            last_push_ok=self._last_push_ok,
            pending_commits=self._pending_push,
            last_error=self._last_error,
        )
