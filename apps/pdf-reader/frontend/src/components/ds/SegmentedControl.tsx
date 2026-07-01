import { useState } from 'react';
import type { ReactNode } from 'react';

export type SegOption = string | { value: string; label: string; icon?: ReactNode; disabled?: boolean };

export interface SegmentedControlProps {
  options?: SegOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

/** SegmentedControl — a compact 2–3 option toggle (press-tint active segment). */
export function SegmentedControl({
  options = [],
  value,
  defaultValue,
  onChange,
  size = 'sm',
  ariaLabel,
  className = '',
}: SegmentedControlProps) {
  const firstOpt = options[0];
  const first = firstOpt && (typeof firstOpt === 'string' ? firstOpt : firstOpt.value);
  const [internal, setInternal] = useState(defaultValue ?? first);
  const active = value !== undefined ? value : internal;

  return (
    <div className={['pf-seg', size === 'md' ? 'pf-seg--md' : '', className].filter(Boolean).join(' ')} role="group" aria-label={ariaLabel}>
      {options.map((o) => {
        const opt = typeof o === 'string' ? { value: o, label: o, icon: undefined, disabled: undefined } : o;
        return (
          <button
            key={opt.value}
            type="button"
            className="pf-seg__btn"
            aria-pressed={active === opt.value}
            disabled={opt.disabled}
            onClick={() => { if (value === undefined) setInternal(opt.value); onChange?.(opt.value); }}
          >
            {opt.icon ?? null}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;
