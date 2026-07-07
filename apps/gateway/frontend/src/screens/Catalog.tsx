import { useState } from 'react';
import type { CSSProperties } from 'react';
import { DangerAction, DataTable, EmptyState, ErrorState, PrintedAbsence, StatusPill } from '../components/ds';
import type { DataColumn } from '../components/ds';
import { Section, mono } from '../components/gwparts';
import { Head, LocalError, OfflineBanner, SafeStoppedBand, Screen, TableSkeleton } from './common';
import { getCatalog, promoteCatalog } from '../lib/api';
import { FIXTURE_CATALOG } from '../lib/fixtures';
import { useGateway, useResource } from '../state/GatewayProvider';
import type { CatalogRow } from '../lib/types';

/* S5 — Catalog registry (UI_SPEC §8). Review the Gateway-owned playbook registry
   (versions, content_sha256, sigs, class, rollback) and perform operator-vetted
   change control — the SINGLE human write this app has. Catalog writes are
   DangerAction §4.7 + ConfirmFriction §5.1 full-variant step-up, diff-hash-bound,
   audit-chained (policy-plane change control, ARCH §12). There is NO MCP path. */
export function Catalog() {
  const { posture } = useGateway();
  const res = useResource(() => getCatalog(), FIXTURE_CATALOG);
  const [promoted, setPromoted] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  const data = res.data ?? FIXTURE_CATALOG;
  const degraded = data.degraded || (res.offline && res.error?.isDependency);
  const active = data.rows.filter((r) => r.status === 'active');
  const pending = data.rows.find((r) => r.status === 'pending');

  const cols: DataColumn<CatalogRow>[] = [
    { key: 'playbook_key', header: 'key', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{c.playbook_key}</span> },
    { key: 'version', header: 'ver', mono: true, render: (c) => <span style={{ color: 'var(--text-secondary)' }}>{c.version}</span> },
    { key: 'content_sha256', header: 'content_sha256', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{c.content_sha256}</span> },
    { key: 'action_class', header: 'class', render: (c) => <StatusPill tone="neutral" size="sm">{c.action_class}</StatusPill> },
    { key: 'rollback', header: 'rollback', render: (c) => <span style={{ ...mono, fontSize: 12, color: c.rollback === 'none' || c.rollback === 'n/a' ? 'var(--text-disabled)' : 'var(--text-secondary)' }}>{c.rollback}</span> },
    { key: 'status', header: 'status', render: (c) => <StatusPill tone={c.status === 'active' ? 'verified' : 'attention'} glyph={c.status === 'active' ? '●' : '⧗'} size="sm">{c.status}</StatusPill> },
    { key: 'sig', header: 'sig', render: (c) => <span style={{ ...mono, fontSize: 12, color: 'var(--state-green-ink)' }}>✔ {c.sig}</span> },
  ];

  return (
    <Screen>
      <Head
        crumb={`${active.length} active${pending ? ' · 1 pending change' : ''}`}
        title="Playbook catalog"
        sub="The Gateway-owned playbook registry (admin-authored, hashed, signed). Reviewing is read-only; the one write is operator-vetted change control — step-up, diff-hash-bound, audit-chained."
      />

      {res.offline && res.error?.isDependency ? (
        <OfflineBanner error={res.error} noun="catalog" />
      ) : res.offline && res.error ? (
        <LocalError error={res.error} title="Couldn't load the catalog — retry" />
      ) : null}

      {promoted ? <div style={okBanner}>✔ Promoted — {promoted}. A tamper-evident audit row was written (visible next in Audit).</div> : null}
      {failed ? (
        <ErrorState pattern="R" title="Promotion didn't apply" detail="promote_rejected">{failed}</ErrorState>
      ) : null}

      {res.status === 'loading' ? (
        <TableSkeleton rows={5} />
      ) : data.rows.length === 0 ? (
        <EmptyState glyph="▦" title="No playbooks registered">A playbook is admin-authored, hashed, signed, and promoted here before any plan can name it. (bootstrap only)</EmptyState>
      ) : (
        <DataTable columns={cols} rows={active} rowKey="playbook_key" reflow={false} />
      )}

      {pending ? (
        <Section title="Pending operator-vetted change" tone="danger">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ ...mono, fontSize: 13, color: 'var(--text-primary)' }}>{pending.playbook_key} {pending.from_version} → {pending.version}▲</span>
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{pending.content_sha256}</span>
            <StatusPill tone="attention" glyph="⧗" size="sm">PENDING</StatusPill>
            <span style={{ flex: 1 }} />
            {degraded ? (
              <PrintedAbsence glyph="⛊" tag="safe-stopped" why="Change control is unavailable while the catalog store is safe-stopped — rendered as a printed fact, not a greyed button implying latent capability.">
                <strong>Change control unavailable</strong> while the catalog store is safe-stopped.
              </PrintedAbsence>
            ) : (
              <DangerAction
                label="Review & apply change →"
                glyph="⚠"
                variant="solid"
                intensity="full"
                direction="more"
                irreversible
                stepUp
                typedIntent={`promote ${pending.playbook_key} ${pending.version}`}
                blastRadius={`${pending.blast_hosts ?? 0} hosts have ${pending.playbook_key} in an open allowlist`}
                honest={{ confirmed: posture.confirmed, pending: posture.pending, draining: posture.draining }}
                confirmLabel="Promote entry"
                auditNote={`diff-hash bound: confirming sha256 ${pending.content_sha256} — a tamper-evident row is written`}
                consequence={
                  <>
                    This registers new executable content in the Gateway catalog. Direction: <strong>MORE real-world action</strong> —
                    any approved plan naming <strong>{pending.playbook_key}</strong> will run THIS content on real hosts. Irreversible
                    for runs already dispatched. You are confirming <strong>sha256 {pending.content_sha256}</strong> (the exact diff).
                  </>
                }
                onConfirm={async () => {
                  setFailed(null);
                  try {
                    await promoteCatalog({ playbook_key: pending.playbook_key, to_version: pending.version, content_sha256: pending.content_sha256, typed_intent: `promote ${pending.playbook_key} ${pending.version}` });
                    setPromoted(`${pending.playbook_key} ${pending.from_version} → ${pending.version}`);
                  } catch (e) {
                    // A local (4xx) validation / sig-mismatch / stale-diff-hash is
                    // the operator's recoverable problem — Pattern R, not a halt.
                    setPromoted(null);
                    setFailed(e instanceof Error ? e.message : 'The catalog store rejected the promotion (validation, sig mismatch, or stale diff-hash). Fix and retry.');
                  }
                }}
              />
            )}
          </div>
        </Section>
      ) : null}

      {degraded && !pending ? <SafeStoppedBand reason="catalog store unreachable" /> : null}

      <PrintedAbsence glyph="🔒" tag="operator-only" why="Catalog writes are an operator-only, step-up gate; the agent surface exposes only execute_approved_plan.">
        <strong>Agents cannot write the catalog by any path.</strong> There is no MCP tool for catalog change — this is an
        operator-only, step-up gate.
      </PrintedAbsence>
    </Screen>
  );
}

const okBanner: CSSProperties = {
  fontFamily: 'var(--font-ui)', fontSize: 13, color: 'var(--state-green-ink)',
  background: 'var(--state-green-wash)', border: '1px solid #1E5140', borderRadius: 6, padding: '8px 12px',
};
