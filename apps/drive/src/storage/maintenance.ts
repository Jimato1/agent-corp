/**
 * Rebuild / verify / reconcile (PLAN §3.4, §9.3). The journals are canonical; the SQLite index
 * is provably rebuildable by replaying them. `drive verify` reconciles rows↔blobs both ways
 * and hash-spot-checks. Startup reconcile resumes from the journal watermark idempotently.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Store } from './store.js';
import { blobExistsOnDisk, blobPath } from './cas.js';
import { Journals } from './journal.js';

/** Ordered list of version-journal files (oldest first) for replay. */
function versionJournalFiles(store: Store): string[] {
  const base = store.layout.journalDir;
  if (!existsSync(base)) return [];
  const files: string[] = [];
  for (const year of readdirSync(base).sort()) {
    const dir = join(base, year);
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      continue;
    }
    for (const f of entries.filter((n) => n.startsWith('versions-')).sort()) files.push(join(dir, f));
  }
  return files;
}

/**
 * Rebuild the entire index from the journals + blob tree (watermark 0, full ordered replay).
 * Idempotent on version_id (INSERT OR IGNORE); pointer/delete apply monotonically by journal order.
 */
export function rebuildIndex(store: Store): { replayed: number; tornTails: number } {
  const db = store.db;
  let replayed = 0;
  let tornTails = 0;
  const tx = db.transaction(() => {
    for (const file of versionJournalFiles(store)) {
      const { lines, tornTail } = Journals.readNdjson(file);
      if (tornTail) tornTails++;
      for (const raw of lines) {
        applyVersionEvent(store, raw as any);
        replayed++;
      }
    }
    // Recompute refcounts from surviving version rows (authoritative post-replay).
    db.prepare(`UPDATE blobs SET refcount = (SELECT COUNT(*) FROM artifact_versions v WHERE v.sha256 = blobs.sha256)`).run();
  });
  tx.immediate();
  return { replayed, tornTails };
}

function applyVersionEvent(store: Store, ev: { type: string; [k: string]: any }): void {
  const db = store.db;
  switch (ev.type) {
    case 'version_committed': {
      const r = ev.row;
      const a = ev.artifact;
      db.prepare(
        `INSERT OR IGNORE INTO artifacts (artifact_id, ticket_id, logical_name, current_version_id, ticket_state, created_by, created_at)
         VALUES (?,?,?,?,?,?,?)`,
      ).run(a.artifact_id, a.ticket_id, a.logical_name, null, a.ticket_state ?? 'unverified_pending', r.created_by, ev.ts);
      db.prepare(`INSERT OR IGNORE INTO blobs (sha256, size_bytes, refcount, created_at) VALUES (?,?,0,?)`).run(r.sha256, r.size_bytes, ev.ts);
      db.prepare(
        `INSERT OR IGNORE INTO artifact_versions
           (version_id, artifact_id, seq, sha256, ticket_id, note_id, created_by, fencing_token, op_id, mime_sniffed, mime_client_hint, size_bytes, original_name, is_delete_marker, derived_from_version_id, created_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,NULL,?)`,
      ).run(
        r.version_id,
        r.artifact_id,
        r.seq,
        r.sha256,
        r.ticket_id,
        r.note_id ?? null,
        r.created_by,
        r.fencing_token ?? null,
        r.op_id,
        r.mime_sniffed,
        null,
        r.size_bytes,
        r.original_name,
        ev.ts,
      );
      // pointer moves forward monotonically (higher seq wins).
      const cur = db.prepare(`SELECT current_version_id FROM artifacts WHERE artifact_id = ?`).get(r.artifact_id) as { current_version_id: string | null } | undefined;
      const curSeq = cur?.current_version_id
        ? (db.prepare(`SELECT seq FROM artifact_versions WHERE version_id = ?`).get(cur.current_version_id) as { seq: number } | undefined)?.seq ?? -1
        : -1;
      if (r.seq > curSeq) db.prepare(`UPDATE artifacts SET current_version_id = ? WHERE artifact_id = ?`).run(r.version_id, r.artifact_id);
      // raise fencing high-water on replay too.
      if (typeof r.fencing_token === 'number') {
        db.prepare(
          `INSERT INTO ticket_fences (ticket_id, max_fence, updated_at) VALUES (?,?,?)
           ON CONFLICT(ticket_id) DO UPDATE SET max_fence = MAX(max_fence, excluded.max_fence), updated_at = excluded.updated_at`,
        ).run(r.ticket_id, r.fencing_token, ev.ts);
      }
      break;
    }
    case 'delete_marker':
      db.prepare(`UPDATE artifacts SET current_version_id = NULL WHERE artifact_id = ?`).run(ev.artifact_id);
      break;
    case 'pointer_move':
      db.prepare(`UPDATE artifacts SET current_version_id = ? WHERE artifact_id = ?`).run(ev.to_version_id, ev.artifact_id);
      break;
    case 'gc_purge':
      // Mark by row deletion of the blob (never referenced rows); refcount recompute follows.
      db.prepare(`DELETE FROM blobs WHERE sha256 = ?`).run(ev.sha256);
      break;
    case 'aborted':
      db.prepare(`DELETE FROM artifact_versions WHERE version_id = ?`).run(ev.version_id);
      break;
    default:
      break;
  }
}

export interface VerifyReport {
  blobs_checked: number;
  hash_failures: string[];
  rows_missing_blob: string[];
  orphan_blobs: string[];
  ok: boolean;
}

/**
 * `drive verify` — reconcile rows↔blobs both directions + hash spot-checks. Every DB row must
 * resolve to an existing blob whose hash verifies; every blob is either referenced or flagged
 * orphan (§9.3 restore invariant).
 */
export function verify(store: Store, opts: { fullHash?: boolean } = {}): VerifyReport {
  const db = store.db;
  const report: VerifyReport = { blobs_checked: 0, hash_failures: [], rows_missing_blob: [], orphan_blobs: [], ok: true };

  // Direction 1: every version row's blob exists (+ hash check).
  const shas = db.prepare(`SELECT DISTINCT sha256 FROM artifact_versions WHERE sha256 IS NOT NULL`).all() as Array<{ sha256: string }>;
  for (const { sha256 } of shas) {
    if (!blobExistsOnDisk(store.layout, sha256)) {
      report.rows_missing_blob.push(sha256);
      report.ok = false;
      continue;
    }
    if (opts.fullHash) {
      const actual = hashFile(blobPath(store.layout, sha256));
      report.blobs_checked++;
      if (actual !== sha256) {
        report.hash_failures.push(sha256);
        report.ok = false;
      }
    }
  }

  // Direction 2: every blob row is referenced by ≥1 version (else orphan — flagged, not deleted here).
  const orphans = db
    .prepare(`SELECT sha256 FROM blobs WHERE refcount <= 0 OR sha256 NOT IN (SELECT sha256 FROM artifact_versions WHERE sha256 IS NOT NULL)`)
    .all() as Array<{ sha256: string }>;
  report.orphan_blobs = orphans.map((o) => o.sha256);

  db.prepare(`INSERT INTO meta (key, value) VALUES ('last_verify_at', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(store.clock.iso());
  return report;
}

function hashFile(path: string): string {
  const h = createHash('sha256');
  h.update(readFileSync(path));
  return h.digest('hex');
}

/** Startup reconcile: a rebuild is the safe superset (idempotent). Cheap at homelab scale. */
export function reconcileOnBoot(store: Store): { replayed: number; tornTails: number } {
  return rebuildIndex(store);
}
