# syntax=docker/dockerfile:1
#
# pdf-forge — single hardened image (4 stages, STRUCTURE §3).
#   A) frontend build (Vite/React SPA)
#   B) jbig2enc from source (mono-scan compression; not in Debian apt)
#   C) Python deps into a venv
#   D) slim runtime (trixie, non-root UID 10001, qpdf apt DROPPED — pikepdf bundles libqpdf)
#
# NOTE: pin every base by @sha256:<digest> in production (OQ#10 — monthly rebuild +
# Renovate digest bumps). Tags are used here for a buildable reference.

###############################################
# Stage A — frontend build (Vite/React SPA)   #
###############################################
FROM node:22-slim AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build            # -> /src/dist

###############################################
# Stage B — jbig2enc from source              #
###############################################
FROM python:3.13-slim-trixie AS jbig2
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential autoconf automake libtool pkg-config \
        zlib1g-dev libleptonica-dev libffi-dev git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY docker/jbig2enc.sh /tmp/
RUN sh /tmp/jbig2enc.sh      # -> /usr/local/bin/jbig2 (+ lib)

###############################################
# Stage C — Python deps into a venv           #
###############################################
FROM python:3.13-slim-trixie AS pybuild
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

###############################################
# Stage D — slim runtime                      #
###############################################
FROM python:3.13-slim-trixie AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PATH="/venv/bin:$PATH" \
    OMP_THREAD_LIMIT=1 \
    TMPDIR=/app/jobs/tmp \
    PDFFORGE_STATIC_DIR=/app/static \
    PDFFORGE_JOBS_DIR=/app/jobs

# Native PDF tooling — single layer, index removed. qpdf DROPPED (D8).
# Runtime libs only — no -dev packages. The leptonica RUNTIME shared lib that the
# jbig2 binary links is already pulled in by tesseract-ocr (STRUCTURE §3).
RUN apt-get update && apt-get install -y --no-install-recommends \
        ghostscript \
        tesseract-ocr tesseract-ocr-eng tesseract-ocr-deu \
        poppler-utils \
        unpaper \
        pngquant \
        fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

COPY --from=pybuild  /venv                /venv
COPY --from=jbig2    /usr/local/bin/jbig2 /usr/local/bin/jbig2
COPY --from=frontend /src/dist            /app/static
COPY backend/app                          /app/app

RUN useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin pdfforge \
    && mkdir -p /app/jobs/tmp \
    && chown -R pdfforge:pdfforge /app/jobs
USER 10001
WORKDIR /app

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/api/health').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
