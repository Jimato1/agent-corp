/*
 * service/audit.js — the append-only audit_log + op_id idempotency (PLAN §2.8/§2.9).
 *
 * Every state change from either surface lands an audit row IN THE SAME TRANSACTION as the effect.
 * Rejected SoD-boundary attempts (agent -> done, stale fence, four-eyes violation, second consume,
 * illegal transition) are first-class `violation` rows here — the spike's zero-tolerance telemetry
 * and MC's anomaly feed. op_id dedup rows are inserted in the same tx as the operation (a crash can
 * never commit one without the other); the exception re-check for claim/heartbeat lives in claim.js.
 */
import { ERR } from '../constants.js';
import { biz } from '../errors.js';

export class Audit {
  constructor({ db, clock }) {
    this.db = db;
    this.clock = clock;
    this._ins = db.prepare(`INSERT INTO audit_log
      (ts, actor_sub, surface, action, ticket_id, approval_id, from_state, to_state, fields_changed, op_id, fencing_token, traceparent, outcome)
      VALUES (@ts, @actor_sub, @surface, @action, @ticket_id, @approval_id, @from_state, @to_state, @fields_changed, @op_id, @fencing_token, @traceparent, @outcome)`);
    this._opGet = db.prepare(`SELECT * FROM op_ids WHERE sub = ? AND op_id = ?`);
    this._opIns = db.prepare(`INSERT INTO op_ids (sub, op_id, request_hash, response, created_at) VALUES (?, ?, ?, ?, ?)`);
  }

  /** Record a state change (or any auditable action). Call inside the write transaction. */
  record(row) {
    this._ins.run({
      ts: this.clock.iso(),
      actor_sub: row.actor_sub ?? null,
      surface: row.surface ?? 'internal',
      action: row.action,
      ticket_id: row.ticket_id ?? null,
      approval_id: row.approval_id ?? null,
      from_state: row.from_state ?? null,
      to_state: row.to_state ?? null,
      fields_changed: row.fields_changed ? JSON.stringify(row.fields_changed) : null,
      op_id: row.op_id ?? null,
      fencing_token: row.fencing_token ?? null,
      traceparent: row.traceparent ?? null,
      outcome: row.outcome ?? 'ok',
    });
  }

  /**
   * Record a rejected SoD-boundary attempt as a first-class violation row (PLAN §2.9). Called from a
   * *separate* short transaction (the rejected op's own tx rolled back), so violations are durable
   * even when the attempt failed. Returns nothing; the caller then throws the BusinessError.
   */
  violation(row) {
    this.db.prepare(`INSERT INTO audit_log
      (ts, actor_sub, surface, action, ticket_id, approval_id, from_state, to_state, fields_changed, op_id, fencing_token, outcome)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'violation')`).run(
      this.clock.iso(), row.actor_sub ?? null, row.surface ?? null, row.action, row.ticket_id ?? null,
      row.approval_id ?? null, row.from_state ?? null, row.to_state ?? null,
      row.reason ? JSON.stringify({ reason: row.reason, ...(row.detail || {}) }) : null,
      row.op_id ?? null, row.fencing_token ?? null,
    );
  }

  /**
   * Idempotency check — call at the TOP of a mutating op's transaction. Returns:
   *   { replay: true, response }  — a prior identical op; return its stored response
   *   { replay: false }           — first time; caller runs the effect then calls recordOp()
   * Throws OP_MISMATCH if the same (sub, op_id) was used with a different request_hash.
   */
  checkOp(sub, opId, requestHash) {
    if (!opId) return { replay: false };
    const row = this._opGet.get(sub, opId);
    if (!row) return { replay: false };
    if (row.request_hash != null && requestHash != null && row.request_hash !== requestHash) {
      throw biz(ERR.OP_MISMATCH, 'op_id reused with a different request');
    }
    if (row.response == null) throw biz(ERR.OP_IN_PROGRESS, 'operation in progress');
    return { replay: true, response: JSON.parse(row.response) };
  }

  /** Store the op_id -> response mapping in the same tx as the effect. */
  recordOp(sub, opId, requestHash, response) {
    if (!opId) return;
    this._opIns.run(sub, opId, requestHash ?? null, JSON.stringify(response), this.clock.iso());
  }
}
