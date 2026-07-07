// parts.jsx — Board app-specific components (ESM port of the Helm reference kit bd-parts.jsx).
// LifecycleKanban / CeremonyRibbon / TicketLineageTree are the three justified domain-unique widgets
// (UI_SPEC §8); every element INSIDE them is a shared Helm component.
import { H, statePill, taintBadge, LaneBadge, mono, eyebrow, panel } from './ui.jsx';
const { StatusPill, TicketRef, PrincipalRef, FenceState, ReviewChip, DataTable, Button } = H;

export function TicketCard({ t, onOpen }) {
  return (
    <div role="button" tabIndex={0} onClick={() => onOpen(t.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(t.id); } }}
      style={{ display: 'flex', flexDirection: 'column', gap: 7, textAlign: 'left', width: '100%', cursor: 'pointer', ...panel, padding: 10 }}>
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
      {t.claimedBy ? <PrincipalRef kind="agent" id={t.claimedBy} /> : null}
      {t.fence ? <FenceState gen={t.fence.gen} lease={t.fence.lease} state={t.fence.state} /> : null}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {taintBadge(t.taint)}
        <LaneBadge lane={t.lane} />
      </div>
      {t.state === 'needs_review' ? <ReviewChip reason={t.reviewReason || 'needs review'} href={`#/t/${t.id}`} /> : null}
      {t.state === 'awaiting_approval' ? <span style={{ ...mono, fontSize: 10, color: 'var(--signal-cyan)' }}>→ approval queue</span> : null}
    </div>
  );
}

// COLUMNS: todo · in_progress · awaiting_approval · approved+executing · verifying · needs_review; +archive; +blocked swimlane.
export const COLUMNS = [
  { key: 'todo', label: 'todo', statuses: ['todo'] },
  { key: 'in_progress', label: 'in_progress', statuses: ['in_progress'] },
  { key: 'awaiting_approval', label: 'awaiting_approval', statuses: ['awaiting_approval'] },
  { key: 'hot', label: 'approved + executing', statuses: ['approved', 'executing'], hot: true },
  { key: 'verifying', label: 'verifying', statuses: ['verifying'] },
  { key: 'needs_review', label: 'needs_review', statuses: ['needs_review'] },
];

export function LifecycleKanban({ byCol, archive, blocked, onOpen }) {
  const [archiveOpen, setArchiveOpen] = React.useState(false);
  const archCols = [
    { key: 'id', header: 'Ticket', render: (t) => <TicketRef id={t.id} /> },
    { key: 'title', header: 'Title', render: (t) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-secondary)' }}>{t.title}</span> },
    { key: 'state', header: 'State', render: (t) => statePill(t.state, 'sm') },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, alignItems: 'flex-start' }}>
        {COLUMNS.map((col) => {
          const cards = byCol[col.key] || [];
          return (
            <div key={col.key} style={{ flex: '0 0 232px', width: 232, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 2px 6px', borderBottom: '1px solid var(--border-default)' }}>
                {statePill(col.hot ? 'executing' : col.key, 'sm')}
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{col.label}</span>
                <span style={{ flex: 1 }} />
                <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{cards.length}</span>
              </div>
              {cards.length ? cards.map((t) => <TicketCard key={t.id} t={t} onOpen={onOpen} />)
                : <div style={{ fontSize: 10, color: 'var(--text-disabled)', padding: '10px 4px', fontFamily: 'var(--font-ui)' }}>Nothing here yet.</div>}
            </div>
          );
        })}
        <div style={{ flex: '0 0 180px', width: 180, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 2px 6px', borderBottom: '1px solid var(--border-default)' }}>
            {statePill('done', 'sm')}
            <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>done</span>
            <span style={{ flex: 1 }} />
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{archive.length}</span>
          </div>
          <Button tone="ghost" size="compact" onClick={() => setArchiveOpen((v) => !v)}>{archiveOpen ? 'Hide archive' : 'Archive ▸'}</Button>
        </div>
      </div>
      {archiveOpen ? <DataTable columns={archCols} rows={archive} rowKey="id" onRowClick={(t) => onOpen(t.id)} /> : null}
      <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)', padding: '10px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ ...eyebrow, color: 'var(--state-amber-ink)' }}>▸ blocked ({blocked.length})</span>
          {blocked.map((t) => (
            <span key={t.id} role="button" tabIndex={0} onClick={() => onOpen(t.id)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <TicketRef id={t.id} />
              <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{t.reviewReason || 'blocked'}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function CeremonyRibbon({ c }) {
  if (!c || c.open === false) return null;
  const phases = ['triage', 'recon', 'planning', 'adversarial_review', 'backlog', 'execute', 'retro'];
  const curIdx = phases.indexOf(c.phase);
  return (
    <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', ...mono, fontSize: 12 }}>
        {phases.map((name, i) => (
          <React.Fragment key={name}>
            {i > 0 ? <span style={{ color: 'var(--text-disabled)' }}>─</span> : null}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: i < curIdx ? 'var(--state-green-ink)' : i === curIdx ? 'var(--signal-cyan-ink)' : 'var(--text-disabled)' }}>
              <span aria-hidden="true">{i < curIdx ? '●' : i === curIdx ? '◉' : '○'}</span>{name}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span style={mono}>round {c.round}/{c.round_cap}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span aria-hidden="true">⏱</span><span style={mono}>{c.timebox_deadline ? Math.max(0, Math.round((c.timebox_deadline - Date.now()) / 1000)) + 's' : '—'}</span>{c.paused ? <StatusPill tone="attention" size="sm">paused</StatusPill> : null}</span>
        <span>AR veto: {c.veto_state === 'raised' ? <StatusPill tone="attention" glyph="▲" size="sm">raised</StatusPill> : <StatusPill tone="verified" glyph="✔" size="sm">clear</StatusPill>}</span>
        <span>AR grounded dissent: <span style={{ color: 'var(--state-green)' }}>✔ {c.ar_dissent_count} cited</span></span>
        <span>PO decision: {c.po_decision ? <StatusPill tone="verified" glyph="✔" size="sm">filed</StatusPill> : <span style={{ color: 'var(--state-amber-ink)' }}>○ pending</span>}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>
        <span>roster:</span>
        {Object.entries(c.roster || {}).filter(([, s]) => s).map(([role, sub]) => (
          <span key={role} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ ...eyebrow, fontSize: 10 }}>{role}</span><PrincipalRef kind="agent" id={sub} /></span>
        ))}
      </div>
    </div>
  );
}

export function TicketLineageTree({ nodes, cap }) {
  return (
    <div style={{ ...mono, fontSize: 12, lineHeight: '22px' }}>
      {nodes.map((n, i) => (
        <div key={i} style={{ paddingLeft: (n.lineage_depth || 0) * 18, color: 'var(--text-secondary)' }}>
          {n.lineage_depth > 0 ? <span style={{ color: 'var(--text-disabled)' }}>└ </span> : null}
          <TicketRef id={n.ticket_id} /> {statePill(n.status, 'sm')}
          {n.spawned_by ? <span style={{ color: 'var(--text-muted)' }}> · <PrincipalRef kind="agent" id={n.spawned_by} /></span> : null}
          <span style={{ color: n.lineage_depth >= cap ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}> · d{n.lineage_depth}/{cap}</span>
        </div>
      ))}
    </div>
  );
}
