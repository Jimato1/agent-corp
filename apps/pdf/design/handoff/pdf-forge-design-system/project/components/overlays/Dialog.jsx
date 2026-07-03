import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'dialog');
  el.textContent = `
.pf-scrim {
  position:fixed; inset:0; z-index:80; background:var(--scrim);
  display:grid; place-items:center; padding:24px;
  animation:pf-scrim-in var(--mo-slow) var(--ease-out);
}
@keyframes pf-scrim-in { from { opacity:0; } to { opacity:1; } }
.pf-dialog {
  width:100%; max-width:var(--content-max); max-height:calc(100vh - 48px);
  display:flex; flex-direction:column;
  background:var(--sub-800); border:1px solid var(--sub-600); border-radius:var(--r-panel);
  box-shadow:var(--shadow-dialog); overflow:hidden;
  animation:pf-dialog-in var(--mo-slow) var(--ease-out);
}
@keyframes pf-dialog-in { from { opacity:0; transform:translateY(8px) scale(.99); } to { opacity:1; transform:none; } }
.pf-dialog__head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:16px 16px 12px; }
.pf-dialog__titles { display:flex; flex-direction:column; gap:3px; min-width:0; }
.pf-dialog__eyebrow { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); letter-spacing:.04em; text-transform:uppercase; color:var(--ink-600); }
.pf-dialog__title { font-family:var(--font-ui); font-size:20px; line-height:26px; font-weight:var(--fw-semibold); color:var(--ink-900); }
.pf-dialog__x { flex:none; width:28px; height:28px; display:grid; place-items:center; background:transparent; border:none; cursor:pointer; color:var(--ink-600); border-radius:var(--r-ctl); }
.pf-dialog__x:hover { background:var(--sub-700); color:var(--ink-900); }
.pf-dialog__x:focus-visible { outline:2px solid var(--press-500); outline-offset:2px; }
.pf-dialog__x svg { width:18px; height:18px; }
.pf-dialog__body { padding:0 16px 4px; overflow:auto; color:var(--ink-700); font-family:var(--font-ui); font-size:13px; line-height:20px; }
.pf-dialog__foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 16px 16px; }
`;
  document.head.appendChild(el);
}

/**
 * Dialog — a modal panel over a scrim (the only chrome besides toasts that
 * casts). Esc and scrim-click close it.
 */
export function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  footer,
  closeOnScrim = true,
  width,
  className = '',
  children,
}) {
  ensureStyles();
  const ref = React.useRef(null);
  const prevFocus = React.useRef(null);

  React.useEffect(() => {
    if (!open) return undefined;
    prevFocus.current = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => { if (ref.current) ref.current.focus(); }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      if (prevFocus.current && prevFocus.current.focus) prevFocus.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pf-scrim" onMouseDown={(e) => { if (closeOnScrim && e.target === e.currentTarget) onClose && onClose(); }}>
      <div
        ref={ref}
        className={['pf-dialog', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        style={width ? { maxWidth: width } : undefined}
      >
        {(title || eyebrow || onClose) && (
          <div className="pf-dialog__head">
            <div className="pf-dialog__titles">
              {eyebrow ? <span className="pf-dialog__eyebrow">{eyebrow}</span> : null}
              {title ? <h2 className="pf-dialog__title">{title}</h2> : null}
            </div>
            {onClose ? (
              <button type="button" className="pf-dialog__x" aria-label="Close" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            ) : null}
          </div>
        )}
        <div className="pf-dialog__body">{children}</div>
        {footer ? <div className="pf-dialog__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Dialog;
