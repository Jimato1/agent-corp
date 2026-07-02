# CLAUDE.md — Agent Runtime (`agent-runtime`)

> Read `/_context/ARCHITECTURE.md` and `/_context/PROCESS.md` first. This file only covers what is specific to the Agent Runtime. Run the 7-stage pipeline; this platform layer is **Critical-infra**, so Stages 5 and 7 have teeth.

## Identity

The Agent Runtime is **the workforce** — the platform layer that hosts the agent processes themselves. Every other component defines a surface agents *consume* (Board claims, MCP tools, auth tokens) or a constraint *imposed on* them (leases, heartbeats, spawn caps, WIP limits, kill signals); this is the component that owns the **client half** of all of it: the process that polls the Board, claims tickets, runs the agent loop, writes to Notes, emits heartbeats, obeys drains, and restarts crashes. Until this layer exists, every guardrail in the suite has a server half and no client half, and "the kill switch drains the fleet" cannot even be staged.

(Added 2026-07-01 to close gap 1.1 — see `context/GAP_ANALYSIS_2026-07-01.md` and `context/GAP_REMEDIATION.md`.)

## Risk class: Critical-infra

Two independent reasons, either sufficient:

1. **It physically holds the per-agent signing keys** — the credential auth's settled decisions call "the true root credential," mandated TPM-sealed/non-exportable for any principal holding `gateway:execute` (auth settled decision #6). The keys live *here*, in the runtime's containers, on the runtime's hardware.
2. **It hosts the local model stack** — a supply-chain surface. A poisoned or swapped model compromises every role at once, *including the Adversarial Reviewer*, defeating the deliberation layer's structural quality defenses from below.

## Its place in the segregation-of-duties chain

The runtime is not one of the four action-holders (Board / CMDB / Vault / Gateway), and it must never become one: it runs the agents, and agents hold no credentials and cannot approve their own work. The runtime inherits that property — it holds *identity* key material (so agents can authenticate as themselves) but never *host* credentials (Vault→Gateway only), and it has no approval or execution authority. A fully compromised runtime can propose anything and still cannot get root on a fleet host.

## Responsibilities (the client half of every guardrail)

- **Agent loop & scheduling:** poll the Board, perform atomic claims, execute work steps, write findings to Notes, file escalations. One loop definition; per-role behavior comes from versioned agent config (open decision 5).
- **Heartbeats & liveness:** emit the heartbeats Mission Control's liveness model requires; a runtime-crashed agent is distinguishable from a wedged one.
- **Drain / kill compliance:** the client half of the global kill switch. On kill/drain: stop claiming, checkpoint or abandon in-flight work per policy, report drained. This is what makes the Stage-7 "kill switch drains the fleet" demo stageable.
- **Key custody:** provision, seal, and use per-agent signing keys (TPM-sealed per auth decision #6); keys are non-exportable and never leave the runtime.
- **Model hosting:** run the local inference stack; own model provenance (checksums, pinned versions) as a supply-chain control.
- **Session lifecycle:** spawn, enroll, resume, and terminate agent sessions (open decision 3).

## Agent surface (MCP) — inverted

Agents do not call the runtime; the runtime *runs* agents. Its control surface faces the operator and Mission Control (drain, restart, fleet status). Whether that surface is MCP, plain API, or MC-only is a research-stage decision.

## Human surface (UI)

Likely thin — fleet process status surfaced *through* Mission Control rather than a rich UI of its own (MC is the cockpit; this is the engine room). Validate in research; the UI stage artifact may be largely N/A like the proxy's.

## OPEN decisions owned here (early research obligations — deliberately NOT solved in this scaffold)

1. **Model-serving / inference sizing artifact (gap 1.2):** which inference server; the per-role model matrix; quantization; GPU/RAM budget; **measured** concurrent-session capacity. Ceremony parameters (huddle size, round caps, "independent drafts before cross-talk") must be *derived from the measured concurrency*, not assumed.
2. **Local-model-drives-MCP feasibility spike (gap 1.3):** a candidate local model driving a mock Board+Notes MCP loop end-to-end (claim → work → heartbeat → transition, structured outputs against strict schemas). **This spike gates Board/Notes Stage 2** — it can invalidate tool-surface designs, so it runs before they harden.
3. **Agent session lifecycle (gap 1.5, jointly with auth):** the spawn → enroll → claim → heartbeat → terminate/resume contract. Long-lived sessions vs per-ticket; how a context-exhausted agent resumes (re-read its Notes trail? discard partial work?); crash-restart semantics against the Board's lease model.
4. **Fleet degraded-mode contract for an auth outage (gap 4.4):** with 2-minute token TTLs, an auth blackout de-authorizes the whole fleet in minutes, and the mandated failure behavior (file an escalation, post to Chat) is circular — those sit behind auth. Define: jittered backoff (no re-mint retry storm on the recovering IdP), local quiesce, an outage-aware reaper posture (correlated fleet-wide heartbeat loss ≠ mass agent death), ordered re-entry.
5. **Persona / prompt / role↔model config management (gap 1.4):** versioned, git-tracked, operator-owned agent definitions (role prompts, model bindings, scopes) with a per-role behavioral regression suite gating any prompt or model change. Role prompts are load-bearing behavioral contracts (the Adversarial Reviewer's forced dissent, independent drafting); today they have no home, no diff, no rollback.

> Resolving 3, 4, and 5 interacts with **auth's session/identity model** (auth research open question 3 — where keys live, who provisions and rotates them — and settled decisions #6/#7). Design jointly; do not fork assumptions.

## Definition of done (Stage 7)

- The kill-switch drain demo is stageable end-to-end: MC flips the switch → the runtime stops claiming, drains, and reports drained → the Gateway chokepoint confirms nothing new arrives.
- Written proof agent processes never hold plaintext host credentials and signing keys are non-exportable from the runtime.
- Heartbeat/liveness contract demonstrated against MC under crash, wedge, and drain.
- Model provenance controls demonstrated (pinned versions, checksum verification at load).
- Critical-infra security stage cannot exit on a light checklist (§8).
