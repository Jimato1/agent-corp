// ui.jsx — the ONE Helm binding + shared render helpers for the Vault operator console.
// Every shared entity renders through its canonical Helm component; nothing is redrawn (UI_SPEC §11).
// Instrument archetype, dark-only, compact. NO SSE — poll + FreshnessStamp everywhere (UI_SPEC §1).
export const H = window.HelmDesignSystem_f4cb26;
if (!H) throw new Error('window.HelmDesignSystem_f4cb26 missing — /helm/_ds_bundle.js must load first.');

// Shared style atoms (identical to the reference vault ui-kit vt-parts.jsx).
export const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
export const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
export const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

// ── Error classification: Pattern R (red, operator's own fixable error) vs Pattern D (halt-gold,
// a dependency is down / safe-stopped) — kept STRICTLY distinct (UI_SPEC §1, §11). seal-unknown,
// audit-sink-down, engine-sealed, Board/auth-unreachable are ALL Pattern D gold, never red.
// A dropped operator session (auth revocation) is neither — it is a re-authenticate state.
const DEP_CODES = new Set([
  'DEP_UNAVAILABLE', 'SIGNAL_UNAVAILABLE',
  'engine_sealed', 'ENGINE_SEALED',
  'audit_unavailable', 'AUDIT_UNAVAILABLE',
  'board_unreachable', 'BOARD_UNREACHABLE',
  'auth_unreachable', 'AUTH_UNREACHABLE',
  'cmdb_unreachable', 'CMDB_UNREACHABLE',
]);
export function classifyError(e) {
  if (!e) return 'R';
  if (e.status === 401 || e.code === 'session_expired' || e.code === 'UNAUTHENTICATED') return 'session';
  if (e.status === 503 || e.status === 0 || DEP_CODES.has(e.code)) return 'D';
  return 'R';
}

// ── Freshness helpers (UI_SPEC §4.9 / §1). Age is measured from the last successful poll; a stalled
// poll degrades to `stale` (never a silently-frozen "live" figure). Safety signals that cannot be
// confirmed are forced to `halt` (gold) by the caller — the false-green prohibition.
export function fmtAge(ms) {
  const s = Math.max(0, ms || 0) / 1000;
  if (s < 60) return `${s.toFixed(1)}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}
export function freshnessState(ageMs, intervalMs = 5000) {
  return ageMs > intervalMs * 2 ? 'stale' : 'live';
}

// ── usePoll — the no-SSE data engine. Fetches now, then every `intervalMs`; a 1s ticker keeps the
// freshness age advancing between polls. `reload()` forces an immediate refetch (used after writes).
export function usePoll(fetcher, { intervalMs = 5000, deps = [] } = {}) {
  const [state, setState] = React.useState({ data: null, error: null, loading: true, fetchedAt: 0 });
  const [bump, setBump] = React.useState(0);
  const [now, setNow] = React.useState(Date.now());
  const fetcherRef = React.useRef(fetcher);
  fetcherRef.current = fetcher;

  React.useEffect(() => {
    let alive = true;
    const run = () => fetcherRef.current()
      .then((d) => { if (alive) setState({ data: d, error: null, loading: false, fetchedAt: Date.now() }); })
      .catch((e) => { if (alive) setState((s) => ({ data: s.data, error: e, loading: false, fetchedAt: s.fetchedAt })); });
    run();
    const t = setInterval(run, intervalMs);
    return () => { alive = false; clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bump, intervalMs, ...deps]);

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const ageMs = state.fetchedAt ? now - state.fetchedAt : 0;
  return { ...state, ageMs, reload: () => setBump((b) => b + 1) };
}

// ── Small shared chrome ──────────────────────────────────────────────────────────────────────

export function Head({ title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '84ch' }}>{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

// Poll freshness stamp for a screen header ("⟳ polled · as-of 1.2s").
export function PollStamp({ ageMs, intervalMs = 5000, label = 'polled' }) {
  const st = freshnessState(ageMs, intervalMs);
  return <H.FreshnessStamp age={`${label} · ${fmtAge(ageMs)}`} state={st} reading={st === 'stale' ? 'figures may be behind — poll stalled' : undefined} />;
}

// Table loading skeleton (never a spinner — UI_SPEC §5.4 honest defaults).
export function TableSkeleton({ rows = 6 }) {
  return <div style={{ ...panel, padding: 8 }}><H.Skeleton variant="table" rows={rows} /></div>;
}

// The screen-level error surface. Pattern D → gold safe-stop (dependency down); Pattern R → red;
// session → re-authenticate. `stillTrue` spells out what remains true under a safe-stop (§5.4).
export function ScreenError({ error, title, stillTrue, action, onRetry }) {
  const pattern = classifyError(error);
  if (pattern === 'session') {
    return (
      <H.ErrorState
        pattern="D"
        title="Session ended — re-authenticate"
        detail="Your operator session was dropped by auth (revocation / expiry). Re-authenticate to continue; the console never silently freezes."
        action={<H.Button tone="primary" onClick={() => window.location.reload()}>Re-authenticate</H.Button>}
      />
    );
  }
  const detail = (error && (error.code || (error.status ? `HTTP ${error.status}` : error.message))) || 'unknown error';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <H.ErrorState
        pattern={pattern}
        title={title || (pattern === 'D' ? 'Dependency safe-stopped' : 'Request rejected')}
        detail={pattern === 'D' ? `${detail} — this fails closed (safe-stopped), not an outage to panic over.` : detail}
        action={action || (onRetry ? <H.Button tone="secondary" onClick={onRetry}>Retry</H.Button> : undefined)}
      />
      {pattern === 'D' && stillTrue && stillTrue.length
        ? <div style={{ ...panel, borderColor: 'var(--halt-gold)', background: 'var(--halt-gold-wash)', padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ ...eyebrow, color: 'var(--halt-gold-ink)' }}>Still true</div>
            {stillTrue.map((t, i) => <div key={i} style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>· {t}</div>)}
          </div>
        : null}
    </div>
  );
}

// A gold in-screen SAFE-STOPPED banner used when the LIST renders (local read succeeded) but a
// dependency is degraded so WRITE affordances must show the safe-stop posture (UI_SPEC §4.3 Pattern D).
export function SafeStopBanner({ dependency, stillTrue = [], todo }) {
  return (
    <div style={{ ...panel, borderColor: 'var(--halt-gold)', background: 'var(--halt-gold-wash)', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span aria-hidden="true" style={{ color: 'var(--halt-gold-ink)' }}>⛊</span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--halt-gold-ink)' }}>SYSTEM SAFE-STOPPED · {dependency}</span>
      </div>
      {stillTrue.map((t, i) => <div key={i} style={{ ...mono, fontSize: 11, color: 'var(--text-secondary)' }}>STILL TRUE: {t}</div>)}
      {todo ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>DO: {todo}</div> : null}
    </div>
  );
}

// Inspect a payload for a server-signalled degraded posture without failing the whole read.
// Backends may flag engine-sealed / sink-down inline (list still renders, writes gate). We read a
// few conventional optional fields defensively — absence means healthy.
export function degradedPosture(data) {
  if (!data || typeof data !== 'object') return null;
  const d = data.degraded || data.posture;
  if (data.engine_sealed || d === 'engine_sealed') return { dependency: 'vault engine sealed / unreachable' };
  if (data.audit_sink_down || d === 'audit_sink_down') return { dependency: 'off-box WORM audit sink unreachable' };
  if (typeof d === 'object' && d) return d;
  if (typeof d === 'string') return { dependency: d };
  return null;
}
