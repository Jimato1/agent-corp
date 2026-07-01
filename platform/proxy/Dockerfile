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
# [STAGE-5 SUPPLY-CHAIN — CONFIRM-BEFORE-STAGE-6] Both modules are currently pulled at their LATEST
# master commit → non-reproducible builds and unaudited edge code. This is the trust-boundary binary.
# Before Stage 6, PIN each to a reviewed ref after building+running verify.sh against it, e.g.:
#     --with github.com/caddy-dns/cloudflare@vX.Y.Z
#     --with github.com/mholt/caddy-ratelimit@<reviewed-commit-sha>   # (module has a v0.1.0 tag; verify
#                                                                     #  compat with Caddy 2.11.2 first)
# Also watch caddy-ratelimit issue #94 (spurious first-request 429 on Caddy 2.11.x); the test harness
# warms up per zone to tolerate it — confirm the pinned build's behavior. Not pinned here because it
# cannot be built/verified in the doc sandbox and a blind version bump would re-do the verified Stage-4 build.
FROM caddy:${CADDY_VERSION}-builder AS build
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare \
    --with github.com/mholt/caddy-ratelimit

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
