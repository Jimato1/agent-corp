# Claude Design prompt — pdf-forge / Flow C: "Run a heavy server job (single-PDF result)"

## 1. Role + goal
You are a senior product designer. Produce a **high-fidelity, on-brand visual mockup** (a small set of desktop + mobile frames) for **one flow** of pdf-forge: running a single heavy server-side PDF operation that returns one finished PDF — pick op → drop input → Submit → `202 Accepted` → poll → download. This is a **visual reference only**, not shippable code.

pdf-forge is a **privacy-first, self-hosted Acrobat alternative** — a single hardened Docker container in a homelab, LAN-only, single operator. It is an **INSTRUMENT — a fast local document workshop — NOT a generic SaaS dashboard.** Used mostly on a desktop but must survive mobile (~375px). The mood is a quiet, recessed graphite workbench where the only bright objects are the paper sheets, and the only warm color is the "press at work" amber while a job runs.

---

## 2. Design system to apply (LOCKED — use these tokens verbatim)

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

### Interaction states
- Hover sheet: shadow→hover, `translateY(-1px)`, 120ms, cursor `grab`. Hover control: bg +1 substrate step, border→`--sub-400`, no motion.
- Selected single: inset 2px `--press-500` border + `--press-tint` 6% wash + press-blue check tab top-right.
- Focus-visible: 2px `--press-500` ring, offset 2px, + 4px `--press-glow` halo @35%; on paper insert 1px `--sub-900` spacer. NEVER `outline:none` without replacement.
- Drag lifted row/sheet: scale 1.04, lifted shadow, tilt 1.5°, opacity .96, cursor `grabbing`; origin slot = dashed `--sub-500` ghost. Drop-gap: 2px `--press-500` insertion bar w/ end-caps, neighbors ease aside 180ms (@dnd-kit).
- Disabled: `--sub-400` fill, `--ink-500` text, no border, opacity .6, `not-allowed`. Processing: amber `--proc-500` indeterminate (spinner not progress bar — `progress` may be null). Error: banner `--err-tint` fill + 3px `--err-500` left-border + mono `code`; 422 wrong-pw = `--err-500` field border + shake (none under reduced-motion). Success: `--ok-500` check + `--ok-tint` toast + left `--ok-500` rule on artifact row.

### Motion
- Durations: `--mo-fast 120ms` (hover/focus/control) · `--mo-base 180ms` (lift/drop, reflow, panel open) · `--mo-slow 240ms` (dialog/scrim, bottom-sheet).
- Easing: `--ease-out cubic-bezier(.2,.7,.3,1)` · `--ease-inout cubic-bezier(.4,0,.2,1)` · `--ease-press cubic-bezier(.3,0,.1,1)`. No spring overshoot beyond the 1.04 lift. Processing pulse: 1.6s ease-press loop (opacity .5↔1 + sweeping highlight) = "the press is working", no fake progress bar.
- **prefers-reduced-motion: reduce** → transitions ≤0ms or single opacity crossfade; drag = NO tilt/scale, only instant insertion bar; processing = static amber readout + cycling `working…` text (no spin); error shake off (color only); focus rings STILL render.

### SIGNATURE ELEMENT (spend boldness ONLY here)
Pages are physical paper sheets on a lit, recessed cool-graphite workbench — the ONLY bright warm-white objects in the app and the only things that cast a shadow (crisp 2px corners, faint bottom-edge thickness, soft resting shadow). Its companion accent — used **only when a heavy server job runs** — is the "press at work" treatment: **the worksurface dims (scrim `rgba(8,10,14,.6)`) and a warm amber (`--proc-500`) sweep pulses across the job readout like an instrument pressing the document, resolving to a green check or a red machine-code banner.** Everything else is quiet graphite + ink. The dropped-input sheet and the amber press are the two moments pdf-forge is remembered by — make them the focal points and keep all other chrome instrumental and recessive.

---

## 3. Screen / flow brief

**Layout (three-zone workbench):**
- **Left rail (56px collapsed / 220px open):** the **op list** — the entry point. The 9 single-PDF heavy ops: `merge` (large/encrypted), `compress`, `encrypt`, `decrypt`, `permissions`, `linearize`, `repair`, `image-to-pdf`, `sanitize`. Each row = small icon + label; selected op gets press-blue selection. (Crypto ops `encrypt`/`decrypt`/`permissions` belong to a sibling flow but appear in the list.)
- **Center worksurface (hero):** a large single-sheet **pdf.js preview** of the dropped input (rendered client-side, **zero upload until Submit**), honoring the page's true aspect (ISO ~1:1.414). When nothing is dropped: a quiet, recessed drop target — `Choose a {op} input` (e.g. `Choose a compress input`). For `image-to-pdf`: an **ordered image tray** (tiles in page order, each true-aspect, drag to reorder, per-tile remove) instead of one sheet. For `merge`: a **vertical reorder tray of input files** (drag to set merge order).
- **Right inspector (300–340px):** the selected op's **options form** + the drop target restated. A **privacy label** at the bottom that reads `Client-side until you Submit — nothing has left this machine` and **flips at Submit** to a `--warn-500`-tinted `Uploading to your pdf-forge — over your LAN only`.
- **Primary action:** `Submit` (press-blue primary button, 40px) in the inspector footer.

**Operator path:** open app (empty, rail visible) → click an op → inspector opens with that op's options + drop target → drop/choose a file → center renders the input sheet client-side, options validate inline → click `Submit` → privacy label flips, request goes `multipart/form-data` to `POST /api/jobs/{op}` → `202 Accepted` → **press lifecycle owns the screen** (worksurface dims, amber readout, poll `GET /api/jobs/{id}` ~1.5s) → on `succeeded` the amber snaps to a green check, scrim lifts, an artifact row appears with `Download` default-focused → operator downloads `GET /api/jobs/{id}/result` (`application/pdf`).

**Per-op options to show in the inspector (real shapes):**
- `compress` → `{ "preset": "ebook", "color_dpi": 150 }` — preset select + DPI field (mono, tnum).
- `image-to-pdf` → `{ "page_size": "auto" | "a4" | "letter", "lossless": false }` — plus the image tray.
- `sanitize` → `{ "strip_metadata": true, "strip_attachments": true }` — two toggles.
- `linearize` / `repair` → no options (just the drop target + a one-line description of what the op does).
- `merge` → `{ "order": [..], "passwords": { "file_2": "…" } }` — the reorder tray; encrypted inputs get a per-row password field (mono dots).

---

## 4. States to render (each as a distinct, labeled frame)

Render **desktop frames** for each, plus **≥2 mobile (~375px) frames** (empty + in-progress) showing the inspector collapsed to a bottom sheet and the rail collapsed to a top bar + drawer.

1. **Empty** — rail op list, no op selected (or `compress` selected with empty inspector + recessed drop target reading `Choose a compress input`). Center worksurface quiet and empty.
2. **Loading (input dropped, pre-Submit)** — center renders the dropped input as a paper sheet client-side: a blank `--paper-0` sheet with a faint center spinner becoming a rendered page; inspector options visible and inline-validated; privacy label still in the calm "nothing has left this machine" state.
3. **In-progress (202 + poll — the PRESS LIFECYCLE, the hero frame)** — worksurface **dims with scrim `rgba(8,10,14,.6)`**; a **centered amber readout card** shows: mono job id, op name, input filename + tabular bytes; a **`--proc-500` amber sweep on a 1.6s `--ease-press` loop**; an **indeterminate spinner, NOT a progress bar** (`progress` is null); a **phase line driven by `state` + `stage`** (e.g. `Running — ghostscript` then `Running — finalize`; for `repair`: `Running — repair` → `Running — finalize`); a quiet `Cancel` button. **NO percentage — phase words only.**
4. **Canceled** — operator hit Cancel → `DELETE /api/jobs/{id}` → readout resolves to a calm confirmation: `Job canceled. Nothing was kept.`
5. **Error** — readout flips to an `--err-tint` banner (3px `--err-500` left rule) with a **sanitized, calm message** + small mono `code`; a `Try again` button that returns to the **filled-in options** (inputs preserved). Show at least these as variants: `file_too_large` (413), `not_a_pdf` (415), `bad_pdf_structure` (400), `queue_full` (429 + auto-retry countdown), `disk_full` (507), and a **failed job** `timeout` / `engine_error`.
6. **Success** — amber snaps to **`--ok-500` check**, scrim lifts, an `--ok-tint` toast, and an **artifact row** with a left `--ok-500` rule: mono filename, tabular bytes, op meta. For `compress`, show the **savings**: `5.0 MB → 1.8 MB` (tabular + `--ok-500` delta) — and a separate variant with a `--warn-500` chip `Kept your original — compression would have made it larger` when `meta.kept:"input"`. `Download` button default-focused.
7. **Flow-specific — `image-to-pdf` image tray** — inspector/worksurface with an ordered tray of image tiles (true aspect), a **drag-in-progress** state showing a lifted tile (scale 1.04, tilt 1.5°), a dashed origin ghost, and a 2px `--press-500` insertion bar, plus per-tile remove.
8. **Flow-specific — `merge` input reorder tray** — vertical rows of input files in the inspector, one row mid-drag (lifted-row affordance + insertion bar), and one encrypted input row showing a mono-dots `passwords` field.

**ERROR VOICE (branch on `error.code`, calm/instrument-like — never an HTTP number or raw stderr):**
- 413 → `This file is over the 200 MB limit.`
- 415 `not_a_pdf` → `That isn't a PDF — pdf-forge checks the file's contents, not its name.` (image-to-pdf variant: `That image type isn't supported. Use PNG, JPG, or TIFF.`)
- 400 `bad_pdf_structure` → `This PDF is too damaged to open. Try the Repair op first.` (Repair op itself: `This file is too broken to recover — it won't open at all.`)
- 422 `invalid_options`/`out_of_range` → field-level, e.g. `DPI must be between 72 and 600.`
- 429 `queue_full` → `Every press is busy. Retrying in {Retry-After}s…` (auto + manual retry)
- 507 `disk_full` → `The server is low on working storage. Free some space and retry.`
- failed `timeout` → `This job hit the {N}s time limit and was stopped. Try a smaller file or fewer pages.`
- failed `engine_error` → `The {op} engine couldn't finish this file.`

---

## 5. Real data to show (use these exact shapes/values — no lorem ipsum)

Use the mono token for all filenames, byte sizes, DPI, ranges, passwords-as-dots, and job ids; tabular figures for all counts/sizes.

**Submit (compress) → 202:**
```json
{
  "id": "9f8c2a1b4d6e4710b2c3a4f5e6d70819",
  "op": "compress",
  "state": "queued",
  "engine": "ghostscript",
  "created_at": "2026-06-30T12:00:00Z",
  "expires_at": "2026-06-30T13:00:00Z",
  "input": { "filename": "scan.pdf", "bytes": 5242880 },
  "result": null,
  "error": null
}
```

**Poll — running (drives the press readout phase line):**
```json
{ "id": "9f8c…0819", "op": "compress", "state": "running", "stage": "ghostscript", "progress": null }
```
(`state` ∈ `queued | running | succeeded | failed | expired | canceled`; `stage` examples: `validating`, `ghostscript`, `finalize`, `repair`. `progress` is `null` — spinner, never a bar.)

**Poll — succeeded (drives the artifact row + savings):**
```json
{
  "id": "9f8c…0819", "op": "compress", "state": "succeeded",
  "result": {
    "href": "/api/jobs/9f8c…0819/result",
    "media_type": "application/pdf",
    "filename": "scan-compressed.pdf",
    "bytes": 1872311,
    "artifacts": [
      { "index": 0, "href": "/api/jobs/9f8c…0819/result/0",
        "media_type": "application/pdf", "filename": "scan-compressed.pdf", "bytes": 1872311 }
    ],
    "meta": { "input_bytes": 5242880, "output_bytes": 1872311, "kept": "output" }
  },
  "error": null
}
```
(Render `5242880 bytes` as `5.0 MB`, `1872311` as `1.8 MB`, delta `−64%` in `--ok-500`. `kept:"output"` = savings shown; the `--warn-500` "kept your original" variant is `meta.kept:"input"`.)

**Failed job (HTTP 200 status document, NOT an HTTP error):**
```json
{ "id": "…", "op": "repair", "state": "failed",
  "error": { "code": "engine_error", "category": "engine", "message": "The repair engine couldn't finish this file." },
  "result": null }
```
(`error.code` ∈ `validation | timeout | engine_error | oversize | disk_full | canceled`.)

**Submit-time rejection envelope (HTTP 4xx/5xx — separate from a failed job):**
```json
{ "error": { "code": "file_too_large", "message": "Upload exceeds the 200 MB limit.",
  "status": 413, "request_id": "3f1c9a0b8e7d4f62a1c5d9e2b4f60718", "details": { "limit_mb": 200 } } }
```
429 carries a `Retry-After: 30` header; 422 wrong-password uses `code: "wrong_password"`.

**Sample filenames / sizes / values to populate frames (mono, tabular):**
- `scan.pdf` `5.0 MB` → `scan-compressed.pdf` `1.8 MB`
- `report.pdf` `12.4 MB` (encrypt/linearize input)
- `invoice-2026.pdf` `880 KB` (sanitize)
- `damaged-archive.pdf` `3.1 MB` (repair)
- image-to-pdf tray: `page-01.png` `1.2 MB`, `page-02.jpg` `940 KB`, `page-03.tif` `2.8 MB`
- merge tray: `chapter-a.pdf` `8.2 MB`, `chapter-b.pdf` `6.7 MB` (encrypted, password `••••••••`)
- compress options: preset `ebook`, DPI `150`; image-to-pdf: page size `auto`, lossless off
- job id `9f8c2a1b4d6e4710b2c3a4f5e6d70819`; request id `3f1c9a0b8e7d4f62a1c5d9e2b4f60718`

---

## 6. Quality floor (mandatory — every frame)
- **Responsive to ~375px:** at <768px the inspector becomes a **bottom sheet** and the rail becomes a **top bar + drawer**; single column, **no horizontal scroll**; mobile primary button 40px, hit-areas ≥44×44 (pad, don't enlarge visually). The press readout stays centered and legible on mobile.
- **Visible keyboard focus:** every interactive element shows the 2px `--press-500` focus-visible ring + halo; show at least one frame with focus on a control. Never `outline:none` without a replacement.
- **prefers-reduced-motion: reduce:** include a note/variant — amber press becomes a **static amber readout + cycling `working…` text** (no spin/sweep); drag has no tilt/scale (only the instant insertion bar); error uses color only (no shake); **focus rings still render**.
- **Contrast:** body/labels ≥4.5:1, large/chip ≥3:1, rings/selection ≥3:1 against both substrate and paper (1px `--sub-900` spacer for rings on paper).
- **Quiet everywhere except the signature element:** chrome panels separate by value-step + hairline (no card shadows, no rounded-everything); spend all boldness on the paper sheet and the amber "press at work" moment.

---

## 7. Deliverable / hand-back
Return:
1. **The labeled frames** — desktop frames for states 1–8 above, plus ≥2 mobile (~375px) frames (empty + in-progress), each clearly titled with its state name.
2. **A short component inventory** — op-list rail row, inspector options form (per-op variants), drop target, input sheet preview, image tray tile, merge reorder row, press-lifecycle readout card (running / canceled / error / success variants), artifact/savings row, privacy label (calm + uploading), toast, error banner.
3. **Interaction notes** — the press lifecycle (202 → poll → succeeded/failed) timing and the dim/amber-sweep/resolve sequence; drag affordances for the image + merge trays; focus order; the reduced-motion fallback.

**Do NOT:** write production application code, wire real API calls, or build a generic dashboard. This is a **visual reference** — faithful to the tokens, the data shapes, and the signature element. Keep boldness in exactly one place: the lifted paper sheet and the amber press.
