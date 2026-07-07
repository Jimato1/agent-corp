import * as React from 'react';

/** A text input with an always-visible cyan focus ring. The `mono` variant is
 *  for identifier / token entry (JetBrains Mono, tabular). */
export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Uppercase eyebrow label above the field. */
  label?: string;
  /** Leading glyph or icon node (e.g. "/" for search). */
  icon?: React.ReactNode;
  /** Use JetBrains Mono for IDs / tokens / hashes. */
  mono?: boolean;
  size?: 'default' | 'large';
  /** Show the danger-red invalid treatment. */
  invalid?: boolean;
  /** Helper / error text below the field. */
  hint?: React.ReactNode;
  disabled?: boolean;
}

export function Input(props: InputProps): JSX.Element;
