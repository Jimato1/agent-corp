import type { HTMLAttributes, ReactNode } from 'react';

const SEMANTIC: Record<string, string> = {
  ok: 'var(--ok-500)', warn: 'var(--warn-500)', err: 'var(--err-500)', proc: 'var(--proc-500)', accent: 'var(--press-500)',
};

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'neutral' | 'accent' | 'solid';
  size?: 'md' | 'lg';
  ui?: boolean;
  dot?: string | null;
  onRemove?: () => void;
  children?: ReactNode;
}

/** Tag — a compact metadata chip. Mono by default (filenames, ranges, sizes). */
export function Tag({
  variant = 'neutral',
  size = 'md',
  ui = false,
  dot = null,
  onRemove,
  className = '',
  children,
  ...rest
}: TagProps) {
  const cls = [
    'pf-tag',
    variant === 'accent' ? 'pf-tag--accent' : '',
    variant === 'solid' ? 'pf-tag--solid' : '',
    size === 'lg' ? 'pf-tag--lg' : '',
    ui ? 'pf-tag--ui' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <span className={cls} {...rest}>
      {dot ? <span className="pf-tag__dot" style={{ background: SEMANTIC[dot] || dot }} /> : null}
      <span className="pf-tag__label">{children}</span>
      {onRemove ? (
        <button type="button" className="pf-tag__x" aria-label="Remove" onClick={onRemove}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      ) : null}
    </span>
  );
}

export default Tag;
