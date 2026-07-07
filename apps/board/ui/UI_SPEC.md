# UI_SPEC — `board` Coordination Board (Stage 3, Standard risk / trust-critical)

> **Scope:** the human surface of the Board — the org's coordination spine. This spec covers *what the Board shows the operator and which states each screen has*; it does **not** re-specify how any shared entity is drawn. It consumes `context/DESIGN_SYSTEM.md` (FROZEN) and cites its components by ID. Data/behavior authority: `apps/board/planning/PLAN.md` (esp. §2 data model, §3–§8 claim/lease/fence/approval, §11 kill epoch, §14 ceremony, §15 UI), `context/specs/TICKET_STATE_MACHINE.md` (the 11-state lifecycle + ceremony governance — `StatePill` maps onto it), and the FROZEN contracts `board-agents-claim.md`, `mc-chat-review-resolve.md`.
>
> **Two views, one state (invariant):** every screen here is a sibling of the MCP surface (`PLAN.md` §12) over the *same* service layer + SQLite store. The UI mints nothing the API does not; it reads the facts endpoints (§7), the approval API (§8), and the one SSE stream (§15) that also feeds the MCP surface. Where the MCP tool is *structurally absent* (approval grant, `consume_approval`, terminal transitions), the corresponding operator affordance is present here — because those are operator/HTTP-surface transitions, not agent ones. That asymmetry **is** the segregation-of-duties boundary rendered.

---

## 1. Archetype declaration & governing principle

**Archetype: Instrument (control room), dark-only** — every Board screen. There is no Workshop reading pane in the Board: the huddle transcript, the plan slice, and note bodies live in **Notes** (Workshop) and are *deep-linked*, never re-rendered as paper here (`ARCHITECTURE.md` §6 — "where the conversation physically lives"). The Board renders the plan slice inside the approval surface as a **read-only rendered block inside the Instrument shell**, not as a `--paper-*` editing surface (it is decision context, not a document the operator edits).

**Governing principle:** *the Board answers "what is the fleet doing, who holds what, and is any claim still real?" and — for the one gate it owns — "is this exact plan safe to approve?"* The Board is Standard risk but **trust-critical**: it mints the approval record the whole SoD chain binds to, and it is the single authority for ticket state, ceremony phase, and the fencing generation. So the UI's job is **honest display of machine truth** — live fencing/lease liveness, live kill posture, live four-eyes state — never a fabricated green. The Board **owns the approval RECORD**; **Mission Control owns the canonical review QUEUE** (§7.1). This spec is precise about that seam at every point they touch.

---

## 2. Design-language note

This spec **consumes `DESIGN_SYSTEM.md` and states deltas only.** All tokens (§3), the safety visual grammar (§4), interaction grammar (§5), shared chrome (§6), and the three cross-app patterns (§7) are inherited verbatim. No color, type, spacing, radius, motion, or component visual is redefined here. Every shared entity is rendered through its canonical component; this document specifies only the Board-specific *composition, layout, and state enumeration*. Two genuinely domain-unique widgets are introduced and justified in §8 (the **LifecycleKanban** layout and the **CeremonyRibbon**), plus one thin lineage tree; everything else is a shared component instance.

---

## 3. Global chrome (inherited, Board composition)

- **`AppShell` §6.1** — side rail + global header + suite switcher + operator identity + session-freshness stamp. Rail entries (Board-local nav): **Board** (kanban), **Approvals**, **Ceremonies**, **Console**, **Audit**. Header center `SYSTEM STATE` zone shows the read-only suite posture (kill level + any Pattern-D dependency) once, per §6.1. Active-app wash `--signal-tint`.
- **`HaltBand` §4.6 — read-only mirror, always.** The Board is in the kill chain as an RS (`PLAN.md` §11) but hosts **no actuator** (§5.3: only MC and auth host live triggers). When kill level > G0, the gold band renders under the header suite-wide; its `[ Review halt → ]` affordance deep-links to MC (`https://mc.<SUITE_DOMAIN>/agents`) / auth. Board reads level + epoch from `auth_state` (its `auth:revocations` mirror) and stamps it with `Freshness` §4.9 — if that mirror is stale past its bound, the header does **not** show a green "G0 normal"; it flips to the §4.9 halt-gold "cannot confirm kill level — treating as fail-closed" and the app enters **Pattern D** (§5.5). The band's honest triad (`confirmed · pending · draining`) is MC-authoritative; Board renders MC's counts read-only via the suite-posture line and never invents its own aggregate.
- **`LiveStream` §5.5 — one SSE feed** (`GET /api/events`, `Last-Event-ID` replay, `event: reset` → REST re-sync from `GET /facts/...` / `/api/queue`, keep-alive < 60s), fed by the same append-only `audit_log` + `ceremony_events` the MCP surface streams. Every streamed figure (heartbeat age, lease countdown, timebox countdown, queue age) carries `Freshness`; a stalled stream degrades tiles to `STALE`, never a frozen-but-green cell. Stream terminates on token `exp` / `auth:revocations` → the shell's "session ended — re-authenticate" state.
- **Honest defaults on every screen (§5.4):** loaded / loading-skeleton / empty(invitation) / **Pattern R** (red ✕, the operator's own recoverable error) / **Pattern D** (halt-gold ⛊, a dependency down → safe-stopped) / stop-engaged (`HaltBand`). Every screen below enumerates these. Pattern R and Pattern D are never conflated — a Notes/CMDB/auth outage is gold, not red.

---

## 4. Screen: Lifecycle Kanban (`/`, rail: **Board**)

The primary surface. A column-per-lifecycle-state board over the 11-state superset, with a `blocked` swimlane and a collapsed terminal archive. This is the **`LifecycleKanban`** app-specific layout (§8.1); every card *within* it is composed entirely of shared components.

### 4.1 Wireframe

```
┌ AppShell header · SYSTEM STATE: ● G0 normal · epoch 4471 ⟳ 0.3s ─────────────────────────┐
│  (HaltBand renders here only when level > G0 — see §3)                                     │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│ [ / filter: team ▾ · type ▾ · host ▾ · taint ▾ · lane ▾ ]        view: [Kanban] [Table]    │
├──────────┬──────────┬──────────────┬──────────────┬───────────┬──────────────┬─────────────┤
│ ○ TODO   │ ◐ IN_PROG│ ▲ AWAIT_APPR │ ✔ APPROVED   │ ⧗ VERIFY  │ ◈ NEEDS_REV  │ ✔ DONE (24) │
│  (12)    │  (7)     │  +EXECUTING  │ +EXECUTING(3)│  (2)      │  (5)         │  archive ▸  │
│          │          │  (4)         │              │           │              │             │
│ ┌──────┐ │ ┌──────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌───────┐ │ ┌──────────┐ │             │
│ │[T-142]│ │[T-118]│ │ │ [T-097]  │ │ │ [T-081]  │ │ │[T-076]│ │ │ [T-070]  │ │             │
│ │pkg_upd│ │patch  │ │ │ patch    │ │ │ patch    │ │ │verify │ │ │ note-QA  │ │             │
│ │P2 ◑own│ │⬡ptc07 │ │ │▲AWAIT_AP │ │ │⛊EXEC G48 │ │ │⧗ wazuh│ │ │◈ deeplk↗│ │             │
│ │host-  │ │🔒g47  │ │ │⚠UNTRUST  │ │ │host web- │ │ │host   │ │ │ mc/rev  │ │             │
│ │ori⚠   │ │lease  │ │ │lane:full │ │ │prod-02   │ │ │nas-01 │ │ │ T-070   │ │             │
│ │lane:  │ │04:12  │ │ │→ approve │ │ │♥exec-hold│ │ │▲1.9s  │ │ │         │ │             │
│ │ full  │ │♥0.8s  │ │ │  queue   │ │ │gen48     │ │ │       │ │ │         │ │             │
│ └──────┘ │ └──────┘ │ └──────────┘ │ └──────────┘ │ └───────┘ │ └──────────┘ │             │
│  …       │  …       │              │              │           │              │             │
├──────────┴──────────┴──────────────┴──────────────┴───────────┴──────────────┴─────────────┤
│ ▸ BLOCKED swimlane (3):  [T-055] dep-unmet  ·  [T-061] ⚠SUPERSEDED gen46  ·  [T-064] held  │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Columns

Column headers are **`StatePill` §4.5** in the exact glyph+label of each lifecycle state, with a tabular count. Per `PLAN.md` §15 the columns are: `todo · in_progress · awaiting_approval · approved+executing · verifying · needs_review · done`. Notes:
- **`approved` and `executing` share one column** (the pre-execution + in-flight destructive window) — cards inside carry their own `StatePill` so the two states remain distinct at the card level; the merged column reflects that the operator watches them as one "hot" band.
- **`failed` / `cancelled` / `done`** live in the **terminal archive** (`done` shown collapsed with a count; `failed`/`cancelled` reachable via the archive expander — retained forever, `PLAN.md` §2.1). Archive is a filtered `DataTable` §6.2 view, not columns.
- **`blocked`** is a full-width **swimlane** under the columns (a ticket in `blocked` is orthogonal to flow), each entry showing the blocker reason (`dep-unmet`, reaper-`held`, or a **`FenceState` §4.4 `⚠ SUPERSEDED`** zombie for a lost-lock block).

### 4.3 Card anatomy (all shared components — zero bespoke chips)

Each card composes, top to bottom:
- **`TicketRef` §4.1** — `[T-000142]`, mono, copy-on-click; click opens the ticket detail drawer (§5). Epic/standing parentage shown as a second `TicketRef` variant chip (`epic ▸ [T-000100]`).
- Ticket `type` (advisory label, `--ink-600`) and `priority`/`severity` (tabular figures).
- **`StatePill` §4.5** for the card's lifecycle state (redundant-with-column but load-bearing in the merged approved+executing column and anywhere cards are filtered across states).
- **`PrincipalRef` §4.2** for `claimed_by` (`⬡ agent:patcher-07`), resolving to the MC agent drill-in `/agents/<sub>`; absent in `todo`.
- **`FenceState` §4.4** — the host lock: `🔒 gen 47 · lease 04:12 · ♥ 0.8s` (healthy) / `▲` (stale heartbeat, near expiry) / `⚠ SUPERSEDED by gen 48` (zombie/reaped). In the `approved+executing` column this shows `hold_kind=execution` explicitly (the never-reaper-eligible consume-time hold, `PLAN.md` §8.3) so the operator can tell a claim lease from an execution hold. Board is the fencing authority, so this is *authoritative*, not advisory here (contrast Chat's `advisory` tag).
- **`TierBadge` §4.3** — provenance/taint + lane. Host-originated / webhook-born / curation-team tickets render the **`UNTRUSTED` striped-amber ⚠** badge (`PLAN.md` §9); the badge is the operator's cue that this ticket is **auto-approve-lane-ineligible** — *the UI renders that server-decided fact, it never decides it* (§4.3 hard rule). The `lane` (`straight_to_execute · lightweight · full`) renders as a companion tier-family label, never on the halt-gold ramp.
- **`ReviewChip` §4.10** on `needs_review` cards — `◈ NEEDS REVIEW → mc/review/<ticket_id>` with the machine reason where present (`board_escalation`, `unmapped_wazuh_agent`) — **deep-links out to MC's canonical queue; the Board card never hosts a "clear review" control** (that transition is operator-human-only and lives on the canonical item page).
- A muted `→ approval queue` affordance on `awaiting_approval` cards jumps to §6 (Board's own approval-queue filter).

### 4.4 States

- **Loaded** — columns populated, cards live via SSE; heartbeat/lease/timebox figures tick with `Freshness`.
- **Loading-skeleton** — column headers with skeleton card rectangles (§5.4; never a spinner).
- **Empty** — a column with no tickets shows a one-line invitation (`No tickets awaiting approval — plans land here when an agent proposes a destructive change`); a completely empty board (fresh install) invites `File the first ticket` (deep-link to create). No mascot.
- **Pattern R (red ✕)** — a filter query that errors, or an optimistic card action rejected (e.g. operator tried an illegal transition from the card menu) → inline red notice in the interface's voice, stating what happened + fix. Recoverable, local.
- **Pattern D (halt-gold ⛊)** — a Board dependency is down: `auth` unreachable (session can't refresh) or the SSE feed's own liveness source stale → the board renders last-known cards **flagged `STALE` via `Freshness`** and a §4.6b SAFE-STOPPED band ("what's still true: existing state is last-known as-of <age>; claims/approvals fail closed; DO: reads bounded"). **Never a red error for a dependency outage.**
- **Stop-engaged** — kill level > G0: `HaltBand` §4.6 under the header. At **G2 QUIESCE-ALL** the `todo` column carries a printed "no new claims — G2 quiesce" note (claims are refused server-side with `QUIESCED`; the board states it rather than looking normal). The intensified G2 band (doubled interlock, striping, gold) is inherited from §4.6, not redrawn.

---

## 5. Screen: Ticket Detail drawer + Ceremony Ribbon (`/t/<ticket_id>`)

Opens from any `TicketRef`. A right-hand drawer (or full page at the deep-link URL) over one ticket's full record. For **planning/epic tickets running a ceremony**, the **`CeremonyRibbon` §8.2** mounts at the top.

### 5.1 Wireframe

```
┌ [T-000097]  patch nginx CVE-2026-xxxx        ▲ AWAITING_APPROVAL ─────────────────────────┐
│ type: package_update (advisory) · lane: full · ⚠ UNTRUSTED host-originated · P1           │
│ epic ▸ [T-000100]  ·  spawned_by ⬡ agent:planner-02  ·  lineage_depth 2 / cap 3           │
├─ CEREMONY RIBBON (app-specific §8.2 — only on ceremony parents) ──────────────────────────┤
│  triage ─● recon ─● planning ─● adversarial_review ─○ backlog ─ execute ─ retro           │
│  round 2 / 3   ·   timebox ⏱ 07:41 remaining  [⏸ paused: no]   ·   AR veto: ▲ RAISED       │
│  roster: PO ⬡agent:po-01 · SM ⬡agent:sm-01 · SEC ⬡agent:sec-03 · AR ⬡agent:ar-01          │
│  AR grounded dissent: ✔ 1 cited (recon note ▸)   ·   PO decision-of-record: ○ pending      │
├─ PLAN / ARTIFACT ─────────────────────────────────────────────────────────────────────────┤
│  plan slice → Notes rev pinned: note nt-… @rev 7  [ open in Notes ↗ ]  (rendered read-only)│
├─ DEPENDENCIES ────────────────────────────────────────────────────────────────────────────┤
│  blocks: [T-101]  ·  blocked-by: [T-090] ✔done                                             │
├─ HOST LOCK / FENCING ─────────────────────────────────────────────────────────────────────┤
│  FenceState: 🔒 gen 47 · hold_kind claim · lease 04:12 · ♥ 0.8s   holder ⬡agent:patcher-07 │
├─ APPROVAL RECORD (Board-owned) ───────────────────────────────────────────────────────────┤
│  status: (none yet — awaiting_approval)   → [ Go to approval decision ▸ ] (§6)             │
├─ AUDIT TAIL (AuditInspector §7.2, ticket-scoped) ─────────────────────────────────────────┤
│  12:03 ⬡planner-02 create · 12:05 ⬡planner-02 claim gen46 · 12:40 ⬡patcher-07 propose …   │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Composition

- Header state = **`StatePill` §4.5**; identities = **`PrincipalRef` §4.2**; ticket/epic refs = **`TicketRef` §4.1**; taint/lane = **`TierBadge` §4.3**; host lock = **`FenceState` §4.4**.
- **Lineage** (`spawned_by`, `lineage_depth N / cap`) rendered inline; the full spawn chain opens the **`TicketLineageTree` §8.3** in the console. `lineage_depth` at/over cap renders the `LINEAGE_CAP` consequence ("children unclaimable past cap") — a printed fact, not an error.
- **Plan / artifact** = a link out to the pinned **Notes** revision (`note_id @ rev`), plus a read-only rendered block; the Board never edits it. The huddle transcript is a Notes deep-link (`ARCHITECTURE.md` §6).
- **Approval record** section: pre-grant shows "none yet"; post-grant shows the minted `approval_id` (**`TicketRef` §4.1** related-ID variant), `action_class`, `approver_sub`/`approver_kind`, four-eyes state, `consumed_by`/`run_id` — Board-authoritative record fields.
- **Audit tail** = **`AuditInspector` §7.2**, ticket-scoped, append-only, read-only (who/verb/target/outcome `StatePill`/provenance). Rejected SoD attempts (illegal transition, stale fence, four-eyes violation) appear as first-class `violation` rows here and in the console violation log.

### 5.3 States

- **Loaded** — full record; ceremony ribbon live via SSE where applicable.
- **Loading-skeleton** — sectioned skeletons matching the layout.
- **Empty** — n/a (a ticket always has a record); a well-formed but unknown `ticket_id` renders "ticket not found" + a create hint, never a bare 404.
- **Pattern R** — an operator mutation from the drawer (e.g. `needs_review → todo` rework, or cancel) rejected by a guard/`expected_version` conflict → red inline notice with the reason and the current version.
- **Pattern D** — plan-slice render needs Notes and Notes is down → the plan block shows halt-gold `⚠ CANNOT LOAD PLAN — Notes unavailable (as-of <age>); approval decisions fail closed`, **not** a red error and **not** a blank/green box (§4.9 false-green prohibition).
- **Stop-engaged** — `HaltBand` mirror as in §3; if level ≥ G1 the "Go to approval decision" affordance carries the suspended-minting note (§6.4).

---

## 6. Screen: Approval Queue + Approval Decision (`/approvals`, rail: **Approvals**)

**The seam, stated precisely.** Board **owns the approval RECORD** (minting `approvals` + `approval_allowlist`, deriving `action_class`, enforcing four-eyes — `PLAN.md` §2.4/§8). **MC owns the canonical review QUEUE** (`ReviewQueue` §7.1, `/review/<ticket_id>`). This screen is therefore a **Board-scoped FILTER of `ReviewQueue` §7.1 anatomy — NOT a parallel design** (§7.1 explicit reconciliation): same rows, same `/review/<ticket_id>` deep-links. The **decision affordance** (approve/reject) is legitimately hosted here because the grant is a *Board* API written under the operator's own session (§7.1: "decisions are `DangerAction` written browser-direct to Board — MC holds no standing approve credential"); the same operator can decide from MC's canonical item page or from here, over one state.

### 6.1 Queue view (consumes `ReviewQueue` §7.1)

```
┌ APPROVALS — Board minting gate (awaiting_approval)   [only Board's gate; MC = full queue ↗]┐
│ DataTable §6.2 rows (ReviewQueue anatomy §7.1):                                             │
│ ┌────────────┬───────────────┬───────────────┬───────────────────┬──────────┬────────────┐│
│ │ TicketRef  │ gate StatePill │ proposer      │ TierBadge         │ age      │ →          ││
│ ├────────────┼───────────────┼───────────────┼───────────────────┼──────────┼────────────┤│
│ │ [T-000097] │ ▲AWAIT_APPR   │ ⬡patcher-07   │ ⚠UNTRUST · full   │ ⟳ 6m     │ /review/…↗ ││
│ │ [T-000112] │ ▲AWAIT_APPR   │ ⬡patcher-11   │ ◑single · light   │ ⟳ 2m     │ /review/…↗ ││
│ └────────────┴───────────────┴───────────────┴───────────────────┴──────────┴────────────┘│
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

Rows: **`TicketRef` §4.1** + gate **`StatePill` §4.5** (`awaiting_approval`) + proposer **`PrincipalRef` §4.2** + **`TierBadge` §4.3** (host-originated ⇒ `UNTRUSTED`, auto-lane-ineligible, rendered) + `age`/**`Freshness` §4.9**. The `→` column is the canonical **`/review/<ticket_id>` deep-link** to MC. Because the resolve feed is **MC-observed / advisory / at-least-once** (`mc-chat-review-resolve.md` §3), this queue reconciles via **read-time derivation from live Board state** and **never treats the feed as authoritative for the gate** (§5.5). The queue is filtered to Board's own minting gate; cross-app review items that are not Board approvals do not appear here (they live in MC's full queue).

### 6.2 Approval decision surface (Board-owned record detail)

Opening a row (or landing from the drawer's "Go to approval decision") renders the decision context — the plan the operator is signing:

```
┌ APPROVE PLAN — [T-000097] on host web-prod-02 ────────────────────────────────────────────┐
│ derived action_class: PACKAGE_UPDATE → standard (worst across allowlist)   lane: full      │
│ four-eyes: proposer ⬡patcher-07  ·  claimed_by ⬡patcher-07  ·  you ◐operator:ada           │
│ ┌ plan slice (Notes rev nt-… @7, pinned; plan_hash sha256:9f… bound) ─────────────────────┐│
│ │  (read-only rendered plan block)                                    [ open in Notes ↗ ] ││
│ └──────────────────────────────────────────────────────────────────────────────────────── ┘│
│ ┌ ALLOWLIST — the approval's content (DataTable §6.2, immutable once granted) ─────────────┐│
│ │ seq │ playbook_key            │ params_hash │ host_id     │ CMDB class binding           ││
│ │  1  │ nginx.upgrade           │ sha256:a1…  │ web-prod-02 │ standard                     ││
│ │  2  │ service.restart         │ sha256:b2…  │ web-prod-02 │ standard                     ││
│ └───────────────────────────────────────────────────────────────────────────────────────── ┘│
│ CMDB verdict: approval_mode=ask · window: in-window ✔ · decision_id cmdb-… (Freshness ⟳)    │
│                                                                                             │
│         [ Reject plan ]  (light, signal)              [ Approve & mint record ] (danger)    │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

- **Allowlist** = a **`DataTable` §6.2** instance (not a bespoke widget): `seq · playbook_key · params_hash · host_id · derived CMDB class binding`, displayed verbatim, immutable once granted (`PLAN.md` §2.5). Shown to the approver so the thing confirmed is exactly the thing that will run.
- **`action_class`** is displayed as **derived from the allowlist playbooks** (worst across invocations), *not* from the ticket `type` — the UI states this provenance so a `package_update`-typed destructive plan cannot look benign (`PLAN.md` §8.2).
- **CMDB verdict** and its `decision_id` carry **`Freshness` §4.9**; a stale/absent verdict does not render green — it renders the honest "no fresh verdict → operator-required" reading.

### 6.3 The decision affordances (inherit §4.7 / §5.1 exactly)

- **Approve = `DangerAction` §4.7 + `ConfirmFriction` §5.1 FULL variant** (toward MORE real-world action, §5.1 rule 4): danger-red primary, **typed-intent + step-up** (auth live re-auth, `🔑 fresh`), the confirm token **diff-hash-bound to `plan_hash`** (the thing confirmed is the exact plan bytes hashed), consequence block states direction ("this mints an approval that permits Gateway execution on web-prod-02") and echoes live posture. On confirm, the grant writes the `approvals` + `approval_allowlist` rows and CASes `awaiting_approval → approved` (`PLAN.md` §8.2), audited.
- **Reject = `ConfirmFriction` §5.1 LIGHT variant** (toward LESS action): single confirm, **signal-cyan** primary, no typed intent — declining to approve is the encouraged direction. Effects `awaiting_approval → cancelled`.
- **Four-eyes as a printed constitutional absence (§4.7 destructive-absence rule):** when the current operator's `sub` **is** the `proposer_id` **or** `claimed_by`, the Approve control is **not a greyed button** — it is an affirmative printed fact with a **🔒 glyph**: *"You proposed this plan — four-eyes requires a different approver. This cannot be done here by construction."* No latent-capability toggle. (Board enforces this independently of auth's PDP — `PLAN.md` §2.4 — so the UI renders a real structural block, not a hint.)

### 6.4 States

- **Loaded** — queue + decision context live.
- **Loading-skeleton** — table skeleton; decision surface section skeletons.
- **Empty** — `No plans awaiting your approval. Plans appear here when an agent proposes a destructive/irreversible change.` (invitation, §5.4).
- **Pattern R** — a grant rejected by a guard (pin moved / plan edited after pre-fetch, `expected_version` conflict, second consume race) → red inline notice with the exact reason (`plan revision changed — re-review`, `approval already consumed`), recoverable.
- **Pattern D** — the grant path's dependencies are down: **Notes** unreachable (can't fetch pinned bytes to hash) or **CMDB** unreachable (no verdict) → the decision surface shows halt-gold `⚠ APPROVAL MINTING FAILS CLOSED — <dep> unavailable (as-of <age>)`, the Approve control replaced by the printed safe-stop fact, **benign work continues** (`PLAN.md` §20.3). Gold, not red.
- **Stop-engaged** — **kill level gates approval minting** (`PLAN.md` §11): at **G1 (freeze-destructive)** the Approve control is replaced by the destructive-absence printed fact tied to the `HaltBand` (*"G1 FREEZE-DESTRUCTIVE — approval minting suspended suite-wide; existing approvals honored, no new grants"*), and any `svc:tier-approver` auto-lane is shown halted. Reject remains available (toward-less). At **G2** the band intensifies (inherited §4.6) and the same suspension holds.

---

## 7. Screen: Management Console (`/console`, rail: **Console**)

A tabbed Instrument surface for the operator's control knobs and the Board's escalation/violation/audit truth. Every mutation rides the same service layer + audit path as everything else (`PLAN.md` §15).

### 7.1 Tab: WIP & lineage policy

WIP caps editor (`wip_policy`: global / per-agent / per-team) and lineage cap (`lineage_policy.max_depth`) — **`Field` §6.3** inputs with inline validation. These are **policy-plane writes** (`PLAN.md` §11, action class `sod-critical`), so every save routes through **`ConfirmFriction` §5.1** (a cap change is a guardrail change) and writes an audit row. Caps also render on the kanban column headers (§4.2). Requires `board:admin` (operator or `svc:mc`, caps only).

### 7.2 Tab: Standing triggers & kickoffs

`DataTable` §6.2 of `standing_triggers` (kind ∈ manual/schedule/event, cron_expr, event_filter, child template, `suppress_while_open`). Create/edit via `Field` §6.3; the three kickoff types (human / scheduled / event-Wazuh) are all visible here. Editing a trigger is a `ConfirmFriction` §5.1-gated write (it changes what work the fleet spawns). The Wazuh webhook status (HMAC health, last fire) shows read-only with `Freshness`.

### 7.3 Tab: Lineage / spawn-depth (`TicketLineageTree` §8.3)

The spawn-depth chain view: epic/standing → children, with `lineage_depth` vs cap highlighted where a chain approaches or exceeds the cap (runaway-chain visibility, `PLAN.md` §11). Nodes are **`TicketRef` §4.1** + **`StatePill` §4.5**; the *agent* that spawned each node is a **`PrincipalRef` §4.2** deep-linking to MC's `LiveAgentView` `/agents/<sub>` (the canonical live/agent spawn-tree lives in MC — this Board tree is the *ticket* lineage, not the agent liveness view; §8.3 distinguishes them).

### 7.4 Tab: Escalation queue

The operator's action list for everything the Board escalates, as a `DataTable` §6.2 where each row is a **`ReviewChip` §4.10** (StatePill + machine reason + deep-link). Row kinds:
- **A1 `board_escalation`** (watchdog trips) — machine reason shown verbatim (`max_renewal_cap`, `timebox_expired`, `round_cap_exceeded`, `unresolved_veto`, `parent_cancelled`, `huddle_invalid`), deep-linking to `/review/<ticket_id>` (canonical, MC-cleared).
- **A2 `breakglass_review_ticket`** births (auth → Board) — the sole non-`todo` birth; machine reason = break-glass provenance; human-only to clear.
- **Quarantined Wazuh alerts** — born `todo · quarantine=true` (structurally unclaimable), machine reason `unmapped_wazuh_agent`, host-originated **`TierBadge` §4.3 UNTRUSTED**. **Operator resolve actions here** (Board-owned, `PLAN.md` §10.1): `Confirm CMDB mapping → re-resolve host_id & clear quarantine` (a `ConfirmFriction` §5.1-gated, audited action) or `Cancel`. This is a Board-owned gate, not the MC review queue — rendered with the shared chip anatomy but resolved here.
- **Reaper holds** (outage-gate `held` tickets, `PLAN.md` §4) — one fleet-level anomaly row with the held-ticket count and the `Clear hold` operator action (`ConfirmFriction` §5.1); shows the fleet-silence fraction with `Freshness` and the `BOARD_FLEET_SIZE` denominator (flagged if stale, §20.5).

### 7.5 Tab: Violation log

`AuditInspector` §7.2 filtered to `audit_log` `violation` rows — rejected SoD-boundary attempts (agent tried `→ done`, stale fence `STALE_FENCING`, four-eyes violation, second consume, illegal transition). Append-only, read-only; this is the spike's zero-tolerance telemetry and MC's anomaly feed (`PLAN.md` §2.9). Each row: timestamp · **`PrincipalRef`** (offender) · attempted verb · **`TicketRef`** · rejection reason · outcome `StatePill`.

### 7.6 Tab: Audit browser

`AuditInspector` §7.2 over the full `audit_log`, append-only. The Board's log is **not** itself hash-chained (Standard risk), so the inspector renders it as the append-only truth surface with `Freshness` on the live tail and **does not fabricate a green "chain verified" it cannot prove** (§4.9 false-green rule — a chain-verify affordance appears only where a chain exists, e.g. Gateway/auth, not here). Provenance pivot available for taint lineage on a ticket.

### 7.7 Console states

- **Loaded / loading-skeleton / empty** per §5.4 (empty escalation queue = *"No escalations. The watchdog files here when a huddle stalls or a lease caps out."*).
- **Pattern R** — a policy save rejected (validation, `expected_version`) → red inline on the field.
- **Pattern D** — the since-cursor console reads (`/facts/escalations`, `/facts/violations`, `/facts/holds`, `/facts/wip`) depend only on Board itself, so Pattern D here means the Board's *own* store/stream is degraded → halt-gold "console reads stale (as-of <age>); showing last-known, fail-closed." Auth-down degrades the *write* affordances (can't step-up) to the printed safe-stop fact, gold.
- **Stop-engaged** — `HaltBand` mirror; policy-write affordances that would weaken a guardrail under an active kill are shown with the suspended-state note.

---

## 8. App-specific components (justified)

Every shared entity is rendered via its canonical component (§10). Only three widgets are genuinely Board-domain-unique; each is justified per the §8/§9 consumption rule ("a genuinely domain-unique widget is fine; a re-draw of a shared entity is a consistency failure").

### 8.1 `LifecycleKanban` (the board layout)
A column-per-lifecycle-state board with a `blocked` swimlane and terminal archive, live over SSE. **Justification:** a kanban column/swimlane *layout* is a domain-unique work-tracking presentation with no shared analogue (the shared truth-surface is `DataTable`, which the Board also offers as an alternate "Table" view); it is a container, and **every element inside it is a shared component** (`StatePill` headers; `TicketRef`/`PrincipalRef`/`FenceState`/`TierBadge`/`ReviewChip` cards) — it re-draws no entity.

### 8.2 `CeremonyRibbon` (the deliberation-phase governance widget)
A per-planning-ticket ribbon showing the ceremony phase track (`triage → recon → planning → adversarial_review → backlog → execute → retro`), the server-derived **round counter** (`round / round_cap`), the **timebox countdown** with pause state (`paused_at`/`pause_total`), the **DACI governance state** (PO decision-of-record pending/filed, AR **veto** raised/cleared, AR grounded-dissent count), and the roster (`PrincipalRef` per role). **Justification:** this renders the ceremony state machine (`TICKET_STATE_MACHINE.md` §3, `PLAN.md` §14) — a domain-unique process-governance visualization (a phase-stepper + a live timebox clock + a veto/dissent governance panel) that exists nowhere else in the suite and is not expressible as any §4 entity. It **composes** shared components (roster = `PrincipalRef` §4.2; phase/veto states use the `StatePill` §4.5 glyph-grammar; the countdown carries `Freshness` §4.9; a veto is *not* recolored onto the halt-gold ramp — gold is reserved for stops); it invents no new chip. The watchdog is server-side (`PLAN.md` §14.2) — the ribbon is **read-only display of that authority**, exposing no operator control over the timebox except the deep-link to the escalation queue when A1 fires.

### 8.3 `TicketLineageTree` (spawn-depth chain)
A tree of `parent_id` → child ticket lineage with `lineage_depth`-vs-cap highlighting. **Justification:** a *ticket* lineage DAG is Board-owned data with no shared component; it is explicitly **distinct from MC's `LiveAgentView` §7.3 agent spawn tree** (which is about agent *liveness*), and it **deep-links** the spawning `PrincipalRef` out to that canonical MC view rather than duplicating it. Nodes are `TicketRef` §4.1 + `StatePill` §4.5 — no redrawn entity. (Kept thin; could fold into a `DataTable` §6.2 tree if Stage-4 prefers — flagged, not load-bearing.)

---

## 9. Human-surface API (screens/states over one state)

The UI is a browser-direct sibling of the MCP surface over the same service layer (same-origin to `board`; MC reaches the same API cross-origin via the CORS allowlist for `mc.<SUITE_DOMAIN>`, `PLAN.md` §17). Reads are the facts endpoints (§7) + `/api/queue`; the SSE stream (§15) drives liveness. Mutations are the operator-authority transitions the MCP surface deliberately lacks.

| Screen | Reads (over one state) | Mutations (operator authority) |
|---|---|---|
| Kanban (§4) | `GET /facts/ticket/{id}`, `GET /api/queue` (paginated lists per column), `GET /facts/host-lock/{host}`; SSE `/api/events` (`audit_log`+`ceremony_events`); `auth_state` mirror for `HaltBand` | none from the board face except opening detail; card menu offers only operator-legal transitions |
| Ticket detail + ribbon (§5) | `GET /facts/ticket/{id}`, `GET /facts/approval/{approval_id}`, `ceremony_events`/`huddles` projection reads, ticket-scoped audit; SSE tail | `needs_review → todo` (rework), `→ cancelled` (withdraw), `blocked → todo` — operator transitions, `ConfirmFriction` where destructive |
| Approval queue + decision (§6) | `GET /api/queue` filtered to Board's `awaiting_approval` gate; `GET /facts/approval/{id}`; pinned plan bytes via Notes; CMDB verdict | **grant** (`awaiting_approval → approved`, mints `approvals`+`approval_allowlist`, `DangerAction`+full `ConfirmFriction`, diff-hash-bound to `plan_hash`, step-up); **reject** (`→ cancelled`, light `ConfirmFriction`); **revoke** (`approved → cancelled`) |
| Console (§7) | `GET /facts/wip`, `/facts/lineage/{id}`, `/facts/escalations?since=`, `/facts/violations?since=`, `/facts/holds`; standing-trigger + policy reads; full audit | `PUT /api/policy/wip` (+ lineage), standing-trigger CRUD, **quarantine resolve** (confirm CMDB mapping → clear), **reaper-hold clear** — all `board:admin`, `ConfirmFriction`-gated, audited |

All facts reads are `Cache-Control: no-store` (§7 — staleness silently weakens SoD checks). Every mutation carries `expected_version`/`op_id` idempotency (§5) and lands an `audit_log` row streamed back to every open UI + the MCP surface. Kill-level (`auth_state`) gates the grant/consume affordances client-side *and* server-side (the UI renders the block; the server enforces it — `PLAN.md` §11).

**Structurally absent from this human surface too** (the SoD boundary, rendered as absence per §4.7): there is **no** operator affordance for `consume_approval` (Gateway-only), `approved → executing/verifying/done` (Gateway/Board-automatic), `needs_review → done` on any *non-canonical* surface (that human-only clearance lives on MC's `/review/<ticket_id>` item page), or clearing/editing taint (raise-only, server-owned, §4.3). These are printed constitutional facts where an operator might look for them, never greyed toggles.

---

## 10. Consistency notes — what the Board consumes, from where

- **Safety grammar (§4), all rendered via the canonical component, never redrawn:** `TicketRef` (tickets, epics, `approval_id`, `run_id`, `host_id`), `PrincipalRef` (`claimed_by`/`proposer_id`/`approver_sub`/roster), `TierBadge` (taint + lane; host-originated ⇒ `UNTRUSTED` auto-lane-ineligible, *rendered not decided*), `FenceState` (host lock: gen/hold_kind/lease/heartbeat, incl. zombie `SUPERSEDED` and the never-reaped `execution` hold — Board is the fencing authority so these are authoritative, not advisory), `StatePill` (all 11 lifecycle states per `TICKET_STATE_MACHINE.md`, as kanban column headers + card/detail status), `HaltBand` (read-only mirror; the Board hosts no actuator; approvals gate on level), `DangerAction`+`ConfirmFriction` (approve = full/red/typed/step-up/diff-hash-bound; reject = light/signal; policy writes gated), `HonestState` (MC-authoritative; Board renders read-only, invents no aggregate), `Freshness` (every live/mirrored figure; false-green prohibition on the kill mirror, CMDB verdict, plan-load), `ReviewChip` (A1 `board_escalation` + machine reasons, A2 breakglass births, quarantine, needs_review — deep-linking out, cleared only in MC/Board).
- **Interaction grammar (§5):** `ConfirmFriction` (the one dangerous-op gate), the `Shift+Esc` global halt-focus + documented fallback chord, honest loading/empty/**Pattern R ≠ Pattern D** on every screen, `LiveStream` (one SSE, `Last-Event-ID`, `event: reset` → REST re-sync, terminate on `auth:revocations`), full keyboard model.
- **Shared chrome (§6):** `AppShell`, `DataTable` (kanban's Table view, allowlist, standing triggers, escalation/violation/audit — the truth surface), `Field`, `Modal`, `Toast` (transient action confirmation only, never for a stop/escalation/degraded dependency, never gold).
- **Cross-app patterns (§7) — consumed, never forked:**
  - **`ReviewQueue` §7.1 — MC owns; Board consumes as a scoped filter.** Board's `/approvals` reuses the row anatomy + `/review/<ticket_id>` deep-links; it is *not* a parallel design. Board **owns the approval RECORD** and hosts the grant/reject decision (browser-direct to its own API, under the operator's session — MC holds no standing approve credential); MC **owns the unified queue**. The resolve feed (`mc-chat-review-resolve.md`) is MC-observed/advisory — the Board UI reconciles via read-time derivation and never treats it as gate-authoritative. **Quarantine resolution and needs_review→todo rework** are Board/operator gates rendered with shared chips but resolved on Board; **needs_review→done** clearance is the human-only canonical MC item page.
  - **`AuditInspector` §7.2 — shared family.** Board's ticket-audit, violation log, and audit browser are instances; read-only append-only; no fabricated chain-green (Board's log is not hash-chained — it renders honest append-only truth with `Freshness`, not an unprovable "verified").
  - **`LiveAgentView` §7.3 — MC owns.** The Board never renders agent liveness; every `PrincipalRef` deep-links to MC `/agents/<sub>`, and `TicketLineageTree` (§8.3) is explicitly the *ticket* lineage, distinct from MC's agent spawn tree, deep-linking to it.

---

## 11. Conflicts / flags for the operator or Stage-4

- **Spike gate (D-17):** the MCP schemas (`PLAN.md` §12) are PROVISIONAL until the gap-1.3 spike passes; this UI spec is over the *service layer / HTTP + facts + SSE surface*, which is **not** spike-gated, so it can proceed. The only UI coupling to the spike is that a schema-remediation that splits/renames a tool changes nothing the operator sees (the UI is over HTTP, not MCP).
- **Spec amendments A-VR / A-RR (`PLAN.md` §6a) unratified:** the drawer's voluntary-release visibility and any restore-reproposal banner assume these; until ratified, the interim rule (operator cancel + re-file) is what the UI should show. Flag for operator ratification (Open decision §21.6).
- **`svc:tier-approver` disabled by default** (`BOARD_TIER_APPROVER_ENABLED`, `PLAN.md` §13): until auth's `HOLDER_ALLOWED_KINDS[board:approve]` admits `kind=service`, **all approvals are operator-granted**. The approval decision surface should render the "auto-lane inactive — human gate universal" state honestly rather than implying a tier path exists.
- **`TicketLineageTree` (§8.3) is deliberately thin** — flagged as foldable into a `DataTable` tree if Stage-4 prefers; not load-bearing.
- No divergence from the design system was required; the approval-decision surface's plan block is rendered read-only inside the Instrument shell (not a `--paper-*` Workshop surface) by deliberate choice (§1) — recorded so a designer does not "upgrade" it to a paper reading pane.
