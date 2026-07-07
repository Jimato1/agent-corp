# Contract — Board ↔ Mission Control console reads

> **Status:** FROZEN at Board Stage-4 build (`stage4/board-build`). Producer: **Board**. Consumer: **Mission Control** (`svc:mc`, and the operator browser under an MC-origin session).
> The ledger assigned this freeze to Board Stage-2; MC runs degraded until it lands. Documents what the code serves.

MC's console is an **API-Composition/BFF over Board's canonical state** — it is never a second source of truth (see the MC↔auth kill-switch boundary and MC transport memos). These are **since-cursor paginated, read-only** lists plus the live SSE feed. All require scope `board:read` (holder-kind `service` for `svc:mc`, or `human` for the operator).

## Since-cursor list reads
Each returns `{ cursor: <last id or the supplied since>, items: [...] }`. Poll with `?since=<cursor>&limit=<≤N>` (default 100). `cursor` is a monotonic `audit_log.id`; pass it back to page forward.

### `GET /facts/escalations?since=&limit=`
Audit rows where `action ∈ {board_escalation, fleet_outage_hold, breakglass_review_ticket, quarantine}`. Each item: `{ id, ts, actor_sub, action, ticket_id, approval_id, from_state, to_state, fields, outcome, machine_reason }`.
- `board_escalation` = the A1 server-side ceremony watchdog trip (DACI amendment A1). `fleet_outage_hold` = reaper outage-gate hold. `breakglass_review_ticket` = A2 born-`needs_review`. `quarantine` = unmapped Wazuh kickoff.

### `GET /facts/violations?since=&limit=`
Audit rows where `outcome = 'violation'` — the zero-tolerance SoD-boundary rejection telemetry (agent attempted a forbidden terminal/execution transition, four-eyes self-approval, auto-approve of a non-auto class, etc.). Same item shape.

### `GET /facts/lineage/{ticket_id}`
`{ root, nodes: [{ ticket_id, status, lineage_depth, spawned_by, parent_id }], max_depth_cap }`. Parent→child ticket lineage (distinct from MC's agent spawn tree). Walk is depth-guarded server-side.

### `GET /facts/holds`
`{ items: [{ ticket_id, reason, since }] }` — tickets held by the outage-gate reaper (fleet-silence mass-requeue suppression, D-11-adjacent).

### `GET /facts/wip`
`{ policy: [{ scope, subject, cap }], in_progress_global: int, lineage_max_depth: int }` — WIP caps + live global in-progress count + the lineage-depth cap.

## Live feed
### `GET /api/events` (SSE)
Named events: `ticket`, `ceremony`, `escalation`, `session` (token-exp terminate). Events are emitted **only after the originating transaction commits** (the tx helper buffers and flushes post-commit). A dropped stream is a **fail-closed** signal on the consumer side (show last-known, mark stale) — never a silent gap.

## Write surface (browser-direct, operator session)
The operator console writes **browser-direct to the Board** under the operator's own session — MC holds **no standing approve credential** (confused-deputy avoidance; mirrors `mc-chat-review-resolve.md`). Board-side authz + four-eyes + ConfirmFriction/step-up apply identically to UI and MCP callers:
- `POST /api/tickets/{id}/approve` · `/reject` · `/revoke` — approval decisions (four-eyes enforced at Board).
- `POST /api/tickets/{id}/operator-transition` — human-only lifecycle moves (e.g. `needs_review → done`).
- `PUT /api/policy/wip` · `PUT /api/policy/lineage` — policy-plane writes (audited; cap-write scope per auth ask #2).

## CORS
The API allowlists origin `https://mc.<SUITE_DOMAIN>` for these browser-direct reads/writes. No other cross-origin is permitted.

## Invariants (binding on both sides)
1. **MC is a projection, never a source of truth.** Every row here is re-derivable from Board's canonical store; MC caches nothing across a decision it renders as authoritative.
2. **Writes carry the operator's identity, not MC's.** A grant written with an `svc:mc` token (rather than the operator's session) is a contract violation.
3. **`Cache-Control: no-store`** on every facts read; SSE gaps fail closed.
4. **`cursor` is opaque-monotonic** — consumers page by echoing it, never by constructing an id.
