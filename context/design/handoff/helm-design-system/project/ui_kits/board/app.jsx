/* Helm — Board · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.BD_DATA;
  const { NavRail, AppHeader, KillMirror, FreshnessStamp, StatusPill } = H;
  const SC = window.BDScreens;

  function App() {
    const [route, setRoute] = React.useState('board');
    const [posture, setPosture] = React.useState('nominal');
    const [collapsed, setCollapsed] = React.useState(false);
    const [ticket, setTicket] = React.useState(null);
    const [approvalSel, setApprovalSel] = React.useState(null);
    const [consoleTab, setConsoleTab] = React.useState('wip');

    const ctx = {
      posture, approvalSel, consoleTab,
      goto: (r) => { setTicket(null); setApprovalSel(null); setRoute(r); },
      openTicket: (t) => { setTicket(t); setRoute('ticket'); },
      openApproval: (t) => { setApprovalSel(t); setRoute('approvals'); },
    };

    const awaiting = D.TICKETS.filter((t) => t.state === 'awaiting_approval').length;
    const items = [
      { group: 'Coordination' },
      { key: 'board', label: 'Board', icon: '▦', active: route === 'board' || route === 'ticket', onClick: () => ctx.goto('board') },
      { key: 'approvals', label: 'Approvals', icon: '▲', badge: awaiting, active: route === 'approvals', onClick: () => { setApprovalSel(null); setRoute('approvals'); } },
      { key: 'ceremonies', label: 'Ceremonies', icon: '◎', active: route === 'ticket' && ticket && ticket.ceremony, onClick: () => ctx.openTicket(D.byId['T-000097']) },
      { group: 'Control' },
      { key: 'console', label: 'Console', icon: '⚙', active: route === 'console', onClick: () => { setConsoleTab('wip'); ctx.goto('console'); } },
      { key: 'audit', label: 'Audit', icon: '⛓', active: route === 'audit', onClick: () => { setConsoleTab('audit'); setTicket(null); setApprovalSel(null); setRoute('audit'); } },
    ];

    let screen = null;
    if (route === 'board') screen = <SC.Kanban ctx={ctx} />;
    else if (route === 'ticket' && ticket) screen = <SC.TicketDetail t={ticket} ctx={ctx} />;
    else if (route === 'approvals') screen = <SC.Approvals key={approvalSel ? approvalSel.id : 'q'} ctx={ctx} />;
    else if (route === 'console') screen = <SC.Console key={'c-' + consoleTab} ctx={ctx} />;
    else if (route === 'audit') screen = <SC.Console key={'a-' + consoleTab} ctx={{ ...ctx, consoleTab: 'audit' }} />;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="board" posture={posture === 'kill' ? 'kill' : 'nominal'} items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader
            appName="Board"
            identity="coordination spine"
            systemState={posture === 'kill'
              ? <StatusPill tone="halt" glyph="▮▮" size="sm">G1 freeze</StatusPill>
              : <StatusPill tone="neutral" glyph="●" size="sm">G0 normal</StatusPill>}
          >
            <KillMirror engaged={posture === 'kill'} href="#" label={posture === 'kill' ? 'Kill engaged' : 'Nominal'} />
          </AppHeader>
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
        </div>
        {/* demo posture toggle */}
        <button onClick={() => setPosture((p) => p === 'kill' ? 'nominal' : 'kill')}
          style={{ position: 'fixed', bottom: 14, right: 14, zIndex: 2000, height: 28, padding: '0 12px', borderRadius: 999, border: '1px solid var(--border-strong)', background: 'var(--surface-raised)', color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 11, cursor: 'pointer' }}>
          {posture === 'kill' ? '↺ clear kill (demo)' : '▮▮ simulate kill (demo)'}
        </button>
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
