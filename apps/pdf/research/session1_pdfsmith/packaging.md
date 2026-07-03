# PDFsmith — Packaging Track Research

**Scope:** Minimal, production-sane Docker packaging for PDFsmith: a single container where FastAPI serves the built React/Vite static assets *and* runs the server-side PDF engines (pikepdf, pypdf, ocrmypdf/Tesseract, Ghostscript, poppler-utils). LAN-only, self-hosted homelab, behind a reverse proxy.

This is a **research-only** document: recommendations, Dockerfile/compose skeletons, exact package names, and gotchas. No application code.

---

## 1. Recommended container shape (TL;DR)

- **One image, three build stages:** (A) Node stage builds the Vite frontend → `dist/`; (B) Python "builder" stage resolves Python deps into a venv; (C) slim Debian runtime stage installs the native PDF tooling, copies the venv + `dist/`, runs as non-root.
- **Base:** `python:3.13-slim-bookworm` (glibc). **Do not use Alpine** — see §3.
- **Frontend is static:** FastAPI serves `dist/` directly. No nginx sidecar.
- **Expected final image size:** roughly **600 MB – 1.0 GB**. The floor is set by Tesseract + Ghostscript + each language pack (each `tesseract-ocr-XXX` is ~2–15 MB of trained data, plus fonts for OCR/PDA output). A minimal eng-only build lands near ~600–700 MB; add CJK fonts/langs and you approach 1 GB. This is normal for an OCR-capable image — the official `ocrmypdf` image is in the same range.

---

## 2. Multi-stage Dockerfile strategy

### Rationale
- **Build-time deps dwarf run-time deps and carry most CVEs.** Node toolchain (~hundreds of MB of `node_modules`) and Python build chain (gcc, headers) must **not** ship in the final image. Multi-stage keeps them in throwaway stages. Multi-stage routinely cuts image size 70–90% versus single-stage.
- **Frontend and backend have totally different toolchains** (Node vs CPython). Separate stages let each use its natural base image and cache independently.
- **Layer ordering for cache:** copy dependency manifests (`package.json`/`package-lock.json`, `pyproject.toml`/`requirements.txt`/`uv.lock`) and install **before** copying source, so editing app code doesn't bust the dependency layer.

### Skeleton

```dockerfile
# syntax=docker/dockerfile:1

############################
# Stage A — frontend build #
############################
FROM node:22-slim AS frontend
WORKDIR /app/web
# 1) deps first (cache-friendly)
COPY web/package.json web/package-lock.json ./
RUN npm ci
# 2) then source, then build
COPY web/ ./
RUN npm run build          # -> /app/web/dist

##################################
# Stage B — Python deps (builder) #
##################################
FROM python:3.13-slim-bookworm AS pybuild
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
WORKDIR /app
# A build chain is only needed if some dep lacks a wheel; pikepdf/pypdf/ocrmypdf
# all ship wheels on manylinux glibc (see §3), so this can often be omitted.
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

#########################
# Stage C — runtime img #
#########################
FROM python:3.13-slim-bookworm AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PATH="/venv/bin:$PATH"

# Native PDF tooling (see §3 for the full package list / rationale)
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
COPY --from=pybuild /venv /venv
COPY --from=frontend /app/web/dist /app/static
COPY backend/ /app/

# Non-root + writable jobs dir (see §5)
RUN useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin pdfsmith \
    && mkdir -p /app/jobs && chown -R pdfsmith:pdfsmith /app/jobs
USER pdfsmith
WORKDIR /app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Notes:
- **`uv` is a strong alternative** to `pip`/`venv` in the builder stage — much faster resolves, and `uv sync` from a lockfile is reproducible. The official OCRmyPDF image uses `uv sync`. Either is fine; pin a lockfile for reproducibility.
- Keep one `apt-get update && install && rm -rf /var/lib/apt/lists/*` in a **single RUN layer** so the package cache never persists in an image layer.

---

## 3. Native/system dependencies (Debian/Ubuntu slim)

### Exact apt package names (Debian bookworm / Ubuntu)

| Purpose | apt package | Notes |
|---|---|---|
| PDF render / PDF-A / compression | `ghostscript` | ocrmypdf needs **≥ 9.54**; bookworm ships 10.x. Drives your Ghostscript compression presets. |
| OCR engine | `tesseract-ocr` | ocrmypdf needs Tesseract **≥ 4.1.1**; bookworm ships 5.x. English data is pulled in by the engine package, but install langs explicitly. |
| OCR language data | `tesseract-ocr-eng`, `tesseract-ocr-deu`, … | One package per language. Install **only** what you offer in the UI — each is ~2–15 MB. |
| qpdf CLI + lib | `qpdf` | Optional if you only use pikepdf bindings (pikepdf bundles libqpdf in its wheel). Install it if you want the `qpdf` command-line for linearization/encryption fallbacks. |
| poppler tools | `poppler-utils` | Gives `pdftoppm`, `pdfinfo`, `pdftocairo`, `pdfimages`, `pdftotext` — handy for server-side previews/metadata even though the browser uses pdf.js. |
| OCR deskew/clean | `unpaper` | Enables ocrmypdf `--clean` / `--clean-final`. Optional but small. |
| PNG optimization | `pngquant` | Enables ocrmypdf's lossy PNG palette reduction (needs ≥ 2.5). Optional. |
| OCR/PDF-A fonts | `fonts-noto-core` (+ `fonts-noto-cjk` if CJK) | Ghostscript/PDF-A output and CJK OCR need fonts present. The official image installs Noto fonts. |
| jbig2 **decode** | `jbig2dec` | Decoder; usually pulled in transitively. |
| jbig2 **encode** | *(no apt package on Debian)* | `jbig2enc` (lossless mono compression) is **not packaged** — must be compiled from source in a builder stage (the official image does `autogen/configure/make` from the `agl/jbig2enc` repo) or skipped. Skipping just disables the best mono compression. |

> The official OCRmyPDF Dockerfile (Ubuntu base) installs: `ghostscript fonts-droid-fallback fonts-noto-core fonts-noto-cjk jbig2dec pngquant tesseract-ocr tesseract-ocr-{eng,deu,fra,por,spa,chi-sim} unpaper`, plus a self-compiled `jbig2enc`. It relies on pikepdf's bundled libqpdf rather than apt `qpdf`, and does not install `poppler-utils`. PDFsmith should add `qpdf` and `poppler-utils` if those CLIs are used directly.

### Which Python libs pull native deps

- **pikepdf** — C++ extension over **libqpdf**. Ships **manylinux2014 + musllinux** wheels (x86_64 + ARM64) for Python 3.10–3.14 that **bundle libqpdf, libjpeg, and zlib**. So on a glibc slim image you get pikepdf with **no apt packages required** for the binding itself, as long as pip ≥ 20 is used. Source builds are only needed on old distros without a C++20 compiler.
- **pypdf** — **pure Python**, no native deps. (Optional accel via `cryptography`, which itself has manylinux wheels.)
- **ocrmypdf** — pip-installable, but it **orchestrates external binaries** that pip cannot provide: Tesseract and Ghostscript are **required**; unpaper, pngquant, jbig2enc are **optional**. These come from apt, not pip. This is the main reason the runtime stage needs the apt list above.

### slim vs Alpine — recommend **slim (Debian)**

- pikepdf does publish musllinux wheels, so Alpine *can* work, **but**: Alpine is the documented exception case for the broader manylinux ecosystem, and you still need musl-built Tesseract/Ghostscript/poppler from Alpine's repos. You trade a couple hundred MB for a higher chance of subtle musl/locale/font breakage in OCR and PDF rendering.
- glibc + `python:3.x-slim-bookworm` gives you first-class wheels (pikepdf manylinux), Debian's well-maintained `ghostscript`/`tesseract-ocr`/`poppler-utils` packages, and predictable behavior. **For a PDF/OCR workload the size savings of Alpine are not worth the compatibility risk — use slim.**

---

## 4. Image-size reduction checklist

| Technique | Effect |
|---|---|
| `--no-install-recommends` on every `apt-get install` | Skips suggested extras (docs, optional langs, X libs); large savings on a Tesseract/Ghostscript image. |
| `rm -rf /var/lib/apt/lists/*` in the **same** RUN | Removes the apt index from the layer (use `apt-get clean` too). |
| `python:3.x-slim-bookworm` base | Drops docs/headers/dev cruft vs full `python`. |
| Only the Tesseract langs you ship | Each `tesseract-ocr-XXX` is its own package; don't install `tesseract-ocr-all`. |
| `.dockerignore` | Keep `node_modules`, `.git`, `web/dist` (rebuilt in-image), `__pycache__`, `*.pyc`, test fixtures, sample PDFs out of build context. |
| `pip --no-cache-dir` (or `PIP_NO_CACHE_DIR=1`) | No pip wheel cache in the layer. |
| Multi-stage (Node + py-builder → runtime) | Node toolchain and build chain never ship. 70–90% reduction is typical. |
| Layer ordering (deps before source) | Faster rebuilds; not size, but cache hit rate. |

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
```

### Distroless tradeoff
Google **distroless** (e.g. `gcr.io/distroless/python3-debian12`) yields a smaller, shell-less, package-manager-less runtime with a reduced attack surface. **For PDFsmith it's a poor fit:** ocrmypdf shells out to `tesseract`, `gs`, `unpaper`, `qpdf`, `pngquant`, `pdftoppm`. Distroless has **no apt and no shell**, so you'd have to hand-copy every binary plus its shared-library closure into the image — fragile and high-maintenance for a multi-binary OCR pipeline. **Recommendation: stay on `-slim`; distroless is not worth it here.** (slim already drops most of the attack surface; harden at the compose layer instead — §6.)

---

## 5. Non-root runtime, WORKDIR, jobs volume, static serving

- **Non-root user:** create a fixed-UID system user (e.g. `useradd --system --uid 10001 … pdfsmith`) and `USER pdfsmith`. A fixed UID makes host-volume permissions predictable. Use `--shell /usr/sbin/nologin`.
- **WORKDIR:** `/app`. App code and `/app/static` (the copied Vite `dist/`) live here read-only.
- **Writable jobs/temp dir:** OCR/compression jobs need scratch space (uploaded PDF, intermediate rasters, Ghostscript temp, output). Put it at e.g. `/app/jobs` (or `/tmp/pdfsmith`), `chown` it to the runtime user, and back it with a **named volume or tmpfs** (§6). Point `ocrmypdf`/Ghostscript temp at it (e.g. `TMPDIR=/app/jobs/tmp`). This is also what lets the rest of the rootfs be read-only.
- **Serving the SPA from FastAPI:**
  - **Modern path (FastAPI ≥ 0.138.0, June 2026):** `app.frontend("/", directory="static")`. This is purpose-built for SPA build output: **path operations match first**, the frontend is only a fallback, **missing static assets correctly 404** while **unmatched navigation paths fall back to `index.html`** so the client-side router handles them. Use `fallback="index.html"` (or default `"auto"`).
  - **Portable path (any recent FastAPI):** mount hashed assets, then a catch-all that returns `index.html`:
    ```python
    app.mount("/assets", StaticFiles(directory="static/assets"), name="assets")
    # ... all /api/* routers registered BEFORE the catch-all ...
    @app.get("/{full_path:path}")
    async def spa(full_path: str):
        return FileResponse("static/index.html")
    ```
    Gotcha with the manual approach: a naive catch-all returns `index.html` (HTTP 200 HTML) for a mistyped asset name instead of a real 404. Mount real asset dirs first, or use `StaticFiles(html=True)`, or prefer `app.frontend()`.
  - **Keep the API under a prefix** (`/api/...`) so SPA fallback and API routing never collide. Reserve `/api/health` for the healthcheck.

---

## 6. HEALTHCHECK & docker-compose defaults

### HEALTHCHECK
- Expose a cheap **`GET /api/health`** that returns `200` and does **no heavy work** (don't run OCR or touch disk in it). Optionally a separate `/api/ready` that shallow-checks tool availability (`gs --version`, `tesseract --version`) at startup only.
- Directive (in Dockerfile). Prefer a Python one-liner so you don't need `curl` in the slim image:
  ```dockerfile
  HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"
  ```
  Sane defaults: `interval=30s`, `timeout=5–10s`, `retries=3`, and a `start-period` to cover app boot (Docker's default start-period is 0s, so set it explicitly). Adding `curl --fail` is an option but means another apt package; the Python approach reuses what's already there.

### docker-compose skeleton (hardened)

```yaml
services:
  pdfsmith:
    image: pdfsmith:latest
    restart: unless-stopped
    # No published port if the reverse proxy is on the same Docker network;
    # otherwise bind to LAN only, e.g. "127.0.0.1:8000:8000".
    environment:
      - PDFSMITH_MAX_UPLOAD_MB=200
      - TMPDIR=/app/jobs/tmp
      - OMP_THREAD_LIMIT=1        # keep Tesseract from over-threading per job
    # Writable scratch only; rest of FS read-only
    read_only: true
    tmpfs:
      - /tmp
    volumes:
      - jobs:/app/jobs           # named volume (survives restart) OR use tmpfs for RAM-only
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
- **`read_only: true` + writable scratch:** Combine a read-only rootfs with a writable `/app/jobs` (named volume) and a `tmpfs` for `/tmp`. **Gotcha:** tmpfs mounts default to root ownership/`1777`; with a non-root `user:` you may be unable to write. Either ensure the jobs **named volume** is chown'd (the image already chowns `/app/jobs`; named volumes inherit the image dir's ownership on first creation) or set tmpfs `mode`/`uid`. Avoid world-writable `1777`; prefer `0700`/`0750`.
- **jobs: tmpfs vs named volume.** tmpfs = RAM-backed, fast, wiped on stop, and **counts against the container memory limit** (size it, e.g. `tmpfs: { /app/jobs: { size: 1g } }`, and raise `mem_limit` accordingly or the OOM killer fires). Named volume = survives restarts, doesn't eat RAM, better for large PDFs. **Recommendation:** named volume for `/app/jobs` (large rasters during OCR can be big), `tmpfs` only for small `/tmp`.
- **Resource limits.** Ghostscript and Tesseract are CPU- and memory-hungry per job; cap `cpus`/`memory` so one big OCR can't starve the homelab host. Set a memory `reservation` so the scheduler keeps headroom. Consider app-level job concurrency = 1–2.
- **restart policy:** `unless-stopped` (or `on-failure`) so the container self-heals but respects manual stops.
- **Reverse proxy + body size (cross-ref Security track).** PDFsmith uploads can be large. The reverse proxy must allow big request bodies: **nginx `client_max_body_size`** (default 1 MB — far too small, will 413), **Traefik** has no hard body cap by default but you may add a `buffering` middleware, **Caddy** streams by default. Mirror the limit in FastAPI/uvicorn and in `PDFSMITH_MAX_UPLOAD_MB`. Terminate TLS at the proxy; keep PDFsmith plain-HTTP on the internal Docker network, LAN-only. (Full auth/TLS/header hardening belongs to the Security track.)

---

## 7. Recommendations (decision-ready)

1. **Three-stage Dockerfile:** `node:22-slim` (build Vite) → `python:3.13-slim-bookworm` builder (venv via pip or `uv`) → `python:3.13-slim-bookworm` runtime. Copy only `dist/` and the venv forward.
2. **Use Debian slim, not Alpine, and not distroless.** OCR/PDF stack relies on glibc manylinux wheels (pikepdf) and many shelled-out binaries; slim is the pragmatic, low-risk choice.
3. **apt runtime set:** `ghostscript tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu qpdf poppler-utils unpaper pngquant fonts-noto-core` with `--no-install-recommends` and `rm -rf /var/lib/apt/lists/*`. Add only the language packs you actually expose; compile `jbig2enc` from source only if you need best-in-class mono compression.
4. **Don't apt-install anything for pikepdf/pypdf** — pikepdf wheels bundle libqpdf; pypdf is pure Python. (Install apt `qpdf` only if you call the CLI.)
5. **Serve the SPA in-process:** prefer `app.frontend("/", directory="static")` on FastAPI ≥ 0.138.0; otherwise the `StaticFiles` + catch-all pattern with API under `/api/*`. No nginx sidecar.
6. **Run non-root (fixed UID 10001), read-only rootfs, writable named volume for `/app/jobs`, tmpfs `/tmp`.** Point `TMPDIR` at the jobs volume.
7. **HEALTHCHECK** hitting a trivial `/api/health` via a Python one-liner (no curl dependency); `interval=30s timeout=5s retries=3 start-period=20s`.
8. **Compose:** `restart: unless-stopped`, `cap_drop: ALL`, `no-new-privileges`, `pids_limit`, `deploy.resources.limits` (e.g. 2 CPU / 2 GB), named jobs volume; document the reverse-proxy **max body size** bump (cross-ref Security).
9. **Pin everything:** base image digests, a Python lockfile, `package-lock.json` + `npm ci`. Expect a **~600 MB–1 GB** final image and don't fight it — it's the cost of OCR.

---

## 8. Gotchas / pitfalls

- **`client_max_body_size` 413:** nginx defaults to 1 MB request bodies — uploads of real PDFs will fail until you raise it. The single most common self-host break for this kind of app.
- **`jbig2enc` is not in apt.** If you want it you must compile from source in a builder stage (autogen/configure/make from `agl/jbig2enc`) and copy the binary + lib into runtime; otherwise mono-image compression is weaker. Decoder `jbig2dec` *is* in apt.
- **Tesseract over-threading:** by default Tesseract spawns many threads; under a CPU limit this thrashes. Set `OMP_THREAD_LIMIT=1` and control parallelism at the job-queue level.
- **Missing fonts → bad OCR/PDF-A output:** Ghostscript PDF-A conversion and CJK OCR need font packages (`fonts-noto-core`, `fonts-noto-cjk`). Omitting them yields tofu/garbled output, not an error.
- **tmpfs + non-root user permission denied:** read-only rootfs is great, but a root-owned `1777` tmpfs can block a non-root process from writing, or worse be world-writable. Prefer a chown'd named volume for jobs; set `uid`/`mode` if you must use tmpfs.
- **tmpfs jobs dir eats the memory limit:** RAM-backed scratch counts toward `mem_limit`; a big OCR raster can OOM-kill the container. Size tmpfs explicitly or use a disk-backed named volume.
- **Catch-all SPA route masking 404s:** a hand-rolled `/{full_path:path}` → `index.html` returns HTML+200 for mistyped asset URLs. Mount real asset dirs first (or use `app.frontend()` / `StaticFiles(html=True)`), and register all `/api/*` routes *before* the catch-all.
- **Alpine temptation:** musllinux wheels exist for pikepdf, so Alpine looks viable, but you inherit musl/locale/font edge cases across Tesseract/Ghostscript/poppler for marginal size gains. Not worth it.
- **No `curl` in slim:** healthchecks written as `curl --fail ...` silently never run (command not found → unhealthy) unless you `apt-get install curl`. Use the Python urllib one-liner instead.
- **Named volume ownership:** a named volume created over `/app/jobs` inherits that dir's ownership *only on first creation when empty*; if you change the runtime UID later, fix ownership or jobs writes fail.

---

## 9. Sources (fetched)

- OCRmyPDF — Installation (required/optional deps, Tesseract ≥ 4.1.1, Ghostscript ≥ 9.54, pngquant/unpaper/jbig2enc roles): https://ocrmypdf.readthedocs.io/en/latest/installation.html
- OCRmyPDF — official Dockerfile (exact apt package list, Noto fonts, jbig2enc compiled from source, `uv sync`): https://github.com/ocrmypdf/OCRmyPDF/blob/main/.docker/Dockerfile
- pikepdf — Installation (manylinux2014 + musllinux wheels bundling libqpdf/libjpeg/zlib; pip ≥ 20; Alpine notes): https://pikepdf.readthedocs.io/en/latest/installation.html
- pikepdf — PyPI: https://pypi.org/project/pikepdf/
- FastAPI — Static Files tutorial: https://fastapi.tiangolo.com/tutorial/static-files/
- FastAPI `app.frontend()` (0.138.0) SPA serving, 404-asset vs index.html fallback semantics: https://umesh-malik.com/blog/fastapi-spa-app-frontend-explained
- FastAPI + Vite single-container discussion: https://github.com/fastapi/fastapi/discussions/5134
- Docker multi-stage builds & slim image size reduction (70–90%): https://labs.iximiuz.com/tutorials/docker-multi-stage-builds
- Multi-stage size reduction (Node ~1.2GB→~150MB; Python ~1GB→~180MB): https://nickjanetakis.com/blog/shrink-your-docker-images-by-50-percent-with-multi-stage-builds
- Docker resource constraints (cpus/memory limits & reservations): https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose tmpfs configuration (RAM-backed, counts toward mem limit): https://oneuptime.com/blog/post/2026-02-08-how-to-use-docker-compose-tmpfs-configuration/view
- tmpfs + non-root user permission gotcha (mode 0700/0750, not 1777): https://www.tutorialpedia.org/blog/docker-compose-mounting-a-tmpfs-usable-by-non-root-user/
- Docker Compose capabilities & security_opt hardening: https://lours.me/posts/compose-tip-029-container-capabilities/
- FastAPI Docker healthcheck patterns (interval/timeout/retries/start-period): https://betterstack.com/community/guides/scaling-python/fastapi-docker-best-practices/
