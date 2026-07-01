import * as React from 'react';

/**
 * Input — a single-line text field. Reach for `mono` whenever the value is
 * machine data (filename, page range, byte size, password). An `error` flips
 * the border to err-500 and shakes once (color-only under reduced-motion).
 */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  /** Field label rendered above the control. */
  label?: string;
  /** Helper text below the control (ink-600). */
  hint?: string;
  /** Error message — replaces hint, flips border to err-500, triggers shake. */
  error?: string;
  /** Optional machine code shown in mono after the error (e.g. "wrong_password"). */
  code?: string;
  /** Render the value in JetBrains Mono with tabular figures. @default false */
  mono?: boolean;
  /** md 32px · sm 28px. @default "md" */
  size?: 'md' | 'sm';
  required?: boolean;
  disabled?: boolean;
  /** Leading adornment (icon or unit text). */
  prefix?: React.ReactNode;
  /** Trailing adornment (icon or unit text). */
  suffix?: React.ReactNode;
}

export declare function Input(props: InputProps): React.JSX.Element;
