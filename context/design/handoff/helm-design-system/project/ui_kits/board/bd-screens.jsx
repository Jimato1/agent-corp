/* Helm — Board · screens. Exposed as window.BDScreens.
   Instrument archetype, dark-only. The Board mints the approval RECORD; MC owns
   the canonical review QUEUE — Approvals here is a Board-scoped filter of it. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.BD_DATA;
  const P = window.BDParts;
  const { DataTable, TicketRef, PrincipalRef, TierBadge, StatusPill, FenceState, ReviewChip, FreshnessStamp, Button, DangerAction, ConfirmFriction, HaltBand, PrintedAbsence, Input, ErrorState } = H;
  const { statePill, taintBadge, LaneBadge, LifecycleKanban, CeremonyRibbon, TicketLineageTree, eyebrow, mono, panel } = P;

  function Head({ crumb, title, sub, right }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          {crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
          <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, lineHeight: '26px', fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
          {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '82ch' }}>{sub}</p> : null}
        </div>
        {right}
      </div>
    );
  }
  const Section = ({ title, children, right }) => (
    <div style={{ ...panel, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}><span style={eyebrow}>{title}</span>{right}</div>
      {children}
    </div>
  );

  /* ===== 1 · Lifecycle Kanban ===== */
  function Kanban({ ctx }) {
    const [view, setView] = React.useState('kanban');
    const filters = ['team ▾', 'type ▾', 'host ▾', 'taint ▾', 'lane ▾'];
    const tableCols = [
      { key: 'id', header: 'Ticket', render: (t) => <TicketRef id={t.id} /> },
      { key: 'title', header: 'Title', render: (t) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>{t.title}</span> },
      { key: 'state', header: 'State', render: (t) => statePill(t.state, 'sm') },
      { key: 'claimedBy', header: 'Claimed by', render: (t) => t.claimedBy ? <PrincipalRef kind={t.kind || 'agent'} id={t.claimedBy} /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
      { key: 'taint', header: 'Provenance', render: (t) => taintBadge(t.taint) },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Head title="Lifecycle board" sub="The coordination spine — work tracked, atomically claimed, its host lock fenced. The Board is the fencing authority." right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>SYSTEM STATE: {ctx.posture === 'kill' ? 'G1 freeze' : '● G0 normal'} · epoch {D.EPOCH} ⟳ 0.3s</span>} />
        {ctx.posture === 'kill' ? <HaltBand mode="kill" readOnly reviewHref="#" reviewLabel="Review halt in Mission Control" confirmed={12} pending={2} draining={1} pendingCountdown="1:48" message="Board is in the kill chain but hosts no actuator. At G1, no new claims or approval grants — existing state honored." /> : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>/ filter:</span>
          {filters.map((f) => <button key={f} style={{ height: 28, padding: '0 10px', borderRadius: 'var(--radius-control)', border: '1px solid var(--border-default)', background: 'var(--bg-control)', color: 'var(--text-secondary)', fontFamily: 'var(--font-ui)', fontSize: 12, cursor: 'pointer' }}>{f}</button>)}
          <span style={{ flex: 1 }} />
          <div style={{ display: 'inline-flex', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-control)', overflow: 'hidden' }}>
            {['kanban', 'table'].map((v) => <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', border: 0, cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, textTransform: 'capitalize', background: view === v ? 'var(--signal-cyan-wash)' : 'transparent', color: view === v ? 'var(--signal-cyan-ink)' : 'var(--text-muted)' }}>{v}</button>)}
          </div>
        </div>
        {view === 'kanban' ? <LifecycleKanban data={D} onOpen={ctx.openTicket} /> : <DataTable columns={tableCols} rows={D.TICKETS} rowKey="id" onRowClick={ctx.openTicket} />}
      </div>
    );
  }

  /* ===== 2 · Ticket Detail + Ceremony Ribbon ===== */
  function TicketDetail({ t, ctx }) {
    const lineage = [
      { id: t.epic || 'T-000100', label: '', state: 'in_progress', indent: 0 },
      { id: t.id, state: t.state, indent: 1, here: true, by: t.claimedBy },
      { id: 'T-000131', state: 'in_progress', indent: 2, by: 'agent:patcher-09' },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 880 }}>
        <button onClick={() => ctx.goto('board')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to board</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TicketRef id={t.id} /><span style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</span>{statePill(t.state, 'sm')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={mono}>{t.type}</span>{t.lane ? <LaneBadge lane={t.lane} /> : null}{taintBadge(t.taint)}<span style={mono}>{t.priority}</span>
          <span style={{ color: 'var(--text-disabled)' }}>· epic ▸ {t.epic || '—'} · lineage_depth {t.depth || 1} / {t.cap || 4}</span>
        </div>

        {t.ceremony ? <CeremonyRibbon c={t.ceremony} /> : null}

        <Section title="Plan / artifact — Notes rev pinned" right={<a href="#" style={{ color: 'var(--text-link)', fontFamily: 'var(--font-ui)', fontSize: 12 }}>open in Notes ↗</a>}>
          {t.plan ? (
            <div>
              <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: '23px', color: 'var(--text-primary)', margin: '0 0 8px' }}>{t.plan.line}</p>
              <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>rev {t.plan.notesRev} · plan_hash {t.plan.hash}</div>
            </div>
          ) : <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No plan slice attached.</span>}
        </Section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
          <Section title="Host lock / fencing">
            {t.fence ? <FenceState gen={t.fence.gen} lease={t.fence.state !== 'superseded' ? t.fence.lease : undefined} heartbeat={t.fence.hb && t.fence.hb !== '—' ? t.fence.hb : undefined} state={t.fence.state} supersededBy={t.fence.supBy} />
              : <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No host lock held.</span>}
            {t.fence && t.fence.holdKind ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>hold_kind: {t.fence.holdKind}{t.fence.holdKind === 'execution' ? ' (never reaped)' : ''}</div> : null}
          </Section>
          <Section title="Dependencies">
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div>blocked-by: {t.deps.blockedBy.length ? t.deps.blockedBy.map((d) => <TicketRef key={d} id={d} />) : <span style={{ color: 'var(--text-disabled)' }}>none</span>}</div>
              <div>blocks: {t.deps.blocks.length ? t.deps.blocks.map((d) => <TicketRef key={d} id={d} />) : <span style={{ color: 'var(--text-disabled)' }}>none</span>}</div>
            </div>
          </Section>
        </div>

        <Section title="Approval record — Board-owned">
          {t.approval ? (
            <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
              <span>id <span style={{ color: 'var(--text-primary)' }}>{t.approval.id}</span></span>
              <span>action_class {t.approval.actionClass}</span>
              <span>approver <PrincipalRef kind="operator" id={t.approval.approver} /></span>
              <span>four-eyes <StatusPill tone="verified" glyph="✔" size="sm">{t.approval.fourEyes}</StatusPill></span>
              <span>consumed_by {t.approval.consumedBy || '—'}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>None yet.</span>
              {t.state === 'awaiting_approval' ? <Button tone="primary" size="compact" onClick={() => ctx.openApproval(t)}>Go to approval decision →</Button> : null}
            </div>
          )}
        </Section>

        <Section title="Lineage">
          <TicketLineageTree nodes={lineage} depth={t.depth || 2} cap={t.cap || 4} />
        </Section>
      </div>
    );
  }

  /* ===== 3 · Approvals (Board-scoped filter of ReviewQueue) + Decision ===== */
  function Approvals({ ctx }) {
    const [sel, setSel] = React.useState(ctx.approvalSel || null);
    const rows = D.TICKETS.filter((t) => t.state === 'awaiting_approval');
    if (sel) return <ApprovalDecision t={sel} ctx={ctx} onBack={() => setSel(null)} />;
    const cols = [
      { key: 'id', header: 'Ticket', render: (t) => <TicketRef id={t.id} href="#" /> },
      { key: 'gate', header: 'Gate', render: () => <StatusPill tone="attention" glyph="▲" size="sm">awaiting_approval</StatusPill> },
      { key: 'proposer', header: 'Proposer', render: (t) => <PrincipalRef kind={t.kind || 'agent'} id={t.claimedBy} /> },
      { key: 'taint', header: 'Provenance', render: (t) => taintBadge(t.taint) },
      { key: 'host', header: 'Host', render: (t) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{t.host || '—'}</span> },
      { key: 'age', header: 'Age', align: 'right', render: () => <FreshnessStamp age="2m" /> },
      { key: 'link', header: '', render: () => <span style={{ ...mono, fontSize: 11, color: 'var(--signal-cyan)' }}>/review ↗</span> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head crumb="/approvals" title="Approval queue" sub="A Board-scoped filter of Mission Control's canonical review queue — same rows, same deep-links. The Board legitimately hosts the grant because it's written browser-direct under your session (MC holds no standing approve credential)." right={<span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>source: board · as-of 2s</span>} />
        <DataTable columns={cols} rows={rows} rowKey="id" onRowClick={setSel} />
      </div>
    );
  }

  function ApprovalDecision({ t, ctx, onBack }) {
    const [asProposer, setAsProposer] = React.useState(false);
    const [done, setDone] = React.useState(null);
    const killed = ctx.posture === 'kill';
    const allowCols = [
      { key: 'seq', header: 'seq', render: (r) => <span style={mono}>{r.seq}</span> },
      { key: 'playbook', header: 'playbook_key', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{r.playbook}</span> },
      { key: 'params', header: 'params_hash', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.params}</span> },
      { key: 'host', header: 'host_id', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.host}</span> },
      { key: 'cls', header: 'CMDB class', render: (r) => <StatusPill tone="neutral" size="sm">{r.cls}</StatusPill> },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
        <button onClick={onBack} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to queue</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <TicketRef id={t.id} /><span style={{ fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>Approve plan on {t.host}</span>
        </div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>derived action_class: <b style={{ color: 'var(--text-primary)' }}>standard</b> (worst across allowlist playbooks — not from ticket type) · lane: {t.lane}</div>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>four-eyes: proposer <PrincipalRef kind="agent" id={t.claimedBy} /> · you <PrincipalRef kind="operator" id="operator:ada" /></div>

        {t.taint === 'untrusted' ? (
          <div style={{ background: 'var(--state-amber-wash)', border: '1px solid #7A5A1E', borderRadius: 6, padding: '10px 14px', display: 'flex', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--state-amber-ink)' }}>
            <span aria-hidden="true">⚠</span><span><b>UNTRUSTED · host-originated</b> → auto-approve lane INELIGIBLE. The plan text is adversarial input; a human decides. Taint is server-owned — no control clears it here.</span>
          </div>
        ) : null}

        <Section title="Plan slice — Notes rev pinned, plan_hash bound" right={<a href="#" style={{ color: 'var(--text-link)', fontFamily: 'var(--font-ui)', fontSize: 12 }}>open in Notes ↗</a>}>
          <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: '23px', color: 'var(--text-primary)', margin: '0 0 6px' }}>{t.plan.line}</p>
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{t.plan.notesRev} · {t.plan.hash} · blast radius: {t.plan.radius}</div>
        </Section>

        <Section title="Allowlist — immutable once granted (what you confirm is what runs)">
          <DataTable columns={allowCols} rows={t.allowlist} rowKey="seq" reflow={false} />
        </Section>

        <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          CMDB verdict: mode={t.cmdb.mode} · in-window {t.cmdb.inWindow ? '✔' : '✕'} · decision_id {t.cmdb.decision} <FreshnessStamp age={t.cmdb.age} />
        </div>

        {done === 'approved' ? (
          <div style={{ ...panel, padding: 16, display: 'flex', alignItems: 'center', gap: 10 }}><StatusPill tone="verified" glyph="✔">Approval minted</StatusPill><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>appr-4472x · consumed_by pending</span></div>
        ) : done === 'rejected' ? (
          <div style={{ ...panel, padding: 16 }}><StatusPill tone="danger" glyph="✕">Plan rejected</StatusPill></div>
        ) : (
          <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={eyebrow}>Decision</span>
              <span style={{ flex: 1 }} />
              <Button tone="ghost" size="compact" onClick={() => setAsProposer((v) => !v)}>{asProposer ? '↺ view as approver (demo)' : 'demo: you are the proposer'}</Button>
            </div>
            {killed ? (
              <PrintedAbsence glyph="⛊" why="G1 FREEZE-DESTRUCTIVE — approval minting is suspended suite-wide; existing approvals are honored, no new grants. The Board hosts no kill actuator." tag="suspended by stop">
                <strong>Approval minting is suspended while the kill-switch is engaged.</strong>
              </PrintedAbsence>
            ) : asProposer ? (
              <PrintedAbsence why="Four-eyes requires a different approver than the proposer/claimer." tag="by construction">
                <strong>You proposed this plan — you cannot approve it here.</strong>
              </PrintedAbsence>
            ) : null}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1 }} />
              <Button tone="secondary" onClick={() => setDone('rejected')}>Reject plan</Button>
              {!killed && !asProposer ? (
                <DangerAction label="Approve & mint record" glyph="⚠" variant="solid" title={`Approve ${t.id}`}
                  consequence={<>This mints an approval that permits Gateway execution on <strong>{t.host}</strong>. It moves the system toward MORE real-world action.</>}
                  direction="more" irreversible blastRadius={t.plan.radius}
                  honest={killed ? { confirmed: 12, pending: 2, draining: 1, pendingCountdown: '1:48' } : undefined}
                  typedIntent={t.id} stepUp auditNote={`Confirm token is diff-hash-bound to plan_hash ${t.plan.hash}. Writes a Board approval record.`}
                  confirmLabel="Approve" onConfirm={() => setDone('approved')} />
              ) : null}
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ===== 4 · Management Console (tabbed) ===== */
  function Console({ ctx }) {
    const [tab, setTab] = React.useState(ctx.consoleTab || 'wip');
    const tabs = [['wip', 'WIP & lineage'], ['triggers', 'Standing triggers'], ['lineage', 'Lineage'], ['escalations', 'Escalations'], ['violations', 'Violation log'], ['audit', 'Audit browser']];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
        <Head crumb="/console" title="Management console" sub="Control knobs + escalation / violation / audit truth. Every mutation rides the same service layer + audit path. Policy-plane writes are sod-critical and route through the confirm ceremony." />
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid var(--border-default)' }}>
          {tabs.map(([k, label]) => <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 12px', border: 0, borderBottom: '2px solid ' + (tab === k ? 'var(--signal-cyan)' : 'transparent'), background: 'transparent', color: tab === k ? 'var(--text-primary)' : 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>{label}</button>)}
        </div>
        {tab === 'wip' ? <ConsoleWIP /> : null}
        {tab === 'triggers' ? <ConsoleTriggers /> : null}
        {tab === 'lineage' ? <div style={{ ...panel, padding: 16 }}><TicketLineageTree nodes={[{ id: 'T-000100', state: 'in_progress', indent: 0 }, { id: 'T-000097', state: 'awaiting_approval', indent: 1, by: 'agent:patcher-07' }, { id: 'T-000131', state: 'in_progress', indent: 2, by: 'agent:patcher-09' }, { id: 'T-000140', state: 'todo', indent: 3, by: 'agent:patcher-11', here: true }]} depth={4} cap={4} /></div> : null}
        {tab === 'escalations' ? <ConsoleEscalations /> : null}
        {tab === 'violations' ? <ConsoleAudit rows={D.VIOLATIONS} violation /> : null}
        {tab === 'audit' ? <ConsoleAudit rows={D.AUDIT} /> : null}
      </div>
    );
  }

  function ConsoleWIP() {
    const [open, setOpen] = React.useState(false);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Section title="WIP caps & lineage policy — sod-critical writes">
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <Input label="Global WIP cap" mono defaultValue="30" style={{ width: 120 }} />
            <Input label="Per-agent cap" mono defaultValue="4" style={{ width: 120 }} />
            <Input label="Per-team cap" mono defaultValue="8" style={{ width: 120 }} />
            <Input label="Lineage depth cap" mono defaultValue="4" style={{ width: 120 }} />
            <Button tone="primary" onClick={() => setOpen(true)}>Save policy</Button>
          </div>
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>current global WIP {D.WIP.global[0]}/{D.WIP.global[1]} · echoes on kanban column headers</div>
        </Section>
        <ConfirmFriction open={open} intensity="full" title="Save WIP & lineage policy"
          consequence="This changes how much work the fleet may run and how deep it may spawn. The confirm is bound to the exact diff you saw."
          direction="more" auditNote="sod-critical · diff-bound · writes an audit row." confirmLabel="Save policy"
          onCancel={() => setOpen(false)} onConfirm={() => setOpen(false)} />
      </div>
    );
  }

  function ConsoleTriggers() {
    const cols = [
      { key: 'name', header: 'Trigger', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{r.name}</span> },
      { key: 'kind', header: 'Kind', render: (r) => <StatusPill tone="neutral" size="sm">{r.kind}</StatusPill> },
      { key: 'spec', header: 'Spec', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.spec}</span> },
      { key: 'child', header: 'Child template', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.child}</span> },
      { key: 'suppress', header: 'suppress_while_open', render: (r) => r.suppress ? '✔' : '—' },
      { key: 'health', header: 'Webhook', render: (r) => r.webhook ? <span style={{ ...mono, fontSize: 11, color: 'var(--state-green)' }}>HMAC {r.webhook.hmac} · {r.webhook.lastFire}</span> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
    ];
    return <DataTable columns={cols} rows={D.TRIGGERS} rowKey="name" />;
  }

  function ConsoleEscalations() {
    const kindPill = (k) => k === 'A1' ? <ReviewChip state="escalated" reason="board_escalation" href="#" />
      : k === 'A2' ? <StatusPill tone="danger" glyph="⚑" size="sm">break-glass</StatusPill>
      : k === 'quarantine' ? <StatusPill striped glyph="⚠" size="sm">quarantine</StatusPill>
      : <StatusPill tone="attention" glyph="⛊" size="sm">reaper hold</StatusPill>;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {D.ESCALATIONS.map((e, i) => (
          <div key={i} style={{ ...panel, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {kindPill(e.kind)}
            {e.ticket ? <TicketRef id={e.ticket} href="#" /> : <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>fleet-level · {e.held} held</span>}
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{e.reason}</span>
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>{e.detail}</span>
            <span style={{ flex: 1 }} />
            <FreshnessStamp age={e.age} />
            {e.kind === 'quarantine' ? <ConfirmButton label="Confirm CMDB mapping → clear" tone="secondary" size="compact" title="Clear quarantine" consequence="Confirms the host mapping and clears quarantine so the ticket can be claimed. Toward LESS restriction." direction="less" confirmLabel="Clear quarantine" /> : null}
            {e.kind === 'reaper' ? <ConfirmButton label="Clear hold" tone="secondary" size="compact" title="Clear reaper hold" consequence="Releases the outage-gate hold on held tickets." direction="less" confirmLabel="Clear hold" /> : null}
          </div>
        ))}
      </div>
    );
  }

  function ConfirmButton({ label, tone = 'secondary', size, ...cf }) {
    const [open, setOpen] = React.useState(false);
    return (<React.Fragment>
      <Button tone={tone} size={size} onClick={() => setOpen(true)}>{label}</Button>
      <ConfirmFriction open={open} intensity="light" title={cf.title || label} confirmLabel={cf.confirmLabel || label} consequence={cf.consequence} direction={cf.direction || 'less'} onCancel={() => setOpen(false)} onConfirm={() => setOpen(false)} />
    </React.Fragment>);
  }

  function ConsoleAudit({ rows, violation }) {
    const cols = [
      { key: 'at', header: 'Time', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.at}</span> },
      { key: 'who', header: 'Who', render: (r) => <PrincipalRef kind={r.kind} id={r.who} /> },
      { key: 'verb', header: 'Action', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.verb}</code> },
      { key: 'target', header: 'Target', render: (r) => <TicketRef id={r.target} /> },
      { key: 'outcome', header: 'Outcome', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: r.outcome === 'refused' ? 'var(--danger-text)' : 'var(--text-secondary)' }}>{r.outcome}</span> },
      violation ? { key: 'note', header: 'Note', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>{r.note}</span> } : { key: 'prov', header: 'Provenance', render: (r) => taintBadge(r.prov) },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
          append-only · <FreshnessStamp age="live" /> {violation ? '· zero-tolerance telemetry' : '· Board log is NOT hash-chained — no fabricated "chain verified"'}
        </div>
        <DataTable columns={cols} rows={rows} rowKey="at" reflow={false} />
      </div>
    );
  }

  window.BDScreens = { Kanban, TicketDetail, Approvals, Console };
})();
