import React from 'react';

/* Helm — PrintedAbsence
   The "printed absence" rule. Where a capability CANNOT exist by construction
   (an agent can never approve its own work; this surface cannot relax the
   segregation of duties; the vault never shows a stored secret back), render it
   as a CALM PRINTED FACT with a 🔒/⛊ lock glyph and NO control at all — never a
   greyed-out toggle (a disabled toggle implies the power exists and could be
   switched on). This "affirmative, explained absence" is a repeated pattern. */

const CSS = `
.helm-absence {
  display: flex; align-items: flex-start; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-panel);
}
.helm-absence__glyph {
  font-size: 16px; line-height: 20px; color: var(--text-muted); flex: none;
  font-variant-emoji: text;
}
.helm-absence__body { display: flex; flex-direction: column; gap: 3px; }
.helm-absence__fact { font-family: var(--font-ui); font-size: 13px; line-height: 20px; color: var(--text-secondary); }
.helm-absence__fact strong { color: var(--text-primary); font-weight: 600; }
.helm-absence__why { font-family: var(--font-ui); font-size: 12px; line-height: 17px; color: var(--text-muted); }
.helm-absence__tag {
  align-self: flex-start; margin-top: 2px;
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--text-muted); border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill); padding: 1px 7px;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-printedabsence-css')) {
  const s = document.createElement('style');
  s.id = 'helm-printedabsence-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function PrintedAbsence({
  glyph = '🔒',
  children,
  why,
  tag = 'by construction',
  className = '',
  ...rest
}) {
  return (
    <div className={['helm-absence', className].filter(Boolean).join(' ')} {...rest}>
      <span className="helm-absence__glyph" aria-hidden="true">{glyph}</span>
      <div className="helm-absence__body">
        <div className="helm-absence__fact">{children}</div>
        {why ? <div className="helm-absence__why">{why}</div> : null}
      </div>
      {tag ? <span className="helm-absence__tag">{tag}</span> : null}
    </div>
  );
}
