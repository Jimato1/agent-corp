import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'select');
  el.textContent = `
.pf-select-field { display:flex; flex-direction:column; gap:6px; }
.pf-select-field__label { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); color:var(--ink-700); }
.pf-select-wrap { position:relative; display:flex; align-items:center; }
.pf-select {
  appearance:none; -webkit-appearance:none; width:100%;
  height:var(--ctl-h); padding:0 30px 0 10px; border-radius:var(--r-ctl);
  background:var(--sub-850); border:1px solid var(--sub-500); color:var(--ink-900);
  font-family:var(--font-ui); font-size:14px; line-height:20px; cursor:pointer;
  transition: border-color var(--mo-fast) var(--ease-inout), box-shadow var(--mo-fast) var(--ease-inout);
}
.pf-select--mono { font-family:var(--font-mono); font-size:13px; font-variant-numeric:tabular-nums; }
.pf-select--sm { height:var(--ctl-h-compact); }
.pf-select:hover { border-color:var(--sub-400); }
.pf-select:focus-visible { outline:none; border-color:var(--press-500); box-shadow:0 0 0 3px rgba(31,162,196,.25); }
.pf-select[disabled] { background:var(--sub-800); border-color:var(--sub-600); color:var(--ink-500); cursor:not-allowed; opacity:.7; }
.pf-select option { background:var(--sub-800); color:var(--ink-900); }
.pf-select-chev { position:absolute; right:9px; display:flex; pointer-events:none; color:var(--ink-600); }
.pf-select-chev svg { width:16px; height:16px; display:block; }
.pf-select-field__hint { font-family:var(--font-ui); font-size:11px; color:var(--ink-600); }
`;
  document.head.appendChild(el);
}

/**
 * Select — a styled native dropdown (keeps native a11y + keyboard).
 */
export function Select({
  label,
  hint,
  options = [],
  mono = false,
  size = 'md',
  disabled = false,
  id,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const selCls = [
    'pf-select',
    mono ? 'pf-select--mono' : '',
    size === 'sm' ? 'pf-select--sm' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={['pf-select-field', className].filter(Boolean).join(' ')}>
      {label ? <label className="pf-select-field__label" htmlFor={id}>{label}</label> : null}
      <div className="pf-select-wrap">
        <select id={id} className={selCls} disabled={disabled} {...rest}>
          {children || options.map((o) => {
            const opt = typeof o === 'string' ? { value: o, label: o } : o;
            return <option key={opt.value} value={opt.value}>{opt.label}</option>;
          })}
        </select>
        <span className="pf-select-chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </span>
      </div>
      {hint ? <span className="pf-select-field__hint">{hint}</span> : null}
    </div>
  );
}

export default Select;
