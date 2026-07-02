# CLAUDE.md — Chat (`chat`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to Chat. Run the 7-stage pipeline; this app is **Standard**, so normal rigor applies.

## Identity

Chat is **the human-facing notification channel** — a one-way stream where agents surface notifications and escalations to the operator, plus an operator broadcast back to the fleet. It is deliberately narrow: it is **not** where agents coordinate or deliberate. That conversation lives in Notes; coordination lives on the Board.

## Risk class: Standard

## Agent surface (MCP)

- Post notifications / escalations to the operator.
- **Do NOT build agent-to-agent chat here** (§4) — no negotiation surface, by design.

## Human surface (UI)

- Notification feed (what agents are telling the operator).
- Operator broadcast (one message out to the fleet).

## Key mechanics to build

- **Start one-way** (§4): agent→operator notification stream + operator→fleet broadcast. Resist scope creep into a chat room.
- **Deliberation lives in Notes** (§6), coordination on the Board — Chat stays the clean human notification boundary.
- Escalations posted here mirror the escalation-is-default-failure-mode principle (§3): a stuck agent notifies, it does not spin.

## Definition of done (Stage 7)

- Notifications/escalations flow agent→operator; broadcast flows operator→fleet, over one shared state.
- No agent-to-agent messaging path exists (coordination boundary held).
- Standard invariants pass (MCP authz, audit logging of state changes).
## SETTLED DECISIONS (ratified 2026-07-02 — `context/RATIFICATIONS_2026-07-02.md`)

1. **(D-14)** **Build a thin bespoke Chat service** (own canonical SQLite = feed + audit log, own SSE feed, one write-only MCP tool). **ntfy is adopted ONLY as an outbound push sink** (`chat_ntfy` sidecar, DEPLOYMENT §3a) — never the core, never a second source of truth, never a second identity system; Chat is its only publisher.
