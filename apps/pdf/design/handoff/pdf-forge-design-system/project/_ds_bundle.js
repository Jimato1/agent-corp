/* @ds-bundle: {"format":3,"namespace":"PDFForgeDesignSystem_ec4ef3","components":[{"name":"InsertionBar","sourcePath":"components/board/InsertionBar.jsx"},{"name":"PageChip","sourcePath":"components/board/PageChip.jsx"},{"name":"PageSheet","sourcePath":"components/board/PageSheet.jsx"},{"name":"InlineBanner","sourcePath":"components/feedback/InlineBanner.jsx"},{"name":"PressIndicator","sourcePath":"components/feedback/PressIndicator.jsx"},{"name":"Spinner","sourcePath":"components/feedback/Spinner.jsx"},{"name":"Toast","sourcePath":"components/feedback/Toast.jsx"},{"name":"ToastViewport","sourcePath":"components/feedback/Toast.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"IconButton","sourcePath":"components/forms/IconButton.jsx"},{"name":"Input","sourcePath":"components/forms/Input.jsx"},{"name":"Radio","sourcePath":"components/forms/Radio.jsx"},{"name":"RadioGroup","sourcePath":"components/forms/Radio.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Slider","sourcePath":"components/forms/Slider.jsx"},{"name":"Switch","sourcePath":"components/forms/Switch.jsx"},{"name":"Dialog","sourcePath":"components/overlays/Dialog.jsx"},{"name":"Panel","sourcePath":"components/surfaces/Panel.jsx"},{"name":"SegmentedControl","sourcePath":"components/surfaces/SegmentedControl.jsx"},{"name":"StatusPill","sourcePath":"components/surfaces/StatusPill.jsx"},{"name":"Tabs","sourcePath":"components/surfaces/Tabs.jsx"},{"name":"Tag","sourcePath":"components/surfaces/Tag.jsx"}],"sourceHashes":{"components/board/InsertionBar.jsx":"2c389346d50f","components/board/PageChip.jsx":"ddd33a7efed0","components/board/PageSheet.jsx":"b1a9d6c3344e","components/feedback/InlineBanner.jsx":"60bd06fccf2e","components/feedback/PressIndicator.jsx":"3461e706b783","components/feedback/Spinner.jsx":"eddbd264db2d","components/feedback/Toast.jsx":"d4c22a9589ad","components/feedback/Tooltip.jsx":"17e1ccb2329a","components/forms/Button.jsx":"780c34c0830f","components/forms/Checkbox.jsx":"ad547d260e5e","components/forms/IconButton.jsx":"62b4a340053f","components/forms/Input.jsx":"ed1d71eb1c5a","components/forms/Radio.jsx":"cbe2c3b65929","components/forms/Select.jsx":"e2516929f53a","components/forms/Slider.jsx":"b16edf99a8a8","components/forms/Switch.jsx":"2266abccb810","components/overlays/Dialog.jsx":"be6e91a59460","components/surfaces/Panel.jsx":"c673b0131823","components/surfaces/SegmentedControl.jsx":"e638ac591cf0","components/surfaces/StatusPill.jsx":"4e095e536e0f","components/surfaces/Tabs.jsx":"bc03fd873ed8","components/surfaces/Tag.jsx":"426062810a9f","flows/_shared/kit.jsx":"23e8f027b194","flows/flow-a/data.js":"5a7a84430313","flows/flow-a/frames.jsx":"5d4b30370837","flows/flow-a/parts.jsx":"2c3815584b56","flows/flow-b/data.js":"120cbec0389d","flows/flow-b/framesA.jsx":"bd9514d32604","flows/flow-b/framesB.jsx":"1317bf021e1d","flows/flow-b/inspector.jsx":"c825598c42bd","flows/flow-c/data.js":"f0156a5fa90a","flows/flow-c/frames.jsx":"6f4f1f524aba","flows/flow-c/parts.jsx":"6a53999a7af6","flows/flow-d/data.js":"be239d308bc0","flows/flow-d/framesA.jsx":"e0035aefb320","flows/flow-d/framesB.jsx":"35168669b319","flows/flow-d/parts.jsx":"460229c198b7","flows/flow-e/data.js":"947254fec9ee","flows/flow-e/frames.jsx":"7ac5bb4380be","flows/flow-e/parts.jsx":"7beb57e41eb6","flows/flow-f/data.js":"d65e0d050449","flows/flow-f/framesA.jsx":"de00be245788","flows/flow-f/framesB.jsx":"c6f604280edf","flows/flow-f/framesC.jsx":"2cd2f5eb7cca","flows/flow-f/inspector.jsx":"5e69bae66a44","flows/flow-f/parts.jsx":"4bd42d241df7","ui_kits/workbench/BoardHeader.jsx":"9c169f5dae5c","ui_kits/workbench/Inspector.jsx":"4ce54b900fb7","ui_kits/workbench/Rail.jsx":"cdf9b5a5892a","ui_kits/workbench/Workbench.jsx":"65e65c0640e3","ui_kits/workbench/Worksurface.jsx":"f83785337201","ui_kits/workbench/data.js":"fca3b97599e8","ui_kits/workbench/icons.jsx":"03ee4e5dea12"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PDFForgeDesignSystem_ec4ef3 = window.PDFForgeDesignSystem_ec4ef3 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/board/InsertionBar.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function InsertionBar({
  orientation = 'vertical',
  height,
  className = '',
  ...rest
}) {
  ensureStyles();
  const v = orientation !== 'horizontal';
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-insert', v ? 'pf-insert--v' : 'pf-insert--h', className].filter(Boolean).join(' '),
    style: v && height ? {
      height
    } : undefined,
    "aria-hidden": "true"
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "pf-insert__bar"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pf-insert__cap pf-insert__cap--a"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pf-insert__cap pf-insert__cap--b"
  }));
}
Object.assign(__ds_scope, { InsertionBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/board/InsertionBar.jsx", error: String((e && e.message) || e) }); }

// components/board/PageChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'pagechip');
  el.textContent = `
.pf-pagechip {
  display:inline-flex; align-items:center; gap:4px;
  height:18px; padding:0 7px; border-radius:var(--r-pill);
  background:rgba(14,17,22,.82); color:var(--ink-900);
  font-family:var(--font-mono); font-size:11px; line-height:1;
  font-variant-numeric:tabular-nums lining-nums; white-space:nowrap;
  backdrop-filter:saturate(1.2) blur(1px);
}
.pf-pagechip--bare { background:var(--sub-700); }
.pf-pagechip__rot { display:inline-flex; align-items:center; gap:2px; color:var(--press-400); }
.pf-pagechip__rot svg { width:10px; height:10px; display:block; }
`;
  document.head.appendChild(el);
}

/**
 * PageChip — the mono page-number chip that rides a sheet's corner. Tabular
 * figures keep 9 → 10 → 100 from shifting. Shows a rotation glyph when turned.
 */
function PageChip({
  page,
  rotation = 0,
  bare = false,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['pf-pagechip', bare ? 'pf-pagechip--bare' : '', className].filter(Boolean).join(' ')
  }, rest), page, rotation ? /*#__PURE__*/React.createElement("span", {
    className: "pf-pagechip__rot"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 1 1-2.64-6.36"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "21 3 21 9 15 9"
  })), rotation, "\xB0") : null);
}
Object.assign(__ds_scope, { PageChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/board/PageChip.jsx", error: String((e && e.message) || e) }); }

// components/board/PageSheet.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function PageSheet({
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
  const cls = ['pf-sheet', selected ? 'pf-sheet--selected' : '', focused ? 'pf-sheet--focus' : '', lifted ? 'pf-sheet--lifted' : '', deleted ? 'pf-sheet--deleted' : '', loading ? 'pf-sheet--loading' : '', className].filter(Boolean).join(' ');

  // counter-scale the inner image so a rotated page fills the swapped box
  const imgScale = rotated ? effAspect / aspect : 1;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    style: {
      width,
      height
    },
    role: "button",
    tabIndex: focused ? 0 : -1,
    "aria-pressed": selected,
    "aria-label": `Page ${page}${deleted ? ' (deleted)' : ''}${rotation ? `, rotated ${rotation}°` : ''}`,
    onClick: onClick
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "pf-sheet__face"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    className: "pf-sheet__spin"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9",
    opacity: ".25"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 0 0-9-9",
    strokeLinecap: "round"
  }))) : children ? children : src ? /*#__PURE__*/React.createElement("img", {
    className: "pf-sheet__img",
    src: src,
    alt: "",
    style: {
      transform: `rotate(${rotation}deg) scale(${imgScale})`
    }
  }) : /*#__PURE__*/React.createElement("div", {
    className: "pf-sheet__ph",
    style: {
      transform: `rotate(${rotation}deg)`
    }
  }, /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null), /*#__PURE__*/React.createElement("i", null))), selected && !deleted ? /*#__PURE__*/React.createElement("span", {
    className: "pf-sheet__tab",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "#08191f",
    strokeWidth: "3.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M20 6 9 17l-5-5"
  }))) : null, deleted ? /*#__PURE__*/React.createElement("span", {
    className: "pf-sheet__deltab",
    "aria-hidden": "true"
  }) : null, showChip ? /*#__PURE__*/React.createElement("span", {
    className: "pf-sheet__chip"
  }, /*#__PURE__*/React.createElement(__ds_scope.PageChip, {
    page: page,
    rotation: rotation
  })) : null);
}
Object.assign(__ds_scope, { PageSheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/board/PageSheet.jsx", error: String((e && e.message) || e) }); }

// components/feedback/InlineBanner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'banner');
  el.textContent = `
.pf-banner {
  display:flex; gap:10px; align-items:flex-start;
  padding:11px 12px 11px 13px; border-radius:var(--r-ctl);
  border:1px solid var(--sub-600); border-left:3px solid var(--ink-600);
  background:var(--sub-800); color:var(--ink-900);
  font-family:var(--font-ui); font-size:13px; line-height:18px;
}
.pf-banner__icon { flex:none; margin-top:1px; color:var(--ink-600); }
.pf-banner__icon svg { width:16px; height:16px; display:block; }
.pf-banner__body { flex:1; min-width:0; display:flex; flex-direction:column; gap:3px; }
.pf-banner__title { font-weight:var(--fw-semibold); display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.pf-banner__code { font-family:var(--font-mono); font-size:11px; color:inherit; opacity:.85; background:rgba(0,0,0,.22); padding:1px 6px; border-radius:3px; }
.pf-banner__msg { color:var(--ink-700); }
.pf-banner__actions { display:flex; gap:8px; margin-top:7px; }
.pf-banner__x { flex:none; background:transparent; border:none; cursor:pointer; color:var(--ink-600); padding:2px; border-radius:3px; margin:-2px -2px 0 0; }
.pf-banner__x:hover { background:var(--sub-600); color:var(--ink-900); }
.pf-banner__x svg { width:14px; height:14px; display:block; }

.pf-banner--err  { background:var(--err-tint);  border-color:rgba(217,89,76,.4);  border-left-color:var(--err-500); }
.pf-banner--err  .pf-banner__icon { color:var(--err-500); }
.pf-banner--ok   { background:var(--ok-tint);   border-color:rgba(75,174,126,.4); border-left-color:var(--ok-500); }
.pf-banner--ok   .pf-banner__icon { color:var(--ok-500); }
.pf-banner--warn { background:rgba(214,165,60,.12); border-color:rgba(214,165,60,.4); border-left-color:var(--warn-500); }
.pf-banner--warn .pf-banner__icon { color:var(--warn-500); }
.pf-banner--info { border-left-color:var(--press-500); }
.pf-banner--info .pf-banner__icon { color:var(--press-400); }
`;
  document.head.appendChild(el);
}
const ICONS = {
  err: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4M12 16h.01"
  })),
  ok: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8.5 12 2.4 2.4 4.6-4.8"
  })),
  warn: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4M12 17h.01"
  })),
  info: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11v5M12 8h.01"
  }))
};

/**
 * InlineBanner — a status banner with a left accent rule. Errors surface the
 * machine `code` in mono. Use inline near the thing it describes (not floating).
 */
function InlineBanner({
  status = 'info',
  title,
  code,
  children,
  actions,
  onDismiss,
  icon,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-banner', `pf-banner--${status}`, className].filter(Boolean).join(' '),
    role: status === 'err' ? 'alert' : 'status'
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "pf-banner__icon"
  }, icon || ICONS[status]), /*#__PURE__*/React.createElement("div", {
    className: "pf-banner__body"
  }, title ? /*#__PURE__*/React.createElement("div", {
    className: "pf-banner__title"
  }, /*#__PURE__*/React.createElement("span", null, title), code ? /*#__PURE__*/React.createElement("code", {
    className: "pf-banner__code"
  }, code) : null) : null, children ? /*#__PURE__*/React.createElement("div", {
    className: "pf-banner__msg"
  }, children) : null, actions ? /*#__PURE__*/React.createElement("div", {
    className: "pf-banner__actions"
  }, actions) : null), onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pf-banner__x",
    "aria-label": "Dismiss",
    onClick: onDismiss
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))) : null);
}
Object.assign(__ds_scope, { InlineBanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/InlineBanner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/PressIndicator.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'pressindicator');
  el.textContent = `
.pf-press {
  position:relative; overflow:hidden; isolation:isolate;
  display:flex; align-items:center; gap:12px;
  padding:13px 15px; border-radius:var(--r-panel);
  background:var(--sub-800); border:1px solid var(--sub-600);
  font-family:var(--font-ui);
}
.pf-press__sweep { position:absolute; inset:0; z-index:-1; opacity:0; }
.pf-press--processing .pf-press__sweep { opacity:1; }
.pf-press__sweep::before {
  content:""; position:absolute; top:0; bottom:0; width:38%;
  background:linear-gradient(90deg, transparent, rgba(224,138,60,.16), transparent);
  animation:pf-proc-sweep var(--proc-loop) var(--ease-press) infinite;
}
.pf-press__lamp {
  width:32px; height:32px; flex:none; border-radius:var(--r-pill);
  display:grid; place-items:center; position:relative;
  background:var(--sub-700); border:1px solid var(--sub-600); color:var(--ink-600);
}
.pf-press__lamp svg { width:17px; height:17px; display:block; }
.pf-press--processing .pf-press__lamp { color:var(--proc-500); border-color:rgba(224,138,60,.5); }
.pf-press--processing .pf-press__lamp::after {
  content:""; position:absolute; inset:-1px; border-radius:var(--r-pill);
  box-shadow:0 0 0 0 rgba(224,138,60,.45); animation:pf-press-ring var(--proc-loop) var(--ease-press) infinite;
}
@keyframes pf-press-ring { 0%{ box-shadow:0 0 0 0 rgba(224,138,60,.5);} 70%{ box-shadow:0 0 0 7px rgba(224,138,60,0);} 100%{ box-shadow:0 0 0 0 rgba(224,138,60,0);} }
.pf-press--success .pf-press__lamp { color:var(--ok-500);  border-color:rgba(75,174,126,.5); background:var(--ok-tint); }
.pf-press--error   .pf-press__lamp { color:var(--err-500); border-color:rgba(217,89,76,.5); background:var(--err-tint); }
.pf-press__body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.pf-press__label { font-size:13px; font-weight:var(--fw-semibold); color:var(--ink-900); display:flex; align-items:center; gap:8px; }
.pf-press--processing .pf-press__label { color:var(--proc-500); }
.pf-press--error .pf-press__label { color:var(--ink-900); }
.pf-press__code { font-family:var(--font-mono); font-size:11px; color:var(--err-500); background:rgba(217,89,76,.16); padding:1px 6px; border-radius:3px; }
.pf-press__detail { font-family:var(--font-mono); font-size:12px; color:var(--ink-600); font-variant-numeric:tabular-nums lining-nums; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pf-press__action { flex:none; display:flex; gap:8px; align-items:center; }
`;
  document.head.appendChild(el);
}
const LAMP = {
  idle: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "5",
    width: "16",
    height: "14",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 10h16"
  })),
  processing: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M6 4v6M6 4h12M6 10h12a0 0 0 0 1 0 0v0a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 14v6M8 20h8"
  })),
  success: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m5 12.5 4 4 10-10"
  })),
  error: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))
};

/**
 * PressIndicator — the SIGNATURE companion: the amber "press at work" job
 * readout. Drives the heavy server-job moment from processing → success/error.
 */
function PressIndicator({
  state = 'processing',
  label,
  detail,
  code,
  action,
  className = '',
  ...rest
}) {
  ensureStyles();
  const defaults = {
    processing: 'Pressing…',
    success: 'Done',
    error: 'Job failed',
    idle: 'Ready'
  };
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-press', `pf-press--${state}`, className].filter(Boolean).join(' '),
    role: "status",
    "aria-live": "polite"
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "pf-press__sweep",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "pf-press__lamp"
  }, LAMP[state]), /*#__PURE__*/React.createElement("div", {
    className: "pf-press__body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-press__label"
  }, label || defaults[state], state === 'error' && code ? /*#__PURE__*/React.createElement("span", {
    className: "pf-press__code"
  }, code) : null), detail ? /*#__PURE__*/React.createElement("span", {
    className: "pf-press__detail"
  }, detail) : null), action ? /*#__PURE__*/React.createElement("div", {
    className: "pf-press__action"
  }, action) : null);
}
Object.assign(__ds_scope, { PressIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/PressIndicator.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Spinner.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function Spinner({
  size = 16,
  tone = 'default',
  strokeWidth = 2.4,
  className = '',
  label = 'Loading',
  ...rest
}) {
  ensureStyles();
  const toneCls = tone === 'proc' ? 'pf-spinner--proc' : tone === 'accent' ? 'pf-spinner--accent' : tone === 'ink' ? 'pf-spinner--ink' : '';
  const r = (24 - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['pf-spinner', toneCls, className].filter(Boolean).join(' '),
    role: "status",
    "aria-label": label,
    style: {
      width: size,
      height: size
    }
  }, rest), /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "pf-spinner__track",
    cx: "12",
    cy: "12",
    r: r,
    strokeWidth: strokeWidth
  }), /*#__PURE__*/React.createElement("circle", {
    className: "pf-spinner__head",
    cx: "12",
    cy: "12",
    r: r,
    strokeWidth: strokeWidth,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: c * 0.72
  })));
}
Object.assign(__ds_scope, { Spinner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Spinner.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Toast.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'toast');
  el.textContent = `
.pf-toast-viewport {
  position:fixed; z-index:60; display:flex; flex-direction:column; gap:10px;
  bottom:var(--sp-5); right:var(--sp-5); max-width:360px; pointer-events:none;
}
.pf-toast-viewport--bl { right:auto; left:var(--sp-5); }
.pf-toast-viewport--tr { bottom:auto; top:var(--sp-5); }
.pf-toast {
  pointer-events:auto; display:flex; gap:10px; align-items:flex-start;
  min-width:240px; max-width:360px; padding:11px 12px;
  background:var(--sub-800); border:1px solid var(--sub-600); border-radius:var(--r-panel);
  box-shadow:0 12px 32px rgba(5,7,10,.5); color:var(--ink-900);
  font-family:var(--font-ui); font-size:13px; line-height:18px;
  animation:pf-toast-in var(--mo-slow) var(--ease-out);
}
@keyframes pf-toast-in { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
.pf-toast__bar { width:3px; align-self:stretch; border-radius:2px; background:var(--ink-600); flex:none; }
.pf-toast--ok   .pf-toast__bar { background:var(--ok-500); }
.pf-toast--err  .pf-toast__bar { background:var(--err-500); }
.pf-toast--proc .pf-toast__bar { background:var(--proc-500); }
.pf-toast__icon { flex:none; margin-top:1px; color:var(--ink-600); }
.pf-toast--ok   .pf-toast__icon { color:var(--ok-500); }
.pf-toast--err  .pf-toast__icon { color:var(--err-500); }
.pf-toast--proc .pf-toast__icon { color:var(--proc-500); }
.pf-toast__icon svg { width:16px; height:16px; display:block; }
.pf-toast__body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
.pf-toast__title { font-weight:var(--fw-semibold); }
.pf-toast__msg { color:var(--ink-700); font-size:12px; }
.pf-toast__msg code { font-family:var(--font-mono); font-size:11px; }
.pf-toast__action { margin-top:6px; }
.pf-toast__x { flex:none; background:transparent; border:none; cursor:pointer; color:var(--ink-600); padding:2px; border-radius:3px; margin:-2px -2px 0 0; }
.pf-toast__x:hover { background:var(--sub-600); color:var(--ink-900); }
.pf-toast__x svg { width:14px; height:14px; display:block; }
`;
  document.head.appendChild(el);
}
const ICONS = {
  ok: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m8.5 12 2.4 2.4 4.6-4.8"
  })),
  err: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8v4M12 16h.01"
  })),
  proc: /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M21 12a9 9 0 1 1-6.2-8.6"
  })),
  neutral: null
};

/**
 * Toast — a transient floating confirmation. Use for brief outcomes (export
 * ready, job failed); place inside a ToastViewport for positioning + stacking.
 */
function Toast({
  status = 'neutral',
  title,
  children,
  action,
  icon,
  onDismiss,
  className = '',
  ...rest
}) {
  ensureStyles();
  const ic = icon !== undefined ? icon : ICONS[status];
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-toast', `pf-toast--${status}`, className].filter(Boolean).join(' '),
    role: "status"
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "pf-toast__bar"
  }), ic ? /*#__PURE__*/React.createElement("span", {
    className: "pf-toast__icon"
  }, ic) : null, /*#__PURE__*/React.createElement("div", {
    className: "pf-toast__body"
  }, title ? /*#__PURE__*/React.createElement("span", {
    className: "pf-toast__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("span", {
    className: "pf-toast__msg"
  }, children) : null, action ? /*#__PURE__*/React.createElement("div", {
    className: "pf-toast__action"
  }, action) : null), onDismiss ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pf-toast__x",
    "aria-label": "Dismiss",
    onClick: onDismiss
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.4",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))) : null);
}

/** Fixed-position stack container for toasts. */
function ToastViewport({
  position = 'br',
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const posCls = position === 'bl' ? 'pf-toast-viewport--bl' : position === 'tr' ? 'pf-toast-viewport--tr' : '';
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-toast-viewport', posCls, className].filter(Boolean).join(' ')
  }, rest), children);
}
Object.assign(__ds_scope, { Toast, ToastViewport });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Toast.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
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
function Tooltip({
  label,
  kbd,
  placement = 'top',
  delay = 280,
  className = '',
  children
}) {
  ensureStyles();
  const [show, setShow] = React.useState(false);
  const timer = React.useRef(null);
  const open = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(true), delay);
  };
  const close = () => {
    clearTimeout(timer.current);
    setShow(false);
  };
  React.useEffect(() => () => clearTimeout(timer.current), []);
  return /*#__PURE__*/React.createElement("span", {
    className: ['pf-tip-wrap', className].filter(Boolean).join(' '),
    "data-show": show ? 'true' : 'false',
    onMouseEnter: open,
    onMouseLeave: close,
    onFocusCapture: () => setShow(true),
    onBlurCapture: close
  }, children, /*#__PURE__*/React.createElement("span", {
    role: "tooltip",
    className: `pf-tip pf-tip--${placement}`
  }, label, kbd ? /*#__PURE__*/React.createElement("span", {
    className: "pf-tip__kbd"
  }, kbd) : null));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/forms/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Inject component CSS once (travels with the bundle; tokens come from styles.css). */
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'button');
  el.textContent = `
.pf-btn {
  display:inline-flex; align-items:center; justify-content:center; gap:6px;
  height:var(--ctl-h); padding:0 14px; border-radius:var(--r-ctl);
  font-family:var(--font-ui); font-size:13px; font-weight:var(--fw-medium); line-height:1;
  border:1px solid transparent; cursor:pointer; user-select:none; white-space:nowrap;
  position:relative; overflow:hidden; isolation:isolate;
  transition: background var(--mo-fast) var(--ease-inout), border-color var(--mo-fast) var(--ease-inout), color var(--mo-fast) var(--ease-inout);
}
.pf-btn:focus-visible { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 6px rgba(31,162,196,.35); }
.pf-btn--sm { height:var(--ctl-h-compact); font-size:12px; padding:0 12px; }
.pf-btn--lg { height:var(--ctl-h-touch); font-size:14px; padding:0 18px; }
.pf-btn--block { display:flex; width:100%; }

.pf-btn--primary { background:var(--press-500); color:#08191f; border-color:var(--press-500); }
.pf-btn--primary:hover { background:var(--press-400); border-color:var(--press-400); }
.pf-btn--primary:active { background:var(--press-600); border-color:var(--press-600); }

.pf-btn--secondary { background:var(--sub-700); color:var(--ink-900); border-color:var(--sub-500); }
.pf-btn--secondary:hover { background:var(--sub-600); border-color:var(--sub-400); }
.pf-btn--secondary:active { background:var(--sub-800); }

.pf-btn--ghost { background:transparent; color:var(--ink-700); border-color:transparent; }
.pf-btn--ghost:hover { background:var(--sub-700); color:var(--ink-900); }
.pf-btn--ghost:active { background:var(--sub-800); }

.pf-btn--danger { background:transparent; color:var(--err-500); border-color:var(--sub-500); }
.pf-btn--danger:hover { background:var(--err-tint); border-color:var(--err-500); }
.pf-btn--danger:active { background:#2c1614; }

.pf-btn[disabled] { background:var(--sub-400); color:var(--ink-500); border-color:transparent; cursor:not-allowed; opacity:.6; box-shadow:none; }
.pf-btn[disabled]:hover { background:var(--sub-400); border-color:transparent; color:var(--ink-500); }

.pf-btn--busy { cursor:progress; }
.pf-btn__label { display:inline-flex; align-items:center; gap:6px; transition:opacity var(--mo-fast); }
.pf-btn--busy .pf-btn__label { opacity:.75; }
.pf-btn__proc { position:absolute; left:0; right:0; bottom:0; height:2px; background:rgba(224,138,60,.18); overflow:hidden; }
.pf-btn__proc::after { content:""; position:absolute; top:0; bottom:0; width:40%; background:var(--proc-500); animation:pf-proc-sweep var(--proc-loop) var(--ease-press) infinite; }
.pf-btn__ico { display:inline-flex; flex:none; }
.pf-btn--sm .pf-btn__ico svg { width:14px; height:14px; }
.pf-btn__ico svg { width:16px; height:16px; display:block; }
`;
  document.head.appendChild(el);
}

/**
 * Button — the workbench's primary action control.
 */
function Button({
  variant = 'secondary',
  size = 'md',
  block = false,
  processing = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = ['pf-btn', `pf-btn--${variant}`, size === 'sm' ? 'pf-btn--sm' : size === 'lg' ? 'pf-btn--lg' : '', block ? 'pf-btn--block' : '', processing ? 'pf-btn--busy' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    disabled: disabled || processing,
    "aria-busy": processing || undefined
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "pf-btn__label"
  }, leftIcon ? /*#__PURE__*/React.createElement("span", {
    className: "pf-btn__ico"
  }, leftIcon) : null, /*#__PURE__*/React.createElement("span", null, children), rightIcon ? /*#__PURE__*/React.createElement("span", {
    className: "pf-btn__ico"
  }, rightIcon) : null), processing ? /*#__PURE__*/React.createElement("span", {
    className: "pf-btn__proc",
    "aria-hidden": "true"
  }) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'checkbox');
  el.textContent = `
.pf-check { display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none; font-family:var(--font-ui); font-size:13px; color:var(--ink-900); position:relative; }
.pf-check__native { position:absolute; opacity:0; width:0; height:0; }
.pf-check__box {
  width:16px; height:16px; flex:none; border-radius:3px;
  background:var(--sub-850); border:1px solid var(--sub-500);
  display:grid; place-items:center; color:#08191f;
  transition: background var(--mo-fast) var(--ease-inout), border-color var(--mo-fast) var(--ease-inout);
}
.pf-check__box svg { width:12px; height:12px; opacity:0; transform:scale(.6); transition: opacity var(--mo-fast), transform var(--mo-fast) var(--ease-out); }
.pf-check:hover .pf-check__box { border-color:var(--sub-400); }
.pf-check__native:checked + .pf-check__box,
.pf-check__native:indeterminate + .pf-check__box { background:var(--press-500); border-color:var(--press-500); }
.pf-check__native:checked + .pf-check__box svg,
.pf-check__native:indeterminate + .pf-check__box svg { opacity:1; transform:scale(1); }
.pf-check__native:focus-visible + .pf-check__box { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-check--disabled { cursor:not-allowed; color:var(--ink-500); }
.pf-check--disabled .pf-check__box { background:var(--sub-800); border-color:var(--sub-600); }
.pf-check__hit { position:absolute; inset:-12px -8px; }
`;
  document.head.appendChild(el);
}
const CHECK = /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "3.2",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M20 6 9 17l-5-5"
}));
const DASH = /*#__PURE__*/React.createElement("svg", {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "3.2",
  strokeLinecap: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: "M5 12h14"
}));

/**
 * Checkbox — a 16px square toggle with the press-blue checked fill.
 */
function Checkbox({
  label,
  checked,
  defaultChecked,
  indeterminate = false,
  disabled = false,
  onChange,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return /*#__PURE__*/React.createElement("label", {
    className: ['pf-check', disabled ? 'pf-check--disabled' : '', className].filter(Boolean).join(' '),
    htmlFor: id
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-check__hit"
  }), /*#__PURE__*/React.createElement("input", _extends({
    ref: ref,
    id: id,
    type: "checkbox",
    className: "pf-check__native",
    checked: checked,
    defaultChecked: defaultChecked,
    disabled: disabled,
    onChange: onChange
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "pf-check__box"
  }, indeterminate ? DASH : CHECK), label ? /*#__PURE__*/React.createElement("span", {
    className: "pf-check__label"
  }, label) : null);
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'iconbutton');
  el.textContent = `
.pf-iconbtn {
  display:inline-grid; place-items:center; flex:none;
  width:var(--icon-btn); height:var(--icon-btn); border-radius:var(--r-ctl);
  background:transparent; color:var(--ink-700); border:1px solid transparent;
  cursor:pointer; position:relative; padding:0;
  transition: background var(--mo-fast) var(--ease-inout), color var(--mo-fast) var(--ease-inout), border-color var(--mo-fast) var(--ease-inout);
}
/* generous hit-area without growing the visual box */
.pf-iconbtn::before { content:""; position:absolute; inset:-8px; }
.pf-iconbtn svg { width:var(--icon-glyph); height:var(--icon-glyph); display:block; }
.pf-iconbtn:hover { background:var(--sub-700); color:var(--ink-900); }
.pf-iconbtn:active { background:var(--sub-800); }
.pf-iconbtn:focus-visible { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 6px rgba(31,162,196,.35); }
.pf-iconbtn--outlined { border-color:var(--sub-500); background:var(--sub-700); color:var(--ink-900); }
.pf-iconbtn--outlined:hover { background:var(--sub-600); border-color:var(--sub-400); }
.pf-iconbtn--lg { width:32px; height:32px; }
.pf-iconbtn[aria-pressed="true"] { background:var(--press-tint); color:var(--press-400); border-color:transparent; }
.pf-iconbtn--danger:hover { background:var(--err-tint); color:var(--err-500); }
.pf-iconbtn[disabled] { color:var(--ink-500); cursor:not-allowed; opacity:.6; background:transparent; }
.pf-iconbtn[disabled]:hover { background:transparent; color:var(--ink-500); }
`;
  document.head.appendChild(el);
}

/**
 * IconButton — a 28px square glyph control for toolbars and chrome.
 */
function IconButton({
  variant = 'plain',
  size = 'md',
  pressed,
  disabled = false,
  label,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = ['pf-iconbtn', variant === 'outlined' ? 'pf-iconbtn--outlined' : '', variant === 'danger' ? 'pf-iconbtn--danger' : '', size === 'lg' ? 'pf-iconbtn--lg' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    "aria-label": label,
    "aria-pressed": typeof pressed === 'boolean' ? pressed : undefined,
    disabled: disabled
  }, rest), children);
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'input');
  el.textContent = `
.pf-field { display:flex; flex-direction:column; gap:6px; }
.pf-field__label { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); color:var(--ink-700); }
.pf-field__label .pf-req { color:var(--press-400); margin-left:2px; }
.pf-input-wrap {
  display:flex; align-items:center; gap:8px;
  height:var(--ctl-h); padding:0 10px; border-radius:var(--r-ctl);
  background:var(--sub-850); border:1px solid var(--sub-500);
  transition: border-color var(--mo-fast) var(--ease-inout), box-shadow var(--mo-fast) var(--ease-inout);
}
.pf-input-wrap:hover { border-color:var(--sub-400); }
.pf-input-wrap:focus-within { border-color:var(--press-500); box-shadow:0 0 0 3px rgba(31,162,196,.25); }
.pf-input-wrap--error { border-color:var(--err-500); }
.pf-input-wrap--error:focus-within { border-color:var(--err-500); box-shadow:0 0 0 3px rgba(217,89,76,.25); }
.pf-input-wrap--shake { animation: pf-shake 340ms var(--ease-inout); }
.pf-input-wrap--sm { height:var(--ctl-h-compact); }
.pf-input-wrap--disabled { background:var(--sub-800); border-color:var(--sub-600); cursor:not-allowed; opacity:.7; }
.pf-input-wrap--disabled .pf-input { cursor:not-allowed; }
.pf-input {
  flex:1; min-width:0; background:transparent; border:none; outline:none;
  color:var(--ink-900); font-family:var(--font-ui); font-size:14px; line-height:20px;
}
.pf-input::placeholder { color:var(--ink-500); }
.pf-input--mono { font-family:var(--font-mono); font-size:13px; font-variant-numeric:tabular-nums lining-nums; letter-spacing:0; }
.pf-input-adorn { display:inline-flex; align-items:center; color:var(--ink-600); flex:none; font-family:var(--font-mono); font-size:12px; }
.pf-input-adorn svg { width:16px; height:16px; display:block; }
.pf-field__hint { font-family:var(--font-ui); font-size:11px; line-height:14px; color:var(--ink-600); }
.pf-field__hint--error { color:var(--err-500); display:flex; align-items:center; gap:5px; }
.pf-field__hint--error code { font-family:var(--font-mono); font-size:11px; color:var(--err-500); }
`;
  document.head.appendChild(el);
}

/**
 * Input — a single-line text field. Use mono for machine data (filenames,
 * ranges, sizes). Errors flip the border to err-500 and shake once.
 */
function Input({
  label,
  hint,
  error,
  code,
  mono = false,
  size = 'md',
  required = false,
  disabled = false,
  prefix = null,
  suffix = null,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  const [shake, setShake] = React.useState(false);
  const prev = React.useRef(error);
  React.useEffect(() => {
    if (error && !prev.current) {
      setShake(true);
      const t = setTimeout(() => setShake(false), 360);
      prev.current = error;
      return () => clearTimeout(t);
    }
    prev.current = error;
  }, [error]);
  const wrapCls = ['pf-input-wrap', size === 'sm' ? 'pf-input-wrap--sm' : '', error ? 'pf-input-wrap--error' : '', shake ? 'pf-input-wrap--shake' : '', disabled ? 'pf-input-wrap--disabled' : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: ['pf-field', className].filter(Boolean).join(' ')
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "pf-field__label",
    htmlFor: id
  }, label, required ? /*#__PURE__*/React.createElement("span", {
    className: "pf-req"
  }, "*") : null) : null, /*#__PURE__*/React.createElement("div", {
    className: wrapCls
  }, prefix ? /*#__PURE__*/React.createElement("span", {
    className: "pf-input-adorn"
  }, prefix) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    className: ['pf-input', mono ? 'pf-input--mono' : ''].filter(Boolean).join(' '),
    disabled: disabled,
    required: required,
    "aria-invalid": error ? true : undefined
  }, rest)), suffix ? /*#__PURE__*/React.createElement("span", {
    className: "pf-input-adorn"
  }, suffix) : null), error ? /*#__PURE__*/React.createElement("span", {
    className: "pf-field__hint pf-field__hint--error"
  }, error, code ? /*#__PURE__*/React.createElement("code", null, code) : null) : hint ? /*#__PURE__*/React.createElement("span", {
    className: "pf-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Input.jsx", error: String((e && e.message) || e) }); }

// components/forms/Radio.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'radio');
  el.textContent = `
.pf-radio-group { display:flex; flex-direction:column; gap:8px; }
.pf-radio-group--row { flex-direction:row; gap:16px; }
.pf-radio { display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none; font-family:var(--font-ui); font-size:13px; color:var(--ink-900); position:relative; }
.pf-radio__native { position:absolute; opacity:0; width:0; height:0; }
.pf-radio__dot {
  width:16px; height:16px; flex:none; border-radius:var(--r-pill);
  background:var(--sub-850); border:1px solid var(--sub-500);
  display:grid; place-items:center;
  transition: border-color var(--mo-fast) var(--ease-inout);
}
.pf-radio__dot::after { content:""; width:7px; height:7px; border-radius:var(--r-pill); background:var(--press-500); transform:scale(0); transition: transform var(--mo-fast) var(--ease-out); }
.pf-radio:hover .pf-radio__dot { border-color:var(--sub-400); }
.pf-radio__native:checked + .pf-radio__dot { border-color:var(--press-500); }
.pf-radio__native:checked + .pf-radio__dot::after { transform:scale(1); }
.pf-radio__native:focus-visible + .pf-radio__dot { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-radio--disabled { cursor:not-allowed; color:var(--ink-500); }
.pf-radio--disabled .pf-radio__dot { background:var(--sub-800); border-color:var(--sub-600); }
.pf-radio__hit { position:absolute; inset:-12px -8px; }
`;
  document.head.appendChild(el);
}

/** A single radio option. */
function Radio({
  label,
  name,
  value,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("label", {
    className: ['pf-radio', disabled ? 'pf-radio--disabled' : '', className].filter(Boolean).join(' '),
    htmlFor: id
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-radio__hit"
  }), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: "radio",
    className: "pf-radio__native",
    name: name,
    value: value,
    checked: checked,
    defaultChecked: defaultChecked,
    disabled: disabled,
    onChange: onChange
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "pf-radio__dot"
  }), label ? /*#__PURE__*/React.createElement("span", {
    className: "pf-radio__label"
  }, label) : null);
}

/** Convenience group wrapper for a set of options. */
function RadioGroup({
  name,
  value,
  defaultValue,
  options = [],
  row = false,
  onChange,
  className = ''
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("div", {
    className: ['pf-radio-group', row ? 'pf-radio-group--row' : '', className].filter(Boolean).join(' '),
    role: "radiogroup"
  }, options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    const isControlled = value !== undefined;
    return /*#__PURE__*/React.createElement(Radio, _extends({
      key: opt.value,
      name: name,
      value: opt.value,
      disabled: opt.disabled,
      label: opt.label
    }, isControlled ? {
      checked: value === opt.value
    } : {
      defaultChecked: defaultValue === opt.value
    }, {
      onChange: onChange ? () => onChange(opt.value) : undefined
    }));
  }));
}
Object.assign(__ds_scope, { Radio, RadioGroup });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Radio.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'select');
  el.textContent = `
.pf-select-field { display:flex; flex-direction:column; gap:6px; }
.pf-select-field__label { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); color:var(--ink-700); }
.pf-select-wrap { position:relative; display:flex; align-items:center; }
.pf-select {
  appearance:none; -webkit-appearance:none; width:100%;
  height:var(--ctl-h); padding:0 30px 0 10px; border-radius:var(--r-ctl);
  background:var(--sub-850); border:1px solid var(--sub-500); color:var(--ink-900);
  font-family:var(--font-ui); font-size:14px; line-height:20px; cursor:pointer;
  transition: border-color var(--mo-fast) var(--ease-inout), box-shadow var(--mo-fast) var(--ease-inout);
}
.pf-select--mono { font-family:var(--font-mono); font-size:13px; font-variant-numeric:tabular-nums; }
.pf-select--sm { height:var(--ctl-h-compact); }
.pf-select:hover { border-color:var(--sub-400); }
.pf-select:focus-visible { outline:none; border-color:var(--press-500); box-shadow:0 0 0 3px rgba(31,162,196,.25); }
.pf-select[disabled] { background:var(--sub-800); border-color:var(--sub-600); color:var(--ink-500); cursor:not-allowed; opacity:.7; }
.pf-select option { background:var(--sub-800); color:var(--ink-900); }
.pf-select-chev { position:absolute; right:9px; display:flex; pointer-events:none; color:var(--ink-600); }
.pf-select-chev svg { width:16px; height:16px; display:block; }
.pf-select-field__hint { font-family:var(--font-ui); font-size:11px; color:var(--ink-600); }
`;
  document.head.appendChild(el);
}

/**
 * Select — a styled native dropdown (keeps native a11y + keyboard).
 */
function Select({
  label,
  hint,
  options = [],
  mono = false,
  size = 'md',
  disabled = false,
  id,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const selCls = ['pf-select', mono ? 'pf-select--mono' : '', size === 'sm' ? 'pf-select--sm' : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", {
    className: ['pf-select-field', className].filter(Boolean).join(' ')
  }, label ? /*#__PURE__*/React.createElement("label", {
    className: "pf-select-field__label",
    htmlFor: id
  }, label) : null, /*#__PURE__*/React.createElement("div", {
    className: "pf-select-wrap"
  }, /*#__PURE__*/React.createElement("select", _extends({
    id: id,
    className: selCls,
    disabled: disabled
  }, rest), children || options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("option", {
      key: opt.value,
      value: opt.value
    }, opt.label);
  })), /*#__PURE__*/React.createElement("span", {
    className: "pf-select-chev",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "m6 9 6 6 6-6"
  })))), hint ? /*#__PURE__*/React.createElement("span", {
    className: "pf-select-field__hint"
  }, hint) : null);
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Slider.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'slider');
  el.textContent = `
.pf-slider { display:flex; flex-direction:column; gap:8px; }
.pf-slider__top { display:flex; align-items:baseline; justify-content:space-between; }
.pf-slider__label { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); color:var(--ink-700); }
.pf-slider__val { font-family:var(--font-mono); font-size:12px; color:var(--ink-900); font-variant-numeric:tabular-nums lining-nums; }
.pf-slider__range {
  -webkit-appearance:none; appearance:none; width:100%; height:18px; background:transparent; cursor:pointer; margin:0;
}
.pf-slider__range::-webkit-slider-runnable-track { height:4px; border-radius:2px; background:linear-gradient(var(--press-500),var(--press-500)) 0/var(--pf-pct,0%) 100% no-repeat, var(--sub-600); }
.pf-slider__range::-moz-range-track { height:4px; border-radius:2px; background:var(--sub-600); }
.pf-slider__range::-moz-range-progress { height:4px; border-radius:2px; background:var(--press-500); }
.pf-slider__range::-webkit-slider-thumb {
  -webkit-appearance:none; appearance:none; width:14px; height:14px; margin-top:-5px;
  border-radius:var(--r-pill); background:var(--ink-900); border:2px solid var(--press-500);
  transition: box-shadow var(--mo-fast);
}
.pf-slider__range::-moz-range-thumb {
  width:14px; height:14px; border-radius:var(--r-pill); background:var(--ink-900); border:2px solid var(--press-500); box-sizing:border-box;
}
.pf-slider__range:hover::-webkit-slider-thumb { box-shadow:0 0 0 4px rgba(31,162,196,.18); }
.pf-slider__range:focus-visible { outline:none; }
.pf-slider__range:focus-visible::-webkit-slider-thumb { box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-slider__range:focus-visible::-moz-range-thumb { box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-slider__marks { display:flex; justify-content:space-between; font-family:var(--font-ui); font-size:11px; color:var(--ink-600); }
.pf-slider[disabled] { opacity:.6; }
`;
  document.head.appendChild(el);
}

/**
 * Slider — a range control. Canonical use: the board zoom (96–180px sheets).
 */
function Slider({
  label,
  min = 0,
  max = 100,
  step = 1,
  value,
  defaultValue,
  onChange,
  marks = null,
  suffix = '',
  showValue = true,
  disabled = false,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  // visual progress fill for webkit (no native progress element)
  const cur = value !== undefined ? value : defaultValue !== undefined ? defaultValue : min;
  const [internal, setInternal] = React.useState(cur);
  const shown = value !== undefined ? value : internal;
  const pct = (Number(shown) - min) / (max - min) * 100;
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['pf-slider', className].filter(Boolean).join(' ')
  }, disabled ? {
    disabled: true
  } : {}), (label || showValue) && /*#__PURE__*/React.createElement("div", {
    className: "pf-slider__top"
  }, label ? /*#__PURE__*/React.createElement("span", {
    className: "pf-slider__label"
  }, label) : /*#__PURE__*/React.createElement("span", null), showValue ? /*#__PURE__*/React.createElement("span", {
    className: "pf-slider__val"
  }, shown, suffix) : null), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: "range",
    className: "pf-slider__range",
    min: min,
    max: max,
    step: step,
    value: value !== undefined ? value : internal,
    disabled: disabled,
    onChange: e => {
      if (value === undefined) setInternal(Number(e.target.value));
      onChange && onChange(e);
    },
    style: {
      '--pf-pct': pct + '%'
    }
  }, rest)), marks ? /*#__PURE__*/React.createElement("div", {
    className: "pf-slider__marks"
  }, marks.map(m => /*#__PURE__*/React.createElement("span", {
    key: m
  }, m))) : null);
}
Object.assign(__ds_scope, { Slider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Slider.jsx", error: String((e && e.message) || e) }); }

// components/forms/Switch.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'switch');
  el.textContent = `
.pf-switch { display:inline-flex; align-items:center; gap:10px; cursor:pointer; user-select:none; font-family:var(--font-ui); font-size:13px; color:var(--ink-900); position:relative; }
.pf-switch__native { position:absolute; opacity:0; width:0; height:0; }
.pf-switch__track {
  width:34px; height:20px; flex:none; border-radius:var(--r-pill);
  background:var(--sub-600); border:1px solid var(--sub-500); position:relative;
  transition: background var(--mo-fast) var(--ease-inout), border-color var(--mo-fast) var(--ease-inout);
}
.pf-switch__thumb {
  position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:var(--r-pill);
  background:var(--ink-700); transition: transform var(--mo-base) var(--ease-out), background var(--mo-fast);
}
.pf-switch:hover .pf-switch__track { border-color:var(--sub-400); }
.pf-switch__native:checked + .pf-switch__track { background:var(--press-500); border-color:var(--press-500); }
.pf-switch__native:checked + .pf-switch__track .pf-switch__thumb { transform:translateX(14px); background:#08191f; }
.pf-switch__native:focus-visible + .pf-switch__track { outline:2px solid var(--press-500); outline-offset:2px; box-shadow:0 0 0 5px rgba(31,162,196,.35); }
.pf-switch--disabled { cursor:not-allowed; color:var(--ink-500); }
.pf-switch--disabled .pf-switch__track { opacity:.6; }
.pf-switch__hit { position:absolute; inset:-12px -8px; }
`;
  document.head.appendChild(el);
}

/**
 * Switch — a binary on/off toggle (press-blue when on). Use for immediate
 * settings (grid on/off, keep originals); use Checkbox inside forms.
 */
function Switch({
  label,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  id,
  className = '',
  ...rest
}) {
  ensureStyles();
  return /*#__PURE__*/React.createElement("label", {
    className: ['pf-switch', disabled ? 'pf-switch--disabled' : '', className].filter(Boolean).join(' '),
    htmlFor: id
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-switch__hit"
  }), /*#__PURE__*/React.createElement("input", _extends({
    id: id,
    type: "checkbox",
    role: "switch",
    className: "pf-switch__native",
    checked: checked,
    defaultChecked: defaultChecked,
    disabled: disabled,
    onChange: onChange
  }, rest)), /*#__PURE__*/React.createElement("span", {
    className: "pf-switch__track"
  }, /*#__PURE__*/React.createElement("span", {
    className: "pf-switch__thumb"
  })), label ? /*#__PURE__*/React.createElement("span", {
    className: "pf-switch__label"
  }, label) : null);
}
Object.assign(__ds_scope, { Switch });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Switch.jsx", error: String((e && e.message) || e) }); }

// components/overlays/Dialog.jsx
try { (() => {
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'dialog');
  el.textContent = `
.pf-scrim {
  position:fixed; inset:0; z-index:80; background:var(--scrim);
  display:grid; place-items:center; padding:24px;
  animation:pf-scrim-in var(--mo-slow) var(--ease-out);
}
@keyframes pf-scrim-in { from { opacity:0; } to { opacity:1; } }
.pf-dialog {
  width:100%; max-width:var(--content-max); max-height:calc(100vh - 48px);
  display:flex; flex-direction:column;
  background:var(--sub-800); border:1px solid var(--sub-600); border-radius:var(--r-panel);
  box-shadow:var(--shadow-dialog); overflow:hidden;
  animation:pf-dialog-in var(--mo-slow) var(--ease-out);
}
@keyframes pf-dialog-in { from { opacity:0; transform:translateY(8px) scale(.99); } to { opacity:1; transform:none; } }
.pf-dialog__head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:16px 16px 12px; }
.pf-dialog__titles { display:flex; flex-direction:column; gap:3px; min-width:0; }
.pf-dialog__eyebrow { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); letter-spacing:.04em; text-transform:uppercase; color:var(--ink-600); }
.pf-dialog__title { font-family:var(--font-ui); font-size:20px; line-height:26px; font-weight:var(--fw-semibold); color:var(--ink-900); }
.pf-dialog__x { flex:none; width:28px; height:28px; display:grid; place-items:center; background:transparent; border:none; cursor:pointer; color:var(--ink-600); border-radius:var(--r-ctl); }
.pf-dialog__x:hover { background:var(--sub-700); color:var(--ink-900); }
.pf-dialog__x:focus-visible { outline:2px solid var(--press-500); outline-offset:2px; }
.pf-dialog__x svg { width:18px; height:18px; }
.pf-dialog__body { padding:0 16px 4px; overflow:auto; color:var(--ink-700); font-family:var(--font-ui); font-size:13px; line-height:20px; }
.pf-dialog__foot { display:flex; justify-content:flex-end; gap:10px; padding:14px 16px 16px; }
`;
  document.head.appendChild(el);
}

/**
 * Dialog — a modal panel over a scrim (the only chrome besides toasts that
 * casts). Esc and scrim-click close it.
 */
function Dialog({
  open,
  onClose,
  eyebrow,
  title,
  footer,
  closeOnScrim = true,
  width,
  className = '',
  children
}) {
  ensureStyles();
  const ref = React.useRef(null);
  const prevFocus = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    prevFocus.current = document.activeElement;
    const onKey = e => {
      if (e.key === 'Escape') onClose && onClose();
    };
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => {
      if (ref.current) ref.current.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      clearTimeout(t);
      if (prevFocus.current && prevFocus.current.focus) prevFocus.current.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    className: "pf-scrim",
    onMouseDown: e => {
      if (closeOnScrim && e.target === e.currentTarget) onClose && onClose();
    }
  }, /*#__PURE__*/React.createElement("div", {
    ref: ref,
    className: ['pf-dialog', className].filter(Boolean).join(' '),
    role: "dialog",
    "aria-modal": "true",
    "aria-label": typeof title === 'string' ? title : undefined,
    tabIndex: -1,
    style: width ? {
      maxWidth: width
    } : undefined
  }, (title || eyebrow || onClose) && /*#__PURE__*/React.createElement("div", {
    className: "pf-dialog__head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pf-dialog__titles"
  }, eyebrow ? /*#__PURE__*/React.createElement("span", {
    className: "pf-dialog__eyebrow"
  }, eyebrow) : null, title ? /*#__PURE__*/React.createElement("h2", {
    className: "pf-dialog__title"
  }, title) : null), onClose ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pf-dialog__x",
    "aria-label": "Close",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))) : null), /*#__PURE__*/React.createElement("div", {
    className: "pf-dialog__body"
  }, children), footer ? /*#__PURE__*/React.createElement("div", {
    className: "pf-dialog__foot"
  }, footer) : null));
}
Object.assign(__ds_scope, { Dialog });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/overlays/Dialog.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Panel.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'panel');
  el.textContent = `
.pf-panel { background:var(--sub-800); border:1px solid var(--sub-600); border-radius:var(--r-panel); }
.pf-panel--well { background:var(--sub-700); border-color:transparent; box-shadow:inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700); }
.pf-panel--flush { border-radius:0; border:none; }
.pf-panel__head { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border-bottom:1px solid var(--sub-600); }
.pf-panel__titles { display:flex; flex-direction:column; gap:2px; min-width:0; }
.pf-panel__eyebrow { font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); letter-spacing:0.04em; text-transform:uppercase; color:var(--ink-600); }
.pf-panel__title { font-family:var(--font-ui); font-size:16px; line-height:22px; font-weight:var(--fw-semibold); color:var(--ink-900); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.pf-panel__title .pf-panel__mono { font-family:var(--font-mono); font-weight:var(--fw-medium); }
.pf-panel__actions { display:flex; gap:8px; align-items:center; flex:none; }
.pf-panel__body { padding:16px; }
.pf-panel__body--tight { padding:0; }
`;
  document.head.appendChild(el);
}

/**
 * Panel — the chrome surface. Flat, hairline-bordered, NEVER shadowed (only
 * paper casts). Use `well` for recessed inset regions like the board substrate.
 */
function Panel({
  eyebrow,
  title,
  actions,
  header,
  well = false,
  flush = false,
  noBodyPadding = false,
  className = '',
  bodyClassName = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = ['pf-panel', well ? 'pf-panel--well' : '', flush ? 'pf-panel--flush' : '', className].filter(Boolean).join(' ');
  const hasHead = header || title || eyebrow || actions;
  return /*#__PURE__*/React.createElement("section", _extends({
    className: cls
  }, rest), hasHead ? header ? /*#__PURE__*/React.createElement("div", {
    className: "pf-panel__head"
  }, header) : /*#__PURE__*/React.createElement("div", {
    className: "pf-panel__head"
  }, /*#__PURE__*/React.createElement("div", {
    className: "pf-panel__titles"
  }, eyebrow ? /*#__PURE__*/React.createElement("span", {
    className: "pf-panel__eyebrow"
  }, eyebrow) : null, title ? /*#__PURE__*/React.createElement("h3", {
    className: "pf-panel__title"
  }, title) : null), actions ? /*#__PURE__*/React.createElement("div", {
    className: "pf-panel__actions"
  }, actions) : null) : null, /*#__PURE__*/React.createElement("div", {
    className: ['pf-panel__body', noBodyPadding ? 'pf-panel__body--tight' : '', bodyClassName].filter(Boolean).join(' ')
  }, children));
}
Object.assign(__ds_scope, { Panel });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Panel.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/SegmentedControl.jsx
try { (() => {
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'segmented');
  el.textContent = `
.pf-seg {
  display:inline-flex; padding:2px; gap:2px; border-radius:var(--r-ctl);
  background:var(--sub-850); border:1px solid var(--sub-500);
}
.pf-seg__btn {
  appearance:none; border:none; cursor:pointer; background:transparent;
  font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); color:var(--ink-600);
  height:24px; padding:0 12px; border-radius:3px; display:inline-flex; align-items:center; gap:6px;
  transition: background var(--mo-fast) var(--ease-inout), color var(--mo-fast) var(--ease-inout);
}
.pf-seg--md .pf-seg__btn { height:28px; font-size:13px; }
.pf-seg__btn:hover { color:var(--ink-800,var(--ink-700)); }
.pf-seg__btn[aria-pressed="true"] { background:var(--press-tint); color:var(--press-400); }
.pf-seg__btn:focus-visible { outline:2px solid var(--press-500); outline-offset:1px; }
.pf-seg__btn svg { width:15px; height:15px; display:block; }
.pf-seg__btn[disabled] { color:var(--ink-500); cursor:not-allowed; }
`;
  document.head.appendChild(el);
}

/**
 * SegmentedControl — a compact 2–3 option toggle (press-tint active segment).
 */
function SegmentedControl({
  options = [],
  value,
  defaultValue,
  onChange,
  size = 'sm',
  ariaLabel,
  className = ''
}) {
  ensureStyles();
  const first = options[0] && (typeof options[0] === 'string' ? options[0] : options[0].value);
  const [internal, setInternal] = React.useState(defaultValue ?? first);
  const active = value !== undefined ? value : internal;
  return /*#__PURE__*/React.createElement("div", {
    className: ['pf-seg', size === 'md' ? 'pf-seg--md' : '', className].filter(Boolean).join(' '),
    role: "group",
    "aria-label": ariaLabel
  }, options.map(o => {
    const opt = typeof o === 'string' ? {
      value: o,
      label: o
    } : o;
    return /*#__PURE__*/React.createElement("button", {
      key: opt.value,
      type: "button",
      className: "pf-seg__btn",
      "aria-pressed": active === opt.value,
      disabled: opt.disabled,
      onClick: () => {
        if (value === undefined) setInternal(opt.value);
        onChange && onChange(opt.value);
      }
    }, opt.icon ? opt.icon : null, opt.label);
  }));
}
Object.assign(__ds_scope, { SegmentedControl });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/SegmentedControl.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'statuspill');
  el.textContent = `
.pf-pill {
  display:inline-flex; align-items:center; gap:6px;
  height:22px; padding:0 9px 0 8px; border-radius:var(--r-pill);
  font-family:var(--font-ui); font-size:12px; font-weight:var(--fw-medium); line-height:1;
  background:var(--sub-700); color:var(--ink-700); border:1px solid var(--sub-600);
}
.pf-pill__dot { width:7px; height:7px; border-radius:var(--r-pill); flex:none; background:currentColor; }
.pf-pill__count { font-family:var(--font-mono); font-variant-numeric:tabular-nums lining-nums; }
.pf-pill--neutral { color:var(--ink-600); }
.pf-pill--ok    { color:var(--ok-500);   background:var(--ok-tint);  border-color:transparent; }
.pf-pill--warn  { color:var(--warn-500); background:rgba(214,165,60,.14);  border-color:transparent; }
.pf-pill--err   { color:var(--err-500);  background:var(--err-tint); border-color:transparent; }
.pf-pill--proc  { color:var(--proc-500); background:rgba(224,138,60,.14); border-color:transparent; }
.pf-pill--proc .pf-pill__dot { animation:pf-proc-pulse var(--proc-loop) var(--ease-press) infinite; }
.pf-pill--selected { color:var(--press-400); background:var(--press-tint); border-color:transparent; }
.pf-pill--solid.pf-pill--ok   { color:#08191f; background:var(--ok-500); }
.pf-pill--solid.pf-pill--err  { color:#fff;     background:var(--err-500); }
.pf-pill--solid.pf-pill--proc { color:#1a1207;  background:var(--proc-500); }
.pf-pill--solid .pf-pill__dot { background:currentColor; opacity:.65; }
`;
  document.head.appendChild(el);
}

/**
 * StatusPill — a dot + label pill carrying job / validation state.
 */
function StatusPill({
  status = 'neutral',
  solid = false,
  dot = true,
  count,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = ['pf-pill', `pf-pill--${status}`, solid ? 'pf-pill--solid' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "pf-pill__dot"
  }) : null, children, count != null ? /*#__PURE__*/React.createElement("span", {
    className: "pf-pill__count"
  }, count) : null);
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Tabs.jsx
try { (() => {
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
function Tabs({
  tabs = [],
  value,
  defaultValue,
  onChange,
  className = ''
}) {
  ensureStyles();
  const [internal, setInternal] = React.useState(defaultValue ?? (tabs[0] && tabs[0].id));
  const active = value !== undefined ? value : internal;
  return /*#__PURE__*/React.createElement("div", {
    className: ['pf-tabs', className].filter(Boolean).join(' '),
    role: "tablist"
  }, tabs.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    role: "tab",
    type: "button",
    className: "pf-tab",
    "aria-selected": active === t.id,
    onClick: () => {
      if (value === undefined) setInternal(t.id);
      onChange && onChange(t.id);
    }
  }, t.label, t.count != null ? /*#__PURE__*/React.createElement("span", {
    className: "pf-tab__count"
  }, t.count) : null)));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/surfaces/Tag.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
let _injected = false;
function ensureStyles() {
  if (_injected || typeof document === 'undefined') return;
  _injected = true;
  const el = document.createElement('style');
  el.setAttribute('data-pf', 'tag');
  el.textContent = `
.pf-tag {
  display:inline-flex; align-items:center; gap:6px; max-width:100%;
  height:22px; padding:0 8px; border-radius:var(--r-ctl);
  background:var(--sub-700); border:1px solid var(--sub-600); color:var(--ink-700);
  font-family:var(--font-mono); font-size:11px; line-height:1; font-variant-numeric:tabular-nums lining-nums;
  white-space:nowrap;
}
.pf-tag--ui { font-family:var(--font-ui); font-weight:var(--fw-medium); }
.pf-tag--lg { height:26px; padding:0 10px; font-size:12px; }
.pf-tag--accent { background:var(--press-tint); border-color:transparent; color:var(--press-400); }
.pf-tag--solid { background:var(--sub-600); border-color:transparent; color:var(--ink-900); }
.pf-tag__label { overflow:hidden; text-overflow:ellipsis; }
.pf-tag__dot { width:6px; height:6px; border-radius:var(--r-pill); flex:none; background:var(--ink-600); }
.pf-tag__x {
  display:inline-grid; place-items:center; width:14px; height:14px; margin-right:-3px; flex:none;
  border:none; background:transparent; color:var(--ink-600); cursor:pointer; border-radius:3px; padding:0;
}
.pf-tag__x:hover { background:var(--sub-500); color:var(--ink-900); }
.pf-tag__x svg { width:10px; height:10px; display:block; }
`;
  document.head.appendChild(el);
}
const SEMANTIC = {
  ok: 'var(--ok-500)',
  warn: 'var(--warn-500)',
  err: 'var(--err-500)',
  proc: 'var(--proc-500)',
  accent: 'var(--press-500)'
};

/**
 * Tag — a compact metadata chip. Mono by default (filenames, ranges, sizes).
 */
function Tag({
  variant = 'neutral',
  size = 'md',
  ui = false,
  dot = null,
  onRemove,
  className = '',
  children,
  ...rest
}) {
  ensureStyles();
  const cls = ['pf-tag', variant === 'accent' ? 'pf-tag--accent' : '', variant === 'solid' ? 'pf-tag--solid' : '', size === 'lg' ? 'pf-tag--lg' : '', ui ? 'pf-tag--ui' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), dot ? /*#__PURE__*/React.createElement("span", {
    className: "pf-tag__dot",
    style: {
      background: SEMANTIC[dot] || dot
    }
  }) : null, /*#__PURE__*/React.createElement("span", {
    className: "pf-tag__label"
  }, children), onRemove ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "pf-tag__x",
    "aria-label": "Remove",
    onClick: onRemove
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "2.5",
    strokeLinecap: "round"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M18 6 6 18M6 6l12 12"
  }))) : null);
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/surfaces/Tag.jsx", error: String((e && e.message) || e) }); }

// flows/_shared/kit.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Shared workbench kit for pdf-forge flow mockups. → window.PFW
// Reusable three-zone chrome + board + press job card + canvas layout.
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const {
    PageSheet,
    InsertionBar,
    Button,
    IconButton,
    StatusPill,
    Tag,
    Checkbox,
    SegmentedControl,
    Tooltip,
    Spinner
  } = DS;

  // ---- icons (Lucide-style) ----
  const P = {
    layers: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m12 2 9 5-9 5-9-5 9-5Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m3 12 9 5 9-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m3 17 9 5 9-5"
    })),
    file: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M14 3v5h5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    })),
    rotateCW: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M21 12a9 9 0 1 1-2.64-6.36"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "21 3 21 9 15 9"
    })),
    rotateCCW: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 12a9 9 0 1 0 2.64-6.36"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "3 3 3 9 9 9"
    })),
    trash: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 6h18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
    })),
    combine: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "8",
      height: "8",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "13",
      y: "13",
      width: "8",
      height: "8",
      rx: "1"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M11 7h4a2 2 0 0 1 2 2v4"
    })),
    download: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 3v12"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m7 10 5 5 5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 21h14"
    })),
    external: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M15 3h6v6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M10 14 21 3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
    })),
    undo: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9 14 4 9l5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M4 9h11a5 5 0 0 1 0 10h-1"
    })),
    redo: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m15 14 5-5-5-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M20 9H9a5 5 0 0 0 0 10h1"
    })),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    }),
    x: /*#__PURE__*/React.createElement("path", {
      d: "M18 6 6 18M6 6l12 12"
    }),
    alert: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M10.3 3.7 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M12 9v4M12 17h.01"
    })),
    lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "4",
      y: "11",
      width: "16",
      height: "9",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 11V7a4 4 0 0 1 8 0v4"
    })),
    chevron: /*#__PURE__*/React.createElement("path", {
      d: "m9 6 6 6-6 6"
    }),
    panelLeft: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "16",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 4v16"
    })),
    menu: /*#__PURE__*/React.createElement("path", {
      d: "M3 6h18M3 12h18M3 18h18"
    }),
    sliders: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"
    })),
    search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m21 21-4.3-4.3"
    })),
    scissors: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "6",
      r: "3"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "6",
      cy: "18",
      r: "3"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12"
    })),
    grid: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "3",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "14",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "14",
      width: "7",
      height: "7",
      rx: "1"
    })),
    text: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M5 6h14M5 12h14M5 18h9"
    })),
    copy: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "9",
      y: "9",
      width: "12",
      height: "12",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 15V5a2 2 0 0 1 2-2h10"
    })),
    image: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "18",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "8.5",
      cy: "8.5",
      r: "1.8"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m21 15-5-5L5 21"
    })),
    scan: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M6 12h12"
    })),
    zip: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m7.5 4.3 9 5.2M21 8l-9-5-9 5v8l9 5 9-5V8Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m3.3 7 8.7 5 8.7-5M12 22V12"
    })),
    fileText: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M14 3v5h5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 13h6M9 17h4"
    })),
    stop: /*#__PURE__*/React.createElement("rect", {
      x: "6",
      y: "6",
      width: "12",
      height: "12",
      rx: "2"
    }),
    unlock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "4",
      y: "11",
      width: "16",
      height: "9",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 11V7a4 4 0 0 1 7.9-.9"
    })),
    shield: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 3 5 6v5c0 4 3 7 7 8 4-1 7-4 7-8V6l-7-3Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9.5 12l1.8 1.8 3.5-3.6"
    })),
    wrench: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18v3h3l6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6Z"
    })),
    eraser: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "m7 21 10-10-4-4L3 17l4 4Z"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M11 21h9"
    })),
    align: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 6h16M4 12h10M4 18h16"
    })),
    eye: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "12",
      cy: "12",
      r: "3"
    })),
    eyeOff: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 8 10 8a18 18 0 0 1-2.3 3.3M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 3.4-.5M3 3l18 18M9.9 9.9a3 3 0 0 0 4.2 4.2"
    })),
    compress: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M8 3v4H4M16 3v4h4M8 21v-4H4M16 21v-4h4M9 12h6"
    }))
  };
  function Icon({
    name,
    size = 16,
    sw = 2,
    ...rest
  }) {
    return /*#__PURE__*/React.createElement("svg", _extends({
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: sw,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, rest), P[name] || null);
  }
  const EYE = {
    fontFamily: 'var(--font-ui)',
    fontSize: 12,
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    color: 'var(--ink-600)'
  };
  const MONO = {
    fontFamily: 'var(--font-mono)',
    fontVariantNumeric: 'tabular-nums lining-nums'
  };

  // ---- Left rail ----
  function Rail({
    active = 'organize',
    collapsed = false,
    items
  }) {
    const list = items || [{
      id: 'open',
      label: 'Open',
      icon: 'file'
    }, {
      id: 'organize',
      label: 'Organize',
      icon: 'layers'
    }, {
      id: 'combine',
      label: 'Combine',
      icon: 'combine'
    }, {
      id: 'split',
      label: 'Split',
      icon: 'scissors'
    }, {
      id: 'rasterize',
      label: 'Rasterize',
      icon: 'image'
    }, {
      id: 'ocr',
      label: 'OCR',
      icon: 'scan'
    }, {
      id: 'extract',
      label: 'Extract text',
      icon: 'text'
    }, {
      id: 'export',
      label: 'Export',
      icon: 'download'
    }];
    return /*#__PURE__*/React.createElement("nav", {
      style: {
        width: collapsed ? 56 : 220,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderRight: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: collapsed ? 0 : '0 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo/mark.svg",
      width: "26",
      height: "26",
      alt: "",
      style: {
        display: 'block'
      }
    }), !collapsed ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: '-0.01em',
        color: 'var(--ink-900)'
      }
    }, "pdf", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--press-500)'
      }
    }, "-"), "forge") : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        padding: collapsed ? '10px 8px' : 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }
    }, !collapsed ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...EYE,
        padding: '4px 10px 6px'
      }
    }, "Tools") : null, list.map(it => {
      const on = it.id === active;
      return /*#__PURE__*/React.createElement("div", {
        key: it.id,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          height: 36,
          padding: collapsed ? 0 : '0 10px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 'var(--r-ctl)',
          background: on ? 'var(--press-tint)' : 'transparent',
          color: on ? 'var(--press-400)' : 'var(--ink-700)',
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 500
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: it.icon,
        size: 17
      }), !collapsed ? /*#__PURE__*/React.createElement("span", null, it.label) : null);
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: collapsed ? '10px 8px' : 10,
        borderTop: '1px solid var(--sub-600)'
      }
    }, !collapsed ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 10px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-850)',
        color: 'var(--ink-600)',
        ...MONO,
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ok-500)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })), "local \xB7 127.0.0.1") : /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        justifyContent: 'center',
        color: 'var(--ok-500)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 16
    }))));
  }

  // ---- Board header ----
  function BoardHeader({
    docName = 'quarterly-report.pdf',
    pageCount = 24,
    size = 'comfortable',
    selectedCount = 0,
    edits = 0,
    exportDisabled = false,
    exportProcessing = false,
    exportLabel
  }) {
    const lbl = exportLabel || (edits > 0 ? `Export ${edits} edit${edits > 1 ? 's' : ''}` : 'Export');
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        padding: '10px 16px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(Checkbox, {
      checked: selectedCount > 0,
      indeterminate: selectedCount > 0,
      "aria-label": "Select all",
      readOnly: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 13,
        color: 'var(--ink-900)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 200
      }
    }, docName), /*#__PURE__*/React.createElement(Tag, null, pageCount, " pages")), selectedCount > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      status: "selected",
      count: selectedCount
    }, "selected"), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Rotate 90\xB0",
      kbd: "R"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "outlined",
      label: "Rotate"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "rotateCW"
    }))), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Delete",
      kbd: "\u232B"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "danger",
      label: "Delete"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "trash"
    })))) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginLeft: 'auto'
      }
    }, edits > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-700)'
      }
    }, edits, " edits"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--sub-500)'
      }
    }, "\xB7"), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: 'var(--press-400)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "undo",
      size: 13
    }), "Undo")) : null, /*#__PURE__*/React.createElement(SegmentedControl, {
      ariaLabel: "Sheet size",
      value: size,
      options: [{
        value: 'compact',
        label: 'Compact'
      }, {
        value: 'comfortable',
        label: 'Comfortable'
      }, {
        value: 'large',
        label: 'Large'
      }]
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      disabled: exportDisabled,
      processing: exportProcessing,
      rightIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "chevron",
        size: 15
      })
    }, lbl)));
  }
  const WIDTHS = {
    compact: 96,
    comfortable: 132,
    large: 180
  };

  // ---- Board (inset well of sheets) ----
  function Board({
    pages,
    size = 'comfortable',
    grid = true,
    insertBefore = -1,
    marquee = null,
    dim = false,
    children
  }) {
    const width = WIDTHS[size] || 132;
    const gap = size === 'compact' ? 8 : 12;
    const bg = grid ? 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)' : 'var(--sub-700)';
    const sheetH = p => Math.round(width / (p.rotation % 180 !== 0 ? 1 / p.aspect : p.aspect));
    const nodes = [];
    pages.forEach((p, i) => {
      if (insertBefore === i) nodes.push(/*#__PURE__*/React.createElement(InsertionBar, {
        key: 'ins' + i,
        height: sheetH(p)
      }));
      if (p.ghost) {
        nodes.push(/*#__PURE__*/React.createElement("div", {
          key: p.id,
          style: {
            width,
            height: sheetH(p),
            flex: 'none',
            border: '1px dashed var(--sub-500)',
            borderRadius: 'var(--r-sheet)'
          }
        }));
      } else {
        nodes.push(/*#__PURE__*/React.createElement(PageSheet, {
          key: p.id,
          page: p.page,
          width: width,
          aspect: p.aspect,
          rotation: p.rotation,
          selected: p.selected,
          focused: p.focused,
          lifted: p.lifted,
          deleted: p.deleted,
          loading: p.loading
        }));
      }
    });
    if (insertBefore === pages.length) nodes.push(/*#__PURE__*/React.createElement(InsertionBar, {
      key: "ins-end",
      height: Math.round(width * 1.414)
    }));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        margin: 16,
        padding: '22px 20px',
        borderRadius: 'var(--r-panel)',
        background: bg,
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap,
        position: 'relative'
      }
    }, nodes), marquee ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        ...marquee,
        border: '1px solid var(--press-500)',
        background: 'var(--press-tint)',
        opacity: 0.5,
        borderRadius: 2,
        pointerEvents: 'none'
      }
    }) : null, dim ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,10,14,.6)',
        borderRadius: 'var(--r-panel)',
        zIndex: 1
      }
    }) : null, children ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        zIndex: 2,
        padding: 24
      }
    }, children) : null);
  }

  // ---- Press job-readout card (the amber "press at work") ----
  function JobCard({
    state = 'running',
    phase,
    detail,
    jobId,
    code,
    onCancel,
    width = 380
  }) {
    injectPressCss();
    const phases = {
      queued: 'Queued — waiting for a free press',
      running: 'Running — finalize',
      succeeded: 'Finalized',
      failed: 'Finalize failed'
    };
    const tone = state === 'failed' ? 'var(--err-500)' : state === 'succeeded' ? 'var(--ok-500)' : 'var(--proc-500)';
    return /*#__PURE__*/React.createElement("div", {
      className: 'pfw-job ' + (state === 'running' || state === 'queued' ? 'pfw-job--proc' : ''),
      style: {
        width,
        maxWidth: '100%',
        borderRadius: 'var(--r-panel)',
        background: 'var(--sub-800)',
        border: '1px solid var(--sub-600)',
        boxShadow: 'var(--shadow-dialog)',
        overflow: 'hidden',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "pfw-job__sweep",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '18px 18px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, state === 'running' || state === 'queued' ? /*#__PURE__*/React.createElement(Spinner, {
      size: 22,
      tone: "proc"
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        width: 22,
        height: 22,
        display: 'grid',
        placeItems: 'center',
        color: tone
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: state === 'failed' ? 'x' : 'check',
      size: 20,
      sw: 2.4
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 600,
        color: state === 'queued' || state === 'running' ? tone : 'var(--ink-900)'
      }
    }, phase || phases[state]), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, detail), state === 'failed' && code ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--err-500)',
        background: 'rgba(217,89,76,.16)',
        padding: '1px 6px',
        borderRadius: 3,
        alignSelf: 'flex-start',
        marginTop: 2
      }
    }, code) : null)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, "job ", jobId), state === 'running' || state === 'queued' ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      onClick: onCancel
    }, "Cancel") : state === 'failed' ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      onClick: onCancel
    }, "Export again") : null)));
  }
  let pressInjected = false;
  function injectPressCss() {
    if (pressInjected || typeof document === 'undefined') return;
    pressInjected = true;
    const el = document.createElement('style');
    el.textContent = `.pfw-job__sweep{position:absolute;inset:0;z-index:0;opacity:0;overflow:hidden}.pfw-job--proc .pfw-job__sweep{opacity:1}.pfw-job--proc .pfw-job__sweep::before{content:"";position:absolute;top:0;bottom:0;width:40%;background:linear-gradient(90deg,transparent,rgba(224,138,60,.16),transparent);animation:pf-proc-sweep var(--proc-loop) var(--ease-press) infinite}.pfw-job>div{position:relative;z-index:1}`;
    document.head.appendChild(el);
  }

  // ---- Overlay: scrim + centered node ----
  function Overlay({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(8,10,14,.6)',
        padding: 24
      }
    }, children);
  }

  // ---- Three-zone frame ----
  function WorkFrame({
    rail,
    header,
    board,
    inspector,
    overlay
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        background: 'var(--sub-900)',
        color: 'var(--ink-900)',
        overflow: 'hidden'
      }
    }, rail, /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-850)',
        position: 'relative'
      }
    }, header, board, overlay), inspector);
  }

  // ---- Canvas layout (absolutely-positioned labeled frames, row flow) ----
  function CanvasLayout({
    frames,
    colGap = 120,
    rowGap = 96,
    pad = 100,
    maxRowW = 4560
  }) {
    let x = pad,
      y = pad,
      rowH = 0,
      maxX = 0,
      maxY = 0;
    const placed = frames.map(f => {
      if (x > pad && x + f.w > pad + maxRowW) {
        x = pad;
        y += rowH + rowGap + 54;
        rowH = 0;
      }
      const pos = {
        left: x,
        top: y
      };
      x += f.w + colGap;
      rowH = Math.max(rowH, f.h);
      maxX = Math.max(maxX, pos.left + f.w);
      maxY = Math.max(maxY, pos.top + f.h);
      return {
        f,
        pos
      };
    });
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
      style: {
        width: maxX + pad,
        height: maxY + pad + 60
      },
      "aria-hidden": "true"
    }), placed.map(({
      f,
      pos
    }) => /*#__PURE__*/React.createElement("section", {
      key: f.id,
      id: f.id,
      "data-screen-label": f.id,
      style: {
        position: 'absolute',
        left: pos.left,
        top: pos.top,
        width: f.w
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 10,
        marginBottom: 12,
        padding: '6px 12px 6px 8px',
        borderRadius: 'var(--r-pill)',
        background: 'rgba(14,17,22,.85)',
        border: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 13,
        fontWeight: 500,
        color: '#08191f',
        background: 'var(--press-400)',
        padding: '2px 8px',
        borderRadius: 'var(--r-pill)'
      }
    }, f.id), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, f.title), f.note ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, f.note) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        width: f.w,
        height: f.h,
        borderRadius: 'var(--r-panel)',
        overflow: 'hidden',
        border: '1px solid var(--sub-600)',
        boxShadow: '0 20px 60px rgba(5,7,10,.45)'
      }
    }, f.el))));
  }
  window.PFW = {
    Icon,
    Rail,
    BoardHeader,
    Board,
    JobCard,
    Overlay,
    WorkFrame,
    CanvasLayout,
    WIDTHS,
    EYE,
    MONO
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/_shared/kit.jsx", error: String((e && e.message) || e) }); }

// flows/flow-a/data.js
try { (() => {
// pdf-forge flow A — sample data (plain global). → window.PFA_DATA
(function () {
  const ISO = 210 / 297,
    LAND = 297 / 210;
  function makePages(n, landAt) {
    const a = [];
    for (let i = 1; i <= n; i++) a.push({
      id: 'ap' + i,
      page: i,
      aspect: landAt && landAt.includes(i) ? LAND : ISO,
      rotation: 0
    });
    return a;
  }
  window.PFA_DATA = {
    doc: {
      name: 'quarterly-report-2026.pdf',
      pages: 14,
      size: '210 × 297 mm',
      sizeLand: '297 × 210 mm',
      bytes: '5,242,880',
      human: '5.0 MB',
      opened: 'local · not uploaded'
    },
    pages: makePages(14, [9]),
    // one landscape page
    big: {
      name: 'book-scan-500.pdf',
      pages: 500,
      at: 248
    },
    bigPages: makePages(30, []),
    // a visible window of the 500-page doc
    build(pages, overrides) {
      overrides = overrides || {};
      return pages.map(p => Object.assign({
        selected: false,
        focused: false,
        loading: false,
        rotation: p.rotation
      }, p, overrides[p.id] || {}));
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-a/data.js", error: String((e && e.message) || e) }); }

// flows/flow-a/frames.jsx
try { (() => {
// pdf-forge flow A — all frames + Canvas. → window.PFA.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFA = window.PFA,
    DATA = window.PFA_DATA;
  const {
    Rail,
    Board,
    WorkFrame,
    Icon,
    MONO,
    EYE
  } = PFW;
  const {
    Button,
    IconButton,
    PageSheet,
    Tag
  } = DS;
  const DW = 1320,
    DH = 820;
  const rail = /*#__PURE__*/React.createElement(Rail, {
    active: "open"
  });
  const FR = window.PFA_FRAMES = window.PFA_FRAMES || [];
  function MutedInspector() {
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 320,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderLeft: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Document"), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '3px 0 0',
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-500)'
      }
    }, "Facts")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink-600)'
      }
    }, "No document open."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ok-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })), "Stays on this device")));
  }
  function Callout({
    top,
    left,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top,
        left,
        zIndex: 6,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '7px 10px',
        borderRadius: 'var(--r-pill)',
        background: 'rgba(14,17,22,.9)',
        border: '1px solid var(--sub-500)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        color: 'var(--ink-700)'
      }
    }, children);
  }

  // A1 empty
  FR.push({
    id: 'A1',
    w: DW,
    h: DH,
    title: 'Empty',
    note: 'dashed drop target · H1 · privacy label · header disabled',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        empty: true,
        doc: DATA.doc
      }),
      board: /*#__PURE__*/React.createElement(PFA.DropBoard, null),
      inspector: /*#__PURE__*/React.createElement(MutedInspector, null)
    })
  });

  // A2 drop-active
  FR.push({
    id: 'A2',
    w: DW,
    h: DH,
    title: 'Drop-active',
    note: 'valid drop — press-blue border + tint · no upload language',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        empty: true,
        doc: DATA.doc
      }),
      board: /*#__PURE__*/React.createElement(PFA.DropBoard, {
        active: true
      }),
      inspector: /*#__PURE__*/React.createElement(MutedInspector, null)
    })
  });

  // A3 loading (client render)
  FR.push({
    id: 'A3',
    w: DW,
    h: DH,
    title: 'Loading · client render',
    note: 'blank paper placeholders + faint spinner · true aspect · no amber',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        doc: DATA.doc
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        size: "comfortable",
        pages: DATA.build(DATA.pages, {
          ap2: {
            loading: true
          },
          ap5: {
            loading: true
          },
          ap6: {
            loading: true
          },
          ap10: {
            loading: true
          },
          ap13: {
            loading: true
          }
        })
      }),
      inspector: /*#__PURE__*/React.createElement(PFA.AInspector, {
        doc: DATA.doc
      })
    })
  });

  // A4 success default
  FR.push({
    id: 'A4',
    w: DW,
    h: DH,
    title: 'Success · default board',
    note: '14 sheets, comfortable 132px, dealt-card wrap',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        doc: DATA.doc
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        size: "comfortable",
        pages: DATA.build(DATA.pages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFA.AInspector, {
        doc: DATA.doc
      })
    })
  });

  // A5 single-sheet page view
  FR.push({
    id: 'A5',
    w: DW,
    h: DH,
    title: 'Success · single-sheet view',
    note: 'large centered page + zoom + thumbnail strip',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        doc: DATA.doc
      }),
      board: /*#__PURE__*/React.createElement(PFA.SinglePageView, {
        pages: DATA.pages
      }),
      inspector: /*#__PURE__*/React.createElement(PFA.AInspector, {
        doc: DATA.doc
      })
    })
  });

  // A6 virtualized 500
  FR.push({
    id: 'A6',
    w: DW,
    h: DH,
    title: 'Success · 500-page virtualized',
    note: 'compact 96px · lazy rows · mini-scrollbar + page 248 of 500',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        doc: {
          name: DATA.big.name,
          pages: DATA.big.pages
        },
        size: "compact"
      }),
      board: /*#__PURE__*/React.createElement(PFA.VirtualBoard, {
        doc: DATA.big,
        pages: DATA.bigPages
      }),
      inspector: /*#__PURE__*/React.createElement(PFA.AInspector, {
        doc: {
          ...DATA.doc,
          name: DATA.big.name,
          pages: DATA.big.pages
        }
      })
    })
  });

  // A7 selection single
  FR.push({
    id: 'A7',
    w: DW,
    h: DH,
    title: 'Live selection · single',
    note: 'press border + tint + check tab · Export ▶ enabled',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        doc: DATA.doc,
        selectedCount: 1
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        size: "comfortable",
        pages: DATA.build(DATA.pages, {
          ap4: {
            selected: true
          }
        })
      }),
      inspector: /*#__PURE__*/React.createElement(PFA.AInspector, {
        doc: DATA.doc
      })
    })
  });

  // A8 selection multi
  FR.push({
    id: 'A8',
    w: DW,
    h: DH,
    title: 'Live selection · multi',
    note: 'Shift-range · "3 selected" · Export ▶ gateway to Flow B',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        doc: DATA.doc,
        selectedCount: 3
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        size: "comfortable",
        pages: DATA.build(DATA.pages, {
          ap5: {
            selected: true
          },
          ap6: {
            selected: true
          },
          ap7: {
            selected: true
          }
        }),
        marquee: {
          left: 172,
          top: 214,
          width: 300,
          height: 200
        }
      }),
      inspector: /*#__PURE__*/React.createElement(PFA.AInspector, {
        doc: DATA.doc
      })
    })
  });

  // A9 keyboard focus
  FR.push({
    id: 'A9',
    w: DW,
    h: DH,
    title: 'Keyboard focus',
    note: 'roving tabindex — ring + halo + 1px dark spacer on paper',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        doc: DATA.doc
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        size: "comfortable",
        pages: DATA.build(DATA.pages, {
          ap3: {
            focused: true
          }
        })
      }, /*#__PURE__*/React.createElement(Callout, {
        top: 12,
        left: 12
      }, "Arrow keys move focus \xB7 Space selects \xB7 a focused sheet lifts")),
      inspector: /*#__PURE__*/React.createElement(PFA.AInspector, {
        doc: DATA.doc
      })
    })
  });

  // A10 local error
  FR.push({
    id: 'A10',
    w: DW,
    h: DH,
    title: 'Error · local open failure',
    note: 'calm inline note (no server banner) · "It never left your device."',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(PFA.AHeader, {
        empty: true,
        doc: DATA.doc
      }),
      board: /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minHeight: 0,
          margin: 16,
          borderRadius: 'var(--r-panel)',
          background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
          boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
          display: 'grid',
          placeItems: 'center',
          padding: 24
        }
      }, /*#__PURE__*/React.createElement(PFA.ErrorNote, null)),
      inspector: /*#__PURE__*/React.createElement(MutedInspector, null)
    })
  });

  // A11 no-amber annotation
  FR.push({
    id: 'A11',
    w: 620,
    h: 240,
    title: 'No server job in Flow A',
    note: 'privacy non-negotiable',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        justifyContent: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ok-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 20
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, "Flow A uploads nothing")), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink-700)',
        lineHeight: '20px',
        maxWidth: 520
      }
    }, "Opening and previewing runs entirely in the browser via pdf.js \u2014 no server job, no ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "202"), ", no poll, no amber \"press at work\" sweep. That treatment belongs to Flows C/D (heavy server ops). Rendering the sheets onto the lit board is the only bold moment here."))
  });

  // ---- mobile ----
  function AmTop({
    empty
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 48,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Menu"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "menu"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: empty ? 'var(--ink-500)' : 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1
      }
    }, empty ? 'No document' : DATA.doc.name), !empty ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      rightIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "chevron",
        size: 14
      })
    }, "Export") : null);
  }
  const phone = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sub-850)'
  };
  FR.push({
    id: 'Am1',
    w: 390,
    h: 800,
    title: 'Mobile · empty',
    note: 'drop target fills the board · single column',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(AmTop, {
      empty: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 12,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        padding: 16,
        display: 'flex'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        borderRadius: 'var(--r-panel)',
        border: '2px dashed var(--sub-500)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        textAlign: 'center',
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-600)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 30,
      sw: 1.6
    })), /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 22,
        lineHeight: '28px',
        fontWeight: 700,
        color: 'var(--ink-900)'
      }
    }, "Drop a PDF to open it"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, "Stays on this device"))))
  });
  FR.push({
    id: 'Am2',
    w: 390,
    h: 800,
    title: 'Mobile · success',
    note: 'board 2-up · facts as a bottom sheet',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(AmTop, null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        margin: 12,
        padding: 12,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12
      }
    }, DATA.pages.slice(0, 6).map(p => /*#__PURE__*/React.createElement(PageSheet, {
      key: p.id,
      page: p.page,
      width: 166,
      aspect: p.aspect,
      selected: p.page === 2
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 'none',
        background: 'var(--sub-800)',
        borderTop: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel) var(--r-panel) 0 0',
        boxShadow: '0 -12px 32px rgba(5,7,10,.4)',
        padding: '10px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--sub-500)',
        alignSelf: 'center'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, "Pages"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)'
      }
    }, "14")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, "File size"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)'
      }
    }, "5.0 MB")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginTop: 2,
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ok-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })), "local \xB7 not uploaded")))
  });

  // INV
  function InvRow({
    sample,
    name,
    note
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '9px 0',
        borderBottom: '1px solid var(--sub-700)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 130,
        flex: 'none',
        display: 'flex',
        justifyContent: 'center'
      }
    }, sample), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        lineHeight: '16px'
      }
    }, note)));
  }
  FR.push({
    id: 'INV',
    w: 900,
    h: 470,
    title: 'Component inventory',
    note: 'the parts flow A composes',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '16px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(InvRow, {
      name: "Paper sheet",
      note: "true aspect \xB7 face + bottom edge + resting shadow \xB7 page chip \xB7 hover/selected/focus/loading",
      sample: /*#__PURE__*/React.createElement(PageSheet, {
        page: 2,
        width: 64,
        selected: true
      })
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Board header",
      note: "doc name (mono) \xB7 M pages (tabular) \xB7 zoom (96/132/180) \xB7 select-all \xB7 Export \u25B6",
      sample: /*#__PURE__*/React.createElement(Tag, null, "14 pages")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Drop target",
      note: "idle dashed --sub-500 \u2192 active 2px press border + tint",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          width: 40,
          height: 26,
          borderRadius: 4,
          border: '2px dashed var(--sub-500)'
        }
      })
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Facts inspector",
      note: "read-only document facts \xB7 privacy line 'local \xB7 not uploaded'",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ok-500)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "lock",
        size: 20
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Virtualized mini-scrollbar",
      note: "page ticks + press-blue thumb + pinned page N of M",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          width: 8,
          height: 40,
          borderRadius: 999,
          background: 'var(--sub-800)',
          border: '1px solid var(--sub-600)',
          position: 'relative',
          display: 'inline-block'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          inset: '30% 1px auto 1px',
          height: 14,
          borderRadius: 999,
          background: 'var(--press-500)'
        }
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Local-open error note",
      note: "calm err left-rule + muted mono code \xB7 never implies a network round-trip",
      sample: /*#__PURE__*/React.createElement(DS.StatusPill, {
        status: "err"
      }, "local")
    }))
  });

  // NOTES
  function NoteSec({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 15
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...EYE,
        display: 'block',
        marginBottom: 7
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        color: 'var(--ink-700)',
        lineHeight: '19px'
      }
    }, children));
  }
  const M = ({
    children
  }) => /*#__PURE__*/React.createElement("span", {
    style: MONO
  }, children);
  FR.push({
    id: 'NOTES',
    w: 760,
    h: 470,
    title: 'Interaction notes',
    note: 'zero upload — nothing leaves the device',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '16px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(NoteSec, {
      title: "Zero upload"
    }, "The SPA reads bytes into an in-memory page model \u2014 ", /*#__PURE__*/React.createElement("b", null, "no network, no /api call"), ". The board lays out blank paper placeholders at the true page count + true aspect; pdf.js fills faces lazily. There is no amber press because no server job runs."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Selection is live"
    }, "Click selects a sheet (press border + tint + check tab); Shift-range draws a press-tint marquee; header shows ", /*#__PURE__*/React.createElement(M, null, "N selected"), " (tabular). Selection carries straight into Flow B via ", /*#__PURE__*/React.createElement("b", null, "Export \u25B6"), " \u2014 no mode switch. ", /*#__PURE__*/React.createElement("b", null, "No drag commits anything in Flow A.")), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Zoom & virtualization"
    }, "Zoom steps the sheet width 96 / 132 / 180px. At 500 pages the board virtualizes \u2014 only visible rows mount, off-screen sheets are blank paper + a faint spinner, with a right-edge mini-scrollbar (page ticks) and a pinned ", /*#__PURE__*/React.createElement(M, null, "page N of M"), " readout."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Keyboard"
    }, "Roving tabindex; arrow keys move focus, the focused sheet gets the ring + a subtle lift (with a 1px ", /*#__PURE__*/React.createElement(M, null, "--sub-900"), " spacer so the ring holds on white). Space selects."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Reduced motion"
    }, "No hover lift, no spinner motion (cycling ", /*#__PURE__*/React.createElement(M, null, "working\u2026"), " text instead); focus rings and all state colors still render."))
  });
  window.PFA.Canvas = function Canvas() {
    return /*#__PURE__*/React.createElement(PFW.CanvasLayout, {
      frames: window.PFA_FRAMES
    });
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-a/frames.jsx", error: String((e && e.message) || e) }); }

// flows/flow-a/parts.jsx
try { (() => {
// pdf-forge flow A — header, facts inspector, drop board, single-page, virtualized, error. → window.PFA
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon,
    MONO = PFW.MONO,
    EYE = PFW.EYE;
  const {
    PageSheet,
    Button,
    IconButton,
    Checkbox,
    SegmentedControl,
    Tag
  } = DS;

  // header with Export ▶ gateway to Flow B
  function AHeader({
    doc,
    selectedCount = 0,
    size = 'comfortable',
    empty = false
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        padding: '10px 16px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none',
        opacity: empty ? 0.55 : 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(Checkbox, {
      checked: selectedCount > 0,
      indeterminate: selectedCount > 0,
      "aria-label": "Select all",
      readOnly: true,
      disabled: empty
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 13,
        color: empty ? 'var(--ink-500)' : 'var(--ink-900)',
        whiteSpace: 'nowrap'
      }
    }, empty ? 'No document' : doc.name), !empty ? /*#__PURE__*/React.createElement(Tag, null, doc.pages, " pages") : null), selectedCount > 0 ? /*#__PURE__*/React.createElement(DS.StatusPill, {
      status: "selected",
      count: selectedCount
    }, "selected") : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginLeft: 'auto'
      }
    }, /*#__PURE__*/React.createElement(SegmentedControl, {
      ariaLabel: "Sheet size",
      value: size,
      options: [{
        value: 'compact',
        label: 'Compact'
      }, {
        value: 'comfortable',
        label: 'Comfortable'
      }, {
        value: 'large',
        label: 'Large'
      }]
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      disabled: empty,
      rightIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "chevron",
        size: 14
      })
    }, "Export")));
  }

  // read-only document facts
  function Fact({
    k,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
        padding: '7px 0',
        borderBottom: '1px solid var(--sub-700)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)',
        textAlign: 'right'
      }
    }, children));
  }
  function AInspector({
    doc
  }) {
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 320,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderLeft: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Document"), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: '3px 0 0',
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, "Facts")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 16px 16px'
      }
    }, /*#__PURE__*/React.createElement(Fact, {
      k: "Filename"
    }, doc.name), /*#__PURE__*/React.createElement(Fact, {
      k: "Pages"
    }, doc.pages), /*#__PURE__*/React.createElement(Fact, {
      k: "Page size"
    }, doc.size), /*#__PURE__*/React.createElement(Fact, {
      k: "One landscape"
    }, doc.sizeLand), /*#__PURE__*/React.createElement(Fact, {
      k: "File size"
    }, doc.human, " \xB7 ", doc.bytes, " B"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginTop: 12,
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ok-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })), doc.opened)));
  }

  // recessed board well with the drop target (empty / drop-active)
  function DropBoard({
    active = false
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 16,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        padding: 20,
        display: 'flex'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        borderRadius: 'var(--r-panel)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        textAlign: 'center',
        padding: 24,
        border: active ? '2px solid var(--press-500)' : '2px dashed var(--sub-500)',
        background: active ? 'var(--press-tint)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: active ? 'var(--press-400)' : 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 34,
      sw: 1.6
    })), /*#__PURE__*/React.createElement("h1", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 26,
        lineHeight: '32px',
        fontWeight: 700,
        color: 'var(--ink-900)'
      }
    }, "Drop a PDF to open it"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, "Stays on this device \u2014 nothing uploaded")));
  }

  // large single-page view + thumbnail strip
  function SinglePageView({
    pages
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 16,
        borderRadius: 'var(--r-panel)',
        background: 'var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        display: 'flex',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 84,
        flex: 'none',
        borderRight: '1px solid var(--sub-600)',
        padding: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        overflow: 'hidden'
      }
    }, pages.slice(0, 6).map((p, i) => /*#__PURE__*/React.createElement(PageSheet, {
      key: p.id,
      page: p.page,
      width: 60,
      aspect: p.aspect,
      selected: i === 1
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 360,
        height: 509,
        background: 'var(--paper-0)',
        borderRadius: 2,
        borderBottom: '2px solid var(--paper-edge)',
        boxShadow: '0 2px 10px rgba(5,7,10,.5)',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: '36px 40px',
        display: 'flex',
        flexDirection: 'column',
        gap: 11
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 14,
        width: '62%',
        background: '#c9c9c3',
        borderRadius: 2
      }
    }), [92, 98, 88, 95, 74, 90, 84, 96, 70, 88, 80].map((w, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: 5,
        width: w + '%',
        background: '#dcdcd6',
        borderRadius: 1
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: -3,
        bottom: -6,
        background: 'rgba(14,17,22,.82)',
        color: 'var(--ink-900)',
        ...MONO,
        fontSize: 11,
        padding: '2px 7px',
        borderRadius: 999
      }
    }, "2")), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        bottom: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: 4,
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-800)',
        border: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Zoom out"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "minus",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)',
        width: 48,
        textAlign: 'center'
      }
    }, "100%"), /*#__PURE__*/React.createElement(IconButton, {
      label: "Zoom in"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 16
    })))));
  }

  // 500-page virtualized board with mini-scrollbar
  function VirtualBoard({
    doc,
    pages
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 16,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        padding: '16px 30px 16px 16px',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 8
      }
    }, pages.map((p, i) => /*#__PURE__*/React.createElement(PageSheet, {
      key: p.id,
      page: 240 + i,
      width: 96,
      aspect: p.aspect,
      loading: [3, 4, 12, 13, 14].includes(i)
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 12,
        right: 34,
        padding: '3px 9px',
        borderRadius: 999,
        background: 'rgba(14,17,22,.85)',
        border: '1px solid var(--sub-600)',
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-900)'
      }
    }, "page ", doc.at, " of ", doc.pages), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 10,
        bottom: 10,
        right: 10,
        width: 10,
        borderRadius: 999,
        background: 'var(--sub-800)',
        border: '1px solid var(--sub-600)'
      }
    }, [0.1, 0.25, 0.4, 0.55, 0.7, 0.85].map(t => /*#__PURE__*/React.createElement("span", {
      key: t,
      style: {
        position: 'absolute',
        left: 2,
        right: 2,
        top: t * 100 + '%',
        height: 1,
        background: 'var(--sub-500)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 1,
        right: 1,
        top: '46%',
        height: 46,
        borderRadius: 999,
        background: 'var(--press-500)'
      }
    })));
  }

  // calm local-open error (no server chrome)
  function ErrorNote() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 460,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        padding: '14px 16px',
        borderRadius: 'var(--r-panel)',
        background: 'var(--sub-800)',
        border: '1px solid var(--sub-600)',
        borderLeft: '3px solid var(--err-500)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--err-500)',
        display: 'inline-flex',
        marginTop: 1,
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, "That file didn't open as a PDF."), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink-700)'
      }
    }, "It never left your device."), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)',
        marginTop: 2
      }
    }, "bad_pdf_structure \xB7 not_a_pdf")));
  }
  window.PFA = {
    AHeader,
    AInspector,
    DropBoard,
    SinglePageView,
    VirtualBoard,
    ErrorNote
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-a/parts.jsx", error: String((e && e.message) || e) }); }

// flows/flow-b/data.js
try { (() => {
// pdf-forge flow B — sample data (plain global). → window.PFB_DATA
(function () {
  const ISO = 210 / 297; // 0.707 portrait
  const LAND = 297 / 210; // 1.414 landscape
  const pages = [];
  for (let i = 1; i <= 24; i++) {
    pages.push({
      id: 'pg' + i,
      page: i,
      aspect: i === 9 ? LAND : ISO,
      rotation: 0
    });
  }
  window.PFB_DATA = {
    doc: {
      name: 'quarterly-report.pdf',
      pages: 24,
      bytes: 7340032,
      human: '7.0 MB'
    },
    pages,
    jobId: '3c7e1a9b5d2f4e6080a1b2c3d4e5f607',
    jobShort: '3c7e…f607',
    result: {
      filename: 'quarterly-report-organized.pdf',
      bytes: 6815744,
      human: '6.5 MB',
      bytesExact: '6,815,744'
    },
    editLog: [{
      k: 'delete',
      text: 'Deleted page 12'
    }, {
      k: 'rotate',
      text: 'Rotated page 4 · 90°'
    }, {
      k: 'move',
      text: 'Moved page 7 → 3'
    }, {
      k: 'delete',
      text: 'Deleted page 18'
    }],
    // helper: clone the page list, apply per-id state overrides
    build(overrides) {
      overrides = overrides || {};
      return pages.map(p => Object.assign({
        selected: false,
        focused: false,
        lifted: false,
        deleted: false,
        ghost: false,
        rotation: p.rotation
      }, p, overrides[p.id] || {}));
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-b/data.js", error: String((e && e.message) || e) }); }

// flows/flow-b/framesA.jsx
try { (() => {
// pdf-forge flow B — desktop frames B1–B7. → pushes to window.PFB_FRAMES
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFB = window.PFB,
    DATA = window.PFB_DATA;
  const {
    Icon,
    Rail,
    BoardHeader,
    Board,
    JobCard,
    WorkFrame,
    MONO
  } = PFW;
  const {
    Button,
    PageSheet,
    Spinner,
    InlineBanner
  } = DS;
  const DW = 1320,
    DH = 820;
  const rail = /*#__PURE__*/React.createElement(Rail, {
    active: "organize"
  });
  const FR = window.PFB_FRAMES = window.PFB_FRAMES || [];
  function Callout({
    top,
    left,
    right,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top,
        left,
        right,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 9px',
        borderRadius: 'var(--r-pill)',
        background: 'rgba(14,17,22,.9)',
        border: '1px solid var(--sub-500)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        color: 'var(--ink-700)',
        whiteSpace: 'nowrap'
      }
    }, children);
  }
  function ClientCard({
    label,
    sub
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: 320,
        borderRadius: 'var(--r-panel)',
        background: 'var(--sub-800)',
        border: '1px solid var(--sub-600)',
        padding: '18px',
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Spinner, {
      size: 22,
      tone: "ink"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, label), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, sub)));
  }
  function FannedStack({
    top,
    left,
    count
  }) {
    const w = 132;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top,
        left,
        zIndex: 6,
        width: w,
        height: Math.round(w * 1.414)
      }
    }, [2, 1, 0].map(k => /*#__PURE__*/React.createElement("div", {
      key: k,
      style: {
        position: 'absolute',
        inset: 0,
        transform: `rotate(${(k - 1) * 4 + 1.5}deg) translate(${k * 5}px, ${k * 4}px) scale(1.04)`,
        transformOrigin: 'center',
        opacity: k === 0 ? 0.98 : 0.5 - k * 0.12
      }
    }, /*#__PURE__*/React.createElement(PageSheet, {
      page: 3 + (2 - k),
      width: w,
      lifted: k === 0,
      showChip: k === 0
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        top: -10,
        right: -12,
        zIndex: 8,
        minWidth: 22,
        height: 22,
        padding: '0 6px',
        borderRadius: 'var(--r-pill)',
        background: 'var(--press-500)',
        color: '#08191f',
        ...MONO,
        fontSize: 12,
        fontWeight: 600,
        display: 'grid',
        placeItems: 'center',
        boxShadow: '0 2px 6px rgba(5,7,10,.5)'
      }
    }, count));
  }

  // B1 — Empty / inherits flow A
  FR.push({
    id: 'B1',
    w: DW,
    h: DH,
    title: 'Empty · inherits flow A',
    note: 'freshly opened doc, no edits — roving focus on page 1, Export disabled',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        edits: 0,
        exportDisabled: true,
        selectedCount: 0
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build({
          pg1: {
            focused: true
          }
        })
      }),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 0,
        edits: 0,
        editLog: []
      })
    })
  });

  // B2 — Editing / multi-select
  FR.push({
    id: 'B2',
    w: DW,
    h: DH,
    title: 'Editing · multi-select',
    note: '3 selected · one rotated 90° · 4 edits',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        edits: 4,
        selectedCount: 3
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build({
          pg3: {
            selected: true
          },
          pg4: {
            selected: true,
            rotation: 90
          },
          pg5: {
            selected: true
          }
        })
      }, /*#__PURE__*/React.createElement(Callout, {
        top: 12,
        left: 12
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--press-400)'
        }
      }, "Click"), " single \xB7", /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--press-400)'
        }
      }, "Shift"), " range \xB7", /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--press-400)'
        }
      }, "\u2318-click"), " toggle \xB7", /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--press-400)'
        }
      }, "drag"), " marquee")),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 3,
        edits: 4,
        editLog: DATA.editLog
      })
    })
  });

  // B3 — Drag in progress (signature)
  (function () {
    let list = DATA.build({
      pg6: {
        ghost: true
      }
    });
    const src = DATA.pages.find(p => p.id === 'pg6');
    const lift = Object.assign({}, src, {
      id: 'pg6-lift',
      lifted: true,
      selected: false
    });
    const idx = list.findIndex(p => p.id === 'pg11');
    list = [...list.slice(0, idx), lift, ...list.slice(idx)];
    FR.push({
      id: 'B3',
      w: DW,
      h: DH,
      title: 'Drag in progress · the signature',
      note: 'lifted sheet · dashed ghost origin · press-blue insertion bar',
      el: /*#__PURE__*/React.createElement(WorkFrame, {
        rail: rail,
        header: /*#__PURE__*/React.createElement(BoardHeader, {
          edits: 4,
          selectedCount: 0
        }),
        board: /*#__PURE__*/React.createElement(Board, {
          pages: list,
          insertBefore: idx
        }, /*#__PURE__*/React.createElement(Callout, {
          top: 12,
          left: 12
        }, "scale 1.04 \xB7 tilt 1.5\xB0 \xB7 neighbors ease aside 180ms")),
        inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
          selectedCount: 0,
          edits: 4,
          editLog: DATA.editLog
        })
      })
    });
  })();

  // B3b — Multi-drag fanned stack
  (function () {
    const idx = DATA.pages.findIndex(p => p.id === 'pg11');
    FR.push({
      id: 'B3b',
      w: DW,
      h: DH,
      title: 'Multi-drag · fanned stack',
      note: 'selection carried as a stack with a count badge',
      el: /*#__PURE__*/React.createElement(WorkFrame, {
        rail: rail,
        header: /*#__PURE__*/React.createElement(BoardHeader, {
          edits: 5,
          selectedCount: 3
        }),
        board: /*#__PURE__*/React.createElement(Board, {
          pages: DATA.build({
            pg3: {
              ghost: true
            },
            pg4: {
              ghost: true
            },
            pg5: {
              ghost: true
            }
          }),
          insertBefore: idx
        }, /*#__PURE__*/React.createElement(FannedStack, {
          top: 196,
          left: 604,
          count: 3
        })),
        inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
          selectedCount: 3,
          edits: 5,
          editLog: DATA.editLog
        })
      })
    });
  })();

  // B4 — Assembling (client, pre-upload)
  FR.push({
    id: 'B4',
    w: DW,
    h: DH,
    title: 'Assembling · client, pre-upload',
    note: 'pdf-lib save() in a Web Worker — still zero upload, no amber yet',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        edits: 5,
        exportProcessing: true,
        selectedCount: 0
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build(),
        dim: true
      }, /*#__PURE__*/React.createElement(ClientCard, {
        label: "Assembling pages\u2026",
        sub: "building on this device \xB7 zero upload"
      })),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 0,
        edits: 5,
        editLog: DATA.editLog
      })
    })
  });

  // B5 — Press: queued
  FR.push({
    id: 'B5',
    w: DW,
    h: DH,
    title: 'Press lifecycle · queued',
    note: '202 + poll · indeterminate · "waiting for a free press"',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        edits: 5,
        exportProcessing: true,
        selectedCount: 0
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build(),
        dim: true
      }, /*#__PURE__*/React.createElement(JobCard, {
        state: "queued",
        detail: `${DATA.doc.name} · ${DATA.doc.human}`,
        jobId: DATA.jobShort
      })),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 0,
        edits: 5,
        editLog: DATA.editLog
      })
    })
  });

  // B6 — Press: running — finalize
  FR.push({
    id: 'B6',
    w: DW,
    h: DH,
    title: 'Press lifecycle · running',
    note: 'the amber press at work · spinner, not a progress bar (progress:null)',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        edits: 5,
        exportProcessing: true,
        selectedCount: 0
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build(),
        dim: true
      }, /*#__PURE__*/React.createElement(JobCard, {
        state: "running",
        detail: `${DATA.doc.name} · ${DATA.doc.human}`,
        jobId: DATA.jobShort
      })),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 0,
        edits: 5,
        editLog: DATA.editLog
      })
    })
  });

  // B7 — Large-file intercept (routes to flow C)
  FR.push({
    id: 'B7',
    w: DW,
    h: DH,
    title: 'Large-file intercept',
    note: '≥150 MB · quiet, not an error — routes to the server path (flow C)',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        edits: 5,
        exportProcessing: true,
        selectedCount: 0
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build(),
        dim: true
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 440
        }
      }, /*#__PURE__*/React.createElement(InlineBanner, {
        status: "info",
        title: "This is large \u2014 pdf-forge will assemble it on the server instead",
        actions: /*#__PURE__*/React.createElement(Button, {
          size: "sm",
          variant: "primary",
          rightIcon: /*#__PURE__*/React.createElement(Icon, {
            name: "external",
            size: 15
          })
        }, "Continue on the server")
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          ...MONO,
          fontSize: 12
        }
      }, "report-2019-2026.pdf \xB7 182 MB"), " exceeds the 150 MB in-browser limit."))),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 0,
        edits: 5,
        editLog: DATA.editLog
      })
    })
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-b/framesA.jsx", error: String((e && e.message) || e) }); }

// flows/flow-b/framesB.jsx
try { (() => {
// pdf-forge flow B — frames B8–B13 + docs + Canvas. → window.PFB.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFB = window.PFB,
    DATA = window.PFB_DATA;
  const {
    Icon,
    Rail,
    BoardHeader,
    Board,
    JobCard,
    WorkFrame,
    MONO,
    EYE
  } = PFW;
  const {
    Button,
    IconButton,
    PageSheet,
    InsertionBar,
    Tag,
    StatusPill,
    InlineBanner,
    Toast,
    Checkbox
  } = DS;
  const DW = 1320,
    DH = 820;
  const rail = /*#__PURE__*/React.createElement(Rail, {
    active: "organize"
  });
  const FR = window.PFB_FRAMES = window.PFB_FRAMES || [];

  // ---------- B8 engine_error (failed press) ----------
  FR.push({
    id: 'B8',
    w: DW,
    h: DH,
    title: 'Error · finalize failed',
    note: 'failed job engine_error · local pages untouched',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        edits: 5,
        selectedCount: 0
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build(),
        dim: true
      }, /*#__PURE__*/React.createElement(JobCard, {
        state: "failed",
        phase: "Finalize failed while normalizing",
        detail: "Your local pages are untouched \u2014 try Export again.",
        code: "engine_error",
        jobId: DATA.jobShort
      })),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 0,
        edits: 5,
        editLog: DATA.editLog
      })
    })
  });

  // ---------- B8b error catalog ----------
  FR.push({
    id: 'B8b',
    w: 660,
    h: 620,
    title: 'Error catalog',
    note: 'banner: err-tint fill · 3px err rule · mono code (never an HTTP number)',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(PFB.ErrorBanner, {
      kind: "worker",
      retry: "Use server path"
    }), /*#__PURE__*/React.createElement(PFB.ErrorBanner, {
      kind: "file_too_large"
    }), /*#__PURE__*/React.createElement(PFB.ErrorBanner, {
      kind: "bad_pdf_structure",
      retry: "Back to board"
    }), /*#__PURE__*/React.createElement(PFB.ErrorBanner, {
      kind: "queue_full"
    }), /*#__PURE__*/React.createElement(PFB.ErrorBanner, {
      kind: "disk_full",
      retry: "Retry"
    }), /*#__PURE__*/React.createElement(PFB.ErrorBanner, {
      kind: "engine_error",
      retry: "Export again"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        padding: '9px 11px',
        borderRadius: 'var(--r-ctl)',
        background: 'rgba(214,165,60,.1)',
        border: '1px solid rgba(214,165,60,.35)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--warn-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-700)'
      }
    }, "429 honors ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "Retry-After: 30"), " \u2192 auto-retry ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "Retrying in 30s\u2026")))))
  });

  // ---------- B9 success ----------
  FR.push({
    id: 'B9',
    w: DW,
    h: DH,
    title: 'Success · linearized & cleaned',
    note: 'ok artifact row · Download focused · Open result · toast',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        docName: DATA.result.filename,
        edits: 0,
        selectedCount: 0,
        exportLabel: "Export"
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build({
          pg12: {
            deleted: true
          },
          pg18: {
            deleted: true
          },
          pg4: {
            rotation: 90
          }
        })
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 520
        }
      }, /*#__PURE__*/React.createElement(PFB.ArtifactRow, {
        filename: DATA.result.filename,
        human: DATA.result.human,
        bytesExact: DATA.result.bytesExact,
        focusDownload: true
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          right: 16,
          bottom: 16
        }
      }, /*#__PURE__*/React.createElement(Toast, {
        status: "ok",
        title: "Exported \u2014 linearized and cleaned"
      }, DATA.result.filename))),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 0,
        edits: 0,
        editLog: DATA.editLog
      })
    })
  });

  // ---------- B10 guard: delete-all ----------
  FR.push({
    id: 'B10',
    w: DW,
    h: DH,
    title: 'Guard · keep at least one page',
    note: 'deleting every page is blocked',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(BoardHeader, {
        edits: 9,
        selectedCount: 0
      }),
      board: /*#__PURE__*/React.createElement(Board, {
        pages: DATA.build(Object.fromEntries(DATA.pages.map(p => [p.id, {
          deleted: true
        }]))),
        dim: true
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 360,
          borderRadius: 'var(--r-panel)',
          background: 'var(--sub-800)',
          border: '1px solid var(--sub-600)',
          boxShadow: 'var(--shadow-dialog)',
          padding: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--warn-500)',
          display: 'inline-flex'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "alert",
        size: 20
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--ink-900)'
        }
      }, "Add or keep at least one page")), /*#__PURE__*/React.createElement("p", {
        style: {
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--ink-700)',
          lineHeight: '19px'
        }
      }, "A document needs a page. Restore a page or add one before exporting."), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(Button, {
        size: "md",
        variant: "secondary",
        leftIcon: /*#__PURE__*/React.createElement(Icon, {
          name: "undo",
          size: 15
        })
      }, "Undo delete")))),
      inspector: /*#__PURE__*/React.createElement(PFB.Inspector, {
        selectedCount: 0,
        edits: 9,
        editLog: [{
          k: 'delete',
          text: 'Deleted page 24'
        }, ...DATA.editLog]
      })
    })
  });

  // ---------- mobile helpers ----------
  function MTopBar({
    exportLabel = 'Export 5',
    processing
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 48,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Menu"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "menu"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, "quarterly-report.pdf"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: 'auto'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      processing: processing,
      rightIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "chevron",
        size: 14
      })
    }, exportLabel)));
  }
  function MBoard({
    overrides,
    dim
  }) {
    const w = 168;
    const pages = DATA.pages.slice(0, 6).map(p => Object.assign({
      selected: false,
      rotation: p.rotation,
      deleted: false
    }, p, (overrides || {})[p.id] || {}));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        margin: 12,
        padding: 14,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12
      }
    }, pages.map(p => /*#__PURE__*/React.createElement(PageSheet, {
      key: p.id,
      page: p.page,
      width: w,
      aspect: p.aspect,
      rotation: p.rotation,
      selected: p.selected,
      deleted: p.deleted
    }))), dim ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,10,14,.6)',
        borderRadius: 'var(--r-panel)'
      }
    }) : null);
  }
  function MSheet({
    children,
    h = 190
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 'none',
        height: h,
        background: 'var(--sub-800)',
        borderTop: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel) var(--r-panel) 0 0',
        boxShadow: '0 -12px 32px rgba(5,7,10,.4)',
        padding: '10px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--sub-500)',
        alignSelf: 'center'
      }
    }), children);
  }

  // ---------- B11 mobile editing ----------
  FR.push({
    id: 'B11',
    w: 390,
    h: 800,
    title: 'Mobile · editing (375+)',
    note: '2-up board · bottom-sheet inspector · ≥44px targets',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-850)'
      }
    }, /*#__PURE__*/React.createElement(MTopBar, {
      exportLabel: "Export 4"
    }), /*#__PURE__*/React.createElement(MBoard, {
      overrides: {
        pg2: {
          selected: true
        },
        pg3: {
          selected: true,
          rotation: 90
        }
      }
    }), /*#__PURE__*/React.createElement(MSheet, {
      h: 196
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      status: "selected",
      count: 2
    }, "selected"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, "4 edits \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--press-400)',
        fontFamily: 'var(--font-ui)'
      }
    }, "Undo"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      variant: "secondary",
      block: true,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "rotateCW",
        size: 16
      })
    }, "Rotate"), /*#__PURE__*/React.createElement(Button, {
      size: "lg",
      variant: "danger",
      block: true,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "trash",
        size: 16
      })
    }, "Delete")), /*#__PURE__*/React.createElement("div", {
      style: {
        border: '1px dashed var(--sub-500)',
        borderRadius: 'var(--r-ctl)',
        padding: '10px',
        textAlign: 'center',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, "Drop PDFs to combine \u2014 under 150 MB stays on device")))
  });

  // ---------- B12 mobile press ----------
  FR.push({
    id: 'B12',
    w: 390,
    h: 800,
    title: 'Mobile · the press at work',
    note: 'dimmed board · amber job sheet · spinner not a bar',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-850)'
      }
    }, /*#__PURE__*/React.createElement(MTopBar, {
      exportLabel: "Pressing\u2026",
      processing: true
    }), /*#__PURE__*/React.createElement(MBoard, {
      dim: true
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 'none',
        background: 'var(--sub-800)',
        borderTop: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel) var(--r-panel) 0 0',
        boxShadow: '0 -12px 32px rgba(5,7,10,.4)',
        padding: '10px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--sub-500)',
        alignSelf: 'center'
      }
    }), /*#__PURE__*/React.createElement(JobCard, {
      state: "running",
      detail: `${DATA.doc.name} · ${DATA.doc.human}`,
      jobId: DATA.jobShort,
      width: 360
    })))
  });

  // ---------- B13 reduced-motion ----------
  function RMCol({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--sub-700)',
        borderRadius: 'var(--r-panel)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        padding: 16,
        minHeight: 150
      }
    }, children));
  }
  FR.push({
    id: 'B13',
    w: 1180,
    h: 430,
    title: 'prefers-reduced-motion: reduce',
    note: 'no tilt/scale · no spin · no shake · focus rings still render',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 16,
        flex: 1
      }
    }, /*#__PURE__*/React.createElement(RMCol, {
      title: "Drag \u2014 instant, no tilt"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(PageSheet, {
      page: 5,
      width: 92
    }), /*#__PURE__*/React.createElement(InsertionBar, {
      height: 130
    }), /*#__PURE__*/React.createElement(PageSheet, {
      page: 6,
      width: 92
    }))), /*#__PURE__*/React.createElement(RMCol, {
      title: "Processing \u2014 static amber"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 14px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-800)',
        border: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 999,
        background: 'var(--proc-500)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--proc-500)'
      }
    }, "working\u2026"))), /*#__PURE__*/React.createElement(RMCol, {
      title: "Error \u2014 color only, no shake"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 220
      }
    }, /*#__PURE__*/React.createElement(InlineBanner, {
      status: "err",
      title: "Wrong password",
      code: "422"
    }, "No shake under reduced-motion."))), /*#__PURE__*/React.createElement(RMCol, {
      title: "Focus \u2014 always renders"
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        height: 32,
        padding: '0 16px',
        borderRadius: 'var(--r-ctl)',
        border: '1px solid var(--sub-500)',
        background: 'var(--sub-700)',
        color: 'var(--ink-900)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        outline: '2px solid var(--press-500)',
        outlineOffset: 2,
        boxShadow: '0 0 0 6px rgba(31,162,196,.35)'
      }
    }, "Export"))))
  });

  // ---------- INV component inventory ----------
  function InvRow({
    sample,
    name,
    note
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '10px 0',
        borderBottom: '1px solid var(--sub-700)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 150,
        flex: 'none',
        display: 'flex',
        justifyContent: 'center'
      }
    }, sample), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        lineHeight: '16px'
      }
    }, note)));
  }
  FR.push({
    id: 'INV',
    w: 900,
    h: 700,
    title: 'Component inventory',
    note: 'the parts this flow composes',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '20px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(InvRow, {
      name: "Paper-sheet thumbnail",
      note: "true aspect \xB7 page chip (tabular) + \u27F3 rotation \xB7 resting/hover/selected/focus/lifted/deleted",
      sample: /*#__PURE__*/React.createElement(PageSheet, {
        page: 7,
        width: 70,
        selected: true
      })
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Drop-gap insertion bar",
      note: "2px press-blue + end-caps; neighbors ease aside 180ms",
      sample: /*#__PURE__*/React.createElement(InsertionBar, {
        height: 90
      })
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Multi-drag count badge",
      note: "selection carried as a fanned stack with a tabular N",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          minWidth: 22,
          height: 22,
          padding: '0 6px',
          borderRadius: 999,
          background: 'var(--press-500)',
          color: '#08191f',
          ...MONO,
          fontSize: 12,
          fontWeight: 600,
          display: 'grid',
          placeItems: 'center'
        }
      }, "3")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Board header",
      note: "doc name (mono) \xB7 M pages \xB7 zoom \xB7 select-all \xB7 N edits\xB7Undo \xB7 Export \u25B6",
      sample: /*#__PURE__*/React.createElement(Tag, null, "24 pages")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Combine-files drop zone",
      note: "dashed multi-drop \xB7 'under 150 MB stays on this device'",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ink-600)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "combine",
        size: 26
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Press job-readout card",
      note: "queued / running (amber sweep + spinner) / cancel \xB7 resolves to check or code",
      sample: /*#__PURE__*/React.createElement(StatusPill, {
        status: "proc"
      }, "running")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Success artifact row",
      note: "left ok rule \xB7 mono filename \xB7 tabular bytes \xB7 Download + Open result",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ok-500)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "check",
        size: 22,
        sw: 2.4
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Error banner",
      note: "err-tint fill \xB7 3px err rule \xB7 small mono code token (bad_pdf_structure)",
      sample: /*#__PURE__*/React.createElement(StatusPill, {
        status: "err"
      }, "code")
    }))
  });

  // ---------- NOTES interaction notes ----------
  function NoteSec({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...EYE,
        display: 'block',
        marginBottom: 7
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        color: 'var(--ink-700)',
        lineHeight: '19px'
      }
    }, children));
  }
  const K = ({
    children
  }) => /*#__PURE__*/React.createElement("span", {
    style: {
      ...MONO,
      fontSize: 11,
      color: 'var(--ink-900)',
      background: 'var(--sub-700)',
      border: '1px solid var(--sub-500)',
      borderRadius: 3,
      padding: '1px 5px'
    }
  }, children);
  FR.push({
    id: 'NOTES',
    w: 760,
    h: 700,
    title: 'Interaction notes',
    note: 'visuals ↔ data & behavior',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '20px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(NoteSec, {
      title: "Selection idioms"
    }, "Click = single \xB7 ", /*#__PURE__*/React.createElement("b", null, "Shift"), "+click = range (press-tint marquee) \xB7 ", /*#__PURE__*/React.createElement("b", null, "\u2318/Ctrl"), "+click = toggle one \xB7 rubber-band marquee on empty board. Board header shows ", /*#__PURE__*/React.createElement("b", null, "N selected"), " (tabular) with bulk Rotate / Delete."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Operation log"
    }, "Every edit appends to the log \u2192 header reads ", /*#__PURE__*/React.createElement("b", null, "N edits \xB7 Undo"), " and the primary reads ", /*#__PURE__*/React.createElement("b", null, "Export N edits \u25B6"), " to make the commit point explicit. All reorder/rotate/delete/combine are ", /*#__PURE__*/React.createElement("b", null, "client-side, in-memory, zero upload, no spinner"), "."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Undoable vs. committed"
    }, "Everything on the board is undoable (", /*#__PURE__*/React.createElement(K, null, "Ctrl+Z"), "/", /*#__PURE__*/React.createElement(K, null, "Ctrl+Shift+Z"), "). The ", /*#__PURE__*/React.createElement("b", null, "server finalize is committed and not undoable"), " \u2014 that is why Export is an explicit press with an amber lifecycle, not an autosave."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Press lifecycle (202 + poll)"
    }, "Export \u2192 pdf-lib ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "save()"), " in a Web Worker (", /*#__PURE__*/React.createElement("b", null, "Assembling pages\u2026"), ", still zero upload) \u2192 POST bytes to ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "/api/jobs/finalize"), " \u2192 202 + ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "Location"), " \u2192 poll ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "GET /api/jobs/{id}"), " ~1.5s. Phase line = ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "state"), "+", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "stage"), ": ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "queued"), " \u2192 ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "running\xB7finalize"), " \u2192 ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "succeeded"), ". ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "progress:null"), " \u21D2 spinner, never a bar. Cancel \u2192 ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "DELETE /api/jobs/{id}"), "."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Errors"
    }, "Branch on ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "error.code"), " \u2014 show ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "message"), " + a small mono code token, never the HTTP number or engine stderr. This flow: ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "file_too_large"), " (413) \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "bad_pdf_structure"), " (400) \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "queue_full"), " (429, honors ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "Retry-After"), ") \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "disk_full"), " (507) \xB7 failed-job ", /*#__PURE__*/React.createElement("span", {
      style: MONO
    }, "engine_error"), "."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Keyboard model"
    }, "Roving ", /*#__PURE__*/React.createElement("b", null, "tabindex"), "; ", /*#__PURE__*/React.createElement(K, null, "\u2190"), /*#__PURE__*/React.createElement(K, null, "\u2192"), " move focus \xB7 ", /*#__PURE__*/React.createElement(K, null, "Space"), " toggle select \xB7 ", /*#__PURE__*/React.createElement(K, null, "Shift"), "+", /*#__PURE__*/React.createElement(K, null, "\u2192"), " extend \xB7 ", /*#__PURE__*/React.createElement(K, null, "R"), " rotate 90 / ", /*#__PURE__*/React.createElement(K, null, "Shift+R"), " ccw \xB7 ", /*#__PURE__*/React.createElement(K, null, "Delete"), " remove \xB7 ", /*#__PURE__*/React.createElement(K, null, "Ctrl+A"), " select all / ", /*#__PURE__*/React.createElement(K, null, "Esc"), " deselect \xB7 ", /*#__PURE__*/React.createElement(K, null, "Ctrl+E"), " export. Edge auto-scroll within ~48px of board top/bottom while dragging."))
  });

  // ---------- Canvas ----------
  window.PFB.Canvas = function Canvas() {
    return /*#__PURE__*/React.createElement(PFW.CanvasLayout, {
      frames: window.PFB_FRAMES
    });
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-b/framesB.jsx", error: String((e && e.message) || e) }); }

// flows/flow-b/inspector.jsx
try { (() => {
// pdf-forge flow B — inspector + shared parts. → window.PFB
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon,
    EYE = PFW.EYE,
    MONO = PFW.MONO;
  const {
    Button,
    IconButton,
    StatusPill,
    InlineBanner,
    Tag,
    Tooltip
  } = DS;
  function Section({
    label,
    right,
    children,
    style
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px',
        borderBottom: '1px solid var(--sub-600)',
        ...style
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, label), right), children);
  }

  // dashed multi-drop zone
  function CombineDrop({
    active = false
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        border: `1px dashed ${active ? 'var(--press-500)' : 'var(--sub-500)'}`,
        borderRadius: 'var(--r-ctl)',
        background: active ? 'var(--press-tint)' : 'var(--sub-850)',
        padding: '18px 14px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: active ? 'var(--press-400)' : 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "combine",
      size: 22
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--ink-900)'
      }
    }, "Drop PDFs to combine"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        lineHeight: '16px'
      }
    }, "Under 150 MB stays on this device."));
  }
  const KIND_ICON = {
    delete: 'trash',
    rotate: 'rotateCW',
    move: 'layers',
    combine: 'combine'
  };
  function EditLog({
    items,
    onlyN
  }) {
    const rows = onlyN ? items.slice(0, onlyN) : items;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, rows.map((it, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '6px 8px',
        borderRadius: 'var(--r-ctl)',
        background: i === 0 ? 'var(--sub-700)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: it.k === 'delete' ? 'var(--err-500)' : 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: KIND_ICON[it.k],
      size: 14
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: i === 0 ? 'var(--ink-900)' : 'var(--ink-700)'
      }
    }, it.text))));
  }

  // success artifact row (left ok rule)
  function ArtifactRow({
    filename,
    human,
    bytesExact,
    focusDownload = false
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--ok-tint)',
        borderLeft: '3px solid var(--ok-500)',
        border: '1px solid rgba(75,174,126,.35)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ok-500)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 18,
      sw: 2.4
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 13,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, filename), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, bytesExact, " bytes \xB7 ", human)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "external",
        size: 15
      })
    }, "Open result"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 15
      }),
      className: focusDownload ? 'pfb-focus' : ''
    }, "Download")));
  }
  const ERRORS = {
    worker: {
      title: "Couldn't assemble this in the browser",
      code: 'worker_failed',
      msg: 'Try the server path for large files.'
    },
    file_too_large: {
      title: 'This file is over the 200 MB limit',
      code: 'file_too_large',
      msg: 'Trim it or split it first.'
    },
    bad_pdf_structure: {
      title: "pdf-forge couldn't finalize these pages",
      code: 'bad_pdf_structure',
      msg: 'The assembled file looks malformed.'
    },
    queue_full: {
      title: 'Every press is busy right now',
      code: 'queue_full',
      msg: 'Retrying in 30s…'
    },
    disk_full: {
      title: 'Not enough working room on the server',
      code: 'disk_full',
      msg: 'Free some space and retry.'
    },
    engine_error: {
      title: 'Finalize failed while normalizing the file',
      code: 'engine_error',
      msg: 'Your local pages are untouched — try Export again.'
    }
  };
  function ErrorBanner({
    kind,
    retry
  }) {
    const e = ERRORS[kind];
    return /*#__PURE__*/React.createElement(InlineBanner, {
      status: "err",
      title: e.title,
      code: e.code,
      actions: kind === 'queue_full' ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, "Retry now") : retry ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, retry) : null
    }, e.msg);
  }

  // the flow-B inspector
  function Inspector({
    selectedCount = 0,
    edits = 0,
    combineActive = false,
    editLog = []
  }) {
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 320,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderLeft: '1px solid var(--sub-600)',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Inspector"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--press-400)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "layers",
      size: 17
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, "Organize pages"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement(Section, {
      label: selectedCount > 0 ? `${selectedCount} selected` : 'Selection'
    }, selectedCount > 0 ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      block: true,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "rotateCCW",
        size: 15
      })
    }, "Rotate CCW"), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      block: true,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "rotateCW",
        size: 15
      })
    }, "Rotate CW")), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "danger",
      block: true,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "trash",
        size: 15
      })
    }, "Delete ", selectedCount, " page", selectedCount > 1 ? 's' : '')) : /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        lineHeight: '17px'
      }
    }, "Select pages to rotate, delete, or drag to reorder. ", /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        color: 'var(--ink-500)'
      }
    }, "R"), " rotates, ", /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        color: 'var(--ink-500)'
      }
    }, "\u232B"), " deletes.")), /*#__PURE__*/React.createElement(Section, {
      label: "Combine"
    }, /*#__PURE__*/React.createElement(CombineDrop, {
      active: combineActive
    })), /*#__PURE__*/React.createElement(Section, {
      label: "History",
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'auto'
      },
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 4
        }
      }, /*#__PURE__*/React.createElement(IconButton, {
        size: "md",
        label: "Undo",
        variant: "plain"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "undo",
        size: 15
      })), /*#__PURE__*/React.createElement(IconButton, {
        size: "md",
        label: "Redo",
        variant: "plain"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "redo",
        size: 15
      })))
    }, editLog.length ? /*#__PURE__*/React.createElement(EditLog, {
      items: editLog
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-500)'
      }
    }, "No edits yet."))));
  }
  window.PFB = Object.assign(window.PFB || {}, {
    Inspector,
    CombineDrop,
    EditLog,
    ArtifactRow,
    ErrorBanner,
    Section
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-b/inspector.jsx", error: String((e && e.message) || e) }); }

// flows/flow-c/data.js
try { (() => {
// pdf-forge flow C — sample data (plain global). → window.PFC_DATA
(function () {
  window.PFC_DATA = {
    ops: [{
      id: 'merge',
      label: 'Merge',
      icon: 'combine'
    }, {
      id: 'compress',
      label: 'Compress',
      icon: 'compress'
    }, {
      id: 'encrypt',
      label: 'Encrypt',
      icon: 'lock'
    }, {
      id: 'decrypt',
      label: 'Decrypt',
      icon: 'unlock'
    }, {
      id: 'permissions',
      label: 'Permissions',
      icon: 'shield'
    }, {
      id: 'linearize',
      label: 'Linearize',
      icon: 'align'
    }, {
      id: 'repair',
      label: 'Repair',
      icon: 'wrench'
    }, {
      id: 'image-to-pdf',
      label: 'Image → PDF',
      icon: 'image'
    }, {
      id: 'sanitize',
      label: 'Sanitize',
      icon: 'eraser'
    }],
    desc: {
      linearize: 'Restructures the PDF for fast web/streaming view (byte-serving).',
      repair: 'Rebuilds a damaged cross-reference table so the file opens again.',
      merge: 'Joins several PDFs into one, in the order you set below.'
    },
    inputs: {
      compress: {
        name: 'scan.pdf',
        human: '5.0 MB',
        bytes: '5,242,880'
      },
      linearize: {
        name: 'report.pdf',
        human: '12.4 MB',
        bytes: '13,002,342'
      },
      sanitize: {
        name: 'invoice-2026.pdf',
        human: '880 KB',
        bytes: '901,120'
      },
      repair: {
        name: 'damaged-archive.pdf',
        human: '3.1 MB',
        bytes: '3,250,585'
      }
    },
    jobId: '9f8c2a1b4d6e4710b2c3a4f5e6d70819',
    jobShort: '9f8c…0819',
    requestId: '3f1c9a0b8e7d4f62a1c5d9e2b4f60718',
    result: {
      compress: {
        filename: 'scan-compressed.pdf',
        human: '1.8 MB',
        bytes: '1,872,311',
        inHuman: '5.0 MB',
        delta: '−64%',
        kept: 'output'
      },
      compressKeptInput: {
        filename: 'scan.pdf',
        human: '5.0 MB',
        bytes: '5,242,880',
        kept: 'input'
      }
    },
    images: [{
      id: 'img1',
      name: 'page-01.png',
      human: '1.2 MB',
      aspect: 210 / 297
    }, {
      id: 'img2',
      name: 'page-02.jpg',
      human: '940 KB',
      aspect: 297 / 210
    }, {
      id: 'img3',
      name: 'page-03.tif',
      human: '2.8 MB',
      aspect: 210 / 297
    }],
    mergeFiles: [{
      id: 'f1',
      name: 'chapter-a.pdf',
      human: '8.2 MB',
      enc: false
    }, {
      id: 'f2',
      name: 'chapter-b.pdf',
      human: '6.7 MB',
      enc: true
    }]
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-c/data.js", error: String((e && e.message) || e) }); }

// flows/flow-c/frames.jsx
try { (() => {
// pdf-forge flow C — all frames + Canvas. → window.PFC.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFC = window.PFC,
    DATA = window.PFC_DATA;
  const {
    Rail,
    WorkFrame,
    Icon,
    MONO,
    EYE,
    JobCard
  } = PFW;
  const {
    Button,
    IconButton,
    Toast,
    Select,
    Switch
  } = DS;
  const DW = 1320,
    DH = 820;
  const FR = window.PFC_FRAMES = window.PFC_FRAMES || [];
  const railFor = op => /*#__PURE__*/React.createElement(Rail, {
    items: DATA.ops,
    active: op
  });

  // C1 empty
  FR.push({
    id: 'C1',
    w: DW,
    h: DH,
    title: 'Empty · compress selected',
    note: 'op list rail · recessed "Choose a compress input" · calm privacy',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('compress'),
      board: /*#__PURE__*/React.createElement(PFC.CenterPreview, {
        empty: true,
        op: "compress"
      }),
      inspector: /*#__PURE__*/React.createElement(PFC.CInspector, {
        op: "compress"
      })
    })
  });

  // C2 loading (input dropped, pre-Submit)
  FR.push({
    id: 'C2',
    w: DW,
    h: DH,
    title: 'Input dropped · client render',
    note: 'input sheet rendered on-device · options inline-validated · nothing uploaded',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('compress'),
      board: /*#__PURE__*/React.createElement(PFC.CenterPreview, {
        input: DATA.inputs.compress,
        op: "compress"
      }),
      inspector: /*#__PURE__*/React.createElement(PFC.CInspector, {
        op: "compress"
      })
    })
  });

  // C3 in-progress (HERO)
  FR.push({
    id: 'C3',
    w: DW,
    h: DH,
    title: 'In-progress · the press lifecycle',
    note: 'worksurface dims · amber sweep + spinner (progress:null) · phase words, no %',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('compress'),
      board: /*#__PURE__*/React.createElement(PFC.CenterPreview, {
        input: DATA.inputs.compress,
        op: "compress"
      }),
      inspector: /*#__PURE__*/React.createElement(PFC.CInspector, {
        op: "compress",
        uploading: true,
        submitProcessing: true
      }),
      overlay: /*#__PURE__*/React.createElement(PFC.PressOverlay, {
        state: "running",
        phase: "Running \u2014 ghostscript",
        detail: `compress · ${DATA.inputs.compress.name} · ${DATA.inputs.compress.bytes} B`
      })
    })
  });

  // C4 canceled
  FR.push({
    id: 'C4',
    w: DW,
    h: DH,
    title: 'Canceled',
    note: 'DELETE /api/jobs/{id} → "Job canceled. Nothing was kept."',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('compress'),
      board: /*#__PURE__*/React.createElement(PFC.CenterPreview, {
        input: DATA.inputs.compress,
        op: "compress"
      }),
      inspector: /*#__PURE__*/React.createElement(PFC.CInspector, {
        op: "compress"
      }),
      overlay: /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          inset: 0,
          zIndex: 30,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(8,10,14,.5)',
          padding: 24
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          width: 380,
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '16px 18px',
          borderRadius: 'var(--r-panel)',
          background: 'var(--sub-800)',
          border: '1px solid var(--sub-600)',
          boxShadow: 'var(--shadow-dialog)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ink-600)',
          display: 'inline-flex'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "stop",
        size: 20
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--ink-700)'
        }
      }, "Job canceled"), /*#__PURE__*/React.createElement("span", {
        style: {
          ...MONO,
          fontSize: 12,
          color: 'var(--ink-500)'
        }
      }, "Nothing was kept."))))
    })
  });

  // C5 error catalog
  FR.push({
    id: 'C5',
    w: 680,
    h: 560,
    title: 'Error voice · server path',
    note: 'sanitized message + small mono code · Try again keeps your options',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 11
      }
    }, /*#__PURE__*/React.createElement(PFC.ErrorBannerC, {
      kind: "file_too_large"
    }), /*#__PURE__*/React.createElement(PFC.ErrorBannerC, {
      kind: "not_a_pdf"
    }), /*#__PURE__*/React.createElement(PFC.ErrorBannerC, {
      kind: "bad_pdf_structure"
    }), /*#__PURE__*/React.createElement(PFC.ErrorBannerC, {
      kind: "queue_full"
    }), /*#__PURE__*/React.createElement(PFC.ErrorBannerC, {
      kind: "disk_full"
    }), /*#__PURE__*/React.createElement(PFC.ErrorBannerC, {
      kind: "timeout"
    }), /*#__PURE__*/React.createElement(PFC.ErrorBannerC, {
      kind: "engine_error"
    }))
  });

  // C6 success · savings
  FR.push({
    id: 'C6',
    w: DW,
    h: DH,
    title: 'Success · compress savings',
    note: 'amber → green · scrim lifts · 5.0 MB → 1.8 MB (−64%) · Download focused',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('compress'),
      board: /*#__PURE__*/React.createElement(PFC.CenterPreview, {
        input: DATA.inputs.compress,
        op: "compress"
      }),
      inspector: /*#__PURE__*/React.createElement(PFC.CInspector, {
        op: "compress",
        artifact: /*#__PURE__*/React.createElement(PFC.SavingsRow, {
          r: DATA.result.compress
        })
      }),
      overlay: /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 30
        }
      }, /*#__PURE__*/React.createElement(Toast, {
        status: "ok",
        title: "Compressed"
      }, DATA.result.compress.filename))
    })
  });

  // C7 success · kept input (warn)
  FR.push({
    id: 'C7',
    w: 700,
    h: 300,
    title: 'Success · kept your original',
    note: 'meta.kept:"input" — compression would have grown it',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-800)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Result \xB7 compress"), /*#__PURE__*/React.createElement(PFC.SavingsRow, {
      r: DATA.result.compressKeptInput,
      kept: "input"
    }))
  });

  // C8 image-to-pdf tray
  FR.push({
    id: 'C8',
    w: DW,
    h: DH,
    title: 'Image → PDF · ordered tray',
    note: 'tiles in page order, true aspect · per-tile remove',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('image-to-pdf'),
      board: /*#__PURE__*/React.createElement(PFC.ImageTray, {
        images: DATA.images
      }),
      inspector: /*#__PURE__*/React.createElement(PFC.CInspector, {
        op: "image-to-pdf"
      })
    })
  });

  // C9 image tray drag
  FR.push({
    id: 'C9',
    w: DW,
    h: DH,
    title: 'Image → PDF · reordering',
    note: 'lifted tile (scale 1.04, tilt 1.5°) · dashed ghost · press-blue insertion bar',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('image-to-pdf'),
      board: /*#__PURE__*/React.createElement(PFC.ImageTray, {
        images: DATA.images,
        dragging: true
      }),
      inspector: /*#__PURE__*/React.createElement(PFC.CInspector, {
        op: "image-to-pdf"
      })
    })
  });

  // C10 merge tray
  FR.push({
    id: 'C10',
    w: DW,
    h: DH,
    title: 'Merge · input reorder tray',
    note: 'drag to set order · encrypted input shows a mono-dots password field',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('merge'),
      board: /*#__PURE__*/React.createElement(PFC.CenterPreview, {
        empty: true,
        op: "merge"
      }),
      inspector: /*#__PURE__*/React.createElement(PFC.CInspector, {
        op: "merge"
      })
    })
  });

  // C11 reduced-motion
  function RMCol({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: 'var(--sub-700)',
        borderRadius: 'var(--r-panel)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        padding: 14,
        display: 'grid',
        placeItems: 'center'
      }
    }, children));
  }
  FR.push({
    id: 'C11',
    w: 820,
    h: 360,
    title: 'prefers-reduced-motion + focus',
    note: 'static amber + working… · no tilt on drag · focus rings still render',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        display: 'flex',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(RMCol, {
      title: "Press \u2014 static"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-800)',
        border: '1px solid rgba(224,138,60,.4)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 999,
        background: 'var(--proc-500)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--proc-500)'
      }
    }, "working\u2026"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, "Running \u2014 ghostscript")))), /*#__PURE__*/React.createElement(RMCol, {
      title: "Focus \u2014 always renders"
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        height: 40,
        padding: '0 20px',
        borderRadius: 'var(--r-ctl)',
        border: 'none',
        background: 'var(--press-500)',
        color: '#08191f',
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 500,
        outline: '2px solid var(--press-500)',
        outlineOffset: 2,
        boxShadow: '0 0 0 6px rgba(31,162,196,.35)'
      }
    }, "Submit")))
  });

  // ---- mobile ----
  function CmTop() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 48,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Menu"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "menu"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--press-400)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "compress",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ink-900)',
        flex: 1
      }
    }, "Compress"));
  }
  const phone = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sub-850)'
  };
  FR.push({
    id: 'Cm1',
    w: 390,
    h: 800,
    title: 'Mobile · empty',
    note: 'rail → top bar · options → bottom sheet',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(CmTop, null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 12,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        display: 'grid',
        placeItems: 'center',
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        borderRadius: 'var(--r-panel)',
        border: '2px dashed var(--sub-500)',
        padding: '40px 16px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-600)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 28,
      sw: 1.6
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        color: 'var(--ink-700)'
      }
    }, "Choose a compress input"))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 'none',
        background: 'var(--sub-800)',
        borderTop: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel) var(--r-panel) 0 0',
        boxShadow: '0 -12px 32px rgba(5,7,10,.4)',
        padding: '10px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--sub-500)',
        alignSelf: 'center'
      }
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--ink-700)',
        marginBottom: 8
      }
    }, "Preset"), /*#__PURE__*/React.createElement(Select, {
      mono: true,
      options: ['screen', 'ebook', 'printer'],
      defaultValue: "ebook"
    })), /*#__PURE__*/React.createElement(PFC.PrivacyLabel, null), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      block: true
    }, "Submit")))
  });
  FR.push({
    id: 'Cm2',
    w: 390,
    h: 800,
    title: 'Mobile · in-progress',
    note: 'centered amber press stays legible',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(CmTop, null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
        margin: 12,
        borderRadius: 'var(--r-panel)',
        background: 'var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,10,14,.6)',
        borderRadius: 'var(--r-panel)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        zIndex: 1,
        padding: 12,
        width: '100%'
      }
    }, /*#__PURE__*/React.createElement(JobCard, {
      state: "running",
      phase: "Running \u2014 ghostscript",
      detail: `${DATA.inputs.compress.name} · ${DATA.inputs.compress.human}`,
      jobId: DATA.jobShort,
      width: 330
    }))))
  });

  // INV
  function InvRow({
    sample,
    name,
    note
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '9px 0',
        borderBottom: '1px solid var(--sub-700)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 130,
        flex: 'none',
        display: 'flex',
        justifyContent: 'center'
      }
    }, sample), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        lineHeight: '16px'
      }
    }, note)));
  }
  FR.push({
    id: 'INV',
    w: 900,
    h: 500,
    title: 'Component inventory',
    note: 'the parts flow C composes',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '16px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(InvRow, {
      name: "Op-list rail row",
      note: "9 single-PDF ops \xB7 small icon + label \xB7 press-blue selection",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 'var(--r-ctl)',
          background: 'var(--press-tint)',
          color: 'var(--press-400)',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 500
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "compress",
        size: 15
      }), "Compress")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Input sheet preview",
      note: "client-rendered paper sheet, true aspect \xB7 filename chip",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          width: 44,
          height: 62,
          background: 'var(--paper-0)',
          borderRadius: 2,
          borderBottom: '2px solid var(--paper-edge)',
          boxShadow: 'var(--shadow-sheet-rest)',
          display: 'inline-block'
        }
      })
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Press-lifecycle readout",
      note: "amber sweep + spinner + phase line (state+stage) + Cancel \u2192 resolves green/red",
      sample: /*#__PURE__*/React.createElement(DS.StatusPill, {
        status: "proc"
      }, "ghostscript")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Savings / artifact row",
      note: "mono filename \xB7 tabular bytes \xB7 5.0 MB \u2192 1.8 MB (\u221264% ok) \xB7 Download",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          padding: '2px 8px',
          borderRadius: 999,
          background: 'rgba(75,174,126,.16)',
          color: 'var(--ok-500)',
          ...MONO,
          fontSize: 12,
          fontWeight: 600
        }
      }, "\u221264%")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Privacy label",
      note: "calm 'nothing has left this machine' \u2192 flips warn 'Uploading over your LAN only'",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ok-500)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "lock",
        size: 20
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Image tray / merge row",
      note: "reorderable tiles + rows \xB7 lifted + insertion bar \xB7 encrypted row gets a dots field",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'flex',
          gap: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 16,
          height: 22,
          borderRadius: 2,
          background: 'var(--paper-0)'
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          width: 16,
          height: 22,
          borderRadius: 2,
          background: 'var(--paper-0)'
        }
      }))
    }))
  });

  // NOTES
  function NoteSec({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 15
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...EYE,
        display: 'block',
        marginBottom: 7
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        color: 'var(--ink-700)',
        lineHeight: '19px'
      }
    }, children));
  }
  const M = ({
    children
  }) => /*#__PURE__*/React.createElement("span", {
    style: MONO
  }, children);
  FR.push({
    id: 'NOTES',
    w: 760,
    h: 500,
    title: 'Interaction notes',
    note: 'the press lifecycle',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '16px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(NoteSec, {
      title: "Client-side until Submit"
    }, "The input renders on-device via pdf.js \u2014 nothing leaves the machine until you press Submit, when the privacy label flips from calm to the warn-gold \"Uploading over your LAN only\"."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "The press lifecycle"
    }, "Submit \u2192 ", /*#__PURE__*/React.createElement(M, null, "POST /api/jobs/{op}"), " \u2192 202 + ", /*#__PURE__*/React.createElement(M, null, "Location"), ". The worksurface dims (scrim), a centered amber readout runs a 1.6s ", /*#__PURE__*/React.createElement(M, null, "--ease-press"), " sweep + an indeterminate spinner (", /*#__PURE__*/React.createElement(M, null, "progress:null"), " \u21D2 no bar). The phase line is ", /*#__PURE__*/React.createElement(M, null, "state"), "+", /*#__PURE__*/React.createElement(M, null, "stage"), ": ", /*#__PURE__*/React.createElement("b", null, "Running \u2014 ghostscript"), " \u2192 ", /*#__PURE__*/React.createElement("b", null, "Running \u2014 finalize"), ". No percentage \u2014 phase words only. Cancel \u2192 ", /*#__PURE__*/React.createElement(M, null, "DELETE"), "."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Resolve"
    }, "On ", /*#__PURE__*/React.createElement(M, null, "succeeded"), " amber snaps to a green check, the scrim lifts, an ", /*#__PURE__*/React.createElement(M, null, "ok-tint"), " toast appears and an artifact row reveals with Download default-focused. Compress shows the savings delta (", /*#__PURE__*/React.createElement(M, null, "\u221264%"), "); ", /*#__PURE__*/React.createElement(M, null, "meta.kept:\"input\""), " shows a warn \"Kept your original\" chip. A failed job or a 4xx/5xx becomes a red banner with a small mono code and a Try again that preserves your filled-in options."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Trays"
    }, "image\u2192pdf and merge reorder by drag: the lifted tile/row scales 1.04 + tilts 1.5\xB0, a dashed ghost marks the origin, and a 2px press-blue insertion bar shows where it lands. Encrypted merge inputs get a mono-dots password field."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Reduced motion"
    }, "Amber press becomes a static readout + cycling ", /*#__PURE__*/React.createElement(M, null, "working\u2026"), " (no spin/sweep); drag drops the tilt/scale (insertion bar only); errors are color-only; focus rings still render."))
  });
  window.PFC.Canvas = function Canvas() {
    return /*#__PURE__*/React.createElement(PFW.CanvasLayout, {
      frames: window.PFC_FRAMES
    });
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-c/frames.jsx", error: String((e && e.message) || e) }); }

// flows/flow-c/parts.jsx
try { (() => {
// pdf-forge flow C — preview, trays, options, press overlay, artifact, privacy, errors. → window.PFC
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon,
    MONO = PFW.MONO,
    EYE = PFW.EYE;
  const {
    Input,
    Button,
    IconButton,
    Select,
    Switch,
    Tag,
    InlineBanner
  } = DS;
  const JobCard = PFW.JobCard;
  const OP = {
    merge: 'Merge',
    compress: 'Compress',
    encrypt: 'Encrypt',
    decrypt: 'Decrypt',
    permissions: 'Permissions',
    linearize: 'Linearize',
    repair: 'Repair',
    'image-to-pdf': 'Image → PDF',
    sanitize: 'Sanitize'
  };
  const OPICON = {
    merge: 'combine',
    compress: 'compress',
    encrypt: 'lock',
    decrypt: 'unlock',
    permissions: 'shield',
    linearize: 'align',
    repair: 'wrench',
    'image-to-pdf': 'image',
    sanitize: 'eraser'
  };
  const lbl = {
    display: 'block',
    fontFamily: 'var(--font-ui)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ink-700)',
    marginBottom: 8
  };

  // big centered input sheet preview (client-render) or recessed drop target
  function CenterPreview({
    input,
    op,
    empty
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 16,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative'
      }
    }, empty ? /*#__PURE__*/React.createElement("div", {
      style: {
        width: 420,
        borderRadius: 'var(--r-panel)',
        border: '2px dashed var(--sub-500)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: '48px 24px',
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-600)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 30,
      sw: 1.6
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 500,
        color: 'var(--ink-700)'
      }
    }, "Choose a ", op, " input"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, "rendered on this device first")) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 372,
        height: 526,
        background: 'var(--paper-0)',
        borderRadius: 2,
        borderBottom: '2px solid var(--paper-edge)',
        boxShadow: '0 2px 12px rgba(5,7,10,.55)',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: '40px 44px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 15,
        width: '58%',
        background: '#c9c9c3',
        borderRadius: 2
      }
    }), [94, 99, 90, 96, 78, 92, 86, 97, 72, 90, 82, 95].map((w, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: 5,
        width: w + '%',
        background: '#dcdcd6',
        borderRadius: 1
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: -3,
        bottom: -6,
        background: 'rgba(14,17,22,.82)',
        color: 'var(--ink-900)',
        ...MONO,
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999
      }
    }, input.name)));
  }

  // image-to-pdf ordered tray (with a drag-in-progress state)
  function ImageTray({
    images,
    dragging
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 16,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 14
      }
    }, images.map((im, i) => {
      const w = im.aspect > 1 ? 180 : 132;
      const h = Math.round(w / im.aspect);
      if (dragging && i === 0) {
        return /*#__PURE__*/React.createElement(React.Fragment, {
          key: im.id
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            width: 132,
            height: 187,
            borderRadius: 2,
            border: '1px dashed var(--sub-500)',
            flex: 'none'
          }
        }), /*#__PURE__*/React.createElement("div", {
          style: {
            width: 4,
            height: 187,
            flex: 'none',
            position: 'relative'
          }
        }, /*#__PURE__*/React.createElement("div", {
          style: {
            position: 'absolute',
            inset: 0,
            background: 'var(--press-500)',
            borderRadius: 2
          }
        })));
      }
      return /*#__PURE__*/React.createElement("div", {
        key: im.id,
        style: {
          position: 'relative',
          flex: 'none',
          width: w,
          height: h,
          background: 'var(--paper-0)',
          borderRadius: 2,
          borderBottom: '2px solid var(--paper-edge)',
          boxShadow: dragging && i === images.length - 1 ? 'var(--shadow-sheet-lift)' : 'var(--shadow-sheet-rest)',
          transform: dragging && i === images.length - 1 ? 'rotate(1.5deg) scale(1.04)' : 'none',
          overflow: 'hidden'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          inset: 0,
          background: im.aspect > 1 ? 'linear-gradient(120deg,#e8eef2,#d5dde3)' : 'linear-gradient(160deg,#eceae4,#dcd7cd)'
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          left: -3,
          bottom: -6,
          background: 'rgba(14,17,22,.82)',
          color: 'var(--ink-900)',
          ...MONO,
          fontSize: 10,
          padding: '2px 6px',
          borderRadius: 999
        }
      }, i + 1), /*#__PURE__*/React.createElement("button", {
        style: {
          position: 'absolute',
          top: 4,
          right: 4,
          width: 18,
          height: 18,
          borderRadius: 4,
          border: 'none',
          background: 'rgba(14,17,22,.7)',
          color: 'var(--ink-900)',
          display: 'grid',
          placeItems: 'center',
          cursor: 'pointer'
        },
        "aria-label": "Remove"
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "x",
        size: 11
      })));
    }));
  }

  // merge reorder rows (inspector)
  function MergeTray({
    files,
    dragIndex
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7
      }
    }, files.map((f, i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: f.id
    }, dragIndex === i ? /*#__PURE__*/React.createElement("div", {
      style: {
        height: 2,
        background: 'var(--press-500)',
        borderRadius: 1,
        margin: '2px 0'
      }
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '9px 10px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-850)',
        border: '1px solid var(--sub-600)',
        boxShadow: dragIndex === i - 1 ? 'var(--shadow-sheet-lift)' : 'none',
        transform: dragIndex === i - 1 ? 'rotate(1deg) scale(1.02)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 9
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-500)',
        display: 'inline-flex',
        cursor: 'grab'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "menu",
      size: 14
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1,
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, f.name), f.enc ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--warn-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, f.human)), f.enc ? /*#__PURE__*/React.createElement(Input, {
      size: "sm",
      mono: true,
      type: "password",
      defaultValue: "password1",
      prefix: /*#__PURE__*/React.createElement(Icon, {
        name: "lock",
        size: 13
      })
    }) : null))));
  }
  function OpOptions({
    op
  }) {
    if (op === 'compress') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: lbl
    }, "Preset"), /*#__PURE__*/React.createElement(Select, {
      mono: true,
      options: ['screen', 'ebook', 'printer', 'prepress'],
      defaultValue: "ebook"
    })), /*#__PURE__*/React.createElement(Input, {
      label: "Color DPI",
      mono: true,
      defaultValue: "150",
      suffix: "dpi",
      hint: "72\u2013600"
    }));
    if (op === 'image-to-pdf') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: lbl
    }, "Page size"), /*#__PURE__*/React.createElement(Select, {
      options: [{
        value: 'auto',
        label: 'Auto (match image)'
      }, {
        value: 'a4',
        label: 'A4'
      }, {
        value: 'letter',
        label: 'US Letter'
      }],
      defaultValue: "auto"
    })), /*#__PURE__*/React.createElement(Switch, {
      label: "Lossless"
    }));
    if (op === 'sanitize') return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Switch, {
      label: "Strip metadata",
      defaultChecked: true
    }), /*#__PURE__*/React.createElement(Switch, {
      label: "Strip attachments",
      defaultChecked: true
    }));
    if (op === 'encrypt') return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Input, {
      label: "Owner password",
      mono: true,
      type: "password",
      defaultValue: "secret12"
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Confirm",
      mono: true,
      type: "password",
      defaultValue: "secret12"
    }));
    if (op === 'merge') return /*#__PURE__*/React.createElement(MergeTray, {
      files: window.PFC_DATA.mergeFiles
    });
    return /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink-600)',
        lineHeight: '19px'
      }
    }, window.PFC_DATA.desc[op] || 'No options — drop an input and Submit.');
  }
  function PrivacyLabel({
    uploading
  }) {
    return uploading ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '8px 10px',
        borderRadius: 'var(--r-ctl)',
        background: 'rgba(214,165,60,.12)',
        border: '1px solid rgba(214,165,60,.4)',
        ...MONO,
        fontSize: 11,
        color: 'var(--warn-500)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "align",
      size: 13
    }), " Uploading to your pdf-forge \u2014 over your LAN only") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ok-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })), " Client-side until you Submit \u2014 nothing has left this machine");
  }

  // inspector shell
  function CInspector({
    op,
    children,
    uploading,
    submitProcessing,
    artifact
  }) {
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 336,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderLeft: '1px solid var(--sub-600)',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Operation"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--press-400)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: OPICON[op],
      size: 17
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, OP[op]))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, artifact ? artifact : /*#__PURE__*/React.createElement(OpOptions, {
      op: op
    }), children), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        borderTop: '1px solid var(--sub-600)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(PrivacyLabel, {
      uploading: uploading
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      block: true,
      processing: submitProcessing,
      disabled: !!artifact
    }, submitProcessing ? 'Submitting…' : 'Submit')));
  }

  // press overlay (dim + JobCard)
  function PressOverlay({
    state,
    phase,
    detail,
    code,
    onCancel
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(8,10,14,.6)',
        padding: 24
      }
    }, /*#__PURE__*/React.createElement(JobCard, {
      state: state,
      phase: phase,
      detail: detail,
      code: code,
      jobId: window.PFC_DATA.jobShort,
      onCancel: onCancel
    }));
  }

  // success artifact / savings row
  function SavingsRow({
    r,
    kept
  }) {
    if (kept === 'input') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '12px 14px',
          borderRadius: 'var(--r-ctl)',
          background: 'var(--ok-tint)',
          borderLeft: '3px solid var(--ok-500)',
          border: '1px solid rgba(75,174,126,.35)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ok-500)',
          display: 'inline-flex'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "check",
        size: 18,
        sw: 2.4
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          ...MONO,
          fontSize: 13,
          color: 'var(--ink-900)',
          flex: 1
        }
      }, r.filename), /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "primary",
        className: "pfc-focus",
        leftIcon: /*#__PURE__*/React.createElement(Icon, {
          name: "download",
          size: 15
        })
      }, "Download")), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignSelf: 'flex-start',
          alignItems: 'center',
          gap: 6,
          padding: '2px 8px',
          borderRadius: 999,
          background: 'rgba(214,165,60,.14)',
          color: 'var(--warn-500)',
          fontFamily: 'var(--font-ui)',
          fontSize: 11
        }
      }, "Kept your original \u2014 compression would have made it larger"));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        padding: '12px 14px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--ok-tint)',
        borderLeft: '3px solid var(--ok-500)',
        border: '1px solid rgba(75,174,126,.35)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ok-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 18,
      sw: 2.4
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...MONO,
        fontSize: 13,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.filename), /*#__PURE__*/React.createElement("div", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, r.human, " \xB7 ", r.bytes, " B")), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      className: "pfc-focus",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 15
      })
    }, "Download")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        ...MONO,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-600)'
      }
    }, r.inHuman), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-500)'
      }
    }, "\u2192"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ink-900)'
      }
    }, r.human), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        padding: '2px 8px',
        borderRadius: 999,
        background: 'rgba(75,174,126,.16)',
        color: 'var(--ok-500)',
        fontWeight: 600
      }
    }, r.delta)));
  }
  const ERR = {
    file_too_large: {
      t: 'This file is over the 200 MB limit',
      c: 'file_too_large'
    },
    not_a_pdf: {
      t: "That isn't a PDF",
      c: 'not_a_pdf',
      m: "pdf-forge checks the file's contents, not its name."
    },
    bad_pdf_structure: {
      t: 'This PDF is too damaged to open',
      c: 'bad_pdf_structure',
      m: 'Try the Repair op first.'
    },
    queue_full: {
      t: 'Every press is busy',
      c: 'queue_full',
      m: 'Retrying in 30s…'
    },
    disk_full: {
      t: 'The server is low on working storage',
      c: 'disk_full',
      m: 'Free some space and retry.'
    },
    timeout: {
      t: 'This job hit the 120s time limit and was stopped',
      c: 'timeout',
      m: 'Try a smaller file or fewer pages.'
    },
    engine_error: {
      t: "The repair engine couldn't finish this file",
      c: 'engine_error'
    }
  };
  function ErrorBannerC({
    kind
  }) {
    const e = ERR[kind];
    return /*#__PURE__*/React.createElement(InlineBanner, {
      status: "err",
      title: e.t,
      code: e.c,
      actions: /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, "Try again")
    }, e.m);
  }
  window.PFC = {
    CenterPreview,
    ImageTray,
    MergeTray,
    OpOptions,
    PrivacyLabel,
    CInspector,
    PressOverlay,
    SavingsRow,
    ErrorBannerC,
    OP,
    OPICON
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-c/parts.jsx", error: String((e && e.message) || e) }); }

// flows/flow-d/data.js
try { (() => {
// pdf-forge flow D — sample data (plain global). → window.PFD_DATA
(function () {
  const ISO = 210 / 297,
    LAND = 297 / 210;
  function makePages(n, landAt) {
    const a = [];
    for (let i = 1; i <= n; i++) a.push({
      id: 'dp' + i,
      page: i,
      aspect: landAt && landAt.includes(i) ? LAND : ISO,
      rotation: 0
    });
    return a;
  }
  const splitPages = makePages(30, [7]); // book.pdf (shown truncated on the board)
  const ocrPages = makePages(24, [3, 4]); // invoice-scan.pdf

  // three declared split ranges → colored bands
  const bands = [{
    range: '1-10',
    color: '#1FA2C4',
    ids: splitPages.slice(0, 10).map(p => p.id)
  }, {
    range: '11-20',
    color: '#4BAE7E',
    ids: splitPages.slice(10, 20).map(p => p.id)
  }, {
    range: '21-end',
    color: '#D6A53C',
    ids: splitPages.slice(20, 30).map(p => p.id)
  }];
  window.PFD_DATA = {
    docs: {
      split: {
        name: 'book.pdf',
        pages: 210,
        human: '9.4 MB'
      },
      ocr: {
        name: 'invoice-scan.pdf',
        pages: 210,
        bytes: 5242880,
        human: '5.0 MB'
      }
    },
    splitPages,
    ocrPages,
    bands,
    jobId: '9f8c2a1b4d6e4710b2c3a4f5e6d70819',
    jobShort: '9f8c…0819',
    options: {
      split: {
        mode: 'ranges',
        ranges: ['1-10', '11-20', '21-end'],
        n: 10
      },
      rasterize: {
        pages: '1-end',
        dpi: 150,
        format: 'png'
      },
      ocr: {
        languages: ['eng', 'deu'],
        deskew: true,
        sidecar: true
      }
    },
    results: {
      ocr: {
        filename: 'invoice-scan-ocr.zip',
        human: '2.2 MB',
        bytes: 2310544,
        artifacts: [{
          index: 0,
          filename: 'invoice-scan-ocr.pdf',
          media: 'PDF',
          human: '2.0 MB',
          bytesExact: '2,096,331'
        }, {
          index: 1,
          filename: 'invoice-scan.txt',
          media: 'TXT',
          human: '4.8 KB',
          bytesExact: '4,821'
        }]
      },
      split: {
        filename: 'book-split.zip',
        human: '7.5 MB',
        bytes: 7884211,
        artifacts: [{
          index: 0,
          filename: 'book_1-10.pdf',
          media: 'PDF',
          human: '2.5 MB',
          bytesExact: '2,620,114'
        }, {
          index: 1,
          filename: 'book_11-20.pdf',
          media: 'PDF',
          human: '2.4 MB',
          bytesExact: '2,511,880'
        }, {
          index: 2,
          filename: 'book_21-end.pdf',
          media: 'PDF',
          human: '2.6 MB',
          bytesExact: '2,752,217'
        }]
      },
      rasterize: {
        filename: 'book-pages.zip',
        human: '3.4 MB',
        bytes: 3612880,
        artifacts: [{
          index: 0,
          filename: 'page-001.png',
          media: 'PNG',
          human: '180 KB',
          bytesExact: '184,220'
        }, {
          index: 1,
          filename: 'page-002.png',
          media: 'PNG',
          human: '172 KB',
          bytesExact: '176,544'
        }, {
          index: 2,
          filename: 'page-003.png',
          media: 'PNG',
          human: '169 KB',
          bytesExact: '173,109'
        }]
      }
    },
    build(pages, overrides) {
      overrides = overrides || {};
      return pages.map(p => Object.assign({
        selected: false,
        focused: false,
        rotation: p.rotation
      }, p, overrides[p.id] || {}));
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-d/data.js", error: String((e && e.message) || e) }); }

// flows/flow-d/framesA.jsx
try { (() => {
// pdf-forge flow D — frames D1–D5 (options, loading, split bands). → window.PFD_FRAMES
(function () {
  const PFW = window.PFW,
    PFD = window.PFD,
    DATA = window.PFD_DATA;
  const {
    Rail,
    WorkFrame,
    Icon,
    MONO
  } = PFW;
  const DW = 1320,
    DH = 820;
  const FR = window.PFD_FRAMES = window.PFD_FRAMES || [];

  // D1 — empty · Split options
  FR.push({
    id: 'D1',
    w: DW,
    h: DH,
    title: 'Empty · Split options',
    note: 'mode selector + mono ranges field (live-validated)',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "split"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.split
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.splitPages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "split"
      }, /*#__PURE__*/React.createElement(PFD.OpOptions, {
        op: "split"
      }))
    })
  });

  // D2 — empty · Rasterize options
  FR.push({
    id: 'D2',
    w: DW,
    h: DH,
    title: 'Empty · Rasterize options',
    note: 'pages + DPI + format segmented (png / jpeg / pdf)',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "rasterize"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.split
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.splitPages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "rasterize"
      }, /*#__PURE__*/React.createElement(PFD.OpOptions, {
        op: "rasterize"
      }))
    })
  });

  // D3 — empty · OCR options
  FR.push({
    id: 'D3',
    w: DW,
    h: DH,
    title: 'Empty · OCR options',
    note: 'languages multiselect + deskew + sidecar (.txt alongside)',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "ocr"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.ocr
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.ocrPages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "ocr"
      }, /*#__PURE__*/React.createElement(PFD.OpOptions, {
        op: "ocr"
      }))
    })
  });

  // D4 — loading input preview (lazy pdf.js render)
  FR.push({
    id: 'D4',
    w: DW,
    h: DH,
    title: 'Loading · input preview',
    note: 'pdf.js lazy render — blank paper placeholders + faint spinner',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "split"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.split
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.splitPages),
        loadingIds: ['dp5', 'dp6', 'dp11', 'dp12', 'dp17']
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "split"
      }, /*#__PURE__*/React.createElement(PFD.OpOptions, {
        op: "split"
      }))
    })
  });

  // D5 — split multi-select · colored range bands
  (function () {
    const bandMap = {};
    DATA.bands.forEach(b => b.ids.forEach(id => {
      bandMap[id] = b.color;
    }));
    FR.push({
      id: 'D5',
      w: DW,
      h: DH,
      title: 'Split · colored range bands',
      note: 'two-way bound · each range a distinct band · 24 selected',
      el: /*#__PURE__*/React.createElement(WorkFrame, {
        rail: /*#__PURE__*/React.createElement(Rail, {
          active: "split"
        }),
        header: /*#__PURE__*/React.createElement(PFD.DHeader, {
          doc: DATA.docs.split,
          selectedCount: 24
        }),
        board: /*#__PURE__*/React.createElement(PFD.DBoard, {
          pages: DATA.build(DATA.splitPages),
          bandMap: bandMap,
          marquee: {
            left: 14,
            top: 232,
            width: 340,
            height: 118
          }
        }),
        inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
          op: "split"
        }, /*#__PURE__*/React.createElement(PFD.OpOptions, {
          op: "split"
        }), /*#__PURE__*/React.createElement("div", {
          style: {
            display: 'flex',
            flexDirection: 'column',
            gap: 7
          }
        }, DATA.bands.map(b => /*#__PURE__*/React.createElement("div", {
          key: b.range,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 9px',
            borderRadius: 'var(--r-ctl)',
            background: 'var(--sub-850)',
            border: '1px solid var(--sub-600)'
          }
        }, /*#__PURE__*/React.createElement("span", {
          style: {
            width: 10,
            height: 10,
            borderRadius: 3,
            background: b.color,
            flex: 'none'
          }
        }), /*#__PURE__*/React.createElement("span", {
          style: {
            ...MONO,
            fontSize: 12,
            color: 'var(--ink-900)'
          }
        }, b.range), /*#__PURE__*/React.createElement("span", {
          style: {
            marginLeft: 'auto',
            ...MONO,
            fontSize: 11,
            color: 'var(--ink-600)'
          }
        }, "book_", b.range, ".pdf")))))
      })
    });
  })();
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-d/framesA.jsx", error: String((e && e.message) || e) }); }

// flows/flow-d/framesB.jsx
try { (() => {
// pdf-forge flow D — frames D6+ (lifecycle, errors, success, RM, mobile, docs) + Canvas. → window.PFD.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFD = window.PFD,
    DATA = window.PFD_DATA;
  const {
    Rail,
    WorkFrame,
    Icon,
    MONO,
    EYE
  } = PFW;
  const {
    Button,
    IconButton,
    Tag,
    Toast,
    Spinner,
    Switch,
    SegmentedControl
  } = DS;
  const DW = 1320,
    DH = 820;
  const FR = window.PFD_FRAMES = window.PFD_FRAMES || [];

  // D6 — in-progress (OCR press)
  FR.push({
    id: 'D6',
    w: DW,
    h: DH,
    title: 'In-progress · Running — ocr',
    note: 'board dims · amber sweep + spinner (progress:null) · Cancel → DELETE',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "ocr"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.ocr,
        processing: true
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.ocrPages),
        dim: true
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "ocr"
      }, /*#__PURE__*/React.createElement(PFD.DReadout, {
        state: "running",
        phase: "Running \u2014 ocr",
        detail: `${DATA.docs.ocr.name} · ${DATA.docs.ocr.pages} pages`,
        note: "longest job \xB7 per-page 120s timeout",
        jobId: DATA.jobShort
      }))
    })
  });

  // D7 — canceled
  FR.push({
    id: 'D7',
    w: DW,
    h: DH,
    title: 'Canceled',
    note: 'after DELETE /api/jobs/{id} — nothing kept',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "ocr"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.ocr
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.ocrPages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "ocr"
      }, /*#__PURE__*/React.createElement(PFD.DReadout, {
        state: "canceled"
      }), /*#__PURE__*/React.createElement(PFD.OpOptions, {
        op: "ocr"
      }))
    })
  });

  // D8 — 422 out_of_range
  FR.push({
    id: 'D8',
    w: DW,
    h: DH,
    title: 'Error · 422 out_of_range',
    note: 'offending field gets err border + small mono code',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "split"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.split
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.splitPages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "split"
      }, /*#__PURE__*/React.createElement(PFD.OpOptions, {
        op: "split",
        rangeError: "Page 240 is past the end \u2014 this document has 210 pages."
      }), /*#__PURE__*/React.createElement(PFD.ErrorBannerD, {
        kind: "out_of_range"
      }))
    })
  });

  // D9 — 422 invalid_options
  FR.push({
    id: 'D9',
    w: DW,
    h: DH,
    title: 'Error · 422 invalid_options',
    note: 'bad range syntax · human message + mono code',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "split"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.split
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.splitPages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "split"
      }, /*#__PURE__*/React.createElement(PFD.OpOptions, {
        op: "split",
        rangeError: "Couldn't read that range."
      }), /*#__PURE__*/React.createElement(PFD.ErrorBannerD, {
        kind: "invalid_options"
      }))
    })
  });

  // D10 — 404 result_gone
  FR.push({
    id: 'D10',
    w: 660,
    h: 300,
    title: 'Error · 404 result_gone',
    note: 'artifact fetched after TTL — re-run to regenerate',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(PFD.ErrorBannerD, {
      kind: "result_gone"
    }), /*#__PURE__*/React.createElement(PFD.ErrorBannerD, {
      kind: "queue_full"
    }), /*#__PURE__*/React.createElement(PFD.ErrorBannerD, {
      kind: "timeout"
    }))
  });

  // D11 — success · OCR sidecar
  FR.push({
    id: 'D11',
    w: DW,
    h: DH,
    title: 'Success · OCR sidecar (zip + 2)',
    note: 'the MOMENT — artifacts reveal · PDF + TXT',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "ocr"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.ocr
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.ocrPages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "ocr"
      }, /*#__PURE__*/React.createElement(PFD.ArtifactsList, {
        result: DATA.results.ocr
      })),
      overlay: /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 30
        }
      }, /*#__PURE__*/React.createElement(Toast, {
        status: "ok",
        title: "2 files ready"
      }, DATA.results.ocr.filename))
    })
  });

  // D12 — success · Split 3 ranges
  FR.push({
    id: 'D12',
    w: DW,
    h: DH,
    title: 'Success · Split 3 ranges',
    note: 'three PDF artifacts at /result/0..2',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: /*#__PURE__*/React.createElement(Rail, {
        active: "split"
      }),
      header: /*#__PURE__*/React.createElement(PFD.DHeader, {
        doc: DATA.docs.split
      }),
      board: /*#__PURE__*/React.createElement(PFD.DBoard, {
        pages: DATA.build(DATA.splitPages)
      }),
      inspector: /*#__PURE__*/React.createElement(PFD.DInspector, {
        op: "split"
      }, /*#__PURE__*/React.createElement(PFD.ArtifactsList, {
        result: DATA.results.split
      }))
    })
  });

  // D13 — success · Rasterize PNGs
  FR.push({
    id: 'D13',
    w: 700,
    h: 470,
    title: 'Success · Rasterize (zip of PNGs)',
    note: 'PNG chips · page-001.png, page-002.png …',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-800)',
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Inspector"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--press-400)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "image",
      size: 17
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600
      }
    }, "Rasterize"))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16
      }
    }, /*#__PURE__*/React.createElement(PFD.ArtifactsList, {
      result: DATA.results.rasterize
    })))
  });

  // RM — reduced motion (in-progress + success)
  function RMCol({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        background: 'var(--sub-700)',
        borderRadius: 'var(--r-panel)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        padding: 14
      }
    }, children));
  }
  FR.push({
    id: 'RM',
    w: 820,
    h: 360,
    title: 'prefers-reduced-motion: reduce',
    note: 'static amber + working… · success = crossfade · focus rings stay',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        display: 'flex',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(RMCol, {
      title: "In-progress \u2014 static"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 12px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-800)',
        border: '1px solid rgba(224,138,60,.4)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 999,
        background: 'var(--proc-500)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--proc-500)'
      }
    }, "working\u2026"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, "Running \u2014 ocr")))), /*#__PURE__*/React.createElement(RMCol, {
      title: "Success \u2014 crossfade in"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--ok-tint)',
        borderLeft: '3px solid var(--ok-500)',
        border: '1px solid rgba(75,174,126,.35)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ok-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "zip",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)'
      }
    }, "invoice-scan-ocr.zip"))))
  });

  // ---- mobile ----
  function DmTop({
    processing
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 48,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Menu"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "menu"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        flex: 1
      }
    }, DATA.docs.ocr.name), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      processing: processing,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "play",
        size: 13
      })
    }, processing ? 'Running…' : 'Run'));
  }
  function DmBoard({
    dim,
    h = 260
  }) {
    const pages = DATA.ocrPages.slice(0, 4);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 'none',
        height: h,
        overflow: 'hidden',
        margin: 12,
        padding: 12,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12
      }
    }, pages.map(p => /*#__PURE__*/React.createElement(DS.PageSheet, {
      key: p.id,
      page: p.page,
      width: 166,
      aspect: p.aspect
    }))), dim ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,10,14,.6)',
        borderRadius: 'var(--r-panel)'
      }
    }) : null);
  }
  function DmSheet({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        background: 'var(--sub-800)',
        borderTop: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel) var(--r-panel) 0 0',
        boxShadow: '0 -12px 32px rgba(5,7,10,.4)',
        padding: '10px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--sub-500)',
        alignSelf: 'center',
        flex: 'none'
      }
    }), children);
  }
  const phone = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sub-850)'
  };
  FR.push({
    id: 'Dm1',
    w: 390,
    h: 800,
    title: 'Mobile · options',
    note: 'inspector = bottom sheet',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(DmTop, null), /*#__PURE__*/React.createElement(DmBoard, {
      h: 300
    }), /*#__PURE__*/React.createElement(DmSheet, null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--press-400)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "scan",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 600
      }
    }, "OCR")), /*#__PURE__*/React.createElement(PFD.OpOptions, {
      op: "ocr"
    })))
  });
  FR.push({
    id: 'Dm2',
    w: 390,
    h: 800,
    title: 'Mobile · in-progress',
    note: 'dim board · amber readout bottom sheet',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(DmTop, {
      processing: true
    }), /*#__PURE__*/React.createElement(DmBoard, {
      dim: true,
      h: 300
    }), /*#__PURE__*/React.createElement(DmSheet, null, /*#__PURE__*/React.createElement(PFD.DReadout, {
      state: "running",
      phase: "Running \u2014 ocr",
      detail: `${DATA.docs.ocr.name} · 210 pages`,
      jobId: DATA.jobShort
    })))
  });
  FR.push({
    id: 'Dm3',
    w: 390,
    h: 800,
    title: 'Mobile · success',
    note: 'artifacts list stacked in the bottom sheet',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(DmTop, null), /*#__PURE__*/React.createElement(DmBoard, {
      h: 240
    }), /*#__PURE__*/React.createElement(DmSheet, null, /*#__PURE__*/React.createElement(PFD.ArtifactsList, {
      result: DATA.results.ocr
    })))
  });

  // INV
  function InvRow({
    sample,
    name,
    note
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '9px 0',
        borderBottom: '1px solid var(--sub-700)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 130,
        flex: 'none',
        display: 'flex',
        justifyContent: 'center'
      }
    }, sample), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        lineHeight: '16px'
      }
    }, note)));
  }
  FR.push({
    id: 'INV',
    w: 900,
    h: 520,
    title: 'Component inventory',
    note: 'the parts flow D composes',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '16px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(InvRow, {
      name: "Op-options form",
      note: "mode selector \xB7 mono range field \xB7 DPI \xB7 format segmented \xB7 language multiselect \xB7 toggles",
      sample: /*#__PURE__*/React.createElement(SegmentedControl, {
        value: "png",
        options: [{
          value: 'png',
          label: 'PNG'
        }, {
          value: 'jpeg',
          label: 'JPEG'
        }]
      })
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Colored range band",
      note: "split cut boundaries \u2014 distinct accessible tints per range",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'flex',
          gap: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 14,
          height: 20,
          borderRadius: 2,
          background: '#1FA2C4'
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          width: 14,
          height: 20,
          borderRadius: 2,
          background: '#4BAE7E'
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          width: 14,
          height: 20,
          borderRadius: 2,
          background: '#D6A53C'
        }
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Job readout (press at work)",
      note: "amber sweep + spinner (progress:null) + phase line + Cancel\u2192DELETE",
      sample: /*#__PURE__*/React.createElement(DS.StatusPill, {
        status: "proc"
      }, "ocr")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Error banner + mono code",
      note: "human sentence + small code (out_of_range, result_gone) \u2014 no HTTP number",
      sample: /*#__PURE__*/React.createElement(DS.StatusPill, {
        status: "err"
      }, "code")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Artifacts list reveal",
      note: "Download all (.zip) + per-artifact rows: index \xB7 filename \xB7 media chip \xB7 bytes \xB7 Download",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ok-500)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "zip",
        size: 22
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Media-type chip",
      note: "PDF / TXT / PNG \xB7 mono, tabular bytes (2.0 MB \xB7 2,096,331 bytes)",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'flex',
          gap: 4
        }
      }, /*#__PURE__*/React.createElement(Tag, null, "PDF"), /*#__PURE__*/React.createElement(Tag, null, "TXT"))
    }))
  });

  // NOTES
  function NoteSec({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 15
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...EYE,
        display: 'block',
        marginBottom: 7
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        color: 'var(--ink-700)',
        lineHeight: '19px'
      }
    }, children));
  }
  const M = ({
    children
  }) => /*#__PURE__*/React.createElement("span", {
    style: MONO
  }, children);
  FR.push({
    id: 'NOTES',
    w: 760,
    h: 520,
    title: 'Interaction notes',
    note: 'derived artifacts — the input is never mutated',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '16px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(NoteSec, {
      title: "Two-way bind"
    }, "Selecting sheets writes the mono range string; editing the range re-highlights the sheets. For ", /*#__PURE__*/React.createElement("b", null, "split"), ", each declared range is a distinct colored band so cut boundaries are visible before submit (", /*#__PURE__*/React.createElement(M, null, "3 ranges \u2192 3 files"), ")."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Lifecycle (202 + poll, no SSE)"
    }, "Run \u2192 ", /*#__PURE__*/React.createElement(M, null, "POST /api/jobs/{op}"), " \u2192 202 + ", /*#__PURE__*/React.createElement(M, null, "Location"), " \u2192 board dims, inspector shows the amber press. Poll ", /*#__PURE__*/React.createElement(M, null, "GET /api/jobs/{id}"), " ~1.5s; phase = ", /*#__PURE__*/React.createElement(M, null, "state"), "+", /*#__PURE__*/React.createElement(M, null, "stage"), " (e.g. ", /*#__PURE__*/React.createElement("b", null, "Running \u2014 ocr"), "). ", /*#__PURE__*/React.createElement(M, null, "progress:null"), " \u21D2 spinner, never a bar. Cancel \u2192 ", /*#__PURE__*/React.createElement(M, null, "DELETE"), " \u2192 \"Job canceled. Nothing was kept.\""), /*#__PURE__*/React.createElement(NoteSec, {
      title: "The signature moment"
    }, "On ", /*#__PURE__*/React.createElement(M, null, "succeeded"), " the readout expands into the ", /*#__PURE__*/React.createElement(M, null, "artifacts[]"), " reveal: a ", /*#__PURE__*/React.createElement("b", null, "Download all (.zip)"), " row (\u2192 ", /*#__PURE__*/React.createElement(M, null, "/result"), ") plus one row per artifact (\u2192 ", /*#__PURE__*/React.createElement(M, null, "/result/{index}"), ") with a media chip + tabular bytes. This reveal is where boldness is spent \u2014 everything else stays quiet."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Errors"
    }, "Submit-time ", /*#__PURE__*/React.createElement(M, null, "422"), " (", /*#__PURE__*/React.createElement(M, null, "out_of_range"), ", ", /*#__PURE__*/React.createElement(M, null, "invalid_options"), ") reddens the offending field + shows a banner with a small mono code. A stale fetch is ", /*#__PURE__*/React.createElement(M, null, "404 result_gone"), " \u2192 re-run. Never show the HTTP number or engine stderr."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Reduced motion"
    }, "No sweep/spin \u2192 static amber + cycling ", /*#__PURE__*/React.createElement(M, null, "working\u2026"), "; the success reveal is an opacity crossfade; no error shake; focus rings still render."))
  });
  window.PFD.Canvas = function Canvas() {
    return /*#__PURE__*/React.createElement(PFW.CanvasLayout, {
      frames: window.PFD_FRAMES
    });
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-d/framesB.jsx", error: String((e && e.message) || e) }); }

// flows/flow-d/parts.jsx
try { (() => {
// pdf-forge flow D — header, board, op-options, readout, artifacts, inspector. → window.PFD
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon,
    MONO = PFW.MONO,
    EYE = PFW.EYE;
  const {
    PageSheet,
    Input,
    Button,
    IconButton,
    SegmentedControl,
    Switch,
    Tag,
    StatusPill,
    InlineBanner,
    Spinner
  } = DS;
  const OP = {
    split: {
      title: 'Split',
      icon: 'scissors'
    },
    rasterize: {
      title: 'Rasterize',
      icon: 'image'
    },
    ocr: {
      title: 'OCR',
      icon: 'scan'
    }
  };
  const WIDTHS = {
    compact: 96,
    comfortable: 132,
    large: 180
  };
  const lbl = {
    display: 'block',
    fontFamily: 'var(--font-ui)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ink-700)',
    marginBottom: 8
  };

  // ---- header with ▶ Run ----
  function DHeader({
    doc,
    selectedCount = 0,
    size = 'compact',
    processing = false,
    runLabel = 'Run',
    runDisabled = false
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        padding: '10px 16px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(DS.Checkbox, {
      checked: selectedCount > 0,
      indeterminate: selectedCount > 0,
      "aria-label": "Select all",
      readOnly: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 13,
        color: 'var(--ink-900)',
        whiteSpace: 'nowrap'
      }
    }, doc.name), /*#__PURE__*/React.createElement(Tag, null, doc.pages, " pages"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, doc.human)), selectedCount > 0 ? /*#__PURE__*/React.createElement(StatusPill, {
      status: "selected",
      count: selectedCount
    }, "selected") : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginLeft: 'auto'
      }
    }, /*#__PURE__*/React.createElement(SegmentedControl, {
      ariaLabel: "Sheet size",
      value: size,
      options: [{
        value: 'compact',
        label: 'Compact'
      }, {
        value: 'comfortable',
        label: 'Comfortable'
      }, {
        value: 'large',
        label: 'Large'
      }]
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      processing: processing,
      disabled: runDisabled,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "play",
        size: 13
      })
    }, processing ? 'Running…' : runLabel)));
  }

  // ---- board with colored range bands + multi-select ----
  function DBoard({
    pages,
    size = 'compact',
    bandMap = null,
    selectedIds = [],
    marquee = null,
    dim = false,
    loadingIds = [],
    children
  }) {
    const width = WIDTHS[size] || 96;
    const gap = size === 'compact' ? 8 : 12;
    const S = new Set(selectedIds),
      L = new Set(loadingIds);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        margin: 16,
        padding: '18px 16px',
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap,
        position: 'relative'
      }
    }, pages.map(p => {
      const band = bandMap && bandMap[p.id];
      const h = Math.round(width / (p.rotation % 180 !== 0 ? 1 / p.aspect : p.aspect));
      if (L.has(p.id)) {
        return /*#__PURE__*/React.createElement("div", {
          key: p.id,
          style: {
            width,
            height: h,
            flex: 'none',
            background: 'var(--paper-0)',
            borderRadius: 2,
            borderBottom: '2px solid var(--paper-edge)',
            boxShadow: 'var(--shadow-sheet-rest)',
            display: 'grid',
            placeItems: 'center'
          }
        }, /*#__PURE__*/React.createElement(Spinner, {
          size: 18,
          tone: "ink"
        }));
      }
      return /*#__PURE__*/React.createElement("div", {
        key: p.id,
        style: {
          position: 'relative',
          flex: 'none'
        }
      }, /*#__PURE__*/React.createElement(PageSheet, {
        page: p.page,
        width: width,
        aspect: p.aspect,
        rotation: p.rotation,
        selected: S.has(p.id),
        focused: p.focused
      }), band ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          inset: 0,
          outline: `2px solid ${band}`,
          outlineOffset: -2,
          borderRadius: 2,
          pointerEvents: 'none',
          zIndex: 4
        }
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          inset: 0,
          background: band,
          opacity: 0.16,
          borderRadius: 2,
          pointerEvents: 'none',
          zIndex: 4
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          position: 'absolute',
          top: 4,
          right: 4,
          width: 12,
          height: 12,
          borderRadius: 3,
          background: band,
          zIndex: 5
        }
      })) : null);
    })), marquee ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        ...marquee,
        border: '1px solid var(--press-500)',
        background: 'var(--press-tint)',
        opacity: 0.5,
        borderRadius: 2
      }
    }) : null, dim ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,10,14,.6)',
        borderRadius: 'var(--r-panel)',
        zIndex: 1
      }
    }) : null, children ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        zIndex: 2,
        padding: 20
      }
    }, children) : null);
  }

  // ---- op options ----
  function MultiChip({
    items
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, items.map(it => /*#__PURE__*/React.createElement("span", {
      key: it.label,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        height: 26,
        padding: '0 9px',
        borderRadius: 'var(--r-ctl)',
        ...MONO,
        fontSize: 12,
        background: it.on ? 'var(--press-tint)' : 'var(--sub-700)',
        color: it.on ? 'var(--press-400)' : 'var(--ink-600)',
        border: it.on ? '1px solid transparent' : '1px dashed var(--sub-500)'
      }
    }, it.on ? /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 12
    }) : /*#__PURE__*/React.createElement(Icon, {
      name: "plus",
      size: 12
    }), it.label)));
  }
  function OpOptions({
    op,
    rangeError
  }) {
    if (op === 'split') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }
      }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        style: lbl
      }, "Mode"), /*#__PURE__*/React.createElement(SegmentedControl, {
        ariaLabel: "Split mode",
        value: "ranges",
        options: [{
          value: 'ranges',
          label: 'Ranges'
        }, {
          value: 'every_n',
          label: 'Every N'
        }, {
          value: 'single',
          label: 'Single'
        }]
      })), /*#__PURE__*/React.createElement(Input, {
        label: "Ranges",
        mono: true,
        defaultValue: "1-10,11-20,21-end",
        error: rangeError,
        code: rangeError ? rangeError.indexOf('past') >= 0 ? 'out_of_range' : 'invalid_options' : undefined,
        hint: rangeError ? undefined : 'Comma-separated · two-way bound to the board'
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          ...MONO,
          fontSize: 12,
          color: 'var(--ink-600)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "zip",
        size: 14
      }), " 3 ranges \u2192 3 files"));
    }
    if (op === 'rasterize') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }
      }, /*#__PURE__*/React.createElement(Input, {
        label: "Pages",
        mono: true,
        defaultValue: "1-end",
        error: rangeError,
        code: rangeError ? 'out_of_range' : undefined
      }), /*#__PURE__*/React.createElement(Input, {
        label: "DPI",
        mono: true,
        defaultValue: "150",
        suffix: "dpi"
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        style: lbl
      }, "Format"), /*#__PURE__*/React.createElement(SegmentedControl, {
        ariaLabel: "Format",
        value: "png",
        options: [{
          value: 'png',
          label: 'PNG'
        }, {
          value: 'jpeg',
          label: 'JPEG'
        }, {
          value: 'pdf',
          label: 'PDF'
        }]
      })));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: lbl
    }, "Languages"), /*#__PURE__*/React.createElement(MultiChip, {
      items: [{
        label: 'eng',
        on: true
      }, {
        label: 'deu',
        on: true
      }, {
        label: 'fra',
        on: false
      }]
    })), /*#__PURE__*/React.createElement(Switch, {
      label: "Deskew pages",
      defaultChecked: true
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(Switch, {
      label: "Sidecar text file",
      defaultChecked: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        marginTop: 4,
        marginLeft: 44,
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, "Add a .txt alongside the PDF")));
  }

  // ---- job readout (amber press-at-work, inspector block) ----
  function DReadout({
    state = 'running',
    phase,
    detail,
    note,
    jobId,
    onCancel
  }) {
    if (state === 'canceled') {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '13px 14px',
          borderRadius: 'var(--r-panel)',
          background: 'var(--sub-850)',
          border: '1px solid var(--sub-600)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          color: 'var(--ink-600)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "stop",
        size: 18
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--ink-700)'
        }
      }, "Job canceled"), /*#__PURE__*/React.createElement("span", {
        style: {
          ...MONO,
          fontSize: 11,
          color: 'var(--ink-500)'
        }
      }, "Nothing was kept.")));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'var(--r-panel)',
        background: 'var(--sub-850)',
        border: '1px solid rgba(224,138,60,.4)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: '40%',
        background: 'linear-gradient(90deg,transparent,rgba(224,138,60,.16),transparent)',
        animation: 'pf-proc-sweep var(--proc-loop) var(--ease-press) infinite'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11
      }
    }, /*#__PURE__*/React.createElement(Spinner, {
      size: 20,
      tone: "proc"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--proc-500)'
      }
    }, phase), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, detail))), note ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, note) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, "job ", jobId), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "ghost",
      onClick: onCancel
    }, "Cancel"))));
  }

  // ---- artifacts list reveal ----
  const MEDIA_ICON = {
    PDF: 'file',
    TXT: 'fileText',
    PNG: 'image'
  };
  function ArtifactsList({
    result,
    crossfade
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 11,
        padding: '12px 14px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--ok-tint)',
        borderLeft: '3px solid var(--ok-500)',
        border: '1px solid rgba(75,174,126,.35)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ok-500)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "zip",
      size: 18
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, "Download all"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, result.filename, " \xB7 ", result.human)), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 15
      })
    }, ".zip")), result.artifacts.map(a => /*#__PURE__*/React.createElement("div", {
      key: a.index,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-850)',
        border: '1px solid var(--sub-600)',
        borderLeft: '3px solid var(--ok-500)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)',
        width: 14,
        flex: 'none'
      }
    }, a.index), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: MEDIA_ICON[a.media],
      size: 15
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12.5,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, a.filename), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7
      }
    }, /*#__PURE__*/React.createElement(Tag, null, a.media), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, a.human, " \xB7 ", a.bytesExact, " B"))), /*#__PURE__*/React.createElement(IconButton, {
      label: 'Download ' + a.filename,
      variant: "outlined"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "download",
      size: 15
    })))));
  }
  const ERR = {
    out_of_range: {
      t: 'Page 240 is past the end — this document has 210 pages',
      c: 'out_of_range'
    },
    invalid_options: {
      t: "Couldn't read that range",
      c: 'invalid_options',
      m: 'Use forms like 1-10, 12, 20-end.'
    },
    result_gone: {
      t: 'These results have expired and were cleared',
      c: 'result_gone',
      m: 'Re-run the job to get them again.',
      retry: 'Re-run'
    },
    queue_full: {
      t: 'Every press is busy right now',
      c: 'queue_full',
      m: 'Retrying in 30s…'
    },
    timeout: {
      t: 'OCR exceeded the time limit',
      c: 'timeout',
      m: 'Your input is untouched — try a smaller range.',
      retry: 'Try again'
    }
  };
  function ErrorBannerD({
    kind
  }) {
    const e = ERR[kind];
    return /*#__PURE__*/React.createElement(InlineBanner, {
      status: "err",
      title: e.t,
      code: e.c,
      actions: e.retry ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, e.retry) : kind === 'queue_full' ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, "Retry now") : null
    }, e.m);
  }

  // ---- inspector shell ----
  function DInspector({
    op,
    children
  }) {
    const meta = OP[op] || OP.split;
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 330,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderLeft: '1px solid var(--sub-600)',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Inspector"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--press-400)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: meta.icon,
      size: 17
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, meta.title))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, children));
  }
  let injected = false;
  function inject() {
    if (injected || typeof document === 'undefined') return;
    injected = true;
    const s = document.createElement('style');
    s.textContent = '@keyframes pfd-reveal{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}@keyframes pfd-fade{from{opacity:0}to{opacity:1}}';
    document.head.appendChild(s);
  }
  inject();
  window.PFD = {
    DHeader,
    DBoard,
    OpOptions,
    DReadout,
    ArtifactsList,
    ErrorBannerD,
    DInspector,
    MultiChip,
    OP
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-d/parts.jsx", error: String((e && e.message) || e) }); }

// flows/flow-e/data.js
try { (() => {
// pdf-forge flow E — crypto flow data (plain global). → window.PFE_DATA
(function () {
  window.PFE_DATA = {
    ops: [{
      id: 'merge',
      label: 'Merge',
      icon: 'combine'
    }, {
      id: 'compress',
      label: 'Compress',
      icon: 'compress'
    }, {
      id: 'encrypt',
      label: 'Encrypt',
      icon: 'lock'
    }, {
      id: 'decrypt',
      label: 'Decrypt',
      icon: 'unlock'
    }, {
      id: 'permissions',
      label: 'Permissions',
      icon: 'shield'
    }, {
      id: 'linearize',
      label: 'Linearize',
      icon: 'align'
    }, {
      id: 'repair',
      label: 'Repair',
      icon: 'wrench'
    }, {
      id: 'image-to-pdf',
      label: 'Image → PDF',
      icon: 'image'
    }, {
      id: 'sanitize',
      label: 'Sanitize',
      icon: 'eraser'
    }],
    input: {
      name: 'report.pdf',
      human: '4.82 MB',
      bytes: '4,823,104'
    },
    jobId: '7b3e91a04c2d4f8e9a16d5c0e2f47b83',
    jobShort: '7b3e…7b83',
    requestId: '3f1c9a0b8e7d4f62a1c5d9e2b4f60718',
    results: {
      encrypt: {
        filename: 'report-encrypted.pdf',
        human: '4.86 MB',
        bytes: '4,861,002',
        copy: 'Encrypted with AES-256. This file now needs its password to open.'
      },
      decrypt: {
        filename: 'report-unlocked.pdf',
        human: '4.79 MB',
        bytes: '4,802,880',
        copy: 'Unlocked — the password has been removed.'
      },
      permissions: {
        filename: 'report-permissions.pdf',
        human: '4.83 MB',
        bytes: '4,825,610',
        copy: 'Advisory permissions set. Conforming readers will honor them.'
      }
    },
    disclaimer: 'Permissions are advisory. They ask conforming readers to limit printing, copying, or editing — but an owner-password-only PDF still opens for anyone, and many tools ignore these flags. For real confidentiality, use Encrypt with a user password.'
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-e/data.js", error: String((e && e.message) || e) }); }

// flows/flow-e/frames.jsx
try { (() => {
// pdf-forge flow E — all frames + Canvas. → window.PFE.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFE = window.PFE,
    DATA = window.PFE_DATA;
  const {
    Rail,
    WorkFrame,
    Icon,
    MONO,
    EYE,
    JobCard
  } = PFW;
  const {
    Button,
    Toast,
    Switch,
    SegmentedControl
  } = DS;
  const DW = 1320,
    DH = 820;
  const FR = window.PFE_FRAMES = window.PFE_FRAMES || [];
  const railFor = op => /*#__PURE__*/React.createElement(Rail, {
    items: DATA.ops,
    active: op
  });
  const aesNote = /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      ...MONO,
      fontSize: 11,
      color: 'var(--ink-500)'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: "shield",
    size: 13
  }), " AES-256 \xB7 R=6");

  // E1 encrypt form
  FR.push({
    id: 'E1',
    w: DW,
    h: DH,
    title: 'Encrypt · form',
    note: 'user password (required) + optional owner + permission toggles',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('encrypt'),
      board: /*#__PURE__*/React.createElement(PFE.CenterWell, null, /*#__PURE__*/React.createElement(PFE.PreviewSheet, {
        name: DATA.input.name
      })),
      inspector: /*#__PURE__*/React.createElement(PFE.EInspector, {
        op: "encrypt"
      }, /*#__PURE__*/React.createElement(PFE.PasswordField, {
        label: "User password",
        required: true,
        value: "open-sesame",
        hint: "Needed to open the file"
      }), /*#__PURE__*/React.createElement(PFE.PasswordField, {
        label: "Owner password",
        value: "master-key",
        hint: "Optional \xB7 controls permissions"
      }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'block',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 500,
          color: 'var(--ink-700)',
          marginBottom: 8
        }
      }, "Permissions"), /*#__PURE__*/React.createElement(PFE.PermToggles, null)), aesNote)
    })
  });

  // E2 decrypt form (locked sheet)
  FR.push({
    id: 'E2',
    w: DW,
    h: DH,
    title: 'Decrypt · form',
    note: 'locked-sheet placeholder · single open-password field + eye toggle',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('decrypt'),
      board: /*#__PURE__*/React.createElement(PFE.CenterWell, null, /*#__PURE__*/React.createElement(PFE.LockedSheet, {
        name: DATA.input.name
      })),
      inspector: /*#__PURE__*/React.createElement(PFE.EInspector, {
        op: "decrypt"
      }, /*#__PURE__*/React.createElement(PFE.PasswordField, {
        label: "Open password",
        required: true,
        value: "letmein",
        hint: "The password this PDF asks for"
      }))
    })
  });

  // E3 permissions form (disclaimer)
  FR.push({
    id: 'E3',
    w: DW,
    h: DH,
    title: 'Permissions · form',
    note: 'persistent advisory disclaimer above the toggle group',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('permissions'),
      board: /*#__PURE__*/React.createElement(PFE.CenterWell, null, /*#__PURE__*/React.createElement(PFE.PreviewSheet, {
        name: DATA.input.name
      })),
      inspector: /*#__PURE__*/React.createElement(PFE.EInspector, {
        op: "permissions"
      }, /*#__PURE__*/React.createElement(PFE.AdvisoryDisclaimer, null), /*#__PURE__*/React.createElement(PFE.PermToggles, null), /*#__PURE__*/React.createElement(PFE.PasswordField, {
        label: "Owner password",
        value: "master-key",
        hint: "Optional \xB7 locks the permission set"
      }))
    })
  });

  // E3b permissions submit warning
  FR.push({
    id: 'E3b',
    w: DW,
    h: DH,
    title: 'Permissions · owner-only warning',
    note: 'no user password → advisory escalation (submit still allowed)',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('permissions'),
      board: /*#__PURE__*/React.createElement(PFE.CenterWell, null, /*#__PURE__*/React.createElement(PFE.PreviewSheet, {
        name: DATA.input.name
      })),
      inspector: /*#__PURE__*/React.createElement(PFE.EInspector, {
        op: "permissions"
      }, /*#__PURE__*/React.createElement(PFE.AdvisoryDisclaimer, null), /*#__PURE__*/React.createElement(PFE.PermToggles, null), /*#__PURE__*/React.createElement(PFE.SubmitWarn, null, "No user password set \u2014 this file will open for anyone."))
    })
  });

  // E4 in-progress (hero)
  FR.push({
    id: 'E4',
    w: DW,
    h: DH,
    title: 'In-progress · the press',
    note: 'worksurface dims · amber sweep + spinner · Running — pikepdf → finalize',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('encrypt'),
      board: /*#__PURE__*/React.createElement(PFE.CenterWell, null, /*#__PURE__*/React.createElement(PFE.PreviewSheet, {
        name: DATA.input.name
      })),
      inspector: /*#__PURE__*/React.createElement(PFE.EInspector, {
        op: "encrypt",
        submitProcessing: true
      }, /*#__PURE__*/React.createElement(PFE.PasswordField, {
        label: "User password",
        required: true,
        value: "open-sesame"
      })),
      overlay: /*#__PURE__*/React.createElement(PFE.PressOverlay, {
        phase: "Running \u2014 pikepdf"
      })
    })
  });

  // E5 wrong password (motion)
  FR.push({
    id: 'E5',
    w: DW,
    h: DH,
    title: 'Wrong password · shake',
    note: 'err border + shake · value preserved · focus returns to field',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('decrypt'),
      board: /*#__PURE__*/React.createElement(PFE.CenterWell, null, /*#__PURE__*/React.createElement(PFE.LockedSheet, {
        name: DATA.input.name
      })),
      inspector: /*#__PURE__*/React.createElement(PFE.EInspector, {
        op: "decrypt"
      }, /*#__PURE__*/React.createElement(PFE.PasswordField, {
        label: "Open password",
        required: true,
        value: "letmein",
        error: "That password didn't unlock this PDF. Check it and try again.",
        code: "wrong_password"
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          ...MONO,
          fontSize: 11,
          color: 'var(--ink-500)'
        }
      }, "\u21B3 field shakes once on submit (motion)"))
    })
  });

  // E5rm wrong password (reduced motion)
  FR.push({
    id: 'E5rm',
    w: 700,
    h: 420,
    title: 'Wrong password · reduced-motion',
    note: 'color only — no shake · focus rings still render',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-800)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Decrypt \xB7 reduced-motion"), /*#__PURE__*/React.createElement(PFE.PasswordField, {
      label: "Open password",
      required: true,
      value: "letmein",
      error: "That password didn't unlock this PDF. Check it and try again.",
      code: "wrong_password"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, "\u21B3 color only \u2014 no shake; retries are unlimited, nothing kept on failure"))
  });

  // E6 submit errors catalog
  FR.push({
    id: 'E6',
    w: 680,
    h: 500,
    title: 'Submit errors',
    note: 'sanitized message + small mono code · never an HTTP number',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 11
      }
    }, /*#__PURE__*/React.createElement(PFE.ErrorBannerE, {
      kind: "file_too_large"
    }), /*#__PURE__*/React.createElement(PFE.ErrorBannerE, {
      kind: "not_a_pdf"
    }), /*#__PURE__*/React.createElement(PFE.ErrorBannerE, {
      kind: "bad_pdf_structure"
    }), /*#__PURE__*/React.createElement(PFE.ErrorBannerE, {
      kind: "queue_full"
    }), /*#__PURE__*/React.createElement(PFE.ErrorBannerE, {
      kind: "disk_full"
    }))
  });

  // E7 success encrypt
  FR.push({
    id: 'E7',
    w: DW,
    h: DH,
    title: 'Success · Encrypt',
    note: '"Encrypted with AES-256 — now needs its password to open."',
    el: /*#__PURE__*/React.createElement(WorkFrame, {
      rail: railFor('encrypt'),
      board: /*#__PURE__*/React.createElement(PFE.CenterWell, null, /*#__PURE__*/React.createElement(PFE.PreviewSheet, {
        name: DATA.input.name
      })),
      inspector: /*#__PURE__*/React.createElement(PFE.EInspector, {
        op: "encrypt",
        artifact: /*#__PURE__*/React.createElement(PFE.SuccessRow, {
          op: "encrypt"
        })
      }),
      overlay: /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 30
        }
      }, /*#__PURE__*/React.createElement(Toast, {
        status: "ok",
        title: "Encrypted"
      }, DATA.results.encrypt.filename))
    })
  });

  // E8 success decrypt
  FR.push({
    id: 'E8',
    w: 700,
    h: 300,
    title: 'Success · Decrypt',
    note: '"Unlocked — the password has been removed."',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-800)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Result \xB7 decrypt"), /*#__PURE__*/React.createElement(PFE.SuccessRow, {
      op: "decrypt"
    }))
  });

  // E9 success permissions (echoes disclaimer)
  FR.push({
    id: 'E9',
    w: 700,
    h: 340,
    title: 'Success · Permissions',
    note: 'artifact row beneath the echoed advisory disclaimer',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-800)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Result \xB7 permissions"), /*#__PURE__*/React.createElement(PFE.SuccessRow, {
      op: "permissions"
    }))
  });

  // E10 blocked submit + reveal
  FR.push({
    id: 'E10',
    w: 700,
    h: 360,
    title: 'Blocked submit + reveal',
    note: 'client-side block (blank user pw) · eye toggle reveals the value',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-800)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Client-side block"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement(PFE.PasswordField, {
      label: "User password",
      required: true,
      value: "",
      error: "Set a user password \u2014 without one there's nothing to unlock."
    }))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Revealed (eye toggled)"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 8
      }
    }, /*#__PURE__*/React.createElement(PFE.PasswordField, {
      label: "User password",
      required: true,
      revealed: true,
      value: "open-sesame",
      hint: "Never printed anywhere but here"
    }))))
  });

  // ---- mobile ----
  function EmTop({
    op
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 48,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement(DS.IconButton, {
      label: "Menu"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "menu"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--press-400)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: PFE.OPICON[op],
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--ink-900)',
        flex: 1
      }
    }, PFE.OP[op]));
  }
  const phone = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sub-850)'
  };
  function MiniSheet({
    name,
    locked
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 12,
        borderRadius: 'var(--r-panel)',
        background: 'var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        display: 'grid',
        placeItems: 'center',
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 150,
        height: 212,
        background: locked ? 'linear-gradient(160deg,#f0f0ec,#e2e2db)' : 'var(--paper-0)',
        borderRadius: 2,
        borderBottom: '2px solid var(--paper-edge)',
        boxShadow: '0 2px 10px rgba(5,7,10,.5)',
        display: 'grid',
        placeItems: 'center',
        color: '#8a9098'
      }
    }, locked ? /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 24,
      sw: 1.6
    }) : null));
  }
  function BottomSheet({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 'none',
        background: 'var(--sub-800)',
        borderTop: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel) var(--r-panel) 0 0',
        boxShadow: '0 -12px 32px rgba(5,7,10,.4)',
        padding: '10px 16px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--sub-500)',
        alignSelf: 'center'
      }
    }), children);
  }
  FR.push({
    id: 'Em1',
    w: 390,
    h: 800,
    title: 'Mobile · Encrypt form',
    note: 'inspector → bottom sheet',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(EmTop, {
      op: "encrypt"
    }), /*#__PURE__*/React.createElement(MiniSheet, {
      name: DATA.input.name
    }), /*#__PURE__*/React.createElement(BottomSheet, null, /*#__PURE__*/React.createElement(PFE.PasswordField, {
      label: "User password",
      required: true,
      value: "open-sesame"
    }), /*#__PURE__*/React.createElement(PFE.PasswordField, {
      label: "Owner password",
      value: "master-key"
    }), /*#__PURE__*/React.createElement(Switch, {
      label: "Allow copying (extract)"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      block: true,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "lock",
        size: 15
      })
    }, "Encrypt")))
  });
  FR.push({
    id: 'Em2',
    w: 390,
    h: 800,
    title: 'Mobile · wrong password',
    note: 'field error + preserved value in the bottom sheet',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(EmTop, {
      op: "decrypt"
    }), /*#__PURE__*/React.createElement(MiniSheet, {
      name: DATA.input.name,
      locked: true
    }), /*#__PURE__*/React.createElement(BottomSheet, null, /*#__PURE__*/React.createElement(PFE.PasswordField, {
      label: "Open password",
      required: true,
      value: "letmein",
      error: "That password didn't unlock this PDF.",
      code: "wrong_password"
    }), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      block: true,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "unlock",
        size: 15
      })
    }, "Unlock")))
  });

  // INV
  function InvRow({
    sample,
    name,
    note
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '9px 0',
        borderBottom: '1px solid var(--sub-700)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 150,
        flex: 'none',
        display: 'flex',
        justifyContent: 'center'
      }
    }, sample), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        lineHeight: '16px'
      }
    }, note)));
  }
  FR.push({
    id: 'INV',
    w: 900,
    h: 520,
    title: 'Component inventory',
    note: 'the parts flow E composes',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '16px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(InvRow, {
      name: "Masked password field + eye",
      note: "mono dots \xB7 show/hide toggle \xB7 error border + shake + wrong_password code",
      sample: /*#__PURE__*/React.createElement("div", {
        style: {
          width: 130
        }
      }, /*#__PURE__*/React.createElement(PFE.PasswordField, {
        value: "secret"
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Permission toggle group",
      note: "printing None/Low/High + modify/copy/annotate switches (press-blue on)",
      sample: /*#__PURE__*/React.createElement(DS.Switch, {
        defaultChecked: true
      })
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Advisory disclaimer",
      note: "persistent warn-gold block \xB7 echoed on the permissions success row",
      sample: /*#__PURE__*/React.createElement(DS.StatusPill, {
        status: "warn"
      }, "advisory")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Locked-sheet placeholder",
      note: "protected input \u2014 lock glyph, faces unrendered + caption",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          width: 44,
          height: 62,
          background: 'linear-gradient(160deg,#f0f0ec,#e2e2db)',
          borderRadius: 2,
          borderBottom: '2px solid var(--paper-edge)',
          display: 'grid',
          placeItems: 'center',
          color: '#8a9098'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "lock",
        size: 16,
        sw: 1.6
      }))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Amber press readout",
      note: "Running \u2014 pikepdf \u2192 finalize \xB7 spinner (progress:null) not a bar",
      sample: /*#__PURE__*/React.createElement(DS.StatusPill, {
        status: "proc"
      }, "pikepdf")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Success artifact row",
      note: "op-specific copy \xB7 Download focused (encrypt/decrypt/permissions)",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ok-500)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "check",
        size: 20,
        sw: 2.4
      }))
    }))
  });

  // NOTES
  function NoteSec({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 15
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...EYE,
        display: 'block',
        marginBottom: 7
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        color: 'var(--ink-700)',
        lineHeight: '19px'
      }
    }, children));
  }
  const M = ({
    children
  }) => /*#__PURE__*/React.createElement("span", {
    style: MONO
  }, children);
  FR.push({
    id: 'NOTES',
    w: 760,
    h: 520,
    title: 'Interaction notes',
    note: 'whole-document crypto · careful password UX',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '16px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(NoteSec, {
      title: "Password UX"
    }, "Fields are mono, masked as dots, with a show/hide eye toggle. Encrypt needs a ", /*#__PURE__*/React.createElement("b", null, "user password"), " (blank is blocked client-side \u2014 never reaches the server). A revealed value is never printed anywhere but the field."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Wrong password"
    }, "On ", /*#__PURE__*/React.createElement(M, null, "wrong_password"), " (immediate 422, or a sanitized failed job) the field gets the err border + a one-shot shake (color-only under reduced-motion), ", /*#__PURE__*/React.createElement("b", null, "focus returns to the field, and the dots are preserved"), " so a typo is a one-char fix. Retries are unlimited; nothing is kept server-side on failure."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Advisory permissions"
    }, "The warn-gold disclaimer is persistent in the Permissions form and ", /*#__PURE__*/React.createElement("b", null, "echoed on the success row"), ". Owner-only perms with no user password escalate to an inline \"this file will open for anyone\" warning \u2014 advisory, submit still allowed."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Lifecycle"
    }, "Submit \u2192 ", /*#__PURE__*/React.createElement(M, null, "POST /api/jobs/{encrypt|decrypt|permissions}"), " \u2192 202 + ", /*#__PURE__*/React.createElement(M, null, "Location"), " \u2192 the worksurface dims and the amber press runs (phase ", /*#__PURE__*/React.createElement("b", null, "Running \u2014 pikepdf"), " \u2192 ", /*#__PURE__*/React.createElement("b", null, "finalize"), ", ", /*#__PURE__*/React.createElement(M, null, "progress:null"), " \u21D2 spinner). On ", /*#__PURE__*/React.createElement(M, null, "succeeded"), " \u2192 green check + toast + artifact row (Download focused). Encrypt applies AES-256 in the finalize save."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "No undo"
    }, "A committed crypto job has no client undo \u2014 Decrypt conceptually reverses Encrypt (with the password), but there is no undo button. Multi-select / drag are N/A (whole-document op)."))
  });
  window.PFE.Canvas = function Canvas() {
    return /*#__PURE__*/React.createElement(PFW.CanvasLayout, {
      frames: window.PFE_FRAMES
    });
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-e/frames.jsx", error: String((e && e.message) || e) }); }

// flows/flow-e/parts.jsx
try { (() => {
// pdf-forge flow E — password field, toggles, disclaimer, locked sheet, inspector, press, success, errors. → window.PFE
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon,
    MONO = PFW.MONO,
    EYE = PFW.EYE;
  const {
    Input,
    Button,
    Switch,
    SegmentedControl,
    InlineBanner,
    Tag
  } = DS;
  const JobCard = PFW.JobCard;
  const OP = {
    encrypt: 'Encrypt',
    decrypt: 'Decrypt',
    permissions: 'Permissions'
  };
  const OPICON = {
    encrypt: 'lock',
    decrypt: 'unlock',
    permissions: 'shield'
  };
  const EyeBtn = ({
    revealed
  }) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": revealed ? 'Hide password' : 'Show password',
    style: {
      display: 'inline-grid',
      placeItems: 'center',
      width: 22,
      height: 22,
      border: 'none',
      background: 'transparent',
      color: revealed ? 'var(--press-400)' : 'var(--ink-600)',
      cursor: 'pointer',
      padding: 0,
      margin: '0 -2px'
    }
  }, /*#__PURE__*/React.createElement(Icon, {
    name: revealed ? 'eyeOff' : 'eye',
    size: 16
  }));
  function PasswordField({
    label,
    revealed,
    error,
    code,
    required,
    value = 'open-sesame',
    hint
  }) {
    return /*#__PURE__*/React.createElement(Input, {
      label: label,
      mono: true,
      required: required,
      error: error,
      code: code,
      hint: hint,
      type: revealed ? 'text' : 'password',
      defaultValue: value,
      suffix: /*#__PURE__*/React.createElement(EyeBtn, {
        revealed: revealed
      })
    });
  }
  function PermToggles() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink-900)'
      }
    }, "Printing"), /*#__PURE__*/React.createElement(SegmentedControl, {
      ariaLabel: "Printing",
      value: "low",
      options: [{
        value: 'none',
        label: 'None'
      }, {
        value: 'low',
        label: 'Low'
      }, {
        value: 'high',
        label: 'High'
      }]
    })), /*#__PURE__*/React.createElement(Switch, {
      label: "Allow modifying"
    }), /*#__PURE__*/React.createElement(Switch, {
      label: "Allow copying (extract)"
    }), /*#__PURE__*/React.createElement(Switch, {
      label: "Allow annotating",
      defaultChecked: true
    }));
  }
  function AdvisoryDisclaimer({
    echo
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '11px 12px 11px 13px',
        borderRadius: 'var(--r-ctl)',
        background: 'rgba(214,165,60,.1)',
        border: '1px solid rgba(214,165,60,.35)',
        borderLeft: '3px solid var(--warn-500)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--warn-500)',
        display: 'inline-flex',
        marginTop: 1,
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 15
    })), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-700)',
        lineHeight: '17px'
      }
    }, echo ? 'Permissions are advisory — many tools ignore them. For real confidentiality, use Encrypt.' : window.PFE_DATA.disclaimer));
  }
  function SubmitWarn({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 'var(--r-ctl)',
        background: 'rgba(214,165,60,.12)',
        border: '1px solid rgba(214,165,60,.4)',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--warn-500)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 14
    }), children);
  }

  // bright input preview sheet
  function PreviewSheet({
    name
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        width: 372,
        height: 526,
        background: 'var(--paper-0)',
        borderRadius: 2,
        borderBottom: '2px solid var(--paper-edge)',
        boxShadow: '0 2px 12px rgba(5,7,10,.55)',
        position: 'relative',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: '40px 44px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 15,
        width: '56%',
        background: '#c9c9c3',
        borderRadius: 2
      }
    }), [94, 99, 90, 96, 78, 92, 86, 97, 72, 90, 82, 95].map((w, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        height: 5,
        width: w + '%',
        background: '#dcdcd6',
        borderRadius: 1
      }
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: -3,
        bottom: -6,
        background: 'rgba(14,17,22,.82)',
        color: 'var(--ink-900)',
        ...MONO,
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999
      }
    }, name));
  }
  // locked-sheet placeholder (encrypted input)
  function LockedSheet({
    name
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 372,
        height: 526,
        background: 'linear-gradient(160deg,#f0f0ec,#e2e2db)',
        borderRadius: 2,
        borderBottom: '2px solid var(--paper-edge)',
        boxShadow: '0 2px 12px rgba(5,7,10,.55)',
        position: 'relative',
        display: 'grid',
        placeItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 60,
        height: 60,
        borderRadius: 999,
        background: 'rgba(14,17,22,.06)',
        display: 'grid',
        placeItems: 'center',
        color: '#8a9098'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 30,
      sw: 1.6
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: -3,
        bottom: -6,
        background: 'rgba(14,17,22,.82)',
        color: 'var(--ink-900)',
        ...MONO,
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: 999
      }
    }, name)), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        maxWidth: 340,
        textAlign: 'center'
      }
    }, "This PDF is protected \u2014 enter its password to preview/operate."));
  }
  function CenterWell({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: 16,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        position: 'relative'
      }
    }, children);
  }

  // inspector
  function EInspector({
    op,
    children,
    submitProcessing,
    artifact
  }) {
    const primary = {
      encrypt: 'Encrypt',
      decrypt: 'Unlock',
      permissions: 'Apply permissions'
    }[op];
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 336,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderLeft: '1px solid var(--sub-600)',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Operation"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--press-400)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: OPICON[op],
      size: 17
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, OP[op]))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        minHeight: 0,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, artifact ? artifact : children), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        borderTop: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      size: "lg",
      block: true,
      processing: submitProcessing,
      disabled: !!artifact,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: OPICON[op],
        size: 15
      })
    }, submitProcessing ? 'Submitting…' : primary)));
  }
  function PressOverlay({
    phase = 'Running — pikepdf'
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        zIndex: 30,
        display: 'grid',
        placeItems: 'center',
        background: 'rgba(8,10,14,.6)',
        padding: 24
      }
    }, /*#__PURE__*/React.createElement(JobCard, {
      state: "running",
      phase: phase,
      detail: `${window.PFE_DATA.input.name} · ${window.PFE_DATA.input.bytes} B`,
      jobId: window.PFE_DATA.jobShort
    }));
  }
  function SuccessRow({
    op
  }) {
    const r = window.PFE_DATA.results[op];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, op === 'permissions' ? /*#__PURE__*/React.createElement(AdvisoryDisclaimer, {
      echo: true
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--ok-tint)',
        borderLeft: '3px solid var(--ok-500)',
        border: '1px solid rgba(75,174,126,.35)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--ok-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 18,
      sw: 2.4
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...MONO,
        fontSize: 13,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, r.filename), /*#__PURE__*/React.createElement("div", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, r.human, " \xB7 ", r.bytes, " B")), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      className: "pfe-focus",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 15
      })
    }, "Download")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-700)',
        paddingLeft: 28
      }
    }, r.copy)));
  }
  const ERR = {
    file_too_large: {
      t: 'This file is over the 200 MB limit',
      c: 'file_too_large'
    },
    not_a_pdf: {
      t: "That file isn't a PDF",
      c: 'not_a_pdf'
    },
    bad_pdf_structure: {
      t: "This PDF couldn't be opened",
      c: 'bad_pdf_structure'
    },
    queue_full: {
      t: 'All workers are busy',
      c: 'queue_full',
      m: 'Retry shortly · Retrying in 30s…'
    },
    disk_full: {
      t: 'Not enough working storage to accept this job',
      c: 'disk_full'
    }
  };
  function ErrorBannerE({
    kind
  }) {
    const e = ERR[kind];
    return /*#__PURE__*/React.createElement(InlineBanner, {
      status: "err",
      title: e.t,
      code: e.c,
      actions: kind === 'queue_full' ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, "Retry now") : /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, "Try again")
    }, e.m);
  }
  window.PFE = {
    PasswordField,
    EyeBtn,
    PermToggles,
    AdvisoryDisclaimer,
    SubmitWarn,
    PreviewSheet,
    LockedSheet,
    CenterWell,
    EInspector,
    PressOverlay,
    SuccessRow,
    ErrorBannerE,
    OP,
    OPICON
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-e/parts.jsx", error: String((e && e.message) || e) }); }

// flows/flow-f/data.js
try { (() => {
// pdf-forge flow F — sample data (plain global). → window.PFF_DATA
(function () {
  const ISO = 210 / 297,
    LAND = 297 / 210;
  const pages = [];
  for (let i = 1; i <= 42; i++) pages.push({
    id: 'fp' + i,
    page: i,
    aspect: i === 5 ? LAND : ISO,
    rotation: 0
  });

  // extracted text (client pdf.js / server pdftotext) — original sample contract prose
  const text = ['MASTER SERVICES AGREEMENT', '', 'This Master Services Agreement ("Agreement") is entered into as of', 'January 3, 2026 (the "Effective Date") by and between Northwind Systems,', 'Inc. ("Provider") and the counterparty identified on the signature page', '("Client").', '', '1. FEES AND INVOICING', '1.1  Provider shall deliver each invoice monthly, in arrears, for the', '     services performed during the preceding calendar month.', '1.2  Client shall pay each invoice within thirty (30) days of receipt.', '1.3  Any invoice not disputed in writing within ten (10) business days', '     is deemed accepted.', '1.4  Late payment on an undisputed invoice accrues interest at 1.5%', '     per month, or the maximum rate permitted by law, whichever is less.', '', '2. TERM AND TERMINATION', '2.1  This Agreement begins on the Effective Date and continues for an', '     initial term of twelve (12) months.', '2.2  Either party may terminate for material breach on thirty (30) days', '     written notice if the breach remains uncured.', '', '3. CONFIDENTIALITY', '3.1  Each party shall protect the other party\u2019s Confidential Information', '     using no less than reasonable care.'];
  window.PFF_DATA = {
    doc: {
      name: 'contract-2026.pdf',
      pages: 42,
      bytes: 2384761,
      human: '2.4 MB',
      bytesExact: '2,384,761'
    },
    pages,
    text,
    find: {
      query: 'invoice',
      matches: 12
    },
    scopeDefault: '1-end',
    scopeExample: '1-10,21-end',
    scopeFromSelection: '1-3,7',
    jobId: '7b3e1d9c5a8f42610c4d2e9a1f7b6c30',
    jobShort: '7b3e…6c30',
    result: {
      filename: 'contract-2026.txt',
      bytes: 41827,
      bytesExact: '41,827',
      media: 'text/plain'
    },
    build(overrides) {
      overrides = overrides || {};
      return pages.map(p => Object.assign({
        selected: false,
        focused: false,
        rotation: p.rotation
      }, p, overrides[p.id] || {}));
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-f/data.js", error: String((e && e.message) || e) }); }

// flows/flow-f/framesA.jsx
try { (() => {
// pdf-forge flow F — desktop frames F1–F5 + FHeader. → window.PFF_FRAMES
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFF = window.PFF,
    DATA = window.PFF_DATA;
  const {
    Icon,
    Rail,
    JobCard,
    MONO
  } = PFW;
  const {
    Button,
    Checkbox,
    Tag,
    StatusPill,
    SegmentedControl,
    Tooltip,
    IconButton,
    Spinner
  } = DS;
  const DW = 1320,
    DH = 820;
  const rail = /*#__PURE__*/React.createElement(Rail, {
    active: "extract"
  });
  const FR = window.PFF_FRAMES = window.PFF_FRAMES || [];

  // flow-F board header (no edit log; primary = Extract on server tab)
  function FHeader({
    selectedCount = 0,
    tab = 'quick',
    processing = false,
    size = 'compact'
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        padding: '10px 16px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(Checkbox, {
      checked: selectedCount > 0,
      indeterminate: selectedCount > 0,
      "aria-label": "Select all",
      readOnly: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 13,
        color: 'var(--ink-900)',
        whiteSpace: 'nowrap'
      }
    }, DATA.doc.name), /*#__PURE__*/React.createElement(Tag, null, DATA.doc.pages, " pages"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, DATA.doc.human)), selectedCount > 0 ? /*#__PURE__*/React.createElement(StatusPill, {
      status: "selected",
      count: selectedCount
    }, "selected") : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginLeft: 'auto'
      }
    }, /*#__PURE__*/React.createElement(SegmentedControl, {
      ariaLabel: "Sheet size",
      value: size,
      options: [{
        value: 'compact',
        label: 'Compact'
      }, {
        value: 'comfortable',
        label: 'Comfortable'
      }, {
        value: 'large',
        label: 'Large'
      }]
    }), tab === 'server' ? /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      processing: processing,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "text",
        size: 15
      }),
      rightIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "chevron",
        size: 14
      })
    }, processing ? 'Extracting…' : 'Extract') : /*#__PURE__*/React.createElement(Button, {
      variant: "secondary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "copy",
        size: 15
      })
    }, "Copy all")));
  }
  PFF.FHeader = FHeader;
  const matched = ['fp1', 'fp3', 'fp7', 'fp8', 'fp12'];

  // F1 — empty (quick-text tab)
  FR.push({
    id: 'F1',
    w: DW,
    h: DH,
    title: 'Empty · Quick text tab',
    note: 'doc on the board · text pane placeholder · zero upload',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "quick"
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build({
          fp1: {
            focused: true
          }
        })
      }),
      textPane: /*#__PURE__*/React.createElement(PFF.TextPane, {
        empty: true
      }),
      inspector: /*#__PURE__*/React.createElement(PFF.ExtractInspector, {
        tab: "quick"
      })
    })
  });

  // F2 — client loading (pdf.js streaming)
  FR.push({
    id: 'F2',
    w: DW,
    h: DH,
    title: 'Client loading · pdf.js streaming',
    note: 'text streams page-by-page · no amber (client-side, not a job)',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "quick"
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build()
      }),
      textPane: /*#__PURE__*/React.createElement(PFF.TextPane, {
        lines: DATA.text.slice(0, 10),
        streamingPage: 3,
        showFind: false,
        footer: false
      }),
      inspector: /*#__PURE__*/React.createElement(PFF.ExtractInspector, {
        tab: "quick"
      })
    })
  });

  // F3 — client success + live find/highlight (hero)
  FR.push({
    id: 'F3',
    w: DW,
    h: DH,
    title: 'Client success · find & highlight',
    note: 'matches highlight on BOTH the text pane and the sheet faces · no artifact',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "quick"
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build(),
        matchedIds: matched
      }),
      textPane: /*#__PURE__*/React.createElement(PFF.TextPane, {
        lines: DATA.text,
        query: DATA.find.query,
        matches: DATA.find.matches
      }),
      inspector: /*#__PURE__*/React.createElement(PFF.ExtractInspector, {
        tab: "quick"
      })
    })
  });

  // F4 — client advisory: image-only scan (NOT an error)
  FR.push({
    id: 'F4',
    w: DW,
    h: DH,
    title: 'Client advisory · looks like a scan',
    note: 'warn (not error): no selectable text → offer OCR',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "quick"
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build(),
        scanned: true
      }),
      textPane: /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          minHeight: 0,
          margin: '16px 16px 16px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--sub-850)',
          border: '1px solid var(--sub-600)',
          borderRadius: 'var(--r-panel)',
          padding: 24
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          maxWidth: 340
        }
      }, /*#__PURE__*/React.createElement(PFF.ScanAdvisory, {
        variant: "client"
      }))),
      inspector: /*#__PURE__*/React.createElement(PFF.ExtractInspector, {
        tab: "quick",
        error: "scan"
      })
    })
  });

  // F5 — server submit / upload spinner (before 202)
  FR.push({
    id: 'F5',
    w: DW,
    h: DH,
    title: 'Server submit · uploading',
    note: 'Batch tab · options filled · brief upload spinner before the 202',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "server",
        processing: true
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build()
      }),
      textPane: /*#__PURE__*/React.createElement(PFF.TextPane, {
        lines: DATA.text,
        query: "",
        matches: 0,
        showFind: true,
        footer: true
      }),
      inspector: /*#__PURE__*/React.createElement("aside", {
        style: {
          width: 330,
          flex: 'none',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--sub-800)',
          borderLeft: '1px solid var(--sub-600)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          padding: '14px 16px 0'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: PFW.EYE
      }, "Inspector"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          margin: '3px 0 12px'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--press-400)',
          display: 'inline-flex'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "text",
        size: 17
      })), /*#__PURE__*/React.createElement("h3", {
        style: {
          margin: 0,
          fontFamily: 'var(--font-ui)',
          fontSize: 16,
          fontWeight: 600
        }
      }, "Extract text")), /*#__PURE__*/React.createElement(DS.Tabs, {
        value: "server",
        tabs: [{
          id: 'quick',
          label: 'Quick text'
        }, {
          id: 'server',
          label: 'Batch extract'
        }]
      })), /*#__PURE__*/React.createElement("div", {
        style: {
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14
        }
      }, /*#__PURE__*/React.createElement(PFF.PrivacyLabel, {
        text: "Sent to your local server \xB7 127.0.0.1",
        tone: "muted"
      }), /*#__PURE__*/React.createElement(DS.Input, {
        mono: true,
        value: DATA.scopeExample,
        readOnly: true,
        label: "Pages"
      }), /*#__PURE__*/React.createElement(DS.Switch, {
        label: "Preserve layout"
      }), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '11px 12px',
          borderRadius: 'var(--r-ctl)',
          background: 'var(--sub-850)',
          border: '1px solid var(--sub-600)'
        }
      }, /*#__PURE__*/React.createElement(Spinner, {
        size: 16,
        tone: "ink"
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          ...MONO,
          fontSize: 12,
          color: 'var(--ink-700)'
        }
      }, "Uploading ", DATA.doc.name, "\u2026"))))
    })
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-f/framesA.jsx", error: String((e && e.message) || e) }); }

// flows/flow-f/framesB.jsx
try { (() => {
// pdf-forge flow F — desktop frames F6–F9. → window.PFF_FRAMES
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFF = window.PFF,
    DATA = window.PFF_DATA;
  const {
    Icon,
    Rail,
    JobCard,
    MONO,
    EYE
  } = PFW;
  const {
    Button,
    Toast
  } = DS;
  const FHeader = PFF.FHeader;
  const DW = 1320,
    DH = 820;
  const rail = /*#__PURE__*/React.createElement(Rail, {
    active: "extract"
  });
  const FR = window.PFF_FRAMES = window.PFF_FRAMES || [];
  const matched = ['fp1', 'fp3', 'fp7', 'fp8', 'fp12'];

  // F6 — server in-progress (lightweight press, no finalize)
  FR.push({
    id: 'F6',
    w: DW,
    h: DH,
    title: 'Server running · the lightweight press',
    note: 'Running — pdftotext · spinner (progress:null) · NO finalize phase',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "server",
        processing: true
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build()
      }),
      textPane: /*#__PURE__*/React.createElement(PFF.TextPane, {
        lines: DATA.text,
        showFind: true,
        footer: false
      }),
      inspector: /*#__PURE__*/React.createElement(PFF.ExtractInspector, {
        tab: "server",
        scope: DATA.scopeExample,
        processing: true
      }),
      overlay: /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          inset: 0,
          zIndex: 30,
          display: 'grid',
          placeItems: 'center',
          background: 'rgba(8,10,14,.6)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement(JobCard, {
        state: "running",
        phase: "Running \u2014 pdftotext",
        detail: `${DATA.doc.name} · ${DATA.doc.pages} pages`,
        jobId: DATA.jobShort
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          ...MONO,
          fontSize: 11,
          color: 'var(--ink-500)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          width: 5,
          height: 5,
          borderRadius: 999,
          background: 'var(--ink-500)'
        }
      }), "no finalize \xB7 read-only op")))
    })
  });

  // F7 — server success (artifact row; text only)
  FR.push({
    id: 'F7',
    w: DW,
    h: DH,
    title: 'Server success · text/plain',
    note: 'artifact row: text/plain chip · "Text only — no PDF was created."',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "server"
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build()
      }),
      textPane: /*#__PURE__*/React.createElement(PFF.TextPane, {
        lines: DATA.text,
        query: DATA.find.query,
        matches: DATA.find.matches,
        footer: false
      }),
      inspector: /*#__PURE__*/React.createElement(PFF.ExtractInspector, {
        tab: "server",
        scope: DATA.scopeExample,
        result: DATA.result
      }),
      overlay: /*#__PURE__*/React.createElement("div", {
        style: {
          position: 'absolute',
          right: 16,
          bottom: 16,
          zIndex: 30
        }
      }, /*#__PURE__*/React.createElement(Toast, {
        status: "ok",
        title: "Text extracted"
      }, DATA.result.filename, " \xB7 ", DATA.result.bytesExact, " B"))
    })
  });

  // F8 — server multi-select scoping (two-way bound)
  FR.push({
    id: 'F8',
    w: DW,
    h: DH,
    title: 'Multi-select → page scope',
    note: 'selecting sheets writes the mono range · 4 selected → 1-3,7',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "server",
        selectedCount: 4
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build({
          fp1: {
            selected: true
          },
          fp2: {
            selected: true
          },
          fp3: {
            selected: true
          },
          fp7: {
            selected: true
          }
        }),
        marquee: {
          left: 14,
          top: 18,
          width: 232,
          height: 150
        }
      }),
      textPane: /*#__PURE__*/React.createElement(PFF.TextPane, {
        lines: DATA.text,
        showFind: true,
        footer: true
      }),
      inspector: /*#__PURE__*/React.createElement(PFF.ExtractInspector, {
        tab: "server",
        scope: DATA.scopeFromSelection,
        selectedCount: 4
      })
    })
  });

  // F9 — out-of-range in context (pages field red + banner)
  FR.push({
    id: 'F9',
    w: DW,
    h: DH,
    title: 'Error · page scope out of range',
    note: '422 out_of_range · field gets err border · human message + mono code',
    el: /*#__PURE__*/React.createElement(PFF.FWorkFrame, {
      rail: rail,
      header: /*#__PURE__*/React.createElement(FHeader, {
        tab: "server"
      }),
      board: /*#__PURE__*/React.createElement(PFF.FBoard, {
        pages: DATA.build()
      }),
      textPane: /*#__PURE__*/React.createElement(PFF.TextPane, {
        lines: DATA.text,
        showFind: true,
        footer: true
      }),
      inspector: /*#__PURE__*/React.createElement(PFF.ExtractInspector, {
        tab: "server",
        scope: "1-88",
        scopeError: "Page 88 is past the end \u2014 this document has 42 pages."
      })
    })
  });

  // F9b — error catalog
  FR.push({
    id: 'F9b',
    w: 660,
    h: 470,
    title: 'Error catalog · server path',
    note: 'human sentence + small mono code — never an HTTP number or stderr',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(PFF.ErrorBannerF, {
      kind: "not_a_pdf"
    }), /*#__PURE__*/React.createElement(PFF.ErrorBannerF, {
      kind: "bad_pdf_structure"
    }), /*#__PURE__*/React.createElement(PFF.ErrorBannerF, {
      kind: "out_of_range"
    }), /*#__PURE__*/React.createElement(PFF.ErrorBannerF, {
      kind: "queue_full"
    }), /*#__PURE__*/React.createElement(PFF.ErrorBannerF, {
      kind: "file_too_large"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 2,
        padding: '9px 11px',
        borderRadius: 'var(--r-ctl)',
        background: 'rgba(214,165,60,.1)',
        border: '1px solid rgba(214,165,60,.35)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--warn-500)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-700)'
      }
    }, "Empty result is ", /*#__PURE__*/React.createElement("b", null, "not"), " an error \u2014 it's the amber-gold scan advisory (offer OCR).")))
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-f/framesB.jsx", error: String((e && e.message) || e) }); }

// flows/flow-f/framesC.jsx
try { (() => {
// pdf-forge flow F — mobile + reduced-motion + docs + Canvas. → window.PFF.Canvas
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW,
    PFF = window.PFF,
    DATA = window.PFF_DATA;
  const {
    Icon,
    JobCard,
    MONO,
    EYE
  } = PFW;
  const {
    Button,
    IconButton,
    Tag,
    StatusPill,
    Tabs,
    Spinner,
    InlineBanner
  } = DS;
  const FR = window.PFF_FRAMES = window.PFF_FRAMES || [];
  const matched = ['fp1', 'fp3', 'fp7', 'fp8'];

  // ---- mobile pieces ----
  function FMTop({
    tab = 'quick',
    processing
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 48,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement(IconButton, {
      label: "Menu"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "menu"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 15
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, DATA.doc.name), /*#__PURE__*/React.createElement("div", {
      style: {
        marginLeft: 'auto'
      }
    }, tab === 'server' ? /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      processing: processing,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "text",
        size: 14
      })
    }, processing ? 'Extracting…' : 'Extract') : /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "secondary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "copy",
        size: 14
      })
    }, "Copy all")));
  }
  function FMBoard({
    overrides,
    matchedIds = [],
    scanned,
    dim,
    h = 244
  }) {
    const M = new Set(matchedIds);
    const pages = DATA.pages.slice(0, 4).map(p => Object.assign({
      selected: false,
      rotation: p.rotation
    }, p, (overrides || {})[p.id] || {}));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 'none',
        height: h,
        overflow: 'hidden',
        margin: 12,
        padding: 12,
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12
      }
    }, pages.map(p => /*#__PURE__*/React.createElement(PFF.MatchSheet, {
      key: p.id,
      page: p.page,
      width: 166,
      aspect: p.aspect,
      rotation: p.rotation,
      matched: M.has(p.id),
      selected: p.selected,
      scanned: scanned
    }))), dim ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,10,14,.6)',
        borderRadius: 'var(--r-panel)'
      }
    }) : null);
  }
  function FMSheet({
    children,
    h
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: h ? 'none' : 1,
        height: h,
        minHeight: 0,
        background: 'var(--sub-800)',
        borderTop: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel) var(--r-panel) 0 0',
        boxShadow: '0 -12px 32px rgba(5,7,10,.4)',
        padding: '10px 14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 36,
        height: 4,
        borderRadius: 2,
        background: 'var(--sub-500)',
        alignSelf: 'center',
        flex: 'none'
      }
    }), children);
  }
  const phone = {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--sub-850)'
  };

  // F1m — mobile empty
  FR.push({
    id: 'F1m',
    w: 390,
    h: 800,
    title: 'Mobile · empty',
    note: 'inspector = bottom sheet · board 2-up',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(FMTop, {
      tab: "quick"
    }), /*#__PURE__*/React.createElement(FMBoard, {
      h: 300
    }), /*#__PURE__*/React.createElement(FMSheet, {
      h: 230
    }, /*#__PURE__*/React.createElement(Tabs, {
      value: "quick",
      tabs: [{
        id: 'quick',
        label: 'Quick text'
      }, {
        id: 'server',
        label: 'Batch extract'
      }]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, /*#__PURE__*/React.createElement(PFF.PrivacyLabel, {
      text: "Stays on this device \u2014 nothing uploaded"
    })), /*#__PURE__*/React.createElement("p", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        color: 'var(--ink-600)',
        lineHeight: '18px'
      }
    }, "Text is read straight from the pages with pdf.js \u2014 find and copy right here.")))
  });

  // F3m — mobile client success (text pane STACKED under board)
  FR.push({
    id: 'F3m',
    w: 390,
    h: 800,
    title: 'Mobile · client success',
    note: 'text pane stacks UNDER the board · single column',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(FMTop, {
      tab: "quick"
    }), /*#__PURE__*/React.createElement(FMBoard, {
      h: 210,
      matchedIds: matched
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: '0 12px 12px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-850)',
        border: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement(PFF.FindBox, {
      query: DATA.find.query,
      matches: DATA.find.matches
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        padding: '8px 0'
      }
    }, DATA.text.slice(0, 12).map((ln, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 10,
        padding: '0 12px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        lineHeight: '18px',
        color: 'var(--ink-500)',
        width: 18,
        textAlign: 'right',
        flex: 'none'
      }
    }, ln === '' ? '' : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        lineHeight: '18px',
        color: 'var(--ink-700)',
        whiteSpace: 'pre-wrap'
      }
    }, ln.replace('invoice', ''), ln.includes('invoice') ? /*#__PURE__*/React.createElement("mark", {
      style: {
        background: 'var(--press-tint)',
        color: 'var(--ink-900)',
        borderBottom: '2px solid var(--press-500)'
      }
    }, "invoice") : null))))))
  });

  // F6m — mobile server in-progress
  FR.push({
    id: 'F6m',
    w: 390,
    h: 800,
    title: 'Mobile · server running',
    note: 'dimmed board · amber job bottom sheet · no finalize',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(FMTop, {
      tab: "server",
      processing: true
    }), /*#__PURE__*/React.createElement(FMBoard, {
      h: 300,
      dim: true
    }), /*#__PURE__*/React.createElement(FMSheet, null, /*#__PURE__*/React.createElement(JobCard, {
      state: "running",
      phase: "Running \u2014 pdftotext",
      detail: `${DATA.doc.name} · 42 pages`,
      jobId: DATA.jobShort,
      width: 360
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)',
        alignSelf: 'center'
      }
    }, "no finalize \xB7 read-only op")))
  });

  // F7m — mobile server success
  FR.push({
    id: 'F7m',
    w: 390,
    h: 800,
    title: 'Mobile · server success',
    note: 'artifact in a bottom sheet · text only',
    el: /*#__PURE__*/React.createElement("div", {
      style: phone
    }, /*#__PURE__*/React.createElement(FMTop, {
      tab: "server"
    }), /*#__PURE__*/React.createElement(FMBoard, {
      h: 330
    }), /*#__PURE__*/React.createElement(FMSheet, null, /*#__PURE__*/React.createElement(PFF.ArtifactRowText, {
      filename: DATA.result.filename,
      human: DATA.result.human,
      bytesExact: DATA.result.bytesExact
    })))
  });

  // RM — reduced motion
  function RMCol({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'grid',
        placeItems: 'center',
        background: 'var(--sub-700)',
        borderRadius: 'var(--r-panel)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5)',
        padding: 16,
        minHeight: 140
      }
    }, children));
  }
  FR.push({
    id: 'RM',
    w: 900,
    h: 430,
    title: 'prefers-reduced-motion: reduce',
    note: 'server press → static amber + working… · no spin · focus rings stay',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: 20,
        display: 'flex',
        gap: 16
      }
    }, /*#__PURE__*/React.createElement(RMCol, {
      title: "Server press \u2014 static"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '11px 14px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-800)',
        border: '1px solid var(--sub-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 9,
        height: 9,
        borderRadius: 999,
        background: 'var(--proc-500)'
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--proc-500)'
      }
    }, "working\u2026"))), /*#__PURE__*/React.createElement(RMCol, {
      title: "Highlight \u2014 no motion"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...MONO,
        fontSize: 13,
        color: 'var(--ink-700)'
      }
    }, "pay each ", /*#__PURE__*/React.createElement("mark", {
      style: {
        background: 'var(--press-tint)',
        color: 'var(--ink-900)',
        borderBottom: '2px solid var(--press-500)'
      }
    }, "invoice"), " within")), /*#__PURE__*/React.createElement(RMCol, {
      title: "Focus \u2014 always renders"
    }, /*#__PURE__*/React.createElement("button", {
      style: {
        height: 32,
        padding: '0 16px',
        borderRadius: 'var(--r-ctl)',
        border: '1px solid var(--sub-500)',
        background: 'var(--sub-700)',
        color: 'var(--ink-900)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        outline: '2px solid var(--press-500)',
        outlineOffset: 2,
        boxShadow: '0 0 0 6px rgba(31,162,196,.35)'
      }
    }, "Extract")))
  });

  // INV — component inventory
  function InvRow({
    sample,
    name,
    note
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '9px 0',
        borderBottom: '1px solid var(--sub-700)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 140,
        flex: 'none',
        display: 'flex',
        justifyContent: 'center'
      }
    }, sample), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, name), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)',
        lineHeight: '16px'
      }
    }, note)));
  }
  FR.push({
    id: 'INV',
    w: 900,
    h: 560,
    title: 'Component inventory',
    note: 'the parts flow F composes',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '18px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(InvRow, {
      name: "Two-tab inspector",
      note: "Quick text (this device) \xB7 Batch extract (server) \u2014 press-blue active underline",
      sample: /*#__PURE__*/React.createElement(StatusPill, {
        status: "selected"
      }, "tabs")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Privacy micro-label",
      note: "'Stays on this device \u2014 nothing uploaded' \xB7 lock glyph, ink-600 mono",
      sample: /*#__PURE__*/React.createElement(PFF.PrivacyLabel, {
        text: "on device"
      })
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Mono text pane + find box",
      note: "fs-data mono, line gutter \xB7 press-tint highlight + press underline on matches",
      sample: /*#__PURE__*/React.createElement("span", {
        style: {
          ...MONO,
          fontSize: 12,
          color: 'var(--ink-700)'
        }
      }, "an ", /*#__PURE__*/React.createElement("mark", {
        style: {
          background: 'var(--press-tint)',
          borderBottom: '2px solid var(--press-500)',
          color: 'var(--ink-900)'
        }
      }, "invoice"))
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Page-scope input",
      note: "mono range, two-way bound to board selection (1-3,7)",
      sample: /*#__PURE__*/React.createElement(Tag, {
        dot: "accent",
        variant: "accent"
      }, "1-3,7")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Amber press readout",
      note: "lightweight \xB7 'Running \u2014 pdftotext' \xB7 NO finalize phase \xB7 Cancel\u2192DELETE",
      sample: /*#__PURE__*/React.createElement(StatusPill, {
        status: "proc"
      }, "pdftotext")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Success artifact row",
      note: "text/plain chip \xB7 tabular bytes \xB7 'Text only \u2014 no PDF was created.'",
      sample: /*#__PURE__*/React.createElement(Tag, null, "text/plain")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Scan advisory (warn)",
      note: "not an error \u2014 no selectable text \u2192 offer OCR",
      sample: /*#__PURE__*/React.createElement(StatusPill, {
        status: "warn"
      }, "scan")
    }), /*#__PURE__*/React.createElement(InvRow, {
      name: "Error banner + code",
      note: "human sentence + small mono code (not_a_pdf, out_of_range)",
      sample: /*#__PURE__*/React.createElement(StatusPill, {
        status: "err"
      }, "code")
    }))
  });

  // NOTES — interaction notes
  function NoteSec({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 15
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...EYE,
        display: 'block',
        marginBottom: 7
      }
    }, title), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12.5,
        color: 'var(--ink-700)',
        lineHeight: '19px'
      }
    }, children));
  }
  const M = ({
    children
  }) => /*#__PURE__*/React.createElement("span", {
    style: MONO
  }, children);
  FR.push({
    id: 'NOTES',
    w: 760,
    h: 560,
    title: 'Interaction notes',
    note: 'read-only — nothing mutates the document',
    el: /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'var(--sub-850)',
        padding: '18px 24px',
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(NoteSec, {
      title: "Two paths, one inspector"
    }, "Tab 1 ", /*#__PURE__*/React.createElement("b", null, "Quick text (this device)"), " = pdf.js, zero upload, instant, live find/highlight, Copy all / Download .txt built locally. Tab 2 ", /*#__PURE__*/React.createElement("b", null, "Batch extract (server)"), " = ", /*#__PURE__*/React.createElement(M, null, "POST /api/jobs/extract-text"), " \u2192 202 \u2192 poll \u2192 ", /*#__PURE__*/React.createElement(M, null, "text/plain"), ". Switching tabs and changing page scope are the only reversible actions."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Client streaming + highlight"
    }, "Per-page text streams into the mono pane as pages render (faint ", /*#__PURE__*/React.createElement(M, null, "extracting page N\u2026"), " ticker). A find query highlights matched runs on ", /*#__PURE__*/React.createElement("b", null, "both"), " the pane lines and the sheet faces (press-tint wash + press underline). No job, no artifact, ", /*#__PURE__*/React.createElement("b", null, "no download moment"), " \u2014 text never leaves the device."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Two-way selection \u2194 range"
    }, "Board multi-select writes the ", /*#__PURE__*/React.createElement(M, null, "pages"), " range (4 selected \u2192 ", /*#__PURE__*/React.createElement(M, null, "1-3,7"), "); editing the range updates the selection. Multi-select exists ONLY to scope the server extract \u2014 it mutates nothing."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Server lifecycle"
    }, "Submit \u2192 brief upload spinner \u2192 202 + ", /*#__PURE__*/React.createElement(M, null, "Location"), " \u2192 poll ", /*#__PURE__*/React.createElement(M, null, "GET /api/jobs/{id}"), ". Phase = ", /*#__PURE__*/React.createElement(M, null, "stage"), " \u2192 ", /*#__PURE__*/React.createElement("b", null, "Running \u2014 pdftotext"), ". ", /*#__PURE__*/React.createElement(M, null, "progress:null"), " \u21D2 spinner, never a bar. ", /*#__PURE__*/React.createElement("b", null, "No finalize phase"), " (read-only). Cancel \u2192 ", /*#__PURE__*/React.createElement(M, null, "DELETE /api/jobs/{id}"), ". Success result is ", /*#__PURE__*/React.createElement(M, null, "text/plain"), " \u2014 the row says \u201CText only \u2014 no PDF was created.\u201D"), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Empty \u2260 error"
    }, "A valid PDF with no text layer is a ", /*#__PURE__*/React.createElement("b", null, "warn-gold advisory"), " (offer OCR), never a red error. Errors (", /*#__PURE__*/React.createElement(M, null, "not_a_pdf"), ", ", /*#__PURE__*/React.createElement(M, null, "bad_pdf_structure"), ", ", /*#__PURE__*/React.createElement(M, null, "out_of_range"), ") show a human sentence + small mono code; 422 also reddens the pages field."), /*#__PURE__*/React.createElement(NoteSec, {
      title: "Reduced motion"
    }, "Server press \u2192 static amber + cycling ", /*#__PURE__*/React.createElement(M, null, "working\u2026"), " (no spin); highlights appear without transition; no error shake; focus rings still render."))
  });
  window.PFF.Canvas = function Canvas() {
    return /*#__PURE__*/React.createElement(PFW.CanvasLayout, {
      frames: window.PFF_FRAMES
    });
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-f/framesC.jsx", error: String((e && e.message) || e) }); }

// flows/flow-f/inspector.jsx
try { (() => {
// pdf-forge flow F — inspector + artifact / advisory / errors. → window.PFF
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon,
    MONO = PFW.MONO,
    EYE = PFW.EYE;
  const {
    Tabs,
    Input,
    Switch,
    Button,
    Tag,
    StatusPill,
    InlineBanner
  } = DS;
  function PrivacyLabel({
    text,
    tone = 'ok'
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: tone === 'ok' ? 'var(--ok-500)' : 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })), text);
  }
  function Section({
    children,
    style
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px',
        borderBottom: '1px solid var(--sub-600)',
        ...style
      }
    }, children);
  }
  const lbl = {
    display: 'block',
    fontFamily: 'var(--font-ui)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ink-700)',
    marginBottom: 8
  };
  const desc = {
    margin: '8px 0 0',
    fontFamily: 'var(--font-ui)',
    fontSize: 12.5,
    color: 'var(--ink-600)',
    lineHeight: '18px'
  };

  // success artifact row — text/plain, NEVER implies a PDF
  function ArtifactRowText({
    filename,
    human,
    bytesExact
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        padding: '12px 14px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--ok-tint)',
        borderLeft: '3px solid var(--ok-500)',
        border: '1px solid rgba(75,174,126,.35)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ok-500)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "check",
      size: 18,
      sw: 2.4
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 13,
        color: 'var(--ink-900)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }
    }, filename), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, bytesExact, " B"), /*#__PURE__*/React.createElement(Tag, null, "text/plain"))), /*#__PURE__*/React.createElement(Button, {
      size: "sm",
      variant: "primary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 15
      })
    }, "Download")), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 11.5,
        color: 'var(--ink-600)',
        paddingLeft: 28
      }
    }, "Text only \u2014 no PDF was created."));
  }
  function ScanAdvisory({
    variant = 'client'
  }) {
    const msg = variant === 'client' ? 'No selectable text found — this looks like a scan. Run OCR to make it searchable.' : 'No text found. This may be a scanned image — OCR can add a text layer.';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        padding: '11px 12px 11px 13px',
        borderRadius: 'var(--r-ctl)',
        background: 'rgba(214,165,60,.12)',
        border: '1px solid rgba(214,165,60,.4)',
        borderLeft: '3px solid var(--warn-500)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--warn-500)',
        display: 'inline-flex',
        marginTop: 1,
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "alert",
      size: 16
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink-900)',
        lineHeight: '18px'
      }
    }, msg), /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--press-400)',
        textDecoration: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4
      }
    }, "Run OCR ", /*#__PURE__*/React.createElement(Icon, {
      name: "external",
      size: 13
    }))));
  }
  const ERRORS = {
    not_a_pdf: {
      title: "That isn't a PDF",
      code: 'not_a_pdf'
    },
    bad_pdf_structure: {
      title: "This PDF won't open for text extraction",
      code: 'bad_pdf_structure',
      msg: 'Try Repair first.',
      retry: 'Repair'
    },
    out_of_range: {
      title: 'Page 88 is past the end — this document has 42 pages',
      code: 'out_of_range',
      msg: 'Adjust the page range and try again.'
    },
    queue_full: {
      title: 'Every worker is busy right now',
      code: 'queue_full',
      msg: 'Retrying in 30s…'
    },
    file_too_large: {
      title: 'This file is over the 200 MB limit',
      code: 'file_too_large',
      msg: 'Split it first.'
    }
  };
  function ErrorBannerF({
    kind
  }) {
    const e = ERRORS[kind];
    return /*#__PURE__*/React.createElement(InlineBanner, {
      status: "err",
      title: e.title,
      code: e.code,
      actions: kind === 'queue_full' ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, "Retry now") : e.retry ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "ghost"
      }, e.retry) : null
    }, e.msg);
  }

  // the two-tab extract inspector
  function ExtractInspector({
    tab = 'quick',
    scope,
    scopeError,
    selectedCount = 0,
    layout = false,
    result = null,
    error = null,
    processing = false
  }) {
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 330,
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderLeft: '1px solid var(--sub-600)',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 0',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: EYE
    }, "Inspector"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        margin: '3px 0 12px'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--press-400)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "text",
      size: 17
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, "Extract text")), /*#__PURE__*/React.createElement(Tabs, {
      value: tab,
      tabs: [{
        id: 'quick',
        label: 'Quick text'
      }, {
        id: 'server',
        label: 'Batch extract'
      }]
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        minHeight: 0
      }
    }, tab === 'quick' ? /*#__PURE__*/React.createElement(Section, {
      style: {
        borderBottom: 'none'
      }
    }, /*#__PURE__*/React.createElement(PrivacyLabel, {
      text: "Stays on this device \u2014 nothing uploaded"
    }), /*#__PURE__*/React.createElement("p", {
      style: desc
    }, "Text is read straight from the pages with pdf.js. Find, highlight, and copy right here \u2014 nothing is uploaded and no file is produced."), error === 'scan' ? /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 14
      }
    }, /*#__PURE__*/React.createElement(ScanAdvisory, {
      variant: "client"
    })) : null) : /*#__PURE__*/React.createElement(Section, {
      style: {
        borderBottom: 'none',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(PrivacyLabel, {
      text: "Sent to your local server \xB7 127.0.0.1",
      tone: "muted"
    }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: lbl
    }, "Pages"), selectedCount > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...MONO,
        fontSize: 11,
        color: 'var(--press-400)'
      }
    }, "\u21C4 from ", selectedCount, " selected") : null), /*#__PURE__*/React.createElement(Input, {
      mono: true,
      value: scope,
      readOnly: true,
      error: scopeError,
      code: scopeError ? 'out_of_range' : undefined,
      placeholder: "1-end"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'block',
        marginTop: 6,
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        color: 'var(--ink-600)'
      }
    }, "Two-way bound to board selection \xB7 e.g. 1-10,21-end")), /*#__PURE__*/React.createElement(Switch, {
      label: "Preserve layout",
      defaultChecked: layout
    }), error && error !== 'scan' ? /*#__PURE__*/React.createElement(ErrorBannerF, {
      kind: error
    }) : null, result ? /*#__PURE__*/React.createElement(ArtifactRowText, {
      filename: result.filename,
      human: result.human,
      bytesExact: result.bytesExact
    }) : /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      block: true,
      processing: processing,
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "text",
        size: 15
      }),
      rightIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "chevron",
        size: 14
      })
    }, processing ? 'Extracting…' : 'Extract'))));
  }
  window.PFF = Object.assign(window.PFF || {}, {
    ExtractInspector,
    PrivacyLabel,
    ArtifactRowText,
    ScanAdvisory,
    ErrorBannerF
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-f/inspector.jsx", error: String((e && e.message) || e) }); }

// flows/flow-f/parts.jsx
try { (() => {
// pdf-forge flow F — board, text pane, shell. → window.PFF
(function () {
  const DS = window.PDFForgeDesignSystem_ec4ef3;
  const PFW = window.PFW;
  const Icon = PFW.Icon,
    MONO = PFW.MONO,
    EYE = PFW.EYE;
  const {
    PageSheet,
    IconButton,
    Spinner
  } = DS;
  const WIDTHS = {
    compact: 96,
    comfortable: 132,
    large: 180
  };

  // faux text on a sheet face; matched sheets show press-blue highlighted runs
  function SheetText({
    matched,
    scanned
  }) {
    if (scanned) return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg,#f3f3ef,#e6e6e0)'
      }
    });
    const rows = [78, 92, 64, 88, 72, 96, 60, 84, 70];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        padding: '13% 12%',
        display: 'flex',
        flexDirection: 'column',
        gap: '5.5%'
      }
    }, rows.map((w, i) => {
      const hit = matched && (i === 2 || i === 5);
      return /*#__PURE__*/React.createElement("span", {
        key: i,
        style: {
          height: 3,
          width: w + '%',
          borderRadius: 1,
          background: hit ? 'var(--press-500)' : '#d9d9d4',
          boxShadow: hit ? '0 0 0 2px var(--press-tint)' : 'none'
        }
      });
    }));
  }
  function MatchSheet({
    page,
    width,
    aspect,
    rotation,
    matched,
    selected,
    focused,
    scanned
  }) {
    return /*#__PURE__*/React.createElement(PageSheet, {
      page: page,
      width: width,
      aspect: aspect,
      rotation: rotation,
      selected: selected,
      focused: focused
    }, /*#__PURE__*/React.createElement(SheetText, {
      matched: matched,
      scanned: scanned
    }));
  }

  // flow-F board (renders match highlights + scanned faces)
  function FBoard({
    pages,
    size = 'compact',
    matchedIds = [],
    selectedIds = [],
    scanned = false,
    dim = false,
    marquee = null,
    children,
    margin = 16
  }) {
    const width = WIDTHS[size] || 96;
    const gap = size === 'compact' ? 8 : 12;
    const M = new Set(matchedIds),
      S = new Set(selectedIds);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        margin,
        padding: '18px 16px',
        borderRadius: 'var(--r-panel)',
        background: 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)',
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        position: 'relative'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap,
        position: 'relative'
      }
    }, pages.map(p => /*#__PURE__*/React.createElement(MatchSheet, {
      key: p.id,
      page: p.page,
      width: width,
      aspect: p.aspect,
      rotation: p.rotation,
      matched: M.has(p.id),
      selected: S.has(p.id) || p.selected,
      focused: p.focused,
      scanned: scanned
    }))), marquee ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        ...marquee,
        border: '1px solid var(--press-500)',
        background: 'var(--press-tint)',
        opacity: 0.5,
        borderRadius: 2
      }
    }) : null, dim ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,10,14,.6)',
        borderRadius: 'var(--r-panel)',
        zIndex: 1
      }
    }) : null, children ? /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        zIndex: 2,
        padding: 20
      }
    }, children) : null);
  }

  // find/highlight box atop the text pane
  function FindBox({
    query,
    matches
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderBottom: '1px solid var(--sub-600)',
        background: 'var(--sub-800)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "search",
      size: 15
    })), /*#__PURE__*/React.createElement("input", {
      readOnly: true,
      value: query,
      placeholder: "Find in text",
      style: {
        flex: 1,
        minWidth: 0,
        background: 'transparent',
        border: 'none',
        outline: 'none',
        color: 'var(--ink-900)',
        ...MONO,
        fontSize: 13
      }
    }), query ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, matches, " matches") : null, /*#__PURE__*/React.createElement(IconButton, {
      size: "md",
      label: "Previous match"
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15,
      sw: 2
    })), /*#__PURE__*/React.createElement(IconButton, {
      size: "md",
      label: "Next match"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        transform: 'rotate(90deg)',
        display: 'inline-flex'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "chevron",
      size: 15
    }))));
  }
  function hl(line, query) {
    if (!query) return line;
    const low = line.toLowerCase(),
      q = query.toLowerCase();
    let i = 0,
      idx = low.indexOf(q);
    if (idx < 0) return line;
    const out = [];
    while (idx >= 0) {
      if (idx > i) out.push(line.slice(i, idx));
      out.push(/*#__PURE__*/React.createElement("mark", {
        key: idx,
        style: {
          background: 'var(--press-tint)',
          color: 'var(--ink-900)',
          borderBottom: '2px solid var(--press-500)',
          padding: '0 1px',
          borderRadius: 1
        }
      }, line.slice(idx, idx + q.length)));
      i = idx + q.length;
      idx = low.indexOf(q, i);
    }
    if (i < line.length) out.push(line.slice(i));
    return out;
  }

  // mono text pane beside the board
  function TextPane({
    lines = [],
    query = '',
    matches = 0,
    streamingPage = 0,
    empty = false,
    showFind = true,
    footer = true
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        margin: '16px 16px 16px 0',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-850)',
        border: '1px solid var(--sub-600)',
        borderRadius: 'var(--r-panel)',
        overflow: 'hidden'
      }
    }, showFind ? /*#__PURE__*/React.createElement(FindBox, {
      query: query,
      matches: matches
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: empty ? 0 : '10px 0'
      }
    }, empty ? /*#__PURE__*/React.createElement("div", {
      style: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        color: 'var(--ink-500)',
        padding: 24,
        textAlign: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "text",
      size: 26
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--ink-600)'
      }
    }, "Open a PDF to read its text")) : /*#__PURE__*/React.createElement(React.Fragment, null, lines.map((ln, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        gap: 12,
        padding: '0 14px',
        minHeight: 18
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12,
        lineHeight: '18px',
        color: 'var(--ink-500)',
        width: 22,
        textAlign: 'right',
        flex: 'none',
        userSelect: 'none'
      }
    }, ln === '' ? '' : i + 1), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 13,
        lineHeight: '18px',
        color: /^[0-9]|AGREEMENT|FEES|TERM|CONFID/.test(ln) ? 'var(--ink-900)' : 'var(--ink-700)',
        whiteSpace: 'pre-wrap'
      }
    }, hl(ln, query)))), streamingPage ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Spinner, {
      size: 13,
      tone: "ink"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...MONO,
        fontSize: 12
      }
    }, "extracting page ", streamingPage, "\u2026")) : null)), footer && !empty ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderTop: '1px solid var(--sub-600)',
        background: 'var(--sub-800)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(DS.Button, {
      size: "sm",
      variant: "secondary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "copy",
        size: 15
      })
    }, "Copy all"), /*#__PURE__*/React.createElement(DS.Button, {
      size: "sm",
      variant: "secondary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "download",
        size: 15
      })
    }, "Download .txt"), /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        ...MONO,
        fontSize: 11,
        color: 'var(--ink-500)'
      }
    }, "built locally \xB7 zero upload")) : null);
  }

  // three-zone frame with board + text pane in the worksurface
  function FWorkFrame({
    rail,
    header,
    board,
    textPane,
    inspector,
    overlay,
    boardFlex = '0 0 42%'
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        inset: 0,
        display: 'flex',
        background: 'var(--sub-900)',
        color: 'var(--ink-900)',
        overflow: 'hidden'
      }
    }, rail, /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-850)',
        position: 'relative'
      }
    }, header, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: boardFlex,
        minWidth: 0,
        display: 'flex'
      }
    }, board), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex'
      }
    }, textPane)), overlay), inspector);
  }
  window.PFF = Object.assign(window.PFF || {}, {
    FBoard,
    MatchSheet,
    SheetText,
    TextPane,
    FindBox,
    FWorkFrame,
    WIDTHS
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "flows/flow-f/parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/BoardHeader.jsx
try { (() => {
// Board header strip — doc name, page count, selection, zoom, run. → window.BoardHeader
(function () {
  const Icon = window.PFIcon;
  const NS = window.PDFForgeDesignSystem_ec4ef3;
  const {
    Checkbox,
    SegmentedControl,
    StatusPill,
    Button,
    IconButton,
    Tooltip,
    Tag
  } = NS;
  function BoardHeader(props) {
    const {
      doc,
      liveCount,
      selectedCount,
      allSelected,
      someSelected,
      onToggleAll,
      size,
      onSize,
      onRotate,
      onDelete,
      onRun,
      processing
    } = props;
    const hasSel = selectedCount > 0;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        padding: '10px 16px',
        background: 'var(--sub-800)',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(Checkbox, {
      checked: allSelected,
      indeterminate: someSelected && !allSelected,
      onChange: onToggleAll,
      "aria-label": "Select all pages"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ink-600)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "file",
      size: 16
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        color: 'var(--ink-900)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 220
      }
    }, doc.name), /*#__PURE__*/React.createElement(Tag, null, liveCount, " pages"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, doc.size)), hasSel ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      status: "selected",
      count: selectedCount
    }, "selected"), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Rotate 90\xB0",
      kbd: "R"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "outlined",
      label: "Rotate selected",
      onClick: onRotate
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "rotate"
    }))), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Delete pages",
      kbd: "\u232B"
    }, /*#__PURE__*/React.createElement(IconButton, {
      variant: "danger",
      label: "Delete selected",
      onClick: onDelete
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "trash"
    })))) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginLeft: 'auto'
      }
    }, /*#__PURE__*/React.createElement(SegmentedControl, {
      ariaLabel: "Sheet size",
      value: size,
      onChange: onSize,
      options: [{
        value: 'compact',
        label: 'Compact'
      }, {
        value: 'comfortable',
        label: 'Comfortable'
      }, {
        value: 'large',
        label: 'Large'
      }]
    }), /*#__PURE__*/React.createElement(Tooltip, {
      label: "Export selected pages",
      kbd: "\u2318E",
      placement: "bottom"
    }, /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "export",
        size: 16
      }),
      processing: processing,
      onClick: onRun
    }, processing ? 'Pressing…' : 'Export'))));
  }
  window.BoardHeader = BoardHeader;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/BoardHeader.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/Inspector.jsx
try { (() => {
// Right inspector — op options + the press-at-work job readout. → window.Inspector
(function () {
  const Icon = window.PFIcon;
  const NS = window.PDFForgeDesignSystem_ec4ef3;
  const {
    Input,
    Select,
    Switch,
    Checkbox,
    RadioGroup,
    Button,
    PressIndicator,
    InlineBanner,
    Tag
  } = NS;
  const TITLES = {
    pages: 'Page properties',
    merge: 'Merge documents',
    split: 'Split document',
    rotate: 'Rotate pages',
    compress: 'Compress',
    export: 'Export'
  };
  const VERB = {
    merge: 'Merge',
    split: 'Split',
    rotate: 'Apply rotation',
    compress: 'Compress',
    export: 'Export',
    pages: 'Export'
  };
  function Field({
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        marginBottom: 14
      }
    }, children);
  }
  function Options({
    op,
    selectedCount
  }) {
    if (op === 'merge') {
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement("span", {
        style: lblS
      }, "Source files \xB7 drag to reorder"), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }
      }, ['contract_final.pdf', 'appendix_a.pdf', 'signatures.pdf'].map((f, i) => /*#__PURE__*/React.createElement("div", {
        key: f,
        style: rowS
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--ink-600)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11
        }
      }, i + 1), /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          color: 'var(--ink-600)'
        }
      }, /*#__PURE__*/React.createElement(Icon, {
        name: "file",
        size: 14
      })), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1,
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--ink-900)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }
      }, f))))), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Button, {
        variant: "secondary",
        block: true,
        leftIcon: /*#__PURE__*/React.createElement(Icon, {
          name: "plus",
          size: 15
        })
      }, "Add files")), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Input, {
        label: "Output filename",
        mono: true,
        defaultValue: "merged_2024.pdf"
      })));
    }
    if (op === 'compress') {
      return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement("span", {
        style: lblS
      }, "Compression level"), /*#__PURE__*/React.createElement(RadioGroup, {
        name: "lvl",
        defaultValue: "balanced",
        options: [{
          value: 'lossless',
          label: 'Lossless (metadata only)'
        }, {
          value: 'balanced',
          label: 'Balanced — 150 DPI images'
        }, {
          value: 'aggressive',
          label: 'Aggressive — 96 DPI images'
        }]
      })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(InlineBanner, {
        status: "info",
        title: "Estimated 4.2 MB \u2192 1.6 MB"
      }, "Re-samples images; vector text is untouched.")));
    }
    if (op === 'rotate') {
      return /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement("span", {
        style: lblS
      }, "Rotate ", selectedCount > 0 ? `${selectedCount} selected` : 'all', " pages"), /*#__PURE__*/React.createElement(RadioGroup, {
        name: "deg",
        defaultValue: "90",
        row: true,
        options: [{
          value: '90',
          label: '90°'
        }, {
          value: '180',
          label: '180°'
        }, {
          value: '270',
          label: '270°'
        }]
      }));
    }
    // export / pages / split — the rich, default form
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Input, {
      label: "Output filename",
      mono: true,
      defaultValue: "contract_final.pdf"
    })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Select, {
      label: "Page range",
      mono: true,
      defaultValue: "all",
      options: [{
        value: 'all',
        label: 'All pages'
      }, {
        value: 'sel',
        label: 'Selected pages'
      }, {
        value: 'custom',
        label: 'Custom…'
      }]
    })), /*#__PURE__*/React.createElement(Field, null, /*#__PURE__*/React.createElement(Select, {
      label: "Resolution",
      mono: true,
      options: ['72 DPI', '150 DPI', '300 DPI', '600 DPI'],
      defaultValue: "300 DPI"
    })), /*#__PURE__*/React.createElement(Field, {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Switch, {
      label: "Keep input files",
      defaultChecked: true
    }), /*#__PURE__*/React.createElement(Checkbox, {
      label: "Flatten annotations"
    }), /*#__PURE__*/React.createElement(Checkbox, {
      label: "Embed fonts",
      defaultChecked: true
    })));
  }
  function Inspector({
    activeOp,
    jobState,
    jobDetail,
    jobCode,
    selectedCount,
    onRun,
    onReset
  }) {
    const verb = VERB[activeOp] || 'Run';
    const target = selectedCount > 0 ? `${selectedCount} selected pages` : 'all 14 pages';
    return /*#__PURE__*/React.createElement("aside", {
      style: {
        width: 'var(--inspector-w)',
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderLeft: '1px solid var(--sub-600)',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 16px 12px',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--ink-600)'
      }
    }, "Inspector"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginTop: 3
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--press-400)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: activeOp,
      size: 17
    })), /*#__PURE__*/React.createElement("h3", {
      style: {
        margin: 0,
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--ink-900)'
      }
    }, TITLES[activeOp] || 'Operation'))), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 16,
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(Options, {
      op: activeOp,
      selectedCount: selectedCount
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 16,
        borderTop: '1px solid var(--sub-600)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 'none'
      }
    }, jobState !== 'idle' ? /*#__PURE__*/React.createElement(PressIndicator, {
      state: jobState,
      detail: jobDetail,
      code: jobCode,
      label: jobState === 'processing' ? `${verb}ing…` : undefined,
      action: jobState === 'success' ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        variant: "primary",
        leftIcon: /*#__PURE__*/React.createElement(Icon, {
          name: "export",
          size: 15
        })
      }, "Download") : jobState === 'error' ? /*#__PURE__*/React.createElement(Button, {
        size: "sm",
        onClick: onRun
      }, "Retry") : null
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--ink-600)'
      }
    }, verb, " ", target), /*#__PURE__*/React.createElement(Button, {
      variant: "primary",
      leftIcon: /*#__PURE__*/React.createElement(Icon, {
        name: "play",
        size: 14
      }),
      processing: jobState === 'processing',
      onClick: onRun
    }, jobState === 'processing' ? 'Pressing…' : verb))));
  }
  const lblS = {
    display: 'block',
    fontFamily: 'var(--font-ui)',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--ink-700)',
    marginBottom: 8
  };
  const rowS = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 9px',
    borderRadius: 'var(--r-ctl)',
    background: 'var(--sub-850)',
    border: '1px solid var(--sub-600)'
  };
  window.Inspector = Inspector;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/Inspector.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/Rail.jsx
try { (() => {
// Left rail — operation nav, collapsible (56 ↔ 220). → window.Rail
(function () {
  const Icon = window.PFIcon;
  const {
    Tooltip
  } = window.PDFForgeDesignSystem_ec4ef3;
  function RailItem({
    op,
    active,
    collapsed,
    onSelect
  }) {
    const btn = /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => onSelect(op.id),
      "aria-current": active ? 'page' : undefined,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        height: 36,
        padding: collapsed ? 0 : '0 10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 'var(--r-ctl)',
        border: '1px solid transparent',
        cursor: 'pointer',
        background: active ? 'var(--press-tint)' : 'transparent',
        color: active ? 'var(--press-400)' : 'var(--ink-700)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        transition: 'background var(--mo-fast) var(--ease-inout), color var(--mo-fast)'
      },
      onMouseEnter: e => {
        if (!active) {
          e.currentTarget.style.background = 'var(--sub-700)';
          e.currentTarget.style.color = 'var(--ink-900)';
        }
      },
      onMouseLeave: e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--ink-700)';
        }
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: op.icon,
      size: 17
    })), !collapsed ? /*#__PURE__*/React.createElement("span", null, op.label) : null);
    return collapsed ? /*#__PURE__*/React.createElement(Tooltip, {
      label: op.label,
      placement: "right"
    }, btn) : btn;
  }
  function Rail({
    ops,
    active,
    onSelect,
    collapsed,
    onToggle
  }) {
    return /*#__PURE__*/React.createElement("nav", {
      style: {
        width: collapsed ? 'var(--rail-collapsed)' : 'var(--rail-open)',
        flex: 'none',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-800)',
        borderRight: '1px solid var(--sub-600)',
        transition: 'width var(--mo-base) var(--ease-out)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        height: 52,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: collapsed ? 0 : '0 14px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderBottom: '1px solid var(--sub-600)',
        flex: 'none'
      }
    }, /*#__PURE__*/React.createElement("img", {
      src: "../../assets/logo/mark.svg",
      alt: "",
      width: "26",
      height: "26",
      style: {
        display: 'block',
        flex: 'none'
      }
    }), !collapsed ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontWeight: 600,
        fontSize: 16,
        letterSpacing: '-0.01em',
        color: 'var(--ink-900)'
      }
    }, "pdf", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--press-500)'
      }
    }, "-"), "forge") : null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
        padding: collapsed ? '10px 8px' : '10px',
        minHeight: 0
      }
    }, !collapsed ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 500,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: 'var(--ink-600)',
        padding: '4px 10px 6px'
      }
    }, "Operations") : null, ops.map(op => /*#__PURE__*/React.createElement(RailItem, {
      key: op.id,
      op: op,
      active: active === op.id,
      collapsed: collapsed,
      onSelect: onSelect
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: collapsed ? '10px 8px' : 10,
        borderTop: '1px solid var(--sub-600)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        flex: 'none'
      }
    }, !collapsed ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '6px 10px',
        borderRadius: 'var(--r-ctl)',
        background: 'var(--sub-850)',
        color: 'var(--ink-600)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        color: 'var(--ok-500)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "lock",
      size: 13
    })), "local \xB7 127.0.0.1") : null, /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: onToggle,
      "aria-label": collapsed ? 'Expand rail' : 'Collapse rail',
      style: {
        height: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? 0 : '0 10px',
        borderRadius: 'var(--r-ctl)',
        border: 'none',
        background: 'transparent',
        color: 'var(--ink-600)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: 12
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = 'var(--sub-700)';
        e.currentTarget.style.color = 'var(--ink-900)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--ink-600)';
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        transform: collapsed ? 'none' : 'scaleX(-1)'
      }
    }, /*#__PURE__*/React.createElement(Icon, {
      name: "panelLeft",
      size: 16
    })), !collapsed ? /*#__PURE__*/React.createElement("span", null, "Collapse") : null)));
  }
  window.Rail = Rail;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/Rail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/Workbench.jsx
try { (() => {
// Workbench — composes the three zones and owns interaction state. → window.Workbench
(function () {
  const NS = window.PDFForgeDesignSystem_ec4ef3;
  const {
    ToastViewport,
    Toast,
    Button
  } = NS;
  const {
    useState,
    useRef,
    useEffect,
    useCallback
  } = React;
  function Workbench() {
    const DATA = window.PF_DATA;
    const [activeOp, setActiveOp] = useState('pages');
    const [collapsed, setCollapsed] = useState(false);
    const [pages, setPages] = useState(DATA.pages.map(p => ({
      ...p
    })));
    const [selected, setSelected] = useState(() => new Set());
    const [focusIndex, setFocusIndex] = useState(0);
    const [size, setSize] = useState('comfortable');
    const [job, setJob] = useState({
      state: 'idle',
      detail: '',
      code: ''
    });
    const [toasts, setToasts] = useState([]);
    const lastIdx = useRef(0);
    const jobTimer = useRef(null);
    const live = pages.filter(p => !p.deleted);
    const liveCount = live.length;
    const selectedCount = selected.size;
    const allSelected = liveCount > 0 && live.every(p => selected.has(p.id));
    const someSelected = selectedCount > 0;
    const pushToast = useCallback(t => {
      const id = 'to' + Date.now() + Math.random().toString(36).slice(2, 5);
      setToasts(cur => [...cur, {
        id,
        ...t
      }]);
      setTimeout(() => setToasts(cur => cur.filter(x => x.id !== id)), 4200);
    }, []);
    const selectPage = useCallback((id, e) => {
      const idx = pages.findIndex(p => p.id === id);
      setSelected(cur => {
        const next = new Set(cur);
        if (e && e.shiftKey && lastIdx.current != null) {
          const [a, b] = [lastIdx.current, idx].sort((x, y) => x - y);
          for (let i = a; i <= b; i++) if (!pages[i].deleted) next.add(pages[i].id);
        } else if (e && (e.metaKey || e.ctrlKey)) {
          next.has(id) ? next.delete(id) : next.add(id);
        } else {
          if (next.size === 1 && next.has(id)) next.clear();else {
            next.clear();
            next.add(id);
          }
        }
        return next;
      });
      lastIdx.current = idx;
    }, [pages]);
    const toggleAll = useCallback(() => {
      setSelected(allSelected ? new Set() : new Set(live.map(p => p.id)));
    }, [allSelected, live]);
    const rotateSel = useCallback(() => {
      setPages(cur => cur.map(p => selected.has(p.id) ? {
        ...p,
        rotation: (p.rotation + 90) % 360
      } : p));
    }, [selected]);
    const deleteSel = useCallback(() => {
      setPages(cur => cur.map(p => selected.has(p.id) ? {
        ...p,
        deleted: true
      } : p));
      const n = selected.size;
      setSelected(new Set());
      pushToast({
        status: 'neutral',
        title: `${n} page${n > 1 ? 's' : ''} deleted`,
        action: /*#__PURE__*/React.createElement(Button, {
          size: "sm",
          variant: "ghost"
        }, "Undo")
      });
    }, [selected, pushToast]);
    const reorder = useCallback((from, to) => {
      setPages(cur => {
        const next = cur.slice();
        const [moved] = next.splice(from, 1);
        next.splice(from < to ? to - 1 : to, 0, moved);
        return next;
      });
    }, []);
    const runJob = useCallback(() => {
      clearTimeout(jobTimer.current);
      const target = selectedCount > 0 ? `${selectedCount} pages` : `${liveCount} pages`;
      setJob({
        state: 'processing',
        detail: `contract_final.pdf · ${target}`,
        code: ''
      });
      jobTimer.current = setTimeout(() => {
        setJob({
          state: 'success',
          detail: 'contract_final.pdf · 3.9 MB',
          code: ''
        });
        pushToast({
          status: 'ok',
          title: 'Export ready',
          children: 'contract_final.pdf · 3.9 MB',
          action: /*#__PURE__*/React.createElement(Button, {
            size: "sm",
            variant: "ghost"
          }, "Open")
        });
      }, 2300);
    }, [selectedCount, liveCount, pushToast]);

    // App-level keyboard shortcuts (keyboard-first instrument)
    useEffect(() => {
      function onKey(e) {
        const t = e.target;
        if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
        if (e.key === 'r' && someSelected) {
          e.preventDefault();
          rotateSel();
        } else if ((e.key === 'Delete' || e.key === 'Backspace') && someSelected) {
          e.preventDefault();
          deleteSel();
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'e') {
          e.preventDefault();
          runJob();
        } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          setSelected(new Set(live.map(p => p.id)));
        }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [someSelected, rotateSel, deleteSel, runJob, live]);
    useEffect(() => () => clearTimeout(jobTimer.current), []);
    const Rail = window.Rail,
      BoardHeader = window.BoardHeader,
      Worksurface = window.Worksurface,
      Inspector = window.Inspector;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        inset: 0,
        display: 'flex',
        background: 'var(--sub-900)',
        color: 'var(--ink-900)'
      }
    }, /*#__PURE__*/React.createElement(Rail, {
      ops: DATA.ops,
      active: activeOp,
      onSelect: id => {
        setActiveOp(id);
        setJob({
          state: 'idle',
          detail: '',
          code: ''
        });
      },
      collapsed: collapsed,
      onToggle: () => setCollapsed(c => !c)
    }), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sub-850)'
      }
    }, /*#__PURE__*/React.createElement(BoardHeader, {
      doc: DATA.doc,
      liveCount: liveCount,
      selectedCount: selectedCount,
      allSelected: allSelected,
      someSelected: someSelected,
      onToggleAll: toggleAll,
      size: size,
      onSize: setSize,
      onRotate: rotateSel,
      onDelete: deleteSel,
      onRun: runJob,
      processing: job.state === 'processing'
    }), /*#__PURE__*/React.createElement(Worksurface, {
      pages: pages,
      selected: selected,
      focusIndex: focusIndex,
      size: size,
      grid: true,
      onSelectPage: selectPage,
      onReorder: reorder,
      onFocusIndex: setFocusIndex
    })), /*#__PURE__*/React.createElement(Inspector, {
      activeOp: activeOp,
      jobState: job.state,
      jobDetail: job.detail,
      jobCode: job.code,
      selectedCount: selectedCount,
      onRun: runJob,
      onReset: () => setJob({
        state: 'idle',
        detail: '',
        code: ''
      })
    }), /*#__PURE__*/React.createElement(ToastViewport, {
      position: "br"
    }, toasts.map(t => /*#__PURE__*/React.createElement(Toast, {
      key: t.id,
      status: t.status,
      title: t.title,
      action: t.action,
      onDismiss: () => setToasts(cur => cur.filter(x => x.id !== t.id))
    }, t.children))));
  }
  window.Workbench = Workbench;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/Workbench.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/Worksurface.jsx
try { (() => {
// Worksurface — the board well: sheets in a flow, select / focus / drag-reorder. → window.Worksurface
(function () {
  const NS = window.PDFForgeDesignSystem_ec4ef3;
  const {
    PageSheet,
    InsertionBar
  } = NS;
  const WIDTHS = {
    compact: 96,
    comfortable: 132,
    large: 180
  };
  function Worksurface({
    pages,
    selected,
    focusIndex,
    size,
    grid,
    onSelectPage,
    onReorder,
    onFocusIndex
  }) {
    const width = WIDTHS[size] || 132;
    const [dragIndex, setDragIndex] = React.useState(-1);
    const [insertAt, setInsertAt] = React.useState(-1);
    const wellBg = grid ? 'radial-gradient(var(--sub-600) 1px, transparent 1px) -8px -8px / 24px 24px, var(--sub-700)' : 'var(--sub-700)';
    const sheetH = p => Math.round(width / (p.rotation % 180 !== 0 ? 1 / p.aspect : p.aspect));
    function onKeyDown(e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = Math.max(0, Math.min(pages.length - 1, focusIndex + (e.key === 'ArrowRight' ? 1 : -1)));
        onFocusIndex(next);
      } else if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        const p = pages[focusIndex];
        if (p && !p.deleted) onSelectPage(p.id, e);
      }
    }
    function handleDragOver(e, i) {
      e.preventDefault();
      const r = e.currentTarget.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      setInsertAt(after ? i + 1 : i);
    }
    function handleDrop(e) {
      e.preventDefault();
      if (dragIndex >= 0 && insertAt >= 0) onReorder(dragIndex, insertAt);
      setDragIndex(-1);
      setInsertAt(-1);
    }
    const items = [];
    pages.forEach((p, i) => {
      if (insertAt === i && dragIndex >= 0) {
        items.push(/*#__PURE__*/React.createElement(InsertionBar, {
          key: 'ins' + i,
          height: sheetH(p)
        }));
      }
      items.push(/*#__PURE__*/React.createElement("div", {
        key: p.id,
        draggable: !p.deleted,
        onDragStart: () => setDragIndex(i),
        onDragEnd: () => {
          setDragIndex(-1);
          setInsertAt(-1);
        },
        onDragOver: e => handleDragOver(e, i),
        onDrop: handleDrop,
        style: {
          display: 'inline-flex'
        }
      }, /*#__PURE__*/React.createElement(PageSheet, {
        page: p.page,
        width: width,
        aspect: p.aspect,
        rotation: p.rotation,
        selected: selected.has(p.id),
        focused: focusIndex === i,
        lifted: dragIndex === i,
        deleted: p.deleted,
        onClick: e => {
          if (!p.deleted) {
            onSelectPage(p.id, e);
            onFocusIndex(i);
          }
        }
      })));
    });
    if (insertAt === pages.length && dragIndex >= 0) {
      items.push(/*#__PURE__*/React.createElement(InsertionBar, {
        key: "ins-end",
        height: Math.round(width * 1.414)
      }));
    }
    return /*#__PURE__*/React.createElement("div", {
      role: "listbox",
      "aria-label": "Document pages",
      "aria-multiselectable": "true",
      tabIndex: 0,
      onKeyDown: onKeyDown,
      onDragOver: e => {
        if (dragIndex >= 0) e.preventDefault();
      },
      onDrop: handleDrop,
      style: {
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        margin: 16,
        padding: '22px 20px',
        borderRadius: 'var(--r-panel)',
        background: wellBg,
        boxShadow: 'inset 0 1px 0 rgba(5,7,10,.5), inset 0 0 0 1px var(--sub-700)',
        outline: 'none'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'flex-start',
        gap: size === 'compact' ? 8 : 12
      }
    }, items));
  }
  window.Worksurface = Worksurface;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/Worksurface.jsx", error: String((e && e.message) || e) }); }

// ui_kits/workbench/data.js
try { (() => {
// pdf-forge workbench — sample document data (plain global; not transpiled).
(function () {
  // A loaded multi-page PDF. Mostly ISO portrait; page 6 is a landscape scan.
  const ISO = 210 / 297; // ≈0.707
  const LAND = 297 / 210; // ≈1.414
  const pages = [];
  for (let i = 1; i <= 14; i++) {
    pages.push({
      id: 'p' + i,
      page: i,
      aspect: i === 6 ? LAND : ISO,
      rotation: 0,
      deleted: false
    });
  }
  window.PF_DATA = {
    doc: {
      name: 'contract_final.pdf',
      pages: 14,
      size: '4.2 MB'
    },
    pages,
    // left-rail operations (the workbench's tools)
    ops: [{
      id: 'pages',
      label: 'Pages',
      icon: 'pages'
    }, {
      id: 'merge',
      label: 'Merge',
      icon: 'merge'
    }, {
      id: 'split',
      label: 'Split',
      icon: 'split'
    }, {
      id: 'rotate',
      label: 'Rotate',
      icon: 'rotate'
    }, {
      id: 'compress',
      label: 'Compress',
      icon: 'compress'
    }, {
      id: 'export',
      label: 'Export',
      icon: 'export'
    }]
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/data.js", error: String((e && e.message) || e) }); }

// ui_kits/workbench/icons.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// Shared icon set (Lucide-style 24px stroke geometry). Exposes <Icon name size/>.
(function () {
  const P = {
    pages: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "4",
      y: "3",
      width: "13",
      height: "18",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 3v18"
    })),
    merge: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M7 3v6a3 3 0 0 0 3 3h4a3 3 0 0 1 3 3v6"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m14 9 3-3-3-3"
    })),
    split: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M16 3h5v5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 21H3v-5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M21 3 3 21"
    })),
    rotate: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M21 12a9 9 0 1 1-2.64-6.36"
    }), /*#__PURE__*/React.createElement("polyline", {
      points: "21 3 21 9 15 9"
    })),
    compress: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M4 9V5a1 1 0 0 1 1-1h4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M20 15v4a1 1 0 0 1-1 1h-4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M15 4h4a1 1 0 0 1 1 1v4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 20H5a1 1 0 0 1-1-1v-4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m9 9 6 6"
    })),
    export: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M12 3v12"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m7 8 5-5 5 5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 21h14a0 0 0 0 1 0 0v-4"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M5 17v4"
    })),
    trash: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M3 6h18"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
    })),
    play: /*#__PURE__*/React.createElement("polygon", {
      points: "6 3 20 12 6 21 6 3",
      fill: "currentColor",
      stroke: "none"
    }),
    plus: /*#__PURE__*/React.createElement("path", {
      d: "M12 5v14M5 12h14"
    }),
    minus: /*#__PURE__*/React.createElement("path", {
      d: "M5 12h14"
    }),
    check: /*#__PURE__*/React.createElement("path", {
      d: "M20 6 9 17l-5-5"
    }),
    chevron: /*#__PURE__*/React.createElement("path", {
      d: "m9 6 6 6-6 6"
    }),
    panelLeft: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "4",
      width: "18",
      height: "16",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M9 4v16"
    })),
    search: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("circle", {
      cx: "11",
      cy: "11",
      r: "7"
    }), /*#__PURE__*/React.createElement("path", {
      d: "m21 21-4.3-4.3"
    })),
    file: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("path", {
      d: "M14 3v5h5"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
    })),
    x: /*#__PURE__*/React.createElement("path", {
      d: "M18 6 6 18M6 6l12 12"
    }),
    lock: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "4",
      y: "11",
      width: "16",
      height: "9",
      rx: "2"
    }), /*#__PURE__*/React.createElement("path", {
      d: "M8 11V7a4 4 0 0 1 8 0v4"
    })),
    grid: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "3",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "3",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "3",
      y: "14",
      width: "7",
      height: "7",
      rx: "1"
    }), /*#__PURE__*/React.createElement("rect", {
      x: "14",
      y: "14",
      width: "7",
      height: "7",
      rx: "1"
    }))
  };
  function Icon({
    name,
    size = 16,
    strokeWidth = 2,
    ...rest
  }) {
    return /*#__PURE__*/React.createElement("svg", _extends({
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: strokeWidth,
      strokeLinecap: "round",
      strokeLinejoin: "round"
    }, rest), P[name] || null);
  }
  window.PFIcon = Icon;
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/workbench/icons.jsx", error: String((e && e.message) || e) }); }

__ds_ns.InsertionBar = __ds_scope.InsertionBar;

__ds_ns.PageChip = __ds_scope.PageChip;

__ds_ns.PageSheet = __ds_scope.PageSheet;

__ds_ns.InlineBanner = __ds_scope.InlineBanner;

__ds_ns.PressIndicator = __ds_scope.PressIndicator;

__ds_ns.Spinner = __ds_scope.Spinner;

__ds_ns.Toast = __ds_scope.Toast;

__ds_ns.ToastViewport = __ds_scope.ToastViewport;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.Radio = __ds_scope.Radio;

__ds_ns.RadioGroup = __ds_scope.RadioGroup;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Slider = __ds_scope.Slider;

__ds_ns.Switch = __ds_scope.Switch;

__ds_ns.Dialog = __ds_scope.Dialog;

__ds_ns.Panel = __ds_scope.Panel;

__ds_ns.SegmentedControl = __ds_scope.SegmentedControl;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.Tag = __ds_scope.Tag;

})();
