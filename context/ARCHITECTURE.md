# ARCHITECTURE.md — Shared Context (read before working any app)

> Supersedes the earlier standalone context brief. This is the canonical shared context for every app's Claude Code session. Where it says "leaning" or "validate in research," that is a flag to confirm current specifics rather than inherit an assumption.

---

## 1. Vision

A suite of self-hosted Dockerized productivity apps that together form a "tiny corporation." Continuous, autonomous, **locally-run** AI agents do the work; the human operator is the manager who sets objectives, approves risky actions, and reviews output. The org metaphor is literal and load-bearing: a Jira-style **Board** (what to do), a Confluence-style **Notes** app (the thinking and work product), a **Mission Control** cockpit (the manager's console), and — because agents touch real infrastructure — a **Gateway / Vault / CMDB** trio that governs dangerous actions.

## 2. Foundational decisions (locked)

- **Markdown is the source of truth** for notes. Databases are rebuildable indexes.
- **Local agents, no API cost.** This inverts normal optimization: chattiness is free, so bias toward *many small supervised steps*, verbose reasoning into notes, and specialized models per role. Real constraints are compute/concurrency, latency, and correctness — not dollars. Note the flip side: "no cost" means the failure mode is *never terminating* or *shipping confident garbage*, not *expensive*. Guard for termination and quality, not spend.
- **Continuous autonomy.** Agents poll queues, claim work, execute, and can spawn follow-ups — under hard guardrails.
- **Two views over one state** per app: an MCP agent surface and a rich human UI, both siblings over one API.
- **API-first** everywhere: core service → MCP surface → UI.
- **Full suite before first end-to-end run** (operator decision).
- **Deliberation and execution are separate phases.** Multi-agent debate *produces* the plan; the Board's atomic-claim loop *executes* it. Debate must terminate in an artifact.

## 3. Core principles

**Scaffolding beats raw model strength.** Move state out of the model and into the environment: external memory (agents write findings to notes, retrieve only what's relevant per step), forced decomposition (plan discrete subtasks before executing), constrained outputs (structured note templates the agent fills in). This raises the *floor* on structured, decomposable, verifiable work; it does not manufacture insight for single-leap problems. Design toward floor-limited work.

**Coordination lives in the Board, not in agent chat.** Two agents never "talk out" who patches a host — exactly one atomically claims it. The refined boundary: **agents may argue about the plan; they may not negotiate who does the work.**

**Segregation of duties (the central safety property).** No single component, and never an agent, can unilaterally cause a destructive real-world action. Four holders must agree:
- **Board** — holds the ticket and its approval state.
- **CMDB** — holds the *policy* (host criticality tier, maintenance window, auto-vs-ask).
- **Vault** — holds the *credentials*, and releases them only to the Gateway, never to an agent.
- **Gateway** — the *only* component that can execute on a host; before acting it verifies an approved ticket exists, checks CMDB policy permits it now, then redeems creds from the Vault.
The agent orchestrates all four but holds no credentials and cannot approve its own work. A compromised or runaway agent can propose anything and still cannot get root, because it never holds the keys or the approval. This is the invoice-approver-can't-cut-the-check rule. Write it at the top of the security stage for Board, CMDB, Vault, and Gateway.

**Done is confirmed externally, not self-reported.** Where an independent verifier exists, a task is complete only when that system confirms it. Canonical example: after patching, the agent does not declare success — it waits for Wazuh's next scan to flip the vulnerability active→solved and attaches that as evidence.

**Two kinds of human gate.**
- *Pre-execution approval* (`awaiting_approval`): for destructive/irreversible task types, the agent produces a plan and cannot proceed until approved (by operator or by CMDB tier policy). Propose → approve → execute.
- *Post-work review* (`needs_review`): for produced artifacts (notes, reports), review happens after the work. Human-only to clear.

**Escalation is the default failure mode.** A stuck agent files a `needs_review`/escalation explaining the blocker instead of spinning or retrying blindly. A host going unreachable escalates immediately and is never blind-retried.

## 4. App inventory (10 apps + 3 platform layers)

| App | Role | Agent surface | Human surface | Risk class |
|-----|------|--------------|--------------|-----------|
| **board** | Coordination / work tracking | claim, update, create tickets; atomic dequeue; run ceremonies | kanban + management console | Standard |
| **notes** | External memory + work product (markdown = truth) | read/write/search/link notes | WYSIWYG editor + review | Standard |
| **mission-control** | Manager cockpit / control plane | report status, heartbeats, request escalation | live agent view, WIP/budget controls, **global kill switch**, unified review + approval queue | Standard |
| **drive** | Artifact store (non-markdown outputs) | put/get/list files by ticket | browse, preview, download | Standard |
| **chat** | Human-facing notifications + broadcast | post notifications/escalations | notification feed + broadcast | Standard |
| **pdf** | Callable render/view tool + Drive preview | render note→PDF, view | manual view/edit | Safe |
| **library** | Curated reference corpus (RAG) — the corporate reference shelf; markdown corpus canonical, vector/FTS index rebuildable | hybrid search returning chunks + citations + provenance tier; propose ingestion (never direct write to trusted tier) | browse corpus, ingestion review queue, manage collections | Standard |
| **gateway** | **The hands** — only component that executes on hosts | `execute_approved_plan(ticket, host)` only | live execution monitor, per-command audit, kill-switch chokepoint | **Critical-infra** |
| **vault** | Secrets store (deliberate two-view exception) | reference cred by handle only; **never** plaintext | manage secrets, rotation, access audit | **Critical-infra** |
| **cmdb** | Inventory + policy brain | query policy (tier, window, in-window?) | manage fleet + policies | **Critical-infra** |
| *platform:* **auth** | Identity gateway; agents are first-class users with roles, scoped permissions, budgets | authenticate, authorize | manage identities/roles/budgets | Critical-infra |
| *platform:* **agent-runtime** | **The workforce** — hosts the agent processes, the agent loop, and the local model stack; holds the per-agent TPM-sealed signing keys; the client half of heartbeats/drain/kill | none — it *runs* agents; its control surface faces the operator/MC | fleet process status (surfaced via Mission Control) | **Critical-infra** |
| *platform:* **proxy** | Reverse proxy, subdomains, TLS | n/a | n/a | Standard |

Notes:
- **Wazuh is NOT an app you build.** It is existing infrastructure the system *reads from* and *verifies against*. A small connector (living in or beside the Gateway) talks to its API. Wazuh detects and tracks remediation; it never patches. The patching capability is the Gateway.
- **Chat is deliberately human-facing.** Start as a one-way notification stream + operator broadcast. Do NOT build agent-to-agent chat here; deliberation lives in Notes (see §6).
- **Vault inverts the two-view rule:** agents get almost no read surface — only handle references, redeemable to plaintext solely by the Gateway.
- **The Library is deliberately NOT Notes.** Notes is the lab notebook (agent-written working memory, internal provenance, FTS); the Library is the reference shelf (externally-ingested documentation, provenance/confidence tiers, semantic+FTS hybrid retrieval). Its ingestion path is a first-class §12 surface: `sandbox-verified` content auto-admits (a sandbox test IS an external verifier), `cross-referenced` prose needs batched operator review, everything else quarantines. The Library confirms *how*; the external verifier still confirms *done*. See `apps/library/CLAUDE.md`. *(Added 2026-07-01, operator decision.)*
- **The agent-runtime is the client half of every guardrail.** Leases, heartbeats, WIP limits, budgets, and the kill switch are enforced *server-side* by Board/MC/Gateway — and obeyed *client-side* by the runtime that hosts the agent processes. It is Critical-infra because it physically holds the per-agent signing keys (auth's "true root credential") and the local model stack (a supply-chain surface: one poisoned model compromises every role, including the Adversarial Reviewer). It holds identity key material only — never host credentials, never approval or execution authority. See `platform/agent-runtime/CLAUDE.md`. *(Added 2026-07-01, gap 1.1.)*

## 5. Cross-cutting mechanics

**Ticket lifecycle:** `todo → in_progress → (awaiting_approval →) needs_review → done`, plus `blocked`. This shorthand remains the human-visible core; the **authoritative superset** — including the execution-window states (`approved`, `executing`), external-verification (`verifying`), the terminal set (`done`/`failed`/`cancelled`), per-transition authority, and the single ceremony-phase authority — is **`context/specs/TICKET_STATE_MACHINE.md`** (Board-owned; binding on all consumers, including the auth PDP). Additions this system requires:
- **Epic / standing tickets** that spawn children on a trigger (the "maintain & improve" mandate is standing, not do-once).
- **Recurring / event kickoffs:** three kickoff types — human-filed, scheduled (e.g. weekly rescan), event-driven (e.g. Wazuh new-CVE alert). Design the Board to accept all three.
- **Resource-level locking:** the claim must lock the real-world resource (the host), not just the ticket, so two agents can't act on one server at once. Default unit of an infra ticket is **per-server** (one claim = one host = clean lock); severity becomes priority/ordering *within* a ticket, not a reason to split into per-CVE tickets that fight over the host lock.

**Notes as external memory:** YAML frontmatter carries status/type/links/tags; structured templates per type (e.g. Research: Objective / What I did / Findings / Open questions / Next step); `[[wikilinks]]` + backlinks as associative memory; search (SQLite FTS5) exposed as a *tool*, not a context dump.

**Git-backed audit trail:** notes are files, so every agent edit is diffable and reversible for free. Non-negotiable for autonomous operation — and it **must have a configured git remote** (§10): a local-only `.git` means one disk failure destroys the source of truth and its reversibility history together.

**Guardrails (continuous mode):** hard review/approval gates; WIP limits (per-agent and global); budgets as *compute/time/concurrency* caps plus action cooldowns (not dollars); loop guards (cap follow-up spawn depth; flag runaway chains); a **global kill switch** that physically bites at the Gateway chokepoint.

**Sandbox execution tier (tier-0) *(added 2026-07-01)*:** disposable, credential-less sandbox targets (throwaway containers/VMs) are registered in **CMDB as a `disposable` class with auto-approve policy** — no maintenance windows, no Vault credentials (sandboxes hold nothing worth stealing) — and are executed against **only via the Gateway**, like every other target. This preserves the execution monopoly verbatim ("no destructive *real-world* action" — a sandbox has no real world) and keeps runaway loops killable: **the global kill switch covers sandbox execution** because everything funnels through the one chokepoint. Primary consumer: Library curation (sandbox evidence = external verification for testable documentation claims). Design input for CMDB research and Gateway planning — recorded in `context/GAP_REMEDIATION.md` §3.

## 6. The agentic-Agile deliberation layer

Planning is a **ceremony**, not a single agent call. This is mostly new *behavior on the Board + Notes*, not new containers.

**Ceremony state machine:** `triage → recon → planning → adversarial review → backlog → execute → retro`.
- **Triage** (Scrum Master agent): does this ticket need the full ceremony or route straight to execution? Trivial/reversible → skip the huddle. Risky/high-tradeoff/irreversible → full ceremony. (Whether/how to scale is a research-phase decision.)
- **Recon:** spawn parallel research sub-tickets; agents claim independently, write findings to notes. **The debate is grounded in these retrieved notes, not model priors** — main defense against confident-but-wrong plans.
- **Planning huddle:** a standing role-based team drafts the plan.
- **Adversarial review:** a red-team agent is structurally required to *attack the premises and the plan*, evaluated on holes found, never on agreeableness.
- **Backlog:** converged plan decomposes into per-server execution tickets carrying their plan slice + the debate transcript.
- **Execute:** the normal atomic-claim → approve-by-tier → Gateway → external-verify loop.
- **Retro:** a retro agent reads the git audit trail + external before/after (e.g. Wazuh), writes lessons into notes that feed the next cycle's recon. This closes the learning loop that fulfills "improve over time."

**Standing team roles:** Scrum Master (owns process, not content; calls the vote; enforces timebox), Product Owner (holds the goal + success metric; guards scope), domain specialists (e.g. Security Engineer, SRE/Sysadmin), Adversarial Reviewer (forced dissenter). **This resolves the workforce fork: specialized roles for the huddle, a uniform pool for the hands.**

**Convergence machinery (the deliberation kill-switch):** timebox the ceremony (steal Agile timeboxing), cap rounds, designate a decider, escalate deadlocks to the human. *Tie-break authority is a research-phase decision.*

**Anti-sycophancy (quality defense):** agents draft positions **independently before any cross-talk** (kills anchoring); the red-team must dissent; fast consensus is itself suspicious; ground everything in retrieved facts; attack premises, not just conclusions.

**Where the conversation physically lives:** a structured thread persisted as a **note** attached to the planning ticket (external memory + full audit) — explicitly NOT the human-facing chat app. Keeps the coordination boundary clean and gives the operator a reviewable record of every huddle.

**Teams *(added 2026-07-01)*:** a team is a **composition of existing primitives, not new machinery**: a standing epic (the team's mandate — e.g. "keep the library accurate," "maintain fleet readiness") + a persona set (agent-runtime config) + a ticket-type/tag subscription (the role-ready routing the workforce decision reserved) + the three kickoff types for its scheduled and event-driven work. A **steward persona** (the Scrum Master pattern scoped to a domain) owns the standing epic's triage and decomposition. The Board remains the only coordinator — teams never negotiate work among themselves; their agents claim tagged tickets atomically like everyone else. The `team` label lands in the Board and auth schemas at Stage 2 (design input recorded in `context/GAP_REMEDIATION.md` §3). Canonical examples: the Library curation team; the §7 fleet-maintenance flow run as a standing infrastructure team.

## 7. Reference scenario (canonical example for every app's research phase)

Operator files an epic: "~20 homelab servers run Wazuh agents; most are behind on vulnerabilities and package updates; maintain and improve those metrics." End-to-end flow:

1. Scrum Master claims epic → triages (high-risk, infra, multi-host) → full ceremony.
2. Recon sub-tickets: enumerate fleet + posture from Wazuh; research safe patch practice + Wazuh verification; pull per-host criticality/window from CMDB; cluster vulns by severity/shared packages. Findings → notes.
3. Planning huddle drafts: canary order, tier batching, maintenance-window scheduling, rollback, batch size.
4. Adversarial review attacks premises: canary must share package set with risky hosts; respect retro warnings (e.g. a host that hung on reboot last time); require a rollback path for unrecoverable hosts (e.g. the NAS).
5. Converge within timebox → per-server execution tickets (ordered, tier-tagged) + transcript.
6. Execute: per-host claim → approve-by-criticality-tier gate → Gateway brokers creds from Vault, acquires per-host mutex, runs, captures all output, health-checks → Wazuh independently confirms active→solved.
7. Retro: lessons → notes → next cycle's recon.

## 8. Risk classes (set rigor in PROCESS.md stages)

- **Safe** (pdf): light security stage.
- **Standard** (board, notes, mission-control, drive, chat, library, proxy): normal rigor. (Library carries one elevated obligation: corpus poisoning via ingestion is its mandatory primary threat-model axis, per §12.)
- **Critical-infra** (gateway, vault, cmdb, auth, agent-runtime): heavy security + verification stages — mandatory segregation-of-duties proof, "agent never holds plaintext" checks, kill-switch chokepoint verification, per-host mutex correctness, audit completeness. These apps cannot exit the security stage on a light checklist.

## 9. Tech leanings (validate current specifics in research)

- **Editor:** Milkdown or TipTap (ProseMirror) — WYSIWYG that stores as markdown.
- **Conversion:** Pandoc microservice — md→PDF and md→real docx.
- **Search/index:** SQLite FTS5 per app; Postgres only where apps share data.
- **Agent interface:** MCP — one server per app. **Verify current MCP SDK/transport at build time**, don't inherit assumptions.
- **Proxy:** Caddy or Traefik.
- **Per-app storage default:** SQLite (self-contained, trivial backup) unless shared data forces Postgres.
- **Gateway execution:** validate the safest brokering pattern (e.g. agent gets no shell; Gateway runs vetted, parameterized playbooks) during the Gateway's research stage.

## 10. Data durability & disaster recovery *(added 2026-07-01, gaps 2.1/2.2)*

The "markdown is truth / databases are rebuildable indexes" invariant is precise, not general: **it holds only where a markdown corpus exists to rebuild from.** Classify every store honestly and protect the canonical ones:

| Store | Class | Consequence |
|---|---|---|
| Notes markdown corpus (+ its git history) | **CANONICAL** | the invariant's subject; its FTS/link index is the rebuildable part |
| Library markdown corpus (+ provenance/verification frontmatter) | **CANONICAL** | its chunk/vector/FTS index is the rebuildable part |
| Board DB (tickets, approvals, leases, `ceremony_events`) | **CANONICAL** | approval state is load-bearing for SoD; not rebuildable from markdown |
| Chat DB (notification/escalation record) | **CANONICAL** | the delivered-notification record exists nowhere else |
| Drive blobs | **CANONICAL** | artifacts have no other home |
| Vault secret material | **CANONICAL — special regime** | seal/unseal, recovery-key custody, CA-key escrow are part of Vault's charter and the Critical-infra rigor row (PROCESS.md) |
| Hash-chained / signed audit tables (auth, gateway) | **CANONICAL — append-only** | tamper-evidence is the point; backup must preserve chain verifiability |
| FTS indexes, caches, projections (e.g. `ceremony_phase`) | rebuildable | may be blown away and regenerated |

Requirements:
- **Every canonical store has a stated backup mechanism and cadence** (decided per app in its planning stage; existence is non-optional).
- **The Notes git repository MUST have a configured remote.** A local-only `.git` is a build failure, not a style choice.
- **Restore consistency is a first-class problem:** restoring the Board to yesterday while audit chains and real host state are current silently corrupts the SoD record. Each Critical-infra app's plan states its restore-consistency rule, and **a restore is actually drilled as a Stage-7 exit criterion** (PROCESS.md).

## 11. East-west network security *(added 2026-07-01, gap 4.2 — shared invariant; Vault/Gateway planning inherit it)*

Intra-suite ("east-west") traffic is tiered, not flat:

- **Per-tier Docker networks** — `edge` (proxy + subdomain-serving apps) and **`creds` (vault + gateway ONLY)**. No Standard-class container ever joins `creds`. Topology details: `context/specs/DEPLOYMENT.md`.
- **The Vault→Gateway plaintext-credential hop gets mutual authentication** (mTLS or equivalent): response confidentiality and server authenticity on the single most sensitive flow in the system, which must never traverse a segment shared with Standard-class containers.
- Auth's layer-7 caller verification is necessary but not sufficient here — network placement and channel security are independent requirements on this hop.

## 12. Untrusted content & policy-plane change control *(added 2026-07-01, gaps 4.1/4.3)*

**LLM-input trust boundary.** Text that originates on managed hosts or from outside the suite is **adversarial input to the models**, full stop: Wazuh alert fields (a compromised host controls its own alert text), webhook payloads, and agent-written notes re-consumed via the retro→recon loop. Requirements:
- **Provenance-tag** host-originated and externally-originated content wherever it is stored and retrieved (Notes frontmatter, Board ticket fields).
- **The auto-approve lane is unavailable to any plan whose inputs include host-originated content.** A steered agent must never reach policy-approved Gateway execution with zero human review; provenance decides lane eligibility, not the agent.
- Prompt injection is a **mandatory threat-model axis for every Critical-infra app** (PROCESS.md Stage 5).

**Policy-plane change control.** Scopes protect who may call APIs — not the policy *data* those APIs serve. One poisoned CMDB row (tier→auto, window widened, task type reclassified "reversible") silently deletes the human gate while every scope check passes. Therefore: any **gate-weakening edit** to CMDB policy or the shared registries (task-type registry, runbook catalog policy attributes — owners in `context/CONTRACTS/README.md`) requires **tamper-evident, step-up-confirmed change control** on the operator path, mirroring the Gateway's audit-chain rigor.

## 13. Authoritative cross-cutting specs & contracts *(added 2026-07-01)*

These bind every app session; they exist so 13 components built in separate sessions actually interoperate. Read the relevant ones before designing any schema or API:

| Doc | Authority over |
|---|---|
| `context/specs/IDENTIFIERS.md` | every cross-app ID: who mints it, format, validation posture |
| `context/specs/TICKET_STATE_MACHINE.md` | ticket lifecycle + ceremony phase (Board-owned; supersedes all prose restatements) |
| `context/specs/DEPLOYMENT.md` | networks, container names/ports, store ownership, env/volume conventions; cited by Stage-4 exit criteria |
| `context/CONTRACTS/` | frozen per-seam consumer contracts + the three shared-registry owner assignments |

**The seam rule:** assumptions in one app's research/planning prose do **not** bind another app. Only a frozen contract in `context/CONTRACTS/` (or a spec above) binds both sides. Gap tracking and deferred work: `context/GAP_REMEDIATION.md`; the underlying review: `context/GAP_ANALYSIS_2026-07-01.md`.
