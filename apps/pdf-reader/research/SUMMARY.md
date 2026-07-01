# pdf-forge — Combined Planning Brief

> This document merges two research passes into one authoritative plan: an archived first session (product then called "PDFsmith") and a fresh second pass (pdf-forge). They are the same project; where the two disagreed, the second pass is authoritative and the change is noted.

## 1. Framing

**pdf-forge** is a privacy-first, self-hosted Acrobat alternative: a single Docker container running in a homelab, LAN-only behind a reverse proxy, with no telemetry and no cloud round-trips. The backend is **Python + FastAPI**, which also serves the built Vite/React frontend from the same container. The architecture is **hybrid**: fast page-level operations (reorder, rotate, delete, merge/split, preview, simple form fill) run **client-side** in the browser via pdf.js (render) + pdf-lib (write); heavy jobs (OCR, lossy compression, linearization, AES encryption, PDF/A, repair, redaction) **POST to the backend** and run through pikepdf / Ghostscript / ocrmypdf / poppler in a bounded job queue. Every durable artifact is finalized server-side with a pikepdf normalization + linearization pass so the backend is the canonical source of truth.

---

## 2. Proposed Feature Set

Engines referenced: **pikepdf** (qpdf bindings), **pypdf**, **ocrmypdf** (Tesseract), **Ghostscript**, **poppler-utils**, **pdf.js** (render), **pdf-lib** (client write), plus one **text-generation engine TBD** (reportlab vs pdfcpu — see Open Questions). No locked engine can render *new* text onto a page, so any feature that draws text depends on that decision.

### MUST (v1)

| Feature | Engine / lib | Client/Server | Rationale |
|---|---|---|---|
| Reorder / rotate / delete pages | pdf-lib (write), pdf.js (preview) | Client | Instant, zero-upload page-model edits; baked to bytes on export. |
| Merge / split | pdf-lib (client), pikepdf (server finalize) | Client -> server finalize | copyPages() in browser for small files; pikepdf for big/encrypted. |
| Compress (lossy) | Ghostscript -dPDFSETTINGS=/ebook (150 dpi) | Server | Only responsible engine; keep smaller of input/output. |
| OCR (searchable PDF) | ocrmypdf (Tesseract) | Server | CPU-heavy; outputs PDF/A by default. |
| Encrypt / decrypt (AES-256) | pikepdf Encryption(R=6, aes=True); pypdf fallback | Server | Real confidentiality needs a USER password; decrypt robustly with pikepdf. |
| Set/clear permissions | pikepdf.Permissions | Server | Advisory only — must be labeled as such in UI. |
| Rasterize pages | pypdfium2 / poppler pdftocairo (or ocrmypdf --force-ocr) | Server | Foundation for redaction and "flatten everything." |
| Image -> PDF | Ghostscript (locked); img2pdf add-on for lossless | Server | img2pdf preferred when inputs are non-CMYK/non-alpha. |
| Extract text | pdf.js (client quick) / poppler pdftotext (server) | Both | Client for preview/search; server for batch. |
| Sanitize / strip metadata + XMP + attachments | pikepdf | Server | On-brand privacy one-click; mandatory on redact. |
| Linearize ("web optimize") | pikepdf save(linearize=True) / qpdf | Server | Final-save normalization for every durable artifact. |
| Repair / recover | pikepdf (qpdf) | Server | Hardened parser; never use pypdf for repair. |
| Preview / thumbnails | pdf.js (client); poppler pdftocairo (server jobs) | Both | Client for UI; poppler for server-only thumbnails. |

### SHOULD (post-v1)

| Feature | Engine / lib | Client/Server | Rationale |
|---|---|---|---|
| Image stamps / signatures | pikepdf overlay | Server (or client pdf-lib) | **Ship first** — needs no text engine, pure overlay. |
| Watermark / page numbers / Bates | text engine TBD (reportlab or pdfcpu) | Server | **CHANGED vs S1**: no locked engine renders text; feasibility lowered 4->3, deferred behind engine decision. |
| Typed Fill & Sign (overlay, no crypto) | text engine TBD | Server | Honest "tier-1 signing" — overlay, not PKI. |
| Add text box | text engine TBD | Server | Same text-engine dependency. |
| Static AcroForm fill / flatten | pypdf (fill) + Ghostscript/pdfcpu (flatten) | Server (client for simple fill) | **CHANGED vs S1**: pdf.js annotationStorage round-trips simple fills better than S1 assumed; durable flatten still needs a spike. |
| PDF/A conversion + validation | ocrmypdf + veraPDF | Server | 2b default; bundle veraPDF to avoid ocrmypdf's silent plain-PDF fallback. |
| Redaction (destructive) | poppler pdftocairo rasterize + pikepdf scrub + linearize | Server | Only honest option; never black-box over live text. |

### LATER / OUT-OF-SCOPE

| Feature | Engine / lib | Client/Server | Rationale |
|---|---|---|---|
| PKI / PAdES cryptographic signing | pyHanko | Server (LATER) | Untrusted in Acrobat without AATL; homelab can't get AATL — explicit caveat only. |
| PDF -> Office | LibreOffice headless (single-flight) | Server (LATER, experimental) | Best-effort; not thread-safe, serialize + timeout. |
| PDF compare | pixel-diff + text-diff | Server (LATER, experimental) | Not "Acrobat Compare." |
| Reflowable text editing | — | OUT | No locked engine supports it. |
| Full PDF/UA auto-tagging | — | OUT | Out of scope; offer veraPDF checking instead. |
| JS forms / XFA | — | OUT | XFA deprecated in PDF 2.0; pdf.js renders XFA experimentally only. |
| Certificate/public-key encryption | — | OUT | qpdf/pikepdf support password-based only. |
| True text-level redaction | mutool/MuPDF (off-list) | OUT (v1) | Would need a 6th engine; destructive rasterization accepted for v1. |

---

## 3. Definitive Client/Server Split

Client/server line: browser path for files **< ~150 MB** (configurable), hard server-only cutoff **~300-500 MB**, single client ArrayBuffer kept well under 1 GB (Chrome caps ~2 GB / 0x7fe00000).

| Feature | Runs | Why | Engine/lib |
|---|---|---|---|
| Render / preview / thumbnails | Client | Zero upload, instant | pdf.js (OffscreenCanvas) |
| Reorder / rotate / delete | Client | Page-model edits, no latency | pdf-lib write |
| Merge / split (small) | Client | copyPages() in-browser | pdf-lib |
| Merge / split (large or encrypted) | Server | Memory + decryption | pikepdf |
| Simple form fill | Client | annotationStorage round-trip | pdf.js / pdf-lib |
| Static AcroForm fill (durable) + flatten | Server | Reliable flatten | pypdf + Ghostscript/pdfcpu |
| Compress (lossy) | Server | Ghostscript only | Ghostscript /ebook |
| OCR | Server | CPU/RAM heavy | ocrmypdf |
| Encrypt / decrypt | Server | Crypto + robustness | pikepdf (pypdf AES-256 fallback) |
| Permissions | Server | qpdf semantics | pikepdf.Permissions |
| Linearize | Server | qpdf-grade output | pikepdf/qpdf |
| Repair | Server | Hardened parser | pikepdf |
| Rasterize / redaction | Server | Render + scrub | pypdfium2/poppler + pikepdf |
| Image -> PDF | Server | Normalization fallback | Ghostscript / img2pdf |
| Sanitize / strip metadata | Server | Canonical scrub | pikepdf |
| Watermark / Bates / page numbers / add-text / typed sign | Server | Needs text renderer | text engine TBD |
| PDF/A + validate | Server | veraPDF + ocrmypdf | ocrmypdf + veraPDF |
| Extract text | Both | Client preview / server batch | pdf.js / poppler pdftotext |
| **Every durable change** | **Server finalize** | Canonical, linearized, integrity-checked | **pikepdf save(linearize=True)** |

**Reconciliation rule (Option A):** client edits upload the *edited bytes* (not an op manifest); single stateless source of truth, finished by the pikepdf pass. Always decrypt server-side with pikepdf before any pdf-lib operation (pdf-lib cannot decrypt; {ignoreEncryption:true} yields garbage).

---

## 4. Engine-Per-Operation Mapping

| Operation | Owner | Fallback |
|---|---|---|
| Structural edit (merge/split/reorder server-side) | pikepdf | pypdf |
| Decrypt / repair | pikepdf (qpdf) | — (never pypdf) |
| Encrypt (AES-256 R6) | pikepdf | pypdf encrypt(algorithm='AES-256') |
| Permissions | pikepdf.Permissions | — |
| Lossy compression | Ghostscript /ebook | — (keep smaller of in/out) |
| Lossless image extraction | pikepdf | poppler pdfimages |
| OCR | ocrmypdf (Tesseract) | — |
| PDF/A produce + validate | ocrmypdf + veraPDF | Ghostscript (fallback) |
| Rasterize | pypdfium2 | poppler pdftocairo; ocrmypdf --force-ocr |
| Server thumbnails / previews | poppler pdftocairo | pdftoppm |
| Text extraction (server) | poppler pdftotext | pypdf |
| Form fill | pypdf | pdf.js annotationStorage (client) |
| Form flatten | Ghostscript or pdfcpu | pypdf NeedAppearances (needs spike) |
| Linearize | pikepdf/qpdf | — |
| New-text rendering (watermark/Bates/typed-sign) | text engine TBD (reportlab or pdfcpu) | hand-built pikepdf content stream |
| Image stamps/signatures | pikepdf overlay | pdf-lib (client) |
| Image -> PDF | img2pdf | Ghostscript / Pillow normalize |
| Client render | pdf.js | qpdf-wasm (niche) |
| Client write | pdf-lib | — |

---

## 5. Security & Ops Non-Negotiables

- **Sandbox Ghostscript as if -dSAFER is already broken** (it has been — CVE-2024-29510 actively exploited): worker runs non-root + cap_drop ALL + no-new-privileges + read-only rootfs + tmpfs/volume-only writes + **no network egress**. Container isolation, not input validation, is the primary defense.
- **Pin the framework, not just engines:** starlette>=0.47.2 (fixes CVE-2024-47874 multipart OOM and CVE-2025-54121 event-loop block), Ghostscript latest 10.0x, pdf.js>=4.2.67 (CVE-2024-4367, fires even without enableScripting). Rebuild image on a schedule given the relentless GS CVE stream.
- **Three-stage upload validation:** extension allow-list -> magic bytes (python-magic, first ~2KB) -> structural open with pikepdf/qpdf (the qpdf open is the authority; libmagic is only a filter, polyglots pass).
- **Enforce your own streaming byte-count cap** — UploadFile has NO size limit; SpooledTemporaryFile rolls to disk at 1 MB and writes until disk full. Pair with a reverse-proxy body cap >= app MAX_BYTES.
- **Bound every subprocess:** wall-clock timeout + os.killpg of the whole process group (subprocess(timeout=) only kills the direct child, not gs/tesseract grandchildren), setrlimit CPU/FSIZE, ocrmypdf --jobs 1-2 --tesseract-timeout, global worker pool of 1-2 with bounded queue -> 429.
- **Async-job pattern (202 + poll/SSE)** for OCR/compress/linearize so proxy read-timeouts and request buffering stop mattering; CPU-bound work must run in a worker process/pool, never in-process (it freezes the FastAPI event loop).
- **Auth at the proxy** (Authelia forward-auth, or Basic-over-TLS single-user stopgap); publish ONLY the proxy and bind pdf-forge to an internal Docker network so forward-auth headers can't be forged from the LAN.
- **Per-job temp dir** on a size-bounded volume, cleaned in finally/BackgroundTask, hourly TTL janitor for orphans, shutil.disk_usage precheck -> 507.
- **Harden pdf.js:** pin >=4.2.67, isEvalSupported:false, enableScripting:false, strict CSP (no unsafe-eval, worker-src 'self').
- **Permissions are advisory** and owner-only (blank user password) PDFs open for anyone — say so plainly in the UI; never oversell as security.
- **Don't pass client filenames to engines** (overlong-UTF-8 ../ traversal was a real GS bug); generate server-side names.

---

## 6. Packaging Snapshot

- **Base image:** three-stage — node:22-slim (build Vite) -> python:3.13-slim-trixie builder (venv via pip or uv sync --frozen) -> python:3.13-slim-trixie runtime. Debian slim on **trixie** (Debian 13 default), **not** Alpine, **not** distroless (glibc manylinux wheels + shelled-out binaries).
- **Key system deps (apt, --no-install-recommends, single RUN):** ghostscript tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu qpdf poppler-utils unpaper pngquant fonts-noto-core (+ fonts-noto-cjk if CJK). **Build jbig2enc from source** (not in Debian apt — biggest mono-scan compression win). Add **veraPDF** for PDF/A validation. Bundle **pypdfium2** + **fpdf2** (ocrmypdf v17 deps). **Do NOT apt-install for pikepdf/pypdf** — pikepdf wheels bundle libqpdf/libjpeg/zlib; pypdf is pure Python.
- **Serve SPA in-process:** FastAPI 0.138.0 app.frontend('/', directory='static', fallback='index.html'), API under /api/*. No nginx sidecar.
- **Runtime hardening:** non-root UID 10001, read-only rootfs, **disk-backed named volume for /app/jobs** (NOT tmpfs — big rasters OOM-kill the container), small tmpfs /tmp, TMPDIR=/app/jobs/tmp, OMP_THREAD_LIMIT=1, cap_drop ALL, no-new-privileges, pids_limit, ~2 CPU / 2 GB limits.
- **Expected image size:** ~600 MB-1 GB on-disk (uncompressed; registry/compressed smaller).
- **Healthcheck:** /api/health via python -c urllib one-liner (slim has no curl); interval=30s timeout=5s retries=3 start-period=20s.
- **Document the proxy body cap:** nginx client_max_body_size defaults to 1 MB -> real uploads 413 until raised (the #1 self-host break). Traefik no default cap; Caddy streams.
- **Pin everything:** base image digests, Python lockfile/uv.lock, package-lock.json + npm ci. GS preset behavior and qpdf linearization byte output drift across versions.

Confirmed current versions: pikepdf 10.9.1, pypdf 6.14.2, ocrmypdf 17.7.1, qpdf 12.3.2, poppler 26.06.0, pdf.js v6 (pdfjs-dist 6.1.200) / v5.x runtime line, React 19.2.

---

## 7. Open Questions for the Planning Session

Consolidated and de-duplicated across both sessions. Each is a concrete decision.

1. **Text-generation engine: reportlab vs pdfcpu?** Blocks watermark/Bates/page-numbers/typed-sign/add-text-box. reportlab = pure-Python, no system binary; pdfcpu = single Go binary with declarative stamps + %p/%P page-number format strings. *(Raised by feature + client/server tracks; unresolved.)*
2. **Add a 6th engine (mutool/MuPDF, AGPL)?** Would enable true text-level redaction and faster render/extract, but adds an AGPL dependency. *(Second pass decided destructive rasterization is acceptable for v1; revisit for v2.)*
3. **AcroForm flatten reliability** — no clean locked-engine flatten API. Needs a code spike: pypdf NeedAppearances + Ghostscript flatten vs pdfcpu. *(Unresolved.)*
4. **PDF/A conformance target** (2b vs 3b vs PDF/A-1) and confirm veraPDF is bundled to avoid ocrmypdf's silent plain-PDF fallback. *(Second pass strongly recommends bundling veraPDF; level still open.)*
5. **Sync vs async (202 + poll/SSE) as the default UX** for heavy jobs. *(Second pass recommends async/queue; final call + frontend polling complexity owned by planning.)*
6. **Acceptable max upload size?** Drives proxy caps, /work volume sizing, per-job RAM budget. *(Unresolved — needed before sizing.)*
7. **GS sandbox depth:** is stock Docker seccomp enough, or is gVisor/runsc / microVM worth the homelab complexity? *(Unresolved.)*
8. **Active-content stripping default:** always strip JS/OpenAction/embedded files, or opt-in toggle preserving form/attachment fidelity? *(Unresolved.)*
9. **Multi-user model:** if Authelia makes it multi-user, do jobs/outputs need per-user ACLs beyond per-job temp dirs, or is single-tenant assumed? *(Unresolved.)*
10. **Unattended base-image rebuild** (Renovate/Watchtower + CI) in scope, given the GS CVE cadence? *(Unresolved.)*
11. **DnD library trajectory:** ship on classic @dnd-kit/core 6.3.1 (18 months stale) and plan migration to Pragmatic Drag and Drop, or wait for @dnd-kit/react 1.0? *(Second pass: use classic dnd-kit now, Pragmatic DnD as documented fallback, avoid @dnd-kit/react 0.5.0 in prod. Migration timing open.)*
12. **Client-side pdf-lib export-in-a-worker** robust/fast enough for large merges, or always route byte assembly to the pikepdf backend? *(Unresolved — affects whether client export needs a progress UI.)*
13. **Empirical benchmarks needed (not yet measured):** OCR throughput (pages/min, pypdfium2 vs GS rasterizer) on target homelab CPU; ocrmypdf memory/CPU under concurrent --jobs; L1 ImageBitmap cap + overscan for 500+ page docs on low-RAM clients; pypdf AES-256 decryption robustness vs pikepdf on malformed files.
14. **GS version/preset verification on the pinned build:** exact /default distiller values and ColorConversionStrategy default (RGB vs sRGB for screen/ebook) on the specific GS 10.x in trixie; confirm trixie GS compression presets match bookworm's.
15. **Do we actually shell out to qpdf and poppler-utils CLIs** (vs only pikepdf bindings + pdf.js)? Determines whether those apt packages are needed. *(Unresolved.)*
16. **pdf.js v6 enableHWA** behavior when passed to getDocument (removed from viewer layer) — quick spike to confirm GPU canvas still toggles in the direct render() path. *(Unresolved.)*
17. **pdf.js editor-annotation / form-fill save fidelity** across Acrobat/poppler for the pinned version — round-trip test before relying on client blobs. *(Unresolved.)*

---

## 8. What the Second Pass Changed

Material corrections/additions relative to session 1 (PDFsmith), so planning knows what moved:

- **No locked engine renders new text** — a gap session 1 missed entirely. Watermark/Bates/page-numbers/typed-Fill&Sign/add-text-box were re-grounded onto a *separate* text engine (reportlab/pdfcpu) and lowered SHOULD-tier feasibility 4->3; image stamps moved to ship first (no extra engine).
- **Re-grounded off-list "primary" engines:** session 1 named img2pdf and pdfcpu as primary for image->PDF/watermark/Bates; those are not locked. Image->PDF re-grounded on Ghostscript with img2pdf as add-on.
- **pdf.js capability corrections:** modern pdf.js *does* serialize editor annotations (freetext/highlight/ink/stamp/signature) and form values into saved bytes (session 1 said it didn't reliably). XFA is render-only/experimental and deprecated in PDF 2.0 (session 1 said "never had/dropped XFA exec"). pdf.js is **ESM-only since v4**.
- **pdf-lib setRotation is ABSOLUTE** and ignores existing /Rotate — session 1 had it backwards ("additive, accumulates"). Correct fix: getRotation().angle + delta.
- **ocrmypdf v17 dependency model corrected:** Ghostscript is **optional** now (pypdfium2 rasterizer + veraPDF PDF/A); only Tesseract is unconditionally required; **fpdf2** is a new required dep replacing the legacy hOCR renderer. Keep GS anyway for pdf-forge's own compression/PDF-A. --output-type auto silently falls back to plain PDF without GS *or* veraPDF.
- **pypdf encryption upgraded:** session 1 called it "light/pure-python"; it is now a genuine AES-256 (V5/R6) fallback. pikepdf still preferred for decryption/repair.
- **Ghostscript CVE picture massively expanded:** session 1 stopped at CVE-2023-28879. Added the 2024-2025 lineage including actively-exploited CVE-2024-29510 (SAFER bypass) and overlong-UTF-8 ../ traversal — reframing container isolation as the real defense.
- **Two Starlette multipart DoS CVEs added** (CVE-2024-47874, CVE-2025-54121) hitting the upload path directly -> pin starlette>=0.47.2. **pdf.js RCE named:** CVE-2024-4367, fires even without enableScripting -> pin >=4.2.67.
- **GS preset corrections:** /screen gray=Subsample, /ebook gray=Average (session 1 had Average/Bicubic); ColorConversionStrategy flagged as version-dependent (RGB in 9.54, sRGB in 10.x) rather than flat "sRGB."
- **Packaging:** base codename corrected bookworm->**trixie** (Debian 13); confirmed FastAPI 0.138.0 app.frontend() is real (handles asset-404/navigation-fallback correctly vs hand-rolled catch-alls); confirmed pikepdf wheel matrix (Py 3.10-3.14, manylinux2014+musllinux, PyPy dropped after 9.8.1).
- **UX/DnD:** classic @dnd-kit/core flagged 18 months stale; Pragmatic Drag and Drop elevated to documented fallback; @dnd-kit/react 0.5.0 explicitly warned off for prod. OffscreenCanvas promoted from "enhancement" to default raster path. FastAPI gained native SSE (v0.135.0). React 19 useOptimistic/useTransition confirmed.
- **Browser ceiling refined:** from the historical ~512 MB pdf.js XHR figure to the harder single-ArrayBuffer ~2 GB (Chrome 0x7fe00000); 150 MB / 300-500 MB thresholds unchanged. FastAPI UploadFile SpooledTemporaryFile ~1 MB spool-to-disk behavior pinned.
