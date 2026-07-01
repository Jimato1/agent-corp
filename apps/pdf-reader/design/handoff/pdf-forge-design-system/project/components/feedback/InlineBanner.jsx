import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'banner');
  el.textContent = `
.pf-banner {
  display:flex; gap:10px; align-items:flex-start;
  padding:11px 12px 11px 13px; border-radius:var(--r-ctl);
  border:1px solid var(--sub-600); border-left:3px solid var(--ink-600);
  background:var(--sub-800); color:var(--ink-900);
  font-family:var(--font-ui); font-size:13px; line-height:18px;
}
.pf-banner__icon { flex:none; margin-top:1px; color:var(--ink-600); }
.pf-banner__icon svg { width:16px; height:16px; display:block; }
.pf-banner__body { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.pf-banner__title { font-weight:var(--fw-semibold); display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.pf-banner__code { font-family:var(--font-mono); font-size:11px; color:inherit; opacity:.85; background:rgba(0,0,0,.22); padding:1px 6px; border-radius:3px; }
.pf-banner__msg { color:var(--ink-700); }
.pf-banner__actions { display:flex; gap:8px; margin-top:7px; }
.pf-banner__x { flex:none; background:transparent; border:none; cursor:pointer; color:var(--ink-600); padding:2px; border-radius:3px; margin:-2px -2px 0 0; }
.pf-banner__x:hover { background:var(--sub-600); color:var(--ink-900); }
.pf-banner__x svg { width:14px; height:14px; display:block; }

.pf-banner--err  { background:var(--err-tint);  border-color:rgba(217,89,76,.4);  border-left-color:var(--err-500); }
.pf-banner--err  .pf-banner__icon { color:var(--err-500); }
.pf-banner--ok   { background:var(--ok-tint);   border-color:rgba(75,174,126,.4); border-left-color:var(--ok-500); }
.pf-banner--ok   .pf-banner__icon { color:var(--ok-500); }
.pf-banner--warn { background:rgba(214,165,60,.12); border-color:rgba(214,165,60,.4); border-left-color:var(--warn-500); }
.pf-banner--warn .pf-banner__icon { color:var(--warn-500); }
.pf-banner--info { border-left-color:var(--press-500); }
.pf-banner--info .pf-banner__icon { color:var(--press-400); }
`;
  document.head.appendChild(el);
}

const ICONS = {
  err:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>,
  ok:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4 4.6-4.8"/></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4M12 17h.01"/></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>,
};

/**
 * InlineBanner — a status banner with a left accent rule. Errors surface the
 * machine `code` in mono. Use inline near the thing it describes (not floating).
 */
export function InlineBanner({
  status = 'info',
  title,
  code,
  children,
  actions,
  onDismiss,
  icon,
  className = '',
  ...rest
}) {
  ensureStyles();
  return (
    <div className={['pf-banner', `pf-banner--${status}`, className].filter(Boolean).join(' ')} role={status === 'err' ? 'alert' : 'status'} {...rest}>
      <span className="pf-banner__icon">{icon || ICONS[status]}</span>
      <div className="pf-banner__body">
        {title ? (
          <div className="pf-banner__title">
            <span>{title}</span>
            {code ? <code className="pf-banner__code">{code}</code> : null}
          </div>
        ) : null}
        {children ? <div className="pf-banner__msg">{children}</div> : null}
        {actions ? <div className="pf-banner__actions">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="pf-banner__x" aria-label="Dismiss" onClick={onDismiss}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      ) : null}
    </div>
  );
}

export default InlineBanner;
