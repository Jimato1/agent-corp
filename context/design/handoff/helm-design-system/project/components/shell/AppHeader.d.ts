import * as React from 'react';

/** The global header, identical in every app: app name + one-line identity
 *  (left), a SYSTEM STATE zone (center), and the halt affordance / read-only
 *  kill-status mirror (right, via `children`). 52px tall.
 *
 * @startingPoint section="Shell" subtitle="Global header with system-state zone" viewport="1000x60"
 */
export interface AppHeaderProps extends React.HTMLAttributes<HTMLElement> {
  appName: React.ReactNode;
  /** One-line app identity, e.g. "the operator's cockpit". */
  identity?: React.ReactNode;
  stateLabel?: React.ReactNode;
  /** The center SYSTEM STATE content — live stat chips, freshness, etc. */
  systemState?: React.ReactNode;
  /** Right slot — the StopActuator (MC/auth) or a KillMirror (everyone else). */
  children?: React.ReactNode;
}

export function AppHeader(props: AppHeaderProps): JSX.Element;

/** A read-only kill-status mirror for the header's right slot. */
export interface KillMirrorProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  engaged?: boolean;
  href?: string;
  label?: React.ReactNode;
}

export function KillMirror(props: KillMirrorProps): JSX.Element;
