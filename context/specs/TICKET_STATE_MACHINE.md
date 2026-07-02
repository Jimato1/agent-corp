# SPEC — Ticket Lifecycle & Ceremony State Machine (Board-owned, authoritative)

> **Status:** AUTHORITATIVE. Owned by the **Board**; this doc lives in `context/` so every app session inherits it, but only Board sessions may amend it. All consumers (auth PDP, Gateway, MC, Chat, Notes, CMDB) cite this by reference and hard-code nothing beyond it. Closes gap 6.3 (`context/GAP_ANALYSIS_2026-07-01.md`). Referenced from ARCHITECTURE.md §13.
>
> **Relationship to ARCHITECTURE.md §5 (settled decision, preserved):** the locked lifecycle `todo → in_progress → (awaiting_approval →) needs_review → done` + `blocked` remains valid as the human-visible core. This spec is the *authoritative superset*: it adds the execution-window states auth's built PDP already assumes (`approved`, `executing`) and resolves the open questions Board research raised (`verifying`; `cancelled` vs `failed`). Nothing here relitigates the core shape — it names the states the core shape was already implying.

## 1. States

| State | Meaning | Terminal? |
|---|---|---|
| `todo` | claimable work in the pool | no |
| `in_progress` | atomically claimed by exactly one agent (lease + heartbeat active) | no |
| `awaiting_approval` | destructive/irreversible type: plan produced, human/CMDB-tier gate pending | no |
| `approved` | approval granted, not yet consumed — **this is the PDP's "executable state"**; the only state in which `gateway:execute` can be permitted | no |
| `executing` | Gateway consumed the approval (`consume_approval`: single-use `approved → executing`); run in flight on the host | no |
| `verifying` | work complete per the agent; external verifier confirmation pending (e.g. Wazuh active→solved). Used **only** for task types with a registered external verifier | no |
| `needs_review` | artifact awaiting human review — **human-only to clear** | no |
| `blocked` | parked: unmet dependency, lost resource lock, or escalation | no |
| `done` | complete — externally confirmed where a verifier exists | **yes** |
| `failed` | execution was attempted and did not succeed (Gateway run failed, verification refuted, rollback executed) | **yes** |
| `cancelled` | operator withdrew the ticket before/without execution; no destructive action occurred | **yes** |

Terminal set: `{done, failed, cancelled}`. `failed` vs `cancelled` is not cosmetic: `failed` means the world may have been touched (audit + retro must examine it); `cancelled` guarantees it was not.

## 2. Transitions and who may cause each

| From → To | Caused by | Mechanism |
|---|---|---|
| `todo → in_progress` | **agent** | atomic status-guarded CAS claim (+ resource lock/lease per ARCHITECTURE §5) |
| `in_progress → todo` | **Board** (automatic) | lease expiry / heartbeat loss — reaper requeues; fencing counter increments |
| `in_progress → awaiting_approval` | **agent** | plan artifact filed for a destructive/irreversible type |
| `in_progress → needs_review` | **agent** | artifact work complete (non-destructive types) |
| `in_progress → blocked` | **agent** or **Board** | escalation filed / dependency unmet |
| `awaiting_approval → approved` | **operator**, or **CMDB tier policy** (auto-tier) | approval recorded (`approval_id` minted, `plan_hash` bound — see IDENTIFIERS.md) |
| `awaiting_approval → cancelled` | **operator** | plan rejected/withdrawn |
| `approved → executing` | **Gateway** (only) | `consume_approval` — single-use; second consume denies terminal `approval_consumed` |
| `approved → cancelled` | **operator** | revoke before consumption (live PDP re-check makes this effective) |
| `executing → verifying` | **Gateway** | run finished; task type has a registered external verifier |
| `executing → needs_review` | **Gateway** | run finished; no external verifier — falls to human review |
| `executing → failed` | **Gateway** | run failed / halted / rolled back |
| `verifying → done` | **Board** (automatic) | external verifier confirms (e.g. Wazuh flips active→solved) — evidence attached |
| `verifying → failed` | **Board** (automatic) or **operator** | verifier refutes within the verification window / timeout escalation resolved as failure |
| `needs_review → done` | **operator** (human-ONLY) | review cleared — no agent or policy path exists |
| `needs_review → todo` | **operator** | rework: sent back to the pool |
| `blocked → todo` | **Board** (automatic) or **operator** | dependency satisfied / escalation resolved |
| `todo`/`blocked` → `cancelled` | **operator** | withdrawn |
| `in_progress → needs_review` | **Board** (automatic) — named **`board_escalation`** *(amendment A1, ratified D-5a, 2026-07-02)* | server-side watchdog force-escalates: stuck-huddle timebox/round-cap hit, or max-lease-renewal cap reached on a still-heartbeating never-completing agent. Always carries a machine reason; never available to agents |
| *(creation)* → `needs_review` | **auth → Board** (automatic) — named **`breakglass_review_ticket`** *(amendment A2, ratified D-5b, 2026-07-02)* | the mandatory post-hoc review ticket auto-filed after any break-glass invocation is **born in `needs_review`** (auth PLAN §7.7). The ONLY path by which a ticket starts in any state other than `todo`; human-only to clear, like all `needs_review` |

**No other transitions exist.** In particular: nothing moves *into* `approved` except through `awaiting_approval`; nothing moves *out of* `approved` except the Gateway's single-use consume or operator cancel; agents can never cause any transition into or out of `approved`, `executing`, `verifying`, or `done` — that is the segregation-of-duties property expressed as transition authority. Amendments A1/A2 above are deliberately narrow: both target `needs_review` (human-only to clear), neither opens any agent- or policy-reachable path toward execution.

## 3. Ceremony phase — single authority

**The Board's append-only `ceremony_events` log is the ONE source of truth for ceremony phase.** `ceremony_phase` on the ticket is a rebuildable projection of that log (per Board research: event-sourced column, named guards, no statechart runtime). Notes frontmatter may carry a *display copy* of the phase on huddle-transcript notes for human readability — it is **non-authoritative, never read back by any component**, and drift in it is cosmetic, not a bug.

Ceremony phases (`triage → recon → planning → adversarial_review → backlog → execute → retro`) are orthogonal to lifecycle status, with one hard gate: a child execution ticket cannot leave `todo` before its parent ceremony reaches `backlog`.

**Ceremony governance (ratified D-1/D-2, 2026-07-02 — Board Stage-2 encodes; recorded here because every consumer renders it):** convergence authority is a DACI split — the Scrum Master owns *process only* while the **Board's server-side watchdog enforces timebox/round-cap regardless of any agent's activity** (its trip is amendment A1's `board_escalation`); the Product Owner is the sole Recommender-of-record, never an autonomous final say; the Adversarial Reviewer holds a scoped veto plus mechanically-forced grounded dissent (≥1 premise-attack cited to a recon note, or the huddle is invalid); reversibility is always derived, never reasoned; the huddle is never the last signature. Defaults: 3 rounds, 2–4 role agents. Triage into the ceremony is a **deterministic three-lane decision table** over five signals (derived reversibility, blast radius, CMDB tier, catalog novelty, external-verifier presence) — never an LLM score; straight-to-execute requires all four hard conditions; children inherit the parent's lane as a floor; any missing/stale signal → full ceremony; the lane governs planning rigor only, never execution gates. Convergence is signaled by an agent calling the Board API — Notes frontmatter remains the never-read-back display copy defined above.

## 4. Known drift to reconcile (recorded, not fixed here)

- **auth's built PDP** hard-codes `executable`/`executing` state names that predate this spec. §1 makes `approved` the canonical name for the PDP's "executable state." auth must reconcile naming and cite this spec in its next session — recorded in `context/GAP_REMEDIATION.md`. (The PDP's *semantics* — permit `gateway:execute` only in that state, `consume_approval` single-use — are already exactly this spec; only the vocabulary and citation need alignment.)
- **Board research** floated `verifying` as an open question and left `cancelled` vs `failed` unresolved — both are resolved above and Board Stage-2 planning inherits them as constraints.
