# pdf-forge — Design System (v1)

The visual foundation for **pdf-forge**: a privacy-first, self-hosted **document workshop** — an instrument an operator drives with keyboard and mouse on a LAN. Not a SaaS dashboard. Every token is justified against the subject: **paper, pages, ink, and a fast local tool.**

> **One rule above all:** spend boldness in exactly one place — *the board where pages live as physical sheets* (the SIGNATURE). Everything else is quiet, dense, and instrumental.

---

## 0. Context & sources

pdf-forge is a **workbench, not a feed.** The screen is a *worksurface* with documents on it, surrounded by tooling. The operator loads a PDF, sees its pages as sheets on a board, and runs operations (merge, split, rotate, compress, export) as local server jobs.

**Sources for this system:** none external. This design system was authored directly from the **pdf-forge Design System v1 written specification** (the brief), which defines palette, type, spacing, radii/elevation, the page-thumbnail board, interaction states, motion, and the SIGNATURE. No codebase, Figma file, or screenshots were provided — so there is **no proprietary product UI being recreated**; the workbench UI kit is an original realization of the brief. If you later have the real pdf-forge frontend (repo or Figma), hand it over and the UI kit can be reconciled against it.

**Design thesis — two ideas drive everything:**
1. **Substrate vs. sheet.** The app background is a cool graphite *substrate* (a workbench surface). The only thing that is bright paper-white is an actual PDF page. White means "this is a document." Nothing else earns white. This single inversion separates pdf-forge from every white-card SaaS app and makes pages physically present.
2. **Ink, not color.** UI text/iconography is an *ink* ramp. Color is rationed: ONE accent (a cyan-forward "press blue") carries selection + primary action; semantics (success/warn/error/processing) appear only on state.

Plus two supporting principles: **tabular truth** (every quantity uses tabular figures and aligns column-true) and **dense & keyboardable** (4px base unit, 32px default controls, always-visible focus rings).

---

## 1. CONTENT FUNDAMENTALS — how pdf-forge writes

The voice is an **instrument's voice**: terse, precise, mechanical, never chatty or salesy. Copy reads like a tool reporting state, not an app persuading you.

- **Person & address.** Mostly **impersonal/imperative** — label the action, not the user. Buttons are bare verbs: `Export`, `Merge`, `Rotate`, `Add files`. Avoid "you"; never "we". No marketing first person.
- **Casing.** **Sentence case** everywhere (labels, buttons, dialog titles): "Keep input files", "Enter password". The *only* uppercase is the 12px **section eyebrow** (`OPERATIONS`, `INSPECTOR`) at +0.04em tracking — instrument-panel labeling. Mono text is **never** uppercased.
- **Numbers & machine data.** Quantities are exact and tabular: `14 pages`, `4.2 MB`, `300 DPI`, `page 7 of 512`. Ranges are mono: `1-10,21-end`. Filenames are mono: `contract_final.pdf`. Error codes are surfaced verbatim in mono: `bad_pdf_structure`, `422`.
- **Processing language.** The running-job verb is the mechanical **"Pressing…"** (the press at work), resolving to **"Done"** / **"Export ready"** or a machine-code failure. Prefer present-progressive verbs over spinners-with-no-words.
- **Tone of errors.** Blunt and diagnostic, never cute: "Wrong password", "Couldn't read the PDF" + the code. Warnings are advisory and factual: "Advisory permissions kept".
- **No emoji. No exclamation. No filler.** One thousand no's for every yes. If a control's purpose is obvious, it gets a verb and nothing more.

Example microcopy: *"Export all 14 pages"*, *"3 selected"*, *"local · 127.0.0.1"*, *"Re-samples images; vector text is untouched."*

---

## 2. VISUAL FOUNDATIONS

**Color.** A cool graphite **substrate** ramp (`--sub-900…400`, slightly blue-cool, reads as metal/desk), a near-black **ink** ramp for text (`--ink-900…500`), warm **paper** for actual pages only (`--paper-0` `#FBFBF9`), ONE **press-blue** accent (`--press-500` `#1FA2C4`) for selection + primary action, and four rationed **semantics** (ok green, warn gold, err red, **proc amber** — the one deliberate warm hue, reserved for running jobs). Color vibe: cool, low-chroma, instrument-like; the only warmth is paper and the amber press.

**Type.** Two faces, role-mapped. **Inter** is the reading/label voice (humanist grotesque, tall x-height, superb at 12–14px, `tnum`+`lnum` on for counts). **JetBrains Mono** is the data voice (filenames, ranges, sizes, hashes, codes) — unambiguous `0/O`, `1/l`, tabular by nature. Scale ≈1.20 minor third, tightened: 11/12/13/14/16/20/26px. Weights 400 body, 500 labels/controls, 600 headings, a single 700 for the empty-state H1.

**Spacing & density.** 4px base unit (denser than the 8px SaaS norm). Controls: compact 28 · default 32 · touch/primary 40px (≥44px hit target on mobile via padding). Three-zone layout: left **rail** (56 collapsed / 220 open) · center **worksurface** (the board, the hero) · right **inspector** (300–340). Prose/dialogs cap at 560px; the board is fluid.

**Backgrounds.** No images, no gradients-as-hero, no candy. The app background is flat `--sub-850`. The board is a recessed **inset well** (`--sub-700` + inner top-shadow) with an *optional* 24px cutting-mat dot grid at ~8% (atmospheric, never load-bearing, off under reduced-data). Imagery in the product = the PDF pages themselves, rendered to paper sheets.

**Radii.** Small and opinionated: sheets `2px` (paper has crisp corners), controls `4px`, panels/dialogs `6px`, pills `999px`. Rounded-everything is banned; nothing exceeds 6px except true pills.

**Borders.** Separation is **value-step + 1px hairline** (`--sub-600` dividers, `--sub-500` control outlines). On focus the control border is *replaced* by the press ring, never stacked.

**Elevation.** **Chrome casts no shadow** — panels separate by value + hairline only (this kills "card soup"). **Shadow is reserved for paper**: sheets cast at rest (`0 1px 2px`), hover (`0 2px 6px`), and lifted/dragging (`0 10px 24px`). The only chrome permitted to cast is a **dialog** (`0 16px 48px` + scrim) and floating **toasts**.

**Motion.** Purposeful, short, mechanical. `--mo-fast` 120ms (hover/focus/control), `--mo-base` 180ms (sheet lift/drop, gap reflow), `--mo-slow` 240ms (dialog/scrim). Easing decelerates (`--ease-out` `cubic-bezier(.2,.7,.3,1)`); the processing pulse uses `--ease-press`. No spring overshoot beyond the 1.04 drag lift. The **amber press pulse** (1.6s loop: opacity 0.5↔1 + a sweeping highlight) expresses "the press is working" with no fake progress bar.

**Hover / press / focus states.**
- *Sheet hover:* rises `translateY(-1px)`, shadow → hovered, cursor `grab`, chip brightens.
- *Control hover:* background lightens one substrate step, border → `--sub-400`, no motion.
- *Press/active:* controls deepen to `--press-600` (primary) or `--sub-800`; no shrink except the implicit sheet drop.
- *Focus-visible:* **2px press ring, offset 2px, + 4px press-glow halo at 35%**, on *every* focusable element, never removed. On a paper sheet, a **1px `--sub-900` spacer** sits between sheet and ring so contrast holds against white.
- *Disabled:* `--sub-400` fill, `--ink-500` text, no border, `not-allowed`, opacity 0.6.

**Transparency & blur.** Used sparingly: the page-number chip is a `--sub-900` ~82%-alpha pill with a faint backdrop-blur; the scrim is `rgba(8,10,14,.6)`. No frosted-glass everywhere.

**Cards/panels.** Flat `--sub-800` fill, 1px `--sub-600` hairline, `6px` radius, **no shadow**. A "well" variant is darker (`--sub-700`) with an inner top-shadow to read recessed.

---

## 3. ICONOGRAPHY

No icon set was supplied by the brief. pdf-forge uses a **lightweight, geometric line-icon style** — 24px viewBox, ~2px stroke, round caps/joins — drawn to read as precise tooling (a calibrated instrument, not a playful app). The bundled set lives inline in `ui_kits/workbench/icons.jsx` (`<Icon name size/>`) and is modeled on the **Lucide** geometry (open-source, MIT), which is the recommended CDN match if you need the full set: `https://unpkg.com/lucide-static`. **This is a documented substitution** — if pdf-forge has its own icon set, drop it in and repoint `icons.jsx`.

- Icons are **monochrome ink** (`currentColor`), inheriting the ink ramp; the active rail item tints its icon press-blue.
- A few **glyphs carry meaning**: the rotate **⟳** + degrees in the page chip, the **check** in the selection tab, the **×** dismiss. The brand mark (`assets/logo/mark.svg`) is a geometric lockup of a *lifted sheet + the press-blue insertion bar* — the signature in miniature.
- **No emoji, ever.** No multicolor or filled illustrative icons. Unicode is used only for the rotation degree symbol and arrows in copy.

---

## 4. SIGNATURE

**Pages are physical sheets on a lit workbench, and the press-blue insertion choreography is how you handle them.** On the recessed graphite board, real rendered pages sit as warm-white sheets with crisp 2px corners, a faint bottom-edge thickness, and a soft resting shadow — the only bright-paper objects and the only things that cast a shadow. Hover and a sheet rises 1px; grab it and it **lifts, scales to 1.04, tilts 1.5°**; a single **2px press-blue insertion bar** snaps into the gap as neighbors ease aside; release and it settles. Multi-select washes sheets in a quiet press-blue tint with a corner check-tab. Its companion is the **amber "press at work"** readout (`PressIndicator`) — the one warm moment, reserved for real server jobs. Everything else stays quiet so these two moments define the app.

---

## 5. Index / manifest

**Namespace for `@dsCard` HTML:** `window.PDFForgeDesignSystem_ec4ef3`.
**Consumers link one file:** `styles.css` (a manifest of `@import`s).

**Root**
- `styles.css` — entry point (imports only).
- `tokens/` — `fonts.css` (@font-face: Inter, JetBrains Mono via Fontsource CDN), `colors.css`, `typography.css`, `spacing.css`, `radii.css`, `elevation.css`, `motion.css`, `base.css`.
- `assets/logo/mark.svg` — the brand mark.
- `SKILL.md` — Agent-Skills-compatible entry for downloading this system.

**Foundations** (`guidelines/`, Design System tab — groups Colors / Type / Spacing / Brand): substrate, paper, ink, press, semantics; type families, scale, tabular truth, weights/eyebrows; spacing scale, control sizing, radii; logo, elevation, focus & selection, the signature board, motion & the press.

**Components** (`components/<group>/`, group "Components"; `<Name>.jsx` + `.d.ts` + `.prompt.md`, one `*.card.html` per dir):
- **forms/** — `Button`, `IconButton`, `Input`, `Select`, `Checkbox`, `Radio`/`RadioGroup`, `Switch`, `Slider`.
- **surfaces/** — `Panel`, `Tabs`, `Tag`, `StatusPill`, `SegmentedControl`.
- **feedback/** — `Spinner`, `InlineBanner`, `Toast`/`ToastViewport`, `Tooltip`, `PressIndicator` *(signature companion)*.
- **overlays/** — `Dialog`.
- **board/** — `PageSheet` *(the SIGNATURE)*, `PageChip`, `InsertionBar`.

**UI kit** (`ui_kits/workbench/`, group "Workbench"): `index.html` is the interactive three-zone instrument — rail (op nav, collapsible) · board worksurface (select, rotate, delete, keyboard-roving focus, drag-to-reorder with the insertion bar) · inspector (op options + the press-at-work job readout). Split into `data.js`, `icons.jsx`, `Rail.jsx`, `BoardHeader.jsx`, `Worksurface.jsx`, `Inspector.jsx`, `Workbench.jsx`. Keyboard: `R` rotate, `⌫` delete, `⌘A` select all, `⌘E` export.

**Quality floor (every surface):** responsive to ~375px, visible focus rings, `prefers-reduced-motion` respected, AA contrast. Boldness spent only on the SIGNATURE.

---

## Using a component (in @dsCard HTML)

```html
<link rel="stylesheet" href="../../styles.css">
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<script src="../../_ds_bundle.js"></script>
<script type="text/babel">
  const { Button, PageSheet, PressIndicator } = window.PDFForgeDesignSystem_ec4ef3;
  // …render…
</script>
```
