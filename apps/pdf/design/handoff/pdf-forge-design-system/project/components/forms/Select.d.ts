import * as React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

/**
 * Select — a styled native <select> (keeps native keyboard + a11y). Pass
 * `options` as strings or {value,label}, or supply <option> children directly.
 */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  hint?: string;
  /** Options as plain strings or {value,label} objects. */
  options?: Array<string | SelectOption>;
  /** Render the chosen value in mono (e.g. DPI presets, ranges). @default false */
  mono?: boolean;
  /** md 32px · sm 28px. @default "md" */
  size?: 'md' | 'sm';
  disabled?: boolean;
}

export declare function Select(props: SelectProps): React.JSX.Element;
