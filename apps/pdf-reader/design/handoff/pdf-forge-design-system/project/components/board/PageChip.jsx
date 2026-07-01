import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'pagechip');
  el.textContent = `
.pf-pagechip {
  display:inline-flex; align-items:center; gap:4px;
  height:18px; padding:0 7px; border-radius:var(--r-pill);
  background:rgba(14,17,22,.82); color:var(--ink-900);
  font-family:var(--font-mono); font-size:11px; line-height:1;
  font-variant-numeric:tabular-nums lining-nums; white-space:nowrap;
  backdrop-filter:saturate(1.2) blur(1px);
}
.pf-pagechip--bare { background:var(--sub-700); }
.pf-pagechip__rot { display:inline-flex; align-items:center; gap:2px; color:var(--press-400); }
.pf-pagechip__rot svg { width:10px; height:10px; display:block; }
`;
  document.head.appendChild(el);
}

/**
 * PageChip — the mono page-number chip that rides a sheet's corner. Tabular
 * figures keep 9 → 10 → 100 from shifting. Shows a rotation glyph when turned.
 */
export function PageChip({ page, rotation = 0, bare = false, className = '', ...rest }) {
  ensureStyles();
  return (
    <span className={['pf-pagechip', bare ? 'pf-pagechip--bare' : '', className].filter(Boolean).join(' ')} {...rest}>
      {page}
      {rotation ? (
        <span className="pf-pagechip__rot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-2.64-6.36"/><polyline points="21 3 21 9 15 9"/></svg>
          {rotation}°
        </span>
      ) : null}
    </span>
  );
}

export default PageChip;
