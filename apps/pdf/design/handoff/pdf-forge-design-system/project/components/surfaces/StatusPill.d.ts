import * as React from 'react';

/**
 * StatusPill — a dot + label pill carrying job or validation state. `proc`
 * gently pulses (the "press at work"). Use for badges in the board header,
 * file rows, and job lists; for selection counts use the `selected` status.
 */
export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** neutral · ok · warn · err · proc · selected. @default "neutral" */
  status?: 'neutral' | 'ok' | 'warn' | 'err' | 'proc' | 'selected';
  /** Filled high-emphasis variant (for the rare loud badge). @default false */
  solid?: boolean;
  /** Show the leading status dot. @default true */
  dot?: boolean;
  /** Optional trailing tabular count (e.g. "3 selected"). */
  count?: number;
  children?: React.ReactNode;
}

export declare function StatusPill(props: StatusPillProps): React.JSX.Element;
