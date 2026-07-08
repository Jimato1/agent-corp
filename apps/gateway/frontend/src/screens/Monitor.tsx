import { useState } from 'react';
import type { CSSProperties } from 'react';
import { EmptyState, FreshnessStamp, Input, PrincipalRef, StatusPill, TicketRef, TierBadge } from '../components/ds';
import { ClassChip, FenceState, RunStatePill, eyebrow, mono, panel } from '../components/gwparts';
import { SoDTicks } from '../components/SoDChainStrip';
import { Head, LocalError, OfflineBanner, SafeStoppedBand, Screen, TableSkeleton } from './common';
import { listHosts } from '../lib/api';
import { FIXTURE_HOSTS } from '../lib/fixtures';
import { useGateway, useResource } from '../state/GatewayProvider';
import type { HostRow } from '../lib/types';
import type { Nav } from './nav';

/* S1 — Live execution monitor (UI_SPEC §4). The landing screen: "what is running
   on which host, right now, and is every run inside its four-check envelope." A
   per-host card grid over GET /api/hosts. The operator STOPS NOTHING here — this
   is a read-mirror; the kill trigger lives in MC/auth. There is deliberately NO
   "start a run" control (that is an agent-only, fully-gated path). */

function HostCard({ host, killLevel, onOpen }: { host: HostRow; killLevel: string; onOpen: (id: string) => void }) {
  const run = host.run;
  const frozen = killLevel !== 'G0' && !!run && run.state !== 'done';
  const cannot = host.cannot_confirm;

  return (
    <div style={{ ...panel, padding: 12, display: 'flex', flexDirection: 'column', gap: 8, borderColor: frozen ? 'var(--halt-gold-edge)' : cannot ? 'var(--halt-gold-edge)' : 'var(--border-default)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <TicketRef id={host.host_id} />
        {frozen ? (
          <StatusPill tone="halt" glyph="▮▮" size="sm">FROZEN {killLevel}</StatusPill>
        ) : cannot ? (
          <FreshnessStamp state="halt" reading="⚠ CANNOT CONFIRM" />
        ) : run ? (
          <RunStatePill state={run.state} reason={run.fail_reason} size="sm" />
        ) : (
          <StatusPill tone="neutral" glyph="●" size="sm">IDLE</StatusPill>
        )}
      </div>

      {frozen && run ? (
        <>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--halt-gold-ink)' }}>run halted at task boundary</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TicketRef id={run.run_id} truncate onCopy={() => undefined} />
            <span style={{ ...mono, fontSize: 12, color: 'var(--danger-text)' }}>→ failed(halted)</span>
          </div>
          <button type="button" onClick={() => onOpen(run.run_id)} style={openBtn}>open run →</button>
        </>
      ) : run && !cannot ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <TicketRef id={run.run_id} truncate onCopy={() => undefined} />
            <TicketRef id={run.ticket_id} />
          </div>
          <PrincipalRef kind="agent" id={run.executor} />
          <ClassChip actionClass={run.action_class} />
          <FenceState fence={run.fence} />
          <SoDTicks ticks={run.sod_ticks} />
          {run.wazuh_note ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{run.wazuh_note}</span>
              <TierBadge tier="untrusted" label="host-originated" />
            </div>
          ) : null}
          {run.task_line ? (
            <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
              ▏{run.task_index ? `task ${run.task_index}  ` : ''}{run.task_line}
            </div>
          ) : null}
          <button type="button" onClick={() => onOpen(run.run_id)} style={openBtn}>open run →</button>
        </>
      ) : cannot ? (
        <div style={{ ...mono, fontSize: 12, color: 'var(--halt-gold-ink)' }}>cannot confirm this host's run state — treating as safe-stopped (never a green idle)</div>
      ) : (
        <>
          <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>no active run</div>
          <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>
            last: {host.last_ticket ? <TicketRef id={host.last_ticket} /> : '—'} {host.last_done_at ? `done ${host.last_done_at}` : ''}
          </div>
        </>
      )}
    </div>
  );
}

const openBtn: CSSProperties = {
  ...eyebrow,
  alignSelf: 'flex-start',
  background: 'transparent',
  border: '1px solid var(--border-strong)',
  borderRadius: 4,
  padding: '2px 10px',
  cursor: 'pointer',
  color: 'var(--signal-cyan)',
  marginTop: 2,
};

export function Monitor({ nav }: { nav: Nav }) {
  const { posture, offline: postureOffline } = useGateway();
  const res = useResource(() => listHosts(), FIXTURE_HOSTS);
  const [q, setQ] = useState('');

  const hosts = res.data?.hosts ?? [];
  // A DEPENDENCY outage (Pattern D) — the runs API can't be confirmed → the
  // console safe-stops; cards it can't confirm render CANNOT-CONFIRM, never green.
  const dependencyDown = (res.offline && res.error?.isDependency) || postureOffline || posture.own_stale;

  const filtered = q
    ? hosts.filter((h) => [h.host_id, h.run?.ticket_id, h.run?.executor, h.run?.run_id].filter(Boolean).some((v) => String(v).toLowerCase().includes(q.toLowerCase())))
    : hosts;

  return (
    <Screen>
      <Head
        title="Live execution"
        sub="What is running on which host, right now, and whether every run is inside its four-check envelope. Read-mirror — nothing is started or stopped here."
        right={
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            {dependencyDown ? <FreshnessStamp state="halt" reading="SAFE-STOPPED" /> : <FreshnessStamp age={res.data?.fresh_ms ? `⟳ fresh ${res.data.fresh_ms}ms` : 'live'} />}
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{hosts.length} hosts</span>
          </span>
        }
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <Input placeholder="/host, ticket, agent…" value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>state: active · class: all</span>
      </div>

      {/* Pattern D — a Gateway dependency is down → SAFE-STOPPED gold (never a red
          error). Existing runs finish at task boundary; all gates fail closed. */}
      {res.offline && res.error && res.error.isDependency ? (
        <OfflineBanner error={res.error} noun="run list" />
      ) : res.offline && res.error ? (
        // Pattern R — a local read failure the operator can retry.
        <LocalError error={res.error} title="Couldn't load the run list — retry" hint="A local read of the runs API failed. Retry; this is not a dependency outage." />
      ) : dependencyDown ? (
        <SafeStoppedBand reason="halt-status liveness unconfirmed" />
      ) : null}

      {res.status === 'loading' ? (
        <TableSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState glyph="◔" title="No hosts are executing">
          Runs appear here when an executor agent calls <code style={{ ...mono }}>execute_approved_plan</code> and clears the
          four-check chain. The Gateway starts nothing on its own.
        </EmptyState>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
          {filtered.map((h) => (
            <HostCard key={h.host_id} host={h} killLevel={posture.kill_level} onOpen={nav.openRun} />
          ))}
        </div>
      )}
    </Screen>
  );
}
