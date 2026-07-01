import * as React from 'react';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

/** A single radio option (press-blue dot when selected). */
export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  disabled?: boolean;
}

/** Convenience wrapper rendering a set of radios sharing one `name`. */
export interface RadioGroupProps {
  name: string;
  /** Controlled selected value. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  options: Array<string | RadioOption>;
  /** Lay options out horizontally. @default false */
  row?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}

export declare function Radio(props: RadioProps): React.JSX.Element;
export declare function RadioGroup(props: RadioGroupProps): React.JSX.Element;
