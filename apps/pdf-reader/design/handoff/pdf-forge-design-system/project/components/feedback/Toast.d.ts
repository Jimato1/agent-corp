import * as React from 'react';

/**
 * Toast — a transient floating confirmation (export ready, job failed).
 * Presentational; wrap in a ToastViewport for fixed positioning + stacking.
 */
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  /** neutral · ok · err · proc (sets the left rule + icon). @default "neutral" */
  status?: 'neutral' | 'ok' | 'err' | 'proc';
  title?: React.ReactNode;
  /** Optional action node (e.g. an Open / Undo button). */
  action?: React.ReactNode;
  /** Override or remove (null) the status icon. */
  icon?: React.ReactNode | null;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

/** Fixed-position stack container for toasts. */
export interface ToastViewportProps extends React.HTMLAttributes<HTMLDivElement> {
  /** br (default) · bl · tr corner. */
  position?: 'br' | 'bl' | 'tr';
  children?: React.ReactNode;
}

export declare function Toast(props: ToastProps): React.JSX.Element;
export declare function ToastViewport(props: ToastViewportProps): React.JSX.Element;
