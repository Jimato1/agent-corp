"""auth.core.principals — the identity data model (PLAN §3).

Dataclasses only — no I/O, no store, no policy logic. The Store (auth.store)
persists these; the SSD/kind/attestation enforcement lives at grant/assignment
time in the Store (PLAN §3.5, §3.6), NOT in these value objects.

Immutability contract (Stage-7 testable, findings 4f / 1a):
  * Principal.sub, Principal.kind, Principal.agent_class are IMMUTABLE after
    creation. An operator cannot flip an agent/service principal to
    kind=break_glass, cannot re-home a sub, cannot change an executor to a planner.
  * AgentKey stores ONLY the public half; the private signing key never transits auth.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, FrozenSet, List, Optional, Tuple

from .errors import ImmutableFieldError


# ---------------------------------------------------------------------------
# Enumerated constants (kept as plain strings — markdown/JSON friendly).
# ---------------------------------------------------------------------------

# Principal.kind
KIND_HUMAN = "human"
KIND_AGENT = "agent"
KIND_SERVICE = "service"
KIND_BREAK_GLASS = "break_glass"
VALID_KINDS: FrozenSet[str] = frozenset({KIND_HUMAN, KIND_AGENT, KIND_SERVICE, KIND_BREAK_GLASS})

# Principal.agent_class (agents only, immutable) — PLAN §3.1
AGENT_CLASS_EXECUTOR = "executor"   # the uniform "hands" pool
AGENT_CLASS_PLANNER = "planner"     # huddle roles (Scrum Master, PO, Adversarial Reviewer, ...)
VALID_AGENT_CLASSES: FrozenSet[str] = frozenset({AGENT_CLASS_EXECUTOR, AGENT_CLASS_PLANNER})

# Principal.status
STATUS_ACTIVE = "active"
STATUS_DISABLED = "disabled"
STATUS_SUSPENDED = "suspended"
VALID_STATUSES: FrozenSet[str] = frozenset({STATUS_ACTIVE, STATUS_DISABLED, STATUS_SUSPENDED})

# AgentKey.status — overlapping-validity rotation (PLAN §3.6)
KEY_ACTIVE = "active"
KEY_ROTATING = "rotating"
KEY_REVOKED = "revoked"
VALID_KEY_STATUSES: FrozenSet[str] = frozenset({KEY_ACTIVE, KEY_ROTATING, KEY_REVOKED})

# AgentKey storage tiers, weakest -> strongest (PLAN §3.6). Only the two
# non-exportable tiers are attested hardware-bound and admissible for a
# holder/destructive principal.
STORE_FILE = "file"                 # 0600 file — soft key
STORE_OS_KEYSTORE = "os-keystore"   # DPAPI/Keychain/keyring — soft key
STORE_TPM = "tpm"                   # TPM-sealed, non-exportable — HARD
STORE_HSM = "hsm"                   # HSM, key marked non-exportable — HARD
_NON_EXPORTABLE_STORES: FrozenSet[str] = frozenset({STORE_TPM, STORE_HSM})


# ---------------------------------------------------------------------------
# Principal — immutable kind/sub/agent_class, mutable status/display fields.
# ---------------------------------------------------------------------------

_IMMUTABLE_PRINCIPAL_FIELDS: FrozenSet[str] = frozenset({"sub", "kind", "agent_class"})


@dataclass
class Principal:
    """One principal per real actor (PLAN §3.1). Agents are never pooled.

    sub / kind / agent_class are immutable after construction (enforced by
    __setattr__). client_id may equal sub for client-credentials principals.
    """
    sub: str
    kind: str
    agent_class: Optional[str] = None
    client_id: Optional[str] = None
    status: str = STATUS_ACTIVE
    display_name: str = ""
    # For a break_glass principal: provenance flag (never issuable an online token).
    online_token_forbidden: bool = False

    def __post_init__(self) -> None:
        if self.kind not in VALID_KINDS:
            raise ValueError(f"invalid kind {self.kind!r}; must be one of {sorted(VALID_KINDS)}")
        if self.kind == KIND_AGENT:
            if self.agent_class not in VALID_AGENT_CLASSES:
                raise ValueError(
                    f"agent principal {self.sub!r} requires agent_class in "
                    f"{sorted(VALID_AGENT_CLASSES)}, got {self.agent_class!r}"
                )
        else:
            if self.agent_class is not None:
                raise ValueError(
                    f"agent_class is only valid for kind=agent; {self.sub!r} is {self.kind!r}"
                )
        if self.status not in VALID_STATUSES:
            raise ValueError(f"invalid status {self.status!r}")
        # A break_glass principal is never issuable a normal online token (finding 4f).
        if self.kind == KIND_BREAK_GLASS:
            object.__setattr__(self, "online_token_forbidden", True)
        # Mark construction complete so the immutability wall engages.
        object.__setattr__(self, "_frozen", True)

    def __setattr__(self, name: str, value: object) -> None:
        if getattr(self, "_frozen", False) and name in _IMMUTABLE_PRINCIPAL_FIELDS:
            raise ImmutableFieldError(
                f"Principal.{name} is immutable after creation (PLAN §3.5/§3.7, "
                f"finding 4f): cannot change {name} of {self.sub!r}"
            )
        object.__setattr__(self, name, value)


# ---------------------------------------------------------------------------
# Roles, grants, hierarchy (PLAN §3.4). Principals get ROLES, not raw scopes.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RoleScopeGrant:
    """A (role -> scope) grant. Insert triggers the §3.5 SSD check in the Store."""
    role_id: str
    scope: str


@dataclass
class Role:
    """A named RBAC role (INCITS 359). Roles nest via RoleHierarchy.

    kind_gate / agent_class_gate constrain which principals a role may be assigned
    to (§3.5 guarantee 2 — kind-gating). direct_scopes are the scopes granted
    directly on this role (inherited scopes come via RoleHierarchy).
    """
    role_id: str
    direct_scopes: FrozenSet[str] = field(default_factory=frozenset)
    kind_gate: Optional[FrozenSet[str]] = None          # allowed Principal.kind values
    agent_class_gate: Optional[FrozenSet[str]] = None   # allowed agent_class values
    description: str = ""

    def with_scope(self, scope: str) -> "Role":
        return Role(
            role_id=self.role_id,
            direct_scopes=self.direct_scopes | {scope},
            kind_gate=self.kind_gate,
            agent_class_gate=self.agent_class_gate,
            description=self.description,
        )


@dataclass(frozen=True)
class RoleHierarchyEdge:
    """`role` inherits `inherits`: effective(role) ⊇ effective(inherits) (PLAN §3.4)."""
    role: str
    inherits: str


@dataclass(frozen=True)
class PrincipalRoleAssignment:
    """A (principal -> role) assignment. Insert triggers the §3.5 SSD check."""
    sub: str
    role_id: str


# ---------------------------------------------------------------------------
# AgentKey — the per-agent signing key lifecycle (PLAN §3.6). Public half ONLY.
# ---------------------------------------------------------------------------

@dataclass
class AgentKey:
    """Registered PUBLIC key half + attestation metadata. No private material.

    non_exportable is the load-bearing attestation (finding 1a): a holder/
    destructive principal MUST have non_exportable == True (hardware-bound
    TPM/HSM). The Store refuses to activate a holder/destructive role otherwise.
    """
    sub: str
    kid: str
    public_jwk: Dict[str, object]           # JSON Web Key, public half only
    alg: str = "EdDSA"                       # ES256 / EdDSA in prod
    storage_tier: str = STORE_FILE
    non_exportable: bool = False             # attested hardware-bound?
    status: str = KEY_ACTIVE
    # The DPoP proof key / mTLS cert thumbprint MUST co-locate in the same
    # non-exportable store for a holder principal (finding 1c). Modeled here.
    cnf_jkt: Optional[str] = None            # DPoP jkt thumbprint (cnf.jkt)
    proof_key_co_located: bool = False

    def __post_init__(self) -> None:
        if self.storage_tier not in {STORE_FILE, STORE_OS_KEYSTORE, STORE_TPM, STORE_HSM}:
            raise ValueError(f"invalid storage_tier {self.storage_tier!r}")
        if self.status not in VALID_KEY_STATUSES:
            raise ValueError(f"invalid key status {self.status!r}")
        if "d" in self.public_jwk:
            # 'd' is the private exponent/scalar in a JWK — must NEVER be present.
            raise ValueError(
                "AgentKey.public_jwk contains a private component ('d'); auth "
                "stores ONLY the public half (PLAN §3.6). Refusing."
            )
        # Attestation coherence: a key can only be marked non_exportable if it
        # lives in a hardware-bound store tier.
        if self.non_exportable and self.storage_tier not in _NON_EXPORTABLE_STORES:
            raise ValueError(
                f"non_exportable=True requires storage_tier in {sorted(_NON_EXPORTABLE_STORES)}, "
                f"got {self.storage_tier!r} — a soft key cannot be attested non-exportable"
            )

    @property
    def is_hardware_bound(self) -> bool:
        """True iff attested non-exportable (admissible for holder/destructive roles)."""
        return self.non_exportable and self.storage_tier in _NON_EXPORTABLE_STORES


# ---------------------------------------------------------------------------
# BudgetPolicy — compute/time/concurrency, NOT dollars (PLAN §6, ARCHITECTURE §2).
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RateLimit:
    """GCRA parameters (PLAN §6.1): emission interval T and burst tolerance tau."""
    emission_interval_ms: int          # T
    burst_tau_ms: int                  # tau


@dataclass(frozen=True)
class ConcurrencyLimit:
    """Concurrency/WIP caps (PLAN §6.1 dim 2)."""
    global_max: int
    per_class_max: Dict[str, int] = field(default_factory=dict)


@dataclass(frozen=True)
class LifetimeLimit:
    """Fourth, first-class lifetime/liveness guardrail (PLAN §6.1 dim 4, finding 5b).

    Bounds TOTAL work regardless of instantaneous rate/concurrency — catches the
    patient sequential benign-read/plan loop that trips none of the other three.
    """
    max_lifetime_tool_calls: Optional[int] = None
    max_wall_clock_ms: Optional[int] = None
    no_progress_calls_trigger: Optional[int] = None    # N calls w/o state-advancing action
    no_progress_minutes_trigger: Optional[int] = None  # T minutes without task progress


@dataclass
class BudgetPolicy:
    """Owned by auth (operator-managed, audited, versioned). Attaches to a principal
    or role; effective = most-restrictive of role default + principal override.

    LIVE counters are NEVER in the token — only the policy lives here; live state
    lives in the HotStore (Redis). (PLAN §6.3)
    """
    owner: str                              # a sub, a role_id, or "*"/"org" (global WIP)
    rate: Optional[RateLimit] = None
    concurrency: Optional[ConcurrencyLimit] = None
    lifetime: Optional[LifetimeLimit] = None
    cooldowns_ms: Dict[str, int] = field(default_factory=dict)   # action-class -> min interval
    # Per action-class fail mode override; default per §6.2 table.
    fail_mode_overrides: Dict[str, str] = field(default_factory=dict)
    version: int = 1
