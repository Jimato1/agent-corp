import { DataTable, EmptyState, StatusPill } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { mono } from '../components/cmparts';
import { Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { listCatalog } from '../lib/api';
import { FIXTURE_CATALOG } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { CatalogRow } from '../lib/types';

/* 5.6 Runbook-catalog policy attributes — policy attributes only (the Gateway
   owns implementations). A cell can go auto only while a catalog entry exists
   with rollback_declared: true — so entry creation / action_class rebinding / a
   rollback_declared false→true flip is gate-relevant → ceremony (the §13-C find). */
export function Catalog() {
  const res = useResource(() => listCatalog(), FIXTURE_CATALOG);
  const rows = res.data ?? [];

  const cols: DataColumn<CatalogRow>[] = [
    { key: 'playbook_key', header: 'playbook', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{c.playbook_key}</span> },
    { key: 'action_class', header: 'action_class', render: (c) => <StatusPill tone="neutral" size="sm">{c.action_class}</StatusPill> },
    { key: 'risk_class', header: 'risk_class', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{c.risk_class}</span> },
    { key: 'applicable_tiers', header: 'applicable_tiers', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{c.applicable_tiers}</span> },
    {
      key: 'rollback_declared', header: 'rollback_declared',
      render: (c) => c.rollback_declared
        ? <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>✔ {c.rollback_method}</span>
        : <span style={{ ...mono, fontSize: 12, color: 'var(--text-disabled)' }}>— {c.rollback_method}</span>,
    },
    { key: 'duration_estimate_s', header: 'duration_s', align: 'right', render: (c) => <span style={mono}>{c.duration_estimate_s ?? '—'}</span> },
    { key: 'sandbox_eligible', header: 'sandbox_eligible', render: (c) => (c.sandbox_eligible ? '✔' : '—') },
  ];

  return (
    <Screen>
      <Head title="Runbook-catalog policy attributes" sub="Policy attributes only (implementations are the Gateway's, read-only here). A cell can go auto only while rollback_declared: true — so a rollback flip is gate-relevant → ceremony (BlastRadiusPreview shows which cells flip auto-eligible)." />
      {res.offline && res.error ? <OfflineBanner error={res.error} /> : null}
      {res.status === 'loading' ? (
        <TableSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState glyph="▦" title="No playbook policy attributes">No playbook policy attributes — every class stays ask/manual until authored.</EmptyState>
      ) : (
        <DataTable columns={cols} rows={rows} rowKey="playbook_key" reflow={false} />
      )}
    </Screen>
  );
}
