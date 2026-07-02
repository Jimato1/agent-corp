# CLAUDE.md — Coordination Board (`board`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to the Board. Run the 7-stage pipeline; this app is **Standard**, so normal rigor applies.

## Identity

The Board is **the org's coordination spine** — the single place where work is tracked, claimed, and executed. It is the load-bearing answer to "how do agents coordinate without negotiating": exactly one agent atomically claims a piece of work, and the real-world resource behind it is locked at the same moment. If two agents ever act on one host, the failure started here.

## Risk class: Standard

## Agent surface (MCP)

- Create / update / read tickets; **atomic dequeue** (claim-next) so exactly one agent wins a ticket.
- Run **ceremony** transitions (triage → recon → planning → adversarial review → backlog → execute → retro).
- Accept all three kickoff types: human-filed, scheduled, event-driven.
- Claims lock the **real-world resource (the host)**, not just the ticket row.

## Human surface (UI)

- Kanban board across the ticket lifecycle plus a management console.
- Visibility into ceremony state, epics/standing tickets, and what is claimed by whom.

## Key mechanics to build

- **Ticket lifecycle** (§5): `todo → in_progress → (awaiting_approval →) needs_review → done`, plus `blocked`.
- **Epic / standing tickets** that spawn children on a trigger (the "maintain & improve" mandate is standing, not do-once).
- **Recurring / event kickoffs:** human-filed, scheduled (e.g. weekly rescan), event-driven (e.g. Wazuh new-CVE alert).
- **Resource-level locking:** one claim = one host = clean lock. Severity is priority/ordering *within* a ticket, not a reason to split into per-CVE tickets fighting over the host lock.
- **Ceremony state machine** (§6): the deliberation layer is mostly *behavior on the Board + Notes*, not a new container. Convergence machinery (timebox, cap rounds, decider, escalate deadlock) lives here.
- The huddle conversation is persisted as a **note** attached to the planning ticket, **not** in Chat.

## Definition of done (Stage 7)

- Atomic claim proven under simulated concurrent agents: no double-claim, host lock holds.
- Full lifecycle + ceremony transitions exercised over one shared state by both surfaces.
- All three kickoff types create tickets; standing tickets spawn children on trigger.
- Standard invariants pass (MCP authz, audit logging of state changes).
## SETTLED DECISIONS (ratified 2026-07-02 — `context/RATIFICATIONS_2026-07-02.md`)

1. **(D-14)** Claim engine is **hand-built on SQLite** (WAL, `BEGIN IMMEDIATE`, status-guarded CAS — SKIP LOCKED does not exist in SQLite; Postgres `FOR UPDATE SKIP LOCKED` only as a future graduation). Per-host mutex is **data**: `host_locks` table + TTL lease + Board-minted monotonic `lock_generation` fencing token. Scheduled kickoffs = in-process **node-cron** (`noOverlap`); dedup via UNIQUE `spawn_key` in Board data. MCP pinned to **2025-11-25 Streamable HTTP** (suite-wide pin).
2. **(D-1)** Huddle tie-break = the DACI split, ratified as written — see TICKET_STATE_MACHINE.md "Ceremony governance". Stage-2 encodes it (server-side watchdog = amendment A1 `board_escalation`).
3. **(D-2)** Ceremony scaling = the deterministic three-lane triage decision table over five signals, ratified as written. Never an LLM score; lane floors inherit; lane governs planning rigor only.
4. **(D-11)** The Board **enforces lineage/spawn-depth caps at claim time** (it already enforces WIP there); MC surfaces and auto-triages; auth keeps token/identity budgets only.
5. **(D-15)** The Board **hosts `svc:tier-approver`** as an internal service process (auto-tier clearing of `awaiting_approval`; auth kind-gates it from destructive/high tiers).

Stage-2 obligations register: `context/MERGE_REVIEW_1.md` §6 (approval record + allowlist, PIP facts, four-eyes, provenance-taint lane eligibility, `team` label, backup, outage-aware reaper). Binding contracts: `context/CONTRACTS/board-agents-claim.md`, `board-wazuh-connector-kickoff.md`.
