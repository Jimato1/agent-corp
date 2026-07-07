/*
 * service/redeem.js — THE SoD seam (PLAN §4). The Gateway-only credential redemption pipeline.
 *
 * A deterministic, ORDERED, fail-closed-in-code pipeline. The caller may be a weak/hostile model; EVERY
 * step rejects invalid redemptions server-side with a precise, machine-only deny reason. The Vault does
 * NOT trust the Gateway's assertion about anything — it re-validates the token itself (steps 1–6), checks
 * the live denylist+introspect itself (step 7), re-reads the Board approval itself (step 9, D-4), and
 * performs the engine op with the Gateway's OWN JWT so OpenBao independently re-verifies (step 11).
 *
 * Step order (M-11 — cheap local checks BEFORE the expensive introspect/Board calls so a malformed/
 * replayed flood is rejected without amplifying against auth/Board/WORM):
 *   0  channel/cert (mTLS creds listener; client cert is the Gateway's)
 *   1–6 §8-pin token validation (kid/sig/iss/exp/aud==vault-single/scope∋read-credential/sub==svc:gateway/cnf)
 *   8  release record (exists, pending|idempotent-repeat, ticket bound, not expired)      [cheap — before 7/9]
 *   7  destructive-exec live check (pushed denylist AND uncached introspect; kill>=G1 denies)
 *   9  D-4 INDEPENDENT Board approval verification (status=consumed ∧ consumed_by==sub ∧ ids match ∧ class ok ∧ fresh)
 *   10 fail-closed audit gate — the ATTEMPT record dual-sink-acked (>=2 sinks) BEFORE any engine call
 *   11 engine op with the Gateway's own JWT (login → per-host num_uses=1 child token → KV read/SSH sign)
 *   12 §8 drift bound — if now − revocation_check_ts > D=1s, re-run step 7 or DENY
 *   13 outcome record dual-sink-acked; release CAS pending→redeemed (single-use); ONLY then the response leaves
 *
 * Standing regression (contract §3): agent token → 403, always — and it can't even reach here from edge.
 */
import { REDEEM, RE_RELEASE_CAP, RELEASE_STATUS, HANDLE_KIND, approvalClassSufficient, ACTION_CLASS } from '../constants.js';
import { RedeemError } from '../errors.js';
import { BoardUnreachable } from '../clients/board.js';
import { EngineError } from '../engine/openbao.js';
import { parseHandle } from '../ids.js';

const TERMINAL_TICKET = new Set(['done', 'failed', 'cancelled']);

export class RedeemService {
  constructor({ db, rs, revocation, board, engine, audit, releases, chat, clock, config, logger }) {
    Object.assign(this, { db, rs, revocation, board, engine, audit, releases, chat, clock, config, logger });
  }

  #handle(handle) {
    return this.db.prepare('SELECT * FROM handles WHERE handle = ? AND retired_at IS NULL').get(handle);
  }

  /**
   * Run the pipeline. `ctx` carries the transport-verified channel facts:
   *   { channelOk, channelCn, channelThumbprint, token, tokenClaims }  (tokenClaims only in devUnsafe)
   * `req` is the validated request body (§4 schema). Returns { body, http } on success; throws RedeemError.
   */
  async redeem({ ctx, req }) {
    // ---- STEP 0: channel/cert. The request MUST have arrived on the creds mTLS listener with a client
    // cert that chains to the suite-internal CA and identifies the Gateway. Enforced in code; a request
    // reaching /redeem without a Gateway channel cert is a first-class exfiltration signal (§6.3).
    if (!ctx.channelOk) {
      await this.#denied(req, null, REDEEM.NOT_GATEWAY_CHANNEL, { channel: ctx.channelCn || null }, /*exfil*/ true);
      throw new RedeemError(REDEEM.NOT_GATEWAY_CHANNEL);
    }

    // ---- STEPS 1–6: §8-pin token validation. Throws typed RedeemError with the precise reject code.
    let holder;
    try {
      holder = await this.rs.validateHolderRedeem(this.config.devUnsafeNoAuth ? ctx.tokenClaims : ctx.token, { channelThumbprint: ctx.channelThumbprint });
    } catch (e) {
      if (e instanceof RedeemError) {
        // A denied redemption bearing an agent-class sub (i.e. sub != svc:gateway) is the canonical
        // exfiltration signal (§6.3). The RedeemError already carries the precise §8-pin reject code.
        const exfil = e.code === REDEEM.NOT_GATEWAY.code;
        await this.#denied(req, this.#subFromClaims(ctx), { code: e.code, http: e.httpStatus, retry: e.retry }, {}, exfil);
        throw e;
      }
      throw e;
    }
    const sub = holder.sub;

    // ---- STEP 8 (moved ahead of 7/9 per M-11): release record. Cheap local check.
    const release = this.releases.getRelease(req.release_id);
    if (!release) { await this.#denied(req, sub, REDEEM.UNKNOWN_RELEASE); throw new RedeemError(REDEEM.UNKNOWN_RELEASE); }
    if (release.ticket_id !== req.ticket_id) { await this.#denied(req, sub, REDEEM.RELEASE_NOT_PENDING, { reason: 'ticket_mismatch' }); throw new RedeemError(REDEEM.RELEASE_NOT_PENDING); }
    if (release.status === RELEASE_STATUS.EXPIRED) { await this.#denied(req, sub, REDEEM.RELEASE_EXPIRED); throw new RedeemError(REDEEM.RELEASE_EXPIRED); }

    // Idempotent re-release path (§4.4): a repeat (release_id, op_id) from the SAME validated sub, while
    // the release is already `redeemed`, is honored as a re-release IF the full pipeline still passes.
    const isRepeat = release.status === RELEASE_STATUS.REDEEMED
      && release.redeem_op_id && req.op_id && release.redeem_op_id === req.op_id && release.redeemed_by === sub;
    if (release.status !== RELEASE_STATUS.PENDING && !isRepeat) {
      await this.#denied(req, sub, REDEEM.RELEASE_NOT_PENDING, { status: release.status });
      throw new RedeemError(REDEEM.RELEASE_NOT_PENDING);
    }

    const handle = this.#handle(release.handle);
    if (!handle) { await this.#denied(req, sub, REDEEM.RELEASE_NOT_PENDING, { reason: 'handle_retired' }); throw new RedeemError(REDEEM.RELEASE_NOT_PENDING); }

    // ---- STEP 7: destructive-exec LIVE check (denylist + uncached introspect). Fail-closed in code.
    let revocationCheckTs;
    try {
      revocationCheckTs = await this.revocation.liveCheckRedeem({ token: ctx.token, jti: holder.jti, sub });
    } catch (e) {
      const spec = e instanceof RedeemError ? e : new RedeemError(REDEEM.AUTH_UNREACHABLE);
      await this.#denied(req, sub, { code: spec.code, http: spec.httpStatus, retry: spec.retry }, e.detail || {}, false);
      throw spec;
    }

    // ---- STEP 9: D-4 INDEPENDENT approval verification. The Vault re-reads the Board itself.
    await this.#verifyApproval({ req, sub, release, handle });

    // ---- STEP 10: fail-closed audit gate — the ATTEMPT must be dual-sink acked BEFORE any engine call.
    const attempt = await this.audit.dualSink({
      event_type: 'redeem_attempt', actor_sub: sub, handle: release.handle, release_id: release.release_id,
      ticket_id: req.ticket_id, approval_id: req.approval_id, run_id: req.run_id, traceparent: req.traceparent, op_id: req.op_id, outcome: 'ok',
    });
    if (!attempt.acked) throw new RedeemError(REDEEM.AUDIT_UNAVAILABLE); // <2 sinks → refuse (D-16a)

    // Re-release cap (M-11): count this re-release BEFORE the engine op.
    if (isRepeat) {
      const n = this.releases.bumpReRelease(release.release_id, RE_RELEASE_CAP);
      if (n === null) { await this.#denied(req, sub, REDEEM.RE_RELEASE_CAP); throw new RedeemError(REDEEM.RE_RELEASE_CAP); }
    }

    // ---- STEP 12 (MI-3: run immediately before the irreversible engine call): drift bound D=1s.
    if (this.clock.now() - revocationCheckTs > this.config.driftBoundMs) {
      try { revocationCheckTs = await this.revocation.liveCheckRedeem({ token: ctx.token, jti: holder.jti, sub }); }
      catch (e) {
        const spec = e instanceof RedeemError ? e : new RedeemError(REDEEM.AUTH_UNREACHABLE);
        await this.#denied(req, sub, { code: spec.code, http: spec.httpStatus, retry: spec.retry }, {}, false);
        throw spec;
      }
    }

    // ---- STEP 11: engine op with the Gateway's OWN JWT (layer-2 independent re-verification).
    let engineOut;
    try {
      const parsed = parseHandle(release.handle);
      engineOut = await this.engine.redeem({
        gatewayJwt: ctx.token, jti: holder.jti, exp: holder.exp,
        kind: handle.kind, hostId: handle.host_id,
        kvPath: handle.kind === HANDLE_KIND.KV ? handle.openbao_ref : undefined,
        signRole: handle.kind === HANDLE_KIND.SSH_CA ? handle.openbao_ref : undefined,
        sshPublicKey: req.ssh_public_key,
        principals: handle.ssh_principal, // server-derived, non-empty; never free request input
        ticketId: req.ticket_id,
        ttl: this.config.sshCertTtl,
      });
    } catch (e) {
      if (e instanceof EngineError) {
        const spec = e.kind === 'denied' ? REDEEM.ENGINE_DENIED : e.kind === 'sealed' ? REDEEM.ENGINE_SEALED : REDEEM.ENGINE_UNAVAILABLE;
        // engine_denied means the two layers DISAGREED — always anomalous → escalate + never-retry.
        await this.#denied(req, sub, spec, { engine: e.kind }, /*exfil*/ e.kind === 'denied');
        throw new RedeemError(spec);
      }
      throw e;
    }

    // ---- STEP 13: outcome record dual-sink acked; release CAS pending→redeemed (first time only). If the
    // outcome write fails after an SSH cert was signed, the cert is NOT returned (it expires by TTL, never
    // having left the host); the failure is logged + escalated.
    const outcome = await this.audit.dualSink({
      event_type: isRepeat ? 're_release' : 'redeem_outcome', actor_sub: sub, handle: release.handle, release_id: release.release_id,
      ticket_id: req.ticket_id, approval_id: req.approval_id, run_id: req.run_id, traceparent: req.traceparent, op_id: req.op_id,
      outcome: 'ok', detail_json: { kind: engineOut.kind, engine_request_id: engineOut.engineRequestId, re_release: isRepeat },
    });
    if (!outcome.acked) {
      this.logger?.error?.('redeem_outcome_unlogged', { release_id: release.release_id, ticket_id: req.ticket_id });
      throw new RedeemError(REDEEM.AUDIT_UNAVAILABLE); // response withheld; signed cert never leaves the box
    }

    if (!isRepeat) {
      const won = this.releases.markRedeemed(release.release_id, { redeemedBy: sub, redeemOpId: req.op_id, approvalId: req.approval_id, runId: req.run_id });
      if (!won) { // lost the single-use race to a concurrent redeem
        await this.#denied(req, sub, REDEEM.RELEASE_NOT_PENDING, { reason: 'cas_lost' });
        throw new RedeemError(REDEEM.RELEASE_NOT_PENDING);
      }
    }

    const body = engineOut.kind === HANDLE_KIND.SSH_CA
      ? { signed_cert: engineOut.signed_cert, metadata: engineOut.metadata, release_id: release.release_id, audit_ref: outcome.seq }
      : { plaintext: engineOut.plaintext, metadata: engineOut.metadata, release_id: release.release_id, audit_ref: outcome.seq };
    return { http: 200, body };
  }

  /**
   * STEP 9 — the D-4 predicate (board-consumers-facts-read.md /facts/approval + REVIEW_2 ticket_status).
   * status=='consumed' ∧ consumed_by==sub ∧ (ticket_id,host_id,plan_hash) match request AND handle host
   * ∧ handle.requires_approval_class <= facts.action_class (M-2) ∧ freshness (B-4: W binds first redeem;
   * mid-run re-release derives freshness from live authority — ticket.status=='executing' ∧ execution hold).
   * Board unreachable/timeout → DENY (fail-closed).
   */
  async #verifyApproval({ req, sub, release, handle }) {
    let facts;
    try { facts = await this.board.approval(req.approval_id); }
    catch (e) {
      if (e instanceof BoardUnreachable) { await this.#denied(req, sub, REDEEM.BOARD_UNREACHABLE); throw new RedeemError(REDEEM.BOARD_UNREACHABLE); }
      throw e;
    }
    const deny = async (detail) => { await this.#denied(req, sub, REDEEM.APPROVAL_MISMATCH, detail); throw new RedeemError(REDEEM.APPROVAL_MISMATCH); };

    if (!facts || !facts.exists) return deny({ reason: 'unknown_approval' });
    if (facts.status !== 'consumed') { await this.#denied(req, sub, REDEEM.APPROVAL_NOT_CONSUMED, { status: facts.status }); throw new RedeemError(REDEEM.APPROVAL_NOT_CONSUMED); }
    if (facts.consumed_by !== sub) return deny({ reason: 'consumed_by' }); // MI-1 cross-check on Board authority
    if (facts.ticket_id !== req.ticket_id) return deny({ reason: 'ticket_id' });
    if (facts.host_id !== req.host_id) return deny({ reason: 'host_id_req' });
    if (facts.host_id !== handle.host_id) return deny({ reason: 'host_id_handle' });
    if (facts.plan_hash !== req.plan_hash) return deny({ reason: 'plan_hash' });
    // M-2 credential-class bind: a reversible-class approval cannot redeem a root-class handle.
    if (!approvalClassSufficient(handle.requires_approval_class, facts.action_class)) return deny({ reason: 'class', required: handle.requires_approval_class, granted: facts.action_class });

    // Freshness (B-4). First redemption: W binds (run-start latency). Mid-run re-release: live authority.
    const consumedAt = typeof facts.consumed_at === 'number' ? facts.consumed_at : Date.parse(facts.consumed_at || '');
    const firstRedeem = release.status === RELEASE_STATUS.PENDING;
    if (firstRedeem) {
      if (!Number.isFinite(consumedAt) || this.clock.now() - consumedAt > this.config.redeemWindowMs) {
        await this.#denied(req, sub, REDEEM.APPROVAL_STALE, { by: 'W' }); throw new RedeemError(REDEEM.APPROVAL_STALE);
      }
    } else {
      // re-release: the never-reaped execution hold IS the "run still legitimately in flight" signal.
      const tstatus = facts.ticket_status;
      if (tstatus !== 'executing') { await this.#denied(req, sub, REDEEM.APPROVAL_STALE, { by: 'ticket_status', ticket_status: tstatus }); throw new RedeemError(REDEEM.APPROVAL_STALE); }
      let lock;
      try { lock = await this.board.hostLock(req.host_id); }
      catch (e) { if (e instanceof BoardUnreachable) { await this.#denied(req, sub, REDEEM.BOARD_UNREACHABLE); throw new RedeemError(REDEEM.BOARD_UNREACHABLE); } throw e; }
      const held = lock && lock.exists && lock.hold_kind === 'execution' && lock.claimed_by_ticket === req.ticket_id;
      if (!held) { await this.#denied(req, sub, REDEEM.APPROVAL_STALE, { by: 'execution_hold' }); throw new RedeemError(REDEEM.APPROVAL_STALE); }
    }
  }

  #subFromClaims(ctx) {
    if (this.config.devUnsafeNoAuth) return ctx.tokenClaims?.sub || null;
    return null; // pre-validation we have no trusted sub; the reject is logged without one
  }

  /**
   * Record a denial — Option A, FAIL-CLOSED (PLAN §6.1 MI-5; frozen contract §6: "every denied attempt
   * written fail-closed, ≥2 sinks"). The denial response is gated behind the SAME dual-sink ack as a
   * redemption: if <2 sinks ack, this throws AUDIT_UNAVAILABLE (503) so the caller returns 503 instead of
   * the typed 403/404/410 — a denial is never emitted on a single-sink record. The §6.3 exfiltration
   * escalation fires first (best-effort, separate channel) so a steered agent's attempt is still surfaced
   * even when the off-box sink is down.
   */
  async #denied(req, sub, spec, detail = {}, exfil = false) {
    if (exfil) {
      this.chat?.postExfilEscalation?.({ reason: spec.code, sub: sub || 'unknown', ticket_id: req?.ticket_id || null }).catch(() => {});
      this.logger?.warn?.('exfil_signal', { reason: spec.code, sub: sub || null });
    }
    const rec = {
      event_type: 'redeem_denied', actor_sub: sub || null, release_id: req?.release_id || null,
      ticket_id: req?.ticket_id || null, approval_id: req?.approval_id || null, run_id: req?.run_id || null,
      traceparent: req?.traceparent || null, op_id: req?.op_id || null, outcome: 'denied',
      detail_json: { code: spec.code, ...detail }, // machine-only — never echoes request content
    };
    let acked = false;
    try { ({ acked } = await this.audit.dualSink(rec)); } catch { acked = false; }
    if (!acked) throw new RedeemError(REDEEM.AUDIT_UNAVAILABLE); // unloggable denial → 503, never a silent single-sink
  }
}
