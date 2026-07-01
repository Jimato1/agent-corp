"""auth.budgets.middleware — per-tool-call enforcement order + backpressure (PLAN §6.6).

Wires the four dimensions into ONE ordered admission control at the MCP-server/API
layer PER TOOL-CALL (PLAN §6 invariant 3 — NOT the proxy). Implements the §6.6
evaluation order and the §6.2 fail table.

Evaluation order (PLAN §6.6), fail at first failure:
  0. kill-switch / freeze flag        → 503 if a quiesce/freeze bites this class
  1. token valid / aud / scope        → UPSTREAM (the PEP/verify surface, not budgets)
  2. classify                         → the caller supplies the action-class
  3. rate GCRA                        → 429 reason=rate (Retry-After)
  4. cooldown                         → 429 reason=cooldown (or idempotent replay)
  5. admission_claim SET NX PENDING   → 409 in_progress (destructive + idempotency key)
  6. concurrency ACQUIRE              → 429 reason=concurrency (no slot held on a cheaper fail)
  7. PDP + PIP (sod/destructive)      → UPSTREAM (the PDP surface, not budgets)
  8. execute                          → the caller runs the tool inside `enforce(...)`
  → completion: release the slot in `finally`.

Fail modes (PLAN §6.2 table, §6.5):
  * DESTRUCTIVE classes (sod-critical, destructive-exec) + counter-store loss
    → FAIL CLOSED (503). A runaway/compromised agent acting while we are blind is
      strictly worse than a few minutes of "nothing dangerous happens".
  * BENIGN classes (read, write-benign, propose) + counter-store loss
    → allow-but-LOCALLY-BOUNDED (NOT allow-unbounded, finding 2b): the shared
      checks are skipped, but the Redis-INDEPENDENT, always-on in-process ceiling
      still caps in-flight work + a coarse local clamp applies, and the response
      carries `X-Budget-Degraded: true`.

The in-process ceiling (finding 2b) is a static per-`sub` and per-process global
in-flight cap enforced LOCALLY, always-on, NEVER consulting the counter store — the
fail-safe FLOOR that cannot evaporate with its own dependency. It is acquired FIRST
(before any store op) so it is held even in degraded mode.

429 vs 503 vs 409 (PLAN §6.5): 429 = admission control (rate/cooldown/concurrency,
retryable); 503 = fail-closed (store down on a destructive path); 409 = an admission
claim for this idempotency key is already PENDING. None is conflated with 401/403.

------------------------------------------------------------------------------
CANNOT-VERIFY-HERE — Redis-independent kill epoch + physical plane isolation:
------------------------------------------------------------------------------
* Step 0 under an EXPLICIT quiesce posture must FAIL CLOSED on benign paths too,
  reading the kill epoch from the Redis-INDEPENDENT channel (signed into JWKS /
  AS-metadata / the forward-auth header, §7.3). That signed-header read lives in the
  verify/forward-auth surface, not budgets — so here a store-down benign path
  degrades-and-allows (local floor) and DEFERS the quiesce decision to that surface.
  Operator/CI closes it with the joint kill-switch drill:
    cd platform/auth && python -m pytest tests/integration/test_killswitch_redis_down.py
* The destructive introspect/PDP plane is physically isolated from this high-volume
  admission path (separate pools/replicas, §7.6) so a verify flood cannot starve it:
    cd platform/auth && python -m pytest tests/integration/test_destructive_plane_isolation.py
"""
from __future__ import annotations

import threading
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Callable, Dict, Iterator, List, Optional

from auth.core.interfaces import HotStore
from auth.core.principals import BudgetPolicy
from auth.store.memory_hot import KILL_G0, KILL_G1, KILL_G2

from .cooldown import CooldownLimiter
from .gcra import GCRALimiter
from .lifetime import is_frozen
from .semaphore import BudgetExceeded, ConcurrencySemaphore


# --- action-class taxonomy (PLAN §6.2) --------------------------------------
CLASS_READ = "read"
CLASS_WRITE_BENIGN = "write-benign"
CLASS_PROPOSE = "propose"
CLASS_SOD_CRITICAL = "sod-critical"
CLASS_DESTRUCTIVE = "destructive-exec"

# Fail-CLOSED on counter-store loss (PLAN §6.2). These co-locate with the hybrid
# token model's live revocation check (§4.7, §5.3).
DESTRUCTIVE_CLASSES = frozenset({CLASS_SOD_CRITICAL, CLASS_DESTRUCTIVE})
# Allow-but-locally-bounded on counter-store loss (finding 2b).
BENIGN_CLASSES = frozenset({CLASS_READ, CLASS_WRITE_BENIGN, CLASS_PROPOSE})
ALL_CLASSES = DESTRUCTIVE_CLASSES | BENIGN_CLASSES


def _default_clock_ms() -> float:
    import time
    return time.time() * 1000.0


class _StoreDown(Exception):
    """Internal: a HotStore op raised → the counter store is unreachable."""


@dataclass
class BudgetDecision:
    """The admission verdict for one tool-call."""
    allowed: bool
    status: int                 # 200 allow | 429 backpressure | 503 fail-closed | 409 in_progress
    reason: str = ""            # "" | rate | cooldown | concurrency | in_progress | frozen | quiesce | store_down_fail_closed
    retry_after_ms: int = 0
    degraded: bool = False      # X-Budget-Degraded (Redis down, benign allowed locally-bounded)
    replay: bool = False        # idempotent retry (cooldown replay)
    action_class: str = ""

    def headers(self) -> Dict[str, str]:
        """Wire headers for the over-budget / degraded response (PLAN §6.5)."""
        h: Dict[str, str] = {}
        if self.retry_after_ms > 0:
            # Retry-After is seconds (HTTP); round up so it never says "0".
            h["Retry-After"] = str((self.retry_after_ms + 999) // 1000)
        if self.degraded:
            h["X-Budget-Degraded"] = "true"
        return h


class BudgetMiddleware:
    """The per-tool-call budget admission controller (PLAN §6.6)."""

    def __init__(
        self,
        hot: HotStore,
        clock: Callable[[], float] = _default_clock_ms,
        *,
        local_per_sub_cap: int = 8,
        local_global_cap: int = 64,
    ) -> None:
        self._hot = hot
        self._now_ms = clock
        self._gcra = GCRALimiter(hot, clock)
        self._cooldown = CooldownLimiter(hot, clock)
        self._sema = ConcurrencySemaphore(hot, clock)

        # Redis-INDEPENDENT always-on in-process ceiling (finding 2b).
        self._local_per_sub_cap = local_per_sub_cap
        self._local_global_cap = local_global_cap
        self._local_lock = threading.RLock()
        self._local_counts: Dict[str, int] = {}
        self._local_global = 0

    # -- the in-process floor (never consults the counter store) -----------
    def _acquire_local(self, sub: str) -> bool:
        with self._local_lock:
            cur = self._local_counts.get(sub, 0)
            if cur >= self._local_per_sub_cap or self._local_global >= self._local_global_cap:
                return False
            self._local_counts[sub] = cur + 1
            self._local_global += 1
            return True

    def _release_local(self, sub: str) -> None:
        with self._local_lock:
            cur = self._local_counts.get(sub, 0)
            if cur > 0:
                self._local_counts[sub] = cur - 1
                self._local_global = max(0, self._local_global - 1)

    # -- safe HotStore call: convert store failure to _StoreDown -----------
    @staticmethod
    def _safe(fn: Callable, *a, **k):
        try:
            return fn(*a, **k)
        except BudgetExceeded:
            raise  # control-flow signal (over cap), NOT a store outage
        except Exception as e:  # noqa: BLE001 — any HotStore error == store unreachable
            raise _StoreDown from e

    # -- admission-claim (SET NX PENDING) for destructive idempotent calls -
    def _admission_key(self, sub: str, idempotency_key: str) -> str:
        return f"budget:idem:{sub}:{idempotency_key}:pending"

    # -- the ordered admission (PLAN §6.6) ---------------------------------
    def _admit(
        self,
        sub: str,
        action_class: str,
        policy: Optional[BudgetPolicy],
        idempotency_key: Optional[str],
    ) -> "tuple[BudgetDecision, List[Callable[[], None]]]":
        if action_class not in ALL_CLASSES:
            raise ValueError(f"unknown action_class {action_class!r}; must be one of {sorted(ALL_CLASSES)}")
        destructive = action_class in DESTRUCTIVE_CLASSES

        # -- always-on local FLOOR first (never touches the store) ----------
        if not self._acquire_local(sub):
            return (
                BudgetDecision(
                    allowed=False, status=429, reason="concurrency",
                    action_class=action_class,
                ),
                [],
            )
        local_rel: Callable[[], None] = lambda: self._release_local(sub)
        hot_rels: List[Callable[[], None]] = []

        def _rollback_hot() -> None:
            for r in reversed(hot_rels):
                try:
                    r()
                except Exception:
                    pass

        try:
            # -- step 0: kill-switch / freeze -------------------------------
            level, _epoch = self._safe(self._hot.killswitch)
            if level == KILL_G2:
                # quiesce-all: no agent call proceeds (humans/break-glass only).
                local_rel()
                return (
                    BudgetDecision(allowed=False, status=503, reason="quiesce", action_class=action_class),
                    [],
                )
            if destructive and level == KILL_G1:
                # freeze-destructive: stop the hands, keep thinking.
                local_rel()
                return (
                    BudgetDecision(allowed=False, status=503, reason="frozen", action_class=action_class),
                    [],
                )
            # sub-scoped freeze armed by the lifetime detector (safe direction).
            if destructive and self._safe(is_frozen, self._hot, sub):
                local_rel()
                return (
                    BudgetDecision(allowed=False, status=503, reason="frozen", action_class=action_class),
                    [],
                )

            # -- step 3: rate (GCRA) ----------------------------------------
            if policy is not None and policy.rate is not None:
                d = self._safe(self._gcra.check, sub, policy.rate, None)
                if not d.allowed:
                    _rollback_hot()
                    local_rel()
                    return (
                        BudgetDecision(
                            allowed=False, status=429, reason="rate",
                            retry_after_ms=d.retry_after_ms, action_class=action_class,
                        ),
                        [],
                    )

            # -- step 4: cooldown -------------------------------------------
            if policy is not None and action_class in policy.cooldowns_ms:
                d = self._safe(
                    self._cooldown.check,
                    sub, action_class, policy.cooldowns_ms[action_class], idempotency_key,
                )
                if d.replay:
                    # Idempotent retry — allow through WITHOUT holding new slots.
                    _rollback_hot()
                    local_rel()
                    return (
                        BudgetDecision(
                            allowed=True, status=200, reason="", replay=True,
                            action_class=action_class,
                        ),
                        [],
                    )
                if not d.allowed:
                    _rollback_hot()
                    local_rel()
                    return (
                        BudgetDecision(
                            allowed=False, status=429, reason="cooldown",
                            retry_after_ms=d.retry_after_ms, action_class=action_class,
                        ),
                        [],
                    )

            # -- step 5: admission claim (destructive + idempotency key) ----
            if destructive and idempotency_key is not None:
                akey = self._admission_key(sub, idempotency_key)
                if self._safe(self._hot.get_counter, akey) > 0:
                    _rollback_hot()
                    local_rel()
                    return (
                        BudgetDecision(
                            allowed=False, status=409, reason="in_progress",
                            action_class=action_class,
                        ),
                        [],
                    )
                # SET NX PENDING (best-effort NX here; atomic SET NX in prod Redis).
                self._safe(self._hot.set_counter, akey, 1, 300_000)
                hot_rels.append(lambda: self._release_admission(akey))

            # -- step 6: concurrency ACQUIRE (global, then per-class) -------
            if policy is not None and policy.concurrency is not None:
                conc = policy.concurrency
                try:
                    g_lease = self._safe(self._sema.acquire, sub, conc.global_max, None)
                except BudgetExceeded as be:
                    _rollback_hot()
                    local_rel()
                    return (
                        BudgetDecision(
                            allowed=False, status=429, reason="concurrency",
                            action_class=action_class,
                        ),
                        [],
                    )
                hot_rels.append(lambda: self._sema.release(g_lease))

                per_class_max = conc.per_class_max.get(action_class)
                if per_class_max is not None:
                    try:
                        c_lease = self._safe(self._sema.acquire, sub, per_class_max, action_class)
                    except BudgetExceeded:
                        _rollback_hot()
                        local_rel()
                        return (
                            BudgetDecision(
                                allowed=False, status=429, reason="concurrency",
                                action_class=action_class,
                            ),
                            [],
                        )
                    hot_rels.append(lambda: self._sema.release(c_lease))

            # -- admitted -----------------------------------------------------
            return (
                BudgetDecision(allowed=True, status=200, reason="", action_class=action_class),
                [local_rel] + hot_rels,
            )

        except _StoreDown:
            # Counter store unreachable mid-admission (PLAN §6.2 fail table).
            _rollback_hot()
            if destructive:
                # FAIL CLOSED — the safe direction.
                local_rel()
                return (
                    BudgetDecision(
                        allowed=False, status=503, reason="store_down_fail_closed",
                        action_class=action_class,
                    ),
                    [],
                )
            # BENIGN: allow-but-locally-bounded — keep ONLY the local floor slot.
            return (
                BudgetDecision(
                    allowed=True, status=200, reason="", degraded=True,
                    action_class=action_class,
                ),
                [local_rel],
            )

    def _release_admission(self, admission_key: str) -> None:
        """Clear the PENDING admission claim on completion (best-effort)."""
        try:
            self._hot.set_counter(admission_key, 0, ttl_ms=None)
        except Exception:
            pass

    # -- public surface ----------------------------------------------------
    @contextmanager
    def enforce(
        self,
        sub: str,
        action_class: str,
        *,
        policy: Optional[BudgetPolicy] = None,
        idempotency_key: Optional[str] = None,
    ) -> Iterator[BudgetDecision]:
        """Admit → yield the decision → ALWAYS release held slots in `finally`.

        Usage (release-in-finally is structurally guaranteed, PLAN §6.4):

            with mw.enforce(sub, CLASS_DESTRUCTIVE, policy=pol, idempotency_key=k) as d:
                if not d.allowed:
                    return respond(d.status, d.reason, d.headers())
                ... run the tool ...
        """
        decision, releasers = self._admit(sub, action_class, policy, idempotency_key)
        try:
            yield decision
        finally:
            for r in reversed(releasers):
                try:
                    r()
                except Exception:
                    pass

    def check(
        self,
        sub: str,
        action_class: str,
        *,
        policy: Optional[BudgetPolicy] = None,
        idempotency_key: Optional[str] = None,
    ) -> BudgetDecision:
        """Non-context admission check that RELEASES immediately (no work held).

        For callers that only need the verdict (and the over-budget response) — e.g.
        proving "over-budget returns 429, not queue-forever". Any slot acquired to
        make the decision is released before returning, so this never leaks a slot.
        """
        decision, releasers = self._admit(sub, action_class, policy, idempotency_key)
        for r in reversed(releasers):
            try:
                r()
            except Exception:
                pass
        return decision
