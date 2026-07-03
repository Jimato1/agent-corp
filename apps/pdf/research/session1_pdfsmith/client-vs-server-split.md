# PDFsmith — Client vs. Server Split (Research Track)

**Scope:** Decide, per feature, whether work runs in the **browser** (pdf.js for rendering/extraction, pdf-lib for writing) or on the **backend** (FastAPI + pikepdf/pypdf/ocrmypdf/Ghostscript/poppler). Justify each, quantify data-transfer implications, resolve the "page ops run client-side" architecture claim, and recommend how a client-edited document reconciles with a server heavy-op.

**Bottom line up front:** The hybrid architecture is sound, but it rests on a correction the brief already anticipates: **pdf.js cannot write PDFs**. It is a renderer/extractor only. The real client-side *writer* is **pdf-lib** (pure JS, runs in-browser). pdf.js previews; pdf-lib mutates and serializes. Everything heavy, security-sensitive, or memory-unbounded (OCR, Ghostscript compression, robust AES, linearization, repair, PDF/A) stays on the backend. For reconciliation, **send the client-edited bytes to the backend** (not an operation manifest) — it is the only approach that survives the messy realities of PDFs.

---

## 1. The core correction: pdf.js renders, pdf-lib writes

This is the single most important architectural fact for this track.

**pdf.js (mozilla/pdf.js, shipped as `pdfjs-dist`)** is a *display* engine. Its own FAQ and maintainers are explicit: it is "primarily a PDF viewer and not a general editor." It can:

- Render pages to `<canvas>` / `OffscreenCanvas`.
- Build a selectable **text layer** via `page.getTextContent()`.
- Extract structure, metadata, outline, annotations, embedded files.
- Save *form field values and freshly-added annotations* back (the `PDFDocument.saveDocument()` path) — but the maintainers warn annotation persistence is partial and not a general editing facility.

pdf.js **cannot** reorder, rotate (persistently), delete, merge, or otherwise rewrite the PDF body and cross-reference table into a new valid file. Rotation in pdf.js is a *view transform*, not a saved `/Rotate` change.

**pdf-lib (`pdf-lib`, Hopding)** is the client-side *writer*. Pure JavaScript, **no native deps**, runs "in any JavaScript runtime, including browsers, Node, Deno, and even React Native." It can:

- `addPage` / `insertPage` / `removePage` — delete and reorder.
- `copyPages(srcDoc, [indices])` then `addPage`/`insertPage` — merge and arbitrary reordering across documents.
- `page.setRotation(degrees(90))` — persistent `/Rotate` (values -90/0/90/180/270; **additive**, so it accumulates if called twice — track absolute rotation in app state, don't blindly add).
- Draw text/vector/images, fill & read AcroForm fields, set metadata, add attachments.

**Resolution of the architecture's claim:** "reorder/rotate/delete run client-side" is **correct and recommended**, but the writer is **pdf-lib**, with **pdf.js only as the renderer for previews/thumbnails**. They are complementary, not interchangeable. The frontend loads the file once into both: pdf.js for the visual page grid, pdf-lib for the actual mutation + `doc.save()` → `Uint8Array` → download Blob.

> Gotcha: pdf-lib **refuses encrypted PDFs** — it throws `EncryptedPDFError`. `{ ignoreEncryption: true }` only suppresses the throw; it does **not** decrypt, and downstream operations on a still-encrypted document produce blank/garbage output (well-documented in pdf-lib issues #1296/#1326). So any client-side page op on an encrypted file must first be decrypted server-side (pikepdf). See §4 and Gotchas.

> Gotcha: pdf-lib does **not render**. There is no rasterization. You need pdf.js (or a WASM rasterizer) for any visual. This is why both libraries ship together.

---

## 2. The definitive client/server split table

| Feature | Where it runs | Engine / lib | Why | Data-transfer implication |
|---|---|---|---|---|
| **Page preview / thumbnails** | Browser | pdf.js (`render`, `OffscreenCanvas`) | Pure display; instant; no privacy exposure | Zero upload |
| **Text/structure extraction** (select, copy, search) | Browser | pdf.js `getTextContent()` | Already parsed for rendering; cheap | Zero upload |
| **Reorder pages** | **Browser** | pdf-lib `copyPages`+`insertPage` | Lightweight rewrite; latency-free; private | Zero upload |
| **Rotate pages** | **Browser** | pdf-lib `setRotation(degrees())` | Trivial dict change to `/Rotate` | Zero upload |
| **Delete pages** | **Browser** | pdf-lib `removePage` | Trivial | Zero upload |
| **Merge PDFs** | **Browser** (default) | pdf-lib `copyPages` across docs | No engine needed; private | Zero upload (both files already local) |
| **Split / extract page range** | **Browser** | pdf-lib | Subset of delete/copy | Zero upload |
| **Insert blank page / image page** | Browser | pdf-lib `addPage`, `drawImage` | Pure JS | Zero upload |
| **Fill / flatten simple AcroForm** | Browser | pdf-lib form API | Reads & fills fields client-side | Zero upload |
| **OCR (searchable text layer)** | **Backend** | ocrmypdf (Tesseract + rasterizer + Ghostscript) | No viable in-browser Tesseract pipeline at quality/scale; CPU-heavy; needs language data | Upload original, download OCR'd PDF (+optional sidecar `.txt`) |
| **Compression / optimization** | **Backend** | Ghostscript `-sDEVICE=pdfwrite -dPDFSETTINGS=…` | Image downsampling/recompression is CPU/RAM heavy and needs Ghostscript's device | Upload original, download smaller PDF |
| **Linearization ("fast web view")** | **Backend** | pikepdf `save(linearize=True)` (qpdf) | qpdf is the reference implementation; correctness-critical | Upload, download linearized |
| **Encrypt / set password (robust AES-256)** | **Backend** (recommended) | pikepdf `Encryption(aes=True, R=6)` | Correctness + consistency + large files; qpdf is battle-tested (client-side WASM exists but see §4) | Upload, download encrypted |
| **Decrypt / remove password** | **Backend** | pikepdf `open(password=…)` | pdf-lib cannot decrypt; qpdf can | Upload + password (over LAN/TLS), download |
| **Repair / recover damaged PDF** | **Backend** | pikepdf/qpdf (recovery), Ghostscript fallback | Requires tolerant C++ parsers; impossible in pdf-lib | Upload, download repaired |
| **Convert to PDF/A (archival)** | **Backend** | ocrmypdf `--output-type pdfa` / Ghostscript | Needs Ghostscript PDF/A profile + ICC; validation | Upload, download PDF/A |
| **Linearize+encrypt+permissions in one pass** | **Backend** | pikepdf single `save()` | One qpdf write does all three atomically | Upload, download |
| **Rasterize page → PNG/JPG, or PDF→images** | Backend (or browser for small) | poppler `pdftoppm` / pdf.js canvas | Browser fine for a few pages; server for bulk/large | Depends on size |
| **Extract embedded images / attachments** | Browser (small) / Backend (bulk) | pdf.js / poppler `pdfimages` | Cheap client-side for a few; server for archives | Mostly zero upload |
| **Heavy metadata/XMP rewrite, sanitize, flatten complex** | Backend | pikepdf | Low-level object access, robustness | Upload, download |

**Rule of thumb:** if the operation only touches the page tree / object dictionaries and stays under the memory threshold (§6), do it in the browser with pdf-lib. If it rasterizes, recompresses, runs an external binary, needs crypto correctness, or must tolerate broken input, send it to FastAPI.

---

## 3. What MUST be server-side, and exactly why

These have **no viable, responsible browser implementation** for a self-hosted product:

- **OCR — ocrmypdf.** It orchestrates a real pipeline: rasterize each page (default rasterizer is **pypdfium2**, Ghostscript fallback) → run **Tesseract** → graft an invisible text layer back → optionally normalize via Ghostscript. This needs Tesseract binaries + language `traineddata`, is CPU-bound (often multi-second to minutes per document), and benefits from the server's cores. `tesseract.js` (WASM) exists but is slow, single-threaded-ish, lacks the full ocrmypdf grafting/PDF-A pipeline, and would balloon the tab's memory on multi-page scans. **Keep on backend.** Useful flags: `--output-type pdf` (skip PDF/A), `--output-type pdfa` (archival), `--sidecar out.txt` (plain-text OCR dump, more reliable than re-extracting), `--rotate-pages`, `--deskew`, `--skip-text`/`--redo-ocr`/`--force-ocr` to control re-OCR behavior.

- **Compression — Ghostscript.** Real size reduction comes from **image downsampling + recompression**, which Ghostscript's `pdfwrite` device does via presets:

  | Preset (`-dPDFSETTINGS=`) | Target image DPI | Use case | Quality/size tradeoff |
  |---|---|---|---|
  | `/screen` | 72 dpi | On-screen, smallest | Most aggressive; visible degradation |
  | `/ebook` | 150 dpi | General sharing | **Best default** — good balance |
  | `/printer` | 300 dpi | Printing | Larger, near-original |
  | `/prepress` | 300 dpi, color-preserving | Pro print | Largest, preserves color fidelity |

  Example: `gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 -dPDFSETTINGS=/ebook -dDownsampleColorImages=true -dColorImageResolution=150 -dNOPAUSE -dQUIET -dBATCH -sOutputFile=out.pdf in.pdf`. Extra knobs: `-dRemoveUnusedResources=true`, `-dCompressFonts=true`, `-dSubsetFonts=true`. This is RAM/CPU heavy and impractical/irresponsible to ship as WASM to a tab. **Backend.** (Note: Ghostscript with `pdfwrite` *rewrites* the whole document — it can subtly change rendering; always offer a preview/undo.)

- **Robust AES encryption & decryption — pikepdf/qpdf.** pikepdf exposes `pikepdf.Encryption(user=…, owner=…, aes=True, R=6, allow=pikepdf.Permissions(...))`. `R=6` is the modern **AES-256** security handler (the default highest); `R=4` = AES-128; RC4 for legacy only. **pdf-lib cannot decrypt at all**, so password-protected inputs must pass through pikepdf first. Even for *encrypting*, the backend gives consistent, audited crypto and handles large files without tab limits. (Caveat: pikepdf/qpdf does **not** do certificate/digital-signature-based encryption.)

- **Linearization — pikepdf `save(linearize=True)`.** qpdf is the canonical linearizer; getting the hint tables and object ordering right is exactly the kind of correctness work you don't reimplement in JS.

- **Repair — qpdf/pikepdf (+ Ghostscript fallback).** Broken xref, truncated files, recovery: needs tolerant C++ parsers. pdf-lib and pdf.js both *reject* malformed input rather than repair it.

- **PDF/A — Ghostscript (via ocrmypdf `--output-type pdfa`).** Requires the PDF/A definition profile, ICC color handling, and validation. Browser-impractical.

- **Large-file handling generally.** Server streams from disk/temp; the browser must hold the whole `ArrayBuffer` (and rendered bitmaps) in tab memory (§6).

---

## 4. The "could be client-side" gray zone: qpdf-wasm

Worth naming honestly: **qpdf has been compiled to WebAssembly** (e.g. `neslinesli93/qpdf-wasm`, `jsscheller/qpdf-wasm`), and people have built **in-browser** page-organize, **unlock**, and **AES-256 password** tools with it, using an in-RAM virtual filesystem that discards files after processing. So "robust AES in the browser" is *technically* feasible.

**Recommendation for PDFsmith: still do encryption/linearization/repair on the backend.** Reasons:

1. You already run pikepdf (the same qpdf) server-side — duplicating it as WASM doubles the surface for one binary's behavior to diverge.
2. WASM-in-tab inherits the **2–4 GB per-tab memory ceiling**; a 500 MB encrypt can OOM the tab, whereas the server streams.
3. Self-hosted + LAN-only means the privacy argument for client-side crypto (avoid uploading to a third party) is weak — the "server" is the user's own homelab box. The privacy win that *does* matter (no upload latency, no temp files) is already captured for the lightweight pdf-lib ops.
4. Consistency: one code path for crypto/linearize is easier to test and secure than two.

Use qpdf-wasm only if you later want an **offline PWA** mode where the backend is unreachable. Note it for the roadmap, don't build on it now.

---

## 5. Reconciling a client-edited document with a server heavy-op

**The problem:** user reorders/rotates/deletes pages client-side (pdf-lib), then asks to OCR or compress (server). How does the server learn about the client edits?

Two designs:

**Option A — send the edited bytes.** Client runs `editedDoc.save()` → `Uint8Array`, POSTs that to FastAPI, server runs ocrmypdf/Ghostscript/pikepdf on it. **Recommended.**

**Option B — send an edit manifest / operation list.** Client keeps the *original* file (or its hash) and sends a JSON op-list (`[{rotate:90,page:2},{delete:5},{move:3→1}]`); server replays it with pikepdf, then runs the heavy op.

| | Option A: edited bytes | Option B: op manifest |
|---|---|---|
| Correctness | Single source of truth = exactly what the user saw | Two engines (pdf-lib vs pikepdf) must produce identical results; drift risk |
| Encrypted inputs | pdf-lib can't even open them → must decrypt server-side first anyway | Server has original; works |
| Upload size | Full edited PDF (often similar to original) | Tiny JSON **but** original still needs to be on the server |
| Where original lives | Nowhere extra | Must be uploaded once or cached server-side (state!) |
| Complexity | Low — one POST | High — versioned op schema, replay engine, conflict handling |
| Statelessness | Stateless backend | Needs the original bytes available → session/temp state |

**Recommendation: Option A — send the edited bytes.** It is stateless, has a single source of truth (no risk that pdf-lib's page-tree write and a pikepdf replay disagree), and the "tiny manifest" upload saving is illusory because Option B still has to get the original onto the server. The only real cost of A is re-uploading a document similar in size to the original — acceptable on a LAN, and only incurred when the user actually chooses a heavy op.

**Refinement that captures the best of both:** because pdf-lib's page-tree rewrites are cheap and lossless but its serializer is not a qpdf-grade writer, have the backend **always finish heavy jobs with a pikepdf normalization pass** (`pikepdf.open(uploaded).save(linearize=True)`), which cleans up object streams and produces a tidy file regardless of what pdf-lib emitted. So: client edits with pdf-lib → upload edited bytes → server heavy-op → pikepdf final pass → download. One pipeline, no manifest.

---

## 6. Memory: browser tab vs. server streaming, and where to draw the threshold

**Browser realities (from pdf.js issue tracker):**
- Chrome historically killed tabs near **~512 MB** for a single `arraybuffer` XHR; a 542 MB PDF reproduces this (#6802).
- Image-heavy/scanned PDFs balloon to **1 GB+** decoded in memory; fast scrolling through 100+ page docs triggers OOM in Safari/Chrome (#5342, #13110).
- Per-tab memory is effectively capped around **2–4 GB** depending on browser/OS/device; mobile is far lower.
- pdf-lib must hold the **entire** input `ArrayBuffer` plus the output document in memory simultaneously — roughly 2–3× the file size during a save.

**Server realities:** FastAPI + the engines stream from a temp file on disk; Ghostscript/qpdf/ocrmypdf are built to process documents larger than RAM and the homelab box has the cores. There is no 512 MB tab wall.

**Recommended thresholds (defaults; make configurable):**

| File size | Client-side page ops (pdf-lib) | Preview (pdf.js) | Recommendation |
|---|---|---|---|
| **< 50 MB** | Fine | Fine | Do all page ops in browser |
| **50–150 MB** | Usable but watch RAM, especially scanned | Render lazily, dispose pages | Browser OK on desktop; warn on mobile |
| **> 150 MB** | Risky (multiplied by save overhead) | Thumbnail subset only | **Offload page ops to backend** (pikepdf) too |
| **> ~300–500 MB** | Don't | Don't load whole file | Server-only; stream; never buffer in tab |

Implementation guidance: render previews lazily with `OffscreenCanvas` and **explicitly destroy** page objects (`page.cleanup()` / null references) — pdf.js is known to retain memory otherwise (#10021, #10451). Cap concurrent rendered pages. Gate the "edit in browser" path on `file.size` and a device-memory heuristic (`navigator.deviceMemory`), falling back to "this file is large — processing on the server" above ~150 MB.

---

## 7. Recommendations

1. **Adopt the two-library client model explicitly:** **pdf.js = renderer/extractor**, **pdf-lib = writer**. Document this everywhere so nobody tries to "save" from pdf.js.
2. **Run reorder / rotate / delete / merge / split / simple-form-fill in the browser with pdf-lib** for the < 150 MB common case — zero upload, zero latency, maximum privacy.
3. **Keep OCR, Ghostscript compression, linearization, AES encrypt/decrypt, repair, and PDF/A on the backend.** No browser equivalent is responsible at self-host scale.
4. **Reconcile client edits via Option A (upload edited bytes), then a pikepdf normalization pass** finishes every heavy job. No operation manifest.
5. **Always decrypt server-side first** for password-protected inputs — pdf-lib cannot, and `ignoreEncryption:true` corrupts output.
6. **Draw the browser/server size line at ~150 MB** (configurable), with a hard "server-only" cutoff around 300–500 MB to avoid tab OOM.
7. **Default compression preset = `/ebook` (150 dpi).** Expose `/screen`, `/printer`, `/prepress` as user choices with a size/quality preview.
8. **Default encryption = AES-256 (pikepdf `aes=True, R=6`).** Offer permissions via `pikepdf.Permissions`.
9. **Track absolute rotation in app state**, not by re-calling `setRotation` additively.
10. **Note qpdf-wasm on the roadmap** only as a future offline-PWA option; do not build crypto on it now.

## 8. Gotchas / pitfalls

- **pdf.js ≠ editor.** It cannot save a modified document body. Persisting only covers form values / new annotations, and even that is partial. Don't promise editing from pdf.js.
- **pdf-lib rejects encrypted PDFs** (`EncryptedPDFError`); `ignoreEncryption:true` does **not** decrypt — it yields blank/garbage output downstream. Decrypt with pikepdf first.
- **pdf-lib has no renderer.** You still need pdf.js (or a WASM rasterizer) for any pixels.
- **`setRotation` is additive** — accumulates on repeated calls; store absolute degrees.
- **Ghostscript `pdfwrite` rewrites the whole PDF.** It can change rendering, drop interactivity, or alter color; always keep the original and offer undo/preview. `/screen` can visibly degrade scans.
- **pdf-lib's serializer is not qpdf-grade.** Its output is valid but not optimized/linearized; finish important documents with a pikepdf pass.
- **Browser memory ceiling (~512 MB single buffer historically, ~2–4 GB per tab).** Large or scanned PDFs OOM the tab; pdf.js retains memory unless you explicitly clean up pages.
- **pikepdf/qpdf does not support certificate/digital-signature encryption** — only password-based (RC4/AES-128/AES-256). Set expectations.
- **OCR is slow and stateful-ish** (temp files, language data). Run it as a job with progress, not a synchronous request; expose a sidecar `.txt` option.
- **Double work risk in Option B (manifest):** pdf-lib and pikepdf can disagree on page-tree rewrites. Avoided by choosing Option A.
- **`copyPages` is required for cross-document merge** — you cannot just push a foreign `PDFPage`; it must be copied into the target's context first (pdf-lib issue #479).

## 9. Sources

- pdf.js FAQ / "viewer not editor": https://github.com/mozilla/pdf.js/wiki/frequently-asked-questions
- pdf.js "Save modified document" issue #15502: https://github.com/mozilla/pdf.js/issues/15502
- Nutrient — Complete guide to PDF.js (capabilities/limits): https://www.nutrient.io/blog/complete-guide-to-pdfjs/
- pdf-lib homepage (capabilities, runtimes): https://pdf-lib.js.org/
- pdf-lib PDFPage API (`setRotation`, `degrees`): https://pdf-lib.js.org/docs/api/classes/pdfpage
- pdf-lib npm (overview): https://www.npmjs.com/package/pdf-lib
- pdf-lib encrypted-doc issue #1296: https://github.com/Hopding/pdf-lib/issues/1296
- pdf-lib encrypted-doc issue #1326: https://github.com/Hopding/pdf-lib/issues/1326
- pdf-lib merge/reorder issue #479: https://github.com/Hopding/pdf-lib/issues/479
- Browser-based PDF organizer (pdf-lib, in-browser, no upload): https://www.freecodecamp.org/news/how-to-build-a-browser-based-pdf-organizer-tool-using-javascript
- JW Toolbox — merge/split/reorder in browser, no uploads: https://www.jwtoolbox.com/blog/how-to-merge-split-and-reorder-pdf-pages-in-your-browser
- pikepdf docs (main): https://pikepdf.readthedocs.io/en/latest/
- pikepdf tutorial (linearize, Encryption, Permissions examples): https://pikepdf.readthedocs.io/en/latest/tutorial.html
- pikepdf PyPI (qpdf, AES-256/128/RC4, linearization): https://pypi.org/project/pikepdf/
- pikepdf GitHub README: https://github.com/pikepdf/pikepdf/blob/main/README.md
- ocrmypdf docs — Introduction (rasterizer pypdfium2/Ghostscript, PDF/A, Tesseract): https://ocrmypdf.readthedocs.io/en/latest/introduction.html
- ocrmypdf Cookbook (`--output-type`, `--sidecar`, re-OCR flags): https://ocrmypdf.readthedocs.io/en/stable/cookbook.html
- Ghostscript — Optimizing PDFs (PDFSETTINGS presets): https://ghostscript.com/blog/optimizing-pdfs.html
- Ghostscript CLI optimization (preset DPI, switches) — Transloadit: https://transloadit.com/devtips/efficient-pdf-optimization-with-ghostscript-cli/
- qpdf-wasm (browser qpdf): https://github.com/neslinesli93/qpdf-wasm
- QPDF WASM page-organize / unlock / AES in browser (DEV): https://dev.to/linmingren/organizing-pdf-pages-reordering-rotating-and-removing-with-qpdf-wasm-2728
- pdf.js memory: 500MB+ crash #6802: https://github.com/mozilla/pdf.js/issues/6802
- pdf.js memory: scrolling OOM #5342: https://github.com/mozilla/pdf.js/issues/5342
- pdf.js memory: high usage / cleanup #13110: https://github.com/mozilla/pdf.js/issues/13110
- pdf.js memory retention / cleanup #10451: https://github.com/mozilla/pdf.js/issues/10451
