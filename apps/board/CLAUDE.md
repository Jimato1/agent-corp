# CLAUDE.md — Coordination Board (`board`)

> Read `/_context/ARCHITECTURE.md` and `/_context/PROCESS.md` first. This file only covers what is specific to the Board. Run the 7-stage pipeline; this app is **Standard**, so normal rigor applies.

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
