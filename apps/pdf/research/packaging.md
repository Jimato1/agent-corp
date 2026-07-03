# pdf-forge — Packaging Track Research (Session 2, merged)

**Scope:** Minimal, production-sane Docker packaging for **pdf-forge**: a single container where FastAPI serves the built React/Vite static assets *and* runs the server-side PDF engines (pikepdf, pypdf, ocrmypdf/Tesseract, Ghostscript, poppler-utils). LAN-only, self-hosted homelab, behind a reverse proxy.

This is a **research-only** document: recommendations, Dockerfile/compose skeletons, exact package names, version caveats, and gotchas. No application code. It supersedes the session-1 file (`session1_pdfsmith/packaging.md`); a "Changes vs. session 1" section near the end records what was corrected/confirmed/added. (Session 1 called the product "PDFsmith"; same project.)

---

## 1. Recommended container shape (TL;DR)

- **One image, three build stages:** (A) Node stage builds the Vite frontend → `dist/`; (B) Python "builder" stage resolves Python deps into a venv (or `uv` venv); (C) slim Debian runtime stage installs the native PDF tooling, copies the venv + `dist/`, runs as non-root.
- **Base:** glibc Debian slim. As of mid-2026 the official Python images default to **Debian 13 "trixie"**, so use **`python:3.13-slim-trixie`** (or `python:3.14-slim-trixie`). **Do not use Alpine** — see §3. `bookworm` (Debian 12) still works but is now the *previous* stable; prefer `trixie`.
- **Frontend is static:** FastAPI serves `dist/` directly (use the native `app.frontend()` introduced in FastAPI **0.138.0**, June 2026). No nginx sidecar.
- **Expected final image size:** roughly **600 MB – 1.0 GB on disk (uncompressed)**. The floor is set by Tesseract + Ghostscript + each language pack (each `tesseract-ocr-XXX` is ~2–15 MB of trained data) plus Noto fonts. An eng-only build lands near ~600–700 MB; add CJK fonts/langs and you approach/exceed 1 GB. This is normal for an OCR-capable image — the official `ocrmypdf` image is in the same range. Compressed (registry) size is meaningfully smaller.

---

## 2. Multi-stage Dockerfile strategy

### Rationale
- **Build-time deps dwarf run-time deps and carry most CVEs.** The Node toolchain (hundreds of MB of `node_modules`) and any Python build chain (gcc, headers) must **not** ship in the final image. Multi-stage keeps them in throwaway stages and routinely cuts final size 70–90% vs single-stage.
- **Frontend and backend have totally different toolchains** (Node vs CPython). Separate stages let each use its natural base and cache independently.
- **Layer ordering for cache:** copy dependency manifests (`package.json`/`package-lock.json`, `pyproject.toml`/`requirements.txt`/`uv.lock`) and install **before** copying source, so editing app code doesn't bust the dependency layer.

### Skeleton

```dockerfile
# syntax=docker/dockerfile:1

############################
# Stage A — frontend build #
############################
FROM node:22-slim AS frontend
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci                       # reproducible install from lockfile
COPY web/ ./
RUN npm run build                # -> /app/web/dist

###################################
# Stage B — Python deps (builder) #
###################################
FROM python:3.13-slim-trixie AS pybuild
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
# A build chain is only needed if some dep lacks a wheel; pikepdf/pypdf/ocrmypdf
# and their Python deps all ship glibc manylinux wheels (see §3), so gcc/headers
# can usually be omitted entirely. If you do need them, install in THIS stage only.
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

#########################
# Stage C — runtime img #
#########################
FROM python:3.13-slim-trixie AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PATH="/venv/bin:$PATH" \
    OMP_THREAD_LIMIT=1 \
    TMPDIR=/app/jobs/tmp

# Native PDF tooling (see §3 for full list / rationale). Single RUN, cleaned.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ghostscript \
        tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu \
        qpdf \
        poppler-utils \
        unpaper \
        pngquant \
        fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

# Bring over resolved Python venv and built frontend
COPY --from=pybuild  /venv /venv
COPY --from=frontend /app/web/dist /app/static
COPY backend/ /app/

# Non-root + writable jobs dir (see §5)
RUN useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin pdfforge \
    && mkdir -p /app/jobs/tmp && chown -R pdfforge:pdfforge /app/jobs
USER pdfforge
WORKDIR /app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Notes:
- **`uv` is a strong alternative** to `pip`/`venv` in the builder stage — much faster resolves, and `uv sync --frozen` from `uv.lock` is reproducible. The **official OCRmyPDF image uses `uv sync --frozen`**. Either is fine; pin a lockfile for reproducibility.
- Keep one `apt-get update && install && rm -rf /var/lib/apt/lists/*` in a **single RUN layer** so the package index never persists in an image layer.
- Pin base images by digest (`python:3.13-slim-trixie@sha256:...`) for reproducible, supply-chain-safe builds.

---

## 3. Native/system dependencies (Debian/Ubuntu slim)

### What OCRmyPDF actually requires today (verified against current docs, v17.x)

OCRmyPDF's dependency model has shifted: several jobs it used to delegate to external binaries are now satisfied by **Python packages** pulled in as dependencies.

- **Required:** **Tesseract ≥ 4.1.1** (apt), and a rasterizer — **either `pypdfium2` (Python pkg, now preferred) or Ghostscript ≥ 9.54**. Text rendering uses **fpdf2 ≥ 2.8** and **uharfbuzz** (both Python packages, installed via pip/uv, not apt).
- **PDF/A conversion:** **verapdf + pikepdf**, *or* **Ghostscript ≥ 9.54**.
- **Optional external binaries (apt):** **unpaper 6.1** (`--clean`/`--clean-final`), **pngquant ≥ 2.5** (lossy PNG optimization at `--optimize 2/3`), **jbig2enc ≥ 0.29** (best monochrome compression — **not in apt**, see below).
- **Recommended system package:** `fonts-noto` (or `fonts-noto-core`) for correct multilingual rendering.
- **Python:** OCRmyPDF needs **Python 3.11+ (3.12+ recommended)**.

> Takeaway for pdf-forge: even though OCRmyPDF can now rasterize via `pypdfium2` without Ghostscript, **you still want Ghostscript installed** because your *compression* feature and your *PDF/A* path rely on Ghostscript presets directly. So keep `ghostscript` in the apt list.

### Exact apt package names (Debian trixie/bookworm, Ubuntu)

| Purpose | apt package | Notes |
|---|---|---|
| PDF render / PDF-A / compression presets | `ghostscript` | Your compression engine. OCRmyPDF needs **≥ 9.54** when used for rasterization/PDF-A; trixie ships GS 10.x. |
| OCR engine | `tesseract-ocr` | Needs **≥ 4.1.1**; trixie/bookworm ship 5.x. Pulls English data implicitly, but install langs explicitly. |
| OCR language data | `tesseract-ocr-eng`, `tesseract-ocr-deu`, … | One package per language, ~2–15 MB each. Install **only** what the UI offers. Never `tesseract-ocr-all`. |
| qpdf CLI + lib | `qpdf` | **Optional** — pikepdf bundles libqpdf in its wheel (§ below). Install only if you call the `qpdf` *command line* for linearization/encryption fallbacks. |
| poppler tools | `poppler-utils` | `pdftoppm`, `pdfinfo`, `pdftocairo`, `pdfimages`, `pdftotext` — handy for server-side previews/metadata even though the browser uses pdf.js. |
| OCR deskew/clean | `unpaper` | Enables ocrmypdf `--clean`/`--clean-final`. Small, optional. |
| PNG optimization | `pngquant` | Enables ocrmypdf lossy PNG quantization at optimize 2/3. Optional. |
| OCR/PDF-A fonts | `fonts-noto-core` (+ `fonts-noto-cjk` if CJK) | Ghostscript PDF-A output and CJK OCR need fonts present, else tofu/garbled output (no error). |
| jbig2 **decode** | `jbig2dec` | Decoder; usually pulled in transitively by Ghostscript. |
| jbig2 **encode** | *(no apt package)* | `jbig2enc` (lossless mono compression) is **not packaged on Debian** — compile from source in a builder stage or skip (skipping just weakens mono compression). |

> The **current official OCRmyPDF Dockerfile** (base **`ubuntu:26.04`**) installs at runtime: `ghostscript fonts-droid-fallback fonts-noto-core fonts-noto-cjk jbig2dec pngquant tesseract-ocr tesseract-ocr-{chi-sim,deu,eng,fra,por,spa} unpaper`. It **compiles `jbig2enc` from source** (build-stage: `build-essential autoconf automake libtool libleptonica-dev zlib1g-dev libffi-dev libcairo2-dev pkg-config`, `./autogen.sh && ./configure && make && make install`), installs Python deps via **`uv sync --frozen`**, relies on **pikepdf's bundled libqpdf** (no apt `qpdf`), runs as **non-root uid/gid 1000**, and **does not install `poppler-utils`**. pdf-forge should *add* `qpdf` and `poppler-utils` only if it shells out to those CLIs.

### Which Python libs pull native deps

- **pikepdf** — C++ extension over **libqpdf**. Ships **manylinux2014 + musllinux** wheels (x86_64 + aarch64) for **Python 3.10–3.14** that **bundle libqpdf, libjpeg, and zlib**. On a glibc slim image you get pikepdf with **no apt packages required** for the binding, *provided pip ≥ 20*. Source builds only needed on old distros lacking a C++20 compiler. (Binary wheels dropped for PyPy3 after pikepdf 9.8.1.)
- **pypdf** — **pure Python**, no native deps. (Optional crypto accel via `cryptography`, which itself ships manylinux wheels.)
- **ocrmypdf's Python deps** (`pypdfium2`, `fpdf2`, `uharfbuzz`, `pikepdf`) all ship glibc wheels — no compiler needed on slim.
- **ocrmypdf itself** — pip-installable, but **orchestrates external binaries** pip cannot provide: **Tesseract** (apt) is required; **Ghostscript/unpaper/pngquant/jbig2enc** are apt/source. This is the reason the runtime stage needs the apt list above.

### slim vs Alpine — recommend **slim (Debian)**

- pikepdf publishes musllinux wheels, so Alpine *can* work, **but** Alpine is the documented exception for the broader manylinux ecosystem, and you still need musl-built Tesseract/Ghostscript/poppler from Alpine repos. You trade a couple hundred MB for a higher chance of subtle musl/locale/font breakage in OCR and PDF rendering.
- glibc + `python:3.x-slim-trixie` gives first-class wheels, Debian's well-maintained `ghostscript`/`tesseract-ocr`/`poppler-utils`, and predictable behavior. **For a PDF/OCR workload Alpine's size savings are not worth the compatibility risk — use slim.**

---

## 4. Image-size reduction checklist

| Technique | Effect |
|---|---|
| `--no-install-recommends` on every `apt-get install` | Skips suggested extras (docs, optional langs, X libs); large savings on a Tesseract/Ghostscript image. |
| `rm -rf /var/lib/apt/lists/*` in the **same** RUN | Removes the apt index from the layer. |
| `python:3.x-slim-trixie` base | Drops docs/headers/dev cruft vs full `python` (~120 MB vs ~1 GB base). |
| Only the Tesseract langs you ship | Each `tesseract-ocr-XXX` is its own package; avoid `tesseract-ocr-all`. |
| `.dockerignore` | Keep `node_modules`, `.git`, `web/dist` (rebuilt in-image), `__pycache__`, `*.pyc`, fixtures, sample PDFs out of build context. |
| `pip --no-cache-dir` (or `PIP_NO_CACHE_DIR=1`) / `uv` with no cache | No pip/uv wheel cache in the layer. |
| Multi-stage (Node + py-builder → runtime) | Node toolchain and build chain never ship. 70–90% reduction typical. |
| Layer ordering (deps before source) | Faster rebuilds; raises cache hit rate (cache, not size). |
| `PYTHONDONTWRITEBYTECODE=1` | Avoids `.pyc` clutter (minor). |

**`.dockerignore` starter:**
```
.git
**/node_modules
web/dist
**/__pycache__
**/*.pyc
*.md
research/
tests/
*.pdf
.env*
Dockerfile
docker-compose*.yml
```

### Distroless tradeoff
Google **distroless** (e.g. `gcr.io/distroless/python3-debian12`) yields a smaller, shell-less, package-manager-less runtime with reduced attack surface. **For pdf-forge it's a poor fit:** ocrmypdf shells out to `tesseract`, `gs`, `unpaper`, `qpdf`, `pngquant`, `pdftoppm`. Distroless has **no apt and no shell**, so you'd hand-copy every binary plus its shared-library closure — fragile and high-maintenance for a multi-binary OCR pipeline. **Recommendation: stay on `-slim`; distroless is not worth it here.** Harden at the compose layer instead (§6).

---

## 5. Non-root runtime, WORKDIR, jobs volume, static serving

- **Non-root user:** create a fixed-UID system user (`useradd --system --uid 10001 … pdfforge`) and `USER pdfforge`, with `--shell /usr/sbin/nologin`. A fixed UID makes host-volume permissions predictable.
- **WORKDIR:** `/app`. App code and `/app/static` (the copied Vite `dist/`) live here, read-only at runtime.
- **Writable jobs/temp dir:** OCR/compression jobs need scratch space (uploaded PDF, intermediate rasters, Ghostscript temp, output). Put it at `/app/jobs`, `chown` it to the runtime user, and back it with a **named volume or tmpfs** (§6). Point `TMPDIR` (and thus ocrmypdf/Ghostscript temp) at `/app/jobs/tmp`. This is what lets the rest of the rootfs be read-only.
- **Serving the SPA from FastAPI:**
  - **Recommended (FastAPI ≥ 0.138.0, shipped 2026-06-20):** `app.frontend("/", directory="static", fallback="index.html")`. This is purpose-built for SPA build output. Verified semantics:
    - **Signature:** `app.frontend(path, directory, fallback="auto", check_dir=True)`; `router.frontend(...)` also exists for mounting under a router prefix.
    - **Path operations match first** — API routes always win; the frontend is only a fallback after no route matches.
    - **Missing static assets (JS/CSS/images) correctly 404**, while **unmatched navigation GET/HEAD paths fall back to `index.html`** so the client-side router handles them. Fallback applies **only to GET/HEAD** that look like browser navigation; `POST`/`PUT` to unmatched paths 404.
    - `fallback` options: `"auto"` (serves `404.html` if present, else `index.html`, else plain 404), `"index.html"` (always SPA shell), `"404.html"` (custom 404 *with* 404 status), `None` (disable). For a typical SPA use `"index.html"` (or `"auto"`).
    - `check_dir=True` validates the directory exists at startup — keep it on; it surfaces a missing `dist/` copy early.
  - **Portable fallback (older FastAPI):** mount hashed assets first, then a catch-all that returns `index.html`:
    ```python
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
    # ... ALL /api/* routers registered BEFORE the catch-all ...
    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        return FileResponse("static/index.html")
    ```
    Pitfall: a naive catch-all returns `index.html` (HTTP 200 HTML) for a mistyped asset name instead of a real 404. Mount real asset dirs first, or use `StaticFiles(html=True)`, or just use `app.frontend()`.
  - **Keep the API under a prefix** (`/api/...`) so SPA fallback and API routing never collide. Reserve `/api/health` for the healthcheck.

---

## 6. HEALTHCHECK & docker-compose defaults

### HEALTHCHECK
- Expose a cheap **`GET /api/health`** that returns `200` and does **no heavy work** (don't run OCR or touch disk). Optionally a separate `/api/ready` that shallow-checks tool availability (`gs --version`, `tesseract --version`) at startup only.
- Directive (Dockerfile). Use a **Python one-liner** so you don't need `curl` in the slim image:
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"
  ```
  Sane defaults: `interval=30s`, `timeout=5–10s`, `retries=3`, and an explicit `start-period` (Docker default is 0s) to cover boot. `curl --fail` is an option but adds an apt package.

### docker-compose skeleton (hardened)

```yaml
services:
  pdfforge:
    image: pdfforge:latest
    restart: unless-stopped
    # No published port if the reverse proxy shares the Docker network;
    # otherwise bind to LAN/loopback only, e.g. "127.0.0.1:8000:8000".
    environment:
      - PDFFORGE_MAX_UPLOAD_MB=200
      - TMPDIR=/app/jobs/tmp
      - OMP_THREAD_LIMIT=1          # stop Tesseract over-threading per job
    read_only: true                  # rootfs read-only; scratch is writable below
    tmpfs:
      - /tmp:size=64m,mode=1777      # small, for libs that hardcode /tmp
    volumes:
      - jobs:/app/jobs               # named volume (survives restart, disk-backed)
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
        limits:
          cpus: "2.0"
          memory: 2g
        reservations:
          memory: 512m

volumes:
  jobs:
```

Compose hardening notes:
- **`read_only: true` + writable scratch.** Combine a read-only rootfs with a writable `/app/jobs` (named volume) and a small `tmpfs` for `/tmp`. **Gotcha:** tmpfs defaults to root ownership/`1777`; under a non-root `user:` you may be unable to write to a `0700`/root tmpfs. Either rely on the **chown'd named volume** for real scratch (the image chowns `/app/jobs`; a fresh named volume inherits that ownership on first creation) or set tmpfs `uid`/`mode` explicitly.
- **jobs: named volume vs tmpfs.** tmpfs = RAM-backed, fast, wiped on stop, and **counts against the container memory limit** — a big OCR raster can OOM-kill the container; size it explicitly and raise `memory` if you use it. Named volume = survives restarts, doesn't eat RAM, better for large PDFs. **Recommendation:** named volume for `/app/jobs`; `tmpfs` only for small `/tmp`.
- **Resource limits.** Ghostscript and Tesseract are CPU/memory-hungry per job; cap `cpus`/`memory` so one big OCR can't starve the homelab host. Set a `reservation` for scheduler headroom. Cap app-level job concurrency to ~1–2.
- **restart policy:** `unless-stopped` (or `on-failure`) so the container self-heals but respects manual stops.
- **Reverse proxy + body size (cross-ref Security track).** Uploads can be large. The proxy must allow big request bodies: **nginx `client_max_body_size`** (default **1 MB** — will 413; bump it), **Traefik** has no hard body cap by default (add a `buffering` middleware if you want one), **Caddy** streams by default. Mirror the limit in FastAPI/uvicorn and `PDFFORGE_MAX_UPLOAD_MB`. Terminate TLS at the proxy; keep pdf-forge plain-HTTP on the internal Docker network, LAN-only.

> Note: `deploy.resources.limits` is honored by `docker compose` (v2) in non-Swarm mode on recent Docker. If you ever run an older standalone compose, the non-`deploy` equivalents are `cpus:`/`mem_limit:`/`pids_limit:` at the service top level.

---

## 7. Recommendations (decision-ready)

1. **Three-stage Dockerfile:** `node:22-slim` (build Vite) → `python:3.13-slim-trixie` builder (venv via pip or `uv sync --frozen`) → `python:3.13-slim-trixie` runtime. Copy only `dist/` and the venv forward.
2. **Use Debian slim (trixie), not Alpine, not distroless.** OCR/PDF stack relies on glibc manylinux wheels (pikepdf) and many shelled-out binaries; slim is the pragmatic, low-risk choice.
3. **apt runtime set:** `ghostscript tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu qpdf poppler-utils unpaper pngquant fonts-noto-core` with `--no-install-recommends` and `rm -rf /var/lib/apt/lists/*`. Add only the language packs you expose; compile `jbig2enc` from source only if you need best-in-class mono compression.
4. **Don't apt-install anything for pikepdf/pypdf** — pikepdf wheels bundle libqpdf; pypdf is pure Python. Install apt `qpdf` only if you call the CLI.
5. **Keep `ghostscript`** even though ocrmypdf can now rasterize via `pypdfium2` — your compression presets and PDF/A path use Ghostscript directly.
6. **Serve the SPA in-process** with `app.frontend("/", directory="static", fallback="index.html")` on FastAPI ≥ 0.138.0 (with API under `/api/*`); fall back to `StaticFiles` + catch-all only on older FastAPI. No nginx sidecar.
7. **Run non-root (fixed UID 10001), read-only rootfs, writable named volume for `/app/jobs`, small tmpfs `/tmp`.** Point `TMPDIR` at `/app/jobs/tmp`.
8. **HEALTHCHECK** hitting a trivial `/api/health` via a Python one-liner (no curl dependency); `interval=30s timeout=5s retries=3 start-period=20s`.
9. **Compose:** `restart: unless-stopped`, `cap_drop: ALL`, `no-new-privileges`, `pids_limit`, `deploy.resources.limits` (~2 CPU / 2 GB), named jobs volume; document the reverse-proxy **max body size** bump (cross-ref Security).
10. **Pin everything:** base image digests, a Python lockfile (or `uv.lock`), `package-lock.json` + `npm ci`. Expect a **~600 MB–1 GB** on-disk image and don't fight it — it's the cost of OCR.

---

## 8. Gotchas / pitfalls

- **`client_max_body_size` 413:** nginx defaults to 1 MB request bodies — real PDFs fail until you raise it. The single most common self-host break for this kind of app.
- **`jbig2enc` is not in apt.** To get it, compile from source in a builder stage (`autogen/configure/make` from `agl/jbig2enc`) and copy the binary + lib into runtime; otherwise mono-image compression is weaker. Decoder `jbig2dec` *is* in apt.
- **Tesseract over-threading:** Tesseract spawns many threads by default; under a CPU limit this thrashes. Set `OMP_THREAD_LIMIT=1` and control parallelism at the job-queue level.
- **Missing fonts → bad OCR/PDF-A output:** Ghostscript PDF-A and CJK OCR need font packages (`fonts-noto-core`, `fonts-noto-cjk`). Omitting them yields tofu/garbled output, **not an error**.
- **tmpfs + non-root permission denied:** read-only rootfs is great, but a root-owned/`0700` tmpfs can block a non-root process from writing; a `1777` tmpfs is world-writable. Prefer a chown'd **named volume** for real scratch; set tmpfs `uid`/`mode` only for small `/tmp`.
- **tmpfs jobs dir eats the memory limit:** RAM-backed scratch counts toward `memory`; a big OCR raster can OOM-kill the container. Size tmpfs explicitly or use a disk-backed named volume (recommended).
- **Catch-all SPA route masking 404s:** a hand-rolled `/{full_path:path}` → `index.html` returns HTML+200 for mistyped asset URLs. Use `app.frontend()` (gets this right), or mount real asset dirs first / `StaticFiles(html=True)`, and register all `/api/*` routes *before* any catch-all.
- **Alpine temptation:** musllinux wheels exist for pikepdf, so Alpine looks viable, but you inherit musl/locale/font edge cases across Tesseract/Ghostscript/poppler for marginal size gains. Not worth it.
- **No `curl` in slim:** healthchecks written as `curl --fail …` silently fail (command not found → unhealthy) unless you `apt-get install curl`. Use the Python urllib one-liner.
- **Named volume ownership:** a named volume over `/app/jobs` inherits that dir's ownership *only on first creation when empty*; if you change the runtime UID later, fix ownership or jobs writes fail.
- **Stale base codename:** pinning `…-bookworm` keeps you on Debian 12 after trixie became default — fine, but prefer `trixie` for current security updates.
- **`check_dir=True` on `app.frontend()`:** if your build forgets to COPY `dist/` into the image, startup fails fast — that's good, but the container won't start until the static dir exists.

---

## 9. Changes vs. session 1

- **CORRECTED — base image codename:** session 1 hard-recommended `python:3.13-slim-bookworm`. As of mid-2026 the official Python images **default to Debian 13 "trixie"**; recommend **`python:3.13-slim-trixie`** (bookworm still works but is now previous-stable). Added `python:3.14-slim-trixie` as a valid option.
- **CORRECTED/CLARIFIED — OCRmyPDF dependency model:** session 1 stated Ghostscript and Tesseract are both flatly "required." Current docs show **only Tesseract is unconditionally required**; rasterization can use **`pypdfium2` (now preferred) OR Ghostscript ≥ 9.54**, and text rendering now relies on **Python packages `fpdf2` and `uharfbuzz`** plus `pypdfium2`. We still recommend installing Ghostscript — but for pdf-forge's **own** compression/PDF-A features, not because ocrmypdf strictly demands it.
- **UPDATED — official OCRmyPDF Dockerfile base:** session 1 said "Ubuntu base"; the current Dockerfile is specifically **`ubuntu:26.04`**, runs as **uid/gid 1000**, `WORKDIR /data`, jbig2enc compiled from commit `c0141bf`, Python deps via **`uv sync --frozen`**. Verbatim runtime apt list confirmed.
- **CONFIRMED — `app.frontend()` is real, not a hallucination:** verified it shipped in **FastAPI 0.138.0 (2026-06-20)**, built on the 0.137.0 router-tree refactor. Added the **verified full signature** `app.frontend(path, directory, fallback="auto", check_dir=True)`, the existence of `router.frontend()`, the GET/HEAD-only navigation-fallback rule, and exact `fallback` option semantics. Cited the **official FastAPI tutorial** (`/tutorial/frontend/`) rather than only the third-party blog session 1 used.
- **CONFIRMED — pikepdf wheels:** manylinux2014 + musllinux, x86_64 + aarch64, **Python 3.10–3.14**, bundling libqpdf/libjpeg/zlib, needs pip ≥ 20. Added: **PyPy3 wheels dropped after pikepdf 9.8.1**.
- **CONFIRMED — Python floor:** OCRmyPDF now requires **Python 3.11+ (3.12+ recommended)**; session 1 didn't state the OCRmyPDF Python floor explicitly.
- **CONFIRMED unchanged:** slim-over-Alpine and not-distroless reasoning; non-root fixed-UID + read-only rootfs + named jobs volume; Python-urllib HEALTHCHECK over curl; nginx `client_max_body_size` 1 MB pitfall; `OMP_THREAD_LIMIT=1`; tmpfs-counts-against-memory and tmpfs-permission gotchas; ~600 MB–1 GB size range (clarified this is **on-disk/uncompressed**).
- **ADDED — minor:** `tmpfs` size/mode example for `/tmp`; note on `deploy.resources` vs legacy `mem_limit`/`cpus`; `check_dir` startup behavior; base-image digest pinning; expanded `.dockerignore`.

---

## 10. Sources (fetched)

- OCRmyPDF — Installation / dependencies (Tesseract ≥ 4.1.1; Ghostscript ≥ 9.54 **or** pypdfium2; fpdf2/uharfbuzz; unpaper 6.1; pngquant ≥ 2.5; jbig2enc ≥ 0.29; Python 3.11+): https://ocrmypdf.readthedocs.io/en/latest/installation.html
- OCRmyPDF — official Dockerfile (ubuntu:26.04 base, exact apt list, Noto fonts, jbig2enc compiled from source, `uv sync --frozen`, non-root uid 1000): https://raw.githubusercontent.com/ocrmypdf/OCRmyPDF/main/.docker/Dockerfile
- pikepdf — Installation (manylinux2014 + musllinux wheels for Py 3.10–3.14 bundling libqpdf/libjpeg/zlib; pip ≥ 20; PyPy dropped after 9.8.1; Alpine caveats): https://pikepdf.readthedocs.io/en/latest/installation.html
- FastAPI — **official** Frontend tutorial (`app.frontend()` signature, fallback semantics, GET/HEAD navigation rule, `router.frontend()`): https://fastapi.tiangolo.com/tutorial/frontend/
- FastAPI — Static Files tutorial (StaticFiles, `html=True`): https://fastapi.tiangolo.com/tutorial/static-files/
- FastAPI 0.138.0 `app.frontend()` explainer (shipped 2026-06-20, built on 0.137.0 router refactor): https://umesh-malik.com/blog/fastapi-spa-app-frontend-explained
- Python official Docker image / Debian trixie default & slim tradeoffs: https://hub.docker.com/_/python
- "The best Docker base image for your Python application" (slim-trixie recommendation, size numbers): https://pythonspeed.com/articles/base-image-python-docker-images/
- Docker resource constraints (cpus/memory limits & reservations): https://docs.docker.com/engine/containers/resource_constraints/
- Docker multi-stage builds & size reduction context: https://nickjanetakis.com/blog/shrink-your-docker-images-by-50-percent-with-multi-stage-builds
- OCRmyPDF Docker image docs (image scope / language packs): https://ocrmypdf.readthedocs.io/en/latest/docker.html
