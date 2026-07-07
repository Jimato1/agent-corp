import { DataTable, EmptyState, StatusPill } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { mono } from '../components/cmparts';
import { Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { listTaskTypes } from '../lib/api';
import { FIXTURE_TASK_TYPES } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { TaskTypeRow } from '../lib/types';

/* 5.5 Task-type registry — Board triage + the auth PDP read this, so a
   reclassification toward reversible/less-destructive, verifier unbinding, or a
   permissive-attribute creation is a gate-weakening edit (→ ceremony). */
export function Tasks() {
  const res = useResource(() => listTaskTypes(), FIXTURE_TASK_TYPES);
  const rows = res.data ?? [];

  const cols: DataColumn<TaskTypeRow>[] = [
    { key: 'type_key', header: 'type_key', render: (t) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{t.type_key}</span> },
    { key: 'destructive', header: 'destructive', render: (t) => (t.destructive ? '✔' : '—') },
    { key: 'reversible', header: 'reversible', render: (t) => (t.reversible ? '✔' : '—') },
    { key: 'action_class', header: 'action_class', render: (t) => <StatusPill tone="neutral" size="sm">{t.action_class}</StatusPill> },
    { key: 'external_verifier', header: 'external_verifier', render: (t) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{t.external_verifier ?? '—'}</span> },
    { key: 'verification_window_s', header: 'verification_window_s', align: 'right', render: (t) => <span style={mono}>{t.verification_window_s ?? '—'}</span> },
  ];

  return (
    <Screen>
      <Head title="Task-type registry" sub="Consumers (Board triage, auth PDP) read this — a reclassification toward reversible/less-destructive is gate-weakening → ceremony. external_verifier values render as plain labels." />
      {res.offline && res.error ? <OfflineBanner error={res.error} /> : null}
      {res.status === 'loading' ? (
        <TableSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState glyph="☰" title="No task types registered">No task types registered — Board triage falls back to catalog-novelty. Add one.</EmptyState>
      ) : (
        <DataTable columns={cols} rows={rows} rowKey="type_key" reflow={false} />
      )}
    </Screen>
  );
}
