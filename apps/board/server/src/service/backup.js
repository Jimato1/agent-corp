/*
 * service/backup.js — CANONICAL-store backup + restore reconciliation (PLAN §16; ARCH §10).
 *
 * The Board DB is CANONICAL (tickets, approvals, host_locks, ceremony_events, audit_log are NOT
 * rebuildable). Mechanism: in-process hot snapshot via `VACUUM INTO` a timestamped file (WAL
 * checkpoint first), hourly, retention N; a daily off-box copy to BOARD_BACKUP_TARGET (deliberately
 * NOT Drive — a mutual-dependency restore is the consistency trap ARCH §10 warns about).
 *
 * RESTORE-CONSISTENCY (a restored Board is older than the world): before serving traffic —
 *   (1) every `granted` approval is auto-revoked and its ticket CAS approved -> awaiting_approval
 *       (amendment A-RR — re-queued for grant without destroying lineage);
 *   (2) all claim leases force-expired and every lock_generation FLOORED to
 *       max(restored_value, unix_epoch_milliseconds_at_restore) — a time-seeded floor a lost window
 *       can never have out-minted;
 *   (3) in-flight huddles -> A1 escalation;
 *   (4) a restore marker lands in the audit log.
 * executing/verifying tickets restore as-is and reconcile against Gateway/connector reports.
 */
import fs from 'node:fs';
import path from 'node:path';

export class Backup {
  constructor({ db, clock, config, audit, logger }) {
    this.db = db;
    this.clock = clock;
    this.config = config;
    this.audit = audit;
    this.log = logger;
    this._timer = null;
  }

  /** Hot snapshot to backupDir/board-<ts>.db (WAL checkpoint first). Returns the path. */
  snapshot() {
    fs.mkdirSync(this.config.backupDir, { recursive: true });
    this.db.pragma('wal_checkpoint(TRUNCATE)');
    const file = path.join(this.config.backupDir, `board-${this.clock.now()}.db`);
    this.db.prepare(`VACUUM INTO ?`).run(file);
    this._prune();
    this.log?.info?.('backup_snapshot', { file, target: this.config.backupTarget || null });
    return file;
  }

  _prune() {
    try {
      const files = fs.readdirSync(this.config.backupDir).filter((f) => /^board-\d+\.db$/.test(f)).sort();
      while (files.length > this.config.backupRetention) {
        const f = files.shift();
        fs.rmSync(path.join(this.config.backupDir, f));
      }
    } catch { /* best-effort */ }
  }

  /**
   * Reconcile a freshly-restored DB before serving. Idempotent; run once at boot when a restore marker
   * is detected OR unconditionally at boot (the operations are all safe no-ops on a healthy DB except
   * the fencing floor, which is defense-in-depth). We run the fencing floor + granted-approval sweep
   * always at boot: a crash-restart is indistinguishable from a restore for the fencing sequence, and
   * flooring to wall-clock ms is provably un-out-minnable.
   */
  reconcileOnBoot() {
    const nowMs = this.clock.now();
    const tx = this.db.transaction(() => {
      // (2) time-seeded fencing floor on every lock (monotonicity across restore, §16).
      this.db.prepare(`UPDATE host_locks SET lock_generation = MAX(lock_generation, ?)`).run(nowMs);
      // (2) force-expire claim leases (execution holds are left as-is to reconcile against the Gateway).
      const staleClaims = this.db.prepare(`SELECT hl.resource_id, hl.claimed_by_ticket FROM host_locks hl WHERE hl.hold_kind = 'claim' AND hl.claimed_by_ticket IS NOT NULL`).all();
      for (const c of staleClaims) {
        this.db.prepare(`UPDATE host_locks SET claimed_by_ticket = NULL, claimed_by_agent = NULL, hold_kind = NULL, lease_expires_at = NULL, lock_generation = lock_generation + 1 WHERE resource_id = ?`).run(c.resource_id);
        this.db.prepare(`UPDATE tickets SET status = CASE WHEN status = 'in_progress' THEN 'todo' ELSE status END, claimed_by = NULL, lease_expires_at = NULL, fencing_token = NULL, updated_at = ? WHERE id = ?`).run(this.clock.iso(), c.claimed_by_ticket);
      }
      // (1) granted (unconsumed) approvals -> revoked; ticket approved -> awaiting_approval (A-RR).
      const granted = this.db.prepare(`SELECT id, ticket_id FROM approvals WHERE status = 'granted'`).all();
      for (const a of granted) {
        this.db.prepare(`UPDATE approvals SET status = 'revoked' WHERE id = ?`).run(a.id);
        this.db.prepare(`UPDATE tickets SET status = CASE WHEN status = 'approved' THEN 'awaiting_approval' ELSE status END, updated_at = ? WHERE id = ?`).run(this.clock.iso(), a.ticket_id);
      }
      // (3) in-flight huddles on in_progress tickets -> A1 escalation.
      const huddles = this.db.prepare(`SELECT h.ticket_id FROM huddles h JOIN tickets t ON t.id = h.ticket_id WHERE h.status = 'open' AND t.status = 'in_progress'`).all();
      for (const h of huddles) {
        this.db.prepare(`UPDATE tickets SET status = 'needs_review', machine_reason = 'restore_reconcile', claimed_by = NULL, fencing_token = NULL, updated_at = ? WHERE id = ?`).run(this.clock.iso(), h.ticket_id);
        this.db.prepare(`UPDATE huddles SET status = 'escalated' WHERE ticket_id = ?`).run(h.ticket_id);
      }
      // (4) restore marker.
      this.audit.record({ surface: 'internal', action: 'restore_reconcile', fields_changed: { fencing_floor: nowMs, revoked_grants: granted.length, requeued_claims: staleClaims.length, escalated_huddles: huddles.length } });
      this.db.prepare(`INSERT OR REPLACE INTO meta (k, v) VALUES ('last_boot_reconcile', ?)`).run(String(nowMs));
    });
    tx.immediate();
  }

  start() {
    if (this._timer) return;
    this._timer = setInterval(() => {
      try { this.snapshot(); } catch (e) { this.log?.error?.('backup_failed', { err: String(e) }); }
    }, this.config.backupIntervalMs);
    if (this._timer.unref) this._timer.unref();
  }
  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
}
