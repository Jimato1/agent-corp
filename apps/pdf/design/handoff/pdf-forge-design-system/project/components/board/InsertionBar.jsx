import React from 'react';

let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'insertionbar');
  el.textContent = `
.pf-insert { position:relative; flex:none; align-self:stretch; }
.pf-insert__bar { position:absolute; background:var(--press-500); border-radius:1px; box-shadow:0 0 6px rgba(31,162,196,.5); }
.pf-insert--v { width:2px; }
.pf-insert--v .pf-insert__bar { top:0; bottom:0; left:0; width:2px; }
.pf-insert--v .pf-insert__cap { position:absolute; left:-2px; width:6px; height:2px; background:var(--press-500); border-radius:1px; }
.pf-insert--v .pf-insert__cap--a { top:-1px; }
.pf-insert--v .pf-insert__cap--b { bottom:-1px; }
.pf-insert--h { height:2px; width:100%; }
.pf-insert--h .pf-insert__bar { left:0; right:0; top:0; height:2px; }
.pf-insert--h .pf-insert__cap { position:absolute; top:-2px; height:6px; width:2px; background:var(--press-500); border-radius:1px; }
.pf-insert--h .pf-insert__cap--a { left:-1px; }
.pf-insert--h .pf-insert__cap--b { right:-1px; }
.pf-insert__bar { animation:pf-insert-in var(--mo-fast) var(--ease-out); }
@keyframes pf-insert-in { from { opacity:0; transform:scaleY(.6); } to { opacity:1; transform:none; } }
`;
  document.head.appendChild(el);
}

/**
 * InsertionBar — the drop-gap indicator: a press-blue bar with end-caps that
 * marks exactly where a dragged sheet will land. The single clearest "where it
 * goes" signal during reorder.
 */
export function InsertionBar({ orientation = 'vertical', height, className = '', ...rest }) {
  ensureStyles();
  const v = orientation !== 'horizontal';
  return (
    <div
      className={['pf-insert', v ? 'pf-insert--v' : 'pf-insert--h', className].filter(Boolean).join(' ')}
      style={v && height ? { height } : undefined}
      aria-hidden="true"
      {...rest}
    >
      <div className="pf-insert__bar" />
      <span className="pf-insert__cap pf-insert__cap--a" />
      <span className="pf-insert__cap pf-insert__cap--b" />
    </div>
  );
}

export default InsertionBar;
