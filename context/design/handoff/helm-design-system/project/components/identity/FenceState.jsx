import React from 'react';

/* Helm — FenceState
   Whether an agent's claim on a resource is still live:
     held    → 🔒 gen 47 · lease 04:12 · ♥ 0.8s   (neutral — a held lock is NOT green)
     aging   → the heartbeat drifts amber as it ages
     superseded → ⚠ gen 46 SUPERSEDED by gen 47   (a "zombie": lock lost, agent
                  still thinks it holds it)
   Green is reserved for external-verifier confirmation, never a held lock.
   Some apps show fencing ADVISORY-ONLY (greyed, tagged "advisory") because
   they don't enforce on it. */

const CSS = `
.helm-fence {
  display: inline-flex; align-items: center; gap: 8px;
  height: 22px; padding: 0 9px;
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  font-family: var(--font-mono); font-size: 12px; line-height: 1;
  font-feature-settings: var(--figures-tabular); white-space: nowrap;
  color: var(--text-secondary);
}
.helm-fence__seg { display: inline-flex; align-items: center; gap: 4px; }
.helm-fence__lock { font-family: var(--font-ui); font-size: 12px; color: var(--text-muted); }
.helm-fence__dim { color: var(--text-muted); }
.helm-fence__heart { color: var(--state-green); }
.helm-fence.is-aging { border-color: #5A4A1E; }
.helm-fence.is-aging .helm-fence__heart { color: var(--state-amber); }
.helm-fence.is-superseded {
  background: var(--state-amber-wash); border-color: #7A5A1E; color: var(--state-amber-ink);
}
.helm-fence.is-superseded .helm-fence__lock { color: var(--state-amber); }
.helm-fence__super { font-family: var(--font-ui); font-weight: 600; letter-spacing: 0.03em; }
.helm-fence.is-advisory { opacity: 0.6; }
.helm-fence__advisory {
  font-family: var(--font-ui); font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
  text-transform: uppercase; color: var(--text-muted);
  border: 1px solid var(--border-strong); border-radius: var(--radius-pill); padding: 0 5px; height: 14px;
  display: inline-flex; align-items: center;
}
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-fencestate-css')) {
  const s = document.createElement('style');
  s.id = 'helm-fencestate-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function FenceState({
  gen,
  lease,
  heartbeat,
  state = 'held',
  supersededBy,
  advisory = false,
  className = '',
  ...rest
}) {
  const cls = [
    'helm-fence',
    state === 'aging' ? 'is-aging' : '',
    state === 'superseded' ? 'is-superseded' : '',
    advisory ? 'is-advisory' : '',
    className,
  ].filter(Boolean).join(' ');

  if (state === 'superseded') {
    return (
      <span className={cls} {...rest}>
        <span className="helm-fence__lock" aria-hidden="true">⚠</span>
        <span className="helm-fence__super">gen {gen} SUPERSEDED{supersededBy != null ? ` by gen ${supersededBy}` : ''}</span>
        {advisory ? <span className="helm-fence__advisory">advisory</span> : null}
      </span>
    );
  }

  return (
    <span className={cls} {...rest}>
      <span className="helm-fence__seg">
        <span className="helm-fence__lock" aria-hidden="true">🔒</span>
        <span>gen {gen}</span>
      </span>
      {lease != null ? <span className="helm-fence__seg"><span className="helm-fence__dim">lease</span> {lease}</span> : null}
      {heartbeat != null ? <span className="helm-fence__seg"><span className="helm-fence__heart" aria-hidden="true">♥</span> {heartbeat}</span> : null}
      {advisory ? <span className="helm-fence__advisory">advisory</span> : null}
    </span>
  );
}
