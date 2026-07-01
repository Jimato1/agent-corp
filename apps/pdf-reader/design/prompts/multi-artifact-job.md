# pdf-forge — Claude Design prompt · Flow D "Multi-artifact job (zip + sidecar)"

> Self-contained. Paste into Claude Design as-is; no other files needed.

---

## 1. Role + goal

You are designing a **high-fidelity, on-brand mockup** (a small set of static frames + states, not a working app) for **one flow of pdf-forge**: a privacy-first, self-hosted, LAN-only Acrobat alternative — an *instrument*, a fast local document workshop, NOT a SaaS dashboard. The flow is **D — "Multi-artifact job (zip + sidecar)"**: the operator runs a server op whose result is **several files** — OCR-with-sidecar, split-by-ranges, or multi-page rasterize — submits, watches the bounded async job (202 + poll, **no progress bar, no SSE**), then downloads a **zip of all artifacts** or **individual artifacts** from an `artifacts[]` list. Produce the frames in §4 using the exact tokens in §2, the exact data in §5, honoring the quality floor in §6.

---

## 2. Design system to apply (LOCKED — use verbatim)

### Palette
**Substrate (cool graphite workbench — the app surface):**
`--sub-900 #0E1116` (deepest well / board backdrop) · `--sub-850 #141922` (app bg) · `--sub-800 #1A2029` (panels/toolbars/rail) · `--sub-700 #222A35` (inset wells, board substrate) · `--sub-600 #2D3743` (hairline borders) · `--sub-500 #3A4654` (control borders) · `--sub-400 #566373` (disabled fill)

**Paper (the PDF page — ONLY true whites; only objects that cast shadow):**
`--paper-0 #FBFBF9` (sheet face / warm paper) · `--paper-edge #E7E7E2` (sheet bottom-edge thickness) · `--paper-shadow #05070A` (sheet shadow color, used at alpha) · ink-on-paper near-black `#11151B`

**Ink (text on substrate; AA-checked):**
`--ink-900 #F2F5F8` (primary/headings ≈13:1) · `--ink-700 #C5CDD6` (secondary) · `--ink-600 #9AA6B2` (muted meta, min AA ≈4.6:1) · `--ink-500 #6B7785` (disabled/non-essential only)

**Press blue (the ONE accent — selection + primary action):**
`--press-500 #1FA2C4` · `--press-400 #3FBDDD` (hover) · `--press-600 #157E9B` (pressed) · `--press-tint #12303A` (selected wash) · `--press-glow #1FA2C4` (focus halo @alpha)

**Semantics (rationed; only on state):**
`--ok-500 #4BAE7E` · `--warn-500 #D6A53C` (advisory-perms, kept-input) · `--err-500 #D9594C` (4xx/5xx, wrong-pw) · `--proc-500 #E08A3C` (running "press" amber — the one warm hue) · `--err-tint #3A1E1C` · `--ok-tint #15302A`
Contrast intent: body/labels ≥4.5:1, large/chip text ≥3:1, rings/selection ≥3:1 vs both substrate AND paper (ring on paper gets a 1px `--sub-900` spacer to hold contrast).

### Type
- UI/label/heading/body: `Inter, "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` (humanist; `font-feature-settings:"tnum" 1,"lnum" 1` for any numeric UI).
- Data/mono (filenames, ranges like `1-10,21-end`, byte sizes, DPI, hashes, passwords-as-dots): `"JetBrains Mono","IBM Plex Mono",ui-monospace,"SF Mono",Consolas,monospace`.
- Scale (px / line-height): `--fs-micro 11/16` (page chips, dense meta) · `--fs-label 12/16` (UI labels; UPPERCASE eyebrows +0.04em) · `--fs-body 13/20` · `--fs-data 13/18` (mono rows) · `--fs-base 14/20` (inputs/controls) · `--fs-h3 16/22` (panel titles) · `--fs-h2 20/26` (screen titles) · `--fs-h1 26/32` (empty-state only).
- Weights: 400 body / 500 labels+controls / 600 headings; 700 only the single empty-state H1. Sentence case (eyebrows UPPERCASE +0.04em `--ink-600`). Mono never UPPERCASE.

### Spacing (base = 4px; instrument-dense)
`--sp-1 4` · `--sp-2 8` · `--sp-3 12` · `--sp-4 16` · `--sp-5 24` · `--sp-6 32` · `--sp-8 48`.
Control height: default 32px / compact 28px / primary+mobile 40px; icon-btn 28px box, 16px glyph. Mobile hit-area ≥44×44 (expand padding, not visual size).
Grid: three-zone workbench — left rail (56px collapsed / 220px open), center worksurface (hero), right inspector (300–340px). <768px inspector→bottom sheet, rail→top bar+drawer; <~768px board→2-up. Single column at 375px, no horizontal scroll. Prose/dialog max 560px; board fluid.

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
- Drag lifted page: scale 1.04, lifted shadow, tilt 1.5°, opacity .96, cursor `grabbing`; origin slot = dashed `--sub-500` ghost. Drop-gap: 2px `--press-500` vertical insertion bar w/ end-caps snapping into the gap, neighbors ease aside 180ms (@dnd-kit). *(Flow D has NO drag-reorder — artifacts are derived — but the board's multi-select marquee + lift-on-focus still apply.)*
- Disabled: `--sub-400` fill, `--ink-500` text, no border, opacity .6, `not-allowed`. Processing: amber `--proc-500` indeterminate (spinner not progress bar — `progress` may be null). Error: banner `--err-tint` fill + 3px `--err-500` left-border + mono `code` (e.g. `bad_pdf_structure`); 422 wrong-pw = `--err-500` field border + shake (none under reduced-motion). Success: `--ok-500` check + `--ok-tint` toast + left `--ok-500` rule on artifact row.

### Motion
- Durations: `--mo-fast 120ms` (hover/focus/control) · `--mo-base 180ms` (sheet lift/drop, gap reflow, panel open) · `--mo-slow 240ms` (dialog/scrim, bottom-sheet).
- Easing: `--ease-out cubic-bezier(.2,.7,.3,1)` · `--ease-inout cubic-bezier(.4,0,.2,1)` · `--ease-press cubic-bezier(.3,0,.1,1)`. No spring overshoot beyond the 1.04 lift. Processing pulse: 1.6s ease-press loop (opacity .5↔1 + sweeping highlight) = "the press is working", no fake progress bar.
- **prefers-reduced-motion: reduce** → all transitions ≤0ms or single opacity crossfade; drag = NO tilt/scale, only instant insertion bar; processing = static amber readout + cycling `working…` text (no spin); error shake off (color only); focus rings STILL render (state, not motion).

### SIGNATURE ELEMENT — spend boldness ONLY here
Pages are **physical paper sheets on a lit, recessed cool-graphite workbench** — the ONLY bright warm-white objects in the app and the only things that cast a shadow (crisp 2px corners, faint bottom-edge thickness, soft resting shadow). Its companion accent — used only when a heavy server job runs — is the **"press at work"** treatment: the worksurface **dims** and a warm amber (`--proc-500`) **sweep pulses** across the job readout like an instrument pressing the document, resolving to a **green check** or a **red machine-code banner**. Everything else is quiet graphite + ink. For Flow D the two memorable moments are: (1) the **press-at-work amber sweep** during the job, and (2) the **artifacts-list reveal** on success. Keep all other chrome instrumental and quiet.

---

## 3. Screen / flow brief

**Three-zone workbench**, same shell across all frames:
- **Left rail** (56px collapsed / 220px open): op picker. The active op for this flow is one of **Split**, **Rasterize**, or **OCR** — selected item gets the press-blue selected treatment. Rail is quiet graphite, hairline-separated, zero shadow.
- **Center worksurface (hero):** the **board** — an inset graphite well holding the input PDF's pages as paper sheets (signature element). Board header pinned on top: doc name (mono), `M pages` (tabular), zoom slider, **Select all**, and the primary **▶ Run** action. For **split** and **rasterize**, the board is also the page-selection surface (multi-select writes the range string — two-way bound, see §4).
- **Right inspector** (300–340px): op **options** form (per-op shape in §4/§5) + the live job readout + the result `artifacts[]` list. This is where empty→loading→in-progress→error→success all play out.

**Operator path (Flow D):**
1. Operator has a PDF open on the board (came from flow A). Picks **Split / Rasterize / OCR** in the rail → inspector shows that op's options (empty state).
2. Operator fills options. For split/rasterize, selecting sheets on the board builds the page set and **writes the mono range string**; editing the range string **re-highlights** the sheets (two-way). For split, each range renders as a distinct **colored band** of selected sheets so cut boundaries are visible before submit.
3. Clicks **▶ Run** → SPA `POST`s `multipart/form-data` to `POST /api/jobs/{op}` → **202 + Location** → board **dims**, inspector readout shows the **press-at-work amber sweep** + indeterminate spinner + phase line. SPA polls `GET /api/jobs/{id}` ~1.5s.
4. On `succeeded`, the readout resolves into the **artifacts list reveal**: a top **Download all (.zip)** (→ `GET /api/jobs/{id}/result`) plus one row per artifact (→ `GET /api/jobs/{id}/result/{index}`). On a `422`/failed job, a red machine-code banner takes its place.

`<768px`: rail → top bar + drawer; inspector → **bottom sheet** (options, readout, and artifacts list stack); board → 2-up. At 375px single column, no horizontal scroll.

---

## 4. States to render (each as a distinct, labeled frame/section)

Render every state below as its own frame. Label each frame with its name and the op it shows.

1. **EMPTY (options) — three op variants.** Op selected in rail; inspector shows options:
   - **Split:** mode selector (`ranges` / `every_n` / `single`) + mono **range field** (e.g. `1-10,11-20,21-end`) live-validated against page count; `every_n` reveals an `n` integer field.
   - **Rasterize:** **pages** field (mono, e.g. `1-end`) + **DPI** field (e.g. `150`) + **format** segmented control (`png` / `jpeg` / `pdf`).
   - **OCR:** **languages** multiselect (`eng`, `deu`) + **deskew** toggle + **sidecar** toggle labeled "Add a .txt alongside the PDF".
   Board shows the input pages at rest (no selection). Primary **▶ Run** enabled.
2. **LOADING (input preview).** Input pages rendering client-side on the board (pdf.js); a couple of sheets still show the blank `--paper-0` placeholder + faint center spinner (lazy render). Inspector options ready.
3. **MULTI-SELECT (split — colored range bands).** Board's full multi-select in play (click / Shift-range / Ctrl-toggle / marquee / Select all). For **split**, each declared range is drawn as a **colored band** of selected sheets (distinct, accessible tints) so cut boundaries are visible; the mono range field reflects the selection (two-way bound) and the inspector notes the implied output count (`3 ranges → 3 files`). Show the press-tint marquee mid-drag on one sheet group, header reads `"24 selected"` (tabular).
4. **IN-PROGRESS (press lifecycle — 202 + poll).** Board **dimmed**; inspector readout shows the **amber `--proc-500` sweep pulse** + **indeterminate spinner (NOT a progress bar — `progress` is null)** + a phase line built from `state` + `stage`, e.g. OCR shows **`Running — ocr`** (note: longest job, per-page 120s timeout). Readout notes expected output count when known (`3 ranges → 3 files`). A **Cancel** button is present (→ `DELETE /api/jobs/{id}`). Show one variant for OCR.
5. **CANCELED.** After Cancel/DELETE: quiet readout reading **"Job canceled. Nothing was kept."**
6. **ERROR (submit-time 422).** Bad range caught at submit → `--err-tint` banner + 3px `--err-500` left-border + small/secondary mono `code` token. Render two: `out_of_range` ("Page 240 is past the end — this document has 210 pages.") and `invalid_options` ("Couldn't read that range. Use forms like 1-10, 12, 20-end."). The offending mono range field gets the `--err-500` border (+ shake, off under reduced-motion).
7. **ERROR (result expired 404).** Artifact fetched after TTL → banner "These results have expired and were cleared. Re-run the job to get them again." mono code `result_gone`.
8. **SUCCESS (the MOMENT — artifacts list reveal).** The readout **expands into the `artifacts[]` list** (animates in; crossfade under reduced-motion). A top **Download all (.zip)** row (→ `/result`). Below, one row per artifact: **index** · mono **filename** · **media-type chip** (PDF / TXT / PNG) · tabular **bytes** · its own **Download** (→ `/result/{index}`); each row carries a left `--ok-500` rule + `--ok-tint` toast. Render TWO success variants:
   - **OCR sidecar pair** shown plainly: `invoice-scan-ocr.pdf` (PDF) + `invoice-scan.txt` (TXT).
   - **Split into 3 ranges:** three PDF artifacts at `/result/0..2`.
9. **REDUCED-MOTION variant** of the in-progress + success frames: static amber readout + cycling `working…` text (no spin), success = opacity crossfade, focus rings still rendered.
10. **375px MOBILE** variant of: empty (options as bottom sheet), in-progress, and success (artifacts list stacked). Single column, ≥44×44 hit areas, no horizontal scroll.

---

## 5. Real data to show (use these exact shapes/values — no lorem ipsum)

**Submit (multipart):** `POST /api/jobs/split` · `POST /api/jobs/rasterize` · `POST /api/jobs/ocr` — parts: `file` (PDF bytes) + `options` (JSON string). Responds **202 Accepted**, `Location: /api/jobs/{id}`, `X-API-Version: 1`.

**Per-op `options`:**
```json
// split
{ "mode": "ranges", "ranges": ["1-10","11-20","21-end"], "n": 10 }
// rasterize
{ "pages": "1-end", "dpi": 150, "format": "png" }   // format ∈ png | jpeg | pdf
// ocr
{ "languages": ["eng","deu"], "deskew": true, "sidecar": true }
```

**Job descriptor (poll target `GET /api/jobs/{id}`), states ∈ `queued | running | succeeded | failed | expired | canceled`:**
```json
{
  "id": "9f8c2a1b4d6e4710b2c3a4f5e6d70819",
  "op": "ocr",
  "state": "running",
  "progress": null,
  "stage": "ocr",
  "created_at": "2026-06-30T12:00:00Z",
  "updated_at": "2026-06-30T12:00:07Z",
  "expires_at": "2026-06-30T13:00:07Z",
  "engine": "ocrmypdf",
  "input": { "filename": "invoice-scan.pdf", "bytes": 5242880 },
  "submitted_by": "eide1376@gmail.com",
  "result": null,
  "error": null
}
```

**Success — OCR sidecar (zip + 2 artifacts):**
```json
"result": {
  "href": "/api/jobs/9f8c2a1b4d6e4710b2c3a4f5e6d70819/result",
  "media_type": "application/zip",
  "filename": "invoice-scan-ocr.zip",
  "bytes": 2310544,
  "artifacts": [
    { "index": 0, "href": "/api/jobs/9f8c…0819/result/0",
      "media_type": "application/pdf", "filename": "invoice-scan-ocr.pdf", "bytes": 2096331 },
    { "index": 1, "href": "/api/jobs/9f8c…0819/result/1",
      "media_type": "text/plain", "filename": "invoice-scan.txt", "bytes": 4821 }
  ]
}
```

**Success — split into 3 ranges (zip + 3 artifacts):**
```json
"result": {
  "href": "/api/jobs/{id}/result",
  "media_type": "application/zip",
  "filename": "book-split.zip",
  "bytes": 7884211,
  "artifacts": [
    { "index": 0, "href": "/api/jobs/{id}/result/0", "media_type": "application/pdf", "filename": "book_1-10.pdf",   "bytes": 2620114 },
    { "index": 1, "href": "/api/jobs/{id}/result/1", "media_type": "application/pdf", "filename": "book_11-20.pdf",  "bytes": 2511880 },
    { "index": 2, "href": "/api/jobs/{id}/result/2", "media_type": "application/pdf", "filename": "book_21-end.pdf", "bytes": 2752217 }
  ]
}
```

**Success — multi-page rasterize (zip of PNGs):** filenames `page-001.png`, `page-002.png`, … ; chips read **PNG**; sample bytes `184,220 bytes`, `176,544 bytes` (tabular).

**Error envelope (non-2xx) — show these exact codes for Flow D:**
```json
{ "error": { "code": "out_of_range", "message": "Page 240 is past the end — this document has 210 pages.",
             "status": 422, "request_id": "3f1c9a0b8e7d4f62a1c5d9e2b4f60718", "details": { "pages": 210 } } }
{ "error": { "code": "invalid_options", "message": "Couldn't read that range. Use forms like 1-10, 12, 20-end.",
             "status": 422, "request_id": "…" } }
{ "error": { "code": "result_gone", "message": "These results have expired and were cleared. Re-run the job to get them again.",
             "status": 404, "request_id": "…" } }
```
Also reachable (render the banner treatment, mono code, no HTTP number shown): `queue_full` (429 + `Retry-After: 30`), `disk_full` (507), `file_too_large` (413, `details.limit_mb: 200`), `not_a_pdf` (415), `bad_pdf_structure` (400). **Failed job** (HTTP 200 status doc) example: `{ "state": "failed", "error": { "code": "timeout", "category": "engine", "message": "OCR exceeded the time limit." } }`.

**Voice rules:** the mono `code` token is shown **small/secondary** — never the raw HTTP number, never engine stderr. Counts, byte sizes, DPI, page ranges, and ids use the **mono token with tabular figures**. Format bytes human-friendly next to the raw (`2.0 MB · 2,096,331 bytes`). Sample doc names: `invoice-scan.pdf` (210-ish pages OCR), `book.pdf` (split). Passwords (not in this flow) would render as dots.

---

## 6. Quality floor (mandatory — every frame)

- **Responsive to ~375px mobile:** inspector → bottom sheet; artifacts list stacks; board 2-up then single column; no horizontal scroll; hit areas ≥44×44 (expand padding, not visual size).
- **Visible keyboard focus:** `focus-visible` = 2px `--press-500` ring, offset 2px, + 4px `--press-glow` halo @35%; on paper a 1px `--sub-900` spacer. Never `outline:none` without a replacement. Board sheets use roving tabindex.
- **prefers-reduced-motion: reduce** fully honored (see §2 Motion + frame 9): no spin/sweep animation → static amber + cycling `working…`; success = opacity crossfade; no error shake; focus rings still render.
- **Contrast:** AA — body/labels ≥4.5:1, large/chip text ≥3:1, rings/selection ≥3:1 vs both substrate AND paper.
- **Spend boldness in ONE place:** the paper sheets + the amber press-at-work treatment. Everything else stays quiet graphite + ink, hairline-separated, zero chrome shadow. No card soup, no rounded-everything (nothing >6px radius except pills).

---

## 7. Deliverable / hand-back

Return:
1. **The labeled frames** from §4 (each state as its own frame: empty×3 ops, loading, multi-select split bands, in-progress, canceled, the two 422 errors, result_gone, the two success variants, the reduced-motion variant, and the 375px mobile variants).
2. A short **component inventory** for this flow: op-options form controls (mode selector, mono range field, DPI field, format segmented control, language multiselect, toggles), board + sheet + page-chip + selection/marquee + colored range-band, job readout (press-at-work + spinner + phase line + Cancel), error banner (with mono code), and the artifacts-list (Download-all row + per-artifact rows with media-type chip + tabular bytes + per-row Download).
3. **Interaction notes** describing: the two-way bind between board selection and the range string; the 202 → poll → succeeded lifecycle and where each state renders; the success artifacts-reveal as the signature moment; and the reduced-motion fallbacks.

**Do NOT:** write production application code, wire real network calls, or ship this as the app — this is a **visual reference mockup only**. Stay strictly within the locked tokens and the 19-endpoint API surface above; invent no new endpoints, ops, colors, or radii.
