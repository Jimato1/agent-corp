import { useEffect, useRef, useState } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  label?: string;
  hint?: string;
  error?: string;
  code?: string;
  mono?: boolean;
  size?: 'sm' | 'md';
  prefix?: ReactNode;
  suffix?: ReactNode;
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
}: InputProps) {
  const [shake, setShake] = useState(false);
  const prev = useRef(error);
  useEffect(() => {
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
