# pdf-forge

A self-hosted, privacy-first alternative to Adobe Acrobat. Runs as a **single
Docker container** on your LAN. Documents never leave your network — no cloud, no
subscription, no telemetry, no phone-home. The worker process has no network
egress and logs carry no document content.

Upload PDFs, organize pages visually in the browser (reorder, rotate, delete,
merge, split), and run heavier jobs on the server (OCR, compression,
linearization, encryption, and more), then download the result.

---

## Architecture (hybrid client/server)

- **Client (Vite + React + pdf.js):** rendering, thumbnails, preview, page-model
  edits (reorder/rotate/delete), and small in-browser merge/split via pdf-lib in
  a Web Worker. These upload **nothing**.
- **Server (FastAPI + engines):** everything that needs a real PDF engine.
  The client `POST`s a job → `202 + Location` → polls `GET /api/jobs/{id}` →
  downloads `GET /api/jobs/{id}/result`.
- **One container** serves the built SPA (`/app/static`) and the API. `/api/*`
  routes are registered first; every non-API GET falls through to the SPA.

Every durable output exits through one **canonical finalize pass** (pikepdf
`save(linearize=True)` + always strip `/JavaScript /JS /OpenAction /AA /Launch`;
attachments preserved unless you explicitly Sanitize).

### Engines

pikepdf (libqpdf bindings — **no qpdf CLI**), Ghostscript (compress),
ocrmypdf/Tesseract eng+deu (OCR), poppler-utils (rasterize / extract-text),
pypdf (AES-256 encrypt fallback), img2pdf (image→PDF), jbig2enc (built from
source for mono-scan compression).

---

## Run it (production, behind a reverse proxy)

The container publishes **no host port** by default — the reverse proxy reaches it
over an internal Docker network, so forward-auth headers can't be forged from the
LAN. Authentication happens at the proxy; pdf-forge reads `Remote-User` /
`Remote-Email` for audit only.

```bash
# build the single image (frontend + backend + engines)
docker compose build

# run it (joins the external `proxy_internal` network)
docker compose up -d

# logs / stop
docker compose logs -f pdfforge
docker compose down
```

The compose file assumes an **external** Docker network named `proxy_internal`
shared with your proxy. Create it once (or edit `docker-compose.yml` — see the
inline comments to let compose create it locally):

```bash
docker network create proxy_internal
```

### Reverse-proxy upload-size notes (IMPORTANT)

pdf-forge accepts uploads up to `PDFFORGE_MAX_UPLOAD_MB` (default **200 MB**) and
enforces it with a streaming byte counter (it never trusts `Content-Length`).
**Your proxy's body cap must be ≥ that value**, or large uploads are rejected by
the proxy before pdf-forge ever sees them. Set generous timeouts too — heavy jobs
(OCR, compress) stream a `202` quickly but the *upload* of a big file can take a
while.

**nginx**
```nginx
client_max_body_size 200m;      # >= PDFFORGE_MAX_UPLOAD_MB
proxy_read_timeout   600s;
proxy_request_buffering off;     # stream the upload straight through
```

**Caddy**
```
request_body {
    max_size 200MB
}
reverse_proxy pdfforge:8000
```

**Traefik** — Traefik does not cap body size by default; if you added a
`buffering` middleware, set `maxRequestBodyBytes` to at least `209715200`
(200 MB) or remove the cap for this router.

> If you raise `PDFFORGE_MAX_UPLOAD_MB`, raise the proxy cap to match, and make
> sure the `jobs` volume's backing disk has **≥ 5×** that value free (the disk
> precheck rejects submits with `507` when free space `< 4× max upload`).

---

## Local development

Two hot-reload servers; Vite proxies `/api` to the backend.

```bash
# backend (http://127.0.0.1:8000)
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# frontend (http://127.0.0.1:5173, proxies /api → :8000)
cd frontend && npm install && npm run dev
```

Engine binaries (Ghostscript, poppler, Tesseract) are only present inside the
container. On a bare dev machine, pikepdf-based ops (finalize, merge, split,
encrypt, decrypt, permissions, sanitize, linearize, repair) and image→PDF work;
compress/OCR/rasterize/extract-text return a clean `engine_unavailable` failure
until you run them in the container.

### Backend tests

```bash
cd backend && pytest
```

Ops needing gs/poppler/tesseract run their happy-path assertions only when the
binary is present (i.e. inside the container); on a bare host they're skipped and
their failure path is asserted instead. To run the full happy path:

```bash
docker compose run --rm --entrypoint sh pdfforge -c "cd /app && pip install pytest httpx && PYTHONPATH=/app python -m pytest /app/tests"
```
(or bake tests into an image variant — the runtime image does not ship tests.)

---

## Configuration (env, `PDFFORGE_` prefix)

| Var | Default | Meaning |
|-----|---------|---------|
| `PDFFORGE_MAX_UPLOAD_MB` | `200` | Per-file upload cap (streaming) → `413` |
| `PDFFORGE_MAX_TOTAL_UPLOAD_MB` | `400` | Aggregate per-request upload cap → `413` |
| `PDFFORGE_MAX_INPUT_FILES` | `50` | Max files in one multipart submit → `422` |
| `PDFFORGE_MAX_PAGE_COUNT` | `5000` | Page-count cap → `400` (enforced at upload AND in the worker) |
| `PDFFORGE_MAX_OUTPUT_MB` | `1024` | Cumulative output-artifact budget per job → fails fan-out bombs |
| `PDFFORGE_MAX_OUTPUT_ARTIFACTS` | `2000` | Max artifacts a single job may emit |
| `PDFFORGE_WORKER_COUNT` | `1` | Concurrent job processes |
| `PDFFORGE_QUEUE_MAXSIZE` | `8` | Queue depth; over capacity → `429 + Retry-After` |
| `PDFFORGE_JOB_TIMEOUT_SECONDS` | `300` | Per-job wall-clock kill |
| `PDFFORGE_OCR_TIMEOUT_SECONDS` | `120` | Per-page Tesseract timeout |
| `PDFFORGE_JOB_TTL_SECONDS` | `3600` | Result retention; janitor → `expired` |
| `PDFFORGE_JANITOR_INTERVAL_SECONDS` | `120` | TTL/orphan sweep cadence |
| `PDFFORGE_DISK_RESERVE_FACTOR` | `4` | Free-space precheck multiplier → `507` |
| `PDFFORGE_OCR_LANGUAGES` | `["eng","deu"]` | Installed OCR languages |
| `PDFFORGE_EXPOSE_DOCS` | `false` | Serve `/api/docs` + `/api/openapi.json` (dev only) |
| `PDFFORGE_TRUSTED_PROXY_IPS` | `[]` | If set, only honor `Remote-User`/`Remote-Email` from these client IPs |

See `.env.example`.

---

## API (19 endpoints)

Lifecycle/health (5):
`GET /api/health`, `GET /api/jobs/{id}`, `GET /api/jobs/{id}/result`,
`GET /api/jobs/{id}/result/{index}`, `DELETE /api/jobs/{id}`.

Submit (14 `POST /api/jobs/{op}`):
`finalize, merge, split, compress, ocr, encrypt, decrypt, permissions,
rasterize, image-to-pdf, extract-text, sanitize, linearize, repair`.

Full contract: `docs/API.md`. Feature scope: `SCOPE.md`. Verification steps:
`VERIFY.md`.

---

## Security posture

Non-root (UID 10001), read-only rootfs, `cap_drop: ALL`, `no-new-privileges`,
`pids_limit`, CPU/memory caps, no published port. Uploads validated in three
fixed stages (extension → magic bytes → **pikepdf structural open as authority**).
Engines are always called with argument lists (`shell=False`), never string
interpolation. Per-job temp dirs (`mode=0700`) on a disk-backed volume are
cleaned in the response `BackgroundTask` and swept hourly by a TTL janitor.
