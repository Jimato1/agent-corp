# Contract — Board facts (PIP) read surface

> **Status:** FROZEN at Board Stage-4 build (`stage4/board-build`). Producer: **Board**. Consumers: **auth PDP**, **Vault** (D-4 redeem predicate), **Notes** (uncached fence read), **Drive** (exists bit), **Gateway** (host-lock read).
> Supersedes the designed shape in `apps/board/planning/PLAN.md` §7 where they differ; this documents what the code actually serves.

This is the **Policy Information Point (PIP)** surface. Every value is **live** (in-process SQLite PK read), never request-supplied, and every response is served **`Cache-Control: no-store`** — staleness silently weakens four consumers' segregation-of-duties checks. Reads require scope `board:read` (holder-kind `service` or `human`).

## Endpoints

### `GET /facts/ticket/{ticket_id}` — auth PDP live facts + Notes fence read + Drive exists
Returns `{ exists: false }` if unknown, else:
```
{ exists: true,
  ticket_id, status, proposer_id, claimed_by, host_id, team, lane,
  taint_host_originated: bool,
  approval_id, approval_status,            // approval_status resolved live from the linked approval row
  fencing_token: int|null,                 // Notes' uncached fence read — ticket-keyed, never composite
  lease_expires_at: epoch_ms|null,
  version: int, updated_at }
```
- **auth PDP** uses `proposer_id` (four-eyes cross-check) + `status`.
- **Notes** uses `fencing_token` as the monotonic generation for its uncached check-then-commit (Board guarantees monotonicity; Notes validates uncached — residual TOCTOU accepted for append-biased writes).
- **Drive** uses `exists` for its degraded-mode exit.

### `GET /facts/approval/{approval_id}` — Vault's ratified D-4 redeem predicate
Returns `{ exists: false }` if unknown, else:
```
{ exists: true,
  approval_id, status,                     // granted | consumed | revoked | expired
  ticket_id, ticket_status,                // ticket_status added per REVIEW_2 §S2 — Vault's "still-executing" check in ONE call
  host_id, plan_hash, plan_note_id, plan_note_rev, action_class,
  approver_kind, approver_sub,
  granted_at, consumed_at, consumed_by, run_id }
```
- **The Gateway consumes _before_ Vault redeems** (state machine §6). So at redemption time the supported predicate — stated by the producer — is:
  `status == 'consumed'  ∧  consumed_by == <the redeeming Gateway's sub>  ∧  consumed_at within the redemption window`.
  (`granted` always fails closed at redeem time — a still-`granted` approval means no Gateway has consumed it.)
- The response carries every field that predicate needs; consumers **must not** treat `granted` as redeemable.

### `GET /facts/host-lock/{resource_id}` — Gateway host-lock read
Returns `{ exists: false, lock_generation: 0 }` if free, else:
```
{ exists: true, resource_id, lock_generation: int, claimed_by_ticket, claimed_by_agent, hold_kind, lease_expires_at }
```
- `lock_generation` is the **fencing token** — see `board-agents-claim.md` (Board is its single monotonic minter). `hold_kind ∈ {claim, execution}`.

### `GET /facts/kill` — read-only kill-epoch mirror (operator UI HaltBand)
`{ level, epoch, updated_at }`. The Board hosts **no kill actuator**; it renders auth/MC's posture. Consumers must not treat this as authoritative — auth is the enforcement point (`killswitch-chain.md`).

## Invariants (binding on both sides)
1. **No field is ever request-supplied.** The producer reads live rows; a consumer that passes a value expecting it echoed is a contract violation.
2. **`Cache-Control: no-store` on every response.** Consumers must not cache PIP facts across a decision.
3. **Redeem predicate is `consumed`-not-`granted`.** Any consumer redeeming on `granted` bypasses the single-use consume gate and is a build failure.
4. **Identifiers** are the public forms from `context/specs/IDENTIFIERS.md` (`T-…`, `A-…`); composite `resource_id`s never cross the boundary via `/facts/ticket` (that read is ticket-keyed).
