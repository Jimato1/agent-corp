import React from 'react';

/* Helm — StopActuator
   The press-and-hold control that engages a stop deliberately-but-fast: fill a
   ring over a short dwell (~600ms G1 · ~1000ms G2). Release early = abort.
   NO typing on stops (typing is reserved for the dangerous direction). G2 is
   heavier and must be explicitly FOCUSED (armed) first. Engaging a stop moves
   the system INTO the calm gold safe-posture, so the actuator is halt-gold —
   never red (red is the operator's destructive finger, e.g. LIFTING a stop). */

const CSS = `
.helm-stop {
  display: inline-flex; align-items: center; gap: var(--space-3);
  padding: 6px 14px 6px 8px; border-radius: var(--radius-pill);
  background: var(--surface-raised); border: 1px solid var(--halt-gold-edge);
  cursor: pointer; user-select: none; touch-action: none;
  font-family: var(--font-ui); color: var(--halt-gold-ink);
  transition: border-color var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard);
}
.helm-stop:hover:not(.is-engaged) { border-color: var(--halt-gold); }
.helm-stop:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-stop.is-holding { border-color: var(--halt-gold); background: var(--halt-gold-wash); }
.helm-stop.is-engaged { cursor: default; background: var(--halt-gold-wash); border-color: var(--halt-gold); }
.helm-stop.is-disarmed { opacity: 0.86; }
.helm-stop__ring { position: relative; width: 40px; height: 40px; flex: none; }
.helm-stop__ring svg { transform: rotate(-90deg); display: block; }
.helm-stop__track { stroke: var(--surface-inset); }
.helm-stop__fill { stroke: var(--halt-gold); transition: stroke-dashoffset 40ms linear; }
.helm-stop__glyph {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: var(--halt-gold); font-variant-emoji: text;
}
.helm-stop__glyph--g2 { letter-spacing: -2px; }
.helm-stop__text { display: flex; flex-direction: column; gap: 1px; }
.helm-stop__word {
  font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
}
.helm-stop__hint { font-size: 11px; color: var(--halt-gold-ink); opacity: 0.7; font-family: var(--font-mono); }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-stopactuator-css')) {
  const s = document.createElement('style');
  s.id = 'helm-stopactuator-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

const R = 17;
const C = 2 * Math.PI * R;

export function StopActuator({
  level = 'G1',
  onEngage,
  engaged = false,
  label,
  className = '',
  ...rest
}) {
  const dwell = level === 'G2' ? 1000 : 600;
  const [progress, setProgress] = React.useState(0);
  const [holding, setHolding] = React.useState(false);
  const [armed, setArmed] = React.useState(level !== 'G2');
  const raf = React.useRef(0);
  const startedAt = React.useRef(0);
  const timer = React.useRef(0);

  const stopRaf = () => { if (raf.current) cancelAnimationFrame(raf.current); raf.current = 0; };
  const clearAll = () => { stopRaf(); if (timer.current) clearTimeout(timer.current); timer.current = 0; };

  const begin = () => {
    if (engaged || holding) return;
    if (level === 'G2' && !armed) { setArmed(true); return; }
    setHolding(true);
    startedAt.current = Date.now();
    // Completion runs on a reliable timer so engaging never depends on rAF
    // ticking; the ring fill (below) is cosmetic.
    timer.current = setTimeout(() => {
      clearAll();
      setHolding(false);
      setProgress(0);
      onEngage && onEngage();
    }, dwell);
    const tick = () => {
      const p = Math.min(1, (Date.now() - startedAt.current) / dwell);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const abort = () => { clearAll(); setHolding(false); setProgress(0); };

  React.useEffect(() => () => clearAll(), []);

  const cls = [
    'helm-stop',
    holding ? 'is-holding' : '',
    engaged ? 'is-engaged' : '',
    (level === 'G2' && !armed && !engaged) ? 'is-disarmed' : '',
    className,
  ].filter(Boolean).join(' ');

  const g2 = level === 'G2';
  const ringOffset = engaged ? 0 : C * (1 - progress);
  const glyph = engaged ? (g2 ? '▮▮▮▮' : '▮▮') : '⛔\uFE0E';

  const word = engaged
    ? (g2 ? 'Full quiesce' : 'Stop engaged')
    : (label || (g2 ? 'Hold to full-quiesce' : 'Hold to stop'));
  const hint = engaged
    ? 'safe-stopped'
    : holding ? 'keep holding…'
    : g2 && !armed ? 'focus to arm'
    : g2 ? `hold ~1.0s` : `hold ~0.6s`;

  return (
    <button
      type="button"
      className={cls}
      aria-label={g2 ? 'Full quiesce — press and hold' : 'Stop — press and hold'}
      aria-pressed={engaged}
      disabled={engaged}
      onPointerDown={(e) => { e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId); begin(); }}
      onPointerUp={abort}
      onPointerLeave={abort}
      onPointerCancel={abort}
      onFocus={() => { if (g2) setArmed(true); }}
      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); begin(); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') abort(); }}
      {...rest}
    >
      <span className="helm-stop__ring">
        <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
          <circle className="helm-stop__track" cx="20" cy="20" r={R} fill="none" strokeWidth="3" />
          <circle className="helm-stop__fill" cx="20" cy="20" r={R} fill="none" strokeWidth="3"
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={ringOffset} />
        </svg>
        <span className={`helm-stop__glyph${g2 ? ' helm-stop__glyph--g2' : ''}`} aria-hidden="true">{glyph}</span>
      </span>
      <span className="helm-stop__text">
        <span className="helm-stop__word">{word}</span>
        <span className="helm-stop__hint">{hint}</span>
      </span>
    </button>
  );
}
