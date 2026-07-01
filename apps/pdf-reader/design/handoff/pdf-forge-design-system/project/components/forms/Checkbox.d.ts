import * as React from 'react';

/**
 * Checkbox — a 16px square toggle (press-blue when checked). Supports an
 * indeterminate "some selected" state for select-all headers.
 */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  /** Label rendered to the right of the box. */
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  /** Renders the dash "partial" glyph (e.g. select-all when some pages chosen). @default false */
  indeterminate?: boolean;
  disabled?: boolean;
}

export declare function Checkbox(props: CheckboxProps): React.JSX.Element;
