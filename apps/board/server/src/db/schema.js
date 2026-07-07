/*
 * db/schema.js — the CANONICAL Board store (ARCH §10; PLAN §2). SQLite + WAL, hand-built claim engine
 * (D-14 — SKIP LOCKED does not exist in SQLite; every claim/consume/transition opens BEGIN IMMEDIATE
 * and is a status-guarded CAS). This store is NOT rebuildable: tickets, approvals, host_locks,
 * ceremony_events, audit_log carry approval state + the fencing sequence the whole SoD chain trusts.
 *
 * Rebuildable projections (ceremony_phase on tickets, the huddles table) are regenerated from
 * ceremony_events (the SOLE ceremony-phase authority, §2.6) — never restored (§16).
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

const SCHEMA = `
-- §2.1 tickets ------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tickets (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,  -- rendered T-%06d across the API
  kind            TEXT NOT NULL DEFAULT 'ticket',     -- ticket | epic | standing
  parent_id       INTEGER,                            -- epic/standing -> children
  child_class     TEXT NOT NULL DEFAULT 'general',    -- general | recon | execution (execution stamped ONLY by backlog decomposition)
  spawned_by      TEXT,                               -- sub of creating agent; NULL for operator/system
  lineage_depth   INTEGER NOT NULL DEFAULT 0,         -- SERVER-DERIVED, never caller-supplied (D-11)
  type            TEXT,                               -- CMDB task-type key (foreign vocab; ADVISORY only)
  title           TEXT,
  body            TEXT,                               -- structured sections; huddle transcript lives in Notes
  status          TEXT NOT NULL DEFAULT 'todo',       -- the 11-state superset
  quarantine      INTEGER NOT NULL DEFAULT 0,         -- structurally excluded from every claim query
  ceremony_phase  TEXT,                               -- REBUILDABLE projection of ceremony_events (never authoritative)
  lane            TEXT,                               -- straight_to_execute | lightweight | full
  lane_signals    TEXT,                               -- JSON: values/sources/evaluated_at per signal (Board-fetched)
  host_id         TEXT,                               -- per-server execution tickets carry exactly one
  team            TEXT,                               -- claim filter + auth schema label
  priority        INTEGER NOT NULL DEFAULT 3,
  severity        INTEGER NOT NULL DEFAULT 3,
  claimed_by      TEXT,                               -- DISPLAY copy; the lease authority is host_locks
  claimed_at      TEXT,
  lease_expires_at INTEGER,                           -- epoch ms (display copy)
  lease_renewals  INTEGER NOT NULL DEFAULT 0,
  fencing_token   INTEGER,                            -- display copy of the lock's lock_generation
  proposer_id     TEXT,                               -- sub that caused in_progress -> awaiting_approval (four-eyes input)
  origin_kind     TEXT NOT NULL DEFAULT 'operator',   -- operator | scheduled | event_webhook | agent
  taint_host_originated INTEGER NOT NULL DEFAULT 0,   -- raise-only
  taint_sources   TEXT,                               -- JSON array
  plan_note_id    TEXT,                               -- pinned plan-slice note (§8.1) — proposal pins (note_id, rev)
  plan_note_rev   TEXT,
  version         INTEGER NOT NULL DEFAULT 0,         -- ticket_version optimistic-concurrency (Board-scoped, opaque)
  spawn_key       TEXT,                               -- webhook/cron dedup (Board-internal, never transmitted)
  wall_clock_cap_at INTEGER,                          -- hard max-renewal deadline (watchdog input)
  machine_reason  TEXT,                               -- A1/quarantine reason (escalation display)
  held            INTEGER NOT NULL DEFAULT 0,         -- outage-gate hold (§4): exempt from reaper + watchdog until cleared
  held_reason     TEXT,
  approval_id     INTEGER,                            -- the current/last minted approval for this ticket
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  done_at         TEXT,                               -- terminal timestamp
  FOREIGN KEY (parent_id) REFERENCES tickets(id)
);
CREATE INDEX IF NOT EXISTS ticket_status ON tickets(status);
CREATE INDEX IF NOT EXISTS ticket_parent ON tickets(parent_id);
CREATE INDEX IF NOT EXISTS ticket_host ON tickets(host_id);
CREATE INDEX IF NOT EXISTS ticket_team ON tickets(team);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_spawn_key ON tickets(spawn_key) WHERE spawn_key IS NOT NULL;

-- §2.2 host_locks — the resource mutex + fencing mint (the SINGLE lease authority) -----------------
CREATE TABLE IF NOT EXISTS host_locks (
  resource_id       TEXT PRIMARY KEY,       -- host_id for host-bound; ticket-scoped rows are Board-internal only
  resource_kind     TEXT NOT NULL,          -- host | ticket
  claimed_by_ticket INTEGER,                -- current holder or NULL
  claimed_by_agent  TEXT,
  hold_kind         TEXT,                   -- claim (reaper-eligible) | execution (NEVER reaper-eligible)
  lease_expires_at  INTEGER,                -- epoch ms (meaningful for hold_kind=claim)
  lock_generation   INTEGER NOT NULL DEFAULT 0  -- Board-minted MONOTONIC fencing counter; ++ on every acquire AND release
);

-- §2.3 ticket_deps --------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_deps (
  ticket_id     INTEGER NOT NULL,   -- the blocked ticket
  depends_on_id INTEGER NOT NULL,   -- the blocker
  kind          TEXT NOT NULL DEFAULT 'finish_to_start',
  PRIMARY KEY (ticket_id, depends_on_id)
);

-- §2.4 approvals — THE approval record ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approvals (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,   -- rendered A-%06d
  ticket_id      INTEGER NOT NULL,
  host_id        TEXT NOT NULL,                       -- bound host: approval is (host_id, plan_hash)
  plan_hash      TEXT NOT NULL,                       -- sha256: over the EXACT pinned plan-slice revision bytes
  plan_note_id   TEXT NOT NULL,
  plan_note_rev  TEXT NOT NULL,
  action_class   TEXT NOT NULL,                       -- DERIVED from allowlist playbooks (never from ticket type)
  proposer_id    TEXT NOT NULL,                       -- copied from the ticket at grant time
  approver_sub   TEXT NOT NULL,                       -- operator sub or svc:tier-approver
  approver_kind  TEXT NOT NULL,                       -- operator | tier_policy
  cmdb_decision_id TEXT,                              -- required when approver_kind=tier_policy
  status         TEXT NOT NULL DEFAULT 'granted',     -- granted -> consumed | revoked | expired (SINGLE-USE)
  granted_at     TEXT NOT NULL,
  consumed_at    TEXT,
  consumed_by    TEXT,                                -- the Gateway's sub
  run_id         TEXT,                                -- attached when Gateway reports it
  expires_at     INTEGER,                             -- optional (default none — CMDB window is freshness authority)
  op_id          TEXT,
  FOREIGN KEY (ticket_id) REFERENCES tickets(id)
);
CREATE INDEX IF NOT EXISTS approval_ticket ON approvals(ticket_id);

-- §2.5 approval_allowlist — the per-approval plan->playbook allowlist (the approval's CONTENT) -----
CREATE TABLE IF NOT EXISTS approval_allowlist (
  approval_id  INTEGER NOT NULL,
  seq          INTEGER NOT NULL,
  playbook_key TEXT NOT NULL,      -- Gateway catalog key (verbatim)
  params_hash  TEXT NOT NULL,      -- sha256 over canonical JSON of the pinned parameter set
  host_id      TEXT NOT NULL,
  class_binding TEXT,              -- CMDB catalog class binding for this playbook (display + floor)
  PRIMARY KEY (approval_id, seq),
  FOREIGN KEY (approval_id) REFERENCES approvals(id)
);

-- IMMUTABILITY (§2.4): approvals + approval_allowlist are INSERT-only after grant; the only permitted
-- UPDATE is the status CAS (granted -> consumed/revoked/expired) plus consumed_*/run_id in that same
-- statement. Any other UPDATE raises. (Trigger guards belong-here-as-a-second-fence; the service also
-- never issues a non-CAS approval UPDATE.)
CREATE TRIGGER IF NOT EXISTS approval_immutable BEFORE UPDATE ON approvals
FOR EACH ROW WHEN
  NOT (
    old.id = new.id AND old.ticket_id = new.ticket_id AND old.host_id = new.host_id
    AND old.plan_hash = new.plan_hash AND old.plan_note_id = new.plan_note_id
    AND old.plan_note_rev = new.plan_note_rev AND old.action_class = new.action_class
    AND old.proposer_id = new.proposer_id AND old.approver_sub = new.approver_sub
    AND old.approver_kind = new.approver_kind AND old.granted_at = new.granted_at
  )
BEGIN
  SELECT RAISE(ABORT, 'approvals are immutable except the status CAS');
END;
CREATE TRIGGER IF NOT EXISTS allowlist_immutable BEFORE UPDATE ON approval_allowlist
BEGIN SELECT RAISE(ABORT, 'approval_allowlist rows are immutable once granted'); END;
CREATE TRIGGER IF NOT EXISTS allowlist_no_delete BEFORE DELETE ON approval_allowlist
BEGIN SELECT RAISE(ABORT, 'approval_allowlist rows are immutable once granted'); END;

-- §2.6 ceremony_events — the SOLE ceremony-phase authority (append-only) ---------------------------
CREATE TABLE IF NOT EXISTS ceremony_events (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id     INTEGER NOT NULL,
  event_kind    TEXT NOT NULL,   -- phase_transition | huddle_opened | statement | triage_decision | watchdog_trip | veto | veto_clear | decision_record | invalidation | pause | resume
  from_phase    TEXT,
  to_phase      TEXT,
  actor_sub     TEXT,
  role          TEXT,
  guard_name    TEXT,
  round         INTEGER,         -- SERVER-STAMPED, never caller-supplied
  note_id       TEXT,
  note_rev      TEXT,
  params        TEXT,            -- JSON (huddle_opened carries round_cap/timebox_deadline/roster)
  machine_reason TEXT,
  created_at    TEXT NOT NULL,
  op_id         TEXT
);
CREATE INDEX IF NOT EXISTS ceremony_ticket ON ceremony_events(ticket_id);

-- ticket <-> note links (link_note tool; huddle transcripts, recon notes, plan slices) ------------
CREATE TABLE IF NOT EXISTS ticket_notes (
  ticket_id  INTEGER NOT NULL,
  note_id    TEXT NOT NULL,       -- opaque Notes id, verbatim
  role       TEXT,                -- plan | recon | transcript | general
  linked_at  TEXT NOT NULL,
  linked_by  TEXT,
  PRIMARY KEY (ticket_id, note_id)
);

-- §2.7 huddles (projection — fully rebuildable from ceremony_events incl. huddle_opened params) ----
CREATE TABLE IF NOT EXISTS huddles (
  ticket_id       INTEGER PRIMARY KEY,
  lane            TEXT,
  round           INTEGER NOT NULL DEFAULT 0,
  round_cap       INTEGER,
  timebox_deadline INTEGER,       -- epoch ms (server clock)
  paused_at       INTEGER,
  pause_total     INTEGER NOT NULL DEFAULT 0,
  roster          TEXT,           -- JSON {role: sub}
  positions_filed TEXT,           -- JSON {role: bool}
  ar_dissent_count INTEGER NOT NULL DEFAULT 0,
  veto_state      TEXT NOT NULL DEFAULT 'none',  -- none | raised | cleared_by_ar | cleared_by_operator
  veto_by         TEXT,
  po_decision_event_id INTEGER,
  status          TEXT NOT NULL DEFAULT 'open'   -- open | converged | escalated
);

-- §2.8 policy + guardrail tables ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS wip_policy (
  scope   TEXT NOT NULL,        -- global | per_agent | per_team
  subject TEXT,                 -- NULL | sub | team
  cap     INTEGER NOT NULL,
  PRIMARY KEY (scope, subject)
);
CREATE TABLE IF NOT EXISTS lineage_policy (
  id        INTEGER PRIMARY KEY CHECK (id = 1),
  max_depth INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS standing_triggers (
  ticket_id     INTEGER PRIMARY KEY,   -- the standing/epic ticket
  trigger_kind  TEXT NOT NULL,         -- manual | schedule | event
  cron_expr     TEXT,
  event_filter  TEXT,                  -- JSON
  child_template TEXT,                 -- JSON
  spawn_key_rule TEXT,
  suppress_while_open INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS op_ids (
  sub          TEXT NOT NULL,
  op_id        TEXT NOT NULL,
  request_hash TEXT,
  response     TEXT,                    -- JSON of the prior response
  created_at   TEXT NOT NULL,
  PRIMARY KEY (sub, op_id)              -- per-principal (global-unique op_id was Drive's confirmed defect)
);
CREATE TABLE IF NOT EXISTS auth_state (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  last_epoch    INTEGER NOT NULL DEFAULT 0,
  level         TEXT NOT NULL DEFAULT 'G0',   -- G0 | G1 | G2
  drain_window_started_at INTEGER,
  updated_at    TEXT
);

-- §2.9 audit_log (append-only) — every state change from either surface + violation rows ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  ts            TEXT NOT NULL,
  actor_sub     TEXT,
  surface       TEXT,             -- mcp | http | ui | internal
  action        TEXT,
  ticket_id     INTEGER,
  approval_id   INTEGER,
  from_state    TEXT,
  to_state      TEXT,
  fields_changed TEXT,            -- JSON
  op_id         TEXT,
  fencing_token INTEGER,
  traceparent   TEXT,
  outcome       TEXT              -- ok | violation | rejected
);
CREATE INDEX IF NOT EXISTS audit_ticket ON audit_log(ticket_id);
CREATE INDEX IF NOT EXISTS audit_outcome ON audit_log(outcome);

-- meta (restore markers, fencing floor bookkeeping) -----------------------------------------------
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
`;

export function openDb(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000'); // BEGIN IMMEDIATE + busy_timeout = the SQLite single-writer discipline (D-14)
  db.exec(SCHEMA);
  seedDefaults(db);
  return db;
}

function seedDefaults(db) {
  const now = new Date().toISOString();
  db.prepare(`INSERT OR IGNORE INTO auth_state (id, last_epoch, level, updated_at) VALUES (1, 0, 'G0', ?)`).run(now);
  db.prepare(`INSERT OR IGNORE INTO lineage_policy (id, max_depth) VALUES (1, ?)`).run(defaultLineageDepth());
  // WIP caps are seeded from config at boot by the service (so operator env overrides apply).
}
function defaultLineageDepth() {
  const v = Number.parseInt(process.env.BOARD_LINEAGE_MAX_DEPTH || '3', 10);
  return Number.isNaN(v) ? 3 : v;
}
