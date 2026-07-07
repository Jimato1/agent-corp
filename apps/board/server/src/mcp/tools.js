/*
 * mcp/tools.js — the MCP agent surface (PLAN §12). Schema ceiling (D-17): FLAT argument objects only
 * (no nested objects, no arrays of objects), <=6 params where possible, enum-biased closed enums,
 * additionalProperties:false, every mutating tool takes a caller-minted op_id. Business outcomes are
 * isError:true STRUCTURED content (a `code`), NEVER JSON-RPC errors (board-agents-claim.md §1).
 *
 * STRUCTURALLY ABSENT (the Vault four-tools pattern — not "rejected", NOT REGISTERED): approval grant,
 * consume_approval, any transition into/out of approved/executing/verifying/done/failed/cancelled,
 * WIP/lineage/standing writes, quarantine clearing, the facts service surface. The agent-callable
 * transition enum is EXACTLY {awaiting_approval, needs_review, blocked} — the SoD boundary as schema.
 */
import { z } from 'zod';
import { BusinessError } from '../errors.js';
import { ticketRef } from '../ids.js';

const opId = z.string().min(1).max(128);

export const TOOL_DEFS = {
  'board.claim_next': {
    description: 'Atomically claim the next eligible ticket (claim + host lock + lease + fencing token in one transaction). Business outcomes (no work, WIP/lineage cap, host busy) return isError structured content.',
    input: { role: z.string().optional(), team: z.string().optional(), type: z.string().optional(), op_id: opId },
  },
  'board.claim': {
    description: 'Atomically claim a specific ticket by id.',
    input: { ticket_id: z.string(), op_id: opId },
  },
  'board.release': {
    description: 'Voluntarily release a claimed ticket back to todo (frees the host lock, bumps the fencing generation). Fence-checked.',
    input: { ticket_id: z.string(), fencing_token: z.number().int(), reason: z.string().optional(), op_id: opId },
  },
  'board.heartbeat': {
    description: 'Renew the lease on a claimed ticket. Stale/absent fencing => STALE_FENCING (you were reaped).',
    input: { ticket_id: z.string(), fencing_token: z.number().int(), progress_note: z.string().optional(), op_id: opId },
  },
  'board.transition': {
    description: 'Move a claimed ticket to awaiting_approval (propose a destructive plan), needs_review (artifact done), or blocked (escalate). Agents CANNOT reach approved/executing/verifying/done/failed/cancelled.',
    input: { ticket_id: z.string(), to_status: z.enum(['awaiting_approval', 'needs_review', 'blocked']), fencing_token: z.number().int(), reason: z.string().optional(), op_id: opId },
  },
  'board.create': {
    description: 'Create a ticket. lineage_depth is server-derived; taint is tagged mechanically. child_class=execution is stamped ONLY by backlog decomposition, never here.',
    input: { title: z.string(), type: z.string().optional(), body: z.string().optional(), host_id: z.string().optional(), parent_id: z.string().optional(), team: z.string().optional(), op_id: opId },
  },
  'board.update': {
    description: 'Update priority, severity, or a body section. fencing_token is required when the ticket is claimed.',
    input: { ticket_id: z.string(), field: z.enum(['priority', 'severity', 'body_section']), value: z.union([z.string(), z.number()]), fencing_token: z.number().int().optional(), expected_version: z.number().int(), op_id: opId },
  },
  'board.get': {
    description: 'Read one ticket by id.',
    input: { ticket_id: z.string() },
  },
  'board.query': {
    description: 'Paginated ticket query (never a context dump).',
    input: { status: z.string().optional(), team: z.string().optional(), host_id: z.string().optional(), parent_id: z.string().optional(), phase: z.string().optional(), limit: z.number().int().optional(), cursor: z.number().int().optional() },
  },
  'board.add_dependency': {
    description: 'Add a finish-to-start dependency (blocker -> blocked). Cycle-closing edges are rejected.',
    input: { ticket_id: z.string(), depends_on_id: z.string(), op_id: opId },
  },
  'board.link_note': {
    description: 'Link a Notes note to a ticket (plan slice, recon note, transcript). Fence-checked when claimed.',
    input: { ticket_id: z.string(), note_id: z.string(), fencing_token: z.number().int(), op_id: opId },
  },
  'board.ceremony_transition': {
    description: 'Advance the ceremony phase (triage -> recon -> planning -> adversarial_review -> backlog -> execute -> retro). Guards decide; the Board fetches triage signals itself and sets the timebox/round-cap.',
    input: { ticket_id: z.string(), to_phase: z.enum(['triage', 'recon', 'planning', 'adversarial_review', 'backlog', 'execute', 'retro']), fencing_token: z.number().int().optional(), op_id: opId },
  },
  'board.ceremony_statement': {
    description: 'File a huddle statement (position before cross-talk; dissent must cite a recon note; veto/veto_clear/decision). Roster-sub-bound, not fence-bound.',
    input: { ticket_id: z.string(), kind: z.enum(['position', 'dissent', 'veto', 'veto_clear', 'decision']), note_id: z.string(), note_rev: z.string().optional(), op_id: opId },
  },
};

export function makeHandlers(board, principal) {
  const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }], structuredContent: data });
  const guard = (fn) => async (args) => {
    try {
      const data = await fn(args);
      // A returned business outcome (e.g. NO_ELIGIBLE_WORK) is isError structured content (contract §1).
      if (data && data.code) return { content: [{ type: 'text', text: data.code }], isError: true, structuredContent: data };
      return ok(data);
    } catch (e) {
      if (e instanceof BusinessError) return { content: [{ type: 'text', text: e.code }], isError: true, structuredContent: e.toStructured() };
      throw e; // genuine protocol/internal error
    }
  };
  const num = (v) => { const m = /^T-(\d+)$/.exec(String(v)); return m ? Number(m[1]) : Number(v); };

  return {
    'board.claim_next': guard((a) => renderClaim(board.claim.claim({ principal, ticketId: null, role: a.role, team: a.team, type: a.type, opId: a.op_id, surface: 'mcp' }))),
    'board.claim': guard((a) => renderClaim(board.claim.claim({ principal, ticketId: num(a.ticket_id), opId: a.op_id, surface: 'mcp' }))),
    'board.release': guard((a) => board.claim.release({ principal, ticketId: num(a.ticket_id), fencingToken: a.fencing_token, reason: a.reason, opId: a.op_id, surface: 'mcp' })),
    'board.heartbeat': guard((a) => board.claim.heartbeat({ principal, ticketId: num(a.ticket_id), fencingToken: a.fencing_token, progressNote: a.progress_note, opId: a.op_id, surface: 'mcp' })),
    'board.transition': guard((a) => board.agentTransition({ principal, ticketId: num(a.ticket_id), toStatus: a.to_status, fencingToken: a.fencing_token, reason: a.reason, opId: a.op_id, surface: 'mcp' })),
    'board.create': guard((a) => board.tickets.create({ principal, title: a.title, type: a.type, body: a.body, hostId: a.host_id, parentId: a.parent_id, team: a.team, opId: a.op_id, surface: 'mcp' })),
    'board.update': guard((a) => board.tickets.update({ principal, ticketId: num(a.ticket_id), field: a.field, value: a.value, fencingToken: a.fencing_token, expectedVersion: a.expected_version, opId: a.op_id, surface: 'mcp' })),
    'board.get': guard((a) => { const t = board.getTicket(a.ticket_id); if (!t) throw new BusinessError('NOT_FOUND', 'ticket not found'); return t; }),
    'board.query': guard((a) => board.query({ status: a.status, team: a.team, hostId: a.host_id, parentId: a.parent_id, phase: a.phase, limit: a.limit, cursor: a.cursor })),
    'board.add_dependency': guard((a) => board.tickets.addDependency({ principal, ticketId: num(a.ticket_id), dependsOnId: num(a.depends_on_id), opId: a.op_id, surface: 'mcp' })),
    'board.link_note': guard((a) => board.tickets.linkNote({ principal, ticketId: num(a.ticket_id), noteId: a.note_id, fencingToken: a.fencing_token, opId: a.op_id, surface: 'mcp' })),
    'board.ceremony_transition': guard((a) => a.to_phase === 'triage'
      ? board.ceremony.triage({ principal, ticketId: num(a.ticket_id), opId: a.op_id, surface: 'mcp' })
      : board.ceremony.transitionPhase({ principal, ticketId: num(a.ticket_id), toPhase: a.to_phase, fencingToken: a.fencing_token, opId: a.op_id, surface: 'mcp' })),
    'board.ceremony_statement': guard((a) => board.ceremony.statement({ principal, ticketId: num(a.ticket_id), kind: a.kind, noteId: a.note_id, noteRev: a.note_rev, opId: a.op_id, surface: 'mcp' })),
  };
}

// claim returns a raw {ticket_id: <int>, ...} or a NO_ELIGIBLE_WORK business outcome; render the ref.
function renderClaim(r) {
  if (r && r.code) return r; // business outcome (NO_ELIGIBLE_WORK) passes through as structured content
  return { ...r, ticket_id: ticketRef(r.ticket_id) };
}
