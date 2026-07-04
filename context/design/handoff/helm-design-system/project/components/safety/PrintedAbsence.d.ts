import * as React from 'react';

/** The "printed absence": where a capability cannot exist BY CONSTRUCTION,
 *  state it as a calm printed fact with a 🔒/⛊ lock glyph and NO control —
 *  never a greyed-out toggle (which would imply the power exists). */
export interface PrintedAbsenceProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Lock glyph — 🔒 (default) or ⛊. Never ⛔ (that's an actionable stop). */
  glyph?: React.ReactNode;
  /** The fact, e.g. "An agent can never approve its own work." */
  children: React.ReactNode;
  /** Optional secondary explanation line. */
  why?: React.ReactNode;
  /** Small trailing tag; default "by construction". */
  tag?: React.ReactNode;
}

export function PrintedAbsence(props: PrintedAbsenceProps): JSX.Element;
