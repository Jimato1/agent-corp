# CHECKLIST.md — `auth` Stage 7 (Verification), Critical-infra — **SOLO**

> Stage 7 confirms **spec-conformance + the shared invariants** (root CLAUDE.md). auth is
> **Critical-infra**, so Verification must *prove* — by written proof **and** the operator's
> real-host run — that (a) no single-component/agent path reaches a destructive action, and
> (b) the kill switch halts action. Stages 5–6 are complete but **proven-by-construction**;
> the real-substrate runs below are what convert that to proven-in-fact.
>
> **This file is the SOLO half.** Each Part-A item states: the property, what is
> **SOLO-provable now** (unit tests / written proof, done in this sandbox), and the exact
> **real-host close-out command** the operator runs. Part B (joint, blocked on the real
> proxy) is specified but **never marked passed**. Frozen & untouched this stage: SoD logic,
> token model, PDP/PEP, scopes/ConflictSet, `/api/verify`, kill-switch semantics.
>
> **Honesty ledger for this run:** nothing was run against Docker/Postgres/Redis/Keycloak/TPM
> (absent in sandbox). Sandbox-run today: **268 unit tests OK (1 EdDSA skip)** + **10
> integration tests skip cleanly** (3 `test_postgres_store` + 7 `test_redis_fanout`; the
> prompt's "11" is off by one — the verified count is **10**). All CV-*/M-* items are
> **NEEDS-REAL-HOST**; code/compose facts are **VERIFIED-IN-CODE** with file:line.

---

## 0. Durability-profile decision (the cold boot needs this first)

**Correction recorded (be skeptical of the framing):** `AUTH_ALLOW_SINGLE_NODE` means *single
Redis node* (no Redis **replica**) — it does **not** mean a single auth replica. The committed
compose runs **both** `auth-a` + `auth-b` over **one** shared Postgres + **one** shared Redis.
So **cross-replica kill fan-out (CV-D/CV-E) is runnable on the default profile** — it does *not*
need a Redis replica. The only thing a Redis replica adds is **write-before-ack durability**.
Run the profiles in this order:

| Profile | What it is | Command | CAN verify | CANNOT verify |
|---|---|---|---|---|
| **P0 — smoke / isolate** *(recommended first)* | one auth replica only | `docker compose -f platform/auth/docker-compose.yml up -d postgres redis keycloak auth-migrate auth-a` | CV-A boot, CV-B tests, CV-C SoD-on-PG, CV-F KC-outage, CV-G gates, M1/M2/M4 latency | CV-D/CV-E (needs 2 replicas), write-before-ack, G9 |
| **P1 — as-committed** *(2 replicas, single Redis)* | `auth-a`+`auth-b`, `AUTH_ALLOW_SINGLE_NODE=1`, `AUTH_REDIS_WAIT_REPLICAS=0` | `docker compose -f platform/auth/docker-compose.yml up -d --build` | everything in P0 **+ CV-D/CV-E cross-replica kill** | write-before-ack durability, G9 |
| **P2 — active-active durable** | add a Redis replica; `AUTH_REDIS_WAIT_REPLICAS>=1`; **drop** `AUTH_ALLOW_SINGLE_NODE` | see §Durability-upgrade below | **+ write-before-ack** (revoke durable on replica *before* ack) | G9 primary failover |
| **CV-H — G9 failover** | 3-node Patroni+etcd + Redis Sentinel (multi-node hardware) | see CV-H | **+ true primary failover** | — (this is the Stage-7 external ceiling) |

**Durability-upgrade (P1→P2):** add `redis-replica` (`image redis:7`, `command: redis-server
--replicaof redis 6379 --appendonly yes`, ping healthcheck); in `.env` set
`AUTH_REDIS_WAIT_REPLICAS=1` and remove `AUTH_ALLOW_SINGLE_NODE`; `up -d --build`. Then
`make_hotstore()` takes the WAIT≥1 path (not the single-node exception) and a revoke blocks on
replica receipt before the operator ack (no ≤1s AOF resurrection window). Raising the WAIT
budget raises the effective Redis `socket_timeout` (`max(0.25, wait_ms/1000+0.05)`) — expected
coupling (NOTES §4).

---

## PART A — SOLO verification

### A1 — INVARIANT: Segregation of duties holds on the migrated substrate
The central Critical-infra property: no single component/agent reaches a destructive action;
approve-side ⊕ action-side holder scopes are never co-issued; the ConflictSet is immutable.

| # | Property | SOLO-provable now | Real-host close-out (operator) | Pass criterion |
|---|---|---|---|---|
| A1.1 | Written SoD proof on the new substrate | `security/THREAT_MODEL.md §1` (walkthrough: immutable compiled-in `CONFLICT_SET`/`HOLDER_ALLOWED_KINDS`; per-mutation full affected-set enforcement on one tx cursor; approve⊕execute unco-issuable) | — (read the proof) | proof holds; no Postgres row feeds the conflict set |
| A1.2 | SoD enforcement identical across backends | 268 unit tests exercise the **shared** `_invariants`/`_graph` via SQLite; `test_store_backends.py` asserts both backends delegate to them | — | green in sandbox ✓ (`268 OK`) |
| A1.3 | **CV-C** — concurrent conflicting grants can't both commit on real Postgres (the SERIALIZABLE guard that was *dead-on-arrival* in Stage-5 finding #1 — **must be seen to pass, not trusted**) | test authored: `tests/integration/test_postgres_store.py::test_concurrent_conflicting_grants_cannot_both_commit` | **(D-AUTH-1 recipe — runs in the `test` image with pytest + tests baked in and `TEST_DATABASE_URL` preset):** `docker compose -f platform/auth/docker-compose.yml --profile test run --rm auth-test pytest tests/integration/test_postgres_store.py -v` | exactly **one** side of a conflict pair commits; the other aborts (40001 → bounded jittered retry → fail-closed reject). Never both. |
| A1.4 | **M5** — SERIALIZABLE retry stays fail-closed under contention | `postgres_store.py::_with_serialization_retry` (bounded, re-raises after last attempt; jitter) | fire N parallel jointly-conflicting `POST /admin/roles/assign`; `psql -c "SELECT xact_rollback FROM pg_stat_database WHERE datname=current_database();"` | exactly one commits, rest deny (400/500); `xact_rollback` bounded (jitter caps re-collisions), no runaway storm |

### A2 — INVARIANT: Kill switch physically halts action (cross-replica)
The new distributed safety surface. Revoke on one replica must be honored by the other.

| # | Property | SOLO-provable now | Real-host close-out (operator) | Pass criterion |
|---|---|---|---|---|
| A2.1 | Cross-replica fan-out mechanics | `test_redis_fanout.py` (revoke on A read by B; pub/sub delta carries monotonic epoch; `consult_snapshot` parity) — skips w/o Redis | **(D-AUTH-1 recipe):** `docker compose -f platform/auth/docker-compose.yml --profile test run --rm auth-test pytest tests/integration/test_redis_fanout.py -v` | all pass: A's SET/INCR/PUBLISH read live by B; epoch monotonic |
| A2.2 | **CV-E** — live revoke on A (`:8089`) denied via B (`:8090`) — exact procedure | wiring verified in code: `POST /admin/revoke` (kind `sub`→`killswitch.revoke_principal`→ledger append **then** `hot.set_revoked_before` = Redis `denylist:sub:{sub}`; kind `client_id`→`disable_client`; kind `kid`→JWKS-prune-first) | (P1) revoke on A: `curl -X POST localhost:8089/admin/revoke -H "Authorization: Bearer $ADMIN" -d '{"kind":"sub","target":"agent:x","reason":"drill"}'` → then on B: `curl -i localhost:8090/api/verify -H 'X-Forwarded-Host: board.suite.local' -H 'Authorization: Bearer <agent:x token, iat<now>>'` | B returns **403/deny** for the revoked principal (no stale-replica window — verify reads Redis live) |
| A2.3 | Kill-switch G2 door posture bites cross-replica | unit: `test_verify` KillSwitchPosture + `test_g2_refuses_an_agent_typed_COOKIE_session_too` | (P1) `POST localhost:8089/admin/killswitch -d '{"level":"G2"}'` → `curl -i localhost:8090/api/verify …` with an agent Bearer **and** an agent cookie | both agent credentials → **403** at B; operator (human) still authenticates |
| A2.4 | Redis-independent kill (heartbeat + JWKS-prune) | `retire_kid` ordering fixed (JWKS prune first, Redis best-effort) — `server.py` `_route_admin` kind=`kid`; THREAT_MODEL §3 | (P1) with Redis **down**: `POST localhost:8089/admin/revoke -d '{"kind":"kid","target":"<kid>"}'` → confirm `GET /jwks` no longer serves that kid; response `committed:true, degraded:redis_unavailable` | JWKS kill lands even with Redis down; RS token validation fails suite-wide on next JWKS refresh |

### A3 — INVARIANT: Fail-closed on real dependencies

| # | Property | SOLO-provable now | Real-host close-out (operator) | Pass criterion |
|---|---|---|---|---|
| A3.1 | **CV-F** — control plane + kill switch survive **Keycloak STOPPED** | grep proof: **zero** `KEYCLOAK_URL` code refs; `/authorize`+`/token` static 501; construction/verify/kill never dial KC (THREAT_MODEL §4); compose `keycloak: service_started` | `docker compose … stop keycloak && curl -fsS localhost:8089/healthz && curl -i localhost:8090/api/verify -H 'X-Forwarded-Host: board.suite.local' -H 'Authorization: Bearer <agent>'` then set G2 | `/healthz`→200, `/api/verify` works with KC down; after G2, verify→403 |
| A3.2 | **M3** — Redis hang → deny **fast** (~0.25s, not 5s) — the tail-latency safety property (*do not skip*) | `redis_hot.py` `socket_timeout≈0.25` floored above WAIT budget; `consult_denylist` fail-closes on read error (unit `test_consult_snapshot::test_fail_closed_when_snapshot_read_raises`) | with load running: `redis-cli -h <redis> DEBUG SLEEP 10` (or iptables DROP) | `/api/verify` returns fail-closed **deny in ~socket_timeout**, not 5s; worker threads recover (no pool/fd exhaustion) |
| A3.3 | **M6** — PG failover hands out no dead connection | `postgres_store.py` pool `check=ConnectionPool.check_connection`, `max_lifetime=1800` (NOTES §4, driver-verified) | `docker compose … restart postgres` mid-load; then `POST /admin/killswitch` | 500 burst ≈ 0 across restart; killswitch POST returns `committed:true` first try |
| A3.4 | Postgres unreachable at boot crashes loudly (hard dep) | `pool.open(wait=True, timeout=10)` (driver-verified raises `PoolTimeout`) | stop postgres, `up auth-a` → container crash-loops (does not serve broken) | replica does not report healthy while store is down |

### A4 — Test suite green **in-container on the real substrate** (CV-B)

| # | Property | SOLO-provable now | Real-host close-out (operator) | Pass criterion |
|---|---|---|---|---|
| A4.1 | 268 unit tests green with the **real EdDSA** signer | sandbox: `268 OK (1 EdDSA skip)` — the skip is the Ed25519 primitive, closed once `cryptography` is present | `docker compose … run --rm -e AUTH_STORE=sqlite -e AUTH_HOTSTORE=memory auth-a python -m unittest discover -s /app/src/auth/tests -v` | **268 OK, 0 skips** (real Ed25519 runs); no failures |
| A4.2 | Integration tests run against **Postgres/Redis, not the SQLite/Memory default** | 10 integration tests skip cleanly w/o drivers; they require `TEST_DATABASE_URL`/`TEST_REDIS_URL` (skipUnless) — so they *cannot* silently pass on the in-proc default | the CV-C + CV-D pytest commands above (they set `TEST_DATABASE_URL`/`TEST_REDIS_URL`) | integration tests **execute** (not skip) and pass against real PG+Redis |

### A5 — Hot-path measurements (attach MEASURED numbers; both ≪ proxy 250ms budget)

| # | Property | SOLO (modeled) | Real-host close-out (operator) | Pass criterion |
|---|---|---|---|---|
| A5.1 | **M1** — door `/api/verify` live path p50/p95 | modeled p50 ≈ 1–2ms, p95 ≈ 4–6ms (2 PG + 2 Redis + sign) NOTES §2 | `vegeta attack -targets=verify.tgt -rate=500 -duration=30s \| vegeta report` (target: `GET :8089/api/verify` + `Authorization: Bearer <agent>` + `X-Forwarded-Host: board.suite.local`) | measured **p95 ≪ 250ms** |
| A5.2 | **M2** — batched read saving (O2: 5 seq → 1 pipelined) | equivalence locked by 10 unit tests + `consult_snapshot` | `redis-benchmark -h <redis> -n 200000 -c 50 -q -t get` vs `-P 5` | pipelined (`-P 5`) ≈ 5× throughput of non-pipelined |
| A5.3 | **M4** — pool not the bottleneck | fleet budget `2×16 + KC 40 + migrate + 3 ≈ 79 < 200` (NOTES §4) | during M1: `psql "$DATABASE_URL" -c "SELECT usename, application_name, count(*), state FROM pg_stat_activity GROUP BY 1,2,4 ORDER BY 3 DESC;"` + watch `pool.get_stats().requests_waiting` | auth+KC total < `max_connections`; `requests_waiting` stays 0 |
| A5.4 | benign FAST_PATH never consults Redis | code-confirmed `revocation.py` `FAST_PATH`→allow with no `hot.*` call (NOTES §3) | (part of M1) benign scope path shows **zero** Redis round-trips | p95 < 1ms; no Redis op on the fast path |

### A6 — HUMAN-IN-THE-LOOP kill-switch test (unique to auth; operator, against the running UI)
The kill-switch/halt UX **cannot** clear Stage 7 on an automated checklist — the operator must
personally engage it under simulated pressure (SETTLED DECISIONS). Procedure + pass criteria:

| # | Property (UI_SPEC §10.1) | Operator procedure | Pass criterion |
|---|---|---|---|
| A6.1 | **Halt fast to reach** — `Shift+Esc` *focuses* (never fires) header ENGAGE-FREEZE from any screen + force-dismisses non-STOP modals; fallback chord `Ctrl+Alt+H` wired identically | on real target browsers/OS: press `Shift+Esc` from several screens; if Chromium captures it, confirm `Ctrl+Alt+H` reaches ENGAGE-FREEZE | halt control is reachable in one chord from anywhere; **at least one** non-browser-captured chord works on the actual browsers |
| A6.2 | **Halt dwell times** ~600ms (G1) / ~1000ms (G2) tunable defaults | under simulated stress at ~375px, engage G1 then G2 by touch | dwell feels deliberate-not-sluggish; G2 requires clearly longer intent than G1; tune if not |
| A6.3 | **Honest post-action state** — confirmed-vs-pending, never a false "all halted" | arm G2; watch the status surface while replicas/Gateway confirm | UI shows **pending → confirmed** per enforcement point; it never claims "all halted" before independent confirmation |
| A6.4 | **G2 escalation cue survives distance/low-color** — intensified-gold **+ non-hue** cue (motion/shape/size) | from ~2m and with a color-blind sim, compare G1 vs G2 | G2 is distinguishable from G1 **without** relying on hue alone |
| A6.5 | **Break-glass presents NO approve/execute-relax affordance** | open break-glass / verify-mode in the UI | there is **no** control to relax the SoD conflict-set or grant approve/execute; break-glass only re-enables operator authentication (never blanket allow-all) |

### A7 — Standard Critical-infra hygiene

| # | Property | Status | Evidence / close-out |
|---|---|---|---|
| A7.1 | `/admin/*` + `/revoke` operator-only; **constant-time** compare | **VERIFIED-IN-CODE** | `server.py:641-643` 401 if `not _is_admin`; `:766-770` `secrets.compare_digest`. Close-out: `curl -s -o/dev/null -w '%{http_code}' -X POST :8089/admin/killswitch` → **401**; with correct bearer → 200. **DIVERGENCE (A7.1a):** the gate is a shared admin **bearer token**, not an RBAC operator-role/verify'd session (`server.py:226-228`, `.env.example:85-88` acknowledge prod should gate on a verify'd session + `auth:manage-identity` — **not yet wired**). Record as residual. |
| A7.2 | `GET /debug/demo-tokens` gated by `AUTH_DEMO`, **off by default** | **VERIFIED-IN-CODE** | `server.py:417-419` route exists only when `AUTH_DEMO=="1"`; `.env.example:93`/compose default `0`. Close-out: `curl -s -o/dev/null -w '%{http_code}' :8089/debug/demo-tokens` → **404** by default |
| A7.3 | No secrets in logs/errors | **VERIFIED-IN-CODE** | `server.py:470-477` catch-all returns `{"error":"internal"}` (no `str(e)`); stderr prints stack + method/path + issuer/alg only, never the DSN password (libpq masks it). Close-out: trigger a backend fault, confirm 500 body is exactly `{"error":"internal"}` |
| A7.4 | MCP surface read/self-only; principal forced to caller | **VERIFIED-IN-CODE** | `server.py:611-636` caller built only from the validated token (`sub=claims.sub`); `surface.py:243-266` `_forbid_cross_principal` → 403 on any `sub/principal/on_behalf_of/…`; only 4 **read** tools registered (`surface.py:196-201`). **Stronger than claimed:** there are **no** write tools on MCP at all (writes live only on the admin surface). Close-out: agent token + body `{"sub":"op:eide"}` → **403**; self call → 200 |
| A7.5 | `8089/8090` unpublished in prod (reach auth only via proxy) | **DIVERGENCE** | `docker-compose.yml:86-87,106-107` publish both **unconditionally**; a comment explains the cross-replica demo but there is **no flag/profile** to disable them for prod. **Operator must strip the two `ports:` blocks (or move behind a compose profile) for prod.** |

---

## PART B — JOINT CHECKPOINTS (blocked on the real proxy — **never marked passed**)
Cross-referenced to proxy's JC list (`platform/proxy/BUILD.md`). Status: **NEEDS-REAL-HOST** for
all. Verify contract authority: `PLAN §8` (esp. §8.6 header-scrub, §8.10 one-screen ref).

| JC | Procedure | Pass criterion |
|---|---|---|
| **JC-1** real `/api/verify` vs proxy `regression_headers.sh` **with harness adaptation** | The stub harness asserts the literal `STUB.` token — against real auth it **must** be adapted to mint a real agent token (`AUTH_DEMO=1` → `GET /debug/demo-tokens`) and assert a **structurally-valid JWT** (three base64url segments), not a string match. Drive the proxy with `X-Forwarded-Host`/`X-Forwarded-Uri`/`Authorization`. | Adapted harness: valid agent → **200** + a 3-segment `X-Auth-Identity` JWT; no cred → **401** (agent) / **302** (browser); refused → **403**; 5xx fail-closed. Fails **spuriously** if the stub `STUB.` assertion is left in, or **vacuously** if it never mints a real token. |
| **JC-2** authoritative traceparent bound to `sub` | auth **mints** the W3C traceparent server-side and co-signs it into `X-Auth-Identity` alongside `sub`; the proxy **strips** any client-supplied traceparent (§8.6). | minted traceparent present in `X-Auth-Identity`; a client-supplied `traceparent` never becomes the attribution key (audit-only `claimed_parent`) |
| **JC-3** DPoP/mTLS sender-constraining + proxy→auth mTLS | intra-mesh is plain HTTP today; provision DPoP (Keycloak 26.4 GA, gate G5) or the mTLS fallback, and proxy→auth mTLS. | a bearer without the bound proof-of-possession/cert is rejected on SoD-critical paths; proxy→auth leg is mutually authenticated |
| **JC-4** kill-switch 403 posture + break-glass verify-mode **through the real proxy** | arm G2 at auth; through the proxy send an agent Bearer **and** an agent cookie → both 403; operator session still authenticates; take Redis/PDP down, enter break-glass → operator regains control, agents stay denied, break-glass holds **no** action-side scope. | 403 symmetric across Bearer+Cookie; operator authenticates; break-glass relaxes fail-closed for the operator only (never blanket allow), grants no `gateway:execute`/`vault:read-credential` |
| **JC-5** passkey enrollment on `auth.<SUITE_DOMAIN>` | finalize public hostname + valid TLS/trust at the proxy **first**, confirm the browser reaches `https://auth.<SUITE_DOMAIN>:443` trusted, **then** enroll the operator passkey; verify TOTP recovery. | passkey enrolls + logs in on the canonical origin (origin-bound to the final hostname, not a dev origin) |
| **JC-6** Board/CMDB PIP live fan-out — **further-deferred** | Board and CMDB **do not exist yet** (build order). Once they do: prove the PDP reads **live** `proposer_id`/ticket-state/window via the PIP, not request-supplied facts; `sub == proposer_id` rejected by **both** Board and PDP independently. | blocked twice over (apps not built + needs them running); do not schedule until Board/CMDB exist |

---

## Spec-divergence recorded (per the gap-remediation cross-check)

1. **No root deployment / state-machine / identifier / CONTRACTS spec exists** anywhere in the
   repo (only `context/ARCHITECTURE.md`, `context/PROCESS.md`, and the **superseded**
   `agent-corp-context-brief.md`). There is therefore **no root authority to reconcile auth's
   ports/network/PDP-states against**. auth's de-facto record stands: host ports **8089**
   (auth-a) / **8090** (auth-b) / **8080** (keycloak); PDP/ticket states follow
   `ARCHITECTURE.md §5` (`todo→in_progress→(awaiting_approval→)needs_review→done`, `blocked`).
   **If** a root state-machine authority is later produced, auth's PDP enforcement of the
   approve-side states (`awaiting_approval`, four-eyes `sub≠proposer_id`) must be reconciled to
   it — flagged, not actioned (do not edit other apps).
2. **Admin gate = shared bearer token, not RBAC** (A7.1a) — prod must move to a verify'd
   operator session + `auth:manage-identity`.
3. **`8089/8090` published unconditionally** (A7.5) — no prod-off flag; strip for prod.
4. **`auth-a`/`auth-b` declare no docker-compose `healthcheck`** though the app serves
   `/healthz` (pure liveness). Nothing downstream can gate on their `service_healthy`; the
   operator must probe `/healthz` manually (as CV-F does). Consider adding a compose
   healthcheck in a follow-up (not this stage — no behavior change permitted).
5. **Framing correction** (§0): single-Redis-node ≠ single-auth-replica; CV-D/CV-E run on the
   default 2-replica profile without a Redis replica.
6. **D-AUTH-1 FIXED** (operator first-boot): the CV-C/CV-D pytest close-outs could not run as
   written — pytest was undeclared, the prod image is non-root (no run-time pip), and the
   integration `tests/` dir was not COPYied in. Fixed: `requirements-dev.txt` (pytest), a
   Dockerfile `test` target (root, installs dev deps, COPYs `tests/`), and a `--profile test`
   `auth-test` compose service that presets `TEST_DATABASE_URL`/`TEST_REDIS_URL` on the stack
   network. CV-C/CV-D/CV-4 commands updated to `--profile test run --rm auth-test pytest …`.
   CV-B unit tests are unchanged — they run in the `runtime` image via stdlib `unittest`
   (no pytest, no dev deps needed). **Still NEEDS-OPERATOR-RUN** — not run in this sandbox.

---

## Status

**What is SOLO-VERIFIED now (sandbox, unit-provable):** the written SoD proof (A1.1) and its
shared-enforcement parity (A1.2); the batched-consult equivalence + fail-closed (A3.2 unit);
kill-switch G2 door posture + retire_kid ordering (A2.3/A2.4 unit); MCP read/self-only + admin
constant-time + demo-token gating + no-secret-500 (A7.1–A7.4); **268 unit OK / 10 integration
skip-clean**. All driver signatures re-verified against current docs (NOTES §6).

**What remains (operator, real host):** every CV-*/M-* run (A1.3, A1.4, A2.1, A2.2, A3.1, A3.3,
A3.4, A4, A5), the human-in-the-loop drill (A6), and all of Part B (JC-1…JC-6).

> **`auth` reaches: SOLO-VERIFIED, JOINT-PENDING.**
> **NOT "Stage 7 complete"** — Stage 7 closes only when the operator has run the P0→P1(→P2)
> close-outs above, performed the A6 human-in-the-loop kill drill, and the joint checkpoints
> JC-1…JC-6 pass through the real proxy.
