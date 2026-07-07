import { DataTable } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { CriticalityTier, mono } from '../components/cmparts';
import { Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { listTiers } from '../lib/api';
import { FIXTURE_TIERS } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { TierRow } from '../lib/types';

/* 5.4 Tier catalog — the four tiers + the read-only `unpolicied` sentinel row.
   The destructive-never-auto floor cells render locked 🔒 floor (printed fact,
   §4.7), not a disabled toggle; a floor-shrink is rejected outright. */
export function Tiers() {
  const res = useResource(() => listTiers(), FIXTURE_TIERS);

  const cols: DataColumn<TierRow>[] = [
    { key: 'tier', header: 'tier', render: (t) => <CriticalityTier tier={t.tier} /> },
    {
      key: 'defaults', header: 'action_class → mode',
      render: (t) => (
        <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
          {t.defaults.map((d, i) => (
            <span key={i}>
              {i > 0 ? ' · ' : ''}
              {d.floor ? <span style={{ color: 'var(--text-muted)' }}>{d.action_class} 🔒 floor</span> : `${d.action_class} ${d.mode}`}
            </span>
          ))}
        </span>
      ),
    },
    { key: 'health_check_timeout_s', header: 'health_check_timeout_s', align: 'right', render: (t) => <span style={mono}>{t.health_check_timeout_s ?? '—'}</span> },
    { key: 'ssh_wait_timeout_s', header: 'ssh_wait_timeout_s', align: 'right', render: (t) => <span style={mono}>{t.ssh_wait_timeout_s ?? '—'}</span> },
  ];

  return (
    <Screen>
      <Head
        title="Tier catalog"
        sub="Editing any default row or timeout opens the ceremony (an ask→auto flip classifies weakening). The destructive-never-auto floor cells are locked 🔒 floor — a printed impossibility; a floor-shrink is rejected outright."
      />
      {res.offline && res.error ? <OfflineBanner error={res.error} /> : null}
      {res.status === 'loading' ? <TableSkeleton rows={5} /> : <DataTable columns={cols} rows={res.data ?? []} rowKey="tier" reflow={false} />}
    </Screen>
  );
}
