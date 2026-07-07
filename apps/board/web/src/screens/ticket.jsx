// Ticket Detail drawer + Ceremony Ribbon (UI_SPEC §5). Full record over one ticket; the ceremony
// ribbon is read-only display of server authority.
import { board, newOpId } from '../api.js';
import { H, statePill, taintBadge, LaneBadge, ErrorNotice, mono, eyebrow, panel } from '../ui.jsx';
import { CeremonyRibbon } from '../parts.jsx';
const { TicketRef, PrincipalRef, FenceState, Button, StatusPill } = H;

function Section({ title, right, children }) {
  return (
    <div style={{ ...panel, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center' }}><span style={eyebrow}>{title}</span><span style={{ flex: 1 }} />{right}</div>
      {children}
    </div>
  );
}

export function TicketDetail({ id, onOpenApproval, onBack, bump }) {
  const [t, setT] = React.useState(null);
  const [huddle, setHuddle] = React.useState(null);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    let live = true;
    board.ticket(id).then((x) => { if (live) setT(x); }).catch((e) => live && setError(e));
    board.huddle(id).then((h) => { if (live) setHuddle(h && h.open === false ? null : h); }).catch(() => {});
    return () => { live = false; };
  }, [id, bump]);

  if (error) return <ErrorNotice error={error} />;
  if (!t) return <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-ui)' }}>Loading…</div>;

  const op = async (fn) => { try { await fn(); onBack(); } catch (e) { setError(e); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 920 }}>
      <button onClick={onBack} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', alignSelf: 'flex-start', color: 'var(--text-link)' }}>← Back to board</button>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <TicketRef id={t.ticket_id} /><span style={{ fontFamily: 'var(--font-ui)', fontSize: 17, fontWeight: 600, color: 'var(--text-primary)' }}>{t.title}</span>{statePill(t.status)}
      </div>
      <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span>type: {t.type || '—'} (advisory)</span>{taintBadge(t.taint_host_originated)}<LaneBadge lane={t.lane} />
        {t.parent_id ? <span>epic ▸ <TicketRef id={t.parent_id} /></span> : null}
        <span>lineage_depth {t.lineage_depth}</span>
      </div>

      {huddle ? <CeremonyRibbon c={{ ...huddle, phase: t.ceremony_phase }} /> : null}

      <Section title="Host lock / fencing">
        {t.fencing_token ? <FenceState gen={t.fencing_token} lease={t.lease_expires_at ? Math.max(0, Math.round((t.lease_expires_at - Date.now()) / 1000)) + 's' : undefined} state="active" />
          : <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>no active lease</span>}
        {t.claimed_by ? <span style={{ ...mono, fontSize: 12 }}>holder <PrincipalRef kind="agent" id={t.claimed_by} /></span> : null}
      </Section>

      <Section title="Approval record (Board-owned)">
        {t.approval_id
          ? <span style={{ ...mono, fontSize: 12 }}>approval <TicketRef id={t.approval_id} /> · <a href={`#/approvals/${t.approval_id}`} style={{ color: 'var(--text-link)' }}>view decision ▸</a></span>
          : t.status === 'awaiting_approval'
            ? <Button tone="secondary" size="compact" onClick={() => onOpenApproval(t.ticket_id)}>Go to approval decision ▸</Button>
            : <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>none yet</span>}
      </Section>

      {/* Operator lifecycle transitions (human authority). needs_review->done is human-ONLY. */}
      {['needs_review', 'blocked'].includes(t.status) ? (
        <Section title="Operator actions">
          <div style={{ display: 'flex', gap: 10 }}>
            {t.status === 'needs_review' ? <Button tone="safe" size="compact" onClick={() => op(() => board.operatorTransition(t.ticket_id, 'done', newOpId()))}>Clear review → done</Button> : null}
            {t.status === 'needs_review' ? <Button tone="ghost" size="compact" onClick={() => op(() => board.operatorTransition(t.ticket_id, 'todo', newOpId()))}>Rework → todo</Button> : null}
            {t.status === 'blocked' ? <Button tone="secondary" size="compact" onClick={() => op(() => board.operatorTransition(t.ticket_id, 'todo', newOpId()))}>Unblock → todo</Button> : null}
          </div>
          {t.machine_reason ? <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>machine reason: {t.machine_reason}</span> : null}
        </Section>
      ) : null}
    </div>
  );
}
