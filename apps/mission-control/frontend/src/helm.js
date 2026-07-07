// Typed-ish accessor for the vendored Helm design-system bundle (window.HelmDesignSystem_f4cb26).
// All shared components (safety grammar, shell, data table, identity chips) come from here — MC
// never redraws a shared entity; it composes these. See context/DESIGN_SYSTEM.md §4-§7.
const H = window.HelmDesignSystem_f4cb26;
if (!H) {
  throw new Error('Helm bundle missing — /helm/_ds_bundle.js must load before the app module.');
}
export default H;
