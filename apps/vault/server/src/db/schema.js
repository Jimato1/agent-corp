/*
 * db/schema.js — the wrapper store (PLAN §5.3). SQLite + WAL, BEGIN IMMEDIATE + status-guarded CAS
 * (same single-writer discipline as the Board reference kit; D-14).
 *
 * Store classification (ARCH §10, PLAN §1):
 *   audit_local  = CANONICAL, append-only, hash-chained. Never UPDATE/DELETE (triggers enforce).
 *   releases     = canonical-operational; status transitions are single-statement CAS, INSERT-only otherwise.
 *   handles      = REBUILDABLE projection of OpenBao KV metadata + SSH roles.
 * (The plaintext credentials themselves live ONLY in OpenBao — never here. This DB stores references.)
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const SCHEMA = `
-- handles — rebuildable projection: handle -> {kind, openbao path/role, host_id, non-secret metadata} --
CREATE TABLE IF NOT EXISTS handles (
  handle                  TEXT PRIMARY KEY,            -- cred://hosts/<host_id>/<name>
  host_id                 TEXT NOT NULL,
  name                    TEXT NOT NULL,
  kind                    TEXT NOT NULL,               -- ssh-ca | kv
  openbao_ref             TEXT NOT NULL,               -- kv path (kv/data/hosts/<h>/<n>) OR ssh sign-role (gateway-<h>)
  description             TEXT,
  requires_approval_class TEXT NOT NULL DEFAULT 'destructive', -- min action_class an approval must carry (M-2)
  rotation_policy         TEXT,                        -- JSON: {schedule, post_redemption_rotate}
  recovery                TEXT NOT NULL DEFAULT 'console-only', -- ssh-ca-resettable | provider-console | console-only (M-5)
  ssh_principal           TEXT,                        -- server-derived valid_principals source for ssh-ca (never free input)
  created_at              TEXT NOT NULL,
  retired_at              TEXT
);
CREATE INDEX IF NOT EXISTS handle_host ON handles(host_id);

-- hosts — onboarding state + the PROPOSED (never wrapper-applied) sign-role staging (§5 Host Onboarding)
CREATE TABLE IF NOT EXISTS hosts (
  host_id            TEXT PRIMARY KEY,
  state              TEXT NOT NULL DEFAULT 'new',      -- new | staged | ready
  signrole_name      TEXT,                             -- gateway-<host_id>
  signrole_diff      TEXT,                             -- proposed role JSON (powerless until operator step-up applies)
  signrole_diff_hash TEXT,                             -- sha256 the operator confirms (diff-hash-bound, §5.2)
  principals         TEXT,                             -- pinned allowed_users/valid_principals (no wildcards)
  ntp_ok             INTEGER NOT NULL DEFAULT 0,
  ca_keys_provisioned_at TEXT,
  recovery           TEXT NOT NULL DEFAULT 'console-only',
  breakglass_verified_at TEXT,                         -- per-host offline break-glass last-verified (M-3, §7.5)
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

-- releases — the powerless, non-redeemable rel-+ULID shadows agents stage (§5.2). --------------------
CREATE TABLE IF NOT EXISTS releases (
  release_id        TEXT PRIMARY KEY,                  -- 'rel-' + ULID
  handle            TEXT NOT NULL,
  host_id           TEXT NOT NULL,                     -- copied from the handle at request time (bind)
  ticket_id         TEXT NOT NULL,
  requested_by_sub  TEXT NOT NULL,                     -- audit-only (§5.2)
  request_op_id     TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','redeemed','expired','revoked')),
  created_at        TEXT NOT NULL,
  expires_at        INTEGER NOT NULL,                  -- epoch ms; pending TTL (§5.2)
  redeemed_at       TEXT,                              -- first-redemption values are authoritative (MI-4)
  redeemed_by       TEXT,                              -- the Gateway's validated sub
  redeem_op_id      TEXT,                              -- the op_id of the first successful redemption
  re_release_count  INTEGER NOT NULL DEFAULT 0,        -- N=3 cap (M-11)
  approval_id       TEXT,
  run_id            TEXT,
  FOREIGN KEY (handle) REFERENCES handles(handle)
);
CREATE INDEX IF NOT EXISTS release_ticket ON releases(ticket_id);
CREATE INDEX IF NOT EXISTS release_status ON releases(status);

-- audit_local — CANONICAL, append-only, hash-chained (§6.1). Every redemption attempt/outcome/denial,
-- release event, and manage-surface change. prev_hash/row_hash form the tamper-evident chain; the chain
-- HEAD is exposed on the status surface for external anchoring + the M-4 restore detector.
CREATE TABLE IF NOT EXISTS audit_local (
  seq          INTEGER PRIMARY KEY AUTOINCREMENT,
  ts           TEXT NOT NULL,
  event_type   TEXT NOT NULL,   -- redeem_attempt | redeem_outcome | redeem_denied | re_release | release_* | manage_* | restore_marker
  actor_sub    TEXT,
  handle       TEXT,
  release_id   TEXT,
  ticket_id    TEXT,
  approval_id  TEXT,
  run_id       TEXT,
  traceparent  TEXT,
  op_id        TEXT,
  outcome      TEXT,            -- ok | denied | error
  detail_json  TEXT,           -- machine-only; NEVER a secret value / response body
  prev_hash    TEXT,
  row_hash     TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_ticket ON audit_local(ticket_id);
CREATE INDEX IF NOT EXISTS audit_outcome ON audit_local(outcome);
CREATE INDEX IF NOT EXISTS audit_actor ON audit_local(actor_sub);

-- op_ids — per-principal idempotency (Board's confirmed pattern: per-sub, never global). ------------
CREATE TABLE IF NOT EXISTS op_ids (
  sub          TEXT NOT NULL,
  op_id        TEXT NOT NULL,
  scope        TEXT NOT NULL,   -- request-release | redeem | manage | revoke (namespaced)
  response     TEXT,            -- JSON of the prior response (idempotent replay)
  created_at   TEXT NOT NULL,
  PRIMARY KEY (sub, op_id, scope)
);

-- meta — chain HEAD bookkeeping, restore markers, WORM-HEAD-at-boot, change-control config values.
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);

-- IMMUTABILITY (§5.3): audit_local is append-only; releases updates are the status CAS only.
CREATE TRIGGER IF NOT EXISTS audit_no_update BEFORE UPDATE ON audit_local
BEGIN SELECT RAISE(ABORT, 'audit_local is append-only'); END;
CREATE TRIGGER IF NOT EXISTS audit_no_delete BEFORE DELETE ON audit_local
BEGIN SELECT RAISE(ABORT, 'audit_local is append-only'); END;

-- releases: forbid any UPDATE that changes an immutable column OR mutates first-redemption authority.
-- Permitted updates: status (CAS), redeemed_*/redeem_op_id/approval_id/run_id set-once, re_release_count++.
CREATE TRIGGER IF NOT EXISTS release_immutable BEFORE UPDATE ON releases
FOR EACH ROW WHEN
  NOT (
    old.release_id = new.release_id AND old.handle = new.handle AND old.host_id = new.host_id
    AND old.ticket_id = new.ticket_id AND old.requested_by_sub = new.requested_by_sub
    AND old.created_at = new.created_at
    -- first-redemption values are authoritative once set (MI-4): may go NULL->value, never value->other
    AND (old.redeemed_at IS NULL OR old.redeemed_at = new.redeemed_at)
    AND (old.redeemed_by IS NULL OR old.redeemed_by = new.redeemed_by)
    AND (old.redeem_op_id IS NULL OR old.redeem_op_id = new.redeem_op_id)
  )
BEGIN
  SELECT RAISE(ABORT, 'releases: only the status CAS + set-once redemption fields + re_release_count may change');
END;
`;

export function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  return db;
}
