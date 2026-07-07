/* The four Drive screens (UI_SPEC §3), consuming the live PLAN §4 API via DR_API. Every shared
   entity renders via its bundle component; the R/D error split is honored — a dependency outage
   (Board unreachable, pdf renderer down, auth down) is GOLD Pattern-D "safety system working",
   never a red error. */
(function () {
  const DS = window.HelmDesignSystem_f4cb26;
  const { DataTable, TicketRef, PrincipalRef, StatusPill, FenceState, FreshnessStamp, Button, DangerAction, ConfirmFriction, Input, ReviewChip } = DS;
  const P = window.DRParts;
  const { PreviewSurface, DiskWatermarkMeter, UploadDropzone, tierBadge, verifyPill, styles } = P;
  const { eyebrow, mono, panel } = styles;
  const h = React.createElement;

  function Head(props) {
    return h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 16 } },
      h('div', { style: { flex: 1 } },
        props.crumb ? h('div', { style: Object.assign({}, mono, { color: 'var(--text-muted)', fontSize: 12 }) }, props.crumb) : null,
        h('h1', { style: { margin: '2px 0 0', fontSize: 20, fontWeight: 600 } }, props.title),
        props.sub ? h('div', { style: { color: 'var(--text-muted)', fontSize: 13, maxWidth: '82ch' } }, props.sub) : null),
      props.right || null);
  }

  // Honest defaults — Skeleton (loading), red Pattern-R (recoverable), gold Pattern-D (dependency down).
  function Loading() {
    return h('div', { style: Object.assign({}, panel, { padding: 20 }) },
      [0, 1, 2].map(function (i) { return h('div', { key: i, style: { height: 14, margin: '10px 0', borderRadius: 4, background: 'var(--surface-inset)', opacity: 1 - i * 0.2 } }); }));
  }
  function PatternR(props) {
    return h('div', { style: Object.assign({}, panel, { padding: 20, borderColor: 'var(--danger-red)' }) },
      h('div', { style: { color: 'var(--danger-red)', fontWeight: 600 } }, '✕ ' + (props.title || 'Something went wrong')),
      h('div', { style: { color: 'var(--text-secondary)', marginTop: 6 } }, props.message || 'The request failed recoverably. Retry, or adjust and try again.'));
  }
  function PatternD(props) {
    return h('div', { style: Object.assign({}, panel, { padding: 20, background: 'var(--halt-gold-wash)', borderColor: 'var(--halt-gold-edge)' }) },
      h('div', { style: { color: 'var(--halt-gold-ink)', fontWeight: 600 } }, '⛊ ' + (props.title || 'Safe-stopped')),
      h('div', { style: { color: 'var(--halt-gold-ink)', marginTop: 6 } }, props.message || 'A dependency is down, so the system failed closed. This is the safety system working, not an outage.'));
  }
  function stateCard(status, opts) {
    if (status === 'loading') return Loading();
    if (status === 'degraded') return h(PatternD, opts || {});
    if (status === 'error') return h(PatternR, opts || {});
    return null;
  }

  // ── Screen 1: Ticket Browser ──
  function Browser(props) {
    const ctx = props.ctx;
    const right = h(Button, { tone: 'primary', icon: '↑', onClick: ctx.openUpload }, 'Upload');
    const head = h(Head, { title: 'Ticket browser', sub: 'Every deliverable names the work that made it. The store never lies about a file’s provenance or whether it still belongs to a real ticket.', right: right });
    if (props.status !== 'ok') return h('div', { style: { maxWidth: 1180 } }, head, stateCard(props.status, props.statusOpts));
    const groups = props.groups || [];
    if (groups.length === 0) {
      return h('div', { style: { maxWidth: 1180 } }, head,
        h('div', { style: Object.assign({}, panel, { padding: 28, textAlign: 'center', color: 'var(--text-secondary)' }) },
          'No artifacts yet. Agents write deliverables here keyed by ticket; you can also upload one.'));
    }
    const cols = [
      { key: 'name', header: 'Name', render: function (a) { return a.name; } },
      { key: 'seq', header: 'Ver', mono: true, render: function (a) { return h('span', { style: Object.assign({}, mono, { color: 'var(--text-muted)' }) }, a.seq); } },
      { key: 'mime', header: 'Type', render: function (a) { return h('span', { style: Object.assign({}, mono, { color: 'var(--text-muted)' }) }, a.mime); } },
      { key: 'size', header: 'Size', align: 'right', render: function (a) { return h('span', { style: Object.assign({}, mono, { color: 'var(--text-secondary)' }) }, a.size); } },
      { key: 'createdBy', header: 'created_by', render: function (a) { return h(PrincipalRef, { kind: a.kind, id: a.createdBy }); } },
      { key: 'tier', header: 'Provenance', render: function (a) { return tierBadge(a.tier); } },
    ];
    return h('div', { style: { maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 16 } }, head,
      groups.map(function (g) {
        return h('div', { key: g.ticket, style: Object.assign({}, panel, { padding: 14 }) },
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' } },
            h(TicketRef, { id: g.ticket, href: '#' }), verifyPill(g.verify),
            h('span', { style: Object.assign({}, mono, { color: 'var(--text-muted)', fontSize: 12 }) }, g.count + ' artifacts · ' + g.size + ' · last write ' + g.lastWrite),
            g.note ? h('span', { style: Object.assign({}, mono, { fontSize: 12, color: g.verify === 'verified_absent' ? 'var(--danger-text)' : 'var(--state-amber-ink)' }) }, '⚠ ' + g.note)
              : h(FreshnessStamp, { age: 'source: ' + g.source })),
          g.verify === 'verified_absent'
            ? h(Button, { tone: 'ghost', size: 'compact', onClick: function () { ctx.goto('admin'); } }, '→ Admin escalation queue')
            : h(DataTable, { columns: cols, rows: g.artifacts, rowKey: 'name', emptyMessage: 'No current artifacts on this ticket.', onRowClick: function (a) { ctx.openDetail(a.artifact_id); } }));
      }));
  }

  // ── Screen 2: Artifact Detail ──
  function Detail(props) {
    const ctx = props.ctx; const d = props.detail;
    const back = h('button', { onClick: function () { ctx.goto('browser'); }, style: { background: 'none', border: 'none', color: 'var(--signal-cyan)', cursor: 'pointer', fontFamily: 'var(--font-mono)' } }, '← ' + (d ? d.ticket : 'back'));
    if (props.status !== 'ok' || !d) {
      return h('div', { style: { padding: 4 } }, h('div', { style: { marginBottom: 12 } }, back), stateCard(props.status === 'ok' ? 'loading' : props.status, props.statusOpts));
    }
    const top = h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0 14px' } },
      back, h(StatusPill, { tone: d.ticket_state === 'verified' ? 'verified' : 'attention', glyph: d.ticket_state === 'verified' ? '✔' : '◐', size: 'sm' }, d.ticket_state.toUpperCase()),
      h('strong', null, d.name), h('span', { style: { flex: 1 } }),
      h(Button, { tone: 'secondary', size: 'compact', icon: '↓', onClick: function () { ctx.download(d.current_version_id); } }, 'Download current'),
      h(Button, { tone: 'ghost', size: 'compact', onClick: props.onToggleDegraded }, props.degraded ? '↺ renderer up (demo)' : '⚠ renderer down (demo)'));
    const vcols = [
      { key: 'seq', header: 'Seq', render: function (v) { return h('span', { style: Object.assign({}, mono, { color: v.current ? 'var(--text-primary)' : 'var(--text-muted)' }) }, v.seq + (v.current ? ' ◀' : '')); } },
      { key: 'when', header: 'When', render: function (v) { return h('span', { style: Object.assign({}, mono, { color: 'var(--text-muted)' }) }, v.when); } },
      { key: 'who', header: 'Who', render: function (v) { return h(PrincipalRef, { kind: v.kind, id: v.who }); } },
      { key: 'hash', header: 'Hash', render: function (v) { return h('span', { style: Object.assign({}, mono, { color: 'var(--text-muted)' }) }, v.hash); } },
      { key: 'fence', header: 'Fence', render: function (v) { return v.fence ? h(FenceState, { gen: v.fence.gen, state: v.fence.state, supersededBy: v.fence.supBy }) : '—'; } },
    ];
    const left = h('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      h('div', { style: Object.assign({}, panel, { padding: 14, display: 'flex', flexDirection: 'column', gap: 6 } }),
        h('div', null, h('span', { style: eyebrow }, 'ticket '), h(TicketRef, { id: d.ticket, href: '#' })),
        h('div', null, h('span', { style: eyebrow }, 'created_by '), h(PrincipalRef, { kind: 'agent', id: d.createdBy })),
        h('div', { style: Object.assign({}, mono, { color: 'var(--text-secondary)', fontSize: 13 }) }, 'mime ' + d.mime + ' · sha256 ' + d.sha)),
      h('div', { style: eyebrow }, 'Version history · append-only'),
      h(DataTable, { columns: vcols, rows: d.versions, rowKey: 'seq', reflow: false, emptyMessage: 'No versions.' }),
      h('div', { style: { display: 'flex', gap: 8 } },
        h(ConfirmLight, { label: 'Delete-mark', title: 'Delete-mark current version', consequence: 'Hides the current version from listings. Reversible — a delete-marker can be restored; the bytes are retained.', onConfirm: function () { ctx.deleteMark(d.artifact_id); } }),
        d.versions.length > 1 ? h(ConfirmLight, { label: 'Restore prior', title: 'Restore a prior version', consequence: 'Re-points the current version to a prior one. Reversible pointer move.', onConfirm: function () { ctx.restore(d.artifact_id, d.versions[d.versions.length - 2].version_id); } }) : null));
    const preview = h(PreviewSurface, { artifact: { name: d.name, mime: d.mime, tier: d.tier }, degraded: props.degraded, src: props.degraded ? null : ctx.contentUrl(d.current_version_id), onDownload: function () { ctx.download(d.current_version_id); } });
    return h('div', { style: { display: 'flex', flexDirection: 'column', height: '100%' } }, top,
      h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(340px,1fr) minmax(300px,1fr)', gap: 16, flex: 1, minHeight: 0, padding: '0 4px 4px' } }, left, preview));
  }

  function ConfirmLight(props) {
    const [open, setOpen] = React.useState(false);
    return h(React.Fragment, null,
      h(Button, { tone: 'secondary', size: 'compact', onClick: function () { setOpen(true); } }, props.label),
      h(ConfirmFriction, { open: open, intensity: 'light', title: props.title, consequence: props.consequence, direction: 'less', confirmLabel: props.label, onCancel: function () { setOpen(false); }, onConfirm: function () { setOpen(false); props.onConfirm && props.onConfirm(); } }));
  }

  // ── Screen 3: Upload modal ──
  function Upload(props) {
    const ctx = props.ctx;
    const [ticket, setTicket] = React.useState(props.defaultTicket || '');
    const [name, setName] = React.useState('');
    const [files, setFiles] = React.useState([]);
    const [err, setErr] = React.useState(null);
    function onFiles(list) {
      setFiles(list.map(function (f) { return { name: f.name, state: 'streaming', pct: 0, file: f }; }));
      if (list[0] && !name) setName(list[0].name);
    }
    async function doUpload() {
      setErr(null);
      for (let i = 0; i < files.length; i++) {
        try {
          await window.DR_API.upload(ticket, name || files[i].name, files[i].file, function () {});
          setFiles(function (fs) { const c = fs.slice(); c[i] = Object.assign({}, c[i], { state: 'committed', pct: 100 }); return c; });
        } catch (e) {
          setErr((e.body && e.body.error && e.body.error.code) ? (e.body.error.code + ': ' + e.body.error.message) : e.message);
          setFiles(function (fs) { const c = fs.slice(); c[i] = Object.assign({}, c[i], { state: 'failed' }); return c; });
        }
      }
      if (!err) ctx.reload();
    }
    return h('div', { onMouseDown: function (e) { if (e.target === e.currentTarget) ctx.closeUpload(); }, style: { position: 'fixed', inset: 0, background: 'var(--scrim)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 } },
      h('div', { style: Object.assign({}, panel, { background: 'var(--surface-raised)', boxShadow: 'var(--shadow-dialog)', maxWidth: 520, width: '92%', padding: 18 }) },
        h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 12 } }, h('strong', null, 'Upload to ' + (ticket || 'a ticket')), h('span', { style: { flex: 1 } }), h(Button, { tone: 'ghost', size: 'compact', onClick: ctx.closeUpload }, '✕')),
        h(UploadDropzone, { files: files, onFiles: onFiles }),
        h('div', { style: { display: 'flex', gap: 10, margin: '12px 0' } },
          h(Input, { label: 'Ticket', mono: true, value: ticket, onChange: function (e) { setTicket(e.target.value); }, style: { width: 160 } }),
          h(Input, { label: 'Logical name', value: name, onChange: function (e) { setName(e.target.value); }, style: { flex: 1, minWidth: 160 } })),
        err ? h('div', { style: { color: 'var(--danger-red)', fontFamily: 'var(--font-mono)', fontSize: 12, marginBottom: 8 } }, '✕ ' + err) : null,
        h('div', { style: { display: 'flex', justifyContent: 'flex-end', gap: 8 } },
          h(Button, { tone: 'ghost', onClick: ctx.closeUpload }, 'Cancel'),
          h(Button, { tone: 'primary', onClick: doUpload }, 'Upload'))));
  }

  // ── Screen 4: Admin ──
  function Admin(props) {
    const ctx = props.ctx;
    const head = h(Head, { crumb: 'admin', title: 'Drive admin', sub: 'The one screen with a destructive affordance. GC purge is refused suite-wide while any kill epoch is engaged, and fails closed under auth-staleness.' });
    if (props.status !== 'ok') return h('div', { style: { maxWidth: 1180 } }, head, stateCard(props.status, props.statusOpts));
    const health = props.health, absent = props.absent || [], gc = props.gc, audit = props.audit || [];
    const healthPanel = h('div', { style: Object.assign({}, panel, { padding: 14 }) },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 } }, h('span', { style: eyebrow }, 'Health strip'), h(FreshnessStamp, { age: 'healthz · ' + (health.boardCheck === 'live' ? 'live' : 'degraded') })),
      h(DiskWatermarkMeter, { used: health.watermark[0], watermark: health.watermark[1] }),
      h('div', { style: Object.assign({}, mono, { fontSize: 12, marginTop: 10, color: 'var(--text-secondary)' }) },
        (health.backupStale ? h('span', { style: { color: 'var(--state-amber-ink)' } }, '▲ backup STALE — ' + health.backup) : h('span', null, h('span', { style: { color: 'var(--state-green)' } }, '✔'), ' backup ' + health.backup)),
        '   ·   ', h('span', null, h('span', { style: { color: 'var(--state-green)' } }, '✔'), ' last-verify ' + health.verify),
        '   ·   ', h('span', null, h('span', { style: { color: 'var(--state-green)' } }, '✔'), ' journals ' + health.journals)));
    const absentPanel = h('div', { style: Object.assign({}, panel, { padding: 14 }) },
      h('span', { style: eyebrow }, 'verified_absent escalation queue'),
      absent.length === 0
        ? h('div', { style: { color: 'var(--text-secondary)', marginTop: 8 } }, 'No orphaned artifacts. Tickets that vanish from the Board surface here for disposition.')
        : absent.map(function (r, i) {
          return h('div', { key: i, style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' } },
            h(TicketRef, { id: r.ticket, href: '#' }), h(StatusPill, { tone: 'danger', glyph: '⛒', size: 'sm' }, 'VERIFIED_ABSENT'),
            h('span', { style: mono }, r.name), h(ReviewChip, { state: 'escalated', reason: r.reason, href: '#' }), h('span', { style: { flex: 1 } }),
            h(Button, { tone: 'ghost', size: 'compact' }, 'inspect'));
        }));
    const gcPanel = h('div', { style: Object.assign({}, panel, { padding: 14 }) },
      h('span', { style: eyebrow }, 'Orphan / GC console'),
      h('div', { style: Object.assign({}, mono, { fontSize: 12, color: 'var(--text-muted)', margin: '8px 0' }) }, 'Phase-1 (auto, continuous): ' + gc.phase1 + '  [read-only log]'),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' } },
        h('span', { style: Object.assign({}, mono, { fontSize: 12 }) }, 'Phase-2 (manual): ' + gc.chains + ' delete-marked chains · ' + gc.refcount0 + ' refcount-0 · ' + gc.reclaim + ' reclaimable'),
        h('span', { style: { flex: 1 } }),
        h(DangerAction, {
          label: 'Purge reclaimable', glyph: '⛔', variant: 'solid', intensity: 'full',
          title: 'GC purge — reclaim → destroy',
          consequence: h('span', null, 'This ', h('strong', null, 'PERMANENTLY removes ' + gc.refcount0 + ' refcount-0 blobs (' + gc.reclaim + ')'), ' + ' + gc.chains + ' delete-marked chains. Purged bytes cannot be restored.'),
          direction: 'more', irreversible: true,
          blastRadius: gc.refcount0 + ' blobs · ' + gc.chains + ' chains',
          typedIntent: 'PURGE', stepUp: true,
          auditNote: 'Refused server-side under auth-staleness or an engaged kill epoch (fails closed).',
          confirmLabel: 'Purge', onConfirm: function () { ctx.gcPurge(); },
        })));
    const auditCols = [
      { key: 'at', header: 'Time', render: function (r) { return h('span', { style: Object.assign({}, mono, { color: 'var(--text-muted)' }) }, r.at); } },
      { key: 'who', header: 'Who', render: function (r) { return h(PrincipalRef, { kind: r.kind, id: r.who }); } },
      { key: 'verb', header: 'Action', render: function (r) { return h('code', { style: mono }, r.verb); } },
      { key: 'target', header: 'Target', render: function (r) { return h('span', { style: Object.assign({}, mono, { color: 'var(--text-secondary)' }) }, r.target); } },
      { key: 'outcome', header: 'Outcome', render: function (r) { return h('span', { style: { color: r.outcome === 'STALE_FENCING' ? 'var(--danger-text)' : 'var(--text-secondary)' } }, r.outcome); } },
    ];
    const auditPanel = h('div', { style: Object.assign({}, panel, { padding: 14 }) },
      h('span', { style: eyebrow }, 'Audit log · append-only (mutations + denials)'),
      h('div', { style: { marginTop: 8 } }, h(DataTable, { columns: auditCols, rows: audit, rowKey: 'at', reflow: false, emptyMessage: 'No audit entries yet.' })));
    return h('div', { style: { maxWidth: 1180, display: 'flex', flexDirection: 'column', gap: 16 } }, head, healthPanel, absentPanel, gcPanel, auditPanel);
  }

  window.DRScreens = { Browser, Detail, Upload, Admin };
})();
