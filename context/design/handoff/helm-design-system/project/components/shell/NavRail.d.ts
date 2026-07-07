import * as React from 'react';

export interface NavItem {
  key?: string;
  label?: React.ReactNode;
  /** Leading icon node (a Lucide <i> or a glyph). */
  icon?: React.ReactNode;
  /** Trailing count badge (amber) — e.g. review-queue depth. */
  badge?: React.ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  /** Render a section label instead of a link. */
  group?: string;
}

/** The left side rail, identical in every app: 224px open / 56px collapsed.
 *  Wordmark + SuiteSwitcher + nav items + the suite-wide safety posture shown
 *  ONCE at the bottom (a gold ring on the halt glyph when engaged).
 *
 * @startingPoint section="Shell" subtitle="Side rail with suite switcher + posture" viewport="260x640"
 */
export interface NavRailProps extends React.HTMLAttributes<HTMLElement> {
  brand?: string;
  current?: string;
  apps?: unknown[];
  items?: NavItem[];
  collapsed?: boolean;
  /** Suite-wide safety posture, shown once. */
  posture?: 'nominal' | 'kill' | 'safe-stop';
  onSelectApp?: (key: string) => void;
  onToggle?: (collapsed: boolean) => void;
  postureHref?: string;
  onPostureClick?: (e: React.MouseEvent) => void;
}

export function NavRail(props: NavRailProps): JSX.Element;
