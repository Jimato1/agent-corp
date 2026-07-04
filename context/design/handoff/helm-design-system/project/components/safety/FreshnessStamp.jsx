import React from 'react';

/* Helm — FreshnessStamp
   Every live figure carries an age stamp. Live is subtle; STALE is amber ▲
   with the safe reading spelled out — it NEVER fakes a green "OK". A stalled
   SAFETY signal degrades to the gold safe-stop (pass tone="halt"). */

const CSS = `
.helm-fresh {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: 11px; line-height: 15px;
  font-feature-settings: var(--figures-tabular); white-space: nowrap;
}
.helm-fresh--live { color: var(--text-muted); }
.helm-fresh--stale { color: var(--state-amber-ink); }
.helm-fresh--halt { color: var(--halt-gold-ink); }
.helm-fresh__glyph { font-size: 11px; }
.helm-fresh--live .helm-fresh__dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--state-green);
  display: inline-block; box-shadow: 0 0 0 2px rgba(70,185,138,0.18);
}
.helm-fresh__reading { font-family: var(--font-ui); font-weight: 600; letter-spacing: 0.02em; }
.helm-fresh__age { opacity: 0.9; }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-freshness-css')) {
  const s = document.createElement('style');
  s.id = 'helm-freshness-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function FreshnessStamp({
  age,
  state = 'live',
  reading,
  className = '',
  ...rest
}) {
  const cls = ['helm-fresh', `helm-fresh--${state}`, className].filter(Boolean).join(' ');

  if (state === 'stale' || state === 'halt') {
    return (
      <span className={cls} {...rest}>
        <span className="helm-fresh__glyph" aria-hidden="true">{state === 'halt' ? '▮▮' : '▲'}</span>
        <span className="helm-fresh__reading">{reading || (state === 'halt' ? 'SAFE-STOPPED' : 'STALE')}</span>
        {age != null ? <span className="helm-fresh__age">· last good {age}</span> : null}
      </span>
    );
  }

  return (
    <span className={cls} {...rest}>
      <span className="helm-fresh__dot" aria-hidden="true"></span>
      <span className="helm-fresh__age">{age != null ? `${age}` : 'live'}</span>
    </span>
  );
}
