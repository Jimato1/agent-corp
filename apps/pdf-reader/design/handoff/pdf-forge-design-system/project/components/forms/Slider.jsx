import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'slider');
  el.textContent = `
.pf-slider { display:flex; flex-direction:column; gap:8px; }
.pf-slider__top { display:flex; align-items:baseline; justify-content:space-between; }
.pf-slider__label { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); color:var(--ink-700); }
.pf-slider__val { font-family:var(--font-mono); font-size:12px; color:var(--ink-900); font-variant-numeric:tabular-nums lining-nums; }
.pf-slider__range {
  -webkit-appearance:none; appearance:none; width:100%; height:18px; background:transparent; cursor:pointer; margin:0;
}
.pf-slider__range::-webkit-slider-runnable-track { height:4px; border-radius:2px; background:linear-gradient(var(--press-500),var(--press-500)) 0/var(--pf-pct,0%) 100% no-repeat, var(--sub-600); }
.pf-slider__range::-moz-range-track { height:4px; border-radius:2px; background:var(--sub-600); }
.pf-slider__range::-moz-range-progress { height:4px; border-radius:2px; background:var(--press-500); }
.pf-slider__range::-webkit-slider-thumb {
  -webkit-appearance:none; appearance:none; width:14px; height:14px; margin-top:-5px;
  border-radius:var(--r-pill); background:var(--ink-900); border:2px solid var(--press-500);
  transition: box-shadow var(--mo-fast);
}
.pf-slider__range::-moz-range-thumb {
  width:14px; height:14px; border-radius:var(--r-pill); background:var(--ink-900); border:2px solid var(--press-500); box-sizing:border-box;
}
.pf-slider__range:hover::-webkit-slider-thumb { box-shadow:0 0 0 4px rgba(31,162,196,.18); }
.pf-slider__range:focus-visible { outline:none; }
.pf-slider__range:focus-visible::-webkit-slider-thumb { box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-slider__range:focus-visible::-moz-range-thumb { box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-slider__marks { display:flex; justify-content:space-between; font-family:var(--font-ui); font-size:11px; color:var(--ink-600); }
.pf-slider[disabled] { opacity:.6; }
`;
  document.head.appendChild(el);
}

/**
 * Slider — a range control. Canonical use: the board zoom (96–180px sheets).
 */
export function Slider({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  marks = null,
  suffix = '',
  showValue = true,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  // visual progress fill for webkit (no native progress element)
  const cur = value !== undefined ? value : defaultValue !== undefined ? defaultValue : min;
  const [internal, setInternal] = React.useState(cur);
  const shown = value !== undefined ? value : internal;
  const pct = ((Number(shown) - min) / (max - min)) * 100;

  return (
    <div className={['pf-slider', className].filter(Boolean).join(' ')} {...(disabled ? { disabled: true } : {})}>
      {(label || showValue) && (
        <div className="pf-slider__top">
          {label ? <span className="pf-slider__label">{label}</span> : <span />}
          {showValue ? <span className="pf-slider__val">{shown}{suffix}</span> : null}
        </div>
      )}
      <input
        id={id}
        type="range"
        className="pf-slider__range"
        min={min}
        max={max}
        step={step}
        value={value !== undefined ? value : internal}
        disabled={disabled}
        onChange={(e) => { if (value === undefined) setInternal(Number(e.target.value)); onChange && onChange(e); }}
        style={{ '--pf-pct': pct + '%' }}
        {...rest}
      />
      {marks ? (
        <div className="pf-slider__marks">
          {marks.map((m) => <span key={m}>{m}</span>)}
        </div>
      ) : null}
    </div>
  );
}

export default Slider;
