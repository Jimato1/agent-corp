# CLAUDE.md — Execution Gateway (`gateway`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to the Gateway. Run the 7-stage pipeline; this app is **Critical-infra**, so Stages 5 and 7 have teeth.

## Identity

The Gateway is **the hands** — the *only* component in the entire suite that executes commands on real hosts. It is the chokepoint through which every destructive action must pass, and therefore the scariest container in the system. Everything about its design assumes it will eventually face a compromised or runaway agent and must fail safe anyway.

## Risk class: Critical-infra

## Its place in the segregation-of-duties chain

The Gateway executes **only** when all four holders agree. Before any action it must, in order:
1. Verify an **approved** ticket exists for this exact (host, plan) — ask the **Board**.
2. Verify **CMDB** policy permits acting on this host *right now* (criticality tier's approval satisfied; inside maintenance window).
3. Redeem credentials for this host from the **Vault** (by handle — the Gateway is the only component the Vault will release plaintext to).
4. Acquire the **per-host mutex** (no other execution may touch this host concurrently).

Only then does it run. It holds **no long-term secrets**, and **never returns plaintext credentials to an agent**.

## Agent surface (MCP) — deliberately high-level

- Expose `execute_approved_plan(ticket_id, host_id)` and status/health queries. **Nothing lower-level.**
- Do **NOT** expose raw command execution, arbitrary shell, or credential retrieval to agents. The agent names an approved plan; the Gateway decides what that means and runs vetted, parameterized steps. Validate the safest concrete pattern (e.g. pre-defined playbooks vs. constrained command templates) in the **research stage**.

## Human surface (UI)

- Live execution monitor (what is running on which host, right now).
- Complete per-command audit trail (every command + its output, immutable).
- **The kill switch lives here and physically bites here** — halting the Gateway halts all destructive action suite-wide, regardless of what agents believe they are doing. Verify this in Stage 7.

## Key mechanics to build

- **Per-host mutex** — the real-world resource lock. Correctness of this is a security property, not a nicety (prevents dpkg/apt collisions). Verify under contention in Stage 6.
- **Post-action health check** — after acting, confirm the host is healthy; on failure, **rollback-or-escalate**, never blind-retry.
- **Unreachable host → immediate escalation** (a host that doesn't come back is a `needs_review`, not a retry loop).
- **External verification hand-off** — the Gateway's job ends at "commands ran + host healthy." *Done* is confirmed separately by the external verifier (e.g. Wazuh flips active→solved). Do not let the Gateway self-declare task success.
- **Wazuh connector** likely lives in or beside the Gateway (read-only): it reads posture and confirms remediation. It never executes.

## Definition of done (Stage 7)

- Written proof that no single-component path and no agent-only path reaches execution (segregation-of-duties holds).
- Demonstrated: agent cannot obtain plaintext credentials by any path.
- Demonstrated: kill switch halts an in-flight run.
- Per-host mutex holds under simulated concurrent claims.
- External-verification evidence: a dry-run/patch against a **canary host** confirmed via Wazuh.
## SETTLED DECISIONS (ratified 2026-07-02 — `context/RATIFICATIONS_2026-07-02.md`)

1. **(D-14)** Execution engine = **embedded ansible-runner, playbook-only** (`process_isolation=True`; never forward module/module_args/cmdline; ansible-core ≥2.19). Rundeck and salt-ssh rejected.
2. **(D-8)** **Gateway-private Postgres** granted as DEPLOYMENT §3 invariant-exception #1 (`data_gateway` network) — for the append-only signed audit chain + advisory-lock mutex.
3. **(D-7)** The tier-0 **sandbox execution surface** (evidence capture, harness attestation) is a **mandatory Stage-2 EXIT item** — `context/CONTRACTS/gateway-cmdb-library-sandbox.md`.
4. **SUPERSEDED:** this app's Stage-1 response-wrapping/cubbyhole brokering assumptions are replaced by `context/CONTRACTS/vault-gateway-redemption.md` (ACL model, `release_id` flow, Board-minted fencing token, `consume_approval`, `creds`+mTLS hop). Stage-2 binds to the contracts, not RESEARCH.md, wherever they differ.
