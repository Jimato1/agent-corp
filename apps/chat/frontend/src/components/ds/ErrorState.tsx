import type { HTMLAttributes, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — ErrorState (the sacred R/D split)
   Pattern R (red)  → "your action didn't apply, here's how to fix it"
                      (local, recoverable, the operator's problem).
   Pattern D (gold) → "a dependency is down, so the system safe-stopped"
                      (systemic, the safety system WORKING).
   NEVER render a dependency outage as a red error. */

const CSS = `
.helm-err {
  display: flex; gap: var(--space-3); padding: var(--space-4);
  border-radius: var(--radius-panel); border: 1px solid;
}
.helm-err--R { background: var(--danger-bg); border-color: #5A2420; }
.helm-err--D { background: var(--halt-gold-wash); border-color: var(--halt-gold-edge); }
.helm-err__glyph { font-size: 18px; line-height: 22px; flex: none; }
.helm-err--R .helm-err__glyph { color: var(--danger); }
.helm-err--D .helm-err__glyph { color: var(--halt-gold); }
.helm-err__body { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.helm-err__tag {
  align-self: flex-start; font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase; padding: 1px 6px; border-radius: 3px;
}
.helm-err--R .helm-err__tag { background: var(--danger); color: #2C1210; }
.helm-err--D .helm-err__tag { background: var(--halt-gold); color: #2E1D0B; }
.helm-err__title { font-family: var(--font-ui); font-size: 14px; font-weight: 600; }
.helm-err--R .helm-err__title { color: var(--danger-text); }
.helm-err--D .helm-err__title { color: var(--halt-gold-ink); }
.helm-err__msg { font-family: var(--font-ui); font-size: 13px; line-height: 20px; }
.helm-err--R .helm-err__msg { color: var(--danger-text); }
.helm-err--D .helm-err__msg { color: var(--halt-gold-ink); opacity: 0.92; }
.helm-err__detail { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px; word-break: break-all; }
.helm-err--D .helm-err__detail { color: var(--halt-gold-ink); opacity: 0.7; }
.helm-err__action { margin-top: var(--space-2); }
`;

injectStyle('helm-errorstate-css', CSS);

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  pattern?: 'R' | 'D';
  title?: ReactNode;
  children?: ReactNode;
  detail?: ReactNode;
  action?: ReactNode;
}

export function ErrorState({ pattern = 'R', title, children, detail, action, className = '', ...rest }: ErrorStateProps) {
  const isD = pattern === 'D';
  const glyph = isD ? '⛊' : '✕';
  const tag = isD ? 'Pattern D · safe-stopped' : 'Pattern R · action failed';
  const defaultTitle = isD ? 'System safe-stopped' : "Your action didn't apply";

  return (
    <div className={['helm-err', `helm-err--${isD ? 'D' : 'R'}`, className].filter(Boolean).join(' ')} role="alert" {...rest}>
      <span className="helm-err__glyph" aria-hidden="true">{glyph}</span>
      <div className="helm-err__body">
        <span className="helm-err__tag">{tag}</span>
        <span className="helm-err__title">{title || defaultTitle}</span>
        <span className="helm-err__msg">
          {children ||
            (isD
              ? 'A dependency is down, so the system failed closed. This is the safety system working, not an outage.'
              : "Here's how to fix it and retry.")}
        </span>
        {detail ? <span className="helm-err__detail">{detail}</span> : null}
        {action ? <div className="helm-err__action">{action}</div> : null}
      </div>
    </div>
  );
}

export default ErrorState;
