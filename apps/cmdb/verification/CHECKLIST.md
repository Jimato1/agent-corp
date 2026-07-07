# Verification — CMDB (Stage-4 Build record)

> **Scope:** this records what the **Stage-4 build** proves *by construction + automated tests*,
> what is **CANNOT-VERIFY** without live peers (real Wazuh, live Gateway redemption, mTLS,
> a real remote/auth), and the **fresh-clone** steps to reproduce. The full Stage-5 (security
> proof), Stage-6 (optimization), and Stage-7 (external-verification + restore drill) exit
> criteria are **not** discharged here — they are separate pipeline stages.

Branch: `stage4/cmdb-build`. Backend: FastAPI (Python 3.12), 53 tests passing. Frontend:
Vite/React/TS SPA realizing the Helm `ui_kits/cmdb` kit; `npm run build` green.

---

## 1. Stage-4 exit criteria (PROCESS.md) — how each is met

| Criterion | Evidence |
|---|---|
| Runs in its own container behind the proxy | `Dockerfile` (3-stage, non-root UID 10001, git installed for the canonical policy repo), `docker-compose.yml` (network `edge` only, **never `creds`**, internal port **8080**, no host ports — per DEPLOYMENT §2) |
| Authenticates via the auth gateway | `app/authn/*` — local JWKS RS validation (EdDSA/ES256), `aud == cmdb`, `iss` equality; `AUTH_VERIFY_PORT=8089`, JWKS at `auth:8089/jwks` (DEPLOYMENT §4) |
| Both surfaces exercise the SAME state | one `evaluate()` + write-through snapshot drives the binding `POST /v1/decision`, the 10 MCP tools, and the operator dry-run byte-identically (`services/decision.issue_verdict`, `policy/evaluate.resolve_approval_mode`) — verified independently, PASS |
| API-first (core → MCP → UI) | core policy engine + `POST /v1/decision`; then MCP surface; then the SPA. Router mounted at BOTH `/v1` (frozen contract paths) and `/api/v1` (operator console) — identical handlers |
| DEPLOYMENT conformance | container/name/port/network/volumes match DEPLOYMENT.md §2/§5 (not the app's own restatement) |

## 2. Load-bearing properties — proven by construction + tests (independent verifier: PASS)

- **(a) The verdict reads CMDB's OWN facts, never agent-supplied.** `at`/`ticket_ref` never
  reach `evaluate()`; the class fork keys on the STORED host class. (`test_verdict_evaluate.py::test_at_is_advisory…`)
- **(b) A missing/stale/ambiguous fact DENIES, never default-allows.** Universal preconditions
  run before the class fork; every fail path returns `deny(...)`. (`test_verdict_evaluate.py`, `test_boot_integrity.py`)
- **(c) The weakening classifier is real and fails closed** — the derived-effect diff catches a
  NEW catalog entry born `rollback_declared:true` flipping a cell auto-eligible (the critical
  cluster-C finding); reuses the gate's own `resolve_approval_mode`. (`test_classifier.py`)
- **(d) ONE pure `evaluate()`** drives endpoint + MCP tools + dry-run — no divergent copies.
- **(e) Boot-integrity mismatch → deny-all.** repo HEAD ⇄ chain tip ⇄ remote HEAD cross-checks;
  any mismatch ⇒ `deny(policy_unavailable)` for everything. (`test_boot_integrity.py`)
- **(f) The UI step-up ceremony matches Helm** — propose → `BlastRadiusPreview` → full
  `ConfirmFriction` (diff-hash-bound, typed-intent, step-up); design deltas honored
  (CriticalityTier≠TierBadge; freeze amber; verdicts never green; fail-closed=gold Pattern-D;
  History out-of-band `git log` banner; 🔒 constitutional absences). **The frontend↔backend
  propose/confirm shapes were re-aligned after the first verification pass flagged a mismatch**
  (folded — the ceremony now completes against the live backend, not just fixtures).
- **Anti-relay:** the verdict `aud` is set from the authenticated caller (`svc:gateway→gateway`,
  `svc:tier-approver→board`); any other caller gets UNSIGNED advisory only. (`test_contract_conformance.py`)
- **Agents cannot write policy:** MCP surface has ZERO mutation verbs (import-time assert); the
  holder path requires `op:*` sub + mandatory `cnf`/DPoP + never-cached sod-critical live check +
  D=1s drift bound. (`test_authz_mcp.py`, `test_change_control.py`)

## 3. Contract conformance (frozen seams the Gateway/Library/Board consume)

| Contract | Producer surface | Status |
|---|---|---|
| `cmdb-gateway-policy.md` §1 | `POST /v1/decision` — canonical response struct (all frozen fields + additive `host_class`/`verdict_basis`); deterministic mapping | conformant (`test_contract_conformance.py`) |
| `cmdb-gateway-verdict-token.md` §1-§3 | Ed25519 JWS `typ:cmdb-verdict+jws`, `iss:cmdb`, `jti=decision_id`, `exp=valid_until`, `aud`-by-caller, `nonce=req_nonce`; `GET /v1/verdict-jwks` (CMDB-local key, distinct trust root) | conformant; token verifies against served JWKS |
| `cmdb-library-hostfacts.md` §1 | `GET /v1/hosts/{id}/facts` — inventory facts ONLY, honest 404, `Cache-Control: max-age=300`, additive `facts_provenance` (A12) | conformant |
| `gateway-cmdb-library-sandbox.md` §C | disposable class carve-out (`sandbox_exec` only; `wrong_target_class` both directions; kill knob; `sandbox_config_error` fail-closed inside the carve-out; no Vault creds) | conformant (`test_verdict_evaluate.py`) |
| `auth-apps-tokens-scopes.md` §8 | inbound `cmdb:write-policy` holder validation VERBATIM (steps 1-8) | conformant (DPoP proof real; live-check + drift coded) |

## 4. Invariants (root CLAUDE.md)

- **Markdown is the source of truth**: policy is git-backed markdown; SQLite is the rebuildable
  index + the two CANONICAL append-only logs. The gate never reads the SQLite projection.
- **Segregation of duties**: CMDB holds POLICY only — no ticket, no credentials, no execution.
  A compromised CMDB returning permit-for-everything still causes zero destructive actions
  (the destructive-never-auto floor + `action_class` derivation live at Board/Gateway
  independently; CMDB's floor copy is the strictest layer, re-asserted in `evaluate()`).
- **Two views, one state**: one `evaluate()` + one write-through snapshot.
- **Policy-plane change control**: gate-weakening edits are tamper-evident (hash-chained
  `policy_change_log`), step-up-confirmed (diff-hash-bound two-phase), and PUSH-BEFORE-EFFECT.

## 5. CANNOT-VERIFY without live peers (Stage-7 external verification) — operator commands

These are correct **by construction** but need real infrastructure to demonstrate end-to-end:

1. **Live Gateway redemption of a signed verdict + zero-skew `exp` + TOCTOU re-query.** Needs a
   running Gateway. Operator check once integrated:
   ```
   # From the Gateway's network, mint a svc:gateway token, then:
   curl -s -H "Authorization: Bearer $GW_TOKEN" \
        -X POST https://cmdb.$SUITE_DOMAIN/v1/decision \
        -d '{"host_id":"nas-01","action_class":"package_update"}' | jq .token
   # Gateway validates the JWS against GET /v1/verdict-jwks, checks aud==gateway, exp zero-skew.
   ```
2. **Real Wazuh sync.** Needs a Wazuh 4.14.x server + a read-only RBAC account. Set
   `CMDB_WAZUH_ENABLED=true` + creds, then `POST /v1/sync/trigger`; confirm `GET /v1/discovered`
   populates and bound hosts' `GET /v1/hosts/{id}/facts` update. (Reconcile logic unit-tested
   against injected agent lists.)
3. **mTLS / east-west placement.** CMDB is `edge`-only and never joins `creds`; the mTLS
   Vault→Gateway hop does not involve CMDB. N/A to this app, asserted by the compose networks.
4. **sod-critical live denylist check (A11 seam).** Needs the auth-exposed check API. Set
   `CMDB_REVOCATION_CHECK_URL`; with it empty the sod-critical write path FAILS CLOSED (verified).
   Isolated build uses `CMDB_ALLOW_UNCHECKABLE_SODCRITICAL=true` (NEVER in prod).
5. **Push-before-effect against the real policy remote.** Demonstrated against a local bare
   remote in `test_push_before_effect.py` (both success and rollback-on-failure). Production
   needs `CMDB_POLICY_REPO_REMOTE` provisioned; boot-integrity refuses to serve if local HEAD
   is not on the remote.
6. **Auth-side step-up (`acr`/re-auth).** Not in the pinned §8 claim set — v1 uses a CMDB-local
   diff-hash-bound ceremony (A9 recorded). Honest.
7. **Restore drill (Stage-7 exit).** The boot-integrity detector is built and unit-tested; the
   actual backup/restore drill is a Stage-7 criterion.

## 6. Deliberate deviations (accepted with reason)

- **MCP transport** is a hand-rolled `GET /mcp/tools` + `POST /mcp/tools/{name}` (matching the
  only built MCP surfaces — auth, chat, board), NOT the plan's "Streamable HTTP 2025-11-25":
  no MCP SDK exists anywhere in the repo. Schemas are flat/scalar/enum (D-17 ceiling).
- **Verdict-key rotation** has no runtime endpoint in v1 (key provisioned at deploy; rotation is
  change-controlled and classified weakening). Recorded; add when key-lifecycle tooling lands.

## 7. Fresh-clone verification steps

```
# Backend tests (53) — from a fresh clone of the branch:
cd apps/cmdb/backend
python -m venv .venv && .venv/Scripts/python -m pip install -r requirements-dev.txt   # (Linux: .venv/bin/python)
.venv/Scripts/python -m pytest app/tests -q          # expect: 53 passed

# Frontend build:
cd ../frontend
npm ci || npm install
npm run build                                          # expect: dist/ produced, tsc clean

# Full image (builds frontend + backend, installs git):
cd ..
docker build -t cmdb:latest .

# Run behind the proxy (requires the `edge` network + auth up):
docker compose up -d
curl -fsS http://localhost:8080/healthz   # inside the edge network → {"status":"ok","gate_ok":...}
```

## 8. Seams the Gateway (and others) consume FROM CMDB — flag list

- **Gateway** binding call `POST /v1/decision` → the signed Ed25519 verdict (`aud:gateway`),
  validated at its check-2b: `kid` in `GET /v1/verdict-jwks`, `iss=cmdb`, `aud=gateway` single,
  `exp` zero-skew, `jti` replay, optional `req_nonce`, `host_class`/`verdict_basis` surface
  cross-check, must-fit off `duration_estimate_s`. (COUNTERSIGN-1 in `cmdb-gateway-verdict-token.md`.)
- **Gateway** sandbox branch → `{host_id=<pool id>, action_class=sandbox_exec}` returns
  `permit`/`sandbox_carve_out`/`host_class=disposable`; the kill knob = set the pool disabled.
- **Board** (`svc:tier-approver`) → `POST /v1/decision` returns `aud:board` (NOT gateway-redeemable).
- **Board** triage → `GET /v1/task-types` (destructive/reversible/external_verifier) + catalog novelty.
- **Library** (`svc:library`) → `GET /v1/hosts/{id}/facts` (inventory facts only, honest 404).
- **Board escalation intake** (A2, PENDING) → the durable outbox; degraded-but-honest until it exists.
