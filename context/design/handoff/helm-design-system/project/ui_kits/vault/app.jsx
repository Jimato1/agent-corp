/* Helm — Vault · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { NavRail, AppHeader, KillMirror, FreshnessStamp } = H;
  const SC = window.VTScreens;

  function App() {
    const [route, setRoute] = React.useState('secrets');
    const [collapsed, setCollapsed] = React.useState(false);

    const items = [
      { group: 'Custody' },
      { key: 'secrets', label: 'Secrets', icon: '⛨', active: route === 'secrets', onClick: () => setRoute('secrets') },
      { key: 'hosts', label: 'Hosts', icon: '⊞', active: route === 'hosts', onClick: () => setRoute('hosts') },
      { key: 'releases', label: 'Releases', icon: '⇥', active: route === 'releases', onClick: () => setRoute('releases') },
      { group: 'Truth' },
      { key: 'audit', label: 'Audit', icon: '▤', active: route === 'audit', onClick: () => setRoute('audit') },
      { key: 'status', label: 'Status / DR', icon: '◉', active: route === 'status', onClick: () => setRoute('status') },
      { key: 'change', label: 'Change control', icon: '⚖', active: route === 'change', onClick: () => setRoute('change') },
    ];

    let screen = null;
    if (route === 'secrets') screen = <SC.Secrets />;
    else if (route === 'hosts') screen = <SC.Hosts />;
    else if (route === 'releases') screen = <SC.Releases />;
    else if (route === 'audit') screen = <SC.Audit />;
    else if (route === 'status') screen = <SC.Status />;
    else if (route === 'change') screen = <SC.ChangeControl />;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="vault" posture="nominal" items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="Vault" identity="secrets custody & Gateway-only redemption" systemState={<FreshnessStamp age="G0 · polled 1.2s" />}>
            <KillMirror engaged={false} href="#" />
          </AppHeader>
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
        </div>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
