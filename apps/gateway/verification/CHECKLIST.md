# verification/CHECKLIST.md — `gateway` (Critical-infra)

> Stage-4 build verification. The four-check SoD chain is **proven by construction + the
> SOLO contract-double tests** here; the same chain rejecting **on real infra** (live Board
> consume, real CMDB signed verdict, real Vault redeem over the creds-mTLS hop) is
> **CANNOT-VERIFY-IN-SANDBOX** and is enumerated for the operator in §C. A construction-proof
> that the chain rejects is **not sufficient** for the component that touches real hosts —
> hence §C is mandatory before any production dispatch.

## A. Fresh-clone verify (SOLO — runs with no live suite)

```bash
git clone <remote> agent-corp && cd agent-corp
git checkout stage4/gateway-build
cd apps/gateway/backend
python -m venv .venv && . .venv/bin/activate     # (Windows: .venv\Scripts\activate)
pip install -r requirements-dev.txt              # fastapi, cryptography, pydantic-settings, httpx, pyyaml, psycopg, pytest
python -m pytest app/tests -q                     # expect: 62 passed
# frontend (optional — the Dockerfile builds it in-image):
cd ../frontend && npm ci && npm run build         # expect: clean tsc + vite build
```

Container (both surfaces over one state, DEPLOYMENT §2 conformance):
```bash
cd apps/gateway && docker build -t agentcorp/gateway:0.1.0 .
# runs on internal :8080, joins edge + creds + data_gateway, resolves auth at auth:8089,
# gateway-private Postgres at gateway_postgres (D-8). No host ports.
```

## B. What the SOLO suite proves (62 tests, all green)

| Property | Test file |
|---|---|
| Happy path clears all four checks → one dispatch → spec-conformant terminal | `test_four_check_chain.py::test_happy_path_*` |
| **Check A (Board approval)** hard-rejects: no approved ticket / consumed / revoked; HOST_LOCKED does not burn | `test_four_check_chain.py::test_check_a_*` |
| **Check B (CMDB verdict)** hard-rejects: deny / expired / wrong host_class; the §4 algorithm (aud anti-relay, zero-skew exp, replay, unknown kid, auth-key rejected, must-fit) | `test_four_check_chain.py::test_check_b_*`, `test_contract_conformance.py` |
| **Check C (Vault redeem)** hard-rejects: 403 / 503 — Gateway never assumes success | `test_four_check_chain.py::test_check_c_*` |
| **Check D (holder scope / Check 0)** hard-rejects: missing scope / no DPoP proof | `test_four_check_chain.py::test_check_d_*` |
| Plan binding (1d): plan_hash mismatch, allowlist mismatch | `test_four_check_chain.py::test_plan_hash_mismatch_*`, `test_allowlist_mismatch_*` |
| Independent non-auto **floor**: destructive + tier_policy → FLOOR_VIOLATION | `test_four_check_chain.py::test_floor_blocks_destructive_auto` |
| **Full chain: ANY single failed check ⇒ NO dispatch** | `test_four_check_chain.py::test_full_chain_no_dispatch_on_any_single_failure` |
| **Per-host mutex**: two concurrent execs on one host → exactly one winner; different hosts both acquire | `test_mutex_fencing.py::test_mutex_two_concurrent_threads_one_winner` |
| **Fencing stale-reject**: token ≤ high-water refused (pure + in-chain) | `test_mutex_fencing.py::test_fencing_*` |
| **No-free-form-command**: wrapper never forwards module/module_args/cmdline; agent cannot supply a command; no shell/credential tool registered | `test_no_free_form.py` |
| **Kill chokepoint**: gate refuses dispatch at ≥G1 regardless of agent intent; monotonic epoch; signed L2 halt-status | `test_audit_killswitch.py::test_kill_*`, `test_halt_status_*` |
| **Immutable audit**: append-only hash chain + Ed25519; tamper detected; every rejection is a first-class record; no plaintext credential ever logged | `test_audit_killswitch.py::test_chain_*`, `test_no_plaintext_credential_in_audit` |
| **D-7 sandbox**: degenerate chain, no host param, Vault-free branch, wrong_target_class both directions, harness_version minted, kill-covered, grant-exclusion | `test_sandbox.py` |
| **MCP surface**: structural absence, scope gating, read≠execute, wrong-audience refused | `test_mcp_surface.py` |

## C. CANNOT-VERIFY-IN-SANDBOX — the full-chain-rejects-ON-REAL-INFRA tests (MANDATORY, operator-run)

These require the live suite (Board/CMDB/Vault/auth up on `edge`+`creds`+`data_gateway`). They
are **the real evidence** that the chain rejects against real services, not stubs. Run each
against a **canary host** and confirm **no command ran** (empty audit dispatch record) and the
expected machine reason appears in the hash-chained audit.

Prereqs: `docker compose up` the suite; provision `svc:gateway` (holder `gateway:execute`
identity + `vault:read-credential`, mTLS client cert on `creds`); register the canary in CMDB.
> Note: `docker compose exec` ignores `--env-file`; set env in the compose `environment:` block.

1. **Check A on real Board** — file+approve a ticket for the canary, then REVOKE the approval;
   call `execute_approved_plan`. Expect `APPROVAL_REVOKED` (or consume the approval once, then
   call again → `APPROVAL_CONSUMED`). Confirm the Board approval row is `consumed`/`revoked`
   and **no Vault redemption occurred**.
   ```
   curl -s -X POST $GW/mcp/tools/execute_approved_plan -H "Authorization: Bearer $EXEC_TOKEN" \
        -H "DPoP: $DPOP" -d '{"ticket_id":"T-canary","host_id":"canary-01","op_id":"o1"}'
   # expect structuredContent.reason in {APPROVAL_CONSUMED, APPROVAL_REVOKED}; 0 dispatch records
   ```
2. **Check B on real CMDB** — set the canary's maintenance window CLOSED (or tier→ask with no
   approval); call execute. Expect `CMDB_DENY`/`WINDOW_MUST_FIT`/`VERDICT_EXPIRED`. Confirm the
   verdict JWS in the audit is `deny` and **the approval was NOT burned** (pre-consume advisory
   deny) and **no Vault redemption occurred**.
3. **Check C on real Vault (creds-mTLS hop)** — present a **valid approved ticket but redeem
   with an agent token** (or before consuming): expect Vault `403` → `CREDENTIAL_DENIED`, and
   confirm Vault logged+escalated the denied redemption as an exfiltration signal (contract §3:
   agent token → redeem → 403, always). Also seal Vault → expect `503` → `CREDENTIAL_DENIED`.
4. **Full chain on a canary (positive + negative)** — with all four holders honest and a real
   approved plan, run `execute_approved_plan` against the canary; confirm one dispatch, health
   check, `executing → verifying`, and **Wazuh flips the target vuln active→solved** (external
   verification = done). Then flip ONE holder to refuse and confirm the identical call rejects
   with no host contact.
5. **Kill-switch demo (Stage-7)** — throw the switch mid-run (auth raises the epoch); confirm
   the in-flight run cancels at the next safe task boundary, reports `failed(halted)` (never
   `cancelled`), and **auth reads `L2-CONFIRMED` directly from `GET /api/halt-status`**.
6. **Restore drill (canonical store, ARCH §10)** — `pg_dump` the gateway Postgres, restore to a
   prior point, and confirm the restore-consistency rule: a restored HEAD older than MC's
   retained anchor surfaces `RESTORED-BEHIND-ANCHOR` and the chain **continues under a new
   `chain_id`** (never re-pushes a lower seq as current).

## D. Invariant conformance (root CLAUDE.md)

- **Markdown-is-truth**: N/A store — the Gateway's canonical stores are the append-only
  Postgres chain/runs/heads/sandbox (§2); classified CANONICAL-append-only, backup = nightly
  `pg_dump` + the continuously-pushed MC anchors as the freshness witness.
- **Segregation of duties**: the four-check chain (§B) — Board(approval)+CMDB(policy)+
  Vault(creds)+Gateway(execution) must all agree; no single-component and no agent-only path
  reaches dispatch. Written proof: `security/THREAT_MODEL.md` (Stage 5) + the SOLO tests §B.
- **Agents coordinate through the Board**: execution rides the atomic `consume_approval`
  single-winner; the Gateway is not a queue (mutex `try`, never wait).
- **Done confirmed externally**: the Gateway ends at "commands ran + host healthy"; Wazuh
  flips active→solved (§C4). The Gateway never self-declares success.
- **Two views one state**: MCP (`/mcp`) + operator UI (`/api`) are siblings over the §2 core.
- **API-first**: core service/API → MCP surface → UI (build sequencing PLAN §14).

## F. Independent verification pass (mandatory — the hardest scrutiny for the most dangerous app)

An independent sub-agent audited the four-check chain against the frozen contracts and the
actual control flow (not comments). **Verdict: the SoD chain is SOUND — no in-code path and no
agent-supplied input reaches `run_playbook` while skipping any of Board consume / CMDB
signed-verdict validation / Vault redeem / mutex+fencing / Check-0 holder validation; ordering
never burns a credential on a reversible failure; unreachable holders fail closed.** Properties
(a) surface-is-names-only, (c) Vault 403/503 hard-reject, (d) mutex+fencing, (f) append-only
signed chain, (g) sandbox non-leak — all **HOLD**. Findings, folded this session:

- **#1 (MODERATE, folded):** the kill switch was gated once (before Check 1) but not re-checked
  before Vault redeem/dispatch, and did not revoke leases. **Fixed:** `kill.gate()` now runs
  immediately before redemption (§8 (2)) and again before dispatch; a kill after redeem revokes
  the outstanding lease (§8 (4)). Tests: `test_kill_between_checks_and_redeem_issues_no_credential`,
  `test_kill_after_redeem_revokes_lease`.
- **#2 (MODERATE, folded):** on the Postgres backend the app-allocated `audit_chain.seq` could
  race under concurrent multi-host dispatch. **Fixed:** append/checkpoint now take a
  `pg_advisory_xact_lock` so seq allocation is serialised (no-op on SQLite, which serialises via
  the process write-lock). `roles.sql` monotonic triggers unchanged.
- **#4 (LOW, folded):** sandbox `input_ref` is now regex-bounded (`test_sandbox_rejects_malformed_input_ref`).
- **#3 (LOW, accepted-by-design):** the execute path does not forward the executor's `sub` to
  Board's consume. This is intentional — **the hands are a UNIFORM POOL** (ARCHITECTURE §6): any
  principal holding `gateway:execute` may execute an *already-approved* plan, and the single-use
  `consume_approval` CAS is the authority (exactly one winner; the approval binds host+plan). The
  four-eyes/claim binding is enforced upstream at approval time, not at the chokepoint. No SoD
  break: only the fixed, approved plan on the fixed host runs, once.
- **CANNOT-VERIFY (expected):** the executed-host↔`host_id` binding and the applied extravars are
  bound at build in prod (real ansible inventory) — covered by §C4 (canary + Wazuh), not the
  SOLO suite.

## E. Known deviations / build-time decisions (recorded, not hidden)

- **MCP transport**: hand-rolled `GET /mcp/tools` + `POST /mcp/tools/{name}` (the house
  pattern — apps/cmdb, platform/auth; no MCP SDK in the repo). `execute_approved_plan` is a
  synchronous run in this build returning `run_id`; the Task/poll shim is `get_execution_status`.
- **DB dual-backend**: production is Postgres (D-8, real `pg_try_advisory_lock`); the isolated
  build/tests use SQLite with an atomic table-lock standing in for the advisory lock. The
  mutex-correctness test runs on the SQLite emulation; the real advisory lock is exercised only
  in §C (live Postgres).
- **ansible-runner**: import-guarded behind the `Dispatcher` interface; tests use the
  `FakeDispatcher` (records the no-forward kwargs, never touches a host). Real dispatch is §C.
- **Signing-key custody (O1)**, **process_isolation_executable podman-vs-bwrap (O2)**, and the
  **git audit mirror (O4)** remain Stage-5/deferred per PLAN §18; the file-mounted key +
  podman are the build defaults.
