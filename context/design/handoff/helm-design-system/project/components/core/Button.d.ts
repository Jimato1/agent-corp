import * as React from 'react';

/**
 * The standard button. The safe primary action is cyan (`tone="primary"`);
 * the destructive trigger is `tone="danger"` and must sit behind a confirm
 * ceremony. Panels are flat — buttons never lift on hover.
 *
 * @startingPoint section="Core" subtitle="Safe / secondary / ghost / danger, three sizes" viewport="700x120"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual tone. `primary` = the SAFE action (cyan). `danger` = destructive (red). */
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline';
  /** Control height. */
  size?: 'compact' | 'default' | 'large';
  /** Leading glyph or icon node. */
  icon?: React.ReactNode;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Button(props: ButtonProps): JSX.Element;
