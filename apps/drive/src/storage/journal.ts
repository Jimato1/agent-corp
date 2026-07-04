/**
 * Append-only NDJSON journals — what makes the SQLite index rebuildable (PLAN §3.4).
 *   journal/<yyyy>/versions-<yyyymmdd>.ndjson  — every version/pointer event
 *   journal/<yyyy>/audit-<yyyymmdd>.ndjson     — every state-change/denial audit event
 * Journal lines are appended + fsync'd INSIDE the commit lock, after the txn computed the
 * committed-to-be values (§3.3). Each line carries a unique event id for idempotent replay.
 */
import { appendFileSync, closeSync, fsyncSync, mkdirSync, openSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type { CasLayout } from './cas.js';

export type VersionEvent =
  | { evt: string; type: 'version_committed'; row: Record<string, unknown>; artifact: Record<string, unknown>; ts: string }
  | { evt: string; type: 'delete_marker'; version_id: string; artifact_id: string; principal: string; ts: string }
  | { evt: string; type: 'pointer_move'; artifact_id: string; to_version_id: string | null; principal: string; ts: string }
  | { evt: string; type: 'gc_purge'; sha256: string; principal: string; ts: string }
  | { evt: string; type: 'ticket_state_change'; artifact_id: string; state: string; ts: string }
  | { evt: string; type: 'aborted'; version_id: string; ts: string };

export interface AuditEvent {
  evt: string;
  ts: string;
  principal: string;
  principal_kind: string;
  action: string;
  ticket_id?: string | null;
  artifact_id?: string | null;
  version_id?: string | null;
  outcome: 'ok' | 'denied' | 'rejected';
  detail?: unknown;
}

function ymd(d = new Date()): { year: string; stamp: string } {
  const y = d.getUTCFullYear().toString();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return { year: y, stamp: `${y}${m}${day}` };
}

export class Journals {
  constructor(private readonly l: CasLayout) {}

  private path(kind: 'versions' | 'audit'): string {
    const { year, stamp } = ymd();
    const dir = join(this.l.journalDir, year);
    mkdirSync(dir, { recursive: true });
    return join(dir, `${kind}-${stamp}.ndjson`);
  }

  /** Append + fsync a version-journal line. MUST be called inside the commit lock. */
  appendVersion(ev: VersionEvent): { file: string; offset: number } {
    return this.writeLine(this.path('versions'), ev);
  }

  /** Append + fsync an audit-journal line (mutations AND denials). */
  appendAudit(ev: AuditEvent): { file: string; offset: number } {
    return this.writeLine(this.path('audit'), ev);
  }

  private writeLine(file: string, obj: unknown): { file: string; offset: number } {
    const line = JSON.stringify(obj) + '\n';
    appendFileSync(file, line);
    // fsync the file so the durable record precedes the DB commit.
    const fd = openSync(file, 'r+');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }
    const size = Buffer.byteLength(line);
    return { file, offset: size };
  }

  /** Read a versions journal file for replay (rebuild/verify). Torn trailing line tolerated. */
  static readNdjson(file: string): { lines: unknown[]; tornTail: boolean } {
    if (!existsSync(file)) return { lines: [], tornTail: false };
    const raw = readFileSync(file, 'utf8');
    const parts = raw.split('\n');
    const lines: unknown[] = [];
    let tornTail = false;
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]!;
      if (p === '') continue;
      try {
        lines.push(JSON.parse(p));
      } catch {
        // Only the final fragment may be a torn tail (crash/backup mid-append).
        if (i === parts.length - 1) tornTail = true;
        else throw new Error(`corrupt journal line ${i} in ${file}`);
      }
    }
    return { lines, tornTail };
  }
}
