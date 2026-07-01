// pdf-forge flow F — desktop frames F1–F5 + FHeader. → window.PFF_FRAMES
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFF = window.PFF, DATA = window.PFF_DATA;
  const { Icon, Rail, JobCard, MONO } = PFW;
  const { Button, Checkbox, Tag, StatusPill, SegmentedControl, Tooltip, IconButton, Spinner } = DS;

  const DW = 1320, DH = 820;
  const rail = <Rail active="extract" />;
  const FR = (window.PFF_FRAMES = window.PFF_FRAMES || []);

  // flow-F board header (no edit log; primary = Extract on server tab)
  function FHeader({ selectedCount = 0, tab = 'quick', processing = false, size = 'compact' }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Checkbox checked={selectedCount > 0} indeterminate={selectedCount > 0} aria-label="Select all" readOnly />
          <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="file" size={16} /></span>
          <span style={{ ...MONO, fontSize: 13, color: 'var(--ink-900)', whiteSpace: 'nowrap' }}>{DATA.doc.name}</span>
          <Tag>{DATA.doc.pages} pages</Tag>
          <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-600)' }}>{DATA.doc.human}</span>
        </div>
        {selectedCount > 0 ? <StatusPill status="selected" count={selectedCount}>selected</StatusPill> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <SegmentedControl ariaLabel="Sheet size" value={size} options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'large', label: 'Large' }]} />
          {tab === 'server'
            ? <Button variant="primary" processing={processing} leftIcon={<Icon name="text" size={15} />} rightIcon={<Icon name="chevron" size={14} />}>{processing ? 'Extracting…' : 'Extract'}</Button>
            : <Button variant="secondary" leftIcon={<Icon name="copy" size={15} />}>Copy all</Button>}
        </div>
      </div>
    );
  }
  PFF.FHeader = FHeader;

  const matched = ['fp1', 'fp3', 'fp7', 'fp8', 'fp12'];

  // F1 — empty (quick-text tab)
  FR.push({
    id: 'F1', w: DW, h: DH, title: 'Empty · Quick text tab', note: 'doc on the board · text pane placeholder · zero upload',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="quick" />}
      board={<PFF.FBoard pages={DATA.build({ fp1: { focused: true } })} />}
      textPane={<PFF.TextPane empty />}
      inspector={<PFF.ExtractInspector tab="quick" />} />,
  });

  // F2 — client loading (pdf.js streaming)
  FR.push({
    id: 'F2', w: DW, h: DH, title: 'Client loading · pdf.js streaming', note: 'text streams page-by-page · no amber (client-side, not a job)',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="quick" />}
      board={<PFF.FBoard pages={DATA.build()} />}
      textPane={<PFF.TextPane lines={DATA.text.slice(0, 10)} streamingPage={3} showFind={false} footer={false} />}
      inspector={<PFF.ExtractInspector tab="quick" />} />,
  });

  // F3 — client success + live find/highlight (hero)
  FR.push({
    id: 'F3', w: DW, h: DH, title: 'Client success · find & highlight', note: 'matches highlight on BOTH the text pane and the sheet faces · no artifact',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="quick" />}
      board={<PFF.FBoard pages={DATA.build()} matchedIds={matched} />}
      textPane={<PFF.TextPane lines={DATA.text} query={DATA.find.query} matches={DATA.find.matches} />}
      inspector={<PFF.ExtractInspector tab="quick" />} />,
  });

  // F4 — client advisory: image-only scan (NOT an error)
  FR.push({
    id: 'F4', w: DW, h: DH, title: 'Client advisory · looks like a scan', note: 'warn (not error): no selectable text → offer OCR',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="quick" />}
      board={<PFF.FBoard pages={DATA.build()} scanned />}
      textPane={<div style={{ flex: 1, minHeight: 0, margin: '16px 16px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sub-850)', border: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel)', padding: 24 }}>
        <div style={{ maxWidth: 340 }}><PFF.ScanAdvisory variant="client" /></div>
      </div>}
      inspector={<PFF.ExtractInspector tab="quick" error="scan" />} />,
  });

  // F5 — server submit / upload spinner (before 202)
  FR.push({
    id: 'F5', w: DW, h: DH, title: 'Server submit · uploading', note: 'Batch tab · options filled · brief upload spinner before the 202',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="server" processing />}
      board={<PFF.FBoard pages={DATA.build()} />}
      textPane={<PFF.TextPane lines={DATA.text} query="" matches={0} showFind footer />}
      inspector={<aside style={{ width: 330, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)' }}>
        <div style={{ padding: '14px 16px 0' }}>
          <span style={PFW.EYE}>Inspector</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0 12px' }}><span style={{ color: 'var(--press-400)', display: 'inline-flex' }}><Icon name="text" size={17} /></span><h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600 }}>Extract text</h3></div>
          <DS.Tabs value="server" tabs={[{ id: 'quick', label: 'Quick text' }, { id: 'server', label: 'Batch extract' }]} />
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <PFF.PrivacyLabel text="Sent to your local server · 127.0.0.1" tone="muted" />
          <DS.Input mono value={DATA.scopeExample} readOnly label="Pages" />
          <DS.Switch label="Preserve layout" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-850)', border: '1px solid var(--sub-600)' }}>
            <Spinner size={16} tone="ink" />
            <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-700)' }}>Uploading {DATA.doc.name}…</span>
          </div>
        </div>
      </aside>} />,
  });
})();
