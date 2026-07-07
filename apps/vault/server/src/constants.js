/*
 * constants.js — scopes, principal kinds, redeem reject codes + the G-1 retryability legend, the
 * approval-class ordering (M-2), release lifecycle, and handle kinds.
 *
 * Authority: apps/vault/planning/PLAN.md (§4 redeem pipeline, §5 MCP, §9 scope slice),
 * context/CONTRACTS/auth-apps-tokens-scopes.md §8 (the PIN), vault-gateway-redemption.md,
 * board-consumers-facts-read.md (the D-4 predicate). Pure module — safe to import from tests.
 */

// MCP transport spec revision — suite-wide pin (ratified D-14). VERIFY-AT-BUILD; do NOT target the RC.
export const MCP_SPEC_REVISION = '2025-11-25';

// ---- Principal kinds (auth) ----------------------------------------------------------------------
export const KIND = { HUMAN: 'human', AGENT: 'agent', SERVICE: 'service' };

// ---- Scopes (auth-apps-tokens-scopes.md §3 vault row + §8 pin; PLAN §9) --------------------------
export const SCOPES = {
  // near-empty agent surface (the four §5.1 MCP tools). action classes: list/describe/status=read, request_release=propose
  REFERENCE: 'vault:reference',
  // THE holder scope — POST /redeem + /releases/revoke (creds interface). svc:gateway ONLY (§8 pin).
  READ_CREDENTIAL: 'vault:read-credential',
  // operator UI/API. operator only, human-kind-gated; never any machine principal (mirrors library:admin).
  MANAGE: 'vault:manage',
};
export const SCOPES_SUPPORTED = [SCOPES.REFERENCE, SCOPES.READ_CREDENTIAL, SCOPES.MANAGE];

// Per-tool scope map (MCP surface — the four tools all carry vault:reference; §5.1).
export const TOOL_SCOPES = {
  'vault_list_handles': SCOPES.REFERENCE,
  'vault_describe_handle': SCOPES.REFERENCE,
  'vault_request_release': SCOPES.REFERENCE,
  'vault_release_status': SCOPES.REFERENCE,
};

// Holder-scope kind gate (auth §8; defense-in-depth behind the per-endpoint sub-pin). vault:read-credential
// is svc:gateway ONLY (service kind); the redeem endpoint ALSO pins sub == svc:gateway (§4.1 step 6a).
// vault:manage is operator-only, human-kind-gated. Enforced in code — never trust the caller to self-police.
export const HOLDER_ALLOWED_KINDS = {
  [SCOPES.READ_CREDENTIAL]: new Set([KIND.SERVICE]),
  [SCOPES.MANAGE]: new Set([KIND.HUMAN]),
};

// The single legitimate redeemer subject (auth §8 "Vault MUST pin sub == svc:gateway"). Pinned in code.
export const GATEWAY_SUB = 'svc:gateway';

// ---- Action-class manifest (auth contract §1 obligation; PLAN §9). Unclassified => fail-closed. ----
export const ACTION_CLASS = {
  READ: 'read',
  PROPOSE: 'propose',
  WRITE_BENIGN: 'write-benign',
  DESTRUCTIVE_EXEC: 'destructive-exec', // the vault redeem live-check class (auth §8 step 7)
};

// ---- Approval-class ordering (M-2, §4.1 step 9). handle.requires_approval_class <= facts.action_class.
// A reversible-class approval can NEVER redeem a root-class handle. Higher index = more authority.
// The Board's derived approval action_class vocabulary (board constants DERIVED_CLASS): benign < standard
// < destructive < irreversible. We compare on this pinned ordering (Board is the authority for the value).
export const APPROVAL_CLASS_ORDER = ['benign', 'standard', 'destructive', 'irreversible'];
export function approvalClassRank(c) {
  const i = APPROVAL_CLASS_ORDER.indexOf(String(c || '').toLowerCase());
  return i; // -1 for unknown => fails the <= comparison closed (unknown handle class never satisfied)
}
/** requiredClass (handle) satisfied by grantedClass (approval facts) iff required <= granted, both known. */
export function approvalClassSufficient(requiredClass, grantedClass) {
  const req = approvalClassRank(requiredClass);
  const grant = approvalClassRank(grantedClass);
  if (req < 0 || grant < 0) return false; // unknown either side => fail closed
  return req <= grant;
}

// ---- Handle kinds (PLAN §3.2) --------------------------------------------------------------------
export const HANDLE_KIND = { SSH_CA: 'ssh-ca', KV: 'kv' };

// ---- Release lifecycle (PLAN §5.2 / §5.3). CAS single-statement transitions. ---------------------
export const RELEASE_STATUS = { PENDING: 'pending', REDEEMED: 'redeemed', EXPIRED: 'expired', REVOKED: 'revoked' };

// ---- Recovery paths for a KV handle (M-5 restore recovery) ---------------------------------------
export const RECOVERY = { SSH_CA_RESETTABLE: 'ssh-ca-resettable', PROVIDER_CONSOLE: 'provider-console', CONSOLE_ONLY: 'console-only' };

// ---- Redeem reject codes + the G-1 retryability legend (frozen for Gateway Stage-2 consumption) --
// Every code carries { http, retry }. retry ∈ 'never' (terminal 403/410), 'remint' (401), 'inprogress'
// (409, op idempotency only), 'budget' (429), 'later' (503 fail-closed retry with bounded backoff).
// The Gateway's kill obedience derives from ITS OWN kill channel, NEVER inferred from these codes (G-7).
export const REDEEM = {
  // step 0 — channel/cert (mTLS on the creds interface)
  NOT_GATEWAY_CHANNEL: { code: 'not_gateway_channel', http: 403, retry: 'never' },
  // steps 1–6 — §8-pin local token validation
  INVALID_TOKEN: { code: 'invalid_token', http: 401, retry: 'remint' },
  INSUFFICIENT_SCOPE: { code: 'insufficient_scope', http: 403, retry: 'never' },
  NOT_GATEWAY: { code: 'not_gateway', http: 403, retry: 'never' },
  // step 7 — destructive-exec live check (denylist + uncached introspect)
  REVOKED: { code: 'revoked', http: 403, retry: 'never' },
  AUTH_UNREACHABLE: { code: 'auth_unreachable', http: 503, retry: 'later' },
  // step 8 — release record
  UNKNOWN_RELEASE: { code: 'unknown_release', http: 404, retry: 'never' },
  RELEASE_NOT_PENDING: { code: 'release_not_pending', http: 403, retry: 'never' }, // M-10: terminal 403, not 409
  RELEASE_EXPIRED: { code: 'release_expired', http: 410, retry: 'never' },
  // step 9 — D-4 independent Board approval verification
  APPROVAL_NOT_CONSUMED: { code: 'approval_not_consumed', http: 403, retry: 'never' },
  APPROVAL_MISMATCH: { code: 'approval_mismatch', http: 403, retry: 'never' }, // host/ticket/plan/class
  APPROVAL_STALE: { code: 'approval_stale', http: 403, retry: 'never' }, // first-redeem past W
  BOARD_UNREACHABLE: { code: 'board_unreachable', http: 503, retry: 'later' },
  // step 10 / 13 — fail-closed audit gate (D-16a)
  AUDIT_UNAVAILABLE: { code: 'audit_unavailable', http: 503, retry: 'later' },
  // step 11 — engine op
  ENGINE_DENIED: { code: 'engine_denied', http: 403, retry: 'never' }, // the two layers disagreed — anomalous, escalate
  ENGINE_UNAVAILABLE: { code: 'engine_unavailable', http: 503, retry: 'later' },
  ENGINE_SEALED: { code: 'engine_sealed', http: 503, retry: 'later' },
  // idempotency / budget
  OP_IN_PROGRESS: { code: 'in_progress', http: 409, retry: 'inprogress' }, // 409 reserved for this ONLY (M-10)
  RE_RELEASE_CAP: { code: 're_release_cap', http: 403, retry: 'never' }, // N=3 exceeded — anomaly (M-11)
  BUDGET: { code: 'budget', http: 429, retry: 'budget' },
  // validation
  BAD_REQUEST: { code: 'bad_request', http: 400, retry: 'never' },
};

// ---- Release-request (agent surface) reject codes (§5.2) -----------------------------------------
export const RELEASE_ERR = {
  NOT_FOUND: { code: 'ticket_not_found', http: 404 },
  NOT_CLAIMANT: { code: 'not_claimant', http: 403 },
  TICKET_TERMINAL: { code: 'ticket_terminal', http: 403 },
  HOST_MISMATCH: { code: 'host_mismatch', http: 403 },
  BOARD_UNREACHABLE: { code: 'board_unreachable', http: 503 },
  UNKNOWN_HANDLE: { code: 'unknown_handle', http: 404 },
  ALREADY_TERMINAL: { code: 'release_terminal', http: 409 },
};

// Re-release cap (M-11): at most N re-releases per (release_id, op_id).
export const RE_RELEASE_CAP = 3;
