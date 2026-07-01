import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'iconbutton');
  el.textContent = `
.pf-iconbtn {
  display:inline-grid; place-items:center; flex:none;
  width:var(--icon-btn); height:var(--icon-btn); border-radius:var(--r-ctl);
  background:transparent; color:var(--ink-700); border:1px solid transparent;
  cursor:pointer; position:relative; padding:0;
  transition: background var(--mo-fast) var(--ease-inout), color var(--mo-fast) var(--ease-inout), border-color var(--mo-fast) var(--ease-inout);
}
/* generous hit-area without growing the visual box */
.pf-iconbtn::before { content:""; position:absolute; inset:-8px; }
.pf-iconbtn svg { width:var(--icon-glyph); height:var(--icon-glyph); display:block; }
.pf-iconbtn:hover { background:var(--sub-700); color:var(--ink-900); }
.pf-iconbtn:active { background:var(--sub-800); }
.pf-iconbtn:focus-visible { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 6px rgba(31,162,196,.35); }
.pf-iconbtn--outlined { border-color:var(--sub-500); background:var(--sub-700); color:var(--ink-900); }
.pf-iconbtn--outlined:hover { background:var(--sub-600); border-color:var(--sub-400); }
.pf-iconbtn--lg { width:32px; height:32px; }
.pf-iconbtn[aria-pressed="true"] { background:var(--press-tint); color:var(--press-400); border-color:transparent; }
.pf-iconbtn--danger:hover { background:var(--err-tint); color:var(--err-500); }
.pf-iconbtn[disabled] { color:var(--ink-500); cursor:not-allowed; opacity:.6; background:transparent; }
.pf-iconbtn[disabled]:hover { background:transparent; color:var(--ink-500); }
`;
  document.head.appendChild(el);
}

/**
 * IconButton — a 28px square glyph control for toolbars and chrome.
 */
export function IconButton({
  variant = 'plain',
  size = 'md',
  pressed,
  disabled = false,
  label,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = [
    'pf-iconbtn',
    variant === 'outlined' ? 'pf-iconbtn--outlined' : '',
    variant === 'danger' ? 'pf-iconbtn--danger' : '',
    size === 'lg' ? 'pf-iconbtn--lg' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      aria-pressed={typeof pressed === 'boolean' ? pressed : undefined}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export default IconButton;
