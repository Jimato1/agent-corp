import { useMemo, useState } from 'react';
import {
  Button,
  EmptyState,
  FenceState,
  FreshnessStamp,
  Input,
  PrincipalRef,
  ReviewChip,
  Skeleton,
  TicketRef,
} from '../components/ds';
import { KindBadge, mono, panel } from '../components/KindBadge';
import { Head, DependencyBanner } from './common';
import { useChat } from '../state/ChatProvider';
import { relativeAge } from '../lib/format';
import type { Envelope } from '../lib/types';
import type { Nav } from './nav';

/* 1 · Feed — the live stream (ch-screens.jsx `Feed`, wired to the live API).
   Un-acked escalations pin to top in the ATTENTION family (amber, never gold).
   The ReviewChip deep-link is the ONLY live link and is always captioned
   "(target wins)". FenceState is advisory-only (greyed). Ack / Ack-all are light
   confirms — no typed-intent, no step-up. */
export function Feed({ nav }: { nav: Nav }) {
  const ctx = useChat();
  const [filter, setFilter] = useState('');

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const matched = q
      ? ctx.notifications.filter((n) =>
          [n.title, n.body, n.agent_id, n.ticket_id ?? '', n.tags.join(' ')].join(' ').toLowerCase().includes(q),
        )
      : ctx.notifications;
    // Un-acked escalations pin to top; otherwise newest-first (already sorted).
    return [...matched].sort(
      (a, b) => Number(b.kind === 'escalation' && !b.acked_at) - Number(a.kind === 'escalation' && !a.acked_at),
    );
  }, [ctx.notifications, filter]);

  const unacked = ctx.notifications.filter((n) => !n.acked_at).length;
  const total = ctx.notifications.length;

  const freshness = ctx.offline ? (
    <FreshnessStamp state="stale" reading="OFFLINE" />
  ) : ctx.connected ? (
    <FreshnessStamp age="feed live" />
  ) : (
    <FreshnessStamp state="stale" reading="RECONNECTING" />
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 900 }}>
      <Head
        title="Feed"
        sub="The suite's doorbell — agent→operator escalations, review-ready work, and completions. Chat surfaces review; it never clears it."
        right={freshness}
      />

      {ctx.offline && ctx.loadError ? <DependencyBanner error={ctx.loadError} onRetry={ctx.reload} /> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Input icon="/" placeholder="filter…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
        <Button tone="secondary" size="compact" disabled={unacked === 0} onClick={() => void ctx.ackAllSeen()}>
          Ack all seen ▸
        </Button>
      </div>

      {ctx.status === 'loading' ? (
        <div style={{ ...panel, padding: 4 }}>
          <Skeleton variant="table" rows={4} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState glyph="◔" title={filter ? 'No matches' : 'The doorbell is quiet'}>
          {filter
            ? 'No notification matches that filter. Clear it to see the full 90-day stream.'
            : 'Nothing to surface yet. When an agent escalates, marks work review-ready, or reports a completion, it lands here — newest first, escalations pinned to top.'}
        </EmptyState>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((n) => (
            <FeedRow key={n.notification_id} n={n} onOpen={() => nav.openNote(n)} onAck={() => void ctx.ackOne(n.notification_id)} />
          ))}
        </div>
      )}

      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>
        showing 90d · {unacked} unacked · {total} total{ctx.offline ? ' · demo fixtures' : ''}
      </div>
    </div>
  );
}

function FeedRow({ n, onOpen, onAck }: { n: Envelope; onOpen: () => void; onAck: () => void }) {
  const pinned = n.kind === 'escalation' && !n.acked_at;
  const acked = !!n.acked_at;
  const reason = n.tags[0];

  return (
    <div
      onClick={onOpen}
      style={{
        cursor: 'pointer',
        ...panel,
        borderColor: pinned ? '#5A4A1E' : 'var(--border-default)',
        background: pinned ? 'var(--state-amber-wash)' : acked ? 'var(--surface-panel)' : 'var(--bg-card)',
        opacity: acked ? 0.72 : 1,
        padding: '10px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <KindBadge kind={n.kind} prio={n.priority} />
        <PrincipalRef kind={n.agent_kind} id={n.agent_id} />
        {reason ? <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>· {reason}</span> : null}
        {n.ticket_id ? <TicketRef id={n.ticket_id} /> : null}
        <span style={{ flex: 1 }} />
        <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>
          {relativeAge(n.created_at)}{n.repeat_count > 1 ? ` ·×${n.repeat_count}` : ''}
        </span>
        {acked ? (
          <span style={{ ...mono, fontSize: 11, color: 'var(--state-green-ink)' }}>acked ✔</span>
        ) : (
          <Button
            tone="ghost"
            size="compact"
            onClick={(e) => {
              e.stopPropagation();
              onAck();
            }}
          >
            Ack
          </Button>
        )}
      </div>

      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 15, lineHeight: '22px', color: 'var(--text-secondary)' }}>{n.body}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {n.deep_link ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={(e) => e.stopPropagation()}>
            <ReviewChip
              state={n.kind === 'escalation' ? 'escalated' : 'needs-review'}
              reason={n.deep_link.label}
              href={n.deep_link.url}
            />
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-disabled)' }}>{n.deep_link.caption || '(target wins)'}</span>
          </span>
        ) : null}
        {n.fencing_token ? (
          <span style={{ opacity: 0.55 }}>
            <FenceState gen={n.fencing_token} advisory state="held" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default Feed;
