// pdf-forge flow E — password field, toggles, disclaimer, locked sheet, inspector, press, success, errors. → window.PFE
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon, MONO = PFW.MONO, EYE = PFW.EYE;
  const { Input, Button, Switch, SegmentedControl, InlineBanner, Tag } = DS;
  const JobCard = PFW.JobCard;

  const OP = { encrypt: 'Encrypt', decrypt: 'Decrypt', permissions: 'Permissions' };
  const OPICON = { encrypt: 'lock', decrypt: 'unlock', permissions: 'shield' };

  const EyeBtn = ({ revealed }) => (
    <button type="button" aria-label={revealed ? 'Hide password' : 'Show password'} style={{ display: 'inline-grid', placeItems: 'center', width: 22, height: 22, border: 'none', background: 'transparent', color: revealed ? 'var(--press-400)' : 'var(--ink-600)', cursor: 'pointer', padding: 0, margin: '0 -2px' }}>
      <Icon name={revealed ? 'eyeOff' : 'eye'} size={16} />
    </button>
  );

  function PasswordField({ label, revealed, error, code, required, value = 'open-sesame', hint }) {
    return <Input label={label} mono required={required} error={error} code={code} hint={hint}
      type={revealed ? 'text' : 'password'} defaultValue={value} suffix={<EyeBtn revealed={revealed} />} />;
  }

  function PermToggles() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-900)' }}>Printing</span>
          <SegmentedControl ariaLabel="Printing" value="low" options={[{ value: 'none', label: 'None' }, { value: 'low', label: 'Low' }, { value: 'high', label: 'High' }]} />
        </div>
        <Switch label="Allow modifying" />
        <Switch label="Allow copying (extract)" />
        <Switch label="Allow annotating" defaultChecked />
      </div>
    );
  }

  function AdvisoryDisclaimer({ echo }) {
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px 11px 13px', borderRadius: 'var(--r-ctl)', background: 'rgba(214,165,60,.1)', border: '1px solid rgba(214,165,60,.35)', borderLeft: '3px solid var(--warn-500)' }}>
        <span style={{ color: 'var(--warn-500)', display: 'inline-flex', marginTop: 1, flex: 'none' }}><Icon name="alert" size={15} /></span>
        <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-700)', lineHeight: '17px' }}>
          {echo ? 'Permissions are advisory — many tools ignore them. For real confidentiality, use Encrypt.' : window.PFE_DATA.disclaimer}
        </p>
      </div>
    );
  }

  function SubmitWarn({ children }) {
    return <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--r-ctl)', background: 'rgba(214,165,60,.12)', border: '1px solid rgba(214,165,60,.4)', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--warn-500)' }}><Icon name="alert" size={14} />{children}</div>;
  }

  // bright input preview sheet
  function PreviewSheet({ name }) {
    return (
      <div style={{ width: 372, height: 526, background: 'var(--paper-0)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', boxShadow: '0 2px 12px rgba(5,7,10,.55)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: '40px 44px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ height: 15, width: '56%', background: '#c9c9c3', borderRadius: 2 }} />
          {[94, 99, 90, 96, 78, 92, 86, 97, 72, 90, 82, 95].map((w, i) => <div key={i} style={{ height: 5, width: w + '%', background: '#dcdcd6', borderRadius: 1 }} />)}
        </div>
        <span style={{ position: 'absolute', left: -3, bottom: -6, background: 'rgba(14,17,22,.82)', color: 'var(--ink-900)', ...MONO, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{name}</span>
      </div>
    );
  }
  // locked-sheet placeholder (encrypted input)
  function LockedSheet({ name }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 372, height: 526, background: 'linear-gradient(160deg,#f0f0ec,#e2e2db)', borderRadius: 2, borderBottom: '2px solid var(--paper-edge)', boxShadow: '0 2px 12px rgba(5,7,10,.55)', position: 'relative', display: 'grid', placeItems: 'center' }}>
          <span style={{ width: 60, height: 60, borderRadius: 999, background: 'rgba(14,17,22,.06)', display: 'grid', placeItems: 'center', color: '#8a9098' }}><Icon name="lock" size={30} sw={1.6} /></span>
          <span style={{ position: 'absolute', left: -3, bottom: -6, background: 'rgba(14,17,22,.82)', color: 'var(--ink-900)', ...MONO, fontSize: 11, padding: '2px 8px', borderRadius: 999 }}>{name}</span>
        </div>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', maxWidth: 340, textAlign: 'center' }}>This PDF is protected — enter its password to preview/operate.</span>
      </div>
    );
  }

  function CenterWell({ children }) {
    return <div style={{ flex: 1, minHeight: 0, margin: 16, borderRadius: 'var(--r-panel)', background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)', boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)', display: 'grid', placeItems: 'center', padding: 24, position: 'relative' }}>{children}</div>;
  }

  // inspector
  function EInspector({ op, children, submitProcessing, artifact }) {
    const primary = { encrypt: 'Encrypt', decrypt: 'Unlock', permissions: 'Apply permissions' }[op];
    return (
      <aside style={{ width: 336, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)', minHeight: 0 }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
          <span style={EYE}>Operation</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}><span style={{ color: 'var(--press-400)', display: 'inline-flex' }}><Icon name={OPICON[op]} size={17} /></span><h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>{OP[op]}</h3></div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>{artifact ? artifact : children}</div>
        <div style={{ padding: 16, borderTop: '1px solid var(--sub-600)', flex: 'none' }}>
          <Button variant="primary" size="lg" block processing={submitProcessing} disabled={!!artifact} leftIcon={<Icon name={OPICON[op]} size={15} />}>{submitProcessing ? 'Submitting…' : primary}</Button>
        </div>
      </aside>
    );
  }

  function PressOverlay({ phase = 'Running — pikepdf' }) {
    return <div style={{ position: 'absolute', inset: 0, zIndex: 30, display: 'grid', placeItems: 'center', background: 'rgba(8,10,14,.6)', padding: 24 }}>
      <JobCard state="running" phase={phase} detail={`${window.PFE_DATA.input.name} · ${window.PFE_DATA.input.bytes} B`} jobId={window.PFE_DATA.jobShort} />
    </div>;
  }

  function SuccessRow({ op }) {
    const r = window.PFE_DATA.results[op];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {op === 'permissions' ? <AdvisoryDisclaimer echo /> : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 'var(--r-ctl)', background: 'var(--ok-tint)', borderLeft: '3px solid var(--ok-500)', border: '1px solid rgba(75,174,126,.35)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--ok-500)', display: 'inline-flex' }}><Icon name="check" size={18} sw={2.4} /></span>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ ...MONO, fontSize: 13, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.filename}</div><div style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>{r.human} · {r.bytes} B</div></div>
            <Button size="sm" variant="primary" className="pfe-focus" leftIcon={<Icon name="download" size={15} />}>Download</Button>
          </div>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-700)', paddingLeft: 28 }}>{r.copy}</span>
        </div>
      </div>
    );
  }

  const ERR = {
    file_too_large: { t: 'This file is over the 200 MB limit', c: 'file_too_large' },
    not_a_pdf: { t: "That file isn't a PDF", c: 'not_a_pdf' },
    bad_pdf_structure: { t: "This PDF couldn't be opened", c: 'bad_pdf_structure' },
    queue_full: { t: 'All workers are busy', c: 'queue_full', m: 'Retry shortly · Retrying in 30s…' },
    disk_full: { t: 'Not enough working storage to accept this job', c: 'disk_full' },
  };
  function ErrorBannerE({ kind }) {
    const e = ERR[kind];
    return <InlineBanner status="err" title={e.t} code={e.c} actions={kind === 'queue_full' ? <Button size="sm" variant="ghost">Retry now</Button> : <Button size="sm" variant="ghost">Try again</Button>}>{e.m}</InlineBanner>;
  }

  window.PFE = { PasswordField, EyeBtn, PermToggles, AdvisoryDisclaimer, SubmitWarn, PreviewSheet, LockedSheet, CenterWell, EInspector, PressOverlay, SuccessRow, ErrorBannerE, OP, OPICON };
})();
