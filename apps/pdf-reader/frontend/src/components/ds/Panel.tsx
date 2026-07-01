import type { HTMLAttributes, ReactNode } from 'react';

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  eyebrow?: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  header?: ReactNode;
  well?: boolean;
  flush?: boolean;
  noBodyPadding?: boolean;
  bodyClassName?: string;
  children?: ReactNode;
}

/**
 * Panel — the chrome surface. Flat, hairline-bordered, NEVER shadowed (only
 * paper casts). Use `well` for recessed inset regions like the board substrate.
 */
export function Panel({
  eyebrow,
  title,
  actions,
  header,
  well = false,
  flush = false,
  noBodyPadding = false,
  className = '',
  bodyClassName = '',
  children,
  ...rest
}: PanelProps) {
  const cls = [
    'pf-panel',
    well ? 'pf-panel--well' : '',
    flush ? 'pf-panel--flush' : '',
    className,
  ].filter(Boolean).join(' ');

  const hasHead = header || title || eyebrow || actions;

  return (
    <section className={cls} {...rest}>
      {hasHead ? (
        header ? (
          <div className="pf-panel__head">{header}</div>
        ) : (
          <div className="pf-panel__head">
            <div className="pf-panel__titles">
              {eyebrow ? <span className="pf-panel__eyebrow">{eyebrow}</span> : null}
              {title ? <h3 className="pf-panel__title">{title}</h3> : null}
            </div>
            {actions ? <div className="pf-panel__actions">{actions}</div> : null}
          </div>
        )
      ) : null}
      <div className={['pf-panel__body', noBodyPadding ? 'pf-panel__body--tight' : '', bodyClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
    </section>
  );
}

export default Panel;
