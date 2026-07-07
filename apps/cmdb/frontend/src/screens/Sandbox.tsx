import { useState } from 'react';
import { DataTable, EmptyState, PrintedAbsence, StatusPill, TicketRef } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { VerdictOutcome, mono, panel } from '../components/cmparts';
import { TighteningAction, WeakeningCeremony } from '../components/PolicyCeremony';
import { Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { disableSandboxPool, getSandboxPool } from '../lib/api';
import { FIXTURE_PROPOSE, FIXTURE_SANDBOX } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { SandboxSlot } from '../lib/types';

/* 5.7 Sandbox pool + KILL KNOB — the disposable-class pool (immutable, no tier,
   no windows, no Vault creds). Disable = instant, ceremony-free TIGHTENING
   (light confirm). Enable / create-slot = GATE-WEAKENING (full ceremony).
   The knob is the POLICY-plane stop, NOT the suite kill switch. */
export function Sandbox() {
  const res = useResource(() => getSandboxPool(), FIXTURE_SANDBOX);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const live = res.data;
  const isEnabled = enabled ?? live?.enabled ?? true;
  const slots = live?.slots ?? [];

  const cols: DataColumn<SandboxSlot>[] = [
    { key: 'host_id', header: 'host_id', render: (s) => <TicketRef id={s.host_id} /> },
    { key: 'class', header: 'class', render: (s) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>⚙ {s.class}</span> },
    { key: 'vault_creds', header: 'Vault creds', render: () => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>🔒 none (by construction)</span> },
    {
      key: 'verdict', header: 'verdict {sandbox_exec}',
      render: (s) =>
        s.config_error
          ? <span style={{ ...mono, fontSize: 11, color: 'var(--danger-text)' }}>⚠ deny(sandbox_config_error) → Board</span>
          : <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <VerdictOutcome v={isEnabled ? s.verdict : 'deny'} />
              <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{isEnabled ? s.verdict_basis : 'sandbox_disabled'}</span>
            </span>,
    },
  ];

  return (
    <Screen>
      <Head
        title="Sandbox pool · disposable class"
        sub="Orthogonal to tier. A policy permit is neutral, NOT green. Disposable records hold nothing worth stealing — no Vault creds by construction."
        right={<StatusPill tone={isEnabled ? 'verified' : 'neutral'} glyph={isEnabled ? '●' : '◼'} size="sm">knob: {isEnabled ? 'ENABLED' : 'DISABLED'}</StatusPill>}
      />
      {res.offline && res.error ? <OfflineBanner error={res.error} /> : null}
      {res.status === 'loading' ? (
        <TableSkeleton rows={2} />
      ) : slots.length === 0 ? (
        <EmptyState glyph="◎" title="No sandbox slots">No sandbox slots — Library curation cannot get sandbox evidence until a slot is created (gate-weakening).</EmptyState>
      ) : (
        <DataTable columns={cols} rows={slots} rowKey="host_id" reflow={false} />
      )}

      <div style={{ ...panel, padding: 14, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {isEnabled ? (
          <TighteningAction
            triggerLabel="Disable sandbox pool"
            title="Disable the sandbox pool (kill knob)"
            consequence={<span>Instant, ceremony-free <strong>tightening</strong> — every sandbox verdict becomes <code style={{ ...mono }}>deny(sandbox_disabled)</code>. Engaging safety is the encouraged path.</span>}
            confirmLabel="Disable pool"
            onConfirm={async () => { try { await disableSandboxPool(); } catch { /* offline */ } setEnabled(false); }}
          />
        ) : (
          <WeakeningCeremony
            triggerLabel="Re-enable sandbox pool…"
            title="RE-ENABLE the sandbox pool"
            // Pool re-enable is a sandbox_pool upsert carrying the full new pool
            // frontmatter {enabled, slots:[{host_id}]}.
            proposeInput={{
              target_kind: 'sandbox_pool',
              key: 'pool',
              action: 'upsert',
              frontmatter: { enabled: true, slots: slots.map((s) => ({ host_id: s.host_id })) },
            }}
            consequence="Re-enabling makes every disposable slot permit sandbox_exec again — a gate-weakening edit toward more execution."
            fixturePropose={{
              ...FIXTURE_PROPOSE,
              expected_intent: 'WEAKEN pool',
              edit_kind: 'sandbox_pool_enable',
              typed_diff: { target_kind: 'sandbox_pool', key: 'pool', action: 'upsert', before: { enabled: false }, after: { enabled: true }, reasons: ['sandbox pool re-enabled'] },
              blast_radius: { cells_made_auto: slots.map((s) => ({ host: s.host_id, action_class: 'sandbox_exec', before: 'deny', after: 'permit' })), hosts_gain_coverage: 0, full_shadow_warnings: [] },
            }}
            confirmLabel="Re-enable pool"
            onDone={() => setEnabled(true)}
          />
        )}
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>
          Disabling is instant tightening. Re-enabling and creating a slot are gate-weakening (→ ceremony).
        </span>
      </div>

      <PrintedAbsence glyph="⛊" tag="not a kill-switch">
        <strong>This is the policy-plane stop, not the suite kill.</strong> The global kill switch covers sandbox exec at the
        Gateway chokepoint (killswitch-chain §5); this knob deep-links to MC for the global halt.
      </PrintedAbsence>
    </Screen>
  );
}
