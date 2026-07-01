import * as React from 'react';

/**
 * Tooltip — a dark hover/focus hint. Because pdf-forge is keyboard-driven,
 * pass `kbd` to surface the shortcut in mono (e.g. ⌘E, R).
 */
export interface TooltipProps {
  /** Tooltip text. */
  label: React.ReactNode;
  /** Optional keyboard shortcut shown in mono after the label. */
  kbd?: string;
  /** top (default) · bottom · left · right. */
  placement?: 'top' | 'bottom' | 'left' | 'right';
  /** Show delay in ms. @default 280 */
  delay?: number;
  className?: string;
  /** The trigger element (single focusable child recommended). */
  children: React.ReactNode;
}

export declare function Tooltip(props: TooltipProps): React.JSX.Element;
