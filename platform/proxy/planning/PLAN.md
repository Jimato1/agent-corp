# Stage 2 — Planning: `proxy` (Reverse Proxy / Edge, Standard, pure plumbing)

> **Status:** Stage-2 PLAN. This is a *plan*, not code — edge topology, routing map, Caddyfile structure, the consumed forward-auth contract, TLS strategy, the custom build, security carry-forwards, and an adversarial review folded in (§11).
>
> **Primary sources:** `research/RESEARCH.md` (cited "R§n"); the **authoritative forward-auth contract** `platform/auth/planning/PLAN.md` **§8** (cited "A§8.x") — *consumed verbatim, not reinvented*; shared context `context/ARCHITECTURE.md` + `context/PROCESS.md`.
>
> **Surfaces (unchanged from Stage 1):** the proxy has **NO agent/MCP surface** and **NO UI** (proxy CLAUDE.md). It holds **no product state and no secrets** beyond TLS key material + one DNS API token. Its only artifact is reproducible configuration (a Caddyfile + an xcaddy image + compose wiring).

---

## 1. Scope and how the Stage-2 exit criteria apply to pure plumbing

**What this plan specifies:** the edge that fronts the whole suite — per-app subdomain routing to each container, TLS termination via a DNS-01 wildcard, and the forward-auth front door that puts *every* app behind `auth` **before** any request reaches an app. Every design choice here is downstream of a decision already made in `auth`'s plan or the proxy's own RESEARCH.md; where a fact must still be confirmed at build it is tagged **[VERIFY-AT-BUILD]**, and where it depends on the operator's environment it is tagged **[CONFIRM-OPERATOR]**.

**Adapted exit criteria (PROCESS.md Stage 2).** The generic exit criterion — "data model and both surfaces (MCP + UI) are specified over one shared state" — is **N/A by construction** for this app, and that is not a gap to fill but a property to state explicitly:

| Generic Stage-2 artifact | Proxy status | Reason |
|---|---|---|
| Data model | **N/A** | Proxy holds no product state; the only persisted bytes are the ACME cert/key store (`/data`), which is a rebuildable cache, not canonical state. |
| MCP (agent) surface | **N/A** | Proxy exposes no agent tools (ARCHITECTURE §4; proxy CLAUDE.md). Agents route *through* it, never *call* it. |
| UI (human) surface | **N/A** | Proxy is configured as infrastructure (Caddyfile/IaC), not operated through a rich surface. |
| "One shared state, two sibling views" | **N/A** | There is one edge and zero product surfaces; the invariant is vacuously satisfied. |
| **Concrete config surface (this app's real artifact)** | **Specified (§4–§9)** | Caddyfile structure, routing map, TLS strategy, forward-auth wiring, custom build, deploy wiring. |
| Adversarial review (Standard rigor) | **Done (§11)** | Edge failure modes, identity-header spoofing, auth-verify-down — folded in or accepted-with-reason. |

So the operative Stage-2 exit for this app is: **the config surface is fully specified over the (stateless) edge, the forward-auth contract is consumed verbatim, and the adversarial review is resolved.**

---

## 2. Settled decisions and environment assumptions

**Settled (do not reopen):**
1. **Caddy**, via a **static Caddyfile** — *not* docker.sock label discovery (R§2 recommendation; the app set is known/fixed).
2. A **custom xcaddy image is acceptable**, carrying the DNS-01 wildcard module **and** the edge rate-limit module in one image (R§4, R§6.3).
3. **Public Let's Encrypt certs via DNS-01 wildcard** (R§4).

**Environment assumptions — design against these but each is [CONFIRM-OPERATOR], with a stated fallback:**

| # | Assumption | Fallback if false |
|---|---|---|
| E1 | Operator owns a **public domain** and uses a **DNS provider with an ACME-DNS API** — **assume Cloudflare** unless told otherwise (R§4). | Another supported `caddy-dns` provider → swap the one build module + token. If *no* public domain at all → **internal CA** (Caddy local CA / step-ca, R§4), accepting that every browser **and every agent container** must trust the private root. Plan the assumed public-wildcard path; keep internal-CA as a documented, swappable branch (§6). |
| E2 | An **internal resolver exists (or is stood up)** to answer `*.<suite-domain>` with the proxy's LAN IP (**split-horizon DNS**, R§4), so internal-only hostnames get publicly-trusted certs with no public ingress. | If no resolver: either expose the proxy publicly (undesirable for a homelab admin plane) or fall back to the internal CA (E1 fallback). Split-horizon is strongly preferred; standing up Pi-hole/Unbound/AdGuard is a small, one-time operator task. |

Both assumptions gate TLS (§6), not routing or forward-auth; if either flips to the internal-CA branch, §4/§5/§7 are unchanged and only §6 swaps issuer.

---

## 3. Edge topology at a glance

```
  AGENTS (Bearer JWT +DPoP)        HUMAN OPERATOR (browser, apex-scoped SSO cookie)
         │                                    │
         ▼                                    ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │  proxy  (custom Caddy; single static Caddyfile)                        │
 │  edge :443 — terminates public TLS (DNS-01 wildcard *.SUITE)          │
 │                                                                       │
 │  For EVERY request, in order (Caddyfile `route`, §5):                 │
 │   1. SCRUB   unconditionally delete all identity/trust/prefix headers │  A§8.6 R1
 │   2. VERIFY  GET auth:/api/verify  (fwd Authorization+Cookie only)    │  A§8.3
 │              ├─ 200 → copy X-Auth-Identity upstream, continue         │  A§8.5
 │              ├─ 302 → return redirect (browser)                       │
 │              ├─ 401 → return verbatim (agent)                         │
 │              ├─ 403 → return verbatim (posture deny)                  │
 │              └─ 5xx/timeout/unreachable → FAIL CLOSED (deny)          │  A§8.3, decision#3
 │   3. PROXY   reverse_proxy <app-container>:<port> (shared docker net) │
 │   + response: security headers, Server stripped; per-IP rate limit    │  R§6
 └───────┬───────────────────────────────────────────────────────────────┘
         │ (internal docker network `edge`)                    ▲
         ▼                                                     │ GET /api/verify (mTLS SHOULD)
  board / notes / mc / drive / chat / pdf /                    │
  gateway / vault / cmdb  (each an OAuth 2.1 RS,   ────────►  auth  (verify endpoint +
  independently validates aud=self — A§8.6 R3)                 OIDC login/portal/jwks)
```

- The proxy is **defense-in-depth, never the authorization boundary** (A§8.1): it answers only "authenticated, and may this principal reach this app-surface at all?" Every RS still independently validates its own audience-bound token (A§8.6 Rule 3). Fine-grained "may this agent call this destructive tool?" is the RS's Tier-1/Tier-2 job, never the proxy's.
- The proxy is a **per-request SPOF that adds latency suite-wide** — accepted at homelab scale; it is the reason `auth` carries an HA target (A§8.1). See §11-F5.

---

## 4. Routing map — one subdomain per component

All app containers share a Docker network (`edge`); the proxy resolves each by **service name**. **The subdomain label MUST equal `auth`'s audience segment** (auth PLAN §3.2: the `app` segment *is* the RFC 8707 audience discriminator), because the proxy sends `X-Forwarded-Host` and `auth` selects the target audience from it (A§8.3). This makes host→audience mechanical and is a hard design constraint, not a cosmetic choice.

| Subdomain (`= aud`) | Component | Container (service) | Port † | Behind forward-auth? | Notes |
|---|---|---|---|---|---|
| `board` | Board | `board` | 8080 | **Yes** | coordination |
| `notes` | Notes | `notes` | 8080 | **Yes** | |
| `mc` | Mission-Control | `mission-control` | 8080 | **Yes** | **subdomain `mc` = audience `mc`** (auth §3.2), *not* `mission-control` |
| `drive` | Drive | `drive` | 8080 | **Yes** | large uploads → raised body cap (§8) |
| `chat` | Chat | `chat` | 8080 | **Yes** | streaming → GET-verify avoids body-buffering (A§8; R§5) |
| `pdf` | PDF | `pdf` | 8080 | **Yes** | Safe-class app; large render bodies |
| `gateway` | Gateway | `gateway` | 8080 | **Yes** | Critical-infra RS; monitor UI + MCP behind door |
| `vault` | Vault | `vault` | 8080 | **Yes** | Critical-infra RS |
| `cmdb` | CMDB | `cmdb` | 8080 | **Yes** | Critical-infra RS |
| `auth` | Auth (IdP) | `auth` | 8080 | **NO — exempt** | see §5.4: wrapping the authenticator in forward-auth creates a login/redirect loop |
| *(edge itself)* | **proxy** | — | — | — | the proxy has **no subdomain of its own** (no UI/MCP); optional loopback-only `/healthz` |

† **[VERIFY-AT-BUILD]** the container listen port is each app's declared internal port, fixed at *that app's* Build stage. `8080` is the planning placeholder/convention; the Caddyfile reads it from a per-app variable so a change is a one-line edit, never a structural one.

**Adding a new app later** = one new `@host` matcher + `handle` line that `import`s the shared app snippet; the wildcard cert already covers it, so **no new certificate request** (R§3).

---

## 5. Caddyfile structure

One static, version-controlled Caddyfile, built from a few reusable **snippets** so the repeated TLS + scrub + forward-auth logic exists **once** (R§2, R§3). Values that vary by environment come from env vars (`{$VAR}`), so the file itself carries no secrets.

### 5.1 Global options

```caddyfile
{
    email {$ACME_EMAIL}

    # DNS-01 wildcard issuance (custom module, §9). Provider assumed Cloudflare (E1).
    acme_dns cloudflare {$CLOUDFLARE_API_TOKEN}

    servers {
        # X-Forwarded-* trust (S2-03): the proxy is the FIRST hop — operator browser + agent
        # containers connect DIRECTLY and all sit inside the private ranges. So do NOT set
        # `trusted_proxies static private_ranges`: that would tell Caddy to honor client-supplied
        # X-Forwarded-For/Proto from exactly those clients (spoofable). Leave it UNSET → Caddy
        # trusts no proxy and uses the direct peer address. Only if a real upstream proxy is ever
        # added (e.g. a public Cloudflare path under E1) do we trust *that* proxy's specific public
        # egress CIDRs — never private_ranges. (R§6.4)
        # Slowloris/slow-request mitigation (R§6.5); generous only on upload routes.
        timeouts {
            read_header 10s
            idle        2m
        }
    }
    # (Optional) pin the ACME CA to LE staging first, then production — §6.
}
```

### 5.2 Reusable snippets

```caddyfile
# (a) Security response headers — R§6.1/6.5. Applied to every app response.
(sec_headers) {
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains"   # NB: no `preload` yet (R§6.1)
        X-Content-Type-Options    "nosniff"
        X-Frame-Options           "DENY"
        Referrer-Policy           "strict-origin-when-cross-origin"
        Permissions-Policy        "geolocation=(), camera=(), microphone=()"
        Content-Security-Policy   "default-src 'self'; frame-ancestors 'none'; form-action 'self'"  # conservative; per-app override allowed
        -Server                                                   # strip stack fingerprint (R§6.5)
    }
}

# (b) Unconditional inbound identity/trust/prefix scrub — A§8.6 Rule 1 (Caddy CVE-2026-30851 lesson, R§6.4).
#     MUST run BEFORE the verify subrequest AND before upstream forwarding.
(scrub) {
    request_header -X-Auth-Identity
    request_header -X-Forwarded-User
    request_header -X-Forwarded-Groups
    request_header -X-Forwarded-Prefix                 # CVE-2026-35051
    request_header -Remote-User
    request_header -Remote-Groups
    request_header -Remote-Name
    request_header -Remote-Email
    request_header -X-Forwarded-Tls-Client-Cert
    request_header -X-Forwarded-Tls-Client-Cert-Thumbprint
    request_header -Traceparent                        # client trace is untrusted (A§8.7)
    request_header -Tracestate
    # [VERIFY-AT-BUILD] underscore/case aliases (X_Auth_Identity) — CVE-2026-39858/52845:
    #   confirm the pinned Caddy normalizes/strips underscore variants; the §11/A§8.9
    #   regression test is the gate. Add explicit deletes if normalization is not guaranteed.
    #
    # [VERIFY-AT-BUILD / S2-04] The 12 deletes above are the EXPLICIT-NAMES half of A§8.6 R1
    #   ("Strip list = denylist-by-prefix + explicit names"). If the pinned Caddy supports
    #   wildcard/prefix header-name deletes, ALSO strip by FAMILY: X-Forwarded-*, Remote-*,
    #   X-Auth-*. If it does NOT, this enumeration is a CONTRACT-SYNC obligation to auth §8.7:
    #   the A§8.9 regression test MUST fail if auth's emitted identity-header set ever exceeds
    #   this list (an added Remote-*, a future X-Auth-* claim, or a second cert-header form must
    #   not be able to slip through by not being enumerated). See §11.1-S2-04, §12.
}

# (c) Forward-auth front door — implements A§8.3/8.4/8.5 verbatim.
(authgate) {
    forward_auth auth:{$AUTH_VERIFY_PORT} {
        uri    /api/verify
        method GET                                     # side-effect-free (A§8.3)

        # Bound the verify SPOF (A§8.3 "≤250 ms … MUST fail closed"; S2-02). A HUNG auth
        # (accepts TCP, never replies — Redis stall, slow PIP fan-out, verify flood) must DENY
        # within the bound, not block the edge worker indefinitely. Refused-connection fail-closed
        # is already covered (F1); this covers the distinct *slow* failure mode.
        transport http {
            dial_timeout            2s
            response_header_timeout 250ms
        }

        # forward_auth already sets X-Forwarded-Method/Uri and passes X-Forwarded-For/Proto/Host;
        # it forwards the ORIGINAL Authorization + Cookie unchanged (A§8.3) — DPoP header passes too.
        header_up X-Forwarded-Host {host}              # selects the app audience at auth (A§8.3)

        # On the 200 branch ONLY, copy auth's signed identity onto the upstream request (A§8.6 R2).
        copy_headers X-Auth-Identity

        # [VERIFY-AT-BUILD] Pin success to EXACTLY 200 (A§8.5: a stray 204/206 is NOT allow) and
        # ensure copy_headers fires only on 200, via a handle_response @good {status 200} override
        # on the pinned Caddy version. Non-200 (302/401/403/5xx) responses are returned to the
        # client verbatim by forward_auth — which is precisely the A§8.5 decision table.
    }
}

# (d1) Edge rate limiting — custom `caddy-ratelimit` module (§9). Keyed on the DIRECT peer
#      ({remote_host}), NEVER {client_ip} (which would trust spoofable X-Forwarded-For; S2-03).
#      Numeric zone sizes are finalized in Stage 5, but PLACEMENT (before authgate) is fixed
#      here as a Stage-2 structural decision so load is shed BEFORE the verify subrequest (S2-05).
(ratelimit) {
    rate_limit {
        zone edge_per_ip {
            key    {remote_host}
            events 100                 # [Stage 5] size the baseline
            window 1m
        }
    }
}

# (d2) Per-app site body. Order-locked by `route` (S2-05/S2-06):
#   sec_headers  (OUTERMOST → wraps EVERY response, incl. authgate 302/401/403 short-circuits
#                 and the 429 from ratelimit — a `header` handler earlier in the chain wraps
#                 later handlers' responses)
#   → ratelimit  (sheds abusive load BEFORE the expensive verify subrequest)
#   → scrub      (deletes identity headers before verify AND before upstream)
#   → authgate   (verify) → reverse_proxy.  Arg 0 = upstream.
(app) {
    route {
        import sec_headers
        import ratelimit
        import scrub
        import authgate
        reverse_proxy {args[0]}
    }
}
```

Why `route{}`: it executes directives in **written order**, guaranteeing `scrub` precedes the verify subrequest and the upstream proxy, `ratelimit` precedes `authgate`, and `sec_headers` wraps every response including short-circuits (Caddy's default directive order does not otherwise guarantee this). This ordering is the security core — see §11-F2 and §11.1. **[VERIFY-AT-BUILD]** confirm on the pinned Caddy that a `header` handler placed earlier in a `route{}` applies to a later handler's short-circuit response (S2-06).

### 5.3 The single wildcard site with per-app routing

Using one `*.SUITE` site block means Caddy obtains **one DNS-01 wildcard cert** (R§4) while each app remains a clear per-host `handle`:

```caddyfile
*.{$SUITE_DOMAIN} {
    tls {
        dns cloudflare {$CLOUDFLARE_API_TOKEN}         # wildcard needs the DNS challenge (R§4)
    }

    @board host board.{$SUITE_DOMAIN}
    handle @board { import app board:8080 }

    @notes host notes.{$SUITE_DOMAIN}
    handle @notes { import app notes:8080 }

    @mc host mc.{$SUITE_DOMAIN}
    handle @mc { import app mission-control:8080 }     # audience `mc`

    @drive host drive.{$SUITE_DOMAIN}
    handle @drive {
        request_body { max_size 512MB }                # raised for artifact uploads (R§6.5)
        import app drive:8080
    }

    @chat host chat.{$SUITE_DOMAIN}
    handle @chat { import app chat:8080 }

    @pdf host pdf.{$SUITE_DOMAIN}
    handle @pdf {
        request_body { max_size 128MB }
        import app pdf:8080
    }

    @gateway host gateway.{$SUITE_DOMAIN}
    handle @gateway { import app gateway:8080 }

    @vault host vault.{$SUITE_DOMAIN}
    handle @vault { import app vault:8080 }

    @cmdb host cmdb.{$SUITE_DOMAIN}
    handle @cmdb { import app cmdb:8080 }

    # auth is EXEMPT from the forward-auth GATE only — NEVER from scrub or rate limiting (§5.4, S2-01)
    @auth host auth.{$SUITE_DOMAIN}
    handle @auth {
        route {
            import sec_headers
            import ratelimit          # [Stage 5] a TIGHTER zone on the login/verify path (S2-05)
            import scrub              # MUST scrub here too: protects auth's login portal + its own admin API
            reverse_proxy auth:8080   # no authgate: auth self-authenticates (a gate would loop login)
        }
    }

    # default-deny: any unmapped subdomain
    handle { respond "Not found" 404 }
}
```

*(Variant, if a single wildcard block is undesirable: separate top-level `board.SUITE { … }` blocks also work but each fetches a per-name cert via DNS-01 — still fine and still under LE rate limits, R§4/R§4-rate-limits — at the cost of 10 certs instead of one. The wildcard block above is the recommended default.)*

### 5.4 Why `auth` is exempt from forward-auth

`auth` **is** the authenticator. Its `/authorize`, `/token`, `/jwks`, AS-metadata, `/api/verify`, and login portal are **public by design** (A§9.1 Group 1) and must be reachable *without* a prior verify — wrapping them in `authgate` would make every login attempt loop back through a login it cannot yet pass. `auth` enforces authn/authz on its own surfaces internally (it is an OAuth 2.1 RS for its own admin API). Therefore the `auth` subdomain gets TLS + security headers but **no `authgate`**. This is the one deliberate hole in "forward-auth on every route," and it is safe precisely because auth self-authenticates. **The exemption is from the `authgate` gate ONLY — the `auth` route still runs `scrub` and rate limiting (§5.3, S2-01):** dropping `scrub` here would let client-supplied `X-Auth-Identity`/`Remote-*`/`X-Forwarded-*` reach auth's login portal and its own admin API raw — the exact CVE-2026-30851 conditional-strip gap, re-created by omission. (Rate limiting on the auth login/verify path is *tighter*, not absent — §8.)

---

## 6. TLS / certificate strategy

**Default path (E1+E2 true): one publicly-trusted DNS-01 wildcard `*.<SUITE_DOMAIN>` from Let's Encrypt, behind split-horizon DNS.** (R§4.)

- **Why DNS-01:** the only ACME challenge that issues **wildcards** and validates **hosts with no public inbound reachability** — control is proven via a `_acme-challenge` TXT record, so no app container ever needs public ingress (R§4).
- **Issuance:** the custom image bundles `caddy-dns/cloudflare` (§9); a single `tls { dns cloudflare … }` per §5.3 drives issuance. Provider = Cloudflare **[CONFIRM-OPERATOR E1]**; swapping providers = swap one build module + token.
- **Split-horizon:** an internal resolver answers `*.<SUITE_DOMAIN>` with the proxy's LAN IP; the public zone only ever carries transient `_acme-challenge` TXT records (R§4). Result: publicly-trusted TLS on private-only names, no custom root to distribute — which matters because **agent containers** would otherwise each need the private root installed. **[CONFIRM-OPERATOR E2].**
- **Cert persistence:** mount a named volume at Caddy's `/data` (ACME account + certs + keys) and `/config`. Losing `/data` forces re-issuance and can trip LE rate limits (R§4). Volume is the only stateful thing the proxy touches, and it is a rebuildable cache, not canonical state.
- **Staging-first:** dry-run against the LE **staging** endpoint (untrusted "Fake LE" root, effectively unbounded limits) before flipping to production, to avoid a rate-limit lockout during config iteration (R§4).
- **Rotation/lifetime:** auto-renewal is Caddy-managed; the Feb-2026 shorter-lifetime change (→45-day certs) left rate limits unchanged and keeps renewals exempt (R§4).

**Fallback path (E1 false — no public domain): internal CA.** Caddy's built-in local CA (or step-ca as a private ACME server) signs internal names automatically (R§4). Cost: every browser **and every agent container** must trust the private root. Keep this as a swappable issuer branch touching only §5.1/§5.3 TLS config.

**Interaction with the auth contract:** A§8.2 requires the **public hostname/TLS to be finalized *before* human passkey registration** (passkeys are origin-bound). So the operator must fix `<SUITE_DOMAIN>` and stand up TLS **first**, before auth onboards the operator's passkey. This sequencing is called out in §10.

---

## 7. Forward-auth wiring — consuming auth §8 verbatim

This section maps each clause of the authoritative contract (A§8) to concrete proxy behavior. **Nothing here is invented; where the contract says [VERIFY-AT-BUILD], it is carried forward, not resolved.**

### 7.1 The verify subrequest (A§8.3)
- **GET `/api/verify`** on the `auth` service, idempotent/side-effect-free. Reached only from the proxy (internal network).
- Proxy sends `X-Forwarded-Method/Proto/Host/Uri/For`; **`X-Forwarded-Host` selects the target app/audience**. Forwards the original **`Authorization`** and **`Cookie`** unchanged — the only client-supplied identity inputs `auth` reads.
- **Timeout target ≤ 250 ms; on timeout/5xx/unreachable → FAIL CLOSED (deny).** In Caddy, an unreachable/erroring `auth` yields a non-2xx (502) from `forward_auth`, which does **not** continue to the upstream handler — so fail-closed is the *default* behavior, consistent with **auth decision #3**. **[VERIFY-AT-BUILD]** confirm on the pinned Caddy that a dial failure denies (does not passthrough) and that `Authorization` + `Cookie` are forwarded on the subrequest (A§8.3).

### 7.2 Two credential types, fixed order (A§8.4)
`auth` resolves credential order (cookie-first, then Bearer) **inside** the verify endpoint; the proxy is agnostic — it forwards both `Cookie` and `Authorization` and lets `auth` decide. The proxy does **not** parse or prefer either. (This keeps the coarse gate's policy entirely in `auth`, per A§8.1/8.4.)

### 7.3 Response semantics — the status code *is* the contract (A§8.5)

| `auth` status | Proxy action (as configured) |
|---|---|
| **200** (and *exactly* 200) | copy `auth`'s `X-Auth-Identity` onto the upstream request, forward to the app |
| **302** | return the redirect to the browser verbatim (`Location` set by auth) |
| **401** | return verbatim to the agent; never redirect (echoes `WWW-Authenticate: Bearer`) |
| **403** | return verbatim (authenticated-but-refused / kill-switch / break-glass posture) |
| **5xx / timeout / unreachable** | **fail closed** (deny) |

**401-vs-302 is chosen by `auth`, not the proxy** (A§8.5) — the proxy just relays whatever non-200 status/headers `auth` returns. This is exactly `forward_auth`'s "copy the auth response back to the client on non-success" behavior, so the decision table is satisfied by construction; the only explicit override needed is **pinning success to exactly 200** (§5.2c, [VERIFY-AT-BUILD]).

### 7.4 Trust boundary — the security core (A§8.6)
- **Rule 1 (unconditional strip):** `(scrub)` deletes every identity/trust/prefix header **before** the verify subrequest and **before** upstream forwarding — *not* conditional on `auth` later setting a replacement. This is the exact Caddy **CVE-2026-30851** lesson (conditional-set-without-unconditional-delete) and the RESEARCH.md header-scrub CVE lesson (R§6.4). Strip operates on normalized names to also kill underscore/case aliases (**CVE-2026-39858 / 52845**) — [VERIFY-AT-BUILD] + regression test. **`scrub` runs on *every* route with no exception — including the `authgate`-exempt `auth` route (§5.3, S2-01)** — and the enumerated list is backed by prefix-family stripping / a contract-sync gate so it cannot silently fall behind auth §8.7 (S2-04).
- **Rule 2 (identity only if auth set it):** after 200, `copy_headers` re-injects **only** `X-Auth-Identity` from `auth`'s *response*. Because Rule 1 already deleted any client copy, a client-injected identity header can never survive to the upstream.
- **Rule 3 (RS re-validates):** enforced by each app backend, not the proxy — every RS validates its own `aud`=self (JWKS sig, `exp`, `iss` RFC 9207) and MUST NOT authorize off a bare forwarded header. Documented here as a **downstream obligation** the proxy depends on but does not implement.

### 7.5 Identity header `auth` sets (A§8.7)
- **`X-Auth-Identity`** — a signed JWT (distinct key from the AS access-token key). The proxy treats it as an **opaque value to copy on 200**, nothing more; it does not parse, trust, or act on it. Backends cryptographically verify it.
- **`Remote-*` convenience headers are NOT emitted by default** (A§8.7). The proxy's `(scrub)` strips any client-supplied `Remote-*` on **every** route including the `auth` route (§5.3, S2-01), so even if a future display-only `Remote-*` is added by auth, only auth's value can reach a UI. The proxy never authorizes off any advisory header (it never authorizes at all).
- **`traceparent`:** the proxy **strips the client-supplied `traceparent`** (untrusted, A§8.7). The **authoritative `traceparent` is server-generated and bound to the validated `sub`.** Because the proxy does not know `sub` until `auth` responds, the clean division is: **`auth`'s verify endpoint mints the authoritative `traceparent` inside `X-Auth-Identity`** (A§8.7 explicitly allows "proxy/`auth` GENERATES"), and the proxy's job is only to *destroy the client value* so it cannot be trusted downstream. **[VERIFY-AT-BUILD]** confirm generation ownership at build (proxy-generated trace-root vs auth-minted); if proxy-generated, add a spec-compliant W3C trace-root generator (a small header-set from a request UUID) — but do not fabricate a `sub` binding at the edge.

### 7.6 mTLS / sender-constraining (A§8.2)
- **Proxy→`auth`:** SHOULD be mTLS over the internal network (A§8.2). Planned as enabled; [VERIFY-AT-BUILD] cert provisioning for the internal hop.
- **Client-cert-bound tokens:** **[VERIFY-AT-BUILD, gated on auth §10]** — auth's v1 sender-constraining is likely **DPoP**, which needs **no proxy cert handling** (the proxy just forwards `Authorization` + the `DPoP` header untouched; the RS validates the proof). **If** mTLS cert-bound tokens ship instead, the proxy MUST forward the verified leaf-cert thumbprint as `X-Forwarded-Tls-Client-Cert[-Thumbprint]` to both `auth` and the RS, set from the *verified* TLS layer and itself subject to the strip-and-reinject rule (A§8.2). The `(scrub)` list already deletes any *client-supplied* copy of these headers; the reinjection from the verified TLS layer is the branch to wire only if mTLS-bound tokens are chosen.

### 7.7 Kill-switch / break-glass (A§8.8)
The proxy needs **no special logic**: on kill-switch, `auth`'s verify endpoint returns **403** for affected principals and the proxy simply relays it (§7.3). The **physical kill-switch bite stays at the Gateway**, never the proxy (A§8.8, ARCHITECTURE §"kill switch"). Break-glass is likewise an `auth`-side verify-endpoint mode; the proxy relays its status codes unchanged. The proxy must **not** implement any allow-all bypass.

### 7.8 CVE pinning (A§8.9)
Pin **Caddy ≥ 2.11.2** and **[VERIFY-AT-BUILD] additionally check CVE-2026-52845** (a later patch may be required); do not rely on any deprecated forward-header trust shortcut. The **A§8.9 proxy-agnostic regression test is owned by the auth contract but executed against this proxy** — see §11 exit gate.

---

## 8. Security defaults to carry into Stage 5

Direct carry-forward of RESEARCH.md §6, now bound to the concrete config above. Stage 5 (Security hardening) validates each:

- [ ] **TLS hardened:** rely on Caddy's secure-by-default TLS (min 1.2 / 1.3, modern ciphers/curves — do not override); certs from the single DNS-01 wildcard; `/data` on a persistent volume (R§6.2).
- [ ] **HSTS** on all app subdomains (`max-age=63072000; includeSubDomains`), **no `preload`** until the whole suite is confirmed permanently HTTPS-only (R§6.1).
- [ ] **Security headers** (`nosniff`, `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'`, `Referrer-Policy`, `Permissions-Policy`, conservative CSP with per-app override) via the `(sec_headers)` snippet (R§6.1).
- [ ] **Unconditional identity-header scrub** (`(scrub)`) before verify and upstream, on **every** route incl. `auth` (S2-01); enumerated names are the explicit half — prefix-family stripping added where supported, else the list is a contract-sync obligation to auth §8.7 with a failing regression test (S2-04). The A§8.6/CVE-2026-30851 core; verified by the A§8.9 regression test (R§6.4).
- [ ] **`X-Forwarded-*` sanitization:** **no** `trusted_proxies` (default trust-none → Caddy uses the direct peer); do **not** trust `private_ranges` (the clients live there). Rate-limit + audit attribution key on the **direct remote addr** (`{remote_host}`), never `{client_ip}` (R§6.4; S2-03).
- [ ] **Forward-auth gate on every app route**, default-deny; `auth` subdomain is the one documented gate exemption (§5.4) — but still scrubbed + rate-limited (S2-01); unmapped hosts hit the 404 default (R§6, A§8).
- [ ] **Edge rate limiting** (custom `caddy-ratelimit` module): a conservative per-IP baseline on all routes, and a **tighter** limit on the `auth` login/verify path to blunt brute force (R§6.3). **Placement — before `authgate`, keyed on the direct peer — is fixed in §5.2/§5.3; only the numeric zone sizes are deferred to Stage 5** (S2-05).
- [ ] **Server-token hygiene:** `-Server` strip (R§6.5).
- [ ] **Body-size + header-size limits + slow-request timeouts** at the edge; relaxed only on `drive`/`pdf` upload routes (R§6.5).
- [ ] **Secrets hygiene:** the *only* secret at this layer is the DNS API token — injected via env/Docker secret, never committed; no product secrets or state here (R§6).
- [ ] **Internal-hop encryption:** proxy→`auth` mTLS (A§8.2); proxy→app hops carry the signed `X-Auth-Identity` — [VERIFY-AT-BUILD] whether app hops need TLS or the docker network is trusted (§11-F6).

---

## 9. Custom xcaddy build definition

Two extra modules, one image (settled decision #2). Base pinned past the 2026 forward-auth CVEs (A§8.9).

```dockerfile
# ---- build stage: xcaddy with the two required modules ----
FROM caddy:2.11.2-builder AS build       # [VERIFY-AT-BUILD] bump to the tag carrying the
                                         # CVE-2026-52845 fix; confirm ≥2.11.2 baseline (A§8.9)
RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare \      # DNS-01 wildcard issuance (R§4, E1)
    --with github.com/mholt/caddy-ratelimit       # edge rate limiting (R§6.3)

# ---- runtime stage ----
FROM caddy:2.11.2
COPY --from=build /usr/bin/caddy /usr/bin/caddy
COPY Caddyfile /etc/caddy/Caddyfile
# /data (certs+ACME account) and /config persisted via named volumes (§6, §10)
```

| Module | Purpose | Source of requirement |
|---|---|---|
| `caddy-dns/cloudflare` | DNS-01 challenge for the wildcard cert (not in stock Caddy) | R§4; swap this one line for another provider under E1 |
| `mholt/caddy-ratelimit` | edge per-IP/per-zone rate limiting (not in stock Caddy) | R§6.3 |

- **[VERIFY-AT-BUILD]** exact base tag ≥ 2.11.2 that also carries the CVE-2026-52845 fix; the `caddy-dns/cloudflare` module version compatible with that Caddy; the `caddy-ratelimit` module's current directive syntax (§8 Stage-5 zone config).
- If E1 selects a non-Cloudflare provider, replace the `caddy-dns/*` line only; the rest of the image is unchanged.

---

## 10. Deployment wiring & sequencing (for Build stage)

- **Networks:** one internal Docker network `edge`; every app + `auth` + `proxy` attach to it. Only the proxy publishes `:443` (and `:80`→redirect). App containers publish **no host ports** — reachable only via the proxy.
- **Volumes:** `caddy_data:/data`, `caddy_config:/config`.
- **Secrets/env:** `ACME_EMAIL`, `SUITE_DOMAIN`, `CLOUDFLARE_API_TOKEN` (Docker secret), `AUTH_VERIFY_PORT`. No product secrets.
- **Healthcheck:** loopback `/healthz` (proxy-local, not a routed subdomain).
- **Ordering constraint (from A§8.2):** fix `SUITE_DOMAIN` + stand up TLS **before** the operator registers a passkey in `auth` (passkeys are origin-bound). Suggested boot order: proxy (TLS up, staging→prod) → `auth` (operator passkey onboarding) → remaining apps attach to `edge` as they are built.
- **Build order note:** per root CLAUDE.md, platform (`auth`, `proxy`) comes first; the proxy can route to apps incrementally as they come online (each is just a new `handle` line, §4).

---

## 11. Adversarial review (Standard rigor) — folded in

Red-team pass over three mandated axes: **edge failure modes, identity-header spoofing, auth-verify-down**. Each finding is either **folded** (changed the plan above) or **accepted-with-reason**.

| # | Axis | Attack / failure | Verdict | Resolution |
|---|---|---|---|---|
| **F1** | verify-down | `auth` verify endpoint unreachable/slow → does the proxy fail **open** (passthrough) or closed? | **FOLDED** | §7.1: Caddy `forward_auth` treats a dial error/5xx as non-2xx and does **not** continue to the upstream → fail-closed by default, matching auth decision #3. Added explicit [VERIFY-AT-BUILD] to *prove* dial-failure denies (a fail-open here would expose every app unauthenticated — the single worst edge bug). |
| **F2** | header spoofing | Client sends `X-Auth-Identity`/`Remote-Groups: approver`/`X-Forwarded-User: operator`; does it reach an app and get honored? | **FOLDED** | §5.2b `(scrub)` deletes them **unconditionally, before** verify and upstream (A§8.6 R1), inside a `route{}` that **order-locks** scrub → verify → proxy. Rule 2 re-injects only auth's `X-Auth-Identity`. Backstopped by A§8.6 R3 (every RS re-validates) + the mandatory A§8.9 regression test as a Stage-7 gate. |
| **F3** | header spoofing | Alias smuggling: `X_Auth_Identity` (underscore) or case variants bypass a dash-only strip list (CVE-2026-39858/52845). | **FOLDED (as gated risk)** | §5.2b notes normalized-name stripping + explicit [VERIFY-AT-BUILD] to confirm the pinned Caddy normalizes underscores; the A§8.9 test injects underscore/case variants. If normalization is not guaranteed, add explicit deletes. Not silently assumed. |
| **F4** | verify-down / DoS | `auth` up but overloaded (verify is a per-request SPOF, A§8.1) → suite-wide latency/timeouts, and fail-closed then denies *everything*. | **ACCEPTED-WITH-REASON + mitigations** | Inherent to putting a coarse gate at the edge; auth carries the HA target for exactly this (A§8.1). Mitigations planned: ≤250 ms verify timeout (bounds tail latency), edge rate limiting to shed abusive load before it reaches verify (§8), and the operator break-glass path (auth-side) to regain control. Accepted: a hard auth outage = suite-wide deny (safe direction), not a proxy bug to fix. |
| **F5** | edge failure | Proxy itself is a SPOF; if the proxy dies, the whole suite is unreachable. | **ACCEPTED-WITH-REASON** | True of any single-edge reverse proxy; acceptable at single-operator homelab scale (R§2, "one edge in front of every app"). Not worth HA-proxy complexity now; revisit if uptime needs grow. Cert store on a volume means a proxy restart re-serves existing certs without re-issuance (§6). |
| **F6** | trust boundary | Proxy→app hop carries the signed `X-Auth-Identity`; if the docker network is sniffable, could it be replayed to an app directly, bypassing the proxy? | **FOLDED (as obligation) + [VERIFY-AT-BUILD]** | `X-Auth-Identity` is short-TTL and `aud`-bound and the RS *also* validates its own audience-bound token (A§8.6 R3), so a replayed header alone grants nothing. App containers publish no host ports (§10) — only the proxy reaches them. Carried to Stage 5: decide whether proxy→app needs TLS or the `edge` network is a trusted boundary (§8 last item). |
| **F7** | routing | Unmapped subdomain (`*.SUITE` matches but no `@host`) — does it silently hit the last app or leak? | **FOLDED** | §5.3 ends with `handle { respond 404 }` (default-deny). No unmapped host reaches any app. |
| **F8** | routing/authz | Host↔audience mismatch: proxy sends `X-Forwarded-Host: mission-control` but auth's audience is `mc` → verify keys the wrong audience, or a mismatch is exploitable. | **FOLDED** | §4 makes the **subdomain label ≡ auth audience segment** a hard constraint (`mc`, not `mission-control`); documented as a design rule so no app is added with a mismatched label. |
| **F9** | auth exemption | The `auth` subdomain bypasses `authgate` (§5.4) — does that expose auth's admin surface unauthenticated? | **ACCEPTED-WITH-REASON** | auth self-authenticates all its surfaces (it is an RS for its own admin API, A§9.1); wrapping it would loop login. The exemption is scoped to the `auth` host only, still gets TLS + headers + (tighter) rate limiting, and exposes nothing the IdP doesn't already protect internally. |
| **F10** | credential order | Could the proxy's handling of `Cookie` vs `Authorization` diverge from auth's fixed order (A§8.4) and cause a confused-deputy? | **FOLDED** | §7.2: the proxy is deliberately **agnostic** — it forwards both and lets `auth` apply the cookie-first order. No proxy-side preference logic exists to diverge. |
| **F11** | body handling | `forward_auth` buffering the request body breaks streaming apps (chat/pdf) or enables a body-based bypass. | **FOLDED** | GET `/api/verify` is body-less by contract (A§8.3); Caddy's forward_auth does not forward the body to auth. Streaming upstreams are unaffected (R§5). Upload caps set per-route (§5.3). |

**Residual accepted risks:** F4 (verify SPOF latency), F5 (proxy SPOF) — both inherent to a single-edge homelab and owned by auth's HA target / operator break-glass, not solvable at the proxy layer without disproportionate complexity.

### 11.1 Second adversarial pass — multi-lens red-team panel (folded)

A second, independent panel (four lenses: edge-failure, header-spoof, verify-down, contract-fidelity) ran against the draft above and surfaced **7 findings (12 raw → 7 kept)**, all folded into §5–§8 and §12. This pass materially hardened the plan — the first-pass table (F1–F11) reasoned about the *intent*; this pass caught places where the *config as written* did not yet realize that intent.

| # | Sev | Defect | Contract/research clause | Resolution (folded) |
|---|---|---|---|---|
| **S2-01** | HIGH | `@auth` route omitted `import scrub` — client identity headers reached auth's portal + admin API raw | A§8.6 R1 + §8.10 step 1 (strip is unconditional on *every* request) | §5.3: `scrub` (+ rate-limit) added to the `@auth` handle; exemption narrowed to the `authgate` gate only; §5.4/§7.4/§7.5 corrected. |
| **S2-02** | HIGH | `(authgate)` had no outbound verify timeout — a *hung* (not refused) auth blocks edge workers indefinitely; the ≤250 ms half of A§8.3 was unimplemented | A§8.3 ("≤250 ms … MUST fail closed"); contradicted own F4 mitigation | §5.2c: `transport http { dial_timeout 2s; response_header_timeout 250ms }`; new §12 gate that a hung verify denies within the bound. |
| **S2-03** | HIGH | `trusted_proxies static private_ranges` trusts the *client* population (clients are the private ranges) → spoofable `X-Forwarded-For`, corrupting rate-limit keys + attribution | R§6.4 (Caddy trusts no proxy by default; the shortcut assumes a real upstream proxy) | §5.1: `trusted_proxies` removed (default trust-none → direct peer); rate-limit keyed on `{remote_host}`; §8 item corrected. |
| **S2-04** | MED | `(scrub)` was explicit-names-only — any header auth adds beyond the 12 names survives (CVE-2026-30851 reopening) | A§8.6 R1 ("denylist-by-prefix + explicit names") | §5.2b: prefix-family stripping where supported, else an explicit contract-sync obligation to auth §8.7 enforced by a failing A§8.9 regression test; §12 gate. |
| **S2-05** | MED | `rate_limit` had no structural slot before `authgate`; F4's "shed before verify" was unrealizable as written | own §11-F4 + §8 checklist | §5.2d/§5.3: `ratelimit` snippet placed before `authgate` in the `route{}`; only numeric sizes deferred to Stage 5. |
| **S2-06** | LOW | `sec_headers` imported *after* `authgate` → absent on 302/401/403 short-circuit responses | R§6.1 (headers on every response) | §5.2d: `sec_headers` moved to outermost in the `route{}` so it wraps short-circuits; [VERIFY-AT-BUILD] the wrapping semantics. |
| **S2-07** | LOW | auth §8.4's CSRF/`SameSite` [VERIFY-AT-BUILD] (assigned to "proxy/UI planning") was silently dropped | A§8.4 | §12: recorded as **not a proxy-layer control** (proxy sets no apex cookie, mints no CSRF token) and re-assigned to auth (cookie `SameSite`/`Domain`) + each consuming app's UI (anti-CSRF token). |

*Dropped (1):* a `traceparent` generation-ownership finding — self-rated speculative and already carried as the §7.5 [VERIFY-AT-BUILD]. *Confirmed-correct-as-written (no finding):* fail-closed on a *refused* verify (F1), client `traceparent` strip (§7.5), and the `authgate` exemption rationale (§5.4).

---

## 12. Carry-forward gates (to Build / Security / Verification)

**[VERIFY-AT-BUILD] on the pinned Caddy version:**
1. Dial-failure/5xx from `auth` **denies** (never passes through) — F1.
2. **A *hung* (TCP-accepted, no reply) verify denies within the `response_header_timeout` bound**, not just a refused one — S2-02.
3. `Authorization` + `Cookie` **are** forwarded on the verify subrequest (A§8.3).
4. Success pinned to **exactly 200**; `copy_headers` fires only on 200 (A§8.5).
5. Underscore/case header aliases are normalized/stripped (A§8.9; CVE-2026-39858/52845) — F3.
6. **Prefix-family header deletes** are supported (else the enumerated scrub list is a contract-sync obligation and the A§8.9 test fails if auth §8.7 exceeds it) — S2-04.
7. A `header` handler earlier in a `route{}` **wraps a later handler's short-circuit response** (so `sec_headers` covers 302/401/403/429) — S2-06.
8. `rate_limit` keys correctly on the **direct peer** with no `trusted_proxies` set — S2-03.
9. `traceparent` authoritative-generation ownership (proxy vs auth-minted) — §7.5.
10. mTLS-bound-token branch vs DPoP (auth §10) — whether cert-thumbprint forwarding is needed — §7.6.
11. Base image tag ≥ 2.11.2 carrying the CVE-2026-52845 fix; module versions — §9.

**Re-assigned out of the proxy layer:** auth §8.4's CSRF / cookie-`SameSite` [VERIFY-AT-BUILD] is **not a proxy-layer control** (the proxy sets no apex cookie and mints no CSRF token) — it belongs to `auth` (cookie `SameSite`/`Domain` attributes) and each consuming app's UI (anti-CSRF token). Recorded here so the clause is visibly accounted for, not lost (S2-07).

**[CONFIRM-OPERATOR]:** E1 (public domain + DNS provider; assume Cloudflare) and E2 (internal resolver for split-horizon) — §2.

**Stage-7 exit gate owned here (from A§8.9):** the proxy-agnostic header-injection regression test passes — injected `X-Auth-Identity` / `Remote-User: operator` / `Remote-Groups: approver` / `X-Forwarded-User` / `X-Forwarded-Prefix: /admin` / crafted `traceparent` (+ underscore/case variants) never reach or influence an upstream; on 200-without-set the injected header does not survive (the CVE-2026-30851 regression); on 200-with-set upstream sees only auth's value.
