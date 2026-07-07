import React from 'react';

/* Helm — PrincipalRef
   Any "who did this" — always the real identity resolved from the auth
   platform, never a bare display name. A mono chip with a KIND glyph:
   ⬡ agent · ◐ operator · ⚙ service. Click → the principal's drill-in where
   one exists. A revoked/disabled principal carries its own status pill. */

const CSS = `
.helm-principal { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; }
.helm-principal__chip {
  display: inline-flex; align-items: center; gap: 5px;
  height: 20px; padding: 0 7px;
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  font-family: var(--font-mono); font-size: 12px; line-height: 1;
  color: var(--text-primary); white-space: nowrap; text-decoration: none;
  cursor: default; user-select: none;
  transition: background var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard);
}
a.helm-principal__chip { cursor: pointer; }
a.helm-principal__chip:hover { background: #232B36; border-color: var(--border-strong); text-decoration: none; }
.helm-principal__chip:focus-visible { outline: none; box-shadow: var(--ring-focus-tight); }
.helm-principal__glyph { font-family: var(--font-ui); font-size: 12px; color: var(--text-muted); }
.helm-principal__glyph--agent { color: var(--signal-cyan); }
.helm-principal__glyph--operator { color: var(--text-secondary); }
.helm-principal__glyph--service { color: var(--text-muted); }
.helm-principal__id { overflow: hidden; text-overflow: ellipsis; }
.helm-principal__chip.is-void { opacity: 0.72; text-decoration: line-through; text-decoration-color: var(--border-strong); }
.helm-principal__pill {
  display: inline-flex; align-items: center; gap: 4px;
  height: 17px; padding: 0 6px; border-radius: var(--radius-pill);
  font-family: var(--font-ui); font-size: 10px; font-weight: 600;
  letter-spacing: 0.03em; text-transform: uppercase; white-space: nowrap;
  border: 1px solid;
}
.helm-principal__pill--revoked { background: var(--danger-bg); color: var(--danger-text); border-color: #5A2420; }
.helm-principal__pill--disabled { background: var(--bg-control); color: var(--text-muted); border-color: var(--border-strong); }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-principalref-css')) {
  const s = document.createElement('style');
  s.id = 'helm-principalref-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const KIND_GLYPH = { agent: '⬡', operator: '◐', service: '⚙' };

export function PrincipalRef({
  id,
  kind = 'agent',
  href,
  status = 'active',
  className = '',
  ...rest
}) {
  const glyph = KIND_GLYPH[kind] || '⬡';
  const voided = status === 'revoked' || status === 'disabled';
  const chipCls = ['helm-principal__chip', voided ? 'is-void' : ''].filter(Boolean).join(' ');

  const inner = (
    <React.Fragment>
      <span className={`helm-principal__glyph helm-principal__glyph--${kind}`} aria-hidden="true">{glyph}</span>
      <span className="helm-principal__id" title={id}>{id}</span>
    </React.Fragment>
  );

  return (
    <span className={['helm-principal', className].filter(Boolean).join(' ')} {...rest}>
      {href
        ? <a className={chipCls} href={href}>{inner}</a>
        : <span className={chipCls}>{inner}</span>}
      {status === 'revoked'
        ? <span className="helm-principal__pill helm-principal__pill--revoked"><span aria-hidden="true">⛒</span>Revoked</span>
        : null}
      {status === 'disabled'
        ? <span className="helm-principal__pill helm-principal__pill--disabled"><span aria-hidden="true">◼</span>Disabled</span>
        : null}
    </span>
  );
}
