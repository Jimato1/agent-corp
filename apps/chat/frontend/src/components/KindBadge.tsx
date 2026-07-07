import type { CSSProperties } from 'react';
import { StatusPill } from './ds';
import type { PillTone } from './ds';
import type { NotificationKind } from '../lib/types';

/* Helm — Chat · app-specific component (from ch-parts.jsx).
   KindBadge fuses notification kind + the server-clamped priority band P1–P5.
   Gold is NEVER used (reserved for the read-only kill mirror) — escalations live
   in the ATTENTION family (amber). This is the one Chat-unique widget: it
   composes a shared StatusPill and adds the priority band no shared component
   carries. */

// Shared style helpers, ported verbatim from ch-parts.jsx.
export const eyebrow: CSSProperties = {
  fontFamily: 'var(--font-ui)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontWeight: 600,
};

export const mono: CSSProperties = {
  fontFamily: 'var(--font-mono)',
  fontFeatureSettings: "'tnum' 1",
};

export const panel: CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-panel)',
};

interface KindSpec {
  tone: PillTone;
  glyph: string;
  label: string;
}

const KIND_MAP: Record<NotificationKind, KindSpec> = {
  escalation: { tone: 'attention', glyph: '⚑', label: 'ESCALATION' },
  needs_review: { tone: 'attention', glyph: '◈', label: 'NEEDS_REVIEW' },
  done: { tone: 'verified', glyph: '✔', label: 'DONE' },
};

export interface KindBadgeProps {
  kind: NotificationKind;
  prio: number;
}

export function KindBadge({ kind, prio }: KindBadgeProps) {
  const m = KIND_MAP[kind] ?? KIND_MAP.done;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span
        style={{
          ...mono,
          fontSize: 10,
          fontWeight: 600,
          color: 'var(--text-muted)',
          border: '1px solid var(--border-strong)',
          borderRadius: 3,
          padding: '0 4px',
        }}
      >
        P{prio}
      </span>
      <StatusPill tone={m.tone} glyph={m.glyph} size="sm">{m.label}</StatusPill>
    </span>
  );
}

export default KindBadge;
