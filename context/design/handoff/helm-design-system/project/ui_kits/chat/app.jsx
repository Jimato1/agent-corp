/* Helm — Chat · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { NavRail, AppHeader, KillMirror, FreshnessStamp } = H;
  const SC = window.CHScreens;

  function App() {
    const [route, setRoute] = React.useState('feed');
    const [collapsed, setCollapsed] = React.useState(false);
    const [note, setNote] = React.useState(null);
    const ctx = { goto: (r) => setRoute(r), openNote: (n) => { setNote(n); setRoute('note'); } };

    const items = [
      { group: 'Doorbell' },
      { key: 'feed', label: 'Feed', icon: '◈', badge: 3, active: route === 'feed' || route === 'note', onClick: () => setRoute('feed') },
      { key: 'broadcast', label: 'Broadcast', icon: '📣', active: route === 'broadcast', onClick: () => setRoute('broadcast') },
      { key: 'health', label: 'Health', icon: '⟳', active: route === 'health', onClick: () => setRoute('health') },
    ];

    let screen = null;
    if (route === 'feed') screen = <SC.Feed ctx={ctx} />;
    else if (route === 'note' && note) screen = <SC.NoteDetail note={note} ctx={ctx} />;
    else if (route === 'broadcast') screen = <SC.Broadcast />;
    else if (route === 'health') screen = <SC.Health />;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="chat" posture="nominal" items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader appName="Chat" identity="notifications & broadcast" systemState={<FreshnessStamp age="nominal · 0.4s" />}>
            <KillMirror engaged={false} href="#" />
          </AppHeader>
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
        </div>
      </div>
    );
  }
  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
