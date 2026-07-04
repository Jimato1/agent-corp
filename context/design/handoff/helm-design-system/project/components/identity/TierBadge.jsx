import React from 'react';

/* Helm — TierBadge
   The ONE badge for every trust signal. Shape/color = the family, text = the
   exact tier, glyph = how independent the label is:
     ✔ verified      (an external verifier confirmed it) — green
     ⧉ corroborated  (cross-referenced) — cyan
     ◑ single-source (agent-asserted, treat with suspicion) — amber
     ⚠ UNTRUSTED     (host-originated / external — adversarial input) — striped amber
   Rules: taint is display-only (never editable in UI); heuristic labels are
   marked `~ heuristic` and never dressed up as verified; trust tiers NEVER
   borrow the halt-gold (gold is stops only). */

const CSS = `
.helm-tier {
  display: inline-flex; align-items: center; gap: 5px;
  height: 20px; padding: 0 8px; border-radius: var(--radius-pill);
  font-family: var(--font-ui); font-size: 11px; font-weight: 600;
  letter-spacing: 0.02em; white-space: nowrap; border: 1px solid transparent;
  vertical-align: middle;
}
.helm-tier__glyph { font-size: 12px; line-height: 1; }
.helm-tier__heur { font-family: var(--font-mono); font-size: 10px; font-weight: 400; opacity: 0.8; }
.helm-tier--verified     { background: var(--state-green-wash); color: var(--state-green-ink); border-color: #1E5140; }
.helm-tier--corroborated { background: var(--signal-cyan-wash); color: var(--signal-cyan-ink); border-color: #14424F; }
.helm-tier--single       { background: var(--state-amber-wash); color: var(--state-amber-ink); border-color: #5A4A1E; }
.helm-tier--untrusted {
  color: var(--state-amber-ink); border-color: #7A5A1E; font-weight: 700;
  background-color: var(--state-amber-wash);
  background-image: repeating-linear-gradient(-45deg,
    rgba(232,184,75,0.18) 0, rgba(232,184,75,0.18) 4px,
    transparent 4px, transparent 8px);
}
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-tierbadge-css')) {
  const s = document.createElement('style');
  s.id = 'helm-tierbadge-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const TIERS = {
  verified:     { glyph: '✔', label: 'Verified' },
  corroborated: { glyph: '⧉', label: 'Corroborated' },
  single:       { glyph: '◑', label: 'Single-source' },
  untrusted:    { glyph: '⚠', label: 'Untrusted' },
};

export function TierBadge({
  tier = 'single',
  label,
  heuristic = false,
  className = '',
  ...rest
}) {
  const t = TIERS[tier] || TIERS.single;
  const cls = ['helm-tier', `helm-tier--${tier}`, className].filter(Boolean).join(' ');
  return (
    <span className={cls} {...rest}>
      <span className="helm-tier__glyph" aria-hidden="true">{t.glyph}</span>
      <span>{label || t.label}</span>
      {heuristic && tier !== 'verified'
        ? <span className="helm-tier__heur">~ heuristic</span>
        : null}
    </span>
  );
}
