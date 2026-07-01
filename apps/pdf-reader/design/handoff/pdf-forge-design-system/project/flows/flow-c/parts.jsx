// pdf-forge flow C — preview, trays, options, press overlay, artifact, privacy, errors. → window.PFC
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon, MONO = PFW.MONO, EYE = PFW.EYE;
  const { Input, Button, IconButton, Select, Switch, Tag, InlineBanner } = DS;
  const JobCard = PFW.JobCard;

  const OP = {
    merge: 'Merge', compress: 'Compress', encrypt: 'Encrypt', decrypt: 'Decrypt', permissions: 'Permissions',
    linearize: 'Linearize', repair: 'Repair', 'image-to-pdf': 'Image → PDF', sanitize: 'Sanitize',
  };
  const OPICON = { merge: 'combine', compress: 'compress', encrypt: 'lock', decrypt: 'unlock', permissions: 'shield', linearize: 'align', repair: 'wrench', 'image-to-pdf': 'image', sanitize: 'eraser' };
  const lbl = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 };

  // big centered input sheet preview (client-render) or recessed drop target
  function CenterPreview({ input, op, empty }) {
    return (
      <div style={{ flex: 1, minHeight: 0, margin: 16, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative' }}>
        {empty ? (
          <div style={{ width: 420, borderRadius: 'var(--r-panel)', border: '2px dashed var(--sub-500)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '48px 24px', textAlign: 'center' }}>
            <span style={{ color: 'var(--ink-600)', display: 'inline-flex' }}><Icon name="file" size={30} sw={1.6} /></span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 15, fontWeight: 500, color: 'var(--ink-700)' }}>Choose a {op} input</span>
            <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>rendered on this device first</span>
          </div>
        ) : (
          <div style={{ width: 372, height: 526, background: 'var(--paper-0)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', boxShadow: '0 2px 12px rgba(5,7,10,.55)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: '40px 44px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ height: 15, width: '58%', background: '#c9c9c3', borderRadius: 2 }} />
              {[94, 99, 90, 96, 78, 92, 86, 97, 72, 90, 82, 95].map((w, i) => <div key={i} style={{ height: 5, width: w + '%', background: '#dcdcd6', borderRadius: 1 }} />)}
            </div>
            <span style={{ position: 'absolute', left: -3, bottom: -6, background: 'rgba(14,17,22,.82)', color: 'var(--ink-900)', ...MONO, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{input.name}</span>
          </div>
        )}
      </div>
    );
  }

  // image-to-pdf ordered tray (with a drag-in-progress state)
  function ImageTray({ images, dragging }) {
    return (
      <div style={{ flex: 1, minHeight: 0, margin: 16, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', padding: 24, display: 'flex', alignItems: 'center', gap: 14 }}>
        {images.map((im, i) => {
          const w = im.aspect > 1 ? 180 : 132; const h = Math.round(w / im.aspect);
          if (dragging && i === 0) {
            return <React.Fragment key={im.id}>
              <div style={{ width: 132, height: 187, borderRadius: 2, border: '1px dashed var(--sub-500)', flex: 'none' }} />
              <div style={{ width: 4, height: 187, flex: 'none', position: 'relative' }}><div style={{ position: 'absolute', inset: 0, background: 'var(--press-500)', borderRadius: 2 }} /></div>
            </React.Fragment>;
          }
          return (
            <div key={im.id} style={{ position: 'relative', flex: 'none', width: w, height: h, background: 'var(--paper-0)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', boxShadow: dragging && i === images.length - 1 ? 'var(--shadow-sheet-lift)' : 'var(--shadow-sheet-rest)', transform: dragging && i === images.length - 1 ? 'rotate(1.5deg) scale(1.04)' : 'none', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, background: im.aspect > 1 ? 'linear-gradient(120deg,#e8eef2,#d5dde3)' : 'linear-gradient(160deg,#eceae4,#dcd7cd)' }} />
              <span style={{ position: 'absolute', left: -3, bottom: -6, background: 'rgba(14,17,22,.82)', color: 'var(--ink-900)', ...MONO, fontSize: 10, padding: '2px 6px', borderRadius: 999 }}>{i + 1}</span>
              <button style={{ position: 'absolute', top: 4, right: 4, width: 18, height: 18, borderRadius: 4, border: 'none', background: 'rgba(14,17,22,.7)', color: 'var(--ink-900)', display: 'grid', placeItems: 'center', cursor: 'pointer' }} aria-label="Remove"><Icon name="x" size={11} /></button>
            </div>
          );
        })}
      </div>
    );
  }

  // merge reorder rows (inspector)
  function MergeTray({ files, dragIndex }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        {files.map((f, i) => (
          <React.Fragment key={f.id}>
            {dragIndex === i ? <div style={{ height: 2, background: 'var(--press-500)', borderRadius: 1, margin: '2px 0' }} /> : null}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '9px 10px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-850)', border: '1px solid var(--sub-600)', boxShadow: dragIndex === i - 1 ? 'var(--shadow-sheet-lift)' : 'none', transform: dragIndex === i - 1 ? 'rotate(1deg) scale(1.02)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ color: 'var(--ink-500)', display: 'inline-flex', cursor: 'grab' }}><Icon name="menu" size={14} /></span>
                <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-500)' }}>{i + 1}</span>
                <span style={{ flex: 1, ...MONO, fontSize: 12, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                {f.enc ? <span style={{ color: 'var(--warn-500)', display: 'inline-flex' }}><Icon name="lock" size={13} /></span> : null}
                <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>{f.human}</span>
              </div>
              {f.enc ? <Input size="sm" mono type="password" defaultValue="password1" prefix={<Icon name="lock" size={13} />} /> : null}
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  function OpOptions({ op }) {
    if (op === 'compress') return <><div><span style={lbl}>Preset</span><Select mono options={['screen', 'ebook', 'printer', 'prepress']} defaultValue="ebook" /></div><Input label="Color DPI" mono defaultValue="150" suffix="dpi" hint="72–600" /></>;
    if (op === 'image-to-pdf') return <><div><span style={lbl}>Page size</span><Select options={[{ value: 'auto', label: 'Auto (match image)' }, { value: 'a4', label: 'A4' }, { value: 'letter', label: 'US Letter' }]} defaultValue="auto" /></div><Switch label="Lossless" /></>;
    if (op === 'sanitize') return <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}><Switch label="Strip metadata" defaultChecked /><Switch label="Strip attachments" defaultChecked /></div>;
    if (op === 'encrypt') return <><Input label="Owner password" mono type="password" defaultValue="secret12" /><Input label="Confirm" mono type="password" defaultValue="secret12" /></>;
    if (op === 'merge') return <MergeTray files={window.PFC_DATA.mergeFiles} />;
    return <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-600)', lineHeight: '19px' }}>{window.PFC_DATA.desc[op] || 'No options — drop an input and Submit.'}</p>;
  }

  function PrivacyLabel({ uploading }) {
    return uploading ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 'var(--r-ctl)', background: 'rgba(214,165,60,.12)', border: '1px solid rgba(214,165,60,.4)', ...MONO, fontSize: 11, color: 'var(--warn-500)' }}>
        <Icon name="align" size={13} /> Uploading to your pdf-forge — over your LAN only
      </div>
    ) : (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>
        <span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="lock" size={13} /></span> Client-side until you Submit — nothing has left this machine
      </div>
    );
  }

  // inspector shell
  function CInspector({ op, children, uploading, submitProcessing, artifact }) {
    return (
      <aside style={{ width: 336, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)', minHeight: 0 }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
          <span style={EYE}>Operation</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}><span style={{ color: 'var(--press-400)', display: 'inline-flex' }}><Icon name={OPICON[op]} size={17} /></span><h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>{OP[op]}</h3></div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {artifact ? artifact : <OpOptions op={op} />}
          {children}
        </div>
        <div style={{ padding: 16, borderTop: '1px solid var(--sub-600)', display: 'flex', flexDirection: 'column', gap: 12, flex: 'none' }}>
          <PrivacyLabel uploading={uploading} />
          <Button variant="primary" size="lg" block processing={submitProcessing} disabled={!!artifact}>{submitProcessing ? 'Submitting…' : 'Submit'}</Button>
        </div>
      </aside>
    );
  }

  // press overlay (dim + JobCard)
  function PressOverlay({ state, phase, detail, code, onCancel }) {
    return (
      <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', background: 'rgba(8,10,14,.6)', padding: 24 }}>
        <JobCard state={state} phase={phase} detail={detail} code={code} jobId={window.PFC_DATA.jobShort} onCancel={onCancel} />
      </div>
    );
  }

  // success artifact / savings row
  function SavingsRow({ r, kept }) {
    if (kept === 'input') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 'var(--r-ctl)', background: 'var(--ok-tint)', borderLeft: '3px solid var(--ok-500)', border: '1px solid rgba(75,174,126,.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="check" size={18} sw={2.4} /></span>
            <span style={{ ...MONO, fontSize: 13, color: 'var(--ink-900)', flex: 1 }}>{r.filename}</span>
            <Button size="sm" variant="primary" className="pfc-focus" leftIcon={<Icon name="download" size={15} />}>Download</Button>
          </div>
          <span style={{ display: 'inline-flex', alignSelf: 'flex-start', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 999, background: 'rgba(214,165,60,.14)', color: 'var(--warn-500)', fontFamily: 'var(--font-ui)', fontSize: 11 }}>Kept your original — compression would have made it larger</span>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderRadius: 'var(--r-ctl)', background: 'var(--ok-tint)', borderLeft: '3px solid var(--ok-500)', border: '1px solid rgba(75,174,126,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="check" size={18} sw={2.4} /></span>
          <div style={{ flex: 1, minWidth: 0 }}><div style={{ ...MONO, fontSize: 13, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filename}</div><div style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>{r.human} · {r.bytes} B</div></div>
          <Button size="sm" variant="primary" className="pfc-focus" leftIcon={<Icon name="download" size={15} />}>Download</Button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...MONO, fontSize: 12 }}>
          <span style={{ color: 'var(--ink-600)' }}>{r.inHuman}</span>
          <span style={{ color: 'var(--ink-500)' }}>→</span>
          <span style={{ color: 'var(--ink-900)' }}>{r.human}</span>
          <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 999, background: 'rgba(75,174,126,.16)', color: 'var(--ok-500)', fontWeight: 600 }}>{r.delta}</span>
        </div>
      </div>
    );
  }

  const ERR = {
    file_too_large: { t: 'This file is over the 200 MB limit', c: 'file_too_large' },
    not_a_pdf: { t: "That isn't a PDF", c: 'not_a_pdf', m: "pdf-forge checks the file's contents, not its name." },
    bad_pdf_structure: { t: 'This PDF is too damaged to open', c: 'bad_pdf_structure', m: 'Try the Repair op first.' },
    queue_full: { t: 'Every press is busy', c: 'queue_full', m: 'Retrying in 30s…' },
    disk_full: { t: 'The server is low on working storage', c: 'disk_full', m: 'Free some space and retry.' },
    timeout: { t: 'This job hit the 120s time limit and was stopped', c: 'timeout', m: 'Try a smaller file or fewer pages.' },
    engine_error: { t: "The repair engine couldn't finish this file", c: 'engine_error' },
  };
  function ErrorBannerC({ kind }) {
    const e = ERR[kind];
    return <InlineBanner status="err" title={e.t} code={e.c} actions={<Button size="sm" variant="ghost">Try again</Button>}>{e.m}</InlineBanner>;
  }

  window.PFC = { CenterPreview, ImageTray, MergeTray, OpOptions, PrivacyLabel, CInspector, PressOverlay, SavingsRow, ErrorBannerC, OP, OPICON };
})();
