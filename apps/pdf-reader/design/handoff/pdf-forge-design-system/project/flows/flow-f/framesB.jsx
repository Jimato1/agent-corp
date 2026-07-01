// pdf-forge flow F — desktop frames F6–F9. → window.PFF_FRAMES
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFF = window.PFF, DATA = window.PFF_DATA;
  const { Icon, Rail, JobCard, MONO, EYE } = PFW;
  const { Button, Toast } = DS;
  const FHeader = PFF.FHeader;

  const DW = 1320, DH = 820;
  const rail = <Rail active="extract" />;
  const FR = (window.PFF_FRAMES = window.PFF_FRAMES || []);
  const matched = ['fp1', 'fp3', 'fp7', 'fp8', 'fp12'];

  // F6 — server in-progress (lightweight press, no finalize)
  FR.push({
    id: 'F6', w: DW, h: DH, title: 'Server running · the lightweight press', note: 'Running — pdftotext · spinner (progress:null) · NO finalize phase',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="server" processing />}
      board={<PFF.FBoard pages={DATA.build()} />}
      textPane={<PFF.TextPane lines={DATA.text} showFind footer={false} />}
      inspector={<PFF.ExtractInspector tab="server" scope={DATA.scopeExample} processing />}
      overlay={<div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', background: 'rgba(8,10,14,.6)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <JobCard state="running" phase="Running — pdftotext" detail={`${DATA.doc.name} · ${DATA.doc.pages} pages`} jobId={DATA.jobShort} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: 'var(--ink-500)' }} />no finalize · read-only op
          </span>
        </div>
      </div>} />,
  });

  // F7 — server success (artifact row; text only)
  FR.push({
    id: 'F7', w: DW, h: DH, title: 'Server success · text/plain', note: 'artifact row: text/plain chip · "Text only — no PDF was created."',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="server" />}
      board={<PFF.FBoard pages={DATA.build()} />}
      textPane={<PFF.TextPane lines={DATA.text} query={DATA.find.query} matches={DATA.find.matches} footer={false} />}
      inspector={<PFF.ExtractInspector tab="server" scope={DATA.scopeExample} result={DATA.result} />}
      overlay={<div style={{ position: 'absolute', right: 16, bottom: 16, zIndex: 30 }}>
        <Toast status="ok" title="Text extracted">{DATA.result.filename} · {DATA.result.bytesExact} B</Toast>
      </div>} />,
  });

  // F8 — server multi-select scoping (two-way bound)
  FR.push({
    id: 'F8', w: DW, h: DH, title: 'Multi-select → page scope', note: 'selecting sheets writes the mono range · 4 selected → 1-3,7',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="server" selectedCount={4} />}
      board={<PFF.FBoard pages={DATA.build({ fp1: { selected: true }, fp2: { selected: true }, fp3: { selected: true }, fp7: { selected: true } })}
        marquee={{ left: 14, top: 18, width: 232, height: 150 }} />}
      textPane={<PFF.TextPane lines={DATA.text} showFind footer />}
      inspector={<PFF.ExtractInspector tab="server" scope={DATA.scopeFromSelection} selectedCount={4} />} />,
  });

  // F9 — out-of-range in context (pages field red + banner)
  FR.push({
    id: 'F9', w: DW, h: DH, title: 'Error · page scope out of range', note: '422 out_of_range · field gets err border · human message + mono code',
    el: <PFF.FWorkFrame rail={rail}
      header={<FHeader tab="server" />}
      board={<PFF.FBoard pages={DATA.build()} />}
      textPane={<PFF.TextPane lines={DATA.text} showFind footer />}
      inspector={<PFF.ExtractInspector tab="server" scope="1-88" scopeError="Page 88 is past the end — this document has 42 pages." />} />,
  });

  // F9b — error catalog
  FR.push({
    id: 'F9b', w: 660, h: 470, title: 'Error catalog · server path', note: 'human sentence + small mono code — never an HTTP number or stderr',
    el: <div style={{ position: 'absolute', inset: 0, background: 'var(--sub-850)', padding: 20, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <PFF.ErrorBannerF kind="not_a_pdf" />
      <PFF.ErrorBannerF kind="bad_pdf_structure" />
      <PFF.ErrorBannerF kind="out_of_range" />
      <PFF.ErrorBannerF kind="queue_full" />
      <PFF.ErrorBannerF kind="file_too_large" />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, padding: '9px 11px', borderRadius: 'var(--r-ctl)', background: 'rgba(214,165,60,.1)', border: '1px solid rgba(214,165,60,.35)' }}>
        <span style={{ color: 'var(--warn-500)', display: 'inline-flex' }}><Icon name="alert" size={15} /></span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-700)' }}>Empty result is <b>not</b> an error — it's the amber-gold scan advisory (offer OCR).</span>
      </div>
    </div>,
  });
})();
