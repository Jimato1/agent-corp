import * as React from 'react';

/** A ticket / run / release / review-item reference: a mono `[ T-000123 ]`
 *  chip, copy-on-click, middle-truncated, never wrapped. When it names a queue
 *  item, pass `href` to deep-link into Mission Control's review queue. The ID is
 *  opaque — never recolor it to imply meaning; put a TierBadge beside it. */
export interface TicketRefProps extends React.HTMLAttributes<HTMLElement> {
  /** The opaque identifier, e.g. "T-000123". */
  id: string;
  /** Deep-link target (Mission Control review queue). Makes the chip a link. */
  href?: string;
  /** Show the ↗ deep-link affordance even without an href. */
  deepLink?: boolean;
  /** Middle-truncate long IDs (hashes) — keeps head + tail, never wraps. */
  truncate?: boolean;
  /** Called with the id after a copy-on-click. */
  onCopy?: (id: string) => void;
}

export function TicketRef(props: TicketRefProps): JSX.Element;
