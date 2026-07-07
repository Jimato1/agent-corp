// app.jsx — shell + hash router (UI_SPEC §3). Instrument archetype (dark-only, compact). The Vault
// hosts NO kill actuator (only MC + auth do): the HaltBand here is a READ-ONLY mirror, its level read
// from auth via the polled /manage/status. NO SSE — the shell polls status for the kill level, the
// dependency posture, and its freshness stamp. Pattern R (red, operator error) vs Pattern D (gold,
// dependency down / safe-stopped) are kept strictly distinct; seal-unknown / audit-down / engine-
// sealed / auth-unreachable are all Pattern D gold, never red.
//
// Routes (hash): #/secrets · #/hosts · #/audit · #/releases · #/status · #/change
import { H, mono, classifyError, fmtAge, freshnessState } from './ui.jsx';
import { vault } from './api.js';
import { Secrets } from './screens/secrets.jsx';
import { Hosts } from './screens/hosts.jsx';
import { Audit } from './screens/audit.jsx';
import { Releases } from './screens/releases.jsx';
import { Status } from './screens/status.jsx';
import { ChangeControl } from './screens/change.jsx';
const { NavRail, AppHeader, KillMirror, HaltBand, FreshnessStamp, PrincipalRef, StatusPill } = H;

function useHashRoute() {
  const [hash, setHash] = React.useState(window.location.hash || '#/secrets');
  React.useEffect(() => {
    const on = () => setHash(window.location.hash || '#/secrets');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const parts = hash.replace(/^#\//, '').split('/').filter(Boolean);
  return { parts, go: (h) => { window.location.hash = h; } };
}

// The shell's own status poll — separate from each screen's, so the header stays live even if a
// screen is mid-error. Returns kill level, degraded posture, operator identity, and freshness.
function useShellStatus() {
  const [s, setS] = React.useState({ status: null, error: null, fetchedAt: 0 });
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    let alive = true;
    const run = () => vault.status()
      .then((d) => { if (alive) setS({ status: d, error: null, fetchedAt: Date.now() }); })
      .catch((e) => { if (alive) setS((p) => ({ status: p.status, error: e, fetchedAt: p.fetchedAt })); });
    run();
    const t = setInterval(run, 5000);
    return () => { alive = false; clearInterval(t); };
  }, []);
  React.useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return { ...s, ageMs: s.fetchedAt ? now - s.fetchedAt : 0 };
}

export function App() {
  const { parts, go } = useHashRoute();
  const shell = useShellStatus();
  const st = shell.status || {};
  const errPattern = shell.error ? classifyError(shell.error) : null;

  const kill = st.kill || 'G0';
  const killed = kill !== 'G0';
  const killLevel = kill === 'G2' ? 'G2' : 'G1';
  // Pattern D at the shell level: the status poll itself failed on a dependency, OR status reports a
  // degraded posture inline (engine sealed / an audit sink down). Either raises the read-only safe-stop.
  const depDown = errPattern === 'D';
  const sessionEnded = errPattern === 'session';
  const inlineDegraded = !!(st.engine_sealed || st.audit_sink_down || st.degraded);
  const safeStop = depDown || inlineDegraded;
  const stale = freshnessState(shell.ageMs) === 'stale';

  const posture = killed ? 'kill' : (safeStop ? 'safe-stop' : 'nominal');
  const operator = st.operator || (typeof localStorage !== 'undefined' && (localStorage.getItem('vault_dev') || '').split(/\s+/)[0]) || 'operator:—';
  const stepUpFresh = st.step_up_fresh !== false; // default optimistic; auth is source of truth

  const section = parts[0] || 'secrets';
  const items = [
    { group: 'Custody' },
    { key: 'secrets', label: 'Secrets', icon: '⛨', active: section === 'secrets', onClick: () => go('#/secrets') },
    { key: 'hosts', label: 'Hosts', icon: '⊞', active: section === 'hosts', onClick: () => go('#/hosts') },
    { key: 'releases', label: 'Releases', icon: '⇥', active: section === 'releases', onClick: () => go('#/releases') },
    { group: 'Truth' },
    { key: 'audit', label: 'Audit', icon: '▤', active: section === 'audit', onClick: () => go('#/audit') },
    { key: 'status', label: 'Status / DR', icon: '◉', active: section === 'status', onClick: () => go('#/status') },
    { key: 'change', label: 'Change control', icon: '⚖', active: section === 'change', onClick: () => go('#/change') },
  ];

  let screen;
  if (sessionEnded) {
    screen = (
      <H.ErrorState
        pattern="D"
        title="Session ended — re-authenticate"
        detail="Your operator session was dropped by auth (revocation / expiry). The console never silently freezes; re-authenticate to continue."
        action={<H.Button tone="primary" onClick={() => window.location.reload()}>Re-authenticate</H.Button>}
      />
    );
  } else {
    const shellCtx = { killed, killLevel, safeStop };
    if (section === 'hosts') screen = <Hosts shell={shellCtx} />;
    else if (section === 'releases') screen = <Releases shell={shellCtx} />;
    else if (section === 'audit') screen = <Audit shell={shellCtx} />;
    else if (section === 'status') screen = <Status shell={shellCtx} />;
    else if (section === 'change') screen = <ChangeControl shell={shellCtx} />;
    else screen = <Secrets shell={shellCtx} />;
  }

  // Center SYSTEM STATE zone: kill level mirrored from auth + freshness; degraded posture if down.
  const systemState = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {killed
        ? <StatusPill tone="halt" glyph="▮▮" size="sm">{kill} freeze</StatusPill>
        : safeStop
          ? <StatusPill tone="halt" glyph="⛊" size="sm">safe-stopped</StatusPill>
          : <StatusPill tone="neutral" glyph="●" size="sm">G0 normal</StatusPill>}
      <FreshnessStamp age={`kill · ${fmtAge(shell.ageMs)} (auth)`} state={stale || safeStop ? (safeStop ? 'halt' : 'stale') : 'live'} reading={safeStop ? 'kill level unconfirmed — dependency down' : (stale ? 'poll stalled' : undefined)} />
    </div>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
      <NavRail current="vault" posture={posture} items={items} postureHref="#/status" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppHeader appName="Vault" identity="secrets custody & Gateway-only redemption" systemState={systemState}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <PrincipalRef kind="operator" id={operator} />
            <span style={{ ...mono, fontSize: 11, color: stepUpFresh ? 'var(--state-green)' : 'var(--state-amber-ink)' }}>🔑 {stepUpFresh ? 'fresh' : 'stale'}</span>
            <KillMirror engaged={killed} href="#/status" label={killed ? `Kill engaged (${kill})` : 'Nominal'} />
          </div>
        </AppHeader>
        {/* Read-only halt mirror — the Vault NEVER actuates the kill (HaltBand readOnly always). */}
        {killed
          ? <HaltBand mode="kill" level={killLevel} readOnly reviewHref="#/status"
              message="Kill engaged upstream (auth/MC). New redemption and new secret issuance are refused suite-wide; issued certs live to their TTL. This band is a read-only mirror — actuate at MC/auth."
              stillTrue={['no plaintext is exposed by this console', 'the ledger and status reads stay live', 'toward-less-action (revoke) is still allowed']} />
          : safeStop
            ? <HaltBand mode="safe-stop" readOnly reviewHref="#/status"
                message={`SYSTEM SAFE-STOPPED · ${depDown ? 'vault status/dependency unreachable' : (st.engine_sealed ? 'vault engine sealed' : 'off-box audit sink down')} — failed closed (D-16a), not an outage.`}
                stillTrue={['no plaintext exposed', 'existing certs valid to their TTL', 'local audit chain intact; writes queue/deny until it clears']} />
            : null}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
      </div>
    </div>
  );
}
