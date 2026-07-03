import * as React from 'react';

/**
 * Slider — a range control. Canonical use is the board zoom (96–180px sheet
 * width). Pass `marks` to label discrete stops and `suffix` for the readout unit.
 */
export interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'defaultValue' | 'onChange'> {
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Controlled value. */
  value?: number;
  /** Uncontrolled initial value. */
  defaultValue?: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Tick labels shown beneath, evenly spaced (e.g. ["Compact","Comfortable","Large"]). */
  marks?: string[] | null;
  /** Unit appended to the numeric readout (e.g. "px", "%"). */
  suffix?: string;
  /** Show the mono numeric readout top-right. @default true */
  showValue?: boolean;
  disabled?: boolean;
}

export declare function Slider(props: SliderProps): React.JSX.Element;
