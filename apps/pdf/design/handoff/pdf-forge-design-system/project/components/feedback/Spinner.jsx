import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'spinner');
  el.textContent = `
.pf-spinner { display:inline-block; flex:none; color:var(--ink-600); }
.pf-spinner svg { display:block; animation:pf-spin 720ms linear infinite; }
.pf-spinner__track { stroke:currentColor; opacity:.22; }
.pf-spinner__head { stroke:currentColor; }
.pf-spinner--proc { color:var(--proc-500); }
.pf-spinner--accent { color:var(--press-500); }
.pf-spinner--ink { color:var(--ink-700); }
@media (prefers-reduced-motion: reduce) {
  /* No spin: show a static three-quarter ring (state, not motion). */
  .pf-spinner svg { animation:none; }
}
`;
  document.head.appendChild(el);
}

/**
 * Spinner — an indeterminate activity ring. The API exposes no progress for
 * many jobs, so a spinner (not a bar) is the default "working" cue.
 */
export function Spinner({ size = 16, tone = 'default', strokeWidth = 2.4, className = '', label = 'Loading', ...rest }) {
  ensureStyles();
  const toneCls = tone === 'proc' ? 'pf-spinner--proc' : tone === 'accent' ? 'pf-spinner--accent' : tone === 'ink' ? 'pf-spinner--ink' : '';
  const r = (24 - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={['pf-spinner', toneCls, className].filter(Boolean).join(' ')} role="status" aria-label={label} style={{ width: size, height: size }} {...rest}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle className="pf-spinner__track" cx="12" cy="12" r={r} strokeWidth={strokeWidth} />
        <circle className="pf-spinner__head" cx="12" cy="12" r={r} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * 0.72} />
      </svg>
    </span>
  );
}

export default Spinner;
