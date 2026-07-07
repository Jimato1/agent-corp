import React from 'react';

/* Helm — ReviewChip
   Work waiting on a human gate. A pill (◈ NEEDS REVIEW / ⚑ ESCALATED) that
   ALWAYS shows the machine reason (board_escalation, window_ambiguity,
   break-glass, …) and DEEP-LINKS into Mission Control's review queue. Apps
   SURFACE it; only Mission Control / Board CLEAR it. */

const CSS = `
.helm-review {
  display: inline-flex; align-items: center; gap: 7px;
  height: 22px; padding: 0 5px 0 8px; border-radius: var(--radius-pill);
  background: var(--state-amber-wash); border: 1px solid #5A4A1E;
  font-family: var(--font-ui); text-decoration: none; white-space: nowrap;
  transition: border-color var(--dur-fast) var(--ease-standard);
}
a.helm-review:hover { border-color: var(--state-amber); text-decoration: none; }
.helm-review:focus-visible { outline: none; box-shadow: var(--ring-focus-tight); }
.helm-review__label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase;
  color: var(--state-amber-ink);
}
.helm-review__glyph { font-size: 12px; }
.helm-review__reason {
  font-family: var(--font-mono); font-size: 11px; color: var(--state-amber-ink); opacity: 0.86;
  border-left: 1px solid #5A4A1E; padding-left: 7px;
}
.helm-review__link { color: var(--state-amber-ink); font-size: 12px; opacity: 0.8; }
.helm-review--escalated { background: #331E0C; }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-reviewchip-css')) {
  const s = document.createElement('style');
  s.id = 'helm-reviewchip-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function ReviewChip({
  state = 'needs-review',
  reason,
  href,
  className = '',
  ...rest
}) {
  const escalated = state === 'escalated';
  const cls = ['helm-review', escalated ? 'helm-review--escalated' : '', className].filter(Boolean).join(' ');

  const inner = (
    <React.Fragment>
      <span className="helm-review__label">
        <span className="helm-review__glyph" aria-hidden="true">{escalated ? '⚑' : '◈'}</span>
        {escalated ? 'Escalated' : 'Needs review'}
      </span>
      {reason ? <span className="helm-review__reason">{reason}</span> : null}
      {href ? <span className="helm-review__link" aria-hidden="true">↗</span> : null}
    </React.Fragment>
  );

  if (href) return <a className={cls} href={href} {...rest}>{inner}</a>;
  return <span className={cls} {...rest}>{inner}</span>;
}
