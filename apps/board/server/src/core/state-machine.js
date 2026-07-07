/*
 * core/state-machine.js — the Board-owned transition authority (TICKET_STATE_MACHINE §2; PLAN §6).
 *
 * The authority table lives here as DATA + guard predicates (no statechart runtime). It is the
 * source of truth for BOTH surfaces — MCP, HTTP, and UI paths all validate through it. The caller's
 * *claimed* role is never trusted over its token: authority is checked as (principal kind, scope,
 * and for A1/A2 the internal-process identity).
 *
 * THE SoD BOUNDARY, AS CODE: agents can cause ONLY the claim, voluntary release, and
 * in_progress -> {awaiting_approval, needs_review, blocked}. `approved, executing, verifying, done,
 * failed, cancelled` are unreachable by any agent — enforced here (service layer) AND made
 * structurally unexpressable in the agent tool enum (constants.AGENT_TRANSITION_TARGETS). Both hold.
 */
import { STATES, TERMINAL_STATES, AGENT_TRANSITION_TARGETS } from '../constants.js';

// The full legal transition superset (from -> set of legal to-states). Used for validation; who may
// cause each is decided by the authority helpers below, not by membership alone.
export const LEGAL = {
  [STATES.TODO]: new Set([STATES.IN_PROGRESS, STATES.CANCELLED]),
  [STATES.IN_PROGRESS]: new Set([STATES.TODO, STATES.AWAITING_APPROVAL, STATES.NEEDS_REVIEW, STATES.BLOCKED]),
  [STATES.AWAITING_APPROVAL]: new Set([STATES.APPROVED, STATES.CANCELLED]),
  [STATES.APPROVED]: new Set([STATES.EXECUTING, STATES.CANCELLED, STATES.AWAITING_APPROVAL]), // A-RR: restore-only
  [STATES.EXECUTING]: new Set([STATES.VERIFYING, STATES.NEEDS_REVIEW, STATES.FAILED]),
  [STATES.VERIFYING]: new Set([STATES.DONE, STATES.FAILED]),
  [STATES.NEEDS_REVIEW]: new Set([STATES.DONE, STATES.TODO]),
  [STATES.BLOCKED]: new Set([STATES.TODO, STATES.CANCELLED]),
  [STATES.DONE]: new Set(),
  [STATES.FAILED]: new Set(),
  [STATES.CANCELLED]: new Set(),
};

export function isLegal(from, to) {
  return LEGAL[from]?.has(to) ?? false;
}

/**
 * Whether an AGENT (kind=agent, board:update/claim) may cause from->to via the generic transition
 * tool. Deliberately narrow: the claim (todo->in_progress) and voluntary release (in_progress->todo)
 * flow through dedicated tools, NOT the generic transition; this covers the propose/complete/escalate
 * set only.
 */
export function agentMayTransition(from, to) {
  return from === STATES.IN_PROGRESS && AGENT_TRANSITION_TARGETS.has(to);
}

// The set of states an agent may NEVER move a ticket into — the segregation-of-duties property.
export const AGENT_FORBIDDEN_TARGETS = new Set([
  STATES.APPROVED, STATES.EXECUTING, STATES.VERIFYING, STATES.DONE, STATES.FAILED, STATES.CANCELLED,
]);

export function isAgentForbiddenTarget(to) {
  return AGENT_FORBIDDEN_TARGETS.has(to);
}

/**
 * Operator-causable transitions (human kind, appropriate scope). needs_review->done is human-ONLY
 * (no agent or policy path exists anywhere). approved->cancelled revokes the approval in the same tx.
 */
export function operatorMayTransition(from, to) {
  const ok = {
    [STATES.AWAITING_APPROVAL]: new Set([STATES.CANCELLED]),
    [STATES.APPROVED]: new Set([STATES.CANCELLED]),
    [STATES.NEEDS_REVIEW]: new Set([STATES.DONE, STATES.TODO]),
    [STATES.BLOCKED]: new Set([STATES.TODO, STATES.CANCELLED]),
    [STATES.TODO]: new Set([STATES.CANCELLED]),
    [STATES.VERIFYING]: new Set([STATES.FAILED]),
  };
  return ok[from]?.has(to) ?? false;
}

export function isTerminal(state) {
  return TERMINAL_STATES.has(state);
}

// States in which the ticket holds a claim lease (so its side-effecting calls are fence-checked).
export function holdsClaimLease(state) {
  return state === STATES.IN_PROGRESS;
}
