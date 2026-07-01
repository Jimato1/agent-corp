"""auth.budgets — per-tool-call BUDGET ENFORCEMENT (PLAN §6).

Budgets are a SAFETY guardrail against runaway loops / host exhaustion — NOT a
cost control (agents are local, no dollar meter; ARCHITECTURE §2, R§3). The
failure mode is "never terminating / confident garbage at machine speed", so the
compute guardrail FAILS CLOSED on the paths that matter (sod-critical /
destructive-exec) and is allow-but-LOCALLY-BOUNDED (never allow-unbounded) on
benign paths when the counter store is unreachable (finding 2b).

Four dimensions (PLAN §6.1), all keyed by the authoritative `sub` in ONE shared
counter store (Redis in prod, the in-process HotStore substitute here) so all of
an agent's processes share one budget:

  * gcra.py       — dim 1: rate/compute (GCRA, one TAT per key, injected clock).
  * semaphore.py  — dim 2: leased INCR/DECR concurrency semaphore (the PRIMARY
                    anti-runaway lever) with acquire-on-start / release-in-finally
                    / TTL-lease-backstop reaper.
  * cooldown.py   — dim 3: per (agent, action-class) cooldown (GCRA tau=0 /
                    SET-NX-EX) + idempotency-key replay.
  * lifetime.py   — dim 4: liveness / no-progress detector (N calls w/o a
                    state-advancing action, or T minutes) → arms a sub-scoped
                    freeze in the SAFE direction only.
  * middleware.py — the per-tool-call enforcement ORDER (PLAN §6.6) + 429/503
                    backpressure; fail-closed for destructive classes on counter-
                    store loss; the Redis-INDEPENDENT always-on in-process ceiling.

Enforcement lives at the MCP-server/API layer PER TOOL-CALL — NOT the proxy
(PLAN §6 invariant 3): ForwardAuth has no completion callback so it can INCR but
cannot reliably DECR the concurrency semaphore.

This package imports ONLY from auth.core / auth.store / auth.crypto (the frozen
foundation) and the Python stdlib.
"""
from .gcra import GCRALimiter, GCRADecision
from .semaphore import ConcurrencySemaphore, Lease, BudgetExceeded
from .cooldown import CooldownLimiter, CooldownDecision
from .lifetime import LifetimeDetector, LifetimeStatus, freeze_key, is_frozen
from .middleware import (
    BudgetMiddleware,
    BudgetDecision,
    CLASS_READ,
    CLASS_WRITE_BENIGN,
    CLASS_PROPOSE,
    CLASS_SOD_CRITICAL,
    CLASS_DESTRUCTIVE,
    DESTRUCTIVE_CLASSES,
    BENIGN_CLASSES,
    ALL_CLASSES,
)

__all__ = [
    "GCRALimiter",
    "GCRADecision",
    "ConcurrencySemaphore",
    "Lease",
    "BudgetExceeded",
    "CooldownLimiter",
    "CooldownDecision",
    "LifetimeDetector",
    "LifetimeStatus",
    "freeze_key",
    "is_frozen",
    "BudgetMiddleware",
    "BudgetDecision",
    "CLASS_READ",
    "CLASS_WRITE_BENIGN",
    "CLASS_PROPOSE",
    "CLASS_SOD_CRITICAL",
    "CLASS_DESTRUCTIVE",
    "DESTRUCTIVE_CLASSES",
    "BENIGN_CLASSES",
    "ALL_CLASSES",
]
