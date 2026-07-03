import * as React from 'react';

/**
 * IconButton — a 28px square glyph control (16px icon) for toolbars, board
 * headers, and chrome. Hit-area expands to 44px on touch via a pseudo-element.
 */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'aria-pressed'> {
  /** plain (transparent until hover) · outlined (graphite chip) · danger (err on hover). @default "plain" */
  variant?: 'plain' | 'outlined' | 'danger';
  /** md 28px · lg 32px. @default "md" */
  size?: 'md' | 'lg';
  /** Toggle state — renders the press-tint "active" treatment. */
  pressed?: boolean;
  /** Required accessible label (the glyph carries no text). */
  label: string;
  disabled?: boolean;
  /** The icon glyph (an inline SVG node). */
  children: React.ReactNode;
}

export declare function IconButton(props: IconButtonProps): React.JSX.Element;
