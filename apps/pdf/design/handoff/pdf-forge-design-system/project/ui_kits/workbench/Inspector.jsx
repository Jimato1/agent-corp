// Right inspector — op options + the press-at-work job readout. → window.Inspector
(function () {
  const Icon = window.PFIcon;
  const NS = window.PDFForgeDesignSystem_ec4ef3;
  const { Input, Select, Switch, Checkbox, RadioGroup, Button, PressIndicator, InlineBanner, Tag } = NS;

  const TITLES = {
    pages: 'Page properties', merge: 'Merge documents', split: 'Split document',
    rotate: 'Rotate pages', compress: 'Compress', export: 'Export',
  };
  const VERB = { merge: 'Merge', split: 'Split', rotate: 'Apply rotation', compress: 'Compress', export: 'Export', pages: 'Export' };

  function Field({ children }) {
    return <div style={{ marginBottom: 14 }}>{children}</div>;
  }

  function Options({ op, selectedCount }) {
    if (op === 'merge') {
      return (
        <>
          <Field>
            <span style={lblS}>Source files · drag to reorder</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {['contract_final.pdf', 'appendix_a.pdf', 'signatures.pdf'].map((f, i) => (
                <div key={f} style={rowS}>
                  <span style={{ color: 'var(--ink-600)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{i + 1}</span>
                  <span style={{ display: 'inline-flex', color: 'var(--ink-600)' }}><Icon name="file" size={14} /></span>
                  <span style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f}</span>
                </div>
              ))}
            </div>
          </Field>
          <Field><Button variant="secondary" block leftIcon={<Icon name="plus" size={15} />}>Add files</Button></Field>
          <Field><Input label="Output filename" mono defaultValue="merged_2024.pdf" /></Field>
        </>
      );
    }
    if (op === 'compress') {
      return (
        <>
          <Field>
            <span style={lblS}>Compression level</span>
            <RadioGroup name="lvl" defaultValue="balanced" options={[
              { value: 'lossless', label: 'Lossless (metadata only)' },
              { value: 'balanced', label: 'Balanced — 150 DPI images' },
              { value: 'aggressive', label: 'Aggressive — 96 DPI images' },
            ]} />
          </Field>
          <Field>
            <InlineBanner status="info" title="Estimated 4.2 MB → 1.6 MB">
              Re-samples images; vector text is untouched.
            </InlineBanner>
          </Field>
        </>
      );
    }
    if (op === 'rotate') {
      return (
        <Field>
          <span style={lblS}>Rotate {selectedCount > 0 ? `${selectedCount} selected` : 'all'} pages</span>
          <RadioGroup name="deg" defaultValue="90" row options={[
            { value: '90', label: '90°' }, { value: '180', label: '180°' }, { value: '270', label: '270°' },
          ]} />
        </Field>
      );
    }
    // export / pages / split — the rich, default form
    return (
      <>
        <Field><Input label="Output filename" mono defaultValue="contract_final.pdf" /></Field>
        <Field>
          <Select label="Page range" mono defaultValue="all" options={[
            { value: 'all', label: 'All pages' }, { value: 'sel', label: 'Selected pages' }, { value: 'custom', label: 'Custom…' },
          ]} />
        </Field>
        <Field><Select label="Resolution" mono options={['72 DPI', '150 DPI', '300 DPI', '600 DPI']} defaultValue="300 DPI" /></Field>
        <Field style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Switch label="Keep input files" defaultChecked />
          <Checkbox label="Flatten annotations" />
          <Checkbox label="Embed fonts" defaultChecked />
        </Field>
      </>
    );
  }

  function Inspector({ activeOp, jobState, jobDetail, jobCode, selectedCount, onRun, onReset }) {
    const verb = VERB[activeOp] || 'Run';
    const target = selectedCount > 0 ? `${selectedCount} selected pages` : 'all 14 pages';
    return (
      <aside style={{
        width: 'var(--inspector-w)', flex: 'none', display: 'flex', flexDirection: 'column',
        background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)', minHeight: 0,
      }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ink-600)' }}>Inspector</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ display: 'inline-flex', color: 'var(--press-400)' }}><Icon name={activeOp} size={17} /></span>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>{TITLES[activeOp] || 'Operation'}</h3>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: 16, minHeight: 0 }}>
          <Options op={activeOp} selectedCount={selectedCount} />
        </div>

        <div style={{ padding: 16, borderTop: '1px solid var(--sub-600)', display: 'flex', flexDirection: 'column', gap: 12, flex: 'none' }}>
          {jobState !== 'idle' ? (
            <PressIndicator state={jobState} detail={jobDetail} code={jobCode}
              label={jobState === 'processing' ? `${verb}ing…` : undefined}
              action={jobState === 'success'
                ? <Button size="sm" variant="primary" leftIcon={<Icon name="export" size={15} />}>Download</Button>
                : jobState === 'error' ? <Button size="sm" onClick={onRun}>Retry</Button> : null} />
          ) : null}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)' }}>{verb} {target}</span>
            <Button variant="primary" leftIcon={<Icon name="play" size={14} />}
              processing={jobState === 'processing'} onClick={onRun}>
              {jobState === 'processing' ? 'Pressing…' : verb}
            </Button>
          </div>
        </div>
      </aside>
    );
  }

  const lblS = { display: 'block', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--ink-700)', marginBottom: 8 };
  const rowS = { display: 'flex', alignItems: 'center', gap: 8, padding: '7px 9px', borderRadius: 'var(--r-ctl)', background: 'var(--sub-850)', border: '1px solid var(--sub-600)' };

  window.Inspector = Inspector;
})();
