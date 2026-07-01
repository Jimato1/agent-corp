// pdf-forge flow D — frames D1–D5 (options, loading, split bands). → window.PFD_FRAMES
(function () {
  const PFW = window.PFW, PFD = window.PFD, DATA = window.PFD_DATA;
  const { Rail, WorkFrame, Icon, MONO } = PFW;
  const DW = 1320, DH = 820;
  const FR = (window.PFD_FRAMES = window.PFD_FRAMES || []);

  // D1 — empty · Split options
  FR.push({
    id: 'D1', w: DW, h: DH, title: 'Empty · Split options', note: 'mode selector + mono ranges field (live-validated)',
    el: <WorkFrame rail={<Rail active="split" />}
      header={<PFD.DHeader doc={DATA.docs.split} />}
      board={<PFD.DBoard pages={DATA.build(DATA.splitPages)} />}
      inspector={<PFD.DInspector op="split"><PFD.OpOptions op="split" /></PFD.DInspector>} />,
  });

  // D2 — empty · Rasterize options
  FR.push({
    id: 'D2', w: DW, h: DH, title: 'Empty · Rasterize options', note: 'pages + DPI + format segmented (png / jpeg / pdf)',
    el: <WorkFrame rail={<Rail active="rasterize" />}
      header={<PFD.DHeader doc={DATA.docs.split} />}
      board={<PFD.DBoard pages={DATA.build(DATA.splitPages)} />}
      inspector={<PFD.DInspector op="rasterize"><PFD.OpOptions op="rasterize" /></PFD.DInspector>} />,
  });

  // D3 — empty · OCR options
  FR.push({
    id: 'D3', w: DW, h: DH, title: 'Empty · OCR options', note: 'languages multiselect + deskew + sidecar (.txt alongside)',
    el: <WorkFrame rail={<Rail active="ocr" />}
      header={<PFD.DHeader doc={DATA.docs.ocr} />}
      board={<PFD.DBoard pages={DATA.build(DATA.ocrPages)} />}
      inspector={<PFD.DInspector op="ocr"><PFD.OpOptions op="ocr" /></PFD.DInspector>} />,
  });

  // D4 — loading input preview (lazy pdf.js render)
  FR.push({
    id: 'D4', w: DW, h: DH, title: 'Loading · input preview', note: 'pdf.js lazy render — blank paper placeholders + faint spinner',
    el: <WorkFrame rail={<Rail active="split" />}
      header={<PFD.DHeader doc={DATA.docs.split} />}
      board={<PFD.DBoard pages={DATA.build(DATA.splitPages)} loadingIds={['dp5', 'dp6', 'dp11', 'dp12', 'dp17']} />}
      inspector={<PFD.DInspector op="split"><PFD.OpOptions op="split" /></PFD.DInspector>} />,
  });

  // D5 — split multi-select · colored range bands
  (function () {
    const bandMap = {};
    DATA.bands.forEach((b) => b.ids.forEach((id) => { bandMap[id] = b.color; }));
    FR.push({
      id: 'D5', w: DW, h: DH, title: 'Split · colored range bands', note: 'two-way bound · each range a distinct band · 24 selected',
      el: <WorkFrame rail={<Rail active="split" />}
        header={<PFD.DHeader doc={DATA.docs.split} selectedCount={24} />}
        board={<PFD.DBoard pages={DATA.build(DATA.splitPages)} bandMap={bandMap} marquee={{ left: 14, top: 232, width: 340, height: 118 }}>
        </PFD.DBoard>}
        inspector={<PFD.DInspector op="split">
          <PFD.OpOptions op="split" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            {DATA.bands.map((b) => (
              <div key={b.range} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-850)', border: '1px solid var(--sub-600)' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: b.color, flex: 'none' }} />
                <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-900)' }}>{b.range}</span>
                <span style={{ marginLeft: 'auto', ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>book_{b.range}.pdf</span>
              </div>
            ))}
          </div>
        </PFD.DInspector>} />,
    });
  })();
})();
