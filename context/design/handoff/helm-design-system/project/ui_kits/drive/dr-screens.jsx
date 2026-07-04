/* Helm — Drive · screens (4). Exposed as window.DRScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.DR_DATA;
  const P = window.DRParts;
  const { DataTable, TicketRef, PrincipalRef, StatusPill, FenceState, FreshnessStamp, Button, DangerAction, ConfirmFriction, ErrorState, Input, ReviewChip } = H;
  const { tierBadge, verifyPill, PreviewSurface, DiskWatermarkMeter, UploadDropzone, eyebrow, mono, panel } = P;

  function Head({ crumb, title, sub, right }) {
    return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>{crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}</div>{right}</div>;
  }

  /* 1 · Ticket Browser */
  function Browser({ ctx }) {
    const cols = [
      { key: 'name', header: 'Name', render: (a) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>{a.name}</span> },
      { key: 'seq', header: 'Ver', render: (a) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{a.seq}</span> },
      { key: 'mime', header: 'Type', render: (a) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{a.mime}</span> },
      { key: 'size', header: 'Size', align: 'right', render: (a) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{a.size}</span> },
      { key: 'createdBy', header: 'created_by', render: (a) => <PrincipalRef kind={a.kind} id={a.createdBy} /> },
      { key: 'tier', header: 'Provenance', render: (a) => tierBadge(a.tier) },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head title="Ticket browser" sub="Artifacts grouped by the ticket that produced them. Every file names its provenance; the store never lies about whether it still belongs to a real ticket." right={<Button tone="primary" icon="↑" onClick={ctx.openUpload}>Upload</Button>} />
        {D.GROUPS.map((g) => (
          <div key={g.ticket} style={{ ...panel, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--border-default)', flexWrap: 'wrap' }}>
              <TicketRef id={g.ticket} href="#" />{verifyPill(g.verify)}
              <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{g.count} artifacts · {g.size} · last write {g.lastWrite}</span>
              {g.note ? <span style={{ ...mono, fontSize: 11, color: g.verify === 'verified_absent' ? 'var(--danger-text)' : 'var(--state-amber-ink)' }}>⚠ {g.note}</span> : <FreshnessStamp age={`source: ${g.source}`} />}
            </div>
            {g.verify !== 'verified_absent' ? <div style={{ padding: 4 }}><DataTable columns={cols} rows={g.artifacts} rowKey="name" onRowClick={() => ctx.openDetail()} /></div>
              : <div style={{ padding: '10px 14px' }}><Button tone="ghost" size="compact" onClick={() => ctx.goto('admin')}>→ Admin escalation queue</Button></div>}
          </div>
        ))}
      </div>
    );
  }

  /* 2 · Artifact Detail */
  function Detail({ ctx }) {
    const d = D.DETAIL;
    const [degraded, setDegraded] = React.useState(false);
    const cols = [
      { key: 'seq', header: 'Seq', render: (v) => <span style={{ ...mono, fontSize: 12, color: v.current ? 'var(--text-primary)' : 'var(--text-muted)' }}>{v.seq}{v.current ? ' ◀' : ''}</span> },
      { key: 'when', header: 'When', render: (v) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{v.when}</span> },
      { key: 'who', header: 'Who', render: (v) => <PrincipalRef kind={v.kind} id={v.who} /> },
      { key: 'hash', header: 'Hash', render: (v) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{v.hash}</span> },
      { key: 'fence', header: 'Fence', render: (v) => v.fence ? <FenceState gen={v.fence.gen} state={v.fence.state} supersededBy={v.fence.supBy} /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-raised)', flexWrap: 'wrap' }}>
          <button onClick={() => ctx.goto('browser')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-link)' }}>← {d.ticket}</button>
          <StatusPill tone="verified" glyph="✔" size="sm">VERIFIED</StatusPill>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{d.name}</span>
          <span style={{ flex: 1 }} />
          <Button tone="secondary" size="compact" icon="↓">Download current</Button>
          <Button tone="ghost" size="compact" onClick={() => setDegraded((v) => !v)}>{degraded ? '↺ renderer up (demo)' : '⚠ renderer down (demo)'}</Button>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'minmax(340px, 1fr) minmax(300px, 1fr)', minHeight: 0 }}>
          <div style={{ overflow: 'auto', padding: 16, borderRight: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>ticket <TicketRef id={d.ticket} href="#" /></div>
              <div>created_by <PrincipalRef kind="agent" id={d.createdBy} /></div>
              <div>mime {d.mime} · sha256 {d.sha} <span style={{ color: 'var(--signal-cyan)' }}>⧉copy</span></div>
            </div>
            <div style={eyebrow}>Version history · append-only</div>
            <DataTable columns={cols} rows={d.versions} rowKey="seq" reflow={false} />
            <div style={{ display: 'flex', gap: 8 }}>
              <Button tone="secondary" size="compact" icon="↓">this version</Button>
              <ConfirmLight label="↩ Restore v2" title="Restore version v2" consequence="Restores v2 as the current version. Reversible." />
              <ConfirmLight label="◼ Delete-mark" title="Delete-mark current" consequence="Marks the current version deleted. Reversible via Restore." />
            </div>
          </div>
          <PreviewSurface artifact={{ name: d.name, mime: d.mime, tier: d.tier }} degraded={degraded} />
        </div>
      </div>
    );
  }
  function ConfirmLight({ label, title, consequence }) {
    const [o, setO] = React.useState(false);
    return <React.Fragment><Button tone="secondary" size="compact" onClick={() => setO(true)}>{label}</Button>
      <ConfirmFriction open={o} intensity="light" title={title} consequence={consequence} direction="less" confirmLabel={label} onCancel={() => setO(false)} onConfirm={() => setO(false)} /></React.Fragment>;
  }

  /* 3 · Upload (modal) */
  function Upload({ ctx }) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'var(--scrim)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '10vh 24px' }} onMouseDown={(e) => { if (e.target === e.currentTarget) ctx.closeUpload(); }}>
        <div style={{ width: '100%', maxWidth: 520, ...panel, background: 'var(--surface-raised)', boxShadow: 'var(--shadow-dialog)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Upload to T-000123</span>
            <span style={{ flex: 1 }} /><Button tone="ghost" size="compact" onClick={ctx.closeUpload}>✕</Button>
          </div>
          <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <UploadDropzone />
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Input label="Ticket" mono defaultValue="T-000123" style={{ width: 150 }} />
              <Input label="Logical name" defaultValue="report-final.pdf" style={{ flex: 1, minWidth: 160 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button tone="ghost" onClick={ctx.closeUpload}>Cancel</Button>
              <Button tone="primary" onClick={ctx.closeUpload}>Upload</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* 4 · Admin */
  function Admin({ ctx }) {
    const auditCols = [
      { key: 'at', header: 'Time', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.at}</span> },
      { key: 'who', header: 'Who', render: (r) => <PrincipalRef kind={r.kind} id={r.who} /> },
      { key: 'verb', header: 'Action', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.verb}</code> },
      { key: 'target', header: 'Target', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.target}</span> },
      { key: 'outcome', header: 'Outcome', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: r.outcome === 'STALE_FENCING' ? 'var(--danger-text)' : 'var(--text-secondary)' }}>{r.outcome}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head crumb="admin" title="Drive admin" sub="The one screen with a destructive affordance. GC purge is refused suite-wide while any kill epoch is engaged." />
        <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ ...eyebrow, display: 'flex', alignItems: 'center', gap: 8 }}>Health strip <FreshnessStamp age="healthz · 8s" /></div>
          <DiskWatermarkMeter used={D.HEALTH.watermark[0]} watermark={D.HEALTH.watermark[1]} />
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            <span>backup <span style={{ color: 'var(--state-green)' }}>✔</span> {D.HEALTH.backup}</span>
            <span>last-verify <span style={{ color: 'var(--state-green)' }}>✔</span> {D.HEALTH.verify}</span>
            <span>journals <span style={{ color: 'var(--state-green)' }}>✔</span> {D.HEALTH.journals}</span>
          </div>
        </div>
        <div style={{ ...panel, padding: 14 }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>verified_absent escalation queue</div>
          {D.ABSENT.map((r) => (
            <div key={r.ticket} style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <TicketRef id={r.ticket} href="#" /><StatusPill tone="danger" glyph="⛒" size="sm">VERIFIED_ABSENT</StatusPill>
              <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.name}</span><PrincipalRef kind="agent" id={r.by} />
              <ReviewChip state="escalated" reason={r.reason} href="#" /><span style={{ flex: 1 }} />
              <Button tone="ghost" size="compact">inspect</Button>
            </div>
          ))}
        </div>
        <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={eyebrow}>Orphan / GC console</div>
          <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>Phase-1 (auto, continuous): {D.GC.phase1} [read-only log]</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>Phase-2 (manual): {D.GC.chains} delete-marked chains · {D.GC.refcount0} refcount-0 · {D.GC.reclaim}</span>
            <span style={{ flex: 1 }} />
            <DangerAction label="Purge reclaimable" glyph="⛔" variant="solid" title="GC purge — reclaim → destroy"
              consequence={<>This <strong>PERMANENTLY removes {D.GC.refcount0} refcount-0 blobs ({D.GC.reclaim})</strong> + {D.GC.chains} delete-marked chains. Purged bytes cannot be restored.</>}
              direction="more" irreversible blastRadius={`${D.GC.refcount0} blobs · ${D.GC.chains} chains · tickets T-000101…`}
              typedIntent="PURGE" stepUp auditNote="Refused server-side under auth-staleness or an engaged kill epoch (fails closed)." confirmLabel="Purge" />
          </div>
        </div>
        <div style={{ ...panel, padding: 14 }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>Audit log · append-only (mutations + denials)</div>
          <DataTable columns={auditCols} rows={D.AUDIT} rowKey="at" reflow={false} />
        </div>
      </div>
    );
  }

  window.DRScreens = { Browser, Detail, Upload, Admin };
})();
