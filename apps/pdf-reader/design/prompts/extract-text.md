# pdf-forge — Claude Design prompt · Flow F "Extract text (read-only, no finalize)"

> Self-contained. Paste this whole file into Claude Design. No other context needed.

---

## 1. Role + goal

You are designing a **high-fidelity, on-brand mockup** (a small set of frames) for **one flow** of **pdf-forge** — a privacy-first, self-hosted, LAN-only Acrobat alternative (FastAPI + a Vite/React 19 SPA; pdf.js renders, pdf-lib does client page writes, heavy ops are bounded async server jobs). pdf-forge is an **instrument** — a fast local document workshop — **not** a generic SaaS dashboard. Single operator, used on a LAN, usually on a desktop but must survive mobile.

**This flow = F "Extract text (read-only)".** Pull plain text out of a PDF via **two paths**: a **client path** (pdf.js, zero upload, instant) and a **server batch path** (`POST /api/jobs/extract-text` → `text/plain`). **No PDF is produced and finalize never runs** — this is the defining constraint; the UI must never imply a document was generated.

Produce the frames in §4, a component inventory, and interaction notes. **Do not write production code** — this is a visual reference only.

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
- `--ok-500 #4BAE7E` · `--warn-500 #D6A53C` (advisory-perms, kept-input, **"this looks like a scan" advisory**) · `--err-500 #D9594C` (4xx/5xx, wrong-pw) · `--proc-500 #E08A3C` (running "press" amber — the one warm hue) · `--err-tint #3A1E1C` · `--ok-tint #15302A`
- Contrast intent: body/labels ≥4.5:1, large/chip text ≥3:1, rings/selection ≥3:1 vs both substrate AND paper (ring on paper gets a 1px `--sub-900` spacer to hold contrast).

### Type
- UI/label/heading/body: `Inter, "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (humanist; turn on `font-feature-settings:"tnum" 1,"lnum" 1` for any numeric UI).
- Data/mono (filenames, ranges like `1-10,21-end`, byte sizes, DPI, hashes, **the extracted text pane**): `"JetBrains Mono","IBM Plex Mono",ui-monospace,"SF Mono",Consolas,monospace`.
- Scale (px / line-height): `--fs-micro 11/16` (page chips, dense meta) · `--fs-label 12/16` (UI labels; UPPERCASE eyebrows +0.04em) · `--fs-body 13/20` · `--fs-data 13/18` (mono rows / text pane) · `--fs-base 14/20` (inputs/controls) · `--fs-h3 16/22` (panel titles) · `--fs-h2 20/26` (screen titles) · `--fs-h1 26/32` (empty-state only).
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
- Drag lifted page: scale 1.04, lifted shadow, tilt 1.5°, opacity .96, cursor `grabbing`; origin slot = dashed `--sub-500` ghost. Drop-gap: 2px `--press-500` vertical insertion bar w/ end-caps snapping into the gap, neighbors ease aside 180ms (@dnd-kit). **(Flow F has NO drag-reorder — see §3; reference for system completeness only.)**
- Disabled: `--sub-400` fill, `--ink-500` text, no border, opacity .6, `not-allowed`. Processing: amber `--proc-500` indeterminate (spinner not progress bar — `progress` may be null). Error: banner `--err-tint` fill + 3px `--err-500` left-border + mono `code` (e.g. `bad_pdf_structure`); 422 wrong-pw = `--err-500` field border + shake (none under reduced-motion). Success: `--ok-500` check + `--ok-tint` toast + left `--ok-500` rule on artifact row.

### Motion
- Durations: `--mo-fast 120ms` (hover/focus/control) · `--mo-base 180ms` (sheet lift/drop, gap reflow, panel open) · `--mo-slow 240ms` (dialog/scrim, bottom-sheet).
- Easing: `--ease-out cubic-bezier(.2,.7,.3,1)` · `--ease-inout cubic-bezier(.4,0,.2,1)` · `--ease-press cubic-bezier(.3,0,.1,1)`. No spring overshoot beyond the 1.04 lift. Processing pulse: 1.6s ease-press loop (opacity .5↔1 + sweeping highlight) = "the press is working", no fake progress bar.
- **prefers-reduced-motion: reduce** → all transitions ≤0ms or single opacity crossfade; drag = NO tilt/scale, only instant insertion bar; processing = static amber readout + cycling `working…` text (no spin); error shake off (color only); focus rings STILL render (state, not motion).

### SIGNATURE ELEMENT — spend boldness ONLY here
Pages are **physical paper sheets on a lit, recessed cool-graphite workbench** — the ONLY bright warm-white objects in the app and the only things that cast a shadow (crisp 2px corners, a faint bottom-edge thickness, a soft resting shadow). Handling them is the personality: hover lifts a sheet 1px; grabbing it scales to 1.04 and tilts 1.5° like a page peeled off a stack. Its companion accent — used **only when a heavy server job runs** — is the **"press at work"** treatment: the worksurface dims and a warm amber (`--proc-500`) sweep pulses across the job readout like an instrument pressing the document, resolving to a green check or a red machine-code banner. **Everything else is quiet graphite + ink.** For Flow F specifically: the bold moments are (1) the lit sheets on the board with their text-match highlights, and (2) — for the server path only — the lightweight amber press readout. Do NOT add a second accent or decorate the quiet chrome.

---

## 3. Screen / flow brief

**The operator's path.** A PDF is already open on the board (it arrived via Flow A, zero upload). The operator wants its text. The **right inspector** is a two-tab panel:

- **Tab 1 — "Quick text (this device)"** (default). Pure client path via pdf.js, **zero upload**. Carries a privacy micro-label `Stays on this device — nothing uploaded`. Choosing this tab extracts page text **on the fly** into a scrollable **mono `--fs-data` text pane** that sits beside the board, with a live **find/highlight box** at its top. Matched runs highlight on **BOTH** the text pane **and** the sheet faces. Per-page text streams in as pages render (a faint `extracting page N…` ticker). There is no server job, no artifact, **no download moment** — the text is just there, copyable/searchable. Footer actions: `Copy all` + `Download .txt` (built locally in the browser, still zero upload).

- **Tab 2 — "Batch extract (server)"**. Server path: `POST /api/jobs/extract-text` → 202 → poll → `text/plain`. Carries the `options`: a **pages scope** (mono range string, default `1-end`, e.g. `1-10,21-end`) and a `layout` toggle (preserve layout, default off). The pages scope is **two-way bound** with board multi-select: selecting sheets writes the mono range string; editing the range string updates the selection. A primary **Extract ▶** button submits. On success an **artifact row** appears with mono filename `document.txt`, tabular bytes, and a `Download` action — and the row plainly notes **`Text only — no PDF was created.`** (this is the #10 definition-of-done: result is `text/plain`, not `application/pdf`, and no finalize ran).

**Layout intent (desktop ≥1024px):** three-zone workbench. Left rail (56px collapsed) with op icons; center worksurface = the **board** of paper sheets (the doc) + the **text pane** beside/below it; right inspector (300–340px) = the two-tab extract panel. Board header persists on top of the worksurface (doc name in mono, `M pages` tabular, board-zoom slider, select-all, and the inspector's primary action mirrors here).

**No drag-reorder, no finalize, no undo.** Flow F is read-only — nothing mutates the document or the page model. The only reversible actions are switching tabs and changing the page scope. Multi-select on the board exists ONLY to scope the server extract's `pages` option (click / Shift-range / Ctrl-toggle / marquee / select-all).

---

## 4. States to render (each a distinct frame/section)

Render every state below as its own clearly-labeled frame. Show desktop AND the ~375px mobile variant for at least the EMPTY, CLIENT-SUCCESS, SERVER-IN-PROGRESS, and SERVER-SUCCESS frames.

1. **Empty (default, Quick-text tab).** Doc is on the board; inspector shows the two tabs with "Quick text (this device)" active, the privacy micro-label `Stays on this device — nothing uploaded` (in `--ink-600`), and a quiet prompt `Open a PDF to read its text` if no doc is loaded. Text pane shows its empty placeholder.

2. **Client loading (pdf.js extracting).** Quick-text tab active; text streams into the mono pane page-by-page; faint `extracting page 3…` ticker (`--ink-600`). No amber press (this is client-side, not a server job). Board sheets render normally.

3. **Client success + live find/highlight.** Text fully in the pane, copyable. Find box has a query (e.g. `invoice`); matched runs highlighted with `--press-tint` wash + `--press-500` underline on BOTH the text pane lines AND the corresponding sheet faces on the board. Footer: `Copy all`, `Download .txt`. NO artifact row, NO server "download" framing — text never left the device.

4. **Client advisory — image-only scan (NOT an error).** Client extraction of a scanned PDF yields little/no text → a quiet `--warn-500` advisory (warn-tinted strip, amber-gold text, NOT a red error banner): `No selectable text found — this looks like a scan. Run OCR to make it searchable.` with a link to the OCR flow (Flow C/D). Board still shows the scanned sheets.

5. **Server submit / upload spinner.** Batch tab active; options filled (pages `1-10,21-end`, layout off); operator clicked **Extract ▶**; brief standard upload spinner state before the 202 lands.

6. **Server in-progress (202 + poll, the lightweight press).** The "press at work" treatment, **lightweight**: worksurface dims, amber `--proc-500` indeterminate spinner + readout, phase text **`Running — pdftotext`**, and EXPLICITLY **no finalize phase** shown (read-only op — call this out in the frame, e.g. a caption "no finalize: read-only"). A `Cancel` action (→ `DELETE /api/jobs/{id}`). `progress` is null → spinner, never a progress bar. Show the reduced-motion variant too: static amber readout + cycling `working…` text.

7. **Server success — artifact row.** `--ok-500` check, `--ok-tint` toast, left `--ok-500` rule on the artifact row: mono filename `document.txt`, tabular bytes `41,827 B`, `text/plain` media-type chip, `Download` action. Row note: **`Text only — no PDF was created.`** UI must NOT imply a PDF/document was generated.

8. **Server multi-select scoping.** Board with several sheets multi-selected (press-blue inset borders + check tabs + header `"4 selected"` tabular); the Batch tab's pages field shows the bound mono range `1-3,7` derived from the selection. Show a Shift-range marquee mid-drag in this or an inset.

9. **Error frames (server path — render at least three).** Use the error voice in §5: 415 `not_a_pdf`, 400 `bad_pdf_structure`, 422 `out_of_range` (page scope). Red `--err-tint` banner + 3px `--err-500` left border + the mono machine code shown small. For 422 out-of-range, also show the pages field with `--err-500` border. **Never** show an HTTP number or engine stderr to the operator — human message + small mono code only.

> Note for completeness: drag-reorder / drop-gap and wrong-password are NOT part of Flow F (no page mutation, no crypto here) — do not render them; they belong to Flows B and E.

---

## 5. Real data to show (embed these shapes — no lorem ipsum)

**Server submit:** `POST /api/jobs/extract-text` as `multipart/form-data` (`file` part = PDF bytes; `options` JSON part). Options shape:
```json
{ "pages": "1-10,21-end", "layout": false }
```

**202 Accepted** (job descriptor, `Location: /api/jobs/{id}`):
```json
{
  "id": "7b3e1d9c5a8f42610c4d2e9a1f7b6c30",
  "op": "extract-text",
  "state": "queued",
  "engine": "poppler",
  "created_at": "2026-06-30T14:12:00Z",
  "expires_at": "2026-06-30T15:12:00Z",
  "input": { "filename": "contract-2026.pdf", "bytes": 2384761 },
  "result": null,
  "error": null
}
```

**Poll — running** (`GET /api/jobs/{id}`, `progress` may be null → spinner; phase from `stage`):
```json
{ "id": "7b3e…6c30", "op": "extract-text", "state": "running", "stage": "pdftotext", "progress": null }
```

**Poll — succeeded** (note `media_type: "text/plain"`, single artifact, NO finalize):
```json
{
  "id": "7b3e…6c30", "op": "extract-text", "state": "succeeded",
  "result": {
    "href": "/api/jobs/7b3e…6c30/result",
    "media_type": "text/plain",
    "filename": "contract-2026.txt",
    "bytes": 41827,
    "artifacts": [
      { "index": 0, "href": "/api/jobs/7b3e…6c30/result/0",
        "media_type": "text/plain", "filename": "contract-2026.txt", "bytes": 41827 }
    ],
    "meta": { "pages": "1-10,21-end", "layout": false }
  },
  "error": null
}
```

**Download:** `GET /api/jobs/7b3e…6c30/result` → `200 OK`, `Content-Type: text/plain; charset=utf-8`, `Content-Disposition: attachment; filename="contract-2026.txt"`. (Display this in the artifact row as the `text/plain` chip + filename + `41,827 B`.)

**Cancel:** `DELETE /api/jobs/7b3e…6c30` → `200` descriptor with `state: "canceled"`.

**Error envelope** (all non-2xx share this single shape; clients branch on `code`, never on `message` or status number):
```json
{
  "error": {
    "code": "out_of_range",
    "message": "Page 88 is past the end — this document has 42 pages.",
    "status": 422,
    "request_id": "3f1c9a0b8e7d4f62a1c5d9e2b4f60718",
    "details": { "page": 88, "page_count": 42 }
  }
}
```

**Error voice for THIS flow (human message — show this text; small mono `code`; never an HTTP number, never stderr):**
- `415 not_a_pdf` → "That isn't a PDF."
- `400 bad_pdf_structure` → "This PDF won't open for text extraction. Try Repair first."
- `422 out_of_range` (page scope) → "Page 88 is past the end — this document has 42 pages."
- **Empty result** (valid PDF, no text layer) → NOT an error: `--warn-500` advisory "No text found. This may be a scanned image — OCR can add a text layer." / client equivalent "No selectable text found — this looks like a scan. Run OCR to make it searchable."
- `429 queue_full` (+ `Retry-After`), `507 disk_full`, `413 file_too_large`, and a failed/timeout job → standard server-error voice (human sentence + small mono code), same as Flow C.

**Sample concrete values to populate frames (use the mono token + tabular figures for all quantities):**
- doc name: `contract-2026.pdf` · `42 pages` · input `2,384,761 B`
- page-scope range strings: `1-end` (default), `1-10,21-end`, `1-3,7`
- job id: `7b3e1d9c5a8f42610c4d2e9a1f7b6c30` (truncate as `7b3e…6c30` in tight UI)
- result: `contract-2026.txt` · `41,827 B` · `text/plain`
- find query: `invoice` with e.g. `12 matches` (tabular)

---

## 6. Quality floor (mandatory — every frame)

- **Responsive to ~375px:** at <768px the inspector becomes a **bottom sheet**, the rail becomes a top bar + drawer, the board goes 2-up; at 375px the **text pane stacks UNDER the board**, single column, **no horizontal scroll**. Mobile primary/controls 40px tall, hit-areas ≥44×44.
- **Visible keyboard focus:** `focus-visible` = 2px `--press-500` ring, offset 2px, + 4px `--press-glow` halo @35%; on a paper sheet insert a 1px `--sub-900` spacer so the ring holds contrast. Never `outline:none` without a replacement. Board sheets use roving tabindex (arrow keys).
- **prefers-reduced-motion: reduce:** transitions ≤0ms or a single opacity crossfade; the server-path press = static amber readout + cycling `working…` (no spin); no shake on error (color only); focus rings STILL render.
- **Contrast:** body/labels ≥4.5:1, large/chip text ≥3:1, rings/selection ≥3:1 vs both substrate AND paper.
- **Quiet everywhere except the signature element.** Only two bold moments in this flow: the lit paper sheets (with text-match highlights) and the amber server-press readout. No card soup (chrome casts no shadow — separate by value-step + hairline), nothing rounded >6px except pills, one accent only.

---

## 7. Deliverable / hand-back

Return:
1. **The frames** of §4, each labeled by state, with desktop and ~375px mobile variants for the four called-out states.
2. A **component inventory**: two-tab inspector panel, privacy micro-label, mono text pane + find/highlight box, page-scope mono input (two-way bound to board selection), board sheet + page-chip + selection states, amber "press at work" readout (lightweight, no finalize phase) + Cancel, success artifact row (`text/plain` chip, tabular bytes, "Text only — no PDF was created."), `--warn-500` scan advisory, `--err-*` error banner with small mono code.
3. **Interaction notes**: tab switch, client-path streaming/highlight behavior, two-way selection↔range binding, 202→poll→download server lifecycle (spinner not progress bar; cancel→DELETE), and the reduced-motion fallbacks.

**Do NOT:** write production/application code, wire real API calls, invent a download moment for the client path (text never leaves the device), show a finalize phase or imply a PDF was produced on the server path, add a second accent color, or decorate the quiet chrome. This is a **visual reference**, not the shipped app.
