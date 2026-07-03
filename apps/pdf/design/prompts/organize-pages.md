# Claude Design prompt — pdf-forge flow B: "Organize pages then export via finalize"

## 1. Role + goal
You are a senior product designer. Produce a **high-fidelity, on-brand visual mockup** (a small set of desktop + mobile frames) for ONE flow of **pdf-forge** — a privacy-first, self-hosted Acrobat alternative that runs as a single hardened container on a homelab LAN. This flow is **"Organize pages then export via finalize"**: the operator reorders / rotates / deletes pages (and does small in-browser merge/split) on a board of page-thumbnails, then clicks **Export** to commit a durable, linearized PDF via a real server job. This is the product's **signature flow** — the page-handling and the "press at work" job moment are the two things pdf-forge is remembered by. Output a visual reference only — **NOT production code**.

pdf-forge is an **instrument** — a fast local document workshop — NOT a generic SaaS dashboard. Single operator, on a LAN, usually desktop but must survive mobile (~375px). All page edits happen **client-side with zero upload**; bytes only leave the browser at the Export/finalize step.

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
- Drag lifted page: scale 1.04, lifted shadow, tilt 1.5°, opacity .96, cursor `grabbing`; origin slot = dashed `--sub-500` ghost. Drop-gap: 2px `--press-500` vertical insertion bar w/ end-caps snapping into the gap, neighbors ease aside 180ms (@dnd-kit).
- Disabled: `--sub-400` fill, `--ink-500` text, no border, opacity .6, `not-allowed`. Processing: amber `--proc-500` indeterminate (spinner not progress bar — `progress` may be null). Error: banner `--err-tint` fill + 3px `--err-500` left-border + mono `code` (e.g. `bad_pdf_structure`); 422 wrong-pw = `--err-500` field border + shake (none under reduced-motion). Success: `--ok-500` check + `--ok-tint` toast + left `--ok-500` rule on artifact row.

### Motion
- Durations: `--mo-fast 120ms` (hover/focus/control) · `--mo-base 180ms` (sheet lift/drop, gap reflow, panel open) · `--mo-slow 240ms` (dialog/scrim, bottom-sheet).
- Easing: `--ease-out cubic-bezier(.2,.7,.3,1)` · `--ease-inout cubic-bezier(.4,0,.2,1)` · `--ease-press cubic-bezier(.3,0,.1,1)`. No spring overshoot beyond the 1.04 lift. Processing pulse: 1.6s ease-press loop (opacity .5↔1 + sweeping highlight) = "the press is working", no fake progress bar.
- **prefers-reduced-motion: reduce** → all transitions ≤0ms or single opacity crossfade; drag = NO tilt/scale, only instant insertion bar; processing = static amber readout + cycling `working…` text (no spin); error shake off (color only); focus rings STILL render (state, not motion).

### SIGNATURE ELEMENT (honor it; spend boldness ONLY here)
Pages are **physical paper sheets on a lit, recessed cool-graphite workbench** — the ONLY bright warm-white objects in the app and the only things that cast a shadow (crisp 2px corners, a faint bottom-edge thickness, a soft resting shadow). Handling them is the personality: hover lifts a sheet 1px; grabbing it scales to 1.04 and tilts 1.5° like a page peeled off a stack; a single 2px press-blue insertion bar snaps into the gap where it will land while neighbors ease aside; release settles with a short decelerating drop. Its companion accent — used only when the **finalize** server job runs — is the **"press at work"** treatment: the worksurface dims (scrim `rgba(8,10,14,.6)`) and a warm amber (`--proc-500`) sweep pulses across the centered job-readout card on a 1.6s `--ease-press` loop like an instrument pressing the document, resolving to a green check or a red machine-code banner. **Everything else is quiet graphite + ink.** Lifting a sheet and the amber press are the two memorable moments — do not add decorative flourish anywhere else.

---

## 3. Screen / flow brief

**The operator's path (flow B):**
1. A PDF is already open (inherited from flow A). The **board** fills the center worksurface as a recessed graphite well of paper sheets (page thumbnails), in document order.
2. Operator **reorders** (drag a sheet to a new slot), **rotates** (R = 90° CW, Shift+R = CCW), and **deletes** pages — all instant, in-memory, **zero upload, no spinner**. They may also **Combine files** (small in-browser merge, files < 150 MB) via a multi-drop zone, or split a selection out.
3. Each edit appends to an **operation log**; the board header reads `N edits · Undo` and the primary button reads **`Export N edits ▶`** to make the commit point explicit.
4. Operator clicks **Export** → pdf-lib `save()` runs in a **Web Worker** (client indicator: `Assembling pages…`, still zero upload until bytes are built).
5. Once bytes are built, the SPA `POST`s them to `POST /api/jobs/finalize` → **202 + Location** → polls `GET /api/jobs/{id}` (~1.5s) → the **press lifecycle** runs (`queued` → `running — finalize` → `succeeded`).
6. On success, an `--ok-500` artifact row appears (mono filename, tabular bytes) with **Download** (focused) + **Open result** (reloads the linearized PDF back into the board); toast: `Exported — linearized and cleaned.`

**Layout intent (three-zone workbench):**
- **Left rail** (56px collapsed / 220px open): app mark + flow/tool nav. Quiet graphite, hairline separation, zero shadow.
- **Center worksurface (the hero):** persistent **board header** (`--sub-800`, hairline bottom) carrying — doc name (mono), `M pages` (tabular), board-zoom slider (compact/comfortable/large), Select all, the edit-log readout `N edits · Undo`, and the **primary `Export N edits ▶`** button. Below it, the **board**: an inset `--sub-700` well of paper sheets that flow/wrap like dealt cards (honoring true page aspect), faint 24px cutting-mat dot grid.
- **Right inspector** (300–340px): context for the current selection — selected-page count, per-page actions (Rotate CW/CCW, Delete), Combine-files drop target, and the edit-log / undo-redo history. On <768px the inspector becomes a **bottom sheet** and the rail becomes a **top bar + drawer**.

Below ~768px: board → 2-up fluid sheets; single column at 375px with no horizontal scroll; primary actions and per-page controls hit-area ≥44×44.

---

## 4. States to render (each as a distinct frame/section)

Render these as labeled frames. Desktop is primary; include at least one **375px mobile** frame (board 2-up + bottom-sheet inspector) and one **reduced-motion** annotation frame.

1. **Empty / inherits flow A** — board with a freshly opened doc, no edits yet. Header shows `0 edits`, Export button disabled-but-present reading `Export ▶` (or `Nothing to export yet`). Show the **Combine files** affordance: a dashed multi-drop zone labeled **`Drop PDFs to combine — under 150 MB stays on this device.`**

2. **Editing / multi-select (core)** — several sheets selected. Show all three selection idioms via callouts: click = single (`2px --press-500` inset + `--press-tint` wash + check tab top-right); Shift+click = range with `--press-tint` marquee across spanned sheets; Ctrl/Cmd+click = toggle one; rubber-band marquee on empty board. Header reads **`3 selected`** (tabular) with bulk **Rotate** / **Delete**. One sheet shows a rotation chip ⟳ `90°` (mono) and visibly reorients (landscape stays landscape). Header edit-log reads e.g. `4 edits · Undo`.

3. **Drag in progress (the signature moment)** — a single sheet **lifted**: scale 1.04, tilt 1.5°, opacity .96, lifted shadow `0 10px 24px`, cursor `grabbing`; its origin slot is a **dashed `--sub-500` ghost**; a **2px `--press-500` vertical insertion bar with end-caps** is snapped into the target gap while neighbors ease aside. Render a second variant: **multi-drag** — dragging a selected sheet carries the whole selection as a **fanned stack** with a tabular **`N` count badge**, reinserting contiguously.

4. **Assembling (client, pre-upload)** — Export tapped; a quiet client indicator labeled **`Assembling pages…`** (pdf-lib `save()` in a Web Worker). Still zero upload. Keep this calm/graphite — the bold amber press has NOT started yet.

5. **In-progress — the press lifecycle (202 + poll, indeterminate)** — after the worker builds bytes, the finalize job runs. Worksurface **dims** under scrim `rgba(8,10,14,.6)`; a **centered amber job-readout card** shows the `--proc-500` sweep on the 1.6s `--ease-press` loop, an **indeterminate spinner (NOT a progress bar — `progress` is `null`)**, a phase line driven by `state`+`stage`, and a quiet **Cancel** (→ `DELETE /api/jobs/{id}`). Render two phase variants: **`Queued — waiting for a free press`** and **`Running — finalize`**.

6. **Large-file intercept (routes to flow C)** — a file ≥ 150 MB is dropped/assembled: an inline notice **`This is large — pdf-forge will assemble it on the server instead`** with a button to continue on the server path (flow C). Quiet, not an error.

7. **Error frames** (banner: `--err-tint` fill + 3px `--err-500` left-border + small secondary **mono `code` token**; never an HTTP number or stderr). Render these distinct error cases:
   - **Worker failure (client):** `Couldn't assemble this in the browser. Try the server path for large files.`
   - **413 `file_too_large`:** `This file is over the 200 MB limit. Trim it or split it first.`
   - **400 `bad_pdf_structure`:** `pdf-forge couldn't finalize these pages. The assembled file looks malformed.`
   - **429 `queue_full`:** `Every press is busy right now. Retrying in 30s…` (auto-retry honoring `Retry-After` + a manual **Retry now** button).
   - **507 `disk_full`:** `Not enough working room on the server to finalize. Free some space and retry.`
   - **failed job `engine_error`:** `Finalize failed while normalizing the file. Your local pages are untouched — try Export again.`

8. **Success** — `--ok-500` artifact row with a left `--ok-500` rule: mono filename `organized.pdf`, tabular bytes, **Download** (focus-visible ring shown) + **Open result** (reloads linearized PDF into board). `--ok-tint` toast: **`Exported — linearized and cleaned.`**

9. **Guard / delete-all** — attempting to delete every page is blocked with: `Add or keep at least one page`.

Also annotate (callout, no separate frame needed): **keyboard model** — roving tabindex, arrows move focus, Space toggles select, Shift+Arrow extends range, **R** rotate 90 / **Shift+R** counter, **Delete** removes, **Ctrl+Z / Ctrl+Shift+Z** undo/redo, **Ctrl+A** select all / **Esc** deselect; **edge auto-scroll** within ~48px of board top/bottom during drag.

---

## 5. Real data to show (use these exact shapes — no lorem ipsum)

Use tabular figures for all counts/sizes, and the mono token for filenames, byte sizes, job ids, ranges, and the error `code`.

**Sample doc on the board:** name `quarterly-report.pdf`, `M = 24 pages` (ISO portrait, plus one landscape page that stays landscape). For the virtualized variant, show `quarterly-report.pdf` · `512 pages` with a pinned `page 137 of 512` (tabular) on the mini-scrollbar.

**Submit (flow B is `POST /api/jobs/finalize`, multipart: `file` = pdf-lib-assembled bytes + `options`):** finalize options are minimal — `{ "strip_attachments": false }` (default keeps attachments).

**202 Accepted descriptor** (`Location: /api/jobs/3c7e1a9b5d2f4e6080a1b2c3d4e5f607`):
```json
{
  "id": "3c7e1a9b5d2f4e6080a1b2c3d4e5f607",
  "op": "finalize",
  "state": "queued",
  "engine": "pikepdf",
  "created_at": "2026-06-30T14:22:08Z",
  "expires_at": "2026-06-30T15:22:08Z",
  "input": { "filename": "quarterly-report.pdf", "bytes": 7340032 },
  "result": null,
  "error": null
}
```

**Poll — running** (drives the `Running — finalize` phase line; note `progress` is `null` → spinner, never a bar):
```json
{ "id": "3c7e…f607", "op": "finalize", "state": "running", "stage": "finalize", "progress": null }
```

**Poll — succeeded** (drives the success artifact row; note the `artifacts[]` array and `meta`):
```json
{
  "id": "3c7e…f607", "op": "finalize", "state": "succeeded",
  "result": {
    "href": "/api/jobs/3c7e…f607/result",
    "media_type": "application/pdf",
    "filename": "quarterly-report-organized.pdf",
    "bytes": 6815744,
    "artifacts": [
      { "index": 0, "href": "/api/jobs/3c7e…f607/result/0",
        "media_type": "application/pdf",
        "filename": "quarterly-report-organized.pdf", "bytes": 6815744 }
    ],
    "meta": { "input_bytes": 7340032, "output_bytes": 6815744, "kept": "output" }
  },
  "error": null
}
```
Artifact row should read: mono filename `quarterly-report-organized.pdf`, tabular `6,815,744 bytes` (or `6.5 MB`), with **Download** + **Open result**.

**Error envelope** (the common non-2xx shape — branch UI on `error.code`, show `message`, render `code` as a small mono token):
```json
{
  "error": {
    "code": "file_too_large",
    "message": "Upload exceeds the 200 MB limit.",
    "status": 413,
    "request_id": "3f1c9a0b8e7d4f62a1c5d9e2b4f60718",
    "details": { "limit_mb": 200 }
  }
}
```
**429 carries `Retry-After: 30`** → auto-retry copy `Retrying in 30s…`. A failed-job (HTTP 200 with `state:"failed"`) uses `error.code ∈ engine_error | timeout | disk_full | validation | canceled` — show `engine_error` for the finalize-failed frame. Codes this flow can hit: `file_too_large` (413), `bad_pdf_structure` (400), `queue_full` (429), `disk_full` (507), failed-job `engine_error`. Never display the raw HTTP number or engine stderr — only the mono `code` token, small and secondary.

**Cancel:** the quiet Cancel on the press card maps to `DELETE /api/jobs/3c7e…f607` → state `canceled`.

---

## 6. Quality floor (mandatory — every frame)
- **Responsive to ~375px mobile:** three-zone workbench collapses — rail → top bar + drawer, inspector → bottom sheet, board → 2-up fluid sheets, single column, **no horizontal scroll**. Touch hit-areas ≥44×44 (expand padding, not visual size).
- **Visible keyboard focus:** every interactive element shows a `focus-visible` 2px `--press-500` ring + 4px `--press-glow` @35% halo, offset 2px; ring on a paper sheet gets a 1px `--sub-900` spacer. Board sheets use roving tabindex with a ring + subtle lift on the focused sheet. **Never** remove an outline without a replacement. Show focus on at least the Export button and a focused board sheet.
- **prefers-reduced-motion: reduce** fallback (render/annotate one frame): no tilt/scale on drag (insertion bar appears instantly, instant drop), no spinner (static amber readout + cycling `working…` text), no error shake (color only) — **but focus rings still render** (state, not motion); transitions ≤0ms or a single opacity crossfade.
- **Contrast:** body/labels ≥4.5:1, large/chip ≥3:1, selection/rings ≥3:1 vs both substrate AND paper.
- **Restraint:** quiet graphite + ink everywhere; chrome panels cast **zero shadow** (separate by value-step + hairline, no card soup). Spend all boldness on the two signature moments — the lifted sheet and the amber "press at work" — nowhere else.

---

## 7. Deliverable / hand-back
Return:
1. **The labeled frames** from §4 (desktop hero + the state variants + at least one 375px mobile frame + a reduced-motion annotation frame).
2. A short **component inventory**: board header, paper-sheet thumbnail (with page-number chip + rotation chip + selection/focus states), drop-gap insertion bar, multi-drag fanned stack with count badge, Combine-files drop zone, the **press job-readout card** (queued/running/cancel), success artifact row, and the error banner.
3. **Interaction notes** tying each visual to its data/behavior: selection idioms, the operation-log / `N edits · Undo` model, undoable vs. not-undoable (server finalize is committed/not-undoable), the press lifecycle phases mapped to `state`+`stage`, and the keyboard map.

**Do NOT:** write production application code, wire real API calls, ship a generic SaaS dashboard look, add rounded-everything cards, give chrome panels shadows, use fake progress bars, or spend visual boldness anywhere except the lifted sheet and the amber press. This is a **visual reference only.**
