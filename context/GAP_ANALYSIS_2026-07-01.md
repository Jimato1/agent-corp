# Gap Analysis — Architecture Docs Review (2026-07-01)

> Produced by a multi-agent research run: 6 parallel doc-cluster readers → 7 gap-hunting lenses (agent-runtime, data-resilience, ops-deploy, quality-evals, security-identity, human-factors, cross-app-contracts) → dedup → adversarial verification of every candidate against the full doc tree → synthesis. 37 raw candidates → 30 deduped → **27 confirmed, 3 refuted as already covered**.

Grouped by theme, ranked by severity within each group. The dominant pattern: the docs specify the **server half** of nearly everything — surfaces, constraints, guards — while the **client half** (the agents themselves, the machine they run on, the seams between apps, and the human when absent) is unowned.

---

## 1. The missing workforce layer (the one critical gap, plus its satellites)

### 1.1 CRITICAL — No 11th component: the agent runtime does not exist on paper
Every doc describes what agents consume (Board claims, MCP tools, auth tokens) and what constrains them (leases, heartbeats, spawn caps, budgets), but no app or platform layer owns the agent processes: nothing specifies what polls the Board, runs the agent loop, emits the heartbeats MC's liveness model requires, respects a drain, or restarts a crash. This absent component is also where per-agent signing keys ("the true root credential," mandated TPM-sealed) must physically live, and it swallows the entire local-model supply chain — a poisoned or swapped model compromises every role at once, including the Adversarial Reviewer. Every guardrail currently has a server half and a missing client half, and Stage-7 demos ("kill switch drains the fleet") cannot even be staged. **Fix:** add an `agent-runtime` platform component to ARCHITECTURE.md §4 (Critical-infra — it holds keys and hosts the model stack) with its own CLAUDE.md and pipeline; insert it into the build order before mission-control; resolve auth's open question 3 against it.

### 1.2 HIGH — No model-serving / inference architecture despite "local models" being a locked decision
"Specialized models per role" and "GPU is the bottleneck" are locked, yet no doc names an inference server, model-per-role matrix, quantization, or measured concurrent-session capacity — and §9's tech leanings cover everything except the one technology the premise rests on. The ceremony's feasibility is a direct function of inference concurrency: if the GPU sustains 1–2 sessions, "independent drafts before cross-talk" silently serializes and the anti-anchoring property degrades unnoticed. **Fix:** a model-serving research artifact (server, role matrix, GPU/RAM budget, measured concurrency), with ceremony parameters (huddle size, round caps) explicitly derived from it.

### 1.3 HIGH — The core bet — local models reliably driving the hardened MCP/OAuth surface — is unvalidated
Every app is building `additionalProperties:false` tool schemas, multi-step claim→work→heartbeat→transition loops, and structured templates on the unstated assumption that a local model can drive them; no spike, benchmark, or fallback exists, and no doc owns validating this before the full-suite build completes. (The token juggling itself is deterministic harness plumbing per auth's PLAN — the bet is the model-side reasoning loop.) If it fails, the "confident garbage / never terminating" failure mode lands at every tool boundary after the surfaces are built. **Fix:** an early feasibility spike — a candidate model driving a mock Board+Notes MCP loop end-to-end — gating tool-surface design.

### 1.4 HIGH — Personas, prompts, and role↔model bindings are unversioned safety controls with no home
Role prompts are load-bearing behavioral contracts (AR's forced dissent, independent drafting, role↔scope mappings), yet no doc says where they live, who may edit them, or how a change is tested before hitting a continuously-running fleet — no diffable artifact, no baseline suite, no rollback, and the 7-stage pipeline covers all 11 containers but not the actual workers. Safety is structurally held elsewhere (SoD is mechanical), so a degraded prompt hurts plan quality, not root access — but the whole workforce layer lacks any change control. **Fix:** declare agent definitions versioned, git-tracked, operator-owned config with their own pipeline and a per-role behavioral regression suite gating any prompt/model change.

### 1.5 MEDIUM — No agent session lifecycle: spawn, resume after crash/kill/context exhaustion
The server side of failure is well designed (lease reaping, fencing, kill epochs), but nothing says how a session is started per claimed ticket, whether sessions are long-lived or per-ticket, or how a context-exhausted agent resumes (re-read Notes trail? discard partial work?). The dynamic-spawning-vs-hardware-keys tension largely dissolves (spawned *tickets* are claimed by a standing pool; auth forbids agent-created principals), but session lifecycle itself has no owner. **Fix:** a spawn→enroll→claim→heartbeat→terminate/resume contract jointly owned by the new runtime layer and auth.

---

## 2. Data durability & disaster recovery

### 2.1 HIGH — No backup/restore strategy; the "DBs are rebuildable indexes" invariant is false for most stores
The invariant holds only for Notes: Board's SQLite (approvals, leases, ceremony_events — "the source of truth"), Chat's canonical record, Drive blobs, Vault secrets, and the hash-chained audit tables are all non-rebuildable, several load-bearing for SoD. Nothing specifies backup mechanism, cadence, or restore consistency (restoring Board to yesterday while the audit chain and real host state are current silently corrupts the SoD record), and the "non-negotiable" git audit trail is a local `.git` with no remote — one disk failure destroys the source of truth and the reversibility history together. **Fix:** a cross-cutting data-durability section in ARCHITECTURE.md classifying each store canonical-vs-rebuildable with per-store backup + a git remote for Notes, plus a restore-consistency procedure, wired into Stage-7 exit criteria (restore actually drilled).

### 2.2 HIGH — Vault secret-material DR is unaddressed and no pipeline stage will force it
The Vault will hold root credentials for the ~20-host fleet plus an SSH CA private key (Gateway research bakes cert-signing into the SoD chain), yet nothing covers seal/unseal, recovery-key custody, encrypted-backup handling, or CA-key escrow — losing it strands the fleet's trust anchors. Vault's charter lists rotation/audit but not durability, and the Critical-infra rigor row omits key-material DR, so a diligent Stage 1–5 run would never surface this. **Fix:** add secret-material DR to Vault's CLAUDE.md charter and the Critical-infra rigor row in PROCESS.md.

### 2.3 HIGH — Total failure of the corporation's own host — including mid-destructive-action — has no story
The whole suite runs on one homelab machine that is itself executing destructive actions on the fleet; the docs handle logical failure well but never machine failure: what state a remote host is left in when the Gateway box dies mid-playbook, how a restarted Gateway reconciles in-flight runs, or RPO/RTO for the corporation itself. The bootstrap paradox is unnamed: the corporation maintains the fleet, but nothing maintains the corporation. The 2am procedure exists only as disconnected fragments (SAFE-STOPPED, break-glass, kill semantics, boot order). **Fix:** an ops/DR doc — host rebuild procedure, a Gateway boot-time orphaned-run rule (escalate, never resume blind — this is a safety design input Gateway planning must carry), RPO/RTO targets, and one ordered stop-inspect-restore runbook rehearsed in Stage 7.

### 2.4 MEDIUM — No schema-evolution convention across ~10 databases, including hash-chained tables
No migration tool, `schema_version` discipline, or rule for evolving append-only hash-chained/Ed25519-signed audit tables without breaking chain verification (uniquely migration-hostile if not designed up front); the built auth store sets no `user_version`. Most PLAN.md files are still stubs, so the convention can land before schemas lock. **Fix:** a shared migration convention plus an explicit chain-epoch/re-anchor design for audit tables, added to cross-cutting mechanics before Stage-2 planning hardens schemas.

---

## 3. Suite operations & deployment

### 3.1 HIGH — No suite-level composition or shared-infrastructure spec
Nothing defines how 11+ containers compose into one system: no root compose, no shared-vs-per-app Postgres/Redis decision, no env-var/volume conventions — and divergence is already occurring in built apps (pdf-reader invented a `proxy_internal` network instead of proxy PLAN's `edge`; the auth-verify port exists as three conflicting values). Stage 4's exit criterion ("runs behind the proxy, authenticates via auth") is untestable as written. **Fix:** promote proxy PLAN §10's topology into a root deployment spec pinning networks, names/ports, shared-store ownership, and env conventions, referenced by every app's Stage-4 exit criteria.

### 3.2 MEDIUM — No independent health monitoring: all watchers are inside the thing being watched
MC, Chat, auth, and the proxy monitor the suite but are suite components behind the accepted-SPOF proxy and fail-closed auth; if Chat dies, escalations silently stop — the exact silent-failure mode the architecture warns against — and nobody catches MC going stale. Outages fail safe, so the cost is delayed awareness, not unsafety. **Fix:** a minimal out-of-band watchdog (independent uptime check pushing via the already-planned ntfy sink, not routed through the suite); the log/metrics-stack choice is already deferred with an owner.

### 3.3 MEDIUM — No upgrade/rollout procedure for the apps themselves
The suite has an elaborate procedure for patching the fleet and none for patching itself: restarting the Board reaps live leases, restarting the Gateway mid-run recreates exactly the mid-dpkg interruption its kill switch avoids, and the quiesce lever (G2) is framed only as an emergency posture. **Fix:** a maintenance runbook — documented quiesce mode (drain claims, wait for Gateway idle), per-app restart-safety notes — needed before continuous operation begins.

### 3.4 MEDIUM — No unified bootstrap / first-run sequence
First-run obligations exist as fragments across five clusters (auth CV-1..10, proxy close-outs, six JC checkpoints, gateway's per-host prerequisites) with no single ordered procedure, and state-seeding (agent identities, Vault init, CMDB fleet population, first standing epic) appears nowhere. Given "full suite before first run," day one is a long ordering-sensitive manual procedure that currently doesn't exist. **Fix:** one first-run runbook ordering all close-outs, prerequisites, and seeding, ending in a supervised canary end-to-end run.

---

## 4. Security boundaries beyond the SoD quartet

### 4.1 HIGH — No LLM-input trust boundary: prompt injection can reach the auto-approved path
Untrusted content flows continuously into the models (Wazuh alert fields originating on potentially-compromised hosts, webhook payloads, agent-written notes re-consumed via retro→recon), and no doc treats any of it as adversarial input — the only injection coverage anywhere is Jinja2/shell/header. The human gate is not universal (CMDB auto-tier, straight-to-execute lane), so a steered agent can reach policy-approved Gateway execution with zero review; the harm is bounded (only admin-vetted runbooks on low-tier hosts) but real. **Fix:** a suite-wide untrusted-content policy (provenance-tag host-originated text; auto-approve lane unavailable for plans whose inputs include it) plus prompt injection in every Critical-infra threat model.

### 4.2 HIGH — East-west channel security is unspecified — including the Vault→Gateway plaintext handoff
Proxy PLAN puts every app on one flat `edge` network and defers TLS only for the proxy's own hops, so the single most sensitive flow in the system — Vault releasing plaintext host credentials to the Gateway — would traverse cleartext HTTP on a segment shared with every Standard-class container. Caller impersonation is already blocked at layer 7 by auth; the gap is response confidentiality, server authenticity, and network placement. **Fix:** a network-security spec — per-tier networks (edge / apps / a credential network containing only vault+gateway) plus mutual auth on the Vault→Gateway hop — stated as a shared invariant before vault planning starts.

### 4.3 MEDIUM — Policy-plane data has no change control
Scopes protect who may call the APIs, but not the data those APIs serve: one poisoned CMDB row (tier→auto, window widened, task type reclassified "reversible") silently deletes the human gate while every scope check passes; the task-type registry and playbook catalog exist only in one consumer's research prose with no owning app. Agent-side poisoning is already structurally blocked (operator-only mutation, PDP-gated scopes), so this is about operator-path rigor. **Fix:** assign owners for all three policy artifacts and require tamper-evident, step-up-confirmed change control for any gate-weakening edit, mirroring the Gateway's audit-chain rigor.

### 4.4 MEDIUM — Auth outage vs the autonomous fleet: the escalation invariant goes circular
With 2-minute token TTLs, an auth blackout removes every agent's ability to act within minutes — and the mandated failure behavior (file an escalation, post to Chat) is impossible because Board and Chat sit behind auth. No doc covers agent-side degraded behavior (backoff vs a re-mint retry storm on the recovering IdP), reaper handling of correlated fleet-wide heartbeat loss (outage ≠ agent death), or post-restore re-entry. **Fix:** a fleet degraded-mode contract (jittered backoff, local quiesce, outage-aware reaper, ordered re-entry), writable now since the reaper and runtime are undesigned.

---

## 5. Quality & learning — the named failure mode with no instrument

### 5.1 HIGH — "Quality" has no measurement: no eval harness, no drift detection
§2 says guard "termination and quality, not spend," then guards only termination; quality's sole mechanism is the operator manually clearing needs_review — a scaling bottleneck with no aggregate signal. There are no golden tasks, no rubrics, no per-agent track record; the AR "evaluated on holes found" names no evaluator or score store; and nothing re-certifies a role after a model swap or re-quantization — a red-team agent made 10% more agreeable produces dissent theater that satisfies the review→backlog guard while MC shows a healthy, converging fleet. Retrofitting this touches MC's data model, Board's schema, and Notes templates — all about to be planned from stubs. **Fix:** an eval layer — per-note-type rubrics, an offline golden-task suite, per-agent quality records in MC, an AR scoring mechanism, and a scheduled re-certification kickoff (including a planted-flaw test for the AR) gating any model/prompt change.

### 5.2 HIGH — The retro→recon loop is retrieval-hopeful, not closed
ARCHITECTURE.md asserts the learning loop is closed, but application of a lesson depends on a future agent happening to issue an FTS query that surfaces it — the docs' own example ("respect retro warnings, e.g. a host that hung on reboot") has no enforcement path. There is no lesson schema, lifecycle (supersede/expire), growth control, or metric (repeat-incident rate), so "improve over time" is unfalsifiable, and the AR-veto mechanism as researched presupposes lesson mechanics that don't exist. **Fix:** a structured lesson type with scope keys (host, package, task-type) that the Board *pushes* into matching future tickets/ceremonies, plus lifecycle rules and a repeat-incident metric.

### 5.3 MEDIUM — The ceremonies themselves are never rehearsed before touching real hosts
The deliberation layer is "new behavior, not new containers," so no app's pipeline owns testing it: nothing verifies a full ceremony run by real local models converges within its timebox on a sane plan, or fails safe when a role agent stalls mid-huddle — and under "full suite before first run," the first-ever complete ceremony executes against 20 real servers. Blast radius is already contained (approval gates, canary, kill switch), so the cost is wasted cycles, not unsafe action. **Fix:** codify the §7 reference scenario as a fixture (mock Wazuh, synthetic fleet, canned CMDB) and gate the first live run on convergence and fail-safe criteria.

---

## 6. Cross-app contracts — the big-bang integration risk

### 6.1 HIGH — No inter-app contract layer; cross-app obligations live only in the consuming app's research prose
Each app builds in a session that loads only shared context plus its own subtree, yet Gateway assigns CMDB duties CMDB's docs never mention, bakes HashiCorp-specific Vault semantics into the SoD chain while vault has zero research, and auth defines the scope→tool map for 11 components none of which have seen it — assumptions that cannot bind. Three load-bearing shared registries (task-type, runbook catalog, plan-id→playbook allowlist) have no owner app at all. The two working precedents (proxy's OBSERVABILITY.md, auth's forward-auth contract) prove the pattern; it covers 2 of dozens of seams. **Fix:** a `context/CONTRACTS/` layer of frozen consumer-contract docs, one per seam plus homes for the three registries, required reading for both sides' sessions.

### 6.2 HIGH — No shared identifier scheme or reference-integrity rules
ticket_id, host_id (and its Wazuh agent.id mapping), agent_id/sub, plan-hash, run_id, and approval_id all cross app boundaries, but no doc defines who mints each, its format, or whether references are validated or opaque — Drive's open question and the Board-vs-Gateway fencing-counter ownership inconsistency (auth PLAN §5.3 vs board research) are this gap surfacing locally. Eleven independently-built apps will store mutually unjoinable strings, breaking audit correlation and the SoD binding of approval to exact (host_id, plan-hash). **Fix:** a one-page shared-identifier spec: minting app, format, and validation rule per ID.

### 6.3 HIGH — The ticket lifecycle and ceremony state have no single machine-readable authority
The most-consumed shared datatype exists only as prose with live drift: auth's already-built PDP hard-codes states (executable, executing) that appear nowhere in ARCHITECTURE.md §5's lifecycle, Board research floats a "verifying" state and an unresolved cancelled-vs-failed terminal, and ceremony phase has two declared sources of truth (Board's ceremony_events vs Notes frontmatter) with authority unassigned. Drift lands directly on safety-relevant logic — which states the PDP treats as "approved." **Fix:** one Board-owned state-machine spec (states, transitions, who may cause each, terminal set, single ceremony-phase authority) that all consumers cite by reference.

### 6.4 MEDIUM — No API versioning or compatibility policy for sequentially-built apps
Apps are built months apart with integration only at the end, yet nothing defines when an API freezes, how breaking changes version, or that apps emit machine-checkable contract artifacts — ironically pdf-forge, outside the suite process, is the only component with a v1/v2 policy and generated OpenAPI. The proxy↔auth header-scrub coupling already demonstrates the failure mode, guarded by one test the docs call fragile. **Fix:** a PROCESS.md rule — Stage-4 exit publishes a versioned OpenAPI + MCP schema artifact, downstream pins to it, each seam gets a contract test.

---

## 7. The human half of human-in-the-loop

### 7.1 MEDIUM — Single-operator SPOF: no absence, incapacitation, or succession model
Every layer hard-codes exactly one human (one passkey, one ntfy topic, one break-glass factor), but the system is continuous: nothing says what happens when the operator is away a week (agents pause? queues cap?), and nothing covers permanent unavailability — how a second person recovers passkey-bound auth, TPM-sealed keys, or Vault contents. Defaults stall safe rather than endanger, so this is additive, not rework. **Fix:** an operator-availability decision — explicit away-mode (reversible/auto-tier work only, spawn throttles), a delegate role in auth's model, and a sealed succession runbook.

### 7.2 MEDIUM — Notifications reach the phone, but no action is possible off-LAN
Chat solves push delivery deeply, yet every actuator (approve, halt, break-glass) is LAN-bound by split-horizon DNS, origin-bound passkeys, and DPoP sessions — the canonical failure is a priority-5 escalation at 2am the operator can see but cannot act on. The proxy's SUITE_DOMAIN-identical-across-modes decision means a same-origin VPN retrofit is additive rather than a rewrite. **Fix:** decide the minimum off-LAN action set (ack, approve, halt) and the access mechanism (WireGuard/Tailscale into the edge network) before auth/proxy Stage 5 hardens.

### 7.3 MEDIUM — No fleet/host onboarding or retirement procedure
Gateway research assumes substantial per-host preparation exists fleet-wide (restricted keys, sudoers allowlists, snapshot tooling, Wazuh agent, CMDB record), but no doc describes the workflow from "racked" to "safely actionable," so hosts enter half-provisioned and Gateway safety assumptions fail silently (a Debian host without snapshot tooling has no mandatory rollback path). **Fix:** give CMDB an explicit host lifecycle — enroll → verify prerequisites → eligible — with the Gateway refusing hosts not marked prerequisite-verified, plus retirement.

---

## Already well covered

The adversarial pass refuted three candidate gaps outright, and the docs deserve credit for them: **approval throughput and fatigue** is genuinely designed (CMDB auto-vs-ask tiers, Board's standard-change catalog and lanes, MC's bulk-triage queue with noise control, explicit rubber-stamp-containment and alert-fatigue open questions); **mis-approval recovery** is strong (execute-time live re-evaluation at the Gateway, single-use `consume_approval` state machine, graduated kill levels, surgical per-principal revocation); and **inter-app event propagation** is a resolved decision (pull-primary + SSE, no event bus, with documented fallbacks). More broadly, the structural safety core is the project's best work: segregation of duties is mechanical rather than prompt-dependent, forced dissent and timeboxes are server-side guards, reversibility is derived not reasoned, and the two contract precedents (auth's forward-auth spec, proxy's OBSERVABILITY.md) show the team already knows how to freeze a seam — the gaps above mostly ask that existing patterns be generalized, not invented.

## Recommended closing order

1. **Now, before any more planning locks (cheap, pure docs):** shared-identifier spec (6.2), Board-owned state-machine authority (6.3) — auth's PDP already encodes drift — contracts layer + registry owners (6.1), schema-migration convention (2.4), and the root deployment spec (3.1), where divergence is already occurring in built apps.
2. **Architecture amendments (one editing pass):** add the agent-runtime component (1.1) to §4/build order, the data-durability section + git remote (2.1), the east-west network invariant (4.2), the untrusted-content policy (4.1), and Vault DR + policy change control in the Critical-infra rigor row (2.2, 4.3).
3. **Early spikes (de-risk the core bet before more surface is built):** local-model MCP feasibility spike (1.3) and the model-serving/concurrency sizing artifact (1.2) — these can invalidate ceremony and tool-surface designs, so run them before Board/Notes Stage 2 completes.
4. **Design into the upcoming Stage-2 rounds:** quality/eval layer (5.1) and lesson-closure mechanics (5.2) into MC/Board/Notes planning; agent lifecycle + degraded-mode contract (1.5, 4.4) into the new runtime's pipeline; persona change control (1.4); Gateway orphaned-run reconciliation rule (2.3) into Gateway planning; host lifecycle (7.3) into CMDB research.
5. **Before first continuous run (assembly, not design):** ceremony fixture (5.3), bootstrap runbook (3.4), maintenance/quiesce runbook (3.3), incident/DR runbook + rehearsal (2.3), out-of-band watchdog (3.2), API-versioning PROCESS rule (6.4), operator-absence and remote-action decisions (7.1, 7.2).
