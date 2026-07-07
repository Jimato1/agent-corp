# syntax=docker/dockerfile:1
#
# cmdb — the policy brain (inventory + policy decision point). CRITICAL-INFRA.
# Single hardened image (3 stages):
#   A) frontend build (Vite/React SPA → /app/static)
#   B) Python deps into a venv
#   C) slim runtime (non-root UID 10001) — git IS installed: the policy store is a
#      CANONICAL git-backed markdown repo (ARCH §10), so `git` is a runtime dependency.
#
# Internal port 8080 (DEPLOYMENT §2). No host ports — reached only via the proxy over the
# `edge` network (NEVER `creds`: CMDB holds no credentials).
#
# NOTE: pin every base by @sha256:<digest> in production. Tags here for a buildable ref.

###############################################
# Stage A — frontend build (Vite/React SPA)   #
###############################################
FROM node:22-slim AS frontend
WORKDIR /src
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build            # -> /src/dist

###############################################
# Stage B — Python deps into a venv           #
###############################################
FROM python:3.12-slim AS pybuild
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

###############################################
# Stage C — slim runtime                      #
###############################################
FROM python:3.12-slim AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PATH="/venv/bin:$PATH" \
    HOME=/app \
    CMDB_STATIC_DIR=/app/static \
    CMDB_DB_PATH=/app/data/cmdb.sqlite3 \
    CMDB_POLICY_REPO_PATH=/app/policy \
    CMDB_VERDICT_KEY_PATH=/app/data/verdict_ed25519.key

# git is a RUNTIME dependency: the canonical policy store is a git repo (commit/push/verify).
RUN apt-get update && apt-get install -y --no-install-recommends git tzdata ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY --from=pybuild  /venv        /venv
COPY --from=frontend /src/dist    /app/static
COPY backend/app                  /app/app

RUN useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin cmdbsvc \
    && mkdir -p /app/data /app/policy \
    && chown -R cmdbsvc:cmdbsvc /app/data /app/policy
USER 10001
WORKDIR /app

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/healthz').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
