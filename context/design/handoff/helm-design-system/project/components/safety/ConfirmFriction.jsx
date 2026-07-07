import React from 'react';
import { HonestState } from './HonestState.jsx';

/* Helm — ConfirmFriction (the step-up confirm ceremony)
   The single gate for every dangerous op suite-wide. A modal with a
   plain-language consequence block (scope, irreversibility, DIRECTION, blast
   radius, and the live honest-state echo), a typed-intent field, and — for
   high-stakes ops — a step-up re-authentication (a fresh identity check, not a
   local password box).
   Two intensities:
     light → engaging SAFETY (a stop, a revoke — toward LESS action): calm cyan
             single-confirm.
     full  → toward MORE action or anything irreversible: red variant with
             typed-intent + step-up.
   Esc closes to the safe (Cancel) default. Shift+Esc jumps focus to the halt
   control (focuses, never fires). The dialog can never hide the halt control
   (the halt renders at a higher layer, z-halt > z-dialog). */

const CSS = `
.helm-confirm-scrim {
  position: fixed; inset: 0; z-index: var(--z-scrim);
  background: var(--scrim);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 8vh var(--space-6) var(--space-6);
  animation: helm-confirm-fade var(--dur-base) var(--ease-standard);
}
@keyframes helm-confirm-fade { from { opacity: 0; } to { opacity: 1; } }
.helm-confirm {
  position: relative; z-index: var(--z-dialog);
  width: 100%; max-width: 560px;
  background: var(--surface-raised); border: 1px solid var(--border-strong);
  border-radius: var(--radius-panel); box-shadow: var(--shadow-dialog);
  overflow: hidden;
}
.helm-confirm__top { height: 3px; }
.helm-confirm--light .helm-confirm__top { background: var(--signal-cyan); }
.helm-confirm--full .helm-confirm__top { background: var(--danger); }
.helm-confirm__head { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4) var(--space-6) var(--space-3); }
.helm-confirm__glyph { font-size: 20px; line-height: 24px; flex: none; }
.helm-confirm--light .helm-confirm__glyph { color: var(--signal-cyan); }
.helm-confirm--full .helm-confirm__glyph { color: var(--danger); }
.helm-confirm__title { font-family: var(--font-ui); font-size: 16px; line-height: 22px; font-weight: 600; color: var(--text-primary); }
.helm-confirm__eyebrow { font-family: var(--font-ui); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 2px; }
.helm-confirm__body { padding: 0 var(--space-6) var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.helm-confirm__consequence {
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control); padding: var(--space-3) var(--space-4);
  font-family: var(--font-ui); font-size: 13px; line-height: 20px; color: var(--text-secondary);
}
.helm-confirm__consequence strong { color: var(--text-primary); font-weight: 600; }
.helm-confirm__meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--space-2); }
.helm-confirm__tag {
  display: inline-flex; align-items: center; gap: 5px; height: 20px; padding: 0 8px;
  border-radius: var(--radius-pill); font-family: var(--font-ui); font-size: 11px; font-weight: 600;
  letter-spacing: 0.02em; border: 1px solid;
}
.helm-confirm__tag--more { background: var(--danger-bg); color: var(--danger-text); border-color: #5A2420; }
.helm-confirm__tag--less { background: var(--signal-cyan-wash); color: var(--signal-cyan-ink); border-color: #14424F; }
.helm-confirm__tag--irrev { background: var(--danger-bg); color: var(--danger-text); border-color: #5A2420; }
.helm-confirm__echo-label, .helm-confirm__field-label {
  font-family: var(--font-ui); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted); margin-bottom: 6px;
}
.helm-confirm__intent {
  width: 100%; height: var(--control-default); padding: 0 10px;
  background: var(--surface-inset); border: 1px solid var(--border-strong);
  border-radius: var(--radius-control); color: var(--text-primary);
  font-family: var(--font-mono); font-size: 13px; outline: none;
}
.helm-confirm__intent:focus { border-color: var(--danger); box-shadow: 0 0 0 2px rgba(229,89,78,0.35); }
.helm-confirm__intent.is-ok { border-color: var(--state-green); }
.helm-confirm__intent-hint { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 5px; }
.helm-confirm__intent-hint b { color: var(--text-secondary); font-weight: 600; }
.helm-confirm__stepup {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control); padding: var(--space-3) var(--space-4);
}
.helm-confirm__stepup-txt { font-family: var(--font-ui); font-size: 12px; line-height: 17px; color: var(--text-secondary); }
.helm-confirm__stepup.is-done { border-color: #1E5140; }
.helm-confirm__stepup.is-done .helm-confirm__stepup-txt { color: var(--state-green-ink); }
.helm-confirm__audit { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.helm-confirm__foot {
  display: flex; align-items: center; justify-content: flex-end; gap: var(--space-2);
  padding: var(--space-3) var(--space-6); border-top: 1px solid var(--border-default);
  background: var(--surface-panel);
}
.helm-cf-btn {
  display: inline-flex; align-items: center; gap: 7px; height: var(--control-default); padding: 0 16px;
  border-radius: var(--radius-control); font-family: var(--font-ui); font-size: 13px; font-weight: 600;
  border: 1px solid transparent; cursor: pointer;
  transition: background var(--dur-fast) var(--ease-standard);
}
.helm-cf-btn:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-cf-btn--cancel { background: transparent; color: var(--text-secondary); }
.helm-cf-btn--cancel:hover { background: var(--bg-control); color: var(--text-primary); }
.helm-cf-btn--confirm-light { background: var(--interactive); color: var(--text-on-accent); }
.helm-cf-btn--confirm-light:hover { background: var(--interactive-hover); }
.helm-cf-btn--confirm-full { background: var(--danger); color: #2C1210; }
.helm-cf-btn--confirm-full:hover { background: var(--danger-red-hover); }
.helm-cf-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-confirm-css')) {
  const s = document.createElement('style');
  s.id = 'helm-confirm-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function ConfirmFriction({
  open = false,
  intensity = 'full',
  eyebrow = 'Confirm ceremony',
  title,
  consequence,
  direction = 'more',
  irreversible = false,
  blastRadius,
  honest,
  typedIntent,
  stepUp = false,
  confirmLabel,
  auditNote,
  onConfirm,
  onCancel,
  onEscapeToHalt,
  className = '',
  ...rest
}) {
  const full = intensity === 'full';
  const [typed, setTyped] = React.useState('');
  const [stepped, setStepped] = React.useState(false);
  const dialogRef = React.useRef(null);
  const cancelRef = React.useRef(null);

  React.useEffect(() => {
    if (open) {
      setTyped('');
      setStepped(false);
      // focus the safe default (Cancel)
      const t = setTimeout(() => { cancelRef.current && cancelRef.current.focus(); }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  if (!open) return null;

  const intentOk = !typedIntent || typed.trim() === typedIntent;
  const stepOk = !stepUp || stepped;
  const canConfirm = intentOk && stepOk;

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (e.shiftKey) { onEscapeToHalt && onEscapeToHalt(); }
      else { onCancel && onCancel(); }
    }
    // minimal focus trap
    if (e.key === 'Tab') {
      const f = dialogRef.current.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  };

  return (
    <div className="helm-confirm-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel && onCancel(); }}>
      <div
        ref={dialogRef}
        className={['helm-confirm', full ? 'helm-confirm--full' : 'helm-confirm--light', className].filter(Boolean).join(' ')}
        role="dialog" aria-modal="true" aria-label={title}
        onKeyDown={onKeyDown}
        {...rest}
      >
        <div className="helm-confirm__top"></div>
        <div className="helm-confirm__head">
          <span className="helm-confirm__glyph" aria-hidden="true">{full ? '⚠' : '⛊'}</span>
          <div>
            <div className="helm-confirm__eyebrow">{eyebrow}</div>
            <div className="helm-confirm__title">{title}</div>
          </div>
        </div>

        <div className="helm-confirm__body">
          <div className="helm-confirm__consequence">
            {consequence}
            <div className="helm-confirm__meta">
              <span className={`helm-confirm__tag helm-confirm__tag--${direction === 'more' ? 'more' : 'less'}`}>
                <span aria-hidden="true">{direction === 'more' ? '↑' : '↓'}</span>
                {direction === 'more' ? 'Moves toward MORE real-world action' : 'Moves toward LESS action'}
              </span>
              {irreversible ? <span className="helm-confirm__tag helm-confirm__tag--irrev"><span aria-hidden="true">⚠</span> Irreversible in flight</span> : null}
              {blastRadius ? <span className="helm-confirm__tag helm-confirm__tag--less" style={{ background: 'var(--bg-control)', color: 'var(--text-secondary)', borderColor: 'var(--border-strong)' }}>Blast radius: {blastRadius}</span> : null}
            </div>
          </div>

          {honest
            ? <div>
                <div className="helm-confirm__echo-label">Live honest-state echo</div>
                <HonestState {...honest} summary />
              </div>
            : null}

          {full && typedIntent
            ? <div>
                <div className="helm-confirm__field-label">Type to confirm intent</div>
                <input
                  className={['helm-confirm__intent', intentOk && typed ? 'is-ok' : ''].filter(Boolean).join(' ')}
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={typedIntent}
                  spellCheck={false}
                  autoComplete="off"
                  aria-label={`Type ${typedIntent} to confirm`}
                />
                <div className="helm-confirm__intent-hint">type exactly <b>{typedIntent}</b></div>
              </div>
            : null}

          {stepUp
            ? <div className={['helm-confirm__stepup', stepped ? 'is-done' : ''].filter(Boolean).join(' ')}>
                <span className="helm-confirm__stepup-txt">
                  {stepped ? '✔ Identity re-verified for this action.' : 'High-stakes: a fresh identity check is required (not a password box).'}
                </span>
                {!stepped
                  ? <button type="button" className="helm-cf-btn helm-cf-btn--confirm-light" onClick={() => setStepped(true)}>Re-authenticate</button>
                  : null}
              </div>
            : null}

          {auditNote
            ? <div className="helm-confirm__audit"><span aria-hidden="true">⛓</span> {auditNote}</div>
            : null}
        </div>

        <div className="helm-confirm__foot">
          <button ref={cancelRef} type="button" className="helm-cf-btn helm-cf-btn--cancel" onClick={() => onCancel && onCancel()}>Cancel</button>
          <button
            type="button"
            className={`helm-cf-btn ${full ? 'helm-cf-btn--confirm-full' : 'helm-cf-btn--confirm-light'}`}
            disabled={!canConfirm}
            onClick={() => canConfirm && onConfirm && onConfirm()}
          >
            {full && direction === 'more' ? <span aria-hidden="true">⚠</span> : null}
            {confirmLabel || (full ? 'Confirm' : 'Confirm safely')}
          </button>
        </div>
      </div>
    </div>
  );
}
