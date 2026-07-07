import { useState } from 'react';
import { DataTable, EmptyState, ErrorState, StatusPill, TicketRef } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { mono } from '../components/gwparts';
import { SandboxEvidenceView } from '../components/SandboxEvidenceView';
import { Head, OfflineBanner, Screen, TableSkeleton } from './common';
import { getSandbox, getSandboxRun } from '../lib/api';
import { FIXTURE_SANDBOX, FIXTURE_SANDBOX_EVIDENCE } from '../lib/fixtures';
import { useGateway, useResource } from '../state/GatewayProvider';
import type { SandboxEvidence, SandboxRow } from '../lib/types';

/* S6 — Sandbox runs (UI_SPEC §9). Browse tier-0 sandbox evidence — sandbox
   evidence = external verification for the Library's admission gate. Read-only:
   the Gateway spawns and captures, the operator inspects. NO host parameter
   exists anywhere in this surface (the D-7 non-leak guarantee is visible here). */
export function Sandbox() {
  const { posture } = useGateway();
  const res = useResource(() => getSandbox(), FIXTURE_SANDBOX);
  const [selected, setSelected] = useState<SandboxEvidence | null>(null);

  const data = res.data ?? FIXTURE_SANDBOX;
  const evidence = selected ?? data.selected ?? FIXTURE_SANDBOX_EVIDENCE;
  const frozen = posture.kill_level !== 'G0' || data.frozen;

  const openEvidence = async (row: SandboxRow) => {
    try {
      const ev = await getSandboxRun(row.run_id);
      setSelected(ev);
    } catch {
      // Offline / local failure → fall back to the fixture evidence (keeps the
      // detail inspectable); the row still selects.
      setSelected({ ...FIXTURE_SANDBOX_EVIDENCE, run_id: row.run_id, ticket_id: row.ticket_id, profile: row.profile, exit_code: row.exit_code });
    }
  };

  const cols: DataColumn<SandboxRow>[] = [
    { key: 'run_id', header: 'run', render: (r) => <TicketRef id={r.run_id} truncate /> },
    { key: 'ticket_id', header: 'ticket', render: (r) => <TicketRef id={r.ticket_id} /> },
    { key: 'profile', header: 'profile', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{r.profile}</span> },
    { key: 'exit_code', header: 'exit', render: (r) => <span style={{ ...mono, fontSize: 12, color: r.exit_code === 0 ? 'var(--state-green-ink)' : 'var(--danger-text)' }}>{r.exit_code === 0 ? '✔' : '✕'} {r.exit_code}</span> },
    { key: 'harness_version', header: 'harness', render: (r) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{r.harness_version}</span> },
    { key: 'finished_at', header: 'finished', mono: true, render: (r) => <span style={{ color: 'var(--text-muted)' }}>{r.finished_at}</span> },
    { key: 'view', header: '', render: () => <span style={{ ...mono, fontSize: 12, color: 'var(--signal-cyan)' }}>view →</span> },
  ];

  return (
    <Screen>
      <Head
        crumb={<>harness {data.harness_version}</>}
        title="Sandbox runs (tier-0)"
        sub="Disposable-target evidence: a sandbox test IS an external verifier. Read-only — the Gateway spawns and captures; the operator inspects. No host parameter exists in this surface."
        right={frozen ? <StatusPill tone="halt" glyph="▮▮" size="sm">new runs FROZEN</StatusPill> : <StatusPill tone="verified" glyph="●" size="sm">capturing</StatusPill>}
      />

      {/* Pattern-D: the kill KNOB (CMDB disposable-class set to deny) is a POLICY
          safe-stop, rendered gold ⛊ — NOT a red error. Existing evidence stays
          browsable. This is distinct from the suite kill (which freezes dispatch). */}
      {data.policy_disabled ? (
        <ErrorState pattern="D" title="Sandbox execution disabled by policy (kill knob)" detail="cmdb disposable-class → deny">
          The operator's sandbox kill knob (CMDB §C5) set the disposable class to deny, so new sandbox dispatch is refused. This is
          a policy safe-stop, not an outage — existing evidence below stays fully browsable.
        </ErrorState>
      ) : res.offline && res.error?.isDependency ? (
        <OfflineBanner error={res.error} noun="sandbox evidence" />
      ) : null}

      {res.status === 'loading' ? (
        <TableSkeleton rows={3} />
      ) : data.rows.length === 0 ? (
        <EmptyState glyph="◎" title="No sandbox runs yet">
          Curation-team agents call <code style={{ ...mono }}>run_sandbox_test</code>; each run's transcript and environment
          fingerprint land here as external-verification evidence for the Library.
        </EmptyState>
      ) : (
        <DataTable columns={cols} rows={data.rows} rowKey="run_id" reflow={false} onRowClick={openEvidence} focusedKey={evidence.run_id} />
      )}

      {data.rows.length > 0 ? <SandboxEvidenceView ev={evidence} /> : null}
    </Screen>
  );
}
