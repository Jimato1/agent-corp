// pdf-forge flow F — mobile + reduced-motion + docs + Canvas. → window.PFF.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFF = window.PFF, DATA = window.PFF_DATA;
  const { Icon, JobCard, MONO, EYE } = PFW;
  const { Button, IconButton, Tag, StatusPill, Tabs, Spinner, InlineBanner } = DS;
  const FR = (window.PFF_FRAMES = window.PFF_FRAMES || []);
  const matched = ['fp1', 'fp3', 'fp7', 'fp8'];

  // ---- mobile pieces ----
  function FMTop({ tab = 'quick', processing }) {
    return (
      <div style={{ height: 48, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)' }}>
        <IconButton label="Menu"><Icon name="menu" /></IconButton>
        <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="file" size={15} /></span>
        <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{DATA.doc.name}</span>
        <div style={{ marginLeft: 'auto' }}>
          {tab === 'server'
            ? <Button size="sm" variant="primary" processing={processing} leftIcon={<Icon name="text" size={14} />}>{processing ? 'Extracting…' : 'Extract'}</Button>
            : <Button size="sm" variant="secondary" leftIcon={<Icon name="copy" size={14} />}>Copy all</Button>}
        </div>
      </div>
    );
  }
  function FMBoard({ overrides, matchedIds = [], scanned, dim, h = 244 }) {
    const M = new Set(matchedIds);
    const pages = DATA.pages.slice(0, 4).map((p) => Object.assign({ selected: false, rotation: p.rotation }, p, (overrides || {})[p.id] || {}));
    return (
      <div style={{ flex: 'none', height: h, overflow: 'hidden', margin: 12, padding: 12, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {pages.map((p) => <PFF.MatchSheet key={p.id} page={p.page} width={166} aspect={p.aspect} rotation={p.rotation} matched={M.has(p.id)} selected={p.selected} scanned={scanned} />)}
        </div>
        {dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)', borderRadius: 'var(--r-panel)' }} /> : null}
      </div>
    );
  }
  function FMSheet({ children, h }) {
    return (
      <div style={{ flex: h ? 'none' : 1, height: h, minHeight: 0, background: 'var(--sub-800)', borderTop: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel) var(--r-panel) 0 0', boxShadow: '0 -12px 32px rgba(5,7,10,.4)', padding: '10px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sub-500)', alignSelf: 'center', flex: 'none' }} />
        {children}
      </div>
    );
  }
  const phone = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)' };

  // F1m — mobile empty
  FR.push({
    id: 'F1m', w: 390, h: 800, title: 'Mobile · empty', note: 'inspector = bottom sheet · board 2-up',
    el: <div style={phone}>
      <FMTop tab="quick" />
      <FMBoard h={300} />
      <FMSheet h={230}>
        <Tabs value="quick" tabs={[{ id: 'quick', label: 'Quick text' }, { id: 'server', label: 'Batch extract' }]} />
        <div style={{ marginTop: 4 }}><PFF.PrivacyLabel text="Stays on this device — nothing uploaded" /></div>
        <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-600)', lineHeight: '18px' }}>Text is read straight from the pages with pdf.js — find and copy right here.</p>
      </FMSheet>
    </div>,
  });

  // F3m — mobile client success (text pane STACKED under board)
  FR.push({
    id: 'F3m', w: 390, h: 800, title: 'Mobile · client success', note: 'text pane stacks UNDER the board · single column',
    el: <div style={phone}>
      <FMTop tab="quick" />
      <FMBoard h={210} matchedIds={matched} />
      <div style={{ flex: 1, minHeight: 0, margin: '0 12px 12px', display: 'flex', flexDirection: 'column', background: 'var(--sub-850)', border: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel)', overflow: 'hidden' }}>
        <PFF.FindBox query={DATA.find.query} matches={DATA.find.matches} />
        <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', padding: '8px 0' }}>
          {DATA.text.slice(0, 12).map((ln, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '0 12px' }}>
              <span style={{ ...MONO, fontSize: 11, lineHeight: '18px', color: 'var(--ink-500)', width: 18, textAlign: 'right', flex: 'none' }}>{ln === '' ? '' : i + 1}</span>
              <span style={{ ...MONO, fontSize: 12, lineHeight: '18px', color: 'var(--ink-700)', whiteSpace: 'pre-wrap' }}>{ln.replace('invoice', '')}{ln.includes('invoice') ? <mark style={{ background: 'var(--press-tint)', color: 'var(--ink-900)', borderBottom: '2px solid var(--press-500)' }}>invoice</mark> : null}</span>
            </div>
          ))}
        </div>
      </div>
    </div>,
  });

  // F6m — mobile server in-progress
  FR.push({
    id: 'F6m', w: 390, h: 800, title: 'Mobile · server running', note: 'dimmed board · amber job bottom sheet · no finalize',
    el: <div style={phone}>
      <FMTop tab="server" processing />
      <FMBoard h={300} dim />
      <FMSheet>
        <JobCard state="running" phase="Running — pdftotext" detail={`${DATA.doc.name} · 42 pages`} jobId={DATA.jobShort} width={360} />
        <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)', alignSelf: 'center' }}>no finalize · read-only op</span>
      </FMSheet>
    </div>,
  });

  // F7m — mobile server success
  FR.push({
    id: 'F7m', w: 390, h: 800, title: 'Mobile · server success', note: 'artifact in a bottom sheet · text only',
    el: <div style={phone}>
      <FMTop tab="server" />
      <FMBoard h={330} />
      <FMSheet>
        <PFF.ArtifactRowText filename={DATA.result.filename} human={DATA.result.human} bytesExact={DATA.result.bytesExact} />
      </FMSheet>
    </div>,
  });

  // RM — reduced motion
  function RMCol({ title, children }) {
    return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <span style={EYE}>{title}</span>
      <div style={{ flex: 1, display: 'grid', placeItems: 'center', background: 'var(--sub-700)', borderRadius: 'var(--r-panel)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', padding: 16, minHeight: 140 }}>{children}</div>
    </div>;
  }
  FR.push({
    id: 'RM', w: 900, h: 430, title: 'prefers-reduced-motion: reduce', note: 'server press → static amber + working… · no spin · focus rings stay',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, display: 'flex', gap: 16 }}>
      <RMCol title="Server press — static">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--proc-500)' }} />
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--proc-500)' }}>working…</span>
        </div>
      </RMCol>
      <RMCol title="Highlight — no motion">
        <div style={{ ...MONO, fontSize: 13, color: 'var(--ink-700)' }}>pay each <mark style={{ background: 'var(--press-tint)', color: 'var(--ink-900)', borderBottom: '2px solid var(--press-500)' }}>invoice</mark> within</div>
      </RMCol>
      <RMCol title="Focus — always renders">
        <button style={{ height: 32, padding: '0 16px', borderRadius: 'var(--r-ctl)', border: '1px solid var(--sub-500)', background: 'var(--sub-700)', color: 'var(--ink-900)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, outline: '2px solid var(--press-500)', outlineOffset: 2, boxShadow: '0 0 0 6px rgba(31,162,196,.35)' }}>Extract</button>
      </RMCol>
    </div>,
  });

  // INV — component inventory
  function InvRow({ sample, name, note }) {
    return <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '1px solid var(--sub-700)' }}>
      <div style={{ width: 140, flex: 'none', display: 'flex', justifyContent: 'center' }}>{sample}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{name}</span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', lineHeight: '16px' }}>{note}</span>
      </div>
    </div>;
  }
  FR.push({
    id: 'INV', w: 900, h: 560, title: 'Component inventory', note: 'the parts flow F composes',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '18px 24px', overflow: 'auto' }}>
      <InvRow name="Two-tab inspector" note="Quick text (this device) · Batch extract (server) — press-blue active underline" sample={<StatusPill status="selected">tabs</StatusPill>} />
      <InvRow name="Privacy micro-label" note="'Stays on this device — nothing uploaded' · lock glyph, ink-600 mono" sample={<PFF.PrivacyLabel text="on device" />} />
      <InvRow name="Mono text pane + find box" note="fs-data mono, line gutter · press-tint highlight + press underline on matches" sample={<span style={{ ...MONO, fontSize: 12, color: 'var(--ink-700)' }}>an <mark style={{ background: 'var(--press-tint)', borderBottom: '2px solid var(--press-500)', color: 'var(--ink-900)' }}>invoice</mark></span>} />
      <InvRow name="Page-scope input" note="mono range, two-way bound to board selection (1-3,7)" sample={<Tag dot="accent" variant="accent">1-3,7</Tag>} />
      <InvRow name="Amber press readout" note="lightweight · 'Running — pdftotext' · NO finalize phase · Cancel→DELETE" sample={<StatusPill status="proc">pdftotext</StatusPill>} />
      <InvRow name="Success artifact row" note="text/plain chip · tabular bytes · 'Text only — no PDF was created.'" sample={<Tag>text/plain</Tag>} />
      <InvRow name="Scan advisory (warn)" note="not an error — no selectable text → offer OCR" sample={<StatusPill status="warn">scan</StatusPill>} />
      <InvRow name="Error banner + code" note="human sentence + small mono code (not_a_pdf, out_of_range)" sample={<StatusPill status="err">code</StatusPill>} />
    </div>,
  });

  // NOTES — interaction notes
  function NoteSec({ title, children }) {
    return <div style={{ marginBottom: 15 }}>
      <span style={{ ...EYE, display: 'block', marginBottom: 7 }}>{title}</span>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-700)', lineHeight: '19px' }}>{children}</div>
    </div>;
  }
  const M = ({ children }) => <span style={MONO}>{children}</span>;
  FR.push({
    id: 'NOTES', w: 760, h: 560, title: 'Interaction notes', note: 'read-only — nothing mutates the document',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '18px 24px', overflow: 'auto' }}>
      <NoteSec title="Two paths, one inspector">Tab 1 <b>Quick text (this device)</b> = pdf.js, zero upload, instant, live find/highlight, Copy all / Download .txt built locally. Tab 2 <b>Batch extract (server)</b> = <M>POST /api/jobs/extract-text</M> → 202 → poll → <M>text/plain</M>. Switching tabs and changing page scope are the only reversible actions.</NoteSec>
      <NoteSec title="Client streaming + highlight">Per-page text streams into the mono pane as pages render (faint <M>extracting page N…</M> ticker). A find query highlights matched runs on <b>both</b> the pane lines and the sheet faces (press-tint wash + press underline). No job, no artifact, <b>no download moment</b> — text never leaves the device.</NoteSec>
      <NoteSec title="Two-way selection ↔ range">Board multi-select writes the <M>pages</M> range (4 selected → <M>1-3,7</M>); editing the range updates the selection. Multi-select exists ONLY to scope the server extract — it mutates nothing.</NoteSec>
      <NoteSec title="Server lifecycle">Submit → brief upload spinner → 202 + <M>Location</M> → poll <M>GET /api/jobs/&#123;id&#125;</M>. Phase = <M>stage</M> → <b>Running — pdftotext</b>. <M>progress:null</M> ⇒ spinner, never a bar. <b>No finalize phase</b> (read-only). Cancel → <M>DELETE /api/jobs/&#123;id&#125;</M>. Success result is <M>text/plain</M> — the row says “Text only — no PDF was created.”</NoteSec>
      <NoteSec title="Empty ≠ error">A valid PDF with no text layer is a <b>warn-gold advisory</b> (offer OCR), never a red error. Errors (<M>not_a_pdf</M>, <M>bad_pdf_structure</M>, <M>out_of_range</M>) show a human sentence + small mono code; 422 also reddens the pages field.</NoteSec>
      <NoteSec title="Reduced motion">Server press → static amber + cycling <M>working…</M> (no spin); highlights appear without transition; no error shake; focus rings still render.</NoteSec>
    </div>,
  });

  window.PFF.Canvas = function Canvas() { return <PFW.CanvasLayout frames={window.PFF_FRAMES} />; };
})();
