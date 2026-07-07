import type { HTMLAttributes, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — StatusPill
   The base status token: a full-round pill carrying a glyph + a text label.
   Color is NEVER the only signal — the glyph and label always ride along.
   Tone maps to the rationed state palette; `striped` is the UNTRUSTED taint. */

const CSS = `
.helm-pill {
  display: inline-flex; align-items: center; gap: 5px;
  height: 20px; padding: 0 8px; border-radius: var(--radius-pill);
  font-family: var(--font-ui); font-size: 11px; font-weight: 600;
  letter-spacing: 0.03em; text-transform: uppercase; white-space: nowrap;
  border: 1px solid transparent; vertical-align: middle;
}
.helm-pill__glyph { font-size: 12px; line-height: 1; }
.helm-pill--sm { height: 17px; font-size: 10px; padding: 0 6px; }
.helm-pill--neutral    { background: var(--bg-control); color: var(--text-secondary); border-color: var(--border-strong); }
.helm-pill--interactive{ background: var(--signal-cyan-wash); color: var(--signal-cyan-ink); border-color: #14424F; }
.helm-pill--halt       { background: var(--halt-gold-wash); color: var(--halt-gold-ink); border-color: var(--halt-gold-edge); }
.helm-pill--danger     { background: var(--danger-bg); color: var(--danger-text); border-color: #5A2420; }
.helm-pill--verified   { background: var(--state-green-wash); color: var(--state-green-ink); border-color: #1E5140; }
.helm-pill--attention  { background: var(--state-amber-wash); color: var(--state-amber-ink); border-color: #5A4A1E; }
.helm-pill--draining   { background: var(--state-violet-wash); color: var(--state-violet-ink); border-color: #3E3363; }
.helm-pill--striped {
  color: var(--state-amber-ink); border-color: #5A4A1E;
  background-color: var(--state-amber-wash);
  background-image: repeating-linear-gradient(-45deg,
    rgba(232,184,75,0.16) 0, rgba(232,184,75,0.16) 4px,
    transparent 4px, transparent 8px);
}
`;

injectStyle('helm-statuspill-css', CSS);

export type PillTone =
  | 'neutral'
  | 'interactive'
  | 'halt'
  | 'danger'
  | 'verified'
  | 'attention'
  | 'draining';

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: PillTone;
  glyph?: ReactNode;
  striped?: boolean;
  size?: 'default' | 'sm';
  children?: ReactNode;
}

export function StatusPill({
  tone = 'neutral',
  glyph = null,
  striped = false,
  size = 'default',
  children,
  className = '',
  ...rest
}: StatusPillProps) {
  const cls = [
    'helm-pill',
    `helm-pill--${tone}`,
    striped ? 'helm-pill--striped' : '',
    size === 'sm' ? 'helm-pill--sm' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={cls} {...rest}>
      {glyph ? <span className="helm-pill__glyph" aria-hidden="true">{glyph}</span> : null}
      <span>{children}</span>
    </span>
  );
}

export default StatusPill;
