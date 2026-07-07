"""A thin subprocess wrapper over the system ``git`` binary (no GitPython dependency).

The policy repo is CANONICAL (ARCH §10); its history IS the tamper-evidence anchor, so
git operations are first-class. Commits carry the operator ``sub`` + auth session id as
trailers (§6.3); pushes are a precondition for gate-weakening edits (§6.3, AR cluster E).
"""
from __future__ import annotations

import subprocess
from pathlib import Path

_AUTHOR = ("-c", "user.name=cmdb", "-c", "user.email=cmdb@suite.local")


class GitError(Exception):
    pass


class GitRepo:
    def __init__(self, path: Path) -> None:
        self.path = Path(path)

    def _run(self, *args: str, check: bool = True, timeout: float = 15.0) -> tuple[int, str, str]:
        proc = subprocess.run(  # noqa: S603 — fixed argv, no shell
            ["git", *args],
            cwd=str(self.path),
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        if check and proc.returncode != 0:
            raise GitError(f"git {' '.join(args)} failed: {proc.stderr.strip()}")
        return proc.returncode, proc.stdout, proc.stderr

    # -- lifecycle -----------------------------------------------------------------
    def exists(self) -> bool:
        return (self.path / ".git").is_dir()

    def init(self) -> None:
        self.path.mkdir(parents=True, exist_ok=True)
        self._run("init", "-q")
        self._run("symbolic-ref", "HEAD", "refs/heads/main", check=False)

    def set_remote(self, name: str, url: str) -> None:
        self._run("remote", "remove", name, check=False)
        self._run("remote", "add", name, url)

    def has_remote(self, name: str) -> bool:
        rc, out, _ = self._run("remote", check=False)
        return name in out.split()

    # -- reads ---------------------------------------------------------------------
    def head(self) -> str | None:
        rc, out, _ = self._run("rev-parse", "HEAD", check=False)
        return out.strip() if rc == 0 and out.strip() else None

    def log_trailers(self, limit: int = 50) -> str:
        rc, out, _ = self._run("log", f"-{limit}", "--format=%H%x09%an%x09%s", check=False)
        return out

    # -- writes --------------------------------------------------------------------
    def commit_all(self, message: str, *, trailers: dict[str, str] | None = None) -> str:
        self._run("add", "-A")
        msg = message
        if trailers:
            msg += "\n\n" + "\n".join(f"{k}: {v}" for k, v in trailers.items())
        # Allow an empty commit only for genesis; otherwise a no-op edit is a caller bug.
        self._run(*_AUTHOR, "commit", "-q", "-m", msg)
        h = self.head()
        if not h:
            raise GitError("commit produced no HEAD")
        return h

    def commit_genesis(self, message: str) -> str:
        self._run("add", "-A")
        self._run(*_AUTHOR, "commit", "-q", "--allow-empty", "-m", message)
        h = self.head()
        if not h:
            raise GitError("genesis commit produced no HEAD")
        return h

    def rollback_last(self) -> None:
        """Undo the most recent commit (used when a weakening push fails, §6.3)."""
        self._run("reset", "--hard", "HEAD~1")

    def push(self, remote: str, *, timeout: float = 20.0) -> None:
        self._run("push", remote, "HEAD:main", timeout=timeout)

    def remote_has_head(self, remote: str, *, timeout: float = 10.0) -> bool:
        """True iff the local HEAD sha is a ref tip on the remote.

        A restored-older local HEAD is an ancestor, not a tip, so it will NOT appear here
        (the §1 boot-integrity marker that lives outside the restored set). Any transport
        failure returns False — fail-closed."""
        h = self.head()
        if not h:
            return False
        try:
            rc, out, _ = self._run("ls-remote", remote, check=False, timeout=timeout)
        except (GitError, subprocess.TimeoutExpired):
            return False
        if rc != 0:
            return False
        tips = {line.split("\t", 1)[0].strip() for line in out.splitlines() if line.strip()}
        return h in tips
