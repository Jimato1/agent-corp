# syntax=docker/dockerfile:1
#
# mission-control (mc) — the operator cockpit BFF. Single hardened image (3 stages),
# matching the house pattern (apps/chat):
#   A) frontend build (Vite/React SPA, single-global-React Helm vendoring → /app/static)
#   B) Python deps into a venv
#   C) slim runtime (non-root UID 10001)
#
# Standard risk class. Internal port 8080 (DEPLOYMENT §2: mc == 8080). No host ports —
# reached only via the proxy over the `edge` network, so forward-auth headers can't be forged.
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
RUN npm run build            # -> /src/dist (includes the vendored /helm bundle + tokens)

###############################################
# Stage B — Python deps into a venv           #
###############################################
FROM python:3.13-slim AS pybuild
ENV PIP_NO_CACHE_DIR=1 PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m venv /venv
ENV PATH="/venv/bin:$PATH"
WORKDIR /app
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

###############################################
# Stage C — slim runtime                      #
###############################################
FROM python:3.13-slim AS runtime
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 \
    PATH="/venv/bin:$PATH" \
    MC_STATIC_DIR=/app/static \
    MC_DB_PATH=/app/data/mc.sqlite3 \
    MC_BACKUP_DIR=/app/data/backups

COPY --from=pybuild  /venv        /venv
COPY --from=frontend /src/dist    /app/static
COPY backend/app                  /app/app

RUN useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin mcsvc \
    && mkdir -p /app/data/backups \
    && chown -R mcsvc:mcsvc /app/data
USER 10001
WORKDIR /app

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/healthz').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
