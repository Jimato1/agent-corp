import * as React from 'react';

/** The honest-stop triad — the true aftermath of any stop/revoke as three
 *  counts, ALL THREE always visible even at zero: ✔ confirmed · ◐ pending
 *  (may still act, with countdown) · ⇉ draining (past reversible, finishing).
 *
 *  Copy discipline is absolute: the summary says "All stopped" ONLY when both
 *  pending and draining are zero — otherwise "Not fully stopped".
 */
export interface HonestStateProps extends React.HTMLAttributes<HTMLDivElement> {
  confirmed?: number;
  pending?: number;
  draining?: number;
  /** Live countdown shown on pending, e.g. "1:48". */
  pendingCountdown?: string;
  /** Which host/ticket is draining, e.g. "host-04 · T-000123". */
  drainingDetail?: React.ReactNode;
  layout?: 'row' | 'stack';
  /** Show the honest summary line (default true). */
  summary?: boolean;
}

export function HonestState(props: HonestStateProps): JSX.Element;
