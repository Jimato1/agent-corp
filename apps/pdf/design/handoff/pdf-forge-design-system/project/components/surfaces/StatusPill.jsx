import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'statuspill');
  el.textContent = `
.pf-pill {
  display:inline-flex; align-items:center; gap:6px;
  height:22px; padding:0 9px 0 8px; border-radius:var(--r-pill);
  font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); line-height:1;
  background:var(--sub-700); color:var(--ink-700); border:1px solid var(--sub-600);
}
.pf-pill__dot { width:7px; height:7px; border-radius:var(--r-pill); flex:none; background:currentColor; }
.pf-pill__count { font-family:var(--font-mono); font-variant-numeric:tabular-nums lining-nums; }
.pf-pill--neutral { color:var(--ink-600); }
.pf-pill--ok    { color:var(--ok-500);   background:var(--ok-tint);  border-color:transparent; }
.pf-pill--warn  { color:var(--warn-500); background:rgba(214,165,60,.14);  border-color:transparent; }
.pf-pill--err   { color:var(--err-500);  background:var(--err-tint); border-color:transparent; }
.pf-pill--proc  { color:var(--proc-500); background:rgba(224,138,60,.14); border-color:transparent; }
.pf-pill--proc .pf-pill__dot { animation:pf-proc-pulse var(--proc-loop) var(--ease-press) infinite; }
.pf-pill--selected { color:var(--press-400); background:var(--press-tint); border-color:transparent; }
.pf-pill--solid.pf-pill--ok   { color:#08191f; background:var(--ok-500); }
.pf-pill--solid.pf-pill--err  { color:#fff;     background:var(--err-500); }
.pf-pill--solid.pf-pill--proc { color:#1a1207;  background:var(--proc-500); }
.pf-pill--solid .pf-pill__dot { background:currentColor; opacity:.65; }
`;
  document.head.appendChild(el);
}

/**
 * StatusPill — a dot + label pill carrying job / validation state.
 */
export function StatusPill({
  status = 'neutral',
  solid = false,
  dot = true,
  count,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
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
