import type { InputHTMLAttributes } from 'react';

export interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

/**
 * Switch — a binary on/off toggle (press-blue when on). Use for immediate
 * settings (grid on/off, keep originals); use Checkbox inside forms.
 */
export function Switch({ label, checked, defaultChecked, disabled = false, onChange, id, className = '', ...rest }: SwitchProps) {
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
