import * as React from 'react';

/** A "who did this" reference — the real identity from the auth platform, never
 *  a bare display name. A mono chip with a kind glyph: ⬡ agent · ◐ operator ·
 *  ⚙ service. Pass `href` to link to the principal's drill-in. Revoked/disabled
 *  principals carry their own status pill. */
export interface PrincipalRefProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The resolved identity, e.g. "agent:patcher-07", "operator:ada". */
  id: string;
  /** Identity kind — sets the leading glyph. */
  kind?: 'agent' | 'operator' | 'service';
  /** Drill-in target (the live agent view, the operator's record). */
  href?: string;
  /** Lifecycle status — revoked/disabled add a pill and strike the id. */
  status?: 'active' | 'revoked' | 'disabled';
}

export function PrincipalRef(props: PrincipalRefProps): JSX.Element;
