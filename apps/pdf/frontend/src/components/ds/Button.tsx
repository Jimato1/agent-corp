import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  processing?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
}

/** Button — the workbench's primary action control. */
export function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  processing = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  type = 'button',
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const cls = [
    'pf-btn',
    `pf-btn--${variant}`,
    size === 'sm' ? 'pf-btn--sm' : size === 'lg' ? 'pf-btn--lg' : '',
    block ? 'pf-btn--block' : '',
    processing ? 'pf-btn--busy' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled || processing}
      aria-busy={processing || undefined}
      {...rest}
    >
      <span className="pf-btn__label">
        {leftIcon ? <span className="pf-btn__ico">{leftIcon}</span> : null}
        <span>{children}</span>
        {rightIcon ? <span className="pf-btn__ico">{rightIcon}</span> : null}
      </span>
      {processing ? <span className="pf-btn__proc" aria-hidden="true" /> : null}
    </button>
  );
}

export default Button;
