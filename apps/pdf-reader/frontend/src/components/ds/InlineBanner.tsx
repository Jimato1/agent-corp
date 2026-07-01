import type { HTMLAttributes, ReactNode } from 'react';

export type BannerStatus = 'info' | 'ok' | 'warn' | 'err';

const ICONS: Record<BannerStatus, ReactNode> = {
  err: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>,
  ok: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.4 2.4 4.6-4.8" /></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4M12 17h.01" /></svg>,
  info: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>,
};

export interface InlineBannerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  status?: BannerStatus;
  title?: ReactNode;
  code?: string;
  actions?: ReactNode;
  onDismiss?: () => void;
  icon?: ReactNode;
  children?: ReactNode;
}

/**
 * InlineBanner — a status banner with a left accent rule. Errors surface the
 * machine `code` in mono. Use inline near the thing it describes.
 */
export function InlineBanner({
  status = 'info',
  title,
  code,
  children,
  actions,
  onDismiss,
  icon,
  className = '',
  ...rest
}: InlineBannerProps) {
  return (
    <div className={['pf-banner', `pf-banner--${status}`, className].filter(Boolean).join(' ')} role={status === 'err' ? 'alert' : 'status'} {...rest}>
      <span className="pf-banner__icon">{icon || ICONS[status]}</span>
      <div className="pf-banner__body">
        {title ? (
          <div className="pf-banner__title">
            <span>{title}</span>
            {code ? <code className="pf-banner__code">{code}</code> : null}
          </div>
        ) : null}
        {children ? <div className="pf-banner__msg">{children}</div> : null}
        {actions ? <div className="pf-banner__actions">{actions}</div> : null}
      </div>
      {onDismiss ? (
        <button type="button" className="pf-banner__x" aria-label="Dismiss" onClick={onDismiss}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      ) : null}
    </div>
  );
}

export default InlineBanner;
