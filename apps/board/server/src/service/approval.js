/*
 * service/approval.js — THE approval record + consume_approval (PLAN §8; D-S2 / REVIEW_2 §S2).
 *
 * This is the property the whole SoD chain rests on. Three moves:
 *   - propose  (in_progress -> awaiting_approval): pins the plan revision, validates a parseable
 *              playbook list, records proposer_id, releases the host lock (generation++).
 *   - grant    (awaiting_approval -> approved): fetches pinned bytes (OUTSIDE the tx), computes
 *              plan_hash, derives action_class FROM THE ALLOWLIST PLAYBOOKS (never the ticket type),
 *              enforces FOUR-EYES at the Board independent of the PDP, enforces the auto-approve floor,
 *              inserts the immutable approvals + approval_allowlist rows, CAS -> approved.
 *   - consume  (approved -> executing): the SINGLE atomic conditional UPDATE. Exactly one caller flips
 *              granted->consumed (the loser matches 0 rows -> terminal approval_consumed). NOT
 *              check-then-write. The execution hold (a fresh fencing generation on the host lock) is
 *              acquired in the same tx; a consume that cannot lock the host burns nothing (HOST_LOCKED,
 *              approval stays granted). Gateway consumes BEFORE Vault redeems (D-S2 ordering).
 */
import { STATES, ERR, DERIVED_CLASS, NON_AUTO_CLASSES, APPROVER_KIND, KIND } from '../constants.js';
import { biz } from '../errors.js';
import { planHash, paramsHash, parseApprovalId, parseTicketId } from '../ids.js';
import { parsePlaybookInvocations } from '../core/plan-parse.js';
import { renderApproval } from './render.js';

export class ApprovalEngine {
  constructor({ db, tx, clock, audit, guardrails, claim, clients, config }) {
    this.db = db;
    this.tx = tx;
    this.clock = clock;
    this.audit = audit;
    this.guardrails = guardrails;
    this.claim = claim; // for resourceIdFor + lock release/acquire helpers
    this.clients = clients;
    this.config = config;
    this._getTicket = db.prepare(`SELECT * FROM tickets WHERE id = ?`);
    this._getApproval = db.prepare(`SELECT * FROM approvals WHERE id = ?`);
    this._allowlist = db.prepare(`SELECT * FROM approval_allowlist WHERE approval_id = ? ORDER BY seq`);
    // consume: THE single atomic check-and-mark (compare-and-swap). One winner; the loser gets 0 rows.
    this._consumeCas = db.prepare(`UPDATE approvals SET status = 'consumed', consumed_at = @iso, consumed_by = @sub WHERE id = @id AND status = 'granted'`);
    this._lockExecHold = db.prepare(`
      INSERT INTO host_locks (resource_id, resource_kind, claimed_by_ticket, claimed_by_agent, hold_kind, lease_expires_at, lock_generation)
      VALUES (@rid, 'host', @tid, @sub, 'execution', NULL, 1)
      ON CONFLICT(resource_id) DO UPDATE SET
        claimed_by_ticket = @tid, claimed_by_agent = @sub, hold_kind = 'execution', lease_expires_at = NULL,
        lock_generation = host_locks.lock_generation + 1
      WHERE host_locks.claimed_by_ticket IS NULL
      RETURNING lock_generation`);
  }

  // --- proposal: in_progress -> awaiting_approval --------------------------------------------------
  async propose({ principal, ticketId, noteId, noteRev, fencingToken, opId, surface = 'mcp' }) {
    // Fetch + parse the plan slice OUTSIDE the write transaction (gate only; §8.1).
    const { bytes } = await this.clients.notes.getRevisionBytes(noteId, noteRev);
    parsePlaybookInvocations(bytes); // throws PLAN_UNPARSEABLE if the list is missing/malformed
    return this.tx.immediate((ctx) => {
      const t = this._getTicket.get(ticketId);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (t.status !== STATES.IN_PROGRESS) throw biz(ERR.ILLEGAL_TRANSITION, `cannot propose from ${t.status}`);
      // fence check (claim holder)
      const rid = this.claim.resourceIdFor(t);
      const lock = this.db.prepare(`SELECT * FROM host_locks WHERE resource_id = ?`).get(rid);
      if (!lock || lock.claimed_by_agent !== principal.sub) throw biz(ERR.NOT_HOLDER, 'not the lease holder');
      // Fence mandatory on this claimed-ticket write (parity with tickets.update/linkNote).
      if (fencingToken == null || Number(fencingToken) !== lock.lock_generation) throw biz(ERR.STALE_FENCING, 'fencing token required and must match', { current: lock.lock_generation });
      // record proposer + pin, release the host lock (approval wait must not starve the host; §6).
      this.db.prepare(`UPDATE tickets SET status = 'awaiting_approval', proposer_id = @sub, plan_note_id = @nid, plan_note_rev = @rev, claimed_by = NULL, lease_expires_at = NULL, fencing_token = NULL, version = version + 1, updated_at = @iso WHERE id = @tid`)
        .run({ sub: principal.sub, nid: noteId, rev: noteRev, iso: this.clock.iso(), tid: ticketId });
      this.db.prepare(`UPDATE host_locks SET claimed_by_ticket = NULL, claimed_by_agent = NULL, hold_kind = NULL, lease_expires_at = NULL, lock_generation = lock_generation + 1 WHERE resource_id = ? AND claimed_by_ticket = ?`).run(rid, ticketId);
      this.db.prepare(`INSERT OR REPLACE INTO ticket_notes (ticket_id, note_id, role, linked_at, linked_by) VALUES (?, ?, 'plan', ?, ?)`).run(ticketId, noteId, this.clock.iso(), principal.sub);
      this.audit.record({ actor_sub: principal.sub, surface, action: 'propose', ticket_id: ticketId, from_state: 'in_progress', to_state: 'awaiting_approval', op_id: opId, fields_changed: { plan_note_id: noteId, plan_note_rev: noteRev } });
      ctx.emit('ticket', { ticket_id: ticketId, action: 'propose', status: 'awaiting_approval' });
      return { ticket_id: ticketId, status: 'awaiting_approval', proposer_id: principal.sub };
    });
  }

  // --- grant: awaiting_approval -> approved (mints the approval record) -----------------------------
  async grant({ principal, ticketId, approverKind = APPROVER_KIND.OPERATOR, opId, surface = 'http' }) {
    // Kill G1/G2: approval minting suspended. Stale kill mirror => fail closed (auth contract §1).
    if (this.guardrails.destructiveFrozen()) throw biz(ERR.AUTO_APPROVE_FORBIDDEN, 'kill level freezes approval minting');
    if (this.guardrails.killMirrorStale(this.clock.now())) throw biz(ERR.DEP_UNAVAILABLE, 'kill mirror stale — approval minting fails closed');

    const t = this._getTicket.get(ticketId);
    if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
    if (t.status !== STATES.AWAITING_APPROVAL) throw biz(ERR.ILLEGAL_TRANSITION, `cannot grant from ${t.status}`);
    if (!t.host_id) throw biz(ERR.VALIDATION, 'execution ticket has no host_id');
    if (!t.plan_note_id) throw biz(ERR.PLAN_UNPARSEABLE, 'no pinned plan note');

    // --- PRE-FETCH (no network I/O under the writer lock, §1) ---
    const preNoteId = t.plan_note_id, preNoteRev = t.plan_note_rev;
    const { bytes } = await this.clients.notes.getRevisionBytes(preNoteId, preNoteRev);
    const hash = planHash(bytes);
    const invocations = parsePlaybookInvocations(bytes); // re-extract from the EXACT hashed bytes (§2.5)
    // resolve each playbook -> CMDB catalog class binding (derived-class floor; §8.2 step 3).
    const classBindings = [];
    for (const inv of invocations) {
      const pb = await this.clients.cmdb.playbookClass(inv.playbook_key);
      classBindings.push({ ...inv, class_binding: pb.action_class ?? pb.class ?? DERIVED_CLASS.STANDARD });
    }
    const derivedClass = worstClass(classBindings.map((c) => c.class_binding));
    // Notes transitive effective taint over the plan link graph (§9).
    const notesTaint = await this.clients.notes.getEffectiveTaint(preNoteId, preNoteRev);
    const inputTainted = !!t.taint_host_originated || !!notesTaint.effective;

    // tier path needs a fresh signed CMDB verdict (queried with the DERIVED class, never `type`).
    let verdict = null;
    if (approverKind === APPROVER_KIND.TIER_POLICY) {
      verdict = await this.clients.cmdb.verdict({ hostId: t.host_id, actionClass: derivedClass });
    }

    // --- WRITE TRANSACTION ---
    try {
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(principal.sub, opId, `grant:${ticketId}`);
      if (dedup.replay) return dedup.response;
      const fresh = this._getTicket.get(ticketId);
      // 1. Re-verify the pin: unchanged since pre-fetch (a plan edited after the pre-fetch aborts).
      if (fresh.status !== STATES.AWAITING_APPROVAL) throw biz(ERR.ILLEGAL_TRANSITION, `cannot grant from ${fresh.status}`);
      if (fresh.plan_note_id !== preNoteId || fresh.plan_note_rev !== preNoteRev) throw biz(ERR.PLAN_PIN_MOVED, 'plan revision changed — re-review');
      // 2. FOUR-EYES, enforced at the Board independent of the PDP.
      if (principal.sub === fresh.proposer_id || principal.sub === fresh.claimed_by) {
        throw biz(ERR.FOUR_EYES, 'approver must differ from proposer/claimant');
      }
      // 3/4. Auto-approve floor (§8.2 step 4): tier-policy refused if derived class destructive/irreversible,
      // class inconsistent with registry, tainted inputs, or no fresh in-window auto verdict.
      if (approverKind === APPROVER_KIND.TIER_POLICY) {
        const reasons = [];
        if (NON_AUTO_CLASSES.has(derivedClass)) reasons.push('destructive_or_irreversible');
        if (inputTainted) reasons.push('tainted_inputs');
        if (!verdict || verdict.approval_mode !== 'auto') reasons.push('no_auto_verdict');
        if (verdict && verdict.in_window === false) reasons.push('out_of_window');
        if (reasons.length) throw biz(ERR.AUTO_APPROVE_FORBIDDEN, 'auto-approve floor: operator required', { reasons });
      }
      // 5. Insert the approvals row + immutable allowlist; CAS ticket -> approved.
      const iso = this.clock.iso();
      const ins = this.db.prepare(`INSERT INTO approvals
        (ticket_id, host_id, plan_hash, plan_note_id, plan_note_rev, action_class, proposer_id, approver_sub, approver_kind, cmdb_decision_id, status, granted_at, op_id)
        VALUES (@ticket_id, @host_id, @plan_hash, @nid, @rev, @cls, @proposer, @approver, @akind, @decision, 'granted', @iso, @op)`)
        .run({ ticket_id: ticketId, host_id: fresh.host_id, plan_hash: hash, nid: preNoteId, rev: preNoteRev, cls: derivedClass, proposer: fresh.proposer_id, approver: principal.sub, akind: approverKind, decision: verdict?.decision_id ?? null, iso, op: opId ?? null });
      const approvalId = ins.lastInsertRowid;
      const insAllow = this.db.prepare(`INSERT INTO approval_allowlist (approval_id, seq, playbook_key, params_hash, host_id, class_binding) VALUES (?, ?, ?, ?, ?, ?)`);
      for (const c of classBindings) {
        insAllow.run(approvalId, c.seq, c.playbook_key, paramsHash(c.params), c.host_id || fresh.host_id, c.class_binding);
      }
      this.db.prepare(`UPDATE tickets SET status = 'approved', approval_id = ?, version = version + 1, updated_at = ? WHERE id = ?`).run(approvalId, iso, ticketId);
      const approval = renderApproval(this._getApproval.get(approvalId), this._allowlist.all(approvalId));
      this.audit.record({ actor_sub: principal.sub, surface, action: 'grant', ticket_id: ticketId, approval_id: approvalId, from_state: 'awaiting_approval', to_state: 'approved', op_id: opId, fields_changed: { action_class: derivedClass, approver_kind: approverKind } });
      this.audit.recordOp(principal.sub, opId, `grant:${ticketId}`, approval);
      ctx.emit('ticket', { ticket_id: ticketId, action: 'grant', status: 'approved', approval_id: approval.approval_id });
      return approval;
    });
    } catch (e) {
      // A four-eyes violation must be durable even though the grant tx rolled back — log it in its OWN
      // (now un-nested) transaction, then rethrow (PLAN §2.4/§2.9).
      if (e && e.code === ERR.FOUR_EYES) {
        try { this.tx.immediate(() => this.audit.violation({ actor_sub: principal.sub, surface, action: 'four_eyes_violation', ticket_id: ticketId, reason: 'approver == proposer/claimant' })); } catch { /* best-effort */ }
      } else if (e && e.code === ERR.AUTO_APPROVE_FORBIDDEN) {
        try { this.tx.immediate(() => this.audit.violation({ actor_sub: principal.sub, surface, action: 'auto_approve_forbidden', ticket_id: ticketId, reason: (e.details?.reasons || []).join(',') })); } catch { /* best-effort */ }
      }
      throw e;
    }
  }

  // --- consume_approval: approved -> executing (Gateway-only; single-use) ---------------------------
  // THE atomicity property (CV-C). ONE transaction; the CAS is the single winner.
  consume({ principal, approvalRefStr, ticketId, hostId, opId, surface = 'http' }) {
    const approvalId = parseApprovalId(approvalRefStr);
    if (approvalId == null) throw biz(ERR.NOT_FOUND, 'bad approval id');
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(principal.sub, opId, `consume:${approvalId}`);
      if (dedup.replay) return dedup.response;
      const a = this._getApproval.get(approvalId);
      if (!a) throw biz(ERR.NOT_FOUND, 'approval not found');
      // Kill >= G1 suspends consumption (deny, do not revoke; resumes at G0). Stale mirror => fail closed.
      if (this.guardrails.destructiveFrozen()) throw biz(ERR.AUTO_APPROVE_FORBIDDEN, 'kill level suspends consumption');
      if (this.guardrails.killMirrorStale(this.clock.now())) throw biz(ERR.DEP_UNAVAILABLE, 'kill mirror stale — consumption fails closed');

      // 1. Acquire the execution hold (fresh fencing generation). Zero rows => a live claim holds the
      //    host => WHOLE TX ROLLS BACK, approval stays granted, nothing burned (HOST_LOCKED).
      const rid = a.host_id; // execution hold is always host-scoped
      const acq = this._lockExecHold.get({ rid, tid: a.ticket_id, sub: principal.sub });
      if (!acq) throw biz(ERR.HOST_LOCKED, 'host busy — retry later; approval unspent', { host_id: a.host_id });
      const gen = acq.lock_generation;

      // 2. THE single atomic check-and-mark. Exactly one caller flips granted->consumed.
      const cas = this._consumeCas.run({ id: approvalId, iso: this.clock.iso(), sub: principal.sub });
      if (cas.changes === 0) {
        // Distinguish the terminal reason. (Rolls back the exec-hold + everything.)
        const now = this._getApproval.get(approvalId);
        if (now.status === 'consumed') throw biz(ERR.APPROVAL_CONSUMED, 'approval already consumed');
        if (now.status === 'revoked') throw biz(ERR.APPROVAL_REVOKED, 'approval revoked');
        if (now.status === 'expired') throw biz(ERR.APPROVAL_EXPIRED, 'approval expired');
        throw biz(ERR.APPROVAL_CONSUMED, 'approval not grantable');
      }

      // 3. Binding checks (any failure rolls back everything).
      if (hostId != null && hostId !== a.host_id) throw biz(ERR.VALIDATION, 'host_id mismatch');
      const parsedTicket = ticketId != null ? parseTicketId(ticketId) : a.ticket_id;
      if (parsedTicket !== a.ticket_id) throw biz(ERR.VALIDATION, 'ticket_id mismatch');
      const t = this._getTicket.get(a.ticket_id);
      if (!t || t.status !== STATES.APPROVED) throw biz(ERR.ILLEGAL_TRANSITION, 'ticket not in approved state');

      // 4. CAS ticket approved -> executing.
      this.db.prepare(`UPDATE tickets SET status = 'executing', fencing_token = ?, version = version + 1, updated_at = ? WHERE id = ? AND status = 'approved'`).run(gen, this.clock.iso(), a.ticket_id);

      // 5. Response — everything the Gateway needs to re-hash + validate against the allowlist + present
      //    a LEASE-BOUND, UNIQUE fencing token to its own mutex.
      const allowlist = this._allowlist.all(approvalId).map((x) => ({ seq: x.seq, playbook_key: x.playbook_key, params_hash: x.params_hash }));
      const response = { approval_id: `A-${String(approvalId).padStart(6, '0')}`, ticket_id: `T-${String(a.ticket_id).padStart(6, '0')}`, host_id: a.host_id, plan_hash: a.plan_hash, plan_note_id: a.plan_note_id, plan_note_rev: a.plan_note_rev, action_class: a.action_class, allowlist, fencing_token: gen };
      this.audit.record({ actor_sub: principal.sub, surface, action: 'consume_approval', ticket_id: a.ticket_id, approval_id: approvalId, from_state: 'approved', to_state: 'executing', op_id: opId, fencing_token: gen });
      this.audit.recordOp(principal.sub, opId, `consume:${approvalId}`, response);
      ctx.emit('ticket', { ticket_id: a.ticket_id, action: 'consume', status: 'executing', fencing_token: gen });
      return response;
    });
  }

  /** Operator revoke (approved -> cancelled): approval -> revoked in the same tx; releases exec/claim hold. */
  revoke({ principal, ticketId, opId, surface = 'http' }) {
    return this.tx.immediate((ctx) => {
      const t = this._getTicket.get(ticketId);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (t.status !== STATES.APPROVED) throw biz(ERR.ILLEGAL_TRANSITION, `cannot revoke from ${t.status}`);
      if (t.approval_id) {
        this.db.prepare(`UPDATE approvals SET status = 'revoked' WHERE id = ? AND status = 'granted'`).run(t.approval_id);
      }
      this.db.prepare(`UPDATE tickets SET status = 'cancelled', done_at = @iso, version = version + 1, updated_at = @iso WHERE id = @tid`).run({ iso: this.clock.iso(), tid: ticketId });
      // release any hold on the host
      if (t.host_id) this.db.prepare(`UPDATE host_locks SET claimed_by_ticket = NULL, claimed_by_agent = NULL, hold_kind = NULL, lock_generation = lock_generation + 1 WHERE resource_id = ? AND claimed_by_ticket = ?`).run(t.host_id, ticketId);
      this.audit.record({ actor_sub: principal.sub, surface, action: 'revoke', ticket_id: ticketId, approval_id: t.approval_id, from_state: 'approved', to_state: 'cancelled', op_id: opId });
      ctx.emit('ticket', { ticket_id: ticketId, action: 'revoke', status: 'cancelled' });
      return { ticket_id: ticketId, status: 'cancelled' };
    });
  }

  getApproval(approvalRefStr) {
    const id = parseApprovalId(approvalRefStr);
    if (id == null) return null;
    const a = this._getApproval.get(id);
    return a ? renderApproval(a, this._allowlist.all(id)) : null;
  }
}

function worstClass(classes) {
  const rank = { [DERIVED_CLASS.BENIGN]: 0, [DERIVED_CLASS.STANDARD]: 1, [DERIVED_CLASS.DESTRUCTIVE]: 2, [DERIVED_CLASS.IRREVERSIBLE]: 3 };
  let worst = DERIVED_CLASS.BENIGN;
  for (const c of classes) if ((rank[c] ?? 1) > (rank[worst] ?? 0)) worst = c;
  return worst;
}
