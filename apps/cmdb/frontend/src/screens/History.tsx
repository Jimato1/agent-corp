import { Button, DataTable, EmptyState, PrincipalRef, StatusPill, TicketRef } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { mono, panel } from '../components/cmparts';
import { Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { getPolicyChangeLog } from '../lib/api';
import { FIXTURE_HISTORY } from '../lib/fixtures';
import { useResource } from '../state/CmdbProvider';
import type { PolicyChangeRow } from '../lib/types';

/* 5.11 Policy-change history — the hash-chained policy_change_log rendered as an
   append-only audit table. Carries the CMDB-specific OUT-OF-BAND `git log`
   verification banner: this console can lie; the git REMOTE cannot. Chain-verify
   follows the §4.9 rule exactly — stale/unverifiable → halt-gold CANNOT CONFIRM,
   a real break → danger CHAIN BROKEN, NEVER a fabricated green. Read-only always. */
export function History() {
  const res = useResource(() => getPolicyChangeLog(), FIXTURE_HISTORY);
  const log = res.data;
  const rows = log?.rows ?? [];
  const chain = log?.chain_state ?? 'intact';
  const remoteOk = log?.local_head_on_remote ?? true;
  const degraded = res.offline && !!res.error?.isDependency;

  const cols: DataColumn<PolicyChangeRow>[] = [
    { key: 'ts', header: 'ts', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.ts}</span> },
    { key: 'who', header: 'who', render: (r) => <PrincipalRef kind={r.who_kind ?? 'operator'} id={r.who} /> },
    { key: 'edit_kind', header: 'edit_kind', render: (r) => <code style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.edit_kind}</code> },
    { key: 'target', header: 'target', render: (r) => <TicketRef id={r.target} /> },
    { key: 'weakening', header: 'weakening', render: (r) => (r.weakening ? <StatusPill tone="danger" glyph="⚠" size="sm">YES</StatusPill> : <StatusPill tone="neutral" size="sm">tighten</StatusPill>) },
    { key: 'diff_hash', header: 'diff_hash', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.diff_hash}</span> },
    { key: 'git_commit', header: 'git_commit', render: (r) => <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{r.git_commit}</span> },
    { key: 'ok', header: 'ok', render: (r) => (r.ok ? '✔' : '✕') },
  ];

  return (
    <Screen>
      <Head title="Policy-change history" sub="Hash-chained policy_change_log, append-only. This console can lie; the git remote cannot." right={<Button tone="secondary" size="compact">chain-verify</Button>} />

      {/* The out-of-band verification banner — the CMDB-specific §7.2 obligation. */}
      {degraded ? (
        <div style={{ ...panel, padding: 12, borderColor: 'var(--halt-gold-edge)', background: 'var(--halt-gold-wash)', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--halt-gold-ink)' }}>
          ⛊ CANNOT CONFIRM local HEAD is on remote — git/remote unreachable; degraded. Further weakening edits are refused
          until confirmed. (Pattern D — the safety system working, not a red error.)
        </div>
      ) : (
        <div style={{ ...panel, padding: 12, borderColor: '#5A4A1E', background: 'var(--state-amber-wash)', fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--state-amber-ink)' }}>
          ⚠ VERIFY OUT-OF-BAND: this console can lie. Confirm the chain by reading <code style={{ ...mono }}>git log</code> on the
          configured REMOTE, not here. Remote: <code style={{ ...mono }}>{log?.remote ?? 'git@…/cmdb_policy.git'}</code> ·{' '}
          {remoteOk ? 'local HEAD present on remote ✔' : 'local HEAD NOT on remote ✕'}
        </div>
      )}

      {/* chain-verify — §4.9: never a fabricated green. */}
      <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>
        chain-verify:{' '}
        {chain === 'broken' ? (
          <StatusPill tone="danger" glyph="✕" size="sm">CHAIN BROKEN</StatusPill>
        ) : chain === 'cannot_confirm' || degraded ? (
          <StatusPill tone="halt" glyph="⛊" size="sm">CANNOT CONFIRM CHAIN</StatusPill>
        ) : (
          <StatusPill tone="verified" glyph="✔" size="sm">CHAIN INTACT (local)</StatusPill>
        )}
      </div>

      {log?.head_behind_tip ? (
        <div style={{ ...mono, fontSize: 12, color: 'var(--halt-gold-ink)' }}>▲ Restored-older policy_version: HEAD &lt; chain tip — shown here and on every verdict (boot-integrity).</div>
      ) : null}

      {res.offline && res.error && !degraded ? <OfflineBanner error={res.error} /> : null}
      {res.status === 'loading' ? (
        <TableSkeleton rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState glyph="⟲" title="No policy changes yet">No policy changes yet.</EmptyState>
      ) : (
        <DataTable columns={cols} rows={rows} rowKey="seq" reflow={false} />
      )}
    </Screen>
  );
}
