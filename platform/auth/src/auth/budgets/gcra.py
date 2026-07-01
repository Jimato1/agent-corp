"""auth.budgets.gcra — dimension 1: rate/compute limiter (PLAN §6.1).

GCRA (Generic Cell Rate Algorithm) rate limiter. ONE stored value per key — the
TAT ("theoretical arrival time") — bounds sustained throughput to one request per
emission interval `T`, with a burst tolerance `tau` (PLAN §6.1, §6.3). GCRA is the
chosen mechanism because it needs a single authoritative clock read and a single
counter, and encodes both sustained rate AND burst in one number.

Clock injection: the clock is a callable returning MILLISECONDS (epoch-ms in prod
via Redis `TIME`; a FakeClock in tests). All math is in integer ms to match
auth.core.principals.RateLimit (emission_interval_ms, burst_tau_ms). Injecting the
clock is what makes GCRA deterministically testable HERE with no real sleeping.

State is stored as an integer TAT in the HotStore counter `budget:rate:{sub}` (or
`budget:rate:{sub}:{class}`). get_counter returns 0 for an absent key; because a
real epoch-ms clock is always > 0, 0 is a safe "no prior TAT" sentinel.

------------------------------------------------------------------------------
CANNOT-VERIFY-HERE — production atomicity (PLAN §6.1, §6.3):
------------------------------------------------------------------------------
In prod the read-modify-write of the TAT MUST be atomic across replicas. That is a
Redis Lua `EVAL` (or `WATCH`/MULTI) using Redis `TIME` as the one authoritative
clock, so two of an agent's processes cannot both read a stale TAT and double-admit.
The in-process HotStore serializes ops under its own lock, which is the correct
single-replica substitute but does NOT prove the Lua path. Operator closes it with:
    docker run -p 6379:6379 redis:7 --appendonly yes
    cd platform/auth && python -m pytest tests/integration/test_gcra_lua.py
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Optional

from auth.core.interfaces import HotStore
from auth.core.principals import RateLimit


def _default_clock_ms() -> float:
    import time
    return time.time() * 1000.0


@dataclass(frozen=True)
class GCRADecision:
    """Outcome of one GCRA admission check."""
    allowed: bool
    retry_after_ms: int = 0     # >0 only when rejected: earliest ms until next admit
    reason: str = ""            # "" on allow, "rate" on reject


class GCRALimiter:
    """GCRA rate/compute limiter over HotStore counters with an injected clock."""

    def __init__(self, hot: HotStore, clock: Callable[[], float] = _default_clock_ms) -> None:
        self._hot = hot
        self._now_ms = clock

    @staticmethod
    def key(sub: str, action_class: Optional[str] = None) -> str:
        base = f"budget:rate:{sub}"
        return f"{base}:{action_class}" if action_class else base

    def check(
        self,
        sub: str,
        rate: RateLimit,
        action_class: Optional[str] = None,
    ) -> GCRADecision:
        """Admit or reject one arrival under GCRA. Pure function of clock + stored TAT.

        Algorithm (classic GCRA rate-limiter form):
          T   = emission_interval_ms  (steady-state spacing per request)
          tau = burst_tau_ms          (how far ahead of the TAT an arrival may be)
          allow_at = tat - tau        (earliest time this arrival is admissible)
          if now < allow_at: REJECT, retry_after = allow_at - now
          else: new_tat = max(tat, now) + T; store; ALLOW

        Burst capacity ≈ floor(tau / T) + 1 back-to-back arrivals from idle.
        """
        T = int(rate.emission_interval_ms)
        tau = int(rate.burst_tau_ms)
        now = int(self._now_ms())

        key = self.key(sub, action_class)
        stored = self._hot.get_counter(key)
        # 0 == absent (real epoch-ms clock is always > 0). Treat as "arriving fresh".
        tat = stored if stored > 0 else now

        allow_at = tat - tau
        if now < allow_at:
            return GCRADecision(allowed=False, retry_after_ms=allow_at - now, reason="rate")

        new_tat = max(tat, now) + T
        # TTL is a GC hint only (real-ms in the HotStore). Generous margin so a slow
        # CI run can never expire the TAT out from under an in-flight burst window;
        # correctness rides the injected clock, not this TTL.
        ttl_ms = (new_tat - now) + tau + 60_000
        self._hot.set_counter(key, int(new_tat), ttl_ms=ttl_ms)
        return GCRADecision(allowed=True, retry_after_ms=0, reason="")
