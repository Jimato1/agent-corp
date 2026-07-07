import * as React from 'react';

/** A freshness / staleness stamp for any live figure. Live is subtle; STALE is
 *  amber ▲ with the safe reading spelled out — never a frozen-but-green value.
 *  A stalled safety signal degrades to the gold safe-stop (`state="halt"`). */
export interface FreshnessStampProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Age text, e.g. "0.4s ago", "41s ago". */
  age?: string;
  /** live (subtle) · stale (amber ▲) · halt (gold safe-stop for a safety signal). */
  state?: 'live' | 'stale' | 'halt';
  /** The safe reading to spell out when stale/halt, e.g. "value may be behind". */
  reading?: React.ReactNode;
}

export function FreshnessStamp(props: FreshnessStampProps): JSX.Element;
