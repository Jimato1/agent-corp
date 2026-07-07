import * as React from 'react';

/** The signature element: a full-width GOLD band under the header, sticky until
 *  the posture clears. `kill` = KILL-SWITCH ENGAGED; `safe-stop` = SYSTEM
 *  SAFE-STOPPED (a dependency failed closed — the safety system working, not an
 *  outage). Calm interlock/shield icons, never ✕, never red. G2 is intensified
 *  gold (heavier, doubled ▮▮▮▮ glyph, striping). Most apps show it read-only.
 *
 * @startingPoint section="Safety" subtitle="Kill-switch / safe-stop gold band" viewport="1000x150"
 */
export interface HaltBandProps extends React.HTMLAttributes<HTMLDivElement> {
  /** kill (a stop is engaged) · safe-stop (dependency down, failed closed). */
  mode?: 'kill' | 'safe-stop';
  /** G1 (standard) · G2 (intensified full-quiesce). */
  level?: 'G1' | 'G2';
  /** Override the sub-message. */
  message?: React.ReactNode;
  /** The honest triad counts. */
  confirmed?: number;
  pending?: number;
  draining?: number;
  pendingCountdown?: string;
  drainingDetail?: React.ReactNode;
  /** For safe-stop: bullet list of what's still true / what to do. */
  stillTrue?: React.ReactNode[];
  /** Deep-link to review the halt. */
  reviewHref?: string;
  reviewLabel?: string;
  /** Read-only mirror (every app except MC/auth). Links out to act. */
  readOnly?: boolean;
  /** Show the honest triad (default true). */
  showTriad?: boolean;
}

export function HaltBand(props: HaltBandProps): JSX.Element;
