import { useState } from 'react';
import type { CSSProperties } from 'react';
import { DangerAction, DataTable, EmptyState, ErrorState, PrincipalRef, PrintedAbsence, ReviewChip, StatusPill, TicketRef } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { FenceState, RunStatePill, Section, mono } from '../components/gwparts';
import { Head, OfflineBanner, SafeStoppedBand, Screen, TableSkeleton } from './common';
import { getOrphans, reprobeOrphan } from '../lib/api';
import { FIXTURE_ORPHANS } from '../lib/fixtures';
import { useGateway, useResource } from '../state/GatewayProvider';
import type { OrphanRow } from '../lib/types';

/* S7 — Orphan reconciliation (UI_SPEC §10). After a Gateway crash mid-run, the
   Board hold persists deliberately (the host may have been touched). This queue
   surfaces those orphans + the operator-gated re-redemption when the old lease
   expired. This is a Gateway-LOCAL operational queue — NOT the canonical MC
   ReviewQueue; its escalations render ReviewChip and deep-link OUT to MC + Chat.
   The Gateway NEVER auto-resumes a half-run. */
export function Orphans() {
  const { posture } = useGateway();
  const res = useResource(() => getOrphans(), FIXTURE_ORPHANS);
  const [done, setDone] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const data = res.data ?? FIXTURE_ORPHANS;
  const killEngaged = posture.kill_level !== 'G0';
  const depDown = data.degraded || (res.offline && res.error?.isDependency) || posture.own_stale;

  const cols: DataColumn<OrphanRow>[] = [
    { key: 'run_id', header: 'run', render: (r) => <TicketRef id={r.run_id} truncate /> },
    { key: 'host_id', header: 'host', render: (r) => <TicketRef id={r.host_id} /> },
    { key: 'state_at_crash', header: 'state at crash', render: (r) => <RunStatePill state={r.state_at_crash} size="sm" /> },
    { key: 'board_hold', header: 'Board hold', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>held gen {r.board_hold_gen}</span> },
    { key: 'probe', header: 'probe', render: (r) => r.probe_needed ? <StatusPill tone="attention" glyph="⚠" size="sm">needed</StatusPill> : <StatusPill tone="neutral" size="sm">—</StatusPill> },
  ];

  return (
    <Screen>
      <Head
        crumb={`${data.rows.length} orphan${data.rows.length === 1 ? '' : 's'} · ${data.auto_resolvable} auto-resolvable`}
        title="Orphan reconciliation"
        sub="A Gateway-local operational queue of half-runs after a crash. NOT the canonical review queue — escalations deep-link out to MC + Chat. Re-redemption is operator-gated; the Gateway never auto-resumes."
      />

      {res.offline && res.error?.isDependency ? <OfflineBanner error={res.error} noun="orphan queue" /> : null}
      {done ? <div style={okBanner}>✔ {done}</div> : null}
      {failed ? <ErrorState pattern="R" title="Re-redemption request didn't apply" detail="reprobe_rejected">{failed}</ErrorState> : null}

      {res.status === 'loading' ? (
        <TableSkeleton rows={2} />
      ) : data.rows.length === 0 ? (
        <EmptyState glyph="◔" title="No orphaned runs">
          If the Gateway ever dies mid-run, the half-run appears here for truthful reconciliation — it is never silently resumed.
        </EmptyState>
      ) : (
        <>
          <DataTable columns={cols} rows={data.rows} rowKey="run_id" reflow={false} />
          {data.rows.map((r) => (
            <Section key={r.run_id} title={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}><TicketRef id={r.ticket_id} /> <PrincipalRef kind="agent" id={r.executor} /></span>} right={<FenceState fence={{ gen: r.board_hold_gen, superseded: false }} compact />}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
                <span>crashed {r.crashed_at}{r.crashed_task ? ` ${r.crashed_task}` : ''}</span>
                <span>Board hold: 🔒 gen {r.board_hold_gen} · {r.reaper_eligible ? 'reaper-eligible' : 'NOT reaper-eligible (orphan rule)'}</span>
                {r.probe_result ? <span>read-only probe: {r.probe_result}</span> : null}
                {r.old_lease ? <span>old lease {r.old_lease} {r.lease_expired ? 'EXPIRED → re-redemption needed (operator-gated)' : ''}</span> : null}
                <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                  <ReviewChip state="escalated" reason={r.escalation_reason} href={r.review_href} />
                  {r.chat_href ? <a href={r.chat_href} style={{ ...mono, fontSize: 11, color: 'var(--signal-cyan)', textDecoration: 'none' }}>→ chat</a> : null}
                </span>
                <div style={{ marginTop: 4 }}>
                  {depDown ? (
                    <PrintedAbsence glyph="⛊" tag="safe-stopped" why="Board/Vault down (or own-liveness unconfirmed) — re-redemption cannot be requested; orphans are still enumerated from local runs (fail-closed).">
                      <strong>Re-redemption safe-stopped.</strong> The Board-hold cross-check reads <code style={{ ...mono }}>⚠ CANNOT CONFIRM hold</code>, never a green "resolved."
                    </PrintedAbsence>
                  ) : killEngaged ? (
                    <StatusPill tone="halt" glyph="▮▮" size="sm">FROZEN — no new Vault redemptions ≥ G1</StatusPill>
                  ) : (
                    <DangerAction
                      label="Request fresh credential + probe →"
                      glyph="⚠"
                      variant="solid"
                      intensity="full"
                      direction="more"
                      stepUp
                      confirmLabel="Request fresh credential"
                      auditNote="mints a minimal-TTL release_id for a READ-ONLY probe — a tamper-evident row is written"
                      consequence={
                        <>
                          This requests a fresh minimal-TTL <strong>release_id</strong> for a <strong>read-only probe</strong> of{' '}
                          <strong>{r.host_id}</strong> — it moves toward touching a host again. The Gateway NEVER auto-resumes a
                          half-run; the only outcomes it writes are the truthful terminal (verifying / needs_review if healthy +
                          complete, else failed(orphaned)).
                        </>
                      }
                      onConfirm={async () => {
                        setFailed(null);
                        try {
                          await reprobeOrphan(r.run_id);
                          setDone(`Fresh read-only probe requested for ${r.host_id} — awaiting truthful terminal (never auto-resumed).`);
                        } catch (e) {
                          setDone(null);
                          setFailed(e instanceof Error ? e.message : 'Board/Vault said no at request time. Recoverable — retry.');
                        }
                      }}
                    />
                  )}
                </div>
                <span style={{ color: 'var(--text-muted)' }}>NEVER auto-resumes a half-run — reports the truthful terminal only.</span>
              </div>
            </Section>
          ))}
        </>
      )}

      {depDown && data.rows.length === 0 ? <SafeStoppedBand reason="Board/Vault unreachable" /> : null}

      <PrintedAbsence glyph="🔒" tag="by construction" why="A crashed run's host may have been touched; only the operator, via a fresh gated re-redemption, may probe it — the Gateway itself never silently resumes.">
        <strong>The Gateway never auto-resumes a half-run.</strong> Orphans are surfaced for truthful reconciliation and escalate
        OUT to MC + Chat; the only outcomes written are the honest terminal states.
      </PrintedAbsence>
    </Screen>
  );
}

const okBanner: CSSProperties = {
  fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--state-green-ink)',
  background: 'var(--state-green-wash)', border: '1px solid #1E5140', borderRadius: 6, padding: '8px 12px',
};
