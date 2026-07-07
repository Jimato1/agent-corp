# UI_SPEC.md — Mission Control (`mc`) — Stage 3 (UI/UX)

> **Stage 3 artifact.** Design specification only — no code. Every screen is described in words + an ASCII
> wireframe and enumerates **every** state (§5.4 honest defaults). Risk class **Standard**. Runtime identity
> **`mc`** (D-3).
>
> **This is the suite's canonical cockpit spec.** Mission Control **owns** two of the three cross-app
> patterns — `ReviewQueue` (§7.1) and `LiveAgentView` (§7.3) — so this file **defines the shared surfaces
> other apps deep-link into**. Where another app renders a `ReviewChip` or a `PrincipalRef` and links out,
> the destination screens (`/review`, `/review/<ticket_id>`, `/ticket/<ticket_id>`, `/agents/<sub>`) are
> specified here and must match the FROZEN `mc-chat-review-resolve.md` URL scheme exactly.

---

## 1. Scope, archetype, governing principle

**Scope.** MC is the operator's single console over the whole suite: the live fleet, WIP/budget guardrails,
the **global kill switch actuation**, the **unified review + approval queue**, an edge/observability panel,
and the audit-anchor continuity witness. Per PLAN §0 MC is a **BFF doing API composition** — it owns almost
no state; every widget binds to exactly one upstream authority, and every control action is a call to the
owning app under the operator's own session.

**Archetype (§2): Instrument — control-room, dark-only, `compact` density, every screen.** MC has **no
Workshop pane** anywhere: it displays plans, transcripts, and note *references* but never hosts a reading/
editing surface (those live in Notes/Library; MC deep-links to them). No `--paper-*`, no Source Serif 4.
Substrate is `--sub-*`; type is Inter + JetBrains Mono; identifiers and machine truth are mono/tabular.

| Screen | Route | Archetype |
|---|---|---|
| Cockpit Overview | `/` | Instrument |
| Live Agent View (fleet) | `/agents` | Instrument |
| Agent drill-in | `/agents/<sub>` | Instrument |
| Review + Approval Queue | `/review` | Instrument |
| Review item | `/review/<ticket_id>` (+ `/ticket/<ticket_id>` 302 alias) | Instrument |
| Halt Control (global kill switch) | `/halt` (+ header actuator, exempt from scrim) | Instrument |
| WIP & Budget monitors | `/budgets` | Instrument |
| Edge & Observability | `/edge` | Instrument |
| Audit-anchor continuity | `/anchors` | Instrument |
| Guardrail settings (params/silences/filters) | `/settings` | Instrument |

**Governing principle (the two questions the suite thesis §1 poses, answered here first).** Every MC screen
answers *"what is the fleet doing, and can I stop it?"* MC is the screen where the operator can always see
posture and always reach the stop. Two disciplines bind harder here than anywhere else because MC is a
**mirror of authorities it does not own**:

1. **Never a false green (§4.9).** MC fabricates no confidence. Every aggregated tile carries `source:` +
   `as-of` (`Freshness`); any stale/unavailable read renders the honest unknown in **halt-gold**, never a
   frozen-but-green value. The kill mirror degrades `CONFIRMED → STALE-UNKNOWN`; the anchor status shows
   `RESYNC-PENDING`/gap/fork; a dead source *looks* dead.
2. **MC is a cockpit, never a second enforcer.** The kill button **calls auth**; queue decisions write
   **browser-direct to Board** under the operator's own session. MC holds **no standing approve/kill
   credential** — this is rendered as a constitutional *absence* (§4.7 destructive-absence rule), not hidden.

---

## 2. Design-language note

**This spec consumes `context/DESIGN_SYSTEM.md` (FROZEN) and states deltas only.** It does **not** re-specify
the visuals of any §4/§5/§6/§7 component; it cites them by ID. Tokens, safety grammar, interaction grammar,
shared chrome, and the three cross-app patterns are inherited verbatim. Anything below that looks like a new
visual is either (a) a citation of a shared component, or (b) a justified app-specific widget (§4 of this doc)
that composes shared components and never redraws a shared entity.

MC is one of only **two apps that host a live kill actuator** (the other is auth, identity-layer L1); every
other app shows the read-only `HaltBand` mirror. MC also hosts the **canonical** `ReviewQueue` and
`LiveAgentView`. Because of this ownership, the wireframes here are the reference other apps' deep-links
resolve against.

---

## 3. Shared chrome (cited, not redrawn)

All screens sit inside `AppShell` (§6.1): 224/56px side rail with the suite switcher, global header
(app name + one-line identity + center `SYSTEM STATE` zone + right-side halt affordance), content region.
Deltas MC contributes to the shell:

- **Header `SYSTEM STATE` center zone (always-loud posture readout).** Renders the current kill level as a
  `StatePill` (§4.5) — `● G0 NORMAL` (neutral `--ink-700`, no gold) / `▮▮ G1 FREEZE-DESTRUCTIVE` / `▮▮▮▮ G2
  QUIESCE-ALL` — with a `Freshness` (§4.9) stamp on the mirror (`⟳ epoch 4471 · fresh 312ms · source: auth`).
  At any level > G0 the full read-only `HaltBand` (§4.6) drops under the header, sticky. **The header never
  shows a green "all agents stopped"** (§4.6 honesty rule) — a stop readout goes gold and carries the
  `HonestState` triad.
- **Header halt affordance (MC-unique: this is a live actuator, not a mirror).** Right of `SYSTEM STATE`,
  MC renders the **ENGAGE-FREEZE** control as a `HoldToActuate` (§5.2) trigger — **exempt from every scrim**
  (§5.3) and the `Shift+Esc` focus target. auth and MC are the only apps whose header halt affordance is a
  trigger; everywhere else it is a mirror. Full mechanics in §3-screens 3.6 (Halt Control).
- **Identity + session freshness.** Logged-in operator as `PrincipalRef` (§4.2, `◐ operator:…`) + a
  session-freshness stamp; a step-up-required action shows `🔑 fresh` / `🔑 stale` (§6.1). On
  `auth:revocations` for the operator's own session, every screen renders the §5.5 "session ended —
  re-authenticate" state and all SSE streams close.
- **Suite switcher** shows the **one** suite-posture line (kill level + any Pattern-D dependency) so posture
  is legible; collapsed rail keeps the halt glyph gold-ringed at any level > G0.

All truth-surfaces are `DataTable` (§6.2); all forms/inputs are `Field` (§6.3); the only elevation is
`Modal` (§6.4); transient action confirmations are `Toast` (§6.5, **never gold, never for safety state**);
every dangerous action routes through `ConfirmFriction` (§5.1); keyboard model per §5.6.

---

## 3-screens. Screens & flows

Each screen: purpose · wireframe · shared components · **every state**.

State vocabulary (§5.4), applied uniformly:
- **loaded** — normal.
- **loading** — static skeletons matching the target layout (never a spinner for content).
- **empty** — an invitation naming what would appear + the one action that populates it.
- **Pattern-R error** — *your action/this fetch failed recoverably* → red ✕, in the interface's voice.
- **Pattern-D degraded** — *a dependency is down → safe-stopped* → halt-gold `HaltBand` §4.6b, **not red**.
- **stop-engaged** — a kill level > G0 → the gold `HaltBand` is present and the `HonestState` triad shows.

---

### 3.1 Cockpit Overview — `/`

**Purpose.** The at-a-glance answer to both thesis questions: posture, fleet health, queue pressure,
guardrail headroom, dependency health — each a tile that deep-links to its full screen. Every tile is a
**mirror with a `source:`/`as-of` stamp**; nothing here is authoritative.

```
┌ AppShell header:  MISSION CONTROL · operator cockpit   [ SYSTEM STATE: ● G0 NORMAL  ⟳ epoch 4471 · 0.3s · auth ]   ◐ operator:ada 🔑 fresh   [▮▮ ENGAGE-FREEZE ⌂] ┐
├─ rail ──┬─────────────────────────────────────────────── content ────────────────────────────────────────────────────────────────────────────────────────────┤
│ ⌂ Home  │  ┌ POSTURE ──────────────────────┐ ┌ FLEET ─────────────────────┐ ┌ QUEUE ──────────────────────┐ ┌ GUARDRAILS ─────────────┐  │
│ ⬡ Agents│  │ ● G0 NORMAL                   │ │ 18 online · 1 wedged*       │ │ 6 awaiting_approval          │ │ WIP 22/30 global         │  │
│ ◈ Review│  │ L1 auth ✔ 0.3s                │ │ 1 zombie ⚠ · 0 crashed      │ │ 3 needs_review               │ │ 3 budgets near cap ▲     │  │
│ ▮▮ Halt │  │ L2 gateway ✔ 1.1s auth-direct │ │ *wedged: PRE-SIZING, see §  │ │ 1 escalated ⚑ board_escal.   │ │ 2 spawn-depth flags      │  │
│ ▤ Budget│  │ source: auth · as-of 0.3s     │ │ source: runtime · 0.8s      │ │ source: board · as-of 2s     │ │ source: auth+board · 2s  │  │
│ ~ Edge  │  └──────────────[Halt →]─────────┘ └──────────[Agents →]─────────┘ └───────────[Review →]─────────┘ └────────[Budgets →]──────┘  │
│ ⛓ Anchors│ ┌ DEPENDENCIES ─────────────────────────────────────────────────┐ ┌ ANCHOR CONTINUITY ─────────────────────────────────────┐ │
│ ⚙ Settings│ │ auth ✔0.3s · board ✔2s · gateway ✔1.1s · runtime ✔0.8s        │ │ chain gw-main: seq 4471 ✔ · continuous · verify 0.9s ago│ │
│         │  │ redis ✔ · cmdb ✔4s · prometheus ✔5s · logstore ✔6s            │ │ source: gateway push · as-of 41s          [Anchors →]   │ │
│         │  └────────────────────────────────────────────────────────────────┘ └────────────────────────────────────────────────────────┘ │
└─────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components.** `AppShell` §6.1; posture readout = `StatePill` §4.5 + `Freshness` §4.9 (L1/L2 per
source, L2 labelled **auth-direct** provenance per killswitch-chain §4 — an MC-relayed L2 can only read
`STALE-UNKNOWN`, never `CONFIRMED`); fleet/queue counts each a `Freshness`-stamped tile; queue tile row uses
`ReviewChip` §4.10 for the escalation line; anchor tile consumes `AuditInspector` §7.2 verify-result (never
false-green). `[Halt →]` deep-links to `/halt`.

**States.**
- **loaded** — as drawn.
- **loading** — six skeleton tiles matching the grid; each shows a muted `source: … · as-of —` line.
- **empty** — only truly empty on a fresh suite: fleet tile → *"No agents have reported. The runtime
  supervisor stream is connected but the roster is empty — start an agent process to populate the fleet."*
  Queue tile → *"No open gates. Approvals and reviews will appear here as agents file them."*
- **Pattern-R error** — a *single* tile's composition read fails recoverably (e.g. Board read 500): that
  tile alone shows `✕ QUEUE READ FAILED — Board returned 500. Retry.` in `--danger`; **the other tiles keep
  their own freshness** (a per-tile failure never reds the whole page). Derived totals that can't reconcile
  show `? N unaccounted` (PLAN §2 honesty discipline), never a fabricated zero.
- **Pattern-D degraded** — a *dependency* is down (e.g. Redis unreachable → fail-closed): the §4.6b
  SAFE-STOPPED `HaltBand` drops under the header (gold, ⛊, "this is the safety system working, not an outage
  of the console"), and the affected tiles go `STALE-UNKNOWN` in halt-gold. **Never rendered red.**
- **stop-engaged** — kill level > G0: the gold ENGAGED `HaltBand` (§4.6a) is sticky under the header with the
  `HonestState` triad (`21 confirmed · 3 pending ≤2m · 1 draining`); the POSTURE tile mirrors it and its
  `[Halt →]` becomes `[Review halt →]`.

---

### 3.2 Live Agent View (fleet) — `/agents` — **CANONICAL `LiveAgentView` §7.3 (MC owns it)**

**Purpose.** The cockpit fleet view. This screen **is** the canonical `LiveAgentView §7.3`; agent-runtime's
thin status surface renders the *same row anatomy* and defers here. One row per agent from the runtime
heartbeat SSE (`agent-runtime-mc-heartbeat.md`), with an **AttentionBand** (§4 app-specific) pinning flagged
agents above the full roster.

```
┌ FLEET LIVENESS ─────────────────────────────────────────────────────────── ⟳ fresh 0.8s · source: runtime · roster 20 ─┐
│ ┌ ATTENTION (server-flagged, pinned) ──────────────────────────────────────────────────────────────────────────────┐  │
│ │ ⚠ SUPERSEDED  ⬡ agent:patcher-07   step 41 · [T-000123]   🔒gen46 SUPERSEDED by gen47   ♥ 9.4s   flag: zombie      │  │
│ │ ▲ NO-PROGRESS ⬡ agent:indexer-02   step 12 · [T-000217]   longest-since-progress 14m (not wedged-classified*)     │  │
│ │ ▲ FAIL×3      ⬡ agent:sre-01       step  7 · [T-000210]   consecutive-failure 3 · budget cooldown ▲               │  │
│ └──────────────────────────────────────────────────────────── *PRE-SIZING: per-role progress budget UNSET (§) ──────┘  │
│ ┌ ROSTER (DataTable) ───────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ AGENT (sub)         LIVENESS             STEP · TICKET       FENCING             BUDGET HEADROOM  PERSONA/MODEL       │ │
│ │ ⬡ agent:patcher-07  ▲ SUSPECT φ7.2 ♥9.4s 41 · [T-000123]    ⚠ gen46 SUPERSEDED   rate 12% ▲       patcher@qwen3-32b  │ │
│ │ ⬡ agent:indexer-02  ● LIVE ♥0.6s         12 · [T-000217]    🔒 gen47 ♥0.6s        conc 3/4         indexer@qwen3-14b │ │
│ │ ⬡ agent:sre-01      ● LIVE ♥0.9s          7 · [T-000210]    🔒 gen31 ♥0.9s        cooldown 42s ▲   sre@qwen3-32b     │ │
│ │ ⬡ agent:librarian-3 ⇉ DRAINING ♥1.2s      — · —             🔒 gen19              lifetime 61%      curator@…         │ │
│ │ ⬡ agent:recon-05    ◼ DRAINED (reported)  — · —             —                     —                 recon@…           │ │
│ └───────────────────────────────────────────────────────────────────────── 20 rows · card-reflow <640px ────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components.** `DataTable` §6.2 (roster); `PrincipalRef` §4.2 (agent `sub`, links to `/agents/<sub>`);
**liveness class = `Freshness` §4.9 + `StatePill` §4.5** — **NEVER a bare green dot** (the phi-accrual
suspicion figure `φ7.2` and last-beat age `♥9.4s` are `Freshness`; `● LIVE / ▲ SUSPECT / ⇉ DRAINING /
◼ DRAINED / QUIESCED-BY-OUTAGE` are `StatePill`s); `TicketRef` §4.1 (claimed ticket); **`FenceState` §4.4**
(the zombie/`SUPERSEDED` column — MC's canonical zombie render: heartbeat fencing gen behind Board's current
gen); budget headroom uses the app-specific `BudgetMeter` inline chip (§4). The `AttentionBand` and
`FleetAnomalyBanner` are app-specific (§4).

**Honesty rules rendered here (binding).**
- `DRAINED` is a **distinct terminal report**, never inferred from silence; `QUIESCED_BY_OUTAGE` renders as
  its own `StatePill` (inferred absence ≠ commanded drain) — contract §4, PLAN §4.1.
- Where the per-role **progress budget is UNSET** (D-12/gap-1.2 pending), wedged **classification is dark**;
  the interim signal is the labelled *"longest-since-progress"* sort in the AttentionBand, explicitly tagged
  **not wedged-classified** and **PRE-SIZING** (PLAN §4.1/§4.3, residual A12). No threshold is invented.

**States.**
- **loaded** — as drawn.
- **loading** — skeleton AttentionBand (collapsed) + skeleton roster rows; header freshness reads `as-of —`.
- **empty** — *"No agents have reported to the runtime supervisor. The heartbeat stream is connected;
  roster denominator = 0. Start an agent process to populate the fleet."* (distinguish from stream-down,
  below).
- **Pattern-R error** — the `/api/fleet` composition read fails recoverably: red `✕` banner over the roster
  *"Fleet read failed — retry"*; the last-good frame is shown greyed with its **stale age** (never presented
  as fresh).
- **Pattern-D degraded — two sub-cases, both gold, never red:**
  1. **runtime SSE stream down** (no fleet frame) → *the runtime itself is down* (contract §3 dead-man):
     `HaltBand`-family SAFE-STOPPED note over the roster *"Runtime supervisor stream absent — cannot confirm
     liveness; treating fleet as UNVERIFIED"* in halt-gold; every liveness cell → `STALE-UNKNOWN`.
  2. **`FLEET_LIVENESS_ANOMALY`** (correlated-loss suppression, PLAN §4.2): if > `suppress_fraction` of the
     roster crosses suspicion within `suppress_window`, per-agent death display is **suppressed** and the
     app-specific `FleetAnomalyBanner` (§4) shows `⚠ N agents suspect — display suppressed pending fleet
     check` in gold, naming the suppressed count and the three cross-checks (dead-man frame · auth health ·
     edge health). **Suppression hides the flood, never the fact of the flood.**
- **stop-engaged** — kill level > G0: agents commanded to drain show `⇉ DRAINING` → `◼ DRAINED`; a rogue
  agent that ignores drain stays `● LIVE` and is **pinned to the AttentionBand as a discrepancy** (the
  Gateway chokepoint, not this display, is the real evidence — killswitch-chain §4). The gold `HaltBand` is
  present; the roster does **not** claim "all stopped" while any agent is non-`DRAINED`.

---

### 3.3 Agent drill-in — `/agents/<sub>`

**Purpose.** One agent's full picture: recent progress trail, **spawn tree from Board lineage** (never from
heartbeats — PLAN §1.1), current claim + `FenceState`, budget headroom across all four dimensions, and its
attention flags. The deep-link target for every `PrincipalRef` in the suite that resolves to a live agent.

```
┌ ⬡ agent:patcher-07   ▲ SUSPECT φ7.2 · ♥ 9.4s · session s-9f3a · persona patcher@qwen3-32b ────────── source: runtime · 0.8s ┐
│ ┌ CURRENT CLAIM ───────────────────────────┐ ┌ BUDGET (4-dim, never dollars) ───────────────────────────────────────────┐ │
│ │ [T-000123]  ▲ executing · tier-2          │ │ rate       ███████░░░ 12% headroom ▲   cooldown  ██████████ 42s remain ▲ │ │
│ │ 🔒 gen46 · lease 00:03 · ♥ 9.4s           │ │ concurrency ████░░░░░ 3/4              lifetime  ██████░░░░ 61% of TTL    │ │
│ │ ⚠ SUPERSEDED by gen47 (zombie)            │ │ source: auth · as-of 1.1s                                                │ │
│ └───────────────────────────────────────────┘ └──────────────────────────────────────────────────────────────────────────┘ │
│ ┌ SPAWN TREE (Board lineage) ───────────────┐ ┌ PROGRESS TRAIL (advisory breadcrumbs) ──────────────────────────────────┐ │
│ │ [T-000100] epic                           │ │ 09:41:02  step 41  report_status: "retrying apt lock"   ⚠ host-orig?—no │ │
│ │ └ [T-000123] ⬡ patcher-07 ← here          │ │ 09:38:55  step 40  claimed host mutex gen46                             │ │
│ │   └ [T-000131] ⬡ patcher-09 (child)       │ │ 09:37:10  step 39  ⚑ request_escalation: attention "apt held 14m"       │ │
│ │ depth 2 / cap 4                           │ │ source: runtime + mc:report · as-of 0.8s                                │ │
│ └───────────────────────────────────────────┘ └──────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components.** `PrincipalRef` §4.2 (header identity, tree nodes, links); `TicketRef` §4.1 (claim +
tree nodes, deep-link to `/review/<ticket_id>`); `StatePill` §4.5 (claim lifecycle per
`TICKET_STATE_MACHINE.md`); **`FenceState` §4.4** (gen/lease/heartbeat + zombie `SUPERSEDED`); `Freshness`
§4.9 (every figure); `ReviewChip` §4.10 (an escalation breadcrumb links to `/review/<ticket_id>`); a
`report_status` breadcrumb carrying host-originated text is flagged with `TierBadge` §4.3 `UNTRUSTED` if its
provenance says so. **`SpawnTree` and `BudgetMeter` are app-specific (§4).**

**States.**
- **loaded** — as drawn.
- **loading** — skeleton for all four panels.
- **empty** — a known `sub` with no live frame (e.g. long-drained): *"agent:patcher-07 is not currently
  reporting. Last seen 6m ago, drain_state=DRAINED. Showing last-known claim and lineage from Board."* (the
  Board lineage panel still renders — it is not heartbeat-sourced).
- **Pattern-R error** — `/api/agents/<sub>` fails: red retry; unknown `sub` → *"No such principal in the
  live fleet"* + a link to auth (identity source) — never a bare 404.
- **Pattern-D degraded** — runtime stream down → liveness/trail panels go `STALE-UNKNOWN` gold; **the Board
  lineage/claim panels stay live** (different source) — the screen degrades *per source*, not wholesale.
- **stop-engaged** — the agent's drain progression renders in the claim panel; a zombie/rogue discrepancy is
  called out here in full (the AttentionBand row expands to this).

---

### 3.4 Review + Approval Queue — `/review` — **CANONICAL `ReviewQueue` §7.1 (MC owns it)**

**Purpose.** The unified inbox for **both** human gates: pre-execution `awaiting_approval` and post-work
`needs_review` (including A1 `board_escalation` arrivals and A2 break-glass `needs_review` births). This
screen **is** the canonical `ReviewQueue §7.1`. Chat's doorbell notifications, Notes' `needs_review`
deep-links, and Board's own approval-queue *filter* all resolve to this queue and its item pages. Decisions
are `DangerAction`s written **browser-direct to Board** under the operator's own session (§5.3) — MC holds
no standing approve credential.

```
┌ REVIEW + APPROVAL QUEUE ── / focus filter ──────────────────────────────── source: board · as-of 2s ─┐
│ [ all ] [ awaiting_approval 6 ] [ needs_review 3 ] [ escalations 1 ] [ saved: "tier-1 destructive" ]  [ ⚙ silences ]     │
│ ┌ DataTable ─────────────────────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ☐  TICKET       GATE                PROVENANCE            PROPOSER / AUTHOR    TIER   AGE     REASON                   │ │
│ │ ☐ [T-000123]  ◐ AWAITING_APPROVAL  ⚠ UNTRUSTED host-orig ⬡ agent:patcher-07  tier-2  4m ▲   plan: patch 3 hosts      │ │
│ │ ☐ [T-000210]  ◐ AWAITING_APPROVAL  ◑ single-source       ⬡ agent:sre-01      tier-3  1m     plan: restart svc        │ │
│ │ ☐ [T-000217]  ◈ NEEDS_REVIEW       ✔ gateway-delivered   ⬡ agent:indexer-02  tier-2  9m ▲   artifact: index report   │ │
│ │ ☐ [T-000188]  ⚑ ESCALATED          ◑ agent-authored      ⬡ agent:recon-05    tier-1  22m▲  board_escalation: blocked │ │
│ └──────────────────────────── bulk: [ Approve selected ⚠ ] [ Reject selected ⚠ ]  (host-orig rows excluded from auto) ─┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components.** `DataTable` §6.2; **`TicketRef` §4.1** (item id **IS** the Board `ticket_id`, no new
id minted; links to `/review/<ticket_id>`); **gate = `StatePill` §4.5** (`awaiting_approval` / `needs_review`
per `TICKET_STATE_MACHINE.md`); **`ReviewChip` §4.10** for escalation rows (machine reason `board_escalation`
shown verbatim); **`PrincipalRef` §4.2** (proposer/author); **`TierBadge` §4.3** (provenance — **host-
originated ⇒ `UNTRUSTED`, auto-approve-lane-ineligible, rendered not decided** per ARCH §12; MC surfaces the
fact, the server enforces the lane); `Freshness` §4.9 (age + source); the tier column is criticality tier as
a `StatePill`-family chip. Bulk-approve routes through `ConfirmFriction` §5.1 (batch cap).

**Gate-entry freshness (A10, binding).** Ack/claim/silence marks are keyed on **`(ticket_id, gate, entry)`**,
not bare `ticket_id` — one ticket legally enters more than once (both gates; rework loop). A durable ack
from a prior pass **never** mutes a fresh arrival; marks clear when Board polling observes the ticket leave
and re-enter a gate (PLAN §1.4). The row shows an `ack'd` micro-tag only for the *current* entry.

**States.**
- **loaded** — as drawn.
- **loading** — skeleton table + skeleton filter chips.
- **empty** — *"No open gates. When an agent proposes a destructive plan or files work for review, it
  appears here."* (invitation, not a shrug).
- **Pattern-R error** — Board read fails: red retry banner; the last-good projection is shown greyed with
  its stale age; **decisions are disabled** while the projection is stale (you cannot approve against an
  unknown state) with the reason spelled out.
- **Pattern-D degraded** — Board or auth down → gold `HaltBand`-family note *"Board unreachable — queue is
  UNVERIFIED; approvals fail closed"*; the queue shows last-known rows greyed; the decision affordance is
  the destructive-absence render (§4.7) not a greyed button — *"approvals require a live operator session to
  Board"*.
- **stop-engaged** — kill level > G0: the gold `HaltBand` is present; **approve/execute-advancing decisions
  are refused suite-wide by the gate** and MC renders them as blocked with the honest reason (`G1
  FREEZE-DESTRUCTIVE`); `needs_review → todo/done` (non-advancing) may remain available per the state
  machine, clearly separated from the frozen advancing actions.

---

### 3.5 Review item — `/review/<ticket_id>` (+ `/ticket/<ticket_id>` 302 alias)

**Purpose.** One queue item, the decision surface. Renders the plan/artifact, the ceremony transcript link
(into Notes), the provenance, the approval binding, and the **decision affordance** (browser-direct to
Board). After clearance it renders the **latest resolution + gate history** (a ticket may pass both gates and
re-enter after rework — most-recent-first), per the FROZEN contract. A well-formed `ticket_id` MC cannot
resolve renders **"not in queue" + a Board deep-link**, never a bare 404.

```
┌ [T-000123]  ◐ AWAITING_APPROVAL · tier-2 ────────────────────────── source: board · as-of 1s ─┐
│ PROVENANCE  ⚠ UNTRUSTED host-originated (Wazuh alert fields) → auto-approve lane INELIGIBLE      │
│ PROPOSER    ⬡ agent:patcher-07     CEREMONY  planning→adversarial ✓   [ transcript note ↗ Notes]│
│ ┌ PLAN (read-only, from Board) ──────────────────────────────────────────────────────────────┐  │
│ │ Patch CVE-2026-1234 on web-01, web-02, web-03 · canary web-03 first · rollback: snapshot     │  │
│ │ blast radius: 3 hosts, tier-2, in-window 02:00–04:00 · external verify: Wazuh active→solved   │  │
│ └───────────────────────────────────────────────────────────────────────────────────────────┘  │
│ APPROVAL BINDING   requested-by ⬡ agent:patcher-07 · gate awaiting_approval · entry #1           │
│                                                                                                  │
│  [ Cancel/Reject ⚠ ]                                     [ Approve — writes to Board ⚠ danger ]  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

Selecting **Approve** opens `ConfirmFriction` §5.1 (full variant — toward-more-action): consequence block
states direction ("this authorizes Gateway execution against 3 tier-2 hosts"), echoes live `HonestState` if
a stop is engaged, requires **typed-intent + step-up** (auth Tier-2 live re-auth, `🔑 fresh`), and the
primary is **danger-red**, disabled until intent matches AND step-up is fresh. The write is **browser-direct
to Board** under the operator's session; MC records only the request in `mc_audit`. On success a `Toast`
("Approved") matching the verb; the resolve feed (`/api/events/resolve`) emits `approved` for Chat.

**MC-requested vs owner-CONFIRMED.** A decision MC has *requested* but not yet seen Board confirm renders as
`◐ approval requested — awaiting Board confirm` (`Freshness`-stamped); only when Board polling observes the
transition does it flip to `✔ approved` (§4.8-style confirmed, never a false green in between) — PLAN §1.4.

**Escalation-release affordance (A10a).** For `blocked`/escalation items the item page offers **`blocked →
todo`** (release) in addition to `→ cancelled`, via the §5.3 browser-direct write — without it the operator
who resolves an escalation could only cancel, never release (PLAN §11).

**Shared components.** `TicketRef` §4.1; `StatePill` §4.5 (full 11-state superset per PLAN §11 — `failed` vs
`cancelled` render distinctly: world-touched vs untouched; ceremony phase from Board's `ceremony_events` is
an **orthogonal badge**, MC never reads Notes frontmatter for phase); `TierBadge` §4.3 (provenance +
UNTRUSTED); `PrincipalRef` §4.2; `DangerAction` §4.7 + `ConfirmFriction` §5.1; `HonestState` §4.8 (echoed in
the confirm consequence during a stop); `Toast` §6.5; transcript link deep-links **out** to Notes (MC hosts
no editor).

**States.**
- **loaded (open gate)** — decision surface as drawn.
- **loaded (resolved)** — resolution record: `✔ approved by ◐ operator:ada · 09:44:02 · entry #1` most-recent
  first, then gate history; no decision affordance.
- **loading** — skeleton plan/binding.
- **empty / not-in-queue** — well-formed `ticket_id` not in any gate → *"T-000123 is not currently in the
  review queue"* + a Board deep-link + (if resolved earlier) its last resolution. **Never a bare 404.**
- **Pattern-R error** — decision write to Board fails (e.g. 409 stale state): red `✕ Approve failed — the
  ticket left awaiting_approval (now executing). Re-open the queue.`; the confirm modal stays open with the
  recoverable reason.
- **Pattern-D degraded** — Board/auth down → gold `HaltBand`-family note; the decision affordance becomes the
  destructive-absence render (*"a live Board session is required to decide"*), not a greyed button.
- **stop-engaged** — a `G1`/`G2` stop refuses the advancing decision at the gate; MC renders it blocked with
  the honest reason and the gold `HaltBand`.

---

### 3.6 Halt Control (global kill switch) — `/halt` (+ header actuator)

**Purpose.** MC hosts the **actuation** of the global kill switch — the cockpit affordance, wired to **CALL
auth's** level-addressed `POST /admin/killswitch {level, issued_by, reason}` under the operator's own live
session. MC is **never a second enforcer** (killswitch-chain §1, RATIFICATIONS MC-btn): it mints no epoch,
holds no standing kill credential, and stores no authoritative "halted" boolean. The readout is a **read-
mirror** of auth's epoch/level (+ auth-direct L2 from Gateway) that degrades `CONFIRMED → STALE-UNKNOWN`.

**Actuation mechanic — recommended `HoldToActuate` (§5.2), the Stage-3 CALL, justified.** The global stop is
a **press-and-hold-to-fire** control, **not** a single click. Rationale: (1) the global kill is the single
highest-blast-radius stop in the suite — a stray click or focus-stealing keypress must not fire it, yet the
operator needs it *fast* under stress; `HoldToActuate` is exactly the "fast but not accidental" reconciliation
§5.2 exists for, and typing (the dangerous-*direction* gate) is wrong here because **engaging a stop is the
toward-*less*-action direction** (§5.1 rule 4: safety-engaging paths use the light/hold mechanic, never a
typed-intent ceremony that would slow a panic stop). (2) It matches auth's identity-layer L1 actuator, so the
one motion the operator learns works in both kill-hosting apps. Dwell: **G1 ≈ 600ms** (may be pre-focused),
**G2 ≈ 1000ms** (must be explicitly focused first, never pre-focused — one deliberate G2 motion console-wide);
these are **tunable Build defaults validated by touch at ~375px in Stage 7**, not locked numbers.
`prefers-reduced-motion` → segmented numeric countdown that still enforces the dwell.

```
┌ GLOBAL KILL SWITCH ─────────────────────────────────────────────────────────────────────────────────┐
│ MIRROR (read-only, honest)                                                                            │
│   LEVEL  ● G0 NORMAL          epoch 4471   ⟳ fresh 0.3s · source: auth                                 │
│   L1 (identity, auth)  ✔ enforced · epoch 4471 · 0.3s                                                  │
│   L2 (physical, gateway) ✔ CONFIRMED · 1.1s   ← provenance: AUTH-DIRECT (killswitch-chain §4)          │
│        └ an MC-relayed L2 can read at most STALE-UNKNOWN, never CONFIRMED — regardless of freshness    │
│                                                                                                       │
│ ACTUATE (calls auth under your live session — MC holds no standing kill credential 🔒)                 │
│   ┌ ENGAGE G1 · FREEZE-DESTRUCTIVE ─────┐   ┌ ENGAGE G2 · QUIESCE-ALL ──────────────────┐              │
│   │  ▮▮  hold to fire  ( ◔ 600ms )       │   │  ▮▮▮▮ hold to fire  ( ◔ 1000ms, focus 1st) │              │
│   └──────────────────────────────────────┘   └────────────────────────────────────────────┘              │
│   reason (required, →auth): [ Field …………………………………………………………………………………… ]                              │
│                                                                                                       │
│ LIFT (toward MORE action — danger + typed-intent + step-up)   [ Lift stop ⚠ danger ]                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Constitutional absence, printed not disabled (§4.7).** The panel prints, with a lock glyph and no
control: `🔒 MC cannot enforce a stop. This button REQUESTS a halt from auth (the single enforcement point);
auth mints the epoch and propagates it. MC stores no authoritative halted state.` This is the destructive-
absence rule — never a greyed "enforce" toggle.

**Fail-loud hand-off (H1, binding).** Any non-2xx/timeout on the auth call ⇒ the app-specific
`HaltNotConfirmed` full-viewport takeover (§4): maximally loud **"HALT NOT CONFIRMED"** in halt-gold, plain
text *"The canonical outage-surviving control is auth's console; MC's button is trustworthy only while auth
is healthy,"* and a one-click deep-link to auth's `safe_stopped` console. This is **not** a toast and **not**
a red error — it is a persistent safety takeover.

**Lift** is the only toward-*more*-action control here → `DangerAction` §4.7 + `ConfirmFriction` §5.1 **full**
variant (typed-intent + step-up + red primary); **only the operator lifts** (killswitch-chain §6 — automated
guardrails fire only in the stopping direction). The halt affordance is **exempt from every scrim** and is
the `Shift+Esc` focus target (§5.3); `Shift+Esc` **focuses, never fires** the header ENGAGE-FREEZE (with the
documented non-browser-captured fallback chord obligation, §5.3).

**Shared components.** `HaltBand` §4.6 (the mirror, read-only; G2 = the intensified doubled-glyph variant,
still gold); `StatePill` §4.5 (level word); `Freshness` §4.9 (mirror-age, the `CONFIRMED→STALE-UNKNOWN`
degrade, the false-green prohibition on L2); `HonestState` §4.8 (the aftermath triad, shown on the mirror
whenever a stop is engaged — `confirmed · pending · draining`, all three slots always, copy discipline
forbids "all stopped" while pending/draining > 0); `HoldToActuate` §5.2; `DangerAction` §4.7 +
`ConfirmFriction` §5.1 (lift); `Field` §6.3 (reason).

**States.**
- **loaded (G0)** — mirror green-free neutral `● G0 NORMAL`; actuators armed.
- **loaded (engaged)** — gold ENGAGED `HaltBand` + `HonestState` triad; the ACTUATE panel offers the higher
  level (G1→G2) and the LIFT control; the aftermath counts drill down (hover → which `sub` / which host).
- **loading** — skeleton mirror with `epoch — · as-of —`; actuators disabled until the mirror loads (you
  never fire blind).
- **Pattern-R error** — **the fail-loud `HaltNotConfirmed` takeover** on a failed *actuation call* (this is
  the operator's action failing — Pattern R by origin, but rendered in halt-gold, not red, because it is a
  safety-critical outcome; §5.4 gold-for-safety overrides red-for-action here by design and by H1).
- **Pattern-D degraded** — auth mirror unreadable → `STALE-UNKNOWN` maximally loud, gold, with the auth-
  console deep-link as the **primary** next action (H7 single-operator trap); the local ENGAGE control still
  attempts the call (STOP still works — §4.6b "what's still true"), and if it too fails → `HaltNotConfirmed`.
- **stop-engaged** — this screen is where a stop is managed; the ENGAGED band, the honest triad, and the
  LIFT ceremony are the loaded content.

---

### 3.7 WIP & Budget monitors — `/budgets`

**Purpose.** The guardrail-headroom surface: auth's **four budget dimensions** (rate / concurrency /
cooldown / lifetime — **never dollars**) per `sub` + recent trips, and Board's WIP caps (per-agent + global)
with current claim counts. Write-side (operator-only): budget **clamp** → auth's budget API; **WIP cap**
change → Board's WIP surface. Loop-guard / spawn-depth flags are **surfaced + auto-triaged here, enforced at
the Board** (D-11) — MC never enforces and never writes lineage.

```
┌ WIP + BUDGET ───────────────────────────────────────────── source: auth+board · as-of 2s ─┐
│ ┌ GLOBAL WIP (shared Redis state MC owns; auth holds policy) ─────────────────────────────┐ │
│ │ global   ██████████████████░░░░  22 / 30      per-agent cap 4     ⟳ 0.6s · source: redis │ │
│ │ spawn-depth flags: 2   runaway-chain flags: 0            [ Adjust WIP cap ⚠ → Board ]    │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌ PER-AGENT BUDGETS (DataTable) ───────────────────────────────────────────────────────────┐ │
│ │ AGENT              RATE        CONCURRENCY  COOLDOWN     LIFETIME    RECENT TRIPS          │ │
│ │ ⬡ agent:patcher-07 ██░ 12% ▲   ███ 3/4      ██ 42s ▲     ██████ 61%  2 (rate, 08:12/09:02) │ │
│ │ ⬡ agent:sre-01     █████ 70%   ██ 2/4       — idle       ████ 40%    0            [ Clamp ⚠]│ │
│ └──────────────────────────────────────────────────────── card-reflow <640px ──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components.** `DataTable` §6.2; `PrincipalRef` §4.2; `Freshness` §4.9 (every figure, `source:`
stamps — global WIP is `source: redis`, budgets `source: auth`, WIP counts `source: board`); **Clamp** and
**Adjust WIP cap** are `DangerAction` §4.7 (tightening a budget = toward-*less*-action → the **light**
`ConfirmFriction` variant; **widening** a budget/cap = toward-*more* → **full** variant with typed-intent +
step-up, §5.1 rule 4); `BudgetMeter` is app-specific (§4). Spawn-depth/runaway flags echo the AttentionBand
reasons (surfaced-not-enforced).

**States.**
- **loaded** — as drawn.
- **loading** — skeleton meters + table.
- **empty** — *"No budget policy in effect for any agent. Budgets are defined in auth; WIP caps in Board."*
- **Pattern-R error** — a clamp/cap write fails: red `✕` on that row with the recoverable reason; reads keep
  their freshness.
- **Pattern-D degraded** — auth budget API or Redis WIP state down → the affected panel `STALE-UNKNOWN` gold
  (never a fabricated "0 used / all headroom" green); write controls become destructive-absence renders.
- **stop-engaged** — gold `HaltBand` present; budget/WIP reads continue (benign); widening controls remain
  gated by full friction (a stop does not auto-freeze *reads*).

---

### 3.8 Edge & Observability — `/edge`

**Purpose.** The proxy/edge health panel, consuming the frozen `OBSERVABILITY.md` contract (R10 honored):
per-app status distribution, request rate, p50/p95 latency, upstream health, forward-auth
allow/deny/redirect/fail-closed, `scrub_stripped` rate, cert expiry. Every tile is a **PromQL result with a
`source:`/`as-of` stamp** (`mc_prometheus` / `mc_blackbox` sidecars). First build ships edge-local
`edge_req_id` filtering only; the traceparent join is a Stage-7 checkpoint.

```
┌ EDGE / OBSERVABILITY ───────────────────────────────── source: mc_prometheus · as-of 5s ─┐
│ ┌ per-app 2xx/4xx/5xx ─────┐ ┌ req rate ─────┐ ┌ p50 / p95 latency ─┐ ┌ forward-auth ─────┐ │
│ │ mc      ▇▇▇▇▁ 99.2% 2xx  │ │ 41 req/s      │ │ p50 22ms p95 140ms │ │ allow 812 deny 3  │ │
│ │ board   ▇▇▇▁▁ 97.0%      │ │ 12 req/s      │ │ p50 31ms p95 210ms │ │ redirect 4        │ │
│ │ gateway ▇▇▇▇▇ 100%       │ │  2 req/s      │ │ p50 55ms p95 480ms │ │ fail-closed 0     │ │
│ │ source: caddy_..._count  │ │ caddy_reqs_.. │ │ histogram_quantile │ │ §3 log map join   │ │
│ └──────────────────────────┘ └───────────────┘ └────────────────────┘ └───────────────────┘ │
│ ┌ upstream health ─────────┐ ┌ cert expiry (mc_blackbox) ─┐ ┌ scrub_stripped rate ────────┐ │
│ │ healthy 9 / 9 upstreams  │ │ mc 61d · auth 61d · … ✔    │ │ 0.0 /s (PII scrub intact)   │ │
│ └──────────────────────────┘ └────────────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components.** `DataTable`/tile grid; **`Freshness` §4.9 on every tile** (the false-green rule is
load-bearing: a scrape gap → `STALE` gold, never a frozen-green "100% healthy"). Tiles are the app-specific
`EdgeTile` (§4). No destructive affordances on this screen (read-only observability).

**States.**
- **loaded** — as drawn.
- **loading** — skeleton tiles with `as-of —`.
- **empty** — first boot before first scrape: *"No metrics yet — mc_prometheus has not completed its first
  scrape of proxy:9100."*
- **Pattern-R error** — a single PromQL query errors: that tile shows `✕ query failed` red; siblings keep
  freshness.
- **Pattern-D degraded** — `mc_prometheus` / `mc_blackbox` sidecar down → affected tiles `STALE-UNKNOWN`
  gold (the safety reading: "cannot confirm edge health"), never a green "all healthy."
- **stop-engaged** — unaffected in content; the gold `HaltBand` mirror is present in the shell as everywhere.

---

### 3.9 Audit-anchor continuity — `/anchors`

**Purpose.** MC's independent off-box tamper-evidence witness: the Gateway's signed audit-chain HEAD series
(`gateway-mc-audit-anchor.md`), with **continuity status** — continuous / `RESYNC-PENDING` (benign gap) /
permanent-hole / regression-fork (tamper-class alarm) / `RESTORED-BEHIND-ANCHOR`. MC **never validates chain
internals** (the Gateway's chain is canonical; MC anchors the hash, not the contents) and this copy is
**never read back into any decision path**.

```
┌ AUDIT-ANCHOR CONTINUITY ─────────────────────────────── source: gateway push · as-of 41s ─┐
│ chain gw-main   latest seq 4471   ✔ CONTINUOUS   last push 41s ago                          │
│   verify: HEAD hash matches retained series   ⟳ 0.9s   (MC anchors the hash, not contents)  │
│ ┌ AuditInspector §7.2 (append-only HEAD series) ──────────────────────────────────────────┐ │
│ │ SIGNED_AT            CHAIN     SEQ    HEAD_HASH        STATUS                             │ │
│ │ 09:44:02             gw-main   4471   3af9…c1         ✔ retained                          │ │
│ │ 09:39:00             gw-main   4470   9b2e…7d         ✔ retained                          │ │
│ │ 09:31:11             gw-main   4468   —               ⚠ GAP (4469 missing) RESYNC-PENDING │ │
│ └──────────────────────── continuity: 1 benign gap awaiting Gateway backfill ──────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components.** This screen **consumes `AuditInspector` §7.2** (the shared audit family — append-only
rows, HEAD tuples, chain-verify affordance, **verify-result under the §4.9 rule: a stale or failed verify
NEVER renders green** — `⚠ CANNOT CONFIRM CHAIN` in halt-gold, `✕ CHAIN BROKEN`/fork in danger-red for a
detected break). Mono chips (per §3.8 identifier rule) for `chain_id`/`seq`/`head_hash`; `Freshness` §4.9
(push age + verify age). Read-only, always (append-only is the point; corrections are new rows).

**Continuity states rendered (PLAN §3.3, contract §4) — each a distinct honest status, never false-green.**
- **CONTINUOUS** — retained series unbroken; verify matches → `✔` (this is the one green, and only when
  verify actually confirmed).
- **RESYNC-PENDING (benign gap)** — live seq > retained tip + 1 (the guaranteed-common case: any
  restore/downtime spanning ≥1 push). Clears via **Gateway backfill** on reconnect (MC advertises last
  `(chain_id, seq)`; Gateway re-pushes above it). Rendered gold, informational — **not** a tamper alarm.
- **permanent hole** — HEADs unrecoverable after Gateway retention expiry → a **permanent, alarmed** gap in
  the series, recorded as such, never papered over.
- **regression / fork** — incoming seq/hash conflicts with retained → **tamper-class alarm**, danger-red,
  surfaced for the operator to resolve against the Gateway's own chain (Gateway stays canonical).
- **RESTORED-BEHIND-ANCHOR** — a restored Gateway presented an older HEAD as latest for a `chain_id` → flagged;
  the Gateway must continue under a NEW `chain_id` (contract §4).

**States.**
- **loaded** — as drawn (with whichever continuity status applies).
- **loading** — skeleton status header + skeleton rows.
- **empty** — pre-first-push: *"No audit-chain HEADs received. The Gateway anchors HEADs here once
  `mc:anchor` is granted and the seam is live."*
- **Pattern-R error** — `/api/anchors` read fails: red retry; last-good series greyed with stale age.
- **Pattern-D degraded** — no pushes past cadence bound (Gateway anchor push down) → `RESYNC-PENDING` gold
  with the push-age; **anchor-push failure alarms but does NOT imply a Gateway stop** (contract §4) — the
  copy tells you about freshness of the witness, not about Gateway execution health, and says so.
- **stop-engaged** — unaffected in content; kill/halt/mutex events (being audit records) anchor on the same
  cadence, so a fresh stop appears as new HEADs.

---

### 3.10 Guardrail settings — `/settings`

**Purpose.** MC-local operator state (the only durable MC-owned config): `guardrail_params` (D-12/gap-1.2
suppression thresholds, phi params, per-role progress budgets — **operator-set, no compiled-in values**),
silences, saved filters, UI prefs. Writes are `mc:admin`, audited to `mc_audit`.

```
┌ GUARDRAIL SETTINGS ─────────────────────────────────────────────────────────────────────────┐
│ ┌ SIZING PARAMS (guardrail_params) ──────────────────────────────────────────────────────────┐│
│ │ suppress_fraction   [ 40% ]  ⚠ PRE-SIZING DEFAULT — set post gap-1.2                         ││
│ │ suppress_window     [ 60s ]  ⚠ PRE-SIZING DEFAULT                                            ││
│ │ phi_threshold       [ 8  ]   noisy_net_phi [ 12 ]   (contract guidance)                      ││
│ │ progress_budget[patcher]  [ UNSET ]  ⚠ wedged classification DARK until set                  ││
│ │ posture_freshness_bound [ 15s ]   source_ttl[board] [ 5s ] …                                 ││
│ └──────────────────────────────────────────────────── [ Save params ⚠ diff-bound ] ───────────┘│
│ ┌ SILENCES (MC-local display state) ─────┐ ┌ SAVED FILTERS ───────────────────────────────────┐│
│ │ ⬡ agent:noisy-1  attention band  2h ✕  │ │ "tier-1 destructive"   "needs_review mine"        ││
│ └────────────────────────────────────────┘ └───────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Shared components.** `Field` §6.3 (inline validation, visible labels); **PRE-SIZING/UNSET states are
`StatePill`-family attention chips** (`⚠ PRE-SIZING DEFAULT`, `⚠ UNSET`) — the UI **nags until set** and no
component enforces on a PRE-SIZING value (PLAN §4.3, A4); `Save params` routes through `ConfirmFriction` §5.1
(these thresholds shape triage behavior — the confirm is **diff-hash-bound** so what you confirm is the diff
you saw, and writes a tamper-evident `mc_audit` row, mirroring policy-plane change control ARCH §12); silence
removal is a light-variant action. **RESTORED — re-confirm** state: after a restore, `guardrail_params`
render in a labelled `RESTORED — re-confirm` state until the operator re-confirms (a silent revert must not
change triage behavior undetectably — PLAN §3.3).

**States.**
- **loaded** — as drawn.
- **loading** — skeleton fields.
- **empty** — first boot: all params `UNSET`/PRE-SIZING with the nag; *"Set sizing parameters after the
  gap-1.2 measurement. Until then, wedged classification is dark and suppression uses a labelled bootstrap."*
- **Pattern-R error** — a param save fails validation or write: inline `Field` error (`--danger` triangle-
  bang), never only-on-submit.
- **Pattern-D degraded** — the `mc_data` store unreachable → gold note; editing disabled with the honest
  reason (config is MC-owned durable state — its loss degrades to defaults, never corrupts an authority).
- **stop-engaged** — unaffected; gold `HaltBand` mirror present in the shell.

---

## 4. App-specific components (each justified — cannot be a shared component)

Every one below **composes** shared §4/§5/§6 components and **never redraws a shared entity**. Each row
inside them renders `PrincipalRef`/`TicketRef`/`FenceState`/`Freshness`/`StatePill` via the shared
components.

| Component | What it is | Why it cannot be a shared component (one clause) |
|---|---|---|
| **`AttentionBand`** | The pinned strip above the fleet roster (`/agents`) surfacing server-flagged agents by reason (wedged / zombie / depth-vs-cap / consecutive-failure / longest-since-progress) | Domain-unique triage aggregation over the liveness engine's flags — content specific to MC's fleet-attention model, not a re-draw of any shared entity (its rows render `PrincipalRef`/`FenceState`/`StatePill` via the shared components); no other app has a fleet to triage. |
| **`FleetAnomalyBanner`** | The correlated-loss `FLEET_LIVENESS_ANOMALY` banner (gold, names the suppressed count + the three cross-checks) | Domain-unique to MC's population-gate/dead-man logic (contract §4); it is **not** a `HaltBand` (no stop is engaged) and **not** a `Toast` (it is persistent safety state, §6.5 forbids toasts here) — a genuinely new banner class only MC needs. |
| **`SpawnTree`** | The parent/child lineage tree on `/agents/<sub>`, derived from Board ticket lineage | A genuinely domain-unique graph widget (like an editor or a wikilink graph — explicitly sanctioned by §8.3); its nodes are `TicketRef`/`PrincipalRef` shared chips, but the tree layout itself is not a shared entity. |
| **`BudgetMeter`** | The four-dimension headroom gauge (rate/concurrency/cooldown/lifetime — never dollars) used inline in the roster and on `/budgets` | Domain-unique guardrail visualization of auth's four budget dimensions; no shared "gauge" exists and it must **never** be a money meter (ARCH: budgets are compute/time/concurrency). Its threshold-trip state reuses `StatePill`/`Freshness`. |
| **`EdgeTile`** | A single PromQL-result tile on `/edge` (per-app status, rate, p50/p95, upstream health, forward-auth, cert expiry) carrying a `source:`/`as-of` stamp | Domain-unique observability widget bound to the frozen `OBSERVABILITY.md` metric shapes; it composes `Freshness` §4.9 (the false-green rule is the whole point) but the metric rendering is MC-edge-specific. |
| **`HaltNotConfirmed`** | The full-viewport fail-loud takeover shown when the kill-switch **actuation call to auth fails** (non-2xx/timeout) — "HALT NOT CONFIRMED" + deep-link to auth's `safe_stopped` console | A genuinely MC-unique safety surface (only MC actuates the *global* stop, H1): louder and more terminal than any shared band, in halt-gold (safety), a persistent takeover — not a `Toast`, not a Pattern-R red error, not the `HaltBand` mirror (which shows a *confirmed* stop; this shows an *unconfirmed* one). |

**Explicitly NOT app-specific (consumed as shared, per §8.2):** the posture readout (= `StatePill` +
`Freshness`), the kill mirror band (= `HaltBand` §4.6), the actuator (= `HoldToActuate` §5.2), the aftermath
triad (= `HonestState` §4.8), the zombie render (= `FenceState` §4.4), the queue (= `ReviewQueue` §7.1, MC-
owned), the fleet view (= `LiveAgentView` §7.3, MC-owned), the anchor inspector (= `AuditInspector` §7.2),
every identity/ticket/tier/review chip. Redrawing any of these would be a consistency failure.

---

## 5. The human-surface API (screens/states over the SAME state the MCP surface serves)

Two views, one state (§8.4). The UI screens above and the MCP tools (PLAN §6.4) are **siblings over one
BFF API** — neither downstream of the other. The human surface reads/writes exactly these endpoints (PLAN
§6.1–6.3), all behind the proxy forward-auth (`aud=mc`, local JWKS, `auth:revocations` subscription):

**Reads (back the UI; every one display-advisory — never an input to another service's authz/enforcement):**
| Endpoint | Backs screen | Freshness/source discipline |
|---|---|---|
| `GET /api/fleet` (`?filter=`) | 3.2 Live Agent View | `source: runtime`; stream-down → Pattern-D |
| `GET /api/agents/{sub}` | 3.3 Agent drill-in | runtime + board (per-source degrade) |
| `GET /api/queue` | 3.4 Review Queue | `source: board`; stale → decisions disabled |
| `GET /api/queue/{ticket_id}` | 3.5 Review item | latest resolution + gate history |
| `GET /api/posture` | 3.1 tile, 3.6 Halt mirror | `source: auth` (+ auth-direct L2); `CONFIRMED→STALE-UNKNOWN` |
| `GET /api/budgets` | 3.7 WIP & Budget | auth (budgets) + board (WIP) + redis (global WIP) |
| `GET /api/edge` | 3.8 Edge panel | `source: mc_prometheus`/`mc_blackbox` |
| `GET /api/anchors` | 3.9 Anchor continuity | `source: gateway push`; continuity status |
| `GET /api/events` (SSE multiplex) | all live screens | `event: liveness\|queue\|posture\|budget\|anomaly`; `LiveStream` §5.5 |

**Operator action relays (every one = a call to the owning app under the operator's own session; MC holds no
standing approve/kill credential):**
| Endpoint | Screen | Target · scope · friction |
|---|---|---|
| `POST /api/killswitch/raise` | 3.6 Halt | → **auth** `POST /admin/killswitch {level, issued_by, reason}`; scope `mc:kill-switch` operator-only Tier-2; `HoldToActuate` (engage) / `ConfirmFriction` full (lift); fail-loud `HaltNotConfirmed` |
| `POST /api/budgets/clamp` | 3.7 | → **auth** budget API; operator; light friction (tighten) / full (widen) |
| `POST /api/wip` | 3.7 | → **Board** WIP-cap surface; operator; light/full by direction |
| *(queue decisions)* | 3.5 | **browser-direct to Board** — deliberately NOT an MC route (§5.3); `ConfirmFriction` full + step-up |
| `POST /api/silences`, `/api/filters`, `/api/params` | 3.10 | MC-local operator state; scope `mc:admin`; audited; `params` diff-hash-bound |

**Inbound producer endpoints (service principals — not operator UI):**
| Endpoint | Producer · scope |
|---|---|
| `POST /api/anchors` | **svc:gateway**, scope `mc:anchor` — append-only receive-and-retain; idempotent by `(chain_id, seq)`; backs 3.9 |
| `GET /api/events/resolve` | **svc:chat**, scope `mc:read` — the FROZEN resolve feed (`mc-chat-review-resolve.md` §3); MC is the **producer**; `Last-Event-ID = resolve_seq`; `event: reset` → consumer re-syncs from `GET /api/queue` |

**MCP surface (thin, the agent sibling — flat/low-arity/enum-biased, D-17 ceiling):** `report_status`
(→ advisory breadcrumb on the agent's `/agents/<sub>` trail, display-only, `mc:report`) and
`request_escalation` (→ a pinned `AttentionBand` item, dedup by `sub`+`ticket_id`, **never mutates Board
state**, `mc:escalate`). Both write to the **same state** the UI reads (the agent row / attention band) —
that is the "two views, one state" join: an escalation an agent files via MCP appears in the operator's
AttentionBand and, if it carries a Board escalation, as a `ReviewChip` in the queue.

**Live-stream contract (`LiveStream` §5.5).** `GET /api/events` is the browser multiplex; `Last-Event-ID`
replay; on a too-old cursor `event: reset` → client re-syncs from the matching REST read then resumes at the
tip. Every streamed figure carries `Freshness`; a stalled stream degrades to `STALE`/`STALE-UNKNOWN` (never a
frozen-green tile), and a *safety* signal (posture) degrades to Pattern-D. Streams **terminate on the
operator's token `exp` and on `auth:revocations`** for the operator's session → the §5.5 "session ended —
re-authenticate" state, never a silent freeze.

---

## 6. Consistency notes (what MC consumes, from where — for the sweep)

**Cross-app patterns MC owns (defined here; others deep-link in, never fork):**
- **`ReviewQueue` §7.1 — MC is the canonical owner.** `/review` + `/review/<ticket_id>` (+ `/ticket/<ticket_id>`
  302 alias) are the URLs Chat's doorbell, Notes' `needs_review`, and Board's approval-*filter* resolve to
  (FROZEN `mc-chat-review-resolve.md`). Item id **IS** the Board `ticket_id` — no new id minted. Decisions
  are browser-direct to Board (MC holds no approve credential). MC is the **producer** of the resolve feed
  (`GET /api/events/resolve`) for Chat.
- **`LiveAgentView` §7.3 — MC is the canonical owner.** `/agents` + `/agents/<sub>`; agent-runtime's thin
  status renders the same row anatomy and defers here (no rich UI of its own). Kill actuation lives on this
  cockpit (3.6).

**Cross-app pattern MC consumes (does not fork):**
- **`AuditInspector` §7.2** for `/anchors` — the shared append-only + chain-verify family, with the §4.9
  no-false-green rule on the verify result.

**Safety grammar consumed verbatim (§4, every entity rendered via the shared component):** `TicketRef` §4.1
· `PrincipalRef` §4.2 · `TierBadge` §4.3 (provenance/UNTRUSTED, rendered-not-decided) · `FenceState` §4.4
(the canonical zombie/`SUPERSEDED` render) · `StatePill` §4.5 (full 11-state ticket superset, PLAN §11) ·
`HaltBand` §4.6 (the kill mirror; G2 intensified variant) · `DangerAction` §4.7 (+ the destructive-absence
rule on MC's "cannot enforce" facts) · `HonestState` §4.8 (the stop-aftermath triad, copy discipline) ·
`Freshness` §4.9 (the false-green prohibition — the single most load-bearing rule for a mirror-app) ·
`ReviewChip` §4.10 (escalations, machine reason shown).

**Interaction grammar consumed:** `ConfirmFriction` §5.1 (light for toward-less, full for toward-more) ·
`HoldToActuate` §5.2 (the global-stop actuator — Stage-3 CALL, justified in 3.6) · `Shift+Esc` §5.3 (halt
always reachable; header actuator exempt from scrim; documented fallback-chord obligation) · honest
loading/empty/Pattern-R/Pattern-D defaults §5.4 (distinguished on every screen) · `LiveStream` §5.5 · keyboard
model §5.6.

**Shared chrome consumed:** `AppShell` §6.1 (with MC's live header actuator + posture-readout deltas, §3) ·
`DataTable` §6.2 (every roster/queue/budget/anchor table) · `Field` §6.3 (settings, reasons, confirm inputs)
· `Modal` §6.4 (confirms; halt cut out of scrim) · `Toast` §6.5 (action confirmations only — **never** for a
stop, an escalation, or a degraded dependency).

**The two disciplines the sweep should check hardest on MC** (because MC is a mirror of authorities it does
not own): (1) **no false green anywhere** — every mirrored/streamed figure carries `Freshness` and degrades
honestly (posture `CONFIRMED→STALE-UNKNOWN`; anchor `RESYNC-PENDING`/fork; tiles `STALE-UNKNOWN`; verify
never green when stale); (2) **cockpit-not-enforcer** — the kill button calls auth, queue decisions write
browser-direct to Board, and MC's lack of standing approve/kill credential is rendered as a printed
constitutional absence (§4.7), never a greyed toggle.
