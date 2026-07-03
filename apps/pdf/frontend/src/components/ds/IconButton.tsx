import type { ButtonHTMLAttributes, ReactNode } from 'react';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: 'plain' | 'outlined' | 'danger';
  size?: 'md' | 'lg';
  pressed?: boolean;
  label: string;
  children: ReactNode;
}

/** IconButton — a 28px square glyph control for toolbars and chrome. */
export function IconButton({
  variant = 'plain',
  size = 'md',
  pressed,
  disabled = false,
  label,
  className = '',
  children,
  ...rest
}: IconButtonProps) {
  const cls = [
    'pf-iconbtn',
    variant === 'outlined' ? 'pf-iconbtn--outlined' : '',
    variant === 'danger' ? 'pf-iconbtn--danger' : '',
    size === 'lg' ? 'pf-iconbtn--lg' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      aria-pressed={typeof pressed === 'boolean' ? pressed : undefined}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}

export default IconButton;
