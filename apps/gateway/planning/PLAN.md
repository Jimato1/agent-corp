# Stage 2 Planning — `gateway` Execution Gateway (Critical-infra)

> **Session:** 2026-07-03. Inputs: `research/RESEARCH.md` (Stage 1), the frozen contracts in `context/CONTRACTS/` (which **supersede** RESEARCH wherever they differ — Gateway CLAUDE.md SETTLED #4), the tier-1 specs (IDENTIFIERS / TICKET_STATE_MACHINE / DEPLOYMENT), the ratifications D-4/D-7/D-8/D-14, MERGE_REVIEW_1 §6 (the Gateway register), and the **inherited Board Stage-2 design** (`apps/board/planning/PLAN.md` §2.4/§2.5/§8.2/§8.3/§10.2 — the approval record, per-approval allowlist, and `consume_approval` are Board-designed facts this plan binds to, never reinvents).
>
> **Design principle (engineering discipline, not a gate):** the agent calling this app may be driven by a weak or hostile model that WILL attempt to cross the boundary. Every gate below is enforced **in Gateway code** and rejects an invalid request regardless of what the agent "intends." The agent gets no shell, no free-form command, no credential, and cannot talk its way past a check. Anything the agent supplies is an untrusted *claim to be verified against the owning service*, never a fact.
>
> **Schema ceiling (D-17 inheritance):** all MCP tool schemas below are flat, low-arity (≤4 args), string/enum-typed, `additionalProperties:false`. Gateway Stage-2 exit is not spike-gated (only Board/Notes are), but the ceiling binds.

---

## 0. Supersessions and inherited facts (read first)

| RESEARCH.md said | Superseded by | Now binding |
|---|---|---|
| Vault response-wrapping / cubbyhole handle | `vault-gateway-redemption.md` §1 (D-4) | ACL-model redemption: Gateway-only `read` via `bound_subject=svc:gateway`; agent-carried `release_id` (non-redeemable); Vault **independently re-verifies `approval_id`** at redeem |
| "plan id" concept | IDENTIFIERS.md ("Killed") | a plan is identified by **`plan_hash`**; playbooks by their **catalog key inside the Board-minted allowlist** |
| Board "is-approved query / signed approval token TBD" | Board PLAN §8.3 | **`consume_approval`** — single-use CAS, returns `{plan_hash, plan_note_id, plan_note_rev, action_class, allowlist[], fencing_token}` under a Board-side **execution hold** |
| verification timeout → `needs_review` | `board-wazuh-connector-kickoff.md` §3 | timeout/refute → **`verifying → failed`** (Board-automatic); `failed` triggers retro/escalation |
| CMDB duties assumed | `cmdb-gateway-policy.md` (+D-6) | one canonical verdict shape; fail-closed matrix; host-facts (snapshot capability, timeouts, Syscollector interval, window-close semantics) are CMDB duties |
| kill-switch design local to Gateway | `killswitch-chain.md` (+auth §10) | auth = L1 sole epoch writer; Gateway = **L2 physical stop**; Gateway's own confirmation is the sole legitimate L2-CONFIRMED source, read directly by auth |
| MCP surface auth hand-rolled | `auth-apps-tokens-scopes.md` §1/§8 | RS baseline + the **pinned holder-scope claim shape** (verbatim §8: at+jwt, single `aud=gateway`, `cnf` mandatory, live introspect for destructive-exec, drift bound D=1s) |

Ratified settlements consumed: **D-14** embedded ansible-runner, playbook-only, `process_isolation=True`, never forward `module`/`module_args`/`cmdline`, ansible-core ≥2.19. **D-8** gateway-private Postgres on `data_gateway` (invariant exception #1). **D-7** sandbox surface is a mandatory Stage-2 exit item (→ §10 + the contract). **D-9** Wazuh closure = document disappearance via the connector poll.

---

## 1. Identity, blast radius, posture

The Gateway is the only component that executes on real hosts. Its failure mode is not "bug" but "fleet compromise." Consequences for every design choice:

- **Fail closed, always.** Any dependency unreachable (Board, CMDB, Vault, auth, its own Postgres/audit chain) → refuse to execute. CMDB downtime halting all destructive throughput is the designed behavior, not an outage to engineer around.
- **No check is skippable, none is agent-overridable.** There is no "force" flag, no admin bypass on the agent surface, no config knob that disables a gate. Operator emergency paths run through auth's break-glass (which auto-files the A2 review ticket), never through Gateway options.
- **Two independent refusals wherever possible.** Board refuses `consume_approval` at kill ≥ G1 AND the Gateway refuses dispatch at kill ≥ G1. Board's execution hold locks the host AND the Gateway's advisory lock locks it locally. The destructive-never-auto floor is held at Board (§8.2 step 4) AND enforced here (§3, check 2a). A single compromised neighbor changes nothing.
- **Everything is audited, including every rejection.** A rejected call is a first-class hash-chained audit record with a machine reason — rejections are the hostile-model telemetry MC watches.

## 2. Data model (gateway-private Postgres, D-8; network `data_gateway`)

Roles: `gw_owner` (DDL, owns tables; migration-time only), `gw_app` (runtime; INSERT+SELECT only on append-only tables — **never** superuser/owner; UPDATE/DELETE/TRUNCATE revoked), `gw_anchor` (SELECT on `audit_chain` heads only, used by the anchor pusher). In-database append-only cannot restrain a superuser (PG documented limit) — the app role simply never has that power; the operator's DBA credential lives outside the container.

| Table | Purpose | Mutability |
|---|---|---|
| `runs` | one row per `run_id` (R-ULID): `ticket_id, approval_id, host_id, plan_hash, action_class, fencing_token, state ∈ {preflight, executing, health_check, rolling_back, reporting, done_reported, failed_reported, halted, orphaned}`, timestamps, `op_id`, caller `sub` | INSERT + state-CAS UPDATE only (trigger-guarded legal transitions) |
| `audit_chain` | the per-command/per-event forensic log: `(seq BIGSERIAL, run_id, record_type, payload JSONB, prev_hash, record_hash, sig)` — AU-3-complete fields per RESEARCH §6 incl. credential **handle** (never plaintext), CMDB `decision_id`, mutex markers, kill/halt events, **rejection records** | **append-only** (INSERT+SELECT for `gw_app`; no UPDATE/DELETE grants exist) |
| `chain_heads` | signed HEAD checkpoints: `(chain_id, head_seq, head_hash, sig, signed_at, pushed_to_mc_at)` | append-only |
| `host_fence` | `host_id → highest fencing_token executed` (the stale-fence rejector, `board-agents-claim.md` §3) | monotonic UPDATE (trigger rejects decrease) |
| `playbook_catalog` | Gateway-owned implementations registry: `playbook_key, version, content_sha256, action_class, extravars_schema JSONB, est_duration_s, rollback ∈ {snapshot, dnf_history, none}, sandbox_profile BOOL, signed_by, status` | operator-vetted change control only (§4.1) — no agent-reachable write path exists |
| `sandbox_runs` | sandbox evidence join: `run_id, ticket_id, profile_key, harness_version, input_ref, transcript_ref, exit_status, env_fingerprint, started/finished` | append-only |
| `kill_state` | mirror of auth epoch/level `(epoch, level, updated_at)` + local halt flag | monotonic (epoch never decreases) |

Advisory-lock keyspace: `pg_try_advisory_lock(hashtext('host:'||host_id))` on a **dedicated, non-pooled, session-lifetime connection** per run (RESEARCH §3 gotchas: no PgBouncer transaction pooling on this connection; session death frees the lock — the crash-recovery property we bought Postgres for).

**Store classification (ARCH §10):** `audit_chain`/`chain_heads`/`runs`/`sandbox_runs` are **CANONICAL — append-only** (tamper evidence is the point). Backup: nightly `pg_dump` into the suite backup job **plus** the continuously-pushed MC anchors (seam #25) as the freshness witness. **Restore-consistency rule:** a restored Gateway DB must be reconciled against (a) MC's retained anchor series — any restored HEAD older than MC's latest for that `chain_id` is surfaced as `RESTORED-BEHIND-ANCHOR`, alarmed, and the chain is **continued under a new `chain_id`** (never silently re-written); (b) the Board's `executing` tickets — every Board execution hold with no matching live run enters orphan reconciliation (§6.4). Drilled at Stage 7.

## 3. THE FOUR-CHECK SoD CHAIN (each check a coded hard-reject)

`execute_approved_plan(ticket_id, host_id, op_id)` runs this pipeline. **Order is binding** (`vault-gateway-redemption.md` §5: mutex before redemption; TOCTOU re-checks at the instant of action). Every ✗ below is a hard reject: run row → `failed_preflight`-class audit record with machine reason, agent gets a structured business error (never a stack trace), repeated ✗ patterns escalate to MC.

**Check 0 — caller (auth RS baseline, `auth-apps-tokens-scopes.md` §1/§8, verbatim):**
JWS valid, `kid` in currently-served JWKS; `iss` exact; `aud == gateway` single-valued; `scope ∋ gateway:execute` (holder — audience↔holder binding mechanical); `cnf` proof verified (DPoP jkt default) — **no proof, no validity**; destructive-exec live check: pushed denylist AND uncached `POST /introspect` (~250 ms timeout → DENY); kill epoch fresh; budget middleware (destructive-exec concurrency "very low, often 1"). A valid token is *necessary, never sufficient* — it only reaches the door.

**Check 1 — Board (approval): the single-use consume.**
- 1a *(no side effects)*: `GET /facts/ticket/{ticket_id}` — `exists`, `status == approved`, `approval_id` present, `host_id` matches the request, taint/lane facts logged. ✗ → `NO_APPROVED_TICKET`.
- 1b *(no side effects)*: fetch the pinned plan bytes from Notes (`plan_note_id`@`plan_note_rev`, via `svc:gateway` + `notes:read` — cross-app ask §16-A2), recompute `sha256:` over the exact bytes. Parse the fenced playbook-invocation list from those same bytes.
- 1c *(the consume)*: `POST /api/approvals/{approval_id}/consume` `{ticket_id, host_id, op_id}` as `svc:gateway` (`board:execute`, kind-gated). Board atomically: acquires the **execution hold** (host lock, `hold_kind='execution'`), mints a **fresh fencing token**, CAS `approved → executing`, burns the approval (`granted → consumed`, second consume = terminal `approval_consumed`). ✗ (`HOST_LOCKED` — approval **not** burned, retry later; `approval_consumed`/`approval_revoked` — terminal reject + escalate).
- 1d *(binding verification, post-consume, before anything irreversible)*: response `plan_hash` == our recomputed hash (✗ → `PLAN_HASH_MISMATCH`: report `executing → failed`, escalate — a burned approval on mismatch is the fail-safe direction); every parsed invocation canonicalizes to a `params_hash` that appears in the returned `allowlist`, and no allowlist row is unmatched (✗ → `ALLOWLIST_MISMATCH`); every `playbook_key` exists in `playbook_catalog` at the pinned version with matching `content_sha256` (✗ → `UNKNOWN_PLAYBOOK`); every extravars set validates against that playbook's `extravars_schema` (enum/regex-bounded; ✗ → `PARAM_SCHEMA_VIOLATION`). **The agent supplied none of these values — all four come from Board + Notes + the Gateway's own catalog.**

**Check 2 — CMDB (policy, live, signed):**
- 2a: derive `action_class` **from the catalog binding of the playbooks about to run** (worst class across invocations) — never from the request, never from ticket `type` (`cmdb-gateway-policy.md` §4). Independently of CMDB, enforce the **non-auto floor**: `action_class ∈ {destructive}` (or catalog `rollback=none` on a non-snapshot host) with `approver_kind = tier_policy` → ✗ `FLOOR_VIOLATION` (a compromised CMDB returning permit-for-everything still causes zero destructive auto actions).
- 2b: `POST` decision query `{host_id, action_class, ticket_ref}` → **signed verdict token**; verify CMDB signature, `decision_id`, expiry. Accept `permit`, or `ask` *with* the consumed approval (that is exactly what "ask" defers to); `deny` → ✗. Fail-closed matrix verbatim (unknown host / no policy / unreachable / malformed class / clock ambiguity → deny + Board escalation).
- 2c: **must-fit**: `est_duration_s` (catalog, summed) + `grace` must fit before `window_closes_at` → else ✗ `WINDOW_MUST_FIT`. Store `decision_id` + `policy_version` in the audit record. Re-query if our `valid_until` lapses before dispatch; **never cache across an action**.

**Check 3 — Vault (credential, by handle, Gateway-only):**
- 3a: read `release_id` from the ticket (agent-written per contract §1; it is powerless everywhere except Vault's redeem endpoint).
- 3b: generate an **ephemeral per-run keypair**; authenticate to Vault (`POST /auth/jwt/login`, svc:gateway token per §8 pin); present `(ticket_id, release_id)`; receive a **short-TTL SSH cert** (5–15 min sized to the run, non-empty ticket-templated `valid_principals`, `key_id=ticket_id`). Vault **independently verifies `approval_id`** (D-4) — expect and handle that: the Gateway passes `approval_id` + `run_id` in the redeem call so Vault's Board lookup can verify `status=consumed ∧ consumed_by=svc:gateway ∧ ticket status=executing` (predicate raised to Vault Stage-2, §16-A3). ✗ (Vault deny/unreachable/expired release) → hard reject, report `executing → failed(reason=credential_denied)`, escalate. **No plaintext ever exists outside this process; nothing credential-shaped is ever returned to any agent or written to any log (handle + HMAC only).**
- 3c: lease/cert bookkeeping: revoke-at-run-end recorded up front so the halt path (§8) and the finally-block both revoke.

**Check 4 — per-host mutex (the real-world lock):**
- 4a: the Board **execution hold from 1c IS the suite-level host lock** (one claim = one host); the returned fencing token is lease-bound and unique.
- 4b: **fencing stale-reject**: token must be `> host_fence[host_id]` (✗ → `STALE_FENCE`, escalate — this is the split-brain detector); record it as executed-generation on dispatch.
- 4c: local second layer: `pg_try_advisory_lock(host:host_id)` non-blocking on the dedicated connection. Failure while holding a Board execution hold is an **invariant violation** (✗ + escalate, never wait-and-retry). Held across run + health check + rollback; freed by session close (crash-safe).
- 4d: belt-and-suspenders on the host: `-o DPkg::Lock::Timeout=<n>` so a stray unattended-upgrades makes us wait, not fail mid-plan.

Only after 0–4 does `ansible_runner.run_async(...)` dispatch (§4). The audit record for dispatch carries: all four evidence artifacts (`approval_id`+consume response digest, `decision_id`+verdict, credential handle+lease id, fencing token+lock markers) — the **SoD proof is reconstructible from the chain alone**.

**Sources of authority table (what the agent's call contributes: nothing but names):**

| Fact | Source of truth | Agent-supplied? |
|---|---|---|
| approval exists / single-use | Board `consume_approval` | no — agent names `ticket_id` only |
| what runs (playbooks + params) | Board allowlist ⋈ Notes pinned bytes ⋈ Gateway catalog | no |
| policy permits now | CMDB signed verdict, live | no |
| credential | Vault redeem, Gateway-only | no (`release_id` is powerless) |
| host exclusivity | Board execution hold + PG advisory lock + fencing | no |

## 4. Brokered execution (playbook-only, D-14)

### 4.1 The catalog (registry #2 — Gateway owns implementations; CMDB owns policy attributes)
Playbooks are admin-authored files in the Gateway image/volume under a fixed `private_data_dir/project`, registered in `playbook_catalog` with `content_sha256` and a version. **Mutation rule (CONTRACTS/README):** new/changed playbooks are operator-vetted code review — the write path is an operator UI action with **step-up confirmation**, audit-chained (policy-plane change control, ARCH §12); no MCP path exists. CMDB holds each key's policy attributes (class, reversibility, applicable tiers); the Gateway refuses any `playbook_key` CMDB has no attributes for. Initial catalog: `patch_debian` (snapshot-first, apt-get, RESEARCH §2 semantics), `patch_rhel` (`dnf upgrade-minimal --security`), `reboot_host`, `service_restart`, `health_probe`, plus sandbox profiles (§10).

### 4.2 Invocation profile (the wrapper IS the security boundary)
`ansible_runner.run_async(private_data_dir=<fixed>, playbook=<catalog path for playbook_key>, extravars=<schema-validated dict, every value tagged !unsafe>, process_isolation=True, cancel_callback=<kill/window hook>, event_handler=<audit-chain writer>)`. The wrapper **structurally cannot** forward `module`/`module_args`/`cmdline` — they are not parameters of any internal function signature, and unit tests assert the kwargs dict never contains them (RESEARCH residual risk #1). ansible-core ≥2.19 pinned (inverted templating trust); `|quote` on anything reaching a shell; `become` bound to the CMDB verdict, not the plan. Bounded run duration: hard wall-clock cap = catalog estimate ×2 (also the Board watchdog's window) — a hung task cannot outlast the kill switch.

### 4.3 SSH layer (defense-in-depth, RESEARCH recommendation adopted)
Relaxed restricted keys fleet-wide: `restrict` minus `command=` (`no-pty`, no forwarding, `from=<gateway-ip>`) + sudoers allowlist of the vetted patch commands; Vault SSH-CA certs as the only credential (no static keys at rest). A stolen cert cannot tunnel, cannot sudo outside the allowlist, and expires in minutes.

## 5. Per-host mutex — summary of the layered lock (detail in §3 check 4)

| Layer | Primitive | Owner | Frees on crash |
|---|---|---|---|
| Suite | Board execution hold (`host_locks`, `hold_kind='execution'`) + monotonic fencing token | Board | deliberately NOT reaper-eligible — orphan rule §6.4 |
| Gateway | PG advisory lock, dedicated session connection, `try` (reject, never queue — the Board holds ordering; the Gateway is not a queue) | Gateway | yes (session death) |
| Host | `DPkg::Lock::Timeout` | dpkg | n/a (safety net only) |

Fencing: Gateway records highest generation executed per host (`host_fence`) and refuses lower — stale holders from reaper requeues can never touch a host out of order. Verified under simulated concurrent consume + dispatch contention in Stage 6.

## 6. Exec safety

### 6.1 Health check (fixed sequence, post-action)
Bounded wait-for-SSH (deadline per CMDB tier policy, D-6b) → `systemctl is-system-running --wait` ∈ {`running`} (never `status` exit codes) → `systemctl --failed` empty + critical services `is-active` (per-host critical list = CMDB host fact) → reboot marker cleared (`/var/run/reboot-required` absent on Ubuntu / `dnf needs-restarting -r` = 0; do not assume the marker on bare Debian — `needrestart` fallback, Verify-at-build).

### 6.2 Rollback-or-escalate (never blind-retry)
On failed health check: **exactly one bounded rollback** — snapshot restore where CMDB says `snapshot_capability ≠ none` (snapshot taken pre-patch by the playbook itself; mandatory on Debian-family), else `dnf history undo` for leaf packages only (never kernel/glibc/selinux). Rollback success → `executing → failed(reason=rolled_back)` + escalation; rollback failure or no path → `executing → failed(reason=unrecoverable)` + **immediate escalation**. Unreachable host (SSH deadline blown) → immediate `failed(reason=host_unreachable)` + escalation; **never** a retry loop.

### 6.3 Window-close mid-run
CMDB's D-6d window attribute decides: `abort_and_rollback` → cancel at next task boundary, run the rollback path; `finish_current_atomic_step` → complete the in-flight task, skip remaining invocations, report partial as `failed(reason=window_closed)`. The must-fit check (§3-2c) makes this rare by construction.

### 6.4 Orphaned-run reconciliation (gap 2.3 — the register item)
If the Gateway dies mid-run, the Board hold persists deliberately (the host may have been touched). On startup the Gateway: (1) scans `runs` for non-terminal states; (2) cross-checks Board holds via `GET /facts/host-lock/{host_id}`; (3) for each orphan — health-probes the host (read-only probe playbook; fresh minimal-TTL credential via a **new** `release_id` requested by the operator path if the old lease expired — orphan resolution is operator-gated when re-redemption is needed); (4) reports the truthful terminal outcome: healthy + all invocations' audit records complete → `executing → verifying/needs_review`; anything else → `executing → failed(reason=orphaned)`. **Never auto-resumes a half-run.** The Board watchdog (estimate ×2) escalates independently — two clocks, either fires.

### 6.5 Terminal states (CF-B/C — spec-conformant)
Gateway reports only `executing → verifying` (external verifier registered), `→ needs_review` (no verifier), `→ failed` (failure/halt/rollback — incl. kill-switch cancellation: **a killed run is `failed`, never `cancelled`**; `cancelled` is reserved for operator withdrawal where the world was provably untouched). The run-outcome transition carries `run_id` + fencing token and releases the execution hold (generation++).

## 7. Wazuh connector (read-only; in-process module, no new container)

Two clients, both credentials Vault-held, read-only via Wazuh RBAC: Indexer `:9200` (`_search` over `wazuh-states-vulnerabilities-*` — the PRIMARY posture/verification source) and Server API `:55000` (agent liveness, Syscollector metadata). Version-probe at startup; refuse 5.x. Duties (contract `board-wazuh-connector-kickoff.md` §4): baseline posture pulls for recon agents (read tool, §11), and **verification polling**: after `executing → verifying`, poll for **document disappearance** of each `(vulnerability.id, agent.id)` pair recorded pre-patch, with backoff sized to the host's Syscollector interval (CMDB fact D-6c), requiring a completed post-change scan; submit evidence `{result: confirmed|refuted|timeout, evidence:{query, absence_result, timestamps, run_id}}` to `POST /api/tickets/{id}/verification` (Board flips `verifying → done|failed` automatically). `Solved` alerts are corroboration only. `agent.id → host_id` only via CMDB's mapping, never raw alert fields. The connector never executes; no Wazuh write path exists in the codebase.

## 8. Kill switch — the L2 physical stop (chokepoint property)

Halting the Gateway halts all destructive action suite-wide because §3 is the only path to execution and §10 funnels sandbox runs through the same dispatcher.

- **Signal intake (independent channels):** `auth:revocations` subscription + JWKS poll (≤30 s, the Redis-independent channel) + epoch in every validated token. `kill_state` is monotonic; a stale epoch never lowers a level.
- **At level ≥ G1 (freeze-destructive):** (1) refuse all new dispatch — `execute_approved_plan` and sandbox runs return `HALTED` before Check 1; (2) refuse to *begin* Vault redemptions; (3) cancel in-flight runs at the next safe task boundary via `cancel_callback` (never SIGKILL a live dpkg/apt transaction); (4) revoke outstanding Vault leases; (5) the advisory-lock connections close as runs terminate (no stuck locks); (6) report each halted run `executing → failed(reason=halted)`. Bounded run duration (§4.2) caps how long a hung task can ignore the switch.
- **Two independent refusals:** the Board also refuses `consume_approval` at ≥ G1 (its §8.3 step 3) — a Gateway that somehow missed the epoch still cannot consume.
- **L2 confirmation (killswitch-chain §4, R9):** the Gateway exposes `GET /api/halt-status` `{epoch_seen, level, in_flight_runs, last_dispatch_refused_at, sig}` — **read directly by auth** as the sole legitimate source of L2-CONFIRMED. MC relays render only as STALE-UNKNOWN.
- **Honesty carve-outs (absorbed verbatim):** the switch is not instantaneous (task-boundary cancel); an already-issued SSH cert survives until TTL/KRL — demos claim "no NEW issuance/execution," residual exposure = cert TTL under enforced NTP.
- Kill/halt events and every refused dispatch are first-class chained audit records. Stage 7 demonstrates: switch thrown mid-run → task-boundary cancel → `failed` report → auth reads CONFIRMED from the Gateway directly.

## 9. Immutable audit + MC anchoring (seam #25 — contract frozen this session)

- **Capture:** ansible-runner `event_handler` per-task events (command, module args as-rendered, rc, stdout/stderr slices, timing) + gate evidence + rejections + kill/mutex/lease markers.
- **Record:** AU-3-complete JSON; `record_hash = SHA-256(canonical(fields) || prev_hash)`; Ed25519 signature. Signing key: file-mounted, readable only by the app user, **not** in the image, rotation runbook; forward-secure interval checkpoints. (Where the key physically lives — host-mounted secret vs TPM — Verify-at-build.)
- **Store:** the append-only Postgres table (§2 privileges). **Audit-write failure halts new dispatch** (fail closed on auditability — same posture as Vault D-16a); in-flight runs finish their current task and terminate at the boundary (their buffered events flush to a local spool file that is chain-ingested on recovery, so the halt itself never orphans evidence).
- **Anchor (the freshness proof):** signed chain HEAD pushed to MC `POST /api/anchors`, idempotent by `(chain_id, seq)` — producer half frozen in `context/CONTRACTS/gateway-mc-audit-anchor.md`: push every 100 records or 5 min (whichever first) and at every run terminal; on (re)connect, read MC's advertised last `(chain_id, seq)` and re-push all retained HEADs above it; HEAD retention ≥ 180 days; **anchor-push failure alarms but does not halt** (MC's contract treats gaps as RESYNC-PENDING; the local chain remains fail-closed).
- Mirror to the git audit repo (signed commits) stays a Stage-4 nice-to-have behind the same chain — Postgres + MC anchor are the load-bearing pair.

## 10. Tier-0 sandbox surface (D-7 — mandatory exit item; Library blocks on this)

Gateway half designed here and written into `context/CONTRACTS/gateway-cmdb-library-sandbox.md`; CMDB's half (the `disposable` class row) freezes at CMDB Stage-2. Design:

- **Tool:** `run_sandbox_test(ticket_id, profile_key, input_ref, op_id)` — flat, 4 args. Callers: curation-team personas holding the new **`gateway:sandbox`** scope (non-holder; §11). The caller must hold the live claim on `ticket_id`; the Gateway validates the claim + fencing via Board facts (the curation agent, unlike the executor path, holds an ordinary `in_progress` lease).
- **No approval/consume machinery:** sandbox execution is not a destructive/irreversible type (ARCH §5: "a sandbox has no real world"), so it rides the normal `in_progress` work lane — the four-holder chain degenerates honestly: **Board** = ticket exists + live claim fence; **CMDB** = signed verdict for `(host_id=<sandbox pool id>, action_class=sandbox_exec)` must return `permit/auto` on the `disposable` class (the operator's kill knob: set the class to deny and all sandbox exec stops); **Vault** = *structurally absent* — no redemption code path exists on this branch, sandboxes hold nothing worth stealing; **Gateway** = concurrency mutex per sandbox slot + the global kill switch (same dispatcher, same `cancel_callback`, same refusal at ≥ G1).
- **Target:** never caller-named. The Gateway spawns a fresh container per run from the **pinned harness image** (podman, no suite networks, no tokens/creds mounted, CPU/mem/wall-clock caps, default-deny egress; profile may allowlist package mirrors). The tool has **no host parameter** — the strongest non-leak guarantee is that a real `host_id` is unrepresentable in the request.
- **Carve-out non-leakage (the D-7 proof obligation):** (1) separate tool + separate scope — `gateway:sandbox` never grants `execute_approved_plan`, `gateway:execute` never grants the sandbox tool; (2) no host parameter (above); (3) the sandbox branch contains no Vault client and no SSH inventory — real-host execution is a different code path with all four checks; (4) `action_class=sandbox_exec` is a **7th class valid only on this branch**: real-catalog playbooks never carry it, sandbox profiles carry only it, and `cmdb-gateway-policy.md` §4's non-auto floor is untouched for the six real classes; (5) a poisoned CMDB row marking a real host `disposable` still cannot reach it — the sandbox path executes only into containers the Gateway itself just spawned.
- **Evidence capture (what Library admits on):** `{run_id, ticket_id, profile_key, harness_version, input_ref (doc/note + rev), full transcript (content-addressed blob + hash in chain), exit_status, env_fingerprint (image digest, package versions), started/finished}` — hash-chained like everything else. Read back via `get_sandbox_evidence(run_id)` (scope `gateway:read`); Library stores links only.
- **Harness attestation:** `harness_version` = `hv-` + first 12 hex of sha256 over (harness image digest ‖ canonical profile-catalog JSON) — **Gateway-minted, IDENTIFIERS row added this session**. Any harness/profile change goes through the same step-up, audit-chained change control as the playbook catalog (ARCH §12); the change event is pushed to the Board/Chat so Library can trigger its 100% spot-audit.

## 11. Agent surface (MCP, pinned 2025-11-25; one write tool + one sandbox tool + reads)

RS baseline verbatim (§1 of the auth contract): JWKS-local validation, RFC 9728 metadata, 401/403/409/429/503 semantics, budget middleware behind the transport seam (open item — Redis-sharing, root-review-#2), revocation subscription. `execute_approved_plan` modeled as an MCP **Task** (returns handle, agent polls) with the stable `get_execution_status(run_id)` shim so the agent contract survives the 2026-07-28 migration; task access auth-context-bound (reject cross-principal `tasks/*`).

| Tool | Schema (all `additionalProperties:false`, required all) | Scope | Action class (risk manifest) |
|---|---|---|---|
| `execute_approved_plan` | `{ticket_id, host_id, op_id}` — 3 strings | `gateway:execute` (HOLDER, executor agents; pinned §8 shape incl. `cnf` + uncached introspect) | **destructive-exec** |
| `run_sandbox_test` | `{ticket_id, profile_key (enum), input_ref, op_id}` | `gateway:sandbox` (NEW — non-holder; curation-team personas via `team` label; **explicitly not grantable together with `gateway:execute`** — requested as a grant-time exclusion) | write-benign (tier-0), dedicated concurrency budget |
| `get_execution_status` | `{run_id}` | `gateway:read` (NEW — non-holder) | read |
| `get_host_health` | `{host_id}` | `gateway:read` | read |
| `get_fleet_posture` | `{host_id?}` → Wazuh-derived read-only posture (recon consumption, contract §2) | `gateway:read` | read |
| `get_sandbox_evidence` | `{run_id}` | `gateway:read` | read |
| `list_playbooks` | `{}` → catalog keys, param schemas, classes, estimates (huddle planning input) | `gateway:read` | read |

**Structurally absent** (the Vault four-tools pattern — not "rejected," *not registered*): any shell/command/credential/raw-SSH tool, catalog writes, approval anything, halt-status writes, task-cancel beyond own context.

**Countersign of the auth slice (Gateway Stage-2 obligation, ledger §3):** `gateway:execute` consumed as offered — HOLDER, executor agents, `aud=gateway`, full §8 pin honored at the tool handler *and* middleware. **`svc:gateway` outbound grants consumed/requested:** `vault` → `vault:read-credential` (pinned §8/§9 — sole holder); `board` → `board:execute` + `board:read` (Board PLAN §12 raised it — consumed); `cmdb` → `cmdb:read-policy`; `mc` → `mc:anchor` (MC PLAN §6.4 — consumed); `notes` → `notes:read` (**new ask**, §16-A2). **New scopes registered this session (mechanical Stage-5 constants, per §7 registration-note pattern):** `gateway:read` (suffix-classifies read), `gateway:sandbox` (write-benign; needs the grant-time exclusion vs `gateway:execute` noted in the ledger).

## 12. Human surface (UI) + shared API (two views, one state)

One core HTTP API under both surfaces: `POST /api/runs` (internal dispatcher), `GET /api/runs`, `GET /api/runs/{run_id}` (+`/events` SSE tail over the audit store — the operator stream is separate from the agent's MCP task channel), `GET /api/hosts` (lock/fence/health view), `GET /api/audit` (chain browse + verify-walk), `GET /api/halt-status` (auth's direct L2 read), `POST /api/anchors`-outbound worker, `GET/POST /api/catalog` (operator step-up writes), `GET /api/sandbox/{run_id}`, orphan-reconciliation queue endpoints. Operator auth: forward-auth session via proxy (human principals; `gateway`-audience UI session), every state-changing operator action step-up-confirmed + audit-chained.

Screens (Stage-3 input): **Live execution monitor** (per-host cards: task state, current run/ticket, mutex holder + fencing generation, streaming stdout/stderr); **Audit trail** (immutable per-command view, chain-verify button, anchor status vs MC); **Kill-switch status** (epoch/level seen, in-flight runs, halted-run list — read-mirror of auth-owned state + the Gateway's own L2 confirmation; the trigger button lives in MC/auth, not here); **Catalog registry** (playbook versions, hashes, signatures, pending operator-vetted changes); **Sandbox runs** (evidence browser); **Orphan queue**.

## 13. Deployment (verbatim DEPLOYMENT.md conformance)

Compose/DNS `gateway`, internal 8080, networks `edge` + `creds` + `data_gateway`; no host ports. Vault hop over `creds` with **mTLS** (Gateway client cert; also the `cnf` fallback channel). Private Postgres `gateway_postgres` on `data_gateway` only (invariant exception #1; store rules §2). Env: `GATEWAY_PORT=8080`, `GATEWAY_DB_URL`, `GATEWAY_SIGNING_KEY_FILE`, `GATEWAY_WAZUH_*` (endpoints only — credentials are Vault handles), `AUTH_VERIFY_PORT=8089` consumed by name. ansible-runner + ansible-core ≥2.19 + podman/bwrap in-image (isolation executable Verify-at-build). Wazuh connector in-process (no sidecar row needed). Boot order: after auth/proxy; refuses dispatch until JWKS + kill-state sync.

## 14. Build sequencing (Stage 4, API-first)

1. Postgres schema + roles + audit chain writer/verifier (the substrate everything logs to).
2. Core API + the §3 pipeline against **contract stubs** (Board consume/facts, CMDB verdict, Vault redeem — stub the frozen shapes verbatim; SOLO/JOINT split per the Stage-7 stub pattern).
3. ansible-runner wrapper (catalog, extravars validation, event capture, cancel hook) + the no-forward unit tests.
4. Kill-switch intake + halt path + `GET /api/halt-status`.
5. MCP surface (Tasks + shim) over the core API; auth RS middleware.
6. Wazuh connector (posture reads → verification poll → Board evidence).
7. Sandbox branch (podman harness, evidence capture).
8. Anchor pusher → MC; UI last.

## 15. Threat-model outline (Stage 5 opener — full model there; Critical-infra axes pre-committed)

A hostile-model-driven agent attempts, and is defeated by:
1. **Skip a check** — impossible by construction: checks are sequential in one code path with no branch that reaches dispatch early; verified by tests that fault-inject each dependency and assert refusal.
2. **Forge/replay an approval** — `consume_approval` is Board-side single-use CAS; approval bound to exact `(host_id, plan_hash)`; second consume = terminal; Vault re-verifies independently (D-4); plan bytes re-hashed by the Gateway.
3. **Reuse a consumed approval on another host / mutate the plan** — binding checks 1d; params_hash per invocation; a changed byte is a different approval.
4. **Target an out-of-window host** — live signed CMDB verdict + must-fit + deny-biased fail-closed matrix; verdict never cached, never agent-relayed.
5. **Escape the playbook sandbox** — no `module`/`module_args`/`cmdline` forwarding (unit-asserted); extravars schema/enum/`!unsafe`; ansible-core ≥2.19; `process_isolation`; relaxed-restricted keys + sudoers allowlist bound the blast radius of a control-host escape; empirical extravars-templating test is a Stage-5 gate.
6. **Smuggle execution through the sandbox tool** — no host parameter; no Vault client on that branch; class carve-out one-way (§10); grant-time scope exclusion.
7. **Poison inputs (prompt injection — mandatory axis):** Wazuh alert text, ticket bodies, and note content are host-originated adversarial input — they are *data* here, never interpolated into commands (extravars schema gate) and never able to select a playbook outside the allowlist; provenance taint already bars the auto lane upstream (Board §9).
8. **Tamper with the record** — append-only privileges, hash chain, Ed25519, off-box MC anchors; superuser honesty limit documented and mitigated by role separation.
9. **Outrun the kill switch** — bounded run duration; task-boundary cancel; Board's independent G1 refusal; cert-TTL residual stated, never hidden.
10. **Cross-agent interference** — task handles auth-context-bound; per-principal `op_id`; fencing monotonicity.
Plus Stage-5 mandatory items: segregation-of-duties written proof (the §3 chain + two-independent-refusals inventory), agent-never-holds-plaintext walkthrough, kill-switch chokepoint verification, mutex correctness under contention, audit completeness, secret-material DR for the signing key.

## 16. Cross-app asks raised (blocked dependencies, per the seam rule)

- **A1 → Board (consumed, no change needed):** binds to `consume_approval` §8.3 response verbatim; run-outcome + verification endpoints §10.2; facts endpoints §7. Board's `board:execute` scope ask to auth covers the Gateway's Board writes.
- **A2 → auth + Notes (NEW):** `svc:gateway` needs `notes:read` (fetch pinned plan revision bytes for the 1b re-hash). Notes must serve **revision-pinned reads** (`plan_note_id`@`plan_note_rev`, exact bytes). Raise at auth Stage-5 constants batch + Notes session.
- **A3 → Vault Stage-2 (NEW, seam subtlety):** D-4's independent verification runs **after** the Gateway consumes — the redeem-time predicate must accept `status=consumed ∧ consumed_by=svc:gateway ∧ ticket=executing ∧ host/plan binding matches` (not `granted`). Recorded here so Vault doesn't build a `granted`-only check that deadlocks every legitimate redemption.
- **A4 → CMDB Stage-2:** the `disposable` class + `sandbox_exec` action-class carve-out per the amended sandbox contract; verdict-token signing format (contract §3) co-designed with the Gateway; D-6 host facts consumed here (snapshot capability, tier timeouts, Syscollector interval, window-close semantics).
- **A5 → auth (constants batch):** register `gateway:read`, `gateway:sandbox` (+ the sandbox/execute grant-exclusion note); `svc:gateway` grants: `mc:anchor`, `notes:read` (A2), `board:execute`/`board:read`, `cmdb:read-policy` — `vault:read-credential` already pinned.
- **A6 → MC (consumed):** anchor push per the new frozen contract `gateway-mc-audit-anchor.md`; re-push-above-last-(chain_id, seq) producer duty accepted.

## 17. Adversarial review — residual risks (accepted with reason) and resolutions

Run as a five-lens critic panel against this plan (SoD/confused-deputy, blast radius, contract conformance, sandbox carve-out, operational failure modes). Material findings and dispositions:

1. **Burned approval on `PLAN_HASH_MISMATCH` (1d) strands the ticket.** Accepted — deliberately fail-safe: a mismatch means Board/Notes disagree about the plan bytes, which is exactly when a human must look; the `failed` report + escalation is the designed outcome, and re-approval is cheap relative to executing a wrong plan. *(Resolved into the plan: 1a/1b run all no-side-effect checks pre-consume to make burns rare.)*
2. **The Gateway self-fetches plan bytes from Notes — a compromised Notes could serve different bytes than the Board hashed.** Mitigated, not eliminated: the hash was computed by the *Board* over the same revision at grant; the Gateway independently recomputes and both must agree with the approval's `plan_hash` — a lying Notes yields a mismatch and a refusal (fail-closed), never a wrong execution. Residual: Notes + Board *jointly* compromised defeats it; accepted (that pairing already defeats the ceremony upstream).
3. **CMDB deny after consume burns the approval** (§3 order). Accepted: pre-consume advisory CMDB query (1-pre) minimizes it; the alternative (consume last) would let a verdict expire between check and hold. The TOCTOU-correct point for the *authoritative* verdict is post-hold, pre-redemption; burn-on-deny is rare and safe.
4. **Sandbox egress** — profiles that allowlist package mirrors reopen a (bounded) exfiltration channel from a container processing adversarial doc content. Mitigations: default-deny; mirror allowlist is per-profile, operator-vetted, part of `harness_version`; no secrets exist in the sandbox to exfiltrate. Accepted as tier-0-appropriate; revisit in Stage 5.
5. **`gateway:sandbox` + `team` label dependency** — team-label gating lands with auth's Stage-5 store migration; until then sandbox grants are operator-manual. Accepted (Library curation go-live is sequenced after the trio anyway).
6. **Audit fail-closed halt spool** (§9): halting dispatch on audit-write failure while spooling in-flight events to disk is a small trusted surface — the spool file is hash-chained on ingest and its existence alarmed. Accepted.
7. **`host_fence` UPDATE vs append-only posture** — it is a projection (rebuildable from the chain), monotonic-guarded by trigger; not a canonical store. Documented in §2 to keep the DR classification honest.
8. **Single Gateway process is load-bearing for the in-process mutex layer** — HA landmine documented at the mutex (§5, RESEARCH §3); the PG advisory lock is already the cross-process authority and fencing exists, so promotion is designed, not improvised.
9. **Run-duration cap (estimate ×2) can kill a legitimately slow patch.** Accepted: the cap is the kill-switch guarantee's precondition; the outcome is a truthful `failed` + escalation + retro, never a hung chokepoint.
10. **Critic finding, resolved:** the sandbox tool originally took the caller's fencing token as an argument; dropped — the Gateway reads the live fence from Board facts itself (never trust a caller-supplied fence; schema stays 4-flat).

## 18. Open decisions (deliberately deferred, with owners)

| # | Question | Owner / when |
|---|---|---|
| O1 | Signing-key custody: host-mounted file vs TPM-sealed (like agent-runtime keys) | Stage 5 (secret-material DR axis) |
| O2 | `process_isolation_executable`: podman vs bwrap in-container privileges | Stage 4 Verify-at-build (RESEARCH list) |
| O3 | Inline stdout/stderr in chain vs content-addressed blob refs above size N | Stage 4 (default: inline ≤64 KiB, blob+hash above) |
| O4 | Git audit mirror on top of Postgres+anchor | Stage 4 nice-to-have |
| O5 | Budget-middleware transport (shared Redis vs auth budget API) | root-review-#2 (suite topology) — built behind a seam either way |
| O6 | Sandbox harness image contents + first profile set (with Library) | freezes with the sandbox contract at CMDB Stage-2 |
| O7 | On-demand Syscollector scan to shorten verification | Stage 4 Verify-at-build |

## 19. Exit-criteria coverage (PROCESS.md Stage 2)

- **Data model specified** — §2 (Postgres D-8, roles, append-only regime, DR classification + restore rule).
- **Both surfaces over one shared state** — §11 (MCP: 2 write-class + 5 read tools, schema-ceiling-conformant) and §12 (UI/API) are siblings over the §2/§3 core; neither is downstream of the other.
- **API surface + MCP tool list + UI surface** — §11/§12; sequencing §14.
- **Adversarial review run; concerns resolved or explicitly accepted with reason** — §17 (10 findings, each dispositioned).
- **Critical-infra extra (adversarial review of blast radius)** — §15 outline + §17 items 2/4/6/9.
- **D-7 mandatory exit item** — Gateway half of the tier-0 sandbox designed (§10) and written into `context/CONTRACTS/gateway-cmdb-library-sandbox.md`; `harness_version` row added to IDENTIFIERS.md.
- **Register items (MERGE_REVIEW_1 §6, Gateway row)** — redemption contract adopted (§0/§3-3), fencing token (§3-4b/§5), `consume_approval` (§3-1c), allowlist validation (§3-1d), `creds`+mTLS (§13), sandbox (§10), orphaned-run rule (§6.4), audit-HEAD→MC contract (**frozen**, `gateway-mc-audit-anchor.md`), Postgres exception (§2/§13), spec-conformant terminal states (§6.5).
