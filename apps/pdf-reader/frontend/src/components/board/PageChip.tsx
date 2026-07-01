import type { HTMLAttributes } from 'react';

export interface PageChipProps extends HTMLAttributes<HTMLSpanElement> {
  page: number;
  rotation?: number;
  bare?: boolean;
}

/**
 * PageChip — the mono page-number chip that rides a sheet's corner. Tabular
 * figures keep 9 → 10 → 100 from shifting. Shows a rotation glyph when turned.
 */
export function PageChip({ page, rotation = 0, bare = false, className = '', ...rest }: PageChipProps) {
  return (
    <span className={['pf-pagechip', bare ? 'pf-pagechip--bare' : '', className].filter(Boolean).join(' ')} {...rest}>
      {page}
      {rotation ? (
        <span className="pf-pagechip__rot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36" /><polyline points="21 3 21 9 15 9" /></svg>
          {rotation}°
        </span>
      ) : null}
    </span>
  );
}

export default PageChip;
