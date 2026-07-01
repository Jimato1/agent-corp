// pdf-forge flow F — inspector + artifact / advisory / errors. → window.PFF
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon, MONO = PFW.MONO, EYE = PFW.EYE;
  const { Tabs, Input, Switch, Button, Tag, StatusPill, InlineBanner } = DS;

  function PrivacyLabel({ text, tone = 'ok' }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>
        <span style={{ display: 'inline-flex', color: tone === 'ok' ? 'var(--ok-500)' : 'var(--ink-600)' }}><Icon name="lock" size={13} /></span>
        {text}
      </div>
    );
  }

  function Section({ children, style }) {
    return <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--sub-600)', ...style }}>{children}</div>;
  }
  const lbl = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 };
  const desc = { margin: '8px 0 0', fontFamily: 'var(--font-ui)', fontSize: 12.5, color: 'var(--ink-600)', lineHeight: '18px' };

  // success artifact row — text/plain, NEVER implies a PDF
  function ArtifactRowText({ filename, human, bytesExact }) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 14px', borderRadius: 'var(--r-ctl)', background: 'var(--ok-tint)', borderLeft: '3px solid var(--ok-500)', border: '1px solid rgba(75,174,126,.35)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', color: 'var(--ok-500)', flex: 'none' }}><Icon name="check" size={18} sw={2.4} /></span>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ ...MONO, fontSize: 13, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>{bytesExact} B</span>
              <Tag>text/plain</Tag>
            </div>
          </div>
          <Button size="sm" variant="primary" leftIcon={<Icon name="download" size={15} />}>Download</Button>
        </div>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 11.5, color: 'var(--ink-600)', paddingLeft: 28 }}>Text only — no PDF was created.</span>
      </div>
    );
  }

  function ScanAdvisory({ variant = 'client' }) {
    const msg = variant === 'client'
      ? 'No selectable text found — this looks like a scan. Run OCR to make it searchable.'
      : 'No text found. This may be a scanned image — OCR can add a text layer.';
    return (
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '11px 12px 11px 13px', borderRadius: 'var(--r-ctl)', background: 'rgba(214,165,60,.12)', border: '1px solid rgba(214,165,60,.4)', borderLeft: '3px solid var(--warn-500)' }}>
        <span style={{ color: 'var(--warn-500)', display: 'inline-flex', marginTop: 1, flex: 'none' }}><Icon name="alert" size={16} /></span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--ink-900)', lineHeight: '18px' }}>{msg}</span>
          <a href="#" style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--press-400)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Run OCR <Icon name="external" size={13} /></a>
        </div>
      </div>
    );
  }

  const ERRORS = {
    not_a_pdf: { title: "That isn't a PDF", code: 'not_a_pdf' },
    bad_pdf_structure: { title: "This PDF won't open for text extraction", code: 'bad_pdf_structure', msg: 'Try Repair first.', retry: 'Repair' },
    out_of_range: { title: 'Page 88 is past the end — this document has 42 pages', code: 'out_of_range', msg: 'Adjust the page range and try again.' },
    queue_full: { title: 'Every worker is busy right now', code: 'queue_full', msg: 'Retrying in 30s…' },
    file_too_large: { title: 'This file is over the 200 MB limit', code: 'file_too_large', msg: 'Split it first.' },
  };
  function ErrorBannerF({ kind }) {
    const e = ERRORS[kind];
    return (
      <InlineBanner status="err" title={e.title} code={e.code}
        actions={kind === 'queue_full' ? <Button size="sm" variant="ghost">Retry now</Button> : (e.retry ? <Button size="sm" variant="ghost">{e.retry}</Button> : null)}>
        {e.msg}
      </InlineBanner>
    );
  }

  // the two-tab extract inspector
  function ExtractInspector({ tab = 'quick', scope, scopeError, selectedCount = 0, layout = false, result = null, error = null, processing = false }) {
    return (
      <aside style={{ width: 330, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)', minHeight: 0 }}>
        <div style={{ padding: '14px 16px 0', flex: 'none' }}>
          <span style={EYE}>Inspector</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '3px 0 12px' }}>
            <span style={{ display: 'inline-flex', color: 'var(--press-400)' }}><Icon name="text" size={17} /></span>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>Extract text</h3>
          </div>
          <Tabs value={tab} tabs={[{ id: 'quick', label: 'Quick text' }, { id: 'server', label: 'Batch extract' }]} />
        </div>

        <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
          {tab === 'quick' ? (
            <Section style={{ borderBottom: 'none' }}>
              <PrivacyLabel text="Stays on this device — nothing uploaded" />
              <p style={desc}>Text is read straight from the pages with pdf.js. Find, highlight, and copy right here — nothing is uploaded and no file is produced.</p>
              {error === 'scan' ? <div style={{ marginTop: 14 }}><ScanAdvisory variant="client" /></div> : null}
            </Section>
          ) : (
            <Section style={{ borderBottom: 'none', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <PrivacyLabel text="Sent to your local server · 127.0.0.1" tone="muted" />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={lbl}>Pages</span>
                  {selectedCount > 0 ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...MONO, fontSize: 11, color: 'var(--press-400)' }}>⇄ from {selectedCount} selected</span> : null}
                </div>
                <Input mono value={scope} readOnly error={scopeError} code={scopeError ? 'out_of_range' : undefined} placeholder="1-end" />
                <span style={{ display: 'block', marginTop: 6, fontFamily: 'var(--font-ui)', fontSize: 11, color: 'var(--ink-600)' }}>Two-way bound to board selection · e.g. 1-10,21-end</span>
              </div>
              <Switch label="Preserve layout" defaultChecked={layout} />
              {error && error !== 'scan' ? <ErrorBannerF kind={error} /> : null}
              {result ? <ArtifactRowText filename={result.filename} human={result.human} bytesExact={result.bytesExact} /> : (
                <Button variant="primary" block processing={processing} leftIcon={<Icon name="text" size={15} />} rightIcon={<Icon name="chevron" size={14} />}>{processing ? 'Extracting…' : 'Extract'}</Button>
              )}
            </Section>
          )}
        </div>
      </aside>
    );
  }

  window.PFF = Object.assign(window.PFF || {}, { ExtractInspector, PrivacyLabel, ArtifactRowText, ScanAdvisory, ErrorBannerF });
})();
