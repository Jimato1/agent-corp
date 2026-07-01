"""auth.mcp.surface — the four thin agent MCP tools (PLAN §9.2, Surface B).

These tools are the ONLY MCP surface an agent has on `auth`. Every one of them is
read-only and self-only; the acting principal is FORCED to the authenticated
caller and can never be redirected at another principal. There is deliberately NO
mint / grant / revoke / budget-edit tool on this surface — an agent widening its
own scope or budget would be self-escalation, forbidden by decision #4 and §3.5.

Design (per the build brief): tools are callables taking a *validated
caller-identity* + args and returning structured results. The caller-identity is
derived from the agent's already-PEP-validated access token to `aud=auth`
(auth.core.tokens_model.AccessTokenClaims). This surface re-asserts the two
gating invariants itself (never trusting that some upstream did it):
  * the token's aud MUST be the auth RS (audience-bound to `auth`), and
  * the token MUST carry the `auth:self` surface scope.

Only the frozen foundation is imported (auth.core / auth.store contracts + stdlib).
The Store/HotStore are consumed through READ methods only; no writer is called.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Callable, Dict, FrozenSet, List, Optional

from ..core import scopes as S
from ..core.errors import AuthError, UnknownPrincipal
from ..core.interfaces import HotStore, Store
from ..core.principals import (
    KIND_AGENT,
    KIND_BREAK_GLASS,
    KIND_HUMAN,
    KIND_SERVICE,
    BudgetPolicy,
    Principal,
)
from ..core.tokens_model import (
    PRINCIPAL_TYPE_AGENT,
    PRINCIPAL_TYPE_HUMAN,
    AccessTokenClaims,
)

# ---------------------------------------------------------------------------
# Surface constants (PLAN §9.2). The MCP tools are themselves scoped `auth:self`
# and audience-bound to `auth`. `auth:self` is the MCP-surface session marker for
# self-service tools — deliberately NOT a grantable RBAC capability in the
# canonical taxonomy (auth.core.scopes), so it can never widen a principal's
# effective closure; it merely gates reaching these read/self tools.
# ---------------------------------------------------------------------------

AUTH_SELF_SCOPE = "auth:self"
AUTH_SURFACE_AUDIENCE = "auth"

TOOL_NAMES = ("whoami", "authorize_check", "introspect_self", "budget_self")

# Any of these argument keys is an attempt to name a principal. On this surface
# the principal is ALWAYS the caller, so a value that differs from the caller is
# refused (never silently honored). This is the load-bearing "forced to caller".
_PRINCIPAL_ARG_KEYS: FrozenSet[str] = frozenset(
    {
        "principal",
        "sub",
        "subject",
        "target",
        "target_sub",
        "on_behalf_of",
        "for_sub",
        "as_sub",
        "as_principal",
        "token_sub",
    }
)


# ---------------------------------------------------------------------------
# Surface-local typed errors (subclass the foundation's AuthError so callers can
# branch uniformly; defined here because this behavior is specific to Surface B).
# ---------------------------------------------------------------------------

class NotSelfScoped(AuthError):
    """The caller's token is not admissible on the self-service MCP surface.

    Either its audience is not the auth RS (not audience-bound to `auth`) or it
    does not carry the `auth:self` surface scope. Reaching these tools with a
    token minted for another audience is refused here — the surface never trusts
    that an upstream already checked.
    """


class CrossPrincipalDenied(AuthError):
    """An agent tried to name a principal other than itself on a self-only tool.

    Every tool on this surface forces `principal = caller`. Passing a different
    `sub`/`principal`/`target`/`token_sub`/... is a self-only violation and is
    REFUSED (not silently coerced) so the attempt is auditable. This is the
    Stage-7 "an agent cannot query or act on another principal" guarantee.
    """

    def __init__(self, caller_sub: str, requested: str, arg_key: str) -> None:
        self.caller_sub = caller_sub
        self.requested = requested
        self.arg_key = arg_key
        super().__init__(
            f"self-only surface: caller {caller_sub!r} may not target principal "
            f"{requested!r} (arg {arg_key!r}); principal is forced to the caller"
        )


# ---------------------------------------------------------------------------
# CallerIdentity — the validated, post-PEP identity every tool acts as.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class CallerIdentity:
    """A validated, self-describing caller identity (the agent's own token).

    Built from the agent's already-validated access token (Tier-1 PEP has already
    verified signature / iss / exp / aud / scope / cnf). This surface only needs
    the claims that let it answer self-service questions and re-check the two
    surface-gating invariants (aud == auth, scope contains auth:self).

    Immutable: a tool can neither widen `scopes` nor re-home `sub`.
    """
    sub: str
    kind: str
    aud: str
    scopes: FrozenSet[str]              # scopes carried by THIS (aud=auth) token
    jti: str = ""
    client_id: Optional[str] = None
    iat: int = 0
    exp: int = 0
    kid: Optional[str] = None           # JOSE header kid of the presented token
    cnf_bound: bool = False             # DPoP/mTLS sender-constrained?
    kill_epoch: int = 0
    kill_level: str = "G0"

    def __post_init__(self) -> None:
        object.__setattr__(self, "scopes", frozenset(self.scopes))

    @classmethod
    def from_access_token(
        cls,
        claims: AccessTokenClaims,
        *,
        kind: str,
        kid: Optional[str] = None,
    ) -> "CallerIdentity":
        """Adapt a validated RFC 9068 access token into a CallerIdentity.

        `kind` is the principal kind resolved by the Core API from the durable
        store at validation time (the token's `sub` -> Principal.kind); it is not
        a token claim, so it is passed explicitly rather than trusted off-wire.
        """
        return cls(
            sub=claims.sub,
            kind=kind,
            aud=claims.aud,
            scopes=frozenset(claims.scope),
            jti=claims.jti,
            client_id=claims.client_id,
            iat=claims.iat,
            exp=claims.exp,
            kid=kid,
            cnf_bound=bool(claims.cnf is not None and claims.cnf.is_bound()),
            kill_epoch=claims.kill_epoch,
            kill_level=claims.kill_level,
        )

    def principal_type(self) -> str:
        return PRINCIPAL_TYPE_HUMAN if self.kind == KIND_HUMAN else PRINCIPAL_TYPE_AGENT


# ---------------------------------------------------------------------------
# The surface.
# ---------------------------------------------------------------------------

class AuthMCPSurface:
    """The thin, read/self-only agent MCP surface over the one shared state.

    Consumes the durable Store and the HotStore through their READ methods only.
    No method here writes identity/role/budget state — the writers are simply not
    invoked, so no agent tool can create/disable/grant/revoke/edit anything.
    """

    def __init__(
        self,
        store: Store,
        hot: HotStore,
        *,
        clock: Optional[Callable[[], int]] = None,
    ) -> None:
        self._store = store
        self._hot = hot
        self._clock = clock or (lambda: int(time.time()))
        # The tool registry — exactly the four §9.2 tools, nothing that mutates.
        self._tools: Dict[str, Callable[[CallerIdentity, Optional[Dict[str, object]]], Dict[str, object]]] = {
            "whoami": self.whoami,
            "authorize_check": self.authorize_check,
            "introspect_self": self.introspect_self,
            "budget_self": self.budget_self,
        }

    # -- dispatch ----------------------------------------------------------
    def call(
        self,
        tool: str,
        caller: CallerIdentity,
        args: Optional[Dict[str, object]] = None,
    ) -> Dict[str, object]:
        """Invoke a named tool as the validated caller.

        Re-asserts the surface-gating invariants (audience-bound to auth +
        auth:self scope) before ANY tool runs, then dispatches. Only the four
        read/self tools exist in the registry — there is no writer to dispatch to.
        """
        self._require_surface_admissible(caller)
        fn = self._tools.get(tool)
        if fn is None:
            raise AuthError(
                f"unknown MCP tool {tool!r}; this surface exposes only {list(TOOL_NAMES)} "
                f"(read/self-only — no mint/grant/revoke/budget-edit tool exists)"
            )
        return fn(caller, args)

    # -- gating invariants -------------------------------------------------
    def _require_surface_admissible(self, caller: CallerIdentity) -> None:
        """The token MUST be audience-bound to `auth` AND carry `auth:self`.

        Enforced independently here — the surface never assumes an upstream
        already checked (defense in depth; the proxy scrubs, auth does not trust).
        """
        if caller.aud != AUTH_SURFACE_AUDIENCE:
            raise NotSelfScoped(
                f"MCP surface is audience-bound to {AUTH_SURFACE_AUDIENCE!r}; token "
                f"aud={caller.aud!r} cannot reach the auth self-service tools"
            )
        if AUTH_SELF_SCOPE not in caller.scopes:
            raise NotSelfScoped(
                f"MCP self-service tools require the {AUTH_SELF_SCOPE!r} scope; "
                f"presented token scopes={sorted(caller.scopes)}"
            )

    def _forbid_cross_principal(
        self, caller: CallerIdentity, args: Optional[Dict[str, object]]
    ) -> None:
        """Refuse any attempt to name a principal other than the caller.

        The principal is ALWAYS the caller; a differing principal-identifying arg
        is refused (not silently coerced) so the attempt is auditable.
        """
        if not args:
            return
        for key in _PRINCIPAL_ARG_KEYS:
            if key not in args:
                continue
            val = args[key]
            if val is None:
                continue
            if str(val) != caller.sub:
                raise CrossPrincipalDenied(caller.sub, str(val), key)
        # A client_id arg, if present, must also be the caller's own.
        if "client_id" in args and args["client_id"] is not None:
            if str(args["client_id"]) != (caller.client_id or caller.sub):
                raise CrossPrincipalDenied(
                    caller.sub, str(args["client_id"]), "client_id"
                )

    # ==================================================================== #
    # Tool 1 — whoami
    # ==================================================================== #
    def whoami(
        self, caller: CallerIdentity, args: Optional[Dict[str, object]] = None
    ) -> Dict[str, object]:
        """Own sub / kind / roles / effective scopes / requestable audiences /
        budget headroom. Sees ONLY the caller; never lists other principals."""
        self._forbid_cross_principal(caller, args)

        roles = sorted(self._store.roles_of(caller.sub))
        effective = self._store.effective_scopes(caller.sub)
        # Requestable audiences are mechanical: the `app` segment of each held
        # scope IS the RFC 8707 audience it can be honored under (§3.2). A holder
        # scope the agent doesn't hold simply never appears here — no way to learn
        # of an audience it cannot reach.
        requestable_audiences = sorted(
            {S.audience_of(s) for s in effective if S.is_valid_scope(s)}
        )
        principal = self._store.get_principal(caller.sub)
        status = principal.status if principal is not None else "unknown"

        return {
            "sub": caller.sub,
            "principal_type": caller.principal_type(),
            "kind": caller.kind,
            "status": status,
            "roles": roles,
            "effective_scopes": sorted(effective),
            "holder_scopes": sorted(effective & S.HOLDER_SCOPES),
            "requestable_audiences": requestable_audiences,
            "budget_headroom": self._budget_headroom(caller.sub),
            "surface_scope": AUTH_SELF_SCOPE,
            "self_only": True,
        }

    # ==================================================================== #
    # Tool 2 — authorize_check (self-only dry-run)
    # ==================================================================== #
    def authorize_check(
        self, caller: CallerIdentity, args: Optional[Dict[str, object]] = None
    ) -> Dict[str, object]:
        """Dry-run `(SELF, action, resource)` before acting, so an agent can avoid
        burning a cooldown/slot on a would-be deny. NEVER checks on behalf of
        another principal and NEVER mints anything — advisory only.

        `action` is the coarse capability (a scope id from the canonical taxonomy,
        e.g. `board:propose`); `resource` is an opaque reference echoed back. The
        real authoritative decision is the RS PEP + central PDP at call time; this
        is a deliberately conservative local pre-check over the caller's OWN
        effective scopes + live revocation/kill state.
        """
        self._forbid_cross_principal(caller, args)
        args = args or {}
        action = args.get("action")
        resource = args.get("resource")

        def _result(decision: str, reason: str, required_scope: Optional[str]) -> Dict[str, object]:
            return {
                "principal": caller.sub,        # FORCED to caller
                "action": action,
                "resource": resource,
                "decision": decision,
                "reason": reason,
                "required_scope": required_scope,
                "authoritative": False,          # dry-run; PDP is authoritative
                "self_only": True,
            }

        if not isinstance(action, str) or not action:
            return _result("deny", "unknown_action", None)

        # Resolve the required coarse scope for the action.
        required_scope = action if S.is_valid_scope(action) else args.get("required_scope")
        if not isinstance(required_scope, str) or not S.is_valid_scope(required_scope):
            return _result("deny", "unknown_action", None)

        # Live kill-switch posture (fail-safe: a global stop denies everything;
        # a destructive-freeze denies holder actions).
        level, _epoch = self._hot.killswitch()
        if level == "G2":
            return _result("deny", "killed", required_scope)
        if level == "G1" and S.is_holder(required_scope):
            return _result("deny", "killed", required_scope)

        # Live revocation of the caller's own credential.
        revoked = self._revocation_reason(caller)
        if revoked is not None:
            return _result("deny", "revoked", required_scope)

        # Coarse capability: does the caller EFFECTIVELY hold the scope?
        effective = self._store.effective_scopes(caller.sub)
        if required_scope not in effective:
            # NB: a holder scope the caller structurally cannot hold lands here as
            # insufficient_scope — the dry-run never hints how to widen, and it
            # certainly never grants.
            return _result("deny", "insufficient_scope", required_scope)

        return _result("permit", "permit", required_scope)

    # ==================================================================== #
    # Tool 3 — introspect_self
    # ==================================================================== #
    def introspect_self(
        self, caller: CallerIdentity, args: Optional[Dict[str, object]] = None
    ) -> Dict[str, object]:
        """Freshness / validity of the caller's OWN presented token (RFC 7662
        shape). Only ever introspects the caller's own token — any attempt to name
        another principal's token/`sub` is refused (cross-principal guard)."""
        self._forbid_cross_principal(caller, args)

        now = self._clock()
        expired = caller.exp != 0 and now >= caller.exp
        revoked = self._revocation_reason(caller)
        active = (not expired) and (revoked is None)

        reason = "active"
        if expired:
            reason = "expired"
        elif revoked is not None:
            reason = revoked

        out: Dict[str, object] = {
            "active": active,
            "sub": caller.sub,                  # always the caller
            "client_id": caller.client_id,
            "aud": caller.aud,
            "scope": " ".join(sorted(caller.scopes)),
            "iat": caller.iat,
            "exp": caller.exp,
            "jti": caller.jti,
            "kid": caller.kid,
            "cnf_bound": caller.cnf_bound,
            "reason": reason,
            "self_only": True,
        }
        # Advisory kill posture so the agent can self-throttle (does not by itself
        # flip `active`, which reflects token/credential validity).
        level, epoch = self._hot.killswitch()
        out["kill_level"] = level
        out["kill_epoch"] = epoch
        out["frozen"] = level in ("G1", "G2")
        return out

    # ==================================================================== #
    # Tool 4 — budget_self (read-only)
    # ==================================================================== #
    def budget_self(
        self, caller: CallerIdentity, args: Optional[Dict[str, object]] = None
    ) -> Dict[str, object]:
        """Own effective caps + live usage, for self-throttling. READ-ONLY: it
        reads policy from the Store and live counters from the HotStore and
        mutates nothing (no incr/decr/set)."""
        self._forbid_cross_principal(caller, args)

        policy = self._effective_budget(caller.sub)
        usage = self._live_usage(caller.sub)
        headroom = self._headroom_from(policy, usage)

        return {
            "principal": caller.sub,            # FORCED to caller
            "policy": _budget_to_public_dict(policy),
            "usage": usage,
            "headroom": headroom,
            "read_only": True,
            "self_only": True,
        }

    # ==================================================================== #
    # Internal helpers — all READ-ONLY over Store + HotStore
    # ==================================================================== #
    def _revocation_reason(self, caller: CallerIdentity) -> Optional[str]:
        """Machine reason if the caller's own credential is revoked, else None."""
        hs = self._hot
        if caller.jti and hs.is_jti_denied(caller.jti):
            return "revoked_jti"
        rb = hs.revoked_before(caller.sub)
        if rb is not None and caller.iat != 0 and caller.iat < rb:
            return "revoked_sub"
        if caller.client_id and hs.is_client_disabled(caller.client_id):
            return "revoked_client"
        if caller.kid and hs.is_kid_retired(caller.kid):
            return "revoked_kid"
        return None

    def _effective_budget(self, sub: str) -> BudgetPolicy:
        """Most-restrictive merge of the principal override + role defaults
        (§6.3). Read-only. A missing dimension means 'unlimited' and is dominated
        by any present cap."""
        candidates: List[BudgetPolicy] = []
        principal_policy = self._store.get_budget_policy(sub)
        if principal_policy is not None:
            candidates.append(principal_policy)
        for role_id in self._store.roles_of(sub):
            rp = self._store.get_budget_policy(role_id)
            if rp is not None:
                candidates.append(rp)
        return _merge_most_restrictive(sub, candidates)

    def _live_usage(self, sub: str) -> Dict[str, object]:
        """Live counters via HotStore READ methods only (the documented Redis key
        families, §6.3). Concurrency is read from `budget:conc:{sub}`."""
        hs = self._hot
        return {
            "concurrency_in_flight": hs.get_counter(f"budget:conc:{sub}"),
            "rate_tat": hs.get_counter(f"budget:rate:{sub}"),
            "lifetime_calls": hs.get_counter(f"budget:life:{sub}"),
            "no_progress_calls": hs.get_counter(f"budget:progress:{sub}"),
        }

    def _headroom_from(
        self, policy: BudgetPolicy, usage: Dict[str, object]
    ) -> Dict[str, object]:
        conc_cap = policy.concurrency.global_max if policy.concurrency else None
        life_cap = policy.lifetime.max_lifetime_tool_calls if policy.lifetime else None
        conc_used = int(usage.get("concurrency_in_flight", 0) or 0)
        life_used = int(usage.get("lifetime_calls", 0) or 0)
        return {
            "concurrency": None if conc_cap is None else max(0, conc_cap - conc_used),
            "concurrency_cap": conc_cap,
            "lifetime_calls": None if life_cap is None else max(0, life_cap - life_used),
            "lifetime_cap": life_cap,
        }

    def _budget_headroom(self, sub: str) -> Dict[str, object]:
        """Compact headroom summary embedded in whoami."""
        policy = self._effective_budget(sub)
        usage = self._live_usage(sub)
        return self._headroom_from(policy, usage)


# ---------------------------------------------------------------------------
# Pure helpers (module-level; no I/O).
# ---------------------------------------------------------------------------

def _merge_most_restrictive(owner: str, policies: List[BudgetPolicy]) -> BudgetPolicy:
    """Combine budget policies to the MOST restrictive per dimension (§6.3).

    Absent dimension == unlimited, so a present cap always dominates None.
    """
    from ..core.principals import ConcurrencyLimit, LifetimeLimit, RateLimit

    if not policies:
        return BudgetPolicy(owner=owner)

    # Rate: most restrictive = slowest sustained (largest emission_interval_ms)
    # and smallest burst tolerance.
    rate_T: Optional[int] = None
    rate_tau: Optional[int] = None
    conc_global: Optional[int] = None
    conc_per_class: Dict[str, int] = {}
    life_calls: Optional[int] = None
    life_wall: Optional[int] = None
    life_np_calls: Optional[int] = None
    life_np_minutes: Optional[int] = None
    cooldowns: Dict[str, int] = {}

    for p in policies:
        if p.rate is not None:
            rate_T = p.rate.emission_interval_ms if rate_T is None else max(rate_T, p.rate.emission_interval_ms)
            rate_tau = p.rate.burst_tau_ms if rate_tau is None else min(rate_tau, p.rate.burst_tau_ms)
        if p.concurrency is not None:
            gm = p.concurrency.global_max
            conc_global = gm if conc_global is None else min(conc_global, gm)
            for cls, cap in p.concurrency.per_class_max.items():
                conc_per_class[cls] = cap if cls not in conc_per_class else min(conc_per_class[cls], cap)
        if p.lifetime is not None:
            life_calls = _min_opt(life_calls, p.lifetime.max_lifetime_tool_calls)
            life_wall = _min_opt(life_wall, p.lifetime.max_wall_clock_ms)
            life_np_calls = _min_opt(life_np_calls, p.lifetime.no_progress_calls_trigger)
            life_np_minutes = _min_opt(life_np_minutes, p.lifetime.no_progress_minutes_trigger)
        for cls, ms in p.cooldowns_ms.items():
            cooldowns[cls] = ms if cls not in cooldowns else max(cooldowns[cls], ms)

    rate = None if rate_T is None else RateLimit(rate_T, rate_tau if rate_tau is not None else 0)
    conc = None if conc_global is None else ConcurrencyLimit(conc_global, dict(conc_per_class))
    life = (
        None
        if (life_calls is None and life_wall is None and life_np_calls is None and life_np_minutes is None)
        else LifetimeLimit(life_calls, life_wall, life_np_calls, life_np_minutes)
    )
    return BudgetPolicy(
        owner=owner,
        rate=rate,
        concurrency=conc,
        lifetime=life,
        cooldowns_ms=cooldowns,
    )


def _min_opt(a: Optional[int], b: Optional[int]) -> Optional[int]:
    if a is None:
        return b
    if b is None:
        return a
    return min(a, b)


def _budget_to_public_dict(p: BudgetPolicy) -> Dict[str, object]:
    """A JSON-friendly, read-only view of a BudgetPolicy (static caps only)."""
    return {
        "rate": None if p.rate is None else {
            "emission_interval_ms": p.rate.emission_interval_ms,
            "burst_tau_ms": p.rate.burst_tau_ms,
        },
        "concurrency": None if p.concurrency is None else {
            "global_max": p.concurrency.global_max,
            "per_class_max": dict(p.concurrency.per_class_max),
        },
        "lifetime": None if p.lifetime is None else {
            "max_lifetime_tool_calls": p.lifetime.max_lifetime_tool_calls,
            "max_wall_clock_ms": p.lifetime.max_wall_clock_ms,
            "no_progress_calls_trigger": p.lifetime.no_progress_calls_trigger,
            "no_progress_minutes_trigger": p.lifetime.no_progress_minutes_trigger,
        },
        "cooldowns_ms": dict(p.cooldowns_ms),
        "version": p.version,
    }
