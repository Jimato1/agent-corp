# gateway backend — Stage-4 build notes

Python 3.12 · FastAPI · gateway-private Postgres (D-8) / SQLite (isolated build) · embedded
ansible-runner playbook-only (D-14). The house RS baseline (JWKS/JWT/DPoP) is ported verbatim
from `apps/cmdb`; the Gateway is one more OAuth 2.1 resource server (`aud=gateway`).

## Module map

| Path | Role |
|---|---|
| `service/dispatch.py` | **THE ORCHESTRATOR** — the four-check SoD chain in binding order (§3). |
| `checks/board.py` `catalog.py` `plan.py` `cmdb.py` `vault.py` `mutex.py` | the four checks as pure, unit-testable functions raising `HardReject`. |
| `authn/principal.py` | Check 0 — `gateway:execute` holder validation (§8: cnf DPoP + uncached introspect). |
| `authn/livecheck.py` | destructive-exec live check (introspect + denylist, ~250ms → DENY) + drift D=1s. |
| `audit/chain.py` `signer.py` | append-only, hash-chained, Ed25519-signed forensic log + HEAD checkpoints. |
| `killswitch/state.py` | L2 physical stop — monotonic epoch, `gate()`, signed `halt_status()`. |
| `engine/runner.py` | playbook-only wrapper (structurally no module/module_args/cmdline forwarding). |
| `engine/health.py` | post-action health + rollback-or-escalate (never blind-retry). |
| `sandbox/harness.py` | D-7 tier-0 branch — degenerate chain, no host param, Vault-free. |
| `wazuh/connector.py` | read-only posture + verification poll (document disappearance, D-9). |
| `anchor/pusher.py` | signed HEAD → MC (seam #25); alarms-not-halts on push failure. |
| `mcp/surface.py` | thin agent surface: 1 execute + 1 sandbox + 5 reads; structural absence guard. |
| `api/routers.py` | operator console (UI_SPEC §12) + `/api/halt-status` (auth's direct L2 read). |
| `db.py` | dual-backend store + the advisory-lock mutex primitive. |

## The four-check chain — RUNTIME ORDER (cheap/reversible before expensive/irreversible)

0. **Check 0/D** caller holder scope + §8 (cnf DPoP + uncached introspect + drift)  — no side effect
1. **kill gate** — refuse ≥ G1 (chokepoint, before Check 1)
2. **Check A/1a** Board facts (approved ticket + host match) · **1b** Notes plan re-hash + parse ·
   **2a** action_class from catalog + non-auto floor · **B-pre** advisory CMDB deny → reject **without consuming** — all no side effect
3. **Check A/1c** `consume_approval` (single-use CAS) — FIRST irreversible (D-S2) · **1d** binding (plan_hash/allowlist/catalog/params)
4. **Check D/4b** fencing stale-reject · **4c** local advisory-lock mutex — **before redemption** (contract §5)
5. **Check B** authoritative signed CMDB verdict at the TOCTOU instant (§4 algorithm)
6. **Check C/3** Vault redeem over creds-mTLS; D-4 403/503 handled as CREDENTIAL_DENIED — the credential, LAST
7. dispatch (ansible-runner) → health → spec-conformant terminal (`verifying`/`needs_review`/`failed:<reason>`)

Any check raising `HardReject` → first-class hash-chained rejection record, run marked
rejected/failed, mutex+lease released, escalation filed, structured business error to the agent.
**No branch reaches dispatch early.**

## Run
```
pip install -r requirements-dev.txt
python -m pytest app/tests -q      # 62 passed
```
Isolated build knobs (NEVER true in prod): `GATEWAY_DB_URL=sqlite:///…`, `GATEWAY_FAKE_RUNNER=true`,
`GATEWAY_ALLOW_UNCHECKABLE_DESTRUCTIVE=true`.
