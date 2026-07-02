# CONTRACT — Board → agent-runtime (and every agent client): claim / lease / fencing / transition protocol

> **Status: FROZEN** (MERGE-RESEARCH-1, 2026-07-02). Producer: **Board**. Consumers: **agent-runtime** (the client of every rule here) and any component that reads ticket state. Sources reconciled: Board RESEARCH §4/§8, agent-runtime RESEARCH §1/§2.5/§3.2/§8.A (seam C1/C3), `context/specs/TICKET_STATE_MACHINE.md`, `context/specs/IDENTIFIERS.md`. Exact field names and MCP tool schemas are Board Stage-2 output — **the semantics below bind them**; tool names are indicative.

## 1. The atomic claim

- Claim = ONE atomic Board-side operation (`board.claim_next` / `board.claim`): status-guarded CAS `todo → in_progress` **+** resource (host) lock **+** lease grant **+** Board-minted monotonic per-resource **fencing token** (`lock_generation` per IDENTIFIERS.md), all in one transaction. Dependency readiness, host-lock availability, and **WIP caps (per-agent and global) are enforced inside the claim** — a claim that would breach any of them fails atomically.
- Zero rows / lost race is a **business outcome, not a protocol error**: returned as `isError:true` structured content, e.g. `{code:"CLAIM_CONFLICT", current_owner, ticket_version}` — never a JSON-RPC error. The agent re-polls; it never treats the tool as broken.
- Delivery is **at-least-once**: after reaper requeue the same ticket may be re-claimed while a stale holder still runs. Every runtime step must be idempotent, keyed by `(ticket_id, fencing_token, op_id)`.

## 2. Lease, heartbeat, reaper

- The **Board owns the lease and the reaper**. On lease/heartbeat expiry the reaper atomically does `in_progress → todo`, releases the host lock, and **increments the fencing counter** (one statement).
- Lease renewal (`board.heartbeat`) is the authoritative liveness beat; the runtime **gates renewal on its work-progress predicate** so a wedged agent self-fences and releases the host lock. (MC telemetry is a separate, advisory channel — see `agent-runtime-mc-heartbeat.md`.)
- A hard **max-renewal / wall-clock cap** exists: a still-heartbeating but never-completing agent is force-escalated, not renewed forever. (The escalation transition is a state-machine amendment pending ratification — MERGE_REVIEW_1 D-5.)
- Numbers (lease TTL, heartbeat cadence, reaper sweep) are **policy, set at Board Stage-2 after the gap-1.2 sizing measurement** (rule: visibility > p99 step duration + buffer). Starting defaults recorded, not binding: heartbeat 60–90s, lease ~5 min, sweep ~30s.
- **Outage-aware reaper (gap 4.4, seam C3):** correlated fleet-wide heartbeat loss is an infrastructure event, not N agent deaths. The reaper adopts a population gate mirroring MC's suppression (if > threshold% of the fleet goes silent within one window: hold mass-requeue, raise one fleet-level anomaly). In exchange the runtime guarantees clean local quiesce with fencing-safe checkpointed progress and **ordered, jittered re-entry** with a fencing re-check per held ticket before resuming. Threshold is an operator risk call (MERGE_REVIEW_1 D-12).

## 3. Fencing enforcement (both sides)

- The Board mints the token; **every side-effecting call echoes it and the receiving server rejects stale tokens** — Board transitions, Notes writes on ticket-bound notes, escalations, and any Gateway-bound action. A token generated but never checked provides no safety.
- The **Gateway** records the highest generation executed per host and refuses lower (see `vault-gateway-redemption.md` §5 and IDENTIFIERS.md fencing row). The auth PDP checks presence/freshness only.
- Crash-restart rule (runtime): on any restart/reconnect, first re-read lease state from the Board and compare fencing tokens; stale token ⇒ the ticket is not yours.

## 4. Agent-causable transitions (SoD as protocol)

Agents may cause **only**: the claim itself (`todo → in_progress`) and `in_progress → {awaiting_approval | needs_review | blocked}` (+ voluntary release back to `todo`). Any attempt at `approved`, `executing`, `verifying`, `done`, `failed`, `cancelled` is hard-rejected and logged as a violation. This is TICKET_STATE_MACHINE.md §2 expressed as the tool surface; the spec is authoritative.

## 5. Idempotency

Every mutating tool takes a **caller-minted `op_id`** (see IDENTIFIERS.md registry row added by this merge) or `expected_version` optimistic-concurrency guard, so a retry after a dropped stream cannot double-act. `expected_version`/`ticket_version` is Board-scoped and opaque to callers.

## 6. Transport

MCP Streamable HTTP, spec revision **2025-11-25** (suite-wide pin; re-verify at build, do not design against the 2026-07-28 RC). Board is an OAuth 2.1 RS per `auth-apps-tokens-scopes.md`; claim/transition tools live under the `board:*` scope slice.

## 7. Change rule

Semantics above change only by amending this doc with both Board and agent-runtime sessions citing it. New tools/fields are additive.
