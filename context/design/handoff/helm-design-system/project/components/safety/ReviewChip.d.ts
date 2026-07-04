import * as React from 'react';

/** Work waiting on a human gate. Always shows the machine reason and deep-links
 *  into Mission Control's review queue. Apps surface it; only MC / Board clear it. */
export interface ReviewChipProps extends React.HTMLAttributes<HTMLElement> {
  /** needs-review (◈) · escalated (⚑). */
  state?: 'needs-review' | 'escalated';
  /** The machine reason, shown verbatim, e.g. "board_escalation", "window_ambiguity". */
  reason?: React.ReactNode;
  /** Deep-link into the review queue (makes it a link). */
  href?: string;
}

export function ReviewChip(props: ReviewChipProps): JSX.Element;
