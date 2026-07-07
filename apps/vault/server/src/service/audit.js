/*
 * service/audit.js — D-16(a)/(b) encoded: dual-sink, fail-closed, hash-chained (PLAN §6.1).
 *
 * Every redemption attempt/outcome/denial + release event + manage change is written to TWO sinks:
 *   1. audit_local — append-only, hash-chained (prev_hash/row_hash); HEAD exposed for external anchoring.
 *   2. the off-box WORM sink (hardened log host) — HTTPS POST requiring a 2xx ack.
 *
 * The D-16(a) rule IN CODE (MI-5, Option A): a redemption ATTEMPT/OUTCOME proceeds only if BOTH sinks
 * ack; a DENIAL response is likewise gated behind the same dual-sink ack (if <2 ack, the wrapper returns
 * 503 audit_unavailable instead of the typed 403/404/410). Availability is deliberately traded for
 * non-repudiation (posture-tagged, revisit-before-prod).
 *
 * Secret values NEVER appear here (§6.2): records carry references only; detail_json is machine-only.
 */
import { createHash } from 'node:crypto';

function canonical(obj) {
  // stable stringify for the hash input (sorted keys, nulls preserved).
  const keys = Object.keys(obj).sort();
  return JSON.stringify(keys.map((k) => [k, obj[k] === undefined ? null : obj[k]]));
}
function rowHash(fields, prevHash) {
  return 'sha256:' + createHash('sha256').update(canonical(fields) + '|' + (prevHash || '')).digest('hex');
}

const HASH_FIELDS = ['ts', 'event_type', 'actor_sub', 'handle', 'release_id', 'ticket_id', 'approval_id', 'run_id', 'traceparent', 'op_id', 'outcome', 'detail_json'];

export class AuditService {
  constructor({ db, worm, clock, logger }) {
    this.db = db;
    this.worm = worm;
    this.clock = clock;
    this.log = logger;
    this._insert = db.prepare(`INSERT INTO audit_local
      (ts, event_type, actor_sub, handle, release_id, ticket_id, approval_id, run_id, traceparent, op_id, outcome, detail_json, prev_hash, row_hash)
      VALUES (@ts,@event_type,@actor_sub,@handle,@release_id,@ticket_id,@approval_id,@run_id,@traceparent,@op_id,@outcome,@detail_json,@prev_hash,@row_hash)`);
    this._headStmt = db.prepare('SELECT seq, row_hash FROM audit_local ORDER BY seq DESC LIMIT 1');
  }

  head() {
    const r = this._headStmt.get();
    return r ? { seq: r.seq, row_hash: r.row_hash } : { seq: 0, row_hash: null };
  }

  /** Append one row to audit_local (sync, hash-chained). Returns the inserted {seq, row_hash, record}. */
  appendLocal(rec) {
    const ts = rec.ts || this.clock.iso();
    const detail_json = rec.detail_json != null ? (typeof rec.detail_json === 'string' ? rec.detail_json : JSON.stringify(rec.detail_json)) : null;
    const fields = {
      ts, event_type: rec.event_type, actor_sub: rec.actor_sub ?? null, handle: rec.handle ?? null,
      release_id: rec.release_id ?? null, ticket_id: rec.ticket_id ?? null, approval_id: rec.approval_id ?? null,
      run_id: rec.run_id ?? null, traceparent: rec.traceparent ?? null, op_id: rec.op_id ?? null,
      outcome: rec.outcome ?? null, detail_json,
    };
    const prev = this.head();
    const hashInput = {};
    for (const k of HASH_FIELDS) hashInput[k] = fields[k];
    const row_hash = rowHash(hashInput, prev.row_hash);
    const info = this._insert.run({ ...fields, prev_hash: prev.row_hash, row_hash });
    return { seq: info.lastInsertRowid, row_hash, record: { ...fields, seq: info.lastInsertRowid, prev_hash: prev.row_hash, row_hash } };
  }

  /**
   * Dual-sink write. Appends locally (durable queue), then ships to the WORM sink and awaits its ack.
   * Returns { acked: boolean, seq, row_hash }. acked === true ONLY when BOTH sinks confirm.
   * The redeem gate (§4.1 step 10/13) proceeds only when acked; a denial is emitted only when acked.
   */
  async dualSink(rec) {
    const { seq, row_hash, record } = this.appendLocal(rec); // sink 1 (local) — always durable unless DB error
    let wormAck = false;
    try { wormAck = await this.worm.ship(record); } catch { wormAck = false; }
    if (!wormAck) this.log?.warn?.('worm_no_ack', { seq, event_type: rec.event_type });
    return { acked: wormAck, seq, row_hash };
  }

  /** Verify the local hash chain end-to-end. Returns { ok, brokenAt, head }. Never false-green. */
  verifyChain() {
    const rows = this.db.prepare('SELECT * FROM audit_local ORDER BY seq ASC').all();
    let prev = null;
    for (const r of rows) {
      if ((r.prev_hash || null) !== (prev || null)) return { ok: false, brokenAt: r.seq, reason: 'prev_hash_link', head: this.head() };
      const hashInput = {};
      for (const k of HASH_FIELDS) hashInput[k] = r[k] ?? null;
      const expect = rowHash(hashInput, r.prev_hash);
      if (expect !== r.row_hash) return { ok: false, brokenAt: r.seq, reason: 'row_hash', head: this.head() };
      prev = r.row_hash;
    }
    return { ok: true, brokenAt: null, head: this.head() };
  }

  /**
   * M-4 restore detector — run at boot BEFORE serving /redeem. Compares the local chain HEAD against the
   * WORM sink's last-acked HEAD. Any divergence/regression is treated as a RESTORE: write a restore_marker
   * row (linking the last WORM HEAD) and signal the caller to mass-revoke pending releases + escalate.
   * If the WORM HEAD is unfetchable, /redeem stays CLOSED (D-16a posture) — returned as wormUnavailable.
   */
  async detectRestoreOnBoot() {
    const local = this.head();
    const wormHead = await this.worm.head();
    if (wormHead === null) {
      return { restore: false, wormUnavailable: true, local };
    }
    // Divergence: local behind WORM, or local HEAD hash mismatches WORM at the same seq.
    const regressed = (local.seq || 0) < (wormHead.seq || 0)
      || (local.seq === wormHead.seq && local.row_hash !== wormHead.row_hash);
    if (regressed) {
      this.appendLocal({ event_type: 'restore_marker', outcome: 'ok', detail_json: { worm_head: wormHead, local_at_boot: local } });
      return { restore: true, wormUnavailable: false, local, wormHead };
    }
    return { restore: false, wormUnavailable: false, local, wormHead };
  }
}
