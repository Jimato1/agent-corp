# pdf-forge — v1 Scope Lock (authoritative)

This document is the **single source of truth** for what pdf-forge v1 is and is not. It sits on top of `PLAN.md`, `docs/DECISIONS.md`, `docs/API.md`, `docs/STRUCTURE.md`, and `research/SUMMARY.md`, and **overrides** all of them wherever they conflict on scope. The build session may implement only what is locked here; anything not in §1 is out of v1 by §2, and every implementation choice must satisfy the invariants in §5.

---

## 1. Locked Features (v1 MUST)

Exactly these 15 rows ship in v1 — the 14 MUST features plus the canonical finalize write-path. Nothing else is in scope.

| # | Feature | Where it runs | Engine (D8) | Definition of done (observable, user-facing) | API endpoint |
|---|---|---|---|---|---|
| 1 | Reorder / rotate / delete pages | Client → server finalize | pdf-lib (write), pdf.js (preview) | User drags pages into a new order, rotates a page 90°, and deletes a page in the browser, clicks Export, and downloads a single PDF whose page order, rotation, and page set match the edits and which opens as a linearized file. | client edit; `POST /api/jobs/finalize` |
| 2 | Merge (small) / split (small) | Client → server finalize | pdf-lib `copyPages` | User selects two PDFs < 150 MB, merges them (or splits one by page ranges) in the browser, exports, and downloads a linearized PDF (merge) or set of PDFs (split) with the correct combined/divided page counts. | client edit; `POST /api/jobs/finalize` |
| 3 | Merge / split (large or encrypted) | Server | pikepdf | User submits multiple large or password-protected PDFs to merge (or one to split by ranges); after upload→202→poll→download they receive a merged `application/pdf` or a `application/zip` of split PDFs with correct page counts, with any encrypted input transparently decrypted server-side first. | `POST /api/jobs/merge`, `POST /api/jobs/split` |
| 4 | Compress (lossy, `/ebook` 150 dpi) | Server | Ghostscript | User uploads a PDF and downloads a linearized PDF that is smaller than the input (or byte-identical to the input when GS would have grown it, reported as `meta.kept:"input"`), with raster images downsampled to 150 dpi. | `POST /api/jobs/compress` |
| 5 | OCR (searchable PDF) | Server | ocrmypdf (Tesseract) | User uploads a scanned/image-only PDF and downloads a PDF over which text can be selected and `pdftotext` now yields the recognized text; with the sidecar option on, the result is a zip containing the OCR'd PDF plus a `.txt`. | `POST /api/jobs/ocr` |
| 6 | Encrypt / decrypt (AES-256, R=6) | Server | pikepdf (pypdf AES fallback for encrypt; pikepdf only for decrypt) | For encrypt: user supplies a user (and optional owner) password and downloads a PDF that fails to open without the password and opens with it. For decrypt: user supplies the correct password and downloads a clean, linearized, password-free PDF; a wrong/absent password yields a `422 wrong_password` or a sanitized failed job. | `POST /api/jobs/encrypt`, `POST /api/jobs/decrypt` |
| 7 | Set / clear permissions (advisory) | Server | `pikepdf.Permissions` | User toggles print/modify/copy/annotate flags and downloads a PDF whose permission bits match the request when inspected with pikepdf/qpdf; the UI plainly labels the permissions as advisory (and warns owner-only PDFs still open for anyone). | `POST /api/jobs/permissions` |
| 8 | Rasterize pages (→ image / image-only PDF) | Server | poppler `pdftocairo` / `pdftoppm` | User selects pages, a DPI, and a format and downloads: a single `image/png`/`image/jpeg` for one page, a zip of images for multiple pages, or — for `format:"pdf"` — a linearized image-only ("flattened") PDF. | `POST /api/jobs/rasterize` |
| 9 | Image → PDF | Server | Ghostscript (img2pdf lossless add-on) | User uploads one or more allow-listed images (`.png/.jpg/.jpeg/.tif/.tiff`) and downloads a single linearized PDF with one page per image; `lossless:true` routes non-CMYK/non-alpha inputs through the img2pdf path. | `POST /api/jobs/image-to-pdf` |
| 10 | Extract text (batch) | Both | poppler `pdftotext` (server); pdf.js (client quick text) | User requests text extraction and receives a `text/plain` document matching the PDF's text content; no PDF is finalized or returned. Client-side pdf.js provides the same text for in-app preview/search with zero upload. | `POST /api/jobs/extract-text` |
| 11 | Sanitize / strip metadata + XMP + attachments | Server | pikepdf | User runs one-click Sanitize and downloads a linearized PDF with Info dictionary, XMP metadata, embedded files/attachments, and active content all removed (verifiable with pikepdf/qpdf), that still opens normally. | `POST /api/jobs/sanitize` |
| 12 | Linearize (web optimize) | Server | pikepdf | User uploads a PDF and downloads a byte-equivalent-content PDF that is linearized for fast web view (verifiable with `qpdf --check`/linearization flag), with active content stripped. | `POST /api/jobs/linearize` |
| 13 | Repair / recover | Server | pikepdf (libqpdf tolerant parser) | User uploads a structurally damaged-but-openable PDF (broken xref, etc.) and downloads a valid, linearized PDF that opens cleanly; a file too broken to open is rejected at submit with `400 bad_pdf_structure`. | `POST /api/jobs/repair` |
| 14 | Preview / thumbnails | Client | pdf.js (poppler server render = internal fallback only) | User opens a PDF and sees rendered page thumbnails and a page view in the browser with no bytes uploaded; there is no public preview/thumbnail HTTP endpoint. | client only; no public endpoint |
| 15 | **Finalize (canonical write path)** | Server | pikepdf | Posting client-edited bytes returns a normalized, `linearize=True` PDF with `/JavaScript /JS /OpenAction /AA /Launch` always stripped and embedded files preserved (verifiable with pikepdf/qpdf); this is the single durable write path every other op's output also passes through. | `POST /api/jobs/finalize` |

Endpoint accounting (API §10): 15 locked rows map to **14 `POST /api/jobs/{op}`** submission ops (reorder/rotate/delete and small merge/split are client edits made durable via `finalize`, so they share endpoints) plus **5 lifecycle/health endpoints** (`GET /api/health`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/result`, `GET /api/jobs/{id}/result/{index}`, `DELETE /api/jobs/{id}`) = **19 endpoints total**. No more.

---

## 2. Explicitly Out of Scope (v1)

Every item below is named so none is silently built. If a feature is not in §1, it is not in v1.

### Deferred (SHOULD — post-v1, directional only; NOT built in v1)
- **Image stamps / signatures** — pure image-overlay onto a page (pikepdf or client pdf-lib). Ship-first of the SHOULD tier post-v1. **NOT in v1.**
- **Watermark / Bates numbering / page numbers** — repeated generated text/marks across pages (reportlab overlay, OQ#1). **NOT in v1.**
- **Typed Fill & Sign (overlay, no crypto)** — typed text/initials placed as an overlay, not PKI (reportlab, OQ#1). **NOT in v1.**
- **Add text box** — free-text annotation rendered to page content (reportlab, OQ#1). **NOT in v1.**
- **Static AcroForm fill + durable flatten** — server-side field fill and reliable flatten (Ghostscript primary / pdfcpu fallback, behind a spike, OQ#3). Client pdf.js form fill is convenience-only and non-durable; **not built as a v1 feature.**
- **PDF/A-2b as a user feature + veraPDF validation** — user-selectable PDF/A output with veraPDF conformance check (OQ#4). ocrmypdf's `output_type:"auto"` may incidentally emit PDF/A, but PDF/A is **not surfaced as a user feature** and veraPDF stays an off-by-default optional Docker stage. **NOT in v1.**
- **Destructive redaction** — poppler raster + pikepdf scrub to permanently remove content (OQ#2). Rasterize (#8) is its foundation but redaction itself is **NOT in v1.**
- **SSE / WebSocket job progress** — push progress instead of polling (D1). v1 is poll-only. **NOT in v1.**

### Later / Out (NOT built in v1; some never)
- **PKI / PAdES cryptographic signing** (pyHanko) — untrusted without AATL in a homelab. **OUT for v1.**
- **PDF → Office conversion** (LibreOffice headless, single-flight) — experimental, not thread-safe. **OUT for v1.**
- **PDF compare** (pixel-diff + text-diff) — not "Acrobat Compare." **OUT for v1.**
- **Reflowable text editing** — no locked engine supports it. **OUT.**
- **Full PDF/UA auto-tagging** — out of scope. **OUT.**
- **JS forms / XFA** — XFA deprecated in PDF 2.0; pdf.js renders it experimentally only. **OUT.**
- **Certificate / public-key encryption** — qpdf/pikepdf are password-based only. **OUT.**
- **True text-level redaction / MuPDF (6th engine, AGPL)** — destructive rasterization is accepted for v1 instead. **OUT for v1.**

### Opt-in hardening (deferred; NOT default or built in v1)
- **Multi-user ACLs / per-user job isolation** (OQ#9) — v1 is single-tenant with per-job temp-dir isolation only. **NOT in v1.**
- **gVisor / runsc worker sandbox** (OQ#7) — v1 ships the full standard container posture; gVisor is documented opt-in only. **NOT in v1.**
- **Renovate / automated base-image auto-rebuild** (OQ#10) — v1 ships pinned digests + documented monthly scheduled CI rebuild; auto-apply is ops guidance only, **not a v1 deliverable.**

---

## 3. User Flows (v1)

These are the distinct, non-overlapping end-to-end flows v1 supports; they are the unit of design next session. Each lists a one-line goal, ordered UI action → system response steps, and the locked features it exercises.

### A — Open / preview a PDF (client render, zero upload)
**Goal:** view and navigate a PDF entirely in the browser without uploading anything.
1. User drops/opens a PDF → SPA loads bytes into the in-memory page model (no network).
2. pdf.js renders the page canvas and thumbnails → user scrolls/zooms/navigates pages.
- **Exercises:** #14 (preview/thumbnails). Foundation for flows B and F.

### B — Organize pages client-side, then export via finalize
**Goal:** reorder/rotate/delete pages or do a small merge/split locally, then get a durable file.
1. From an opened doc (flow A), user reorders (drag), rotates, deletes pages, or combines/splits files < 150 MB → page model updates live in the browser.
2. User clicks Export → pdf-lib `save()` runs in a Web Worker producing edited bytes (files ≥ 150 MB instead route to server merge/split, flow C).
3. SPA `POST`s edited bytes to `/api/jobs/finalize` → 202 → poll → download a normalized, linearized PDF.
- **Exercises:** #1, #2, #15 (and #14 for the live preview).

### C — Run a heavy server job (upload → 202 → poll → download)
**Goal:** apply one server-side transform that returns a single PDF.
1. User picks an op (merge (large/encrypted) / compress / encrypt / decrypt / permissions / linearize / repair / image-to-pdf / sanitize) and any options, drops the file(s) → SPA submits `multipart/form-data` to `POST /api/jobs/{op}`.
2. Server validates (disk → size → 3-stage → options → capacity), enqueues → returns **202 + Location**.
3. SPA polls `GET /api/jobs/{id}` (~1.5 s, spinner) until `succeeded`/`failed`.
4. On `succeeded`, SPA downloads `GET /api/jobs/{id}/result` (`application/pdf`).
- **Exercises:** #3 (merge), #4, #6, #7, #9, #11, #12, #13, #15 (every server PDF passes finalize).

### D — Multi-artifact job (zip + sidecar)
**Goal:** run an op whose result is several files (OCR with sidecar, range split, multi-page rasterize).
1. User submits OCR (sidecar on), a split-by-ranges, or a multi-page rasterize via `POST /api/jobs/{op}`.
2. Server runs the engine → finalize per PDF artifact → returns 202; SPA polls to `succeeded`.
3. Result descriptor carries an `artifacts[]` array; SPA downloads the zip via `/result`, or individual artifacts via `GET /api/jobs/{id}/result/{index}`.
- **Exercises:** #5 (OCR sidecar), #3 (split), #8 (multi-page rasterize), #15.

### E — Crypto flow (encrypt / decrypt / permissions with password handling)
**Goal:** add or remove confidentiality, or set advisory permissions, with explicit password UX.
1. User chooses encrypt (enter user + optional owner password), decrypt (enter open password), or permissions (toggle flags + optional owner password) → submits to the matching `POST /api/jobs/{op}`.
2. Server applies encryption/permissions **in the same finalize save** (decrypt-first for inputs) → 202 → poll → download.
3. UI surfaces the advisory-permissions disclaimer and the wrong-password (`422`/failed job) path.
- **Exercises:** #6 (encrypt/decrypt), #7 (permissions), #15.

### F — Extract text (read-only, no finalize)
**Goal:** pull plain text out of a PDF.
1. Client path: pdf.js extracts text in-browser for quick preview/search (zero upload).
2. Server batch path: user submits `POST /api/jobs/extract-text` → 202 → poll → download `text/plain`. No PDF is produced and finalize is not run.
- **Exercises:** #10 (and #14 for the client preview).

---

## 4. Acceptance Criteria

One objectively verifiable pass/fail check per locked row (drawn from PLAN §3 milestone DoDs and API §8). "Verify" means a status code, a file property checked with pikepdf/qpdf/pdftotext, or an observable UI result — never "works correctly."

- [ ] **#1 Reorder/rotate/delete:** In the browser, reorder pages, rotate one page 90°, delete one page → Export → the downloaded PDF's page order, `/Rotate`, and page count match the edits, and `qpdf --check` reports it linearized.
- [ ] **#2 Small merge/split:** Merge two < 150 MB PDFs in-browser → downloaded PDF page count == sum of inputs. Split one by ranges → outputs have the exact ranged page counts. Both open linearized.
- [ ] **#3 Server merge/split:** `curl` merge two PDFs (one encrypted, password supplied) → 202 → poll `succeeded` → result page count == sum; split by `["1-10","11-20","21-end"]` → zip with 3 artifacts fetchable at `/result/0..2`.
- [ ] **#4 Compress:** `curl -F file=@scan.pdf -F options='{"preset":"ebook","color_dpi":150}' …/compress` → 202 → `succeeded`; result `bytes` < input (or `meta.kept:"input"`), output linearized, images at 150 dpi.
- [ ] **#5 OCR:** `curl …/ocr` on an image-only PDF → `pdftotext` on the result yields the page's text; with `sidecar:true` the result is a zip with the PDF at `/result/0` and `.txt` at `/result/1`.
- [ ] **#6 Encrypt/decrypt:** Encrypt with user+owner password → output fails to open without the password and opens with it (verify via pikepdf). Decrypt with the correct password → password-free linearized PDF; wrong password → `422 wrong_password` or sanitized failed job.
- [ ] **#7 Permissions:** Set `{"extract":false,"modify":false,"print":"low"}` → pikepdf shows those permission bits on the output; UI renders the advisory disclaimer.
- [ ] **#8 Rasterize:** `…/rasterize` page 1 at 150 dpi `format:png` → `image/png`; multi-page → `application/zip`; `format:"pdf"` → linearized image-only PDF.
- [ ] **#9 Image→PDF:** `…/image-to-pdf` on 3 PNGs → single PDF with 3 pages; `lossless:true` on non-CMYK/non-alpha inputs uses the img2pdf path; output linearized.
- [ ] **#10 Extract text:** `…/extract-text` → `text/plain` whose content matches the document; response is not `application/pdf` and no finalize runs. Client pdf.js shows the same text with no network call.
- [ ] **#11 Sanitize:** `…/sanitize` → output has no Info/XMP metadata, no `/EmbeddedFiles`, no active content (verify with pikepdf/qpdf), and still opens.
- [ ] **#12 Linearize:** `…/linearize` on a non-linearized PDF → `qpdf --check` reports the output linearized; active content stripped.
- [ ] **#13 Repair:** `…/repair` on a PDF with a deliberately broken xref → valid linearized output that opens; a file that fails stage-3 structural open is rejected at submit with `400 bad_pdf_structure`.
- [ ] **#14 Preview/thumbnails:** Open a PDF in the browser → thumbnails + page view render with zero network requests; no public `/api` preview endpoint exists (a request to one 404s / is absent from the 19-endpoint contract).
- [ ] **#15 Finalize:** `curl` a PDF carrying `/OpenAction`+`/JavaScript` through `…/finalize` → output has that active content stripped and embedded files preserved (verify with `qpdf --json`/pikepdf); output linearized.
- [ ] **Harness (cross-cutting, gates all of the above):** oversized upload → `413 file_too_large`; `.txt` renamed `.pdf` → `415 not_a_pdf`; truncated PDF → `400 bad_pdf_structure`; saturated pool+queue → `429 queue_full` + `Retry-After`; `DELETE` running job → `canceled` + job dir removed; expired result → `404 result_gone`; disk precheck → `507 disk_full`.

---

## 5. Non-Negotiables

These invariants hold regardless of feature work. Any change that violates one is out of scope.

- **(a) PRIVACY.** Files never leave the LAN. Client-side ops (preview/thumbnails, page-model edits, quick text) upload **nothing**. No telemetry, no analytics, no cloud round-trips. The worker process has **no network egress**. Logs carry no document content (`core/logging.py`).
- **(b) TEMP-FILE LIFECYCLE.** Every job gets a per-job `mkdtemp(dir=/app/jobs, mode=0700)` directory on the **disk-backed named volume** (never tmpfs). On-disk names are **server-generated** (`input.pdf`); the client filename is stored only as a string for `Content-Disposition` and is never used as a path component. Cleanup is guaranteed in the worker `finally`/response `BackgroundTask`, with an **hourly TTL janitor** (`PDFFORGE_JOB_TTL_SECONDS=3600`) as the orphan backstop (→ `expired`).
- **(c) UPLOAD VALIDATION.** A **streaming byte counter** enforces `PDFFORGE_MAX_UPLOAD_MB=200` → `413` (never trusts `Content-Length`). Validation is **3-stage in fixed order**: extension allow-list → magic bytes (libmagic, first ~2 KB) → **structural pikepdf/libqpdf open as the authority** (libmagic is only a filter; polyglots pass it). The client `Content-Type` is a hint, never trusted.
- **(d) RESOURCE BOUNDS.** A **bounded queue** in front of a 1–2 worker `ProcessPoolExecutor` rejects over-capacity submits with `429 + Retry-After` (never entering `queued`). Every subprocess is bounded: wall-clock timeout + `os.killpg(getpgid, SIGKILL)` (kills gs/tesseract grandchildren), `setrlimit` (CPU/FSIZE), engine knobs (`ocrmypdf --jobs 1 --tesseract-timeout 120 --skip-big`), and container limits (`--cpus 2 --memory 2g --pids-limit 512`) as the hard backstop. Disk precheck (`free < 4× MAX_UPLOAD`) → `507`.
- **(e) CANONICAL ARTIFACT.** Every durable output exits through the pikepdf **normalize + `save(linearize=True)`** finalize pass. Active content (`/JavaScript /JS /OpenAction /AA /Launch`) is **always stripped**. Embedded files/attachments are preserved by default and removed only by explicit Sanitize (and, later, redaction). Encrypted inputs are **decrypted with pikepdf first**; for encrypt/permissions the encryption is applied **in the same save**. Read-only ops (extract-text, rasterize-to-image) do not finalize.
- **(f) LOCKED STACK (does not change in v1).**
  - **Backend:** Python 3.13, FastAPI ≥ 0.138.0 (`app.frontend("/")`, all `/api/*` registered first), `uvicorn app.main:app`, pydantic-settings (`PDFFORGE_` prefix); async `202 + poll` job model (no SSE).
  - **Frontend:** Vite + React 19 SPA, pdf.js (render; `isEvalSupported:false`, `enableScripting:false`), pdf-lib (client write, Web Worker), `@dnd-kit/core` 6.3.1.
  - **Engines:** pikepdf (libqpdf bindings only — **no qpdf CLI / no apt qpdf**), Ghostscript, ocrmypdf/Tesseract (eng+deu), poppler-utils, pypdf (AES-256 encrypt fallback), jbig2enc (built from source).
  - **Base image:** `node:22-slim` (build) → `python:3.13-slim-trixie` (builder + runtime), Debian trixie slim — **not** Alpine, **not** distroless, **no nginx sidecar**. Non-root UID 10001, read-only rootfs, `cap_drop ALL`, `no-new-privileges`, internal Docker network with **no published host port**; auth at the reverse proxy (forward-auth headers read for audit only). All bases pinned by digest.

---

## 6. Resolved Ambiguities / Conflicts

The earlier docs are substantially consistent. The following points were ambiguous, mismatched, or could invite scope drift; each is resolved here, and this resolution is authoritative.

1. **`rasterize` engine naming drift.** SUMMARY §2/§4 lists `pypdfium2` (and `ocrmypdf --force-ocr`) as the rasterize owner, while DECISIONS D8, API §5.1, and STRUCTURE §1.1 lock **poppler `pdftocairo`/`pdftoppm`**. **Resolved:** v1 rasterize is **poppler only**; `pypdfium2` is not a v1 rasterize engine (it remains only an ocrmypdf transitive dependency). pikepdf is the lossless image-*extraction* owner with `pdfimages` as fallback.

2. **Apt `qpdf` and `pypdfium2`/`fpdf2` in the packaging snapshot.** SUMMARY §6 still lists `qpdf` in the apt set and names `pypdfium2`/`fpdf2` as bundled. DECISIONS D6/D8/OQ#15 and STRUCTURE §3 **drop apt `qpdf`** (pikepdf bundles libqpdf). **Resolved:** **no apt `qpdf`**; qpdf functionality is via pikepdf bindings only. `pypdfium2`/`fpdf2` exist only as ocrmypdf wheel dependencies, not as first-class pdf-forge engines.

3. **veraPDF "bundled now" vs. deferred.** DECISIONS D6/OQ#4 say "stage veraPDF in the image now"; STRUCTURE §3.5 keeps it an optional, off-by-default stage because it needs a ~150–200 MB JRE. **Resolved (STRUCTURE wins):** veraPDF is **not built into the v1 image** and PDF/A is **not a v1 user feature**; it stays an opt-in Docker stage for the deferred PDF/A SHOULD.

4. **Rasterize engine fallback list ("ocrmypdf --force-ocr", "pdftoppm").** SUMMARY §4 lists multiple fallbacks. **Resolved:** v1 uses `pdftocairo` with `pdftoppm` as the only fallback; `ocrmypdf --force-ocr` is **not** a rasterize path in v1.

5. **`reorder` as a possible server op.** STRUCTURE §1.2 explicitly notes `reorder` is **not** a server op. Confirmed: reorder/rotate/delete and small merge/split are **client edits made durable via `finalize`** — there is no `POST /api/jobs/reorder`. The 14 `{op}` values are exactly: `finalize, merge, split, compress, ocr, encrypt, decrypt, permissions, rasterize, image-to-pdf, extract-text, sanitize, linearize, repair`.

6. **No endpoints beyond the 19.** Scanned API.md and STRUCTURE.md: there is **no `/api/documents`** (D7 stateless, confirmed in API §3.1), **no `/api/ready`** (STRUCTURE §1.1 confirms only `/api/health`), and **no public preview/thumbnail endpoint** (server poppler render is an internal fallback only, API §9 / STRUCTURE §1.2). The endpoint set is frozen at the 19 in API §10.

7. **Prior audit fixes confirmed still in place.** The env-var/timeout/preview-router drift noted as previously fixed remains fixed: `PDFFORGE_*` knobs and defaults are consistent across API §1.6, STRUCTURE §6, and the compose file (`MAX_UPLOAD_MB=200`, `WORKER_COUNT=1`, `QUEUE_MAXSIZE=8`, `JOB_TIMEOUT_SECONDS=300`, `OCR_TIMEOUT_SECONDS=120`, `JOB_TTL_SECONDS=3600`, `DISK_RESERVE_FACTOR=4`, `VITE_CLIENT_SERVER_THRESHOLD_MB=150`); the per-job wall-clock (300 s) and OCR per-page (120 s) timeouts do not contradict; and `api/preview.py` is absent (no preview router). No new drift found.

8. **No deferred items with lingering v1 hooks.** The `services/`, `engines/`, and `schemas/` folder maps (STRUCTURE §1) carry **no** SHOULD/LATER modules (no reportlab, no pdfcpu, no pyHanko, no LibreOffice, no MuPDF, no redaction service). `pypdf_engine.py`'s "form-fill canonical, later" note is directional only and ships no v1 form-fill. Rasterize is described as a "redaction foundation" but redaction itself is not wired. These are acceptable forward-looking notes, not v1 code paths.

---

*This SCOPE.md is the gate. Locked rows: **15**. Resolved ambiguities/conflicts: **8**.*
