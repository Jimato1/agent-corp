import React from 'react';

/* Inject component CSS once (travels with the bundle; tokens come from styles.css). */
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'button');
  el.textContent = `
.pf-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  height:var(--ctl-h); padding:0 14px; border-radius:var(--r-ctl);
  font-family:var(--font-ui); font-size:13px; font-weight:var(--fw-medium); line-height:1;
  border:1px solid transparent; cursor:pointer; user-select:none; white-space:nowrap;
  position:relative; overflow:hidden; isolation:isolate;
  transition: background var(--mo-fast) var(--ease-inout), border-color var(--mo-fast) var(--ease-inout), color var(--mo-fast) var(--ease-inout);
}
.pf-btn:focus-visible { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 6px rgba(31,162,196,.35); }
.pf-btn--sm { height:var(--ctl-h-compact); font-size:12px; padding:0 12px; }
.pf-btn--lg { height:var(--ctl-h-touch); font-size:14px; padding:0 18px; }
.pf-btn--block { display:flex; width:100%; }

.pf-btn--primary { background:var(--press-500); color:#08191f; border-color:var(--press-500); }
.pf-btn--primary:hover { background:var(--press-400); border-color:var(--press-400); }
.pf-btn--primary:active { background:var(--press-600); border-color:var(--press-600); }

.pf-btn--secondary { background:var(--sub-700); color:var(--ink-900); border-color:var(--sub-500); }
.pf-btn--secondary:hover { background:var(--sub-600); border-color:var(--sub-400); }
.pf-btn--secondary:active { background:var(--sub-800); }

.pf-btn--ghost { background:transparent; color:var(--ink-700); border-color:transparent; }
.pf-btn--ghost:hover { background:var(--sub-700); color:var(--ink-900); }
.pf-btn--ghost:active { background:var(--sub-800); }

.pf-btn--danger { background:transparent; color:var(--err-500); border-color:var(--sub-500); }
.pf-btn--danger:hover { background:var(--err-tint); border-color:var(--err-500); }
.pf-btn--danger:active { background:#2c1614; }

.pf-btn[disabled] { background:var(--sub-400); color:var(--ink-500); border-color:transparent; cursor:not-allowed; opacity:.6; box-shadow:none; }
.pf-btn[disabled]:hover { background:var(--sub-400); border-color:transparent; color:var(--ink-500); }

.pf-btn--busy { cursor:progress; }
.pf-btn__label { display:inline-flex; align-items:center; gap:6px; transition:opacity var(--mo-fast); }
.pf-btn--busy .pf-btn__label { opacity:.75; }
.pf-btn__proc { position:absolute; left:0; right:0; bottom:0; height:2px; background:rgba(224,138,60,.18); overflow:hidden; }
.pf-btn__proc::after { content:""; position:absolute; top:0; bottom:0; width:40%; background:var(--proc-500); animation:pf-proc-sweep var(--proc-loop) var(--ease-press) infinite; }
.pf-btn__ico { display:inline-flex; flex:none; }
.pf-btn--sm .pf-btn__ico svg { width:14px; height:14px; }
.pf-btn__ico svg { width:16px; height:16px; display:block; }
`;
  document.head.appendChild(el);
}

/**
 * Button — the workbench's primary action control.
 */
export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  processing = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = [
    'pf-btn',
    `pf-btn--${variant}`,
    size === 'sm' ? 'pf-btn--sm' : size === 'lg' ? 'pf-btn--lg' : '',
    block ? 'pf-btn--block' : '',
    processing ? 'pf-btn--busy' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || processing}
      aria-busy={processing || undefined}
      {...rest}
    >
      <span className="pf-btn__label">
        {leftIcon ? <span className="pf-btn__ico">{leftIcon}</span> : null}
        <span>{children}</span>
        {rightIcon ? <span className="pf-btn__ico">{rightIcon}</span> : null}
      </span>
      {processing ? <span className="pf-btn__proc" aria-hidden="true" /> : null}
    </button>
  );
}

export default Button;
