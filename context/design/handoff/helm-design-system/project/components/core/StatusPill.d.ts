import * as React from 'react';

/** The base status token — a full-round pill carrying a glyph + a text label.
 *  Color is never the only signal. Tone maps to the rationed state palette. */
export interface StatusPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** neutral · interactive (cyan) · halt (gold) · danger (red) · verified (green) · attention (amber) · draining (violet). */
  tone?: 'neutral' | 'interactive' | 'halt' | 'danger' | 'verified' | 'attention' | 'draining';
  /** Leading glyph — pair every tone with its reserved mark. */
  glyph?: React.ReactNode;
  /** The UNTRUSTED striped-amber taint treatment. */
  striped?: boolean;
  size?: 'default' | 'sm';
  children?: React.ReactNode;
}

export function StatusPill(props: StatusPillProps): JSX.Element;
