import { useState } from 'react';
import { DataTable, EmptyState, Input, PrincipalRef, StatusPill, TicketRef } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { Section, mono, panel } from '../components/gwparts';
import { AsOf, Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { getAudit } from '../lib/api';
import { FIXTURE_AUDIT } from '../lib/fixtures';
import { useResource } from '../state/GatewayProvider';
import type { AnchorStatus, AuditRow, ChainVerify } from '../lib/types';

/* S3 — Audit trail (UI_SPEC §6). Walk the append-only, hash-chained,
   Ed25519-signed per-command forensic log; verify the chain; show anchor status
   vs Mission Control. This is AuditInspector §7.2 — a shared family; the Gateway
   is a CONSUMER, it does not fork it. Read-only always (append-only is the point). */

function OutcomePill({ row }: { row: AuditRow }) {
  if (row.outcome_tone === 'reject') return <StatusPill tone="danger" glyph="✕" size="sm">{row.outcome}</StatusPill>;
  if (row.outcome_tone === 'pending') return <StatusPill tone="interactive" glyph="⧗" size="sm">{row.outcome}</StatusPill>;
  return <StatusPill tone="verified" glyph="✔" size="sm">{row.outcome}</StatusPill>;
}

/* The chain-verify affordance/result — green ONLY on a completed successful walk
   (§4.9 false-green prohibition). A stale/partial verify is halt-gold; an actual
   detected break is danger-red (the operator's forensic alarm). */
function VerifyPanel({ v }: { v: ChainVerify }) {
  if (v.status === 'broken') {
    return (
      <div style={{ ...panel, borderColor: '#5A2420', padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...mono, fontSize: 13, color: 'var(--danger-text)' }}>✕ CHAIN BROKEN at seq {v.broken_at}</span>
        <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>A hash/signature break was detected — this is a forensic alarm, not a load error. The offending record is linked.</span>
      </div>
    );
  }
  if (v.status === 'cannot_confirm') {
    return (
      <div style={{ ...panel, borderColor: 'var(--halt-gold-edge)', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, background: 'var(--halt-gold-wash)' }}>
        <span style={{ ...mono, fontSize: 13, color: 'var(--halt-gold-ink)' }}>⚠ CANNOT CONFIRM CHAIN</span>
        <span style={{ ...mono, fontSize: 11, color: 'var(--halt-gold-ink)', opacity: 0.85 }}>The verify could not complete (store slow/partial, or the key was unavailable) — never rendered green.</span>
      </div>
    );
  }
  return (
    <div style={{ ...panel, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ ...mono, fontSize: 13, color: 'var(--state-green-ink)' }}>✔ VERIFIED seq {v.from_seq}→{v.to_seq} · {v.count} records · Ed25519 ok · {v.ms ? `${(v.ms / 1000).toFixed(1)}s` : ''}</span>
      <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>(a stale or failed verify NEVER renders green — see the halt-gold / red states)</span>
    </div>
  );
}

function AnchorPanel({ a }: { a: AnchorStatus }) {
  if (a.status === 'hole') {
    return (
      <div style={{ ...panel, borderColor: '#5A2420', padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...mono, fontSize: 13, color: 'var(--danger-text)' }}>✕ PERMANENT HOLE — HEADs fell past retention before MC received them</span>
        <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>Surfaced, never papered over (contract §3).</span>
      </div>
    );
  }
  if (a.status === 'resync_pending') {
    return (
      <div style={{ ...panel, borderColor: 'var(--halt-gold-edge)', padding: 12, background: 'var(--halt-gold-wash)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ ...mono, fontSize: 13, color: 'var(--halt-gold-ink)' }}>⚠ RESYNC-PENDING — MC is behind (anchor-push failure)</span>
        <span style={{ ...mono, fontSize: 11, color: 'var(--halt-gold-ink)', opacity: 0.85 }}>Alarms, does NOT halt (contract §4) · re-push-above-last on reconnect.</span>
      </div>
    );
  }
  return (
    <div style={{ ...panel, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>last HEAD pushed seq {a.last_head_pushed} · MC ack'd {a.mc_acked} · ⟳ {a.age} <span style={{ color: 'var(--state-green-ink)' }}>✔ IN SYNC</span></span>
      <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>retention {a.retention_days}d · re-push-above-last on reconnect</span>
    </div>
  );
}

export function Audit() {
  const [verifyFrom, setVerifyFrom] = useState('');
  const res = useResource(() => getAudit(verifyFrom ? { verify_from: Number(verifyFrom) } : {}), FIXTURE_AUDIT, [verifyFrom]);
  const data = res.data ?? FIXTURE_AUDIT;
  const degraded = data.degraded || (res.offline && res.error?.isDependency);

  const cols: DataColumn<AuditRow>[] = [
    { key: 'seq', header: 'seq', align: 'right', mono: true, render: (r) => r.seq },
    { key: 'time', header: 'time', mono: true, render: (r) => <span style={{ color: 'var(--text-muted)' }}>{r.time}</span> },
    { key: 'who', header: 'who', render: (r) => <PrincipalRef kind={r.who_kind} id={r.who} /> },
    { key: 'action', header: 'action', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.action}</span> },
    { key: 'target', header: 'target', render: (r) => (r.target.startsWith('cred://') || r.target.includes(' ')) ? <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.target}</span> : <TicketRef id={r.target} truncate /> },
    { key: 'outcome', header: 'outcome', render: (r) => <OutcomePill row={r} /> },
  ];

  return (
    <Screen>
      <Head
        crumb={<>chain_id {data.chain_id} · {data.record_count.toLocaleString()} records</>}
        title="Audit chain"
        sub="Append-only, hash-chained, Ed25519-signed per-command forensic log. Read-only by construction — a break is a content alarm, never a load error."
        right={<AsOf age={data.age} stale={!!degraded} />}
      />

      {res.offline && res.error?.isDependency ? (
        <OfflineBanner error={res.error} noun="audit chain" />
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Input placeholder="Verify chain from seq…" value={verifyFrom} onChange={(e) => setVerifyFrom(e.target.value.replace(/[^0-9]/g, ''))} style={{ maxWidth: 220 }} />
        <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>filter: run · host · record_type · sub</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 12 }}>
        <Section title="Chain-verify">
          <VerifyPanel v={degraded ? { status: 'cannot_confirm' } : data.verify} />
        </Section>
        <Section title="MC anchor status">
          <AnchorPanel a={degraded ? { status: 'resync_pending' } : data.anchor} />
        </Section>
      </div>

      {res.status === 'loading' ? (
        <TableSkeleton rows={6} />
      ) : data.rows.length === 0 ? (
        <EmptyState glyph="⛓" title="No audit records yet">Every dispatch, rejection, redemption, verdict, and kill event lands here, hash-chained. (Realistically never empty.)</EmptyState>
      ) : (
        <DataTable columns={cols} rows={data.rows} rowKey="seq" reflow={false} dense />
      )}
    </Screen>
  );
}
