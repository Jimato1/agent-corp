/* Helm — Library · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.LB_DATA;
  const { NavRail, AppHeader, KillMirror, FreshnessStamp } = H;
  const SC = window.LBScreens;

  function App() {
    const [route, setRoute] = React.useState('search');
    const [collapsed, setCollapsed] = React.useState(false);
    const [doc, setDoc] = React.useState(D.DOCS[0]);
    const ctx = { setDoc, doc, goto: (r) => setRoute(r), openDoc: (d) => { setDoc(d); setRoute('inspector'); } };

    const items = [
      { group: 'Shelf' },
      { key: 'search', label: 'Search', icon: '⌕', active: route === 'search', onClick: () => setRoute('search') },
      { key: 'inspector', label: 'Doc inspector', icon: '▤', active: route === 'inspector', onClick: () => setRoute('inspector') },
      { group: 'Admin · operator only' },
      { key: 'ingestion', label: 'Ingestion review', icon: '◈', active: route === 'ingestion', onClick: () => setRoute('ingestion') },
      { key: 'spotaudit', label: 'Spot-audit', icon: '◎', active: route === 'spotaudit', onClick: () => setRoute('spotaudit') },
      { key: 'collections', label: 'Collections', icon: '▦', active: route === 'collections', onClick: () => setRoute('collections') },
      { key: 'index', label: 'Index status', icon: '⚙', active: route === 'index', onClick: () => setRoute('index') },
    ];

    let screen = null, framed = false;
    if (route === 'search') { screen = <SC.Search ctx={ctx} />; framed = true; }
    else if (route === 'inspector') screen = <SC.Inspector doc={doc} ctx={ctx} />;
    else if (route === 'ingestion') screen = <SC.Ingestion />;
    else if (route === 'spotaudit') screen = <SC.SpotAudit />;
    else if (route === 'collections') screen = <SC.Collections />;
    else if (route === 'index') screen = <SC.IndexStatus />;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="library" posture="nominal" items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="Library" identity="the corporate reference shelf" systemState={<FreshnessStamp age="G0 · 0.4s" />}>
            <KillMirror engaged={false} href="#" />
          </AppHeader>
          {framed ? <main style={{ flex: 1, minHeight: 0, padding: 24, display: 'flex', flexDirection: 'column' }}>{screen}</main>
            : <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>}
        </div>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
