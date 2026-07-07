// app.jsx — shell + hash router + one SSE feed (UI_SPEC §3). Instrument archetype (dark-only). The
// HaltBand is a READ-ONLY mirror — the Board hosts no kill actuator (only MC + auth do). Routes:
//   #/            kanban        #/t/<id>          ticket detail
//   #/approvals   queue         #/approvals/<id>  decision surface
//   #/console/<tab>             management console
import { H, mono } from './ui.jsx';
import { board } from './api.js';
import { useEvents } from './useEvents.jsx';
import { Kanban } from './screens/kanban.jsx';
import { TicketDetail } from './screens/ticket.jsx';
import { Approvals } from './screens/approvals.jsx';
import { Console } from './screens/console.jsx';
const { NavRail, AppHeader, KillMirror, HaltBand, StatusPill } = H;

function useHashRoute() {
  const [hash, setHash] = React.useState(window.location.hash || '#/');
  React.useEffect(() => {
    const on = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const parts = hash.replace(/^#\//, '').split('/').filter(Boolean);
  return { hash, parts, go: (h) => { window.location.hash = h; } };
}

export function App() {
  const { parts, go } = useHashRoute();
  const [bump, setBump] = React.useState(0);
  const [kill, setKill] = React.useState({ level: 'G0', epoch: 0 });
  const [staleStream, setStaleStream] = React.useState(false);

  const refresh = () => setBump((b) => b + 1);
  useEvents((type) => { if (type === 'stale') setStaleStream(true); else { setStaleStream(false); refresh(); } });
  React.useEffect(() => {
    const load = () => board.kill().then(setKill).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [bump]);

  const killed = kill.level !== 'G0';
  const section = parts[0] || 'board';

  let screen;
  if (section === 't' && parts[1]) {
    screen = <TicketDetail id={parts[1]} bump={bump} onBack={() => go('#/')} onOpenApproval={(id) => go(`#/approvals/${id}`)} />;
  } else if (section === 'approvals') {
    screen = <Approvals selectedId={parts[1] || null} killed={killed} bump={bump} onOpen={(id) => go(id ? `#/approvals/${id}` : '#/approvals')} />;
  } else if (section === 'console') {
    screen = <Console tab={parts[1] || 'wip'} bump={bump} onTab={(k) => go(`#/console/${k}`)} />;
  } else {
    screen = <Kanban bump={bump} onOpen={(id) => go(`#/t/${id}`)} />;
  }

  const items = [
    { group: 'Coordination' },
    { key: 'board', label: 'Board', icon: '▦', active: section === 'board' || section === 't', onClick: () => go('#/') },
    { key: 'approvals', label: 'Approvals', icon: '▲', active: section === 'approvals', onClick: () => go('#/approvals') },
    { group: 'Control' },
    { key: 'console', label: 'Console', icon: '⚙', active: section === 'console', onClick: () => go('#/console/wip') },
    { key: 'audit', label: 'Audit', icon: '⛓', active: section === 'console' && parts[1] === 'audit', onClick: () => go('#/console/audit') },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
      <NavRail current="board" posture={killed ? 'kill' : 'nominal'} items={items} postureHref="https://mc.local/agents" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppHeader appName="Board" identity="coordination spine"
          systemState={killed
            ? <StatusPill tone="halt" glyph="▮▮" size="sm">{kill.level} freeze · epoch {kill.epoch}</StatusPill>
            : <StatusPill tone="neutral" glyph="●" size="sm">G0 normal · epoch {kill.epoch}</StatusPill>}>
          <KillMirror engaged={killed} href="https://mc.local/agents" label={killed ? `Kill engaged (${kill.level})` : 'Nominal'} />
        </AppHeader>
        {killed ? <HaltBand level={kill.level} href="https://mc.local/agents" /> : null}
        {staleStream ? <div style={{ background: 'var(--state-amber-wash)', color: 'var(--state-amber-ink)', ...mono, fontSize: 11, padding: '4px 24px' }}>⛊ live feed stale — showing last-known (fail-closed). Reconnecting…</div> : null}
        <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
      </div>
    </div>
  );
}
