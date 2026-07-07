import * as React from 'react';

/** An icon-only square control for toolbars, table-row actions, and the header. */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** The glyph or icon node. */
  icon: React.ReactNode;
  /** Accessible label (also the tooltip) — required. */
  label: string;
  size?: 'compact' | 'default' | 'large';
  /** `ghost` (quiet, default) · `solid` (machined fill) · `danger` (red on hover). */
  variant?: 'ghost' | 'solid' | 'danger';
  /** Toggle state; renders the cyan pressed treatment. */
  pressed?: boolean;
  disabled?: boolean;
}

export function IconButton(props: IconButtonProps): JSX.Element;
