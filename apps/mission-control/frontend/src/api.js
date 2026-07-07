// api.js — the single BFF client. Same-origin fetch with credentials (the proxy forward-auth
// injects operator identity; the SPA never handles a token). The Pattern R (recoverable, red) vs
// Pattern D (dependency-down → gold safe-stop) split is driven by `isDependency` — a network
// failure / 0 / 502 / 503 / 504 is a DEGRADED dependency, not a red error (DESIGN_SYSTEM §5.4).
import React from '/src/react-global.js';

const BASE = '/api';

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'error', body = null } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.body = body;
    this.isDependency = status === 0 || status === 502 || status === 503 || status === 504;
  }
}

async function req(method, path, body) {
  let resp;
  try {
    resp = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new ApiError(String(e), { status: 0, code: 'network' });
  }
  let data = null;
  try { data = await resp.json(); } catch { /* empty body */ }
  if (!resp.ok) {
    const err = (data && data.error) || {};
    throw new ApiError(err.message || resp.statusText, { status: resp.status, code: err.code || 'error', body: data });
  }
  return data;
}

export const api = {
  get: (p) => req('GET', p),
  post: (p, b) => req('POST', p, b),
  fleet: () => req('GET', '/fleet'),
  agent: (sub) => req('GET', '/agents/' + encodeURIComponent(sub)),
  queue: (filter) => req('GET', '/queue' + (filter && filter !== 'all' ? `?filter=${filter}` : '')),
  queueItem: (tid) => req('GET', '/queue/' + encodeURIComponent(tid)),
  posture: () => req('GET', '/posture'),
  budgets: () => req('GET', '/budgets'),
  edge: () => req('GET', '/edge'),
  anchors: () => req('GET', '/anchors'),
  params: () => req('GET', '/params'),
  audit: () => req('GET', '/audit'),
  raiseKill: (level, reason) => req('POST', '/killswitch/raise', { level, reason }),
  saveParam: (key, value, diff_hash) => req('POST', '/params', { key, value, diff_hash }),
  addSilence: (scope_key, ttl_seconds) => req('POST', '/silences', { scope_key, ttl_seconds }),
  changeWip: (global_cap, direction) => req('POST', '/wip', { global_cap, direction }),
};

// A tiny fetch hook with the honest loading / Pattern-R / Pattern-D triad.
export function useFetch(fn, deps = []) {
  const [state, setState] = React.useState({ data: null, error: null, loading: true });
  const [nonce, setNonce] = React.useState(0);
  React.useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    fn().then(
      (data) => alive && setState({ data, error: null, loading: false }),
      (error) => alive && setState({ data: null, error, loading: false }),
    );
    return () => { alive = false; };
  }, [...deps, nonce]);
  return { ...state, reload: () => setNonce((n) => n + 1) };
}

// Live multiplex — /api/events. Advisory; every consumer still renders Freshness/degrade honestly.
export function subscribeEvents(onEvent) {
  const es = new EventSource(BASE + '/events');
  for (const ev of ['liveness', 'queue', 'posture', 'budget', 'anomaly']) {
    es.addEventListener(ev, (m) => {
      try { onEvent(ev, JSON.parse(m.data)); } catch { onEvent(ev, {}); }
    });
  }
  return () => es.close();
}
