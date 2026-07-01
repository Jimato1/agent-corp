// pdf-forge flow A — header, facts inspector, drop board, single-page, virtualized, error. → window.PFA
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon, MONO = PFW.MONO, EYE = PFW.EYE;
  const { PageSheet, Button, IconButton, Checkbox, SegmentedControl, Tag } = DS;

  // header with Export ▶ gateway to Flow B
  function AHeader({ doc, selectedCount = 0, size = 'comfortable', empty = false }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)', flex: 'none', opacity: empty ? 0.55 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Checkbox checked={selectedCount > 0} indeterminate={selectedCount > 0} aria-label="Select all" readOnly disabled={empty} />
          <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="file" size={16} /></span>
          <span style={{ ...MONO, fontSize: 13, color: empty ? 'var(--ink-500)' : 'var(--ink-900)', whiteSpace: 'nowrap' }}>{empty ? 'No document' : doc.name}</span>
          {!empty ? <Tag>{doc.pages} pages</Tag> : null}
        </div>
        {selectedCount > 0 ? <DS.StatusPill status="selected" count={selectedCount}>selected</DS.StatusPill> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <SegmentedControl ariaLabel="Sheet size" value={size} options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'large', label: 'Large' }]} />
          <Button variant="primary" disabled={empty} rightIcon={<Icon name="chevron" size={14} />}>Export</Button>
        </div>
      </div>
    );
  }

  // read-only document facts
  function Fact({ k, children }) {
    return (
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '7px 0', borderBottom: '1px solid var(--sub-700)' }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)' }}>{k}</span>
        <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)', textAlign: 'right' }}>{children}</span>
      </div>
    );
  }
  function AInspector({ doc }) {
    return (
      <aside style={{ width: 320, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)' }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sub-600)' }}>
          <span style={EYE}>Document</span>
          <h3 style={{ margin: '3px 0 0', fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>Facts</h3>
        </div>
        <div style={{ padding: '8px 16px 16px' }}>
          <Fact k="Filename">{doc.name}</Fact>
          <Fact k="Pages">{doc.pages}</Fact>
          <Fact k="Page size">{doc.size}</Fact>
          <Fact k="One landscape">{doc.sizeLand}</Fact>
          <Fact k="File size">{doc.human} · {doc.bytes} B</Fact>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 12, ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>
            <span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="lock" size={13} /></span>{doc.opened}
          </div>
        </div>
      </aside>
    );
  }

  // recessed board well with the drop target (empty / drop-active)
  function DropBoard({ active = false }) {
    return (
      <div style={{ flex: 1, minHeight: 0, margin: 16, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', padding: 20, display: 'flex' }}>
        <div style={{
          flex: 1, borderRadius: 'var(--r-panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, textAlign: 'center', padding: 24,
          border: active ? '2px solid var(--press-500)' : '2px dashed var(--sub-500)',
          background: active ? 'var(--press-tint)' : 'transparent',
        }}>
          <span style={{ display: 'inline-flex', color: active ? 'var(--press-400)' : 'var(--ink-600)' }}><Icon name="file" size={34} sw={1.6} /></span>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 26, lineHeight: '32px', fontWeight: 700, color: 'var(--ink-900)' }}>Drop a PDF to open it</h1>
          <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-600)' }}>Stays on this device — nothing uploaded</span>
        </div>
      </div>
    );
  }

  // large single-page view + thumbnail strip
  function SinglePageView({ pages }) {
    return (
      <div style={{ flex: 1, minHeight: 0, margin: 16, borderRadius: 'var(--r-panel)', background: 'var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', display: 'flex', overflow: 'hidden' }}>
        <div style={{ width: 84, flex: 'none', borderRight: '1px solid var(--sub-600)', padding: 10, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden' }}>
          {pages.slice(0, 6).map((p, i) => <PageSheet key={p.id} page={p.page} width={60} aspect={p.aspect} selected={i === 1} />)}
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: 360, height: 509, background: 'var(--paper-0)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', boxShadow: '0 2px 10px rgba(5,7,10,.5)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: '36px 40px', display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ height: 14, width: '62%', background: '#c9c9c3', borderRadius: 2 }} />
              {[92, 98, 88, 95, 74, 90, 84, 96, 70, 88, 80].map((w, i) => <div key={i} style={{ height: 5, width: w + '%', background: '#dcdcd6', borderRadius: 1 }} />)}
            </div>
            <span style={{ position: 'absolute', left: -3, bottom: -6, background: 'rgba(14,17,22,.82)', color: 'var(--ink-900)', ...MONO, fontSize: 11, padding: '2px 7px', borderRadius: 999 }}>2</span>
          </div>
          <div style={{ position: 'absolute', bottom: 14, display: 'flex', alignItems: 'center', gap: 6, padding: 4, borderRadius: 'var(--r-ctl)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)' }}>
            <IconButton label="Zoom out"><Icon name="minus" size={16} /></IconButton>
            <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)', width: 48, textAlign: 'center' }}>100%</span>
            <IconButton label="Zoom in"><Icon name="plus" size={16} /></IconButton>
          </div>
        </div>
      </div>
    );
  }

  // 500-page virtualized board with mini-scrollbar
  function VirtualBoard({ doc, pages }) {
    return (
      <div style={{ flex: 1, minHeight: 0, margin: 16, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, padding: '16px 30px 16px 16px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {pages.map((p, i) => <PageSheet key={p.id} page={240 + i} width={96} aspect={p.aspect} loading={[3, 4, 12, 13, 14].includes(i)} />)}
          </div>
        </div>
        {/* pinned page readout */}
        <div style={{ position: 'absolute', top: 12, right: 34, padding: '3px 9px', borderRadius: 999, background: 'rgba(14,17,22,.85)', border: '1px solid var(--sub-600)', ...MONO, fontSize: 11, color: 'var(--ink-900)' }}>page {doc.at} of {doc.pages}</div>
        {/* mini-scrollbar with ticks */}
        <div style={{ position: 'absolute', top: 10, bottom: 10, right: 10, width: 10, borderRadius: 999, background: 'var(--sub-800)', border: '1px solid var(--sub-600)' }}>
          {[0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map((t) => <span key={t} style={{ position: 'absolute', left: 2, right: 2, top: (t * 100) + '%', height: 1, background: 'var(--sub-500)' }} />)}
          <span style={{ position: 'absolute', left: 1, right: 1, top: '46%', height: 46, borderRadius: 999, background: 'var(--press-500)' }} />
        </div>
      </div>
    );
  }

  // calm local-open error (no server chrome)
  function ErrorNote() {
    return (
      <div style={{ maxWidth: 460, display: 'flex', gap: 12, alignItems: 'flex-start', padding: '14px 16px', borderRadius: 'var(--r-panel)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)', borderLeft: '3px solid var(--err-500)' }}>
        <span style={{ color: 'var(--err-500)', display: 'inline-flex', marginTop: 1, flex: 'none' }}><Icon name="alert" size={18} /></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--ink-900)' }}>That file didn't open as a PDF.</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-700)' }}>It never left your device.</span>
          <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)', marginTop: 2 }}>bad_pdf_structure · not_a_pdf</span>
        </div>
      </div>
    );
  }

  window.PFA = { AHeader, AInspector, DropBoard, SinglePageView, VirtualBoard, ErrorNote };
})();
