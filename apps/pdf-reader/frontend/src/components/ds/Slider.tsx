import { useState } from 'react';
import type { CSSProperties, InputHTMLAttributes } from 'react';

export interface SliderProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue'> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  value?: number;
  defaultValue?: number;
  marks?: (string | number)[] | null;
  suffix?: string;
  showValue?: boolean;
}

/** Slider — a range control. Canonical use: the board zoom (96–180px sheets). */
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
}: SliderProps) {
  const initial = value !== undefined ? value : defaultValue !== undefined ? defaultValue : min;
  const [internal, setInternal] = useState(initial);
  const shown = value !== undefined ? value : internal;
  const pct = ((Number(shown) - min) / (max - min)) * 100;

  return (
    <div className={['pf-slider', disabled ? 'pf-slider--disabled' : '', className].filter(Boolean).join(' ')}>
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
        onChange={(e) => { if (value === undefined) setInternal(Number(e.target.value)); onChange?.(e); }}
        style={{ '--pf-pct': pct + '%' } as CSSProperties}
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
