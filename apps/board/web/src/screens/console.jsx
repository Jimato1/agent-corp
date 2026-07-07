// Management Console (UI_SPEC §7). Tabs: WIP & lineage policy (sod-critical writes), escalation queue
// (A1 / A2 / quarantine / reaper holds), violation log (zero-tolerance telemetry), audit browser.
// Board's audit log is NOT hash-chained (Standard risk) — the browser renders honest append-only
// truth and does NOT fabricate a "chain verified" it cannot prove.
import { board, newOpId } from '../api.js';
import { H, statePill, ErrorNotice, mono, eyebrow, panel } from '../ui.jsx';
const { DataTable, TicketRef, PrincipalRef, StatusPill, ReviewChip, Button, Input } = H;

const TABS = [['wip', 'WIP & lineage'], ['escalations', 'Escalations'], ['violations', 'Violations'], ['holds', 'Reaper holds'], ['audit', 'Audit browser']];

export function Console({ tab = 'wip', onTab, bump }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 6 }}>
        {TABS.map(([k, label]) => (
          <Button key={k} tone={tab === k ? 'secondary' : 'ghost'} size="compact" onClick={() => onTab(k)}>{label}</Button>
        ))}
      </div>
      {tab === 'wip' ? <WipTab bump={bump} /> : null}
      {tab === 'escalations' ? <ListTab load={board.escalations} title="Escalation queue" empty="No escalations. The watchdog files here when a huddle stalls or a lease caps out." bump={bump} /> : null}
      {tab === 'violations' ? <ListTab load={board.violations} title="Violation log — rejected SoD-boundary attempts" empty="No violations." violation bump={bump} /> : null}
      {tab === 'holds' ? <HoldsTab bump={bump} /> : null}
      {tab === 'audit' ? <ListTab load={board.escalations} title="Audit browser (append-only; not hash-chained — no fabricated chain-verify)" empty="No audit rows." bump={bump} /> : null}
    </div>
  );
}

function WipTab({ bump }) {
  const [wip, setWip] = React.useState(null);
  const [error, setError] = React.useState(null);
  const [depth, setDepth] = React.useState('');
  const reload = () => board.wip().then(setWip).catch(setError);
  React.useEffect(() => { reload(); }, [bump]);
  if (error) return <ErrorNotice error={error} />;
  if (!wip) return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  const cols = [
    { key: 'scope', header: 'scope', render: (r) => <span style={mono}>{r.scope}</span> },
    { key: 'subject', header: 'subject', render: (r) => <span style={mono}>{r.subject || '—'}</span> },
    { key: 'cap', header: 'cap', render: (r) => <span style={mono}>{r.cap}</span> },
  ];
  const save = async (fn) => { try { await fn(); reload(); } catch (e) { setError(e); } };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 720 }}>
      <div style={{ ...panel, padding: 14 }}>
        <span style={eyebrow}>WIP caps (sod-critical / policy-plane — audited)</span>
        <div style={{ marginTop: 8 }}><DataTable columns={cols} rows={wip.policy} rowKey={(r) => r.scope + (r.subject || '')} /></div>
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>in-progress global: {wip.in_progress_global} · lineage max_depth: {wip.lineage_max_depth}</div>
      </div>
      <div style={{ ...panel, padding: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <span style={eyebrow}>Lineage cap</span>
        <Input value={depth} placeholder={String(wip.lineage_max_depth)} onChange={(e) => setDepth(e.target.value)} style={{ width: 80 }} />
        <Button tone="secondary" size="compact" onClick={() => save(() => board.setLineage(Number(depth)))}>Save (ConfirmFriction — audited)</Button>
      </div>
    </div>
  );
}

function ListTab({ load, title, empty, violation, bump }) {
  const [rows, setRows] = React.useState(null);
  const [error, setError] = React.useState(null);
  React.useEffect(() => { load().then((r) => setRows(r.items || [])).catch(setError); }, [bump]);
  if (error) return <ErrorNotice error={error} />;
  if (!rows) return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  return (
    <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 1000 }}>
      <span style={eyebrow}>{title}</span>
      {rows.length === 0 ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>{empty}</div> : rows.map((r) => (
        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, ...mono, fontSize: 12, padding: '4px 0', borderBottom: '1px solid var(--border-default)' }}>
          <span style={{ color: 'var(--text-disabled)' }}>{r.ts}</span>
          {r.actor_sub ? <PrincipalRef kind="agent" id={r.actor_sub} /> : null}
          <span style={{ color: violation ? 'var(--danger-red)' : 'var(--text-secondary)' }}>{r.action}</span>
          {r.ticket_id ? <TicketRef id={r.ticket_id} /> : null}
          {r.machine_reason ? <span style={{ color: 'var(--state-amber-ink)' }}>{r.machine_reason}</span> : null}
          <span style={{ flex: 1 }} />
          <StatusPill tone={r.outcome === 'violation' ? 'danger' : 'neutral'} size="sm">{r.outcome}</StatusPill>
        </div>
      ))}
    </div>
  );
}

function HoldsTab({ bump }) {
  const [holds, setHolds] = React.useState(null);
  const [error, setError] = React.useState(null);
  const reload = () => board.holds().then((r) => setHolds(r.items || [])).catch(setError);
  React.useEffect(() => { reload(); }, [bump]);
  if (error) return <ErrorNotice error={error} />;
  if (!holds) return <div style={{ color: 'var(--text-muted)' }}>Loading…</div>;
  const clear = async (id) => { try { await board.clearHold(id); reload(); } catch (e) { setError(e); } };
  return (
    <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 720 }}>
      <span style={eyebrow}>Reaper holds (outage-gate; fleet-silence)</span>
      {holds.length === 0 ? <div style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-muted)' }}>No held tickets. The outage gate holds mass-requeue when the fleet goes silent.</div> : holds.map((h) => (
        <div key={h.ticket_id} style={{ display: 'flex', alignItems: 'center', gap: 10, ...mono, fontSize: 12 }}>
          <TicketRef id={h.ticket_id} /><span style={{ color: 'var(--state-amber-ink)' }}>{h.reason}</span><span style={{ flex: 1 }} />
          <Button tone="secondary" size="compact" onClick={() => clear(h.ticket_id)}>Clear hold</Button>
        </div>
      ))}
    </div>
  );
}
