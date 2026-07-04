# DESIGN_REVIEW.md — Stage-3 Consistency Sweep & Consumer Matrix

> **What this is:** the "one suite, not ten apps" guarantee. It records (§1) the shared components and who consumes them, (§2) the consumer matrix, (§3) reconciliation with auth's already-built console, (§4) the consistency-sweep result — every app checked against `DESIGN_SYSTEM.md` §4 for one-off re-draws — and (§5) the open items that need the operator's call.
>
> **Inputs:** `context/DESIGN_SYSTEM.md` + `context/DESIGN_SYSTEM_COMPONENTS.md` (frozen Part A), and all 13 per-app specs authored this session. **Sweep result up front: CLEAN.** No app re-drew a shared entity (ticket ref / identity / tier badge / fencing / kill band / destructive affordance / review chip) with a bespoke visual. Every divergence found is a *deliberate, documented* choice that protects a design-system invariant (§4), not a drift.

---

## 1. Shared components and their consumers (the cross-app patterns)

The three big cross-app patterns and the safety grammar are **designed once and consumed, never forked**:

- **`ReviewQueue` (§7.1) — Mission Control owns the canonical version** (`/review`, `/review/<ticket_id>`, `/ticket/<ticket_id>` alias; resolve feed `GET /api/events/resolve`). Verified consumption:
  - **MC** hosts it (unified `awaiting_approval` + `needs_review`; item id = Board `ticket_id`; decisions written browser-direct to Board under the operator's own session).
  - **Chat** = doorbell → renders `ReviewChip`, deep-links to `/review/<ticket_id>`, subscribes the resolve feed. Hosts no queue.
  - **Notes** = renders `needs_review` attention, deep-links out to clear. Hosts no clear control.
  - **Board** = hosts the grant/reject **decision** (it *mints* the approval record — legitimately its authority) but renders it as a **Board-scoped filter of the same `ReviewQueue` anatomy** with the same deep-links, **not a parallel design**.
  - **Library** = its **ingestion-admission gate is a distinct gate** (item id = `doc_id`, `library:admin`, does not live in MC, never mixes with cross-app tickets) that **reuses the `ReviewQueue` component anatomy verbatim** (batched rows, per-item `TierBadge`, per-doc diff, bulk-approve cap 10, `DangerAction` admit/reject). Sanctioned by §7.1 as *same-anatomy / different-authority*.
  - **Drive** (`verified_absent`) and **CMDB** (escalation outbox) and **Gateway** (orphan queue) each run **operational** queues that are explicitly **not** review gates; their ticket-level escalations render `ReviewChip` deep-linking to MC.
- **`LiveAgentView` (§7.3) — Mission Control owns the canonical version** (`/agents`, `/agents/<sub>`). **agent-runtime** renders only a thin engine-room status surface and **reuses the same row anatomy** + deep-links into MC; it hosts no rich fleet UI of its own. Gateway/Board deep-link to it for the kill actuator / agent drill-in.
- **`AuditInspector` (§7.2) — shared component family, no single owner.** Consumed by **auth, gateway, vault, cmdb, library, drive, board, notes** — every append-only audit / provenance surface. Chain-verify is rendered honestly (never a false green; a stale verify → halt-gold "cannot confirm," an actual break → danger-red).
- **Safety grammar (§4)** — `TicketRef`, `PrincipalRef`, `TierBadge`, `FenceState`, `StatePill`, `HaltBand`, `DangerAction`, `HonestState`, `Freshness`, `ReviewChip` — rendered identically everywhere (matrix §2).
- **Interaction grammar (§5)** — `ConfirmFriction` (every destructive op), `HoldToActuate` (stops), `Shift+Esc` override, Pattern R/D honest defaults, `LiveStream`.
- **Chrome (§6)** — `AppShell`, `DataTable`, `Field`, `Modal`, `Toast`.

---

## 2. Consumer matrix (which app renders which shared component)

`●` = consumes/renders · `○` = read-only mirror or advisory-only render · `—` = N/A for this app · `OWNS` = canonical owner.

| Component | board | notes | mc | library | drive | chat | gateway | vault | cmdb | agent-rt | auth (built) | proxy/pdf |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `TicketRef` §4.1 | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | — |
| `PrincipalRef` §4.2 | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | — |
| `TierBadge` §4.3 | ● | ● | ● | ● | ● | — | ● | ● | ●¹ | ● | — | — |
| `FenceState` §4.4 | ● | ●(disp) | ● | — | ● | ○(adv) | ● | — | —² | ● | — | — |
| `StatePill` §4.5 | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | — |
| `HaltBand` §4.6 | ○ | ○ | OWNS-actuation | ○ | ○ | ○ | ○(L2 src) | ○ | ○ | ○(client) | ○+L1 | — |
| `DangerAction` §4.7 | ● | ●(absence) | ● | ● | ● | ●(absence) | ● | ● | ● | ● | ● | — |
| `HonestState` §4.8 | ● | — | ● | — | — | — | ● | ● | ● | ● | ● | — |
| `Freshness` §4.9 | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | — |
| `ReviewChip` §4.10 | ● | ● | ● | ● | ● | ● | ● | — | ● | ○ | — | — |
| `ConfirmFriction` §5.1 | ● | ●(quar) | ● | ● | ● | ●(light) | ● | ● | ● | ● | ● | — |
| `HoldToActuate` §5.2 | — | — | ● | — | — | — | — | — | — | — | ● | — |
| `Shift+Esc` §5.3 | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | — |
| `LiveStream` §5.5 | ● | ● | ● | — | — | ● | ● | —³ | —³ | ● | ● | — |
| `AppShell` §6.1 | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ●⁴ | — |
| `DataTable` §6.2 | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | ● | — |
| `ReviewQueue` §7.1 | ●filter | ○link | **OWNS** | ●anatomy | ○link | ○link | ○link | — | ○link | ○link | ○link | — |
| `AuditInspector` §7.2 | ● | ● | ● | ● | ● | ●(no-chain) | ● | ● | ● | ● | ● | — |
| `LiveAgentView` §7.3 | ○link | — | **OWNS** | — | — | — | ○link | — | — | ●anatomy | — | — |

¹ CMDB renders `TierBadge` for **host-originated/UNTRUSTED synced Wazuh facts**; its **host-criticality** classification uses a separate `CriticalityTier` chip on purpose (see §4-A).
² CMDB renders the **absence** of `FenceState` as a printed constitutional fact (veto-not-trigger; holds no lease/mutex/approval-record role).
³ Vault and CMDB are **deliberately not** `LiveStream` consumers (request/response + poll+`Freshness`); flagged so Stage-4 does not add a stream.
⁴ auth's shell predates the suite switcher — see §3.

---

## 3. Reconciliation with the already-built auth console

`platform/auth/ui/UI_SPEC.md` (BUILT, 1135 lines) is the **origin** of this design system; the system is a superset of it. No shipped auth UI is contradicted.

- **Promoted verbatim from auth → suite baseline** (auth needs *no change*, it already conforms): all §3 tokens, `HaltBand`, `HonestState` triad, `ConfirmFriction`, `HoldToActuate` (G1 ~600ms / G2 ~1000ms), `Shift+Esc` safety override + fallback-chord obligation, Pattern R/D split, `StatePill`, `Freshness` + false-green rule, the ⛔-glyph reservation + destructive-absence rule, `DataTable`, the RED-is-the-operator's-finger / GOLD-is-the-system's-safe-posture spine.
- **Two additive extensions auth does not use (no contradiction):**
  1. **Workshop archetype + `--paper-*` + Source Serif 4** — for Notes/Library reading panes. Auth is Instrument-only and ignores these tokens.
  2. **Suite app-switcher in `AppShell` §6.1** — auth's console predates a suite-wide switcher. **Reconciliation (the one auth-touching follow-up):** auth's shell **gains the switcher + read-only suite-posture line** when convenient — small, additive, non-blocking. Until then auth remains conformant as a single-app shell.
- **Ownership boundaries encoded, not moved:** auth keeps the **identity-layer L1 STOP + per-principal revocation** and a **read-only mirror** of the global kill level; **MC owns global kill actuation** and the canonical `ReviewQueue`/`LiveAgentView`; **Gateway is the L2-confirmed physical-stop source** read directly by auth. The suite specs honor these (MC's kill button *calls* auth's revocation; every non-MC/auth app shows `HaltBand` read-only).

---

## 4. Consistency-sweep result — deliberate divergences (all protect an invariant)

Every app was checked: *does it render each shared entity via its §4 component, or did it invent a one-off?* **No prohibited one-off was found.** The following are the **deliberate, documented** divergences — each is a *correct* choice that guards a design-system rule, and each is recorded here so it reads as a ruling, not drift:

**4-A · CMDB `CriticalityTier` chip is NOT `TierBadge`.** Host criticality (`tier0–tier3`/unpolicied) carries **no provenance / verification-independence semantics** — it is a policy classification, not a trust signal. Rendering it with `TierBadge` (reserved for `sandbox-verified`/`cross-referenced`/`UNTRUSTED` provenance) would overload the badge's meaning. CMDB uses a distinct chip and reserves `TierBadge` for host-originated/UNTRUSTED synced facts. **This is the right call.** → *Recommended additive clarification to `DESIGN_SYSTEM.md` §4.3: note that "tier" is an overloaded word — provenance-tier (`TierBadge`) ≠ host-criticality-tier (`CriticalityTier`) — so no future app conflates them.* (§5 item.)

**4-B · CMDB maintenance-window "FREEZE" renders `--attn` amber, never halt-gold.** A maintenance-window freeze is a schedule state, **not** a kill-switch/dependency-down safe-stop. Rendering it gold would violate the §3.6 reservation (gold = kill-engaged / fail-closed only). CMDB renders it as an `--attn` `StatePill` (`❄ FREEZE-ACTIVE`). **Correct — protects the halt-gold signature.** The word "freeze" is overloaded (window-freeze vs kill-`G1 FREEZE-DESTRUCTIVE`); the color discipline keeps them unambiguous.

**4-C · MC global kill = `HoldToActuate` press-and-hold (Stage-3 call made).** The tasked open question ("button vs hold-to-fire for the global kill") is resolved to **hold-to-actuate** (G1 ~600ms / G2 ~1000ms), consistent with §5.1 rule 4 (engaging a stop is toward-less-action → hold, not typed-intent) and parity with auth's L1 actuator. Dwell values flagged tunable + Stage-7-validated. → operator confirm (§5 item).

**4-D · MC `HaltNotConfirmed` renders halt-gold for a *failed actuation call*.** A failed global-kill call is Pattern-R by origin (an action didn't apply), but MC renders the full-viewport takeover in **halt-gold**, not red, because for this one safety-critical outcome the "did the system stop?" honesty (gold, unknown-treat-as-unsafe) overrides "your click failed" (red). Called out explicitly in the MC spec. **Defensible and consistent with the false-green rule** (§4.9) — an unconfirmed halt must never read as either a green success or a mere red error. → operator note (§5 item).

**4-E · Notes/Vault/Gateway destructive-*absence* renders (not divergences — conformance).** Notes (no clear-review control), Vault (no secret read-back), Gateway/auth (no SoD-relax), CMDB (no fencing/approval role) all render the **§4.7 destructive-absence rule** (printed 🔒/⛊ constitutional fact, never a greyed toggle, never the ⛔ glyph). This is the design system working as intended across five apps — noted as evidence of coherence, not a flag.

**4-F · Chat renders `FenceState` advisory-greyed; `ConfirmFriction` light-only.** Chat stores fencing verbatim but pings outside the reject-set, so it renders `FenceState` greyed with an `advisory` micro-tag (§4.4 advisory rule) and only ever uses the light `ConfirmFriction` variant (it hosts no toward-more-action op). Conformant.

---

## 5. Open items needing the operator's call

None blocks the design freeze; these are decisions/ratifications the specs surfaced honestly and parked:

1. **`DESIGN_SYSTEM.md` §4.3 clarification (recommend ACCEPT):** add the "tier" disambiguation from §4-A (provenance-tier `TierBadge` ≠ host-criticality `CriticalityTier`). Additive, one sentence. *I recommend accepting; I can apply it on your word.*
2. **MC global-kill actuation = hold-to-fire (§4-C):** confirm the press-and-hold default (vs a plain button) for the *global* kill. Recommend ACCEPT (parity with auth L1, matches §5.1). Dwell times remain Stage-7-tunable.
3. **MC `HaltNotConfirmed` gold-not-red (§4-D):** confirm that a *failed global-kill actuation* is rendered halt-gold (unknown-treat-as-unsafe), not red. Recommend ACCEPT (honesty-core consistent).
4. **Cross-app operator-session `mc:read` grant:** Notes S5 (and any app decorating live gate state from MC's `/api/queue` + resolve feed under the operator's browser session) needs an operator-session `mc:read` scope. Specs degrade honestly to "deep-link out" until granted. → a **Board/MC/auth seam + scope** decision, not a design one; flagged for the Stage-4/scope session.
5. **Drive `GET /api/tickets` distinct-ticket index:** Drive's Ticket Browser "recent tickets" view needs a ticket-index read not in the frozen Drive PLAN §4. Either add it (serving both surfaces, to keep two-views-one-state) or restrict the Browser to deep-linked ticket-scoped entry. → Stage-4 API call.
6. **Board A-VR / A-RR unratified amendments:** the ticket-detail drawer's voluntary-release visibility + restore banner depend on spec amendments A-VR/A-RR (Board PLAN §21.6). Until ratified, the UI shows the interim operator cancel+re-file rule. → already-tracked Board ratification.
7. **auth shell app-switcher (§3):** the one auth-touching follow-up — additive, non-blocking; do it when auth's console is next opened.
8. **pdf reconciliation deferred:** `apps/pdf/ui/UI_SPEC.md` records the out-of-suite status + the bounded later-scope (adopt `AppShell` + token sheet; no §4 safety grammar). No action now.

### §5.1 — RESOLUTIONS (ratified 2026-07-03; operator: suite name APPROVED, all other items delegated to recommendation)

These close the §5 sweep items **and** the 11 GAP flags raised in the Claude Design brief (`context/design/CLAUDE_DESIGN_BRIEF.md`). Encoded where a home exists (DESIGN_SYSTEM additive amendments, per-app specs at Stage-4/Build); otherwise recorded here as the ratified posture.

- **Suite name → `Helm` (APPROVED).** Recorded in the brief Part 1A. Renameable later without design impact.
- **Sweep #1 / tier-word (§4-A) → ACCEPTED, encoded.** `DESIGN_SYSTEM.md` §4.3 now disambiguates provenance-`TierBadge` from host-criticality `CriticalityTier` (additive).
- **Sweep #2 / MC global-kill hold-to-fire (§4-C) → ACCEPTED.** Press-and-hold `HoldToActuate` is the global-kill default (parity with auth L1). Dwell ~600ms G1 / ~1000ms G2 remain **tunable, Stage-7-validated** — not locked.
- **Sweep #3 / MC `HaltNotConfirmed` gold-not-red (§4-D) → ACCEPTED.** A failed global-kill *actuation* renders halt-gold (unknown-treat-as-unsafe), never red — honesty-core consistent.
- **`Shift+Esc` fallback chord → `Alt+Shift+H`** ("Halt"), focus-not-fire, Alt-based to dodge Chromium capture; encoded in `DESIGN_SYSTEM.md` §5.3; confirm in Stage 7.
- **MC pre-sizing guardrail numbers → keep UNSET.** Build the explicit `⚠ PRE-SIZING DEFAULT / UNSET` state; no fabricated numbers — they arrive from the gap-1.2 sizing measurement.
- **Notes taint-downgrade correction → API-only; NOT surfaced on the note UI.** Preserves §4.3 "taint is display-only in the UI." If ever surfaced, only in a **separate admin console** as a full `DangerAction` (typed-intent + step-up + tamper-evident row). No note-surface control built now.
- **Sweep #4 / cross-app operator-session `mc:read` → RECOMMEND GRANT** (ask to the Board/MC/auth scope session). Design ships the honest deep-link-out fallback until granted (degraded, never wrong).
- **Drive `verified_absent` deep-link → resolve in-app (Artifact Detail) until Chat ships**, then repoint to Chat. No action now.
- **Sweep #5 / Drive `GET /api/tickets` index → ADD IT (design assuming it exists).** A cheap rebuildable projection serving both surfaces (two-views-one-state) beats restricting the browser to deep-link entry. Stage-4 API item.
- **Agent-runtime `EngineHeadroom` gauge → horizontal segmented bar**, neutral→amber approaching capacity, a tick marking the "knee C" threshold, numeric value alongside (not radial — radial reads as the hold-actuator).
- **Agent-runtime fleet rows → DO NOT render them; deep-link to MC's `LiveAgentView`** (one fleet, not two). Only engine-room physical status (headroom, TPM-seal, drain compliance) lives on agent-runtime.
- **Sweep #6 / Board A-VR / A-RR → interim rule stands** (operator cancel + re-file); design the drawer to it now, revisit if/when the amendments ratify.
- **Sweep #7 / auth shell app-switcher → deferred, additive, non-blocking** (unchanged).
- **Sweep #8 / pdf → remain deferred**; fold into the suite shell (shell + tokens only, no §4 grammar) post-Stage-4 if the operator chooses.

---

## 6. Per-app spec inventory (weight, archetype, size)

| App | Weight | Archetype | Spec | Lines | Review-queue role |
|---|---|---|---|---|---|
| mission-control | FULL | Instrument | `apps/mission-control/ui/UI_SPEC.md` | 756 | **OWNS** `ReviewQueue` + `LiveAgentView` |
| gateway | FOCUSED | Instrument | `apps/gateway/ui/UI_SPEC.md` | 396 | deep-links out; local orphan queue distinct |
| vault | FOCUSED | Instrument | `apps/vault/ui/UI_SPEC.md` | 380 | none (redeem off both surfaces) |
| cmdb | FOCUSED | Instrument | `apps/cmdb/ui/UI_SPEC.md` | 332 | distinct gate-weakening gate; deep-links out |
| library | FULL | Both | `apps/library/ui/UI_SPEC.md` | 295 | distinct ingestion gate (same anatomy) |
| board | FULL | Instrument | `apps/board/ui/UI_SPEC.md` | 293 | `ReviewQueue` filter; owns approval record |
| chat | MODEST | Both | `apps/chat/ui/UI_SPEC.md` | 284 | doorbell → deep-links to MC |
| notes | FULL | Both | `apps/notes/ui/UI_SPEC.md` | 273 | deep-links out; hosts no clear control |
| drive | MODEST | Both | `apps/drive/ui/UI_SPEC.md` | 261 | local `verified_absent` queue distinct |
| agent-runtime | MINIMAL | Instrument | `platform/agent-runtime/ui/UI_SPEC.md` | 147 | none; fleet view is MC's |
| pdf | RECONCILE-LATER | (Workshop, future) | `apps/pdf/ui/UI_SPEC.md` | 19 | out-of-suite; no shared entities |
| proxy | NONE | — | `platform/proxy/ui/UI_SPEC.md` | 17 | N/A by construction |
| auth | BUILT | Instrument | `platform/auth/ui/UI_SPEC.md` | 1135 | origin of the system; §3 reconciliation |

**Sweep verdict: the suite reads as one product.** Every app renders every shared entity through the frozen §4 grammar; the only divergences are deliberate protections of the design system's own invariants (the halt-gold reservation, the `TierBadge` provenance semantics, the false-green rule). All §5 open items are **RESOLVED** (§5.1, ratified 2026-07-03) — suite name `Helm` approved; the rest delegated to recommendation and encoded (two additive `DESIGN_SYSTEM.md` amendments; the remainder recorded as ratified posture / Stage-4 items). Nothing blocks the freeze.
