/*
 * service/releases.js — the powerless release lifecycle (PLAN §5.2). A release is a rel-+ULID SHADOW an
 * agent stages after claiming a ticket; it is NON-REDEEMABLE and stays powerless until the §4 redeem
 * pipeline passes. Releases are per-ticket, per-handle, never bundled (a leaked reference names one
 * credential's shadow, not a ticket's worth).
 *
 * request preconditions (M-12): Board /facts/ticket confirms exists ∧ claimed_by == caller sub ∧ status
 * non-terminal ∧ host_id matches the handle's. Board down → retryable 503. A conflicting request from
 * the (necessarily same) claimant with a new op_id RETURNS the existing pending release (collapses the
 * slot-squat + the dropped-response re-heal). Auto-revoke on the ticket's terminal transition; TTL
 * expiry is a lazy CAS + sweep; and pending releases are UNCONDITIONALLY revoked on every cold start (§7.4).
 */
import { RELEASE_STATUS, RELEASE_ERR } from '../constants.js';
import { mintReleaseId, isReleaseId } from '../ids.js';
import { biz } from '../errors.js';
import { BoardUnreachable } from '../clients/board.js';

const TERMINAL_TICKET = new Set(['done', 'failed', 'cancelled']);

export class ReleaseService {
  constructor({ db, board, clock, audit, config, logger }) {
    this.db = db;
    this.board = board;
    this.clock = clock;
    this.audit = audit;
    this.config = config;
    this.log = logger;
  }

  #handle(handle) {
    return this.db.prepare('SELECT * FROM handles WHERE handle = ? AND retired_at IS NULL').get(handle);
  }

  /** MCP `vault_request_release`. Returns { release_id, status:'pending', expires_at }. */
  async requestRelease({ principal, ticketId, handle, opId }) {
    const h = this.#handle(handle);
    if (!h) throw biz(RELEASE_ERR.UNKNOWN_HANDLE.http, RELEASE_ERR.UNKNOWN_HANDLE.code, 'unknown handle');

    // Board facts (fail-closed): claimant + non-terminal + host match (§5.2).
    let facts;
    try {
      facts = await this.board.ticket(ticketId);
    } catch (e) {
      if (e instanceof BoardUnreachable) throw biz(RELEASE_ERR.BOARD_UNREACHABLE.http, RELEASE_ERR.BOARD_UNREACHABLE.code, 'board unreachable');
      throw e;
    }
    if (!facts || !facts.exists) throw biz(RELEASE_ERR.NOT_FOUND.http, RELEASE_ERR.NOT_FOUND.code, 'ticket not found');
    if (facts.claimed_by !== principal.sub) throw biz(RELEASE_ERR.NOT_CLAIMANT.http, RELEASE_ERR.NOT_CLAIMANT.code, 'not the claimant');
    if (TERMINAL_TICKET.has(facts.status)) throw biz(RELEASE_ERR.TICKET_TERMINAL.http, RELEASE_ERR.TICKET_TERMINAL.code, 'ticket terminal');
    if (facts.host_id !== h.host_id) throw biz(RELEASE_ERR.HOST_MISMATCH.http, RELEASE_ERR.HOST_MISMATCH.code, 'ticket host does not match handle host');

    // Conflict-collapse: an existing PENDING release for (ticket_id, handle) is returned as-is (§5.2).
    const existing = this.db.prepare(
      `SELECT * FROM releases WHERE ticket_id = ? AND handle = ? AND status = 'pending'`,
    ).get(ticketId, handle);
    if (existing) return { release_id: existing.release_id, status: existing.status, expires_at: existing.expires_at };

    const release_id = mintReleaseId();
    const now = this.clock.now();
    const expires_at = now + this.config.releaseTtlMs;
    this.db.prepare(
      `INSERT INTO releases (release_id, handle, host_id, ticket_id, requested_by_sub, request_op_id, status, created_at, expires_at)
       VALUES (?,?,?,?,?,?, 'pending', ?, ?)`,
    ).run(release_id, handle, h.host_id, ticketId, principal.sub, opId ?? null, this.clock.iso(), expires_at);

    this.audit.dualSink({ event_type: 'release_staged', actor_sub: principal.sub, handle, release_id, ticket_id: ticketId, op_id: opId, outcome: 'ok' })
      .catch((e) => this.log?.warn?.('release_audit_failed', { err: String(e) }));

    return { release_id, status: RELEASE_STATUS.PENDING, expires_at };
  }

  /** MCP `vault_release_status`. Bare enum only (MI-10): { status }. No redeemer identity, no timestamps. */
  releaseStatus(releaseId) {
    if (!isReleaseId(releaseId)) throw biz(404, 'unknown_release', 'unknown release');
    const r = this.getRelease(releaseId);
    if (!r) throw biz(404, 'unknown_release', 'unknown release');
    return { status: r.status };
  }

  /** Internal: full row, lazily expiring a stale pending. */
  getRelease(releaseId) {
    const r = this.db.prepare('SELECT * FROM releases WHERE release_id = ?').get(releaseId);
    if (!r) return null;
    if (r.status === RELEASE_STATUS.PENDING && r.expires_at <= this.clock.now()) {
      this.#cas(releaseId, RELEASE_STATUS.PENDING, RELEASE_STATUS.EXPIRED);
      return { ...r, status: RELEASE_STATUS.EXPIRED };
    }
    return r;
  }

  #cas(releaseId, from, to, extra = {}) {
    const setCols = Object.keys(extra).map((k) => `${k} = @${k}`);
    const sql = `UPDATE releases SET status = @to${setCols.length ? ', ' + setCols.join(', ') : ''} WHERE release_id = @id AND status = @from`;
    const info = this.db.prepare(sql).run({ id: releaseId, from, to, ...extra });
    return info.changes === 1;
  }

  /** Single-winner CAS pending→redeemed at the redeem instant (§4.1 step 13). Returns true iff this call won. */
  markRedeemed(releaseId, { redeemedBy, redeemOpId, approvalId, runId }) {
    return this.#cas(releaseId, RELEASE_STATUS.PENDING, RELEASE_STATUS.REDEEMED, {
      redeemed_at: this.clock.iso(), redeemed_by: redeemedBy, redeem_op_id: redeemOpId ?? null,
      approval_id: approvalId ?? null, run_id: runId ?? null,
    });
  }

  /** Bump the re-release counter (M-11 cap). Returns the new count, or null if over cap. */
  bumpReRelease(releaseId, cap) {
    const r = this.db.prepare('SELECT re_release_count FROM releases WHERE release_id = ?').get(releaseId);
    if (!r) return null;
    if (r.re_release_count >= cap) return null;
    this.db.prepare('UPDATE releases SET re_release_count = re_release_count + 1 WHERE release_id = ?').run(releaseId);
    return r.re_release_count + 1;
  }

  /** Operator (UI) or Gateway kill-chain: revoke a single pending release. */
  revokeById(releaseId, actorSub) {
    const ok = this.#cas(releaseId, RELEASE_STATUS.PENDING, RELEASE_STATUS.REVOKED);
    this.audit.dualSink({ event_type: 'release_revoked', actor_sub: actorSub, release_id: releaseId, outcome: ok ? 'ok' : 'noop' }).catch(() => {});
    return ok;
  }

  /** Gateway kill-chain `POST /releases/revoke {ticket_id}` (G-4): revoke all pending for a ticket. */
  revokeByTicket(ticketId, actorSub) {
    const rows = this.db.prepare(`SELECT release_id FROM releases WHERE ticket_id = ? AND status = 'pending'`).all(ticketId);
    let revoked = 0;
    for (const { release_id } of rows) if (this.#cas(release_id, RELEASE_STATUS.PENDING, RELEASE_STATUS.REVOKED)) revoked++;
    this.audit.dualSink({ event_type: 'release_revoked_ticket', actor_sub: actorSub, ticket_id: ticketId, outcome: 'ok', detail_json: { revoked } }).catch(() => {});
    return { revoked };
  }

  /** Lazy sweep: pending → expired past TTL (§5.2). */
  sweepExpired() {
    const now = this.clock.now();
    const info = this.db.prepare(`UPDATE releases SET status = 'expired' WHERE status = 'pending' AND expires_at <= ?`).run(now);
    return info.changes;
  }

  /** Cold-start: unconditionally revoke all pending releases (§7.4 — agents re-request cheaply). */
  revokeAllPendingOnColdStart() {
    const info = this.db.prepare(`UPDATE releases SET status = 'revoked' WHERE status = 'pending'`).run();
    if (info.changes) this.audit.appendLocal({ event_type: 'cold_start_revoke', outcome: 'ok', detail_json: { revoked: info.changes } });
    return info.changes;
  }

  list({ host, ticket, status } = {}) {
    let sql = 'SELECT * FROM releases WHERE 1=1';
    const args = [];
    if (host) { sql += ' AND host_id = ?'; args.push(host); }
    if (ticket) { sql += ' AND ticket_id = ?'; args.push(ticket); }
    if (status) { sql += ' AND status = ?'; args.push(status); }
    sql += ' ORDER BY created_at DESC LIMIT 500';
    return this.db.prepare(sql).all(...args);
  }
}
