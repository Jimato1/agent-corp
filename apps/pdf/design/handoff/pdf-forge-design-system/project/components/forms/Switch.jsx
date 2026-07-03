import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'switch');
  el.textContent = `
.pf-switch { display:inline-flex; align-items:center; gap:10px; cursor:pointer; user-select:none; font-family:var(--font-ui); font-size:13px; color:var(--ink-900); position:relative; }
.pf-switch__native { position:absolute; opacity:0; width:0; height:0; }
.pf-switch__track {
  width:34px; height:20px; flex:none; border-radius:var(--r-pill);
  background:var(--sub-600); border:1px solid var(--sub-500); position:relative;
  transition: background var(--mo-fast) var(--ease-inout), border-color var(--mo-fast) var(--ease-inout);
}
.pf-switch__thumb {
  position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:var(--r-pill);
  background:var(--ink-700); transition: transform var(--mo-base) var(--ease-out), background var(--mo-fast);
}
.pf-switch:hover .pf-switch__track { border-color:var(--sub-400); }
.pf-switch__native:checked + .pf-switch__track { background:var(--press-500); border-color:var(--press-500); }
.pf-switch__native:checked + .pf-switch__track .pf-switch__thumb { transform:translateX(14px); background:#08191f; }
.pf-switch__native:focus-visible + .pf-switch__track { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-switch--disabled { cursor:not-allowed; color:var(--ink-500); }
.pf-switch--disabled .pf-switch__track { opacity:.6; }
.pf-switch__hit { position:absolute; inset:-12px -8px; }
`;
  document.head.appendChild(el);
}

/**
 * Switch — a binary on/off toggle (press-blue when on). Use for immediate
 * settings (grid on/off, keep originals); use Checkbox inside forms.
 */
export function Switch({ label, checked, defaultChecked, disabled = false, onChange, id, className = '', ...rest }) {
  ensureStyles();
  return (
    <label className={['pf-switch', disabled ? 'pf-switch--disabled' : '', className].filter(Boolean).join(' ')} htmlFor={id}>
      <span className="pf-switch__hit" />
      <input id={id} type="checkbox" role="switch" className="pf-switch__native"
        checked={checked} defaultChecked={defaultChecked} disabled={disabled} onChange={onChange} {...rest} />
      <span className="pf-switch__track"><span className="pf-switch__thumb" /></span>
      {label ? <span className="pf-switch__label">{label}</span> : null}
    </label>
  );
}

export default Switch;
