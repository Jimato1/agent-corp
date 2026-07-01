# Proxy observability & the Mission Control "Edge" panel consumer contract

> **Scope.** The proxy EMITS observability data; it does not render it. This document (a) specifies
> what the proxy exposes and how it is access-controlled, and (b) **documents — does not build —** the
> contract a future **Mission Control (MC)** read-only "Edge" panel consumes, so that dashboard can be
> built in MC later **without any change to the proxy**. The proxy remains pure plumbing: **no UI, no
> authenticated surface of its own.** It became observ*able*, not interactive.

## 1. What the proxy exposes, and where

| Surface | Where | Format | Reachable by |
|---|---|---|---|
| **Structured access log** | container **stdout** (Docker logs / a log shipper) | JSON lines | whatever collects container logs (internal) |
| **Metrics** | `http://proxy:9100/metrics` | Prometheus text | containers on the `edge` network only |
| **Edge info** | `http://proxy:9100/edge-info` | JSON | same |
| **Health** | `http://proxy:9100/healthz` | `ok` | same (also the compose healthcheck) |

**:9100 is internal-only by construction** — see §4. None of this is on the public `*.SUITE` :443 site.

## 2. Access-log JSON shape (per request)

Native Caddy access-log fields (JSON) plus the proxy's custom `log_append` fields. **Sanitization
guarantees (Stage-5 hardened):**
- **Request side:** `Authorization` + `Cookie` are auto-redacted by Caddy AND deleted by the filter;
  `X-Auth-Identity` (the auth JWT copied onto the upstream request) is deleted.
- **Response side:** `Set-Cookie`, `X-Auth-Identity`, and `Remote-User/Remote-Groups/Remote-Name/Remote-Email`
  are deleted from `resp_headers` — auth's verify response can carry a real signed identity JWT /
  principal into the response, and Caddy does **not** auto-redact those (CARRY-IN 2).
- **Not redacted (intentionally):** the authoritative `traceparent` — it is the audit correlation key
  (bound to `sub` inside `X-Auth-Identity`), a non-secret needed for the `edge_req_id`↔trace join.

No token contents and no identity-header *values* ever appear in a log line.

```jsonc
{
  "ts": 1782910000.123,               // native: unix seconds
  "level": "info",
  "logger": "http.log.access",
  "msg": "handled request",
  "request": {
    "remote_ip": "10.0.0.9",          // native: DIRECT peer (trusted_proxies unset) — real client
    "proto": "HTTP/2.0",
    "method": "GET",
    "host": "board.corp.example.com", // native: subdomain → app (label == audience)
    "uri": "/tickets",
    "headers": { /* Authorization / Cookie / X-Auth-Identity DELETED */ }
  },
  "status": 401,                      // native: client-facing status (see §3 for the auth-decision mapping)
  "size": 0,
  "duration": 0.0071,                 // native: total request seconds (includes verify subrequest)
  "app": "board.corp.example.com",    // log_append: convenience copy of host
  "edge_req_id": "3f2c…",             // log_append: {http.request.uuid} — edge correlation id
  "scrub_stripped": "true",           // log_append: a forged inbound X-Auth-Identity was seen & stripped
  "authz": "allow"                    // log_append: PRESENT only on forward-auth ALLOW (absent on deny)
}
```

Notes: `edge_req_id` is the **edge** correlation id. The authoritative, `sub`-bound `traceparent` is
minted by **auth** inside the signed `X-Auth-Identity` (proxy strips any client `traceparent`); joining
`edge_req_id` ↔ auth's `traceparent` is a Stage-7 joint-checkpoint item (BUILD.md), not done at the edge.

## 3. Deriving the forward-auth decision (the mapping MC uses)

The proxy tags **allow** explicitly (`authz:"allow"`); **denies are read from `status` on an app
subdomain** (this avoids mutating security-critical deny handling for a log field):

| Observation on an app subdomain | Forward-auth decision |
|---|---|
| `authz:"allow"` present | **allow** (request reached the app; final `status` is the app's) |
| `status` 401, no `authz` | **deny — unauthenticated** (agent) |
| `status` 302, no `authz` | **redirect to login** (browser) |
| `status` 403, no `authz` | **deny — refused/posture** (kill-switch, break-glass, zero-scope) |
| `status` 502/504, no `authz` | **fail-closed** (auth unreachable / hung — the ≤250 ms timeout) |

## 4. Access control — how the trust boundary is enforced

1. **Network isolation:** `:9100` has **no `ports:` mapping** in compose → not published to the host or
   the internet; only containers on the internal `edge` network can reach it. MC scrapes `proxy:9100`
   over that network.
2. **Not on the public site:** metrics/logs are a **separate listener**, never a path on `*.SUITE` :443,
   so they cannot be reached through the public edge and do not sit behind (or bypass) forward-auth.
3. **Source-IP guard (defense-in-depth):** the `:9100` site serves only `remote_ip private_ranges`
   (accurate because `trusted_proxies` is unset → real direct peer); anything else gets 403.
4. **Auth is enforced DOWNSTREAM at MC:** the *human* sees this data only through MC's own subdomain,
   which is behind the forward-auth gate like every app. The proxy itself gains **no login** — it must
   not, because it is the trust boundary. So: proxy = unauthenticated internal emitter on an isolated
   port; MC = the authenticated, gated reader/renderer.
5. **No secrets emitted:** logs are sanitized (§2); metrics are counters/gauges; `/edge-info` carries
   only mode + suite domain. The one proxy secret (the DNS token, public mode) is never exposed.

## 5. Metrics available to the MC panel

Native Caddy Prometheus series (enabled by `servers { metrics }`), plus `/edge-info`:

| MC panel widget | Source series / field (label) |
|---|---|
| Request rate (per app) | `caddy_http_requests_total{handler,server}` — rate(), split by host/subdomain |
| Status distribution (per app) | `caddy_http_responses_total{code}` / request totals by status class |
| Forward-auth allow vs deny | derived: `authz:"allow"` count (logs) vs 401/302/403 status counts (§3); metrics corroborate via per-subdomain status |
| Verify-endpoint latency | `caddy_http_request_duration_seconds` on the authgate reverse_proxy handler (the subrequest to `auth`) |
| Verify timeout / fail-closed count | 502/504 count on app subdomains (§3) + upstream error series for the `auth` upstream |
| Per-app upstream health | `caddy_reverse_proxy_upstreams_healthy{upstream}` — one per app container |
| TLS mode (INTERNAL/PUBLIC) | `/edge-info` → `mode` |
| Cert status / expiry | **[documented gap]** not a native Caddy metric — MC reads it via a TLS/blackbox probe of an edge host, or via Caddy's admin API certificate info; see §7 |

## 6. The MC "Edge" panel (documented for later — DO NOT build here)

A read-only MC page, itself behind the auth gate, that would render:
- **Edge status header:** TLS mode (INTERNAL/PUBLIC), suite domain, proxy up/health, cert expiry countdown.
- **Per-app grid** (one row per subdomain = audience): request rate, error rate, p50/p95 latency,
  upstream healthy Y/N, forward-auth allow/deny/redirect/fail-closed counts.
- **Forward-auth panel:** allow vs deny vs redirect vs fail-closed over time; spikes in 401/403 (possible
  attack or auth outage); `scrub_stripped` rate (inbound identity-forgery attempts being neutralized).
- **Verify-endpoint panel:** verify latency distribution and timeout/fail-closed count (auth health as
  seen from the edge) — the leading indicator that auth is degrading.
- **Recent access log tail** (sanitized JSON), filterable by app/status/edge_req_id.

MC builds this by scraping `proxy:9100/metrics` + `/edge-info` and tailing the proxy's JSON logs from
the log store. **Contract stability:** the field names in §2, the `:9100` paths, and the §3 mapping are
the interface — hold them stable and MC needs no proxy change. New fields are additive.

## 7. Documented gaps / follow-ups (not blocking this Build)

- **Cert expiry as a metric:** not native. Options for later: a tiny sidecar exporter (blackbox_exporter
  TLS probe), or read Caddy's admin API cert info. Documented, not built.
- **`edge_req_id` ↔ auth `traceparent` join:** Stage-7 joint checkpoint (needs real auth).
- **Log volume/retention:** the log *shipper* and retention live outside the proxy (operator/MC infra).
- **[VERIFY-AT-BUILD OBS-1..5]:** the Caddy directive syntax for `servers{metrics}`, the `metrics`
  handler, `log … format filter … fields … delete`, `log_append`, `{http.request.uuid}`, and
  `remote_ip private_ranges` must be confirmed on the pinned Caddy at first boot (they are standard v2
  directives; `test/verify.sh` steps 13–15 exercise them). None can widen the public surface — the worst
  case of a wrong field is an empty/absent log field, and a wrong global breaks boot loudly (caught by
  `caddy validate`, verify.sh step 0), never a silent exposure.
```
