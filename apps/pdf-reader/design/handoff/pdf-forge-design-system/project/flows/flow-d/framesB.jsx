// pdf-forge flow D — frames D6+ (lifecycle, errors, success, RM, mobile, docs) + Canvas. → window.PFD.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFD = window.PFD, DATA = window.PFD_DATA;
  const { Rail, WorkFrame, Icon, MONO, EYE } = PFW;
  const { Button, IconButton, Tag, Toast, Spinner, Switch, SegmentedControl } = DS;
  const DW = 1320, DH = 820;
  const FR = (window.PFD_FRAMES = window.PFD_FRAMES || []);

  // D6 — in-progress (OCR press)
  FR.push({
    id: 'D6', w: DW, h: DH, title: 'In-progress · Running — ocr', note: 'board dims · amber sweep + spinner (progress:null) · Cancel → DELETE',
    el: <WorkFrame rail={<Rail active="ocr" />}
      header={<PFD.DHeader doc={DATA.docs.ocr} processing />}
      board={<PFD.DBoard pages={DATA.build(DATA.ocrPages)} dim />}
      inspector={<PFD.DInspector op="ocr">
        <PFD.DReadout state="running" phase="Running — ocr" detail={`${DATA.docs.ocr.name} · ${DATA.docs.ocr.pages} pages`} note="longest job · per-page 120s timeout" jobId={DATA.jobShort} />
      </PFD.DInspector>} />,
  });

  // D7 — canceled
  FR.push({
    id: 'D7', w: DW, h: DH, title: 'Canceled', note: 'after DELETE /api/jobs/{id} — nothing kept',
    el: <WorkFrame rail={<Rail active="ocr" />}
      header={<PFD.DHeader doc={DATA.docs.ocr} />}
      board={<PFD.DBoard pages={DATA.build(DATA.ocrPages)} />}
      inspector={<PFD.DInspector op="ocr"><PFD.DReadout state="canceled" /><PFD.OpOptions op="ocr" /></PFD.DInspector>} />,
  });

  // D8 — 422 out_of_range
  FR.push({
    id: 'D8', w: DW, h: DH, title: 'Error · 422 out_of_range', note: 'offending field gets err border + small mono code',
    el: <WorkFrame rail={<Rail active="split" />}
      header={<PFD.DHeader doc={DATA.docs.split} />}
      board={<PFD.DBoard pages={DATA.build(DATA.splitPages)} />}
      inspector={<PFD.DInspector op="split"><PFD.OpOptions op="split" rangeError="Page 240 is past the end — this document has 210 pages." /><PFD.ErrorBannerD kind="out_of_range" /></PFD.DInspector>} />,
  });

  // D9 — 422 invalid_options
  FR.push({
    id: 'D9', w: DW, h: DH, title: 'Error · 422 invalid_options', note: 'bad range syntax · human message + mono code',
    el: <WorkFrame rail={<Rail active="split" />}
      header={<PFD.DHeader doc={DATA.docs.split} />}
      board={<PFD.DBoard pages={DATA.build(DATA.splitPages)} />}
      inspector={<PFD.DInspector op="split"><PFD.OpOptions op="split" rangeError="Couldn't read that range." /><PFD.ErrorBannerD kind="invalid_options" /></PFD.DInspector>} />,
  });

  // D10 — 404 result_gone
  FR.push({
    id: 'D10', w: 660, h: 300, title: 'Error · 404 result_gone', note: 'artifact fetched after TTL — re-run to regenerate',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PFD.ErrorBannerD kind="result_gone" />
      <PFD.ErrorBannerD kind="queue_full" />
      <PFD.ErrorBannerD kind="timeout" />
    </div>,
  });

  // D11 — success · OCR sidecar
  FR.push({
    id: 'D11', w: DW, h: DH, title: 'Success · OCR sidecar (zip + 2)', note: 'the MOMENT — artifacts reveal · PDF + TXT',
    el: <WorkFrame rail={<Rail active="ocr" />}
      header={<PFD.DHeader doc={DATA.docs.ocr} />}
      board={<PFD.DBoard pages={DATA.build(DATA.ocrPages)} />}
      inspector={<PFD.DInspector op="ocr"><PFD.ArtifactsList result={DATA.results.ocr} /></PFD.DInspector>}
      overlay={<div style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 30 }}><Toast status="ok" title="2 files ready">{DATA.results.ocr.filename}</Toast></div>} />,
  });

  // D12 — success · Split 3 ranges
  FR.push({
    id: 'D12', w: DW, h: DH, title: 'Success · Split 3 ranges', note: 'three PDF artifacts at /result/0..2',
    el: <WorkFrame rail={<Rail active="split" />}
      header={<PFD.DHeader doc={DATA.docs.split} />}
      board={<PFD.DBoard pages={DATA.build(DATA.splitPages)} />}
      inspector={<PFD.DInspector op="split"><PFD.ArtifactsList result={DATA.results.split} /></PFD.DInspector>} />,
  });

  // D13 — success · Rasterize PNGs
  FR.push({
    id: 'D13', w: 700, h: 470, title: 'Success · Rasterize (zip of PNGs)', note: 'PNG chips · page-001.png, page-002.png …',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-800)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sub-600)' }}><span style={EYE}>Inspector</span><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}><span style={{ color: 'var(--press-400)', display: 'inline-flex' }}><Icon name="image" size={17} /></span><h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600 }}>Rasterize</h3></div></div>
      <div style={{ padding: 16 }}><PFD.ArtifactsList result={DATA.results.rasterize} /></div>
    </div>,
  });

  // RM — reduced motion (in-progress + success)
  function RMCol({ title, children }) {
    return <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}><span style={EYE}>{title}</span><div style={{ flex: 1, background: 'var(--sub-700)', borderRadius: 'var(--r-panel)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)', padding: 14 }}>{children}</div></div>;
  }
  FR.push({
    id: 'RM', w: 820, h: 360, title: 'prefers-reduced-motion: reduce', note: 'static amber + working… · success = crossfade · focus rings stay',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, display: 'flex', gap: 16 }}>
      <RMCol title="In-progress — static">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-800)', border: '1px solid rgba(224,138,60,.4)' }}>
          <span style={{ width: 9, height: 9, borderRadius: 999, background: 'var(--proc-500)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--proc-500)' }}>working…</span><span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>Running — ocr</span></div>
        </div>
      </RMCol>
      <RMCol title="Success — crossfade in">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--r-ctl)', background: 'var(--ok-tint)', borderLeft: '3px solid var(--ok-500)', border: '1px solid rgba(75,174,126,.35)' }}>
          <span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="zip" size={16} /></span>
          <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)' }}>invoice-scan-ocr.zip</span>
        </div>
      </RMCol>
    </div>,
  });

  // ---- mobile ----
  function DmTop({ processing }) {
    return <div style={{ height: 48, flex: 'none', display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)' }}>
      <IconButton label="Menu"><Icon name="menu" /></IconButton>
      <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{DATA.docs.ocr.name}</span>
      <Button size="sm" variant="primary" processing={processing} leftIcon={<Icon name="play" size={13} />}>{processing ? 'Running…' : 'Run'}</Button>
    </div>;
  }
  function DmBoard({ dim, h = 260 }) {
    const pages = DATA.ocrPages.slice(0, 4);
    return <div style={{ flex: 'none', height: h, overflow: 'hidden', margin: 12, padding: 12, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', position: 'relative' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>{pages.map((p) => <DS.PageSheet key={p.id} page={p.page} width={166} aspect={p.aspect} />)}</div>
      {dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)', borderRadius: 'var(--r-panel)' }} /> : null}
    </div>;
  }
  function DmSheet({ children }) {
    return <div style={{ flex: 1, minHeight: 0, background: 'var(--sub-800)', borderTop: '1px solid var(--sub-600)', borderRadius: 'var(--r-panel) var(--r-panel) 0 0', boxShadow: '0 -12px 32px rgba(5,7,10,.4)', padding: '10px 14px 16px', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>
      <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--sub-500)', alignSelf: 'center', flex: 'none' }} />{children}</div>;
  }
  const phone = { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', background: 'var(--sub-850)' };

  FR.push({
    id: 'Dm1', w: 390, h: 800, title: 'Mobile · options', note: 'inspector = bottom sheet',
    el: <div style={phone}><DmTop /><DmBoard h={300} /><DmSheet>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ color: 'var(--press-400)', display: 'inline-flex' }}><Icon name="scan" size={16} /></span><span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600 }}>OCR</span></div>
      <PFD.OpOptions op="ocr" />
    </DmSheet></div>,
  });
  FR.push({
    id: 'Dm2', w: 390, h: 800, title: 'Mobile · in-progress', note: 'dim board · amber readout bottom sheet',
    el: <div style={phone}><DmTop processing /><DmBoard dim h={300} /><DmSheet>
      <PFD.DReadout state="running" phase="Running — ocr" detail={`${DATA.docs.ocr.name} · 210 pages`} jobId={DATA.jobShort} />
    </DmSheet></div>,
  });
  FR.push({
    id: 'Dm3', w: 390, h: 800, title: 'Mobile · success', note: 'artifacts list stacked in the bottom sheet',
    el: <div style={phone}><DmTop /><DmBoard h={240} /><DmSheet><PFD.ArtifactsList result={DATA.results.ocr} /></DmSheet></div>,
  });

  // INV
  function InvRow({ sample, name, note }) {
    return <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '1px solid var(--sub-700)' }}>
      <div style={{ width: 130, flex: 'none', display: 'flex', justifyContent: 'center' }}>{sample}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>{name}</span><span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', lineHeight: '16px' }}>{note}</span></div>
    </div>;
  }
  FR.push({
    id: 'INV', w: 900, h: 520, title: 'Component inventory', note: 'the parts flow D composes',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '16px 24px', overflow: 'auto' }}>
      <InvRow name="Op-options form" note="mode selector · mono range field · DPI · format segmented · language multiselect · toggles" sample={<SegmentedControl value="png" options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }]} />} />
      <InvRow name="Colored range band" note="split cut boundaries — distinct accessible tints per range" sample={<span style={{ display: 'flex', gap: 3 }}><span style={{ width: 14, height: 20, borderRadius: 2, background: '#1FA2C4' }} /><span style={{ width: 14, height: 20, borderRadius: 2, background: '#4BAE7E' }} /><span style={{ width: 14, height: 20, borderRadius: 2, background: '#D6A53C' }} /></span>} />
      <InvRow name="Job readout (press at work)" note="amber sweep + spinner (progress:null) + phase line + Cancel→DELETE" sample={<DS.StatusPill status="proc">ocr</DS.StatusPill>} />
      <InvRow name="Error banner + mono code" note="human sentence + small code (out_of_range, result_gone) — no HTTP number" sample={<DS.StatusPill status="err">code</DS.StatusPill>} />
      <InvRow name="Artifacts list reveal" note="Download all (.zip) + per-artifact rows: index · filename · media chip · bytes · Download" sample={<span style={{ color: 'var(--ok-500)' }}><Icon name="zip" size={22} /></span>} />
      <InvRow name="Media-type chip" note="PDF / TXT / PNG · mono, tabular bytes (2.0 MB · 2,096,331 bytes)" sample={<span style={{ display: 'flex', gap: 4 }}><Tag>PDF</Tag><Tag>TXT</Tag></span>} />
    </div>,
  });

  // NOTES
  function NoteSec({ title, children }) { return <div style={{ marginBottom: 15 }}><span style={{ ...EYE, display: 'block', marginBottom: 7 }}>{title}</span><div style={{ fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-700)', lineHeight: '19px' }}>{children}</div></div>; }
  const M = ({ children }) => <span style={MONO}>{children}</span>;
  FR.push({
    id: 'NOTES', w: 760, h: 520, title: 'Interaction notes', note: 'derived artifacts — the input is never mutated',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: '16px 24px', overflow: 'auto' }}>
      <NoteSec title="Two-way bind">Selecting sheets writes the mono range string; editing the range re-highlights the sheets. For <b>split</b>, each declared range is a distinct colored band so cut boundaries are visible before submit (<M>3 ranges → 3 files</M>).</NoteSec>
      <NoteSec title="Lifecycle (202 + poll, no SSE)">Run → <M>POST /api/jobs/&#123;op&#125;</M> → 202 + <M>Location</M> → board dims, inspector shows the amber press. Poll <M>GET /api/jobs/&#123;id&#125;</M> ~1.5s; phase = <M>state</M>+<M>stage</M> (e.g. <b>Running — ocr</b>). <M>progress:null</M> ⇒ spinner, never a bar. Cancel → <M>DELETE</M> → "Job canceled. Nothing was kept."</NoteSec>
      <NoteSec title="The signature moment">On <M>succeeded</M> the readout expands into the <M>artifacts[]</M> reveal: a <b>Download all (.zip)</b> row (→ <M>/result</M>) plus one row per artifact (→ <M>/result/&#123;index&#125;</M>) with a media chip + tabular bytes. This reveal is where boldness is spent — everything else stays quiet.</NoteSec>
      <NoteSec title="Errors">Submit-time <M>422</M> (<M>out_of_range</M>, <M>invalid_options</M>) reddens the offending field + shows a banner with a small mono code. A stale fetch is <M>404 result_gone</M> → re-run. Never show the HTTP number or engine stderr.</NoteSec>
      <NoteSec title="Reduced motion">No sweep/spin → static amber + cycling <M>working…</M>; the success reveal is an opacity crossfade; no error shake; focus rings still render.</NoteSec>
    </div>,
  });

  window.PFD.Canvas = function Canvas() { return <PFW.CanvasLayout frames={window.PFD_FRAMES} />; };
})();
