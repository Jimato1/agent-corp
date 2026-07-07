/* Helm — Board · app-specific components. Exposed as window.BDParts.
   Each composes shared design-system chips; none redraws a shared entity. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const { StatusPill, TicketRef, PrincipalRef, TierBadge, FenceState, ReviewChip, DataTable, Button } = H;

  const eyebrow = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
  const mono = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
  const panel = { background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

  const STATE_MAP = {
    todo:              { tone: 'neutral',     glyph: '○' },
    in_progress:       { tone: 'interactive', glyph: '◐' },
    awaiting_approval: { tone: 'attention',   glyph: '▲' },
    approved:          { tone: 'verified',    glyph: '✔' },
    executing:         { tone: 'interactive', glyph: '▸' },
    verifying:         { tone: 'attention',   glyph: '⧗' },
    needs_review:      { tone: 'attention',   glyph: '◈' },
    done:              { tone: 'verified',    glyph: '✔' },
    failed:            { tone: 'danger',      glyph: '✕' },
    cancelled:         { tone: 'neutral',     glyph: '⊘' },
    blocked:           { tone: 'attention',   glyph: '⚠' },
  };
  function statePill(state, size) {
    const m = STATE_MAP[state] || STATE_MAP.todo;
    return <StatusPill tone={m.tone} glyph={m.glyph} size={size}>{state}</StatusPill>;
  }
  function taintBadge(taint) {
    const map = { untrusted: 'untrusted', single: 'single', verified: 'verified', cross: 'corroborated' };
    return <TierBadge tier={map[taint] || 'single'} />;
  }
  // lane = a tier-FAMILY companion label; NEVER on the gold ramp.
  function LaneBadge({ lane }) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', height: 17, padding: '0 6px', borderRadius: 999, ...mono, fontSize: 10, color: 'var(--text-muted)', border: '1px solid var(--border-strong)', background: 'var(--bg-control)' }}>lane:{lane}</span>;
  }

  /* Kanban card — all shared chips, no bespoke entity. */
  function TicketCard({ t, onOpen, hot }) {
    return (
      <div role="button" tabIndex={0} onClick={() => onOpen(t)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(t); } }}
        style={{ display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left', width: '100%', cursor: 'pointer', ...panel, padding: 10 }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--border-strong)'} onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-default)'}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <TicketRef id={t.id} />
          {t.epic ? <span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>epic ▸ {t.epic}</span> : null}
        </div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, lineHeight: '16px', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>{t.type}</span>
          <span style={{ ...mono, fontSize: 10, color: 'var(--text-muted)' }}>· {t.priority}</span>
          {statePill(t.state, 'sm')}
        </div>
        {t.claimedBy ? <PrincipalRef kind={t.kind || 'agent'} id={t.claimedBy} /> : null}
        {t.fence ? <FenceState gen={t.fence.gen} lease={t.fence.state !== 'superseded' ? t.fence.lease : undefined} heartbeat={t.fence.hb && t.fence.hb !== '—' ? t.fence.hb : undefined} state={t.fence.state} supersededBy={t.fence.supBy} /> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {taintBadge(t.taint)}
          {t.lane ? <LaneBadge lane={t.lane} /> : null}
        </div>
        {t.state === 'needs_review' ? <ReviewChip reason={t.reviewReason} href="#" /> : null}
        {t.state === 'awaiting_approval' ? <span style={{ ...mono, fontSize: 10, color: 'var(--signal-cyan)' }}>→ approval queue</span> : null}
      </div>
    );
  }

  /* LifecycleKanban — column-per-state container + blocked swimlane + archive. */
  function LifecycleKanban({ data, onOpen }) {
    const [archiveOpen, setArchiveOpen] = React.useState(false);
    const archCols = [
      { key: 'id', header: 'Ticket', render: (t) => <TicketRef id={t.id} /> },
      { key: 'title', header: 'Title', render: (t) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>{t.title}</span> },
      { key: 'state', header: 'State', render: (t) => statePill(t.state, 'sm') },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start' }}>
          {data.COLUMNS.map((col) => {
            const cards = data.ticketsIn(col);
            return (
              <div key={col.key} style={{ flex: '0 0 232px', width: 232, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 2px 6px', borderBottom: '1px solid var(--border-default)' }}>
                  {statePill(col.states ? 'executing' : col.key, 'sm')}
                  <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{col.label}</span>
                  <span style={{ flex: 1 }} />
                  <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{col.total}</span>
                </div>
                {cards.length ? cards.map((t) => <TicketCard key={t.id} t={t} onOpen={onOpen} hot={!!col.states} />)
                  : <div style={{ ...eyebrow, fontSize: 10, color: 'var(--text-disabled)', textTransform: 'none', letterSpacing: 0, padding: '10px 4px', fontFamily: 'var(--font-ui)' }}>Nothing here yet.</div>}
              </div>
            );
          })}
          <div style={{ flex: '0 0 180px', width: 180, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 2px 6px', borderBottom: '1px solid var(--border-default)' }}>
              {statePill('done', 'sm')}
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>done</span>
              <span style={{ flex: 1 }} />
              <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{data.archive.length}</span>
            </div>
            <Button tone="ghost" size="compact" onClick={() => setArchiveOpen((v) => !v)}>{archiveOpen ? 'Hide archive' : 'Archive ▸'}</Button>
          </div>
        </div>

        {archiveOpen ? <DataTable columns={archCols} rows={data.archive} rowKey="id" onRowClick={onOpen} /> : null}

        {/* blocked swimlane */}
        <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)', padding: '10px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ ...eyebrow, color: 'var(--state-amber-ink)' }}>▸ blocked ({data.blocked.length})</span>
            {data.blocked.map((t) => (
              <span key={t.id} role="button" tabIndex={0} onClick={() => onOpen(t)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: 0, cursor: 'pointer' }}>
                <TicketRef id={t.id} />
                {t.blockedReason === 'superseded'
                  ? <FenceState gen={t.fence.gen} supersededBy={t.fence.supBy} state="superseded" />
                  : <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{t.blockedReason}</span>}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* CeremonyRibbon — the ceremony state machine (read-only display of server authority). */
  function CeremonyRibbon({ c }) {
    return (
      <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', ...mono, fontSize: 12 }}>
          {c.phases.map(([name, st], i) => (
            <React.Fragment key={name}>
              {i > 0 ? <span style={{ color: 'var(--text-disabled)' }}>─</span> : null}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: st === 'done' ? 'var(--state-green-ink)' : st === 'current' ? 'var(--signal-cyan-ink)' : 'var(--text-disabled)' }}>
                <span aria-hidden="true">{st === 'done' ? '●' : st === 'current' ? '◉' : '○'}</span>{name}
              </span>
            </React.Fragment>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={mono}>round {c.round[0]}/{c.round[1]}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden="true">⏱</span><span style={mono}>{c.timebox} remaining</span>{c.paused ? <StatusPill tone="attention" size="sm">paused</StatusPill> : null}</span>
          <span>AR veto: {c.veto === 'raised' ? <StatusPill tone="attention" glyph="▲" size="sm">raised</StatusPill> : <StatusPill tone="verified" glyph="✔" size="sm">clear</StatusPill>}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>
          <span>roster:</span>
          {Object.entries(c.roster).map(([role, sub]) => (
            <span key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ ...eyebrow, fontSize: 10 }}>{role}</span><PrincipalRef kind="agent" id={sub} href="#" /></span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>AR grounded dissent: <span style={{ color: 'var(--state-green)' }}>✔ {c.dissent} cited</span> <a href="#" style={{ color: 'var(--text-link)' }}>recon note ▸</a></span>
          <span>PO decision-of-record: <span style={{ color: 'var(--state-amber-ink)' }}>○ {c.poDecision}</span></span>
        </div>
      </div>
    );
  }

  /* TicketLineageTree — parent→child ticket lineage (distinct from MC's agent spawn tree). */
  function TicketLineageTree({ nodes, depth, cap }) {
    return (
      <div style={{ ...mono, fontSize: 12, lineHeight: '22px' }}>
        {nodes.map((n, i) => (
          <div key={i} style={{ paddingLeft: n.indent * 18, color: n.here ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {n.indent > 0 ? <span style={{ color: 'var(--text-disabled)' }}>└ </span> : null}
            <TicketRef id={n.id} href="#" /> {statePill(n.state, 'sm')}
            {n.by ? <span style={{ color: 'var(--text-muted)' }}> · <PrincipalRef kind="agent" id={n.by} href="#" /></span> : null}
            {n.here ? <span style={{ color: 'var(--signal-cyan)' }}> ← here</span> : null}
          </div>
        ))}
        <div style={{ marginTop: 6, color: depth >= cap ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>lineage_depth {depth} / cap {cap}{depth >= cap ? ' ▲' : ''}</div>
      </div>
    );
  }

  window.BDParts = { statePill, taintBadge, LaneBadge, TicketCard, LifecycleKanban, CeremonyRibbon, TicketLineageTree, eyebrow, mono, panel };
})();
