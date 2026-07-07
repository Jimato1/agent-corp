/* Helm — Notes · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.NT_DATA;
  const { NavRail, AppHeader, KillMirror } = H;
  const SC = window.NTScreens;

  function App() {
    const [route, setRoute] = React.useState('corpus');
    const [collapsed, setCollapsed] = React.useState(false);
    const [note, setNote] = React.useState(null);
    const [mode, setMode] = React.useState('paper');

    const openNote = (n) => { setNote(n); setRoute(n.type === 'deliberation' ? 'deliberation' : 'editor'); };
    const ctx = { mode, setMode, goto: (r) => { setRoute(r); }, openNote };

    const items = [
      { group: 'Library' },
      { key: 'corpus', label: 'Corpus', icon: '▤', active: route === 'corpus' || route === 'editor' || route === 'deliberation', onClick: () => ctx.goto('corpus') },
      { key: 'graph', label: 'Graph', icon: '◇', active: route === 'graph', onClick: () => ctx.goto('graph') },
      { key: 'review', label: 'Review', icon: '◈', active: route === 'review', onClick: () => ctx.goto('review') },
      { key: 'history', label: 'History', icon: '⛓', active: route === 'history', onClick: () => { setNote(D.byId['N-01J1QZ']); setRoute('history'); } },
    ];

    let screen = null, framed = false;
    if (route === 'corpus') screen = <SC.Corpus ctx={ctx} />;
    else if (route === 'editor' && note) { screen = <SC.Editor note={note} ctx={ctx} />; framed = true; }
    else if (route === 'deliberation' && note) { screen = <SC.Deliberation note={note} ctx={ctx} />; framed = true; }
    else if (route === 'graph') screen = <SC.Graph ctx={ctx} />;
    else if (route === 'review') screen = <SC.Review />;
    else if (route === 'history' && note) screen = <SC.History note={note} />;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="notes" posture="nominal" items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="Notes" identity="external memory & work product">
            <KillMirror engaged={false} href="#" />
          </AppHeader>
          {framed ? <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>{screen}</div>
            : <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>}
        </div>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
