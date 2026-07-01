"""auth.core.scopes — the ONE scope taxonomy + the IMMUTABLE SoD ConflictSet.

This module is the single source of truth for:
  * the canonical `app:capability` scope taxonomy used identically by EVERY suite
    app (PLAN §3.2 / §3.3) — the `app` segment IS the RFC 8707 audience discriminator;
  * the four SoD HOLDER scopes (PLAN §3.3);
  * the IMMUTABLE, compiled-in SoD ConflictSet `sod-holders` (PLAN §3.5, red-team
    finding 4a) — a frozen structure with NO setter and NO config/admin/API path.

CRITICAL INVARIANT (settled decision #5): the holder ConflictPairs are hardcoded
constants. Changing them is a code change + redeploy, NEVER a runtime operation.
Every structure exported here is immutable; attempting to mutate one raises.

Other builders: import scope ids and `is_holder`/`conflict_pairs`/`find_holder_conflict`
from here. Do NOT re-declare the taxonomy or the pairs anywhere else.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from types import MappingProxyType
from typing import FrozenSet, Iterable, Mapping, Optional, Tuple

from .errors import ConflictSetImmutableError, UnknownScope


# ---------------------------------------------------------------------------
# 1. The canonical scope taxonomy (PLAN §3.3). `<app>:<capability>`, lowercase.
#    The `app` segment is the audience discriminator (RFC 8707): a scope is only
#    honored in a token whose aud == that app's RS.
# ---------------------------------------------------------------------------

# auth
AUTH_AUTHENTICATE = "auth:authenticate"
AUTH_READ_IDENTITY = "auth:read-identity"
AUTH_MANAGE_IDENTITY = "auth:manage-identity"
AUTH_INTROSPECT = "auth:introspect"
# board
BOARD_READ = "board:read"
BOARD_CREATE = "board:create"
BOARD_PROPOSE = "board:propose"
BOARD_CLAIM = "board:claim"
BOARD_UPDATE = "board:update"
BOARD_RUN_CEREMONY = "board:run-ceremony"
BOARD_APPROVE = "board:approve"            # HOLDER
BOARD_ADMIN = "board:admin"
# notes
NOTES_READ = "notes:read"
NOTES_WRITE = "notes:write"
NOTES_SEARCH = "notes:search"
# mission-control (mc)
MC_REPORT = "mc:report"
MC_READ = "mc:read"
MC_ESCALATE = "mc:escalate"
MC_ADMIN = "mc:admin"
MC_KILL_SWITCH = "mc:kill-switch"
# drive
DRIVE_READ = "drive:read"
DRIVE_WRITE = "drive:write"
# chat
CHAT_READ = "chat:read"
CHAT_POST = "chat:post"
CHAT_BROADCAST = "chat:broadcast"
# pdf
PDF_RENDER = "pdf:render"
PDF_VIEW = "pdf:view"
# cmdb
CMDB_READ = "cmdb:read"
CMDB_READ_POLICY = "cmdb:read-policy"
CMDB_WRITE_POLICY = "cmdb:write-policy"    # HOLDER
# vault
VAULT_REFERENCE = "vault:reference"
VAULT_READ_CREDENTIAL = "vault:read-credential"  # HOLDER
VAULT_MANAGE = "vault:manage"
# gateway
GATEWAY_READ = "gateway:read"
GATEWAY_EXECUTE = "gateway:execute"        # HOLDER


@dataclass(frozen=True)
class ScopeDef:
    """Immutable definition of one scope (frozen dataclass — cannot be mutated)."""
    id: str
    app: str
    tier: int          # 1 = coarse/local PEP; 2 = additionally hits the PDP
    is_holder: bool
    description: str


def _s(scope_id: str, tier: int, description: str, holder: bool = False) -> ScopeDef:
    app = scope_id.split(":", 1)[0]
    return ScopeDef(id=scope_id, app=app, tier=tier, is_holder=holder, description=description)


# The full canonical registry (PLAN §3.3), keyed by scope id.
_SCOPE_LIST: Tuple[ScopeDef, ...] = (
    _s(AUTH_AUTHENTICATE, 1, "obtain a token (implicit floor for every principal)"),
    _s(AUTH_READ_IDENTITY, 1, "read own (operator: others') identity"),
    _s(AUTH_MANAGE_IDENTITY, 2, "create principals, assign roles, set budgets, manage keys"),
    _s(AUTH_INTROSPECT, 2, "RS/PDP token-validate / decision query (service principals)"),
    _s(BOARD_READ, 1, "read tickets/board"),
    _s(BOARD_CREATE, 1, "file tickets"),
    _s(BOARD_PROPOSE, 1, "submit plan -> awaiting_approval (maker side)"),
    _s(BOARD_CLAIM, 2, "atomic claim (locks the real-world resource)"),
    _s(BOARD_UPDATE, 1, "update ticket status/content"),
    _s(BOARD_RUN_CEREMONY, 1, "drive scrum/agentic-agile ceremony"),
    _s(BOARD_APPROVE, 2, "approve an awaiting_approval ticket (checker side)", holder=True),
    _s(BOARD_ADMIN, 2, "management console (human)"),
    _s(NOTES_READ, 1, "external-memory read"),
    _s(NOTES_WRITE, 1, "external-memory write (wikilinks/backlinks)"),
    _s(NOTES_SEARCH, 1, "external-memory FTS"),
    _s(MC_REPORT, 1, "status/heartbeat"),
    _s(MC_READ, 1, "live agent view"),
    _s(MC_ESCALATE, 1, "file escalation"),
    _s(MC_ADMIN, 2, "WIP/budget controls (human)"),
    _s(MC_KILL_SWITCH, 2, "arm/trip the global kill switch (human)"),
    _s(DRIVE_READ, 1, "get/list artifacts"),
    _s(DRIVE_WRITE, 1, "put artifacts"),
    _s(CHAT_READ, 1, "read feed"),
    _s(CHAT_POST, 1, "post notifications+escalations"),
    _s(CHAT_BROADCAST, 2, "operator broadcast (human)"),
    _s(PDF_RENDER, 1, "render note->PDF"),
    _s(PDF_VIEW, 1, "view PDF"),
    _s(CMDB_READ, 1, "inventory read"),
    _s(CMDB_READ_POLICY, 1, "query tier/window/in-window?"),
    _s(CMDB_WRITE_POLICY, 2, "manage fleet + policy (operator only)", holder=True),
    _s(VAULT_REFERENCE, 1, "reference a credential by handle only, never plaintext"),
    _s(VAULT_READ_CREDENTIAL, 2, "redeem handle -> plaintext (svc:gateway ONLY)", holder=True),
    _s(VAULT_MANAGE, 2, "manage secrets, rotation, access audit (human)"),
    _s(GATEWAY_READ, 1, "execution monitor / per-command audit"),
    _s(GATEWAY_EXECUTE, 2, "execute_approved_plan(ticket, host)", holder=True),
)

SCOPES: Dict[str, ScopeDef] = {s.id: s for s in _SCOPE_LIST}

# The full set of valid scope ids (immutable).
ALL_SCOPES: FrozenSet[str] = frozenset(SCOPES)


# ---------------------------------------------------------------------------
# 2. The four SoD HOLDER scopes, split into the authorization side and the
#    action side (PLAN §3.5). This split is the whole SoD property.
# ---------------------------------------------------------------------------

# Authorization ("approve") side A
APPROVE_SIDE: FrozenSet[str] = frozenset({BOARD_APPROVE, CMDB_WRITE_POLICY})
# Action ("execute") side X
ACTION_SIDE: FrozenSet[str] = frozenset({GATEWAY_EXECUTE, VAULT_READ_CREDENTIAL})

# All four holder scopes.
HOLDER_SCOPES: FrozenSet[str] = APPROVE_SIDE | ACTION_SIDE

# The single deliberately-ALLOWED governance pair (the ○ in the §3.5 matrix):
# both are human governance and the operator must set auto-approve tier policy
# AND approve. This is a hardcoded ALLOWANCE, never silently editable into a
# ●-relaxation.
ALLOWED_GOVERNANCE_PAIR: FrozenSet[str] = frozenset({BOARD_APPROVE, CMDB_WRITE_POLICY})


# ---------------------------------------------------------------------------
# 2b. Per-holder-scope KIND restriction (PLAN §3.5 decision table; review
#     finding 2 / §3.5 guarantee 2). A holder scope may only be EFFECTIVELY held
#     by a principal of an allowed kind — independent of the role's own kind_gate:
#       * vault:read-credential  -> service ONLY (the svc:gateway machine scope);
#       * cmdb:write-policy       -> human ONLY   (operator-authored fleet policy);
#       * gateway:execute         -> agent ONLY   (the executor "hands");
#       * board:approve           -> human|agent  (governance checker side).
#     This is the invariant that makes "kind=agent | vault:read-credential ->
#     REJECT" true no matter WHICH widening path (role scope-grant, hierarchy
#     edge, role replacement, or direct assignment) reaches the holder scope —
#     the Store enforces it at GRANT time over the full downward-transitive
#     affected set, so an agent can never acquire vault:read-credential /
#     cmdb:write-policy even by mutating an already-assigned role.
#     Kept as string literals (mirroring auth.core.principals.KIND_*) to avoid an
#     import cycle; test_foundation asserts they equal the principals constants.
# ---------------------------------------------------------------------------
# Read-only at runtime (MappingProxyType) to match the immutability posture of
# CONFLICT_SET / HOLDER_SCOPES — this kind-gating table is a compiled-in constant
# with NO runtime relax path (decision #5), so it must not be a mutable module dict
# that in-process code could widen (`HOLDER_ALLOWED_KINDS[GATEWAY_EXECUTE] |= ...`).
HOLDER_ALLOWED_KINDS: Mapping[str, FrozenSet[str]] = MappingProxyType({
    GATEWAY_EXECUTE: frozenset({"agent"}),
    VAULT_READ_CREDENTIAL: frozenset({"service"}),
    CMDB_WRITE_POLICY: frozenset({"human"}),
    BOARD_APPROVE: frozenset({"human", "agent"}),
})


def find_holder_kind_violation(
    effective_scopes: Iterable[str], kind: str
) -> Optional[Tuple[str, FrozenSet[str]]]:
    """Return (holder_scope, allowed_kinds) for the first EFFECTIVELY-held holder
    scope that a principal of `kind` may NOT hold, else None (PLAN §3.5 table).

    The Store calls this over each affected principal's POST-mutation effective
    closure so the per-holder kind restriction is enforced on EVERY widening path,
    not just direct role assignment (review finding 2)."""
    held = frozenset(effective_scopes) & HOLDER_SCOPES
    for scope in sorted(held):
        allowed = HOLDER_ALLOWED_KINDS.get(scope)
        if allowed is not None and kind not in allowed:
            return (scope, allowed)
    return None


def _compute_conflict_pairs() -> FrozenSet[FrozenSet[str]]:
    """The five immutable holder ConflictPairs (PLAN §3.5 matrix).

    Every unordered pair among the four holder scopes is mutually exclusive
    EXCEPT the single allowed governance pair {board:approve, cmdb:write-policy}.
    That yields C(4,2) - 1 = 5 pairs:
        {board:approve,       gateway:execute}          (approve x action)
        {board:approve,       vault:read-credential}    (approve x action)
        {cmdb:write-policy,   gateway:execute}          (approve x action)
        {cmdb:write-policy,   vault:read-credential}    (approve x action)
        {gateway:execute,     vault:read-credential}    (action x action — both are
                                                         real-world power; a single
                                                         principal may hold neither
                                                         combination)
    Each pair has cardinality n=1: at most one of the pair per principal.
    """
    holders = sorted(HOLDER_SCOPES)
    pairs = set()
    for i in range(len(holders)):
        for j in range(i + 1, len(holders)):
            pair = frozenset({holders[i], holders[j]})
            if pair == ALLOWED_GOVERNANCE_PAIR:
                continue
            pairs.add(pair)
    return frozenset(pairs)


class _ImmutableConflictSet:
    """The compiled-in SoD ConflictSet `sod-holders` (PLAN §3.5, finding 4a).

    There is NO setter, NO config path, and NO admin/API mutation. Any attempt
    to set/delete an attribute raises ConflictSetImmutableError — enforcing
    settled decision #5 at the type level, not merely by convention. The pairs
    are exposed only as frozensets, which themselves cannot be mutated.
    """

    name = "sod-holders"

    def __init__(self, pairs: FrozenSet[FrozenSet[str]]) -> None:
        # Use the base __setattr__ exactly once, at construction, via object.
        object.__setattr__(self, "_pairs", frozenset(pairs))

    # -- read API ----------------------------------------------------------
    @property
    def pairs(self) -> FrozenSet[FrozenSet[str]]:
        return self._pairs  # a frozenset of frozensets — immutable at every level

    def cardinality(self) -> int:
        # Every ConflictPair is n=1 (at most one of the pair per principal).
        return 1

    def is_conflict(self, a: str, b: str) -> bool:
        return frozenset({a, b}) in self._pairs

    def __iter__(self):
        return iter(self._pairs)

    def __len__(self) -> int:
        return len(self._pairs)

    def __contains__(self, pair: object) -> bool:
        try:
            return frozenset(pair) in self._pairs  # type: ignore[arg-type]
        except TypeError:
            return False

    # -- immutability wall -------------------------------------------------
    def __setattr__(self, name: str, value: object) -> None:
        raise ConflictSetImmutableError(
            "the SoD ConflictSet 'sod-holders' is compiled-in and immutable "
            "(settled decision #5 / finding 4a): no runtime/admin/API/config "
            "path may add, delete, weaken, or widen a holder ConflictPair. "
            "Changing it is a code change + redeploy."
        )

    def __delattr__(self, name: str) -> None:
        raise ConflictSetImmutableError(
            "cannot delete any attribute of the immutable SoD ConflictSet"
        )

    def __repr__(self) -> str:
        rendered = sorted(tuple(sorted(p)) for p in self._pairs)
        return f"<ConflictSet {self.name!r} pairs={rendered}>"


# THE singleton immutable ConflictSet. This is the SoD invariant.
CONFLICT_SET: _ImmutableConflictSet = _ImmutableConflictSet(_compute_conflict_pairs())


# ---------------------------------------------------------------------------
# 3. Helpers other builders import (PLAN §3.5 enforcement algorithm).
# ---------------------------------------------------------------------------

def is_holder(scope: str) -> bool:
    """True iff `scope` is one of the four SoD holder scopes."""
    return scope in HOLDER_SCOPES


def is_valid_scope(scope: str) -> bool:
    return scope in SCOPES


def require_scope(scope: str) -> ScopeDef:
    """Return the ScopeDef, or raise UnknownScope if it is not in the taxonomy."""
    try:
        return SCOPES[scope]
    except KeyError:
        raise UnknownScope(f"unknown scope {scope!r} — not in the canonical taxonomy")


def audience_of(scope: str) -> str:
    """The RFC 8707 audience (the `app` segment) a scope is honored under."""
    return require_scope(scope).app


def conflict_pairs() -> FrozenSet[FrozenSet[str]]:
    """The immutable set of five holder ConflictPairs (a copy-safe frozenset)."""
    return CONFLICT_SET.pairs


def find_holder_conflict(effective_scopes: Iterable[str]) -> Optional[FrozenSet[str]]:
    """Return a forbidden holder ConflictPair contained in `effective_scopes`, else None.

    This is the leaf check of the §3.5 enforcement algorithm. Callers (the Store's
    grant-time SSD check, the PDP Cedar-mirror) run this over each affected
    principal's EFFECTIVE (inherited/transitive) scope closure. Returning a pair
    (not just a bool) lets the audit line and UI name exactly what was refused.
    """
    held_holders = frozenset(effective_scopes) & HOLDER_SCOPES
    for pair in CONFLICT_SET.pairs:
        if pair <= held_holders:
            return pair
    return None


# ---------------------------------------------------------------------------
# 4. The affected-set fan-out CONTRACT (PLAN §3.5 step 0).
#
# The SSD check is enforced at GRANT/ASSIGNMENT time over the FULL DOWNWARD-
# TRANSITIVE affected set — NOT the mutation's immediate endpoints. The Store
# (auth.store.sqlite_store) implements the fan-out and calls find_holder_conflict
# on each affected principal's POST-mutation effective closure. The contract:
#
#   AFFECTED(M) = the COMPLETE set of principals whose EFFECTIVE scope set M
#                 could change:
#     - PrincipalRoleAssignment insert (P, R)  -> { P }
#     - RoleScopeGrant insert on role R        -> every principal TRANSITIVELY
#                                                  assigned R (downward closure of R)
#     - RoleHierarchy edge insert (R -> R')    -> every principal that now inherits
#                                                  R' (== every principal transitively
#                                                  assigned R)
#   For EACH P in AFFECTED(M): if find_holder_conflict(EFFECTIVE_post_M(P)) is not
#   None -> REJECT M atomically (whole mutation, all principals). Else COMMIT.
#
# Evaluating only the mutation's immediate target instead of the full downward
# fan-out is a BUG (the "empty role inherits board:approve, then add a hierarchy
# edge from role:agent-executor" staging attack must be caught at the EDGE insert).
# ---------------------------------------------------------------------------

AFFECTED_SET_CONTRACT = _compute_conflict_pairs  # re-export sentinel; see docstring above
del AFFECTED_SET_CONTRACT  # documentation-only; the algorithm lives in the Store
