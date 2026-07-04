import React from 'react';

/* Helm — SuiteSwitcher
   The rail's list of apps the operator can reach. App markers are mono
   2-letter tiles (machine-truth, consistent) rather than mismatched glyphs.
   The suite-wide safety posture is shown ONCE in the rail (see NavRail), not
   per-app here. */

export const HELM_APPS = [
  { key: 'mission-control', code: 'MC', name: 'Mission Control', blurb: 'Cockpit · kill & review', archetype: 'Instrument' },
  { key: 'board',      code: 'BD', name: 'Board',      blurb: 'Plan & approve work',      archetype: 'Instrument' },
  { key: 'notes',      code: 'NT', name: 'Notes',      blurb: 'Author documents',         archetype: 'Workshop' },
  { key: 'library',    code: 'LB', name: 'Library',    blurb: 'Knowledge & ingestion',    archetype: 'Workshop' },
  { key: 'drive',      code: 'DR', name: 'Drive',      blurb: 'Files & previews',          archetype: 'Workshop' },
  { key: 'chat',       code: 'CH', name: 'Chat',       blurb: 'The doorbell',              archetype: 'Workshop' },
  { key: 'gateway',    code: 'GW', name: 'Gateway',    blurb: 'Tool catalog',              archetype: 'Instrument' },
  { key: 'vault',      code: 'VT', name: 'Vault',      blurb: 'Secrets',                   archetype: 'Instrument' },
  { key: 'cmdb',       code: 'DB', name: 'CMDB',       blurb: 'Config & topology',         archetype: 'Instrument' },
  { key: 'auth',       code: 'AU', name: 'auth',       blurb: 'Identity gateway',          archetype: 'Instrument' },
  { key: 'agent-runtime', code: 'AR', name: 'Agent Runtime', blurb: 'Engine room',         archetype: 'Instrument' },
];

const CSS = `
.helm-switch { position: relative; }
.helm-switch__trigger {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  padding: 6px 8px; border-radius: var(--radius-control); cursor: pointer;
  background: var(--surface-inset); border: 1px solid var(--border-default); color: var(--text-primary);
  transition: border-color var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard);
}
.helm-switch__trigger:hover { border-color: var(--border-strong); background: var(--bg-control); }
.helm-switch__trigger:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-tile {
  display: inline-flex; align-items: center; justify-content: center; flex: none;
  width: 24px; height: 24px; border-radius: 5px;
  font-family: var(--font-mono); font-size: 11px; font-weight: 600; letter-spacing: 0.02em;
  background: var(--bg-control); color: var(--text-secondary); border: 1px solid var(--border-strong);
}
.helm-switch__name { font-family: var(--font-ui); font-size: 13px; font-weight: 600; flex: 1; text-align: left; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.helm-switch__chev { color: var(--text-muted); font-size: 11px; }
.helm-switch__panel {
  position: absolute; top: calc(100% + 6px); left: 0; z-index: var(--z-dialog);
  width: 288px; max-height: 380px; overflow: auto;
  background: var(--surface-raised); border: 1px solid var(--border-strong);
  border-radius: var(--radius-panel); box-shadow: var(--shadow-dialog); padding: 6px;
}
.helm-switch__eyebrow { font-family: var(--font-ui); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); padding: 6px 8px 4px; }
.helm-switch__item {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  padding: 6px 8px; border-radius: var(--radius-control); cursor: pointer;
  background: transparent; border: 1px solid transparent; color: var(--text-primary); text-align: left; text-decoration: none;
}
.helm-switch__item:hover { background: var(--bg-control); }
.helm-switch__item.is-current { background: var(--signal-cyan-wash); border-color: #14424F; }
.helm-switch__item.is-current .helm-tile { background: var(--signal-cyan); color: var(--text-on-accent); border-color: transparent; }
.helm-switch__item-name { font-family: var(--font-ui); font-size: 13px; font-weight: 500; }
.helm-switch__item-blurb { font-family: var(--font-ui); font-size: 11px; color: var(--text-muted); }
.helm-switch__arch { margin-left: auto; font-family: var(--font-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-disabled); }
`;

if (typeof document !== 'undefined' && !document.getElementById('helm-suiteswitcher-css')) {
  const s = document.createElement('style');
  s.id = 'helm-suiteswitcher-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export function SuiteSwitcher({
  apps = HELM_APPS,
  current = 'mission-control',
  collapsed = false,
  onSelect,
  className = '',
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);
  const cur = apps.find((a) => a.key === current) || apps[0];

  React.useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  if (collapsed) {
    return (
      <div className={['helm-switch', className].filter(Boolean).join(' ')} ref={rootRef} {...rest}>
        <button className="helm-switch__trigger" style={{ justifyContent: 'center', padding: 6 }} aria-label={`Suite — ${cur.name}`} onClick={() => setOpen((o) => !o)}>
          <span className="helm-tile">{cur.code}</span>
        </button>
        {open ? renderPanel(apps, current, (k) => { setOpen(false); onSelect && onSelect(k); }) : null}
      </div>
    );
  }

  return (
    <div className={['helm-switch', className].filter(Boolean).join(' ')} ref={rootRef} {...rest}>
      <button className="helm-switch__trigger" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="helm-tile">{cur.code}</span>
        <span className="helm-switch__name">{cur.name}</span>
        <span className="helm-switch__chev" aria-hidden="true">{open ? '▴' : '▾'}</span>
      </button>
      {open ? renderPanel(apps, current, (k) => { setOpen(false); onSelect && onSelect(k); }) : null}
    </div>
  );
}

function renderPanel(apps, current, pick) {
  return (
    <div className="helm-switch__panel" role="listbox">
      <div className="helm-switch__eyebrow">Suite</div>
      {apps.map((a) => (
        <button
          key={a.key}
          role="option"
          aria-selected={a.key === current}
          className={['helm-switch__item', a.key === current ? 'is-current' : ''].filter(Boolean).join(' ')}
          onClick={() => pick(a.key)}
        >
          <span className="helm-tile">{a.code}</span>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="helm-switch__item-name">{a.name}</span>
            <span className="helm-switch__item-blurb">{a.blurb}</span>
          </span>
          <span className="helm-switch__arch">{a.archetype}</span>
        </button>
      ))}
    </div>
  );
}
