// S5 — Review-Attention View (Instrument; consumes the canonical queue, never forks it). Notes does
// NOT own a queue — Mission Control does. This screen reads MC's queue live under the operator's own
// session, decorates it, and DEEP-LINKS OUT to clear. There is NO clear/approve/reject control here —
// reviews are cleared on the Board / Mission Control, never in Notes (printed constitutional fact).
import { mc, mcReviewHref, mcAgentHref } from '../api.js';
import { H, mono } from '../parts/common.jsx';
import { Head, useAsync } from '../parts/ui.jsx';

// Tolerant field extraction across MC's envelope (mc-chat-review-resolve.md).
const tid = (r) => r.ticket_id || r.ticket || r.id;
const gate = (r) => (r.state || r.gate || r.kind || '').toLowerCase();
const reasonOf = (r) => r.reason || r.machine_reason || gate(r);
const authorOf = (r) => r.author || r.actor || r.assignee;
const titleOf = (r) => r.note || r.title || r.subject || tid(r);

export function Review({ ctx }) {
  const { DataTable, Skeleton, EmptyState, ErrorState, Button, ReviewChip, StatusPill, TicketRef, PrincipalRef, FreshnessStamp, PrintedAbsence } = H;
  const { data: rows, error, loading, reload } = useAsync(() => mc.reviewQueue(), [ctx.liveTick]);

  const cols = [
    { key: 'note', header: 'Note', render: (r) => <span style={{ fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--text-primary)' }}>{titleOf(r)}</span> },
    { key: 'ticket', header: 'Ticket', render: (r) => <TicketRef id={tid(r)} href={mcReviewHref(tid(r))} /> },
    { key: 'gate', header: 'Gate / state', render: (r) => {
      const g = gate(r);
      if (g.includes('escalat')) return <ReviewChip state="escalated" reason={reasonOf(r)} href={mcReviewHref(tid(r))} />;
      if (g.includes('review')) return <ReviewChip state="needs-review" reason={reasonOf(r)} href={mcReviewHref(tid(r))} />;
      return <a href={mcReviewHref(tid(r))} style={{ textDecoration: 'none' }}><StatusPill tone="attention" glyph="◐" size="sm">{g || 'awaiting_approval'}</StatusPill></a>;
    } },
    { key: 'author', header: 'Author', render: (r) => authorOf(r) ? <PrincipalRef kind="agent" id={authorOf(r)} href={mcAgentHref(authorOf(r))} /> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 1180 }}>
      <Head crumb="Review" title="Review attention"
        sub="Which of these notes are attached to a ticket in a human gate. Read live from Mission Control — advisory, MC-observed, never authoritative for a gate."
        right={<FreshnessStamp age={error ? 'unknown' : '3s ago'} state={error ? 'halt' : 'live'} reading="gate state is read-time-derived from MC; treat a stalled read as UNVERIFIED" />} />
      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>source: mc · as-of {error ? '— (unverified)' : '3s'}</div>

      {loading ? (
        <Skeleton variant="table" rows={4} />
      ) : error ? (
        (error.status === 401 || error.status === 403)
          // missing mc:read on this session → Pattern-R, recoverable by re-scoping / going to MC.
          ? <ErrorState pattern="R" title="Can't read the review queue" detail={error.code || `HTTP ${error.status}`}
              action={<a href="/mc"><Button tone="secondary">Open Mission Control</Button></a>}>
              Your session isn't scoped for Mission Control (needs <code style={mono}>mc:read</code>). Notes shows the gate but never owns it.
            </ErrorState>
          // MC unreachable → Pattern-D GOLD; the false-green prohibition: NEVER a fabricated "cleared".
          : <ErrorState pattern="D" title="Can't reach Mission Control" detail={error.code || 'MC_UNREACHABLE'}
              action={<Button tone="secondary" onClick={reload}>Retry</Button>}>
              Showing no live gate state — treat this as UNVERIFIED, not "all clear". The canonical queue lives on MC; Notes only mirrors it read-only and deep-links out.
            </ErrorState>
      ) : rows && rows.length ? (
        <DataTable columns={cols} rows={rows.map((r, i) => ({ ...r, _key: String(tid(r) || i) }))} rowKey="_key" />
      ) : (
        <EmptyState glyph="✓" title="Nothing awaiting a gate">No notes are awaiting a human gate right now.</EmptyState>
      )}

      <PrintedAbsence glyph="🔒" tag="never here">
        <strong>Reviews are cleared on the Board / Mission Control, never here.</strong> Notes surfaces the gate and deep-links out to <code style={mono}>mc/review/&lt;ticket_id&gt;</code>.
      </PrintedAbsence>
    </div>
  );
}
