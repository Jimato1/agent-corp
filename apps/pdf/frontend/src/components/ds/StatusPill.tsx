import type { HTMLAttributes, ReactNode } from 'react';

export type PillStatus = 'neutral' | 'ok' | 'warn' | 'err' | 'proc' | 'selected';

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  status?: PillStatus;
  solid?: boolean;
  dot?: boolean;
  count?: number;
  children?: ReactNode;
}

/** StatusPill — a dot + label pill carrying job / validation state. */
export function StatusPill({
  status = 'neutral',
  solid = false,
  dot = true,
  count,
  className = '',
  children,
  ...rest
}: StatusPillProps) {
  const cls = [
    'pf-pill',
    `pf-pill--${status}`,
    solid ? 'pf-pill--solid' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={cls} {...rest}>
      {dot ? <span className="pf-pill__dot" /> : null}
      {children}
      {count != null ? <span className="pf-pill__count">{count}</span> : null}
    </span>
  );
}

export default StatusPill;
