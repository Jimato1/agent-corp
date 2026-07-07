/* Helm — Mission Control · shell + router.
   Reads window.MCScreens (screens), window.MCParts (HaltNotConfirmed), and the
   design-system bundle. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.MC_DATA;
  const { NavRail, AppHeader, StopActuator, FreshnessStamp } = H;
  const { KillLevelPill, HaltNotConfirmed } = window.MCParts;
  const SC = window.MCScreens;

  function App() {
    const [route, setRoute] = React.useState('overview');
    const [posture, setPosture] = React.useState('nominal');
    const [level, setLevel] = React.useState('G1');
    const [collapsed, setCollapsed] = React.useState(false);
    const [agent, setAgent] = React.useState(null);
    const [item, setItem] = React.useState(null);
    const [haltFail, setHaltFail] = React.useState(false);

    const ctx = {
      posture, level,
      goto: (r) => { setAgent(null); setItem(null); setRoute(r); },
      openAgent: (a) => { setAgent(a); setRoute('agent'); },
      openItem: (q) => { setItem(q); setRoute('review-item'); },
      onEngage: (lvl) => { setLevel(lvl); setPosture('kill'); },
      onLift: () => setPosture('nominal'),
      onHaltFail: () => setHaltFail(true),
    };

    const items = [
      { group: 'Cockpit' },
      { key: 'overview', label: 'Home', icon: '⌂', active: route === 'overview', onClick: () => ctx.goto('overview') },
      { key: 'agents', label: 'Agents', icon: '⬡', active: route === 'agents' || route === 'agent', onClick: () => ctx.goto('agents') },
      { key: 'review', label: 'Review', icon: '◈', badge: D.counts.awaiting + D.counts.needsReview + D.counts.escalated, active: route === 'review' || route === 'review-item', onClick: () => ctx.goto('review') },
      { key: 'halt', label: 'Halt', icon: '▮▮', active: route === 'halt', onClick: () => ctx.goto('halt') },
      { group: 'Guardrails' },
      { key: 'budgets', label: 'Budget', icon: '▤', active: route === 'budgets', onClick: () => ctx.goto('budgets') },
      { key: 'edge', label: 'Edge', icon: '~', active: route === 'edge', onClick: () => ctx.goto('edge') },
      { key: 'anchors', label: 'Anchors', icon: '⛓', active: route === 'anchors', onClick: () => ctx.goto('anchors') },
      { group: 'Config' },
      { key: 'settings', label: 'Settings', icon: '⚙', active: route === 'settings', onClick: () => ctx.goto('settings') },
    ];

    let screen = null;
    if (route === 'overview') screen = <SC.Overview ctx={ctx} />;
    else if (route === 'agents') screen = <SC.LiveAgentView ctx={ctx} />;
    else if (route === 'agent' && agent) screen = <SC.AgentDrillIn agent={agent} ctx={ctx} />;
    else if (route === 'review') screen = <SC.ReviewQueue ctx={ctx} />;
    else if (route === 'review-item' && item) screen = <SC.ReviewItem item={item} ctx={ctx} />;
    else if (route === 'halt') screen = <SC.HaltControl ctx={ctx} />;
    else if (route === 'budgets') screen = <SC.Budgets ctx={ctx} />;
    else if (route === 'edge') screen = <SC.Edge ctx={ctx} />;
    else if (route === 'anchors') screen = <SC.Anchors ctx={ctx} />;
    else if (route === 'settings') screen = <SC.Settings ctx={ctx} />;

    return (
      <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-app)' }}>
        <NavRail current="mission-control" posture={posture === 'kill' ? 'kill' : 'nominal'} items={items} collapsed={collapsed} onToggle={setCollapsed} postureHref="#" onPostureClick={(e) => { e.preventDefault(); ctx.goto('halt'); }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <AppHeader
            appName="Mission Control"
            identity="operator cockpit"
            systemState={<>
              <KillLevelPill level={posture === 'kill' ? level : 'G0'} size="sm" />
              <FreshnessStamp age={`epoch ${D.EPOCH} · 0.3s`} />
            </>}
          >
            <StopActuator level="G1" engaged={posture === 'kill'} onEngage={() => ctx.onEngage('G1')} label="Engage freeze" />
          </AppHeader>
          <main style={{ flex: 1, overflow: 'auto', padding: 24 }}>{screen}</main>
        </div>
        {haltFail ? <HaltNotConfirmed onDismiss={() => setHaltFail(false)} /> : null}
      </div>
    );
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();
