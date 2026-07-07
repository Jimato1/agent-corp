// lib/helmStyle.ts — the Helm component style-injection helper.
// Each realized Helm component ships its exact inline-CSS string (copied verbatim
// from the handoff .jsx) and registers it once at module load, keyed by a stable
// id so re-imports never duplicate a <style>. This preserves the handoff's
// self-contained "component carries its own CSS" approach without a monolithic
// stylesheet.
export function injectStyle(id: string, css: string): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(id)) return;
  const el = document.createElement('style');
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
}
