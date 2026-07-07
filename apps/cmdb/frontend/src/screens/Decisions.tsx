import { useMemo, useState } from 'react';
import { DataTable, EmptyState, Input, TicketRef } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { VerdictOutcome, mono } from '../components/cmparts';
import { AsOf, Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { getDecisionLog } from '../lib/api';
import { FIXTURE_DECISIONS } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { DecisionRow } from '../lib/types';

/* 5.12 Decision-log browser — the canonical append-only decision_log (every
   issued verdict, binding + advisory), filterable by host_id / action_class /
   verdict / policy_version. Answers "what did the CMDB actually decide, and
   against which policy version." Outcome tokens are never green. */
export function Decisions() {
  const res = useResource(() => getDecisionLog(), FIXTURE_DECISIONS);
  const [q, setQ] = useState('');
  const all = res.data?.rows ?? [];

  const rows = useMemo(
    () => (q ? all.filter((r) => `${r.host_id} ${r.action_class} ${r.verdict} ${r.policy_version}`.toLowerCase().includes(q.toLowerCase())) : all),
    [all, q],
  );

  const cols: DataColumn<DecisionRow>[] = [
    { key: 'evaluated_at', header: 'evaluated_at', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.evaluated_at}</span> },
    { key: 'aud', header: 'aud', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.aud}</span> },
    { key: 'host_id', header: 'host_id', render: (r) => <TicketRef id={r.host_id} /> },
    { key: 'action_class', header: 'action_class', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.action_class}</span> },
    { key: 'verdict', header: 'verdict', render: (r) => <VerdictOutcome v={r.verdict} /> },
    { key: 'decision_id', header: 'decision_id', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.decision_id}</span> },
    { key: 'policy_version', header: 'policy_version', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.policy_version}</span> },
    { key: 'verdict_basis', header: 'verdict_basis', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.verdict_basis}</span> },
  ];

  return (
    <Screen>
      <Head
        title="Decision-log browser"
        sub="Canonical append-only decision_log — every issued verdict, binding + advisory. Outcome tokens are never green (green = external verification)."
        right={<div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}><Input label="filter" icon="/" placeholder="host / class / verdict…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 240 }} /><AsOf age={res.data?.as_of} stale={res.offline && res.error?.isDependency} /></div>}
      />
      {res.offline && res.error ? <OfflineBanner error={res.error} /> : null}
      {res.status === 'loading' ? (
        <TableSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState glyph="⊞" title="No decisions logged yet">No decisions logged yet — no verdict has been issued.</EmptyState>
      ) : (
        <DataTable columns={cols} rows={rows} rowKey="decision_id" reflow={false} />
      )}
    </Screen>
  );
}
