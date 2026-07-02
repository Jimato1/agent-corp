# Stage 4 — Build: `auth` (identity gateway, **Critical-infra**)

Implements `planning/PLAN.md` and `ui/UI_SPEC.md`, and **owns** the `/api/verify`
contract that `platform/proxy` consumes (PLAN §8 / proxy `stub/auth_verify_stub.py`).
Built **API-first** (PLAN §11): the core service/API is the **SOLE WRITER** over one
shared state; the **MCP surface** and the **operator UI** are siblings over that one
API — neither downstream of the other. Modeled on the proxy's honest `BUILD.md`:
what is genuinely green here is run green here; everything that needs an external
system is marked **CANNOT-VERIFY-HERE** with the exact operator command to close it.
**No green was faked.**

Sandbox reality (proven by the proxy build): **Python 3.12 only** — no Node/tsc, no
Go, no Docker, no `redis-server`, no Keycloak, no guaranteed network `pip`, no
TPM/HSM, no asymmetric-crypto lib guaranteed, not a git repo. Security-critical core
logic is therefore **pure-stdlib** and actually unit-tested here.

## Real sandbox test result (run, not claimed)

```
cd platform/auth/src && python -m unittest discover -s auth/tests -v
...
Ran 247 tests in 0.20s
OK (skipped=1)
```

Per module (all green): `test_foundation` 33 (incl. the 1 EdDSA skip), `test_tokens`
43, `test_budgets` 26, `test_killswitch` 27, `test_mcp` 36, `test_server` 29,
`test_authz` 30, `test_verify` 23. The **single skip** is the EdDSA round-trip
(asymmetric crypto) — it runs for real if `cryptography` is installed, else asserts a
**LOUD RuntimeError** and skips (never a silent/fake sign).

**Orchestrator post-build hardening (independent verification, folded in):** an
adversarial probe of runtime immutability found `HOLDER_ALLOWED_KINDS` (the per-holder
kind-gating table from review fix A4-02) was a **mutable module `dict`** while BUILD
notes called it "compiled-in" — in-process code could have widened which principal
kinds may hold a holder scope, contradicting decision #5 ("no runtime relax path").
The actual `CONFLICT_SET` (approve⊕execute) and `HOLDER_SCOPES` were already properly
frozen; `HOLDER_ALLOWED_KINDS` is now wrapped in `types.MappingProxyType` to match, and
`test_foundation.test_holder_allowed_kinds_is_immutable_at_runtime` locks it (the +1
test). Not an RCE-class hole (mutation needs code-exec in-process), but the kind-gating
table must be as read-only as the invariant it defends.

---

## (a) PHASE-0 IdP VERDICT

**Keycloak — provisional-CONFIRMED by docs** (current ≥26.4). No un-mitigable NO-GO
on any load-bearing gate (G1 non-exportable/origin-bound, G3 audience isolation, G4
revoke/introspect, G9 HA). **Zitadel NOT promoted** (no documented un-mitigable NO-GO
on G1/G3/G4/G9 that would force a switch). **Status: PENDING operator boot** of gates
{G1, G2, G3, G4, G5, G6, G8, G9} on a real realm. Full gate-by-gate table + evidence
URLs + per-gate operator close-out commands: `build/PHASE0_IDP_BAKEOFF.md`.

| Gate | Verdict | Basis |
|---|---|---|
| G1 per-client JWKS `private_key_jwt`, rotation, no shared secret | **GO-by-docs** | Keycloak per-client key + rotation documented. Live TPM-nonexportable + off-host-mint refusal = CANNOT-VERIFY-HERE. |
| G2 per-client access-token TTL override | **GO-by-docs** | client-level TTL override documented; live = CVH. |
| G3 per-resource audience isolation (RFC 8707) | **GO-by-docs (mitigated)** | no native RFC 8707; audience-mapper + client-scope + client-policy workaround is documented-present. Mapper **non-overlap correctness is the #1 operator boot gate** (CVH). |
| G4 RFC 7009 revoke + RFC 7662 introspect | **GO-by-docs** | both endpoints documented. Sub-second latency, read-your-writes-under-lag, introspect-fail-closed-on-Redis-loss = CVH. |
| G5 DPoP (GA 26.4) + mTLS HoK cert-bound | **GO-by-docs** | DPoP GA + mTLS HoK documented. End-to-end replay + proof-key co-location = CVH. |
| G6 custom-claim protocol mappers | **GO-by-docs** | documented; live = CVH. |
| G7 §3.5 ConflictSet enforcement + Cedar/Python parity | **GO — built & unit-tested green HERE** | not Keycloak-dependent. |
| G8 `forward_auth`/`forwardAuth` grants on ANY 2xx | **GO-by-docs** | Caddy/Traefik docs confirm 2xx-grant → validates our **exactly-200=allow** contract. Live proxy wiring/header-scrub = CVH. |
| G9 Postgres + non-k8s Infinispan HA | **GO-by-docs** | documented. Real homelab envelope + failover = CVH. |
| G10 JWKS offline + uncached introspect / benign-offline vs destructive-live | **GO — logic built & tested HERE** | separation logic unit-tested; live introspect = CVH. |

---

## (b) WHAT WAS BUILT — file / role table (core API → MCP → UI)

### Core service / API (the SOLE WRITER over one shared state)
| File | Role |
|---|---|
| `src/auth/core/scopes.py` | the ONE `app:capability` taxonomy; the 4 HOLDER scopes; the **IMMUTABLE compiled-in SoD ConflictSet** (5 pairs, no runtime relax path — decision #5); **`HOLDER_ALLOWED_KINDS` per-holder kind restriction** + `find_holder_kind_violation` (finding-2 fix); `find_holder_conflict`; the affected-set fan-out contract (§3.5). |
| `src/auth/core/principals.py` | `Principal` (immutable kind/sub/agent_class), `Role` (kind_gate/agent_class_gate), hierarchy/assignment value objects, `AgentKey` (non_exportable attestation, public-half only), `BudgetPolicy` (compute/time/concurrency — **not dollars**). |
| `src/auth/core/tokens_model.py` | RFC 9068 `at+jwt` `AccessTokenClaims` (aud is **exactly one**, RFC 8707); `IdentityHeaderClaims` (signed `X-Auth-Identity`, §8.7); cnf `x5t#S256`/`jkt` binding modeled. |
| `src/auth/core/interfaces.py` | `typing.Protocol` seams: `Store`, `HotStore`, `Signer`, `Verifier` (the Postgres/Redis/EdDSA swap points). |
| `src/auth/core/errors.py` | typed errors: `SoDViolation`, `AttestationRequired`, `KindGateViolation`, `FailClosed`, `InsufficientScope`, `ImmutableField*`, `ConflictSetImmutableError`. |
| `src/auth/store/sqlite_store.py` | DURABLE canonical Store over stdlib `sqlite3` (**SOLE WRITER**). **`_enforce_grant_invariants`** runs SSD + per-holder-kind + role kind-gate + non-exportable attestation over the **FULL downward-transitive affected set** on **EVERY** widening mutation (grant_scope_to_role / add_role_hierarchy_edge / assign_role / put_role) — atomic reject (findings 1a + 2 fix). |
| `src/auth/store/memory_hot.py` | in-process `HotStore`: denylist + budget counters + kill-switch {level,epoch} + pub/sub stand-in (real, testable; Redis fan-out shape documented). |
| `src/auth/crypto/signer_hmac.py` | stdlib HS256 **TEST-signer** — exercises ALL token logic here. |
| `src/auth/crypto/signer_eddsa.py` | **PRODUCTION** EdDSA/Ed25519 signer; LOUD RuntimeError if `cryptography` absent (never a fake sign). |
| `src/auth/tokens/jwt.py` `jwks.py` `revocation.py` `dpop.py` | mint/validate (sig, alg=none & alg-confusion guard, retired-kid, iss RFC 9207, aud RFC 8707 exactly-one, exp); JWKS; hybrid local-validate vs LIVE-revocation classification (decision #2); DPoP proof-check logic (thumbprint/htm/htu/iat/replay/nonce/ath) — primitive-agnostic. |
| `src/auth/authz/pdp.py` | central PDP: immutable SoD `forbid` (overrides permit); no-self-approval backstop; **kind backstops on `_decide_redeem`, `_decide_kill_switch`, and now `_decide_write_policy`** (finding-2 backstop); **fail-CLOSED** on any PIP doubt (decision #3). |
| `src/auth/authz/pep.py` `scope_tool_map.py` | Tier-1 coarse-scope PEP; canonical action → rule/class map. |
| `src/auth/authz/policies/sod.cedar` | the declarative production `forbid` guardrail — 5 pairs, **parity-tested equal** to the compiled-in Python pairs. |
| `src/auth/killswitch/killswitch.py` `breakglass.py` | graduated G0/G1/G2 kill switch; break-glass that **structurally holds no action-side scope** (asserted disjoint at import). |
| `src/auth/budgets/*` | GCRA rate, concurrency/WIP, lifetime/liveness, cooldown, admission middleware (§6). |
| `src/auth/verify/forward_auth.py` | **the pure `/api/verify` decision** (PLAN §8) — status-code-is-the-contract; mints the signed `X-Auth-Identity`; reads identity ONLY from Authorization + Cookie. |

### MCP surface (thin; §9.2 read/self-only)
| File | Role |
|---|---|
| `src/auth/mcp/surface.py` | agent-facing tools; **principal forced to the authenticated caller** (cannot act as another sub / cannot widen own scope); read/self-only; delegates all writes to the Core API. |

### Operator UI (human surface, UI_SPEC)
| File | Role |
|---|---|
| `src/auth/server.py` | the one HTTP app hosting the Core API + `/api/verify` + admin endpoints the operator console (UI_SPEC) drives: principals/roles/budgets/keys, kill-switch, break-glass — **same shared state** as the MCP surface. Keycloak `/authorize`+`/token` return **501 + operator_command** (never a fake success). |

---

## (c) API-first note

The **core service is the SOLE WRITER** over one shared state (the durable Store +
hot state). The **MCP surface** and the **operator UI** are **siblings over that one
API** — two views, one state (ARCHITECTURE invariant). No MCP tool and no UI handler
writes identity state directly; both go through the Core API. This is what lets the
"who did this" audit resolve to one authoritative identity source.

---

## (d) SQLite-NOW vs Postgres-LATER · HMAC-test-signer vs EdDSA-prod (stated plainly)

- **SQLite-NOW (decision #8):** the durable Store is stdlib `sqlite3` **today**,
  acceptable only for this isolated Build, entirely behind `core.interfaces.Store`
  (a `Protocol`). The load-bearing SSD/attestation/kind algorithm is pure Python over
  a plain relational shape. **Postgres + active-active is a config swap** (drop in a
  `PostgresStore` implementing the same Protocol), **not a rewrite**.
  **SQLite-now items to migrate before Security clears:** (1) the durable Store
  (`sqlite_store.py`); (2) the in-process `HotStore` (`memory_hot.py`) → replicated
  **Redis** (denylist pub/sub, budget counters, kill-switch epoch); (3) single-node
  → **active-active HA** (G9).
- **HMAC-test-signer vs EdDSA-prod:** `HMACSigner` (HS256, stdlib) is a **TEST-signer**
  — symmetric, cannot be published in a JWKS; it exists so the suite exercises **all**
  token logic (claims/aud/exp/jti/kid/revocation/cnf/tamper) green here. **Never** the
  production signer. `EdDSASigner` (Ed25519) is **production** (auth holds the private
  half, RSes get the public half via JWKS); absent `cryptography` it raises loudly.
  The DPoP tests likewise use the HMAC primitive as a stand-in for the **proof-check
  logic only** — the asymmetric proof primitive is CANNOT-VERIFY-HERE.

---

## (e) CANNOT-VERIFY-HERE — every item + the EXACT operator/CI close-out command

| # | Item | Why it can't verify here | EXACT command to close it |
|---|---|---|---|
| CV-1 | **Asymmetric EdDSA/ES256 signing** (real X-Auth-Identity + access-token signatures, JWKS-publishable) | no `cryptography`/libsodium guaranteed | `python -m pip install "cryptography>=42" && cd platform/auth/src && python -m unittest discover -s auth/tests -v` (EdDSA test un-skips and runs for real) |
| CV-2 | **DPoP asymmetric proof primitive** (real EdDSA/ES256 proof signature; logic is tested, primitive is not) | same as CV-1 | same as CV-1 (then run `python -m unittest auth.tests.test_tokens -v` — DPoP suite) |
| CV-3 | **Keycloak realm G1–G10 + `/authorize`+`/token`** (per-client JWKS, TTL override, audience-mapper non-overlap, revoke/introspect, DPoP/mTLS HoK, custom mappers, HA) | no Docker/Keycloak boot | `docker compose -f platform/auth/docker-compose.yml up -d keycloak postgres && bash platform/auth/build/keycloak_gates.sh` (per-gate curls in `build/PHASE0_IDP_BAKEOFF.md`; G3 mapper non-overlap = #1 gate) |
| CV-4 | **Redis pub/sub cross-replica fan-out** (denylist propagation, sub-second revocation, read-your-writes-under-lag, introspect-fail-closed-on-Redis-loss) | no `redis-server` | **(D-AUTH-1 recipe — host `python -m pytest` cannot run: pytest is dev-only and lives only in the `test` image):** `docker compose -f platform/auth/docker-compose.yml --profile test run --rm auth-test pytest tests/integration/test_redis_fanout.py -v` |
| CV-5 | **Docker compose boot** (whole app up on the edge network, healthz, DB migrate) | no Docker | `docker compose -f platform/auth/docker-compose.yml up -d --build && curl -fsS http://localhost:PORT/healthz` |
| CV-6 | **Live `/api/verify` vs proxy `regression_headers.sh`** (real 200/302/401/403 + real signed X-Auth-Identity through the proxy) | no proxy + no Docker | boot auth (CV-5) + proxy, then `bash platform/proxy/test/regression_headers.sh internal` **after** adapting the harness (see joint JC-1 below) |
| CV-7 | **TPM/HSM non-exportable key attestation** (real hardware-bound key + off-host-mint refusal) | no TPM/HSM in sandbox | on a TPM host: enroll a TPM-sealed key, then `python -m pytest platform/auth/tests/integration/test_attestation_hw.py` (asserts a `file`/`os-keystore` key is refused a holder role — the logic is already unit-tested here via `AgentKey.non_exportable`) |
| CV-8 | **Cedar engine embedding** (running `sod.cedar` in a real Cedar authorizer) | no Cedar engine in sandbox | `cedar authorize --policies platform/auth/src/auth/authz/policies/sod.cedar --entities <entities.json> --request <req.json>` (the **pair parity** vs the Python constants IS tested green here; only the engine embedding is CVH) |
| CV-9 | **proxy→auth mTLS** (RFC 8705 cnf `x5t#S256` binding is modeled in `tokens_model.py`; the transport hop is plain-HTTP now — locked cross-component) | no cert mesh / no proxy | issue intra-mesh client+server certs, flip the proxy upstream to `https` + client-cert, then verify auth **rejects a non-mTLS proxy hop**: `curl --cacert corp-root.crt https://auth.<SUITE_DOMAIN>/api/verify` without the client cert must fail the TLS handshake |
| CV-10 | **Board/CMDB PIP fan-out** (PDP pulls **live** proposer/ticket-state/window facts instead of trusting request-context facts) | no Board/CMDB running | `docker compose up -d auth board cmdb && python -m pytest platform/auth/tests/integration/test_pdp_pip_fanout.py` (proves a real approve/execute decision reads live proposer + ticket state + maintenance window) |

---

## (f) STAGE-7 JOINT-CHECKPOINT list (cross-referenced with proxy `BUILD.md` §"joint")

These need the **real** counterpart component; each maps to the proxy's joint list.

| JC | Joint item | auth side (built) | proxy side (`BUILD.md`) |
|---|---|---|---|
| JC-1 | **Real `/api/verify` vs `regression_headers.sh`** | verify() returns 200/302/401/403 per §8.5 and signs a real `X-Auth-Identity` — 246 unit tests + in-process boot | proxy joint #1. **Harness adaptation required** (currently stub-specific): (a) replace the literal `Authorization: Bearer valid-agent` (line 41) with a **real minted agent token** from auth's `AUTH_DEMO=1 /debug/demo-tokens`; (b) change the line-63 grep from `X-Auth-Identity: *STUB\.` to assert a **structurally-valid JWT** (three base64url segments), since real auth emits `eyJ…` not `STUB.`. Capture in the joint runbook so the gate does not fail spuriously. |
| JC-2 | **traceparent authoritative-minting bound to `sub`** | server-minted W3C traceparent co-signed into `X-Auth-Identity` alongside `sub`; client value kept audit-only as `claimed_parent` (tested: `test_verify.TrustBoundary`) | proxy joint #2 / gate #9 (proxy strips the client traceparent). |
| JC-3 | **DPoP vs mTLS-bound tokens + proxy→auth mTLS** | DPoP proof-check logic real (primitive = CV-2); cnf `jkt`/`x5t#S256` binding modeled; proxy→auth mTLS = **CV-9** | proxy joint #3 / gate #10. |
| JC-4 | **Kill-switch 403 posture + break-glass verify mode** | G2 quiesce → **403 for agents at the door (symmetric across Cookie AND Bearer)**; operator still authenticates (break-glass never blanket-allows); break-glass holds no action-side scope (tested: `test_verify.KillSwitchPosture`, `test_killswitch`) | proxy joint #4 (§8.8) exercised against real auth. |
| JC-5 | **Passkey enrollment on `auth.<SUITE_DOMAIN>:443`** | canonical origin locked in BOTH modes; TLS + trust **before** enrollment | proxy joint #5 (origin decision in proxy `BUILD.md`). |
| JC-6 | **Board/CMDB PIP live fan-out** | PDP consumes proposer/ticket/window/budget via the PIP seam; live fan-out = **CV-10** | new joint (auth-owned); MC/Board/CMDB integration. |

---

## (g) Before Security (Stage 5) — please confirm

1. **Run the CANNOT-VERIFY close-outs** that gate Critical-infra: CV-1/CV-2 (install
   `cryptography`, EdDSA + DPoP run green for real), CV-3 (Keycloak realm — especially
   **G3 audience-mapper non-overlap**, the #1 gate), CV-4 (Redis fan-out sub-second +
   introspect-fail-closed-on-Redis-loss), CV-6 (live `/api/verify` vs adapted
   `regression_headers.sh`).
2. **Migrate the SQLite-now list** (d): Postgres + Redis + active-active HA (G9) — the
   Protocol seams are in place; this is a config swap, not a rewrite.
3. **Provision the cert mesh** for CV-9 (proxy→auth mTLS) and confirm auth rejects a
   non-mTLS proxy hop.
4. **Stand up the PIP fan-out** (CV-10) so the PDP reads live Board/CMDB facts rather
   than request-context facts for real approve/execute decisions.
5. **Cedar engine embedding** (CV-8) in the production authorizer (pair parity already
   green here).
6. Critical-infra Security (Stage 5) **cannot exit on a light checklist** (§8) — the
   above are the teeth.

---

## Build-review (Phase-4, 3 lenses) — findings folded

An independent review ran contract-fidelity, SoD-correctness, and honesty lenses
against the built files. **Contract-fidelity: PASS** (real `/api/verify` is an exact
implementation of the proxy §8 table — only-EXACTLY-200 is allow, 403/302/401 by
class, identity read ONLY from Authorization+Cookie, forged inbound identity ignored).
**Honesty: PASS** (no faked green; EdDSA/Keycloak/Redis/DPoP-primitive/Cedar-engine
all honestly marked CANNOT-VERIFY). The SoD-correctness lens found **2 real
CONTRACT/SoD/HONESTY breaks** (grant-time fail-opens), now **fixed**:

| # | Sev | Defect | Fix (folded) |
|---|---|---|---|
| **A4-01** | HIGH (SoD) | **Non-exportable-key attestation bypass** (finding 1a NO-GO): `_enforce_attestation` ran ONLY in `assign_role`; a soft-key executor could acquire `gateway:execute` via `grant_scope_to_role` / `add_role_hierarchy_edge` / `put_role` with no execute-time backstop. | New `_enforce_grant_invariants(affected_subs)` runs attestation (+SSD +kind) over the full downward fan-out on **all four** widening paths. Regression tests: `test_foundation.TestGrantInvariantsOnAllWideningPaths` (soft-key refused via grant / hierarchy-edge / put_role). |
| **A4-02** | MEDIUM (SoD) | **Kind-gating bypass**: a `kind=agent` principal could acquire `vault:read-credential` / `cmdb:write-policy` via the non-assign mutation paths; `_decide_write_policy` had no PDP kind backstop. | (1) `HOLDER_ALLOWED_KINDS` per-holder kind restriction enforced over the effective closure on every widening path (`_enforce_holder_kind`) + role kind-gate re-validation over the inherited closure (`_enforce_kind_gates`); (2) `_decide_write_policy` now denies agent/service `WRONG_PRINCIPAL` (mirrors `_decide_redeem`/`_decide_kill_switch`). Tests: `test_foundation` (agent refused vault/cmdb holder via grant + hierarchy) and `test_authz` (agent cannot write CMDB policy; operator can). |

Low-severity review notes also folded: (i) the G2 quiesce 403 posture is now applied
to the **resolved identity** (symmetric across Cookie AND Bearer) with a regression
test (`test_g2_refuses_an_agent_typed_COOKIE_session_too`); (ii) `regression_headers.sh`
stub-ism substitution is captured as joint **JC-1**; (iii) the always-live revocation
consult on the door and the Board/CMDB PIP fan-out are documented as CV-10 / the
Redis-HA latency checkpoint (CV-4). **All contract/SoD/honesty breaks are resolved;
the full suite is green (246 OK, 1 EdDSA skip).**
