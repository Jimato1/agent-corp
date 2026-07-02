# THREAT_MODEL.md — Proxy (Stage 5: Security hardening)

> **Status:** Stage-5 artifact (PROCESS.md §5). Risk class **Standard**, but the proxy is the suite's
> **trust boundary** — its header-scrub, fail-closed forward-auth, and TLS posture are load-bearing for
> **every** app behind it — so this stage was run with more rigor than Standard implies (multi-lens
> adversarial red-team, web-verified Caddy v2.11 semantics for every new directive).
>
> **Builds on the verified Stage-4 baseline** (30/31 harness assertions green on a real Docker host; the
> 1 "fail" was a test-assertion bug, resolved here as CARRY-IN 1). Stage 4 was **not** re-run.
>
> **Non-negotiable rule honored:** no change to forward-auth **allow/deny semantics**, the **exactly-200**
> matcher, the **dual-mode issuer toggle**, or the **scrub semantics**. Everything below either *adds*
> redaction/limits or *tightens* the scrub — it never changes what allows or denies a request. Verified:
> `git diff` touches no forward-auth decision line; the "byte-identical across modes except the issuer
> partial" (Option-C) invariant holds (all six red-team lenses concurred).

---

## 1. What the proxy is (and is not) in the security model

- **The proxy is defense-in-depth, NEVER the authorization boundary** (auth PLAN §8.1). It answers only
  *"is this request authenticated, and may this principal reach this app-surface at all?"* Every app (RS)
  **independently re-validates** its own `aud`-bound token and the **signed** `X-Auth-Identity` and MUST NOT
  authorize off a bare forwarded header (auth §8.6 R3). A proxy compromise cannot by itself grant authority.
- **Segregation of duties (root CLAUDE.md invariant):** the proxy holds **no credentials, no approval, no
  policy** — it cannot cause a destructive real-world action alone. It orchestrates *reachability*; the
  Board (approval), CMDB (policy), Vault (creds), Gateway (execution) each hold a separate piece. Nothing in
  Stage 5 changes this: the proxy still brokers no secret except the one DNS API token (public mode only).
- **Two-view rule:** the proxy has **no MCP surface and no UI** (proxy CLAUDE.md). It became *observable*
  (an internal :9100 metrics/health emitter) in Stage 4, not *interactive* — it gains no login surface.

## 2. Assets, trust boundaries, actors

| Asset | Why it matters | Protection |
|---|---|---|
| The forward-auth decision (allow/deny) | The gate in front of every app | Unchanged, fail-closed, exactly-200 (§4) |
| The signed `X-Auth-Identity` JWT (from auth) | A verifiable identity token | Copied upstream only on 200; **redacted from all logs** (CARRY-IN 2) |
| TLS private keys / internal CA root | Impersonation if leaked | Caddy `/data` volume; TLS 1.2+ floor; secure-default ciphers |
| The one DNS API token (public mode) | DNS control | Env/secret only, never logged, never in the image |
| Access logs | Can leak tokens/identity if unsanitized | Credential + identity redaction (§5) |
| Edge availability | A per-request SPOF for the whole suite | Rate limiting, timeouts, body/header caps (§5) |

**Trust boundaries:** (1) public internet / LAN → edge :443 (the scrub + verify boundary); (2) edge →
internal `edge` docker network (proxy→auth verify, proxy→app upstream); (3) internal `edge` network →
:9100 observability listener (private-ranges only, never published). **Actors:** malicious/curious client
or agent (forge identity, brute-force, flood); compromised app upstream (replay a forwarded header — mitigated
by R3); a runaway agent (cannot escalate — holds no keys/approval). auth itself is trusted-but-bounded
(a hung/broken auth must fail *closed*, never open).

## 3. Attack surface & how each hardening measure defends it

| Attack | Vector | Defense (Stage-5 state) |
|---|---|---|
| **Identity-header spoofing** | Client sends `X-Auth-Identity`/`Remote-*`/`X-Forwarded-*` (dash, underscore, **mixed**, case) | `(scrub)` deletes all forms **unconditionally, before** verify and upstream, on every route incl. `@auth`; mixed-separator variants added (§5, F-A); backstopped by R3 + the A§8.9 regression test |
| **Identity-token log leak** | Real signed JWT / principal written to access logs | Request+response identity headers **deleted** from the log filter; `traceparent` intentionally kept (non-secret audit key) (CARRY-IN 2) |
| **Credential brute-force** | Rapid guessing at the auth login/verify surface | Tighter `auth_per_ip` 60/1m zone stacked on the baseline; auth's own §8 lockout is the primary control |
| **Edge flood / DoS** | Request flood from one IP; unmapped-subdomain flood; header/body flood; slowloris | `edge_per_ip` 600/1m baseline (now also on the default-deny handler); `max_header_size 64KB`; per-route `request_body` caps; `read_header 10s` |
| **TLS downgrade** | Force TLS 1.0/1.1 or weak ciphers | Explicit `protocols tls1.2 tls1.3` floor in both issuer partials; ciphers/curves left at Caddy's hardened AEAD + post-quantum defaults; HSTS 2y + includeSubDomains; :80→:443 auto-redirect |
| **auth-verify-down fail-open** | auth unreachable/hung/5xx → proxy passes through unauthenticated | Fail-closed unchanged (dial 2s / header 250ms / non-200 denies); now also runtime-tested for the 5xx branch |
| **Confused-deputy via short-circuit** | A 413/431/429 forwards an unscrubbed request upstream | Confirmed impossible: 413/431/429 reject and never reach an app upstream (§7) |

## 4. Forward-auth decision integrity (unchanged, re-confirmed)

The red-team confirmed the security core is intact after hardening:
- `(scrub)` still runs **before** `authgate` and **before** `reverse_proxy` on **every** route, including the
  gate-exempt `@auth` route (the new `vars`/`log_append`/`request_body` lines are non-forwarding and do not
  reorder it).
- **Copy-only-on-exactly-200** holds: `@ok status 200` + `handle_response`, copying only `X-Auth-Identity`;
  the stub's `Remote-User` trap is not copied.
- **Fail-closed** holds: dial error / hang / 5xx / any non-200 → deny; `dial_timeout 2s`,
  `response_header_timeout 250ms`, `@ok status 200` all byte-unchanged.

## 5. Stage-5 hardening changelog

| # | Area | Change | File |
|---|---|---|---|
| H1 | **Log redaction (CARRY-IN 2)** | Delete `resp_headers` `X-Auth-Identity` + `Remote-User/Groups/Name/Email` (+ `Authorization` DiD) from access logs — auth's verify response can carry a real signed identity JWT into `resp_headers`, which Caddy does **not** auto-redact. `traceparent` deliberately kept (audit key). Verified field-path asymmetry (`resp_headers>Name` top-level vs `request>headers>Name` nested; `response>headers>…` silently no-ops). | `conf/Caddyfile`, `docs/OBSERVABILITY.md` |
| H2 | **Test-assertion fix (CARRY-IN 1)** | Rewrote `verify.sh` 15c: strip the stub's `X-Stub-Saw-*` echo scaffolding, then assert no client credential VALUE appears un-redacted in a request log entry (the real property, which also *could* catch a genuine leak). Added 15d proving `resp_headers` identity redaction. | `test/verify.sh` |
| H3 | **Rate limiting** | Baseline `edge_per_ip` set to **600/1m** per direct-peer IP (suite-wide coarse DoS backstop) on every route + the default-deny handler; tighter `auth_per_ip` **60/1m** stacked on `@auth`. 429 + Retry-After. Runtime **burst test** added (`verify.sh` step 16, gate #8). | `conf/Caddyfile`, `test/verify.sh` |
| H4 | **TLS floor** | Explicit `protocols tls1.2 tls1.3` in **both** issuer partials (honors Option-C — it lives in the mode-specific partial; identical in both). Ciphers/curves untouched (Caddy defaults are AEAD-only + post-quantum X25519MLKEM768; overriding would age badly). | `conf/issuer.*.caddy` |
| H5 | **Edge limits** | `max_header_size 64KB` (→431 on flood); per-route `request_body` caps (25MB normal, 512MB drive, 128MB pdf → 413); `read_header 10s` slowloris guard kept; `read_body`/`write` deliberately unset (would break large uploads / SSE streams). | `conf/Caddyfile` |
| H6 | **Scrub completeness** | Added **mixed** dash/underscore variants of the 3-part identity/forwarded headers + cert-header underscore twins (red-team F-A). Extended the A§8.9 regression battery to inject mixed variants. | `conf/Caddyfile`, `test/regression_headers.sh` |
| H7 | **Fail-closed coverage** | Added `verify.sh` step 11c: auth reachable but returns 500 → deny, upstream not reached (was untested). | `test/verify.sh` |
| H8 | **#94 robustness** | Warm-up-and-discard per zone at the start of `verify.sh` and `regression_headers.sh` to absorb caddy-ratelimit issue #94 (spurious first-request 429 on an empty counter on Caddy 2.11.x). | both test scripts |

## 6. The two carry-ins — resolution

- **CARRY-IN 1 (test bug, 15c):** the old blanket `grep 'valid-agent'` matched the stub's deliberate
  `X-Stub-Saw-Authorization` **response** echo (test scaffolding), not a proxy leak — a false alarm that
  *also* couldn't have distinguished a real leak using a different string. **Fixed the TEST** (not the
  config): 15c now strips `X-Stub-Saw-*` and asserts the real property (no un-redacted client credential
  value in a request log entry). Red-team verdict: valid and non-vacuous.
- **CARRY-IN 2 (real leak with real auth):** the access log redacted request `Authorization` but logged the
  auth **verify-response** headers verbatim — fine with the fake stub values, but a **real signed identity
  JWT** at Stage 7. **Hardened the CONFIG:** `resp_headers` `X-Auth-Identity` + `Remote-*` are now deleted
  (verified field paths), and `verify.sh` 15d proves it against the `@auth` path (which routes the stub's
  identity response into `resp_headers`) — non-vacuously (it first confirms `resp_headers` logging is live).

## 7. Adversarial review — findings folded

Six independent red-team lenses (identity-spoof, log-leak, rate-limit, TLS-downgrade, auth-verify-down,
mode-parity/un-run-config) reviewed the *actual hardened files* with web-verified Caddy semantics. All
concurred: invariant honored, forward-auth semantics unchanged. Findings:

| Sev | Finding | Disposition |
|---|---|---|
| **HIGH** (F-A) | Mixed dash/underscore identity headers (`X-Auth_Identity`, `X_Auth-Identity`, `X-Forwarded_Prefix`, …) bypass the pure-dash/pure-underscore scrub; separator-folding upstreams (WSGI/CGI/nginx) conflate them with the real header | **FOLDED (H6):** added the mixed variants + cert underscore twins to `(scrub)` and to the regression battery. Full permutation coverage is impractical by enumeration → documented; the **ultimate backstop is auth §8.6 R3** (RS validates the signature, never a bare header). |
| **HIGH** (F-B) | caddy-ratelimit issue #94 (spurious 429 on the first request to an empty counter, 2.11.x) was unguarded in `verify.sh` step 2 and all of `regression`, and the 65s burst-cooldown *re-arms* the empty-counter trigger | **FOLDED (H8):** warm-up-and-discard per zone at the start of both scripts absorbs the cold-counter request; documented as a production caveat (see §8/§9). |
| **MED** (F-C) | xcaddy modules built from **untagged master** → non-reproducible, unaudited trust-boundary binary | **ACCEPTED-WITH-REASON + action:** documented in the Dockerfile + §9; not re-pinned here because it cannot be built/verified in the doc sandbox and a blind bump would re-do the verified Stage-4 build. **Confirm-before-Stage-6.** |
| LOW | Unmapped-subdomain default handler bypassed rate limiting | **FOLDED (H3):** `import ratelimit` added to the default-deny `handle`. |
| LOW | Baseline 300/1m (one shared per-IP counter across all subdomains) could false-limit a busy operator browser | **FOLDED (H3):** raised to 600/1m; per-`(IP,host)` keying documented as a Stage-6 lever. |
| LOW | Stub echoes the bearer credential in a `X-Stub-Saw-Authorization` response header | **FOLDED (DiD, H1):** `resp_headers>Authorization delete` added; test-double only, real auth won't emit it. |
| LOW | 413 (request_body) / 431 (max_header_size) error pages render outside the `sec_headers` route | **ACCEPTED-WITH-REASON:** comment corrected to be accurate; error pages have no body to sniff/frame over established TLS — not exploitable. 431 is server-level (pre-chain), unavoidable. |
| LOW | 5xx-from-auth fail-closed branch was untested | **FOLDED (H7):** `verify.sh` step 11c added. |
| LOW | TLS floor line duplicated in both partials → latent drift risk | **ACCEPTED-WITH-REASON:** compliant with Option-C (the line must live in the `tls` directive, which is the mode-specific partial); both are identical today. Cross-referenced in comments; a shared-snippet or drift test is a documented optional future hardening. |
| LOW | Rate-limit zone state persists in a process-global pool → retuning needs a full restart, not `caddy reload` | **DOCUMENTED (H3 comment + §9):** Stage-6 load-test procedure must `docker compose restart proxy`. |
| LOW | Caddy runtime/error logger not covered by the access-log filter | **ACCEPTED-WITH-REASON:** at INFO level Caddy dumps no headers; keep log level at INFO (never DEBUG) in prod. |
| info | TLS syntax validity; `max_header_size` placement; field-path correctness; verify subrequest **not** rate-limited; no fail-open via 413/431/429; no X-Forwarded-For key spoof; attacker can't lock out the operator (distinct `{remote_host}` counters) | Confirmed correct — no action. |

**No confirmed exploit survived.** The two HIGH findings were mitigations of *plausible* (not confirmed)
gaps of a cited CVE class, both folded.

## 8. Residual risks (accepted-with-reason)

- **R1 — Full header-separator permutation coverage is impossible by enumeration.** Long names (the mTLS
  cert header has 5 separators → 32 combos) are not fully enumerated. Accepted because the proxy strips all
  realistic forms of the headers auth actually emits, and **auth §8.6 R3** (every RS validates the *signed*
  `X-Auth-Identity`, never a bare forwarded header) is the authoritative backstop. mTLS is not yet enabled.
- **R2 — Per-IP rate limiting is coarse.** An attacker with an IPv6 /64 can rotate source IPs; clients
  behind one NAT share a counter. Accepted: the edge limit is a *coarse DoS backstop*; per-app fine limits
  and auth's lockout are the real controls. Stage-6 lever: subnet keying / per-`(IP,host)`.
- **R3 — Edge SPOF & verify SPOF** (inherited from PLAN §11 F4/F5). A hard auth outage = suite-wide deny
  (the *safe* direction). auth carries the HA target; operator break-glass is auth-side.
- **R4 — Supply chain (F-C).** Until the two xcaddy modules are pinned to reviewed refs, builds are
  non-reproducible. Tracked as a Stage-6 blocker.
- **R5 — 413/431 error pages lack security headers.** No body to sniff/frame; accepted.
- **R6 — TLS floor duplicated across partials.** Drift-possible-if-hand-edited; identical today.

## 9. CANNOT-VERIFY-HERE (operator must run on a Docker host) + confirm-before-Stage-6

This environment has **no Docker/Caddy** — no config here was `caddy validate`'d or run. Prior Stage-4
defects were exactly this class, so every new directive was **web-verified** against current Caddy v2.11
docs / the caddy-ratelimit source, and the red-team re-verified. The operator must still execute:

```
# from platform/proxy/ on a Docker host — the Stage-5 acceptance gate:
cp .env.internal.example .env.internal            # if not already present
docker compose --env-file .env.internal up -d --build
bash test/verify.sh internal && bash test/regression_headers.sh internal
```

Expected: `caddy validate` (step 0) passes with zero adapt errors; **all assertions green** — including the
CARRY-IN 1 fix (15c), the CARRY-IN 2 redaction proof (15d), the 5xx fail-closed (11c), and the rate-limit
burst (16, with Retry-After). `verify.sh` ends with a **65s cooldown** so the chained regression run starts
with drained rate-limit counters; both scripts **warm up** per zone to tolerate caddy-ratelimit #94.

**Per-item CANNOT-VERIFY-HERE:**

| Item | Operator confirmation |
|---|---|
| Whole config adapts | `docker compose --env-file .env.internal exec -T proxy caddy validate --config /etc/caddy/Caddyfile` (also `verify.sh` step 0), in **both** modes |
| Log redaction (H1/CARRY-IN 2) | `verify.sh` 15d green; spot-check `docker compose logs proxy` shows no `X-Auth-Identity`/principal value in the clear |
| Rate-limit sheds (H3, gate #8) | `verify.sh` step 16 green (200s + 429 + Retry-After) |
| TLS floor (H4) | `docker compose exec proxy caddy validate` passes both modes; optionally `openssl s_client -tls1_1` is refused |
| Mixed-separator scrub (H6) | `regression_headers.sh` green (FORGEDMIXA/FORGEDMIXB/adminmix stripped) |
| 5xx fail-closed (H7) | `verify.sh` step 11c green |
| **Supply chain (F-C, R4)** | **Pin** `caddy-dns/cloudflare@vX.Y.Z` and `caddy-ratelimit@<reviewed-ref>` in the Dockerfile, rebuild, re-run the gate, and confirm caddy-ratelimit #94 behavior on the pinned build |
| Gate #11 (Stage 4 carry) | Confirm the pinned `caddy:2.11.2` tag carries the CVE-2026-52845 fix |
| Rate-limit tuning | Stage 6: load-test 600/1m + 60/1m under simulated multi-agent load; **retuning needs `docker compose restart proxy`**, not a hot reload |

**Deferred to Stage 7 (need real auth), unchanged from Stage 4:** real `/api/verify` conformance +
re-run `regression_headers.sh` against real auth; `traceparent` authoritative minting; DPoP-vs-mTLS-bound
tokens + proxy→auth mTLS; kill-switch/break-glass 403 posture.
