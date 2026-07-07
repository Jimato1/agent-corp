/*
 * service/transitions.js — the generic transition surface (PLAN §6; TICKET_STATE_MACHINE §2).
 *
 * Enforced identically on MCP/HTTP/UI. Three authority classes:
 *   - agent (board:update/claim): in_progress -> {awaiting_approval | needs_review | blocked} + the
 *     dedicated claim/release. Any agent attempt at approved/executing/verifying/done/failed/cancelled
 *     is HARD-REJECTED and logged as a violation (the SoD property; both the schema enum AND this
 *     service check must hold).
 *   - Gateway (board:execute, kind=service svc:gateway): run outcomes executing -> verifying/needs_review/failed
 *     (+ run_id, releases the execution hold) and verification evidence verifying -> done/failed.
 *   - operator (human): needs_review->done/todo, blocked->todo, todo/blocked->cancelled,
 *     awaiting_approval->cancelled, verifying->failed.
 */
import { STATES, ERR, KIND, CHILD_CLASS } from '../constants.js';
import { biz } from '../errors.js';
import { agentMayTransition, operatorMayTransition, isAgentForbiddenTarget } from '../core/state-machine.js';

export class Transitions {
  constructor({ db, tx, clock, audit, claim, approval }) {
    this.db = db;
    this.tx = tx;
    this.clock = clock;
    this.audit = audit;
    this.claim = claim;
    this.approval = approval;
    this._getTicket = db.prepare(`SELECT * FROM tickets WHERE id = ?`);
  }

  // --- agent-caused transition (board.transition) --------------------------------------------------
  async agentTransition({ principal, ticketId, toStatus, fencingToken, reason, opId, surface = 'mcp' }) {
    const t = this._getTicket.get(ticketId);
    if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
    // Hard SoD reject: an agent may NEVER cause a terminal/execution transition.
    if (isAgentForbiddenTarget(toStatus)) {
      this._logViolation(principal, t, toStatus, surface, 'agent_forbidden_target');
      throw biz(ERR.ILLEGAL_TRANSITION, `agents cannot cause ${t.status} -> ${toStatus}`);
    }
    if (!agentMayTransition(t.status, toStatus)) {
      this._logViolation(principal, t, toStatus, surface, 'illegal_agent_transition');
      throw biz(ERR.ILLEGAL_TRANSITION, `illegal agent transition ${t.status} -> ${toStatus}`);
    }
    // awaiting_approval is the proposal — delegate (it pins the plan + validates the playbook list).
    if (toStatus === STATES.AWAITING_APPROVAL) {
      // The plan slice is the most recently linked note (the planning-note template is what makes it
      // parseable; an unparseable latest link -> PLAN_UNPARSEABLE at propose).
      const plan = this.db.prepare(`SELECT note_id FROM ticket_notes WHERE ticket_id = ? ORDER BY linked_at DESC LIMIT 1`).get(ticketId);
      if (!plan) throw biz(ERR.PLAN_UNPARSEABLE, 'no linked plan note — link_note the plan slice before proposing');
      // Pin the plan note's CURRENT latest revision (Notes returns the rev; async, before the tx).
      const { rev } = await this.approval.clients.notes.getRevisionBytes(plan.note_id, undefined);
      return this.approval.propose({ principal, ticketId, noteId: plan.note_id, noteRev: rev, fencingToken, opId, surface });
    }
    // needs_review | blocked: fence-checked, holder-checked, releases the lock (generation++).
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(principal.sub, opId, `transition:${ticketId}:${toStatus}`);
      if (dedup.replay) return dedup.response;
      const fresh = this._getTicket.get(ticketId);
      if (fresh.status !== STATES.IN_PROGRESS) throw biz(ERR.ILLEGAL_TRANSITION, `cannot transition from ${fresh.status}`);
      const rid = this.claim.resourceIdFor(fresh);
      const lock = this.db.prepare(`SELECT * FROM host_locks WHERE resource_id = ?`).get(rid);
      if (!lock || lock.claimed_by_agent !== principal.sub) throw biz(ERR.NOT_HOLDER, 'not the lease holder');
      // Fence is MANDATORY on every claimed-ticket write (parity with tickets.update/linkNote): a token
      // generated but never checked provides no safety, so a missing token is rejected, not skipped.
      if (fencingToken == null || Number(fencingToken) !== lock.lock_generation) throw biz(ERR.STALE_FENCING, 'fencing token required and must match', { current: lock.lock_generation });
      this.db.prepare(`UPDATE tickets SET status = @to, claimed_by = CASE WHEN @to = 'blocked' THEN claimed_by ELSE NULL END, lease_expires_at = NULL, fencing_token = NULL, version = version + 1, updated_at = @iso, machine_reason = @reason WHERE id = @tid`)
        .run({ to: toStatus, iso: this.clock.iso(), tid: ticketId, reason: reason ?? null });
      this.db.prepare(`UPDATE host_locks SET claimed_by_ticket = NULL, claimed_by_agent = NULL, hold_kind = NULL, lease_expires_at = NULL, lock_generation = lock_generation + 1 WHERE resource_id = ? AND claimed_by_ticket = ?`).run(rid, ticketId);
      const response = { ticket_id: ticketId, status: toStatus };
      this.audit.record({ actor_sub: principal.sub, surface, action: 'transition', ticket_id: ticketId, from_state: fresh.status, to_state: toStatus, op_id: opId, fields_changed: { reason } });
      this.audit.recordOp(principal.sub, opId, `transition:${ticketId}:${toStatus}`, response);
      ctx.emit('ticket', { ticket_id: ticketId, action: 'transition', status: toStatus });
      return response;
    });
  }

  // --- operator-caused transition (HTTP; human authority) ------------------------------------------
  operatorTransition({ principal, ticketId, toStatus, opId, reason, expectedVersion, surface = 'http' }) {
    return this.tx.immediate((ctx) => {
      const t = this._getTicket.get(ticketId);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (expectedVersion != null && t.version !== expectedVersion) throw biz(ERR.VERSION_CONFLICT, 'version conflict', { current_version: t.version });
      if (!operatorMayTransition(t.status, toStatus)) throw biz(ERR.ILLEGAL_TRANSITION, `illegal operator transition ${t.status} -> ${toStatus}`);
      const terminal = toStatus === STATES.DONE || toStatus === STATES.CANCELLED || toStatus === STATES.FAILED;
      this.db.prepare(`UPDATE tickets SET status = @to, done_at = @done, machine_reason = NULL, version = version + 1, updated_at = @iso WHERE id = @tid`)
        .run({ to: toStatus, done: terminal ? this.clock.iso() : null, iso: this.clock.iso(), tid: ticketId });
      // Never leave a dangling {ticket:terminal, approval:granted} record: cancelling/failing a ticket
      // that still carries a live approval revokes it and releases any host hold in the SAME tx (the
      // clean path is /revoke; this closes the operator-transition path too — verifier finding #1).
      if (terminal && t.approval_id) {
        const rev = this.db.prepare(`UPDATE approvals SET status = 'revoked' WHERE id = ? AND status = 'granted'`).run(t.approval_id);
        if (rev.changes) {
          if (t.host_id) this.db.prepare(`UPDATE host_locks SET claimed_by_ticket = NULL, claimed_by_agent = NULL, hold_kind = NULL, lock_generation = lock_generation + 1 WHERE resource_id = ? AND claimed_by_ticket = ?`).run(t.host_id, ticketId);
          this.audit.record({ actor_sub: principal.sub, surface, action: 'revoke', ticket_id: ticketId, approval_id: t.approval_id, from_state: 'granted', to_state: 'revoked', op_id: opId, fields_changed: { reason: `ticket_${toStatus}` } });
        }
      }
      const response = { ticket_id: ticketId, status: toStatus };
      this.audit.record({ actor_sub: principal.sub, surface, action: 'operator_transition', ticket_id: ticketId, from_state: t.status, to_state: toStatus, op_id: opId, fields_changed: { reason } });
      ctx.emit('ticket', { ticket_id: ticketId, action: 'operator_transition', status: toStatus });
      return response;
    });
  }

  // --- Gateway run outcome (board:execute; svc:gateway) --------------------------------------------
  runOutcome({ principal, ticketId, toStatus, runId, opId, surface = 'http' }) {
    if (![STATES.VERIFYING, STATES.NEEDS_REVIEW, STATES.FAILED].includes(toStatus)) throw biz(ERR.ILLEGAL_TRANSITION, `run outcome must be verifying|needs_review|failed`);
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(principal.sub, opId, `outcome:${ticketId}:${toStatus}`);
      if (dedup.replay) return dedup.response;
      const t = this._getTicket.get(ticketId);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (t.status !== STATES.EXECUTING) throw biz(ERR.ILLEGAL_TRANSITION, `run outcome only from executing (was ${t.status})`);
      const terminal = toStatus === STATES.FAILED;
      this.db.prepare(`UPDATE tickets SET status = @to, done_at = @done, version = version + 1, updated_at = @iso WHERE id = @tid`)
        .run({ to: toStatus, done: terminal ? this.clock.iso() : null, iso: this.clock.iso(), tid: ticketId });
      // Release the execution hold (generation++) — the run is over (PLAN §8.3).
      if (t.host_id) this.db.prepare(`UPDATE host_locks SET claimed_by_ticket = NULL, claimed_by_agent = NULL, hold_kind = NULL, lock_generation = lock_generation + 1 WHERE resource_id = ? AND claimed_by_ticket = ? AND hold_kind = 'execution'`).run(t.host_id, ticketId);
      if (runId && t.approval_id) this.db.prepare(`UPDATE approvals SET run_id = ? WHERE id = ?`).run(runId, t.approval_id);
      const response = { ticket_id: ticketId, status: toStatus, run_id: runId ?? null };
      this.audit.record({ actor_sub: principal.sub, surface, action: 'run_outcome', ticket_id: ticketId, approval_id: t.approval_id, from_state: 'executing', to_state: toStatus, op_id: opId, fields_changed: { run_id: runId } });
      this.audit.recordOp(principal.sub, opId, `outcome:${ticketId}:${toStatus}`, response);
      ctx.emit('ticket', { ticket_id: ticketId, action: 'run_outcome', status: toStatus });
      return response;
    });
  }

  _logViolation(principal, ticket, toStatus, surface, reason) {
    try {
      this.tx.immediate(() => this.audit.violation({ actor_sub: principal.sub, surface, action: 'illegal_transition', ticket_id: ticket.id, from_state: ticket.status, to_state: toStatus, reason }));
    } catch { /* best-effort */ }
  }
}
