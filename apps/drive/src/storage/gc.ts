/**
 * Garbage collection (PLAN §3.5). Two-phase, backup-aware, deletion coordinated through the
 * DB so it never races dedup:
 *   Phase 1 (continuous, automatic): sweep aborted/expired staging; no agent can trigger it.
 *   Phase 2 (manual, operator-only, step-up-confirmed at the HTTP layer): purge delete-marked
 *     chains → decrement refcounts → for refcount-0 blobs delete the row IN A TXN FIRST,
 *     journal gc_purge, then quarantine the file, unlink only after a second grace window.
 * Nothing an agent can call reaches phase 2.
 */
import { readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { eventId } from '../lib/ids.js';
import type { Principal } from '../lib/principal.js';
import { quarantineBlob } from './cas.js';
import type { Store } from './store.js';

export function backupInProgress(store: Store): boolean {
  const row = store.db.prepare(`SELECT value FROM meta WHERE key = 'backup_in_progress'`).get() as { value: string } | undefined;
  return row?.value === '1';
}

/** Phase 1: sweep staging temps whose upload is aborted/expired past inactivity; expire stale pendings. */
export function phase1Sweep(store: Store): { staging_swept: number; expired: number } {
  const now = store.clock.now();
  const ttlMs = store.config.limits.uploadTtlSec * 1000;
  // Expire inactive pendings (never those with an open stream — the sweeper only sees DB state;
  // the HTTP layer keeps last_activity_at fresh while a stream is live).
  const pendings = store.db.prepare(`SELECT upload_id, created_by, bytes_staged, last_activity_at FROM uploads WHERE state = 'pending'`).all() as Array<{
    upload_id: string;
    created_by: string;
    bytes_staged: number;
    last_activity_at: string;
  }>;
  let expired = 0;
  for (const u of pendings) {
    if (now - Date.parse(u.last_activity_at) > ttlMs) {
      store.db.prepare(`UPDATE uploads SET state = 'expired' WHERE upload_id = ?`).run(u.upload_id);
      store.releaseQuota(u.created_by, u.bytes_staged);
      expired++;
    }
  }
  // Remove staging temps for aborted/expired uploads.
  let swept = 0;
  let files: string[] = [];
  try {
    files = readdirSync(store.layout.staging);
  } catch {
    files = [];
  }
  const dead = new Set(
    (store.db.prepare(`SELECT upload_id FROM uploads WHERE state IN ('aborted','expired')`).all() as Array<{ upload_id: string }>).map((r) => r.upload_id),
  );
  for (const f of files) {
    const id = f.replace(/\.part$/, '');
    if (dead.has(id)) {
      try {
        rmSync(join(store.layout.staging, f), { force: true });
        swept++;
      } catch {
        /* ignore */
      }
    }
  }
  return { staging_swept: swept, expired };
}

export interface GcPreview {
  delete_marked_chains: number;
  refcount0_blobs: number;
  reclaimable_bytes: number;
}

export function gcPreview(store: Store): GcPreview {
  const chains = store.db.prepare(`SELECT COUNT(*) c FROM artifacts WHERE current_version_id IS NULL AND EXISTS (SELECT 1 FROM artifact_versions v WHERE v.artifact_id = artifacts.artifact_id)`).get() as { c: number };
  const refless = store.db.prepare(`SELECT sha256, size_bytes FROM blobs WHERE refcount <= 0`).all() as Array<{ sha256: string; size_bytes: number }>;
  return {
    delete_marked_chains: chains.c,
    refcount0_blobs: refless.length,
    reclaimable_bytes: refless.reduce((s, b) => s + b.size_bytes, 0),
  };
}

/**
 * Phase 2 purge. Operator-only + step-up is enforced at the HTTP layer (fails closed under
 * auth-staleness / engaged kill epoch); this method assumes that gate already passed.
 * Suspended during the backup window.
 */
export function gcPhase2(store: Store, principal: Principal): { purged_blobs: number; purged_chains: number; reclaimed_bytes: number } {
  if (backupInProgress(store)) {
    return { purged_blobs: 0, purged_chains: 0, reclaimed_bytes: 0 };
  }
  const ts = store.clock.iso();
  let purgedChains = 0;
  let reclaimed = 0;

  // Purge delete-marked chains: decrement the refcount of every referenced blob, delete the
  // version rows. Done inside one transaction per artifact so refcount accounting is atomic.
  const chains = store.db.prepare(`SELECT artifact_id FROM artifacts WHERE current_version_id IS NULL AND EXISTS (SELECT 1 FROM artifact_versions v WHERE v.artifact_id = artifacts.artifact_id)`).all() as Array<{ artifact_id: string }>;
  for (const c of chains) {
    const tx = store.db.transaction(() => {
      const vers = store.db.prepare(`SELECT version_id, sha256 FROM artifact_versions WHERE artifact_id = ?`).all(c.artifact_id) as Array<{ version_id: string; sha256: string | null }>;
      for (const v of vers) {
        if (v.sha256) store.db.prepare(`UPDATE blobs SET refcount = MAX(0, refcount - 1) WHERE sha256 = ?`).run(v.sha256);
        store.db.prepare(`DELETE FROM artifact_versions WHERE version_id = ?`).run(v.version_id);
      }
      store.db.prepare(`DELETE FROM artifacts WHERE artifact_id = ?`).run(c.artifact_id);
    });
    tx.immediate();
    purgedChains++;
  }

  // Purge refcount-0 blobs: delete the row IN A TXN FIRST, journal gc_purge, then quarantine
  // the file. A concurrent dedup-hit put is safe: it re-verifies the row inside its own commit
  // txn and, finding none, re-materializes from its still-held temp (store.commit step h).
  const refless = store.db.prepare(`SELECT sha256, size_bytes FROM blobs WHERE refcount <= 0`).all() as Array<{ sha256: string; size_bytes: number }>;
  let purgedBlobs = 0;
  for (const b of refless) {
    const tx = store.db.transaction(() => {
      store.db.prepare(`DELETE FROM blobs WHERE sha256 = ? AND refcount <= 0`).run(b.sha256);
      store.journals.appendVersion({ evt: eventId(), type: 'gc_purge', sha256: b.sha256, principal: principal.sub, ts });
    });
    tx.immediate();
    quarantineBlob(store.layout, b.sha256);
    purgedBlobs++;
    reclaimed += b.size_bytes;
  }

  // Second grace window: unlink quarantined files older than the window (best-effort).
  purgeQuarantine(store);

  store.audit(principal, 'gc_purge', { detail: { purged_blobs: purgedBlobs, purged_chains: purgedChains, reclaimed_bytes: reclaimed } });
  return { purged_blobs: purgedBlobs, purged_chains: purgedChains, reclaimed_bytes: reclaimed };
}

function purgeQuarantine(store: Store, graceMs = 24 * 3600 * 1000): void {
  let files: string[] = [];
  try {
    files = readdirSync(store.layout.quarantine);
  } catch {
    return;
  }
  const now = store.clock.now();
  for (const f of files) {
    const p = join(store.layout.quarantine, f);
    try {
      if (now - statSync(p).mtimeMs > graceMs) rmSync(p, { force: true });
    } catch {
      /* ignore */
    }
  }
}
