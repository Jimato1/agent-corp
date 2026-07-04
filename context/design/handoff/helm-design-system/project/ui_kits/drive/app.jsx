/* Helm — Drive · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { NavRail, AppHeader, KillMirror, FreshnessStamp } = H;
  const SC = window.DRScreens;

  function App() {
    const [route, setRoute] = React.useState('browser');
    const [collapsed, setCollapsed] = React.useState(false);
    const [upload, setUpload] = React.useState(false);
    const ctx = { goto: (r) => setRoute(r), openDetail: () => setRoute('detail'), openUpload: () => setUpload(true), closeUpload: () => setUpload(false) };

    const items = [
      { group: 'Store' },
      { key: 'browser', label: 'Ticket browser', icon: '▤', active: route === 'browser', onClick: () => setRoute('browser') },
      { key: 'detail', label: 'Artifact detail', icon: '▦', active: route === 'detail', onClick: () => setRoute('detail') },
      { group: 'Admin' },
      { key: 'admin', label: 'Admin console', icon: '⚙', active: route === 'admin', onClick: () => setRoute('admin') },
    ];

    let screen = null, framed = false;
    if (route === 'browser') screen = <SC.Browser ctx={ctx} />;
    else if (route === 'detail') { screen = <SC.Detail ctx={ctx} />; framed = true; }
    else if (route === 'admin') screen = <SC.Admin ctx={ctx} />;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="drive" posture="nominal" items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="Drive" identity="artifact store" systemState={<FreshnessStamp age="G0 · polled 8s" />}>
            <KillMirror engaged={false} href="#" />
          </AppHeader>
          {framed ? <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{screen}</main>
            : <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>}
        </div>
        {upload ? <SC.Upload ctx={ctx} /> : null}
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
