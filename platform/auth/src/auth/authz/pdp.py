"""auth.authz.pdp — the central Policy Decision Point (PLAN §5, §5.3).

The PDP answers, for a concrete `(principal, action, resource, context)`:
permit or deny — plus a machine `reason` and the `obligations` the PEP MUST
satisfy for a permit to be valid (§5.3). It is `auth`'s Tier-2 authority for
destructive / SoD-critical / budget-dependent calls.

Load-bearing properties this module implements:

  * IMMUTABLE SoD `forbid` guardrail (PLAN §3.5 guarantee 3): the same compiled-in
    conflict set as auth.core.scopes, applied at USE. `forbid` OVERRIDES `permit` —
    a principal whose effective scopes span any holder ConflictPair is denied
    `dual_holder_forbidden` for EVERY action, catching a hypothetical mis-issued
    dual-scoped token / IdP drift even though grant-time SSD already makes it
    impossible at rest. (Defense in depth — tertiary guardrail.)

  * No-self-approval backstop (PLAN §3.5 finding 5c): on `board:approve` the PDP
    independently re-checks `sub != proposer_id` against the Board-supplied
    proposer via the PIP. A permit from the Board is NOT sufficient if the PDP
    denies — both must permit.

  * FAIL-CLOSED on ANY dependency doubt (decision #3): if the PIP/PIP-context a
    gated decision needs is unavailable, times out, or raises, the only answer is
    DENY (`FailClosed`). High-stakes paths never fail open.

Pure-stdlib and fully runnable here. Live revocation/kill state is read through
the PIP seam, whose reference impl (LocalPIP) is backed by an auth.store HotStore;
the real cross-replica Redis fan-out is CANNOT-VERIFY-HERE (see auth.store.memory_hot).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, FrozenSet, Optional, Protocol, Tuple, runtime_checkable

from ..core import scopes as S
from ..core.principals import KIND_AGENT, KIND_SERVICE
from . import scope_tool_map as STM

# ---------------------------------------------------------------------------
# Machine decision reason codes (PLAN §5.3 / §5.6). A superset of the §5.3 list
# plus the fail-closed / kill codes. NEVER signal an SoD/policy deny as
# insufficient_scope — that would invite the exact scope-widening we forbid.
# ---------------------------------------------------------------------------
PERMIT = "permit"
DUAL_HOLDER_FORBIDDEN = "dual_holder_forbidden"
SELF_APPROVAL_FORBIDDEN = "self_approval_forbidden"
INSUFFICIENT_SCOPE = "insufficient_scope"
REVOKED = "revoked"
KILL_SWITCH_ENGAGED = "kill_switch_engaged"
OUT_OF_WINDOW = "out_of_window"
BUDGET_EXHAUSTED = "budget_exhausted"
COOLDOWN_ACTIVE = "cooldown_active"
APPROVAL_CONSUMED = "approval_consumed"
IN_PROGRESS = "in_progress"
WRONG_PRINCIPAL = "wrong_principal"
FAIL_CLOSED = "fail_closed"

# Default numeric drift bound D (PLAN §5.3 finding 3c): replaces the ambiguous
# decision_ttl=0. At the irreversible instant, if (now - revocation_check_ts) > D
# the PEP MUST re-run the authoritative live check or DENY.
DEFAULT_DRIFT_BOUND_MS = 1000


# ---------------------------------------------------------------------------
# PIP seam (Policy Information Point) — the LIVE facts Cedar/the PDP is stateless
# about (PLAN §5, §5.3): revocation + kill state, cross-app SoD facts (Board
# proposer, ticket state, CMDB window), budget/cooldown. Any method may raise
# PIPUnavailable; the PDP turns that into a FAIL-CLOSED deny.
# ---------------------------------------------------------------------------

class PIPUnavailable(Exception):
    """A live fact the PDP needs could not be read -> the PDP MUST fail closed."""


@runtime_checkable
class PIP(Protocol):
    def killswitch_level(self) -> str:
        """Current graduated kill level G0|G1|G2 (§7.2). Raises PIPUnavailable if unread."""
        ...

    def is_principal_revoked(
        self, sub: str, jti: Optional[str], client_id: Optional[str],
        kid: Optional[str], iat: Optional[int],
    ) -> bool:
        """Live revocation consult across all four granularities (§4.6). Raises
        PIPUnavailable if authoritative revocation state cannot be read
        (introspection is fail-closed against its own dependency loss, finding 2c)."""
        ...

    def ticket_proposer(self, ticket_id: str) -> Optional[str]:
        """Board-supplied proposer_id for the ticket (the SoD fact), or None if unknown."""
        ...

    def ticket_state(self, ticket_id: str) -> Optional[str]:
        """Ticket lifecycle state (e.g. approved|executing|done); None if unknown."""
        ...

    def host_in_window(self, host_id: str) -> bool:
        """CMDB: does policy permit this host in this maintenance window right now?"""
        ...

    def budget_ok(self, sub: str, action_class: str) -> bool:
        """Live budget/concurrency/cooldown admission for (sub, action-class) (§6)."""
        ...


# ---------------------------------------------------------------------------
# Request / decision value objects (PLAN §5.3).
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class PrincipalCtx:
    """The acting principal as the PDP sees it — derived at integration from the
    validated token (sub/client_id/jti/iat/kid) UNION the Store effective closure.

    effective_scopes is the principal's TRANSITIVE scope closure (§3.5 step 1).
    It is passed in (not re-derived here) so the PDP stays a pure decision fn;
    `principal_ctx_from_store` is the convenience wiring for the real Store.
    """
    sub: str
    kind: str
    effective_scopes: FrozenSet[str]
    client_id: Optional[str] = None
    jti: Optional[str] = None
    iat: Optional[int] = None
    kid: Optional[str] = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "effective_scopes", frozenset(self.effective_scopes))


@dataclass(frozen=True)
class Obligation:
    """A duty the PEP MUST discharge for a permit to be valid (§5.3). Unsatisfied
    obligation => the PEP treats the permit as a DENY (fail-closed)."""
    name: str
    params: Dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class PDPRequest:
    principal: PrincipalCtx
    action: str                                  # canonical action id (STM.ACTION_*)
    resource: Dict[str, object] = field(default_factory=dict)
    context: Dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class PDPDecision:
    decision: str                                # PERMIT | "deny"
    reason: str                                  # machine reason code
    obligations: Tuple[Obligation, ...] = ()
    advice: Tuple[str, ...] = ()
    required_scope: Optional[str] = None         # set on insufficient_scope
    drift_bound_ms: int = DEFAULT_DRIFT_BOUND_MS
    trace_id: Optional[str] = None

    @property
    def permitted(self) -> bool:
        return self.decision == PERMIT


def _permit(obligations=(), advice=(), trace_id=None) -> PDPDecision:
    return PDPDecision(PERMIT, PERMIT, tuple(obligations), tuple(advice), trace_id=trace_id)


def _deny(reason: str, required_scope: Optional[str] = None, advice=(), trace_id=None) -> PDPDecision:
    return PDPDecision("deny", reason, (), tuple(advice), required_scope=required_scope, trace_id=trace_id)


# ---------------------------------------------------------------------------
# The PDP.
# ---------------------------------------------------------------------------

class PDP:
    """The central decision point. Stateless over its inputs; live facts come
    through the injected PIP seam. `forbid` overrides `permit`, and any doubt on
    a gated path fails closed."""

    def __init__(self, pip: PIP, *, drift_bound_ms: int = DEFAULT_DRIFT_BOUND_MS) -> None:
        self._pip = pip
        self._drift_bound_ms = drift_bound_ms

    # -- public API --------------------------------------------------------
    def evaluate(self, req: PDPRequest) -> PDPDecision:
        p = req.principal
        trace_id = req.context.get("traceparent") if isinstance(req.context, dict) else None
        trace_id = trace_id if isinstance(trace_id, str) else None

        # === STEP 1 — IMMUTABLE SoD `forbid` guardrail (forbid OVERRIDES permit).
        # Pure, dependency-free: a principal that effectively spans any holder
        # ConflictPair is denied for EVERY action (tertiary guardrail, §3.5 g3).
        conflict = S.find_holder_conflict(p.effective_scopes)
        if conflict is not None:
            return _deny(DUAL_HOLDER_FORBIDDEN, trace_id=trace_id,
                         advice=(f"principal spans forbidden holder pair {sorted(conflict)}",))

        # === STEP 2 — resolve the action to its §5.5 rule. An unknown gated
        # action is unclassified => fail closed (§4.7 default).
        rule = STM.rule_for_action(req.action)
        if rule is None:
            return _deny(FAIL_CLOSED, trace_id=trace_id,
                         advice=(f"unknown/unclassified PDP action {req.action!r} -> fail closed",))

        # === STEP 3 — the permit precondition: principal must actually carry the
        # coarse scope this action requires. Missing => insufficient_scope (a
        # PDP re-check of the PEP's Tier-1 gate).
        missing = rule.required_scopes - p.effective_scopes
        if missing:
            return _deny(INSUFFICIENT_SCOPE, required_scope=sorted(missing)[0], trace_id=trace_id)

        # === STEP 4 — everything below needs LIVE facts. FAIL CLOSED on any
        # dependency doubt (decision #3): a raised PIPUnavailable, a timeout, or
        # any unexpected error => DENY. This is the whole "fail-closed on
        # dependency loss" property for the destructive/SoD plane.
        try:
            return self._evaluate_gated(req, rule, trace_id)
        except PIPUnavailable as e:
            return _deny(FAIL_CLOSED, trace_id=trace_id, advice=(f"PIP unavailable: {e}",))
        except Exception as e:  # noqa: BLE001 — fail-closed on ANY doubt (decision #3)
            return _deny(FAIL_CLOSED, trace_id=trace_id, advice=(f"PDP dependency error: {e}",))

    # -- gated evaluation (needs live PIP facts) ---------------------------
    def _evaluate_gated(self, req: PDPRequest, rule: STM.ToolRule, trace_id) -> PDPDecision:
        p = req.principal

        # (a) Global kill switch (§7.2). Read live; PIPUnavailable => fail closed.
        level = self._pip.killswitch_level()
        if level == "G2" and p.kind in (KIND_AGENT, KIND_SERVICE):
            return _deny(KILL_SWITCH_ENGAGED, trace_id=trace_id,
                         advice=("G2 quiesce-all: agent/service tokens denied",))
        if level == "G1" and rule.action_class == STM.CLASS_DESTRUCTIVE:
            return _deny(KILL_SWITCH_ENGAGED, trace_id=trace_id,
                         advice=("G1 freeze-destructive: the hands are frozen",))

        # (b) LIVE revocation consult (§4.6) — every gated call, never cached on
        # destructive paths. Revoked => deny (NOT insufficient_scope).
        if self._pip.is_principal_revoked(p.sub, p.jti, p.client_id, p.kid, p.iat):
            return _deny(REVOKED, trace_id=trace_id)

        # (c) Action-specific policy.
        if req.action == STM.ACTION_BOARD_APPROVE:
            return self._decide_approve(req, trace_id)
        if req.action == STM.ACTION_CMDB_WRITE_POLICY:
            return self._decide_write_policy(req, trace_id)
        if req.action == STM.ACTION_GATEWAY_EXECUTE:
            return self._decide_execute(req, trace_id)
        if req.action == STM.ACTION_VAULT_REDEEM:
            return self._decide_redeem(req, trace_id)
        if req.action == STM.ACTION_BOARD_CLAIM:
            return self._decide_claim(req, trace_id)
        if req.action == STM.ACTION_MC_KILL_SWITCH:
            return self._decide_kill_switch(req, trace_id)

        # Any other gated action that passed scope + rev + kill: fail closed
        # rather than silently permit an un-modelled destructive path.
        return _deny(FAIL_CLOSED, trace_id=trace_id,
                     advice=(f"no policy branch for gated action {req.action!r}",))

    # -- board:approve — the no-self-approval backstop (§3.5 finding 5c) ----
    def _decide_approve(self, req: PDPRequest, trace_id) -> PDPDecision:
        p = req.principal
        ticket_id = _require_str(req.resource, "ticket_id", "board.approve")
        # proposer_id: prefer the Board-supplied value on the resource, else ask
        # the PIP. If it cannot be established, we CANNOT verify sub != proposer
        # -> fail closed (never permit an approval we cannot prove isn't a self-approval).
        proposer = req.resource.get("proposer_id")
        if not isinstance(proposer, str):
            proposer = self._pip.ticket_proposer(ticket_id)
        if not isinstance(proposer, str) or not proposer:
            raise PIPUnavailable(f"proposer_id for ticket {ticket_id!r} is unavailable")
        # THE backstop: an agent/operator may never approve its own proposal.
        if proposer == p.sub:
            return _deny(SELF_APPROVAL_FORBIDDEN, trace_id=trace_id,
                         advice=("sub == proposer_id: four-eyes requires a distinct approver",))
        return _permit(
            obligations=(
                Obligation("record_audit", {"action": req.action, "ticket_id": ticket_id}),
                Obligation("revocation_fresh_at", {"drift_bound_ms": self._drift_bound_ms}),
            ),
            trace_id=trace_id,
        )

    # -- cmdb:write-policy (HOLDER; SSD-excluded; revocation-fresh) ---------
    def _decide_write_policy(self, req: PDPRequest, trace_id) -> PDPDecision:
        # cmdb:write-policy is operator-authored fleet/maintenance-window policy —
        # human-identity only (PLAN §3.5 table). Backstop the grant-time kind
        # restriction here the same way _decide_kill_switch / _decide_redeem do, so
        # a mis-granted agent/service is DENIED at USE even if it somehow carried
        # the scope (defence in depth vs a single mis-configuring operator).
        if req.principal.kind in (KIND_AGENT, KIND_SERVICE):
            return _deny(WRONG_PRINCIPAL, trace_id=trace_id,
                         advice=("cmdb:write-policy is operator-identity only",))
        return _permit(
            obligations=(
                Obligation("record_audit", {"action": req.action}),
                Obligation("revocation_fresh_at", {"drift_bound_ms": self._drift_bound_ms}),
            ),
            trace_id=trace_id,
        )

    # -- gateway:execute (single-use approval, fencing, live rev, budget) ---
    def _decide_execute(self, req: PDPRequest, trace_id) -> PDPDecision:
        p = req.principal
        ticket_id = _require_str(req.resource, "ticket_id", "gateway.execute")
        host_id = _require_str(req.resource, "host_id", "gateway.execute")

        # Single-use approval (§5.3 finding 1e): permit ONLY while the ticket is
        # in the executable state. A consumed ticket is terminally denied.
        state = self._pip.ticket_state(ticket_id)
        if state is None:
            raise PIPUnavailable(f"ticket_state for {ticket_id!r} is unavailable")
        if state not in ("approved", "executable"):
            return _deny(APPROVAL_CONSUMED, trace_id=trace_id,
                         advice=(f"ticket {ticket_id!r} is in state {state!r}, not executable",))

        # CMDB must permit this host in this window right now.
        if not self._pip.host_in_window(host_id):
            return _deny(OUT_OF_WINDOW, trace_id=trace_id)

        # Live budget / concurrency admission.
        if not self._pip.budget_ok(p.sub, req_action_class(req.action)):
            return _deny(BUDGET_EXHAUSTED, trace_id=trace_id)

        # PERMIT with the full destructive obligation set (§5.3): admission claim,
        # host mutex + fencing token, single-use consume_approval, numeric drift
        # bound revocation-fresh, idempotency, audit.
        idem = req.context.get("idempotency_key")
        return _permit(
            obligations=(
                Obligation("admission_claim", {"idempotency_key": idem}),
                Obligation("acquire_host_mutex", {"host_id": host_id}),
                Obligation("fencing_token", {"host_id": host_id}),
                Obligation("consume_approval", {"ticket_id": ticket_id}),
                Obligation("revocation_fresh_at", {"drift_bound_ms": self._drift_bound_ms}),
                Obligation("enforce_idempotency", {"idempotency_key": idem}),
                Obligation("record_audit", {"action": req.action, "ticket_id": ticket_id, "host_id": host_id}),
            ),
            trace_id=trace_id,
        )

    # -- vault:redeem (Gateway principal ONLY; approved ticket; never cached) --
    def _decide_redeem(self, req: PDPRequest, trace_id) -> PDPDecision:
        p = req.principal
        # Vault redemption is the Gateway's machine capability only — an agent
        # principal must never reach it (structurally unassignable, §5.4). Enforce
        # kind=service here as the PDP backstop.
        if p.kind != KIND_SERVICE:
            return _deny(WRONG_PRINCIPAL, trace_id=trace_id,
                         advice=("vault:read-credential is the svc:gateway machine scope only",))
        ticket_id = _require_str(req.resource, "ticket_id", "vault.redeem")
        state = self._pip.ticket_state(ticket_id)
        if state is None:
            raise PIPUnavailable(f"ticket_state for {ticket_id!r} is unavailable")
        if state not in ("approved", "executable", "executing"):
            return _deny(APPROVAL_CONSUMED, trace_id=trace_id,
                         advice=(f"no approved ticket for redeem; state={state!r}",))
        return _permit(
            obligations=(
                Obligation("revocation_fresh_at", {"drift_bound_ms": self._drift_bound_ms}),
                Obligation("record_audit", {"action": req.action, "ticket_id": ticket_id}),
            ),
            trace_id=trace_id,
        )

    # -- board:claim (concurrency/WIP + cooldown) --------------------------
    def _decide_claim(self, req: PDPRequest, trace_id) -> PDPDecision:
        p = req.principal
        if not self._pip.budget_ok(p.sub, req_action_class(req.action)):
            return _deny(BUDGET_EXHAUSTED, trace_id=trace_id)
        return _permit(
            obligations=(
                Obligation("acquire_host_mutex", {"resource": req.resource.get("resource_id")}),
                Obligation("record_audit", {"action": req.action}),
            ),
            trace_id=trace_id,
        )

    # -- mc:kill-switch (operator identity only) ---------------------------
    def _decide_kill_switch(self, req: PDPRequest, trace_id) -> PDPDecision:
        # Kill switch actuation is human-only; an agent/service principal is
        # denied even holding the scope (defence in depth vs mis-grant).
        if req.principal.kind in (KIND_AGENT, KIND_SERVICE):
            return _deny(WRONG_PRINCIPAL, trace_id=trace_id,
                         advice=("mc:kill-switch is operator-identity only",))
        return _permit(
            obligations=(Obligation("record_audit", {"action": req.action}),),
            trace_id=trace_id,
        )


# ---------------------------------------------------------------------------
# LocalPIP — the reference PIP impl (runnable HERE).
#
# Live revocation + kill state come from an auth.store HotStore (MemoryHotStore
# now, replicated Redis in prod). Cross-app SoD facts (Board proposer / ticket
# state, CMDB window) and budget admission are supplied as explicit maps — in
# production these fan out to the real Board / CMDB PIP and the Redis budget
# counters (CANNOT-VERIFY-HERE: the cross-replica fan-out; see memory_hot.py).
# A HotStore read that raises is surfaced as PIPUnavailable so the PDP fails closed.
# ---------------------------------------------------------------------------

class LocalPIP:
    """Reference Policy Information Point backed by a HotStore + explicit facts."""

    def __init__(self, hot, *, proposers=None, ticket_states=None,
                 windows=None, budgets=None) -> None:
        self._hot = hot
        self._proposers: Dict[str, str] = dict(proposers or {})
        self._ticket_states: Dict[str, str] = dict(ticket_states or {})
        self._windows: Dict[str, bool] = dict(windows or {})
        # budgets: {(sub, action_class): bool} and/or {sub: bool}; default allow.
        self._budgets: Dict[object, bool] = dict(budgets or {})

    def killswitch_level(self) -> str:
        try:
            level, _epoch = self._hot.killswitch()
            return level
        except Exception as e:  # noqa: BLE001
            raise PIPUnavailable(f"killswitch unreadable: {e}")

    def is_principal_revoked(self, sub, jti, client_id, kid, iat) -> bool:
        try:
            if jti and self._hot.is_jti_denied(jti):
                return True
            if client_id and self._hot.is_client_disabled(client_id):
                return True
            if kid and self._hot.is_kid_retired(kid):
                return True
            rb = self._hot.revoked_before(sub)
            if rb is not None and iat is not None and iat < rb:
                return True
            return False
        except Exception as e:  # noqa: BLE001
            raise PIPUnavailable(f"revocation state unreadable: {e}")

    def ticket_proposer(self, ticket_id: str) -> Optional[str]:
        return self._proposers.get(ticket_id)

    def ticket_state(self, ticket_id: str) -> Optional[str]:
        return self._ticket_states.get(ticket_id)

    def host_in_window(self, host_id: str) -> bool:
        return bool(self._windows.get(host_id, False))

    def budget_ok(self, sub: str, action_class: str) -> bool:
        if (sub, action_class) in self._budgets:
            return self._budgets[(sub, action_class)]
        return self._budgets.get(sub, True)


# ---------------------------------------------------------------------------
# Helpers.
# ---------------------------------------------------------------------------

def req_action_class(action_id: str) -> str:
    rule = STM.rule_for_action(action_id)
    return rule.action_class if rule else STM.CLASS_DESTRUCTIVE


def _require_str(d: Dict[str, object], key: str, where: str) -> str:
    v = d.get(key)
    if not isinstance(v, str) or not v:
        # A missing required resource field on a gated path is a doubt -> fail closed.
        raise PIPUnavailable(f"{where}: required resource field {key!r} missing/blank")
    return v


def principal_ctx_from_store(store, sub: str, *, jti: Optional[str] = None,
                             client_id: Optional[str] = None, iat: Optional[int] = None,
                             kid: Optional[str] = None) -> PrincipalCtx:
    """Build a PrincipalCtx from an auth.store Store (the real integration wiring).

    Reads the principal's kind and its TRANSITIVE effective scope closure from the
    durable Store — the same closure the grant-time SSD check runs over — so the
    PDP evaluates the exact authority the principal holds at rest.
    """
    from ..core.errors import UnknownPrincipal

    principal = store.get_principal(sub)
    if principal is None:
        raise UnknownPrincipal(sub)
    return PrincipalCtx(
        sub=sub,
        kind=principal.kind,
        effective_scopes=store.effective_scopes(sub),
        client_id=client_id if client_id is not None else principal.client_id,
        jti=jti,
        iat=iat,
        kid=kid,
    )
