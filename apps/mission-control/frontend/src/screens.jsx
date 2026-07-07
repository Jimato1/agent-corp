// The 10 cockpit screens (Instrument archetype, dark-only, compact). Every mirrored/streamed figure
// carries source/as-of; a stale/unavailable read renders STALE-UNKNOWN / CANNOT CONFIRM in halt-gold,
// never a frozen green (the false-green rule). Ported from the Helm mission-control ui_kit and wired
// to the live BFF (/api/*). Consumers of the review queue/URLs resolve here (MC owns the canonical
// ReviewQueue §7.1 and LiveAgentView §7.3).
import H from '/src/helm.js';
import { api, useFetch } from '/src/api.js';
import {
  SourceStamp, KillLevelPill, Panel, Liveness, AttentionBand, FleetAnomalyBanner,
  SpawnTree, BudgetMeter, EdgeTile, eyebrow, mono, panelStyle,
} from '/src/parts.jsx';

const {
  DataTable, TicketRef, PrincipalRef, TierBadge, StatusPill, ReviewChip, FenceState,
  FreshnessStamp, Button, DangerAction, StopActuator, HaltBand, PrintedAbsence, Input,
} = H;

function Head({ crumb, title, sub, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        {crumb ? <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{crumb}</div> : null}
        <h1 style={{ fontFamily: 'var(--font-ui)', fontSize: 20, lineHeight: '26px', fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>{title}</h1>
        {sub ? <p style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)', margin: '2px 0 0', maxWidth: '86ch' }}>{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

// Pattern-D: a dependency is down → gold safe-stop note, NEVER red.
function Degraded({ what, detail }) {
  return <HaltBand mode="safe-stop" message={`${what} unreachable — ${detail || 'treating as UNVERIFIED (fail-closed)'}`} readOnly />;
}
// Pattern-R: your fetch/action failed recoverably → red.
function RErr({ error, onRetry }) {
  return (
    <div style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', borderRadius: 6, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={{ color: 'var(--danger)', fontSize: 16 }} aria-hidden="true">✕</span>
      <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--danger-text)' }}>{error?.message || 'Request failed.'}</span>
      {onRetry ? <Button tone="ghost" size="compact" onClick={onRetry}>Retry</Button> : null}
    </div>
  );
}
function Skeleton({ h = 120 }) {
  return <div style={{ ...panelStyle, height: h, opacity: 0.5 }} />;
}

// Loaded/loading/Pattern-R/Pattern-D wrapper (the honest triad on every fetch).
function Load({ state, children, skeleton }) {
  if (state.loading) return skeleton || <Skeleton />;
  if (state.error) return state.error.isDependency
    ? <Degraded what="dependency" detail={state.error.message} />
    : <RErr error={state.error} onRetry={state.reload} />;
  return children(state.data);
}

/* ===== 1 · Cockpit Overview ===== */
export function Overview({ ctx }) {
  const posture = useFetch(api.posture, []);
  const fleet = useFetch(api.fleet, []);
  const queue = useFetch(() => api.queue('all'), []);
  const anchors = useFetch(api.anchors, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1240 }}>
      <Head title="Mission Control · operator cockpit" sub="What is the fleet doing, and can you stop it? Every tile is a mirror with a source stamp — nothing here is authoritative." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <Panel title="Posture" stamp={<SourceStamp source="auth" age={posture.data ? `${posture.data.as_of_seconds}s` : '—'} stale={!!posture.error || posture.data?.stale} />} deepLabel="Halt" onDeep={() => ctx.goto('halt')} pad={14}>
          <Load state={posture} skeleton={<div style={{ height: 60 }} />}>{(d) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <KillLevelPill level={d.level} />
              <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>L1 auth {d.l1.status}</div>
              <div style={{ ...mono, fontSize: 12, color: d.l2.status === 'CONFIRMED' ? 'var(--state-green)' : 'var(--halt-gold-ink)' }}>L2 gateway {d.l2.status} {d.l2.provenance ? `· ${d.l2.provenance}` : ''}</div>
            </div>
          )}</Load>
        </Panel>
        <Panel title="Fleet" stamp={<SourceStamp source="runtime" age="live" stale={!!fleet.error} />} deepLabel="Agents" onDeep={() => ctx.goto('agents')} pad={14}>
          <Load state={fleet} skeleton={<div style={{ height: 60 }} />}>{(d) => {
            const online = d.agents.filter((a) => a.liveness === 'live' || a.liveness === 'suspect').length;
            const zombie = d.agents.filter((a) => (a.flags || []).some((f) => f.type === 'SUPERSEDED')).length;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 600, color: 'var(--text-primary)' }}>{online} online</div>
                <div style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)' }}>{zombie} zombie ⚠ · roster {d.roster}</div>
                {d.suppression?.suppressed ? <div style={{ ...mono, fontSize: 11, color: 'var(--halt-gold-ink)' }}>⚠ anomaly — display suppressed</div> : null}
              </div>
            );
          }}</Load>
        </Panel>
        <Panel title="Queue" stamp={<SourceStamp source="board" age={queue.data ? `${queue.data.as_of_seconds || 0}s` : '—'} stale={queue.data?.stale} />} deepLabel="Review" onDeep={() => ctx.goto('review')} pad={14}>
          <Load state={queue} skeleton={<div style={{ height: 60 }} />}>{(d) => {
            const c = (g) => d.items.filter((i) => i.gate === g).length;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>
                <div><b style={{ color: 'var(--text-primary)', fontSize: 18 }}>{c('awaiting_approval')}</b> awaiting_approval</div>
                <div>{c('needs_review')} needs_review · {c('escalated')} escalated ⚑</div>
                {!d.decisions_enabled ? <div style={{ ...mono, fontSize: 11, color: 'var(--halt-gold-ink)' }}>queue UNVERIFIED — decisions disabled</div> : null}
              </div>
            );
          }}</Load>
        </Panel>
        <Panel title="Anchor continuity" stamp={<SourceStamp source="gateway push" age="—" />} deepLabel="Anchors" onDeep={() => ctx.goto('anchors')} pad={14}>
          <Load state={anchors} skeleton={<div style={{ height: 60 }} />}>{(d) => (
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
              {d.chains.length ? d.chains.map((c) => (
                <div key={c.chain_id}>{c.chain_id} · seq {c.tip ?? '—'} <span style={{ color: c.status === 'continuous' ? 'var(--state-green)' : 'var(--halt-gold-ink)' }}>{c.status}</span></div>
              )) : <span style={{ color: 'var(--text-muted)' }}>No HEADs received yet.</span>}
            </div>
          )}</Load>
        </Panel>
      </div>
    </div>
  );
}

/* ===== 2 · Live Agent View ===== */
export function LiveAgentView({ ctx }) {
  const fleet = useFetch(api.fleet, []);
  const columns = [
    { key: 'sub', header: 'Agent', render: (a) => <PrincipalRef kind="agent" id={a.sub} href="#" onClick={(e) => { e.preventDefault(); ctx.openAgent(a); }} /> },
    { key: 'liveness', header: 'Liveness', render: (a) => <Liveness agent={a} /> },
    { key: 'step', header: 'Step · ticket', render: (a) => a.claimed_ticket_id ? <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{a.step_seq}</span><TicketRef id={a.claimed_ticket_id} href="#" /></span> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
    { key: 'fence', header: 'Fencing', render: (a) => {
      const z = (a.flags || []).find((f) => f.type === 'SUPERSEDED');
      if (z) return <FenceState gen={z.fence.gen} supersededBy={z.fence.supBy} state="superseded" />;
      return a.fencing_token ? <FenceState gen={a.fencing_token} heartbeat={a.hb_age != null ? `${a.hb_age}s` : undefined} state="held" /> : <span style={{ color: 'var(--text-disabled)' }}>—</span>;
    } },
    { key: 'model', header: 'Model', render: (a) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{(a.persona_version || a.model_version || '').split('@')[1] || (a.model_version || '—')}</span> },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1240 }}>
      <Head crumb="/agents" title="Fleet liveness" sub="Liveness is never a bare green dot — it's the phi-accrual figure + last-beat age + a state pill. Agent-runtime surfaces through this view."
        right={<SourceStamp source="runtime" age="live" stale={!!fleet.error} staleLabel="STREAM DOWN" />} />
      <Load state={fleet}>{(d) => {
        if (d.suppression?.suppressed) return <FleetAnomalyBanner suppressed={d.suppression.suspect_count} />;
        if (!d.agents.length) return (
          <Panel pad={22}><div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-muted)' }}>
            {d.fleet_stream_present ? 'No agents have reported. Roster denominator = 0 — start an agent process to populate the fleet.'
              : 'Runtime supervisor stream absent — cannot confirm liveness; treating fleet as UNVERIFIED.'}
          </div></Panel>
        );
        return (
          <React.Fragment>
            <AttentionBand agents={d.agents} onOpen={ctx.openAgent} />
            <DataTable columns={columns} rows={d.agents} rowKey="sub" onRowClick={ctx.openAgent} />
          </React.Fragment>
        );
      }}</Load>
    </div>
  );
}

/* ===== 3 · Agent drill-in ===== */
export function AgentDrillIn({ agent, ctx }) {
  const drill = useFetch(() => api.agent(agent.sub), [agent.sub]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 980 }}>
      <button onClick={() => ctx.goto('agents')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to fleet</button>
      <Load state={drill}>{(d) => (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <PrincipalRef kind="agent" id={d.sub} />
            {d.present ? <Liveness agent={d} /> : <StatusPill tone="neutral" glyph="◼" size="sm">not reporting</StatusPill>}
            <span style={{ flex: 1 }} /><SourceStamp source="runtime" age="live" stale={!d.present} />
          </div>
          {!d.present ? <Panel pad={16}><span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>{d.message}. Showing last-known lineage from Board.</span></Panel> : null}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            <Panel title="Current claim" pad={16}>
              {d.frame?.claimed_ticket_id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <TicketRef id={d.frame.claimed_ticket_id} href="#" />
                  {d.frame.fencing_token ? <FenceState gen={d.frame.fencing_token} state="held" /> : null}
                </div>
              ) : <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)', fontSize: 13 }}>No active claim.</span>}
            </Panel>
            <Panel title="Spawn tree · Board lineage" pad={16}>
              <SpawnTree nodes={(d.lineage?.data?.nodes) || []} />
            </Panel>
          </div>
        </React.Fragment>
      )}</Load>
    </div>
  );
}

/* ===== 4 · Review + Approval Queue ===== */
const gatePill = (g) => g === 'awaiting_approval'
  ? <StatusPill tone="attention" glyph="◐" size="sm">awaiting_approval</StatusPill>
  : g === 'needs_review' ? <StatusPill tone="attention" glyph="◈" size="sm">needs_review</StatusPill>
  : <StatusPill tone="attention" glyph="⚑" size="sm">escalated</StatusPill>;
const provBadge = (p) => {
  if (p.tier === 'untrusted') return <TierBadge tier="untrusted" label={`Untrusted · ${p.note}`} />;
  if (p.tier === 'verified') return <TierBadge tier="verified" label={p.note} />;
  if (p.tier === 'corroborated') return <TierBadge tier="corroborated" label={p.note} />;
  return <TierBadge tier="single" label={p.note} />;
};

export function ReviewQueue({ ctx }) {
  const [filter, setFilter] = React.useState('all');
  const q = useFetch(() => api.queue(filter), [filter]);
  const tabs = ['all', 'awaiting_approval', 'needs_review', 'escalated'];
  const columns = [
    { key: 'id', header: 'Ticket', render: (r) => <TicketRef id={r.ticket_id} href="#" /> },
    { key: 'gate', header: 'Gate', render: (r) => gatePill(r.gate) },
    { key: 'prov', header: 'Provenance', render: (r) => provBadge(r.provenance) },
    { key: 'proposer', header: 'Proposer', render: (r) => r.proposer ? <PrincipalRef kind="agent" id={r.proposer} /> : '—' },
    { key: 'tier', header: 'Tier', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.tier || '—'}</span> },
    { key: 'reason', header: 'Reason', render: (r) => r.gate === 'escalated' ? <ReviewChip state="escalated" reason={r.reason} /> : <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.reason}</span> },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1240 }}>
      <Head crumb="/review" title="Review + approval queue" sub="One inbox for both human gates. The canonical version — Chat's doorbell, Notes, and Board's filter resolve here. Item id IS the Board ticket_id. Decisions write browser-direct to Board."
        right={<SourceStamp source="board" age={q.data ? `${q.data.as_of_seconds || 0}s` : '—'} stale={q.data?.stale} />} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map((k) => (
          <button key={k} onClick={() => setFilter(k)} style={{ height: 28, padding: '0 12px', borderRadius: 'var(--radius-control)', cursor: 'pointer', fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, border: '1px solid ' + (filter === k ? '#14424F' : 'var(--border-default)'), background: filter === k ? 'var(--signal-cyan-wash)' : 'transparent', color: filter === k ? 'var(--signal-cyan-ink)' : 'var(--text-secondary)' }}>{k}</button>
        ))}
      </div>
      <Load state={q}>{(d) => {
        if (!d.decisions_enabled) return <Degraded what="Board" detail="queue is UNVERIFIED; approvals fail closed" />;
        if (!d.items.length) return <Panel pad={22}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-muted)' }}>No open gates. When an agent proposes a destructive plan or files work for review, it appears here.</span></Panel>;
        return (
          <React.Fragment>
            <DataTable columns={columns} rows={d.items} rowKey="ticket_id" onRowClick={(r) => ctx.openItem(r)} />
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>host-originated rows are excluded from auto-approve — the UI renders the fact; the server enforces the lane.</div>
          </React.Fragment>
        );
      }}</Load>
    </div>
  );
}

/* ===== 5 · Review item ===== */
export function ReviewItem({ item, ctx }) {
  const it = useFetch(() => api.queueItem(item.ticket_id), [item.ticket_id]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 860 }}>
      <button onClick={() => ctx.goto('review')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to queue</button>
      <Load state={it}>{(d) => (
        <React.Fragment>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <TicketRef id={d.ticket_id} /> {d.gate ? gatePill(d.gate) : null}
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>· {d.tier || ''}</span>
            <span style={{ flex: 1 }} /><SourceStamp source="board" age="1s" stale={d.stale} />
          </div>
          {!d.in_queue ? (
            <Panel pad={16}><div style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-muted)' }}>
              {d.ticket_id} is not currently in the review queue. <a href={d.board_link} style={{ color: 'var(--text-link)' }}>Open on Board ↗</a>
              {d.resolution_history?.length ? <div style={{ marginTop: 10, ...mono, fontSize: 12 }}>Latest: {d.resolution_history[0].outcome} · {d.resolution_history[0].resolved_at}</div> : null}
            </div></Panel>
          ) : (
            <React.Fragment>
              {d.provenance?.tier === 'untrusted' ? (
                <div style={{ background: 'var(--state-amber-wash)', border: '1px solid #7A5A1E', borderRadius: 6, padding: '10px 14px', display: 'flex', gap: 8, fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--state-amber-ink)' }}>
                  <span aria-hidden="true">⚠</span><span><b>UNTRUSTED · host-originated</b> ({d.provenance.note}) → auto-approve lane <b>INELIGIBLE</b>. The plan text is adversarial input; a human decides.</span>
                </div>
              ) : null}
              <Panel title="Plan (read-only, from Board)" pad={16}>
                <p style={{ fontFamily: 'var(--font-ui)', fontSize: 15, lineHeight: '23px', color: 'var(--text-primary)', margin: 0 }}>{d.plan?.line || 'Plan text is served by Board on the item.'}</p>
              </Panel>
              <PrintedAbsence why="MC holds no standing approve credential — the decision writes browser-direct to Board under your session.">
                <strong>An agent can never approve its own work.</strong>
              </PrintedAbsence>
              <div style={{ ...panelStyle, padding: 16, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={eyebrow}>Decision</span><span style={{ flex: 1 }} />
                <DangerAction label="Reject / hold" glyph="⚠" variant="outline" title={`Reject ${d.ticket_id}`}
                  consequence="Rejects this plan and holds the proposer. It cannot proceed." direction="less"
                  confirmLabel="Reject" onConfirm={() => alert('Decision writes browser-direct to Board under the operator session (§5.3).')} />
                <DangerAction label="Approve — writes to Board" glyph="⚠" variant="solid" title={`Approve ${d.ticket_id}`}
                  consequence={<>This authorizes Gateway execution against <strong>{d.tier || 'the target'}</strong>. It moves the system toward MORE real-world action.</>}
                  direction="more" irreversible typedIntent={d.ticket_id} stepUp
                  auditNote="Write is browser-direct to Board; MC records only the request in mc_audit."
                  confirmLabel="Approve" onConfirm={() => alert('Decision writes browser-direct to Board under the operator session (§5.3).')} />
              </div>
            </React.Fragment>
          )}
        </React.Fragment>
      )}</Load>
    </div>
  );
}

/* ===== 6 · Halt Control (THE signature safety screen) ===== */
export function HaltControl({ ctx }) {
  const posture = useFetch(api.posture, [ctx.postureNonce]);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 980 }}>
      <Head crumb="/halt" title="Global kill switch" sub="MC hosts the actuation, wired to CALL auth under your session. MC mints no epoch and stores no authoritative halted state — the readout is a read-mirror that degrades honestly."
        right={<SourceStamp source="auth" age={posture.data ? `${posture.data.as_of_seconds}s` : '—'} stale={!!posture.error} />} />
      <Panel title="Mirror · read-only, honest" pad={16}>
        <Load state={posture} skeleton={<div style={{ height: 80 }} />}>{(d) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={eyebrow}>Level</span><KillLevelPill level={d.level} />
              <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>epoch {d.epoch ?? '—'} · ⟳ {d.as_of_seconds}s · source: auth</span>
            </div>
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>L1 (identity, auth) {d.l1.status}</div>
            <div style={{ ...mono, fontSize: 12, color: d.l2.status === 'CONFIRMED' ? 'var(--state-green)' : 'var(--halt-gold-ink)' }}>
              L2 (physical, gateway) {d.l2.status} {d.l2.provenance ? `← provenance: ${d.l2.provenance}` : ''}
            </div>
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', paddingLeft: 12 }}>└ an MC-relayed L2 can read at most STALE-UNKNOWN, never CONFIRMED</div>
          </div>
        )}</Load>
      </Panel>
      <Panel title="Actuate · calls auth under your live session — MC holds no standing kill credential 🔒" pad={16}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={eyebrow}>G1 · Freeze-destructive</span>
            <StopActuator level="G1" onEngage={() => ctx.engage('G1')} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={eyebrow}>G2 · Quiesce-all</span>
            <StopActuator level="G2" onEngage={() => ctx.engage('G2')} />
          </div>
        </div>
        <Input label="Reason (required, → auth)" placeholder="why are you stopping the fleet?" value={ctx.reason} onChange={(e) => ctx.setReason(e.target.value)} style={{ width: '100%' }} />
      </Panel>
      <PrintedAbsence glyph="⛊" why="auth is the single enforcement point; it mints the epoch and propagates it. MC stores no authoritative halted state." tag="by construction">
        <strong>MC cannot enforce a stop.</strong> This control REQUESTS a halt from auth.
      </PrintedAbsence>
    </div>
  );
}

/* ===== 7 · WIP & Budget monitors ===== */
export function Budgets({ ctx }) {
  const b = useFetch(api.budgets, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1240 }}>
      <Head crumb="/budgets" title="WIP + budget" sub="auth's four budget dimensions per principal (rate / concurrency / cooldown / lifetime — never dollars) and Board's WIP caps. MC surfaces + auto-triages; the Board enforces."
        right={<SourceStamp source="auth+board" age="live" stale={!!b.error} />} />
      <Load state={b}>{(d) => (
        <React.Fragment>
          <Panel title="Global WIP · the DEDICATED mc store (separate from auth's Redis); auth holds policy" stamp={<SourceStamp source={`redis (${d.global_wip.backend})`} age="live" stale={!d.global_wip.live} />} pad={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <BudgetMeter label="global WIP" width={260} pct={Math.min(100, (d.global_wip.count / 30) * 100)} value={`${d.global_wip.count}/30`} />
              <span style={{ flex: 1 }} />
              <DangerAction label="Widen WIP cap" glyph="⚠" variant="outline" title="Widen the global WIP cap"
                consequence="Raising the cap lets MORE work run at once — toward MORE action." direction="more"
                typedIntent="WIDEN CAP" stepUp auditNote="Routes to Board; writes an audit row." confirmLabel="Widen cap"
                onConfirm={() => api.changeWip(30, 'widen').catch(() => {})} />
            </div>
          </Panel>
          <Panel title="Per-agent budgets" stamp={<SourceStamp source="auth budget-check API" age="live" stale={d.budgets.stale} />} pad={16}>
            {d.budgets.data ? <pre style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(d.budgets.data, null, 2)}</pre>
              : <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--halt-gold-ink)' }}>Budget dimensions STALE-UNKNOWN — auth budget-check API unreachable (never a fabricated "all headroom" green).</div>}
          </Panel>
        </React.Fragment>
      )}</Load>
    </div>
  );
}

/* ===== 8 · Edge & Observability ===== */
export function Edge() {
  const e = useFetch(api.edge, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1240 }}>
      <Head crumb="/edge" title="Edge & observability" sub="Per-app proxy health from the mc_prometheus / mc_blackbox sidecars (R10-correct series). Read-only. A sidecar down never shows a green 'all healthy' — it shows the honest unknown." />
      <Load state={e}>{(d) => (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          {Object.entries(d.tiles).map(([name, tile]) => <EdgeTile key={name} name={name} tile={tile} />)}
        </div>
      )}</Load>
    </div>
  );
}

/* ===== 9 · Audit-anchor continuity ===== */
export function Anchors() {
  const a = useFetch(api.anchors, []);
  const H2 = H;
  const columns = [
    { key: 'signed_at', header: 'Signed at', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.signed_at || '—'}</span> },
    { key: 'chain_id', header: 'Chain', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.chain_id}</span> },
    { key: 'seq_num', header: 'Seq', align: 'right', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{r.seq_num}</span> },
    { key: 'head_hash', header: 'Head hash', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.head_hash}</span> },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1080 }}>
      <Head crumb="/anchors" title="Audit-anchor continuity" sub="MC's independent off-box tamper-evidence witness. It anchors the Gateway's signed chain HEAD hash, never the contents, and never reads this copy back into a decision path." right={<SourceStamp source="gateway push" age="—" />} />
      <Load state={a}>{(d) => (
        <React.Fragment>
          {d.chains.length ? d.chains.map((c) => (
            <Panel key={c.chain_id} pad={14}>
              <div style={{ ...mono, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>chain {c.chain_id} · latest seq {c.tip ?? '—'}</span>
                {c.status === 'continuous'
                  ? <StatusPill tone="verified" glyph="✔" size="sm">CONTINUOUS</StatusPill>
                  : <StatusPill tone="halt" glyph="⚠" size="sm">RESYNC-PENDING · gaps {c.gaps.join(',')}</StatusPill>}
              </div>
            </Panel>
          )) : <Panel pad={22}><span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, color: 'var(--text-muted)' }}>No audit-chain HEADs received. The Gateway anchors HEADs here once mc:anchor is granted and the seam is live.</span></Panel>}
          {d.series.length ? <DataTable columns={columns} rows={d.series} rowKey="received_seq" reflow={false} /> : null}
        </React.Fragment>
      )}</Load>
    </div>
  );
}

/* ===== 10 · Guardrail settings ===== */
export function Settings() {
  const p = useFetch(api.params, []);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 980 }}>
      <Head crumb="/settings" title="Guardrail settings" sub="The only durable MC-owned config. Values are operator-set — there are no compiled-in defaults, and no component enforces on a PRE-SIZING value." />
      <Load state={p}>{(d) => (
        <Panel title="Sizing params (guardrail_params)" pad={16}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {d.params.map((row) => (
              <div key={row.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ ...eyebrow, width: 200 }}>{row.key}</span>
                <span style={{ ...mono, fontSize: 13, color: row.unset ? 'var(--state-amber-ink)' : 'var(--text-primary)', background: row.unset ? 'var(--state-amber-wash)' : 'var(--surface-inset)', border: '1px solid ' + (row.unset ? '#5A4A1E' : 'var(--border-strong)'), borderRadius: 4, padding: '3px 10px' }}>{row.unset ? 'UNSET' : row.value}</span>
                {row.presizing ? <StatusPill tone="attention" glyph="⚠" size="sm">PRE-SIZING DEFAULT</StatusPill> : null}
                {row.restored ? <StatusPill tone="attention" glyph="⚠" size="sm">RESTORED — re-confirm</StatusPill> : null}
              </div>
            ))}
            <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{d.note}</div>
          </div>
        </Panel>
      )}</Load>
    </div>
  );
}
