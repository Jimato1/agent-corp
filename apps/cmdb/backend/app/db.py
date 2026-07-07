"""SQLite access (ARCH §10; PLAN §1).

Store classification, honestly (PLAN §1):

* ``decision_log``       — **CANONICAL, append-only** (every issued verdict; mirrored at the Gateway).
* ``policy_change_log``  — **CANONICAL, append-only, HASH-CHAINED** (§6.3 tamper-evidence).
* ``inventory_facts`` / ``discovered_agents`` — rebuildable (Wazuh mirror; blow away + re-sync).
* ``policy_projection``  — NOT stored here; the verdict reads the in-process snapshot, never SQLite.
* ``escalation_outbox``  — durable operational state (retry → Board, D-6c).
* ``confirm_tokens``     — ephemeral propose→confirm ceremony state (§6.3).

WAL, single-writer discipline. There is NO UPDATE/DELETE path for either canonical log's
content columns — append-only by construction (the only UPDATEs are on rebuildable mirror
rows and outbox delivery state).
"""
from __future__ import annotations

import sqlite3
import threading
from pathlib import Path

SCHEMA_VERSION = 1

_DDL = r"""
-- CANONICAL, append-only: every issued verdict (binding + advisory). §3.4.
CREATE TABLE IF NOT EXISTS decision_log (
  seq           INTEGER PRIMARY KEY,
  decision_id   TEXT NOT NULL UNIQUE,      -- 'D-' + ULID; = jti of the signed verdict
  evaluated_at  TEXT NOT NULL,             -- CMDB server clock only
  host_id       TEXT NOT NULL,
  action_class  TEXT NOT NULL,
  verdict       TEXT NOT NULL CHECK (verdict IN ('deny','ask','permit')),
  approval_mode TEXT,                       -- auto | ask | NULL (on hard deny)
  aud           TEXT,                        -- caller-selected audience of the signed token (NULL for advisory)
  binding       INTEGER NOT NULL DEFAULT 0, -- 1 if this was the signed POST /v1/decision path
  host_class    TEXT,                        -- managed | disposable
  verdict_basis TEXT,                        -- policy | sandbox_carve_out
  policy_version TEXT NOT NULL,             -- git commit the snapshot was built from
  caller_sub    TEXT,                        -- audit-canonical who (opaque)
  ticket_ref    TEXT,                        -- audit correlation ONLY (never an authorization input)
  reason        TEXT NOT NULL DEFAULT '[]'  -- JSON array of CMDB-authored enum reason codes
);
CREATE INDEX IF NOT EXISTS idx_decision_host ON decision_log(host_id, seq);
CREATE INDEX IF NOT EXISTS idx_decision_pv   ON decision_log(policy_version);

-- CANONICAL, append-only, HASH-CHAINED: the §6.3 tamper-evidence chain.
CREATE TABLE IF NOT EXISTS policy_change_log (
  seq              INTEGER PRIMARY KEY,      -- chain sequence (0 = genesis)
  prev_hash        TEXT NOT NULL,
  hash             TEXT NOT NULL,            -- sha256 over (seq,prev_hash,ts,sub,jti,edit_kind,weakening,diff_hash,git_commit)
  ts               TEXT NOT NULL,
  sub              TEXT NOT NULL,            -- operator principal (op:*)
  jti              TEXT,                     -- the holder token's jti (audit/revocation key)
  session          TEXT,                     -- auth session id when present
  edit_kind        TEXT NOT NULL,            -- e.g. snapshot_capability | add_freeze | break_glass | genesis | wazuh_bind
  weakening        INTEGER NOT NULL DEFAULT 0,
  diff_hash        TEXT,                     -- sha256 of the rendered typed diff (confirm binds here)
  git_commit       TEXT NOT NULL,            -- the policy repo commit this row corresponds to
  confirm_token_id TEXT
);

-- rebuildable Wazuh mirror (every synced field is provenance 'host-originated', ARCH §12).
CREATE TABLE IF NOT EXISTS inventory_facts (
  host_id                  TEXT PRIMARY KEY,
  os_family                TEXT,
  distro                   TEXT,
  distro_version           TEXT,
  arch                     TEXT,
  package_manager          TEXT,
  ip                       TEXT,
  liveness                 TEXT,             -- active | disconnected | never_connected
  syscollector_scan_interval TEXT,           -- D-6c fact
  provenance               TEXT NOT NULL DEFAULT 'host-originated',
  last_seen                TEXT,
  updated_at               TEXT NOT NULL
);

-- rebuildable discovery queue: agents Wazuh reports that have NO host record yet.
CREATE TABLE IF NOT EXISTS discovered_agents (
  wazuh_agent_id  TEXT PRIMARY KEY,
  reported_name   TEXT,                       -- host-originated / attacker-influenceable
  reported_os     TEXT,                       -- host-originated
  reported_group  TEXT,                       -- UI-only tiering suggestion (advisory)
  first_seen      TEXT NOT NULL,
  last_seen       TEXT NOT NULL,
  bound_host_id   TEXT                         -- set on operator-confirmed bind (then excluded from the queue)
);

-- durable escalation outbox → Board (D-6c). Degraded-but-honest until svc:cmdb + Board intake exist.
CREATE TABLE IF NOT EXISTS escalation_outbox (
  id              INTEGER PRIMARY KEY,
  kind            TEXT NOT NULL,              -- needs_tiering | window_ambiguity | break_glass_posthoc | ...
  target_host     TEXT,
  dedup_key       TEXT,                        -- kind+host pair dedup for window_ambiguity etc.
  payload         TEXT NOT NULL DEFAULT '{}',  -- host-originated strings are provenance-tagged inside
  state           TEXT NOT NULL DEFAULT 'queued', -- queued | delivered | gave_up
  attempts        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  last_attempt_at TEXT,
  delivered_at    TEXT,
  board_ticket_id TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_escalation_dedup ON escalation_outbox(kind, dedup_key)
  WHERE dedup_key IS NOT NULL AND state != 'delivered';

-- ephemeral propose→confirm ceremony state (§6.3). Single-use, TTL-bound, diff-hash-bound.
CREATE TABLE IF NOT EXISTS confirm_tokens (
  token           TEXT PRIMARY KEY,          -- 'cft-' + ULID
  sub             TEXT NOT NULL,             -- proposer principal (pinned at confirm)
  cnf_jkt         TEXT,                       -- proposer's sender-constraining thumbprint (pinned at confirm)
  edit_kind       TEXT NOT NULL,
  weakening       INTEGER NOT NULL DEFAULT 0,
  diff_hash       TEXT NOT NULL,             -- confirm must re-present this exact hash
  diff_json       TEXT NOT NULL,             -- the typed diff to apply
  blast_json      TEXT NOT NULL DEFAULT '{}',
  snapshot_commit TEXT NOT NULL,             -- HEAD at propose; drift => start over
  created_at      TEXT NOT NULL,
  expires_at      TEXT NOT NULL,
  used            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


class Database:
    """A tiny connection holder with a process-wide write lock (single-writer discipline)."""

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
