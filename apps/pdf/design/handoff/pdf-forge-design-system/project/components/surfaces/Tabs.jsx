import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'tabs');
  el.textContent = `
.pf-tabs { display:flex; gap:2px; border-bottom:1px solid var(--sub-600); }
.pf-tab {
  appearance:none; background:transparent; border:none; cursor:pointer;
  font-family:var(--font-ui); font-size:13px; font-weight:var(--fw-medium); color:var(--ink-600);
  padding:8px 12px; position:relative; display:inline-flex; align-items:center; gap:7px;
  transition: color var(--mo-fast) var(--ease-inout);
}
.pf-tab:hover { color:var(--ink-700); }
.pf-tab::after {
  content:""; position:absolute; left:8px; right:8px; bottom:-1px; height:2px; border-radius:1px;
  background:var(--press-500); transform:scaleX(0); transform-origin:center;
  transition: transform var(--mo-base) var(--ease-out);
}
.pf-tab[aria-selected="true"] { color:var(--ink-900); }
.pf-tab[aria-selected="true"]::after { transform:scaleX(1); }
.pf-tab:focus-visible { outline:2px solid var(--press-500); outline-offset:-2px; border-radius:3px; }
.pf-tab__count { font-family:var(--font-mono); font-size:11px; color:var(--ink-600); background:var(--sub-700); border-radius:var(--r-pill); padding:1px 6px; font-variant-numeric:tabular-nums; }
.pf-tab[aria-selected="true"] .pf-tab__count { color:var(--ink-900); }
`;
  document.head.appendChild(el);
}

/**
 * Tabs — flat underline tabs with a press-blue active indicator.
 */
export function Tabs({ tabs = [], value, defaultValue, onChange, className = '' }) {
  ensureStyles();
  const [internal, setInternal] = React.useState(defaultValue ?? (tabs[0] && tabs[0].id));
  const active = value !== undefined ? value : internal;

  return (
    <div className={['pf-tabs', className].filter(Boolean).join(' ')} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          className="pf-tab"
          aria-selected={active === t.id}
          onClick={() => { if (value === undefined) setInternal(t.id); onChange && onChange(t.id); }}
        >
          {t.label}
          {t.count != null ? <span className="pf-tab__count">{t.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export default Tabs;
