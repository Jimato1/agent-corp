# pdf-forge — Client vs. Server Split (Research Track)

**Scope.** For every feature, decide whether work runs in the **browser** (pdf.js for rendering/extraction, pdf-lib for writing) or on the **backend** (FastAPI + pikepdf / pypdf / ocrmypdf / Ghostscript / poppler). Justify each, quantify the data-transfer implication, resolve the "page ops run client-side" architecture claim, identify what *must* be server-side and why, recommend a reconciliation strategy for client-edited documents, and set a concrete browser-vs-server size threshold.

**Bottom line up front.**
- The hybrid architecture is correct, but it depends on one fact the brief already flags: **pdf.js cannot write PDFs.** It renders and extracts; it does not serialize a modified document body. The client-side *writer* is **pdf-lib** (pure JS, in-browser). pdf.js previews, pdf-lib mutates and saves.
- Run **reorder / rotate / delete / merge / split / simple form-fill** in the browser with pdf-lib for the common (<~150 MB) case: zero upload, zero latency, maximum privacy.
- Keep **OCR, Ghostscript compression, linearization, robust AES, repair, PDF/A, and all large/broken files** on the backend. None has a responsible browser equivalent at self-host scale.
- Reconcile client edits by **uploading the edited bytes** (not an operation manifest), then finishing every heavy job with a **pikepdf normalization pass**. One stateless pipeline.

---

## 1. The core correction: pdf.js renders, pdf-lib writes

This is the single most important architectural fact for this track, and it holds up under a second pass.

**pdf.js** (`mozilla/pdf.js`, shipped as `pdfjs-dist`; latest release **v5.4.449, Nov 2025**) is a *display* engine. It can:

- Render pages to `<canvas>` / `OffscreenCanvas`.
- Build a selectable **text layer** via `page.getTextContent()`.
- Extract structure, metadata, outline, annotations, embedded files.
- Since the v4/v5 line it ships a **limited annotation editor** (free-text, highlight, stamp, ink, signature) and a `saveDocument()` path that writes those edits + form-field values back. **Caveat (verified):** these annotations are HTML overlays and "may not save properly into the PDF binary" for other readers — persistence is partial and editor-scoped, not a general body rewrite.

pdf.js **cannot** reorder, persistently rotate, delete, merge, or otherwise rewrite the page tree + xref into a new valid file. Rotation in the viewer is a *view transform*, not a saved `/Rotate` change.

**pdf-lib** (`pdf-lib`, Hopding) is the client-side *writer*. Pure JavaScript, **no native deps**, runs in any JS runtime (browser/Node/Deno/RN). It can:

- `addPage` / `insertPage` / `removePage` — delete and reorder.
- `copyPages(srcDoc, [indices])` then `addPage`/`insertPage` — merge and cross-document reorder.
- `page.setRotation(degrees(n))` — persistent `/Rotate`. **See the corrected semantics in §8.**
- Draw text/vector/images, fill & read AcroForm fields, set metadata, add attachments.

**Resolution of the architecture's claim.** "reorder/rotate/delete run client-side" is **correct and recommended**, with **pdf-lib as the writer** and **pdf.js only as the renderer** for previews/thumbnails. The frontend loads the file into both: pdf.js for the visual page grid, pdf-lib for the mutation + `doc.save()` → `Uint8Array` → download Blob.

> **Gotcha — pdf-lib refuses encrypted PDFs.** It throws `EncryptedPDFError`. `{ ignoreEncryption: true }` only suppresses the throw; it does **not** decrypt, and downstream ops on a still-encrypted doc produce blank/garbage output (pdf-lib #1296/#1326). Any client-side page op on an encrypted file must be decrypted server-side (pikepdf) first.

> **Gotcha — pdf-lib does not render.** No rasterization. You always need pdf.js (or a WASM rasterizer) for pixels. That is why both libraries ship together.

---

## 2. The definitive client/server split table

| Feature | Where | Engine / lib | Why | Data-transfer implication |
|---|---|---|---|---|
| **Page preview / thumbnails** | Browser | pdf.js (`render`, `OffscreenCanvas`) | Pure display; instant; private | Zero upload |
| **Text/structure extraction** (select, copy, search) | Browser | pdf.js `getTextContent()` | Already parsed for rendering; cheap | Zero upload |
| **Reorder pages** | **Browser** | pdf-lib `copyPages`+`insertPage` | Lightweight page-tree rewrite; no latency | Zero upload |
| **Rotate pages** | **Browser** | pdf-lib `setRotation(degrees())` | Single `/Rotate` dict change | Zero upload |
| **Delete pages** | **Browser** | pdf-lib `removePage` | Trivial | Zero upload |
| **Merge PDFs** | **Browser** (default) | pdf-lib `copyPages` across docs | No engine needed; both files local | Zero upload |
| **Split / extract page range** | **Browser** | pdf-lib | Subset of copy/delete | Zero upload |
| **Insert blank / image page** | Browser | pdf-lib `addPage`, `drawImage` | Pure JS | Zero upload |
| **Fill / flatten simple AcroForm** | Browser | pdf-lib form API | Reads & fills fields client-side | Zero upload |
| **Annotate** (highlight/ink/text/signature, view-scoped) | Browser | pdf.js annotation editor + `saveDocument()` | Built-in editor; but overlay-based — see §8 | Zero upload |
| **OCR (searchable text layer)** | **Backend** | ocrmypdf (Tesseract; pypdfium2 raster) | No responsible in-browser pipeline; CPU-heavy; needs language data | Upload original, download OCR'd PDF (+ optional `.txt` sidecar) |
| **Compression / optimization** | **Backend** | Ghostscript `pdfwrite` + `-dPDFSETTINGS` | Image downsample/recompress is RAM/CPU heavy; needs the device | Upload, download smaller PDF |
| **Linearization (fast web view)** | **Backend** | pikepdf `save(linearize=True)` (qpdf) | qpdf is the reference implementation | Upload, download linearized |
| **Encrypt / set password (AES-256)** | **Backend** | pikepdf `Encryption(aes=True, R=6)` | Crypto correctness + large files; one audited path (WASM exists — see §4) | Upload, download encrypted |
| **Decrypt / remove password** | **Backend** | pikepdf `open(password=…)` | pdf-lib cannot decrypt; qpdf can | Upload + password (LAN/TLS), download |
| **Repair / recover damaged PDF** | **Backend** | pikepdf/qpdf (recovery), Ghostscript fallback | Needs tolerant C++ parsers | Upload, download repaired |
| **Convert to PDF/A (archival)** | **Backend** | ocrmypdf `--output-type pdfa` (pypdfium2 + verapdf; GS fallback) | Needs PDF/A profile, ICC, validation | Upload, download PDF/A |
| **Linearize + encrypt + permissions in one pass** | **Backend** | pikepdf single `save()` | One qpdf write does all three atomically | Upload, download |
| **Rasterize page → PNG/JPG** | Browser (few) / Backend (bulk) | pdf.js canvas / poppler `pdftoppm` | Browser fine for a handful; server for bulk/large | Depends on size |
| **Extract embedded images / attachments** | Browser (few) / Backend (bulk) | pdf.js / poppler `pdfimages` | Cheap client-side for a few; server for archives | Mostly zero upload |
| **Heavy metadata/XMP rewrite, sanitize** | Backend | pikepdf | Low-level object access, robustness | Upload, download |

**Rule of thumb.** If the op only touches the page tree / object dictionaries and stays under the §6 memory threshold, do it in the browser with pdf-lib. If it rasterizes, recompresses, runs an external binary, needs crypto correctness, or must tolerate broken input — send it to FastAPI.

---

## 3. What MUST be server-side, and exactly why

These have **no viable, responsible browser implementation** for a self-hosted product.

- **OCR — ocrmypdf.** Orchestrates a real pipeline: rasterize each page → run **Tesseract** → graft an invisible text layer back → optionally normalize. Needs Tesseract binaries + `traineddata`, is CPU-bound (seconds to minutes per document), and benefits from server cores. `tesseract.js` (WASM) exists but is slow, lacks the grafting/PDF-A pipeline, and balloons tab memory on multi-page scans. Useful flags: `--output-type pdf` (skip PDF/A), `--output-type pdfa` (force archival), `--sidecar out.txt` (plain-text dump), `--rotate-pages`, `--deskew`, and `--skip-text` / `--redo-ocr` / `--force-ocr` to control re-OCR.
  **v17 update (verified, current 17.7.x):**
  - Default **`--rasterizer auto`** prefers **pypdfium2** (Chrome's pdfium engine) over Ghostscript, generally identical output with better performance.
  - Default **`--output-type`** is now **`auto`** (was `pdfa`): it speculatively produces PDF/A and validates with **verapdf**, falling back when a file can't be made compliant.
  - **Ghostscript is no longer strictly required** — pypdfium2 + verapdf cover the common path, with GS reserved as a fallback. (Still ship GS in the container for compression and as the OCR/PDF-A fallback.)

- **Compression — Ghostscript `pdfwrite`.** Real size reduction = **image downsampling + recompression** via presets:

  | `-dPDFSETTINGS=` | Image DPI target | Use | Tradeoff |
  |---|---|---|---|
  | `/screen` | 72 dpi | On-screen, smallest | Most aggressive; visible degradation |
  | `/ebook` | 150 dpi | General sharing | **Best default** — balanced |
  | `/printer` | 300 dpi | Printing | Larger, near-original |
  | `/prepress` | 300 dpi, color-preserving | Pro print | Largest, color fidelity |

  Example: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dPDFSETTINGS=/ebook -dDownsampleColorImages=true -dColorImageResolution=150 -dNOPAUSE -dQUIET -dBATCH -sOutputFile=out.pdf in.pdf`. Extra knobs: `-dRemoveUnusedResources=true`, `-dCompressFonts=true`, `-dSubsetFonts=true`.
  **Verified caveat from Ghostscript's own docs:** `pdfwrite` *rebuilds* the document — "the actual operations written … may not be the same as the original," output can be *more verbose/larger*, and **some metadata is not carried through**. Always keep the original and offer preview/undo; `/screen` can visibly degrade scans. RAM/CPU heavy and irresponsible as a tab-side WASM job. **Backend.**

- **Robust AES encryption / decryption — pikepdf/qpdf.** `pikepdf.Encryption(user=…, owner=…, aes=True, R=6, allow=pikepdf.Permissions(...))`. **Verified default:** pikepdf selects the strongest handler — **R=6 = AES-256** — by default; `R=4` = AES-128 (or RC4-128); `R=3/2` = legacy RC4. **pdf-lib cannot decrypt at all**, so password-protected inputs must pass through pikepdf first. Even for *encrypting*, the backend gives consistent audited crypto and handles large files without tab limits. (qpdf does **not** do certificate / digital-signature encryption — password-based only.)

- **Linearization — pikepdf `save(linearize=True)`.** qpdf is the canonical linearizer; hint tables and object ordering are exactly what you don't reimplement in JS.

- **Repair — qpdf/pikepdf (+ GS fallback).** Broken xref, truncated files, recovery: needs tolerant C++ parsers. pdf-lib and pdf.js *reject* malformed input rather than repair it.

- **PDF/A — ocrmypdf `--output-type pdfa` (pypdfium2 + verapdf; GS fallback).** Needs the PDF/A definition profile, ICC color, and validation. Browser-impractical.

- **Large files generally.** Server streams from a temp file on disk; the browser must hold the whole `ArrayBuffer` plus rendered bitmaps in tab memory (§6).

---

## 4. The "could be client-side" gray zone: qpdf-wasm

Worth naming honestly: **qpdf is compiled to WebAssembly** and **actively maintained** — `@neslinesli93/qpdf-wasm` (updates into 2026) and `@jspawn/qpdf-wasm` on npm. People have built **in-browser** page-organize, **unlock**, and **AES-256 password** tools with it, using an in-RAM virtual FS that discards files after processing. So "robust AES in the browser" is *technically* feasible today.

**Recommendation for pdf-forge: still do encryption / linearization / repair on the backend.**

1. You already run pikepdf (the same qpdf) server-side — a WASM copy doubles the surface for one binary to diverge.
2. WASM-in-tab inherits the **~2 GB ArrayBuffer ceiling** (§6); a 500 MB encrypt can OOM the tab, whereas the server streams.
3. Self-hosted + LAN-only means the privacy argument for client-side crypto (avoid third-party upload) is weak — the "server" is the user's own homelab box. The privacy win that *does* matter (no upload, no temp files) is already captured by the lightweight pdf-lib ops.
4. Consistency: one crypto/linearize code path is easier to test and secure than two.

Reserve qpdf-wasm for a future **offline-PWA** mode where the backend is unreachable. Note it on the roadmap; don't build crypto on it now.

---

## 5. Reconciling a client-edited document with a server heavy-op

**The problem.** A user reorders/rotates/deletes pages client-side (pdf-lib), then asks to OCR or compress (server). How does the server learn about the client edits?

| | **Option A: edited bytes** | **Option B: op manifest** |
|---|---|---|
| Correctness | Single source of truth = exactly what the user saw | Two engines (pdf-lib vs pikepdf) must replay identically; drift risk |
| Encrypted inputs | pdf-lib can't open them → must decrypt server-side first anyway | Server holds original; works |
| Upload size | Full edited PDF (≈ original) | Tiny JSON **but** original must already be on server |
| Where original lives | Nowhere extra | Must be uploaded once / cached server-side (state!) |
| Complexity | Low — one POST | High — versioned op schema, replay engine, conflict handling |
| Statelessness | Stateless backend | Needs original bytes available → session/temp state |

**Recommendation: Option A — upload the edited bytes.** It is stateless, has a single source of truth (no risk that pdf-lib's page-tree write and a pikepdf replay disagree), and the "tiny manifest" saving is illusory because Option B still has to get the original onto the server. The only real cost of A is re-uploading a document similar in size to the original — fine on a LAN, and only incurred when the user actually picks a heavy op.

**Refinement that captures the best of both:** because pdf-lib's page-tree rewrites are cheap and lossless but its serializer is not a qpdf-grade writer, **always finish heavy jobs with a pikepdf normalization pass** (`pikepdf.open(uploaded).save(linearize=True)`), which rebuilds object streams and emits a tidy file regardless of what pdf-lib produced. Pipeline: **client edits with pdf-lib → upload edited bytes → server heavy-op → pikepdf final pass → download.** One pipeline, no manifest.

---

## 6. Memory: browser tab vs. server streaming, and where to draw the line

**Browser realities (verified):**
- The hard ceiling is the **`ArrayBuffer` max ≈ 2 GB** — Chrome caps a single buffer at `0x7fe00000` (~2.146 GB); Firefox historically capped near 2 GB and only later allowed larger buffers in 64-bit processes. DOM APIs remain limited around 2 GB. MDN advises keeping a buffer's `maxByteLength` **well under 1 GB** to avoid OOM.
- pdf.js historically killed tabs near **~512 MB** for a single `arraybuffer` XHR (#6802); image-heavy/scanned PDFs balloon to **1 GB+ decoded** and trigger OOM while scrolling (#5342, #13110). pdf.js also retains memory unless you explicitly clean up pages (#10451).
- pdf-lib must hold the **entire** input `ArrayBuffer` plus the output document simultaneously — roughly **2–3× file size** during a save.

**Server realities (verified):** FastAPI's `UploadFile` is backed by Starlette's `SpooledTemporaryFile` with a **~1 MB spool threshold** — anything larger automatically spills to a temp file on disk, so the server does **not** buffer large uploads in RAM (as long as you stream rather than calling `.read()` into a single `bytes`). Ghostscript/qpdf/ocrmypdf are built to process documents larger than RAM, and the homelab box has the cores. No 512 MB / 2 GB tab wall. (Best practice: stream chunked writes with `aiofiles`, and point `tempfile.tempdir` at a roomy volume.)

**Recommended thresholds (defaults; make configurable):**

| File size | Client page ops (pdf-lib) | Preview (pdf.js) | Recommendation |
|---|---|---|---|
| **< 50 MB** | Fine | Fine | All page ops in browser |
| **50–150 MB** | Usable; watch RAM (scans) | Render lazily, dispose pages | Browser OK on desktop; warn on mobile |
| **> 150 MB** | Risky (×2–3 on save) | Thumbnail subset only | **Offload page ops to backend (pikepdf) too** |
| **> ~300–500 MB** | Don't | Don't load whole file | Server-only; stream; never buffer in tab |

Implementation: render previews lazily with `OffscreenCanvas`, **explicitly destroy** page objects (`page.cleanup()` / null refs), cap concurrent rendered pages, and gate the "edit in browser" path on `file.size` + a device heuristic (`navigator.deviceMemory`), falling back to server processing above ~150 MB.

---

## 7. Recommendations

1. **Adopt the two-library client model explicitly:** **pdf.js = renderer/extractor**, **pdf-lib = writer**. Document it so nobody tries to "save" from pdf.js. The pdf.js annotation editor is fine for view-scoped markup but is overlay-based — don't treat it as a body rewrite.
2. **Run reorder / rotate / delete / merge / split / simple form-fill in the browser with pdf-lib** for the <150 MB common case — zero upload, zero latency, max privacy.
3. **Keep OCR, Ghostscript compression, linearization, AES encrypt/decrypt, repair, and PDF/A on the backend.** No responsible browser equivalent at self-host scale.
4. **Reconcile client edits via Option A (upload edited bytes), then a pikepdf normalization pass** finishes every heavy job. No operation manifest.
5. **Always decrypt server-side first** for password-protected inputs — pdf-lib can't, and `ignoreEncryption:true` corrupts output.
6. **Draw the browser/server line at ~150 MB** (configurable), hard "server-only" cutoff ~300–500 MB to avoid tab OOM; keep client buffers well under 1 GB.
7. **Default compression preset = `/ebook` (150 dpi).** Expose `/screen`, `/printer`, `/prepress` with a size/quality preview, and warn that `pdfwrite` rebuilds the file and may drop some metadata.
8. **Default encryption = AES-256** (pikepdf `aes=True, R=6` — already the default). Offer permissions via `pikepdf.Permissions`.
9. **For rotation, set absolute = existing + delta:** read `page.getRotation().angle` and add your delta before `setRotation` (see §8). Don't assume the page starts at 0.
10. **Pin ocrmypdf ≥17 and rely on its new defaults** (`--rasterizer auto` → pypdfium2, `--output-type auto` → speculative PDF/A + verapdf). Still ship Ghostscript in the container as the compression engine and OCR/PDF-A fallback.
11. **Note qpdf-wasm on the roadmap** only as a future offline-PWA option; don't build crypto on it now.

---

## 8. Gotchas / pitfalls

- **pdf.js ≠ editor.** It cannot save a modified document body. Its annotation editor (free-text/highlight/stamp/ink/signature) persists via `saveDocument()` but as HTML overlays that may not embed cleanly for other readers. Don't promise general editing from pdf.js.
- **pdf-lib `setRotation` semantics — CORRECTED.** `setRotation` sets an **absolute** value, but it does **not** account for a page's pre-existing `/Rotate`. It does *not* "accumulate across calls" — the real bug is that it ignores baked-in rotation. Correct usage:
  ```js
  const current = page.getRotation().angle;          // existing /Rotate
  page.setRotation(degrees((current + delta) % 360)); // apply delta correctly
  ```
  Track the absolute target in app state and always derive from `getRotation()`.
- **pdf-lib rejects encrypted PDFs** (`EncryptedPDFError`); `ignoreEncryption:true` does **not** decrypt — yields blank/garbage downstream. Decrypt with pikepdf first.
- **pdf-lib has no renderer.** You still need pdf.js (or WASM) for any pixels.
- **Ghostscript `pdfwrite` rebuilds the whole PDF.** Output operations may differ / be more verbose, some metadata is dropped, rendering/interactivity can change. Keep the original; offer undo/preview. `/screen` visibly degrades scans.
- **pdf-lib's serializer is not qpdf-grade.** Valid but not optimized/linearized — finish important docs with a pikepdf pass.
- **Browser memory:** ~2 GB `ArrayBuffer` ceiling (Chrome `0x7fe00000`), historical ~512 MB pdf.js XHR wall, ×2–3 file size during a pdf-lib save, and pdf.js retains memory unless pages are explicitly cleaned up.
- **qpdf has no certificate / digital-signature encryption** — password-based RC4/AES-128/AES-256 only. Set expectations.
- **OCR is slow and stateful-ish** (temp files, language data). Run it as a job with progress, not a synchronous request; expose the `--sidecar` `.txt` option.
- **`copyPages` is required for cross-document merge** — you can't push a foreign `PDFPage`; it must be copied into the target's context first (pdf-lib #479).
- **FastAPI uploads:** `UploadFile` spools to disk after ~1 MB, but if you call `.read()` into a `bytes` you pull the whole file into RAM — stream in chunks (`aiofiles`) for large files and set `tempfile.tempdir`.

---

## 9. Changes vs. session 1

- **CORRECTED — `setRotation` is not "additive."** Session 1's gotcha said it "accumulates if called twice." Verified reality (pdf-lib docs + onebite write-up): `setRotation` sets an **absolute** value and **ignores the page's existing `/Rotate`**. The fix is to read `getRotation().angle` and add the delta — the opposite framing from "accumulates." Updated §1, §7, §8.
- **ADDED — ocrmypdf v17 default changes.** Session 1 noted pypdfium2 as default rasterizer (correct) but predates/omits two v17 shifts: **`--output-type` default is now `auto`** (speculative PDF/A validated by **verapdf**, not forced `pdfa`), and **Ghostscript is no longer strictly required**. Updated §2, §3, §7.
- **ADDED — pdf.js annotation editor.** Session 1 said persistence is "partial." Made concrete: current pdf.js (v5.4.449, Nov 2025) ships a real but overlay-based editor for five annotation types via `saveDocument()` that may not embed cleanly for other readers. Added a table row and §8 note.
- **CONFIRMED — pikepdf default = AES-256 (R=6).** Independently verified against pikepdf docs: it selects the strongest handler (R=6/AES-256) by default; R=4 = AES-128/RC4-128; R=2/3 legacy RC4.
- **REFINED — browser memory ceiling.** Session 1 leaned on the historical ~512 MB pdf.js XHR figure. Added the harder, current number: single-`ArrayBuffer` max ≈ **2 GB** (Chrome `0x7fe00000`), with MDN's advice to stay well under 1 GB. Thresholds unchanged.
- **ADDED — concrete FastAPI/Starlette upload behavior.** `UploadFile` is a `SpooledTemporaryFile` with a **~1 MB** spool threshold → large uploads spill to disk automatically, corroborating "server streams, no tab wall." Added streaming/`tempfile.tempdir` guidance (§6).
- **CONFIRMED — qpdf-wasm is real and maintained** (`@neslinesli93/qpdf-wasm` into 2026, plus `@jspawn/qpdf-wasm`); recommendation to keep crypto server-side stands. Updated package names in §4.
- **CONFIRMED — Ghostscript `pdfwrite` rebuild caveat** with a primary-source quote (operations may differ/be larger; some metadata dropped). Strengthened §3/§8.
- **CONFIRMED — everything else** (pdf.js renders / pdf-lib writes split, the feature table, Option A reconciliation + pikepdf finishing pass, the must-be-server list, `/ebook` default, `copyPages` for merge). These held up and are retained.

---

## 10. Sources

- pdf.js FAQ (viewer not editor): https://github.com/mozilla/pdf.js/wiki/frequently-asked-questions
- pdf.js releases (v5.4.449, annotation editor): https://github.com/mozilla/pdf.js/releases
- pdf.js API (getTextContent, saveDocument): https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib.html
- Nutrient — Complete guide to PDF.js: https://www.nutrient.io/blog/complete-guide-to-pdfjs/
- pdf-lib homepage: https://pdf-lib.js.org/
- pdf-lib PDFPage API (`setRotation`, `getRotation`, `degrees`): https://pdf-lib.js.org/docs/api/classes/pdfpage
- pdf-lib rotation-of-previously-rotated-page (absolute, not additive): https://onebite.dev/rotation-on-a-previously-rotated-page-on-pdflib-not-correctly-handled/
- pdf-lib encrypted-doc issues #1296 / #1326: https://github.com/Hopding/pdf-lib/issues/1296
- pdf-lib cross-document merge issue #479: https://github.com/Hopding/pdf-lib/issues/479
- pikepdf tutorial (linearize, Encryption, Permissions, R=6 default): https://pikepdf.readthedocs.io/en/latest/tutorial.html
- pikepdf main API: https://pikepdf.readthedocs.io/en/latest/api/main.html
- pikepdf PyPI: https://pypi.org/project/pikepdf/
- ocrmypdf Introduction (rasterizer auto/pypdfium2, output-type auto, GS optional): https://ocrmypdf.readthedocs.io/en/latest/introduction.html
- ocrmypdf v17 release notes: https://ocrmypdf.readthedocs.io/en/latest/releasenotes/version17.html
- ocrmypdf Cookbook (`--output-type`, `--sidecar`, re-OCR flags): https://ocrmypdf.readthedocs.io/en/latest/cookbook.html
- Ghostscript — Optimizing PDFs (presets, pdfwrite rebuild caveat): https://ghostscript.com/blog/optimizing-pdfs.html
- qpdf-wasm (neslinesli93): https://github.com/neslinesli93/qpdf-wasm
- @jspawn/qpdf-wasm (npm): https://www.npmjs.com/package/@jspawn/qpdf-wasm
- qpdf-wasm browser unlock/encrypt walkthrough (DEV): https://dev.to/linmingren/building-a-browser-based-pdf-unlock-tool-with-qpdf-webassembly-361a
- ArrayBuffer max size (Chrome 0x7fe00000): https://issues.chromium.org/issues/40055619
- MDN ArrayBuffer (keep maxByteLength < 1 GB): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer/ArrayBuffer
- pdf.js memory crash #6802: https://github.com/mozilla/pdf.js/issues/6802
- pdf.js scrolling OOM #5342: https://github.com/mozilla/pdf.js/issues/5342
- pdf.js high memory / cleanup #13110: https://github.com/mozilla/pdf.js/issues/13110
- FastAPI Request Files (UploadFile / SpooledTemporaryFile): https://fastapi.tiangolo.com/tutorial/request-files/
- FastAPI streaming gigabyte uploads (chunked, aiofiles): https://medium.com/@connect.hashblock/async-file-uploads-in-fastapi-handling-gigabyte-scale-data-smoothly-aec421335680
