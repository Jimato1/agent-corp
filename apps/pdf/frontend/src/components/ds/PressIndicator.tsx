import type { HTMLAttributes, ReactNode } from 'react';

export type PressState = 'idle' | 'processing' | 'success' | 'error';

const LAMP: Record<PressState, ReactNode> = {
  idle: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M4 10h16" /></svg>,
  processing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v6M6 4h12M6 10h12a0 0 0 0 1 0 0v0a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z" /><path d="M12 14v6M8 20h8" /></svg>,
  success: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4 4 10-10" /></svg>,
  error: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12" /></svg>,
};

const DEFAULTS: Record<PressState, string> = { processing: 'Pressing…', success: 'Done', error: 'Job failed', idle: 'Ready' };

export interface PressIndicatorProps extends HTMLAttributes<HTMLDivElement> {
  state?: PressState;
  label?: ReactNode;
  detail?: ReactNode;
  code?: string;
  action?: ReactNode;
}

/**
 * PressIndicator — the SIGNATURE companion: the amber "press at work" job
 * readout. Drives the heavy server-job moment from processing → success/error.
 */
export function PressIndicator({
  state = 'processing',
  label,
  detail,
  code,
  action,
  className = '',
  ...rest
}: PressIndicatorProps) {
  return (
    <div className={['pf-press', `pf-press--${state}`, className].filter(Boolean).join(' ')} role="status" aria-live="polite" {...rest}>
      <span className="pf-press__sweep" aria-hidden="true" />
      <span className="pf-press__lamp">{LAMP[state]}</span>
      <div className="pf-press__body">
        <span className="pf-press__label">
          {label || DEFAULTS[state]}
          {state === 'error' && code ? <span className="pf-press__code">{code}</span> : null}
        </span>
        {detail ? <span className="pf-press__detail">{detail}</span> : null}
      </div>
      {action ? <div className="pf-press__action">{action}</div> : null}
    </div>
  );
}

export default PressIndicator;
