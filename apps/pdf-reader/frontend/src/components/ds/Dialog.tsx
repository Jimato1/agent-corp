import { useEffect, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface DialogProps {
  open: boolean;
  onClose?: () => void;
  eyebrow?: ReactNode;
  title?: ReactNode;
  footer?: ReactNode;
  closeOnScrim?: boolean;
  width?: number | string;
  className?: string;
  children?: ReactNode;
}

/**
 * Dialog — a modal panel over a scrim (the only chrome besides toasts that
 * casts). Esc and scrim-click close it. Restores focus on unmount.
 */
export function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  footer,
  closeOnScrim = true,
  width,
  className = '',
  children,
}: DialogProps) {
  const ref = useRef<HTMLDivElement>(null);
  const prevFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    prevFocus.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => { ref.current?.focus(); }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      const prev = prevFocus.current as HTMLElement | null;
      if (prev && typeof prev.focus === 'function') prev.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="pf-scrim" onMouseDown={(e) => { if (closeOnScrim && e.target === e.currentTarget) onClose?.(); }}>
      <div
        ref={ref}
        className={['pf-dialog', className].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        tabIndex={-1}
        style={width ? ({ maxWidth: width } as CSSProperties) : undefined}
      >
        {(title || eyebrow || onClose) && (
          <div className="pf-dialog__head">
            <div className="pf-dialog__titles">
              {eyebrow ? <span className="pf-dialog__eyebrow">{eyebrow}</span> : null}
              {title ? <h2 className="pf-dialog__title">{title}</h2> : null}
            </div>
            {onClose ? (
              <button type="button" className="pf-dialog__x" aria-label="Close" onClick={onClose}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            ) : null}
          </div>
        )}
        <div className="pf-dialog__body">{children}</div>
        {footer ? <div className="pf-dialog__foot">{footer}</div> : null}
      </div>
    </div>
  );
}

export default Dialog;
