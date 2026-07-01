# Claude Design prompt — pdf-forge Flow A: "Open / preview a PDF (client render, zero upload)"

## 1. Role + goal
You are designing a single, high-fidelity, on-brand mockup set (a small sequence of frames) for **Flow A of pdf-forge**: opening and previewing a PDF entirely in the browser via pdf.js, with **zero upload** — no server job runs in this flow. pdf-forge is a privacy-first, self-hosted, LAN-only Acrobat alternative — a fast local **document workshop instrument**, NOT a SaaS dashboard. Produce static visual reference frames (desktop + mobile) for the states listed in §4. This is a visual reference only — do not write production code.

---

## 2. Design system to apply (LOCKED — use verbatim)

### Palette
**Substrate (cool graphite workbench — the app surface):**
- `--sub-900 #0E1116` (deepest well / board backdrop) · `--sub-850 #141922` (app bg) · `--sub-800 #1A2029` (panels/toolbars/rail) · `--sub-700 #222A35` (inset wells, board substrate) · `--sub-600 #2D3743` (hairline borders) · `--sub-500 #3A4654` (control borders) · `--sub-400 #566373` (disabled fill)

**Paper (the PDF page — ONLY true whites; only objects that cast shadow):**
- `--paper-0 #FBFBF9` (sheet face / warm paper) · `--paper-edge #E7E7E2` (sheet bottom-edge thickness) · `--paper-shadow #05070A` (sheet shadow color, used at alpha) · ink-on-paper near-black `#11151B`

**Ink (text on substrate; AA-checked):**
- `--ink-900 #F2F5F8` (primary/headings ≈13:1) · `--ink-700 #C5CDD6` (secondary) · `--ink-600 #9AA6B2` (muted meta, min AA ≈4.6:1) · `--ink-500 #6B7785` (disabled/non-essential only)

**Press blue (the ONE accent — selection + primary action):**
- `--press-500 #1FA2C4` · `--press-400 #3FBDDD` (hover) · `--press-600 #157E9B` (pressed) · `--press-tint #12303A` (selected wash) · `--press-glow #1FA2C4` (focus halo @alpha)

**Semantics (rationed; only on state):**
- `--ok-500 #4BAE7E` · `--warn-500 #D6A53C` (advisory-perms, kept-input) · `--err-500 #D9594C` (4xx/5xx, wrong-pw) · `--proc-500 #E08A3C` (running "press" amber — the one warm hue) · `--err-tint #3A1E1C` · `--ok-tint #15302A`
- Contrast intent: body/labels ≥4.5:1, large/chip text ≥3:1, rings/selection ≥3:1 vs both substrate AND paper (ring on paper gets a 1px `--sub-900` spacer to hold contrast).

### Type
- UI/label/heading/body: `Inter, "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (humanist; turn on `font-feature-settings:"tnum" 1,"lnum" 1` for any numeric UI).
- Data/mono (filenames, ranges like `1-10,21-end`, byte sizes, DPI, hashes, passwords-as-dots): `"JetBrains Mono","IBM Plex Mono",ui-monospace,"SF Mono",Consolas,monospace`.
- Scale (px / line-height): `--fs-micro 11/16` (page chips, dense meta) · `--fs-label 12/16` (UI labels; UPPERCASE eyebrows +0.04em) · `--fs-body 13/20` · `--fs-data 13/18` (mono rows) · `--fs-base 14/20` (inputs/controls) · `--fs-h3 16/22` (panel titles) · `--fs-h2 20/26` (screen titles) · `--fs-h1 26/32` (empty-state only).
- Weights: 400 body / 500 labels+controls / 600 headings; 700 only the single empty-state H1. Sentence case (eyebrows UPPERCASE +0.04em `--ink-600`). Mono never UPPERCASE.

### Spacing (base = 4px; instrument-dense)
- `--sp-1 4` · `--sp-2 8` · `--sp-3 12` · `--sp-4 16` · `--sp-5 24` · `--sp-6 32` · `--sp-8 48`.
- Control height: default 32px / compact 28px / primary+mobile 40px; icon-btn 28px box, 16px glyph. Mobile hit-area ≥44×44 (expand padding, not visual size).
- Grid: three-zone workbench — left rail (56px collapsed / 220px open), center worksurface (hero), right inspector (300–340px). <768px inspector→bottom sheet, rail→top bar+drawer; <~768px board→2-up. Single column at 375px, no horizontal scroll. Prose/dialog max 560px; board fluid.

### Radii / borders / elevation
- Radii: `--r-sheet 2` (PAGES — crisp paper corners) · `--r-ctl 4` (inputs/buttons/chips) · `--r-panel 6` (panels/dialogs/board frame) · `--r-pill 999` (status dots/pills only). Rounded-everything banned; nothing >6px except pills.
- Borders: hairline `1px solid --sub-600` between panels; control `1px solid --sub-500`; focus REPLACES border with ring (don't stack); inset wells use inner 1px `--sub-700` + darker fill.
- Elevation: **chrome panels cast ZERO shadow** (separate by value-step + hairline — no card soup). Shadow reserved for PAPER only: resting sheet `0 1px 2px rgba(5,7,10,.45)`; hover `0 2px 6px rgba(5,7,10,.5)`; lifted/drag `0 10px 24px rgba(5,7,10,.6)`. Dialogs: `0 16px 48px rgba(5,7,10,.55)` + scrim `rgba(8,10,14,.6)` — the only chrome allowed to cast.

### The board (page-thumbnail surface)
- Substrate: inset well, fill `--sub-700`, `inset 0 1px 0 rgba(5,7,10,.5)`, `--r-panel`; optional faint 24px cutting-mat dot grid (`--sub-600` ~8%, atmospheric only, off w/ reduced-data).
- Sheet: honor each page's TRUE aspect (default ISO ~1:1.414; landscape stays landscape — never force square). Widths: compact 96 / comfortable 132 / large 180px (board zoom slider); mobile 2-up fluid. Face `--paper-0`, `--r-sheet` 2px, bottom 2px `--paper-edge`, resting shadow, pdf.js render fills face. Gaps: `--sp-3` comfortable / `--sp-2` compact; sheets flow/wrap like dealt cards (not rigid grid).
- Page-number chip: bottom-left overlapping edge 2px; `--fs-micro` mono, `--ink-900` on `--sub-900` 80% pill (`--r-pill`), tabular figures; rotated pages add ⟳+`90°`.
- Scale: 10 pages = comfortable/large, breathes; 500 pages = VIRTUALIZED rows (only visible sheets mount, lazy pdf.js render with blank `--paper-0` placeholder + faint center spinner), compact 96px/8px gap, right-edge mini-scrollbar w/ page ticks + pinned `page N of M` (tabular). Persistent board header (`--sub-800`, hairline bottom): doc name (mono), `M pages` (tabular), zoom, select-all, Export/▶.

### Interaction states
- Hover sheet: shadow→hover, `translateY(-1px)`, 120ms, cursor `grab`, chip→`--ink-900`. Hover control: bg +1 substrate step, border→`--sub-400`, no motion.
- Selected single: inset 2px `--press-500` border + `--press-tint` 6% wash behind + press-blue check tab top-right. Multi: same per-sheet + header `"N selected"` (tabular) bulk actions; Shift range-select draws press-tint marquee.
- Focus-visible: 2px `--press-500` ring, offset 2px, + 4px `--press-glow` halo @35%; on paper insert 1px `--sub-900` spacer. NEVER `outline:none` without replacement. Board uses roving tabindex (arrow keys) — focused sheet gets ring + subtle lift.
- Drag lifted page: scale 1.04, lifted shadow, tilt 1.5°, opacity .96, cursor `grabbing`; origin slot = dashed `--sub-500` ghost. Drop-gap: 2px `--press-500` vertical insertion bar w/ end-caps snapping into the gap, neighbors ease aside 180ms (@dnd-kit). (NOTE: in Flow A no drag commits anything — see §3.)
- Disabled: `--sub-400` fill, `--ink-500` text, no border, opacity .6, `not-allowed`. Processing: amber `--proc-500` indeterminate (spinner not progress bar — `progress` may be null). Error: banner `--err-tint` fill + 3px `--err-500` left-border + mono `code` (e.g. `bad_pdf_structure`); 422 wrong-pw = `--err-500` field border + shake (none under reduced-motion). Success: `--ok-500` check + `--ok-tint` toast + left `--ok-500` rule on artifact row.

### Motion
- Durations: `--mo-fast 120ms` (hover/focus/control) · `--mo-base 180ms` (sheet lift/drop, gap reflow, panel open) · `--mo-slow 240ms` (dialog/scrim, bottom-sheet).
- Easing: `--ease-out cubic-bezier(.2,.7,.3,1)` · `--ease-inout cubic-bezier(.4,0,.2,1)` · `--ease-press cubic-bezier(.3,0,.1,1)`. No spring overshoot beyond the 1.04 lift. Processing pulse: 1.6s ease-press loop (opacity .5↔1 + sweeping highlight) = "the press is working", no fake progress bar.
- **prefers-reduced-motion: reduce** → all transitions ≤0ms or single opacity crossfade; drag = NO tilt/scale, only instant insertion bar; processing = static amber readout + cycling `working…` text (no spin); error shake off (color only); focus rings STILL render (state, not motion).

### SIGNATURE ELEMENT (honor it; spend boldness ONLY here)
Pages are physical paper sheets on a lit, recessed cool-graphite workbench — the ONLY bright warm-white objects in the app and the only things that cast a shadow (crisp 2px corners, a faint bottom-edge thickness, a soft resting shadow). Handling them is the personality: hover lifts a sheet 1px; grabbing it scales to 1.04 and tilts 1.5° like a page peeled off a stack; a single 2px press-blue insertion bar snaps into the gap where it will land while neighbors ease aside; release settles with a short decelerating drop. Its companion accent — used only when a heavy server job runs — is the "press at work" treatment: the worksurface dims and a warm amber (`--proc-500`) sweep pulses across the job readout, resolving to a green check or a red machine-code banner. Everything else is quiet graphite + ink, so lifting a sheet and the amber press are the two moments pdf-forge is remembered by. **In Flow A the bold moment is the sheets themselves rendering onto the lit board — the amber press does NOT appear here (no server job).**

---

## 3. Screen / flow brief
Flow A is a single screen — the three-zone workbench — observed across states. Goal: view and navigate a PDF entirely in the browser, **uploading nothing**.

Operator path:
1. Operator lands on an empty workbench → drops or opens a local PDF.
2. The SPA reads bytes into the in-memory page model (no network). The board immediately lays out blank `--paper-0` sheet placeholders at the document's true page count and TRUE aspect, each with a faint center spinner; the board header populates instantly with the doc name (mono) and `M pages` (tabular).
3. pdf.js fills the sheet faces lazily. Operator scrolls/zooms/navigates; a single sheet can open into a large single-page view with zoom/scroll.
4. Selection is **live** so the operator can flow straight into Flow B (organize/export) without a mode switch — clicking selects a sheet; the board has a zoom slider, select-all, and an **Export ▶** button (the gateway to Flow B). No drag commits anything in Flow A.

Layout intent:
- **Left rail** (56px collapsed / 220px open): quiet op list (the server ops live here as future destinations — keep them muted/instrumental, not loud). pdf-forge wordmark at top.
- **Center worksurface (hero):** the recessed board well holding the paper sheets. This is where all boldness is spent.
- **Persistent board header** above the well (`--sub-800`, hairline bottom): doc name (mono) · `M pages` (tabular) · zoom slider (compact/comfortable/large) · Select all · **Export ▶**.
- **Right inspector** (300–340px): read-only document facts for the open PDF (filename, page count, dimensions, a privacy reassurance line). On <768px the inspector becomes a bottom sheet and the rail collapses to a top bar + drawer.

---

## 4. States to render (each as a distinct, labelled frame)
Render every state below as its own frame. Provide a desktop (~1280px) frame for each, plus at minimum a mobile (~375px) frame for **Empty** and **Success**.

1. **Empty** — recessed graphite board well + faint 24px cutting-mat dot grid (note it disappears under reduced-data). Centered bold empty-state H1 (`--fs-h1`, weight 700, `--ink-900`): **"Drop a PDF to open it"** over a dashed `--sub-500` drop target spanning the board. Privacy micro-label beneath in `--ink-600`: **"Stays on this device — nothing uploaded"**. Left rail shows the quiet op list. Board header is empty/disabled (no doc yet).

2. **Drop-active** — same frame but mid-drop: the dashed drop target lights to a 2px `--press-500` border with a faint `--press-tint` wash, signalling a valid drop. No upload language anywhere.

3. **Loading (client render, NOT a server job)** — on drop the board instantly lays out blank `--paper-0` sheet placeholders at the document's true page count and TRUE aspect (mix ISO portrait + one landscape), each with a faint center spinner; some faces already filled by pdf.js, others still blank (lazy). Board header already populated with doc name (mono) + `M pages` (tabular). This is the local-render loading treatment — quiet, no amber.

4. **Success (default board)** — ~10–14 sheets rendered, comfortable 132px width, breathing, dealt-card wrap. Page-number chips bottom-left. Board header fully active (zoom slider, select-all, Export ▶). Right inspector shows document facts.

5. **Success — single-sheet page view** — one sheet opened into the large centered page view with zoom controls and scroll; thumbnails remain as a strip/rail for navigation.

6. **Success — 500-page virtualized board** — compact 96px sheets, 8px gap, only visible rows mounted (some blank `--paper-0` placeholders with faint center spinner), right-edge mini-scrollbar with page ticks and a pinned **`page N of M`** readout (tabular).

7. **Live selection (single)** — a sheet selected: inset 2px `--press-500` border + `--press-tint` 6% wash + press-blue check tab top-right. Board header shows nothing-yet/Export ▶ enabled.

8. **Live selection (multi)** — several sheets selected via Shift range (press-tint marquee implied), each with the selected treatment; board header shows **`"3 selected"`** (tabular) and the Export ▶ gateway emphasized (entry to Flow B).

9. **Keyboard focus** — a sheet focused via roving tabindex/arrow keys: 2px `--press-500` ring, offset 2px, 4px `--press-glow` halo @35%, with the 1px `--sub-900` spacer between ring and paper. Show the focus ring on a control too.

10. **Error (local open failure — never uploads)** — a quiet inline note (NOT the loud server error banner, since no job ran): **"That file didn't open as a PDF. It never left your device."** Use a restrained `--err-500` accent (e.g. a thin left rule or small icon) but keep it calm; the board stays in its empty/recessed state behind it. You may show a small mono code hint (`bad_pdf_structure` / `not_a_pdf`) styled muted, to reflect the underlying envelope, without implying a network round-trip.

11. **In-progress / 202+poll — N/A in Flow A (do not fabricate).** Flow A runs NO server job and uploads NOTHING, so the amber "press at work" indeterminate-poll treatment does not appear here. Render a small annotation frame stating this and pointing to Flow C/D for that treatment — do NOT invent an upload, progress, or amber sweep on this screen. (This protects the privacy non-negotiable: client preview uploads nothing.)

---

## 5. Real data to show (use these exact shapes/values; mono token for all data)
Flow A touches NO endpoint (preview/thumbnails #14 is client-only; there is no public preview/thumbnail HTTP endpoint). Use these concrete values so the mockup reflects real data, not placeholder text:

- **Document facts (right inspector), mono + tabular:**
  - filename: `quarterly-report-2026.pdf`
  - pages: `14 pages`
  - page size: `210 × 297 mm` (ISO A4) with one landscape page noted `297 × 210 mm`
  - file size: `5,242,880 bytes` (`≈ 5.0 MB`) — tabular figures
  - opened: `local · not uploaded`
- **Virtualized-board frame:** doc name `book-scan-500.pdf`, header `500 pages`, pinned readout `page 248 of 500` (tabular).
- **Page-range strings** anywhere ranges are illustrated (e.g. a future export hint): mono `1-10, 11-20, 21-end`.
- **Selection counts:** `3 selected` (tabular).
- **Underlying error envelope this flow's local failure mirrors** (show the `code` as a muted mono hint only; no HTTP chrome, because nothing was sent):
  ```json
  {
    "error": {
      "code": "bad_pdf_structure",
      "message": "That file didn't open as a PDF.",
      "status": 400
    }
  }
  ```
  Relevant local-open failure codes for this flow: `not_a_pdf` (415), `bad_pdf_structure` (400). The user-facing voice is always: **"That file didn't open as a PDF. It never left your device."**
- **Do NOT** render a job descriptor, `state`, `progress`, `artifacts[]`, `Location` header, poll spinner, or download button on the Flow A screen — those belong to Flows C/D and would misrepresent this zero-upload flow.

---

## 6. Quality floor (mandatory, every frame)
- **Responsive to ~375px:** three-zone workbench on desktop; below ~768px the board goes 2-up, inspector → bottom sheet, rail → top bar + drawer; single column at 375px with **no horizontal scroll**. Mobile primary controls 40px tall, hit-area ≥44×44.
- **Visible keyboard focus:** every interactive element shows the `:focus-visible` ring (2px `--press-500`, offset 2px, 4px `--press-glow` halo @35%); on paper add the 1px `--sub-900` spacer. Never `outline:none` without a replacement.
- **prefers-reduced-motion: reduce:** no sheet hover/lift motion, no spinners-as-motion (cycling `working…` text instead), no error shake — but **focus rings and all state colors still render**.
- **Contrast (AA):** body/labels ≥4.5:1, large/chip text ≥3:1, selection/focus rings ≥3:1 against BOTH substrate and paper.
- **Quiet everywhere except the signature element:** the only bold, warm, shadow-casting objects are the paper sheets on the lit board. Chrome panels cast zero shadow and separate by value-step + hairline. No card soup, nothing rounded >6px (except pills). No amber press in this flow.

---

## 7. Deliverable / hand-back
Return:
1. **The labelled frames** from §4 (desktop for all; mobile ~375px for at least Empty + Success), each clearly titled with its state name.
2. A short **component inventory** — left rail + op list, board header (doc name / page count / zoom slider / select-all / Export ▶), board well, paper sheet (face + bottom edge + resting shadow + page-number chip + selected/focus/hover variants), inspector facts panel / mobile bottom sheet, drop target (idle + active), inline local-open error note, virtualized mini-scrollbar with page ticks.
3. **Interaction notes** — selection (single/multi/roving-tabindex), hover lift, zoom-slider density steps (96 / 132 / 180px), virtualization behavior at 500 pages, the reduced-motion fallbacks, and an explicit note that **no drag commits anything in Flow A** and **nothing uploads**.

Do NOT: write production application code (this is a visual reference, not the shipped app); invent a server job, upload progress, poll/amber-press treatment, or any `/api` call on this screen; add features outside Flow A (no organize/export mechanics beyond surfacing the Export ▶ gateway; no crypto, OCR, compress, etc.). Keep all boldness on the paper sheets; keep all chrome quiet graphite + ink.
