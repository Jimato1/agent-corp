# pdf-forge — Backend API Contract (v1)

> **Status:** authoritative HTTP contract for the v1 **MUST** feature set.
> Implements the locked cross-cutting calls in [`docs/DECISIONS.md`](./DECISIONS.md)
> (D1 job model, D2 temp-file flow, D3 concurrency, D4 `/api` prefix + SPA mount,
> D5 proxy auth, D6 image, D7 reconciliation + 150 MB line, D8 engine shell-out
> policy) and the open-question resolutions OQ#1–OQ#17. Grounded in
> `research/SUMMARY.md`, `research/security-homelab.md`,
> `research/client-vs-server-split.md`.
>
> **Scope rule:** this contract covers v1 MUST features only. SHOULD/LATER ops
> (watermark/Bates/page-numbers/typed-sign/add-text, image stamps, durable form
> flatten, PDF/A as a user feature, redaction, PKI signing, PDF→Office, compare)
> are named where relevant but **not endpointed here**.

---

## 1. API conventions

### 1.1 Base path, mount order, versioning
- **Base path:** every API route lives under **`/api/*`**. The built Vite/React SPA is
  served at `/` by FastAPI's `app.frontend("/", directory="static",
  fallback="index.html")` (D4). **All `/api/*` path operations are registered before the
  frontend mount**, so API routes always match first and only genuine navigation
  GET/HEAD requests fall through to `index.html`.
- **Reserved:** `/api/health` is reserved for the container healthcheck (D4/D6).
- **Versioning:** v1 is served **unversioned in the path** (`/api`, not `/api/v1`). The
  server advertises `X-API-Version: 1` on every response. The path stays stable for all
  backward-compatible additions; a future **breaking** change introduces `/api/v2/*`
  alongside `/api/*` rather than mutating v1. Clients should treat unknown JSON fields as
  additive and ignore them.

### 1.2 Content types
| Direction | Content type | Used by |
|---|---|---|
| Job submission (request) | `multipart/form-data` | all `POST /api/jobs/{op}` — file part(s) + `options` JSON part |
| Job status / errors (response) | `application/json; charset=utf-8` | status, error envelopes |
| PDF result (response) | `application/pdf` | finalize, merge, compress, ocr, encrypt, decrypt, permissions, sanitize, linearize, repair, image-to-pdf |
| Multi-file result (response) | `application/zip` | split, rasterize (multi-page images), extract-text (multi-format) |
| Text result (response) | `text/plain; charset=utf-8` | extract-text (single `.txt`) |
| Image result (response) | `image/png` / `image/jpeg` | rasterize (single page) |

The client `Content-Type` header on uploads is **never trusted** for validation (§3.2);
it is treated as a hint only.

### 1.3 Auth assumption
- pdf-forge ships **no app-level login** (D5). Authentication and session management
  happen at the **reverse proxy** (Authelia forward-auth recommended; Basic-over-TLS
  single-user stopgap). The app is bound to an **internal Docker network with no published
  host port**, so the proxy is the only reachable path in.
- The app **optionally reads** `Remote-User` / `Remote-Email` forward-auth headers for
  **display/audit only** (echoed into job audit fields and logs). It never makes an
  authorization decision from them, and these headers are trustworthy **only because** the
  app port is unpublished (publishing it would let any LAN host forge them — load-bearing
  per D5). Single-tenant (OQ#9): no per-user ACLs, per-job temp-dir isolation only.

### 1.4 Request correlation
- Every request carries / receives **`X-Request-ID`**. If the client (or proxy) supplies
  one it is echoed; otherwise the server generates a UUID4 hex and returns it on the
  response. The same id appears in logs and in the `request_id` field of any error
  envelope. It is **distinct from a job id**.

### 1.5 Common error envelope
All non-2xx API responses (validation, capacity, server faults) return a single JSON shape.
This is **separate** from a *job that ran and failed* — a failed job is still an HTTP `200`
status document whose `state` is `"failed"` (§4.4).

```json
{
  "error": {
    "code": "file_too_large",
    "message": "Upload exceeds the 200 MB limit.",
    "status": 413,
    "request_id": "3f1c9a0b8e7d4f62a1c5d9e2b4f60718",
    "details": { "limit_mb": 200 }
  }
}
```

- `code` — stable machine string (snake_case); clients branch on this, not on `message`.
- `message` — short human-readable, **sanitized** (never leaks server paths, stack traces,
  or engine stderr verbatim).
- `status` — mirrors the HTTP status.
- `request_id` — mirrors `X-Request-ID`.
- `details` — optional, code-specific object (may be omitted).

#### HTTP status code map
| Status | `error.code` (examples) | When |
|---|---|---|
| `400 Bad Request` | `malformed_request`, `missing_file`, `bad_pdf_structure` | Missing/garbled multipart, file fails the structural pikepdf open (stage 3, §3.2), bad page range string |
| `413 Payload Too Large` | `file_too_large` | Streaming byte counter exceeds `PDFFORGE_MAX_UPLOAD_MB` (default 200); also the proxy body cap backstop (OQ#6) |
| `415 Unsupported Media Type` | `unsupported_type`, `not_a_pdf` | Extension not allow-listed, or libmagic on first ~2 KB ≠ `application/pdf` (stages 1–2, §3.2) |
| `422 Unprocessable Entity` | `invalid_options`, `out_of_range`, `wrong_password` | `options` JSON fails schema, page index out of bounds, decrypt password rejected |
| `429 Too Many Requests` | `queue_full` | Worker pool + bounded queue at capacity (D3); includes `Retry-After` header |
| `404 Not Found` | `job_not_found`, `result_gone` | Unknown job id, or result swept by the TTL janitor (state `expired`) |
| `409 Conflict` | `job_not_terminal`, `already_terminal` | Result requested before the job succeeded, or cancel requested on a terminal job |
| `500 Internal Server Error` | `internal_error` | Unexpected server fault (never engine-CVE detail) |
| `507 Insufficient Storage` | `disk_full` | `shutil.disk_usage("/app/jobs")` precheck: free `< ~4×` `MAX_UPLOAD` (D2) |
| `503 Service Unavailable` | `shutting_down` | Graceful shutdown / not-ready (rare); carries `Retry-After` |

> `429` and `507` are **submit-time rejections** — the job never enters `queued` (D1/D3).

### 1.6 Limits (defaults, all configurable via env)
| Limit | Env var | Default | Enforced by |
|---|---|---|---|
| Max upload size | `PDFFORGE_MAX_UPLOAD_MB` | `200` | Streaming byte counter → `413` (never trusts `Content-Length`); reverse-proxy body cap set `≥` this |
| Client/server op line | `VITE_CLIENT_SERVER_THRESHOLD_MB` | `150` | Frontend build-time gate (`file.size` + `navigator.deviceMemory`); above it, page ops route to the server (D7) |
| Worker pool size | `PDFFORGE_WORKER_COUNT` | `1` (max 2) | `ProcessPoolExecutor` (D3) |
| Queue depth | `PDFFORGE_QUEUE_MAXSIZE` | small (e.g. 8) | Bounded queue → `429` when full |
| Per-job wall-clock | `PDFFORGE_JOB_TIMEOUT_SECONDS` | `300` | `os.killpg` of the process group (D3) |
| OCR per-page timeout | `PDFFORGE_OCR_TIMEOUT_SECONDS` | `120` | `ocrmypdf --tesseract-timeout 120 --jobs 1 --skip-big N` |
| Result TTL | `PDFFORGE_JOB_TTL_SECONDS` | `3600` | Hourly janitor → state `expired` (D2) |
| Allowed upload extensions | — | `.pdf` (`.png/.jpg/.jpeg/.tif/.tiff` for image-to-pdf) | Stage-1 allow-list (§3.2) |

---

## 2. The upload → job → download flow

pdf-forge is **stateless**: there is no persistent document store and no separate
"upload-then-reference" step. The file (possibly already client-edited per Option A, D7)
is sent **in the same multipart request that creates the job**. The job's temp dir holds
the input, scratch, and output for that one job only (D2).

### 2.1 End-to-end steps
1. **Client edits locally (optional).** Reorder/rotate/delete/small-merge/split run in the
   browser via pdf-lib; pdf.js renders previews. Zero upload (D7, client-vs-server-split §2).
   The client exports edited bytes (pdf-lib `save()` in a Web Worker for `< 150 MB`; above
   the line, byte assembly is routed to the server instead — OQ#12).
2. **Submit job.** `POST /api/jobs/{op}` as `multipart/form-data`: the `file` part is the
   (edited) PDF bytes; an `options` part is a JSON string of op-specific parameters.
3. **Submit-time validation & admission**, in this exact order:
   1. **Disk precheck** — `shutil.disk_usage("/app/jobs")`; free `< ~4× MAX_UPLOAD` → `507`.
   2. **Streaming size cap** — bytes are streamed to the per-job staging file with a running
      counter; overflow → `413` (independent of `Content-Length`).
   3. **Three-stage upload validation** (§3.2): extension allow-list → magic bytes → structural
      pikepdf open. First failing stage returns `415` / `415` / `400` respectively.
   4. **Options schema** — `options` JSON validated; failure → `422`.
   5. **Capacity** — if the worker pool + bounded queue is full → `429 + Retry-After`
      (never enters `queued`).
   On success the server creates `/app/jobs/<uuid4hex>/` (`mkdtemp`, `0700`), writes
   `input.pdf` (server-generated name only), enqueues, and returns **`202 Accepted`** with a
   job descriptor and `Location: /api/jobs/{id}`.
4. **Process off the event loop.** A pool worker (D3) runs the engine subprocess under a
   wall-clock timeout + `killpg`, `setrlimit`, and engine knobs. The job transitions
   `queued → running`.
5. **Finalize (every write path).** Before the artifact is durable, the worker runs the
   **pikepdf normalize + linearize pass** (`save(linearize=True)`) which also **strips active
   content** (OQ#8). See §6. State becomes `succeeded` (or `failed`).
6. **Progress reporting = polling (D1, OQ#5).** The client polls `GET /api/jobs/{id}` every
   ~1–2 s (with backoff) and reads `state`. **No SSE/WebSocket in v1** (deferred SHOULD).
   `progress` is best-effort/coarse and **may be `null`**; clients drive UI off `state`
   (spinner, not a progress bar — OQ#12). Polling survives proxy read-timeouts and keeps
   CPU work off the Starlette event loop.
7. **Download.** When `state == "succeeded"`, `GET /api/jobs/{id}/result` streams the bytes
   with the correct `Content-Type` and a sanitized `Content-Disposition` filename (derived
   from the stored original name; the on-disk name is server-generated). Multi-artifact jobs
   (split, multi-page rasterize) stream a zip, or fetch individual artifacts via
   `GET /api/jobs/{id}/result/{index}`.
8. **Cleanup.** The worker `rmtree`s the job dir in its `finally`; a streamed result deletes
   in the response `BackgroundTask`/generator `finally`; the hourly TTL janitor sweeps
   orphans (→ `expired`). After expiry the result returns `404 result_gone`.

### 2.2 Job lifecycle (D1)
```
            submit (202)
                │
                ▼
            ┌─────────┐   worker picks up   ┌──────────┐  finalize ok   ┌────────────┐
            │ queued  │ ──────────────────▶ │ running  │ ─────────────▶ │ succeeded  │
            └─────────┘                     └──────────┘                └─────┬──────┘
                │                                │                            │ TTL janitor
   DELETE       │                       error /  │ timeout/crash              ▼
   (cancel)     │                                ▼                       ┌──────────┐
                │                          ┌──────────┐                  │ expired  │
                └─────────────────────────▶│ canceled │     ┌──────────┐ └──────────┘
                       killpg + rmtree     └──────────┘     │  failed  │
                                                            └──────────┘
```
Submit-time `429` (queue full) and `507` (disk full) are rejections — they **never** enter
`queued`.

### 2.3 Sequence sketch
```
Browser (pdf.js+pdf-lib)        Reverse proxy           FastAPI (/api)            Worker pool (D3)
        │                            │                       │                          │
  edit locally (zero upload)         │                       │                          │
        │  POST /api/jobs/compress   │                       │                          │
        │  multipart: file+options   │   stream body         │                          │
        │ ─────────────────────────▶ │ ────────────────────▶ │ disk precheck (507?)     │
        │                            │                       │ byte cap (413?)          │
        │                            │                       │ 3-stage validate (415/400?)
        │                            │                       │ options (422?)           │
        │                            │                       │ admit (429 if full?)     │
        │      202 + {id,state:queued, Location}             │ mkdtemp, enqueue ───────▶│
        │ ◀───────────────────────── │ ◀──────────────────── │                          │ run gs
        │                            │                       │                          │ + pikepdf
        │  GET /api/jobs/{id}  (poll ~1–2s)                   │                          │ finalize
        │ ─────────────────────────▶ │ ────────────────────▶ │ read job record          │
        │      200 {state:running}   │                       │ ◀── state updates ───────│
        │ ◀───────────────────────── │                       │                          │
        │  GET /api/jobs/{id}  (poll) │                       │                  succeeded│
        │      200 {state:succeeded, result:{href,…}}        │                          │
        │  GET /api/jobs/{id}/result │                       │                          │
        │ ─────────────────────────▶ │ ────────────────────▶ │ stream application/pdf   │
        │      200 <bytes>           │                       │ BackgroundTask rmtree     │
        │ ◀───────────────────────── │ ◀──────────────────── │                          │
```

---

## 3. Documents / upload

### 3.1 No standalone upload endpoint
There is **no** `POST /api/documents` that persists a file for later reference. Per D7
(Option A, stateless), bytes are uploaded **as part of each job submission** (§5). This
avoids server-held document state and per-user ACLs (OQ#9). Client-side preview/thumbnail/
text-extraction never uploads at all (client-vs-server-split §2).

### 3.2 Three-stage upload validation (applied at every job submit)
Validation order is **fixed** (security-homelab §1, D-cross-cutting):

| Stage | Check | Tool | Failure |
|---|---|---|---|
| 1 | **Extension allow-list** — `.pdf` (or image set for image-to-pdf) | string check on stored original name (display only) | `415 unsupported_type` |
| 2 | **Magic bytes** — first ~2 KB sniffed, MIME must be `application/pdf` (allow leading junk before `%PDF-`) | `python-magic` / libmagic | `415 not_a_pdf` |
| 3 | **Structural open** — file must open cleanly | **pikepdf / libqpdf** (the authority; libmagic is only a filter, polyglots pass stage 2) | `400 bad_pdf_structure` |

The client `Content-Type` and filename are **never** used to decide validity, and the
filename is **never** used as a path component — the on-disk name is `input.pdf` inside the
per-job dir; the original name is kept only as a string for the eventual download
`Content-Disposition` (security-homelab §1, D2).

---

## 4. Jobs (lifecycle: status / result / cancel)

These are the generic endpoints every heavy op shares. Submission endpoints are in §5.

### 4.1 Job descriptor (shared response shape)
```json
{
  "id": "9f8c2a1b4d6e4710b2c3a4f5e6d70819",
  "op": "compress",
  "state": "running",
  "progress": null,
  "stage": "ghostscript",
  "created_at": "2026-06-30T12:00:00Z",
  "updated_at": "2026-06-30T12:00:07Z",
  "expires_at": "2026-06-30T13:00:07Z",
  "engine": "ghostscript",
  "input": { "filename": "scan.pdf", "bytes": 5242880 },
  "submitted_by": "alice@example.com",
  "result": null,
  "error": null
}
```
- `state` ∈ `queued | running | succeeded | failed | expired | canceled` (D1).
- `progress` — `null` or `0.0–1.0` (best-effort; v1 clients use `state`, not this).
- `stage` — optional engine/phase hint (e.g. `validating`, `ghostscript`, `finalize`).
- `submitted_by` — from `Remote-User`/`Remote-Email` if present (audit only, §1.3).
- `result` — populated when `succeeded` (§4.3); else `null`.
- `error` — populated when `failed` (§4.4); else `null`.

### 4.2 `GET /api/jobs/{id}` — job status (poll target)
- **Purpose:** the polling endpoint; returns the current job descriptor.
- **Request:** path `id` (uuid4 hex). No body.
- **Success:** `200 OK`, job descriptor (§4.1).
- **Errors:** `404 job_not_found` (unknown id), `404 result_gone`/state `expired` (swept).
- **Engine:** none (reads the in-memory/job-record store).

### 4.3 `GET /api/jobs/{id}/result` — download result
- **Purpose:** stream the finished artifact(s).
- **Request:** path `id`. Optional `?disposition=inline|attachment` (default `attachment`).
- **Success:** `200 OK` with op-appropriate `Content-Type` (§1.2), `Content-Length`,
  `Content-Disposition: attachment; filename="…"` (sanitized). Multi-artifact ops stream a
  zip by default.
- **Result sub-shape** (inside the descriptor when `succeeded`):
  ```json
  "result": {
    "href": "/api/jobs/{id}/result",
    "media_type": "application/pdf",
    "filename": "scan-compressed.pdf",
    "bytes": 1872311,
    "artifacts": [
      { "index": 0, "href": "/api/jobs/{id}/result/0",
        "media_type": "application/pdf", "filename": "scan-compressed.pdf", "bytes": 1872311 }
    ],
    "meta": { "input_bytes": 5242880, "output_bytes": 1872311, "kept": "output" }
  }
  ```
- **Errors:** `409 job_not_terminal` (not yet `succeeded`), `404 job_not_found`,
  `404 result_gone` (expired/swept). Streamed result deletes its job dir in the response
  `finally` (D2).
- **Engine:** none (streams bytes).

### 4.4 Failed-job shape (returned by `GET /api/jobs/{id}`, HTTP 200)
A job that ran and failed is **not** an HTTP error — it is a `200` status document:
```json
{
  "id": "…", "op": "ocr", "state": "failed",
  "error": { "code": "timeout", "category": "engine", "message": "OCR exceeded the time limit." },
  "result": null
}
```
`error.code` ∈ `validation | timeout | engine_error | oversize | disk_full | canceled`
(sanitized; never raw engine stderr or a CVE detail).

### 4.5 `GET /api/jobs/{id}/result/{index}` — single artifact
- **Purpose:** fetch one artifact of a multi-output job (split pages, per-page rasters).
- **Request:** path `id`, `index` (0-based, must be in `result.artifacts`).
- **Success:** `200 OK`, that artifact's media type + `Content-Disposition`.
- **Errors:** `404` (id/index unknown), `409 job_not_terminal`, `404 result_gone`.
- **Engine:** none.

### 4.6 `DELETE /api/jobs/{id}` — cancel / discard
- **Purpose:** cancel a `queued`/`running` job, or discard a terminal job's artifacts early.
- **Request:** path `id`. No body.
- **Behavior:** if `running`, the worker is killed via `os.killpg` (kills gs/tesseract
  grandchildren) and the job dir `rmtree`d; state → `canceled`. If `queued`, it is removed
  from the queue → `canceled`. If already terminal (`succeeded`/`failed`/`expired`), the
  artifacts are deleted.
- **Success:** `200 OK` with the final descriptor (`state: "canceled"`), or `204 No Content`
  when discarding terminal artifacts.
- **Errors:** `404 job_not_found`.
- **Engine:** none (process control + `rmtree`).

---

## 5. Heavy operations (submission endpoints)

All heavy ops are submitted the same way and share the lifecycle of §4. They are the
ops that run off the event loop in the bounded pool (D3): compress, ocr, encrypt, decrypt,
permissions, rasterize, image-to-pdf, extract-text, sanitize, linearize, repair, plus the
server-side merge/split and finalize.

### 5.0 Shared submission contract
- **Method/path:** `POST /api/jobs/{op}` where `{op}` is one of the rows in §5.1.
- **Request:** `multipart/form-data`:
  - `file` — the PDF bytes (required for all ops except `image-to-pdf`, which takes `images`,
    and `merge`, which takes repeated `files`).
  - `options` — a JSON string part with op-specific parameters (optional/empty when the op
    has none).
- **Success:** **`202 Accepted`**, job descriptor (§4.1) with `state: "queued"`, header
  `Location: /api/jobs/{id}`.
- **Common errors:** `400`, `413`, `415`, `422`, `429`, `507` per §1.5 (applied in the §2.1
  order). After admission, op-specific failures surface as a **failed job** (§4.4), not an
  HTTP error.
- **Finalize:** every op that produces a durable PDF ends with the pikepdf
  normalize+linearize pass (§6). Read-only ops (extract-text, rasterize-to-image) do not.

### 5.1 Endpoint index — heavy ops
| `{op}` | Method + path | Purpose | Engine (D8) | Finalize? | Result type |
|---|---|---|---|---|---|
| `finalize` | `POST /api/jobs/finalize` | Normalize/linearize client-edited bytes (Option A); the canonical write path for client page ops | **pikepdf** | yes (is the pass) | `application/pdf` |
| `merge` | `POST /api/jobs/merge` | Server-side merge (large/encrypted; small merges are client-side) | **pikepdf** | yes | `application/pdf` |
| `split` | `POST /api/jobs/split` | Server-side split / range extraction (large/encrypted) | **pikepdf** | yes (per output) | `application/zip` |
| `compress` | `POST /api/jobs/compress` | Lossy compression (`/ebook`, 150 dpi) | **Ghostscript** | yes | `application/pdf` |
| `ocr` | `POST /api/jobs/ocr` | Add searchable text layer | **ocrmypdf** (Tesseract) | yes | `application/pdf` (+ optional sidecar) |
| `encrypt` | `POST /api/jobs/encrypt` | AES-256 (R=6) encrypt | **pikepdf** | yes (encryption in finalize save) | `application/pdf` |
| `decrypt` | `POST /api/jobs/decrypt` | Remove password | **pikepdf** | yes | `application/pdf` |
| `permissions` | `POST /api/jobs/permissions` | Set/clear advisory permissions | **pikepdf** | yes | `application/pdf` |
| `rasterize` | `POST /api/jobs/rasterize` | Render pages → images, or flatten → image-only PDF | **poppler** `pdftocairo`/`pdftoppm` | only PDF output | `image/png` \| `application/zip` \| `application/pdf` |
| `image-to-pdf` | `POST /api/jobs/image-to-pdf` | Wrap image(s) into a PDF | **Ghostscript** (img2pdf add-on for lossless) | yes | `application/pdf` |
| `extract-text` | `POST /api/jobs/extract-text` | Extract text (batch) | **poppler** `pdftotext` | no | `text/plain` \| `application/zip` |
| `sanitize` | `POST /api/jobs/sanitize` | Strip metadata + XMP + attachments + active content | **pikepdf** | yes | `application/pdf` |
| `linearize` | `POST /api/jobs/linearize` | Web-optimize (fast web view) | **pikepdf** | yes (is the pass) | `application/pdf` |
| `repair` | `POST /api/jobs/repair` | Recover/repair damaged structure | **pikepdf** | yes | `application/pdf` |

> 14 submission ops served by one route pattern (`POST /api/jobs/{op}`), plus the 5
> lifecycle/health endpoints (§4, §7) → **19 documented endpoints**.

### 5.2 Per-op detail

#### `finalize` — pikepdf
- **Purpose:** the durable server touchpoint for client-side page ops (reorder/rotate/
  delete/small merge/split). Client uploads the edited bytes; server normalizes + linearizes
  + strips active content (D7, OQ#8).
- **`options`:** none required. Optional `{ "strip_attachments": false }` (default keeps
  attachments per OQ#8).
- **Result:** `application/pdf`.

#### `merge` — pikepdf
- **Purpose:** combine multiple PDFs server-side (the path for large/encrypted inputs; small
  merges stay in the browser via pdf-lib).
- **Request:** repeated `files` parts (order = merge order); optional `options`
  `{ "order": [..], "passwords": {"file_2": "…"} }`.
- **Result:** `application/pdf`. Encrypted inputs are **decrypted server-side first** (D7).

#### `split` — pikepdf
- **Purpose:** split into ranges / per-page documents.
- **`options`:** `{ "mode": "ranges" | "every_n" | "single", "ranges": ["1-3","4","5-end"], "n": 10 }`.
- **Result:** `application/zip` of the output PDFs (each individually finalized); individual
  PDFs fetchable via `/result/{index}`.

#### `compress` — Ghostscript
- **`options`:** `{ "preset": "ebook", "color_dpi": 150 }` (v1 default `/ebook` 150 dpi).
- **Engine call:** explicit flags (OQ#14) — `-dPDFSETTINGS=/ebook -dColorImageResolution=150
  -dDownsampleColorImages=true` + explicit `-dColorConversionStrategy` (not preset defaults).
- **Behavior:** keep the **smaller of input/output** (`meta.kept` reports which). Then pikepdf
  finalize. Result `application/pdf`.

#### `ocr` — ocrmypdf (Tesseract)
- **`options`:** `{ "languages": ["eng","deu"], "redo_ocr": false, "force_ocr": false,
  "deskew": false, "rotate_pages": false, "sidecar": false, "output_type": "auto" }`.
- **Engine call:** `ocrmypdf --jobs 1 --tesseract-timeout 120 --skip-big N` (D3). `output_type
  auto` may emit PDF/A (validated by bundled veraPDF, OQ#4) but PDF/A is not a v1 user feature.
- **Result:** `application/pdf`; when `sidecar: true`, a `.txt` sidecar is added → result is a
  `application/zip` (`document-ocr.pdf` + `document.txt`). Then pikepdf finalize on the PDF.

#### `encrypt` — pikepdf
- **`options`:** `{ "user_password": "…", "owner_password": "…", "permissions": { … } }`.
  AES-256 (R=6) is the default and strongest handler. **A user password is required for real
  confidentiality** (owner-only/blank-user PDFs open for anyone — labeled advisory in UI).
- **Order:** normalize+linearize **and** encryption happen in the **same** pikepdf `save()`
  (encryption must be the final write — §6).
- **Result:** `application/pdf`.

#### `decrypt` — pikepdf
- **`options`:** `{ "password": "…" }`. Always decrypt with pikepdf (pdf-lib cannot; D7).
- **Errors:** wrong/absent password → failed job `error.code: validation` (or `422
  wrong_password` if detected at submit). Result `application/pdf`.

#### `permissions` — pikepdf
- **Purpose:** set/clear **advisory** permissions (`pikepdf.Permissions`) — print, modify,
  copy, annotate, etc. UI must label these as advisory (security-homelab §6).
- **`options`:** `{ "permissions": { "extract": false, "modify": false, "print": "low" },
  "owner_password": "…" }`. Result `application/pdf`.

#### `rasterize` — poppler (`pdftocairo`/`pdftoppm`)
- **Purpose:** render pages to images, or produce an image-only ("flattened") PDF (foundation
  for redaction, a SHOULD).
- **`options`:** `{ "pages": "1-end", "dpi": 150, "format": "png" | "jpeg" | "pdf" }`.
- **Result:** single page → `image/png`/`image/jpeg`; multiple pages → `application/zip`;
  `format: "pdf"` → image-only `application/pdf` (then pikepdf finalize).

#### `image-to-pdf` — Ghostscript (img2pdf add-on for lossless)
- **Request:** repeated `images` parts (`.png/.jpg/.jpeg/.tif/.tiff`, extension-allow-listed).
- **`options`:** `{ "page_size": "auto" | "a4" | "letter", "lossless": false }`
  (`lossless: true` uses img2pdf when inputs are non-CMYK/non-alpha).
- **Result:** `application/pdf`, then pikepdf finalize.

#### `extract-text` — poppler (`pdftotext`)
- **Purpose:** server-side batch text extraction (client does quick preview via pdf.js).
- **`options`:** `{ "pages": "1-end", "layout": false }`.
- **Result:** `text/plain` (single doc) — **no finalize** (read-only, no durable PDF).

#### `sanitize` — pikepdf
- **Purpose:** the explicit one-click privacy scrub: strip Info + XMP metadata, **and**
  embedded files/attachments (`/EmbeddedFiles`,`/Names`), in addition to the always-on active-
  content strip (OQ#8). Attachment removal is **only** done here (and mandatorily on redaction).
- **`options`:** `{ "strip_metadata": true, "strip_attachments": true }`.
- **Result:** `application/pdf` (sanitize is itself a normalize+linearize save).

#### `linearize` — pikepdf
- **Purpose:** explicit "web optimize" (`save(linearize=True)`). Functionally the finalize
  pass exposed as a user op. Result `application/pdf`.

#### `repair` — pikepdf
- **Purpose:** recover broken xref/truncated files via libqpdf's tolerant parser (**never
  pypdf** for repair). Result `application/pdf`, then finalize. If the file cannot be opened at
  all, it already failed stage-3 validation at submit (`400 bad_pdf_structure`).

---

## 6. The pikepdf normalize + linearize finalize pass

**Every write path ends here.** It is the canonical source-of-truth step (DECISIONS, D7,
OQ#8). Conceptually one pikepdf `save()`:

1. **Decrypt first** if the input was encrypted (pdf-lib/server ops require cleartext; D7).
2. **Normalize** object structure (rebuild via libqpdf), **`linearize=True`** for fast web view.
3. **Always strip active content** in this pass: `/JavaScript`, `/JS`, `/OpenAction`, `/AA`,
   `/Launch` (OQ#8 — pure attack-surface reduction, no fidelity cost).
4. **Preserve embedded files/attachments by default**; remove them **only** for `sanitize` and
   (future) redaction.
5. For `encrypt`/`permissions`, the `Encryption`/`Permissions` are applied **in this same
   save** so encryption is the final write (order matters).

Where it sits per op:

| Op | Finalize position |
|---|---|
| finalize, linearize, sanitize | the pass **is** the operation |
| compress (gs), ocr (ocrmypdf), image-to-pdf (gs), rasterize→pdf (poppler), repair | engine produces an intermediate PDF → **pikepdf finalize** → durable output |
| merge, split | structural op in pikepdf → finalize (per output) |
| decrypt | decrypt → finalize |
| encrypt, permissions | normalize+linearize **and** encryption/permissions in the **same** pikepdf save |
| extract-text, rasterize→image | **no finalize** (read-only; no durable PDF) |

---

## 7. Health

### `GET /api/health`
- **Purpose:** container healthcheck (D4/D6); also a readiness probe.
- **Auth:** reachable without forward-auth (used by the in-container Python `urllib`
  one-liner; D6).
- **Request:** none.
- **Success:** `200 OK`
  ```json
  {
    "status": "ok",
    "version": "1.0.0",
    "api_version": 1,
    "workers": { "pool_size": 1, "busy": 0, "queue_depth": 0, "queue_max": 8 },
    "disk": { "jobs_free_mb": 8123, "jobs_total_mb": 10240 },
    "uptime_s": 3600
  }
  ```
- **Degraded:** `503 shutting_down` during graceful shutdown or when the jobs volume is below
  the disk-precheck floor.
- **Engine:** none.

---

## 8. Concrete examples

### 8.1 Submit a compress job
```http
POST /api/jobs/compress HTTP/1.1
Content-Type: multipart/form-data; boundary=----pf
X-Request-ID: 3f1c9a0b8e7d4f62a1c5d9e2b4f60718

------pf
Content-Disposition: form-data; name="file"; filename="scan.pdf"
Content-Type: application/pdf

%PDF-1.7 …(bytes)…
------pf
Content-Disposition: form-data; name="options"
Content-Type: application/json

{"preset":"ebook","color_dpi":150}
------pf--
```
```http
HTTP/1.1 202 Accepted
Location: /api/jobs/9f8c2a1b4d6e4710b2c3a4f5e6d70819
X-API-Version: 1
X-Request-ID: 3f1c9a0b8e7d4f62a1c5d9e2b4f60718
Content-Type: application/json

{
  "id": "9f8c2a1b4d6e4710b2c3a4f5e6d70819",
  "op": "compress",
  "state": "queued",
  "engine": "ghostscript",
  "created_at": "2026-06-30T12:00:00Z",
  "expires_at": "2026-06-30T13:00:00Z",
  "input": { "filename": "scan.pdf", "bytes": 5242880 },
  "result": null,
  "error": null
}
```

### 8.2 Poll — running, then succeeded
```http
GET /api/jobs/9f8c2a1b4d6e4710b2c3a4f5e6d70819 HTTP/1.1
```
```json
{ "id": "9f8c…0819", "op": "compress", "state": "running", "stage": "ghostscript", "progress": null }
```
```json
{
  "id": "9f8c…0819", "op": "compress", "state": "succeeded",
  "result": {
    "href": "/api/jobs/9f8c…0819/result",
    "media_type": "application/pdf",
    "filename": "scan-compressed.pdf",
    "bytes": 1872311,
    "artifacts": [
      { "index": 0, "href": "/api/jobs/9f8c…0819/result/0",
        "media_type": "application/pdf", "filename": "scan-compressed.pdf", "bytes": 1872311 }
    ],
    "meta": { "input_bytes": 5242880, "output_bytes": 1872311, "kept": "output" }
  },
  "error": null
}
```

### 8.3 Download
```http
GET /api/jobs/9f8c2a1b4d6e4710b2c3a4f5e6d70819/result HTTP/1.1
```
```http
HTTP/1.1 200 OK
Content-Type: application/pdf
Content-Length: 1872311
Content-Disposition: attachment; filename="scan-compressed.pdf"

%PDF-1.5 …(linearized, active-content-stripped bytes)…
```

### 8.4 Encrypt request
```http
POST /api/jobs/encrypt
  (multipart: file=report.pdf)
  options = {
    "user_password": "open-sesame",
    "owner_password": "master-key",
    "permissions": { "print": "low", "modify": false, "extract": false }
  }
→ 202 { "id": "…", "op": "encrypt", "state": "queued", "engine": "pikepdf" }
```

### 8.5 OCR with sidecar (zip result)
```http
POST /api/jobs/ocr
  (multipart: file=invoice-scan.pdf)
  options = { "languages": ["eng"], "deskew": true, "sidecar": true }
→ 202 …  →  succeeded:
  "result": {
    "media_type": "application/zip",
    "filename": "invoice-scan-ocr.zip",
    "artifacts": [
      { "index": 0, "media_type": "application/pdf",  "filename": "invoice-scan-ocr.pdf" },
      { "index": 1, "media_type": "text/plain",        "filename": "invoice-scan.txt" }
    ]
  }
```

### 8.6 Split into ranges (zip)
```http
POST /api/jobs/split
  (multipart: file=book.pdf)
  options = { "mode": "ranges", "ranges": ["1-10", "11-20", "21-end"] }
→ 202 …  → result.media_type "application/zip"; 3 artifacts at /result/0..2
```

### 8.7 Error — payload too large
```http
HTTP/1.1 413 Payload Too Large
X-Request-ID: 3f1c…0718
Content-Type: application/json

{ "error": { "code": "file_too_large", "message": "Upload exceeds the 200 MB limit.",
             "status": 413, "request_id": "3f1c…0718", "details": { "limit_mb": 200 } } }
```

### 8.8 Error — queue full
```http
HTTP/1.1 429 Too Many Requests
Retry-After: 30
Content-Type: application/json

{ "error": { "code": "queue_full", "message": "All workers are busy; retry shortly.",
             "status": 429, "request_id": "…" } }
```

### 8.9 Error — disk full at submit
```http
HTTP/1.1 507 Insufficient Storage
Content-Type: application/json

{ "error": { "code": "disk_full", "message": "Not enough working storage to accept this job.",
             "status": 507, "request_id": "…" } }
```

---

## 9. Page-ops grouping summary (client vs. server)

| Op | v1 location | Server endpoint involved |
|---|---|---|
| Reorder / rotate / delete | **Client** (pdf-lib write, pdf.js preview) | `POST /api/jobs/finalize` to make the result durable |
| Merge (small, `< 150 MB`) | **Client** (pdf-lib `copyPages`) | `POST /api/jobs/finalize` (or `…/merge` if large/encrypted) |
| Split (small) | **Client** (pdf-lib) | `POST /api/jobs/finalize` (or `…/split` if large/encrypted) |
| Merge/split (large or encrypted) | **Server** | `POST /api/jobs/merge` / `POST /api/jobs/split` |
| Preview / thumbnails / quick text | **Client** (pdf.js, zero upload) | none (server thumbnails are an internal poppler fallback, not a v1 public endpoint) |

The client never blocks on the server for fast page edits (D7); the **only** durable write
path is the server pikepdf finalize pass (§6).

---

## 10. Endpoint index (complete)

| # | Method | Path | Group | Engine |
|---|---|---|---|---|
| 1 | GET | `/api/health` | health | — |
| 2 | GET | `/api/jobs/{id}` | jobs (status/poll) | — |
| 3 | GET | `/api/jobs/{id}/result` | jobs (download) | — |
| 4 | GET | `/api/jobs/{id}/result/{index}` | jobs (download artifact) | — |
| 5 | DELETE | `/api/jobs/{id}` | jobs (cancel/discard) | — |
| 6 | POST | `/api/jobs/finalize` | heavy op | pikepdf |
| 7 | POST | `/api/jobs/merge` | heavy op | pikepdf |
| 8 | POST | `/api/jobs/split` | heavy op | pikepdf |
| 9 | POST | `/api/jobs/compress` | heavy op | Ghostscript |
| 10 | POST | `/api/jobs/ocr` | heavy op | ocrmypdf (Tesseract) |
| 11 | POST | `/api/jobs/encrypt` | heavy op | pikepdf |
| 12 | POST | `/api/jobs/decrypt` | heavy op | pikepdf |
| 13 | POST | `/api/jobs/permissions` | heavy op | pikepdf |
| 14 | POST | `/api/jobs/rasterize` | heavy op | poppler |
| 15 | POST | `/api/jobs/image-to-pdf` | heavy op | Ghostscript (img2pdf add-on) |
| 16 | POST | `/api/jobs/extract-text` | heavy op | poppler (pdftotext) |
| 17 | POST | `/api/jobs/sanitize` | heavy op | pikepdf |
| 18 | POST | `/api/jobs/linearize` | heavy op | pikepdf |
| 19 | POST | `/api/jobs/repair` | heavy op | pikepdf |

**Total: 19 endpoints** (6 route patterns: `/api/health`, `/api/jobs/{id}`,
`/api/jobs/{id}/result`, `/api/jobs/{id}/result/{index}`, `DELETE /api/jobs/{id}`, and the
`POST /api/jobs/{op}` family of 14 ops).

---

*Sources / cross-refs:* `docs/DECISIONS.md` (D1–D8, OQ#1–OQ#17); `research/SUMMARY.md`
(§2 MUST set, §3 client/server split, §4 engine map, §5 security non-negotiables);
`research/security-homelab.md` (§1 upload validation, §2 temp-file lifecycle, §3 resource
bounds, §4 proxy caps, §5 auth, §6 RCE hardening); `research/client-vs-server-split.md`
(§2 split table, §3 must-be-server, §5 Option A reconciliation, §6 size thresholds).
