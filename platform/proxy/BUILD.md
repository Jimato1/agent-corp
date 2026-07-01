# Stage 4 — Build: `proxy` (dual-mode edge, Standard, pure plumbing)

Implements `planning/PLAN.md`, consuming `platform/auth/planning/PLAN.md` **§8** verbatim.
The proxy has **no MCP surface and no UI** (nothing to build there). The Build artifact is the
custom Caddy image + one mode-agnostic Caddyfile + the two-mode issuer toggle + compose wiring +
a verification harness with a minimal auth stub.

## What was built

| File | Role |
|---|---|
| `Dockerfile` | custom xcaddy image, `caddy-dns/cloudflare` (public) + `mholt/caddy-ratelimit`; internal CA is core Caddy (no module). Base `caddy:2.11.2` (CVE-pinned; see gate 11). |
| `conf/Caddyfile` | the ONE mode-agnostic config: shared snippets (`sec_headers`, `scrub`, `ratelimit`, `authgate`, `app`), the wildcard site with all 10 subdomains + `@auth` exemption + 404 default, loopback health. |
| `conf/issuer.internal.caddy` | INTERNAL issuer (`tls internal`) — the ONLY mode-specific config. |
| `conf/issuer.public.caddy` | PUBLIC issuer (`tls { dns cloudflare … }`). |
| `docker-compose.yml` | `proxy` + `auth` (stub) + `board` (echo upstream) on the `edge` network; mode via `--env-file`. |
| `.env.internal` / `.env.public` | the two modes. Differ only in `TLS_ISSUER_FILE` (+ unused ACME/DNS vars). |
| `stub/auth_verify_stub.py` | minimal `/api/verify` implementing the §8.5 table + §8.7 headers — a test double, NOT auth. |
| `stub/echo_upstream.py` | echoes received headers → proves the upstream trust boundary. |
| `test/verify.sh` | edge + forward-auth checks (decision table, scrub, fail-closed, internal-CA chain). |
| `test/regression_headers.sh` | the **A§8.9** injection battery — the Stage-7 gate this component owns. |

## The dual-mode toggle (Option C) — one config, issuer-only difference

Mode is selected by **one env var**, `TLS_ISSUER_FILE`, which the Caddyfile `import`s inside the
wildcard site. Both issuer partials are baked into the image. **Everything else — routing (§4),
header scrub, forward-auth, security headers, rate limiting — is the same bytes in both modes**,
so a bug can only ever live in the 1-line issuer partial, never in a mode-forked routing/auth path.

```
docker compose --env-file .env.internal up -d --build   # INTERNAL (primary)
docker compose --env-file .env.public   up -d --build    # PUBLIC   (secondary)
```

**INTERNAL is primary and fully self-contained:** `tls internal` uses Caddy's built-in CA — no
public DNS, no ACME, no Let's Encrypt, no external call of any kind. The internal resolver /
split-horizon answers the suite names on the LAN; the harness fakes that with `curl --resolve`.

**PUBLIC** swaps only the issuer to a Let's Encrypt DNS-01 wildcard (Cloudflare assumed, E1); no
private-root distribution needed. Use LE **staging** first (see `issuer.public.caddy`).

## Passkey-origin decision (resolved — auth Build depends on this)

**Decision: ONE canonical operator-console origin — `https://auth.<SUITE_DOMAIN>` (port 443) —
used for passkey enrollment in BOTH modes. `SUITE_DOMAIN` is held IDENTICAL across modes; only the
certificate *issuer/trust-root* differs.**

Rationale: a WebAuthn credential is bound to its **origin** = scheme + host + port. The CA that
signed the TLS cert is **not** part of the origin. So if the hostname is the same in both modes
(and both are `https`:443), the origin is byte-identical and **a passkey enrolled once works in both
modes** — internal-CA today, public-LE later, or vice-versa, with no re-enrollment. This is why
`.env.internal` and `.env.public` carry the **same** `SUITE_DOMAIN`.

Requirement this places on the operator: use a **single hostname** across modes (a real domain you
own is cleanest, resolved internally via split-horizon in internal mode and also publicly for the
DNS-01 challenge in public mode). Do **not** use a different host per mode (e.g. `*.corp.internal`
for one and `*.corp.example.com` for the other) — that would make the origins differ and force
**per-origin enrollment** (operator enrolls a passkey separately per mode). If the operator insists
on per-mode hostnames, that per-origin-enrollment implication is the accepted cost; state it up front.

Sequencing (A§8.2): **stand up TLS on `auth.<SUITE_DOMAIN>` and install trust FIRST, then enroll the
passkey.** WebAuthn requires a secure context, so in internal mode the operator device must trust the
internal root (below) *before* enrollment.

## Internal-root distribution (INTERNAL mode) — exactly how

Caddy's internal CA writes its root/intermediate into the `caddy_data` volume on first boot:
```
/data/caddy/pki/authorities/local/root.crt          # distribute THIS
/data/caddy/pki/authorities/local/intermediate.crt
```
Export it:
```
docker compose --env-file .env.internal exec -T proxy \
  cat /data/caddy/pki/authorities/local/root.crt > corp-root.crt
```

Distribute to the three trust populations:
1. **Operator devices/browsers** — import `corp-root.crt` into the OS/browser trust store
   (macOS Keychain "System" + Always Trust; Windows `certutil -addstore -f Root corp-root.crt`;
   Linux `/usr/local/share/ca-certificates/ + update-ca-certificates`; Firefox has its own store).
   Required **before** passkey enrollment (secure-context).
2. **App containers** (each RS the proxy fronts) — mount the root read-only and point the runtime's
   trust at it, e.g. a shared `caddy_data` (or a dedicated `corp_root` volume) + per-image one of:
   `SSL_CERT_FILE=/etc/ssl/corp-root.crt` (OpenSSL/Go), `NODE_EXTRA_CA_CERTS=…` (Node),
   `REQUESTS_CA_BUNDLE=…`/`SSL_CERT_FILE` (Python), or bake it in with `update-ca-certificates`.
3. **Agent containers** — same as (2): agents calling suite HTTPS endpoints need the root, else TLS
   verification fails. This is the cost internal mode trades for zero public dependency (PLAN §6).

Rotation: `tls internal` roots are long-lived; on rotation re-export and re-distribute. (This
per-container trust burden is exactly what PUBLIC mode removes — publicly-trusted certs need no
distribution.)

## VERIFY-AT-BUILD gates (PLAN §12) — resolution

| Gate | Status | How |
|---|---|---|
| #1 dial-failure denies (never passthrough) | **RESOLVED (harness)** | `verify.sh` step 10 stops `auth` → asserts non-200 + upstream not reached. `forward_auth`/`reverse_proxy` dial error → non-2xx → route stops. |
| #2 **hung** verify denies within bound | **RESOLVED (config + harness)** | `authgate` `transport http { dial_timeout 2s; response_header_timeout 250ms }`; `verify.sh` step 11 runs the stub with `STUB_DELAY_MS=5000` → asserts deny in <3s. |
| #3 `Authorization` + `Cookie` forwarded to verify | **RESOLVED (harness)** | stub echoes `X-Stub-Saw-Authorization/Cookie`; `verify.sh` step 8c asserts present. (`reverse_proxy` forwards them by default; GET is side-effect-free.) |
| #4 exactly-200 = allow (204/206 deny) | **RESOLVED (config + harness)** | desugared `forward_auth` with `@ok status 200` (not `2xx`); `verify.sh` step 7 sends a 204-forcing token → asserts upstream NOT reached. |
| #5 underscore/case aliases stripped | **RESOLVED (config + regression test)** | `scrub` enumerates dash **and** underscore twins; case handled by Caddy canonicalization; `regression_headers.sh` injects `X_Auth_Identity`, `REMOTE-USER`, etc. |
| #6 prefix-family coverage | **RESOLVED (accept-with-reason + gate)** | Caddy `request_header` has no prefix-wildcard delete, so scrub is an explicit enumeration and `regression_headers.sh` is the contract-sync gate (fails if auth §8.7 grows past the list). Documented in `conf/Caddyfile` (b). |
| #7 headers wrap short-circuit responses | **RESOLVED (config + harness)** | `sec_headers` is outermost in the `route{}`; `verify.sh` step 2c asserts HSTS+nosniff on the 401. |
| #8 rate-limit keys on direct peer | **RESOLVED (config)** | no `trusted_proxies`; `rate_limit` zone `key {remote_host}`. (Numeric size tuned in Stage 5.) |
| #9 `traceparent` authoritative-gen ownership | **DEFERRED → joint** | proxy strips the client `traceparent` (done, in `scrub`); authoritative minting bound to `sub` is auth-side — confirm against real auth at Stage 7. |
| #10 mTLS-bound vs DPoP | **DEFERRED → joint** | proxy forwards `Authorization`+`DPoP` untouched (DPoP path needs no proxy work); the mTLS cert-thumbprint-forward branch is wired only if auth §10 ships cert-bound tokens. Proxy→auth mTLS also deferred (needs auth certs; stub uses plain HTTP internally). |
| #11 base tag past CVE-2026-52845 | **CONFIRM-OPERATOR** | pinned `caddy:2.11.2`; cannot check the current registry offline. Operator confirms the chosen tag carries the CVE-2026-52845 fix before Security. Bump `ARG CADDY_VERSION` if newer. |

## What I verified, and what I could NOT

**Environment limitation (stated plainly):** this build sandbox has **no Docker, no Caddy, no Go**,
so I could not build the image or run the container here. I did **not** fake a passing run.

- **Statically verified:** config structure and directive ordering against Caddy v2.11 semantics;
  the desugared-`forward_auth` success-matcher pinning to exactly 200; the mode toggle isolates to
  one imported line; scrub covers dash+underscore variants; compose service names resolve
  (`auth`, `board`) to the Caddyfile targets.
- **Executable proof shipped, not run:** `test/verify.sh` + `test/regression_headers.sh` + the auth
  stub. Running `docker compose --env-file .env.internal up -d --build && bash test/verify.sh
  internal && bash test/regression_headers.sh internal` on a Docker host executes every §12 gate
  above marked "(harness)". **This must be run on a Docker host (operator/CI) to close those gates.**

## Build-review pass (adversarial, web-verified Caddy semantics) — folded

An independent 3-lens review (Caddy-semantics, contract-fidelity, harness-validity) ran against the
built files, web-verifying each Caddy behavior I could not execute. The **contract-fidelity lens found
nothing** (the forward-auth config matches auth §8), and the Caddy-semantics lens **confirmed** the
desugared `forward_auth` (continue-on-200 / copy-back-on-non-200), the `route{}` ordering, `import
{$VAR}`, `tls internal` on the wildcard, `{args[0]}`, the health site, and the `rate_limit` syntax.
Four real defects were caught and folded:

| # | Sev | Defect | Fix |
|---|---|---|---|
| **P4-01** | HIGH | Unquoted `email {$ACME_EMAIL}` expands to a bare `email` (zero args) in INTERNAL mode (empty var) → adapt error → **primary mode fails to boot**. | `conf/Caddyfile`: quoted `email "{$ACME_EMAIL}"` (valid empty token). |
| **P4-02** | HIGH | The @auth scrub proof (the only runtime proof of scrub-before-verify) always FAILED on a correct proxy: the stub's 401/302 branches omitted the `X-Stub-Saw-*` echo, and the harness hit them uncredentialed. | `stub/auth_verify_stub.py`: 401/302 now echo; harness sends `Bearer valid-agent` on the @auth verify curls (also makes 8c a real Authorization-forwarding proof). |
| **P4-03** | LOW | Hung-verify timing (11b) used GNU-only `date +%s%3N` with a `\|\| echo 0` fallback → could pass vacuously on macOS/BSD. | `test/verify.sh`: time via `curl -w '%{time_total}'` + `awk` float compare. |
| **P4-04** | LOW | `verify.sh` banner overclaimed runtime coverage of gate #8 (rate-limit). | banner corrected — #8 is config-resolved; Stage 5 adds the burst test. |

## Observability addendum (security-neutral; proxy stays "no UI")

Added so a future **Mission Control** read-only "Edge" panel can consume edge data **without changing
the proxy**. The proxy emits; it does not render, and it gains **no login/authenticated surface**.

- **Structured JSON access log → stdout** (`log { format filter … }`): per-request ts, host→app,
  status, latency, direct-peer IP, `edge_req_id`, `scrub_stripped` (forged inbound identity seen), and
  `authz:"allow"` on forward-auth allow. **Authorization / Cookie / X-Auth-Identity deleted** — no
  secrets, no token contents, no identity-header values.
- **Native Prometheus metrics** (`servers { metrics }` + a `metrics` handler): request rate, status
  distribution, per-app upstream health, verify-endpoint latency — on an **internal listener only**.
- **`/edge-info`**: `{mode, suite_domain}` (INTERNAL vs PUBLIC).
- **Trust-boundary enforcement:** all three live on `http://:9100`, which is **NOT published** in
  compose (no `ports:` entry) → reachable only on the internal `edge` network, **never** the public
  :443 site and never behind/bypassing the auth gate; plus a `remote_ip private_ranges` guard. The
  human sees the data only via MC, whose own subdomain is auth-gated. Verified by `verify.sh` 13–15
  (metrics internal-yes / public-no; edge-info mode; log is JSON without the token).
- **Consumer contract** (what MC reads, field shapes, the forward-auth-decision mapping, the cert-expiry
  gap) is documented in `docs/OBSERVABILITY.md` — **documented, not built here.**
- **Syntax web-verified (two independent passes against current Caddy v2.11 docs)** since the sandbox
  can't run Caddy. All directives confirmed correct **except 3, now fixed:** (a) `metrics` moved from
  `servers{}` to the **top-level** global (nested form is deprecated/rejected → adapt error); (b)
  `@forged_identity header X-Auth-Identity` → `… *` (field-only header matcher is a parse error that
  would take the whole config down); (c) `/edge-info` `respond` leading `{` escaped to `\{` (else Caddy's
  placeholder replacer eats it → empty body). Remaining worst case = an empty log field; a wrong global
  fails boot loudly (`caddy validate`, verify.sh step 0) — **never a silent exposure**; public surface unchanged.

## Deferred to the Stage-7 joint checkpoint (need the REAL auth)

The stub emulates the §8.5/§8.7 **contract**, which proves the proxy's branching — but the real
`auth` must confirm it emits per contract. Joint items:
1. Real `/api/verify` returns 200/302/401/403 per §8.5 and signs a real `X-Auth-Identity` (§8.7);
   re-run `regression_headers.sh` against real auth.
2. `traceparent` authoritative minting bound to `sub` (gate #9).
3. `DPoP` vs mTLS-bound-token decision (auth §10) and proxy→auth mTLS provisioning (gate #10).
4. Kill-switch 403 posture + break-glass verify mode (A§8.8) exercised against real auth.
5. Passkey enrollment against `auth.<SUITE_DOMAIN>` (auth-side; origin decision above).

## Before Security (Stage 5) — please confirm

- **E1/E2** (only if/when PUBLIC mode is used): public domain + Cloudflare token; internal resolver
  for split-horizon. INTERNAL primary needs neither.
- **Gate #11**: the pinned Caddy tag carries the CVE-2026-52845 fix.
- **Passkey hostname policy**: single canonical `SUITE_DOMAIN` across modes (recommended) vs
  per-mode hostnames (implies per-origin enrollment).
- Rate-limit **numeric** sizes and the tighter `auth`-path zone are intentionally left for Stage 5.
