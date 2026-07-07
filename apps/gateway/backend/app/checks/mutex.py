"""Check 4 — per-host mutex (the real-world resource lock). PLAN §3-4 / §5.

Layered lock:
* **Suite** — the Board execution hold from the consume (1c) IS the suite-level host lock
  (one claim = one host); the returned fencing token is lease-bound and unique.
* **Fencing** — the token must be ``> host_fence[host_id]`` (STALE_FENCE otherwise — the
  split-brain detector; a reaper-requeued stale holder can never touch a host out of order).
* **Local** — a non-blocking ``pg_try_advisory_lock(host:host_id)`` on a **dedicated,
  session-lifetime** connection (freed on session death — crash-safe). Failure while holding
  a Board execution hold is an INVARIANT VIOLATION (reject + escalate, never wait-and-retry —
  the Board holds ordering; the Gateway is not a queue).

The mutex is acquired **before any credential redemption** (contract §5) and held across the
run + health check + rollback; freed by session close.
"""
from __future__ import annotations

import secrets

from . import MUTEX_HELD, STALE_FENCE, HardReject


def check_fencing(fencing_token: int, current_fence: int) -> None:
    """STALE_FENCE unless the token strictly exceeds the highest generation executed for this host."""
    if fencing_token is None or int(fencing_token) <= int(current_fence):
        raise HardReject(STALE_FENCE,
                         f"fencing token {fencing_token} <= host high-water {current_fence} (split-brain)",
                         burned_approval=True)


class HostMutex:
    """Holds the dedicated advisory-lock connection for one run (§3-4c). Context-manager use."""

    def __init__(self, db, host_id: str, run_id: str) -> None:
        self.db = db
        self.host_id = host_id
        self.run_id = run_id
        self.session_token = secrets.token_hex(16)
        self._conn = None
        self.held = False

    def acquire(self) -> None:
        self._conn = self.db.dedicated()
        got = self.db.try_host_lock(self._conn, self.host_id, self.run_id, self.session_token)
        if not got:
            # Holding a Board execution hold but the local lock is busy => invariant violation.
            self.release()
            raise HardReject(MUTEX_HELD,
                             f"local advisory lock for {self.host_id} busy while holding a Board hold — invariant violation",
                             burned_approval=True)
        self.held = True

    def release(self) -> None:
        if self._conn is not None:
            try:
                if self.held:
                    self.db.release_host_lock(self._conn, self.host_id, self.session_token)
            finally:
                self._conn.close()
                self._conn = None
                self.held = False

    def __enter__(self) -> "HostMutex":
        self.acquire()
        return self

    def __exit__(self, *exc) -> None:
        self.release()
