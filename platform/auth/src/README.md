# auth/src — package map (Stage-4 BUILD, Phase 1 FOUNDATION)

`auth` is the Critical-infra identity gateway for the suite. This tree is the
**core service** built API-first (PLAN §11): core logic first, then the MCP
surface, then the operator UI. Phase 1 establishes the FROZEN contracts every
parallel builder imports.

## Package map

```
auth/
  core/                      # frozen, dependency-free contracts (pure stdlib)
    scopes.py                # the ONE scope taxonomy (app:capability) for ALL suite apps
                             #   + the 4 HOLDER scopes + the IMMUTABLE SoD ConflictSet
                             #   (compiled-in constants, NO runtime relax path — decision #5)
                             #   + is_holder(), conflict_pairs(), find_holder_conflict(),
                             #     and the affected-set fan-out CONTRACT (§3.5 step 0)
    principals.py            # Principal (immutable kind/sub/agent_class), Role,
                             #   RoleHierarchyEdge, PrincipalRoleAssignment, AgentKey
                             #   (non_exportable attestation), BudgetPolicy — dataclasses only
    tokens_model.py          # RFC 9068 at+jwt AccessTokenClaims (aud is EXACTLY ONE)
                             #   + IdentityHeaderClaims (the signed X-Auth-Identity, §8.7)
    interfaces.py            # typing.Protocol seams: Store, HotStore, Signer, Verifier
    errors.py                # typed errors: SoDViolation, FailClosed, InsufficientScope,
                             #   AttestationRequired, KindGateViolation, ImmutableField*, ...
  store/
    sqlite_store.py          # DURABLE canonical Store over stdlib sqlite3 (SOLE WRITER).
                             #   Grant-time SSD conflict check over the FULL downward-
                             #   transitive affected set; rejects atomically at write time.
    memory_hot.py            # in-process HotStore: denylist + budget counters + kill switch
                             #   {level,epoch} + pub/sub stand-in (real, testable)
  crypto/
    signer_hmac.py           # stdlib HS256 TEST-signer (exercises ALL token logic here)
    signer_eddsa.py          # PRODUCTION EdDSA signer; LOUD RuntimeError if 'cryptography'
                             #   is absent (never a fake/silent sign) — CANNOT-VERIFY-HERE
  tests/
    test_foundation.py       # runnable smoke tests (python -m unittest) — GREEN here
```

## Run the foundation tests

```
cd platform/auth/src && python -m unittest auth.tests.test_foundation -v
```
Result in this sandbox: **32 tests, OK (skipped=1)** for `test_foundation` alone —
the 1 skip is the EdDSA round-trip (asymmetric crypto, CANNOT-VERIFY-HERE; see
below). For the **WHOLE build** (all modules), run
`python -m unittest discover -s auth/tests` → **246 tests, OK (skipped=1)**; the
consolidated handoff (every CANNOT-VERIFY-HERE item + joint checkpoint) is in
`platform/auth/BUILD.md`.

## SQLite-now vs Postgres-later (settled decision #8)

The durable Store is **SQLite today**, acceptable **only** for this isolated early
Build. It lives entirely behind `auth.core.interfaces.Store` (a `typing.Protocol`),
and the load-bearing SSD algorithm in `sqlite_store.py` is pure Python over a plain
relational shape. Moving to **Postgres + active-active** before the Critical-infra
security stage can clear is therefore a **config swap** (drop in a `PostgresStore`
implementing the same Protocol), **not a rewrite**. No caller imports `sqlite3` or
touches the store directly — the MCP surface and the UI both go through the Core API,
which is the sole writer (§9.0).

Likewise the hot state (`memory_hot.py`) is an **in-process** stand-in for the
production **replicated Redis** hot store (denylist pub/sub, budget counters,
kill-switch epoch). Its docstring documents the exact Redis MULTI/PUBLISH/EXEC and
`auth:revocations` fan-out shape. **CANNOT-VERIFY-HERE** (no `redis-server` in the
sandbox); close with:
```
docker run -p 6379:6379 redis:7 --appendonly yes
cd platform/auth && python -m pytest tests/integration/test_redis_fanout.py
```

## HMAC-test-signer vs EdDSA-prod-signer (honesty)

- `signer_hmac.HMACSigner` (HS256, stdlib) is a **TEST-signer**. Symmetric — it
  **cannot** be published in a JWKS for offline RS validation. It exists so the
  test suite can exercise **all token logic** (claims/aud/exp/jti/kid/revocation/
  cnf/tamper-detection) with zero external deps, GREEN in this sandbox. It is
  **never** the production signer.
- `signer_eddsa.EdDSASigner` (EdDSA/Ed25519) is the **PRODUCTION** signer: auth
  holds the private half, RSes get the public half via JWKS. It requires the
  third-party `cryptography` package. If absent it raises a **LOUD RuntimeError**
  at construction — it **never** falls back to a fake/silent signature.
  **CANNOT-VERIFY-HERE** (cryptography not guaranteed installed); close with:
```
python -m pip install "cryptography>=42"
cd platform/auth/src && python -m unittest auth.tests.test_foundation -v
```
  (the EdDSA test auto-skips when unavailable and runs for real once installed).

## Contracts other builders import (FROZEN)

Import ONLY from `auth.core.*`, `auth.store.*`, `auth.crypto.*`. Do not redeclare
the scope taxonomy or the conflict pairs anywhere else — `auth.core.scopes` is the
single source of truth, and its `CONFLICT_SET` is immutable by construction.
