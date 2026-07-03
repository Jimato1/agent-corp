import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'toast');
  el.textContent = `
.pf-toast-viewport {
  position:fixed; z-index:60; display:flex; flex-direction:column; gap:10px;
  bottom:var(--sp-5); right:var(--sp-5); max-width:360px; pointer-events:none;
}
.pf-toast-viewport--bl { right:auto; left:var(--sp-5); }
.pf-toast-viewport--tr { bottom:auto; top:var(--sp-5); }
.pf-toast {
  pointer-events:auto; display:flex; gap:10px; align-items:flex-start;
  min-width:240px; max-width:360px; padding:11px 12px;
  background:var(--sub-800); border:1px solid var(--sub-600); border-radius:var(--r-panel);
  box-shadow:0 12px 32px rgba(5,7,10,.5); color:var(--ink-900);
  font-family:var(--font-ui); font-size:13px; line-height:18px;
  animation:pf-toast-in var(--mo-slow) var(--ease-out);
}
@keyframes pf-toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
.pf-toast__bar { width:3px; align-self:stretch; border-radius:2px; background:var(--ink-600); flex:none; }
.pf-toast--ok   .pf-toast__bar { background:var(--ok-500); }
.pf-toast--err  .pf-toast__bar { background:var(--err-500); }
.pf-toast--proc .pf-toast__bar { background:var(--proc-500); }
.pf-toast__icon { flex:none; margin-top:1px; color:var(--ink-600); }
.pf-toast--ok   .pf-toast__icon { color:var(--ok-500); }
.pf-toast--err  .pf-toast__icon { color:var(--err-500); }
.pf-toast--proc .pf-toast__icon { color:var(--proc-500); }
.pf-toast__icon svg { width:16px; height:16px; display:block; }
.pf-toast__body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.pf-toast__title { font-weight:var(--fw-semibold); }
.pf-toast__msg { color:var(--ink-700); font-size:12px; }
.pf-toast__msg code { font-family:var(--font-mono); font-size:11px; }
.pf-toast__action { margin-top:6px; }
.pf-toast__x { flex:none; background:transparent; border:none; cursor:pointer; color:var(--ink-600); padding:2px; border-radius:3px; margin:-2px -2px 0 0; }
.pf-toast__x:hover { background:var(--sub-600); color:var(--ink-900); }
.pf-toast__x svg { width:14px; height:14px; display:block; }
`;
  document.head.appendChild(el);
}

const ICONS = {
  ok:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/></svg>,
  err:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>,
  proc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.2-8.6"/></svg>,
  neutral: null,
};

/**
 * Toast — a transient floating confirmation. Use for brief outcomes (export
 * ready, job failed); place inside a ToastViewport for positioning + stacking.
 */
export function Toast({ status = 'neutral', title, children, action, icon, onDismiss, className = '', ...rest }) {
  ensureStyles();
  const ic = icon !== undefined ? icon : ICONS[status];
  return (
    <div className={['pf-toast', `pf-toast--${status}`, className].filter(Boolean).join(' ')} role="status" {...rest}>
      <span className="pf-toast__bar" />
      {ic ? <span className="pf-toast__icon">{ic}</span> : null}
      <div className="pf-toast__body">
        {title ? <span className="pf-toast__title">{title}</span> : null}
        {children ? <span className="pf-toast__msg">{children}</span> : null}
        {action ? <div className="pf-toast__action">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="pf-toast__x" aria-label="Dismiss" onClick={onDismiss}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      ) : null}
    </div>
  );
}

/** Fixed-position stack container for toasts. */
export function ToastViewport({ position = 'br', className = '', children, ...rest }) {
  ensureStyles();
  const posCls = position === 'bl' ? 'pf-toast-viewport--bl' : position === 'tr' ? 'pf-toast-viewport--tr' : '';
  return (
    <div className={['pf-toast-viewport', posCls, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export default Toast;
