# Context Brief: Self-Hosted "Mini Corporation" Run by Local AI Agents

> **Purpose of this doc:** hand-off brief for the detailed planning/build session in Claude Code. It captures *decisions already made* and *principles to design around* — not the full implementation plan. Where it says "leaning" or "validate," that's a flag for Claude Code to pin down current specifics rather than inherit an assumption.

---

## 1. The vision in one line

A suite of self-hosted productivity apps — each in its own Docker container — that together form a "tiny corporation." Continuous, autonomous, **locally-run** AI agents do the work; a human (you) is the manager who reviews and approves. The org metaphor is literal: **Jira** (what to do), **Confluence** (the thinking/output), and **a manager** (you + a control plane).

## 2. Foundational decisions (locked)

- **Markdown is the source of truth.** Notes are `.md` files on disk. A database is only a *rebuildable index* (search, links, tags) that can be blown away and regenerated from the files. This is also the single best decision for agent-friendliness — plain text is the native substrate for LLMs.
- **Autonomy level: continuous.** Agents poll a queue, claim work, execute, and can spawn follow-ups — subject to hard guardrails (below).
- **Local agents, no API cost.** This inverts the usual optimization. Chattiness is free, so bias the whole design toward **more, smaller, more-supervised steps**, verbose "thinking out loud" into notes, and (optionally) different specialized local models per role. The real constraints are compute/concurrency, latency, and correctness — not dollars.
- **Every app has two views over one shared state:** an **agent surface** (MCP tools) and a **human surface** (rich UI). These are two projections of the same backend rows — the human UI is a *live management console*, not a separate reporting system.
- **Each app is API-first** and ships three things: the core service/API (source of truth), an MCP server over it (agent's hands), and a UI over it (human's eyes + veto).
- **First run target:** all six apps exist before the first end-to-end run (your call — see sequencing note in §7).

## 3. Core design principles (the "why")

**Scaffolding beats raw model strength.** A weak model fails on long tasks because it runs out of working memory and loses the thread. Fix it by moving state *out of the model and into the environment*:
- **External memory** — agents write findings to notes, retrieve only what's relevant per step. Context stays uncluttered.
- **Forced decomposition** — the app makes the agent write a plan of discrete subtasks before executing, turning one hard task into a sequence of easy ones.
- **Constrained outputs** — structured note templates (basically forms with expected sections) mean agents fill fields rather than invent structure. Constraint is what makes weak models reliable.
- Honest ceiling: this raises the *floor* dramatically on structured, decomposable, verifiable work. It does **not** manufacture insight for tasks needing a single hard leap. Design toward floor-limited work.

**Coordination lives in the board, not in agent-to-agent chat.** Humans on a team avoid collisions because a ticket is assigned to exactly one person — not by constant negotiation. So agents coordinate through shared state (the board), never by messaging each other. This is robust and boring, which is the point.

**Human-in-the-loop review gates are hard stops.** `needs_review` can only be cleared by a human. This is code review; it's the single most important guardrail.

**Escalation is the default failure mode.** The most valuable behavior in a continuous agent isn't doing work — it's knowing when to stop and hand back. A stuck agent files a `needs_review` explaining the blocker instead of spinning and burning compute.

**Defer complexity deliberately.** Tier-3 items (secrets vault, outbound tool/web/email gateway, analytics) are real but explicitly out of scope for v1.

## 4. The apps (six) + shared platform (two)

### Departments (apps — each with agent + human views)

| # | App | Role | Agent view | Human view |
|---|-----|------|-----------|-----------|
| 1 | **Jira board** *(have)* | Coordination / work tracking | claim, update, create tickets; atomic dequeue | kanban you manage from |
| 2 | **Confluence notes** *(have)* | External memory + work product | read / write / search / link notes | rich WYSIWYG editor + review |
| 3 | **Mission Control** *(build next)* | Manager / ops control plane | report status, heartbeats, request escalation | the cockpit: live agent view, WIP/budget controls, **global kill switch**, unified review queue |
| 4 | **Drive / artifact store** | Home for non-markdown outputs (PDFs, images, datasets) | put/get/list files by ticket | browse, preview, download |
| 5 | **Chat / notifications** | Human-facing comms | post notifications/escalations | notification feed + broadcast channel |
| 6 | **PDF editor/viewer** *(in progress)* | Callable tool + Drive preview surface | render note→PDF, view/edit | manual PDF editing/viewing |

Notes on specific apps:
- **Mission Control is the missing spine.** Continuous mode cannot run without it. If one net-new app is built first, it's this. The unified **review queue** ("everything waiting on me, across all apps") lives here.
- **Chat is deliberately human-facing.** Start as a one-way notification stream (escalations, needs-review, done pings) + a human broadcast channel ("stop working on X"). **Resist agent-to-agent chat** — it reintroduces coordinate-by-negotiation, which we rejected. Add two-way later only if missed.
- **PDF tool is a service, not an island** — the Drive's preview surface and a thing agents invoke.

### Shared platform (build once; every app depends on it)

- **7. Identity & Auth gateway** — the "HR + IT" layer. **Agents are first-class users** with roles, scoped permissions, and budgets. One place to answer "who is this, what may they do, are they out of budget." No app reimplements login. Most-leveraged thing to get right early.
- **8. Reverse proxy + routing** — Caddy/Traefik, subdomains, automatic TLS. Plumbing that makes "each app in its own container" cohere into one system.

## 5. Cross-cutting mechanics to design

**Ticket lifecycle & anti-collision (the coordination core):**
- Status model, e.g. `todo → in_progress → needs_review → done` (+ `blocked`).
- **Atomic claim:** `todo → in_progress` with `assignee` in a single optimistic-locked transaction that fails if another agent grabbed it first. Two agents race; the DB picks one winner; the loser takes the next item. No agent-to-agent comms.
- **Leases + heartbeats:** a claimed ticket that goes quiet (crash/runaway/kill) auto-releases back to the pool after a timeout.
- **Dependencies / blocking:** a ticket blocked by an unfinished one isn't claimable yet — yields ordered work from an unordered pool without a central planner.

**Notes as external memory:**
- **YAML frontmatter** carries status, type, links, tags — the agent workflow *is* the data model.
- **Structured note templates** per type (e.g. Research: *Objective / What I did / Findings / Open questions / Next step*). The constrained-output trick.
- **`[[wikilinks]]` + backlinks** double as the agent's associative memory.
- **Search as a tool** (SQLite FTS5), not a context dump — agent pulls only what's relevant per step.
- **Git-backed = free audit trail.** Every agent edit is diffable and reversible. This is how you sleep at night with autonomous agents.

**Continuous-mode guardrails (non-optional):**
- Hard **review gate** (`needs_review` human-only).
- **WIP limits** per agent and global.
- **Budgets/rate limits** — locally these are *compute/time/concurrency* caps, not dollar caps, plus a cooldown between actions.
- **Loop guards** — cap follow-up spawn depth; flag runaway chains for review.
- **Global kill switch / pause** — one control halts all claiming immediately (lives in Mission Control).

## 6. Open decision to resolve in planning: workforce model

You asked to argue both. Here's the case each way and a recommended path.

**Specialized roles (departments: research / writer / reviewer):**
- *For:* narrow toolset + single job type = more reliable weak agents (directly serves the punch-above-weight thesis); natural collision avoidance via role-partitioned queues; clean corporate metaphor; can assign a different local model per role (free locally); easier to audit ("what is this agent for").
- *Against:* more upfront design (role taxonomy, routing, per-role prompts/tools); load imbalance (if all work is research, writer agents idle); rigid — cross-cutting tasks need a home.

**Uniform interchangeable pool:**
- *For:* dead simple — one agent definition, one queue, one claim protocol; fastest to first run; perfect load balancing; fewer moving parts.
- *Against:* each agent needs the full toolset and must handle any task type = broader surface, weaker per-task reliability (cuts against the thesis); hard to specialize models; partitioning rests entirely on atomic claims (fine, but no natural separation).

**Recommended path — uniform execution, role-ready data model.** Start mechanically uniform (one claim protocol, one queue → fastest to first run), **but tag every ticket with a `type`/`skill` label from day one** even while any agent can pick up any type. The *data* supports specialization before the *routing* does. Later, introduce roles as a routing filter (agents subscribe to ticket types) with **zero rework to the core claim mechanic** — the label is already there. Best of both, no lock-in, consistent with "markdown/index is source of truth; behavior is layered on top."

## 7. Suggested sequencing (respecting "all six before first run")

You want all six to exist before the first run. The risk there is a big-bang integration with no early feedback. Mitigation that honors the goal:

1. Build all six apps, **but drive a thin vertical slice through the whole stack first** — one ticket type, one note template, minimal UI per app, atomic claim working, kill switch working, one agent completing one task end-to-end to `needs_review`.
2. *Then* flesh out each app's depth (editor richness, graph view, Drive versioning, notification types, etc.).

Build-order spine within that: **Identity/Auth + reverse proxy** (nothing is safe or routable without them) → **Board + Notes** (have) → **Mission Control** (the control plane the continuous loop depends on) → **Drive + Chat + PDF** fold in.

## 8. Tech leanings (validate current specifics in Claude Code — don't inherit blindly)

- **Editor:** Milkdown or TipTap (both ProseMirror) for WYSIWYG-that-stores-as-markdown — the "Word feel, markdown truth" requirement. Milkdown leans most literally "WYSIWYG markdown."
- **Conversion:** Pandoc as a microservice — md→PDF (via headless-Chromium/WeasyPrint or LaTeX/Typst) and md→**real** docx. Loops back to the PDF app for preview.
- **Search/index:** SQLite FTS5 per app (simple, fast, rebuildable). Postgres only where apps genuinely share data.
- **Agent interface:** MCP (Model Context Protocol) — one MCP server per app so any agent gets a clean toolbox and learns one interaction pattern across the whole suite. **Verify current MCP SDK/transport specifics at build time** rather than trusting older assumptions.
- **Proxy:** Caddy or Traefik for routing + automatic TLS.
- **Per-app storage default:** SQLite (self-contained containers, trivial backup) unless shared data forces Postgres.

## 9. One-paragraph summary for the top of the Claude Code session

> Building a self-hosted suite of six Dockerized productivity apps that form a "mini corporation" run by continuous, locally-run AI agents with a human manager. Markdown files are the source of truth; databases are rebuildable indexes. Every app is API-first with two surfaces over one state — an MCP agent view and a rich human UI. Agents coordinate solely through a Jira-style board using atomic ticket claims (no agent-to-agent chat), write their thinking into a Confluence-style notes app as external memory, and are supervised via a Mission Control cockpit with a hard human review gate, WIP/compute budgets, loop guards, and a global kill switch. Design bias: many small supervised steps, structured templates, forced decomposition — scaffolding that lets weak local models punch above their weight. Start with a uniform agent pool but a role-ready (type-tagged) data model so specialization can be layered in later with no rework.
