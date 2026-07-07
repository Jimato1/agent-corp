/*
 * service/tickets.js — ticket CRUD + the SERVER-DERIVED invariants (PLAN §2.1/§9).
 *
 * lineage_depth is server-derived, NEVER caller-supplied (D-11): operator/scheduled/webhook births =
 * 0; an agent-created ticket = parent.lineage_depth + 1, where the parent DEFAULTS to the agent's
 * currently-claimed ticket; a parentless agent create with no active claim gets depth 1 (never 0). A
 * declared parent_id may only DEEPEN the derived value, never flatten it.
 *
 * Provenance taint (§9) is tagged mechanically at creation and is RAISE-ONLY (nothing ever clears it):
 *   1. origin_kind=event_webhook -> tainted (host-originated adversarial input)
 *   2. parent tainted -> child tainted
 *   3. creating agent in the Library curation team -> tainted (external web content)
 *   4. task-type registry marks the type externally-sourced -> tainted (CMDB attribute, verbatim)
 */
import { STATES, ERR, TICKET_KIND, CHILD_CLASS, ORIGIN, KIND } from '../constants.js';
import { biz } from '../errors.js';
import { renderTicket } from './render.js';
import { parseTicketId, ticketRef } from '../ids.js';

export class Tickets {
  constructor({ db, tx, clock, audit, config }) {
    this.db = db;
    this.tx = tx;
    this.clock = clock;
    this.audit = audit;
    this.config = config;
    this._get = db.prepare(`SELECT * FROM tickets WHERE id = ?`);
    this._activeClaim = db.prepare(`SELECT id, lineage_depth, team FROM tickets WHERE claimed_by = ? AND status = 'in_progress' ORDER BY claimed_at DESC LIMIT 1`);
  }

  get(ref) {
    const id = parseTicketId(ref);
    const t = id == null ? null : this._get.get(id);
    return t ? renderTicket(t) : null;
  }
  getRow(id) {
    return this._get.get(id);
  }

  /** Create a ticket. `bornStatus`/`quarantine`/`childClass`/`machineReason` are for internal spawns
   *  (A2 break-glass, backlog decomposition, Wazuh quarantine). Callers via the agent surface never
   *  set them. Returns the rendered ticket. Runs inside its own immediate tx. */
  create({ principal, title, type = null, body = null, hostId = null, parentId = null, team = null, childClass = CHILD_CLASS.GENERAL, kind = TICKET_KIND.TICKET, originKind, bornStatus = STATES.TODO, quarantine = 0, machineReason = null, spawnKey = null, taintExtra = [], opId, surface = 'mcp' }, externalTx = null) {
    const run = (ctx) => {
      const dedup = opId ? this.audit.checkOp(principal.sub, opId, `create:${spawnKey || title}`) : { replay: false };
      if (dedup.replay) return dedup.response;

      const origin = originKind || (principal.kind === KIND.AGENT ? ORIGIN.AGENT : ORIGIN.OPERATOR);
      // --- server-derived lineage_depth (D-11) ---
      let parentRow = null;
      let effParentId = parseTicketId(parentId);
      if (origin === ORIGIN.AGENT) {
        const active = this._activeClaim.get(principal.sub);
        if (effParentId == null && active) effParentId = active.id; // default parent = active claim
        parentRow = effParentId != null ? this._get.get(effParentId) : null;
        // depth: parent.depth+1; declared parent may only deepen; parentless agent create -> 1 (never 0)
        const declaredDepth = parentRow ? parentRow.lineage_depth + 1 : 1;
        const activeDepth = active ? active.lineage_depth + 1 : 1;
        var lineageDepth = Math.max(declaredDepth, activeDepth);
        if (team == null && parentRow) team = parentRow.team;
        if (team == null && active) team = active.team;
      } else {
        parentRow = effParentId != null ? this._get.get(effParentId) : null;
        var lineageDepth = 0; // operator/scheduled/webhook births
        if (team == null && parentRow) team = parentRow.team;
      }

      // --- taint (§9), raise-only ---
      const sources = new Set(taintExtra);
      let tainted = 0;
      if (origin === ORIGIN.EVENT_WEBHOOK) { tainted = 1; sources.add('webhook_host_originated'); }
      if (parentRow && parentRow.taint_host_originated) { tainted = 1; sources.add('parent_inherited'); }
      if (team && team === this.config.curationTeamLabel) { tainted = 1; sources.add('library_curation_origin'); }
      if (taintExtra.length) tainted = 1;

      const iso = this.clock.iso();
      const ins = this.db.prepare(`INSERT INTO tickets
        (kind, parent_id, child_class, spawned_by, lineage_depth, type, title, body, status, quarantine, host_id, team, origin_kind, taint_host_originated, taint_sources, machine_reason, spawn_key, created_at, updated_at)
        VALUES (@kind, @parent, @cc, @spawned, @depth, @type, @title, @body, @status, @q, @host, @team, @origin, @taint, @sources, @reason, @spawnKey, @iso, @iso)`)
        .run({ kind, parent: effParentId ?? null, cc: childClass, spawned: origin === ORIGIN.AGENT ? principal.sub : null, depth: lineageDepth, type, title, body, status: bornStatus, q: quarantine ? 1 : 0, host: hostId, team, origin, taint: tainted, sources: sources.size ? JSON.stringify([...sources]) : null, reason: machineReason, spawnKey, iso });
      const id = ins.lastInsertRowid;
      const rendered = renderTicket(this._get.get(id));
      this.audit.record({ actor_sub: principal.sub, surface, action: 'create', ticket_id: id, to_state: bornStatus, op_id: opId, fields_changed: { origin, lineage_depth: lineageDepth, quarantine: !!quarantine, machine_reason: machineReason } });
      if (opId) this.audit.recordOp(principal.sub, opId, `create:${spawnKey || title}`, rendered);
      ctx?.emit?.('ticket', { ticket_id: id, action: 'create', status: bornStatus });
      return rendered;
    };
    return externalTx ? run(externalTx) : this.tx.immediate(run);
  }

  /** Non-fenced field updates (priority/severity/body_section). Fence required when claimed (§5). */
  update({ principal, ticketId, field, value, fencingToken, expectedVersion, opId, surface = 'mcp' }) {
    const allowed = { priority: 'priority', severity: 'severity', body_section: 'body' };
    if (!allowed[field]) throw biz(ERR.VALIDATION, `field ${field} not updatable`);
    const id = parseTicketId(ticketId);
    return this.tx.immediate((ctx) => {
      const t = this._get.get(id);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (expectedVersion != null && t.version !== expectedVersion) throw biz(ERR.VERSION_CONFLICT, 'version conflict', { current_version: t.version });
      // Echo rule (§5): fencing_token REQUIRED when the ticket is claimed.
      if (t.status === STATES.IN_PROGRESS) {
        const rid = t.host_id || `ticket:${t.id}`;
        const lock = this.db.prepare(`SELECT * FROM host_locks WHERE resource_id = ?`).get(rid);
        if (!lock || lock.claimed_by_agent !== principal.sub) throw biz(ERR.NOT_HOLDER, 'not the lease holder');
        if (fencingToken == null || Number(fencingToken) !== lock.lock_generation) throw biz(ERR.STALE_FENCING, 'fencing token required and must match', { current: lock.lock_generation });
      }
      this.db.prepare(`UPDATE tickets SET ${allowed[field]} = @value, version = version + 1, updated_at = @iso WHERE id = @id`).run({ value, iso: this.clock.iso(), id });
      const response = { ticket_id: id, field, value, version: t.version + 1 };
      this.audit.record({ actor_sub: principal.sub, surface, action: 'update', ticket_id: id, op_id: opId, fields_changed: { [field]: value } });
      ctx.emit('ticket', { ticket_id: id, action: 'update' });
      return response;
    });
  }

  linkNote({ principal, ticketId, noteId, fencingToken, role = 'general', opId, surface = 'mcp' }) {
    const id = parseTicketId(ticketId);
    return this.tx.immediate((ctx) => {
      const t = this._get.get(id);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (t.status === STATES.IN_PROGRESS) {
        const rid = t.host_id || `ticket:${t.id}`;
        const lock = this.db.prepare(`SELECT * FROM host_locks WHERE resource_id = ?`).get(rid);
        if (!lock || lock.claimed_by_agent !== principal.sub) throw biz(ERR.NOT_HOLDER, 'not the lease holder');
        if (fencingToken == null || Number(fencingToken) !== lock.lock_generation) throw biz(ERR.STALE_FENCING, 'fencing token required and must match', { current: lock.lock_generation });
      }
      this.db.prepare(`INSERT INTO ticket_notes (ticket_id, note_id, role, linked_at, linked_by) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(ticket_id, note_id) DO UPDATE SET role = excluded.role, linked_at = excluded.linked_at`).run(id, noteId, role, this.clock.iso(), principal.sub);
      this.audit.record({ actor_sub: principal.sub, surface, action: 'link_note', ticket_id: id, op_id: opId, fields_changed: { note_id: noteId, role } });
      return { ticket_id: id, note_id: noteId };
    });
  }

  addDependency({ principal, ticketId, dependsOnId, opId, surface = 'mcp' }) {
    const id = parseTicketId(ticketId), dep = parseTicketId(dependsOnId);
    if (id == null || dep == null) throw biz(ERR.VALIDATION, 'bad ticket id');
    if (id === dep) throw biz(ERR.DEP_CYCLE, 'a ticket cannot depend on itself');
    return this.tx.immediate(() => {
      if (!this._get.get(id) || !this._get.get(dep)) throw biz(ERR.NOT_FOUND, 'ticket not found');
      // Cycle-closing edges rejected via WITH RECURSIVE reachability probe (would dep already reach id?).
      const reaches = this.db.prepare(`WITH RECURSIVE r(x) AS (
        SELECT depends_on_id FROM ticket_deps WHERE ticket_id = @dep
        UNION SELECT d.depends_on_id FROM ticket_deps d JOIN r ON d.ticket_id = r.x)
        SELECT 1 FROM r WHERE x = @id LIMIT 1`).get({ dep, id });
      if (reaches) throw biz(ERR.DEP_CYCLE, 'edge would close a dependency cycle');
      this.db.prepare(`INSERT OR IGNORE INTO ticket_deps (ticket_id, depends_on_id, kind) VALUES (?, ?, 'finish_to_start')`).run(id, dep);
      this.audit.record({ actor_sub: principal.sub, surface, action: 'add_dependency', ticket_id: id, fields_changed: { depends_on: dep }, op_id: opId });
      return { ticket_id: id, depends_on: dep };
    });
  }

  query({ status, team, hostId, parentId, phase, limit = 50, cursor = 0 } = {}) {
    const clauses = ['id > @cursor'];
    const params = { cursor: cursor || 0, limit: Math.min(Number(limit) || 50, 200) };
    if (status) { clauses.push('status = @status'); params.status = status; }
    if (team) { clauses.push('team = @team'); params.team = team; }
    if (hostId) { clauses.push('host_id = @hostId'); params.hostId = hostId; }
    if (parentId != null) { clauses.push('parent_id = @parentId'); params.parentId = parseTicketId(parentId); }
    if (phase) { clauses.push('ceremony_phase = @phase'); params.phase = phase; }
    const rows = this.db.prepare(`SELECT * FROM tickets WHERE ${clauses.join(' AND ')} ORDER BY id ASC LIMIT @limit`).all(params);
    return { cursor: rows.at(-1)?.id ?? cursor, items: rows.map(renderTicket) };
  }

  /** Operator quarantine clear (§10.1): confirm CMDB mapping -> re-resolve host_id + clear flag. */
  clearQuarantine({ principal, ticketId, hostId, opId, surface = 'http' }) {
    const id = parseTicketId(ticketId);
    return this.tx.immediate((ctx) => {
      const t = this._get.get(id);
      if (!t) throw biz(ERR.NOT_FOUND, 'ticket not found');
      if (!t.quarantine) throw biz(ERR.VALIDATION, 'ticket is not quarantined');
      this.db.prepare(`UPDATE tickets SET quarantine = 0, host_id = @host, machine_reason = NULL, version = version + 1, updated_at = @iso WHERE id = @id`).run({ host: hostId ?? t.host_id, iso: this.clock.iso(), id });
      this.audit.record({ actor_sub: principal.sub, surface, action: 'clear_quarantine', ticket_id: id, op_id: opId, fields_changed: { host_id: hostId } });
      ctx.emit('ticket', { ticket_id: id, action: 'clear_quarantine' });
      return { ticket_id: id, quarantine: false, host_id: hostId ?? t.host_id };
    });
  }
}
