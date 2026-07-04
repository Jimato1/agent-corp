// S3 — Deliberation Thread View (Workshop content pane, specialized render). Notes renders the thread
// the Board's ceremony PRODUCES; it is the record, never the state machine. Same file, same API as S2.
// There is NO converge / escalate button here — phase transitions happen on the Board (printed fact).
import { api, mcReviewHref } from '../api.js';
import { H, eyebrow, mono } from '../parts/common.jsx';
import { useAsync, ErrorView } from '../parts/ui.jsx';
import { DeliberationThreadView } from '../parts/DeliberationThreadView.jsx';

export function Deliberation({ noteId, ctx }) {
  const { Button, Skeleton, StatusPill, TicketRef, PrintedAbsence } = H;
  const { data: note, error, loading, reload } = useAsync(() => api.getNote(noteId), [noteId, ctx.liveTick]);

  if (loading) {
    return <div style={{ padding: 40 }}><Skeleton variant="text" lines={10} /></div>;
  }
  if (error) {
    return <div style={{ padding: 24 }}><ErrorView error={error} action={<Button tone="secondary" onClick={reload}>Retry</Button>} /></div>;
  }

  const fm = note.frontmatter || {};
  const ticket = fm.ticket;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: '1px solid var(--border-default)', background: 'var(--surface-raised)', flexWrap: 'wrap' }}>
        <button onClick={() => ctx.goto('corpus')} style={{ ...eyebrow, background: 'transparent', border: 0, cursor: 'pointer', color: 'var(--text-link)' }}>‹ Corpus</button>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{fm.title || note.id}</span>
        <StatusPill tone="neutral" size="sm">deliberation</StatusPill>
        {ticket ? <TicketRef id={ticket} href={mcReviewHref(ticket)} /> : null}
        {/* phase is a DECORATIVE MIRROR — never a fabricated authoritative phase (display-only firewall). */}
        <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>phase: mirror · authority: Board</span>
        <span style={{ flex: 1 }} />
        {/* destructive-absence §4.7: a printed fact, NOT a disabled control. */}
        <PrintedAbsence glyph="🔒" tag="on the Board">Phase transitions (converge / escalate) happen on the Board, never here.</PrintedAbsence>
      </div>
      <DeliberationThreadView note={note} />
    </div>
  );
}
