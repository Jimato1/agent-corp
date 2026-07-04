/*
 * constants.js — the pinned vocabulary of the Notes service.
 *
 * Every enum here is bound by a FROZEN doc; none is invented at build time.
 * Sources cited inline so a reviewer can join each constant back to its authority.
 *
 * CORRECTIONS ANCHORED HERE (do not regress — MERGE_REVIEW_1 §6 / PLAN §12):
 *   - CORR-3 (spec ceremony vocabulary): CEREMONY_PHASES is TICKET_STATE_MACHINE.md §3
 *     verbatim. The Stage-1 invented set (drafting/cross-talk/converged/escalated) is DEAD.
 *   - CORR-7 (4-scope slice): SCOPES / TOOL_SCOPES per auth-apps-tokens-scopes.md §3 notes row.
 */

// --- Cross-app ID formats (context/specs/IDENTIFIERS.md) -----------------------
export const NOTE_ID_PREFIX = 'N-'; // Notes-minted: 'N-' + 26-char ULID. Immutable.
export const NOTE_ID_RE = /^N-[0-9A-HJKMNP-TV-Z]{26}$/; // Crockford base32 ULID alphabet
export const TICKET_ID_RE = /^T-\d+$/; // Board-minted, opaque; stored verbatim, existence-checkable

// --- Note types = template registry (PLAN §5) ---------------------------------
export const NOTE_TYPES = ['research', 'plan', 'retro', 'deliberation', 'checkpoint', 'general'];

// --- Ceremony phases — CORR-3. TICKET_STATE_MACHINE.md §3, verbatim & 1:1 ------
// display_phase enum AND deliberation section headers use exactly these seven.
export const CEREMONY_PHASES = [
  'triage',
  'recon',
  'planning',
  'adversarial_review',
  'backlog',
  'execute',
  'retro',
];

// --- Provenance & taint (PLAN §2.2 / ARCH §12) --------------------------------
// `provenance` is descriptive origin; `provenance_taint` is the raise-only monotonic lattice.
export const PROVENANCE = ['agent', 'operator', 'host_originated', 'external'];
// Taint lattice, low → high. effective = own ∨ ⋁ linked. Monotonic, raise-only.
export const TAINT_LEVELS = ['clean', 'host_originated'];
export const TAINT_RANK = { clean: 0, host_originated: 1 };

// Which provenance origins floor the taint to host_originated.
export const PROVENANCE_TAINT_FLOOR = {
  agent: 'clean',
  operator: 'clean',
  external: 'clean', // external ≠ host; still adversarial but not host_originated per PLAN §2.2 lattice
  host_originated: 'host_originated',
};

// --- Auth scopes — CORR-7. auth-apps-tokens-scopes.md §3 (notes row), PLAN §8 --
export const SCOPES = {
  READ: 'notes:read',
  SEARCH: 'notes:search',
  APPEND: 'notes:append', // create/append/link — the DEFAULT agent grant
  WRITE: 'notes:write', // overwrite/rename/archive/reindex/taint-downgrade — operator/maintenance ONLY
};

// Tool/endpoint → required scope. Server-side enforced (PLAN §8).
export const TOOL_SCOPES = {
  read_note: SCOPES.READ,
  list_backlinks: SCOPES.READ,
  search_notes: SCOPES.SEARCH,
  create_note: SCOPES.APPEND,
  append_note: SCOPES.APPEND,
  link_notes: SCOPES.APPEND,
  update_note: SCOPES.WRITE,
};

// --- Action-class manifest (auth contract §1; unclassified ⇒ fail-closed) ------
// PLAN §8: Notes registers ONLY read + write-benign. No propose/sod-critical/destructive-exec.
export const ACTION_CLASS = { READ: 'read', WRITE_BENIGN: 'write-benign' };
export const ENDPOINT_ACTION_CLASS = {
  // read
  'GET /api/notes/:id': ACTION_CLASS.READ,
  'GET /api/search': ACTION_CLASS.READ,
  'GET /api/notes/:id/backlinks': ACTION_CLASS.READ,
  'GET /api/notes/:id/taint': ACTION_CLASS.READ,
  'GET /api/events': ACTION_CLASS.READ,
  'GET /healthz': ACTION_CLASS.READ,
  // write-benign (all git-reversible or index-disposable — no real-world side effect)
  'POST /api/notes': ACTION_CLASS.WRITE_BENIGN,
  'POST /api/notes/:id/append': ACTION_CLASS.WRITE_BENIGN,
  'POST /api/notes/:id/links': ACTION_CLASS.WRITE_BENIGN,
  'PUT /api/notes/:id': ACTION_CLASS.WRITE_BENIGN,
  'POST /api/admin/reindex': ACTION_CLASS.WRITE_BENIGN,
};

// --- Business error codes (PLAN §6/§9/§11; board-agents-claim.md §1 convention) -
// These are STRUCTURED business outcomes, never JSON-RPC/protocol errors.
// MCP maps every one to { isError: true, structuredContent: { code, ... } }.
export const ERR = {
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION: 'VALIDATION',
  PRECONDITION_HASH: 'PRECONDITION_HASH', // CAS mismatch on update_note (§9.2)
  STALE_FENCE: 'STALE_FENCE', // presented token older than current gen / monotonic floor (§6, §9.3)
  FENCE_REQUIRED: 'FENCE_REQUIRED', // ticket-bound write missing a fencing token (§6)
  FENCE_UNVERIFIABLE: 'FENCE_UNVERIFIABLE', // Board unreachable ⇒ fail-closed (§9.3)
  TAINT_DOWNGRADE: 'TAINT_DOWNGRADE', // attempt to lower provenance/taint (§2.2c)
  HYGIENE_REJECT: 'HYGIENE_REJECT', // secret-material shape detected (§11.4)
  TICKET_UNKNOWN: 'TICKET_UNKNOWN', // ticket_id fails Board existence check (§9.3)
  ALREADY_APPLIED: 'ALREADY_APPLIED', // op_id replay after index rebuild (§4.2)
  SECTION_UNKNOWN: 'SECTION_UNKNOWN', // append target section header not in the note
  TOO_LARGE: 'TOO_LARGE', // note exceeds size cap (§11.10)
};

// HTTP status mapping for business errors (RS baseline reserves 401/403/409/429/503).
export const ERR_HTTP = {
  [ERR.NOT_FOUND]: 404,
  [ERR.VALIDATION]: 400,
  [ERR.PRECONDITION_HASH]: 409,
  [ERR.STALE_FENCE]: 409,
  [ERR.FENCE_REQUIRED]: 400,
  [ERR.FENCE_UNVERIFIABLE]: 503, // fail-closed dependency outage
  [ERR.TAINT_DOWNGRADE]: 422,
  [ERR.HYGIENE_REJECT]: 422,
  [ERR.TICKET_UNKNOWN]: 422,
  [ERR.ALREADY_APPLIED]: 200, // idempotent replay is a success-shaped outcome
  [ERR.SECTION_UNKNOWN]: 400,
  [ERR.TOO_LARGE]: 413,
};

// --- Frontmatter field classification — CORR-2 (the display-only firewall) -----
// PLAN §2.2. (a) canonical: the file is truth. (b) display copies: WRITE-ONLY mirrors,
// NEVER read back by any API/tool/index/trigger. Structurally unreadable = nothing to trigger on.
export const CANONICAL_FRONTMATTER = [
  'id',
  'type',
  'title',
  'created',
  'updated',
  'ticket',
  'tags',
  'links',
  'participants', // deliberation notes (PLAN §7.2)
  'provenance',
  'provenance_taint',
  'authored_by',
];
// CORR-2: these are DECORATION. The service writes them for a human eyeball only.
// No mirror column, no search filter, no read response ever surfaces them.
export const DISPLAY_ONLY_FRONTMATTER = ['ceremony_phase_display', 'ticket_status_display'];

// MCP transport pin (board-agents-claim.md §6 / PLAN §6 / ratified D-14).
export const MCP_SPEC_REVISION = '2025-11-25';

// Notes' own outbound identity for Board reads (PLAN §9.3).
export const SVC_PRINCIPAL = 'svc:notes';
export const BOARD_AUDIENCE = 'board';
export const SELF_AUDIENCE = 'notes';
