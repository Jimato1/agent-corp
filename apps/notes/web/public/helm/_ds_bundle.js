/* @ds-bundle: {"format":4,"namespace":"HelmDesignSystem_f4cb26","components":[{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"IconButton","sourcePath":"components/core/IconButton.jsx"},{"name":"Input","sourcePath":"components/core/Input.jsx"},{"name":"StatusPill","sourcePath":"components/core/StatusPill.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"EmptyState","sourcePath":"components/data/EmptyState.jsx"},{"name":"ErrorState","sourcePath":"components/data/ErrorState.jsx"},{"name":"LivenessClass","sourcePath":"components/data/LivenessClass.jsx"},{"name":"Skeleton","sourcePath":"components/data/Skeleton.jsx"},{"name":"FenceState","sourcePath":"components/identity/FenceState.jsx"},{"name":"PrincipalRef","sourcePath":"components/identity/PrincipalRef.jsx"},{"name":"TicketRef","sourcePath":"components/identity/TicketRef.jsx"},{"name":"TierBadge","sourcePath":"components/identity/TierBadge.jsx"},{"name":"ConfirmFriction","sourcePath":"components/safety/ConfirmFriction.jsx"},{"name":"DangerAction","sourcePath":"components/safety/DangerAction.jsx"},{"name":"FreshnessStamp","sourcePath":"components/safety/FreshnessStamp.jsx"},{"name":"HaltBand","sourcePath":"components/safety/HaltBand.jsx"},{"name":"HonestState","sourcePath":"components/safety/HonestState.jsx"},{"name":"PrintedAbsence","sourcePath":"components/safety/PrintedAbsence.jsx"},{"name":"ReviewChip","sourcePath":"components/safety/ReviewChip.jsx"},{"name":"StopActuator","sourcePath":"components/safety/StopActuator.jsx"},{"name":"AppHeader","sourcePath":"components/shell/AppHeader.jsx"},{"name":"KillMirror","sourcePath":"components/shell/AppHeader.jsx"},{"name":"NavRail","sourcePath":"components/shell/NavRail.jsx"},{"name":"HELM_APPS","sourcePath":"components/shell/SuiteSwitcher.jsx"},{"name":"SuiteSwitcher","sourcePath":"components/shell/SuiteSwitcher.jsx"}],"sourceHashes":{"components/core/Button.jsx":"9ff4746eef92","components/core/IconButton.jsx":"639dcd8e83e0","components/core/Input.jsx":"92d16a7b5d27","components/core/StatusPill.jsx":"396ca6ab389a","components/data/DataTable.jsx":"3b9151581bb5","components/data/EmptyState.jsx":"c12b2ed03d53","components/data/ErrorState.jsx":"fac79d09499f","components/data/LivenessClass.jsx":"d9b9fe3dbe35","components/data/Skeleton.jsx":"7017b194b695","components/identity/FenceState.jsx":"39229c90fbb0","components/identity/PrincipalRef.jsx":"31cedabf8854","components/identity/TicketRef.jsx":"429ace4274cf","components/identity/TierBadge.jsx":"e514344c82e1","components/safety/ConfirmFriction.jsx":"4c9a9bd2eca2","components/safety/DangerAction.jsx":"cc98094eef2f","components/safety/FreshnessStamp.jsx":"05353e302c56","components/safety/HaltBand.jsx":"0b90ae7060f7","components/safety/HonestState.jsx":"79bd029be875","components/safety/PrintedAbsence.jsx":"50497de4ee65","components/safety/ReviewChip.jsx":"e0953eb2edf6","components/safety/StopActuator.jsx":"44b0095372a1","components/shell/AppHeader.jsx":"7db50a7f9388","components/shell/NavRail.jsx":"aeca7465d164","components/shell/SuiteSwitcher.jsx":"4bc1ae56965a","ui_kits/agent-runtime/ar-app.jsx":"76d48aee2d46","ui_kits/auth/app.jsx":"3e9d7b51306c","ui_kits/board/app.jsx":"d10849c4d320","ui_kits/board/bd-data.jsx":"20ab2db8ecb4","ui_kits/board/bd-parts.jsx":"d8b8fab49d0b","ui_kits/board/bd-screens.jsx":"35cebec306c6","ui_kits/chat/app.jsx":"f02ff30b0c18","ui_kits/chat/ch-data.jsx":"6a70d9671cb7","ui_kits/chat/ch-parts.jsx":"2474273d13be","ui_kits/chat/ch-screens.jsx":"99b1c0f6a0cc","ui_kits/cmdb/app.jsx":"352052127ea2","ui_kits/cmdb/cm-data.jsx":"9224e6e5c8fc","ui_kits/cmdb/cm-parts.jsx":"bf5829b6a9ce","ui_kits/cmdb/cm-screens.jsx":"1a10617db2f4","ui_kits/drive/app.jsx":"e4da3b42d999","ui_kits/drive/dr-data.jsx":"3ead51b37c63","ui_kits/drive/dr-parts.jsx":"27c97f140832","ui_kits/drive/dr-screens.jsx":"7e71467a7f2c","ui_kits/gateway/app.jsx":"59979b57908f","ui_kits/gateway/gw-data.jsx":"afdc335d77dd","ui_kits/gateway/gw-parts.jsx":"224f014b95a9","ui_kits/gateway/gw-screens.jsx":"faeaef3a5e0a","ui_kits/library/app.jsx":"df553478ef66","ui_kits/library/lib-data.jsx":"0355ad81768a","ui_kits/library/lib-parts.jsx":"422d6fc76351","ui_kits/library/lib-screens.jsx":"8ba0b6c0d427","ui_kits/mission-control/app.jsx":"1b0ac8616863","ui_kits/mission-control/mc-data.jsx":"679a9ca2636b","ui_kits/mission-control/mc-parts.jsx":"2674fecacb07","ui_kits/mission-control/mc-screens.jsx":"c9bc142deb3d","ui_kits/notes/app.jsx":"769a58a8a358","ui_kits/notes/nt-data.jsx":"4adfd397cc7b","ui_kits/notes/nt-parts.jsx":"1b8c669ab6ea","ui_kits/notes/nt-screens.jsx":"9a849f73c91a","ui_kits/vault/app.jsx":"a7e2f0d8822f","ui_kits/vault/vt-data.jsx":"25afa4665415","ui_kits/vault/vt-parts.jsx":"d79fe0c8b374","ui_kits/vault/vt-screens.jsx":"82ca9f21738b"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.HelmDesignSystem_f4cb26 = window.HelmDesignSystem_f4cb26 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — Button
   The safe primary action is CYAN (interactive), never green. The danger tone
   is RED and is only ever the trigger for a confirm ceremony (see DangerAction).
   Panels are flat: buttons lighten/darken on interaction, they never lift. */

const CSS = `
.helm-btn {
  --_h: var(--control-default);
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2);
  height: var(--_h); padding: 0 14px;
  font-family: var(--font-ui); font-size: 13px; font-weight: 500;
  line-height: 1; white-space: nowrap; user-select: none;
  border: 1px solid transparent; border-radius: var(--radius-control);
  cursor: pointer; color: var(--text-primary); background: transparent;
  transition: background var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard),
              color var(--dur-fast) var(--ease-standard);
}
.helm-btn:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-btn[disabled] { cursor: not-allowed; opacity: 0.45; }
.helm-btn__icon { font-size: 15px; line-height: 1; display: inline-flex; }

.helm-btn--compact { --_h: var(--control-compact); font-size: 13px; padding: 0 10px; }
.helm-btn--large   { --_h: var(--control-primary); font-size: 14px; padding: 0 18px; }

/* primary = the safe action (cyan) */
.helm-btn--primary { background: var(--interactive); color: var(--text-on-accent); font-weight: 600; }
.helm-btn--primary:hover:not([disabled]) { background: var(--interactive-hover); }
.helm-btn--primary:active:not([disabled]) { background: var(--interactive-press); }

/* secondary = neutral machined control */
.helm-btn--secondary { background: var(--bg-control); color: var(--text-primary); border-color: var(--border-strong); }
.helm-btn--secondary:hover:not([disabled]) { background: #2E3743; border-color: #55636F; }
.helm-btn--secondary:active:not([disabled]) { background: var(--surface-inset); }

/* ghost = quiet, text-first */
.helm-btn--ghost { background: transparent; color: var(--text-secondary); }
.helm-btn--ghost:hover:not([disabled]) { background: var(--bg-control); color: var(--text-primary); }
.helm-btn--ghost:active:not([disabled]) { background: var(--surface-inset); }

/* danger = the operator's destructive finger (always behind a ceremony) */
.helm-btn--danger { background: var(--danger); color: #2C1210; font-weight: 600; }
.helm-btn--danger:hover:not([disabled]) { background: var(--danger-red-hover); }
.helm-btn--danger:active:not([disabled]) { background: var(--danger-red-press); }

/* danger-outline = destructive trigger that must stay quiet until hovered */
.helm-btn--danger-outline { background: transparent; color: var(--danger-text); border-color: #5A2420; }
.helm-btn--danger-outline:hover:not([disabled]) { background: var(--danger-bg); border-color: var(--danger); }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-button-css')) {
  const s = document.createElement('style');
  s.id = 'helm-button-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Button({
  children,
  tone = 'secondary',
  size = 'default',
  icon = null,
  disabled = false,
  type = 'button',
  className = '',
  ...rest
}) {
  const cls = ['helm-btn', `helm-btn--${tone}`, size !== 'default' ? `helm-btn--${size}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    className: cls,
    disabled: disabled
  }, rest), icon ? /*#__PURE__*/React.createElement("span", {
    className: "helm-btn__icon",
    "aria-hidden": "true"
  }, icon) : null, children ? /*#__PURE__*/React.createElement("span", {
    className: "helm-btn__label"
  }, children) : null);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/IconButton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function IconButton({
  icon,
  label,
  size = 'default',
  variant = 'ghost',
  pressed,
  disabled = false,
  className = '',
  ...rest
}) {
  const cls = ['helm-iconbtn', size !== 'default' ? `helm-iconbtn--${size}` : '', variant !== 'ghost' ? `helm-iconbtn--${variant}` : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    disabled: disabled,
    "aria-label": label,
    title: label,
    "aria-pressed": typeof pressed === 'boolean' ? pressed : undefined
  }, rest), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, icon));
}
Object.assign(__ds_scope, { IconButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/IconButton.jsx", error: String((e && e.message) || e) }); }

// components/core/Input.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — Input
   14/20 control text, 32px default height, cyan focus ring. A `mono` variant
   sets JetBrains Mono for identifier/token entry. Focus is always visible. */

const CSS = `
.helm-field { display: inline-flex; flex-direction: column; gap: 6px; }
.helm-field__label {
  font-family: var(--font-ui); font-size: 12px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted);
}
.helm-input {
  display: inline-flex; align-items: center; gap: var(--space-2);
  height: var(--control-default); padding: 0 10px;
  background: var(--surface-inset); color: var(--text-primary);
  border: 1px solid var(--border-strong); border-radius: var(--radius-control);
  transition: border-color var(--dur-fast) var(--ease-standard),
              box-shadow var(--dur-fast) var(--ease-standard);
}
.helm-input:hover:not(.is-disabled) { border-color: #55636F; }
.helm-input.is-focused { border-color: var(--border-focus); box-shadow: var(--ring-focus-tight); }
.helm-input.is-disabled { opacity: 0.5; }
.helm-input.is-invalid { border-color: var(--danger); }
.helm-input.is-invalid.is-focused { box-shadow: 0 0 0 2px var(--danger); }
.helm-input--large { height: var(--control-primary); }
.helm-input__icon { font-size: 15px; color: var(--text-muted); display: inline-flex; flex: none; }
.helm-input__control {
  flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  color: inherit; font-family: var(--font-ui); font-size: 14px; line-height: 20px;
}
.helm-input__control::placeholder { color: var(--text-disabled); }
.helm-input--mono .helm-input__control {
  font-family: var(--font-mono); font-feature-settings: var(--figures-tabular); font-size: 13px;
}
.helm-field__hint { font-family: var(--font-ui); font-size: 11px; line-height: 15px; color: var(--text-muted); }
.helm-field__hint.is-invalid { color: var(--danger-text); }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-input-css')) {
  const s = document.createElement('style');
  s.id = 'helm-input-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Input({
  label,
  icon = null,
  mono = false,
  size = 'default',
  invalid = false,
  disabled = false,
  hint = null,
  id,
  className = '',
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const autoId = React.useId ? React.useId() : undefined;
  const fieldId = id || autoId;
  const shellCls = ['helm-input', mono ? 'helm-input--mono' : '', size === 'large' ? 'helm-input--large' : '', focused ? 'is-focused' : '', invalid ? 'is-invalid' : '', disabled ? 'is-disabled' : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("label", {
    className: ['helm-field', className].filter(Boolean).join(' '),
    htmlFor: fieldId,
    style: style
  }, label ? /*#__PURE__*/React.createElement("span", {
    className: "helm-field__label"
  }, label) : null, /*#__PURE__*/React.createElement("span", {
    className: shellCls
  }, icon ? /*#__PURE__*/React.createElement("span", {
    className: "helm-input__icon",
    "aria-hidden": "true"
  }, icon) : null, /*#__PURE__*/React.createElement("input", _extends({
    id: fieldId,
    className: "helm-input__control",
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    onFocus: e => {
      setFocused(true);
      rest.onFocus && rest.onFocus(e);
    },
    onBlur: e => {
      setFocused(false);
      rest.onBlur && rest.onBlur(e);
    }
  }, rest))), hint ? /*#__PURE__*/React.createElement("span", {
    className: ['helm-field__hint', invalid ? 'is-invalid' : ''].filter(Boolean).join(' ')
  }, hint) : null);
}
Object.assign(__ds_scope, { Input });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Input.jsx", error: String((e && e.message) || e) }); }

// components/core/StatusPill.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — StatusPill
   The base status token: a full-round pill carrying a glyph + a text label.
   Color is NEVER the only signal — the glyph and label always ride along.
   Tone maps to the rationed state palette; `striped` is the UNTRUSTED taint. */

const CSS = `
.helm-pill {
  display: inline-flex; align-items: center; gap: 5px;
  height: 20px; padding: 0 8px; border-radius: var(--radius-pill);
  font-family: var(--font-ui); font-size: 11px; font-weight: 600;
  letter-spacing: 0.03em; text-transform: uppercase; white-space: nowrap;
  border: 1px solid transparent; vertical-align: middle;
}
.helm-pill__glyph { font-size: 12px; line-height: 1; }
.helm-pill--sm { height: 17px; font-size: 10px; padding: 0 6px; }
.helm-pill--neutral    { background: var(--bg-control); color: var(--text-secondary); border-color: var(--border-strong); }
.helm-pill--interactive{ background: var(--signal-cyan-wash); color: var(--signal-cyan-ink); border-color: #14424F; }
.helm-pill--halt       { background: var(--halt-gold-wash); color: var(--halt-gold-ink); border-color: var(--halt-gold-edge); }
.helm-pill--danger     { background: var(--danger-bg); color: var(--danger-text); border-color: #5A2420; }
.helm-pill--verified   { background: var(--state-green-wash); color: var(--state-green-ink); border-color: #1E5140; }
.helm-pill--attention  { background: var(--state-amber-wash); color: var(--state-amber-ink); border-color: #5A4A1E; }
.helm-pill--draining   { background: var(--state-violet-wash); color: var(--state-violet-ink); border-color: #3E3363; }
.helm-pill--striped {
  color: var(--state-amber-ink); border-color: #5A4A1E;
  background-color: var(--state-amber-wash);
  background-image: repeating-linear-gradient(-45deg,
    rgba(232,184,75,0.16) 0, rgba(232,184,75,0.16) 4px,
    transparent 4px, transparent 8px);
}
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-statuspill-css')) {
  const s = document.createElement('style');
  s.id = 'helm-statuspill-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function StatusPill({
  tone = 'neutral',
  glyph = null,
  striped = false,
  size = 'default',
  children,
  className = '',
  ...rest
}) {
  const cls = ['helm-pill', `helm-pill--${tone}`, striped ? 'helm-pill--striped' : '', size === 'sm' ? 'helm-pill--sm' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), glyph ? /*#__PURE__*/React.createElement("span", {
    className: "helm-pill__glyph",
    "aria-hidden": "true"
  }, glyph) : null, /*#__PURE__*/React.createElement("span", null, children));
}
Object.assign(__ds_scope, { StatusPill });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/StatusPill.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — DataTable
   The truth-surface of the whole suite. Dense rows, subtle zebra striping, a
   sticky sortable header, right-aligned tabular numbers, and a clear focused-row
   state (a cyan left-edge). Put a TicketRef / PrincipalRef in a cell for the
   mono ID column. Reflows to stacked cards on narrow screens. */

const CSS = `
.helm-table-wrap { width: 100%; overflow: auto; border: 1px solid var(--border-default); border-radius: var(--radius-panel); }
.helm-table { width: 100%; border-collapse: separate; border-spacing: 0; font-family: var(--font-ui); }
.helm-table thead th {
  position: sticky; top: 0; z-index: 1;
  background: var(--surface-raised); color: var(--text-muted);
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
  text-align: left; padding: 9px 12px; white-space: nowrap;
  border-bottom: 1px solid var(--border-strong); user-select: none;
}
.helm-table thead th.is-num { text-align: right; }
.helm-table thead th.is-sortable { cursor: pointer; }
.helm-table thead th.is-sortable:hover { color: var(--text-secondary); }
.helm-table__sort { margin-left: 5px; font-size: 10px; opacity: 0.5; }
.helm-table thead th.is-sorted .helm-table__sort { opacity: 1; color: var(--signal-cyan); }
.helm-table tbody td {
  padding: 9px 12px; font-size: 13px; color: var(--text-secondary);
  border-bottom: 1px solid var(--border-default); vertical-align: middle; white-space: nowrap;
  transition: background var(--dur-fast) var(--ease-standard);
}
.helm-table tbody tr:nth-child(even) td { background: rgba(30,36,46,0.4); }
.helm-table tbody tr:hover td { background: var(--surface-inset); }
.helm-table td.is-num { text-align: right; font-family: var(--font-mono); font-feature-settings: var(--figures-tabular); color: var(--text-primary); }
.helm-table td.is-mono { font-family: var(--font-mono); font-feature-settings: var(--figures-tabular); }
.helm-table tbody tr.is-focused td { background: var(--signal-cyan-wash); }
.helm-table tbody tr.is-focused td:first-child { box-shadow: inset 3px 0 0 var(--signal-cyan); }
.helm-table tbody tr.is-clickable { cursor: pointer; }
.helm-table tbody tr:focus-visible { outline: none; }
.helm-table tbody tr:focus-visible td { background: var(--signal-cyan-wash); }
.helm-table tbody tr:focus-visible td:first-child { box-shadow: inset 3px 0 0 var(--signal-cyan); }
.helm-table--dense td { padding: 6px 12px; }
.helm-table--dense thead th { padding: 6px 12px; }
.helm-table__empty td { text-align: center; color: var(--text-muted); padding: var(--space-8); }
@media (max-width: 620px) {
  .helm-table--reflow thead { display: none; }
  .helm-table--reflow, .helm-table--reflow tbody, .helm-table--reflow tr, .helm-table--reflow td { display: block; width: 100%; }
  .helm-table--reflow tr { border-bottom: 1px solid var(--border-strong); padding: 6px 0; }
  .helm-table--reflow td { border: 0; padding: 5px 12px; white-space: normal; text-align: left; }
  .helm-table--reflow td.is-num { text-align: left; }
  .helm-table--reflow td::before { content: attr(data-label); display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 2px; }
}
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-datatable-css')) {
  const s = document.createElement('style');
  s.id = 'helm-datatable-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function DataTable({
  columns = [],
  rows = [],
  rowKey = 'id',
  dense = false,
  reflow = true,
  focusedKey,
  onRowClick,
  sortKey: sortKeyProp,
  sortDir: sortDirProp,
  onSort,
  emptyMessage = 'No rows.',
  className = '',
  ...rest
}) {
  const [internalSort, setInternalSort] = React.useState({
    key: null,
    dir: 'asc'
  });
  const controlled = typeof onSort === 'function';
  const sortKey = controlled ? sortKeyProp : internalSort.key;
  const sortDir = controlled ? sortDirProp : internalSort.dir;
  const handleSort = col => {
    if (!col.sortable) return;
    const nextDir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    if (controlled) onSort(col.key, nextDir);else setInternalSort({
      key: col.key,
      dir: nextDir
    });
  };
  let view = rows;
  if (!controlled && sortKey) {
    const col = columns.find(c => c.key === sortKey);
    view = [...rows].sort((a, b) => {
      const av = col && col.sortValue ? col.sortValue(a) : a[sortKey];
      const bv = col && col.sortValue ? col.sortValue(b) : b[sortKey];
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'asc' ? av - bv : bv - av;
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
    });
  }
  const tableCls = ['helm-table', dense ? 'helm-table--dense' : '', reflow ? 'helm-table--reflow' : ''].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['helm-table-wrap', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("table", {
    className: tableCls
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", null, columns.map(col => {
    const isNum = col.align === 'right' || col.num;
    const sorted = sortKey === col.key;
    const thCls = [isNum ? 'is-num' : '', col.sortable ? 'is-sortable' : '', sorted ? 'is-sorted' : ''].filter(Boolean).join(' ');
    return /*#__PURE__*/React.createElement("th", {
      key: col.key,
      className: thCls,
      style: col.width ? {
        width: col.width
      } : undefined,
      onClick: () => handleSort(col),
      "aria-sort": sorted ? sortDir === 'asc' ? 'ascending' : 'descending' : undefined
    }, col.header, col.sortable ? /*#__PURE__*/React.createElement("span", {
      className: "helm-table__sort",
      "aria-hidden": "true"
    }, sorted ? sortDir === 'asc' ? '▲' : '▼' : '↕') : null);
  }))), /*#__PURE__*/React.createElement("tbody", null, view.length === 0 ? /*#__PURE__*/React.createElement("tr", {
    className: "helm-table__empty"
  }, /*#__PURE__*/React.createElement("td", {
    colSpan: columns.length
  }, emptyMessage)) : view.map(row => {
    const key = row[rowKey];
    const focused = focusedKey != null && key === focusedKey;
    const clickable = typeof onRowClick === 'function';
    return /*#__PURE__*/React.createElement("tr", {
      key: key,
      className: [focused ? 'is-focused' : '', clickable ? 'is-clickable' : ''].filter(Boolean).join(' '),
      tabIndex: clickable ? 0 : undefined,
      onClick: clickable ? () => onRowClick(row) : undefined,
      onKeyDown: clickable ? e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRowClick(row);
        }
      } : undefined
    }, columns.map(col => {
      const isNum = col.align === 'right' || col.num;
      const cls = [isNum ? 'is-num' : '', col.mono ? 'is-mono' : ''].filter(Boolean).join(' ');
      const content = col.render ? col.render(row) : row[col.key];
      return /*#__PURE__*/React.createElement("td", {
        key: col.key,
        className: cls,
        "data-label": typeof col.header === 'string' ? col.header : col.key
      }, content);
    }));
  }))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/EmptyState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — EmptyState
   Empty = an INVITATION to act ("nothing here yet — here's the one thing that
   fills it"), never a shrug. A calm glyph, a plain title, one line of guidance,
   and a single primary action. */

const CSS = `
.helm-empty {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  gap: var(--space-3); padding: var(--space-12) var(--space-6);
  max-width: 420px; margin: 0 auto;
}
.helm-empty__glyph {
  width: 44px; height: 44px; border-radius: var(--radius-panel);
  display: inline-flex; align-items: center; justify-content: center; font-size: 20px;
  background: var(--surface-inset); border: 1px solid var(--border-default); color: var(--text-muted);
}
.helm-empty__title { font-family: var(--font-ui); font-size: 16px; font-weight: 600; color: var(--text-primary); }
.helm-empty__body { font-family: var(--font-ui); font-size: 13px; line-height: 20px; color: var(--text-muted); }
.helm-empty__action { margin-top: var(--space-2); }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-emptystate-css')) {
  const s = document.createElement('style');
  s.id = 'helm-emptystate-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function EmptyState({
  glyph = '◔',
  title,
  children,
  action,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['helm-empty', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "helm-empty__glyph",
    "aria-hidden": "true"
  }, glyph), title ? /*#__PURE__*/React.createElement("div", {
    className: "helm-empty__title"
  }, title) : null, children ? /*#__PURE__*/React.createElement("div", {
    className: "helm-empty__body"
  }, children) : null, action ? /*#__PURE__*/React.createElement("div", {
    className: "helm-empty__action"
  }, action) : null);
}
Object.assign(__ds_scope, { EmptyState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/EmptyState.jsx", error: String((e && e.message) || e) }); }

// components/data/ErrorState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — ErrorState (the sacred R/D split)
   Errors split into two, and the split is SACRED:
     Pattern R (red)  → "your action didn't apply, here's how to fix it"
                        (local, recoverable, the operator's problem).
     Pattern D (gold) → "a dependency is down, so the system safe-stopped"
                        (systemic, the safety system WORKING).
   NEVER render a dependency outage as a red error. */

const CSS = `
.helm-err {
  display: flex; gap: var(--space-3); padding: var(--space-4);
  border-radius: var(--radius-panel); border: 1px solid;
}
.helm-err--R { background: var(--danger-bg); border-color: #5A2420; }
.helm-err--D { background: var(--halt-gold-wash); border-color: var(--halt-gold-edge); }
.helm-err__glyph { font-size: 18px; line-height: 22px; flex: none; }
.helm-err--R .helm-err__glyph { color: var(--danger); }
.helm-err--D .helm-err__glyph { color: var(--halt-gold); }
.helm-err__body { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.helm-err__tag {
  align-self: flex-start; font-family: var(--font-mono); font-size: 10px; font-weight: 600;
  letter-spacing: 0.04em; text-transform: uppercase; padding: 1px 6px; border-radius: 3px;
}
.helm-err--R .helm-err__tag { background: var(--danger); color: #2C1210; }
.helm-err--D .helm-err__tag { background: var(--halt-gold); color: #2E1D0B; }
.helm-err__title { font-family: var(--font-ui); font-size: 14px; font-weight: 600; }
.helm-err--R .helm-err__title { color: var(--danger-text); }
.helm-err--D .helm-err__title { color: var(--halt-gold-ink); }
.helm-err__msg { font-family: var(--font-ui); font-size: 13px; line-height: 20px; }
.helm-err--R .helm-err__msg { color: var(--danger-text); }
.helm-err--D .helm-err__msg { color: var(--halt-gold-ink); opacity: 0.92; }
.helm-err__detail { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px; word-break: break-all; }
.helm-err--D .helm-err__detail { color: var(--halt-gold-ink); opacity: 0.7; }
.helm-err__action { margin-top: var(--space-2); }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-errorstate-css')) {
  const s = document.createElement('style');
  s.id = 'helm-errorstate-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function ErrorState({
  pattern = 'R',
  title,
  children,
  detail,
  action,
  className = '',
  ...rest
}) {
  const isD = pattern === 'D';
  const glyph = isD ? '⛊' : '✕';
  const tag = isD ? 'Pattern D · safe-stopped' : 'Pattern R · action failed';
  const defaultTitle = isD ? 'System safe-stopped' : "Your action didn't apply";
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['helm-err', `helm-err--${isD ? 'D' : 'R'}`, className].filter(Boolean).join(' '),
    role: "alert"
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "helm-err__glyph",
    "aria-hidden": "true"
  }, glyph), /*#__PURE__*/React.createElement("div", {
    className: "helm-err__body"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-err__tag"
  }, tag), /*#__PURE__*/React.createElement("span", {
    className: "helm-err__title"
  }, title || defaultTitle), /*#__PURE__*/React.createElement("span", {
    className: "helm-err__msg"
  }, children || (isD ? 'A dependency is down, so the system failed closed. This is the safety system working, not an outage.' : "Here's how to fix it and retry.")), detail ? /*#__PURE__*/React.createElement("span", {
    className: "helm-err__detail"
  }, detail) : null, action ? /*#__PURE__*/React.createElement("div", {
    className: "helm-err__action"
  }, action) : null));
}
Object.assign(__ds_scope, { ErrorState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/ErrorState.jsx", error: String((e && e.message) || e) }); }

// components/data/LivenessClass.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — LivenessClass
   A per-agent liveness class — COMPUTED, never a bare green dot. The class name
   is always shown as a label (with a small mark), so "alive" is a reasoned
   verdict, not a colored pixel. Failing/stuck/zombie agents are attention-amber
   (not red — red is the operator's destructive finger, not an agent's state). */

const CSS = `
.helm-live {
  display: inline-flex; align-items: center; gap: 6px;
  height: 20px; padding: 0 8px 0 7px; border-radius: var(--radius-pill);
  font-family: var(--font-ui); font-size: 11px; font-weight: 600; letter-spacing: 0.03em;
  text-transform: uppercase; white-space: nowrap; border: 1px solid;
}
.helm-live__mark { width: 7px; height: 7px; border-radius: 50%; flex: none; }
.helm-live__glyph { font-size: 11px; }
.helm-live__note { font-family: var(--font-mono); font-size: 10px; font-weight: 400; text-transform: none; letter-spacing: 0; opacity: 0.82; }
.helm-live--live { background: var(--state-green-wash); color: var(--state-green-ink); border-color: #1E5140; }
.helm-live--live .helm-live__mark { background: var(--state-green); box-shadow: 0 0 0 2px rgba(70,185,138,0.2); }
.helm-live--idle { background: var(--bg-control); color: var(--text-muted); border-color: var(--border-strong); }
.helm-live--idle .helm-live__mark { background: var(--text-disabled); }
.helm-live--lagging, .helm-live--stuck, .helm-live--over-depth, .helm-live--failing, .helm-live--zombie {
  background: var(--state-amber-wash); color: var(--state-amber-ink); border-color: #5A4A1E;
}
.helm-live--lagging .helm-live__mark, .helm-live--stuck .helm-live__mark,
.helm-live--over-depth .helm-live__mark, .helm-live--failing .helm-live__mark { background: var(--state-amber); }
.helm-live--zombie {
  border-color: #7A5A1E;
  background-image: repeating-linear-gradient(-45deg, rgba(232,184,75,0.16) 0, rgba(232,184,75,0.16) 4px, transparent 4px, transparent 8px);
}
.helm-live--down { background: var(--halt-gold-wash); color: var(--halt-gold-ink); border-color: var(--halt-gold-edge); }
.helm-live--down .helm-live__glyph { color: var(--halt-gold); }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-liveness-css')) {
  const s = document.createElement('style');
  s.id = 'helm-liveness-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const CLASSES = {
  live: {
    label: 'Live',
    glyph: null,
    mark: true
  },
  idle: {
    label: 'Idle',
    glyph: null,
    mark: true
  },
  lagging: {
    label: 'Lagging',
    glyph: null,
    mark: true
  },
  stuck: {
    label: 'Stuck',
    glyph: '◈',
    mark: false
  },
  'over-depth': {
    label: 'Over-depth',
    glyph: '⚑',
    mark: false
  },
  failing: {
    label: 'Failing',
    glyph: '⚠',
    mark: false
  },
  zombie: {
    label: 'Zombie',
    glyph: '⚠',
    mark: false
  },
  down: {
    label: 'Down',
    glyph: '⛊',
    mark: false
  }
};
function LivenessClass({
  state = 'live',
  label,
  note,
  className = '',
  ...rest
}) {
  const c = CLASSES[state] || CLASSES.live;
  const cls = ['helm-live', `helm-live--${state}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), c.mark ? /*#__PURE__*/React.createElement("span", {
    className: "helm-live__mark",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement("span", {
    className: "helm-live__glyph",
    "aria-hidden": "true"
  }, c.glyph), /*#__PURE__*/React.createElement("span", null, label || c.label), note ? /*#__PURE__*/React.createElement("span", {
    className: "helm-live__note"
  }, note) : null);
}
Object.assign(__ds_scope, { LivenessClass });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/LivenessClass.jsx", error: String((e && e.message) || e) }); }

// components/data/Skeleton.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — Skeleton
   Loading = static skeletons shaped like the TARGET layout (not a spinner).
   Quiet inset blocks; a very subtle pulse that reduced-motion removes. */

const CSS = `
.helm-skel { background: var(--surface-inset); border-radius: var(--radius-control); display: block; }
.helm-skel--pulse { animation: helm-skel-pulse 1.4s var(--ease-standard) infinite; }
@keyframes helm-skel-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }
@media (prefers-reduced-motion: reduce) { .helm-skel--pulse { animation: none; } }
.helm-skel-lines { display: flex; flex-direction: column; gap: 8px; }
.helm-skel-row {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px;
  border-bottom: 1px solid var(--border-default);
}
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-skeleton-css')) {
  const s = document.createElement('style');
  s.id = 'helm-skeleton-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function Skeleton({
  variant = 'block',
  width,
  height,
  lines = 3,
  rows = 4,
  pulse = true,
  className = '',
  style,
  ...rest
}) {
  const base = ['helm-skel', pulse ? 'helm-skel--pulse' : ''].filter(Boolean).join(' ');
  if (variant === 'text') {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: ['helm-skel-lines', className].filter(Boolean).join(' ')
    }, rest), Array.from({
      length: lines
    }).map((_, i) => /*#__PURE__*/React.createElement("span", {
      key: i,
      className: base,
      style: {
        height: 10,
        width: i === lines - 1 ? '62%' : '100%',
        borderRadius: 3
      }
    })));
  }
  if (variant === 'table') {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: className
    }, rest), Array.from({
      length: rows
    }).map((_, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      className: "helm-skel-row"
    }, /*#__PURE__*/React.createElement("span", {
      className: base,
      style: {
        height: 12,
        width: 90,
        borderRadius: 3
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: base,
      style: {
        height: 12,
        flex: 1,
        borderRadius: 3
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: base,
      style: {
        height: 12,
        width: 60,
        borderRadius: 3
      }
    }), /*#__PURE__*/React.createElement("span", {
      className: base,
      style: {
        height: 12,
        width: 44,
        borderRadius: 3
      }
    }))));
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    className: [base, className].filter(Boolean).join(' '),
    style: {
      width: width || '100%',
      height: height || 40,
      ...style
    }
  }, rest));
}
Object.assign(__ds_scope, { Skeleton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Skeleton.jsx", error: String((e && e.message) || e) }); }

// components/identity/FenceState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
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
function FenceState({
  gen,
  lease,
  heartbeat,
  state = 'held',
  supersededBy,
  advisory = false,
  className = '',
  ...rest
}) {
  const cls = ['helm-fence', state === 'aging' ? 'is-aging' : '', state === 'superseded' ? 'is-superseded' : '', advisory ? 'is-advisory' : '', className].filter(Boolean).join(' ');
  if (state === 'superseded') {
    return /*#__PURE__*/React.createElement("span", _extends({
      className: cls
    }, rest), /*#__PURE__*/React.createElement("span", {
      className: "helm-fence__lock",
      "aria-hidden": "true"
    }, "\u26A0"), /*#__PURE__*/React.createElement("span", {
      className: "helm-fence__super"
    }, "gen ", gen, " SUPERSEDED", supersededBy != null ? ` by gen ${supersededBy}` : ''), advisory ? /*#__PURE__*/React.createElement("span", {
      className: "helm-fence__advisory"
    }, "advisory") : null);
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "helm-fence__seg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-fence__lock",
    "aria-hidden": "true"
  }, "\uD83D\uDD12"), /*#__PURE__*/React.createElement("span", null, "gen ", gen)), lease != null ? /*#__PURE__*/React.createElement("span", {
    className: "helm-fence__seg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-fence__dim"
  }, "lease"), " ", lease) : null, heartbeat != null ? /*#__PURE__*/React.createElement("span", {
    className: "helm-fence__seg"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-fence__heart",
    "aria-hidden": "true"
  }, "\u2665"), " ", heartbeat) : null, advisory ? /*#__PURE__*/React.createElement("span", {
    className: "helm-fence__advisory"
  }, "advisory") : null);
}
Object.assign(__ds_scope, { FenceState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/FenceState.jsx", error: String((e && e.message) || e) }); }

// components/identity/PrincipalRef.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — PrincipalRef
   Any "who did this" — always the real identity resolved from the auth
   platform, never a bare display name. A mono chip with a KIND glyph:
   ⬡ agent · ◐ operator · ⚙ service. Click → the principal's drill-in where
   one exists. A revoked/disabled principal carries its own status pill. */

const CSS = `
.helm-principal { display: inline-flex; align-items: center; gap: 6px; max-width: 100%; }
.helm-principal__chip {
  display: inline-flex; align-items: center; gap: 5px;
  height: 20px; padding: 0 7px;
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  font-family: var(--font-mono); font-size: 12px; line-height: 1;
  color: var(--text-primary); white-space: nowrap; text-decoration: none;
  cursor: default; user-select: none;
  transition: background var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard);
}
a.helm-principal__chip { cursor: pointer; }
a.helm-principal__chip:hover { background: #232B36; border-color: var(--border-strong); text-decoration: none; }
.helm-principal__chip:focus-visible { outline: none; box-shadow: var(--ring-focus-tight); }
.helm-principal__glyph { font-family: var(--font-ui); font-size: 12px; color: var(--text-muted); }
.helm-principal__glyph--agent { color: var(--signal-cyan); }
.helm-principal__glyph--operator { color: var(--text-secondary); }
.helm-principal__glyph--service { color: var(--text-muted); }
.helm-principal__id { overflow: hidden; text-overflow: ellipsis; }
.helm-principal__chip.is-void { opacity: 0.72; text-decoration: line-through; text-decoration-color: var(--border-strong); }
.helm-principal__pill {
  display: inline-flex; align-items: center; gap: 4px;
  height: 17px; padding: 0 6px; border-radius: var(--radius-pill);
  font-family: var(--font-ui); font-size: 10px; font-weight: 600;
  letter-spacing: 0.03em; text-transform: uppercase; white-space: nowrap;
  border: 1px solid;
}
.helm-principal__pill--revoked { background: var(--danger-bg); color: var(--danger-text); border-color: #5A2420; }
.helm-principal__pill--disabled { background: var(--bg-control); color: var(--text-muted); border-color: var(--border-strong); }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-principalref-css')) {
  const s = document.createElement('style');
  s.id = 'helm-principalref-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const KIND_GLYPH = {
  agent: '⬡',
  operator: '◐',
  service: '⚙'
};
function PrincipalRef({
  id,
  kind = 'agent',
  href,
  status = 'active',
  className = '',
  ...rest
}) {
  const glyph = KIND_GLYPH[kind] || '⬡';
  const voided = status === 'revoked' || status === 'disabled';
  const chipCls = ['helm-principal__chip', voided ? 'is-void' : ''].filter(Boolean).join(' ');
  const inner = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: `helm-principal__glyph helm-principal__glyph--${kind}`,
    "aria-hidden": "true"
  }, glyph), /*#__PURE__*/React.createElement("span", {
    className: "helm-principal__id",
    title: id
  }, id));
  return /*#__PURE__*/React.createElement("span", _extends({
    className: ['helm-principal', className].filter(Boolean).join(' ')
  }, rest), href ? /*#__PURE__*/React.createElement("a", {
    className: chipCls,
    href: href
  }, inner) : /*#__PURE__*/React.createElement("span", {
    className: chipCls
  }, inner), status === 'revoked' ? /*#__PURE__*/React.createElement("span", {
    className: "helm-principal__pill helm-principal__pill--revoked"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u26D2"), "Revoked") : null, status === 'disabled' ? /*#__PURE__*/React.createElement("span", {
    className: "helm-principal__pill helm-principal__pill--disabled"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u25FC"), "Disabled") : null);
}
Object.assign(__ds_scope, { PrincipalRef });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/PrincipalRef.jsx", error: String((e && e.message) || e) }); }

// components/identity/TicketRef.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — TicketRef
   Any work item (ticket, run, release, review item). A mono chip like
   [ T-000123 ] on a slightly-inset surface: copy-on-click, middle-truncated,
   never wrapped. When it names a queue item it's a DEEP-LINK into Mission
   Control's review queue. The ID is OPAQUE — never styled to imply meaning;
   provenance rides beside it (a TierBadge), never by recoloring the chip. */

const CSS = `
.helm-ticket {
  display: inline-flex; align-items: center; gap: 5px;
  max-width: 100%; height: 20px; padding: 0 7px;
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  font-family: var(--font-mono); font-size: 12px; line-height: 1;
  font-feature-settings: var(--figures-tabular);
  color: var(--text-primary); white-space: nowrap; cursor: pointer;
  text-decoration: none; user-select: none;
  transition: background var(--dur-fast) var(--ease-standard),
              border-color var(--dur-fast) var(--ease-standard);
}
.helm-ticket:hover { background: #232B36; border-color: var(--border-strong); text-decoration: none; }
.helm-ticket:focus-visible { outline: none; box-shadow: var(--ring-focus-tight); }
.helm-ticket__bracket { color: var(--text-disabled); }
.helm-ticket__id { overflow: hidden; text-overflow: ellipsis; }
.helm-ticket__link { color: var(--signal-cyan); font-size: 11px; margin-left: 1px; }
.helm-ticket__copied { color: var(--state-green); font-size: 11px; font-family: var(--font-ui); font-weight: 600; }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-ticketref-css')) {
  const s = document.createElement('style');
  s.id = 'helm-ticketref-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function middleTruncate(str, head = 10, tail = 6) {
  if (!str || str.length <= head + tail + 1) return str;
  return str.slice(0, head) + '…' + str.slice(-tail);
}
function TicketRef({
  id,
  href,
  deepLink = false,
  truncate = false,
  onCopy,
  className = '',
  ...rest
}) {
  const [copied, setCopied] = React.useState(false);
  const shown = truncate ? middleTruncate(id) : id;
  const copy = e => {
    if (href) return; // links navigate; copy is for the non-link chip
    e.preventDefault();
    e.stopPropagation(); // don't also trigger a clickable row this chip sits in
    try {
      navigator.clipboard && navigator.clipboard.writeText(id);
    } catch (_) {/* clipboard blocked — no-op */}
    setCopied(true);
    onCopy && onCopy(id);
    setTimeout(() => setCopied(false), 1100);
  };
  const inner = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "helm-ticket__bracket"
  }, "["), /*#__PURE__*/React.createElement("span", {
    className: "helm-ticket__id",
    title: id
  }, shown), /*#__PURE__*/React.createElement("span", {
    className: "helm-ticket__bracket"
  }, "]"), copied ? /*#__PURE__*/React.createElement("span", {
    className: "helm-ticket__copied",
    "aria-live": "polite"
  }, "copied \u2714") : href || deepLink ? /*#__PURE__*/React.createElement("span", {
    className: "helm-ticket__link",
    "aria-hidden": "true"
  }, "\u2197") : null);
  const cls = ['helm-ticket', className].filter(Boolean).join(' ');
  if (href) {
    return /*#__PURE__*/React.createElement("a", _extends({
      className: cls,
      href: href
    }, rest), inner);
  }
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    onClick: copy,
    title: `Copy ${id}`
  }, rest), inner);
}
Object.assign(__ds_scope, { TicketRef });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/TicketRef.jsx", error: String((e && e.message) || e) }); }

// components/identity/TierBadge.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — TierBadge
   The ONE badge for every trust signal. Shape/color = the family, text = the
   exact tier, glyph = how independent the label is:
     ✔ verified      (an external verifier confirmed it) — green
     ⧉ corroborated  (cross-referenced) — cyan
     ◑ single-source (agent-asserted, treat with suspicion) — amber
     ⚠ UNTRUSTED     (host-originated / external — adversarial input) — striped amber
   Rules: taint is display-only (never editable in UI); heuristic labels are
   marked `~ heuristic` and never dressed up as verified; trust tiers NEVER
   borrow the halt-gold (gold is stops only). */

const CSS = `
.helm-tier {
  display: inline-flex; align-items: center; gap: 5px;
  height: 20px; padding: 0 8px; border-radius: var(--radius-pill);
  font-family: var(--font-ui); font-size: 11px; font-weight: 600;
  letter-spacing: 0.02em; white-space: nowrap; border: 1px solid transparent;
  vertical-align: middle;
}
.helm-tier__glyph { font-size: 12px; line-height: 1; }
.helm-tier__heur { font-family: var(--font-mono); font-size: 10px; font-weight: 400; opacity: 0.8; }
.helm-tier--verified     { background: var(--state-green-wash); color: var(--state-green-ink); border-color: #1E5140; }
.helm-tier--corroborated { background: var(--signal-cyan-wash); color: var(--signal-cyan-ink); border-color: #14424F; }
.helm-tier--single       { background: var(--state-amber-wash); color: var(--state-amber-ink); border-color: #5A4A1E; }
.helm-tier--untrusted {
  color: var(--state-amber-ink); border-color: #7A5A1E; font-weight: 700;
  background-color: var(--state-amber-wash);
  background-image: repeating-linear-gradient(-45deg,
    rgba(232,184,75,0.18) 0, rgba(232,184,75,0.18) 4px,
    transparent 4px, transparent 8px);
}
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-tierbadge-css')) {
  const s = document.createElement('style');
  s.id = 'helm-tierbadge-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const TIERS = {
  verified: {
    glyph: '✔',
    label: 'Verified'
  },
  corroborated: {
    glyph: '⧉',
    label: 'Corroborated'
  },
  single: {
    glyph: '◑',
    label: 'Single-source'
  },
  untrusted: {
    glyph: '⚠',
    label: 'Untrusted'
  }
};
function TierBadge({
  tier = 'single',
  label,
  heuristic = false,
  className = '',
  ...rest
}) {
  const t = TIERS[tier] || TIERS.single;
  const cls = ['helm-tier', `helm-tier--${tier}`, className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "helm-tier__glyph",
    "aria-hidden": "true"
  }, t.glyph), /*#__PURE__*/React.createElement("span", null, label || t.label), heuristic && tier !== 'verified' ? /*#__PURE__*/React.createElement("span", {
    className: "helm-tier__heur"
  }, "~ heuristic") : null);
}
Object.assign(__ds_scope, { TierBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/identity/TierBadge.jsx", error: String((e && e.message) || e) }); }

// components/safety/FreshnessStamp.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — FreshnessStamp
   Every live figure carries an age stamp. Live is subtle; STALE is amber ▲
   with the safe reading spelled out — it NEVER fakes a green "OK". A stalled
   SAFETY signal degrades to the gold safe-stop (pass tone="halt"). */

const CSS = `
.helm-fresh {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: var(--font-mono); font-size: 11px; line-height: 15px;
  font-feature-settings: var(--figures-tabular); white-space: nowrap;
}
.helm-fresh--live { color: var(--text-muted); }
.helm-fresh--stale { color: var(--state-amber-ink); }
.helm-fresh--halt { color: var(--halt-gold-ink); }
.helm-fresh__glyph { font-size: 11px; }
.helm-fresh--live .helm-fresh__dot {
  width: 6px; height: 6px; border-radius: 50%; background: var(--state-green);
  display: inline-block; box-shadow: 0 0 0 2px rgba(70,185,138,0.18);
}
.helm-fresh__reading { font-family: var(--font-ui); font-weight: 600; letter-spacing: 0.02em; }
.helm-fresh__age { opacity: 0.9; }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-freshness-css')) {
  const s = document.createElement('style');
  s.id = 'helm-freshness-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function FreshnessStamp({
  age,
  state = 'live',
  reading,
  className = '',
  ...rest
}) {
  const cls = ['helm-fresh', `helm-fresh--${state}`, className].filter(Boolean).join(' ');
  if (state === 'stale' || state === 'halt') {
    return /*#__PURE__*/React.createElement("span", _extends({
      className: cls
    }, rest), /*#__PURE__*/React.createElement("span", {
      className: "helm-fresh__glyph",
      "aria-hidden": "true"
    }, state === 'halt' ? '▮▮' : '▲'), /*#__PURE__*/React.createElement("span", {
      className: "helm-fresh__reading"
    }, reading || (state === 'halt' ? 'SAFE-STOPPED' : 'STALE')), age != null ? /*#__PURE__*/React.createElement("span", {
      className: "helm-fresh__age"
    }, "\xB7 last good ", age) : null);
  }
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "helm-fresh__dot",
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "helm-fresh__age"
  }, age != null ? `${age}` : 'live'));
}
Object.assign(__ds_scope, { FreshnessStamp });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/safety/FreshnessStamp.jsx", error: String((e && e.message) || e) }); }

// components/safety/HonestState.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — HonestState (the honest-stop triad)
   After any stop or revoke, the TRUE aftermath is three counts, ALL THREE
   always visible even at zero:
     ✔ confirmed   (acknowledged)                              — green
     ◐ pending     (may still act ~2 min on an issued token)   — amber + countdown
     ⇉ draining    (past its last reversible instant, finishing) — violet + host/ticket
   Copy discipline is ABSOLUTE: never say "all stopped" while pending or
   draining is above zero. This is how the system refuses to lie about a stop. */

const CSS = `
.helm-honest { display: inline-flex; flex-direction: column; gap: 8px; }
.helm-honest__counts { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.helm-honest--stack .helm-honest__counts { flex-direction: column; }
.helm-honest__seg {
  display: inline-flex; align-items: center; gap: 7px;
  height: 26px; padding: 0 10px; border-radius: var(--radius-control);
  border: 1px solid; background: var(--surface-inset);
  font-family: var(--font-ui); font-size: 12px; white-space: nowrap;
}
.helm-honest__glyph { font-size: 13px; line-height: 1; }
.helm-honest__n { font-family: var(--font-mono); font-size: 14px; font-weight: 600; font-feature-settings: var(--figures-tabular); }
.helm-honest__lbl { color: var(--text-secondary); text-transform: uppercase; font-size: 10px; letter-spacing: 0.04em; }
.helm-honest__seg--confirmed { border-color: #1E5140; }
.helm-honest__seg--confirmed .helm-honest__glyph, .helm-honest__seg--confirmed .helm-honest__n { color: var(--state-green); }
.helm-honest__seg--pending { border-color: #5A4A1E; }
.helm-honest__seg--pending .helm-honest__glyph, .helm-honest__seg--pending .helm-honest__n { color: var(--state-amber); }
.helm-honest__seg--draining { border-color: #3E3363; }
.helm-honest__seg--draining .helm-honest__glyph, .helm-honest__seg--draining .helm-honest__n { color: var(--state-violet); }
.helm-honest__seg.is-zero { opacity: 0.55; }
.helm-honest__count-note { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); }
.helm-honest__summary {
  font-family: var(--font-ui); font-size: 12px; line-height: 17px; font-weight: 600;
}
.helm-honest__summary--settled { color: var(--state-green-ink); }
.helm-honest__summary--settling { color: var(--halt-gold-ink); }
.helm-honest__detail { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 2px; }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-honeststate-css')) {
  const s = document.createElement('style');
  s.id = 'helm-honeststate-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function HonestState({
  confirmed = 0,
  pending = 0,
  draining = 0,
  pendingCountdown,
  drainingDetail,
  layout = 'row',
  summary = true,
  className = '',
  ...rest
}) {
  const settled = pending === 0 && draining === 0;
  const inFlight = pending + draining;
  const cls = ['helm-honest', layout === 'stack' ? 'helm-honest--stack' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "helm-honest__counts"
  }, /*#__PURE__*/React.createElement("span", {
    className: `helm-honest__seg helm-honest__seg--confirmed${confirmed === 0 ? ' is-zero' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__glyph",
    "aria-hidden": "true"
  }, "\u2714"), /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__n"
  }, confirmed), /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__lbl"
  }, "confirmed")), /*#__PURE__*/React.createElement("span", {
    className: `helm-honest__seg helm-honest__seg--pending${pending === 0 ? ' is-zero' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__glyph",
    "aria-hidden": "true"
  }, "\u25D0"), /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__n"
  }, pending), /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__lbl"
  }, "pending"), pending > 0 && pendingCountdown ? /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__count-note"
  }, pendingCountdown) : null), /*#__PURE__*/React.createElement("span", {
    className: `helm-honest__seg helm-honest__seg--draining${draining === 0 ? ' is-zero' : ''}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__glyph",
    "aria-hidden": "true"
  }, "\u21C9"), /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__n"
  }, draining), /*#__PURE__*/React.createElement("span", {
    className: "helm-honest__lbl"
  }, "draining"))), draining > 0 && drainingDetail ? /*#__PURE__*/React.createElement("div", {
    className: "helm-honest__detail"
  }, "draining: ", drainingDetail) : null, summary ? settled ? /*#__PURE__*/React.createElement("div", {
    className: "helm-honest__summary helm-honest__summary--settled"
  }, "\u2714 All stopped \u2014 nothing pending or draining.") : /*#__PURE__*/React.createElement("div", {
    className: "helm-honest__summary helm-honest__summary--settling"
  }, "Not fully stopped \u2014 ", inFlight, " action", inFlight === 1 ? '' : 's', " may still be settling.") : null);
}
Object.assign(__ds_scope, { HonestState });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/safety/HonestState.jsx", error: String((e && e.message) || e) }); }

// components/safety/ConfirmFriction.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — ConfirmFriction (the step-up confirm ceremony)
   The single gate for every dangerous op suite-wide. A modal with a
   plain-language consequence block (scope, irreversibility, DIRECTION, blast
   radius, and the live honest-state echo), a typed-intent field, and — for
   high-stakes ops — a step-up re-authentication (a fresh identity check, not a
   local password box).
   Two intensities:
     light → engaging SAFETY (a stop, a revoke — toward LESS action): calm cyan
             single-confirm.
     full  → toward MORE action or anything irreversible: red variant with
             typed-intent + step-up.
   Esc closes to the safe (Cancel) default. Shift+Esc jumps focus to the halt
   control (focuses, never fires). The dialog can never hide the halt control
   (the halt renders at a higher layer, z-halt > z-dialog). */

const CSS = `
.helm-confirm-scrim {
  position: fixed; inset: 0; z-index: var(--z-scrim);
  background: var(--scrim);
  display: flex; align-items: flex-start; justify-content: center;
  padding: 8vh var(--space-6) var(--space-6);
  animation: helm-confirm-fade var(--dur-base) var(--ease-standard);
}
@keyframes helm-confirm-fade { from { opacity: 0; } to { opacity: 1; } }
.helm-confirm {
  position: relative; z-index: var(--z-dialog);
  width: 100%; max-width: 560px;
  background: var(--surface-raised); border: 1px solid var(--border-strong);
  border-radius: var(--radius-panel); box-shadow: var(--shadow-dialog);
  overflow: hidden;
}
.helm-confirm__top { height: 3px; }
.helm-confirm--light .helm-confirm__top { background: var(--signal-cyan); }
.helm-confirm--full .helm-confirm__top { background: var(--danger); }
.helm-confirm__head { display: flex; align-items: flex-start; gap: var(--space-3); padding: var(--space-4) var(--space-6) var(--space-3); }
.helm-confirm__glyph { font-size: 20px; line-height: 24px; flex: none; }
.helm-confirm--light .helm-confirm__glyph { color: var(--signal-cyan); }
.helm-confirm--full .helm-confirm__glyph { color: var(--danger); }
.helm-confirm__title { font-family: var(--font-ui); font-size: 16px; line-height: 22px; font-weight: 600; color: var(--text-primary); }
.helm-confirm__eyebrow { font-family: var(--font-ui); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--text-muted); margin-bottom: 2px; }
.helm-confirm__body { padding: 0 var(--space-6) var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
.helm-confirm__consequence {
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control); padding: var(--space-3) var(--space-4);
  font-family: var(--font-ui); font-size: 13px; line-height: 20px; color: var(--text-secondary);
}
.helm-confirm__consequence strong { color: var(--text-primary); font-weight: 600; }
.helm-confirm__meta { display: flex; flex-wrap: wrap; gap: 6px; margin-top: var(--space-2); }
.helm-confirm__tag {
  display: inline-flex; align-items: center; gap: 5px; height: 20px; padding: 0 8px;
  border-radius: var(--radius-pill); font-family: var(--font-ui); font-size: 11px; font-weight: 600;
  letter-spacing: 0.02em; border: 1px solid;
}
.helm-confirm__tag--more { background: var(--danger-bg); color: var(--danger-text); border-color: #5A2420; }
.helm-confirm__tag--less { background: var(--signal-cyan-wash); color: var(--signal-cyan-ink); border-color: #14424F; }
.helm-confirm__tag--irrev { background: var(--danger-bg); color: var(--danger-text); border-color: #5A2420; }
.helm-confirm__echo-label, .helm-confirm__field-label {
  font-family: var(--font-ui); font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em;
  color: var(--text-muted); margin-bottom: 6px;
}
.helm-confirm__intent {
  width: 100%; height: var(--control-default); padding: 0 10px;
  background: var(--surface-inset); border: 1px solid var(--border-strong);
  border-radius: var(--radius-control); color: var(--text-primary);
  font-family: var(--font-mono); font-size: 13px; outline: none;
}
.helm-confirm__intent:focus { border-color: var(--danger); box-shadow: 0 0 0 2px rgba(229,89,78,0.35); }
.helm-confirm__intent.is-ok { border-color: var(--state-green); }
.helm-confirm__intent-hint { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 5px; }
.helm-confirm__intent-hint b { color: var(--text-secondary); font-weight: 600; }
.helm-confirm__stepup {
  display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-control); padding: var(--space-3) var(--space-4);
}
.helm-confirm__stepup-txt { font-family: var(--font-ui); font-size: 12px; line-height: 17px; color: var(--text-secondary); }
.helm-confirm__stepup.is-done { border-color: #1E5140; }
.helm-confirm__stepup.is-done .helm-confirm__stepup-txt { color: var(--state-green-ink); }
.helm-confirm__audit { font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
.helm-confirm__foot {
  display: flex; align-items: center; justify-content: flex-end; gap: var(--space-2);
  padding: var(--space-3) var(--space-6); border-top: 1px solid var(--border-default);
  background: var(--surface-panel);
}
.helm-cf-btn {
  display: inline-flex; align-items: center; gap: 7px; height: var(--control-default); padding: 0 16px;
  border-radius: var(--radius-control); font-family: var(--font-ui); font-size: 13px; font-weight: 600;
  border: 1px solid transparent; cursor: pointer;
  transition: background var(--dur-fast) var(--ease-standard);
}
.helm-cf-btn:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-cf-btn--cancel { background: transparent; color: var(--text-secondary); }
.helm-cf-btn--cancel:hover { background: var(--bg-control); color: var(--text-primary); }
.helm-cf-btn--confirm-light { background: var(--interactive); color: var(--text-on-accent); }
.helm-cf-btn--confirm-light:hover { background: var(--interactive-hover); }
.helm-cf-btn--confirm-full { background: var(--danger); color: #2C1210; }
.helm-cf-btn--confirm-full:hover { background: var(--danger-red-hover); }
.helm-cf-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-confirm-css')) {
  const s = document.createElement('style');
  s.id = 'helm-confirm-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function ConfirmFriction({
  open = false,
  intensity = 'full',
  eyebrow = 'Confirm ceremony',
  title,
  consequence,
  direction = 'more',
  irreversible = false,
  blastRadius,
  honest,
  typedIntent,
  stepUp = false,
  confirmLabel,
  auditNote,
  onConfirm,
  onCancel,
  onEscapeToHalt,
  className = '',
  ...rest
}) {
  const full = intensity === 'full';
  const [typed, setTyped] = React.useState('');
  const [stepped, setStepped] = React.useState(false);
  const dialogRef = React.useRef(null);
  const cancelRef = React.useRef(null);
  React.useEffect(() => {
    if (open) {
      setTyped('');
      setStepped(false);
      // focus the safe default (Cancel)
      const t = setTimeout(() => {
        cancelRef.current && cancelRef.current.focus();
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open]);
  if (!open) return null;
  const intentOk = !typedIntent || typed.trim() === typedIntent;
  const stepOk = !stepUp || stepped;
  const canConfirm = intentOk && stepOk;
  const onKeyDown = e => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (e.shiftKey) {
        onEscapeToHalt && onEscapeToHalt();
      } else {
        onCancel && onCancel();
      }
    }
    // minimal focus trap
    if (e.key === 'Tab') {
      const f = dialogRef.current.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])');
      if (!f.length) return;
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm-scrim",
    onMouseDown: e => {
      if (e.target === e.currentTarget) onCancel && onCancel();
    }
  }, /*#__PURE__*/React.createElement("div", _extends({
    ref: dialogRef,
    className: ['helm-confirm', full ? 'helm-confirm--full' : 'helm-confirm--light', className].filter(Boolean).join(' '),
    role: "dialog",
    "aria-modal": "true",
    "aria-label": title,
    onKeyDown: onKeyDown
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__top"
  }), /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__head"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-confirm__glyph",
    "aria-hidden": "true"
  }, full ? '⚠' : '⛊'), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__eyebrow"
  }, eyebrow), /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__title"
  }, title))), /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__consequence"
  }, consequence, /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__meta"
  }, /*#__PURE__*/React.createElement("span", {
    className: `helm-confirm__tag helm-confirm__tag--${direction === 'more' ? 'more' : 'less'}`
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, direction === 'more' ? '↑' : '↓'), direction === 'more' ? 'Moves toward MORE real-world action' : 'Moves toward LESS action'), irreversible ? /*#__PURE__*/React.createElement("span", {
    className: "helm-confirm__tag helm-confirm__tag--irrev"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u26A0"), " Irreversible in flight") : null, blastRadius ? /*#__PURE__*/React.createElement("span", {
    className: "helm-confirm__tag helm-confirm__tag--less",
    style: {
      background: 'var(--bg-control)',
      color: 'var(--text-secondary)',
      borderColor: 'var(--border-strong)'
    }
  }, "Blast radius: ", blastRadius) : null)), honest ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__echo-label"
  }, "Live honest-state echo"), /*#__PURE__*/React.createElement(__ds_scope.HonestState, _extends({}, honest, {
    summary: true
  }))) : null, full && typedIntent ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__field-label"
  }, "Type to confirm intent"), /*#__PURE__*/React.createElement("input", {
    className: ['helm-confirm__intent', intentOk && typed ? 'is-ok' : ''].filter(Boolean).join(' '),
    value: typed,
    onChange: e => setTyped(e.target.value),
    placeholder: typedIntent,
    spellCheck: false,
    autoComplete: "off",
    "aria-label": `Type ${typedIntent} to confirm`
  }), /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__intent-hint"
  }, "type exactly ", /*#__PURE__*/React.createElement("b", null, typedIntent))) : null, stepUp ? /*#__PURE__*/React.createElement("div", {
    className: ['helm-confirm__stepup', stepped ? 'is-done' : ''].filter(Boolean).join(' ')
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-confirm__stepup-txt"
  }, stepped ? '✔ Identity re-verified for this action.' : 'High-stakes: a fresh identity check is required (not a password box).'), !stepped ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: "helm-cf-btn helm-cf-btn--confirm-light",
    onClick: () => setStepped(true)
  }, "Re-authenticate") : null) : null, auditNote ? /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__audit"
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u26D3"), " ", auditNote) : null), /*#__PURE__*/React.createElement("div", {
    className: "helm-confirm__foot"
  }, /*#__PURE__*/React.createElement("button", {
    ref: cancelRef,
    type: "button",
    className: "helm-cf-btn helm-cf-btn--cancel",
    onClick: () => onCancel && onCancel()
  }, "Cancel"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    className: `helm-cf-btn ${full ? 'helm-cf-btn--confirm-full' : 'helm-cf-btn--confirm-light'}`,
    disabled: !canConfirm,
    onClick: () => canConfirm && onConfirm && onConfirm()
  }, full && direction === 'more' ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u26A0") : null, confirmLabel || (full ? 'Confirm' : 'Confirm safely')))));
}
Object.assign(__ds_scope, { ConfirmFriction });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/safety/ConfirmFriction.jsx", error: String((e && e.message) || e) }); }

// components/safety/DangerAction.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — DangerAction
   Anything moving the system toward MORE real-world action or an irreversible
   change is red and always behind the confirm ceremony. Its consequence text
   states the DIRECTION ("this moves the system toward MORE real-world action")
   and echoes the live honest-state counts. This component packages the red
   trigger + the ConfirmFriction ceremony together so the two can never drift
   apart. For a capability that cannot exist BY CONSTRUCTION, do NOT use this —
   render a PrintedAbsence (a calm locked fact), never a greyed-out control. */

const CSS = `
.helm-danger-trigger {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  height: var(--control-default); padding: 0 14px;
  border-radius: var(--radius-control); font-family: var(--font-ui); font-size: 13px; font-weight: 600;
  cursor: pointer; border: 1px solid #5A2420; background: transparent; color: var(--danger-text);
  transition: background var(--dur-fast) var(--ease-standard), border-color var(--dur-fast) var(--ease-standard);
}
.helm-danger-trigger:hover:not([disabled]) { background: var(--danger-bg); border-color: var(--danger); }
.helm-danger-trigger:active:not([disabled]) { background: #351512; }
.helm-danger-trigger:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-danger-trigger--solid { background: var(--danger); color: #2C1210; border-color: transparent; }
.helm-danger-trigger--solid:hover:not([disabled]) { background: var(--danger-red-hover); }
.helm-danger-trigger--compact { height: var(--control-compact); padding: 0 10px; }
.helm-danger-trigger[disabled] { opacity: 0.4; cursor: not-allowed; }
.helm-danger-trigger__glyph { font-size: 14px; font-variant-emoji: text; }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-dangeraction-css')) {
  const s = document.createElement('style');
  s.id = 'helm-dangeraction-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function DangerAction({
  label,
  glyph = '⛔',
  variant = 'outline',
  size = 'default',
  disabled = false,
  // ceremony
  intensity = 'full',
  title,
  consequence,
  direction = 'more',
  irreversible = false,
  blastRadius,
  honest,
  typedIntent,
  stepUp = false,
  confirmLabel,
  auditNote,
  onConfirm,
  onEscapeToHalt,
  className = '',
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const triggerCls = ['helm-danger-trigger', variant === 'solid' ? 'helm-danger-trigger--solid' : '', size === 'compact' ? 'helm-danger-trigger--compact' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: triggerCls,
    disabled: disabled,
    onClick: () => setOpen(true)
  }, rest), glyph ? /*#__PURE__*/React.createElement("span", {
    className: "helm-danger-trigger__glyph",
    "aria-hidden": "true"
  }, glyph) : null, label), /*#__PURE__*/React.createElement(__ds_scope.ConfirmFriction, {
    open: open,
    intensity: intensity,
    title: title || label,
    consequence: consequence,
    direction: direction,
    irreversible: irreversible,
    blastRadius: blastRadius,
    honest: honest,
    typedIntent: typedIntent,
    stepUp: stepUp,
    confirmLabel: confirmLabel || label,
    auditNote: auditNote,
    onConfirm: () => {
      setOpen(false);
      onConfirm && onConfirm();
    },
    onCancel: () => setOpen(false),
    onEscapeToHalt: onEscapeToHalt
  }));
}
Object.assign(__ds_scope, { DangerAction });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/safety/DangerAction.jsx", error: String((e && e.message) || e) }); }

// components/safety/HaltBand.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — HaltBand (the signature element)
   A full-width GOLD band directly under the header, sticky until the posture
   clears. Two forms:
     (a) mode="kill"      → KILL-SWITCH ENGAGED: destructive & approve/execute
         paths are refused suite-wide; benign reads continue. Honest triad + a
         "Review halt →" link.
     (b) mode="safe-stop" → SYSTEM SAFE-STOPPED: a dependency is down and the
         system failed closed. "This is the safety system working, not an
         outage." Lists what's still true and what to do.
   Both use calm interlock/shield icons, NEVER ✕, NEVER red. G2 full-quiesce is
   intensified gold — heavier, doubled glyph ▮▮▮▮, edge striping — escalated by
   weight & shape, not hue. Only Mission Control and auth host a real kill
   trigger; every other app shows this band READ-ONLY and links out. */

const CSS = `
.helm-halt {
  position: relative; z-index: var(--z-sticky);
  display: flex; align-items: flex-start; gap: var(--space-6); flex-wrap: wrap;
  padding: 14px var(--space-6);
  background: var(--halt-gold-wash);
  border-top: 2px solid var(--halt-gold);
  box-shadow: var(--shadow-halt); color: var(--halt-gold-ink);
}
.helm-halt--g2 {
  padding: 18px var(--space-6);
  border-top-width: 3px; box-shadow: var(--shadow-halt-g2);
  background-image: repeating-linear-gradient(-45deg,
    rgba(242,132,43,0.10) 0, rgba(242,132,43,0.10) 8px,
    transparent 8px, transparent 16px);
}
.helm-halt__lead { display: flex; align-items: flex-start; gap: var(--space-3); flex: 1 1 340px; min-width: 280px; }
.helm-halt__glyph { font-size: 28px; line-height: 26px; color: var(--halt-gold); flex: none; }
.helm-halt--g2 .helm-halt__glyph { font-size: 22px; letter-spacing: -3px; }
.helm-halt__copy { display: flex; flex-direction: column; gap: 3px; }
.helm-halt__word {
  font-family: var(--font-ui); font-size: 22px; line-height: 26px; font-weight: 600;
  letter-spacing: 0.01em; color: var(--halt-gold-ink);
}
.helm-halt__sub { font-family: var(--font-ui); font-size: 13px; line-height: 20px; color: var(--halt-gold-ink); opacity: 0.9; max-width: 62ch; }
.helm-halt__still { margin: 4px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 2px; }
.helm-halt__still li { font-family: var(--font-ui); font-size: 12px; line-height: 17px; color: var(--halt-gold-ink); opacity: 0.85; display: flex; gap: 6px; }
.helm-halt__still li::before { content: '·'; opacity: 0.6; }
.helm-halt__aside { display: flex; flex-direction: column; gap: 10px; align-items: flex-start; }
.helm-halt__review {
  display: inline-flex; align-items: center; gap: 6px;
  font-family: var(--font-ui); font-size: 13px; font-weight: 600; color: var(--halt-gold-ink);
  text-decoration: none; border-bottom: 1px solid transparent; padding-bottom: 1px;
}
.helm-halt__review:hover { border-bottom-color: var(--halt-gold-ink); text-decoration: none; }
.helm-halt__readonly {
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--halt-gold-ink); opacity: 0.6; border: 1px solid var(--halt-gold-edge);
  border-radius: var(--radius-pill); padding: 1px 7px;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-haltband-css')) {
  const s = document.createElement('style');
  s.id = 'helm-haltband-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function HaltBand({
  mode = 'kill',
  level = 'G1',
  message,
  confirmed = 0,
  pending = 0,
  draining = 0,
  pendingCountdown,
  drainingDetail,
  stillTrue,
  reviewHref = '#',
  reviewLabel,
  readOnly = false,
  showTriad = true,
  className = '',
  ...rest
}) {
  const g2 = level === 'G2';
  const kill = mode === 'kill';
  const glyph = kill ? g2 ? '▮▮▮▮' : '▮▮' : '⛊';
  const word = kill ? g2 ? 'FULL QUIESCE — ALL AGENTS HALTED' : 'KILL-SWITCH ENGAGED' : 'SYSTEM SAFE-STOPPED';
  const defaultSub = kill ? 'Destructive & approve/execute paths are refused suite-wide; benign reads continue.' : 'A dependency is down, so the system failed closed. This is the safety system working, not an outage.';
  const cls = ['helm-halt', g2 ? 'helm-halt--g2' : '', className].filter(Boolean).join(' ');
  return /*#__PURE__*/React.createElement("div", _extends({
    className: cls,
    role: "status"
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "helm-halt__lead"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-halt__glyph",
    "aria-hidden": "true"
  }, glyph), /*#__PURE__*/React.createElement("div", {
    className: "helm-halt__copy"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-halt__word"
  }, word), /*#__PURE__*/React.createElement("span", {
    className: "helm-halt__sub"
  }, message || defaultSub), stillTrue && stillTrue.length ? /*#__PURE__*/React.createElement("ul", {
    className: "helm-halt__still"
  }, stillTrue.map((s, i) => /*#__PURE__*/React.createElement("li", {
    key: i
  }, s))) : null)), /*#__PURE__*/React.createElement("div", {
    className: "helm-halt__aside"
  }, showTriad ? /*#__PURE__*/React.createElement(__ds_scope.HonestState, {
    confirmed: confirmed,
    pending: pending,
    draining: draining,
    pendingCountdown: pendingCountdown,
    drainingDetail: drainingDetail,
    summary: false
  }) : null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }
  }, /*#__PURE__*/React.createElement("a", {
    className: "helm-halt__review",
    href: reviewHref
  }, reviewLabel || 'Review halt', " ", /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true"
  }, "\u2192")), readOnly ? /*#__PURE__*/React.createElement("span", {
    className: "helm-halt__readonly"
  }, "read-only \xB7 act in ", kill ? 'Mission Control' : 'the owning app') : null)));
}
Object.assign(__ds_scope, { HaltBand });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/safety/HaltBand.jsx", error: String((e && e.message) || e) }); }

// components/safety/PrintedAbsence.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — PrintedAbsence
   The "printed absence" rule. Where a capability CANNOT exist by construction
   (an agent can never approve its own work; this surface cannot relax the
   segregation of duties; the vault never shows a stored secret back), render it
   as a CALM PRINTED FACT with a 🔒/⛊ lock glyph and NO control at all — never a
   greyed-out toggle (a disabled toggle implies the power exists and could be
   switched on). This "affirmative, explained absence" is a repeated pattern. */

const CSS = `
.helm-absence {
  display: flex; align-items: flex-start; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--surface-inset); border: 1px solid var(--border-default);
  border-radius: var(--radius-panel);
}
.helm-absence__glyph {
  font-size: 16px; line-height: 20px; color: var(--text-muted); flex: none;
  font-variant-emoji: text;
}
.helm-absence__body { display: flex; flex-direction: column; gap: 3px; }
.helm-absence__fact { font-family: var(--font-ui); font-size: 13px; line-height: 20px; color: var(--text-secondary); }
.helm-absence__fact strong { color: var(--text-primary); font-weight: 600; }
.helm-absence__why { font-family: var(--font-ui); font-size: 12px; line-height: 17px; color: var(--text-muted); }
.helm-absence__tag {
  align-self: flex-start; margin-top: 2px;
  font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.04em; text-transform: uppercase;
  color: var(--text-muted); border: 1px solid var(--border-strong);
  border-radius: var(--radius-pill); padding: 1px 7px;
}
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-printedabsence-css')) {
  const s = document.createElement('style');
  s.id = 'helm-printedabsence-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function PrintedAbsence({
  glyph = '🔒',
  children,
  why,
  tag = 'by construction',
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['helm-absence', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "helm-absence__glyph",
    "aria-hidden": "true"
  }, glyph), /*#__PURE__*/React.createElement("div", {
    className: "helm-absence__body"
  }, /*#__PURE__*/React.createElement("div", {
    className: "helm-absence__fact"
  }, children), why ? /*#__PURE__*/React.createElement("div", {
    className: "helm-absence__why"
  }, why) : null), tag ? /*#__PURE__*/React.createElement("span", {
    className: "helm-absence__tag"
  }, tag) : null);
}
Object.assign(__ds_scope, { PrintedAbsence });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/safety/PrintedAbsence.jsx", error: String((e && e.message) || e) }); }

// components/safety/ReviewChip.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — ReviewChip
   Work waiting on a human gate. A pill (◈ NEEDS REVIEW / ⚑ ESCALATED) that
   ALWAYS shows the machine reason (board_escalation, window_ambiguity,
   break-glass, …) and DEEP-LINKS into Mission Control's review queue. Apps
   SURFACE it; only Mission Control / Board CLEAR it. */

const CSS = `
.helm-review {
  display: inline-flex; align-items: center; gap: 7px;
  height: 22px; padding: 0 5px 0 8px; border-radius: var(--radius-pill);
  background: var(--state-amber-wash); border: 1px solid #5A4A1E;
  font-family: var(--font-ui); text-decoration: none; white-space: nowrap;
  transition: border-color var(--dur-fast) var(--ease-standard);
}
a.helm-review:hover { border-color: var(--state-amber); text-decoration: none; }
.helm-review:focus-visible { outline: none; box-shadow: var(--ring-focus-tight); }
.helm-review__label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase;
  color: var(--state-amber-ink);
}
.helm-review__glyph { font-size: 12px; }
.helm-review__reason {
  font-family: var(--font-mono); font-size: 11px; color: var(--state-amber-ink); opacity: 0.86;
  border-left: 1px solid #5A4A1E; padding-left: 7px;
}
.helm-review__link { color: var(--state-amber-ink); font-size: 12px; opacity: 0.8; }
.helm-review--escalated { background: #331E0C; }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-reviewchip-css')) {
  const s = document.createElement('style');
  s.id = 'helm-reviewchip-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function ReviewChip({
  state = 'needs-review',
  reason,
  href,
  className = '',
  ...rest
}) {
  const escalated = state === 'escalated';
  const cls = ['helm-review', escalated ? 'helm-review--escalated' : '', className].filter(Boolean).join(' ');
  const inner = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "helm-review__label"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-review__glyph",
    "aria-hidden": "true"
  }, escalated ? '⚑' : '◈'), escalated ? 'Escalated' : 'Needs review'), reason ? /*#__PURE__*/React.createElement("span", {
    className: "helm-review__reason"
  }, reason) : null, href ? /*#__PURE__*/React.createElement("span", {
    className: "helm-review__link",
    "aria-hidden": "true"
  }, "\u2197") : null);
  if (href) return /*#__PURE__*/React.createElement("a", _extends({
    className: cls,
    href: href
  }, rest), inner);
  return /*#__PURE__*/React.createElement("span", _extends({
    className: cls
  }, rest), inner);
}
Object.assign(__ds_scope, { ReviewChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/safety/ReviewChip.jsx", error: String((e && e.message) || e) }); }

// components/safety/StopActuator.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — StopActuator
   The press-and-hold control that engages a stop deliberately-but-fast: fill a
   ring over a short dwell (~600ms G1 · ~1000ms G2). Release early = abort.
   NO typing on stops (typing is reserved for the dangerous direction). G2 is
   heavier and must be explicitly FOCUSED (armed) first. Engaging a stop moves
   the system INTO the calm gold safe-posture, so the actuator is halt-gold —
   never red (red is the operator's destructive finger, e.g. LIFTING a stop). */

const CSS = `
.helm-stop {
  display: inline-flex; align-items: center; gap: var(--space-3);
  padding: 6px 14px 6px 8px; border-radius: var(--radius-pill);
  background: var(--surface-raised); border: 1px solid var(--halt-gold-edge);
  cursor: pointer; user-select: none; touch-action: none;
  font-family: var(--font-ui); color: var(--halt-gold-ink);
  transition: border-color var(--dur-fast) var(--ease-standard), background var(--dur-fast) var(--ease-standard);
}
.helm-stop:hover:not(.is-engaged) { border-color: var(--halt-gold); }
.helm-stop:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-stop.is-holding { border-color: var(--halt-gold); background: var(--halt-gold-wash); }
.helm-stop.is-engaged { cursor: default; background: var(--halt-gold-wash); border-color: var(--halt-gold); }
.helm-stop.is-disarmed { opacity: 0.86; }
.helm-stop__ring { position: relative; width: 40px; height: 40px; flex: none; }
.helm-stop__ring svg { transform: rotate(-90deg); display: block; }
.helm-stop__track { stroke: var(--surface-inset); }
.helm-stop__fill { stroke: var(--halt-gold); transition: stroke-dashoffset 40ms linear; }
.helm-stop__glyph {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-size: 16px; color: var(--halt-gold); font-variant-emoji: text;
}
.helm-stop__glyph--g2 { letter-spacing: -2px; }
.helm-stop__text { display: flex; flex-direction: column; gap: 1px; }
.helm-stop__word {
  font-size: 12px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
}
.helm-stop__hint { font-size: 11px; color: var(--halt-gold-ink); opacity: 0.7; font-family: var(--font-mono); }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-stopactuator-css')) {
  const s = document.createElement('style');
  s.id = 'helm-stopactuator-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const R = 17;
const C = 2 * Math.PI * R;
function StopActuator({
  level = 'G1',
  onEngage,
  engaged = false,
  label,
  className = '',
  ...rest
}) {
  const dwell = level === 'G2' ? 1000 : 600;
  const [progress, setProgress] = React.useState(0);
  const [holding, setHolding] = React.useState(false);
  const [armed, setArmed] = React.useState(level !== 'G2');
  const raf = React.useRef(0);
  const startedAt = React.useRef(0);
  const timer = React.useRef(0);
  const stopRaf = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = 0;
  };
  const clearAll = () => {
    stopRaf();
    if (timer.current) clearTimeout(timer.current);
    timer.current = 0;
  };
  const begin = () => {
    if (engaged || holding) return;
    if (level === 'G2' && !armed) {
      setArmed(true);
      return;
    }
    setHolding(true);
    startedAt.current = Date.now();
    // Completion runs on a reliable timer so engaging never depends on rAF
    // ticking; the ring fill (below) is cosmetic.
    timer.current = setTimeout(() => {
      clearAll();
      setHolding(false);
      setProgress(0);
      onEngage && onEngage();
    }, dwell);
    const tick = () => {
      const p = Math.min(1, (Date.now() - startedAt.current) / dwell);
      setProgress(p);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  const abort = () => {
    clearAll();
    setHolding(false);
    setProgress(0);
  };
  React.useEffect(() => () => clearAll(), []);
  const cls = ['helm-stop', holding ? 'is-holding' : '', engaged ? 'is-engaged' : '', level === 'G2' && !armed && !engaged ? 'is-disarmed' : '', className].filter(Boolean).join(' ');
  const g2 = level === 'G2';
  const ringOffset = engaged ? 0 : C * (1 - progress);
  const glyph = engaged ? g2 ? '▮▮▮▮' : '▮▮' : '⛔\uFE0E';
  const word = engaged ? g2 ? 'Full quiesce' : 'Stop engaged' : label || (g2 ? 'Hold to full-quiesce' : 'Hold to stop');
  const hint = engaged ? 'safe-stopped' : holding ? 'keep holding…' : g2 && !armed ? 'focus to arm' : g2 ? `hold ~1.0s` : `hold ~0.6s`;
  return /*#__PURE__*/React.createElement("button", _extends({
    type: "button",
    className: cls,
    "aria-label": g2 ? 'Full quiesce — press and hold' : 'Stop — press and hold',
    "aria-pressed": engaged,
    disabled: engaged,
    onPointerDown: e => {
      e.currentTarget.setPointerCapture && e.currentTarget.setPointerCapture(e.pointerId);
      begin();
    },
    onPointerUp: abort,
    onPointerLeave: abort,
    onPointerCancel: abort,
    onFocus: () => {
      if (g2) setArmed(true);
    },
    onKeyDown: e => {
      if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
        e.preventDefault();
        begin();
      }
    },
    onKeyUp: e => {
      if (e.key === ' ' || e.key === 'Enter') abort();
    }
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "helm-stop__ring"
  }, /*#__PURE__*/React.createElement("svg", {
    width: "40",
    height: "40",
    viewBox: "0 0 40 40",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("circle", {
    className: "helm-stop__track",
    cx: "20",
    cy: "20",
    r: R,
    fill: "none",
    strokeWidth: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    className: "helm-stop__fill",
    cx: "20",
    cy: "20",
    r: R,
    fill: "none",
    strokeWidth: "3",
    strokeLinecap: "round",
    strokeDasharray: C,
    strokeDashoffset: ringOffset
  })), /*#__PURE__*/React.createElement("span", {
    className: `helm-stop__glyph${g2 ? ' helm-stop__glyph--g2' : ''}`,
    "aria-hidden": "true"
  }, glyph)), /*#__PURE__*/React.createElement("span", {
    className: "helm-stop__text"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-stop__word"
  }, word), /*#__PURE__*/React.createElement("span", {
    className: "helm-stop__hint"
  }, hint)));
}
Object.assign(__ds_scope, { StopActuator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/safety/StopActuator.jsx", error: String((e && e.message) || e) }); }

// components/shell/AppHeader.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — AppHeader
   The global header, identical in every app: the app's name and one-line
   identity on the LEFT, a SYSTEM STATE zone in the CENTER, and the halt
   affordance / read-only kill-status mirror pinned RIGHT. 52px tall, raised
   surface, hairline base. */

const CSS = `
.helm-header {
  display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr); align-items: center;
  height: var(--header-height); flex: none;
  padding: 0 var(--space-4); gap: var(--space-4);
  background: var(--surface-raised); border-bottom: 1px solid var(--border-default);
}
.helm-header__left { display: flex; align-items: baseline; gap: var(--space-2); min-width: 0; overflow: hidden; }
.helm-header__app { font-family: var(--font-ui); font-size: 15px; font-weight: 600; color: var(--text-primary); white-space: nowrap; flex: none; }
.helm-header__identity {
  font-family: var(--font-ui); font-size: 12px; color: var(--text-muted);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0;
  border-left: 1px solid var(--border-strong); padding-left: var(--space-2);
}
.helm-header__center { display: flex; align-items: center; gap: var(--space-3); justify-self: center; min-width: 0; }
.helm-header__state-label {
  font-family: var(--font-ui); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em;
  color: var(--text-muted); white-space: nowrap;
}
.helm-header__state { display: flex; align-items: center; gap: var(--space-2); min-width: 0; }
.helm-header__right { display: flex; align-items: center; gap: var(--space-2); justify-self: end; min-width: 0; }

/* Squeeze order protects the safety-critical right slot: shed the identity and
   the state-label first, so the halt affordance is never the thing that clips. */
@media (max-width: 1180px) {
  .helm-header__identity { display: none; }
}
@media (max-width: 1040px) {
  .helm-header__state-label { display: none; }
}

/* A compact read-only kill-status mirror for the right slot. */
.helm-killmirror {
  display: inline-flex; align-items: center; gap: 7px; height: 30px; padding: 0 10px;
  border-radius: var(--radius-control); border: 1px solid; text-decoration: none;
  font-family: var(--font-ui); font-size: 12px; font-weight: 600;
}
.helm-killmirror--nominal { background: var(--surface-inset); border-color: var(--border-strong); color: var(--text-secondary); }
.helm-killmirror--engaged { background: var(--halt-gold-wash); border-color: var(--halt-gold); color: var(--halt-gold-ink); }
.helm-killmirror__glyph { font-size: 13px; }
.helm-killmirror--nominal .helm-killmirror__glyph { color: var(--state-green); }
.helm-killmirror--engaged .helm-killmirror__glyph { color: var(--halt-gold); }
.helm-killmirror__ro { font-family: var(--font-mono); font-size: 9px; letter-spacing: 0.04em; text-transform: uppercase; opacity: 0.7; }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-appheader-css')) {
  const s = document.createElement('style');
  s.id = 'helm-appheader-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
function AppHeader({
  appName,
  identity,
  stateLabel = 'System state',
  systemState,
  children,
  className = '',
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", _extends({
    className: ['helm-header', className].filter(Boolean).join(' ')
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "helm-header__left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-header__app"
  }, appName), identity ? /*#__PURE__*/React.createElement("span", {
    className: "helm-header__identity"
  }, identity) : null), /*#__PURE__*/React.createElement("div", {
    className: "helm-header__center"
  }, systemState ? /*#__PURE__*/React.createElement("span", {
    className: "helm-header__state-label"
  }, stateLabel) : null, /*#__PURE__*/React.createElement("div", {
    className: "helm-header__state"
  }, systemState)), /*#__PURE__*/React.createElement("div", {
    className: "helm-header__right"
  }, children));
}

/* A ready-made read-only kill-status mirror for the header's right slot.
   Every app shows this; only Mission Control / auth swap it for a live trigger. */
function KillMirror({
  engaged = false,
  href = '#',
  label,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("a", _extends({
    className: `helm-killmirror ${engaged ? 'helm-killmirror--engaged' : 'helm-killmirror--nominal'}`,
    href: href,
    title: engaged ? 'A stop is engaged — review in Mission Control' : 'No stop engaged'
  }, rest), /*#__PURE__*/React.createElement("span", {
    className: "helm-killmirror__glyph",
    "aria-hidden": "true"
  }, engaged ? '▮▮' : '▮▮'), /*#__PURE__*/React.createElement("span", null, label || (engaged ? 'Kill engaged' : 'Nominal')), /*#__PURE__*/React.createElement("span", {
    className: "helm-killmirror__ro"
  }, "mirror"));
}
Object.assign(__ds_scope, { AppHeader, KillMirror });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/AppHeader.jsx", error: String((e && e.message) || e) }); }

// components/shell/SuiteSwitcher.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — SuiteSwitcher
   The rail's list of apps the operator can reach. App markers are mono
   2-letter tiles (machine-truth, consistent) rather than mismatched glyphs.
   The suite-wide safety posture is shown ONCE in the rail (see NavRail), not
   per-app here. */

const HELM_APPS = [{
  key: 'mission-control',
  code: 'MC',
  name: 'Mission Control',
  blurb: 'Cockpit · kill & review',
  archetype: 'Instrument'
}, {
  key: 'board',
  code: 'BD',
  name: 'Board',
  blurb: 'Plan & approve work',
  archetype: 'Instrument'
}, {
  key: 'notes',
  code: 'NT',
  name: 'Notes',
  blurb: 'Author documents',
  archetype: 'Workshop'
}, {
  key: 'library',
  code: 'LB',
  name: 'Library',
  blurb: 'Knowledge & ingestion',
  archetype: 'Workshop'
}, {
  key: 'drive',
  code: 'DR',
  name: 'Drive',
  blurb: 'Files & previews',
  archetype: 'Workshop'
}, {
  key: 'chat',
  code: 'CH',
  name: 'Chat',
  blurb: 'The doorbell',
  archetype: 'Workshop'
}, {
  key: 'gateway',
  code: 'GW',
  name: 'Gateway',
  blurb: 'Tool catalog',
  archetype: 'Instrument'
}, {
  key: 'vault',
  code: 'VT',
  name: 'Vault',
  blurb: 'Secrets',
  archetype: 'Instrument'
}, {
  key: 'cmdb',
  code: 'DB',
  name: 'CMDB',
  blurb: 'Config & topology',
  archetype: 'Instrument'
}, {
  key: 'auth',
  code: 'AU',
  name: 'auth',
  blurb: 'Identity gateway',
  archetype: 'Instrument'
}, {
  key: 'agent-runtime',
  code: 'AR',
  name: 'Agent Runtime',
  blurb: 'Engine room',
  archetype: 'Instrument'
}];
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
function SuiteSwitcher({
  apps = HELM_APPS,
  current = 'mission-control',
  collapsed = false,
  onSelect,
  className = '',
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef(null);
  const cur = apps.find(a => a.key === current) || apps[0];
  React.useEffect(() => {
    if (!open) return;
    const onDoc = e => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  if (collapsed) {
    return /*#__PURE__*/React.createElement("div", _extends({
      className: ['helm-switch', className].filter(Boolean).join(' '),
      ref: rootRef
    }, rest), /*#__PURE__*/React.createElement("button", {
      className: "helm-switch__trigger",
      style: {
        justifyContent: 'center',
        padding: 6
      },
      "aria-label": `Suite — ${cur.name}`,
      onClick: () => setOpen(o => !o)
    }, /*#__PURE__*/React.createElement("span", {
      className: "helm-tile"
    }, cur.code)), open ? renderPanel(apps, current, k => {
      setOpen(false);
      onSelect && onSelect(k);
    }) : null);
  }
  return /*#__PURE__*/React.createElement("div", _extends({
    className: ['helm-switch', className].filter(Boolean).join(' '),
    ref: rootRef
  }, rest), /*#__PURE__*/React.createElement("button", {
    className: "helm-switch__trigger",
    "aria-haspopup": "listbox",
    "aria-expanded": open,
    onClick: () => setOpen(o => !o)
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-tile"
  }, cur.code), /*#__PURE__*/React.createElement("span", {
    className: "helm-switch__name"
  }, cur.name), /*#__PURE__*/React.createElement("span", {
    className: "helm-switch__chev",
    "aria-hidden": "true"
  }, open ? '▴' : '▾')), open ? renderPanel(apps, current, k => {
    setOpen(false);
    onSelect && onSelect(k);
  }) : null);
}
function renderPanel(apps, current, pick) {
  return /*#__PURE__*/React.createElement("div", {
    className: "helm-switch__panel",
    role: "listbox"
  }, /*#__PURE__*/React.createElement("div", {
    className: "helm-switch__eyebrow"
  }, "Suite"), apps.map(a => /*#__PURE__*/React.createElement("button", {
    key: a.key,
    role: "option",
    "aria-selected": a.key === current,
    className: ['helm-switch__item', a.key === current ? 'is-current' : ''].filter(Boolean).join(' '),
    onClick: () => pick(a.key)
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-tile"
  }, a.code), /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'flex',
      flexDirection: 'column'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-switch__item-name"
  }, a.name), /*#__PURE__*/React.createElement("span", {
    className: "helm-switch__item-blurb"
  }, a.blurb)), /*#__PURE__*/React.createElement("span", {
    className: "helm-switch__arch"
  }, a.archetype))));
}
Object.assign(__ds_scope, { HELM_APPS, SuiteSwitcher });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/SuiteSwitcher.jsx", error: String((e && e.message) || e) }); }

// components/shell/NavRail.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/* Helm — NavRail
   The left side rail, identical in every app: 224px open, collapses to a 56px
   glyph rail. Carries the wordmark, the SuiteSwitcher (app list), the app's nav
   items, and — pinned bottom — the suite-wide safety posture shown ONCE, so no
   matter which app you're in you can see if a stop is engaged. The collapsed
   rail keeps a GOLD RING on the halt glyph when engaged. */

const CSS = `
.helm-rail {
  display: flex; flex-direction: column; height: 100%;
  width: var(--rail-open); flex: none;
  background: var(--surface-raised); border-right: 1px solid var(--border-default);
  transition: width var(--dur-base) var(--ease-standard);
}
.helm-rail[data-collapsed="true"] { width: var(--rail-collapsed); }
.helm-rail__brand {
  display: flex; align-items: center; gap: var(--space-2); height: var(--header-height);
  padding: 0 var(--space-3); border-bottom: 1px solid var(--border-default); flex: none;
}
.helm-rail__mark {
  font-family: var(--font-ui); font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: var(--text-primary);
}
.helm-rail__mark .dot { color: var(--halt-gold); }
.helm-rail__toggle {
  margin-left: auto; display: inline-flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; border-radius: var(--radius-control); cursor: pointer;
  background: transparent; border: 1px solid transparent; color: var(--text-muted); font-size: 13px;
}
.helm-rail__toggle:hover { background: var(--bg-control); color: var(--text-primary); }
.helm-rail__toggle:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-rail__switch { padding: var(--space-3) var(--space-3) var(--space-2); }
.helm-rail__nav { flex: 1; overflow-y: auto; padding: var(--space-2); display: flex; flex-direction: column; gap: 2px; }
.helm-rail__group { font-family: var(--font-ui); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); padding: 10px 8px 4px; }
.helm-rail[data-collapsed="true"] .helm-rail__group { display: none; }
.helm-nav-item {
  position: relative; display: flex; align-items: center; gap: 10px;
  height: 34px; padding: 0 10px; border-radius: var(--radius-control);
  color: var(--text-secondary); background: transparent; border: 0; cursor: pointer;
  text-decoration: none; text-align: left; width: 100%;
  font-family: var(--font-ui); font-size: 13px; font-weight: 500;
  transition: background var(--dur-fast) var(--ease-standard), color var(--dur-fast) var(--ease-standard);
}
.helm-nav-item:hover { background: var(--bg-control); color: var(--text-primary); }
.helm-nav-item:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.helm-nav-item.is-active { background: var(--surface-inset); color: var(--text-primary); }
.helm-nav-item.is-active::before {
  content: ''; position: absolute; left: -2px; top: 7px; bottom: 7px; width: 3px;
  background: var(--signal-cyan); border-radius: 2px;
}
.helm-nav-item__icon { flex: none; width: 18px; display: inline-flex; align-items: center; justify-content: center; font-size: 15px; color: currentColor; }
.helm-nav-item__label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.helm-rail[data-collapsed="true"] .helm-nav-item { justify-content: center; padding: 0; }
.helm-rail[data-collapsed="true"] .helm-nav-item__label { display: none; }
.helm-nav-item__badge {
  flex: none; min-width: 18px; height: 17px; padding: 0 5px; border-radius: var(--radius-pill);
  display: inline-flex; align-items: center; justify-content: center;
  font-family: var(--font-mono); font-size: 10px; font-weight: 600; font-feature-settings: var(--figures-tabular);
  background: var(--state-amber-wash); color: var(--state-amber-ink); border: 1px solid #5A4A1E;
}
.helm-rail[data-collapsed="true"] .helm-nav-item__badge {
  position: absolute; top: 3px; right: 3px; min-width: 8px; height: 8px; padding: 0; border-radius: 50%;
  background: var(--state-amber); border: 0; font-size: 0;
}
.helm-rail__posture {
  flex: none; margin: var(--space-2); padding: 10px; border-radius: var(--radius-panel);
  border: 1px solid var(--border-default); background: var(--surface-inset);
  display: flex; align-items: center; gap: 10px; text-decoration: none;
}
.helm-rail__posture.is-engaged { border-color: var(--halt-gold-edge); background: var(--halt-gold-wash); }
.helm-rail__posture-ring {
  flex: none; width: 30px; height: 30px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center; font-size: 13px;
  border: 2px solid var(--border-strong); color: var(--text-muted);
}
.helm-rail__posture.is-engaged .helm-rail__posture-ring {
  border-color: var(--halt-gold); color: var(--halt-gold);
  box-shadow: 0 0 0 3px rgba(242,132,43,0.14);
}
.helm-rail__posture-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.helm-rail__posture-word { font-family: var(--font-ui); font-size: 11px; font-weight: 600; letter-spacing: 0.03em; text-transform: uppercase; color: var(--text-muted); }
.helm-rail__posture.is-engaged .helm-rail__posture-word { color: var(--halt-gold-ink); }
.helm-rail__posture-sub { font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); }
.helm-rail[data-collapsed="true"] .helm-rail__posture { justify-content: center; padding: 8px; }
.helm-rail[data-collapsed="true"] .helm-rail__posture-txt { display: none; }
`;
if (typeof document !== 'undefined' && !document.getElementById('helm-navrail-css')) {
  const s = document.createElement('style');
  s.id = 'helm-navrail-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}
const POSTURE = {
  nominal: {
    engaged: false,
    glyph: '▮▮',
    word: 'Nominal',
    sub: 'no stop engaged'
  },
  kill: {
    engaged: true,
    glyph: '▮▮',
    word: 'Kill engaged',
    sub: 'suite-wide'
  },
  'safe-stop': {
    engaged: true,
    glyph: '⛊',
    word: 'Safe-stopped',
    sub: 'failed closed'
  }
};
function NavRail({
  brand = 'Helm',
  current = 'mission-control',
  apps,
  items = [],
  collapsed = false,
  posture = 'nominal',
  onSelectApp,
  onToggle,
  postureHref = '#',
  onPostureClick,
  className = '',
  ...rest
}) {
  const p = POSTURE[posture] || POSTURE.nominal;
  return /*#__PURE__*/React.createElement("nav", _extends({
    className: ['helm-rail', className].filter(Boolean).join(' '),
    "data-collapsed": collapsed ? 'true' : 'false'
  }, rest), /*#__PURE__*/React.createElement("div", {
    className: "helm-rail__brand"
  }, collapsed ? /*#__PURE__*/React.createElement("span", {
    className: "helm-rail__mark"
  }, "H", /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, ".")) : /*#__PURE__*/React.createElement("span", {
    className: "helm-rail__mark"
  }, brand, /*#__PURE__*/React.createElement("span", {
    className: "dot"
  }, ".")), /*#__PURE__*/React.createElement("button", {
    className: "helm-rail__toggle",
    "aria-label": collapsed ? 'Expand rail' : 'Collapse rail',
    onClick: () => onToggle && onToggle(!collapsed)
  }, collapsed ? '»' : '«')), /*#__PURE__*/React.createElement("div", {
    className: "helm-rail__switch"
  }, /*#__PURE__*/React.createElement(__ds_scope.SuiteSwitcher, {
    apps: apps,
    current: current,
    collapsed: collapsed,
    onSelect: onSelectApp
  })), /*#__PURE__*/React.createElement("div", {
    className: "helm-rail__nav"
  }, items.map(it => it.group ? /*#__PURE__*/React.createElement("div", {
    key: it.group,
    className: "helm-rail__group"
  }, it.group) : /*#__PURE__*/React.createElement(ItemLink, {
    key: it.key,
    item: it
  }))), /*#__PURE__*/React.createElement("a", {
    className: ['helm-rail__posture', p.engaged ? 'is-engaged' : ''].filter(Boolean).join(' '),
    href: postureHref,
    onClick: onPostureClick,
    title: `Suite posture: ${p.word}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-rail__posture-ring",
    "aria-hidden": "true"
  }, p.glyph), /*#__PURE__*/React.createElement("span", {
    className: "helm-rail__posture-txt"
  }, /*#__PURE__*/React.createElement("span", {
    className: "helm-rail__posture-word"
  }, p.word), /*#__PURE__*/React.createElement("span", {
    className: "helm-rail__posture-sub"
  }, p.sub))));
}
function ItemLink({
  item
}) {
  const cls = ['helm-nav-item', item.active ? 'is-active' : ''].filter(Boolean).join(' ');
  const content = /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
    className: "helm-nav-item__icon",
    "aria-hidden": "true"
  }, item.icon), /*#__PURE__*/React.createElement("span", {
    className: "helm-nav-item__label"
  }, item.label), item.badge != null ? /*#__PURE__*/React.createElement("span", {
    className: "helm-nav-item__badge"
  }, item.badge) : null);
  if (item.href) return /*#__PURE__*/React.createElement("a", {
    className: cls,
    href: item.href,
    title: item.label,
    "aria-current": item.active ? 'page' : undefined
  }, content);
  return /*#__PURE__*/React.createElement("button", {
    className: cls,
    title: item.label,
    onClick: item.onClick,
    "aria-current": item.active ? 'page' : undefined
  }, content);
}
Object.assign(__ds_scope, { NavRail });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/shell/NavRail.jsx", error: String((e && e.message) || e) }); }

// ui_kits/agent-runtime/ar-app.jsx
try { (() => {
/* Helm — Agent Runtime · the engine room (one screen). Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    NavRail,
    AppHeader,
    KillMirror,
    PrincipalRef,
    DataTable,
    TierBadge,
    StatusPill,
    FreshnessStamp,
    HaltBand,
    HonestState,
    PrintedAbsence,
    Button
  } = H;
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const MODELS = [{
    role: 'adversarial-reviewer',
    model: 'qwen 9c3f…',
    prov: 'verified',
    quant: 'Q6_K',
    state: 'online'
  }, {
    role: 'scrum-master',
    model: 'llama a71b…',
    prov: 'verified',
    quant: 'Q5_K_M',
    state: 'online'
  }, {
    role: 'hands-pool',
    model: 'mist 4d0e…',
    prov: 'verified',
    quant: 'Q4_K_M',
    state: 'online'
  }, {
    role: 'embed (TEI, Library)',
    model: 'qwen3 77ac…',
    prov: 'verified',
    quant: 'FP16',
    state: 'online'
  }];
  function Panel({
    title,
    right,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid var(--border-default)',
        padding: '18px 0'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, title), right), children);
  }

  /* EngineHeadroom — VRAM / decode-stream / TPM-queue gauges. Neutral fill; attn near knee. */
  function Bar({
    pct,
    warn
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        height: 8,
        borderRadius: 4,
        background: 'var(--surface-inset)',
        overflow: 'hidden',
        width: 220
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: pct + '%',
        height: '100%',
        background: warn ? 'var(--state-amber)' : 'var(--text-secondary)'
      }
    }));
  }
  function EngineHeadroom({
    stale
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        width: 60
      }
    }, "VRAM"), /*#__PURE__*/React.createElement(Bar, {
      pct: 80
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "38.6 / 48.0 GB")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "decode streams 11 / knee C\u224814 \xB7 TPM sign queue depth 2 (serialized)"), /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "source: supervisor \xB7 as-of 3s",
      state: stale ? 'halt' : 'live',
      reading: stale ? 'cannot confirm headroom' : undefined
    }));
  }

  /* TPMSealStatus — hardware key-custody health. Shows health only, never keys. */
  function TPMSealStatus({
    unknown
  }) {
    if (unknown) return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--halt-gold-ink)'
      }
    }, "\u26A0 CANNOT CONFIRM KEY SEAL \u2014 /dev/tpmrm0 unreadable (as-of 47s); treat custody as UNVERIFIED"));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u25CF",
      size: "sm"
    }, "/dev/tpmrm0 REACHABLE"), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u25CF",
      size: "sm"
    }, "PCR seal BOUND"), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "attest CERTIFIED")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "agents sealed 15 fixedTPM \xB7 3 soft-key \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "[ never shows keys ]"), " \xB7 as-of 5s"));
  }
  function App() {
    const [posture, setPosture] = React.useState('nominal'); // nominal | kill | outage
    const kill = posture === 'kill';
    const outage = posture === 'outage';
    const cols = [{
      key: 'role',
      header: 'logical role',
      render: m => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, m.role)
    }, {
      key: 'model',
      header: 'model / digest',
      render: m => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, m.model)
    }, {
      key: 'prov',
      header: 'provenance',
      render: m => /*#__PURE__*/React.createElement(TierBadge, {
        tier: "verified",
        label: "VERIFIED"
      })
    }, {
      key: 'quant',
      header: 'quant',
      render: m => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, m.quant)
    }, {
      key: 'state',
      header: 'loaded',
      render: m => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "verified",
        glyph: "\u25CF",
        size: "sm"
      }, "ONLINE")
    }];
    const items = [{
      group: 'Engine room'
    }, {
      key: 'status',
      label: 'Status',
      icon: '◉',
      active: true,
      onClick: () => {}
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "agent-runtime",
      posture: kill ? 'kill' : 'nominal',
      items: items,
      collapsed: false,
      onToggle: () => {},
      postureHref: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Agent Runtime",
      identity: "the workforce (engine room)",
      systemState: kill ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "halt",
        glyph: "\u25AE\u25AE",
        size: "sm"
      }, "G1 FREEZE") : outage ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "halt",
        glyph: "\u26CA",
        size: "sm"
      }, "SAFE-STOPPED") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        glyph: "\u25CF",
        size: "sm"
      }, "G0 NOMINAL")
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "operator",
      id: "operator:ada"
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact"
    }, "MC fleet \u25B8"), /*#__PURE__*/React.createElement(KillMirror, {
      engaged: kill,
      href: "#"
    }))), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: '8px 24px 24px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 960,
        margin: '0 auto'
      }
    }, kill ? /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '16px 0'
      }
    }, /*#__PURE__*/React.createElement(HaltBand, {
      mode: "kill",
      confirmed: 2,
      pending: 0,
      draining: 1,
      drainingDetail: "rt-9f2a \u2014 1 agent past last reversible instant",
      readOnly: true,
      reviewHref: "#",
      reviewLabel: "MC fleet",
      message: "Commanded kill. drain_state \u25CF ACTIVE \u2192 \u21C9 DRAINING \u2192 DRAINED. Drain compliance is client-side defense-in-depth; the hard stop is enforced at the Gateway chokepoint and auth revocation, not here."
    })) : null, outage ? /*#__PURE__*/React.createElement("div", {
      style: {
        margin: '16px 0'
      }
    }, /*#__PURE__*/React.createElement(HaltBand, {
      mode: "safe-stopped",
      message: "This is the safety system working, not an outage of the console. STILL TRUE: no new claims; sealed keys unusable off-host; existing kill epochs enforced. Drain posture: QUIESCED_BY_OUTAGE \u2014 inferred, not commanded.",
      stillTrue: ["no new claims", "sealed keys unusable off-host", "existing kill epochs enforced"]
    })) : null, /*#__PURE__*/React.createElement(Panel, {
      title: "Runtime instance",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "supervisor \xB7 fresh 4.1s",
        state: outage ? 'halt' : 'live',
        reading: outage ? 'cannot confirm freshness' : undefined
      })
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 13,
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement("span", null, "rt-9f2a\u2026"), /*#__PURE__*/React.createElement("span", null, "roster 18 agents"), /*#__PURE__*/React.createElement("span", null, "drain_state ", kill ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-violet-ink)'
      }
    }, "\u21C9 DRAINING") : outage ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-violet-ink)'
      }
    }, "QUIESCED_BY_OUTAGE") : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u25CF ACTIVE"))), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "engine room only"
    }, /*#__PURE__*/React.createElement("strong", null, "This runtime holds NO host credentials \xB7 cannot approve or execute work."))), /*#__PURE__*/React.createElement(Panel, {
      title: "Model stack & provenance",
      right: /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "Sigstore load-gate: \u26CA ARMED \xB7 fail-closed \xB7 last verify \u27F3 6s")
    }, /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: MODELS,
      rowKey: "role",
      reflow: false
    })), /*#__PURE__*/React.createElement(Panel, {
      title: "Local-compute headroom"
    }, /*#__PURE__*/React.createElement(EngineHeadroom, {
      stale: outage
    })), /*#__PURE__*/React.createElement(Panel, {
      title: "Key-custody \xB7 TPM seal health"
    }, /*#__PURE__*/React.createElement(TPMSealStatus, {
      unknown: outage
    })), /*#__PURE__*/React.createElement(Panel, {
      title: "Drain / kill compliance (client half)"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 13,
        color: 'var(--text-secondary)'
      }
    }, "commanded posture ", kill ? 'G1' : 'G0', " \xB7 ", kill ? 'draining' : 'not draining', ". MC owns actuation."), kill ? /*#__PURE__*/React.createElement(HonestState, {
      confirmed: 2,
      pending: 0,
      draining: 1,
      drainingDetail: "rt-9f2a \u2014 1 agent finishing"
    }) : null, /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\u26CA",
      tag: "no trigger here"
    }, /*#__PURE__*/React.createElement("strong", null, "No global kill actuator lives here."), " The hard stop is at the Gateway chokepoint + auth revocation; this surface is the client half.")))))), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        bottom: 14,
        right: 14,
        zIndex: 2000,
        display: 'flex',
        gap: 6
      }
    }, ['nominal', 'kill', 'outage'].map(p => /*#__PURE__*/React.createElement("button", {
      key: p,
      onClick: () => setPosture(p),
      style: {
        height: 28,
        padding: '0 12px',
        borderRadius: 999,
        border: '1px solid var(--border-strong)',
        background: posture === p ? 'var(--surface-control)' : 'var(--surface-raised)',
        color: posture === p ? 'var(--text-primary)' : 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        cursor: 'pointer'
      }
    }, p === 'nominal' ? 'G0' : p === 'kill' ? '▮▮ kill' : '⛊ outage'))));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/agent-runtime/ar-app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/auth/app.jsx
try { (() => {
/* Helm — auth UI kit (the reference implementation)
   The identity gateway. Hosts the identity-layer stop + per-principal
   revocation and a READ-ONLY mirror of the global kill level (Mission Control
   owns global actuation). Instrument archetype. Home of the canonical
   Audit / Provenance Inspector. */

const H = window.HelmDesignSystem_f4cb26;
const {
  NavRail,
  AppHeader,
  KillMirror,
  StopActuator,
  DataTable,
  TicketRef,
  PrincipalRef,
  TierBadge,
  Button,
  StatusPill,
  DangerAction,
  PrintedAbsence,
  FreshnessStamp,
  ErrorState
} = H;
const PRINCIPALS = [{
  id: 'operator:ada',
  kind: 'operator',
  status: 'active',
  tier: 'verified',
  seen: 'live',
  sessions: 2
}, {
  id: 'agent:patcher-07',
  kind: 'agent',
  status: 'active',
  tier: 'verified',
  seen: '12s ago',
  sessions: 1
}, {
  id: 'svc:tier-approver',
  kind: 'service',
  status: 'active',
  tier: 'verified',
  seen: '3s ago',
  sessions: 4
}, {
  id: 'agent:migrator-1',
  kind: 'agent',
  status: 'active',
  tier: 'untrusted',
  seen: '1m ago',
  sessions: 1
}, {
  id: 'operator:sam',
  kind: 'operator',
  status: 'active',
  tier: 'single',
  seen: '44m ago',
  sessions: 0
}, {
  id: 'agent:crawler-3',
  kind: 'agent',
  status: 'active',
  tier: 'single',
  seen: '1m ago',
  sessions: 1
}, {
  id: 'svc:legacy-sync',
  kind: 'service',
  status: 'disabled',
  tier: 'single',
  seen: '8d ago',
  sessions: 0
}, {
  id: 'svc:webhook-in',
  kind: 'service',
  status: 'revoked',
  tier: 'untrusted',
  seen: '2h ago',
  sessions: 0
}];
const AUDIT = [{
  t: '03:14:02',
  who: 'operator:sam',
  kind: 'operator',
  action: 'break_glass',
  target: 'vault:prod',
  outcome: 'granted',
  tier: 'single',
  chain: 'cannot-confirm'
}, {
  t: '03:12:55',
  who: 'svc:tier-approver',
  kind: 'service',
  action: 'approve',
  target: 'T-000221',
  outcome: 'recorded',
  tier: 'verified',
  chain: 'ok'
}, {
  t: '03:11:40',
  who: 'agent:migrator-1',
  kind: 'agent',
  action: 'request_grant',
  target: 'db:users',
  outcome: 'refused',
  tier: 'corroborated',
  chain: 'ok'
}, {
  t: '03:09:18',
  who: 'operator:ada',
  kind: 'operator',
  action: 'revoke',
  target: 'svc:webhook-in',
  outcome: 'done',
  tier: 'verified',
  chain: 'ok'
}, {
  t: '03:02:10',
  who: 'agent:patcher-07',
  kind: 'agent',
  action: 'mint_token',
  target: 'host-04',
  outcome: 'issued',
  tier: 'verified',
  chain: 'ok'
}];
const eyebrow = {
  fontFamily: 'var(--font-ui)',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-muted)',
  fontWeight: 600
};
const panel = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border-default)',
  borderRadius: 'var(--radius-panel)'
};
function statusPill(s) {
  if (s === 'revoked') return /*#__PURE__*/React.createElement(StatusPill, {
    tone: "danger",
    glyph: "\u26D2",
    size: "sm"
  }, "Revoked");
  if (s === 'disabled') return /*#__PURE__*/React.createElement(StatusPill, {
    tone: "neutral",
    glyph: "\u25FC",
    size: "sm"
  }, "Disabled");
  return /*#__PURE__*/React.createElement(StatusPill, {
    tone: "verified",
    glyph: "\u2714",
    size: "sm"
  }, "Active");
}

/* ---------- Principals ---------- */
function Principals({
  onOpen
}) {
  const columns = [{
    key: 'id',
    header: 'Principal',
    render: p => /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: p.kind,
      id: p.id,
      status: p.status === 'active' ? 'active' : p.status
    })
  }, {
    key: 'kind',
    header: 'Kind',
    render: p => /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-muted)',
        textTransform: 'uppercase'
      }
    }, p.kind)
  }, {
    key: 'status',
    header: 'Status',
    render: p => statusPill(p.status)
  }, {
    key: 'tier',
    header: 'Last attestation',
    render: p => /*#__PURE__*/React.createElement(TierBadge, {
      tier: p.tier
    })
  }, {
    key: 'sessions',
    header: 'Sessions',
    align: 'right',
    sortable: true,
    sortValue: p => p.sessions,
    render: p => p.sessions
  }, {
    key: 'seen',
    header: 'Last seen',
    align: 'right',
    render: p => /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: p.seen === 'live' ? undefined : p.seen,
      state: "live"
    })
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      maxWidth: 1180
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 20,
      fontWeight: 600,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Principals"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--text-muted)',
      margin: '2px 0 0'
    }
  }, "Every identity in the suite \u2014 resolved from the auth platform, never a bare display name.")), /*#__PURE__*/React.createElement(DataTable, {
    columns: columns,
    rows: PRINCIPALS,
    rowKey: "id",
    onRowClick: onOpen
  }));
}

/* ---------- Principal detail ---------- */
function PrincipalDetail({
  p,
  onBack,
  onRevoked
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      maxWidth: 820
    }
  }, /*#__PURE__*/React.createElement("button", {
    onClick: onBack,
    style: {
      ...eyebrow,
      background: 'transparent',
      border: 0,
      cursor: 'pointer',
      alignSelf: 'flex-start',
      color: 'var(--text-link)'
    }
  }, "\u2190 Back to principals"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement(PrincipalRef, {
    kind: p.kind,
    id: p.id,
    status: p.status === 'active' ? 'active' : p.status
  }), statusPill(p.status), /*#__PURE__*/React.createElement(TierBadge, {
    tier: p.tier
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...panel,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Active sessions"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 26,
      fontWeight: 600,
      color: 'var(--text-primary)',
      marginTop: 4
    }
  }, p.sessions), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-muted)'
    }
  }, "last seen ", p.seen)), /*#__PURE__*/React.createElement("div", {
    style: {
      ...panel,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Kind"), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 15,
      fontWeight: 600,
      color: 'var(--text-primary)',
      marginTop: 6,
      textTransform: 'capitalize'
    }
  }, p.kind), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      color: 'var(--text-muted)',
      marginTop: 2
    }
  }, p.kind === 'agent' ? 'An autonomous worker' : p.kind === 'operator' ? 'A human at the helm' : 'A platform service'))), /*#__PURE__*/React.createElement(PrintedAbsence, {
    why: "Segregation of duties is enforced at issuance; this console cannot relax it."
  }, /*#__PURE__*/React.createElement("strong", null, "This surface cannot let a principal approve its own work.")), /*#__PURE__*/React.createElement(PrintedAbsence, {
    glyph: "\u26CA",
    why: "auth stores only verifiers; the raw credential is never held."
  }, /*#__PURE__*/React.createElement("strong", null, "auth never displays a principal's stored credential.")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...panel,
      padding: 16,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: eyebrow
  }, "Identity actions"), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1
    }
  }), /*#__PURE__*/React.createElement(Button, {
    tone: "secondary"
  }, "Rotate keys"), p.status === 'revoked' ? /*#__PURE__*/React.createElement(StatusPill, {
    tone: "danger",
    glyph: "\u26D2"
  }, "Already revoked") : /*#__PURE__*/React.createElement(DangerAction, {
    label: "Revoke principal",
    glyph: "\u26D4",
    variant: "solid",
    title: `Revoke ${p.id}`,
    consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "This ", /*#__PURE__*/React.createElement("strong", null, "revokes"), " ", p.id, " and kills its ", p.sessions, " session(s). It moves the system toward LESS action."),
    direction: "less",
    typedIntent: p.id,
    stepUp: true,
    auditNote: "Writes a tamper-evident audit row.",
    confirmLabel: "Revoke",
    onConfirm: () => onRevoked(p.id)
  })));
}

/* ---------- Identity control (auth's own stop + read-only global mirror) ---------- */
function IdentityControl({
  idStop,
  onIdStop
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      maxWidth: 900
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 20,
      fontWeight: 600,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Identity control"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--text-muted)',
      margin: '2px 0 0'
    }
  }, "auth hosts the identity-layer stop. The global kill lives in Mission Control \u2014 shown here read-only.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...panel,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Identity-layer stop \xB7 auth owns this"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      lineHeight: '20px',
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, "Halts all token issuance and re-auth. Existing tokens still expire on their own TTL."), /*#__PURE__*/React.createElement(StopActuator, {
    level: "G1",
    engaged: idStop,
    onEngage: onIdStop,
    label: "Hold to halt issuance"
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      ...panel,
      padding: 20,
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: eyebrow
  }, "Global kill \xB7 read-only mirror"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      lineHeight: '20px',
      color: 'var(--text-secondary)',
      margin: 0
    }
  }, "The suite-wide posture, mirrored from Mission Control. Act on it there."), /*#__PURE__*/React.createElement(KillMirror, {
    engaged: false,
    href: "#",
    label: "Nominal"
  }))), idStop ? /*#__PURE__*/React.createElement(ErrorState, {
    pattern: "D",
    title: "Identity issuance halted",
    detail: "scope: auth \xB7 token minting refused"
  }, "The identity layer is safe-stopped by the operator. Existing tokens continue to their TTL; no new tokens are minted.") : null);
}

/* ---------- Audit / Provenance Inspector (canonical) ---------- */
function chainCell(c) {
  if (c === 'ok') return /*#__PURE__*/React.createElement(StatusPill, {
    tone: "verified",
    glyph: "\u2714",
    size: "sm"
  }, "Chain OK");
  if (c === 'cannot-confirm') return /*#__PURE__*/React.createElement(StatusPill, {
    tone: "halt",
    glyph: "\u25AE\u25AE",
    size: "sm"
  }, "Cannot confirm");
  return /*#__PURE__*/React.createElement(StatusPill, {
    tone: "danger",
    glyph: "\u2715",
    size: "sm"
  }, "Chain broken");
}
function AuditView() {
  const columns = [{
    key: 't',
    header: 'Time',
    mono: true,
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, r.t)
  }, {
    key: 'who',
    header: 'Who',
    render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: r.kind,
      id: r.who
    })
  }, {
    key: 'action',
    header: 'Action',
    render: r => /*#__PURE__*/React.createElement("code", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, r.action)
  }, {
    key: 'target',
    header: 'Target',
    mono: true,
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, r.target)
  }, {
    key: 'outcome',
    header: 'Outcome',
    render: r => /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: r.outcome === 'refused' ? 'var(--danger-text)' : 'var(--text-secondary)'
      }
    }, r.outcome)
  }, {
    key: 'tier',
    header: 'Provenance',
    render: r => /*#__PURE__*/React.createElement(TierBadge, {
      tier: r.tier
    })
  }, {
    key: 'chain',
    header: 'Verify',
    render: r => chainCell(r.chain)
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
      maxWidth: 1180
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 20,
      fontWeight: 600,
      color: 'var(--text-primary)',
      margin: 0
    }
  }, "Audit & provenance"), /*#__PURE__*/React.createElement("p", {
    style: {
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--text-muted)',
      margin: '2px 0 0'
    }
  }, "Append-only. Corrections are new rows. A stale or failed verify is never green \u2014 it's gold \"cannot confirm\" or red \"chain broken\".")), /*#__PURE__*/React.createElement(DataTable, {
    columns: columns,
    rows: AUDIT,
    rowKey: "t",
    reflow: false
  }));
}

/* ---------- App shell ---------- */
function App() {
  const [route, setRoute] = React.useState('principals');
  const [collapsed, setCollapsed] = React.useState(false);
  const [openP, setOpenP] = React.useState(null);
  const [idStop, setIdStop] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const goto = r => {
    setOpenP(null);
    setRoute(r);
  };
  const openDetail = p => {
    setOpenP(p);
    setRoute('principal');
  };
  const revoked = id => {
    setOpenP(null);
    setRoute('principals');
    setToast(`Revoked ${id}`);
    setTimeout(() => setToast(null), 2600);
  };
  const items = [{
    group: 'Identity'
  }, {
    key: 'principals',
    label: 'Principals',
    icon: '⬡',
    active: route === 'principals' || route === 'principal',
    onClick: () => goto('principals')
  }, {
    key: 'control',
    label: 'Identity control',
    icon: '⛊',
    active: route === 'control',
    onClick: () => goto('control')
  }, {
    group: 'Records'
  }, {
    key: 'audit',
    label: 'Audit log',
    icon: '⛓',
    active: route === 'audit',
    onClick: () => goto('audit')
  }];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      height: '100vh',
      background: 'var(--bg-app)'
    }
  }, /*#__PURE__*/React.createElement(NavRail, {
    current: "auth",
    posture: "nominal",
    items: items,
    collapsed: collapsed,
    onToggle: setCollapsed,
    postureHref: "#"
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement(AppHeader, {
    appName: "auth",
    identity: "identity gateway \xB7 reference implementation",
    systemState: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "3s ago"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, PRINCIPALS.filter(p => p.status === 'active').length, " active principals"))
  }, /*#__PURE__*/React.createElement(KillMirror, {
    engaged: false,
    href: "#"
  })), /*#__PURE__*/React.createElement("main", {
    style: {
      flex: 1,
      overflow: 'auto',
      padding: 24
    }
  }, route === 'principals' ? /*#__PURE__*/React.createElement(Principals, {
    onOpen: openDetail
  }) : null, route === 'principal' && openP ? /*#__PURE__*/React.createElement(PrincipalDetail, {
    p: openP,
    onBack: () => goto('principals'),
    onRevoked: revoked
  }) : null, route === 'control' ? /*#__PURE__*/React.createElement(IdentityControl, {
    idStop: idStop,
    onIdStop: () => setIdStop(true)
  }) : null, route === 'audit' ? /*#__PURE__*/React.createElement(AuditView, null) : null)), toast ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      background: 'var(--surface-raised)',
      border: '1px solid var(--danger)',
      borderRadius: 'var(--radius-control)',
      padding: '10px 16px',
      fontFamily: 'var(--font-ui)',
      fontSize: 13,
      color: 'var(--danger-text)',
      boxShadow: 'var(--shadow-dialog)'
    }
  }, "\u26D2 ", toast) : null);
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/auth/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/board/app.jsx
try { (() => {
/* Helm — Board · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.BD_DATA;
  const {
    NavRail,
    AppHeader,
    KillMirror,
    FreshnessStamp,
    StatusPill
  } = H;
  const SC = window.BDScreens;
  function App() {
    const [route, setRoute] = React.useState('board');
    const [posture, setPosture] = React.useState('nominal');
    const [collapsed, setCollapsed] = React.useState(false);
    const [ticket, setTicket] = React.useState(null);
    const [approvalSel, setApprovalSel] = React.useState(null);
    const [consoleTab, setConsoleTab] = React.useState('wip');
    const ctx = {
      posture,
      approvalSel,
      consoleTab,
      goto: r => {
        setTicket(null);
        setApprovalSel(null);
        setRoute(r);
      },
      openTicket: t => {
        setTicket(t);
        setRoute('ticket');
      },
      openApproval: t => {
        setApprovalSel(t);
        setRoute('approvals');
      }
    };
    const awaiting = D.TICKETS.filter(t => t.state === 'awaiting_approval').length;
    const items = [{
      group: 'Coordination'
    }, {
      key: 'board',
      label: 'Board',
      icon: '▦',
      active: route === 'board' || route === 'ticket',
      onClick: () => ctx.goto('board')
    }, {
      key: 'approvals',
      label: 'Approvals',
      icon: '▲',
      badge: awaiting,
      active: route === 'approvals',
      onClick: () => {
        setApprovalSel(null);
        setRoute('approvals');
      }
    }, {
      key: 'ceremonies',
      label: 'Ceremonies',
      icon: '◎',
      active: route === 'ticket' && ticket && ticket.ceremony,
      onClick: () => ctx.openTicket(D.byId['T-000097'])
    }, {
      group: 'Control'
    }, {
      key: 'console',
      label: 'Console',
      icon: '⚙',
      active: route === 'console',
      onClick: () => {
        setConsoleTab('wip');
        ctx.goto('console');
      }
    }, {
      key: 'audit',
      label: 'Audit',
      icon: '⛓',
      active: route === 'audit',
      onClick: () => {
        setConsoleTab('audit');
        setTicket(null);
        setApprovalSel(null);
        setRoute('audit');
      }
    }];
    let screen = null;
    if (route === 'board') screen = /*#__PURE__*/React.createElement(SC.Kanban, {
      ctx: ctx
    });else if (route === 'ticket' && ticket) screen = /*#__PURE__*/React.createElement(SC.TicketDetail, {
      t: ticket,
      ctx: ctx
    });else if (route === 'approvals') screen = /*#__PURE__*/React.createElement(SC.Approvals, {
      key: approvalSel ? approvalSel.id : 'q',
      ctx: ctx
    });else if (route === 'console') screen = /*#__PURE__*/React.createElement(SC.Console, {
      key: 'c-' + consoleTab,
      ctx: ctx
    });else if (route === 'audit') screen = /*#__PURE__*/React.createElement(SC.Console, {
      key: 'a-' + consoleTab,
      ctx: {
        ...ctx,
        consoleTab: 'audit'
      }
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "board",
      posture: posture === 'kill' ? 'kill' : 'nominal',
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Board",
      identity: "coordination spine",
      systemState: posture === 'kill' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "halt",
        glyph: "\u25AE\u25AE",
        size: "sm"
      }, "G1 freeze") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        glyph: "\u25CF",
        size: "sm"
      }, "G0 normal")
    }, /*#__PURE__*/React.createElement(KillMirror, {
      engaged: posture === 'kill',
      href: "#",
      label: posture === 'kill' ? 'Kill engaged' : 'Nominal'
    })), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, screen)), /*#__PURE__*/React.createElement("button", {
      onClick: () => setPosture(p => p === 'kill' ? 'nominal' : 'kill'),
      style: {
        position: 'fixed',
        bottom: 14,
        right: 14,
        zIndex: 2000,
        height: 28,
        padding: '0 12px',
        borderRadius: 999,
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-raised)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        cursor: 'pointer'
      }
    }, posture === 'kill' ? '↺ clear kill (demo)' : '▮▮ simulate kill (demo)'));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/board/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/board/bd-data.jsx
try { (() => {
/* Helm — Board · data model
   The coordination spine: tickets across the 11-state lifecycle, the Board-owned
   approval record, ceremony state, escalations, standing triggers, WIP policy,
   violations, and the (non-hash-chained) audit log. Exposed as window.BD_DATA. */
(function () {
  const EPOCH = 4471;

  // 11-state lifecycle column defs (approved+executing share the "hot" column).
  const COLUMNS = [{
    key: 'todo',
    glyph: '○',
    label: 'todo',
    total: 12
  }, {
    key: 'in_progress',
    glyph: '◐',
    label: 'in_progress',
    total: 7
  }, {
    key: 'awaiting_approval',
    glyph: '▲',
    label: 'awaiting_approval',
    total: 4
  }, {
    key: 'hot',
    glyph: '✔',
    label: 'approved + executing',
    total: 3,
    states: ['approved', 'executing']
  }, {
    key: 'verifying',
    glyph: '⧗',
    label: 'verifying',
    total: 2
  }, {
    key: 'needs_review',
    glyph: '◈',
    label: 'needs_review',
    total: 5
  }];
  const T = o => Object.assign({
    lane: 'lightweight',
    taint: 'single',
    priority: 'P2',
    deps: {
      blocks: [],
      blockedBy: []
    }
  }, o);
  const TICKETS = [T({
    id: 'T-000142',
    title: 'Curate Wazuh alert → remediation plan',
    type: 'curation',
    state: 'todo',
    lane: 'full',
    taint: 'untrusted',
    priority: 'P1',
    claimedBy: null,
    epic: 'T-000100',
    host: 'web-prod-02'
  }), T({
    id: 'T-000150',
    title: 'Add rate-limit to /ingest',
    type: 'feature',
    state: 'todo',
    taint: 'verified',
    priority: 'P3',
    claimedBy: null,
    epic: 'T-000100'
  }), T({
    id: 'T-000151',
    title: 'Rotate quarterly TLS certs',
    type: 'chore',
    state: 'todo',
    taint: 'verified',
    priority: 'P2',
    claimedBy: null
  }), T({
    id: 'T-000118',
    title: 'Reindex search shard 12',
    type: 'task',
    state: 'in_progress',
    taint: 'single',
    priority: 'P2',
    claimedBy: 'agent:patcher-07',
    kind: 'agent',
    fence: {
      gen: 47,
      lease: '04:12',
      hb: '0.8s',
      state: 'held',
      holdKind: 'claim'
    },
    epic: 'T-000100'
  }), T({
    id: 'T-000131',
    title: 'Backfill audit index',
    type: 'task',
    state: 'in_progress',
    taint: 'single',
    priority: 'P3',
    claimedBy: 'agent:indexer-02',
    kind: 'agent',
    fence: {
      gen: 31,
      lease: '00:41',
      hb: '6.4s',
      state: 'aging',
      holdKind: 'claim'
    }
  }), T({
    id: 'T-000097',
    title: 'Patch CVE-2026-1234 on web fleet',
    type: 'package_update',
    state: 'awaiting_approval',
    lane: 'full',
    taint: 'untrusted',
    priority: 'P1',
    claimedBy: 'agent:patcher-07',
    kind: 'agent',
    host: 'web-prod-02',
    epic: 'T-000100',
    spawnedBy: 'agent:patcher-07',
    depth: 2,
    cap: 4,
    plan: {
      notesRev: 'nt-8831@7',
      hash: 'sha256:9f2c…a1e0',
      line: 'Patch CVE-2026-1234 on web-01/02/03 · canary web-03 first · rollback: snapshot',
      radius: '3 hosts, tier-2, in-window 02:00–04:00',
      verify: 'Wazuh active→solved'
    },
    approval: null,
    allowlist: [{
      seq: 1,
      playbook: 'nginx.upgrade',
      params: 'sha256:a1…',
      host: 'web-prod-02',
      cls: 'standard'
    }, {
      seq: 2,
      playbook: 'service.restart',
      params: 'sha256:b2…',
      host: 'web-prod-02',
      cls: 'standard'
    }],
    cmdb: {
      mode: 'ask',
      inWindow: true,
      decision: 'cmdb-77f2',
      age: '3s'
    },
    ceremony: {
      phases: [['triage', 'done'], ['recon', 'done'], ['planning', 'current'], ['adversarial_review', 'todo'], ['backlog', 'todo'], ['execute', 'todo'], ['retro', 'todo']],
      round: [2, 3],
      timebox: '07:41',
      paused: false,
      veto: 'raised',
      dissent: 1,
      poDecision: 'pending',
      roster: {
        PO: 'agent:po-01',
        SM: 'agent:sm-01',
        SEC: 'agent:sec-03',
        AR: 'agent:ar-01'
      }
    }
  }), T({
    id: 'T-000210',
    title: 'Restart web-api on host-07',
    type: 'task',
    state: 'awaiting_approval',
    lane: 'lightweight',
    taint: 'single',
    priority: 'P2',
    claimedBy: 'agent:sre-01',
    kind: 'agent',
    host: 'host-07',
    plan: {
      notesRev: 'nt-8840@2',
      hash: 'sha256:c4…d1',
      line: 'Restart web-api (graceful drain 30s)',
      radius: '1 service, tier-3',
      verify: 'health 200 ×3'
    },
    allowlist: [{
      seq: 1,
      playbook: 'service.restart',
      params: 'sha256:c4…',
      host: 'host-07',
      cls: 'standard'
    }],
    cmdb: {
      mode: 'ask',
      inWindow: true,
      decision: 'cmdb-77f9',
      age: '5s'
    },
    approval: null
  }), T({
    id: 'T-000081',
    title: 'Promote canary to 100%',
    type: 'deploy',
    state: 'executing',
    lane: 'full',
    taint: 'verified',
    priority: 'P1',
    claimedBy: 'agent:deployer-2',
    kind: 'agent',
    host: 'prod-fleet',
    fence: {
      gen: 48,
      lease: '01:03',
      hb: '0.7s',
      state: 'held',
      holdKind: 'execution'
    },
    approval: {
      id: 'appr-4471a',
      actionClass: 'standard',
      approver: 'operator:ada',
      fourEyes: 'satisfied',
      consumedBy: 'run-90f2',
      runId: 'run-90f2'
    }
  }), T({
    id: 'T-000088',
    title: 'Apply migration 0042',
    type: 'migration',
    state: 'approved',
    lane: 'full',
    taint: 'verified',
    priority: 'P1',
    claimedBy: 'agent:migrator-1',
    kind: 'agent',
    host: 'db-prod-01',
    approval: {
      id: 'appr-4470c',
      actionClass: 'sod-critical',
      approver: 'operator:ada',
      fourEyes: 'satisfied',
      consumedBy: null,
      runId: null
    }
  }), T({
    id: 'T-000076',
    title: 'Verify Wazuh alert resolved',
    type: 'verify',
    state: 'verifying',
    taint: 'single',
    priority: 'P2',
    claimedBy: 'agent:sre-01',
    kind: 'agent',
    fence: {
      gen: 51,
      lease: '01:44',
      hb: '1.9s',
      state: 'aging',
      holdKind: 'claim'
    },
    host: 'nas-01'
  }), T({
    id: 'T-000070',
    title: 'Weekly digest — human review',
    type: 'review',
    state: 'needs_review',
    taint: 'single',
    priority: 'P3',
    claimedBy: 'agent:summarizer-9',
    kind: 'agent',
    reviewReason: 'window_ambiguity'
  }), T({
    id: 'T-000188',
    title: 'Recon plan escalated',
    type: 'plan',
    state: 'needs_review',
    taint: 'single',
    priority: 'P2',
    claimedBy: 'agent:recon-05',
    kind: 'agent',
    reviewReason: 'board_escalation'
  }),
  // blocked swimlane
  T({
    id: 'T-000055',
    title: 'Enable feature flag rollout',
    type: 'task',
    state: 'blocked',
    taint: 'verified',
    priority: 'P2',
    claimedBy: 'agent:deployer-2',
    kind: 'agent',
    blockedReason: 'dep-unmet',
    deps: {
      blocks: [],
      blockedBy: ['T-000088']
    }
  }), T({
    id: 'T-000061',
    title: 'Compact log volume',
    type: 'chore',
    state: 'blocked',
    taint: 'single',
    priority: 'P3',
    claimedBy: 'agent:archivist-5',
    kind: 'agent',
    blockedReason: 'superseded',
    fence: {
      gen: 46,
      state: 'superseded',
      supBy: 47,
      holdKind: 'claim'
    }
  }), T({
    id: 'T-000064',
    title: 'Rebuild CI cache',
    type: 'chore',
    state: 'blocked',
    taint: 'verified',
    priority: 'P3',
    claimedBy: 'agent:sre-01',
    kind: 'agent',
    blockedReason: 'held',
    fence: {
      gen: 20,
      lease: '—',
      hb: '—',
      state: 'held',
      holdKind: 'claim'
    }
  }),
  // terminal archive
  T({
    id: 'T-000040',
    title: 'Patch staging hosts',
    type: 'package_update',
    state: 'done',
    taint: 'verified',
    priority: 'P2',
    claimedBy: 'agent:patcher-07',
    kind: 'agent'
  }), T({
    id: 'T-000037',
    title: 'Rollout aborted — canary failed',
    type: 'deploy',
    state: 'failed',
    taint: 'verified',
    priority: 'P1',
    claimedBy: 'agent:deployer-2',
    kind: 'agent'
  }), T({
    id: 'T-000033',
    title: 'Duplicate ticket',
    type: 'task',
    state: 'cancelled',
    taint: 'single',
    priority: 'P3',
    claimedBy: null
  })];
  const byId = {};
  TICKETS.forEach(t => {
    byId[t.id] = t;
  });
  const ESCALATIONS = [{
    kind: 'A1',
    ticket: 'T-000188',
    reason: 'timebox_expired',
    detail: 'huddle round 3 stalled',
    age: '4m'
  }, {
    kind: 'A1',
    ticket: 'T-000201',
    reason: 'unresolved_veto',
    detail: 'AR veto open past cap',
    age: '11m'
  }, {
    kind: 'A2',
    ticket: 'T-000230',
    reason: 'breakglass_review_ticket',
    detail: 'break-glass used 03:14 — human clear',
    age: '44m'
  }, {
    kind: 'quarantine',
    ticket: 'T-000142',
    reason: 'unmapped_wazuh_agent',
    detail: 'host-originated · UNTRUSTED · confirm CMDB mapping',
    age: '2m'
  }, {
    kind: 'reaper',
    ticket: null,
    reason: 'outage_gate_hold',
    detail: 'fleet-silence 0.62 · BOARD_FLEET_SIZE 20',
    age: '30s',
    held: 8
  }];
  const TRIGGERS = [{
    name: 'nightly-patch-scan',
    kind: 'schedule',
    spec: 'cron 0 2 * * *',
    filter: '—',
    child: 'patch.plan',
    suppress: true
  }, {
    name: 'wazuh-critical',
    kind: 'event',
    spec: 'webhook',
    filter: 'severity>=12',
    child: 'curation',
    suppress: false,
    webhook: {
      hmac: 'ok',
      lastFire: '2m ago'
    }
  }, {
    name: 'weekly-digest',
    kind: 'schedule',
    spec: 'cron 0 9 * * 1',
    filter: '—',
    child: 'digest',
    suppress: true
  }, {
    name: 'manual-kickoff',
    kind: 'manual',
    spec: '—',
    filter: '—',
    child: 'any',
    suppress: false
  }];
  const WIP = {
    global: [22, 30],
    perAgent: 4,
    perTeam: 8,
    lineageCap: 4
  };
  const VIOLATIONS = [{
    at: '09:42:10',
    who: 'agent:migrator-1',
    kind: 'agent',
    verb: 'illegal_transition',
    target: 'T-000088',
    outcome: 'refused',
    note: 'agent tried → done'
  }, {
    at: '09:31:44',
    who: 'agent:recon-05',
    kind: 'agent',
    verb: 'stale_fencing',
    target: 'T-000061',
    outcome: 'refused',
    note: 'write under gen46 (superseded)'
  }, {
    at: '08:58:02',
    who: 'operator:sam',
    kind: 'operator',
    verb: 'four_eyes_violation',
    target: 'T-000210',
    outcome: 'refused',
    note: 'approver == proposer'
  }];
  const AUDIT = [{
    at: '09:44:02',
    who: 'operator:ada',
    kind: 'operator',
    verb: 'approve',
    target: 'T-000081',
    outcome: 'minted',
    prov: 'verified'
  }, {
    at: '09:41:20',
    who: 'agent:patcher-07',
    kind: 'agent',
    verb: 'claim',
    target: 'T-000118',
    outcome: 'granted',
    prov: 'single'
  }, {
    at: '09:39:05',
    who: 'svc:board-watchdog',
    kind: 'service',
    verb: 'escalate',
    target: 'T-000188',
    outcome: 'filed',
    prov: 'verified'
  }, {
    at: '09:36:41',
    who: 'agent:sre-01',
    kind: 'agent',
    verb: 'transition',
    target: 'T-000076',
    outcome: 'verifying',
    prov: 'single'
  }];
  window.BD_DATA = {
    EPOCH,
    COLUMNS,
    TICKETS,
    byId,
    ESCALATIONS,
    TRIGGERS,
    WIP,
    VIOLATIONS,
    AUDIT,
    blocked: TICKETS.filter(t => t.state === 'blocked'),
    archive: TICKETS.filter(t => ['done', 'failed', 'cancelled'].includes(t.state)),
    ticketsIn: col => TICKETS.filter(t => col.states ? col.states.includes(t.state) : t.state === col.key)
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/board/bd-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/board/bd-parts.jsx
try { (() => {
/* Helm — Board · app-specific components. Exposed as window.BDParts.
   Each composes shared design-system chips; none redraws a shared entity. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    StatusPill,
    TicketRef,
    PrincipalRef,
    TierBadge,
    FenceState,
    ReviewChip,
    DataTable,
    Button
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panel = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };
  const STATE_MAP = {
    todo: {
      tone: 'neutral',
      glyph: '○'
    },
    in_progress: {
      tone: 'interactive',
      glyph: '◐'
    },
    awaiting_approval: {
      tone: 'attention',
      glyph: '▲'
    },
    approved: {
      tone: 'verified',
      glyph: '✔'
    },
    executing: {
      tone: 'interactive',
      glyph: '▸'
    },
    verifying: {
      tone: 'attention',
      glyph: '⧗'
    },
    needs_review: {
      tone: 'attention',
      glyph: '◈'
    },
    done: {
      tone: 'verified',
      glyph: '✔'
    },
    failed: {
      tone: 'danger',
      glyph: '✕'
    },
    cancelled: {
      tone: 'neutral',
      glyph: '⊘'
    },
    blocked: {
      tone: 'attention',
      glyph: '⚠'
    }
  };
  function statePill(state, size) {
    const m = STATE_MAP[state] || STATE_MAP.todo;
    return /*#__PURE__*/React.createElement(StatusPill, {
      tone: m.tone,
      glyph: m.glyph,
      size: size
    }, state);
  }
  function taintBadge(taint) {
    const map = {
      untrusted: 'untrusted',
      single: 'single',
      verified: 'verified',
      cross: 'corroborated'
    };
    return /*#__PURE__*/React.createElement(TierBadge, {
      tier: map[taint] || 'single'
    });
  }
  // lane = a tier-FAMILY companion label; NEVER on the gold ramp.
  function LaneBadge({
    lane
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        height: 17,
        padding: '0 6px',
        borderRadius: 999,
        ...mono,
        fontSize: 10,
        color: 'var(--text-muted)',
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-control)'
      }
    }, "lane:", lane);
  }

  /* Kanban card — all shared chips, no bespoke entity. */
  function TicketCard({
    t,
    onOpen,
    hot
  }) {
    return /*#__PURE__*/React.createElement("div", {
      role: "button",
      tabIndex: 0,
      onClick: () => onOpen(t),
      onKeyDown: e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(t);
        }
      },
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 7,
        textAlign: 'left',
        width: '100%',
        cursor: 'pointer',
        ...panel,
        padding: 10
      },
      onMouseEnter: e => e.currentTarget.style.borderColor = 'var(--border-strong)',
      onMouseLeave: e => e.currentTarget.style.borderColor = 'var(--border-default)'
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: t.id
    }), t.epic ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--text-disabled)'
      }
    }, "epic \u25B8 ", t.epic) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        lineHeight: '16px',
        color: 'var(--text-primary)',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }
    }, t.title), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--text-muted)'
      }
    }, t.type), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--text-muted)'
      }
    }, "\xB7 ", t.priority), statePill(t.state, 'sm')), t.claimedBy ? /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: t.kind || 'agent',
      id: t.claimedBy
    }) : null, t.fence ? /*#__PURE__*/React.createElement(FenceState, {
      gen: t.fence.gen,
      lease: t.fence.state !== 'superseded' ? t.fence.lease : undefined,
      heartbeat: t.fence.hb && t.fence.hb !== '—' ? t.fence.hb : undefined,
      state: t.fence.state,
      supersededBy: t.fence.supBy
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, taintBadge(t.taint), t.lane ? /*#__PURE__*/React.createElement(LaneBadge, {
      lane: t.lane
    }) : null), t.state === 'needs_review' ? /*#__PURE__*/React.createElement(ReviewChip, {
      reason: t.reviewReason,
      href: "#"
    }) : null, t.state === 'awaiting_approval' ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--signal-cyan)'
      }
    }, "\u2192 approval queue") : null);
  }

  /* LifecycleKanban — column-per-state container + blocked swimlane + archive. */
  function LifecycleKanban({
    data,
    onOpen
  }) {
    const [archiveOpen, setArchiveOpen] = React.useState(false);
    const archCols = [{
      key: 'id',
      header: 'Ticket',
      render: t => /*#__PURE__*/React.createElement(TicketRef, {
        id: t.id
      })
    }, {
      key: 'title',
      header: 'Title',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--text-secondary)'
        }
      }, t.title)
    }, {
      key: 'state',
      header: 'State',
      render: t => statePill(t.state, 'sm')
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 4,
        alignItems: 'flex-start'
      }
    }, data.COLUMNS.map(col => {
      const cards = data.ticketsIn(col);
      return /*#__PURE__*/React.createElement("div", {
        key: col.key,
        style: {
          flex: '0 0 232px',
          width: 232,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '2px 2px 6px',
          borderBottom: '1px solid var(--border-default)'
        }
      }, statePill(col.states ? 'executing' : col.key, 'sm'), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)'
        }
      }, col.label), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, col.total)), cards.length ? cards.map(t => /*#__PURE__*/React.createElement(TicketCard, {
        key: t.id,
        t: t,
        onOpen: onOpen,
        hot: !!col.states
      })) : /*#__PURE__*/React.createElement("div", {
        style: {
          ...eyebrow,
          fontSize: 10,
          color: 'var(--text-disabled)',
          textTransform: 'none',
          letterSpacing: 0,
          padding: '10px 4px',
          fontFamily: 'var(--font-ui)'
        }
      }, "Nothing here yet."));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: '0 0 180px',
        width: 180,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '2px 2px 6px',
        borderBottom: '1px solid var(--border-default)'
      }
    }, statePill('done', 'sm'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-secondary)'
      }
    }, "done"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, data.archive.length)), /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "compact",
      onClick: () => setArchiveOpen(v => !v)
    }, archiveOpen ? 'Hide archive' : 'Archive ▸'))), archiveOpen ? /*#__PURE__*/React.createElement(DataTable, {
      columns: archCols,
      rows: data.archive,
      rowKey: "id",
      onRowClick: onOpen
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-panel)',
        padding: '10px 14px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow,
        color: 'var(--state-amber-ink)'
      }
    }, "\u25B8 blocked (", data.blocked.length, ")"), data.blocked.map(t => /*#__PURE__*/React.createElement("span", {
      key: t.id,
      role: "button",
      tabIndex: 0,
      onClick: () => onOpen(t),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'transparent',
        border: 0,
        cursor: 'pointer'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: t.id
    }), t.blockedReason === 'superseded' ? /*#__PURE__*/React.createElement(FenceState, {
      gen: t.fence.gen,
      supersededBy: t.fence.supBy,
      state: "superseded"
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, t.blockedReason))))));
  }

  /* CeremonyRibbon — the ceremony state machine (read-only display of server authority). */
  function CeremonyRibbon({
    c
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        ...mono,
        fontSize: 12
      }
    }, c.phases.map(([name, st], i) => /*#__PURE__*/React.createElement(React.Fragment, {
      key: name
    }, i > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "\u2500") : null, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        color: st === 'done' ? 'var(--state-green-ink)' : st === 'current' ? 'var(--signal-cyan-ink)' : 'var(--text-disabled)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, st === 'done' ? '●' : st === 'current' ? '◉' : '○'), name)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: mono
    }, "round ", c.round[0], "/", c.round[1]), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u23F1"), /*#__PURE__*/React.createElement("span", {
      style: mono
    }, c.timebox, " remaining"), c.paused ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      size: "sm"
    }, "paused") : null), /*#__PURE__*/React.createElement("span", null, "AR veto: ", c.veto === 'raised' ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u25B2",
      size: "sm"
    }, "raised") : /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "clear"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "roster:"), Object.entries(c.roster).map(([role, sub]) => /*#__PURE__*/React.createElement("span", {
      key: role,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow,
        fontSize: 10
      }
    }, role), /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: sub,
      href: "#"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexWrap: 'wrap',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "AR grounded dissent: ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714 ", c.dissent, " cited"), " ", /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: 'var(--text-link)'
      }
    }, "recon note \u25B8")), /*#__PURE__*/React.createElement("span", null, "PO decision-of-record: ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, "\u25CB ", c.poDecision))));
  }

  /* TicketLineageTree — parent→child ticket lineage (distinct from MC's agent spawn tree). */
  function TicketLineageTree({
    nodes,
    depth,
    cap
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        lineHeight: '22px'
      }
    }, nodes.map((n, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        paddingLeft: n.indent * 18,
        color: n.here ? 'var(--text-primary)' : 'var(--text-secondary)'
      }
    }, n.indent > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "\u2514 ") : null, /*#__PURE__*/React.createElement(TicketRef, {
      id: n.id,
      href: "#"
    }), " ", statePill(n.state, 'sm'), n.by ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, " \xB7 ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: n.by,
      href: "#"
    })) : null, n.here ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--signal-cyan)'
      }
    }, " \u2190 here") : null)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        color: depth >= cap ? 'var(--state-amber-ink)' : 'var(--text-muted)'
      }
    }, "lineage_depth ", depth, " / cap ", cap, depth >= cap ? ' ▲' : ''));
  }
  window.BDParts = {
    statePill,
    taintBadge,
    LaneBadge,
    TicketCard,
    LifecycleKanban,
    CeremonyRibbon,
    TicketLineageTree,
    eyebrow,
    mono,
    panel
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/board/bd-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/board/bd-screens.jsx
try { (() => {
/* Helm — Board · screens. Exposed as window.BDScreens.
   Instrument archetype, dark-only. The Board mints the approval RECORD; MC owns
   the canonical review QUEUE — Approvals here is a Board-scoped filter of it. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.BD_DATA;
  const P = window.BDParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    TierBadge,
    StatusPill,
    FenceState,
    ReviewChip,
    FreshnessStamp,
    Button,
    DangerAction,
    ConfirmFriction,
    HaltBand,
    PrintedAbsence,
    Input,
    ErrorState
  } = H;
  const {
    statePill,
    taintBadge,
    LaneBadge,
    LifecycleKanban,
    CeremonyRibbon,
    TicketLineageTree,
    eyebrow,
    mono,
    panel
  } = P;
  function Head({
    crumb,
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, crumb ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, crumb) : null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        lineHeight: '26px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '2px 0 0'
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '82ch'
      }
    }, sub) : null), right);
  }
  const Section = ({
    title,
    children,
    right
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      ...panel,
      padding: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: eyebrow
  }, title), right), children);

  /* ===== 1 · Lifecycle Kanban ===== */
  function Kanban({
    ctx
  }) {
    const [view, setView] = React.useState('kanban');
    const filters = ['team ▾', 'type ▾', 'host ▾', 'taint ▾', 'lane ▾'];
    const tableCols = [{
      key: 'id',
      header: 'Ticket',
      render: t => /*#__PURE__*/React.createElement(TicketRef, {
        id: t.id
      })
    }, {
      key: 'title',
      header: 'Title',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--text-secondary)'
        }
      }, t.title)
    }, {
      key: 'state',
      header: 'State',
      render: t => statePill(t.state, 'sm')
    }, {
      key: 'claimedBy',
      header: 'Claimed by',
      render: t => t.claimedBy ? /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: t.kind || 'agent',
        id: t.claimedBy
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }, {
      key: 'taint',
      header: 'Provenance',
      render: t => taintBadge(t.taint)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Lifecycle board",
      sub: "The coordination spine \u2014 work tracked, atomically claimed, its host lock fenced. The Board is the fencing authority.",
      right: /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "SYSTEM STATE: ", ctx.posture === 'kill' ? 'G1 freeze' : '● G0 normal', " \xB7 epoch ", D.EPOCH, " \u27F3 0.3s")
    }), ctx.posture === 'kill' ? /*#__PURE__*/React.createElement(HaltBand, {
      mode: "kill",
      readOnly: true,
      reviewHref: "#",
      reviewLabel: "Review halt in Mission Control",
      confirmed: 12,
      pending: 2,
      draining: 1,
      pendingCountdown: "1:48",
      message: "Board is in the kill chain but hosts no actuator. At G1, no new claims or approval grants \u2014 existing state honored."
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "/ filter:"), filters.map(f => /*#__PURE__*/React.createElement("button", {
      key: f,
      style: {
        height: 28,
        padding: '0 10px',
        borderRadius: 'var(--radius-control)',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-control)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        cursor: 'pointer'
      }
    }, f)), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'inline-flex',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-control)',
        overflow: 'hidden'
      }
    }, ['kanban', 'table'].map(v => /*#__PURE__*/React.createElement("button", {
      key: v,
      onClick: () => setView(v),
      style: {
        padding: '5px 12px',
        border: 0,
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 500,
        textTransform: 'capitalize',
        background: view === v ? 'var(--signal-cyan-wash)' : 'transparent',
        color: view === v ? 'var(--signal-cyan-ink)' : 'var(--text-muted)'
      }
    }, v)))), view === 'kanban' ? /*#__PURE__*/React.createElement(LifecycleKanban, {
      data: D,
      onOpen: ctx.openTicket
    }) : /*#__PURE__*/React.createElement(DataTable, {
      columns: tableCols,
      rows: D.TICKETS,
      rowKey: "id",
      onRowClick: ctx.openTicket
    }));
  }

  /* ===== 2 · Ticket Detail + Ceremony Ribbon ===== */
  function TicketDetail({
    t,
    ctx
  }) {
    const lineage = [{
      id: t.epic || 'T-000100',
      label: '',
      state: 'in_progress',
      indent: 0
    }, {
      id: t.id,
      state: t.state,
      indent: 1,
      here: true,
      by: t.claimedBy
    }, {
      id: 'T-000131',
      state: 'in_progress',
      indent: 2,
      by: 'agent:patcher-09'
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 880
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('board'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        color: 'var(--text-link)'
      }
    }, "\u2190 Back to board"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: t.id
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, t.title), statePill(t.state, 'sm')), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: mono
    }, t.type), t.lane ? /*#__PURE__*/React.createElement(LaneBadge, {
      lane: t.lane
    }) : null, taintBadge(t.taint), /*#__PURE__*/React.createElement("span", {
      style: mono
    }, t.priority), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "\xB7 epic \u25B8 ", t.epic || '—', " \xB7 lineage_depth ", t.depth || 1, " / ", t.cap || 4)), t.ceremony ? /*#__PURE__*/React.createElement(CeremonyRibbon, {
      c: t.ceremony
    }) : null, /*#__PURE__*/React.createElement(Section, {
      title: "Plan / artifact \u2014 Notes rev pinned",
      right: /*#__PURE__*/React.createElement("a", {
        href: "#",
        style: {
          color: 'var(--text-link)',
          fontFamily: 'var(--font-ui)',
          fontSize: 12
        }
      }, "open in Notes \u2197")
    }, t.plan ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        lineHeight: '23px',
        color: 'var(--text-primary)',
        margin: '0 0 8px'
      }
    }, t.plan.line), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "rev ", t.plan.notesRev, " \xB7 plan_hash ", t.plan.hash)) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13
      }
    }, "No plan slice attached.")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Section, {
      title: "Host lock / fencing"
    }, t.fence ? /*#__PURE__*/React.createElement(FenceState, {
      gen: t.fence.gen,
      lease: t.fence.state !== 'superseded' ? t.fence.lease : undefined,
      heartbeat: t.fence.hb && t.fence.hb !== '—' ? t.fence.hb : undefined,
      state: t.fence.state,
      supersededBy: t.fence.supBy
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13
      }
    }, "No host lock held."), t.fence && t.fence.holdKind ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 6
      }
    }, "hold_kind: ", t.fence.holdKind, t.fence.holdKind === 'execution' ? ' (never reaped)' : '') : null), /*#__PURE__*/React.createElement(Section, {
      title: "Dependencies"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", null, "blocked-by: ", t.deps.blockedBy.length ? t.deps.blockedBy.map(d => /*#__PURE__*/React.createElement(TicketRef, {
      key: d,
      id: d
    })) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "none")), /*#__PURE__*/React.createElement("div", null, "blocks: ", t.deps.blocks.length ? t.deps.blocks.map(d => /*#__PURE__*/React.createElement(TicketRef, {
      key: d,
      id: d
    })) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "none"))))), /*#__PURE__*/React.createElement(Section, {
      title: "Approval record \u2014 Board-owned"
    }, t.approval ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 18,
        flexWrap: 'wrap',
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "id ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-primary)'
      }
    }, t.approval.id)), /*#__PURE__*/React.createElement("span", null, "action_class ", t.approval.actionClass), /*#__PURE__*/React.createElement("span", null, "approver ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "operator",
      id: t.approval.approver
    })), /*#__PURE__*/React.createElement("span", null, "four-eyes ", /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, t.approval.fourEyes)), /*#__PURE__*/React.createElement("span", null, "consumed_by ", t.approval.consumedBy || '—')) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)'
      }
    }, "None yet."), t.state === 'awaiting_approval' ? /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "compact",
      onClick: () => ctx.openApproval(t)
    }, "Go to approval decision \u2192") : null)), /*#__PURE__*/React.createElement(Section, {
      title: "Lineage"
    }, /*#__PURE__*/React.createElement(TicketLineageTree, {
      nodes: lineage,
      depth: t.depth || 2,
      cap: t.cap || 4
    })));
  }

  /* ===== 3 · Approvals (Board-scoped filter of ReviewQueue) + Decision ===== */
  function Approvals({
    ctx
  }) {
    const [sel, setSel] = React.useState(ctx.approvalSel || null);
    const rows = D.TICKETS.filter(t => t.state === 'awaiting_approval');
    if (sel) return /*#__PURE__*/React.createElement(ApprovalDecision, {
      t: sel,
      ctx: ctx,
      onBack: () => setSel(null)
    });
    const cols = [{
      key: 'id',
      header: 'Ticket',
      render: t => /*#__PURE__*/React.createElement(TicketRef, {
        id: t.id,
        href: "#"
      })
    }, {
      key: 'gate',
      header: 'Gate',
      render: () => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "attention",
        glyph: "\u25B2",
        size: "sm"
      }, "awaiting_approval")
    }, {
      key: 'proposer',
      header: 'Proposer',
      render: t => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: t.kind || 'agent',
        id: t.claimedBy
      })
    }, {
      key: 'taint',
      header: 'Provenance',
      render: t => taintBadge(t.taint)
    }, {
      key: 'host',
      header: 'Host',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, t.host || '—')
    }, {
      key: 'age',
      header: 'Age',
      align: 'right',
      render: () => /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "2m"
      })
    }, {
      key: 'link',
      header: '',
      render: () => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--signal-cyan)'
        }
      }, "/review \u2197")
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/approvals",
      title: "Approval queue",
      sub: "A Board-scoped filter of Mission Control's canonical review queue \u2014 same rows, same deep-links. The Board legitimately hosts the grant because it's written browser-direct under your session (MC holds no standing approve credential).",
      right: /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "source: board \xB7 as-of 2s")
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: rows,
      rowKey: "id",
      onRowClick: setSel
    }));
  }
  function ApprovalDecision({
    t,
    ctx,
    onBack
  }) {
    const [asProposer, setAsProposer] = React.useState(false);
    const [done, setDone] = React.useState(null);
    const killed = ctx.posture === 'kill';
    const allowCols = [{
      key: 'seq',
      header: 'seq',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: mono
      }, r.seq)
    }, {
      key: 'playbook',
      header: 'playbook_key',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, r.playbook)
    }, {
      key: 'params',
      header: 'params_hash',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.params)
    }, {
      key: 'host',
      header: 'host_id',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.host)
    }, {
      key: 'cls',
      header: 'CMDB class',
      render: r => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        size: "sm"
      }, r.cls)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 860
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: onBack,
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        color: 'var(--text-link)'
      }
    }, "\u2190 Back to queue"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: t.id
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 17,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, "Approve plan on ", t.host)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "derived action_class: ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--text-primary)'
      }
    }, "standard"), " (worst across allowlist playbooks \u2014 not from ticket type) \xB7 lane: ", t.lane), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "four-eyes: proposer ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: t.claimedBy
    }), " \xB7 you ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "operator",
      id: "operator:ada"
    })), t.taint === 'untrusted' ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--state-amber-wash)',
        border: '1px solid #7A5A1E',
        borderRadius: 6,
        padding: '10px 14px',
        display: 'flex',
        gap: 8,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--state-amber-ink)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u26A0"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "UNTRUSTED \xB7 host-originated"), " \u2192 auto-approve lane INELIGIBLE. The plan text is adversarial input; a human decides. Taint is server-owned \u2014 no control clears it here.")) : null, /*#__PURE__*/React.createElement(Section, {
      title: "Plan slice \u2014 Notes rev pinned, plan_hash bound",
      right: /*#__PURE__*/React.createElement("a", {
        href: "#",
        style: {
          color: 'var(--text-link)',
          fontFamily: 'var(--font-ui)',
          fontSize: 12
        }
      }, "open in Notes \u2197")
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        lineHeight: '23px',
        color: 'var(--text-primary)',
        margin: '0 0 6px'
      }
    }, t.plan.line), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, t.plan.notesRev, " \xB7 ", t.plan.hash, " \xB7 blast radius: ", t.plan.radius)), /*#__PURE__*/React.createElement(Section, {
      title: "Allowlist \u2014 immutable once granted (what you confirm is what runs)"
    }, /*#__PURE__*/React.createElement(DataTable, {
      columns: allowCols,
      rows: t.allowlist,
      rowKey: "seq",
      reflow: false
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, "CMDB verdict: mode=", t.cmdb.mode, " \xB7 in-window ", t.cmdb.inWindow ? '✔' : '✕', " \xB7 decision_id ", t.cmdb.decision, " ", /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: t.cmdb.age
    })), done === 'approved' ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714"
    }, "Approval minted"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "appr-4472x \xB7 consumed_by pending")) : done === 'rejected' ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "danger",
      glyph: "\u2715"
    }, "Plan rejected")) : /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "Decision"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "compact",
      onClick: () => setAsProposer(v => !v)
    }, asProposer ? '↺ view as approver (demo)' : 'demo: you are the proposer')), killed ? /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\u26CA",
      why: "G1 FREEZE-DESTRUCTIVE \u2014 approval minting is suspended suite-wide; existing approvals are honored, no new grants. The Board hosts no kill actuator.",
      tag: "suspended by stop"
    }, /*#__PURE__*/React.createElement("strong", null, "Approval minting is suspended while the kill-switch is engaged.")) : asProposer ? /*#__PURE__*/React.createElement(PrintedAbsence, {
      why: "Four-eyes requires a different approver than the proposer/claimer.",
      tag: "by construction"
    }, /*#__PURE__*/React.createElement("strong", null, "You proposed this plan \u2014 you cannot approve it here.")) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      onClick: () => setDone('rejected')
    }, "Reject plan"), !killed && !asProposer ? /*#__PURE__*/React.createElement(DangerAction, {
      label: "Approve & mint record",
      glyph: "\u26A0",
      variant: "solid",
      title: `Approve ${t.id}`,
      consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "This mints an approval that permits Gateway execution on ", /*#__PURE__*/React.createElement("strong", null, t.host), ". It moves the system toward MORE real-world action."),
      direction: "more",
      irreversible: true,
      blastRadius: t.plan.radius,
      honest: killed ? {
        confirmed: 12,
        pending: 2,
        draining: 1,
        pendingCountdown: '1:48'
      } : undefined,
      typedIntent: t.id,
      stepUp: true,
      auditNote: `Confirm token is diff-hash-bound to plan_hash ${t.plan.hash}. Writes a Board approval record.`,
      confirmLabel: "Approve",
      onConfirm: () => setDone('approved')
    }) : null)));
  }

  /* ===== 4 · Management Console (tabbed) ===== */
  function Console({
    ctx
  }) {
    const [tab, setTab] = React.useState(ctx.consoleTab || 'wip');
    const tabs = [['wip', 'WIP & lineage'], ['triggers', 'Standing triggers'], ['lineage', 'Lineage'], ['escalations', 'Escalations'], ['violations', 'Violation log'], ['audit', 'Audit browser']];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/console",
      title: "Management console",
      sub: "Control knobs + escalation / violation / audit truth. Every mutation rides the same service layer + audit path. Policy-plane writes are sod-critical and route through the confirm ceremony."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 4,
        flexWrap: 'wrap',
        borderBottom: '1px solid var(--border-default)'
      }
    }, tabs.map(([k, label]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setTab(k),
      style: {
        padding: '8px 12px',
        border: 0,
        borderBottom: '2px solid ' + (tab === k ? 'var(--signal-cyan)' : 'transparent'),
        background: 'transparent',
        color: tab === k ? 'var(--text-primary)' : 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        cursor: 'pointer'
      }
    }, label))), tab === 'wip' ? /*#__PURE__*/React.createElement(ConsoleWIP, null) : null, tab === 'triggers' ? /*#__PURE__*/React.createElement(ConsoleTriggers, null) : null, tab === 'lineage' ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement(TicketLineageTree, {
      nodes: [{
        id: 'T-000100',
        state: 'in_progress',
        indent: 0
      }, {
        id: 'T-000097',
        state: 'awaiting_approval',
        indent: 1,
        by: 'agent:patcher-07'
      }, {
        id: 'T-000131',
        state: 'in_progress',
        indent: 2,
        by: 'agent:patcher-09'
      }, {
        id: 'T-000140',
        state: 'todo',
        indent: 3,
        by: 'agent:patcher-11',
        here: true
      }],
      depth: 4,
      cap: 4
    })) : null, tab === 'escalations' ? /*#__PURE__*/React.createElement(ConsoleEscalations, null) : null, tab === 'violations' ? /*#__PURE__*/React.createElement(ConsoleAudit, {
      rows: D.VIOLATIONS,
      violation: true
    }) : null, tab === 'audit' ? /*#__PURE__*/React.createElement(ConsoleAudit, {
      rows: D.AUDIT
    }) : null);
  }
  function ConsoleWIP() {
    const [open, setOpen] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Section, {
      title: "WIP caps & lineage policy \u2014 sod-critical writes"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "Global WIP cap",
      mono: true,
      defaultValue: "30",
      style: {
        width: 120
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Per-agent cap",
      mono: true,
      defaultValue: "4",
      style: {
        width: 120
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Per-team cap",
      mono: true,
      defaultValue: "8",
      style: {
        width: 120
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Lineage depth cap",
      mono: true,
      defaultValue: "4",
      style: {
        width: 120
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      onClick: () => setOpen(true)
    }, "Save policy")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 8
      }
    }, "current global WIP ", D.WIP.global[0], "/", D.WIP.global[1], " \xB7 echoes on kanban column headers")), /*#__PURE__*/React.createElement(ConfirmFriction, {
      open: open,
      intensity: "full",
      title: "Save WIP & lineage policy",
      consequence: "This changes how much work the fleet may run and how deep it may spawn. The confirm is bound to the exact diff you saw.",
      direction: "more",
      auditNote: "sod-critical \xB7 diff-bound \xB7 writes an audit row.",
      confirmLabel: "Save policy",
      onCancel: () => setOpen(false),
      onConfirm: () => setOpen(false)
    }));
  }
  function ConsoleTriggers() {
    const cols = [{
      key: 'name',
      header: 'Trigger',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, r.name)
    }, {
      key: 'kind',
      header: 'Kind',
      render: r => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        size: "sm"
      }, r.kind)
    }, {
      key: 'spec',
      header: 'Spec',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.spec)
    }, {
      key: 'child',
      header: 'Child template',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.child)
    }, {
      key: 'suppress',
      header: 'suppress_while_open',
      render: r => r.suppress ? '✔' : '—'
    }, {
      key: 'health',
      header: 'Webhook',
      render: r => r.webhook ? /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--state-green)'
        }
      }, "HMAC ", r.webhook.hmac, " \xB7 ", r.webhook.lastFire) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }];
    return /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.TRIGGERS,
      rowKey: "name"
    });
  }
  function ConsoleEscalations() {
    const kindPill = k => k === 'A1' ? /*#__PURE__*/React.createElement(ReviewChip, {
      state: "escalated",
      reason: "board_escalation",
      href: "#"
    }) : k === 'A2' ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "danger",
      glyph: "\u2691",
      size: "sm"
    }, "break-glass") : k === 'quarantine' ? /*#__PURE__*/React.createElement(StatusPill, {
      striped: true,
      glyph: "\u26A0",
      size: "sm"
    }, "quarantine") : /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u26CA",
      size: "sm"
    }, "reaper hold");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, D.ESCALATIONS.map((e, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        ...panel,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, kindPill(e.kind), e.ticket ? /*#__PURE__*/React.createElement(TicketRef, {
      id: e.ticket,
      href: "#"
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "fleet-level \xB7 ", e.held, " held"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, e.reason), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, e.detail), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: e.age
    }), e.kind === 'quarantine' ? /*#__PURE__*/React.createElement(ConfirmButton, {
      label: "Confirm CMDB mapping \u2192 clear",
      tone: "secondary",
      size: "compact",
      title: "Clear quarantine",
      consequence: "Confirms the host mapping and clears quarantine so the ticket can be claimed. Toward LESS restriction.",
      direction: "less",
      confirmLabel: "Clear quarantine"
    }) : null, e.kind === 'reaper' ? /*#__PURE__*/React.createElement(ConfirmButton, {
      label: "Clear hold",
      tone: "secondary",
      size: "compact",
      title: "Clear reaper hold",
      consequence: "Releases the outage-gate hold on held tickets.",
      direction: "less",
      confirmLabel: "Clear hold"
    }) : null)));
  }
  function ConfirmButton({
    label,
    tone = 'secondary',
    size,
    ...cf
  }) {
    const [open, setOpen] = React.useState(false);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      tone: tone,
      size: size,
      onClick: () => setOpen(true)
    }, label), /*#__PURE__*/React.createElement(ConfirmFriction, {
      open: open,
      intensity: "light",
      title: cf.title || label,
      confirmLabel: cf.confirmLabel || label,
      consequence: cf.consequence,
      direction: cf.direction || 'less',
      onCancel: () => setOpen(false),
      onConfirm: () => setOpen(false)
    }));
  }
  function ConsoleAudit({
    rows,
    violation
  }) {
    const cols = [{
      key: 'at',
      header: 'Time',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.at)
    }, {
      key: 'who',
      header: 'Who',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: r.kind,
        id: r.who
      })
    }, {
      key: 'verb',
      header: 'Action',
      render: r => /*#__PURE__*/React.createElement("code", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.verb)
    }, {
      key: 'target',
      header: 'Target',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.target
      })
    }, {
      key: 'outcome',
      header: 'Outcome',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: r.outcome === 'refused' ? 'var(--danger-text)' : 'var(--text-secondary)'
        }
      }, r.outcome)
    }, violation ? {
      key: 'note',
      header: 'Note',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.note)
    } : {
      key: 'prov',
      header: 'Provenance',
      render: r => taintBadge(r.prov)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, "append-only \xB7 ", /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "live"
    }), " ", violation ? '· zero-tolerance telemetry' : '· Board log is NOT hash-chained — no fabricated "chain verified"'), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: rows,
      rowKey: "at",
      reflow: false
    }));
  }
  window.BDScreens = {
    Kanban,
    TicketDetail,
    Approvals,
    Console
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/board/bd-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/chat/app.jsx
try { (() => {
/* Helm — Chat · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    NavRail,
    AppHeader,
    KillMirror,
    FreshnessStamp
  } = H;
  const SC = window.CHScreens;
  function App() {
    const [route, setRoute] = React.useState('feed');
    const [collapsed, setCollapsed] = React.useState(false);
    const [note, setNote] = React.useState(null);
    const ctx = {
      goto: r => setRoute(r),
      openNote: n => {
        setNote(n);
        setRoute('note');
      }
    };
    const items = [{
      group: 'Doorbell'
    }, {
      key: 'feed',
      label: 'Feed',
      icon: '◈',
      badge: 3,
      active: route === 'feed' || route === 'note',
      onClick: () => setRoute('feed')
    }, {
      key: 'broadcast',
      label: 'Broadcast',
      icon: '📣',
      active: route === 'broadcast',
      onClick: () => setRoute('broadcast')
    }, {
      key: 'health',
      label: 'Health',
      icon: '⟳',
      active: route === 'health',
      onClick: () => setRoute('health')
    }];
    let screen = null;
    if (route === 'feed') screen = /*#__PURE__*/React.createElement(SC.Feed, {
      ctx: ctx
    });else if (route === 'note' && note) screen = /*#__PURE__*/React.createElement(SC.NoteDetail, {
      note: note,
      ctx: ctx
    });else if (route === 'broadcast') screen = /*#__PURE__*/React.createElement(SC.Broadcast, null);else if (route === 'health') screen = /*#__PURE__*/React.createElement(SC.Health, null);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "chat",
      posture: "nominal",
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Chat",
      identity: "notifications & broadcast",
      systemState: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "nominal \xB7 0.4s"
      })
    }, /*#__PURE__*/React.createElement(KillMirror, {
      engaged: false,
      href: "#"
    })), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, screen)));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/chat/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/chat/ch-data.jsx
try { (() => {
/* Helm — Chat · data. Exposed as window.CH_DATA.
   The suite's doorbell: agent→operator notifications + soft operator→fleet broadcast. */
(function () {
  const FEED = [{
    id: 'N-01J8QZ',
    kind: 'escalation',
    prio: 5,
    author: 'agent:patcher-07',
    akind: 'agent',
    reason: 'board_escalation',
    ticket: 'T-000123',
    body: 'NAS reboot hung — host unreachable, cannot verify patch',
    age: '2m',
    repeat: 3,
    fence: {
      gen: 46,
      advisory: true
    },
    acked: false
  }, {
    id: 'N-01J8RA',
    kind: 'needs_review',
    prio: 4,
    author: 'agent:writer-03',
    akind: 'agent',
    reason: 'review_ready',
    ticket: 'T-000210',
    body: 'Research note ready: safe-patch practice for Wazuh fleet',
    age: '14m',
    repeat: 1,
    acked: false
  }, {
    id: 'N-01J8SB',
    kind: 'done',
    prio: 2,
    author: 'svc:tier-approver',
    akind: 'service',
    reason: null,
    ticket: 'T-000198',
    body: 'Canary batch patched · Wazuh confirmed active→solved',
    age: '1h',
    repeat: 1,
    acked: true
  }, {
    id: 'N-01J8TC',
    kind: 'done',
    prio: 1,
    author: 'agent:indexer-02',
    akind: 'agent',
    reason: null,
    ticket: 'T-000201',
    body: 'Reindex shard 12 complete — 4.1M docs, 0 errors',
    age: '2h',
    repeat: 1,
    acked: true
  }];
  const byId = {};
  FEED.forEach(n => {
    byId[n.id] = n;
  });
  const BROADCAST_ACTIVE = {
    id: 'B-0007',
    prio: 3,
    body: 'Maintenance window opens 22:00 UTC — pause non-urgent claims',
    by: 'operator:ada',
    posted: '2h',
    expires: '21h'
  };
  const BROADCAST_HISTORY = [{
    id: 'B-0007',
    body: 'Maintenance window opens 22:00 UTC…',
    by: 'operator:ada',
    posted: '2h ago',
    expires: 'in 21h',
    state: 'active'
  }, {
    id: 'B-0006',
    body: 'Vault rotation complete — resume normal ops',
    by: 'operator:ada',
    posted: '1d ago',
    expires: 'expired',
    state: 'expired'
  }, {
    id: 'B-0005',
    body: 'Draft — do not use',
    by: 'operator:sam',
    posted: '2d ago',
    expires: 'revoked',
    state: 'revoked'
  }];
  const HEALTH = [{
    icon: '⟳',
    label: 'SSE feed',
    ok: true,
    detail: 'connected · fresh 0.4s · Last-Event-ID N-01J8… ',
    source: 'chat'
  }, {
    icon: '📤',
    label: 'push sink',
    ok: true,
    detail: 'ntfy delivering · last ok 12s · gave_up 0',
    source: 'outbox'
  }, {
    icon: '🗄',
    label: 'DB size',
    ok: true,
    detail: '0.4 GB / 2.0 GB guard (CHAT_DB_SIZE_GUARD)',
    source: 'chat'
  }, {
    icon: '💾',
    label: 'backup',
    ok: true,
    detail: 'last 06:00 (7h ago) · 30 dailies · 12 monthlies',
    source: 'chat'
  }, {
    icon: '🔗',
    label: 'resolve feed',
    ok: false,
    detail: 'awaiting mc:read grant → deep-links on fallback',
    source: 'mc',
    pending: true
  }];
  window.CH_DATA = {
    FEED,
    byId,
    BROADCAST_ACTIVE,
    BROADCAST_HISTORY,
    HEALTH
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/chat/ch-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/chat/ch-parts.jsx
try { (() => {
/* Helm — Chat · app-specific components. Exposed as window.CHParts.
   KindBadge fuses notification kind + server-clamped priority band; gold is
   NEVER used (reserved for HaltBand) — escalations live in the attention family. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    ReviewChip,
    StatusPill
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panel = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };

  /* KindBadge — kind glyph + priority band P1–P5. Escalation = attention amber, never gold. */
  function KindBadge({
    kind,
    prio
  }) {
    const map = {
      escalation: {
        tone: 'attention',
        glyph: '⚑',
        label: 'ESCALATION'
      },
      needs_review: {
        tone: 'attention',
        glyph: '◈',
        label: 'NEEDS_REVIEW'
      },
      done: {
        tone: 'verified',
        glyph: '✔',
        label: 'DONE'
      }
    };
    const m = map[kind] || map.done;
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        fontWeight: 600,
        color: 'var(--text-muted)',
        border: '1px solid var(--border-strong)',
        borderRadius: 3,
        padding: '0 4px'
      }
    }, "P", prio), /*#__PURE__*/React.createElement(StatusPill, {
      tone: m.tone,
      glyph: m.glyph,
      size: "sm"
    }, m.label));
  }
  window.CHParts = {
    KindBadge,
    eyebrow,
    mono,
    panel
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/chat/ch-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/chat/ch-screens.jsx
try { (() => {
/* Helm — Chat · screens (4). Exposed as window.CHScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.CH_DATA;
  const P = window.CHParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    StatusPill,
    FenceState,
    ReviewChip,
    FreshnessStamp,
    Button,
    DangerAction,
    ConfirmFriction,
    PrintedAbsence,
    Input
  } = H;
  const {
    KindBadge,
    eyebrow,
    mono,
    panel
  } = P;
  function Head({
    crumb,
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, crumb ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, crumb) : null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '2px 0 0'
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '82ch'
      }
    }, sub) : null), right);
  }

  /* 1 · Feed */
  function Feed({
    ctx
  }) {
    const rows = [...D.FEED].sort((a, b) => (a.kind === 'escalation' && !a.acked ? -1 : 0) - (b.kind === 'escalation' && !b.acked ? -1 : 0));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 900
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Feed",
      sub: "The suite's doorbell \u2014 agent\u2192operator escalations, review-ready work, and completions. Chat surfaces review; it never clears it.",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "feed fresh 0.4s"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      icon: "/",
      placeholder: "filter\u2026",
      style: {
        flex: 1,
        minWidth: 180
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact"
    }, "Ack all seen \u25B8")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, rows.map(n => {
      const pinned = n.kind === 'escalation' && !n.acked;
      return /*#__PURE__*/React.createElement("div", {
        key: n.id,
        onClick: () => ctx.openNote(n),
        style: {
          cursor: 'pointer',
          ...panel,
          borderColor: pinned ? '#5A4A1E' : 'var(--border-default)',
          background: pinned ? 'var(--state-amber-wash)' : n.acked ? 'var(--surface-panel)' : 'var(--bg-card)',
          opacity: n.acked ? 0.72 : 1,
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap'
        }
      }, /*#__PURE__*/React.createElement(KindBadge, {
        kind: n.kind,
        prio: n.prio
      }), /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: n.akind,
        id: n.author
      }), n.reason ? /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "\xB7 ", n.reason) : null, n.ticket ? /*#__PURE__*/React.createElement(TicketRef, {
        id: n.ticket,
        href: "#"
      }) : null, /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1
        }
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, n.age, n.repeat > 1 ? ` ·×${n.repeat}` : ''), /*#__PURE__*/React.createElement(Button, {
        tone: "ghost",
        size: "compact",
        onClick: e => {
          e.stopPropagation();
        }
      }, "Ack")), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          lineHeight: '22px',
          color: 'var(--text-secondary)'
        }
      }, n.body), /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap'
        }
      }, n.ticket ? /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }
      }, /*#__PURE__*/React.createElement(ReviewChip, {
        reason: "\u2192 mc/review",
        href: "#"
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 10,
          color: 'var(--text-disabled)'
        }
      }, "(target wins)")) : null, n.fence ? /*#__PURE__*/React.createElement("span", {
        style: {
          opacity: 0.55
        }
      }, /*#__PURE__*/React.createElement(FenceState, {
        gen: n.fence.gen,
        advisory: true,
        state: "held"
      })) : null));
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "showing 90d \xB7 3 unacked \xB7 41 total \xB7 [ load older \u2192 ]"));
  }

  /* 2 · Notification detail */
  function NoteDetail({
    note,
    ctx
  }) {
    const n = note;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 820
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('feed'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        color: 'var(--text-link)'
      }
    }, "\u2190 Feed"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(KindBadge, {
      kind: n.kind,
      prio: n.prio
    }), /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: n.akind,
      id: n.author
    }), n.reason ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, n.reason) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", null, n.id, " \u29C9"), /*#__PURE__*/React.createElement("span", null, "posted ", n.age, " \xB7 \xD7", n.repeat), n.ticket ? /*#__PURE__*/React.createElement(TicketRef, {
      id: n.ticket,
      href: "#"
    }) : null), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--signal-cyan-wash)',
        border: '1px solid #14424F',
        borderRadius: 'var(--radius-panel)',
        padding: '10px 14px',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        lineHeight: '18px',
        color: 'var(--signal-cyan-ink)'
      }
    }, "\u24D8 This is a snapshot from when it was posted. The live target is authoritative \u2014 open it: ", /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: 'var(--signal-cyan)'
      }
    }, "\u25C8 \u2192 mc/review/", n.ticket || '…'), " ", /*#__PURE__*/React.createElement("b", null, "[ Open in MC \u2192 ]")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--paper-page)',
        padding: '28px 32px'
      }
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 17,
        lineHeight: '28px',
        color: 'var(--paper-ink)',
        margin: 0
      }
    }, n.body), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 15,
        lineHeight: '25px',
        color: '#6A6A62',
        margin: '12px 0 0'
      }
    }, "Body is allowlist-markdown only. Raw HTML and remote images are stripped to dead text; ", /*#__PURE__*/React.createElement("span", {
      style: {
        textDecoration: 'underline dotted'
      }
    }, "links render as dead text"), " \u2014 the only live link is the MC deep-link above (anti-phishing)."))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "envelope"), "kind ", n.kind, " \xB7 P", n.prio, n.fence ? /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: 0.6
      }
    }, /*#__PURE__*/React.createElement(FenceState, {
      gen: n.fence.gen,
      advisory: true,
      state: "held"
    })) : null));
  }

  /* 3 · Broadcast */
  function Broadcast() {
    const B = D.BROADCAST_ACTIVE;
    const cols = [{
      key: 'id',
      header: 'ID',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.id
      })
    }, {
      key: 'body',
      header: 'Body',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--text-secondary)'
        }
      }, r.body)
    }, {
      key: 'by',
      header: 'By',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "operator",
        id: r.by
      })
    }, {
      key: 'posted',
      header: 'Posted',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.posted)
    }, {
      key: 'state',
      header: 'State',
      render: r => r.state === 'active' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "verified",
        glyph: "\u25CF",
        size: "sm"
      }, "active") : r.state === 'expired' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        glyph: "\u25FC",
        size: "sm"
      }, "expired") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "danger",
        glyph: "\u26D2",
        size: "sm"
      }, "revoked")
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 900
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Broadcast",
      sub: "A soft operator\u2192fleet advisory. It does not stop, gate, or command any agent."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--signal-cyan-wash)',
        border: '1px solid #14424F',
        borderRadius: 'var(--radius-panel)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18
      }
    }, "\uD83D\uDCE3"), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 200
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--signal-cyan-ink)'
      }
    }, "P", B.prio, " \xB7 \"", B.body, "\""), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--signal-cyan-ink)',
        opacity: 0.8
      }
    }, "by ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "operator",
      id: B.by
    }), " \xB7 posted ", B.posted, " \xB7 expires in ", B.expires)), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Revoke",
      glyph: "\u26A0",
      variant: "outline",
      size: "compact",
      intensity: "light",
      title: "Revoke broadcast",
      consequence: "Withdraws the active broadcast \u2014 toward LESS. Writes an audit row.",
      direction: "less",
      confirmLabel: "Revoke"
    })), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "not a stop"
    }, /*#__PURE__*/React.createElement("strong", null, "A broadcast is an advisory the fleet MAY read."), " It does not stop, gate, or command any agent. To halt the fleet, use MC/auth."), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Compose"), /*#__PURE__*/React.createElement(Input, {
      label: "Body",
      placeholder: "markdown, \u22642000\u2026",
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "Priority",
      mono: true,
      defaultValue: "3",
      style: {
        width: 90
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Expires",
      defaultValue: "24h",
      style: {
        width: 110
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "primary"
    }, "Post broadcast"))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "History"), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.BROADCAST_HISTORY,
      rowKey: "id",
      reflow: false
    })));
  }

  /* 4 · Health */
  function Health() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 820
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Health",
      sub: "The doorbell's own liveness. The false-green prohibition binds hardest here \u2014 a doorbell that lies about whether it can ring is the worst failure."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column'
      }
    }, D.HEALTH.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: i < D.HEALTH.length - 1 ? '1px solid var(--border-default)' : 0
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 24,
        textAlign: 'center',
        fontVariantEmoji: 'text'
      }
    }, r.icon), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--text-primary)',
        width: 110
      }
    }, r.label), r.pending ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, "\u25B2") : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u25CF"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: r.pending ? 'var(--state-amber-ink)' : 'var(--text-secondary)'
      }
    }, r.detail), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--text-disabled)'
      }
    }, "source: ", r.source)))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "\u2500\u2500 MC resolve seam \u2500\u2500 the mc:read grant is pre-freeze; the resolve row stays honest-PENDING and deep-links fall back to MC home."));
  }
  window.CHScreens = {
    Feed,
    NoteDetail,
    Broadcast,
    Health
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/chat/ch-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cmdb/app.jsx
try { (() => {
/* Helm — CMDB · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    NavRail,
    AppHeader,
    KillMirror,
    PrincipalRef
  } = H;
  const SC = window.CMScreens;
  function App() {
    const [route, setRoute] = React.useState('fleet');
    const [collapsed, setCollapsed] = React.useState(false);
    const ctx = {
      goto: setRoute
    };
    const items = [{
      group: 'Inventory'
    }, {
      key: 'fleet',
      label: 'Fleet',
      icon: '▤',
      active: route === 'fleet' || route === 'host',
      onClick: () => setRoute('fleet')
    }, {
      key: 'tiers',
      label: 'Tiers',
      icon: '⬢',
      active: route === 'tiers',
      onClick: () => setRoute('tiers')
    }, {
      key: 'tasks',
      label: 'Tasks',
      icon: '☰',
      active: route === 'tasks',
      onClick: () => setRoute('tasks')
    }, {
      key: 'catalog',
      label: 'Catalog',
      icon: '▦',
      active: route === 'catalog',
      onClick: () => setRoute('catalog')
    }, {
      key: 'sandbox',
      label: 'Sandbox',
      icon: '◎',
      active: route === 'sandbox',
      onClick: () => setRoute('sandbox')
    }, {
      key: 'discovery',
      label: 'Discovery',
      icon: '⊹',
      active: route === 'discovery',
      onClick: () => setRoute('discovery')
    }, {
      group: 'Policy truth'
    }, {
      key: 'dryrun',
      label: 'Dry-run',
      icon: '⊨',
      active: route === 'dryrun',
      onClick: () => setRoute('dryrun')
    }, {
      key: 'history',
      label: 'History',
      icon: '⟲',
      active: route === 'history',
      onClick: () => setRoute('history')
    }, {
      key: 'decisions',
      label: 'Decisions',
      icon: '⊞',
      active: route === 'decisions',
      onClick: () => setRoute('decisions')
    }, {
      key: 'escalations',
      label: 'Escalations',
      icon: '⚑',
      active: route === 'escalations',
      onClick: () => setRoute('escalations')
    }, {
      group: 'Emergency'
    }, {
      key: 'breakglass',
      label: 'Break-glass',
      icon: '⚠',
      danger: true,
      active: route === 'breakglass',
      onClick: () => setRoute('breakglass')
    }];
    const map = {
      fleet: /*#__PURE__*/React.createElement(SC.Fleet, {
        ctx: ctx
      }),
      host: /*#__PURE__*/React.createElement(SC.Host, {
        ctx: ctx
      }),
      tiers: /*#__PURE__*/React.createElement(SC.Tiers, null),
      tasks: /*#__PURE__*/React.createElement(SC.Tasks, null),
      catalog: /*#__PURE__*/React.createElement(SC.Catalog, null),
      sandbox: /*#__PURE__*/React.createElement(SC.Sandbox, null),
      discovery: /*#__PURE__*/React.createElement(SC.Discovery, null),
      dryrun: /*#__PURE__*/React.createElement(SC.DryRun, null),
      history: /*#__PURE__*/React.createElement(SC.History, null),
      decisions: /*#__PURE__*/React.createElement(SC.Decisions, null),
      escalations: /*#__PURE__*/React.createElement(SC.Escalations, null),
      breakglass: /*#__PURE__*/React.createElement(SC.BreakGlass, null)
    };
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "cmdb",
      posture: "nominal",
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "CMDB",
      identity: "policy plane \u2014 may this host be touched right now?",
      systemState: /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, "\u25CF G0 \xB7 policy HEAD 9f3a2c \u27F3 0.4s")
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "operator",
      id: "operator:ada"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--state-green)'
      }
    }, "\uD83D\uDD11 fresh"), /*#__PURE__*/React.createElement(KillMirror, {
      engaged: false,
      href: "#"
    }))), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, map[route])));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cmdb/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cmdb/cm-data.jsx
try { (() => {
/* Helm — CMDB · data. Exposed as window.CM_DATA.
   The policy plane: fleet inventory + the rules that decide "may this host be
   touched right now?" — and the console where the operator authors that policy. */
(function () {
  const FLEET = [{
    host: 'nas-01',
    tier: 'tier0',
    cls: 'managed',
    window: 'CLOSED',
    mode: 'ask',
    wazuh: 'SYNCED ⟳3m',
    wazuhStale: false,
    lifecycle: 'active'
  }, {
    host: 'web-04',
    tier: 'tier2',
    cls: 'managed',
    window: 'IN-WINDOW 01:42',
    mode: 'auto',
    wazuh: 'SYNCED ⟳2m',
    wazuhStale: false,
    lifecycle: 'active'
  }, {
    host: 'db-02',
    tier: 'tier1',
    cls: 'managed',
    window: 'FREEZE-ACTIVE',
    mode: 'ask',
    wazuh: 'STALE ⟳41m',
    wazuhStale: true,
    lifecycle: 'stale'
  }, {
    host: 'sbx-01',
    tier: null,
    cls: 'disposable',
    window: 'n/a',
    mode: 'auto*',
    wazuh: 'not enrolled',
    wazuhStale: false,
    lifecycle: 'active'
  }, {
    host: 'mail-03',
    tier: 'unpolicied',
    cls: 'managed',
    window: 'deny(no_policy)',
    mode: '—',
    wazuh: 'SYNCED ⟳1m',
    wazuhStale: false,
    lifecycle: 'needs-tiering'
  }];
  const HOST = {
    host: 'nas-01',
    tier: 'tier0',
    cls: 'managed',
    lifecycle: 'active',
    window: 'CLOSED · next opens Sun 22:00 Europe/Oslo',
    reason: 'not_in_window',
    policyVersion: '9f3a2c',
    modes: 'package_update ask · config_change ask · reboot ask(floor)',
    facts: [['os_family', 'linux', 'untrusted'], ['arch', 'x86_64', 'untrusted'], ['eol_date', '2028-04', 'operator'], ['wazuh.agent_id', '007', 'operator']]
  };
  const TIERS = [{
    tier: 'tier0',
    defaults: 'package_update ask · reboot 🔒 floor',
    hcTimeout: 300,
    sshWait: 60
  }, {
    tier: 'tier1',
    defaults: 'package_update ask · config_change ask',
    hcTimeout: 300,
    sshWait: 60
  }, {
    tier: 'tier2',
    defaults: 'package_update auto · config_change ask',
    hcTimeout: 180,
    sshWait: 45
  }, {
    tier: 'tier3',
    defaults: 'package_update auto · restart auto',
    hcTimeout: 120,
    sshWait: 30
  }, {
    tier: 'unpolicied',
    defaults: 'always deny (sentinel)',
    hcTimeout: '—',
    sshWait: '—'
  }];
  const TASKS = [{
    key: 'patch_debian',
    destructive: true,
    reversible: true,
    cls: 'package_update',
    verifier: 'wazuh',
    vwin: 300
  }, {
    key: 'reboot_host',
    destructive: true,
    reversible: false,
    cls: 'reboot',
    verifier: 'ssh_probe',
    vwin: 600
  }, {
    key: 'sbx_pytest',
    destructive: false,
    reversible: true,
    cls: 'sandbox_exec',
    verifier: 'exit_code',
    vwin: 120
  }];
  const CATALOG = [{
    key: 'patch_debian',
    cls: 'package_update',
    risk: 'medium',
    tiers: 'tier1-3',
    rollback: true,
    method: 'snapshot',
    sandbox: false
  }, {
    key: 'reboot_host',
    cls: 'reboot',
    risk: 'high',
    tiers: 'tier2-3',
    rollback: false,
    method: 'none',
    sandbox: false
  }, {
    key: 'sbx_pytest',
    cls: 'sandbox_exec',
    risk: 'low',
    tiers: '—',
    rollback: false,
    method: 'n/a',
    sandbox: true
  }];
  const SANDBOX = [{
    host: 'sbx-01',
    cls: 'disposable',
    creds: 'none',
    verdict: 'permit · sandbox_carve_out'
  }];
  const DISCOVERY = [{
    agent: '013',
    name: 'web-05',
    os: 'linux',
    group: 'web ~suggestion'
  }, {
    agent: '021',
    name: 'cache-02',
    os: 'linux',
    group: 'cache ~suggestion'
  }];
  const HISTORY = [{
    ts: '12:04:11',
    who: 'operator:ada',
    kind: 'operator',
    edit: 'snapshot_cap',
    target: 'nas-01',
    weakening: true,
    hash: '7c1e…a90',
    commit: '9f3a2c',
    ok: true
  }, {
    ts: '08:50:44',
    who: 'operator:ben',
    kind: 'operator',
    edit: 'add_freeze',
    target: 'web-04',
    weakening: false,
    hash: 'b21f…03',
    commit: '81ac2d',
    ok: true
  }];
  const DECISIONS = [{
    at: '12:04:02',
    aud: 'gateway',
    host: 'nas-01',
    cls: 'kernel_update',
    verdict: 'deny',
    jti: 'dec-77f2',
    pv: '9f3a2c',
    basis: 'freeze_active'
  }, {
    at: '12:03:40',
    aud: 'gateway',
    host: 'web-04',
    cls: 'package_update',
    verdict: 'permit',
    jti: 'dec-77e9',
    pv: '9f3a2c',
    basis: 'in_window'
  }, {
    at: '12:02:55',
    aud: 'mcp',
    host: 'db-02',
    cls: 'reboot',
    verdict: 'ask',
    jti: 'dec-77dd',
    pv: '9f3a2c',
    basis: 'tier_default'
  }];
  const ESCALATIONS = [{
    kind: 'needs_tiering',
    target: 'mail-03',
    state: 'delivered',
    link: 'mc/review/T-000481'
  }, {
    kind: 'window_ambiguity',
    target: 'db-02',
    state: 'queued',
    link: 'awaiting Board mint'
  }, {
    kind: 'break_glass_posthoc',
    target: 'db-02',
    state: 'delivered',
    link: 'mc/review/T-000480'
  }];
  window.CM_DATA = {
    FLEET,
    HOST,
    TIERS,
    TASKS,
    CATALOG,
    SANDBOX,
    DISCOVERY,
    HISTORY,
    DECISIONS,
    ESCALATIONS
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cmdb/cm-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cmdb/cm-parts.jsx
try { (() => {
/* Helm — CMDB · app-specific components. Exposed as window.CMParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    StatusPill,
    TicketRef,
    TierBadge
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panel = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };

  /* CriticalityTier chip — host-criticality, deliberately NOT a TierBadge. */
  function CriticalityTier({
    tier
  }) {
    if (!tier) return /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-disabled)'
      }
    }, "\u2014 (no tier)");
    if (tier === 'unpolicied') return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...mono,
        fontSize: 11,
        color: 'var(--state-amber-ink)',
        border: '1px solid #5A4A1E',
        borderRadius: 4,
        padding: '1px 6px'
      }
    }, "\u2726 unpolicied");
    const col = {
      tier0: 'var(--danger-text)',
      tier1: 'var(--state-amber-ink)',
      tier2: 'var(--text-secondary)',
      tier3: 'var(--text-muted)'
    }[tier];
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        ...mono,
        fontSize: 11,
        color: col,
        border: '1px solid var(--border-strong)',
        borderRadius: 4,
        padding: '1px 6px'
      }
    }, "\u2B22 ", tier);
  }

  /* verdict outcome token — permit is NEVER green (green = external verification). */
  function Verdict({
    v
  }) {
    if (v === 'deny') return /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--danger-text)',
        border: '1px solid #5A2420',
        borderRadius: 3,
        padding: '0 6px'
      }
    }, "deny");
    if (v === 'ask') return /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--state-amber-ink)',
        border: '1px solid #5A4A1E',
        borderRadius: 3,
        padding: '0 6px'
      }
    }, "ask");
    return /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-strong)',
        borderRadius: 3,
        padding: '0 6px'
      }
    }, "permit");
  }
  function windowPill(w) {
    if (w === 'FREEZE-ACTIVE') return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u2744",
      size: "sm"
    }, "FREEZE-ACTIVE");
    if (w && w.startsWith('IN-WINDOW')) return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u25CF",
      size: "sm"
    }, w);
    if (w === 'CLOSED') return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "neutral",
      glyph: "\u25FC",
      size: "sm"
    }, "CLOSED");
    if (w && w.startsWith('deny')) return /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--danger-text)'
      }
    }, "\u25FC ", w);
    return /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-disabled)'
      }
    }, w);
  }

  /* BlastRadiusPreview — the derived-effect matrix that fills the ConfirmFriction slot. */
  function BlastRadiusPreview({
    cells,
    diff,
    diffHash
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        color: 'var(--danger-text)'
      }
    }, "Blast radius"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "Makes ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--text-primary)'
      }
    }, cells.length), " (host \xD7 action_class) cells auto-executable \xB7 1 host gains window coverage \xB7 full-shadow warnings: none"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11
      }
    }, cells.map((c, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        color: 'var(--text-secondary)'
      }
    }, c.host, " \xB7 ", c.cls, " \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, c.before), " \u2192 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, c.after)))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        borderTop: '1px solid var(--border-strong)',
        paddingTop: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--danger-text)'
      }
    }, "- ", diff[0]), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--state-green-ink)'
      }
    }, "+ ", diff[1]), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--text-muted)',
        marginTop: 4
      }
    }, "diff_hash: ", diffHash, " (confirm binds here)")));
  }

  /* VerdictTrace — the arbitrary-`at` decision-path explainer. */
  function VerdictTrace({
    result
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "Result"), /*#__PURE__*/React.createElement(Verdict, {
      v: result
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "\u2190 outcome token, NOT green")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        lineHeight: '20px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--text-muted)'
      }
    }, "decision path (preconditions \u2192 class fork \u2192 window \u2192 mode):"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " host resolved \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " snapshot healthy \xB7 policy_version 9f3a2c = HEAD"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " action_class \u2208 enum(7) \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " clock healthy (offset 0.3s, NTP)"), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingLeft: 12
      }
    }, "\u25B8 class fork: managed \u2192 window algebra"), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingLeft: 24
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " allow window w-sun-night covers T \xB7 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--danger-red)'
      }
    }, "\u2715"), " freeze f-quarter-end also covers T"), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingLeft: 24,
        color: 'var(--text-muted)'
      }
    }, "\u2192 deny-overrides: effective_close = start of freeze \u2192 NOT cleanly in-window"), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 4
      }
    }, "reason[]: [ ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--danger-text)'
      }
    }, "freeze_active(f-quarter-end)"), " ] ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, "(CMDB-authored enum codes, never host free-text)"))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        borderTop: '1px solid var(--border-default)',
        paddingTop: 8
      }
    }, "policy_version 9f3a2c \xB7 valid_until = evaluated_at + 60s \xB7 NOTE: dry-run is UNSIGNED/advisory (no aud, no JWS) \u2014 mechanically unusable at the Gateway."));
  }
  window.CMParts = {
    CriticalityTier,
    Verdict,
    windowPill,
    BlastRadiusPreview,
    VerdictTrace,
    eyebrow,
    mono,
    panel
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cmdb/cm-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/cmdb/cm-screens.jsx
try { (() => {
/* Helm — CMDB · screens (13). Exposed as window.CMScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.CM_DATA;
  const P = window.CMParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    StatusPill,
    TierBadge,
    FreshnessStamp,
    Button,
    DangerAction,
    ConfirmFriction,
    ReviewChip,
    PrintedAbsence,
    Input
  } = H;
  const {
    CriticalityTier,
    Verdict,
    windowPill,
    BlastRadiusPreview,
    VerdictTrace,
    eyebrow,
    mono,
    panel
  } = P;
  function Head({
    crumb,
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, crumb ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, crumb) : null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '2px 0 0'
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '82ch'
      }
    }, sub) : null), right);
  }
  const Reg = ({
    title,
    sub,
    cols,
    rows,
    rowKey,
    right
  }) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14,
      maxWidth: 1180
    }
  }, /*#__PURE__*/React.createElement(Head, {
    title: title,
    sub: sub,
    right: right
  }), /*#__PURE__*/React.createElement(DataTable, {
    columns: cols,
    rows: rows,
    rowKey: rowKey,
    reflow: false
  }));

  /* 1 · Fleet */
  function Fleet({
    ctx
  }) {
    const cols = [{
      key: 'host',
      header: 'host_id',
      render: h => /*#__PURE__*/React.createElement(TicketRef, {
        id: h.host
      })
    }, {
      key: 'tier',
      header: 'criticality',
      render: h => /*#__PURE__*/React.createElement(CriticalityTier, {
        tier: h.tier
      })
    }, {
      key: 'cls',
      header: 'class',
      render: h => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, h.cls)
    }, {
      key: 'window',
      header: 'window-state',
      render: h => windowPill(h.window)
    }, {
      key: 'mode',
      header: 'mode',
      render: h => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, h.mode)
    }, {
      key: 'wazuh',
      header: 'Wazuh',
      render: h => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: h.wazuhStale ? 'var(--state-amber-ink)' : 'var(--text-muted)'
        }
      }, h.wazuhStale ? '▲ ' : '● ', h.wazuh)
    }, {
      key: 'lifecycle',
      header: 'lifecycle',
      render: h => h.lifecycle === 'needs-tiering' ? /*#__PURE__*/React.createElement(ReviewChip, {
        reason: "needs_tiering",
        href: "#"
      }) : h.lifecycle === 'stale' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "attention",
        glyph: "\u25B2",
        size: "sm"
      }, "stale") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "verified",
        glyph: "\u25CF",
        size: "sm"
      }, "active")
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Fleet \xB7 21 hosts",
      sub: "The inventory truth-surface. criticality is the CriticalityTier chip (not a provenance TierBadge); a policy permit is never green.",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "as-of 8s"
      })
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.FLEET,
      rowKey: "host",
      onRowClick: () => ctx.goto('host')
    }));
  }

  /* 2 · Host detail / policy editor */
  function Host({
    ctx
  }) {
    const h = D.HOST;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1000
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('fleet'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        color: 'var(--text-link)'
      }
    }, "\u2190 Fleet"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: h.host
    }), /*#__PURE__*/React.createElement(CriticalityTier, {
      tier: h.tier
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, h.cls, " \xB7 \u25CF ", h.lifecycle), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact",
      onClick: () => ctx.goto('dryrun')
    }, "Dry-run this host \u2192")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, "Evaluated now \xB7 same code path as Gateway & MCP ", /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "as-of 0.2s"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "window: ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, h.window)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "mode by action_class: ", h.modes), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "reason if queried now: [ ", h.reason, " ] \xB7 policy_version ", h.policyVersion, " (= HEAD \u2714)")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Facts \xB7 rebuildable mirror, NOT policy"), h.facts.map(([k, v, prov], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        ...mono,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)',
        width: 120
      }
    }, k), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-secondary)'
      }
    }, v), prov === 'untrusted' ? /*#__PURE__*/React.createElement(TierBadge, {
      tier: "untrusted",
      label: "host-originated"
    }) : /*#__PURE__*/React.createElement(TierBadge, {
      tier: "verified",
      label: "operator"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Policy \xB7 canonical YAML \u2014 editing any cell opens the ceremony"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", null, "criticality tier: [tier0\u25BE] \xB7 overrides (per action_class): [edit matrix]"), /*#__PURE__*/React.createElement("div", null, "snapshot_capability: [btrfs\u25BE] ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, "\u26A0 moving away from 'none' is a GATE-WEAKENING edit")), /*#__PURE__*/React.createElement("div", null, "maintenance windows: [WindowScheduleEditor] \xB7 on_window_close: [abort_and_rollback\u25BE]")), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "policy veto, not trigger"
    }, /*#__PURE__*/React.createElement("strong", null, "This surface holds no lease, mutex, or approval record."), " CMDB is the policy VETO \u2014 it cannot approve, claim, or execute. Agents cannot write policy."), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DangerAction, {
      label: "Propose policy change\u2026",
      glyph: "\u26A0",
      variant: "solid",
      title: "Weaken policy \xB7 nas-01 \xB7 snapshot_capability none \u2192 btrfs",
      consequence: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
        style: {
          marginBottom: 10
        }
      }, "This moves the system TOWARD MORE real-world action. 'btrfs' gives nas-01 in-band rollback, so snapshot-gated classes stop routing to ask/manual. Irreversible in effect until re-tightened."), /*#__PURE__*/React.createElement(BlastRadiusPreview, {
        cells: [{
          host: 'nas-01',
          cls: 'package_update',
          before: 'manual',
          after: 'auto'
        }, {
          host: 'nas-01',
          cls: 'config_change',
          before: 'ask',
          after: 'auto'
        }],
        diff: ['snapshot_capability: none', 'snapshot_capability: btrfs'],
        diffHash: "7c1e\u2026a90"
      })),
      direction: "more",
      irreversible: true,
      honest: {
        confirmed: 0,
        pending: 0,
        draining: 0
      },
      typedIntent: "WEAKEN nas-01 snapshot",
      stepUp: true,
      auditNote: "Commit \u2192 push to remote \u2192 only then snapshot swap. Writes a hash-chained policy_change_log row.",
      confirmLabel: "Weaken policy"
    }))));
  }

  /* 4 · Tiers */
  function Tiers() {
    const cols = [{
      key: 'tier',
      header: 'Tier',
      render: t => /*#__PURE__*/React.createElement(CriticalityTier, {
        tier: t.tier
      })
    }, {
      key: 'defaults',
      header: 'action_class → mode',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, t.defaults.split('🔒').map((s, i) => i === 0 ? s : /*#__PURE__*/React.createElement("span", {
        key: i
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-muted)'
        }
      }, "\uD83D\uDD12", s))))
    }, {
      key: 'hcTimeout',
      header: 'health_check_timeout_s',
      align: 'right',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: mono
      }, t.hcTimeout)
    }, {
      key: 'sshWait',
      header: 'ssh_wait_timeout_s',
      align: 'right',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: mono
      }, t.sshWait)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Tier catalog",
      sub: "The destructive-never-auto floor cells are locked \uD83D\uDD12 floor \u2014 a printed impossibility, not a disabled toggle; a floor-shrink is rejected outright."
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.TIERS,
      rowKey: "tier",
      reflow: false
    }));
  }

  /* 5 · Tasks */
  function Tasks() {
    const cols = [{
      key: 'key',
      header: 'type_key',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, t.key)
    }, {
      key: 'destructive',
      header: 'destructive',
      render: t => t.destructive ? '✔' : '—'
    }, {
      key: 'reversible',
      header: 'reversible',
      render: t => t.reversible ? '✔' : '—'
    }, {
      key: 'cls',
      header: 'action_class',
      render: t => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        size: "sm"
      }, t.cls)
    }, {
      key: 'verifier',
      header: 'external_verifier',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, t.verifier)
    }, {
      key: 'vwin',
      header: 'verification_window_s',
      align: 'right',
      render: t => /*#__PURE__*/React.createElement("span", {
        style: mono
      }, t.vwin)
    }];
    return /*#__PURE__*/React.createElement(Reg, {
      title: "Task-type registry",
      sub: "Board triage + auth PDP read this \u2014 a reclassification toward reversible/less-destructive is gate-weakening \u2192 ceremony.",
      cols: cols,
      rows: D.TASKS,
      rowKey: "key"
    });
  }

  /* 6 · Catalog */
  function Catalog() {
    const cols = [{
      key: 'key',
      header: 'playbook',
      render: c => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, c.key)
    }, {
      key: 'cls',
      header: 'action_class',
      render: c => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        size: "sm"
      }, c.cls)
    }, {
      key: 'risk',
      header: 'risk_class',
      render: c => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, c.risk)
    }, {
      key: 'tiers',
      header: 'applicable_tiers',
      render: c => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, c.tiers)
    }, {
      key: 'rollback',
      header: 'rollback_declared',
      render: c => c.rollback ? /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--state-green)'
        }
      }, "\u2714 ", c.method) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014 ", c.method)
    }, {
      key: 'sandbox',
      header: 'sandbox_eligible',
      render: c => c.sandbox ? '✔' : '—'
    }];
    return /*#__PURE__*/React.createElement(Reg, {
      title: "Runbook-catalog policy attributes",
      sub: "Policy attributes only (implementations are the Gateway's). A cell can go auto only while rollback_declared: true \u2014 so a rollback flip is gate-relevant \u2192 ceremony.",
      cols: cols,
      rows: D.CATALOG,
      rowKey: "key"
    });
  }

  /* 7 · Sandbox + kill knob */
  function Sandbox() {
    const [enabled, setEnabled] = React.useState(true);
    const cols = [{
      key: 'host',
      header: 'host_id',
      render: s => /*#__PURE__*/React.createElement(TicketRef, {
        id: s.host
      })
    }, {
      key: 'cls',
      header: 'class',
      render: s => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, "\u2699 ", s.cls)
    }, {
      key: 'creds',
      header: 'Vault creds',
      render: () => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "\uD83D\uDD12 none (by construction)")
    }, {
      key: 'verdict',
      header: 'verdict {sandbox_exec}',
      render: s => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement(Verdict, {
        v: "permit"
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "sandbox_carve_out"))
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Sandbox pool \xB7 disposable class",
      sub: "Orthogonal to tier. A policy permit is neutral, NOT green.",
      right: /*#__PURE__*/React.createElement(StatusPill, {
        tone: enabled ? 'verified' : 'neutral',
        glyph: enabled ? '●' : '◼',
        size: "sm"
      }, "knob: ", enabled ? 'ENABLED' : 'DISABLED')
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.SANDBOX,
      rowKey: "host",
      reflow: false
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: enabled ? 'secondary' : 'primary',
      onClick: () => setEnabled(v => !v)
    }, enabled ? 'Disable sandbox pool' : 'Re-enable (→ ceremony)'), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "Disabling is an instant, ceremony-free tightening \u2192 every sandbox verdict becomes deny(sandbox_disabled).")), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\u26CA",
      tag: "not a kill-switch"
    }, /*#__PURE__*/React.createElement("strong", null, "This is the policy-plane stop, not the suite kill."), " The global kill covers sandbox exec at the Gateway chokepoint \u2014 deep-links to MC for the global halt."));
  }

  /* 8 · Discovery */
  function Discovery() {
    const cols = [{
      key: 'agent',
      header: 'agent_id',
      render: d => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, d.agent)
    }, {
      key: 'name',
      header: 'reported name',
      render: d => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12
        }
      }, "\"", d.name, "\""), /*#__PURE__*/React.createElement(TierBadge, {
        tier: "untrusted",
        label: "host-originated"
      }))
    }, {
      key: 'os',
      header: 'os',
      render: d => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: mono
      }, d.os), /*#__PURE__*/React.createElement(TierBadge, {
        tier: "untrusted",
        label: "host-originated"
      }))
    }, {
      key: 'group',
      header: 'group (advisory)',
      render: d => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, d.group)
    }, {
      key: 'act',
      header: 'action',
      render: () => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6
        }
      }, /*#__PURE__*/React.createElement(DangerAction, {
        label: "bind\u2026",
        glyph: "\u26A0",
        variant: "outline",
        size: "compact",
        title: "Bind agent",
        consequence: "Bind is gate-weakening \u2014 a new host lands at 'unpolicied' and fires needs_tiering \u2192 Board.",
        direction: "more",
        typedIntent: "BIND",
        stepUp: true,
        confirmLabel: "Bind"
      }))
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Wazuh sync \xB7 discovery",
      sub: "Reported names/groups are ATTACKER-INFLUENCEABLE at enrollment. Group membership is a UI-only tiering suggestion, never auto-applied.",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "last poll \u27F34m"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "account: agent:read syscollector:read group:read \xB7 v4.14.2 \u2714 \xB7 \u25CF OK"), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.DISCOVERY,
      rowKey: "agent",
      reflow: false
    }));
  }

  /* 9 · Dry-run / VerdictTrace */
  function DryRun() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1000
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Explain a verdict",
      sub: "The console half of the binding decision \u2014 the operator runs the same evaluate() at an arbitrary time, subject-free, and sees why. A deny is a valid answer, not an error."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap',
        alignItems: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "host_id",
      mono: true,
      defaultValue: "nas-01",
      style: {
        width: 140
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "action_class",
      defaultValue: "kernel_update",
      style: {
        width: 160
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "at",
      defaultValue: "2026-07-05 23:30 Oslo",
      style: {
        width: 200
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "primary"
    }, "Explain")), /*#__PURE__*/React.createElement(VerdictTrace, {
      result: "deny"
    }));
  }

  /* 10 · Break-glass */
  function BreakGlass() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 900
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--danger-bg)',
        border: '1px solid #5A2420',
        borderRadius: 'var(--radius-panel)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 18,
        color: 'var(--danger-red)'
      }
    }, "\u26A0"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--danger-text)'
      }
    }, "Break-glass \u2014 emergency maintenance window"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--danger-text)',
        opacity: 0.85
      }
    }, "Mints ONLY a one-shot bounded window (hard cap \u22644h, auto-expiring). NEVER touches the destructive-never-auto floor."))), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "never touched"
    }, /*#__PURE__*/React.createElement("strong", null, "The destructive-never-auto floor is never touched by break-glass.")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-secondary)'
      }
    }, "db-02 \xB7 emergency allow window 90m \xB7 overrides an active freeze"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Break glass",
      glyph: "\u26A0",
      variant: "solid",
      title: "Break-glass \xB7 db-02 \xB7 emergency allow window 90m",
      consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "This OVERRIDES an active freeze (allow < freeze < break-glass lattice). db-02 becomes cleanly-in-window 90m; 3 classes clear."),
      direction: "more",
      irreversible: true,
      typedIntent: "OVERRIDE FREEZE db-02",
      stepUp: true,
      auditNote: "On arm: auto-files break_glass_posthoc review \u2192 Board; distinct chain row.",
      confirmLabel: "Break glass"
    })));
  }

  /* 11 · History */
  function History() {
    const cols = [{
      key: 'ts',
      header: 'ts',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.ts)
    }, {
      key: 'who',
      header: 'who',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "operator",
        id: r.who
      })
    }, {
      key: 'edit',
      header: 'edit_kind',
      render: r => /*#__PURE__*/React.createElement("code", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.edit)
    }, {
      key: 'target',
      header: 'target',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.target
      })
    }, {
      key: 'weakening',
      header: 'weakening',
      render: r => r.weakening ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "danger",
        glyph: "\u26A0",
        size: "sm"
      }, "YES") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        size: "sm"
      }, "tighten")
    }, {
      key: 'hash',
      header: 'diff_hash',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.hash)
    }, {
      key: 'commit',
      header: 'git_commit',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.commit)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Policy-change history",
      sub: "Hash-chained policy_change_log. This console can lie; the git remote cannot.",
      right: /*#__PURE__*/React.createElement(Button, {
        tone: "secondary",
        size: "compact"
      }, "chain-verify")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 12,
        borderColor: '#5A4A1E',
        background: 'var(--state-amber-wash)',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--state-amber-ink)'
      }
    }, "\u26A0 VERIFY OUT-OF-BAND: confirm the chain by reading ", /*#__PURE__*/React.createElement("code", {
      style: {
        ...mono
      }
    }, "git log"), " on the configured REMOTE, not here. Remote: git@\u2026/cmdb_policy.git \xB7 local HEAD present on remote \u2714"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "chain-verify: ", /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "CHAIN INTACT (local)")), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.HISTORY,
      rowKey: "ts",
      reflow: false
    }));
  }

  /* 12 · Decisions */
  function Decisions() {
    const cols = [{
      key: 'at',
      header: 'evaluated_at',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.at)
    }, {
      key: 'aud',
      header: 'aud',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.aud)
    }, {
      key: 'host',
      header: 'host_id',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.host
      })
    }, {
      key: 'cls',
      header: 'action_class',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.cls)
    }, {
      key: 'verdict',
      header: 'verdict',
      render: r => /*#__PURE__*/React.createElement(Verdict, {
        v: r.verdict
      })
    }, {
      key: 'jti',
      header: 'decision_id',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.jti)
    }, {
      key: 'basis',
      header: 'verdict_basis',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.basis)
    }];
    return /*#__PURE__*/React.createElement(Reg, {
      title: "Decision-log browser",
      sub: "Canonical append-only decision_log \u2014 every issued verdict, binding + advisory. Outcome tokens are never green.",
      cols: cols,
      rows: D.DECISIONS,
      rowKey: "jti"
    });
  }

  /* 13 · Escalations */
  function Escalations() {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1000
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Escalation outbox \u2192 Board",
      sub: "A producer view (not the ReviewQueue). Degraded-but-honest is first-class: queued, not dropped \u2014 never a red error, never hidden.",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "as-of 6s"
      })
    }), D.ESCALATIONS.map((e, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        ...panel,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(ReviewChip, {
      state: "escalated",
      reason: e.kind,
      href: "#"
    }), /*#__PURE__*/React.createElement(TicketRef, {
      id: e.target
    }), e.state === 'delivered' ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u25C8",
      size: "sm"
    }, "delivered") : /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u25D0",
      size: "sm"
    }, "queued (retry 2)"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: e.state === 'delivered' ? 'var(--signal-cyan)' : 'var(--text-muted)'
      }
    }, "\u2192 ", e.link))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--state-amber-ink)'
      }
    }, "CMDB files; only MC/Board clear. Until svc:cmdb + Board intake exist, escalations sit queued locally \u2014 flagged loudly, never dropped."));
  }
  window.CMScreens = {
    Fleet,
    Host,
    Tiers,
    Tasks,
    Catalog,
    Sandbox,
    Discovery,
    DryRun,
    BreakGlass,
    History,
    Decisions,
    Escalations
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/cmdb/cm-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/drive/app.jsx
try { (() => {
/* Helm — Drive · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    NavRail,
    AppHeader,
    KillMirror,
    FreshnessStamp
  } = H;
  const SC = window.DRScreens;
  function App() {
    const [route, setRoute] = React.useState('browser');
    const [collapsed, setCollapsed] = React.useState(false);
    const [upload, setUpload] = React.useState(false);
    const ctx = {
      goto: r => setRoute(r),
      openDetail: () => setRoute('detail'),
      openUpload: () => setUpload(true),
      closeUpload: () => setUpload(false)
    };
    const items = [{
      group: 'Store'
    }, {
      key: 'browser',
      label: 'Ticket browser',
      icon: '▤',
      active: route === 'browser',
      onClick: () => setRoute('browser')
    }, {
      key: 'detail',
      label: 'Artifact detail',
      icon: '▦',
      active: route === 'detail',
      onClick: () => setRoute('detail')
    }, {
      group: 'Admin'
    }, {
      key: 'admin',
      label: 'Admin console',
      icon: '⚙',
      active: route === 'admin',
      onClick: () => setRoute('admin')
    }];
    let screen = null,
      framed = false;
    if (route === 'browser') screen = /*#__PURE__*/React.createElement(SC.Browser, {
      ctx: ctx
    });else if (route === 'detail') {
      screen = /*#__PURE__*/React.createElement(SC.Detail, {
        ctx: ctx
      });
      framed = true;
    } else if (route === 'admin') screen = /*#__PURE__*/React.createElement(SC.Admin, {
      ctx: ctx
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "drive",
      posture: "nominal",
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Drive",
      identity: "artifact store",
      systemState: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "G0 \xB7 polled 8s"
      })
    }, /*#__PURE__*/React.createElement(KillMirror, {
      engaged: false,
      href: "#"
    })), framed ? /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }
    }, screen) : /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, screen)), upload ? /*#__PURE__*/React.createElement(SC.Upload, {
      ctx: ctx
    }) : null);
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/drive/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/drive/dr-data.jsx
try { (() => {
/* Helm — Drive · data. Exposed as window.DR_DATA.
   Artifact store keyed by originating ticket; provenance + honest verification. */
(function () {
  const GROUPS = [{
    ticket: 'T-000123',
    verify: 'verified',
    count: 4,
    size: '1.2 GiB',
    lastWrite: '2m',
    source: 'board',
    artifacts: [{
      name: 'report.pdf',
      seq: 'v3',
      mime: 'pdf',
      size: '4.1 MB',
      createdBy: 'agent:patcher-07',
      kind: 'agent',
      tier: 'verified',
      when: '2m',
      fence: {
        gen: 47,
        state: 'held'
      }
    }, {
      name: 'report.preview.pdf',
      seq: 'v1',
      mime: 'pdf',
      size: '3.9 MB',
      createdBy: 'svc:drive',
      kind: 'service',
      tier: 'derived',
      when: '2m',
      fence: null
    }, {
      name: 'metrics.csv',
      seq: 'v2',
      mime: 'text/csv',
      size: '84 KB',
      createdBy: 'agent:patcher-07',
      kind: 'agent',
      tier: 'verified',
      when: '4m',
      fence: {
        gen: 47,
        state: 'held'
      }
    }, {
      name: 'diagram.png',
      seq: 'v1',
      mime: 'image/png',
      size: '220 KB',
      createdBy: 'agent:patcher-07',
      kind: 'agent',
      tier: 'verified',
      when: '5m',
      fence: {
        gen: 47,
        state: 'held'
      }
    }]
  }, {
    ticket: 'T-000119',
    verify: 'unverified_pending',
    count: 2,
    size: '512 KB',
    lastWrite: '18m',
    source: 'board',
    note: 'Board unreachable; recheck queued',
    artifacts: [{
      name: 'export.json',
      seq: 'v1',
      mime: 'application/json',
      size: '512 KB',
      createdBy: 'agent:indexer-02',
      kind: 'agent',
      tier: 'single-source',
      when: '18m',
      fence: {
        gen: 31,
        state: 'held'
      }
    }]
  }, {
    ticket: 'T-000101',
    verify: 'verified_absent',
    count: 1,
    size: '2.1 MB',
    lastWrite: '3h',
    source: 'board',
    note: 'delete-marked → Admin escalation queue',
    artifacts: [{
      name: 'report-old.pdf',
      seq: 'v1',
      mime: 'pdf',
      size: '2.1 MB',
      createdBy: 'agent:x-09',
      kind: 'agent',
      tier: 'single-source',
      when: '3h',
      fence: {
        gen: 46,
        state: 'superseded',
        supBy: 47
      }
    }]
  }];
  const DETAIL = {
    ticket: 'T-000123',
    name: 'report.pdf',
    mime: 'pdf',
    sha: '3f9a…c1',
    tier: 'verified',
    createdBy: 'agent:patcher-07',
    versions: [{
      seq: 'v3',
      when: '2m ago',
      who: 'agent:patcher-07',
      kind: 'agent',
      hash: '3f9a…c1',
      fence: {
        gen: 47,
        state: 'held'
      },
      current: true
    }, {
      seq: 'v2',
      when: '40m ago',
      who: 'operator:ada',
      kind: 'operator',
      hash: 'a1b2…9c',
      fence: null
    }, {
      seq: 'v1',
      when: '1h ago',
      who: 'agent:patcher-07',
      kind: 'agent',
      hash: '77aa…02',
      fence: {
        gen: 46,
        state: 'superseded',
        supBy: 47
      }
    }]
  };
  const HEALTH = {
    watermark: [71, 90],
    backup: '6h ago',
    backupStale: false,
    verify: 'scrub clean 2d',
    journals: 'closed'
  };
  const ABSENT = [{
    ticket: 'T-000101',
    name: 'report-old.pdf',
    by: 'agent:x-09',
    reason: 'ticket_not_found'
  }];
  const GC = {
    phase1: '3 temps swept · 1 orphan past grace',
    chains: 12,
    refcount0: 8,
    reclaim: '4.2 GiB'
  };
  const AUDIT = [{
    at: '12:04:11Z',
    who: 'operator:ada',
    kind: 'operator',
    verb: 'gc_purge',
    target: '8 blobs',
    outcome: 'done'
  }, {
    at: '11:58:02Z',
    who: 'agent:patcher-07',
    kind: 'agent',
    verb: 'stale_fence_rejected',
    target: 'T-000123',
    outcome: 'STALE_FENCING'
  }, {
    at: '11:40:19Z',
    who: 'operator:ada',
    kind: 'operator',
    verb: 'delete_mark',
    target: 'report-old.pdf',
    outcome: 'done'
  }];
  window.DR_DATA = {
    GROUPS,
    DETAIL,
    HEALTH,
    ABSENT,
    GC,
    AUDIT
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/drive/dr-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/drive/dr-parts.jsx
try { (() => {
/* Helm — Drive · app-specific components. Exposed as window.DRParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    TierBadge,
    StatusPill,
    Button
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panel = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };
  const TMAP = {
    verified: ['verified', 'verified'],
    derived: ['corroborated', '~derived'],
    'single-source': ['single', 'single-source']
  };
  function tierBadge(t) {
    const m = TMAP[t] || ['single', t];
    return /*#__PURE__*/React.createElement(TierBadge, {
      tier: m[0],
      label: m[1]
    });
  }
  function verifyPill(v) {
    if (v === 'verified') return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "VERIFIED");
    if (v === 'unverified_pending') return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u25D0",
      size: "sm"
    }, "UNVERIFIED_PENDING");
    return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "danger",
      glyph: "\u26D2",
      size: "sm"
    }, "VERIFIED_ABSENT");
  }

  /* PreviewSurface — inline artifact viewer; enforces the sniffed allowlist. */
  function PreviewSurface({
    artifact,
    degraded
  }) {
    if (degraded) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--surface-screen)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          maxWidth: 360,
          background: 'var(--halt-gold-wash)',
          border: '1px solid var(--halt-gold-edge)',
          borderRadius: 'var(--radius-panel)',
          padding: 18,
          textAlign: 'center'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 24,
          color: 'var(--halt-gold)'
        }
      }, "\u26CA"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--halt-gold-ink)',
          margin: '6px 0'
        }
      }, "Preview unavailable \u2014 pdf renderer is down"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          lineHeight: '18px',
          color: 'var(--halt-gold-ink)',
          opacity: 0.9
        }
      }, "This is the renderer safe-stopping, not a lost file. ", /*#__PURE__*/React.createElement("b", null, "Still true:"), " original bytes intact \u2014 Download still works.")));
    }
    const mime = artifact.mime;
    const isImg = mime && mime.startsWith('image/');
    const isText = mime === 'text/plain' || mime === 'text/csv';
    const isPdf = mime === 'pdf' || mime === 'application/pdf';
    const allow = isImg || isText || isPdf;
    if (!allow) {
      return /*#__PURE__*/React.createElement("div", {
        style: {
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          background: 'var(--surface-screen)'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          ...panel,
          padding: 18,
          maxWidth: 320,
          textAlign: 'center'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          fontSize: 22,
          color: 'var(--text-muted)'
        }
      }, "\u2B07"), /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--text-primary)',
          margin: '6px 0'
        }
      }, "Download only \u2014 ", mime), /*#__PURE__*/React.createElement("div", {
        style: {
          ...mono,
          fontSize: 10,
          color: 'var(--text-muted)'
        }
      }, "nosniff \xB7 CSP: sandbox \xB7 attachment-default"), /*#__PURE__*/React.createElement("div", {
        style: {
          marginTop: 10
        }
      }, /*#__PURE__*/React.createElement(Button, {
        tone: "secondary",
        size: "compact",
        icon: "\u2193"
      }, "Download"))));
    }
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: isText ? 'var(--paper-page)' : 'var(--surface-backdrop)',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20
      }
    }, isText ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 17,
        lineHeight: '28px',
        color: 'var(--paper-ink)',
        maxWidth: 520
      }
    }, "host,cpu,mem", /*#__PURE__*/React.createElement("br", null), "web-01,12%,41%", /*#__PURE__*/React.createElement("br", null), "web-02,9%,38%") : isImg ? /*#__PURE__*/React.createElement("div", {
      style: {
        width: 200,
        height: 140,
        borderRadius: 6,
        background: 'repeating-conic-gradient(#2A2F38 0% 25%, #232830 0% 50%) 50% / 24px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        ...mono,
        fontSize: 11
      }
    }, artifact.name) : /*#__PURE__*/React.createElement("div", {
      style: {
        width: 240,
        height: 300,
        background: 'var(--paper-page)',
        borderRadius: 4,
        boxShadow: 'var(--shadow-dialog)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 20,
        fontFamily: 'var(--font-serif)',
        fontSize: 15,
        color: 'var(--paper-ink)'
      }
    }, artifact.name)), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 14px',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        background: 'var(--surface-raised)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "Provenance"), tierBadge(artifact.tier), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "sniffed ", mime, " \xB7 CSP:sandbox")));
  }

  /* DiskWatermarkMeter — fill-vs-threshold gauge; crossing is amber/gold, never green. */
  function DiskWatermarkMeter({
    used,
    watermark
  }) {
    const over = used >= watermark;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        minWidth: 260
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "disk"), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        flex: 1,
        height: 10,
        background: 'var(--surface-inset)',
        borderRadius: 5,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: used + '%',
        height: '100%',
        background: over ? 'var(--halt-gold)' : used > watermark - 20 ? 'var(--state-amber)' : 'var(--signal-cyan)'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'absolute',
        left: watermark + '%',
        top: -2,
        bottom: -2,
        width: 2,
        background: 'var(--danger-red)'
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: over ? 'var(--halt-gold-ink)' : 'var(--text-secondary)'
      }
    }, used, "% / ", watermark, "%"));
  }

  /* UploadDropzone — drag-drop target with per-file streaming rows. */
  function UploadDropzone() {
    const files = [{
      name: 'report-final.pdf',
      state: 'committed',
      pct: 100
    }, {
      name: 'appendix.pdf',
      state: 'streaming',
      pct: 62
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        border: '1.5px dashed var(--border-strong)',
        borderRadius: 'var(--radius-panel)',
        padding: 24,
        textAlign: 'center',
        background: 'var(--surface-inset)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontSize: 22,
        color: 'var(--text-muted)'
      }
    }, "\u2191"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-secondary)',
        marginTop: 4
      }
    }, "Drag files here, or click to browse")), files.map(f => /*#__PURE__*/React.createElement("div", {
      key: f.name,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        flex: 1
      }
    }, f.name), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 120,
        height: 6,
        background: 'var(--surface-inset)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: f.pct + '%',
        height: '100%',
        background: f.state === 'committed' ? 'var(--state-green)' : 'var(--signal-cyan)'
      }
    })), f.state === 'committed' ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "committed") : /*#__PURE__*/React.createElement(StatusPill, {
      tone: "interactive",
      glyph: "\u29D7",
      size: "sm"
    }, "streaming"))));
  }
  window.DRParts = {
    tierBadge,
    verifyPill,
    PreviewSurface,
    DiskWatermarkMeter,
    UploadDropzone,
    eyebrow,
    mono,
    panel
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/drive/dr-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/drive/dr-screens.jsx
try { (() => {
/* Helm — Drive · screens (4). Exposed as window.DRScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.DR_DATA;
  const P = window.DRParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    StatusPill,
    FenceState,
    FreshnessStamp,
    Button,
    DangerAction,
    ConfirmFriction,
    ErrorState,
    Input,
    ReviewChip
  } = H;
  const {
    tierBadge,
    verifyPill,
    PreviewSurface,
    DiskWatermarkMeter,
    UploadDropzone,
    eyebrow,
    mono,
    panel
  } = P;
  function Head({
    crumb,
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, crumb ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, crumb) : null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '2px 0 0'
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '82ch'
      }
    }, sub) : null), right);
  }

  /* 1 · Ticket Browser */
  function Browser({
    ctx
  }) {
    const cols = [{
      key: 'name',
      header: 'Name',
      render: a => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--text-primary)'
        }
      }, a.name)
    }, {
      key: 'seq',
      header: 'Ver',
      render: a => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, a.seq)
    }, {
      key: 'mime',
      header: 'Type',
      render: a => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, a.mime)
    }, {
      key: 'size',
      header: 'Size',
      align: 'right',
      render: a => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, a.size)
    }, {
      key: 'createdBy',
      header: 'created_by',
      render: a => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: a.kind,
        id: a.createdBy
      })
    }, {
      key: 'tier',
      header: 'Provenance',
      render: a => tierBadge(a.tier)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Ticket browser",
      sub: "Artifacts grouped by the ticket that produced them. Every file names its provenance; the store never lies about whether it still belongs to a real ticket.",
      right: /*#__PURE__*/React.createElement(Button, {
        tone: "primary",
        icon: "\u2191",
        onClick: ctx.openUpload
      }, "Upload")
    }), D.GROUPS.map(g => /*#__PURE__*/React.createElement("div", {
      key: g.ticket,
      style: {
        ...panel,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 14px',
        borderBottom: '1px solid var(--border-default)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: g.ticket,
      href: "#"
    }), verifyPill(g.verify), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, g.count, " artifacts \xB7 ", g.size, " \xB7 last write ", g.lastWrite), g.note ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: g.verify === 'verified_absent' ? 'var(--danger-text)' : 'var(--state-amber-ink)'
      }
    }, "\u26A0 ", g.note) : /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: `source: ${g.source}`
    })), g.verify !== 'verified_absent' ? /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 4
      }
    }, /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: g.artifacts,
      rowKey: "name",
      onRowClick: () => ctx.openDetail()
    })) : /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '10px 14px'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "compact",
      onClick: () => ctx.goto('admin')
    }, "\u2192 Admin escalation queue")))));
  }

  /* 2 · Artifact Detail */
  function Detail({
    ctx
  }) {
    const d = D.DETAIL;
    const [degraded, setDegraded] = React.useState(false);
    const cols = [{
      key: 'seq',
      header: 'Seq',
      render: v => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: v.current ? 'var(--text-primary)' : 'var(--text-muted)'
        }
      }, v.seq, v.current ? ' ◀' : '')
    }, {
      key: 'when',
      header: 'When',
      render: v => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, v.when)
    }, {
      key: 'who',
      header: 'Who',
      render: v => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: v.kind,
        id: v.who
      })
    }, {
      key: 'hash',
      header: 'Hash',
      render: v => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, v.hash)
    }, {
      key: 'fence',
      header: 'Fence',
      render: v => v.fence ? /*#__PURE__*/React.createElement(FenceState, {
        gen: v.fence.gen,
        state: v.fence.state,
        supersededBy: v.fence.supBy
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--surface-raised)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('browser'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        color: 'var(--text-link)'
      }
    }, "\u2190 ", d.ticket), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "VERIFIED"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, d.name), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact",
      icon: "\u2193"
    }, "Download current"), /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "compact",
      onClick: () => setDegraded(v => !v)
    }, degraded ? '↺ renderer up (demo)' : '⚠ renderer down (demo)')), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 1fr) minmax(300px, 1fr)',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        overflow: 'auto',
        padding: 16,
        borderRight: '1px solid var(--border-default)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", null, "ticket ", /*#__PURE__*/React.createElement(TicketRef, {
      id: d.ticket,
      href: "#"
    })), /*#__PURE__*/React.createElement("div", null, "created_by ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: d.createdBy
    })), /*#__PURE__*/React.createElement("div", null, "mime ", d.mime, " \xB7 sha256 ", d.sha, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--signal-cyan)'
      }
    }, "\u29C9copy"))), /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Version history \xB7 append-only"), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: d.versions,
      rowKey: "seq",
      reflow: false
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact",
      icon: "\u2193"
    }, "this version"), /*#__PURE__*/React.createElement(ConfirmLight, {
      label: "\u21A9 Restore v2",
      title: "Restore version v2",
      consequence: "Restores v2 as the current version. Reversible."
    }), /*#__PURE__*/React.createElement(ConfirmLight, {
      label: "\u25FC Delete-mark",
      title: "Delete-mark current",
      consequence: "Marks the current version deleted. Reversible via Restore."
    }))), /*#__PURE__*/React.createElement(PreviewSurface, {
      artifact: {
        name: d.name,
        mime: d.mime,
        tier: d.tier
      },
      degraded: degraded
    })));
  }
  function ConfirmLight({
    label,
    title,
    consequence
  }) {
    const [o, setO] = React.useState(false);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact",
      onClick: () => setO(true)
    }, label), /*#__PURE__*/React.createElement(ConfirmFriction, {
      open: o,
      intensity: "light",
      title: title,
      consequence: consequence,
      direction: "less",
      confirmLabel: label,
      onCancel: () => setO(false),
      onConfirm: () => setO(false)
    }));
  }

  /* 3 · Upload (modal) */
  function Upload({
    ctx
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'var(--scrim)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '10vh 24px'
      },
      onMouseDown: e => {
        if (e.target === e.currentTarget) ctx.closeUpload();
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: '100%',
        maxWidth: 520,
        ...panel,
        background: 'var(--surface-raised)',
        boxShadow: 'var(--shadow-dialog)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '14px 18px',
        borderBottom: '1px solid var(--border-default)',
        display: 'flex',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, "Upload to T-000123"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "compact",
      onClick: ctx.closeUpload
    }, "\u2715")), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 18,
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement(UploadDropzone, null), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "Ticket",
      mono: true,
      defaultValue: "T-000123",
      style: {
        width: 150
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "Logical name",
      defaultValue: "report-final.pdf",
      style: {
        flex: 1,
        minWidth: 160
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      onClick: ctx.closeUpload
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      onClick: ctx.closeUpload
    }, "Upload")))));
  }

  /* 4 · Admin */
  function Admin({
    ctx
  }) {
    const auditCols = [{
      key: 'at',
      header: 'Time',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.at)
    }, {
      key: 'who',
      header: 'Who',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: r.kind,
        id: r.who
      })
    }, {
      key: 'verb',
      header: 'Action',
      render: r => /*#__PURE__*/React.createElement("code", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.verb)
    }, {
      key: 'target',
      header: 'Target',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.target)
    }, {
      key: 'outcome',
      header: 'Outcome',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: r.outcome === 'STALE_FENCING' ? 'var(--danger-text)' : 'var(--text-secondary)'
        }
      }, r.outcome)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "admin",
      title: "Drive admin",
      sub: "The one screen with a destructive affordance. GC purge is refused suite-wide while any kill epoch is engaged."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, "Health strip ", /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "healthz \xB7 8s"
    })), /*#__PURE__*/React.createElement(DiskWatermarkMeter, {
      used: D.HEALTH.watermark[0],
      watermark: D.HEALTH.watermark[1]
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: 18,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", null, "backup ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " ", D.HEALTH.backup), /*#__PURE__*/React.createElement("span", null, "last-verify ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " ", D.HEALTH.verify), /*#__PURE__*/React.createElement("span", null, "journals ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " ", D.HEALTH.journals))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "verified_absent escalation queue"), D.ABSENT.map(r => /*#__PURE__*/React.createElement("div", {
      key: r.ticket,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: r.ticket,
      href: "#"
    }), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "danger",
      glyph: "\u26D2",
      size: "sm"
    }, "VERIFIED_ABSENT"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, r.name), /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: r.by
    }), /*#__PURE__*/React.createElement(ReviewChip, {
      state: "escalated",
      reason: r.reason,
      href: "#"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "compact"
    }, "inspect")))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Orphan / GC console"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "Phase-1 (auto, continuous): ", D.GC.phase1, " [read-only log]"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "Phase-2 (manual): ", D.GC.chains, " delete-marked chains \xB7 ", D.GC.refcount0, " refcount-0 \xB7 ", D.GC.reclaim), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Purge reclaimable",
      glyph: "\u26D4",
      variant: "solid",
      title: "GC purge \u2014 reclaim \u2192 destroy",
      consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "This ", /*#__PURE__*/React.createElement("strong", null, "PERMANENTLY removes ", D.GC.refcount0, " refcount-0 blobs (", D.GC.reclaim, ")"), " + ", D.GC.chains, " delete-marked chains. Purged bytes cannot be restored."),
      direction: "more",
      irreversible: true,
      blastRadius: `${D.GC.refcount0} blobs · ${D.GC.chains} chains · tickets T-000101…`,
      typedIntent: "PURGE",
      stepUp: true,
      auditNote: "Refused server-side under auth-staleness or an engaged kill epoch (fails closed).",
      confirmLabel: "Purge"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "Audit log \xB7 append-only (mutations + denials)"), /*#__PURE__*/React.createElement(DataTable, {
      columns: auditCols,
      rows: D.AUDIT,
      rowKey: "at",
      reflow: false
    })));
  }
  window.DRScreens = {
    Browser,
    Detail,
    Upload,
    Admin
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/drive/dr-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gateway/app.jsx
try { (() => {
/* Helm — Gateway · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    NavRail,
    AppHeader,
    KillMirror,
    StatusPill
  } = H;
  const SC = window.GWScreens;
  function App() {
    const [route, setRoute] = React.useState('monitor');
    const [collapsed, setCollapsed] = React.useState(false);
    const [run, setRun] = React.useState(null);
    const [posture, setPosture] = React.useState('nominal');
    const ctx = {
      posture,
      goto: r => setRoute(r),
      openRun: r => {
        setRun(r);
        setRoute('run');
      }
    };
    const items = [{
      group: 'The hands'
    }, {
      key: 'monitor',
      label: 'Monitor',
      icon: '⧗',
      active: route === 'monitor' || route === 'run',
      onClick: () => setRoute('monitor')
    }, {
      key: 'audit',
      label: 'Audit',
      icon: '⛓',
      active: route === 'audit',
      onClick: () => setRoute('audit')
    }, {
      key: 'kill',
      label: 'Kill-switch',
      icon: '▮▮',
      active: route === 'kill',
      onClick: () => setRoute('kill')
    }, {
      group: 'Write paths'
    }, {
      key: 'catalog',
      label: 'Catalog',
      icon: '▤',
      active: route === 'catalog',
      onClick: () => setRoute('catalog')
    }, {
      key: 'sandbox',
      label: 'Sandbox',
      icon: '◎',
      active: route === 'sandbox',
      onClick: () => setRoute('sandbox')
    }, {
      key: 'orphans',
      label: 'Orphans',
      icon: '⚠',
      active: route === 'orphans',
      onClick: () => setRoute('orphans')
    }];
    let screen = null;
    if (route === 'monitor') screen = /*#__PURE__*/React.createElement(SC.Monitor, {
      ctx: ctx
    });else if (route === 'run' && run) screen = /*#__PURE__*/React.createElement(SC.RunDetail, {
      run: run,
      ctx: ctx
    });else if (route === 'audit') screen = /*#__PURE__*/React.createElement(SC.Audit, null);else if (route === 'kill') screen = /*#__PURE__*/React.createElement(SC.KillStatus, {
      ctx: ctx
    });else if (route === 'catalog') screen = /*#__PURE__*/React.createElement(SC.Catalog, null);else if (route === 'sandbox') screen = /*#__PURE__*/React.createElement(SC.Sandbox, null);else if (route === 'orphans') screen = /*#__PURE__*/React.createElement(SC.Orphans, {
      ctx: ctx
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "gateway",
      posture: posture === 'kill' ? 'kill' : 'nominal',
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#",
      onPostureClick: e => {
        e.preventDefault();
        setRoute('kill');
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Gateway",
      identity: "the hands \u2014 the only component that executes on hosts",
      systemState: posture === 'kill' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "halt",
        glyph: "\u25AE\u25AE",
        size: "sm"
      }, "G1 freeze") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        glyph: "\u25CF",
        size: "sm"
      }, "G0 normal")
    }, /*#__PURE__*/React.createElement(KillMirror, {
      engaged: posture === 'kill',
      href: "#",
      label: posture === 'kill' ? 'Kill engaged' : 'Nominal'
    })), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, screen)), /*#__PURE__*/React.createElement("button", {
      onClick: () => setPosture(p => p === 'kill' ? 'nominal' : 'kill'),
      style: {
        position: 'fixed',
        bottom: 14,
        right: 14,
        zIndex: 2000,
        height: 28,
        padding: '0 12px',
        borderRadius: 999,
        border: '1px solid var(--border-strong)',
        background: 'var(--surface-raised)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        cursor: 'pointer'
      }
    }, posture === 'kill' ? '↺ clear kill (demo)' : '▮▮ simulate kill (demo)'));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gateway/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gateway/gw-data.jsx
try { (() => {
/* Helm — Gateway · data. Exposed as window.GW_DATA.
   The Hands: the only component that runs commands on real hosts. Read-first. */
(function () {
  const RUNS = [{
    id: 'R-01HX9Q',
    host: 'host-db-01',
    state: 'executing',
    ticket: 'T-000482',
    by: 'agent:patcher-07',
    cls: 'kernel_update',
    destructive: true,
    fence: {
      gen: 47,
      lease: '04:12',
      hb: '0.8s',
      state: 'held'
    },
    sod: [1, 1, 1, 1],
    task: 'task 6/9 apt-get dist-up…',
    untrusted: true
  }, {
    id: 'R-01HY2K',
    host: 'host-web-03',
    state: 'verifying',
    ticket: 'T-000501',
    by: 'agent:patcher-02',
    cls: 'package_update',
    destructive: false,
    fence: {
      gen: 51,
      lease: '02:03',
      hb: '1.1s',
      state: 'held'
    },
    sod: [1, 1, 1, 1],
    task: 'Wazuh poll: 2/5 pairs gone'
  }, {
    id: 'R-01HZ7M',
    host: 'host-nas-01',
    state: 'frozen',
    ticket: 'T-000488',
    by: 'agent:patcher-09',
    cls: 'reboot',
    destructive: true,
    fence: {
      gen: 40,
      lease: '00:44',
      hb: '2.0s',
      state: 'held'
    },
    sod: [1, 1, 1, 1],
    task: 'run halted at task boundary'
  }, {
    id: null,
    host: 'host-mail-02',
    state: 'idle',
    ticket: null,
    by: null,
    cls: null,
    destructive: false,
    fence: null,
    sod: null,
    task: 'no active run · last done 22m'
  }, {
    id: 'R-01HP3F',
    host: 'host-x',
    state: 'failed',
    ticket: 'T-000701',
    by: 'agent:patcher-11',
    cls: 'package_update',
    destructive: false,
    sod: [0],
    reject: 'STALE_FENCE',
    task: 'rejected preflight'
  }];
  const byId = {};
  RUNS.forEach(r => {
    if (r.id) byId[r.id] = r;
  });
  const AUDIT = [{
    seq: 41802,
    at: '12:04:11',
    who: 'agent:patcher-07',
    kind: 'agent',
    verb: 'dispatch',
    target: 'R-01HX',
    outcome: 'executing',
    ok: true
  }, {
    seq: 41801,
    at: '12:04:10',
    who: 'svc:gateway',
    kind: 'service',
    verb: 'cred_redeem',
    target: 'cred://',
    outcome: 'ok',
    ok: true
  }, {
    seq: 41800,
    at: '12:04:02',
    who: 'operator:ada',
    kind: 'operator',
    verb: 'catalog_promote',
    target: 'patch_debian v5',
    outcome: 'ok',
    ok: true
  }, {
    seq: 41799,
    at: '12:03:57',
    who: 'agent:patcher-11',
    kind: 'agent',
    verb: 'dispatch',
    target: 'host-x',
    outcome: 'STALE_FENCE',
    ok: false
  }];
  const KILL = {
    level: 'G1',
    epoch: 4471,
    inFlight: 1,
    refuseAt: '12:04:09',
    confirmed: 2,
    pending: 0,
    draining: 1,
    drainDetail: 'R-01HZ… host-nas-01 · dpkg · will finish+log'
  };
  const CATALOG = [{
    key: 'patch_debian',
    ver: 'v4',
    sha: '9f3a…b1',
    cls: 'package_update',
    rollback: 'snapshot',
    sig: 'ed',
    state: 'active'
  }, {
    key: 'reboot_host',
    ver: 'v2',
    sha: 'a180…44',
    cls: 'reboot',
    rollback: 'none',
    sig: 'ed',
    state: 'active'
  }, {
    key: 'sbx_pytest',
    ver: 'v2',
    sha: '4400…aa',
    cls: 'sandbox_exec',
    rollback: 'n/a',
    sig: 'ed',
    state: 'active'
  }, {
    key: 'patch_debian',
    ver: 'v5',
    sha: 'ee02…7d',
    cls: 'package_update',
    rollback: 'snapshot',
    sig: 'pending',
    state: 'pending'
  }];
  const SANDBOX = [{
    id: 'R-01HS4A',
    ticket: 'T-000733',
    profile: 'sbx_pytest',
    exit: 0,
    harness: 'hv-4c1a…',
    finished: '11:58',
    input: 'note nt-…@rev14',
    transcript: '===== 12 passed in 3.41s =====',
    env: 'image sha256:… · py3.12 · pytest8.2'
  }, {
    id: 'R-01HR2B',
    ticket: 'T-000730',
    profile: 'sbx_lint',
    exit: 2,
    harness: 'hv-4c1a…',
    finished: '11:41',
    input: 'note nt-…@rev9',
    transcript: 'E501 line too long (94 > 88)',
    env: 'image sha256:… · py3.12 · ruff0.4'
  }];
  const ORPHANS = [{
    id: 'R-01HP8G',
    host: 'host-fs-04',
    stateAtCrash: 'executing',
    ticket: 'T-000701',
    by: 'agent:patcher-05',
    crashed: '11:12 task 4/7',
    hold: 39,
    probe: 'reachable ✔ · reboot marker present ⚠',
    reason: 'orphaned'
  }];
  window.GW_DATA = {
    RUNS,
    byId,
    AUDIT,
    KILL,
    CATALOG,
    SANDBOX,
    ORPHANS
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gateway/gw-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gateway/gw-parts.jsx
try { (() => {
/* Helm — Gateway · app-specific components. Exposed as window.GWParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    StatusPill,
    TicketRef,
    PrincipalRef,
    FenceState,
    TierBadge
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panel = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };
  const STATE = {
    executing: ['interactive', '⧗', 'EXECUTING'],
    verifying: ['attention', '✔', 'VERIFYING'],
    frozen: ['halt', '▮▮', 'FROZEN G1'],
    failed: ['danger', '✕', 'FAILED'],
    idle: ['neutral', '●', 'IDLE'],
    draining: ['draining', '⇉', 'DRAINING']
  };
  function statePill(s, size) {
    const m = STATE[s] || STATE.idle;
    return /*#__PURE__*/React.createElement(StatusPill, {
      tone: m[0],
      glyph: m[1],
      size: size
    }, m[2]);
  }

  /* SoDChainStrip — four-check (+caller) segregation-of-duties evidence. Read-only. */
  const CHECKS = [{
    n: 0,
    name: 'CALLER',
    ev: 'token aud=gateway · cnf DPoP✔ · introspect · ep4471'
  }, {
    n: 1,
    name: 'BOARD',
    ev: 'consume_approval [apr-…]→executing · plan_hash sha256:9f… ✔ · allowlist 3/3'
  }, {
    n: 2,
    name: 'CMDB',
    ev: 'verdict permit [dec-…] · policy a1b2 · window ✔'
  }, {
    n: 3,
    name: 'VAULT',
    ev: 'cred cred://hosts/host-db-01/root · lse-…⧗ · SSH-CA TTL 11m · plaintext: never here'
  }, {
    n: 4,
    name: 'MUTEX',
    ev: '🔒 gen47 · pg advisory lock · fence>46 ✔'
  }];
  function SoDChainStrip({
    full,
    sod,
    reject,
    fence
  }) {
    const passCount = reject ? sod ? sod.length : 0 : 5;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: full ? 14 : 0,
        background: full ? 'var(--surface-inset)' : 'transparent',
        border: full ? '1px solid var(--border-default)' : 0
      }
    }, full ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "Segregation-of-duties chain \xB7 reconstructed from audit") : null, !full ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "SoD ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: reject ? 'var(--danger-red)' : 'var(--state-green)'
      }
    }, reject ? '✕' : '✔✔✔✔'), !reject ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, " appr\xB7pol\xB7cred\xB7mtx") : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--danger-text)'
      }
    }, " ", reject)) : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, CHECKS.map(c => {
      const failed = reject && c.n === passCount - 1;
      const notReached = reject && c.n >= passCount;
      return /*#__PURE__*/React.createElement("div", {
        key: c.n,
        style: {
          display: 'flex',
          gap: 8,
          ...mono,
          fontSize: 12,
          color: notReached ? 'var(--text-disabled)' : 'var(--text-secondary)'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: notReached ? 'var(--text-disabled)' : failed ? 'var(--danger-red)' : 'var(--state-green)',
          width: 14
        }
      }, notReached ? '—' : failed ? '✕' : '✔'), /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-muted)',
          width: 70
        }
      }, c.n, " ", c.name), /*#__PURE__*/React.createElement("span", {
        style: {
          flex: 1
        }
      }, notReached ? 'not reached' : failed ? reject : c.ev));
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid var(--border-strong)',
        marginTop: 4,
        paddingTop: 8,
        display: 'flex',
        gap: 8,
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontVariantEmoji: 'text'
      }
    }, "\uD83D\uDD12"), " SoD is enforced in Gateway code, not here. This screen displays evidence; no control can skip, relax, or re-order a check.")));
  }

  /* RunConsole — streaming machine-output tail (mono terminal). */
  function RunConsole({
    task,
    lines,
    stale
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--surface-raised)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "Console"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, task, " \xB7 \u27F3 0.4s"), stale ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--halt-gold-ink)'
      }
    }, "\u26A0 CANNOT CONFIRM live output \u2014 treating as safe-stopped") : null), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface-backdrop)',
        padding: 12,
        ...mono,
        fontSize: 12,
        lineHeight: '19px',
        color: stale ? 'var(--text-muted)' : 'var(--ink-secondary)',
        minHeight: 90
      }
    }, (lines || []).map((l, i) => /*#__PURE__*/React.createElement("div", {
      key: i
    }, l)), !stale ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--signal-cyan)'
      }
    }, "\u258F"), " (streaming \u2014 Last-Event-ID 00461)") : null));
  }

  /* SandboxEvidenceView — tier-0 evidence: input UNTRUSTED vs evidence VERIFIED. */
  function SandboxEvidenceView({
    run
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: run.ticket,
      href: "#"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, run.profile), /*#__PURE__*/React.createElement(StatusPill, {
      tone: run.exit === 0 ? 'verified' : 'danger',
      glyph: run.exit === 0 ? '✔' : '✕',
      size: "sm"
    }, "exit ", run.exit)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "env: ", run.env), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 16,
        flexWrap: 'wrap',
        fontFamily: 'var(--font-ui)',
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, "input_ref"), /*#__PURE__*/React.createElement("span", {
      style: mono
    }, run.input), /*#__PURE__*/React.createElement(TierBadge, {
      tier: "untrusted",
      label: "curation-ingested"
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        gap: 6,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, "evidence"), /*#__PURE__*/React.createElement(TierBadge, {
      tier: "verified",
      label: "sandbox-verified \xB7 gateway-delivered"
    }))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface-backdrop)',
        borderRadius: 6,
        padding: 10,
        ...mono,
        fontSize: 12,
        color: 'var(--ink-secondary)'
      }
    }, run.transcript), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "target: fresh podman container \xB7 no suite networks \xB7 no creds"));
  }
  window.GWParts = {
    statePill,
    SoDChainStrip,
    RunConsole,
    SandboxEvidenceView,
    eyebrow,
    mono,
    panel
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gateway/gw-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/gateway/gw-screens.jsx
try { (() => {
/* Helm — Gateway · screens (7). Exposed as window.GWScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.GW_DATA;
  const P = window.GWParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    StatusPill,
    FenceState,
    TierBadge,
    HaltBand,
    HonestState,
    FreshnessStamp,
    Button,
    DangerAction,
    ReviewChip,
    PrintedAbsence
  } = H;
  const {
    statePill,
    SoDChainStrip,
    RunConsole,
    SandboxEvidenceView,
    eyebrow,
    mono,
    panel
  } = P;
  function Head({
    crumb,
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, crumb ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, crumb) : null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '2px 0 0'
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '82ch'
      }
    }, sub) : null), right);
  }

  /* S1 · Live Execution Monitor */
  function Monitor({
    ctx
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Live execution",
      sub: "What is running on which host, right now, and is every run inside its four-check envelope. The Gateway starts nothing on its own.",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "fresh 480ms"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 12
      }
    }, D.RUNS.map((r, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        ...panel,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        cursor: r.id ? 'pointer' : 'default'
      },
      onClick: () => r.id && ctx.openRun(r)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifyContent: 'space-between'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 13,
        color: 'var(--text-primary)',
        fontWeight: 600
      }
    }, r.host), statePill(r.state, 'sm')), r.id ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: r.id
    }), /*#__PURE__*/React.createElement(TicketRef, {
      id: r.ticket,
      href: "#"
    })) : null, r.by ? /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: r.by
    }) : null, r.cls ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "class: ", r.cls), r.destructive ? /*#__PURE__*/React.createElement(TierBadge, {
      tier: "untrusted",
      label: "destructive"
    }) : null) : null, r.fence ? /*#__PURE__*/React.createElement(FenceState, {
      gen: r.fence.gen,
      lease: r.fence.lease,
      heartbeat: r.fence.hb,
      state: r.fence.state
    }) : null, r.sod ? /*#__PURE__*/React.createElement(SoDChainStrip, {
      sod: r.sod,
      reject: r.reject
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, r.task)))));
  }

  /* S2 · Run Detail + SoD Proof */
  function RunDetail({
    run,
    ctx
  }) {
    const r = run;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 900
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('monitor'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        color: 'var(--text-link)'
      }
    }, "\u2190 Monitor"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: r.id
    }), statePill(r.state, 'sm'), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "host ", r.host), /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "0.4s"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: r.ticket,
      href: "#"
    }), /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: r.by
    }), /*#__PURE__*/React.createElement("span", null, "class ", r.cls, r.destructive ? ' ⚠' : ''), /*#__PURE__*/React.createElement("span", null, "op_id \u2026")), /*#__PURE__*/React.createElement(SoDChainStrip, {
      full: true,
      sod: r.sod,
      reject: r.reject
    }), /*#__PURE__*/React.createElement(RunConsole, {
      task: "task 6/9",
      lines: ['TASK [patch_debian: apt-get dist-upgrade] changed'],
      stale: ctx.posture === 'kill'
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "health-check: pending \xB7 rollback path: snapshot (available)"));
  }

  /* S3 · Audit Trail */
  function Audit() {
    const cols = [{
      key: 'seq',
      header: 'Seq',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, r.seq)
    }, {
      key: 'at',
      header: 'Time',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.at)
    }, {
      key: 'who',
      header: 'Who',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: r.kind,
        id: r.who
      })
    }, {
      key: 'verb',
      header: 'Action',
      render: r => /*#__PURE__*/React.createElement("code", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.verb)
    }, {
      key: 'target',
      header: 'Target',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.target
      })
    }, {
      key: 'outcome',
      header: 'Outcome',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: r.ok ? 'var(--text-secondary)' : 'var(--danger-text)'
        }
      }, r.outcome)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1100
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Audit chain",
      sub: "Append-only, hash-chained, Ed25519-signed per-command forensic log. Only a completed successful walk is green; a detected break is red; everything between is gold.",
      right: /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "chain_id gw-main \xB7 41,802 records \xB7 \u27F31.2s")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 6
      }
    }, "Chain-verify"), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "VERIFIED seq 41500\u219241802 \xB7 302 records \xB7 Ed25519 \xB7 1.9s")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 6
      }
    }, "MC anchor status"), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "IN SYNC \xB7 HEAD 41800 \xB7 MC ack 41800"))), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.AUDIT,
      rowKey: "seq",
      reflow: false
    }));
  }

  /* S4 · Kill-switch Status */
  function KillStatus({
    ctx
  }) {
    const K = D.KILL;
    const engaged = ctx.posture === 'kill';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 900
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Kill-switch \xB7 L2 physical stop",
      sub: "The Gateway IS the L2 physical stop and its confirmation is the sole legitimate L2-CONFIRMED source auth reads directly. The trigger is not here \u2014 it deep-links out."
    }), engaged ? /*#__PURE__*/React.createElement(HaltBand, {
      mode: "kill",
      confirmed: K.confirmed,
      pending: K.pending,
      draining: K.draining,
      pendingCountdown: "0:00",
      drainingDetail: K.drainDetail,
      readOnly: true,
      reviewHref: "#",
      reviewLabel: "Halt console (MC)",
      message: "Gateway refuses all new dispatch + new Vault redemptions. In-flight runs cancel at next safe task boundary."
    }) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "L2 confirmation \xB7 this Gateway \u2014 auth reads directly"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "epoch_seen ", K.epoch, " \xB7 level ", engaged ? K.level : 'G0', " \xB7 in_flight ", engaged ? K.inFlight : 0, " \xB7 refuse ", engaged ? K.refuseAt : '—'), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "signed halt-status ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " \xB7 \u27F3 own truth, not a mirror"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "auth L1 epoch (mirror) ", K.epoch, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u27140.3s"), " \xB7 in sync")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "Halted-run aftermath"), /*#__PURE__*/React.createElement(HonestState, {
      confirmed: engaged ? K.confirmed : 0,
      pending: engaged ? K.pending : 0,
      draining: engaged ? K.draining : 0,
      drainingDetail: engaged ? K.drainDetail : undefined
    })), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\u26CA",
      tag: "not here"
    }, /*#__PURE__*/React.createElement("strong", null, "No kill trigger lives here."), " The actuator deep-links to Mission Control / auth."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact"
    }, "Halt console (MC) \u2192"), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact"
    }, "auth safe_stopped console \u2192")));
  }

  /* S5 · Catalog Registry */
  function Catalog() {
    const cols = [{
      key: 'key',
      header: 'key',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, r.key)
    }, {
      key: 'ver',
      header: 'ver',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: r.state === 'pending' ? 'var(--state-amber-ink)' : 'var(--text-secondary)'
        }
      }, r.ver, r.state === 'pending' ? '▲' : '')
    }, {
      key: 'sha',
      header: 'content_sha256',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.sha)
    }, {
      key: 'cls',
      header: 'class',
      render: r => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        size: "sm"
      }, r.cls)
    }, {
      key: 'rollback',
      header: 'rollback',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.rollback)
    }, {
      key: 'sig',
      header: 'sig',
      render: r => r.sig === 'pending' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "attention",
        glyph: "\u29D7",
        size: "sm"
      }, "PENDING") : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--state-green)',
          ...mono,
          fontSize: 11
        }
      }, "\u2714 ed")
    }, {
      key: 'act',
      header: '',
      render: r => r.state === 'pending' ? /*#__PURE__*/React.createElement(DangerAction, {
        label: "Review & apply",
        glyph: "\u26A0",
        variant: "solid",
        size: "compact",
        title: `Promote ${r.key} ${r.ver}`,
        consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "Applies the exact sha256 diff shown. Direction: MORE real-world action."),
        direction: "more",
        irreversible: true,
        blastRadius: "12 hosts have patch_debian in an open allowlist",
        typedIntent: "PROMOTE",
        stepUp: true,
        auditNote: "Diff-hash-bound; writes a tamper-evident audit row.",
        confirmLabel: "Promote"
      }) : null
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1100
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Playbook catalog",
      sub: "The one operator write path. Change control is diff-hash-bound, step-up gated, and writes a tamper-evident audit row.",
      right: /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "6 active \xB7 1 pending change")
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.CATALOG,
      rowKey: 'key',
      reflow: false
    }), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "operator-only"
    }, /*#__PURE__*/React.createElement("strong", null, "Agents cannot write the catalog by any path."), " This is an operator-only, step-up gate."));
  }

  /* S6 · Sandbox Runs */
  function Sandbox() {
    const [sel, setSel] = React.useState(D.SANDBOX[0]);
    const cols = [{
      key: 'id',
      header: 'run',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.id
      })
    }, {
      key: 'ticket',
      header: 'ticket',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.ticket,
        href: "#"
      })
    }, {
      key: 'profile',
      header: 'profile',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.profile)
    }, {
      key: 'exit',
      header: 'exit',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: r.exit === 0 ? 'var(--state-green)' : 'var(--danger-red)'
        }
      }, r.exit === 0 ? '✔0' : '✕' + r.exit)
    }, {
      key: 'finished',
      header: 'finished',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.finished)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1100
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Sandbox runs \xB7 tier-0",
      sub: "Tier-0 sandbox evidence = external verification for the Library's admission gate. No host parameter exists anywhere here (the non-leak guarantee).",
      right: /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "harness hv-4c1a\u20269d20")
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.SANDBOX,
      rowKey: "id",
      focusedKey: sel.id,
      onRowClick: setSel,
      reflow: false
    }), /*#__PURE__*/React.createElement(SandboxEvidenceView, {
      run: sel
    }));
  }

  /* S7 · Orphan Reconciliation */
  function Orphans({
    ctx
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 900
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Orphan reconciliation",
      sub: "After a Gateway crash mid-run the Board hold persists deliberately (the host may have been touched). The Gateway never auto-resumes a half-run.",
      right: /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "1 orphan \xB7 0 auto-resolvable")
    }), D.ORPHANS.map(o => /*#__PURE__*/React.createElement("div", {
      key: o.id,
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: o.id
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "host ", o.host), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u29D7",
      size: "sm"
    }, "executing@crash")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: o.ticket,
      href: "#"
    }), /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: o.by
    }), /*#__PURE__*/React.createElement("span", null, "crashed ", o.crashed)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "Board hold:"), /*#__PURE__*/React.createElement(FenceState, {
      gen: o.hold,
      state: "held",
      advisory: true
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "NOT reaper-eligible (orphan)")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "read-only probe: ", o.probe), /*#__PURE__*/React.createElement(ReviewChip, {
      state: "escalated",
      reason: o.reason,
      href: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(DangerAction, {
      label: "Request fresh credential + probe",
      glyph: "\u26A0",
      variant: "solid",
      title: `Re-redeem ${o.id}`,
      consequence: "Mints a fresh minimal-TTL release for a READ-ONLY probe. It moves toward touching a host again.",
      direction: "more",
      typedIntent: "PROBE",
      stepUp: true,
      confirmLabel: "Request"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "never auto-resumes a half-run \u2014 truthful terminal")))), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "by construction"
    }, /*#__PURE__*/React.createElement("strong", null, "The Gateway never auto-resumes a half-run.")));
  }
  window.GWScreens = {
    Monitor,
    RunDetail,
    Audit,
    KillStatus,
    Catalog,
    Sandbox,
    Orphans
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/gateway/gw-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/library/app.jsx
try { (() => {
/* Helm — Library · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.LB_DATA;
  const {
    NavRail,
    AppHeader,
    KillMirror,
    FreshnessStamp
  } = H;
  const SC = window.LBScreens;
  function App() {
    const [route, setRoute] = React.useState('search');
    const [collapsed, setCollapsed] = React.useState(false);
    const [doc, setDoc] = React.useState(D.DOCS[0]);
    const ctx = {
      setDoc,
      doc,
      goto: r => setRoute(r),
      openDoc: d => {
        setDoc(d);
        setRoute('inspector');
      }
    };
    const items = [{
      group: 'Shelf'
    }, {
      key: 'search',
      label: 'Search',
      icon: '⌕',
      active: route === 'search',
      onClick: () => setRoute('search')
    }, {
      key: 'inspector',
      label: 'Doc inspector',
      icon: '▤',
      active: route === 'inspector',
      onClick: () => setRoute('inspector')
    }, {
      group: 'Admin · operator only'
    }, {
      key: 'ingestion',
      label: 'Ingestion review',
      icon: '◈',
      active: route === 'ingestion',
      onClick: () => setRoute('ingestion')
    }, {
      key: 'spotaudit',
      label: 'Spot-audit',
      icon: '◎',
      active: route === 'spotaudit',
      onClick: () => setRoute('spotaudit')
    }, {
      key: 'collections',
      label: 'Collections',
      icon: '▦',
      active: route === 'collections',
      onClick: () => setRoute('collections')
    }, {
      key: 'index',
      label: 'Index status',
      icon: '⚙',
      active: route === 'index',
      onClick: () => setRoute('index')
    }];
    let screen = null,
      framed = false;
    if (route === 'search') {
      screen = /*#__PURE__*/React.createElement(SC.Search, {
        ctx: ctx
      });
      framed = true;
    } else if (route === 'inspector') screen = /*#__PURE__*/React.createElement(SC.Inspector, {
      doc: doc,
      ctx: ctx
    });else if (route === 'ingestion') screen = /*#__PURE__*/React.createElement(SC.Ingestion, null);else if (route === 'spotaudit') screen = /*#__PURE__*/React.createElement(SC.SpotAudit, null);else if (route === 'collections') screen = /*#__PURE__*/React.createElement(SC.Collections, null);else if (route === 'index') screen = /*#__PURE__*/React.createElement(SC.IndexStatus, null);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "library",
      posture: "nominal",
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Library",
      identity: "the corporate reference shelf",
      systemState: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "G0 \xB7 0.4s"
      })
    }, /*#__PURE__*/React.createElement(KillMirror, {
      engaged: false,
      href: "#"
    })), framed ? /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        minHeight: 0,
        padding: 24,
        display: 'flex',
        flexDirection: 'column'
      }
    }, screen) : /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, screen)));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/library/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/library/lib-data.jsx
try { (() => {
/* Helm — Library · data. Exposed as window.LB_DATA.
   A curated RAG corpus: cited, tier-tagged, version-correct reference docs. */
(function () {
  const DOCS = [{
    id: 'lib-01J1QZ',
    title: 'lvextend — LVM2 2.03',
    heading: 'lvextend › Growing a volume',
    tier: 'sandbox-verified',
    ver: 'exact',
    covered: true,
    status: 'current',
    proposedBy: 'agent:curator-03',
    admittedBy: 'operator:ada',
    ticket: 'T-000123',
    lastVerified: '2026-07-01',
    appliesTo: 'linux/ubuntu 24.04·22.04 amd64',
    body: [['Growing a volume', 'Use lvextend to grow a logical volume, then grow the filesystem. Verify with lvdisplay.', true], ['lvextend flags', 'The -r flag resizes the filesystem in the same step on supported types.', true], ['Also works on…', 'This section claims lvextend also works on thin pools without caveat.', false]],
    ledger: [{
      when: '07-02 14:10',
      kind: 'sandbox',
      att: 'gateway_delivered',
      run: 'R-00A9 hv-3f2c9a',
      bound: 'match',
      outcome: 'satisfies gate'
    }, {
      when: '07-01 09:22',
      kind: 'crossref',
      att: 'agent_asserted',
      run: '3 origins ~heur',
      bound: null,
      outcome: 'never gates'
    }, {
      when: '06-30 —',
      kind: 'operator',
      att: 'operator_review',
      run: '—',
      bound: null,
      outcome: 'admitted'
    }],
    sources: 'gnu.org (~heuristic origin-cluster) · git history ▸'
  }, {
    id: 'lib-01H2AA',
    title: 'LVM2 — Resize',
    heading: 'LVM2 › Resize',
    tier: 'cross-referenced',
    ver: 'exact',
    covered: false,
    status: 'current',
    proposedBy: 'agent:curator-07',
    admittedBy: 'operator:ada',
    ticket: 'T-000123',
    lastVerified: '2026-06-28',
    appliesTo: 'linux/ubuntu 24.04 amd64',
    body: [['Resize', 'Cross-referenced resize procedure.', false]],
    ledger: [],
    sources: 'kernel.org · man7.org'
  }, {
    id: 'lib-01G3BB',
    title: 'blog: "just run lvextend"',
    heading: 'blog › "just run lvextend"',
    tier: 'single-source',
    ver: '~approximate',
    covered: false,
    status: 'current',
    proposedBy: 'agent:curator-03',
    admittedBy: null,
    ticket: null,
    lastVerified: '—',
    appliesTo: 'linux (unverified)',
    body: [['Just run…', 'A single blog asserting a one-liner. Treat with suspicion.', false]],
    ledger: [],
    sources: 'random-blog.example'
  }, {
    id: 'lib-01F4CC',
    title: 'note-derived resize',
    heading: 'note › derived',
    tier: 'agent-authored',
    ver: 'exact',
    covered: false,
    status: 'current',
    proposedBy: 'agent:curator-03',
    admittedBy: null,
    ticket: null,
    lastVerified: '—',
    appliesTo: 'linux/ubuntu 24.04',
    body: [['Derived', 'Agent-authored from a note — never gates.', false]],
    ledger: [],
    sources: 'note N-01J2AA'
  }];
  const byId = {};
  DOCS.forEach(d => {
    byId[d.id] = d;
  });
  const INGEST = [{
    id: 'lib-01K5DD',
    tier: 'cross-referenced',
    proposedBy: 'agent:curator-03',
    ticket: 'T-000341',
    distinctness: '3 origins ~heur',
    age: '2h',
    eligible: true
  }, {
    id: 'lib-01L6EE',
    tier: 'cross-referenced',
    proposedBy: 'agent:curator-07',
    ticket: 'T-000341',
    distinctness: '3 origins ~heur',
    age: '2h',
    eligible: true
  }, {
    id: 'lib-01M7FF',
    tier: 'single-source',
    proposedBy: 'agent:curator-03',
    ticket: 'T-000355',
    distinctness: '1 origin (agent-picked ⚠)',
    age: '4h',
    eligible: false,
    note: 'agent-asserted sandbox evidence present → content-bound gate'
  }];
  const SPOTAUDIT = [{
    id: 'lib-01N8GG',
    run: 'R-00B2 hv-3f2c9a',
    covered: '4/5',
    coveredOk: true,
    admittedBy: 'svc:sandbox-auto'
  }, {
    id: 'lib-01P9HH',
    run: 'R-00B4 hv-3f2c9a',
    covered: '2/6',
    coveredOk: false,
    admittedBy: 'svc:sandbox-auto'
  }];
  const LIFECYCLE = [{
    id: 'lib-01Q0II',
    status: 'current',
    appliesTo: 'ubuntu 22.04 amd64',
    lastVerified: '2025-11-02',
    flag: 'past valid_until',
    action: 'Retire'
  }, {
    id: 'lib-01R1JJ',
    status: 'current',
    appliesTo: 'ubuntu 20.04 amd64',
    lastVerified: '2025-08-14',
    flag: 'distro EOL (CMDB)',
    action: 'Supersede'
  }, {
    id: 'lib-01S2KK',
    status: 'superseded',
    appliesTo: 'ubuntu 24.04 amd64',
    lastVerified: '2026-06-30',
    flag: 'superseded_by lib-01T…',
    action: null
  }];
  const COLLECTIONS = ['cli-reference', 'distro-guides', 'advisories'];
  const INDEX = {
    model: 'qwen3-emb-0.6b',
    digest: '9c1f…',
    dim: 1024,
    chunker: 'cc-2a7…',
    head: 'a9c…',
    builtAt: '2s ago',
    degraded: [{
      kind: 'semantic',
      text: 'SEMANTIC RETRIEVAL DEGRADED — agent-runtime unreachable · serving lexical-only'
    }, {
      kind: 'durability',
      text: 'DURABILITY DEGRADED — corpus push 12 min behind · retrying · admissions record locally (canon)'
    }],
    pendingEmbed: 3
  };
  window.LB_DATA = {
    DOCS,
    byId,
    INGEST,
    SPOTAUDIT,
    LIFECYCLE,
    COLLECTIONS,
    INDEX
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/library/lib-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/library/lib-parts.jsx
try { (() => {
/* Helm — Library · app-specific components. Exposed as window.LBParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    TierBadge,
    StatusPill,
    PrincipalRef,
    Input
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panel = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };
  const TMAP = {
    'sandbox-verified': ['verified', 'Sandbox-verified'],
    'cross-referenced': ['corroborated', 'Cross-referenced'],
    'single-source': ['single', 'Single-source'],
    'agent-authored': ['single', 'Agent-authored']
  };
  function tierBadge(tier) {
    const m = TMAP[tier] || ['single', tier];
    return /*#__PURE__*/React.createElement(TierBadge, {
      tier: m[0],
      label: m[1]
    });
  }
  function Untrusted() {
    return /*#__PURE__*/React.createElement(TierBadge, {
      tier: "untrusted",
      label: "curation-ingested"
    });
  }
  function VerChip({
    ver
  }) {
    const col = ver === 'exact' ? 'var(--text-secondary)' : ver === 'unverified' ? 'var(--halt-gold-ink)' : 'var(--state-amber-ink)';
    return /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: col
      }
    }, ver);
  }
  function CoverChip({
    covered
  }) {
    return covered ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--state-green)'
      }
    }, "\u25A3 cov") : /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--state-amber-ink)'
      }
    }, "\u25A2 unc");
  }

  /* DocReadingPane — Workshop paper body with per-chunk evidence-coverage shading. */
  function DocReadingPane({
    doc
  }) {
    if (!doc) return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13
      }
    }, "Select a result to read.");
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
        background: 'var(--paper-page)'
      }
    }, /*#__PURE__*/React.createElement("article", {
      style: {
        maxWidth: 640,
        margin: '0 auto',
        padding: '32px 36px 60px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: 'var(--paper-ink-muted)',
        marginBottom: 8
      }
    }, doc.appliesTo), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 26,
        lineHeight: '34px',
        fontWeight: 600,
        color: 'var(--paper-ink)',
        margin: '0 0 20px'
      }
    }, doc.title), doc.body.map(([h, p, cov], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 18,
        position: 'relative',
        paddingLeft: 16
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        position: 'absolute',
        left: 0,
        top: 4,
        color: cov ? 'var(--paper-hairline)' : '#B58900',
        fontFamily: 'var(--font-mono)',
        fontSize: 12
      }
    }, cov ? '' : '▢'), /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 18,
        fontWeight: 600,
        color: 'var(--paper-ink)',
        margin: '0 0 6px'
      }
    }, h), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 16,
        lineHeight: '25px',
        color: 'var(--paper-ink)',
        margin: 0,
        background: cov ? 'var(--paper-inset)' : 'transparent',
        padding: cov ? '4px 8px' : 0,
        borderRadius: 4
      }
    }, p), !cov ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        color: '#8a5a00',
        marginTop: 3
      }
    }, "not execution-covered") : null))));
  }

  /* ScopeResolver — host_id XOR target_* + honest version_scope + include_unverified. */
  function ScopeResolver() {
    const [scope, setScope] = React.useState('host');
    const [unver, setUnver] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(Input, {
      icon: "\u2315",
      placeholder: "how to extend an lvm volume\u2026   /",
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "scope"), [['host', 'host_id [host_9f2…]'], ['target', 'target: os·distro·ver·arch']].map(([k, label]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setScope(k),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        color: scope === k ? 'var(--signal-cyan-ink)' : 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12
      }
    }, scope === k ? '◉' : '○', " ", label)), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "|"), /*#__PURE__*/React.createElement("span", null, "version_scope: ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714 exact"), " (CMDB fresh 1.2s)"), /*#__PURE__*/React.createElement("span", null, "k [8]"), /*#__PURE__*/React.createElement("button", {
      onClick: () => setUnver(v => !v),
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        color: unver ? 'var(--signal-cyan-ink)' : 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12
      }
    }, unver ? '☑' : '☐', " include_unverified")));
  }

  /* AdmissionDiff — quarantine body vs source markdown + frontmatter delta. */
  function AdmissionDiff({
    doc
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--paper-page)',
        borderRadius: 'var(--radius-panel)',
        padding: 16,
        ...mono,
        fontSize: 12,
        lineHeight: '19px',
        color: 'var(--paper-ink)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--paper-ink-muted)',
        marginBottom: 8
      }
    }, doc.id, " \xB7 gnu.org vs quarantine body"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#DDF0E0',
        color: '#1E5B32',
        padding: '1px 6px',
        borderRadius: 3
      }
    }, "+ lvextend -r resizes the fs in one step"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: '#F3DADA',
        color: '#7A2420',
        padding: '1px 6px',
        borderRadius: 3,
        marginTop: 3,
        textDecoration: 'line-through'
      }
    }, "\u2212 also works on thin pools without caveat"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: '#8a5a00',
        marginTop: 8
      }
    }, "sources: 3 clusters (~heuristic distinctness \u2014 NOT a verified-independence badge)"));
  }
  window.LBParts = {
    tierBadge,
    Untrusted,
    VerChip,
    CoverChip,
    DocReadingPane,
    ScopeResolver,
    AdmissionDiff,
    eyebrow,
    mono,
    panel
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/library/lib-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/library/lib-screens.jsx
try { (() => {
/* Helm — Library · screens (6). Exposed as window.LBScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.LB_DATA;
  const P = window.LBParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    StatusPill,
    FreshnessStamp,
    Button,
    DangerAction,
    PrintedAbsence,
    ErrorState
  } = H;
  const {
    tierBadge,
    Untrusted,
    VerChip,
    CoverChip,
    DocReadingPane,
    ScopeResolver,
    AdmissionDiff,
    eyebrow,
    mono,
    panel
  } = P;
  function Head({
    crumb,
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, crumb ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, crumb) : null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '2px 0 0'
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '82ch'
      }
    }, sub) : null), right);
  }
  // Factory (not a module-scope element): creating an element at eval time would
  // fire React.createElement before StatusPill is in scope in the shared bundle.
  const adminTag = () => /*#__PURE__*/React.createElement(StatusPill, {
    tone: "neutral",
    glyph: "\u25D0",
    size: "sm"
  }, "library:admin \xB7 operator only");

  /* 1 · Corpus Search */
  function Search({
    ctx
  }) {
    const [sel, setSel] = React.useState(D.DOCS[0]);
    const cols = [{
      key: 'tier',
      header: 'Tier',
      render: d => tierBadge(d.tier)
    }, {
      key: 'doc',
      header: 'Doc › heading',
      render: d => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 2
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--text-primary)'
        }
      }, d.heading), /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 10,
          color: 'var(--text-disabled)'
        }
      }, d.id))
    }, {
      key: 'ver',
      header: 'Ver',
      render: d => /*#__PURE__*/React.createElement(VerChip, {
        ver: d.ver
      })
    }, {
      key: 'cover',
      header: 'Cover',
      render: d => /*#__PURE__*/React.createElement(CoverChip, {
        covered: d.covered
      })
    }, {
      key: 'taint',
      header: 'Taint',
      render: () => /*#__PURE__*/React.createElement(Untrusted, null)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Corpus search",
      sub: "The corporate reference shelf. Every hit carries its trust envelope inline \u2014 tier, version scope, evidence coverage, and the curation-ingested taint.",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "0.3s ago"
      })
    }), /*#__PURE__*/React.createElement(ScopeResolver, null), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        minHeight: 0,
        overflow: 'auto'
      }
    }, /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.DOCS,
      rowKey: "id",
      focusedKey: sel && sel.id,
      onRowClick: d => {
        setSel(d);
        ctx && ctx.setDoc && ctx.setDoc(d);
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 8
      }
    }, "retrieval_mode: hybrid \xB7 RRF-fused \xB7 tier is a badge, NOT a sort key \xB7 source: index @corpus a9c\u2026 0.3s")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        overflow: 'hidden',
        display: 'flex',
        minHeight: 280
      }
    }, /*#__PURE__*/React.createElement(DocReadingPane, {
      doc: sel
    }))));
  }

  /* 2 · Doc / Provenance Inspector */
  function Inspector({
    doc,
    ctx
  }) {
    const d = doc || D.DOCS[0];
    const attCell = r => r.att === 'gateway_delivered' ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "gateway_delivered") : r.att === 'agent_asserted' ? /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u25D1",
      size: "sm"
    }, "agent_asserted"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--text-muted)'
      }
    }, "\uD83D\uDD12 \u2715 never gates")) : /*#__PURE__*/React.createElement(StatusPill, {
      tone: "neutral",
      glyph: "\u25D0",
      size: "sm"
    }, "operator_review");
    const cols = [{
      key: 'when',
      header: 'When',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.when)
    }, {
      key: 'kind',
      header: 'Kind',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.kind)
    }, {
      key: 'att',
      header: 'Attestation',
      render: attCell
    }, {
      key: 'run',
      header: 'Run / sources',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.run)
    }, {
      key: 'bound',
      header: 'Content-bound',
      render: r => r.bound === 'match' ? /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--state-green)',
          ...mono,
          fontSize: 11
        }
      }, "\u2714 sha match") : r.bound ? /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--halt-gold-ink)',
          ...mono,
          fontSize: 11
        }
      }, "\u26A0 stale") : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }, {
      key: 'outcome',
      header: 'Outcome',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: r.outcome === 'never gates' ? 'var(--text-muted)' : 'var(--text-secondary)'
        }
      }, r.outcome)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1100
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('search'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        color: 'var(--text-link)'
      }
    }, "\u2039 Search"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: d.id
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 17,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, d.title), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u25CF",
      size: "sm"
    }, "ADMITTED"), tierBadge(d.tier), /*#__PURE__*/React.createElement(Untrusted, null)), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-muted)',
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", null, "proposed_by ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: d.proposedBy
    })), d.admittedBy ? /*#__PURE__*/React.createElement("span", null, "admitted_by ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "operator",
      id: d.admittedBy
    })) : null, d.ticket ? /*#__PURE__*/React.createElement(TicketRef, {
      id: d.ticket,
      href: "#"
    }) : null, /*#__PURE__*/React.createElement("span", {
      style: mono
    }, "applies_to: ", d.appliesTo, " \xB7 last_verified ", d.lastVerified)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "Evidence ledger \xB7 append-only"), d.ledger.length ? /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: d.ledger,
      rowKey: "when",
      reflow: false
    }) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13
      }
    }, "No evidence rows."), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, "chain-verify: ", /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "Gateway audit chain confirmed"), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "(stale \u21D2 \u26A0 CANNOT CONFIRM, gold \u2014 never green)"))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "Chunk / coverage map"), d.body.map(([h,, cov], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 0',
        ...mono,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: cov ? 'var(--state-green)' : 'var(--state-amber-ink)'
      }
    }, cov ? '▣ covered' : '▢ UNCOVERED'), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-secondary)'
      }
    }, "#", i, " ", h))), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        marginTop: 6
      }
    }, "sources: ", d.sources)), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        overflow: 'hidden',
        display: 'flex',
        minHeight: 260
      }
    }, /*#__PURE__*/React.createElement(DocReadingPane, {
      doc: d
    }))));
  }

  /* 3 · Ingestion Review Queue */
  function Ingestion() {
    const [view, setView] = React.useState(null);
    const cols = [{
      key: 'tier',
      header: 'Tier',
      render: r => tierBadge(r.tier)
    }, {
      key: 'id',
      header: 'Doc',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.id
      })
    }, {
      key: 'proposedBy',
      header: 'Proposed by',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "agent",
        id: r.proposedBy
      })
    }, {
      key: 'ticket',
      header: 'Ticket',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.ticket,
        href: "#"
      })
    }, {
      key: 'distinctness',
      header: 'Distinctness',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--state-amber-ink)'
        }
      }, r.distinctness, " \u26A0")
    }, {
      key: 'age',
      header: 'Age',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: r.age
      })
    }, {
      key: 'diff',
      header: '',
      render: r => /*#__PURE__*/React.createElement(Button, {
        tone: "ghost",
        size: "compact",
        onClick: () => setView(r)
      }, "view \u25B8")
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "library:admin",
      title: "Ingestion review \xB7 tier-2 admission gate",
      sub: "Library's OWN admission gate \u2014 a distinct queue with distinct authority (item id is doc_id, not a Board ticket). agent-asserted evidence is never auto-admit-eligible.",
      right: adminTag()
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "neutral",
      size: "sm"
    }, "switching: NORMAL"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "batch cap 10"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Admit selected",
      glyph: "\u26A0",
      variant: "outline",
      title: "Admit 2 docs",
      consequence: "Adds trusted content to the shelf every agent reads. Bulk-approve is capped at 10.",
      direction: "more",
      typedIntent: "ADMIT",
      stepUp: true,
      auditNote: "Echoes batch size + the doc_ids.",
      confirmLabel: "Admit"
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Reject selected",
      glyph: "\u26A0",
      variant: "outline",
      title: "Reject selected",
      consequence: "Rejects the selected proposals.",
      direction: "less",
      confirmLabel: "Reject"
    })), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.INGEST,
      rowKey: "id"
    }), D.INGEST.filter(r => !r.eligible).map(r => /*#__PURE__*/React.createElement(PrintedAbsence, {
      key: r.id,
      glyph: "\uD83D\uDD12",
      tag: "content-bound gate"
    }, /*#__PURE__*/React.createElement("strong", null, r.id, " is NOT admit-eligible."), " ", r.note, " \u2014 no affordance, no MCP bypass path.")), view ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "AdmissionDiff \xB7 ", view.id), /*#__PURE__*/React.createElement(AdmissionDiff, {
      doc: view
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        marginTop: 12,
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement(DangerAction, {
      label: "Reject",
      glyph: "\u26A0",
      variant: "outline",
      title: `Reject ${view.id}`,
      consequence: "Rejects this proposal.",
      direction: "less",
      confirmLabel: "Reject"
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Admit \u2192 cross-referenced",
      glyph: "\u26A0",
      variant: "solid",
      title: `Admit ${view.id}`,
      consequence: "Admits to cross-referenced tier. Distinctness raises priority, never confers trust.",
      direction: "more",
      typedIntent: view.id,
      stepUp: true,
      confirmLabel: "Admit"
    }))) : null);
  }

  /* 4 · Spot-Audit Stream */
  function SpotAudit() {
    const cols = [{
      key: 'tier',
      header: 'Tier',
      render: () => tierBadge('sandbox-verified')
    }, {
      key: 'id',
      header: 'Doc',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.id
      })
    }, {
      key: 'run',
      header: 'Run / harness',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.run)
    }, {
      key: 'covered',
      header: 'Covered',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: r.coveredOk ? 'var(--state-green)' : 'var(--state-amber-ink)'
        }
      }, r.coveredOk ? '▣' : '▢', " ", r.covered, !r.coveredOk ? ' ⚠' : '')
    }, {
      key: 'admittedBy',
      header: 'Admitted by',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "service",
        id: r.admittedBy
      })
    }, {
      key: 'act',
      header: 'Audit',
      render: r => /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 6
        }
      }, /*#__PURE__*/React.createElement(Button, {
        tone: "ghost",
        size: "compact"
      }, "Confirm ok"), /*#__PURE__*/React.createElement(DangerAction, {
        label: "Reject",
        glyph: "\u26A0",
        variant: "outline",
        size: "compact",
        title: `Reject ${r.id}`,
        consequence: "Rejects an already-admitted doc (synchronous index removal); trips tightened switching. If the origin cluster contains admitted docs, a second confirm gates cluster quarantine.",
        direction: "more",
        typedIntent: r.id,
        stepUp: true,
        confirmLabel: "Reject"
      }))
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "library:admin",
      title: "Tier-1 spot-audit \xB7 auto-admissions",
      sub: "Auditing already-admitted docs, not gating. Uncovered-heavy rows surface prominently \u2014 the anti-tier-riding cue.",
      right: /*#__PURE__*/React.createElement(StatusPill, {
        tone: "attention",
        glyph: "\u25B2",
        size: "sm"
      }, "TIGHTENED \xB7 100% \xB7 harness_version change")
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.SPOTAUDIT,
      rowKey: "id"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "sample rate: 100% (young) \u2014 steady 5% \xB7 ANSI-Z1.4 switching \xB7 never green (tightened is an audit posture, not health)"));
  }

  /* 5 · Collections & Lifecycle */
  function Collections() {
    const cols = [{
      key: 'id',
      header: 'Doc',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.id
      })
    }, {
      key: 'status',
      header: 'Status',
      render: r => r.status === 'current' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "verified",
        glyph: "\u25CF",
        size: "sm"
      }, "current") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "draining",
        glyph: "\u21C9",
        size: "sm"
      }, "superseded")
    }, {
      key: 'appliesTo',
      header: 'applies_to',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.appliesTo)
    }, {
      key: 'lastVerified',
      header: 'last_verified',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.lastVerified)
    }, {
      key: 'flag',
      header: 'Flag',
      render: r => r.status === 'superseded' ? /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, r.flag) : /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--state-amber-ink)'
        }
      }, "\u25B2 ", r.flag)
    }, {
      key: 'act',
      header: '',
      render: r => r.action ? /*#__PURE__*/React.createElement(DangerAction, {
        label: r.action,
        glyph: "\u26A0",
        variant: "outline",
        size: "compact",
        title: `${r.action} ${r.id}`,
        consequence: "Preserves evidence history; mints/links a new lineage doc, never edits bytes. No delete capability exists.",
        direction: "more",
        typedIntent: r.action.toUpperCase(),
        stepUp: true,
        confirmLabel: r.action
      }) : null
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "library:admin",
      title: "Collections & lifecycle",
      sub: "Retirement is operator-decided, never automatic deletion. Retire/Supersede preserve evidence history \u2014 never a body edit, never a delete.",
      right: adminTag()
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, D.COLLECTIONS.map(c => /*#__PURE__*/React.createElement(StatusPill, {
      key: c,
      tone: "neutral",
      size: "sm"
    }, c)), /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact"
    }, "+ New collection")), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.LIFECYCLE,
      rowKey: "id"
    }), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "not a capability"
    }, /*#__PURE__*/React.createElement("strong", null, "There is no delete affordance anywhere."), " Deletion is not a capability \u2014 supersession preserves lineage."));
  }

  /* 6 · Index Status */
  function IndexStatus() {
    const I = D.INDEX;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1080
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "library:admin",
      title: "Index status",
      sub: "The named home of the Library's degraded modes. Corpus\u2194index consistency uses the false-green rule \u2014 an index that leads corpus shows serving-suspended in gold, never a green OK.",
      right: adminTag()
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", null, "model_id: ", I.model, " \xB7 digest ", I.digest, " \xB7 dim ", I.dim, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, "(PENDING-SIZING)"), " \xB7 chunker ", I.chunker), /*#__PURE__*/React.createElement("div", null, "corpus HEAD ", I.head, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), " \xB7 index_meta.corpus_commit ", I.head, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714 (ancestor-or-equal)"), " \xB7 built_at ", I.builtAt, " \u27F3")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Health / degraded modes"), I.degraded.map((g, i) => /*#__PURE__*/React.createElement(ErrorState, {
      key: i,
      pattern: "D",
      title: g.text.split(' — ')[0]
    }, g.text.split(' — ')[1])), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "pending_embed: ", I.pendingEmbed, " docs \u2014 served from FTS half, vectors queued (retrieval_mode: partial)"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--state-green)'
      }
    }, "\u2714 corpus\u2194index consistent \xB7 nightly integrity sweep: last 03:00 \u2714")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "Rebuild"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Full reindex (destroy + rebuild)",
      glyph: "\u26A0",
      variant: "solid",
      title: "Full reindex",
      consequence: "Suspends vector+FTS serving until rebuild completes; stale results withheld, not served. Proves the rebuildable invariant.",
      direction: "more",
      irreversible: true,
      typedIntent: "REINDEX",
      stepUp: true,
      confirmLabel: "Reindex"
    })));
  }
  window.LBScreens = {
    Search,
    Inspector,
    Ingestion,
    SpotAudit,
    Collections,
    IndexStatus
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/library/lib-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mission-control/app.jsx
try { (() => {
/* Helm — Mission Control · shell + router.
   Reads window.MCScreens (screens), window.MCParts (HaltNotConfirmed), and the
   design-system bundle. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.MC_DATA;
  const {
    NavRail,
    AppHeader,
    StopActuator,
    FreshnessStamp
  } = H;
  const {
    KillLevelPill,
    HaltNotConfirmed
  } = window.MCParts;
  const SC = window.MCScreens;
  function App() {
    const [route, setRoute] = React.useState('overview');
    const [posture, setPosture] = React.useState('nominal');
    const [level, setLevel] = React.useState('G1');
    const [collapsed, setCollapsed] = React.useState(false);
    const [agent, setAgent] = React.useState(null);
    const [item, setItem] = React.useState(null);
    const [haltFail, setHaltFail] = React.useState(false);
    const ctx = {
      posture,
      level,
      goto: r => {
        setAgent(null);
        setItem(null);
        setRoute(r);
      },
      openAgent: a => {
        setAgent(a);
        setRoute('agent');
      },
      openItem: q => {
        setItem(q);
        setRoute('review-item');
      },
      onEngage: lvl => {
        setLevel(lvl);
        setPosture('kill');
      },
      onLift: () => setPosture('nominal'),
      onHaltFail: () => setHaltFail(true)
    };
    const items = [{
      group: 'Cockpit'
    }, {
      key: 'overview',
      label: 'Home',
      icon: '⌂',
      active: route === 'overview',
      onClick: () => ctx.goto('overview')
    }, {
      key: 'agents',
      label: 'Agents',
      icon: '⬡',
      active: route === 'agents' || route === 'agent',
      onClick: () => ctx.goto('agents')
    }, {
      key: 'review',
      label: 'Review',
      icon: '◈',
      badge: D.counts.awaiting + D.counts.needsReview + D.counts.escalated,
      active: route === 'review' || route === 'review-item',
      onClick: () => ctx.goto('review')
    }, {
      key: 'halt',
      label: 'Halt',
      icon: '▮▮',
      active: route === 'halt',
      onClick: () => ctx.goto('halt')
    }, {
      group: 'Guardrails'
    }, {
      key: 'budgets',
      label: 'Budget',
      icon: '▤',
      active: route === 'budgets',
      onClick: () => ctx.goto('budgets')
    }, {
      key: 'edge',
      label: 'Edge',
      icon: '~',
      active: route === 'edge',
      onClick: () => ctx.goto('edge')
    }, {
      key: 'anchors',
      label: 'Anchors',
      icon: '⛓',
      active: route === 'anchors',
      onClick: () => ctx.goto('anchors')
    }, {
      group: 'Config'
    }, {
      key: 'settings',
      label: 'Settings',
      icon: '⚙',
      active: route === 'settings',
      onClick: () => ctx.goto('settings')
    }];
    let screen = null;
    if (route === 'overview') screen = /*#__PURE__*/React.createElement(SC.Overview, {
      ctx: ctx
    });else if (route === 'agents') screen = /*#__PURE__*/React.createElement(SC.LiveAgentView, {
      ctx: ctx
    });else if (route === 'agent' && agent) screen = /*#__PURE__*/React.createElement(SC.AgentDrillIn, {
      agent: agent,
      ctx: ctx
    });else if (route === 'review') screen = /*#__PURE__*/React.createElement(SC.ReviewQueue, {
      ctx: ctx
    });else if (route === 'review-item' && item) screen = /*#__PURE__*/React.createElement(SC.ReviewItem, {
      item: item,
      ctx: ctx
    });else if (route === 'halt') screen = /*#__PURE__*/React.createElement(SC.HaltControl, {
      ctx: ctx
    });else if (route === 'budgets') screen = /*#__PURE__*/React.createElement(SC.Budgets, {
      ctx: ctx
    });else if (route === 'edge') screen = /*#__PURE__*/React.createElement(SC.Edge, {
      ctx: ctx
    });else if (route === 'anchors') screen = /*#__PURE__*/React.createElement(SC.Anchors, {
      ctx: ctx
    });else if (route === 'settings') screen = /*#__PURE__*/React.createElement(SC.Settings, {
      ctx: ctx
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "mission-control",
      posture: posture === 'kill' ? 'kill' : 'nominal',
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#",
      onPostureClick: e => {
        e.preventDefault();
        ctx.goto('halt');
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Mission Control",
      identity: "operator cockpit",
      systemState: /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(KillLevelPill, {
        level: posture === 'kill' ? level : 'G0',
        size: "sm"
      }), /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: `epoch ${D.EPOCH} · 0.3s`
      }))
    }, /*#__PURE__*/React.createElement(StopActuator, {
      level: "G1",
      engaged: posture === 'kill',
      onEngage: () => ctx.onEngage('G1'),
      label: "Engage freeze"
    })), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, screen)), haltFail ? /*#__PURE__*/React.createElement(HaltNotConfirmed, {
      onDismiss: () => setHaltFail(false)
    }) : null);
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mission-control/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mission-control/mc-data.jsx
try { (() => {
/* Helm — Mission Control · data model
   Sample fleet, queues, dependencies, anchors, budgets, edge, settings, and the
   kill-switch mirror. Every figure that would be mirrored/streamed in the real
   app carries a `source`/`as-of` so screens can honor the false-green rule.
   Exposed as window.MC_DATA. */
(function () {
  const EPOCH = 4471;
  const DEPENDENCIES = [{
    key: 'auth',
    label: 'auth',
    ok: true,
    age: '0.3s'
  }, {
    key: 'board',
    label: 'board',
    ok: true,
    age: '2s'
  }, {
    key: 'gateway',
    label: 'gateway',
    ok: true,
    age: '1.1s'
  }, {
    key: 'runtime',
    label: 'runtime',
    ok: true,
    age: '0.8s'
  }, {
    key: 'redis',
    label: 'redis',
    ok: true,
    age: '0.6s'
  }];

  // Fleet roster. liveness: live | suspect | draining | drained | quiesced
  const AGENTS = [{
    sub: 'agent:patcher-07',
    model: 'patcher@qwen3-32b',
    session: 's-9f3a',
    liveness: 'suspect',
    phi: 7.2,
    hb: '9.4s',
    step: 41,
    ticket: 'T-000123',
    fence: {
      gen: 46,
      lease: '00:03',
      hb: '9.4s',
      state: 'superseded',
      supBy: 47
    },
    budget: {
      rate: 12,
      rateTrip: true,
      conc: [3, 4],
      cooldown: '42s',
      cooldownTrip: true,
      lifetime: 61
    },
    flags: [{
      type: 'SUPERSEDED',
      detail: 'gen46 SUPERSEDED by gen47'
    }],
    depth: 2,
    cap: 4,
    trips: '2 (rate)'
  }, {
    sub: 'agent:indexer-02',
    model: 'indexer@qwen3-14b',
    session: 's-2b71',
    liveness: 'live',
    phi: 1.1,
    hb: '0.6s',
    step: 12,
    ticket: 'T-000217',
    fence: {
      gen: 47,
      lease: '04:12',
      hb: '0.6s',
      state: 'held'
    },
    budget: {
      rate: 34,
      conc: [3, 4],
      cooldown: 'idle',
      lifetime: 22
    },
    flags: [{
      type: 'NO-PROGRESS',
      detail: 'longest-since-progress 14m',
      presizing: true
    }],
    depth: 1,
    cap: 4,
    trips: '0'
  }, {
    sub: 'agent:sre-01',
    model: 'sre@qwen3-32b',
    session: 's-1c40',
    liveness: 'live',
    phi: 2.0,
    hb: '0.9s',
    step: 7,
    ticket: 'T-000210',
    fence: {
      gen: 51,
      lease: '01:44',
      hb: '0.9s',
      state: 'held'
    },
    budget: {
      rate: 70,
      conc: [2, 4],
      cooldown: '18s',
      cooldownTrip: true,
      lifetime: 40
    },
    flags: [{
      type: 'FAIL×3',
      detail: 'consecutive-failure 3 · cooldown'
    }],
    depth: 0,
    cap: 4,
    trips: '1 (cooldown)'
  }, {
    sub: 'agent:librarian-3',
    model: 'librarian@qwen3-14b',
    session: 's-77aa',
    liveness: 'draining',
    phi: 0.4,
    hb: '1.2s',
    step: null,
    ticket: null,
    fence: {
      gen: 19,
      lease: '—',
      hb: '1.2s',
      state: 'held'
    },
    budget: {
      rate: 4,
      conc: [0, 4],
      cooldown: 'idle',
      lifetime: 61
    },
    flags: [],
    depth: 0,
    cap: 4,
    trips: '0'
  }, {
    sub: 'agent:recon-05',
    model: 'recon@qwen3-14b',
    session: 's-04d2',
    liveness: 'drained',
    phi: null,
    hb: '—',
    step: null,
    ticket: null,
    fence: null,
    budget: {
      rate: 0,
      conc: [0, 4],
      cooldown: 'idle',
      lifetime: 12
    },
    flags: [],
    depth: 0,
    cap: 4,
    trips: '0'
  }, {
    sub: 'agent:summarizer-9',
    model: 'summarizer@qwen3-14b',
    session: 's-51e8',
    liveness: 'live',
    phi: 0.8,
    hb: '0.5s',
    step: 3,
    ticket: 'T-000210',
    fence: {
      gen: 8,
      lease: '05:00',
      hb: '0.5s',
      state: 'held'
    },
    budget: {
      rate: 20,
      conc: [1, 4],
      cooldown: 'idle',
      lifetime: 18
    },
    flags: [],
    depth: 1,
    cap: 4,
    trips: '0'
  }, {
    sub: 'agent:deployer-2',
    model: 'deployer@qwen3-32b',
    session: 's-9a12',
    liveness: 'live',
    phi: 1.5,
    hb: '0.7s',
    step: 2,
    ticket: 'T-000221',
    fence: {
      gen: 52,
      lease: '01:03',
      hb: '0.7s',
      state: 'held'
    },
    budget: {
      rate: 55,
      conc: [2, 4],
      cooldown: 'idle',
      lifetime: 44
    },
    flags: [],
    depth: 4,
    cap: 4,
    trips: '0'
  }, {
    sub: 'agent:archivist-5',
    model: 'archivist@qwen3-14b',
    session: 's-6f5c',
    liveness: 'live',
    phi: 0.6,
    hb: '0.9s',
    step: 5,
    ticket: 'T-000255',
    fence: {
      gen: 19,
      lease: '04:44',
      hb: '0.9s',
      state: 'held'
    },
    budget: {
      rate: 9,
      conc: [1, 4],
      cooldown: 'idle',
      lifetime: 8
    },
    flags: [],
    depth: 1,
    cap: 4,
    trips: '0'
  }];
  const QUEUE = [{
    id: 'T-000123',
    gate: 'awaiting_approval',
    prov: 'untrusted',
    provNote: 'host-orig (Wazuh alert fields)',
    proposer: 'agent:patcher-07',
    tier: 'tier2',
    age: '4m',
    stale: true,
    reason: 'patch 3 hosts',
    entry: 1,
    ceremony: 'planning→adversarial ✓',
    plan: {
      line: 'Patch CVE-2026-1234 on web-01/02/03 · canary web-03 first · rollback: snapshot',
      radius: '3 hosts, tier-2, in-window 02:00–04:00',
      verify: 'Wazuh active→solved'
    }
  }, {
    id: 'T-000210',
    gate: 'awaiting_approval',
    prov: 'single',
    provNote: 'single-source',
    proposer: 'agent:sre-01',
    tier: 'tier3',
    age: '1m',
    reason: 'restart svc',
    entry: 1,
    ceremony: 'planning ✓',
    plan: {
      line: 'Restart web-api on host-07 (graceful drain 30s)',
      radius: '1 service, tier-3',
      verify: 'health 200 ×3'
    }
  }, {
    id: 'T-000217',
    gate: 'needs_review',
    prov: 'verified',
    provNote: 'gateway-delivered',
    proposer: 'agent:indexer-02',
    tier: 'tier2',
    age: '9m',
    stale: true,
    reason: 'index report',
    entry: 1,
    ceremony: 'planning→verify ✓',
    plan: {
      line: 'Reindex shard 12 complete — 4.1M docs, 0 errors',
      radius: 'read-only artifact',
      verify: 'checksum match'
    }
  }, {
    id: 'T-000188',
    gate: 'escalated',
    prov: 'agent-authored',
    provNote: 'agent-authored',
    proposer: 'agent:recon-05',
    tier: 'tier1',
    age: '22m',
    stale: true,
    reason: 'board_escalation',
    entry: 1,
    ceremony: 'planning ✓',
    plan: {
      line: 'Recon plan escalated by the Board for a human gate',
      radius: 'plan only',
      verify: '—'
    }
  }, {
    id: 'T-000221',
    gate: 'awaiting_approval',
    prov: 'verified',
    provNote: 'gateway-delivered',
    proposer: 'agent:deployer-2',
    tier: 'tier2',
    age: '30s',
    reason: 'rollout gate',
    entry: 1,
    ceremony: 'planning→adversarial ✓',
    plan: {
      line: 'Promote canary to 100% of prod fleet (8 hosts)',
      radius: '8 hosts, tier-2',
      verify: 'error-rate < 0.1% for 5m'
    }
  }];
  const ANCHORS = [{
    at: '09:44:02',
    chain: 'gw-main',
    seq: 4471,
    hash: '3af9…c1',
    status: 'retained'
  }, {
    at: '09:38:40',
    chain: 'gw-main',
    seq: 4470,
    hash: 'b1c7…9f',
    status: 'retained'
  }, {
    at: '09:35:20',
    chain: 'gw-main',
    seq: 4469,
    hash: '77de…20',
    status: 'retained'
  }, {
    at: '09:31:11',
    chain: 'gw-main',
    seq: 4468,
    hash: '—',
    status: 'gap'
  }];
  const EDGE = [{
    app: 'auth',
    rps: '142/s',
    ok: '99.7%',
    p95: '38ms',
    authz: 'allow 96% · deny 3% · fail-closed 0',
    cert: '61d',
    scrub: '0.0%'
  }, {
    app: 'board',
    rps: '88/s',
    ok: '99.9%',
    p95: '52ms',
    authz: 'allow 98% · deny 2%',
    cert: '61d',
    scrub: '0.1%'
  }, {
    app: 'gateway',
    rps: '210/s',
    ok: '99.4%',
    p95: '71ms',
    authz: 'allow 91% · deny 6% · fail-closed 1',
    cert: '20d',
    scrub: '0.4%'
  }, {
    app: 'notes',
    rps: '31/s',
    ok: '100%',
    p95: '29ms',
    authz: 'allow 99% · redirect 1%',
    cert: '61d',
    scrub: '0.0%'
  }];
  const KILL = {
    level: 'G0',
    epoch: EPOCH,
    ageAuth: '0.3s',
    l1: {
      label: 'L1 (identity, auth)',
      status: 'enforced',
      age: '0.3s'
    },
    l2: {
      label: 'L2 (physical, gateway)',
      status: 'confirmed',
      age: '1.1s',
      prov: 'AUTH-DIRECT'
    }
  };
  const SETTINGS = {
    suppress_fraction: '40%',
    suppress_window: '60s',
    phi_threshold: '8',
    noisy_net_phi: '12',
    progress_budget_patcher: 'UNSET',
    silences: [{
      sub: 'agent:noisy-1',
      ttl: '2h'
    }],
    filters: ['tier-1 destructive', 'needs_review mine']
  };
  window.MC_DATA = {
    EPOCH,
    DEPENDENCIES,
    AGENTS,
    QUEUE,
    ANCHORS,
    EDGE,
    KILL,
    SETTINGS,
    counts: {
      online: AGENTS.filter(a => a.liveness === 'live' || a.liveness === 'suspect').length,
      wedged: 1,
      zombie: AGENTS.filter(a => a.fence && a.fence.state === 'superseded').length,
      awaiting: QUEUE.filter(q => q.gate === 'awaiting_approval').length,
      needsReview: QUEUE.filter(q => q.gate === 'needs_review').length,
      escalated: QUEUE.filter(q => q.gate === 'escalated').length
    }
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mission-control/mc-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mission-control/mc-parts.jsx
try { (() => {
/* Helm — Mission Control · app-specific components
   Each COMPOSES shared design-system chips and never redraws a shared entity.
   Exposed as window.MCParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    StatusPill,
    FreshnessStamp,
    PrincipalRef,
    TicketRef,
    FenceState,
    Button,
    HonestState
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panelStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };

  /* ⟳ age · source: X  — honest freshness stamp. When stale, degrades to gold. */
  function SourceStamp({
    source,
    age,
    stale,
    staleLabel
  }) {
    if (stale) {
      return /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6
        }
      }, /*#__PURE__*/React.createElement(FreshnessStamp, {
        state: "halt",
        reading: staleLabel || 'STALE-UNKNOWN',
        age: age
      }), /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--halt-gold-ink)',
          opacity: 0.6
        }
      }, "source: ", source));
    }
    return /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: 'var(--state-green)',
        boxShadow: '0 0 0 2px rgba(70,185,138,0.18)'
      }
    }), " ", age), /*#__PURE__*/React.createElement("span", {
      style: {
        opacity: 0.8
      }
    }, "\xB7 source: ", source));
  }

  /* Kill-level pill: ● G0 NORMAL (neutral, NO gold) / ▮▮ G1 / ▮▮▮▮ G2 (gold). */
  function KillLevelPill({
    level = 'G0',
    size
  }) {
    if (level === 'G1') return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "halt",
      glyph: "\u25AE\u25AE",
      size: size
    }, "G1 Freeze-destructive");
    if (level === 'G2') return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "halt",
      glyph: "\u25AE\u25AE\u25AE\u25AE",
      size: size
    }, "G2 Quiesce-all");
    return /*#__PURE__*/React.createElement(StatusPill, {
      tone: "neutral",
      glyph: "\u25CF",
      size: size
    }, "G0 Normal");
  }

  /* Panel with a title + optional source stamp + optional deep-link footer. */
  function Panel({
    title,
    stamp,
    children,
    deepLabel,
    onDeep,
    pad = 16,
    style
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panelStyle,
        display: 'flex',
        flexDirection: 'column',
        ...style
      }
    }, title || stamp ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        padding: '11px 16px',
        borderBottom: '1px solid var(--border-default)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, title), stamp) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: pad,
        flex: 1
      }
    }, children), deepLabel ? /*#__PURE__*/React.createElement("div", {
      style: {
        borderTop: '1px solid var(--border-default)',
        padding: '8px 12px',
        display: 'flex',
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "compact",
      onClick: onDeep
    }, deepLabel, " \u2192")) : null);
  }

  /* Liveness — NEVER a bare green dot: phi + ♥ age (Freshness) + a StatePill. */
  const LIVE_MAP = {
    live: {
      tone: 'verified',
      glyph: '●',
      label: 'LIVE'
    },
    suspect: {
      tone: 'attention',
      glyph: '▲',
      label: 'SUSPECT'
    },
    draining: {
      tone: 'draining',
      glyph: '⇉',
      label: 'DRAINING'
    },
    drained: {
      tone: 'neutral',
      glyph: '◼',
      label: 'DRAINED'
    },
    quiesced: {
      tone: 'halt',
      glyph: '⛊',
      label: 'QUIESCED-BY-OUTAGE'
    }
  };
  function Liveness({
    agent,
    stale
  }) {
    const m = LIVE_MAP[agent.liveness] || LIVE_MAP.live;
    if (stale) return /*#__PURE__*/React.createElement(FreshnessStamp, {
      state: "halt",
      reading: "STALE-UNKNOWN"
    });
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: m.tone,
      glyph: m.glyph,
      size: "sm"
    }, m.label), agent.phi != null ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: agent.liveness === 'suspect' ? 'var(--state-amber-ink)' : 'var(--text-muted)'
      }
    }, "\u03C6", agent.phi) : null, agent.hb && agent.hb !== '—' ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: agent.liveness === 'suspect' ? 'var(--state-amber-ink)' : 'var(--text-muted)'
      }
    }, "\u2665", agent.hb) : agent.liveness === 'drained' ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "(reported)") : null);
  }

  /* AttentionBand — server-flagged agents pinned above the roster, worst-first. */
  function AttentionBand({
    agents,
    onOpen
  }) {
    const flagged = agents.filter(a => a.flags && a.flags.length);
    if (!flagged.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--state-amber-wash)',
        border: '1px solid #5A4A1E',
        borderRadius: 'var(--radius-panel)',
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        padding: '8px 14px',
        borderBottom: '1px solid #5A4A1E',
        ...eyebrow,
        color: 'var(--state-amber-ink)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u2691"), " Attention \xB7 server-flagged \xB7 pinned"), /*#__PURE__*/React.createElement("div", {
      style: {
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 2
      }
    }, flagged.map(a => {
      const f = a.flags[0];
      return /*#__PURE__*/React.createElement("div", {
        key: a.sub,
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '7px 8px',
          flexWrap: 'wrap'
        }
      }, /*#__PURE__*/React.createElement(StatusPill, {
        tone: "attention",
        glyph: "\u26A0",
        size: "sm"
      }, f.type), /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "agent",
        id: a.sub,
        href: "#",
        onClick: onOpen ? e => {
          e.preventDefault();
          onOpen(a);
        } : undefined
      }), a.step != null ? /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, "step ", a.step) : null, a.ticket ? /*#__PURE__*/React.createElement(TicketRef, {
        id: a.ticket,
        href: "#"
      }) : null, a.fence && a.fence.state === 'superseded' ? /*#__PURE__*/React.createElement(FenceState, {
        gen: a.fence.gen,
        supersededBy: a.fence.supBy,
        state: "superseded"
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--state-amber-ink)'
        }
      }, f.detail), f.presizing ? /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 10,
          color: 'var(--state-amber-ink)',
          opacity: 0.75,
          border: '1px solid #5A4A1E',
          borderRadius: 999,
          padding: '0 6px'
        }
      }, "PRE-SIZING \xB7 not wedged-classified") : null);
    })));
  }

  /* FleetAnomalyBanner — correlated-loss gold banner; hides the flood, not the fact. */
  function FleetAnomalyBanner({
    suppressed = 0
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--halt-gold-wash)',
        border: '1px solid var(--halt-gold)',
        borderRadius: 'var(--radius-panel)',
        padding: '14px 18px',
        boxShadow: 'var(--shadow-halt)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 20,
        color: 'var(--halt-gold)'
      },
      "aria-hidden": "true"
    }, "\u26CA"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--halt-gold-ink)'
      }
    }, "FLEET LIVENESS ANOMALY \u2014 correlated loss in progress")), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        lineHeight: '19px',
        color: 'var(--halt-gold-ink)',
        opacity: 0.9,
        margin: '6px 0 0 30px'
      }
    }, "Per-agent death display is suppressed for ", /*#__PURE__*/React.createElement("b", null, suppressed), " agents to hide the flood \u2014 ", /*#__PURE__*/React.createElement("b", null, "not"), " the fact. Confirm against three independent cross-checks before concluding a mass death:"), /*#__PURE__*/React.createElement("ul", {
      style: {
        margin: '6px 0 0 30px',
        padding: 0,
        listStyle: 'none',
        display: 'flex',
        gap: 18,
        flexWrap: 'wrap',
        ...mono,
        fontSize: 11,
        color: 'var(--halt-gold-ink)',
        opacity: 0.85
      }
    }, /*#__PURE__*/React.createElement("li", null, "\xB7 dead-man frame"), /*#__PURE__*/React.createElement("li", null, "\xB7 auth health"), /*#__PURE__*/React.createElement("li", null, "\xB7 edge health")));
  }

  /* SpawnTree — Board ticket lineage (never heartbeats). */
  function SpawnTree({
    nodes,
    depth,
    cap
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        lineHeight: '22px',
        color: 'var(--text-secondary)'
      }
    }, nodes.map((n, i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        paddingLeft: n.indent * 16,
        color: n.here ? 'var(--text-primary)' : 'var(--text-secondary)'
      }
    }, n.indent > 0 ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "\u2514 ") : null, /*#__PURE__*/React.createElement(TicketRef, {
      id: n.id,
      href: "#"
    }), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, n.label), n.here ? /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--signal-cyan)'
      }
    }, " \u2190 here") : null)), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 6,
        color: 'var(--text-muted)'
      }
    }, "depth ", depth, " / cap ", cap));
  }

  /* BudgetMeter — one of the four dimensions (rate/concurrency/cooldown/lifetime). NEVER dollars. */
  function BudgetMeter({
    label,
    pct,
    value,
    trip,
    width = 96
  }) {
    const col = trip ? 'var(--state-amber)' : 'var(--signal-cyan)';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: width
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow,
        fontSize: 10
      }
    }, label), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        height: 6,
        background: 'var(--surface-inset)',
        borderRadius: 3,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: Math.max(0, Math.min(100, pct)) + '%',
        height: '100%',
        background: col
      }
    })), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: trip ? 'var(--state-amber-ink)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap'
      }
    }, value, trip ? ' ▲' : '')));
  }

  /* EdgeTile — one PromQL-result tile with a source/as-of stamp. */
  function EdgeTile({
    tile,
    stale
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panelStyle,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
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
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, tile.app), /*#__PURE__*/React.createElement(SourceStamp, {
      source: "mc_prometheus",
      age: "4s",
      stale: stale,
      staleLabel: "CANNOT CONFIRM"
    })), stale ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--halt-gold-ink)'
      }
    }, "Cannot confirm edge health \u2014 sidecar unreachable.") : /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '4px 12px',
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "2xx ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--text-primary)'
      }
    }, tile.ok)), /*#__PURE__*/React.createElement("span", null, "rps ", tile.rps), /*#__PURE__*/React.createElement("span", null, "p95 ", tile.p95), /*#__PURE__*/React.createElement("span", null, "cert ", tile.cert), /*#__PURE__*/React.createElement("span", {
      style: {
        gridColumn: '1 / -1'
      }
    }, "authz ", tile.authz), /*#__PURE__*/React.createElement("span", {
      style: {
        gridColumn: '1 / -1'
      }
    }, "scrub_stripped ", tile.scrub)));
  }

  /* HaltNotConfirmed — full-viewport fail-loud takeover (gold, NOT red). */
  function HaltNotConfirmed({
    onDismiss
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'fixed',
        inset: 0,
        zIndex: 1200,
        background: 'var(--halt-gold-wash)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        maxWidth: 620,
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 48,
        color: 'var(--halt-gold)'
      },
      "aria-hidden": "true"
    }, "\u26CA"), /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 34,
        lineHeight: '40px',
        fontWeight: 700,
        letterSpacing: '0.01em',
        color: 'var(--halt-gold-ink)'
      }
    }, "HALT NOT CONFIRMED"), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        lineHeight: '24px',
        color: 'var(--halt-gold-ink)',
        margin: 0,
        opacity: 0.92
      }
    }, "The kill-switch call to auth did not return a confirmation. The canonical outage-surviving control is ", /*#__PURE__*/React.createElement("b", null, "auth's console"), "; Mission Control's button is trustworthy only while auth is healthy."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("a", {
      href: "#",
      onClick: e => {
        e.preventDefault();
        onDismiss && onDismiss();
      },
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        height: 40,
        padding: '0 20px',
        borderRadius: 'var(--radius-control)',
        background: 'var(--halt-gold)',
        color: '#2E1D0B',
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        textDecoration: 'none'
      }
    }, "Open auth's safe-stopped console \u2192"), /*#__PURE__*/React.createElement("button", {
      onClick: onDismiss,
      style: {
        height: 40,
        padding: '0 16px',
        borderRadius: 'var(--radius-control)',
        background: 'transparent',
        border: '1px solid var(--halt-gold-edge)',
        color: 'var(--halt-gold-ink)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        cursor: 'pointer'
      }
    }, "Dismiss (demo)"))));
  }
  window.MCParts = {
    SourceStamp,
    KillLevelPill,
    Panel,
    Liveness,
    AttentionBand,
    FleetAnomalyBanner,
    SpawnTree,
    BudgetMeter,
    EdgeTile,
    HaltNotConfirmed,
    eyebrow,
    mono,
    panelStyle
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mission-control/mc-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/mission-control/mc-screens.jsx
try { (() => {
/* Helm — Mission Control · screens (all 10). Exposed as window.MCScreens.
   Every screen: Instrument archetype, dark-only, compact. Mirrors carry
   source/as-of; the false-green rule is honored throughout. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.MC_DATA;
  const P = window.MCParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    TierBadge,
    StatusPill,
    ReviewChip,
    FenceState,
    FreshnessStamp,
    Button,
    DangerAction,
    ConfirmFriction,
    StopActuator,
    HaltBand,
    HonestState,
    PrintedAbsence,
    EmptyState,
    ErrorState,
    Input
  } = H;
  const {
    SourceStamp,
    KillLevelPill,
    Panel,
    Liveness,
    AttentionBand,
    FleetAnomalyBanner,
    SpawnTree,
    BudgetMeter,
    EdgeTile,
    eyebrow,
    mono,
    panelStyle
  } = P;
  const provBadge = q => {
    if (q.prov === 'untrusted') return /*#__PURE__*/React.createElement(TierBadge, {
      tier: "untrusted",
      label: `Untrusted · ${q.provNote}`
    });
    if (q.prov === 'verified') return /*#__PURE__*/React.createElement(TierBadge, {
      tier: "verified",
      label: q.provNote
    });
    if (q.prov === 'single') return /*#__PURE__*/React.createElement(TierBadge, {
      tier: "single"
    });
    return /*#__PURE__*/React.createElement(TierBadge, {
      tier: "single",
      label: q.provNote
    });
  };
  const gatePill = g => g === 'awaiting_approval' ? /*#__PURE__*/React.createElement(StatusPill, {
    tone: "attention",
    glyph: "\u25D0",
    size: "sm"
  }, "awaiting_approval") : g === 'needs_review' ? /*#__PURE__*/React.createElement(StatusPill, {
    tone: "attention",
    glyph: "\u25C8",
    size: "sm"
  }, "needs_review") : /*#__PURE__*/React.createElement(StatusPill, {
    tone: "attention",
    glyph: "\u2691",
    size: "sm"
  }, "escalated");
  function Head({
    crumb,
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, crumb ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, crumb) : null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        lineHeight: '26px',
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '2px 0 0'
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '80ch'
      }
    }, sub) : null), right);
  }

  /* Light-variant confirm (toward-LESS action): cyan single confirm, no typing. */
  function ConfirmButton({
    label,
    tone = 'secondary',
    size,
    ...cf
  }) {
    const [open, setOpen] = React.useState(false);
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement(Button, {
      tone: tone,
      size: size,
      onClick: () => setOpen(true)
    }, label), /*#__PURE__*/React.createElement(ConfirmFriction, {
      open: open,
      intensity: cf.intensity || 'light',
      title: cf.title || label,
      confirmLabel: cf.confirmLabel || label,
      consequence: cf.consequence,
      direction: cf.direction || 'less',
      auditNote: cf.auditNote,
      honest: cf.honest,
      onCancel: () => setOpen(false),
      onConfirm: () => {
        setOpen(false);
        cf.onConfirm && cf.onConfirm();
      }
    }));
  }

  /* ===== 1 · Cockpit Overview ===== */
  function Overview({
    ctx
  }) {
    const c = D.counts;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        maxWidth: 1240
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Mission Control \xB7 operator cockpit",
      sub: "What is the fleet doing, and can you stop it? Every tile is a mirror with a source stamp \u2014 nothing here is authoritative."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      title: "Posture",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "auth",
        age: "0.3s"
      }),
      deepLabel: "Halt",
      onDeep: () => ctx.goto('halt'),
      pad: 14
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(KillLevelPill, {
      level: ctx.posture === 'kill' ? 'G1' : 'G0'
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "L1 auth \u2714 0.3s"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "L2 gateway \u2714 auth-dir"))), /*#__PURE__*/React.createElement(Panel, {
      title: "Fleet",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "runtime",
        age: "0.8s"
      }),
      deepLabel: "Agents",
      onDeep: () => ctx.goto('agents'),
      pad: 14
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 22,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, c.online, " online ", /*#__PURE__*/React.createElement("span", {
      style: {
        fontSize: 12,
        color: 'var(--state-amber-ink)',
        fontWeight: 500
      }
    }, "\xB7 1 wedged*")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--state-amber-ink)'
      }
    }, c.zombie, " zombie \u26A0 \xB7 0 crash"))), /*#__PURE__*/React.createElement(Panel, {
      title: "Queue",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "board",
        age: "2s"
      }),
      deepLabel: "Review",
      onDeep: () => ctx.goto('review'),
      pad: 14
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--text-primary)',
        fontSize: 18
      }
    }, c.awaiting), " awaiting_approval"), /*#__PURE__*/React.createElement("div", null, c.needsReview, " needs_review \xB7 ", c.escalated, " escalated \u2691"))), /*#__PURE__*/React.createElement(Panel, {
      title: "Guardrails",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "auth+board",
        age: "2s"
      }),
      deepLabel: "Budgets",
      onDeep: () => ctx.goto('budgets'),
      pad: 14
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("div", null, "WIP ", /*#__PURE__*/React.createElement("b", {
      style: {
        color: 'var(--text-primary)'
      }
    }, "22/30"), " global"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, "3 budgets near cap \u25B2"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, "2 spawn-depth flags")))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      title: "Dependencies",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "mc",
        age: "0.5s"
      }),
      pad: 14
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 14,
        flexWrap: 'wrap'
      }
    }, D.DEPENDENCIES.map(d => /*#__PURE__*/React.createElement("span", {
      key: d.key,
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, d.label, " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714"), d.age)))), /*#__PURE__*/React.createElement(Panel, {
      title: "Anchor continuity",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "gateway push",
        age: "41s"
      }),
      deepLabel: "Anchors",
      onDeep: () => ctx.goto('anchors'),
      pad: 14
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "chain gw-main \xB7 seq 4471 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714 continuous"), " \xB7 0.9s ago"))));
  }

  /* ===== 2 · Live Agent View ===== */
  function LiveAgentView({
    ctx
  }) {
    const [anomaly, setAnomaly] = React.useState(false);
    const columns = [{
      key: 'sub',
      header: 'Agent',
      render: a => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "agent",
        id: a.sub,
        href: "#",
        onClick: e => {
          e.preventDefault();
          ctx.openAgent(a);
        }
      })
    }, {
      key: 'liveness',
      header: 'Liveness',
      render: a => /*#__PURE__*/React.createElement(Liveness, {
        agent: a,
        stale: anomaly
      })
    }, {
      key: 'step',
      header: 'Step · ticket',
      render: a => a.ticket ? /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'inline-flex',
          gap: 6,
          alignItems: 'center'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, a.step), /*#__PURE__*/React.createElement(TicketRef, {
        id: a.ticket,
        href: "#"
      })) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }, {
      key: 'fence',
      header: 'Fencing',
      render: a => a.fence ? /*#__PURE__*/React.createElement(FenceState, {
        gen: a.fence.gen,
        lease: a.fence.state !== 'superseded' ? a.fence.lease : undefined,
        heartbeat: a.fence.hb,
        state: a.fence.state,
        supersededBy: a.fence.supBy
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }, {
      key: 'budget',
      header: 'Budget',
      align: 'right',
      render: a => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: a.budget.rateTrip ? 'var(--state-amber-ink)' : 'var(--text-secondary)'
        }
      }, "rate ", a.budget.rate, "%", a.budget.rateTrip ? '▲' : '')
    }, {
      key: 'model',
      header: 'Model',
      render: a => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, a.model.split('@')[1])
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1240
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/agents",
      title: "Fleet liveness",
      sub: "Liveness is never a bare green dot \u2014 it's the phi-accrual suspicion figure + last-beat age + a state pill. Agent Runtime surfaces through this view.",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }
      }, /*#__PURE__*/React.createElement(SourceStamp, {
        source: "runtime",
        age: "0.8s",
        stale: anomaly,
        staleLabel: "STREAM DOWN"
      }), /*#__PURE__*/React.createElement(Button, {
        tone: "ghost",
        size: "compact",
        onClick: () => setAnomaly(v => !v)
      }, anomaly ? '↺ Restore stream (demo)' : '⚠ Simulate correlated loss (demo)'))
    }), anomaly ? /*#__PURE__*/React.createElement(FleetAnomalyBanner, {
      suppressed: 14
    }) : /*#__PURE__*/React.createElement(AttentionBand, {
      agents: D.AGENTS,
      onOpen: ctx.openAgent
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: columns,
      rows: D.AGENTS,
      rowKey: "sub",
      onRowClick: ctx.openAgent
    }));
  }

  /* ===== 3 · Agent drill-in ===== */
  function AgentDrillIn({
    agent,
    ctx
  }) {
    const a = agent;
    const tree = [{
      id: 'T-000100',
      label: 'epic',
      indent: 0
    }, {
      id: a.ticket || 'T-000123',
      label: '⬡ ' + a.sub.split(':')[1],
      indent: 1,
      here: true
    }, {
      id: 'T-000131',
      label: '⬡ patcher-09',
      indent: 2
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 980
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('agents'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        color: 'var(--text-link)'
      }
    }, "\u2190 Back to fleet"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: a.sub
    }), /*#__PURE__*/React.createElement(Liveness, {
      agent: a
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "session ", a.session, " \xB7 ", a.model), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(SourceStamp, {
      source: "runtime",
      age: "0.8s"
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      title: "Current claim",
      pad: 16
    }, a.ticket ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: a.ticket,
      href: "#"
    }), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u25B2",
      size: "sm"
    }, "executing \xB7 tier2")), a.fence ? /*#__PURE__*/React.createElement(FenceState, {
      gen: a.fence.gen,
      lease: a.fence.state !== 'superseded' ? a.fence.lease : undefined,
      heartbeat: a.fence.hb,
      state: a.fence.state,
      supersededBy: a.fence.supBy
    }) : null) : /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-ui)',
        fontSize: 13
      }
    }, "No active claim.")), /*#__PURE__*/React.createElement(Panel, {
      title: "Budget \xB7 4-dim (never dollars)",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "auth",
        age: "1.1s"
      }),
      pad: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(BudgetMeter, {
      label: "rate",
      pct: a.budget.rate,
      value: a.budget.rate + '%',
      trip: a.budget.rateTrip
    }), /*#__PURE__*/React.createElement(BudgetMeter, {
      label: "cooldown",
      pct: a.budget.cooldownTrip ? 90 : 5,
      value: a.budget.cooldown,
      trip: a.budget.cooldownTrip
    }), /*#__PURE__*/React.createElement(BudgetMeter, {
      label: "concurrency",
      pct: a.budget.conc[0] / a.budget.conc[1] * 100,
      value: a.budget.conc[0] + '/' + a.budget.conc[1]
    }), /*#__PURE__*/React.createElement(BudgetMeter, {
      label: "lifetime",
      pct: a.budget.lifetime,
      value: a.budget.lifetime + '% of TTL'
    }))), /*#__PURE__*/React.createElement(Panel, {
      title: "Spawn tree \xB7 Board lineage",
      pad: 16
    }, /*#__PURE__*/React.createElement(SpawnTree, {
      nodes: tree,
      depth: a.depth,
      cap: a.cap
    })), /*#__PURE__*/React.createElement(Panel, {
      title: "Progress trail \xB7 advisory",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "runtime + mc:report",
        age: "0.8s"
      }),
      pad: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("div", null, "09:41 step41 report_status: \"retrying apt lock\" ", /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      size: "sm"
    }, "host-orig? no")), /*#__PURE__*/React.createElement("div", null, "09:37 step39 ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, "\u2691 request_escalation"), " \"apt held 14m\"")))));
  }

  /* ===== 4 · Review + Approval Queue ===== */
  function ReviewQueue({
    ctx
  }) {
    const [filter, setFilter] = React.useState('all');
    const tabs = [['all', 'all'], ['awaiting_approval', 'awaiting_approval ' + D.counts.awaiting], ['needs_review', 'needs_review ' + D.counts.needsReview], ['escalated', 'escalations ' + D.counts.escalated]];
    const rows = D.QUEUE.filter(q => filter === 'all' || q.gate === filter);
    const columns = [{
      key: 'id',
      header: 'Ticket',
      render: q => /*#__PURE__*/React.createElement(TicketRef, {
        id: q.id,
        href: "#"
      })
    }, {
      key: 'gate',
      header: 'Gate',
      render: q => gatePill(q.gate)
    }, {
      key: 'prov',
      header: 'Provenance',
      render: provBadge
    }, {
      key: 'proposer',
      header: 'Proposer',
      render: q => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "agent",
        id: q.proposer
      })
    }, {
      key: 'tier',
      header: 'Tier',
      render: q => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, q.tier)
    }, {
      key: 'age',
      header: 'Age',
      align: 'right',
      sortable: true,
      sortValue: q => q.age,
      render: q => /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: q.age,
        state: q.stale ? 'stale' : 'live',
        reading: q.stale ? 'aging' : undefined
      })
    }, {
      key: 'reason',
      header: 'Reason',
      render: q => q.gate === 'escalated' ? /*#__PURE__*/React.createElement(ReviewChip, {
        state: "escalated",
        reason: q.reason
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, q.reason)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1240
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/review",
      title: "Review + approval queue",
      sub: "One inbox for both human gates \u2014 pre-execution approvals and post-work reviews. The canonical version; Chat's doorbell, Notes, and Board's filter all resolve here. Item id IS the Board ticket_id.",
      right: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "board",
        age: "2s"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap'
      }
    }, tabs.map(([k, label]) => /*#__PURE__*/React.createElement("button", {
      key: k,
      onClick: () => setFilter(k),
      style: {
        height: 28,
        padding: '0 12px',
        borderRadius: 'var(--radius-control)',
        cursor: 'pointer',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        fontWeight: 500,
        border: '1px solid ' + (filter === k ? '#14424F' : 'var(--border-default)'),
        background: filter === k ? 'var(--signal-cyan-wash)' : 'transparent',
        color: filter === k ? 'var(--signal-cyan-ink)' : 'var(--text-secondary)'
      }
    }, label))), ctx.posture === 'kill' ? /*#__PURE__*/React.createElement(HaltBand, {
      mode: "kill",
      confirmed: 12,
      pending: 2,
      draining: 1,
      pendingCountdown: "1:48",
      drainingDetail: "host-04 \xB7 T-000123",
      reviewHref: "#",
      showTriad: true
    }) : null, /*#__PURE__*/React.createElement(DataTable, {
      columns: columns,
      rows: rows,
      rowKey: "id",
      onRowClick: ctx.openItem
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "bulk: host-originated rows are excluded from auto-approve \u2014 the UI renders the fact; the server enforces the lane."));
  }

  /* ===== 5 · Review item ===== */
  function ReviewItem({
    item,
    ctx
  }) {
    const q = item;
    const [decision, setDecision] = React.useState(null); // null | 'requested' | 'approved' | 'rejected'
    const requestApprove = () => {
      setDecision('requested');
      setTimeout(() => setDecision('approved'), 1600);
    };
    const destructive = q.tier === 'tier1' || q.tier === 'tier2' || q.prov === 'untrusted';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 860
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('review'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        alignSelf: 'flex-start',
        color: 'var(--text-link)'
      }
    }, "\u2190 Back to queue"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: q.id
    }), " ", gatePill(q.gate), " ", /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "\xB7 ", q.tier), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(SourceStamp, {
      source: "board",
      age: "1s"
    })), q.prov === 'untrusted' ? /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--state-amber-wash)',
        border: '1px solid #7A5A1E',
        borderRadius: 6,
        padding: '10px 14px',
        display: 'flex',
        gap: 8,
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--state-amber-ink)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, "\u26A0"), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("b", null, "UNTRUSTED \xB7 host-originated"), " (", q.provNote, ") \u2192 auto-approve lane ", /*#__PURE__*/React.createElement("b", null, "INELIGIBLE"), ". The plan text is adversarial input to the models; a human decides.")) : null, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 20,
        flexWrap: 'wrap',
        alignItems: 'center',
        fontFamily: 'var(--font-ui)',
        fontSize: 13
      }
    }, /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, "Proposer "), /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: q.proposer
    })), /*#__PURE__*/React.createElement("span", null, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, "Ceremony "), q.ceremony), /*#__PURE__*/React.createElement("a", {
      href: "#",
      style: {
        color: 'var(--text-link)'
      }
    }, "transcript note \u2197 Notes")), /*#__PURE__*/React.createElement(Panel, {
      title: "Plan (read-only, from Board)",
      pad: 16
    }, /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        lineHeight: '23px',
        color: 'var(--text-primary)',
        margin: '0 0 10px'
      }
    }, q.plan.line), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 22,
        flexWrap: 'wrap',
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, /*#__PURE__*/React.createElement("span", null, "blast radius: ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-secondary)'
      }
    }, q.plan.radius)), /*#__PURE__*/React.createElement("span", null, "verify: ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-secondary)'
      }
    }, q.plan.verify)))), /*#__PURE__*/React.createElement(PrintedAbsence, {
      why: "MC holds no standing approve credential \u2014 the decision writes browser-direct to Board under your session."
    }, /*#__PURE__*/React.createElement("strong", null, "An agent can never approve its own work.")), decision === 'approved' ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...panelStyle,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714"
    }, "Approved"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-secondary)'
      }
    }, "by ", /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "operator",
      id: "operator:ada"
    }), " \xB7 09:44:02 \xB7 entry #", q.entry)) : decision === 'requested' ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...panelStyle,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u25D0"
    }, "approval requested \u2014 awaiting Board confirm"), /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "just now"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "never a false green until Board confirms")) : decision === 'rejected' ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...panelStyle,
        padding: 16
      }
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "danger",
      glyph: "\u2715"
    }, "Rejected & held")) : /*#__PURE__*/React.createElement("div", {
      style: {
        ...panelStyle,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "Decision"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Reject / hold",
      glyph: "\u26A0",
      variant: "outline",
      title: `Reject ${q.id}`,
      consequence: "Rejects this plan and holds the proposer. It cannot proceed.",
      direction: "less",
      confirmLabel: "Reject",
      onConfirm: () => setDecision('rejected')
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Approve \u2014 writes to Board",
      glyph: "\u26A0",
      variant: "solid",
      title: `Approve ${q.id}`,
      consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "This authorizes Gateway execution against ", /*#__PURE__*/React.createElement("strong", null, q.plan.radius), ". It moves the system toward MORE real-world action."),
      direction: "more",
      irreversible: true,
      blastRadius: q.plan.radius,
      honest: ctx.posture === 'kill' ? {
        confirmed: 12,
        pending: 2,
        draining: 1,
        pendingCountdown: '1:48'
      } : undefined,
      typedIntent: q.id,
      stepUp: true,
      auditNote: "Write is browser-direct to Board; MC records only the request in mc_audit.",
      confirmLabel: "Approve",
      onConfirm: requestApprove
    })));
  }

  /* ===== 6 · Halt Control (THE signature safety screen) ===== */
  function HaltControl({
    ctx
  }) {
    const engaged = ctx.posture === 'kill';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 980
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/halt",
      title: "Global kill switch",
      sub: "MC hosts the actuation, wired to CALL auth under your session. MC mints no epoch and stores no authoritative halted state \u2014 the readout is a read-mirror that degrades honestly.",
      right: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "auth",
        age: "0.3s"
      })
    }), /*#__PURE__*/React.createElement(Panel, {
      title: "Mirror \xB7 read-only, honest",
      pad: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "Level"), /*#__PURE__*/React.createElement(KillLevelPill, {
      level: engaged ? 'G1' : 'G0'
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "epoch ", D.EPOCH, " \xB7 \u27F3 0.3s \xB7 source: auth")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("div", null, "L1 (identity, auth) ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714 enforced"), " \xB7 epoch ", D.EPOCH, " \xB7 0.3s"), /*#__PURE__*/React.createElement("div", null, "L2 (physical, gateway) ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-green)'
      }
    }, "\u2714 CONFIRMED"), " \xB7 1.1s ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, "\u2190 provenance: AUTH-DIRECT")), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--text-muted)',
        paddingLeft: 12
      }
    }, "\u2514 an MC-relayed L2 can read at most STALE-UNKNOWN, never CONFIRMED"))), engaged ? /*#__PURE__*/React.createElement(HaltBand, {
      mode: "kill",
      confirmed: 12,
      pending: 2,
      draining: 1,
      pendingCountdown: "1:48",
      drainingDetail: "host-04 \xB7 T-000123",
      reviewHref: "#"
    }) : null, /*#__PURE__*/React.createElement(Panel, {
      title: "Actuate \xB7 calls auth under your live session \u2014 MC holds no standing kill credential \uD83D\uDD12",
      pad: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 16,
        marginBottom: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "G1 \xB7 Freeze-destructive"), /*#__PURE__*/React.createElement(StopActuator, {
      level: "G1",
      engaged: engaged,
      onEngage: () => ctx.onEngage('G1')
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: eyebrow
    }, "G2 \xB7 Quiesce-all"), /*#__PURE__*/React.createElement(StopActuator, {
      level: "G2",
      engaged: engaged,
      onEngage: () => ctx.onEngage('G2')
    }))), /*#__PURE__*/React.createElement(Input, {
      label: "Reason (required, \u2192 auth)",
      placeholder: "why are you stopping the fleet?",
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        marginTop: 12,
        display: 'flex',
        gap: 10,
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      size: "compact",
      onClick: ctx.onHaltFail
    }, "\u26A0 Simulate auth call failure (demo)"), engaged ? /*#__PURE__*/React.createElement(DangerAction, {
      label: "Lift stop",
      glyph: "\u26D4",
      variant: "solid",
      title: "Lift the suite-wide stop",
      consequence: /*#__PURE__*/React.createElement(React.Fragment, null, "This ", /*#__PURE__*/React.createElement("strong", null, "lifts the kill-switch"), " \u2014 toward MORE action. Agents resume executing approved plans."),
      direction: "more",
      irreversible: true,
      blastRadius: "the whole fleet",
      honest: {
        confirmed: 12,
        pending: 2,
        draining: 1,
        pendingCountdown: '1:48'
      },
      typedIntent: "LIFT STOP",
      stepUp: true,
      auditNote: "Writes a tamper-evident audit row.",
      confirmLabel: "Lift stop",
      onConfirm: ctx.onLift
    }) : null)), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\u26CA",
      why: "auth is the single enforcement point; it mints the epoch and propagates it. MC stores no authoritative halted state.",
      tag: "by construction"
    }, /*#__PURE__*/React.createElement("strong", null, "MC cannot enforce a stop."), " This control REQUESTS a halt from auth."));
  }

  /* ===== 7 · WIP & Budget monitors ===== */
  function Budgets({
    ctx
  }) {
    const columns = [{
      key: 'sub',
      header: 'Agent',
      render: a => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "agent",
        id: a.sub,
        href: "#",
        onClick: e => {
          e.preventDefault();
          ctx.openAgent(a);
        }
      })
    }, {
      key: 'rate',
      header: 'Rate',
      render: a => /*#__PURE__*/React.createElement(BudgetMeter, {
        label: "",
        width: 120,
        pct: a.budget.rate,
        value: a.budget.rate + '%',
        trip: a.budget.rateTrip
      })
    }, {
      key: 'conc',
      header: 'Concurrency',
      render: a => /*#__PURE__*/React.createElement(BudgetMeter, {
        label: "",
        width: 110,
        pct: a.budget.conc[0] / a.budget.conc[1] * 100,
        value: a.budget.conc[0] + '/' + a.budget.conc[1]
      })
    }, {
      key: 'cooldown',
      header: 'Cooldown',
      render: a => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: a.budget.cooldownTrip ? 'var(--state-amber-ink)' : 'var(--text-muted)'
        }
      }, a.budget.cooldown, a.budget.cooldownTrip ? ' ▲' : '')
    }, {
      key: 'lifetime',
      header: 'Lifetime',
      render: a => /*#__PURE__*/React.createElement(BudgetMeter, {
        label: "",
        width: 110,
        pct: a.budget.lifetime,
        value: a.budget.lifetime + '%'
      })
    }, {
      key: 'trips',
      header: 'Recent trips',
      align: 'right',
      render: a => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, a.trips)
    }, {
      key: 'act',
      header: '',
      render: a => /*#__PURE__*/React.createElement(ConfirmButton, {
        label: "Clamp",
        tone: "secondary",
        size: "compact",
        title: `Clamp ${a.sub}`,
        consequence: "Tightens this agent's budget \u2014 toward LESS action.",
        direction: "less",
        confirmLabel: "Clamp"
      })
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1240
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/budgets",
      title: "WIP + budget",
      sub: "auth's four budget dimensions per principal (rate / concurrency / cooldown / lifetime \u2014 never dollars) and Board's WIP caps. MC surfaces and auto-triages; the Board enforces.",
      right: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "auth+board",
        age: "2s"
      })
    }), /*#__PURE__*/React.createElement(Panel, {
      title: "Global WIP \xB7 Redis state MC owns; auth holds policy",
      stamp: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "redis",
        age: "0.6s"
      }),
      pad: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(BudgetMeter, {
      label: "global WIP",
      width: 260,
      pct: 73,
      value: "22/30"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "per-agent cap 4 \xB7 spawn-depth flags 2 \xB7 runaway 0"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(DangerAction, {
      label: "Widen WIP cap",
      glyph: "\u26A0",
      variant: "outline",
      title: "Widen the global WIP cap",
      consequence: "Raising the cap lets MORE work run at once \u2014 toward MORE action.",
      direction: "more",
      typedIntent: "WIDEN CAP",
      stepUp: true,
      auditNote: "Routes to Board; writes an audit row.",
      confirmLabel: "Widen cap"
    }))), /*#__PURE__*/React.createElement(DataTable, {
      columns: columns,
      rows: D.AGENTS,
      rowKey: "sub"
    }));
  }

  /* ===== 8 · Edge & Observability ===== */
  function Edge() {
    const [down, setDown] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1240
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/edge",
      title: "Edge & observability",
      sub: "Per-app proxy health from the mc_prometheus / mc_blackbox sidecars. Read-only. A sidecar down never shows a green 'all healthy' \u2014 it shows the honest unknown.",
      right: /*#__PURE__*/React.createElement(Button, {
        tone: "ghost",
        size: "compact",
        onClick: () => setDown(v => !v)
      }, down ? '↺ Restore sidecar (demo)' : '⚠ Simulate sidecar down (demo)')
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 12
      }
    }, D.EDGE.map((t, i) => /*#__PURE__*/React.createElement(EdgeTile, {
      key: t.app,
      tile: t,
      stale: down && i % 2 === 1
    }))));
  }

  /* ===== 9 · Audit-anchor continuity ===== */
  function Anchors() {
    const statusCell = s => s === 'retained' ? /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "retained") : /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u26A0",
      size: "sm"
    }, "GAP \xB7 RESYNC-PENDING");
    const columns = [{
      key: 'at',
      header: 'Signed at',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.at)
    }, {
      key: 'chain',
      header: 'Chain',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.chain)
    }, {
      key: 'seq',
      header: 'Seq',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, r.seq)
    }, {
      key: 'hash',
      header: 'Head hash',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.hash)
    }, {
      key: 'status',
      header: 'Status',
      render: r => statusCell(r.status)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1080
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/anchors",
      title: "Audit-anchor continuity",
      sub: "MC's independent off-box tamper-evidence witness. It anchors the Gateway's signed chain HEAD hash, never the contents, and never reads this copy back into a decision path.",
      right: /*#__PURE__*/React.createElement(SourceStamp, {
        source: "gateway push",
        age: "41s"
      })
    }), /*#__PURE__*/React.createElement(Panel, {
      pad: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 13,
        color: 'var(--text-secondary)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", null, "chain gw-main \xB7 latest seq ", D.EPOCH), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "CONTINUOUS"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-muted)'
      }
    }, "verify: HEAD hash matches retained series \xB7 \u27F3 0.9s \xB7 (anchors hash, not content)"))), /*#__PURE__*/React.createElement(DataTable, {
      columns: columns,
      rows: D.ANCHORS,
      rowKey: "seq",
      reflow: false
    }));
  }

  /* ===== 10 · Guardrail settings ===== */
  function Settings() {
    const S = D.SETTINGS;
    const presizing = v => /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 13,
        color: 'var(--text-primary)',
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-strong)',
        borderRadius: 4,
        padding: '3px 10px'
      }
    }, v), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u26A0",
      size: "sm"
    }, "PRE-SIZING DEFAULT"));
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 980
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "/settings",
      title: "Guardrail settings",
      sub: "The only durable MC-owned config. Values are operator-set \u2014 there are no compiled-in defaults, and no component enforces on a PRE-SIZING value."
    }), /*#__PURE__*/React.createElement(Panel, {
      title: "Sizing params",
      pad: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow,
        width: 180
      }
    }, "suppress_fraction"), presizing(S.suppress_fraction), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "set post gap-1.2")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow,
        width: 180
      }
    }, "suppress_window"), presizing(S.suppress_window)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow,
        width: 180
      }
    }, "phi_threshold"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 13,
        color: 'var(--text-primary)',
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-strong)',
        borderRadius: 4,
        padding: '3px 10px'
      }
    }, S.phi_threshold), /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow
      }
    }, "noisy_net_phi"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 13,
        color: 'var(--text-primary)',
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-strong)',
        borderRadius: 4,
        padding: '3px 10px'
      }
    }, S.noisy_net_phi)), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow,
        width: 180
      }
    }, "progress_budget[patcher]"), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 13,
        color: 'var(--state-amber-ink)',
        background: 'var(--state-amber-wash)',
        border: '1px solid #5A4A1E',
        borderRadius: 4,
        padding: '3px 10px'
      }
    }, S.progress_budget_patcher), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "attention",
      glyph: "\u26A0",
      size: "sm"
    }, "wedged classification DARK until set")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(ConfirmButton, {
      label: "Save params",
      tone: "primary",
      title: "Save guardrail params",
      intensity: "full",
      consequence: "This changes suppression and phi behavior across the fleet. The confirm is bound to the exact diff you saw.",
      direction: "more",
      auditNote: "Diff-hash-bound; writes a tamper-evident mc_audit row.",
      confirmLabel: "Save params"
    })))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Panel, {
      title: "Silences",
      pad: 16
    }, S.silences.map(s => /*#__PURE__*/React.createElement("div", {
      key: s.sub,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(PrincipalRef, {
      kind: "agent",
      id: s.sub
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, s.ttl), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-link)',
        cursor: 'pointer'
      }
    }, "\u2715")))), /*#__PURE__*/React.createElement(Panel, {
      title: "Saved filters",
      pad: 16
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap'
      }
    }, S.filters.map(f => /*#__PURE__*/React.createElement(StatusPill, {
      key: f,
      tone: "neutral",
      size: "sm"
    }, f))))));
  }
  window.MCScreens = {
    Overview,
    LiveAgentView,
    AgentDrillIn,
    ReviewQueue,
    ReviewItem,
    HaltControl,
    Budgets,
    Edge,
    Anchors,
    Settings
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/mission-control/mc-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/notes/app.jsx
try { (() => {
/* Helm — Notes · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.NT_DATA;
  const {
    NavRail,
    AppHeader,
    KillMirror
  } = H;
  const SC = window.NTScreens;
  function App() {
    const [route, setRoute] = React.useState('corpus');
    const [collapsed, setCollapsed] = React.useState(false);
    const [note, setNote] = React.useState(null);
    const [mode, setMode] = React.useState('paper');
    const openNote = n => {
      setNote(n);
      setRoute(n.type === 'deliberation' ? 'deliberation' : 'editor');
    };
    const ctx = {
      mode,
      setMode,
      goto: r => {
        setRoute(r);
      },
      openNote
    };
    const items = [{
      group: 'Library'
    }, {
      key: 'corpus',
      label: 'Corpus',
      icon: '▤',
      active: route === 'corpus' || route === 'editor' || route === 'deliberation',
      onClick: () => ctx.goto('corpus')
    }, {
      key: 'graph',
      label: 'Graph',
      icon: '◇',
      active: route === 'graph',
      onClick: () => ctx.goto('graph')
    }, {
      key: 'review',
      label: 'Review',
      icon: '◈',
      active: route === 'review',
      onClick: () => ctx.goto('review')
    }, {
      key: 'history',
      label: 'History',
      icon: '⛓',
      active: route === 'history',
      onClick: () => {
        setNote(D.byId['N-01J1QZ']);
        setRoute('history');
      }
    }];
    let screen = null,
      framed = false;
    if (route === 'corpus') screen = /*#__PURE__*/React.createElement(SC.Corpus, {
      ctx: ctx
    });else if (route === 'editor' && note) {
      screen = /*#__PURE__*/React.createElement(SC.Editor, {
        note: note,
        ctx: ctx
      });
      framed = true;
    } else if (route === 'deliberation' && note) {
      screen = /*#__PURE__*/React.createElement(SC.Deliberation, {
        note: note,
        ctx: ctx
      });
      framed = true;
    } else if (route === 'graph') screen = /*#__PURE__*/React.createElement(SC.Graph, {
      ctx: ctx
    });else if (route === 'review') screen = /*#__PURE__*/React.createElement(SC.Review, null);else if (route === 'history' && note) screen = /*#__PURE__*/React.createElement(SC.History, {
      note: note
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "notes",
      posture: "nominal",
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Notes",
      identity: "external memory & work product"
    }, /*#__PURE__*/React.createElement(KillMirror, {
      engaged: false,
      href: "#"
    })), framed ? /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column'
      }
    }, screen) : /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, screen)));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/notes/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/notes/nt-data.jsx
try { (() => {
/* Helm — Notes · data model
   The Confluence-style external memory: a markdown corpus with own/effective
   taint, wikilink graph, deliberation records, git-trailer audit, and a
   read-only mirror of MC review gates. Exposed as window.NT_DATA. */
(function () {
  const NOTES = [{
    id: 'N-01J1QZ',
    title: 'Canary batch findings',
    type: 'research',
    taintOwn: 'single',
    taintEffective: 'untrusted',
    via: [{
      title: 'Wazuh dump',
      taint: 'untrusted'
    }],
    ticket: 'T-000123',
    ticketStatus: 'needs_review',
    updated: '2m',
    authors: [{
      kind: 'agent',
      sub: 'agent:recon-03'
    }, {
      kind: 'operator',
      sub: 'operator:ada'
    }],
    fence: {
      gen: 47,
      lease: '04:12',
      hb: '0.8s',
      state: 'held'
    },
    snippet: '…canary must share the package set…',
    body: [['Objective', 'Establish a safe canary order for the fleet patch so a bad package set fails on one host, not all six.'], ['What I did', 'Pulled posture from Wazuh; clustered hosts by installed package set. See [[canary package overlap]] and [[fleet posture]].'], ['Findings', 'web-03 shares the exact package set with web-01/02, so it is a valid canary. The alert fields came from an untrusted host feed ([[Wazuh dump]]).'], ['Open questions', 'Is the 02:00–04:00 window still correct for db-adjacent hosts?'], ['Next step', 'Hand the ordering to the plan slice for T-000123.']]
  }, {
    id: 'N-01J2AA',
    title: 'Fleet patch plan slice 3',
    type: 'plan',
    taintOwn: 'untrusted',
    taintEffective: 'untrusted',
    via: [],
    ticket: 'T-000450',
    ticketStatus: 'needs_review',
    updated: '14m',
    authors: [{
      kind: 'agent',
      sub: 'agent:sre-01'
    }],
    fence: {
      gen: 52,
      lease: '01:03',
      hb: '0.7s',
      state: 'held'
    },
    snippet: '…rolling patch, canary web-03 first…',
    body: [['Objective', 'Apply CVE-2026-1234 patch to the web fleet, rolling, canary first.'], ['Plan', 'Patch web-03 (canary), verify Wazuh clears, then web-01/02. Rollback: snapshot restore.'], ['Blast radius', '3 hosts, tier-2, in-window 02:00–04:00.']]
  }, {
    id: 'N-01J2BB',
    title: 'NAS reboot huddle',
    type: 'deliberation',
    taintOwn: 'verified',
    taintEffective: 'untrusted',
    via: [{
      title: 'Wazuh dump',
      taint: 'untrusted'
    }],
    ticket: 'T-000450',
    ticketStatus: 'planning',
    updated: '1h',
    authors: [{
      kind: 'agent',
      sub: 'agent:recon-03'
    }, {
      kind: 'agent',
      sub: 'agent:sre-01'
    }, {
      kind: 'agent',
      sub: 'agent:redteam-02'
    }],
    snippet: '…NAS must drain before reboot…',
    thread: {
      participants: ['agent:recon-03', 'agent:sre-01', 'agent:redteam-02'],
      phases: [{
        key: 'triage',
        label: 'triage',
        note: 'Scrum-Master turn',
        open: false,
        turns: []
      }, {
        key: 'recon',
        label: 'recon',
        open: false,
        grounded: [{
          title: 'fleet posture',
          taint: 'single'
        }, {
          title: 'Wazuh dump',
          taint: 'untrusted'
        }],
        turns: []
      }, {
        key: 'planning',
        label: 'planning',
        open: true,
        independent: true,
        turns: [{
          role: 'SRE',
          at: '14:03Z',
          sub: 'agent:sre-01',
          body: 'Drain NAS clients, reboot in the maintenance window, verify mounts on return.'
        }, {
          role: 'Security',
          at: '14:05Z',
          sub: 'agent:sec-04',
          body: 'Confirm no in-flight secret rotation depends on the NAS before reboot.'
        }]
      }, {
        key: 'adversarial_review',
        label: 'adversarial_review',
        open: true,
        required: true,
        turns: [{
          role: 'Adversarial',
          at: '14:09Z',
          sub: 'agent:redteam-02',
          body: 'Premise attack: the drain assumes all clients honor the unmount signal — cite [[fleet posture]]; two hosts run a legacy agent that ignores it.',
          isolated: false
        }]
      }, {
        key: 'backlog',
        label: 'backlog',
        open: false,
        children: ['T-000451', 'T-000452'],
        turns: []
      }, {
        key: 'execute',
        label: 'execute',
        open: false,
        turns: []
      }, {
        key: 'retro',
        label: 'retro',
        open: false,
        turns: []
      }]
    }
  }, {
    id: 'N-01J2CC',
    title: 'canary package overlap',
    type: 'research',
    taintOwn: 'single',
    taintEffective: 'single',
    via: [],
    ticket: null,
    updated: '3h',
    authors: [{
      kind: 'agent',
      sub: 'agent:recon-03'
    }],
    snippet: '…web-01/02/03 share nginx+openssl…',
    body: [['Overlap', 'web-01/02/03 share nginx + openssl at identical versions.']]
  }, {
    id: 'N-01J2DD',
    title: 'Wazuh dump',
    type: 'research',
    taintOwn: 'untrusted',
    taintEffective: 'untrusted',
    via: [],
    ticket: null,
    updated: '4h',
    authors: [{
      kind: 'service',
      sub: 'svc:webhook-in'
    }],
    snippet: '…host-originated alert fields…',
    body: [['Raw', 'Host-originated Wazuh alert fields. Adversarial input — do not let this drive an auto-approval.']]
  }, {
    id: 'N-01J2EE',
    title: 'fleet posture',
    type: 'research',
    taintOwn: 'single',
    taintEffective: 'single',
    via: [],
    ticket: null,
    updated: '5h',
    authors: [{
      kind: 'agent',
      sub: 'agent:recon-03'
    }],
    snippet: '…20 hosts, 3 flagged…',
    body: [['Posture', '20 hosts; two run a legacy agent that ignores unmount signals.']]
  }];
  const byId = {};
  NOTES.forEach(n => {
    byId[n.id] = n;
  });
  const REVIEW = [{
    note: 'Fleet patch plan slice 3',
    id: 'N-01J2AA',
    ticket: 'T-000450',
    state: 'needs_review',
    reason: 'needs_review',
    author: 'agent:sre-01'
  }, {
    note: 'Canary batch findings',
    id: 'N-01J1QZ',
    ticket: 'T-000123',
    state: 'escalated',
    reason: 'board_escalation',
    author: 'agent:recon-03'
  }, {
    note: 'NAS reboot huddle',
    id: 'N-01J2BB',
    ticket: 'T-000451',
    state: 'awaiting_approval',
    reason: 'awaiting_approval',
    author: 'agent:sre-01'
  }];
  const AUDIT = [{
    ts: '2026-07-02T14:03Z',
    who: 'agent:recon-03',
    kind: 'agent',
    action: 'append_note',
    target: '§Findings',
    outcome: 'ok',
    sha: '3af9c1'
  }, {
    ts: '2026-07-02T14:00Z',
    who: 'operator:ada',
    kind: 'operator',
    action: 'update_note',
    target: 'whole note',
    outcome: 'ok',
    sha: 'b1c79f'
  }, {
    ts: '2026-07-02T13:41Z',
    who: 'agent:recon-03',
    kind: 'agent',
    action: 'create_note',
    target: 'genesis',
    outcome: 'ok',
    sha: '77de20'
  }];
  const GRAPH = {
    focus: 'N-01J1QZ',
    nodes: [{
      id: 'N-01J2EE',
      title: 'fleet posture',
      taint: 'single',
      x: 46,
      y: 12
    }, {
      id: 'N-01J1QZ',
      title: 'Canary batch findings',
      taint: 'untrusted',
      x: 40,
      y: 46,
      focus: true
    }, {
      id: 'N-01J2CC',
      title: 'canary overlap',
      taint: 'single',
      x: 14,
      y: 80
    }, {
      id: 'N-01J2DD',
      title: 'Wazuh dump',
      taint: 'untrusted',
      x: 70,
      y: 80
    }],
    edges: [['N-01J2EE', 'N-01J1QZ'], ['N-01J1QZ', 'N-01J2CC'], ['N-01J1QZ', 'N-01J2DD']],
    backlinks: [{
      note: 'NAS reboot huddle',
      id: 'N-01J2BB',
      type: 'deliberation',
      taint: 'untrusted'
    }, {
      note: 'Fleet patch plan slice 3',
      id: 'N-01J2AA',
      type: 'plan',
      taint: 'single'
    }]
  };
  window.NT_DATA = {
    NOTES,
    byId,
    REVIEW,
    AUDIT,
    GRAPH
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/notes/nt-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/notes/nt-parts.jsx
try { (() => {
/* Helm — Notes · app-specific components. Exposed as window.NTParts.
   NoteEditor is the one Workshop paper surface in the suite; every metadata chip
   and the whole shell stay Instrument-dark. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    TierBadge,
    TicketRef,
    PrincipalRef,
    StatusPill,
    DataTable
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panel = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };
  const TMAP = {
    verified: 'verified',
    single: 'single',
    cross: 'corroborated',
    clean: 'verified',
    untrusted: 'untrusted'
  };
  function taintBadge(t, label) {
    return /*#__PURE__*/React.createElement(TierBadge, {
      tier: TMAP[t] || 'single',
      label: label
    });
  }

  // A wikilink chip carrying the linked note's taint (taint travels with content).
  function WikiLink({
    title,
    taint
  }) {
    return /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        verticalAlign: 'baseline'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--signal-cyan-press)',
        borderBottom: '1px solid currentColor',
        fontFamily: 'inherit'
      }
    }, "[[", title, "]]"), taint === 'untrusted' ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--state-amber-ink)'
      }
    }, "\u26A0") : taint === 'single' ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--state-amber-ink)'
      }
    }, "\u25D1") : null);
  }

  // Render a body-section paragraph, turning [[wikilinks]] into WikiLink chips.
  function renderProse(text, via, paper) {
    const parts = text.split(/(\[\[[^\]]+\]\])/g);
    return parts.map((p, i) => {
      const m = p.match(/^\[\[([^\]]+)\]\]$/);
      if (m) {
        const v = (via || []).find(x => x.title === m[1]);
        return /*#__PURE__*/React.createElement(WikiLink, {
          key: i,
          title: m[1],
          taint: v ? v.taint : 'single'
        });
      }
      return /*#__PURE__*/React.createElement(React.Fragment, {
        key: i
      }, p);
    });
  }

  /* NoteEditor — the WYSIWYG-markdown Workshop paper pane. */
  function NoteEditor({
    note,
    mode
  }) {
    const paper = mode === 'paper';
    const surface = paper ? {
      background: 'var(--paper-page)'
    } : {
      background: 'var(--surface-screen)'
    };
    const ink = paper ? 'var(--paper-ink)' : 'var(--ink-primary)';
    const muted = paper ? 'var(--paper-ink-muted)' : 'var(--ink-muted)';
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
        ...surface
      }
    }, /*#__PURE__*/React.createElement("article", {
      style: {
        maxWidth: 720,
        margin: '0 auto',
        padding: '40px 40px 80px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        color: muted,
        marginBottom: 8
      }
    }, note.type), /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 30,
        lineHeight: '38px',
        fontWeight: 600,
        color: ink,
        margin: '0 0 20px'
      }
    }, note.title), note.body.map(([h, p], i) => /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        marginBottom: 20
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 20,
        fontWeight: 600,
        color: ink,
        margin: '0 0 8px'
      }
    }, h), /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 17,
        lineHeight: '28px',
        color: ink,
        margin: 0
      }
    }, renderProse(p, note.via, paper)))), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("h2", {
      style: {
        fontFamily: 'var(--font-serif)',
        fontSize: 20,
        fontWeight: 600,
        color: ink,
        margin: 0,
        opacity: 0.5
      }
    }, "Next"), /*#__PURE__*/React.createElement("span", {
      style: {
        width: 2,
        height: 24,
        background: 'var(--signal-cyan)',
        display: 'inline-block',
        animation: 'none'
      }
    }))));
  }

  /* LinkGraph — wikilink/backlink canvas; taint on nodes; list half is DataTable. */
  function LinkGraph({
    graph,
    onOpen
  }) {
    const glyph = t => t === 'untrusted' ? '⚠' : t === 'single' ? '◑' : '✔';
    const col = t => t === 'untrusted' ? 'var(--state-amber-ink)' : t === 'single' ? 'var(--state-amber-ink)' : 'var(--state-green-ink)';
    const nodeById = {};
    graph.nodes.forEach(n => {
      nodeById[n.id] = n;
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        position: 'relative',
        height: 320,
        ...panel,
        overflow: 'hidden'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      style: {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%'
      }
    }, graph.edges.map(([a, b], i) => {
      const na = nodeById[a],
        nb = nodeById[b];
      return /*#__PURE__*/React.createElement("line", {
        key: i,
        x1: na.x + '%',
        y1: na.y + '%',
        x2: nb.x + '%',
        y2: nb.y + '%',
        stroke: "var(--border-strong)",
        strokeWidth: "1",
        markerEnd: "url(#arr)"
      });
    }), /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("marker", {
      id: "arr",
      markerWidth: "8",
      markerHeight: "8",
      refX: "6",
      refY: "3",
      orient: "auto"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M0,0 L6,3 L0,6",
      fill: "var(--border-strong)"
    })))), graph.nodes.map(n => /*#__PURE__*/React.createElement("button", {
      key: n.id,
      onClick: () => onOpen(n.id),
      style: {
        position: 'absolute',
        left: n.x + '%',
        top: n.y + '%',
        transform: 'translate(-50%,-50%)',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 9px',
        borderRadius: 'var(--radius-control)',
        cursor: 'pointer',
        background: n.focus ? 'var(--signal-cyan-wash)' : 'var(--surface-inset)',
        border: '1px solid ' + (n.focus ? 'var(--signal-cyan)' : 'var(--border-strong)'),
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        whiteSpace: 'nowrap'
      }
    }, n.title, /*#__PURE__*/React.createElement("span", {
      style: {
        color: col(n.taint)
      }
    }, glyph(n.taint)))));
  }

  /* DeliberationThreadView — the seven-phase ceremony record (never the state machine). */
  function DeliberationThreadView({
    thread,
    ticket
  }) {
    const [open, setOpen] = React.useState(() => {
      const s = {};
      thread.phases.forEach(p => {
        s[p.key] = p.open;
      });
      return s;
    });
    return /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        minWidth: 0,
        overflow: 'auto',
        background: 'var(--paper-page)'
      }
    }, /*#__PURE__*/React.createElement("article", {
      style: {
        maxWidth: 760,
        margin: '0 auto',
        padding: '32px 40px 80px'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--paper-ink-muted)',
        marginBottom: 16,
        display: 'flex',
        gap: 8,
        flexWrap: 'wrap',
        alignItems: 'center'
      }
    }, "participants: ", thread.participants.map(s => /*#__PURE__*/React.createElement(PrincipalRef, {
      key: s,
      kind: "agent",
      id: s,
      href: "#"
    }))), thread.phases.map(ph => {
      const isOpen = open[ph.key];
      return /*#__PURE__*/React.createElement("div", {
        key: ph.key,
        style: {
          borderTop: '1px solid var(--paper-hairline)',
          padding: '10px 0'
        }
      }, /*#__PURE__*/React.createElement("button", {
        onClick: () => setOpen(o => ({
          ...o,
          [ph.key]: !o[ph.key]
        })),
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          textAlign: 'left',
          padding: 0
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--paper-ink-muted)'
        }
      }, isOpen ? '▾' : '▸'), /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--paper-ink)'
        }
      }, ph.label), ph.required ? /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 10,
          color: '#8a5a00',
          background: '#F0E4C8',
          border: '1px solid #D8C89A',
          borderRadius: 999,
          padding: '0 6px'
        }
      }, "\u2691 REQUIRED") : null, ph.note ? /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: 'var(--paper-ink-muted)'
        }
      }, "(", ph.note, ")") : null), isOpen ? /*#__PURE__*/React.createElement("div", {
        style: {
          paddingLeft: 20,
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }
      }, ph.grounded ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--paper-ink-muted)'
        }
      }, "grounded in \u2192 ", ph.grounded.map((g, i) => /*#__PURE__*/React.createElement(WikiLink, {
        key: i,
        title: g.title,
        taint: g.taint
      }))) : null, ph.independent ? /*#__PURE__*/React.createElement("div", {
        style: {
          ...eyebrow,
          color: 'var(--paper-ink-muted)'
        }
      }, "Independent positions \u2014 drafted before cross-reading (anti-anchoring)") : null, ph.turns.map((t, i) => /*#__PURE__*/React.createElement("div", {
        key: i,
        style: {
          background: 'var(--paper-inset)',
          border: '1px solid var(--paper-hairline)',
          borderRadius: 6,
          padding: '10px 14px'
        }
      }, /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 5,
          flexWrap: 'wrap'
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-serif)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--paper-ink)'
        }
      }, t.role), /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--paper-ink-muted)'
        }
      }, "\xB7 ", t.at), /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "agent",
        id: t.sub,
        href: "#"
      }), t.isolated ? /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 10,
          color: 'var(--paper-ink-muted)',
          border: '1px solid var(--paper-hairline)',
          borderRadius: 999,
          padding: '0 5px'
        }
      }, "isolated") : null), /*#__PURE__*/React.createElement("p", {
        style: {
          fontFamily: 'var(--font-serif)',
          fontSize: 16,
          lineHeight: '25px',
          color: 'var(--paper-ink)',
          margin: 0
        }
      }, renderProse(t.body, ph.grounded, true)))), ph.required && !ph.turns.length ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: '#8a5a00'
        }
      }, "no dissent recorded \u2014 huddle may be invalid") : null, ph.children ? /*#__PURE__*/React.createElement("div", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--paper-ink-muted)'
        }
      }, "\u2192 child tickets ", ph.children.map(c => /*#__PURE__*/React.createElement(TicketRef, {
        key: c,
        id: c,
        href: "#"
      }))) : null) : null);
    })));
  }
  window.NTParts = {
    taintBadge,
    WikiLink,
    NoteEditor,
    LinkGraph,
    DeliberationThreadView,
    eyebrow,
    mono,
    panel
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/notes/nt-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/notes/nt-screens.jsx
try { (() => {
/* Helm — Notes · screens (S1–S6). Exposed as window.NTScreens.
   Workshop paper content panes inside the dark Instrument shell. Notes holds no
   ticket/approval/kill authority — it renders truth read-only and deep-links out. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.NT_DATA;
  const P = window.NTParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    StatusPill,
    TierBadge,
    FenceState,
    ReviewChip,
    FreshnessStamp,
    Button,
    Input,
    PrintedAbsence,
    ErrorState,
    HaltBand
  } = H;
  const {
    taintBadge,
    NoteEditor,
    LinkGraph,
    DeliberationThreadView,
    eyebrow,
    mono,
    panel
  } = P;
  function Head({
    crumb,
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, crumb ? /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, crumb) : null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: '2px 0 0'
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '80ch'
      }
    }, sub) : null), right);
  }
  const modeToggle = (mode, setMode) => /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-control)',
      overflow: 'hidden'
    }
  }, ['paper', 'dark'].map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    onClick: () => setMode(m),
    style: {
      padding: '5px 11px',
      border: 0,
      cursor: 'pointer',
      fontFamily: 'var(--font-ui)',
      fontSize: 12,
      fontWeight: 500,
      textTransform: 'capitalize',
      background: mode === m ? 'var(--signal-cyan-wash)' : 'transparent',
      color: mode === m ? 'var(--signal-cyan-ink)' : 'var(--text-muted)'
    }
  }, m)));

  /* ===== S1 · Corpus Browser & Search ===== */
  function Corpus({
    ctx
  }) {
    const cols = [{
      key: 'title',
      header: 'Title',
      render: n => /*#__PURE__*/React.createElement("span", {
        style: {
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }
      }, /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--text-primary)'
        }
      }, n.title), /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 10,
          color: 'var(--text-disabled)'
        }
      }, n.id))
    }, {
      key: 'type',
      header: 'Type',
      render: n => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, n.type)
    }, {
      key: 'taint',
      header: 'Provenance',
      render: n => taintBadge(n.taintEffective)
    }, {
      key: 'ticket',
      header: 'Ticket',
      render: n => n.ticket ? /*#__PURE__*/React.createElement(TicketRef, {
        id: n.ticket,
        href: "#"
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }, {
      key: 'updated',
      header: 'Updated',
      align: 'right',
      render: n => /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: n.updated
      })
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Corpus",
      sub: "The searchable external memory \u2014 agents write findings, huddles, and retros here; markdown on disk is the source of truth, the index is rebuildable.",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "0.4s ago"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 10,
        flexWrap: 'wrap',
        alignItems: 'center'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      icon: "\u2315",
      placeholder: "search corpus\u2026  /",
      style: {
        flex: 1,
        minWidth: 240
      }
    }), ['type ▾', 'tag ▾', 'ticket ▾'].map(f => /*#__PURE__*/React.createElement("button", {
      key: f,
      style: {
        height: 32,
        padding: '0 10px',
        borderRadius: 'var(--radius-control)',
        border: '1px solid var(--border-default)',
        background: 'var(--bg-control)',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        cursor: 'pointer'
      }
    }, f)), /*#__PURE__*/React.createElement(Button, {
      tone: "primary"
    }, "New note")), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.NOTES,
      rowKey: "id",
      onRowClick: ctx.openNote
    }));
  }

  /* ===== S2 · Note Editor (paper pane + metadata rail) ===== */
  function Editor({
    note,
    ctx
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--surface-raised)'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('corpus'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        color: 'var(--text-link)'
      }
    }, "\u2039 Corpus"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, note.title), /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      size: "compact"
    }, "Save"), /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "live 0.3s"
    }), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), modeToggle(ctx.mode, ctx.setMode)), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement(NoteEditor, {
      note: note,
      mode: ctx.mode
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 288,
        flex: 'none',
        borderLeft: '1px solid var(--border-default)',
        background: 'var(--surface-panel)',
        padding: 16,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 14
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Metadata"), /*#__PURE__*/React.createElement(Row, {
      k: "id"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, note.id)), /*#__PURE__*/React.createElement(Row, {
      k: "type"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, note.type)), note.ticket ? /*#__PURE__*/React.createElement(Row, {
      k: "ticket"
    }, /*#__PURE__*/React.createElement(TicketRef, {
      id: note.ticket,
      href: "#"
    })) : null, /*#__PURE__*/React.createElement(Row, {
      k: "taint"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        gap: 5,
        alignItems: 'center'
      }
    }, taintBadge(note.taintOwn), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--text-muted)'
      }
    }, "own")), /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        gap: 5,
        alignItems: 'center'
      }
    }, taintBadge(note.taintEffective), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--text-muted)'
      }
    }, "effective")), note.via.length ? /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--state-amber-ink)'
      }
    }, "via: [[", note.via[0].title, "]] \u26A0") : null)), note.fence ? /*#__PURE__*/React.createElement(Row, {
      k: "fence"
    }, /*#__PURE__*/React.createElement(FenceState, {
      gen: note.fence.gen,
      lease: note.fence.lease,
      heartbeat: note.fence.hb,
      state: note.fence.state
    })) : null, /*#__PURE__*/React.createElement(Row, {
      k: "authors"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        alignItems: 'flex-start'
      }
    }, note.authors.map(a => /*#__PURE__*/React.createElement(PrincipalRef, {
      key: a.sub,
      kind: a.kind,
      id: a.sub,
      href: "#"
    })))), note.ticketStatus ? /*#__PURE__*/React.createElement(Row, {
      k: "ticket-status"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'flex-start'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, note.ticketStatus), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 10,
        color: 'var(--text-disabled)'
      }
    }, "mirror \xB7 authority: Board"))) : null, /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "display-of-truth"
    }, /*#__PURE__*/React.createElement("strong", null, "Taint cannot be edited here.")))));
  }
  function Row({
    k,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: '84px 1fr',
        gap: 8,
        alignItems: 'start'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...eyebrow,
        fontSize: 10
      }
    }, k), /*#__PURE__*/React.createElement("div", null, children));
  }

  /* ===== S3 · Deliberation Thread ===== */
  function Deliberation({
    note,
    ctx
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 18px',
        borderBottom: '1px solid var(--border-default)',
        background: 'var(--surface-raised)',
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("button", {
      onClick: () => ctx.goto('corpus'),
      style: {
        ...eyebrow,
        background: 'transparent',
        border: 0,
        cursor: 'pointer',
        color: 'var(--text-link)'
      }
    }, "\u2039 Corpus"), /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, note.title), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "neutral",
      size: "sm"
    }, "deliberation"), note.ticket ? /*#__PURE__*/React.createElement(TicketRef, {
      id: note.ticket,
      href: "#"
    }) : null, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "phase: ", note.ticketStatus, " \xB7 mirror \xB7 authority: Board"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "on the Board"
    }, "Phase transitions happen on the Board.")), /*#__PURE__*/React.createElement(DeliberationThreadView, {
      thread: note.thread,
      ticket: note.ticket
    }));
  }

  /* ===== S4 · Link Graph & Backlinks ===== */
  function Graph({
    ctx
  }) {
    const g = D.GRAPH;
    const cols = [{
      key: 'note',
      header: '← From',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--text-primary)'
        }
      }, r.note)
    }, {
      key: 'type',
      header: 'Type',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.type)
    }, {
      key: 'taint',
      header: 'Provenance',
      render: r => taintBadge(r.taint)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "Graph",
      title: "Link graph & backlinks",
      sub: "Associative memory \u2014 wikilinks as a graph. Effective-taint propagation is visible here: an \u26A0 UNTRUSTED neighbor is why a focus node's taint is raised.",
      right: /*#__PURE__*/React.createElement(Button, {
        tone: "ghost",
        size: "compact",
        onClick: () => ctx.openNote(D.byId[g.focus])
      }, "open in editor \u2192")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(LinkGraph, {
      graph: g,
      onOpen: id => ctx.openNote(D.byId[id])
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 8
      }
    }, "Backlinks"), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: g.backlinks,
      rowKey: "id",
      onRowClick: r => ctx.openNote(D.byId[r.id]),
      reflow: false
    }))));
  }

  /* ===== S5 · Review-Attention ===== */
  function Review() {
    const cols = [{
      key: 'note',
      header: 'Note',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 13,
          color: 'var(--text-primary)'
        }
      }, r.note)
    }, {
      key: 'ticket',
      header: 'Ticket',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.ticket,
        href: "#"
      })
    }, {
      key: 'gate',
      header: 'Gate / state',
      render: r => r.state === 'escalated' ? /*#__PURE__*/React.createElement(ReviewChip, {
        state: "escalated",
        reason: r.reason,
        href: "#"
      }) : r.state === 'needs_review' ? /*#__PURE__*/React.createElement(ReviewChip, {
        reason: r.reason,
        href: "#"
      }) : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "attention",
        glyph: "\u25D0",
        size: "sm"
      }, "awaiting_approval")
    }, {
      key: 'author',
      header: 'Author',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "agent",
        id: r.author,
        href: "#"
      })
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "Review",
      title: "Review attention",
      sub: "Which of these notes are attached to a ticket in a human gate. Read live from Mission Control \u2014 advisory, never authoritative.",
      right: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "3s ago",
        state: "live"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "source: mc \xB7 as-of 3s"), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.REVIEW,
      rowKey: "id"
    }), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "never here"
    }, /*#__PURE__*/React.createElement("strong", null, "Reviews are cleared on the Board / Mission Control, never here."), " Notes surfaces the gate and deep-links out."));
  }

  /* ===== S6 · Provenance & History Inspector ===== */
  function History({
    note
  }) {
    const [mode, setMode] = React.useState('audit');
    const cols = [{
      key: 'ts',
      header: 'Time',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.ts)
    }, {
      key: 'who',
      header: 'Who',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: r.kind,
        id: r.who,
        href: "#"
      })
    }, {
      key: 'action',
      header: 'Action',
      render: r => /*#__PURE__*/React.createElement("code", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.action)
    }, {
      key: 'target',
      header: 'Target',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.target)
    }, {
      key: 'outcome',
      header: 'Outcome',
      render: () => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "verified",
        glyph: "\u2714",
        size: "sm"
      }, "ok")
    }, {
      key: 'sha',
      header: 'commit',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-disabled)'
        }
      }, r.sha)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1080
      }
    }, /*#__PURE__*/React.createElement(Head, {
      crumb: "History",
      title: note.title,
      sub: "Read-only truth of where this note came from and who touched it. A stale or failed chain-verify is never green.",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'inline-flex',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-control)',
          overflow: 'hidden'
        }
      }, ['audit', 'provenance'].map(m => /*#__PURE__*/React.createElement("button", {
        key: m,
        onClick: () => setMode(m),
        style: {
          padding: '5px 11px',
          border: 0,
          cursor: 'pointer',
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          fontWeight: 500,
          textTransform: 'capitalize',
          background: mode === m ? 'var(--signal-cyan-wash)' : 'transparent',
          color: mode === m ? 'var(--signal-cyan-ink)' : 'var(--text-muted)'
        }
      }, m)))
    }), mode === 'audit' ? /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: 8
      }
    }, "chain: git trailers \xB7 commit_sha per row \xB7 ", /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "verified against git log"), " ", /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "0.6s ago"
    })), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.AUDIT,
      rowKey: "sha",
      reflow: false
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-disabled)'
      }
    }, "state-changes only \xB7 denied/rejected calls are not recorded here")) : /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap'
      }
    }, taintBadge(note.taintOwn), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "own"), "\u2192 ", taintBadge(note.taintEffective), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "effective")), note.via.length ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-secondary)'
      }
    }, "tainted_via: ", note.via.map(v => /*#__PURE__*/React.createElement("span", {
      key: v.title,
      style: {
        ...mono,
        color: 'var(--state-amber-ink)'
      }
    }, "[[", v.title, "]] \u26A0 "))) : /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)'
      }
    }, "No transitive taint \u2014 own = effective."), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "read-only"
    }, "Provenance is display-of-truth \u2014 there is no correction control here.")));
  }
  window.NTScreens = {
    Corpus,
    Editor,
    Deliberation,
    Graph,
    Review,
    History
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/notes/nt-screens.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault/app.jsx
try { (() => {
/* Helm — Vault · shell + router. Renders into #root. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    NavRail,
    AppHeader,
    KillMirror,
    FreshnessStamp
  } = H;
  const SC = window.VTScreens;
  function App() {
    const [route, setRoute] = React.useState('secrets');
    const [collapsed, setCollapsed] = React.useState(false);
    const items = [{
      group: 'Custody'
    }, {
      key: 'secrets',
      label: 'Secrets',
      icon: '⛨',
      active: route === 'secrets',
      onClick: () => setRoute('secrets')
    }, {
      key: 'hosts',
      label: 'Hosts',
      icon: '⊞',
      active: route === 'hosts',
      onClick: () => setRoute('hosts')
    }, {
      key: 'releases',
      label: 'Releases',
      icon: '⇥',
      active: route === 'releases',
      onClick: () => setRoute('releases')
    }, {
      group: 'Truth'
    }, {
      key: 'audit',
      label: 'Audit',
      icon: '▤',
      active: route === 'audit',
      onClick: () => setRoute('audit')
    }, {
      key: 'status',
      label: 'Status / DR',
      icon: '◉',
      active: route === 'status',
      onClick: () => setRoute('status')
    }, {
      key: 'change',
      label: 'Change control',
      icon: '⚖',
      active: route === 'change',
      onClick: () => setRoute('change')
    }];
    let screen = null;
    if (route === 'secrets') screen = /*#__PURE__*/React.createElement(SC.Secrets, null);else if (route === 'hosts') screen = /*#__PURE__*/React.createElement(SC.Hosts, null);else if (route === 'releases') screen = /*#__PURE__*/React.createElement(SC.Releases, null);else if (route === 'audit') screen = /*#__PURE__*/React.createElement(SC.Audit, null);else if (route === 'status') screen = /*#__PURE__*/React.createElement(SC.Status, null);else if (route === 'change') screen = /*#__PURE__*/React.createElement(SC.ChangeControl, null);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        height: '100vh',
        background: 'var(--bg-app)'
      }
    }, /*#__PURE__*/React.createElement(NavRail, {
      current: "vault",
      posture: "nominal",
      items: items,
      collapsed: collapsed,
      onToggle: setCollapsed,
      postureHref: "#"
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0
      }
    }, /*#__PURE__*/React.createElement(AppHeader, {
      appName: "Vault",
      identity: "secrets custody & Gateway-only redemption",
      systemState: /*#__PURE__*/React.createElement(FreshnessStamp, {
        age: "G0 \xB7 polled 1.2s"
      })
    }, /*#__PURE__*/React.createElement(KillMirror, {
      engaged: false,
      href: "#"
    })), /*#__PURE__*/React.createElement("main", {
      style: {
        flex: 1,
        overflow: 'auto',
        padding: 24
      }
    }, screen)));
  }
  ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault/app.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault/vt-data.jsx
try { (() => {
/* Helm — Vault · data. Exposed as window.VT_DATA.
   Secrets custody: create/rotate authority but NEVER read a secret back. */
(function () {
  const SECRETS = [{
    handle: 'cred://hosts/nas-01/admin-login',
    host: 'nas-01',
    kind: 'kv',
    rotation: '90d',
    due: '▲ due 3d',
    lastWrite: '2026-06-30',
    approvalClass: 'root',
    versions: ['v7 2026-06-30', 'v6 2026-03-31', 'v5 2025-12-31']
  }, {
    handle: 'cred://hosts/sw-core/enable',
    host: 'sw-core',
    kind: 'kv',
    rotation: 'manual',
    due: '',
    lastWrite: '2026-05-11',
    approvalClass: 'admin',
    versions: ['v2 2026-05-11']
  }, {
    handle: 'cred://hosts/nas-01/root',
    host: 'nas-01',
    kind: 'ssh-ca',
    rotation: 'CA-signed',
    due: '',
    lastWrite: '—',
    approvalClass: 'root',
    versions: []
  }];
  const HOSTS = [{
    host: 'nas-01',
    role: 'gateway-nas-01',
    roleOk: true,
    principals: 'root',
    ntp: 'ok',
    caKeys: '✔ 2026-06-01',
    state: 'ready'
  }, {
    host: 'sw-core',
    role: 'gateway-sw-core',
    roleOk: false,
    principals: 'svc-deploy',
    ntp: 'ok',
    caKeys: '▲ not yet',
    state: 'staged'
  }, {
    host: 'db-02',
    role: null,
    principals: '—',
    ntp: '—',
    caKeys: '—',
    state: 'new'
  }];
  const EXFIL = [{
    ts: '2026-07-03 09:14',
    sub: 'agent:recon-04',
    kind: 'agent',
    outcome: '403 not_gateway',
    ticket: 'T-000512'
  }, {
    ts: '2026-07-03 02:41',
    sub: '(no channel cert)',
    kind: null,
    outcome: '403 not_gateway_channel',
    ticket: null
  }];
  const LEDGER = [{
    ts: '07-03 09:20:11',
    sub: 'svc:gateway',
    kind: 'service',
    action: 'redeem',
    target: 'T-000123·nas-01',
    outcome: 'CONFIRMED',
    ok: true,
    sinks: '✔✔',
    prov: 'gateway-delivered'
  }, {
    ts: '07-03 08:55:03',
    sub: 'svc:gateway',
    kind: 'service',
    action: 'redeem',
    target: 'T-000120·db-02',
    outcome: 'approval_not_consumed',
    ok: false,
    sinks: '✔✔',
    prov: null
  }, {
    ts: '07-03 08:40:20',
    sub: 'svc:gateway',
    kind: 'service',
    action: 'sign_cert',
    target: 'T-000118·sw-core',
    outcome: 'CONFIRMED',
    ok: true,
    sinks: '✔✔',
    prov: 'gateway-delivered'
  }];
  const RELEASES = [{
    id: 'rel-01HX9K',
    handle: 'cred://hosts/nas-01/root',
    ticket: 'T-000123',
    by: 'agent:patcher-07',
    status: 'pending',
    expires: '23:41:12'
  }, {
    id: 'rel-01HX8Z',
    handle: 'cred://hosts/db-02/admin',
    ticket: 'T-000120',
    by: 'agent:recon-05',
    status: 'redeemed',
    expires: '—'
  }, {
    id: 'rel-01HX7Q',
    handle: 'cred://hosts/sw-core/enable',
    ticket: 'T-000118',
    by: 'agent:patcher-09',
    status: 'revoked',
    expires: '—'
  }];
  const STATUS = {
    seal: 'UNSEALED',
    sealAge: '1s',
    unsealer: 'healthy',
    sealTokenTtl: '21d',
    quorum: '3-of-5 shares · escrowed offline',
    quorumTest: '2026-06-15 ▲',
    sinks: 'local + WORM current',
    kill: 'G0',
    backup: 'raft snapshot age 6h ✔',
    caFingerprint: 'SHA256:1a2b…9f',
    breakGlass: 'nas-01 2026-06-20 ✔ · db-02 2026-04-02 ▲ overdue'
  };
  window.VT_DATA = {
    SECRETS,
    HOSTS,
    EXFIL,
    LEDGER,
    RELEASES,
    STATUS
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault/vt-data.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault/vt-parts.jsx
try { (() => {
/* Helm — Vault · app-specific components. Exposed as window.VTParts. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const {
    Input,
    Button,
    PrintedAbsence,
    FreshnessStamp,
    StatusPill
  } = H;
  const eyebrow = {
    fontFamily: 'var(--font-ui)',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: 'var(--text-muted)',
    fontWeight: 600
  };
  const mono = {
    fontFamily: 'var(--font-mono)',
    fontFeatureSettings: "'tnum' 1"
  };
  const panel = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-panel)'
  };

  /* SecretWriteForm — the write-only KV surface; the value is never echoed back. */
  function SecretWriteForm({
    onClose
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "New KV secret \xB7 write-only"), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "host_id",
      mono: true,
      placeholder: "nas-01",
      style: {
        width: 150
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "name",
      placeholder: "admin-login",
      style: {
        flex: 1,
        minWidth: 160
      }
    })), /*#__PURE__*/React.createElement(Input, {
      label: "Value (masked \xB7 never echoed after submit)",
      type: "password",
      placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022",
      style: {
        width: '100%'
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement(Input, {
      label: "Rotation",
      defaultValue: "90d",
      style: {
        width: 110
      }
    }), /*#__PURE__*/React.createElement(Input, {
      label: "recovery",
      defaultValue: "provider-console",
      style: {
        width: 180
      }
    })), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\uD83D\uDD12",
      tag: "no read-back"
    }, /*#__PURE__*/React.createElement("strong", null, "This surface can write a secret; it can never read one back."), " There is no reveal, export, or show-plaintext path."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "ghost",
      onClick: onClose
    }, "Cancel"), /*#__PURE__*/React.createElement(Button, {
      tone: "primary",
      onClick: onClose
    }, "Write secret")));
  }

  /* SignRoleStager — stages a powerless proposed SSH sign-role; apply is a full ceremony. */
  function SignRoleStager({
    host,
    onApply
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 10
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Stage sign-role \xB7 ", host), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)',
        display: 'flex',
        flexDirection: 'column',
        gap: 4
      }
    }, /*#__PURE__*/React.createElement("div", null, "allowed_users: [ svc-deploy ] \xB7 default_user: (empty \u2014 pinned)"), /*#__PURE__*/React.createElement("div", null, "valid_principals (templated): svc-deploy \xB7 no wildcards \xB7 allow_empty=false")), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        padding: '8px 12px',
        ...mono,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--text-muted)',
        marginBottom: 4
      }
    }, "Proposed role diff (hash sha256:9f2c\u2026)"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--state-green-ink)'
      }
    }, "+ ssh/roles/gateway-", host, " allowed_users=svc-deploy valid_principals\u2026")), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement(Button, {
      tone: "secondary",
      size: "compact"
    }, "Stage proposal"), onApply));
  }

  /* SealChainPanel — the crown-jewels register; every figure obeys the false-green rule. */
  function Tile({
    title,
    children
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 6
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, title), children);
  }
  function SealChainPanel({
    status,
    sealUnknown
  }) {
    const s = status;
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement(Tile, {
      title: "Engine seal"
    }, sealUnknown ? /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        fontWeight: 600,
        color: 'var(--halt-gold-ink)'
      }
    }, "\u26A0 CANNOT CONFIRM SEAL \u2014 engine unreachable; treat as UNVERIFIED") : /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--text-primary)'
      }
    }, "\u25CF ", s.seal), /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: `engine · ${s.sealAge}`,
      state: sealUnknown ? 'halt' : 'live',
      reading: sealUnknown ? 'seal unknown' : undefined
    })), /*#__PURE__*/React.createElement(Tile, {
      title: "Unsealer"
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 14,
        color: 'var(--text-primary)'
      }
    }, "\u25CF ", s.unsealer), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "seal-token TTL ", s.sealTokenTtl, " \u2714")), /*#__PURE__*/React.createElement(Tile, {
      title: "Recovery quorum"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, s.quorum), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--state-amber-ink)'
      }
    }, "last quorum-test ", s.quorumTest)), /*#__PURE__*/React.createElement(Tile, {
      title: "Audit sinks"
    }, sealUnknown ? /*#__PURE__*/React.createElement("span", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--halt-gold-ink)'
      }
    }, "\u26A0 one sink down \u2014 safe-stopped") : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--state-green)'
      }
    }, "\u2714\u2714 ", s.sinks), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--text-muted)'
      }
    }, "engine-stream xcorr live"))), /*#__PURE__*/React.createElement(Tile, {
      title: "Kill level (from auth)"
    }, /*#__PURE__*/React.createElement(StatusPill, {
      tone: "neutral",
      glyph: "\u25CF",
      size: "sm"
    }, s.kill), /*#__PURE__*/React.createElement(FreshnessStamp, {
      age: "0.4s"
    })), /*#__PURE__*/React.createElement(Tile, {
      title: "Backups"
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, s.backup), /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 11,
        color: 'var(--state-green)'
      }
    }, "VAULT_SNAPSHOT_DEST reachable \u2714")));
  }
  window.VTParts = {
    SecretWriteForm,
    SignRoleStager,
    SealChainPanel,
    eyebrow,
    mono,
    panel
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault/vt-parts.jsx", error: String((e && e.message) || e) }); }

// ui_kits/vault/vt-screens.jsx
try { (() => {
/* Helm — Vault · screens (6). Exposed as window.VTScreens. */
(function () {
  const H = window.HelmDesignSystem_f4cb26;
  const D = window.VT_DATA;
  const P = window.VTParts;
  const {
    DataTable,
    TicketRef,
    PrincipalRef,
    StatusPill,
    TierBadge,
    FreshnessStamp,
    HonestState,
    Button,
    DangerAction,
    ConfirmFriction,
    PrintedAbsence
  } = H;
  const {
    SecretWriteForm,
    SignRoleStager,
    SealChainPanel,
    eyebrow,
    mono,
    panel
  } = P;
  function Head({
    title,
    sub,
    right
  }) {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 20,
        fontWeight: 600,
        color: 'var(--text-primary)',
        margin: 0
      }
    }, title), sub ? /*#__PURE__*/React.createElement("p", {
      style: {
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        color: 'var(--text-muted)',
        margin: '2px 0 0',
        maxWidth: '82ch'
      }
    }, sub) : null), right);
  }

  /* 1 · Secrets Manager */
  function Secrets() {
    const [form, setForm] = React.useState(false);
    const [sel, setSel] = React.useState(D.SECRETS[0]);
    const cols = [{
      key: 'handle',
      header: 'Handle',
      render: s => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-primary)'
        }
      }, s.handle)
    }, {
      key: 'host',
      header: 'Host',
      render: s => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, s.host)
    }, {
      key: 'kind',
      header: 'Kind',
      render: s => /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        size: "sm"
      }, s.kind)
    }, {
      key: 'rotation',
      header: 'Rotation',
      render: s => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: s.due ? 'var(--state-amber-ink)' : 'var(--text-secondary)'
        }
      }, s.rotation, " ", s.due)
    }, {
      key: 'lastWrite',
      header: 'Last write',
      align: 'right',
      render: s => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, s.lastWrite)
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Secrets manager",
      sub: "This surface can create and rotate secrets; it cannot read one back.",
      right: /*#__PURE__*/React.createElement("div", {
        style: {
          display: 'flex',
          gap: 8
        }
      }, /*#__PURE__*/React.createElement(Button, {
        tone: "primary",
        onClick: () => setForm(true)
      }, "+ New KV secret"), /*#__PURE__*/React.createElement(Button, {
        tone: "secondary"
      }, "Import"))
    }), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\u26CA",
      tag: "write-only by construction"
    }, /*#__PURE__*/React.createElement("strong", null, "There is no reveal, export, or show-plaintext path here."), " Break-glass read is an offline 3-of-5 quorum ceremony, never a web action."), form ? /*#__PURE__*/React.createElement(SecretWriteForm, {
      onClose: () => setForm(false)
    }) : null, /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.SECRETS,
      rowKey: "handle",
      focusedKey: sel.handle,
      onRowClick: setSel
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Detail \xB7 ", sel.host), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "host_id ", sel.host, " \xB7 requires_approval_class: ", sel.approvalClass), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-muted)'
      }
    }, "Versions (metadata): ", sel.versions.length ? sel.versions.join(' · ') : '— (SSH-CA, no KV value)', " ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--text-disabled)'
      }
    }, "[ no value shown, ever ]")), sel.kind === 'kv' ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement(DangerAction, {
      label: "Rotate now",
      glyph: "\u26A0",
      variant: "solid",
      size: "compact",
      title: `Rotate ${sel.handle}`,
      consequence: "Moves versions; irreversible for the prior value. Not complete until the new version is durably off-box.",
      direction: "more",
      irreversible: true,
      typedIntent: "ROTATE",
      stepUp: true,
      auditNote: "Shows the off-box snapshot ack; writes a tamper-evident row.",
      confirmLabel: "Rotate"
    })) : null));
  }

  /* 2 · Host Onboarding */
  function Hosts() {
    const cols = [{
      key: 'host',
      header: 'Host',
      render: h => /*#__PURE__*/React.createElement(TicketRef, {
        id: h.host
      })
    }, {
      key: 'role',
      header: 'SSH sign-role',
      render: h => h.role ? /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, h.role, " ", h.roleOk ? '✔' : '⧗') : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014 (none)")
    }, {
      key: 'principals',
      header: 'Principals',
      render: h => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, h.principals)
    }, {
      key: 'caKeys',
      header: 'CA-keys',
      render: h => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: h.caKeys.includes('▲') ? 'var(--state-amber-ink)' : 'var(--text-secondary)'
        }
      }, h.caKeys)
    }, {
      key: 'state',
      header: 'State',
      render: h => h.state === 'ready' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "verified",
        glyph: "\u25CF",
        size: "sm"
      }, "READY") : h.state === 'staged' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "attention",
        glyph: "\u25D0",
        size: "sm"
      }, "STAGED") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "neutral",
        glyph: "\u25FC",
        size: "sm"
      }, "NEW")
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Host onboarding",
      sub: "SSH sign-role stager. A wildcard / root / allow_empty role is prevented from staging by a continuous invariant check.",
      right: /*#__PURE__*/React.createElement(Button, {
        tone: "primary"
      }, "+ Register host")
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.HOSTS,
      rowKey: "host"
    }), /*#__PURE__*/React.createElement(SignRoleStager, {
      host: "sw-core",
      onApply: /*#__PURE__*/React.createElement(DangerAction, {
        label: "Apply (operator step-up)",
        glyph: "\u26A0",
        variant: "solid",
        size: "compact",
        title: "Apply sign-role gateway-sw-core",
        consequence: "This is the gate-defining act. You confirm the exact sha256 diff shown.",
        direction: "more",
        typedIntent: "APPLY-ROLE",
        stepUp: true,
        auditNote: "Diff-hash-bound; writes a tamper-evident row.",
        confirmLabel: "Apply"
      })
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        marginBottom: 6
      }
    }, "TrustedUserCAKeys snippet (copy)"), "@cert-authority *.fleet ssh-ed25519 AAAA\u2026CApub \xB7 key_id correlates to <ticket_id>", /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--state-amber-ink)',
        marginTop: 6
      }
    }, "Reminder: enforced/monitored NTP \u2014 clock skew silently extends cert validity.")));
  }

  /* 3 · Access Audit */
  function Audit() {
    const exfilCols = [{
      key: 'ts',
      header: 'Time',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.ts)
    }, {
      key: 'sub',
      header: 'Sub',
      render: r => r.kind ? /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: r.kind,
        id: r.sub
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--state-amber-ink)'
        }
      }, r.sub)
    }, {
      key: 'outcome',
      header: 'Outcome',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--danger-text)'
        }
      }, "\u2715 ", r.outcome)
    }, {
      key: 'ticket',
      header: 'Ticket',
      render: r => r.ticket ? /*#__PURE__*/React.createElement(TicketRef, {
        id: r.ticket,
        href: "#"
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }];
    const cols = [{
      key: 'ts',
      header: 'Time',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.ts)
    }, {
      key: 'sub',
      header: 'Who',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: r.kind,
        id: r.sub
      })
    }, {
      key: 'action',
      header: 'Action',
      render: r => /*#__PURE__*/React.createElement("code", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.action)
    }, {
      key: 'target',
      header: 'Target',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.target)
    }, {
      key: 'outcome',
      header: 'Outcome',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          fontFamily: 'var(--font-ui)',
          fontSize: 12,
          color: r.ok ? 'var(--state-green)' : 'var(--danger-text)'
        }
      }, r.ok ? '✔ ' : '✕ ', r.outcome)
    }, {
      key: 'sinks',
      header: 'Sinks',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--state-green)'
        }
      }, r.sinks)
    }, {
      key: 'prov',
      header: 'Prov',
      render: r => r.prov ? /*#__PURE__*/React.createElement(TierBadge, {
        tier: "corroborated",
        label: r.prov
      }) : /*#__PURE__*/React.createElement("span", {
        style: {
          color: 'var(--text-disabled)'
        }
      }, "\u2014")
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Access audit",
      sub: "The redemption / denial ledger. svc:gateway is the only legitimate redeemer \u2014 any agent or 'no cert' redemption is anomalous by definition."
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        borderColor: '#5A4A1E',
        background: 'var(--state-amber-wash)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        ...eyebrow,
        color: 'var(--state-amber-ink)',
        marginBottom: 8
      }
    }, "\u2691 Exfiltration signal \u2014 agent-shaped denials (pinned) \xB7 3 in last 24h"), /*#__PURE__*/React.createElement(DataTable, {
      columns: exfilCols,
      rows: D.EXFIL,
      rowKey: "ts",
      reflow: false
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "local HEAD seq 44,812 \xB7 WORM HEAD 44,812 \u2714 matched 0.6s"), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }), /*#__PURE__*/React.createElement(StatusPill, {
      tone: "verified",
      glyph: "\u2714",
      size: "sm"
    }, "CHAIN VERIFIED")), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.LEDGER,
      rowKey: "ts",
      reflow: false
    }));
  }

  /* 4 · Releases */
  function Releases() {
    const cols = [{
      key: 'id',
      header: 'Release',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.id
      })
    }, {
      key: 'handle',
      header: 'Handle',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-secondary)'
        }
      }, r.handle)
    }, {
      key: 'ticket',
      header: 'Ticket',
      render: r => /*#__PURE__*/React.createElement(TicketRef, {
        id: r.ticket,
        href: "#"
      })
    }, {
      key: 'by',
      header: 'Requested by',
      render: r => /*#__PURE__*/React.createElement(PrincipalRef, {
        kind: "agent",
        id: r.by
      })
    }, {
      key: 'status',
      header: 'Status',
      render: r => r.status === 'pending' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "attention",
        glyph: "\u25D0",
        size: "sm"
      }, "pending") : r.status === 'redeemed' ? /*#__PURE__*/React.createElement(StatusPill, {
        tone: "verified",
        glyph: "\u2714",
        size: "sm"
      }, "redeemed") : /*#__PURE__*/React.createElement(StatusPill, {
        tone: "danger",
        glyph: "\u26D2",
        size: "sm"
      }, "revoked")
    }, {
      key: 'expires',
      header: 'Expires',
      align: 'right',
      render: r => /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 12,
          color: 'var(--text-muted)'
        }
      }, r.expires)
    }, {
      key: 'act',
      header: '',
      render: r => r.status === 'pending' ? /*#__PURE__*/React.createElement(DangerAction, {
        label: "Revoke",
        glyph: "\u26A0",
        variant: "outline",
        size: "compact",
        intensity: "light",
        title: `Revoke ${r.id}`,
        consequence: "Revokes the PENDING release only. An SSH cert already signed for this ticket remains valid until its TTL / a KRL push \u2014 revoking here does not recall it.",
        direction: "less",
        honest: {
          confirmed: 1,
          pending: 1,
          draining: 0
        },
        confirmLabel: "Revoke"
      }) : null
    }];
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Releases",
      sub: "The powerless release_id shadows agents stage. Revoke moves toward less action (light confirm), but never reads a false 'revoked everywhere'."
    }), /*#__PURE__*/React.createElement(DataTable, {
      columns: cols,
      rows: D.RELEASES,
      rowKey: "id"
    }));
  }

  /* 5 · Status / DR */
  function Status() {
    const [sealUnknown, setSealUnknown] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 1180
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Status / DR \u2014 crown jewels",
      sub: "The false-green discipline is the point of this screen: seal-unknown \u2192 gold, never a fabricated green.",
      right: /*#__PURE__*/React.createElement(Button, {
        tone: "ghost",
        size: "compact",
        onClick: () => setSealUnknown(v => !v)
      }, sealUnknown ? '↺ engine reachable (demo)' : '⚠ engine unreachable (demo)')
    }), /*#__PURE__*/React.createElement(SealChainPanel, {
      status: D.STATUS,
      sealUnknown: sealUnknown
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "CA & break-glass"), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "Suite-internal CA fingerprint ", D.STATUS.caFingerprint, " \xB7 rotation runbook \u25B8"), /*#__PURE__*/React.createElement(PrintedAbsence, {
      glyph: "\u26CA",
      tag: "non-exportable"
    }, /*#__PURE__*/React.createElement("strong", null, "SSH CA signing key: inside barrier, non-exportable.")), /*#__PURE__*/React.createElement("div", {
      style: {
        ...mono,
        fontSize: 12,
        color: 'var(--text-secondary)'
      }
    }, "Per-host break-glass last-verified: ", D.STATUS.breakGlass)));
  }

  /* 6 · Change Control */
  function ChangeControl() {
    const [open, setOpen] = React.useState(false);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        maxWidth: 900
      }
    }, /*#__PURE__*/React.createElement(Head, {
      title: "Change control",
      sub: "The single place any gate-weakening edit happens \u2014 TTL raises, principal widening, sink changes. Every edit is the full ceremony.",
      right: /*#__PURE__*/React.createElement("span", {
        style: {
          ...mono,
          fontSize: 11,
          color: 'var(--text-muted)'
        }
      }, "pending edits: 1")
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        ...panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: eyebrow
    }, "Proposed edit \u2014 raise VAULT_SSH_CERT_TTL 10m \u2192 30m"), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--surface-inset)',
        border: '1px solid var(--border-default)',
        borderRadius: 6,
        padding: '10px 14px',
        ...mono,
        fontSize: 12
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--text-muted)',
        marginBottom: 4
      }
    }, "Diff (hash sha256:c1a4\u2026)"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--danger-text)'
      }
    }, "- ssh_cert_ttl: 10m"), /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--state-green-ink)'
      }
    }, "+ ssh_cert_ttl: 30m ", /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--state-amber-ink)'
      }
    }, "\u26A0 GATE-WEAKENING \u2014 widens the window a signed cert is valid"))), /*#__PURE__*/React.createElement("div", {
      style: {
        background: 'var(--danger-bg)',
        border: '1px solid #5A2420',
        borderRadius: 6,
        padding: '10px 14px',
        fontFamily: 'var(--font-ui)',
        fontSize: 13,
        lineHeight: '19px',
        color: 'var(--danger-text)'
      }
    }, "\u26A0 Consequence \u2014 moves the system TOWARD MORE real-world action: any cert signed after apply is valid 3\xD7 longer; a compromised cert's blast-window triples. Irreversible for certs already signed under the new TTL."), /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end'
      }
    }, /*#__PURE__*/React.createElement(DangerAction, {
      label: "Apply edit",
      glyph: "\u26A0",
      variant: "solid",
      title: "Apply \u2014 raise SSH cert TTL",
      consequence: "Confirm the exact diff shown. A changed diff invalidates this token.",
      direction: "more",
      irreversible: true,
      typedIntent: "raise-ssh-ttl",
      stepUp: true,
      auditNote: "Diff-hash-bound; writes a tamper-evident audit row.",
      confirmLabel: "Apply edit"
    }))));
  }
  window.VTScreens = {
    Secrets,
    Hosts,
    Audit,
    Releases,
    Status,
    ChangeControl
  };
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/vault/vt-screens.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.IconButton = __ds_scope.IconButton;

__ds_ns.Input = __ds_scope.Input;

__ds_ns.StatusPill = __ds_scope.StatusPill;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.EmptyState = __ds_scope.EmptyState;

__ds_ns.ErrorState = __ds_scope.ErrorState;

__ds_ns.LivenessClass = __ds_scope.LivenessClass;

__ds_ns.Skeleton = __ds_scope.Skeleton;

__ds_ns.FenceState = __ds_scope.FenceState;

__ds_ns.PrincipalRef = __ds_scope.PrincipalRef;

__ds_ns.TicketRef = __ds_scope.TicketRef;

__ds_ns.TierBadge = __ds_scope.TierBadge;

__ds_ns.ConfirmFriction = __ds_scope.ConfirmFriction;

__ds_ns.DangerAction = __ds_scope.DangerAction;

__ds_ns.FreshnessStamp = __ds_scope.FreshnessStamp;

__ds_ns.HaltBand = __ds_scope.HaltBand;

__ds_ns.HonestState = __ds_scope.HonestState;

__ds_ns.PrintedAbsence = __ds_scope.PrintedAbsence;

__ds_ns.ReviewChip = __ds_scope.ReviewChip;

__ds_ns.StopActuator = __ds_scope.StopActuator;

__ds_ns.AppHeader = __ds_scope.AppHeader;

__ds_ns.KillMirror = __ds_scope.KillMirror;

__ds_ns.NavRail = __ds_scope.NavRail;

__ds_ns.HELM_APPS = __ds_scope.HELM_APPS;

__ds_ns.SuiteSwitcher = __ds_scope.SuiteSwitcher;

})();
