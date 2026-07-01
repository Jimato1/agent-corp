"""auth.budgets.cooldown — dimension 3: per (agent, action-class) cooldown (PLAN §6.1/§6.3).

A minimum interval between calls of the same action-class by the same agent. This
is GCRA with tau=0 (no burst) — equivalently a `SET NX EX` gate — combined with
IDEMPOTENCY KEYS so a retry within the cooldown window (SAME key) returns the prior
result (a replay), while a DIFFERENT key inside the window is rejected (PLAN §6.1
dim 3, §6.3, §6.5).

State (injected clock, ms):
  * `budget:cool:{sub}:{class}`      → next-allowed-at TAT (ms). tau=0 GCRA.
  * `budget:idem:{sub}:{key}`        → 1 while a previously-admitted idempotency key
                                       is still within its window (replay marker).

Decision matrix:
  same idempotency key seen in-window   → ALLOW (replay=True)   — idempotent retry
  within cooldown, no/other idem key    → REJECT (429, reason="cooldown")
  cooldown elapsed                      → ALLOW, arm next window (+ record idem key)

------------------------------------------------------------------------------
CANNOT-VERIFY-HERE — production atomicity + result cache (PLAN §6.3, §5.3):
------------------------------------------------------------------------------
Prod: the cooldown TAT set and the idempotency `SET NX EX` are atomic Redis ops,
and the idempotency marker stores a handle to the PRIOR RESULT so a replay returns
the exact prior response body (completion-time cache, §5.3), not merely "allowed".
Here the marker is a presence flag (the HotStore stores ints only) — the correct
logic substitute, but the result-cache round trip is CANNOT-VERIFY-HERE. Operator:
    docker run -p 6379:6379 redis:7 --appendonly yes
    cd platform/auth && python -m pytest tests/integration/test_cooldown_idem.py
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Optional

from auth.core.interfaces import HotStore


def _default_clock_ms() -> float:
    import time
    return time.time() * 1000.0


@dataclass(frozen=True)
class CooldownDecision:
    """Outcome of one cooldown check."""
    allowed: bool
    retry_after_ms: int = 0     # >0 only when rejected: ms until the class cools down
    reason: str = ""            # "" on allow, "cooldown" on reject
    replay: bool = False        # True → idempotent retry of an already-admitted key


class CooldownLimiter:
    """Per (agent, action-class) cooldown with idempotency-key replay."""

    def __init__(self, hot: HotStore, clock: Callable[[], float] = _default_clock_ms) -> None:
        self._hot = hot
        self._now_ms = clock

    @staticmethod
    def cool_key(sub: str, action_class: str) -> str:
        return f"budget:cool:{sub}:{action_class}"

    @staticmethod
    def idem_key(sub: str, idempotency_key: str) -> str:
        return f"budget:idem:{sub}:{idempotency_key}"

    def check(
        self,
        sub: str,
        action_class: str,
        cooldown_ms: int,
        idempotency_key: Optional[str] = None,
    ) -> CooldownDecision:
        """Admit or reject under the (agent, action-class) cooldown."""
        now = int(self._now_ms())
        cool_key = self.cool_key(sub, action_class)
        next_allowed = self._hot.get_counter(cool_key)  # 0 == never fired
        within_cooldown = now < next_allowed

        # Idempotent-retry short-circuit: the exact same key seen inside its window
        # is a replay of an already-admitted call → allow (prior result, §5.3).
        if idempotency_key is not None:
            if self._hot.get_counter(self.idem_key(sub, idempotency_key)) > 0:
                return CooldownDecision(allowed=True, retry_after_ms=0, reason="", replay=True)

        if within_cooldown:
            # In cooldown and this is NOT a known idempotency key → reject.
            return CooldownDecision(
                allowed=False,
                retry_after_ms=next_allowed - now,
                reason="cooldown",
                replay=False,
            )

        # Cooldown elapsed → admit and arm the next window.
        ttl = int(cooldown_ms) + 60_000  # GC hint (real-ms); correctness rides the clock.
        self._hot.set_counter(cool_key, now + int(cooldown_ms), ttl_ms=ttl)
        if idempotency_key is not None:
            self._hot.set_counter(self.idem_key(sub, idempotency_key), 1, ttl_ms=ttl)
        return CooldownDecision(allowed=True, retry_after_ms=0, reason="", replay=False)
