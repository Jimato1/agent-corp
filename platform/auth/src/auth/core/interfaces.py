"""auth.core.interfaces — the Protocol interfaces the whole service is wired to.

Three seams, so every dependency is swappable behind a stable contract:
  * Store   — the DURABLE, canonical identity/roles/grants state + the grant-time
              SSD check. SQLite-now, Postgres-later is a config swap, not a rewrite
              (decision #8). The Store is the SOLE WRITER to durable state (§9.0).
  * HotStore — the hot, REBUILDABLE index: revocation denylist, budget counters,
              kill-switch level/epoch, and the pub/sub fan-out shape. In-process-now,
              replicated-Redis-later (§4.6, §7.3). NEVER the canonical store.
  * Signer  — sign/verify over the JWT signing input, plus kid + alg. HMAC test-
              signer now (exercises all token logic); EdDSA/ES256 in prod.

These Protocols are structural (typing.Protocol) — an impl need not inherit them,
it need only match the shape. runtime_checkable so tests can assert conformance.
"""
from __future__ import annotations

from typing import (
    Dict,
    FrozenSet,
    Iterable,
    List,
    Optional,
    Protocol,
    Sequence,
    Tuple,
    runtime_checkable,
)

from .principals import (
    AgentKey,
    BudgetPolicy,
    Principal,
    Role,
)


# ---------------------------------------------------------------------------
# Store — durable, canonical, SOLE WRITER. Every widening mutation runs the
# §3.5 SSD conflict check over the FULL downward-transitive affected set and
# REJECTS atomically before commit.
# ---------------------------------------------------------------------------

@runtime_checkable
class Store(Protocol):
    # -- principals --------------------------------------------------------
    def put_principal(self, principal: Principal) -> None:
        """Insert/replace a principal. sub/kind/agent_class immutability is a
        model invariant (auth.core.principals); this persists it."""
        ...

    def get_principal(self, sub: str) -> Optional[Principal]:
        ...

    def set_principal_status(self, sub: str, status: str) -> None:
        """Enable/disable/suspend — the mutable half of a principal (kill lever)."""
        ...

    def list_principals(self) -> List[Principal]:
        ...

    # -- roles / scopes / hierarchy ---------------------------------------
    def put_role(self, role: Role) -> None:
        ...

    def get_role(self, role_id: str) -> Optional[Role]:
        ...

    def grant_scope_to_role(self, role_id: str, scope: str) -> None:
        """RoleScopeGrant insert. Runs the §3.5 SSD check over the downward-
        transitive closure of role_id (every principal transitively assigned it).
        Raises SoDViolation and commits nothing on conflict."""
        ...

    def add_role_hierarchy_edge(self, role: str, inherits: str) -> None:
        """RoleHierarchy edge insert (role inherits `inherits`). Runs the §3.5
        SSD check over every principal that now inherits `inherits`. Raises
        RoleHierarchyError on a cycle; SoDViolation on conflict."""
        ...

    # -- assignments -------------------------------------------------------
    def assign_role(self, sub: str, role_id: str) -> None:
        """PrincipalRoleAssignment insert. Runs kind-gating, the attestation
        invariant (holder/destructive role needs a non-exportable AgentKey), and
        the §3.5 SSD check for this principal. Raises on any violation; atomic."""
        ...

    def revoke_role(self, sub: str, role_id: str) -> None:
        ...

    def roles_of(self, sub: str) -> FrozenSet[str]:
        """Directly-assigned role ids for a principal."""
        ...

    # -- the effective-closure computation (the SSD substrate) ------------
    def effective_scopes(self, sub: str) -> FrozenSet[str]:
        """Union over the principal's roles of the TRANSITIVE closure of
        RoleScopeGrant through RoleHierarchy (PLAN §3.5 step 1)."""
        ...

    def role_scope_closure(self, role_id: str) -> FrozenSet[str]:
        """Effective scopes of a role including everything it inherits."""
        ...

    def principals_assigned_role(self, role_id: str) -> FrozenSet[str]:
        """Every principal TRANSITIVELY assigned role_id (downward fan-out, §3.5 step 0)."""
        ...

    # -- agent keys --------------------------------------------------------
    def register_agent_key(self, key: AgentKey) -> None:
        """Register the PUBLIC half of a per-agent key under a new kid (§3.6)."""
        ...

    def get_agent_keys(self, sub: str) -> List[AgentKey]:
        ...

    def set_agent_key_status(self, sub: str, kid: str, status: str) -> None:
        ...

    # -- budget policy -----------------------------------------------------
    def put_budget_policy(self, policy: BudgetPolicy) -> None:
        ...

    def get_budget_policy(self, owner: str) -> Optional[BudgetPolicy]:
        ...

    # -- audit -------------------------------------------------------------
    def append_audit(self, event: Dict[str, object]) -> None:
        """Append-only audit line — the canonical 'who did this' truth (§9.0)."""
        ...


# ---------------------------------------------------------------------------
# HotStore — the hot, rebuildable index. Denylist + budget counters + kill
# switch + pub/sub. Correctness NEVER depends on its persistence — an RS resyncs
# from the durable Store (§4.6).
# ---------------------------------------------------------------------------

@runtime_checkable
class HotStore(Protocol):
    # -- revocation denylist (three granularities, §4.6) -------------------
    def deny_jti(self, jti: str, exp: int) -> int:
        """Surgical: revoke one token. GC'd at exp. Returns the new epoch."""
        ...

    def is_jti_denied(self, jti: str) -> bool:
        ...

    def set_revoked_before(self, sub: str, epoch_ts: int) -> int:
        """Principal (agent) kill: deny all of sub's tokens with iat < epoch_ts.
        Returns the new revocation epoch."""
        ...

    def revoked_before(self, sub: str) -> Optional[int]:
        """The revoked_before watermark for sub, or None."""
        ...

    def disable_client(self, client_id: str) -> int:
        """Client/key: block re-mint for a client_id. Returns the new epoch."""
        ...

    def is_client_disabled(self, client_id: str) -> bool:
        ...

    def retire_kid(self, kid: str) -> int:
        """Mass revocation: retire an AS signing kid (Redis-independent kill also
        served via JWKS prune, §7.3). Returns the new epoch."""
        ...

    def is_kid_retired(self, kid: str) -> bool:
        ...

    # -- kill switch (graduated G0/G1/G2, §7.2) ---------------------------
    def set_killswitch(self, level: str, epoch: int) -> None:
        """Set the global kill level (G0|G1|G2) with a monotonic epoch."""
        ...

    def killswitch(self) -> Tuple[str, int]:
        """(level, epoch). Read on every gated call (§6.6 step 0)."""
        ...

    # -- epoch / freshness (staleness guard, fail-closed) ------------------
    def current_epoch(self) -> int:
        """The monotonic revocation epoch, bumped on every revocation change."""
        ...

    def heartbeat(self) -> Tuple[int, float]:
        """(epoch, ts) — the denylist:heartbeat (~500ms cadence). A stale RS fails
        its destructive path closed."""
        ...

    # -- budget counters (live state; policy lives in the Store) -----------
    def incr_concurrency(self, sub: str, cls: Optional[str] = None) -> int:
        """Leased INCR semaphore acquire; returns the new in-flight count."""
        ...

    def decr_concurrency(self, sub: str, cls: Optional[str] = None) -> int:
        """DECR on completion (release in finally)."""
        ...

    def get_counter(self, key: str) -> int:
        ...

    def set_counter(self, key: str, value: int, ttl_ms: Optional[int] = None) -> None:
        ...

    # -- pub/sub fan-out SHAPE (documented; real impl is Redis, §4.6) ------
    def publish_revocation(self, event: Dict[str, object]) -> None:
        """Publish a revocation delta to the `auth:revocations` channel. The
        in-process impl records it for tests; the Redis impl PUBLISHes so every
        RS's in-memory denylist cache applies the delta and advances last_epoch."""
        ...

    def drain_revocations(self) -> List[Dict[str, object]]:
        """Test-surface: pull published deltas since last drain (in-process only)."""
        ...


# ---------------------------------------------------------------------------
# Signer — sign/verify over the JWT signing input + kid + alg. The token minter
# builds the compact JWS on top of this; swapping HMAC(test) -> EdDSA(prod) is a
# config swap. verify() lets a validator check without importing the primitive.
# ---------------------------------------------------------------------------

@runtime_checkable
class Signer(Protocol):
    @property
    def kid(self) -> str:
        """The key id written into the JOSE header and matched by validators."""
        ...

    @property
    def alg(self) -> str:
        """The JWS `alg` (e.g. HS256 for the test-signer, EdDSA/ES256 in prod)."""
        ...

    def sign(self, signing_input: bytes) -> bytes:
        """Return the raw signature over `signing_input` (the ASCII
        `base64url(header) + '.' + base64url(payload)`). MUST raise loudly, never
        return a fake/empty signature, if the primitive is unavailable."""
        ...

    def verify(self, signing_input: bytes, signature: bytes) -> bool:
        """Constant-time verify. False on any mismatch or tamper."""
        ...


@runtime_checkable
class Verifier(Protocol):
    """Public-key-only verification seam (an RS holds this, not the private Signer)."""

    @property
    def kid(self) -> str:
        ...

    @property
    def alg(self) -> str:
        ...

    def verify(self, signing_input: bytes, signature: bytes) -> bool:
        ...
