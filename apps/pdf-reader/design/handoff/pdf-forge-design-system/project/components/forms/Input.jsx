import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'input');
  el.textContent = `
.pf-field { display:flex; flex-direction:column; gap:6px; }
.pf-field__label { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); color:var(--ink-700); }
.pf-field__label .pf-req { color:var(--press-400); margin-left:2px; }
.pf-input-wrap {
  display:flex; align-items:center; gap:8px;
  height:var(--ctl-h); padding:0 10px; border-radius:var(--r-ctl);
  background:var(--sub-850); border:1px solid var(--sub-500);
  transition: border-color var(--mo-fast) var(--ease-inout), box-shadow var(--mo-fast) var(--ease-inout);
}
.pf-input-wrap:hover { border-color:var(--sub-400); }
.pf-input-wrap:focus-within { border-color:var(--press-500); box-shadow:0 0 0 3px rgba(31,162,196,.25); }
.pf-input-wrap--error { border-color:var(--err-500); }
.pf-input-wrap--error:focus-within { border-color:var(--err-500); box-shadow:0 0 0 3px rgba(217,89,76,.25); }
.pf-input-wrap--shake { animation: pf-shake 340ms var(--ease-inout); }
.pf-input-wrap--sm { height:var(--ctl-h-compact); }
.pf-input-wrap--disabled { background:var(--sub-800); border-color:var(--sub-600); cursor:not-allowed; opacity:.7; }
.pf-input-wrap--disabled .pf-input { cursor:not-allowed; }
.pf-input {
  flex:1; min-width:0; background:transparent; border:none; outline:none;
  color:var(--ink-900); font-family:var(--font-ui); font-size:14px; line-height:20px;
}
.pf-input::placeholder { color:var(--ink-500); }
.pf-input--mono { font-family:var(--font-mono); font-size:13px; font-variant-numeric:tabular-nums lining-nums; letter-spacing:0; }
.pf-input-adorn { display:inline-flex; align-items:center; color:var(--ink-600); flex:none; font-family:var(--font-mono); font-size:12px; }
.pf-input-adorn svg { width:16px; height:16px; display:block; }
.pf-field__hint { font-family:var(--font-ui); font-size:11px; line-height:14px; color:var(--ink-600); }
.pf-field__hint--error { color:var(--err-500); display:flex; align-items:center; gap:5px; }
.pf-field__hint--error code { font-family:var(--font-mono); font-size:11px; color:var(--err-500); }
`;
  document.head.appendChild(el);
}

/**
 * Input — a single-line text field. Use mono for machine data (filenames,
 * ranges, sizes). Errors flip the border to err-500 and shake once.
 */
export function Input({
  label,
  hint,
  error,
  code,
  mono = false,
  size = 'md',
  required = false,
  disabled = false,
  prefix = null,
  suffix = null,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const [shake, setShake] = React.useState(false);
  const prev = React.useRef(error);
  React.useEffect(() => {
    if (error && !prev.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 360);
      prev.current = error;
      return () => clearTimeout(t);
    }
    prev.current = error;
  }, [error]);

  const wrapCls = [
    'pf-input-wrap',
    size === 'sm' ? 'pf-input-wrap--sm' : '',
    error ? 'pf-input-wrap--error' : '',
    shake ? 'pf-input-wrap--shake' : '',
    disabled ? 'pf-input-wrap--disabled' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={['pf-field', className].filter(Boolean).join(' ')}>
      {label ? (
        <label className="pf-field__label" htmlFor={id}>
          {label}{required ? <span className="pf-req">*</span> : null}
        </label>
      ) : null}
      <div className={wrapCls}>
        {prefix ? <span className="pf-input-adorn">{prefix}</span> : null}
        <input
          id={id}
          className={['pf-input', mono ? 'pf-input--mono' : ''].filter(Boolean).join(' ')}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          {...rest}
        />
        {suffix ? <span className="pf-input-adorn">{suffix}</span> : null}
      </div>
      {error ? (
        <span className="pf-field__hint pf-field__hint--error">
          {error}{code ? <code>{code}</code> : null}
        </span>
      ) : hint ? (
        <span className="pf-field__hint">{hint}</span>
      ) : null}
    </div>
  );
}

export default Input;
