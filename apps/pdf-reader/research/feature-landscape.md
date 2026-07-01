# pdf-forge — Feature Landscape: Acrobat's Real Feature Set vs. What We Can Self-Host

**Track:** feature-landscape
**Product:** pdf-forge — privacy-first, self-hosted Acrobat alternative. Single Docker container, LAN-only behind a reverse proxy. FastAPI backend (also serves the built Vite/React + pdf.js frontend). Hybrid execution: fast page-level ops client-side in pdf.js; heavy jobs (OCR, compression, linearization, encryption) POST to the backend.
**Locked server-side engines:** pikepdf (qpdf bindings), pypdf, ocrmypdf (Tesseract), Ghostscript, poppler-utils. Everything else (LibreOffice, img2pdf, pdfcpu, mutool, veraPDF, reportlab, pyHanko) is *gap commentary / optional add-on* only.

> **Bottom line up front:** ~80% of why people actually open Acrobat is *page-level document plumbing* — combine, split, reorder, rotate, delete, compress, OCR, password, stamp/number, rasterize. All of that is high-value AND high-feasibility on the locked engine list, and is where pdf-forge should win decisively. The glamorous features — reflowable text edit, faithful PDF→Word/Excel, AATL-trusted e-signatures, full PDF/UA tagging, semantic content compare, JS/XFA forms — are exactly the ones with weak or no self-hostable OSS support. Treat them as LATER, partial, or out-of-scope, and be honest in the UI about what "redaction" and "sign" actually mean. **One sharp correction to the session-1 plan: several MUST features it pinned to `img2pdf`/`pdfcpu` must be re-grounded on the *locked* engines, and there is a real engine gap — none of the five locked engines can render brand-new text onto a page, which directly affects watermark / Bates / "add text box."**

---

## 1. The real-world Acrobat feature set (enumerated)

Acrobat Pro is huge, but usage clusters into a handful of buckets:

**A. Organize / assemble (the bread and butter)** — combine/merge; split/extract (by range, size, bookmark, page count); reorder, rotate, delete, insert pages; crop/scale; thumbnail "Organize Pages" view.

**B. Optimize / convert** — compress ("Reduce File Size" / "PDF Optimizer"); OCR ("Recognize Text"); PDF↔image (PDF→JPG/PNG/TIFF, image→PDF); linearize ("Fast Web View"); create-PDF-from-Office/images; **export** PDF→Word/Excel/PowerPoint/image; PDF/A archival conversion.

**C. Edit content** — edit text (reflow, font match, re-wrap); edit/replace/move images; links, headers/footers, backgrounds; watermark/stamp; Bates numbering (legal) and page numbering.

**D. Forms** — fill existing AcroForm fields; create fields; field validation/calculation (JavaScript); XFA dynamic forms; flatten.

**E. Sign** — "Fill & Sign" (drawn/typed/image signature — *not* cryptographic); digital signatures (PKI, certificate-based, PAdES); request e-signatures / Adobe Sign workflow (AATL trust).

**F. Protect** — password (user/open) + permissions (owner password); redaction (permanent removal); sanitize / remove hidden info & metadata; certificate (public-key) encryption.

**G. Review / collaborate** — comments & annotations (highlight, note, ink, shapes, text markup); compare two PDFs (content/visual diff); measure (distance/area/perimeter).

**H. Accessibility / structure** — auto-tag for accessibility, reading order, alt text; PDF/UA & WCAG checking; table/structure editing.

---

## 2. The ranking: value × feasibility → MUST / SHOULD / LATER

**Scoring legend.** *Value* = how often real users need it / how much pain it removes (1–5). *Feasibility* = how cleanly it maps onto the **locked** engines in one LAN-only container (1–5). Tier is the product call, not the raw product.

### MUST — high value, high feasibility (ship first; they ARE the product)

| Feature | Val | Feas | Locked engine(s) | Rationale |
|---|---|---|---|---|
| Render / preview / thumbnails | 5 | 5 | pdf.js (client) | Table stakes; in-browser, zero backend load. |
| Reorder / rotate / delete / insert pages | 5 | 5 | pdf.js (preview) + pypdf/pikepdf (write) | Most-used op; interactive client-side, persist via backend. |
| Merge / combine | 5 | 5 | pypdf `PdfWriter.append`; pikepdf; `qpdf --empty --pages` | Trivial, universally wanted. |
| Split / extract by range | 5 | 5 | pypdf; pikepdf; poppler `pdfseparate`; `qpdf --pages` | Trivial, universally wanted. |
| Compress / reduce size | 5 | 5 | Ghostscript `-dPDFSETTINGS` | Top public reason people open a "PDF tool." |
| OCR scanned PDFs | 5 | 5 | **ocrmypdf** (Tesseract) | Best-in-class OSS; idempotent; **outputs PDF/A-2b by default**. The killer app. |
| PDF → image (rasterize) | 4 | 5 | poppler `pdftoppm` / `pdftocairo` | Cheap, reliable, high demand. |
| Image(s) → PDF | 4 | 4–5 | **Ghostscript** (locked) — see note; img2pdf is the better *add-on* | Wrap images as PDF; locked path = GS or hand-built pikepdf page. |
| Password encrypt / decrypt | 5 | 5 | pikepdf `Encryption` (qpdf, AES-256, R=6) | High value, robust. |
| Set permissions (print/copy/modify) | 4 | 5 | pikepdf `Permissions` | Free rider on encryption. |
| Extract text | 4 | 5 | poppler `pdftotext`; pypdf `extract_text()` | Useful utility, near-free. |
| Metadata view/edit | 3 | 5 | pikepdf `docinfo` / `open_metadata()` (XMP); pypdf | Easy; also part of "sanitize." |
| Linearize ("Fast Web View") | 3 | 5 | qpdf `--linearize` via pikepdf | One flag. |
| Crop / resize pages | 3 | 5 | pypdf (mediabox/cropbox); pikepdf | Cheap geometry edit. |
| Repair / rebuild damaged PDF | 3 | 4 | qpdf via pikepdf (xref reconstruction) | Quiet hero; "this PDF won't open" → win. |
| Flatten (forms/annotations into page) | 4 | 3–4 | Ghostscript / pikepdf | Needed before "final"/sign. Caveat: no single clean locked-engine flatten API; see §4. |

### SHOULD — high value with friction, or solid value / good feasibility

| Feature | Val | Feas | Engine(s) | Rationale |
|---|---|---|---|---|
| PDF/A conversion (archival) | 4 | 4 | ocrmypdf `--output-type pdfa` / Ghostscript | Already the OCR default; conformance level + validation are fiddly (§3.5). |
| Watermark / text+image stamp | 4 | 3 | pikepdf overlay (`add_overlay`) **+ a text generator** | Overlay is solved; *generating the text layer* is the gap (§3.8). |
| Page numbers / Bates numbering | 4 | 3 | same overlay path; pdfcpu stamp `%p/%P` as add-on | High value for legal/business; same text-generation gap. |
| "Fill & Sign" (image/typed signature) | 4 | 3–4 | pikepdf overlay of PNG/text | Non-cryptographic stamp; honest framing required. Typed text hits the text-gen caveat; image stamp does not. |
| Fill existing AcroForm fields | 4 | 3 | pypdf (set `/V`, `NeedAppearances`/flatten) + pdf.js UI | pdf.js displays + can save field values; backend is durable source of truth. |
| Annotations / comments | 4 | 3 | pdf.js editor (client) + pypdf/pikepdf persist | pdf.js editor now serializes editor annotations on save (§4) — better than session-1 claimed. |
| Sanitize / strip metadata & hidden data | 3 | 4 | pikepdf + qpdf (`--linearize` drops old revisions); exiftool add-on | Pairs with redaction; on-brand for privacy-first. |
| Split by size / bookmark / N pages | 3 | 4 | pikepdf + outline parsing | Power-user split modes. |
| Optimize images / re-OCR force path | 3 | 4 | ocrmypdf `--optimize` / `--force-ocr` (lossy) | Fallback for ugly scans; gate behind a warning. |
| **Redaction (true removal)** | 5 | 2–3 | rasterize region via poppler `pdftocairo` + pikepdf scrub | HIGH value; safe only via destructive rasterization on locked engines (§3.4). |

### LATER / OUT-OF-SCOPE — flagged (low feasibility, weak OSS, or dangerous)

| Feature | Val | Feas | Reality | Verdict |
|---|---|---|---|---|
| **Reflowable text editing** | 5 | 1 | No OSS does font-matched reflow; PDF is fixed-layout. | OUT. Offer "add text box / whiteout" instead. |
| **PDF → Word/Excel/PPT export** | 5 | 2 | LibreOffice headless *attempts* it; poor for anything but simple text; tables→Excel unreliable. | LATER, "beta/best-effort", queued single-flight. |
| **Cryptographic e-signature (PKI/PAdES)** | 4 | 2 | pyHanko is excellent; trust/AATL is the hard, dangerous part. | LATER / advanced. |
| **Full accessibility auto-tagging (PDF/UA)** | 3 | 1 | No OSS auto-tagger; veraPDF only *checks*. Even Acrobat needs manual remediation. | OUT for authoring; offer veraPDF checking. |
| **Semantic content compare** | 3 | 2 | Visual pixel-diff + text diff doable; "Acrobat Compare" semantics not. | LATER (visual+text diff only). |
| **JavaScript form logic** | 2 | 1 | No locked engine executes Acrobat JS. | OUT. |
| **XFA dynamic forms** | 2 | 1 | pdf.js has *experimental* foreground rendering only, no JS, deprecated in PDF 2.0. | OUT (detect + warn). |
| **Measure tool** (distance/area) | 2 | 3 | Implementable client-side; niche (CAD/survey). | LATER. |
| **Certificate (public-key) encryption** | 2 | 3 | qpdf/pikepdf do password crypto, not recipient-cert crypto. | OUT. |

---

## 3. The "do not over-promise" flags (impractical / dangerous / weak OSS)

### 3.1 Reflowable text editing — effectively impossible in OSS
PDF is a **fixed-layout** format: text is positioned glyph-by-glyph with no paragraph/line-box model, fonts are frequently subsetted (only used glyphs embedded), and there is no "reflow" notion. To edit a sentence the Acrobat way you must reconstruct word/line boundaries, find or substitute the (possibly subset, possibly non-embedded) font, re-shape, re-justify, and rewrite the content stream — Acrobat does this with a large proprietary engine and *still* struggles. No locked engine and no general OSS lib (pypdf, pikepdf, mutool, pdf.js, pdf-lib) does font-matched reflow; pdf.js explicitly declines reflow (fixed layout). **Recommendation:** offer *additive* edits only — add text box, whiteout/redact a region, add an image. Honest, robust overlay operations; avoids the #1 way a "PDF editor" disappoints.

### 3.2 PDF → Word / Excel / PowerPoint — weak, "best effort" at most
The only self-hostable path is **LibreOffice headless** (an add-on, not locked): `soffice --headless --convert-to docx infile.pdf`. PDF-as-source import goes through LibreOffice Draw and produces text-frame-heavy, visually-approximate output; complex layouts, multi-column text, and especially **tables → Excel** are unreliable. LibreOffice is **not thread-safe** (one conversion at a time) and needs a writable per-call user profile for concurrency. **Recommendation:** ship PDF→Office only as explicitly-labeled "experimental / best-effort," queue it single-flight, set expectations. The *reverse* (Office→PDF) is much higher quality and a reasonable SHOULD if you want "create PDF from documents."

```bash
# Reverse (good): Office -> PDF
soffice --headless --convert-to pdf --outdir /out infile.docx
# Forward (poor, best-effort): PDF -> docx, single-flight, isolated profile
soffice --headless -env:UserInstallation=file:///tmp/lo_$RANDOM \
        --convert-to 'docx:writer_pdf_import' --outdir /out infile.pdf
```

### 3.3 Cryptographic e-signatures (PKI / PAdES / AATL) — possible, but the hard part isn't code
**pyHanko** (add-on, MIT) genuinely signs and validates: visible/invisible signatures, **PAdES B-B/B-T/B-LT/B-LTA** baselines, PKCS#11 (HSM/smartcard), RFC 3161 timestamping, LTV. The library is not the gap. The gap is **trust**: a signature is meaningful only if the signing cert chains to a CA the *verifier* trusts. Adobe's "blue checkmark" requires **AATL** (Adobe Approved Trust List) membership, which a homelab will never have; self-signed / private-CA signatures show as "validity unknown / not trusted" in Acrobat. Real footgun potential in key handling, TSA config, LTV. **Recommendation:** LATER / advanced. If built, scope to PAdES-B with a user-provided PKCS#12, document that trust depends on the verifier's store, never imply Adobe-trusted signing. For 90% of users the SHOULD-tier **image "Fill & Sign"** is what they actually want.

### 3.4 Redaction — high value, but one safe implementation
The most **dangerous** feature to do casually. A black rectangle over text is *not* redaction — the glyphs remain in the content stream, trivially recovered via copy-paste or `pdftotext`. Documented failure modes: black-box-over-live-text; redaction *annotations* left unapplied (the to-be-removed text is stored in the annotation); metadata/hidden-layer leakage. The only reliable approach on the **locked** engines:

1. User marks regions client-side (pdf.js overlay coordinates).
2. **Rasterize affected pages** with regions painted out, via poppler `pdftocairo`/`pdftoppm`; rebuild the PDF. Optionally re-run ocrmypdf so text *outside* redactions stays searchable.
3. Strip metadata/XMP/attachments (pikepdf) and `qpdf --linearize` to drop prior revisions.

mutool (MuPDF, add-on) offers true text-level redaction and is cleaner, but it is **off the locked list** — mention as the one strong reason to add a sixth engine later. Per-glyph removal with pikepdf/pypdf alone is not robust. **Recommendation:** implement redaction as **destructive rasterization + metadata scrub**, and warn the user it converts those pages to images. Never ship a black box with live text underneath.

### 3.5 Full accessibility tagging (PDF/UA) — checking yes, authoring no
There is **no** OSS auto-tagger producing a correct structure tree, reading order, and alt text. Acrobat's own (cloud) auto-tag is explicitly a *starting point* needing manual remediation and isn't guaranteed WCAG/PDF-UA compliant. OSS *can* **validate**: **veraPDF** (add-on) is the industry-standard PDF/A and PDF/UA conformance checker. **Recommendation:** out-of-scope for authoring; optionally bundle veraPDF as a compliance report — a credible, honest accessibility feature.

### 3.6 Content comparison — visual yes, semantic no
Acrobat "Compare Files" does semantic text/layout diff. In OSS you can do a cheap **visual pixel diff** (rasterize both with poppler at matched DPI, diff with Pillow/ImageMagick, highlight changes) and a **text diff** (`pdftotext` + standard diff). True structural comparison isn't available. **Recommendation:** LATER; if built, ship visual + text diff and label it that, not "Acrobat Compare."

### 3.7 JavaScript form logic & XFA — out (with a correction)
Acrobat forms can carry embedded JavaScript (calc/validation) and **XFA** dynamic forms. **No locked engine executes Acrobat JS.** On XFA, session-1 said pdf.js "never had / dropped XFA exec" — **that's imprecise**: pdf.js shipped *experimental* XFA **foreground rendering** (no JS, render-only), but it is low-fidelity versus Acrobat and XFA is **deprecated in PDF 2.0 (ISO 32000-2, 2017)**. Net effect is the same for us: unusable for real dynamic forms. **Recommendation:** support static **AcroForm** fill + flatten only; detect XFA and warn it's unsupported.

### 3.8 NEW FLAG — no locked engine can *render new text onto a page*
This is the gap session-1 glossed over. The five locked engines can **overlay one PDF page onto another** (pikepdf `add_overlay`, pypdf `merge_page`) and **transform existing content**, but **none of them draws new text from scratch** with a high-level API: pypdf/pikepdf have no text-drawing primitives, Ghostscript and poppler don't author text content, and ocrmypdf only lays an invisible OCR layer. So **text watermark, page numbers, Bates, typed "Fill & Sign", and "add text box"** all need a text layer to exist first. Three honest options:
- **Add `reportlab`** (add-on) to generate a small stamp PDF, then overlay it with pikepdf/pypdf — the standard, robust pattern.
- **Add `pdfcpu`** (add-on) — its `stamp` supports text/image/PDF stamps and page-number format strings (`%p` current, `%P` total, with offsets), which covers Bates-style numbering declaratively. (pdfcpu has no command literally named "Bates," but stamp format strings achieve it.)
- **Hand-build a content stream in pikepdf** (emit `BT /F1 size Tf x y Td (text) Tj ET` with a base-14 font) — locked-engine-only, but you own font metrics/positioning and it's fiddly.

**Recommendation:** treat watermark/Bates/typed-sign/add-text-box as a single capability that depends on a text-generation helper. The cleanest realistic stack adds **reportlab** (pure-Python, no system binary, container-friendly) *or* **pdfcpu** (single Go binary). Image stamps and image "Fill & Sign" need **no** extra engine — pure pikepdf overlay — so ship those first.

---

## 4. Operation → engine ownership (the hybrid)

| Operation | Where | Primary (locked) engine | Knobs / notes |
|---|---|---|---|
| Render, zoom, thumbnails | **Client** | pdf.js | No round-trip; big files stay in-browser. |
| Reorder/rotate/delete/insert (interactive) | **Client** preview, **backend** persist | pdf.js + pypdf/pikepdf | Send new page order; backend re-assembles. |
| Merge | Backend | pypdf `PdfWriter.append` / `qpdf --empty --pages` | qpdf preserves more structure on tricky files. |
| Split / extract | Backend | pypdf / poppler `pdfseparate` / `qpdf --pages` | pikepdf for range with structure retention. |
| Compress | Backend | **Ghostscript** | `-sDEVICE=pdfwrite -dPDFSETTINGS=/ebook` (§5). |
| OCR | Backend | **ocrmypdf** | `--skip-text`, `--redo-ocr`, `--force-ocr`, `--optimize`, `--rotate-pages`, `--deskew`. |
| PDF → image | Backend | poppler `pdftoppm` / `pdftocairo` | `pdftoppm -png -r 150`; pdftocairo for SVG/clean AA. |
| Image → PDF | Backend | Ghostscript (locked) / img2pdf (better add-on) | img2pdf wraps JPEG losslessly; GS re-encodes. |
| Encrypt / permissions | Backend | pikepdf | `pikepdf.Encryption(owner=, user=, R=6)` = AES-256. |
| Watermark / stamp (image) | Backend | pikepdf `add_overlay` | Image stamp = pure locked engines. |
| Watermark / Bates / typed text | Backend | pikepdf overlay **+ reportlab/pdfcpu** text gen | See §3.8 — text layer needs a generator. |
| Linearize / repair | Backend | qpdf via pikepdf | `--linearize`, `--qdf`, xref recovery. |
| Metadata edit / sanitize | Backend | pikepdf (+ exiftool add-on) | `docinfo`, `open_metadata()` (XMP). |
| Form fill (AcroForm) | Backend write, client UI | pypdf + pdf.js | Set `/V`; `NeedAppearances` or flatten; pdf.js shows + can save values. |
| Annotations | **Client** author, backend persist | pdf.js editor + pypdf/pikepdf | pdf.js now serializes editor annotations on save (note below). |
| Fill & Sign (image) | Backend overlay | pikepdf | PNG/typed stamp; non-cryptographic. |
| Redaction | Client mark, backend destroy | poppler `pdftocairo` + pikepdf scrub | Destructive; §3.4. |
| PDF/A | Backend | ocrmypdf (`--output-type pdfa`) / Ghostscript | Validate with veraPDF add-on. |
| Compliance check | Backend | veraPDF (add-on) | Report only. |
| Crypto signature | Backend | pyHanko (add-on) | LATER; trust caveats. |
| Office↔PDF | Backend | LibreOffice headless (add-on) | Single-flight; reverse direction much better. |

**pdf.js form/annotation persistence — CORRECTED from session 1.** Session-1 stated pdf.js editor annotations "do not reliably serialize back into the PDF binary." That is now **out of date**. Modern pdf.js (the annotation editor: **freetext, highlight, ink, stamp, and signature** — signature being the most recent addition) **does serialize editor-created annotations into the downloaded PDF as real PDF annotation objects**, and form-field values entered via `annotationStorage` are written on save; these are readable by other viewers. The remaining caveats are real but narrower: (a) **fidelity/flattening** isn't guaranteed identical across readers; (b) pdf.js has **no Acrobat-JS execution** and **no XFA JS**; (c) the *display* annotation layer (non-editor) is HTML overlay only. **Recommendation stands:** for output that must be portable and durable, do the authoritative write on the backend (pypdf/pikepdf), and use pdf.js as authoring UX — but you may trust pdf.js's saved blob for simple annotation round-trips more than session-1 implied.

---

## 5. Compression presets → quality tradeoff (Ghostscript)

`-dPDFSETTINGS` is the main lever; it bundles image-downsampling DPI + JPEG quality. Use as your UI "quality" tiers:

| Preset | Image DPI target | Distiller equiv. | Use case | Risk |
|---|---|---|---|---|
| `/screen` | 72 dpi | "Screen" | Email/web, smallest | Visibly soft; too aggressive for print |
| `/ebook` | 150 dpi | "eBook" | **Default sweet spot** | Good balance; safe default |
| `/printer` | 300 dpi | "Print" | High-quality print | Larger files |
| `/prepress` | 300 dpi, color-preserving | "Prepress" | Pro print | Minimal size reduction |

```bash
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.7 \
   -dPDFSETTINGS=/ebook -dNOPAUSE -dQUIET -dBATCH \
   -sOutputFile=out.pdf in.pdf
```
Gotchas: Ghostscript **re-renders** the PDF (can alter appearance, flatten transparency, drop interactivity); it does **not** guarantee a smaller file (already-optimized PDFs can grow). For scans, ocrmypdf's `--optimize` (with jbig2enc/pngquant) often beats raw Ghostscript. **Measure output and keep the original if it's smaller.**

---

## 6. Underrated high-value, high-feasibility wins

1. **OCR is the killer app.** ocrmypdf is purpose-built, idempotent (`--skip-text` makes it safe on mixed corpora), and **outputs PDF/A-2b by default** (confirmed in current docs) — *better* than what casual Acrobat users get. Make it first-class and prominent. (Note: if Ghostscript *or* veraPDF is missing, `--output-type auto` silently falls back to plain PDF — keep both in the image.)
2. **Lossless image→PDF.** Most "image to PDF" tools re-encode and bloat/blur. The *locked* path (Ghostscript) re-encodes; adding **img2pdf** wraps JPEGs without re-compression. Pair "scan photos → img2pdf → ocrmypdf" as one-click "make this scan searchable." Flag: img2pdf refuses some inputs (CMYK/alpha) by design — keep a Pillow/GS normalization fallback.
3. **Honest image "Fill & Sign."** 90% of "sign this PDF" requests aren't cryptographic — users want their signature image on the page. A pure pikepdf overlay (no extra engine) delivers exactly that, near-zero risk, while crypto signing stays LATER.
4. **Sanitize / strip metadata + linearize.** Trivial (pikepdf + qpdf), privacy-positive, on-brand. Ship "remove hidden data" as a one-click button.
5. **Bates / page numbering.** A paid-tier Acrobat feature legal/business users specifically seek — but remember the §3.8 text-generation dependency; budget reportlab or pdfcpu.
6. **Repair (qpdf).** Quietly turns "this PDF won't open" into a win; near-free via pikepdf/qpdf xref reconstruction.
7. **Client-side page ops = zero server cost + privacy.** Reorder/rotate/delete entirely in pdf.js means instant UX and the file never leaves the browser until commit — a genuine edge over cloud Acrobat.

---

## 7. Recommendations

1. **Build the MUST tier as v1 and market it as "Acrobat's plumbing, self-hosted, private."** Merge, split, organize, compress, OCR, encrypt, rasterize, image→PDF, extract text, sanitize, linearize, repair — all map cleanly to the five locked engines. This is the product; everything else is upside.
2. **Lead with OCR + lossless image→PDF + sanitize** — the most underrated, high-feasibility differentiators that also align with the privacy story. ocrmypdf and img2pdf are best-in-class.
3. **Decide the text-generation engine early (§3.8).** Watermark, Bates, page numbers, typed "Fill & Sign," and "add text box" all depend on it. Add **reportlab** (pure-Python, no binary — easiest in a Python container) or **pdfcpu** (single Go binary, declarative stamps + page-number format strings). Ship **image** stamps/signatures first since they need no extra engine.
4. **Do "signing" in two honest tiers:** image/typed "Fill & Sign" as SHOULD (overlay, no crypto); defer PKI/PAdES via pyHanko to LATER with explicit trust-store caveats. Never imply Adobe-trusted validation.
5. **Implement redaction only as destructive rasterization + metadata scrub, with a clear warning.** A black-box-over-text "redaction" would be a security liability for a privacy-first product. True text-level redaction is the single best reason to later add mutool (off-list).
6. **Label PDF→Office and PDF compare as "experimental/best-effort,"** route through LibreOffice headless (single-flight) and pixel/text diff respectively, set expectations in the UI. Don't let weak features define the product's reputation.
7. **Mark reflowable text editing, full accessibility auto-tagging, JS forms, XFA, and certificate encryption as out-of-scope.** Offer the honest adjacent capability instead (add-text-box; veraPDF *checking*; static AcroForm fill; password encryption).
8. **Make the backend the source of truth for any durable change** (page ops, form fill, redaction, stamps). Use pdf.js for interactive authoring/preview; commit with pypdf/pikepdf so output is portable. (You can trust pdf.js's annotation save for simple round-trips more than session-1 assumed, but the backend write remains the guarantee.)
9. **Default compression to `/ebook`, measure output, keep the smaller of {original, compressed}.** Avoid the classic "compress made it bigger/blurrier" complaint.

---

## 8. Gotchas / pitfalls

- **No locked engine renders new text (NEW).** Watermark/Bates/typed-sign/add-text-box need a text-layer generator (reportlab or pdfcpu) or a hand-built pikepdf content stream. Don't promise text features assuming pikepdf/pypdf will draw them.
- **Ghostscript re-renders the whole PDF.** Can change appearance, flatten transparency, drop interactivity; not guaranteed to shrink. Compare sizes; offer to keep the original.
- **"Black box" redaction leaks text.** Underlying glyphs survive copy-paste/`pdftotext`. Only rasterization (or true text-level removal) is safe. Also strip metadata/XMP/attachments and old revisions (`qpdf --linearize`).
- **pdf.js: no Acrobat-JS, no XFA JS, only experimental low-fidelity XFA *rendering*.** Editor annotations now *do* serialize on save (correction), but make the backend authoritative for guaranteed portability.
- **ocrmypdf modes matter:** `--skip-text` (leave pages that already have text — safe default for mixed docs), `--redo-ocr` (strip prior invisible OCR and redo, preserving vector text), `--force-ocr` (rasterize everything — **lossy**, last resort). Default tesseract page timeout is **180s** (`--tesseract-timeout`); large scans can hit it. **Default `--output-type` is `pdfa` (PDF/A-2b)** — and it silently drops to plain PDF if Ghostscript *or* veraPDF is absent, so keep both in the image.
- **LibreOffice is not thread-safe** and needs an isolated `UserInstallation` profile per concurrent call; serialize conversions or get silent empty outputs / races. Add a generous timeout — it can "succeed" without producing a file.
- **PDF/A conformance is not just a flag.** Fonts must embed; transparency/JS/encryption restricted; color spaces tagged. ocrmypdf/Ghostscript *produce* PDF/A but **validate with veraPDF** before claiming conformance.
- **Crypto signatures show "untrusted" without AATL.** Self-hosted signing can be valid (pyHanko) yet display as not-trusted in Acrobat. Communicate this.
- **Encryption R-value:** use pikepdf `Encryption(R=6)` for AES-256; older R=4/RC4 is weak. Owner-password "permissions" are **advisory** — any compliant tool can ignore them once decrypted; don't oversell "permissions" as security.
- **img2pdf refuses CMYK/alpha by design** to stay lossless; keep a Pillow/Ghostscript normalization fallback.
- **Single-container resource contention:** OCR (Tesseract), Ghostscript, LibreOffice are all CPU/RAM heavy. The homelab box needs a job queue / concurrency cap so one big OCR doesn't starve the UI. (Architecture-track concern; feature scoping should assume serialized heavy jobs.)

---

## 9. Changes vs. session 1

- **CORRECTED — engine grounding for several MUST/SHOULD features.** Session-1 listed `img2pdf` and `pdfcpu` as primary engines for image→PDF, watermark/stamp, and Bates. Those are **not on the locked list**. Re-grounded: image→PDF on **Ghostscript** (locked) with img2pdf as the better add-on; watermark/Bates flagged as needing a text generator (§3.8).
- **NEW — the missing "no locked engine renders text" gap (§3.8).** Session-1 implied pikepdf/pypdf could produce watermark/Bates/typed-sign directly. They can only *overlay* an existing page. Text features require reportlab, pdfcpu, or a hand-built content stream. This changes SHOULD-tier feasibility scores (4→3) and v1 build order (ship *image* stamps first).
- **CORRECTED — pdf.js XFA.** Session-1 said pdf.js "never had / dropped XFA exec." pdf.js actually ships *experimental foreground XFA rendering* (render-only, no JS, low fidelity); XFA is deprecated in PDF 2.0. Verdict unchanged (OUT), reasoning sharpened.
- **CORRECTED — pdf.js annotation persistence.** Session-1 said editor annotations "do not reliably serialize into the PDF binary." Modern pdf.js (freetext/highlight/ink/stamp/**signature** editor) **does serialize editor annotations into the saved PDF** as real annotation objects, and writes form values via `annotationStorage`. Caveats narrowed to fidelity + no-JS. Backend-as-source-of-truth recommendation retained.
- **CONFIRMED — ocrmypdf defaults.** Verified against current docs (v17.x): default `--output-type` is **pdfa (PDF/A-2b)**; `--skip-text`/`--redo-ocr`/`--force-ocr` semantics; 180s default tesseract timeout. ADDED nuance: falls back to plain PDF if Ghostscript or veraPDF is missing.
- **CONFIRMED — pikepdf encryption** (R=6 AES-256, `Permissions`, advisory nature) and **Ghostscript PDFSETTINGS** DPI tiers (72/150/300/300).
- **ADDED — pdfcpu Bates nuance.** pdfcpu has no command literally named "Bates," but `stamp` with `%p`/`%P` page-number format strings + offsets covers Bates-style numbering. Session-1 implied a dedicated capability.
- **CONFIRMED + version-stamped** — pdf.js current line is v5.x (Nov 2025), not 4.x; redaction failure modes; LibreOffice non-thread-safety; pyHanko PAdES profiles; veraPDF as checker-only; no-OSS-auto-tagging.

---

## 10. Sources

- ocrmypdf — Cookbook (skip-text/redo-ocr/force-ocr, PDF/A normalization), v17.7.1: https://ocrmypdf.readthedocs.io/en/latest/cookbook.html
- ocrmypdf — Advanced features (tesseract timeout 180s, optimize, force-ocr): https://ocrmypdf.readthedocs.io/en/latest/advanced.html
- ocrmypdf — Introduction (default `--output-type pdfa` / PDF-A-2b; GS+veraPDF fallback): https://ocrmypdf.readthedocs.io/en/latest/introduction.html
- ocrmypdf(1) man page (Debian): https://manpages.debian.org/unstable/ocrmypdf/ocrmypdf.1.en.html
- pikepdf — PDF security (Encryption/Permissions, AES-256, R-values, advisory permissions): https://pikepdf.readthedocs.io/en/latest/topics/security.html
- pikepdf — Tutorial & main API (overlay, docinfo, XMP): https://pikepdf.readthedocs.io/en/latest/tutorial.html , https://pikepdf.readthedocs.io/en/latest/api/main.html
- pypdf — merge/split/crop/rotate/encrypt/forms/text: https://github.com/py-pdf/pypdf , https://pypi.org/project/pypdf/
- Ghostscript — optimizing PDFs / PDFSETTINGS presets: https://ghostscript.com/blog/optimizing-pdfs.html
- poppler-utils (pdftoppm/pdftocairo/pdftotext/pdfseparate/pdfunite): https://manpages.debian.org/testing/poppler-utils/pdftoppm.1.en.html
- pdfcpu — Stamp (text/image/PDF, format strings) and Watermark: https://pdfcpu.io/core/stamp.html , https://pdfcpu.io/core/watermark.html
- pdfcpu — page-number format strings issue (`%p`/`%P`): https://github.com/pdfcpu/pdfcpu/issues/297
- pdf.js — XFA experimental/foreground limitations: https://github.com/mozilla/pdf.js/issues/13508 , https://github.com/mozilla/pdf.js/issues/14249
- pdf.js — Wikipedia (feature/version overview): https://en.wikipedia.org/wiki/PDF.js
- pdf.js — editor types & save limitations (complete guide): https://www.nutrient.io/blog/complete-guide-to-pdfjs/
- pdf.js — Firefox form filling / accessibility (annotationStorage save): https://blog.mozilla.org/attack-and-defense/2021/10/14/implementing-form-filling-and-accessibility-in-the-firefox-pdf-viewer/
- pdf.js — reflow not supported (fixed-layout): https://github.com/mozilla/pdf.js/issues/8772
- pyHanko — signing guide (PAdES B-B/B-T/B-LT/B-LTA, PKCS#11, LTV): https://docs.pyhanko.eu/en/latest/cli-guide/signing.html , https://github.com/MatthiasValvekens/pyHanko
- PDF redaction failure modes: https://www.datalogics.com/pdf-redaction-fails
- MuPDF (true text/pixel-level redaction — off-list option): https://mupdf.com/
- Adobe cloud auto-tagging limits (manual remediation required): https://helpx.adobe.com/acrobat/using/cloud-auto-tagging-accessibility-pdfs.html
- veraPDF (PDF/A + PDF/UA conformance checker): https://verapdf.org/
- LibreOffice headless conversion (not thread-safe, profile/timeout caveats): https://github.com/scivision/office-headless
- img2pdf (lossless image wrap; CMYK/alpha refusals): https://gitlab.mister-muffin.de/josch/img2pdf
- reportlab (text/stamp PDF generation — text-layer add-on): https://docs.reportlab.com/
