import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'tag');
  el.textContent = `
.pf-tag {
  display:inline-flex; align-items:center; gap:6px; max-width:100%;
  height:22px; padding:0 8px; border-radius:var(--r-ctl);
  background:var(--sub-700); border:1px solid var(--sub-600); color:var(--ink-700);
  font-family:var(--font-mono); font-size:11px; line-height:1; font-variant-numeric:tabular-nums lining-nums;
  white-space:nowrap;
}
.pf-tag--ui { font-family:var(--font-ui); font-weight:var(--fw-medium); }
.pf-tag--lg { height:26px; padding:0 10px; font-size:12px; }
.pf-tag--accent { background:var(--press-tint); border-color:transparent; color:var(--press-400); }
.pf-tag--solid { background:var(--sub-600); border-color:transparent; color:var(--ink-900); }
.pf-tag__label { overflow:hidden; text-overflow:ellipsis; }
.pf-tag__dot { width:6px; height:6px; border-radius:var(--r-pill); flex:none; background:var(--ink-600); }
.pf-tag__x {
  display:inline-grid; place-items:center; width:14px; height:14px; margin-right:-3px; flex:none;
  border:none; background:transparent; color:var(--ink-600); cursor:pointer; border-radius:3px; padding:0;
}
.pf-tag__x:hover { background:var(--sub-500); color:var(--ink-900); }
.pf-tag__x svg { width:10px; height:10px; display:block; }
`;
  document.head.appendChild(el);
}

const SEMANTIC = { ok: 'var(--ok-500)', warn: 'var(--warn-500)', err: 'var(--err-500)', proc: 'var(--proc-500)', accent: 'var(--press-500)' };

/**
 * Tag — a compact metadata chip. Mono by default (filenames, ranges, sizes).
 */
export function Tag({
  variant = 'neutral',
  size = 'md',
  ui = false,
  dot = null,
  onRemove,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
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
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      ) : null}
    </span>
  );
}

export default Tag;
