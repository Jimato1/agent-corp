import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'panel');
  el.textContent = `
.pf-panel { background:var(--sub-800); border:1px solid var(--sub-600); border-radius:var(--r-panel); }
.pf-panel--well { background:var(--sub-700); border-color:transparent; box-shadow:inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700); }
.pf-panel--flush { border-radius:0; border:none; }
.pf-panel__head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border-bottom:1px solid var(--sub-600); }
.pf-panel__titles { display:flex; flex-direction:column; gap:2px; min-width:0; }
.pf-panel__eyebrow { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); letter-spacing:0.04em; text-transform:uppercase; color:var(--ink-600); }
.pf-panel__title { font-family:var(--font-ui); font-size:16px; line-height:22px; font-weight:var(--fw-semibold); color:var(--ink-900); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pf-panel__title .pf-panel__mono { font-family:var(--font-mono); font-weight:var(--fw-medium); }
.pf-panel__actions { display:flex; gap:8px; align-items:center; flex:none; }
.pf-panel__body { padding:16px; }
.pf-panel__body--tight { padding:0; }
`;
  document.head.appendChild(el);
}

/**
 * Panel — the chrome surface. Flat, hairline-bordered, NEVER shadowed (only
 * paper casts). Use `well` for recessed inset regions like the board substrate.
 */
export function Panel({
  eyebrow,
  title,
  actions,
  header,
  well = false,
  flush = false,
  noBodyPadding = false,
  className = '',
  bodyClassName = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = [
    'pf-panel',
    well ? 'pf-panel--well' : '',
    flush ? 'pf-panel--flush' : '',
    className,
  ].filter(Boolean).join(' ');

  const hasHead = header || title || eyebrow || actions;

  return (
    <section className={cls} {...rest}>
      {hasHead ? (
        header ? (
          <div className="pf-panel__head">{header}</div>
        ) : (
          <div className="pf-panel__head">
            <div className="pf-panel__titles">
              {eyebrow ? <span className="pf-panel__eyebrow">{eyebrow}</span> : null}
              {title ? <h3 className="pf-panel__title">{title}</h3> : null}
            </div>
            {actions ? <div className="pf-panel__actions">{actions}</div> : null}
          </div>
        )
      ) : null}
      <div className={['pf-panel__body', noBodyPadding ? 'pf-panel__body--tight' : '', bodyClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
    </section>
  );
}

export default Panel;
