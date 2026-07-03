// Left rail — operation nav, collapsible (56 ↔ 220). → window.Rail
(function () {
  const Icon = window.PFIcon;
  const { Tooltip } = window.PDFForgeDesignSystem_ec4ef3;

  function RailItem({ op, active, collapsed, onSelect }) {
    const btn = (
      <button
        type="button"
        onClick={() => onSelect(op.id)}
        aria-current={active ? 'page' : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          height: 36, padding: collapsed ? 0 : '0 10px', justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 'var(--r-ctl)', border: '1px solid transparent', cursor: 'pointer',
          background: active ? 'var(--press-tint)' : 'transparent',
          color: active ? 'var(--press-400)' : 'var(--ink-700)',
          fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500,
          transition: 'background var(--mo-fast) var(--ease-inout), color var(--mo-fast)',
        }}
        onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = 'var(--sub-700)'; e.currentTarget.style.color = 'var(--ink-900)'; } }}
        onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-700)'; } }}
      >
        <span style={{ display: 'inline-flex', flex: 'none' }}><Icon name={op.icon} size={17} /></span>
        {!collapsed ? <span>{op.label}</span> : null}
      </button>
    );
    return collapsed ? <Tooltip label={op.label} placement="right">{btn}</Tooltip> : btn;
  }

  function Rail({ ops, active, onSelect, collapsed, onToggle }) {
    return (
      <nav style={{
        width: collapsed ? 'var(--rail-collapsed)' : 'var(--rail-open)',
        flex: 'none', display: 'flex', flexDirection: 'column',
        background: 'var(--sub-800)', borderRight: '1px solid var(--sub-600)',
        transition: 'width var(--mo-base) var(--ease-out)', overflow: 'hidden',
      }}>
        {/* brand */}
        <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 9, padding: collapsed ? 0 : '0 14px', justifyContent: collapsed ? 'center' : 'flex-start', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
          <img src="../../assets/logo/mark.svg" alt="" width="26" height="26" style={{ display: 'block', flex: 'none' }} />
          {!collapsed ? <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--ink-900)' }}>pdf<span style={{ color: 'var(--press-500)' }}>-</span>forge</span> : null}
        </div>

        {/* ops */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3, padding: collapsed ? '10px 8px' : '10px', minHeight: 0 }}>
          {!collapsed ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-600)', padding: '4px 10px 6px' }}>Operations</span> : null}
          {ops.map((op) => <RailItem key={op.id} op={op} active={active === op.id} collapsed={collapsed} onSelect={onSelect} />)}
        </div>

        {/* footer: privacy badge + collapse */}
        <div style={{ padding: collapsed ? '10px 8px' : 10, borderTop: '1px solid var(--sub-600)', display: 'flex', flexDirection: 'column', gap: 8, flex: 'none' }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-850)', color: 'var(--ink-600)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
              <span style={{ display: 'inline-flex', color: 'var(--ok-500)' }}><Icon name="lock" size={13} /></span>
              local · 127.0.0.1
            </div>
          ) : null}
          <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expand rail' : 'Collapse rail'}
            style={{ height: 32, display: 'flex', alignItems: 'center', gap: 8, justifyContent: collapsed ? 'center' : 'flex-start', padding: collapsed ? 0 : '0 10px', borderRadius: 'var(--r-ctl)', border: 'none', background: 'transparent', color: 'var(--ink-600)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--sub-700)'; e.currentTarget.style.color = 'var(--ink-900)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-600)'; }}>
            <span style={{ display: 'inline-flex', transform: collapsed ? 'none' : 'scaleX(-1)' }}><Icon name="panelLeft" size={16} /></span>
            {!collapsed ? <span>Collapse</span> : null}
          </button>
        </div>
      </nav>
    );
  }
  window.Rail = Rail;
})();
