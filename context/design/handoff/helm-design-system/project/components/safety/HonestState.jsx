import React from 'react';

/* Helm — HonestState (the honest-stop triad)
   After any stop or revoke, the TRUE aftermath is three counts, ALL THREE
   always visible even at zero:
     ✔ confirmed   (acknowledged)                              — green
     ◐ pending     (may still act ~2 min on an issued token)   — amber + countdown
     ⇉ draining    (past its last reversible instant, finishing) — violet + host/ticket
   Copy discipline is ABSOLUTE: never say "all stopped" while pending or
   draining is above zero. This is how the system refuses to lie about a stop. */

const CSS = `
.helm-honest { display: inline-flex; flex-direction: column; gap: 8px; }
.helm-honest__counts { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.helm-honest--stack .helm-honest__counts { flex-direction: column; }
.helm-honest__seg {
  display: inline-flex; align-items: center; gap: 7px;
  height: 26px; padding: 0 10px; border-radius: var(--radius-control);
  border: 1px solid; background: var(--surface-inset);
  font-family: var(--font-ui); font-size: 12px; white-space: nowrap;
}
.helm-honest__glyph { font-size: 13px; line-height: 1; }
.helm-honest__n { font-family: var(--font-mono); font-size: 14px; font-weight: 600; font-feature-settings: var(--figures-tabular); }
.helm-honest__lbl { color: var(--text-secondary); text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
.helm-honest__seg--confirmed { border-color: #1E5140; }
.helm-honest__seg--confirmed .helm-honest__glyph, .helm-honest__seg--confirmed .helm-honest__n { color: var(--state-green); }
.helm-honest__seg--pending { border-color: #5A4A1E; }
.helm-honest__seg--pending .helm-honest__glyph, .helm-honest__seg--pending .helm-honest__n { color: var(--state-amber); }
.helm-honest__seg--draining { border-color: #3E3363; }
.helm-honest__seg--draining .helm-honest__glyph, .helm-honest__seg--draining .helm-honest__n { color: var(--state-violet); }
.helm-honest__seg.is-zero { opacity: 0.55; }
.helm-honest__count-note { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
.helm-honest__summary {
  font-family: var(--font-ui); font-size: 12px; line-height: 17px; font-weight: 600;
}
.helm-honest__summary--settled { color: var(--state-green-ink); }
.helm-honest__summary--settling { color: var(--halt-gold-ink); }
.helm-honest__detail { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-honeststate-css')) {
  const s = document.createElement('style');
  s.id = 'helm-honeststate-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function HonestState({
  confirmed = 0,
  pending = 0,
  draining = 0,
  pendingCountdown,
  drainingDetail,
  layout = 'row',
  summary = true,
  className = '',
  ...rest
}) {
  const settled = pending === 0 && draining === 0;
  const inFlight = pending + draining;
  const cls = ['helm-honest', layout === 'stack' ? 'helm-honest--stack' : '', className].filter(Boolean).join(' ');

  return (
    <div className={cls} {...rest}>
      <div className="helm-honest__counts">
        <span className={`helm-honest__seg helm-honest__seg--confirmed${confirmed === 0 ? ' is-zero' : ''}`}>
          <span className="helm-honest__glyph" aria-hidden="true">✔</span>
          <span className="helm-honest__n">{confirmed}</span>
          <span className="helm-honest__lbl">confirmed</span>
        </span>
        <span className={`helm-honest__seg helm-honest__seg--pending${pending === 0 ? ' is-zero' : ''}`}>
          <span className="helm-honest__glyph" aria-hidden="true">◐</span>
          <span className="helm-honest__n">{pending}</span>
          <span className="helm-honest__lbl">pending</span>
          {pending > 0 && pendingCountdown ? <span className="helm-honest__count-note">{pendingCountdown}</span> : null}
        </span>
        <span className={`helm-honest__seg helm-honest__seg--draining${draining === 0 ? ' is-zero' : ''}`}>
          <span className="helm-honest__glyph" aria-hidden="true">⇉</span>
          <span className="helm-honest__n">{draining}</span>
          <span className="helm-honest__lbl">draining</span>
        </span>
      </div>
      {draining > 0 && drainingDetail
        ? <div className="helm-honest__detail">draining: {drainingDetail}</div>
        : null}
      {summary
        ? (settled
            ? <div className="helm-honest__summary helm-honest__summary--settled">✔ All stopped — nothing pending or draining.</div>
            : <div className="helm-honest__summary helm-honest__summary--settling">Not fully stopped — {inFlight} action{inFlight === 1 ? '' : 's'} may still be settling.</div>)
        : null}
    </div>
  );
}
