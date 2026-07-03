import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'segmented');
  el.textContent = `
.pf-seg {
  display:inline-flex; padding:2px; gap:2px; border-radius:var(--r-ctl);
  background:var(--sub-850); border:1px solid var(--sub-500);
}
.pf-seg__btn {
  appearance:none; border:none; cursor:pointer; background:transparent;
  font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); color:var(--ink-600);
  height:24px; padding:0 12px; border-radius:3px; display:inline-flex; align-items:center; gap:6px;
  transition: background var(--mo-fast) var(--ease-inout), color var(--mo-fast) var(--ease-inout);
}
.pf-seg--md .pf-seg__btn { height:28px; font-size:13px; }
.pf-seg__btn:hover { color:var(--ink-800,var(--ink-700)); }
.pf-seg__btn[aria-pressed="true"] { background:var(--press-tint); color:var(--press-400); }
.pf-seg__btn:focus-visible { outline:2px solid var(--press-500); outline-offset:1px; }
.pf-seg__btn svg { width:15px; height:15px; display:block; }
.pf-seg__btn[disabled] { color:var(--ink-500); cursor:not-allowed; }
`;
  document.head.appendChild(el);
}

/**
 * SegmentedControl — a compact 2–3 option toggle (press-tint active segment).
 */
export function SegmentedControl({
  options = [],
  value,
  defaultValue,
  onChange,
  size = 'sm',
  ariaLabel,
  className = '',
}) {
  ensureStyles();
  const first = options[0] && (typeof options[0] === 'string' ? options[0] : options[0].value);
  const [internal, setInternal] = React.useState(defaultValue ?? first);
  const active = value !== undefined ? value : internal;

  return (
    <div className={['pf-seg', size === 'md' ? 'pf-seg--md' : '', className].filter(Boolean).join(' ')} role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o } : o;
        return (
          <button
            key={opt.value}
            type="button"
            className="pf-seg__btn"
            aria-pressed={active === opt.value}
            disabled={opt.disabled}
            onClick={() => { if (value === undefined) setInternal(opt.value); onChange && onChange(opt.value); }}
          >
            {opt.icon ? opt.icon : null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
