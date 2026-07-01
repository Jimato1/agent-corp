import * as React from 'react';

/**
 * Switch — a binary on/off toggle (press-blue when on). Use for immediate
 * state changes (grid texture on/off, keep-originals); use Checkbox in forms.
 */
export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  disabled?: boolean;
}

export declare function Switch(props: SwitchProps): React.JSX.Element;
