# agent-runtime — the workforce (Critical-infra). DEPLOYMENT.md §2: internal port
# 8080, joins `edge` only (never `creds`), publishes NO host ports (proxy does).
FROM python:3.12-slim AS base

WORKDIR /app

# Core runtime deps (the pure-logic + web surface). The heavy INTEGRATION deps —
# the Board MCP client, tpm2-pkcs11/python-pkcs11 for TPM custody, and the Sigstore
# model-signing / huggingface-hub provenance verifiers — are installed only where
# the real hardware/services exist (the `integration` extra). See CHECKLIST.md.
COPY pyproject.toml ./
RUN pip install --no-cache-dir pyyaml "fastapi>=0.110" "uvicorn>=0.29" "httpx>=0.27"

COPY src/ ./src/
COPY web/ ./web/
COPY config/ ./config/
COPY evals/ ./evals/

ENV PYTHONPATH=/app/src \
    AR_PORT=8080 \
    AR_CONFIG_DIR=/app/config \
    AR_DB_PATH=/app/data/agent-runtime.sqlite

# For TPM custody in production, mount the resource-manager node:
#   docker run --device /dev/tpmrm0 ... and set AR_PKCS11_MODULE=<tpm2-pkcs11 .so>
# (A sandbox exercises the software path with SoftHSM2; see CHECKLIST.md.)

EXPOSE 8080
VOLUME ["/app/data"]

# Fail-closed by construction: the M3 boot reconcile runs at FastAPI startup; the
# pre-claim gate stays shut until auth's kill epoch is polled.
CMD ["python", "-m", "agent_runtime"]
