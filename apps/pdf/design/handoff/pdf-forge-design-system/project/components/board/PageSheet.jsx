import React from 'react';
import { PageChip } from './PageChip.jsx';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'pagesheet');
  el.textContent = `
.pf-sheet {
  position:relative; flex:none; cursor:grab;
  background:var(--paper-0); border-radius:var(--r-sheet);
  border-bottom:2px solid var(--paper-edge);
  box-shadow:var(--shadow-sheet-rest);
  transition: transform var(--mo-base) var(--ease-out), box-shadow var(--mo-base) var(--ease-out);
  outline:none;
}
.pf-sheet__face { position:absolute; inset:0; border-radius:var(--r-sheet); overflow:hidden; }
.pf-sheet__img { width:100%; height:100%; object-fit:cover; display:block; transform-origin:center; }
.pf-sheet__ph { position:absolute; inset:0; display:flex; flex-direction:column; gap:6px; padding:14% 14% 18%; }
.pf-sheet__ph i { display:block; height:3px; border-radius:1px; background:#dcdcd6; }
.pf-sheet__ph i:nth-child(3n) { width:62%; }
.pf-sheet__ph i:nth-child(5n) { width:80%; }
.pf-sheet__chip { position:absolute; left:-3px; bottom:-6px; z-index:3; }

.pf-sheet:hover { transform:translateY(-1px); box-shadow:var(--shadow-sheet-hover); }
.pf-sheet:hover .pf-sheet__chip .pf-pagechip { color:var(--ink-900); }

/* selected */
.pf-sheet--selected { box-shadow:var(--shadow-sheet-rest); }
.pf-sheet--selected::before {
  content:""; position:absolute; inset:0; border-radius:var(--r-sheet);
  outline:2px solid var(--press-500); outline-offset:-2px; z-index:2; pointer-events:none;
}
.pf-sheet--selected .pf-sheet__face::after {
  content:""; position:absolute; inset:0; background:var(--press-tint); opacity:.26; mix-blend-mode:normal;
}
.pf-sheet__tab {
  position:absolute; top:5px; right:5px; z-index:4; width:17px; height:17px; border-radius:4px;
  background:var(--press-500); display:grid; place-items:center; box-shadow:0 1px 2px rgba(5,7,10,.4);
}
.pf-sheet__tab svg { width:11px; height:11px; display:block; }

/* focus — roving tabindex; 1px dark spacer on paper so the ring holds contrast */
.pf-sheet--focus { box-shadow:0 0 0 1px var(--sub-900), 0 0 0 3px var(--press-500), var(--focus-halo), var(--shadow-sheet-hover); transform:translateY(-1px); }

/* lifted (dragging) */
.pf-sheet--lifted { cursor:grabbing; transform:rotate(1.5deg) scale(1.04); box-shadow:var(--shadow-sheet-lift); opacity:.96; z-index:20; }

/* deleted */
.pf-sheet--deleted { cursor:default; opacity:.55; }
.pf-sheet--deleted .pf-sheet__face::after {
  content:""; position:absolute; inset:0;
  background:linear-gradient(to bottom right, transparent calc(50% - 1px), var(--err-500) 50%, transparent calc(50% + 1px));
  opacity:.7;
}
.pf-sheet__deltab {
  position:absolute; top:0; right:0; z-index:4; width:0; height:0;
  border-style:solid; border-width:0 18px 18px 0; border-color:transparent var(--err-500) transparent transparent;
}

/* loading placeholder */
.pf-sheet--loading { cursor:default; }
.pf-sheet__spin { position:absolute; inset:0; display:grid; place-items:center; color:var(--ink-500); }
.pf-sheet__spin svg { width:20px; height:20px; animation:pf-spin 720ms linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .pf-sheet--lifted { transform:none; }
  .pf-sheet__spin svg { animation:none; }
}
`;
  document.head.appendChild(el);
}

const ISO_PORTRAIT = 210 / 297; // ≈0.707 (w/h)

/**
 * PageSheet — the SIGNATURE object: a PDF page as a physical paper sheet on the
 * workbench. The only bright-white, shadow-casting element in the app.
 */
export function PageSheet({
  page,
  width = 132,
  aspect = ISO_PORTRAIT,
  rotation = 0,
  src,
  selected = false,
  focused = false,
  lifted = false,
  deleted = false,
  loading = false,
  showChip = true,
  onClick,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const rotated = rotation % 180 !== 0;
  const effAspect = rotated ? 1 / aspect : aspect; // swap box for 90/270
  const height = Math.round(width / effAspect);

  const cls = [
    'pf-sheet',
    selected ? 'pf-sheet--selected' : '',
    focused ? 'pf-sheet--focus' : '',
    lifted ? 'pf-sheet--lifted' : '',
    deleted ? 'pf-sheet--deleted' : '',
    loading ? 'pf-sheet--loading' : '',
    className,
  ].filter(Boolean).join(' ');

  // counter-scale the inner image so a rotated page fills the swapped box
  const imgScale = rotated ? effAspect / aspect : 1;

  return (
    <div
      className={cls}
      style={{ width, height }}
      role="button"
      tabIndex={focused ? 0 : -1}
      aria-pressed={selected}
      aria-label={`Page ${page}${deleted ? ' (deleted)' : ''}${rotation ? `, rotated ${rotation}°` : ''}`}
      onClick={onClick}
      {...rest}
    >
      <div className="pf-sheet__face">
        {loading ? (
          <div className="pf-sheet__spin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><circle cx="12" cy="12" r="9" opacity=".25"/><path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round"/></svg></div>
        ) : children ? (
          children
        ) : src ? (
          <img className="pf-sheet__img" src={src} alt="" style={{ transform: `rotate(${rotation}deg) scale(${imgScale})` }} />
        ) : (
          <div className="pf-sheet__ph" style={{ transform: `rotate(${rotation}deg)` }}>
            <i/><i/><i/><i/><i/><i/><i/>
          </div>
        )}
      </div>

      {selected && !deleted ? (
        <span className="pf-sheet__tab" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="#08191f" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
      ) : null}

      {deleted ? <span className="pf-sheet__deltab" aria-hidden="true" /> : null}

      {showChip ? (
        <span className="pf-sheet__chip"><PageChip page={page} rotation={rotation} /></span>
      ) : null}
    </div>
  );
}

export default PageSheet;
