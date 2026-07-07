import { Button, EmptyState, ReviewChip, StatusPill, TicketRef } from '../components/ds';
import { mono, panel } from '../components/cmparts';
import { AsOf, Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { getEscalations, resendEscalation } from '../lib/api';
import { FIXTURE_ESCALATIONS } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';

/* 5.13 Escalation-outbox status → Board — the durable outbox. A PRODUCER view
   (not the ReviewQueue, not a fork of it). CMDB FILES escalations; only MC/Board
   CLEAR them. Degraded-but-honest is first-class: until svc:cmdb + Board intake
   exist, escalations sit QUEUED locally, flagged loudly (Pattern D, halt-gold) —
   never a red error and never hidden. */
export function Escalations() {
  const res = useResource(() => getEscalations(), FIXTURE_ESCALATIONS);
  const box = res.data;
  const rows = box?.rows ?? [];
  const degraded = !(box?.svc_present ?? true) || !(box?.board_intake_up ?? true);

  return (
    <Screen width={1000}>
      <Head
        title="Escalation outbox → Board"
        sub="A producer view (not the ReviewQueue). CMDB files escalations; only MC/Board clear them. Host-originated strings in payloads are provenance-tagged."
        right={<AsOf age={box?.as_of} stale={res.offline && res.error?.isDependency} />}
      />
      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <span>{box?.svc_present ?? true ? '● svc:cmdb principal: present' : '▲ svc:cmdb principal: absent'}</span>
        <span>{box?.board_intake_up ?? true ? '● Board intake: up' : '▲ Board intake: down'}</span>
      </div>

      {degraded ? (
        <div style={{ ...panel, padding: 12, borderColor: 'var(--halt-gold-edge)', background: 'var(--halt-gold-wash)', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--halt-gold-ink)' }}>
          ⛊ Degraded-but-honest: until svc:cmdb + Board intake exist, escalations sit <strong>queued locally</strong> — queued,
          not dropped. This is Pattern D (the safety system working), never a red error and never hidden.
        </div>
      ) : null}

      {res.offline && res.error ? <OfflineBanner error={res.error} /> : null}
      {res.status === 'loading' ? (
        <TableSkeleton rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState glyph="⚑" title="No escalations">No escalations — fleet policy is clean.</EmptyState>
      ) : (
        rows.map((e) => (
          <div key={e.escalation_id} style={{ ...panel, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <ReviewChip state="escalated" reason={e.kind} href={e.deep_link ?? undefined} />
            <TicketRef id={e.target} />
            {e.state === 'delivered' ? (
              <StatusPill tone="verified" glyph="◈" size="sm">delivered</StatusPill>
            ) : (
              <StatusPill tone="attention" glyph="◐" size="sm">queued{e.retry ? ` (retry ${e.retry})` : ''}</StatusPill>
            )}
            <span style={{ flex: 1 }} />
            <span style={{ ...mono, fontSize: 11, color: e.state === 'delivered' ? 'var(--signal-cyan)' : 'var(--text-muted)' }}>
              {e.deep_link ? `→ ${e.deep_link}` : '(awaiting Board mint)'}
            </span>
            {e.state !== 'delivered' ? (
              <Button tone="secondary" size="compact" onClick={() => resendEscalation(e.escalation_id).catch(() => { /* offline */ })}>resend</Button>
            ) : null}
          </div>
        ))
      )}
      <div style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>
        CMDB files; only MC/Board clear. [ resend ] is a benign cmdb:manage op (light friction).
      </div>
    </Screen>
  );
}
