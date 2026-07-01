import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'checkbox');
  el.textContent = `
.pf-check { display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none; font-family:var(--font-ui); font-size:13px; color:var(--ink-900); position:relative; }
.pf-check__native { position:absolute; opacity:0; width:0; height:0; }
.pf-check__box {
  width:16px; height:16px; flex:none; border-radius:3px;
  background:var(--sub-850); border:1px solid var(--sub-500);
  display:grid; place-items:center; color:#08191f;
  transition: background var(--mo-fast) var(--ease-inout), border-color var(--mo-fast) var(--ease-inout);
}
.pf-check__box svg { width:12px; height:12px; opacity:0; transform:scale(.6); transition: opacity var(--mo-fast), transform var(--mo-fast) var(--ease-out); }
.pf-check:hover .pf-check__box { border-color:var(--sub-400); }
.pf-check__native:checked + .pf-check__box,
.pf-check__native:indeterminate + .pf-check__box { background:var(--press-500); border-color:var(--press-500); }
.pf-check__native:checked + .pf-check__box svg,
.pf-check__native:indeterminate + .pf-check__box svg { opacity:1; transform:scale(1); }
.pf-check__native:focus-visible + .pf-check__box { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-check--disabled { cursor:not-allowed; color:var(--ink-500); }
.pf-check--disabled .pf-check__box { background:var(--sub-800); border-color:var(--sub-600); }
.pf-check__hit { position:absolute; inset:-12px -8px; }
`;
  document.head.appendChild(el);
}

const CHECK = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>;
const DASH = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M5 12h14"/></svg>;

/**
 * Checkbox — a 16px square toggle with the press-blue checked fill.
 */
export function Checkbox({
  label,
  checked,
  defaultChecked,
  indeterminate = false,
  disabled = false,
  onChange,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  return (
    <label className={['pf-check', disabled ? 'pf-check--disabled' : '', className].filter(Boolean).join(' ')} htmlFor={id}>
      <span className="pf-check__hit" />
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="pf-check__native"
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={onChange}
        {...rest}
      />
      <span className="pf-check__box">{indeterminate ? DASH : CHECK}</span>
      {label ? <span className="pf-check__label">{label}</span> : null}
    </label>
  );
}

export default Checkbox;
