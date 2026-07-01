# auth — the identity gateway (Critical-infra). PLAN §11 / Stage-4 integration.
#
# python:3.12-slim runs the stdlib Core API (auth.server). The security-critical
# core logic is pure-stdlib, so the image needs NO third-party package to BOOT and
# serve /api/verify + the PDP + jwks/introspect/revoke + the MCP + admin surfaces.
#
# The ONLY third-party dependency is 'cryptography' (requirements.txt), needed to
# activate the PRODUCTION asymmetric signers (EdDSA/ES256, AUTH_SIGNER_ALG=EdDSA).
# In the sandbox the default HS256 test-signer runs with zero external deps; in
# production you build with requirements.txt and set AUTH_SIGNER_ALG=EdDSA.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    AUTH_PORT=8089 \
    AUTH_SIGNER_ALG=EdDSA \
    AUTH_UI_DIR=/app/ui/build

WORKDIR /app

# Install prod deps first (layer cache). requirements.txt pins 'cryptography' for
# the asymmetric signer; if you are only running the stdlib test-signer you may
# skip this, but Critical-infra prod MUST ship the asymmetric primitive.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# App source + static operator UI.
COPY src /app/src
COPY ui/build /app/ui/build

# Non-root (Critical-infra: never run the identity plane as root).
RUN useradd --system --uid 10001 authsvc && chown -R authsvc /app
USER authsvc

ENV PYTHONPATH=/app/src
EXPOSE 8089

# Liveness: the Core API answers /healthz with no external dependency.
HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
    CMD python -c "import urllib.request,os,sys; \
sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:'+os.environ.get('AUTH_PORT','8089')+'/healthz').status==200 else 1)"

CMD ["python", "-m", "auth.server"]
