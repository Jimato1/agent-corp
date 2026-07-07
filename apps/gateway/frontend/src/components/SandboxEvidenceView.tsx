// components/SandboxEvidenceView.tsx — UI_SPEC §8.3 (app-specific, domain-unique:
// the §7.2 note explicitly allows an "evidence ledger" as domain-unique). The
// tier-0 evidence detail: transcript blob + env_fingerprint + harness_version
// attestation + the input/evidence provenance DUALITY. This cannot be a DataTable
// row — the transcript/fingerprint/attestation layout is Gateway-specific.
//
// The load-bearing idea: sandbox evidence IS an external verifier for the
// Library's admission gate. So the *evidence* is Verified (sandbox-verified /
// gateway-delivered) while its *input* (a note/doc revision) is UNTRUSTED
// (host/externally-originated adversarial content). It COMPOSES TierBadge for
// that split and TicketRef for ids; nothing here re-draws a §4 entity. No host
// parameter exists anywhere in this surface (the D-7 non-leak guarantee).

import type { ReactNode } from 'react';
import { StatusPill, TicketRef, TierBadge } from './ds';
import { eyebrow, mono } from './gwparts';
import type { SandboxEvidence } from '../lib/types';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', width: 132, flex: 'none' }}>{label}</span>
      <span style={{ minWidth: 0 }}>{children}</span>
    </div>
  );
}

export function SandboxEvidenceView({ ev }: { ev: SandboxEvidence }) {
  const pass = ev.exit_code === 0;
  return (
    <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border-default)', flexWrap: 'wrap' }}>
        <span style={{ ...eyebrow }}>Evidence</span>
        <TicketRef id={ev.run_id} truncate />
        <TicketRef id={ev.ticket_id} />
        <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>profile {ev.profile}</span>
        <span style={{ ...mono, fontSize: 12, color: pass ? 'var(--state-green-ink)' : 'var(--danger-text)' }}>exit {pass ? '✔' : '✕'} {ev.exit_code}</span>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Field label="harness_version">
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-primary)' }}>{ev.harness_version}</span>
        </Field>
        <Field label="env">
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{ev.env_fingerprint}</span>
        </Field>

        {/* The provenance DUALITY — the whole point of this view. */}
        <Field label="input_ref">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{ev.input_ref}</span>
            {ev.input_untrusted ? <TierBadge tier="untrusted" label="UNTRUSTED · curation-ingested" /> : <TierBadge tier="single" />}
          </span>
        </Field>
        <Field label="evidence tier">
          <TierBadge tier="verified" label={ev.evidence_label} />
        </Field>
        <Field label="transcript_ref">
          <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>{ev.transcript_ref}</span>
        </Field>

        <div>
          <div style={{ ...eyebrow, marginBottom: 6 }}>transcript</div>
          <pre style={{ ...mono, fontSize: 12, lineHeight: '18px', color: 'var(--text-secondary)', background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 6, padding: 12, margin: 0, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
            {ev.transcript}
          </pre>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusPill tone="neutral" glyph="◎" size="sm">target</StatusPill>
          <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>{ev.target_note}</span>
        </div>
      </div>
    </div>
  );
}

export default SandboxEvidenceView;
