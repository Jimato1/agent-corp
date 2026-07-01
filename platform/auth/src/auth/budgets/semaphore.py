"""auth.budgets.semaphore — dimension 2: leased concurrency semaphore (PLAN §6.1/§6.4).

The concurrency/WIP semaphore is the PRECISE, SHARED anti-runaway lever and the
PRIMARY safety mechanism (PLAN §6 invariant 4). Contract (PLAN §6.4):

  acquire  → INCR the shared counter; if the new in-flight count exceeds the cap,
             DECR back and REJECT (BudgetExceeded) — *reject, do NOT queue-forever*.
  hold     → a TTL lease key records the acquisition (crash-recovery backstop only).
  release  → DECR + drop the lease, in a `finally` (success / error / timeout / cancel).
  backstop → a reaper reconciles OUTSTANDING lease keys whose TTL expired after a
             crash; this is NEVER the normal release path.

Release-in-finally is the normal path; the TTL-lease reaper only reclaims slots a
CRASHED holder could never DECR. Use the `slot()` context manager so release is
structurally guaranteed.

> DOUBLE-EXECUTION NOTE (PLAN §6.4, finding 3a): the concurrency semaphore is
> explicitly NOT the double-execution guard for irreversible actions. A slow PDP
> can make a call hang → its lease expires → the reaper frees the cap-1 slot → a
> timeout-retry re-acquires and executes a SECOND time. Only admission-claim +
> host-mutex + FENCING TOKENS (held for the full duration) make reacquire-after-
> expiry safe (§5.3). This module provides the shared cap and the crash backstop;
> it does not, and must not, stand in for the fencing token.

------------------------------------------------------------------------------
CANNOT-VERIFY-HERE — production atomicity + cross-process reaper (PLAN §6.4):
------------------------------------------------------------------------------
Prod: INCR + lease-key write (and DECR + lease delete) for one acquire are ONE
atomic Redis Lua op, and the reaper is a SEPARATE process that SCANs
`budget:lease:{sub}:*` (or a sorted-set keyed by expiry) to reclaim a crashed
holder's slot. Here the lease registry is in-process (the HotStore exposes no key
scan) — the correct single-process substitute, but it cannot prove the
cross-process crash-recovery fan-out. Operator closes it with:
    docker run -p 6379:6379 redis:7 --appendonly yes
    cd platform/auth && python -m pytest tests/integration/test_semaphore_reaper.py
"""
from __future__ import annotations

import itertools
import threading
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Callable, Dict, Iterator, Optional

from auth.core.interfaces import HotStore


def _default_clock_ms() -> float:
    import time
    return time.time() * 1000.0


class BudgetExceeded(Exception):
    """Concurrency cap reached — reject (do NOT queue). Maps to 429 (PLAN §6.5).

    reason is a machine code ("concurrency"); limit/current let the caller build a
    useful over-budget response without string-sniffing.
    """

    def __init__(self, reason: str, sub: str, limit: int, current: int) -> None:
        self.reason = reason
        self.sub = sub
        self.limit = limit
        self.current = current
        super().__init__(
            f"budget_exceeded[{reason}]: {sub!r} in-flight {current} > cap {limit}"
        )


@dataclass
class Lease:
    """A held concurrency slot. `released` guards against double-release."""
    sub: str
    cls: Optional[str]
    acq_id: str
    expiry_ms: int
    released: bool = False


class ConcurrencySemaphore:
    """Leased INCR/DECR concurrency semaphore over the HotStore, injected clock."""

    _ids = itertools.count(1)

    def __init__(
        self,
        hot: HotStore,
        clock: Callable[[], float] = _default_clock_ms,
        default_lease_ttl_ms: int = 300_000,
    ) -> None:
        self._hot = hot
        self._now_ms = clock
        self._default_lease_ttl_ms = default_lease_ttl_ms
        self._lock = threading.RLock()
        # In-process lease registry (substitute for a Redis SCAN of lease keys).
        self._leases: Dict[str, Lease] = {}

    # -- acquire / release -------------------------------------------------
    def acquire(
        self,
        sub: str,
        limit: int,
        cls: Optional[str] = None,
        lease_ttl_ms: Optional[int] = None,
    ) -> Lease:
        """INCR the shared counter; reject (DECR-back) if over cap. Returns a Lease.

        Raises BudgetExceeded if the acquisition would exceed `limit` — the call is
        rejected immediately, never queued (PLAN §6.4 "reject, do not queue-forever").
        """
        with self._lock:
            count = self._hot.incr_concurrency(sub, cls)
            if count > limit:
                # Over cap → give the slot back atomically and reject.
                self._hot.decr_concurrency(sub, cls)
                raise BudgetExceeded("concurrency", sub, limit, count)
            ttl = lease_ttl_ms if lease_ttl_ms is not None else self._default_lease_ttl_ms
            acq_id = f"{sub}:{cls or '*'}:{next(self._ids)}"
            lease = Lease(
                sub=sub,
                cls=cls,
                acq_id=acq_id,
                expiry_ms=int(self._now_ms()) + int(ttl),
            )
            self._leases[acq_id] = lease
            return lease

    def release(self, lease: Lease) -> None:
        """DECR + drop the lease. Idempotent (a reaped lease will not double-DECR)."""
        with self._lock:
            if lease.released:
                return
            lease.released = True
            self._hot.decr_concurrency(lease.sub, lease.cls)
            self._leases.pop(lease.acq_id, None)

    @contextmanager
    def slot(
        self,
        sub: str,
        limit: int,
        cls: Optional[str] = None,
        lease_ttl_ms: Optional[int] = None,
    ) -> Iterator[Lease]:
        """Acquire on enter, ALWAYS release in `finally` (the normal path, PLAN §6.4)."""
        lease = self.acquire(sub, limit, cls, lease_ttl_ms)
        try:
            yield lease
        finally:
            self.release(lease)

    # -- crash-recovery backstop (NEVER the normal path) -------------------
    def reap_expired(self) -> int:
        """Reclaim slots whose TTL lease expired (a crashed holder never DECR'd).

        Returns the number of slots reclaimed. This is the crash backstop only; a
        live holder releases in `finally`. In prod this is a separate process
        scanning `budget:lease:{sub}:*` — here it walks the in-process registry.
        """
        with self._lock:
            now = int(self._now_ms())
            reclaimed = 0
            for acq_id, lease in list(self._leases.items()):
                if not lease.released and lease.expiry_ms <= now:
                    lease.released = True
                    self._hot.decr_concurrency(lease.sub, lease.cls)
                    self._leases.pop(acq_id, None)
                    reclaimed += 1
            return reclaimed

    def in_flight(self, sub: str, cls: Optional[str] = None) -> int:
        """Current shared in-flight count for (sub[, class]) — read-only helper."""
        # incr then decr to read the current value without a dedicated getter.
        with self._lock:
            n = self._hot.incr_concurrency(sub, cls)
            self._hot.decr_concurrency(sub, cls)
            return n - 1

    def outstanding_leases(self) -> int:
        """Count of un-released leases tracked in-process (test/observability aid)."""
        with self._lock:
            return sum(1 for l in self._leases.values() if not l.released)
