/*
 * service/facts.js — the PIP read surface (PLAN §7; freeze as board-consumers-facts-read.md + board-mc-console.md).
 *
 * Small, fast, read-only (in-process SQLite PK reads; target p99 < 50 ms). Consumers: auth's PDP
 * (proposer_id + state), Vault's D-4 redeem predicate (/facts/approval — status='consumed' ∧
 * consumed_by == redeeming gateway ∧ fresh; ticket_status added per REVIEW_2 §S2), Notes' uncached
 * fence read (/facts/ticket fencing_token, ticket-keyed), Drive's exists bit, Gateway's host-lock
 * read, MC's since-cursor console reads. LIVE facts, never request-supplied. Every response is
 * Cache-Control: no-store (staleness silently weakens four consumers' SoD checks) — set in http.js.
 */
import { ticketRef, approvalRef, parseTicketId, parseApprovalId } from '../ids.js';

export class Facts {
  constructor({ db }) {
    this.db = db;
    this._ticket = db.prepare(`SELECT * FROM tickets WHERE id = ?`);
    this._approval = db.prepare(`SELECT * FROM approvals WHERE id = ?`);
    this._lock = db.prepare(`SELECT * FROM host_locks WHERE resource_id = ?`);
  }

  ticket(ref) {
    const id = parseTicketId(ref);
    const t = id == null ? null : this._ticket.get(id);
    if (!t) return { exists: false };
    return {
      exists: true,
      ticket_id: ticketRef(t.id),
      status: t.status,
      proposer_id: t.proposer_id,
      claimed_by: t.claimed_by,
      host_id: t.host_id,
      team: t.team,
      lane: t.lane,
      taint_host_originated: !!t.taint_host_originated,
      approval_id: approvalRef(t.approval_id),
      approval_status: t.approval_id ? this._approval.get(t.approval_id)?.status ?? null : null,
      fencing_token: t.fencing_token,
      lease_expires_at: t.lease_expires_at,
      version: t.version,
      updated_at: t.updated_at,
    };
  }

  approval(ref) {
    const id = parseApprovalId(ref);
    const a = id == null ? null : this._approval.get(id);
    if (!a) return { exists: false };
    const t = this._ticket.get(a.ticket_id);
    return {
      exists: true,
      approval_id: approvalRef(a.id),
      status: a.status,
      ticket_id: ticketRef(a.ticket_id),
      ticket_status: t?.status ?? null, // REVIEW_2 §S2: Vault's B-4 "still-executing" check in one call
      host_id: a.host_id,
      plan_hash: a.plan_hash,
      plan_note_id: a.plan_note_id,
      plan_note_rev: a.plan_note_rev,
      action_class: a.action_class,
      approver_kind: a.approver_kind,
      approver_sub: a.approver_sub,
      granted_at: a.granted_at,
      consumed_at: a.consumed_at,
      consumed_by: a.consumed_by,
      run_id: a.run_id,
    };
  }

  // Kill-epoch mirror (auth_state) for the Board's read-only HaltBand (UI_SPEC §3). The Board hosts no
  // actuator — it renders MC/auth's posture. Stale-past-bound handling is client-side (Freshness).
  killPosture() {
    const s = this.db.prepare(`SELECT last_epoch, level, updated_at FROM auth_state WHERE id = 1`).get();
    return { level: s?.level ?? 'G0', epoch: s?.last_epoch ?? 0, updated_at: s?.updated_at ?? null };
  }

  hostLock(hostId) {
    const l = this._lock.get(hostId);
    if (!l) return { exists: false, lock_generation: 0 };
    return {
      exists: true,
      resource_id: l.resource_id,
      lock_generation: l.lock_generation,
      claimed_by_ticket: ticketRef(l.claimed_by_ticket),
      claimed_by_agent: l.claimed_by_agent,
      hold_kind: l.hold_kind,
      lease_expires_at: l.lease_expires_at,
    };
  }

  // --- MC console reads (since-cursor paginated; board-mc-console.md) -------------------------------
  escalations(since = 0, limit = 100) {
    const rows = this.db.prepare(`SELECT * FROM audit_log WHERE id > ? AND action IN ('board_escalation','fleet_outage_hold','breakglass_review_ticket','quarantine') ORDER BY id ASC LIMIT ?`).all(since, limit);
    return { cursor: rows.at(-1)?.id ?? since, items: rows.map(renderAudit) };
  }
  violations(since = 0, limit = 100) {
    const rows = this.db.prepare(`SELECT * FROM audit_log WHERE id > ? AND outcome = 'violation' ORDER BY id ASC LIMIT ?`).all(since, limit);
    return { cursor: rows.at(-1)?.id ?? since, items: rows.map(renderAudit) };
  }
  lineage(ref) {
    const id = parseTicketId(ref);
    if (id == null) return { root: null, nodes: [] };
    const nodes = [];
    const walk = (nid, depth) => {
      const t = this._ticket.get(nid);
      if (!t) return;
      nodes.push({ ticket_id: ticketRef(t.id), status: t.status, lineage_depth: t.lineage_depth, spawned_by: t.spawned_by, parent_id: ticketRef(t.parent_id) });
      if (depth > 32) return;
      for (const c of this.db.prepare(`SELECT id FROM tickets WHERE parent_id = ?`).all(nid)) walk(c.id, depth + 1);
    };
    walk(id, 0);
    return { root: ticketRef(id), nodes, max_depth_cap: this.db.prepare(`SELECT max_depth FROM lineage_policy WHERE id = 1`).get()?.max_depth };
  }
  holds() {
    const rows = this.db.prepare(`SELECT id, held_reason, updated_at FROM tickets WHERE held = 1`).all();
    return { items: rows.map((r) => ({ ticket_id: ticketRef(r.id), reason: r.held_reason, since: r.updated_at })) };
  }
  wip() {
    const policy = this.db.prepare(`SELECT scope, subject, cap FROM wip_policy`).all();
    const inProgressGlobal = this.db.prepare(`SELECT COUNT(*) n FROM tickets WHERE status='in_progress'`).get().n;
    const lineage = this.db.prepare(`SELECT max_depth FROM lineage_policy WHERE id = 1`).get()?.max_depth;
    return { policy, in_progress_global: inProgressGlobal, lineage_max_depth: lineage };
  }
}

function renderAudit(r) {
  return {
    id: r.id, ts: r.ts, actor_sub: r.actor_sub, action: r.action,
    ticket_id: r.ticket_id ? ticketRef(r.ticket_id) : null,
    approval_id: r.approval_id ? approvalRef(r.approval_id) : null,
    from_state: r.from_state, to_state: r.to_state,
    fields: r.fields_changed ? JSON.parse(r.fields_changed) : null,
    outcome: r.outcome, machine_reason: r.fields_changed ? (JSON.parse(r.fields_changed).machine_reason ?? JSON.parse(r.fields_changed).reason ?? null) : null,
  };
}
