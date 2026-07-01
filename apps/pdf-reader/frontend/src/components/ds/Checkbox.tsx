import { useEffect, useRef } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  indeterminate?: boolean;
}

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
);
const DASH = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round"><path d="M5 12h14" /></svg>
);

/** Checkbox — a 16px square toggle with the press-blue checked fill. */
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
}: CheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
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
