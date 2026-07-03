import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'pressindicator');
  el.textContent = `
.pf-press {
  position:relative; overflow:hidden; isolation:isolate;
  display:flex; align-items:center; gap:12px;
  padding:13px 15px; border-radius:var(--r-panel);
  background:var(--sub-800); border:1px solid var(--sub-600);
  font-family:var(--font-ui);
}
.pf-press__sweep { position:absolute; inset:0; z-index:-1; opacity:0; }
.pf-press--processing .pf-press__sweep { opacity:1; }
.pf-press__sweep::before {
  content:""; position:absolute; top:0; bottom:0; width:38%;
  background:linear-gradient(90deg, transparent, rgba(224,138,60,.16), transparent);
  animation:pf-proc-sweep var(--proc-loop) var(--ease-press) infinite;
}
.pf-press__lamp {
  width:32px; height:32px; flex:none; border-radius:var(--r-pill);
  display:grid; place-items:center; position:relative;
  background:var(--sub-700); border:1px solid var(--sub-600); color:var(--ink-600);
}
.pf-press__lamp svg { width:17px; height:17px; display:block; }
.pf-press--processing .pf-press__lamp { color:var(--proc-500); border-color:rgba(224,138,60,.5); }
.pf-press--processing .pf-press__lamp::after {
  content:""; position:absolute; inset:-1px; border-radius:var(--r-pill);
  box-shadow:0 0 0 0 rgba(224,138,60,.45); animation:pf-press-ring var(--proc-loop) var(--ease-press) infinite;
}
@keyframes pf-press-ring { 0%{ box-shadow:0 0 0 0 rgba(224,138,60,.5);} 70%{ box-shadow:0 0 0 7px rgba(224,138,60,0);} 100%{ box-shadow:0 0 0 0 rgba(224,138,60,0);} }
.pf-press--success .pf-press__lamp { color:var(--ok-500);  border-color:rgba(75,174,126,.5); background:var(--ok-tint); }
.pf-press--error   .pf-press__lamp { color:var(--err-500); border-color:rgba(217,89,76,.5); background:var(--err-tint); }
.pf-press__body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.pf-press__label { font-size:13px; font-weight:var(--fw-semibold); color:var(--ink-900); display:flex; align-items:center; gap:8px; }
.pf-press--processing .pf-press__label { color:var(--proc-500); }
.pf-press--error .pf-press__label { color:var(--ink-900); }
.pf-press__code { font-family:var(--font-mono); font-size:11px; color:var(--err-500); background:rgba(217,89,76,.16); padding:1px 6px; border-radius:3px; }
.pf-press__detail { font-family:var(--font-mono); font-size:12px; color:var(--ink-600); font-variant-numeric:tabular-nums lining-nums; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pf-press__action { flex:none; display:flex; gap:8px; align-items:center; }
`;
  document.head.appendChild(el);
}

const LAMP = {
  idle:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="M4 10h16"/></svg>,
  processing: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 4v6M6 4h12M6 10h12a0 0 0 0 1 0 0v0a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z"/><path d="M12 14v6M8 20h8"/></svg>,
  success:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4 4 10-10"/></svg>,
  error:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
};

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
}) {
  ensureStyles();
  const defaults = { processing: 'Pressing…', success: 'Done', error: 'Job failed', idle: 'Ready' };
  return (
    <div className={['pf-press', `pf-press--${state}`, className].filter(Boolean).join(' ')} role="status" aria-live="polite" {...rest}>
      <span className="pf-press__sweep" aria-hidden="true" />
      <span className="pf-press__lamp">{LAMP[state]}</span>
      <div className="pf-press__body">
        <span className="pf-press__label">
          {label || defaults[state]}
          {state === 'error' && code ? <span className="pf-press__code">{code}</span> : null}
        </span>
        {detail ? <span className="pf-press__detail">{detail}</span> : null}
      </div>
      {action ? <div className="pf-press__action">{action}</div> : null}
    </div>
  );
}

export default PressIndicator;
