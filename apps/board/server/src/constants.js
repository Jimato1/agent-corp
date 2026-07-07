/*
 * constants.js — the enums, scopes, error codes, and the state-machine authority table.
 *
 * Authority for the state set + transitions: context/specs/TICKET_STATE_MACHINE.md (Board-owned) +
 * PLAN §6 (incl. amendments A-VR / A-RR). The ceremony phase set: same spec §3 + PLAN §14.
 * Pure module — safe to statically import from tests (no config side-effects).
 */

// MCP transport spec revision — suite-wide pin (ratified D-14). VERIFY-AT-BUILD; do NOT target the
// 2026-07-28 RC (board-agents-claim.md §6).
export const MCP_SPEC_REVISION = '2025-11-25';

// ---- Ticket lifecycle: the 11-state superset (TICKET_STATE_MACHINE §1) ----------------------------
export const STATES = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  AWAITING_APPROVAL: 'awaiting_approval',
  APPROVED: 'approved',
  EXECUTING: 'executing',
  VERIFYING: 'verifying',
  NEEDS_REVIEW: 'needs_review',
  BLOCKED: 'blocked',
  DONE: 'done',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};
export const ALL_STATES = Object.values(STATES);
export const TERMINAL_STATES = new Set([STATES.DONE, STATES.FAILED, STATES.CANCELLED]);

// ---- Ceremony phases (TICKET_STATE_MACHINE §3; PLAN §14) -----------------------------------------
export const PHASES = {
  TRIAGE: 'triage',
  RECON: 'recon',
  PLANNING: 'planning',
  ADVERSARIAL_REVIEW: 'adversarial_review',
  BACKLOG: 'backlog',
  EXECUTE: 'execute',
  RETRO: 'retro',
};
export const PHASE_ORDER = [
  PHASES.TRIAGE, PHASES.RECON, PHASES.PLANNING, PHASES.ADVERSARIAL_REVIEW, PHASES.BACKLOG, PHASES.EXECUTE, PHASES.RETRO,
];
export function phaseAtLeast(phase, floor) {
  return PHASE_ORDER.indexOf(phase ?? '') >= PHASE_ORDER.indexOf(floor);
}

// Triage lanes (D-2). Lane governs planning rigor only; never an execution gate.
export const LANES = { STRAIGHT: 'straight_to_execute', LIGHTWEIGHT: 'lightweight', FULL: 'full' };

// ---- Principal kinds (auth) ----------------------------------------------------------------------
export const KIND = { HUMAN: 'human', AGENT: 'agent', SERVICE: 'service' };

// ---- OAuth scopes (auth-apps-tokens-scopes.md §3 board row + PLAN §13 new asks) -------------------
export const SCOPES = {
  READ: 'board:read',
  CLAIM: 'board:claim',
  PROPOSE: 'board:propose',
  UPDATE: 'board:update',
  APPROVE: 'board:approve', // operator + svc:tier-approver (kind-gated); HTTP approval API, not MCP
  RUN_CEREMONY: 'board:run-ceremony',
  EXECUTE: 'board:execute', // NEW — svc:gateway ONLY (kind-gated): consume + run-outcome + verification
  ADMIN: 'board:admin', // NEW — policy-plane writes (WIP/lineage/standing/quarantine/reaper-hold)
  AUTH_CREATE: 'board:create-breakglass', // NEW — svc:auth kind-gated A2 birth (indicative name)
};

// Scopes/audiences the RS advertises (RFC 9728 metadata).
export const SCOPES_SUPPORTED = [
  SCOPES.READ, SCOPES.CLAIM, SCOPES.PROPOSE, SCOPES.UPDATE, SCOPES.APPROVE, SCOPES.RUN_CEREMONY, SCOPES.EXECUTE, SCOPES.ADMIN,
];

// Action-class manifest (auth contract §1 obligation; PLAN §12). Unclassified ⇒ live-check fail-closed.
export const ACTION_CLASS = {
  READ: 'read',
  WRITE_BENIGN: 'write-benign',
  PROPOSE: 'propose',
  SOD_CRITICAL: 'sod-critical',
};

// Derived approval action classes (worst across allowlist playbooks; PLAN §8.2). destructive/irreversible
// are structurally non-auto at the Board (auto-approve floor), independent of CMDB.
export const DERIVED_CLASS = { BENIGN: 'benign', STANDARD: 'standard', DESTRUCTIVE: 'destructive', IRREVERSIBLE: 'irreversible' };
export const NON_AUTO_CLASSES = new Set([DERIVED_CLASS.DESTRUCTIVE, DERIVED_CLASS.IRREVERSIBLE]);

// ---- Business error codes → HTTP status (PLAN §3/§6; board-agents-claim §1) ----------------------
export const ERR = {
  // claim failure semantics (contract §1, verbatim)
  CLAIM_CONFLICT: 'CLAIM_CONFLICT',
  NO_ELIGIBLE_WORK: 'NO_ELIGIBLE_WORK',
  WIP_CAP: 'WIP_CAP',
  LINEAGE_CAP: 'LINEAGE_CAP',
  HOST_LOCKED: 'HOST_LOCKED',
  QUIESCED: 'QUIESCED',
  // fencing / lease
  STALE_FENCING: 'STALE_FENCING',
  NOT_HOLDER: 'NOT_HOLDER',
  // transitions / approvals
  ILLEGAL_TRANSITION: 'ILLEGAL_TRANSITION',
  NOT_FOUND: 'NOT_FOUND',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  FOUR_EYES: 'FOUR_EYES',
  AUTO_APPROVE_FORBIDDEN: 'AUTO_APPROVE_FORBIDDEN',
  APPROVAL_CONSUMED: 'approval_consumed', // terminal (second consume) — spec vocabulary
  APPROVAL_REVOKED: 'approval_revoked',
  APPROVAL_EXPIRED: 'approval_expired',
  PLAN_UNPARSEABLE: 'PLAN_UNPARSEABLE',
  PLAN_PIN_MOVED: 'PLAN_PIN_MOVED',
  DEP_UNMET: 'DEP_UNMET',
  DEP_CYCLE: 'DEP_CYCLE',
  // idempotency
  OP_MISMATCH: 'OP_MISMATCH',
  OP_IN_PROGRESS: 'OP_IN_PROGRESS',
  // ceremony
  OUT_OF_ORDER_STATEMENT: 'OUT_OF_ORDER_STATEMENT',
  NOT_ROSTER: 'NOT_ROSTER',
  VETO_UNRESOLVED: 'VETO_UNRESOLVED',
  DISSENT_REQUIRED: 'DISSENT_REQUIRED',
  DISSENT_UNGROUNDED: 'DISSENT_UNGROUNDED',
  SIGNAL_UNAVAILABLE: 'SIGNAL_UNAVAILABLE',
  // dependency-outage fail-closed on the SoD-critical path
  DEP_UNAVAILABLE: 'DEP_UNAVAILABLE',
  QUARANTINED: 'QUARANTINED',
  VALIDATION: 'VALIDATION',
};

export const ERR_HTTP = {
  [ERR.CLAIM_CONFLICT]: 409,
  [ERR.NO_ELIGIBLE_WORK]: 200, // a business outcome, not an error status (contract §1)
  [ERR.WIP_CAP]: 409,
  [ERR.LINEAGE_CAP]: 409,
  [ERR.HOST_LOCKED]: 409,
  [ERR.QUIESCED]: 409,
  [ERR.STALE_FENCING]: 409,
  [ERR.NOT_HOLDER]: 403,
  [ERR.ILLEGAL_TRANSITION]: 409,
  [ERR.NOT_FOUND]: 404,
  [ERR.VERSION_CONFLICT]: 409,
  [ERR.FOUR_EYES]: 403,
  [ERR.AUTO_APPROVE_FORBIDDEN]: 403,
  [ERR.APPROVAL_CONSUMED]: 409,
  [ERR.APPROVAL_REVOKED]: 409,
  [ERR.APPROVAL_EXPIRED]: 409,
  [ERR.PLAN_UNPARSEABLE]: 422,
  [ERR.PLAN_PIN_MOVED]: 409,
  [ERR.DEP_UNMET]: 409,
  [ERR.DEP_CYCLE]: 409,
  [ERR.OP_MISMATCH]: 409,
  [ERR.OP_IN_PROGRESS]: 409,
  [ERR.OUT_OF_ORDER_STATEMENT]: 409,
  [ERR.NOT_ROSTER]: 403,
  [ERR.VETO_UNRESOLVED]: 409,
  [ERR.DISSENT_REQUIRED]: 409,
  [ERR.DISSENT_UNGROUNDED]: 422,
  [ERR.SIGNAL_UNAVAILABLE]: 503,
  [ERR.DEP_UNAVAILABLE]: 503,
  [ERR.QUARANTINED]: 409,
  [ERR.VALIDATION]: 422,
};

// ---- Ticket kinds / child classes / origin (PLAN §2.1) -------------------------------------------
export const TICKET_KIND = { TICKET: 'ticket', EPIC: 'epic', STANDING: 'standing' };
export const CHILD_CLASS = { GENERAL: 'general', RECON: 'recon', EXECUTION: 'execution' };
export const ORIGIN = { OPERATOR: 'operator', SCHEDULED: 'scheduled', EVENT_WEBHOOK: 'event_webhook', AGENT: 'agent' };

// ---- Ceremony roles (DACI; PLAN §14.2) -----------------------------------------------------------
export const ROLE = { SM: 'SM', PO: 'PO', AR: 'AR', SPECIALIST: 'SPECIALIST' };

// ---- Kill epoch levels (killswitch-chain.md; PLAN §11) -------------------------------------------
export const KILL = { G0: 'G0', G1: 'G1', G2: 'G2' };

// ---- Approver kinds (PLAN §2.4) ------------------------------------------------------------------
export const APPROVER_KIND = { OPERATOR: 'operator', TIER_POLICY: 'tier_policy' };

// Agent-callable transitions from in_progress (the spike-tested boundary; PLAN §6). The claim itself
// and board.release are separate tools. Everything else is STRUCTURALLY ABSENT from the agent surface
// AND independently hard-rejected by the service layer (both layers must hold).
export const AGENT_TRANSITION_TARGETS = new Set([STATES.AWAITING_APPROVAL, STATES.NEEDS_REVIEW, STATES.BLOCKED]);

// Per-tool scope map (MCP surface, PLAN §12).
export const TOOL_SCOPES = {
  'board.claim_next': SCOPES.CLAIM,
  'board.claim': SCOPES.CLAIM,
  'board.release': SCOPES.CLAIM,
  'board.heartbeat': SCOPES.CLAIM,
  'board.transition': SCOPES.UPDATE,
  'board.create': SCOPES.PROPOSE,
  'board.update': SCOPES.UPDATE,
  'board.get': SCOPES.READ,
  'board.query': SCOPES.READ,
  'board.add_dependency': SCOPES.UPDATE,
  'board.link_note': SCOPES.UPDATE,
  'board.ceremony_transition': SCOPES.RUN_CEREMONY,
  'board.ceremony_statement': SCOPES.RUN_CEREMONY,
};
