# PDFsmith — Feature Landscape: What Acrobat Does vs. What We Can Realistically Self-Host

**Track:** feature-landscape
**Scope:** Map the real-world Adobe Acrobat feature set onto a single-container, LAN-only, privacy-first homelab app (FastAPI backend + Vite/React/pdf.js frontend; hybrid client/server execution). Rank every feature by *value × feasibility* into **MUST / SHOULD / LATER**, and explicitly flag features that are impractical, dangerous, or weakly supported in OSS.

> **Bottom line up front:** ~80% of what people actually open Acrobat for is *page-level document plumbing* (combine, split, rotate, delete, compress, OCR, password, stamp/number, export-to-image). All of that is high-value AND high-feasibility with the locked engine list and is where PDFsmith should win decisively. The glamorous Acrobat features — reflowable text editing, faithful PDF→Word/Excel, PKI/AATL e-signatures, full PDF/UA tagging, content compare, JS/XFA forms — are exactly the ones with weak or no self-hostable OSS support. Treat them as LATER, partial, or explicitly out-of-scope, and be honest in the UI about what "redaction" and "sign" mean.

---

## 1. The real-world Acrobat feature set

Acrobat Pro is enormous, but observed usage clusters into a handful of buckets. Enumerated below, grouped by how people actually reach for them:

**A. Organize / assemble (the bread and butter)**
- Combine/merge files into one PDF
- Split / extract pages (by range, by size, by bookmark, by page count)
- Reorder, rotate, delete, insert pages
- Crop pages; resize/scale
- Page thumbnails / "Organize Pages" view

**B. Optimize / convert**
- Compress / "Reduce File Size" / "PDF Optimizer"
- OCR scanned documents ("Recognize Text")
- Convert to/from images (PDF→JPG/PNG/TIFF, image→PDF)
- Linearize ("Fast Web View")
- Convert *to* PDF from Office/images
- Convert *from* PDF to Word/Excel/PowerPoint/image (**export**)
- PDF/A conversion (archival)

**C. Edit content**
- Edit text (reflow, font matching, re-wrap paragraphs)
- Edit/replace/move images
- Add/edit links, headers/footers, backgrounds
- Watermark / stamp
- Bates numbering (legal), page numbering

**D. Forms**
- Fill in existing forms (AcroForm)
- Create form fields; field validation/calculation (JavaScript)
- XFA (dynamic) forms
- Flatten forms

**E. Sign**
- "Fill & Sign" (drawn/typed/image signature — *not* cryptographic)
- Digital signatures (cryptographic, PKI, certificate-based, PAdES)
- Request e-signatures / Adobe Sign workflow (AATL trust)

**F. Protect**
- Password (user/open password) + permissions (owner password)
- Redaction (permanent removal of text/images)
- Sanitize / remove hidden info & metadata
- Encrypt with certificates

**G. Review / collaborate**
- Comments & annotations (highlight, note, ink, shapes, text markup)
- Compare two PDFs (content/visual diff)
- Measure tool (distance/area/perimeter)

**H. Accessibility / structure**
- Auto-tag for accessibility, reading order, alt text
- PDF/UA & WCAG compliance checking
- Table/structure editing

---

## 2. The ranking: value × feasibility → MUST / SHOULD / LATER

**Scoring legend.** *Value* = how often real users need it / how much pain it removes (1–5). *Feasibility* = how cleanly it maps onto the locked OSS engines in one container, LAN-only (1–5). Tier is the product call, not just the raw product.

### MUST — high value, high feasibility (ship these first; they ARE the product)

| Feature | Val | Feas | Engine(s) | One-line rationale |
|---|---|---|---|---|
| Render / preview / thumbnails | 5 | 5 | pdf.js (client) | Table stakes; pdf.js does it in-browser, zero backend load. |
| Reorder / rotate / delete / insert pages | 5 | 5 | pdf.js + pypdf/pikepdf (assemble) | Most-used Acrobat op; do interactively client-side, persist via backend write. |
| Merge / combine | 5 | 5 | pypdf / pikepdf / `qpdf --empty --pages` | Trivial, universally wanted. |
| Split / extract by range | 5 | 5 | pypdf / pikepdf / pdfseparate | Trivial, universally wanted. |
| Compress / reduce size | 5 | 5 | Ghostscript `-dPDFSETTINGS` | One of the top public reasons people open a "PDF tool." |
| OCR scanned PDFs | 5 | 5 | **ocrmypdf** (Tesseract) | Best-in-class OSS; purpose-built, idempotent, outputs PDF/A. Huge differentiator. |
| PDF → image (rasterize) | 4 | 5 | pdftoppm / pdftocairo | Cheap, reliable, high demand. |
| Image(s) → PDF | 4 | 5 | **img2pdf** (lossless) / Ghostscript | Lossless wrap; pairs with OCR. |
| Password encrypt / decrypt | 5 | 5 | pikepdf (`Encryption`/`Permissions`) | High value, qpdf-backed, robust AES-256. |
| Set permissions (print/copy/modify) | 4 | 5 | pikepdf `Permissions` | Free rider on encryption. |
| Watermark / stamp (text/image overlay) | 4 | 5 | pikepdf overlay / pdfcpu / pypdf | Overlay is a solved problem. |
| Page numbers / Bates numbering | 4 | 4 | pdfcpu `stamp` / overlay | High value for legal/business; overlay-based. |
| Metadata view/edit | 3 | 5 | pikepdf / pypdf | Easy; also part of "sanitize." |
| Linearize ("Fast Web View") | 3 | 5 | qpdf `--linearize` (via pikepdf) | One flag; nice-to-have polish. |
| Extract text | 4 | 5 | pdftotext / pypdf | Useful utility; near-free. |
| Flatten (annotations/forms into page) | 4 | 4 | pdfcpu / Ghostscript / pikepdf | Needed before "final" export & sign. |
| Crop / resize pages | 3 | 5 | pypdf (mediabox/cropbox) | Cheap geometry edit. |
| Repair / rebuild damaged PDF | 3 | 4 | qpdf (via pikepdf) | Quiet hero; qpdf reconstructs xref. |

### SHOULD — high value but more friction, or medium value/high feasibility

| Feature | Val | Feas | Engine(s) | One-line rationale |
|---|---|---|---|---|
| PDF/A conversion (archival) | 4 | 4 | ocrmypdf / Ghostscript | Works, but conformance level & validation are fiddly (see §3/§4). |
| Fill existing AcroForm fields | 4 | 3 | pypdf (set `/V`) + pdf.js (UI) | pdf.js *displays* fields; programmatic fill/flatten on backend. Doable, edge-casey. |
| Annotations / comments | 4 | 3 | pdf.js editor (client) + pypdf write | High value; pdf.js editor exists but persistence to PDF binary is the catch (§4). |
| "Fill & Sign" (image/typed signature) | 4 | 4 | overlay image/text (pikepdf/pdfcpu) | Non-cryptographic stamp; honest framing required (NOT a digital signature). |
| Sanitize / strip metadata & hidden data | 3 | 4 | pikepdf + exiftool / qpdf | Pairs with redaction; remove XMP, attachments, JS. |
| Split by size / bookmark / N pages | 3 | 4 | pikepdf + outline parsing | Power-user split modes. |
| Rasterize-then-OCR "force" path | 3 | 4 | ocrmypdf `--force-ocr` | Fallback for ugly scans; lossy, gate behind a warning. |
| Optimize images / linearize bundle | 3 | 4 | Ghostscript + qpdf | "Optimizer" parity, partial. |
| **Redaction (true removal)** | 5 | 2–3 | rasterize region (pdftocairo) / mutool | HIGH value, but only safe via destructive rasterization. See §3 — flag heavily. |

### LATER / OUT-OF-SCOPE — flagged (low feasibility, weak OSS, or dangerous)

| Feature | Val | Feas | Reality | Verdict |
|---|---|---|---|---|
| **Reflowable text editing** (edit a paragraph, re-wrap) | 5 | 1 | No OSS engine does font-matched reflow; PDF is fixed-layout by design. | OUT. Offer "add text box / whiteout" instead. |
| **PDF → Word/Excel/PPT export** | 5 | 2 | LibreOffice headless can *attempt* it; quality is poor for anything but simple text. | LATER, "beta/best-effort" only. |
| **Cryptographic e-signature (PKI/PAdES)** | 4 | 2 | pyHanko is excellent, but trust/PKI/AATL is the hard, dangerous part. | LATER / advanced. |
| **Full accessibility auto-tagging (PDF/UA)** | 3 | 1 | No OSS auto-tagger; veraPDF only *checks*. Even Acrobat needs manual remediation. | OUT (offer checking only). |
| **Content compare (two PDFs)** | 3 | 2 | Visual pixel-diff is doable; semantic/text "Acrobat Compare" is not. | LATER (visual diff only). |
| **JavaScript form logic / XFA dynamic forms** | 2 | 1 | No OSS executes Acrobat JS or renders XFA; even pdf.js dropped/never had XFA exec. | OUT. |
| **Measure tool** (distance/area) | 2 | 3 | Implementable client-side, but niche (CAD/survey). | LATER. |
| **Certificate (public-key) encryption** | 2 | 3 | qpdf does password crypto, not recipient-cert crypto. | OUT. |

---

## 3. The "do not over-promise" flags (impractical / dangerous / weak OSS)

### 3.1 Reflowable text editing — effectively impossible in OSS
PDF is a **fixed-layout** format: text is positioned glyph-by-glyph with no paragraph or line-box model, fonts are frequently subsetted (only the used glyphs are embedded), and there's no notion of "reflow." To edit a sentence the way Acrobat does, you must reconstruct word/line boundaries, find or substitute the (possibly subset, possibly non-embedded) font, re-shape, re-justify, and rewrite the content stream — Acrobat does this with a large proprietary engine and *still* struggles. No item on the locked list, and no general OSS library (pypdf, pikepdf, mutool, pdf.js, pdf-lib) does font-matched reflow. **Recommendation:** don't pretend. Offer *additive* edits only — add a text box, redact/whiteout a region, add an image — which are honest, robust overlay operations. This avoids the #1 way a "PDF editor" disappoints users.

### 3.2 PDF → Word / Excel / PowerPoint — weak, "best effort" at most
The only self-hostable path is **LibreOffice headless** (`soffice --headless --convert-to docx infile.pdf`). It works, but PDF-as-source import goes through LibreOffice Draw and produces text-frame-heavy, visually-approximate output; complex layouts, multi-column text, and especially **tables → Excel** are unreliable. LibreOffice is also **not thread-safe** (one conversion at a time) and needs a writable per-call user profile to run multiple instances. **Recommendation:** ship PDF→Office only as an explicitly-labeled "experimental / best-effort" feature, queue it (single-flight), and set expectations. The *reverse* direction — Office→PDF via LibreOffice — is much higher quality and a reasonable SHOULD if you want "create PDF from documents."

```bash
# Reverse (good): Office -> PDF
soffice --headless --convert-to pdf --outdir /out infile.docx
# Forward (poor, best-effort): PDF -> docx, single-flight, isolated profile
soffice --headless -env:UserInstallation=file:///tmp/lo_$RANDOM \
        --convert-to 'docx:writer_pdf_import' --outdir /out infile.pdf
```

### 3.3 Cryptographic e-signatures (PKI / PAdES / AATL) — possible but the hard part isn't the code
**pyHanko** (MIT) is genuinely good: it signs and validates PDFs, supports visible/invisible signatures, **PAdES B-B/B-T/B-LT/B-LTA** baseline profiles, PKCS#11 (HSM/smartcard), timestamping (RFC 3161), and LTV. The library is not the gap. The gap is **trust**: a signature is only meaningful if the signing certificate chains to a CA the *verifier* trusts. Adobe's "blue checkmark" requires membership in the **AATL** (Adobe Approved Trust List), which a homelab will never have; self-signed or private-CA signatures show as "validity unknown / not trusted" in Acrobat. There's also real footgun potential (key handling, timestamp authority config, LTV). **Recommendation:** LATER / advanced-user feature. If built, scope it to PAdES-B with a user-provided PKCS#12, document clearly that trust depends on the verifier's trust store, and never imply Adobe-trusted signing. For 90% of users, the SHOULD-tier **"Fill & Sign" image stamp** is what they actually want.

### 3.4 Redaction — high value, but only one safe implementation
This is the most **dangerous** feature to do casually. Drawing a black rectangle over text is *not* redaction — the text remains in the content stream and is trivially recovered by copy-paste or `pdftotext`. Common failure modes (well documented): black-box-over-live-text, leaving redaction annotations *unapplied* (the to-be-removed text is stored in the annotation), and metadata/hidden-layer leakage. The only reliable self-hosted approach with the locked engines:

1. Let the user mark regions client-side (pdf.js overlay coordinates).
2. **Rasterize the affected pages** (or the whole doc) to images with the marked regions painted out, via `pdftocairo`/`pdftoppm`, then rebuild the PDF (optionally re-OCR with ocrmypdf if searchable text is still wanted *outside* the redactions).
3. Strip metadata/XMP/attachments (pikepdf/exiftool) and linearize to drop old revisions (`qpdf --linearize`).

mutool (MuPDF) offers true text-level redaction and is the cleaner engine for it, but it's **not on the locked list** (mention as a gap/option only). True per-glyph removal with pikepdf/pypdf alone is not robust. **Recommendation:** implement redaction as **destructive rasterization** of affected regions + metadata scrub, and warn the user it converts those pages to images. Never ship a "black box" that leaves text underneath.

### 3.5 Full accessibility tagging (PDF/UA) — checking yes, authoring no
There is **no** open-source auto-tagger that produces a correct logical structure tree, reading order, and alt text. Acrobat's own (now cloud-based) auto-tag is explicitly a *starting point* requiring manual remediation, and even it isn't guaranteed WCAG/PDF/UA-compliant. What OSS *can* do is **validate**: **veraPDF** is the industry-standard checker for PDF/A and PDF/UA conformance. **Recommendation:** out-of-scope for authoring; optionally bundle veraPDF as a **compliance checker / report** (a credible, honest accessibility feature).

### 3.6 Content comparison — visual yes, semantic no
Acrobat's "Compare Files" does semantic text/layout diffing. In OSS you can do a **visual pixel diff** cheaply (rasterize both with pdftoppm at matched DPI, diff with Pillow/ImageMagick, highlight changed regions) and a **text diff** (`pdftotext` + standard diff). True structural comparison is not available. **Recommendation:** LATER; if built, ship visual diff + text diff and call it that, not "Acrobat Compare."

### 3.7 JavaScript form logic & XFA — out
Acrobat forms can carry embedded JavaScript (field calc/validation) and **XFA** dynamic forms (a whole separate XML form architecture). No OSS engine executes Acrobat JS, and XFA rendering is essentially dead in OSS (pdf.js never gained real XFA execution and it's deprecated upstream). **Recommendation:** support static **AcroForm** fill + flatten only; detect XFA and warn it's unsupported.

---

## 4. Operation → engine ownership (who does what in the hybrid)

| Operation | Where it runs | Primary engine | Notes / exact knobs |
|---|---|---|---|
| Render, zoom, thumbnails | **Client** | pdf.js | No backend round-trip; keep big files in-browser. |
| Reorder / rotate / delete / insert (interactive) | **Client** preview, **backend** persist | pdf.js (preview) + pypdf/pikepdf (write) | Send the new page order; backend re-assembles. |
| Merge | Backend | pypdf `PdfWriter.append` / `qpdf --empty --pages a.pdf b.pdf -- out.pdf` | qpdf preserves more structure for tricky files. |
| Split / extract | Backend | pypdf / `pdfseparate` / `qpdf --pages` | pikepdf for page-range with structure retention. |
| Compress | Backend | **Ghostscript** | `-sDEVICE=pdfwrite -dPDFSETTINGS=/ebook` (see §5). |
| OCR | Backend | **ocrmypdf** | `--skip-text` (mixed docs), `--redo-ocr`, `--force-ocr` (lossy), `--optimize`, `--rotate-pages`, `--deskew`. |
| PDF → image | Backend | `pdftoppm` / `pdftocairo` | `pdftoppm -png -r 150`; pdftocairo for SVG/clean AA. |
| Image → PDF | Backend | **img2pdf** | Lossless (no re-encode of JPEG); Ghostscript if normalizing. |
| Encrypt / permissions | Backend | pikepdf | `pikepdf.Encryption(owner=, user=, R=6)` = AES-256. |
| Watermark / stamp | Backend | pikepdf overlay / pdfcpu `stamp` | pikepdf `Page.add_overlay`; pdfcpu for declarative text/image stamps. |
| Page #/ Bates | Backend | pdfcpu / overlay | pdfcpu `stamp` with counters, or generate overlay + multistamp. |
| Linearize / repair | Backend | qpdf (via pikepdf) | `--linearize`, `--qdf`, structural recovery. |
| Metadata edit / sanitize | Backend | pikepdf + exiftool | `pdf.docinfo`, `pdf.open_metadata()` (XMP). |
| Form fill (AcroForm) | Backend write, client UI | pypdf + pdf.js | pypdf sets field `/V`, then flatten; pdf.js shows fields. |
| Annotations | **Client** author, backend persist | pdf.js editor + pypdf | Persistence caveat below. |
| Fill & Sign (image) | Backend overlay | pikepdf/pdfcpu | Stamp PNG/typed text; non-cryptographic. |
| Redaction | Client mark, backend destroy | pdftocairo rasterize + pikepdf scrub | Destructive; see §3.4. |
| PDF/A | Backend | ocrmypdf (`--output-type pdfa`) / Ghostscript | Validate with veraPDF. |
| Compliance check | Backend | veraPDF (extra) | Report only. |
| Crypto signature | Backend | pyHanko (extra) | LATER; trust caveats. |
| Office↔PDF convert | Backend | LibreOffice headless (extra) | Single-flight; reverse direction much better. |

**pdf.js form/annotation persistence caveat (verify before promising "saves everywhere").** pdf.js stores user input in an in-memory `annotationStorage` and can bake values on print/save, but its annotation editor (freetext, highlight, ink, stamp, signature) renders as HTML overlays that **do not reliably serialize back into the PDF binary** in a way every other reader honors. For durable, cross-reader output, **do the final write on the backend** (pypdf/pikepdf) rather than trusting the browser's saved blob. pdf.js also has **no XFA execution and no programmatic AcroForm fill API** — treat client-side as authoring UX, backend as source of truth.

---

## 5. Compression presets → quality tradeoff (Ghostscript)

`-dPDFSETTINGS` is the main lever; it bundles image downsampling DPI + JPEG quality. Use these as your UI "quality" tiers:

| Preset | Image DPI target | Acrobat Distiller equiv. | Use case | Risk |
|---|---|---|---|---|
| `/screen` | 72 dpi | "Screen" | Email/web, smallest | Visibly soft images; too aggressive for print |
| `/ebook` | 150 dpi | "eBook" | **Default sweet spot** | Good balance; safe default |
| `/printer` | 300 dpi | "Print" | High-quality print | Larger files |
| `/prepress` | 300 dpi, color-preserving | "Prepress" | Pro print, preserves color | Minimal size reduction |

```bash
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.7 \
   -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=out.pdf in.pdf
```
Gotchas: Ghostscript **re-renders** the PDF (can alter appearance, flatten transparency, drop some interactivity); it does **not** guarantee a smaller file (already-optimized PDFs can grow). For scans, OCR's own `--optimize` (with jbig2enc/pngquant) often beats raw Ghostscript. Consider measuring output size and **keeping the original if it's smaller**.

---

## 6. Underrated high-value, high-feasibility wins

These are easy to skip but punch above their weight:

1. **OCR is the killer app.** ocrmypdf is purpose-built, idempotent (`--skip-text` makes it safe to run on mixed corpora), outputs PDF/A by default, and is *better* than what casual Acrobat users get. This alone justifies a self-hosted tool for anyone with a scanner. Make it a first-class, prominent feature.
2. **Lossless image→PDF with img2pdf.** Most "image to PDF" tools re-encode and bloat/blur. img2pdf wraps JPEGs *without re-compression*. Pair "scan photos → img2pdf → ocrmypdf" as a one-click "make this scan searchable" flow.
3. **Honest "Fill & Sign" (image/typed signature stamp).** 90% of "sign this PDF" requests are not cryptographic — they want their signature image on the page. A simple overlay stamp delivers what users mean, with near-zero risk, while crypto signing stays LATER.
4. **Sanitize / strip metadata + linearize.** Trivial (pikepdf + qpdf), but privacy-positive and on-brand for a privacy-first product. Bundle "remove hidden data" as a one-click button.
5. **Bates / page numbering.** Low effort (overlay), but it's a paid-tier Acrobat feature legal/business users specifically seek out.
6. **Repair (qpdf).** Quietly turns "this PDF won't open" into a win; near-free via pikepdf/qpdf's xref reconstruction.
7. **Client-side page ops = zero server cost + privacy.** Reorder/rotate/delete previewed entirely in pdf.js means instant UX and the file never leaves the browser until the user commits — a genuine architectural advantage over cloud Acrobat.

---

## 7. Recommendations

1. **Build the MUST tier as v1 and market it as "Acrobat's plumbing, self-hosted, private."** Merge, split, organize, compress, OCR, encrypt, watermark/number, rasterize, image→PDF, sanitize. These are universally wanted and all map cleanly to pikepdf / pypdf / Ghostscript / ocrmypdf / poppler. This is the product; everything else is upside.
2. **Lead with OCR + lossless image→PDF + sanitize.** The three most underrated, high-feasibility differentiators. ocrmypdf and img2pdf are best-in-class OSS and align with the privacy story.
3. **Do "signing" in two honest tiers:** ship **image/typed "Fill & Sign"** as SHOULD (overlay, no crypto), and defer **PKI/PAdES via pyHanko** to LATER with explicit trust-store caveats. Never imply Adobe-trusted validation.
4. **Implement redaction only as destructive rasterization + metadata scrub, with a clear warning.** A black-box-over-text "redaction" would be a security liability for a privacy-first product. If you want true text-level redaction later, that's the one strong reason to add **mutool** (off the locked list) to the container.
5. **Label PDF→Office and PDF compare as "experimental/best-effort," route through LibreOffice headless (single-flight) and pixel/text diff respectively, and set expectations in the UI.** Don't let weak features define the product's reputation.
6. **Explicitly mark reflowable text editing, full accessibility auto-tagging, JS/XFA forms, and certificate encryption as out-of-scope.** Offer the honest adjacent capability instead (add-text-box; veraPDF *checking*; static AcroForm fill; password encryption).
7. **Make the backend the source of truth for any change that must persist across readers.** Use pdf.js purely for interactive authoring/preview; commit annotation/form/page changes with pypdf/pikepdf so output is portable.
8. **Default compression to `/ebook`, measure output, and keep the smaller of {original, compressed}.** Avoid the classic "compress made it bigger / blurrier" complaint.

---

## 8. Gotchas / pitfalls

- **Ghostscript re-renders the whole PDF.** It can change appearance, flatten transparency, drop interactivity, and is *not guaranteed* to shrink already-optimized files. Always compare sizes and offer to keep the original.
- **"Black box" redaction leaks text.** Underlying glyphs survive copy-paste/`pdftotext`. Only rasterization (or true text-level removal) is safe. Also strip metadata, XMP, attachments, and old revisions (`qpdf --linearize`) or the leak persists in the file structure.
- **pdf.js does not reliably persist its editor annotations/form values into the PDF binary**, has **no XFA execution**, and **no programmatic AcroForm-fill API**. Commit on the backend.
- **ocrmypdf modes matter:** `--skip-text` (don't touch pages that already have text — safe default for mixed docs), `--redo-ocr` (strip old invisible OCR layer and redo, preserving vector text), `--force-ocr` (rasterize everything — **lossy**, last resort). Default tesseract page timeout is 180s; large scans can hit it.
- **LibreOffice is not thread-safe** and needs an isolated `UserInstallation` profile per concurrent call; serialize conversions or you'll get silent empty outputs / races. Add a generous timeout — it can "succeed" without producing a file.
- **PDF/A conformance is not just a flag.** Fonts must embed, transparency/JS/encryption are restricted, color spaces must be tagged. ocrmypdf/Ghostscript produce PDF/A but **validate with veraPDF** before claiming conformance.
- **Cryptographic signatures show "untrusted" without AATL.** Self-hosted signing can be technically valid (pyHanko) yet display as not-trusted in Acrobat. Communicate this or users will think it's broken.
- **Encryption R-value / cipher choice:** use pikepdf `Encryption(R=6)` for AES-256; older R=4/RC4 is weak. Owner-password "permissions" are advisory — any compliant tool *can* ignore them once the file is decrypted, so don't oversell "permissions" as security.
- **img2pdf refuses some inputs (e.g., CMYK/alpha) by design** to stay lossless; have a Pillow/Ghostscript normalization fallback for odd images.
- **Single-container resource contention:** OCR (Tesseract), Ghostscript, and LibreOffice are all CPU/RAM heavy. A homelab box needs a job queue / concurrency cap so one big OCR doesn't starve the UI. (Architecture track concern, but feature scoping should assume serialized heavy jobs.)

---

## 9. Sources

- ocrmypdf — Cookbook & Advanced features (skip-text, redo-ocr, force-ocr, PDF/A, timeouts): https://ocrmypdf.readthedocs.io/en/latest/cookbook.html and https://ocrmypdf.readthedocs.io/en/latest/advanced.html
- pikepdf — Encryption/Permissions, overlays, security model: https://pikepdf.readthedocs.io/en/latest/topics/security.html , https://pikepdf.readthedocs.io/en/latest/tutorial.html , https://pikepdf.readthedocs.io/en/latest/topics/jobs.html
- pikepdf (GitHub, qpdf-powered, MPL-2.0): https://github.com/pikepdf/pikepdf
- pypdf — split/merge/crop/rotate/encrypt/text extraction/annotations: https://github.com/py-pdf/pypdf and https://pypi.org/project/pypdf/
- Ghostscript — PDFSETTINGS presets & optimizing PDFs: https://ghostscript.com/blog/optimizing-pdfs.html
- Poppler / poppler-utils (pdftoppm, pdftocairo, pdfimages, pdftotext, pdfunite, pdfseparate): https://en.wikipedia.org/wiki/Poppler_(software) and https://manpages.debian.org/testing/poppler-utils/pdftoppm.1.en.html
- pyHanko — PAdES B-B/B-T/B-LT/B-LTA, PKCS#11, visible/invisible signatures (signing guide + repo): https://github.com/MatthiasValvekens/pyHanko and https://docs.pyhanko.eu/en/latest/cli-guide/signing.html
- PDF redaction failure modes (black-box leaks, unapplied annotations, metadata): https://www.datalogics.com/pdf-redaction-fails and https://www.argeliuslabs.com/deep-research-on-pdf-redaction-failures-and-security-risks-exploits-and-best-practices/
- MuPDF (true text/pixel-level redaction — off-list option): https://mupdf.com/
- Adobe — cloud auto-tagging accessibility limits (manual remediation required): https://helpx.adobe.com/acrobat/using/cloud-auto-tagging-accessibility-pdfs.html and https://abilitynet.org.uk/news-blogs/evaluating-adobes-new-cloud-based-auto-tagging-feature-pdf-accessibility
- Equidox — "The Truth about Auto-Tagging PDFs": https://equidox.co/blog/the-truth-about-auto-tagging-pdfs/
- LibreOffice headless conversion (not thread-safe, profile/timeout caveats): https://tariknazorek.medium.com/convert-office-files-to-pdf-with-libreoffice-and-python-a70052121c44 and https://github.com/scivision/office-headless
- pdf.js form-filling / annotation limitations (no XFA, no programmatic AcroForm fill, HTML-overlay persistence): https://www.nutrient.io/blog/complete-guide-to-pdfjs/ and https://blog.mozilla.org/attack-and-defense/2021/10/14/implementing-form-filling-and-accessibility-in-the-firefox-pdf-viewer/
- pdf.js reflow not supported (fixed-layout): https://github.com/mozilla/pdf.js/issues/8772
- Bates numbering via overlay/multistamp (open-source approaches): https://www.hildstrom.com/projects/2011/08/bates-number-a-pdf/index.html and https://github.com/n0npr0phet/batesmaster/
