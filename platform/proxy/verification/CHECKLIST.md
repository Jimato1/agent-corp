# verification/CHECKLIST.md — Proxy (Stage 7: Verification)

> **Status: SOLO-VERIFIED (pending operator harness run), JOINT-PENDING.** *Not* "Stage 7 complete."
> Part A is fully specified and provable **now** with the auth stub as a §8.5/§8.7 **contract double**;
> Part B is **BLOCKED-ON-REAL-AUTH** and is specified, never stub-passed.
>
> Risk class **Standard**, but the proxy is the suite **trust boundary**, so verification rigor is
> elevated. Builds on verified-green Stage 5 (**35/35** `verify.sh` + **16/16** `regression_headers.sh`
> on a fresh clone) and Stage 6 (pinned-build re-verify confirmed). Prior stages were **not** re-run and
> no forward-auth / scrub / trust-boundary semantics were changed by this stage (this file adds no code).
>
> **Contract-double honesty (important):** the harness runs against an auth **stub** that emulates the §8.5
> decision table and echoes, via `X-Stub-Saw-*` response headers, what the verify subrequest received.
> **Exactly the assertions that read a stub-only artifact are stub-specific and are re-derived against real
> auth in Part B** — this file enumerates every one of them (see A1/A4 and JC-1). The proxy *behaviors*
> (scrub, copy-only-on-200, fail-closed, relay) are real; some are only *observable* through the stub.
>
> **Docker honesty:** no Docker/Caddy in this environment — Part A is *verified by the operator re-running
> the harness* (exact command in §A-ACCEPTANCE). Every Part-A row cites the **exact harness step** that
> proves it. Part B rows carry a per-item joint procedure + pass criterion, cross-referenced to auth's JC list.

---

## PART A — SOLO verification (provable now, with the stub as a §8.5/§8.7 contract double)

Acceptance is the operator re-running the harness green on a fresh clone. Assertion IDs below are the step
labels printed by `test/verify.sh` (V-n) and `test/regression_headers.sh` (R). `verify.sh` emits **35**
assertions in `internal` mode (V-12 is internal-only ⇒ **34** in public); `regression_headers.sh` emits **16**.

### A1 — The A§8.9 header-injection battery (the trust-boundary wall)

**Claim:** a client cannot smuggle ANY identity/trust/prefix header (dash / underscore / mixed / case
variants) to an upstream **or** to the auth verify subrequest; and on allow, the upstream sees ONLY auth's
own identity (copy-only-on-200). **Proving steps:** `regression_headers.sh` R (all 16) + `verify.sh`
V-6/6b/6c/6d (upstream path) + V-8/8b (the @auth gate-exempt path is still scrubbed).

**Exactly which forged headers are proven stripped** (injected at the edge on an allowed request; the
distinctive value must be ABSENT from the upstream echo — `regression_headers.sh` needle list; 13 injected
headers collapse to 11 needles because `operator`/`approver` are shared across the `Remote-*`↔`X-Forwarded-*`
twins — a *conservative* collapse that fails if **either** twin leaks):

| Forged header injected | Variant class | Needle proven absent |
|---|---|---|
| `X-Auth-Identity` | dash | `FORGEDIDENT` |
| `X_Auth_Identity` | underscore twin (CVE-2026-39858/52845) | `FORGEDUNDER` |
| `X-Auth_Identity` | **mixed** separator (Stage-5) | `FORGEDMIXA` |
| `X_Auth-Identity` | **mixed** separator (Stage-5) | `FORGEDMIXB` |
| `Remote-User` / `X-Forwarded-User` | dash | `operator` (shared) |
| `REMOTE-USER` | case (Caddy canonicalizes) | `operatorcase` |
| `Remote-Groups` / `X-Forwarded-Groups` | dash | `approver` (shared) |
| `X-Forwarded-Prefix` | dash (CVE-2026-35051) | `/admin` |
| `X_Forwarded_Prefix` | underscore twin | `/adminunder` |
| `X-Forwarded_Prefix` | **mixed** separator | `/adminmix` |
| `traceparent` | client-supplied trace | `deadbeefdeadbeef` |

Additionally stripped by `(scrub)` though not each separately injected (full enumeration in `conf/Caddyfile`
`(scrub)`): `Remote-Name`, `Remote-Email`, `Tracestate`, `X-Forwarded-Tls-Client-Cert[-Thumbprint]` (+ their
underscore twins). The `(scrub)` **contract-sync gate** requires R to fail if auth's §8.7 emit-set ever grows
past this enumeration.

**Two observation surfaces, one behavior:**
- **Upstream path (fully solo):** `board` is a *real echo upstream*, so the 11 needle-absence assertions +
  V-6b/6c genuinely prove the proxy stripped the forged headers before the app. Real-auth-independent.
- **Verify-subrequest path (behavior solo, *observation* stub-only):** the proxy also runs `(scrub)` on the
  `@auth` route before proxying to auth (real behavior), but the test can only *see* it via the stub echo.

⚠️ **Stub-specific assertions in this battery — FOUR, not one** (each reads a stub-only artifact; all are
re-derived against real auth in **JC-1**):
1. R "auth X-Auth-Identity present at upstream" — asserts the literal `X-Auth-Identity: STUB.` (regression:77).
2–4. R "@auth verify saw `X-Stub-Saw-XAuthIdentity` / `-Underscore` / `-RemoteUser` = NONE" (regression:89-95)
   — and the equivalent V-8/8b in verify.sh — depend on the stub's `X-Stub-Saw-*` echo headers, which real
   auth does not emit.

So the *upstream* strip wall (11 needles) is unconditionally solo; the *copy-only-on-200 value* and the
*verify-path scrub observation* are proven now via the contract double and re-derived in JC-1.

### A2 — Internal-CA chain validation (real trust, not `-k`)

**Claim:** in INTERNAL mode the proxy serves a chain that validates against the internal CA root with no
`-k`. **Proving step:** `verify.sh` **V-12** — exports `/data/caddy/pki/authorities/local/root.crt` from the
container and curls the edge `--cacert` that root (no `-k`), asserting 200. The TLS chain is proxy-issued
(internal CA), so the *chain-validation* is solo; note V-12 asserts `200`, which additionally requires the
stub allow-path (`Bearer valid-agent`) — a stub outage would surface here as a chain failure, so read a V-12
failure together with V-1/V-5. Public-mode chain = a real Let's Encrypt cert → JC (needs ACME).

### A3 — Mode-selection correctness / Option-C invariant

**Claim:** INTERNAL vs PUBLIC differ **only** by the imported issuer partial (plus the intended `/edge-info`
mode label); routing / scrub / authgate / sec_headers / rate-limit / log config are **byte-identical** across
modes, and PUBLIC adapts/validates too. **Confirmed sound at the source** (issuer partials differ ONLY in the
issuer mechanism; the `protocols tls1.2 tls1.3` line is byte-identical; the Caddyfile's sole mode-specific
line is `import {$TLS_ISSUER_FILE}`). **Proving method:**

- `verify.sh` **V-0** (`caddy validate` inside the running container) confirms the config parses for the mode
  the container was **created** with (that is INTERNAL under the §A-ACCEPTANCE `up`).
- **Byte-identical proof (config-level, cert-independent), corrected command.** `docker compose exec` does
  **NOT** inject the top-level `--env-file` into the exec'd process — Caddyfile `{$VAR}` placeholders expand
  from the *container's own* env (baked at `up` time). So to actually exercise the PUBLIC issuer you must pass
  the issuer via `-e` on the exec (validate/adapt make no ACME/DNS network call, so a placeholder token is
  fine and it works offline). Hold `MODE_LABEL` constant so the diff isolates the issuer:
  ```
  # both adapts run inside the one running (internal) container; only the issuer env is overridden
  docker compose --env-file .env.internal exec -T \
    -e TLS_ISSUER_FILE=/etc/caddy/issuer.internal.caddy \
    proxy caddy adapt --config /etc/caddy/Caddyfile > /tmp/int.json
  docker compose --env-file .env.internal exec -T \
    -e TLS_ISSUER_FILE=/etc/caddy/issuer.public.caddy -e CLOUDFLARE_API_TOKEN=placeholder \
    proxy caddy adapt --config /etc/caddy/Caddyfile > /tmp/pub.json
  diff /tmp/int.json /tmp/pub.json
  ```
  **Pass criterion:** the diff is **confined to the `tls` issuer stanza** (internal-CA vs ACME/DNS-cloudflare).
  (If you instead vary `MODE_LABEL` too, expect one *additional* expected hunk: the `/edge-info` respond body
  string — that field exists precisely to report the active mode and is an *intended* per-mode difference, not
  a routing divergence.) A standalone public `caddy validate` uses the same `-e` override form.
- **Source-level proof (this stage):** `git diff` across Stages 5–6 shows no divergence in the shared config
  between modes. **Stub-independent?** YES.

### A4 — Forward-auth decision handling + fail-closed matrix (vs the stub contract double)

**Claim (corrected):** the proxy matches **exactly `@ok status 200`** and, on any non-200, **relays auth's
response verbatim** (`forward_auth` copies the response and does not continue to the upstream). It does **not**
itself select 401 vs 302 vs 403 — that selection, `WWW-Authenticate: Bearer`, and `Location: /login` are
**auth's §8.5 output** (emulated by the stub from the `Accept` header) and merely relayed. What Part A proves
solo is the proxy's **200-vs-not-200 branch + copy-only + fail-closed relay**; the specific §8.5 codes emitted
by *real* auth are confirmed in **JC-1** (auth's own tests already cover §8.5 emission).

| §8.5 / fail-closed case | Proven by | Asserted property | Solo vs stub-obs |
|---|---|---|---|
| **exactly-200 = allow** → reaches upstream | V-5, V-5b | 200 + `UPSTREAM=board` reached | solo (real echo upstream) |
| **200 copies only X-Auth-Identity** | V-5c, V-6d | upstream has `X-Auth-Identity: STUB.` | ⚠️ stub-specific literal — JC-1 seam |
| **…but NOT the Remote-User trap** | V-5d | no `Remote-User: op:eide` at upstream | **solo** (negative; no stub literal) |
| **non-200 relayed verbatim: 401** (agent, no cred) + `WWW-Authenticate: Bearer` | V-2, V-2b | 401 + header relayed | branch solo; the 401/header value is auth's output (JC-1) |
| **relayed: 302** (browser) → `Location: /login` | V-3, V-3b | 302 + Location relayed | branch solo; value is auth's output (JC-1) |
| **relayed: 403** (authenticated-but-refused) | V-4 | 403 relayed | branch solo; value is auth's output (JC-1) |
| **2xx≠200 (204)** → DENY, upstream NOT reached | V-7 | upstream not reached | **solo** |
| **auth unreachable** → fail closed (Caddy → **502**) | V-10 | non-200 **and** upstream not reached | **solo** |
| **auth hung** → fail closed within the 250 ms header timeout (Caddy → **504**) | V-11, V-11b | non-200 + upstream not reached + denied <3 s | **solo** |
| **auth 5xx** → fail closed (5xx copied back → **500**) | V-11c | non-200 + upstream not reached | **solo** |

**Note on exact codes:** V-10/11/11c assert the **security-critical invariant** — *deny + upstream not
reached* — and print the observed `$c`. The specific 502/504/500 codes are Caddy `reverse_proxy` standard
behavior (dial error→502, `response_header_timeout`→504, upstream-5xx copied→500) and are visible in the
harness output; the assertions gate on the deny, which is the invariant. Asserting the exact codes is a
**test-hardening candidate** (see below).

### A5 — Log redaction (no credential / identity value survives)

**Proving steps:** `verify.sh` **V-15c** (CARRY-IN 1) + **V-15d** (CARRY-IN 2).

- **V-15d (sound, non-vacuous):** the stub's `/api/verify` response sets `X-Auth-Identity` (`STUB.…`) +
  `Remote-User: op:eide`, which flow through the `@auth` reverse_proxy into the client response and thus into
  the access log's `resp_headers`. V-15d first confirms `resp_headers` logging is **live** (the stub echo is
  present) and then asserts the identity **values** (`op:eide`, `not-a-real-signature`) are **deleted** — so it
  genuinely exercises the `resp_headers` redaction filter. Real auth's real signed JWT is redacted by the
  *same* rule; re-confirmed with real token values in JC-1.
- **V-15c (limited — honest caveat):** it proves the client **credential value is absent** from a request log
  entry after excluding the stub's `X-Stub-Saw-*` echo. But because Caddy **auto-redacts** the request
  `Authorization` header *and* the log filter deletes `request>headers>Authorization`, the credential's only
  appearance is the stub echo, which V-15c strips before grepping — so **V-15c cannot fail** and thus mainly
  re-confirms Caddy's built-in auto-redaction + the filter's request-Authorization deletion, **not** a
  hand-rolled redaction with a positive control. This is accurate for what it claims (credential value not in
  logs) but is **not** an independent leak-detector. Adding a positive control is a **test-hardening
  candidate** (below). **Stub-independent?** YES for the redaction behavior.

### A6 — Observability trust boundary

**Claim:** the `:9100` metrics/health/edge-info listener is internal-only and never reachable via the public
`:443` site. **Proving steps:** `verify.sh` **V-13** (metrics served on internal `:9100`), **V-14** (metrics
NOT served on public `:443`), **V-15** (`/edge-info` reports the mode; V-15b log is structured JSON). Compose
confirms `:9100` has **no `ports:` mapping** (`expose:`-only ⇒ host-unreachable, reachable only on the `edge`
network by the MC scraper). *(Log-secret redaction is A5, not here.)* **Stub-independent?** YES.

### A7 — Shared-invariant conformance (root CLAUDE.md)

| Invariant | Proxy status | Basis |
|---|---|---|
| **Markdown is source of truth** | **N/A** | proxy holds no notes/knowledge; config is the only artifact |
| **Two views over one state** (MCP + UI siblings) | **N/A by construction** | proxy has **no MCP surface and no UI** (CLAUDE.md); it is infra routed *through*, not called |
| **API-first** (core→MCP→UI) | **N/A** | no product surfaces to sequence |
| **Segregation of duties** | **HOLDS** | proxy holds **no credentials, no approval, no policy**; brokers *reachability* only. Defense-in-depth, **never** the authorization boundary (every RS re-validates its own aud-bound token + the signed X-Auth-Identity — auth §8.6 R3). Verified: V-5c/5d/6 forward only auth's signed header, never a client-forged one |
| **Done confirmed externally** | **N/A at the edge** | proxy self-reports nothing; verification here IS external (harness) |
| **Kill switch bites at the Gateway chokepoint** | **HOLDS (by omission)** | proxy implements no allow-all bypass; auth returns 403 and the proxy **relays** it — V-4 proves the 403 relay (upstream-not-reached is inherent to `forward_auth` on any non-200). Physical bite stays at the Gateway, not the proxy. Real kill-switch integration = **JC-4**. Cross-ref memory [[mc-auth-kill-switch-boundary]] |
| **Trust boundary + fail-closed** | **HOLDS** | A1 (scrub wall) + A4 (fail-closed matrix) |

### A-ACCEPTANCE — operator command to close Part A

From `platform/proxy/` on a Docker host, fresh clone:
```
cp .env.internal.example .env.internal
docker compose --env-file .env.internal up -d --build
bash test/verify.sh internal && bash test/regression_headers.sh internal
# → expect 35/35 (verify) and 16/16 (regression), exit 0
# Option-C proof — run the A3 corrected caddy-adapt diff (issuer-only diff); offline-safe.
```
Part A is **SOLO-VERIFIED** when the harness is green on a fresh clone **and** the A3 adapt-diff is
issuer-confined.

### Solo test-hardening candidates (Stage-7 follow-ups — operator adds + re-verifies; would change the 35/16 baseline)

Not applied here (this stage adds no code; each needs a Docker run to confirm it stays green). Recommended:
1. **V-15c positive control** — assert the credential value *is* present in a raw capture before the filter,
   so the redaction test can actually fail (closes the A5 vacuity gap).
2. **X-Forwarded-Host forwarding assertion** — assert the stub saw `X-Stub-Saw-XForwardedHost: board.$SUITE`
   on a `board` request (proves the proxy forwards the *correct* per-subdomain host; the real aud-binding is
   JC-7).
3. **Exact fail-closed codes** — tighten V-10/11c to assert `502`/`500` (and V-11 `504`) explicitly.
4. **V-4 upstream-not-reached** — add `! grep UPSTREAM=board` to V-4 (parity with V-7/10/11c).

---

## PART B — JOINT CHECKPOINT (blocked on real auth) — specified, NOT passed

These require the real `auth` container serving `/api/verify`. **None may be marked passed here.** JC-1…JC-5
align 1:1 with auth's JC list (auth CLAUDE.md §77; auth BUILD.md Stage-7). **JC-P6 and JC-7 are proxy-specific**
(no matching auth JC number). Run from a compose that swaps the `auth` stub for the real `auth` service on the
`edge` network.

### JC-1 — Real `/api/verify` vs the harness (incl. the harness adaptation)

**Blocked because:** the harness is stub-specific in several places — it sends literal `Bearer valid-agent`
(verify.sh:74,78; regression:55) and asserts stub-only artifacts: the upstream `X-Auth-Identity: STUB.`
(regression:77, V-5c/V-6d) and the three `@auth ... X-Stub-Saw-*: NONE` echoes (regression:89-95, V-8/8b).
Real auth rejects `valid-agent`, signs a real JWT (not `STUB.`), and emits no `X-Stub-Saw-*` headers. Auth's
CLAUDE.md §77 flags this identical adaptation.

**Harness-adaptation spec (write into the joint runbook; do NOT bake stub assumptions into the shared test):**
1. Bring up real `auth` with `AUTH_DEMO=1` (exposes `GET /debug/demo-tokens`; gated at server.py:417-419).
2. Mint real agent tokens:
   ```
   TOK=$(curl -sk --resolve auth.$SUITE:443:$IP https://auth.$SUITE/debug/demo-tokens | jq -r .valid_agent)
   REF=$(curl -sk --resolve auth.$SUITE:443:$IP https://auth.$SUITE/debug/demo-tokens | jq -r .refused_agent)
   ```
   `demo-tokens` returns `{valid_agent, refused_agent, self_agent}`: `valid_agent` + `refused_agent` are
   **`aud=board`**; `self_agent` is **`aud=auth`** (unused by this test). Use `valid_agent` for the allow path
   and `refused_agent` for the 403 path.
3. **Upstream strip battery — keep unchanged:** the 13 forged-header injections + 11 needle-absence assertions
   are proxy behavior and must all still pass against real auth (that IS the A§8.9 gate) — only swap the
   credential to `$TOK`.
4. **Copy-only assertion — adapt:** replace `grep 'X-Auth-Identity: *STUB\.'` (regression:77, V-5c/V-6d) with
   an assertion that the upstream `X-Auth-Identity` is a **structurally-valid JWT = three base64url segments**
   (`^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$`; matches auth `jwt.py`), and OPTIONALLY verify its
   signature against auth's JWKS.
5. **@auth verify-path scrub — re-derive:** the three `X-Stub-Saw-*: NONE` assertions (regression:89-95,
   V-8/8b) cannot run against real auth (no echo). Re-prove the verify-path scrub by one of: (a) a real-auth
   debug endpoint that reflects the identity headers it *received* (assert forged ones absent), or (b) drop
   these three and rely on the fact that the same `(scrub)` snippet guards both routes (documented, not tested)
   — state which in the runbook.
6. **Decision-table codes (verify.sh V-2/V-3/V-4) — scope explicitly:** either re-run verify.sh against real
   auth (no-cred → 401/302 by `Accept`; `Bearer $REF` → 403) **or** delegate §8.5 emission to auth's own test
   suite (defensible). Do not imply the proxy re-verifies all four codes.

**Pass criterion (scoped to what runs):** with real auth, the adapted `regression_headers.sh` allow-path is
green — every forged header still stripped, and the upstream `X-Auth-Identity` is a valid signed JWT (not a
client value); plus the decision-table codes are confirmed by whichever path step 6 chose. **Cross-ref:** auth JC-1.

### JC-2 — Authoritative `traceparent` minting bound to `sub`

**Blocked because:** the stub does not mint a `sub`-bound `traceparent`. The proxy already **strips** the
client `traceparent` (solo: A1 needle `deadbeefdeadbeef` absent); the authoritative value is minted by **auth
inside the signed X-Auth-Identity**. **Procedure:** with real auth, send a crafted client `traceparent`;
confirm (a) the client value never reaches the upstream (A1) and (b) the downstream authoritative trace id is
auth-minted and bound to the validated `sub`. **Pass criterion:** client value discarded; attribution trace id
is auth-generated + `sub`-bound (retained only as `claimed_parent` if at all). **Cross-ref:** auth §8.7 / JC-2.

### JC-3 — DPoP vs mTLS-bound tokens + proxy→auth mTLS

**Blocked because:** the stub speaks plain HTTP; no cert-bound-token path exists yet. **Procedure:** once auth
§10 fixes sender-constraining: if **DPoP**, confirm the proxy forwards `Authorization` + `DPoP` untouched (the
RS validates the proof); if **mTLS-bound**, wire proxy→auth mTLS and confirm the proxy sets
`X-Forwarded-Tls-Client-Cert[-Thumbprint]` from the *verified* TLS layer (any client-supplied copy is already
stripped — A1/scrub). Provision proxy→auth mTLS certs. **Pass criterion:** the chosen path works end-to-end;
no client-supplied cert header is trusted. **Cross-ref:** auth §10 / JC-3.

### JC-4 — Kill-switch 403 posture + break-glass verify mode (§8.8)

**Blocked because:** requires auth's live revocation / break-glass modes. The proxy needs no special logic — it
relays auth's status. **Procedure:** with real auth, trip the kill-switch for a principal → confirm the proxy
relays **403** and never forwards (mirrors V-4). Enter break-glass verify mode → confirm the operator still
authenticates (never blanket allow-all) and the proxy relays whatever status auth returns. **Pass criterion:**
kill-switch → 403 relayed, no upstream reached; break-glass never becomes an allow-all bypass at the proxy.
**Cross-ref:** memory [[mc-auth-kill-switch-boundary]], auth §8.8 / JC-4.

### JC-5 — Passkey enrollment on `auth.<SUITE_DOMAIN>` (origin decision)

**Blocked because:** WebAuthn enrollment is auth-side and needs a secure context on the canonical origin.
**Procedure:** stand up TLS on `auth.<SUITE_DOMAIN>` (single canonical origin across both modes — BUILD.md
passkey-origin decision); in INTERNAL mode install the internal root on the operator device **before**
enrollment; then enroll the operator passkey. **Pass criterion:** a passkey enrolled once works in both TLS
modes (origin = scheme+host+port is byte-identical across modes; the CA is not part of the origin).
**Cross-ref:** BUILD.md "Passkey-origin decision", auth §8.2 / JC-5.

### JC-7 — Host → audience binding (per-subdomain trust property) — *proxy-specific, no auth-JC counterpart*

**Blocked because:** this is the core property of a per-subdomain forward-auth edge and cannot be exercised
with the stub (which only echoes) nor with the current demo tokens (all usable ones are `aud=board`). The proxy
sends `header_up X-Forwarded-Host {host}` (Caddyfile:194) so auth can select the app audience; **no harness
step asserts either half.** **Procedure:** (a) *solo half, test-hardening candidate:* assert the stub saw
`X-Stub-Saw-XForwardedHost: board.$SUITE` on a `board` request (proves the proxy forwards the correct host);
(b) *joint half:* with real auth, mint a token scoped to a **different** audience (needs a new demo token, e.g.
`aud=notes`), present it at `board.$SUITE`, and assert real auth returns a **deny** (not 200) — proving auth
binds `aud` to the forwarded host and the proxy forwards the right host per subdomain. **Pass criterion:**
correct host forwarded per subdomain **and** a wrong-audience token is rejected at the mismatched subdomain.
**Cross-ref:** PLAN §4 (subdomain ≡ audience), auth §8.3.

### JC-P6 — Load-test verify latency against REAL auth (Stage-6 deferral) — *proxy-specific*

> Numbered **JC-P6** to avoid a false 1:1 with auth's JC-6 (which is Board/CMDB PIP fan-out — an auth-internal
> item that imposes **no proxy work**).

**Blocked because:** the stub's latency is not the real floor — real auth does token/session lookup.
**Procedure:** run the `optimization/NOTES.md §2` load-test against **real** auth under concurrency; measure
verify-subrequest latency (`caddy_reverse_proxy_upstream_latency` on the authgate handler + auth's metrics).
**Pass criterion:** p95 verify latency **≪ 250 ms** under simulated multi-agent + operator concurrency (else
tune *auth*, not the proxy — the 250 ms `response_header_timeout` denies anything slower). **Cross-ref:**
`optimization/NOTES.md` §1/§2, "Notes for Stage 7".

---

## Cross-check vs a root deployment / identifier spec

**None present.** No `context/CONTRACTS/`, deployment spec, or identifier/port registry exists in the repo at
this stage (searched repo-wide). So there is nothing to diverge from and no edit to any other app is warranted.
For the record, the proxy's routing map is **self-consistent** with its own sources: subdomain label ≡ auth
audience segment (PLAN §4), all app upstreams reached by service name on the `edge` network, edge published on
`:443`/`:80` (TCP), internal observability on the unpublished `:9100`. **Recorded divergence: none.** If a root
deployment/identifier spec is later produced by the gap-remediation pass, re-run this cross-check and record any
mismatch here (do not edit other apps from the proxy stage).

---

## Final status

**Proxy Stage 7: SOLO-VERIFIED (pending the §A-ACCEPTANCE operator harness run + A3 adapt-diff on a fresh
clone), JOINT-PENDING (JC-1…JC-5, JC-7, JC-P6 blocked on real auth).** NOT "Stage 7 complete" — the joint
checkpoint closes only when run against the real `auth` container per Part B. Four of the 16 regression
assertions (+ V-5c/V-6d/V-8/8b) are contract-double observations re-derived in JC-1; the upstream strip wall,
fail-closed matrix, internal-CA chain, Option-C invariant, and observability boundary are unconditionally solo.
