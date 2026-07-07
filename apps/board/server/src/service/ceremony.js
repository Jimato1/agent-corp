/*
 * service/ceremony.js — the deliberation layer (PLAN §14; TICKET_STATE_MACHINE §3; D-1 + D-2).
 *
 * ceremony_events is the SOLE ceremony-phase authority (append-only); ceremony_phase on the ticket +
 * the huddles table are REBUILDABLE projections. Notes frontmatter is a display copy, NEVER read back.
 *
 * D-2 deterministic three-lane triage: the Board fetches EVERY signal itself from its named authority
 * (agent-supplied values are never inputs). Never an LLM score.
 *
 * D-1 DACI convergence: the SM owns process only (it may request transitions; it never holds the
 * clock). The Board sets round_cap + timebox_deadline at huddle open (in the huddle_opened event, so a
 * projection rebuild can never disarm the watchdog). Statements are ROSTER-SUB-BOUND, not fence-bound
 * (most roster members hold no lease). The AR's grounded dissent (cited to a recon note) is
 * mechanically forced; its scoped veto blocks -> backlog and is cleared only by the same AR sub or an
 * operator. The PO is Recommender-of-record. The server-side watchdog fires A1 board_escalation on
 * timebox/round-cap/unresolved-veto/missing-dissent/invalidation — regardless of any agent's activity.
 */
import { STATES, ERR, PHASES, PHASE_ORDER, LANES, ROLE, phaseAtLeast } from '../constants.js';
import { biz } from '../errors.js';
import { parseTicketId } from '../ids.js';

const RANK = { triage: 0, recon: 1, planning: 2, adversarial_review: 3, backlog: 4, execute: 5, retro: 6 };

export class Ceremony {
  constructor({ db, tx, clock, audit, tickets, claim, clients, config, notify }) {
    this.db = db;
    this.tx = tx;
    this.clock = clock;
    this.audit = audit;
    this.tickets = tickets;
    this.claim = claim;
    this.clients = clients;
    this.config = config;
    this.notify = notify || (() => {});
    this._getTicket = db.prepare(`SELECT * FROM tickets WHERE id = ?`);
    this._huddle = db.prepare(`SELECT * FROM huddles WHERE ticket_id = ?`);
    this._event = db.prepare(`INSERT INTO ceremony_events (ticket_id, event_kind, from_phase, to_phase, actor_sub, role, guard_name, round, note_id, note_rev, params, machine_reason, created_at, op_id)
      VALUES (@ticket_id, @event_kind, @from_phase, @to_phase, @actor_sub, @role, @guard_name, @round, @note_id, @note_rev, @params, @machine_reason, @iso, @op_id)`);
  }

  _emitEvent(e) {
    this._event.run({
      ticket_id: e.ticket_id, event_kind: e.event_kind, from_phase: e.from_phase ?? null, to_phase: e.to_phase ?? null,
      actor_sub: e.actor_sub ?? null, role: e.role ?? null, guard_name: e.guard_name ?? null, round: e.round ?? null,
      note_id: e.note_id ?? null, note_rev: e.note_rev ?? null, params: e.params ? JSON.stringify(e.params) : null,
      machine_reason: e.machine_reason ?? null, iso: this.clock.iso(), op_id: e.op_id ?? null,
    });
  }
  _setPhase(ticketId, phase) {
    this.db.prepare(`UPDATE tickets SET ceremony_phase = ?, updated_at = ? WHERE id = ?`).run(phase, this.clock.iso(), ticketId);
  }

  // --- D-2 triage (async — the Board fetches every signal itself, §14.1) ---------------------------
  async triage({ principal, ticketId, opId, surface = 'mcp' }) {
    const id = parseTicketId(ticketId);
    const t = this._getTicket.get(id);
    if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');

    // Board-fetched signals (agent-supplied values are NEVER inputs). Any fetch failure => full lane.
    const signals = {};
    let unavailable = false;
    try {
      // S2 blast radius — Board-computed from its own ticket/children scope.
      const childHosts = this.db.prepare(`SELECT DISTINCT host_id FROM tickets WHERE parent_id = ? AND host_id IS NOT NULL`).all(id).map((r) => r.host_id);
      const hosts = t.host_id ? [...new Set([t.host_id, ...childHosts])] : childHosts;
      signals.S2_blast_radius = hosts.length || (t.host_id ? 1 : 0);
      // S1 reversibility + S5 verifier — CMDB task-type registry (live read).
      if (!t.type) { unavailable = true; }
      else {
        const reg = await this.clients.cmdb.taskTypeRegistry(t.type);
        signals.S1_reversible = !!(reg.reversible && reg.rollback_path !== false);
        signals.S5_verifier = !!reg.verifier_present;
      }
      // S3 host criticality — worst tier across scope.
      let worstTier = 'low';
      for (const h of hosts) {
        const p = await this.clients.cmdb.hostTier(h);
        if (p.tier === 'critical') worstTier = 'critical';
        else if (p.tier === 'medium' && worstTier !== 'critical') worstTier = 'medium';
      }
      signals.S3_tier = hosts.length ? worstTier : 'low';
      // S4 catalog novelty — known-good/unmodified/not-drift-invalidated across the plan's playbooks.
      // At triage time we approximate via the type's default runbook binding.
      const reg4 = t.type ? await this.clients.cmdb.taskTypeRegistry(t.type) : {};
      signals.S4_known_runbook = !!reg4.known_runbook;
    } catch {
      unavailable = true;
    }

    // The fixed, exhaustive lane table (evaluated in order).
    let lane;
    if (unavailable || signals.S1_reversible === undefined || signals.S5_verifier === undefined) lane = LANES.FULL; // rule 1
    else if (signals.S2_blast_radius > 1 || signals.S3_tier === 'critical') lane = LANES.FULL; // rule 2
    else if (signals.S1_reversible && signals.S4_known_runbook && signals.S3_tier === 'low' && signals.S5_verifier) lane = LANES.STRAIGHT; // rule 3 (all four hard)
    else {
      // rule 4: exactly one mixed signal among {S1, S3, S4}; S5 absence never counts, S5 presence never offsets.
      const mixed = [!signals.S1_reversible, signals.S3_tier !== 'low', !signals.S4_known_runbook].filter(Boolean).length;
      lane = mixed === 1 ? LANES.LIGHTWEIGHT : LANES.FULL; // rule 5 otherwise
    }

    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(principal.sub, opId, `triage:${id}`);
      if (dedup.replay) return dedup.response;
      const evaluatedAt = this.clock.iso();
      this.db.prepare(`UPDATE tickets SET lane = ?, lane_signals = ?, ceremony_phase = 'triage', updated_at = ? WHERE id = ?`)
        .run(lane, JSON.stringify({ ...signals, evaluated_at: evaluatedAt, unavailable }), evaluatedAt, id);
      this._emitEvent({ ticket_id: id, event_kind: 'triage_decision', to_phase: PHASES.TRIAGE, actor_sub: principal.sub, guard_name: 'deterministic_lane_table', params: { lane, signals } });
      const response = { ticket_id: id, lane, signals };
      this.audit.record({ actor_sub: principal.sub, surface, action: 'triage', ticket_id: id, fields_changed: { lane }, op_id: opId });
      this.audit.recordOp(principal.sub, opId, `triage:${id}`, response);
      ctx.emit('ceremony', { ticket_id: id, phase: 'triage', lane });
      return response;
    });
  }

  // --- phase transition (guards decide; SM may request, never holds the clock) ----------------------
  transitionPhase({ principal, ticketId, toPhase, fencingToken, opId, surface = 'mcp' }) {
    const id = parseTicketId(ticketId);
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(principal.sub, opId, `phase:${id}:${toPhase}`);
      if (dedup.replay) return dedup.response;
      const t = this._getTicket.get(id);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      const from = t.ceremony_phase || PHASES.TRIAGE;
      if (!(RANK[toPhase] === RANK[from] + 1)) throw biz(ERR.ILLEGAL_TRANSITION, `phase must advance one step (${from} -> ${toPhase})`);

      if (toPhase === PHASES.PLANNING) return this._openHuddle(ctx, t, principal, opId);
      if (toPhase === PHASES.BACKLOG) this._guardBacklog(ctx, id);
      this._setPhase(id, toPhase);
      this._emitEvent({ ticket_id: id, event_kind: 'phase_transition', from_phase: from, to_phase: toPhase, actor_sub: principal.sub });
      const response = { ticket_id: id, phase: toPhase };
      this.audit.recordOp(principal.sub, opId, `phase:${id}:${toPhase}`, response);
      ctx.emit('ceremony', { ticket_id: id, phase: toPhase });
      return response;
    });
  }

  _openHuddle(ctx, t, principal, opId) {
    const id = t.id;
    const roundCap = t.lane === LANES.LIGHTWEIGHT ? this.config.ceremonyLightweightRoundCap : this.config.ceremonyRoundCap;
    const timebox = this.clock.now() + this.config.ceremonyTimeboxMs;
    // huddle_opened carries the server-set governance parameters (so a projection rebuild can never
    // silently disarm the watchdog). The SM never supplies them.
    this._emitEvent({ ticket_id: id, event_kind: 'huddle_opened', from_phase: PHASES.TRIAGE, to_phase: PHASES.PLANNING, actor_sub: principal.sub, params: { round_cap: roundCap, timebox_deadline: timebox, roster: {} } });
    this.db.prepare(`INSERT INTO huddles (ticket_id, lane, round, round_cap, timebox_deadline, roster, positions_filed, status) VALUES (?, ?, 0, ?, ?, '{}', '[]', 'open')
      ON CONFLICT(ticket_id) DO UPDATE SET round_cap = excluded.round_cap, timebox_deadline = excluded.timebox_deadline, status = 'open'`).run(id, t.lane, roundCap, timebox);
    this._setPhase(id, PHASES.PLANNING);
    const response = { ticket_id: id, phase: PHASES.PLANNING, round_cap: roundCap, timebox_deadline: timebox };
    this.audit.recordOp(principal.sub, opId, `phase:${id}:planning`, response);
    ctx.emit('ceremony', { ticket_id: id, phase: 'planning', round_cap: roundCap, timebox_deadline: timebox });
    return response;
  }

  _guardBacklog(ctx, id) {
    const h = this._huddle.get(id);
    if (!h) throw biz(ERR.ILLEGAL_TRANSITION, 'no huddle to converge');
    if (h.veto_state === 'raised') throw biz(ERR.VETO_UNRESOLVED, 'AR veto unresolved');
    if (h.ar_dissent_count < 1) {
      // Zero grounded dissents => huddle INVALID => A1 escalation (fast consensus is suspicious).
      this._invalidate(ctx, id, 'huddle_invalid');
      throw biz(ERR.DISSENT_REQUIRED, 'AR grounded dissent required before backlog');
    }
    if (!h.po_decision_event_id) throw biz(ERR.DISSENT_REQUIRED, 'PO decision-of-record required before backlog');
    this.db.prepare(`UPDATE huddles SET status = 'converged' WHERE ticket_id = ?`).run(id);
  }

  // --- ceremony_statement (roster-sub-bound, NOT fence-bound; §14.2) -------------------------------
  statement({ principal, ticketId, kind, noteId, noteRev, opId, surface = 'mcp' }) {
    const id = parseTicketId(ticketId);
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(principal.sub, opId, `stmt:${id}:${kind}:${noteId}`);
      if (dedup.replay) return dedup.response;
      const t = this._getTicket.get(id);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (t.ceremony_phase !== PHASES.PLANNING && t.ceremony_phase !== PHASES.ADVERSARIAL_REVIEW) {
        throw biz(ERR.OUT_OF_ORDER_STATEMENT, `statements only during planning/adversarial_review (phase ${t.ceremony_phase})`);
      }
      const h = this._huddle.get(id);
      if (!h) throw biz(ERR.OUT_OF_ORDER_STATEMENT, 'no open huddle');
      if (h.paused_at) throw biz(ERR.OUT_OF_ORDER_STATEMENT, 'huddle paused');
      // The roster is the set of independent drafters (positions_filed) — anti-anchoring (§14.2).
      const positions = new Set(JSON.parse(h.positions_filed || '[]'));
      const sub = principal.sub;

      if (kind === 'position') {
        positions.add(sub);
        this.db.prepare(`UPDATE huddles SET positions_filed = ? WHERE ticket_id = ?`).run(JSON.stringify([...positions]), id);
      } else {
        // cross-talk requires independent drafts first (anti-anchoring): min roster positioned.
        if (positions.size < this.config.ceremonyMinRoster) throw biz(ERR.OUT_OF_ORDER_STATEMENT, 'independent positions required before cross-talk');
        if (!positions.has(sub)) throw biz(ERR.NOT_ROSTER, 'must file a position to join the roster');

        if (kind === 'dissent' || kind === 'veto' || kind === 'veto_clear') {
          // AR role binds to the first dissenter/vetoer; only that sub may dissent/veto thereafter.
          const arSub = this._boundRole(id, ROLE.AR);
          if (arSub && arSub !== sub) throw biz(ERR.NOT_ROSTER, 'only the bound Adversarial Reviewer may dissent/veto');
          if (!arSub) this._bindRole(id, ROLE.AR, sub);
        }
        if (kind === 'decision') {
          const poSub = this._boundRole(id, ROLE.PO);
          if (poSub && poSub !== sub) throw biz(ERR.NOT_ROSTER, 'only the bound Product Owner may file the decision');
          if (!poSub) this._bindRole(id, ROLE.PO, sub);
        }
      }

      // Grounded-dissent verification: the cited note must be link-attached to a recon child of this ceremony.
      if (kind === 'dissent') {
        const grounded = this.db.prepare(`SELECT 1 FROM ticket_notes tn JOIN tickets c ON c.id = tn.ticket_id
          WHERE tn.note_id = @note AND c.parent_id = @id AND c.child_class = 'recon' LIMIT 1`).get({ note: noteId, id });
        if (!grounded) throw biz(ERR.DISSENT_UNGROUNDED, 'dissent must cite a recon note of this ceremony');
        this.db.prepare(`UPDATE huddles SET ar_dissent_count = ar_dissent_count + 1 WHERE ticket_id = ?`).run(id);
      }
      if (kind === 'veto') this.db.prepare(`UPDATE huddles SET veto_state = 'raised', veto_by = ? WHERE ticket_id = ?`).run(sub, id);
      if (kind === 'veto_clear') {
        const cur = this._huddle.get(id);
        if (cur.veto_state !== 'raised') throw biz(ERR.VALIDATION, 'no veto to clear');
        if (cur.veto_by !== sub) throw biz(ERR.NOT_ROSTER, 'a veto is cleared only by the same AR sub (or an operator)');
        this.db.prepare(`UPDATE huddles SET veto_state = 'cleared_by_ar' WHERE ticket_id = ?`).run(id);
      }

      // Server-derived round: increment when every roster member (positions_filed) has filed >=1
      // statement since the last boundary. round is stamped by the service, never caller-supplied.
      const round = this._advanceRound(id);
      const evId = this._emitEventReturning({ ticket_id: id, event_kind: kind === 'decision' ? 'decision_record' : (kind === 'veto' ? 'veto' : kind === 'veto_clear' ? 'veto_clear' : 'statement'), actor_sub: sub, role: this._roleOf(id, sub, kind), round, note_id: noteId, note_rev: noteRev });
      if (kind === 'decision') this.db.prepare(`UPDATE huddles SET po_decision_event_id = ? WHERE ticket_id = ?`).run(evId, id);

      const response = { ticket_id: id, kind, round };
      this.audit.record({ actor_sub: sub, surface, action: `ceremony_${kind}`, ticket_id: id, op_id: opId, fields_changed: { kind, round } });
      this.audit.recordOp(sub, opId, `stmt:${id}:${kind}:${noteId}`, response);
      ctx.emit('ceremony', { ticket_id: id, statement: kind, round });
      return response;
    });
  }

  _emitEventReturning(e) {
    this._emitEvent(e);
    return this.db.prepare(`SELECT last_insert_rowid() AS id`).get().id;
  }
  _boundRole(id, role) {
    const r = this.db.prepare(`SELECT actor_sub FROM ceremony_events WHERE ticket_id = ? AND role = ? AND event_kind IN ('veto','decision_record','statement') ORDER BY id ASC LIMIT 1`).get(id, role);
    const meta = this.db.prepare(`SELECT v FROM meta WHERE k = ?`).get(`roster:${id}:${role}`);
    return meta ? meta.v : (r ? r.actor_sub : null);
  }
  _bindRole(id, role, sub) {
    this.db.prepare(`INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)`).run(`roster:${id}:${role}`, sub);
  }
  _roleOf(id, sub, kind) {
    if (kind === 'decision') return ROLE.PO;
    if (kind === 'dissent' || kind === 'veto' || kind === 'veto_clear') return ROLE.AR;
    return ROLE.SPECIALIST;
  }
  _advanceRound(id) {
    const h = this._huddle.get(id);
    const roster = new Set(JSON.parse(h.positions_filed || '[]'));
    if (roster.size === 0) return h.round;
    // subs that filed >=1 statement since the last round boundary
    const boundaryMeta = this.db.prepare(`SELECT v FROM meta WHERE k = ?`).get(`round_boundary:${id}`);
    const boundaryEventId = boundaryMeta ? Number(boundaryMeta.v) : 0;
    const subs = new Set(this.db.prepare(`SELECT DISTINCT actor_sub FROM ceremony_events WHERE ticket_id = ? AND id > ? AND event_kind IN ('statement','decision_record','veto','veto_clear')`).all(id, boundaryEventId).map((r) => r.actor_sub));
    let round = h.round;
    const covered = [...roster].every((s) => subs.has(s));
    if (covered) {
      round = h.round + 1;
      const maxId = this.db.prepare(`SELECT COALESCE(MAX(id),0) AS m FROM ceremony_events WHERE ticket_id = ?`).get(id).m;
      this.db.prepare(`INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)`).run(`round_boundary:${id}`, String(maxId));
      this.db.prepare(`UPDATE huddles SET round = ? WHERE ticket_id = ?`).run(round, id);
    }
    return round;
  }

  _invalidate(ctx, id, reason) {
    this.db.prepare(`UPDATE huddles SET status = 'escalated' WHERE ticket_id = ?`).run(id);
    this._emitEvent({ ticket_id: id, event_kind: 'invalidation', machine_reason: reason });
    this._escalateA1(ctx, id, reason);
  }

  // --- pause / resume coupling (mid-huddle lifecycle; §14.2) ----------------------------------------
  pause(ticketId, reason = 'reaped') {
    const id = parseTicketId(ticketId);
    return this.tx.immediate((ctx) => {
      const h = this._huddle.get(id);
      if (!h || h.paused_at) return { paused: false };
      this.db.prepare(`UPDATE huddles SET paused_at = ? WHERE ticket_id = ?`).run(this.clock.now(), id);
      this._emitEvent({ ticket_id: id, event_kind: 'pause', machine_reason: reason });
      ctx.emit('ceremony', { ticket_id: id, paused: true });
      return { paused: true };
    });
  }
  resume(ticketId) {
    const id = parseTicketId(ticketId);
    return this.tx.immediate((ctx) => {
      const h = this._huddle.get(id);
      if (!h || !h.paused_at) return { resumed: false };
      const pausedMs = this.clock.now() - h.paused_at;
      this.db.prepare(`UPDATE huddles SET paused_at = NULL, pause_total = pause_total + ?, timebox_deadline = timebox_deadline + ? WHERE ticket_id = ?`).run(pausedMs, pausedMs, id);
      this._emitEvent({ ticket_id: id, event_kind: 'resume' });
      ctx.emit('ceremony', { ticket_id: id, paused: false });
      return { resumed: true };
    });
  }

  // --- the D-1 watchdog (10s sweep; server-side; fires regardless of any agent's activity) ----------
  watchdogSweep() {
    return this.tx.immediate((ctx) => {
      const now = this.clock.now();
      const open = this.db.prepare(`SELECT h.*, t.status AS tstatus, t.held AS held FROM huddles h JOIN tickets t ON t.id = h.ticket_id WHERE h.status = 'open' AND h.paused_at IS NULL`).all();
      let trips = 0;
      for (const h of open) {
        if (h.held) continue; // held tickets are exempt (sweep precedence, §4)
        if (h.tstatus !== STATES.IN_PROGRESS) continue; // A1 fires only from in_progress
        let reason = null;
        if (h.timebox_deadline && now > h.timebox_deadline) reason = 'timebox_expired';
        else if (h.round_cap != null && h.round > h.round_cap) reason = 'round_cap_exceeded';
        else if (h.veto_state === 'raised' && h.timebox_deadline && now > h.timebox_deadline) reason = 'unresolved_veto';
        if (reason) {
          this._escalateA1(ctx, h.ticket_id, reason);
          this.db.prepare(`UPDATE huddles SET status = 'escalated' WHERE ticket_id = ?`).run(h.ticket_id);
          trips++;
        }
      }
      return { trips };
    });
  }

  _escalateA1(ctx, ticketId, reason) {
    const t = this._getTicket.get(ticketId);
    if (!t || t.status !== STATES.IN_PROGRESS) return;
    this.db.prepare(`UPDATE tickets SET status = 'needs_review', machine_reason = ?, claimed_by = NULL, lease_expires_at = NULL, fencing_token = NULL, version = version + 1, updated_at = ? WHERE id = ?`).run(reason, this.clock.iso(), ticketId);
    const rid = t.host_id || `ticket:${t.id}`;
    this.db.prepare(`UPDATE host_locks SET claimed_by_ticket = NULL, claimed_by_agent = NULL, hold_kind = NULL, lock_generation = lock_generation + 1 WHERE resource_id = ? AND claimed_by_ticket = ?`).run(rid, ticketId);
    this._emitEvent({ ticket_id: ticketId, event_kind: 'watchdog_trip', machine_reason: reason });
    this.audit.record({ surface: 'internal', action: 'board_escalation', ticket_id: ticketId, from_state: 'in_progress', to_state: 'needs_review', fields_changed: { machine_reason: reason } });
    ctx.emit('escalation', { kind: 'board_escalation', ticket_id: ticketId, machine_reason: reason });
    this.notify({ type: 'board_escalation', ticket_id: ticketId, machine_reason: reason });
  }

  // --- backlog decomposition: the ONLY path that stamps child_class='execution' (§14.2) ------------
  decompose({ principal, ticketId, children, opId, surface = 'mcp' }) {
    const id = parseTicketId(ticketId);
    return this.tx.immediate((ctx) => {
      const parent = this._getTicket.get(id);
      if (!parent) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (!phaseAtLeast(parent.ceremony_phase, PHASES.BACKLOG)) throw biz(ERR.ILLEGAL_TRANSITION, 'decompose only at/after backlog');
      const created = [];
      for (const c of children || []) {
        const t = this.tickets.create({ principal, title: c.title, type: c.type ?? parent.type, body: c.body ?? null, hostId: c.host_id ?? null, parentId: id, team: parent.team, childClass: 'execution', originKind: 'agent', surface }, ctx);
        // children inherit the parent's lane as a FLOOR (never re-triaged downward).
        this.db.prepare(`UPDATE tickets SET lane = ? WHERE id = ?`).run(parent.lane, parseTicketId(t.ticket_id));
        created.push(t.ticket_id);
      }
      this.audit.record({ actor_sub: principal.sub, surface, action: 'decompose', ticket_id: id, fields_changed: { children: created.length }, op_id: opId });
      return { ticket_id: id, children: created };
    });
  }

  huddleState(ticketId) {
    const id = parseTicketId(ticketId);
    const h = this._huddle.get(id);
    if (!h) return null;
    return {
      ticket_id: ticketId, lane: h.lane, round: h.round, round_cap: h.round_cap,
      timebox_deadline: h.timebox_deadline, paused: !!h.paused_at, pause_total: h.pause_total,
      ar_dissent_count: h.ar_dissent_count, veto_state: h.veto_state, veto_by: h.veto_by,
      po_decision: !!h.po_decision_event_id, status: h.status,
      roster: { AR: this._boundRole(id, ROLE.AR), PO: this._boundRole(id, ROLE.PO) },
    };
  }
}
