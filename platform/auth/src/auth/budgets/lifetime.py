"""auth.budgets.lifetime — dimension 4: liveness / no-progress detector (PLAN §6.1 dim 4).

The FOURTH, first-class budget dimension (finding 5b). Rate, concurrency, and
cooldown all bound INSTANTANEOUS behavior; a patient sequential benign-read/plan
loop trips NONE of them — yet "never-terminating / confident garbage at machine
speed" is the architecture's NAMED failure mode. This detector bounds TOTAL work
and detects no-progress, then AUTO-ARMS a `sub`-scoped freeze — but ONLY IN THE
SAFE (stopping) DIRECTION (PLAN §6.1 dim 4, §7.8: "automated guardrails may
trigger only toward less real-world action").

Concrete triggers (PLAN §6.1 dim 4 / LifetimeLimit):
  * max_lifetime_tool_calls      — total tool-calls cap for the agent.
  * max_wall_clock_ms            — wall-clock compute budget since first call.
  * no_progress_calls_trigger    — N tool-calls with NO state-advancing action.
  * no_progress_minutes_trigger  — T minutes since the last progress.

"Progress" = a state-advancing / side-effecting action (the caller reports it per
call via `progressed=True`). A pure read/plan loop reports `progressed=False`.

State (HotStore counters, injected clock, ms) — PLAN §6.1 keys `budget:life:{sub}`,
`budget:progress:{sub}`:
  * budget:life:{sub}             — total lifetime tool-calls.
  * budget:life:{sub}:start       — first-call wall-clock (ms).
  * budget:progress:{sub}:streak  — consecutive no-progress calls.
  * budget:progress:{sub}:last    — last-progress wall-clock (ms).
  * budget:freeze:{sub}           — 1 once a sub-scoped freeze is ARMED.

Arming is MONOTONIC toward safety: once armed the freeze stays until an OPERATOR
(G0 restore) clears it — the detector never auto-un-freezes. The middleware reads
`budget:freeze:{sub}` at step 0 to deny destructive classes for that sub.

------------------------------------------------------------------------------
CANNOT-VERIFY-HERE — ownership + atomic INCR (PLAN §6.1 dim 4, §6.7, §7.8):
------------------------------------------------------------------------------
Owner = Mission Control (§6.7): MC drives the no-progress detector and the arm →
G1/G2 escalation; `auth` owns the POLICY (LifetimeLimit) and the freeze mechanism.
In prod the counter bumps are atomic Redis INCR and the arm publishes onto the
`auth:revocations` epoch channel so the freeze fans out sub-second suite-wide.
Here the read-modify-write is serialized by the HotStore lock (single-writer
substitute) and the fan-out is the in-process publish. Operator closes it with:
    docker run -p 6379:6379 redis:7 --appendonly yes
    cd platform/auth && python -m pytest tests/integration/test_lifetime_freeze_fanout.py
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Optional

from auth.core.interfaces import HotStore
from auth.core.principals import LifetimeLimit


def _default_clock_ms() -> float:
    import time
    return time.time() * 1000.0


def freeze_key(sub: str) -> str:
    """The sub-scoped freeze flag key. Set to 1 == destructive frozen for this sub."""
    return f"budget:freeze:{sub}"


def is_frozen(hot: HotStore, sub: str) -> bool:
    """True iff a sub-scoped freeze is armed for `sub` (read by the middleware, §6.6 step 0)."""
    return hot.get_counter(freeze_key(sub)) > 0


@dataclass(frozen=True)
class LifetimeStatus:
    """Outcome of recording one tool-call against the lifetime/liveness budget."""
    lifetime_calls: int
    no_progress_streak: int
    armed_freeze: bool = False
    reason: str = ""            # "" | "lifetime_calls" | "wall_clock" | "no_progress_calls" | "no_progress_minutes"


class LifetimeDetector:
    """Per-agent lifetime/liveness budget; auto-arms a sub-scoped freeze (safe direction)."""

    def __init__(
        self,
        hot: HotStore,
        clock: Callable[[], float] = _default_clock_ms,
        freeze_hook: Optional[Callable[[str, str], None]] = None,
    ) -> None:
        self._hot = hot
        self._now_ms = clock
        # Optional wiring so integration can escalate the arm to the real
        # kill-switch / revocation (e.g. set_revoked_before(sub)) — SAFE direction only.
        self._freeze_hook = freeze_hook

    # -- keys --------------------------------------------------------------
    @staticmethod
    def _life_key(sub: str) -> str:
        return f"budget:life:{sub}"

    @staticmethod
    def _start_key(sub: str) -> str:
        return f"budget:life:{sub}:start"

    @staticmethod
    def _streak_key(sub: str) -> str:
        return f"budget:progress:{sub}:streak"

    @staticmethod
    def _last_progress_key(sub: str) -> str:
        return f"budget:progress:{sub}:last"

    # -- internal RMW helper ----------------------------------------------
    def _incr(self, key: str, ttl_ms: int = 24 * 3600_000) -> int:
        cur = self._hot.get_counter(key)
        cur += 1
        self._hot.set_counter(key, cur, ttl_ms=ttl_ms)
        return cur

    # -- the freeze lever (SAFE direction only) ----------------------------
    def arm_freeze(self, sub: str, reason: str) -> None:
        """Arm a sub-scoped freeze. Monotonic: once set it is only cleared by an
        operator G0 restore (this method never un-freezes). Idempotent."""
        self._hot.set_counter(freeze_key(sub), 1, ttl_ms=None)  # no TTL: stays until operator clears
        if self._freeze_hook is not None:
            # Never raises through the detector; escalation is best-effort here.
            try:
                self._freeze_hook(sub, reason)
            except Exception:
                pass

    def is_frozen(self, sub: str) -> bool:
        return is_frozen(self._hot, sub)

    def clear_freeze(self, sub: str) -> None:
        """OPERATOR-only: clear a sub-scoped freeze (G0 restore). NOT auto-called."""
        self._hot.set_counter(freeze_key(sub), 0, ttl_ms=None)

    # -- the per-call detector --------------------------------------------
    def record_call(
        self,
        sub: str,
        policy: LifetimeLimit,
        progressed: bool,
    ) -> LifetimeStatus:
        """Record one tool-call; arm the sub-scoped freeze if any trigger fires.

        `progressed` = did this call advance task state / cause a side effect? A
        pure read/plan iteration reports False; a state-advancing action reports True.
        """
        now = int(self._now_ms())

        # First-call wall-clock anchor.
        if self._hot.get_counter(self._start_key(sub)) == 0:
            self._hot.set_counter(self._start_key(sub), now, ttl_ms=None)
        start = self._hot.get_counter(self._start_key(sub))

        lifetime_calls = self._incr(self._life_key(sub))

        if progressed:
            # Progress resets the no-progress streak and stamps last-progress.
            self._hot.set_counter(self._streak_key(sub), 0, ttl_ms=None)
            self._hot.set_counter(self._last_progress_key(sub), now, ttl_ms=None)
            streak = 0
        else:
            streak = self._incr(self._streak_key(sub))
            # Anchor last-progress at `start` if we have never progressed, so the
            # no_progress_minutes trigger measures from the beginning of the loop.
            if self._hot.get_counter(self._last_progress_key(sub)) == 0:
                self._hot.set_counter(self._last_progress_key(sub), start, ttl_ms=None)

        last_progress = self._hot.get_counter(self._last_progress_key(sub))

        reason = self._evaluate_triggers(
            policy=policy,
            now=now,
            start=start,
            lifetime_calls=lifetime_calls,
            streak=streak,
            last_progress=last_progress,
        )

        armed = False
        if reason:
            self.arm_freeze(sub, reason)
            armed = True

        return LifetimeStatus(
            lifetime_calls=lifetime_calls,
            no_progress_streak=streak,
            armed_freeze=armed,
            reason=reason,
        )

    @staticmethod
    def _evaluate_triggers(
        policy: LifetimeLimit,
        now: int,
        start: int,
        lifetime_calls: int,
        streak: int,
        last_progress: int,
    ) -> str:
        """Return the first-firing trigger's machine reason, or "" if none fired."""
        if (
            policy.max_lifetime_tool_calls is not None
            and lifetime_calls >= policy.max_lifetime_tool_calls
        ):
            return "lifetime_calls"
        if (
            policy.max_wall_clock_ms is not None
            and (now - start) >= policy.max_wall_clock_ms
        ):
            return "wall_clock"
        if (
            policy.no_progress_calls_trigger is not None
            and streak >= policy.no_progress_calls_trigger
        ):
            return "no_progress_calls"
        if (
            policy.no_progress_minutes_trigger is not None
            and (now - last_progress) >= policy.no_progress_minutes_trigger * 60_000
        ):
            return "no_progress_minutes"
        return ""
