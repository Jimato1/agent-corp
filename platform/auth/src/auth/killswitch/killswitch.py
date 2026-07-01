"""auth.killswitch.killswitch — graduated kill switch + fail-closed matrix (PLAN §7).

This module owns three things, all pure-stdlib and fully runnable here:

  1. The GRADUATED global kill switch (G0/G1/G2, §7.2). `KillSwitchController.arm`
     writes an authoritative append-only revocation-ledger entry, then SETs the
     HotStore killswitch {level, epoch} + publishes the delta — in that order, so
     the operator ack is returned ONLY AFTER both the durable ledger append AND the
     authoritative hot SET have committed (write-before-ack, §4.6 finding 3d). The
     kill epoch is monotonically bumped on every change (§7.2).

  2. The kill-switch DENY decision (§7.2 table): G0 denies nothing; G1
     `freeze-destructive` denies the SoD-critical + destructive-exec classes
     suite-wide while benign reads/writes/planning still flow ("stop the hands, keep
     thinking"); G2 `quiesce-all` denies every agent/service token, leaving humans +
     break-glass only.

  3. The FAIL-CLOSED / fail-open matrix (§7.5) as a pure callable: given an
     action-class and which dependency is down, return CLOSED (deny) or OPEN
     (allow to the still-valid cached JWT). Anything that can cause/enable an
     irreversible real-world effect fails CLOSED on ANY dependency loss; pure reads
     may fail-open to a cached JWT bounded by its short TTL.

AUTOMATED-GUARDRAILS-ONLY-TOWARD-LESS-ACTION (§7.8): `arm(..., automated=True)`
refuses any transition that would move toward MORE real-world action (lowering the
kill level). Only the human operator may lift a kill.

CANNOT-VERIFY-HERE (operator/CI closes these):
  * Cross-replica pub/sub fan-out of the ledger delta over channel `auth:revocations`
    needs a real Redis — the HotStore here is the single-replica MemoryHotStore
    substitute (see auth.store.memory_hot docstring). Close with:
        docker run -p 6379:6379 redis:7 --appendonly yes
        cd platform/auth && python -m pytest tests/integration/test_redis_fanout.py
  * Kill-write-path HA under a single-dependency failure (operator can still STOP
    with only Redis down, or only the SQLite writer down — §7.3 finding 2d) is a
    Stage-7 deployment test:
        cd platform/auth && python -m pytest tests/integration/test_kill_ha.py
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Dict, Optional, Tuple

from auth.core import scopes as S
from auth.core.interfaces import HotStore, Store
from auth.store.memory_hot import KILL_G0, KILL_G1, KILL_G2

__all__ = [
    "KILL_G0",
    "KILL_G1",
    "KILL_G2",
    "CLASS_READ",
    "CLASS_WRITE_BENIGN",
    "CLASS_PROPOSE",
    "CLASS_SOD_CRITICAL",
    "CLASS_DESTRUCTIVE_EXEC",
    "VALID_ACTION_CLASSES",
    "DEP_NONE",
    "DEP_LIVE_PDP",
    "DEP_REDIS",
    "DEP_JWKS",
    "DEP_TIMEOUT",
    "VALID_DEPS",
    "DECISION_OPEN",
    "DECISION_CLOSED",
    "LEDGER_JTI",
    "LEDGER_SUB",
    "LEDGER_CLIENT_ID",
    "LEDGER_KID",
    "LEDGER_GLOBAL",
    "KillAck",
    "KillDecision",
    "KillSwitchController",
    "RevocationLedgerEntry",
    "action_class_for_scope",
    "fail_closed_matrix",
    "killswitch_denies",
]


# ---------------------------------------------------------------------------
# Action-class taxonomy (PLAN §6.2) — the enforcement key for both the kill
# switch and the fail-closed matrix.
# ---------------------------------------------------------------------------

CLASS_READ = "read"
CLASS_WRITE_BENIGN = "write-benign"
CLASS_PROPOSE = "propose"
CLASS_SOD_CRITICAL = "sod-critical"          # board:approve, cmdb:write-policy
CLASS_DESTRUCTIVE_EXEC = "destructive-exec"  # gateway:execute, vault:read-credential

VALID_ACTION_CLASSES = frozenset(
    {CLASS_READ, CLASS_WRITE_BENIGN, CLASS_PROPOSE, CLASS_SOD_CRITICAL, CLASS_DESTRUCTIVE_EXEC}
)

# The classes that release/enable an irreversible real-world effect. These are
# exactly the paths the hybrid token model flags for a live revocation check
# (§4.7) and they ALWAYS fail closed on any dependency loss (§7.5).
_ALWAYS_FAIL_CLOSED = frozenset({CLASS_SOD_CRITICAL, CLASS_DESTRUCTIVE_EXEC})
_BENIGN_MUTATING = frozenset({CLASS_WRITE_BENIGN, CLASS_PROPOSE})

# The four holder scopes -> their action-class (PLAN §3.3 / §6.2).
_HOLDER_SCOPE_CLASS: Dict[str, str] = {
    S.GATEWAY_EXECUTE: CLASS_DESTRUCTIVE_EXEC,
    S.VAULT_READ_CREDENTIAL: CLASS_DESTRUCTIVE_EXEC,
    S.BOARD_APPROVE: CLASS_SOD_CRITICAL,
    S.CMDB_WRITE_POLICY: CLASS_SOD_CRITICAL,
}


def action_class_for_scope(scope: str) -> str:
    """Best-effort map a canonical scope id to its action-class (PLAN §6.2).

    The four holder scopes map precisely to sod-critical / destructive-exec (the
    fail-closed classes). Read-shaped scopes map to `read`; everything else to
    `write-benign`. Callers that already know the exact class should pass it
    directly to `killswitch_denies` / `fail_closed_matrix`.
    """
    if scope in _HOLDER_SCOPE_CLASS:
        return _HOLDER_SCOPE_CLASS[scope]
    # `*:read`, `*:read-policy`, `*:reference`, `*:view`, `*:search` are reads.
    cap = scope.split(":", 1)[1] if ":" in scope else scope
    if cap in ("read", "read-policy", "reference", "view", "search", "read-identity"):
        return CLASS_READ
    if cap == "propose":
        return CLASS_PROPOSE
    return CLASS_WRITE_BENIGN


# ---------------------------------------------------------------------------
# Fail-closed matrix (PLAN §7.5) — pure callable, no I/O.
# ---------------------------------------------------------------------------

# Which single dependency is down (the columns of the §7.5 matrix).
DEP_NONE = "none"            # nothing down — proceed to the normal live check
DEP_LIVE_PDP = "live_pdp"    # live PDP / auth introspect plane down
DEP_REDIS = "redis"          # Redis (denylist / counters) down
DEP_JWKS = "jwks"            # JWKS unreachable
DEP_TIMEOUT = "timeout"      # live-check timed out (~250 ms)
VALID_DEPS = frozenset({DEP_NONE, DEP_LIVE_PDP, DEP_REDIS, DEP_JWKS, DEP_TIMEOUT})

# The two outcomes: OPEN = allow (fall back to the still-valid cached JWT, bounded
# by its short TTL); CLOSED = deny (fail-closed).
DECISION_OPEN = "OPEN"
DECISION_CLOSED = "CLOSED"


def fail_closed_matrix(
    action_class: str,
    dep_down: str,
    *,
    has_cached_jwt: bool = True,
    has_cached_jwks: bool = False,
) -> str:
    """Return DECISION_CLOSED (deny) or DECISION_OPEN (allow-to-cached) per §7.5.

    Rule (§7.5): anything that can cause/enable an irreversible real-world effect
    (`sod-critical`, `destructive-exec`) fails CLOSED on ANY dependency loss; pure
    reads may fail-open to a still-valid cached JWT.

    | class            | live PDP down | Redis down | JWKS down          | timeout       |
    |------------------|---------------|------------|--------------------|---------------|
    | destructive-exec | CLOSED        | CLOSED     | CLOSED             | CLOSED        |
    | sod-critical     | CLOSED        | CLOSED     | CLOSED             | CLOSED        |
    | write-benign     | open->cached  | open       | CLOSED             | open->cached  |
    | propose          | open->cached  | open       | CLOSED             | open->cached  |
    | read             | OPEN          | OPEN       | CLOSED* (cache ok) | OPEN          |

    * JWKS loss forces closed unless the RS still holds a valid cached key set
      (`has_cached_jwks`); keys rotate slowly, so cache generously.
    """
    if action_class not in VALID_ACTION_CLASSES:
        raise ValueError(f"unknown action_class {action_class!r}")
    if dep_down not in VALID_DEPS:
        raise ValueError(f"unknown dep_down {dep_down!r}")

    # No dependency lost -> the matrix does not fail anything closed; the normal
    # live-check flow proceeds (the caller still runs its live check for
    # destructive/sod classes elsewhere).
    if dep_down == DEP_NONE:
        return DECISION_OPEN

    # Irreversible-effect classes: CLOSED on ANY dependency loss. No exceptions.
    if action_class in _ALWAYS_FAIL_CLOSED:
        return DECISION_CLOSED

    # JWKS unreachable: cannot validate a token signature at all. Reads may ride a
    # still-valid cached key set; mutating benign writes fail closed.
    if dep_down == DEP_JWKS:
        if action_class == CLASS_READ:
            return DECISION_OPEN if has_cached_jwks else DECISION_CLOSED
        return DECISION_CLOSED

    # Benign reads fail OPEN on live-PDP / Redis / timeout loss (staleness <= TTL).
    if action_class == CLASS_READ:
        return DECISION_OPEN

    # Mutating benign writes / propose:
    if dep_down == DEP_REDIS:
        # Redis down -> budget best-effort, allow (§7.5 "fail-open (budget best-effort)").
        return DECISION_OPEN
    # live PDP down / timeout -> fail-open to the cached JWT until exp.
    return DECISION_OPEN if has_cached_jwt else DECISION_CLOSED


# ---------------------------------------------------------------------------
# Kill-switch deny decision (PLAN §7.2).
# ---------------------------------------------------------------------------

from auth.core.principals import (  # noqa: E402  (kept local to this concern)
    KIND_AGENT,
    KIND_BREAK_GLASS,
    KIND_HUMAN,
    KIND_SERVICE,
)

# G2 quiesce-all leaves only these principal kinds able to act (§7.2).
_G2_ALLOWED_KINDS = frozenset({KIND_HUMAN, KIND_BREAK_GLASS})
# G1 freezes exactly the irreversible-effect classes suite-wide (§7.2).
_FROZEN_UNDER_G1 = _ALWAYS_FAIL_CLOSED

# Level restrictiveness ordering: higher == LESS real-world action allowed.
_LEVEL_RESTRICTIVENESS = {KILL_G0: 0, KILL_G1: 1, KILL_G2: 2}
_VALID_LEVELS = frozenset(_LEVEL_RESTRICTIVENESS)
_MODE_FOR_LEVEL = {
    KILL_G0: "normal",
    KILL_G1: "freeze-destructive",
    KILL_G2: "quiesce-all",
}


def killswitch_denies(level: str, action_class: str, principal_kind: str = KIND_AGENT) -> bool:
    """True iff the current kill `level` denies a call of `action_class` by a
    principal of `principal_kind` (PLAN §7.2).

    * G0 — denies nothing.
    * G1 `freeze-destructive` — denies `sod-critical` + `destructive-exec`
      suite-wide (stop the hands); benign reads/writes/planning still flow.
    * G2 `quiesce-all` — denies EVERY agent/service token regardless of class;
      humans + break-glass only.

    A `break_glass` principal is never frozen by the switch — its STOP/RESTORE
    control-plane authority is exactly what must survive a G2 (§7.7). (It structurally
    holds no action-side scope anyway, so this never releases real-world action.)
    """
    if level not in _VALID_LEVELS:
        raise ValueError(f"invalid kill level {level!r}; must be one of {sorted(_VALID_LEVELS)}")
    if action_class not in VALID_ACTION_CLASSES:
        raise ValueError(f"unknown action_class {action_class!r}")

    if principal_kind == KIND_BREAK_GLASS:
        return False
    if level == KILL_G0:
        return False
    if level == KILL_G1:
        return action_class in _FROZEN_UNDER_G1
    # KILL_G2 — quiesce-all: only humans + break-glass may act.
    return principal_kind not in _G2_ALLOWED_KINDS


# ---------------------------------------------------------------------------
# Revocation ledger entry (PLAN §7.2) — the append-only "truth" line.
# ---------------------------------------------------------------------------

# scope_type of a ledger entry (§7.2).
LEDGER_JTI = "jti"
LEDGER_SUB = "sub"
LEDGER_CLIENT_ID = "client_id"
LEDGER_KID = "kid"
LEDGER_GLOBAL = "global"
_VALID_SCOPE_TYPES = frozenset(
    {LEDGER_JTI, LEDGER_SUB, LEDGER_CLIENT_ID, LEDGER_KID, LEDGER_GLOBAL}
)


@dataclass(frozen=True)
class RevocationLedgerEntry:
    """One authoritative append-only revocation-ledger line (PLAN §7.2).

    The audit line is the TRUTH; the HotStore (Redis) is a hot projection of it.
    `epoch` is monotonic (bumped every change) and `ttl_hint` is >= max token TTL so
    a JWT never outlives its denylist entry.
    """
    scope_type: str          # jti | sub | client_id | kid | global
    target: str              # the jti / sub / client_id / kid, or "*" for global
    mode: str                # normal | freeze-destructive | quiesce-all | revoke
    not_before: int          # unix seconds — tokens with iat < not_before are denied
    epoch: int               # monotonic kill/revocation epoch
    issued_by: str           # the principal (or "break-glass:<op>") that issued it
    reason: str
    ttl_hint: int            # seconds; >= max token TTL

    def __post_init__(self) -> None:
        if self.scope_type not in _VALID_SCOPE_TYPES:
            raise ValueError(
                f"invalid scope_type {self.scope_type!r}; must be one of {sorted(_VALID_SCOPE_TYPES)}"
            )

    def as_event(self) -> Dict[str, object]:
        """The append-only audit event dict (durable ledger line)."""
        return {
            "event": "revocation_ledger",
            "scope_type": self.scope_type,
            "target": self.target,
            "mode": self.mode,
            "not_before": self.not_before,
            "epoch": self.epoch,
            "issued_by": self.issued_by,
            "reason": self.reason,
            "ttl_hint": self.ttl_hint,
        }


@dataclass(frozen=True)
class KillAck:
    """Returned to the operator ONLY AFTER durable-append + hot-SET both commit."""
    committed: bool
    level: str
    epoch: int
    entry: RevocationLedgerEntry


@dataclass(frozen=True)
class KillDecision:
    """The kill-switch verdict for a specific call (level/epoch snapshot + allow)."""
    allowed: bool
    level: str
    epoch: int
    reason: str


# ---------------------------------------------------------------------------
# KillSwitchController — the write path (PLAN §7.2, §7.3).
# ---------------------------------------------------------------------------

# Default ttl_hint: >= the longest token TTL band (T3 SSO max 8h, §4.2) so a JWT
# can never outlive its denylist entry. Callers may shorten for surgical entries.
_DEFAULT_TTL_HINT_S = 8 * 60 * 60 + 600


class KillSwitchController:
    """Orchestrates the graduated kill switch + surgical revocations (PLAN §7.2/§7.3).

    Holds two seams from the frozen foundation:
      * `ledger` — a durable Store (its append-only audit line is the ledger truth);
      * `hot`    — the HotStore hot projection (killswitch {level,epoch}, denylist,
                   and the publish channel shape).

    Every mutation is WRITE-BEFORE-ACK: the durable ledger append happens first, then
    the authoritative hot SET + publish; the KillAck is returned only after BOTH.
    """

    def __init__(self, ledger: Store, hot: HotStore) -> None:
        self._ledger = ledger
        self._hot = hot

    # -- reads -------------------------------------------------------------
    def current(self) -> Tuple[str, int]:
        """(level, epoch) of the global kill switch."""
        return self._hot.killswitch()

    def _next_epoch(self) -> int:
        """Monotonic kill epoch = current + 1 (§7.2 'bumped every change')."""
        _, cur = self._hot.killswitch()
        return cur + 1

    def blocks(self, action_class: str, principal_kind: str = KIND_AGENT) -> KillDecision:
        """Evaluate a call against the CURRENT kill level (§7.2)."""
        level, epoch = self._hot.killswitch()
        denied = killswitch_denies(level, action_class, principal_kind)
        reason = "" if not denied else f"killswitch_{_MODE_FOR_LEVEL[level]}"
        return KillDecision(allowed=not denied, level=level, epoch=epoch, reason=reason)

    # -- graduated global switch (G0/G1/G2) --------------------------------
    def arm(
        self,
        level: str,
        issued_by: str,
        reason: str,
        *,
        automated: bool = False,
        ttl_hint_s: int = _DEFAULT_TTL_HINT_S,
        now: Optional[int] = None,
    ) -> KillAck:
        """Set the graduated kill level (§7.2), write-before-ack (§4.6 finding 3d).

        If `automated=True`, the transition may only move toward LESS real-world
        action (equal or MORE restrictive level); lifting/loosening a kill is
        operator-only and raises here (§7.8).
        """
        if level not in _VALID_LEVELS:
            raise ValueError(f"invalid kill level {level!r}; must be one of {sorted(_VALID_LEVELS)}")

        cur_level, _cur_epoch = self._hot.killswitch()
        if automated and _LEVEL_RESTRICTIVENESS[level] < _LEVEL_RESTRICTIVENESS[cur_level]:
            raise ValueError(
                "automated guardrails may fire ONLY in the safe (stopping) direction "
                f"(§7.8): cannot move from {cur_level} to the less-restrictive {level}. "
                "Only the operator may lift/loosen a kill."
            )

        ts = int(time.time()) if now is None else int(now)
        epoch = self._next_epoch()
        # Monotonic invariant (defensive — _next_epoch guarantees it).
        assert epoch > _cur_epoch, "kill epoch must be strictly monotonic"

        entry = RevocationLedgerEntry(
            scope_type=LEDGER_GLOBAL,
            target="*",
            mode=_MODE_FOR_LEVEL[level],
            not_before=ts,
            epoch=epoch,
            issued_by=issued_by,
            reason=reason,
            ttl_hint=ttl_hint_s,
        )

        # WRITE-BEFORE-ACK: (1) durable ledger append is the truth and commits FIRST.
        self._ledger.append_audit(entry.as_event())
        # (2) authoritative hot SET {level, epoch} + publish delta (§7.3).
        self._hot.set_killswitch(level, epoch)
        # (3) only now — both committed — is the ack returned.
        return KillAck(committed=True, level=level, epoch=epoch, entry=entry)

    # -- surgical / graduated revocations (§7.2 scope_type sub/kid/client) --
    def revoke_principal(
        self,
        sub: str,
        issued_by: str,
        reason: str,
        *,
        ttl_hint_s: int = _DEFAULT_TTL_HINT_S,
        now: Optional[int] = None,
    ) -> KillAck:
        """Principal (agent) kill: deny all of `sub`'s tokens issued before now,
        write-before-ack. Used by break-glass STOP and by the mint-anomaly
        auto-freeze guardrail (§3.6, §7.8) — always the safe direction."""
        ts = int(time.time()) if now is None else int(now)
        # Snapshot pre-write epoch for the ledger line; the hot set bumps the
        # global revocation epoch itself.
        _lvl, cur_kill_epoch = self._hot.killswitch()
        entry = RevocationLedgerEntry(
            scope_type=LEDGER_SUB,
            target=sub,
            mode="revoke",
            not_before=ts,
            epoch=cur_kill_epoch,
            issued_by=issued_by,
            reason=reason,
            ttl_hint=ttl_hint_s,
        )
        self._ledger.append_audit(entry.as_event())          # durable first
        self._hot.set_revoked_before(sub, ts)                 # authoritative SET + publish
        return KillAck(committed=True, level=_lvl, epoch=cur_kill_epoch, entry=entry)

    def retire_signing_key(
        self,
        kid: str,
        issued_by: str,
        reason: str,
        *,
        ttl_hint_s: int = _DEFAULT_TTL_HINT_S,
        now: Optional[int] = None,
    ) -> KillAck:
        """Mass revocation: retire an AS signing `kid` (Redis-independent global
        kill also served via JWKS prune, §7.3). Write-before-ack."""
        ts = int(time.time()) if now is None else int(now)
        _lvl, cur_kill_epoch = self._hot.killswitch()
        entry = RevocationLedgerEntry(
            scope_type=LEDGER_KID,
            target=kid,
            mode="revoke",
            not_before=ts,
            epoch=cur_kill_epoch,
            issued_by=issued_by,
            reason=reason,
            ttl_hint=ttl_hint_s,
        )
        self._ledger.append_audit(entry.as_event())          # durable first
        self._hot.retire_kid(kid)                             # authoritative SET + publish
        return KillAck(committed=True, level=_lvl, epoch=cur_kill_epoch, entry=entry)

    def disable_client(
        self,
        client_id: str,
        issued_by: str,
        reason: str,
        *,
        ttl_hint_s: int = _DEFAULT_TTL_HINT_S,
        now: Optional[int] = None,
    ) -> KillAck:
        """Client/key kill: block re-mint for a `client_id` (§4.6). Write-before-ack.
        Used by the mint-anomaly auto-freeze guardrail (§3.6) — safe direction only."""
        ts = int(time.time()) if now is None else int(now)
        _lvl, cur_kill_epoch = self._hot.killswitch()
        entry = RevocationLedgerEntry(
            scope_type=LEDGER_CLIENT_ID,
            target=client_id,
            mode="revoke",
            not_before=ts,
            epoch=cur_kill_epoch,
            issued_by=issued_by,
            reason=reason,
            ttl_hint=ttl_hint_s,
        )
        self._ledger.append_audit(entry.as_event())          # durable first
        self._hot.disable_client(client_id)                  # authoritative SET + publish
        return KillAck(committed=True, level=_lvl, epoch=cur_kill_epoch, entry=entry)
