# pdf-forge — Repo Layout & Docker Build Shape (v1)

> **Status:** authoritative for repo layout and packaging. Honors the LOCKED calls in
> `docs/DECISIONS.md` (D1–D8, OQ#1–OQ#17) and the packaging snapshot in `research/SUMMARY.md`
> §6 / `research/packaging.md`. Where this refines the high-level sketch in `CLAUDE.md`
> ("Repo structure") it is the more specific authority for *layout*; `CLAUDE.md` and
> `SCOPE.md` remain authoritative for *scope*.
>
> **Two deltas vs the `CLAUDE.md` sketch, both forced by DECISIONS and noted here so nobody
> "fixes" them back:** (1) the FastAPI package is `app` and the entrypoint is
> `uvicorn app.main:app` (D4/packaging §2, not `main:app`); (2) the runtime base is
> **Python 3.13**-slim-trixie (D6), superseding the "Python 3.12" line in `CLAUDE.md`'s
> tech-stack list.

---

## 0. Top-level shape (monorepo)

A single repository, single deployable image. Three source trees — `backend/`, `frontend/`,
`shared/` — plus `docs/`, `docker/`, and root build/run assets. The built SPA is **not** a
source tree; it is an image-only artifact copied into `/app/static` at build time.

```
pdf-forge/
├── SCOPE.md                     # v1 scope — single source of truth (referenced by CLAUDE.md)
├── PLAN.md                      # milestones / task order
├── README.md
├── CLAUDE.md                    # project memory
│
├── Dockerfile                   # 4-stage build (see §3)
├── docker-compose.yml           # hardened single-service run (see §4)
├── .dockerignore                # build-context hygiene (see §5)
├── .env.example                 # every runtime knob, documented (see §6)
│
├── docs/
│   ├── DECISIONS.md             # LOCKED architecture decisions
│   ├── API.md                   # backend contract (endpoint groups in §2 below)
│   ├── STRUCTURE.md             # << this file
│   └── PLAN.md                  # (or at root; keep one canonical copy)
│
├── docker/                      # build-support assets (kept out of app trees)
│   ├── jbig2enc.sh              # clone+build jbig2enc from source (builder stage)
│   ├── verapdf/                 # optional veraPDF bundle/install script (PDF/A, deferred — see §3.5)
│   └── healthcheck.py           # (optional) extracted urllib healthcheck if not inlined
│
├── shared/                      # cross-language contract — single source for names/codes
│   ├── operations.json          # canonical op-name list + per-op param schema (feeds API.md + FE/BE)
│   ├── error-codes.json         # sanitized error categories (validation|timeout|engine|oversize|disk-full|...)
│   ├── job-states.json          # queued|running|succeeded|failed|expired|canceled (D1)
│   └── openapi.json             # generated from FastAPI; FE api-client codegen input
│
├── backend/                     # FastAPI app + engine wrappers + job system  (see §1)
│   ├── pyproject.toml           # deps + tool config
│   ├── uv.lock                  # (or requirements.txt) — pinned, reproducible
│   ├── requirements.txt         # fallback lockfile if not using uv
│   ├── app/                     # the importable package  ->  uvicorn app.main:app
│   │   └── … (see §1)
│   └── tests/                   # pytest: ≥1 happy + 1 failure path per endpoint
│
└── frontend/                    # Vite + React SPA  (see §2.3)
    ├── package.json
    ├── package-lock.json        # npm ci source of truth
    ├── vite.config.ts
    ├── tsconfig.json
    ├── index.html
    ├── public/
    └── src/
        └── … (see §2.3)
```

> **`static/` is intentionally absent from the source tree.** It exists only inside the image
> at `/app/static`, produced by `COPY --from=frontend …/dist`. `app.frontend(..., check_dir=True)`
> (D4) fails fast at startup if that copy is missing.

---

## 1. Backend layout (`backend/app/`) — folder → responsibility → API group

The package is `app`; entrypoint `app.main:app`. Layered: **api** (HTTP only) → **jobs**
(async machinery, D1/D3) → **services** (one per operation, runs in the worker) → **engines**
(thin per-binary/per-lib wrappers, D8) → **core** (cross-cutting infra). `schemas` and `config`
are leaf modules used across layers.

```
backend/app/
├── main.py                  # app factory: register /api routers FIRST, then app.frontend("/",
│                            #   directory="static", fallback="index.html"); install exception
│                            #   handlers + security headers (D4). Reserves /api/health.
├── config.py                # Settings (pydantic-settings, env-prefix PDFFORGE_) — ALL knobs (§6)
│
├── api/                     # ── HTTP LAYER: parse, validate, enqueue, serialize. No engine calls. ──
│   ├── __init__.py          #   builds api_router (prefix="/api"), includes the routers below
│   ├── health.py            #   GET /api/health  (trivial 200, no disk/CPU)
│   │                        #     -> API group: SYSTEM / META  (the only health endpoint in v1;
│   │                        #        no /api/ready — not in the API.md §10 19-endpoint contract)
│   └── jobs.py              #   POST /api/jobs/{op}  (202 + Location) ; GET /api/jobs/{id} (poll) ;
│                            #     GET /api/jobs/{id}/result(/{index}) (stream bytes) ; DELETE /api/jobs/{id}
│                            #     -> API group: JOBS (the async lifecycle for every heavy op)
│                            #   NOTE: no api/preview.py in v1 — preview/thumbnails are CLIENT-side
│                            #     (pdf.js, zero upload, API.md §9); server poppler render is an
│                            #     internal fallback only, not a public v1 endpoint.
│
├── schemas/                 # ── Pydantic request/response models; mirror docs/API.md + shared/ ──
│   ├── jobs.py              #   JobSubmitResponse, JobStatus, JobState enum (source of job-states.json)
│   ├── ops.py               #   per-op param models: CompressParams, OcrParams, EncryptParams,
│   │                        #     DecryptParams, PermissionsParams, RasterizeParams, ImageToPdfParams,
│   │                        #     ExtractTextParams, SanitizeParams, LinearizeParams, RepairParams,
│   │                        #     MergeParams, SplitParams, FinalizeParams
│   └── errors.py            #   ErrorResponse envelope (category + safe message; never a stack trace)
│
├── jobs/                    # ── ASYNC JOB SYSTEM (D1 lifecycle, D3 concurrency) ──
│   ├── models.py            #   internal Job dataclass + JobState enum (queued→running→succeeded|
│   │                        #     failed|expired, + canceled)
│   ├── manager.py           #   in-memory job registry, state transitions, bounded queue;
│   │                        #     submit-over-capacity -> 429 + Retry-After (never enters queued)
│   ├── pool.py              #   ProcessPoolExecutor(1–2 workers); submit/await; the only path to CPU work
│   ├── runner.py            #   worker entrypoint: op-name -> services dispatch; applies setrlimit
│   │                        #     (RLIMIT_CPU/FSIZE) + wall-clock timeout; finally-cleanup of job dir
│   └── janitor.py           #   TTL sweeper (asyncio task): rmtree /app/jobs/<uuid> older than 1h (D2)
│
├── services/                # ── ONE MODULE PER OPERATION. Orchestrates engines + finalize. ──
│   │                        #     Pure-ish, importable/callable inside the worker process.
│   ├── compress.py          #   Ghostscript /ebook + explicit DPI/downsample/ColorConversion flags
│   │                        #     (D8, OQ#14); keep smaller of input/output
│   ├── ocr.py               #   ocrmypdf --jobs 1 --tesseract-timeout 120 --skip-big (D3)
│   ├── crypto.py            #   encrypt (pikepdf AES-256 R6) / decrypt (pikepdf; pypdf fallback) (D8)
│   ├── permissions.py       #   set/clear pikepdf.Permissions (advisory — UI must say so)
│   ├── rasterize.py         #   pages -> raster (poppler pdftocairo / pdfium); redaction foundation
│   ├── images.py            #   image->PDF (Ghostscript / img2pdf) ; image extraction (pdfimages/pikepdf)
│   ├── text.py              #   extract text (poppler pdftotext)
│   ├── sanitize.py          #   strip metadata/XMP (+ attachments on explicit Sanitize) (OQ#8)
│   ├── structure.py         #   server merge/split/reorder finalize (pikepdf)
│   ├── repair.py            #   recover via pikepdf (qpdf) — never pypdf
│   └── finalize.py          #   ★ canonical pikepdf normalize pass: save(linearize=True) +
│                            #     ALWAYS strip /JavaScript /JS /OpenAction /AA /Launch (D7, OQ#8).
│                            #     Every durable artifact exits through here.
│
├── engines/                 # ── THIN WRAPPERS, one per engine. No business logic. (D8) ──
│   ├── subprocess_run.py    #   SHARED bounded runner: argv lists (shell=False), TMPDIR, timeout,
│   │                        #     os.killpg(getpgid, SIGKILL) for gs/tesseract grandchildren (D3)
│   ├── pikepdf_engine.py    #   ENGINE: pikepdf (libqpdf bindings) — structure, decrypt, repair,
│   │                        #     encrypt, permissions, linearize, sanitize. NO qpdf CLI (D8/OQ#15)
│   ├── ghostscript.py       #   ENGINE: Ghostscript (gs) — compression, image->PDF, PDF/A fallback
│   ├── ocrmypdf_engine.py   #   ENGINE: ocrmypdf / Tesseract — OCR
│   ├── poppler.py           #   ENGINE: poppler-utils — pdftocairo/pdftoppm (render/thumbs),
│   │                        #     pdftotext (text), pdfimages (image extract)
│   └── pypdf_engine.py      #   ENGINE: pypdf — AES-256 encrypt fallback; (form-fill canonical, later)
│
├── core/                    # ── CROSS-CUTTING INFRA (the "one canonical impl" rule, CLAUDE.md) ──
│   ├── validation.py        #   3-stage upload validation: ext allow-list -> magic bytes
│   │                        #     (python-magic, first ~2KB) -> structural pikepdf open (authority)
│   ├── upload.py            #   streaming byte-counter cap -> 413 ; server-generated names only
│   │                        #     (client filename never a path component) ; disk precheck -> 507
│   ├── tempdir.py           #   per-job mkdtemp(dir=/app/jobs, mode=0700) context mgr; guaranteed
│   │                        #     cleanup on success/failure (D2)
│   ├── errors.py            #   error shaper + FastAPI exception handlers -> ErrorResponse
│   ├── security.py          #   read Remote-User/Remote-Email (display/audit only, D5); response
│   │                        #     security headers / CSP (no unsafe-eval, worker-src 'self')
│   └── logging.py           #   structured logging (no document content, privacy-first)
│
└── (static lives at /app/static in the image — see §0, not in this package)
```

### 1.1 Engine-wrapper → engine map (D8 / OQ#15)

| Wrapper (`engines/`) | Engine | Invocation | Used by services |
|---|---|---|---|
| `pikepdf_engine.py` | pikepdf → **libqpdf** | Python **bindings only** (no `qpdf` CLI) | crypto, permissions, structure, repair, sanitize, **finalize** |
| `ghostscript.py` | **Ghostscript** (`gs`) | subprocess (argv) | compress, images (image→PDF), PDF/A fallback |
| `ocrmypdf_engine.py` | **ocrmypdf** / **Tesseract** | subprocess (argv) | ocr |
| `poppler.py` | **poppler-utils** | subprocess: `pdftocairo`/`pdftoppm`/`pdftotext`/`pdfimages` | rasterize, text, images (extract), preview |
| `pypdf_engine.py` | **pypdf** (pure-Python) | import | crypto (AES-256 fallback) |

### 1.2 API group → backend folder map

| API group (`docs/API.md`) | Router | Service(s) / system |
|---|---|---|
| SYSTEM/META — `/api/health` | `api/health.py` | — (trivial 200; no `/api/ready` in the v1 contract) |
| JOBS — `POST /api/jobs/{op}`, `GET /api/jobs/{id}`, `…/result(/{index})`, `DELETE …` | `api/jobs.py` | `jobs/*` → `services/{op}.py` → `services/finalize.py` |
| PREVIEW/THUMBNAILS — **client-side only (pdf.js); no v1 server endpoint** | — | server poppler render is an internal fallback (API.md §9), not a public route |

`{op}` ∈ the MUST set: `compress, ocr, encrypt, decrypt, permissions, rasterize,
image-to-pdf, extract-text, sanitize, linearize, repair, merge, split, finalize`
(canonical list lives in `shared/operations.json`; matches the 14 `POST /api/jobs/{op}`
ops in API.md §10 — `reorder` is a **client-side** edit made durable via `finalize`, not a
server op).

---

## 2. Frontend layout (`frontend/src/`) — and where pdf.js worker + pdf-lib live

```
frontend/src/
├── main.tsx                 # React root
├── App.tsx                  # shell, routing, layout
│
├── components/              # presentational + composite UI (one folder per component)
│   ├── PageGrid/            #   the page board: reorder/rotate/delete via @dnd-kit/core 6.3.1 (OQ#11)
│   ├── Viewer/              #   pdf.js canvas viewer (software-canvas baseline, OQ#16)
│   ├── Toolbar/             #   op triggers (compress/OCR/encrypt/… -> open a flow)
│   ├── JobProgress/         #   poll-driven spinner (no progress bar below threshold, OQ#12)
│   └── Dropzone/            #   file intake; enforces client/server threshold pre-upload
│
├── flows/                   # one folder per user flow (CLAUDE.md): organize/compress/ocr/
│                            #   encrypt/sanitize/merge-split/… ; each wires components+state+api
│
├── page-model/              # in-memory document & page model (client-side edits, D7 Option A)
│   ├── document.ts          #   loaded doc(s), bytes handle (ArrayBuffer kept < 1 GB)
│   ├── pageModel.ts         #   order / rotation (ABSOLUTE setRotation, per research) / deletions / selection
│   └── undo.ts              #   undo/redo stack for the page board
│
├── workers/                 # Web Workers (off-main-thread)
│   └── pdfExport.worker.ts  #   ★ pdf-lib save() here for files < 150 MB (OQ#12); above the
│                            #     threshold, byte assembly is routed to the pikepdf backend instead
│
├── lib/
│   ├── api.ts               #   ★ the SINGLE API client — every /api call (submit job, poll
│   │                        #     GET /api/jobs/{id}, download …/result, cancel). No scattered fetch().
│   ├── pdfjs.ts             #   ★ pdf.js setup: GlobalWorkerOptions.workerSrc -> the pdf.js worker
│   │                        #     (pdfjs-dist build/pdf.worker bundled by Vite). Hardening:
│   │                        #     isEvalSupported:false, enableScripting:false (security-homelab)
│   ├── pdflib.ts            #   pdf-lib helpers (copyPages for client merge/split; rotation math)
│   └── thresholds.ts        #   150 MB client/server gate via file.size + navigator.deviceMemory (D7)
│
├── state/                   # app state (store of choice: Zustand/Context)
│   ├── jobsStore.ts         #   active jobs + polling state machine
│   ├── documentStore.ts     #   loaded documents + page-model binding
│   └── uiStore.ts           #   selection, modals, flow state
│
└── styles/
```

**pdf.js worker:** ships in the `pdfjs-dist` npm package (`build/pdf.worker.min.mjs`); it is
**not** vendored into the repo. Vite bundles it and `lib/pdfjs.ts` wires
`GlobalWorkerOptions.workerSrc` (e.g. `new Worker(new URL('pdfjs-dist/build/pdf.worker.min.mjs',
import.meta.url), {type:'module'})` — pdf.js is ESM-only since v4).
**pdf-lib:** an npm dependency, imported only by `workers/pdfExport.worker.ts` and `lib/pdflib.ts`.
Both reach the network exclusively through `lib/api.ts`.

---

## 3. Dockerfile (annotated 4-stage skeleton)

Stages: **(A)** frontend build → **(B)** jbig2enc-from-source builder → **(C)** Python venv
builder → **(D)** slim runtime. (B is separate because it needs a C toolchain that must not
ship.) Honors D6: trixie slim, non-root UID 10001, qpdf apt dropped, jbig2enc from source.

```dockerfile
# syntax=docker/dockerfile:1

###############################################
# Stage A — frontend build (Vite/React SPA)   #
###############################################
FROM node:22-slim@sha256:<pinned> AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci                                   # reproducible install from lockfile
COPY frontend/ ./
RUN npm run build                            # -> /src/dist

###############################################
# Stage B — jbig2enc from source (mono comp.) #
#   (not in Debian apt; best mono-scan win)   #
###############################################
FROM python:3.13-slim-trixie@sha256:<pinned> AS jbig2
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential autoconf automake libtool pkg-config \
        zlib1g-dev libleptonica-dev libffi-dev \
    && rm -rf /var/lib/apt/lists/*
COPY docker/jbig2enc.sh /tmp/
RUN sh /tmp/jbig2enc.sh                       # git clone agl/jbig2enc -> autogen/configure/make install
                                              #   -> /usr/local/bin/jbig2 (+ lib)

###############################################
# Stage C — Python deps into a venv (builder) #
###############################################
FROM python:3.13-slim-trixie@sha256:<pinned> AS pybuild
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
WORKDIR /app
# pikepdf/pypdf/ocrmypdf deps all ship glibc manylinux wheels -> no gcc needed here.
COPY backend/requirements.txt ./             # (or pyproject.toml + uv.lock with: uv sync --frozen)
RUN pip install --no-cache-dir -r requirements.txt

###############################################
# Stage D — slim runtime                      #
###############################################
FROM python:3.13-slim-trixie@sha256:<pinned> AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PATH="/venv/bin:$PATH" \
    OMP_THREAD_LIMIT=1 \
    TMPDIR=/app/jobs/tmp

# Native PDF tooling — single RUN, index removed. qpdf DROPPED (pikepdf bundles libqpdf, D8).
RUN apt-get update && apt-get install -y --no-install-recommends \
        ghostscript \
        tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu \
        poppler-utils \
        unpaper \
        pngquant \
        fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*
#   (tesseract-ocr pulls libleptonica runtime, which jbig2 below also links.)

# Bring over: resolved venv, jbig2enc binary, built SPA, backend package.
COPY --from=pybuild  /venv               /venv
COPY --from=jbig2    /usr/local/bin/jbig2 /usr/local/bin/jbig2
COPY --from=frontend /src/dist           /app/static       # served by app.frontend(directory="static")
COPY backend/app                         /app/app          # package -> uvicorn app.main:app

# Non-root + writable jobs dir; rest of rootfs is read-only at runtime (compose).
RUN useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin pdfforge \
    && mkdir -p /app/jobs/tmp \
    && chown -R pdfforge:pdfforge /app/jobs
USER 10001
WORKDIR /app                                  # app.frontend(directory="static") resolves to /app/static

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; \
sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3.5 veraPDF (PDF/A) — staged but deferred
DECISIONS D6/OQ#4 "stage veraPDF in the image now," but **veraPDF is a Java app and requires a
JRE** — a large addition for a feature that is *not* a v1 MUST. To honor both the directional
intent and the v1 "fewest moving parts / MUST-only" rule, keep veraPDF as an **optional extra
stage** (`docker/verapdf/`) that is **off by default in v1** and switched on only when the PDF/A
SHOULD lands. Document the JRE size cost (~+150–200 MB) when it does.

**Notes**
- `uv` is the preferred resolver (`uv sync --frozen` from `uv.lock`); pip + `requirements.txt`
  is the shown fallback. Pin a lockfile either way.
- Pin **every** base by digest (`@sha256:`). Monthly scheduled CI rebuild + Renovate PR bumps;
  no Watchtower auto-pull (OQ#10).
- `app.frontend()` needs FastAPI ≥ 0.138.0 (D4). Pin `starlette>=0.47.2` transitively
  (multipart DoS CVEs) and `pdfjs-dist` per the security pins.

---

## 4. docker-compose.yml (hardened, single service)

```yaml
services:
  pdfforge:
    image: pdfforge:latest                 # built from ./Dockerfile, digest-pinned in prod
    restart: unless-stopped
    # NO published port: the reverse proxy reaches it over an internal Docker network only,
    # so forward-auth headers (Remote-User) cannot be forged from the LAN (D5).
    networks: [ proxy_internal ]
    environment:
      - PDFFORGE_MAX_UPLOAD_MB=200          # D2 / OQ#6 ; proxy body cap MUST be >= this
      - PDFFORGE_WORKER_COUNT=1             # D3 pool size (1 on 2C/2G; up to 2)
      - PDFFORGE_QUEUE_MAXSIZE=8            # over-capacity submit -> 429 + Retry-After
      - PDFFORGE_JOB_TTL_SECONDS=3600       # D2 janitor sweep age (1h)
      - PDFFORGE_JOB_TIMEOUT_SECONDS=300    # D3 per-subprocess wall-clock
      - PDFFORGE_OCR_TIMEOUT_SECONDS=120    # ocrmypdf --tesseract-timeout
      - PDFFORGE_DISK_RESERVE_FACTOR=4      # free < 4x MAX_UPLOAD -> 507
      - PDFFORGE_TESSERACT_LANGS=eng,deu
      - TMPDIR=/app/jobs/tmp                # gs/tesseract scratch on the bounded volume (D2)
      - OMP_THREAD_LIMIT=1                  # stop Tesseract over-threading per job (D6)
    read_only: true                          # rootfs read-only; only the scratch below is writable
    tmpfs:
      - /tmp:size=64m,mode=1777              # tiny, for libs that hardcode /tmp ONLY
    volumes:
      - jobs:/app/jobs                       # DISK-BACKED named volume — NOT tmpfs (OCR rasters
                                             #   on tmpfs count against memory and OOM-kill, D2/D6)
    user: "10001:10001"
    cap_drop: [ "ALL" ]
    security_opt:
      - no-new-privileges:true
    pids_limit: 512
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 20s
    deploy:
      resources:
        limits:   { cpus: "2.0", memory: 2g }   # hard backstop for runaway gs/tesseract (D3/D6)
        reservations: { memory: 512m }

volumes:
  jobs:                                       # survives restart, disk-backed; size host disk >= 5x cap

networks:
  proxy_internal:
    external: true                            # shared with the reverse proxy only
```

**volume vs tmpfs decision (D2/D6):** `/app/jobs` is a **disk-backed named volume** so large OCR
rasters don't count against the 2 GB memory limit and OOM-kill the container; `tmpfs` is used
**only** for a small `/tmp`. Set the named volume's host backing disk to **≥ 5× `MAX_UPLOAD`**
(~1 GB+). A fresh named volume inherits `/app/jobs` ownership (UID 10001) on first creation; if
the UID ever changes, fix ownership or writes fail.

**Reverse-proxy body-size note (the #1 self-host break):** the proxy MUST allow bodies ≥
`PDFFORGE_MAX_UPLOAD_MB` (200 MB). **nginx** defaults to **1 MB** → uploads 413 until
`client_max_body_size 200m;`. **Traefik** has no default cap. **Caddy** streams. Terminate TLS at
the proxy; pdf-forge stays plain-HTTP on the internal network.

---

## 5. .dockerignore + image-size tactics

**`.dockerignore` essentials** (keep the build context lean; the SPA is rebuilt in-stage-A):

```
.git
**/node_modules
frontend/dist
**/__pycache__
**/*.pyc
**/.pytest_cache
**/.venv
venv/
*.md
docs/
research/
shared/                # contract artifacts not needed in the image
tests/
backend/tests/
*.pdf                  # sample/fixture PDFs never enter the image
.env*
docker-compose*.yml
```
> Note: `Dockerfile` itself is **not** ignored here (Docker needs it); the `*.md` line keeps
> docs out of context — `docs/` and `research/` are listed explicitly for clarity.

**Image-size tactics (packaging §4):**
- multi-stage: Node toolchain + C build chain (jbig2enc) + pip/uv cache never ship → 70–90% cut;
- `--no-install-recommends` + `rm -rf /var/lib/apt/lists/*` in the **same** apt RUN;
- `python:3.13-slim-trixie` base (not full `python`); only the Tesseract langs we ship
  (`-eng`,`-deu`) — never `tesseract-ocr-all`;
- `PIP_NO_CACHE_DIR=1` / `uv` no-cache; `PYTHONDONTWRITEBYTECODE=1`;
- copy only `dist/`, the `/venv`, the `jbig2` binary, and `backend/app` forward.

**Expected size:** **~600–700 MB on disk (uncompressed)** for the eng/deu build (floor set by
Ghostscript + Tesseract + lang data + Noto fonts); approaches/exceeds **1 GB** if CJK fonts/langs
or the veraPDF JRE are added. Registry/compressed is meaningfully smaller. This is normal for an
OCR image — do not fight it.

---

## 6. Where config / env knobs live

**Backend:** one canonical `Settings` class in `backend/app/config.py`
(`pydantic-settings BaseSettings`, env-prefix `PDFFORGE_`). Nothing reads `os.environ` directly.
**Frontend build-time:** `VITE_*` vars in `frontend/.env` (baked at build). **Runtime wiring:**
`docker-compose.yml` `environment:` block; documented template in **`.env.example`** at repo root.

| Knob (env) | Default | Decision | Consumed in |
|---|---|---|---|
| `PDFFORGE_MAX_UPLOAD_MB` | 200 | D2 / OQ#6 | `core/upload.py` (→413); proxy cap mirrors it |
| `PDFFORGE_WORKER_COUNT` | 1 (→2) | D3 | `jobs/pool.py` |
| `PDFFORGE_QUEUE_MAXSIZE` | 8 | D3 | `jobs/manager.py` (→429) |
| `PDFFORGE_JOB_TTL_SECONDS` | 3600 | D2 | `jobs/janitor.py` |
| `PDFFORGE_JOB_TIMEOUT_SECONDS` | 300 | D3 | `jobs/runner.py` (wall-clock + killpg) |
| `PDFFORGE_RLIMIT_CPU_SECONDS` | (tuned) | D3 | `jobs/runner.py` (setrlimit) |
| `PDFFORGE_RLIMIT_FSIZE_MB` | (tuned) | D3 | `jobs/runner.py` (setrlimit) |
| `PDFFORGE_OCR_TIMEOUT_SECONDS` | 120 | D3 | `services/ocr.py` (`--tesseract-timeout`) |
| `PDFFORGE_TESSERACT_LANGS` | `eng,deu` | D6 | `services/ocr.py` (must match installed packs) |
| `PDFFORGE_DISK_RESERVE_FACTOR` | 4 | D2 | `core/upload.py` (`disk_usage` →507) |
| `PDFFORGE_JOBS_DIR` | `/app/jobs` | D2 | `core/tempdir.py` |
| `TMPDIR` | `/app/jobs/tmp` | D2/D6 | env (gs/tesseract/qpdf scratch) |
| `OMP_THREAD_LIMIT` | 1 | D6 | env (Tesseract threading) |
| `PDFFORGE_TRUST_FORWARD_AUTH` | true | D5 | `core/security.py` (Remote-User read) |
| `VITE_CLIENT_SERVER_THRESHOLD_MB` | 150 | D7 / OQ#12 | `frontend/src/lib/thresholds.ts` (build-time) |
| `VITE_JOB_POLL_INTERVAL_MS` | 1500 | D1 | `frontend/src/state/jobsStore.ts` (build-time) |

Compression GS flags (`-dPDFSETTINGS=/ebook` + explicit `-dColorImageResolution=150`,
`-dDownsampleColorImages=true`, explicit `-dColorConversionStrategy`) are **constants in
`services/compress.py`**, not env knobs — pinned for reproducibility across GS versions (OQ#14).
