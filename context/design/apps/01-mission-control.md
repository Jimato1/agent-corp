# Helm · Claude Design injection block — Mission Control (the operator cockpit)

> **Paste this whole file into Claude Design by itself, AFTER the master system is built** (`../00-MASTER-BRIEF.md`). It is self-contained — it re-states the shared context it needs. Paste order & dependencies: `../INJECTION-GUIDE.md`. Source of truth: `../../DESIGN_SYSTEM.md`.

---

### ⬢ INJECTION BLOCK — Mission Control (the operator cockpit)

**Purpose (one line):** The manager's single console over the whole suite — see what every agent is doing, hold the guardrails, clear the review+approval queues, and throw the global kill switch.
**Who uses it:** Operator-facing (human UI is the whole point). A deliberately thin MCP surface exists for agents (`report_status`, `request_escalation`) but has no UI — those calls surface *into* the operator's screens. Every screen below is human.
**Archetype:** Instrument (dark control-room) — **every screen, no exceptions.** MC has **no Workshop/reading pane** anywhere: it shows plans, transcripts, and note *references* but never hosts an editor (those live in Notes/Library; MC deep-links out). Dark-only, `compact` density (28–32px rows), Inter + JetBrains Mono. No `--paper-*`, no Source Serif 4. Substrate `--sub-900` background `#0E1116`, panels `--sub-850` `#12161C`, header/rail `--sub-800` `#171C24`.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — 224px side rail (56px collapsed, glyph+tooltip) + global header + suite switcher; header carries app name, operator identity, a center `SYSTEM STATE` posture zone, and a halt affordance on the right. MC is one of only **two apps whose header halt affordance is a LIVE actuator** (the other is auth); everywhere else it is a read-only mirror.
- **HaltBand** — full-width GOLD band (`--halt-500` `#F2842B`, wash `--halt-tint` `#2E1D0B`, text `--halt-ink` `#FFD8A8`) under the header, sticky, calm interlock ▮▮ / shield ⛊ iconography, **never ✕, never red**. Member (a) KILL-SWITCH ENGAGED, member (b) SYSTEM SAFE-STOPPED (dependency-down/Pattern-D). G2 = intensified variant: heavier band, **doubled glyph `▮▮▮▮`**, full edge striping — non-hue escalation, still gold. In MC the band is a read-only mirror; the actuator is separate.
- **StatePill** — one `[glyph] LABEL` pill per lifecycle state, outline+dot on dark, **never color-only**. Kill levels render as pills: `● G0 NORMAL` (neutral `--ink-700`, no gold) / `▮▮ G1 FREEZE-DESTRUCTIVE` / `▮▮▮▮ G2 QUIESCE-ALL` (gold). Also the full 11-state ticket superset (`todo·in_progress·awaiting_approval·approved·executing·verifying·needs_review·done·failed·cancelled·blocked`) — `failed` (world-touched) vs `cancelled` (untouched) render distinctly.
- **HonestState** — the `✔ confirmed · ◐ pending ≤2m · ⇉ draining` triad; **all three slots always shown even at zero.** Copy discipline (absolute): never render "all agents stopped" while pending>0 or draining>0. Confirmed = green ✔ `--ok-500` `#46B98A`; pending = amber ◐ `--attn-500` `#E8B84B` + countdown; draining = violet ⇉ `--drain-500` `#A98CE8`.
- **Freshness** — every mirrored/streamed figure carries `⟳ age` + `source:`/`as-of` stamp. Past its bound → amber `▲ STALE` with the safe reading spelled out. **The false-green prohibition** (MC's single most load-bearing rule): a stale/unavailable read renders the honest unknown (`STALE-UNKNOWN`, `CANNOT CONFIRM`) in **halt-gold**, never a frozen green.
- **FenceState** — claim liveness: `🔒 gen 47 · lease 04:12 · ♥ 0.8s` healthy (neutral `--ink-700`, never green); `⚠ gen 46 · SUPERSEDED by gen 47` = the canonical **zombie** render (amber, agent thinks it holds a lock it lost). MC is the canonical consumer of this.
- **TicketRef** — opaque mono `[ T-000123 ]` chip on `--sub-750`, copy-on-click, middle-truncate; deep-links to `/review/<ticket_id>`.
- **PrincipalRef** — kind-glyphed mono `sub`: ⬡ agent / ◐ operator / ⚙ service; click → `/agents/<sub>`; carries own lifecycle suffix (`⛒ REVOKED`, `◼ DISABLED`).
- **TierBadge** — provenance: ✔ verified/`gateway-delivered` green outline · ⧉ cross-referenced signal-cyan · ◑ single-source/agent-authored amber · **striped-amber ⚠ UNTRUSTED** for host-originated/externally-originated content (auto-approve-lane-ineligible — the UI renders the fact, the server enforces the lane).
- **ReviewChip** — `◈ NEEDS REVIEW` / `⚑ ESCALATED · board_escalation` pill that deep-links into MC's own queue; machine reason always shown verbatim.
- **DataTable** — dense zebra (`--sub-750` stripe), sticky sortable header, mono ID column, right-aligned tabular numerics, row focus = signal-cyan left-rail + full-row ring, reflows to cards <640px. The truth-surface of every roster/queue/budget/anchor table here.
- **DangerAction + ConfirmFriction** — destructive/toward-more-action affordances are **danger-red** `--danger-500` `#E5594E` behind a **full** friction ceremony (typed-intent + auth step-up `🔑 fresh` + red primary disabled until both satisfied). Toward-*less*-action stops (engage kill, tighten budget) use the **light** variant: single confirm, **signal-cyan** `#29B6D8` primary, no typing. Destructive-*absence* rule: capabilities MC cannot have by construction are printed with 🔒/⛊ and **no control** — never a greyed toggle.
- **HoldToActuate** — press-and-hold radial-fill actuator for stops only (G1 ≈600ms, G2 ≈1000ms); `prefers-reduced-motion` → segmented numeric countdown that still enforces the dwell.
- **ConfirmFriction / Modal** — the only elevated surface; **the halt affordance is cut out of / painted above every scrim** and is the `Shift+Esc` focus target.
- **ReviewQueue (§7.1) and LiveAgentView (§7.3)** — **MC OWNS both**; the wireframes here are the reference other apps' deep-links resolve against. **AuditInspector (§7.2)** — MC consumes it for `/anchors`.
- **Toast** — transient action confirmation matching the verb; `--ok`/`--danger` only, **never gold, never for a stop/escalation/degraded dependency** (those are persistent bands).

**⌘ Screens & views to build:** (State vocabulary applied uniformly per screen — loaded / loading = skeletons matching the layout, never spinners / empty = an invitation naming what would appear + the one action that populates it / **Pattern-R** red `✕` "your action/fetch failed, here's the fix" / **Pattern-D** gold `HaltBand` "a dependency is down, system safe-stopped, NOT red" / stop-engaged = gold `HaltBand` + `HonestState` triad.)

**1. Cockpit Overview — `/`** *(Instrument)*
Six-tile grid; every tile is a **mirror** with a `source:`/`as-of` stamp — nothing here is authoritative — and each deep-links to its full screen.
```
┌ header: MISSION CONTROL · operator cockpit  [ SYSTEM STATE: ● G0 NORMAL  ⟳ epoch 4471 · 0.3s · auth ]  ◐ operator:ada 🔑 fresh  [▮▮ ENGAGE-FREEZE ⌂] ┐
├ rail ┬──────────────────────────────────────── content ────────────────────────────────────────────────────────────────┤
│ ⌂ Home │ ┌ POSTURE ───────────┐ ┌ FLEET ──────────────┐ ┌ QUEUE ───────────────┐ ┌ GUARDRAILS ────────┐ │
│ ⬡ Agents│ │ ● G0 NORMAL        │ │ 18 online · 1 wedged*│ │ 6 awaiting_approval  │ │ WIP 22/30 global   │ │
│ ◈ Review│ │ L1 auth ✔ 0.3s     │ │ 1 zombie ⚠ · 0 crash │ │ 3 needs_review       │ │ 3 budgets near cap▲│ │
│ ▮▮ Halt │ │ L2 gateway ✔ auth-dir│ │                     │ │ 1 escalated ⚑       │ │ 2 spawn-depth flags│ │
│ ▤ Budget│ │ source: auth · 0.3s│ │ source: runtime·0.8s│ │ source: board · 2s   │ │ source: auth+board │ │
│ ~ Edge │ └────────[Halt →]────┘ └───────[Agents →]────┘ └──────[Review →]──────┘ └──────[Budgets →]───┘ │
│ ⛓ Anchors│ ┌ DEPENDENCIES ──────────────────────────┐ ┌ ANCHOR CONTINUITY ───────────────────────────┐│
│ ⚙ Settings│ │ auth ✔0.3s board ✔2s gateway ✔1.1s …  │ │ chain gw-main: seq 4471 ✔ continuous · 0.9s ago││
└──────┴──────────────────────────────────────────────────────────────────────────────────────────────┘
```
Primary actions: navigate via tiles. **Pattern-R is per-tile** — a single tile's read failing (e.g. Board 500) shows `✕ QUEUE READ FAILED — retry` in that tile alone in `--danger`; other tiles keep their own freshness (a per-tile failure never reds the whole page). Derived totals that can't reconcile show `? N unaccounted`, never a fabricated zero. **Empty** only on a fresh suite (fleet tile → *"No agents have reported… start an agent process to populate the fleet"*). **stop-engaged:** gold band sticky under header, `[Halt →]` becomes `[Review halt →]`.

**2. Live Agent View (fleet) — `/agents`** *(canonical `LiveAgentView`, MC owns it)*
One row per agent from the runtime heartbeat SSE, with an **AttentionBand** (app-specific) pinning server-flagged agents above the full roster.
```
┌ FLEET LIVENESS ──────────────────────────────── ⟳ fresh 0.8s · source: runtime · roster 20 ─┐
│ ┌ ATTENTION (server-flagged, pinned) ──────────────────────────────────────────────────────┐│
│ │ ⚠ SUPERSEDED  ⬡ agent:patcher-07  step 41 · [T-000123]  🔒gen46 SUPERSEDED by gen47  ♥9.4s ││
│ │ ▲ NO-PROGRESS ⬡ agent:indexer-02  step 12 · [T-000217]  longest-since-progress 14m         ││
│ │ ▲ FAIL×3      ⬡ agent:sre-01      step  7 · [T-000210]  consecutive-failure 3 · cooldown ▲ ││
│ │ ────────────────────────────── *PRE-SIZING: per-role progress budget UNSET ────────────────┘│
│ ┌ ROSTER (DataTable) ───────────────────────────────────────────────────────────────────────┐│
│ │ AGENT (sub)        LIVENESS            STEP·TICKET      FENCING            BUDGET      MODEL ││
│ │ ⬡ agent:patcher-07 ▲ SUSPECT φ7.2 ♥9.4s 41·[T-000123]  ⚠ gen46 SUPERSEDED  rate 12%▲  qwen32b││
│ │ ⬡ agent:indexer-02 ● LIVE ♥0.6s        12·[T-000217]  🔒 gen47 ♥0.6s      conc 3/4    qwen14b││
│ │ ⬡ agent:librarian-3 ⇉ DRAINING ♥1.2s    —·—           🔒 gen19            lifetime 61% …    ││
│ │ ⬡ agent:recon-05   ◼ DRAINED (reported) —·—            —                  —          …      ││
│ └──────────────────────────────────────────────────────── 20 rows · card-reflow <640px ──────┘│
```
**Liveness is NEVER a bare green dot** — it is the phi-accrual suspicion figure `φ7.2` + last-beat age `♥9.4s` (both `Freshness`) plus a `StatePill` (`● LIVE / ▲ SUSPECT / ⇉ DRAINING / ◼ DRAINED / QUIESCED-BY-OUTAGE`). Honesty rules: `DRAINED` is a distinct terminal *report*, never inferred from silence; `QUIESCED_BY_OUTAGE` is its own pill (inferred absence ≠ commanded drain); where the per-role progress budget is **UNSET**, wedged classification is **dark** and the interim signal is a labelled *"longest-since-progress"* sort tagged **not wedged-classified / PRE-SIZING** — no threshold is invented. **Pattern-D has two gold sub-cases:** (1) runtime SSE stream down → SAFE-STOPPED note over the roster, every liveness cell → `STALE-UNKNOWN`; (2) `FLEET_LIVENESS_ANOMALY` (correlated loss) → the app-specific **FleetAnomalyBanner** suppresses per-agent death display and names the suppressed count + three cross-checks (**suppression hides the flood, never the fact of it**). **stop-engaged:** commanded agents show `⇉ DRAINING → ◼ DRAINED`; a rogue agent ignoring drain stays `● LIVE` and is pinned to the AttentionBand as a **discrepancy** — the roster never claims "all stopped" while any agent is non-DRAINED.

**3. Agent drill-in — `/agents/<sub>`** *(Instrument)*
Four panels: CURRENT CLAIM (`TicketRef` + `StatePill` + `FenceState` zombie), BUDGET (4-dim `BudgetMeter`, never dollars), SPAWN TREE (from **Board lineage**, never heartbeats), PROGRESS TRAIL (advisory breadcrumbs; a `report_status` breadcrumb carrying host-originated text gets a `TierBadge UNTRUSTED`).
```
┌ ⬡ agent:patcher-07  ▲ SUSPECT φ7.2 · ♥9.4s · session s-9f3a · patcher@qwen3-32b ── source: runtime · 0.8s ┐
│ ┌ CURRENT CLAIM ──────────────┐ ┌ BUDGET (4-dim, never dollars) ──────────────────────────────┐│
│ │ [T-000123] ▲ executing·tier2│ │ rate ███████░░ 12%▲   cooldown ██████████ 42s▲              ││
│ │ 🔒 gen46·lease 00:03·♥9.4s  │ │ concurrency ████░░ 3/4  lifetime ██████░░ 61% of TTL        ││
│ │ ⚠ SUPERSEDED by gen47(zombie)│ │ source: auth · 1.1s                                        ││
│ ┌ SPAWN TREE (Board lineage) ─┐ ┌ PROGRESS TRAIL (advisory) ──────────────────────────────────┐│
│ │ [T-000100] epic             │ │ 09:41 step41 report_status:"retrying apt lock" ⚠host-orig?no ││
│ │ └[T-000123] ⬡patcher-07←here│ │ 09:37 step39 ⚑ request_escalation "apt held 14m"            ││
│ │   └[T-000131] ⬡patcher-09   │ │ source: runtime + mc:report · 0.8s                          ││
│ │ depth 2 / cap 4             │ └──────────────────────────────────────────────────────────────┘│
```
**Degrades per source:** runtime stream down → liveness/trail panels go `STALE-UNKNOWN` gold while the **Board lineage/claim panels stay live** (different source). **Empty:** a known drained `sub` → *"agent:patcher-07 is not currently reporting… showing last-known claim and lineage from Board."* Unknown `sub` → *"No such principal in the live fleet"* + link to auth, never a bare 404.

**4. Review + Approval Queue — `/review`** *(canonical `ReviewQueue`, MC owns it)*
The unified inbox for **both** human gates — pre-execution `awaiting_approval` and post-work `needs_review` (plus `board_escalation` arrivals and break-glass `needs_review` births). Chat's doorbell, Notes' `needs_review`, and Board's approval-*filter* all resolve here. Item id **IS the Board `ticket_id`** — no new id minted.
```
┌ REVIEW + APPROVAL QUEUE ── / focus filter ──────────────────────── source: board · as-of 2s ─┐
│ [all] [awaiting_approval 6] [needs_review 3] [escalations 1] [saved:"tier-1 destructive"] [⚙ silences]│
│ ┌ DataTable ─────────────────────────────────────────────────────────────────────────────────┐│
│ │☐ TICKET     GATE               PROVENANCE           PROPOSER          TIER   AGE  REASON      ││
│ │☐ [T-000123] ◐ AWAITING_APPROVAL ⚠ UNTRUSTED host-orig ⬡agent:patcher-07 tier2 4m▲ patch 3 hosts││
│ │☐ [T-000210] ◐ AWAITING_APPROVAL ◑ single-source      ⬡agent:sre-01     tier3 1m  restart svc  ││
│ │☐ [T-000217] ◈ NEEDS_REVIEW      ✔ gateway-delivered  ⬡agent:indexer-02 tier2 9m▲ index report ││
│ │☐ [T-000188] ⚑ ESCALATED         ◑ agent-authored     ⬡agent:recon-05   tier1 22m▲ board_escal ││
│ └──── bulk: [Approve selected ⚠] [Reject selected ⚠]  (host-orig rows excluded from auto) ──────┘│
```
Gate = `StatePill`; provenance = `TierBadge` (**host-originated ⇒ striped-amber UNTRUSTED, auto-lane-ineligible, rendered not decided**); decisions are `DangerAction`s written **browser-direct to Board** under the operator's own session (MC holds no standing approve credential). Ack/silence marks keyed on `(ticket_id, gate, entry)` — a durable ack never mutes a fresh re-entry; `ack'd` micro-tag shows only for the current entry. **Pattern-R** (Board read fails): last-good projection greyed with stale age, **decisions disabled** (can't approve against unknown state) with the reason spelled out. **Pattern-D** (Board/auth down): gold note *"Board unreachable — queue UNVERIFIED; approvals fail closed"*, decision affordance becomes the **destructive-absence render** (*"approvals require a live operator session to Board"*), not a greyed button. **stop-engaged:** approve/execute-advancing decisions refused suite-wide by the gate, rendered blocked with the honest reason; non-advancing `needs_review → todo/done` may remain, clearly separated.

**5. Review item — `/review/<ticket_id>`** (+ `/ticket/<ticket_id>` 302 alias) *(Instrument)*
The decision surface for one item: provenance line, proposer, ceremony transcript link (**out to Notes**), read-only plan/artifact from Board, approval binding, and the decision affordance.
```
┌ [T-000123]  ◐ AWAITING_APPROVAL · tier-2 ────────────────── source: board · as-of 1s ┐
│ PROVENANCE ⚠ UNTRUSTED host-originated (Wazuh alert fields) → auto-approve lane INELIGIBLE │
│ PROPOSER ⬡ agent:patcher-07   CEREMONY planning→adversarial ✓  [ transcript note ↗ Notes ]│
│ ┌ PLAN (read-only, from Board) ────────────────────────────────────────────────────────┐│
│ │ Patch CVE-2026-1234 on web-01/02/03 · canary web-03 first · rollback: snapshot         ││
│ │ blast radius: 3 hosts, tier-2, in-window 02:00–04:00 · verify: Wazuh active→solved     ││
│ APPROVAL BINDING  requested-by ⬡ agent:patcher-07 · gate awaiting_approval · entry #1     │
│  [ Cancel/Reject ⚠ ]                              [ Approve — writes to Board ⚠ danger ]  │
```
**Approve** opens `ConfirmFriction` **full** variant (toward-more-action): consequence block states direction (*"this authorizes Gateway execution against 3 tier-2 hosts"*), echoes live `HonestState` if a stop is engaged, requires **typed-intent + step-up** (auth Tier-2 re-auth `🔑 fresh`), red primary disabled until both match. Write is browser-direct to Board; MC records only the request in `mc_audit`. **MC-requested vs owner-CONFIRMED:** a decision MC requested but hasn't seen Board confirm renders `◐ approval requested — awaiting Board confirm` (`Freshness`-stamped); flips to `✔ approved` only when Board polling observes the transition — **never a false green in between.** For `blocked`/escalation items the page also offers **`blocked → todo`** (release) alongside `→ cancelled`. **loaded (resolved):** resolution record `✔ approved by ◐ operator:ada · 09:44:02 · entry #1` most-recent-first + gate history, no decision affordance. **Not-in-queue:** a well-formed `ticket_id` MC can't resolve → *"T-000123 is not currently in the review queue"* + Board deep-link, **never a bare 404.** **Pattern-R:** a 409 stale write → red `✕ Approve failed — the ticket left awaiting_approval (now executing). Re-open the queue.` with the confirm modal staying open.

**6. Halt Control (global kill switch) — `/halt`** (+ header actuator) *(Instrument)* — **THE signature safety screen.**
MC hosts the **actuation** of the global kill switch, wired to **CALL auth's** `POST /admin/killswitch {level, issued_by, reason}` under the operator's own session. MC mints no epoch, holds no standing kill credential, stores no authoritative "halted" boolean — the readout is a **read-mirror** that degrades `CONFIRMED → STALE-UNKNOWN`.
```
┌ GLOBAL KILL SWITCH ───────────────────────────────────────────────────────────────────┐
│ MIRROR (read-only, honest)                                                             │
│   LEVEL  ● G0 NORMAL        epoch 4471   ⟳ fresh 0.3s · source: auth                    │
│   L1 (identity, auth)    ✔ enforced · epoch 4471 · 0.3s                                 │
│   L2 (physical, gateway) ✔ CONFIRMED · 1.1s  ← provenance: AUTH-DIRECT                  │
│        └ an MC-relayed L2 can read at most STALE-UNKNOWN, never CONFIRMED               │
│ ACTUATE (calls auth under your live session — MC holds no standing kill credential 🔒)  │
│   ┌ ENGAGE G1 · FREEZE-DESTRUCTIVE ─┐  ┌ ENGAGE G2 · QUIESCE-ALL ───────────┐          │
│   │  ▮▮  hold to fire ( ◔ 600ms )   │  │ ▮▮▮▮ hold to fire (◔1000ms, focus 1st)│         │
│   reason (required, →auth): [ Field ……………………………………………………… ]                              │
│ LIFT (toward MORE action — danger + typed-intent + step-up)   [ Lift stop ⚠ danger ]    │
```
**Actuator mechanic = `HoldToActuate`** (press-and-hold, NOT a click): the global kill is the highest-blast-radius stop in the suite, so a stray click/keypress must never fire it — yet the operator needs it fast. Typing is **wrong** here because engaging a stop is the toward-*less*-action direction (typed-intent ceremonies are reserved for toward-more). **G1 ≈600ms** (may be pre-focused), **G2 ≈1000ms** (must be explicitly focused first, never pre-focused — one deliberate motion; the actuator uses non-hue intensification: **doubled glyph `▮▮▮▮`** + heavier weight + striping, still gold). `prefers-reduced-motion` → segmented numeric countdown that still enforces the dwell. **Constitutional absence, printed not disabled:** the panel prints, with 🔒 and no control, *"MC cannot enforce a stop. This button REQUESTS a halt from auth (the single enforcement point); auth mints the epoch and propagates it. MC stores no authoritative halted state."* — never a greyed "enforce" toggle. **The header ENGAGE-FREEZE actuator is exempt from every scrim** and is the `Shift+Esc` focus target (`Shift+Esc` **focuses, never fires**). **LIFT is the only toward-more control here** → `DangerAction` + `ConfirmFriction` full (typed-intent + step-up + red primary); only the operator lifts. **Pattern-R = the fail-loud `HaltNotConfirmed` full-viewport takeover** (see below). **Pattern-D:** auth mirror unreadable → `STALE-UNKNOWN` maximally loud gold, with the auth-console deep-link as the **primary** next action; the local ENGAGE control still attempts the call (STOP still works), and if it too fails → `HaltNotConfirmed`.

**7. WIP & Budget monitors — `/budgets`** *(Instrument)*
auth's **four budget dimensions** per `sub` (rate/concurrency/cooldown/lifetime — **NEVER dollars**) + recent trips, and Board's WIP caps (per-agent + global) with current claim counts.
```
┌ WIP + BUDGET ──────────────────────────────── source: auth+board · as-of 2s ┐
│ ┌ GLOBAL WIP (Redis state MC owns; auth holds policy) ──────────────────────┐│
│ │ global ██████████████░░░ 22/30   per-agent cap 4   ⟳0.6s · source: redis   ││
│ │ spawn-depth flags: 2  runaway-chain flags: 0   [ Adjust WIP cap ⚠ → Board ]││
│ ┌ PER-AGENT BUDGETS (DataTable) ────────────────────────────────────────────┐│
│ │ AGENT             RATE      CONCURRENCY COOLDOWN  LIFETIME RECENT TRIPS     ││
│ │ ⬡ agent:patcher-07 ██░12%▲  ███ 3/4     ██ 42s▲   ██████ 61% 2(rate)        ││
│ │ ⬡ agent:sre-01     █████70% ██ 2/4      —idle     ████ 40% 0     [ Clamp ⚠ ]││
```
Meters = app-specific **`BudgetMeter`** (four-dim gauge, never money). **Directional friction:** tightening a budget / cap = toward-less → **light** confirm (signal-cyan); **widening** = toward-more → **full** confirm (typed-intent + step-up). Loop-guard/spawn-depth flags are **surfaced + auto-triaged here, enforced at the Board** — MC never enforces, never writes lineage. **Pattern-D:** auth/Redis down → affected panel `STALE-UNKNOWN` gold (never a fabricated "0 used / all headroom" green); write controls become destructive-absence renders.

**8. Edge & Observability — `/edge`** *(Instrument, read-only)*
Proxy/edge health tiles: per-app 2xx/4xx/5xx, request rate, p50/p95 latency, forward-auth allow/deny/redirect/fail-closed, upstream health, cert expiry, `scrub_stripped` rate. Every tile is a PromQL result with a `source:`/`as-of` stamp (`mc_prometheus` / `mc_blackbox` sidecars). Tiles = app-specific **`EdgeTile`**. No destructive affordances. **Pattern-D:** a sidecar down → affected tiles `STALE-UNKNOWN` gold ("cannot confirm edge health"), never a green "all healthy."

**9. Audit-anchor continuity — `/anchors`** *(Instrument, read-only — consumes `AuditInspector`)*
MC's independent off-box tamper-evidence witness: the Gateway's signed audit-chain HEAD series with continuity status. **MC anchors the hash, not the contents** — it never validates chain internals and this copy is never read back into any decision path.
```
┌ AUDIT-ANCHOR CONTINUITY ──────────────────── source: gateway push · as-of 41s ┐
│ chain gw-main  latest seq 4471  ✔ CONTINUOUS  last push 41s ago                │
│   verify: HEAD hash matches retained series  ⟳0.9s  (anchors hash, not content)│
│ ┌ AuditInspector §7.2 (append-only HEAD series) ─────────────────────────────┐│
│ │ SIGNED_AT   CHAIN    SEQ   HEAD_HASH   STATUS                                ││
│ │ 09:44:02    gw-main  4471  3af9…c1     ✔ retained                            ││
│ │ 09:31:11    gw-main  4468  —           ⚠ GAP (4469 missing) RESYNC-PENDING   ││
```
Continuity states, each a distinct honest status **never false-green**: **CONTINUOUS** = `✔` green (the one green, only when verify actually confirmed) · **RESYNC-PENDING** = benign gap, gold/informational, clears via Gateway backfill · **permanent hole** = alarmed gap after retention expiry · **regression/fork** = tamper-class **danger-red** alarm · **RESTORED-BEHIND-ANCHOR** = flagged, Gateway must continue under a new `chain_id`. Verify result follows the §4.9 rule: stale/failed verify → `⚠ CANNOT CONFIRM CHAIN` halt-gold, `✕ CHAIN BROKEN` danger-red for a detected break — **never green.** **Pattern-D:** anchor-push failure alarms but does **NOT** imply a Gateway stop (freshness of the witness ≠ Gateway execution health, and the copy says so).

**10. Guardrail settings — `/settings`** *(Instrument)*
The only durable MC-owned config: `guardrail_params` (suppression thresholds, phi params, per-role progress budgets — **operator-set, no compiled-in values**), silences, saved filters, UI prefs.
```
┌ GUARDRAIL SETTINGS ──────────────────────────────────────────────────────────┐
│ ┌ SIZING PARAMS ─────────────────────────────────────────────────────────────┐│
│ │ suppress_fraction [ 40% ] ⚠ PRE-SIZING DEFAULT — set post gap-1.2           ││
│ │ suppress_window   [ 60s ] ⚠ PRE-SIZING DEFAULT                              ││
│ │ phi_threshold [ 8 ]  noisy_net_phi [ 12 ]                                    ││
│ │ progress_budget[patcher] [ UNSET ] ⚠ wedged classification DARK until set    ││
│ │                                          [ Save params ⚠ diff-bound ]        ││
│ ┌ SILENCES ────────────┐ ┌ SAVED FILTERS ──────────────────────────────────┐  │
│ │ ⬡agent:noisy-1 2h ✕  │ │ "tier-1 destructive"  "needs_review mine"        │  │
```
`Field` inputs with inline validation (never only-on-submit). **PRE-SIZING/UNSET states are `StatePill`-family attention chips** — the UI **nags until set** and no component enforces on a PRE-SIZING value. `Save params` routes through `ConfirmFriction` **diff-hash-bound** (what you confirm is the exact diff you saw) and writes a tamper-evident `mc_audit` row (mirrors policy-plane change control). **`RESTORED — re-confirm` state:** after a restore, params render in a labelled re-confirm state until the operator re-confirms (a silent revert must not change triage behavior undetectably). **Pattern-D:** `mc_data` store unreachable → gold note, editing disabled with the honest reason (config loss degrades to defaults, never corrupts an authority).

**◈ App-specific components (only where justified):** Each **composes** shared chips (`PrincipalRef`/`TicketRef`/`FenceState`/`Freshness`/`StatePill`) and never redraws a shared entity.
- **`AttentionBand`** — the pinned strip above the fleet roster (`/agents`) surfacing server-flagged agents by reason (wedged / zombie / depth-vs-cap / consecutive-failure / longest-since-progress), sorted worst-first. *Why not shared:* domain-unique triage aggregation over the liveness engine's flags; no other app has a fleet to triage.
- **`FleetAnomalyBanner`** — the correlated-loss `FLEET_LIVENESS_ANOMALY` banner (gold, persistent), naming the suppressed count + the three cross-checks (dead-man frame · auth health · edge health). *Why not shared:* it is **not** a `HaltBand` (no stop engaged) and **not** a `Toast` (persistent safety state, forbidden as a toast) — a new banner class only MC's population-gate/dead-man logic needs.
- **`SpawnTree`** — the parent/child lineage tree on `/agents/<sub>`, derived from **Board ticket lineage** (never heartbeats), showing `depth N / cap M`. *Why not shared:* a genuinely domain-unique graph widget (like an editor); its nodes are shared chips but the tree layout is not a shared entity.
- **`BudgetMeter`** — the four-dimension headroom gauge (rate/concurrency/cooldown/lifetime — **never dollars**), used inline in the roster and full on `/budgets`; threshold-trip state reuses `StatePill`/`Freshness`. *Why not shared:* no shared "gauge" exists and it must never be a money meter.
- **`EdgeTile`** — a single PromQL-result tile on `/edge` carrying a `source:`/`as-of` stamp. *Why not shared:* observability widget bound to the frozen `OBSERVABILITY.md` metric shapes; it composes `Freshness` (the false-green rule is the whole point) but the metric rendering is edge-specific.
- **`HaltNotConfirmed`** — the **full-viewport fail-loud takeover** shown when the kill-switch actuation call to auth fails (non-2xx/timeout): maximally loud **"HALT NOT CONFIRMED"** in halt-gold, plain text *"The canonical outage-surviving control is auth's console; MC's button is trustworthy only while auth is healthy,"* and a one-click deep-link to auth's `safe_stopped` console. *Why not shared:* only MC actuates the *global* stop; louder and more terminal than any shared band, a persistent takeover — not a `Toast`, not a Pattern-R red error, not the `HaltBand` mirror (which shows a *confirmed* stop; this shows an *unconfirmed* one). **Rendered in halt-gold, NOT red** — gold-for-safety overrides red-for-action here by design.

**⚠ Safety / danger surfaces specific to this app:**
- **The global kill actuation (`/halt` + header).** `HoldToActuate` press-and-hold (G1 ~600ms / G2 ~1000ms doubled-glyph `▮▮▮▮` non-hue intensified gold); engaging is the toward-*less*-action direction → **hold, never typed-intent** (typing a panic stop is wrong). The header actuator is **exempt from every scrim** and is the `Shift+Esc` focus target (focuses, never fires — with a documented non-browser-captured fallback chord obligation). **Lift** is the sole toward-more control → full `ConfirmFriction` + step-up + red, operator-only.
- **Cockpit-not-enforcer, rendered as constitutional absence.** MC holds no standing approve or kill credential. The kill button **calls auth**; queue decisions write **browser-direct to Board**. This lack of authority is a **printed 🔒 absence** (*"MC cannot enforce a stop… auth mints the epoch"*), never a greyed toggle.
- **Fail-loud hand-off.** Any non-2xx/timeout on the auth kill call ⇒ the `HaltNotConfirmed` full-viewport takeover (persistent, gold, deep-links to auth's outage-surviving console).
- **Never a false green (the mirror discipline).** Every mirrored/streamed figure carries `Freshness`; a stale/unavailable read renders `STALE-UNKNOWN`/`CANNOT CONFIRM` in **halt-gold**, never a frozen green. Posture degrades `CONFIRMED → STALE-UNKNOWN`; an MC-relayed L2 can read at most `STALE-UNKNOWN`, never `CONFIRMED`; a verify never renders green when stale; derived totals that can't reconcile show `? N unaccounted`, never a fabricated zero.
- **Provenance / auto-lane ineligibility in the queue.** Host-originated content = striped-amber ⚠ `UNTRUSTED` `TierBadge`, excluded from bulk auto-approve — MC surfaces the fact; the server enforces the lane.
- **HonestState copy discipline.** Wherever a stop aftermath appears, the `confirmed · pending · draining` triad shows all three slots; the UI never says "all agents stopped" while pending>0 or draining>0. A rogue agent ignoring a drain command stays `● LIVE` and is pinned as a discrepancy — the display never lies that the fleet stopped.
- **Fleet-loss suppression that hides the flood, not the fact.** `FleetAnomalyBanner` suppresses per-agent death spam under correlated loss while loudly stating a fleet-wide anomaly is in progress.

**⚑ Gaps flagged:**
- **[GAP — PRE-SIZING numeric defaults are placeholders, not design decisions]** `suppress_fraction 40%`, `suppress_window 60s`, `phi_threshold 8`, `noisy_net_phi 12`, and every per-role `progress_budget` are explicitly UNSET/bootstrap pending the gap-1.2 measurement. Design the `⚠ PRE-SIZING DEFAULT` / `⚠ UNSET` attention-chip treatment and the persistent "nag until set" affordance; do not present these values as authoritative.
- **[GAP — HoldToActuate dwell times are tunable Build defaults]** G1 ≈600ms / G2 ≈1000ms are validated-by-touch in Stage 7 at ~375px, not locked; design the radial-fill (and reduced-motion segmented-countdown) to accept a tuned value.
- **[GAP — `Shift+Esc` fallback chord]** Chromium may capture `Shift+Esc`; a documented non-browser-captured fallback chord must be selectable if the Stage-7 physical test fails — the exact chord is unspecified.
- Otherwise the spec is complete for design: all colors, glyphs, states, and layouts resolve to frozen `DESIGN_SYSTEM.md` tokens/components.
