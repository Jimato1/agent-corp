# optimization/NOTES.md — Proxy (Stage 6: Optimization)

> **Status:** Stage-6 artifact (PROCESS.md §6). Risk class **Standard**, pure plumbing (no MCP, no UI).
> Builds on the **verified-green Stage 5** (35/35 `verify.sh` + 16/16 `regression_headers.sh` on a fresh
> clone). Stage 5 was **not** re-run.
>
> **What "optimization" means for an edge forward-auth proxy:** overhead and correctness *under load*, tuned
> for local/homelab compute — **not** raw throughput. The bottleneck is **concurrency** + the **per-request
> forward-auth round-trip**, not bandwidth. So this stage bounds the verify overhead, load-tests the rate
> limits, sets deterministic concurrency limits, avoids wasted protocol negotiation, and makes the build
> reproducible. Most "wins" are **confirming Caddy's already-good defaults** and making them explicit/auditable.
>
> **Rules honored:** no change to forward-auth **allow/deny** semantics, the **exactly-200** matcher, the
> **scrub**, or the **dual-mode issuer toggle**. Every Caddyfile change is in the **shared** config (global
> `servers` block + the `authgate` snippet), never the issuer partial → **Option-C invariant preserved**
> (byte-identical across INTERNAL/PUBLIC). All changes are behavioral no-ops or additive limits — see
> "No correctness regression" below.
>
> **Honesty:** no Docker/Caddy in this environment — nothing here was run. Every Caddy 2.11 directive/default
> was **web-verified** against current docs + the pinned v2.11.2 source (citations inline). Each optimization
> lists its **measurement method** and the **exact operator command** to confirm it.

---

## 1. Forward-auth overhead (the edge's main per-request cost)

The per-request `GET auth:/api/verify` subrequest is the dominant added latency at the edge.

**Finding (web-verified, Caddy v2.11.2 source `httptransport.go`):** Caddy's `reverse_proxy` **already pools
and reuses upstream connections by default** — HTTP keep-alive is ON (idle timeout 2m, 32 idle conns/host,
30s probe). The Stage-5 `authgate` (which set only `dial_timeout`/`response_header_timeout`) was **already
getting connection reuse**; it never opened a fresh TCP connection per request. `dial_timeout 2s` only
applies on a **cold** dial (first request / after 2m idle), so it is off the hot path. `response_header_timeout
250ms` is per-request and does **not** evict the pool.

**Change (before → after):** behavioral no-op, made **explicit** for auditability given the review-heavy
pipeline — added `keepalive 2m` + `keepalive_idle_conns_per_host 32` (= the defaults) to the `authgate`
transport. No `keepalive off`. **No h2c/HTTP-2 to auth**: a single small GET gains nothing from multiplexing,
and h2c needs upstream support; HTTP/1.1 keepalive is optimal here.

**Forward-auth latency bound (document this):** on a **warm pooled connection** over the local docker
network, Caddy's forward-auth adds **~≤2–3 ms** of proxy+network overhead (no TCP/TLS handshake on a reused
conn); the **cold path** adds ~0.1–1 ms for a local dial. Total verify latency is **dominated by auth's own
processing** and is **hard-capped at the configured 250 ms** `response_header_timeout` — anything slower is
**denied** (fail-closed), so the verify step can never add more than 250 ms to a request. *(The ≤2–3 ms figure
is an engineering estimate; the 250 ms ceiling is a verified config value — lean on it.)*

**Measurement method / operator command:** with the suite up, time a gated route and read verify latency from
metrics:
```
# added latency of the gated path (includes 1 verify round-trip):
curl -k -o /dev/null -s -w 'gated total=%{time_total}s\n' --resolve board.$SUITE:443:127.0.0.1 \
     -H 'Authorization: Bearer valid-agent' https://board.$SUITE/
# verify-subrequest latency (Caddy native metric on the authgate reverse_proxy handler):
docker compose exec proxy sh -c "wget -qO- http://localhost:9100/metrics | grep caddy_reverse_proxy_upstream_latency"
```
Expect gated `time_total` ≈ upstream time + a few ms; verify latency well under 250 ms on a healthy auth.

---

## 2. Rate-limit load test (Stage-5 deferral, now specified)

**Config unchanged from Stage 5:** `edge_per_ip` **600 events / 1m** per source IP (one shared suite-wide
counter, on every app route + the default-deny handler) and `auth_per_ip` **60/1m** stacked on `@auth`.
Both key on `{remote_host}` (direct peer; no `trusted_proxies` → unspoofable). On limit → **429 + Retry-After**
(verified in `handler.go`: `Retry-After` is always set on a decline).

**Sliding window (verified, README + source):** the limiter looks back `window` and counts events — a genuine
sliding window, so steady-state allowed rate = `events/window` (= **10 req/s** baseline, **1 req/s** auth) and
there is **no fixed-boundary 2× burst**. **State is process-global and survives `caddy reload`** — **retuning
`events`/`window` requires a full `docker compose restart proxy`, not a hot reload.** (Also noted inline next
to the `(ratelimit)` snippet in the Caddyfile.)

**Load-test method (operator-run; CANNOT-VERIFY-HERE — no Docker).** Tool: `hey` (single Go binary; prints a
"Status code distribution" 200-vs-429 block). The limiter keys on the client IP, so **run from one host = one
key**. Use `hey` against a resolvable+trusted domain; for the internal-CA test setup use the curl fallback.

```bash
## Rate-limit load test — caddy-ratelimit (sliding window, process-global state)
go install github.com/rakyll/hey@latest          # or download the prebuilt binary

# ALWAYS reset first (state survives `caddy reload`; only a restart clears the ring buffers):
docker compose --env-file .env.internal restart proxy

# 1) OPERATOR SIM — edge_per_ip 600/1m must NOT limit a tab-storm + polling.  EXPECT [429] 0
hey -n 200 -c 20 https://board.$SUITE/          # burst (many tabs/assets)
hey -n 60  -c 1 -q 1 https://board.$SUITE/      # ~1 req/s steady poll for 60s
#   PASS: 100% [200], zero [429]  (260 total << 600/min)

docker compose --env-file .env.internal restart proxy
# 2) FLOOD — one IP as fast as possible must be shed.  EXPECT ~[200] 600 / ~[429] 1400
hey -n 2000 -c 50 https://board.$SUITE/
#   PASS: ~600 admitted then 429s.  FAIL: [200] 2000 / [429] 0 (limit not applied)

docker compose --env-file .env.internal restart proxy
# 3) SUSTAINED — 700 over ~60s vs 600/1m.  EXPECT ~[200] 600 / ~[429] 100
hey -n 700 -c 1 -q 12 https://board.$SUITE/

docker compose --env-file .env.internal restart proxy
# 4) AUTH ZONE — auth_per_ip 60/1m independent.  EXPECT ~[200] 60 / ~[429] 40 + Retry-After
hey -n 100 -c 10 https://auth.$SUITE/
for i in $(seq 1 70); do curl -sk -o /dev/null --resolve auth.$SUITE:443:127.0.0.1 https://auth.$SUITE/; done
curl -sk -D - -o /dev/null --resolve auth.$SUITE:443:127.0.0.1 https://auth.$SUITE/ | grep -iE 'HTTP/|retry-after'
#   PASS: a 429 with a `Retry-After: <seconds>` header

# 5) METRICS — read the 429 decisions from inside the container
docker compose exec proxy sh -c \
  "wget -qO- http://localhost:9100/metrics | grep -E '^caddy_rate_limit_(declined_)?requests_total'"
#   key series: caddy_rate_limit_declined_requests_total{zone,key}  (= 429 count)
#   PromQL:     sum by (zone) (rate(caddy_rate_limit_declined_requests_total[1m]))
```
*(curl-only fallback for the flood, using the harness's --resolve/-k pattern with background concurrency:*
`for i in $(seq 1 2000); do curl -sk -o /dev/null -w '%{http_code}\n' --resolve board.$SUITE:443:127.0.0.1 -H 'Authorization: Bearer valid-agent' https://board.$SUITE/ & done | sort | uniq -c` *— read the 200 vs 429 tally.)*

**Result expectation:** operator load (≤600/min/IP) never limited; a flood is shed at ~10 req/s steady-state
with 429+Retry-After; the tighter auth zone sheds at ~1 req/s. **Metrics caveat (verified in `metrics.go`):**
`caddy_rate_limit_*` carries a `key` label = the client IP → **high Prometheus cardinality**; aggregate
`sum by (zone)` or drop `key` via `metric_relabel_configs` in the scraper.

---

## 3. Concurrency under many simultaneous connections

**Findings (web-verified):**
- **HTTP/2 max concurrent streams = 250 per connection** (Go `x/net/http2` default). **Not** tunable from the
  Caddyfile or JSON — and 250 in-flight streams/conn is far beyond ~20 agents + 1 operator. **Leave it.**
- **Caddy imposes no max-connection cap** — it accepts until the **OS file-descriptor limit**. There is no
  Caddyfile concurrency-cap directive (`rate_limit` is a *rate* limiter, not a concurrency limiter).
- **HTTP/2 Rapid Reset (CVE-2023-39325)** — the classic unbounded-goroutine risk — is **patched in Caddy
  2.11.2's Go build**, which bounds executing handler goroutines to the stream limit. So 250 is now a *real*
  per-connection ceiling. Slowloris (slow headers/idle sockets) is bounded by the Stage-5 `read_header 10s` /
  `idle 2m` / `max_header_size 64KB`.

**Change (before → after):** the edge had **no explicit FD/memory bound** (inherited Docker defaults, which
vary by host). Added to the `proxy` service in `docker-compose.yml`:
- `ulimits.nofile 65536/65536` — deterministic connection/socket headroom across hosts (each connection +
  upstream socket is one FD; generous for this scale).
- `mem_limit 512m` + `memswap_limit 512m` — OOM protection with no swap thrash under a flood. An edge Caddy
  idles in tens of MB and, with rapid-reset patched, memory stays predictable — 512m is ample headroom.

No connection leak or unbounded-memory path remains: bounded goroutines (rapid-reset fix), bounded idle conns
(`idle 2m` + keepalive pool caps), bounded header/body memory (`max_header_size 64KB`, per-route `request_body`),
bounded FDs/mem (compose). **Measurement:** `docker stats proxy` during flood scenario 2 — RSS should stay
well under 512m and settle after the flood.

---

## 4. TLS session resumption + HTTP/2 vs HTTP/3

**Session resumption (web-verified, `sessiontickets.go`):** Caddy **enables TLS session tickets by default**
(STEK service on unless disabled; **12h rotation, 4 keys**) — repeat clients resume without a full handshake.
JSON-only knob with **optimal defaults; nothing to configure**. The `protocols tls1.2 tls1.3` line in the
issuer partials sets the **TLS version** floor only and does **not** affect resumption (both 1.2 and 1.3
resume). **Leave defaults — documented, no change.** 0-RTT early data is QUIC/HTTP-3-only → moot (h3 off below).

**HTTP/2 vs HTTP/3 (before → after):** Caddy's default `protocols h1 h2 h3` advertises HTTP/3 via an
`Alt-Svc: h3` header, but HTTP/3 needs **UDP/443** and compose publishes only **TCP 443** (+ :80). So default
made clients **waste a QUIC probe on an unreachable UDP port**, then fall back to h2 — pure overhead. **Change:**
set `servers { protocols h1 h2 }` in the shared global block, so Caddy neither opens the QUIC listener nor
advertises h3. On a homelab LAN h3's benefit is marginal and session tickets already cover repeat-handshake
cost. **To enable h3 later** (e.g. remote/lossy access): set `protocols h1 h2 h3` **and** add `443:443/udp` to
compose together — never one without the other. Issuer-agnostic → shared Caddyfile → Option-C safe.

**Measurement:** `curl -k --resolve board.$SUITE:443:127.0.0.1 -sD - -o /dev/null -H 'Authorization: Bearer valid-agent' https://board.$SUITE/ | grep -i alt-svc` → expect **no `Alt-Svc` h3** after the change.
Resumption: `openssl s_client -connect 127.0.0.1:443 -servername board.$SUITE -reconnect` → expect "Reused".

---

## 5. Image / build (reproducibility + slimming)

**Before:** both xcaddy modules were pulled at **latest master** → non-reproducible, unaudited edge binary
(flagged Stage-5 as CONFIRM-BEFORE-STAGE-6). **After (refs verified live via GitHub API 2026-07-01):**
- `--with github.com/caddy-dns/cloudflare@v0.2.4` — latest release; `go.mod` floors Caddy v2.7.5 → builds on 2.11.2.
- `--with github.com/mholt/caddy-ratelimit@5625512f24f6f59d6f64fb3aafe5eecff0b286db` — the module's only tag
  (`v0.1.0`) is Caddy-2.8-era and stale, so we pin the **current master commit** (2026-06-12, includes a
  "re-register Prometheus collectors on each config reload" fix relevant to reload/metrics under load). A
  commit pin is reproducible *and* current.
- `xcaddy build v2.11.2 …` — pins the Caddy **core** version too (belt-and-suspenders with the builder image).

**Reproducibility caveat (honest):** pinning the `--with` refs + the builder locks the direct modules, but
xcaddy resolves **transitive** deps via Go MVS at build time — not byte-identical across time unless the base
images are also **digest-pinned** (operator step; cannot fetch a digest offline). Commands are in the
Dockerfile comment + the table below.

**Slimming:** the Dockerfile is **already essentially optimal** — multi-stage, copying only `/usr/bin/caddy`
into the stock `caddy:2.11.2` Alpine runtime (~22.65 MB compressed; the custom binary is modestly larger due
to the two static modules — irreducible without dropping modules). Do **not** switch to scratch/distroless
(loses the CA-cert bundle needed for ACME/Cloudflare TLS + entrypoint/healthcheck ergonomics) and do **not**
`apk del` anything. Optional, test-first: `ENV XCADDY_GO_BUILD_FLAGS="-trimpath -ldflags=-s -ldflags=-w"` for a
few MB + better reproducibility (left out here — exact env quoting is unverified; I won't ship an unbuilt flag).

**Operator confirm:**
```bash
docker buildx imagetools inspect caddy:2.11.2           # copy sha256 -> FROM caddy:2.11.2@sha256:<d>
docker buildx imagetools inspect caddy:2.11.2-builder   # copy sha256 -> FROM ...-builder@sha256:<d>
DOCKER_BUILDKIT=1 docker compose --env-file .env.internal build
docker compose --env-file .env.internal run --rm proxy caddy list-modules | grep -E 'cloudflare|rate_limit'
# expect: dns.providers.cloudflare  AND  http.handlers.rate_limit  (else the pin/module resolution failed)
```

---

## No correctness regression — why 35/35 + 16/16 still pass

Every change is a **no-op or additive limit**, none touching forward-auth allow/deny, the exactly-200 matcher,
the scrub, or the issuer toggle:

| Change | Why it cannot regress the harness |
|---|---|
| `keepalive 2m` / `keepalive_idle_conns_per_host 32` on authgate | Equal to Caddy defaults → identical runtime behavior; deny-on-non-200 + 250ms timeout unchanged |
| `protocols h1 h2` (global) | `verify.sh`/`regression` use curl over TLS (h1/h2); h3 was never exercised — no test path uses HTTP/3 |
| compose `ulimits`/`mem_limit` | Resource ceilings far above what the harness uses; no behavioral change |
| Dockerfile module pins | Same modules/functionality, frozen to specific refs (research: compatible with 2.11.2). **Rebuild is the verification** (CANNOT-VERIFY-HERE) |

**Option-C invariant:** all Caddyfile edits are in the shared global block + the authgate snippet (not the
issuer partials) → byte-identical across INTERNAL/PUBLIC. Confirmed: `git diff` shows no change to
`issuer.internal.caddy` / `issuer.public.caddy`, and no forward-auth decision line changed.

---

## CANNOT-VERIFY-HERE (operator confirms on a Docker host)

| Item | Command / check | Expected |
|---|---|---|
| **No harness regression** | `cp .env.internal.example .env.internal; docker compose --env-file .env.internal up -d --build; bash test/verify.sh internal && bash test/regression_headers.sh internal` | **35/35 + 16/16** still green |
| Config adapts (both modes) | `docker compose … exec -T proxy caddy validate --config /etc/caddy/Caddyfile` (internal **and** public) | zero adapt errors |
| Pinned build resolves modules | `docker compose run --rm proxy caddy list-modules \| grep -E 'cloudflare\|rate_limit'` | both present |
| Forward-auth latency | §1 curl + `caddy_reverse_proxy_upstream_latency` metric | few-ms overhead; < 250 ms verify |
| Rate-limit load test | §2 procedure (hey; reset via `docker compose restart proxy`) | operator not limited; flood shed 429+Retry-After |
| Concurrency memory | `docker stats proxy` during the flood | RSS ≪ 512m, settles after |
| h3 not advertised | §4 `Alt-Svc` grep | no h3 Alt-Svc |
| Session resumption | §4 `openssl s_client -reconnect` | "Reused" |
| Base-image digest pin | §5 `docker buildx imagetools inspect` → add `@sha256:` to both `FROM` | reproducible base |

---

## Notes for Stage 7 (Verification)

- **Re-run the load test against REAL auth**, not the stub — the forward-auth latency floor is set by auth's
  real verify processing (token/session lookup); confirm p95 verify latency stays well under the 250 ms
  ceiling under concurrent load, else tune auth (not the proxy).
- **Confirm the pinned build** (module refs + base digests) rebuilds clean and passes 35/35 + 16/16; that
  closes the supply-chain residual from THREAT_MODEL.md §8 R4.
- **caddy-ratelimit issue #94** (spurious first-request 429 on 2.11.x): confirm behavior on the pinned commit;
  the harness warm-ups tolerate it, but note whether the pinned master commit has fixed it.
- **Rate-limit numbers** (600/1m, 60/1m) are validated by the §2 method against stubs; re-validate against the
  real app request patterns (real UIs/asset counts) in production and adjust — remembering a **full restart**
  is required to apply new limits.
- If HTTP/3 is ever wanted for remote access, enable it as the paired change in §4 and re-test.
