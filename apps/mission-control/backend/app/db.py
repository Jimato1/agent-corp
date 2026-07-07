"""SQLite access — MC's one DB, two honesty classes (PLAN §3).

MC owns almost no state: every widget binds to an upstream authority and MC's cache
is disposable. What lives here:

* **Disposable projections (§3.1)** — ``agent_view`` / ``fleet_view`` (heartbeat-sourced;
  the liveness engine needs server-side per-agent state). ``queue_view`` / ``budget_view``
  / ``posture_view`` / ``ticket_view`` are computed-on-read from upstream with a short-TTL
  in-memory cache (they are NOT persisted here — "a missing source looks missing"), so
  they never become a second source of truth.
* **Durable MC-owned stores (§3.2)** — the ONLY state MC actually owns:
  - ``audit_anchor`` (**CANONICAL, append-only**) — seam #25 receive-and-retain of the
    Gateway's signed audit-chain HEADs, idempotent by ``(chain_id, seq_num)``.
  - ``resolve_log`` (durable operational) — the resolve-event feed's replay buffer;
    ``resolve_seq`` = rowid (the FROZEN Last-Event-ID cursor, contract §3).
  - ``guardrail_params`` (durable config) — D-12 thresholds, operator-set, NO compiled
    numbers (PLAN §4.3).
  - ``operator_state`` (durable convenience) — silences, saved filters, ack/claim marks
    keyed on ``(ticket_id, gate, entry)`` (gate-entry freshness, A10).
  - ``mc_audit`` (**CANONICAL, append-only**) — MC's own state-change audit, incl. every
    relay/action REQUEST MC issued with outcome (the request-side record — e.g. a kill
    press that never reached auth — exists nowhere else; ARCH §10 test).

WAL mode, single-writer discipline (mirrors apps/chat/db.py).
"""
from __future__ import annotations

import sqlite3
import threading
from pathlib import Path

SCHEMA_VERSION = 1

_DDL = r"""
-- ===== §3.1 DISPOSABLE PROJECTIONS (rebuildable; dropped on restore) =====

-- latest per-agent heartbeat frame + derived liveness + phi-accrual state.
CREATE TABLE IF NOT EXISTS agent_view (
  sub                TEXT PRIMARY KEY,       -- auth-minted, opaque
  runtime_instance_id TEXT,
  session_id         TEXT,
  claimed_ticket_id  TEXT,
  fencing_token      TEXT,                   -- Board-minted; zombie check vs Board current gen
  process_alive_ts   REAL,                   -- supervisor beat (epoch seconds)
  work_progress_ts   REAL,                   -- inner-loop progress beat
  step_seq           INTEGER,
  model_version      TEXT,
  persona_version    TEXT,
  drain_state        TEXT,                   -- active|draining|drained|quiescing|quiesced
  liveness           TEXT,                   -- derived: live|suspect|draining|drained|quiesced|wedged
  phi                REAL,                    -- phi-accrual suspicion figure
  last_arrival_ts    REAL,                   -- last frame arrival (for phi-accrual)
  mean_interval      REAL,                    -- rolling mean beat interval (phi-accrual)
  updated_at         REAL NOT NULL,
  frame_json         TEXT NOT NULL DEFAULT '{}'
);

-- latest fleet frame per runtime instance (roster denominator, dead-man state).
CREATE TABLE IF NOT EXISTS fleet_view (
  runtime_instance_id TEXT PRIMARY KEY,
  roster              INTEGER NOT NULL DEFAULT 0,  -- population denominator
  supervisor_ts       REAL,
  runtime_drain_state TEXT,
  updated_at          REAL NOT NULL,
  frame_json          TEXT NOT NULL DEFAULT '{}'
);

-- ===== §3.2 DURABLE MC-OWNED STORES =====

-- CANONICAL, append-only: Gateway audit-chain HEAD anchor (seam #25).
CREATE TABLE IF NOT EXISTS audit_anchor (
  received_seq  INTEGER PRIMARY KEY,          -- MC rowid; receipt order
  chain_id      TEXT NOT NULL,
  seq_num       INTEGER NOT NULL,             -- the Gateway's per-chain monotonic seq
  head_hash     TEXT NOT NULL,
  signed_at     TEXT,
  sig           TEXT,
  prev_seq      INTEGER,
  received_at   REAL NOT NULL,
  UNIQUE(chain_id, seq_num)                   -- idempotency (contract §2)
);
CREATE INDEX IF NOT EXISTS idx_anchor_chain ON audit_anchor(chain_id, seq_num);

-- durable operational (NOT canonical): the resolve-event replay buffer (contract §3).
CREATE TABLE IF NOT EXISTS resolve_log (
  resolve_seq  INTEGER PRIMARY KEY,           -- rowid == the FROZEN Last-Event-ID cursor
  ticket_id    TEXT NOT NULL,
  gate         TEXT NOT NULL,                 -- awaiting_approval|needs_review
  outcome      TEXT NOT NULL,                 -- approved|rejected|review_cleared|reworked
  actor_kind   TEXT NOT NULL,                 -- operator|cmdb_tier_policy
  resolved_at  TEXT NOT NULL,                 -- Board time if known else MC first-observation; STABLE across re-emits
  review_url   TEXT NOT NULL,
  created_at   REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_resolve_ticket ON resolve_log(ticket_id, gate, outcome);

-- durable config: D-12 thresholds + phi params + progress budgets — operator-set, no
-- compiled numbers (PLAN §4.3). `unset=1` => never enforced/classified (dark).
CREATE TABLE IF NOT EXISTS guardrail_params (
  key         TEXT PRIMARY KEY,
  value       TEXT,                            -- NULL/'' when unset
  is_unset    INTEGER NOT NULL DEFAULT 1,
  presizing   INTEGER NOT NULL DEFAULT 1,      -- 1 => PRE-SIZING bootstrap label (nag until operator confirms)
  restored    INTEGER NOT NULL DEFAULT 0,      -- 1 => RESTORED, re-confirm required (PLAN §3.3)
  updated_at  REAL,
  updated_by  TEXT
);

-- durable convenience: silences, saved filters, ack/claim marks (gate-entry-keyed, A10).
CREATE TABLE IF NOT EXISTS operator_state (
  id          INTEGER PRIMARY KEY,
  category    TEXT NOT NULL,                   -- silence|filter|ack|pref
  scope_key   TEXT NOT NULL,                   -- e.g. sub, "(ticket_id,gate,entry)", filter name
  value_json  TEXT NOT NULL DEFAULT '{}',
  created_by  TEXT,
  created_at  REAL NOT NULL,
  expires_at  REAL
);
CREATE INDEX IF NOT EXISTS idx_opstate ON operator_state(category, scope_key);

-- CANONICAL, append-only: MC's own state-change + request-side audit (ARCH §10 test).
CREATE TABLE IF NOT EXISTS mc_audit (
  seq        INTEGER PRIMARY KEY,
  at         TEXT NOT NULL,
  actor_sub  TEXT NOT NULL,
  action     TEXT NOT NULL,                    -- killswitch_relay|budget_clamp|wip_change|param_save|silence|anchor_gap|restore_gap|...
  object_id  TEXT,                             -- ticket_id / sub / chain_id / etc.
  outcome    TEXT,                             -- requested|confirmed|failed|halt_not_confirmed|...
  detail     TEXT
);

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


class Database:
    """A tiny connection holder with a process-wide write lock (WAL; single-writer)."""

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self._write_lock = threading.Lock()
        self._write_conn: sqlite3.Connection | None = None

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

    def reader(self) -> sqlite3.Connection:
        return self._new_conn()

    @property
    def write_lock(self) -> threading.Lock:
        return self._write_lock

    @property
    def writer(self) -> sqlite3.Connection:
        if self._write_conn is None:
            raise RuntimeError("Database.connect() has not been called")
        return self._write_conn

    def drop_projections(self) -> None:
        """Restore step: §3.1 projections are dropped and rebuilt live (PLAN §3.3)."""
        with self._write_lock, self._write_conn as conn:  # type: ignore[union-attr]
            conn.execute("DELETE FROM agent_view")
            conn.execute("DELETE FROM fleet_view")
