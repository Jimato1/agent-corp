// pdf-forge flow B — inspector + shared parts. → window.PFB
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon, EYE = PFW.EYE, MONO = PFW.MONO;
  const { Button, IconButton, StatusPill, InlineBanner, Tag, Tooltip } = DS;

  function Section({ label, right, children, style }) {
    return (
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--sub-600)', ...style }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={EYE}>{label}</span>{right}
        </div>
        {children}
      </div>
    );
  }

  // dashed multi-drop zone
  function CombineDrop({ active = false }) {
    return (
      <div style={{
        border: `1px dashed ${active ? 'var(--press-500)' : 'var(--sub-500)'}`, borderRadius: 'var(--r-ctl)',
        background: active ? 'var(--press-tint)' : 'var(--sub-850)', padding: '18px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center',
      }}>
        <span style={{ display: 'inline-flex', color: active ? 'var(--press-400)' : 'var(--ink-600)' }}><Icon name="combine" size={22} /></span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--ink-900)' }}>Drop PDFs to combine</span>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', lineHeight: '16px' }}>Under 150 MB stays on this device.</span>
      </div>
    );
  }

  const KIND_ICON = { delete: 'trash', rotate: 'rotateCW', move: 'layers', combine: 'combine' };
  function EditLog({ items, onlyN }) {
    const rows = onlyN ? items.slice(0, onlyN) : items;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {rows.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 8px', borderRadius: 'var(--r-ctl)', background: i === 0 ? 'var(--sub-700)' : 'transparent' }}>
            <span style={{ display: 'inline-flex', color: it.k === 'delete' ? 'var(--err-500)' : 'var(--ink-600)' }}><Icon name={KIND_ICON[it.k]} size={14} /></span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: i === 0 ? 'var(--ink-900)' : 'var(--ink-700)' }}>{it.text}</span>
          </div>
        ))}
      </div>
    );
  }

  // success artifact row (left ok rule)
  function ArtifactRow({ filename, human, bytesExact, focusDownload = false }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--r-ctl)', background: 'var(--ok-tint)', borderLeft: '3px solid var(--ok-500)', border: '1px solid rgba(75,174,126,.35)' }}>
        <span style={{ display: 'inline-flex', color: 'var(--ok-500)', flex: 'none' }}><Icon name="check" size={18} sw={2.4} /></span>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ ...MONO, fontSize: 13, color: 'var(--ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{filename}</span>
          <span style={{ ...MONO, fontSize: 11, color: 'var(--ink-600)' }}>{bytesExact} bytes · {human}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <Button size="sm" variant="ghost" leftIcon={<Icon name="external" size={15} />}>Open result</Button>
          <Button size="sm" variant="primary" leftIcon={<Icon name="download" size={15} />} className={focusDownload ? 'pfb-focus' : ''}>Download</Button>
        </div>
      </div>
    );
  }

  const ERRORS = {
    worker: { title: "Couldn't assemble this in the browser", code: 'worker_failed', msg: 'Try the server path for large files.' },
    file_too_large: { title: 'This file is over the 200 MB limit', code: 'file_too_large', msg: 'Trim it or split it first.' },
    bad_pdf_structure: { title: "pdf-forge couldn't finalize these pages", code: 'bad_pdf_structure', msg: 'The assembled file looks malformed.' },
    queue_full: { title: 'Every press is busy right now', code: 'queue_full', msg: 'Retrying in 30s…' },
    disk_full: { title: 'Not enough working room on the server', code: 'disk_full', msg: 'Free some space and retry.' },
    engine_error: { title: 'Finalize failed while normalizing the file', code: 'engine_error', msg: 'Your local pages are untouched — try Export again.' },
  };
  function ErrorBanner({ kind, retry }) {
    const e = ERRORS[kind];
    return (
      <InlineBanner status="err" title={e.title} code={e.code}
        actions={kind === 'queue_full' ? <Button size="sm" variant="ghost">Retry now</Button> : (retry ? <Button size="sm" variant="ghost">{retry}</Button> : null)}>
        {e.msg}
      </InlineBanner>
    );
  }

  // the flow-B inspector
  function Inspector({ selectedCount = 0, edits = 0, combineActive = false, editLog = [] }) {
    return (
      <aside style={{ width: 320, flex: 'none', display: 'flex', flexDirection: 'column', background: 'var(--sub-800)', borderLeft: '1px solid var(--sub-600)', minHeight: 0 }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--sub-600)', flex: 'none' }}>
          <span style={EYE}>Inspector</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ display: 'inline-flex', color: 'var(--press-400)' }}><Icon name="layers" size={17} /></span>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--ink-900)' }}>Organize pages</h3>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <Section label={selectedCount > 0 ? `${selectedCount} selected` : 'Selection'}>
            {selectedCount > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="secondary" block leftIcon={<Icon name="rotateCCW" size={15} />}>Rotate CCW</Button>
                  <Button size="sm" variant="secondary" block leftIcon={<Icon name="rotateCW" size={15} />}>Rotate CW</Button>
                </div>
                <Button size="sm" variant="danger" block leftIcon={<Icon name="trash" size={15} />}>Delete {selectedCount} page{selectedCount > 1 ? 's' : ''}</Button>
              </div>
            ) : (
              <p style={{ margin: 0, fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-600)', lineHeight: '17px' }}>Select pages to rotate, delete, or drag to reorder. <span style={{ ...MONO, color: 'var(--ink-500)' }}>R</span> rotates, <span style={{ ...MONO, color: 'var(--ink-500)' }}>⌫</span> deletes.</p>
            )}
          </Section>

          <Section label="Combine"><CombineDrop active={combineActive} /></Section>

          <Section label="History" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}
            right={<div style={{ display: 'flex', gap: 4 }}>
              <IconButton size="md" label="Undo" variant="plain"><Icon name="undo" size={15} /></IconButton>
              <IconButton size="md" label="Redo" variant="plain"><Icon name="redo" size={15} /></IconButton>
            </div>}>
            {editLog.length ? <EditLog items={editLog} /> : <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--ink-500)' }}>No edits yet.</span>}
          </Section>
        </div>
      </aside>
    );
  }

  window.PFB = Object.assign(window.PFB || {}, { Inspector, CombineDrop, EditLog, ArtifactRow, ErrorBanner, Section });
})();
