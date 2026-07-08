import type { HTMLAttributes, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — EmptyState
   Empty = an INVITATION to act ("nothing here yet — here's the one thing that
   fills it"), never a shrug. A calm glyph, a plain title, one line of guidance,
   and a single primary action. */

const CSS = `
.helm-empty {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: var(--space-3); padding: var(--space-12) var(--space-6);
  max-width: 420px; margin: 0 auto;
}
.helm-empty__glyph {
  width: 44px; height: 44px; border-radius: var(--radius-panel);
  display: inline-flex; align-items: center; justify-content: center; font-size: 20px;
  background: var(--surface-inset); border: 1px solid var(--border-default); color: var(--text-muted);
}
.helm-empty__title { font-family: var(--font-ui); font-size: 16px; font-weight: 600; color: var(--text-primary); }
.helm-empty__body { font-family: var(--font-ui); font-size: 13px; line-height: 20px; color: var(--text-muted); }
.helm-empty__action { margin-top: var(--space-2); }
`;

injectStyle('helm-emptystate-css', CSS);

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  glyph?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({ glyph = '◔', title, children, action, className = '', ...rest }: EmptyStateProps) {
  return (
    <div className={['helm-empty', className].filter(Boolean).join(' ')} {...rest}>
      <span className="helm-empty__glyph" aria-hidden="true">{glyph}</span>
      {title ? <div className="helm-empty__title">{title}</div> : null}
      {children ? <div className="helm-empty__body">{children}</div> : null}
      {action ? <div className="helm-empty__action">{action}</div> : null}
    </div>
  );
}

export default EmptyState;
