import type { HTMLAttributes } from 'react';
import { injectStyle } from '../../lib/helmStyle';

/* Helm — FenceState
   Whether an agent's claim on a resource is still live. A held lock is NEUTRAL,
   not green (green is external-verifier only). As the heartbeat ages it drifts
   amber; a lost lock becomes a "zombie" — ⚠ SUPERSEDED. Some apps render this
   advisory-only (greyed). Chat renders fencing ADVISORY-ONLY. */

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

injectStyle('helm-fencestate-css', CSS);

export interface FenceStateProps extends HTMLAttributes<HTMLSpanElement> {
  gen: number | string;
  lease?: string;
  heartbeat?: string;
  state?: 'held' | 'aging' | 'superseded';
  supersededBy?: number | string;
  advisory?: boolean;
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
}: FenceStateProps) {
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

export default FenceState;
