import * as React from 'react';

/**
 * InlineBanner — a status banner with a 3px left accent rule, placed inline
 * next to what it describes. Errors carry the machine `code` in mono
 * (e.g. bad_pdf_structure, 422).
 */
export interface InlineBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** info (press) · ok · warn · err. @default "info" */
  status?: 'info' | 'ok' | 'warn' | 'err';
  /** Bold lead line. */
  title?: React.ReactNode;
  /** Machine code shown in mono beside the title (errors). */
  code?: string;
  /** Optional action buttons row (e.g. Retry / Dismiss). */
  actions?: React.ReactNode;
  /** Show a × and fire this on click. */
  onDismiss?: () => void;
  /** Override the default status icon. */
  icon?: React.ReactNode;
  /** Body message. */
  children?: React.ReactNode;
}

export declare function InlineBanner(props: InlineBannerProps): React.JSX.Element;
