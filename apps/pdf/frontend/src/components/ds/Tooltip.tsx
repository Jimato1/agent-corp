import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface TooltipProps {
  label: ReactNode;
  kbd?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
  children: ReactNode;
}

/**
 * Tooltip — a dark hover/focus hint. Pass `kbd` to show a keyboard shortcut
 * in mono (this is a keyboard-first instrument).
 */
export function Tooltip({ label, kbd, placement = 'top', delay = 280, className = '', children }: TooltipProps) {
  const [show, setShow] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const open = () => { if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => setShow(true), delay); };
  const close = () => { if (timer.current) clearTimeout(timer.current); setShow(false); };
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <span
      className={['pf-tip-wrap', className].filter(Boolean).join(' ')}
      data-show={show ? 'true' : 'false'}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocusCapture={() => setShow(true)}
      onBlurCapture={close}
    >
      {children}
      <span role="tooltip" className={`pf-tip pf-tip--${placement}`}>
        {label}{kbd ? <span className="pf-tip__kbd">{kbd}</span> : null}
      </span>
    </span>
  );
}

export default Tooltip;
