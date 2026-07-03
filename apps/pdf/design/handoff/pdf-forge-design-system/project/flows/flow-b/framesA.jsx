// pdf-forge flow B — desktop frames B1–B7. → pushes to window.PFB_FRAMES
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW, PFB = window.PFB, DATA = window.PFB_DATA;
  const { Icon, Rail, BoardHeader, Board, JobCard, WorkFrame, MONO } = PFW;
  const { Button, PageSheet, Spinner, InlineBanner } = DS;

  const DW = 1320, DH = 820;
  const rail = <Rail active="organize" />;
  const FR = (window.PFB_FRAMES = window.PFB_FRAMES || []);

  function Callout({ top, left, right, children }) {
    return (
      <div style={{ position: 'absolute', top, left, right, zIndex: 5, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 9px', borderRadius: 'var(--r-pill)', background: 'rgba(14,17,22,.9)', border: '1px solid var(--sub-500)', fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--ink-700)', whiteSpace: 'nowrap' }}>{children}</div>
    );
  }
  function ClientCard({ label, sub }) {
    return (
      <div style={{ width: 320, borderRadius: 'var(--r-panel)', background: 'var(--sub-800)', border: '1px solid var(--sub-600)', padding: '18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Spinner size={22} tone="ink" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 600, color: 'var(--ink-900)' }}>{label}</span>
          <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-600)' }}>{sub}</span>
        </div>
      </div>
    );
  }
  function FannedStack({ top, left, count }) {
    const w = 132;
    return (
      <div style={{ position: 'absolute', top, left, zIndex: 6, width: w, height: Math.round(w * 1.414) }}>
        {[2, 1, 0].map((k) => (
          <div key={k} style={{ position: 'absolute', inset: 0, transform: `rotate(${(k - 1) * 4 + 1.5}deg) translate(${k * 5}px, ${k * 4}px) scale(1.04)`, transformOrigin: 'center', opacity: k === 0 ? 0.98 : 0.5 - k * 0.12 }}>
            <PageSheet page={3 + (2 - k)} width={w} lifted={k === 0} showChip={k === 0} />
          </div>
        ))}
        <span style={{ position: 'absolute', top: -10, right: -12, zIndex: 8, minWidth: 22, height: 22, padding: '0 6px', borderRadius: 'var(--r-pill)', background: 'var(--press-500)', color: '#08191f', ...MONO, fontSize: 12, fontWeight: 600, display: 'grid', placeItems: 'center', boxShadow: '0 2px 6px rgba(5,7,10,.5)' }}>{count}</span>
      </div>
    );
  }

  // B1 — Empty / inherits flow A
  FR.push({
    id: 'B1', w: DW, h: DH, title: 'Empty · inherits flow A', note: 'freshly opened doc, no edits — roving focus on page 1, Export disabled',
    el: <WorkFrame rail={rail}
      header={<BoardHeader edits={0} exportDisabled selectedCount={0} />}
      board={<Board pages={DATA.build({ pg1: { focused: true } })} />}
      inspector={<PFB.Inspector selectedCount={0} edits={0} editLog={[]} />} />,
  });

  // B2 — Editing / multi-select
  FR.push({
    id: 'B2', w: DW, h: DH, title: 'Editing · multi-select', note: '3 selected · one rotated 90° · 4 edits',
    el: <WorkFrame rail={rail}
      header={<BoardHeader edits={4} selectedCount={3} />}
      board={<Board pages={DATA.build({ pg3: { selected: true }, pg4: { selected: true, rotation: 90 }, pg5: { selected: true } })}>
        <Callout top={12} left={12}>
          <span style={{ color: 'var(--press-400)' }}>Click</span> single ·
          <span style={{ color: 'var(--press-400)' }}>Shift</span> range ·
          <span style={{ color: 'var(--press-400)' }}>⌘-click</span> toggle ·
          <span style={{ color: 'var(--press-400)' }}>drag</span> marquee
        </Callout>
      </Board>}
      inspector={<PFB.Inspector selectedCount={3} edits={4} editLog={DATA.editLog} />} />,
  });

  // B3 — Drag in progress (signature)
  (function () {
    let list = DATA.build({ pg6: { ghost: true } });
    const src = DATA.pages.find((p) => p.id === 'pg6');
    const lift = Object.assign({}, src, { id: 'pg6-lift', lifted: true, selected: false });
    const idx = list.findIndex((p) => p.id === 'pg11');
    list = [...list.slice(0, idx), lift, ...list.slice(idx)];
    FR.push({
      id: 'B3', w: DW, h: DH, title: 'Drag in progress · the signature', note: 'lifted sheet · dashed ghost origin · press-blue insertion bar',
      el: <WorkFrame rail={rail}
        header={<BoardHeader edits={4} selectedCount={0} />}
        board={<Board pages={list} insertBefore={idx}>
          <Callout top={12} left={12}>scale 1.04 · tilt 1.5° · neighbors ease aside 180ms</Callout>
        </Board>}
        inspector={<PFB.Inspector selectedCount={0} edits={4} editLog={DATA.editLog} />} />,
    });
  })();

  // B3b — Multi-drag fanned stack
  (function () {
    const idx = DATA.pages.findIndex((p) => p.id === 'pg11');
    FR.push({
      id: 'B3b', w: DW, h: DH, title: 'Multi-drag · fanned stack', note: 'selection carried as a stack with a count badge',
      el: <WorkFrame rail={rail}
        header={<BoardHeader edits={5} selectedCount={3} />}
        board={<Board pages={DATA.build({ pg3: { ghost: true }, pg4: { ghost: true }, pg5: { ghost: true } })} insertBefore={idx}>
          <FannedStack top={196} left={604} count={3} />
        </Board>}
        inspector={<PFB.Inspector selectedCount={3} edits={5} editLog={DATA.editLog} />} />,
    });
  })();

  // B4 — Assembling (client, pre-upload)
  FR.push({
    id: 'B4', w: DW, h: DH, title: 'Assembling · client, pre-upload', note: 'pdf-lib save() in a Web Worker — still zero upload, no amber yet',
    el: <WorkFrame rail={rail}
      header={<BoardHeader edits={5} exportProcessing selectedCount={0} />}
      board={<Board pages={DATA.build()} dim>
        <ClientCard label="Assembling pages…" sub="building on this device · zero upload" />
      </Board>}
      inspector={<PFB.Inspector selectedCount={0} edits={5} editLog={DATA.editLog} />} />,
  });

  // B5 — Press: queued
  FR.push({
    id: 'B5', w: DW, h: DH, title: 'Press lifecycle · queued', note: '202 + poll · indeterminate · "waiting for a free press"',
    el: <WorkFrame rail={rail}
      header={<BoardHeader edits={5} exportProcessing selectedCount={0} />}
      board={<Board pages={DATA.build()} dim>
        <JobCard state="queued" detail={`${DATA.doc.name} · ${DATA.doc.human}`} jobId={DATA.jobShort} />
      </Board>}
      inspector={<PFB.Inspector selectedCount={0} edits={5} editLog={DATA.editLog} />} />,
  });

  // B6 — Press: running — finalize
  FR.push({
    id: 'B6', w: DW, h: DH, title: 'Press lifecycle · running', note: 'the amber press at work · spinner, not a progress bar (progress:null)',
    el: <WorkFrame rail={rail}
      header={<BoardHeader edits={5} exportProcessing selectedCount={0} />}
      board={<Board pages={DATA.build()} dim>
        <JobCard state="running" detail={`${DATA.doc.name} · ${DATA.doc.human}`} jobId={DATA.jobShort} />
      </Board>}
      inspector={<PFB.Inspector selectedCount={0} edits={5} editLog={DATA.editLog} />} />,
  });

  // B7 — Large-file intercept (routes to flow C)
  FR.push({
    id: 'B7', w: DW, h: DH, title: 'Large-file intercept', note: '≥150 MB · quiet, not an error — routes to the server path (flow C)',
    el: <WorkFrame rail={rail}
      header={<BoardHeader edits={5} exportProcessing selectedCount={0} />}
      board={<Board pages={DATA.build()} dim>
        <div style={{ width: 440 }}>
          <InlineBanner status="info" title="This is large — pdf-forge will assemble it on the server instead"
            actions={<Button size="sm" variant="primary" rightIcon={<Icon name="external" size={15} />}>Continue on the server</Button>}>
            <span style={{ ...MONO, fontSize: 12 }}>report-2019-2026.pdf · 182 MB</span> exceeds the 150 MB in-browser limit.
          </InlineBanner>
        </div>
      </Board>}
      inspector={<PFB.Inspector selectedCount={0} edits={5} editLog={DATA.editLog} />} />,
  });
})();
