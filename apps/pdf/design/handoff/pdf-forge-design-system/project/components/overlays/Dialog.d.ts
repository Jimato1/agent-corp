import * as React from 'react';

/**
 * Dialog — a modal panel centered over a scrim. Along with Toast, the only
 * chrome permitted to cast a shadow. Closes on Esc and scrim-click; restores
 * focus to the trigger on close. Use for password prompts, destructive
 * confirms, and option sheets.
 */
export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  /** Uppercase eyebrow above the title. */
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  /** Footer actions row (right-aligned) — typically Cancel + a primary Button. */
  footer?: React.ReactNode;
  /** Allow closing by clicking the scrim. @default true */
  closeOnScrim?: boolean;
  /** Override max width (default 560px content max). */
  width?: number | string;
  className?: string;
  children?: React.ReactNode;
}

export declare function Dialog(props: DialogProps): React.JSX.Element | null;
