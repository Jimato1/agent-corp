import type { ReactNode, SelectHTMLAttributes } from 'react';

export type SelectOption = string | { value: string; label: string; disabled?: boolean };

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  options?: SelectOption[];
  mono?: boolean;
  size?: 'sm' | 'md';
  children?: ReactNode;
}

/** Select — a styled native dropdown (keeps native a11y + keyboard). */
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
}: SelectProps) {
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
          {children ??
            options.map((o) => {
              const opt = typeof o === 'string' ? { value: o, label: o } : o;
              return <option key={opt.value} value={opt.value}>{opt.label}</option>;
            })}
        </select>
        <span className="pf-select-chev" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
        </span>
      </div>
      {hint ? <span className="pf-select-field__hint">{hint}</span> : null}
    </div>
  );
}

export default Select;
