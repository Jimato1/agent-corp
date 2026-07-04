# library — the Reference Library (Standard risk class). Stage-4 build.
#
# python:3.12-slim runs the stdlib Core service (library.server). The security-critical
# core (admission gate, RS token logic, corpus single-writer, chunker, hybrid fusion,
# portable vector backend) is pure-stdlib and needs NO third-party package to BOOT and
# serve /api + /mcp + the static UI. The only prod dep is 'cryptography' (asymmetric
# JWKS verification); sqlite-vec is an OPTIONAL vector accelerator (see requirements.txt).
#
# MULTI-STAGE (mirrors auth): `runtime` is the lean non-root PRODUCTION image (no
# pytest). `test` builds FROM runtime, adds requirements-dev + the tests, so the suite
# runs in-image. `docker build` with no --target yields `runtime`; `--target test` the
# test image. git is installed because the corpus is a git repo (audit trail, §1.1).
FROM python:3.12-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    LIBRARY_PORT=8080 \
    LIBRARY_DATA_DIR=/data \
    LIBRARY_UI_DIR=/app/ui/build \
    LIBRARY_AUDIENCE=library \
    LIBRARY_AUTH_BASE=http://auth:8089 \
    LIBRARY_AUTO_ADMIT_ENABLED=0 \
    PYTHONPATH=/app/src

WORKDIR /app

# git: the corpus is a git-backed canonical store (ARCHITECTURE §10 / PLAN §1.1).
RUN apt-get update && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

# prod deps (layer cache): cryptography for the asymmetric verifier.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# app source + static operator UI
COPY src /app/src
COPY ui/build /app/ui/build

# state volume (corpus git repo + index.db + ops.db)
RUN mkdir -p /data

# non-root
RUN useradd --system --uid 10004 libsvc && chown -R libsvc /app /data
USER libsvc

EXPOSE 8080
# migrate (init corpus/index/ops) is run as a one-shot by compose before the server.
CMD ["python", "-m", "library.server"]

# ── test image ────────────────────────────────────────────────────────────────
FROM runtime AS test
USER root
COPY requirements-dev.txt /app/requirements-dev.txt
RUN pip install --no-cache-dir -r /app/requirements-dev.txt
USER libsvc
CMD ["python", "-m", "unittest", "discover", "-s", "/app/src/library/tests", "-v"]
