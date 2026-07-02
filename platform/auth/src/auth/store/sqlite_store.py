"""auth.store.sqlite_store — the durable, canonical Store (stdlib sqlite3).

SQLite-NOW (settled decision #8): acceptable for THIS build, behind the
auth.core.interfaces.Store Protocol so Postgres + active-active is a config swap,
not a rewrite. This module is the SOLE WRITER to durable identity state (§9.0)
and the single home of the GRANT-TIME SSD enforcement (PLAN §3.5).

THE LOAD-BEARING PART — §3.5 enforcement, over the FULL downward-transitive
affected set, REJECTED atomically at write time so no token minter ever sees a
principal holding a conflicting holder pair:

  Every widening mutation (grant_scope_to_role / add_role_hierarchy_edge /
  assign_role / put_role) applies inside a transaction, then computes AFFECTED(M)
  = the complete downward fan-out (not the immediate endpoint), recomputes each
  affected principal's POST-mutation effective scope closure, and calls
  scopes.find_holder_conflict on it. Any conflict -> ROLLBACK the whole mutation
  and raise SoDViolation. This catches the "empty role inherits board:approve,
  then add a hierarchy edge from role:agent-executor" staging attack at the EDGE
  insert, because that edge's affected set is every executor.

Postgres-later: swap this class for a PostgresStore implementing the same
Protocol; the SSD algorithm is pure Python over the same relational shape.
"""
from __future__ import annotations

import json
import sqlite3
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
from ..core.principals import (
    AgentKey,
    BudgetPolicy,
    Principal,
    Role,
)


class SQLiteStore:
    """Durable Store over sqlite3. Manual transaction control (isolation_level=None)."""

    def __init__(self, path: str = ":memory:") -> None:
        self._conn = sqlite3.connect(path, isolation_level=None, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA foreign_keys = ON")
        self._init_schema()

    def close(self) -> None:
        self._conn.close()

    # -- schema ------------------------------------------------------------
    def _init_schema(self) -> None:
        c = self._conn
        c.executescript(
            """
            CREATE TABLE IF NOT EXISTS principals (
                sub TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                agent_class TEXT,
                client_id TEXT,
                status TEXT NOT NULL DEFAULT 'active',
                display_name TEXT NOT NULL DEFAULT '',
                online_token_forbidden INTEGER NOT NULL DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS roles (
                role_id TEXT PRIMARY KEY,
                kind_gate TEXT,          -- JSON array or NULL
                agent_class_gate TEXT,   -- JSON array or NULL
                description TEXT NOT NULL DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS role_scopes (
                role_id TEXT NOT NULL,
                scope TEXT NOT NULL,
                PRIMARY KEY (role_id, scope)
            );
            CREATE TABLE IF NOT EXISTS role_hierarchy (
                role TEXT NOT NULL,      -- `role` inherits `inherits`
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
                non_exportable INTEGER NOT NULL,
                status TEXT NOT NULL,
                cnf_jkt TEXT,
                proof_key_co_located INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (sub, kid)
            );
            CREATE TABLE IF NOT EXISTS budget_policies (
                owner TEXT PRIMARY KEY,
                blob TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS audit (
                seq INTEGER PRIMARY KEY AUTOINCREMENT,
                ts REAL NOT NULL,
                event TEXT NOT NULL
            );
            """
        )

    # -- transaction helpers ----------------------------------------------
    def _begin(self) -> None:
        self._conn.execute("BEGIN")

    def _commit(self) -> None:
        self._conn.execute("COMMIT")

    def _rollback(self) -> None:
        self._conn.execute("ROLLBACK")

    # ================================================================== #
    # Principals
    # ================================================================== #
    def put_principal(self, principal: Principal) -> None:
        self._conn.execute(
            """INSERT INTO principals
               (sub, kind, agent_class, client_id, status, display_name, online_token_forbidden)
               VALUES (?,?,?,?,?,?,?)
               ON CONFLICT(sub) DO UPDATE SET
                   client_id=excluded.client_id,
                   status=excluded.status,
                   display_name=excluded.display_name
               WHERE principals.kind=excluded.kind
                 AND (principals.agent_class IS excluded.agent_class
                      OR principals.agent_class=excluded.agent_class)
            """,
            (
                principal.sub,
                principal.kind,
                principal.agent_class,
                principal.client_id,
                principal.status,
                principal.display_name,
                1 if principal.online_token_forbidden else 0,
            ),
        )

    def get_principal(self, sub: str) -> Optional[Principal]:
        row = self._conn.execute("SELECT * FROM principals WHERE sub=?", (sub,)).fetchone()
        if row is None:
            return None
        return Principal(
            sub=row["sub"],
            kind=row["kind"],
            agent_class=row["agent_class"],
            client_id=row["client_id"],
            status=row["status"],
            display_name=row["display_name"] or "",
            online_token_forbidden=bool(row["online_token_forbidden"]),
        )

    def set_principal_status(self, sub: str, status: str) -> None:
        if self.get_principal(sub) is None:
            raise UnknownPrincipal(sub)
        self._conn.execute("UPDATE principals SET status=? WHERE sub=?", (status, sub))

    def list_principals(self) -> List[Principal]:
        rows = self._conn.execute("SELECT sub FROM principals ORDER BY sub").fetchall()
        return [self.get_principal(r["sub"]) for r in rows]  # type: ignore[misc]

    # ================================================================== #
    # Roles / scopes / hierarchy
    # ================================================================== #
    def put_role(self, role: Role) -> None:
        for scope in role.direct_scopes:
            if not S.is_valid_scope(scope):
                raise UnknownScope(scope)
        self._begin()
        try:
            self._conn.execute(
                """INSERT INTO roles (role_id, kind_gate, agent_class_gate, description)
                   VALUES (?,?,?,?)
                   ON CONFLICT(role_id) DO UPDATE SET
                       kind_gate=excluded.kind_gate,
                       agent_class_gate=excluded.agent_class_gate,
                       description=excluded.description""",
                (
                    role.role_id,
                    json.dumps(sorted(role.kind_gate)) if role.kind_gate else None,
                    json.dumps(sorted(role.agent_class_gate)) if role.agent_class_gate else None,
                    role.description,
                ),
            )
            self._conn.execute("DELETE FROM role_scopes WHERE role_id=?", (role.role_id,))
            for scope in sorted(role.direct_scopes):
                self._conn.execute(
                    "INSERT INTO role_scopes (role_id, scope) VALUES (?,?)", (role.role_id, scope)
                )
            # A replaced role may widen authority (or change gates) for principals
            # already assigned it -> the FULL grant-time invariant set, not SSD alone.
            self._enforce_grant_invariants(self.principals_assigned_role(role.role_id))
            self._commit()
        except Exception:
            self._rollback()
            raise

    def get_role(self, role_id: str) -> Optional[Role]:
        row = self._conn.execute("SELECT * FROM roles WHERE role_id=?", (role_id,)).fetchone()
        if row is None:
            return None
        scopes = frozenset(
            r["scope"]
            for r in self._conn.execute(
                "SELECT scope FROM role_scopes WHERE role_id=?", (role_id,)
            ).fetchall()
        )
        return Role(
            role_id=row["role_id"],
            direct_scopes=scopes,
            kind_gate=frozenset(json.loads(row["kind_gate"])) if row["kind_gate"] else None,
            agent_class_gate=frozenset(json.loads(row["agent_class_gate"]))
            if row["agent_class_gate"]
            else None,
            description=row["description"] or "",
        )

    def _require_role(self, role_id: str) -> Role:
        role = self.get_role(role_id)
        if role is None:
            raise UnknownRole(role_id)
        return role

    def grant_scope_to_role(self, role_id: str, scope: str) -> None:
        self._require_role(role_id)
        if not S.is_valid_scope(scope):
            raise UnknownScope(scope)
        self._begin()
        try:
            self._conn.execute(
                "INSERT OR IGNORE INTO role_scopes (role_id, scope) VALUES (?,?)", (role_id, scope)
            )
            # AFFECTED(M) = every principal transitively assigned role_id. Run the
            # FULL grant-time invariant set (SSD + per-holder kind + kind_gate +
            # non-exportable attestation) so a holder scope granted onto an
            # already-assigned role cannot fail open (review findings 1a / 2).
            self._enforce_grant_invariants(self.principals_assigned_role(role_id))
            self._commit()
        except Exception:
            self._rollback()
            raise

    def add_role_hierarchy_edge(self, role: str, inherits: str) -> None:
        self._require_role(role)
        self._require_role(inherits)
        if role == inherits:
            raise RoleHierarchyError(f"role {role!r} cannot inherit itself")
        self._begin()
        try:
            self._conn.execute(
                "INSERT OR IGNORE INTO role_hierarchy (role, inherits) VALUES (?,?)",
                (role, inherits),
            )
            # Cycle check on the POST-insert graph.
            if self._creates_cycle():
                raise RoleHierarchyError(
                    f"hierarchy edge {role!r} -> {inherits!r} creates a cycle"
                )
            # AFFECTED(M) = every principal that now inherits `inherits`
            #             = every principal transitively assigned `role`. Full
            # grant-time invariant set over the fan-out (review findings 1a / 2):
            # a hierarchy edge that reaches a holder scope / a kind-gated role
            # must be refused for a soft-key or wrong-kind principal, not just SSD.
            self._enforce_grant_invariants(self.principals_assigned_role(role))
            self._commit()
        except Exception:
            self._rollback()
            raise

    # ================================================================== #
    # Assignments
    # ================================================================== #
    def assign_role(self, sub: str, role_id: str) -> None:
        principal = self.get_principal(sub)
        if principal is None:
            raise UnknownPrincipal(sub)
        role = self._require_role(role_id)

        # (1) Kind-gating (§3.5 guarantee 2) — checked before any write.
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

        self._begin()
        try:
            self._conn.execute(
                "INSERT OR IGNORE INTO assignments (sub, role_id) VALUES (?,?)", (sub, role_id)
            )
            # (2) The FULL grant-time invariant set over this principal's
            #     post-assignment closure: §3.5 SSD holder-pair conflict, §3.5
            #     per-holder kind restriction, §3.5 g2 role kind/agent_class gates,
            #     and the §3.6/finding-1a non-exportable-key attestation. The SAME
            #     helper runs on grant_scope_to_role / add_role_hierarchy_edge /
            #     put_role, so none of the four widening paths can fail open.
            self._enforce_grant_invariants({sub})
            self._commit()
        except Exception:
            self._rollback()
            raise

    def revoke_role(self, sub: str, role_id: str) -> None:
        self._conn.execute("DELETE FROM assignments WHERE sub=? AND role_id=?", (sub, role_id))

    def roles_of(self, sub: str) -> FrozenSet[str]:
        return frozenset(
            r["role_id"]
            for r in self._conn.execute(
                "SELECT role_id FROM assignments WHERE sub=?", (sub,)
            ).fetchall()
        )

    # ================================================================== #
    # Effective-closure computation (the SSD substrate, PLAN §3.5)
    # ================================================================== #
    def _hierarchy_edges(self) -> List[Tuple[str, str]]:
        return [
            (r["role"], r["inherits"])
            for r in self._conn.execute("SELECT role, inherits FROM role_hierarchy").fetchall()
        ]

    def _adjacency(self) -> Dict[str, List[str]]:
        adj: Dict[str, List[str]] = {}
        for role, inh in self._hierarchy_edges():
            adj.setdefault(role, []).append(inh)
        return adj

    def _role_closure_roles(self, role_id: str) -> Set[str]:
        """The set of roles reachable from role_id via `inherits` edges (incl. itself).
        Uses the shared pure graph helper so SQLite and Postgres compute identical
        closures (Stage-5 parity)."""
        return GRAPH.reachable(self._adjacency(), role_id)

    def _creates_cycle(self) -> bool:
        return GRAPH.has_cycle(self._adjacency())

    def _direct_scopes(self, role_id: str) -> Set[str]:
        return {
            r["scope"]
            for r in self._conn.execute(
                "SELECT scope FROM role_scopes WHERE role_id=?", (role_id,)
            ).fetchall()
        }

    def role_scope_closure(self, role_id: str) -> FrozenSet[str]:
        out: Set[str] = set()
        for r in self._role_closure_roles(role_id):
            out |= self._direct_scopes(r)
        return frozenset(out)

    def effective_scopes(self, sub: str) -> FrozenSet[str]:
        out: Set[str] = set()
        for role_id in self.roles_of(sub):
            out |= self.role_scope_closure(role_id)
        return frozenset(out)

    def _effective_roles(self, sub: str) -> Set[str]:
        out: Set[str] = set()
        for role_id in self.roles_of(sub):
            out |= self._role_closure_roles(role_id)
        return out

    def effective_roles(self, sub: str) -> Set[str]:
        """Public alias used by the shared grant-time invariant facade (auth.store
        ._invariants). Same value as the private helper; exposed so the enforcement
        code is identical across the SQLite and Postgres backends."""
        return self._effective_roles(sub)

    def principals_assigned_role(self, role_id: str) -> FrozenSet[str]:
        """Every principal whose EFFECTIVE role set includes role_id (downward fan-out)."""
        result: Set[str] = set()
        for r in self._conn.execute("SELECT sub FROM principals").fetchall():
            sub = r["sub"]
            if role_id in self._effective_roles(sub):
                result.add(sub)
        return frozenset(result)

    # ================================================================== #
    # The §3.5 enforcement leaf + the attestation invariant
    # ================================================================== #
    def _enforce_grant_invariants(self, affected_subs: FrozenSet[str] | Set[str]) -> None:
        """Delegate the COMPLETE grant-time invariant set to the shared, backend-
        agnostic enforcement (auth.store._invariants) so the SQLite and Postgres
        backends run IDENTICAL SSD/attestation/kind logic — the 247 unit tests that
        exercise this store are therefore a faithful regression for the Postgres
        path (Stage-5 migration parity by construction). Any raise leaves the
        caller's open transaction to roll back atomically."""
        INV.enforce_grant_invariants(self, affected_subs)

    # ================================================================== #
    # Agent keys
    # ================================================================== #
    def register_agent_key(self, key: AgentKey) -> None:
        self._conn.execute(
            """INSERT INTO agent_keys
               (sub, kid, public_jwk, alg, storage_tier, non_exportable, status,
                cnf_jkt, proof_key_co_located)
               VALUES (?,?,?,?,?,?,?,?,?)
               ON CONFLICT(sub, kid) DO UPDATE SET
                   public_jwk=excluded.public_jwk, alg=excluded.alg,
                   storage_tier=excluded.storage_tier, non_exportable=excluded.non_exportable,
                   status=excluded.status, cnf_jkt=excluded.cnf_jkt,
                   proof_key_co_located=excluded.proof_key_co_located""",
            (
                key.sub,
                key.kid,
                json.dumps(key.public_jwk),
                key.alg,
                key.storage_tier,
                1 if key.non_exportable else 0,
                key.status,
                key.cnf_jkt,
                1 if key.proof_key_co_located else 0,
            ),
        )

    def get_agent_keys(self, sub: str) -> List[AgentKey]:
        rows = self._conn.execute("SELECT * FROM agent_keys WHERE sub=?", (sub,)).fetchall()
        out: List[AgentKey] = []
        for row in rows:
            out.append(
                AgentKey(
                    sub=row["sub"],
                    kid=row["kid"],
                    public_jwk=json.loads(row["public_jwk"]),
                    alg=row["alg"],
                    storage_tier=row["storage_tier"],
                    non_exportable=bool(row["non_exportable"]),
                    status=row["status"],
                    cnf_jkt=row["cnf_jkt"],
                    proof_key_co_located=bool(row["proof_key_co_located"]),
                )
            )
        return out

    def set_agent_key_status(self, sub: str, kid: str, status: str) -> None:
        self._conn.execute(
            "UPDATE agent_keys SET status=? WHERE sub=? AND kid=?", (status, sub, kid)
        )

    # ================================================================== #
    # Budget policy
    # ================================================================== #
    def put_budget_policy(self, policy: BudgetPolicy) -> None:
        blob = json.dumps(_budget_to_dict(policy))
        self._conn.execute(
            """INSERT INTO budget_policies (owner, blob) VALUES (?,?)
               ON CONFLICT(owner) DO UPDATE SET blob=excluded.blob""",
            (policy.owner, blob),
        )

    def get_budget_policy(self, owner: str) -> Optional[BudgetPolicy]:
        row = self._conn.execute(
            "SELECT blob FROM budget_policies WHERE owner=?", (owner,)
        ).fetchone()
        if row is None:
            return None
        return _budget_from_dict(json.loads(row["blob"]))

    # ================================================================== #
    # Audit
    # ================================================================== #
    def append_audit(self, event: Dict[str, object]) -> None:
        self._conn.execute(
            "INSERT INTO audit (ts, event) VALUES (?,?)", (time.time(), json.dumps(event))
        )

    def read_audit(self) -> List[Dict[str, object]]:
        return [
            json.loads(r["event"])
            for r in self._conn.execute("SELECT event FROM audit ORDER BY seq").fetchall()
        ]


# --- BudgetPolicy (de)serialization (kept local; no DDL for nested dataclasses) --

def _budget_to_dict(p: BudgetPolicy) -> Dict[str, object]:
    return {
        "owner": p.owner,
        "rate": None if p.rate is None else {"T": p.rate.emission_interval_ms, "tau": p.rate.burst_tau_ms},
        "concurrency": None
        if p.concurrency is None
        else {"global_max": p.concurrency.global_max, "per_class_max": p.concurrency.per_class_max},
        "lifetime": None
        if p.lifetime is None
        else {
            "max_lifetime_tool_calls": p.lifetime.max_lifetime_tool_calls,
            "max_wall_clock_ms": p.lifetime.max_wall_clock_ms,
            "no_progress_calls_trigger": p.lifetime.no_progress_calls_trigger,
            "no_progress_minutes_trigger": p.lifetime.no_progress_minutes_trigger,
        },
        "cooldowns_ms": p.cooldowns_ms,
        "fail_mode_overrides": p.fail_mode_overrides,
        "version": p.version,
    }


def _budget_from_dict(d: Dict[str, object]) -> BudgetPolicy:
    from ..core.principals import ConcurrencyLimit, LifetimeLimit, RateLimit

    rate = d.get("rate")
    conc = d.get("concurrency")
    life = d.get("lifetime")
    return BudgetPolicy(
        owner=d["owner"],  # type: ignore[index]
        rate=None if not rate else RateLimit(rate["T"], rate["tau"]),  # type: ignore[index]
        concurrency=None
        if not conc
        else ConcurrencyLimit(conc["global_max"], dict(conc.get("per_class_max", {}))),  # type: ignore[index]
        lifetime=None
        if not life
        else LifetimeLimit(
            life.get("max_lifetime_tool_calls"),  # type: ignore[union-attr]
            life.get("max_wall_clock_ms"),
            life.get("no_progress_calls_trigger"),
            life.get("no_progress_minutes_trigger"),
        ),
        cooldowns_ms=dict(d.get("cooldowns_ms", {})),  # type: ignore[arg-type]
        fail_mode_overrides=dict(d.get("fail_mode_overrides", {})),  # type: ignore[arg-type]
        version=int(d.get("version", 1)),  # type: ignore[arg-type]
    )
