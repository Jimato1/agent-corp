import * as React from 'react';

export interface SuiteApp {
  key: string;
  /** Mono 2-letter tile code, e.g. "MC". */
  code: string;
  name: string;
  blurb?: string;
  archetype?: 'Instrument' | 'Workshop';
}

/** The built-in Helm app list (Mission Control, Board, Notes, …). */
export const HELM_APPS: SuiteApp[];

/** The rail's app switcher — the list of apps the operator can reach, as mono
 *  2-letter tiles. The suite-wide safety posture is shown once in NavRail, not
 *  here. */
export interface SuiteSwitcherProps extends React.HTMLAttributes<HTMLDivElement> {
  apps?: SuiteApp[];
  /** Current app key. */
  current?: string;
  /** Collapsed rail — show the tile only. */
  collapsed?: boolean;
  onSelect?: (key: string) => void;
}

export function SuiteSwitcher(props: SuiteSwitcherProps): JSX.Element;
