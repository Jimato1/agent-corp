"""auth.store.postgres_store — the durable, canonical Store on Postgres 16 (psycopg 3).

Stage-5 migration (settled decision #8): the PRODUCTION durable Store. It implements
auth.core.interfaces.Store exactly like the SQLite build-store, but on Postgres so the
identity ledger is durable + HA-capable (active-active auth app replicas over one shared
primary). The load-bearing SoD/attestation/kind enforcement is NOT reimplemented here —
it is the SAME shared code the SQLite store uses (auth.store._invariants) over the SAME
shared closure computation (auth.store._graph). So the 247-test suite that exercises the
SQLite store is a faithful regression for this class's decision logic; only the SQL
dialect + concurrency control differ.

TWO THINGS POSTGRES ADDS OVER SQLITE (both security-relevant, both handled here):
  1. MULTI-WRITER SSD SAFETY. SQLite had a single writer, so the "insert then recompute
     the affected set then reject" sequence was trivially atomic. With active-active auth,
     two replicas can each attempt a grant that is individually safe but JOINTLY creates a
     holder conflict (tx A adds board:approve, tx B adds gateway:execute to the same
     effective principal); under READ COMMITTED neither sees the other and BOTH commit —
     an SoD escape. Every widening mutation therefore runs at SERIALIZABLE and the insert +
     affected-set recompute + enforcement run on ONE connection inside ONE transaction, so
     the enforcement sees the uncommitted insert and Postgres aborts one of a pair of
     conflicting concurrent grants with a SerializationFailure (retried a bounded number of
     times, then surfaced). This is what keeps the immutable ConflictSet enforceable on the
     migrated substrate.
  2. read-your-writes: a single Postgres PRIMARY is the one source of truth, so a grant
     committed by replica A is immediately visible to replica B (no standby in the SoD read
     path). True DB failover (multi-node Patroni + Redis Sentinel) is the separate
     multi-node-hardware gate G9 — CANNOT-VERIFY-ON-A-LAPTOP (see security/THREAT_MODEL.md).

The psycopg driver is imported LAZILY in __init__ so this module imports (for the Protocol
conformance test) even in an environment without psycopg installed — mirroring the loud-on-
absence discipline of the EdDSA signer.
"""
from __future__ import annotations

import json
import random
import time
from typing import Dict, FrozenSet, List, Optional, Set, Tuple

from . import _graph as GRAPH
from . import _invariants as INV
from ..core import scopes as S
from ..core.errors import (
    KindGateViolation,
    RoleHierarchyError,
    UnknownPrincipal,
    UnknownRole,
    UnknownScope,
)
from ..core.principals import AgentKey, BudgetPolicy, Principal, Role
from .sqlite_store import _budget_from_dict, _budget_to_dict  # shared (de)serialization

# ── DDL (idempotent; run by auth.migrate on first boot) ─────────────────────────
SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS principals (
    sub TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    agent_class TEXT,
    client_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    display_name TEXT NOT NULL DEFAULT '',
    online_token_forbidden BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE TABLE IF NOT EXISTS roles (
    role_id TEXT PRIMARY KEY,
    kind_gate TEXT,
    agent_class_gate TEXT,
    description TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS role_scopes (
    role_id TEXT NOT NULL,
    scope TEXT NOT NULL,
    PRIMARY KEY (role_id, scope)
);
CREATE TABLE IF NOT EXISTS role_hierarchy (
    role TEXT NOT NULL,
    inherits TEXT NOT NULL,
    PRIMARY KEY (role, inherits)
);
CREATE TABLE IF NOT EXISTS assignments (
    sub TEXT NOT NULL,
    role_id TEXT NOT NULL,
    PRIMARY KEY (sub, role_id)
);
CREATE TABLE IF NOT EXISTS agent_keys (
    sub TEXT NOT NULL,
    kid TEXT NOT NULL,
    public_jwk TEXT NOT NULL,
    alg TEXT NOT NULL,
    storage_tier TEXT NOT NULL,
    non_exportable BOOLEAN NOT NULL,
    status TEXT NOT NULL,
    cnf_jkt TEXT,
    proof_key_co_located BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY (sub, kid)
);
CREATE TABLE IF NOT EXISTS budget_policies (
    owner TEXT PRIMARY KEY,
    blob TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
    seq BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ts DOUBLE PRECISION NOT NULL,
    event TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS assignments_role_idx ON assignments (role_id);
CREATE INDEX IF NOT EXISTS role_scopes_role_idx ON role_scopes (role_id);
"""


class _TxReader:
    """Exposes the auth.store._invariants.GrantReadFacade over ONE open transaction's
    cursor, so the grant-time enforcement reads the UNCOMMITTED insert (same tx)."""

    def __init__(self, store: "PostgresStore", cur) -> None:
        self._s = store
        self._cur = cur

    def effective_scopes(self, sub: str) -> FrozenSet[str]:
        return self._s._effective_scopes_cur(self._cur, sub)

    def effective_roles(self, sub: str) -> Set[str]:
        return self._s._effective_roles_cur(self._cur, sub)

    def get_principal(self, sub: str) -> Optional[Principal]:
        return self._s._get_principal_cur(self._cur, sub)

    def get_agent_keys(self, sub: str) -> List[AgentKey]:
        return self._s._get_agent_keys_cur(self._cur, sub)

    def get_role(self, role_id: str) -> Optional[Role]:
        return self._s._get_role_cur(self._cur, role_id)


class PostgresStore:
    """Durable Store on Postgres via a thread-safe psycopg ConnectionPool."""

    def __init__(
        self,
        dsn: str,
        *,
        min_size: int = 4,
        max_size: int = 16,
        serialize_retries: int = 6,
        create_schema: bool = True,
        max_lifetime: float = 1800.0,
    ) -> None:
        try:
            import psycopg
            from psycopg import IsolationLevel, errors
            from psycopg.rows import dict_row
            from psycopg_pool import ConnectionPool
        except ImportError as e:  # pragma: no cover - import guard
            raise RuntimeError(
                "PostgresStore requires 'psycopg[binary,pool]>=3.1' (see requirements.txt). "
                "It is imported lazily so the module still loads for the Protocol conformance "
                "test in an env without the driver — but it CANNOT run without it."
            ) from e
        self._psycopg = psycopg
        self._Iso = IsolationLevel
        self._pgerrors = errors
        self._retries = max(1, serialize_retries)

        # SERIALIZABLE is set POOL-WIDE on the CONNECTION (psycopg3's
        # Connection.transaction() takes NO isolation_level kwarg — that would raise
        # TypeError). Every widening grant therefore runs at SERIALIZABLE by
        # construction, so two concurrent jointly-conflicting grants cannot both
        # commit (one aborts 40001 and is retried). isolation_level is assigned on a
        # fresh pooled connection (no open tx) — the only place psycopg permits it.
        def _configure(conn):
            conn.isolation_level = IsolationLevel.SERIALIZABLE

        # Stage-6 pool tuning (all verified against psycopg_pool current docs):
        #  * check=ConnectionPool.check_connection — validate/replace a stale physical
        #    connection BEFORE checkout, so a PG restart / active-active failover does
        #    not 500 a kill-switch/revoke on a dead socket (HA correctness, not just
        #    perf). The ready-made value ships with the library.
        #  * max_lifetime=1800s — rotate connections cleanly across replicated
        #    primaries (default 3600s).
        #  * min_size=4 warm floor absorbs the first poll burst without paying
        #    synchronous connect latency on the hot verify path; max_size caps
        #    per-replica connections so the active-active pair stays under PG's
        #    max_connections (see optimization/NOTES.md for the fleet budget).
        self._pool = ConnectionPool(
            dsn, min_size=min_size, max_size=max_size,
            kwargs={"row_factory": dict_row}, configure=_configure,
            check=ConnectionPool.check_connection, max_lifetime=max_lifetime,
            open=False,
        )
        # wait=True so an UNREACHABLE Postgres crashes construction LOUDLY (a hard
        # dependency) instead of booting a replica that reports /healthz-200 while
        # every store-touching route 500s.
        self._pool.open(wait=True, timeout=10.0)
        if create_schema:
            self.init_schema()

    def close(self) -> None:
        self._pool.close()

    # ── schema ────────────────────────────────────────────────────────────────
    def init_schema(self) -> None:
        with self._pool.connection() as conn:
            with conn.transaction():
                conn.execute(SCHEMA_SQL)

    # ── low-level helpers ──────────────────────────────────────────────────────
    def _with_serialization_retry(self, fn):
        """Run fn() at the pool's SERIALIZABLE isolation with bounded retry on a
        40001 serialization failure; surface the failure after the last attempt
        (fail-closed — never a silent commit-less pass)."""
        last: Optional[Exception] = None
        for attempt in range(self._retries):
            try:
                return fn()
            except self._pgerrors.SerializationFailure as e:
                last = e
                # Bounded exponential backoff + full jitter so concurrent conflicting
                # widening grants don't re-collide in lockstep (thundering-herd 40001).
                # fn()'s `with self._pool.connection()` has already released its
                # connection before we reach here, so the sleep holds no pool slot.
                # Still fully FAIL-CLOSED: after the final attempt we re-raise the
                # SerializationFailure — never a silent, commit-less pass.
                if attempt < self._retries - 1:
                    time.sleep(min(0.1, random.uniform(0.0, 0.005 * (2 ** attempt))))
                continue
        assert last is not None
        raise last

    def _exec(self, sql: str, params: tuple = ()) -> None:
        def _do():
            with self._pool.connection() as conn:
                with conn.transaction():
                    conn.execute(sql, params)
        self._with_serialization_retry(_do)

    def _one(self, sql: str, params: tuple = ()):
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return cur.fetchone()

    def _all(self, sql: str, params: tuple = ()) -> list:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                cur.execute(sql, params)
                return cur.fetchall()

    def _run_widening(self, body) -> None:
        """Run a widening mutation `body(cur)` at SERIALIZABLE with bounded retry.
        `body` does the insert(s), computes the affected set, and calls
        INV.enforce_grant_invariants over a _TxReader on the SAME cursor. Any
        invariant raise rolls back the whole transaction and propagates (atomic
        reject); a SerializationFailure (a concurrent conflicting grant lost the
        race) is retried, then surfaced. Isolation is SERIALIZABLE via the pool
        configure() — transaction() takes no isolation kwarg in psycopg3."""
        def _do():
            with self._pool.connection() as conn:
                with conn.transaction():
                    with conn.cursor() as cur:
                        body(cur)
        self._with_serialization_retry(_do)

    # ================================================================== #
    # Principals
    # ================================================================== #
    def _get_principal_cur(self, cur, sub: str) -> Optional[Principal]:
        cur.execute("SELECT * FROM principals WHERE sub=%s", (sub,))
        row = cur.fetchone()
        if row is None:
            return None
        return Principal(
            sub=row["sub"], kind=row["kind"], agent_class=row["agent_class"],
            client_id=row["client_id"], status=row["status"],
            display_name=row["display_name"] or "",
            online_token_forbidden=bool(row["online_token_forbidden"]),
        )

    def put_principal(self, principal: Principal) -> None:
        # Immutability of kind/agent_class enforced by the ON CONFLICT WHERE clause
        # (null-safe IS NOT DISTINCT FROM), mirroring the SQLite guard.
        self._exec(
            """INSERT INTO principals
                 (sub, kind, agent_class, client_id, status, display_name, online_token_forbidden)
               VALUES (%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (sub) DO UPDATE SET
                   client_id=EXCLUDED.client_id,
                   status=EXCLUDED.status,
                   display_name=EXCLUDED.display_name
               WHERE principals.kind = EXCLUDED.kind
                 AND principals.agent_class IS NOT DISTINCT FROM EXCLUDED.agent_class""",
            (principal.sub, principal.kind, principal.agent_class, principal.client_id,
             principal.status, principal.display_name, principal.online_token_forbidden),
        )

    def get_principal(self, sub: str) -> Optional[Principal]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                return self._get_principal_cur(cur, sub)

    def set_principal_status(self, sub: str, status: str) -> None:
        with self._pool.connection() as conn:
            with conn.transaction():
                with conn.cursor() as cur:
                    if self._get_principal_cur(cur, sub) is None:
                        raise UnknownPrincipal(sub)
                    cur.execute("UPDATE principals SET status=%s WHERE sub=%s", (status, sub))

    def list_principals(self) -> List[Principal]:
        rows = self._all("SELECT sub FROM principals ORDER BY sub")
        out: List[Principal] = []
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                for r in rows:
                    p = self._get_principal_cur(cur, r["sub"])
                    if p is not None:
                        out.append(p)
        return out

    # ================================================================== #
    # Roles / scopes / hierarchy
    # ================================================================== #
    def _get_role_cur(self, cur, role_id: str) -> Optional[Role]:
        cur.execute("SELECT * FROM roles WHERE role_id=%s", (role_id,))
        row = cur.fetchone()
        if row is None:
            return None
        cur.execute("SELECT scope FROM role_scopes WHERE role_id=%s", (role_id,))
        scopes = frozenset(r["scope"] for r in cur.fetchall())
        return Role(
            role_id=row["role_id"], direct_scopes=scopes,
            kind_gate=frozenset(json.loads(row["kind_gate"])) if row["kind_gate"] else None,
            agent_class_gate=frozenset(json.loads(row["agent_class_gate"]))
            if row["agent_class_gate"] else None,
            description=row["description"] or "",
        )

    def get_role(self, role_id: str) -> Optional[Role]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                return self._get_role_cur(cur, role_id)

    def _require_role(self, role_id: str) -> Role:
        role = self.get_role(role_id)
        if role is None:
            raise UnknownRole(role_id)
        return role

    def put_role(self, role: Role) -> None:
        for scope in role.direct_scopes:
            if not S.is_valid_scope(scope):
                raise UnknownScope(scope)

        def body(cur):
            cur.execute(
                """INSERT INTO roles (role_id, kind_gate, agent_class_gate, description)
                   VALUES (%s,%s,%s,%s)
                   ON CONFLICT (role_id) DO UPDATE SET
                       kind_gate=EXCLUDED.kind_gate,
                       agent_class_gate=EXCLUDED.agent_class_gate,
                       description=EXCLUDED.description""",
                (role.role_id,
                 json.dumps(sorted(role.kind_gate)) if role.kind_gate else None,
                 json.dumps(sorted(role.agent_class_gate)) if role.agent_class_gate else None,
                 role.description),
            )
            cur.execute("DELETE FROM role_scopes WHERE role_id=%s", (role.role_id,))
            for scope in sorted(role.direct_scopes):
                cur.execute("INSERT INTO role_scopes (role_id, scope) VALUES (%s,%s)",
                            (role.role_id, scope))
            affected = self._principals_assigned_role_cur(cur, role.role_id)
            INV.enforce_grant_invariants(_TxReader(self, cur), affected)

        self._run_widening(body)

    def grant_scope_to_role(self, role_id: str, scope: str) -> None:
        self._require_role(role_id)
        if not S.is_valid_scope(scope):
            raise UnknownScope(scope)

        def body(cur):
            cur.execute(
                "INSERT INTO role_scopes (role_id, scope) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (role_id, scope),
            )
            affected = self._principals_assigned_role_cur(cur, role_id)
            INV.enforce_grant_invariants(_TxReader(self, cur), affected)

        self._run_widening(body)

    def add_role_hierarchy_edge(self, role: str, inherits: str) -> None:
        self._require_role(role)
        self._require_role(inherits)
        if role == inherits:
            raise RoleHierarchyError(f"role {role!r} cannot inherit itself")

        def body(cur):
            cur.execute(
                "INSERT INTO role_hierarchy (role, inherits) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (role, inherits),
            )
            if GRAPH.has_cycle(self._adjacency_cur(cur)):
                raise RoleHierarchyError(
                    f"hierarchy edge {role!r} -> {inherits!r} creates a cycle"
                )
            affected = self._principals_assigned_role_cur(cur, role)
            INV.enforce_grant_invariants(_TxReader(self, cur), affected)

        self._run_widening(body)

    # ================================================================== #
    # Assignments
    # ================================================================== #
    def assign_role(self, sub: str, role_id: str) -> None:
        def body(cur):
            principal = self._get_principal_cur(cur, sub)
            if principal is None:
                raise UnknownPrincipal(sub)
            role = self._get_role_cur(cur, role_id)
            if role is None:
                raise UnknownRole(role_id)
            # Kind-gating (§3.5 guarantee 2) — before the write, mirrors SQLite.
            if role.kind_gate is not None and principal.kind not in role.kind_gate:
                raise KindGateViolation(
                    f"role {role_id!r} is restricted to kinds {sorted(role.kind_gate)}; "
                    f"{sub!r} is kind={principal.kind!r}"
                )
            if role.agent_class_gate is not None and (
                principal.agent_class is None or principal.agent_class not in role.agent_class_gate
            ):
                raise KindGateViolation(
                    f"role {role_id!r} is restricted to agent_class {sorted(role.agent_class_gate)}; "
                    f"{sub!r} is agent_class={principal.agent_class!r}"
                )
            cur.execute(
                "INSERT INTO assignments (sub, role_id) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (sub, role_id),
            )
            INV.enforce_grant_invariants(_TxReader(self, cur), {sub})

        self._run_widening(body)

    def revoke_role(self, sub: str, role_id: str) -> None:
        self._exec("DELETE FROM assignments WHERE sub=%s AND role_id=%s", (sub, role_id))

    def _roles_of_cur(self, cur, sub: str) -> FrozenSet[str]:
        cur.execute("SELECT role_id FROM assignments WHERE sub=%s", (sub,))
        return frozenset(r["role_id"] for r in cur.fetchall())

    def roles_of(self, sub: str) -> FrozenSet[str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                return self._roles_of_cur(cur, sub)

    # ================================================================== #
    # Effective-closure computation (shared _graph; SSD substrate §3.5)
    # ================================================================== #
    def _adjacency_cur(self, cur) -> Dict[str, List[str]]:
        cur.execute("SELECT role, inherits FROM role_hierarchy")
        adj: Dict[str, List[str]] = {}
        for r in cur.fetchall():
            adj.setdefault(r["role"], []).append(r["inherits"])
        return adj

    def _role_closure_roles_cur(self, cur, role_id: str) -> Set[str]:
        return GRAPH.reachable(self._adjacency_cur(cur), role_id)

    def _direct_scopes_cur(self, cur, role_id: str) -> Set[str]:
        cur.execute("SELECT scope FROM role_scopes WHERE role_id=%s", (role_id,))
        return {r["scope"] for r in cur.fetchall()}

    def _role_scope_closure_cur(self, cur, role_id: str) -> FrozenSet[str]:
        out: Set[str] = set()
        for r in self._role_closure_roles_cur(cur, role_id):
            out |= self._direct_scopes_cur(cur, r)
        return frozenset(out)

    def role_scope_closure(self, role_id: str) -> FrozenSet[str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                return self._role_scope_closure_cur(cur, role_id)

    def _effective_scopes_cur(self, cur, sub: str) -> FrozenSet[str]:
        out: Set[str] = set()
        for role_id in self._roles_of_cur(cur, sub):
            out |= self._role_scope_closure_cur(cur, role_id)
        return frozenset(out)

    def effective_scopes(self, sub: str) -> FrozenSet[str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                return self._effective_scopes_cur(cur, sub)

    def _effective_roles_cur(self, cur, sub: str) -> Set[str]:
        out: Set[str] = set()
        for role_id in self._roles_of_cur(cur, sub):
            out |= self._role_closure_roles_cur(cur, role_id)
        return out

    def effective_roles(self, sub: str) -> Set[str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                return self._effective_roles_cur(cur, sub)

    def _principals_assigned_role_cur(self, cur, role_id: str) -> FrozenSet[str]:
        cur.execute("SELECT sub FROM principals")
        subs = [r["sub"] for r in cur.fetchall()]
        return frozenset(s for s in subs if role_id in self._effective_roles_cur(cur, s))

    def principals_assigned_role(self, role_id: str) -> FrozenSet[str]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                return self._principals_assigned_role_cur(cur, role_id)

    # ================================================================== #
    # Agent keys
    # ================================================================== #
    def register_agent_key(self, key: AgentKey) -> None:
        self._exec(
            """INSERT INTO agent_keys
                 (sub, kid, public_jwk, alg, storage_tier, non_exportable, status,
                  cnf_jkt, proof_key_co_located)
               VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT (sub, kid) DO UPDATE SET
                   public_jwk=EXCLUDED.public_jwk, alg=EXCLUDED.alg,
                   storage_tier=EXCLUDED.storage_tier, non_exportable=EXCLUDED.non_exportable,
                   status=EXCLUDED.status, cnf_jkt=EXCLUDED.cnf_jkt,
                   proof_key_co_located=EXCLUDED.proof_key_co_located""",
            (key.sub, key.kid, json.dumps(key.public_jwk), key.alg, key.storage_tier,
             key.non_exportable, key.status, key.cnf_jkt, key.proof_key_co_located),
        )

    def _get_agent_keys_cur(self, cur, sub: str) -> List[AgentKey]:
        cur.execute("SELECT * FROM agent_keys WHERE sub=%s", (sub,))
        out: List[AgentKey] = []
        for row in cur.fetchall():
            out.append(AgentKey(
                sub=row["sub"], kid=row["kid"], public_jwk=json.loads(row["public_jwk"]),
                alg=row["alg"], storage_tier=row["storage_tier"],
                non_exportable=bool(row["non_exportable"]), status=row["status"],
                cnf_jkt=row["cnf_jkt"], proof_key_co_located=bool(row["proof_key_co_located"]),
            ))
        return out

    def get_agent_keys(self, sub: str) -> List[AgentKey]:
        with self._pool.connection() as conn:
            with conn.cursor() as cur:
                return self._get_agent_keys_cur(cur, sub)

    def set_agent_key_status(self, sub: str, kid: str, status: str) -> None:
        self._exec("UPDATE agent_keys SET status=%s WHERE sub=%s AND kid=%s", (status, sub, kid))

    # ================================================================== #
    # Budget policy
    # ================================================================== #
    def put_budget_policy(self, policy: BudgetPolicy) -> None:
        self._exec(
            """INSERT INTO budget_policies (owner, blob) VALUES (%s,%s)
               ON CONFLICT (owner) DO UPDATE SET blob=EXCLUDED.blob""",
            (policy.owner, json.dumps(_budget_to_dict(policy))),
        )

    def get_budget_policy(self, owner: str) -> Optional[BudgetPolicy]:
        row = self._one("SELECT blob FROM budget_policies WHERE owner=%s", (owner,))
        if row is None:
            return None
        return _budget_from_dict(json.loads(row["blob"]))

    # ================================================================== #
    # Audit (append-only)
    # ================================================================== #
    def append_audit(self, event: Dict[str, object]) -> None:
        import time
        self._exec("INSERT INTO audit (ts, event) VALUES (%s,%s)",
                   (time.time(), json.dumps(event)))

    def read_audit(self) -> List[Dict[str, object]]:
        rows = self._all("SELECT event FROM audit ORDER BY seq")
        return [json.loads(r["event"]) for r in rows]
