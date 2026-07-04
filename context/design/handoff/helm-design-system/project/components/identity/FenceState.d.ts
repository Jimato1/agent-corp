import * as React from 'react';

/** Whether an agent's claim (lease) on a resource is still live. A held lock is
 *  NEUTRAL, not green (green is external-verifier only). As the heartbeat ages
 *  it drifts amber; a lost lock becomes a "zombie" — ⚠ SUPERSEDED. Some apps
 *  render this advisory-only. */
export interface FenceStateProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Current fencing generation the agent holds (or thinks it holds). */
  gen: number | string;
  /** Lease TTL clock, e.g. "04:12". */
  lease?: string;
  /** Heartbeat age, e.g. "0.8s". */
  heartbeat?: string;
  /** held (fresh) · aging (heartbeat drifting) · superseded (zombie). */
  state?: 'held' | 'aging' | 'superseded';
  /** The winning generation, shown on `superseded`. */
  supersededBy?: number | string;
  /** Render greyed + tagged "advisory" for apps that don't enforce on fencing. */
  advisory?: boolean;
}

export function FenceState(props: FenceStateProps): JSX.Element;
