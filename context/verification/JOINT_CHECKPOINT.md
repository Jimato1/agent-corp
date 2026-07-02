# JOINT_CHECKPOINT.md — auth × proxy Stage-7 joint run (operator procedure)

> **STATUS: every checkpoint below is `NEEDS-OPERATOR-RUN`. Nothing here has been executed** —
> authored in a sandbox with no Docker/Postgres/Redis/Keycloak. This file is the *exact ordered
> procedure* the operator runs on real hardware to close the joint half of Stage 7 for `auth` and
> `proxy`. **No check may be marked "passed" until the operator has run it and seen the criterion
> hold.** Treat all un-run config as guilty until the run proves it — every prior first-boot on
> this project surfaced a real defect that construction-proofs missed.
>
> Cross-refs: `platform/auth/verification/CHECKLIST.md` Part B · `platform/proxy/verification/CHECKLIST.md`
> Part B · `platform/auth/BUILD.md` §(f) · contract authority `platform/auth/planning/PLAN.md` §8 ·
> topology `context/specs/DEPLOYMENT.md`. Bring-up artifact: root `compose.yaml`.

---

## 0. Prerequisites (operator, one-time)

- [ ] **NEEDS-OPERATOR-RUN** Docker Compose **≥ v2.20** (the `include:` element). `docker compose version`.
- [ ] `cp platform/auth/.env.example platform/auth/.env` and set real secrets (`POSTGRES_PASSWORD`,
      `KEYCLOAK_DB_PASSWORD`, `KEYCLOAK_CLIENT_SECRET`, `AUTH_ADMIN_TOKEN`). **`SUITE_DOMAIN` must be
      `suite.local`** so the proxy's `auth.suite.local`/`board.suite.local` match auth's issuer
      (`AUTH_ISSUER=https://auth.suite.local`). The root `compose.yaml` defaults `SUITE_DOMAIN=suite.local`.
- [ ] **auth's own SOLO close-outs are green first** — especially **CV-C** (SERIALIZABLE guard, the
      Stage-5 dead-on-arrival fix) and **CV-B**, per `platform/auth/verification/CHECKLIST.md` §P0/P1
      using the D-AUTH-1 recipe: `docker compose -f platform/auth/docker-compose.yml --profile test
      run --rm auth-test pytest tests/integration/test_postgres_store.py -v`. Do **not** start the joint
      run until auth is SOLO-VERIFIED on the real substrate.

## 1. Bring-up order  — `NEEDS-OPERATOR-RUN`

The proxy fail-closes (502) until auth answers, so the auth plane must be healthy **before** you drive
the edge. From the repo root:

```bash
# (a) build + start the whole joint stack (real auth plane + proxy + board echo upstream)
docker compose -f compose.yaml up -d --build

# (b) WAIT for the auth plane to come up healthy, in order:
#     postgres+redis healthy -> auth-migrate exits 0 -> auth-a/auth-b up -> keycloak healthy
#     (keycloak start_period is 180s on a cold first boot — be patient).
docker compose -f compose.yaml ps
docker compose -f compose.yaml logs -f auth-migrate   # must exit 0 (schema+seed once); Ctrl-C after

# (c) confirm auth-a is actually answering (liveness has no external dep):
curl -fsS http://localhost:8089/healthz            # -> {"status":"ok",...}

# (d) CONFIRM THE PROXY REACHES *REAL* AUTH, NOT THE STUB (the whole point):
#     real auth exposes /debug/demo-tokens (AUTH_DEMO=1 is forced for auth-a in compose.yaml);
#     the Stage-4 stub 404s it. Three eyJ… tokens here == the edge alias `auth` resolves to auth-a.
curl -sk --resolve auth.suite.local:443:127.0.0.1 https://auth.suite.local/debug/demo-tokens
```

**Pass criterion (record, do not assume):** (c) returns 200; (d) returns a JSON body with three
`eyJ…`-prefixed tokens (`valid_agent`, `refused_agent`, `self_agent`). If (d) 404s, the proxy is still
wired to a stub or the alias didn't resolve — **stop and fix before any JC below.**

> **Fallback if `compose.yaml` warns that it will not merge the included `auth-a`** (some Compose
> builds refuse to merge a same-named included service). Use the two-stack bring-up instead:
> ```bash
> docker network create edge
> docker compose -f platform/auth/docker-compose.yml up -d --build      # auth stack (set AUTH_DEMO=1 in .env)
> docker network connect --alias auth edge agent-corp-auth-a-1          # give auth-a the `auth` alias on edge
> #   then start ONLY the proxy + board on the external `edge` network (a 2-service override that
> #   declares `networks: {edge: {external: true}}`); see the inline note in compose.yaml.
> ```
> This reaches the identical topology (proxy → auth:8089 alias → real auth-a) by a runtime alias
> instead of a compose merge. Also `NEEDS-OPERATOR-RUN`.

---

## 2. JC-1 — real `/api/verify` vs the adapted harness  — `NEEDS-OPERATOR-RUN`

The harness now takes `AUTH_TARGET=real` (see `platform/proxy/test/*`). From `platform/proxy/`:

```bash
SUITE=suite.local PROXY_IP=127.0.0.1 AUTH_TARGET=real ./test/regression_headers.sh internal
# optional decision-table subset:
SUITE=suite.local PROXY_IP=127.0.0.1 AUTH_TARGET=real ./test/verify.sh internal
```

**Exact expected deltas from the stub run** (so a spurious pass/fail is obvious):
- The **A§8.9 forged-header strip battery is UNCHANGED** — all 11 needles still absent at the upstream
  (that IS the trust-boundary wall; it must not weaken against real auth).
- The **copy-only assertion flips**: instead of the literal `X-Auth-Identity: STUB.`, the upstream
  `X-Auth-Identity` must be a **structurally-valid 3-segment JWT** (`eyJ….eyJ….sig`). Optionally verify
  its signature against auth's JWKS (`GET /jwks`).
- The **three `@auth … X-Stub-Saw-*: NONE` echo assertions are SKIPPED** (real auth emits no echo). The
  verify-path scrub is guarded by the **same `(scrub)` snippet** already asserted on the upstream path
  (`conf/Caddyfile` (b)); JC-1 step 5. If you want a positive verify-path check, add a real-auth debug
  endpoint that reflects the identity headers it *received* and assert the forged ones absent.
- `verify.sh` in real mode additionally **SKIPS** the stub-only fault-injection (V-7 204, V-10/11/11c
  stop/hung/5xx) and the stub-echo log steps (V-15c/15d) and the `/login` burst (V-16) — those are
  re-covered by real-auth means (below and auth A3).

**Pass criterion:** allow-path → **200** + a valid signed JWT `X-Auth-Identity`; no-cred → **401**
(agent `Accept: application/json`) / **302** (`Accept: text/html`); `refused_agent` → **403**; every
forged identity/trust/prefix header stripped. Fails **spuriously** if any `STUB.`/`X-Stub-Saw`
assertion was left un-adapted, **vacuously** if no real token was minted. **Cross-ref:** auth JC-1.

## 3. JC-2 — authoritative `traceparent` minted + `sub`-bound  — `NEEDS-OPERATOR-RUN`

```bash
TOK=$(curl -sk --resolve auth.suite.local:443:127.0.0.1 https://auth.suite.local/debug/demo-tokens | sed -n 's/.*"valid_agent":"\([^"]*\)".*/\1/p')
curl -sk --resolve board.suite.local:443:127.0.0.1 \
  -H "Authorization: Bearer $TOK" \
  -H 'traceparent: 00-deadbeefdeadbeefdeadbeefdeadbeef-1111111111111111-01' \
  https://board.suite.local/ | tee /tmp/jc2.body
# decode the upstream X-Auth-Identity JWT payload and inspect its trace binding:
awk '/^X-Auth-Identity:/{print $2}' /tmp/jc2.body | cut -d. -f2 | base64 -d 2>/dev/null
```

**Pass criterion:** the client-supplied `deadbeef…` traceparent is **absent** from the upstream echo
(proxy `(scrub)` stripped it — this half is already solo-proven by A1's `deadbeefdeadbeef` needle); and
the authoritative trace id inside the signed `X-Auth-Identity` is **auth-minted and bound to the
validated `sub`** (retained as `claimed_parent` at most). **Cross-ref:** auth §8.7 / JC-2.

## 4. JC-4 — kill-switch 403 + break-glass verify-mode THROUGH the proxy  — `NEEDS-OPERATOR-RUN`

```bash
ADMIN='Authorization: Bearer <AUTH_ADMIN_TOKEN>'     # from platform/auth/.env
# baseline: allow through the proxy
curl -sk -o/dev/null -w '%{http_code}\n' --resolve board.suite.local:443:127.0.0.1 \
  -H "Authorization: Bearer $TOK" https://board.suite.local/            # -> 200

# (a) arm G2 quiesce on auth, then re-drive THROUGH the proxy:
curl -s -X POST http://localhost:8089/admin/killswitch -H "$ADMIN" -d '{"level":"G2"}'
curl -sk -o/dev/null -w '%{http_code}\n' --resolve board.suite.local:443:127.0.0.1 \
  -H "Authorization: Bearer $TOK" https://board.suite.local/            # -> 403 (relayed)
# repeat with an agent COOKIE instead of Bearer — must ALSO be 403 (symmetric; auth JC-4).

# (b) cross-replica kill (auth A2.2): revoke on replica A, confirm denied via replica B
curl -s -X POST http://localhost:8089/admin/revoke -H "$ADMIN" -d '{"kind":"sub","target":"agent:patcher-07","reason":"drill"}'
curl -s -o/dev/null -w '%{http_code}\n' http://localhost:8090/api/verify \
  -H 'X-Forwarded-Host: board.suite.local' -H "Authorization: Bearer $TOK"   # -> 403 at B

# (c) break-glass verify-mode: operator re-auth works; agents stay denied; NO action-side scope granted.
```

**Pass criterion:** with G2 armed, the proxy **relays 403** and never reaches the upstream (mirrors the
solo V-4), **symmetric across Bearer and Cookie**; the revoked principal is denied at the *other* replica
(live Redis read, no stale window); break-glass re-enables **operator authentication only** — never a
blanket allow-all, and holds no `gateway:execute`/`vault:read-credential`. **Cross-ref:** auth §8.8 / JC-4,
memory [[mc-auth-kill-switch-boundary]].

## 5. JC-7 — `X-Forwarded-Host` → audience binding (proxy per-subdomain trust)  — `NEEDS-OPERATOR-RUN`

The core property of a per-subdomain forward-auth edge: a token minted for one audience must be **denied**
at a different subdomain. The demo tokens make this runnable with no new mint — `self_agent` is `aud=auth`,
`valid_agent` is `aud=board`:

```bash
SELF=$(curl -sk --resolve auth.suite.local:443:127.0.0.1 https://auth.suite.local/debug/demo-tokens | sed -n 's/.*"self_agent":"\([^"]*\)".*/\1/p')
# right audience at its own subdomain -> allow:
curl -sk -o/dev/null -w '%{http_code}\n' --resolve board.suite.local:443:127.0.0.1 -H "Authorization: Bearer $TOK"  https://board.suite.local/   # -> 200
# WRONG audience (aud=auth) presented at board.suite.local -> DENY:
curl -sk -o/dev/null -w '%{http_code}\n' --resolve board.suite.local:443:127.0.0.1 -H "Authorization: Bearer $SELF" https://board.suite.local/   # -> 403 (aud mismatch)
```

**Pass criterion:** the `aud=board` token is allowed at `board.suite.local`; the `aud=auth` token is
**denied** there — proving the proxy forwards the correct per-subdomain `X-Forwarded-Host` (Caddyfile
`header_up X-Forwarded-Host {host}`) **and** real auth binds `aud` to it (auth §8.3). If both are allowed,
the audience binding is broken (a cross-subdomain confused-deputy). **Cross-ref:** PLAN §4, auth §8.3.

## 6. JC-P6 — verify latency vs REAL auth under load  — `NEEDS-OPERATOR-RUN`

The stub's latency is not the real floor — real auth does token/session/PDP work. Run the
`platform/proxy/optimization/NOTES.md §2` load test against real auth under simulated multi-agent +
operator concurrency; read `caddy_reverse_proxy_upstream_latency` on the authgate handler (proxy
`:9100/metrics`) and auth's own metrics.

**Pass criterion:** **p95 verify latency ≪ 250 ms** under concurrency (the proxy's
`response_header_timeout` denies anything slower — a p95 near 250 ms means tune **auth**, not the proxy).
**Cross-ref:** proxy `optimization/NOTES.md` §1/§2, auth A5 (M1).

---

## 7. Explicitly DEFERRED (not runnable in this bring-up — with the reason)

| JC | Deferred because | Unblocks when |
|---|---|---|
| **JC-3** DPoP/mTLS sender-constraining + proxy→auth mTLS | intra-mesh is plain HTTP here; no cert mesh is provisioned and DPoP needs the Keycloak 26.4 DPoP-GA wiring (auth gate G5) + a proof key. auth models `cnf` binding (`tokens_model.py`) but the transport hop is un-constrained. | a cert mesh exists (auth **CV-9**: proxy→auth client/server certs) and/or DPoP is wired (auth §10 / G5). Then confirm a bearer without its bound proof/cert is rejected on SoD-critical paths, and the proxy→auth leg is mutually authenticated. |
| **JC-5** passkey enrollment on `auth.<SUITE_DOMAIN>` | WebAuthn is origin-bound and needs a **real, browser-trusted** secure context on the canonical origin. This bring-up uses `curl --resolve` + `-k` (internal CA, no browser trust), so a passkey enrolled here would bind to a dev context, not the real origin. | the public hostname + browser-trusted TLS on `auth.<SUITE_DOMAIN>:443` are finalized (proxy passkey-origin decision); then enroll the operator passkey and verify TOTP recovery. **auth §8.2 requires the origin fixed before enrollment.** |
| **JC-6** Board/CMDB PIP live fan-out | **Board and CMDB do not exist yet** (build order puts them after this platform layer). The PDP's PIP seam is built + unit-tested (auth **CV-10**) but has no live producer. | Board + CMDB are built and running; then prove the PDP reads **live** `proposer_id`/ticket-state/window via the PIP (not request-supplied facts) and that `sub == proposer_id` is rejected by **both** Board and the PDP independently. |

---

## 8. Closing rule

`auth` and `proxy` reach **Stage-7 = COMPLETE** only when §§1–6 above have been **run by the operator on
real hardware** with each pass criterion observed, auth's own Part-A close-outs (incl. the A6
human-in-the-loop kill drill) are green, and the deferrals in §7 are tracked to their unblock events.
Until then both remain **SOLO-VERIFIED, JOINT-PENDING**. **This document asserts no result** — it is the
runbook, not the evidence.
