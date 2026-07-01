# Stage 1 Research — Reverse Proxy (`proxy`)

**Identity:** The edge reverse proxy that fronts the agent-corp suite — subdomain routing to each app container plus TLS termination. Pure plumbing; holds no product state and no secrets beyond TLS material.
**Risk class:** Standard.
**Surfaces:** **No MCP/agent surface (N/A)** and **no UI (N/A).** The proxy exposes no agent tools and is operated as infrastructure (config file / IaC), not through a human surface. This artifact therefore has no MCP or UI research; those stages remain N/A per the app's CLAUDE.md.

---

## 1. Objective / Scope

Settle every deferred decision for the proxy so later stages can build without re-litigating plumbing:

- Which reverse proxy to standardize on (Caddy vs Traefik) for a Docker-per-app (~11 containers), single-operator homelab stack.
- How per-app subdomain routing to each container is expressed.
- The default automatic-TLS approach for self-hosted/internal-only subdomains.
- The forward-auth integration pattern that puts **every** app behind the separate `auth` component **at the proxy layer**, including the identity-header trust boundary and the browser-user vs token-bearing-agent split.
- Security-relevant defaults to carry into Stage 5 (Security).

Out of scope: the internal design of the `auth` component itself (only its proxy-facing contract matters here) and any per-app product behavior.

> Note on method: this research was produced by a multi-agent fan-out (one finder per question) followed by an adversarial verification pass and synthesis. Every substantive claim below was checked against primary docs as of 2026-06-30; precision caveats from the verification pass are folded into the text and flagged where they hedge or narrow a claim. The §6 security material was researched in a dedicated cited pass against Caddy/Traefik/OWASP/Mozilla primary sources.

---

## 2. Reverse Proxy Choice — Caddy vs Traefik

Both are production-grade single-binary Go proxies that fully satisfy the mandate (subdomain routing + TLS termination + forward-auth delegation), so this is a close call decided by fit to *this* suite, not by capability gaps [14].

| Dimension | Caddy | Traefik |
|---|---|---|
| **Automatic TLS** | Zero-config by default — serves all known hostnames over HTTPS, obtaining/renewing Let's Encrypt + ZeroSSL certs with no TLS config [8]. | Automated but explicit — requires an ACME `certificatesResolvers` block (email + storage) in static config; "defining a certificate resolver does not imply routers use it," so each router must reference it [1]. |
| **Docker service discovery** | **None in stock Caddy.** Uses a static Caddyfile (or dynamic JSON via the Admin API); label discovery requires the third-party `caddy-docker-proxy` plugin, compiled in via xcaddy [4][5]. | **Native.** Watches the Docker socket and reads container labels to build routing live; a correctly-labeled container is routed with no restart/reload [3]. |
| **Config ergonomics** | Single, centralized Caddyfile widely cited as the simplest surface; `snippets` + `import` DRY the repeated TLS+forward_auth block across all subdomains [6][7][14]. | ~5–8 labels per service (enable, router rule/Host, entrypoint, tls.certresolver, service port, middleware ref); noisier across 11 apps, but each app's compose file owns its own routing/auth (decentralized/GitOps) [3]. |
| **Forward-auth** | First-class `forward_auth` directive; on 2xx copies whitelisted identity headers upstream, supports `Field>Rename` [9][11]. | First-class `ForwardAuth` middleware with `authResponseHeaders`/`authResponseHeadersRegex`, `authRequestHeaders`, `addAuthCookiesToResponse` [10]. |
| **Footprint / ops** | No docker.sock mount, no `acme.json` to babysit; certs live in a persistent data dir [8]. | Requires mounting `/var/run/docker.sock` (privilege/attack-surface consideration) and a chmod-600 `acme.json` for label-discovery mode; adds a built-in dashboard [3]. |
| **Maintenance / cadence** | Thorough per-directive core docs; large homelab following. The label-discovery plugin is third-party (a maintenance dependency if that path is taken) [4]. | Fast v3 cadence (v3.7.5, June 2026, with prompt CVE fixes); narrow support policy — only the latest minor gets fixes, so minor bumps must be tracked [12][13]. |

### Recommendation: **Caddy**, with one static, version-controlled Caddyfile

Configure a single Caddyfile that uses a `snippet` + `import` to reuse one shared `tls` + `forward_auth` block across all ~11 app subdomains [6][7]. Reasoning specific to this suite:

1. **The app set is known and fairly fixed**, so Traefik's headline advantage — dynamic label discovery — is largely wasted, while Caddy's static Caddyfile *is* exactly the single reproducible, no-product-state artifact the Stage-7 DoD calls for [4].
2. **Automatic TLS is genuinely zero-config** in Caddy [8].
3. **`forward_auth` is a first-class inline directive** that cleanly delegates every app to the `auth` component and copies identity headers upstream, without separate middleware wiring [9].
4. **Smaller operational surface for a solo operator** — no docker.sock mount, no `acme.json` babysitting, one reviewable file [8].

**Honest framing caveats (from verification):** forward-auth is *not* unique to Caddy — Traefik's native `ForwardAuth` copies identity headers via `authResponseHeaders` just as cleanly; the real distinction is "one inline directive" vs "a named middleware referenced by label" [10]. The docker.sock/`acme.json` advantage only applies against Traefik's *label-discovery* mode — Traefik can also run purely on its file provider without the socket.

**Choose Traefik instead if** any of these become true: the app set starts churning dynamically or you scale to Swarm/Kubernetes; you want each app's compose file to own its routing/auth labels (decentralized/GitOps); or you value the built-in dashboard. **Critical caveat:** if you want Caddy *and* Docker label auto-discovery, that requires the third-party `caddy-docker-proxy` plugin (a custom xcaddy build + external dependency) — in that specific scenario Traefik's first-party discovery is the more robust choice, so pick Traefik rather than bolting discovery onto Caddy [4].

---

## 3. Per-App Subdomain Routing

The suite maps one subdomain per app to that app's container (e.g. `board.<suite>.example.com` → `board:PORT`, `notes.<suite>.example.com` → `notes:PORT`, and so on for mission-control, drive, chat, pdf, gateway, vault, cmdb, and the `auth` platform app).

- **Caddy (recommended):** each app is a site block whose address is the subdomain and whose body is `reverse_proxy <container>:<port>` plus the imported shared TLS+auth snippet. Because the block is keyed by hostname, Caddy also provisions that name's certificate automatically [8][15]. All apps sit on a shared Docker network so the proxy resolves containers by service name. The repeated per-app block collapses to one `import` line, keeping the whole edge in a single reviewable file [6][7].
- **Traefik (alternative):** routing is expressed on each container via labels — `traefik.http.routers.<name>.rule=Host(...)` for the subdomain and `traefik.http.services.<name>.loadbalancer.server.port=<port>` for the upstream; Traefik discovers these live from Docker events [3].

Either way, a **wildcard certificate** (see §4) means adding a new app requires no new certificate request — only a new route entry (a Caddyfile block or a labeled container).

---

## 4. Automatic TLS for Self-Hosted / Homelab

**Recommended default: one DNS-01 wildcard certificate from Let's Encrypt, behind split-horizon DNS.**

**Why DNS-01.** Among the three established ACME challenges, DNS-01 is the only one that can issue **wildcard** certificates and the only one that validates hosts **not reachable from the public internet** — it proves control via a `_acme-challenge` TXT record instead of an inbound HTTP/TLS connection, so no app container ever needs public ingress. HTTP-01 (port 80) and TLS-ALPN-01 (port 443) require inbound reachability and cannot do wildcards, making them poor fits for internal services [16]. (Precision: these are properties of *DNS-based* validation. Let's Encrypt announced **DNS-PERSIST-01** on 2026-02-18 — a second DNS-based challenge using one persistent authorization TXT record — with staging targeted late Q1 and production Q2 2026; treat it as a near-future simplification and build on standard DNS-01 today [21].)

**Concrete default:**

1. Own a real domain hosted at a DNS provider with an API — **Cloudflare** is the most broadly supported by both Caddy's `caddy-dns` modules and Traefik/lego [17][23].
2. Issue **one wildcard** `*.<suite>.example.com` (plus apex if needed) via DNS-01, so no app needs public inbound reachability and issuance stays trivially under the duplicate-cert limit [16][19].
3. Run **split-horizon (split-brain) DNS**: an internal resolver (Pi-hole/Unbound/AdGuard/router) answers `*.<suite>.example.com` with the proxy's LAN IP, while the public zone only ever carries transient `_acme-challenge` TXT records. Result: publicly-trusted TLS on private-only hostnames, with no custom root to distribute [24][16].
4. **Persist the cert store on a mounted volume** — Caddy's `/data` (the official image's data dir; must be writable/persistent) or Traefik's `acme.json` at chmod 600 (Traefik refuses it otherwise). Losing the store forces re-issuance and can hit rate limits [8][1].
5. **Always dry-run against Let's Encrypt staging first**, then flip to production. Staging limits are effectively unbounded and its certs chain to an untrusted "Fake LE" root (browser warnings are expected) [20].

**Rate-limit context:** production limits are 50 certificates per registered domain / 7 days and — most easily tripped by a looping renewal — **5 certificates per exact set of identifiers / 7 days** [19]. Using one wildcard instead of a per-subdomain cert consolidates all apps under a single identifier set. The Feb-2026 shorter-lifetime change (90→64→45-day certs) explicitly left rate limits unchanged and keeps renewals exempt [22].

**Build caveat for Caddy:** DNS provider modules are **not** in the stock Caddy binary/image — you must build a custom image (xcaddy or a prebuilt `caddy-cloudflare` image) that includes `caddy-dns/cloudflare`, plus provide API credentials; then a single `tls { dns cloudflare <token> }` directive enables wildcard issuance [17][18][38]. Traefik supplies DNS providers as config rather than compile-time modules — relevant if wildcard-by-config is a priority. (Note: this custom-build requirement stacks with the §6 rate-limit module requirement — if both DNS-01 wildcards and edge rate limiting are wanted on Caddy, one custom xcaddy image covers both.)

**ACME-free alternative:** for purely-internal names, Caddy's built-in **local CA** signs certs automatically (root/intermediate at `pki/authorities/local`, powered by Smallstep libraries), or run **Smallstep step-ca** as a private ACME server [8]. Tradeoff: every browser, homelab server, and **agent container** must trust the private root, and short-lived internal certs make automated renewal essential. Prefer public wildcard-via-DNS-01 for mixed human/agent clients where trust distribution is a burden; reserve the internal CA for when you will not own a public domain.

---

## 5. Forward-Auth / Auth-Gateway Integration

The proxy is the **single authentication chokepoint** for all ~11 apps. For every request it issues an out-of-band auth subrequest to the `auth` component's verify endpoint; the `auth` component decides allow/deny and returns the caller's identity.

**The mechanism.** Caddy's `forward_auth` (and Traefik's `ForwardAuth`) sends the `auth` service a **GET** subrequest — deliberately GET so the original request body is never consumed — carrying `X-Forwarded-Method/Proto/Host/Uri/For` (never the body). On a **2xx**, access is granted and a whitelisted set of identity headers from the auth response is copied onto the **original** request, which then proceeds upstream. On **any non-2xx**, the auth service's own response is relayed back to the client — typically a login redirect for browsers [9][10]. Caddy's `forward_auth` is documented sugar over `reverse_proxy`: it rewrites the URI to the verify endpoint, forces `method GET`, adds `header_up X-Forwarded-Method/-Uri`, and copies response headers only inside a `@good status 2xx` block; `copy_headers` supports renaming via `Before>After` (e.g. `Remote-User>X-Webauth-User`) [9][15]. Traefik's equivalent knobs are `authResponseHeaders`/`authResponseHeadersRegex` (copy identity headers from the auth response, replacing conflicts), `authRequestHeaders` (whitelist what reaches the auth server), and `addAuthCookiesToResponse` (so the session cookie reaches the browser) [10][25]. This mirrors how Authelia and authentik integrate with both proxies, confirming it as the portable pattern to emulate [11][34][35].

### 5a. The identity-header trust boundary (load-bearing)

Downstream apps must trust identity headers **only when set by the proxy**. Authelia's guidance is explicit: the proxy "must ensure only [the auth service] is setting these headers, and any other headers are never forwarded to the backend and are instead replaced" [26]. The concrete mechanism: `copy_headers` (Caddy) and `authResponseHeaders` (Traefik) **overwrite** conflicting client-supplied headers with the auth-verified values, so a request arriving with a forged `Remote-User` is neutralized [9][10][26]. Enforce this at two layers:

- Proxy config relies on the copy/replace semantics to strip/overwrite any client-supplied `Remote-*` / `X-Forwarded-User` headers before injecting auth-verified ones (see §6.4 for the exact strip/trusted-proxy mechanism).
- Downstream apps additionally restrict trust of these headers to the **proxy's source IP**.

The `auth` component must **document the exact, stable identity-header set** it emits (e.g. `Remote-User`, `Remote-Groups`, `Remote-Name`, `Remote-Email`, plus agent-specific claims like role/scopes/budget) so downstream apps whitelist-trust only those [26][34]. This is the concrete edge mechanism that upholds the repo's segregation-of-duties/identity invariant.

### 5b. Browser users vs token-bearing agents

The same verify endpoint must multiplex two client classes:

- **Browser users** authenticate via the `auth` component's **session cookie** (redirect-based portal/OIDC login). On failure the browser must receive a **302/303 redirect** to the login portal [29][30].
- **MCP/agent clients** present an `Authorization: Bearer` token (JWT) validated directly by the verify endpoint. On failure they must receive a **bare 401**, not an HTML redirect they cannot follow [27][28]. oauth2-proxy is the reference for the token path: `skip_jwt_bearer_tokens` validates a bearer JWT directly instead of requiring a cookie, and `extra_jwt_issuers` (`<issuer>=<audience>`) validates signature/audience via the issuer's JWKS [31][32]. Set the CORS-preflight skip so credential-less `OPTIONS` requests aren't blocked [33].

**Verification-derived precision — do not spec this as "token vs browser":** the 302-vs-401 decision is driven by **request shape**, not token presence. Authelia/oauth2-proxy key off `Accept: text/html` (browser navigation) vs `X-Requested-With: XMLHttpRequest` / `Accept: application/json` (XHR/API), communicated via the `X-Forwarded-*` headers — a request can carry a bearer token and still be an XHR [30][36]. Spec the custom verify endpoint to inspect `Accept`/`X-Requested-With`. Also note oauth2-proxy does **not** emit a bare 401 for a bad bearer token out of the box (it defaults to a 302, or 403 with `bearer-token-login-fallback=false`) — a bare 401 is the *desired custom* behavior, not the reference tool's default [36]. Finally, `forwardBody` is off by default in Traefik and "breaks streaming" if enabled; Caddy's GET-based verify avoids body forwarding entirely — relevant for streaming apps like chat/pdf [10].

**Target contract for the `auth` component's verify endpoint:** accept a session cookie **OR** an `Authorization: Bearer`/JWT; on success return **200** plus the fixed identity-header set; return **302/303 → portal** for browser navigations and **401** for XHR/token clients; validate agent JWTs via JWKS with a defined audience [27][28][31].

---

## 6. Security-Relevant Edge Defaults (for Stage 5)

The edge is the right place to enforce a uniform security baseline for every app (define once in a shared snippet/middleware, apply to all sites). Each mechanism below gives the specific Caddy directive and Traefik middleware plus a recommended default; all are cited against Caddy/Traefik/OWASP/Mozilla primary sources.

### 6.1 Security response headers

Recommended values (OWASP HTTP Headers Cheat Sheet) [50]:

- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` [50]. **Caution:** `preload` is effectively one-way — once the domain (and, via `includeSubDomains`, every subdomain) is submitted to the browser preload list it is baked into shipped browsers and is slow/hard to reverse; a later TLS/cert problem "could block legitimate users" [50]. **Default for this suite: omit `preload` and use a shorter `max-age` until the whole suite is confirmed permanently HTTPS-only.**
- `X-Content-Type-Options: nosniff` [50].
- Frame protection: set **both** `X-Frame-Options: DENY` (legacy) and CSP `frame-ancestors 'none'` (or `'self'`) as the primary control — OWASP notes `frame-ancestors` is preferred where supported [50].
- `Referrer-Policy: strict-origin-when-cross-origin` [50].
- `Permissions-Policy: geolocation=(), camera=(), microphone=()` — disable unused features [50].
- Baseline CSP: `default-src 'self'; frame-ancestors 'self'; form-action 'self'` as a conservative start [51]. A strict CSP usually must be tuned per app, so set a conservative default at the edge and let apps that need looser policies override — a full lockdown CSP applied blindly at the edge will break app UIs [51].

Mechanisms:
- **Caddy — `header` directive:** `header Field "value"` overwrites, `+Field` appends, `-Field` removes, `?Field` sets only if absent [39]. Define these once in a snippet and `import` into each site block.
- **Traefik — `headers` middleware:** `stsSeconds` (HSTS max-age; 0 disables), `stsIncludeSubdomains`, `stsPreload`, `contentTypeNosniff: true`, `frameDeny: true` / `customFrameOptionsValue`, `referrerPolicy`, `contentSecurityPolicy`, and `customResponseHeaders`/`customRequestHeaders` for arbitrary headers [45].

### 6.2 TLS configuration

- **Caddy — secure by default:** ships min TLS 1.2 / max TLS 1.3 with a curated modern cipher set (ECDHE-ECDSA/RSA AES-GCM + ChaCha20-Poly1305) and modern curves (X25519, P-256, plus post-quantum X25519MLKEM768); TLS 1.3 suites are always-on and not configurable (safe) [18]. **Recommendation: do not override Caddy's TLS defaults — they already match Mozilla Intermediate/Modern; touch `tls` only for cert/issuer config.**
- **Traefik — explicit `tls.options`:** `minVersion` default `VersionTLS12` (max `VersionTLS13`); `cipherSuites` and `curvePreferences` are configurable for TLS ≤1.2 (TLS 1.3 suites non-configurable per RFC 8446). Set `minVersion: VersionTLS12` explicitly and apply a Mozilla Intermediate cipher list [46].
- **Mozilla profiles** (source of the recommendation): Modern = TLS 1.3 only, three AEAD suites; Intermediate = TLS 1.2+1.3, ECDHE + AES-GCM/ChaCha20 only (no CBC/RC4/3DES/static-RSA) [52][53]. For an internal-only suite with modern browser + agent clients, **Modern (TLS 1.3-only) is viable; Intermediate is the safe default if any older client must connect.**

### 6.3 Rate limiting at the edge

- **Caddy — non-standard module (custom build required):** `rate_limit` comes from the third-party `caddy-ratelimit` plugin — build via `xcaddy build --with github.com/mholt/caddy-ratelimit`; it is not an official Caddy-org repo. Named zones take `key` (e.g. `{remote_host}`), `window`, and `events`; over-limit returns HTTP 429 with `Retry-After` [42][43]. **Packaging implication:** rate limiting requires the xcaddy custom image (same build path as the §4 DNS module).
- **Traefik — built-in:** `rateLimit` middleware (`average`, `period`, `burst`) and separately `inFlightReq` (`amount` = max concurrent) [47]. Example: `average: 100`, `burst: 200`.

Apply a conservative per-IP default across all routes and a tighter limit on the `auth` verify/login path to blunt brute force.

### 6.4 Header stripping / normalization (forward-auth trust boundary)

The edge must be the **sole setter** of `X-Forwarded-*` and identity headers: strip/overwrite any client-supplied copies on ingress, then let only the trusted auth response repopulate identity headers. Otherwise a client can spoof an authenticated identity or forge its source IP/proto.

- **Caddy — `trusted_proxies` (global `servers` option):** by default **no proxies are trusted**; when set, Caddy parses the real client IP from `X-Forwarded-For` (exposed as `{client_ip}`) and otherwise falls back to the direct remote address rather than trusting the header; a `private_ranges` shortcut covers private CIDRs [40][15]. Clear inbound identity headers explicitly (`header_up -Remote-User` / `-X-Forwarded-User`, or a `header` strip) so only the auth layer sets them [39].
- **Traefik — `forwardedHeaders.trustedIPs` (per entrypoint):** Traefik only honors `X-Forwarded-*` from listed source IPs; `insecure: true` trusts every connection (test only), and the docs warn improper trust "could introduce a security risk … (enabling request forgery)" [48]. Strip client identity headers via the `headers` middleware `customRequestHeaders` with an empty value (removes the header) [45].

### 6.5 Other homelab edge hardening

- **Server header / tokens:** Caddy sends `Server: Caddy` by default — remove with `header -Server` [39][44]; OWASP recommends removing/obscuring `Server` to avoid leaking the stack [50]. Traefik: blank it via `headers` `customResponseHeaders` (empty value removes) [45].
- **Request body size limits:** Caddy has **no** body-size limit by default — set `request_body { max_size 10MB }` (over-limit → HTTP 413) [41]; Traefik uses the `buffering` middleware `maxRequestBodyBytes` [49]. Cap at the edge; raise only on upload routes (drive/pdf).
- **Header size limit:** Caddy `max_header_size` defaults to 1MB (over → HTTP 431) [40].
- **Timeouts:** Caddy's `servers > timeouts` exposes `read_body`/`read_header`/`write` (default **no timeout**) and `idle` (default 5 min) [40]. Explicitly set `read_header` (and a reasonable `write`) at the edge to mitigate slowloris-style slow-request attacks; keep `read_body`/`write` generous only on upload/streaming routes.

### 6.6 Stage-5 checklist (carry forward)

- [ ] **TLS termination hardened:** TLS 1.2+ (prefer 1.3-only if all clients modern), modern ciphers, auto-renewing certs from the single DNS-01 wildcard; cert store on a persistent volume (Caddy `/data`, or Traefik `acme.json` at chmod 600) [8][1][18][46].
- [ ] **HSTS** enabled on all app subdomains once TLS is confirmed stable; add `preload` only when the whole suite is permanently HTTPS-only [50].
- [ ] **Security response headers** at the edge: `nosniff`, frame-ancestors/`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, conservative baseline CSP (per-app overrides allowed) [50][51][39][45].
- [ ] **Identity-header trust boundary:** proxy strips/overwrites any inbound client-supplied `Remote-*` / `X-Forwarded-User` before forward-auth injects verified ones; apps trust these only from the proxy source IP [26][9][10][39][45].
- [ ] **`X-Forwarded-*` sanitization:** only the proxy sets `X-Forwarded-For/Proto/Host`; configure `trusted_proxies` (Caddy) / `forwardedHeaders.trustedIPs` (Traefik) so client-supplied values are not honored [40][48].
- [ ] **Forward-auth on every route** — no app route bypasses the `auth` verify subrequest; default-deny posture [9][10].
- [ ] **Rate limiting / abuse controls** at the edge (per-IP baseline + tighter on the auth/login path) [42][43][47].
- [ ] **Server-token / info-leak hygiene:** remove/obscure the `Server` header [39][44][50].
- [ ] **Request body + header size limits and slow-request timeouts** set at the edge; relaxed only on upload/streaming routes [41][40][49].
- [ ] **Minimize proxy privilege:** with the static-Caddyfile recommendation, no `/var/run/docker.sock` mount is required; if Traefik/label-discovery is ever adopted, treat the socket mount as a reviewed privilege and consider a socket-proxy [3][4].
- [ ] **Staging-first TLS changes:** validate any cert/config change against Let's Encrypt staging before production to avoid rate-limit lockout [19][20].
- [ ] **Secrets hygiene:** the only secret at this layer is the DNS-provider API token for DNS-01 — inject via env/secret, never commit; no product secrets or state live in the proxy.
- [ ] **Encrypt internal hops:** ensure proxy→auth and proxy→app hops carrying identity headers/cookies do not traverse untrusted networks in clear text (see mTLS open decision in §7).

---

## 7. Open Design Decisions for the Operator

- **App-set volatility:** Is the ~11-app set truly static, or will apps be added/removed/scaled frequently? Heavy churn tips the choice toward Traefik's native discovery over the recommended static Caddyfile.
- **Docker socket exposure:** Will the proxy be granted `/var/run/docker.sock`, and is that acceptable? "No" reinforces the Caddy static-file model.
- **Central vs decentralized edge config:** One Caddyfile vs per-app compose labels — this preference alone can decide Caddy vs Traefik.
- **Domain & wildcard strategy:** Single public domain (one wildcard) vs per-app domains; willingness to register/own a domain at an API-capable provider (Cloudflare); whether the chosen DNS provider is supported by the selected proxy's DNS plugin/module.
- **Custom Caddy image acceptance:** DNS-01 wildcards *and* edge rate limiting both require a custom xcaddy build. Accept maintaining one custom Caddy image (covers both), or avoid it (then reconsider Traefik, whose DNS providers and rate limiting are built in)?
- **Split-horizon DNS ownership:** Is there an existing internal resolver (Pi-hole/Unbound/router) to host the split-horizon zone, or must one be stood up as part of the proxy work?
- **Public wildcard vs internal CA:** Can a custom root be installed into every agent container? If not, publicly-trusted Let's Encrypt certs are strongly preferred over an internal CA to avoid per-container trust distribution.
- **Exact `auth` contract:** Which identity-header names (`Remote-*` vs `X-authentik-*` vs `X-Forwarded-User`) and which extra agent claims (role, scoped permissions, budget); the verify endpoint path; and the 302-vs-401 discrimination signals (`Accept` / `X-Requested-With`). Must be fixed before downstream apps hardcode whitelist trust.
- **Token model & validation:** Does `auth` issue session cookies + separate agent JWTs or a single token type; where JWKS/introspection lives; audience definition for agent tokens; and how MCP clients obtain/rotate tokens (client-credentials grant?) and handle revocation/short TTLs for long-running agents.
- **Authorization placement:** Is per-app/per-route access control and agent budget/rate-limit enforcement done at the proxy verify step (Authelia-style rules) or inside each app after receiving identity headers? This affects how much policy the 2xx response must carry.
- **mTLS on internal hops:** Whether proxy→auth and proxy→app hops require mTLS given they carry identity headers and cookies.

---

## 8. Sources

1. Traefik & ACME Certificates Resolver — Traefik Documentation — https://doc.traefik.io/traefik/https/acme/
2. Traefik vs Caddy vs Nginx: Docker Reverse Proxy Compared — Virtua — https://www.virtua.cloud/learn/en/concepts/traefik-caddy-nginx-docker-reverse-proxy
3. Traefik Docker Provider — Traefik Documentation — https://doc.traefik.io/traefik/reference/install-configuration/providers/docker/
4. lucaslorentz/caddy-docker-proxy — GitHub — https://github.com/lucaslorentz/caddy-docker-proxy
5. caddy — Official Docker Image (loads static Caddyfile at /etc/caddy/Caddyfile) — https://hub.docker.com/_/caddy
6. Caddyfile Concepts (snippets) — Caddy Documentation — https://caddyserver.com/docs/caddyfile/concepts
7. import (Caddyfile directive) — Caddy Documentation — https://caddyserver.com/docs/caddyfile/directives/import
8. Automatic HTTPS — Caddy Documentation — https://caddyserver.com/docs/automatic-https
9. forward_auth (Caddyfile directive) — Caddy Documentation — https://caddyserver.com/docs/caddyfile/directives/forward_auth
10. Traefik ForwardAuth Middleware (current) — Traefik Documentation — https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/
11. Caddy | Integration | Authelia — https://www.authelia.com/integration/proxies/caddy/
12. Releases · traefik/traefik (v3.7.5, Jun 2026; support policy) — https://github.com/traefik/traefik/releases
13. Traefik | endoflife.date — https://endoflife.date/traefik
14. Caddy vs HAProxy vs Nginx vs Traefik: Which Reverse Proxy to Pick (2026) — https://hostim.dev/blog/reverse-proxy-showdown/
15. reverse_proxy (Caddyfile directive) — Caddy Documentation — https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
16. Challenge Types — Let's Encrypt — https://letsencrypt.org/docs/challenge-types/
17. caddy-dns/cloudflare — GitHub (requires custom Caddy build) — https://github.com/caddy-dns/cloudflare
18. tls (Caddyfile directive) — Caddy Documentation — https://caddyserver.com/docs/caddyfile/directives/tls
19. Rate Limits — Let's Encrypt — https://letsencrypt.org/docs/rate-limits/
20. Staging Environment — Let's Encrypt — https://letsencrypt.org/docs/staging-environment/
21. DNS-PERSIST-01: A New Model for DNS-based Challenge Validation — Let's Encrypt — https://letsencrypt.org/2026/02/18/dns-persist-01
22. Shorter Certificate Lifetimes and Rate Limits — Let's Encrypt — https://letsencrypt.org/2026/02/24/rate-limits-45-day-certs
23. Wildcard Certificates with Traefik — Stonegarden — https://blog.stonegarden.dev/articles/2023/12/traefik-wildcard-certificates/
24. How to Run Caddy with Docker and Automatic HTTPS (Wildcard Certificates) — OneUptime — https://oneuptime.com/blog/post/2026-02-08-how-to-run-caddy-with-docker-and-automatic-https-wildcard-certificates/view
25. Traefik ForwardAuth Documentation | v3.4 — https://doc.traefik.io/traefik/v3.4/middlewares/http/forwardauth/
26. Trusted Header SSO | Integration | Authelia — https://www.authelia.com/integration/trusted-header-sso/introduction/
27. Server Authz Endpoints | Configuration | Authelia — https://www.authelia.com/configuration/miscellaneous/server-endpoints-authz/
28. OAuth 2.0 Bearer Token Usage | Integration | Authelia — https://www.authelia.com/integration/openid-connect/oauth-2.0-bearer-token-usage/
29. Proxy Authorization | Reference | Authelia — https://www.authelia.com/reference/guides/proxy-authorization/
30. Flag to return 302 instead of 401 when verifying · Issue #85 · authelia/authelia — https://github.com/authelia/authelia/issues/85
31. Overview | OAuth2 Proxy — https://oauth2-proxy.github.io/oauth2-proxy/configuration/overview/
32. skip-jwt-bearer-tokens / extra-jwt-issuers · Issue #1032 · oauth2-proxy/oauth2-proxy — https://github.com/oauth2-proxy/oauth2-proxy/issues/1032
33. skip-auth-preflight with auth_request/forwardAuth · Issue #1549 · oauth2-proxy/oauth2-proxy — https://github.com/oauth2-proxy/oauth2-proxy/issues/1549
34. Caddy | authentik — https://docs.goauthentik.io/add-secure-apps/providers/proxy/server_caddy/
35. Traefik | authentik — https://docs.goauthentik.io/add-secure-apps/providers/proxy/server_traefik/
36. OAuth2 Proxy — Behaviour — https://oauth2-proxy.github.io/oauth2-proxy/behaviour/
37. NGINX ngx_http_auth_request_module — https://nginx.org/en/docs/http/ngx_http_auth_request_module.html
38. caddy-dns (DNS provider modules) — GitHub organization — https://github.com/caddy-dns
39. header (Caddyfile directive) — Caddy Documentation — https://caddyserver.com/docs/caddyfile/directives/header
40. Global options (Caddyfile) — Caddy Documentation — https://caddyserver.com/docs/caddyfile/options
41. request_body (Caddyfile directive) — Caddy Documentation — https://caddyserver.com/docs/caddyfile/directives/request_body
42. modules/http.handlers.rate_limit — Caddy Documentation — https://caddyserver.com/docs/modules/http.handlers.rate_limit
43. mholt/caddy-ratelimit README — GitHub (third-party; requires xcaddy build) — https://github.com/mholt/caddy-ratelimit/blob/master/README.md
44. Remove Server header globally — Caddy Community — https://caddy.community/t/remove-server-header-globally/15897
45. Traefik Headers Middleware | v3.4 — https://doc.traefik.io/traefik/v3.4/middlewares/http/headers/
46. Traefik TLS Options — Traefik Documentation — https://doc.traefik.io/traefik/reference/routing-configuration/http/tls/tls-options/
47. Traefik RateLimit / inFlightReq Middleware — Traefik Documentation — https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/ratelimit/
48. Traefik EntryPoints (forwardedHeaders.trustedIPs) — Traefik Documentation — https://doc.traefik.io/traefik/reference/install-configuration/entrypoints/
49. Traefik Buffering Middleware (maxRequestBodyBytes) — Traefik Documentation — https://doc.traefik.io/traefik/middlewares/http/buffering/
50. HTTP Headers Cheat Sheet — OWASP — https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
51. Content Security Policy Cheat Sheet — OWASP — https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html
52. Mozilla SSL Configuration Generator — https://ssl-config.mozilla.org/
53. Security/Server Side TLS — MozillaWiki — https://wiki.mozilla.org/Security/Server_Side_TLS
