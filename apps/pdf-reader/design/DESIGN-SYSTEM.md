# pdf-forge — Design System (v1)

> The visual foundation for pdf-forge: a privacy-first, self-hosted **document workshop** — an instrument an operator drives with keyboard and mouse on a LAN. Not a SaaS dashboard. Every token below is justified against the subject: **paper, pages, ink, and a fast local tool.**
>
> **One rule above all:** spend boldness in exactly one place — *the board where pages live as physical sheets* (the SIGNATURE). Everything else is quiet, dense, and instrumental.

---

## 0. Design thesis

pdf-forge is a **workbench**, not a feed. The screen is a *worksurface* with documents on it, surrounded by tooling. So the visual language is:

- **Substrate vs. sheet.** The app background is a cool graphite *substrate* (a workbench surface). The only thing that is bright paper-white is an actual PDF page. White means "this is a document." Nothing else earns white. This single inversion separates pdf-forge from every white-card SaaS app and makes pages physically present.
- **Ink, not color.** UI text/iconography is an ink ramp. Color is rationed: ONE accent (a saturated cyan-forward blue, "press blue") carries selection + primary action; semantics (success/warn/error/processing) appear only on state.
- **Tabular truth.** This tool reports page counts, byte sizes, DPI, ranges, passwords. Numbers must align and never wobble — tabular figures everywhere a quantity appears.
- **Dense and keyboardable.** Instrument density: a 4px base unit, compact controls (32px default), generous *hit* targets but tight *visual* rhythm. Visible focus rings are a feature, not an afterthought — this app is driven by keyboard.

---

## 1. Palette

A restrained instrument palette: a cool graphite **substrate** ramp, a near-black **ink** ramp, ONE confident **accent**, and four rationed **semantics**. No indigo-on-white, no gradient hero, no candy.

### 1.1 Substrate (the workbench surface) — cool neutral, slightly blue-cool not warm-gray
Justification: a *cool* graphite reads as tool/metal/desk and makes warm-white paper pop; warm beige would muddy the "this is paper" signal.

| Token | Hex | Use |
|---|---|---|
| `--sub-900` | `#0E1116` | App chrome backdrop / deepest well (board behind sheets) |
| `--sub-850` | `#141922` | App background (default page bg) |
| `--sub-800` | `#1A2029` | Raised panels, sidebars, toolbars |
| `--sub-700` | `#222A35` | Inset wells, board substrate behind thumbnails |
| `--sub-600` | `#2D3743` | Hairline borders / dividers on dark |
| `--sub-500` | `#3A4654` | Stronger borders, control outlines |
| `--sub-400` | `#566373` | Disabled fill, muted chrome |

### 1.2 Paper (the document itself — the ONLY true whites)
Justification: real PDF pages render on this; a faint warm-neutral white (not pure `#FFF`) reads as physical stock and is gentler under long use.

| Token | Hex | Use |
|---|---|---|
| `--paper-0` | `#FBFBF9` | PDF page surface / sheet face (warm paper white) |
| `--paper-edge` | `#E7E7E2` | Sheet edge / page bottom-edge shade (gives a sheet thickness) |
| `--paper-shadow` | `#05070A` | Drop-shadow color for lifted sheets (used at low alpha) |

### 1.3 Ink (foreground on substrate)
Justification: text on the dark workbench is an *ink* ramp from crisp to faint — not gray-on-gray mush. Targets WCAG: `--ink-900` on `--sub-850` ≈ 13:1; `--ink-600` (muted) ≈ 4.6:1 (AA body); never go below `--ink-500` for text.

| Token | Hex | Use |
|---|---|---|
| `--ink-900` | `#F2F5F8` | Primary text, headings |
| `--ink-700` | `#C5CDD6` | Secondary text, active labels |
| `--ink-600` | `#9AA6B2` | Muted labels, metadata (min AA on `--sub-850`) |
| `--ink-500` | `#6B7785` | Disabled text, faint hints (non-essential only) |

> Ink-on-paper (text rendered *inside* dark UI that sits on a sheet, e.g. page-number chip) uses `#11151B` as near-black ink.

### 1.4 Accent — "Press blue" (the ONE action/selection color)
Justification: a single saturated **cyan-forward blue** evokes a calibrated press/plate machine and stays distinct from the cool-gray substrate. Not generic indigo `#6366F1`; this is cooler, more confident, more "instrument readout."

| Token | Hex | Use |
|---|---|---|
| `--press-500` | `#1FA2C4` | Primary accent: selection ring, primary button, focus accent |
| `--press-400` | `#3FBDDD` | Hover/active brighten |
| `--press-600` | `#157E9B` | Pressed/depressed state |
| `--press-tint` | `#12303A` | Selected-page fill tint on substrate (low-sat wash) |
| `--press-glow` | `#1FA2C4` | Used at alpha for focus-ring halo (see §6) |

### 1.5 Semantics (rationed; appear only on state)
Justification: muted, desaturated semantics so a green/red never competes with paper or press-blue; processing gets its own **amber** because a long server job is the app's most distinctive moment.

| Token | Hex | Use |
|---|---|---|
| `--ok-500` | `#4BAe7E` | Success: job succeeded, validation pass |
| `--warn-500` | `#D6A53C` | Warning: advisory-permissions disclaimer, "kept input" |
| `--err-500` | `#D9594C` | Error: 4xx/5xx, wrong password, bad_pdf_structure |
| `--proc-500` | `#E08A3C` | Processing: running job pulse, "the press is working" (warm amber, deliberately the one warm hue) |
| `--err-tint` | `#3A1E1C` | Error inline-banner fill |
| `--ok-tint` | `#15302A` | Success inline-banner fill |

**Contrast intent (stated):** body/label text meets WCAG AA (≥4.5:1) on its background; large headings & chip text meet ≥3:1; focus rings and selection borders meet ≥3:1 against both substrate and paper (the press-blue ring is tested on `--sub-850` ≈ 3.6:1 and on `--paper-0` ≈ 3.1:1 — so the ring always carries a 1px dark spacer when on paper, see §6).

---

## 2. Typography

A two-face pairing, role-mapped. Justification: a **humanist grotesque** for UI (legible, neutral-but-warm, excellent at small sizes — the operator reads labels all day) paired with a **monospace with true tabular figures** for every machine quantity (filenames, page ranges like `1-10,21-end`, byte sizes, DPI, passwords-as-dots). The mono *is* the data voice of an instrument; numbers in ranges and sizes must align column-true.

### 2.1 Families
| Role | Family (stack) | Why |
|---|---|---|
| UI / label / heading / body | **Inter** → `Inter, "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Humanist, tall x-height, superb at 12–14px; tabular figures available via `font-feature-settings: "tnum" 1` |
| Data / mono (filenames, ranges, sizes, hashes, code) | **JetBrains Mono** → `"JetBrains Mono", "IBM Plex Mono", ui-monospace, "SF Mono", Consolas, monospace` | Unambiguous `0/O`, `1/l`; tabular by nature; reads as "machine truth" |

> Numeric UI (page counts, job %, DPI shown in chrome) uses Inter **with `tnum` + `lnum` on**, so digits don't wobble when a count ticks 9→10→100.

### 2.2 Modular scale (concrete px; ratio ~1.20 minor-third, tightened for density)
| Token | px / line-height | Role |
|---|---|---|
| `--fs-micro` | 11 / 16 | Page-number chips, dense metadata, table captions |
| `--fs-label` | 12 / 16 | UI labels, control text, tab labels (UPPERCASE labels use +0.04em tracking) |
| `--fs-body` | 13 / 20 | Default body, descriptions, dialog copy |
| `--fs-data` | 13 / 18 | Mono data rows (filenames, ranges) — line-height tuned for mono |
| `--fs-base` | 14 / 20 | Inputs, primary controls |
| `--fs-h3` | 16 / 22 | Panel titles, op names |
| `--fs-h2` | 20 / 26 | Flow/screen titles |
| `--fs-h1` | 26 / 32 | App-level / empty-state headline (used sparingly) |

### 2.3 Weights & treatment
- Inter: 400 body, 500 labels/controls, 600 headings. No 700+ except the single empty-state H1.
- **UI labels are sentence case**, except *section eyebrows* which are 12px UPPERCASE +0.04em `--ink-600` (instrument-panel labeling).
- Mono is always 400/500; mono never goes UPPERCASE.

---

## 3. Spacing & layout

Instrument density: **base unit = 4px.** Denser than SaaS (which trends 8px). Controls are compact; whitespace is earned, not sprayed.

### 3.1 Spacing scale
| Token | px | Typical use |
|---|---|---|
| `--sp-1` | 4 | Icon-to-label gap, chip padding |
| `--sp-2` | 8 | Control inner padding, tight stacks |
| `--sp-3` | 12 | Default gap between related controls |
| `--sp-4` | 16 | Panel padding, group separation |
| `--sp-5` | 24 | Section separation |
| `--sp-6` | 32 | Major region separation |
| `--sp-8` | 48 | Page margins on desktop (board outer gutter) |

### 3.2 Control sizing (density target)
- Default control height **32px**; compact **28px**; touch/primary **40px** (mobile bumps defaults to 40px min for hit-area).
- Min touch target on mobile (~375px) ≥ 44×44px even when the visual control is 32px (expand hit-area with padding, not visual size).
- Icon button **28px** box / 16px glyph.

### 3.3 Layout / grid intent
- **Three-zone workbench:** left **rail** (op/flow nav, collapsible, 56px collapsed / 220px open) · center **worksurface** (the board / preview / job panel) · right **inspector** (op options, job status, properties; 300–340px, collapses to a bottom sheet < 768px).
- Worksurface is the hero; rail and inspector are quiet `--sub-800`.
- **Mobile (~375px):** single column. Rail becomes a top bar + drawer; inspector becomes a bottom sheet; the board reflows to a 2-up thumbnail grid. No horizontal scroll, ever.
- Content max-width for prose/dialogs: 560px. The board itself is fluid.

---

## 4. Radii, borders, elevation

Opinionated and quiet. Justification: a workshop is built of flat machined panels and **square-edged paper**, not pillowy cards. Separation comes from **value steps + 1px hairlines**, not shadow soup.

### 4.1 Radii (small; paper is NOT rounded)
| Token | px | Use |
|---|---|---|
| `--r-sheet` | 2 | **Page sheets** — barely rounded; paper has crisp corners |
| `--r-ctl` | 4 | Inputs, buttons, chips |
| `--r-panel` | 6 | Panels, dialogs, the board frame |
| `--r-pill` | 999 | Status dots/pills only |

> Rounded-everything is banned. Sheets at 2px keep their *paper* identity; nothing exceeds 6px except true pills.

### 4.2 Borders
- Hairline `1px solid --sub-600` separates panels on the dark substrate (value-step does most of the work; the hairline just crisps the edge).
- Control border `1px solid --sub-500`; on focus the border is replaced by the press ring (§6), not stacked.
- Inset wells (the board) use an *inner* 1px `--sub-700` + slightly darker fill to read as recessed.

### 4.3 Elevation (almost no shadow on chrome)
- **Chrome panels: zero drop shadow.** They separate by value + hairline only. This kills "card soup."
- **Shadow is reserved for paper.** Only sheets cast shadows, because only paper is a physical object on the workbench:
  - Resting sheet: `0 1px 2px rgba(5,7,10,.45)`
  - Hovered sheet: `0 2px 6px rgba(5,7,10,.5)`
  - **Lifted (dragging) sheet:** `0 10px 24px rgba(5,7,10,.6)` + scale (§5).
- Dialogs/modals: a single `0 16px 48px rgba(5,7,10,.55)` + a scrim `rgba(8,10,14,.6)`. That is the only chrome that may cast.

---

## 5. The page-thumbnail "board" (the core surface)

This is the heart of the app and the home of the SIGNATURE. Justification: pages must read as **paper sheets resting on a workbench**, not as data cells in a grid.

### 5.1 The substrate
- The board sits in an **inset well**: fill `--sub-700`, inner top-shadow `inset 0 1px 0 rgba(5,7,10,.5)`, radius `--r-panel`. This recession says "lay your pages here."
- Optional 24px faint grid dotting (`--sub-600` at ~8% alpha) — a *cutting-mat* texture, off by reduced-data preference; purely atmospheric, never load-bearing.

### 5.2 The sheet (thumbnail card)
- **Aspect:** preserves the real page aspect (default ISO ~1:1.414 portrait; honor each page's true ratio — a landscape page is a landscape sheet). Never force a square.
- **Default sheet width:** 132px (desktop) → thumbnail canvas rendered by pdf.js to fit. Sizes: compact 96px, comfortable 132px, large 180px (a board zoom slider). Mobile: 2-up, fluid width.
- **Surface:** `--paper-0` face, `--r-sheet` (2px) corners, bottom 2px `--paper-edge` shade to fake sheet thickness, resting shadow (§4.3). A real rendered page thumbnail fills the face.
- **Gap:** `--sp-3` (12px) at comfortable; `--sp-2` (8px) compact. Sheets sit in a *flow*, not a rigid grid — wrapping rows like dealt cards.
- **Page-number chip:** bottom-left, overlapping the sheet edge by 2px; `--fs-micro` mono on a `--sub-900` 80%-alpha pill (`--r-pill`), `--ink-900` text. Tabular figures so `9`→`10`→`100` don't shift. Rotated pages show a small ⟳ glyph + degrees (`90°`) in the chip.
- **Selection/state badges** (deleted = strikethrough overlay + `--err-500` corner tab; rotated = chip glyph) ride on the sheet, never in separate UI.

### 5.3 Reading at scale (10 vs 500 pages)
- **10 pages:** generous comfortable size (132–180px), full board breathes, every chip legible. Feels like spreading documents on a desk.
- **~50–100:** auto-step to comfortable/compact; sticky section headers if multi-doc.
- **500 pages:** **virtualized** rows (only visible sheets mount; pdf.js renders thumbnails lazily with a low-res placeholder = a blank `--paper-0` sheet with a faint center spinner until rendered). Compact 96px, 8px gap. A right-edge **mini-scrollbar with page ticks** + a "page N of M" tabular readout pinned to the board header. The board stays smooth; never render 500 canvases at once.
- A persistent board header strip (`--sub-800`, hairline bottom) carries: doc name (mono), `M pages` (tabular), zoom slider, select-all, and the Export/▶ action.

---

## 6. Interaction states (exact specs)

Keyboard-first: focus is always visible. The press-blue ring is the through-line.

| State | Spec |
|---|---|
| **Hover (sheet)** | Sheet rises: shadow → hovered (§4.3), `translateY(-1px)`, 120ms. Cursor `grab`. Chip brightens to `--ink-900`. |
| **Hover (control)** | Bg lightens one substrate step (`--sub-800`→`--sub-700`); border → `--sub-400`. No motion. |
| **Selected — single** | Sheet gets a **2px `--press-500` border** inset (replaces edge), a `--press-tint` 6% wash over the substrate behind it, and a filled press-blue check tab top-right. |
| **Selected — multi** | Same per-sheet treatment; a count badge `“3 selected”` (`--fs-label`, tabular) appears in the board header with bulk actions (rotate/delete/export). Range-select (Shift) draws a faint press-tint marquee. |
| **Focus-visible** | **2px `--press-500` ring offset 2px**, plus a 4px `--press-glow` halo at 35% alpha. On paper sheets, insert a 1px `--sub-900` spacer between sheet and ring so contrast holds (§1.5). Applies to every focusable element. Never removed, never `outline:none` without replacement. Keyboard focus on the board moves a roving tabindex sheet-to-sheet (arrow keys), with the focused sheet getting ring + subtle lift. |
| **Drag — lifted page** | The grabbed sheet scales to **1.04**, gains the lifted shadow (§4.3), tilts **1.5°** (a sheet picked off the pile), opacity 0.96, cursor `grabbing`. Original slot leaves a dashed `--sub-500` ghost outline. |
| **Drag — drop-gap indicator** | A **2px `--press-500` vertical "insertion bar"** with small end-caps appears in the gap where the sheet will land, animating its position as you move (`@dnd-kit`). Neighboring sheets ease aside by the gap width (180ms). This bar is the single clearest "where it goes" signal. |
| **Disabled** | `--sub-400` fill, `--ink-500` text, no border, `cursor:not-allowed`, opacity 0.6. No hover/focus response. |
| **Processing (control/job)** | See §7 + SIGNATURE: the amber `--proc-500` pulse. A running job button shows an inline amber indeterminate bar; the result area shows the "press at work" treatment. Spinner (not progress bar) per API (`progress` may be null). |
| **Error state** | Inline banner: `--err-tint` fill, 1px `--err-500` left-border (3px), `--err-500` icon, `--ink-900` text + machine `code` in mono (e.g. `bad_pdf_structure`). Wrong-password (422) highlights the password field border `--err-500` + shake (reduced-motion: no shake, just color). |
| **Success** | Brief `--ok-500` check + `--ok-tint` toast; downloaded artifact row gets a left `--ok-500` rule. |

---

## 7. Motion

Purposeful, short, mechanical. Justification: an instrument responds *crisply* — motion confirms a mechanical action (a sheet lifts, a press engages), it never decorates.

### 7.1 Durations & easing
| Token | Value | Use |
|---|---|---|
| `--mo-fast` | 120ms | Hover, focus ring, control state |
| `--mo-base` | 180ms | Sheet lift/drop, gap reflow, panel/sheet open |
| `--mo-slow` | 240ms | Dialog/scrim, bottom-sheet slide |
| `--ease-out` | `cubic-bezier(.2,.7,.3,1)` | Most entrances/positional (decelerate) |
| `--ease-inout` | `cubic-bezier(.4,0,.2,1)` | Reversible state |
| `--ease-press` | `cubic-bezier(.3,0,.1,1)` | The processing pulse (mechanical) |

- Drag reflow snaps with `--mo-base`/`--ease-out`. No spring overshoot beyond the 1.04 lift.
- The processing amber pulse: 1.6s ease-press loop (opacity 0.5↔1 on the readout + a sweeping highlight bar), expressing "the press is working" without a fake progress bar.

### 7.2 prefers-reduced-motion (explicit fallback)
When `(prefers-reduced-motion: reduce)`:
- All transitions/animations drop to **0ms or ≤ 1 opacity crossfade**.
- The drag lift = **no tilt, no scale**; only the drop-gap insertion bar (instant position) communicates placement.
- The processing pulse = **static amber readout** with a small rotating-free indeterminate dot replaced by cycling text `working…` (no spin), or a single non-animated amber state + a quiet "running" label.
- Error shake disabled (color-only).
- Focus rings still render (they are state, not motion).

---

## 8. The SIGNATURE element

**Pages are physical sheets on a lit workbench, and the press-blue insertion choreography is how you handle them.**

The one bold, memorable thing: the **board**. On a recessed cool-graphite substrate, real rendered PDF pages sit as **warm-white sheets with crisp 2px corners, a faint bottom-edge thickness, and a soft resting shadow** — the only objects in the entire app that are bright paper and the only things that cast a shadow. They are clearly *things on a surface*, not cells in a table.

Handling them is choreographed: hover and a sheet **rises 1px**; grab it and it **lifts, scales to 1.04, and tilts 1.5°** like a page peeled off a stack; as you move, a single **2px press-blue insertion bar** snaps into the gap where it will land while neighbors **ease aside**; release and it **settles** with a short decelerating drop. Multi-select washes chosen sheets in a quiet press-blue tint with a corner check-tab. This sheet-handling is the entire personality of pdf-forge — tactile, precise, paper-real.

Its companion accent (used only when a heavy server job runs) is the **"press at work"** treatment: the worksurface dims a touch and a warm **amber `--proc-500` sweep** pulses across the job readout — the instrument visibly *pressing* the document — resolving to a green check (success) or a red machine-code banner (failure). Because everything else in the app is deliberately quiet graphite + ink, these two moments — **lifting a sheet** and **the amber press** — are what pdf-forge is remembered by. No other element competes.

---

*This document is the visual gate. Downstream per-flow (A–F) prompts embed §1–§7 verbatim and must honor the QUALITY FLOOR: responsive to ~375px, visible focus rings, prefers-reduced-motion respected, AA contrast. Boldness is spent only on the SIGNATURE.*
