// components/cmparts.tsx — the five CMDB-specific widgets (UI_SPEC §6), ported
// from the Helm CMDB kit's cm-parts.jsx and wired to the typed contract. Each is
// justified in the spec as domain-unique; identity/verdict chips REUSE the shared
// DS components (TicketRef/PrincipalRef/DataTable) — only the domain layout is new.

import type { CSSProperties, ReactNode } from 'react';
import { DataTable, StatusPill } from './ds';
import type { DataColumn } from './ds';
import type {
  BlastRadius,
  CriticalityTierId,
  Mode,
  TraceStep,
  TypedDiff,
  Verdict,
  VerdictTraceResult,
  MaintenanceWindow,
} from '../lib/types';

// Shared inline-style atoms (identical to the kit's eyebrow/mono/panel).
export const eyebrow: CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
export const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
export const panel: CSSProperties = { background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

/* ── CriticalityTier chip ──────────────────────────────────────────────────
   Host-criticality classification (tier0…tier3 + ✦ unpolicied). DELIBERATELY
   NOT a TierBadge: host criticality carries no provenance/verification-
   independence semantics, so borrowing TierBadge's ✔/⧉/◑/⚠ glyphs would
   misrepresent it (UI_SPEC §2, §6.1, §8 flag 1). */
export function CriticalityTier({ tier }: { tier: CriticalityTierId | null | undefined }) {
  if (!tier) return <span style={{ ...mono, fontSize: 11, color: 'var(--text-disabled)' }}>— (no tier)</span>;
  if (tier === 'unpolicied') {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...mono, fontSize: 11, color: 'var(--state-amber-ink)', border: '1px solid #5A4A1E', borderRadius: 4, padding: '1px 6px' }}>
        ✦ unpolicied
      </span>
    );
  }
  const col: Record<Exclude<CriticalityTierId, 'unpolicied'>, string> = {
    tier0: 'var(--danger-text)',
    tier1: 'var(--state-amber-ink)',
    tier2: 'var(--text-secondary)',
    tier3: 'var(--text-muted)',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, ...mono, fontSize: 11, color: col[tier], border: '1px solid var(--border-strong)', borderRadius: 4, padding: '1px 6px' }}>
      ⬢ {tier}
    </span>
  );
}

/* ── VerdictOutcome token ──────────────────────────────────────────────────
   permit / ask / deny. NEVER green — green is reserved for external-verifier
   confirmation, and a policy permit is not a verification (UI_SPEC §2). */
export function VerdictOutcome({ v }: { v: Verdict }) {
  if (v === 'deny') return <span style={{ ...mono, fontSize: 12, color: 'var(--danger-text)', border: '1px solid #5A2420', borderRadius: 3, padding: '0 6px' }}>deny</span>;
  if (v === 'ask') return <span style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)', border: '1px solid #5A4A1E', borderRadius: 3, padding: '0 6px' }}>ask</span>;
  return <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', border: '1px solid var(--border-strong)', borderRadius: 3, padding: '0 6px' }}>permit</span>;
}

/* ── window-state pill ─────────────────────────────────────────────────────
   FREEZE renders --attn amber (❄ FREEZE-ACTIVE), NEVER halt-gold (UI_SPEC §2). */
export function WindowPill({ state, detail }: { state: string; detail?: string | null }) {
  if (state === 'freeze_active') return <StatusPill tone="attention" glyph="❄" size="sm">FREEZE-ACTIVE</StatusPill>;
  if (state === 'in_window') return <StatusPill tone="verified" glyph="●" size="sm">{detail ? `IN-WINDOW ${detail}` : 'IN-WINDOW'}</StatusPill>;
  if (state === 'closed') return <StatusPill tone="neutral" glyph="◼" size="sm">CLOSED</StatusPill>;
  if (state === 'deny_no_policy') return <span style={{ ...mono, fontSize: 11, color: 'var(--danger-text)' }}>◼ deny(no_policy)</span>;
  return <span style={{ ...mono, fontSize: 11, color: 'var(--text-disabled)' }}>— (n/a)</span>;
}

/* ── BlastRadiusPreview ────────────────────────────────────────────────────
   The derived-effect matrix diff that FILLS the §5.1 ConfirmFriction app-specific
   preview slot. It does NOT re-draw the dialog (the dialog IS ConfirmFriction);
   it names the exact (host × action_class) cells becoming auto-executable and the
   diff_hash the confirm token binds to (UI_SPEC §5.3, §6.1). */
function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  return JSON.stringify(v);
}

/** Compute the changed keys between the propose typed_diff's before/after
 *  frontmatter objects (a before/after object diff, not a removed/added list). */
function changedRows(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  const keys = Array.from(new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})])).sort();
  return keys
    .map((k) => ({ k, b: fmtVal(before?.[k]), a: fmtVal(after?.[k]) }))
    .filter((r) => r.b !== r.a);
}

export function BlastRadiusPreview({
  blast,
  diff,
  diffHash,
}: {
  blast: BlastRadius;
  diff: TypedDiff;
  diffHash: string;
}) {
  const cells = blast.cells_made_auto;
  const rows = changedRows(diff.before, diff.after);
  return (
    <div style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 6, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...eyebrow, color: 'var(--danger-text)' }}>Blast radius</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-secondary)' }}>
        This edit makes <b style={{ color: 'var(--text-primary)' }}>{cells.length}</b> (host × action_class) cells auto-executable
        {' · '}<b style={{ color: 'var(--text-primary)' }}>{blast.hosts_gain_coverage}</b> host{blast.hosts_gain_coverage === 1 ? '' : 's'} gain window coverage
        {' · '}full-shadow warnings: {blast.full_shadow_warnings.length ? blast.full_shadow_warnings.join('; ') : 'none'}
      </div>
      <div style={{ ...mono, fontSize: 11, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {cells.map((c, i) => (
          <div key={i} style={{ color: 'var(--text-secondary)' }}>
            {c.host} · {c.action_class} · <span style={{ color: 'var(--text-muted)' }}>{c.before}</span> → <span style={{ color: 'var(--state-amber-ink)' }}>{c.after}</span>
          </div>
        ))}
      </div>
      <div style={{ ...mono, fontSize: 11, borderTop: '1px solid var(--border-strong)', paddingTop: 6 }}>
        <div style={{ ...eyebrow, color: 'var(--text-muted)', marginBottom: 2 }}>{diff.target_kind}:{diff.key} · {diff.action}</div>
        {rows.length === 0 ? (
          <div style={{ color: 'var(--text-muted)' }}>(no scalar frontmatter fields changed)</div>
        ) : (
          rows.map((r, i) => (
            <div key={i}>
              <span style={{ color: 'var(--text-muted)' }}>{r.k}: </span>
              <span style={{ color: 'var(--danger-text)' }}>{r.b}</span>
              {' → '}
              <span style={{ color: 'var(--state-green-ink)' }}>{r.a}</span>
            </div>
          ))
        )}
        {diff.reasons.map((d, i) => <div key={`why${i}`} style={{ color: 'var(--state-amber-ink)' }}>· {d}</div>)}
        <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>diff_hash: {diffHash} (confirm binds here)</div>
      </div>
    </div>
  );
}

/* ── VerdictTrace ──────────────────────────────────────────────────────────
   The arbitrary-`at` decision-path explainer: preconditions → class fork →
   window / deny-overrides lattice → effective_close/grace → reason[] enum codes
   (never host-originated free text). A domain-unique PDP "why" visualization
   (UI_SPEC §5.9, §6.1). */
function TraceLine({ s }: { s: TraceStep }) {
  const glyph = s.note ? '▸' : s.ok ? '✔' : '✕';
  const gcol = s.note ? 'var(--text-muted)' : s.ok ? 'var(--state-green)' : 'var(--danger-red)';
  return (
    <div style={{ paddingLeft: s.note ? 12 : 0, color: s.note ? 'var(--text-muted)' : 'var(--text-secondary)' }}>
      <span style={{ color: gcol }} aria-hidden="true">{glyph}</span>{' '}
      {s.label}
      {s.detail ? <span style={{ color: 'var(--text-muted)' }}> · {s.detail}</span> : null}
    </div>
  );
}

export function VerdictTrace({ result }: { result: VerdictTraceResult }) {
  return (
    <div style={{ ...panel, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={eyebrow}>Result</span>
        <VerdictOutcome v={result.verdict} />
        <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>← outcome token, NOT green</span>
      </div>
      <div style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)', lineHeight: '20px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ color: 'var(--text-muted)' }}>decision path (universal preconditions → class fork → window → mode):</div>
        {result.steps.map((s, i) => <TraceLine key={i} s={s} />)}
        {result.effective_close ? (
          <div style={{ paddingLeft: 12, color: 'var(--text-muted)' }}>→ effective_close = {result.effective_close}</div>
        ) : null}
        <div style={{ marginTop: 4 }}>
          reason[]: [ {result.reason.map((r, i) => <span key={i} style={{ color: 'var(--danger-text)' }}>{r}{i < result.reason.length - 1 ? ', ' : ''}</span>)} ]
          <span style={{ color: 'var(--text-muted)' }}> (CMDB-authored enum codes, never host free-text)</span>
        </div>
      </div>
      <div style={{ ...mono, fontSize: 11, color: 'var(--text-muted)', borderTop: '1px solid var(--border-default)', paddingTop: 8 }}>
        policy_version {result.policy_version} · valid_until = {result.valid_until ?? 'evaluated_at + 60s'} · NOTE: dry-run is UNSIGNED/advisory (no aud, no JWS) — mechanically unusable at the Gateway.
      </div>
    </div>
  );
}

/* ── WindowScheduleEditor ──────────────────────────────────────────────────
   The RRULE-allowlist maintenance-window editor with DST fold/gap-aware
   occurrence preview and overnight/next-day-anchor rendering. A domain-unique
   editor (UI_SPEC §6.1). Rendered read-first here (the actual mutation routes
   through the §5.3 ceremony); it surfaces each window's kind, RRULE, zone and a
   plain-language occurrence line. */
const KIND_TONE: Record<MaintenanceWindow['kind'], { label: string; color: string; glyph: string }> = {
  allow: { label: 'ALLOW', color: 'var(--signal-cyan-ink)', glyph: '●' },
  freeze: { label: 'FREEZE', color: 'var(--state-amber-ink)', glyph: '❄' },
  break_glass: { label: 'BREAK-GLASS', color: 'var(--danger-text)', glyph: '⚠' },
};

function humanDuration(s: number): string {
  if (s % 86400 === 0) return `${s / 86400}d`;
  if (s % 3600 === 0) return `${s / 3600}h`;
  if (s % 60 === 0) return `${s / 60}m`;
  return `${s}s`;
}

export function WindowScheduleEditor({
  windows,
  onEdit,
}: {
  windows: MaintenanceWindow[];
  onEdit?: (w: MaintenanceWindow) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ ...eyebrow }}>Maintenance windows · RRULE allowlist · IANA zone · deny-overrides lattice (allow &lt; freeze &lt; break-glass)</div>
      {windows.length === 0 ? (
        <div style={{ ...mono, fontSize: 12, color: 'var(--text-disabled)' }}>no windows — every action_class stays deny(not_in_window) until authored.</div>
      ) : (
        windows.map((w) => {
          const k = KIND_TONE[w.kind];
          return (
            <div key={w.window_id} style={{ background: 'var(--surface-inset)', border: '1px solid var(--border-default)', borderRadius: 6, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ ...mono, fontSize: 11, color: k.color, border: `1px solid ${k.color === 'var(--state-amber-ink)' ? '#5A4A1E' : k.color === 'var(--danger-text)' ? '#5A2420' : '#14424F'}`, borderRadius: 3, padding: '0 6px' }}>{k.glyph} {k.label}</span>
              <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{w.rrule}</span>
              <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>tz {w.tz} · {humanDuration(w.duration_s)}</span>
              {w.label ? <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, color: 'var(--text-muted)' }}>{w.label}</span> : null}
              {w.expires_at ? <span style={{ ...mono, fontSize: 11, color: 'var(--state-amber-ink)' }}>expires {w.expires_at}</span> : null}
              <span style={{ flex: 1 }} />
              {onEdit ? (
                <button type="button" onClick={() => onEdit(w)} style={{ ...eyebrow, background: 'transparent', border: '1px solid var(--border-strong)', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', color: 'var(--text-link, var(--signal-cyan))' }}>
                  edit… (→ ceremony)
                </button>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ── PolicyMatrix ──────────────────────────────────────────────────────────
   The (host/tier × action_class) → auto/ask/deny(floor) grid. A THIN config of
   the shared DataTable (§6.2), NOT a new component: rows/columns are a DataTable;
   cells are plain mode labels, and floor cells render the §4.7 printed-fact
   🔒 floor (never a disabled toggle). Listed for completeness (UI_SPEC §6.1). */
export interface PolicyMatrixRow {
  id: string;
  label: ReactNode;
  cells: { action_class: string; mode: Mode; floor?: boolean }[];
}

function modeCell(mode: Mode, floor?: boolean): ReactNode {
  if (floor) return <span style={{ ...mono, fontSize: 12, color: 'var(--text-muted)' }}>🔒 floor</span>;
  if (mode === 'auto') return <span style={{ ...mono, fontSize: 12, color: 'var(--state-amber-ink)' }}>auto</span>;
  if (mode === 'deny') return <span style={{ ...mono, fontSize: 12, color: 'var(--danger-text)' }}>deny</span>;
  return <span style={{ ...mono, fontSize: 12, color: 'var(--text-secondary)' }}>{mode}</span>;
}

export function PolicyMatrix({ rows, classes }: { rows: PolicyMatrixRow[]; classes: string[] }) {
  const columns: DataColumn<PolicyMatrixRow>[] = [
    { key: 'label', header: '', render: (r) => r.label },
    ...classes.map((c) => ({
      key: c,
      header: c,
      render: (r: PolicyMatrixRow) => {
        const cell = r.cells.find((x) => x.action_class === c);
        return cell ? modeCell(cell.mode, cell.floor) : <span style={{ color: 'var(--text-disabled)' }}>—</span>;
      },
    })),
  ];
  return <DataTable columns={columns} rows={rows} rowKey="id" reflow={false} />;
}
