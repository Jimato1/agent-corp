# pdf-forge — Master Build Plan (v1)

> **Status:** authoritative build sequence for the v1 **MUST** feature set.
> Sits on top of, and never re-decides, the three companion docs — read them first:
> - [`docs/DECISIONS.md`](./docs/DECISIONS.md) — LOCKED cross-cutting calls D1–D8 + open-question resolutions OQ#1–OQ#17.
> - [`docs/API.md`](./docs/API.md) — the HTTP contract: 19 endpoints, job lifecycle, error envelope, per-op options.
> - [`docs/STRUCTURE.md`](./docs/STRUCTURE.md) — repo layout, backend/frontend folder map, the 4-stage Dockerfile, compose hardening, env knobs.
> - [`research/SUMMARY.md`](./research/SUMMARY.md) — §2 MUST set, §3 client/server split, §4 engine map, §5 security non-negotiables, §6 packaging.
>
> This document does **not** restate those — it references them by section/decision id and
> orders the work. Where this plan deviates from the suggested arc in the task brief, the
> deviation is justified inline.

---

## 1. Architecture overview

pdf-forge is a **single hardened Docker container** in a homelab, LAN-only behind a reverse
proxy, no telemetry, no cloud round-trips. One FastAPI process both **serves the built
Vite/React SPA** and **runs the server PDF engines**. See `docs/DECISIONS.md` D4/D6 and
`docs/STRUCTURE.md` §3–§4 for the locked packaging detail; the model is summarized here only
to anchor the milestones.

### 1.1 Hybrid client/server model (D7, SUMMARY §3)
- **Client (zero upload):** render/preview/thumbnails (pdf.js), and page-model edits —
  reorder / rotate / delete / small merge / split (pdf-lib) — for files **< 150 MB**
  (`VITE_CLIENT_SERVER_THRESHOLD_MB`). pdf-lib `save()` runs in a Web Worker (OQ#12).
- **Server (bounded async jobs):** every heavy op (compress, OCR, encrypt/decrypt,
  permissions, rasterize, image→PDF, extract-text, sanitize, linearize, repair) plus
  large/encrypted merge/split, and the canonical **finalize** write path.
- **Reconciliation = Option A (D7):** the client uploads **edited bytes**, not an op
  manifest. Encrypted inputs are always **decrypted server-side with pikepdf first** before
  any pdf-lib/server op.
- **Size gates (D7/OQ#6):** browser path `< 150 MB`; `150–300 MB` routes page ops to the
  pikepdf backend; `> ~300–500 MB` server-only/streamed; hard upload cap
  `PDFFORGE_MAX_UPLOAD_MB=200` → `413`.

### 1.2 Single-container serve model (D4/D6)
FastAPI ≥ 0.138.0 `app.frontend("/", directory="static", fallback="index.html")`; **all
`/api/*` routes registered first**; `/api/health` reserved; no nginx sidecar. Built SPA is an
image-only artifact at `/app/static` (`COPY --from=frontend …/dist`). See `docs/STRUCTURE.md`
§0/§3.

### 1.3 Job / queue model (D1/D3, API §2/§4)
Heavy ops are **async**: `POST /api/jobs/{op}` → **202 + `Location`**, client **polls**
`GET /api/jobs/{id}` (no SSE in v1), then `GET /api/jobs/{id}/result`. CPU work runs in an
in-process **ProcessPoolExecutor of 1–2 workers** behind a **bounded queue**; over-capacity is
rejected at submit with **429 + Retry-After** (never enters `queued`). Lifecycle:
`queued → running → succeeded | failed | expired`, plus `canceled`. Each subprocess is bounded
(wall-clock timeout + `os.killpg`, `setrlimit`, engine knobs, container memory/cpu/pids
backstop).

### 1.4 Canonical-artifact rule (D7, OQ#8, API §6)
**Every durable artifact exits through the pikepdf normalize + linearize pass**
(`services/finalize.py`): `save(linearize=True)`, **always strips active content**
(`/JavaScript /JS /OpenAction /AA /Launch`), preserves embedded files except on `sanitize`/
redaction. For `encrypt`/`permissions` the encryption is applied **in the same save**. The
backend is the single source of truth; client editor blobs are view-scoped convenience only
(OQ#17).

### 1.5 Component diagram

```
                          LAN clients (browser)
                                   │ HTTPS
                          ┌────────▼─────────┐
                          │  Reverse proxy   │  TLS + auth (Authelia fwd-auth / Basic)
                          │ (Authelia/Caddy/ │  body cap ≥ 200 MB  (D5, OQ#6)
                          │  nginx/Traefik)  │
                          └────────┬─────────┘
                  internal Docker net (no published host port — D5)
                          ┌────────▼───────────────────────────────────┐
                          │      pdf-forge container (UID 10001,        │
                          │   read-only rootfs, cap_drop ALL, 2C/2G)    │
                          │                                             │
                          │   FastAPI (app.main:app)                    │
                          │   ├── app.frontend("/")  → /app/static SPA  │
                          │   └── /api/* routers (registered first)     │
                          │         ├── api/health.py   GET /api/health │
                          │         └── api/jobs.py     POST/GET/DELETE  │
                          │                  │ enqueue (202)            │
                          │            ┌─────▼──────┐  bounded queue     │
                          │            │ jobs/      │  full → 429        │
                          │            │ manager+   │                    │
                          │            │ pool (1–2) │                    │
                          │            └─────┬──────┘                    │
                          │     ProcessPool worker (off event loop, D3)  │
                          │            │ services/{op}.py                │
                          │   ┌────────▼────────────────────────────┐   │
                          │   │ engines/ (D8):                       │   │
                          │   │  pikepdf(libqpdf) · gs · ocrmypdf/   │   │
                          │   │  tesseract · poppler-utils · pypdf   │   │
                          │   └────────┬────────────────────────────┘   │
                          │            │ ★ services/finalize.py          │
                          │            │   pikepdf normalize+linearize   │
                          │   per-job dir /app/jobs/<uuid> (0700)        │
                          └──────────────┬──────────────────────────────┘
                                         │
                       jobs:  disk-backed named volume (NOT tmpfs)
                       /tmp:  small tmpfs 64m     TTL janitor sweeps 1h orphans
```

---

## 2. V1 feature set

### 2.1 MUST — built in v1 (SUMMARY §2, API §5.1)

| # | Feature | Location | Engine (D8) | Endpoint / path |
|---|---|---|---|---|
| 1 | Reorder / rotate / delete pages | Client → server finalize | pdf-lib (write), pdf.js (preview) | client; `POST /api/jobs/finalize` |
| 2 | Merge (small) / split (small) | Client → server finalize | pdf-lib `copyPages` | client; `POST /api/jobs/finalize` |
| 3 | Merge / split (large or encrypted) | Server | pikepdf | `POST /api/jobs/merge`, `…/split` |
| 4 | Compress (lossy, `/ebook` 150 dpi) | Server | Ghostscript | `POST /api/jobs/compress` |
| 5 | OCR (searchable PDF) | Server | ocrmypdf (Tesseract) | `POST /api/jobs/ocr` |
| 6 | Encrypt / decrypt (AES-256 R6) | Server | pikepdf (pypdf fallback) | `POST /api/jobs/encrypt`, `…/decrypt` |
| 7 | Set / clear permissions (advisory) | Server | pikepdf.Permissions | `POST /api/jobs/permissions` |
| 8 | Rasterize pages (→ image / image-only PDF) | Server | poppler `pdftocairo`/`pdftoppm` | `POST /api/jobs/rasterize` |
| 9 | Image → PDF | Server | Ghostscript (img2pdf lossless add-on) | `POST /api/jobs/image-to-pdf` |
| 10 | Extract text (batch) | Both | poppler `pdftotext` (client pdf.js) | `POST /api/jobs/extract-text` |
| 11 | Sanitize / strip metadata + XMP + attachments | Server | pikepdf | `POST /api/jobs/sanitize` |
| 12 | Linearize (web optimize) | Server | pikepdf | `POST /api/jobs/linearize` |
| 13 | Repair / recover | Server | pikepdf (qpdf) | `POST /api/jobs/repair` |
| 14 | Preview / thumbnails | Client | pdf.js (poppler server fallback, internal) | client; no public endpoint |
| — | **Finalize (canonical write path)** | Server | pikepdf | `POST /api/jobs/finalize` |

19 endpoints total (API §10): 5 lifecycle/health + 14 `POST /api/jobs/{op}`.

### 2.2 DEFERRED — named, **not built in v1**

- **SHOULD (post-v1, directional only):** image stamps/signatures (ship-first of SHOULD, pure
  overlay), watermark / Bates / page numbers / typed Fill&Sign / add-text-box (→ **reportlab**
  overlay, OQ#1), static AcroForm fill + durable flatten (Ghostscript primary / pdfcpu
  fallback, behind a spike, OQ#3), PDF/A-2b as a user feature + veraPDF validation (OQ#4),
  destructive redaction (poppler raster + pikepdf scrub, OQ#2), SSE/WebSocket job progress (D1).
- **LATER / OUT (SUMMARY §2):** PKI/PAdES signing (pyHanko), PDF→Office (LibreOffice headless),
  PDF compare, reflowable text editing (OUT), full PDF/UA auto-tagging (OUT), JS forms/XFA
  (OUT), certificate/public-key encryption (OUT), true text-level redaction / MuPDF (OUT v1).
- **Opt-in hardening for later:** multi-user ACLs (OQ#9), gVisor/runsc worker (OQ#7), Renovate
  auto-rebuild (OQ#10 — ops guidance only).

v1 builds **only** the §2.1 table. The `services/`, `engines/`, and `schemas/` folders carry
no SHOULD/LATER modules; veraPDF stays an off-by-default optional Docker stage (`docker/verapdf/`,
STRUCTURE §3.5).

---

## 3. Milestone-by-milestone build order

Each milestone is **independently runnable and testable** and leaves the app in a working
state. The arc follows the brief, with two deliberate adjustments (justified at M2/M6).

> Test conventions below: `curl` runs against the container on the internal net (or a temporary
> published `8000` in dev only); the SPA is exercised in a browser. Each milestone adds pytest
> coverage (≥1 happy + 1 failure path per new endpoint, STRUCTURE §0).

---

### M0 — Scaffold, CI, Docker boot
**Goal:** the empty container builds, boots, serves a placeholder SPA, answers `/api/health`.
Nothing PDF yet — prove the single-container serve model and the build pipeline.

- **Backend:** repo skeleton per STRUCTURE §0–§1; `app/main.py` app-factory that registers an
  `/api` router **first** then `app.frontend("/", directory="static", fallback="index.html")`;
  `app/config.py` `Settings` (pydantic-settings, prefix `PDFFORGE_`) with the env knobs from
  STRUCTURE §6; `api/health.py` → trivial `GET /api/health` (API §7 shape, no disk/CPU work
  yet); `core/errors.py` exception handlers → `ErrorResponse` envelope (API §1.5);
  `core/security.py` security headers + CSP (no `unsafe-eval`, `worker-src 'self'`).
- **Frontend:** Vite + React 19 skeleton, `App.tsx` shell, a placeholder page; `lib/api.ts`
  stub that calls `/api/health`. `npm ci` from a committed `package-lock.json`.
- **Packaging:** the 4-stage `Dockerfile` (STRUCTURE §3) and hardened `docker-compose.yml`
  (§4); `.dockerignore` (§5); `.env.example` (§6). Pin base images by digest. CI: build image,
  run pytest, `npm run build`, lint; document monthly rebuild (OQ#10).
- **Engines:** none.
- **Definition of Done / test:**
  - `docker compose build` succeeds; `docker compose up` reaches **healthy** (HEALTHCHECK
    green).
  - `curl -s http://127.0.0.1:8000/api/health` → `200` with `{"status":"ok",...}` and header
    `X-API-Version: 1`.
  - Browser at `/` loads the SPA shell; a deep link (e.g. `/organize`) falls back to
    `index.html` (200), while `/api/health` still returns JSON and a bogus `/assets/x.js`
    404s (proves `app.frontend()` mount order, D4).
  - Container runs as UID 10001, read-only rootfs, only `/app/jobs` + `/tmp` writable.

---

### M1 — Upload + validate + async job harness (no real ops)
**Goal:** the full job lifecycle works end-to-end with a **no-op/echo** operation, so the
queue, polling, temp dirs, limits, and error envelope are all exercised before any engine.

- **Backend:** `core/upload.py` (streaming byte-counter → `413`, server-generated names, disk
  precheck → `507`); `core/validation.py` (3-stage: ext allow-list → magic bytes →
  **structural pikepdf open** = authority, API §3.2); `core/tempdir.py` (per-job
  `mkdtemp(dir=/app/jobs, 0700)`); `jobs/models.py` (Job + `JobState` enum), `jobs/manager.py`
  (registry, bounded queue, **429 + Retry-After**), `jobs/pool.py` (`ProcessPoolExecutor`),
  `jobs/runner.py` (worker entry, `setrlimit` + wall-clock + `killpg`), `jobs/janitor.py`
  (hourly TTL sweep). `api/jobs.py` implements **all 5 lifecycle endpoints** (API §4) plus a
  single internal **`echo`/`noop`** op that just runs the finalize-less passthrough (validate →
  copy input to output) so the harness is testable. `schemas/jobs.py`, `schemas/errors.py`.
  pikepdf added to the runtime venv (needed by the validation authority).
- **Frontend:** `components/Dropzone` (enforces the 150 MB client/server gate via
  `lib/thresholds.ts`), `state/jobsStore.ts` polling state machine, `components/JobProgress`
  (poll-driven spinner, no progress bar — OQ#12), and the real `lib/api.ts` (submit, poll
  `GET /api/jobs/{id}`, download `…/result`, `DELETE` cancel).
- **Engines:** pikepdf (structural-open validation only).
- **Definition of Done / test:**
  - Submit the no-op: `curl -F file=@sample.pdf -F options={} http://…/api/jobs/noop` →
    **202** with `Location` and `state:"queued"`.
  - Poll `GET /api/jobs/{id}` → observe `queued → running → succeeded`; `…/result` streams the
    bytes back with a sanitized `Content-Disposition`.
  - Failure paths: oversized upload → **413** `file_too_large`; a `.txt` renamed `.pdf` → **415**
    `not_a_pdf`; a truncated/garbage PDF → **400** `bad_pdf_structure`; saturate the pool +
    queue → **429** `queue_full` with `Retry-After`; `DELETE` a running job → `canceled` and the
    job dir is `rmtree`d; let TTL elapse → `…/result` returns **404** `result_gone`.
  - Browser: drag a file in, watch the spinner poll to completion, download the result.

---

### M2 — Client page-ops + pikepdf finalize (first durable write)
**Goal:** the headline zero-upload UX — reorder/rotate/delete/small-merge/split in the browser
— made durable through the canonical finalize pass. **No heavy engine still.** This ships
early precisely because it needs no server engine beyond pikepdf finalize.

- **Backend:** `services/finalize.py` (the ★ pass, API §6): pikepdf `save(linearize=True)` +
  **always strip active content** (OQ#8) + decrypt-first; `services/structure.py` for
  server-side merge/split of large/encrypted inputs (pikepdf). Wire `POST /api/jobs/finalize`,
  `POST /api/jobs/merge`, `POST /api/jobs/split` (API §5.2). `engines/pikepdf_engine.py`
  (bindings only, no qpdf CLI — D8).
- **Frontend:** `components/PageGrid` with `@dnd-kit/core` 6.3.1 (OQ#11) for drag-reorder;
  rotate (**absolute** `setRotation`, per research) and delete; `components/Viewer` (pdf.js,
  software-canvas baseline, OQ#16; `isEvalSupported:false`, `enableScripting:false`);
  `page-model/` (document/pageModel/undo); `workers/pdfExport.worker.ts` (pdf-lib `save()` in a
  Web Worker `< 150 MB`; above the line route byte assembly to `…/merge`/`…/split` — OQ#12);
  `lib/pdfjs.ts`, `lib/pdflib.ts`. The "organize" flow under `flows/`.
- **Engines:** pikepdf.
- **Definition of Done / test:**
  - In the browser: reorder, rotate one page 90°, delete a page → **Export** → the worker
    produces edited bytes, which POST to `…/finalize` → download a **linearized** PDF whose page
    order/rotation matches.
  - `curl` a PDF carrying `/OpenAction`+`/JavaScript` through `…/finalize` → output has active
    content **stripped** (verify with `pikepdf`/`qpdf --json`), embedded files **preserved**.
  - `…/merge` two PDFs and `…/split` by ranges (API §8.6) via curl → correct page counts; an
    encrypted input is decrypted server-side first (D7).
  - Large-file gate: a `> 150 MB` "merge" in the UI routes to `…/merge` (server) instead of the
    worker.

---

### M3 — First heavy op: compress (Ghostscript)
**Goal:** prove the **subprocess engine path** end-to-end — argv-only shell-out, bounded
runner, killpg, then finalize — using the highest-value, lowest-risk heavy op.

- **Backend:** `engines/subprocess_run.py` (shared bounded runner: `shell=False` argv lists,
  `TMPDIR=/app/jobs/tmp`, wall-clock timeout, `os.killpg(getpgid, SIGKILL)` for gs
  grandchildren — D3); `engines/ghostscript.py`; `services/compress.py` with **explicit GS
  flags as constants** (`-dPDFSETTINGS=/ebook -dColorImageResolution=150
  -dDownsampleColorImages=true` + explicit `-dColorConversionStrategy` — OQ#14/STRUCTURE §6),
  **keep smaller of input/output** (`meta.kept`), then pikepdf finalize. Wire
  `POST /api/jobs/compress` + `schemas/ops.py:CompressParams`.
- **Frontend:** the "compress" flow + Toolbar entry; reuses the M1 job/poll/download plumbing.
- **Engines:** Ghostscript → pikepdf finalize.
- **Definition of Done / test:**
  - `curl -F file=@scan.pdf -F options='{"preset":"ebook","color_dpi":150}' …/api/jobs/compress`
    → 202 → poll to `succeeded` → result is smaller (or `meta.kept:"input"` when GS would grow
    it) and **linearized**.
  - Run the **one-time GS preset verification spike** on the pinned trixie GS (OQ#14): confirm
    the explicit flags produce reproducible 150-dpi downsampling and the chosen
    ColorConversionStrategy.
  - A deliberately huge/pathological input trips the wall-clock timeout → job `failed` with
    sanitized `error.code:"timeout"`; confirm no orphaned `gs` process (killpg works).

---

### M4 — OCR (ocrmypdf / Tesseract)
**Goal:** the most CPU/RAM-heavy op, with its concurrency and timeout knobs, plus the
multi-artifact (zip + sidecar) result path.

- **Backend:** `engines/ocrmypdf_engine.py`; `services/ocr.py` calling
  `ocrmypdf --jobs 1 --tesseract-timeout 120 --skip-big N` (D3) with `OMP_THREAD_LIMIT=1`;
  `OcrParams` (`languages`, `redo_ocr`, `force_ocr`, `deskew`, `rotate_pages`, `sidecar`,
  `output_type:"auto"`). Sidecar `true` → **zip** result (`*-ocr.pdf` + `*.txt`); PDF goes
  through finalize. Implement `GET /api/jobs/{id}/result/{index}` exercise for multi-artifact
  (API §4.5).
- **Frontend:** "OCR" flow with language pick (`eng`,`deu` packs installed) + sidecar toggle;
  zip/download handling for multi-artifact results.
- **Engines:** ocrmypdf (Tesseract) → pikepdf finalize.
- **Definition of Done / test:**
  - `curl …/api/jobs/ocr` on a scanned image-only PDF (API §8.5) → searchable PDF; `pdftotext`
    on the output now yields text. `sidecar:true` → zip with PDF + `.txt`, fetchable at
    `…/result/0` and `…/result/1`.
  - A page exceeding `--tesseract-timeout` is skipped/fails gracefully (not a hung worker);
    `--skip-big` honored on a giant raster page.
  - Confirm `auto` may emit PDF/A but PDF/A is **not** surfaced as a user feature (OQ#4).

---

### M5 — Encrypt / decrypt / permissions (pikepdf crypto)
**Goal:** the confidentiality ops, including the order-sensitive "encryption in the finalize
save" rule and robust server-side decrypt.

- **Backend:** `services/crypto.py` (encrypt: pikepdf `Encryption(R=6, aes=True)`, **pypdf
  AES-256 fallback** via `engines/pypdf_engine.py`; decrypt: **pikepdf only**, never pypdf for
  robustness — D8); `services/permissions.py` (`pikepdf.Permissions`, advisory). Encryption /
  permissions are applied **in the same pikepdf save** as normalize+linearize (API §6 ordering).
  Wire `…/encrypt`, `…/decrypt`, `…/permissions` + `EncryptParams`/`DecryptParams`/
  `PermissionsParams`. Wrong/absent decrypt password → `422 wrong_password` at submit or failed
  job `error.code:"validation"`.
- **Frontend:** encrypt/decrypt/permissions flows. **UI must label permissions as advisory**
  and warn that owner-only (blank user password) PDFs open for anyone (SUMMARY §5).
- **Engines:** pikepdf (pypdf fallback).
- **Definition of Done / test:**
  - Encrypt with a user+owner password (API §8.4) → output requires the password to open
    (verify it fails to open without, opens with). Round-trip: `…/decrypt` with the right
    password recovers a clean, linearized PDF.
  - Wrong decrypt password → `422 wrong_password` (or failed job, sanitized).
  - `…/permissions` clears/sets print/modify/extract flags (verify with `pikepdf`); UI shows the
    advisory disclaimer.

---

### M6 — Remaining ops: rasterize, image→PDF, extract-text, sanitize, linearize, repair
**Goal:** complete the MUST set. **Adjustment vs the brief:** `linearize` and `sanitize` are
trivial re-exposures of the finalize pass (already built in M2), so they land here with
near-zero new code rather than earlier — they're grouped with the rest of the long tail for one
clean "feature-complete" milestone.

- **Backend:**
  - `engines/poppler.py` (`pdftocairo`/`pdftoppm`/`pdftotext`/`pdfimages`).
  - `services/rasterize.py` → `…/rasterize` (single page → `image/png|jpeg`; multi-page → zip;
    `format:"pdf"` → image-only PDF → finalize). Foundation for future redaction (OQ#2).
  - `services/images.py` → `…/image-to-pdf` (Ghostscript; img2pdf lossless add-on for
    non-CMYK/non-alpha) with image extension allow-list; → finalize.
  - `services/text.py` → `…/extract-text` (poppler `pdftotext`; **no finalize**, read-only;
    `text/plain` single doc).
  - `services/sanitize.py` → `…/sanitize` (strip Info + XMP **and** attachments — the only place
    attachments are removed by default, OQ#8); is itself a finalize save.
  - `…/linearize` → exposes `services/finalize.py` directly.
  - `services/repair.py` → `…/repair` (pikepdf tolerant parser; never pypdf) → finalize.
- **Frontend:** remaining flows (rasterize/flatten, image→PDF with multi-image intake,
  extract-text viewer, one-click Sanitize, linearize, repair). Client quick-text via pdf.js for
  preview/search (extract-text "Both", SUMMARY §3).
- **Engines:** poppler, Ghostscript, pikepdf.
- **Definition of Done / test:**
  - `…/rasterize` page 1 at 150 dpi → `image/png`; multi-page → zip; `format:"pdf"` → image-only
    linearized PDF.
  - `…/image-to-pdf` on 3 PNGs → one PDF; `lossless:true` uses img2pdf path.
  - `…/extract-text` → `text/plain` matching the document (no finalize).
  - `…/sanitize` → metadata/XMP **and** attachments gone, active content gone, still opens.
  - `…/linearize` and `…/repair` (on a deliberately broken xref) → valid linearized output.
  - **Feature-complete check:** all 19 endpoints in API §10 respond per contract; pytest has
    ≥1 happy + 1 failure path per endpoint.

---

### M7 — Hardening, packaging polish, pre-GA spikes
**Goal:** turn "all features work" into "safe to run unattended in a homelab."

- **Security/ops:** verify the full container posture (non-root, `cap_drop ALL`,
  `no-new-privileges`, read-only rootfs, no worker egress, `pids_limit`, 2C/2G) — OQ#7;
  confirm proxy body cap ≥ 200 MB documented for nginx/Traefik/Caddy (STRUCTURE §4); structured
  logging carries **no document content** (`core/logging.py`); error messages never leak engine
  stderr/CVE detail (API §1.5). Wire `Remote-User`/`Remote-Email` read for audit only (D5).
- **Resource correctness:** disk precheck `507`, TTL janitor, killpg on cancel/timeout all
  validated under load; `setrlimit` CPU/FSIZE tuned.
- **Generated contracts:** emit `shared/openapi.json`; confirm `shared/operations.json`,
  `error-codes.json`, `job-states.json` match the running app (STRUCTURE §0).
- **Pre-GA measurement spikes (OQ#13/#14/#16):** OCR throughput + concurrency RAM on the target
  CPU → tune `PDFFORGE_WORKER_COUNT` (1 vs 2) and L1 ImageBitmap cap; pdf.js `enableHWA` opportunistic
  spike; pdf.js editor/form round-trip fidelity check (OQ#17) before any client-blob reliance.
- **CI/supply chain:** monthly scheduled rebuild + Renovate PR digest bumps (OQ#10); image-size
  check (~600–700 MB, STRUCTURE §5).
- **Definition of Done / test:** a clean `docker compose up` behind the reverse proxy with auth,
  no published host port, survives a soak (repeated mixed jobs) with no orphaned processes, no
  disk leak (janitor reclaims), and healthy throughout; all error codes reproduce per API §8.

---

## 4. Risks & mitigations

| Risk | Why it bites | Mitigation | De-risked at |
|---|---|---|---|
| **Ghostscript RCE / SAFER bypass** (CVE-2024-29510 actively exploited) | GS is the largest attack surface; input validation is not enough | **Container isolation is the primary defense** (D6/OQ#7): non-root, `cap_drop ALL`, `no-new-privileges`, read-only rootfs, **no worker egress**, argv-only `shell=False`, server-generated filenames (never client paths). Bindings-only qpdf (no qpdf CLI). Monthly rebuilds (OQ#10). | M0 (posture) → M3 (first GS shell-out under the bounded runner) → M7 (soak) |
| **Large-file memory / OOM-kill** | OCR rasters + pdf-lib's ~2–3× working set blow the 2 GB cap | Disk-backed `/app/jobs` volume **not tmpfs** (D2/D6); streaming byte cap `413`; disk precheck `507`; 150 MB client/server line routes big merges server-side (OQ#12); `--skip-big`, `OMP_THREAD_LIMIT=1`, pool=1. | M1 (caps/precheck) → M2 (size gate) → M4 (OCR RAM) → M7 (concurrency spike) |
| **Job timeouts / runaway / hung workers** | gs/tesseract grandchildren survive `subprocess(timeout=)` | Wall-clock timeout + `os.killpg(getpgid, SIGKILL)` in `engines/subprocess_run.py`; `setrlimit` CPU/FSIZE; `--tesseract-timeout 120`; container `pids_limit` backstop; bounded queue → 429. | M1 (harness/killpg) → M3 (GS timeout proof) → M4 (OCR timeouts) |
| **Client/server reconciliation drift** | pdf-lib can't decrypt; manifest replay would diverge from server state | **Option A** — upload edited bytes, no manifest (D7); **always decrypt server-side with pikepdf first**; **every durable artifact through the finalize pass** (single source of truth, OQ#8). Client editor blobs are view-scoped only (OQ#17). | M2 (finalize + Option A) → M5 (decrypt-first) |
| **GS preset drift across versions** | `/default` values + ColorConversionStrategy (RGB vs sRGB) move between GS releases | Pin GS by digest; **explicit flags as constants** (OQ#14), not preset defaults; one-time verification spike. | M3 (spike + explicit flags) |
| **Upload polyglots / traversal** | libmagic passes polyglots; overlong-UTF-8 `../` was a real GS bug | 3-stage validation with **structural pikepdf open as the authority** (API §3.2); filename never a path component (D2). | M1 |
| **Single-container serve fragility** | hand-rolled catch-alls serve HTML+200 for mistyped assets | `app.frontend()` (D4) with API routes registered first; `check_dir=True` fails fast if `dist/` missing. | M0 |

---

## 5. Numbered task list (build session runs top-to-bottom)

> Each task is one sitting. Grouped by milestone. Folder/endpoint refs are from
> `docs/STRUCTURE.md` §1–§2 and `docs/API.md` §4–§5. Do not start a milestone's ops before its
> prerequisite milestone's DoD passes.

### M0 — Scaffold / CI / Docker boot
1. Create the monorepo skeleton per STRUCTURE §0 (`backend/`, `frontend/`, `shared/`, `docs/`,
   `docker/`, root build/run files); add `.dockerignore` (§5) and `.env.example` (§6).
2. `backend/app/config.py`: `Settings` (pydantic-settings, prefix `PDFFORGE_`) covering every
   knob in STRUCTURE §6; nothing else reads `os.environ`.
3. `backend/app/core/errors.py` + `schemas/errors.py`: the `ErrorResponse` envelope and FastAPI
   exception handlers (API §1.5 + status-code map).
4. `backend/app/core/security.py`: response security headers + CSP (no `unsafe-eval`,
   `worker-src 'self'`); stub `Remote-User`/`Remote-Email` read (D5).
5. `backend/app/api/health.py` + `app/main.py`: app-factory registering the `/api` router
   **first**, then `app.frontend("/", directory="static", fallback="index.html")`; implement
   `GET /api/health` (API §7) and `X-API-Version: 1` on all responses.
6. `frontend/`: Vite + React 19 skeleton, `App.tsx` shell, placeholder route, `lib/api.ts` stub
   hitting `/api/health`; commit `package-lock.json`.
7. `Dockerfile` (4-stage, STRUCTURE §3) + `docker/jbig2enc.sh`; pin every base by digest.
8. `docker-compose.yml` hardened single service (STRUCTURE §4): no published port, read-only
   rootfs, `jobs` volume, tmpfs `/tmp`, cap_drop, pids_limit, healthcheck, 2C/2G.
9. CI pipeline: image build + `npm run build` + pytest + lint; document the monthly rebuild
   schedule (OQ#10).
10. **M0 DoD:** build, `up` to healthy, the §3 M0 curl/browser checks pass.

### M1 — Upload + validate + job harness
11. `core/validation.py`: 3-stage validation (ext allow-list → magic bytes →
    **pikepdf structural open** authority), API §3.2; add pikepdf to the runtime venv.
12. `core/upload.py`: streaming byte-counter → `413`; server-generated names; disk precheck →
    `507` (`PDFFORGE_DISK_RESERVE_FACTOR`).
13. `core/tempdir.py`: per-job `mkdtemp(dir=PDFFORGE_JOBS_DIR, 0700)` context manager with
    guaranteed cleanup.
14. `jobs/models.py` + `schemas/jobs.py`: `Job` dataclass + `JobState` enum
    (`queued|running|succeeded|failed|expired|canceled`), `JobSubmitResponse`, `JobStatus`
    (API §4.1).
15. `jobs/manager.py`: in-memory registry, bounded queue, state transitions, submit-over-capacity
    → **429 + Retry-After** (never `queued`).
16. `jobs/pool.py` + `jobs/runner.py`: `ProcessPoolExecutor(PDFFORGE_WORKER_COUNT)`; worker entry
    with `setrlimit` (CPU/FSIZE) + wall-clock timeout + `os.killpg` cleanup.
17. `jobs/janitor.py`: hourly asyncio TTL sweep of `/app/jobs/<uuid>` older than
    `PDFFORGE_JOB_TTL_SECONDS` → `expired`.
18. `api/jobs.py`: the 5 lifecycle endpoints — `POST /api/jobs/{op}` (202+`Location`),
    `GET /api/jobs/{id}`, `GET …/result`, `GET …/result/{index}`, `DELETE …` (API §4) — plus an
    internal `noop`/`echo` op (validate → passthrough) to exercise the harness.
19. Frontend: `lib/thresholds.ts` (150 MB gate), `components/Dropzone`, `state/jobsStore.ts`
    polling machine, `components/JobProgress` spinner; real `lib/api.ts` (submit/poll/download/
    cancel).
20. pytest: happy + failure (413/415/400/429/404 `result_gone`, cancel→canceled) for the harness.
21. **M1 DoD:** the §3 M1 curl/browser lifecycle checks pass.

### M2 — Client page-ops + pikepdf finalize
22. `engines/pikepdf_engine.py`: bindings-only wrapper (structure, decrypt, repair, encrypt,
    permissions, linearize, sanitize) — no qpdf CLI (D8).
23. `services/finalize.py`: the ★ pass — `save(linearize=True)` + **always strip
    `/JavaScript /JS /OpenAction /AA /Launch`** + decrypt-first; preserve attachments by default
    (API §6, OQ#8).
24. `services/structure.py` + wire `POST /api/jobs/finalize`, `POST /api/jobs/merge`,
    `POST /api/jobs/split` (API §5.2) + `MergeParams`/`SplitParams` in `schemas/ops.py`.
25. Frontend `components/Viewer` (pdf.js software-canvas, `isEvalSupported:false`,
    `enableScripting:false`) + `lib/pdfjs.ts` worker wiring (ESM).
26. Frontend `components/PageGrid` (`@dnd-kit/core` 6.3.1) reorder + rotate (**absolute**
    `setRotation`) + delete; `page-model/` (document/pageModel/undo).
27. Frontend `workers/pdfExport.worker.ts` (pdf-lib `save()` `< 150 MB`; above → route to
    server `…/merge`/`…/split`) + `lib/pdflib.ts`; the "organize" flow.
28. pytest + browser: finalize strips active content / preserves attachments; merge/split page
    counts; encrypted-input decrypt-first.
29. **M2 DoD:** the §3 M2 checks pass.

### M3 — Compress (Ghostscript)
30. `engines/subprocess_run.py`: shared bounded runner — argv `shell=False`, `TMPDIR`, timeout,
    `os.killpg(getpgid, SIGKILL)` (D3).
31. `engines/ghostscript.py` + `services/compress.py`: explicit GS flag **constants** (OQ#14),
    keep-smaller-of-in/out, then pikepdf finalize; wire `POST /api/jobs/compress` +
    `CompressParams`.
32. Run the one-time **GS preset verification spike** on pinned trixie GS; record the confirmed
    flags.
33. Frontend "compress" flow + Toolbar entry.
34. pytest: compress happy path + timeout→failed + killpg leaves no orphan `gs`.
35. **M3 DoD:** the §3 M3 checks pass.

### M4 — OCR (ocrmypdf / Tesseract)
36. `engines/ocrmypdf_engine.py` + `services/ocr.py`: `--jobs 1 --tesseract-timeout 120
    --skip-big N`, `OMP_THREAD_LIMIT=1`; `OcrParams`; wire `POST /api/jobs/ocr`.
37. Multi-artifact result path: sidecar → **zip** (`*-ocr.pdf` + `*.txt`); exercise
    `GET …/result/{index}` (API §4.5).
38. Frontend "OCR" flow (language pick eng/deu, sidecar toggle, zip download).
39. pytest: OCR makes a scanned PDF searchable; sidecar zip; per-page timeout/skip-big handled.
40. **M4 DoD:** the §3 M4 checks pass.

### M5 — Encrypt / decrypt / permissions
41. `engines/pypdf_engine.py` (AES-256 fallback) + `services/crypto.py`: encrypt
    (pikepdf R6 AES, pypdf fallback) / decrypt (pikepdf only); encryption applied **in the
    finalize save** (API §6); wire `…/encrypt`, `…/decrypt` + params.
42. `services/permissions.py`: `pikepdf.Permissions` set/clear (advisory); wire
    `…/permissions` + `PermissionsParams`; wrong-password → `422`/failed-validation.
43. Frontend encrypt/decrypt/permissions flows with the **advisory-permissions disclaimer**.
44. pytest: encrypt→open-requires-password, decrypt round-trip, wrong password, permissions flags.
45. **M5 DoD:** the §3 M5 checks pass.

### M6 — Remaining ops (feature-complete)
46. `engines/poppler.py` (`pdftocairo`/`pdftoppm`/`pdftotext`/`pdfimages`).
47. `services/rasterize.py` → `POST /api/jobs/rasterize` (image / zip / image-only-PDF→finalize)
    + `RasterizeParams`.
48. `services/images.py` → `POST /api/jobs/image-to-pdf` (Ghostscript; img2pdf lossless add-on)
    + image-extension allow-list + `ImageToPdfParams` → finalize.
49. `services/text.py` → `POST /api/jobs/extract-text` (poppler `pdftotext`, **no finalize**)
    + `ExtractTextParams`; client quick-text via pdf.js for preview.
50. `services/sanitize.py` → `POST /api/jobs/sanitize` (strip metadata/XMP **+ attachments**,
    OQ#8) + `SanitizeParams`.
51. Wire `POST /api/jobs/linearize` (exposes `finalize.py`) and `services/repair.py` →
    `POST /api/jobs/repair` (pikepdf tolerant parser) → finalize.
52. Frontend flows: rasterize/flatten, image→PDF (multi-image intake), extract-text viewer,
    one-click Sanitize, linearize, repair.
53. pytest: ≥1 happy + 1 failure path for each of the 6 ops; confirm all 19 API §10 endpoints.
54. **M6 DoD:** the §3 M6 feature-complete checks pass.

### M7 — Hardening / packaging polish
55. Validate the full container posture + no-egress worker + proxy body-cap docs (OQ#7,
    STRUCTURE §4); `core/logging.py` carries no document content; error sanitization audited.
56. Load/soak: disk precheck 507, TTL janitor reclaim, killpg on cancel/timeout, no orphaned
    processes; tune `setrlimit` + `PDFFORGE_WORKER_COUNT`.
57. Generate `shared/openapi.json` and reconcile `shared/operations.json` /
    `error-codes.json` / `job-states.json` against the running app.
58. Pre-GA spikes: OCR throughput + concurrency RAM (tune pool size, ImageBitmap cap),
    pdf.js `enableHWA` (OQ#16), pdf.js editor/form round-trip fidelity (OQ#17).
59. Supply chain: monthly scheduled CI rebuild + Renovate digest PRs (OQ#10); image-size check.
60. **M7 DoD:** clean proxy-fronted `up`, auth on, no published port, soak-stable and healthy;
    all error codes reproduce per API §8.

---

*Cross-refs:* `docs/DECISIONS.md` (D1–D8, OQ#1–OQ#17), `docs/API.md` (§2 flow, §4 lifecycle,
§5 ops, §6 finalize, §10 endpoint index), `docs/STRUCTURE.md` (§1 backend map, §2 frontend map,
§3 Dockerfile, §4 compose, §6 env), `research/SUMMARY.md` (§2 MUST set, §3 split, §4 engines,
§5 security, §6 packaging).
