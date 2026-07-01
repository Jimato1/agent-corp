# GAP_REMEDIATION.md — Tracking the 2026-07-01 gap review

> Source review: `context/GAP_ANALYSIS_2026-07-01.md` (27 confirmed gaps). This doc tracks: what the 2026-07-01 docs+scaffold pass **closed**, what it **recorded for reconciliation** in components it was forbidden to touch, and what it **deferred with a trigger**. Anyone reading this sees the full remaining map. Gap numbers throughout refer to the gap-analysis doc.

## 1. Closed by this pass (docs + scaffold only; no pipeline stages run)

| Gap | What was done | Where |
|---|---|---|
| 1.1 agent runtime missing (CRITICAL) | 11th component scaffolded: platform layer, Critical-infra; inventory row + client-half note; build order (before `mission-control`) | `platform/agent-runtime/` (CLAUDE.md + 6 stage stubs + Dockerfile + src/), ARCHITECTURE.md §4/§8, root CLAUDE.md |
| 6.2 shared identifiers | one-page authority: minting app, format, validation posture per cross-app ID; fencing-counter owner assigned (Board) | `context/specs/IDENTIFIERS.md` |
| 6.3 state-machine authority | Board-owned authoritative superset: 11 states, per-transition authority, terminal set, ceremony-phase single authority (Board `ceremony_events`); resolves `verifying` + `cancelled`-vs-`failed` | `context/specs/TICKET_STATE_MACHINE.md`, ARCHITECTURE.md §5 pointer |
| 6.1 contracts layer | `context/CONTRACTS/` established (seam rule + index of known seams); the three ownerless registries assigned: task-type→CMDB, runbook catalog→Gateway (policy attrs→CMDB), plan→playbook allowlist→Board | `context/CONTRACTS/README.md`, ARCHITECTURE.md §13 |
| 3.1 root deployment spec | networks (`edge`/`creds`/`data_<app>`), names+ports, store ownership, env/volume conventions, boot order; Stage-4 exit cites it; divergences resolved on paper (AUTH_VERIFY_PORT=8089; network=`edge`) | `context/specs/DEPLOYMENT.md`, PROCESS.md Stage 4 |
| 2.1 data durability | canonical-vs-rebuildable classification (invariant scoped honestly to Notes); per-store backup requirement; **required git remote** for Notes; restore drill as Stage-7 exit | ARCHITECTURE.md §10, PROCESS.md Stage 7 + rigor table |
| 4.2 east-west network | per-tier networks; `creds` = vault+gateway only; mutual auth on the Vault→Gateway hop; stated as shared invariant Vault/Gateway planning inherit | ARCHITECTURE.md §11, `context/specs/DEPLOYMENT.md` §1 |
| 4.1 LLM-input trust boundary | untrusted-content policy: provenance tagging; auto-approve lane unavailable when inputs include host-originated content; prompt injection mandatory in Critical-infra threat models | ARCHITECTURE.md §12, PROCESS.md Stage 5 + rigor table |
| 2.2 Vault secret-material DR | added to the Critical-infra rigor bar (seal/unseal, recovery-key custody, CA-key escrow) so Stages 1–5 must surface it | PROCESS.md Stage 5 + rigor table, ARCHITECTURE.md §10 |
| 4.3 policy-plane change control | tamper-evident, step-up-confirmed change control required for gate-weakening CMDB/registry edits | ARCHITECTURE.md §12, PROCESS.md Stage 5 |
| 1.2/1.3/1.5/4.4/1.4 (workforce satellites) | NOT solved — explicitly assigned as the agent-runtime's owned open decisions / early research obligations, with the 1.3 spike gating Board/Notes Stage 2 | `platform/agent-runtime/CLAUDE.md` §OPEN |

**Settled decisions preserved (flags, not relitigations):**
- ARCHITECTURE §5's locked lifecycle shorthand stands; the state-machine spec is its authoritative *superset* (names the states auth's built PDP already assumed). Flagged, additive.
- Proxy PLAN §10's single `edge` network was a settled Stage-2 plan; §11's tiering *adds* the `creds` network without changing anything proxy already built. Proxy inherits the addition when vault/gateway build (reconciliation R5).
- Vault's inverted two-view rule, the SoD quartet, markdown-is-truth (now precisely scoped), and all auth SETTLED DECISIONS #1–12 are untouched.

## 2. RECONCILIATION items (components with active work in flight — fix in THEIR next sessions, not here)

| # | Component | What to reconcile | Against |
|---|---|---|---|
| R1 | **auth** (PDP, PLAN §5.3/§5.5) | hard-coded `executable`/`executing` state vocabulary → adopt `approved`/`executing` naming and cite the spec (semantics already match: PDP permits `gateway:execute` only in `approved`; `consume_approval` single-use) | `context/specs/TICKET_STATE_MACHINE.md` §1/§4 |
| R2 | **auth** (PLAN §5.3) | fencing-counter ownership drift vs Board research → counter is **Board-minted** (lease issuer); PDP checks presence/freshness only | `context/specs/IDENTIFIERS.md` (fencing row) |
| R3 | **proxy** | `AUTH_VERIFY_PORT`: PLAN §10 + live `.env.internal`/`.env.public` say `8080`; `.env.*.example` templates say `9000` (Keycloak's *management* port — copy error) → all become **8089** | `context/specs/DEPLOYMENT.md` §4 |
| R4 | **pdf-reader** | compose network `proxy_internal` → **`edge`** | `context/specs/DEPLOYMENT.md` §4 |
| R5 | **proxy** | flat single-network topology → attach the `creds` network tier when vault/gateway are built (no change to anything already built) | ARCHITECTURE.md §11 |
| R6 | **README.md** (root) | inventory table still shows 9 apps + 2 platform layers → add agent-runtime row, "3 platform layers" (out of this pass's allowed write scope) | ARCHITECTURE.md §4 |

## 3. DEFERRED items (not built here; each has an owner-trigger)

**Trigger: before/at Board+Notes Stage 2 (next design round)**
- (1.3) local-model-drives-MCP **feasibility spike** — owned by agent-runtime; **gates Board/Notes tool-surface design**
- (1.2) model-serving/inference **sizing artifact** (measured concurrency → ceremony parameters) — owned by agent-runtime
- (5.1) eval/quality layer (rubrics, golden tasks, per-agent quality records, AR scoring + planted-flaw re-certification) — design into MC/Board/Notes Stage 2 schemas, NOT retrofitted
- (5.2) lesson-closure mechanics (structured lesson type with scope keys the Board *pushes* into matching tickets; repeat-incident metric) — design into Board/Notes Stage 2
- (2.4) shared schema-migration convention + chain-epoch/re-anchor design for hash-chained audit tables — land before Stage-2 plans harden schemas

**Trigger: the named component's own pipeline**
- (1.5) agent session lifecycle (spawn→enroll→claim→heartbeat→terminate/resume) — agent-runtime planning, jointly with auth
- (4.4) fleet degraded-mode contract for auth outage — agent-runtime planning, jointly with auth
- (1.4) versioned persona/prompt/role↔model config + behavioral regression suite — agent-runtime planning
- (2.3, part) Gateway boot-time **orphaned-run rule** (escalate, never resume blind) — a safety design input Gateway planning must carry
- (7.3) host onboarding/retirement lifecycle (enroll → verify prerequisites → eligible; Gateway refuses unverified hosts) — CMDB research
- (7.1) operator-absence/succession model (away-mode, delegate role, sealed succession runbook) — auth + MC design rounds
- (7.2) minimum off-LAN action set (ack/approve/halt) + access mechanism (WireGuard/Tailscale) — decide **before auth/proxy Stage 5 hardens**

**Trigger: pre-first-continuous-run assembly (after apps exist; runbooks, not designs)**
- (5.3) ceremony fixture — codify the §7 reference scenario (mock Wazuh, synthetic fleet, canned CMDB); gate the first live run on convergence + fail-safe
- (3.4) unified bootstrap/first-run runbook (ordered close-outs, prerequisites, state seeding, supervised canary)
- (3.3) maintenance/quiesce runbook (drain claims, Gateway idle, per-app restart-safety notes)
- (2.3) incident/DR runbook for the corporation's own host (rebuild procedure, RPO/RTO, stop-inspect-restore) — **rehearsed in Stage 7**
- (3.2) out-of-band watchdog (independent uptime check via the ntfy sink, not routed through the suite)
- (6.4) API-versioning PROCESS rule (Stage-4 exit publishes versioned OpenAPI + MCP schema; downstream pins; per-seam contract test)

## 4. Refuted candidates (no action ever needed — recorded so they aren't re-raised)

Approval throughput/fatigue, mis-approval recovery, and inter-app event propagation were all adversarially verified as **already covered** — see the "Already well covered" section of `context/GAP_ANALYSIS_2026-07-01.md` for the exact doc locations.
