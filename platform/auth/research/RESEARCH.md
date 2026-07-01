# Stage 1 Research — `auth` Identity Gateway (Critical-infra)

This document is the Stage-1 research foundation for **`auth`**, the identity layer that authenticates and authorizes every principal — human operator and local AI agent alike — across the agent-corp suite. It fixes the architectural primitives every other app will build its MCP-surface authorization against: how local agents get identities, how scopes/roles/budgets are modeled and enforced, how `auth` fronts every app behind the reverse proxy, and how identity mechanically upholds segregation of duties (SoD). Every external fact is cited to a real URL; because this is Critical-infra and several load-bearing specs are fast-moving drafts (MCP authorization, OAuth 2.1), version- and revision-specific items are flagged in a consolidated **Verify at build time** list rather than trusted from memory. Today is **2026-06-30**; note that the MCP authorization spec is expected to ship a new revision (`2026-07-28`) roughly one month out.

---

## Executive summary

- **One identity source, many resource servers.** Run `auth` as the single self-hosted OAuth 2.1 / OIDC **Authorization Server (AS)** behind the proxy. Every app (Board, CMDB, Vault, Gateway, and the non-critical apps) is an **OAuth 2.1 Resource Server (RS)** whose MCP surface validates tokens locally against `auth`'s published JWKS and its own audience. This is exactly the shape the MCP authorization spec (`2025-11-25`) mandates. ([MCP 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization))
- **Agents are first-class machine identities, never shared accounts.** Each of the ~dozens of local agents is a distinct principal that authenticates non-interactively. Prefer asymmetric client authentication (a per-agent signing key) over any reusable shared secret, and issue **short-lived** access tokens. ([RFC 6749 §4.4](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.3), [RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523))
- **Two-tier authorization.** Coarse capability scopes ride in short-lived, audience-bound tokens (fast local check = the PEP); the SoD-critical and budget-dependent decisions live in a central **PDP** that `auth` owns and each app queries at call time. Scopes alone cannot express "the approver of ticket X must differ from its proposer." ([RFC 9396](https://www.rfc-editor.org/rfc/rfc9396.html))
- **Auth is the SoD *substrate*, not the sole *enforcer*.** `auth` issues disjoint, mutually-exclusive approve-vs-execute scopes to distinct principals (NIST SSD); the per-ticket "no self-approval" check is enforced downstream at the Board against `auth`'s authoritative principal id. ([ANSI INCITS 359](https://profsandhu.com/journals/tissec/ANSI+INCITS+359-2004.pdf))
- **Budgets mean compute/time/concurrency + cooldowns, never dollars.** Enforce them per-tool-call in the MCP-server/API layer (not at the HTTP proxy, which cannot see individual multiplexed MCP calls), with authoritative counters in a shared Redis keyed by agent id.
- **Front door = forward-auth.** The proxy (Caddy `forward_auth` / Traefik `ForwardAuth`) delegates every request to one `auth` verification endpoint and injects `auth`-set identity. The load-bearing Critical-infra invariant: the proxy **MUST unconditionally strip all client-supplied identity/trust headers**, and backends should verify a **signed** identity token rather than trust a bare header. Two real 2026 CVE clusters (Caddy CVE-2026-30851; Traefik CVE-2026-35051 et al.) prove this is not theoretical.

---

## 1. Agent-as-user identity: how local agents authenticate as first-class users

**Findings.** The correct primitive for ~dozens of local agent processes is to model each agent as a distinct machine/service identity in one self-hosted OIDC/OAuth2 IdP, authenticated **non-interactively**. The OAuth 2.0 **client-credentials grant** (RFC 6749 §4.4) is the standard mechanism where the client is itself the principal with no end-user context; a refresh token SHOULD NOT be issued, so the agent simply re-mints on expiry (natural rotation). ([RFC 6749 §4.4.3](https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.3), [oauth.net client-credentials](https://oauth.net/2/grant-types/client-credentials/))

Shared service accounts are **forbidden**: a shared secret collapses the "who did this" audit chain and lets one leak impersonate every agent. Per-agent **asymmetric** client authentication removes any reusable shared secret from the system.

> **Protocol precision (fold-in correction):** "private_key_jwt" is not one uniform path. In **Keycloak**, private_key_jwt is a *client-authentication method* (RFC 7523 §2.2) used **with** `grant_type=client_credentials`. In **Zitadel**, service-account "private key JWT" is a distinct *authorization grant*, `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer` (RFC 7523 §2.1). The design must choose the token-request shape **per chosen IdP** and not assume one is portable to the other. ([RFC 7523](https://datatracker.ietf.org/doc/html/rfc7523), [Zitadel private-key-jwt](https://zitadel.com/docs/guides/integrate/service-accounts/private-key-jwt))

Prefer **short-lived** access tokens (single-digit minutes) with silent re-mint over long-lived personal-access-token-style credentials, which are a known anti-pattern (Zitadel warns a leaked PAT grants access until it expires or is deleted). ([Zitadel PAT](https://zitadel.com/docs/guides/integrate/service-accounts/personal-access-token))

**Revocation** depends on token type:
- **Opaque/reference tokens:** revoke via RFC 7009 endpoint + validate freshness via RFC 7662 introspection at each RS — instant kill, but a network call per request. ([RFC 7009](https://datatracker.ietf.org/doc/html/rfc7009), [RFC 7662](https://datatracker.ietf.org/doc/html/rfc7662))
- **Self-contained JWTs:** cannot be un-issued; they stay signature-valid until `exp`. Instant revocation therefore requires very short TTL **plus** a `jti`/subject denylist propagated to every RS. This distinction is the Critical-infra kill-switch decision.

> **Load-bearing correction — the real root credential is the per-agent signing key.** "No reusable shared secret" is true only for *tokens*. Each agent still holds a **durable private signing key** on its host — the actual long-lived root credential. A compromised agent host leaks that key and lets an attacker mint tokens until the *key* (not just a token) is revoked. The design MUST specify where the key lives (file vs OS keystore vs TPM/HSM), how it is protected, and how it is rotated/revoked. Short token TTLs do **not** mitigate a stolen signing key. This is precisely the attested/non-exportable-SVID problem SPIFFE/SPIRE solves.

**Stronger, heavier options** (documented, deliberately deferred): mTLS client auth + certificate-bound tokens (RFC 8705, `cnf`/`x5t#S256`) give sender-constrained "unstealable" tokens ([RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705)); SPIFFE/SPIRE gives cryptographically-attested, auto-rotating SVIDs (default X.509-SVID TTL 1h, agent renews at ~50%) but running SPIRE Server+Agent + attestation policy is over-scaled for a single operator. ([SPIRE concepts](https://spiffe.io/docs/latest/spire-about/spire-concepts/), [SPIRE agent](https://spiffe.io/docs/latest/deploying/spire_agent/))

> **Reconcile with the suite invariant "agents hold no credentials":** that means no **Vault-managed real-world credentials**. Agents DO hold their own identity signing key to obtain tokens; that self-held identity key is not a "credential to a downstream system." Token non-forgeability rests on `auth`'s AS signing key, not on agents being credential-less.

Note the MCP authorization spec's happy path assumes a **human** resource owner (authorization-code + PKCE); autonomous agents are the principal themselves, so client-credentials/workload identity is a deliberate, spec-compatible divergence that still honors the carry-over MUSTs (RFC 9728 protected-resource metadata, RFC 8707 audience binding). ([RFC 9728](https://datatracker.ietf.org/doc/html/rfc9728), [RFC 8707](https://www.rfc-editor.org/rfc/rfc8707.html))

Industry guidance (frame directionally; cite primaries at build): OWASP Non-Human Identity Top 10 and NIST SP 800-63 push short-lived, tightly-scoped workload identity over reusable static secrets. *(Verify at build — the secondary aggregator pages used in raw research must be replaced with [OWASP NHI Top 10](https://owasp.org/www-project-non-human-identities-top-10/) and NIST SP 800-63B primaries.)*

**Recommendation.** **Issue every local agent a distinct machine identity in one self-hosted OIDC AS. Authenticate each via client-credentials with per-agent asymmetric client authentication (the exact grant/assertion shape pinned to the chosen IdP). Issue short-lived (≈2–15 min) access tokens carrying the agent's roles/scopes, audience-bound (RFC 8707) to the specific target app. Treat the per-agent private signing key as the true root credential: store it in an OS keystore/TPM where possible, make it per-agent, and make the key itself independently rotatable and revocable. For the rogue-agent kill-switch, choose deliberately between opaque-token introspection (instant, per-request IdP dependency) and short-TTL JWT + pushed `jti`/subject denylist (fast path stays offline). Document SPIFFE/SPIRE and mTLS/RFC 8705 as deferred hardening, not v1.**

---

## 2. Scoped permissions: mapping roles/scopes to MCP calls, and how each holder checks it

**Findings.** OAuth scopes are a **coarse delegation/consent** construct, not a fine-grained authorization model. RFC 9396 states scope "is sufficient to implement static scenarios and coarse-grained authorization requests" but not fine-grained ones like "read directory A and write file X." ([RFC 9396](https://www.rfc-editor.org/rfc/rfc9396.html)) Relying on scopes-in-JWT alone produces scope explosion (header size limits), stale-permission windows (a JWT is valid until `exp` with no native revocation), and no per-resource context. ([Aserto](https://www.aserto.com/blog/oauth2-scopes-are-not-permissions), [Permit.io](https://www.permit.io/blog/how-to-use-jwts-for-authorization-best-practices-and-common-mistakes), [AuthZed](https://authzed.com/blog/pitfalls-of-jwt-authorization))

RFC 9396 **Rich Authorization Requests** (RAR) add an `authorization_details` array (fields: `type` [required], `actions`, `locations`, `datatypes`, `identifier`, `privileges`) for structured per-call grants; the AS **RECOMMENDED** (not mandated) to add the audience-filtered object as a top-level claim; `scope` and `authorization_details` may coexist but an API SHOULD use one. RAR is a useful middle path for bounded single-call grants but is still token-carried (still subject to staleness) and support across self-hosted ASes is uneven. ([RFC 9396](https://www.rfc-editor.org/rfc/rfc9396.html))

Model foundations: RBAC (permissions via role membership — stable, auditable roles; the Sandhu 1996 model and **NIST/ANSI INCITS 359**) and ABAC (access from subject/object/operation/environment attributes — context-aware; **NIST SP 800-162**). *(Correction: SP 800-92 is "Guide to Computer Security Log Management" and is unrelated to RBAC — do not cite it.)* ([Sandhu 1996](https://csrc.nist.gov/csrc/media/projects/role-based-access-control/documents/sandhu96.pdf), [NIST SP 800-162](https://csrc.nist.gov/pubs/sp/800/162/upd2/final)) The SoD rule ("approver ≠ executor," "cannot approve own work") is naturally an ABAC/ReBAC constraint comparing the acting principal against the work item — not a static role.

**The Aserto "3-body problem"** (correctly framed: the three bodies are the **PEP, PDP, and PIP**) argues fine-grained decisions need current data at call time, best served by a local sidecar PDP caching pushed data for millisecond latency. ([Aserto 3-body](https://www.aserto.com/blog/the-authorization-3-body-problem))

Policy-engine mapping ([Oso](https://www.osohq.com/learn/opa-vs-cedar-vs-zanzibar), [Permit.io showdown](https://www.permit.io/blog/policy-engine-showdown-opa-vs-openfga-vs-cedar), [Auth0](https://auth0.com/blog/rebac-abac-openfga-cedar/)):
- **OPA/Rego** — general-purpose policy-as-code; most flexible, highest data-sync/ops cost.
- **AWS Cedar** — declarative RBAC/ABAC, embeddable Rust library (Java binding), runs offline, deterministic, `forbid` overrides `permit`; **stateless** (no data store — live counters must be supplied as entities/context per call). ([Cedar authorization](https://docs.cedarpolicy.com/auth/authorization.html))
- **OpenFGA/Zanzibar** — ReBAC relationship graph, strong at reverse-index ("what can this agent call?") and nested hierarchies, but a stateful can't-fail DB component.

MCP contract (`2025-11-25`): each MCP server is an OAuth 2.1 RS that MUST validate audience per RFC 8707, MUST implement RFC 9728 Protected Resource Metadata (advertising `authorization_servers`), MUST NOT pass tokens through (confused-deputy prevention). Insufficient scope → **HTTP 403** `WWW-Authenticate: error="insufficient_scope"` with the required scope (step-up authorization; 401 = unauthenticated, 400 = malformed). ([MCP 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization))

> **Topology trust-boundary correction:** the proxy may pre-check and inject identity as defense-in-depth, but per MCP each RS **MUST independently validate the token audience itself** and MUST NOT rely on a proxy-injected header. Do not phrase this as "apps trust a forwarded identity header."

> **Multi-audience friction (real design gap):** RFC 8707 tokens are audience-bound to **one** resource, yet the core use case is one agent orchestrating four holders (Board+CMDB+Vault+Gateway) for a single destructive action — that requires **four separately-audienced tokens** (or four step-up flows). The design must specify how an agent acquires/manages per-resource tokens across the SoD chain.

**How each holder checks it (two tiers):**
- **Tier 1 (PEP, local, fast):** each app validates the JWT signature (JWKS), `exp`, `aud`=self, and coarse capability scope (e.g. `board:read`, `board:propose`, `gateway:execute`) offline. Satisfies "MCP authz resolves against one identity source" with no per-request callback for the common path.
- **Tier 2 (PDP, call-time):** anything destructive, resource-specific, or budget/cooldown-dependent is **not** in the token — the app's PEP calls a central PDP for a permit/deny on the concrete `(principal, action, resource, context)` tuple. SoD invariants and live budget/cooldown context live here.

**Recommendation.** **Adopt the two-tier model. Put only coarse capability scopes (which tool *surface* an identity may reach) + audience in short-lived JWTs, validated locally by every app. Route all fine-grained, SoD-critical, and budget-dependent decisions to a central PDP that `auth` owns. Primary engine recommendation for homelab scale: embed AWS Cedar (Apache-2.0, no cluster/DB, deterministic, `forbid`-as-guardrail) as `auth`'s decision API — but pair it with a separate PIP/counter store inside `auth` for live budget/cooldown state, since Cedar is stateless. Add OpenFGA only if reverse-index/relationship-graph queries become core. Use RAR (RFC 9396) only for bounded per-call grants, not as an SoD substitute. Accept that fail-closed on destructive actions makes `auth` a suite-wide hard dependency, implying an HA target for this Critical-infra service.**

---

## 3. Budgets: compute/time/concurrency caps + action cooldowns (never dollars)

**Findings.** Because agents are local (no per-token dollar cost), budgets are a **safety guardrail against runaway/never-terminating loops and host resource exhaustion** — a compute/loop guardrail must **fail closed**, unlike a dollar limiter. The strongest anti-runaway levers are the **concurrency cap** and **per-action cooldown**, not sustained rate. ([Backpressure by Design](https://debugg.ai/resources/backpressure-by-design-2025-concurrency-limits-admission-control-queueing-patterns), [Netflix concurrency-limits](https://github.com/Netflix/concurrency-limits/blob/main/README.md))

Three enforceable dimensions, all keyed by agent id in one shared Redis:
1. **Rate/compute** — token bucket or **GCRA** (stores one Theoretical Arrival Time timestamp per key, no drip/timer thread; emission interval `T` = sustained spacing, `tau` = burst; use Redis `TIME` for clock consistency). ([brandur GCRA](https://brandur.org/rate-limiting), [redis-gcra](https://github.com/Losant/redis-gcra)) Token bucket is implementable atomically via a single Redis Lua `EVAL` (refill-check-consume in one round trip, no WATCH retry loop). ([Redis rate limiter](https://redis.io/docs/latest/develop/use-cases/rate-limiter/go/))
2. **Concurrency/WIP** — distinct from rate, sized by Little's Law (L = λ·W), enforced by a bounded semaphore: Redis `INCR` on tool-call start, `DECR` on completion, TTL **lease** only as a crash-recovery backstop. This hard-caps parallel fan-out even if a rate check is gamed. ([Little's Law](https://brooker.co.za/blog/2018/06/20/littles-law.html)) Optional adaptive limiting (Vegas/Gradient2) + percentage partitioning by identity is a later upgrade if the shared host gets contended. ([Netflix](https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581))
3. **Cooldown** — minimum interval per `(agent, action-class)`; GCRA with `tau=0` (pure spacing) or Redis `SET NX EX`; combine with idempotency keys so a retrying agent cannot cause duplicate side effects.

Every mainstream gateway can express rate/concurrency keyed off an identity header, which validates the pattern but is **not** where authoritative state should live: Traefik `RateLimit` (token bucket) + **`InFlightReq`** (concurrency cap) key off `sourceCriterion.requestHeaderName`, but **OSS counters are in-memory per replica**; Redis-backed/distributed rate limiting is a **Traefik Hub/Enterprise** feature. ([Traefik RateLimit](https://doc.traefik.io/traefik/middlewares/http/ratelimit/), [Traefik InFlightReq (OSS)](https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/inflightreq/)) Kong keys by authenticated Consumer; Envoy splits a local token bucket from a global Redis-backed descriptor service — both confirm the "coarse-at-edge, authoritative-centrally" split. ([Kong](https://developer.konghq.com/plugins/rate-limiting/), [Envoy global RL](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting))

> **Enforcement-point correction (load-bearing):** do **not** put authoritative budget enforcement at the reverse-proxy HTTP layer. MCP Streamable-HTTP/SSE can multiplex **many tool calls over one long-lived connection**, so per-request proxy middleware may see one connection, not N actions — the core anti-runaway lever becomes invisible. Enforce in the **MCP-server/API layer per tool-call**; keep proxy middleware only as coarse edge protection/DoS dampening.

> **ForwardAuth cannot release a semaphore:** ForwardAuth is a pre-request hook with **no completion callback**, so it can `INCR` but has no reliable `DECR` point — concurrency would be enforced by lease timeout only and would spuriously reject busy-but-healthy agents. Acquire/release the leased Redis semaphore **around each tool call inside the MCP server** (`INCR` on start, `DECR` in a `finally`/on-completion path, TTL lease as backstop).

Budgets are not an OAuth primitive — carry static limits as custom identity attributes/claims from `auth`, but keep **live counters** (in-flight concurrency, cooldown timers) in the runtime store queried per tool-call, returning 429/backpressure (reject, do not queue-forever) when over budget.

> **Availability tradeoff:** a single shared Redis + fail-closed-for-destructive-classes is a suite-wide single point of failure (Redis/`auth` down blocks destructive actions and possibly operator control). Document an operator **break-glass/override** path and Redis persistence expectations rather than leaving fail-closed implicit.

**Recommendation.** **Model each agent's budget in `auth` as (1) rate/compute via a GCRA-in-Redis key, (2) concurrency via a leased Redis `INCR`/`DECR` semaphore acquired and released around each MCP tool call inside the app's MCP server, and (3) per-`(agent, action-class)` cooldown via GCRA `tau=0` or `SET NX EX` plus idempotency keys. Store all live counters in one shared Redis so all of an agent's processes share one budget; make `auth` the authoritative owner of budget *policy* so the human UI manages it. Enforce at the MCP-server/API layer per tool-call, not the proxy. The concurrency semaphore is the single most important anti-runaway lever. Fail closed for destructive-action classes on Redis unavailability, with a documented operator break-glass; set conservative, operator-tunable defaults.**

---

## 4. Front-door pattern: forward-auth / token / session fronting every app behind the proxy

**Findings.** The "front door" puts the reverse proxy in front of every app; on each request the proxy issues a sub-request to `auth`'s verification endpoint (2xx = allow; non-2xx = deny/redirect), and on allow copies `auth`-set identity headers onto the request before forwarding upstream. Both leaning proxies implement exactly this:
- **Traefik `ForwardAuth`**: `address` → verify URL; sends `X-Forwarded-Method/Proto/Host/Uri/For`; `authResponseHeaders`/`authResponseHeadersRegex` copy auth-response headers onto the request, **replacing conflicting client headers**; `tls.*` for mTLS to `auth`. *(Recency: `trustForwardHeader` is now **deprecated** in current v3.x docs — do not present it as a live option.)* ([Traefik ForwardAuth](https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/))
- **Caddy `forward_auth`**: GET to the auth upstream with URI rewritten to the verify endpoint; on 2xx copies `copy_headers` (supports `Original>New` rename); sugar over `reverse_proxy` + `handle_response`. ([Caddy forward_auth](https://caddyserver.com/docs/caddyfile/directives/forward_auth))

The **human-vs-agent split lives at the `auth` endpoint**: browsers present a session cookie scoped to the apex domain (SSO across all subdomains); agents/MCP clients present `Authorization: Bearer`. One endpoint can accept both — **Authelia** proves this: four Authz implementations (ForwardAuth `/api/authz/forward-auth`, ExtAuthz, AuthRequest, deprecated Legacy) over one store, trying `CookieSession` then `HeaderAuthorization` in sequence, returning `Remote-User`/`Remote-Groups`/`Remote-Name`/`Remote-Email` (header list documented on the proxy-**integration** pages, e.g. Caddy/Traefik). ([Authelia proxy authz](https://www.authelia.com/reference/guides/proxy-authorization/), [Authelia Caddy](https://www.authelia.com/integration/proxies/caddy/))

> **CRITICAL — Caddy CVE-2026-30851** (`forward_auth` `copy_headers` identity injection / privilege escalation, CVSS 8.1, affects v2.10.0–v2.11.1, **fixed in v2.11.2**). When `auth` returned 200 **without** a configured `copy_headers` header, the *client-supplied* header of that name was NOT stripped and passed through — so any authenticated client could spoof `X-User-Role: approver` and collapse the four-holder property. The fix added an **unconditional delete before the conditional set**. Authoritative sources: [NVD CVE-2026-30851](https://nvd.nist.gov/vuln/detail/CVE-2026-30851), [GHSA-7r4p-vjf4-gxv4](https://github.com/caddyserver/caddy/security/advisories/GHSA-7r4p-vjf4-gxv4), cause PR [#6608](https://github.com/caddyserver/caddy/pull/6608), fix PR [#7545](https://github.com/caddyserver/caddy/pull/7545). Also flag sibling **CVE-2026-52845** (FastCGI header-normalization bypass in `forward_auth copy_headers`).

**Design mandate regardless of proxy:** the proxy MUST **unconditionally delete inbound identity headers** before the auth sub-request, so a header only ever reaches upstream if `auth` explicitly set it; and prefer emitting a **signed JWT** identity header so upstreams cryptographically verify origin rather than trusting a bare header. This mirrors Pomerium's general forward-auth lesson: identity reaches upstreams only if the auth response emits it AND the proxy is configured to copy it. ([Pomerium JWT headers](https://www.pomerium.com/docs/reference/jwt-claim-headers))

Reference-only alternatives that fight the "proxy is Caddy/Traefik, identity is our service" lock: **Authentik** (heavier full IdP; forward-auth via a proxy "outpost", emits `X-authentik-jwt`); **oauth2-proxy** (browser-OIDC-session bridge; bearer/machine story is weaker — *reasoned opinion, not asserted fact*); **Pomerium** (cleanest in full-proxy mode, which conflicts with the lock). ([Authentik Traefik](https://docs.goauthentik.io/add-secure-apps/providers/proxy/server_traefik/), [oauth2-proxy](https://oauth2-proxy.github.io/oauth2-proxy/7.2.x/configuration/overview/)) nginx `ngx_http_auth_request_module` is a portability fallback only. ([Authelia AuthRequest](https://www.authelia.com/reference/guides/proxy-authorization/))

> **"Stateless" caveat:** the verify endpoint is stateless only for self-contained signed **Bearer/JWT** tokens; **session-cookie** validation is inherently stateful (Authelia backs sessions with Redis). Only the token path is truly stateless.

> **Operational caveat:** a single per-request forward-auth endpoint is a shared **single point of failure** and adds latency to every request across every app — acceptable at homelab scale, but call it out.

For agents/MCP, `auth` acts as the AS + RFC 9728 resource-metadata source; agents obtain scoped bearer tokens and each app's MCP surface validates them (RFC 9728/8707/6750). ([MCP draft authorization](https://modelcontextprotocol.io/specification/draft/basic/authorization))

**Recommendation.** **Expose ONE `auth` forward-auth verification endpoint (2xx=allow, 401/redirect=deny) that both proxies call per request, validating two credential types: an HttpOnly+Secure apex-scoped session cookie (human SSO) and `Authorization: Bearer` (agents/MCP) — mirror Authelia's `CookieSession`+`HeaderAuthorization` contract even if you write the service. On allow, return identity as a SIGNED JWT header (plus optional `Remote-User` convenience headers), never a bare trusted header. Regardless of proxy, add an explicit unconditional header-scrub step and a regression test proving a client cannot spoof identity when `auth` returns 200 without the header. If Caddy: run ≥ 2.11.2 (CVE-2026-30851) and check CVE-2026-52845. Prefer Traefik `ForwardAuth` (replace-conflicting-headers semantics) for a bespoke endpoint; treat Authentik/Pomerium/oauth2-proxy as references, not adopted components. Note the endpoint is stateless only for the token path and is a per-request SPOF.**

---

## 5. Segregation of duties: keeping APPROVAL and EXECUTION distinct; no self-approval

**Findings.** SoD at the identity layer rests on **NIST/ANSI INCITS 359** RBAC (current standard: **INCITS 359-2012 (R2022)**): **Static Separation of Duty (SSD)** = mutually exclusive roles never co-assignable to one principal (a conflict set `rs` with cardinality `n`, `1 ≤ n ≤ |rs|−1`, enforced at **assignment** time); **Dynamic SoD (DSD)** = roles may be held but never activated together in one **session** (`2 ≤ n ≤ |rs|`). SSD constraints propagate through role hierarchies, so conflicts must be computed over the **inherited/effective** permission set. ([ANSI INCITS 359](https://profsandhu.com/journals/tissec/ANSI+INCITS+359-2004.pdf), [corrected spec](https://www3.cs.stonybrook.edu/~stoller/papers/rbac-spec.pdf))

Key research nuance (Li/Bizri/Tripunitara, Purdue): **SoD is the *objective*; mutually-exclusive roles are only one *mechanism***. Static role exclusion alone cannot express object/instance-level rules like "the approver of ticket X must differ from its proposer" — that requires operational/history-based (dynamic) SoD enforced per-request against an authoritative identity. (The paper's core thesis is that enforcing static SoD via minimal SMER constraint sets is coNP-complete — irrelevant for the suite's trivial 4-scope pairwise exclusion, but a reason to keep the conflict set small and explicit rather than machine-derived.) ([sod-j.pdf](https://ece.uwaterloo.ca/~tripunit/papers/sod-j.pdf))

Two enforcement layers:
- **Tier 1 — static mutual exclusion (SSD), owned by `auth` at grant time.** Model each holder's authority as an atomic scope: `board:approve`, `cmdb:write-policy`, `vault:read-credential`, `gateway:execute`. Declare an SSD conflict set (at minimum `{board:approve, gateway:execute}`, ideally all four pairwise-exclusive per principal); `auth` REJECTS any grant that would give one principal two holder-scopes, computed over inherited permissions. Agent roles carry **zero** credential scope structurally (never `vault:read-credential`), making "agents hold no credentials" an identity-model invariant. As defense-in-depth, mirror this as a Cedar store-wide **`forbid`** guardrail (`forbid` always overrides `permit`) — but **unit-test it**, since Cedar ships no first-party SoD example. ([Cedar authorization](https://docs.cedarpolicy.com/auth/authorization.html), [Cedar roles best-practices](https://docs.cedarpolicy.com/bestpractices/bp-implementing-roles.html))
- **Tier 2 — per-request four-eyes / maker-checker, enforced by the Board against `auth`'s authoritative principal id.** Every proposal records `proposer_id`; every approval records `approver_id`; the Board enforces `proposer_id != approver_id` (self-approval prevention). This is the standard maker-checker / dual-control pattern (a common implementation of the "separation of duties" that SOX/PCI-DSS mandate generally — four-eyes is not verbatim regulatory text). ([maker-checker](https://blog.xtrm.com/posts/maker-checker-process))

> **Correction — do NOT cite FORGE (arXiv 2602.16708) as precedent for self-approval prevention.** The paper is real and does use Datalog with `Supervises`/`ApprovedBy` predicates, but its `DependsSameAgent` predicate enforces **per-session causal scoping** (approval must exist within the **same** agent's current causal context) — it does the *opposite* of preventing self-approval and provides no `approver != requester` rule. Ground Tier-2 solely in the maker-checker/four-eyes pattern; the `proposer_id != approver_id` design is the suite's own, correct on its own merits.

> **Auth is the substrate, not the sole enforcer.** RFC 8707 audience-binding is an **audience (aud) restriction**, not intra-resource scope separation — it prevents *replaying* a Board token at the Gateway, but it does NOT by itself guarantee "an agent that can approve cannot execute." The actual SoD control is `auth`'s **issuance policy**: refuse to co-issue approve + execute capability to one principal, and issue **single-audience, narrowly-scoped** tokens so per-app audience rejection can separate the holders. A dual-scoped identity could otherwise simply mint two separate single-audience tokens. Restate SoD enforcement as: *audience-bind tokens to Board vs Gateway (RFC 8707) **AND** enforce disjoint role/scope assignment at `auth` so no identity holds both — with the per-ticket check at the Board.*

**Why SSD over DSD for agents:** an autonomous agent controls its own session activation, so "not-simultaneously-active" (DSD) is insufficient — make approve⊕execute **impossible to hold** (SSD). DSD is acceptable only for human operators legitimately wearing multiple hats at different times.

**Recommendation.** **Encode SoD in two structurally-separate tiers. Tier 1: model the four holders as atomic scopes; declare an SSD conflict set (approve/execute at minimum, ideally all four pairwise) enforced as an assignment-time invariant in `auth` over the inherited permission set; give agent roles zero credential scope; mirror as a tested Cedar `forbid` guardrail at each app's authz check. Tier 2: `auth` is the single source of the `proposer_id`/`approver_id`; the Board enforces `proposer_id != approver_id` per ticket as a non-overridable maker-checker condition. Ship Stage-7 conformance tests proving (i) `auth` refuses conflicting grants, (ii) the `forbid` guardrail denies dual-holder principals, (iii) the Board rejects `proposer == approver`. Use SSD (not DSD) for the approve/execute split.**

---

## 6. Human operator auth vs agent auth — both flows

**Findings.** One self-hostable OIDC provider serves both flows simultaneously because OAuth/OIDC separates the *grant* used to obtain a token from the *identity* it represents; the flows converge on one principal store and are distinguished at issuance/validation by **audience, scopes, and lifetime**. ([Keycloak OIDC layers](https://www.keycloak.org/securing-apps/oidc-layers))

**Human operator flow (interactive):** Authorization Code + PKCE (S256). First factor = passkey/WebAuthn (passwordless, phishing-resistant), TOTP as recovery second factor — all inside the IdP's composable auth flows, no SaaS. Humans get a browser SSO session + refresh token bounded by SSO Session Idle, with short access tokens silently renewed. Keycloak reference defaults: Access Token Lifespan 5 min, SSO Session Idle 30 min, SSO Session Max 10 h (all per-client overridable). ([Keycloak sessions #14128](https://github.com/keycloak/keycloak/discussions/14128), [RH build of Keycloak 26](https://docs.redhat.com/en/documentation/red_hat_build_of_keycloak/26.0/html/server_administration_guide/managing_user_sessions)) *(Passkeys are origin-bound to the RP ID — the proxy's final public hostname/TLS must be settled before credential registration.)*

**Agent flow (non-interactive):** one first-class service-account identity **per agent** (never shared), authenticating with a per-agent asymmetric key. **Client Credentials returns NO refresh token** (RFC 6749 §4.4.3) — the agent re-mints on expiry for automatic rotation; disabling the account gives immediate revocation. Short access-token lifespan (1–5 min). Sender-constrain with mTLS (RFC 8705) or **DPoP (RFC 9449)** so a leaked token is unusable off-host. ([RFC 8705](https://datatracker.ietf.org/doc/html/rfc8705), [RFC 9449](https://www.rfc-editor.org/rfc/rfc9449.html))

> **Correction — DPoP maturity:** Keycloak **DPoP is GA since 26.4 (Oct 2025)** — remove it from "likely build-time workarounds." ([Keycloak DPoP 26.4](https://www.keycloak.org/2025/10/dpop-support-26-4))

> **Correction — mTLS termination:** "mTLS terminated at the proxy" preserves certificate-bound tokens (`cnf.x5t#S256`) **only if** the proxy forwards the verified client cert/thumbprint to `auth` and the RS. Terminating without forwarding silently breaks the sender-constraining guarantee.

**Convergence/enforcement:** every app's MCP surface is an OAuth 2.1 RS (per MCP `2025-11-25`): advertises its AS via RFC 9728, MUST validate `aud`=self (RFC 8707/9068), MUST NOT pass tokens through. ([MCP 2025-11-25](https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization))

> **Correction — Keycloak RFC 8707:** Keycloak has **no native RFC 8707 resource-parameter support as of v26** — it ignores `resource` and uses a proprietary audience mechanism. Injecting the correct `aud` via **audience protocol mappers + client scopes/policies is MANDATORY, not an optional fallback**, and each app's mapper must be scoped so audiences never overlap (this is the actual per-app SoD enforcement point). ([Keycloak #35743](https://github.com/keycloak/keycloak/discussions/35743))

> **Correction — Zitadel grant:** if Zitadel is chosen, service-account private_key_jwt uses the **jwt-bearer authorization grant**, not `client_credentials` + client-assertion (Keycloak's model) — do not assume one config shape.

> **SoD enforcement clarity:** enforce SoD at the identity's **role/scope grants** (never assign an agent an approval-capable role), not merely by keeping approval and execution audiences out of the same token — a dual-scoped identity could mint two separate single-audience tokens.

> **MCP framing:** MCP `2025-11-25` standardizes the **interactive** (auth-code + PKCE) path; the `client_credentials` **agent** path is only *acknowledged* (MAY), so the agent surface's guarantees rest on general OAuth 2.1, not MCP-specific MUSTs.

**Recommendation.** **Run one self-hosted OIDC provider behind the proxy and model both flows explicitly. Humans: Auth Code + PKCE (S256), passkey/WebAuthn first factor + TOTP recovery, apex SSO cookie + short access tokens. Agents: per-agent service accounts, asymmetric client auth (grant shape pinned to the chosen IdP), Client Credentials, short TTL, NO refresh token, sender-constrained (DPoP now GA in Keycloak 26.4, or mTLS with cert/thumbprint forwarded downstream). Every MCP surface validates `aud`=self; on Keycloak, treat per-app audience mappers as required plumbing. Enforce SoD at the role/scope-grant level. Express budgets as custom claims/attributes enforced downstream, not native OIDC.**

---

## 7. Concrete stack / library recommendations (all flagged to verify at build)

> The dedicated "stack-libraries" research input for this stage was a **placeholder/test fixture** (its two cited URLs were RFC 2606 reserved example domains with no substance). The recommendations below are therefore synthesized from the substantive, verified findings in the other nine topic areas and **must be re-run as a first-class build-time bake-off** before Planning locks anything.

**Identity provider (the AS + principal store) — self-hostable candidates:**

| Candidate | Shape | Machine-identity fit | Notes |
|---|---|---|---|
| **Keycloak** | JVM, mature, clustered; needs external RDBMS (Postgres/MariaDB/MySQL/…); default dev DB is now **`dev-file`** (dev-only, not H2 as older docs said) | Service accounts via `client_credentials` + `private_key_jwt`/mTLS; DPoP GA 26.4; token exchange (RFC 8693) | **No native RFC 8707** — audience mappers mandatory. Most features, heaviest ops. ([db](https://www.keycloak.org/server/db), [MCP authz server](https://www.keycloak.org/securing-apps/mcp-authz-server)) |
| **Zitadel** | Go single binary, event-sourced built-in audit log | Service users via **jwt-bearer grant** (preferred), client-creds, or opaque PATs | Built-in audit attractive given "markdown is source of truth"; verify RFC 8707. ([service accounts](https://zitadel.com/docs/guides/integrate/service-accounts/authenticate-service-accounts)) |
| **Authelia** | Lightweight SSO portal; **SQLite (`local`)** or Postgres/MySQL | Session cookie + `HeaderAuthorization` bearer over one forward-auth endpoint | Closest analogue to the desired `auth` shape; SQLite fine single-instance. ([SQLite](https://www.authelia.com/configuration/storage/sqlite/)) |
| **Ory Hydra** | Pure OAuth2/OIDC server, headless | `client_credentials` + RFC 7662 introspection | **No built-in user store** (pair with Ory Kratos) — more parts. ([Hydra](https://github.com/ory/hydra)) |
| **Authentik** | Python; can also be forward-auth proxy | Service accounts; **can** accept provider `client_secret` AND asymmetric JWT assertions (`client_assertion_type=jwt-bearer` via Federated OIDC Sources) | Real disqualifiers are **single-secret-per-provider** and **360-day default token TTL** — *not* inability to do per-agent asymmetric keys (correction). ([M2M](https://docs.goauthentik.io/add-secure-apps/providers/oauth2/machine_to_machine/)) |

Front-runners for this suite: **Keycloak** (max features/token-exchange/DPoP) or **Zitadel** (Go single binary + built-in audit); **Authelia**-shaped lightweight profile is attractive if a bespoke `auth` is written. **SPIFFE/SPIRE** is deferred (over-scaled). ([SPIRE](https://spiffe.io/docs/latest/spire-about/spire-concepts/))

**Policy engine (PDP):** **AWS Cedar** (Apache-2.0 Rust crate, embeddable, stateless, `forbid` guardrails, deterministic) as primary, with a separate PIP/counter store; **OPA/Rego** if policy-as-code distribution is preferred; **OpenFGA/Zanzibar** only if reverse-index/relationship queries become core. ([Cedar](https://docs.cedarpolicy.com/auth/authorization.html), [OPA](https://www.openpolicyagent.org/docs/policy-language))

**Budget/counter store:** **Redis** with GCRA (rate/cooldown) + leased `INCR`/`DECR` semaphore (concurrency); atomic Lua for token-bucket variants. ([GCRA](https://brandur.org/rate-limiting), [redis-gcra](https://github.com/Losant/redis-gcra))

**Reverse proxy (from the proxy service, still unresolved):** **Traefik** (`ForwardAuth`, `RateLimit`, OSS `InFlightReq`; distributed RL is Hub/Enterprise; `trustForwardHeader` deprecated) or **Caddy** (`forward_auth`, must be **≥ 2.11.2** for CVE-2026-30851). ([Traefik ForwardAuth](https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/), [Caddy forward_auth](https://caddyserver.com/docs/caddyfile/directives/forward_auth))

**Token/identity carrier:** RFC 9068 JWT access tokens (`typ` `at+jwt` is **SHOULD**, not MUST), asymmetric-signed (ES256/RS256/EdDSA) so apps hold only the public JWKS; record `sub`, `client_id` (may equal `sub` in client-credentials), `scope`, `aud`, `iss`, `jti`, `exp` per audit line, correlated with a W3C Trace Context `traceparent`. ([RFC 9068](https://datatracker.ietf.org/doc/html/rfc9068), [W3C Trace Context](https://opentelemetry.io/docs/concepts/context-propagation/))

**Storage for `auth` itself:** SQLite behind a storage interface is defensible at homelab scale (Authelia model); document a Postgres migration path and **load-test SQLite's single-writer throughput** against dozens of concurrent agents doing auth events + budget decrements. ([Authelia SQLite](https://www.authelia.com/configuration/storage/sqlite/), [Keycloak requires RDBMS](https://www.keycloak.org/server/db))

**Recommendation.** **Re-run stack selection as a first-class build-time bake-off (the Stage-1 input was a placeholder). Leading configuration: one self-hosted OIDC AS (Keycloak or Zitadel front-runners), Cedar-embedded PDP + Redis PIP/counter store, Redis GCRA + leased semaphore for budgets, RFC 9068 asymmetric JWT + JWKS as the identity carrier with `traceparent` correlation, and either Traefik or Caddy (pinned past the 2026 forward-auth CVEs) as the front door. Verify every RFC/spec capability (RFC 8707 resource indicators, 7662/7009 endpoints, 8693 token exchange, 9068 `at+jwt`, DPoP, per-client short TTL) against the exact chosen product/version — do not inherit from these notes.**

---

## 8. Recommendations for the auth-relevant decisions ARCHITECTURE.md deferred to research

1. **Storage (SQLite vs Postgres):** `auth` owning SQLite is fine at ~dozens-of-agents single-instance scale (no HA requirement); put it behind a storage interface with a documented Postgres migration path for when a second replica or heavy concurrent-write load appears. Keycloak's RDBMS mandate reflects clustering, not identity-sourcing. **Load-test the single-writer path before committing.** ([Authelia SQLite](https://www.authelia.com/configuration/storage/sqlite/), [Keycloak db](https://www.keycloak.org/server/db))
2. **Token format:** hybrid — short-lived asymmetric JWTs (local hot-path verification via JWKS) **plus** a server-side refresh/session store for revocation, bounding staleness by the short TTL rather than a per-request introspection round-trip; optional emergency `jti` denylist for surgical instant revocation. Avoid both pure-stateless-JWT (no revocation) and per-request opaque-introspection (latency/SPOF on every MCP call). ([RFC 7662](https://www.rfc-editor.org/rfc/rfc7662.html), [RFC 9700](https://datatracker.ietf.org/doc/rfc9700/))
3. **Authorization decision location:** coarse identity/role/scope in the token; SoD-critical (approve⊕execute mutual exclusion, no self-approval) and mutable budget state in a central PDP `auth` owns and apps query as PEPs — SoD must be provable against one live source, not a stale claim.
4. **Budget enforcement:** layered — proxy for cheap coarse rate-limits, `auth`/MCP-server layer as the authoritative compute/time/concurrency/cooldown accountant, and the **physical destructive-action stop at the Gateway chokepoint** (with Mission Control's global kill switch). `auth` must never be the *sole* physical thing standing between an agent and execution.
5. **Proxy interop:** the proxy terminates TLS and delegates every request to `auth` via forward-auth; `auth` is the sole issuer of the verdict + signed identity; backends trust identity **only** from `auth` (ideally a signed token, not bare headers); the proxy **MUST strip all client-supplied identity/trust headers**.

> **CRITICAL correction — Traefik CVE-2026-35051:** the authoritative advisories ([GHSA-6384-m2mw-rf54](https://github.com/traefik/traefik/security/advisories/GHSA-6384-m2mw-rf54), [GitLab](https://advisories.gitlab.com/golang/github.com/traefik/traefik/v2/CVE-2026-35051/)) describe this as an **X-Forwarded-PREFIX spoofing** ForwardAuth bypass rated **CVSS 7.8** — NOT an `X-Forwarded-User`/`Groups` identity-injection bug rated 8.1 (that framing came from a secondary blog and misattributes the vector). Fixed in **v2.11.43 / v3.6.14 (also v3.7.0-rc.2)**. Broaden the rule to the real 2026 Traefik ForwardAuth CVE cluster — also **CVE-2026-39858** (header-alias / underscore-vs-dash spoofing) and **GHSA-5m6w-wvh7-57vm** (forwarded-alias pre-auth decision bypass). The design invariant motivated by all of them: **never trust any client-settable header for identity/trust context.**

> **Regression test must be proxy-agnostic:** assert that *no* client-supplied identity/prefix/trust header survives ingress, regardless of whether Caddy or Traefik ships (the Caddy CVE-2026-30851 and Traefik CVE-2026-35051 are each proxy-specific, but the invariant is shared).

**Recommendation.** **Adopt an Authelia-shaped lightweight profile hardened for SoD: SQLite-behind-interface (+ Postgres path, load-tested); short-lived asymmetric JWT + server-side revocation store (+ optional `jti` denylist); coarse-token / central-live-PDP split with approve⊕execute mutual exclusion and no-self-approval; layered budgets with the physical stop at the Gateway; forward-auth with mandatory client-header stripping, signed-token verification at backends, and proxies pinned past the 2026 CVE clusters. The deliberate price — one `auth` PDP call on the destructive path (not the common path) and a stateful `auth` — is correct for Critical-infra.**

---

## Verify at build time

**Spec revisions & versions**
- **MCP authorization spec revision.** `2025-11-25` is current stable as of 2026-06-30; the **`2026-07-28` RC is locked (2026-05-21) and finalizes 2026-07-28** — ~1 month out. Pin the exact revision and re-read the normative MUSTs; the `2025-11-25` Standards-Compliance section lists **five** references (adds OAuth Client ID Metadata Documents `draft-ietf-oauth-client-id-metadata-document-00`), not four. Add **RFC 9207 `iss` validation** now (mandated by the RC) for the single-AS/many-RS topology. ([MCP RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/), [RFC 9207](https://www.rfc-editor.org/rfc/rfc9207.html))
- **OAuth 2.1 draft.** MCP pins `draft-ietf-oauth-v2-1-13`; IETF has since published **draft-15 (Mar 2026)** and draft-14 expired 2026-04-23 — the MCP pin is two revisions behind. Confirm status at build. ([datatracker](https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/))
- **Proxy versions/CVEs.** Caddy **≥ 2.11.2** (CVE-2026-30851; check sibling CVE-2026-52845). Traefik **≥ v2.11.43 / v3.6.14** (CVE-2026-35051 = X-Forwarded-Prefix, CVSS 7.8; also CVE-2026-39858, GHSA-5m6w-wvh7-57vm). Traefik `trustForwardHeader` deprecated. Confirm latest stable Traefik v3.x and Caddy v2.x on the GitHub releases pages directly.
- **Keycloak:** default dev DB is now `dev-file` (not H2); confirm supported-DB list; confirm DPoP GA (26.4+); confirm per-client short access-token lifespan override.

**Transports & forward-auth config**
- Confirm whether each app's MCP surface uses **Streamable HTTP** (OAuth applies) or **stdio** (env creds, OAuth SHOULD NOT apply). Budgets and OAuth authz only bind on HTTP surfaces.
- Verify per-tool-call budget enforcement against the chosen MCP transport/SDK (Streamable-HTTP/SSE multiplexing hides per-request proxy middleware).
- Confirm the exact forward-auth option names / header-copy syntax on the pinned proxy version; whether `Authorization` is auto-forwarded to `auth` or must be added; and that the verify endpoint returns 2xx only on allow.
- Add a proxy-agnostic regression test: injected client identity/prefix/trust header is stripped even when `auth` returns 200 without it.

**IdP capability matrix (per chosen product/version)**
- Native **RFC 8707** resource-parameter support vs mandatory audience-mapper workaround (Keycloak v26 = **no native support**).
- `private_key_jwt` client auth + per-client JWKS registration; the exact **grant shape** (client_credentials+assertion vs jwt-bearer).
- RFC 7009 `/revoke` + RFC 7662 `/introspect`; grant-family cascade on refresh revoke; refresh rotation **with reuse-detection family invalidation** (RFC 9700).
- RFC 8693 token exchange (`act`/`may_act`) if delegation is needed; RFC 9068 `at+jwt`; DPoP (`cnf`/`jkt`) and/or mTLS cert-bound tokens (`cnf.x5t#S256`) with thumbprint forwarded downstream.
- Ability to model agents as first-class users with per-identity roles/scopes + custom budget claims (budgets are almost certainly custom claims, not built-in).

**Primary-source attributions to fix**
- Cite OWASP Non-Human Identity Top 10 and NIST SP 800-63B primaries (not the secondary aggregators) for the shared-secret/short-lived-credential guidance.
- Cite NIST/ANSI **INCITS 359-2012 (R2022)** (Sandhu spec PDFs) for SSD/DSD cardinality and SSD-under-hierarchy; drop SP 800-92 (wrong document).
- Cedar "formally-verified evaluation" — verify the claim against Cedar's verification work at build.

**Other**
- SQLite single-writer throughput under real agent fan-out (auth events + budget decrements) — load-test before committing to SQLite over Postgres.
- `typ at+jwt` is SHOULD not MUST; `sub` MAY equal `client_id` in client-credentials — record both and disambiguate by identity type.
- RFC 7662 cache bound ("MUST NOT cache beyond `exp`") applies only when the response carries `exp`; for destructive paths do not cache at all.

---

## Open design questions to settle before Planning

1. **Token strategy for the kill-switch:** opaque + per-request RFC 7662 introspection (instant revoke, IdP is a per-request hard dependency) vs short-TTL JWT + pushed `jti`/subject denylist (offline fast path) — decide by the latency/kill-switch needs of dozens of continuous agents. Note DPoP is anti-theft, **not** a revocation-freshness substitute for introspection/denylist.
2. **IdP selection bake-off:** Keycloak vs Zitadel vs Ory Hydra(+Kratos) vs Authentik vs bespoke Authelia-shaped — on native `private_key_jwt` machine identity, per-client short TTL, RFC 7009/7662/8707/8693 support, DPoP/mTLS cert-bound tokens, and built-in audit.
3. **Per-agent signing key lifecycle:** where keys live (file / OS keystore / TPM), how protected on a compromised host, who provisions and rotates them, and whether proxy-level mTLS certs come from an internal CA.
4. **Multi-audience token acquisition across the SoD chain:** how one agent obtains/manages four per-resource tokens (or repeated step-ups) to drive Board+CMDB+Vault+Gateway for a single destructive action, without any token spanning approve+execute.
5. **PDP engine + PIP:** Cedar (embedded, stateless) vs OPA/Rego vs OpenFGA/SpiceDB — decided by whether reverse-index "what can this agent call" and relationship/delegation graphs are core; and where live budget counters (Redis) plug in as the PIP.
6. **Budget↔token↔Mission Control binding:** are budgets re-evaluated at token-mint, at the MCP resource server, or both; and are counters a shared "two-views-one-state" surface with Mission Control's WIP limits/global kill switch, or separate?
7. **Fail-open vs fail-closed per action risk class** on Redis/`auth` unavailability, plus the operator **break-glass/override** path — an explicit Critical-infra sign-off decision, and the implied **HA requirement** for `auth`.
8. **Self-approval enforcement point:** Board-only, or should `auth` also refuse to mint an approval token whose subject equals the ticket's `proposer_id`? Avoid a gap or double-owner ambiguity.
9. **DSD needed at all?** Or is pure SSD + zero-credential agent roles sufficient (DSD only matters if a single human operator identity must hold multiple holder-scopes and switch per session)?
10. **Proxy pre-validation vs pass-through** of agent bearer tokens at the forward-auth endpoint; and cookie CSRF/`SameSite` posture for cross-subdomain mutating XHR from the human UI.
11. **Delegation depth** (RFC 8693 nested `act`) bounds, if agent→service→service chains are allowed, to prevent confused-deputy escalation.
12. **Audit correlation:** stable `sub` namespace across all per-audience tokens for a coherent "who did this," plus proxy generation/forwarding of W3C `traceparent`.

---

## Sources

**IETF RFCs**
- RFC 6749 OAuth 2.0 (§4.4 Client Credentials) — https://datatracker.ietf.org/doc/html/rfc6749#section-4.4.3
- RFC 6750 Bearer Token Usage — https://datatracker.ietf.org/doc/html/rfc6750
- RFC 7009 Token Revocation — https://www.rfc-editor.org/rfc/rfc7009.html
- RFC 7523 JWT Client Authentication & Authorization Grants — https://datatracker.ietf.org/doc/html/rfc7523
- RFC 7591 Dynamic Client Registration — https://datatracker.ietf.org/doc/html/rfc7591
- RFC 7662 Token Introspection — https://www.rfc-editor.org/rfc/rfc7662.html
- RFC 8414 Authorization Server Metadata — https://datatracker.ietf.org/doc/html/rfc8414
- RFC 8693 Token Exchange (`act`/`may_act`) — https://datatracker.ietf.org/doc/html/rfc8693
- RFC 8705 mTLS / Certificate-Bound Access Tokens — https://datatracker.ietf.org/doc/html/rfc8705
- RFC 8707 Resource Indicators — https://www.rfc-editor.org/rfc/rfc8707.html
- RFC 9068 JWT Profile for OAuth 2.0 Access Tokens — https://datatracker.ietf.org/doc/html/rfc9068
- RFC 9207 Authorization Server Issuer Identification — https://www.rfc-editor.org/rfc/rfc9207.html
- RFC 9396 Rich Authorization Requests — https://www.rfc-editor.org/rfc/rfc9396.html
- RFC 9449 DPoP — https://www.rfc-editor.org/rfc/rfc9449.html
- RFC 9700 OAuth 2.0 Security BCP — https://datatracker.ietf.org/doc/rfc9700/
- RFC 9728 Protected Resource Metadata — https://datatracker.ietf.org/doc/html/rfc9728
- OAuth 2.1 draft tracker — https://datatracker.ietf.org/doc/draft-ietf-oauth-v2-1/

**MCP authorization spec**
- MCP Authorization 2025-11-25 (current stable) — https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- MCP Authorization 2025-06-18 — https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization
- MCP Transports 2025-06-18 — https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
- MCP 2026-07-28 Release Candidate — https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/
- Den Delimarsky — What's new in 2025-11-25 authz — https://den.dev/blog/mcp-november-authorization-spec/
- Auth0 — MCP spec updates (June 2025) — https://auth0.com/blog/mcp-specs-update-all-about-auth/
- Descope — MCP auth spec — https://www.descope.com/blog/post/mcp-auth-spec
- Aaron Parecki — 2025-11-25 authz update — https://aaronparecki.com/2025/11/25/1/mcp-authorization-spec-update

**Identity providers**
- Keycloak — OIDC layers — https://www.keycloak.org/securing-apps/oidc-layers
- Keycloak — Configuring the database — https://www.keycloak.org/server/db
- Keycloak — Supported configurations — https://www.keycloak.org/server/supported-configurations
- Keycloak — MCP authz server — https://www.keycloak.org/securing-apps/mcp-authz-server
- Keycloak — RFC 8707 discussion #35743 — https://github.com/keycloak/keycloak/discussions/35743
- Keycloak — DPoP GA 26.4 — https://www.keycloak.org/2025/10/dpop-support-26-4
- Keycloak — session lifetimes #14128 — https://github.com/keycloak/keycloak/discussions/14128
- Red Hat build of Keycloak 26 — sessions — https://docs.redhat.com/en/documentation/red_hat_build_of_keycloak/26.0/html/server_administration_guide/managing_user_sessions
- Zitadel — Authenticate service accounts — https://zitadel.com/docs/guides/integrate/service-accounts/authenticate-service-accounts
- Zitadel — Private Key JWT — https://zitadel.com/docs/guides/integrate/service-accounts/private-key-jwt
- Zitadel — Personal Access Token — https://zitadel.com/docs/guides/integrate/service-accounts/personal-access-token
- Zitadel — Token exchange — https://zitadel.com/docs/guides/integrate/token-exchange
- Ory Hydra — https://github.com/ory/hydra
- Authentik — Machine-to-Machine — https://docs.goauthentik.io/add-secure-apps/providers/oauth2/machine_to_machine/
- Authentik — Service accounts — https://docs.goauthentik.io/sys-mgmt/service-accounts/
- Authentik — RFC 8705 issue #22370 — https://github.com/goauthentik/authentik/issues/22370
- Authentik — Traefik proxy provider — https://docs.goauthentik.io/add-secure-apps/providers/proxy/server_traefik/
- Authelia — SQLite storage — https://www.authelia.com/configuration/storage/sqlite/
- Authelia — Storage introduction — https://www.authelia.com/configuration/storage/introduction/
- Authelia — Proxy authorization reference — https://www.authelia.com/reference/guides/proxy-authorization/
- Authelia — Caddy integration — https://www.authelia.com/integration/proxies/caddy/

**Workload identity**
- SPIRE concepts — https://spiffe.io/docs/latest/spire-about/spire-concepts/
- SPIRE agent (SVID TTL/rotation) — https://spiffe.io/docs/latest/deploying/spire_agent/
- SPIFFE SVIDs — https://spiffe.io/docs/latest/deploying/svids/

**Policy engines & authz models**
- Cedar — Authorization — https://docs.cedarpolicy.com/auth/authorization.html
- Cedar — Implementing roles — https://docs.cedarpolicy.com/bestpractices/bp-implementing-roles.html
- OPA — Policy language — https://www.openpolicyagent.org/docs/policy-language
- Oso — OPA vs Cedar vs Zanzibar — https://www.osohq.com/learn/opa-vs-cedar-vs-zanzibar
- Permit.io — policy engine showdown — https://www.permit.io/blog/policy-engine-showdown-opa-vs-openfga-vs-cedar
- Auth0 — ReBAC/ABAC via OpenFGA & Cedar — https://auth0.com/blog/rebac-abac-openfga-cedar/
- Aserto — OAuth2 scopes are not permissions — https://www.aserto.com/blog/oauth2-scopes-are-not-permissions
- Aserto — the authorization 3-body problem — https://www.aserto.com/blog/the-authorization-3-body-problem
- Aserto — where to enforce authz — https://www.aserto.com/blog/where-should-i-enforce-my-authorization-policy
- AuthZed — pitfalls of JWT authorization — https://authzed.com/blog/pitfalls-of-jwt-authorization
- NIST SP 800-162 (ABAC) — https://csrc.nist.gov/pubs/sp/800/162/upd2/final
- Sandhu 1996 RBAC model — https://csrc.nist.gov/csrc/media/projects/role-based-access-control/documents/sandhu96.pdf
- ANSI INCITS 359 RBAC spec — https://profsandhu.com/journals/tissec/ANSI+INCITS+359-2004.pdf
- Corrected RBAC spec (Stony Brook) — https://www3.cs.stonybrook.edu/~stoller/papers/rbac-spec.pdf
- Li/Bizri/Tripunitara — Mutually-Exclusive Roles & SoD — https://ece.uwaterloo.ca/~tripunit/papers/sod-j.pdf
- FORGE (agentic policy, use with caution) — https://arxiv.org/abs/2602.16708

**Budgets / rate & concurrency limiting**
- brandur — GCRA rate limiting — https://brandur.org/rate-limiting
- redis-gcra — https://github.com/Losant/redis-gcra
- Redis — token bucket rate limiter — https://redis.io/docs/latest/develop/use-cases/rate-limiter/go/
- Netflix concurrency-limits — https://github.com/Netflix/concurrency-limits/blob/main/README.md
- Netflix — Performance Under Load — https://netflixtechblog.medium.com/performance-under-load-3e6fa9a60581
- Little's Law (Brooker) — https://brooker.co.za/blog/2018/06/20/littles-law.html
- Backpressure by Design — https://debugg.ai/resources/backpressure-by-design-2025-concurrency-limits-admission-control-queueing-patterns

**Proxy / front-door**
- Traefik ForwardAuth — https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/forwardauth/
- Traefik RateLimit — https://doc.traefik.io/traefik/middlewares/http/ratelimit/
- Traefik InFlightReq (OSS) — https://doc.traefik.io/traefik/reference/routing-configuration/http/middlewares/inflightreq/
- Traefik releases/deprecation — https://doc.traefik.io/traefik/deprecation/releases/
- Traefik CVE-2026-35051 advisory (GHSA-6384-m2mw-rf54) — https://github.com/traefik/traefik/security/advisories/GHSA-6384-m2mw-rf54
- Traefik CVE-2026-35051 (GitLab) — https://advisories.gitlab.com/golang/github.com/traefik/traefik/v2/CVE-2026-35051/
- Caddy forward_auth — https://caddyserver.com/docs/caddyfile/directives/forward_auth
- Caddy CVE-2026-30851 (GHSA-7r4p-vjf4-gxv4) — https://github.com/caddyserver/caddy/security/advisories/GHSA-7r4p-vjf4-gxv4
- Caddy CVE-2026-30851 (NVD) — https://nvd.nist.gov/vuln/detail/CVE-2026-30851
- Caddy fix PR #7545 / cause PR #6608 — https://github.com/caddyserver/caddy/pull/7545
- Kong Rate Limiting — https://developer.konghq.com/plugins/rate-limiting/
- Envoy global rate limiting — https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/other_features/global_rate_limiting
- Pomerium JWT claim headers — https://www.pomerium.com/docs/reference/jwt-claim-headers
- oauth2-proxy overview — https://oauth2-proxy.github.io/oauth2-proxy/7.2.x/configuration/overview/

**Tokens, revocation, audit correlation**
- vitalvas — JWT vs opaque access tokens — https://blog.vitalvas.com/post/2026/06/23/jwt-vs-opaque-access-tokens/
- Duende — why a standard JWT access token matters — https://duendesoftware.com/blog/20260421-why-a-standard-jwt-access-token-matters
- OpenTelemetry — context propagation — https://opentelemetry.io/docs/concepts/context-propagation/
- WorkOS — DPoP explained — https://workos.com/blog/dpop-rfc-9449-explained
- WorkOS — OAuth resource indicators — https://workos.com/blog/oauth-resource-indicators-rfc-8707

**To replace with primaries at build (currently secondary)**
- OWASP Non-Human Identity Top 10 — https://owasp.org/www-project-non-human-identities-top-10/
- Maker-checker / four-eyes overview — https://blog.xtrm.com/posts/maker-checker-process