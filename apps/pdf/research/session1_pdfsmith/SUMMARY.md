# PDFsmith — Definitive Planning Brief (Synthesis)

_Single source of truth for the planning session. Distilled from six research tracks: engine-capabilities, feature-landscape, client-vs-server-split, security-homelab, ux-patterns, packaging._

## 1. Framing

PDFsmith is a privacy-first, self-hosted Acrobat alternative shipped as a **single Docker container** for a homelab, LAN-only behind a reverse proxy. It is a **Python + FastAPI** backend that also serves a built **Vite + React** SPA from the same container. The architecture is **hybrid**: fast page-level operations (reorder, rotate, delete, preview, multi-select organize) run **client-side** in the browser for instant, zero-upload UX; heavy jobs (OCR, compression, linearization, encryption, repair, PDF/A) **POST to the backend** and run through native engines. The product positioning is "Acrobat page-level plumbing, self-hosted and private" — covering ~80% of real Acrobat usage with best-in-class open-source engines (pikepdf/qpdf, pypdf, Ghostscript, ocrmypdf/Tesseract, poppler), while being honest about what fixed-layout PDF and OSS cannot do well (reflow editing, semantic Office export, AATL-trusted signatures).

**Canonical-artifact rule (resolves the client/server tension across tracks):** the browser is for _interactive staging and preview only_. Every persisted output is committed server-side through a **pikepdf normalization + linearization pass** — the browser re-save is never treated as canonical.

---

## 2. Agreed Feature Set

### MUST (v1)

| Feature | Engine / lib | Client or Server | Rationale |
|---|---|---|---|
| Render / preview / thumbnails | pdf.js | Client | Renderer only; instant, no upload. |
| Reorder / rotate / delete pages | in-memory page model (pdf.js preview) then pikepdf commit | Client stage / Server commit | Instant UX; canonical bytes written server-side. |
| Merge / split | pdf-lib (client small docs) / pikepdf (commit) | Client stage / Server commit | copyPages in browser; pikepdf finalizes. |
| Compress (lossy) | Ghostscript pdfwrite /ebook default | Server | Only responsible engine; CPU/RAM heavy. |
| OCR + searchable PDF | ocrmypdf (Tesseract) --skip-text | Server | Best-in-class OSS; multi-minute jobs. |
| Encrypt / decrypt (AES-256) | pikepdf Encryption(aes=True, R=6) | Server | Real crypto; pdf-lib cannot. |
| Permissions flags | pikepdf Permissions | Server | Advisory; set alongside encryption. |
| Linearize (web-optimize) | pikepdf save(linearize=True) | Server | qpdf-grade output. |
| Sanitize / strip metadata+XMP+JS+attachments | pikepdf/qpdf | Server | On-brand privacy win; pre-sanitize step anyway. |
| Image to PDF (lossless) | img2pdf | Server | No re-encode; underrated win. |
| PDF to image | poppler (pdftocairo/pdftoppm) | Server | Reliable raster export. |
| Watermark / stamp / Bates numbering | pypdf overlay | Server | AcroForm-free overlay; committed server-side. |
| AcroForm fill + flatten (static) | pypdf (fill) / pikepdf (commit) | Server | Programmatic fill pdf.js lacks. |
| Repair | pikepdf then qpdf --qdf then gs re-distill | Server | Tiered recovery. |
| Redaction (destructive) | poppler render + ocrmypdf --force-ocr rasterize + scrub | Server | True redaction only; never overlay box. |

### SHOULD (fast-follow)

| Feature | Engine / lib | Client or Server | Rationale |
|---|---|---|---|
| Fill & Sign (image/typed overlay, non-crypto) | pypdf overlay | Server commit | What 90% of users mean by "sign." |
| Office to PDF | LibreOffice headless | Server | High-quality direction; serialize + isolated profile. |
| PDF/A output + veraPDF validation | ocrmypdf/gs + veraPDF | Server | Validate before claiming conformance. |
| Compression quality tiers (screen/ebook/printer/prepress) | Ghostscript | Server | Size-vs-quality preview; keep smaller of in/out. |
| Marquee / power multi-select organize | in-memory model + dnd-kit | Client | Finder/Explorer parity. |
| Undo/redo over page model | Immer patch log | Client | Instant; never snapshots bytes. |

### LATER

| Feature | Engine / lib | Client or Server | Rationale |
|---|---|---|---|
| Cryptographic signing (PAdES) | pyHanko (off-list) | Server | Homelab cert never AATL-trusted; communicate caveat. |
| PDF to Office (Word/Excel) | LibreOffice headless | Server | "Experimental"; poor table/layout quality. |
| PDF compare | pixel-diff + pdftotext diff | Client/Server | Not semantic Acrobat Compare. |
| True text-level redaction | mutool/MuPDF (off-list, AGPL) | Server | Cleaner than rasterize; needs license review. |
| qpdf-wasm / tesseract.js offline PWA | wasm | Client | Only if offline-no-backend is a requirement. |
| Service-worker / IndexedDB session persistence | browser | Client | Survive reload of organize session. |

**Out of scope (no/weak OSS):** reflowable text editing (offer add-text-box/whiteout), full accessibility auto-tagging (offer veraPDF _checking_ only), XFA dynamic forms & form JavaScript (static AcroForm only), certificate/public-key encryption.

---

## 3. Definitive Client/Server Split

| Feature | Runs | Engine / lib | Why |
|---|---|---|---|
| Render, preview, thumbnails | **Client** | pdf.js | Renderer/extractor; instant, private, no upload. |
| Reorder / rotate / delete / organize | **Client stage then Server commit** | in-memory PageRef model; pikepdf for bytes | Instant optimistic edits; canonical artifact server-side (/Rotate baked in). |
| Merge / split | **Client stage (<150 MB) then Server commit** | pdf-lib copyPages; pikepdf normalize | Browser does it free; pikepdf finalizes/linearizes. |
| AcroForm fill (simple) | **Client preview / Server commit** | pdf-lib preview; pypdf authoritative fill | pdf.js has no programmatic fill API. |
| Compress | **Server** | Ghostscript pdfwrite | CPU/RAM heavy; no browser equivalent. |
| OCR | **Server** | ocrmypdf + Tesseract | Multi-minute; async job. |
| Encrypt / decrypt / permissions | **Server** | pikepdf Encryption/Permissions | Real AES-256; pdf-lib cannot decrypt. |
| Linearize | **Server** | pikepdf save(linearize=True) | qpdf-grade. |
| Sanitize / strip active content | **Server** | pikepdf/qpdf | Also the mandatory pre-sanitize gate. |
| Image-to-PDF / PDF-to-image | **Server** | img2pdf / poppler | Native tooling. |
| Watermark / Bates / stamp | **Server** | pypdf | Overlay committed server-side. |
| Repair | **Server** | pikepdf then qpdf then gs | Tolerant native recovery. |
| Redaction | **Server** | poppler/ocrmypdf rasterize + scrub | Destructive only. |
| PDF/A + validation | **Server** | ocrmypdf/gs + veraPDF | Needs gs+veraPDF present. |
| Office-to-PDF / PDF-to-Office | **Server** | LibreOffice headless | Serialized, isolated profile. |

**Hard rules:**
- Client write library is **pdf-lib**, not pdf.js (pdf.js cannot serialize a modified body).
- Encrypted inputs are **always** decrypted server-side with pikepdf first (pdf-lib ignoreEncryption:true yields garbage).
- Reconcile client edits by **sending edited bytes** (stateless, single source of truth), then a pikepdf normalization pass.
- Browser/server size line: **~150 MB** (configurable) for client ops; hard server-only cutoff **~300-500 MB**.

---

## 4. Engine Ownership

| Operation | Owner tool |
|---|---|
| Encrypt/decrypt, permissions, linearize, merge/split, lossless structural compress, metadata, image extract | **pikepdf (qpdf)** |
| Repair (primary to fallback) | pikepdf then qpdf --qdf then Ghostscript re-distill |
| Lossy compression / downsampling | **Ghostscript** pdfwrite (screen/ebook/printer/prepress, default ebook, -dSAFER) |
| OCR, searchable PDF, PDF/A | **ocrmypdf** (Tesseract) — --skip-text default, --optimize 1 --rotate-pages --deskew |
| AcroForm fill/flatten, watermark/stamp/Bates, quick text extract | **pypdf 6.x** (not PyPDF2) |
| Render, rasterize, PDF-to-image | **poppler** (pdftocairo/pdftoppm) / pdf.js (browser) |
| In-browser write (reorder/rotate/merge/split/fill) | **pdf-lib** |
| PDF/A conformance check | **veraPDF** |
| Monochrome scan compression | **jbig2enc** (must be compiled; not in apt) |

**Permissions are advisory, not security** — for confidentiality use AES-256 (R6) with a user password. Redaction must be **rasterization**, never an overlay box.

---

## 5. Security & Ops Non-Negotiables

- **Container sandbox is the primary control** (treat -dSAFER as already broken): non-root (UID 10001) + cap_drop ALL + no-new-privileges + read-only rootfs + tmpfs/named-volume writes only + **no network egress for the worker**. Neutralizes the Ghostscript SAFER-bypass CVE lineage.
- **Three-stage upload validation, never trust client:** extension allow-list then magic bytes (python-magic, first 2 KB, application/pdf) then structural open with pikepdf/qpdf (reject if it will not open). Ignore client Content-Type/filename.
- **Two-layer size cap:** reverse-proxy body cap **and** app-level streaming byte-counter aborting with 413 (FastAPI UploadFile has no size limit; SpooledTemporaryFile fills disk).
- **Bound every subprocess:** wall-clock timeout via start_new_session=True + os.killpg on the whole process group (timeout= kills only the direct child, not gs/tesseract grandchildren); setrlimit (AS/CPU/FSIZE) paired with container memory limits; ocrmypdf --jobs 1; OMP_THREAD_LIMIT=1.
- **Global worker pool of 1-2** with a bounded queue returning **429**; --memory/--cpus as OOM backstop. CPU-bound jobs must not run in the FastAPI event loop.
- **Async job pattern (202 + poll)** for OCR/compress/linearize so proxy read timeouts and buffering stop mattering. If sync: raise proxy_read_timeout to worst-case, set proxy body cap to app cap, disable request buffering.
- **Temp-file hygiene:** server-generated names (uuid4().hex + .pdf), one temp dir per job on a size-bounded /work volume, cleaned via finally / FastAPI BackgroundTask, plus an hourly TTL janitor for orphans from OOM-kills.
- **Pre-sanitize before gs/tesseract see the doc:** pikepdf normalize+linearize, strip /JavaScript /OpenAction /Launch and embedded files.
- **Disable PDF JS in the browser:** pdf.js isEvalSupported:false, enableScripting:false + strict CSP.
- **Auth at the reverse proxy, not the app:** Authelia forward-auth (SSO+2FA) or Basic-auth-over-TLS stopgap; publish only the proxy, bind PDFsmith to an internal Docker network. LAN is not a security boundary.
- Keep all native engines pinned and patched via regular image rebuilds.

---

## 6. Packaging Snapshot

- **Base:** Debian slim (Debian over Alpine **and** distroless) — pikepdf needs glibc manylinux wheels; ocrmypdf shells out to many binaries. Three-stage build: node:22-slim (Vite frontend) then python:3.13-slim-bookworm (venv from lockfile, pip/uv) then python:3.13-slim-bookworm runtime copying only dist/ + venv.
- **Runtime apt set** (--no-install-recommends, then clean the apt lists cache): ghostscript tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu qpdf poppler-utils unpaper pngquant fonts-noto-core. Add language packs only as exposed; CJK adds fonts-noto-cjk.
- **No apt for pikepdf/pypdf** (wheels bundle libqpdf; pypdf pure Python). Install apt qpdf only if calling the CLI.
- **jbig2enc:** compile from source in a builder stage only if best monochrome compression is required (not in apt).
- **SPA served in-process from FastAPI** (no nginx sidecar): app.frontend('/', directory='static') on FastAPI >=0.138.0, else StaticFiles(html=True) + catch-all with APIs under /api/* (mount real asset dirs first to avoid 200-on-missing-asset).
- **Runtime hardening:** non-root UID 10001, read-only rootfs, writable named volume for /app/jobs with TMPDIR pointed there, tmpfs only for small /tmp. docker-compose: restart unless-stopped, cap_drop ALL, no-new-privileges, pids_limit, deploy.resources.limits ~2 CPU / 2 GB.
- **Healthcheck:** Python urllib one-liner hitting /api/health (slim has no curl) — interval 30s, timeout 5s, retries 3, start-period 20s.
- **Expected image size:** **~600 MB-1 GB** (floor is Tesseract + Ghostscript + fonts + language packs, not app code).
- **Document:** raise reverse-proxy max body size (nginx client_max_body_size default 1 MB causes 413).

---

## 7. Open Questions for the Planning Session

1. **Max upload / document size & page count** end-to-end? Drives proxy caps, /work sizing, per-job RAM, browser cutoff (~150 MB assumed), OCR RAM (pages x resolution), and UX cache LRU / history depth (500 pages assumed; 2000-page scans change budgeting).
2. **Container resource budget** (CPU/memory) for the target homelab host, and the resulting **job concurrency cap** (1-2 workers assumed)?
3. **Sync vs async (202 + poll) as default UX** for OCR/compress — async is operationally robust but needs a progress-polling/SSE frontend. Acceptable?
4. **Compress targets** — concrete size/latency goals to confirm /ebook default vs. exposing custom per-image -dColorImageResolution?
5. **Default OCR languages** shipped vs. optionally installable? Each tesseract-ocr-XXX pack adds image size + per-page time; CJK adds fonts-noto-cjk.
6. **jbig2enc from-source build** — worth the complexity for best monochrome compression, or is gs/pikepdf sufficient?
7. **PDF/A a real product requirement?** Determines whether veraPDF + Ghostscript must be guaranteed in the image.
8. **Digital signatures (pyHanko/PAdES) on the roadmap at all**, given homelab certs are never AATL-trusted — or is image-based Fill & Sign sufficient?
9. **PDF to Office export** — real demand, or omit entirely rather than ship a weak LibreOffice "beta" that hurts reputation?
10. **Add mutool/MuPDF (off-list, AGPL)** for true text-level redaction + faster rendering? Needs licensing review for a distributed image.
11. **Licensing/redistribution review** for bundled extras (Ghostscript AGPL, veraPDF, LibreOffice) in a distributed self-hosted image.
12. **Active-content stripping default** — always-on strip of JS/OpenAction/embedded files vs. opt-in toggle preserving attachment/form fidelity?
13. **Multi-user (Authelia) vs single-tenant** — do jobs/outputs need per-user access control beyond per-job temp dirs?
14. **Stronger kernel isolation** (gVisor/runsc or microVM) for the Ghostscript path vs. stock Docker seccomp — worth the homelab complexity?
15. **Annotation persistence contract** — must annotations authored in PDFsmith render identically in Acrobat? Decides backend re-write effort (pypdf/pikepdf) vs. relying on pdf.js output.
16. **Final byte assembly location** — server-side pikepdf (recommended canonical) vs. client-side pdf-lib worker (offline) vs. both by size? Affects whether cross-doc merge uploads all source bytes.
17. **Rotation preview fidelity** — CSS-transform quick-rotate until export vs. true rendered-rotation previews (changes the bitmap cache key)?
18. **Offline-PWA mode (no backend reachable)** a real requirement? If yes, prototype qpdf-wasm + tesseract.js.
19. **Session persistence** (service worker / IndexedDB) so an organize session + thumbnails survive reload — or intentionally ephemeral?
20. **Collaborative/multi-user editing later?** If yes, move the undo model toward OT/CRDT-friendly commands now (reopens SSE-vs-WebSocket).
21. **Large client-side merges over threshold** — silently offload to backend, or explicitly ask the user before any upload (privacy expectation)?
22. **FastAPI app.frontend() (0.138.0) dependency** acceptable, or pin to portable StaticFiles + catch-all?
23. **Which reverse proxy** (nginx / Traefik / Caddy) is standard, so body-size and buffering guidance can be made specific?
24. **Jobs scratch area** — disk-backed named volume (survives restart, large files) vs. tmpfs (RAM, ephemeral, counts against memory limit)?
