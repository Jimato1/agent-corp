import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — Button
   The safe primary action is CYAN (interactive), never green. The danger tone
   is RED and is only ever the trigger for a confirm ceremony (see DangerAction).
   Panels are flat: buttons lighten/darken on interaction, they never lift. */

const CSS = `
.helm-btn {
  --_h: var(--control-default);
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2);
  height: var(--_h); padding: 0 14px;
  font-family: var(--font-ui); font-size: 13px; font-weight: 500;
  line-height: 1; white-space: nowrap; user-select: none;
  border: 1px solid transparent; border-radius: var(--radius-control);
  cursor: pointer; color: var(--text-primary); background: transparent;
  transition: background var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard),
              color var(--dur-fast) var(--ease-standard);
}
.helm-btn:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-btn[disabled] { cursor: not-allowed; opacity: 0.45; }
.helm-btn__icon { font-size: 15px; line-height: 1; display: inline-flex; }

.helm-btn--compact { --_h: var(--control-compact); font-size: 13px; padding: 0 10px; }
.helm-btn--large   { --_h: var(--control-primary); font-size: 14px; padding: 0 18px; }

/* primary = the safe action (cyan) */
.helm-btn--primary { background: var(--interactive); color: var(--text-on-accent); font-weight: 600; }
.helm-btn--primary:hover:not([disabled]) { background: var(--interactive-hover); }
.helm-btn--primary:active:not([disabled]) { background: var(--interactive-press); }

/* secondary = neutral machined control */
.helm-btn--secondary { background: var(--bg-control); color: var(--text-primary); border-color: var(--border-strong); }
.helm-btn--secondary:hover:not([disabled]) { background: #2E3743; border-color: #55636F; }
.helm-btn--secondary:active:not([disabled]) { background: var(--surface-inset); }

/* ghost = quiet, text-first */
.helm-btn--ghost { background: transparent; color: var(--text-secondary); }
.helm-btn--ghost:hover:not([disabled]) { background: var(--bg-control); color: var(--text-primary); }
.helm-btn--ghost:active:not([disabled]) { background: var(--surface-inset); }

/* danger = the operator's destructive finger (always behind a ceremony) */
.helm-btn--danger { background: var(--danger); color: #2C1210; font-weight: 600; }
.helm-btn--danger:hover:not([disabled]) { background: var(--danger-red-hover); }
.helm-btn--danger:active:not([disabled]) { background: var(--danger-red-press); }

/* danger-outline = destructive trigger that must stay quiet until hovered */
.helm-btn--danger-outline { background: transparent; color: var(--danger-text); border-color: #5A2420; }
.helm-btn--danger-outline:hover:not([disabled]) { background: var(--danger-bg); border-color: var(--danger); }
`;

injectStyle('helm-button-css', CSS);

export type ButtonTone = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
export type ButtonSize = 'compact' | 'default' | 'large';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual tone. `primary` = the SAFE action (cyan). `danger` = destructive (red). */
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Leading glyph or icon node. */
  icon?: ReactNode;
  children?: ReactNode;
}

export function Button({
  children,
  tone = 'secondary',
  size = 'default',
  icon = null,
  disabled = false,
  type = 'button',
  className = '',
  ...rest
}: ButtonProps) {
  const cls = [
    'helm-btn',
    `helm-btn--${tone}`,
    size !== 'default' ? `helm-btn--${size}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button type={type} className={cls} disabled={disabled} {...rest}>
      {icon ? <span className="helm-btn__icon" aria-hidden="true">{icon}</span> : null}
      {children ? <span className="helm-btn__label">{children}</span> : null}
    </button>
  );
}

export default Button;
