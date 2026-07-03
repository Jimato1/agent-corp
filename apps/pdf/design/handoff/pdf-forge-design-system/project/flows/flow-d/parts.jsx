// pdf-forge flow D — header, board, op-options, readout, artifacts, inspector. → window.PFD
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon, MONO = PFW.MONO, EYE = PFW.EYE;
  const { PageSheet, Input, Button, IconButton, SegmentedControl, Switch, Tag, StatusPill, InlineBanner, Spinner } = DS;

  const OP = { split: { title: 'Split', icon: 'scissors' }, rasterize: { title: 'Rasterize', icon: 'image' }, ocr: { title: 'OCR', icon: 'scan' } };
  const WIDTHS = { compact: 96, comfortable: 132, large: 180 };
  const lbl = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 };

  // ---- header with ▶ Run ----
  function DHeader({ doc, selectedCount = 0, size = 'compact', processing = false, runLabel = 'Run', runDisabled = false }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '10px 16px', background: 'var(--sub-800)', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <DS.Checkbox checked={selectedCount > 0} indeterminate={selectedCount > 0} aria-label="Select all" readOnly />
          <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="file" size={16} /></span>
          <span style={{ ...MONO, fontSize: 13, color: 'var(--ink-900)', whiteSpace: 'nowrap' }}>{doc.name}</span>
          <Tag>{doc.pages} pages</Tag>
          <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-600)' }}>{doc.human}</span>
        </div>
        {selectedCount > 0 ? <StatusPill status="selected" count={selectedCount}>selected</StatusPill> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <SegmentedControl ariaLabel="Sheet size" value={size} options={[{ value: 'compact', label: 'Compact' }, { value: 'comfortable', label: 'Comfortable' }, { value: 'large', label: 'Large' }]} />
          <Button variant="primary" processing={processing} disabled={runDisabled} leftIcon={<Icon name="play" size={13} />}>{processing ? 'Running…' : runLabel}</Button>
        </div>
      </div>
    );
  }

  // ---- board with colored range bands + multi-select ----
  function DBoard({ pages, size = 'compact', bandMap = null, selectedIds = [], marquee = null, dim = false, loadingIds = [], children }) {
    const width = WIDTHS[size] || 96;
    const gap = size === 'compact' ? 8 : 12;
    const S = new Set(selectedIds), L = new Set(loadingIds);
    return (
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', margin: 16, padding: '18px 16px', borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', position: 'relative' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap, position: 'relative' }}>
          {pages.map((p) => {
            const band = bandMap && bandMap[p.id];
            const h = Math.round(width / (p.rotation % 180 !== 0 ? 1 / p.aspect : p.aspect));
            if (L.has(p.id)) {
              return <div key={p.id} style={{ width, height: h, flex: 'none', background: 'var(--paper-0)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', boxShadow: 'var(--shadow-sheet-rest)', display: 'grid', placeItems: 'center' }}><Spinner size={18} tone="ink" /></div>;
            }
            return (
              <div key={p.id} style={{ position: 'relative', flex: 'none' }}>
                <PageSheet page={p.page} width={width} aspect={p.aspect} rotation={p.rotation} selected={S.has(p.id)} focused={p.focused} />
                {band ? (
                  <>
                    <div style={{ position: 'absolute', inset: 0, outline: `2px solid ${band}`, outlineOffset: -2, borderRadius: 2, pointerEvents: 'none', zIndex: 4 }} />
                    <div style={{ position: 'absolute', inset: 0, background: band, opacity: 0.16, borderRadius: 2, pointerEvents: 'none', zIndex: 4 }} />
                    <span style={{ position: 'absolute', top: 4, right: 4, width: 12, height: 12, borderRadius: 3, background: band, zIndex: 5 }} />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
        {marquee ? <div style={{ position: 'absolute', ...marquee, border: '1px solid var(--press-500)', background: 'var(--press-tint)', opacity: 0.5, borderRadius: 2 }} /> : null}
        {dim ? <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,10,14,.6)', borderRadius: 'var(--r-panel)', zIndex: 1 }} /> : null}
        {children ? <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2, padding: 20 }}>{children}</div> : null}
      </div>
    );
  }

  // ---- op options ----
  function MultiChip({ items }) {
    return (
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {items.map((it) => (
          <span key={it.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 26, padding: '0 9px', borderRadius: 'var(--r-ctl)', ...MONO, fontSize: 12, background: it.on ? 'var(--press-tint)' : 'var(--sub-700)', color: it.on ? 'var(--press-400)' : 'var(--ink-600)', border: it.on ? '1px solid transparent' : '1px dashed var(--sub-500)' }}>
            {it.on ? <Icon name="check" size={12} /> : <Icon name="plus" size={12} />}{it.label}
          </span>
        ))}
      </div>
    );
  }

  function OpOptions({ op, rangeError }) {
    if (op === 'split') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div><span style={lbl}>Mode</span><SegmentedControl ariaLabel="Split mode" value="ranges" options={[{ value: 'ranges', label: 'Ranges' }, { value: 'every_n', label: 'Every N' }, { value: 'single', label: 'Single' }]} /></div>
          <Input label="Ranges" mono defaultValue="1-10,11-20,21-end" error={rangeError} code={rangeError ? (rangeError.indexOf('past') >= 0 ? 'out_of_range' : 'invalid_options') : undefined} hint={rangeError ? undefined : 'Comma-separated · two-way bound to the board'} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...MONO, fontSize: 12, color: 'var(--ink-600)' }}><Icon name="zip" size={14} /> 3 ranges → 3 files</div>
        </div>
      );
    }
    if (op === 'rasterize') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Pages" mono defaultValue="1-end" error={rangeError} code={rangeError ? 'out_of_range' : undefined} />
          <Input label="DPI" mono defaultValue="150" suffix="dpi" />
          <div><span style={lbl}>Format</span><SegmentedControl ariaLabel="Format" value="png" options={[{ value: 'png', label: 'PNG' }, { value: 'jpeg', label: 'JPEG' }, { value: 'pdf', label: 'PDF' }]} /></div>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div><span style={lbl}>Languages</span><MultiChip items={[{ label: 'eng', on: true }, { label: 'deu', on: true }, { label: 'fra', on: false }]} /></div>
        <Switch label="Deskew pages" defaultChecked />
        <div><Switch label="Sidecar text file" defaultChecked /><span style={{ display: 'block', marginTop: 4, marginLeft: 44, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--ink-600)' }}>Add a .txt alongside the PDF</span></div>
      </div>
    );
  }

  // ---- job readout (amber press-at-work, inspector block) ----
  function DReadout({ state = 'running', phase, detail, note, jobId, onCancel }) {
    if (state === 'canceled') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 14px', borderRadius: 'var(--r-panel)', background: 'var(--sub-850)', border: '1px solid var(--sub-600)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="stop" size={18} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>Job canceled</span>
            <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>Nothing was kept.</span>
          </div>
        </div>
      );
    }
    return (
      <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--r-panel)', background: 'var(--sub-850)', border: '1px solid rgba(224,138,60,.4)' }}>
        <div style={{ position: 'absolute', top: 0, bottom: 0, width: '40%', background: 'linear-gradient(90deg,transparent,rgba(224,138,60,.16),transparent)', animation: 'pf-proc-sweep var(--proc-loop) var(--ease-press) infinite' }} />
        <div style={{ position: 'relative', padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <Spinner size={20} tone="proc" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--proc-500)' }}>{phase}</span>
              <span style={{ ...MONO, fontSize: 12, color: 'var(--ink-600)' }}>{detail}</span>
            </div>
          </div>
          {note ? <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>{note}</span> : null}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>job {jobId}</span>
            <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </div>
      </div>
    );
  }

  // ---- artifacts list reveal ----
  const MEDIA_ICON = { PDF: 'file', TXT: 'fileText', PNG: 'image' };
  function ArtifactsList({ result, crossfade }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '12px 14px', borderRadius: 'var(--r-ctl)', background: 'var(--ok-tint)', borderLeft: '3px solid var(--ok-500)', border: '1px solid rgba(75,174,126,.35)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--ok-500)' }}><Icon name="zip" size={18} /></span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 600, color: 'var(--ink-900)' }}>Download all</span>
            <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>{result.filename} · {result.human}</span>
          </div>
          <Button size="sm" variant="primary" leftIcon={<Icon name="download" size={15} />}>.zip</Button>
        </div>
        {result.artifacts.map((a) => (
          <div key={a.index} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-850)', border: '1px solid var(--sub-600)', borderLeft: '3px solid var(--ok-500)' }}>
            <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)', width: 14, flex: 'none' }}>{a.index}</span>
            <span style={{ display: 'inline-flex', color: 'var(--ink-600)', flex: 'none' }}><Icon name={MEDIA_ICON[a.media]} size={15} /></span>
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ ...MONO, fontSize: 12.5, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><Tag>{a.media}</Tag><span style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>{a.human} · {a.bytesExact} B</span></div>
            </div>
            <IconButton label={'Download ' + a.filename} variant="outlined"><Icon name="download" size={15} /></IconButton>
          </div>
        ))}
      </div>
    );
  }

  const ERR = {
    out_of_range: { t: 'Page 240 is past the end — this document has 210 pages', c: 'out_of_range' },
    invalid_options: { t: "Couldn't read that range", c: 'invalid_options', m: 'Use forms like 1-10, 12, 20-end.' },
    result_gone: { t: 'These results have expired and were cleared', c: 'result_gone', m: 'Re-run the job to get them again.', retry: 'Re-run' },
    queue_full: { t: 'Every press is busy right now', c: 'queue_full', m: 'Retrying in 30s…' },
    timeout: { t: 'OCR exceeded the time limit', c: 'timeout', m: 'Your input is untouched — try a smaller range.', retry: 'Try again' },
  };
  function ErrorBannerD({ kind }) {
    const e = ERR[kind];
    return <InlineBanner status="err" title={e.t} code={e.c} actions={e.retry ? <Button size="sm" variant="ghost">{e.retry}</Button> : (kind === 'queue_full' ? <Button size="sm" variant="ghost">Retry now</Button> : null)}>{e.m}</InlineBanner>;
  }

  // ---- inspector shell ----
  function DInspector({ op, children }) {
    const meta = OP[op] || OP.split;
    return (
      <aside style={{ width: 330, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)', minHeight: 0 }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
          <span style={EYE}>Inspector</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ display: 'inline-flex', color: 'var(--press-400)' }}><Icon name={meta.icon} size={17} /></span>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>{meta.title}</h3>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
      </aside>
    );
  }

  let injected = false;
  function inject() {
    if (injected || typeof document === 'undefined') return; injected = true;
    const s = document.createElement('style');
    s.textContent = '@keyframes pfd-reveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes pfd-fade{from{opacity:0}to{opacity:1}}';
    document.head.appendChild(s);
  }
  inject();

  window.PFD = { DHeader, DBoard, OpOptions, DReadout, ArtifactsList, ErrorBannerD, DInspector, MultiChip, OP };
})();
