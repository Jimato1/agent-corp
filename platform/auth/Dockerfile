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
#
# MULTI-STAGE (D-AUTH-1): the `runtime` stage is the lean, non-root PRODUCTION image
# (no pytest, no tests baked in). The `test` stage builds FROM runtime, switches to
# root, installs requirements-dev.txt (pytest), and COPYs the integration tests in,
# so CV-B/CV-C/CV-D run in-image with real Postgres/Redis DNS. `docker build` with no
# --target yields `runtime` (prod default); `--target test` yields the test image.
FROM python:3.12-slim AS runtime

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

# ─────────────────────────────────────────────────────────────────────────────
# test stage (D-AUTH-1) — NOT the production image. Adds the test runner + the
# integration tests so CV-B/CV-C/CV-D run in-container with real service DNS.
# Build:  docker build --target test -t agent-corp/auth:test .
# (the auth compose `auth-test` profile service builds this target for you).
# ─────────────────────────────────────────────────────────────────────────────
FROM runtime AS test
# root ONLY in the test image (prod stays non-root above). pip runs at build time.
USER root
COPY requirements-dev.txt /app/requirements-dev.txt
RUN pip install --no-cache-dir -r /app/requirements-dev.txt
# The integration tests live outside src/ (unit tests under src/auth/tests already ship
# in `runtime` via `COPY src`). Bring the integration suite in so pytest can find it.
COPY tests /app/tests
# Default to the integration suite; callers override the args (see compose `auth-test`).
CMD ["python", "-m", "pytest", "tests/integration", "-v"]
