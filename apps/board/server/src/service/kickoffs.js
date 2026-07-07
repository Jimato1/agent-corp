/*
 * service/kickoffs.js — three kickoffs, one spawn function (PLAN §10; FROZEN board-wazuh-connector-kickoff.md).
 *
 * Human: authenticated create (tickets.create). Scheduled: node-cron (noOverlap) -> spawn with
 * spawn_key={standing_id}:{period}; UNIQUE spawn_key makes re-fires no-ops. Event (Wazuh): HMAC over
 * the RAW body FIRST, spawn_key = sha256(agent.id + cve.id + status), idempotent insert under UNIQUE
 * spawn_key. Host-identity is resolved via CMDB's operator-confirmed agent.id -> host_id mapping,
 * NEVER the raw alert field; an unmapped agent lands as a QUARANTINE ticket (born todo, quarantine=1,
 * structurally unclaimable, machine_reason unmapped_wazuh_agent). All alert-derived fields tagged
 * host-originated (§9). Verification evidence (§10.2) drives the automatic verifying -> done/failed.
 */
import { STATES, ERR, ORIGIN, CHILD_CLASS } from '../constants.js';
import { biz } from '../errors.js';
import { hmacHex, wazuhSpawnKey, timingSafeEqualHex, parseTicketId, ticketRef } from '../ids.js';

export class Kickoffs {
  constructor({ db, tx, clock, audit, tickets, clients, config, notify }) {
    this.db = db;
    this.tx = tx;
    this.clock = clock;
    this.audit = audit;
    this.tickets = tickets;
    this.clients = clients;
    this.config = config;
    this.notify = notify || (() => {});
    this._bySpawnKey = db.prepare(`SELECT * FROM tickets WHERE spawn_key = ?`);
    this._getTicket = db.prepare(`SELECT * FROM tickets WHERE id = ?`);
  }

  // --- Wazuh event webhook (POST /hooks/wazuh) -----------------------------------------------------
  // rawBody is the exact bytes received; signature is the hex HMAC header. Returns {status, ticket?}.
  async wazuhWebhook({ rawBody, signature }) {
    // (1) verify HMAC over the RAW body FIRST (D-9). Constant-time; secret never logged.
    if (!this.config.wazuhHmacSecret) throw biz(ERR.DEP_UNAVAILABLE, 'wazuh webhook secret not configured');
    const expected = hmacHex(this.config.wazuhHmacSecret, rawBody);
    if (!signature || !timingSafeEqualHex(signature.replace(/^sha256=/, ''), expected)) {
      throw biz(ERR.VALIDATION, 'invalid HMAC signature');
    }
    let alert;
    try {
      alert = JSON.parse(rawBody.toString('utf8'));
    } catch {
      throw biz(ERR.VALIDATION, 'invalid alert JSON');
    }
    const agentId = alert?.agent?.id ?? alert?.agent_id;
    const cveId = alert?.data?.vulnerability?.cve ?? alert?.cve?.id ?? alert?.vulnerability?.id ?? 'unknown';
    const status = alert?.data?.vulnerability?.status ?? alert?.status ?? 'active';
    if (!agentId) throw biz(ERR.VALIDATION, 'alert missing agent.id');

    // (2) spawn_key (internal, never transmitted).
    const spawnKey = wazuhSpawnKey({ agentId, cveId, status });
    // (3) idempotent — re-deliveries are no-ops.
    const existing = this.tx.immediate(() => this._bySpawnKey.get(spawnKey));
    if (existing) return { status: 'duplicate', ticket_id: ticketRef(existing.id) };

    // Host-identity rule: resolve host_id via CMDB mapping, NEVER the raw alert field.
    const hostId = await this.clients.cmdb.agentToHost(String(agentId));
    const principal = { sub: 'svc:wazuh-connector', kind: 'service' };
    const title = `Wazuh: ${cveId} on agent ${agentId} (${status})`;

    return this.tx.immediate((ctx) => {
      // re-check dedup inside the write tx (UNIQUE spawn_key also enforces it)
      if (this._bySpawnKey.get(spawnKey)) return { status: 'duplicate' };
      if (!hostId) {
        // Unmapped agent -> QUARANTINE (born todo, quarantine=1; NOT a non-todo birth — spec reserves that for A2).
        const t = this.tickets.create({ principal, title, type: 'vuln_remediation', body: JSON.stringify({ cve: cveId, wazuh_agent: agentId, status }), hostId: null, originKind: ORIGIN.EVENT_WEBHOOK, quarantine: 1, machineReason: 'unmapped_wazuh_agent', spawnKey, taintExtra: ['wazuh_alert'], surface: 'http' }, ctx);
        this.audit.record({ surface: 'http', action: 'quarantine', ticket_id: parseTicketId(t.ticket_id), fields_changed: { reason: 'unmapped_wazuh_agent', wazuh_agent: agentId } });
        ctx.emit('escalation', { kind: 'quarantine', ticket_id: t.ticket_id, machine_reason: 'unmapped_wazuh_agent' });
        this.notify({ type: 'quarantine', ticket_id: t.ticket_id });
        return { status: 'quarantined', ticket_id: t.ticket_id };
      }
      const t = this.tickets.create({ principal, title, type: 'vuln_remediation', body: JSON.stringify({ cve: cveId, wazuh_agent: agentId, status }), hostId, originKind: ORIGIN.EVENT_WEBHOOK, spawnKey, taintExtra: ['wazuh_alert'], surface: 'http' }, ctx);
      return { status: 'created', ticket_id: t.ticket_id };
    });
  }

  // --- verification evidence (§10.2): verifying -> done | failed (Board AUTOMATIC) ------------------
  submitVerification({ principal, ticketId, result, evidence, opId, surface = 'http' }) {
    const id = parseTicketId(ticketId);
    if (!['confirmed', 'refuted', 'timeout'].includes(result)) throw biz(ERR.VALIDATION, 'result must be confirmed|refuted|timeout');
    return this.tx.immediate((ctx) => {
      const dedup = this.audit.checkOp(principal.sub, opId, `verify:${id}`);
      if (dedup.replay) return dedup.response;
      const t = this._getTicket.get(id);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (t.status !== STATES.VERIFYING) throw biz(ERR.ILLEGAL_TRANSITION, `verification only from verifying (was ${t.status})`);
      const to = result === 'confirmed' ? STATES.DONE : STATES.FAILED;
      this.db.prepare(`UPDATE tickets SET status = @to, done_at = @iso, version = version + 1, updated_at = @iso WHERE id = @id`).run({ to, iso: this.clock.iso(), id });
      this.db.prepare(`INSERT OR REPLACE INTO meta (k, v) VALUES (?, ?)`).run(`verification:${id}`, JSON.stringify({ result, evidence, at: this.clock.iso() }));
      const response = { ticket_id: id, status: to, result };
      this.audit.record({ actor_sub: principal.sub, surface, action: 'verification', ticket_id: id, from_state: 'verifying', to_state: to, op_id: opId, fields_changed: { result, run_id: evidence?.run_id } });
      this.audit.recordOp(principal.sub, opId, `verify:${id}`, response);
      ctx.emit('ticket', { ticket_id: id, action: 'verification', status: to });
      return response;
    });
  }

  // --- scheduled kickoff (node-cron noOverlap fires this) ------------------------------------------
  fireScheduled(standingId, period) {
    return this.tx.immediate((ctx) => {
      const standing = this._getTicket.get(standingId);
      if (!standing) return { status: 'no_standing' };
      const trig = this.db.prepare(`SELECT * FROM standing_triggers WHERE ticket_id = ?`).get(standingId);
      if (!trig) return { status: 'no_trigger' };
      const spawnKey = `${standingId}:${period}`;
      if (this._bySpawnKey.get(spawnKey)) return { status: 'duplicate' };
      if (trig.suppress_while_open) {
        const open = this.db.prepare(`SELECT COUNT(*) n FROM tickets WHERE parent_id = ? AND status NOT IN ('done','failed','cancelled')`).get(standingId).n;
        if (open > 0) return { status: 'suppressed_while_open' };
      }
      const tmpl = trig.child_template ? JSON.parse(trig.child_template) : {};
      const principal = { sub: 'svc:board-scheduler', kind: 'service' };
      const t = this.tickets.create({ principal, title: tmpl.title || `${standing.title} — ${period}`, type: tmpl.type || standing.type, body: tmpl.body || null, hostId: tmpl.host_id || null, parentId: standingId, team: standing.team, originKind: ORIGIN.SCHEDULED, spawnKey, surface: 'internal' }, ctx);
      return { status: 'created', ticket_id: t.ticket_id };
    });
  }

  /** A2 break-glass review-ticket birth (auth -> Board; svc:auth kind-gated). The ONLY non-todo birth. */
  breakglassReviewTicket({ principal, title, body, opId, surface = 'http' }) {
    return this.tx.immediate((ctx) => {
      const t = this.tickets.create({ principal, title: title || 'Break-glass review', body: body || null, bornStatus: STATES.NEEDS_REVIEW, machineReason: 'breakglass_review_ticket', originKind: ORIGIN.OPERATOR, opId, surface }, ctx);
      this.audit.record({ actor_sub: principal.sub, surface, action: 'breakglass_review_ticket', ticket_id: parseTicketId(t.ticket_id), to_state: 'needs_review' });
      ctx.emit('escalation', { kind: 'breakglass_review_ticket', ticket_id: t.ticket_id });
      return t;
    });
  }
}
