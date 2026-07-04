# agent-runtime — the workforce (Critical-infra platform layer)

The **client half of every guardrail**. Hosts the agent processes, runs the
poll→claim→work→heartbeat→transition loop against the Board, produces the
heartbeat/liveness stream Mission Control reads, hosts the local inference stack
behind one swappable facade (`generate()`/`embed()`), physically holds the
per-agent TPM-sealed signing keys, and **obeys the drain/kill switch in code**.

It is **not** one of the four SoD action-holders (Board / CMDB / Vault / Gateway):
identity key material only, never host credentials, no approval/execution authority.
It has **no agent MCP scopes** — agents do not call the runtime; the runtime runs agents.

## Layout

```
src/agent_runtime/
  drain.py        RUN→DRAIN→KILL epoch machine + the fail-closed pre-claim gate
  board_client.py claim/fencing + the in-code TransitionGuard (SoD boundary)
  loop.py         ReAct loop with hard termination guards
  worker.py       standing worker slot (per-ticket in-process session)
  facade.py       generate()/embed() — runtime-computed provenance (C9)
  provenance.py   fail-closed model-provenance gate (Sigstore/digest/safetensors)
  custody.py      PKCS#11/TPM key custody (honest no-TPM handling)
  auth_client.py  key-provisioning enroll + DPoP re-mint + degraded mode (C7/C8)
  heartbeat.py    per-agent + fleet frames, SSE producer (C2/C5)
  supervisor.py   the single per-instance aggregation point
  api.py          FastAPI: status API + SSE + embed() + drain intake + UI
config/           versioned personas / models / tunables (PENDING-SIZING placeholders)
web/              the Helm Engine-Room status UI (bundle vendored verbatim)
evals/            persona behavioral-regression gate (skeleton; gap-5.1 overlap)
tests/            contract-conformance + fail-closed unit proofs (68 tests)
```

## Run it

```bash
python -m venv .venv && . .venv/Scripts/activate      # or bin/activate on POSIX
pip install pyyaml fastapi uvicorn httpx pytest
PYTHONPATH=src pytest -q                                # 68 pure-logic tests
AR_CONFIG_DIR=config PYTHONPATH=src python -m agent_runtime   # serve on :8080 → /status
```

See `planning/PLAN.md` for the design, `verification/CHECKLIST.md` for the full
build/boot/verify drill and the CANNOT-VERIFY-IN-SANDBOX integration items.

## Gating honesty

Every measured number (concurrency knee C, lease TTL, cadence, model pins, ceremony
params) is a documented `PENDING-SIZING`/`PENDING-SPIKE` placeholder — the gap-1.2
sizing and gap-1.3 feasibility spikes are deferred sessions (ratified D-17). The
**code structure and fail-closed enforcement are complete and tested**; only the
tuning constants and real-infra bindings wait.
