# CONTRACT — MC → Chat (and every deep-linking app): review-item URL scheme + resolve-event feed

> **Status: FROZEN** (MC Stage-2, 2026-07-02 — `apps/mission-control/planning/PLAN.md` §7). Producer:
> **MC** (`mc` service/subdomain/audience, ratified D-3). Primary consumer: **Chat** (seam #23 deep links +
> seam #24 resolve subscriber; unblocks Chat's PLAN §6 `mc|*` rows and its Stage-7 gate). Secondary
> consumers: any app that deep-links into the operator queue (Board, Notes, auth console cross-links).
> Consumer countersign: Chat's next session fills its §6 rows citing this doc.

## 1. Review-item identity — NO new identifier is minted

The review-item identity **IS the Board-minted `ticket_id`** (IDENTIFIERS.md posture: stored verbatim,
opaque, never parsed). A ticket occupies exactly one lifecycle state, so `ticket_id` uniquely names the
queue item; the gate (`awaiting_approval` vs `needs_review`) is derivable from live state and carried
explicitly in resolve events. This resolves IDENTIFIERS.md's pending-mint note ("reuse `ticket_id` if
possible") in the recommended direction — Chat's `source_ref {system:"mc", kind:"review", id}` carries a
`ticket_id`, and nothing in Chat changes (its PLAN §6 already anticipated exactly this).

## 2. URL scheme (FROZEN; additive-only)

| Link | URL | Behavior |
|---|---|---|
| Queue item | `https://mc.<SUITE_DOMAIN>/review/<ticket_id>` | renders the queue item in any gate; after clearance renders the **latest resolution plus the gate history** (one ticket may legally pass both gates and re-enter `needs_review` after rework — the URL always shows the most recent resolution first); a `ticket_id` MC cannot resolve via Board renders "not in queue" + a Board deep-link — **never a bare 404 for a well-formed `ticket_id`** |
| Queue root | `https://mc.<SUITE_DOMAIN>/review` | the unified review+approval queue (upgrade target for Chat's pre-freeze fallback `https://mc.<SUITE_DOMAIN>/`) |
| Ticket alias | `https://mc.<SUITE_DOMAIN>/ticket/<ticket_id>` | 302 → `/review/<ticket_id>` (fills Chat's `mc|ticket` row) |
| Agent drill-in | `https://mc.<SUITE_DOMAIN>/agents/<sub>` | live agent view drill-in (offered; no consumer required to use it) |

`ticket_id` / `sub` appear URL-encoded verbatim. Consumers construct URLs by substitution only — no
parsing, no format assumptions beyond IDENTIFIERS.md. All URLs sit behind the proxy's forward-auth
(human session required); they are stable across MC versions — path changes require amending this doc.

## 3. Resolve-event feed (FROZEN shape) — seam #24

`GET https://mc.<SUITE_DOMAIN>/api/events/resolve` (service consumers on `edge` may call `http://mc:8080`
directly with a valid token — MC is an OAuth2 RS, `aud=mc`). SSE, one event per queue-item resolution MC
observes on the Board:

```
event: resolve
id: <resolve_seq>
data: {"schema_version": 1,
       "ticket_id": "T-000123",
       "gate": "awaiting_approval" | "needs_review",
       "outcome": "approved" | "rejected" | "review_cleared" | "reworked",
       "actor_kind": "operator" | "cmdb_tier_policy",
       "resolved_at": "<RFC3339>",
       "review_url": "https://mc.<SUITE_DOMAIN>/review/T-000123"}
```

- **Outcome ⇄ transition mapping** (authority: `context/specs/TICKET_STATE_MACHINE.md` §2):
  `approved` = `awaiting_approval → approved` · `rejected` = `awaiting_approval → cancelled` ·
  `review_cleared` = `needs_review → done` · `reworked` = `needs_review → todo`. Enum is additive-only.
- **Semantics: advisory, at-least-once, MC-observed.** The Board is the state authority; MC emits what it
  observed, possibly late, possibly duplicated (consumers dedup on `(ticket_id, gate, outcome, resolved_at)`
  or simply re-render). **"MC-observed" scopes the guarantee:** resolutions occurring while MC is down may
  never be emitted — downtime windows are honest gaps, and consumers that key behavior off resolve events
  reconcile via read-time derivation or a periodic `GET /api/queue` diff. `resolved_at` is the
  Board-recorded transition time when available, else MC's first-observation time, **held stable across
  re-emissions of the same resolution** (so the dedup key survives MC projection rebuilds). Chat's
  read-time-derivation rule holds: if a notification and the live target disagree, the target wins.
  **This feed is never an input to any authorization or enforcement decision.**
- **Replay:** `Last-Event-ID` = `resolve_seq`, an MC-minted monotonic cursor — **contract-scoped, not a
  cross-app ID** (listed in IDENTIFIERS.md's deliberately-NOT-registered set; consumers store it only as a
  resume cursor). Retention is bounded (MC param `resolve_retention`, default 7 days / 10k events). A
  too-old cursor receives `event: reset`, after which the subscriber re-syncs current state from
  `GET /api/queue` and resumes from the live tip. Keep-alive comments < 60s.
- **Auth:** scope **`mc:read`** (MC Stage-2 ask to auth — grant to `svc:chat`; recorded in MC PLAN §6.4/§9-R2).
  **The grant must cover `GET /api/queue` (+ `/api/queue/{ticket_id}`) as well as this feed** — the reset
  recovery step above depends on the queue read; a feed-only grant satisfies the letter of the ask and
  breaks the recovery path. Until granted, the feed returns 403 and Chat operates on its documented
  fallback links — degraded, never wrong.

## 4. Change rule

URL paths and event fields are additive-only. Semantics (outcome mapping, at-least-once/advisory posture,
reset behavior) change only by amending this doc with both MC and the consumer session citing it.
