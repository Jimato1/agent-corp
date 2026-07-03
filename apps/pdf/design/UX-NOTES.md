# pdf-forge — UX Interaction Notes (v1)

> Companion to `DESIGN-SYSTEM.md`. This maps the **interaction design** for the six locked flows (SCOPE §3) onto the design system: the board, the paper-sheet signature, the "press at work" amber, the press-blue selection model. It is the bridge between the visual tokens and the per-flow Claude Design prompts.
>
> **Read alongside:** `SCOPE.md` §3 (the six flows), §5 (non-negotiables — privacy, advisory permissions), `docs/API.md` (job lifecycle, error envelope).

## Conventions used in every flow below

**The five states** (named consistently): `empty` (no document / nothing to act on) · `loading` (client work in flight — pdf.js render, pdf-lib worker save) · `in-progress` (a server job is `queued`/`running` — the **amber press**) · `error` (a 4xx/5xx submit rejection or a `failed` job) · `success` (`succeeded` + a downloadable artifact).

**Privacy line (verbatim, reused):** any screen whose work is purely client-side carries a quiet `--ink-600` micro-label with a small shield glyph: **"Stays on this device — nothing uploaded."** It appears on flows A, B (until Export), and F's client tab. The moment bytes are about to leave (any `POST /api/jobs/*`), the label flips to a neutral `--ink-600` note: **"Uploading to your pdf-forge — over your LAN only."**

**The press lifecycle (shared by C, D, E, and B's Export, F's server tab).** Server work is `202 → poll GET /api/jobs/{id} (~1.5 s) → succeeded|failed`. There is **no real percentage** (no SSE in v1; `progress` may be `null`). It is rendered as the signature **"press at work"** treatment, never a fake progress bar:
- The worksurface **dims** (scrim `rgba(8,10,14,.6)`) and a **job readout card** centers on it (the only chrome allowed to cast — it is a dialog-class surface). Mono job id, op name, input filename + byte size (tabular).
- A warm **`--proc-500` amber sweep** pulses across the readout on a 1.6 s `--ease-press` loop (opacity .5↔1 + sweeping highlight) — "the press is pressing the document." Indeterminate **spinner, not a bar**.
- **Phase line** (drives off `state` + the optional `stage` hint): `Queued — waiting for a free press` → `Running — {stage}` (e.g. `validating`, `ghostscript`, `finalize`) → resolves. Phases are words, not numbers.
- **Cancel affordance:** a quiet `Cancel` control on the readout fires `DELETE /api/jobs/{id}`; on `200 {state:"canceled"}` the scrim lifts and a `--ink-600` toast says **"Job canceled. Nothing was kept."** (the job dir is `rmtree`d server-side).
- **Resolve — success:** amber sweep snaps to a single **`--ok-500` check**, scrim lifts, an **`--ok-tint` toast** drops, and the artifact appears as a row with a left **`--ok-500` rule**. Download is the default-focused action.
- **Resolve — failure:** amber → **`--err-tint` banner** with 3px `--err-500` left-border and the sanitized message + mono `code` (see each flow's Error voice). No stack trace ever.
- **prefers-reduced-motion:** no sweep/spin — a **static amber readout** with cycling `working…` text; resolution is a color/opacity crossfade only.

**Error envelope rendering (shared):** submit-time rejections (`413/415/400/422/429/507`) and `failed` jobs render in the **in-voice** copy below — calm, specific, instrument-like, branch on `error.code`, never show the HTTP number or engine stderr. Inline banner = `--err-tint` fill + 3px `--err-500` left rule + mono `code` token shown small and secondary (for the operator who wants it, not shoved at them).

---

## Flow A — Open / preview a PDF (client render, zero upload)

**Goal:** view and navigate a PDF entirely in-browser; nothing uploaded. Exercises #14; foundation for B and F.

### States
- **empty:** The worksurface is the recessed graphite board well with the faint 24px cutting-mat dot grid (off under reduce-data). Centered: the single empty-state **H1** (700, `--fs-h1`) "Drop a PDF to open it" + a dashed `--sub-500` drop target spanning the board, with the privacy micro-label beneath. Left rail shows the op list (quiet, instrumental). This is the only screen that earns the bold H1.
- **loading:** On drop, the board immediately lays out **blank `--paper-0` sheet placeholders** at the document's true page count + aspect (honor ISO ~1:1.414 / landscape) — sheets exist before pixels do. Each placeholder carries a faint center spinner; pdf.js fills faces lazily as they render. The board header populates instantly with doc name (mono) and `M pages` (tabular).
- **in-progress:** n/a — no server job in this flow.
- **error:** A non-PDF or corrupt local file never uploads; it fails in pdf.js. Quiet inline note on the drop target: **"That file didn't open as a PDF. It never left your device."** (reinforce privacy on the failure path).
- **success:** Sheets rendered on the board; a page-view (single large sheet, zoom/scroll) is reachable. Board header carries zoom slider (compact/comfortable/large widths 96/132/180px), select-all, and the `Export ▶` button (gateway to B). At 500 pages the board **virtualizes** (only visible sheets mount, lazy render, compact 96px/8px gap, right-edge mini-scrollbar with page ticks + pinned `page N of M` tabular).

### Multi-select & drag-reorder
View-only here, but selection is live so the operator can flow into B without a mode switch: click selects a single sheet (inset 2px `--press-500` + `--press-tint` wash + check tab); board uses **roving tabindex** (arrow keys move focus, focused sheet gets ring + subtle 1px lift). No drag commits anything until B.

### Undo
Nothing to undo (read-only). Closing/replacing the doc is a discrete action with a confirm only if edits exist (i.e., once in B).

### Long-running job progress
n/a.

### Error voice
- `415 not_a_pdf` / local open failure → **"That file didn't open as a PDF. It never left your device."**
- (Oversized local files are a B/C concern, not A — A never uploads.)

---

## Flow B — Organize pages client-side, then export via finalize

**Goal:** reorder (drag) / rotate 90° / delete pages, or small (<150 MB) merge/split locally, then `POST /api/jobs/finalize` for a durable linearized file. Exercises #1, #2, #15, #14. **This is the signature flow** — the board and the paper-handling personality live here.

### States
- **empty:** Inherits A's empty board (open a doc first). If the operator picks "Combine files" they get a multi-drop target reading **"Drop PDFs to combine — under 150 MB stays on this device."**
- **loading:** Page-model edits are instant (the page model is a lightweight in-memory list of {sourceDoc, pageIndex, rotation}); no spinner for reorder/rotate/delete. **Export** spins a `--proc-500`-adjacent client indicator while pdf-lib `save()` runs **in a Web Worker** — labeled **"Assembling pages…"** (this is client work, still zero upload until the bytes are built).
- **in-progress:** After the worker produces bytes, the **press lifecycle** begins (finalize is a real server job): readout shows `op: finalize`, phase `Running — finalize`. (Files ≥150 MB are intercepted *before* the worker with a note: **"This is large — pdf-forge will assemble it on the server instead,"** routing to flow C's merge/split.)
- **error:** Worker failure (rare, e.g. OOM on a huge client doc) → **"Couldn't assemble this in the browser. Try the server path for large files."** Finalize submit/job errors use the Error voice below.
- **success:** Press resolves to the `--ok-500` artifact row: mono filename, tabular byte size, `Download` (focused) + `Open result` (re-loads it into the board as a fresh read-only doc). Toast: **"Exported — linearized and cleaned."** (active content stripped per #15, stated plainly, not jargon-heavy).

### Multi-select & drag-reorder (the core of this flow)
- **Select:** click = single (2px `--press-500` inset + `--press-tint` 6% wash + press-blue check tab top-right). **Shift+click** = range-select, drawing a `--press-tint` **marquee** across the spanned sheets. **Ctrl/Cmd+click** = toggle one in/out of the set. Drag a marquee rectangle across empty board = rubber-band select. Header shows **"N selected"** (tabular) with bulk actions (rotate all / delete all). **Select all / none:** header control + `Ctrl+A` / `Esc`.
- **Keyboard:** roving tabindex; arrows move focus, `Space` toggles selection, `Shift+Arrow` extends range, `R` rotates selection 90° (`Shift+R` counter), `Delete` removes selection, `Ctrl+Z`/`Ctrl+Shift+Z` undo/redo.
- **Drag-reorder — single sheet:** picking up a sheet scales it to **1.04**, tilts **1.5°**, opacity .96, lifted shadow `0 10px 24px`, cursor `grabbing` — a page peeled off a stack. The origin slot becomes a dashed `--sub-500` ghost.
- **Drag-reorder — multi-page:** dragging any selected sheet carries the **whole selection as a fanned stack** (a small tabular count badge "N" on the lifted cluster); they reinsert contiguously at the drop point.
- **Drop-gap indicator:** a single **2px `--press-500` vertical insertion bar with end-caps** snaps into the gap where the page(s) will land; neighbors ease aside over 180ms `--ease-out`. Release settles with a short decelerating drop.
- **Edge auto-scroll:** dragging within ~48px of the board's top/bottom edge auto-scrolls the virtualized board, accelerating with proximity; stops at list ends.
- **Rotate:** rotates in place; the page chip gains **⟳ + `90°`** (mono). Honors true page aspect — a rotated landscape page visibly becomes portrait on the board.
- **reduced-motion:** no tilt/scale/ease-aside — the insertion bar appears **instantly** at the target gap; drop is instant.

### Undo (the page-model operation log)
- An **operation-log** over the lightweight page model. **Undoable:** reorder, rotate, delete, add-pages-from-merge, split-selection — each is one log entry; `Ctrl+Z` / `Ctrl+Shift+Z` step the stack. A small **"N edits · Undo"** affordance lives in the board header.
- **NOT undoable:** a **committed server finalize job** (once bytes are posted and the artifact exists, the page-model log no longer governs it — the artifact is server-durable). The UI states this at Export time only if there are pending edits: the Export button reads `Export N edits ▶`, making the commit point explicit. Deleting all pages is guarded (Export disabled with **"Add or keep at least one page"**).

### Long-running job progress
Standard **press lifecycle**. `finalize` is fast but still 202+poll; phase line typically `Queued` → `Running — finalize` → success. Cancel is offered but rarely needed.

### Error voice
- `413 file_too_large` → **"This file is over the 200 MB limit. Trim it or split it first."**
- `400 bad_pdf_structure` (a client-built byte stream that won't normalize) → **"pdf-forge couldn't finalize these pages. The assembled file looks malformed."** mono `bad_pdf_structure`.
- `429 queue_full` → **"Every press is busy right now. Retrying in {Retry-After}s…"** (auto-retry honoring `Retry-After`, with a manual `Retry now`).
- `507 disk_full` → **"Not enough working room on the server to finalize. Free some space and retry."**
- `failed` job (`engine_error`) → **"Finalize failed while normalizing the file. Your local pages are untouched — try Export again."**

---

## Flow C — Run a heavy server job (single-PDF result)

**Goal:** pick one op (merge-large / compress / encrypt / decrypt / permissions / linearize / repair / image-to-pdf / sanitize) → upload → 202 → poll → download one PDF. Exercises #3,#4,#6,#7,#9,#11,#12,#13,#15.

### States
- **empty:** Left rail = the op list; selecting an op opens the **right inspector** (300–340px) with that op's options form and a drop target. Worksurface center shows a single large sheet preview of the dropped input (pdf.js, zero upload until Submit) or, before a file is chosen, a quiet **"Choose a {op} input"** prompt. `image-to-pdf` shows an ordered image tray instead of a sheet.
- **loading:** Dropping a file renders its preview client-side (loading = blank sheet + spinner). Options validate inline.
- **in-progress:** On Submit the **press lifecycle** owns the screen — worksurface dims, amber readout, phase line driven by `state` + `stage` (e.g. compress shows `Running — ghostscript` then `Running — finalize`; repair shows `Running — repair` → `finalize`). Cancel via `DELETE`.
- **error:** Submit rejections and `failed` jobs per Error voice; the readout flips to the `--err-tint` banner in place, with `Try again` returning to the filled-in options (inputs preserved).
- **success:** `--ok-500` artifact row: mono result filename, tabular `bytes`, and op-specific `meta`. **Compress** surfaces the savings: `5.0 MB → 1.8 MB` (tabular, with a small `--ok-500` delta); when GS would have grown the file the row shows a `--warn-500` chip **"Kept your original — compression would have made it larger"** (`meta.kept:"input"`). `Download` is default-focused.

### Multi-select & drag-reorder
- Mostly single-input. **merge (large/encrypted):** a vertical **reorder tray** of input files in the inspector — drag to set merge order (same lifted-sheet affordance, scaled down to file rows; 2px `--press-500` insertion bar). **image-to-pdf:** an image tray, drag-reorder = page order; each tile honors its true aspect; a per-tile remove. Encrypted merge inputs get a per-row **password field** (mono dots) keyed to that file (`options.passwords`).

### Undo
No page-model log here (single transform). "Undo" = **don't submit / change options**; once submitted and `succeeded`, the artifact is server-durable and not reversible (re-run with different options instead). Removing a queued job = `DELETE` (cancel).

### Long-running job progress
Standard **press lifecycle**, with the richest `stage` mapping: `validating` → engine stage (`ghostscript` / `pikepdf` / `ocr` n/a here) → `finalize`. Compress/repair/sanitize/linearize can run long on big files — the amber sweep + cancel are the reassurance. No percentage; phase words only.

### Error voice
- `413 file_too_large` → **"This file is over the 200 MB limit."**
- `415 not_a_pdf` → **"That isn't a PDF — pdf-forge checks the file's contents, not its name."** (for `image-to-pdf`: **"That image type isn't supported. Use PNG, JPG, or TIFF."**)
- `400 bad_pdf_structure` → **"This PDF is too damaged to open. Try the Repair op first."** (and from Repair itself, at submit: **"This file is too broken to recover — it won't open at all."**)
- `422 invalid_options` / `out_of_range` → field-level: **"{field}: {what's wrong}"** (e.g. **"DPI must be between 72 and 600."**).
- `429 queue_full` → **"Every press is busy. Retrying in {Retry-After}s…"** (auto-retry + manual).
- `507 disk_full` → **"The server is low on working storage. Free some space and retry."**
- `failed`/`timeout` → **"This job hit the {N}s time limit and was stopped. Try a smaller file or fewer pages."**
- `failed`/`engine_error` → **"The {op} engine couldn't finish this file."** mono `engine_error`.

---

## Flow D — Multi-artifact job (zip + sidecar)

**Goal:** run an op whose result is several files — OCR-with-sidecar, split-by-ranges, multi-page rasterize → `artifacts[]` → download the zip or per-artifact `/result/{index}`. Exercises #5,#3-split,#8,#15.

### States
- **empty:** Op selected in rail; inspector shows the op's options. **split:** a `mode` selector (`ranges` / `every_n` / `single`) and a **range field** (mono, e.g. `1-10,11-20,21-end`) with live validation against the page count shown on the board. **rasterize:** `pages`, `dpi`, `format (png/jpeg/pdf)`. **ocr:** languages, deskew, **`sidecar` toggle** ("Add a .txt alongside the PDF").
- **loading:** Input preview renders client-side; for split, the board can **highlight each range as a colored band** of selected sheets so the operator sees the cut boundaries before submitting.
- **in-progress:** Standard **press lifecycle**. OCR shows `Running — ocr` (can be the longest job; per-page 120s timeout). The readout notes the expected output count when known (e.g. **"3 ranges → 3 files"**).
- **error:** Per Error voice; a bad range string is caught at submit (`422 out_of_range` / `invalid_options`).
- **success:** The artifact row **expands into an `artifacts[]` list** — one row per artifact with `index`, mono filename, media-type chip (`PDF` / `TXT` / `PNG`), tabular bytes, each with its own `Download` hitting `/result/{index}`. A top **"Download all (.zip)"** action hits `/result`. Each row carries the left `--ok-500` rule. OCR sidecar shows the pair plainly: `invoice-ocr.pdf` + `invoice.txt`.

### Multi-select & drag-reorder
- **rasterize / split** page selection reuses the board's full **multi-select** (click / shift-range / ctrl-toggle / marquee / select-all) to build the `pages` / `ranges` set visually — selecting sheets writes the mono range string and vice-versa (two-way bound). No drag-reorder (artifacts are derived, not arranged).

### Undo
Same as C — no page-model log; pre-submit option editing is the only "undo." Per-artifact `DELETE` discards the whole job's artifacts early (the result TTL also sweeps them → `expired`).

### Long-running job progress
Standard **press lifecycle**. Because output is multi-file, the success moment is the **artifacts list reveal**, not a single download — the readout resolves and the list animates in (crossfade under reduced-motion). Cancel via `DELETE` before resolve.

### Error voice
- `422 out_of_range` → **"Page {n} is past the end — this document has {M} pages."**
- `422 invalid_options` (bad range syntax) → **"Couldn't read that range. Use forms like 1-10, 12, 20-end."**
- `404 result_gone` (downloading an artifact after TTL expiry) → **"These results have expired and were cleared. Re-run the job to get them again."** mono `result_gone`.
- `429` / `507` / `413` / `415` / `400` / `failed timeout` → as in Flow C.

---

## Flow E — Crypto flow (encrypt / decrypt / permissions with password UX)

**Goal:** add/remove confidentiality or set advisory permissions, with explicit password handling. Exercises #6,#7,#15. The **advisory-permissions disclaimer** and the **wrong-password 422** path live here.

### States
- **empty:** Op selected (encrypt / decrypt / permissions); inspector shows the password/permission form. Password fields are **mono, masked as dots**, with a show/hide toggle (eye). **encrypt:** `user_password` (required, flagged) + optional `owner_password` + permission toggles. **decrypt:** single `password` (open password). **permissions:** print/modify/copy/annotate toggles + optional `owner_password`.
- **loading:** Input preview renders client-side. If the dropped input is itself encrypted, the board shows a **locked-sheet placeholder** (a sheet with a small lock glyph, faces unrendered) and a note **"This PDF is protected — enter its password to preview/operate."**
- **in-progress:** Standard **press lifecycle**; phase `Running — pikepdf` → `finalize` (encryption is applied in the same finalize save).
- **error:** **Wrong password** is the headline path — see Error voice; the password field gets an `--err-500` border and a **shake** (color-only under reduced-motion), focus returns to the field, value preserved so a typo is a one-character fix.
- **success:** Artifact row. **encrypt:** **"Encrypted with AES-256. This file now needs its password to open."** **decrypt:** **"Unlocked — the password has been removed."** **permissions:** the artifact row sits beneath the persistent advisory disclaimer (below).

### The advisory-permissions disclaimer (non-negotiable, #7 / SCOPE §5)
A persistent **`--warn-500`** notice in the permissions inspector (and echoed on the success row), plainly worded, not buried:
> **"Permissions are advisory.** They ask conforming readers to limit printing, copying, or editing — but an owner-password-only PDF still **opens for anyone**, and many tools ignore these flags. For real confidentiality, use Encrypt with a user password."

When the operator sets owner-only permissions without a user password, the disclaimer escalates to a `--warn-500` inline warning at submit: **"No user password set — this file will open for anyone."** (Submit still allowed; it's advisory, not an error.)

### Multi-select & drag-reorder
n/a (whole-document crypto). Permission toggles are a simple checked-state group (press-blue when on).

### Undo
No page-model log. The reversible "undo" is conceptual: decrypt reverses encrypt (with the password); there is **no client-side undo of a committed crypto job**. Wrong-password retries are unlimited (each is a fresh submit; nothing is kept server-side on failure).

### Long-running job progress
Standard **press lifecycle** (typically fast). The notable case is decrypt with a wrong password surfacing as either a submit-time `422` (preferred, instant) or a sanitized **`failed` job** — both render identically (Error voice below); the failed job's dir is `rmtree`d, nothing retained.

### Error voice
- `422 wrong_password` (decrypt) → field-level, calm: **"That password didn't unlock this PDF. Check it and try again."** mono `wrong_password`; field shake (reduced-motion: color only).
- `failed` (validation, wrong password not caught at submit) → same copy, surfaced on the readout instead of the field.
- encrypt with blank/missing `user_password` → blocked client-side before submit: **"Set a user password — without one there's nothing to unlock."**
- `413` / `415` / `400` / `429` / `507` → as in Flow C.

---

## Flow F — Extract text (read-only, no finalize)

**Goal:** pull plain text out of a PDF. Two paths: **client** (pdf.js, zero upload, instant preview/search) and **server batch** (`POST /api/jobs/extract-text` → `text/plain`, no PDF produced, no finalize). Exercises #10, #14.

### States
- **empty:** A two-tab inspector: **"Quick text (this device)"** (default) and **"Batch extract (server)"**. Quick-text empty = the privacy micro-label + "Open a PDF to read its text." Board shows the doc.
- **loading:** **Client path:** pdf.js extracts page text on the fly into a scrollable mono `--fs-data` text pane beside the board, with a live **find/highlight** box; matched runs highlight on both the text pane and the sheet faces. Loading = per-page text streams in as pages render (faint `extracting page N…` ticker). **Server path:** standard upload spinner before 202.
- **in-progress:** Client path has no server job. **Server path** uses the **press lifecycle** but lightweight: phase `Running — pdftotext`; no finalize phase (read-only op, explicitly no durable PDF).
- **error:** Client extraction of an image-only scan yields little/no text → quiet note: **"No selectable text found — this looks like a scan. Run OCR to make it searchable."** (links to flow C/D OCR). Server errors per Error voice.
- **success:** **Client:** text is just *there* in the pane, copyable, searchable — no artifact, no download moment (it never left the device). A `Copy all` and `Download .txt (local)` (built client-side, still zero upload). **Server:** `--ok-500` artifact row, mono filename `document.txt`, tabular bytes, `Download` → `text/plain`. Result row plainly notes **"Text only — no PDF was created."** (#10 DoD: response is not application/pdf, no finalize ran).

### Multi-select & drag-reorder
n/a for arrangement. The board's **page multi-select** can scope the server extract's `pages` option (select sheets → mono range string), same two-way binding as D.

### Undo
n/a (read-only; nothing mutates the document or page model). Switching tabs / changing page scope is the only reversible action.

### Long-running job progress
Server path = lightweight **press lifecycle**, no `finalize` phase. Cancel via `DELETE`. Success is a `.txt` download, not a PDF — the UI is careful never to imply a document was generated.

### Error voice
- `415 not_a_pdf` → **"That isn't a PDF."**
- `400 bad_pdf_structure` → **"This PDF won't open for text extraction. Try Repair first."**
- `422 out_of_range` (page scope) → **"Page {n} is past the end — this document has {M} pages."**
- empty result (valid PDF, no text layer) → **"No text found. This may be a scanned image — OCR can add a text layer."** (not an error banner; a `--warn-500` advisory).
- `429` / `507` / `413` / `failed timeout` → as in Flow C.

---

*This UX-NOTES.md is the per-flow interaction spec. The board, the lifted paper sheet, the press-blue insertion bar, and the amber "press at work" are the only bold moments; everything else stays quiet graphite + ink, responsive to ~375px, with visible focus rings, reduced-motion fallbacks, and AA contrast on every state.*
