import type { CSSProperties } from 'react';
import { FreshnessStamp, PrincipalRef, ReviewChip, StatusPill, TicketRef, TierBadge } from '../components/ds';
import { ClassChip, FenceState, RunStatePill, Section, eyebrow, mono } from '../components/gwparts';
import { SoDChainStrip } from '../components/SoDChainStrip';
import { RunConsole } from '../components/RunConsole';
import { Head, LocalError, OfflineBanner, Screen, TableSkeleton } from './common';
import { getRun } from '../lib/api';
import { FIXTURE_CONSOLE, FIXTURE_RUN_DETAIL, FIXTURE_RUN_REJECTED } from '../lib/fixtures';
import { useGateway, useResource } from '../state/GatewayProvider';
import type { Nav } from './nav';

/* S2 — Run detail + SoD proof (UI_SPEC §5). The single most important Gateway
   screen: reconstruct one run's segregation-of-duties proof FROM THE CHAIN ALONE
   and tail its console. GET /api/runs/{id} + the audit-store SSE tail. */
export function RunDetail({ runId, nav }: { runId: string; nav: Nav }) {
  const { posture } = useGateway();
  // Pick the offline fixture that matches the ref (the rejected-preflight worked
  // example vs the executing one) so the S2 states are all previewable offline.
  const fixture = runId === FIXTURE_RUN_REJECTED.run_id ? FIXTURE_RUN_REJECTED : FIXTURE_RUN_DETAIL;
  const res = useResource(() => getRun(runId), fixture, [runId]);
  const run = res.data ?? fixture;

  const killEngaged = posture.kill_level !== 'G0';
  const halted = killEngaged && (run.state === 'executing' || run.state === 'health_check');

  if (res.status === 'loading') {
    return (
      <Screen>
        <Head crumb="run detail" title="Loading run…" />
        <TableSkeleton rows={6} />
      </Screen>
    );
  }

  // A bad run_id surfaces as Pattern R with an Audit link (there is no "empty" —
  // a run detail always has a run).
  if (res.offline && res.error && !res.error.isDependency) {
    return (
      <Screen>
        <Head crumb="run detail" title={<TicketRef id={runId} truncate />} />
        <LocalError error={res.error} title="No such run" hint={<>The run id could not be resolved locally. Check the id or find it in the <button type="button" onClick={() => nav.goto('audit')} style={linkBtn}>audit chain →</button></>} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Head
        crumb={<span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>run <span>·</span> host <TicketRef id={run.host_id} /></span>}
        title={<span style={{ display: 'inline-flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><TicketRef id={run.run_id} truncate /> <RunStatePill state={run.state} reason={run.fail_reason} /></span>}
        right={halted ? <FreshnessStamp state="halt" reading="DRAINING" /> : <FreshnessStamp age="⟳ 0.4s" />}
      />

      {res.offline && res.error?.isDependency ? <OfflineBanner error={res.error} noun="run" /> : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <TicketRef id={run.ticket_id} />
        <PrincipalRef kind="agent" id={run.executor} />
        <ClassChip actionClass={run.action_class} />
        {run.op_id ? <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>op_id {run.op_id}</span> : null}
      </div>

      {run.rejected ? (
        <div style={{ display: 'inline-flex' }}>
          <StatusPill tone="danger" glyph="✕" size="sm">rejected preflight — never dispatched</StatusPill>
        </div>
      ) : null}

      {/* The full four-check + Check-0 chain, each row citing its evidence artifact
          + verdict; the §4.7 destructive-absence rule printed as a constitutional
          fact (inside SoDChainStrip). */}
      <Section title="Segregation-of-duties chain" right={<FenceState fence={run.fence} compact />}>
        <SoDChainStrip checks={run.checks} />
      </Section>

      {run.state === 'needs_review' ? (
        <div style={{ display: 'inline-flex' }}>
          <ReviewChip state="needs-review" reason="needs_review" href={`#/mc/review/${run.ticket_id}`} />
        </div>
      ) : null}

      {/* The console — only meaningful for a run that dispatched. A rejected
          preflight never produced output. */}
      {run.rejected ? (
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-muted)', border: '1px solid var(--border-default)', borderRadius: 6, padding: 12 }}>
          No console output — this run was rejected at check {run.checks.find((c) => c.status === 'rejected')?.n ?? '?'} and never dispatched. Rejections are first-class telemetry (the hostile-model signal), not errors.
        </div>
      ) : (
        <RunConsole runId={run.run_id} fixture={FIXTURE_CONSOLE} offline={res.offline} taskIndex={run.task_index} halt={halted} />
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
        <span><span style={{ ...eyebrow }}>health-check:</span> {run.health_check ?? (run.rejected ? 'n/a' : 'pending')}</span>
        <span><span style={{ ...eyebrow }}>rollback path:</span> {run.rollback_path ?? 'snapshot (available)'}</span>
        {run.state === 'verifying' ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...eyebrow }}>external verify:</span> {run.wazuh_pairs ?? 'Wazuh poll pending'} <TierBadge tier="untrusted" label="host-originated" />
          </span>
        ) : null}
      </div>
    </Screen>
  );
}

const linkBtn: CSSProperties = { background: 'transparent', border: 0, padding: 0, color: 'var(--signal-cyan)', cursor: 'pointer', font: 'inherit' };
