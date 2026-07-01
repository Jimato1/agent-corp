import type { HTMLAttributes } from 'react';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  size?: number;
  tone?: 'default' | 'proc' | 'accent' | 'ink';
  strokeWidth?: number;
  label?: string;
}

/**
 * Spinner — an indeterminate activity ring. The API exposes no progress for
 * many jobs, so a spinner (not a bar) is the default "working" cue.
 */
export function Spinner({ size = 16, tone = 'default', strokeWidth = 2.4, className = '', label = 'Loading', ...rest }: SpinnerProps) {
  const toneCls = tone === 'proc' ? 'pf-spinner--proc' : tone === 'accent' ? 'pf-spinner--accent' : tone === 'ink' ? 'pf-spinner--ink' : '';
  const r = (24 - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={['pf-spinner', toneCls, className].filter(Boolean).join(' ')} role="status" aria-label={label} style={{ width: size, height: size }} {...rest}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle className="pf-spinner__track" cx="12" cy="12" r={r} strokeWidth={strokeWidth} />
        <circle className="pf-spinner__head" cx="12" cy="12" r={r} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * 0.72} />
      </svg>
    </span>
  );
}

export default Spinner;
