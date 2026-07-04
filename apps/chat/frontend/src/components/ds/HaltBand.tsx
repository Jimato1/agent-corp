import type { HTMLAttributes, ReactNode } from 'react';
import { injectStyle } from '../../lib/helmStyle';
import { HonestState } from './HonestState';

/* Helm — HaltBand (the signature element)
   A full-width GOLD band directly under the header, sticky until the posture
   clears. mode="kill" → KILL-SWITCH ENGAGED; mode="safe-stop" → SYSTEM
   SAFE-STOPPED (a dependency failed closed). Calm interlock/shield icons, NEVER
   ✕, NEVER red. Only Mission Control / auth host a real kill trigger; every
   other app (Chat included) shows this band READ-ONLY and links out. */

const CSS = `
.helm-halt {
  position: relative; z-index: var(--z-sticky);
  display: flex; align-items: flex-start; gap: var(--space-6); flex-wrap: wrap;
  padding: 14px var(--space-6);
  background: var(--halt-gold-wash);
  border-top: 2px solid var(--halt-gold);
  box-shadow: var(--shadow-halt); color: var(--halt-gold-ink);
}
.helm-halt--g2 {
  padding: 18px var(--space-6);
  border-top-width: 3px; box-shadow: var(--shadow-halt-g2);
  background-image: repeating-linear-gradient(-45deg,
    rgba(242,132,43,0.10) 0, rgba(242,132,43,0.10) 8px,
    transparent 8px, transparent 16px);
}
.helm-halt__lead { display: flex; align-items: flex-start; gap: var(--space-3); flex: 1 1 340px; min-width: 280px; }
.helm-halt__glyph { font-size: 28px; line-height: 26px; color: var(--halt-gold); flex: none; }
.helm-halt--g2 .helm-halt__glyph { font-size: 22px; letter-spacing: -3px; }
.helm-halt__copy { display: flex; flex-direction: column; gap: 3px; }
.helm-halt__word {
  font-family: var(--font-ui); font-size: 22px; line-height: 26px; font-weight: 600;
  letter-spacing: 0.01em; color: var(--halt-gold-ink);
}
.helm-halt__sub { font-family: var(--font-ui); font-size: 13px; line-height: 20px; color: var(--halt-gold-ink); opacity: 0.9; max-width: 62ch; }
.helm-halt__still { margin: 4px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; }
.helm-halt__still li { font-family: var(--font-ui); font-size: 12px; line-height: 17px; color: var(--halt-gold-ink); opacity: 0.85; display: flex; gap: 6px; }
.helm-halt__still li::before { content: '·'; opacity: 0.6; }
.helm-halt__aside { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.helm-halt__review {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-ui); font-size: 13px; font-weight: 600; color: var(--halt-gold-ink);
  text-decoration: none; border-bottom: 1px solid transparent; padding-bottom: 1px;
}
.helm-halt__review:hover { border-bottom-color: var(--halt-gold-ink); text-decoration: none; }
.helm-halt__readonly {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--halt-gold-ink); opacity: 0.6; border: 1px solid var(--halt-gold-edge);
  border-radius: var(--radius-pill); padding: 1px 7px;
}
`;

injectStyle('helm-haltband-css', CSS);

export interface HaltBandProps extends HTMLAttributes<HTMLDivElement> {
  mode?: 'kill' | 'safe-stop';
  level?: 'G1' | 'G2';
  message?: ReactNode;
  confirmed?: number;
  pending?: number;
  draining?: number;
  pendingCountdown?: string;
  drainingDetail?: ReactNode;
  stillTrue?: ReactNode[];
  reviewHref?: string;
  reviewLabel?: ReactNode;
  readOnly?: boolean;
  showTriad?: boolean;
}

export function HaltBand({
  mode = 'kill',
  level = 'G1',
  message,
  confirmed = 0,
  pending = 0,
  draining = 0,
  pendingCountdown,
  drainingDetail,
  stillTrue,
  reviewHref = '#',
  reviewLabel,
  readOnly = false,
  showTriad = true,
  className = '',
  ...rest
}: HaltBandProps) {
  const g2 = level === 'G2';
  const kill = mode === 'kill';
  const glyph = kill ? (g2 ? '▮▮▮▮' : '▮▮') : '⛊';
  const word = kill ? (g2 ? 'FULL QUIESCE — ALL AGENTS HALTED' : 'KILL-SWITCH ENGAGED') : 'SYSTEM SAFE-STOPPED';
  const defaultSub = kill
    ? 'Destructive & approve/execute paths are refused suite-wide; benign reads continue.'
    : 'A dependency is down, so the system failed closed. This is the safety system working, not an outage.';

  const cls = ['helm-halt', g2 ? 'helm-halt--g2' : '', className].filter(Boolean).join(' ');

  return (
    <div className={cls} role="status" {...rest}>
      <div className="helm-halt__lead">
        <span className="helm-halt__glyph" aria-hidden="true">{glyph}</span>
        <div className="helm-halt__copy">
          <span className="helm-halt__word">{word}</span>
          <span className="helm-halt__sub">{message || defaultSub}</span>
          {stillTrue && stillTrue.length ? (
            <ul className="helm-halt__still">{stillTrue.map((s, i) => <li key={i}>{s}</li>)}</ul>
          ) : null}
        </div>
      </div>
      <div className="helm-halt__aside">
        {showTriad ? (
          <HonestState
            confirmed={confirmed}
            pending={pending}
            draining={draining}
            pendingCountdown={pendingCountdown}
            drainingDetail={drainingDetail}
            summary={false}
          />
        ) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <a className="helm-halt__review" href={reviewHref}>{reviewLabel || 'Review halt'} <span aria-hidden="true">→</span></a>
          {readOnly ? <span className="helm-halt__readonly">read-only · act in {kill ? 'Mission Control' : 'the owning app'}</span> : null}
        </div>
      </div>
    </div>
  );
}

export default HaltBand;
