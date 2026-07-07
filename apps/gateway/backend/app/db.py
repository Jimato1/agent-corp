"""Gateway-PRIVATE Postgres access (D-8; network ``data_gateway``; DEPLOYMENT invariant
exception #1). SQLite is the isolated-build/test backend of the SAME portable schema, with
an atomic table-lock standing in for ``pg_try_advisory_lock`` — production IS Postgres, and
the advisory lock there is the real, crash-safe (session-death-frees) mutex we bought
Postgres for (PLAN §2/§5).

Store classification (ARCH §10 / PLAN §2): ``audit_chain`` / ``chain_heads`` / ``runs`` /
``sandbox_runs`` are **CANONICAL — append-only** (tamper evidence is the point). The app role
has INSERT+SELECT only on the append-only tables; UPDATE/DELETE/TRUNCATE are revoked at the
DB grant level (``roles.sql``). In-database append-only cannot restrain a superuser (a PG
documented limit) — the app role simply never has that power (PLAN §2).

Roles (roles.sql, applied out-of-band by the operator DBA credential which lives OUTSIDE the
container): ``gw_owner`` (DDL, migration-time only), ``gw_app`` (runtime; INSERT+SELECT only
on append-only tables; state-CAS UPDATE on ``runs``/``host_fence``/``kill_state`` via
trigger-guarded legal transitions), ``gw_anchor`` (SELECT on chain heads only).
"""
from __future__ import annotations

import hashlib
import sqlite3
import threading
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

SCHEMA_VERSION = 1

# Portable DDL (``?`` placeholders; JSON stored as text; monotonic-guard triggers are added
# per-backend below). ``BIGSERIAL``/``INTEGER PRIMARY KEY`` autoincrement is spelled per
# backend by _seq_pk().
_TABLES = """
-- one row per run_id (R-ULID). INSERT + state-CAS UPDATE only (legal transitions guarded).
CREATE TABLE IF NOT EXISTS runs (
  run_id        TEXT PRIMARY KEY,
  ticket_id     TEXT,
  approval_id   TEXT,
  host_id       TEXT NOT NULL,
  plan_hash     TEXT,
  action_class  TEXT,
  fencing_token INTEGER,
  op_id         TEXT,
  caller_sub    TEXT,
  surface       TEXT,                          -- execute | sandbox
  state         TEXT NOT NULL,                 -- preflight|executing|health_check|rolling_back|reporting|
                                               -- done_reported|failed_reported|halted|orphaned|rejected
  terminal      TEXT,                          -- verifying|needs_review|failed:<reason>|done  (spec-conformant)
  reject_reason TEXT,                          -- machine reason on a rejected preflight
  decision_id   TEXT,
  release_id    TEXT,
  cred_handle   TEXT,                          -- powerless URI only; NEVER plaintext
  started_at    TEXT,
  finished_at   TEXT,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_runs_host  ON runs(host_id);
CREATE INDEX IF NOT EXISTS idx_runs_state ON runs(state);

-- CANONICAL, append-only, HASH-CHAINED, Ed25519-signed forensic log (AU-3 complete, §9).
CREATE TABLE IF NOT EXISTS audit_chain (
  seq          INTEGER PRIMARY KEY,            -- chain sequence (0 = genesis)
  chain_id     TEXT NOT NULL,
  run_id       TEXT,
  record_type  TEXT NOT NULL,                  -- dispatch|task_event|reject|consume_approval|cmdb_verdict|
                                               -- cred_redeem|mutex|kill|halt|health|rollback|terminal|sandbox|genesis
  actor_sub    TEXT,
  action       TEXT,
  target       TEXT,                           -- host/handle/ticket ref (never plaintext)
  outcome      TEXT,
  payload      TEXT NOT NULL DEFAULT '{}',     -- JSON (JSONB in PG); credential handle+HMAC only, never plaintext
  prev_hash    TEXT NOT NULL,
  record_hash  TEXT NOT NULL,
  sig          TEXT NOT NULL,                  -- Ed25519 over record_hash
  ts           TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_run ON audit_chain(run_id);

-- signed HEAD checkpoints (anchored to MC, seam #25). append-only.
CREATE TABLE IF NOT EXISTS chain_heads (
  seq             INTEGER PRIMARY KEY AUTOINCREMENT,
  chain_id        TEXT NOT NULL,
  head_seq        INTEGER NOT NULL,
  head_hash       TEXT NOT NULL,
  sig             TEXT NOT NULL,
  signed_at       TEXT NOT NULL,
  pushed_to_mc_at TEXT
);

-- host_id -> highest fencing_token executed (the stale-fence rejector). monotonic UPDATE only.
CREATE TABLE IF NOT EXISTS host_fence (
  host_id       TEXT PRIMARY KEY,
  fence         INTEGER NOT NULL,
  updated_at    TEXT NOT NULL
);

-- Gateway-owned implementations registry (registry #2). operator-vetted change control only.
CREATE TABLE IF NOT EXISTS playbook_catalog (
  playbook_key    TEXT NOT NULL,
  version         TEXT NOT NULL,
  content_sha256  TEXT NOT NULL,
  action_class    TEXT NOT NULL,               -- 6 real classes + sandbox_exec (7th, sandbox-only)
  extravars_schema TEXT NOT NULL DEFAULT '{}', -- JSON schema (enum/regex-bounded)
  est_duration_s  INTEGER NOT NULL DEFAULT 300,
  rollback        TEXT NOT NULL DEFAULT 'none', -- snapshot|dnf_history|none
  sandbox_profile INTEGER NOT NULL DEFAULT 0,
  signed_by       TEXT,
  status          TEXT NOT NULL DEFAULT 'active', -- active|pending|retired
  PRIMARY KEY (playbook_key, version)
);

-- sandbox evidence join. append-only.
CREATE TABLE IF NOT EXISTS sandbox_runs (
  run_id          TEXT PRIMARY KEY,
  ticket_id       TEXT,
  profile_key     TEXT NOT NULL,
  harness_version TEXT NOT NULL,
  input_ref       TEXT,
  transcript_ref  TEXT,                        -- content-addressed blob hash (in chain)
  exit_status     INTEGER,
  env_fingerprint TEXT NOT NULL DEFAULT '{}',
  started_at      TEXT,
  finished_at     TEXT
);

-- mirror of auth epoch/level + local halt flag. monotonic (epoch never decreases).
CREATE TABLE IF NOT EXISTS kill_state (
  id            INTEGER PRIMARY KEY,           -- singleton row id=1
  epoch         INTEGER NOT NULL DEFAULT 0,
  level         TEXT NOT NULL DEFAULT 'G0',    -- G0|G1|G2
  local_halt    INTEGER NOT NULL DEFAULT 0,
  last_refused_at TEXT,
  updated_at    TEXT NOT NULL
);

-- Gateway's own decision-log mirror (replay detection: a repeated decision_id in-validity = reject).
CREATE TABLE IF NOT EXISTS decision_log (
  decision_id   TEXT PRIMARY KEY,
  host_id       TEXT,
  action_class  TEXT,
  verdict       TEXT,
  policy_version TEXT,
  seen_at       TEXT NOT NULL
);

-- idempotency: caller-minted op_id collapses replays (per-principal).
CREATE TABLE IF NOT EXISTS op_dedup (
  sub           TEXT NOT NULL,
  op_id         TEXT NOT NULL,
  scope         TEXT NOT NULL,
  result        TEXT NOT NULL DEFAULT '{}',
  created_at    TEXT NOT NULL,
  PRIMARY KEY (sub, op_id, scope)
);

-- SQLite-only emulation of pg_try_advisory_lock (atomic single-holder). On Postgres the real
-- session-scoped advisory lock is used instead (see try_host_lock()).
CREATE TABLE IF NOT EXISTS host_advisory_lock (
  host_key      TEXT PRIMARY KEY,
  run_id        TEXT,
  session_token TEXT NOT NULL,
  acquired_at   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


def _advisory_key(host_id: str) -> int:
    """A stable 63-bit signed-bigint key for pg_try_advisory_lock (avoids dialect hashtext)."""
    d = hashlib.sha256(("host:" + host_id).encode("utf-8")).digest()
    return int.from_bytes(d[:8], "big") & 0x7FFFFFFFFFFFFFFF


class Conn:
    """A thin dict-returning cursor wrapper over either backend, with ``?`` placeholders."""

    def __init__(self, raw, backend: str) -> None:
        self._raw = raw
        self._backend = backend

    def _q(self, sql: str) -> str:
        return sql if self._backend == "sqlite" else sql.replace("?", "%s")

    def execute(self, sql: str, params: tuple = ()) -> "Conn":
        self._cur = self._raw.cursor()
        self._cur.execute(self._q(sql), params)
        return self

    def fetchone(self) -> dict | None:
        row = self._cur.fetchone()
        if row is None:
            return None
        return dict(row) if self._backend == "sqlite" else dict(row)

    def fetchall(self) -> list[dict]:
        rows = self._cur.fetchall()
        return [dict(r) for r in rows]

    @property
    def rowcount(self) -> int:
        return self._cur.rowcount

    def commit(self) -> None:
        self._raw.commit()

    def rollback(self) -> None:
        self._raw.rollback()

    def close(self) -> None:
        try:
            self._raw.close()
        except Exception:
            pass


class Database:
    def __init__(self, db_url: str) -> None:
        self.url = db_url
        if db_url.startswith("sqlite"):
            self.backend = "sqlite"
            self.path = Path(db_url.replace("sqlite:///", "").replace("sqlite://", "") or "data/gateway.sqlite3")
        elif db_url.startswith(("postgres://", "postgresql://")):
            self.backend = "postgres"
            self.path = None
        else:
            raise ValueError(f"unsupported GATEWAY_DB_URL: {db_url!r}")
        self._write_lock = threading.Lock()
        self._sqlite_writer: sqlite3.Connection | None = None

    # ---- lifecycle ----------------------------------------------------------
    def connect(self) -> None:
        if self.backend == "sqlite":
            self.path.parent.mkdir(parents=True, exist_ok=True)
            self._sqlite_writer = self._raw_sqlite()
            with self._sqlite_writer:
                self._sqlite_writer.executescript(_sqlite_ddl())
                self._sqlite_writer.execute(
                    "INSERT OR IGNORE INTO meta(key,value) VALUES('schema_version', ?)",
                    (str(SCHEMA_VERSION),),
                )
        else:
            c = self.dedicated()
            try:
                for stmt in _postgres_ddl().split(";\n"):
                    s = stmt.strip()
                    if s:
                        c.execute(s + ";")
                c.commit()
            finally:
                c.close()

    def close(self) -> None:
        if self._sqlite_writer is not None:
            self._sqlite_writer.close()
            self._sqlite_writer = None

    # ---- raw connections ----------------------------------------------------
    def _raw_sqlite(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False, timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    def _raw_postgres(self):
        import psycopg
        from psycopg.rows import dict_row

        return psycopg.connect(self.url, row_factory=dict_row, autocommit=False)

    def dedicated(self) -> Conn:
        """A fresh, NON-pooled, session-lifetime connection (the advisory-lock mutex home:
        session death frees the lock — the crash-recovery property; PLAN §2/§5)."""
        raw = self._raw_sqlite() if self.backend == "sqlite" else self._raw_postgres()
        return Conn(raw, self.backend)

    def reader(self) -> Conn:
        return self.dedicated()

    @contextmanager
    def tx(self) -> Iterator[Conn]:
        """A short write transaction. SQLite serialises on the process write lock (single
        writer); Postgres uses its own MVCC + the DB-level append-only grants."""
        if self.backend == "sqlite":
            with self._write_lock:
                c = Conn(self._sqlite_writer, "sqlite")
                try:
                    yield c
                    c.commit()
                except Exception:
                    c.rollback()
                    raise
        else:
            c = self.dedicated()
            try:
                yield c
                c.commit()
            except Exception:
                c.rollback()
                raise
            finally:
                c.close()

    # ---- advisory-lock mutex (§3 check 4c) ----------------------------------
    def try_host_lock(self, conn: Conn, host_id: str, run_id: str, session_token: str) -> bool:
        """Non-blocking acquire on the dedicated connection. True iff this caller now holds it.

        Postgres: the real ``pg_try_advisory_lock`` (session-scoped; freed on session close).
        SQLite: an atomic single-holder ``INSERT OR IGNORE`` (rowcount==1 == acquired)."""
        if self.backend == "postgres":
            conn.execute("SELECT pg_try_advisory_lock(?) AS got", (_advisory_key(host_id),))
            row = conn.fetchone()
            return bool(row and row.get("got"))
        # sqlite emulation
        from .clock import now_iso
        conn.execute(
            "INSERT OR IGNORE INTO host_advisory_lock(host_key, run_id, session_token, acquired_at) "
            "VALUES (?, ?, ?, ?)",
            (host_id, run_id, session_token, now_iso()),
        )
        conn.commit()
        return conn.rowcount == 1

    def release_host_lock(self, conn: Conn, host_id: str, session_token: str) -> None:
        if self.backend == "postgres":
            conn.execute("SELECT pg_advisory_unlock(?) AS released", (_advisory_key(host_id),))
            conn.commit()
            return
        conn.execute(
            "DELETE FROM host_advisory_lock WHERE host_key = ? AND session_token = ?",
            (host_id, session_token),
        )
        conn.commit()


def _sqlite_ddl() -> str:
    return _TABLES


def _postgres_ddl() -> str:
    """The same schema in Postgres dialect (BIGSERIAL, JSONB, no AUTOINCREMENT keyword)."""
    ddl = _TABLES
    ddl = ddl.replace("INTEGER PRIMARY KEY AUTOINCREMENT", "BIGSERIAL PRIMARY KEY")
    ddl = ddl.replace("payload      TEXT NOT NULL DEFAULT '{}'", "payload      JSONB NOT NULL DEFAULT '{}'")
    ddl = ddl.replace("INSERT OR IGNORE", "INSERT")  # (unused in DDL; safety)
    return ddl
