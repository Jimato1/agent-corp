import * as React from 'react';

/**
 * Spinner — an indeterminate activity ring. Many server jobs report no
 * progress, so a spinner is the default working cue (not a fake progress bar).
 * For the headline "press at work" moment, use PressIndicator.
 */
export interface SpinnerProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Pixel diameter. @default 16 */
  size?: number;
  /** default (muted) · ink · accent (press) · proc (amber). @default "default" */
  tone?: 'default' | 'ink' | 'accent' | 'proc';
  /** Ring stroke width in the 24-unit viewBox. @default 2.4 */
  strokeWidth?: number;
  /** Accessible status label. @default "Loading" */
  label?: string;
}

export declare function Spinner(props: SpinnerProps): React.JSX.Element;
