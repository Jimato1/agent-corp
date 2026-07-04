/*
 * db.js — the REBUILDABLE index (CORR-1). SQLite + FTS5, WAL. NEVER canonical for anything.
 *
 * PLAN §4: FTS5 external-content over a `note` mirror; ultimate recovery = delete the DB, rescan
 * files, rebuild. The DB is never the authority.
 *
 * CORR-2 STRUCTURAL FIREWALL: the `note` table has NO ceremony_phase_display / ticket_status_display
 * columns. Display-only mirrors are not indexed, not searchable, not readable — there is nothing to
 * read back. This is the frontmatter firewall expressed in the schema itself.
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS note (
  id            TEXT PRIMARY KEY,          -- N-<ULID>, immutable machine handle
  path          TEXT NOT NULL,             -- human handle; changes on rename
  title         TEXT,
  type          TEXT,
  tags          TEXT,                      -- JSON array
  ticket_id     TEXT,                      -- opaque Board id, verbatim
  provenance    TEXT,
  provenance_taint TEXT,                   -- own taint (raise-only)
  authored_by   TEXT,                      -- JSON array of sub values (display/join)
  created       TEXT,
  updated       TEXT,
  content_hash  TEXT,                      -- sha256: of the whole file
  mtime         REAL,
  size          INTEGER,
  body          TEXT                       -- markdown body (frontmatter stripped)
  -- NO display-only columns: ceremony_phase_display / ticket_status_display are firewalled (CORR-2)
);

CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
  title, body,
  content='note', content_rowid='rowid',
  tokenize='porter unicode61 remove_diacritics 2'
);

-- keep FTS in sync with note via triggers (rebuildable regardless via 'rebuild')
CREATE TRIGGER IF NOT EXISTS note_ai AFTER INSERT ON note BEGIN
  INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;
CREATE TRIGGER IF NOT EXISTS note_ad AFTER DELETE ON note BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
END;
CREATE TRIGGER IF NOT EXISTS note_au AFTER UPDATE ON note BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, body) VALUES ('delete', old.rowid, old.title, old.body);
  INSERT INTO notes_fts(rowid, title, body) VALUES (new.rowid, new.title, new.body);
END;

CREATE TABLE IF NOT EXISTS link (
  from_id     TEXT NOT NULL,
  to_id       TEXT,                        -- nullable until resolved
  target_text TEXT NOT NULL,               -- the [[wikilink]] text
  resolved    INTEGER NOT NULL DEFAULT 0,
  isolated    INTEGER NOT NULL DEFAULT 0   -- §7.3 isolated-turn link (excluded from backlinks/search until released)
);
CREATE INDEX IF NOT EXISTS link_from ON link(from_id);
CREATE INDEX IF NOT EXISTS link_to ON link(to_id);

CREATE TABLE IF NOT EXISTS audit (
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,
  ts          TEXT,
  sub         TEXT,                        -- THE join key (git 'Sub:' trailer) — CORR-4
  tool        TEXT,
  note_id     TEXT,
  ticket_id   TEXT,
  op_id       TEXT,
  fence       TEXT,
  commit_sha  TEXT
);
CREATE INDEX IF NOT EXISTS audit_note ON audit(note_id);
CREATE INDEX IF NOT EXISTS audit_sub ON audit(sub);

CREATE TABLE IF NOT EXISTS op_dedup (
  op_id       TEXT PRIMARY KEY,
  sub         TEXT,
  result      TEXT,                        -- JSON of the prior response (best-effort; degrades after rebuild)
  commit_sha  TEXT,
  ts          TEXT
);

-- Highest fencing generation ever accepted per ticket (CORR-6 monotonic floor). Rebuildable from
-- audit trailers; also persisted here as a fast, monotonic guard.
CREATE TABLE IF NOT EXISTS fence_floor (
  ticket_id     TEXT PRIMARY KEY,
  max_generation INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT);
`;

export function openDb() {
  fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });
  const db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  return db;
}

/** Blow away every rebuildable table (keeps the file) and let a full scan repopulate. */
export function truncateIndex(db) {
  db.exec(`
    DELETE FROM note;
    INSERT INTO notes_fts(notes_fts) VALUES('rebuild');
    DELETE FROM link;
    DELETE FROM audit;
    DELETE FROM op_dedup;
    DELETE FROM fence_floor;
  `);
}

/** Rebuild the FTS shadow from the note table (PLAN §4.1). */
export function rebuildFts(db) {
  db.exec(`INSERT INTO notes_fts(notes_fts) VALUES('rebuild');`);
}
