# PROCESS.md — The 7-Stage Build Pipeline (read before working any app)

Every app runs through the same seven stages **in the same order**. Uniform sequence is itself scaffolding — it makes each app's Claude Code session predictable. What flexes is the *rigor within each stage*, set by the app's **risk class** (Safe / Standard / Critical-infra — see ARCHITECTURE.md §8).

Each stage has an explicit **artifact** and **exit criteria**. Do not advance until the exit criteria are met. Each stage runs in ultracode in Claude Code.

---

## Stage 1 — Research
**Purpose:** Understand full desired functionality before designing anything. Search the web for how comparable tools work; study any real external system this app integrates with (e.g. for the Gateway/CMDB: the Wazuh API, SSH/exec safety patterns, secret-brokering patterns).
**Artifact:** `research/RESEARCH.md` — feature landscape, integration facts (with sources), open design questions, and recommendations for any decisions ARCHITECTURE.md deferred to research.
**Exit criteria:** every deferred decision relevant to this app has a researched recommendation; all external-system facts are cited, not assumed.

## Stage 2 — Planning
**Purpose:** Turn research into a concrete implementation plan. **Run the plan through an adversarial review** (a critic pass that attacks the plan's premises and blast radius) before accepting it — this mirrors the deliberative principle the product itself runs on.
**Artifact:** `planning/PLAN.md` — data model, API surface, MCP tool list, UI surface, sequencing, and the residual risks the adversarial pass raised.
**Exit criteria:** data model and both surfaces (MCP + UI) are specified over one shared state; adversarial concerns are resolved or explicitly accepted with reason.

## Stage 3 — UI/UX
**Purpose:** Produce a frontend spec that can be handed to **Claude Design** and brought back for implementation.
**Artifact:** `ui/UI_SPEC.md` + design references — screens, states, and the two-view split (what the human sees vs. what the agent surface exposes). Reference the shared design tokens / frontend-design guidance.
**Exit criteria:** every human-facing screen and state is specified; the spec is self-contained enough to design from without re-reading the whole architecture.

## Stage 4 — Build
**Purpose:** Implement, **API-first**: core service/API → MCP surface → UI. The MCP surface and UI are siblings over one API; neither is downstream of the other.
**Artifact:** working containerized app with both surfaces.
**Exit criteria:** the app runs in its own container behind the proxy, authenticates via the auth gateway, and both surfaces exercise the same state — **verified against `context/specs/DEPLOYMENT.md`** (networks joined, compose/DNS name, internal port, auth endpoint), not against the app's own restatement of the topology.

## Stage 5 — Security hardening
**Purpose:** Close the attack surface. **Rigor scales hard by risk class.**
- *Safe:* input validation, authz on every endpoint, no secrets in logs.
- *Standard:* the above + authz on the MCP surface (agents are scoped users), rate/WIP limits, audit logging of state changes.
- *Critical-infra:* the above + **prove the segregation-of-duties property holds** (this component cannot cause a destructive action alone), **agent never receives plaintext credentials**, the **kill switch physically halts action at this chokepoint**, per-host mutex correctness, and complete per-command audit. Red-team the app itself. Additionally *(added 2026-07-01, gaps 4.1/2.2/4.3)*: **prompt injection is a mandatory threat-model axis** (host-originated text is adversarial input — ARCHITECTURE.md §12); **secret-material DR** where the app holds key material (seal/unseal, recovery-key custody, CA-key escrow — the Vault especially); and **policy-plane change control** where the app serves policy data (tamper-evident, step-up-confirmed gate-weakening edits — CMDB especially).
**Artifact:** `security/THREAT_MODEL.md` + hardening changelog.
**Exit criteria:** for Critical-infra apps, a written proof/walkthrough that no single-component or agent-only path reaches a destructive action.

## Stage 6 — Optimization
**Purpose:** Performance and resource use, tuned for **local compute** (the bottleneck is GPU/concurrency/wall-clock, not API spend). Index rebuild speed, query performance, concurrency safety under multiple agents.
**Artifact:** `optimization/NOTES.md` — before/after measurements.
**Exit criteria:** no correctness regressions; concurrency behavior verified under simulated multi-agent load.

## Stage 7 — Verification
**Purpose:** Confirm the app meets its spec **and** the shared invariants (root CLAUDE.md). Prefer **external verification** where a verifier exists (e.g. dry-run the Gateway against a canary host and confirm via Wazuh).
**Artifact:** `verification/CHECKLIST.md` — spec conformance + invariant conformance + external-verification evidence.
**Exit criteria:** all invariants pass; for Critical-infra, external verification evidence is attached and the kill switch is demonstrated to halt action. For any app owning a **canonical store** (ARCHITECTURE.md §10): **a backup restore is actually drilled** and the app's stated restore-consistency rule is demonstrated, not asserted.

---

### Risk-class summary

| Stage | Safe | Standard | Critical-infra |
|-------|------|----------|---------------|
| Research | integration facts if any | + deferred-decision recommendations | + external-system API + exec-safety study |
| Planning | plan | + adversarial review | + adversarial review of blast radius |
| UI/UX | standard | standard | + operator-audit/kill-switch surfaces |
| Build | standard | + scoped MCP authz | + brokered-action-only agent surface |
| Security | light | + MCP authz, audit | + segregation proof, no-plaintext, kill-switch, mutex, **prompt-injection axis, secret-material DR, policy-plane change control** |
| Optimization | standard | + multi-agent concurrency | + concurrency under contention |
| Verification | spec | spec + invariants | + external-verification evidence + kill-switch demo + **restore drill for canonical stores** |
