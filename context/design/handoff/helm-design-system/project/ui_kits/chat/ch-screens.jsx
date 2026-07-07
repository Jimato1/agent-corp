/* Helm — Chat · screens (4). Exposed as window.CHScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.CH_DATA;
  const P = window.CHParts;
  const { DataTable, TicketRef, PrincipalRef, StatusPill, FenceState, ReviewChip, FreshnessStamp, Button, DangerAction, ConfirmFriction, PrintedAbsence, Input } = H;
  const { KindBadge, eyebrow, mono, panel } = P;

  function Head({ crumb, title, sub, right }) {
    return <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>{crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}</div>{right}</div>;
  }

  /* 1 · Feed */
  function Feed({ ctx }) {
    const rows = [...D.FEED].sort((a, b) => (a.kind === 'escalation' && !a.acked ? -1 : 0) - (b.kind === 'escalation' && !b.acked ? -1 : 0));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <Head title="Feed" sub="The suite's doorbell — agent→operator escalations, review-ready work, and completions. Chat surfaces review; it never clears it." right={<FreshnessStamp age="feed fresh 0.4s" />} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Input icon="/" placeholder="filter…" style={{ flex: 1, minWidth: 180 }} />
          <Button tone="secondary" size="compact">Ack all seen ▸</Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((n) => {
            const pinned = n.kind === 'escalation' && !n.acked;
            return (
              <div key={n.id} onClick={() => ctx.openNote(n)} style={{ cursor: 'pointer', ...panel, borderColor: pinned ? '#5A4A1E' : 'var(--border-default)', background: pinned ? 'var(--state-amber-wash)' : (n.acked ? 'var(--surface-panel)' : 'var(--bg-card)'), opacity: n.acked ? 0.72 : 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <KindBadge kind={n.kind} prio={n.prio} />
                  <PrincipalRef kind={n.akind} id={n.author} />
                  {n.reason ? <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>· {n.reason}</span> : null}
                  {n.ticket ? <TicketRef id={n.ticket} href="#" /> : null}
                  <span style={{ flex: 1 }} />
                  <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{n.age}{n.repeat > 1 ? ` ·×${n.repeat}` : ''}</span>
                  <Button tone="ghost" size="compact" onClick={(e) => { e.stopPropagation(); }}>Ack</Button>
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>{n.body}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  {n.ticket ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ReviewChip reason="→ mc/review" href="#" /><span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>(target wins)</span></span> : null}
                  {n.fence ? <span style={{ opacity: 0.55 }}><FenceState gen={n.fence.gen} advisory state="held" /></span> : null}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>showing 90d · 3 unacked · 41 total · [ load older → ]</div>
      </div>
    );
  }

  /* 2 · Notification detail */
  function NoteDetail({ note, ctx }) {
    const n = note;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
        <button onClick={() => ctx.goto('feed')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Feed</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <KindBadge kind={n.kind} prio={n.prio} /><PrincipalRef kind={n.akind} id={n.author} />{n.reason ? <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{n.reason}</span> : null}
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <span>{n.id} ⧉</span><span>posted {n.age} · ×{n.repeat}</span>{n.ticket ? <TicketRef id={n.ticket} href="#" /> : null}
        </div>
        <div style={{ background: 'var(--signal-cyan-wash)', border: '1px solid #14424F', borderRadius: 'var(--radius-panel)', padding: '10px 14px', fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: '18px', color: 'var(--signal-cyan-ink)' }}>
          ⓘ This is a snapshot from when it was posted. The live target is authoritative — open it: <a href="#" style={{ color: 'var(--signal-cyan)' }}>◈ → mc/review/{n.ticket || '…'}</a> <b>[ Open in MC → ]</b>
        </div>
        <div style={{ ...panel, overflow: 'hidden' }}>
          <div style={{ background: 'var(--paper-page)', padding: '28px 32px' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 17, lineHeight: '28px', color: 'var(--paper-ink)', margin: 0 }}>{n.body}</p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: '25px', color: '#6A6A62', margin: '12px 0 0' }}>Body is allowlist-markdown only. Raw HTML and remote images are stripped to dead text; <span style={{ textDecoration: 'underline dotted' }}>links render as dead text</span> — the only live link is the MC deep-link above (anti-phishing).</p>
          </div>
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={eyebrow}>envelope</span>kind {n.kind} · P{n.prio}{n.fence ? <span style={{ opacity: 0.6 }}><FenceState gen={n.fence.gen} advisory state="held" /></span> : null}
        </div>
      </div>
    );
  }

  /* 3 · Broadcast */
  function Broadcast() {
    const B = D.BROADCAST_ACTIVE;
    const cols = [
      { key: 'id', header: 'ID', render: (r) => <TicketRef id={r.id} /> },
      { key: 'body', header: 'Body', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>{r.body}</span> },
      { key: 'by', header: 'By', render: (r) => <PrincipalRef kind="operator" id={r.by} /> },
      { key: 'posted', header: 'Posted', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.posted}</span> },
      { key: 'state', header: 'State', render: (r) => r.state === 'active' ? <StatusPill tone="verified" glyph="●" size="sm">active</StatusPill> : r.state === 'expired' ? <StatusPill tone="neutral" glyph="◼" size="sm">expired</StatusPill> : <StatusPill tone="danger" glyph="⛒" size="sm">revoked</StatusPill> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
        <Head title="Broadcast" sub="A soft operator→fleet advisory. It does not stop, gate, or command any agent." />
        <div style={{ background: 'var(--signal-cyan-wash)', border: '1px solid #14424F', borderRadius: 'var(--radius-panel)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18 }}>📣</span>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--signal-cyan-ink)' }}>P{B.prio} · "{B.body}"</div>
            <div style={{ ...mono, fontSize: 11, color: 'var(--signal-cyan-ink)', opacity: 0.8 }}>by <PrincipalRef kind="operator" id={B.by} /> · posted {B.posted} · expires in {B.expires}</div>
          </div>
          <DangerAction label="Revoke" glyph="⚠" variant="outline" size="compact" intensity="light" title="Revoke broadcast" consequence="Withdraws the active broadcast — toward LESS. Writes an audit row." direction="less" confirmLabel="Revoke" />
        </div>
        <PrintedAbsence glyph="🔒" tag="not a stop">
          <strong>A broadcast is an advisory the fleet MAY read.</strong> It does not stop, gate, or command any agent. To halt the fleet, use MC/auth.
        </PrintedAbsence>
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={eyebrow}>Compose</div>
          <Input label="Body" placeholder="markdown, ≤2000…" style={{ width: '100%' }} />
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Input label="Priority" mono defaultValue="3" style={{ width: 90 }} />
            <Input label="Expires" defaultValue="24h" style={{ width: 110 }} />
            <span style={{ flex: 1 }} />
            <Button tone="primary">Post broadcast</Button>
          </div>
        </div>
        <div style={{ ...panel, padding: 14 }}>
          <div style={{ ...eyebrow, marginBottom: 8 }}>History</div>
          <DataTable columns={cols} rows={D.BROADCAST_HISTORY} rowKey="id" reflow={false} />
        </div>
      </div>
    );
  }

  /* 4 · Health */
  function Health() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 820 }}>
        <Head title="Health" sub="The doorbell's own liveness. The false-green prohibition binds hardest here — a doorbell that lies about whether it can ring is the worst failure." />
        <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column' }}>
          {D.HEALTH.map((r, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < D.HEALTH.length - 1 ? '1px solid var(--border-default)' : 0 }}>
              <span style={{ width: 24, textAlign: 'center', fontVariantEmoji: 'text' }}>{r.icon}</span>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', width: 110 }}>{r.label}</span>
              {r.pending ? <span style={{ color: 'var(--state-amber-ink)' }}>▲</span> : <span style={{ color: 'var(--state-green)' }}>●</span>}
              <span style={{ ...mono, fontSize: 12, color: r.pending ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>{r.detail}</span>
              <span style={{ flex: 1 }} />
              <span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>source: {r.source}</span>
            </div>
          ))}
        </div>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>── MC resolve seam ── the mc:read grant is pre-freeze; the resolve row stays honest-PENDING and deep-links fall back to MC home.</div>
      </div>
    );
  }

  window.CHScreens = { Feed, NoteDetail, Broadcast, Health };
})();
