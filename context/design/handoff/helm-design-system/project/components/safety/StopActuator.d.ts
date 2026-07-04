import * as React from 'react';

/** The press-and-hold stop control. Fill a ring over a short dwell to engage
 *  (~600ms G1 · ~1000ms G2); release early aborts. No typing on stops. G2 is
 *  heavier and must be focused (armed) first. The actuator is halt-gold —
 *  engaging a stop moves the system into the calm gold posture, never red.
 */
export interface StopActuatorProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onError'> {
  /** G1 (~600ms, immediately holdable) · G2 (~1000ms, must be focused first). */
  level?: 'G1' | 'G2';
  /** Fired once the dwell completes and the stop engages. */
  onEngage?: () => void;
  /** Render the engaged (read-only, gold) state. */
  engaged?: boolean;
  /** Override the resting label. */
  label?: string;
}

export function StopActuator(props: StopActuatorProps): JSX.Element;
