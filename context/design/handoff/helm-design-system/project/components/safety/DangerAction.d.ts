import * as React from 'react';

/** A destructive affordance: a red trigger wired to the ConfirmFriction
 *  ceremony so they can never drift apart. States the DIRECTION and echoes the
 *  live honest-state counts. For a capability that cannot exist by construction,
 *  use PrintedAbsence instead — never a greyed-out control.
 */
export interface DangerActionProps {
  /** Trigger label, e.g. "Lift stop…", "Purge", "Revoke". */
  label: React.ReactNode;
  /** Trigger glyph — ⛔ for stop/deny/kill, ⚠ otherwise. */
  glyph?: React.ReactNode;
  /** outline (quiet until hovered) · solid (filled red). */
  variant?: 'outline' | 'solid';
  size?: 'default' | 'compact';
  disabled?: boolean;
  /** Ceremony intensity — usually `full` for a DangerAction. */
  intensity?: 'light' | 'full';
  title?: React.ReactNode;
  consequence?: React.ReactNode;
  direction?: 'more' | 'less';
  irreversible?: boolean;
  blastRadius?: React.ReactNode;
  honest?: Record<string, unknown>;
  typedIntent?: string;
  stepUp?: boolean;
  confirmLabel?: string;
  auditNote?: React.ReactNode;
  onConfirm?: () => void;
  onEscapeToHalt?: () => void;
}

export function DangerAction(props: DangerActionProps): JSX.Element;
