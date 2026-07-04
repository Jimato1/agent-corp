# verification/CHECKLIST.md — Agent Runtime (Stage 4 Build evidence)

> **Posture:** PROVEN BY CONSTRUCTION, not by a live end-to-end run. The pure-logic
> and contract-conformance checks below are **actually executed** (68 tests green in
> the sandbox). Everything requiring real infra (TPM hardware, real signed model
> weights + the Hub, a live Board/auth/MC, the Gateway) is written, marked
> **CANNOT-VERIFY-IN-SANDBOX**, and given the exact operator command to run it on a
> fresh clone. This is the Stage-4 artifact; Stages 5–7 (security proof, restore
> drill, two-sided kill demo) are separate.

## A. Fresh-clone build + boot + verify (operator)

```bash
# 1. clone + enter
git clone <remote> agent-corp && cd agent-corp/platform/agent-runtime
git checkout stage4/agent-runtime-build

# 2. pure-logic + contract-conformance tests (NO infra needed) — expect 68 passed
python -m venv .venv && . .venv/Scripts/activate        # POSIX: . .venv/bin/activate
pip install pyyaml fastapi uvicorn httpx pytest
PYTHONPATH=src pytest -q

# 3. boot the service + the operator UI (fail-closed: gate SHUT until auth reconcile)
AR_CONFIG_DIR=config PYTHONPATH=src python -m agent_runtime
#   open http://localhost:8080/status  → Engine-Room UI (Helm, dark Instrument)
#   models render "⚠ CANNOT CONFIRM" (no verifiers wired) — this is CORRECT/honest
#   TPM seal renders "CANNOT CONFIRM KEY SEAL" (no /dev/tpmrm0) — CORRECT/honest

# 4. container build (DEPLOYMENT.md §2: internal 8080, edge only, no host ports)
docker build -t agent-runtime .
docker run --rm -e AR_RUNTIME_INSTANCE_ID=rt-01 -p 8080:8080 agent-runtime   # dev only; prod publishes no host port

# 5. exercise the produced surfaces by hand
curl -s localhost:8080/api/runtime/status   | python -m json.tool
curl -s localhost:8080/api/runtime/models    | python -m json.tool
curl -s -X POST localhost:8080/api/runtime/drain/command \
  -d '{"mode":"drain","epoch":2,"grace_deadline":null,"issued_by":"auth","idempotency":"x"}'
curl -s -X POST localhost:8080/api/runtime/embed \
  -d '{"texts":["hi"],"input_type":"query"}'    # → 503 quiesce-drain after the drain above (never hangs)
```

## B. What the executed tests PROVE (green in sandbox)

| Property | Test | Proves |
|---|---|---|
| Heartbeat frames match the frozen contract field-for-field | `test_heartbeat_contract.py` | C2/C5 no drift (code **and** the .md doc) |
| `drain_state` vocabulary frozen | same | `{active,draining,drained,quiescing,quiesced}` exact |
| Kill command schema frozen | `test_drain_machine.py` | `{mode,epoch,grace_deadline,issued_by,idempotency}` exact |
| Facade error taxonomy + `embed()`/`generate()` shape frozen | `test_facade_contract.py` | C9 no drift; typed errors incl. quiesce |
| **Provenance is runtime-computed, not backend-reported (M1)** | same | backend serving a different model → **fail closed** |
| Drain/kill enforced **in code**, not model-trusted | `test_drain_machine.py`, `test_loop_termination.py` | pre-claim gate refuses regardless of a mock model "wanting" to claim |
| Monotonic epoch; stale lower never un-drains; KILL=zero grace; grace clamp (m7) | `test_drain_machine.py` | fail-closed kill semantics |
| **Fail-closed boot/outage reconcile (M3/M2)** | `test_drain_machine.py`, `test_auth_outage.py` | no claim before the kill epoch is polled; outage re-arms the latch |
| Fencing echo-and-reject-stale + crash-restart re-check | `test_board_client.py` | stale token → abandon, never blind-retry |
| **TransitionGuard: forbidden target never forwarded** | `test_board_client.py`, `test_loop_termination.py` | `approved/executing/verifying/done/failed/cancelled` hard-rejected in code |
| Loop terminates: hard cap / no-progress / unsatisfiable escalate, never spin | `test_loop_termination.py` | the "never terminating" defense |
| Provenance gate fails closed (pickle/tag/sha/unsigned/no-verifier) | `test_provenance_gate.py` | no unsigned model runs |
| Auth outage → `QUIESCED_BY_OUTAGE` (not KILL) + jittered backoff + breaker | `test_auth_outage.py` | credential-independent degraded mode |
| Custody never fakes attestation; executor refused on non-attested node | `test_custody_and_supervisor.py` | honest false-green rule; auth #6 |
| Printed constitutional absence (no host creds / can't approve-execute) | `test_custody_and_supervisor.py` | SoD posture always false |
| **Provenance soft-posture never fabricates a green** | `test_provenance_gate.py` | a sandbox skip records `unverified`, never `verified` (escape hatch can't fake) |
| **SoD-adjacent work is ABANDONED on drain (not checkpointed)** | `test_loop_termination.py` | a drain never leaves a half-approved action recoverable |
| **Notes checkpoint echoes fencing + pins governance** | `test_notes_client.py` | C12 write path fenced (reject-stale); dissent constraint survives compaction |

Run: `PYTHONPATH=src pytest -q` → **74 passed** (also smoke-verified: all `/api/runtime/*`
endpoints 200, drain command applies, `embed()` quiesces 503 after drain, `/status`
serves the vendored Helm bundle + React/Babel + live-fetch `ar-app.jsx` with **no CDN**).

## C. CANNOT-VERIFY-IN-SANDBOX (integration — operator commands)

| Item | Why deferred | Operator command / gate |
|---|---|---|
| **Real model provenance** (SHA-256 + Sigstore verify) | needs real signed weights + the Hub | `pip install .[integration]`; wire `hash_fn`=`huggingface_hub` verify, `sig_verify_fn`=`model-signing`; point `AR_INFERENCE_BASE_URL` at vLLM/TEI; then `/api/runtime/models` shows VERIFIED. **Do NOT claim green until run.** |
| **TPM key custody + attestation** | needs `/dev/tpmrm0` + `TPM2_Certify` hardware | `docker run --device /dev/tpmrm0 -e AR_PKCS11_MODULE=<tpm2-pkcs11 .so> …`; sandbox software path: SoftHSM2 (`AR_PKCS11_MODULE=/usr/lib/softhsm/libsofthsm2.so`) exercises the code but reports `CANNOT CONFIRM KEY SEAL` (honest). Build-spike gate: defines the executor-eligible node set (RESEARCH §4.9). |
| **Key-provisioning enroll + DPoP mint (C7/C8)** | needs live auth; contract **awaits auth countersign** | freeze `context/CONTRACTS/agent-runtime-auth-key-provisioning.md` with auth, wire `AR_AUTH_URL`, run enrollment; auth is the attestation-gate authority. |
| **Board claim/heartbeat/transition round-trip** | needs a live Board MCP server | `pip install .[integration]`; wire the MCP Streamable-HTTP transport (spec 2025-11-25) into `BoardClient`; run against Board; fencing echo-and-reject-stale is asserted server-side. |
| **MC heartbeat SSE consumption** | needs live MC | connect MC to `GET /api/runtime/heartbeat/stream`; verify the wedged/crashed/correlated-outage/drained distinction from the two signals + roster. |
| **Two-sided kill-switch demo (Stage 7)** | needs MC + Gateway | (a) cooperating runtime → clean `DRAINED`; (b) simulated rogue worker ignores drain → the Gateway chokepoint confirms nothing new arrives (seam C6, the real evidence). |
| **Backup / restore drill (Stage 7)** | canonical stores (§9) | drill: restore `provenance_ledger` + `kill_epoch_log`; assert restore never lowers the persisted max epoch and no session resurrects as lease-holder without a fresh fence re-check. |
| **Air-gapped fonts** | `tokens/fonts.css` `@import`s Google Fonts | non-blocking: fonts fall back to system if Google Fonts is unreachable. React/ReactDOM/Babel **and** the Helm bundle are all vendored locally under `web/vendor/` (no runtime CDN); refresh pins with `web/vendor/fetch-vendor.sh`. |

## D. Stage-4 exit (PROCESS.md) — self-assessment

- ✅ Core service/API + MCP-equivalent control surface + UI are siblings over one runtime state.
- ✅ Runs in its own container, internal port **8080**, joins **edge** only, resolves auth at `auth:8089` — **verified against DEPLOYMENT.md §2 (amended this session), not a restatement.**
- ✅ Produced contracts (C2/C5 heartbeat, C9 facade, C4 kill command) conformance-tested against the frozen docs.
- ⏭️ Live auth/Board/MC/Gateway/TPM/model bindings are Stage-4 **integration** items (section C) and Stage 5–7 gates — not claimed green here.
