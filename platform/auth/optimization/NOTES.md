# NOTES.md — `auth` Stage 6 (Optimization), Critical-infra

> Optimization for a Critical-infra identity plane = **hot-path latency + concurrency
> correctness under local compute**, NEVER at the cost of a safety property. The hot path
> is `/api/verify` (every suite request passes through it, bounded by the proxy's 250ms
> fail-closed timeout) and the live-revocation/kill-switch consult. Frozen and untouched:
> SoD logic, token model, PDP/PEP, scopes/ConflictSet, the `/api/verify` contract, and the
> kill-switch semantics. Built on the Stage-5 migrated substrate (Postgres + Redis + 2
> replicas + EdDSA).
>
> **Driver-signature discipline (the Stage-5 lesson):** Stage 5 shipped a *hallucinated*
> `conn.transaction(isolation_level=…)` that would `TypeError` every transaction. So every
> psycopg3/redis-py signature this stage relies on was **re-verified against current
> official docs first** (§6). All 12 verdicts came back **OK** — including confirmation the
> Stage-5 fix is now correct. No optimization here rests on an unverified API.
>
> **Tests:** `268 passing (1 EdDSA skip)` — 258 prior + 10 new batched-consult equivalence
> tests. No regression; no assertion weakened.

---

## 1. What was optimized (all applied; before → after)

| # | Change | File | Before | After | Safety impact |
|---|---|---|---|---|---|
| O1 | **Kill-switch triple-read collapse** | `verify/forward_auth.py` | allow path called `deps.killswitch()` **3×** (door gate + twice in header mint) = 3 Redis round-trips for one value | read **once**, thread `(level, epoch)` into mint | **NONE** — same value; *more* consistent (gate + minted header now reflect one instant) |
| O2 | **Batched live-revocation read** | `interfaces.py`, `redis_hot.py`, `memory_hot.py`, `tokens/revocation.py` | `consult_denylist` did up to **5 sequential** Redis reads (killswitch/jti/sub/kid/client) | one **pipelined** round-trip via `consult_snapshot`; identical deny-precedence evaluated in Python | **NONE** — precedence + fail-closed byte-for-byte preserved; locked by 10 equivalence tests |
| O3 | **Fast-fail Redis timeouts** | `redis_hot.py` | `socket_timeout=5s` → a Redis *hang* blocked a worker 5s (20× the 250ms budget), unbounded pool | `socket_timeout≈0.25s` (floored above the WAIT budget), `socket_connect_timeout=0.1s`, `max_connections=32` | **NONE** — still fails **closed**, just *fast*; stops thread/fd exhaustion turning a blip into an auth-wide stall |
| O4 | **Postgres pool tuning** | `postgres_store.py` | `min 2/max 10`, no `check`, default `max_lifetime=3600` | `min 4/max 16`, `check=ConnectionPool.check_connection`, `max_lifetime=1800` | **NONE** — `check` *improves* fail-closed correctness (a PG failover no longer 500s a kill/revoke on a dead socket) |
| O5 | **Serialization-retry backoff+jitter** | `postgres_store.py` | immediate re-loop on 40001 (lockstep re-collide) | bounded exp backoff + full jitter; retries 4→6 | **NONE** — still fail-closed (re-raises after last attempt); sleep holds no pool connection |

Everything above is a config/mechanical change behind the existing Protocol seams — no SoD,
token, PDP, or contract change.

---

## 2. `/api/verify` hot-path model + p50/p95 (the headline)

The door path (`verify` → `_bearer_validate` → `consult_denylist` → mint) round-trips, on
the migrated substrate, per **Bearer allow**:

| | Postgres | Redis | notes |
|---|---|---|---|
| **Before Stage 6** | 2 (`get_principal`, `roles_of`) | **~8** (4× `killswitch` HGETALL + 4 denylist reads) | + local JWT verify + 1 Ed25519 sign |
| **After (O1+O2)** | 2 | **2** (1 door `killswitch` + 1 pipelined `consult_snapshot`) | same PG; Redis round-trips cut ~4× |

**Per-op assumptions (localhost/loopback, stated so the estimate is falsifiable):** Redis
single-command RTT ~0.2ms p50 / ~0.6ms p95 (a pipelined multi-read = **one** such RTT);
Postgres pooled PK lookup ~0.3–0.8ms p50 / ~2ms p95; Ed25519 sign ~30–60µs; local JWT
verify ~tens of µs.

**Estimated latency (healthy):**
- **Door Bearer allow path (after):** p50 **≈ 1–2ms**, p95 **≈ 4–6ms** (2 PG + 2 Redis +
  sign) — vs the proxy's **250ms** budget, a ~40–60× margin.
- **RS-side benign FAST_PATH:** p50 **≈ tens of µs**, p95 **< 1ms** — local JWT validation
  only, **zero** network round-trips (see §3).

**The real risk was never the healthy p95 — it was the tail.** With the old
`socket_timeout=5s`, a single Redis hang turned one read into a 5000ms fail-closed stall
that pinned a worker thread + connection, so a Redis blip could exhaust the pool and stall
*all* auth traffic. O3 bounds the worst case to ~1 RTT healthy / ~250ms on a hang, within
the proxy budget, and frees the worker fast. **Measurement:** `redis-cli --latency` +
`redis-benchmark -P 5` (pipelined) to confirm the batched-read saving; pause Redis
(`redis-cli DEBUG SLEEP 10` or an iptables DROP) and confirm the door returns a fail-closed
deny in ~`socket_timeout`, not 5s (operator commands in §5).

---

## 3. Confirmation: the benign FAST_PATH never consults Redis

Two distinct things — do not conflate them:

- **The revocation DECISION TABLE** (`tokens/revocation.py::classify`/`evaluate`): a Tier-1
  benign scope classifies to `FAST_PATH`, and `evaluate()` returns `allow` **without any
  `hot.*` call** (`revocation.py:183-184`) — **no Redis**, ≤ TTL staleness accepted (PLAN
  §4.2/§4.7). **Confirmed in code.** This is the path RSes use to authorize a specific
  benign scope.
- **The forward-auth DOOR** (`server.py::_bearer_validate`) deliberately hardcodes
  `enforcement=LIVE_CHECK`, so it **always** does the live revocation consult + 2 Postgres
  reads per request. This is **defense-in-depth by design** (§8.1/§8.3): a revoked agent is
  stopped at the door immediately, not only at a downstream SoD-critical RS. It is *not* the
  fast path and is not meant to be. O2 makes that deliberate live consult **one** Redis
  round-trip instead of five; the door does not — and must not — become a Redis-free cache
  (that would open a revocation gap at the door).

So: **the fast path is Redis-free (confirmed); the door is intentionally always-live, now
minimized.** The principal/roles reads at the door are also deliberately **uncached** —
freshness is required so a just-disabled principal is refused at the door (caching status
would create a revocation gap). Not changed.

---

## 4. Pool / Redis sizing decisions

**Postgres (per replica): `min_size=4, max_size=16`, `check=check_connection`,
`max_lifetime=1800`.**
- Fleet budget against one shared primary: `2 replicas × 16 (auth) = 32` + Keycloak's
  Quarkus pool + the one-shot migrate + `superuser_reserved_connections(3)`. **Operator
  action (compose-level, documented not auto-applied):** set Postgres `max_connections=200`
  and cap Keycloak `KC_DB_POOL_MAX_SIZE=40` → budget ≈ `32 + 40 + ~4 + 3 = ~79`, headroom to
  200. Do **not** oversubscribe the default `max_connections=100`.
- `check=ConnectionPool.check_connection` (a ready-made library value, verified) validates a
  connection before checkout so a PG restart/failover transparently replaces a dead socket
  instead of 500-ing the kill/revoke that lands on it — an **HA-correctness** win, not just
  perf.
- `min_size=4` warm floor absorbs the first poll burst without synchronous connect latency
  on the hot verify path; `open(wait=True, timeout=10)` still crashes construction loudly if
  PG is unreachable (Stage-5 fail-closed boot, unchanged).

**Redis (per replica): one shared thread-safe client**, `socket_timeout≈0.25s`,
`socket_connect_timeout=0.1s`, `max_connections=32`, `health_check_interval=30`.
- One shared `redis.Redis` client with its internal pool is the officially-sanctioned
  thread-safe pattern for `ThreadingHTTPServer` (verified). Each `consult_snapshot` builds
  its **own** pipeline (a Pipeline is not thread-safe to share; the client is).
- `socket_timeout` is floored above the write-path `WAIT` budget
  (`max(0.25, wait_timeout_ms/1000 + 0.05)`) so a legitimate replica-sync `WAIT` is never
  cut short, while a *read* hang still fails closed within the proxy budget. **Coupling
  documented:** raising `AUTH_REDIS_WAIT_REPLICAS`/the WAIT budget raises the effective
  socket timeout — expected.
- Heartbeat (~500ms) = ~4–8 ops/sec for the pair, forever — negligible on a single-threaded
  Redis that sustains >100k ops/s, contends with nothing (different keys, no locks). Both
  replicas HSET the same heartbeat key = harmless last-writer-wins. Left as-is;
  `heartbeat_interval_s` is a constructor param if an operator wants to tune it.
- The deny/kill Lua (`SET+INCR+HSET+PUBLISH+LPUSH+LTRIM`) is **one** bounded server-side
  round-trip; the capped `LTRIM(0,999)` audit ring is a hot projection (Postgres remains the
  audit of record), amortized O(1) per revoke. **No change** — confirmed correct.

**Concurrency correctness under load:**
- SoD `_run_widening` stays **SERIALIZABLE** (the multi-writer defense) with the now-jittered
  bounded retry. Widening grants are **rare admin ops**, not the hot path; the hot path is
  reads. A lone read SELECT that commits immediately at SERIALIZABLE does not raise 40001
  (see the residual in §7 for the read-isolation follow-up).
- The Redis `ConcurrencySemaphore` (per-sub budget) is unchanged; it gates MCP tool-call
  budgets, not the door.

---

## 5. CANNOT-VERIFY-HERE — measurement method + exact operator command

No Docker/Postgres/Redis in the sandbox, so latency/throughput/contention numbers are
**modeled, not measured**. Operator close-outs:

| # | Measure | Command |
|---|---|---|
| M1 | **Door p50/p95 under concurrency** | boot stack (`docker compose -f platform/auth/docker-compose.yml up -d --build`), then `vegeta attack -targets=verify.tgt -rate=500 -duration=30s \| vegeta report` (target = `GET http://localhost:8089/api/verify` with `Authorization: Bearer <agent>` + `X-Forwarded-Host: board.suite.local`); confirm p95 ≪ 250ms |
| M2 | **Batched-read saving** | `redis-cli --latency -h <redis>` (raw RTT) + `redis-benchmark -h <redis> -n 200000 -c 50 -q -t get` vs `-P 5` (pipelined ≈ 5× throughput = the O2 win) |
| M3 | **Redis-hang fails closed FAST** | with load running, `redis-cli -h <redis> DEBUG SLEEP 10` (or iptables DROP); confirm `/api/verify` returns a fail-closed deny in ~`socket_timeout` (not 5s) and worker threads recover |
| M4 | **Pool not the bottleneck** | during M1, `psql "$DATABASE_URL" -c "SELECT usename, application_name, count(*), state FROM pg_stat_activity GROUP BY 1,2,4 ORDER BY 3 DESC;"` — confirm auth+KC total < `max_connections`; watch `pool.get_stats()` `requests_waiting` (0 = pool not bottleneck) |
| M5 | **SERIALIZABLE retry under contention (fail-closed)** | fire N parallel jointly-conflicting `/admin/roles/assign`; confirm exactly one commits, the rest deny (400/500), and `SELECT xact_rollback FROM pg_stat_database WHERE datname=current_database();` shows bounded aborts (jitter caps re-collisions) |
| M6 | **PG failover doesn't hand out dead connections** | `docker compose restart postgres` mid-load; with `check` the 500 burst is ~0 and a `/admin/killswitch` POST returns `committed:true` on the first try |

---

## 6. Driver signatures verified against current docs (all OK)

| API | Verdict | Source |
|---|---|---|
| `ConnectionPool(conninfo, *, min_size, max_size, kwargs, configure, check, max_lifetime, open)` | **OK** | psycopg.org/psycopg3/docs/api/pool.html |
| `pool.open(wait=True, timeout=10.0)` — blocks, raises `PoolTimeout` if PG unreachable | **OK** | api/pool.html |
| `conn.isolation_level = IsolationLevel.SERIALIZABLE` (settable outside a tx; pool `reset` does **not** clear it, so `configure` makes every checkout SERIALIZABLE) | **OK** | api/connections.html |
| `conn.transaction()` — signature `(savepoint_name=None, force_rollback=False)`, **no** isolation kwarg (the Stage-5 bug, now fixed) | **OK** | api/connections.html |
| `from psycopg.rows import dict_row`; `psycopg.errors.SerializationFailure` (40001) | **OK** | api/errors.html |
| `ConnectionPool.check_connection` ready-made `check` value | **OK** | advanced/pool.html |
| `redis.Redis.from_url(decode_responses, health_check_interval, socket_keepalive, socket_timeout, socket_connect_timeout, max_connections)`; client thread-safe (shared singleton) | **OK** | redis.readthedocs.io/connections.html |
| `register_script(lua)` → `Script`; `script(keys=[...], args=[...])` (EVALSHA + EVAL fallback) | **OK** | redis-py commands |
| `r.pipeline(transaction=False)` → batch reads, results in order, one round-trip | **OK** | redis-py pipelines |
| `r.wait(numreplicas, timeout_ms)` → count acked; `WAITAOF` exposed for the fsync residual | **OK** | redis-py |
| `ed25519.Ed25519PrivateKey.sign` — current API, ~tens of µs/op | **OK** | cryptography docs |

---

## 7. Residual / measure-first (documented, NOT applied — need a real cluster)

Safe-direction only; none weakens a fail-closed property today.

1. **Read/write pool split (reads at READ COMMITTED).** Pool-wide SERIALIZABLE also puts the
   hot **read** path (`get_principal`/`roles_of`) at SERIALIZABLE. A lone committing SELECT
   shouldn't 40001, but under heavy contention it *could*, and the read helpers have no
   retry → a spurious (fail-closed) 500. **Recommendation:** a second **read pool**
   (`autocommit=True` / READ COMMITTED) for `_one`/`_all`, keeping only `_run_widening`/`_exec`
   on the SERIALIZABLE write pool. Not applied: it restructures the store and the benefit is
   unproven on this workload without a real PG load test (**M5** detects the need). SoD is
   unaffected — the guarantee lives only in `_run_widening`.
2. **HTTP admission cap.** `ThreadingHTTPServer` spawns unbounded threads; there is no global
   WIP semaphore, so `max_size` is the only real bound and excess requests queue on the pool.
   **Recommendation:** a `BoundedSemaphore` (or bounded thread pool) that sheds excess as
   `503 Retry-After` **and EXEMPTS the operator halt paths** (`/admin/killswitch`,
   `/admin/revoke`, `/admin/breakglass`) so the operator can always halt under a poll storm.
   Set the cap == pool `max_size`. Not applied: it's a server-structure change best sized
   against measured concurrency (**M1/M4**).
3. **`WAITAOF` fsync-before-ack + denylist rehydrate-from-ledger** (carried from Stage-5 R2):
   the stricter durability upgrade; needs a Redis replica.
4. **NO PgBouncer/pgcat in transaction-pooling mode** — **hard deployment constraint, not a
   tuning knob.** A transaction-mode pooler does not preserve session-level `isolation_level`,
   which would silently demote widening writes to READ COMMITTED and **reopen the multi-writer
   SoD escape** Stage 5 closed. Use session pooling only, or move to per-transaction
   `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` *before* any pooler. Prefer raising PG
   `max_connections` over adding a pooler.
5. **Compose `max_connections=200` + `KC_DB_POOL_MAX_SIZE=40`** — the fleet-budget settings
   from §4, applied by the operator at deploy (left out of the committed compose to avoid
   perturbing the Postgres init on this laptop; the code-level pool caps are in place).

---

## 8. For Stage 7 (Verification)

- Run **M1–M6** on the real stack; attach the measured p50/p95 (this stage's numbers are
  modeled). The door p95 must sit well under the proxy's 250ms fail-closed budget.
- **M3 is the one to not skip:** prove the fast-fail Redis timeout makes a hang deny *within*
  budget — this is the tail-latency safety property, verified only against a live Redis.
- Decide residuals #1 (read pool) and #2 (admission cap) **based on M5/M1 data**, not
  speculatively.
- Everything here preserved the frozen safety set (SoD/kill/fail-closed/token/PDP/contract);
  the Stage-7 kill-switch + SoD demos from `security/THREAT_MODEL.md` §8 remain the
  acceptance gates and are unaffected by these optimizations.
