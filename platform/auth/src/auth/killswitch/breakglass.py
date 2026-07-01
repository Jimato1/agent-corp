"""auth.killswitch.breakglass — operator break-glass: STOP + RESTORE ONLY (PLAN §7.7).

Break-glass exists so the human operator regains and retains control when `auth`
itself is degraded/compromised — above all, the ability to STOP. Its defining
constraint (PLAN §3.4, §7.7): **it must never become an approve-plus-execute bypass
of SoD.** That is guaranteed STRUCTURALLY here, not by prose:

  * `role:break-glass` holds only the allowed governance ○ pair plus STOP/RESTORE
    control-plane scopes and **NO action-side holder scope** (`gateway:execute`,
    `vault:read-credential`). `BREAK_GLASS_SCOPES` is asserted disjoint from
    `auth.core.scopes.ACTION_SIDE` at module load — a build failure if ever violated.
  * There is deliberately NO method on this controller to execute, to redeem a
    credential, or to relax the approve/execute SoD invariant. That absence IS the
    guarantee (`relaxing_sod_is_a_capability()` returns a hardcoded False, and
    `breakglass_can_cause_action()` returns a hardcoded False).
  * Any attempt to route an action-side operation through break-glass is refused
    with `BreakGlassScopeForbidden`.

Every invocation is offline-factor-gated, single-use, time-boxed / auto-revoked, and
loud: an append-only audit line, a Chat broadcast shape, and an auto-filed
`needs_review` ticket shape (§7.7). The STOP direction is never gated behind a second
person (stopping is always the safe direction); the RESTORE direction is always
marked review_required.

CANNOT-VERIFY-HERE (operator/CI closes these):
  * The real offline factor is a pre-provisioned hardware key / offline credential
    held physically — NOT in Vault (§7.7). Here it is a pluggable verifier; the
    default checks a non-empty pre-shared secret so all session/single-use/expiry
    LOGIC runs green. Close the real hardware-key path with the Stage-7 human-halt
    drill:
        cd platform/auth && python -m pytest tests/integration/test_breakglass_hw.py
  * The Chat broadcast + Board needs_review fan-out cross app boundaries; here the
    SHAPES are produced and durably audited. Integration wires the real emit.
"""
from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Callable, Dict, List, Optional

from auth.core import scopes as S
from auth.core.errors import AuthError
from auth.core.interfaces import HotStore, Store
from auth.core.principals import KIND_BREAK_GLASS
from auth.core.scopes import (
    AUTH_MANAGE_IDENTITY,
    BOARD_APPROVE,
    CMDB_WRITE_POLICY,
    MC_KILL_SWITCH,
)

from .killswitch import KILL_G1, KILL_G2, KillSwitchController

__all__ = [
    "DIRECTION_STOP",
    "DIRECTION_RESTORE",
    "OP_ENGAGE_KILL",
    "OP_REVOKE_PRINCIPAL",
    "OP_DISABLE_AGENT",
    "OP_HALT_GATEWAY",
    "OP_LIFT_KILL",
    "OP_REENABLE_AGENT",
    "OP_RESTORE_APPROVER_SEAT",
    "OP_RESTORE_IDENTITY",
    "STOP_OPERATIONS",
    "RESTORE_OPERATIONS",
    "BREAK_GLASS_SCOPES",
    "BreakGlassError",
    "BreakGlassAuthError",
    "BreakGlassScopeForbidden",
    "BreakGlassConsumed",
    "BreakGlassExpired",
    "BreakGlassSession",
    "BreakGlassRecord",
    "BreakGlassController",
    "breakglass_can_cause_action",
    "relaxing_sod_is_a_capability",
    "assert_break_glass_holds_no_action_side",
]


# ---------------------------------------------------------------------------
# The break-glass capability set (PLAN §3.4) — control-plane STOP/RESTORE only.
# ---------------------------------------------------------------------------

# The operator control-plane superset for the STOP + RESTORE directions ONLY
# (PLAN §3.4). This is the allowed governance ○ pair {board:approve,
# cmdb:write-policy} plus kill-switch + identity control. It holds NO action-side
# holder scope, so break-glass can never itself execute or redeem a credential.
BREAK_GLASS_SCOPES = frozenset(
    {AUTH_MANAGE_IDENTITY, MC_KILL_SWITCH, BOARD_APPROVE, CMDB_WRITE_POLICY}
)

# STRUCTURAL INVARIANT (asserted at import, PLAN §3.4/§7.7): break-glass holds NO
# action-side holder scope. If this ever fails, it is a BUILD FAILURE, not a warning.
assert BREAK_GLASS_SCOPES.isdisjoint(S.ACTION_SIDE), (
    "STRUCTURAL SoD VIOLATION: break-glass scope set overlaps the action side "
    f"{sorted(S.ACTION_SIDE)} — break-glass must NEVER hold gateway:execute or "
    "vault:read-credential (PLAN §3.4, findings 5a/4f)."
)


def assert_break_glass_holds_no_action_side(scopes) -> None:
    """Raise BreakGlassScopeForbidden if `scopes` contains ANY action-side holder
    scope. The structural guarantee that break-glass can never act (PLAN §7.7)."""
    offending = frozenset(scopes) & S.ACTION_SIDE
    if offending:
        raise BreakGlassScopeForbidden(
            f"break-glass may NEVER hold an action-side holder scope; refused {sorted(offending)} "
            "(PLAN §3.4/§7.7 — break-glass is confined to STOP + RESTORE)"
        )


def breakglass_can_cause_action() -> bool:
    """The VISIBLE-ABSENCE fact (PLAN §7.7): break-glass can NEVER itself cause an
    executed destructive action or a credential redemption. Hardcoded False — there
    is no code path that returns True."""
    return False


def relaxing_sod_is_a_capability() -> bool:
    """The VISIBLE-ABSENCE fact (PLAN §3.5/§7.7): relaxing the approve/execute SoD
    invariant is NOT a capability that break-glass (or any online path) has. The
    four holder ConflictPairs are compiled-in and immutable (auth.core.scopes);
    there is deliberately no method here to loosen them. Hardcoded False."""
    return False


# ---------------------------------------------------------------------------
# Directions + operations (PLAN §7.7 table).
# ---------------------------------------------------------------------------

DIRECTION_STOP = "stop"        # always toward LESS action — unrestricted, fail-safe
DIRECTION_RESTORE = "restore"  # toward MORE availability — allowed but logged + reviewed

# STOP operations (always safe direction; never gated behind a second person).
OP_ENGAGE_KILL = "engage_kill"            # arm G1/G2
OP_REVOKE_PRINCIPAL = "revoke_principal"  # revoke a principal / key
OP_DISABLE_AGENT = "disable_agent"        # disable an agent (block re-mint)
OP_HALT_GATEWAY = "halt_gateway"          # signal the Gateway local kill flag

# RESTORE operations (restore availability; hold NO execute/redeem scope).
OP_LIFT_KILL = "lift_kill"                        # lower the kill level (operator only)
OP_REENABLE_AGENT = "reenable_agent"
OP_RESTORE_APPROVER_SEAT = "restore_approver_seat"
OP_RESTORE_IDENTITY = "restore_identity"

STOP_OPERATIONS = frozenset(
    {OP_ENGAGE_KILL, OP_REVOKE_PRINCIPAL, OP_DISABLE_AGENT, OP_HALT_GATEWAY}
)
RESTORE_OPERATIONS = frozenset(
    {OP_LIFT_KILL, OP_REENABLE_AGENT, OP_RESTORE_APPROVER_SEAT, OP_RESTORE_IDENTITY}
)

# Pseudo-operations that MUST NEVER be reachable through break-glass. Naming them
# here lets the structural refusal be explicit and testable.
_FORBIDDEN_ACTION_OPERATIONS = frozenset(
    {S.GATEWAY_EXECUTE, S.VAULT_READ_CREDENTIAL, "execute", "redeem", "execute_plan", "redeem_handle"}
)

_DEFAULT_TTL_S = 300  # single-use factor is time-boxed; auto-revoked after this.


# ---------------------------------------------------------------------------
# Errors (break-glass specific; subclass the frozen AuthError base).
# ---------------------------------------------------------------------------

class BreakGlassError(AuthError):
    """Base for break-glass errors."""


class BreakGlassAuthError(BreakGlassError):
    """The offline factor was missing/invalid — break-glass authority is reachable
    ONLY through the pre-provisioned offline factor (PLAN §7.7)."""


class BreakGlassScopeForbidden(BreakGlassError):
    """An action-side / execute / redeem operation was routed through break-glass.
    Structurally refused — break-glass holds NO action-side holder scope (PLAN §7.7)."""


class BreakGlassConsumed(BreakGlassError):
    """A single-use break-glass session was exercised more than once (PLAN §7.7)."""


class BreakGlassExpired(BreakGlassError):
    """A time-boxed break-glass session was used after its auto-revoke deadline."""


# ---------------------------------------------------------------------------
# Records / shapes (loud audit + broadcast + needs_review, PLAN §7.7).
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class BreakGlassRecord:
    """The outcome of one exercised break-glass operation — loud by design.

    Carries the three §7.7 artifacts: the durable `audit` line (also append-only
    committed to the ledger), the Chat `broadcast` shape, and the auto-filed Board
    `needs_review` shape. `enacted` = whether the safe-direction effect was applied;
    `review_required` = whether a post-hoc human review gate attaches (always True for
    RESTORE; False for STOP — stopping is never gated behind a second person)."""
    invocation_id: str
    direction: str
    operation: str
    invoked_by: str
    enacted: bool
    review_required: bool
    audit: Dict[str, object]
    broadcast: Dict[str, object]
    needs_review: Dict[str, object]


def _default_offline_verifier(offline_factor: object) -> bool:
    """Substitute offline-factor check (CANNOT-VERIFY-HERE — real one is a hardware
    key held physically, §7.7). Accepts any non-empty factor so the session/single-
    use/expiry LOGIC is fully exercisable here. The real verifier is injected."""
    return bool(offline_factor)


class BreakGlassSession:
    """A single-use, time-boxed authorization obtained via the offline factor.

    One session authorizes exactly ONE control-plane operation (single-use, §7.7).
    A second `.stop()`/`.restore()` raises BreakGlassConsumed; using it past its
    deadline raises BreakGlassExpired (and auto-revokes)."""

    def __init__(
        self,
        controller: "BreakGlassController",
        invoked_by: str,
        issued_at: int,
        expires_at: int,
    ) -> None:
        self.id = f"bg:{uuid.uuid4().hex[:12]}"
        self.invoked_by = invoked_by
        self.issued_at = issued_at
        self.expires_at = expires_at
        self.single_use = True
        self._used = False
        self._auto_revoked = False
        self._controller = controller

    # -- lifecycle ---------------------------------------------------------
    def is_expired(self, now: Optional[int] = None) -> bool:
        ts = int(time.time()) if now is None else int(now)
        return ts >= self.expires_at

    @property
    def used(self) -> bool:
        return self._used

    @property
    def auto_revoked(self) -> bool:
        return self._auto_revoked

    def _check_usable(self, now: Optional[int]) -> None:
        if self._used:
            raise BreakGlassConsumed(
                f"break-glass session {self.id} is single-use and was already exercised (§7.7)"
            )
        if self.is_expired(now):
            self._auto_revoked = True
            raise BreakGlassExpired(
                f"break-glass session {self.id} expired at {self.expires_at} (auto-revoked, §7.7)"
            )

    # -- STOP (safe direction, unrestricted) -------------------------------
    def stop(
        self,
        operation: str,
        reason: str,
        *,
        kill_level: str = KILL_G2,
        target: Optional[str] = None,
        now: Optional[int] = None,
    ) -> BreakGlassRecord:
        """Exercise a STOP operation (engage kill / revoke / disable / halt). Always
        toward LESS action; never gated behind a second person (§7.7)."""
        self._check_usable(now)
        if operation in _FORBIDDEN_ACTION_OPERATIONS or operation not in STOP_OPERATIONS:
            # Route an execute/redeem (or any non-STOP op) through STOP -> refuse.
            _refuse_if_action_side(operation)
            raise BreakGlassScopeForbidden(
                f"{operation!r} is not a break-glass STOP operation; allowed: {sorted(STOP_OPERATIONS)}"
            )
        rec = self._controller._enact_stop(
            self, operation=operation, reason=reason, kill_level=kill_level, target=target, now=now
        )
        self._used = True
        return rec

    # -- RESTORE (availability direction, logged + reviewed) ---------------
    def restore(
        self,
        operation: str,
        reason: str,
        *,
        target: Optional[str] = None,
        now: Optional[int] = None,
    ) -> BreakGlassRecord:
        """Exercise a RESTORE operation (lift kill / re-enable / restore seat). Holds
        NO execute/redeem scope; always marked review_required and auto-files a
        needs_review ticket (§7.7)."""
        self._check_usable(now)
        if operation in _FORBIDDEN_ACTION_OPERATIONS or operation not in RESTORE_OPERATIONS:
            _refuse_if_action_side(operation)
            raise BreakGlassScopeForbidden(
                f"{operation!r} is not a break-glass RESTORE operation; allowed: "
                f"{sorted(RESTORE_OPERATIONS)}"
            )
        rec = self._controller._enact_restore(
            self, operation=operation, reason=reason, target=target, now=now
        )
        self._used = True
        return rec


def _refuse_if_action_side(operation: str) -> None:
    """If `operation` names an action-side scope/effect, refuse structurally."""
    if operation in _FORBIDDEN_ACTION_OPERATIONS:
        raise BreakGlassScopeForbidden(
            f"break-glass can NEVER cause {operation!r} — it holds no action-side holder "
            "scope (PLAN §3.4/§7.7). Execution still requires a distinct approver + the "
            "independent Gateway (Board+CMDB+Vault) chain."
        )


# ---------------------------------------------------------------------------
# Controller (PLAN §7.7).
# ---------------------------------------------------------------------------

class BreakGlassController:
    """Offline-factor-gated STOP/RESTORE controller (PLAN §7.7).

    `begin()` verifies the offline factor and issues a single-use, time-boxed
    session. STOP operations are enacted immediately in the safe direction (via the
    KillSwitchController); RESTORE operations are enacted-with-review and always file
    a needs_review ticket. There is deliberately NO execute/redeem/relax-SoD method.
    """

    def __init__(
        self,
        ledger: Store,
        hot: HotStore,
        killswitch: Optional[KillSwitchController] = None,
        verify_offline_factor: Optional[Callable[[object], bool]] = None,
    ) -> None:
        self._ledger = ledger
        self._hot = hot
        self._ks = killswitch or KillSwitchController(ledger, hot)
        self._verify = verify_offline_factor or _default_offline_verifier
        self._broadcasts: List[Dict[str, object]] = []
        self._needs_review: List[Dict[str, object]] = []

    # -- test/inspection surfaces -----------------------------------------
    def drain_broadcasts(self) -> List[Dict[str, object]]:
        out = list(self._broadcasts)
        self._broadcasts.clear()
        return out

    def drain_needs_review(self) -> List[Dict[str, object]]:
        out = list(self._needs_review)
        self._needs_review.clear()
        return out

    # -- session issuance --------------------------------------------------
    def begin(
        self,
        offline_factor: object,
        invoked_by: str,
        *,
        ttl_s: int = _DEFAULT_TTL_S,
        now: Optional[int] = None,
    ) -> BreakGlassSession:
        """Verify the offline factor and issue a single-use, time-boxed session.

        The factor is the ONLY path to break-glass authority (a break_glass principal
        is never issuable an online token, §3.5). An invalid/empty factor raises."""
        if not self._verify(offline_factor):
            raise BreakGlassAuthError(
                "break-glass offline factor missing/invalid — authority is reachable "
                "ONLY via the pre-provisioned offline factor (PLAN §7.7)"
            )
        ts = int(time.time()) if now is None else int(now)
        return BreakGlassSession(self, invoked_by=invoked_by, issued_at=ts, expires_at=ts + int(ttl_s))

    # -- enactment (called by the session) --------------------------------
    def _enact_stop(
        self,
        session: BreakGlassSession,
        *,
        operation: str,
        reason: str,
        kill_level: str,
        target: Optional[str],
        now: Optional[int],
    ) -> BreakGlassRecord:
        # Belt-and-braces: the safe-direction path can never touch the action side.
        _refuse_if_action_side(operation)
        issued_by = f"break-glass:{session.invoked_by}"

        enacted = True
        if operation == OP_ENGAGE_KILL:
            if kill_level not in (KILL_G1, KILL_G2):
                raise ValueError("break-glass engage_kill requires kill_level G1 or G2")
            # Operator-initiated break-glass STOP (NOT an automated guardrail).
            self._ks.arm(kill_level, issued_by=issued_by, reason=reason, now=now)
        elif operation == OP_REVOKE_PRINCIPAL:
            if not target:
                raise ValueError("revoke_principal requires target=<sub>")
            self._ks.revoke_principal(target, issued_by=issued_by, reason=reason, now=now)
        elif operation == OP_DISABLE_AGENT:
            if not target:
                raise ValueError("disable_agent requires target=<client_id>")
            self._ks.disable_client(target, issued_by=issued_by, reason=reason, now=now)
        elif operation == OP_HALT_GATEWAY:
            # The physical bite lives at the Gateway (§7.1); here we raise the kill
            # posture to G1 so the identity plane also freezes destructive suite-wide.
            self._ks.arm(KILL_G1, issued_by=issued_by, reason=reason, now=now)
        else:  # pragma: no cover - guarded by the session
            raise BreakGlassScopeForbidden(f"unknown STOP operation {operation!r}")

        return self._finish(
            session,
            direction=DIRECTION_STOP,
            operation=operation,
            reason=reason,
            target=target,
            enacted=enacted,
            review_required=False,  # stopping is never gated behind a second person
            now=now,
        )

    def _enact_restore(
        self,
        session: BreakGlassSession,
        *,
        operation: str,
        reason: str,
        target: Optional[str],
        now: Optional[int],
    ) -> BreakGlassRecord:
        _refuse_if_action_side(operation)
        # RESTORE holds NO execute/redeem scope: it restores a NORMAL approver seat /
        # re-enables an agent / lifts a kill. It never itself acts on a host, and it
        # is ALWAYS logged + review_required (§7.7). We intentionally record the
        # restore intent as LOGGED rather than silently mutating downstream identity
        # state (that enactment is the Core API's audited job); break-glass's role is
        # to authorize + broadcast + file the review.
        return self._finish(
            session,
            direction=DIRECTION_RESTORE,
            operation=operation,
            reason=reason,
            target=target,
            enacted=False,           # logged intent; downstream enactment is audited separately
            review_required=True,    # RESTORE is always logged + reviewed
            now=now,
        )

    # -- the loud artifacts (audit + broadcast + needs_review) -------------
    def _finish(
        self,
        session: BreakGlassSession,
        *,
        direction: str,
        operation: str,
        reason: str,
        target: Optional[str],
        enacted: bool,
        review_required: bool,
        now: Optional[int],
    ) -> BreakGlassRecord:
        ts = int(time.time()) if now is None else int(now)
        base = {
            "invocation_id": session.id,
            "invoked_by": session.invoked_by,
            "principal_kind": KIND_BREAK_GLASS,
            "direction": direction,
            "operation": operation,
            "target": target,
            "reason": reason,
            "ts": ts,
        }

        # (1) Append-only durable audit line — loud by design (§7.7).
        audit = dict(base)
        audit["event"] = "break_glass"
        audit["enacted"] = enacted
        audit["review_required"] = review_required
        audit["holds_action_side_scope"] = False  # structural fact, always False
        self._ledger.append_audit(audit)

        # (2) Chat broadcast shape (operator feed — loud/visible).
        broadcast = dict(base)
        broadcast["channel"] = "operator"
        broadcast["kind"] = "broadcast"
        broadcast["message"] = (
            f"BREAK-GLASS {direction.upper()} '{operation}' by {session.invoked_by}: {reason}"
        )
        self._broadcasts.append(broadcast)

        # (3) Auto-filed Board needs_review ticket shape (mandatory post-hoc, §7.7).
        needs_review = dict(base)
        needs_review["kind"] = "needs_review"
        needs_review["status"] = "awaiting_review"
        needs_review["title"] = f"[break-glass] {direction} {operation} by {session.invoked_by}"
        self._needs_review.append(needs_review)

        return BreakGlassRecord(
            invocation_id=session.id,
            direction=direction,
            operation=operation,
            invoked_by=session.invoked_by,
            enacted=enacted,
            review_required=review_required,
            audit=audit,
            broadcast=broadcast,
            needs_review=needs_review,
        )
