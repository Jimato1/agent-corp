/* Helm — CMDB · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { NavRail, AppHeader, KillMirror, PrincipalRef } = H;
  const SC = window.CMScreens;

  function App() {
    const [route, setRoute] = React.useState('fleet');
    const [collapsed, setCollapsed] = React.useState(false);
    const ctx = { goto: setRoute };

    const items = [
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
      { key: 'breakglass', label: 'Break-glass', icon: '⚠', danger: true, active: route === 'breakglass', onClick: () => setRoute('breakglass') },
    ];

    const map = { fleet: <SC.Fleet ctx={ctx} />, host: <SC.Host ctx={ctx} />, tiers: <SC.Tiers />, tasks: <SC.Tasks />, catalog: <SC.Catalog />, sandbox: <SC.Sandbox />, discovery: <SC.Discovery />, dryrun: <SC.DryRun />, history: <SC.History />, decisions: <SC.Decisions />, escalations: <SC.Escalations />, breakglass: <SC.BreakGlass /> };

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="cmdb" posture="nominal" items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="CMDB" identity="policy plane — may this host be touched right now?"
            systemState={<span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>● G0 · policy HEAD 9f3a2c ⟳ 0.4s</span>}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}><PrincipalRef kind="operator" id="operator:ada" /><span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--state-green)' }}>🔑 fresh</span><KillMirror engaged={false} href="#" /></span>
          </AppHeader>
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{map[route]}</main>
        </div>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
