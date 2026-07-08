// components/gwparts.tsx — the small Gateway-specific atoms + widgets, analogous
// to the CMDB kit's cmparts.tsx. These COMPOSE the shared DS components and add
// only the domain layout; the three genuinely domain-unique components (§11) —
// SoDChainStrip, RunConsole, SandboxEvidenceView — live in their own files.
//
// FenceState lives HERE (not in components/ds): §4.4 designates it a shared DS
// component, but the vendored CMDB Helm kit deliberately did NOT ship it (CMDB
// holds no lease/mutex — see ds/index.ts note). Rather than edit the verbatim
// ds barrel, the Gateway realizes FenceState here in the app-specific parts,
// faithful to the §4.4 contract (gen N · lease countdown · heartbeat · the
// SUPERSEDED zombie on a lost mutex).

import type { CSSProperties, ReactNode } from 'react';
import { StatusPill } from './ds';
import type { PillTone } from './ds';
import type { ActionClass, FailReason, FenceInfo, RunState } from '../lib/types';

// Shared inline-style atoms (identical to the CMDB kit's eyebrow/mono/panel).
export const eyebrow: CSSProperties = { fontFamily: 'var(--font-ui)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 };
export const mono: CSSProperties = { fontFamily: 'var(--font-mono)', fontFeatureSettings: "'tnum' 1" };
export const panel: CSSProperties = { background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-panel)' };

/* ── FenceState (§4.4) ─────────────────────────────────────────────────────
   The real-world resource lock: mutex generation + lease countdown + heartbeat.
   The 🔒 glyph marks it as a held lock; SUPERSEDED renders the danger-red zombie
   state (this run lost its mutex — another generation moved past it). Correctness
   of this lock is a SECURITY property (prevents dpkg/apt collisions), so the UI
   renders it prominently and never hides a superseded fence. */
export function FenceState({ fence, compact = false }: { fence: FenceInfo; compact?: boolean }) {
  if (fence.superseded) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <StatusPill tone="danger" glyph="⛒" size="sm">SUPERSEDED</StatusPill>
        <span style={{ ...mono, fontSize: 11, color: 'var(--danger-text)' }}>gen {fence.gen} · lost mutex</span>
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: compact ? 6 : 8, ...mono, fontSize: 11, color: 'var(--text-secondary)' }}>
      <span style={{ color: 'var(--text-muted)' }} aria-hidden="true">🔒</span>
      <span>gen {fence.gen}</span>
      {fence.lease_remaining ? <span style={{ color: 'var(--text-muted)' }}>· lease {fence.lease_remaining}</span> : null}
      {fence.heartbeat ? <span style={{ color: 'var(--text-muted)' }}>· ♥ {fence.heartbeat}</span> : null}
    </span>
  );
}

/* ── RunStatePill ──────────────────────────────────────────────────────────
   Maps a RunState (+ optional fail reason) to the rationed StatusPill palette.
   A killed run ALWAYS renders failed(halted), never "cancelled" (§5, PLAN §6.5);
   `verifying` is the neutral wait for the external verifier — NOT green (green is
   reserved for a completed external confirmation, which the Gateway never self-
   declares). */
const RUN_TONE: Record<RunState, { tone: PillTone; glyph: string; label: string }> = {
  preflight: { tone: 'neutral', glyph: '◔', label: 'PREFLIGHT' },
  executing: { tone: 'interactive', glyph: '⧗', label: 'EXECUTING' },
  verifying: { tone: 'attention', glyph: '✔', label: 'VERIFYING' },
  health_check: { tone: 'interactive', glyph: '◍', label: 'HEALTH-CHECK' },
  rolling_back: { tone: 'draining', glyph: '⇄', label: 'ROLLING BACK' },
  needs_review: { tone: 'attention', glyph: '◈', label: 'NEEDS REVIEW' },
  failed: { tone: 'danger', glyph: '✕', label: 'FAILED' },
  done: { tone: 'neutral', glyph: '●', label: 'DONE' },
};

export function RunStatePill({ state, reason, size = 'default' }: { state: RunState; reason?: FailReason; size?: 'default' | 'sm' }) {
  const m = RUN_TONE[state] ?? RUN_TONE.preflight;
  const label = state === 'failed' && reason ? `FAILED(${reason})` : m.label;
  return <StatusPill tone={m.tone} glyph={m.glyph} size={size}>{label}</StatusPill>;
}

/* ── ClassChip ─────────────────────────────────────────────────────────────
   The action_class chip. Where action_class ∈ {destructive, kernel_update,
   reboot} it carries the ⚠ destructive warning (a TierBadge-family cue) — a card
   that reboots or patches a kernel is inherently more dangerous. Non-destructive
   classes render neutral. */
const DESTRUCTIVE = new Set(['destructive', 'kernel_update', 'reboot']);

export function ClassChip({ actionClass, size = 'sm' }: { actionClass: ActionClass; size?: 'default' | 'sm' }) {
  const danger = DESTRUCTIVE.has(actionClass);
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ ...mono, fontSize: 11, color: 'var(--text-muted)' }}>class:</span>
      <span style={{ ...mono, fontSize: 12, color: danger ? 'var(--state-amber-ink)' : 'var(--text-secondary)' }}>{actionClass}</span>
      {danger ? <StatusPill tone="attention" glyph="⚠" size={size}>destructive</StatusPill> : null}
    </span>
  );
}

/* ── Section — a titled panel body used across the detail screens. */
export function Section({ title, right, children, tone = 'default' }: { title: ReactNode; right?: ReactNode; children: ReactNode; tone?: 'default' | 'danger' }) {
  return (
    <div style={{ ...panel, borderColor: tone === 'danger' ? '#5A2420' : 'var(--border-default)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--border-default)' }}>
        <span style={{ ...eyebrow, color: tone === 'danger' ? 'var(--danger-text)' : 'var(--text-muted)' }}>{title}</span>
        {right}
      </div>
      <div style={{ padding: 14 }}>{children}</div>
    </div>
  );
}
