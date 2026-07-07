// api.js — the browser-direct sibling of the near-empty MCP surface, over the ONE vault wrapper
// store + engine (UI_SPEC §10). The operator's extra power here is SCOPE (`vault:manage`), not a
// second data path: these are the same handles / releases / audit rows the four MCP tools and the
// `creds`-network redeem pipeline read and write. Every endpoint is operator-only, human-kind-gated,
// wrapper-side token-validated on every call (never header-trust).
//
// NO SSE: every read is polled and each response carries an `as-of` / freshness stamp (UI_SPEC §1).
//
// Same-origin behind the proxy (operator identity via forward-auth). In local dev-unsafe mode, set
//   localStorage 'vault_dev' = 'op:ada vault:manage'
// to inject x-dev-* headers (mirrors the board_dev pattern).

function devHeaders() {
  const dev = typeof localStorage !== 'undefined' && localStorage.getItem('vault_dev');
  if (!dev) return {};
  const [sub, ...scopes] = dev.split(/\s+/);
  return { 'x-dev-sub': sub, 'x-dev-kind': 'human', 'x-dev-scopes': scopes.join(' ') };
}

// Pattern R vs Pattern D classification lives on the error object the caller throws.
// A dependency-down / safe-stop condition (503, engine sealed, an audit sink down, Board/auth
// unreachable) is Pattern D (halt-gold) — NEVER a red error. An operator's own fixable mistake
// (bad filter, duplicate name, stale diff-hash) is Pattern R (red). See ui.jsx classifyError.
export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(path, {
      method,
      credentials: 'include',
      headers: { 'content-type': 'application/json', ...devHeaders() },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (netErr) {
    // A transport failure to our own backend is a dependency outage → Pattern D.
    const e = new Error('vault backend unreachable');
    e.status = 0;
    e.code = 'DEP_UNAVAILABLE';
    e.cause = netErr;
    throw e;
  }
  const text = await res.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { json = { message: text }; }
  if (!res.ok) {
    const e = new Error(json.message || json.code || json.error || res.statusText);
    e.status = res.status;
    e.code = json.code || json.error;
    e.body = json;
    throw e;
  }
  return json;
}

const enc = encodeURIComponent;
function qs(params) {
  const p = Object.entries(params || {}).filter(([, v]) => v != null && v !== '');
  return p.length ? '?' + p.map(([k, v]) => `${enc(k)}=${enc(v)}`).join('&') : '';
}

export const vault = {
  // — Secrets Manager (§4 / §10) — metadata only; NO value path exists anywhere —
  handles: () => api('/manage/handles'),
  handle: (handle) => api(`/manage/handles/${enc(handle)}`),
  writeKv: (payload, op_id) => api('/manage/kv', { method: 'POST', body: { ...payload, op_id } }),
  rotate: (handle, op_id) => api(`/manage/handles/${enc(handle)}/rotate`, { method: 'POST', body: { op_id } }),

  // — Host Onboarding (§5 / §10) — stage is powerless; apply is the full ceremony —
  hosts: () => api('/manage/hosts'),
  registerHost: (payload, op_id) => api('/manage/hosts', { method: 'POST', body: { ...payload, op_id } }),
  stageSignRole: (id, payload, op_id) => api(`/manage/hosts/${enc(id)}/signrole/stage`, { method: 'POST', body: { ...payload, op_id } }),
  applySignRole: (id, payload, op_id) => api(`/manage/hosts/${enc(id)}/signrole/apply`, { method: 'POST', body: { ...payload, op_id } }),

  // — Access Audit (§6 / §10) — append-only ledger; verify is read-only, never false-green —
  audit: (filters) => api(`/manage/audit${qs(filters)}`),
  exfil: () => api('/manage/audit/exfil'),
  chain: () => api('/manage/audit/chain'),
  verifyChain: (op_id) => api('/manage/audit/chain/verify', { method: 'POST', body: { op_id } }),

  // — Releases (§7 / §10) — powerless release shadows; revoke = DangerAction (light + carve-out) —
  releases: (filters) => api(`/manage/releases${qs(filters)}`),
  revokeRelease: (release_id, op_id) => api(`/manage/releases/${enc(release_id)}/revoke`, { method: 'POST', body: { op_id } }),

  // — Status / DR (§8 / §10) — crown-jewels readout; also the shell's kill-level + posture source —
  status: () => api('/manage/status'),

  // — Change Control (§9 / §10) — the single gate-weakening path; apply is diff-hash-bound —
  changeDiff: (edit) => api(`/manage/change-control/diff${qs({ edit })}`),
  applyChange: (payload, op_id) => api('/manage/change-control/apply', { method: 'POST', body: { ...payload, op_id } }),

  healthz: () => api('/healthz'),
};

// Idempotency key for every operator mutation (parallels board.newOpId).
export function newOpId() {
  return 'ui-' + Math.random().toString(36).slice(2) + '-' + Date.now();
}
