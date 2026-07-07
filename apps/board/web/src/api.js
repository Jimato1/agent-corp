// api.js — the browser-direct sibling of the MCP surface over the ONE board HTTP API (PLAN §9).
// Same-origin behind the proxy (operator identity via forward-auth). In local dev-unsafe mode, set
// localStorage 'board_dev' = 'op:ada board:read board:approve board:admin ...' to inject x-dev-* headers.

function devHeaders() {
  const dev = typeof localStorage !== 'undefined' && localStorage.getItem('board_dev');
  if (!dev) return {};
  const [sub, ...scopes] = dev.split(/\s+/);
  return { 'x-dev-sub': sub, 'x-dev-kind': 'human', 'x-dev-scopes': scopes.join(' ') };
}

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: { 'content-type': 'application/json', ...devHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) { const e = new Error(json.message || json.code || res.statusText); e.status = res.status; e.code = json.code || json.error; throw e; }
  return json;
}

export const board = {
  queue: (status) => api(`/api/queue?status=${encodeURIComponent(status)}&limit=100`),
  ticket: (id) => api(`/api/tickets/${id}`),
  approval: (id) => api(`/api/approvals/${id}`),
  huddle: (id) => api(`/api/tickets/${id}/huddle`),
  wip: () => api('/facts/wip'),
  kill: () => api('/facts/kill'),
  escalations: () => api('/facts/escalations'),
  violations: () => api('/facts/violations'),
  holds: () => api('/facts/holds'),
  lineage: (id) => api(`/facts/lineage/${id}`),
  approve: (id, op_id) => api(`/api/tickets/${id}/approve`, { method: 'POST', body: { op_id } }),
  reject: (id, op_id) => api(`/api/tickets/${id}/reject`, { method: 'POST', body: { op_id } }),
  revoke: (id, op_id) => api(`/api/tickets/${id}/revoke`, { method: 'POST', body: { op_id } }),
  operatorTransition: (id, to_status, op_id) => api(`/api/tickets/${id}/operator-transition`, { method: 'POST', body: { to_status, op_id } }),
  setWip: (scope, subject, cap) => api('/api/policy/wip', { method: 'PUT', body: { scope, subject, cap } }),
  setLineage: (max_depth) => api('/api/policy/lineage', { method: 'PUT', body: { max_depth } }),
  clearQuarantine: (id, host_id, op_id) => api(`/api/tickets/${id}/clear-quarantine`, { method: 'POST', body: { host_id, op_id } }),
  clearHold: (id) => api(`/api/tickets/${id}/clear-hold`, { method: 'POST', body: {} }),
};

export function newOpId() {
  return 'ui-' + Math.random().toString(36).slice(2) + '-' + Date.now();
}
