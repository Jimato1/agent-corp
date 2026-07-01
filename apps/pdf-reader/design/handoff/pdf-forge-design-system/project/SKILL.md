---
name: pdf-forge-design
description: Use this skill to generate well-branded interfaces and assets for pdf-forge — a privacy-first, self-hosted PDF document workshop — for production or for throwaway prototypes/mocks. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping the "workbench" instrument aesthetic (graphite substrate, paper sheets, press-blue selection, amber press-at-work).
user-invocable: true
---

Read the `readme.md` file within this skill first — it carries the design thesis (substrate vs. sheet, ink-not-color), the full token reference, content/voice rules, iconography, and the SIGNATURE (pages as physical sheets + the amber press). Then explore the other files:

- `styles.css` + `tokens/` — link `styles.css` to inherit every CSS custom property and the two webfonts (Inter, JetBrains Mono).
- `components/` — React primitives (`<Name>.jsx` + `.d.ts` + `.prompt.md`); read the `.prompt.md` for usage and variants.
- `ui_kits/workbench/` — the full interactive instrument to copy from.
- `assets/logo/mark.svg` — the brand mark.
- `guidelines/` — foundation specimen cards.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets out and produce static HTML files for the user to view: link `styles.css`, load the compiled bundle (`_ds_bundle.js`), and mount components via `const { Button, PageSheet, … } = window.PDFForgeDesignSystem_ec4ef3`. If working on production code, copy assets and apply the rules here to design as an expert in this brand.

Honor the QUALITY FLOOR every time: responsive to ~375px, always-visible press-blue focus rings, `prefers-reduced-motion` respected, AA contrast. Spend boldness only on the SIGNATURE (the board of sheets + the amber press) — everything else stays quiet graphite + ink. White means "this is a document"; never use it for chrome.

If the user invokes this skill without other guidance, ask what they want to build or design, ask a few focused questions (surface, audience, density, which operations), then act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.
