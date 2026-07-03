import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'tooltip');
  el.textContent = `
.pf-tip-wrap { position:relative; display:inline-flex; }
.pf-tip {
  position:absolute; z-index:70; pointer-events:none;
  background:var(--sub-900); color:var(--ink-900); border:1px solid var(--sub-600);
  font-family:var(--font-ui); font-size:11px; line-height:15px; font-weight:var(--fw-medium);
  padding:5px 8px; border-radius:var(--r-ctl); white-space:nowrap; max-width:240px;
  box-shadow:0 8px 20px rgba(5,7,10,.5);
  opacity:0; transform:translateY(2px); transition:opacity var(--mo-fast) var(--ease-out), transform var(--mo-fast) var(--ease-out);
}
.pf-tip__kbd { font-family:var(--font-mono); color:var(--ink-600); margin-left:6px; font-size:10px; }
.pf-tip-wrap[data-show="true"] .pf-tip { opacity:1; transform:none; }
.pf-tip--top    { bottom:100%; left:50%; transform:translate(-50%,2px); margin-bottom:7px; }
.pf-tip-wrap[data-show="true"] .pf-tip--top { transform:translate(-50%,0); }
.pf-tip--bottom { top:100%; left:50%; transform:translate(-50%,-2px); margin-top:7px; }
.pf-tip-wrap[data-show="true"] .pf-tip--bottom { transform:translate(-50%,0); }
.pf-tip--left   { right:100%; top:50%; transform:translate(2px,-50%); margin-right:7px; }
.pf-tip-wrap[data-show="true"] .pf-tip--left { transform:translate(0,-50%); }
.pf-tip--right  { left:100%; top:50%; transform:translate(-2px,-50%); margin-left:7px; }
.pf-tip-wrap[data-show="true"] .pf-tip--right { transform:translate(0,-50%); }
`;
  document.head.appendChild(el);
}

/**
 * Tooltip — a dark hover/focus hint. Pass `kbd` to show a keyboard shortcut
 * in mono (this is a keyboard-first instrument).
 */
export function Tooltip({ label, kbd, placement = 'top', delay = 280, className = '', children }) {
  ensureStyles();
  const [show, setShow] = React.useState(false);
  const timer = React.useRef(null);
  const open = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setShow(true), delay); };
  const close = () => { clearTimeout(timer.current); setShow(false); };
  React.useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <span
      className={['pf-tip-wrap', className].filter(Boolean).join(' ')}
      data-show={show ? 'true' : 'false'}
      onMouseEnter={open}
      onMouseLeave={close}
      onFocusCapture={() => setShow(true)}
      onBlurCapture={close}
    >
      {children}
      <span role="tooltip" className={`pf-tip pf-tip--${placement}`}>
        {label}{kbd ? <span className="pf-tip__kbd">{kbd}</span> : null}
      </span>
    </span>
  );
}

export default Tooltip;
