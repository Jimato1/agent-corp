// ui.jsx — small screen-level scaffolding shared by S1–S6: a page Head, a data-fetch hook, and the
// HONEST error split (Pattern R red = your action didn't apply / recoverable; Pattern D gold = a
// dependency failed closed — the safety system working). A dependency outage is NEVER rendered red.
import { H, mono, eyebrow } from './common.jsx';
import { ApiError, PATTERN_D_CODES } from '../api.js';

const { useState, useEffect, useCallback } = window.React;

export function Head({ crumb, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        {crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

// A two-option segmented toggle (paper/dark view, audit/provenance mode).
export function SegToggle({ options, value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>
      {options.map((m) => (
        <button key={m} onClick={() => onChange(m)}
          style={{ padding: '5px 11px', border: 0, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, textTransform: 'capitalize',
            background: value === m ? 'var(--signal-cyan-wash)' : 'transparent', color: value === m ? 'var(--signal-cyan-ink)' : 'var(--text-muted)' }}>
          {m}
        </button>
      ))}
    </div>
  );
}

// Classify any thrown error into the R/D split + copy. Dependency-degraded (Pattern D, GOLD):
// FENCE_UNVERIFIABLE (Board unreachable, fail-closed), transport/service unreachable, 503. Everything
// else operator-recoverable (Pattern R, RED): 404 not-found, 400 validation, 401/403 scope, 409 CAS.
export function classifyError(err) {
  const code = err && err.code;
  const status = (err && err.status) || 0;
  const depDown = code && PATTERN_D_CODES.has(code);
  const transport = code === 'SERVICE_UNREACHABLE' || status === 0 || status === 503;
  if (depDown || transport) {
    return {
      pattern: 'D',
      title: 'Safe-stopped — a dependency is unavailable',
      body: code === 'FENCE_UNVERIFIABLE'
        ? "Can't confirm the ticket lease — the Board is unreachable, so ticket-bound writes fail closed to protect the record. The canonical markdown on disk and in git is intact."
        : "The core service or a dependency is unreachable. This is a rebuildable/read surface degrading safely — treat any figures as UNVERIFIED, not wrong.",
      detail: code || `HTTP ${status}`,
    };
  }
  if (status === 401 || status === 403) {
    return { pattern: 'R', title: 'Not authorized for this view', body: err.message || 'Your session is not scoped for this surface.', detail: code || `HTTP ${status}` };
  }
  return { pattern: 'R', title: "That didn't apply", body: (err && err.message) || 'Request failed.', detail: (err && (err.code || `HTTP ${status}`)) || 'error' };
}

// Render a thrown error via the shared ErrorState in the correct pattern.
export function ErrorView({ error, action }) {
  const { ErrorState } = H;
  const c = classifyError(error);
  return <ErrorState pattern={c.pattern} title={c.title} detail={c.detail} action={action}>{c.body}</ErrorState>;
}

// A minimal data hook: runs `fn` on mount + when any dep changes; exposes { data, error, loading, reload }.
export function useAsync(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.resolve()
      .then(fn)
      .then((data) => { if (alive) setState({ data, error: null, loading: false }); })
      .catch((error) => { if (alive) setState({ data: null, error: error instanceof ApiError ? error : new ApiError({ message: String(error), status: 0 }), loading: false }); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps || []);
  useEffect(run, [run]);
  const reload = useCallback(() => { run(); }, [run]);
  return { ...state, reload };
}

export { eyebrow };
