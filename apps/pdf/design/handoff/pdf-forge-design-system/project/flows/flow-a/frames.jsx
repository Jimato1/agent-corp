// pdf-forge flow A — all frames + Canvas. → window.PFA.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFA = window.PFA, DATA = window.PFA_DATA;
  const { Rail, Board, WorkFrame, Icon, MONO, EYE } = PFW;
  const { Button, IconButton, PageSheet, Tag } = DS;
  const DW = 1320, DH = 820;
  const rail = <Rail active="open" />;
  const FR = (window.PFA_FRAMES = window.PFA_FRAMES || []);

  function MutedInspector() {
    return (
      <aside style={{ width: 320, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)' }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sub-600)' }}><span style={EYE}>Document</span><h3 style={{ margin: '3px 0 0', fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-500)' }}>Facts</h3></div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-600)' }}>No document open.</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...MONO, fontSize: 11, color: 'var(--ink-600)' }}><span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="lock" size={13} /></span>Stays on this device</div>
        </div>
      </aside>
    );
  }
  function Callout({ top, left, children }) {
    return <div style={{ position: 'absolute', top, left, zIndex: 6, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 'var(--r-pill)', background: 'rgba(14,17,22,.9)', border: '1px solid var(--sub-500)', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--ink-700)' }}>{children}</div>;
  }

  // A1 empty
  FR.push({ id: 'A1', w: DW, h: DH, title: 'Empty', note: 'dashed drop target · H1 · privacy label · header disabled',
    el: <WorkFrame rail={rail} header={<PFA.AHeader empty doc={DATA.doc} />} board={<PFA.DropBoard />} inspector={<MutedInspector />} /> });

  // A2 drop-active
  FR.push({ id: 'A2', w: DW, h: DH, title: 'Drop-active', note: 'valid drop — press-blue border + tint · no upload language',
    el: <WorkFrame rail={rail} header={<PFA.AHeader empty doc={DATA.doc} />} board={<PFA.DropBoard active />} inspector={<MutedInspector />} /> });

  // A3 loading (client render)
  FR.push({ id: 'A3', w: DW, h: DH, title: 'Loading · client render', note: 'blank paper placeholders + faint spinner · true aspect · no amber',
    el: <WorkFrame rail={rail} header={<PFA.AHeader doc={DATA.doc} />}
      board={<Board size="comfortable" pages={DATA.build(DATA.pages, { ap2: { loading: true }, ap5: { loading: true }, ap6: { loading: true }, ap10: { loading: true }, ap13: { loading: true } })} />}
      inspector={<PFA.AInspector doc={DATA.doc} />} /> });

  // A4 success default
  FR.push({ id: 'A4', w: DW, h: DH, title: 'Success · default board', note: '14 sheets, comfortable 132px, dealt-card wrap',
    el: <WorkFrame rail={rail} header={<PFA.AHeader doc={DATA.doc} />} board={<Board size="comfortable" pages={DATA.build(DATA.pages)} />} inspector={<PFA.AInspector doc={DATA.doc} />} /> });

  // A5 single-sheet page view
  FR.push({ id: 'A5', w: DW, h: DH, title: 'Success · single-sheet view', note: 'large centered page + zoom + thumbnail strip',
    el: <WorkFrame rail={rail} header={<PFA.AHeader doc={DATA.doc} />} board={<PFA.SinglePageView pages={DATA.pages} />} inspector={<PFA.AInspector doc={DATA.doc} />} /> });

  // A6 virtualized 500
  FR.push({ id: 'A6', w: DW, h: DH, title: 'Success · 500-page virtualized', note: 'compact 96px · lazy rows · mini-scrollbar + page 248 of 500',
    el: <WorkFrame rail={rail} header={<PFA.AHeader doc={{ name: DATA.big.name, pages: DATA.big.pages }} size="compact" />}
      board={<PFA.VirtualBoard doc={DATA.big} pages={DATA.bigPages} />}
      inspector={<PFA.AInspector doc={{ ...DATA.doc, name: DATA.big.name, pages: DATA.big.pages }} />} /> });

  // A7 selection single
  FR.push({ id: 'A7', w: DW, h: DH, title: 'Live selection · single', note: 'press border + tint + check tab · Export ▶ enabled',
    el: <WorkFrame rail={rail} header={<PFA.AHeader doc={DATA.doc} selectedCount={1} />} board={<Board size="comfortable" pages={DATA.build(DATA.pages, { ap4: { selected: true } })} />} inspector={<PFA.AInspector doc={DATA.doc} />} /> });

  // A8 selection multi
  FR.push({ id: 'A8', w: DW, h: DH, title: 'Live selection · multi', note: 'Shift-range · "3 selected" · Export ▶ gateway to Flow B',
    el: <WorkFrame rail={rail} header={<PFA.AHeader doc={DATA.doc} selectedCount={3} />}
      board={<Board size="comfortable" pages={DATA.build(DATA.pages, { ap5: { selected: true }, ap6: { selected: true }, ap7: { selected: true } })} marquee={{ left: 172, top: 214, width: 300, height: 200 }} />}
      inspector={<PFA.AInspector doc={DATA.doc} />} /> });

  // A9 keyboard focus
  FR.push({ id: 'A9', w: DW, h: DH, title: 'Keyboard focus', note: 'roving tabindex — ring + halo + 1px dark spacer on paper',
    el: <WorkFrame rail={rail} header={<PFA.AHeader doc={DATA.doc} />}
      board={<Board size="comfortable" pages={DATA.build(DATA.pages, { ap3: { focused: true } })}>
        <Callout top={12} left={12}>Arrow keys move focus · Space selects · a focused sheet lifts</Callout>
      </Board>}
      inspector={<PFA.AInspector doc={DATA.doc} />} /> });

  // A10 local error
  FR.push({ id: 'A10', w: DW, h: DH, title: 'Error · local open failure', note: 'calm inline note (no server banner) · "It never left your device."',
    el: <WorkFrame rail={rail} header={<PFA.AHeader empty doc={DATA.doc} />}
      board={<div style={{ flex: 1, minHeight: 0, margin: 16, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', display: 'grid', placeItems: 'center', padding: 24 }}><PFA.ErrorNote /></div>}
      inspector={<MutedInspector />} /> });

  // A11 no-amber annotation
  FR.push({ id: 'A11', w: 620, h: 240, title: 'No server job in Flow A', note: 'privacy non-negotiable',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 24, display: 'flex', flexDirection: 'column', gap: 12, justifyContent: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="lock" size={20} /></span><h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 600, color: 'var(--ink-900)' }}>Flow A uploads nothing</h3></div>
      <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-700)', lineHeight: '20px', maxWidth: 520 }}>Opening and previewing runs entirely in the browser via pdf.js — no server job, no <span style={MONO}>202</span>, no poll, no amber "press at work" sweep. That treatment belongs to Flows C/D (heavy server ops). Rendering the sheets onto the lit board is the only bold moment here.</p>
    </div> });

  // ---- mobile ----
  function AmTop({ empty }) {
    return <div style={{ height: 48, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)' }}>
      <IconButton label="Menu"><Icon name="menu" /></IconButton>
      <span style={{ ...MONO, fontSize: 12, color: empty ? 'var(--ink-500)' : 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{empty ? 'No document' : DATA.doc.name}</span>
      {!empty ? <Button size="sm" variant="primary" rightIcon={<Icon name="chevron" size={14} />}>Export</Button> : null}
    </div>;
  }
  const phone = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)' };

  FR.push({ id: 'Am1', w: 390, h: 800, title: 'Mobile · empty', note: 'drop target fills the board · single column',
    el: <div style={phone}><AmTop empty /><div style={{ flex: 1, minHeight: 0, margin: 12, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', padding: 16, display: 'flex' }}>
      <div style={{ flex: 1, borderRadius: 'var(--r-panel)', border: '2px dashed var(--sub-500)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: 20 }}>
        <span style={{ color: 'var(--ink-600)', display: 'inline-flex' }}><Icon name="file" size={30} sw={1.6} /></span>
        <h1 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 22, lineHeight: '28px', fontWeight: 700, color: 'var(--ink-900)' }}>Drop a PDF to open it</h1>
        <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>Stays on this device</span>
      </div>
    </div></div> });

  FR.push({ id: 'Am2', w: 390, h: 800, title: 'Mobile · success', note: 'board 2-up · facts as a bottom sheet',
    el: <div style={phone}><AmTop /><div style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: 12, padding: 12, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{DATA.pages.slice(0, 6).map((p) => <PageSheet key={p.id} page={p.page} width={166} aspect={p.aspect} selected={p.page === 2} />)}</div>
    </div>
    <div style={{ flex: 'none', background: 'var(--sub-800)', borderTop: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel) var(--r-panel) 0 0', boxShadow: '0 -12px 32px rgba(5,7,10,.4)', padding: '10px 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sub-500)', alignSelf: 'center' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)' }}>Pages</span><span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)' }}>14</span></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)' }}>File size</span><span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)' }}>5.0 MB</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 2, ...MONO, fontSize: 11, color: 'var(--ink-600)' }}><span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="lock" size={13} /></span>local · not uploaded</div>
    </div></div> });

  // INV
  function InvRow({ sample, name, note }) {
    return <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '1px solid var(--sub-700)' }}>
      <div style={{ width: 130, flex: 'none', display: 'flex', justifyContent: 'center' }}>{sample}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{name}</span><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', lineHeight: '16px' }}>{note}</span></div>
    </div>;
  }
  FR.push({ id: 'INV', w: 900, h: 470, title: 'Component inventory', note: 'the parts flow A composes',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '16px 24px', overflow: 'auto' }}>
      <InvRow name="Paper sheet" note="true aspect · face + bottom edge + resting shadow · page chip · hover/selected/focus/loading" sample={<PageSheet page={2} width={64} selected />} />
      <InvRow name="Board header" note="doc name (mono) · M pages (tabular) · zoom (96/132/180) · select-all · Export ▶" sample={<Tag>14 pages</Tag>} />
      <InvRow name="Drop target" note="idle dashed --sub-500 → active 2px press border + tint" sample={<span style={{ width: 40, height: 26, borderRadius: 4, border: '2px dashed var(--sub-500)' }} />} />
      <InvRow name="Facts inspector" note="read-only document facts · privacy line 'local · not uploaded'" sample={<span style={{ color: 'var(--ok-500)' }}><Icon name="lock" size={20} /></span>} />
      <InvRow name="Virtualized mini-scrollbar" note="page ticks + press-blue thumb + pinned page N of M" sample={<span style={{ width: 8, height: 40, borderRadius: 999, background: 'var(--sub-800)', border: '1px solid var(--sub-600)', position: 'relative', display: 'inline-block' }}><span style={{ position: 'absolute', inset: '30% 1px auto 1px', height: 14, borderRadius: 999, background: 'var(--press-500)' }} /></span>} />
      <InvRow name="Local-open error note" note="calm err left-rule + muted mono code · never implies a network round-trip" sample={<DS.StatusPill status="err">local</DS.StatusPill>} />
    </div> });

  // NOTES
  function NoteSec({ title, children }) { return <div style={{ marginBottom: 15 }}><span style={{ ...EYE, display: 'block', marginBottom: 7 }}>{title}</span><div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-700)', lineHeight: '19px' }}>{children}</div></div>; }
  const M = ({ children }) => <span style={MONO}>{children}</span>;
  FR.push({ id: 'NOTES', w: 760, h: 470, title: 'Interaction notes', note: 'zero upload — nothing leaves the device',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '16px 24px', overflow: 'auto' }}>
      <NoteSec title="Zero upload">The SPA reads bytes into an in-memory page model — <b>no network, no /api call</b>. The board lays out blank paper placeholders at the true page count + true aspect; pdf.js fills faces lazily. There is no amber press because no server job runs.</NoteSec>
      <NoteSec title="Selection is live">Click selects a sheet (press border + tint + check tab); Shift-range draws a press-tint marquee; header shows <M>N selected</M> (tabular). Selection carries straight into Flow B via <b>Export ▶</b> — no mode switch. <b>No drag commits anything in Flow A.</b></NoteSec>
      <NoteSec title="Zoom & virtualization">Zoom steps the sheet width 96 / 132 / 180px. At 500 pages the board virtualizes — only visible rows mount, off-screen sheets are blank paper + a faint spinner, with a right-edge mini-scrollbar (page ticks) and a pinned <M>page N of M</M> readout.</NoteSec>
      <NoteSec title="Keyboard">Roving tabindex; arrow keys move focus, the focused sheet gets the ring + a subtle lift (with a 1px <M>--sub-900</M> spacer so the ring holds on white). Space selects.</NoteSec>
      <NoteSec title="Reduced motion">No hover lift, no spinner motion (cycling <M>working…</M> text instead); focus rings and all state colors still render.</NoteSec>
    </div> });

  window.PFA.Canvas = function Canvas() { return <PFW.CanvasLayout frames={window.PFA_FRAMES} />; };
})();
