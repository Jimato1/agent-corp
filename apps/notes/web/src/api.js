// api.js — the REST client. The UI is a SIBLING of the MCP surface over the SAME core API
// (BUILD_SPEC "REST API"; PLAN §9.1) — there is no UI-private store. Every call here maps 1:1 to an
// endpoint the MCP adapter also calls. Dev auth: the already-built server, run with
// NOTES_DEV_UNSAFE_NO_AUTH=true, derives the principal from X-Dev-Sub / X-Dev-Scopes headers; in
// production a real OAuth2 Bearer is sent instead. Vite proxies /api,/healthz,/mcp,/.well-known → :8080.

const DEV_SUB = 'operator:ada';
const DEV_SCOPES = 'notes:read notes:search notes:append notes:write';

function authHeaders() {
  // Production: a bearer token stashed by the auth flow wins.
  const bearer = (typeof localStorage !== 'undefined' && localStorage.getItem('notes_bearer')) || '';
  if (bearer) return { Authorization: `Bearer ${bearer}` };
  // Dev/test bypass (server must run with NOTES_DEV_UNSAFE_NO_AUTH=true). Never reached in prod
  // because the server ignores these headers unless dev-unsafe mode is explicitly enabled.
  const sub = (typeof localStorage !== 'undefined' && localStorage.getItem('notes_dev_sub')) || DEV_SUB;
  const scopes = (typeof localStorage !== 'undefined' && localStorage.getItem('notes_dev_scopes')) || DEV_SCOPES;
  return { 'X-Dev-Sub': sub, 'X-Dev-Scopes': scopes };
}

// Structured business errors (BUILD_SPEC "Business error codes"): the server returns { code, message }
// with a mapped HTTP status. We surface `code` verbatim so screens can pick Pattern-R (red) vs
// Pattern-D (gold) honestly — a dependency outage (FENCE_UNVERIFIABLE 503) is NEVER a red error.
export class ApiError extends Error {
  constructor({ code, message, status, body }) {
    super(message || code || `HTTP ${status}`);
    this.name = 'ApiError';
    this.code = code || null;
    this.status = status;
    this.body = body || null;
  }
}

// Codes the UI treats as fail-closed / dependency-degraded → Pattern D (GOLD), not Pattern R (red).
export const PATTERN_D_CODES = new Set(['FENCE_UNVERIFIABLE']);

async function req(method, path, { body, headers, signal } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...authHeaders(),
        ...(headers || {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (e) {
    // Network / transport failure = the core service is unreachable → dependency-degraded (Pattern D).
    throw new ApiError({ code: 'SERVICE_UNREACHABLE', message: String(e && e.message ? e.message : e), status: 0 });
  }

  const ct = res.headers.get('content-type') || '';
  const payload = ct.includes('application/json') ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const code = payload && typeof payload === 'object' ? payload.code || payload.error : undefined;
    const message = payload && typeof payload === 'object' ? payload.message : String(payload || '');
    throw new ApiError({ code, message, status: res.status, body: payload });
  }
  return payload;
}

// Small ULID-ish op_id for idempotent mutations (the server dedupes on op_id across index rebuilds).
export function newOpId() {
  const rnd = () => Math.random().toString(36).slice(2, 10);
  return `op-web-${Date.now().toString(36)}-${rnd()}${rnd()}`;
}

export const api = {
  // --- health (honesty inputs for Pattern-D banners) ---
  health: () => req('GET', '/healthz'),
  oauthMeta: () => req('GET', '/.well-known/oauth-protected-resource'),

  // --- reads (notes:read / notes:search) ---
  // S1 corpus + search: empty query = a recency listing (server returns updated-DESC); a query = FTS.
  search: ({ query = '', type, tag, ticket_id, limit = 25 } = {}, opts) => {
    const p = new URLSearchParams();
    if (query) p.set('query', query);
    if (type) p.set('type', type);
    if (tag) p.set('tag', tag);
    if (ticket_id) p.set('ticket_id', ticket_id);
    p.set('limit', String(limit));
    return req('GET', `/api/search?${p.toString()}`, opts).then((r) => (r && r.results) || []);
  },
  getNote: (id, opts) => req('GET', `/api/notes/${encodeURIComponent(id)}`, opts),
  getBacklinks: (id, opts) => req('GET', `/api/notes/${encodeURIComponent(id)}/backlinks`, opts).then((r) => (r && r.backlinks) || []),
  getTaint: (id, opts) => req('GET', `/api/notes/${encodeURIComponent(id)}/taint`, opts),

  // --- writes (notes:append — the agent grant; the UI exposes create + link) ---
  createNote: (payload) => req('POST', '/api/notes', { body: { op_id: newOpId(), ...payload } }),
  appendNote: (id, payload) => req('POST', `/api/notes/${encodeURIComponent(id)}/append`, { body: { op_id: newOpId(), ...payload } }),
  linkNotes: (id, to_id) => req('POST', `/api/notes/${encodeURIComponent(id)}/links`, { body: { op_id: newOpId(), to_id } }),

  // --- overwrite (notes:write — operator/maintenance only; the S2 Save path) ---
  // CAS: expected_hash MUST match the content_hash the editor opened with, or the server returns
  // PRECONDITION_HASH (409) — the stale-buffer Pattern-R banner.
  updateNote: (id, { content, expected_hash }) =>
    req('PUT', `/api/notes/${encodeURIComponent(id)}`, { body: { op_id: newOpId(), content, expected_hash } }),

  reindex: () => req('POST', '/api/admin/reindex', { body: {} }),
};

// ---- Cross-app read (NOT Notes-owned state): MC's canonical review queue (S5) ----------------
// UI_SPEC S5 / mc-chat-review-resolve.md §3: read live under the operator's OWN browser session,
// advisory / MC-observed, NEVER authoritative for a gate. This targets MISSION CONTROL's origin, not
// the Notes API — so it is genuinely cross-app. Default base `/mc` (proxy path-prefix); override with
// localStorage `notes_mc_base`. A missing mc:read scope → 401/403 (Pattern-R "not scoped for MC"); MC
// unreachable → transport/non-JSON (Pattern-D "showing last-known"). Notes never clears a review.
function mcBase() {
  return (typeof localStorage !== 'undefined' && localStorage.getItem('notes_mc_base')) || '/mc';
}
export const mc = {
  reviewQueue: async (opts) => {
    const path = `${mcBase()}/api/queue`;
    const r = await req('GET', path, opts);
    // If MC is absent, a dev/proxy fallback may 200 with HTML (a string) — that is NOT an all-clear.
    // Treat any non-JSON-object payload as unreachable so S5 shows Pattern-D, never a false "cleared".
    if (r == null || typeof r === 'string') {
      throw new ApiError({ code: 'MC_UNREACHABLE', message: 'Mission Control did not return a queue', status: 0 });
    }
    // Tolerant to MC's envelope shape (mc-chat-review-resolve.md): items | queue | bare array.
    return (r.items || r.queue) || (Array.isArray(r) ? r : []);
  },
};

// Deep-link scheme consumed by Notes (mc-chat-review-resolve.md §2). Notes leaves for MC to act.
export function mcReviewHref(ticketId) {
  return `/mc/review/${encodeURIComponent(ticketId)}`;
}
export function mcAgentHref(sub) {
  return `/mc/agents/${encodeURIComponent(sub)}`;
}

// Map a backend binary taint level (clean | host_originated) → a Helm TierBadge tier + label.
// host_originated is adversarial input to the models → the striped-amber UNTRUSTED treatment that
// blocks the auto-approve lane (ARCH §12). `clean` is single-source, NOT green (green = external
// verifier only; the false-green rule). Taint is display-of-truth — the UI renders it, never authors it.
export function taintTier(level) {
  if (level === 'host_originated' || level === 'untrusted') return { tier: 'untrusted', label: 'UNTRUSTED' };
  return { tier: 'single', label: 'clean' };
}
