import { useId, useState } from 'react';
import type { FocusEvent, InputHTMLAttributes, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — Input
   14/20 control text, 32px default height, cyan focus ring. A `mono` variant
   sets JetBrains Mono for identifier/token entry. Focus is always visible. */

const CSS = `
.helm-field { display: inline-flex; flex-direction: column; gap: 6px; }
.helm-field__label {
  font-family: var(--font-ui); font-size: 12px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted);
}
.helm-input {
  display: inline-flex; align-items: center; gap: var(--space-2);
  height: var(--control-default); padding: 0 10px;
  background: var(--surface-inset); color: var(--text-primary);
  border: 1px solid var(--border-strong); border-radius: var(--radius-control);
  transition: border-color var(--dur-fast) var(--ease-standard),
              box-shadow var(--dur-fast) var(--ease-standard);
}
.helm-input:hover:not(.is-disabled) { border-color: #55636F; }
.helm-input.is-focused { border-color: var(--border-focus); box-shadow: var(--ring-focus-tight); }
.helm-input.is-disabled { opacity: 0.5; }
.helm-input.is-invalid { border-color: var(--danger); }
.helm-input.is-invalid.is-focused { box-shadow: 0 0 0 2px var(--danger); }
.helm-input--large { height: var(--control-primary); }
.helm-input__icon { font-size: 15px; color: var(--text-muted); display: inline-flex; flex: none; }
.helm-input__control {
  flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  color: inherit; font-family: var(--font-ui); font-size: 14px; line-height: 20px;
}
.helm-input__control::placeholder { color: var(--text-disabled); }
.helm-input--mono .helm-input__control {
  font-family: var(--font-mono); font-feature-settings: var(--figures-tabular); font-size: 13px;
}
.helm-field__hint { font-family: var(--font-ui); font-size: 11px; line-height: 15px; color: var(--text-muted); }
.helm-field__hint.is-invalid { color: var(--danger-text); }
`;

injectStyle('helm-input-css', CSS);

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Uppercase eyebrow label above the field. */
  label?: string;
  /** Leading glyph or icon node (e.g. "/" for search). */
  icon?: ReactNode;
  /** Use JetBrains Mono for IDs / tokens / hashes. */
  mono?: boolean;
  size?: 'default' | 'large';
  invalid?: boolean;
  hint?: ReactNode;
}

export function Input({
  label,
  icon = null,
  mono = false,
  size = 'default',
  invalid = false,
  disabled = false,
  hint = null,
  id,
  className = '',
  style,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const autoId = useId();
  const fieldId = id ?? autoId;

  const shellCls = [
    'helm-input',
    mono ? 'helm-input--mono' : '',
    size === 'large' ? 'helm-input--large' : '',
    focused ? 'is-focused' : '',
    invalid ? 'is-invalid' : '',
    disabled ? 'is-disabled' : '',
  ].filter(Boolean).join(' ');

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <label className={['helm-field', className].filter(Boolean).join(' ')} htmlFor={fieldId} style={style}>
      {label ? <span className="helm-field__label">{label}</span> : null}
      <span className={shellCls}>
        {icon ? <span className="helm-input__icon" aria-hidden="true">{icon}</span> : null}
        <input
          id={fieldId}
          className="helm-input__control"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onFocus={handleFocus}
          onBlur={handleBlur}
          {...rest}
        />
      </span>
      {hint ? <span className={['helm-field__hint', invalid ? 'is-invalid' : ''].filter(Boolean).join(' ')}>{hint}</span> : null}
    </label>
  );
}

export default Input;
