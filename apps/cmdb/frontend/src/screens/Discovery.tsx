import { DataTable, EmptyState, StatusPill, TierBadge } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { WeakeningCeremony } from '../components/PolicyCeremony';
import { mono, panel } from '../components/cmparts';
import { Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { listDiscovered, getWazuhSyncStatus } from '../lib/api';
import { FIXTURE_DISCOVERED, FIXTURE_PROPOSE, FIXTURE_WAZUH_SYNC } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { DiscoveredAgent } from '../lib/types';

/* 5.8 Wazuh sync / reconcile + discovery queue. Sync status (top): a sync
   failure renders the mirror ▲ STALE ("verdicts unaffected") — Pattern D at the
   mirror level, NOT a red console error. Discovery queue (bottom): agents Wazuh
   reports with no host record yet. Every reported field is host-originated
   (UNTRUSTED). Bind / new-host_id / rebind = gate-weakening (→ ceremony). */
/* Suggested host_id for a bind: the reported name (host-originated / untrusted,
   so sanitized to a safe slug) if usable, else a stable id from the agent id.
   The operator confirms the mint explicitly via the ceremony. */
function boundHostId(d: DiscoveredAgent): string {
  const name = (d.reported_name ?? '').trim().toLowerCase();
  const slug = name.replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  return slug && slug !== '??' ? slug : `host-${d.wazuh_agent_id}`;
}

export function Discovery() {
  const sync = useResource(() => getWazuhSyncStatus(), FIXTURE_WAZUH_SYNC);
  const q = useResource(() => listDiscovered().then((r) => r.agents), FIXTURE_DISCOVERED);
  const agents = q.data ?? [];
  const s = sync.data;
  const mirrorStale = (s && (s.stale || !s.ok)) || (sync.offline && !!sync.error?.isDependency);

  const cols: DataColumn<DiscoveredAgent>[] = [
    { key: 'wazuh_agent_id', header: 'wazuh agent_id', render: (d) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{d.wazuh_agent_id}</span> },
    { key: 'reported_name', header: 'reported name', render: (d) => <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={{ ...mono, fontSize: 12 }}>"{d.reported_name ?? '??'}"</span><TierBadge tier="untrusted" label="host-originated · UNTRUSTED" /></span> },
    { key: 'reported_os', header: 'os', render: (d) => <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}><span style={mono}>{d.reported_os ?? 'unknown'}</span>{d.reported_os && d.reported_os !== 'unknown' ? <TierBadge tier="untrusted" label="host-originated" /> : null}</span> },
    { key: 'group_suggestion', header: 'group (advisory)', render: (d) => d.group_suggestion ? <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{d.group_suggestion} <span style={{ opacity: 0.7 }}>~ heuristic</span></span> : <span style={{ color: 'var(--text-disabled)' }}>—</span> },
    {
      key: 'action', header: 'action',
      render: (d) => (
        <WeakeningCeremony
          triggerLabel="bind…"
          triggerTone="danger-outline"
          triggerSize="compact"
          triggerGlyph="⚠"
          title={`BIND · wazuh agent ${d.wazuh_agent_id}`}
          // A bind is gate-weakening: it CREATES the host record at the unpolicied
          // (always-deny) sentinel, carrying the wazuh.agent_id mapping. Routes
          // through the ceremony as a host upsert (there is no benign bind endpoint).
          proposeInput={{
            target_kind: 'host',
            key: boundHostId(d),
            action: 'upsert',
            frontmatter: {
              // NOTE: `tier` is OMITTED on purpose — `unpolicied` is a synthetic
              // sentinel, not a real tier value the backend accepts. A host with
              // no tier IS the unpolicied sentinel (always-deny(no_policy) until
              // the operator tiers it via a later ceremony).
              host_id: boundHostId(d),
              class: 'managed',
              overrides: [],
              snapshot_capability: null,
              windows: [],
              wazuh: { agent_id: d.wazuh_agent_id },
            },
          }}
          consequence="Binding mints/attaches a host_id on explicit operator confirm; the new host lands at the unpolicied sentinel and fires needs_tiering → Board. Reported name/group are attacker-influenceable at enrollment."
          fixturePropose={{
            ...FIXTURE_PROPOSE,
            expected_intent: `WEAKEN ${boundHostId(d)}`,
            edit_kind: 'wazuh_bind',
            typed_diff: { target_kind: 'host', key: boundHostId(d), action: 'upsert', before: null, after: { host_id: boundHostId(d), wazuh: { agent_id: d.wazuh_agent_id } }, reasons: ['new host record created (unpolicied sentinel — no tier)'] },
            blast_radius: { cells_made_auto: [], hosts_gain_coverage: 1, full_shadow_warnings: ['new host starts at unpolicied (always-deny) — no cell becomes auto'] },
          }}
          confirmLabel="Bind agent"
        />
      ),
    },
  ];

  return (
    <Screen>
      <Head title="Wazuh sync · discovery" sub="Reported names/groups are ATTACKER-INFLUENCEABLE at enrollment (ARCHITECTURE §12). Group membership is a UI-only tiering suggestion, never auto-applied. Every bind/rebind is a change-logged, gate-weakening event." />
      {/* Sync status — a Wazuh outage is a mirror STALE band, never a red error. */}
      <div style={{ ...panel, padding: 12, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>account: {(s?.scopes ?? []).join(' ')} · v{s?.version ?? '—'}</span>
        <span style={{ flex: 1 }} />
        {mirrorStale ? (
          <StatusPill tone="attention" glyph="▲" size="sm">MIRROR STALE · verdicts unaffected</StatusPill>
        ) : (
          <StatusPill tone="verified" glyph="●" size="sm">OK · last poll ⟳ {s?.last_poll ?? '—'}</StatusPill>
        )}
      </div>
      {q.offline && q.error ? <OfflineBanner error={q.error} /> : null}
      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>Discovery queue · {agents.length} unbound</div>
      {q.status === 'loading' ? (
        <TableSkeleton rows={3} />
      ) : agents.length === 0 ? (
        <EmptyState glyph="⊹" title="No unbound agents">No unbound agents — inventory matches Wazuh.</EmptyState>
      ) : (
        <DataTable columns={cols} rows={agents} rowKey="wazuh_agent_id" reflow={false} />
      )}
    </Screen>
  );
}
