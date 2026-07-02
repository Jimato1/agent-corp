# THREAT_MODEL.md — `auth` (identity gateway, **Critical-infra**), Stage 5

> Stage 5 = **Security hardening** on the **migrated** substrate. Per PROCESS.md, a
> Critical-infra app **cannot exit this stage on a light checklist**: it must *prove*
> segregation of duties holds, the agent never receives plaintext it shouldn't, the
> kill switch physically bites, and high-stakes paths fail closed — **on what actually
> runs** (Postgres + Redis + 2 replicas + EdDSA), not the Stage-4 substitutes.
>
> Scope guard: this stage did **not** change SoD logic, the token model, the PDP/PEP,
> scopes/ConflictSet, or the `/api/verify` contract — those were proven in Stage 4. It
> **migrated** the substrate behind the Protocol seams and **hardened** the result.
> Full CANNOT-VERIFY-HERE list + operator commands at the end; nothing was faked green.

---

## 0. What migrated (decision #8 — the opening move, before any hardening)

The Protocol seams (`auth.core.interfaces.Store` / `HotStore` / `Signer`) made this a
**config/impl swap, not a rewrite** — every surface still speaks only the Protocol.

| Substitute (Stage 4) | Production (Stage 5) | New module | Selected by |
|---|---|---|---|
| SQLite `SQLiteStore` | **Postgres** `PostgresStore` (psycopg 3, pooled) | `store/postgres_store.py` | `AUTH_STORE=postgres` |
| in-process `MemoryHotStore` | **replicated Redis** `RedisHotStore` (Lua + pub/sub) | `store/redis_hot.py` | `AUTH_HOTSTORE=redis` |
| single node | **active-active**: `auth-a` + `auth-b` over shared PG+Redis | `docker-compose.yml` | two services |
| HMAC test-signer | **EdDSA-prod** (Ed25519) | `crypto/signer_eddsa.py` | `AUTH_SIGNER_ALG=EdDSA` |

**Parity-by-construction (the load-bearing move).** The SoD/attestation/kind decisions
were extracted to **one shared module** `store/_invariants.py` and the closure
computation to `store/_graph.py`; **both** `SQLiteStore` and `PostgresStore` delegate to
them. So the 247-test suite that exercises SQLite exercises *exactly the enforcement code
Postgres runs* — the SoD algorithm is not re-implemented per backend. Runnable proof
here: `tests/test_store_backends.py` (11 tests) asserts Protocol conformance
(`issubclass(PostgresStore, Store)`, `issubclass(RedisHotStore, HotStore)`), identical
public surface, and that both backends call `INV.enforce_grant_invariants` / `GRAPH.*`.

**Test status:** `258 tests OK (1 EdDSA skip)` in the sandbox (SQLite/Memory defaults).
The migrated backends are import-clean without their drivers (lazy-import discipline) and
verified end-to-end by the operator integration tests (§8, CANNOT-VERIFY-HERE).

**HA framing (verified, cited).** "Active-active" = N **stateless app** replicas over
**one shared single-primary Postgres + one Redis**. A single primary is the one source
of truth, so **read-your-writes holds for free** (a grant committed by replica A is
immediately visible to replica B — no standby in the SoD read path). **True database
failover** (multi-node Patroni+etcd surviving loss of the *primary*, Redis Sentinel) is a
distinct **multi-node-hardware gate (G9)** — CANNOT-VERIFY-ON-A-LAPTOP (§8).

---

## 1. Segregation of duties HOLDS on the migrated substrate (the central proof)

SoD property: *no single component, and never an agent, can unilaterally cause a
destructive real-world action; approve-side and action-side holder scopes are never
co-issued to one principal.* `auth` is the substrate that makes this enforceable — if
identity were forgeable or the ConflictSet relaxable, the four-holder property collapses.

**Walkthrough — why it survives the SQLite→Postgres swap:**

1. **The ConflictSet is compiled-in and immutable, not stored.** `CONFLICT_SET` is
   computed at import from hardcoded `HOLDER_SCOPES` via `_ImmutableConflictSet`
   (`__setattr__`/`__delattr__` raise); `HOLDER_ALLOWED_KINDS` is a `MappingProxyType`.
   `PostgresStore.SCHEMA_SQL` contains **no** conflict-pair or holder-kind table — **no
   Postgres row feeds the conflict set.** Changing the four approve/execute pairs remains
   a code change + redeploy (decision #5). *(Red-team A1-attack-3: NON-ISSUE.)*

2. **Every widening mutation runs the full affected-set enforcement, atomically.**
   `assign_role` / `grant_scope_to_role` / `add_role_hierarchy_edge` / `put_role` each
   insert, recompute the **complete downward-transitive affected set**
   (`_principals_assigned_role_cur`), and run `INV.enforce_grant_invariants` over each
   affected principal's post-mutation closure — SSD conflict, per-holder kind, role
   kind-gate, non-exportable-key attestation — **inside one transaction on one cursor**,
   so the enforcement observes the *uncommitted* insert (`_TxReader` wraps the tx cursor).
   Any violation rolls the whole transaction back (atomic reject). *(A1-attack-2/4:
   NON-ISSUE — verified same-cursor read + full fan-out, mirrors SQLite.)*

3. **NEW multi-writer hazard — closed by SERIALIZABLE.** SQLite had a single writer;
   active-active Postgres does not. Two replicas could each add one side of a conflict
   pair to the same effective principal — each individually safe, jointly a violation.
   Under READ COMMITTED neither sees the other's uncommitted insert and **both commit** —
   an SoD escape. Fix: the connection pool is configured **SERIALIZABLE pool-wide**
   (`configure=` sets `conn.isolation_level`), so Postgres aborts one of a dangerous pair
   with `40001`; `_with_serialization_retry` retries a bounded number of times then
   surfaces (fail-closed — never a silent commit-less pass). Proven by the operator test
   `tests/integration/test_postgres_store.py::test_concurrent_conflicting_grants_cannot_both_commit`.

   > **Adversarial CRITICAL (found + fixed).** The first implementation set isolation via
   > `conn.transaction(isolation_level=…)` — **not a valid psycopg3 signature** (the infra
   > research asserted it; the red-team bound the signature and caught the `TypeError`).
   > As written it crashed every grant (fail-closed, but the SERIALIZABLE defense never
   > ran), and the naïve fix (drop the kwarg) silently downgrades to READ COMMITTED = a
   > real concurrent SoD escape. **Resolved:** isolation is set on the connection via the
   > pool `configure` and `transaction()` is argument-free. This is why the whole Postgres
   > path is honestly marked CANNOT-VERIFY-HERE until the operator runs the concurrent test.

4. **Approve⊕execute is never co-issuable to one token.** Audience-bound per-resource
   tokens + the immutable ConflictSet + the PDP `forbid` (unchanged Stage-4 logic) mean a
   principal cannot hold both sides, and even a hypothetically mis-issued dual-scope token
   is denied at use. Agents hold no credentials and cannot self-approve (no-self-approval
   PDP backstop, unchanged).

**Conclusion:** no single-component or agent-only path reaches a destructive action on the
migrated substrate; the immutable ConflictSet + HOLDER_ALLOWED_KINDS survive the swap.

---

## 2. Agent never receives plaintext it shouldn't; MCP stays read/self-only

- The **MCP surface** (`mcp/surface.py`) is unchanged: principal **forced to the caller**
  (cannot act as another `sub`, cannot widen own scope), read/self-only, all writes
  delegate to the Core API. Audience-bound to `auth`; a token for another audience cannot
  reach the self-service tools.
- **Vault inversion preserved:** agents get handle references only; plaintext credentials
  are redeemable solely by the Gateway — `auth` never mints plaintext to an agent.
- **Signing keys:** the private EdDSA halves live in `auth`; RSes get only the **public**
  JWK via JWKS. `AgentKey` stores the **public** half + attestation only.
- **No secrets in logs (hardened):** the catch-all 500 no longer echoes exception text
  (would disclose DSN host/table/driver internals on the migrated substrate) — logs
  server-side, returns a generic error. libpq masks the DSN password. *(Red-team A4-LOW:
  fixed.)*

---

## 3. Kill switch physically bites cross-replica (the safety property)

**Method — how a revoke on one replica is honored by the other:**

- **Shared Redis is the fan-out for correctness, not the pub/sub.** When `auth-a` calls
  `deny_jti` / `set_revoked_before` / `set_killswitch`, it `SET`s the authoritative key in
  the **one** Redis both replicas point at. `auth-b`'s next live revocation consult reads
  the **same** key and denies — no propagation delay beyond one Redis round-trip. The
  verify/PDP path reads Redis **live** (not a per-replica in-memory cache), so there is no
  stale-replica window. *(Red-team A2-attack-1: NON-ISSUE — confirmed live shared read.)*
- **`auth:revocations` pub/sub is the push channel for downstream RS caches**
  (Gateway/Vault/Board): each revoke `PUBLISH`es the delta carrying the **new monotonic
  epoch**, atomically with the `SET`+`INCR` in one **Lua** script (`register_script`) —
  a MULTI/EXEC pipeline can't embed the INCR result in the publish. On reconnect a
  subscriber re-`SCAN`s a full snapshot before serving (deltas during a disconnect are
  lost — Redis pub/sub is fire-and-forget). A `~500ms` heartbeat advances the epoch/ts so
  a stale RS fails its destructive path closed. *(A2-attack-5: NON-ISSUE — atomic.)*
- **Redis-INDEPENDENT kill (§7.3) — ordering fixed.** `retire_kid` also drives the
  **JWKS-kid-prune + signed kill epoch**, so the operator can STOP even with Redis down.

  > **Adversarial HIGH (found + fixed).** `/admin/revoke {kind:kid}` originally called
  > `retire_signing_key` (which hits Redis) **before** `keyring.retire` (the JWKS prune),
  > so a Redis outage raised **before** the Redis-independent kill landed — the one path
  > designed to survive a Redis outage was disabled by it. **Resolved:** the local JWKS
  > prune lands **first**; the Redis projection is best-effort and returns an honest
  > `degraded: redis_unavailable` ack. RS token validation now fails suite-wide on the
  > next JWKS refresh regardless of Redis.
- **Write-before-ack (§4.6 finding 3d) — made an explicit decision.** A revoke must be
  durable before the operator ack.

  > **Adversarial HIGH (found + fixed).** `require_replicas=0` (the old silent default)
  > ack'd a revoke after only an in-memory primary write — a crash inside the AOF-everysec
  > window could resurrect a revoked token. **Resolved:** `factory.make_hotstore()` now
  > **refuses** the Redis backend unless `AUTH_REDIS_WAIT_REPLICAS>=1` (WAIT for replica
  > receipt) **or** `AUTH_ALLOW_SINGLE_NODE=1` is *explicitly* set (the isolated gate boot,
  > AOF everysec `≤1s` loss window). The unsafe default is now a loud, explicit choice.
  > Residual: `WAITAOF` (fsync-before-ack) and denylist rehydrate-from-ledger — §7.

**Demonstrable (operator, §8):** revoke via `:8089`, confirm denied via `:8090`; and the
whole thing works **with Keycloak stopped** (§4).

---

## 4. Keycloak-outage decoupling (Phase 2: `service_healthy` → `service_started`)

**Change:** `auth-a`/`auth-b` depend on `keycloak: condition: service_started` (was
`service_healthy`); Postgres and Redis remain **hard deps** (`service_healthy`). Rationale:
auth-core's verify / kill switch / introspection do **not** need Keycloak — only the
`/authorize`+`/token` OIDC flow does. A Keycloak wobble must **degrade** (those flows
unavailable), not **kill** the control plane.

**Proof (red-team A3-attack-1: NON-ISSUE, verified):** a full grep of `src/` for
`KEYCLOAK_URL`/`keycloak` shows **zero code references** — the var is consumed nowhere in
Python. `AuthApp.__init__` constructs Store/HotStore/signers/killswitch with no Keycloak
call; `/authorize`+`/token` return a static `501` and never dial Keycloak; `/api/verify`
and the kill switch touch only the shared Store/HotStore. So a Keycloak outage cannot crash
construction or block verify/kill. **Operator demo (§8): stop keycloak → `/healthz` 200,
`/api/verify` works, set G2 → agents get 403 at the door.**

---

## 5. Fail-closed matrix on the REAL dependencies (verified by red-team)

`/healthz` is a **pure liveness** check (touches neither store nor hot) so a backend blip
does not flap liveness. Per-dependency posture:

| Failure | Benign read (Tier-1) | Destructive / SoD / kill path | Verdict |
|---|---|---|---|
| **Redis down** | FAST_PATH: local JWT, no denylist consult → available (≤ TTL staleness) | `consult_denylist` wraps every `hot.*` read in try/except and returns **`revocation_unreadable` → DENY**; store reads **raise** (never return `False`) on `ConnectionError` | **FAIL-CLOSED** ✓ (A2-attack-2, A3-attack-4: NON-ISSUE) |
| **Postgres down at boot** | — | `PostgresStore.__init__` now `pool.open(wait=True, timeout=10)` → **crashes construction loudly** (hard dep, restarts) instead of a healthy-but-broken replica | **FAIL-CLOSED** ✓ (A3-MEDIUM: fixed) |
| **Keycloak down** | unaffected | unaffected; only `/authorize`+`/token` degrade | **DEGRADE, not kill** ✓ |
| **Replica lag** | n/a — single shared primary, no standby in the read path | n/a | **no gap** ✓ |

Signer: the container runs **genuine Ed25519** (compose + Dockerfile set
`AUTH_SIGNER_ALG=EdDSA`, `cryptography` pinned+installed); absent the primitive
`EdDSASigner` raises a **loud RuntimeError** — never a fake signature. *(A3-attack-5:
NON-ISSUE, confirmed.)*

**Accepted (safe-direction) residuals:**
- `forward_auth.verify` reads `deps.killswitch()` without an inline guard; on a Redis
  error it 500s and the proxy fails closed on 5xx. This is the safe direction (defense-in-
  depth; the real bite is at the Gateway via `consult_denylist`). Not touched to keep the
  frozen `/api/verify` contract intact. *(A2/A3-MEDIUM: accepted-with-reason.)*
- A Redis outage denies **benign** reads too (verify 500) rather than the §7.5 "fail-open-
  to-cached-JWT for CLASS_READ". Conservative, not a fail-open; accepted for Critical-infra
  bias-to-closed. *(A3-LOW: accepted.)*

---

## 6. Standard Critical-infra hygiene

- **Authz on every endpoint incl. MCP:** unchanged (scoped users; MCP forced-to-caller).
- **Admin/operator lockdown:** `/admin/*` gated by the operator bearer; comparison is now
  **constant-time** (`secrets.compare_digest`) so the kill-switch bearer can't be timing-
  recovered. *(A4-MEDIUM: fixed.)* **PROD residual:** require a non-default
  `AUTH_ADMIN_TOKEN` and do **not** publish `8089/8090` to the host (reach `auth` only via
  the proxy) — the published ports here are for the isolated cross-replica gate demo.
- **Secrets never logged:** generic 500; DSN password masked by libpq (§2). `DATABASE_URL`
  password derives from `POSTGRES_PASSWORD` via nested interpolation (single source of
  truth — no silent drift). *(A4-MEDIUM: fixed.)*
- **Rate/WIP limits + audit:** the budgets middleware (GCRA/concurrency/lifetime) and the
  append-only audit ledger carry over unchanged; audit now durable in Postgres.

---

## 7. Residual risks (accepted or deferred, safe-direction only)

| # | Risk | Disposition |
|---|---|---|
| R1 | **True DB failover** (survive loss of the Postgres primary / Redis master) | **G9 — CANNOT-VERIFY-ON-A-LAPTOP.** Needs multi-node Patroni+etcd (≥3 nodes) + Redis Sentinel. Command in §8. App-tier active-active is done; DB-tier HA is the residual. |
| R2 | **`WAITAOF` fsync-before-ack + denylist rehydrate-from-ledger** | Deferred: `WAIT` (replica receipt) is wired + gated; `WAITAOF` (Redis 7.2+ fsync) and projecting surgical `jti` revokes back from a durable ledger on Redis replacement are the stricter durability upgrade — needs a Redis replica. |
| R3 | **`SessionStore` is per-process** (human browser sessions don't cross replicas; the seeded `session=valid` cookie is discarded by the migrate process) | Accepted: in production the human session is the **Keycloak-backed OIDC** cookie (shared), not this in-process dev stub. **Security-critical principals (agents) use Bearer tokens, fully migrated to shared Postgres/Redis** — SoD/kill unaffected. The cross-replica *cookie* demo claim is dropped; use Bearer for the boot proof. |
| R4 | **`evaluate()` passes `kid=None`** so kid-retirement isn't checked on that path | Pre-existing (Stage-4), delegated to JWKS prune at signature validation. Out of Stage-5 scope (frozen token model); noted for a defense-in-depth follow-up (thread the JOSE `kid` through). |
| R5 | **`KEYCLOAK_DB_PASSWORD` rotation on a warm volume** is ineffective (initdb is first-boot-only) | Documented in the compose recovery note: rotation requires `docker volume rm …_auth-pgdata` or a manual `ALTER ROLE`. |

---

## 8. CANNOT-VERIFY-HERE — every item + the EXACT operator command

The sandbox has no Docker/Postgres/Redis/Keycloak/TPM. The following are the operator
close-outs (also in `docker-compose.yml` footer). **No green was faked.**

| # | Item | Command |
|---|---|---|
| CV-A | Cold-boot the migrated stack (2 replicas + PG + Redis + KC) | `cp platform/auth/.env.example platform/auth/.env && docker compose -f platform/auth/docker-compose.yml up -d --build` |
| CV-B | 258 unit tests green on the code (real EdDSA) | `docker compose … run --rm -e AUTH_STORE=sqlite -e AUTH_HOTSTORE=memory auth-a python -m unittest discover -s /app/src/auth/tests -v` |
| CV-C | **SoD holds on real Postgres incl. the concurrent SERIALIZABLE guard** | `docker compose … run --rm -e TEST_DATABASE_URL=postgresql://auth:$POSTGRES_PASSWORD@postgres:5432/auth auth-a python -m pytest tests/integration/test_postgres_store.py -v` |
| CV-D | **Kill-switch cross-replica fan-out on real Redis** | `docker compose … run --rm -e TEST_REDIS_URL=redis://redis:6379/0 auth-a python -m pytest tests/integration/test_redis_fanout.py -v` |
| CV-E | **Live cross-replica revoke** (revoke via A, denied via B) | revoke `POST localhost:8089/revoke`; confirm `localhost:8090/introspect` → `active:false` |
| CV-F | **P2 — auth-core survives a Keycloak outage** | `docker compose … stop keycloak && curl -fsS localhost:8089/healthz && curl -i localhost:8090/api/verify -H 'X-Forwarded-Host: board.suite.local' -H 'Authorization: Bearer <agent>'`; set G2 → 403 |
| CV-G | Keycloak realm G-gates (G3 audience non-overlap — HIGHEST RISK, run FIRST) | `bash platform/auth/build/keycloak_gates.sh` |
| CV-H | **G9 — true DB/Redis failover (multi-node hardware)** | Patroni+etcd 3-node demo (`docker stop` the primary → replica promoted) + Redis Sentinel (`sentinel monitor authcache <ip> 6379 2`). Then upgrade `synchronous_commit=remote_apply`. |

---

## 9. Before Optimization (Stage 6) — please confirm

1. Run **CV-C** and **CV-D** — the two properties this stage is sold on (concurrent SoD on
   Postgres; cross-replica kill on Redis) are only *proven by construction* here.
2. Run **CV-F** — confirm the control plane halts agents with Keycloak stopped.
3. Decide the **prod durability profile**: set `AUTH_REDIS_WAIT_REPLICAS>=1` with a Redis
   replica (drop `AUTH_ALLOW_SINGLE_NODE`) before this is more than a gate boot.
4. Acknowledge the **G9** DB/Redis-failover residual (R1) as the multi-node-hardware item
   that clears at Stage 7 external verification, not on this laptop.
5. Confirm the **prod admin posture**: non-default `AUTH_ADMIN_TOKEN`, no host-published
   `8089/8090`, reach `auth` only through the proxy.
