# agent-corp

> A self-hosted suite of Dockerized productivity apps that together form a **"tiny corporation"** run by continuous, **locally-run** AI agents — with a human operator as the manager.

Each app ships in its own container and exposes **two surfaces over one shared state**: an **agent surface** (MCP tools) and a **human surface** (a rich UI). The org metaphor is literal and load-bearing: a Jira-style **Board** (what to do), a Confluence-style **Notes** app (the thinking and work product), a **Mission Control** cockpit (the manager's console), and — because these agents touch real infrastructure — a **Gateway / Vault / CMDB** trio that governs dangerous actions.

---

## Vision in one line

Continuous, autonomous, locally-run AI agents do the work; the human operator sets objectives, approves risky actions, and reviews output. The manager manages; the agents execute.

## Foundational decisions (locked)

- **Markdown is the source of truth.** Notes are `.md` files on disk. Databases are only *rebuildable indexes* (search, links, tags) — blow them away and regenerate from the files. Plain text is also the native substrate for LLMs.
- **Local agents, no API cost.** This inverts the usual optimization: chattiness is free, so the design biases toward **many small, supervised steps**, verbose reasoning written into notes, and specialized models per role. Real constraints are compute/concurrency, latency, and correctness — not dollars. The flip side: "no cost" means the failure mode is *never terminating* or *shipping confident garbage*, so guard for **termination and quality**, not spend.
- **Continuous autonomy.** Agents poll queues, claim work, execute, and can spawn follow-ups — under hard guardrails.
- **Two views over one state** per app: an MCP agent surface and a rich human UI, both siblings over one API. Neither is downstream of the other.
- **API-first everywhere:** core service/API → MCP surface → UI.
- **Full suite before the first end-to-end run** (operator decision).

## Core principles (the "why")

**Scaffolding beats raw model strength.** Move state out of the model and into the environment: **external memory** (agents write findings to notes, retrieve only what's relevant per step), **forced decomposition** (plan discrete subtasks before executing), and **constrained outputs** (structured note templates the agent fills in). This raises the *floor* on structured, decomposable, verifiable work — it does not manufacture insight for single-leap problems.

**Coordination lives in the Board, not in agent chat.** Two agents never "talk out" who patches a host — exactly one atomically claims it. Agents may *argue about the plan*; they may not *negotiate who does the work*.

**Segregation of duties (the central safety property).** No single component — and never an agent — can unilaterally cause a destructive real-world action. Four holders must agree:

- **Board** — holds the ticket and its approval state.
- **CMDB** — holds the *policy* (host criticality tier, maintenance window, auto-vs-ask).
- **Vault** — holds the *credentials*, releasing them only to the Gateway, never to an agent.
- **Gateway** — the *only* component that can execute on a host; before acting it verifies an approved ticket exists, checks CMDB policy permits it now, then redeems creds from the Vault.

A compromised or runaway agent can propose anything and still cannot get root, because it never holds the keys or the approval. This is the *invoice-approver-can't-cut-the-check* rule.

**Done is confirmed externally, not self-reported.** Where an independent verifier exists, a task is complete only when that system confirms it — e.g. after patching, the agent waits for Wazuh's next scan to flip the vulnerability `active → solved` and attaches that as evidence.

**Escalation is the default failure mode.** A stuck agent files a `needs_review`/escalation explaining the blocker instead of spinning or blind-retrying.

## The apps (9 apps + 2 platform layers)

| App | Role | Agent surface | Human surface | Risk class |
|-----|------|--------------|--------------|-----------|
| **board** | Coordination / work tracking | claim, update, create tickets; atomic dequeue; run ceremonies | kanban + management console | Standard |
| **notes** | External memory + work product (markdown = truth) | read/write/search/link notes | WYSIWYG editor + review | Standard |
| **mission-control** | Manager cockpit / control plane | report status, heartbeats, request escalation | live agent view, WIP/budget controls, **global kill switch**, unified review + approval queue | Standard |
| **drive** | Artifact store (non-markdown outputs) | put/get/list files by ticket | browse, preview, download | Standard |
| **chat** | Human-facing notifications + broadcast | post notifications/escalations | notification feed + broadcast | Standard |
| **pdf** | Callable render/view tool + Drive preview | render note→PDF, view | manual view/edit | Safe |
| **gateway** | **The hands** — only component that executes on hosts | `execute_approved_plan(ticket, host)` only | live execution monitor, per-command audit, kill-switch chokepoint | **Critical-infra** |
| **vault** | Secrets store (deliberate two-view exception) | reference cred by handle only; **never** plaintext | manage secrets, rotation, access audit | **Critical-infra** |
| **cmdb** | Inventory + policy brain | query policy (tier, window, in-window?) | manage fleet + policies | **Critical-infra** |
| *platform:* **auth** | Identity gateway; agents are first-class users with roles, scoped permissions, budgets | authenticate, authorize | manage identities/roles/budgets | Critical-infra |
| *platform:* **proxy** | Reverse proxy, subdomains, TLS | n/a | n/a | Standard |

Notes on specific pieces:

- **Wazuh is not an app we build.** It is existing infrastructure the system *reads from* and *verifies against*. A small connector (beside the Gateway) talks to its API. Wazuh detects and tracks remediation; it never patches — the patching capability is the Gateway.
- **Chat is deliberately human-facing.** It starts as a one-way notification stream + operator broadcast. There is no agent-to-agent chat — deliberation lives in Notes.
- **Vault inverts the two-view rule:** agents get almost no read surface — only handle references, redeemable to plaintext solely by the Gateway.

## Cross-cutting mechanics

**Ticket lifecycle:** `todo → in_progress → (awaiting_approval →) needs_review → done`, plus `blocked`. Plus **epic/standing tickets** that spawn children on a trigger, three **kickoff types** (human-filed, scheduled, event-driven), and **resource-level locking** so a claim locks the real-world host, not just the ticket — two agents can't act on one server at once.

**Notes as external memory:** YAML frontmatter carries status/type/links/tags; structured templates per type; `[[wikilinks]]` + backlinks as associative memory; FTS5 search exposed as a *tool*, not a context dump. Because notes are files, every agent edit is diffable and reversible — a **git-backed audit trail** for free.

**Guardrails (continuous mode):** hard review/approval gates; WIP limits (per-agent and global); budgets as *compute/time/concurrency* caps plus action cooldowns; loop guards on follow-up spawn depth; and a **global kill switch** that physically bites at the Gateway chokepoint.

**The agentic-Agile deliberation layer.** Planning is a ceremony, not a single call: `triage → recon → planning → adversarial review → backlog → execute → retro`. A standing role-based team (Scrum Master, Product Owner, domain specialists, and a structurally-required **Adversarial Reviewer**) drafts and attacks the plan, grounded in retrieved notes rather than model priors. The huddle is persisted as a note attached to the planning ticket — a reviewable record, explicitly *not* the human-facing chat app.

## Repository layout

```
context/          Shared, always-loaded context
  ARCHITECTURE.md   Canonical "why everything is shaped this way" (source of truth)
  PROCESS.md        The 7-stage build pipeline every app runs through
apps/             One directory per app (board, notes, mission-control, drive,
                  chat, pdf, gateway, vault, cmdb) — each with its own CLAUDE.md
platform/         Shared platform layers (auth, proxy)
CLAUDE.md         Root instructions + non-negotiable invariants
```

Each app follows the same per-app structure: `research/RESEARCH.md`, `planning/PLAN.md`, `ui/UI_SPEC.md`, `security/THREAT_MODEL.md`, `optimization/NOTES.md`, `verification/CHECKLIST.md`, plus `src/` and a `Dockerfile`.

## The build pipeline

Every app runs through the same **7 stages in the same order** — uniform sequence is itself scaffolding. What flexes is the *rigor within each stage*, set by the app's risk class (**Safe / Standard / Critical-infra**):

1. **Research** — understand full desired functionality; cite external-system facts.
2. **Planning** — turn research into a plan; run it through an adversarial review.
3. **UI/UX** — a self-contained frontend spec for the two-view split.
4. **Build** — implement API-first: core → MCP surface → UI.
5. **Security hardening** — rigor scales hard by risk class; Critical-infra must *prove* segregation of duties holds.
6. **Optimization** — tuned for local compute; concurrency safety under multi-agent load.
7. **Verification** — spec + shared invariants; prefer external verification (e.g. confirm via Wazuh).

See [`context/PROCESS.md`](context/PROCESS.md) for stage artifacts and exit criteria, and [`context/ARCHITECTURE.md`](context/ARCHITECTURE.md) for the full rationale.

## Build order

Full suite before the first end-to-end run. Suggested sequence within that: platform (`auth`, `proxy`) → `board`, `notes` → `mission-control` → `drive`, `chat`, `pdf` → the critical-infra trio (`gateway`, `vault`, `cmdb`) **last**, after the others exist to integrate against.

## Non-negotiable invariants

Violating any of these is a build failure:

- **Markdown is the source of truth** for notes/knowledge; databases are rebuildable indexes.
- **Segregation of duties** — no single component, and never an agent, can unilaterally cause a destructive action.
- **Agents coordinate execution through the Board (atomic claims), never by negotiation.**
- **Done is confirmed by an independent system, not self-reported**, wherever an external verifier exists.
- **Two views, one state** — the MCP surface and the UI are siblings over one API.
- **Every app is API-first** — core service/API, then MCP surface, then UI.

---

*Status: early scaffold. Docs and per-app pipeline stubs are in place; implementation is underway.*
