// Shared workbench kit for pdf-forge flow mockups. → window.PFW
// Reusable three-zone chrome + board + press job card + canvas layout.
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const { PageSheet, InsertionBar, Button, IconButton, StatusPill, Tag, Checkbox, SegmentedControl, Tooltip, Spinner } = DS;

  // ---- icons (Lucide-style) ----
  const P = {
    layers: <><path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/></>,
    file: <><path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></>,
    rotateCW: <><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></>,
    rotateCCW: <><path d="M3 12a9 9 0 1 0 2.64-6.36"/><polyline points="3 3 3 9 9 9"/></>,
    trash: <><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
    combine: <><rect x="3" y="3" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><path d="M11 7h4a2 2 0 0 1 2 2v4"/></>,
    download: <><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></>,
    external: <><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></>,
    undo: <><path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-1"/></>,
    redo: <><path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h1"/></>,
    check: <path d="M20 6 9 17l-5-5"/>,
    x: <path d="M18 6 6 18M6 6l12 12"/>,
    alert: <><path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></>,
    lock: <><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></>,
    chevron: <path d="m9 6 6 6-6 6"/>,
    panelLeft: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></>,
    menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
    sliders: <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></>,
    scissors: <><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    text: <><path d="M5 6h14M5 12h14M5 18h9"/></>,
    copy: <><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></>,
    image: <><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.8"/><path d="m21 15-5-5L5 21"/></>,
    scan: <><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M6 12h12"/></>,
    zip: <><path d="m7.5 4.3 9 5.2M21 8l-9-5-9 5v8l9 5 9-5V8Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></>,
    fileText: <><path d="M14 3v5h5"/><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M9 13h6M9 17h4"/></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2"/>,
    unlock: <><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.9-.9"/></>,
    shield: <><path d="M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z"/><path d="M9.5 12l1.8 1.8 3.5-3.6"/></>,
    wrench: <><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z"/></>,
    eraser: <><path d="m7 21 10-10-4-4L3 17l4 4Z"/><path d="M11 21h9"/></>,
    align: <><path d="M4 6h16M4 12h10M4 18h16"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>,
    eyeOff: <><path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.3 3.3M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 3.4-.5M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"/></>,
    compress: <><path d="M8 3v4H4M16 3v4h4M8 21v-4H4M16 21v-4h4M9 12h6"/></>,
  };
  function Icon({ name, size = 16, sw = 2, ...rest }) {
    return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" {...rest}>{P[name] || null}</svg>;
  }

  const EYE = { fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-600)' };
  const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums lining-nums' };

  // ---- Left rail ----
  function Rail({ active = 'organize', collapsed = false, items }) {
    const list = items || [
      { id: 'open', label: 'Open', icon: 'file' },
      { id: 'organize', label: 'Organize', icon: 'layers' },
      { id: 'combine', label: 'Combine', icon: 'combine' },
      { id: 'split', label: 'Split', icon: 'scissors' },
      { id: 'rasterize', label: 'Rasterize', icon: 'image' },
      { id: 'ocr', label: 'OCR', icon: 'scan' },
      { id: 'extract', label: 'Extract text', icon: 'text' },
      { id: 'export', label: 'Export', icon: 'download' },
    ];
    return (
      <nav style={{ width: collapsed ? 56 : 220, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderRight: '1px solid var(--sub-600)' }}>
        <div style={{ height: 52, display: 'flex', alignItems: 'center', gap: 9, padding: collapsed ? 0 : '0 14px', justifyContent: collapsed ? 'center' : 'flex-start', borderBottom: '1px solid var(--sub-600)' }}>
          <img src="../../assets/logo/mark.svg" width="26" height="26" alt="" style={{ display: 'block' }} />
          {!collapsed ? <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: 16, letterSpacing: '-0.01em', color: 'var(--ink-900)' }}>pdf<span style={{ color: 'var(--press-500)' }}>-</span>forge</span> : null}
        </div>
        <div style={{ flex: 1, padding: collapsed ? '10px 8px' : 10, display: 'flex', flexDirection: 'column', gap: 3 }}>
          {!collapsed ? <span style={{ ...EYE, padding: '4px 10px 6px' }}>Tools</span> : null}
          {list.map((it) => {
            const on = it.id === active;
            return (
              <div key={it.id} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 36, padding: collapsed ? 0 : '0 10px', justifyContent: collapsed ? 'center' : 'flex-start', borderRadius: 'var(--r-ctl)', background: on ? 'var(--press-tint)' : 'transparent', color: on ? 'var(--press-400)' : 'var(--ink-700)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500 }}>
                <Icon name={it.icon} size={17} />{!collapsed ? <span>{it.label}</span> : null}
              </div>
            );
          })}
        </div>
        <div style={{ padding: collapsed ? '10px 8px' : 10, borderTop: '1px solid var(--sub-600)' }}>
          {!collapsed ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 10px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-850)', color: 'var(--ink-600)', ...MONO, fontSize: 11 }}>
              <span style={{ display: 'inline-flex', color: 'var(--ok-500)' }}><Icon name="lock" size={13} /></span>local · 127.0.0.1
            </div>
          ) : <span style={{ display: 'flex', justifyContent: 'center', color: 'var(--ok-500)' }}><Icon name="lock" size={16} /></span>}
        </div>
      </nav>
    );
  }

  // ---- Board header ----
  function BoardHeader({ docName = 'quarterly-report.pdf', pageCount = 24, size = 'comfortable', selectedCount = 0, edits = 0, exportDisabled = false, exportProcessing = false, exportLabel }) {
    const lbl = exportLabel || (edits > 0 ? `Export ${edits} edit${edits > 1 ? 's' : ''}` : 'Export');
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <Checkbox checked={selectedCount > 0} indeterminate={selectedCount > 0} aria-label="Select all" readOnly />
          <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="file" size={16} /></span>
          <span style={{ ...MONO, fontSize: 13, color: 'var(--ink-900)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{docName}</span>
          <Tag>{pageCount} pages</Tag>
        </div>
        {selectedCount > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusPill status="selected" count={selectedCount}>selected</StatusPill>
            <Tooltip label="Rotate 90°" kbd="R"><IconButton variant="outlined" label="Rotate"><Icon name="rotateCW" /></IconButton></Tooltip>
            <Tooltip label="Delete" kbd="⌫"><IconButton variant="danger" label="Delete"><Icon name="trash" /></IconButton></Tooltip>
          </div>
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          {edits > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...MONO, fontSize: 12, color: 'var(--ink-600)' }}>
              <span style={{ color: 'var(--ink-700)' }}>{edits} edits</span>
              <span style={{ color: 'var(--sub-500)' }}>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--press-400)', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}><Icon name="undo" size={13} />Undo</span>
            </div>
          ) : null}
          <SegmentedControl ariaLabel="Sheet size" value={size} options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'large', label: 'Large' }]} />
          <Button variant="primary" disabled={exportDisabled} processing={exportProcessing} rightIcon={<Icon name="chevron" size={15} />}>{lbl}</Button>
        </div>
      </div>
    );
  }

  const WIDTHS = { compact: 96, comfortable: 132, large: 180 };

  // ---- Board (inset well of sheets) ----
  function Board({ pages, size = 'comfortable', grid = true, insertBefore = -1, marquee = null, dim = false, children }) {
    const width = WIDTHS[size] || 132;
    const gap = size === 'compact' ? 8 : 12;
    const bg = grid ? 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)' : 'var(--sub-700)';
    const sheetH = (p) => Math.round(width / (p.rotation % 180 !== 0 ? 1 / p.aspect : p.aspect));
    const nodes = [];
    pages.forEach((p, i) => {
      if (insertBefore === i) nodes.push(<InsertionBar key={'ins' + i} height={sheetH(p)} />);
      if (p.ghost) {
        nodes.push(<div key={p.id} style={{ width, height: sheetH(p), flex: 'none', border: '1px dashed var(--sub-500)', borderRadius: 'var(--r-sheet)' }} />);
      } else {
        nodes.push(<PageSheet key={p.id} page={p.page} width={width} aspect={p.aspect} rotation={p.rotation} selected={p.selected} focused={p.focused} lifted={p.lifted} deleted={p.deleted} loading={p.loading} />);
      }
    });
    if (insertBefore === pages.length) nodes.push(<InsertionBar key="ins-end" height={Math.round(width * 1.414)} />);
    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: 16, padding: '22px 20px', borderRadius: 'var(--r-panel)', background: bg, boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap, position: 'relative' }}>{nodes}</div>
        {marquee ? <div style={{ position: 'absolute', ...marquee, border: '1px solid var(--press-500)', background: 'var(--press-tint)', opacity: 0.5, borderRadius: 2, pointerEvents: 'none' }} /> : null}
        {dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)', borderRadius: 'var(--r-panel)', zIndex: 1 }} /> : null}
        {children ? <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2, padding: 24 }}>{children}</div> : null}
      </div>
    );
  }

  // ---- Press job-readout card (the amber "press at work") ----
  function JobCard({ state = 'running', phase, detail, jobId, code, onCancel, width = 380 }) {
    injectPressCss();
    const phases = { queued: 'Queued — waiting for a free press', running: 'Running — finalize', succeeded: 'Finalized', failed: 'Finalize failed' };
    const tone = state === 'failed' ? 'var(--err-500)' : state === 'succeeded' ? 'var(--ok-500)' : 'var(--proc-500)';
    return (
      <div className={'pfw-job ' + (state === 'running' || state === 'queued' ? 'pfw-job--proc' : '')} style={{ width, maxWidth: '100%', borderRadius: 'var(--r-panel)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)', boxShadow: 'var(--shadow-dialog)', overflow: 'hidden', position: 'relative' }}>
        <div className="pfw-job__sweep" aria-hidden="true" />
        <div style={{ padding: '18px 18px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {state === 'running' || state === 'queued'
              ? <Spinner size={22} tone="proc" />
              : <span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', color: tone }}><Icon name={state === 'failed' ? 'x' : 'check'} size={20} sw={2.4} /></span>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: state === 'queued' || state === 'running' ? tone : 'var(--ink-900)' }}>{phase || phases[state]}</span>
              <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-600)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{detail}</span>
              {state === 'failed' && code ? <span style={{ ...MONO, fontSize: 11, color: 'var(--err-500)', background: 'rgba(217,89,76,.16)', padding: '1px 6px', borderRadius: 3, alignSelf: 'flex-start', marginTop: 2 }}>{code}</span> : null}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>job {jobId}</span>
            {state === 'running' || state === 'queued'
              ? <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
              : state === 'failed'
                ? <Button size="sm" variant="secondary" onClick={onCancel}>Export again</Button>
                : null}
          </div>
        </div>
      </div>
    );
  }

  let pressInjected = false;
  function injectPressCss() {
    if (pressInjected || typeof document === 'undefined') return; pressInjected = true;
    const el = document.createElement('style');
    el.textContent = `.pfw-job__sweep{position:absolute;inset:0;z-index:0;opacity:0;overflow:hidden}.pfw-job--proc .pfw-job__sweep{opacity:1}.pfw-job--proc .pfw-job__sweep::before{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,transparent,rgba(224,138,60,.16),transparent);animation:pf-proc-sweep var(--proc-loop) var(--ease-press) infinite}.pfw-job>div{position:relative;z-index:1}`;
    document.head.appendChild(el);
  }

  // ---- Overlay: scrim + centered node ----
  function Overlay({ children }) {
    return <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', background: 'rgba(8,10,14,.6)', padding: 24 }}>{children}</div>;
  }

  // ---- Three-zone frame ----
  function WorkFrame({ rail, header, board, inspector, overlay }) {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', background: 'var(--sub-900)', color: 'var(--ink-900)', overflow: 'hidden' }}>
        {rail}
        <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)', position: 'relative' }}>
          {header}{board}{overlay}
        </main>
        {inspector}
      </div>
    );
  }

  // ---- Canvas layout (absolutely-positioned labeled frames, row flow) ----
  function CanvasLayout({ frames, colGap = 120, rowGap = 96, pad = 100, maxRowW = 4560 }) {
    let x = pad, y = pad, rowH = 0, maxX = 0, maxY = 0;
    const placed = frames.map((f) => {
      if (x > pad && x + f.w > pad + maxRowW) { x = pad; y += rowH + rowGap + 54; rowH = 0; }
      const pos = { left: x, top: y };
      x += f.w + colGap; rowH = Math.max(rowH, f.h);
      maxX = Math.max(maxX, pos.left + f.w); maxY = Math.max(maxY, pos.top + f.h);
      return { f, pos };
    });
    return (
      <>
        <div style={{ width: maxX + pad, height: maxY + pad + 60 }} aria-hidden="true" />
        {placed.map(({ f, pos }) => (
          <section key={f.id} id={f.id} data-screen-label={f.id} style={{ position: 'absolute', left: pos.left, top: pos.top, width: f.w }}>
            <div style={{ display: 'inline-flex', alignItems: 'baseline', gap: 10, marginBottom: 12, padding: '6px 12px 6px 8px', borderRadius: 'var(--r-pill)', background: 'rgba(14,17,22,.85)', border: '1px solid var(--sub-600)' }}>
              <span style={{ ...MONO, fontSize: 13, fontWeight: 500, color: '#08191f', background: 'var(--press-400)', padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>{f.id}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>{f.title}</span>
              {f.note ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)' }}>{f.note}</span> : null}
            </div>
            <div style={{ position: 'relative', width: f.w, height: f.h, borderRadius: 'var(--r-panel)', overflow: 'hidden', border: '1px solid var(--sub-600)', boxShadow: '0 20px 60px rgba(5,7,10,.45)' }}>
              {f.el}
            </div>
          </section>
        ))}
      </>
    );
  }

  window.PFW = { Icon, Rail, BoardHeader, Board, JobCard, Overlay, WorkFrame, CanvasLayout, WIDTHS, EYE, MONO };
})();
