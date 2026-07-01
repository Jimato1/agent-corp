import type { HTMLAttributes, ReactNode } from 'react';

export type ToastStatus = 'neutral' | 'ok' | 'err' | 'proc';

const ICONS: Record<ToastStatus, ReactNode> = {
  ok: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.4 2.4 4.6-4.8" /></svg>,
  err: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>,
  proc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.2-8.6" /></svg>,
  neutral: null,
};

export interface ToastProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  status?: ToastStatus;
  title?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  onDismiss?: () => void;
  children?: ReactNode;
}

/**
 * Toast — a transient floating confirmation. Use for brief outcomes (export
 * ready, job failed); place inside a ToastViewport for positioning + stacking.
 */
export function Toast({ status = 'neutral', title, children, action, icon, onDismiss, className = '', ...rest }: ToastProps) {
  const ic = icon !== undefined ? icon : ICONS[status];
  return (
    <div className={['pf-toast', `pf-toast--${status}`, className].filter(Boolean).join(' ')} role="status" {...rest}>
      <span className="pf-toast__bar" />
      {ic ? <span className="pf-toast__icon">{ic}</span> : null}
      <div className="pf-toast__body">
        {title ? <span className="pf-toast__title">{title}</span> : null}
        {children ? <span className="pf-toast__msg">{children}</span> : null}
        {action ? <div className="pf-toast__action">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="pf-toast__x" aria-label="Dismiss" onClick={onDismiss}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      ) : null}
    </div>
  );
}

export interface ToastViewportProps extends HTMLAttributes<HTMLDivElement> {
  position?: 'br' | 'bl' | 'tr';
  children?: ReactNode;
}

/** Fixed-position stack container for toasts. */
export function ToastViewport({ position = 'br', className = '', children, ...rest }: ToastViewportProps) {
  const posCls = position === 'bl' ? 'pf-toast-viewport--bl' : position === 'tr' ? 'pf-toast-viewport--tr' : '';
  return (
    <div className={['pf-toast-viewport', posCls, className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </div>
  );
}

export default Toast;
