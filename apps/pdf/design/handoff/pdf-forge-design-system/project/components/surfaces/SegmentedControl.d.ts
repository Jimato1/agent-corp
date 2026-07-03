import * as React from 'react';

export interface SegmentOption {
  value: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

/**
 * SegmentedControl — a compact 2–3 option toggle with a press-tint active
 * segment. Use for view/fit/density toggles (Fit width / Fit page; Compact /
 * Comfortable / Large). For more or longer options, use Select or RadioGroup.
 */
export interface SegmentedControlProps {
  options: Array<string | SegmentOption>;
  /** Controlled value. */
  value?: string;
  /** Uncontrolled initial value. */
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** sm 24px · md 28px. @default "sm" */
  size?: 'sm' | 'md';
  ariaLabel?: string;
  className?: string;
}

export declare function SegmentedControl(props: SegmentedControlProps): React.JSX.Element;
