/* Helm — Mission Control · screens (all 10). Exposed as window.MCScreens.
   Every screen: Instrument archetype, dark-only, compact. Mirrors carry
   source/as-of; the false-green rule is honored throughout. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.MC_DATA;
  const P = window.MCParts;
  const {
    DataTable, TicketRef, PrincipalRef, TierBadge, StatusPill, ReviewChip, FenceState,
    FreshnessStamp, Button, DangerAction, ConfirmFriction, StopActuator, HaltBand,
    HonestState, PrintedAbsence, EmptyState, ErrorState, Input,
  } = H;
  const { SourceStamp, KillLevelPill, Panel, Liveness, AttentionBand, FleetAnomalyBanner, SpawnTree, BudgetMeter, EdgeTile, eyebrow, mono, panelStyle } = P;

  const provBadge = (q) => {
    if (q.prov === 'untrusted') return <TierBadge tier="untrusted" label={`Untrusted · ${q.provNote}`} />;
    if (q.prov === 'verified') return <TierBadge tier="verified" label={q.provNote} />;
    if (q.prov === 'single') return <TierBadge tier="single" />;
    return <TierBadge tier="single" label={q.provNote} />;
  };
  const gatePill = (g) => g === 'awaiting_approval'
    ? <StatusPill tone="attention" glyph="◐" size="sm">awaiting_approval</StatusPill>
    : g === 'needs_review' ? <StatusPill tone="attention" glyph="◈" size="sm">needs_review</StatusPill>
    : <StatusPill tone="attention" glyph="⚑" size="sm">escalated</StatusPill>;

  function Head({ crumb, title, sub, right }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          {crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, lineHeight: '26px', fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
          {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '80ch' }}>{sub}</p> : null}
        </div>
        {right}
      </div>
    );
  }

  /* Light-variant confirm (toward-LESS action): cyan single confirm, no typing. */
  function ConfirmButton({ label, tone = 'secondary', size, ...cf }) {
    const [open, setOpen] = React.useState(false);
    return (
      <React.Fragment>
        <Button tone={tone} size={size} onClick={() => setOpen(true)}>{label}</Button>
        <ConfirmFriction open={open} intensity={cf.intensity || 'light'} title={cf.title || label} confirmLabel={cf.confirmLabel || label}
          consequence={cf.consequence} direction={cf.direction || 'less'} auditNote={cf.auditNote} honest={cf.honest}
          onCancel={() => setOpen(false)} onConfirm={() => { setOpen(false); cf.onConfirm && cf.onConfirm(); }} />
      </React.Fragment>
    );
  }

  /* ===== 1 · Cockpit Overview ===== */
  function Overview({ ctx }) {
    const c = D.counts;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1240 }}>
        <Head title="Mission Control · operator cockpit" sub="What is the fleet doing, and can you stop it? Every tile is a mirror with a source stamp — nothing here is authoritative." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
          <Panel title="Posture" stamp={<SourceStamp source="auth" age="0.3s" />} deepLabel="Halt" onDeep={() => ctx.goto('halt')} pad={14}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <KillLevelPill level={ctx.posture === 'kill' ? 'G1' : 'G0'} />
              <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>L1 auth ✔ 0.3s</div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>L2 gateway ✔ auth-dir</div>
            </div>
          </Panel>
          <Panel title="Fleet" stamp={<SourceStamp source="runtime" age="0.8s" />} deepLabel="Agents" onDeep={() => ctx.goto('agents')} pad={14}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{c.online} online <span style={{ fontSize: 12, color: 'var(--state-amber-ink)', fontWeight: 500 }}>· 1 wedged*</span></div>
              <div style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)' }}>{c.zombie} zombie ⚠ · 0 crash</div>
            </div>
          </Panel>
          <Panel title="Queue" stamp={<SourceStamp source="board" age="2s" />} deepLabel="Review" onDeep={() => ctx.goto('review')} pad={14}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>
              <div><b style={{ color: 'var(--text-primary)', fontSize: 18 }}>{c.awaiting}</b> awaiting_approval</div>
              <div>{c.needsReview} needs_review · {c.escalated} escalated ⚑</div>
            </div>
          </Panel>
          <Panel title="Guardrails" stamp={<SourceStamp source="auth+board" age="2s" />} deepLabel="Budgets" onDeep={() => ctx.goto('budgets')} pad={14}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>
              <div>WIP <b style={{ color: 'var(--text-primary)' }}>22/30</b> global</div>
              <div style={{ color: 'var(--state-amber-ink)' }}>3 budgets near cap ▲</div>
              <div style={{ color: 'var(--state-amber-ink)' }}>2 spawn-depth flags</div>
            </div>
          </Panel>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <Panel title="Dependencies" stamp={<SourceStamp source="mc" age="0.5s" />} pad={14}>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {D.DEPENDENCIES.map((d) => (
                <span key={d.key} style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{d.label} <span style={{ color: 'var(--state-green)' }}>✔</span>{d.age}</span>
              ))}
            </div>
          </Panel>
          <Panel title="Anchor continuity" stamp={<SourceStamp source="gateway push" age="41s" />} deepLabel="Anchors" onDeep={() => ctx.goto('anchors')} pad={14}>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>chain gw-main · seq 4471 <span style={{ color: 'var(--state-green)' }}>✔ continuous</span> · 0.9s ago</div>
          </Panel>
        </div>
      </div>
    );
  }

  /* ===== 2 · Live Agent View ===== */
  function LiveAgentView({ ctx }) {
    const [anomaly, setAnomaly] = React.useState(false);
    const columns = [
      { key: 'sub', header: 'Agent', render: (a) => <PrincipalRef kind="agent" id={a.sub} href="#" onClick={(e) => { e.preventDefault(); ctx.openAgent(a); }} /> },
      { key: 'liveness', header: 'Liveness', render: (a) => <Liveness agent={a} stale={anomaly} /> },
      { key: 'step', header: 'Step · ticket', render: (a) => a.ticket ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{a.step}</span><TicketRef id={a.ticket} href="#" /></span> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
      { key: 'fence', header: 'Fencing', render: (a) => a.fence ? <FenceState gen={a.fence.gen} lease={a.fence.state !== 'superseded' ? a.fence.lease : undefined} heartbeat={a.fence.hb} state={a.fence.state} supersededBy={a.fence.supBy} /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
      { key: 'budget', header: 'Budget', align: 'right', render: (a) => <span style={{ ...mono, fontSize: 12, color: a.budget.rateTrip ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>rate {a.budget.rate}%{a.budget.rateTrip ? '▲' : ''}</span> },
      { key: 'model', header: 'Model', render: (a) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{a.model.split('@')[1]}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1240 }}>
        <Head crumb="/agents" title="Fleet liveness" sub="Liveness is never a bare green dot — it's the phi-accrual suspicion figure + last-beat age + a state pill. Agent Runtime surfaces through this view."
          right={<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><SourceStamp source="runtime" age="0.8s" stale={anomaly} staleLabel="STREAM DOWN" /><Button tone="ghost" size="compact" onClick={() => setAnomaly((v) => !v)}>{anomaly ? '↺ Restore stream (demo)' : '⚠ Simulate correlated loss (demo)'}</Button></div>} />
        {anomaly ? <FleetAnomalyBanner suppressed={14} /> : <AttentionBand agents={D.AGENTS} onOpen={ctx.openAgent} />}
        <DataTable columns={columns} rows={D.AGENTS} rowKey="sub" onRowClick={ctx.openAgent} />
      </div>
    );
  }

  /* ===== 3 · Agent drill-in ===== */
  function AgentDrillIn({ agent, ctx }) {
    const a = agent;
    const tree = [
      { id: 'T-000100', label: 'epic', indent: 0 },
      { id: a.ticket || 'T-000123', label: '⬡ ' + a.sub.split(':')[1], indent: 1, here: true },
      { id: 'T-000131', label: '⬡ patcher-09', indent: 2 },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 980 }}>
        <button onClick={() => ctx.goto('agents')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to fleet</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <PrincipalRef kind="agent" id={a.sub} />
          <Liveness agent={a} />
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>session {a.session} · {a.model}</span>
          <span style={{ flex: 1 }} />
          <SourceStamp source="runtime" age="0.8s" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <Panel title="Current claim" pad={16}>
            {a.ticket ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><TicketRef id={a.ticket} href="#" /><StatusPill tone="attention" glyph="▲" size="sm">executing · tier2</StatusPill></div>
                {a.fence ? <FenceState gen={a.fence.gen} lease={a.fence.state !== 'superseded' ? a.fence.lease : undefined} heartbeat={a.fence.hb} state={a.fence.state} supersededBy={a.fence.supBy} /> : null}
              </div>
            ) : <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No active claim.</span>}
          </Panel>
          <Panel title="Budget · 4-dim (never dollars)" stamp={<SourceStamp source="auth" age="1.1s" />} pad={16}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              <BudgetMeter label="rate" pct={a.budget.rate} value={a.budget.rate + '%'} trip={a.budget.rateTrip} />
              <BudgetMeter label="cooldown" pct={a.budget.cooldownTrip ? 90 : 5} value={a.budget.cooldown} trip={a.budget.cooldownTrip} />
              <BudgetMeter label="concurrency" pct={a.budget.conc[0] / a.budget.conc[1] * 100} value={a.budget.conc[0] + '/' + a.budget.conc[1]} />
              <BudgetMeter label="lifetime" pct={a.budget.lifetime} value={a.budget.lifetime + '% of TTL'} />
            </div>
          </Panel>
          <Panel title="Spawn tree · Board lineage" pad={16}><SpawnTree nodes={tree} depth={a.depth} cap={a.cap} /></Panel>
          <Panel title="Progress trail · advisory" stamp={<SourceStamp source="runtime + mc:report" age="0.8s" />} pad={16}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div>09:41 step41 report_status: "retrying apt lock" <StatusPill tone="verified" size="sm">host-orig? no</StatusPill></div>
              <div>09:37 step39 <span style={{ color: 'var(--state-amber-ink)' }}>⚑ request_escalation</span> "apt held 14m"</div>
            </div>
          </Panel>
        </div>
      </div>
    );
  }

  /* ===== 4 · Review + Approval Queue ===== */
  function ReviewQueue({ ctx }) {
    const [filter, setFilter] = React.useState('all');
    const tabs = [['all', 'all'], ['awaiting_approval', 'awaiting_approval ' + D.counts.awaiting], ['needs_review', 'needs_review ' + D.counts.needsReview], ['escalated', 'escalations ' + D.counts.escalated]];
    const rows = D.QUEUE.filter((q) => filter === 'all' || q.gate === filter);
    const columns = [
      { key: 'id', header: 'Ticket', render: (q) => <TicketRef id={q.id} href="#" /> },
      { key: 'gate', header: 'Gate', render: (q) => gatePill(q.gate) },
      { key: 'prov', header: 'Provenance', render: provBadge },
      { key: 'proposer', header: 'Proposer', render: (q) => <PrincipalRef kind="agent" id={q.proposer} /> },
      { key: 'tier', header: 'Tier', render: (q) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{q.tier}</span> },
      { key: 'age', header: 'Age', align: 'right', sortable: true, sortValue: (q) => q.age, render: (q) => <FreshnessStamp age={q.age} state={q.stale ? 'stale' : 'live'} reading={q.stale ? 'aging' : undefined} /> },
      { key: 'reason', header: 'Reason', render: (q) => q.gate === 'escalated' ? <ReviewChip state="escalated" reason={q.reason} /> : <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{q.reason}</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1240 }}>
        <Head crumb="/review" title="Review + approval queue" sub="One inbox for both human gates — pre-execution approvals and post-work reviews. The canonical version; Chat's doorbell, Notes, and Board's filter all resolve here. Item id IS the Board ticket_id."
          right={<SourceStamp source="board" age="2s" />} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {tabs.map(([k, label]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ height: 28, padding: '0 12px', borderRadius: 'var(--radius-control)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, border: '1px solid ' + (filter === k ? '#14424F' : 'var(--border-default)'), background: filter === k ? 'var(--signal-cyan-wash)' : 'transparent', color: filter === k ? 'var(--signal-cyan-ink)' : 'var(--text-secondary)' }}>{label}</button>
          ))}
        </div>
        {ctx.posture === 'kill' ? <HaltBand mode="kill" confirmed={12} pending={2} draining={1} pendingCountdown="1:48" drainingDetail="host-04 · T-000123" reviewHref="#" showTriad /> : null}
        <DataTable columns={columns} rows={rows} rowKey="id" onRowClick={ctx.openItem} />
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>bulk: host-originated rows are excluded from auto-approve — the UI renders the fact; the server enforces the lane.</div>
      </div>
    );
  }

  /* ===== 5 · Review item ===== */
  function ReviewItem({ item, ctx }) {
    const q = item;
    const [decision, setDecision] = React.useState(null); // null | 'requested' | 'approved' | 'rejected'
    const requestApprove = () => { setDecision('requested'); setTimeout(() => setDecision('approved'), 1600); };
    const destructive = q.tier === 'tier1' || q.tier === 'tier2' || q.prov === 'untrusted';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
        <button onClick={() => ctx.goto('review')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to queue</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TicketRef id={q.id} /> {gatePill(q.gate)} <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>· {q.tier}</span>
          <span style={{ flex: 1 }} /><SourceStamp source="board" age="1s" />
        </div>
        {q.prov === 'untrusted' ? (
          <div style={{ background: 'var(--state-amber-wash)', border: '1px solid #7A5A1E', borderRadius: 6, padding: '10px 14px', display: 'flex', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--state-amber-ink)' }}>
            <span aria-hidden="true">⚠</span><span><b>UNTRUSTED · host-originated</b> ({q.provNote}) → auto-approve lane <b>INELIGIBLE</b>. The plan text is adversarial input to the models; a human decides.</span>
          </div>
        ) : null}
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center', fontFamily: 'var(--font-ui)', fontSize: 13 }}>
          <span><span style={{ color: 'var(--text-muted)' }}>Proposer </span><PrincipalRef kind="agent" id={q.proposer} /></span>
          <span><span style={{ color: 'var(--text-muted)' }}>Ceremony </span>{q.ceremony}</span>
          <a href="#" style={{ color: 'var(--text-link)' }}>transcript note ↗ Notes</a>
        </div>
        <Panel title="Plan (read-only, from Board)" pad={16}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: '23px', color: 'var(--text-primary)', margin: '0 0 10px' }}>{q.plan.line}</p>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', ...mono, fontSize: 12, color: 'var(--text-muted)' }}>
            <span>blast radius: <span style={{ color: 'var(--text-secondary)' }}>{q.plan.radius}</span></span>
            <span>verify: <span style={{ color: 'var(--text-secondary)' }}>{q.plan.verify}</span></span>
          </div>
        </Panel>
        <PrintedAbsence why="MC holds no standing approve credential — the decision writes browser-direct to Board under your session.">
          <strong>An agent can never approve its own work.</strong>
        </PrintedAbsence>

        {decision === 'approved' ? (
          <div style={{ ...panelStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusPill tone="verified" glyph="✔">Approved</StatusPill>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>by <PrincipalRef kind="operator" id="operator:ada" /> · 09:44:02 · entry #{q.entry}</span>
          </div>
        ) : decision === 'requested' ? (
          <div style={{ ...panelStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <StatusPill tone="attention" glyph="◐">approval requested — awaiting Board confirm</StatusPill>
            <FreshnessStamp age="just now" /><span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>never a false green until Board confirms</span>
          </div>
        ) : decision === 'rejected' ? (
          <div style={{ ...panelStyle, padding: 16 }}><StatusPill tone="danger" glyph="✕">Rejected &amp; held</StatusPill></div>
        ) : (
          <div style={{ ...panelStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={eyebrow}>Decision</span><span style={{ flex: 1 }} />
            <DangerAction label="Reject / hold" glyph="⚠" variant="outline" title={`Reject ${q.id}`}
              consequence="Rejects this plan and holds the proposer. It cannot proceed." direction="less"
              confirmLabel="Reject" onConfirm={() => setDecision('rejected')} />
            <DangerAction label="Approve — writes to Board" glyph="⚠" variant="solid" title={`Approve ${q.id}`}
              consequence={<>This authorizes Gateway execution against <strong>{q.plan.radius}</strong>. It moves the system toward MORE real-world action.</>}
              direction="more" irreversible blastRadius={q.plan.radius}
              honest={ctx.posture === 'kill' ? { confirmed: 12, pending: 2, draining: 1, pendingCountdown: '1:48' } : undefined}
              typedIntent={q.id} stepUp auditNote="Write is browser-direct to Board; MC records only the request in mc_audit."
              confirmLabel="Approve" onConfirm={requestApprove} />
          </div>
        )}
      </div>
    );
  }

  /* ===== 6 · Halt Control (THE signature safety screen) ===== */
  function HaltControl({ ctx }) {
    const engaged = ctx.posture === 'kill';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 980 }}>
        <Head crumb="/halt" title="Global kill switch" sub="MC hosts the actuation, wired to CALL auth under your session. MC mints no epoch and stores no authoritative halted state — the readout is a read-mirror that degrades honestly."
          right={<SourceStamp source="auth" age="0.3s" />} />
        <Panel title="Mirror · read-only, honest" pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={eyebrow}>Level</span><KillLevelPill level={engaged ? 'G1' : 'G0'} />
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>epoch {D.EPOCH} · ⟳ 0.3s · source: auth</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
            <div>L1 (identity, auth) <span style={{ color: 'var(--state-green)' }}>✔ enforced</span> · epoch {D.EPOCH} · 0.3s</div>
            <div>L2 (physical, gateway) <span style={{ color: 'var(--state-green)' }}>✔ CONFIRMED</span> · 1.1s <span style={{ color: 'var(--text-muted)' }}>← provenance: AUTH-DIRECT</span></div>
            <div style={{ color: 'var(--text-muted)', paddingLeft: 12 }}>└ an MC-relayed L2 can read at most STALE-UNKNOWN, never CONFIRMED</div>
          </div>
        </Panel>

        {engaged ? <HaltBand mode="kill" confirmed={12} pending={2} draining={1} pendingCountdown="1:48" drainingDetail="host-04 · T-000123" reviewHref="#" /> : null}

        <Panel title="Actuate · calls auth under your live session — MC holds no standing kill credential 🔒" pad={16}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={eyebrow}>G1 · Freeze-destructive</span>
              <StopActuator level="G1" engaged={engaged} onEngage={() => ctx.onEngage('G1')} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={eyebrow}>G2 · Quiesce-all</span>
              <StopActuator level="G2" engaged={engaged} onEngage={() => ctx.onEngage('G2')} />
            </div>
          </div>
          <Input label="Reason (required, → auth)" placeholder="why are you stopping the fleet?" style={{ width: '100%' }} />
          <div style={{ marginTop: 12, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Button tone="ghost" size="compact" onClick={ctx.onHaltFail}>⚠ Simulate auth call failure (demo)</Button>
            {engaged ? <DangerAction label="Lift stop" glyph="⛔" variant="solid" title="Lift the suite-wide stop"
              consequence={<>This <strong>lifts the kill-switch</strong> — toward MORE action. Agents resume executing approved plans.</>}
              direction="more" irreversible blastRadius="the whole fleet"
              honest={{ confirmed: 12, pending: 2, draining: 1, pendingCountdown: '1:48' }}
              typedIntent="LIFT STOP" stepUp auditNote="Writes a tamper-evident audit row." confirmLabel="Lift stop" onConfirm={ctx.onLift} /> : null}
          </div>
        </Panel>

        <PrintedAbsence glyph="⛊" why="auth is the single enforcement point; it mints the epoch and propagates it. MC stores no authoritative halted state." tag="by construction">
          <strong>MC cannot enforce a stop.</strong> This control REQUESTS a halt from auth.
        </PrintedAbsence>
      </div>
    );
  }

  /* ===== 7 · WIP & Budget monitors ===== */
  function Budgets({ ctx }) {
    const columns = [
      { key: 'sub', header: 'Agent', render: (a) => <PrincipalRef kind="agent" id={a.sub} href="#" onClick={(e) => { e.preventDefault(); ctx.openAgent(a); }} /> },
      { key: 'rate', header: 'Rate', render: (a) => <BudgetMeter label="" width={120} pct={a.budget.rate} value={a.budget.rate + '%'} trip={a.budget.rateTrip} /> },
      { key: 'conc', header: 'Concurrency', render: (a) => <BudgetMeter label="" width={110} pct={a.budget.conc[0] / a.budget.conc[1] * 100} value={a.budget.conc[0] + '/' + a.budget.conc[1]} /> },
      { key: 'cooldown', header: 'Cooldown', render: (a) => <span style={{ ...mono, fontSize: 12, color: a.budget.cooldownTrip ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>{a.budget.cooldown}{a.budget.cooldownTrip ? ' ▲' : ''}</span> },
      { key: 'lifetime', header: 'Lifetime', render: (a) => <BudgetMeter label="" width={110} pct={a.budget.lifetime} value={a.budget.lifetime + '%'} /> },
      { key: 'trips', header: 'Recent trips', align: 'right', render: (a) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{a.trips}</span> },
      { key: 'act', header: '', render: (a) => <ConfirmButton label="Clamp" tone="secondary" size="compact" title={`Clamp ${a.sub}`} consequence="Tightens this agent's budget — toward LESS action." direction="less" confirmLabel="Clamp" /> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1240 }}>
        <Head crumb="/budgets" title="WIP + budget" sub="auth's four budget dimensions per principal (rate / concurrency / cooldown / lifetime — never dollars) and Board's WIP caps. MC surfaces and auto-triages; the Board enforces."
          right={<SourceStamp source="auth+board" age="2s" />} />
        <Panel title="Global WIP · Redis state MC owns; auth holds policy" stamp={<SourceStamp source="redis" age="0.6s" />} pad={16}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <BudgetMeter label="global WIP" width={260} pct={73} value="22/30" />
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>per-agent cap 4 · spawn-depth flags 2 · runaway 0</span>
            <span style={{ flex: 1 }} />
            <DangerAction label="Widen WIP cap" glyph="⚠" variant="outline" title="Widen the global WIP cap"
              consequence="Raising the cap lets MORE work run at once — toward MORE action." direction="more"
              typedIntent="WIDEN CAP" stepUp auditNote="Routes to Board; writes an audit row." confirmLabel="Widen cap" />
          </div>
        </Panel>
        <DataTable columns={columns} rows={D.AGENTS} rowKey="sub" />
      </div>
    );
  }

  /* ===== 8 · Edge & Observability ===== */
  function Edge() {
    const [down, setDown] = React.useState(false);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1240 }}>
        <Head crumb="/edge" title="Edge & observability" sub="Per-app proxy health from the mc_prometheus / mc_blackbox sidecars. Read-only. A sidecar down never shows a green 'all healthy' — it shows the honest unknown."
          right={<Button tone="ghost" size="compact" onClick={() => setDown((v) => !v)}>{down ? '↺ Restore sidecar (demo)' : '⚠ Simulate sidecar down (demo)'}</Button>} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {D.EDGE.map((t, i) => <EdgeTile key={t.app} tile={t} stale={down && i % 2 === 1} />)}
        </div>
      </div>
    );
  }

  /* ===== 9 · Audit-anchor continuity ===== */
  function Anchors() {
    const statusCell = (s) => s === 'retained'
      ? <StatusPill tone="verified" glyph="✔" size="sm">retained</StatusPill>
      : <StatusPill tone="attention" glyph="⚠" size="sm">GAP · RESYNC-PENDING</StatusPill>;
    const columns = [
      { key: 'at', header: 'Signed at', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.at}</span> },
      { key: 'chain', header: 'Chain', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.chain}</span> },
      { key: 'seq', header: 'Seq', align: 'right', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{r.seq}</span> },
      { key: 'hash', header: 'Head hash', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.hash}</span> },
      { key: 'status', header: 'Status', render: (r) => statusCell(r.status) },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1080 }}>
        <Head crumb="/anchors" title="Audit-anchor continuity" sub="MC's independent off-box tamper-evidence witness. It anchors the Gateway's signed chain HEAD hash, never the contents, and never reads this copy back into a decision path."
          right={<SourceStamp source="gateway push" age="41s" />} />
        <Panel pad={16}>
          <div style={{ ...mono, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span>chain gw-main · latest seq {D.EPOCH}</span>
            <StatusPill tone="verified" glyph="✔" size="sm">CONTINUOUS</StatusPill>
            <span style={{ color: 'var(--text-muted)' }}>verify: HEAD hash matches retained series · ⟳ 0.9s · (anchors hash, not content)</span>
          </div>
        </Panel>
        <DataTable columns={columns} rows={D.ANCHORS} rowKey="seq" reflow={false} />
      </div>
    );
  }

  /* ===== 10 · Guardrail settings ===== */
  function Settings() {
    const S = D.SETTINGS;
    const presizing = (v) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <span style={{ ...mono, fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-inset)', border: '1px solid var(--border-strong)', borderRadius: 4, padding: '3px 10px' }}>{v}</span>
      <StatusPill tone="attention" glyph="⚠" size="sm">PRE-SIZING DEFAULT</StatusPill>
    </span>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 980 }}>
        <Head crumb="/settings" title="Guardrail settings" sub="The only durable MC-owned config. Values are operator-set — there are no compiled-in defaults, and no component enforces on a PRE-SIZING value." />
        <Panel title="Sizing params" pad={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ ...eyebrow, width: 180 }}>suppress_fraction</span>{presizing(S.suppress_fraction)}<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>set post gap-1.2</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ ...eyebrow, width: 180 }}>suppress_window</span>{presizing(S.suppress_window)}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ ...eyebrow, width: 180 }}>phi_threshold</span><span style={{ ...mono, fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-inset)', border: '1px solid var(--border-strong)', borderRadius: 4, padding: '3px 10px' }}>{S.phi_threshold}</span><span style={{ ...eyebrow }}>noisy_net_phi</span><span style={{ ...mono, fontSize: 13, color: 'var(--text-primary)', background: 'var(--surface-inset)', border: '1px solid var(--border-strong)', borderRadius: 4, padding: '3px 10px' }}>{S.noisy_net_phi}</span></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}><span style={{ ...eyebrow, width: 180 }}>progress_budget[patcher]</span>
              <span style={{ ...mono, fontSize: 13, color: 'var(--state-amber-ink)', background: 'var(--state-amber-wash)', border: '1px solid #5A4A1E', borderRadius: 4, padding: '3px 10px' }}>{S.progress_budget_patcher}</span>
              <StatusPill tone="attention" glyph="⚠" size="sm">wedged classification DARK until set</StatusPill></div>
            <div><ConfirmButton label="Save params" tone="primary" title="Save guardrail params" intensity="full"
              consequence="This changes suppression and phi behavior across the fleet. The confirm is bound to the exact diff you saw."
              direction="more" auditNote="Diff-hash-bound; writes a tamper-evident mc_audit row." confirmLabel="Save params" /></div>
          </div>
        </Panel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <Panel title="Silences" pad={16}>
            {S.silences.map((s) => <div key={s.sub} style={{ display: 'flex', alignItems: 'center', gap: 8 }}><PrincipalRef kind="agent" id={s.sub} /><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{s.ttl}</span><span style={{ color: 'var(--text-link)', cursor: 'pointer' }}>✕</span></div>)}
          </Panel>
          <Panel title="Saved filters" pad={16}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{S.filters.map((f) => <StatusPill key={f} tone="neutral" size="sm">{f}</StatusPill>)}</div>
          </Panel>
        </div>
      </div>
    );
  }

  window.MCScreens = { Overview, LiveAgentView, AgentDrillIn, ReviewQueue, ReviewItem, HaltControl, Budgets, Edge, Anchors, Settings };
})();
