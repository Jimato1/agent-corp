import type { HTMLAttributes } from 'react';

export interface InsertionBarProps extends HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
  height?: number;
}

/**
 * InsertionBar — the drop-gap indicator: a press-blue bar with end-caps that
 * marks exactly where a dragged sheet will land.
 */
export function InsertionBar({ orientation = 'vertical', height, className = '', ...rest }: InsertionBarProps) {
  const v = orientation !== 'horizontal';
  return (
    <div
      className={['pf-insert', v ? 'pf-insert--v' : 'pf-insert--h', className].filter(Boolean).join(' ')}
      style={v && height ? { height } : undefined}
      aria-hidden="true"
      {...rest}
    >
      <div className="pf-insert__bar" />
      <span className="pf-insert__cap pf-insert__cap--a" />
      <span className="pf-insert__cap pf-insert__cap--b" />
    </div>
  );
}

export default InsertionBar;
