import * as React from 'react';

/**
 * Button — the workbench's primary action control. Spend the press-blue fill
 * on the single primary action per region; everything else is secondary/ghost.
 *
 * @startingPoint section="Forms" subtitle="Primary / secondary / ghost / danger, three sizes" viewport="700x120"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual weight. Primary = the one press-blue action per region. @default "secondary" */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Height: sm 28px · md 32px · lg 40px (lg = touch/primary). @default "md" */
  size?: 'sm' | 'md' | 'lg';
  /** Stretch to fill the container width. @default false */
  block?: boolean;
  /** Running a server job: shows an inline amber indeterminate bar and disables. @default false */
  processing?: boolean;
  /** Disabled (sub-400 fill, ink-500, not-allowed). @default false */
  disabled?: boolean;
  /** Leading glyph (16px icon node). */
  leftIcon?: React.ReactNode;
  /** Trailing glyph (16px icon node). */
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export declare function Button(props: ButtonProps): React.JSX.Element;
