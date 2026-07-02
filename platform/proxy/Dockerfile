# syntax=docker/dockerfile:1
# ─────────────────────────────────────────────────────────────────────────────
# proxy — custom Caddy image (Stage 4 Build). ONE image, BOTH TLS modes.
#
#   • INTERNAL mode (primary): Caddy's built-in local CA — NO extra module needed,
#     ZERO dependency on any public service. Fully self-contained.
#   • PUBLIC mode  (secondary): public Let's Encrypt wildcard via DNS-01 — needs the
#     caddy-dns/cloudflare module (built in below).
#   • Edge rate limiting (both modes): mholt/caddy-ratelimit (not in stock Caddy).
#
# The two modes differ ONLY in which issuer partial the Caddyfile imports
# (TLS_ISSUER_FILE env). Routing / scrub / forward-auth / headers are byte-identical.
# Base pinned past the 2026 forward-auth CVE cluster (PLAN §7.8/§9, A§8.9).
# ─────────────────────────────────────────────────────────────────────────────
ARG CADDY_VERSION=2.11.2

# ---- build stage: xcaddy with the two modules PUBLIC mode + rate limiting need ----
# [STAGE-6 SUPPLY-CHAIN] Modules PINNED for reproducible builds (was: latest master → non-deterministic).
# Refs verified live against the GitHub API 2026-07-01 (see optimization/NOTES.md):
#   - caddy-dns/cloudflare @ v0.2.4        — latest release; go.mod floor caddy v2.7.5, builds on 2.11.2.
#   - caddy-ratelimit      @ 5625512…      — the module has ONLY a stale v0.1.0 tag (Caddy-2.8-era), so we
#       pin the current master COMMIT (2026-06-12, "re-register Prometheus collectors on each config
#       reload" — a real fix for our reload/metrics-under-load behavior). Commit pin = reproducible + current.
# `xcaddy build v2.11.2` also pins the Caddy CORE version (belt-and-suspenders with the builder image).
# CANNOT-VERIFY-HERE (no Docker): the OPERATOR must rebuild and re-run the harness to confirm the pinned
# build (see NOTES.md "Image/build"). Also watch caddy-ratelimit issue #94 (spurious first-request 429 on
# 2.11.x) — the test harness warms up per zone to tolerate it.
# For fuller reproducibility, ALSO pin the base images by digest (operator step — cannot fetch offline):
#   docker buildx imagetools inspect caddy:${CADDY_VERSION}          # → FROM caddy:2.11.2@sha256:<digest>
#   docker buildx imagetools inspect caddy:${CADDY_VERSION}-builder  # → FROM ...-builder@sha256:<digest>
FROM caddy:${CADDY_VERSION}-builder AS build
RUN xcaddy build v${CADDY_VERSION} \
    --with github.com/caddy-dns/cloudflare@v0.2.4 \
    --with github.com/mholt/caddy-ratelimit@5625512f24f6f59d6f64fb3aafe5eecff0b286db

# ---- runtime stage ----
FROM caddy:${CADDY_VERSION}

# Custom binary (DNS-01 + rate limit). Internal CA is core Caddy, no module.
COPY --from=build /usr/bin/caddy /usr/bin/caddy

# Config: the single mode-agnostic Caddyfile + BOTH issuer partials baked in.
# Mode is selected at runtime by the TLS_ISSUER_FILE env var (see docker-compose).
COPY conf/Caddyfile              /etc/caddy/Caddyfile
COPY conf/issuer.internal.caddy  /etc/caddy/issuer.internal.caddy
COPY conf/issuer.public.caddy    /etc/caddy/issuer.public.caddy

# /data (certs + internal-CA root/intermediate + ACME account) and /config are
# persisted via named volumes (compose). /data is the ONLY stateful path; it is a
# rebuildable cache, not canonical state.
VOLUME /data
VOLUME /config

# 443 (TLS) + 80 (ACME/redirect). :9100 = internal health/metrics/edge-info (not published).
EXPOSE 443 80

# Config parse is enforced at container start (an invalid Caddyfile fails to boot).
# test/verify.sh step 0 additionally runs `caddy validate` with the selected mode's env.
