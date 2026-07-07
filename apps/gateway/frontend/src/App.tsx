import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppHeader, FreshnessStamp, HaltBand, KillMirror, NavRail, PrincipalRef } from './components/ds';
import type { NavItem } from './components/ds';
import { GatewayProvider, useGateway } from './state/GatewayProvider';
import { Monitor } from './screens/Monitor';
import { RunDetail } from './screens/RunDetail';
import { Audit } from './screens/Audit';
import { KillSwitch } from './screens/KillSwitch';
import { Catalog } from './screens/Catalog';
import { Sandbox } from './screens/Sandbox';
import { Orphans } from './screens/Orphans';
import type { Nav, Route } from './screens/nav';

/* Gateway — the execution monitor shell + router (ported from the CMDB kit's
   App.tsx; same Instrument-dark chrome). NavRail (6 rail entries) + AppHeader
   with a READ-ONLY KillMirror (the Gateway hosts NO kill actuator — it renders
   the L2-CONFIRMED truth and deep-links the trigger to MC/auth). The header
   SYSTEM STATE carries the suite kill level PLUS the Gateway's own L2 figure
   (`L2 · epoch NNNN seen · N in-flight`) with a Freshness stamp. There is NO
   engage button anywhere in this app — that is a printed constitutional fact. */
function Shell() {
  const { posture, offline } = useGateway();
  const [route, setRoute] = useState<Route>('monitor');
  const [collapsed, setCollapsed] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const haltLinkRef = useRef<HTMLAnchorElement>(null);

  // The Shift+Esc global halt-focus override (§5.3): every posture-aware app
  // renders it. The Gateway hosts no actuator, so it FOCUSES (never fires) the
  // header's deep-link to MC's actuator rather than a local button.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && e.shiftKey) {
        e.preventDefault();
        haltLinkRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nav: Nav = useMemo(
    () => ({
      goto: (r) => setRoute(r),
      openRun: (id) => { setRunId(id); setRoute('run'); },
    }),
    [],
  );

  const items: NavItem[] = [
    { group: 'Execution' },
    { key: 'monitor', label: 'Monitor', icon: '⧗', active: route === 'monitor' || route === 'run', onClick: () => setRoute('monitor') },
    { key: 'audit', label: 'Audit', icon: '⛓', active: route === 'audit', onClick: () => setRoute('audit') },
    { key: 'killswitch', label: 'Kill-switch', icon: '▮', active: route === 'killswitch', onClick: () => setRoute('killswitch') },
    { group: 'Registry' },
    { key: 'catalog', label: 'Catalog', icon: '▦', active: route === 'catalog', onClick: () => setRoute('catalog') },
    { key: 'sandbox', label: 'Sandbox', icon: '◎', active: route === 'sandbox', onClick: () => setRoute('sandbox') },
    { key: 'orphans', label: 'Orphans', icon: '◔', active: route === 'orphans', onClick: () => setRoute('orphans') },
  ];

  let screen: ReactNode;
  switch (route) {
    case 'monitor': screen = <Monitor nav={nav} />; break;
    case 'run': screen = <RunDetail runId={runId ?? 'R-01HX9QK4M2'} nav={nav} />; break;
    case 'audit': screen = <Audit />; break;
    case 'killswitch': screen = <KillSwitch />; break;
    case 'catalog': screen = <Catalog />; break;
    case 'sandbox': screen = <Sandbox />; break;
    case 'orphans': screen = <Orphans />; break;
    default: screen = <Monitor nav={nav} />;
  }

  const killEngaged = posture.kill_level !== 'G0';
  // The read-only band renders when the suite kill level > G0 OR the Gateway
  // can't confirm its own halt liveness (safe-stopped). No actuator here.
  const showBand = killEngaged || offline || posture.own_stale;

  const systemState = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
        ● {posture.kill_level} · L2 · epoch {posture.epoch_seen} seen · {posture.in_flight_runs} in-flight
      </span>
      {offline || posture.own_stale
        ? <FreshnessStamp state="halt" reading="SAFE-STOPPED" />
        : <FreshnessStamp age={posture.auth_epoch_age ? `⟳ ${posture.auth_epoch_age}` : 'live'} />}
    </span>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
      <NavRail current="gateway" posture={killEngaged ? 'kill' : (offline || posture.own_stale) ? 'safe-stop' : 'nominal'} items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#/mc/agents" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppHeader appName="gateway" identity="the hands — the only component that executes on hosts" stateLabel="System state" systemState={systemState}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <PrincipalRef kind="operator" id={posture.operator ?? 'operator:ada'} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: posture.step_up_fresh ? 'var(--state-green)' : 'var(--state-amber-ink)' }}>
              {posture.step_up_fresh ? '🔑 fresh' : '🔑 stale'}
            </span>
            <KillMirror engaged={killEngaged} href="#/mc/agents" />
            {/* The one halt affordance the Gateway has: a DEEP-LINK to MC's
                actuator (§7.3). NOT an engage button — there is none here. */}
            <a ref={haltLinkRef} href="#/mc/agents" title="Shift+Esc focuses this" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--signal-cyan)', textDecoration: 'none', border: '1px solid var(--border-strong)', borderRadius: 6, padding: '6px 10px' }}>
              [ Halt console → ]
            </a>
          </span>
        </AppHeader>

        {/* Read-only HaltBand mirror — pinned under the header on every screen
            when engaged / safe-stopped. The Gateway hosts no kill actuator (§5.3). */}
        {showBand ? (
          <HaltBand
            mode={killEngaged ? 'kill' : 'safe-stop'}
            level={posture.kill_level === 'G2' ? 'G2' : 'G1'}
            readOnly
            confirmed={posture.confirmed}
            pending={posture.pending}
            draining={posture.draining}
            drainingDetail={posture.draining_detail}
            reviewHref="#/mc/agents"
            reviewLabel="Halt console (MC)"
            message={
              killEngaged
                ? 'Suite kill engaged. The Gateway refuses all new dispatch + new Vault redemptions; in-flight runs cancel at the next safe task boundary.'
                : 'Gateway posture source unreachable — cannot confirm own halt liveness, so it failed closed. This is the safety system working; figures below read CANNOT-CONFIRM rather than a fabricated green.'
            }
          />
        ) : null}

        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <GatewayProvider>
      <Shell />
    </GatewayProvider>
  );
}
