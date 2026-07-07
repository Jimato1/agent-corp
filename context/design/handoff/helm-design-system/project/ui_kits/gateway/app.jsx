/* Helm — Gateway · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { NavRail, AppHeader, KillMirror, StatusPill } = H;
  const SC = window.GWScreens;

  function App() {
    const [route, setRoute] = React.useState('monitor');
    const [collapsed, setCollapsed] = React.useState(false);
    const [run, setRun] = React.useState(null);
    const [posture, setPosture] = React.useState('nominal');
    const ctx = { posture, goto: (r) => setRoute(r), openRun: (r) => { setRun(r); setRoute('run'); } };

    const items = [
      { group: 'The hands' },
      { key: 'monitor', label: 'Monitor', icon: '⧗', active: route === 'monitor' || route === 'run', onClick: () => setRoute('monitor') },
      { key: 'audit', label: 'Audit', icon: '⛓', active: route === 'audit', onClick: () => setRoute('audit') },
      { key: 'kill', label: 'Kill-switch', icon: '▮▮', active: route === 'kill', onClick: () => setRoute('kill') },
      { group: 'Write paths' },
      { key: 'catalog', label: 'Catalog', icon: '▤', active: route === 'catalog', onClick: () => setRoute('catalog') },
      { key: 'sandbox', label: 'Sandbox', icon: '◎', active: route === 'sandbox', onClick: () => setRoute('sandbox') },
      { key: 'orphans', label: 'Orphans', icon: '⚠', active: route === 'orphans', onClick: () => setRoute('orphans') },
    ];

    let screen = null;
    if (route === 'monitor') screen = <SC.Monitor ctx={ctx} />;
    else if (route === 'run' && run) screen = <SC.RunDetail run={run} ctx={ctx} />;
    else if (route === 'audit') screen = <SC.Audit />;
    else if (route === 'kill') screen = <SC.KillStatus ctx={ctx} />;
    else if (route === 'catalog') screen = <SC.Catalog />;
    else if (route === 'sandbox') screen = <SC.Sandbox />;
    else if (route === 'orphans') screen = <SC.Orphans ctx={ctx} />;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="gateway" posture={posture === 'kill' ? 'kill' : 'nominal'} items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" onPostureClick={(e) => { e.preventDefault(); setRoute('kill'); }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="Gateway" identity="the hands — the only component that executes on hosts"
            systemState={posture === 'kill' ? <StatusPill tone="halt" glyph="▮▮" size="sm">G1 freeze</StatusPill> : <StatusPill tone="neutral" glyph="●" size="sm">G0 normal</StatusPill>}>
            <KillMirror engaged={posture === 'kill'} href="#" label={posture === 'kill' ? 'Kill engaged' : 'Nominal'} />
          </AppHeader>
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
        </div>
        <button onClick={() => setPosture((p) => p === 'kill' ? 'nominal' : 'kill')} style={{ position: 'fixed', bottom: 14, right: 14, zIndex: 2000, height: 28, padding: '0 12px', borderRadius: 999, border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer' }}>{posture === 'kill' ? '↺ clear kill (demo)' : '▮▮ simulate kill (demo)'}</button>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
