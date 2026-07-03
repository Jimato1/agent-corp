import type { InputHTMLAttributes } from 'react';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

/** A single radio option. */
export function Radio({ label, name, value, checked, defaultChecked, disabled = false, onChange, id, className = '', ...rest }: RadioProps) {
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

export type RadioOption = string | { value: string; label: string; disabled?: boolean };

export interface RadioGroupProps {
  name: string;
  value?: string;
  defaultValue?: string;
  options?: RadioOption[];
  row?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

/** Convenience group wrapper for a set of options. */
export function RadioGroup({ name, value, defaultValue, options = [], row = false, onChange, className = '' }: RadioGroupProps) {
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
            disabled={typeof o === 'string' ? undefined : o.disabled}
            label={opt.label}
            {...(isControlled ? { checked: value === opt.value } : { defaultChecked: defaultValue === opt.value })}
            onChange={onChange ? () => onChange(opt.value) : undefined}
          />
        );
      })}
    </div>
  );
}

export default Radio;
