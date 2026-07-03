# Stage 2 Planning — `board` Coordination Board (Standard risk class, trust-critical)

> **Gate status (D-17 SOFT-START / HARD-FREEZE):** this plan is drafted in full, but **every MCP tool schema in §12 is PROVISIONAL** and **Stage-2 does not exit** until the gap-1.3 local-model-drives-MCP spike PASSES its ratified thresholds. Ceremony parameters (huddle size, round caps, timebox values, draft-isolation policy) additionally await the gap-1.2 sizing measurement and are marked PROVISIONAL where they appear. Everything else — data model, claim engine, approval record, facts endpoints, state machine, HTTP API — is not spike-gated and is specified as binding design.
>
> **Inherited, not reinvented:** this plan implements the producer side of `context/CONTRACTS/board-agents-claim.md` and `board-wazuh-connector-kickoff.md` (both FROZEN) exactly; encodes `context/specs/TICKET_STATE_MACHINE.md` (incl. ratified amendments A1/A2), `IDENTIFIERS.md`, and `DEPLOYMENT.md`; and resolves every item in the Board's Stage-2 obligations register (`context/MERGE_REVIEW_1.md` §6) under the ratified decisions D-1, D-2, D-5, D-9, D-11, D-14, D-15, D-17 (`context/RATIFICATIONS_2026-07-02.md`).
>
> **Adversarial review:** a multi-agent adversarial pass (5 lenses: frozen-contract conformance, SoD/blast-radius, state-machine/ceremony fidelity, concurrency correctness, register/seam completeness) produced 21 verified findings (17 confirmed, 4 minor) plus 19 further findings verified in-session. All confirmed findings are **folded into the sections below**; §20 records the residual risks accepted with reason and §6a the two narrow spec amendments the review forced.

---

## 0. Identity and blast radius

The Board is Standard risk class but **trust-critical**: it mints the approval records the whole segregation-of-duties chain binds to, it is the single authority for ticket state and ceremony phase, and it is the most-depended-on app in the suite (agent-runtime, Gateway, Vault, auth's PDP, Notes, Drive, MC, Chat, and the Wazuh connector all consume Board facts or Board-minted tokens). The plan therefore treats three surfaces with critical-infra care even though the app is Standard: the **approval record + `consume_approval`**, the **fencing-token mint**, and the **state-machine transition authority table**. A compromised Board is contained by the rest of the SoD chain (it holds no credentials and cannot execute), but a *wrong* Board silently corrupts the approval record every other holder trusts — correctness here is the product.

**One shared state, three faces:** an internal service layer over one SQLite database, exposed as (1) an authenticated HTTP API, (2) an MCP agent surface, (3) the human kanban/console UI. MCP and UI are siblings over the same service layer (two-views invariant); internal processes (reaper, watchdog, cron kickoffs, `svc:tier-approver`) call the same service layer in-process.

---

## 1. Storage and runtime substrate (ratified D-14)

- **SQLite, WAL mode**, `busy_timeout=5000` (tune at Stage 6), all writes through a single serialized writer connection; every claim/transition transaction opens with **`BEGIN IMMEDIATE`** (per RESEARCH §2 — `BEGIN DEFERRED` upgrade is the documented `SQLITE_BUSY` trap). **No network I/O ever happens inside a write transaction** — any cross-app fetch (Notes bytes, CMDB verdicts) completes before `BEGIN`, with an in-transaction re-verify of the pinned inputs (§8.2).
- Node.js service (single container `board`, port 8080, `edge` network only, volume `board_data`, env prefix `BOARD_` — DEPLOYMENT §2/§5). No host ports. Auth resolved at `auth:8089`.
- **node-cron** in-process for scheduled kickoffs (`noOverlap: true`), plus two in-process sweeps: the **reaper** (default every 30s) and the **ceremony watchdog** (default every 10s). Dedup and idempotency always live in Board data, never in the scheduler layer. Sweep precedence rules in §4.
- MCP pinned to **Streamable HTTP, spec revision 2025-11-25** (suite-wide pin; re-verify SDK patch at build; do not design against the 2026-07-28 RC). `Origin` validated; `MCP-Session-Id` supported; Board is an OAuth 2.1 RS per `auth-apps-tokens-scopes.md` §1 (JWKS local validation, `aud=board`, RFC 9728 metadata, budget middleware, `auth:revocations` subscription, error semantics verbatim).
- The Board DB is **CANONICAL** (ARCHITECTURE §10): tickets, approvals, leases/locks, `ceremony_events`, audit log are not rebuildable. Backup design in §16.

---

## 2. Data model

All cross-app IDs follow IDENTIFIERS.md exactly: `ticket_id` = `T-` + zero-padded integer (row PK); `approval_id` = `A-` + zero-padded integer; `plan_hash` = `sha256:` + 64 lowercase hex; `host_id` stored verbatim (CMDB-minted, opaque); `sub` opaque; `note_id`/`run_id`/`release_id` opaque; fencing token = monotonic integer per locked resource; `op_id` caller-minted ≤128 chars.

### 2.1 `tickets`
| Column | Notes |
|---|---|
| `id` INTEGER PK | rendered as `T-%06d` everywhere it crosses the API |
| `kind` | `ticket \| epic \| standing` |
| `parent_id` | Linear-shallow self-reference (epic/standing → children) |
| `child_class` | `general \| recon \| execution` — set at creation; `execution` is stamped **only by backlog decomposition** (§14.2); governs the ceremony claim-gate (§3) |
| `spawned_by` | `sub` of creating agent, NULL for operator/system |
| `lineage_depth` | **server-derived, never caller-supplied** (D-11): operator/scheduled/webhook births = 0; agent-created = `parent.lineage_depth + 1`, where for agent principals `parent_id` **defaults to the agent's currently-claimed ticket**; a parentless create by an agent with no active claim gets depth 1 (never 0). A declared `parent_id` may only deepen, never flatten, the derived value |
| `type` | task-type key from **CMDB's task-type registry** (foreign vocabulary, stored verbatim). **Advisory for routing/lane display only — never an authorization or auto-approve input** (§8.2 derives the effective action class from the allowlist playbooks, not from `type`) |
| `title`, `body` | body carries structured sections; huddle transcript lives in Notes, never here |
| `status` | the 11-state superset, §6 |
| `quarantine` | boolean; quarantined kickoffs (§10.1) are born `todo` with `quarantine=true` — **structurally excluded from every claim query**; cleared only by an operator action (audited) |
| `ceremony_phase` | **rebuildable projection** of `ceremony_events` — never authoritative |
| `lane` | `straight_to_execute \| lightweight \| full` + `lane_signals` JSON (values, sources, `evaluated_at` per signal — Board-fetched, §14.1) |
| `host_id` | nullable; per-server execution tickets carry exactly one (one claim = one host) |
| `team` | nullable label; claim filter + auth schema label |
| `priority`, `severity` | ordering *within* contention, never a reason to split per-CVE |
| `claimed_by`, `claimed_at`, `lease_expires_at`, `lease_renewals`, `fencing_token` | **display copies** — the single lease/fencing authority is `host_locks` (§2.2); these columns are written only in the same transaction that writes the lock row |
| `proposer_id` | `sub` that caused `in_progress → awaiting_approval` (four-eyes input, PIP fact) |
| `origin_kind` | `operator \| scheduled \| event_webhook \| agent` |
| `taint_host_originated` | raise-only boolean + `taint_sources` JSON (§9) |
| `version` | `ticket_version` optimistic-concurrency counter (Board-scoped, opaque to callers) |
| `spawn_key` | UNIQUE partial index WHERE NOT NULL — webhook/cron dedup (Board-internal, never transmitted) |
| `wall_clock_cap_at` | hard max-renewal/wall-clock deadline; watchdog input (contract §2) |
| timestamps | `created_at`, `updated_at`, terminal timestamps |

Terminal tickets are **retained forever** (Oban retain pattern — the Board doubles as audit).

### 2.2 `host_locks` (the resource mutex + fencing mint — the SINGLE lease authority)
| Column | Notes |
|---|---|
| `resource_id` TEXT PK | the `host_id` for host-bound tickets; ticket-scoped rows for hostless ticket-bound work exist but are **Board-internal** — consumers never construct or parse them; the consumer-facing fencing read is keyed by `ticket_id` (§7), so no composite ID crosses the app boundary (IDENTIFIERS rule 3) |
| `resource_kind` | `host \| ticket` |
| `claimed_by_ticket`, `claimed_by_agent` | current holder or NULL |
| `hold_kind` | `claim \| execution` — `claim` = an agent lease (reaper-eligible); `execution` = the consume-time hold for a Gateway run (§8.3; **never reaper-eligible**, released by the run-outcome transition) |
| `lease_expires_at` | TTL lease (meaningful for `hold_kind=claim`) |
| `lock_generation` INTEGER | **the Board-minted monotonic fencing counter.** Incremented on every acquisition (claim or execution hold) and every release (reap, voluntary, outcome). Never decremented, never reset — monotonicity across restore is guaranteed by the time-seeded floor in §16, not by hope. |

One row per resource, created on first touch. The mutex is **data** (ratified D-14): acquisition is a status-guarded conditional UPDATE, never an advisory lock. **A lock is acquirable only when `claimed_by_ticket IS NULL`** — expired leases are freed exclusively by the reaper (holder-guarded, §4); there is **no steal-at-claim branch**. This closes the claim/steal/reap triangle: no two paths can ever free or take one lock concurrently, and a slow-but-alive agent that heartbeats before the sweep revives its lease without a false `STALE_FENCING`.

### 2.3 `ticket_deps`
`(ticket_id, depends_on_id, kind='finish_to_start')`, canonical direction blocker→blocked; cycle-closing edges rejected at insert via `WITH RECURSIVE` (UNION) reachability probe. Readiness is a derived predicate (`NOT EXISTS` unfinished prerequisite), folded into the claim query — never a stored boolean.

### 2.4 `approvals` — **the approval record (the merge's headline Board gap, now designed)**
| Column | Notes |
|---|---|
| `id` INTEGER PK | rendered `A-%06d` |
| `ticket_id` | the per-server execution ticket |
| `host_id` | bound host — **approval is bound to exact `(host_id, plan_hash)`** |
| `plan_hash` | `sha256:` over the **exact bytes of the plan-slice note revision** the approval covers (IDENTIFIERS "validated by recomputation" — Gateway re-hashes the content it is about to execute and refuses mismatch) |
| `plan_note_id`, `plan_note_rev` | the pinned Notes revision the hash was computed over |
| `action_class` | **derived at grant from the allowlist playbooks** (worst class across invocations, via CMDB catalog policy attributes) — never from ticket `type`, never from the agent (§8.2) |
| `proposer_id` | copied from the ticket at grant time |
| `approver_sub` | operator `sub` or `svc:tier-approver` |
| `approver_kind` | `operator \| tier_policy` |
| `cmdb_decision_id` | required when `approver_kind=tier_policy` (the signed CMDB verdict that justified auto-approval) |
| `status` | `granted → consumed \| revoked \| expired` — **single-use**; `consumed` is reached exactly once |
| `granted_at`, `consumed_at`, `consumed_by`, `run_id` | `consumed_by` = the Gateway's `sub`; `run_id` attached when Gateway reports it |
| `op_id` | idempotency of the grant call |

**Four-eyes, enforced at the Board independently of the PDP:** the grant INSERT is guarded by `approver_sub != proposer_id` (and `approver_sub != claimed_by`). A violation is rejected and logged as an SoD violation event. This holds even if auth's PDP is misconfigured — two independent enforcement points.

**Immutability:** `approvals` and `approval_allowlist` rows are INSERT-only after grant; the only permitted UPDATE is the status CAS (`granted→consumed/revoked/expired`) plus `consumed_*`/`run_id` set in that same statement. Enforced by triggers raising on any other UPDATE.

### 2.5 `approval_allowlist` — the per-approval plan→playbook allowlist (Board-minted, CONTRACTS/README registry #3)
`(approval_id, seq, playbook_key, params_hash, host_id)` — one row per authorized playbook invocation. `playbook_key` is the Gateway catalog key (stored verbatim); `params_hash` = sha256 over the canonical JSON of the pinned parameter set for that invocation (so an approved "upgrade nginx on web-prod-02" cannot be replayed as "run arbitrary playbook"). The allowlist **is the approval's content** and is **extracted inside the grant transaction from the exact bytes that produced `plan_hash`** — the proposal-time parse (§8.1) is a validation gate only, never the source of the inserted rows (extracting from anything but the hashed bytes would be a plan-hash-binding bypass). Displayed verbatim to the approver; immutable once granted. The Gateway validates every run step against it and refuses anything outside it.

### 2.6 `ceremony_events` — **the sole ceremony-phase authority** (append-only)
`(id, ticket_id, event_kind, from_phase, to_phase, actor_sub, role, guard_name, round, note_id, note_rev, params JSON, machine_reason, created_at, op_id)`.
`event_kind ∈ {phase_transition, huddle_opened, statement, triage_decision, watchdog_trip, veto, veto_clear, decision_record, invalidation, pause, resume}`. The **`huddle_opened` event carries the server-set governance parameters** (`round_cap`, `timebox_deadline`, roster) in `params`, so the `huddles` projection — including the watchdog's inputs — is fully rebuildable from this log alone (a rebuild can never silently disarm the D-1 watchdog). `round` is **stamped by the service layer, never caller-supplied** (§14.2). `ceremony_phase` on the ticket is a projection rebuilt from this log. Notes frontmatter is a **display copy, never read back** (TICKET_STATE_MACHINE §3; CF-D).

### 2.7 `huddles` (projection — fully rebuildable from `ceremony_events` incl. the `huddle_opened` params)
`(ticket_id PK, lane, round, round_cap, timebox_deadline, paused_at, pause_total, roster JSON, positions_filed JSON, ar_dissent_count, veto_state ∈ {none, raised, cleared_by_ar, cleared_by_operator}, po_decision_event_id, status)`. `timebox_deadline` and `round_cap` are **server-set at huddle open** from lane policy — the SM agent never supplies them (D-1: the watchdog enforces regardless of any agent's activity). Pause semantics in §14.2.

### 2.8 Policy + guardrail tables
- `wip_policy(scope ∈ {global, per_agent, per_team}, subject NULL|sub|team, cap)` — enforced inside the claim; **MC write surface** (§11).
- `lineage_policy(max_depth default 3)` — D-11, enforced at claim time.
- `standing_triggers(ticket_id, trigger_kind ∈ {manual, schedule, event}, cron_expr, event_filter JSON, child_template JSON, spawn_key_rule, suppress_while_open bool)`.
- `op_ids(sub, op_id, request_hash, response JSON, created_at)` — **UNIQUE(sub, op_id)**, per-principal (global-unique `op_id` was Drive's confirmed defect). Semantics: the row is inserted **in the same transaction as the operation's effect** (a crash can never commit one without the other); a replay with a matching `request_hash` returns the stored response; a reuse with a **different** `request_hash` → `409 OP_MISMATCH`; concurrent duplicate → `409 in_progress`. **Exception for `claim`/`heartbeat` replays:** before returning the stored response the service re-checks current ownership — if the lease has since been reaped/re-granted, the replay returns `STALE_FENCING`/`CLAIM_CONFLICT` instead of an affirmatively-stale "you own it" (the Board never knowingly asserts false ownership).
- `auth_state(last_epoch, level ∈ {G0,G1,G2}, drain_window_started_at, updated_at)` — kill-epoch mirror (§11); the reaper's population gate consults it (§4).

### 2.9 `audit_log` (append-only)
Every state change from either surface: `(id, ts, actor_sub, surface ∈ {mcp, http, ui, internal}, action, ticket_id, approval_id, from_state, to_state, fields_changed JSON, op_id, fencing_token, traceparent, outcome)`. Rejected SoD-boundary attempts (agent tries `→ done`, stale fence, four-eyes violation, second consume) are logged here as first-class `violation` rows — they are the spike's zero-tolerance telemetry and MC's anomaly feed. Feeds the SSE stream.

---

## 3. The claim engine (FROZEN contract `board-agents-claim.md` §1 — producer side, exact)

One atomic transaction (`BEGIN IMMEDIATE`), one logical operation, for both `claim_next` and targeted `claim`:

1. **Select candidate** (targeted id, or `ORDER BY priority, created_at LIMIT 1` over the ready set) where ALL of, in one predicate:
   - `status='todo'` AND `quarantine=0` (status-guarded CAS; quarantined tickets are structurally unclaimable),
   - dependency-ready (`NOT EXISTS` unfinished prerequisite in `ticket_deps`),
   - ceremony gate — **scoped exactly to the spec's "child execution ticket"**: tickets with `child_class='execution'` require parent phase ≥ `backlog`; `recon` children require parent phase ≥ `recon`; `general` children are ungated (an over-broad gate would deadlock every ceremony by blocking its own recon sub-tickets),
   - host lock **free** (`claimed_by_ticket IS NULL` — never a steal over an expired lease; §2.2),
   - per-agent WIP < cap, global WIP < cap, per-team WIP < cap (if set),
   - `lineage_depth <= lineage_policy.max_depth` (**D-11 — enforced here, at claim time**, on the server-derived depth),
   - kill level `G2` not active (G2 = no new claims; §11),
   - optional filters: `team`, `type`, host tier class.
2. **CAS the ticket**: `UPDATE tickets SET status='in_progress', claimed_by=?, claimed_at=?, lease_expires_at=now()+TTL, lease_renewals=0, version=version+1 WHERE id=? AND status='todo' RETURNING …` — zero rows = lost race.
3. **CAS the resource lock** in the same transaction: `UPDATE host_locks SET claimed_by_ticket=?, claimed_by_agent=?, hold_kind='claim', lease_expires_at=?, lock_generation=lock_generation+1 WHERE resource_id=? AND claimed_by_ticket IS NULL RETURNING lock_generation` (INSERT the row on first touch). Zero rows = host busy → whole transaction rolls back.
4. Return `{ticket, host_id, fencing_token: lock_generation, lease_expires_at, ticket_version}`.

**Failure semantics (contract §1, verbatim):** lost race / no eligible work / WIP breach / lineage-cap breach / host busy are **business outcomes**, returned as `isError:true` structured content — `{code: CLAIM_CONFLICT|NO_ELIGIBLE_WORK|WIP_CAP|LINEAGE_CAP|HOST_LOCKED|QUIESCED, current_owner?, ticket_version?}` — never a JSON-RPC error. Delivery is **at-least-once**: after reaper requeue the same ticket may be re-claimed while a stale holder still runs; every consumer keys idempotency on `(ticket_id, fencing_token, op_id)`.

**Voluntary release** (`board.release`): CAS `in_progress → todo`, clear lease, release lock (holder-guarded) **and increment `lock_generation` immediately** (a released claim's token must never remain live). This is the agent-caused `in_progress → todo` the frozen contract §4 grants — encoded as an explicit §6 row and spec amendment §6a.

---

## 4. Lease, heartbeat, reaper (contract §2 — producer side)

- **Single lease authority:** the lease lives on `host_locks`; `board.heartbeat(ticket_id, fencing_token, progress_note?, op_id?)` validates holder + fence against the lock row and bumps `host_locks.lease_expires_at` (ticket display columns updated in the same transaction — the two can never desync). Optionally stores a small resumable-progress payload (Temporal-`details` pattern) returned on any future re-claim. Stale fence → `isError {code: STALE_FENCING}` — the agent's signal that it was reaped (crash-restart rule, contract §3). A heartbeat arriving after expiry but **before the sweep** revives the lease (the lock was never freed — no false reap).
- **Numbers are policy, not schema** — finalized after gap-1.2 (rule: visibility > p99 step duration + buffer). Starting defaults recorded, not binding: heartbeat 60–90s, lease TTL 5 min, reaper sweep 30s, `wall_clock_cap` per ticket class (operator knob, default 60 min).
- **Reaper** (in-process, single sweep; the **sole** lease-expiry path): for each `hold_kind='claim'` lock with `lease_expires_at < now()`, one atomic statement — ticket `in_progress → todo`, lock released **holder-guarded** (`WHERE resource_id=? AND claimed_by_ticket=:expired_ticket`), `lock_generation` incremented (contract §2's one-statement requeue). Zero lock rows = the state moved under us → the reaper no-ops that entry (never clobbers a lock it doesn't own). `hold_kind='execution'` rows are **never reaped** (§8.3). Reap emits an audit row + SSE event.
- **Sweep precedence (deterministic, CAS-guarded):** tickets marked `held` (outage gate below) are exempt from both the reaper and the wall-clock watchdog until the hold resolves. The **max-renewal / wall-clock cap** trip (A1 `board_escalation`, machine reason `max_renewal_cap`) fires **only on a live lease** (`lease_expires_at ≥ now()` — the spec's "still-heartbeating never-completing agent"); an expired lease is the reaper's to requeue, so the two sweeps can never race to different outcomes on one ticket (both are status-guarded CAS; the loser no-ops).
- **Outage-aware reaper (gap 4.4, contract §2):** before requeueing, the sweep computes the fraction of **the fleet** (`BOARD_FLEET_SIZE`, operator-configured — the same denominator MC's suppression uses; never just "currently-leased agents") whose leases expired within the current window. Gate mechanics:
  - **Minimum-population floor:** the gate evaluates only when ≥ `BOARD_OUTAGE_GATE_MIN_AGENTS` (default 4) distinct agents held live leases at window start — a routine single-agent death always takes the normal reap path, never a fleet hold.
  - **Drain/kill-aware (two-wires rule):** lease lapses occurring inside an active drain/kill window (per `auth_state`) **bypass the gate entirely** and requeue normally — `killswitch-chain.md` §3 *promises* "the reaper requeues and increments the fence" for drain-abandoned work; an ordered drain must never read as an infrastructure outage.
  - On trip (> threshold — **value deferred by D-12**; config key ships with a conservative interim default of 40%, marked PENDING): expired leases are marked `held`, ONE fleet-level anomaly escalation is filed (Board escalation ticket + Chat escalation), and the hold releases when **fleet liveness resumes** (the runtime population heartbeats again — not per-held-ticket beats, which abandoned tickets will never receive) with ordered, jittered re-entry and a per-ticket fencing re-check, or when the operator clears it. Held tickets never silently requeue.

---

## 5. Fencing (contract §3 — the ONE minter)

- The Board is the **single minter** (IDENTIFIERS fencing row): a monotonic integer per locked resource, issued with each acquisition, incremented on every acquisition and every release (claim, reap, voluntary release, execution hold, outcome release).
- **Board-side enforcement (echo-and-reject-stale):** every ticket-bound side-effecting Board call made by a **claim holder** — `transition`, `heartbeat`, `release`, `update` on a claimed ticket, `link_note` — carries `fencing_token`; the Board rejects `token < current lock_generation` with `STALE_FENCING`. A token generated but never checked provides no safety — the Board checks its own. (`ceremony_statement` is deliberately **roster-sub-bound, not fence-bound** — most roster members hold no lease; see §14.2.)
- **Consumer enforcement:** Gateway records the highest generation executed per host and refuses lower (`vault-gateway-redemption.md` §5 — mutex acquired with the Board token BEFORE redemption); Notes validates **uncached** against the Board on every ticket-bound write (Notes PLAN); Drive enforces a per-ticket max-generation staleness check (Drive PLAN §2). The auth PDP checks presence/freshness only, never the value.
- **Read surface for consumers:** keyed by what consumers already hold — `GET /facts/ticket/{ticket_id}` returns the current `fencing_token` + holder + lease expiry; `GET /facts/host-lock/{host_id}` serves host-keyed reads (Gateway). Ticket-scoped lock rows never cross the boundary (§2.2).
- **The execution window is fenced, not orphaned:** `consume_approval` mints a **fresh generation under an execution hold** (§8.3) — every token the Gateway ever presents is lease-bound and unique, per IDENTIFIERS ("issued with the lease"). Monotonicity across restore: §16's time-seeded floor.

---

## 6. State machine (Board-owned; TICKET_STATE_MACHINE.md encoded, + two narrow amendments §6a)

The transition table below is **data + guards in the service layer** (no statechart runtime), enforced identically on MCP, HTTP, and UI paths. Authority is checked as *(principal kind, scope, and for A1/A2 the internal-process identity)* — the caller's claimed role is never trusted over its token.

| From → To | Authority (enforced) | Board mechanism |
|---|---|---|
| `todo → in_progress` | agent (`board:claim`) | atomic claim (§3) |
| `in_progress → todo` | **agent (`board:claim`), fence-checked — voluntary release** *(amendment A-VR, §6a)* | `board.release`: clears lease, releases lock holder-guarded, generation++ |
| `in_progress → todo` | Board reaper (automatic) | lease expiry; holder-guarded release; generation++ |
| `in_progress → awaiting_approval` | agent (`board:update`), fence-checked | records `proposer_id = sub`; requires linked plan note with parseable invocation list (§8.1); **releases the host lock (generation++)** — the approval wait must not starve the host; exclusivity for the destructive window is restored at consume time (§8.3) |
| `in_progress → needs_review` | agent (`board:update`), fence-checked | artifact done (non-destructive types); releases lock (generation++) |
| `in_progress → blocked` | agent or Board | escalation / dependency unmet; releases lock (generation++), keeps `claimed_by` audit trail |
| `awaiting_approval → approved` | operator (UI, step-up) or `svc:tier-approver` (D-15) | **mints the approval record** (§2.4/§8); four-eyes + derived-action-class floor enforced |
| `awaiting_approval → cancelled` | operator | plan rejected |
| `approved → executing` | **Gateway only** (`board:execute`, kind-gated `svc:gateway`) | **`consume_approval` — single-use; acquires the execution hold + fresh fencing token** (§8.3) |
| `approved → cancelled` | operator | approval status → `revoked` in the same transaction (live PDP re-check makes it effective) |
| `approved → awaiting_approval` | **Board (automatic), restore reconciliation ONLY** *(amendment A-RR, §6a)* | restore-revoked approvals re-enter the approval queue without losing ticket lineage (§16) |
| `executing → verifying` | Gateway | run finished; task type has registered external verifier (CMDB registry fact); **releases the execution hold (generation++)** |
| `executing → needs_review` | Gateway | run finished; no verifier; releases execution hold (generation++) |
| `executing → failed` | Gateway | run failed / halted / rolled back; releases execution hold (generation++) |
| `verifying → done` | **Board automatic** | connector evidence confirms disappearance (§10.2) — evidence attached |
| `verifying → failed` | Board automatic or operator | refutation / verification timeout |
| `needs_review → done` | **operator, human-ONLY** | no agent or policy path exists — structurally absent from every non-UI surface |
| `needs_review → todo` | operator | rework |
| `blocked → todo` | Board automatic or operator | dependency satisfied / escalation resolved |
| `todo/blocked → cancelled` | operator | withdrawn; cancelling a ceremony parent cascades per §14.2 |
| **A1** `in_progress → needs_review` (`board_escalation`) | **Board watchdog only** (ratified D-5a) | stuck-huddle timebox/round-cap trip, max-renewal cap (live lease only, §4), unresolved veto, parent-cancelled escalation; always carries `machine_reason`; never callable by any principal |
| **A2** creation → `needs_review` (`breakglass_review_ticket`) | **auth → Board** (ratified D-5b; `svc:auth` principal, kind-gated create) | the ONLY non-`todo` birth; human-only to clear. (Wazuh quarantine tickets are NOT a second non-todo birth — they are born `todo` with `quarantine=true`, §10.1) |

**The spike-tested boundary, stated as code:** the agent-callable transition enum is exactly `{awaiting_approval, needs_review, blocked}` from `in_progress`, plus the claim itself and voluntary release (`board.release`). `approved, executing, verifying, done, failed, cancelled` are **not values in the agent tool's enum** (structurally unexpressable, not just rejected) — and the service layer independently hard-rejects and logs any attempt as a violation row. Both layers must hold: the schema is the spike surface, the service check is the SoD guarantee.

### 6a. Two narrow spec amendments this plan proposes (Board owns TICKET_STATE_MACHINE.md; applied at Stage-2 exit with the freeze, operator-visible)

- **A-VR (`voluntary_release`):** add `in_progress → todo | agent (claim holder, fence-checked) | voluntary release; lock released, generation++`. This is **reconciliation, not new policy** — the FROZEN `board-agents-claim.md` §4 already grants it ("+ voluntary release back to `todo`") while the spec's table omits it; the spec's "No other transitions exist" guard is currently false against its own frozen contract.
- **A-RR (`restore_reproposal`):** add `approved → awaiting_approval | Board (automatic), restore reconciliation only | restore-revoked approval re-queued for grant; never available outside the §16 restore procedure`. Without it, §16's "approvals never survive a restore" wedges restored `approved` tickets terminally (the only spec-legal exit is operator cancel, destroying lineage). Narrow, fires only during restore, opens no agent/policy path toward execution. Interim rule until ratified: operator cancel + re-file.

---

## 7. The facts read surface (PIP for auth's PDP + ticket-exists for Drive + fence reads for Notes + D-4 for Vault + console reads for MC)

One small, fast, read-only HTTP surface (in-process SQLite PK reads; target p99 < 50 ms — auth's live-check budget is ~250 ms end-to-end). Auth: `aud=board`, scope `board:read`; consumers are service principals (auth's PDP process identity, `svc:drive`, `svc:notes`, **`svc:vault`**, `svc:gateway`, `svc:mc`).

- `GET /facts/ticket/{ticket_id}` → `{exists, status, proposer_id, claimed_by, host_id, team, lane, taint_host_originated, approval_id?, approval_status?, fencing_token, lease_expires_at, version, updated_at}`. **Live facts, never request-supplied** — auth's PDP reads proposer and state here at decision time; Drive's ticket-exists check is the `exists` bit; Notes' uncached fence validation reads `fencing_token` here (ticket-keyed — consumers never construct resource IDs).
- `GET /facts/approval/{approval_id}` → `{status, ticket_id, host_id, plan_hash, plan_note_id, plan_note_rev, action_class, approver_kind, approver_sub, granted_at, consumed_at?, consumed_by?, run_id?}` — **"validated live" posture** (IDENTIFIERS). **Vault's ratified D-4 predicate, stated by the producer:** because the Gateway consumes *before* redeeming (state machine §6), at redemption time the supported check is `status='consumed' ∧ consumed_by == <the redeeming Gateway's sub> ∧ consumed_at within the redemption window` (`granted` would always fail closed). The response carries every field that predicate needs. Frozen in `board-consumers-facts-read.md` at exit.
- `GET /facts/host-lock/{host_id}` → current `lock_generation`, holder ticket/agent, `hold_kind`, lease expiry (Gateway host-keyed reads).
- **MC console reads** (same surface, `svc:mc`): since-cursor paginated lists — `GET /facts/escalations?since=`, `/facts/violations?since=`, `/facts/lineage/{ticket_id}`, `/facts/holds`, `/facts/wip` — plus the SSE stream (§15). Frozen in `board-mc-console.md` at exit (the ledger assigns this freeze to Board Stage-2; MC runs degraded until then).

All facts endpoints are side-effect-free, cache-forbidden (`Cache-Control: no-store`) — staleness here would silently weaken four consumers' SoD checks.

---

## 8. The approval lifecycle (§6 register item 2 — the producer half of the Board→Gateway seam #9)

### 8.1 Proposal
Agent completes a plan for a destructive/irreversible type → files the plan slice as a Notes revision, links it (`link_note`), and transitions `in_progress → awaiting_approval`. The Board records `proposer_id`, pins `(plan_note_id, plan_note_rev)`, and **validates** that the plan slice contains a parseable structured playbook-invocation list (a fenced, machine-readable section the planning-note template mandates — a joint-contract item with Notes, §19). Missing/unparseable → the transition is rejected (a plan that cannot be allowlisted cannot be approved). This parse is a **gate only** — the allowlist rows are re-extracted at grant (§2.5). The host lock is released at this transition (§6) — approval waits must not starve the host.

**Re-pin on plan edit:** if the pinned revision stops being the latest linked plan while `awaiting_approval` (agent revised after AR feedback, operator asked for changes), the **recorded `proposer_id` (sub-bound — the lease is gone, so identity, not fence, authorizes)** may re-link a newer revision: atomically re-pins `(plan_note_id, plan_note_rev)`, voids any in-flight grant evaluation, re-records `proposer_id`. No state transition needed; the operator cancel path remains for abandonment.

### 8.2 Grant (`awaiting_approval → approved`)
**Before the write transaction** (no network I/O under the writer lock, §1): the Board fetches the pinned note revision bytes from Notes, computes **`plan_hash` = `sha256:` over those exact bytes**, extracts the playbook-invocation list from those same bytes, resolves each `playbook_key` → CMDB catalog policy attributes, queries Notes' effective taint, and (for tier grants) obtains the CMDB verdict. **Inside one write transaction** it then:
1. Re-verifies the pin: `(plan_note_id, plan_note_rev)` unchanged and still the latest linked plan — a plan edited after the pre-fetch aborts the grant (re-propose per §8.1).
2. Enforces **four-eyes**: `approver_sub != proposer_id` and `!= claimed_by` (independent of the PDP).
3. **Derives the approval's `action_class` from the allowlist itself** — every `playbook_key` maps to its CMDB catalog class binding; the worst class across invocations governs. This is the Board's half of the contract-mandated floor (`cmdb-gateway-policy.md` §4: class comes from the playbook, **never from the agent**; destructive classes are structurally non-auto at the Board independently of CMDB). Ticket `type` is advisory only — a steered agent typing a destructive plan as `package_update` changes nothing.
4. Enforces the **auto-approve floor** (`approver_kind=tier_policy` refused; operator required) if ANY of: derived `action_class` ∈ destructive/irreversible; derived class inconsistent with `registry(type)`; input provenance tainted (§9); no fresh signed CMDB verdict with `approval_mode=auto`, in-window (`cmdb_decision_id` stored, and the CMDB decision query carries the **derived** class, never `type`).
5. Inserts the `approvals` row + immutable `approval_allowlist` rows (re-extracted from the hashed bytes, §2.5); CAS ticket → `approved`; audit + SSE.

The approval is bound to exact **`(host_id, plan_hash)`** — a different host or a changed plan byte is a different approval.

### 8.3 `consume_approval` (single-use; Gateway-only) — `POST /api/approvals/{approval_id}/consume`
Request: `{ticket_id, host_id, op_id}` from `svc:gateway` (scope `board:execute`, kind-gated — no other principal kind may hold it). In one transaction:
1. **Acquire the execution hold**: `UPDATE host_locks SET claimed_by_ticket=:ticket, claimed_by_agent=:gateway_sub, hold_kind='execution', lock_generation=lock_generation+1 WHERE resource_id=:host AND claimed_by_ticket IS NULL RETURNING lock_generation`. Zero rows (a live claim holds the host) → **whole transaction rolls back, approval stays `granted`**, business error `HOST_LOCKED` — the Gateway retries later; a consume that cannot lock the host burns nothing.
2. `UPDATE approvals SET status='consumed', consumed_at=now(), consumed_by=:sub WHERE id=:id AND status='granted'` — zero rows → distinguish: already `consumed` → terminal error `approval_consumed` (the state machine's "second consume denies terminal"); `revoked`/`expired` → `approval_revoked`.
3. Binding checks (any failure rolls back everything): request `host_id == approvals.host_id`; `ticket_id == approvals.ticket_id`; ticket `status == 'approved'`; kill level < G1 (§11).
4. CAS ticket `approved → executing`.
5. Response: `{approval_id, ticket_id, host_id, plan_hash, plan_note_id, plan_note_rev, action_class, allowlist: [{seq, playbook_key, params_hash}], fencing_token: <the FRESH generation minted in step 1>}` — everything the Gateway needs to re-hash the plan, validate every step against the allowlist, and present a **lease-bound, unique** fencing token to its own mutex (two consumes on one host can never carry equal tokens; the one-claim-one-host invariant holds across the destructive window because the execution hold IS the host lock).

The execution hold is **never reaper-eligible**; it is released (generation++) by the Gateway's run-outcome transition (`executing → verifying/needs_review/failed`, which carries `run_id`). If the Gateway dies mid-run and never reports, the hold persists deliberately (the host may have been touched — silently freeing it would be the unsafe direction); a watchdog escalation (Chat + MC) fires after the playbook-estimate window ×2, and resolution runs through the Gateway's orphaned-run reconciliation (its Stage-2 register item, gap 2.3).

### 8.4 Revocation and expiry
Operator `approved → cancelled` sets the approval `revoked` atomically. Kill level ≥ G1 suspends consumption (deny, do not revoke — resumes at G0). Approvals optionally carry `expires_at` (operator knob, default: none — CMDB's window verdict at execute time is the freshness authority; an expiry here would duplicate policy).

---

## 9. Provenance taint + lane eligibility (ARCHITECTURE §12; register item; seam #29)

- **Mechanical tagging at creation (raise-only; nothing ever clears taint):**
  1. `origin_kind=event_webhook` → tainted (alert text is host-originated adversarial input — frozen contract §1);
  2. parent tainted → child tainted (inheritance);
  3. **creating agent belongs to the Library curation team** (`team` label of the creator's roster/standing epic) → tainted (`taint_sources += library_curation_origin`) — this is the register's "Library curation-agent taint," made mechanical rather than asserted: curation agents process external web content, so their tickets never reach the auto-approve lane. Ordinary agent creations (e.g. backlog decomposition of an untainted ceremony) are NOT blanket-tainted — that would delete the auto lane entirely; they rely on rules 1–2 and the grant-time OR below;
  4. task-type registry may mark types as externally-sourced-inputs → tainted (CMDB-owned attribute, consumed verbatim).
- **Transitive taint over plan inputs:** at grant time (§8.2 step 4) the Board queries **Notes' `effective` taint** for the pinned plan note (Notes computes transitive taint over its link graph — Notes PLAN; the Board consumes, never recomputes). Whether Library-tier provenance propagates into Notes' `effective` flag for cited `doc_id`s is an explicit line item of the joint `board-notes-ceremony.md` freeze (§19). Ticket taint ∨ plan-note effective taint = the approval's input provenance.
- **Lane-eligibility rule:** `eligible_for_auto_approve(ticket) = NOT (ticket.taint ∨ plan_effective_taint) ∧ derived_action_class ∉ {destructive, irreversible} ∧ CMDB verdict approval_mode=auto` (the class term is §8.2's — derived from allowlist playbooks, never from `type`, never from the agent). A steered curation agent can never reach policy-approved execution with zero human review: its tickets are tainted at creation by rule 3.
- Taint and lane are PIP facts (§7) so auth's PDP and MC can render/verify the same computation.

---

## 10. Kickoffs, standing tickets, and the Wazuh seam (#19 — FROZEN contract, producer side)

### 10.1 Three kickoffs, one spawn function
- **Human:** authenticated create (UI or MCP `board.create`).
- **Scheduled:** node-cron (`noOverlap`) fires → calls the same internal spawn function with `spawn_key = {standing_id}:{period}`; UNIQUE `spawn_key` makes re-fires no-ops; `suppress_while_open` (find-or-skip while a prior cycle's child is open) is a per-trigger flag, default true.
- **Event (Wazuh):** `POST /hooks/wazuh` — duties in contract order: (1) **HMAC over the RAW body first** (static shared secret, ratified D-9; secret in `BOARD_WAZUH_HMAC_SECRET`, never logged); (2) `spawn_key = sha256(agent.id + cve.id + status)` (internal, never transmitted); (3) idempotent insert under UNIQUE `spawn_key`.
  **Host-identity rule (binding):** ticket creation resolves `host_id` via **CMDB's operator-confirmed `agent.id → host_id` mapping** — never the raw alert field. Unmapped/needs-tiering agent → the alert lands as a **quarantine ticket: born `todo` with `quarantine=true`** (structurally unclaimable — excluded from every claim query; NOT a second non-todo birth, which the spec reserves for A2), no `host_id`, never execution-eligible, surfaced in the UI escalation queue with machine reason `unmapped_wazuh_agent`. Resolution is operator-only: confirm the CMDB mapping → the Board re-resolves `host_id` and clears the flag (audited), or cancel. All alert-derived fields tagged host-originated (§9).

### 10.2 Verification evidence (the `verifying` window)
The connector (at the Gateway) polls for **document disappearance** from `wazuh-states-vulnerabilities-*` and submits evidence to `POST /api/tickets/{id}/verification` (`svc:gateway`, `board:execute`): `{result: confirmed|refuted|timeout, evidence: {query, absence_result, timestamps, run_id}}`. The Board **automatically** flips `verifying → done` on confirmation, `verifying → failed` on refutation/timeout, attaching the evidence (state machine §6; contract §3 — never polling for a "Solved" status, which does not persist).

### 10.3 Standing tickets
`kind=standing` rows carry the child template + trigger spec (§2.8). The "maintain & improve" mandate and each **team**'s mandate are standing epics; a **steward persona** owns triage/decomposition of its standing epic (ARCHITECTURE §6 Teams). Children spawn with `parent_id`, inherited `team`, inherited lane floor, server-derived `lineage_depth` per §2.1.

---

## 11. Guardrails: WIP caps, lineage caps, kill epoch

- **WIP caps** (per-agent, global, per-team) enforced **inside the claim transaction** (§3). **MC write surface (register item):** `PUT /api/policy/wip` — operator sessions and `svc:mc` only, scope `board:admin` (new ask, §13; action class **sod-critical** — policy-plane write per ARCH §12). Every change audited; caps render on the kanban column headers.
- **Lineage/spawn-depth caps (ratified D-11 — Board owns; auth keeps token/identity budgets only):** `lineage_depth` is **server-derived** (§2.1 — an agent omitting `parent_id` cannot mint depth-0 tickets; depth defaults through the creator's active claim). The **claim predicate refuses depth > cap** (`LINEAGE_CAP` business error). Spawn itself is not blocked (visibility beats suppression — MC auto-triages runaway chains from Board lineage reads), but unclaimable work is inert. Cap default 3, operator knob.
- **Kill epoch (killswitch-chain.md, Board as RS):** Board subscribes to `auth:revocations` + JWKS channels, tracks `last_epoch` + level in `auth_state`. **G1 (freeze-destructive):** approval minting suspended (operator-UI warning + `svc:tier-approver` halt), `consume_approval` denies, agent-causable benign transitions continue. **G2 (quiesce-all):** additionally no new claims (`QUIESCED` business error); heartbeats still accepted so leases don't mass-expire into the outage gate, and lease lapses inside the drain window bypass the population gate (§4) — a kill is a present signal, not an outage; the two wires stay separate end-to-end. Past the revocation-staleness bound, destructive paths (grant/consume) fail closed (auth contract §1).

---

## 12. MCP agent surface — **PROVISIONAL until gap-1.3 spike PASS (D-17)**

**Schema ceiling (inherited by every tool):** flat argument objects only — no nested objects, no arrays of objects; ≤6 parameters per tool; enum-biased (`to_status`, `to_phase`, `kind` are closed enums); `additionalProperties: false`; every mutating tool takes caller-minted `op_id`; business outcomes are `isError:true` structured content, never JSON-RPC errors. On spike PASS: re-validate each schema against the spike's measured complexity budget, then freeze. On FAIL: remediation order is flatten/split further → move fencing/terminal-legality into deterministic runtime wrappers → stronger executor model (MERGE_REVIEW_1 §7).

| Tool | Args (all flat) | Scope | Action class |
|---|---|---|---|
| `board.claim_next` | `role?, team?, type?, op_id` | `board:claim` | sod-critical (mints lease+fence) |
| `board.claim` | `ticket_id, op_id` | `board:claim` | sod-critical |
| `board.release` | `ticket_id, fencing_token, reason, op_id` | `board:claim` | write-benign |
| `board.heartbeat` | `ticket_id, fencing_token, progress_note?, op_id` | `board:claim` | write-benign |
| `board.transition` | `ticket_id, to_status ∈ {awaiting_approval, needs_review, blocked}, fencing_token, reason, op_id` | `board:update` | **propose** (`awaiting_approval` entry records proposer) |
| `board.create` | `title, type, body, host_id?, parent_id?, team?, op_id` | `board:propose` | propose |
| `board.update` | `ticket_id, field ∈ {priority, severity, body_section}, value, fencing_token?, expected_version, op_id` | `board:update` | write-benign (`fencing_token` required when the ticket is claimed — §5 echo rule) |
| `board.get` | `ticket_id` | `board:read` | read |
| `board.query` | `status?, team?, host_id?, parent_id?, phase?, limit?, cursor?` | `board:read` | read (paginated, `outputSchema`'d — never a context dump) |
| `board.add_dependency` | `ticket_id, depends_on_id, op_id` | `board:update` | write-benign (cycle-checked) |
| `board.link_note` | `ticket_id, note_id, fencing_token, op_id` | `board:update` | write-benign |
| `board.ceremony_transition` | `ticket_id, to_phase ∈ {triage, recon, planning, adversarial_review, backlog, execute, retro}, fencing_token, op_id` | `board:run-ceremony` | propose (guards decide; §14) |
| `board.ceremony_statement` | `ticket_id, kind ∈ {position, dissent, veto, veto_clear, decision}, note_id, note_rev, op_id` | `board:run-ceremony` | propose (**roster-sub-bound, not fence-bound** — §14.2) |

**Structurally absent from the agent surface:** approval grant, `consume_approval`, any transition into/out of `approved/executing/verifying/done/failed/cancelled`, WIP/lineage policy writes, standing-trigger management, quarantine clearing, the facts endpoints' service surface. Not "rejected" — **not registered** (the Vault four-tools pattern).

`board.create` and `board.update` sit at 7 args — the two accepted deviations, flagged for the spike; if its budget disallows them, `body`/`team` fold into follow-up updates and `update`'s fencing rule moves into a wrapper. `board.transition`'s enum deliberately excludes `todo` so voluntary release (which frees the lock and bumps the fence) is only expressible through `board.release`, whose semantics do exactly that.

**Action-class manifest** (auth contract §1 obligation): the fourth column above covers the MCP tools; the **HTTP surface is classified too** — approval grant: sod-critical; `consume_approval`: sod-critical (destructive-exec-adjacent; §13 ask #1 requests this classification explicitly — auth's suffix-default would be wrong here); verification evidence: write-benign; WIP/lineage/standing writes: sod-critical (policy-plane); facts reads: read; `/hooks/wazuh`: HMAC-authenticated ingress, not scope-bearing. Unclassified ⇒ live-check fail-closed. Budget middleware runs per tool call keyed by `sub`.

---

## 13. Auth scope slice — countersign + new asks

**Countersigned as offered** (`auth-apps-tokens-scopes.md` §3 board row): `board:read / claim / propose / update / approve / run-ceremony`, mapped per §12. The countersign decision the ledger reserved — `ceremony_transition` granularity — is resolved as **one polymorphic tool + server-side role/guard enforcement** (per-phase tool splits would multiply the spike surface; the schema ceiling favors one flat enum tool; authority is enforced by guards + token identity server-side, which the PDP can't do from tool names anyway).

`board:approve` is held by operator sessions and `svc:tier-approver` only; it maps to the **HTTP approval API** (grant/reject), which is not an MCP tool.

**New asks for auth's next session (recorded here; Board runs kind-gate-degraded until granted):**
1. **`board:execute`** (new scope): `consume_approval`, run-outcome transitions (`executing → …`), verification-evidence submission. Holder: `svc:gateway` ONLY (kind-gated like `vault:read-credential`). **Requested action class: sod-critical/destructive-exec-adjacent — explicitly NOT the suffix-classifier default** (consume is the single-use transition into the execution window).
2. **`board:admin`** (new scope, action class sod-critical/policy-plane): WIP-cap writes, standing-trigger management, reaper-hold clear, quarantine clearing, lineage-policy writes. Holders: operator sessions + `svc:mc` (caps only).
3. **`svc:auth` create path for A2**: auth's break-glass auto-filing needs a principal with a kind-gated create (`breakglass_review_ticket` birth). Shape at auth's discretion; the Board endpoint is ready.
4. **`svc:board`** (new service principal — the Board as a *client*): `notes:read` on `aud=notes` (fetch pinned plan revision bytes; read effective taint — the SoD-critical grant path §8.2 cannot function without it) and `chat:post` on `aud=chat` (escalation notifications §4/§10; Chat's countersign currently grants `chat:post` to agents+operator only, so a kind=service grant is an auth-side change, not a Chat-side one).
5. **`svc:vault` `board:read`** (facts surface): Vault's ratified D-4 redeem-time approval verification (§7) needs it; also confirm **`svc:gateway`** holds `board:read` for host-lock/ticket facts alongside `board:execute`.
6. ~~`svc:drive` + `svc:notes` `board:read`~~ — **DONE**: registered in auth's 2026-07-02 countersign session (`auth-apps-tokens-scopes.md` §9, branch `countersign/auth-scope-registration-1`, pending operator merge). §7 serves them as designed.
7. **`team` label** in the auth schema — **DONE** in the same session (R7 closed).

**Load-bearing carry-forward from that session:** `svc:tier-approver` is *registered* but **non-activatable** — auth's built `HOLDER_ALLOWED_KINDS[board:approve] = {human, agent}` does not admit `kind=service` until a compiled-constant change at auth Stage-5. The Board therefore ships the tier-approver process **behind a disabled-by-default flag** (`BOARD_TIER_APPROVER_ENABLED`); until auth's kind-table change lands, ALL approvals are operator-granted (a safe degradation — the human gate simply stays universal). §8.2's `tier_policy` path is designed now, activated then.

---

## 14. The ceremony layer (ratified D-1 + D-2, encoded)

### 14.1 D-2 — deterministic three-lane triage (never an LLM score, never agent-supplied inputs)
Triage runs at the **epic level**. The SM agent only **nominates the epic/scope for triage** (`ceremony_transition` to `triage`); **the Board fetches every signal itself from its named authority at triage time** — agent-supplied values are never inputs to the lane computation (a stored citation is not verification; a steered SM must not be able to launder asserted signals into the deterministic table):

| # | Signal | Fetched by the Board from |
|---|---|---|
| S1 | Derived reversibility | CMDB task-type registry (`reversible` + rollback-path attrs) — live read |
| S2 | Blast radius | Board-computed from its own ticket/children scope data |
| S3 | Host criticality tier | CMDB policy read (worst tier across scope) — live read |
| S4 | Catalog novelty | CMDB playbook policy attrs (known-good, unmodified, not drift-invalidated) — live read |
| S5 | External verifier present | CMDB task-type registry verifier binding — live read |

**Table (fixed, exhaustive, evaluated in this order):**
1. Any signal missing/stale/**unfetchable by the Board itself**, OR triage timeout → **full**.
2. S2 > 1 host, OR any host at critical tier → **full**.
3. S1 reversible ∧ S4 known-runbook ∧ S3 low-tier ∧ S5 verifier present (**all four, hard**) → **straight-to-execute**.
4. Exactly one mixed signal among {S1, S3, S4} (S5 absence never counts against; S5 presence never offsets irreversibility or tier) → **lightweight** (PO scope check + one AR challenge, 1 round cap).
5. Otherwise → **full**.

Children **inherit the parent's lane as a floor** (never re-triaged downward). Lane governs **planning rigor only** — the `awaiting_approval` gate fires on `(registry=destructive) ∨ (CMDB=ask)` at the per-server execution ticket, fully decoupled from triage; CMDB verdict, Vault brokering, the approval floor (§8.2), and the host mutex fire regardless of lane. The triage decision + Board-fetched signals + lane land as a `ceremony_events` `triage_decision` row and on the ticket.

### 14.2 D-1 — DACI convergence (encoded as guards + the server-side watchdog)
- **Huddle open** (phase → `planning`): the Board emits a `huddle_opened` event carrying the server-set `round_cap` (default 3 — PROVISIONAL pending gap-1.2), `timebox_deadline` (server clock; starting default 30 min wall-clock, PROVISIONAL), and the roster (2–4 role agents, `sub` per role). The SM agent may *request* transitions; **it never holds the clock**. Because the parameters live in the event log, a projection rebuild can never disarm the watchdog.
- **Backlog decomposition stamps `child_class='execution'`** on the per-server tickets it mints (the only path that does) — recon sub-tickets are `child_class='recon'` and claimable from phase ≥ `recon` (§3; the spec's hard gate covers *execution* children only — gating recon children would deadlock every ceremony against its own evidence-gathering).
- **Round counting is server-derived and agent-untouchable:** a round boundary occurs when every roster member has filed ≥1 statement since the last boundary; the service stamps `round` on each `ceremony_events` row itself and rejects any caller-supplied round. Holding the counter at 1 by never completing a cycle doesn't evade the cap — the timebox is the second, independent guard.
- **Independent drafts (anti-anchoring):** `ceremony_statement(kind=position)` from every roster member is required before any cross-talk statement is accepted (Board rejects out-of-order statements mechanically). Note-visibility enforcement during drafting is Notes-side — joint-contract item (§19).
- **Statement authorization is roster-sub-bound, not fence-bound** (deliberate — recorded rationale): most roster members (PO, AR, specialists) hold no lease on the planning ticket, so fencing cannot authorize them; statements are authorized by `sub ∈ roster[role]` + phase guards. If the planning ticket is re-claimed by a different sub for a role (reap + re-claim), the service **re-binds the roster row** (audited); statements from the ousted sub are rejected thereafter. This is why `ceremony_statement` carries no `fencing_token` (§12) and is excluded from §5's echo list.
- **AR mechanically-forced grounded dissent:** `adversarial_review → backlog` is guarded by ≥1 `dissent` statement from the AR **whose `note_id` cites a recon note of this ceremony** (the Board verifies the cited note is link-attached to a recon child ticket). Zero grounded dissents → huddle **invalid** → A1 escalation. Fast consensus is structurally suspicious, not celebrated.
- **PO Recommender-of-record:** `decision` statement (goal, metric, overruled dissents, rationale — recorded in the planning note, referenced by `note_rev`) is required before `backlog`. The PO's decision is provisional — it flows *into* the approval chain, never around it.
- **AR scoped veto:** `veto` blocks `→ backlog`; cleared only by the **same AR sub** (`veto_clear`) or an operator — never by the PO it checks. Unresolved veto at timebox → A1.
- **Watchdog (the D-1 server-side enforcement):** the 10s sweep fires A1 `board_escalation` (with machine reason) on: `timebox_deadline` passed without a decision; round counter > `round_cap`; unresolved veto at deadline; AR filed no grounded dissent by deadline; huddle invalidation. The trip is deterministic and fires **regardless of any agent's activity**.
- **Huddle ↔ lifecycle coupling (the mid-huddle failure paths):** A1 fires only from `in_progress`, so the plan states what happens when the planning ticket leaves it mid-huddle: on **reap or `blocked`**, the service emits a `pause` ceremony event — the timebox clock suspends (`paused_at`; deadline extends by the pause duration on `resume`), the watchdog no-ops while paused, and re-claim resumes the huddle with the recorded roster/round (roster re-bound to the new holder's sub for that role). On **operator cancellation of the ceremony parent** pre-`backlog`: `todo`/`blocked` children are cascade-cancelled in the same operator act; `in_progress` children escalate via A1 (machine reason `parent_cancelled`) — children can never strand behind a parent whose phase will never reach `backlog`.
- **The huddle is never the last signature:** `backlog` decomposes into per-server execution tickets carrying their plan slice + transcript link; each independently hits the CMDB tier gate, `awaiting_approval` where the OR-rule fires, the approval record with its derived-class floor, and the Gateway.
- **Convergence is signaled by the Board API call** (`ceremony_transition`) — Notes frontmatter is the never-read-back display copy (CF-D).

---

## 15. Human surface (UI) — input to Stage 3

Kanban over the lifecycle columns (`todo / in_progress / awaiting_approval / approved+executing / verifying / needs_review / done`) with a `blocked` swimlane and terminal archive; ceremony ribbon per planning ticket (phase, round, timebox countdown incl. pause state, veto state); cards show claim holder, heartbeat freshness, host lock + generation + hold kind, priority, epic parentage, taint badge, lane. **Approval queue**: plan-slice note render, the exact allowlist table with the derived action class, proposer/approver identities, four-eyes state, CMDB verdict; approve/reject with step-up confirmation. **Management console**: WIP caps (edit), standing triggers, lineage view (spawn-depth chains), escalation queue (A1 reasons, quarantined Wazuh alerts with the operator resolve/cancel actions, reaper holds), violation log, audit browser. Live updates via **one SSE stream** (poll fallback) fed by the same event log as the MCP surface. All operator mutations ride the same service layer + audit path as everything else.

---

## 16. Backup + restore (CANONICAL store; Stage-7 drill is an exit criterion)

- **Mechanism:** in-process hot snapshot via SQLite Backup API (`VACUUM INTO` a timestamped file on `board_data/backups/`), hourly, retention 48; a daily off-box copy to an operator-designated target (`BOARD_BACKUP_TARGET` — off-suite path/rsync destination; deliberately NOT Drive: Drive depends on Board facts, and a mutual-dependency restore is exactly the consistency trap ARCHITECTURE §10 warns about). WAL checkpoint before snapshot. Cadence/retention are operator knobs; existence is not.
- **Restore-consistency rule (stated, per ARCHITECTURE §10):** a restored Board is *older than the world*. On restore, before serving traffic: (1) every `granted` (unconsumed) approval is auto-`revoked` and its ticket CASed `approved → awaiting_approval` (amendment A-RR, §6a — re-queued for grant without destroying lineage; until A-RR is ratified, operator cancel + re-file is the interim rule); (2) all claim leases force-expired and **every `lock_generation` floored to `max(restored_value, unix_epoch_milliseconds_at_restore)`** — a time-seeded floor a lost window can never have out-minted (generation churn is orders of magnitude slower than 1/ms; a fixed offset like +1000 provably can be out-run by claim/release loops inside the daily off-box window, so it is retained only as defense-in-depth on top of the time floor). The Stage-7 restore drill additionally reconciles against the Gateway's recorded per-host high-water marks; (3) in-flight huddles → A1 escalation; (4) a restore marker lands in the audit log and MC is notified. `executing/verifying` tickets restore as-is and reconcile against Gateway/connector reports (their next report carries `run_id` + evidence; mismatches escalate).
- Rebuildables (`ceremony_phase` + `huddles` projections — both now fully derivable from `ceremony_events` incl. `huddle_opened` params, FTS if added, SSE cursors) are regenerated, never restored.

---

## 17. Deployment conformance (DEPLOYMENT.md — Stage-4 exit will verify against the spec, not this restatement)

Service `board`, port 8080, `edge` network only, no host ports, volume `board_data`, env prefix `BOARD_*` (`BOARD_DB_PATH`, `BOARD_WAZUH_HMAC_SECRET`, `BOARD_BACKUP_TARGET`, `BOARD_FLEET_SIZE`, `BOARD_OUTAGE_GATE_MIN_AGENTS`, `BOARD_TIER_APPROVER_ENABLED`, lease/WIP/lineage policy defaults), auth at `auth:8089`, subdomain `board.<SUITE_DOMAIN>` == audience `board` == service name. **CORS:** the API allowlists origin `https://mc.<SUITE_DOMAIN>` for the browser-direct operator console reads/writes MC's confused-deputy design requires (frozen in `board-mc-console.md`). No sidecars requested (backup is in-process; if the operator later prefers Litestream, that is a D-10 amendment at that time).

---

## 18. Sequencing (Stage-4 build order, API-first)

1. Store + migrations + state-machine core (transition table incl. A-VR/A-RR, guards, audit log, op_id idempotency).
2. Claim engine + host locks (single lease authority) + fencing + lease/heartbeat/reaper (incl. holder-guarded release, outage gate, sweep precedence).
3. Facts endpoints (§7) — unblocks auth PDP live facts, Drive degraded-mode exit, Notes fencing reads, Vault D-4, MC console.
4. Approval lifecycle + derived action class + `consume_approval` execution hold + four-eyes + lane eligibility (§8/§9).
5. Kickoffs: create path, node-cron, Wazuh webhook + quarantine flow + verification-evidence endpoint (§10).
6. Ceremony engine: `ceremony_events` (incl. `huddle_opened`), Board-fetched triage, huddle guards, pause/resume coupling, watchdog, A1/A2 (§14).
7. `svc:tier-approver` internal process (flag-gated, §13) + kill-epoch subscription (§11).
8. MCP surface (§12) — **schemas frozen only post-spike**.
9. UI (§15) after Stage-3 spec.

---

## 19. Seam ledger — everything another app consumes from this plan

| Consumer | What the Board produces | Where | Status |
|---|---|---|---|
| agent-runtime + all agents | claim/lease/fence/heartbeat/transition protocol | §3–§6, §12 | FROZEN contract implemented exactly (`board-agents-claim.md`) |
| Gateway | **approval record, allowlist, derived `action_class`, `consume_approval` + execution-hold fencing token, `plan_hash`**, run-outcome + verification-evidence endpoints | §5, §8, §10.2 | producer half of seam #9/#10 designed — Gateway Stage-2 binds to §8.3's response shape (the returned token is the fresh execution-hold generation) |
| auth (PDP) | PIP live facts (proposer, state, approval status, fence presence) | §7 | designed; freeze as `board-consumers-facts-read.md` at exit |
| Vault (D-4) | `GET /facts/approval/{id}` with `consumed_by`/`consumed_at`/`run_id` + the stated redeem-time predicate (`status='consumed' ∧ consumed_by=<gateway sub> ∧ fresh`) | §7 | designed — needs auth ask #5 (`svc:vault` read); same facts contract |
| Drive | ticket-exists read (`svc:drive`, degraded-mode exit) | §7 | ready — same facts contract |
| Notes | fence reads (ticket-keyed); ceremony convergence via Board API; ticket-provenance read; huddle roster/phase for draft isolation. **Board-as-consumer items for the joint freeze:** GET revision bytes by `(note_id, rev)`; GET effective-taint (incl. whether Library-tier provenance of cited `doc_id`s propagates); the planning-note template's fenced machine-readable playbook-invocation section; check-then-commit disposition (Board guarantees monotonic generations; Notes validates uncached — residual TOCTOU accepted for append-biased writes) | §5, §7, §8, §9, §14 | **joint freeze at Notes+Board: `board-notes-ceremony.md`** — both directions now enumerated; needs auth ask #4 (`svc:board` notes:read) |
| Wazuh connector | webhook receiver, dedup, quarantine flow, verification-evidence endpoint, automatic `verifying` transitions | §10 | FROZEN contract implemented exactly (`board-wazuh-connector-kickoff.md`) |
| MC | since-cursor console reads (escalations, violations, lineage, holds, wip), SSE event feed, WIP-cap write surface, CORS allowlist for the `mc` origin | §7, §11, §15, §17 | **freeze as `board-mc-console.md` at exit** (ledger assigns this to Board Stage-2; MC degraded until then); cap-write scope pending auth ask #2 |
| Chat | escalation notifications (Board posts on A1 trips, quarantines, fleet anomaly) | §4, §10.1 | needs auth ask #4 (`svc:board` chat:post — a kind=service grant is an auth change, not a Chat change) |
| CMDB | Board consumes: task-type registry (incl. externally-sourced-inputs attr §9), tier/verdict reads, **playbook→class catalog bindings (the §8.2 derived-class floor)**, `agent.id → host_id` mapping — all through the frozen cmdb contracts; triage signals Board-fetched (§14.1) | §8, §9, §14.1 | consumer side; CMDB Stage-2 implements the registry rows |
| auth (A2) | break-glass review-ticket birth endpoint | §6, §13 ask #3 | ready when `svc:auth` is registered |

---

## 20. Adversarial review — residual risks accepted with reason

*(All confirmed findings are folded into the sections above — lock/fence continuity across the approval window, the derived-action-class floor, reaper holder-guarding + single lease authority, ceremony-gate scoping, quarantine birth, voluntary-release row + spec amendments, schema fencing params, population-gate denominator/floor/drain-awareness, huddle lifecycle coupling, server-derived rounds and lineage, restore floor, op_id atomicity, grant-transaction I/O hoisting, Board-as-client identity, MC contract scheduling. What remains is accepted, with reason:)*

1. **The Board is a single point of coordination failure.** Accepted: by design (one coordinator beats negotiated coordination); mitigations are the canonical-store backup (§16), SQLite crash-safety under WAL, and the fact that Board downtime halts *new* destructive throughput fail-closed (no approvals minted, no consumes served) rather than failing open.
2. **Plan-hash binds bytes, not meaning.** A semantically-malicious plan with clean bytes hashes cleanly. Accepted: meaning is guarded by the ceremony (AR dissent), the approver's read of the rendered plan + allowlist + derived class, and the Gateway's playbook-only execution against the allowlist — the hash's job is only *what was approved is exactly what runs*.
3. **Notes-fetch dependency at grant time.** Notes down ⇒ approvals cannot be granted (fetch is hoisted outside the write transaction, so the write plane never stalls — §8.2). Accepted: fail-closed is the correct direction for the SoD-critical path; benign work continues.
4. **Taint computation trusts Notes' `effective` flag** for transitive plan-input taint. Accepted with mitigation: ticket-level taint (webhook, curation-team, inheritance, registry attribute) is Board-local and raise-only; the Notes flag can only *add* taint, so a Notes bug under-taints only content that never touched a tainted lineage — and webhook-born and curation-team work stays ineligible regardless. Library-tier propagation through Notes is a named joint-contract line item, not an assumption.
5. **Reaper population gate has no ratified threshold yet (D-12).** The mechanism (fleet denominator, min-population floor, drain bypass) is fully specified; the trip percentage ships as config with a conservative interim default (40%) marked PENDING — the number is the operator's post-gap-1.2 call. The fleet-size denominator requires `BOARD_FLEET_SIZE` to be kept truthful by the operator; a stale value skews the gate, surfaced on the MC console.
6. **Ceremony statements are roster-sub-bound, not fence-bound** (§14.2). Accepted deliberately: non-holder roster members have no lease, so fencing cannot authorize them; the attack that matters (impersonating the AR, filing after replacement) is blocked by sub-binding + roster re-bind. A compromised roster agent can still file bad content in its own role — that is what the AR, the PO record, and the human gate exist for.
7. **Execution holds persist if the Gateway dies mid-run** (§8.3). Accepted: silently freeing a host that may have been touched is the unsafe direction; the escalation + Gateway orphaned-run reconciliation (its register item) is the recovery path. Board-side liveness cost: that host accepts no new claims until reconciled — correct, not a bug.
8. **Role identity inside the ceremony** rests on the roster's `sub` bindings recorded at huddle open (no persona claim in tokens yet). Residual: a compromised roster agent acts only in its own role; flagged to auth/runtime sessions for a persona claim (hardening, not a blocker).
9. **SQLite single-writer throughput ceiling.** Accepted per D-14 for homelab scale; the claim recipe ports verbatim to Postgres `FOR UPDATE SKIP LOCKED` as the named graduation path; Stage 6 load-tests contention (including the reaper-only lease-expiry path's ≤1-sweep-interval requeue latency, which is the price of closing the steal race).
10. **Ceremony parameters are placeholders** until gap-1.2 (round caps, timebox, roster size, statement-visibility policy). Marked PROVISIONAL inline; the *guard structure* is final, the numbers are not.
11. **`spawn_key` hashes raw alert fields** (per the frozen contract — dedup may hash raw fields; identity never comes from them). Accepted: it is the contract's own design; the CMDB mapping rule closes the identity half.

---

## 21. Open decisions (operator knobs — none block the design)

1. Lease TTL / heartbeat cadence / reaper sweep / `wall_clock_cap` per ticket class — after gap-1.2 (starting defaults in §4).
2. D-12 population-gate threshold (+ confirm the min-population floor default of 4 and `BOARD_FLEET_SIZE` sourcing) — after gap-1.2.
3. `BOARD_BACKUP_TARGET` (off-box destination) + snapshot cadence/retention overrides.
4. WIP cap defaults (proposal: global 8, per-agent 1, per-team unset) and lineage `max_depth` (proposal: 3).
5. Ceremony timebox default + per-lane round caps (placeholders: 30 min / 3 rounds / lightweight 1 round).
6. Ratify the two §6a spec amendments (A-VR voluntary release — pure reconciliation with the frozen contract; A-RR restore re-proposal — else restore destroys ticket lineage on approved tickets).
7. Approval `expires_at`: default off (CMDB window is the freshness authority at execute time) — confirm.
8. Auto-approved (tier-policy) grants: silent, or a daily Chat digest? (Proposal: digest — cheap alert-fatigue insurance.)
9. Retention of terminal tickets: forever (proposal) vs archival window.
10. Quarantine-ticket resolution UX: operator resolves from the escalation queue (proposal) vs auto-resolve on CMDB mapping confirmation events.

---

## 22. Exit criteria status (PROCESS.md Stage 2)

- **Data model + both surfaces specified over one shared state:** ✅ §2 (model), §12 (MCP), §15 (UI), §7/§8/§10 (HTTP API) — all over the single service layer + SQLite store.
- **Adversarial concerns resolved or explicitly accepted with reason:** ✅ 40 findings from the 5-lens adversarial pass triaged; all confirmed defects folded into the design (see §20 preamble); residuals accepted with reason in §20.
- **Entry gate (D-17):** ⛔ **Stage-2 exit and MCP schema freeze are BLOCKED until the gap-1.3 spike PASSES.** On PASS: re-check §12 against the spike's validated complexity budget, freeze the schemas, freeze the three pending contracts (`board-consumers-facts-read.md`, `board-mc-console.md`, joint `board-notes-ceremony.md` with Notes), apply the §6a spec amendments (operator-ratified), and exit. On FAIL: apply the ratified remediation order to §12 before any freeze.
