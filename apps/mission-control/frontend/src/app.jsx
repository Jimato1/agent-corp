// Shell + path router for the cockpit. Path-based (not hash) so the FROZEN deep-links
// /review/<ticket_id>, /ticket/<ticket_id> (302→/review), and /agents/<sub> resolve directly
// (the backend SPA fallback serves index.html for these; DESIGN_SYSTEM §7.1/§7.3, contract §2).
import H from '/src/helm.js';
import { api } from '/src/api.js';
import { KillLevelPill, HaltNotConfirmed } from '/src/parts.jsx';
import * as SC from '/src/screens.jsx';

const { NavRail, AppHeader, StopActuator, FreshnessStamp } = H;

function parse(pathname) {
  const p = decodeURIComponent(pathname).replace(/\/+$/, '') || '/';
  if (p === '/') return { route: 'overview' };
  const seg = p.split('/').filter(Boolean);
  if (seg[0] === 'agents') return seg[1] ? { route: 'agent', sub: seg.slice(1).join('/') } : { route: 'agents' };
  if (seg[0] === 'review') return seg[1] ? { route: 'review-item', ticket: seg.slice(1).join('/') } : { route: 'review' };
  if (['halt', 'budgets', 'edge', 'anchors', 'settings'].includes(seg[0])) return { route: seg[0] };
  return { route: 'overview' };
}

export function App() {
  const [loc, setLoc] = React.useState(parse(window.location.pathname));
  const [collapsed, setCollapsed] = React.useState(false);
  const [posture, setPosture] = React.useState({ level: 'G0', epoch: null, as_of_seconds: 0, error: false });
  const [reason, setReason] = React.useState('');
  const [haltFail, setHaltFail] = React.useState(null);
  const [postureNonce, setPostureNonce] = React.useState(0);

  const nav = (path) => { window.history.pushState({}, '', path); setLoc(parse(path)); };

  React.useEffect(() => {
    const onPop = () => setLoc(parse(window.location.pathname));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Poll the kill mirror for the header SYSTEM STATE readout (always-loud posture).
  React.useEffect(() => {
    let alive = true;
    const tick = () => api.posture().then(
      (d) => alive && setPosture({ ...d, error: false }),
      () => alive && setPosture((s) => ({ ...s, error: true })),
    );
    tick();
    const iv = setInterval(tick, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, [postureNonce]);

  // The kill actuation: CALL auth via the relay. Any non-2xx/timeout ⇒ HALT NOT CONFIRMED takeover.
  const engage = async (level) => {
    try {
      await api.raiseKill(level, reason || 'operator engaged from cockpit');
      setPostureNonce((n) => n + 1);      // re-read the mirror from auth; MC stores no halted boolean
    } catch (e) {
      setHaltFail(e.body?.safe_stopped_url || '#');
    }
  };

  const ctx = {
    goto: (r) => nav(r === 'overview' ? '/' : '/' + r),
    openAgent: (a) => nav('/agents/' + encodeURIComponent(a.sub)),
    openItem: (q) => nav('/review/' + encodeURIComponent(q.ticket_id)),
    engage, reason, setReason, postureNonce,
  };

  const badge = null;
  const items = [
    { group: 'Cockpit' },
    { key: 'overview', label: 'Home', icon: '⌂', active: loc.route === 'overview', onClick: () => ctx.goto('overview') },
    { key: 'agents', label: 'Agents', icon: '⬡', active: loc.route === 'agents' || loc.route === 'agent', onClick: () => ctx.goto('agents') },
    { key: 'review', label: 'Review', icon: '◈', badge, active: loc.route === 'review' || loc.route === 'review-item', onClick: () => ctx.goto('review') },
    { key: 'halt', label: 'Halt', icon: '▮▮', active: loc.route === 'halt', onClick: () => ctx.goto('halt') },
    { group: 'Guardrails' },
    { key: 'budgets', label: 'Budget', icon: '▤', active: loc.route === 'budgets', onClick: () => ctx.goto('budgets') },
    { key: 'edge', label: 'Edge', icon: '~', active: loc.route === 'edge', onClick: () => ctx.goto('edge') },
    { key: 'anchors', label: 'Anchors', icon: '⛓', active: loc.route === 'anchors', onClick: () => ctx.goto('anchors') },
    { group: 'Config' },
    { key: 'settings', label: 'Settings', icon: '⚙', active: loc.route === 'settings', onClick: () => ctx.goto('settings') },
  ];

  const engaged = posture.level && posture.level !== 'G0' && posture.level !== 'UNKNOWN';
  let screen = null;
  if (loc.route === 'overview') screen = <SC.Overview ctx={ctx} />;
  else if (loc.route === 'agents') screen = <SC.LiveAgentView ctx={ctx} />;
  else if (loc.route === 'agent') screen = <SC.AgentDrillIn agent={{ sub: loc.sub }} ctx={ctx} />;
  else if (loc.route === 'review') screen = <SC.ReviewQueue ctx={ctx} />;
  else if (loc.route === 'review-item') screen = <SC.ReviewItem item={{ ticket_id: loc.ticket }} ctx={ctx} />;
  else if (loc.route === 'halt') screen = <SC.HaltControl ctx={ctx} />;
  else if (loc.route === 'budgets') screen = <SC.Budgets ctx={ctx} />;
  else if (loc.route === 'edge') screen = <SC.Edge ctx={ctx} />;
  else if (loc.route === 'anchors') screen = <SC.Anchors ctx={ctx} />;
  else if (loc.route === 'settings') screen = <SC.Settings ctx={ctx} />;

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
      <NavRail current="mission-control" posture={engaged ? 'kill' : 'nominal'} items={items} collapsed={collapsed}
        onToggle={setCollapsed} postureHref="#" onPostureClick={(e) => { e.preventDefault(); ctx.goto('halt'); }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppHeader appName="Mission Control" identity="operator cockpit"
          systemState={<>
            <KillLevelPill level={posture.level || 'G0'} size="sm" />
            <FreshnessStamp state={posture.error ? 'halt' : 'live'} reading={posture.error ? 'STALE-UNKNOWN' : undefined}
              age={`epoch ${posture.epoch ?? '—'} · ${posture.as_of_seconds ?? 0}s · auth`} />
          </>}>
          <StopActuator level="G1" engaged={engaged} onEngage={() => engage('G1')} label="Engage freeze" />
        </AppHeader>
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
      </div>
      {haltFail ? <HaltNotConfirmed url={haltFail} onDismiss={() => setHaltFail(null)} /> : null}
    </div>
  );
}
