/**
 * SQLite schema — verbatim from PLAN §3.2 (the rebuildable index; blobs+journals are canonical).
 * WAL mode, single-writer commit lock enforced in the store layer, busy_timeout set on open.
 */
export const SCHEMA_VERSION = 1;

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blobs (
  sha256        TEXT PRIMARY KEY,          -- 64 lowercase hex
  size_bytes    INTEGER NOT NULL,
  refcount      INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS artifacts (
  artifact_id        TEXT PRIMARY KEY,      -- UUIDv7, Drive-minted
  ticket_id          TEXT NOT NULL,         -- verbatim T-… (format-checked)
  logical_name       TEXT NOT NULL,
  current_version_id TEXT,                  -- NULL = delete-marked
  ticket_state       TEXT NOT NULL DEFAULT 'unverified_pending'
                     CHECK (ticket_state IN ('verified','unverified_pending','verified_absent')),
  created_by         TEXT NOT NULL,         -- auth sub, opaque
  created_at         TEXT NOT NULL,
  UNIQUE (ticket_id, logical_name)
);
CREATE INDEX IF NOT EXISTS ia_ticket ON artifacts (ticket_id);

CREATE TABLE IF NOT EXISTS artifact_versions (   -- APPEND-ONLY: never UPDATE/DELETE
  version_id       TEXT PRIMARY KEY,
  artifact_id      TEXT NOT NULL REFERENCES artifacts,
  seq              INTEGER NOT NULL,
  sha256           TEXT REFERENCES blobs,        -- NULL iff is_delete_marker
  ticket_id        TEXT NOT NULL,
  note_id          TEXT,
  created_by       TEXT NOT NULL,
  fencing_token    INTEGER,                       -- echoed by agent-kind; enforced §3.6
  op_id            TEXT NOT NULL,
  mime_sniffed     TEXT NOT NULL,
  mime_client_hint TEXT,
  size_bytes       INTEGER,
  original_name    TEXT NOT NULL,
  is_delete_marker INTEGER NOT NULL DEFAULT 0,
  derived_from_version_id TEXT,
  created_at       TEXT NOT NULL,
  UNIQUE (artifact_id, seq),
  UNIQUE (created_by, op_id)                       -- idempotency is PER-PRINCIPAL
);
CREATE INDEX IF NOT EXISTS iv_ticket ON artifact_versions (ticket_id, created_at DESC);
CREATE INDEX IF NOT EXISTS iv_artifact ON artifact_versions (artifact_id, seq DESC);

CREATE TABLE IF NOT EXISTS ticket_fences (         -- Drive-local fencing staleness state (§3.6)
  ticket_id  TEXT PRIMARY KEY,
  max_fence  INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS uploads (               -- staging state machine (§4.2)
  upload_id        TEXT PRIMARY KEY,
  state            TEXT NOT NULL CHECK (state IN ('pending','committed','aborted','expired')),
  created_by       TEXT NOT NULL,
  op_id            TEXT NOT NULL,
  ticket_id        TEXT NOT NULL,
  logical_name     TEXT NOT NULL,
  note_id          TEXT,
  fencing_token    INTEGER,
  mime_client_hint TEXT,
  expected_sha256  TEXT,
  artifact_id      TEXT,                            -- resolved/created at registration
  result_version_id TEXT,                           -- set on commit (idempotent replay)
  last_activity_at TEXT NOT NULL,
  bytes_staged     INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL,
  UNIQUE (created_by, op_id)
);
CREATE INDEX IF NOT EXISTS iu_state ON uploads (state, last_activity_at);

CREATE TABLE IF NOT EXISTS journal_watermark (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  journal_file TEXT NOT NULL,
  byte_offset  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (             -- append-only; state changes ALSO journaled
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts         TEXT NOT NULL,
  principal  TEXT NOT NULL,
  principal_kind TEXT NOT NULL,                     -- agent|service|human|anonymous
  action     TEXT NOT NULL,
  ticket_id  TEXT,
  artifact_id TEXT,
  version_id TEXT,
  outcome    TEXT NOT NULL DEFAULT 'ok',            -- ok|denied|rejected
  detail     TEXT
);
CREATE INDEX IF NOT EXISTS iaudit_ts ON audit_log (ts DESC);

CREATE TABLE IF NOT EXISTS ticket_checks (         -- rebuildable cache of Board existence checks
  ticket_id TEXT PRIMARY KEY,
  state TEXT NOT NULL,
  checked_at TEXT NOT NULL,
  next_check_at TEXT,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS daily_bytes (           -- per-principal-per-day quota ledger (§10.3)
  principal TEXT NOT NULL,
  day       TEXT NOT NULL,                          -- YYYY-MM-DD UTC
  bytes     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (principal, day)
);
`;
