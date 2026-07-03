# PDFsmith — Engine Capabilities, Limits & Operation Ownership

Research track: **engine-capabilities**. Scope: exact capabilities, limits, and gotchas of the
server-side PDF engines available to PDFsmith — **pikepdf** (qpdf bindings), **pypdf**,
**ocrmypdf** (Tesseract), and **Ghostscript** — plus where **poppler-utils** and **pdf.js** fit.
The deliverable is opinionated: a clear owner per operation, with fallbacks and the code-level
gotchas that bite in production.

Context reminder: PDFsmith is a single self-hosted Docker container, FastAPI backend serving a
Vite/React + pdf.js frontend. Architecture is **hybrid**: fast page-level ops (reorder, rotate,
delete, preview) run client-side in pdf.js; heavy jobs (OCR, compression, linearization,
encryption, repair) POST to the backend. This document covers the *backend* engines plus the
client/server split decision for each op.

---

## 1. Engine-by-engine assessment

### 1.1 pikepdf (Python bindings over qpdf / libqpdf)

**What it is.** A Pythonic wrapper around the C++ **qpdf** library. It manipulates PDF *structure*
(the object graph, xref tables, streams, encryption dictionaries) with correctness as the priority.
Current line is 10.x (e.g. 10.9.1). It is the spiritual successor recommended over the dead PyPDF2
(see py-pdf/pypdf#647).

**Good at:**
- **Structural integrity & repair** — qpdf reconstructs broken xref tables and recovers damaged
  files. `Pdf.open()` silently repairs many malformed files on load.
- **Encryption / decryption** — full control of the security handler: RC4 and **AES-256 (R6)**,
  per-permission flags, opening password-protected files, and *removing* encryption on save.
- **Linearization** — `Pdf.save(linearize=True)` produces "fast web view" output (qpdf-equivalent
  of `qpdf --linearize`).
- **Lossless structural optimization** — object streams, stream compression, normalization,
  splitting/merging, page tree surgery.
- **Lossless image extraction** — `pikepdf.PdfImage` extracts embedded images preserving the
  encoded bytes.
- **Metadata** — robust XMP + DocInfo editing via `pikepdf.models.PdfMetadata` (`pdf.open_metadata()`).

**Cannot / should not do:**
- **No text extraction.** By design — it doesn't interpret content streams into text. Use pypdf,
  pdf.js, or poppler (`pdftotext`).
- **Not a generation/layout library.** Can't lay out new text/graphics from scratch; it copies and
  rearranges existing objects. Use reportlab/fpdf2 for synthesis.
- **No digital signatures** (explicitly: "pikepdf does not support digital signatures at this time").
- **No rasterization / rendering.** No raster of pages to images.

**Performance.** Fast — heavy lifting is compiled C++. Memory scales with document complexity since
it builds an object model; very large files load the whole structure. Generally the fastest option
for pure structural ops.

**Version/maintenance caveats.** Actively maintained, ships manylinux/musllinux/macOS/Windows wheels
(no need to compile qpdf in the container). Pin a minor version — qpdf bumps occasionally change
linearization/object-stream byte output. The bundled libqpdf version determines available encryption
handlers, so the wheel's qpdf version matters for AES-256/R6.

### 1.2 pypdf (pure Python)

**What it is.** A pure-Python (zero C dependency) toolkit for page-level manipulation. Current line
6.x (e.g. 6.14.2). PyPDF2 is merged back into pypdf and deprecated — **use `pypdf`, not PyPDF2**.

**Good at:**
- **Page manipulation without native deps** — merge, split, crop, rotate, reorder, delete, N-up,
  transform pages.
- **Text & metadata extraction** — `page.extract_text()` (quality is "good enough", not Acrobat-grade).
- **Forms (AcroForm)** — read/fill/flatten form fields; better form story than pikepdf.
- **Light encryption** — can add a password; supports reading RC4 and AES-encrypted files and writing
  encryption, but the implementation is pure-Python and slower/less battle-tested than qpdf's.
- **Easy to install** — no wheels-with-binaries headaches; trivial in any container.

**Cannot / should not do:**
- **Not for repair.** Pure-Python parser is less tolerant of malformed files than qpdf; it is *not*
  the recovery tool.
- **Not a rendering or generation library** (no raster; limited synthesis).
- **Weaker on hardened encryption** — for AES-256/R6 correctness and decryption robustness, prefer
  pikepdf.

**Performance.** Pure Python → slower than pikepdf/qpdf on large files, but page reorder/merge of
typical office documents is fine. Lower install/runtime footprint.

**Version/maintenance caveats.** Very active, huge install base, lots of StackOverflow history. API
changed across the PyPDF2→pypdf 3.x→6.x transitions (`PdfReader`/`PdfWriter` are the current classes;
old `PdfFileReader` is gone). Write against current pypdf docs, not ancient PyPDF2 snippets.

### 1.3 ocrmypdf (orchestrator around Tesseract + Ghostscript + qpdf/pikepdf + unpaper + pngquant + jbig2enc)

**What it is.** Not a single engine — an **orchestration pipeline** that adds a searchable text layer
to scanned PDFs and optionally produces PDF/A. Current line 17.x (e.g. 17.7.1). It is the right tool
for OCR; do not hand-roll Tesseract+overlay yourself.

**What it delegates to (important for the Dockerfile):**
- **Tesseract** — the actual OCR.
- **Ghostscript** — PDF/A conversion and (optionally) rasterization.
- **pikepdf / libqpdf** — PDF assembly/repair (modern ocrmypdf depends on pikepdf, *not* the `qpdf`
  CLI directly).
- **unpaper** — `--clean` / `--clean-final` image cleanup.
- **pngquant** — lossy paletted-image quantization at `-O2/-O3`.
- **jbig2enc** (`jbig2`) — JBIG2 monochrome compression at `-O1+` (often NOT in distro repos; must be
  built/installed separately — big container gotcha).
- **pypdfium / pikepdf** — rasterizer (`--rasterizer auto` prefers pypdfium in modern versions).

**Good at:** searchable PDFs from scans, deskew/rotate/clean preprocessing, PDF/A normalization,
and **standalone optimization** (it can run as an optimizer even when no OCR is needed).

**Cannot / should not do:** it's not a general editor, not a redaction tool, not a renderer you call
directly. It refuses by default if a page already has text (exit code 6) unless you pick a mode.

**Performance.** OCR is CPU-heavy. It parallelizes per-page via `--jobs N`; default tesseract timeout
is **180 s/page**. Expect seconds-to-minutes per page depending on DPI and language count.

**Version/maintenance caveats.** Very active. Notable v17 changes: `--mode {default,force,skip,redo}`
supersedes the old `--force-ocr/--skip-text/--redo-ocr` flags (legacy flags still accepted);
`--output-type auto` is the default and produces best-effort PDF/A via pikepdf, validating with
verapdf and falling back to Ghostscript — **if neither Ghostscript nor verapdf is installed,
`auto` silently yields a plain PDF, not PDF/A**. Default PDF renderer is now `fpdf2`.

### 1.4 Ghostscript (gs, pdfwrite device)

**What it is.** A PostScript/PDF interpreter. For PDFsmith its job is **compression / downsampling**
(`-sDEVICE=pdfwrite`), PDF/A conversion (driven by ocrmypdf), and last-resort repair.

**Good at:** image downsampling+recompression (the real file-size lever), color conversion,
PDF/A and version normalization, and re-distilling broken files into valid ones.

**Cannot / should not do well:** it is **not** a surgical page editor (no clean "delete page 3"),
and `-dPDFSETTINGS` is a blunt instrument (see §3). It rewrites the entire document, which can change
or drop things you didn't intend.

**Performance.** Slow relative to qpdf for equivalent structural work because it fully
interprets+rewrites. CPU-bound. Single-threaded per job in practice.

**Version/maintenance caveats.** AGPL/commercial licensing — fine for self-hosted internal use, but
note the license if you ever redistribute. Behavior of presets differs across gs versions; pin the
version in the image. **`gs` has had a history of CVEs** (it's a full interpreter) — keep it patched.

### 1.5 Supporting cast (already in the stack)

- **poppler-utils** — `pdftoppm`/`pdftocairo` (raster previews/thumbnails server-side), `pdfimages`
  (image extraction), `pdftotext` (text extraction), `pdfinfo` (metadata), `pdfunite`/`pdfseparate`
  (merge/split), `pdfdetach` (attachments). Great Swiss-army CLI fallback.
- **pdf.js** — client-side rendering + previews, and client-side page ops in the hybrid model. Cannot
  do OCR/compression/encryption-at-rest; it renders and can re-save with pdf-lib-class libraries, but
  trust the backend for canonical output.

---

## 2. Operation → recommended tool ownership

Legend: **Client** = pdf.js / browser; **Server** = FastAPI worker calling the named engine.

| Operation | Owner | Where | One-line justification | Fallback |
|---|---|---|---|---|
| Preview / thumbnails | pdf.js | Client | Already rendering in browser; zero round-trip. | poppler `pdftoppm` server-side |
| Reorder pages | pdf.js (UI) → pikepdf (commit) | Hybrid | Instant client preview; pikepdf writes canonical output. | pypdf |
| Rotate pages | pdf.js (UI) → pikepdf | Hybrid | `/Rotate` is a trivial structural edit. | pypdf |
| Delete pages | pdf.js (UI) → pikepdf | Hybrid | Page-tree surgery; qpdf keeps xref correct. | pypdf |
| Merge | pikepdf | Server | qpdf merges with correct resource/xref handling. | pypdf; poppler `pdfunite` |
| Split / extract range | pikepdf | Server | Clean page-tree slicing, preserves objects. | pypdf; poppler `pdfseparate` |
| Encrypt (set password) | **pikepdf** | Server | AES-256/R6 + full permission flags via `Encryption`. | pypdf (lighter) |
| Decrypt / remove password | **pikepdf** | Server | `open(password=)` then `save(encryption=False)`. | qpdf CLI |
| Set permissions | **pikepdf** | Server | `Permissions` object maps every flag. | pypdf |
| Linearize / web-optimize | **pikepdf** | Server | `save(linearize=True)` == `qpdf --linearize`. | qpdf CLI |
| Compress (image-heavy) | **Ghostscript** | Server | `-dPDFSETTINGS` downsampling is the real size lever. | ocrmypdf `--optimize` |
| Compress (structural only) | pikepdf | Server | Object streams + stream compression, lossless. | qpdf CLI |
| OCR (add text layer) | **ocrmypdf** | Server | Purpose-built Tesseract orchestration. | (none sane) |
| Repair / recover | **qpdf/pikepdf** → Ghostscript | Server | qpdf rebuilds xref; gs re-distills if qpdf fails. | mutool |
| Image extraction | pikepdf `PdfImage` / poppler `pdfimages` | Server | Lossless extraction of encoded image bytes. | PyMuPDF (if added) |
| Metadata edit | pikepdf (`open_metadata`) | Server | Correct XMP+DocInfo sync. | pypdf |
| Flatten forms | pypdf / ocrmypdf `--force-ocr` | Server | pypdf flattens AcroForm; force-ocr rasterizes everything. | Ghostscript |
| Stamp / watermark | pypdf (overlay) | Server | `merge_transformed_page` overlays a stamp page. | pdf-lib (client) |
| Redaction (true) | **Ghostscript/ocrmypdf rasterize** | Server | Only rasterization guarantees no recoverable text. | see §6 |
| Text extraction | poppler `pdftotext` / pypdf | Server | Mature extractors; pikepdf can't do text. | pdf.js client |
| PDF/A conversion | ocrmypdf (→ Ghostscript) | Server | ocrmypdf wraps the gs PDF/A pipeline + verapdf check. | gs direct |

**Rule of thumb:** *Structure & security → pikepdf. Pixels & color → Ghostscript. Text-on-scans →
ocrmypdf. Pure-Python convenience / forms / overlays / text → pypdf. Render & extract → pdf.js / poppler.*

---

## 3. Ghostscript compression: the `-dPDFSETTINGS` presets

`-dPDFSETTINGS` is a **preset bundle** of Distiller parameters that primarily controls *image*
downsampling and recompression. Exact values (from the Ghostscript VectorDevices distiller-params docs):

| Parameter | /screen | /ebook | /printer | /prepress | /default |
|---|---|---|---|---|---|
| Color image res | 72 dpi | 150 dpi | 300 dpi | 300 dpi | 72 dpi |
| Gray image res | 72 dpi | 150 dpi | 300 dpi | 300 dpi | 72 dpi |
| Mono image res | 300 dpi | 300 dpi | 1200 dpi | 1200 dpi | 300 dpi |
| Color downsample type | Average | Average | Average | Bicubic | Subsample |
| Gray downsample type | Average | Bicubic | Bicubic | Bicubic | Subsample |
| CompatibilityLevel (PDF ver) | 1.5 | 1.5 | 1.7 | 1.7 | 1.7 |
| ColorConversionStrategy | sRGB | sRGB | UseDeviceIndependentColor | LeaveColorUnchanged | LeaveColorUnchanged |

Downsample threshold defaults to **1.5** for all: an image is only downsampled when its effective
resolution exceeds `target × 1.5` (e.g. /printer 300 dpi only resamples images above 450 dpi).

**Size vs quality, practical guidance:**
- `/screen` — smallest, 72 dpi, fine for on-screen-only; visibly soft when zoomed/printed.
- `/ebook` — **the sweet spot for PDFsmith's default "compress"**, 150 dpi, balanced.
- `/printer` — 300 dpi, near-original for documents meant to print.
- `/prepress` — 300 dpi + bicubic + preserves color (no RGB conversion); largest, for print shops.
- `/default` — general-purpose; can be larger than expected.

**Canonical command:**

```bash
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.5 \
   -dPDFSETTINGS=/ebook \
   -dNOPAUSE -dQUIET -dBATCH -dSAFER \
   -sOutputFile=out.pdf in.pdf
```

Always add **`-dSAFER`** (sandbox file access — important when processing untrusted uploads). For finer
control, override individual params instead of the preset, e.g.:

```bash
gs -sDEVICE=pdfwrite -dDownsampleColorImages=true \
   -dColorImageResolution=120 -dColorImageDownsampleType=/Bicubic \
   -dNOPAUSE -dBATCH -dSAFER -sOutputFile=out.pdf in.pdf
```

**Critical clarifications / gotchas:**
- **It does NOT rasterize vector text.** The `pdfwrite` device interprets content and re-emits
  *high-level* vector/text operators — vectors and fonts stay vector. (The emitted syntax may differ
  byte-for-byte, but text stays selectable.) Vector text is preserved; only *bitmap images* get
  downsampled/recompressed.
- **It can INCREASE file size.** Official docs: "There is no guarantee... it may even produce a larger
  file." Causes: re-encoding makes operators more verbose; gs may not reuse modern `XRefStm`/`ObjStm`
  cross-reference compression the source used; an already well-optimized or text-only PDF has no images
  to shrink. **Always compare output size and keep the smaller of input/output.**
- **Color conversion surprises.** `/screen` and `/ebook` set `ColorConversionStrategy=sRGB`, which can
  shift CMYK/spot colors. Use `/prepress` or `-dColorConversionStrategy=/LeaveColorUnchanged` to keep
  color fidelity.
- **Double-JPEG degradation.** Re-compressing already-JPEG images at `/screen` stacks lossy artifacts.
- **Font handling.** gs subsets/re-embeds fonts; with `-dNeverEmbed` (or non-embeddable fonts) the
  reader substitutes fonts and rendering can change. Default behavior re-embeds, which is what you want.
- **Slow + single-threaded.** Budget CPU; run in the background job queue, not in the request thread.

---

## 4. ocrmypdf flags that matter

### 4.1 OCR mode — pick exactly one (this is the #1 source of confusion)

v17 unifies these under `--mode {default,force,skip,redo}`; the legacy flags still work:

| Mode (legacy flag) | Behavior | When correct |
|---|---|---|
| `default` | **Errors** if any page already has text (exit code 6). | Pure scans you know have no text. |
| `skip` (`--skip-text`) | OCRs only pages lacking text; copies text pages untouched. | **Mixed** born-digital + scanned PDFs. Safe default for "OCR my library". |
| `redo` (`--redo-ocr`) | Strips the existing *invisible* OCR layer, masks visible text, re-OCRs. Keeps vector page intact. | Re-OCR after a Tesseract upgrade; replace a bad old OCR layer **without rasterizing**. |
| `force` (`--force-ocr`) | **Rasterizes every page to an image**, discards hidden text, flattens forms/vector, re-OCRs. | Damaged char maps (selectable-but-not-searchable), destroying redacted/hidden content, last-resort. **Destroys vector text & forms — lossy.** |

Mental model: **skip** = additive & safe; **redo** = surgical replace; **force** = nuke-from-orbit
(rasterize). Never reach for `--force-ocr` unless you specifically need rasterization.

### 4.2 Preprocessing

- `--rotate-pages` — auto-detect & correct page orientation (uses OCR confidence to decide); changes
  `/Rotate`, doesn't rewrite pixels.
- `--deskew` — straightens slightly skewed scans (rewrites the image). Good for crooked scans.
- `--clean` — runs **unpaper** to clean the image *before OCR only* (output keeps the original image).
- `--clean-final` — cleans AND uses the cleaned image in the output. Note unpaper can reposition text;
  docs recommend `--clean-final` to avoid mismatch artifacts.
- `--remove-background` — flattens background; use sparingly (can harm color docs).

### 4.3 Optimization (`-O` / `--optimize`), runs AFTER OCR

| Level | Behavior |
|---|---|
| `-O0` | Disable optimization. |
| `-O1` (**default**) | Lossless only: transcode images to more efficient formats; **JBIG2** for monochrome (huge wins on B/W scans) if `jbig2enc` present. |
| `-O2` | + **lossy**: `pngquant` color quantization of paletted images, lower JPEG quality. |
| `-O3` | + more aggressive, lower image-quality targets. |

Tuning knobs: `--jpeg-quality N`, `--png-quality N`. ocrmypdf can run as a **standalone optimizer**
(it'll optimize even when a page already has text, combined with `--skip-text`). JBIG2 is *lossless*
for bitonal images and far better than CCITT G4 — **make sure `jbig2enc` is in the container** or you
lose the biggest scan-compression win.

### 4.4 Output, languages, parallelism, sidecar

- `--output-type {auto,pdf,pdfa,pdfa-1,pdfa-2,pdfa-3,none}` — `auto` (default) = best-effort PDF/A via
  pikepdf, validated by verapdf, gs fallback; **needs gs+verapdf or it degrades to plain PDF**.
  `pdfa`/`pdfa-2` force PDF/A-2b via Ghostscript. Use `pdf` to skip PDF/A entirely (faster).
- `-l LANG` — Tesseract language(s); combine with `+`: `-l deu+eng`, or repeat `-l deu -l eng`.
  **Language data install:** Debian/Ubuntu packages are `tesseract-ocr-<langcode>` (3-letter codes),
  e.g. `tesseract-ocr-deu` (German), `tesseract-ocr-fra`, `tesseract-ocr-eng` (usually with the base).
  Or drop `*.traineddata` into the `tessdata` dir (`/usr/share/tesseract-ocr/*/tessdata`). **Each
  language adds time** — don't blindly OCR with 5 languages.
- `--sidecar FILE.txt` — writes the recognized plain text to a side file (great for building a search
  index alongside the PDF). Pair with `--output-type none` if you only want the text.
- `--jobs N` (`-j`) — per-page parallelism. Set to container CPU count for throughput.
- `--tesseract-timeout` (default 180 s/page), `--skip-big N` (skip images over N megapixels) — guard
  rails against pathological pages locking a worker.

**Example — robust "OCR a mixed library" invocation:**

```bash
ocrmypdf --skip-text --rotate-pages --deskew \
         -l eng --optimize 2 --jobs 4 \
         --output-type pdf in.pdf out.pdf
```

---

## 5. pikepdf vs pypdf — decision matrix & code

| Concern | Use pikepdf | Use pypdf |
|---|---|---|
| Encryption AES-256/R6, decrypt, permissions | ✅ qpdf-backed, correct | ⚠️ pure-Python, lighter |
| Linearization (fast web view) | ✅ `save(linearize=True)` | ❌ |
| Repair malformed files | ✅ qpdf reconstructs | ❌ less tolerant |
| Structural compression / object streams | ✅ | ❌ |
| Lossless image extraction | ✅ `PdfImage` | ❌ |
| Page merge/split/rotate/delete | ✅ | ✅ (no native dep) |
| Text extraction | ❌ | ✅ `extract_text()` |
| Forms (AcroForm) fill/flatten | ⚠️ limited | ✅ |
| Watermark/overlay | ⚠️ manual | ✅ `merge_transformed_page` |
| Zero-binary install | ❌ (wheel bundles qpdf) | ✅ pure Python |

**Encryption with pikepdf (AES-256, R6, restrict permissions):**

```python
import pikepdf
from pikepdf import Permissions, Encryption

pdf = pikepdf.open("in.pdf")  # add password=... if input is encrypted
pdf.save(
    "out.pdf",
    encryption=Encryption(
        owner="ownerpass",            # full control
        user="",                      # blank user pw → anyone can open, restrictions still apply
        R=6, aes=True,                # AES-256, R6 (defaults, shown for clarity)
        allow=Permissions(
            extract=False,            # block copy/extract
            modify_annotation=False,
            modify_other=False,
            print_highres=True,       # allow high-res print
        ),
    ),
)
```

`Encryption` defaults: `R=6, aes=True, metadata=True, owner='', user=''`. `Permissions` flags all
default `True` except `modify_assembly=False`. Full flag set: `accessibility, extract,
modify_annotation, modify_assembly, modify_form, modify_other, print_lowres, print_highres`.

**Decrypt / strip a password:**

```python
pdf = pikepdf.open("locked.pdf", password="secret")
pdf.save("unlocked.pdf", encryption=False)   # encryption=False removes encryption
```

`Pdf.user_password_matched` / `Pdf.owner_password_matched` tell you which password opened it.

**Security reality check (from pikepdf docs):** anyone with the **user OR owner** password can fully
open, extract, and reproduce the PDF. Permission flags (no-print, no-copy) are **advisory** — they're
honored only by cooperating viewers and trivially stripped. Treat PDF "permissions" as a politeness
signal, NOT a security control. Real confidentiality = a strong user password (AES-256) or
out-of-band access control. Also: **owner-password-only PDFs (blank user password) can be decrypted by
anyone**, since the encryption key is derivable — pikepdf/qpdf will open them without a password.

**Linearize with pikepdf:**

```python
pdf = pikepdf.open("in.pdf")
pdf.save("web.pdf", linearize=True)          # == qpdf --linearize
```

---

## 6. Redaction — the dangerous operation

Drawing a black rectangle (the naive client approach) leaves the underlying text/objects fully
recoverable — the #1 real-world PDF data-leak. PDFsmith must offer **true** redaction:

1. **Preferred: rasterize the affected page(s).** Convert the page to an image so there is no text
   layer or object tree underneath. `ocrmypdf --force-ocr` does exactly this (rasterize + re-OCR), or
   render with Ghostscript/poppler to image and rebuild the page. The bars become pixels — nothing to
   read underneath. Downside: loses selectable text on that page (re-OCR restores searchability for
   the *non*-redacted text).
2. **Surgical: delete the underlying text/image objects, then flatten.** Preserves selectable text
   elsewhere but is hard to get right — miss one object and data leaks. Higher engineering risk.

**Recommendation:** ship rasterize-based redaction (option 1) as the default/guaranteed path; never
present a "black box" overlay as redaction in the UI. Also strip metadata/XMP and any attachments when
redacting, since sensitive data hides there too.

---

## 7. Repair / recovery of malformed PDFs

- **First line: qpdf/pikepdf.** `pikepdf.open()` auto-repairs many files on load; qpdf rebuilds broken
  cross-reference tables and recovers objects. CLI equivalents: `qpdf --check broken.pdf` (diagnose),
  `qpdf broken.pdf fixed.pdf` or `qpdf --qdf broken.pdf fixed.pdf` (rebuild). qpdf can salvage files
  with corrupt xref, wrong stream lengths, and appended garbage.
- **Second line: Ghostscript re-distill.** `gs -sDEVICE=pdfwrite -dPDFSETTINGS=/default -dSAFER ...`
  fully re-interprets and re-emits the file, often fixing things qpdf can't (broken content streams).
  Cost: it rewrites everything (may alter color/compression).
- **Limits:** neither recovers *destroyed* data — truncated streams, missing object bytes, or encrypted
  files without the password are unrecoverable. They salvage *structure*, not lost content. For
  content-stream corruption that gs can't fix either, the file is likely beyond rescue.

**Recommended repair pipeline:** try pikepdf load+save → if it throws, qpdf `--qdf` → if still bad, gs
re-distill → else report unrecoverable.

---

## 8. Recommendations (decision-ready)

1. **Make pikepdf the backend's primary structural engine.** It owns encrypt/decrypt, permissions,
   linearize, merge/split, structural compression, metadata, and lossless image extraction. Pin a
   minor version; rely on the prebuilt wheel (bundles qpdf — no compiling in the Dockerfile).
2. **Use pypdf as the pure-Python helper**, not the workhorse: form fill/flatten, watermark/stamp
   overlays, and quick text extraction. Avoid it for repair and hardened encryption.
3. **Ghostscript owns lossy compression.** Default the user-facing "Compress" button to
   `-dPDFSETTINGS=/ebook` (150 dpi) with `-dSAFER`; offer /screen and /printer as size/quality presets.
   **Always keep the smaller of input vs output** because gs can grow files. Run gs in the job queue.
4. **ocrmypdf owns OCR and PDF/A.** Default to `--skip-text` (safe on mixed docs) with `--optimize 1`,
   `--rotate-pages`, `--deskew`. Expose `--force-ocr` only behind an explicit "rasterize / re-OCR
   everything" advanced option (and reuse it for redaction).
5. **Ship the full toolchain in the container** and verify at build time: `gs`, `tesseract` + needed
   `tesseract-ocr-<lang>` packs, **`jbig2enc`** (not in most distro repos — build it), `pngquant`,
   `unpaper`, `qpdf`, `poppler-utils`, and (for true PDF/A) `verapdf`. Missing jbig2enc/verapdf
   silently degrades output quality/compliance.
6. **Hybrid split:** let pdf.js handle interactive reorder/rotate/delete/preview for instant UX, but
   **always commit the final document server-side through pikepdf** so output is canonical, linearized,
   and integrity-checked. Don't trust the browser's re-save as the stored artifact.
7. **Redaction = rasterize by default.** Never expose overlay-only "redaction." Strip metadata on redact.
8. **Linearize on final save** (`pikepdf save(linearize=True)`) for fast web view in the browser viewer.
9. **Treat PDF permissions as advisory, not security.** For real confidentiality use AES-256 with a
   *user* password; document in the UI that "restrict printing/copying" is honored only by polite viewers.

---

## 9. Gotchas / pitfalls (consolidated)

- **gs can make files BIGGER** — re-encoding overhead + missing XRefStm/ObjStm reuse; compare sizes.
- **gs `/screen` `/ebook` shift color** (sRGB conversion) — use LeaveColorUnchanged/`/prepress` for fidelity.
- **gs does NOT rasterize vector text** — vectors/fonts stay vector; only bitmaps downsample. (Common myth.)
- **Always run gs with `-dSAFER`** when processing untrusted uploads; gs has a CVE history — keep patched.
- **ocrmypdf `--force-ocr` is lossy** — it rasterizes pages and flattens forms/vector. Don't use it as a
  default; it's for fixing broken text layers / redaction only.
- **ocrmypdf `default` mode errors (exit 6) on documents that already contain text** — pick `--skip-text`
  for libraries of mixed content or you'll get failures.
- **jbig2enc usually isn't packaged** — without it `-O1` can't JBIG2-compress monochrome scans, the
  single biggest scan size win; build it into the image.
- **ocrmypdf `--output-type auto` silently degrades to plain PDF** if Ghostscript/verapdf are absent —
  install both if PDF/A matters.
- **Tesseract language packs are named `tesseract-ocr-<3-letter-code>`** and each extra language costs
  time; install only what you need.
- **pikepdf can't extract text; pypdf is weak on repair** — don't cross the streams.
- **PyPDF2 is dead** — depend on `pypdf` (6.x), not `PyPDF2`; APIs differ.
- **PDF permission flags are not enforcement** — anyone with either password gets full access; owner-only
  (blank user pw) PDFs open without any password.
- **pikepdf has no digital-signature support** — out of scope for now; don't promise signing.
- **Large files load fully into memory** in pikepdf/pypdf (object model) — set request size limits and
  process big jobs via the background queue, not the request thread.
- **pin engine versions in the Dockerfile** — gs preset behavior and qpdf linearization byte-output drift
  across versions; reproducibility matters for a self-hosted appliance.

---

## 10. Sources (fetched)

- pikepdf — Main objects / API (Encryption, Permissions, Pdf.open/save): https://pikepdf.readthedocs.io/en/latest/api/main.html
- pikepdf — Models (Permissions flags): https://pikepdf.readthedocs.io/en/latest/api/models.html
- pikepdf — PDF security topic (owner/user pw reality, advisory permissions): https://pikepdf.readthedocs.io/en/latest/topics/security.html
- pikepdf — PyPI / project: https://pypi.org/project/pikepdf/ and https://github.com/pikepdf/pikepdf
- pypdf — comparisons (vs pikepdf/PyMuPDF, pure-Python stance): https://pypdf.readthedocs.io/en/stable/meta/comparisons.html
- py-pdf/pypdf#647 — "PyPDF2 is dead, use pikepdf instead": https://github.com/py-pdf/pypdf/issues/647
- ocrmypdf — Advanced features (modes, renderer, output-type, tesseract opts): https://ocrmypdf.readthedocs.io/en/latest/advanced.html
- ocrmypdf — Cookbook: https://ocrmypdf.readthedocs.io/en/latest/cookbook.html
- ocrmypdf — PDF optimization (`-O` levels, pngquant, jbig2): https://ocrmypdf.readthedocs.io/en/latest/optimizer.html
- ocrmypdf — Installing the JBIG2 encoder: https://ocrmypdf.readthedocs.io/en/latest/jbig2.html
- ocrmypdf — Installing additional language packs: https://ocrmypdf.readthedocs.io/en/latest/languages.html
- Ghostscript — Optimizing PDFs (size-can-grow, downsample types, vector not rasterized): https://ghostscript.com/blog/optimizing-pdfs.html
- Ghostscript — VectorDevices / distiller params (PDFSETTINGS preset table): https://ghostscript.com/docs/9.54.0/VectorDevices.htm
- qpdf — QDF mode / repair docs & fix-qdf manpage: https://qpdf.readthedocs.io/en/stable/qdf.html , https://manpages.ubuntu.com/manpages/focal/man1/fix-qdf.1.html
- Tesseract — installation / tessdata: https://tesseract-ocr.github.io/tessdoc/Installation.html
- Redaction failure analysis (rasterize vs object-delete): https://www.argeliuslabs.com/deep-research-on-pdf-redaction-failures-and-security-risks-exploits-and-best-practices/
