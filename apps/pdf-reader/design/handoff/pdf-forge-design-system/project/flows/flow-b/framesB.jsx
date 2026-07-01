// pdf-forge flow B — frames B8–B13 + docs + Canvas. → window.PFB.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFB = window.PFB, DATA = window.PFB_DATA;
  const { Icon, Rail, BoardHeader, Board, JobCard, WorkFrame, MONO, EYE } = PFW;
  const { Button, IconButton, PageSheet, InsertionBar, Tag, StatusPill, InlineBanner, Toast, Checkbox } = DS;

  const DW = 1320, DH = 820;
  const rail = <Rail active="organize" />;
  const FR = (window.PFB_FRAMES = window.PFB_FRAMES || []);

  // ---------- B8 engine_error (failed press) ----------
  FR.push({
    id: 'B8', w: DW, h: DH, title: 'Error · finalize failed', note: 'failed job engine_error · local pages untouched',
    el: <WorkFrame rail={rail}
      header={<BoardHeader edits={5} selectedCount={0} />}
      board={<Board pages={DATA.build()} dim>
        <JobCard state="failed" phase="Finalize failed while normalizing" detail="Your local pages are untouched — try Export again." code="engine_error" jobId={DATA.jobShort} />
      </Board>}
      inspector={<PFB.Inspector selectedCount={0} edits={5} editLog={DATA.editLog} />} />,
  });

  // ---------- B8b error catalog ----------
  FR.push({
    id: 'B8b', w: 660, h: 620, title: 'Error catalog', note: 'banner: err-tint fill · 3px err rule · mono code (never an HTTP number)',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, overflow: 'auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <PFB.ErrorBanner kind="worker" retry="Use server path" />
        <PFB.ErrorBanner kind="file_too_large" />
        <PFB.ErrorBanner kind="bad_pdf_structure" retry="Back to board" />
        <PFB.ErrorBanner kind="queue_full" />
        <PFB.ErrorBanner kind="disk_full" retry="Retry" />
        <PFB.ErrorBanner kind="engine_error" retry="Export again" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, padding: '9px 11px', borderRadius: 'var(--r-ctl)', background: 'rgba(214,165,60,.1)', border: '1px solid rgba(214,165,60,.35)' }}>
          <span style={{ color: 'var(--warn-500)', display: 'inline-flex' }}><Icon name="alert" size={15} /></span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-700)' }}>429 honors <span style={MONO}>Retry-After: 30</span> → auto-retry <span style={MONO}>Retrying in 30s…</span></span>
        </div>
      </div>
    </div>,
  });

  // ---------- B9 success ----------
  FR.push({
    id: 'B9', w: DW, h: DH, title: 'Success · linearized & cleaned', note: 'ok artifact row · Download focused · Open result · toast',
    el: <WorkFrame rail={rail}
      header={<BoardHeader docName={DATA.result.filename} edits={0} selectedCount={0} exportLabel="Export" />}
      board={<Board pages={DATA.build({ pg12: { deleted: true }, pg18: { deleted: true }, pg4: { rotation: 90 } })}>
        <div style={{ width: 520 }}>
          <PFB.ArtifactRow filename={DATA.result.filename} human={DATA.result.human} bytesExact={DATA.result.bytesExact} focusDownload />
        </div>
        <div style={{ position: 'absolute', right: 16, bottom: 16 }}>
          <Toast status="ok" title="Exported — linearized and cleaned">{DATA.result.filename}</Toast>
        </div>
      </Board>}
      inspector={<PFB.Inspector selectedCount={0} edits={0} editLog={DATA.editLog} />} />,
  });

  // ---------- B10 guard: delete-all ----------
  FR.push({
    id: 'B10', w: DW, h: DH, title: 'Guard · keep at least one page', note: 'deleting every page is blocked',
    el: <WorkFrame rail={rail}
      header={<BoardHeader edits={9} selectedCount={0} />}
      board={<Board pages={DATA.build(Object.fromEntries(DATA.pages.map((p) => [p.id, { deleted: true }])))} dim>
        <div style={{ width: 360, borderRadius: 'var(--r-panel)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)', boxShadow: 'var(--shadow-dialog)', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--warn-500)', display: 'inline-flex' }}><Icon name="alert" size={20} /></span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>Add or keep at least one page</span>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-700)', lineHeight: '19px' }}>A document needs a page. Restore a page or add one before exporting.</p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button size="md" variant="secondary" leftIcon={<Icon name="undo" size={15} />}>Undo delete</Button>
          </div>
        </div>
      </Board>}
      inspector={<PFB.Inspector selectedCount={0} edits={9} editLog={[{ k: 'delete', text: 'Deleted page 24' }, ...DATA.editLog]} />} />,
  });

  // ---------- mobile helpers ----------
  function MTopBar({ exportLabel = 'Export 5', processing }) {
    return (
      <div style={{ height: 48, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)' }}>
        <IconButton label="Menu"><Icon name="menu" /></IconButton>
        <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="file" size={15} /></span>
        <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>quarterly-report.pdf</span>
        <div style={{ marginLeft: 'auto' }}><Button size="sm" variant="primary" processing={processing} rightIcon={<Icon name="chevron" size={14} />}>{exportLabel}</Button></div>
      </div>
    );
  }
  function MBoard({ overrides, dim }) {
    const w = 168;
    const pages = DATA.pages.slice(0, 6).map((p) => Object.assign({ selected: false, rotation: p.rotation, deleted: false }, p, (overrides || {})[p.id] || {}));
    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: 12, padding: 14, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {pages.map((p) => <PageSheet key={p.id} page={p.page} width={w} aspect={p.aspect} rotation={p.rotation} selected={p.selected} deleted={p.deleted} />)}
        </div>
        {dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)', borderRadius: 'var(--r-panel)' }} /> : null}
      </div>
    );
  }
  function MSheet({ children, h = 190 }) {
    return (
      <div style={{ flex: 'none', height: h, background: 'var(--sub-800)', borderTop: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel) var(--r-panel) 0 0', boxShadow: '0 -12px 32px rgba(5,7,10,.4)', padding: '10px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sub-500)', alignSelf: 'center' }} />
        {children}
      </div>
    );
  }

  // ---------- B11 mobile editing ----------
  FR.push({
    id: 'B11', w: 390, h: 800, title: 'Mobile · editing (375+)', note: '2-up board · bottom-sheet inspector · ≥44px targets',
    el: <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)' }}>
      <MTopBar exportLabel="Export 4" />
      <MBoard overrides={{ pg2: { selected: true }, pg3: { selected: true, rotation: 90 } }} />
      <MSheet h={196}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <StatusPill status="selected" count={2}>selected</StatusPill>
          <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-600)' }}>4 edits · <span style={{ color: 'var(--press-400)', fontFamily: 'var(--font-ui)' }}>Undo</span></span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button size="lg" variant="secondary" block leftIcon={<Icon name="rotateCW" size={16} />}>Rotate</Button>
          <Button size="lg" variant="danger" block leftIcon={<Icon name="trash" size={16} />}>Delete</Button>
        </div>
        <div style={{ border: '1px dashed var(--sub-500)', borderRadius: 'var(--r-ctl)', padding: '10px', textAlign: 'center', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)' }}>Drop PDFs to combine — under 150 MB stays on device</div>
      </MSheet>
    </div>,
  });

  // ---------- B12 mobile press ----------
  FR.push({
    id: 'B12', w: 390, h: 800, title: 'Mobile · the press at work', note: 'dimmed board · amber job sheet · spinner not a bar',
    el: <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)' }}>
      <MTopBar exportLabel="Pressing…" processing />
      <MBoard dim />
      <div style={{ flex: 'none', background: 'var(--sub-800)', borderTop: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel) var(--r-panel) 0 0', boxShadow: '0 -12px 32px rgba(5,7,10,.4)', padding: '10px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sub-500)', alignSelf: 'center' }} />
        <JobCard state="running" detail={`${DATA.doc.name} · ${DATA.doc.human}`} jobId={DATA.jobShort} width={360} />
      </div>
    </div>,
  });

  // ---------- B13 reduced-motion ----------
  function RMCol({ title, children }) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={EYE}>{title}</span>
        <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: 'var(--sub-700)', borderRadius: 'var(--r-panel)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', padding: 16, minHeight: 150 }}>{children}</div>
      </div>
    );
  }
  FR.push({
    id: 'B13', w: 1180, h: 430, title: 'prefers-reduced-motion: reduce', note: 'no tilt/scale · no spin · no shake · focus rings still render',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 16, flex: 1 }}>
        <RMCol title="Drag — instant, no tilt">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <PageSheet page={5} width={92} /><InsertionBar height={130} /><PageSheet page={6} width={92} />
          </div>
        </RMCol>
        <RMCol title="Processing — static amber">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)' }}>
            <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--proc-500)' }} />
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--proc-500)' }}>working…</span>
          </div>
        </RMCol>
        <RMCol title="Error — color only, no shake">
          <div style={{ width: 220 }}>
            <InlineBanner status="err" title="Wrong password" code="422">No shake under reduced-motion.</InlineBanner>
          </div>
        </RMCol>
        <RMCol title="Focus — always renders">
          <button style={{ height: 32, padding: '0 16px', borderRadius: 'var(--r-ctl)', border: '1px solid var(--sub-500)', background: 'var(--sub-700)', color: 'var(--ink-900)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, outline: '2px solid var(--press-500)', outlineOffset: 2, boxShadow: '0 0 0 6px rgba(31,162,196,.35)' }}>Export</button>
        </RMCol>
      </div>
    </div>,
  });

  // ---------- INV component inventory ----------
  function InvRow({ sample, name, note }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid var(--sub-700)' }}>
        <div style={{ width: 150, flex: 'none', display: 'flex', justifyContent: 'center' }}>{sample}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{name}</span>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', lineHeight: '16px' }}>{note}</span>
        </div>
      </div>
    );
  }
  FR.push({
    id: 'INV', w: 900, h: 700, title: 'Component inventory', note: 'the parts this flow composes',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '20px 24px', overflow: 'auto' }}>
      <InvRow name="Paper-sheet thumbnail" note="true aspect · page chip (tabular) + ⟳ rotation · resting/hover/selected/focus/lifted/deleted" sample={<PageSheet page={7} width={70} selected />} />
      <InvRow name="Drop-gap insertion bar" note="2px press-blue + end-caps; neighbors ease aside 180ms" sample={<InsertionBar height={90} />} />
      <InvRow name="Multi-drag count badge" note="selection carried as a fanned stack with a tabular N" sample={<span style={{ minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999, background: 'var(--press-500)', color: '#08191f', ...MONO, fontSize: 12, fontWeight: 600, display: 'grid', placeItems: 'center' }}>3</span>} />
      <InvRow name="Board header" note="doc name (mono) · M pages · zoom · select-all · N edits·Undo · Export ▶" sample={<Tag>24 pages</Tag>} />
      <InvRow name="Combine-files drop zone" note="dashed multi-drop · 'under 150 MB stays on this device'" sample={<span style={{ color: 'var(--ink-600)' }}><Icon name="combine" size={26} /></span>} />
      <InvRow name="Press job-readout card" note="queued / running (amber sweep + spinner) / cancel · resolves to check or code" sample={<StatusPill status="proc">running</StatusPill>} />
      <InvRow name="Success artifact row" note="left ok rule · mono filename · tabular bytes · Download + Open result" sample={<span style={{ color: 'var(--ok-500)' }}><Icon name="check" size={22} sw={2.4} /></span>} />
      <InvRow name="Error banner" note="err-tint fill · 3px err rule · small mono code token (bad_pdf_structure)" sample={<StatusPill status="err">code</StatusPill>} />
    </div>,
  });

  // ---------- NOTES interaction notes ----------
  function NoteSec({ title, children }) {
    return (
      <div style={{ marginBottom: 16 }}>
        <span style={{ ...EYE, display: 'block', marginBottom: 7 }}>{title}</span>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-700)', lineHeight: '19px' }}>{children}</div>
      </div>
    );
  }
  const K = ({ children }) => <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-900)', background: 'var(--sub-700)', border: '1px solid var(--sub-500)', borderRadius: 3, padding: '1px 5px' }}>{children}</span>;
  FR.push({
    id: 'NOTES', w: 760, h: 700, title: 'Interaction notes', note: 'visuals ↔ data & behavior',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '20px 24px', overflow: 'auto' }}>
      <NoteSec title="Selection idioms">Click = single · <b>Shift</b>+click = range (press-tint marquee) · <b>⌘/Ctrl</b>+click = toggle one · rubber-band marquee on empty board. Board header shows <b>N selected</b> (tabular) with bulk Rotate / Delete.</NoteSec>
      <NoteSec title="Operation log">Every edit appends to the log → header reads <b>N edits · Undo</b> and the primary reads <b>Export N edits ▶</b> to make the commit point explicit. All reorder/rotate/delete/combine are <b>client-side, in-memory, zero upload, no spinner</b>.</NoteSec>
      <NoteSec title="Undoable vs. committed">Everything on the board is undoable (<K>Ctrl+Z</K>/<K>Ctrl+Shift+Z</K>). The <b>server finalize is committed and not undoable</b> — that is why Export is an explicit press with an amber lifecycle, not an autosave.</NoteSec>
      <NoteSec title="Press lifecycle (202 + poll)">Export → pdf-lib <span style={MONO}>save()</span> in a Web Worker (<b>Assembling pages…</b>, still zero upload) → POST bytes to <span style={MONO}>/api/jobs/finalize</span> → 202 + <span style={MONO}>Location</span> → poll <span style={MONO}>GET /api/jobs/&#123;id&#125;</span> ~1.5s. Phase line = <span style={MONO}>state</span>+<span style={MONO}>stage</span>: <span style={MONO}>queued</span> → <span style={MONO}>running·finalize</span> → <span style={MONO}>succeeded</span>. <span style={MONO}>progress:null</span> ⇒ spinner, never a bar. Cancel → <span style={MONO}>DELETE /api/jobs/&#123;id&#125;</span>.</NoteSec>
      <NoteSec title="Errors">Branch on <span style={MONO}>error.code</span> — show <span style={MONO}>message</span> + a small mono code token, never the HTTP number or engine stderr. This flow: <span style={MONO}>file_too_large</span> (413) · <span style={MONO}>bad_pdf_structure</span> (400) · <span style={MONO}>queue_full</span> (429, honors <span style={MONO}>Retry-After</span>) · <span style={MONO}>disk_full</span> (507) · failed-job <span style={MONO}>engine_error</span>.</NoteSec>
      <NoteSec title="Keyboard model">Roving <b>tabindex</b>; <K>←</K><K>→</K> move focus · <K>Space</K> toggle select · <K>Shift</K>+<K>→</K> extend · <K>R</K> rotate 90 / <K>Shift+R</K> ccw · <K>Delete</K> remove · <K>Ctrl+A</K> select all / <K>Esc</K> deselect · <K>Ctrl+E</K> export. Edge auto-scroll within ~48px of board top/bottom while dragging.</NoteSec>
    </div>,
  });

  // ---------- Canvas ----------
  window.PFB.Canvas = function Canvas() {
    return <PFW.CanvasLayout frames={window.PFB_FRAMES} />;
  };
})();
