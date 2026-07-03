import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'radio');
  el.textContent = `
.pf-radio-group { display:flex; flex-direction:column; gap:8px; }
.pf-radio-group--row { flex-direction:row; gap:16px; }
.pf-radio { display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none; font-family:var(--font-ui); font-size:13px; color:var(--ink-900); position:relative; }
.pf-radio__native { position:absolute; opacity:0; width:0; height:0; }
.pf-radio__dot {
  width:16px; height:16px; flex:none; border-radius:var(--r-pill);
  background:var(--sub-850); border:1px solid var(--sub-500);
  display:grid; place-items:center;
  transition: border-color var(--mo-fast) var(--ease-inout);
}
.pf-radio__dot::after { content:""; width:7px; height:7px; border-radius:var(--r-pill); background:var(--press-500); transform:scale(0); transition: transform var(--mo-fast) var(--ease-out); }
.pf-radio:hover .pf-radio__dot { border-color:var(--sub-400); }
.pf-radio__native:checked + .pf-radio__dot { border-color:var(--press-500); }
.pf-radio__native:checked + .pf-radio__dot::after { transform:scale(1); }
.pf-radio__native:focus-visible + .pf-radio__dot { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-radio--disabled { cursor:not-allowed; color:var(--ink-500); }
.pf-radio--disabled .pf-radio__dot { background:var(--sub-800); border-color:var(--sub-600); }
.pf-radio__hit { position:absolute; inset:-12px -8px; }
`;
  document.head.appendChild(el);
}

/** A single radio option. */
export function Radio({ label, name, value, checked, defaultChecked, disabled = false, onChange, id, className = '', ...rest }) {
  ensureStyles();
  return (
    <label className={['pf-radio', disabled ? 'pf-radio--disabled' : '', className].filter(Boolean).join(' ')} htmlFor={id}>
      <span className="pf-radio__hit" />
      <input id={id} type="radio" className="pf-radio__native" name={name} value={value}
        checked={checked} defaultChecked={defaultChecked} disabled={disabled} onChange={onChange} {...rest} />
      <span className="pf-radio__dot" />
      {label ? <span className="pf-radio__label">{label}</span> : null}
    </label>
  );
}

/** Convenience group wrapper for a set of options. */
export function RadioGroup({ name, value, defaultValue, options = [], row = false, onChange, className = '' }) {
  ensureStyles();
  return (
    <div className={['pf-radio-group', row ? 'pf-radio-group--row' : '', className].filter(Boolean).join(' ')} role="radiogroup">
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        const isControlled = value !== undefined;
        return (
          <Radio
            key={opt.value}
            name={name}
            value={opt.value}
            disabled={opt.disabled}
            label={opt.label}
            {...(isControlled
              ? { checked: value === opt.value }
              : { defaultChecked: defaultValue === opt.value })}
            onChange={onChange ? () => onChange(opt.value) : undefined}
          />
        );
      })}
    </div>
  );
}

export default Radio;
