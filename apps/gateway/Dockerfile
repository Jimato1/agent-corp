# syntax=docker/dockerfile:1
#
# gateway — the hands (the ONLY component that executes on real hosts). CRITICAL-INFRA.
# Single hardened image (3 stages):
#   A) frontend build (Vite/React SPA → /app/static)
#   B) Python deps into a venv (incl. ansible-runner + ansible-core >= 2.19, psycopg3)
#   C) slim runtime (non-root UID 10001) — git + podman/bubblewrap installed:
#      - ansible-runner drives playbook-only execution with process_isolation=True (D-14);
#      - podman spawns the tier-0 sandbox containers (D-7).
#
# Internal port 8080 (DEPLOYMENT §2). No host ports — reached via the proxy over `edge`,
# joins `creds` (the Vault redeem mTLS hop) + `data_gateway` (its PRIVATE Postgres, D-8).
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
    GATEWAY_STATIC_DIR=/app/static \
    GATEWAY_PLAYBOOK_PROJECT_DIR=/app/playbooks \
    GATEWAY_SIGNING_KEY_FILE=/app/data/audit_ed25519.key

# git: the optional audit git-mirror + playbook provenance. podman/bubblewrap: the sandbox
# harness + ansible process_isolation. openssh-client: the SSH-CA cert-based host access.
RUN apt-get update && apt-get install -y --no-install-recommends \
    git tzdata ca-certificates openssh-client podman \
    && rm -rf /var/lib/apt/lists/*

COPY --from=pybuild  /venv          /venv
COPY --from=frontend /src/dist      /app/static
COPY backend/app                    /app/app
COPY playbooks                      /app/playbooks

RUN useradd --system --uid 10001 --home /app --shell /usr/sbin/nologin gatewaysvc \
    && mkdir -p /app/data \
    && chown -R gatewaysvc:gatewaysvc /app/data
USER 10001
WORKDIR /app

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/healthz').status==200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
