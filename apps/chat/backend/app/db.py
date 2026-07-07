"""SQLite access — the ONE canonical store (ARCH §10; PLAN §1).

WAL mode, single-writer discipline, tiny append-only rows. The ``notifications`` and
``broadcasts`` tables ARE the canonical feed; ``audit_log`` is the mutating-action
trail; ``push_outbox`` is operational state. **No DELETE or UPDATE path exists for
envelope content** — append-only by construction (the only UPDATEs are ack/revoke
state columns and dedup collapse counters, never body/title/kind).

The schema DDL below is the verbatim realization of PLAN §1.1–§1.4.
"""
from __future__ import annotations

import sqlite3
import threading
from pathlib import Path

SCHEMA_VERSION = 1

# --- PLAN §1.1 notifications (the unified envelope) --------------------------------
_DDL = r"""
CREATE TABLE IF NOT EXISTS notifications (
  seq             INTEGER PRIMARY KEY,          -- rowid; total order; replay comparator
  notification_id TEXT NOT NULL UNIQUE,         -- 'N-' + monotonic ULID; the SSE cursor
  created_at      TEXT NOT NULL,                -- Chat server clock only
  agent_id        TEXT NOT NULL,                -- auth `sub`, stamped server-side — NEVER caller-supplied
  kind            TEXT NOT NULL CHECK (kind IN ('escalation','needs_review','done')),
  priority        INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  title           TEXT NOT NULL,                -- <=120 chars, plaintext
  body            TEXT NOT NULL,                -- <=4000 chars, markdown, stored AS POSTED (audit fidelity)
  tags            TEXT NOT NULL DEFAULT '[]',   -- JSON array of <=8 short strings
  ticket_id       TEXT,                         -- opaque, verbatim (T-...); optional
  fencing_token   TEXT,                         -- stored verbatim if supplied; advisory only (PLAN §15.4)
  source_system   TEXT CHECK (source_system IN ('board','mc','notes')),
  source_kind     TEXT CHECK (source_kind IN ('ticket','review','note')),
  source_id       TEXT,                         -- opaque foreign id; all three set or all three NULL
  dedup_key       TEXT,                         -- opaque <=128; semantic collapse
  op_id           TEXT NOT NULL,                -- caller-minted idempotency key
  repeat_count    INTEGER NOT NULL DEFAULT 0,   -- bumped on dedup collapse
  last_seen_at    TEXT NOT NULL,                -- bumped on dedup collapse
  system_authored INTEGER NOT NULL DEFAULT 0,   -- 1 for Chat's own meta-notifications (PLAN §11.3/§9)
  last_pushed_at  TEXT,                         -- last ntfy push (bounds escalation re-push, PLAN §11.2)
  acked_at        TEXT, acked_by TEXT,          -- Chat-owned "operator saw it"
  resolved_at     TEXT, resolved_source TEXT    -- RESERVED: MC resolve-event subscriber only (seam #24, PENDING)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_op    ON notifications(agent_id, op_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dedup ON notifications(agent_id, dedup_key) WHERE dedup_key IS NOT NULL AND acked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_feed   ON notifications(acked_at, priority, seq);
CREATE INDEX IF NOT EXISTS idx_ticket ON notifications(ticket_id);

-- PLAN §1.2 broadcasts (operator->fleet advisory; UI-only; no agent read path)
CREATE TABLE IF NOT EXISTS broadcasts (
  seq          INTEGER PRIMARY KEY,
  broadcast_id TEXT NOT NULL UNIQUE,   -- 'B-' + ULID; app-INTERNAL id
  created_at   TEXT NOT NULL,
  created_by   TEXT NOT NULL,          -- operator sub, server-stamped
  body         TEXT NOT NULL,          -- <=2000 chars markdown, sanitized at render
  priority     INTEGER NOT NULL CHECK (priority BETWEEN 1 AND 5),
  expires_at   TEXT NOT NULL,          -- display-state only, row retained
  revoked_at   TEXT, revoked_by TEXT
);

-- PLAN §1.3 audit_log (append-only record of mutating actions)
CREATE TABLE IF NOT EXISTS audit_log (
  seq INTEGER PRIMARY KEY, at TEXT NOT NULL, actor_sub TEXT NOT NULL,
  action TEXT NOT NULL,   -- post|ack|broadcast|broadcast_revoke|push_delivered|push_failed|reject_secret_pattern|reject_validation|rate_limited
  object_id TEXT, detail TEXT
);

-- PLAN §1.4 push_outbox (at-least-once ntfy delivery; operational, non-canonical)
CREATE TABLE IF NOT EXISTS push_outbox (
  notification_id TEXT PRIMARY KEY REFERENCES notifications(notification_id),
  status TEXT NOT NULL DEFAULT 'pending',  -- pending|delivered|gave_up
  attempts INTEGER NOT NULL DEFAULT 0, last_attempt_at TEXT, delivered_at TEXT, next_attempt_at TEXT
);

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


class Database:
    """A tiny connection holder with a process-wide write lock.

    SQLite handles concurrent readers under WAL; writes are serialized through one
    lock so the single-writer discipline (PLAN §15.6) holds regardless of the ASGI
    worker/thread model. Reads open short-lived connections.
    """

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self._write_lock = threading.Lock()
        self._write_conn: sqlite3.Connection | None = None

    # -- lifecycle -----------------------------------------------------------------
    def connect(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._write_conn = self._new_conn()
        with self._write_conn:
            self._write_conn.executescript(_DDL)
            self._write_conn.execute(
                "INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', ?)",
                (str(SCHEMA_VERSION),),
            )

    def close(self) -> None:
        if self._write_conn is not None:
            self._write_conn.close()
            self._write_conn = None

    def _new_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path, check_same_thread=False, timeout=10.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        conn.execute("PRAGMA foreign_keys=ON")
        conn.execute("PRAGMA busy_timeout=5000")
        return conn

    # -- access --------------------------------------------------------------------
    def reader(self) -> sqlite3.Connection:
        """A fresh read connection (WAL: readers never block the writer)."""
        return self._new_conn()

    @property
    def write_lock(self) -> threading.Lock:
        return self._write_lock

    @property
    def writer(self) -> sqlite3.Connection:
        if self._write_conn is None:
            raise RuntimeError("Database.connect() has not been called")
        return self._write_conn
