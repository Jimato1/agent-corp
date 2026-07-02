# CLAUDE.md — Root

This monorepo is a self-hosted suite of Dockerized apps that form a "mini corporation" run by continuous, **locally-run** AI agents with a human manager (the operator). Each app ships in its own container and exposes two surfaces over one shared state: an **agent surface** (MCP tools) and a **human surface** (rich UI).

## Shared context — auto-imported, always loaded

@context/ARCHITECTURE.md
@context/PROCESS.md

The two `@` lines above import the shared context at session launch. From anywhere in the repo, Claude Code walks up to this root file and loads it plus its imports, so this context is always present. `ARCHITECTURE.md` is the source of truth for *why* everything is shaped the way it is; `PROCESS.md` is the 7-stage pipeline every app runs through and how rigor scales by risk class.

## Per-app instructions

Each app has its own `CLAUDE.md` under `apps/<app>/` (or `platform/<svc>/`), loaded on demand when Claude works in that subtree. Keep them thin — they cover only what is specific to that app. Do not restate shared context in them; if something is true for every app, it belongs in `context/`, not duplicated.

> \*\*Naming note (intentional):\*\* every per-app file is named `CLAUDE.md` on purpose — that exact filename is what Claude Code auto-discovers by walking up the directory tree. They are disambiguated by their \*path\* (`apps/gateway/CLAUDE.md`, `apps/vault/CLAUDE.md`, …), which is the intended monorepo pattern, not a collision. The shared docs are deliberately \*\*not\*\* named `CLAUDE.md` (they are `ARCHITECTURE.md` / `PROCESS.md`) so they load via `@import` above rather than directory-walk. Do not rename any of these — the names are load-bearing.

## Non-negotiable invariants (violating any of these is a build failure)

* **Markdown is the source of truth** for notes/knowledge. Databases are rebuildable indexes, never the canonical store.
* **Segregation of duties.** No single component — and never an agent — can unilaterally cause a real-world destructive action. The Board (approval), CMDB (policy), Vault (credentials), and Gateway (execution) each hold one piece; action requires all four to agree. See ARCHITECTURE.md §"Segregation of duties."
* **Agents coordinate execution through the Board (atomic claims), never by negotiation.** Agents may *deliberate about a plan*; they may not *negotiate who does the work*.
* **Done is confirmed by an independent system, not self-reported** wherever an external verifier exists (e.g. Wazuh confirms a patch).
* **Two views, one state.** The MCP surface and the UI are siblings over one API. Neither is downstream of the other.
* **Every app is API-first:** build the core service/API first, then the MCP surface, then the UI.

## Build order

Full suite before first end-to-end run (operator's decision). Suggested sequence within that: platform (`auth`, `proxy`) → `board`, `notes` → `agent-runtime` (the workforce layer — Mission Control's liveness model depends on its heartbeats, and its two early research spikes gate Board/Notes Stage 2; see `platform/agent-runtime/CLAUDE.md`) → `mission-control` → `drive`, `chat`, `pdf`, `library` → the critical-infra trio (`gateway`, `vault`, `cmdb`) last, after the others exist to integrate against. (Library's *curation loop* additionally depends on the Gateway's tier-0 sandbox surface, so full curation goes live after the trio — the query/retrieval surface doesn't wait for it.)

