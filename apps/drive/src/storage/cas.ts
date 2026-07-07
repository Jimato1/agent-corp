/**
 * Content-addressed store on the filesystem (D-14). Blobs live at
 *   blobs/sha256/<aa>/<bb>/<full-64-hex>
 * write-once, fsync'd, chmod read-only after commit. Staging/quarantine are disposable.
 * Paths derive ONLY from the hash — original_name/logical_name never build a path (§12.6).
 */
import {
  createReadStream,
  createWriteStream,
  chmodSync,
  closeSync,
  existsSync,
  fsyncSync,
  mkdirSync,
  openSync,
  renameSync,
  rmSync,
  statSync,
} from 'node:fs';
import { join } from 'node:path';

export interface CasLayout {
  root: string;
  blobs: string;
  staging: string;
  quarantine: string;
  journalDir: string;
  dbDir: string;
  backupDir: string;
}

export function layout(dataDir: string): CasLayout {
  return {
    root: dataDir,
    blobs: join(dataDir, 'blobs', 'sha256'),
    staging: join(dataDir, 'staging'),
    quarantine: join(dataDir, 'quarantine'),
    journalDir: join(dataDir, 'journal'),
    dbDir: join(dataDir, 'db'),
    backupDir: join(dataDir, 'db', 'backup'),
  };
}

export function ensureLayout(l: CasLayout): void {
  for (const d of [l.blobs, l.staging, l.quarantine, l.journalDir, l.dbDir, l.backupDir]) {
    mkdirSync(d, { recursive: true });
  }
}

/** Absolute CAS path for a blob given its full 64-hex sha256. */
export function blobPath(l: CasLayout, sha256: string): string {
  const aa = sha256.slice(0, 2);
  const bb = sha256.slice(2, 4);
  return join(l.blobs, aa, bb, sha256);
}

export function stagingPath(l: CasLayout, uploadId: string): string {
  return join(l.staging, `${uploadId}.part`);
}

export function blobExistsOnDisk(l: CasLayout, sha256: string): boolean {
  return existsSync(blobPath(l, sha256));
}

/** fsync a directory entry so a rename is durable. */
function fsyncDir(dir: string): void {
  let fd = -1;
  try {
    fd = openSync(dir, 'r');
    fsyncSync(fd);
  } catch {
    // Directory fsync is best-effort on some platforms (e.g. Windows); ignore.
  } finally {
    if (fd >= 0) closeSync(fd);
  }
}

/**
 * Atomically materialize a staged temp file into the CAS at its content hash.
 * Same filesystem ⇒ rename is atomic. Idempotent: if the target already exists we keep it.
 * The temp is NOT discarded here — the caller (store) discards only after the DB row is
 * re-verified inside the commit txn (§3.3 rule 5 — the dedup/GC race fix).
 */
export function materialize(l: CasLayout, tempPath: string, sha256: string): void {
  const dest = blobPath(l, sha256);
  if (existsSync(dest)) return; // already present (dedup hit that owns nothing to move)
  mkdirSync(join(l.blobs, sha256.slice(0, 2), sha256.slice(2, 4)), { recursive: true });
  renameSync(tempPath, dest);
  fsyncDir(join(l.blobs, sha256.slice(0, 2), sha256.slice(2, 4)));
  try {
    chmodSync(dest, 0o440); // read-only after commit
  } catch {
    // chmod may be a no-op on Windows; immutability is also enforced by write-once logic.
  }
}

/** Discard a staged temp (abort/expire, or dedup hit after re-verification). */
export function discardStaging(l: CasLayout, uploadId: string): void {
  const p = stagingPath(l, uploadId);
  try {
    rmSync(p, { force: true });
  } catch {
    /* ignore */
  }
}

export function openBlobStream(l: CasLayout, sha256: string, opts?: { start: number; end: number }) {
  return createReadStream(blobPath(l, sha256), opts);
}

export function blobSize(l: CasLayout, sha256: string): number {
  return statSync(blobPath(l, sha256)).size;
}

/** Move a refcount-0 blob into quarantine (GC phase-2 second grace window). */
export function quarantineBlob(l: CasLayout, sha256: string): void {
  const src = blobPath(l, sha256);
  if (!existsSync(src)) return;
  mkdirSync(l.quarantine, { recursive: true });
  try {
    chmodSync(src, 0o640);
  } catch {
    /* ignore */
  }
  renameSync(src, join(l.quarantine, sha256));
}

export { createWriteStream, fsyncSync, openSync, closeSync };
