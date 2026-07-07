import React from 'react';

/* Helm — IconButton
   A square, icon-only control for toolbars, table-row actions, and the header.
   Ghost by default (quiet); inherits the same interaction language as Button. */

const CSS = `
.helm-iconbtn {
  --_s: var(--control-default);
  display: inline-flex; align-items: center; justify-content: center;
  width: var(--_s); height: var(--_s);
  border: 1px solid transparent; border-radius: var(--radius-control);
  background: transparent; color: var(--text-secondary);
  cursor: pointer; font-size: 16px; line-height: 1; user-select: none;
  transition: background var(--dur-fast) var(--ease-standard),
              color var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard);
}
.helm-iconbtn:hover:not([disabled]) { background: var(--bg-control); color: var(--text-primary); }
.helm-iconbtn:active:not([disabled]) { background: var(--surface-inset); }
.helm-iconbtn:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-iconbtn[disabled] { cursor: not-allowed; opacity: 0.4; }
.helm-iconbtn[aria-pressed="true"] { background: var(--signal-cyan-wash); color: var(--signal-cyan-ink); border-color: #14424F; }
.helm-iconbtn--compact { --_s: var(--control-compact); font-size: 15px; }
.helm-iconbtn--large { --_s: var(--control-primary); font-size: 18px; }
.helm-iconbtn--solid { background: var(--bg-control); border-color: var(--border-strong); color: var(--text-primary); }
.helm-iconbtn--solid:hover:not([disabled]) { background: #2E3743; }
.helm-iconbtn--danger:hover:not([disabled]) { background: var(--danger-bg); color: var(--danger-text); }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-iconbutton-css')) {
  const s = document.createElement('style');
  s.id = 'helm-iconbutton-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function IconButton({
  icon,
  label,
  size = 'default',
  variant = 'ghost',
  pressed,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = [
    'helm-iconbtn',
    size !== 'default' ? `helm-iconbtn--${size}` : '',
    variant !== 'ghost' ? `helm-iconbtn--${variant}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={cls}
      disabled={disabled}
      aria-label={label}
      title={label}
      aria-pressed={typeof pressed === 'boolean' ? pressed : undefined}
      {...rest}
    >
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}
