/**
 * SQLite handle (better-sqlite3, the D-14/PLAN §11 lean). WAL, busy_timeout, foreign_keys.
 * Access is behind this thin adapter so the engine is swappable (PLAN flags the stack as
 * "Stage-4 verifiable, not contract").
 */
import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { SCHEMA_SQL, SCHEMA_VERSION } from './schema.js';

export type DB = Database.Database;

export function openDb(dbPath: string): DB {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL'); // WAL: durable at checkpoint; commit-lock ordering guards us
  migrate(db);
  return db;
}

function migrate(db: DB): void {
  db.exec(SCHEMA_SQL);
  const row = db.prepare(`SELECT value FROM meta WHERE key = 'schema_version'`).get() as
    | { value: string }
    | undefined;
  if (!row) {
    db.prepare(`INSERT INTO meta (key, value) VALUES ('schema_version', ?)`).run(String(SCHEMA_VERSION));
  }
  // Ensure the singleton watermark row exists.
  const wm = db.prepare(`SELECT id FROM journal_watermark WHERE id = 1`).get();
  if (!wm) {
    db.prepare(`INSERT INTO journal_watermark (id, journal_file, byte_offset) VALUES (1, '', 0)`).run();
  }
}
