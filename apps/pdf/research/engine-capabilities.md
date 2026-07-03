# pdf-forge — Engine Capabilities, Limits & Operation Ownership

Research track: **engine-capabilities** (second pass, merged deliverable — supersedes the
session-1 `session1_pdfsmith/engine-capabilities.md`).

Scope: exact capabilities, limits, performance, and gotchas of the server-side PDF engines
available to **pdf-forge** — **pikepdf** (qpdf bindings), **pypdf**, **ocrmypdf** (Tesseract),
**Ghostscript**, and **poppler-utils** — plus where **pdf.js** fits client-side. The deliverable
is opinionated: a clear owner per operation, with fallbacks and the code-level gotchas that bite in
production.

Context reminder: pdf-forge is a single self-hosted Docker container, LAN-only behind a reverse
proxy. FastAPI backend serves a built Vite/React + pdf.js frontend from the same container.
Architecture is **hybrid**: fast page-level ops (reorder, rotate, delete, preview) run client-side
in pdf.js; heavy jobs (OCR, compression, linearization, encryption, repair) POST to the backend.
This document covers the *backend* engines plus the client/server split decision per op.

**Verified current versions (June 2026):** pikepdf **10.9.1** (bundles libqpdf; qpdf stable
**12.3.2**, dev 12.4.0); pypdf **6.14.2**; ocrmypdf **17.7.1**; poppler **26.06.0**; Ghostscript
10.x line. All version claims below were cross-checked against primary docs/PyPI/GitHub releases in
June 2026 (see Sources).

---

## 1. Engine-by-engine assessment

### 1.1 pikepdf (Python bindings over qpdf / libqpdf)

**What it is.** A Pythonic wrapper around the C++ **qpdf** library. It manipulates PDF *structure*
(object graph, xref tables, streams, encryption dictionaries) with correctness as the priority.
Current line 10.x (10.9.1, June 2026). The community-recommended successor to the dead PyPDF2.

**Good at:**
- **Structural integrity & repair** — qpdf reconstructs broken xref tables and recovers damaged
  files. `pikepdf.open()` silently repairs many malformed files on load.
- **Encryption / decryption** — full control of the security handler: RC4, AES-128, and
  **AES-256 (V5/R6)**; per-permission flags; opening password-protected files; *removing* encryption
  on save.
- **Linearization** — `Pdf.save(linearize=True)` produces "fast web view" output (== `qpdf --linearize`).
- **Lossless structural optimization** — object streams, stream compression, normalization,
  splitting/merging, page-tree surgery.
- **Lossless image extraction** — `pikepdf.PdfImage` extracts embedded images preserving encoded bytes.
- **Metadata** — robust XMP + DocInfo editing via `pdf.open_metadata()` (`pikepdf.models.PdfMetadata`).

**Cannot / should not do:**
- **No text extraction.** By design — it does not interpret content streams into text. Use pypdf,
  pdf.js, or poppler (`pdftotext`).
- **Not a generation/layout library.** Cannot lay out new text/graphics from scratch; it copies and
  rearranges existing objects. Use reportlab/fpdf2 for synthesis.
- **No digital signatures** ("pikepdf does not support digital signatures at this time").
- **No rasterization / rendering.** It does not raster pages to images.

**Performance.** Fast — heavy lifting is compiled C++. Memory scales with document complexity because
it builds an in-memory object model; very large files load the whole structure. Fastest option for
pure structural ops.

**Version/maintenance caveats.** Actively maintained; ships manylinux/musllinux/macOS/Windows wheels
(no need to compile qpdf in the container). Pin a minor version — qpdf bumps occasionally change
linearization/object-stream byte output. The **bundled libqpdf version determines available
encryption handlers**, so the wheel's qpdf version matters for AES-256/R6.

### 1.2 pypdf (pure Python)

**What it is.** A pure-Python (zero C dependency) toolkit for page-level manipulation. Current line
6.x (6.14.2, June 2026). PyPDF2 was merged back into pypdf and is deprecated — **use `pypdf`, not
PyPDF2**.

**Good at:**
- **Page manipulation without native deps** — merge, split, crop, rotate, reorder, delete, N-up,
  transform pages.
- **Text & metadata extraction** — `page.extract_text()` (quality is "good enough", not Acrobat-grade).
- **Forms (AcroForm)** — read/fill/flatten form fields; better form story than pikepdf.
- **Encryption (now genuinely capable).** `PdfWriter.encrypt(password, algorithm=...)` supports
  `RC4-40`, `RC4-128`, `AES-128`, `AES-256-R5`, and **`AES-256`** (the latter is the ISO 32000-2
  V5/R6 handler). It can also *read/decrypt* RC4 and AES files. **This corrects session 1**, which
  framed pypdf encryption as merely "light"; AES-256/R6 write support is real today.
- **Easy to install** — no binary-wheel headaches; trivial in any container.

**Cannot / should not do:**
- **Not for repair.** The pure-Python parser is less tolerant of malformed files than qpdf; it is
  *not* the recovery tool.
- **Not a rendering or generation library** (no raster; limited synthesis).
- **Decryption robustness** — for opening weird/hardened encrypted files and salvage, qpdf/pikepdf is
  still more battle-tested than pypdf's pure-Python crypto path.

**Performance.** Pure Python → slower than pikepdf/qpdf on large files, but page reorder/merge of
typical office documents is fine. Lowest install/runtime footprint of the structural engines.

**Version/maintenance caveats.** Very active; huge install base. The API changed across
PyPDF2 → pypdf 3.x → 6.x. `PdfReader`/`PdfWriter` are the current classes; old `PdfFileReader` is
gone. Write against current pypdf docs, not ancient PyPDF2 snippets.

### 1.3 ocrmypdf (orchestrator around Tesseract + others)

**What it is.** Not a single engine — an **orchestration pipeline** that adds a searchable text layer
to scanned PDFs and optionally produces PDF/A. Current line 17.x (17.7.1, June 2026). The right tool
for OCR; do not hand-roll Tesseract + overlay yourself.

**What it delegates to (important for the Dockerfile):**
- **Tesseract** — the actual OCR.
- **fpdf2** — **new in v17**, builds the invisible text layer (replaced the legacy hOCR renderer);
  now a *required* Python dependency. (Addition/clarification vs session 1, which mentioned fpdf2 only
  in passing.)
- **pikepdf / libqpdf** — PDF assembly/repair (modern ocrmypdf depends on the **pikepdf** library,
  not the `qpdf` CLI).
- **pypdfium2** — preferred rasterizer; `--rasterizer auto` (default) prefers pypdfium2 and falls back
  to Ghostscript.
- **Ghostscript** — **now OPTIONAL, not required (major v17 change).** Used as a fallback rasterizer
  and as a PDF/A fallback. See §1.3.1.
- **veraPDF** — validates PDF/A; enables the Ghostscript-free PDF/A path.
- **unpaper** — `--clean` / `--clean-final` image cleanup.
- **pngquant** — lossy paletted-image quantization at `-O2/-O3`.
- **jbig2enc** (`jbig2`) — JBIG2 monochrome compression at `-O1+` (often NOT in distro repos; must be
  built/installed separately — big container gotcha).

**Good at:** searchable PDFs from scans; deskew/rotate/clean preprocessing; PDF/A normalization; and
**standalone optimization** (can run as an optimizer even when no OCR is needed).

**Cannot / should not do:** not a general editor, not a redaction tool, not a renderer you call
directly. By default it errors if a page already has text (exit code 6) unless you pick a mode.

**Performance.** OCR is CPU-heavy. Parallelizes per page via `--jobs N`; default Tesseract timeout is
**180 s/page**. Expect seconds-to-minutes per page depending on DPI and language count.

#### 1.3.1 v17 dependency reality (key staleness fix vs session 1)

Session 1 implied Ghostscript is needed for PDF/A and that `--output-type auto` "silently degrades"
without gs+verapdf. **v17 changed this.** Per the v17 release notes:

- **Ghostscript is no longer a required dependency — it is optional.**
- For **rasterization** you need *either* pypdfium2 *or* Ghostscript (pypdfium2 preferred).
- For **PDF/A** you need *either* veraPDF *or* Ghostscript. `--output-type auto` (the default) first
  tries the fast **Ghostscript-free** PDF/A conversion (validated by veraPDF when present) and falls
  back to Ghostscript only if that cannot produce PDF/A.
- `fpdf2` is a new required dependency for the text layer.

Practical upshot for the container: you *could* build a leaner OCR image around pypdfium2 + veraPDF
and treat Ghostscript as a fallback. But because pdf-forge *also* wants Ghostscript for its
compression feature (§3), you'll ship gs anyway — just don't assume ocrmypdf *requires* it.

### 1.4 Ghostscript (gs, pdfwrite device)

**What it is.** A PostScript/PDF interpreter. For pdf-forge its job is **compression / downsampling**
(`-sDEVICE=pdfwrite`), optional PDF/A conversion, and last-resort repair (re-distill).

**Good at:** image downsampling + recompression (the real file-size lever), color conversion, PDF/A
and version normalization, re-distilling broken files into valid ones.

**Cannot / should not do well:** it is **not** a surgical page editor (no clean "delete page 3"), and
`-dPDFSETTINGS` is a blunt instrument (§3). It rewrites the entire document, which can change or drop
things you did not intend.

**Performance.** Slow relative to qpdf for equivalent structural work because it fully interprets +
rewrites. CPU-bound, single-threaded per job in practice.

**Version/maintenance caveats.** AGPL/commercial licensing — fine for self-hosted internal LAN use,
but note the license if you ever redistribute. Preset behavior differs across gs versions (e.g.,
`ColorConversionStrategy` naming changed from `RGB` to `sRGB` between the 9.x docs and 10.x; pdfwrite
color defaults have drifted). **Pin the gs version in the image.** gs has a long CVE history (it's a
full interpreter) — keep it patched and always run with `-dSAFER` on untrusted uploads.

### 1.5 poppler-utils (CLI swiss-army knife)

Current release **26.06.0** (June 2026; poppler uses CalVer `YY.MM`). Roles:

| Tool | Role in pdf-forge |
|---|---|
| `pdftoppm` | Rasterize pages → PPM/PNG/JPEG (server-side thumbnails/previews; per-page `-r DPI`, `-f/-l` page range). |
| `pdftocairo` | Cairo-based rendering → PNG/JPEG/**SVG**/PS/PDF/EPS. Better antialiasing than pdftoppm; SVG export and vector-preserving output. Preferred renderer of the two. |
| `pdftotext` | Mature text extraction (`-layout` preserves columns; `-bbox`/`-tsv` for positions). Fallback/cross-check to pypdf. |
| `pdfinfo` | Metadata, page count, page size, encryption status, PDF version — cheap "inspect" endpoint. |
| `pdfimages` | Extract embedded raster images (`-all`, `-list`). Lossless extraction of encoded bytes. |
| `pdfunite` / `pdfseparate` | Merge / split fallback if you'd rather shell out than use pikepdf. |
| `pdfdetach` | List/extract file attachments. |

poppler is a great CLI fallback and the natural server-side renderer when you need raster previews
outside the browser (e.g., generating thumbnails for a job that never opened in pdf.js).

### 1.6 pdf.js (client-side)

Client-side rendering + previews, and client-side page ops in the hybrid model. Cannot do
OCR/compression/encryption-at-rest. It renders and can re-save via pdf-lib-class libraries, but treat
the **backend** output (pikepdf) as canonical — do not store the browser's re-save as the artifact.

---

## 2. Operation → recommended tool ownership

Legend: **Client** = pdf.js / browser; **Server** = FastAPI worker calling the named engine.

| Operation | Owner | Where | One-line justification | Fallback |
|---|---|---|---|---|
| Preview / thumbnails | pdf.js | Client | Already rendering in browser; zero round-trip. | poppler `pdftocairo`/`pdftoppm` server-side |
| Reorder pages | pdf.js (UI) → pikepdf (commit) | Hybrid | Instant client preview; pikepdf writes canonical output. | pypdf |
| Rotate pages | pdf.js (UI) → pikepdf | Hybrid | `/Rotate` is a trivial structural edit. | pypdf |
| Delete pages | pdf.js (UI) → pikepdf | Hybrid | Page-tree surgery; qpdf keeps xref correct. | pypdf |
| Merge | pikepdf | Server | qpdf merges with correct resource/xref handling. | pypdf; poppler `pdfunite` |
| Split / extract range | pikepdf | Server | Clean page-tree slicing, preserves objects. | pypdf; poppler `pdfseparate` |
| Encrypt (set password) | **pikepdf** | Server | AES-256/R6 + full permission flags via `Encryption`. | pypdf (now also AES-256) |
| Decrypt / remove password | **pikepdf** | Server | `open(password=)` then `save(encryption=False)`. | qpdf CLI; pypdf |
| Set permissions | **pikepdf** | Server | `Permissions` object maps every flag. | pypdf |
| Linearize / web-optimize | **pikepdf** | Server | `save(linearize=True)` == `qpdf --linearize`. | qpdf CLI |
| Compress (image-heavy) | **Ghostscript** | Server | `-dPDFSETTINGS` downsampling is the real size lever. | ocrmypdf `--optimize` |
| Compress (structural only) | pikepdf | Server | Object streams + stream compression, lossless. | qpdf CLI |
| OCR (add text layer) | **ocrmypdf** | Server | Purpose-built Tesseract orchestration. | (none sane) |
| Repair / recover | **qpdf/pikepdf** → Ghostscript | Server | qpdf rebuilds xref; gs re-distills if qpdf fails. | mutool (if added) |
| Image extraction | pikepdf `PdfImage` / poppler `pdfimages` | Server | Lossless extraction of encoded image bytes. | PyMuPDF (if added) |
| Metadata edit | pikepdf (`open_metadata`) | Server | Correct XMP + DocInfo sync. | pypdf |
| Flatten forms | pypdf | Server | pypdf flattens AcroForm cleanly without rasterizing. | ocrmypdf `--force-ocr` (rasterizes); gs |
| Stamp / watermark | pypdf (overlay) | Server | `Page.merge_transformed_page` overlays a stamp page. | pdf-lib (client preview) |
| Redaction (true) | **rasterize** (pypdfium2/poppler → image) → re-OCR | Server | Only rasterization guarantees no recoverable text. | ocrmypdf `--force-ocr`; see §6 |
| Text extraction | poppler `pdftotext` / pypdf | Server | Mature extractors; pikepdf can't do text. | pdf.js client |
| PDF/A conversion | ocrmypdf (verapdf path, gs fallback) | Server | v17 does PDF/A without gs via pikepdf+veraPDF. | gs direct |

**Rule of thumb:** *Structure & security → pikepdf. Pixels & color/size → Ghostscript. Text-on-scans →
ocrmypdf. Pure-Python convenience / forms / overlays / text → pypdf. Render & extract → pdf.js /
poppler.*

---

## 3. Ghostscript compression: the `-dPDFSETTINGS` presets

`-dPDFSETTINGS` is a **preset bundle** of Distiller parameters that primarily controls *image*
downsampling and recompression. Exact values below are from the Ghostscript VectorDevices
distiller-params docs (gs 9.54 table; values are stable across the 9.x/10.x line except the
`ColorConversionStrategy` naming note in §1.4).

| Parameter | /screen | /ebook | /printer | /prepress | /default |
|---|---|---|---|---|---|
| Color image res | 72 dpi | 150 dpi | 300 dpi | 300 dpi | 72 dpi |
| Gray image res | 72 dpi | 150 dpi | 300 dpi | 300 dpi | 72 dpi |
| Mono image res | 300 dpi | 300 dpi | 1200 dpi | 1200 dpi | 300 dpi |
| Color downsample type | /Average | /Average | /Average | /Bicubic | /Subsample |
| **Gray downsample type** | **/Subsample** | **/Average** | /Bicubic | /Bicubic | /Subsample |
| CompatibilityLevel (PDF ver) | 1.5 | 1.5 | 1.7 | 1.7 | 1.7 |
| ColorConversionStrategy | RGB (sRGB in gs 10.x) | RGB (sRGB in gs 10.x) | UseDeviceIndependentColor | LeaveColorUnchanged | LeaveColorUnchanged |
| Downsample threshold | 1.5 | 1.5 | 1.5 | 1.5 | 1.5 |

> **Correction vs session 1:** session 1 listed `/screen` **gray** downsample as *Average* (actual:
> **/Subsample**) and `/ebook` **gray** as *Bicubic* (actual: **/Average**). Color downsample types
> and all resolutions in session 1 were correct. The `ColorConversionStrategy` for screen/ebook is
> documented as `RGB` in the 9.54 table; recent gs (10.x) uses `sRGB`. (`/default` exact values are
> version-fuzzy; treat the row above as the common case.)

Downsample threshold defaults to **1.5** for all: an image is downsampled only when its effective
resolution exceeds `target × 1.5` (e.g., `/printer` 300 dpi only resamples images above 450 dpi).

**Size vs quality, practical guidance:**
- `/screen` — smallest, 72 dpi; fine on-screen only, visibly soft when zoomed/printed.
- `/ebook` — **the sweet spot for pdf-forge's default "compress"**, 150 dpi, balanced.
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

Always add **`-dSAFER`** (sandbox file access — important for untrusted uploads; it is the default in
gs ≥ 9.50 but pass it explicitly). For finer control, override individual params instead of the preset:

```bash
gs -sDEVICE=pdfwrite -dDownsampleColorImages=true \
   -dColorImageResolution=120 -dColorImageDownsampleType=/Bicubic \
   -dNOPAUSE -dBATCH -dSAFER -sOutputFile=out.pdf in.pdf
```

**Critical clarifications / gotchas:**
- **It does NOT rasterize vector text.** `pdfwrite` interprets content and re-emits *high-level*
  vector/text operators — vectors and fonts stay vector; text stays selectable. Only *bitmap images*
  get downsampled/recompressed. (Common myth.)
- **It can INCREASE file size.** Official docs: "There is no guarantee... it may even produce a larger
  file." Causes: more verbose re-encoded operators; gs may not reuse the modern `XRefStm`/`ObjStm`
  cross-reference compression the source used; an already-optimized or text-only PDF has no images to
  shrink. **Always compare output vs input size and keep the smaller.**
- **Color conversion surprises.** screen/ebook set `ColorConversionStrategy` to RGB/sRGB, which can
  shift CMYK/spot colors. Use `/prepress` or `-dColorConversionStrategy=/LeaveColorUnchanged` for
  fidelity.
- **Double-JPEG degradation.** Re-compressing already-JPEG images at `/screen` stacks lossy artifacts.
- **Font handling.** gs subsets/re-embeds fonts; with `-dNeverEmbed` (or non-embeddable fonts) the
  reader substitutes fonts and rendering changes. Default re-embeds — what you want.
- **Slow + single-threaded.** Budget CPU; run in the background job queue, not the request thread.

---

## 4. ocrmypdf flags that matter

### 4.1 OCR mode — pick exactly one (#1 source of confusion)

v17 unifies these under `--mode {default,force,skip,redo}` (`-m`); the legacy flags remain as
**silent aliases** for backward compatibility. (Confirmed against v17 release notes — session 1's
claim holds.)

| Mode (legacy flag) | Behavior | When correct |
|---|---|---|
| `default` | **Errors** if any page already has text (exit code 6). | Pure scans you know have no text. |
| `skip` (`--skip-text`) | OCRs only pages lacking text; copies text pages untouched. | **Mixed** born-digital + scanned PDFs. Safe default for "OCR my library". |
| `redo` (`--redo-ocr`) | Strips the existing *invisible* OCR layer, masks visible text, re-OCRs. Keeps the vector page intact (does **not** rasterize). | Re-OCR after a Tesseract upgrade; replace a bad old OCR layer without rasterizing. |
| `force` (`--force-ocr`) | **Rasterizes every page to an image**, discards hidden text, flattens forms/vector, re-OCRs. | Damaged char maps (selectable-but-not-searchable); destroying redacted/hidden content; last resort. **Destroys vector text & forms — lossy.** |

Mental model: **skip** = additive & safe; **redo** = surgical replace; **force** = nuke-from-orbit
(rasterize). Never reach for `--force-ocr` unless you specifically need rasterization. Note (v17): when
`force` rasterizes or `redo` rewrites the text layer, the document's structure/tagging tree is
**discarded** (it no longer matches the content) — relevant if you care about accessibility tagging.

### 4.2 Preprocessing

- `--rotate-pages` — auto-detect & correct page orientation using OCR confidence; changes `/Rotate`,
  does not rewrite pixels. Tune with `--rotate-pages-threshold`.
- `--deskew` — straightens slightly skewed scans (rewrites the image). Good for crooked scans.
- `--clean` — runs **unpaper** to clean the image *before OCR only* (output keeps the original image).
- `--clean-final` — cleans AND uses the cleaned image in the output. unpaper can reposition content;
  docs recommend `--clean-final` to avoid OCR-vs-image mismatch.
- `--remove-background` — flattens background; use sparingly (can harm color docs).

### 4.3 Optimization (`-O` / `--optimize`), runs AFTER OCR

| Level | Behavior |
|---|---|
| `-O0` | Disable optimization. |
| `-O1` (**default**) | Lossless only: transcode images to more efficient formats; **JBIG2** for monochrome (huge wins on B/W scans) **if `jbig2enc` is present**. |
| `-O2` | + **lossy**: `pngquant` color quantization of paletted images, lower JPEG quality. |
| `-O3` | + more aggressive, lower image-quality targets. |

Tuning knobs: `--jpeg-quality N`, `--png-quality N`. ocrmypdf can run as a **standalone optimizer**
(e.g., `--skip-text --optimize 3 --tesseract-timeout 0` optimizes without doing OCR). JBIG2 is
*lossless* for bitonal images and far better than CCITT G4 — **ensure `jbig2enc` is in the container**
or you lose the single biggest scan-compression win.

### 4.4 Output, languages, parallelism, sidecar

- `--output-type {auto,pdf,pdfa,pdfa-1,pdfa-2,pdfa-3,none}` — `auto` (default) = best-effort PDF/A,
  **Ghostscript-free** via pikepdf when veraPDF is available, falling back to Ghostscript only if
  needed (v17 behavior). `pdfa`/`pdfa-2` target PDF/A-2b. Use `pdf` to skip PDF/A (faster). `none`
  pairs with `--sidecar` to emit text only.
- `-l LANG` — Tesseract language(s); combine with `+` (`-l deu+eng`) or repeat (`-l deu -l eng`).
  **Language data install:** Debian/Ubuntu packages are `tesseract-ocr-<langcode>` (3-letter ISO 639-2,
  e.g. `tesseract-ocr-deu`, `-fra`, `-eng`). Or drop `*.traineddata` into the `tessdata` dir
  (`/usr/share/tesseract-ocr/*/tessdata`, or set `TESSDATA_PREFIX`). **Each language adds time** — don't
  blindly OCR with 5 languages.
- `--sidecar FILE.txt` — writes recognized plain text to a side file (great for a search index). Pair
  with `--output-type none` if you only want text.
- `--jobs N` (`-j`) — per-page parallelism. Set to container CPU count for throughput.
- `--tesseract-timeout` (default **180 s/page**; set `0` to skip OCR and only optimize),
  `--skip-big N` (skip images over N megapixels) — guard rails against pathological pages locking a
  worker.

**Example — robust "OCR a mixed library" invocation:**

```bash
ocrmypdf --skip-text --rotate-pages --deskew \
         -l eng --optimize 2 --jobs 4 \
         --output-type pdf in.pdf out.pdf
```

---

## 5. pikepdf vs pypdf — decision matrix & code

| Concern | pikepdf | pypdf |
|---|---|---|
| Encryption AES-256/R6, decrypt, permissions | ✅ qpdf-backed, most robust | ✅ now supports AES-256/R6 write; pure-Python decrypt less battle-tested |
| Linearization (fast web view) | ✅ `save(linearize=True)` | ❌ |
| Repair malformed files | ✅ qpdf reconstructs | ❌ less tolerant |
| Structural compression / object streams | ✅ | ⚠️ limited |
| Lossless image extraction | ✅ `PdfImage` | ⚠️ possible but clumsier |
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
        user="",                      # blank user pw → anyone can open; restrictions still "apply"
        R=6, aes=True,                # AES-256, R6 (defaults; shown for clarity)
        allow=Permissions(
            extract=False,            # block copy/extract
            modify_annotation=False,
            modify_other=False,
            print_highres=True,       # allow high-res print
        ),
    ),
)
```

`Encryption` defaults: `R=6, aes=True, metadata=True, owner='', user=''`. `Permissions` flags default
`True` except `modify_assembly=False`. Full flag set: `accessibility, extract, modify_annotation,
modify_assembly, modify_form, modify_other, print_lowres, print_highres`.

**Decrypt / strip a password:**

```python
pdf = pikepdf.open("locked.pdf", password="secret")
pdf.save("unlocked.pdf", encryption=False)   # encryption=False removes encryption
```

`Pdf.user_password_matched` / `Pdf.owner_password_matched` tell you which password opened it.

**Same with pypdf (now a viable fallback):**

```python
from pypdf import PdfReader, PdfWriter
writer = PdfWriter(clone_from=PdfReader("in.pdf"))
writer.encrypt("userpw", owner_password="ownerpw", algorithm="AES-256")  # V5/R6
writer.write("out.pdf")
```

**Security reality check (from pikepdf docs):** PDF permissions are **advisory** — enforced only by
cooperating viewers and trivially stripped by any library (pikepdf included). Treat "no-print/no-copy"
as a politeness signal, not a security control. Real confidentiality = a strong **user** password
(AES-256). And per pikepdf: *"if the user password is an empty string, everyone has the user
password"* — an **owner-only PDF (blank user password) opens for anyone without a password**.
Conversely, "setting a user password and leaving the owner password blank is useless."

**Linearize with pikepdf:**

```python
pdf = pikepdf.open("in.pdf")
pdf.save("web.pdf", linearize=True)          # == qpdf --linearize
```

---

## 6. Redaction — the dangerous operation

Drawing a black rectangle (the naive client approach) leaves the underlying text/objects fully
recoverable — the #1 real-world PDF data leak. pdf-forge must offer **true** redaction:

1. **Preferred: rasterize the affected page(s).** Render the page to an image so there is no text
   layer or object tree underneath, then rebuild the page from the image. Render with **pypdfium2**
   or poppler `pdftocairo`/`pdftoppm`; or use `ocrmypdf --force-ocr` (rasterize + re-OCR) to restore
   searchability of the *non*-redacted text. The bars become pixels — nothing to read underneath.
   Downside: loses native selectable text on that page.
2. **Surgical: delete the underlying text/image objects, then flatten.** Preserves selectable text
   elsewhere but is hard to get right — miss one object and data leaks. Higher engineering risk.

**Recommendation:** ship rasterize-based redaction (option 1) as the default/guaranteed path; never
present a "black box" overlay as redaction in the UI. Also strip metadata/XMP and any attachments when
redacting — sensitive data hides there too.

---

## 7. Repair / recovery of malformed PDFs

- **First line: qpdf/pikepdf.** `pikepdf.open()` auto-repairs many files on load; qpdf rebuilds broken
  cross-reference tables and recovers objects. CLI equivalents: `qpdf --check broken.pdf` (diagnose),
  `qpdf broken.pdf fixed.pdf` or `qpdf --qdf broken.pdf fixed.pdf` (rebuild). qpdf salvages corrupt
  xref, wrong stream lengths, and appended garbage.
- **Second line: Ghostscript re-distill.** `gs -sDEVICE=pdfwrite -dPDFSETTINGS=/default -dSAFER ...`
  fully re-interprets and re-emits, often fixing things qpdf can't (broken content streams). Cost: it
  rewrites everything (may alter color/compression).
- **Limits:** neither recovers *destroyed* data — truncated streams, missing object bytes, or
  encrypted files without the password are unrecoverable. They salvage *structure*, not lost content.

**Recommended repair pipeline:** pikepdf load+save → if it throws, `qpdf --qdf` → if still bad, gs
re-distill → else report unrecoverable.

---

## 8. Recommendations (decision-ready)

1. **pikepdf is the backend's primary structural engine.** It owns encrypt/decrypt, permissions,
   linearize, merge/split, structural compression, metadata, and lossless image extraction. Pin a
   minor version; rely on the prebuilt wheel (bundles qpdf — no compiling in the Dockerfile).
2. **pypdf is the pure-Python helper**, not the workhorse: form fill/flatten, watermark/stamp
   overlays, quick text extraction — and a *capable* AES-256 encryption fallback. Avoid it for repair
   and for opening hardened/weird encrypted files.
3. **Ghostscript owns lossy compression.** Default the "Compress" button to `-dPDFSETTINGS=/ebook`
   (150 dpi) with `-dSAFER`; offer /screen and /printer as presets. **Always keep the smaller of input
   vs output** (gs can grow files). Run gs in the job queue.
4. **ocrmypdf owns OCR and PDF/A.** Default to `--skip-text` with `--optimize 1`, `--rotate-pages`,
   `--deskew`. Expose `--force-ocr` only behind an explicit "rasterize / re-OCR everything" advanced
   option (and reuse it for redaction).
5. **Ship the toolchain and verify at build time:** `gs`, `tesseract` + needed `tesseract-ocr-<lang>`
   packs, **`jbig2enc`** (build it — not in most distro repos), `pngquant`, `unpaper`, `qpdf`,
   `poppler-utils`, **`pypdfium2`**, and **`verapdf`** (for Ghostscript-free PDF/A). Missing
   jbig2enc/verapdf silently degrades compression/compliance.
6. **Hybrid split:** pdf.js handles interactive reorder/rotate/delete/preview for instant UX, but
   **always commit the final document server-side through pikepdf** so output is canonical, linearized,
   and integrity-checked. Don't store the browser's re-save.
7. **Redaction = rasterize by default.** Never expose overlay-only "redaction." Strip metadata on redact.
8. **Linearize on final save** (`pikepdf save(linearize=True)`) for fast web view.
9. **Treat PDF permissions as advisory, not security.** For confidentiality use AES-256 with a *user*
   password; in the UI label "restrict printing/copying" as honored only by polite viewers, and warn
   that owner-only (blank user pw) files open for anyone.
10. **For server-side previews/thumbnails, prefer `pdftocairo`** (better AA, SVG support) over
    `pdftoppm`; reserve poppler for jobs that never hit the browser.

---

## 9. Gotchas / pitfalls (consolidated)

- **gs can make files BIGGER** — re-encoding overhead + missing XRefStm/ObjStm reuse; compare sizes.
- **gs screen/ebook shift color** (RGB/sRGB conversion) — use `LeaveColorUnchanged`/`/prepress` for fidelity.
- **gs does NOT rasterize vector text** — vectors/fonts stay vector; only bitmaps downsample. (Myth.)
- **gs gray downsample types differ from the obvious guess** — `/screen` uses **/Subsample**, `/ebook`
  uses **/Average** (not what session 1 listed); check before assuming visual quality.
- **Run gs with `-dSAFER`** on untrusted uploads; gs has a CVE history — keep patched.
- **ocrmypdf `--force-ocr` is lossy** — rasterizes pages, flattens forms/vector, discards the tag
  tree. Not a default; for broken text layers / redaction only.
- **ocrmypdf `default` mode errors (exit 6) on docs that already contain text** — use `--skip-text`
  for mixed libraries.
- **jbig2enc usually isn't packaged** — without it `-O1` can't JBIG2-compress mono scans, the single
  biggest scan size win; build it into the image.
- **ocrmypdf no longer *requires* Ghostscript (v17)** — but it *does* require `fpdf2`, and needs
  *either* pypdfium2 *or* gs for raster, *either* veraPDF *or* gs for PDF/A. Provision pypdfium2 +
  veraPDF for the lean path.
- **Tesseract language packs are `tesseract-ocr-<3-letter-code>`** and each extra language costs time.
- **pikepdf can't extract text; pypdf is weak on repair** — don't cross the streams.
- **PyPDF2 is dead** — depend on `pypdf` (6.x), not `PyPDF2`; APIs differ.
- **PDF permission flags are not enforcement** — anyone with either password gets full access;
  owner-only (blank user pw) PDFs open without any password.
- **pikepdf has no digital-signature support** — out of scope; don't promise signing.
- **Large files load fully into memory** in pikepdf/pypdf — set request size limits and process big
  jobs via the background queue, not the request thread.
- **Pin engine versions in the Dockerfile** — gs preset behavior and qpdf linearization byte-output
  drift across versions; reproducibility matters for a self-hosted appliance.

---

## 10. Changes vs. session 1

**Corrected:**
- **Ghostscript gray-downsample values were wrong.** Session 1: `/screen` gray = *Average*, `/ebook`
  gray = *Bicubic*. Per gs docs the correct values are `/screen` gray = **/Subsample**, `/ebook` gray =
  **/Average**. (Color downsample types and all resolutions in session 1 were correct.)
- **ocrmypdf v17 dependency framing was stale.** Session 1 said `--output-type auto` "silently degrades
  to plain PDF if Ghostscript/verapdf are absent" and implied gs is needed for PDF/A. v17 makes
  **Ghostscript optional**: PDF/A is produced Ghostscript-free via pikepdf + veraPDF (gs is only a
  fallback). pypdfium2 is the preferred rasterizer; `fpdf2` is a new *required* dependency.
- **pypdf encryption was understated.** Session 1 called pypdf encryption merely "light, pure-Python,
  prefer pikepdf for AES-256/R6." Current pypdf `PdfWriter.encrypt(algorithm="AES-256")` writes AES-256
  (V5/R6) and also supports AES-256-R5/AES-128/RC4. It's a real fallback; pikepdf is still preferred for
  decryption robustness and repair.
- **`ColorConversionStrategy` naming.** Session 1 wrote `sRGB` for screen/ebook; the canonical 9.54
  table says `RGB`. Both can be right depending on gs version (10.x uses `sRGB`) — now noted explicitly.

**Confirmed (held up under verification):**
- Version numbers are current: pikepdf 10.9.1, pypdf 6.14.2, ocrmypdf 17.7.1 (qpdf 12.3.2 stable,
  poppler 26.06.0).
- ocrmypdf v17 `--mode {default,force,skip,redo}` exists with legacy flags as silent aliases (I was
  skeptical; it's real).
- pikepdf security model: permissions advisory; owner-only/blank-user-password PDFs open without a
  password; no digital-signature support; `Encryption` defaults `R=6, aes=True, metadata=True`.
- gs `pdfwrite` does not rasterize vector text and can increase file size; `-dPDFSETTINGS` resolutions
  and the 1.5 downsample threshold; `-O1` default + JBIG2/jbig2enc story; rasterize-for-redaction.

**Added:**
- A dedicated **poppler-utils tool table** (pdftocairo vs pdftoppm, pdfinfo/pdfimages/pdftotext roles)
  and current poppler version (26.06.0, CalVer).
- The v17 detail that **force/redo discard the document structure (tag) tree**.
- ocrmypdf **standalone optimizer** recipe (`--tesseract-timeout 0`) and `--rotate-pages-threshold`.
- pypdf encryption code snippet and the AES-256-R5 vs AES-256 (R6) distinction.
- Note that `-dSAFER` is the default in gs ≥ 9.50 (still pass it explicitly).
- Recommendation to prefer `pdftocairo` for server-side previews.

---

## 11. Sources (fetched June 2026)

- pikepdf — main API (Encryption, Permissions, open/save): https://pikepdf.readthedocs.io/en/latest/api/main.html
- pikepdf — security topic (advisory perms, owner/user pw): https://pikepdf.readthedocs.io/en/latest/topics/security.html
- pikepdf — docs home / version: https://pikepdf.readthedocs.io/
- pikepdf — PyPI / GitHub: https://pypi.org/project/pikepdf/ , https://github.com/pikepdf/pikepdf
- qpdf — releases / release notes: https://github.com/qpdf/qpdf/releases , https://qpdf.readthedocs.io/en/stable/release-notes.html
- qpdf — QDF / repair: https://qpdf.readthedocs.io/en/stable/qdf.html
- pypdf — encryption/decryption (algorithms incl. AES-256): https://pypdf.readthedocs.io/en/stable/user/encryption-decryption.html
- pypdf — PyPI / releases: https://pypi.org/project/pypdf/ , https://github.com/py-pdf/pypdf/releases
- pypdf — comparisons (vs pikepdf/PyMuPDF): https://pypdf.readthedocs.io/en/stable/meta/comparisons.html
- py-pdf/pypdf#647 — "PyPDF2 is dead": https://github.com/py-pdf/pypdf/issues/647
- ocrmypdf — v17 release notes (--mode, fpdf2, gs optional, pypdfium2, verapdf): https://ocrmypdf.readthedocs.io/en/latest/releasenotes/version17.html
- ocrmypdf — advanced features: https://ocrmypdf.readthedocs.io/en/latest/advanced.html
- ocrmypdf — cookbook: https://ocrmypdf.readthedocs.io/en/latest/cookbook.html
- ocrmypdf — optimizer (-O levels, pngquant, jbig2): https://ocrmypdf.readthedocs.io/en/latest/optimizer.html
- ocrmypdf — JBIG2 encoder install: https://ocrmypdf.readthedocs.io/en/latest/jbig2.html
- ocrmypdf — language packs: https://ocrmypdf.readthedocs.io/en/latest/languages.html
- Ghostscript — VectorDevices / distiller params (PDFSETTINGS table): https://ghostscript.com/docs/9.54.0/VectorDevices.htm
- Ghostscript — optimizing PDFs (size can grow, vector not rasterized): https://ghostscript.com/blog/optimizing-pdfs.html
- Poppler — home / releases (26.06.0): https://poppler.freedesktop.org/ , https://poppler.freedesktop.org/releases.html
- Tesseract — installation / tessdata: https://tesseract-ocr.github.io/tessdoc/Installation.html
