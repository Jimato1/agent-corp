import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AppHeader, FreshnessStamp, HaltBand, KillMirror, NavRail, PrincipalRef } from './components/ds';
import type { NavItem } from './components/ds';
import { CmdbProvider, useCmdb } from './state/CmdbProvider';
import { Fleet } from './screens/Fleet';
import { Host } from './screens/Host';
import { Tiers } from './screens/Tiers';
import { Tasks } from './screens/Tasks';
import { Catalog } from './screens/Catalog';
import { Sandbox } from './screens/Sandbox';
import { Discovery } from './screens/Discovery';
import { DryRun } from './screens/DryRun';
import { History } from './screens/History';
import { Decisions } from './screens/Decisions';
import { Escalations } from './screens/Escalations';
import { BreakGlass } from './screens/BreakGlass';
import { SafeStoppedBand } from './screens/common';
import type { Nav, Route } from './screens/nav';

/* CMDB — shell + router (a faithful port of the CMDB kit's app.jsx).
   NavRail (10 rail entries + the danger-tinted Break-glass) + AppHeader with a
   READ-ONLY KillMirror (CMDB is NOT in the kill chain — it hosts no actuator; the
   mirror reflects suite posture and deep-links to MC/auth). The header carries
   SYSTEM STATE (posture HEAD + freshness), the operator PrincipalRef, and the
   load-bearing 🔑 fresh / 🔑 stale step-up cue. Routing is local state. */
function Shell() {
  const { posture, offline } = useCmdb();
  const [route, setRoute] = useState<Route>('fleet');
  const [collapsed, setCollapsed] = useState(false);
  const [hostId, setHostId] = useState<string | null>(null);

  const nav: Nav = useMemo(
    () => ({
      goto: (r) => setRoute(r),
      openHost: (id) => { setHostId(id); setRoute('host'); },
    }),
    [],
  );

  const items: NavItem[] = [
    { group: 'Inventory' },
    { key: 'fleet', label: 'Fleet', icon: '▤', active: route === 'fleet' || route === 'host', onClick: () => setRoute('fleet') },
    { key: 'tiers', label: 'Tiers', icon: '⬢', active: route === 'tiers', onClick: () => setRoute('tiers') },
    { key: 'tasks', label: 'Tasks', icon: '☰', active: route === 'tasks', onClick: () => setRoute('tasks') },
    { key: 'catalog', label: 'Catalog', icon: '▦', active: route === 'catalog', onClick: () => setRoute('catalog') },
    { key: 'sandbox', label: 'Sandbox', icon: '◎', active: route === 'sandbox', onClick: () => setRoute('sandbox') },
    { key: 'discovery', label: 'Discovery', icon: '⊹', active: route === 'discovery', onClick: () => setRoute('discovery') },
    { group: 'Policy truth' },
    { key: 'dryrun', label: 'Dry-run', icon: '⊨', active: route === 'dryrun', onClick: () => setRoute('dryrun') },
    { key: 'history', label: 'History', icon: '⟲', active: route === 'history', onClick: () => setRoute('history') },
    { key: 'decisions', label: 'Decisions', icon: '⊞', active: route === 'decisions', onClick: () => setRoute('decisions') },
    { key: 'escalations', label: 'Escalations', icon: '⚑', active: route === 'escalations', onClick: () => setRoute('escalations') },
    { group: 'Emergency' },
    { key: 'breakglass', label: 'Break-glass', icon: '⚠', active: route === 'breakglass', onClick: () => setRoute('breakglass') },
  ];

  let screen: ReactNode;
  switch (route) {
    case 'fleet': screen = <Fleet nav={nav} />; break;
    case 'host': screen = <Host hostId={hostId ?? 'nas-01'} nav={nav} />; break;
    case 'tiers': screen = <Tiers />; break;
    case 'tasks': screen = <Tasks />; break;
    case 'catalog': screen = <Catalog />; break;
    case 'sandbox': screen = <Sandbox />; break;
    case 'discovery': screen = <Discovery />; break;
    case 'dryrun': screen = <DryRun />; break;
    case 'history': screen = <History />; break;
    case 'decisions': screen = <Decisions />; break;
    case 'escalations': screen = <Escalations />; break;
    case 'breakglass': screen = <BreakGlass />; break;
    default: screen = <Fleet nav={nav} />;
  }

  const killEngaged = posture.kill_level !== 'G0';
  // The read-only HaltBand mirror renders when the suite kill level > G0 or a
  // CMDB dependency is down (posture unreachable). CMDB hosts no actuator, so
  // the band is read-only and its Review link deep-links to MC/auth.
  const showMirror = killEngaged || offline;

  const systemState = (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
        ● {posture.kill_level} · policy HEAD {posture.policy_head}
      </span>
      {offline ? <FreshnessStamp state="stale" reading="POSTURE STALE" /> : <FreshnessStamp age={posture.policy_age ? `⟳ ${posture.policy_age}` : 'live'} />}
    </span>
  );

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
      <NavRail current="cmdb" posture={killEngaged ? 'kill' : offline ? 'safe-stop' : 'nominal'} items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppHeader appName="CMDB" identity="policy brain — may this host be touched now?" stateLabel="System state" systemState={systemState}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <PrincipalRef kind="operator" id={posture.operator ?? 'operator:ada'} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: posture.step_up_fresh ? 'var(--state-green)' : 'var(--state-amber-ink)' }}>
              {posture.step_up_fresh ? '🔑 fresh' : '🔑 stale'}
            </span>
            <KillMirror engaged={killEngaged} href="#" />
          </span>
        </AppHeader>

        {/* Read-only HaltBand mirror — CMDB hosts no kill actuator (§5.3). */}
        {showMirror ? (
          <HaltBand
            mode={killEngaged ? 'kill' : 'safe-stop'}
            level={posture.kill_level === 'G2' ? 'G2' : 'G1'}
            readOnly
            confirmed={posture.confirmed}
            pending={posture.pending}
            draining={posture.draining}
            reviewHref="#"
            reviewLabel="Review in Mission Control"
            message={
              killEngaged
                ? 'Suite kill engaged. CMDB refuses gate-weakening confirms while a suite freeze covers approve/execute; benign reads continue.'
                : 'CMDB posture source (auth/MC) unreachable — failed closed. This is the safety system working; the console shows demo/last-known state below.'
            }
          />
        ) : null}

        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          {/* Global degraded band: CMDB's own gate cannot serve → SAFE-STOPPED
              before any content (UI_SPEC §3). */}
          {posture.gate_degraded ? (
            <div style={{ marginBottom: 16 }}>
              <SafeStoppedBand reason={posture.gate_degraded_reason ?? 'policy snapshot unverified'} />
            </div>
          ) : null}
          {screen}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <CmdbProvider>
      <Shell />
    </CmdbProvider>
  );
}
