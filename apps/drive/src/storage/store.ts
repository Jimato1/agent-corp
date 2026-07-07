/**
 * The one service layer both surfaces (HTTP API + MCP) sit on (two views, one state).
 * Owns the crash-safe write path (PLAN §3.3), FENCING ENFORCEMENT (§3.6 — the adversarial
 * review's #1 finding: recorded-but-never-checked is fixed here), dedup/refcount, listings,
 * operator pointer ops, quota/watermark, and audit (DB row + append-only journal).
 */
import { statfsSync } from 'node:fs';
import type { DB } from '../db/db.js';
import type { Config } from '../config.js';
import { DriveError } from '../lib/errors.js';
import { artifactId, versionId, uploadId as newUploadId, eventId, isValidTicketId, isPlausibleNoteId } from '../lib/ids.js';
import { isExecutable, isInlineAllowed } from '../lib/mime.js';
import type { Principal } from '../lib/principal.js';
import { CasLayout, blobExistsOnDisk, discardStaging, materialize, stagingPath } from './cas.js';
import { Journals } from './journal.js';

export interface Clock {
  now(): number;
  iso(): string;
}
export const systemClock: Clock = {
  now: () => Date.now(),
  iso: () => new Date().toISOString(),
};

export interface RegisterIntent {
  ticket_id: string;
  logical_name: string;
  op_id: string;
  fencing_token?: number | string | null;
  mime_hint?: string | null;
  note_id?: string | null;
  expected_sha256?: string | null;
}

export interface RegisterResult {
  artifact_id: string;
  upload_id: string;
  ticket_state: string;
  expires_policy: string;
}

export interface MaterializedUpload {
  sha256: string;
  sizeBytes: number;
  mimeSniffed: string;
  originalName: string;
}

export interface CommitResult {
  artifact_id: string;
  version_id: string;
  seq: number;
  sha256: string;
  mime_sniffed: string;
  size_bytes: number;
}

interface UploadRow {
  upload_id: string;
  state: 'pending' | 'committed' | 'aborted' | 'expired';
  created_by: string;
  op_id: string;
  ticket_id: string;
  logical_name: string;
  note_id: string | null;
  fencing_token: number | null;
  mime_client_hint: string | null;
  expected_sha256: string | null;
  artifact_id: string | null;
  result_version_id: string | null;
  last_activity_at: string;
  bytes_staged: number;
}

const PAGE_SIZE = 100;

export class Store {
  readonly journals: Journals;
  constructor(
    readonly db: DB,
    readonly layout: CasLayout,
    readonly config: Config,
    readonly clock: Clock = systemClock,
  ) {
    this.journals = new Journals(layout);
  }

  // ─────────────────────────── audit (DB row + journal) ───────────────────────────

  audit(
    principal: Pick<Principal, 'sub' | 'kind'> | { sub: string; kind: string },
    action: string,
    opts: {
      outcome?: 'ok' | 'denied' | 'rejected';
      ticket_id?: string | null;
      artifact_id?: string | null;
      version_id?: string | null;
      detail?: unknown;
    } = {},
  ): void {
    const ts = this.clock.iso();
    const outcome = opts.outcome ?? 'ok';
    this.db
      .prepare(
        `INSERT INTO audit_log (ts, principal, principal_kind, action, ticket_id, artifact_id, version_id, outcome, detail)
         VALUES (?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        ts,
        principal.sub,
        principal.kind,
        action,
        opts.ticket_id ?? null,
        opts.artifact_id ?? null,
        opts.version_id ?? null,
        outcome,
        opts.detail === undefined ? null : JSON.stringify(opts.detail),
      );
    // Read/list access rows stay DB-ONLY (the sole ≤24h loss-window class, §9.1/§9.3); only
    // mutations AND denials are mirrored into the canonical append-only audit journal (§3.4).
    if ((action === 'read' || action === 'list') && outcome === 'ok') return;
    this.journals.appendAudit({
      evt: eventId(),
      ts,
      principal: principal.sub,
      principal_kind: principal.kind,
      action,
      ticket_id: opts.ticket_id ?? null,
      artifact_id: opts.artifact_id ?? null,
      version_id: opts.version_id ?? null,
      outcome,
      detail: opts.detail,
    });
  }

  // ─────────────────────────── fencing (ENFORCED, §3.6) ───────────────────────────

  /**
   * Parse + validate a fencing token echo. Agent-kind principals MUST echo a non-negative
   * integer; human/service are exempt (they hold no Board lease). Returns null for exempt.
   */
  private normalizeFencingToken(principalKind: string, raw: unknown, ticket_id: string): number | null {
    if (principalKind === 'agent') {
      if (raw === undefined || raw === null || raw === '') {
        throw new DriveError('FENCING_REQUIRED', 'agent principals must echo a fencing_token on ticket-bound writes', {
          ticket_id,
        });
      }
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (!Number.isInteger(n) || n < 0) {
        throw new DriveError('FENCING_REQUIRED', 'fencing_token must be a non-negative integer', { ticket_id, got: raw });
      }
      return n;
    }
    return null; // human/service exempt
  }

  /**
   * The staleness check — MUST run INSIDE the commit transaction (see commit()).
   * The Board-minted token is a monotonic integer per locked resource; Drive tracks the
   * highest generation seen per ticket_id and REJECTS any lower value with STALE_FENCING.
   * On accept it raises the high-water. This is the actual reject-stale check the frozen
   * board-agents-claim.md §3 obligates (not a recorded-but-unchecked field).
   */
  private enforceFencingInTxn(ticket_id: string, token: number | null): void {
    if (token === null) return; // exempt principal
    const row = this.db.prepare(`SELECT max_fence FROM ticket_fences WHERE ticket_id = ?`).get(ticket_id) as
      | { max_fence: number }
      | undefined;
    const highWater = row?.max_fence ?? -1;
    if (token < highWater) {
      throw new DriveError('STALE_FENCING', 'fencing token is older than the highest generation seen for this ticket', {
        ticket_id,
        presented: token,
        high_water: highWater,
      });
    }
    // token >= highWater ⇒ accept and raise the high-water (monotonic).
    if (token > highWater) {
      this.db
        .prepare(
          `INSERT INTO ticket_fences (ticket_id, max_fence, updated_at) VALUES (?,?,?)
           ON CONFLICT(ticket_id) DO UPDATE SET max_fence = excluded.max_fence, updated_at = excluded.updated_at`,
        )
        .run(ticket_id, token, this.clock.iso());
    }
  }

  // ─────────────────────────── ticket existence (degraded default) ───────────────────────────

  /**
   * Determine the ticket_state to stamp at registration. Degraded default (no Board API
   * configured, or svc:drive grant not active) ⇒ unverified_pending-always (PLAN §2.1/§15.5).
   * A live Board check is wired in board.ts and, when present, may return 'verified' or throw
   * TICKET_NOT_FOUND. Fail-loud-open-but-flagged on Board unreachable.
   */
  ticketStateForRegistration(ticket_id: string): string {
    const cached = this.db.prepare(`SELECT state, next_check_at FROM ticket_checks WHERE ticket_id = ?`).get(ticket_id) as
      | { state: string; next_check_at: string | null }
      | undefined;
    if (cached?.state === 'verified') return 'verified';
    if (cached?.state === 'verified_absent') return 'verified_absent';
    return 'unverified_pending';
  }

  // ─────────────────────────── registration (POST /api/artifacts) ───────────────────────────

  register(principal: Principal, intent: RegisterIntent): RegisterResult {
    if (!isValidTicketId(intent.ticket_id)) {
      throw new DriveError('MALFORMED_ID', 'ticket_id must match ^T-\\d{6,}$', { ticket_id: intent.ticket_id });
    }
    if (!intent.logical_name || intent.logical_name.length > 512) {
      throw new DriveError('MALFORMED_ID', 'logical_name required, ≤512 chars');
    }
    if (intent.note_id != null && !isPlausibleNoteId(intent.note_id)) {
      throw new DriveError('MALFORMED_ID', 'note_id implausible');
    }
    if (!intent.op_id || intent.op_id.length > 128) {
      throw new DriveError('MALFORMED_ID', 'op_id required, ≤128 chars');
    }
    // Validate/normalize the fencing echo up-front (fail fast for agents); staleness is
    // re-checked authoritatively inside the commit txn.
    const fencing = this.normalizeFencingToken(principal.kind, intent.fencing_token ?? null, intent.ticket_id);

    // Idempotency: same (sub, op_id) collapses to the prior registration/commit result.
    const existing = this.db
      .prepare(`SELECT * FROM uploads WHERE created_by = ? AND op_id = ?`)
      .get(principal.sub, intent.op_id) as UploadRow | undefined;
    if (existing) {
      return {
        artifact_id: existing.artifact_id ?? '',
        upload_id: existing.upload_id,
        ticket_state: this.ticketStateForRegistration(intent.ticket_id),
        expires_policy: `inactivity:${this.config.limits.uploadTtlSec}s`,
      };
    }

    // Concurrent-pending cap per principal (§10.3).
    const pending = this.db
      .prepare(`SELECT COUNT(*) c FROM uploads WHERE created_by = ? AND state = 'pending'`)
      .get(principal.sub) as { c: number };
    if (pending.c >= this.config.limits.maxPendingUploads) {
      this.audit(principal, 'quota_refused', { outcome: 'denied', ticket_id: intent.ticket_id, detail: { reason: 'max_pending_uploads' } });
      throw new DriveError('QUOTA_EXHAUSTED', 'too many concurrent pending uploads', { cap: this.config.limits.maxPendingUploads });
    }

    // Resolve-or-create the logical artifact (stable artifact_id for the reference).
    const state = this.ticketStateForRegistration(intent.ticket_id);
    const upsert = this.db.transaction((): string => {
      const found = this.db
        .prepare(`SELECT artifact_id FROM artifacts WHERE ticket_id = ? AND logical_name = ?`)
        .get(intent.ticket_id, intent.logical_name) as { artifact_id: string } | undefined;
      if (found) return found.artifact_id;
      const aid = artifactId();
      this.db
        .prepare(
          `INSERT INTO artifacts (artifact_id, ticket_id, logical_name, current_version_id, ticket_state, created_by, created_at)
           VALUES (?,?,?,?,?,?,?)`,
        )
        .run(aid, intent.ticket_id, intent.logical_name, null, state, principal.sub, this.clock.iso());
      return aid;
    });
    const aid = upsert.immediate();

    const uid = newUploadId();
    try {
      this.db
        .prepare(
          `INSERT INTO uploads (upload_id, state, created_by, op_id, ticket_id, logical_name, note_id, fencing_token,
                                mime_client_hint, expected_sha256, artifact_id, result_version_id, last_activity_at, bytes_staged, created_at)
           VALUES (?, 'pending', ?,?,?,?,?,?,?,?,?,NULL,?,0,?)`,
        )
        .run(
          uid,
          principal.sub,
          intent.op_id,
          intent.ticket_id,
          intent.logical_name,
          intent.note_id ?? null,
          fencing,
          intent.mime_hint ?? null,
          intent.expected_sha256 ?? null,
          aid,
          this.clock.iso(),
          this.clock.iso(),
        );
    } catch (e) {
      // Concurrent same-(sub, op_id) register lost the race to the UNIQUE constraint ⇒ collapse
      // to the winner's session (idempotent replay), never a 500 (§4 idempotency, TOCTOU-safe).
      if ((e as { code?: string }).code === 'SQLITE_CONSTRAINT_UNIQUE' || /UNIQUE/i.test((e as Error).message)) {
        const winner = this.db.prepare(`SELECT * FROM uploads WHERE created_by = ? AND op_id = ?`).get(principal.sub, intent.op_id) as UploadRow | undefined;
        if (winner) {
          return {
            artifact_id: winner.artifact_id ?? aid,
            upload_id: winner.upload_id,
            ticket_state: state,
            expires_policy: `inactivity:${this.config.limits.uploadTtlSec}s`,
          };
        }
      }
      throw e;
    }
    this.audit(principal, 'put_registered', { ticket_id: intent.ticket_id, artifact_id: aid, detail: { upload_id: uid } });
    return { artifact_id: aid, upload_id: uid, ticket_state: state, expires_policy: `inactivity:${this.config.limits.uploadTtlSec}s` };
  }

  // ─────────────────────────── upload session helpers ───────────────────────────

  getUpload(upload_id: string): UploadRow | undefined {
    return this.db.prepare(`SELECT * FROM uploads WHERE upload_id = ?`).get(upload_id) as UploadRow | undefined;
  }

  /** Same-principal guard on EVERY upload-session op (PLAN §4/§4.2). */
  requireOwner(principal: Principal, u: UploadRow): void {
    if (u.created_by !== principal.sub) {
      this.audit(principal, 'ref_denied', { outcome: 'denied', detail: { upload_id: u.upload_id, reason: 'not_owner' } });
      throw new DriveError('NOT_OWNER', 'only the registering principal may touch this upload session');
    }
  }

  touchUpload(upload_id: string, bytesStaged: number): void {
    this.db
      .prepare(`UPDATE uploads SET last_activity_at = ?, bytes_staged = ? WHERE upload_id = ?`)
      .run(this.clock.iso(), bytesStaged, upload_id);
  }

  abortUpload(principal: Principal, upload_id: string): void {
    const u = this.getUpload(upload_id);
    if (!u) throw new DriveError('NOT_FOUND', 'no such upload');
    this.requireOwner(principal, u);
    if (u.state === 'committed') return; // already done; abort is a no-op (idempotent)
    this.db.prepare(`UPDATE uploads SET state = 'aborted', last_activity_at = ? WHERE upload_id = ?`).run(this.clock.iso(), upload_id);
    this.releaseQuota(principal.sub, u.bytes_staged);
    discardStaging(this.layout, upload_id);
    this.audit(principal, 'upload_aborted', { ticket_id: u.ticket_id, artifact_id: u.artifact_id });
  }

  // ─────────────────────────── quota / watermark (§10.3) ───────────────────────────

  private today(): string {
    return this.clock.iso().slice(0, 10);
  }

  dailyBytes(principal: string): number {
    const row = this.db.prepare(`SELECT bytes FROM daily_bytes WHERE principal = ? AND day = ?`).get(principal, this.today()) as
      | { bytes: number }
      | undefined;
    return row?.bytes ?? 0;
  }

  /** Charge streamed bytes against the per-principal daily quota; throws 429 over the cap. */
  chargeQuota(principal: string, delta: number): void {
    const day = this.today();
    const cur = this.dailyBytes(principal);
    if (cur + delta > this.config.limits.dailyBytesQuota) {
      throw new DriveError('QUOTA_EXHAUSTED', 'daily byte quota exhausted', {
        quota: this.config.limits.dailyBytesQuota,
        used: cur,
      });
    }
    this.db
      .prepare(
        `INSERT INTO daily_bytes (principal, day, bytes) VALUES (?,?,?)
         ON CONFLICT(principal, day) DO UPDATE SET bytes = bytes + excluded.bytes`,
      )
      .run(principal, day, delta);
  }

  releaseQuota(principal: string, delta: number): void {
    if (delta <= 0) return;
    this.db
      .prepare(`UPDATE daily_bytes SET bytes = MAX(0, bytes - ?) WHERE principal = ? AND day = ?`)
      .run(delta, principal, this.today());
  }

  /** Volume usage fraction (0..1). Continuous watermark enforcement (§10.3). */
  diskUsedFraction(): number {
    try {
      const s = statfsSync(this.layout.root);
      const total = Number(s.blocks) * Number(s.bsize);
      const free = Number(s.bfree) * Number(s.bsize);
      if (total <= 0) return 0;
      return (total - free) / total;
    } catch {
      return 0; // statfs unavailable ⇒ do not spuriously refuse (healthz surfaces the unknown)
    }
  }

  assertUnderWatermark(): void {
    const frac = this.diskUsedFraction();
    if (frac * 100 >= this.config.limits.diskWatermarkPct) {
      throw new DriveError('DISK_WATERMARK', 'volume usage crossed the safe watermark', {
        used_pct: Math.round(frac * 100),
        watermark_pct: this.config.limits.diskWatermarkPct,
      });
    }
  }

  // ─────────────────────────── content-type policy (§10.2) ───────────────────────────

  assertTypeAllowed(principal: Principal, ticket_id: string, mimeSniffed: string): void {
    if (isExecutable(mimeSniffed) && !this.config.limits.allowExecutables) {
      this.audit(principal, 'type_rejected', { outcome: 'rejected', ticket_id, detail: { mime: mimeSniffed } });
      throw new DriveError('TYPE_REJECTED', 'executable content is rejected by default (DRIVE_ALLOW_EXECUTABLES=false)', {
        mime: mimeSniffed,
      });
    }
  }

  // ─────────────────────────── the crash-safe write path (§3.3) ───────────────────────────

  /**
   * Commit a fully-staged upload. The ordering (all synchronous ⇒ better-sqlite3's IMMEDIATE
   * transaction IS the single-writer commit lock, no JS interleaving):
   *   BEGIN IMMEDIATE
   *     → compute committed-to-be values (artifact upsert resolve, seq, pointer)
   *     → ENFORCE FENCING (staleness reject; raise high-water)      §3.6
   *     → dedup/refcount the blob row
   *     → append + fsync the version journal line (committed values) §3.4
   *     → materialize (rename) the temp into CAS if this writer owns it
   *   COMMIT
   * Crash before journal-fsync ⇒ staging temp only. Crash after ⇒ reconciler replays
   * idempotently on version_id. No ordering references bytes that don't exist.
   */
  commit(principal: Principal, upload_id: string, mat: MaterializedUpload): CommitResult {
    const u = this.getUpload(upload_id);
    if (!u) throw new DriveError('NOT_FOUND', 'no such upload');
    this.requireOwner(principal, u);
    if (u.state === 'committed' && u.result_version_id) {
      // Idempotent replay: return the prior result.
      const v = this.db.prepare(`SELECT * FROM artifact_versions WHERE version_id = ?`).get(u.result_version_id) as any;
      return {
        artifact_id: v.artifact_id,
        version_id: v.version_id,
        seq: v.seq,
        sha256: v.sha256,
        mime_sniffed: v.mime_sniffed,
        size_bytes: v.size_bytes,
      };
    }
    if (u.state !== 'pending') throw new DriveError('UPLOAD_STATE', `upload is ${u.state}`);

    this.assertTypeAllowed(principal, u.ticket_id, mat.mimeSniffed);
    if (u.expected_sha256 && u.expected_sha256 !== mat.sha256) {
      throw new DriveError('CONFLICT', 'expected_sha256 mismatch', { expected: u.expected_sha256, got: mat.sha256 });
    }

    const vid = versionId();
    const aid = u.artifact_id!;
    const fencing = u.fencing_token; // captured at registration; null ⇒ exempt principal
    const ts = this.clock.iso();

    const tx = this.db.transaction((): CommitResult => {
      // (a) resolve seq = max+1 within the artifact
      const seqRow = this.db
        .prepare(`SELECT COALESCE(MAX(seq),0) m FROM artifact_versions WHERE artifact_id = ?`)
        .get(aid) as { m: number };
      const seq = seqRow.m + 1;

      // (b) ENFORCE FENCING before any side effect (throws STALE_FENCING / raises high-water)
      this.enforceFencingInTxn(u.ticket_id, fencing);

      // (c) dedup/refcount the blob row; this writer owns materialization iff the row is new
      const blobRow = this.db.prepare(`SELECT sha256 FROM blobs WHERE sha256 = ?`).get(mat.sha256) as { sha256: string } | undefined;
      let ownsMaterialization = false;
      if (blobRow) {
        this.db.prepare(`UPDATE blobs SET refcount = refcount + 1 WHERE sha256 = ?`).run(mat.sha256);
      } else {
        this.db.prepare(`INSERT INTO blobs (sha256, size_bytes, refcount, created_at) VALUES (?,?,1,?)`).run(mat.sha256, mat.sizeBytes, ts);
        ownsMaterialization = true;
      }

      // (d) insert the append-only version row
      this.db
        .prepare(
          `INSERT INTO artifact_versions
             (version_id, artifact_id, seq, sha256, ticket_id, note_id, created_by, fencing_token, op_id,
              mime_sniffed, mime_client_hint, size_bytes, original_name, is_delete_marker, derived_from_version_id, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,NULL,?)`,
        )
        .run(
          vid,
          aid,
          seq,
          mat.sha256,
          u.ticket_id,
          u.note_id,
          principal.sub,
          fencing,
          u.op_id,
          mat.mimeSniffed,
          u.mime_client_hint,
          mat.sizeBytes,
          mat.originalName,
          ts,
        );

      // (e) move the current pointer
      this.db.prepare(`UPDATE artifacts SET current_version_id = ? WHERE artifact_id = ?`).run(vid, aid);

      // (f) mark the upload committed (records result for idempotent replay)
      this.db.prepare(`UPDATE uploads SET state = 'committed', result_version_id = ?, last_activity_at = ? WHERE upload_id = ?`).run(vid, ts, upload_id);

      // (g) append + fsync the version journal line with the committed-to-be values
      this.journals.appendVersion({
        evt: eventId(),
        type: 'version_committed',
        ts,
        row: {
          version_id: vid,
          artifact_id: aid,
          seq,
          sha256: mat.sha256,
          ticket_id: u.ticket_id,
          note_id: u.note_id,
          created_by: principal.sub,
          fencing_token: fencing,
          op_id: u.op_id,
          mime_sniffed: mat.mimeSniffed,
          size_bytes: mat.sizeBytes,
          original_name: mat.originalName,
        },
        artifact: { artifact_id: aid, ticket_id: u.ticket_id, logical_name: u.logical_name, ticket_state: this.ticketStateForRegistration(u.ticket_id) },
      });

      // (h) materialize from staging into the CAS (idempotent rename); temp still on hand for dedup safety
      if (ownsMaterialization) {
        materialize(this.layout, stagingPath(this.layout, upload_id), mat.sha256);
      } else {
        // dedup hit: re-verify the file exists (guards the historical-GC race, §3.3 rule 5),
        // else re-materialize from the still-held temp.
        if (!blobExistsOnDisk(this.layout, mat.sha256)) {
          materialize(this.layout, stagingPath(this.layout, upload_id), mat.sha256);
        }
      }

      // audit inside the txn so a denial/mutation is one atomic story
      this.audit(principal, 'version_committed', { ticket_id: u.ticket_id, artifact_id: aid, version_id: vid, detail: { seq, sha256: mat.sha256, dedup: !ownsMaterialization } });

      return { artifact_id: aid, version_id: vid, seq, sha256: mat.sha256, mime_sniffed: mat.mimeSniffed, size_bytes: mat.sizeBytes };
    });

    try {
      const res = tx.immediate();
      // dedup hit that did NOT own materialization: discard the temp now (after commit re-verified).
      discardStaging(this.layout, upload_id);
      return res;
    } catch (e) {
      // Commit failed after a possible journal fsync: append a compensating aborted line.
      if (e instanceof DriveError && (e.code === 'STALE_FENCING' || e.code === 'FENCING_REQUIRED')) {
        this.audit(principal, 'stale_fence_rejected', { outcome: 'rejected', ticket_id: u.ticket_id, artifact_id: aid, detail: e.detail });
      } else {
        this.journals.appendVersion({ evt: eventId(), type: 'aborted', version_id: vid, ts: this.clock.iso() });
      }
      throw e;
    }
  }

  // ─────────────────────────── reads ───────────────────────────

  listByTicket(ticket_id: string, opts: { page_token?: string; include_deleted?: boolean } = {}): { artifacts: unknown[]; next_page_token?: string } {
    if (!isValidTicketId(ticket_id)) throw new DriveError('MALFORMED_ID', 'ticket_id malformed', { ticket_id });
    const after = decodePageToken(opts.page_token);
    const rows = this.db
      .prepare(
        `SELECT a.artifact_id, a.logical_name, a.current_version_id, a.ticket_state, a.created_by AS artifact_creator
           FROM artifacts a
          WHERE a.ticket_id = ? AND a.artifact_id > ?
          ORDER BY a.artifact_id ASC
          LIMIT ?`,
      )
      .all(ticket_id, after, PAGE_SIZE + 1) as Array<{ artifact_id: string; logical_name: string; current_version_id: string | null; ticket_state: string; artifact_creator: string }>;
    const page = rows.slice(0, PAGE_SIZE);
    const out: unknown[] = [];
    for (const a of page) {
      const latest = this.latestVersion(a.artifact_id);
      const deleted = a.current_version_id === null && latest !== undefined; // delete-marked (had versions)
      if (!latest) continue; // registration-only artifact, no committed version ⇒ hide
      if (deleted && !opts.include_deleted) continue;
      out.push(this.versionView(a, latest, deleted));
    }
    const result: { artifacts: unknown[]; next_page_token?: string } = { artifacts: out };
    if (rows.length > PAGE_SIZE) result.next_page_token = encodePageToken(page[page.length - 1]!.artifact_id);
    return result;
  }

  /** Distinct-ticket index (UI_SPEC §7 DELTA) — a rebuildable SELECT DISTINCT for the recent view. */
  listTickets(opts: { page_token?: string } = {}): { tickets: unknown[]; next_page_token?: string } {
    const after = decodePageToken(opts.page_token);
    const rows = this.db
      .prepare(
        `SELECT ticket_id,
                COUNT(*) AS artifact_count,
                MAX(created_at) AS last_write,
                SUM(CASE ticket_state WHEN 'verified' THEN 0 WHEN 'verified_absent' THEN 2 ELSE 1 END) AS state_rollup_sum,
                MAX(CASE ticket_state WHEN 'verified_absent' THEN 2 WHEN 'unverified_pending' THEN 1 ELSE 0 END) AS worst_state
           FROM artifacts
          WHERE current_version_id IS NOT NULL AND ticket_id > ?
          GROUP BY ticket_id
          ORDER BY ticket_id ASC
          LIMIT ?`,
      )
      .all(after, PAGE_SIZE + 1) as Array<{ ticket_id: string; artifact_count: number; last_write: string; worst_state: number }>;
    const page = rows.slice(0, PAGE_SIZE);
    const stateName = (n: number) => (n === 2 ? 'verified_absent' : n === 1 ? 'unverified_pending' : 'verified');
    const tickets = page.map((r) => {
      const bytes = this.db.prepare(`SELECT COALESCE(SUM(v.size_bytes),0) b FROM artifacts a JOIN artifact_versions v ON v.version_id = a.current_version_id WHERE a.ticket_id = ?`).get(r.ticket_id) as { b: number };
      return { ticket_id: r.ticket_id, artifact_count: r.artifact_count, total_bytes: bytes.b, last_write: r.last_write, ticket_state: stateName(r.worst_state) };
    });
    const result: { tickets: unknown[]; next_page_token?: string } = { tickets };
    if (rows.length > PAGE_SIZE) result.next_page_token = encodePageToken(page[page.length - 1]!.ticket_id);
    return result;
  }

  private latestVersion(artifact_id: string): any {
    return this.db.prepare(`SELECT * FROM artifact_versions WHERE artifact_id = ? ORDER BY seq DESC LIMIT 1`).get(artifact_id);
  }

  private versionView(a: { artifact_id: string; logical_name: string; ticket_state: string }, v: any, deleted: boolean): Record<string, unknown> {
    return {
      artifact_id: a.artifact_id,
      logical_name: a.logical_name,
      version_id: v.version_id,
      seq: v.seq,
      sha256: v.sha256,
      mime: v.mime_sniffed,
      size_bytes: v.size_bytes,
      created_by: v.created_by,
      ticket_state: a.ticket_state,
      derived: v.derived_from_version_id != null,
      deleted,
      note_id: v.note_id ?? undefined,
      created_at: v.created_at,
    };
  }

  getArtifact(artifact_id: string): { metadata: Record<string, unknown>; versions: unknown[] } | undefined {
    const a = this.db.prepare(`SELECT * FROM artifacts WHERE artifact_id = ?`).get(artifact_id) as any;
    if (!a) return undefined;
    const versions = this.db.prepare(`SELECT * FROM artifact_versions WHERE artifact_id = ? ORDER BY seq ASC`).all(artifact_id) as any[];
    const cur = a.current_version_id ? versions.find((x) => x.version_id === a.current_version_id) : undefined;
    return {
      metadata: {
        artifact_id: a.artifact_id,
        ticket_id: a.ticket_id,
        logical_name: a.logical_name,
        ticket_state: a.ticket_state,
        current_version_id: a.current_version_id,
        deleted: a.current_version_id === null && versions.length > 0,
        created_by: a.created_by,
        created_at: a.created_at,
        current: cur ? this.versionView(a, cur, false) : null,
      },
      versions: versions.map((v) => ({
        version_id: v.version_id,
        seq: v.seq,
        sha256: v.sha256,
        mime: v.mime_sniffed,
        size_bytes: v.size_bytes,
        created_by: v.created_by,
        fencing_token: v.fencing_token,
        note_id: v.note_id ?? undefined,
        is_delete_marker: !!v.is_delete_marker,
        derived_from_version_id: v.derived_from_version_id ?? undefined,
        current: v.version_id === a.current_version_id,
        created_at: v.created_at,
      })),
    };
  }

  /** Resolve the bytes to serve for a content request. */
  resolveContent(artifact_id: string, version_id?: string): { sha256: string; mime: string; size: number; original_name: string; version_id: string; immutable: boolean } {
    const a = this.db.prepare(`SELECT * FROM artifacts WHERE artifact_id = ?`).get(artifact_id) as any;
    if (!a) throw new DriveError('NOT_FOUND', 'no such artifact');
    let v: any;
    if (version_id) {
      v = this.db.prepare(`SELECT * FROM artifact_versions WHERE version_id = ? AND artifact_id = ?`).get(version_id, artifact_id);
      if (!v) throw new DriveError('NOT_FOUND', 'no such version');
    } else {
      if (!a.current_version_id) throw new DriveError('NOT_FOUND', 'artifact is delete-marked (no current version)');
      v = this.db.prepare(`SELECT * FROM artifact_versions WHERE version_id = ?`).get(a.current_version_id);
    }
    if (v.is_delete_marker || !v.sha256) throw new DriveError('NOT_FOUND', 'version has no bytes (delete marker)');
    return {
      sha256: v.sha256,
      mime: v.mime_sniffed,
      size: v.size_bytes,
      original_name: v.original_name,
      version_id: v.version_id,
      immutable: version_id != null, // a specific version URL is immutable ⇒ hard-cacheable
    };
  }

  resolveVersionContent(version_id: string) {
    const v = this.db.prepare(`SELECT * FROM artifact_versions WHERE version_id = ?`).get(version_id) as any;
    if (!v) throw new DriveError('NOT_FOUND', 'no such version');
    if (v.is_delete_marker || !v.sha256) throw new DriveError('NOT_FOUND', 'version has no bytes');
    return { sha256: v.sha256, mime: v.mime_sniffed, size: v.size_bytes, original_name: v.original_name, version_id: v.version_id, immutable: true };
  }

  // ─────────────────────────── operator pointer ops (human-only) ───────────────────────────

  deleteMarker(principal: Principal, artifact_id: string): { version_id: string; seq: number } {
    const a = this.db.prepare(`SELECT * FROM artifacts WHERE artifact_id = ?`).get(artifact_id) as any;
    if (!a) throw new DriveError('NOT_FOUND', 'no such artifact');
    const vid = versionId();
    const ts = this.clock.iso();
    const tx = this.db.transaction((): { version_id: string; seq: number } => {
      const seq = (this.db.prepare(`SELECT COALESCE(MAX(seq),0) m FROM artifact_versions WHERE artifact_id = ?`).get(artifact_id) as { m: number }).m + 1;
      this.db
        .prepare(
          `INSERT INTO artifact_versions (version_id, artifact_id, seq, sha256, ticket_id, note_id, created_by, fencing_token, op_id, mime_sniffed, size_bytes, original_name, is_delete_marker, created_at)
           VALUES (?,?,?,NULL,?,NULL,?,NULL,?, 'application/x-delete-marker', 0, '', 1, ?)`,
        )
        .run(vid, artifact_id, seq, a.ticket_id, principal.sub, `del-${vid}`, ts);
      this.db.prepare(`UPDATE artifacts SET current_version_id = NULL WHERE artifact_id = ?`).run(artifact_id);
      this.journals.appendVersion({ evt: eventId(), type: 'delete_marker', version_id: vid, artifact_id, principal: principal.sub, ts });
      this.audit(principal, 'delete_marker', { ticket_id: a.ticket_id, artifact_id, version_id: vid, detail: { seq } });
      return { version_id: vid, seq };
    });
    return tx.immediate();
  }

  restore(principal: Principal, artifact_id: string, to_version_id: string): void {
    const a = this.db.prepare(`SELECT * FROM artifacts WHERE artifact_id = ?`).get(artifact_id) as any;
    if (!a) throw new DriveError('NOT_FOUND', 'no such artifact');
    const target = this.db.prepare(`SELECT * FROM artifact_versions WHERE version_id = ? AND artifact_id = ?`).get(to_version_id, artifact_id) as any;
    if (!target || target.is_delete_marker) throw new DriveError('NOT_FOUND', 'no such restorable version');
    const ts = this.clock.iso();
    const tx = this.db.transaction(() => {
      this.db.prepare(`UPDATE artifacts SET current_version_id = ? WHERE artifact_id = ?`).run(to_version_id, artifact_id);
      this.journals.appendVersion({ evt: eventId(), type: 'pointer_move', artifact_id, to_version_id, principal: principal.sub, ts });
      this.audit(principal, 'restore', { ticket_id: a.ticket_id, artifact_id, version_id: to_version_id });
    });
    tx.immediate();
  }

  // ─────────────────────────── health ───────────────────────────

  health(): Record<string, unknown> {
    const usedPct = Math.round(this.diskUsedFraction() * 100);
    const lastBackup = this.db.prepare(`SELECT value FROM meta WHERE key = 'last_backup_at'`).get() as { value: string } | undefined;
    const lastVerify = this.db.prepare(`SELECT value FROM meta WHERE key = 'last_verify_at'`).get() as { value: string } | undefined;
    return {
      status: 'ok',
      disk: { used_pct: usedPct, watermark_pct: this.config.limits.diskWatermarkPct, over: usedPct >= this.config.limits.diskWatermarkPct },
      backup: { last_at: lastBackup?.value ?? null },
      verify: { last_at: lastVerify?.value ?? null },
      board_check: this.config.board.apiUrl ? 'live' : 'degraded',
    };
  }
}

function encodePageToken(cursor: string): string {
  return Buffer.from(cursor, 'utf8').toString('base64url');
}
function decodePageToken(token?: string): string {
  if (!token) return '';
  try {
    return Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    throw new DriveError('MALFORMED_ID', 'invalid page_token');
  }
}
