import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { DataTable, EmptyState, Input, ReviewChip, StatusPill } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { CriticalityTier, WindowPill, mono } from '../components/cmparts';
import { AsOf, OfflineBanner, Screen, TableSkeleton, Head } from './common';
import { listFleet } from '../lib/api';
import { FIXTURE_FLEET } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { HostRow } from '../lib/types';
import type { Nav } from './nav';

/* 5.1 Fleet list — the inventory truth-surface. DataTable, mono host_id.
   disposable rows are flagged + collapsed out of managed queries by default. */
export function Fleet({ nav }: { nav: Nav }) {
  const res = useResource(() => listFleet(), FIXTURE_FLEET);
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('');
  const [showDisposable, setShowDisposable] = useState(false);

  const all = res.data?.hosts ?? [];
  const disposableCount = all.filter((h) => h.class === 'disposable').length;

  const rows = useMemo(() => {
    return all.filter((h) => {
      if (h.class === 'disposable' && !showDisposable) return false;
      if (tier && (h.criticality ?? '') !== tier) return false;
      if (q && !h.host_id.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [all, q, tier, showDisposable]);

  const cols: DataColumn<HostRow>[] = [
    { key: 'host_id', header: 'host_id', render: (h) => <button onClick={() => nav.openHost(h.host_id)} style={{ all: 'unset', cursor: 'pointer' }}><span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)', borderBottom: '1px dotted var(--border-strong)' }}>[ {h.host_id} ]</span></button> },
    { key: 'criticality', header: 'criticality', render: (h) => <CriticalityTier tier={h.criticality} /> },
    { key: 'class', header: 'class', render: (h) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{h.class === 'disposable' ? '⚙ disposable' : 'managed'}</span> },
    { key: 'window_state', header: 'window-state', render: (h) => <WindowPill state={h.window_state} detail={h.window_detail} /> },
    { key: 'mode', header: 'mode', render: (h) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{h.mode ?? '—'}</span> },
    {
      key: 'wazuh', header: 'Wazuh',
      render: (h) =>
        h.wazuh_state === 'not_enrolled'
          ? <span style={{ ...mono, fontSize: 11, color: 'var(--text-disabled)' }}>— not enrolled</span>
          : <span title={h.wazuh_state === 'stale' ? 'verdicts unaffected — policy is CMDB\'s own fact' : undefined} style={{ ...mono, fontSize: 11, color: h.wazuh_state === 'stale' ? 'var(--state-amber-ink)' : 'var(--text-muted)' }}>{h.wazuh_state === 'stale' ? '▲' : '●'} {h.wazuh_state?.toUpperCase()} {h.wazuh_age ? `⟳ ${h.wazuh_age}` : ''}</span>,
    },
    {
      key: 'lifecycle', header: 'lifecycle',
      render: (h) =>
        h.lifecycle === 'needs_tiering'
          ? <ReviewChip state="escalated" reason="needs_tiering → Board" href="#" />
          : h.lifecycle === 'stale'
            ? <StatusPill tone="attention" glyph="▲" size="sm">stale</StatusPill>
            : <StatusPill tone="verified" glyph="●" size="sm">active</StatusPill>,
    },
  ];

  const filterBar = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)' }}>tier</span>
        <select value={tier} onChange={(e) => setTier(e.target.value)} style={selStyle}>
          <option value="">all</option><option value="tier0">tier0</option><option value="tier1">tier1</option>
          <option value="tier2">tier2</option><option value="tier3">tier3</option><option value="unpolicied">unpolicied</option>
        </select>
      </label>
      <Input label="filter" icon="/" placeholder="host_id…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 220 }} />
      <AsOf age={res.data?.as_of} stale={res.offline && res.error?.isDependency} />
    </div>
  );

  return (
    <Screen>
      <Head
        title={`Fleet · ${res.data?.total ?? all.length} hosts`}
        sub="The inventory truth-surface. criticality is the CriticalityTier chip (not a provenance TierBadge); a policy permit is never green; a missing/stale fact is a deny (fail-closed), not a red error."
        right={filterBar}
      />
      {res.offline && res.error ? <OfflineBanner error={res.error} /> : null}
      {res.status === 'loading' ? (
        <TableSkeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState glyph="◔" title="No hosts match" action={undefined}>
          No hosts yet (for this filter). Bind a discovered agent (Discovery) or author a non-agent asset.
        </EmptyState>
      ) : (
        <DataTable columns={cols} rows={rows} rowKey="host_id" onRowClick={(h) => nav.openHost(h.host_id)} reflow={false} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, ...mono, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>disposable pool shown collapsed by default</span>
        {disposableCount > 0 ? (
          <button onClick={() => setShowDisposable((v) => !v)} style={{ ...linkBtn }}>{showDisposable ? `hide ${disposableCount} disposable` : `show ${disposableCount} disposable`}</button>
        ) : null}
        <span style={{ marginLeft: 'auto' }}>*sandbox_exec carve-out only</span>
      </div>
    </Screen>
  );
}

const selStyle: CSSProperties = {
  height: 32, padding: '0 8px', background: 'var(--surface-inset)', color: 'var(--text-primary)',
  border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-control)',
  fontFamily: 'var(--font-mono)', fontSize: 12,
};
const linkBtn: CSSProperties = {
  background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 4,
  padding: '2px 8px', cursor: 'pointer', color: 'var(--signal-cyan)', fontFamily: 'var(--font-mono)', fontSize: 11,
};
