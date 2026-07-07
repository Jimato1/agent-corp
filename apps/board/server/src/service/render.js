/*
 * service/render.js — row -> API shape. Renders Board-minted integer PKs as prefixed refs
 * (T-%06d / A-%06d, IDENTIFIERS.md) at the boundary; foreign IDs pass through verbatim.
 */
import { ticketRef, approvalRef } from '../ids.js';

export function renderTicket(row) {
  if (!row) return null;
  return {
    ticket_id: ticketRef(row.id),
    kind: row.kind,
    parent_id: ticketRef(row.parent_id),
    child_class: row.child_class,
    spawned_by: row.spawned_by,
    lineage_depth: row.lineage_depth,
    type: row.type,
    title: row.title,
    body: row.body,
    status: row.status,
    quarantine: !!row.quarantine,
    ceremony_phase: row.ceremony_phase,
    lane: row.lane,
    lane_signals: row.lane_signals ? JSON.parse(row.lane_signals) : null,
    host_id: row.host_id,
    team: row.team,
    priority: row.priority,
    severity: row.severity,
    claimed_by: row.claimed_by,
    claimed_at: row.claimed_at,
    lease_expires_at: row.lease_expires_at,
    lease_renewals: row.lease_renewals,
    fencing_token: row.fencing_token,
    proposer_id: row.proposer_id,
    origin_kind: row.origin_kind,
    taint_host_originated: !!row.taint_host_originated,
    taint_sources: row.taint_sources ? JSON.parse(row.taint_sources) : [],
    version: row.version,
    machine_reason: row.machine_reason,
    approval_id: approvalRef(row.approval_id),
    wall_clock_cap_at: row.wall_clock_cap_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    done_at: row.done_at,
  };
}

export function renderApproval(row, allowlist = []) {
  if (!row) return null;
  return {
    approval_id: approvalRef(row.id),
    ticket_id: ticketRef(row.ticket_id),
    host_id: row.host_id,
    plan_hash: row.plan_hash,
    plan_note_id: row.plan_note_id,
    plan_note_rev: row.plan_note_rev,
    action_class: row.action_class,
    proposer_id: row.proposer_id,
    approver_sub: row.approver_sub,
    approver_kind: row.approver_kind,
    cmdb_decision_id: row.cmdb_decision_id,
    status: row.status,
    granted_at: row.granted_at,
    consumed_at: row.consumed_at,
    consumed_by: row.consumed_by,
    run_id: row.run_id,
    allowlist: allowlist.map((a) => ({ seq: a.seq, playbook_key: a.playbook_key, params_hash: a.params_hash, host_id: a.host_id, class_binding: a.class_binding })),
  };
}
