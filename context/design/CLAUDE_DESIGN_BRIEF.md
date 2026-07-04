# CLAUDE_DESIGN_BRIEF.md — Design Brief Package for Claude Design

> **What this is.** A paste-ready package that translates the suite's frozen engineering design system (`context/DESIGN_SYSTEM.md`) and its per-app UI specs into **visual-first briefs for Claude Design**. It is documentation/synthesis only — **no code, no new design decisions.** Everything here traces to `DESIGN_SYSTEM.md`, the per-app `ui/UI_SPEC.md` files, and the ratified auth safety cues (`RATIFICATIONS_2026-07-02.md`). Where a spec was silent on something a designer will need, it is marked **`[GAP — operator/Claude Design to decide]`** rather than invented.
>
> **How to use it (short version — full guide in Part 3).** Paste **Part 1** into Claude Design first to build the shared system. Then, once the system exists, paste **each Part-2 block one at a time** in the recommended order to build each app on top of that system. Each Part-2 block is **self-contained** — it re-states the shared context it needs, because Part 1 will not be in Claude Design's context when you paste it later.
>
> **Three parts:** Part 1 — the master brief (suite name + the whole design-system seed). Part 2 — one injection block per app. Part 3 — the injection guide (order + dependencies).

---

# PART 1 — THE MASTER BRIEF

*Paste this whole part into Claude Design first. It is written to stand completely alone as the seed for the entire visual system.*

## 1A · Suite name & blurb  `[PROPOSED — operator may rename]`

`DESIGN_SYSTEM.md` does not name the product (it calls it "the suite"); the repository working name is **agent-corp**. Proposed product name:

> ## **Helm**
> **Helm — the console for a company of machines.** A self-hosted "mini-corporation" of continuous, local AI agents that run a coordinated suite of work apps — a Board, Notes, a Library, Drive, Chat, and a Mission-Control cockpit — governed by a critical-infra core (Gateway, Vault, CMDB) on an identity-and-edge platform. One human operator sets the objectives, approves the risky actions, and can stop everything with one motion.

**Why "Helm":** the whole product is about one person steering — and, when needed, halting — an autonomous fleet. It names the operator's seat, and it carries the safety soul of the system (a hand always on the stop). Alternatives, all equally rename-able: **Overseer** (the manager-over-agents metaphor), **Cohort** (the agent workforce), **Bastion** (leans into the critical-infra/safety identity). Use whichever the operator prefers; the design system does not depend on the name.

*(Throughout this package, `<SUITE_DOMAIN>` is a placeholder for the operator's domain, e.g. `helm.example.com`. Subdomains: `mc.<SUITE_DOMAIN>`, `board.<SUITE_DOMAIN>`, etc.)*

---

## 1B · The design-system seed  *(the big one — this defines the whole visual language)*

### The product & its mood

This is an **operator/agent control suite**, not a marketing site and not a consumer document app. Picture a **calm, serious control room wrapped around a document workshop**: on most screens the operator is *supervising a fleet of autonomous agents doing real, sometimes-destructive work* ("what is the fleet doing, and can I stop it?"), and on some screens *reading and reviewing the documents those agents produce* ("what did it make, and is it any good?").

The feeling to build: **information-dense, quiet, trustworthy, instrument-like.** Tabular truth over whitespace. Hairline separation over drop-shadows and card-soup. Keyboard-first. Low marketing polish — elegance comes from precision in spacing and type, not ornament. The one place we spend boldness is **safety** (below). Everything else stays disciplined and out of the way.

**The single most important idea — safety is the signature.** The most memorable, most repeated visual element across all ten apps is the way the system shows that it has **safely stopped**, and the way it **never lies about whether it actually stopped**. The suite's identity is: *"a system that stops in a calm gold posture — not a red alarm — and always tells you the honest truth about what is still running."* If a designer remembers one thing, it is this.

### The affective spine — three colors with fixed jobs (never crossed)

This is the emotional core. Each color means exactly one thing, everywhere:

- **Signal-cyan `#29B6D8` = "interactive."** Focus rings, selection, active navigation, and the primary **safe** action. Deliberately **not green**, so "you can click this" never reads as "this is fine."
- **Halt-gold `#F2842B` = "the *system* is safely stopped and working."** The kill-switch is engaged, or a dependency is down and the system failed *closed*. Gold is calm and reassuring, deliberately **not red**. Rendering a safe-stop as an error (red) is the single worst mistake any screen here can make.
- **Danger-red `#E5594E` = "the *operator's* own finger on something destructive."** Lifting a stop, break-glass, revoking, deleting, purging, widening a permission, weakening a safety gate. Red always sits behind friction (a confirm ceremony). Red = "*you* are about to do something that bites."

Everything else is rationed and appears only on state, never as decoration: healthy-green `#46B98A`, attention-amber `#E8B84B`, draining-violet `#A98CE8`.

### Color system (real values, dark control-room base)

**Surfaces — cool near-black (the Instrument base, used for every app's shell):**
`#0A0C10` app backdrop · `#0E1116` screen bg · `#12161C` panel/card · `#171C24` raised panel / header / side-rail · `#1E242E` inset wells & table row-stripe & code blocks · `#262E39` control fill · `#323C49` borders · `#45525F` stronger borders / control outlines.

**Text (ink ramp on the dark base):**
`#EEF2F6` primary text & counts · `#C2CBD5` secondary · `#94A1AE` muted labels/metadata (this is the minimum for readable text — never go dimmer for anything that must be read) · `#66727F` disabled only.

**The reading surface (Workshop panes only — see "two archetypes" below):** a warm off-white **`#F5F3ED`** page with **`#1C1E22`** body text and **`#EAE7DE`** insets, hairlines **`#D8D4C8`**. This warm-paper column appears *only inside* a document reading/editing pane (Notes, Library), sitting like a lit sheet on the dark control desk. Never use paper for the shell, tables, or any safety component.

**The safety / state palette (this is the heart — memorize the jobs):**

| Meaning | Color | When it appears |
|---|---|---|
| **Kill-switch engaged / system safe-stopped** | **Halt-gold `#F2842B`** (band fill-accent), text inside a gold band `#FFD8A8`, wash `#2E1D0B` | A stop is engaged, OR a dependency is down and the system failed closed. Always a **whole band** across the top of the screen — never a small dot. Calm interlock **▮▮** / shield-check **⛊** icon, **never** an ✕. G2 "full quiesce" is an *intensified* gold — heavier band, **doubled** glyph **▮▮▮▮**, edge striping — escalated by weight/shape, **not** by turning red. |
| **Destructive operator action** | **Danger-red `#E5594E`** | The button/affordance for a dangerous, irreversible op — always behind a confirm ceremony. |
| **Provenance / trust tier (the Tier Badge)** | verified = green `#46B98A` ✔ · corroborated = cyan `#29B6D8` ⧉ · single-source/self-asserted = amber `#E8B84B` ◑ · **UNTRUSTED (host-originated / external) = striped amber + ⚠** | On any piece of content or fact carrying provenance. UNTRUSTED means "this text is adversarial input to the AI models" and blocks the auto-approve lane — surfaced, never buried. |
| **Fencing / lease state** | neutral `#C2CBD5` with a 🔒 (a held lock is *not* green) · amber ⚠ **SUPERSEDED** for a "zombie" (lock lost) | Shows whether an agent's claim on a resource is still real. |
| **Needs-review / escalation** | amber pill, ◈ / ⚑ glyph, with the machine reason shown | Work waiting for a human gate; always deep-links to the Mission-Control review queue. |
| **The honest-stop triad** | ✔ confirmed = green · ◐ pending = amber (+ countdown) · ⇉ draining = violet `#A98CE8` | After any stop/revoke — see the safety grammar below. |
| **Freshness / staleness** | live = subtle · **stale = amber ▲** with the safe reading spelled out | Every live figure carries an age stamp; stale never fakes a green "OK." |

**Color is never the only signal.** Every state also carries a **glyph + a text label**, so the suite is fully legible in grayscale and to a color-blind operator: engaged/safe-stopped = ▮▮/⛊, danger = ⚠, pending = ◐, draining = ⇉, confirmed = ✔, error = ✕. One reserved glyph: **⛔ is only ever an actionable STOP/deny/kill button** — never put it on a "this can't be done by construction" statement (those use a 🔒/⛊ lock and are not clickable).

### Typography

- **Inter** for everything in the UI — chrome, labels, headings, tables, control-room body. Tall x-height, reads well at 12–14px.
- **JetBrains Mono** for all machine truth — identifiers (`agent:patcher-07`, `T-000123`), tokens, epochs, TTL clocks, hashes, log lines. Unambiguous `0/O` and `1/l`; naturally tabular.
- **Source Serif 4** for long-form reading **only** inside a Workshop document pane (a note body, a library doc). A humanist serif for sustained reading; never used for chrome, tables, or any safety component.

**Tabular figures are mandatory anywhere a number ticks** (counts, ages in ms, TTL countdowns, budget headroom) so widths don't jitter. **All cross-app IDs render in mono, middle-truncated, copy-on-click, never wrapped.**

Type scale (px / line-height, tight and instrument-dense): 11/15 dense metadata · 12/16 labels & nav (uppercase eyebrows, +0.04em) · 13/20 body & dialog copy · 13/18 mono data rows · 14/20 inputs & primary controls · 16/22 panel titles · 20/26 screen titles · 26/32 big empty/engaged headlines · **22/26 the always-loud status word** (the kill-level readout — the single loudest thing on screen) · 17/28 the Workshop reading body (serif, operator-zoomable). Weights: 400 body / 500 labels & controls / 600 headings.

### Density, spacing & layout

- **4px spacing base.** Steps: 4 · 8 · 12 · 16 · 24 · 32 · 48. Controls: 32px default height, 28px compact, 40px primary/touch. On mobile (~375px) interactive rows expand hit-area to ≥44px without growing visually.
- **The nav shell (identical in every app):** a left **side rail** (224px open, collapses to a 56px glyph rail) + a **global header** (the app's name and one-line identity on the left, a `SYSTEM STATE` zone in the center, and the halt affordance / read-only kill-status mirror pinned right) + the content region. The rail carries a **suite switcher** — the list of apps the operator can reach — and shows the **current suite-wide safety posture once**, so no matter which app you're in you can see if a stop is engaged (the collapsed rail even keeps a gold ring on the halt glyph when engaged).
- **Panels are flat and machined** — separated by a one-step change in surface value + a 1px hairline, **not** by shadow. The only things that cast a shadow are a modal dialog and the lit safety band. Radii are small: 4px controls, 6px panels, full-round only for status pills.
- **Tables are the truth-surface of the whole suite.** Dense rows, subtle zebra striping, a sticky sortable header, a mono ID column with copy, right-aligned tabular numbers, and a clear focused-row state. They reflow to stacked cards on narrow screens.

### THE SAFETY VISUAL GRAMMAR — the shared components that make ten apps feel like one system

**Build ONE of each of these and reuse it everywhere.** These recurring entities must look and behave identically in every app; that identical-ness is what makes the suite feel like a single trustworthy product rather than ten separate tools.

1. **Ticket reference (`TicketRef`).** Any work item (ticket, run, release, review item). A small mono chip like `[ T-000123 ]` on a slightly-inset surface, copy-on-click, middle-truncated, never wrapped. When it names a queue item it's a **deep-link** into Mission Control's review queue. The ID is opaque — never styled to imply meaning; provenance rides *beside* it as a tier badge, never by recoloring the chip.

2. **Principal identity (`PrincipalRef`).** Any "who did this" — always the real identity resolved from the auth platform, never a bare display name. A mono chip with a **kind glyph**: **⬡ agent** (`agent:patcher-07`), **◐ operator** (a human, `operator:ada`), **⚙ service** (`svc:tier-approver`). Click → the agent's live drill-in where one exists. A revoked/disabled principal carries its own status pill (⛒ REVOKED / ◼ DISABLED).

3. **Provenance / trust-tier badge (`TierBadge`).** The one badge for every trust signal (see the color table). Shape/color = the family, text = the exact tier, glyph = how independent the label is: **✔ verified** (an external verifier confirmed it — green), **⧉ cross-referenced** (corroborated — cyan), **◑ single-source / agent-asserted** (treat with suspicion — amber), **striped-amber ⚠ UNTRUSTED** (host-originated or external — adversarial input, blocks the auto-approve lane). Rules: taint is **display-only, never editable in the UI**; heuristic labels are marked `~ heuristic` and never dressed up as verified; trust tiers never borrow the halt-gold (gold is stops only).

4. **Fencing / lease state (`FenceState`).** Whether an agent's claim on a resource is still live: `🔒 gen 47 · lease 04:12 · ♥ 0.8s` (held, fresh) → amber as the heartbeat ages → **⚠ gen 46 SUPERSEDED by gen 47** for a "zombie" (the agent thinks it holds a lock it has lost). A held lock is neutral, **not** green — green is reserved for external-verifier confirmation. Some apps show fencing **advisory-only** (greyed, tagged "advisory") because they don't enforce on it.

5. **Kill-switch / quiesce state — the HALT band (`HaltBand`).** *The signature element.* A **full-width gold band** directly under the header, sticky until the posture clears, in two forms: **(a) KILL-SWITCH ENGAGED** — "destructive & approve/execute paths are refused suite-wide; benign reads continue," with the honest triad of counts and a "Review halt →" link; **(b) SYSTEM SAFE-STOPPED** — a dependency is down and the system failed closed: "this is the safety system working, not an outage," listing what's still true and what to do. Both use calm interlock/shield icons, never ✕, never red. G2 full-quiesce is intensified gold (heavier, doubled glyph, striping) — escalated by weight and shape, not hue. **Only Mission Control and auth host an actual kill trigger;** every other app shows this band **read-only** and links out to MC/auth to act.

6. **Destructive-action affordance (`DangerAction`) + the "printed absence" rule.** Anything moving the system toward *more* real-world action or an irreversible change is red and always behind the confirm ceremony (next). Its consequence text states the **direction** ("this moves the system toward MORE real-world action") and echoes the live honest-state counts. **Crucially:** where a capability *cannot exist by construction* (e.g. "an agent can never approve its own work"; "this surface cannot relax the segregation of duties"; "the vault never shows a stored secret back"), render it as a **calm printed fact with a 🔒/⛊ lock glyph and no control at all** — **never a greyed-out toggle** (a disabled toggle implies the power exists and could be switched on). This "affirmative, explained absence" is a repeated and important pattern.

7. **Needs-review / escalation state (`ReviewChip`).** Work waiting on a human gate — a pill (◈ NEEDS REVIEW / ⚑ ESCALATED) that **always shows the machine reason** (`board_escalation`, `window_ambiguity`, break-glass, …) and **deep-links into Mission Control's review queue**. Apps *surface* it; only Mission Control / Board *clear* it.

8. **The honest-stop triad (`HonestState`).** After any stop or revoke, the true aftermath is shown as three counts, **all three always visible even at zero**: **✔ N confirmed** (acknowledged) · **◐ M pending** (may still act for up to ~2 min on an already-issued token — with a live countdown) · **⇉ K draining** (an action already past its last reversible instant, still finishing, shown with which host/ticket). **Copy discipline is absolute: never say "all stopped" while pending or draining is above zero.** This is how the system refuses to lie about a stop.

9. **The step-up confirm ceremony (`ConfirmFriction`).** The single gate for every dangerous op suite-wide (approve/reject, lift a stop, break-glass, weaken a CMDB policy gate, a Vault manage op, a Gateway catalog write, a Drive purge, widening a permission). A modal with: a **plain-language consequence block** (exact scope, irreversibility, direction, blast radius, and the live honest-state echo), a **typed-intent field** (you type the thing you're confirming), and — for high-stakes ops — a **step-up re-authentication** (a fresh identity check, not a local password box). Two intensities: engaging *safety* (a stop, a revoke — toward *less* action) gets the **light** cyan single-confirm; moving toward *more* action or anything irreversible gets the **full** red variant with typed-intent + step-up. For policy/secret edits the confirm is **bound to the exact diff you saw** and writes a **tamper-evident audit row**. The confirm dialog can never hide the halt control (see keyboard model).

### Interaction grammar

- **The stop is always reachable.** A press-and-hold actuator engages a stop deliberately-but-fast (fill a ring over a short dwell — **~600ms for G1**, **~1000ms for the heavier G2**, which must be explicitly focused first; release early = abort). No typing on stops (typing is reserved for the dangerous direction). **`Shift+Esc`** is a global escape hatch: from inside any non-stop dialog it cancels the dialog and jumps focus to the halt control — it **focuses, never fires** (staying panic-safe). *(Note: `Shift+Esc` is an approved default but not yet hardware-validated — Chromium may capture it — so a documented fallback chord is expected. Dwell times are tunable defaults, not locked.)* The halt control also renders **above every modal scrim**, so a dialog can never stand between the operator and the stop.
- **Loading / empty / error — three honest defaults.** Loading = static **skeletons** shaped like the target layout (not a spinner). Empty = an **invitation to act** ("nothing here yet — here's the one thing that fills it"), never a shrug. Errors split into two, and the split is sacred: **Pattern R (red)** = "your action didn't apply, here's how to fix it" (local, recoverable, the operator's problem); **Pattern D (gold)** = "a dependency is down, so the system safe-stopped" (systemic, the safety system *working*) — **never render a dependency outage as a red error.**
- **Real-time feel.** Live surfaces stream updates smoothly; every live figure carries its freshness stamp; if the stream stalls the tile degrades to a visible **STALE** (never a frozen-but-green value), and a stalled *safety* signal degrades to the gold safe-stop. A live view that loses its session shows an honest "session ended — re-authenticate," not a silent freeze.
- **Keyboard-first.** Full keyboard operability everywhere; visible focus rings always (a cyan ring, never removed without replacement); roving focus in tables; `/` focuses search; `Esc` closes a dialog to its safe (Cancel) default.

### The three cross-app patterns that MUST be identical everywhere

These are bigger composite surfaces that appear in multiple apps. **Design each once; apps consume them, never fork them.**

- **The Review / Approval Queue** — **Mission Control owns the one canonical version** (at `/review`, item at `/review/<ticket_id>`). It unifies both human gates (pre-execution *approval* and post-work *review*) into one queue of `TicketRef` + gate pill + who + provenance badge + age rows, with an item page showing the plan/artifact and the decision. **Others consume it:** Chat is "the doorbell" (it shows a review chip and deep-links in), Notes deep-links out to it, Board shows a Board-scoped *filter* of the same queue (Board mints the approval record so it hosts the decision), and **Library reuses the same queue *anatomy* for its own ingestion-admission gate** (a distinct gate, keyed by document not ticket, but visually the same batched-rows + badges + approve/reject component — never a bespoke design).
- **The Audit / Provenance Inspector** — one component family for every "who did what / where did this come from" surface (auth, Gateway, Vault, CMDB, Library, Drive, Board). An append-only table of timestamp · who · action · target · outcome · provenance. Where the log is cryptographically chained, it offers a **verify** action whose result obeys the honesty rule (a stale or failed verify is **never** green — it's gold "cannot confirm" or red "chain broken"). In "provenance mode" it pivots to show a document's lineage and evidence ledger. Always read-only — corrections are new rows.
- **The Live-Agent activity view** — **Mission Control owns the one canonical version** (at `/agents`). Per-agent rows with a real **liveness class** (computed, **never a bare green dot**), current step, fencing state (zombie detection), budget headroom, and an **attention band** flagging stuck/zombie/over-depth/failing agents, plus a spawn tree. Agent Runtime (the engine room) has no rich fleet UI of its own — its status is surfaced *through* this MC view.

### Two archetypes (so the control room and the workshop still feel like one suite)

Every screen is one of two archetypes, sharing **one** token system and **one** safety grammar:
- **Instrument** (control-room) — the dark surface, compact density, Inter + mono. Used by Mission Control, Board, Gateway, Vault, CMDB, Agent Runtime, and admin views.
- **Workshop** (document) — a warm-paper reading/editing pane (with Source Serif 4) **set inside** the same dark Instrument shell. Used by Notes and Library content, Drive previews, the Chat feed.

**The hard rule:** the safety grammar and the shell are **archetype-invariant** — a ticket ref, an identity, a tier badge, a kill band, a confirm ceremony look **exactly the same** in a Workshop pane and an Instrument screen. The archetype only changes the *content substrate and reading affordances*, never how a shared entity or a stop is drawn. That is precisely what makes Notes and the Gateway feel like the same company. (Instrument is dark-only; only Workshop *content panes* offer the paper/dark reading choice.)

### Harmonization note — auth's console is already built

One platform app, **auth** (the identity gateway), **already shipped a mature operator console**, and this entire design system was **derived from it** — the tokens, the halt-gold grammar, the honest-stop triad, the confirm ceremony, the `Shift+Esc` behavior, the Pattern R/D split all come from auth's shipped UI. So: **nothing in this package should contradict auth's console; it is the reference implementation of the system, not an exception to it.** Two things this system *adds* that auth simply doesn't use (no conflict): the **Workshop paper reading mode** (auth is Instrument-only) and the **suite app-switcher** in the shell (auth predates it and will gain it as a small additive change). Boundaries to respect: **auth** hosts the identity-layer stop + per-principal revocation and a *read-only mirror* of the global kill level; **Mission Control** owns the *global* kill actuation and the canonical review-queue and live-agent views. Don't move those.

---

---

# PART 2 — PER-APP INJECTION BLOCKS

*Each block below is self-contained and copy-paste-ready. Paste them into Claude Design **one at a time**, in the order given in Part 3, **after** the Part-1 system is built. Each block re-states the shared context it needs, so it works even though Part 1 will no longer be in Claude Design's context. Blocks are ordered here in the recommended paste sequence.*


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

---

### ⬢ INJECTION BLOCK — Board (Coordination / Work Tracking + Ceremony)

**Purpose (one line):** The org's coordination spine — the single place where work is tracked, atomically claimed, its host lock fenced, and the one approval record it owns is minted.

**Who uses it:** Both. The operator drives the human surface described here (kanban, approvals, ceremonies, console); agents use a sibling MCP surface over the *same* state (not designed here). Every screen below is the human view.

**Archetype:** Instrument (dark control-room), dark-only, every screen. No Workshop reading pane — plan slices and huddle transcripts live in Notes and are *deep-linked*, never re-rendered as paper. The one plan block the Board shows inside the approval surface is a read-only rendered block inside the Instrument shell, not a `--paper-*` editing surface.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell (§6.1)** — dark side-rail (224px open / 56px collapsed) + global header with center `SYSTEM STATE` zone + suite switcher + operator PrincipalRef & session-freshness stamp. Rail entries: Board · Approvals · Ceremonies · Console · Audit. Active app = `--signal-500` (#29B6D8) left bar + `--signal-tint` (#0E2A33) wash.
- **HaltBand (§4.6)** — full-width GOLD (`--halt-500` #F2842B) safe-stop band under the header, `--halt-tint` (#2E1D0B) wash, interlock ▮▮ / shield ⛊ iconography, never ✕, never red. **Read-only mirror here** — the Board is in the kill chain but hosts NO actuator; its `[ Review halt → ]` deep-links to MC/auth. G2 QUIESCE-ALL renders the intensified variant (doubled interlock ▮▮▮▮, edge striping, still gold).
- **StatePill (§4.5)** — one glyph+label pill per lifecycle state, never color-only. Maps onto the 11-state ticket set (`todo · in_progress · awaiting_approval · approved · executing · verifying · needs_review · done · failed · cancelled · blocked`). Used as kanban column headers AND card/detail status.
- **TicketRef (§4.1)** — opaque mono ID chip (`[T-000142]`), JetBrains Mono, `--ink-700` on `--sub-750` (#1E242E), copy-on-click, middle-truncate. Related-ID variants (`approval_id`, `run_id`, `host_id`, `epic ▸`) share the shape with a leading kind glyph. Deep-links to `/review/<ticket_id>` when it resolves to a queue item.
- **PrincipalRef (§4.2)** — kind-glyphed mono `sub`: ⬡ agent / ◐ operator / ⚙ service. Click → MC agent drill-in `/agents/<sub>`. Never a bare human name.
- **TierBadge (§4.3)** — provenance/taint: ✔ verified (green `--ok-500` #46B98A) / ⧉ cross-referenced (cyan) / ◑ single-source (amber `--attn-500` #E8B84B) / **⚠ striped-amber `UNTRUSTED`** for host-originated/webhook-born/curation tickets. The `lane` (`straight_to_execute · lightweight · full`) renders as a companion tier-family label, **never on the gold ramp**. UNTRUSTED = the operator's cue that a ticket is auto-approve-lane-**ineligible** — the UI renders that server-decided fact, never decides or clears it.
- **FenceState (§4.4)** — the host lock: `🔒 gen 47 · lease 04:12 · ♥ 0.8s` (healthy, neutral `--ink-700`, never green) / `▲` (stale heartbeat, near expiry, amber) / `⚠ SUPERSEDED by gen 48` (zombie/reaped lease, amber). **Board is the fencing AUTHORITY** — these render authoritative here (contrast Chat's greyed `advisory` tag). Shows `hold_kind` (`claim` vs the never-reaped `execution` hold) explicitly in the hot column.
- **ReviewChip (§4.10)** — `◈ NEEDS REVIEW → mc/review/<ticket_id>` pill + machine reason (`board_escalation`, `unmapped_wazuh_agent`), deep-linking to MC's canonical queue. The Board card never hosts a "clear review" control for a ticket gate.
- **DangerAction + ConfirmFriction (§4.7/§5.1)** — destructive/toward-more-action = danger-red (`--danger-500` #E5594E) behind typed-intent + step-up (auth live re-auth, `🔑 fresh`); toward-less-action stops = light `--signal-500` cyan single-confirm. Cancel is default focus / `Esc` target.
- **HonestState triad (§4.8)** — `confirmed · pending · draining` (✔ green / ◐ amber+countdown / ⇉ violet). **MC-authoritative; Board renders read-only via the suite-posture line, invents no aggregate.**
- **Freshness (§4.9)** — `⟳ age` stamp + source stamp on every live/mirrored figure; stale → amber `▲ STALE → fail-closed`, **never a false green**. Binds the kill-level mirror, CMDB verdict, plan-load, lease/timebox countdowns.
- **DataTable (§6.2)** — dense zebra (`--sub-750` stripe), sticky sortable header, mono ID column w/ copy, right-aligned tabular numerics. The Board's truth surface: Table view, allowlist, standing triggers, escalation/violation/audit tables.
- **ReviewQueue (§7.1, MC-owned)** — the Board's Approvals screen is a **Board-scoped FILTER** of this, same row anatomy + same `/review/<ticket_id>` deep-links, NOT a parallel design.
- **AuditInspector (§7.2)** — append-only read-only row family (timestamp · PrincipalRef · verb · TicketRef · outcome StatePill · provenance). Board's ticket-audit, violation log, audit browser are instances. **Board's log is NOT hash-chained (Standard risk) — render honest append-only truth with Freshness, never a fabricated "chain verified."**
- **LiveAgentView (§7.3, MC-owned)** — the Board never renders agent liveness; every PrincipalRef deep-links out to it.
- **Field (§6.3), Modal (§6.4), Toast (§6.5)** — standard chrome; Toast for transient action confirmation only, **never for a stop/escalation/degraded dependency, never gold**.

**⌘ Screens & views to build:**

**1. Lifecycle Kanban (`/`, rail: Board)** — the primary surface.
- **Layout:** header with `SYSTEM STATE` posture line. Below it a filter bar (`team ▾ · type ▾ · host ▾ · taint ▾ · lane ▾`) with a `[Kanban] [Table]` view toggle on the right. Then column-per-lifecycle-state, each header a **StatePill** with a tabular count. Columns (per PLAN §15): `○ todo · ◐ in_progress · ▲ awaiting_approval · ✔ approved+executing · ⧗ verifying · ◈ needs_review · ✔ done(archive)`. `approved` + `executing` **share one "hot" column** (cards keep distinct StatePills). Terminal `done`/`failed`/`cancelled` collapse into a filtered-DataTable archive expander. A full-width **`blocked` swimlane** runs under the columns.
```
┌ header · SYSTEM STATE: ● G0 normal · epoch 4471 ⟳ 0.3s ───────────────┐
│  (HaltBand renders here only when level > G0)                          │
├───────────────────────────────────────────────────────────────────────┤
│ [ / filter: team ▾ type ▾ host ▾ taint ▾ lane ▾ ]  view:[Kanban][Table]│
├────────┬────────┬──────────┬──────────┬────────┬──────────┬───────────┤
│○TODO 12│◐IN_PR 7│▲AWAIT 4  │✔APPR+EXEC│⧗VERIF 2│◈NEEDS_R 5│✔DONE(24)▸ │
│┌─────┐ │┌─────┐ │┌───────┐ │┌───────┐ │┌─────┐ │┌───────┐ │           │
││T-142│ ││T-118│ ││ T-097 │ ││ T-081 │ ││T-076│ ││ T-070 │ │           │
││◑own │ ││⬡ptc │ ││▲AWAIT │ ││⛊EXEC  │ ││⧗waz │ ││◈→mc/  │ │           │
││⚠UNTR│ ││🔒g47│ ││⚠UNTR  │ ││G48    │ ││▲1.9s│ ││rev    │ │           │
││full │ ││04:12│ ││→appr  │ ││♥hold  │ ││nas  │ ││       │ │           │
│└─────┘ │└─────┘ │└───────┘ │└───────┘ │└─────┘ │└───────┘ │           │
├────────┴────────┴──────────┴──────────┴────────┴──────────┴───────────┤
│▸ BLOCKED (3): [T-055]dep-unmet · [T-061]⚠SUPERSEDED g46 · [T-064]held  │
└───────────────────────────────────────────────────────────────────────┘
```
- **Card anatomy (all shared components, zero bespoke chips):** TicketRef (+ `epic ▸` parent variant) → type label (`--ink-600`) + priority/severity (tabular) → StatePill → PrincipalRef (`claimed_by`, absent in todo) → FenceState (host lock; shows `hold_kind=execution` in the hot column) → TierBadge (taint + lane; UNTRUSTED striped-amber where host-originated) → ReviewChip on needs_review cards → muted `→ approval queue` affordance on awaiting_approval cards. Click a card → Ticket Detail drawer.
- **States:** *Loaded* — cards live via SSE, lease/heartbeat/timebox tick with Freshness. *Loading* — column headers + skeleton card rectangles (never a spinner). *Empty* — per-column one-line invitation (`No tickets awaiting approval — plans land here when an agent proposes a destructive change`); fresh-install board invites `File the first ticket`. *Pattern R (red ✕)* — filter query error or an illegal card-menu transition rejected → inline red notice, in the interface's voice, what happened + fix. *Pattern D (gold ⛊)* — auth unreachable / SSE liveness source stale → last-known cards flagged `STALE` via Freshness + SAFE-STOPPED band ("existing state is last-known as-of <age>; claims/approvals fail closed"); never a red error for a dependency outage. *Stop-engaged* — HaltBand under header; at G2, the `todo` column carries a printed "no new claims — G2 quiesce" note.

**2. Ticket Detail drawer + Ceremony Ribbon (`/t/<ticket_id>`)** — right-hand drawer (or full page at the deep-link URL) over one ticket.
- **Layout (top→bottom):** header (TicketRef + title + StatePill) → meta row (type · lane · TierBadge · priority) → lineage line (`epic ▸`, `spawned_by`, `lineage_depth N / cap`) → **CeremonyRibbon** (only on ceremony parents; see app-specific) → Plan/Artifact section (Notes-rev-pinned deep-link + read-only rendered block, `[ open in Notes ↗ ]`) → Dependencies (`blocks` / `blocked-by` TicketRefs) → Host Lock/Fencing (FenceState + holder PrincipalRef) → Approval Record section (Board-owned; "none yet" pre-grant, or minted `approval_id` + `action_class` + approver + four-eyes state + `consumed_by`/`run_id` post-grant) → Audit Tail (ticket-scoped AuditInspector, with rejected-SoD `violation` rows as first-class entries).
- **States:** *Loaded* — full record, ribbon live via SSE. *Loading* — sectioned skeletons. *Empty* — n/a; an unknown well-formed `ticket_id` renders "ticket not found" + create hint, never a bare 404. *Pattern R* — an operator mutation (`needs_review → todo` rework, cancel) rejected by a guard/`expected_version` conflict → red inline w/ reason + current version. *Pattern D* — plan-slice needs Notes and Notes is down → plan block shows gold `⚠ CANNOT LOAD PLAN — Notes unavailable (as-of <age>); approval decisions fail closed`, not red, not a blank/green box. *Stop-engaged* — HaltBand mirror; at ≥ G1 the "Go to approval decision" affordance carries the suspended-minting note.

**3. Approval Queue + Approval Decision (`/approvals`, rail: Approvals)** — **the SoD seam, stated precisely.** Board **mints the approval RECORD**; MC owns the canonical review QUEUE. So this screen is a Board-scoped FILTER of ReviewQueue anatomy (same rows, same `/review/<ticket_id>` deep-links), and it legitimately hosts the grant/reject decision because the grant is a Board API written browser-direct under the operator's own session (MC holds no standing approve credential).
- **Queue view:** a DataTable of ReviewQueue rows — TicketRef · gate StatePill (`▲AWAIT_APPR`) · proposer PrincipalRef · TierBadge (UNTRUSTED where host-originated) · age/Freshness · `→ /review/…↗` deep-link. Filtered to Board's own minting gate only; reconciles via read-time derivation from live Board state, never treats the MC-observed resolve feed as gate-authoritative.
- **Decision surface (opening a row):**
```
┌ APPROVE PLAN — [T-000097] on host web-prod-02 ──────────────────────┐
│ derived action_class: PACKAGE_UPDATE → standard (worst)  lane: full │
│ four-eyes: proposer ⬡patcher-07 · claimed_by ⬡patcher-07 · you ◐ada │
│ ┌ plan slice (Notes rev nt-…@7, plan_hash sha256:9f… bound) ──────┐ │
│ │  (read-only rendered plan block)              [ open in Notes ↗]│ │
│ └────────────────────────────────────────────────────────────────┘ │
│ ┌ ALLOWLIST (DataTable, immutable once granted) ──────────────────┐ │
│ │seq│playbook_key    │params_hash│host_id    │CMDB class binding  │ │
│ │ 1 │nginx.upgrade   │sha256:a1… │web-prod-02│standard            │ │
│ │ 2 │service.restart │sha256:b2… │web-prod-02│standard            │ │
│ └────────────────────────────────────────────────────────────────┘ │
│ CMDB verdict: mode=ask · in-window ✔ · decision_id cmdb-… (⟳)      │
│    [ Reject plan ] (light,signal)   [ Approve & mint record ](danger)│
└─────────────────────────────────────────────────────────────────────┘
```
  - Allowlist is a DataTable instance (`seq · playbook_key · params_hash · host_id · CMDB class binding`), displayed verbatim, immutable once granted — the thing confirmed is exactly the thing that will run. `action_class` is labeled as **derived from the allowlist playbooks (worst across invocations), not from ticket type** — so a `package_update`-typed destructive plan can't look benign. CMDB verdict + `decision_id` carry Freshness; a stale/absent verdict renders the honest "no fresh verdict → operator-required" reading, never green.
- **Decision affordances:** *Approve* = DangerAction + ConfirmFriction **FULL** (danger-red, typed-intent + step-up, confirm token **diff-hash-bound to `plan_hash`**, consequence block states direction: "this mints an approval that permits Gateway execution on web-prod-02"). *Reject* = ConfirmFriction **LIGHT** (single confirm, signal-cyan, no typed intent — declining is the encouraged direction). **Four-eyes as printed constitutional absence:** when the operator's `sub` IS the proposer or claimer, Approve is NOT a greyed button — it is an affirmative printed fact with a 🔒 glyph ("You proposed this plan — four-eyes requires a different approver. This cannot be done here by construction.").
- **States:** *Loaded / Loading (table + section skeletons) / Empty* (`No plans awaiting your approval. Plans appear here when an agent proposes a destructive/irreversible change.`). *Pattern R* — grant rejected by a guard (pin moved / plan edited after pre-fetch / `expected_version` conflict / second-consume race) → red inline w/ exact reason (`plan revision changed — re-review`, `approval already consumed`). *Pattern D* — Notes down (can't fetch pinned bytes to hash) or CMDB down (no verdict) → gold `⚠ APPROVAL MINTING FAILS CLOSED — <dep> unavailable (as-of <age>)`, Approve replaced by the printed safe-stop fact, benign work continues; gold not red. *Stop-engaged* — **kill level gates approval minting:** at G1 (freeze-destructive) Approve is replaced by the destructive-absence printed fact tied to the HaltBand ("G1 FREEZE-DESTRUCTIVE — approval minting suspended suite-wide; existing approvals honored, no new grants"); any `svc:tier-approver` auto-lane shown halted; Reject stays available. G2 intensifies the band; same suspension.

**4. Management Console (`/console`, rail: Console)** — a tabbed Instrument surface of control knobs + escalation/violation/audit truth. Every mutation rides the same service layer + audit path.
- **Tab: WIP & lineage policy** — WIP caps editor (global / per-agent / per-team) + lineage cap, Field inputs w/ inline validation. These are policy-plane writes (action class `sod-critical`) → every save routes through ConfirmFriction and writes an audit row. Caps also echo on kanban column headers.
- **Tab: Standing triggers & kickoffs** — DataTable of standing triggers (kind ∈ manual/schedule/event, cron, event_filter, child template, `suppress_while_open`). All three kickoff types visible; Wazuh webhook status (HMAC health, last fire) read-only w/ Freshness. Editing a trigger is ConfirmFriction-gated (it changes what work the fleet spawns).
- **Tab: Lineage / spawn-depth** — the `TicketLineageTree` (app-specific), spawn-depth chain with `lineage_depth`-vs-cap highlighting for runaway visibility. Nodes = TicketRef + StatePill; spawning agent = PrincipalRef deep-linking to MC's LiveAgentView.
- **Tab: Escalation queue** — a DataTable where each row is a ReviewChip. Kinds: **A1 `board_escalation`** (watchdog trips — `timebox_expired`, `round_cap_exceeded`, `unresolved_veto`, `max_renewal_cap`, etc., verbatim, deep-link to MC); **A2 `breakglass_review_ticket`** births (human-only clear); **quarantined Wazuh alerts** (born `todo·quarantine=true`, unclaimable, host-originated UNTRUSTED — **operator resolve here:** `Confirm CMDB mapping → clear quarantine` is a Board-owned, ConfirmFriction-gated action); **reaper holds** (outage-gate held tickets — one fleet-level row w/ held count + `Clear hold`, showing fleet-silence fraction w/ Freshness and the `BOARD_FLEET_SIZE` denominator, flagged if stale).
- **Tab: Violation log** — AuditInspector filtered to `violation` rows (agent tried `→ done`, `STALE_FENCING`, four-eyes violation, second-consume, illegal transition). Append-only, read-only — the spike's zero-tolerance telemetry.
- **Tab: Audit browser** — AuditInspector over the full `audit_log`, append-only. **No fabricated "chain verified"** — Board's log is not hash-chained; render honest append-only truth with Freshness on the live tail. Provenance pivot available for taint lineage.
- **States:** *Loaded / loading-skeleton / empty* (empty escalation queue = "No escalations. The watchdog files here when a huddle stalls or a lease caps out."). *Pattern R* — a policy save rejected (validation, `expected_version`) → red inline on the field. *Pattern D* — Board's own store/stream degraded → gold "console reads stale (as-of <age>); showing last-known, fail-closed"; auth-down degrades the *write* affordances (can't step-up) to the printed safe-stop fact. *Stop-engaged* — HaltBand mirror; guardrail-weakening policy writes under an active kill show the suspended-state note.

**◈ App-specific components (only where justified):**
- **`LifecycleKanban`** — the column-per-lifecycle-state board + `blocked` swimlane + terminal archive, live over SSE. *Why not shared:* a kanban column/swimlane layout is a domain-unique work-tracking presentation with no shared analogue (the shared truth-surface is DataTable, offered here as the alternate "Table" view). It is a **container** — every element inside is a shared component (StatePill headers; TicketRef/PrincipalRef/FenceState/TierBadge/ReviewChip cards); it re-draws no entity.
- **`CeremonyRibbon`** — a per-planning-ticket ribbon mounted at the top of the detail drawer. Renders: the **phase stepper** (`triage ─● recon ─● planning ─● adversarial_review ─○ backlog ─ execute ─ retro`, completed phases filled, current open); the server-derived **round counter** (`round 2 / 3`); the **live timebox countdown** (`⏱ 07:41 remaining`) with pause state, carrying Freshness; the **DACI governance panel** (PO decision-of-record pending/filed; AR **veto** raised/cleared; AR grounded-dissent count with a cited-recon-note deep-link); and the **roster** (PrincipalRef per role: PO/SM/SEC/AR). *Why not shared:* it renders the ceremony state machine — a domain-unique process-governance visualization (phase-stepper + live timebox clock + veto/dissent panel) that exists nowhere else and maps to no §4 entity. It **composes** shared components (roster = PrincipalRef; phase/veto states use StatePill glyph-grammar; countdown = Freshness) and invents no new chip. **Read-only display of server authority** — the watchdog is server-side; the ribbon exposes no operator control over the timebox except the deep-link to the escalation queue when A1 fires. Critically: **a veto is NOT recolored onto the halt-gold ramp** — gold is reserved for stops; a veto uses the StatePill attention grammar (`▲ RAISED`, amber).
```
│ triage ─● recon ─● planning ─● adversarial_review ─○ backlog ─ execute ─ retro │
│ round 2/3 · timebox ⏱ 07:41 remaining [⏸ paused: no] · AR veto: ▲ RAISED       │
│ roster: PO ⬡po-01 · SM ⬡sm-01 · SEC ⬡sec-03 · AR ⬡ar-01                        │
│ AR grounded dissent: ✔ 1 cited (recon note ▸) · PO decision-of-record: ○ pending│
```
- **`TicketLineageTree`** — a tree of `parent_id → child` ticket lineage with `lineage_depth`-vs-cap highlighting. *Why not shared:* a *ticket* lineage DAG is Board-owned data with no shared component, and it is explicitly **distinct from MC's LiveAgentView agent spawn tree** (which is about agent liveness) — it deep-links the spawning PrincipalRef out to that canonical MC view rather than duplicating it. Nodes = TicketRef + StatePill. (Deliberately thin — flagged as foldable into a DataTable tree if Stage-4 prefers; not load-bearing.)

**⚠ Safety / danger surfaces specific to this app:**
- **The approval-decision ceremony is the Board's signature danger surface.** Approve mints the record the entire SoD chain binds to → FULL ConfirmFriction: danger-red primary, typed-intent, live auth step-up (`🔑 fresh`), and the confirm token **diff-hash-bound to `plan_hash`** so the operator confirms the exact plan bytes they saw. The immutable allowlist DataTable and the "action_class derived from playbooks, not ticket type" labeling are load-bearing anti-spoofing — build them so a destructive plan cannot masquerade as benign.
- **Four-eyes is a printed constitutional absence, not a disabled button.** When the operator is the proposer/claimer, render an affirmative 🔒 fact ("cannot be done here by construction"), never a greyed Approve toggle (a disabled control implies a latent capability).
- **Kill-level gates approval minting, visibly.** At G1 the Approve control is *replaced* by the destructive-absence fact tied to the read-only HaltBand; the Board hosts no kill actuator (deep-links to MC/auth only). Reject (toward-less-action) always survives a stop.
- **FenceState authority:** the Board is the fencing generation authority, so host-lock chips render authoritative here (not `advisory`-greyed like Chat). The `⚠ SUPERSEDED` zombie (reaped lease / lost lock) is a first-class state on kanban cards, the blocked swimlane, and the detail drawer — the operator's cue that a claim is no longer real.
- **UNTRUSTED provenance is rendered, never decided or cleared.** Host-originated / webhook-born / curation tickets carry the striped-amber ⚠ badge = auto-approve-lane-ineligible; no control anywhere lets an operator clear taint (raise-only, server-owned).
- **Pattern R ≠ Pattern D everywhere.** A Notes/CMDB/auth outage on any approval or plan-load path is halt-gold safe-stop ("fails closed"), never a red error. The false-green prohibition binds the kill-level mirror, the CMDB verdict, the plan-load block, and the audit tail (no fabricated "chain verified" on the non-chained Board log).

**⚑ Gaps flagged:**
- **`svc:tier-approver` auto-lane inactive by default** (`BOARD_TIER_APPROVER_ENABLED` off until auth's `HOLDER_ALLOWED_KINDS[board:approve]` admits `kind=service`): the approval-decision surface should render the "auto-lane inactive — human gate universal" state honestly rather than implying a tier path exists. Design should show the operator-granted-only reality, not a phantom auto lane.
- **Spec amendments A-VR / A-RR unratified:** the drawer's voluntary-release visibility and any restore-reproposal banner assume these; until ratified, show the interim rule (operator cancel + re-file). [GAP — operator to ratify A-VR/A-RR before those two affordances are finalized.]
- **`TicketLineageTree` is deliberately thin** — flagged as foldable into a DataTable tree if Stage-4 prefers; not load-bearing.
- Otherwise the spec is complete for design; no color, layout, or component outside the frozen token set was required (the approval plan block is deliberately a read-only Instrument block, **not** a `--paper-*` Workshop reading pane — do not "upgrade" it to paper).

---

### ⬢ INJECTION BLOCK — Notes (agent working memory + work product)

**Purpose (one line):** The org's Confluence-style external memory and work product — where agents write recon findings, where the planning huddle is recorded, and where retros write lessons; markdown is the literal source of truth, the index is rebuildable.

**Who uses it:** BOTH. The operator gets the full human UI (read/write/browse/inspect); agents get a sibling MCP surface (read/write/search/link) over the *same* markdown corpus + FTS index. Everything below is the human surface. Notes holds **no** ticket-lifecycle, approval, or kill authority — it renders the truth read-only and deep-links out to the authoritative owner (Board / Mission Control).

**Archetype:** BOTH — a **Workshop** reading/writing content pane inside a dark **Instrument** shell. This is the *one* place in the whole suite the "document as warm paper" surface appears: the content column where a note is read or written renders on `--paper-100 #F5F3ED` (warm off-white, not pure white) with **Source Serif 4** body at `--fs-read` (17/28, operator-zoomable 15–20px), plus a dark-reading alternate (`--sub-850 #12161C` body). The surrounding shell, side rail, header, tables, and **every safety chip stay Instrument-dark** in both reading modes. Never offer a "light Instrument."

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark side rail (224px open / 56px collapsed) + global header (app name + "external memory & work product" tagline, logged-in `PrincipalRef` + session-freshness `🔑 fresh/stale`, suite switcher carrying once-shown suite posture). Side-rail nav: **Corpus · Graph · Review · History**. Read-only halt mirror lives here.
- **HaltBand** — full-width GOLD (`--halt-500 #F2842B`) band directly under the header, **read-only in Notes** (Notes is not in the kill chain, hosts no actuator). Two members, both gold never red, calm interlock `▮▮` / shield `⛊` iconography: (a) KILL-SWITCH ENGAGED and (b) SYSTEM SAFE-STOPPED (Pattern-D dependency down). `Shift+Esc` focuses the header halt mirror and deep-links to MC/auth.
- **TicketRef** — opaque mono ID chip (`[ T-000450 ]`, JetBrains Mono, `--ink-700` on `--sub-750`), copy-on-click, deep-links to `mc/review/<ticket_id>`.
- **PrincipalRef** — kind-glyphed mono `sub`: `⬡` agent / `◐` operator / `⚙` service. Click → `mc/agents/<sub>`.
- **TierBadge** — the taint/provenance badge: `✔ verified` green (`--ok-500 #46B98A`), `⧉ cross-referenced` signal-cyan, `◑ single-source` amber (`--attn-500 #E8B84B`, "treat with suspicion"), and **striped-amber `⚠ UNTRUSTED`** for host-originated / externally-originated content (adversarial input to the models). Taint is display-of-truth, **never editable**.
- **FenceState** — `🔒 gen 47 · lease 04:12 · ♥ 0.8s` healthy (neutral `--ink-700`, never green); `⚠ SUPERSEDED by gen 47` zombie state (amber). Display-only echo here.
- **StatePill** — one glyph+label pill per lifecycle state, never color-only.
- **DangerAction + destructive-absence rule** — where a capability cannot exist by construction, print it as an affirmative fact with a lock/shield glyph `🔒/⛊` and **no greyed control** (never the `⛔` glyph, which is reserved for actionable stops).
- **Freshness** — `⟳` age + source stamp on every live figure; stale → amber `▲ STALE`, never a fabricated green. False-green prohibition: an unverifiable read renders `⚠ CANNOT CONFIRM` in halt-gold, never a green "OK."
- **ReviewChip** — `◈ NEEDS REVIEW → mc/review/<id>` / `⚑ ESCALATED · board_escalation → mc/review/…`, always shows the machine reason; deep-links out, never hosts a clear control.
- **DataTable** — dense zebra rows (`--sub-750` stripe), sticky sortable header, mono ID column with copy, reflows to cards < 640px.
- **AuditInspector** (§7.2 cross-app pattern) — append-only audit rows + provenance-lineage pivot; chain-verify never renders green when stale/failed.
- **ReviewQueue** (§7.1, MC-owned) — **consumed by deep-link + read-time derivation, never forked**; Notes hosts no clear-review control.
- **LiveStream** — SSE client contract (`GET /api/events`, `Last-Event-ID` replay); terminates at token `exp` and on `auth:revocations` → honest "Session ended — re-authenticate" state, never a silent freeze.
- **Toast** — transient action confirmation matching the verb ("Saved"); never used for safety state; never gold.

**⬡ Screens & views to build:**

**S1 — Corpus Browser & Search** *(Instrument)* — the home surface: the searchable, filterable list of the whole corpus. `/` focuses the search field.
```
┌─ header: notes · "external memory & work product"   ◐ operator:ada · 🔑 fresh ─┐
│  [ read-only HaltBand renders here iff suite posture > G0 / Pattern-D ]        │
├──────────┬─────────────────────────────────────────────────────────────────────┤
│ Corpus ◀ │  ⌕ [ search corpus…  / ]   type:[all▾] tag:[▾] ticket:[▾]  ⟳ 0.4s   │
│ Graph    │ ─────────────────────────────────────────────────────────────────── │
│ Review   │  DataTable — one row per note (mono id col, copy)                    │
│ History  │  ● TITLE                    type          taint        ticket   updated│
│          │  Canary batch findings      research      ◑ single    [T-000123] 2m   │
│          │  Fleet patch plan slice 3   plan          ⚠ UNTRUSTED [T-000450] 14m  │
│          │  NAS reboot huddle          deliberation  ✔ clean     [T-000450] 1h   │
│          │    ↳ snippet: "…canary must share the package set…"  ◑ single-source  │
└──────────┴─────────────────────────────────────────────────────────────────────┘
```
Rows are `DataTable`; `ticket` cell = `TicketRef`, `taint` cell = `TierBadge` rendering the note's **effective** taint (own ∨ transitive over links; `own` shown on hover). Search snippets (≤64 tokens) carry their own inline `TierBadge` — taint travels with retrieved content. Filters map to `type`/`tag`/`ticket_id`; **no status/ceremony-phase filter exists** (that state lives on the Board). — **States:** Loaded (rows) / Loading (skeleton rows, never a spinner) / Empty-no-corpus (*"No notes yet. Agents write findings here as external memory; you can start one too."* + `[ New note ]` cyan primary) / Empty-no-results (*"No notes match `<query>`. Clear filters or widen the search."*) / **Pattern-R** red ✕ under the search field for a malformed FTS expression (*"That search couldn't run — remove unsupported operators."*, list stays intact) / **Pattern-D** the index/watcher is down → gold SAFE-STOPPED band (*"canonical markdown is intact on disk and in git; search is a rebuildable index that is regenerating; reads by id still work"* — **not** red) / Stop-engaged (read-only HaltBand; browser stays fully readable).

**S2 — Note Editor** *(Workshop content pane in the Instrument shell — the paper surface)* — left: the `NoteEditor` Milkdown paper pane; right: a **metadata rail composed of shared components only**.
```
┌─ header (Instrument) ───────────────────────────────────────────────────────┐
│  ‹ Corpus   Canary batch findings     [ Save ]  ⟳ live 0.3s   view:[paper▾]  │
├─────────────────────────────────────────────┬───────────────────────────────┤
│  ░░ WORKSHOP paper column ░░ (--paper-100,   │  METADATA RAIL (Instrument)   │
│     Source Serif 4, --fs-read, 62–72ch)      │  id     N-01J1QZ… (mono, copy)│
│                                              │  type   research              │
│  ## Objective                                │  ticket [T-000123] ← TicketRef│
│  Establish a safe canary order for the …     │  taint  ◑ single (own) →      │
│  ## What I did                               │         ⚠ UNTRUSTED (effective)│
│  Pulled posture from Wazuh; clustered …      │         via: [[Wazuh dump]] ⚠  │
│    [[canary package overlap]] ← wikilink     │  fence  🔒 gen47·lease04:12·♥0.8│
│  ## Findings ▏(caret)                        │  authors ⬡ recon-03 ◐ ada     │
│  ## Open questions                           │  ticket-status needs_review · │
│  ## Next step                                │     mirror · authority: Board │
│                                              │  ─────────────────────────────│
│                                              │  🔒 Taint is display-of-truth.│
│                                              │     It cannot be edited here. │
└─────────────────────────────────────────────┴───────────────────────────────┘
```
The paper column is the one place the document reads as paper — body prose Source Serif 4; `view:[paper▾]` toggles the dark-reading alternate. Rail = `TicketRef` + `TierBadge` (showing **both** `own` and `effective` with the `tainted_via[]` list, each `via` a wikilink chip carrying its own badge) + `FenceState` (display echo, incl. `⚠ SUPERSEDED`) + `PrincipalRef` author list. **`ticket-status`/`ceremony_phase` render as muted non-authoritative mirrors** stamped `mirror · authority: Board` beside the `TicketRef` — **never** an authoritative `StatePill`. The taint control's absence is a printed constitutional fact (`🔒`, no greyed toggle). New note of a `type` opens with fixed section headers pre-filled. — **States:** Loaded / Loading (paper-column heading+paragraph skeleton + rail skeleton) / Empty-new-note (template scaffold, faint per-section prompts, title focused) / **Pattern-R stale buffer** (`PRECONDITION_HASH`, red ✕ banner above pane: *"This note changed since you opened it…"* + `[ Show diff ]` `[ Reload ]`) / **Pattern-R hygiene reject** (*"This looks like secret material … Reference secrets by handle instead."* — matched content **never echoed back**) / **Pattern-R taint-downgrade blocked** (*"Provenance is raise-only and cannot be reduced here."*) / **Pattern-D Board unreachable on a fenced write** (`FENCE_UNVERIFIABLE` → the **Save control** for a ticket-bound note renders **gold SAFE-STOPPED**, not red: *"Can't confirm this claim's lease — the Board is unreachable, so ticket-bound writes fail closed. Non-ticket notes still save."*) / Session-ended (live feed terminates, honest *"Session ended — re-authenticate to resume"*, unsaved buffer preserved locally) / Stop-engaged (read-only HaltBand; editing continues — writing external memory is benign).

**S3 — Deliberation Thread View** *(Workshop content pane, specialized render)* — Notes renders the record the Board's ceremony produces; it is the *record*, never the state machine.
```
┌─ header ─────────────────────────────────────────────────────────────────────┐
│  ‹ Corpus  NAS reboot huddle · deliberation  [T-000450]  phase:planning·mirror│
│                                              authority: Board → [T-000450]     │
├───────────────────────────────────────────────────────────────────────────────┤
│  ░░ paper column ░░  participants: ⬡ recon-03 · ⬡ sre-01 · ⬡ redteam-02       │
│  ▸ triage            (Scrum-Master turn · collapsed)                           │
│  ▸ recon             grounded in → [[fleet posture]]◑ [[Wazuh dump]]⚠UNTRUSTED │
│  ▾ planning                                                                    │
│     ┌ Independent positions ─ drafted before cross-reading (anti-anchoring) ─┐ │
│     │ ### SRE — @sre-01 · 14:03Z   ⬡ sub=agent:sre-01                        │ │
│     │ ### Security — @sec-04 · …    ⬡ sub=agent:sec-04                        │ │
│     └──────────────────────────────────────────────────────────────────────┘ │
│  ▾ adversarial_review  ⚑ REQUIRED — ≥1 premise-attack cited to a recon note   │
│     ### Adversarial — @redteam-02 · … ⬡ sub=agent:redteam-02                  │
│  ▸ backlog  → child tickets [T-000451] [T-000452]                             │
│  ▸ execute  ▸ retro                                                            │
└───────────────────────────────────────────────────────────────────────────────┘
```
**Seven fixed phase sections** (`triage → recon → planning → adversarial_review → backlog → execute → retro`), collapsible, current mirrored phase auto-expands (decorative highlight, `authority: Board`). Every turn header renders the human line **and** a `PrincipalRef` resolved from the machine attribution marker (`⬡ sub=…`) — never a bare display name; turns are append-only, non-editable. Ground truth is **linked, not inlined** — each `[[wikilink]]` renders with the linked note's `TierBadge`, so an operator sees the huddle rests on `⚠ UNTRUSTED` input. `adversarial_review` carries a `⚑ REQUIRED` marker; if no premise-attack is cited, an honest *"no dissent recorded — huddle may be invalid"* note. **No "converge"/"escalate" button** — a printed *"phase transitions happen on the Board"* fact; already-filed escalations surface as a `ReviewChip` deep-linking out. Isolated turns show a small `isolated` micro-tag but are always shown in full (the file never lies to the operator). — **States:** Loaded / Loading (section skeletons) / Empty (seven empty phase headers, *"The huddle for `<ticket>` will be recorded here"*) / Pattern-R (same CAS/hygiene errors as S2) / Pattern-D (Board unreachable → ticket-bound turn writes fail-closed gold; mirrored phase line shows `phase unavailable — Board unreachable`, never a fabricated phase) / Stop-engaged (read-only HaltBand).

**S4 — Link Graph & Backlinks** *(Instrument; graph canvas + list)* — the associative-memory browser: wikilink/backlink structure as a `LinkGraph` canvas synchronized with a `DataTable` list.
```
┌─ header: Graph · focus: N-01J1QZ… "Canary batch findings"  depth:[1▾] [open in editor]┐
├──────────────────────────────────┬────────────────────────────────────────────────┤
│   LinkGraph canvas                │  Backlinks (DataTable)                         │
│        (fleet posture) ◑          │  ← FROM                   type      taint       │
│              │                    │  NAS reboot huddle        deliberation ⚠UNTRUSTED│
│      [Canary batch findings] ●    │  Fleet patch plan slice3  plan        ◑ single  │
│         │            │            │  ─────────────────────────────────────────────│
│  (canary overlap)◑ (Wazuh dump)⚠  │  Outbound → (canary overlap)◑ · (Wazuh dump)⚠  │
└──────────────────────────────────┴────────────────────────────────────────────────┘
```
Nodes carry taint via `TierBadge` glyphs (the graph is a second place effective-taint propagation is visible — an `⚠ UNTRUSTED` neighbor is *why* a focus node's effective taint is raised). Node = note; directed edge = wikilink; unresolved links = ghost nodes; `isolated` links render dimmed with an `isolated` tag. List half is `DataTable` (each row → S2). — **States:** Loaded / Loading (canvas + list skeleton) / Empty (*"This note has no links yet. Use `[[wikilinks]]` in the body to build associative memory"*) / Pattern-R (focus id not found, red ✕ *"No note with that id"*) / Pattern-D (link index rebuilding → gold SAFE-STOPPED: *"link graph is a rebuildable index, regenerating; markdown links in the body are intact"*) / Stop-engaged (read-only HaltBand).

**S5 — Review-Attention View** *(Instrument; consumes the canonical MC queue, never forks it)* — "which of my artifacts are awaiting a human gate." **Notes never hosts a clear-review control.**
```
┌─ header: Review · notes attached to tickets in a human gate   source: mc · as-of 3s ⟳┐
├───────────────────────────────────────────────────────────────────────────────────┤
│  DataTable                                                                          │
│  NOTE                     ticket       gate / state                        author   │
│  Fleet patch plan slice3  [T-000450]   ◈ NEEDS REVIEW → mc/review/T-000450  ⬡ sre-01│
│  Canary batch findings    [T-000123]   ⚑ ESCALATED · board_escalation → mc/review/… │
│  NAS reboot huddle        [T-000451]   ◐ AWAITING_APPROVAL → mc/review/T-000451     │
└───────────────────────────────────────────────────────────────────────────────────┘
```
Each gate cell is a `ReviewChip` (`StatePill` + verbatim machine reason + deep-link to `mc/review/<ticket_id>`). Clicking leaves Notes for MC's canonical item page — **no clear/approve/reject affordance in Notes.** Gate state is **read live, not stored** (browser-direct from MC's queue, advisory / MC-observed / never authoritative); the `Freshness` stamp (`source: mc · as-of 3s`) is mandatory and degrades to `▲ STALE`, never a false "all clear." A footer prints *"Reviews are cleared on the Board / Mission Control, never here"* with `🔒`. — **States:** Loaded / Loading (skeleton rows) / Empty (*"No notes are awaiting a human gate right now."* — a positive statement) / **Pattern-R** (operator session lacks `mc:read` → red ✕ *"Can't read the review queue — your session isn't scoped for Mission Control"* + deep-link) / **Pattern-D** (MC unreachable → gold SAFE-STOPPED: *"Can't reach Mission Control; showing last-known gate state as-of `<age>` — treat as unverified"*, never a fabricated "cleared") / Stop-engaged (read-only HaltBand).

**S6 — Provenance & History Inspector** *(Instrument; `AuditInspector` §7.2, both modes)* — read-only truth of where a note came from and who touched it.
```
┌─ header: History · Canary batch findings  N-01J1QZ…  [audit ▾ | provenance]  git ✔0.6s┐
├───────────────────────────────────────────────────────────────────────────────────┤
│  AuditInspector — append-only rows (DataTable)                                      │
│  ts (mono)          who                 action        target        outcome         │
│  2026-07-02T14:03Z  ⬡ agent:recon-03   append_note   §Findings      ✔               │
│  2026-07-02T14:00Z  ◐ operator:ada      update_note   whole note     ✔               │
│  ── chain: git trailers · commit_sha per row · [ verify against git log ]  ✔ verified│
└───────────────────────────────────────────────────────────────────────────────────┘
```
**Audit mode** = git-trailer projection: each row `ts` (mono/tabular) · `PrincipalRef` (the `Sub:` trailer — authoritative per-edit "who") · action verb · target · outcome `StatePill`. Chain-verify follows the §4.9 rule: a stale/failed `git log` reconcile **never renders green** — shows `⚠ CANNOT CONFIRM` in halt-gold, or `✕ CHAIN BROKEN` in danger-red (`--danger-500 #E5594E`) for a detected divergence. A footer states plainly that denied/rejected calls are not here (state-changes-only). **Provenance mode** = the lineage pivot: `own` vs `effective` `TierBadge`, the `tainted_via[]` chain, and the ticket-lineage structural floor — **read-only always, no correction control.** — **States:** Loaded / Loading (row skeletons) / Empty (single genesis commit: *"One entry — this note was created and not yet edited"*) / Pattern-R (note id not found) / **Pattern-D git-remote/push-lag or index rebuild** (gold SAFE-STOPPED: *"Can't verify the audit chain right now — treat as UNVERIFIED"*; surfaces boot-time git-remote degraded mode and `git_push_lag_seconds` as an honest health fact, never green while lag exceeds bound) / Stop-engaged (read-only HaltBand).

**◈ App-specific components (only where justified):**
- **`NoteEditor`** (Milkdown `@milkdown/crepe`) — the WYSIWYG-markdown Workshop content pane (S2/S3) that stores markdown **verbatim**; the canonical-store editing tool. Renders on `--paper-100` + Source Serif 4 at `--fs-read`, reading measure 62–72ch, with the dark-reading alternate. *Not shared:* a WYSIWYG-markdown authoring surface is domain-unique; the suite has exactly one canonical markdown corpus and this is its writing tool. Its chrome (Save, view toggle) and every metadata chip reuse shared components.
- **`LinkGraph`** — the wikilink/backlink graph canvas (S4): notes as nodes, wikilinks as directed edges, `TierBadge` taint on nodes, ghost-node styling for unresolved links, dimmed `isolated` edges. *Not shared:* no shared component renders a node-edge graph; only the canvas is new — its node badges are `TierBadge`, its list half is `DataTable`.
- **`DeliberationThreadView`** — the seven-phase ceremony render (S3): fixed phase sections, per-turn attribution markers, Independent-positions / Joint / Adversarial-review structure, linked (never inlined) ground truth. *Not shared:* the huddle record's phase-sectioned, append-only, turn-attributed document structure is Notes-specific — it *contains* `PrincipalRef`/`TierBadge`/`TicketRef`/`ReviewChip` but its sectioned-thread layout has no shared equivalent.

> The **metadata rail** (S2) is deliberately **not** an app-specific component — it is a layout composition of `TicketRef` + `TierBadge` + `FenceState` + `PrincipalRef` + `StatePill` only. A bespoke "note-meta chip" would be the exact consistency failure the system forbids.

**⚠ Safety / danger surfaces specific to this app:**
- **Taint is display-only, never editable in the UI.** No screen offers a taint control. The absence is a **printed constitutional fact** with a `🔒` and no greyed toggle (destructive-absence rule) — *"Taint is display-of-truth; it cannot be edited here."* Provenance is raise-only; a Pattern-R error blocks any edit that would lower it. (A rare operator-only mistag-correction endpoint is kept **entirely off** the note surfaces by design — see Gap.)
- **The clear-review control is absent by construction.** S5 renders gate state and deep-links to MC to clear it; a footer prints *"Reviews are cleared on the Board / Mission Control, never here"* with `🔒`. There is no approve/reject/clear affordance anywhere in Notes.
- **Fail-closed on ticket-bound writes = gold, not red.** When the Board is unreachable, ticket-bound Save/append renders the **gold SAFE-STOPPED** treatment on the affordance (Pattern-D), never a red error — fail-closed is the safety system working. Non-ticket notes still save.
- **False-green prohibition on the audit chain and every mirror.** The S6 chain-verify, the S5 gate feed, and the S1/S4 index all render honest-unknown in halt-gold when unverifiable — never a fabricated healthy/green/"cleared" state. Decorative `ticket_status`/`ceremony_phase` mirrors are stamped `mirror · authority: Board`, never an authoritative pill.
- **HaltBand is read-only here.** Notes is not in the kill chain and hosts no actuator; it shows the band and, at most, deep-links to MC/auth. `Shift+Esc` focuses the header halt mirror.
- **Secret-material hygiene reject** — on Save, credential/private-key-shaped content is refused; the banner names the pattern class only and **never echoes the matched content back**.

**⚑ Gaps flagged:**
- **[GAP — operator/Claude Design to decide]** The rare operator-only taint-**downgrade** (mistag correction) endpoint: the spec quarantines it entirely off the note reading surfaces and defaults it to API-only. Whether to surface it in a separate admin console (as a full `DangerAction` + typed-intent + step-up + tamper-evident audit) or keep it API-only is an unresolved operator call — do **not** place any taint-edit control on S2/S3/S4/S6.
- **[GAP — Board/MC seam to confirm]** S5's live gate decoration requires the operator's browser session to carry `mc:read` for the cross-app MC queue read. Until confirmed, S5 correctly renders the Pattern-R "not scoped for MC" state and deep-links out — degraded, never wrong; no design change needed, but the scope grant is unconfirmed.
- All colors, type, spacing, and safety cues used here are drawn from the frozen token set; no out-of-token color is introduced.

---

### ⬢ INJECTION BLOCK — Reference Library (`library`)

**Purpose (one line):** The corporate reference shelf — a curated RAG corpus of externally-authored documentation (vendor docs, man pages, distro guides) that agents query for fast, *cited, tier-tagged, version-correct* confirmation instead of trusting model priors; the human surface lets the operator search it, inspect provenance, and run the ingestion admission gate.

**Who uses it:** Both. The MCP agent surface (search, propose ingestion, attach evidence) and this human UI are siblings over one shared state. Every screen described here is **operator-facing**; three of the six admin screens (Ingestion Review, Spot-Audit, Collections, Index Status) are gated to `library:admin` and are **human-principal-kind only** — an agent principal can never reach them.

**Archetype:** **Both** — a Workshop reading pane living inside an Instrument shell. Dense retrieval/ledger/queue tables are Instrument-dark; the *document body only* renders as lit paper (`--paper-100 #F5F3ED`, Source Serif 4, `--fs-read` 17/28). The shell, nav, every table, and every safety component stay Instrument-dark in both reading themes.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **`TierBadge` (§4.3)** — this app exercises it *hardest*. Shape = severity family, text = exact tier, glyph = independence: **Verified** `--ok #46B98A` outline + ✔ (`sandbox-verified`, `gateway_delivered` evidence); **Corroborated** `--signal #29B6D8` outline + ⧉ (`cross-referenced`); **Single/asserted** `--attn #E8B84B` outline + ◑ "treat with suspicion" (`single-source`, `agent-authored`/`agent_asserted`); **Untrusted input** = `--attn` **striped** outline + ⚠ + the word `UNTRUSTED` on hover (`curation-ingested` taint — rides on *every* ingested result; the operator's cue that the content is adversarial input and its consuming plan is auto-lane-ineligible). Hard rule: **heuristic labels render as heuristic** — origin-cluster / distinctness counts carry a `~heuristic` micro-tag and are never drawn as a verified tier. Tier is a **badge, never a sort key**.
- **`TicketRef` (§4.1)** — opaque mono chip, copy-on-click, middle-truncates. Used for `doc_id` (the durable citation) and `ticket_id` (deep-links to MC `/review/<ticket_id>`), plus `run_id` / `harness_version` as `TicketRef`-family mono chips. `chunk_id` is never surfaced as a citation.
- **`PrincipalRef` (§4.2)** — kind-glyphed mono `sub`: ⬡ agent / ◐ operator / ⚙ service. Renders `proposed_by` / `admitted_by` / `attached_by`. Click → MC `/agents/<sub>`.
- **`StatePill` (§4.5)** — one glyph+label pill per lifecycle state, never color-only: `● current`, `⇉ superseded`, `◼ retired`, `● ADMITTED`. Also carries the switching-state chip (`NORMAL` / `▲ TIGHTENED`).
- **`HaltBand` (§4.6)** — full-width gold `--halt-500 #F2842B` band under the header, **read-only in this app** (Library is not in the kill chain and hosts no actuator). Interlock ▮▮ (engaged) / shield ⛊ (safe-stopped). Informational + deep-links to MC/auth. Library keeps serving benign reads under a kill by design.
- **`DangerAction` (§4.7) + `ConfirmFriction` (§5.1)** — every admit / reject / retire / supersede / reindex. All are "toward MORE content/action" → the **full** friction variant: danger-red `#E5594E` primary behind typed-intent + step-up re-auth; consequence block states direction and blast radius. Also enforces the **destructive-absence rule**: "cannot admit by construction" is printed as an affirmative fact with a 🔒 lock glyph and **no affordance** — never a greyed-out "admit anyway" toggle, never the ⛔ glyph.
- **`Freshness` (§4.9)** — `⟳` age + source stamp on index age, push lag, feed staleness. **Never a false green:** a stale/failed read renders the honest unknown in halt-gold (`⚠ CANNOT CONFIRM…`), never a fabricated "OK."
- **`ReviewChip` (§4.10)** — needs-review/escalation pill on a proposal's `ticket_id`; **deep-links OUT** to MC/Board (Library never clears a ticket gate).
- **`AppShell` (§6.1)** — dark side-rail + header (app name + one-line identity + `SYSTEM STATE` zone + operator identity) + suite switcher + read-only halt mirror.
- **`DataTable` (§6.2)** — dense zebra `--sub-750`, sticky sortable header, mono ID column with copy, bulk-select where noted. The truth-surface of every list here.
- **`Field` (§6.3)** — search bar, scope inputs, decision notes, collection forms; inline validation.
- **`Modal` (§6.4)** / **`Toast` (§6.5)** — confirms (halt cut above scrim); toasts match the action verb, **never gold**, never for degraded state.
- **`LiveStream` (§5.5)** — SSE on the review queue, spot-audit, and index-status feeds; `event: reset` → REST re-read; every streamed figure carries `Freshness`.
- **Cross-app patterns:** **`AuditInspector` (§7.2) provenance mode** (the Doc Inspector — consumed, not forked) and **`ReviewQueue` (§7.1) anatomy** (reused for the Library-OWNED admission gate — same component, *different queue and different authority*). **`LiveAgentView` (§7.3) is NOT consumed** — Library renders no fleet; `proposed_by` just deep-links to MC.
- **NOT used: `FenceState` (§4.4)** — Library holds no lease/mutex/fence authority; it never draws a fencing chip. No kill actuator, no approval-record minting.

**⌗ Screens & views to build:**

**1. Corpus Browser / Hybrid Search** — Instrument list + Workshop reading pane. The default screen and human twin of `library_search`.
```
┌ AppShell: ⬢ LIBRARY · the corporate reference shelf   SYSTEM STATE ⟳ G0 fresh 0.4s   ◐ ada ┐
├─[ read-only HaltBand mirror when kill level > G0 ]────────────────────────────────────────┤
│ ScopeResolver:  ⌕ [ how to extend an lvm volume____ ]  / to focus                          │
│   scope ◉ host_id [host_9f2…]  ○ target: os[linux▾] distro[ubuntu▾] ver[24.04▾] arch[…▾]   │
│   version_scope: ✔ exact (CMDB fresh 1.2s)   k [8]   include_unverified ☐                   │
├──────────────── results (DataTable) ───────────────────────────┬─ READING PANE (Workshop) ┤
│ TIER            DOC › heading anchor          VER    COVER TAINT│  --paper-100, Serif 4,   │
│ ✔ sandbox-ver.  lib-01J… › lvextend › Growing exact  ▣cov ⚠ing │  --fs-read               │
│ ⧉ cross-ref.    lib-01H… › LVM2 › Resize      exact  ▢unc ⚠ing │  <title, version scope>  │
│ ◑ single-source lib-01G… › blog › "just run…" ~appr  ▢unc ⚠ing │  rendered body,          │
│ ◑ agent-authored lib-01F… › note-derived      exact  ▢unc ⚠ing │  covered spans shaded    │
│  … RRF-fused; tier is a badge, NOT a sort key …                │  --paper-200             │
│ retrieval_mode: hybrid       source: index @corpus a9c… 0.3s   │                          │
└────────────────────────────────────────────────────────────────┴──────────────────────────┘
```
Left column carries the **full trust envelope inline on every hit**: TIER (`TierBadge`), VER (`version_scope` chip: exact / ~approximate / unverified), COVER (per-chunk `evidence_covered`: ▣ covered / ▢ uncovered — anti-tier-riding), TAINT (`curation-ingested` UNTRUSTED striped-amber on *every* row). Primary action: type a query; select a row to load the reading pane.
- **Loaded:** as above.
- **Loading:** static skeleton rows in the table; paper skeleton in the reading pane. Never a spinner.
- **Empty (no query):** invitation — "Search the reference shelf. Results carry their provenance tier, version scope, and evidence coverage inline." One CTA: focus the search field. **Empty (zero hits):** "No admitted docs match this scope. Try `include_unverified` to see quarantined material (flagged), or widen the version target." — names the one action.
- **Pattern R (red ✕):** recoverable operator error — `scope_conflict` (both `host_id` AND `target_*` set — never silent precedence), malformed `k`, rejected FTS query. Inline `Field` validation, red, local.
- **Pattern D (gold ⛊):** dependency degraded, rendered as a safe reduced mode, never red — *agent-runtime down* → `⛊ SEMANTIC RETRIEVAL DEGRADED · serving lexical-only`, `retrieval_mode: lexical_only` chip, FTS results still stream; *CMDB down* → version filter disabled, every hit flagged `version_scope: unverified` in gold; *`pending_embed`* → `retrieval_mode: partial` chip; *index invalid (corpus↔index commit mismatch)* → `⛊ RETRIEVAL SUSPENDED · index rebuilding (stale results withheld)` linking to Index Status (false-green rule — no fabricated results).
- **Stop-engaged:** read-only `HaltBand` in header; reads keep serving.

**2. Doc / Provenance Inspector** — `AuditInspector` §7.2 provenance mode + Workshop body. The read-only truth of *where a doc came from and who touched it*.
```
┌ lib-01J…  "lvextend — LVM2 2.03"  [copy]   ● ADMITTED  ✔ sandbox-verified  ⚠ curation-ingested │
│ proposed_by ⬡ agent:curator-03 · admitted_by ◐ operator:ada · ticket [T-000123]                │
│ status: current   applies_to: linux/ubuntu 24.04·22.04 amd64   last_verified 2026-07-01         │
├─ EVIDENCE LEDGER (append-only) ─────────────────────────────────────────────────────────────────┤
│ WHEN        KIND      ATTESTATION           RUN / SOURCES      CONTENT-BOUND   OUTCOME            │
│ 07-02 14:10 sandbox   ✔ gateway_delivered   R-00A9… hv-3f2c9a  ✔ sha match     ✔ satisfies gate  │
│ 07-01 09:22 crossref  ◑ agent_asserted      3 origins ~heur    —               ✕ never gates     │
│ 06-30 …     operator  ◐ operator_review      —                  —               ✔ admitted        │
│  chain-verify: ✔ Gateway audit chain confirmed  (stale ⇒ ⚠ CANNOT CONFIRM, gold — never green)   │
├─ CHUNK / COVERAGE MAP ─────────────────────┬─ READING PANE (Workshop, DocReadingPane) ───────────┤
│ #0 Growing a volume  ▣ covered  R-00A9…    │  <rendered body, covered spans shaded --paper-200>  │
│ #1 lvextend flags    ▣ covered  R-00A9…    │  uncovered prose bears a ▢ margin mark +            │
│ #2 "also works on…"  ▢ UNCOVERED           │   "not execution-covered" gutter note               │
│ sources: gnu.org (~heuristic origin-cluster) · git history ▸ (opens AuditInspector git view)      │
└────────────────────────────────────────────┴─────────────────────────────────────────────────────┘
```
The **ATTESTATION column** is the heart: `gateway_delivered` = Verified `--ok` ✔; `agent_asserted` = Single/asserted `--attn` ◑ **printed with the constitutional fact "✕ never satisfies the gate"** — rendered as a §4.7 destructive-absence (affirmative explained absence, no interactive affordance, never a greyed "admit anyway" toggle). **CONTENT-BOUND column** = `attested_content_sha256` equality vs current body: green ✔ sha-match, or gold `⚠ evidence stale — attests a superseded byte-state`. Chain-verify never renders green when stale/failed (halt-gold `⚠ CANNOT CONFIRM CHAIN`, or danger-red `✕ CHAIN BROKEN`). Read-only always; no control clears taint. Primary action: none (read-only) except deep-links out.
- **Loaded / Loading** (skeleton ledger + paper skeleton). **Empty never applies** (a doc always has ≥1 source + frontmatter); a missing body → Pattern R `✕ body unavailable`. **Pattern R:** malformed `doc_id` → "not a valid doc reference." **Pattern D:** git-history link degraded when remote push backlog is loud (gold banner → Index Status). **Stop-engaged:** read-only `HaltBand`.

**3. Ingestion Review Queue** — Library's OWN admission gate (`library:admin`, human-only). Instrument. Reuses `ReviewQueue` §7.1 anatomy but is a **DISTINCT queue with distinct authority** — item id is `doc_id` (not a Board `ticket_id`), does **not** live in MC, and cross-app tickets never appear here.
```
┌ INGESTION REVIEW · tier-2 admission gate  (library:admin · ◐ operator only)  ⟳ live 0.5s          │
│ switching: NORMAL   batch cap 10   [ select ≤10 ]  [ Admit selected ⚠ ]  [ Reject selected ⚠ ]    │
├─ ReviewQueue anatomy (DataTable, batched) ────────────────────────────────────────────────────────┤
│ ☐ TIER            DOC       PROPOSED_BY         TICKET      DISTINCTNESS          AGE  diff         │
│ ☐ ⧉ cross-ref.    lib-01K…  ⬡ agent:curator-03  [T-000341]  3 origins ~heur ⚠    2h   [view ▸]    │
│ ☐ ⧉ cross-ref.    lib-01L…  ⬡ agent:curator-07  [T-000341]  3 origins ~heur ⚠    2h   [view ▸]    │
│ ☐ ◑ single-source lib-01M…  ⬡ agent:curator-03  [T-000355]  1 origin (agent-picked ⚠) 4h [view]   │
│   ⓘ agent-asserted sandbox evidence present on lib-01M → ✕ NOT admit-eligible (content-bound gate) │
├─ per-doc DIFF sub-pane (AdmissionDiff, Workshop) — opens on [view] ────────────────────────────────┤
│  lib-01K   gnu.org  vs  quarantine body    +added / −removed markdown, frontmatter delta           │
│  sources: 3 clusters (~heuristic distinctness — NOT a verified-independence badge)                  │
│  [ Admit → cross-referenced ⚠ ]   [ Reject ⚠ ]   ← DangerAction full friction                      │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
The poisoning-defense emphasis of the whole app: **`agent-asserted` evidence is NEVER auto-admit-eligible** → printed §4.7 absence fact `✕ NOT admit-eligible — content-bound gate` (lock glyph, no affordance, no MCP bypass path either). **`sandbox-verified` auto-admits** (external verifier via Gateway) and does NOT appear here — it surfaces in the Spot-Audit stream. **`cross-referenced` needs batched review** — N≥3 distinct origins *raises queue priority, never confers trust*; distinctness shown as `~heur` evidence, copy literally reads "heuristic; the operator gate is the control." **Else → quarantine** (`single-source`/`agent-authored`, retrievable only behind `include_unverified`). **Anti-rubber-stamp friction:** bulk-approve capped at **default 10** (the `[Admit selected]` DangerAction disables past the cap and states why); agent-picked source sets render visually distinct (⚠ marker); `AdmissionDiff` one click away; the bulk `ConfirmFriction` echoes batch size + lists the `doc_id`s. Admit/Reject = full friction (typed-intent + red primary) — "adding trusted content to the shelf every agent reads."
- **Empty:** invitation naming the two lanes — "No docs awaiting admission. Cross-referenced proposals land here for batched review; sandbox-verified docs auto-admit and appear in the Spot-Audit Stream." **Pattern R:** a decision failed to persist (`op_id` replay, already-decided-by-another-operator) — red, row re-syncs via `LiveStream` reset. **Pattern D:** git push backlog loud → gold `⛊ DURABILITY DEGRADED · corpus push N min behind — admissions still record locally (canonical), retrying` (admission NOT blocked; escalates past 30 min). **Stop-engaged:** read-only `HaltBand`; admission decisions are internal Standard-class changes and continue under a kill; if auth is unreachable, the shell renders the "session ended — re-authenticate" state and the `library:admin` gate fails closed.

**4. Tier-1 Spot-Audit Stream** — auto-admissions surfaced for oversight. Instrument, `ReviewQueue` anatomy, `LiveStream` feed. The operator is *auditing already-admitted docs, not gating*.
```
┌ TIER-1 SPOT-AUDIT · auto-admissions (sandbox-verified)  switching: ▲ TIGHTENED (100%)  ⟳ 0.3s     │
│ sample rate: 100% (young) — steady 5%   ANSI-Z1.4 switching · reason: harness_version change       │
├─ sampled rows (DataTable) ─────────────────────────────────────────────────────────────────────────┤
│ TIER            DOC       RUN / HARNESS       COVERED   admitted_by   AUDIT                          │
│ ✔ sandbox-ver.  lib-01N…  R-00B2… hv-3f2c9a   ▣ 4/5     ⚙ svc(auto)   [ Confirm ok ]  [ Reject ⚠ ]  │
│ ✔ sandbox-ver.  lib-01P…  R-00B4… hv-3f2c9a   ▢ 2/6 ⚠   ⚙ svc(auto)   uncovered-heavy → inspect     │
│  Reject → doc rejected (synchronous index removal) + operator-confirmed cluster quarantine          │
└─────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
**Switching-state chip** (`StatePill` family): `NORMAL` `--ink-700` vs `▲ TIGHTENED` `--attn` with the machine reason verbatim — **never green** (tightened is an audit posture, not health). **Uncovered-heavy rows surface prominently** (low `evidence_covered`, ▢⚠) — the anti-tier-riding cue drawing the eye to prose a sandbox never touched. **Reject** = full-friction DangerAction: flips to `rejected` (synchronous index removal), trips tightened switching, and — **only when the implicated `origin_cluster` contains previously-admitted docs** — opens a *second* operator-confirmed `ConfirmFriction` for cluster quarantine (never automatic, so a mis-clustered poison can't be weaponized into mass-suppression). **Confirm ok** = a light-verb `Toast` ("Audit passed"), never gold.
- **Empty** doubles as the honest pre-D7 statement: "No auto-admissions to audit. The sandbox-verified lane is **structurally disabled until the tier-0 sandbox seam freezes (D-7)** — until then every doc reaches trusted tier only through operator review." **Pattern R:** reject failed to persist → re-sync via `LiveStream`. **Pattern D:** feed stalled past bound → `Freshness` degrades to `STALE`, gold, "audit feed stale — treat sampling as unconfirmed" (never a frozen-green feed). **Stop-engaged:** read-only `HaltBand`.

**5. Collections & Lifecycle** — management + retirement/supersession (`library:admin`). Instrument.
```
┌ COLLECTIONS & LIFECYCLE  (library:admin · ◐ operator)                                             │
│ collections: [ cli-reference ]  [ distro-guides ]  [ advisories ]   [ + New collection ]          │
├─ retirement / supersession queue (staleness surfaces here, DataTable) ─────────────────────────────┤
│ DOC       STATUS       applies_to          last_verified  FLAG                action               │
│ lib-01Q…  ● current    ubuntu 22.04 amd64  2025-11-02      ▲ past valid_until  [ Retire ⚠ ]        │
│ lib-01R…  ● current    ubuntu 20.04 amd64  2025-08-14      ▲ distro EOL (CMDB) [ Supersede ⚠ ]     │
│ lib-01S…  ⇉ superseded ubuntu 24.04 amd64  2026-06-30      superseded_by lib-01T… (history)        │
│  Retire/Supersede preserve evidence history — never a body edit, never a delete                    │
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
STATUS = `StatePill` (`● current` / `⇉ superseded` / `◼ retired`). Staleness flags (`past valid_until`, distro-EOL computed at query time from CMDB `eol_date`) render as `--attn ▲` — surfaced for a decision, **retirement is operator-decided, never automatic deletion**. Retire/Supersede = full-friction DangerAction; consequence block states "preserves evidence history; mints/links a new lineage doc, never edits bytes." **No delete affordance exists anywhere** — deletion is not a capability (destructive-absence: printed, not a greyed control). New collection/rename = `Field` forms, light `Toast` on success.
- **Empty:** "No collections yet — create one to group reference docs" and "Nothing stale. Docs past `valid_until` or on EOL distros surface here for retirement." **Pattern R:** lifecycle write conflict (`op_id` replay / already superseded), red. **Pattern D:** push-backlog gold banner (as screen 3). **Stop-engaged:** read-only `HaltBand`.

**6. Index Status** — health, degraded modes, rebuild (`library:admin`). Instrument. The named home of the Library's degraded modes.
```
┌ INDEX STATUS  (library:admin)                                                                     │
│ model_id: qwen3-emb-0.6b  digest 9c1f…  dim 1024   chunker_config_id: cc-2a7…                      │
│ corpus HEAD a9c… ✔   index_meta.corpus_commit a9c… ✔ (ancestor-or-equal)   built_at 2s ago ⟳      │
├─ health / degraded modes (Freshness · Pattern D) ──────────────────────────────────────────────────┤
│  ⛊ SEMANTIC RETRIEVAL DEGRADED — agent-runtime unreachable · serving lexical-only  (gold, Pat-D)  │
│  ⛊ DURABILITY DEGRADED — corpus push 12 min behind · retrying · admissions record locally (canon) │
│  pending_embed: 3 docs — served from FTS half, vectors queued (retrieval_mode: partial)           │
│  ✔ corpus↔index consistent  ·  nightly integrity sweep: last 03:00 ✔                              │
├─ rebuild ──────────────────────────────────────────────────────────────────────────────────────────┤
│  [ Full reindex (destroy + rebuild from corpus) ⚠ ]   ← DangerAction full friction                │
│    consequence: suspends vector+FTS serving until rebuild completes; proves the rebuildable invariant│
└────────────────────────────────────────────────────────────────────────────────────────────────────┘
```
`model_id` / `dim` / `chunker_config_id` / `corpus_commit` render as mono machine-truth. **Corpus↔index consistency uses the false-green rule** — if `index_meta.corpus_commit` is not ancestor-or-equal of HEAD (index leads corpus), it shows `⚠ INDEX INVALID — serving suspended until rebuild` in **halt-gold**, never a green OK. Degraded-mode banners are **Pattern D (gold ⛊), not red** — lexical-only, durability-degraded (escalates past 30 min), `pending_embed` partial; each states "what's still true." The only red Pattern-R here is a genuine operator error (malformed reindex request). Full reindex = full-friction DangerAction; consequence states blast radius (stale results withheld, not served, during rebuild); on completion a `Toast` reports the two-part verdict (byte-identical manifest ✔ + recall@8/Spearman ≥0.95).
- **Empty never applies** (there is always an index or an honest "no index — rebuild required" gold state). **Stop-engaged:** read-only `HaltBand`; reindex continues under kill (band informational).

**◈ App-specific components (only where justified):**
- **`DocReadingPane`** — the Workshop content column that renders a corpus markdown doc on `--paper-*` (Source Serif 4, `--fs-read`) **with chunk boundaries and `evidence_covered` coverage shading overlaid on the prose** (covered spans shaded `--paper-200`; uncovered prose bears a ▢ margin mark + "not execution-covered" gutter note). Not a shared component: a rendered document with per-chunk coverage overlay is domain-unique to a RAG reading surface (the design system explicitly blesses "an editor, a graph, a PageGrid"). It renders *content*, not any §4 safety entity; the tier/coverage/taint chips on it are the shared `TierBadge`/`StatePill`.
- **`ScopeResolver`** — the retrieval-scope control on Search: the `host_id` **XOR** `target_os/distro/version/arch` selector, the resolved `version_scope` state (exact / ~approximate / unverified) shown honestly, and the `include_unverified` toggle. Not shared: version-scoped retrieval against CMDB host facts is a Library-specific query shape; the mutually-exclusive scope inputs (both set → typed `scope_conflict`, never silent precedence) and the fail-loud `version_scope` flag have no analogue elsewhere. Composed *from* `Field` §6.3 inputs; it does not re-draw a shared control.
- **`AdmissionDiff`** — the per-doc diff sub-pane inside the Review Queue / Spot-Audit: quarantine-body vs source markdown + frontmatter delta, with agent-picked-source markers. Not shared: a markdown/frontmatter diff for a poisoning-review gate is the anti-rubber-stamp evidence surface (finding F7). It sits *inside* the shared `ReviewQueue` anatomy and reuses `TierBadge`/`PrincipalRef`; only the diff rendering itself is bespoke.

**⚠ Safety / danger surfaces specific to this app:**
- **The provenance-honesty invariant is the app's signature:** trust is always *shown, never inferred* — tier + version-scope + evidence-coverage + `curation-ingested` taint travel inline with **every** search hit and **every** chunk, and heuristics (origin-cluster, distinctness counts) render *as heuristic* with a `~heur` tag, never as a verified tier. `curation-ingested` UNTRUSTED striped-amber on every ingested result is the operator's cue that the content is adversarial LLM-input and auto-lane-ineligible.
- **The content-bound admission gate (poisoning defense):** `sandbox-verified` auto-admits (external verifier = tier-0 sandbox via the Gateway) → surfaced in Spot-Audit for oversight, not gated by a human; `cross-referenced` → batched operator review (distinctness raises priority, never confers trust); `agent-asserted` evidence is **NEVER** auto-admit-eligible → rendered as a printed constitutional absence (🔒 lock glyph, no affordance, no MCP bypass path); everything else → quarantine (retrievable only behind `include_unverified`). This is the whole security posture of the app made visible.
- **Anti-rubber-stamp friction on the human gate:** bulk-approve capped at default 10 (the DangerAction disables past the cap and says why); agent-picked source sets render visually distinct; the diff is always one click away; cluster quarantine on a poison-reject is a *second, never-automatic* operator confirmation.
- **Honest-degraded states (Pattern D, gold, never red):** lexical-only (runtime down), version-filter-off (CMDB down), `pending_embed` partial, index-invalid serving-suspended, durability-degraded (push backlog). The false-green prohibition binds corpus↔index consistency and chain-verify — a stale read renders the honest unknown in halt-gold, never a fabricated OK.
- **Read-only halt visibility:** Library is *not* in the kill chain — it renders `HaltBand` read-only and deep-links to MC/auth; it holds no credentials, no fencing, no kill actuator, no approval-record authority, and mints no ticket-gate clear.

**⚑ Gaps flagged:** None — the spec is complete for design. It consumes the frozen design system and specifies deltas only; the one config-not-constant value it flags (`dim 1024` labeled PENDING-SIZING) is a data value to display as machine-truth, not a design decision, and the sandbox auto-admit lane's structural-disable-until-D-7 state is fully specified as an empty-state.

---

### ⬢ INJECTION BLOCK — Drive (artifact store)

**Purpose (one line):** The store for every non-markdown deliverable of agent work — rendered PDFs, exports, generated files — keyed by the ticket that produced it, where every file names its provenance and the store never lies about whether it still belongs to a real ticket.

**Who uses it:** Both. The **operator** gets the full UI (browse, preview, download, upload, admin). **Agents** use the MCP surface (no UI) over the *same* API. Every screen below is the human surface.

**Archetype:** **Both.** Instrument (dark control-room, compact) for the Ticket Browser, the Artifact Detail metadata/history rail, and the whole Admin console. Workshop (a reading/preview pane *inside* the Instrument shell) for the Preview Surface only. **Hard rule:** the shell, nav, header, and every safety component stay Instrument-dark in both — the archetype only changes the content substrate of the preview pane.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — one shell: 224px dark side rail (56px collapsed) + global header (app name + one-line "artifact store" identity, `SYSTEM STATE` center, read-only halt mirror right) + suite switcher showing current suite posture once. Operator identity chip + `🔑 fresh`/`🔑 stale` session cue in the header.
- **HaltBand** — the signature full-width GOLD `#F2842B` (`--halt-500`) safe-stop band under the header, `--halt-tint #2E1D0B` wash, interlock `▮▮` (kill engaged) / shield `⛊` (dependency-down safe-stop), gold-ink `#FFD8A8` text, never `✕`. **Read-only in Drive** — Drive hosts no kill actuator (only MC and auth do); it deep-links out to MC/auth. Present only when kill level > G0 or a dependency is down.
- **TicketRef** — opaque mono `[ T-000123 ]` chip, `--ink-700` on `--sub-750`, copy-on-click, middle-truncate, never parsed. Groups the browser.
- **PrincipalRef** — kind-glyphed mono `sub`: `⬡` agent / `◐` operator / `⚙` service. On every version row and list row as `created_by`. Copy-on-click.
- **TierBadge** — provenance/trust: `✔ verified` green outline (`--ok-500 #46B98A`); `⧉ derived`/corroborated cyan outline (`--signal-500 #29B6D8`) with a `~derived` micro-tag; `◑ single-source` amber outline (`--attn-500 #E8B84B`) for unverified-ticket writes. Shape = severity family, glyph = independence, text = exact tier. Never recolors the TicketRef chip; rides *beside* it.
- **StatePill** — one `[glyph] LABEL` pill per lifecycle state, never color-only. Used for ticket verification (`✔ VERIFIED` / `◐ UNVERIFIED_PENDING` / `⛒ VERIFIED_ABSENT`), version/upload/GC state, and `◼ DELETE-MARKED`.
- **FenceState** — per-version write-fence liveness: healthy `🔒 gen 47` neutral `--ink-700` (never green — a held lock is not a confirmation); zombie `⚠ gen 46 · SUPERSEDED` in amber for a stale-agent write. Human/service versions render the neutral no-lease form (exempt).
- **DangerAction + ConfirmFriction** — the one destructive gate. GC purge = red `#E5594E` (`--danger-500`) behind the **full** variant (typed-intent `PURGE` + auth Tier-2 live step-up + red primary, disabled until both satisfied, Cancel = default/`Esc`). Restore & Delete-mark (toward-less/reversible) = the **light** variant (single confirm, signal-cyan primary, no typed intent).
- **Freshness** — `⟳ age` + source stamp on every live figure (Drive has **no SSE** — all figures are polled). Past its bound → amber `▲ STALE` with the safe reading spelled out; never a fabricated green. Binds the health strip hard.
- **ReviewChip** — `verified_absent` escalation pill (StatePill + machine reason + deep-link out). Anatomy reused, but resolves in **Drive's own** Admin console (distinct gate), not MC's `/review` queue — a nonexistent ticket has no MC review item.
- **AuditInspector** (§7.2 cross-app pattern) — append-only DataTable for version history and the admin audit log; provenance-lineage pivot for derived previews. Read-only always; **no chain-verify affordance** (Drive is Standard, not hash-chained — completeness, not tamper-evidence, is the bar).
- **DataTable** — dense zebra (`--sub-750` stripe), sticky sortable header, mono ID column w/ copy, right-aligned tabular numerics, reflows to stacked cards below ~640px. The truth-surface of every list.
- **Field / Modal / Toast** — visible-label inputs w/ inline validation (upload intent form); the one elevated surface (halt cut above every scrim); verb-matched success toasts ("Uploaded", "Delete-marked", "Restored") — **never** for the halt or any safety state.
- Not used: `ReviewQueue`, `LiveAgentView`, any kill actuator (all MC/auth-owned).

**⬡ Screens & views to build:**

**1. Ticket Browser (Instrument)** — artifacts grouped by originating ticket. Two entry modes over one state: deep-linked from Board/MC/Chat (scoped to a `ticket_id`) or a recent view (most-recently-written tickets first). Layout: AppShell + read-only HaltBand mirror; a header row with `/ search ticket_id` and an `↑ Upload` action; then collapsible **group headers** (`TicketRef` + verification `StatePill` + aggregate count/size + last-write `Freshness`), each expanding to a `DataTable` of rows: logical name · current `seq` · sniffed mime · size (tabular) · `created_by` (`PrincipalRef`) · provenance (`TierBadge`) · when.
```
▸ [ T-000123 ]  ✔ VERIFIED     4 artifacts · 1.2 GiB · last write 2m       source: board
   NAME                VER  TYPE  SIZE     created_by            PROVENANCE      WHEN
   report.pdf          v3   pdf   4.1 MB   ⬡ agent:patcher-07    ✔ verified      2m
   report.preview.pdf  v1   pdf   3.9 MB   ⚙ svc:drive           ⧉ derived        2m
▸ [ T-000119 ]  ◐ UNVERIFIED_PENDING  2 artifacts   ⚠ Board unreachable; recheck queued
▸ [ T-000101 ]  ⛒ VERIFIED_ABSENT  1 artifact · delete-marked  → Admin escalation queue
```
`verified_absent` groups collapse by default with a deep-link to Admin. Delete-marked versions hidden unless an `include_deleted` toggle is on (then shown with `◼ DELETE-MARKED`). Row click → Artifact Detail. **States:** *Loaded* as above · *Loading* skeleton group headers + rows (never a spinner) · *Empty* invitation "No artifacts yet. Agents write deliverables here keyed by ticket; you can also upload one." + the Upload action (deep-linked-but-empty variant: "T-000123 has produced no artifacts yet.") · *Pattern-R (red ✕)* the operator's own list request failed recoverably (malformed `ticket_id`, bad page token) — states what/how-to-fix in interface voice · *Pattern-D (gold ⛊)* **Board unreachable** → verification degrades to `◐ UNVERIFIED_PENDING`; a thin gold "what's still true / what to do" notice above the list, gold *not* red, store keeps serving · *Stop-engaged* read-only HaltBand; browsing/download continue by design and the band copy says so.

**2. Artifact Detail (Instrument shell + Workshop preview) — BOTH** — metadata/version rail on the left, preview pane on the right.
```
┌ header · [ ← T-000123 ] ✔ VERIFIED   report.pdf   [ ↓ Download current ] [ ⋯ ] ┐
│ [ read-only HaltBand mirror when engaged ]                                     │
├─ metadata + version history (Instrument) ─────────┬─ Preview Surface (Workshop) ┤
│ ticket [T-000123] ✔  created_by ⬡ agent:patcher-07│  embedded pdf-app viewer     │
│ logical report.pdf  mime pdf  sha256 3f9a…c1 ⧉copy│  (progressive/Range load)    │
│ Version history — AuditInspector (append-only)    │  ┌────────────────────────┐  │
│  SEQ WHEN     WHO                HASH    FENCE     │  │   report.pdf           │  │
│  v3◀ 2m ago   ⬡ agent:patcher-07 3f9a…c1 🔒 gen47  │  └────────────────────────┘  │
│  v1  1h ago   ⬡ agent:patcher-07 77aa…02 ⚠ gen46   │  Provenance: ✔ verified      │
│                                    SUPERSEDED      │  sniffed pdf · CSP:sandbox   │
│ [ ↓ this version ] [ ↩ Restore v2 — operator ]     │                              │
└───────────────────────────────────────────────────┴──────────────────────────────┘
```
Metadata block: `TicketRef` + verification `StatePill`, `PrincipalRef`, sniffed mime (canonical), copy-on-click `sha256` (mono), tabular size, a `note_id` deep-link to Notes when present, and `derived_from_version_id` lineage for preview rows. Version history is `AuditInspector` — append-only rows with `FenceState` per version (zombie `⚠ gen46 · SUPERSEDED` = a stale-agent write, drawn identically to Board/Gateway); the same inspector pivots to a provenance-lineage view (derived-preview chain back to its source). Operator-only `[⋯]` affordances: **Restore** a prior version and **Delete-mark** the current — both `ConfirmFriction` **light** (reversible, signal-cyan, single confirm); agents never see these. **States:** *Loaded* as above · *Loading* skeleton metadata + history; preview shows a labeled render placeholder (a bare spinner permitted **only** for the genuinely indeterminate PDF render job, with a "rendering…" label) · *Empty* n/a (always ≥1 version); a delete-marked-only artifact shows history with `NULL` pointer + `◼ DELETE-MARKED` banner + Restore · *Pattern-R (red ✕)* version 404 / a download the operator triggered failed recoverably · *Pattern-D (gold ⛊)* **pdf app down** → preview pane *only* degrades to a gold card: "Preview unavailable — pdf renderer is down. This is the renderer safe-stopping, not a lost file. STILL TRUE: original bytes intact — Download still works." (a stored `.preview.pdf` derived version serves from Drive with no pdf dependency) · *Stop-engaged* read-only HaltBand; reads/downloads/Restore/Delete-mark all continue (nothing destructive here).

**3. Upload flow (operator drag-drop → intent + bytes)** — a `Modal` scoped to a ticket; uses the *same* two-step API as agents (no UI-private write path). `UploadDropzone` with per-file streaming rows (`StatePill`: `⧗ streaming` → `✔ committed` / `✕ failed` / `◼ aborted`), `Freshness`-polled progress bar, then `Field` intent inputs (ticket, logical name, optional `note_id`) with inline validation catching a malformed `ticket_id` before submit. **Not destructive** → no ConfirmFriction; success = verb-matched "Uploaded" `Toast`. **States:** size-cap (413), watermark (507), quota (429), type-reject (415) render **Pattern-R inline on the offending file**, stating the exact limit; **Pattern-D** auth/Board-down mid-upload degrades gracefully — bytes still authenticate locally, a Board-unreachable write lands `◐ unverified_pending` (gold badge, not an error).

**4. Admin console (Instrument)** — the one screen with a destructive affordance; four stacked panels.
```
┌ Admin · Drive ────────────────────────────────────────────────────────────────┐
│ [ read-only HaltBand — GC refused suite-wide while any kill epoch > G0 ]        │
├ Health strip — Freshness (never a false green) ─────────────────────────────────┤
│ DiskWatermarkMeter ▐███████████░░░ 71% / 90%▐  source: healthz · as-of 8s        │
│ backup ✔ 6h ago    last-verify ✔ scrub clean 2d    journals ✔ closed            │
│ ▲ backup age > cadence → amber "STALE — last snapshot 3d ago" (gold, not red)   │
│ ✕ drive verify found bit-rot → danger "INTEGRITY: N blobs failed hash" (red)    │
├ verified_absent escalation queue — ReviewChip ─────── DataTable ────────────────┤
│  [T-000101] ⛒ VERIFIED_ABSENT  report-old.pdf  ⬡ agent:x-09  ticket_not_found  │
│             ◈ ESCALATED  → deep-link out   [ inspect ]  [ purge → ]             │
├ Orphan / GC console ────────────────────────────────────────────────────────────┤
│  Phase-1 (auto, continuous): 3 temps swept · 1 orphan past grace [read-only log]│
│  Phase-2 (manual, destructive): 12 delete-marked chains · 8 refcount-0 · 4.2 GiB│
│                                          [ 🔴 Purge reclaimable — DangerAction ] │
├ Audit log — AuditInspector (append-only; mutations + denials) ──────────────────┤
│  12:04:11Z ◐ operator:ada    gc_purge             8 blobs    ✔ done             │
│  11:58:02Z ⬡ agent:patcher-07 stale_fence_rejected T-000123  ✕ STALE_FENCING    │
└─────────────────────────────────────────────────────────────────────────────────┘
```
The Phase-2 **Purge** is the single `DangerAction` in the app — destructive, irreversible, **human-only**, routed through `ConfirmFriction` **full** variant:
```
┌ CONFIRM: GC PURGE (reclaim → destroy) ──────────────────────┐  ← danger-red header
│ ⚠ PERMANENTLY removes 8 refcount-0 blobs (4.2 GiB) + 12     │
│   delete-marked chains. DIRECTION: toward MORE irreversible │
│   action — purged bytes cannot be restored.                 │
│ Blast radius: 8 blobs · 12 chains · tickets T-000101…       │  ← app-specific preview
│ Type  PURGE  to confirm:  [▏          ]                     │  ← typed-intent gate
│ Re-authenticate (step-up): 🔑 passkey · auth_time (Tier-2)  │  ← auth live re-check
│        [ Cancel ]                    [ Purge ] ← danger-red  │
└─────────────────────────────────────────────────────────────┘
```
Primary disabled until typed-intent matches **and** step-up is fresh; Cancel = default focus / `Esc`; step-up is an **auth live Tier-2 re-check**, not a local password box. **Fail-closed:** if the auth staleness bound is exceeded or a kill epoch is engaged, the purge is refused server-side and the button shows the halt/degraded reason. **States:** *Loaded* as above · *Loading* skeleton panels; health figures show `Freshness` "loading," not a fabricated value · *Empty* escalation-queue-empty is an invitation-of-calm ("No orphaned artifacts. Tickets that vanish from the Board surface here for disposition."), GC-empty ("Nothing to purge — 0 refcount-0 blobs.") · *Pattern-R (red ✕)* a purge that failed recoverably (transient txn lock) states retry · *Pattern-D (gold ⛊)* **auth/Redis down** → GC route **fails closed**, purge affordance renders a gold SAFE-STOPPED card "Purge refused — cannot confirm step-up (auth unreachable). This is the destructive gate failing closed, not a console outage. Reads and the health strip continue."; **healthz/backup source unreachable** → health strip shows gold cannot-confirm figures, never green · *Stop-engaged* read-only HaltBand; Phase-2 purge reflects the suite-wide refusal (halt as the printed reason + deep-link to review the halt in MC/auth); all read panels stay live.

**◈ App-specific components (only where justified):**
1. **`PreviewSurface`** — the inline artifact viewer inside Artifact Detail's Workshop pane: `image/png|jpeg|webp|gif` on a neutral matte; `text/plain` on the `--paper-100 #F5F3ED` reading surface in **Source Serif 4** body (`--fs-read` 17/28, operator-zoomable 15–20px, charset pinned); `application/pdf` via the **embedded `pdf` app viewer** (progressive/Range load — never a reimplemented viewer); anything off the inline-allowlist (svg, html, office, octet-stream) → a **download-only card** echoing the `nosniff` + `CSP: sandbox` + attachment-default serving policy as printed facts. *Why not shared:* a media/document viewer is a domain-unique widget the system explicitly permits (like an editor or a graph); it embeds the pdf app rather than reimplementing rendering, and enforces the sniffed-allowlist that is Drive's stored-XSS boundary. Its provenance header + states reuse `TierBadge`/`Freshness`/Pattern-D.
2. **`DiskWatermarkMeter`** — a single horizontal capacity gauge (used-% against the 90% watermark) in the Admin health strip. *Why not shared:* `Freshness` stamps a figure's *age*, not a fill-vs-threshold ratio; only the fill-bar geometry is app-specific. Its figure + source stamp ride `Freshness` and obey the false-green rule — crossing the watermark is amber/gold, **never** a green "OK."
3. **`UploadDropzone`** — the operator drag-drop target with per-file streaming progress driving the intent→bytes flow. *Why not shared:* a multi-file streaming uploader is domain-specific plumbing; its chrome is built from `Field` + `StatePill` + `Toast`, but the drop target + progress rows have no shared equivalent. Writes only through the public API.

**⚠ Safety / danger surfaces specific to this app:**
- **GC purge is the one destructive act** — human-only (no agent-mintable scope reaches it), full ConfirmFriction (typed `PURGE` + auth Tier-2 live step-up), with an app-specific **blast-radius preview** (N blobs · N chains · affected tickets). It is the **one Drive route that fails closed** — refused server-side under auth-staleness or an engaged kill epoch. Build the friction so the primary stays disabled until both typed-intent and fresh step-up are satisfied.
- **Three-state ticket verification** (`verified` / `unverified_pending` / `verified_absent`) is a first-class visible truth via `StatePill` beside the `TicketRef`, never recoloring the chip. Expect a "sea of gold `◐ UNVERIFIED_PENDING`" in the default degraded posture (until the Board-existence dependency ships) — this is **honest Pattern-D, never a red error**.
- **The false-green rule binds the health strip hard:** a stale/missing backup is amber `▲ STALE` with the safe reading spelled out, never a green "backed up"; a real detected bit-rot/tamper from `drive verify` is danger-red `✕ INTEGRITY` (a real Pattern-R failure); a merely-unreachable healthz is gold cannot-confirm — never green.
- **Fencing honesty:** a version whose fencing generation trails the resource renders the canonical zombie `⚠ gen46 · SUPERSEDED` — a stale-agent write shown identically to Board/Gateway.
- **HaltBand is read-only here** — browsing and download are benign reads that continue under a kill by design (band copy says so); Drive never hosts a kill trigger, only deep-links to MC/auth.
- **`verified_absent` reconciliation:** rendered with `ReviewChip` anatomy but resolved in Drive's own Admin console (distinct gate, different authority) — it does **not** appear in MC's `/review` queue.

**⚑ Gaps flagged:**
- **`verified_absent` deep-link target before Chat ships** — the `ReviewChip`'s "deep-link out" currently resolves in-app (to Artifact Detail for disposition) rather than to a Chat notification; the full doorbell pattern arrives when Chat exists. Honest, not a surprise — [GAP — the push-channel destination is deferred until Chat exists; no design action needed now].
- **Recent-view Ticket Browser depends on a `GET /api/tickets` distinct-ticket index not yet in the frozen API** — a rebuildable read the grouping needs. [GAP — operator/Claude Design to decide: design the recent view assuming this index exists, or restrict the Browser to deep-linked ticket-scoped entry only.] Does not change any visual; flagged because the recent-view screen presupposes it.
- All colors, type, spacing, and safety cues above are drawn from the frozen token set; no out-of-token color is required. Otherwise the spec is complete for design.

---

### ⬢ INJECTION BLOCK — Chat (notifications + operator broadcast)

**Purpose (one line):** The operator's live agent→operator notification/escalation feed plus a soft operator→fleet broadcast — the suite's *doorbell*, not its door.
**Who uses it:** Operator-facing UI (this whole block). The agent surface is a single write-only MCP tool (`post_notification`) with **no UI** — agents never get `chat:read`/`chat:manage`. Everything below is the human surface.
**Archetype:** **Both** — an Instrument-dark shell (feed list, broadcast form, health readout) wrapping a **Workshop reading pane** for the one place long-form agent markdown appears (notification body, feed body-preview, broadcast preview).

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark side-rail (224px open / 56px collapsed) + global header + suite switcher; header shows `SYSTEM STATE` center zone and, right slot, the **read-only HaltBand mirror**. Suite switcher shows current posture *once*. Chat's rail items: Feed / Broadcast / Health.
- **HaltBand** — full-width GOLD `--halt-500 #F2842B` safe-stop band under the header, `--halt-tint #2E1D0B` wash, `--halt-ink #FFD8A8` text, interlock ▮▮ / shield ⛊ glyph (never ✕). **Read-only in Chat** — Chat is NOT in the kill chain, shows the band with **no actuator**; its `[ Review halt → ]` deep-links to MC/auth. Never red.
- **StatePill** — one glyph+label pill per lifecycle state, never color-only (`✔ CONFIRMED`/`✔ DONE` green `--ok #46B98A`, `● active`, `◼ expired`, `⛒ revoked`).
- **ReviewChip** — StatePill + verbatim machine-reason (`--ink-600 #94A1AE`) + **deep-link into MC's canonical ReviewQueue** at `mc.<SUITE_DOMAIN>/review/<ticket_id>`. Chat *surfaces* review/escalation, **never clears** it.
- **PrincipalRef** — mono `sub`, kind-glyphed: ⬡ agent / ◐ operator / ⚙ service. Copy-on-click. `agent_id` = server-stamped, never caller-supplied.
- **TicketRef** — opaque mono `ticket_id` chip on `--sub-750 #1E242E`, copy-on-click, middle-truncate.
- **FenceState** — 🔒 gen+lease+heartbeat. **In Chat it is ADVISORY-ONLY: rendered greyed with an `advisory` micro-tag** — display-of-truth, never a gate (Chat pings outside the fencing reject-set).
- **Freshness** — ⟳ age + source stamp; a stalled/over-bound signal goes amber `▲ STALE` with the safe reading spelled out. **False-green prohibition binds hard here** — never a frozen-green tile.
- **DangerAction + ConfirmFriction** — destructive = red `--danger-500 #E5594E` behind typed-intent + step-up. Chat uses **only the light tier** (§5.1 rule 4, *toward-less-action*): single confirm, signal-cyan `--signal-500 #29B6D8`, no typed intent, no step-up. Applies to ack, batch-ack, broadcast-post, broadcast-revoke.
- **LiveStream** — SSE with `Last-Event-ID` replay, `event: reset`→REST re-sync, terminate on `auth:revocations`→"session ended — re-authenticate."
- **DataTable** — dense zebra `--sub-750`, mono ID column, sticky sortable header (broadcast history).
- **AuditInspector** — append-only per-notification trail. **Chat's variant has NO chain-verify affordance** (Standard class, not hash-chained). Read-only.
- **Field / Toast / Modal** — standard. Toast matches the action verb, `--ok`/`--danger`, **never gold**.
- Cross-app pattern reused by pointer only: **ReviewQueue** (MC owns — Chat deep-links in, hosts none).

**⌘ Screens & views to build:**

**1. Feed — the live notification stream** (Instrument list, Workshop body-preview per row)
Layout: header (app name + `SYSTEM STATE` + feed-fresh Freshness chip + operator PrincipalRef + `🔑 fresh`) → read-only HaltBand mirror renders full-width *only* when posture > G0 → filter bar (`[/ filter]`, `[ Ack all seen ▸ ]`, chips: kind / min-priority 1–5 / agent / ticket / ☐ unacked) → the row stack → footer (`showing 90d · N unacked · N total`, `[ load older → ]`).
Each row: **KindBadge** front-chip (app-specific, below) · **PrincipalRef** author · verbatim machine-reason or `—` · **TicketRef** if present · one-line body preview (Workshop measure) · inline `◈ → mc/review/<ticket_id>` deep-link **always captioned "(target wins)"** · tabular age + `·×N` repeat-count · greyed `🔒 gen N · advisory` FenceState if supplied · `[Ack]` (light) + `[→]` deep-link.
```
┌─ header: Chat  ● nominal   ⟳ feed fresh 0.4s · ◐ operator:ada  🔑 fresh ┐
├─ HaltBand mirror renders here full-width ONLY when posture > G0 (read-only) ┤
│ FEED                              [/ filter]  [ Ack all seen ▸ ]           │
│ ▸kind[esc][review][done] ▸≥prio[1..5] ▸agent ▸ticket ▸☐unacked            │
│ ┌──────────────────────────────────────────────────────────────────────┐ │
│ │⚑ P5 ESCALATION ⬡agent:patcher-07 ·board_escalation  2m ·×3 [Ack][→]│ │ ← PINNED, --attn family (NOT gold)
│ │  NAS reboot hung — host unreachable, cannot verify patch              │ │
│ │  ◈ → mc/review/T-000123  (target wins)   🔒 gen46 · advisory          │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │◈ P4 NEEDS_REVIEW ⬡agent:writer-03 [T-000210] 14m [Ack][→]           │ │
│ │  Research note ready: safe-patch practice for Wazuh fleet             │ │
│ │  ◈ → mc/review/T-000210  (target wins)                                │ │
│ ├──────────────────────────────────────────────────────────────────────┤ │
│ │✔ P2 DONE  ⚙svc:tier-approver [T-000198] 1h [Ack][→]                 │ │
│ │  Canary batch patched · Wazuh confirmed active→solved                 │ │
│ └──────────────────────────────────────────────────────────────────────┘ │
│ showing 90d · 3 unacked · 41 total          [ load older → ]              │
```
- **Escalation pinning:** un-acked `escalation` rows pin to top in the **`--attn` attention family `#E8B84B`** (needs-attention, *not* halt-gold — gold is reserved for HaltBand). `·×N` ticks as the agent re-notifies. Ack un-pins + greys the row.
- **Batch ack** `[ Ack all seen ▸ ]` = single **light** signal-cyan confirm (benign, moves toward *less* noise) — never typed-intent.
- Filters are Field chips, `/`-focusable, URL-reflected (shareable).
- States: **Loaded** (live SSE tip, feed-fresh chip green). **Loading** = static row skeletons matching the table; header chip reads `⟳ connecting` — never a spinner. **Empty** = invitation: "No notifications in this window. Agents post escalations, review-ready work, and completions here — this feed fills as the fleet works. Widen the window or clear filters." (if a filter is the cause, name *which* filter + `[ clear filters ]`). **Pattern-R (red `#E5594E`)** = local recoverable, inline ✕ on the affected control only (ack 409/429, filter 400) — never colors the screen. **Pattern-D (gold `#F2842B`)** = dependency down, HaltBand SAFE-STOPPED ⛊, two cases: **(a)** SSE stalled past bound → rows held but stamped `▲ STALE — showing last-known as of <age>` + Pattern-D band "stream unconfirmed; escalations may not be arriving live — check the Board for the durable record"; **(b)** MC deep-link target unreachable → links still render (template-derived, always valid) with a gold `⛊ MC unreachable — link may 'not-in-queue' until MC returns` micro-note, **never** a red error. **Stop-engaged** = read-only HaltBand mirror appears full-width; **feed keeps flowing** (benign reads continue by design), no content change.

**2. Notification detail — deep-link landing + full envelope** (Workshop reading pane inside Instrument shell)
Layout: `← Feed` back · KindBadge + PrincipalRef + machine-reason header · `notification_id` mono copy-chip + posted timestamp + `×N (last …)` + TicketRef · a **target-wins caption block** (`ⓘ This is a snapshot from when it was posted. The live target is authoritative — open it: ◈ → mc/review/… [ Open in MC → ]`) · the **body on the Workshop `--paper-100 #F5F3ED` reading surface, Source Serif 4 at `--fs-read` 17/28, operator-zoomable** · `── envelope ──` metadata row (kind/priority/tags/source + greyed `🔒 gen N · advisory` FenceState) · `── audit ──` AuditInspector.
- **Body sanitization is a visible fact:** allowlist markdown only; raw HTML + remote images stripped and **rendered as dead text**; **body links render as dead (non-clickable) text** — the *only* live link on the screen is the template-derived MC deep-link (anti-phishing).
- `notification_id` uses the shared mono-identifier + copy affordance (a Chat-minted id — NOT a TicketRef, since it's not a work-item).
- AuditInspector rows: mono timestamp · PrincipalRef actor · action verb · outcome StatePill (posted / repeat-collapses / push delivered|gave_up / acked-by-whom). No chain-verify.
- States: **Loaded** full envelope. **Loading** = header chips + paper-pane body skeleton + audit-row skeletons. **Empty** = N/A by construction; a **stale/bad `notification_id`** renders Pattern-R "This notification is no longer in the retained window ([ back to feed ]) — the underlying condition, if still live, will have re-fired as a new row" (never a bare 404). **Pattern-R** = ack from this page failed (409/429), inline ✕ on the ack control. **Pattern-D** = deep-link target's system (MC/Board/Notes) unreachable → link stays rendered with gold `⛊ target unreachable — showing this snapshot; open when it returns`; target-wins caption **reinforced, never contradicted** (the snapshot body is still true as posted). **Stop-engaged** = read-only HaltBand mirror in header, content unchanged.

**3. Broadcast — operator→fleet composer + active banner + history** (Instrument; Workshop preview)
Layout: an **ACTIVE BROADCAST banner** (renders only when one is live) → `── compose ──` (the non-authority fact line, then Field composer + Workshop preview + `[ Post broadcast ]`) → `── history ──` DataTable.
```
┌─ BROADCAST ───────────────────────────────────────────────────────────┐
│ ┌ ACTIVE BROADCAST (only when live) ─────────────────────────────────┐ │
│ │📣 P3 · "Maintenance window opens 22:00 UTC — pause non-urgent claims"│ │ ← --signal/--attn family, NOT gold
│ │   by ◐operator:ada · posted 2h · expires in 21h      [ Revoke ▸ ]   │ │ ← DangerAction, LIGHT tier
│ └────────────────────────────────────────────────────────────────────┘ │
│ ── compose ──                                                           │
│ 🔒 A broadcast is an advisory the fleet MAY read. It does NOT stop,     │ ← destructive-ABSENCE fact (lock glyph)
│    gate, or command any agent. To halt the fleet, use MC/auth → .       │
│ Body [ markdown, ≤2000 … ]      Priority [3▾]   Expires [24h▾]          │
│ ╔ preview (Workshop --paper pane — what a fleet reader would see) ════╗ │
│ ║ Maintenance window opens 22:00 UTC — pause non-urgent claims         ║ │
│ ╚═════════════════════════════════════════════════════════════════════╝ │
│                                                     [ Post broadcast ]   │
│ ── history ── DataTable: [B-…]·body·PrincipalRef·posted·expires·revoke   │
```
- **Active banner** = persistent `--signal`/`--attn`-family band (StatePill-family notice), **deliberately NOT HaltBand and NOT gold** — a broadcast is not a safe-stop and must never borrow the safe-stop grammar. Shows author PrincipalRef + tabular expiry countdown.
- **Non-authority statement** = destructive-absence rule: an **affirmative printed fact with lock glyph 🔒 and no interactive affordance** — *not* a greyed-out "stop the fleet" button (a disabled control implies a latent capability). The ⛔ glyph is never used here.
- **Post** = light confirm (advisory, no world effect), Toast "Broadcast posted." **Revoke** = DangerAction at **light** tier (withdraws → toward-less), single signal-cyan confirm, writes an audit row.
- History DataTable: mono `broadcast_id` copy · body preview · PrincipalRef · posted/expires tabular · StatePill (`● active`/`◼ expired`/`⛒ revoked`) · revoke on active rows.
- States: **Loaded** composer + (banner iff live) + history. **Loading** = skeleton composer + history-row skeletons. **Empty** = banner region collapsed with invitation "No active broadcast. A broadcast is a soft advisory the fleet may read — it does not stop or command agents. Compose one below."; history empty → "No broadcasts yet." **Pattern-R** = post/revoke failed (400 inline Field triangle-bang; 429 red ✕ retry-after; 409 red ✕ "already revoked, refreshing"). **Pattern-D** = Chat's own store unreachable → composer submit disables + Pattern-D gold band "broadcast composing is paused — Chat's store is unreachable; existing broadcasts still display." **Stop-engaged** = read-only HaltBand mirror; **broadcasting remains available** (not a kill-chain action; operator may want to advise the fleet *about* the halt) — the destructive-absence statement stays so a broadcast is never mistaken for the stop.

**4. Health strip — the doorbell's own liveness** (pure Instrument)
Layout: one Freshness row per signal, each with a **source stamp**: SSE feed (`● connected · fresh 0.4s · Last-Event-ID` + source) · push sink (`● ntfy delivering · last ok 12s · gave_up 0`) · DB size (`● 0.4 GB / 2.0 GB guard`) · backup (`● last 06:00 (7h ago) · 30 dailies · 12 monthlies`) · `── MC resolve seam ──` resolve-feed row.
```
┌─ HEALTH ──────────────────────────────────────────────────────────────┐
│ ⟳ SSE feed   ● connected · fresh 0.4s · Last-Event-ID N-01J8… source:chat│
│ 📤 push sink  ● ntfy delivering · last ok 12s · gave_up 0    source:outbox│
│ 🗄 DB size    ● 0.4 GB / 2.0 GB guard (CHAT_DB_SIZE_GUARD)   source:chat  │
│ 💾 backup     ● last 06:00 (7h ago) · 30 dailies · 12 monthlies source:chat│
│ ── MC resolve seam ──                                                    │
│ 🔗 resolve feed ▲ awaiting mc:read grant → deep-links on fallback        │ ← honest PENDING, amber ▲
```
- **False-green prohibition binds hardest here** (a doorbell that lies about whether it can ring is the worst failure). Healthy = neutral `●`/`⟳`. A stalled/over-bound signal goes **amber `▲ STALE`** with the safe reading spelled out (`SSE stale → showing last-known` / `push gave_up N → check ntfy`) — **never a fabricated green**. Backup stale past cadence → `▲` in **halt-gold** (canonical-store DR honesty). DB size over guard → `▲` + Chat has posted itself a `needs_review` system notification, linked as a ReviewChip.
- States: **Loaded** rows fresh with source. **Loading** = row skeletons. **Empty** = N/A. **Pattern-R** = a health *query* itself failed (rare) → single red ✕ row "cannot read <signal> status." **Pattern-D** = a monitored dependency down (SSE `▲ STALE` + Pattern-D band; push `gave_up` → `▲ push sink not delivering — feed + UI remain the durable fallback`; backup stale → halt-gold `▲`) — none red. **Stop-engaged** = read-only HaltBand mirror; figures unchanged.

**◈ App-specific components (only where justified):**
- **`KindBadge`** — the one genuinely Chat-unique widget: the leading front-chip on every feed/detail row that fuses (a) notification **kind** (`escalation ⚑ / needs_review ◈ / done ✔`) with (b) the **server-clamped priority band P1–P5** into one glanceable, sortable marker, and drives escalation-pin ordering. **Why not a shared component:** its `needs_review`/`escalation` members ARE a **ReviewChip** (delegated verbatim — StatePill + machine-reason + MC deep-link) and its `done` member IS a plain **StatePill** (`✔ DONE`); KindBadge re-draws *none* of those. It is a composition that adds the one thing no shared component carries — the **priority band**, a Chat-domain data field (neither a lifecycle state, a trust tier, nor a fencing state). **Hard honesty constraints:** the escalation member uses the **`--attn` attention family `#E8B84B`, never halt-gold** (an escalation is needs-attention, not a safe-stop); priority is shown as **band + numeral + glyph**, never color-alone; it introduces no new interactive color (the deep-link inside it is the shared ReviewChip link).

**⚠ Safety / danger surfaces specific to this app:**
- **Chat is the doorbell, MC is the door** — it renders ReviewChip and **deep-links** to MC's canonical ReviewQueue; it **hosts no queue, clears no gate, actuates no stop**. No "clear review"/"approve"/"delete" control exists on any screen — the absence is rendered as a deep-link-out (destructive-absence rule).
- **Chat is not in the kill chain** — HaltBand renders **read-only with no actuator**; the only stop-trigger it exposes is a deep-link to MC/auth. `Shift+Esc` focuses the header halt affordance which **deep-links** rather than actuating (with the documented non-browser-captured fallback chord).
- **"Target wins" is printed on every deep link** — a notification is a deliberately-stale snapshot; when the snapshot and the live target disagree, the target is authoritative, and Pattern-D never contradicts that caption.
- **Gold is reserved for HaltBand only** — never appears on an escalation, a priority band, an active broadcast, or a Toast. Escalations/broadcasts live in the `--signal`/`--attn` families.
- **FenceState is advisory-only** (greyed + `advisory` micro-tag) — display-of-truth, never a gate.
- **Body sanitization** — remote images/raw HTML stripped to dead text, body links non-clickable; the only live link is the template-derived MC deep-link (anti-phishing).
- **All confirms are light-tier** — Chat has no toward-more/irreversible action anywhere; no typed-intent or step-up ceremony exists in this app.
- **Honest-degraded triad** — SSE stall, push `gave_up`, stale backup all render Pattern-D gold or amber `▲ STALE`, never a red error and never a frozen-green tile.

**⚑ Gaps flagged:** None new — the spec is complete for design. One inherited PENDING to render honestly (already specified, not a gap): the **MC resolve-seam `mc:read` grant is pre-freeze** (contract §3) — until granted, the resolve-feed health row shows amber `▲ awaiting mc:read grant` and deep-links fall back to MC home with a "review queue" caption; the row still renders, degraded never wrong.

---

### ⬢ INJECTION BLOCK — Gateway (The Hands · host execution)

**Purpose (one line):** The only component in the suite that runs commands on real hosts — this is the operator's read-first control room for watching every host execution, proving its segregation-of-duties, walking its immutable audit chain, and confirming the kill switch physically bit.

**Who uses it:** Both surfaces exist, but they are strictly split. The **agent surface is MCP-only, no UI** (`execute_approved_plan(ticket, host)` — the dispatcher is never an operator button). The **human surface is operator-only** and almost entirely **read**: the only two write paths a human has are (a) catalog change-control and (b) orphan re-redemption, both heavily gated. Everything else is monitor / inspect / verify.

**Archetype:** **Instrument** (dark control-room), dark-only, `compact` density (28–32px rows) — every screen. No Workshop pane, no `--paper-*` surface anywhere; the one place text streams (task stdout/stderr) is machine output in a mono console, not prose.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** (§6.1) — 224/56px dark side rail + global header + suite switcher carrying the one shared suite-posture line; rail nav: Monitor · Audit · Kill-switch · Catalog · Sandbox · Orphans. Header identity line: `gateway · the hands — the only component that executes on hosts`. Header right = read-only halt mirror + a `[ Halt console → ]` **deep-link to MC** (no engage button in this app).
- **TicketRef** (§4.1) — opaque mono ID chip on `--sub-750`, `--ink-700`, copy-on-click, middle-truncate, never wrapped. Kind-glyph variants used heavily here: run `R-…`, ticket `T-…`, host `host_id`, approval `approval_id`, decision `decision_id`, release/lease `lse-…`. Kind is a label, never a color.
- **PrincipalRef** (§4.2) — kind-glyphed mono `sub`: `⬡` agent / `◐` operator / `⚙` service (`⚙ svc:gateway`, `⬡ agent:patcher-07`).
- **TierBadge** (§4.3) — provenance badge. Load-bearing here as a **duality**: host-originated Wazuh/ticket text = **striped-amber `⚠ UNTRUSTED`** (adversarial input); sandbox/gateway-delivered evidence = **Verified `✔` green `#46B98A`** (an external verifier confirmed it). Taint is display-only, never editable.
- **FenceState** (§4.4) — the per-host mutex render: healthy `🔒 gen 47 · lease 04:12 · ♥ 0.8s` (neutral `--ink-700`, never green); stale `▲` amber near expiry; zombie `⚠ gen 46 SUPERSEDED by gen 47` (amber) = lost mutex.
- **StatePill** (§4.5) — one glyph+label pill per lifecycle state, never color-only: `⧗ EXECUTING`, `✔ VERIFYING`, `▮▮ FROZEN G1`, `✕ FAILED`, `● IDLE`, `⇉ DRAINING`.
- **HaltBand** (§4.6) — full-width **HALT-GOLD `#F2842B`** band under the header, sticky when level > G0. Interlock `▮▮` (ENGAGED) / shield `⛊` (SAFE-STOPPED), never `✕`, never red. **Read-only in this app** — the trigger is not here. G2 uses the intensified doubled-glyph `▮▮▮▮` + full edge striping variant (non-hue cue, still gold).
- **HonestState** (§4.8) — `✔ confirmed · ◐ pending · ⇉ draining` triad, all three slots always shown even at zero. Copy discipline: never "all runs stopped" while pending/draining > 0.
- **Freshness** (§4.9) — `⟳` age + source stamp on every live/mirrored figure; stale → amber `▲ STALE → treating as safe-stopped`; **never a false green**. This is the app whose whole job is to never lie about whether it acted.
- **DangerAction + ConfirmFriction** (§4.7 / §5.1) — destructive = **danger-red `#E5594E`** behind typed-intent + step-up (auth live re-auth) confirm, diff-hash-bound for policy-plane writes. Cancel is default focus / `Esc` target.
- **ReviewChip** (§4.10) — `◈ NEEDS REVIEW` / `⚑ ESCALATED · <reason>` pill deep-linking **out** to MC `/review/<ticket_id>` (this app never hosts a clear-review control).
- **DataTable** (§6.2), **Modal** (§6.4), **Toast** (§6.5), **Field** (§6.3) — standard chrome; Toast matches the action verb ("Promoted"), never gold.
- **AuditInspector** (§7.2) — the audit surface (S3) is this shared family, consumed not forked, with chain-verify that never false-greens.

Note: the Gateway hosts **no `HoldToActuate` actuator** (it holds no kill trigger). `Shift+Esc` focuses the header's deep-link to MC's actuator, not a local button.

**□ Screens & views to build:**

**S1 — Live Execution Monitor** *(the landing screen)*
Per-host card grid: "what is running on which host, right now, and is every run inside its four-check envelope." Live via SSE.
```
┌─ LIVE EXECUTION ─────────────────── ⟳ fresh 480ms · 24 hosts ─┐
│ filter:[/host,ticket,agent…]  state:[active▾]  class:[all▾]   │
│ ┌───────────────────────────┐ ┌───────────────────────────┐   │
│ │ host-db-01     ⧗ EXECUTING│ │ host-web-03    ✔ VERIFYING│   │
│ │ [R-01HX…][T-000482]       │ │ [R-01HY…][T-000501]       │   │
│ │ ⬡ agent:patcher-07        │ │ ⬡ agent:patcher-02        │   │
│ │ class: kernel_update ⚠dstr│ │ class: package_update     │   │
│ │ 🔒 gen47·lease04:12·♥0.8s │ │ 🔒 gen51·lease02:03·♥1.1s │   │
│ │ SoD ✔✔✔✔ appr·pol·cred·mtx│ │ SoD ✔✔✔✔                  │   │
│ │ ▏task 6/9 apt-get dist-up…│ │ Wazuh poll: 2/5 pairs gone│   │
│ │ [ open run → ]            │ │ [ open run → ]            │   │
│ └───────────────────────────┘ └───────────────────────────┘   │
│ ┌ host-nas-01  ▮▮ FROZEN G1 ┐ ┌ host-mail-02      ● IDLE  ┐   │
│ │ run halted at task boundary│ │ no active run · last done │   │
│ └───────────────────────────┘ └───────────────────────────┘   │
└───────────────────────────────────────────────────────────────┘
```
Each card = a *layout* of shared components (host/run/ticket `TicketRef` + executor `PrincipalRef` + run `StatePill` + `FenceState` + the `SoDChainStrip` collapsed to four ticks + class chip with destructive-warning `TierBadge` where `action_class ∈ {destructive,kernel_update,reboot}` + one-line current-task readout). Host-originated Wazuh posture text on a card carries `⚠ UNTRUSTED`. **Primary action:** open run → S2. There is **no start-a-run control** (agent-only, fully gated path).
*States:* **Loaded** = card grid, each figure Freshness-stamped. **Loading** = static card skeletons in grid shape (a single labelled `starting run…` spinner permitted inside one card for a genuine start-job). **Empty** (invitation) = "No hosts are executing. Runs appear here when an executor agent calls `execute_approved_plan` and clears the four-check chain. The Gateway starts nothing on its own." **Pattern-R** (red `✕`) = local runs-API read failure, "couldn't load the run list — retry." **Pattern-D** (gold `⛊`) = a dependency down (Board/CMDB/Vault/auth/its Postgres) → SAFE-STOPPED HaltBand: "STILL TRUE: no new dispatch, existing runs finish at task boundary, all gates fail closed"; unconfirmable cards show `⚠ CANNOT CONFIRM` in gold, never a green idle. **Stop-engaged** = HaltBand pins; active cards flip to `▮▮ FROZEN G1`; a card mid-`dpkg` shows `⇉ DRAINING` (boundary not yet reached), never a false "stopped."

**S2 — Run Detail + SoD Proof** *(the single most important screen)*
Reconstruct one run's segregation-of-duties proof **from the chain alone**, and tail its console. Layout: run header (run `TicketRef` + `StatePill` + host + Freshness; ticket, executor, class, `op_id`), then the **SoDChainStrip** (see §app-specific), then the **RunConsole** streaming pane, then a health-check / rollback-path footer line.
```
┌─ RUN [R-01HX9Q…] ⧗ EXECUTING ── host [host-db-01] · ⟳0.4s ─┐
│ [T-000482] ⬡ agent:patcher-07  class kernel_update ⚠  op_id…│
│ ┌ SEGREGATION-OF-DUTIES CHAIN (reconstructed from audit) ─┐ │
│ │ ✔ 0 CALLER  token aud=gateway·cnf DPoP✔·introspect·ep4471│ │
│ │ ✔ 1 BOARD   consume_approval [apr-…]→executing           │ │
│ │             plan_hash sha256:9f… ✔ matches·allowlist 3/3 │ │
│ │ ✔ 2 CMDB    verdict permit [dec-…]·policy a1b2·window✔   │ │
│ │ ✔ 3 VAULT   cred cred://hosts/host-db-01/root·lse-…⧗     │ │
│ │             SSH-CA TTL 11m · plaintext: never here       │ │
│ │ ✔ 4 MUTEX   🔒 gen47·pg advisory lock·fence>46 ✔         │ │
│ │ ─────────────────────────────────────────────────────── │ │
│ │ 🔒 SoD is enforced in Gateway code, not here. This screen│ │
│ │    displays evidence; no control can skip/relax a check. │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌ CONSOLE (RunConsole — audit-store SSE) task 6/9·⟳0.4s ──┐ │
│ │ TASK [patch_debian: apt-get dist-upgrade] changed        │ │
│ │ ▏(streaming — Last-Event-ID 00461)                       │ │
│ └──────────────────────────────────────────────────────────┘ │
│ health-check: pending · rollback path: snapshot (available)  │
└──────────────────────────────────────────────────────────────┘
```
*States:* **Loaded (executing)** = as drawn, console streams. **Loaded (terminal)** = `verifying` (Wazuh poll panel), `needs_review` (→ ReviewChip), or `failed(reason)` with the verbatim machine reason (`halted`/`rolled_back`/`unrecoverable`/`host_unreachable`/`orphaned`/`window_closed`/`credential_denied`/`PLAN_HASH_MISMATCH`) and a red `✕ FAILED` pill — **a killed run always renders `failed(halted)`, never `cancelled`**. **Loaded (rejected preflight)** = a run that never dispatched — the strip shows the **first failing check in red `✕`** with reason (`NO_APPROVED_TICKET`/`STALE_FENCE`/`FLOOR_VIOLATION`/`WINDOW_MUST_FIT`/`ALLOWLIST_MISMATCH`/`UNKNOWN_PLAYBOOK`) and every downstream check greyed `— not reached`; rejections are first-class hostile-model telemetry. **Loading** = chain + console skeletons. **Empty** = N/A (bad `run_id` → Pattern-R "no such run" + Audit link). **Pattern-R** = local run-fetch fail → red retry. **Pattern-D** = the audit store (SSE source) unreachable → RunConsole degrades to STALE + gold `⚠ CANNOT CONFIRM live output — treating as safe-stopped`, never a frozen-green console; a Board/CMDB/Vault check unconfirmable mid-render shows gold `⚠ CANNOT CONFIRM`, not a green `✔`. **Stop-engaged** = HaltBand pins; console shows honest `⇉ DRAINING` → `▮▮ cancelled at boundary → failed(halted)`. **Stream lifecycle:** on token `exp`/revocation the console ends "session ended — re-authenticate"; too-old `Last-Event-ID` → `event: reset` → REST re-sync then resume at tip.

**S3 — Audit Trail** *(consumes `AuditInspector §7.2`)*
Walk the append-only, hash-chained, Ed25519-signed per-command forensic log; verify the chain; show anchor status vs MC.
```
┌─ AUDIT CHAIN ─── chain_id gw-main · 41,802 records · ⟳1.2s ──┐
│ [ Verify chain from seq… ]  filter:[run,host,type,sub…]      │
│ ┌ CHAIN-VERIFY ────────────────────────────────────────────┐│
│ │ ✔ VERIFIED seq 41500→41802 · 302 records · Ed25519 · 1.9s ││
│ └──────────────────────────────────────────────────────────┘│
│ ┌ MC ANCHOR STATUS ────────────────────────────────────────┐│
│ │ HEAD pushed 41800 · MC ack'd 41800 · ⟳4s  ✔ IN SYNC       ││
│ └──────────────────────────────────────────────────────────┘│
│ seq   time        who              action      target  outcome│
│ 41802 12:04:11 ⬡ agent:patcher-07 dispatch    [R-01HX] ⧗ exec │
│ 41801 12:04:10 ⚙ svc:gateway      cred_redeem  cred://  ✔ ok  │
│ 41799 12:03:57 ⬡ agent:patcher-11 dispatch    [host-x] ✕ STALE_FENCE│
└──────────────────────────────────────────────────────────────┘
```
`DataTable` of append-only rows (mono tabular `seq`+timestamp · `PrincipalRef` · action verb · `TicketRef`/handle target · outcome `StatePill`); rejection rows are first-class. **Read-only always** — no row edits (corrections are new rows). *States:* **Chain-verify success** = `✔ VERIFIED` green **only** on a completed successful walk. **Chain-verify CANNOT CONFIRM** = verify couldn't complete (store slow, key unavailable) → **halt-gold `⚠ CANNOT CONFIRM CHAIN`**, never green. **Chain-verify BROKEN** = an actual detected hash/sig break → **danger-red `✕ CHAIN BROKEN at seq N`**, the forensic alarm, links the offending record. **Anchor status** = `✔ IN SYNC` / gold `⚠ RESYNC-PENDING` (MC behind — alarms, does not halt) / red-alarmed permanent HOLE (HEADs fell past retention before MC received them). **Loading** = table + two status-panel skeletons. **Empty** = genesis-only invitation. **Pattern-R** = local query fail → red retry (distinct from CHAIN BROKEN, a content alarm). **Pattern-D** = Postgres audit store unreachable → HaltBand SAFE-STOPPED (audit-write failure halts dispatch); verify/anchor show gold CANNOT-CONFIRM. **Stop-engaged** = kill/halt events are themselves audit rows in-stream; HaltBand pins.

**S4 — Kill-switch Status** *(read-mirror + the L2-CONFIRMED source)*
The Gateway **is** the L2 physical stop and its own confirmation is the sole legitimate L2-CONFIRMED source read directly by auth. This screen renders that truth read-only. **The trigger button is NOT here** — it deep-links out.
```
┌─ KILL-SWITCH · L2 PHYSICAL STOP ─────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ ┃ ▮▮ KILL-SWITCH ENGAGED · G1 FREEZE-DESTRUCTIVE  epoch 4471 ┃│
│ ┃ Gateway refuses all new dispatch + new Vault redemptions.  ┃│
│ ┃ In-flight runs cancel at next safe task boundary.          ┃│
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │
│ L2 CONFIRMATION (this Gateway — auth reads directly)         │
│  epoch_seen 4471 · level G1 · in_flight 1 · refuse 12:04:09  │
│  signed halt-status ✔ · ⟳ own truth, not a mirror           │
│ AUTH L1 EPOCH (mirror)  epoch 4471 ✔0.3s · in sync          │
│ HALTED-RUN AFTERMATH (HonestState)                           │
│ ┌ ✔ 2 CONFIRMED ┬ ◐ 0 PENDING ┬ ⇉ 1 DRAINING ┐              │
│ │ failed(halted)│             │ mid-task, past │              │
│ └───────────────┴─────────────┴────────────────┘              │
│  draining → [R-01HZ…] host-nas-01 · dpkg · will finish+log   │
│  [ Halt console (MC) → ]  [ auth safe_stopped console → ]    │
└──────────────────────────────────────────────────────────────┘
```
`HaltBand` member (a) ENGAGED (G2 = intensified doubled-glyph); `HonestState` triad for halted-run aftermath, **all three slots always shown, copy-discipline enforced**; `Freshness` on the auth-epoch mirror; the two footer links are **deep-links** — `DangerAction` is **absent by construction** (a printed fact, not a greyed control). *States:* **G0 normal** = no HaltBand, L2 panel `level G0 · 0 refusals`, triad reads `✔0 · ◐0 · ⇉0` as a positive statement of confirmed silence. **G1 engaged** = as drawn. **G2 quiesce-all** = intensified band. **Loading** = band + panel skeletons. **Pattern-R** = local failure reading the *aftermath list* only → red retry on that panel; the L2 figure is the Gateway's own and stays authoritative. **Pattern-D (auth mirror stale)** = gold `▲ STALE → treating as safe-stopped`, never green "in sync" (L2 stays authoritative as local truth). **Pattern-D (Gateway can't confirm its own halt liveness)** = HaltBand SAFE-STOPPED "cannot confirm freshness — treating as safe-stopped." **Stop-engaged** = this screen *is* the stop detail.

**S5 — Catalog Registry** *(the ONE operator write path)*
Review the Gateway-owned playbook registry (versions, `content_sha256`, Ed25519 sigs, class, rollback capability) and perform operator-vetted change-control.
```
┌─ PLAYBOOK CATALOG ── 6 active · 1 pending change ────────────┐
│ key            ver content_sha256 class          rollback st sig│
│ patch_debian   v4  9f3a…b1        package_update snapshot ✔ ed│
│ reboot_host    v2  a180…44        reboot         none     ✔ ed│
│ sbx_pytest     v2  4400…aa        sandbox_exec   n/a      ✔ ed│
│ ── pending operator-vetted change ─────────────────────────── │
│ patch_debian   v5▲ ee02…7d        package_update snapshot PENDING⧗│
│                              [ Review & apply change → ](step-up)│
└──────────────────────────────────────────────────────────────┘
```
The write routes through the **full `ConfirmFriction`** dialog — typed-intent + step-up + red primary, **diff-hash-bound** (you confirm the exact `sha256` diff shown), with a **blast-radius line** ("12 hosts have patch_debian in an open allowlist"), states the **direction** ("MORE real-world action"), and writes a tamper-evident audit row (visible next in S3). On success emits a `Toast` matching the verb ("Promoted"). Printed on-screen: `🔒 Agents cannot write the catalog by any path — this is an operator-only, step-up gate.` *States:* **Loaded** = active entries + pending change (`⧗ PENDING` pill). **Loading** = table skeleton. **Empty** = bootstrap invitation. **Pattern-R** = the *promote* failed to apply (validation, sig mismatch, stale diff-hash) → red `✕` inline in the dialog with what to fix. **Pattern-D** = catalog store unreachable → gold SAFE-STOPPED; the write path is **disabled-by-absence** (printed `🔒 change control unavailable while the catalog store is safe-stopped`, not a greyed button). **Stop-engaged** = HaltBand pins; catalog **reads** continue; a catalog **write** during a kill is still permitted via the same step-up (catalog change is not host execution) but the confirm block echoes live halt honest-state.

**S6 — Sandbox Runs** *(tier-0 evidence browser)*
Browse tier-0 sandbox evidence — sandbox evidence = external verification for the Library's admission gate. Read-only; **no host parameter exists anywhere in this surface** (the D-7 non-leak guarantee is visible here).
```
┌─ SANDBOX RUNS (tier-0) ─── harness hv-4c1a…9d20 ─────────────┐
│ run       ticket     profile    exit harness   finished       │
│ [R-01HS…][T-000733] sbx_pytest ✔0  hv-4c1a… 11:58 [view→]    │
│ [R-01HR…][T-000730] sbx_lint   ✕2  hv-4c1a… 11:41 [view→]    │
│ ┌ EVIDENCE [R-01HS…] ──────────────────────────────────────┐ │
│ │ [T-000733] sbx_pytest exit ✔0                             │ │
│ │ env: image sha256:… · py3.12 · pytest8.2                  │ │
│ │ input_ref  note nt-…@rev14  [ UNTRUSTED ⚠ curation-ingest]│ │
│ │ evidence:  [ ✔ sandbox-verified · gateway-delivered ]     │ │
│ │ ┌ transcript ─────────────────────────────────────────┐  │ │
│ │ │ ===== 12 passed in 3.41s =====                       │  │ │
│ │ └──────────────────────────────────────────────────────┘  │ │
│ │ target: fresh podman container · no suite networks · no creds│ │
│ └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```
The evidence detail is the `SandboxEvidenceView` (see §app-specific), whose signature is the **provenance duality**: the *input* (`input_ref`) is `⚠ UNTRUSTED` striped-amber, the *evidence itself* is `✔` Verified green. *States:* **Loaded** = list + selected evidence. **Loading** = list + evidence skeleton. **Empty** = "No sandbox runs yet. Curation-team agents call `run_sandbox_test`; each run's transcript and environment fingerprint land here as external-verification evidence for the Library." **Pattern-R** = local evidence-fetch fail → red retry. **Pattern-D** = sandbox execution disabled (CMDB `disposable` class set to deny — the operator's sandbox kill knob) → gold "sandbox execution disabled by policy (kill knob)" `⛊`, **not** a red error; existing evidence stays browsable. **Stop-engaged** = at kill ≥ G1 sandbox dispatch refused (same chokepoint) → new runs `▮▮ FROZEN`; historical evidence stays readable; HaltBand pins.

**S7 — Orphan Reconciliation** *(Gateway-local operational queue — NOT the canonical ReviewQueue)*
After a Gateway crash mid-run, the Board hold persists deliberately (the host may have been touched). This queue surfaces those orphans and the operator-gated re-redemption.
```
┌─ ORPHAN RECONCILIATION ── 1 orphan · 0 auto-resolvable ──────┐
│ run       host        state@crash Board hold probe   action  │
│ [R-01HP…][host-fs-04] executing   gen 39     ⚠needed ▼       │
│  ┌ [T-000701] ⬡ agent:patcher-05 crashed 11:12 task 4/7 ──┐ │
│  │ Board hold: 🔒 gen 39 · NOT reaper-eligible (orphan)   │ │
│  │ read-only probe: reachable ✔ · reboot marker present ⚠ │ │
│  │ old lease lse-… EXPIRED → re-redemption (operator-gated)│ │
│  │ ⚑ ESCALATED · orphaned → mc/review/T-000701 → chat     │ │
│  │       [ Request fresh credential + probe → ](step-up)  │ │
│  │       NEVER auto-resumes a half-run — truthful terminal│ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```
`DataTable`; `FenceState` for the persisted Board hold generation; `ReviewChip` with machine reason `orphaned` deep-linking MC + Chat; the one action (re-redemption — a fresh minimal-TTL `release_id` for a **read-only probe**) is full `ConfirmFriction` step-up (it moves toward touching a host again). Printed `🔒` fact: the Gateway never auto-resumes. *States:* **Loaded** = orphan rows with probe status + escalation chips. **Empty (the healthy default, reassuring invitation)** = "No orphaned runs. If the Gateway ever dies mid-run, the half-run appears here for truthful reconciliation — it is never silently resumed." **Loading** = table skeleton. **Pattern-R** = re-redemption request failed locally (Board/Vault said no) → red inline with reason, retryable. **Pattern-D** = Board/Vault down → probe/re-redemption safe-stopped gold; orphans still *listed* from local `runs` (fail-closed: cannot resolve, can enumerate); Board-hold cross-check shows `⚠ CANNOT CONFIRM hold`, never green "resolved." **Stop-engaged** = at kill, re-redemption refused (no new Vault redemptions ≥ G1); orphans remain listed; the action shows `▮▮ FROZEN`.

**◈ App-specific components (only where justified):**
- **`SoDChainStrip`** (S1 collapsed, S2 full) — the four-check (+Check-0 caller) segregation-of-duties evidence render: `0 CALLER → 1 BOARD approval → 2 CMDB policy → 3 VAULT credential → 4 MUTEX`, each row a verdict `StatePill` + its evidence-artifact `TicketRef` variant (`approval_id`/`decision_id`/`release`/`lease`) + `FenceState` on check 4. It **composes** shared components and re-draws none; only the four-slot chain layout and the printed §4.7 destructive-absence caption are new. *Why not shared:* no other app has a four-holder execution chain to reconstruct — it is the literal visual proof that "no single component reaches a destructive action." On a rejected preflight it renders the first failing check red `✕` + reason and greys downstream checks `— not reached`.
- **`RunConsole`** (S2) — the streaming ansible task-event stdout/stderr tail: mono, task-indexed (`task 6/9`), `Last-Event-ID`-cursored, over the `LiveStream §5.5` transport (freshness-tagged, degrades to STALE, terminates on `exp`/revocation). *Why not shared:* a live machine-output terminal is neither a `DataTable` nor prose; a generic table cannot represent interleaved streaming task output.
- **`SandboxEvidenceView`** (S6) — the tier-0 evidence detail: transcript blob + `env_fingerprint` (image sha256, runtime versions) + `harness_version` attestation + the input-vs-evidence provenance duality. *Why not shared:* §7.2 explicitly allows an "evidence ledger" as domain-unique; it consumes `TierBadge`/`TicketRef` but the transcript/fingerprint/attestation layout is Gateway-specific.

*Explicitly NOT app-specific (do not re-draw):* the audit trail (S3) is `AuditInspector §7.2`; the kill status (S4) is `HaltBand §4.6` + `HonestState §4.8`; the catalog write (S5) is `ConfirmFriction §5.1`; a per-host card is a *layout* of shared components, not a new component.

**⚠ Safety / danger surfaces specific to this app:**
- **The four-check SoD proof strip** is the app's reason for existing — render it as *evidence being displayed, not controls being offered*. Every check row is read-only; there is **no toggle, no skip, no re-order** anywhere. The destructive-absence caption is printed verbatim as a `🔒` constitutional fact: `SoD is enforced in Gateway code, not here. No control on this page can skip, relax, or re-order a check.` — never a greyed control, never a `⛔`.
- **False-green prohibition is load-bearing here above all apps.** Chain-verify, anchor status, halt-status, host-health, and every mirror render the honest unknown in **halt-gold `#F2842B`** (`⚠ CANNOT CONFIRM`) rather than a fabricated green. This is the app whose whole job is to never lie about whether it acted or stopped. Only a *completed successful* chain walk is green; a *detected break* is danger-red `✕ CHAIN BROKEN`; everything in between is gold.
- **The kill switch (S4):** the Gateway is the L2 physical-stop *source* auth reads directly — but **the trigger is not here**. Render the read-only ENGAGED HaltBand + the L2-confirmation panel (local authoritative truth, survives auth-mirror staleness) + the honest halted-run triad, and deep-link the actuator to MC/auth. A killed run always reads `failed(halted)`, never `cancelled`; in-flight runs cancel only at the next safe task boundary (never mid-`dpkg`) — shown honestly as `⇉ DRAINING` → `▮▮ cancelled at boundary`.
- **Catalog change-control (S5)** and **orphan re-redemption (S7)** are the only two human writes — both full `ConfirmFriction` (typed-intent + step-up + red primary), the catalog additionally **diff-hash-bound** with a blast-radius preview (policy-plane change control, ARCH §12). Both write tamper-evident audit rows.
- **Provenance/quarantine:** host-originated Wazuh/ticket text is `⚠ UNTRUSTED` striped-amber wherever it appears on a card or run; the sandbox surface renders the input-is-untrusted / evidence-is-verified duality explicitly. Taint is display-only — no control clears it.
- **Destructive-ABSENCE printed as facts, not greyed toggles:** `Agents cannot write the catalog by any path`; `SoD cannot be relaxed here`; `The Gateway never auto-resumes a half-run`; `No kill trigger lives here`; `change control unavailable while the catalog store is safe-stopped` — all rendered with `🔒/⛊` and no interactive affordance.

**⚑ Gaps flagged:** None — the spec is complete for design. It cites every shared component by ID, declares Instrument-only/dark-only, justifies its three app-specific components, and enumerates all six states per screen. No colors outside the frozen token set are required (all safety cues use `--halt-500 #F2842B`, `--danger-500 #E5594E`, `--ok-500 #46B98A`, `--attn` striped, `--signal-500 #29B6D8`).

---

### ⬢ INJECTION BLOCK — Vault (Secrets Custody & Gateway-Only Redemption)

**Purpose (one line):** The operator's console for the suite's secrets store — create/rotate credentials, onboard hosts for SSH-CA signing, and read the immutable redemption ledger, on a console that can create and destroy authority but can *never* read a secret back.
**Who uses it:** Operator-only. The Vault is the suite's deliberate two-view *exception* — the agent (MCP) surface is near-empty by construction, so this human console **is** the rich half. Gated entirely by `vault:manage` (human-kind-only; no machine principal ever reaches this UI). The Gateway-only `POST /redeem` seam lives off both surfaces on the `creds` mTLS network — it appears here only as *audit* (what was redeemed) and *status* (can redemption safely happen), never as a button.
**Archetype:** Instrument (dark control-room), **dark-only, every screen, density `compact` (28–32px rows)**. No Workshop pane, no `--paper-*`, no Source Serif 4 — this app renders no long-form prose.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark side-rail (224px open / 56px collapsed) + global header + suite switcher; header identity line reads *"Vault — secrets custody & Gateway-only redemption."* Right zone carries the operator **PrincipalRef** + a `🔑 fresh` / `🔑 stale` step-up cue (many actions need fresh step-up). Six rail items: `⛨ Secrets · ⊞ Hosts · ▤ Audit · ⇥ Releases · ◉ Status/DR · ⚖ Change Control`.
- **HaltBand** — full-width GOLD `--halt-500 #F2842B` safe-stop band under the header. **Read-only here** — the Vault hosts NO kill actuator and NEVER draws a STOP button; level is mirrored from auth. Interlock `▮▮` = kill engaged; shield `⛊` = SYSTEM SAFE-STOPPED (dependency down). Gold, never red.
- **DataTable** — dense zebra (`--sub-750` stripe), sticky header, mono ID column with copy-on-click. The truth-surface of every screen (handles, hosts, ledger, releases).
- **TicketRef** — mono opaque ID chip, `--ink-700` on `--sub-750`, copy-on-click, middle-truncate. Used for `host_id`, `release_id` (`rel-`+ULID), `ticket_id` (`T-…`), `approval_id` (`A-…`), `run_id` (`R-…`). Kind is a label glyph, never a color.
- **PrincipalRef** — kind-glyphed mono `sub`: `⬡` agent / `◐` operator / `⚙` service. In the Vault, `⚙ svc:gateway` is the *only* legitimate redeemer; any `⬡ agent:*` or "no cert" in the audit is anomalous by definition.
- **StatePill** — one glyph+label pill per lifecycle state, never color-only: `◐ pending · ✔ redeemed · ⛒ revoked` (releases); host `◼ NEW · ◐ STAGED · ● READY`; outcome `✔ CONFIRMED · ✕`.
- **TierBadge** — provenance badge on audit rows carrying trust info: `✔ verified` green `--ok-500 #46B98A` for `gateway-delivered` evidence; `⧉ cross-referenced` cyan; `◑ single-source` amber; striped-amber `⚠ UNTRUSTED` for host-originated facts.
- **DangerAction + ConfirmFriction** — destructive affordances are red `--danger-500 #E5594E` behind friction. **Full variant** (typed-intent + auth Tier-2 live step-up + diff-hash-bound token + tamper-evident audit row) for rotate, sign-role apply, and every gate-weakening change. **Light variant** (single confirm, signal-cyan `#29B6D8` primary, no typed intent) for release-revoke because it moves *toward less* action.
- **The destructive-*absence* rule (§4.7)** — the app's signature: where a "reveal/export/show-plaintext" affordance would sit, print an **affirmative constitutional-absence fact** with a lock/shield glyph `🔒 / ⛊` and **NO interactive element**. Never a greyed-out "Reveal" toggle (a disabled control implies a latent capability — there is none). The `⛔` glyph never appears here (it's reserved for *actionable* deny).
- **HonestState** — the `confirmed · pending · draining` triad, all three slots always shown even at zero. Renders the true aftermath of a release-revoke fan-out.
- **Freshness** — `⟳` age stamp + source on every live figure (poll-refreshed; **no SSE**). Stale → amber `▲ STALE`, never a false green. Enforces the false-green prohibition absolutely on this app.
- **AuditInspector** (cross-app pattern §7.2) — the Access Audit screen *is* this component: append-only DataTable rows + chain-verify affordance that never false-greens. Consumed, not forked.
- **Field / Modal / Toast** — standard inputs, the one elevated confirm surface, and verb-matched success toasts (`--ok`, never gold).

**◇ Deliberately NOT used (flagged so nothing gets forked):** No **ReviewChip / ReviewQueue** — the Vault hosts no `needs_review` gate and deep-links to nothing (redemption is the Gateway-only SoD seam; there is nothing here to approve). No **LiveAgentView**. No **HoldToActuate** / kill trigger.

**⬡ Screens & views to build:**

**1. Secrets Manager `⛨` — the write-only surface (spend the app's boldness here).**
Layout: screen-top **constitutional-absence band** (shield/lock, no control), then a metadata-only DataTable, then a detail pane.
```
Secrets Manager                                    [ + New KV secret ]  [ Import ]
──────────────────────────────────────────────────────────────────────────────────
 ⛊ WRITE-ONLY BY CONSTRUCTION — this surface can create and rotate secrets; it
    cannot read one back. There is no reveal, export, or show-plaintext path here.
    Break-glass read is an offline 3-of-5 quorum ceremony, never a web action.  🔒
──────────────────────────────────────────────────────────────────────────────────
 HANDLE (mono, copy)                    HOST     KIND   ROTATION      LAST WRITE
 cred://hosts/nas-01/admin-login        nas-01   kv     90d ▲ due 3d  2026-06-30
 cred://hosts/sw-core/enable            sw-core  kv     manual        2026-05-11
 cred://hosts/nas-01/root               nas-01   ssh-ca (CA-signed)   —  (no KV)   ▸
──────────────────────────────────────────────────────────────────────────────────
 DETAIL (nas-01/admin-login)   host_id nas-01 · requires_approval_class: root
   Rotation: every 90d · post-redemption-rotate: on · recovery: provider-console
   Versions (metadata): v7 2026-06-30 · v6 2026-03-31 …  [ no value shown, ever ]
   [ Rotate now ]  (DangerAction → ConfirmFriction full)
```
- **The table has NO value column and no row ever expands to plaintext.** This is the whole point — render the absence, not a locked control.
- **Primary actions:** `+ New KV secret` / `Import` open the **SecretWriteForm** (app-specific, below) — the *only* place a secret value is ever typed (masked input, never echoed after submit). Submitting a write is a *plain* operator action → verb-matched Toast "Secret written" (`--ok`, **never gold**). `Rotate now` is a DangerAction (moves versions, irreversible for the prior value); the ConfirmFriction consequence block states the rotation-durability rule ("not complete until the new version is durably off-box") and shows the off-box snapshot ack.
- **States:** *loaded* (as above) · *loading* = DataTable skeleton rows (never a spinner) · *empty* = invitation "No secrets stored. Static credentials (NAS admin, switch enable, API keys) live here; the fleet's shell access is SSH-CA signed and needs no stored password. **[ + New KV secret ]**" · **Pattern R (red ✕)** = an operator's *write* failed (duplicate name/policy conflict, invalid `host_id`) — red inline on the form field, states what to fix · **Pattern D (gold ⛊)** = OpenBao engine sealed/unreachable — the list still renders (handle projection is a wrapper-DB read) but write/rotate go to the SAFE-STOPPED posture: "STILL TRUE: no plaintext exposed; existing certs valid to TTL. DO: writes queue/deny until the engine unseals — see Status/DR ▸." **Gold, not red** · *stop-engaged* (kill ≥ G1) = write/rotate confirm dialogs state new issuance is halted; metadata reads continue.

**2. Host Onboarding `⊞` — SSH sign-role stager + TrustedUserCAKeys.**
Layout: DataTable of onboarded hosts, then the **SignRoleStager** panel, then the CA-keys snippet block.
```
Host Onboarding                                            [ + Register host ]
──────────────────────────────────────────────────────────────────────────────
 HOST     SSH SIGN-ROLE       PRINCIPALS   NTP  CA-KEYS PROVISIONED   STATE
 nas-01   gateway-nas-01 ✔    root         ok   ✔ 2026-06-01          ● READY
 sw-core  gateway-sw-core ⧗   svc-deploy   ok   ▲ not yet             ◐ STAGED
 db-02    — (none)            —            —    —                     ◼ NEW
──────────────────────────────────────────────────────────────────────────────
 STAGE SIGN-ROLE (sw-core)   ← SignRoleStager
   allowed_users: [ svc-deploy ]   default_user: (empty — pinned)
   valid_principals (templated): svc-deploy   no wildcards · allow_empty=false
   ┌ Proposed role diff (hash sha256:9f2c…) ──────────────────────────────────┐
   │  + ssh/roles/gateway-sw-core  allowed_users=svc-deploy  valid_principals… │
   └───────────────────────────────────────────────────────────────────────── ┘
   [ Stage proposal ]      [ Apply (operator step-up) ]  ← DangerAction + full ConfirmFriction
──────────────────────────────────────────────────────────────────────────────
 TrustedUserCAKeys snippet (copy) — provision once per host before first redeem:
   @cert-authority *.fleet  ssh-ed25519 AAAA…CApub   key_id correlates to <ticket_id>
   Reminder: enforced/monitored NTP — clock skew silently extends cert validity
```
- **Interaction:** `Register host` (Field form, `host_id` validated against CMDB) creates the `◼ NEW` row (write-benign). `Stage proposal` writes a *powerless proposed* role record only — the wrapper has **no** `ssh/roles` write path — no step-up; row → `◐ STAGED`. **`Apply`** is the gate-defining act: DangerAction → **full ConfirmFriction** = typed-intent + auth Tier-2 live step-up + **diff-hash-bound** confirm token (operator confirms the exact `sha256:…` diff shown) + tamper-evident audit row; row → `✔ / ● READY`. A continuous invariant check alarms on any wildcard / `root` / `allow_empty_principals` and renders a **red validation block that PREVENTS staging** such a role.
- **States:** *empty* = "No hosts onboarded. Register a host from the CMDB inventory to stage its SSH sign-role. **[ + Register host ]**" · **Pattern R** = a stage/register rejected (invalid `host_id`, tripped the no-wildcard invariant) — red inline naming the violated invariant · **Pattern D** = CMDB unreachable (can't validate) or engine sealed (can't apply) — gold "STILL TRUE: existing sign-roles unchanged; staging is powerless anyway. DO: apply deferred until engine unseals / CMDB returns" · *stop-engaged* = Apply confirm states role changes are gate-weakening-class and halted under the active kill level.

**3. Access Audit `▤` — AuditInspector §7.2 (the redemption/denial ledger).**
Layout: **exfiltration-signal view pinned at top**, then chain-status strip, then the full append-only ledger.
```
Access Audit                    filter: host▾ ticket▾ sub▾ outcome▾   [ / search ]
──────────────────────────────────────────────────────────────────────────────────
 ⚑ EXFILTRATION SIGNAL — agent-shaped denials (pinned)      3 in last 24h  ▲
   ts (mono)         sub                  outcome                  ticket
   2026-07-03 09:14  ⬡ agent:recon-04     ✕ 403 not_gateway        T-000512   ▸
   2026-07-03 02:41  (no channel cert)    ✕ 403 not_gateway_channel —          ▸
   → each row: machine reason verbatim + both-sink write ✔✔ · escalation dispatched
──────────────────────────────────────────────────────────────────────────────────
 CHAIN STATUS  local HEAD seq 44,812 · row_hash 3af9… │ WORM HEAD 44,812 ✔ matched 0.6s
   [ Verify chain ]  → renders per §4.9 (never green if stale/failed)
──────────────────────────────────────────────────────────────────────────────────
 ts             sub (who)      action    target/ticket   outcome      sinks  prov
 07-03 09:20:11 ⚙ svc:gateway  redeem    T-000123·nas-01 ✔ CONFIRMED  ✔✔   ⧉ gw-deliv
 07-03 08:55:03 ⚙ svc:gateway  redeem    T-000120·db-02  ✕ approval_… ✔✔   —      ▸
```
- **Exfiltration pin:** any denial whose validated `sub` is agent-class, or any request without a Gateway channel cert, is a **first-class escalation** pinned at top with the **machine reason verbatim** (`not_gateway`, `not_gateway_channel`, `approval_not_consumed`; `--ink-600` mono, **never echoing request *content*)**. Each row shows whether the Chat escalation dispatched or fell back to the MC-polled violations feed.
- **Chain-verify (false-green prohibition):** `[ Verify chain ]` renders **`✔ CHAIN VERIFIED`** (green) only on a fresh successful verify; **`⚠ CANNOT CONFIRM CHAIN`** in **halt-gold** if stale or WORM HEAD unfetchable; **`✕ CHAIN BROKEN`** in **danger-red** for an actual detected break. A stale verify **never** renders green. Local HEAD vs WORM HEAD is shown continuously.
- **Read-only always** — no row editable; corrections are new rows; there is **no acknowledge/clear that mutates a row.**
- **States:** *empty* = "No redemptions yet. Every Gateway redemption and every denial will appear here, dual-sink and hash-chained" · **Pattern R** = a *filter/query* errored (malformed filter) — red inline on the filter control only · **Pattern D (gold)** = WORM sink or engine audit stream unreachable — ledger still renders local rows under a gold banner "SYSTEM SAFE-STOPPED · off-box audit sink unreachable — redemption is halting fail-closed. STILL TRUE: local chain intact; denials still recorded locally. Chain HEAD **CANNOT CONFIRM** against WORM" · **chain-broken** = the one place a **red ✕ CHAIN BROKEN** is correct (a real, detected, actionable integrity failure), with divergent seq/hash + escalation dispatched · *stop-engaged* = ledger read-only regardless; band shows kill posture; `403 revoked` denials appear inline.

**4. Releases `⇥` — live pending-release table + operator revoke.**
Layout: DataTable of releases (the powerless `rel-`+ULID shadows agents stage), bulk-select, revoke.
```
Releases                              filter: host▾ ticket▾ status▾   [ / search ]
──────────────────────────────────────────────────────────────────────────────────
 RELEASE (mono, copy)  HANDLE                     TICKET    REQUESTED BY    STATUS     EXPIRES
 rel-01HX9K…           cred://hosts/nas-01/root   T-000123  ⬡ agent:patcher ◐ pending  23:41:12
 rel-01HX8Z…           cred://hosts/db-02/admin   T-000120  ⬡ agent:recon-0 ✔ redeemed —
 rel-01HX7Q…           cred://hosts/sw-core/enable T-000118 ⬡ agent:patcher ⛒ revoked  —
                                    [ ☐ bulk-select ]     [ Revoke selected ]
```
- **Revoke** (single or bulk) is DangerAction → **light ConfirmFriction** (moves toward less action: single confirm, signal-cyan primary, no typed-intent) — **but** the consequence block carries the mandatory **honesty carve-out**: *"Revokes the PENDING release only. An SSH cert already signed for this ticket remains valid until its TTL / a KRL push — revoking here does not recall it."* It echoes the live **HonestState** triad (`confirmed · pending · draining`, all three slots always shown) of the revoke fan-out — the operator never reads a false "revoked everywhere" while a redemption is mid-flight. Rows auto-expire (`pending → expired`) lazily; poll-refreshed via Freshness (expiry countdown, tabular).
- **States:** *empty* = "No active releases. Agents stage a powerless `release_id` here after claiming a ticket; the Gateway redeems it under a consumed approval" · **Pattern R** = revoke failed (release already terminal) — red inline "already `redeemed`/`expired` — nothing to revoke" · **Pattern D (gold)** = wrapper store/engine unreachable — "STILL TRUE: releases are powerless without a live redemption; existing certs age out by TTL" · *stop-engaged* = revoke still permitted (toward-less-action is encouraged even under kill); band notes new redemptions already refused suite-wide.

**5. Status / DR `◉` — the crown-jewels readout (SealChainPanel).**
Layout: a grid of Freshness tiles — the signature false-green-discipline screen. **Read-only; no editable control** (DR *actions* route through Change Control or the offline quorum runbook).
```
Status / DR — Vault crown-jewels                          ⟳ polled · as-of 1.2s
──────────────────────────────────────────────────────────────────────────────────
 ┌ Engine seal ──────────┬ Unsealer ─────────────┬ Recovery quorum ──────────────┐
 │ ● UNSEALED            │ ● healthy             │ 3-of-5 shares · escrowed offline│
 │ source: engine as-of 1s│ seal-token TTL 21d ✔ │ last quorum-test 2026-06-15 ▲  │
 ├ Audit sinks ──────────┼ Kill level (from auth)┼ Backups ──────────────────────┤
 │ ✔✔ local + WORM current│ ⟳ G0 · fresh 0.4s    │ raft snapshot age 6h ✔         │
 │ engine-stream xcorr live│ (read-only mirror)  │ VAULT_SNAPSHOT_DEST reachable ✔ │
 └───────────────────────┴───────────────────────┴─────────────────────────────────┘
 CA & break-glass
   Suite-internal CA fingerprint  SHA256:1a2b…9f  · rotation runbook ▸
   SSH CA signing key: inside barrier, non-exportable ⛊   ← destructive-absence, printed fact
   Per-host break-glass last-verified:  nas-01 2026-06-20 ✔ · db-02 2026-04-02 ▲ overdue
```
- **The false-green discipline is the point of this screen:** **seal-unknown → GOLD, never green.** If the seal read is stale or the engine is unreachable, the Engine-seal tile renders **`⚠ CANNOT CONFIRM SEAL — engine unreachable (as-of <age>); treat as UNVERIFIED`** in halt-gold `#F2842B` — *never* a fabricated green "UNSEALED/OK." Audit-sink health is green only if **both** sinks are current (one down → gold + Pattern-D SAFE-STOPPED). Seal-token TTL is a tabular countdown; nearing expiry goes `--attn ▲`. Break-glass last-verified overdue → `--attn ▲`, never a silent green. The "SSH CA key non-exportable ⛊" is a printed destructive-absence fact.
- **States:** *loaded (healthy)* as above · *loading* = tile skeletons, `Freshness` shows `as-of —` · *empty* = N/A (there is always a seal chain to report) · *Pattern R* = N/A (a readout has no operator action to fail; a failed poll is Pattern-D) · **Pattern D (gold ⛊)** = **the dominant non-healthy state** — engine sealed/unreachable, a sink down, unsealer unreachable, or seal-token expired → the whole panel adopts halt-gold SAFE-STOPPED with "what's still true / what to do" + boot-runbook link · *stop-engaged* = kill mirrored in the Kill-level tile (gold) + shell HaltBand.

**6. Change Control `⚖` — every gate-weakening edit, behind full ConfirmFriction.**
Layout: pending-edits header + a rendered diff panel with the full ceremony inline.
```
Change Control                            pending edits: 0        [ + Propose edit ]
──────────────────────────────────────────────────────────────────────────────────
 PROPOSED EDIT — raise VAULT_SSH_CERT_TTL  10m → 30m
 ┌ Diff (hash sha256:c1a4…) ──────────────────────────────────────────────────────┐
 │  - ssh_cert_ttl: 10m                                                             │
 │  + ssh_cert_ttl: 30m   ⚠ GATE-WEAKENING — widens the window a signed cert valid  │
 └───────────────────────────────────────────────────────────────────────────────┘
 ⚠ CONSEQUENCE — moves the system TOWARD MORE real-world action: any cert signed
   after apply is valid 3× longer; a compromised cert's blast-window triples.
   Irreversible for certs already signed under the new TTL. Live kill level: G0.
 Type  raise-ssh-ttl  to confirm:  [▏         ]      Re-authenticate: 🔑 passkey (step-up)
       [ Cancel ]  (default focus)                    [ Apply edit ]  ← danger, disabled
                                                        until typed-intent matches AND 🔑 fresh
```
- The single place any gate-weakening edit happens (TTL raises, principal widening, audit-sink change, release-TTL raise, sign-role edits, CA rotation, config-as-code). Every edit is the **full ConfirmFriction**: diff rendered before confirm → typed-intent → auth Tier-2 live step-up → **diff-hash-bound** confirm token (a changed diff invalidates the token) → **tamper-evident audit row** visible in Access Audit. Cancel is default focus + `Esc`; the header halt is never occluded (`Shift+Esc` focuses it, never fires).
- **States:** *empty* = "No pending edits. Any gate-weakening change to TTLs, principals, sinks, or config lands here behind step-up" · **Pattern R** = apply rejected (stale diff-hash, step-up expired) — red inline "the diff changed or your step-up lapsed; re-open to re-confirm the current diff" · **Pattern D (gold)** = auth step-up service or engine unreachable — "apply deferred — cannot re-authenticate / engine sealed" · *stop-engaged* = gate-weakening apply refused; consequence block states the active kill level blocks it.

**◈ App-specific components (only three — each domain-unique, none a re-draw of a shared entity):**
- **SecretWriteForm** (Secrets Manager) — the write-only KV create/import surface. Built from **Field** (the masked `value` input — the only place a secret is ever typed, never echoed after submit — plus `host_id`, `name`, rotation policy, `recovery` tag `ssh-ca-resettable | provider-console | console-only`) + the **destructive-absence rule §4.7** (the printed `🔒` "no reveal path" panel) + DangerAction/ConfirmFriction for rotate. *Why unique:* a **write-only-by-construction** entry surface with deliberately **no read-back sibling** has no suite analog; only the write-only composition is new.
- **SignRoleStager** (Host Onboarding) — stages a *proposed* OpenBao SSH sign-role (`allowed_users`/`valid_principals` pinned, no wildcards, `allow_empty=false`) and emits the `TrustedUserCAKeys` snippet, for operator step-up apply. *Why unique:* an SSH-CA sign-role is a Vault-domain **gate-defining config artifact** with no suite analog; its `host_id` is TicketRef and its apply is DangerAction+ConfirmFriction (both shared) — only the role-staging form/diff is domain-specific.
- **SealChainPanel** (Status/DR) — the seal / unsealer / recovery-quorum / audit-sink-xcorr / backup / break-glass / CA crown-jewels register. *Why unique:* a secrets-store crown-jewels register has no shared model — but **every figure inside renders via Freshness §4.9** (seal-unknown → gold); it is an *arrangement of shared Freshness tiles*, not a new status primitive.
- **NOT app-specific (do not fork):** the redemption/denial ledger = AuditInspector §7.2; the exfiltration-signal pin = an AuditInspector pinned filter; the releases table = DataTable; the kill band = HaltBand; the step-up ceremony = ConfirmFriction.

**⚠ Safety / danger surfaces specific to this app:**
- **The write-only constitution is the app's signature.** Everywhere a "reveal/export/show-plaintext" affordance would live, render an **affirmative printed absence** (`🔒 / ⛊`, no interactive element) — *never* a greyed-out toggle. There is **no operator read-secret endpoint anywhere**; break-glass read is an offline 3-of-5 quorum ceremony, never a web action. Build the *absence*, not a locked control.
- **False-green is forbidden absolutely.** A seal state the console can't confirm renders **halt-gold "CANNOT CONFIRM SEAL," never a green "sealed OK."** Chain-verify that is stale/failed never renders green. Audit-sink health is green only if *both* sinks are current.
- **Two friction tiers, mapped by direction.** Toward-*less*-action (release-revoke) = light confirm, signal-cyan, **plus** the honesty carve-out ("revokes the pending release only; an issued cert dies by TTL/KRL") and the live HonestState triad. Toward-*more*-action (rotate, sign-role apply, all gate-weakening) = full ceremony: typed-intent + Tier-2 step-up + diff-hash-bound token + tamper-evident row.
- **Kill/quiesce is read-only.** The HaltBand mirrors auth's level; the Vault draws no STOP button. Under kill ≥ G1, writes/rotate/apply confirm dialogs state new issuance is halted (honesty: kill stops *new* redemption, not already-issued certs); metadata reads and the ledger stay readable.
- **Pattern R vs Pattern D kept strictly distinct.** Seal-unknown, audit-sink-down, engine-sealed, CMDB/auth-unreachable are all **Pattern D gold safe-stop**, never a red error. Only an operator's own fixable failure (bad write, stale diff-hash, terminal-release revoke) or a genuinely detected chain break is red.

**⚑ Gaps flagged:** None — the spec is complete for design. All colors, glyphs, states, and safety cues resolve to frozen DESIGN_SYSTEM tokens (`--halt-500 #F2842B`, `--danger-500 #E5594E`, `--signal-500 #29B6D8`, `--ok-500 #46B98A`) and named shared components; the three app-specific widgets are fully specified from shared primitives.

---

### ⬢ INJECTION BLOCK — CMDB (Policy-Brain Operator Console)

**Purpose (one line):** The suite's policy plane — the fleet inventory plus the rules that decide *"may this host be touched right now?"* — and the one console where the operator authors that policy and sees exactly what any edit makes auto-executable *before* it takes effect.
**Who uses it:** Operator-facing (human UI). Agents get a read-only MCP query surface with **zero mutation verbs by construction** — no agent screen exists here. Every screen below is the human console.
**Archetype:** **Instrument only** (dark-only control-room; `compact` 28–32px density; Inter + JetBrains Mono; `DataTable`-first). There is **no Workshop pane** — policy is structured YAML edited through typed forms and viewed as diffs, never long-form prose. No `--paper-*`, no Source Serif 4.

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark 224/56px side rail + global header + suite switcher; header carries operator `PrincipalRef`, a session-freshness stamp, and a load-bearing **🔑 fresh / 🔑 stale step-up cue** (the gate-weakening confirm needs a fresh step-up). Read-only `HaltBand` mirror renders top-right.
- **HaltBand** — full-width gold (`--halt-500 #F2842B`) safe-stop band under the header, calm interlock ▮▮ / shield ⛊ glyph, never ✕. **Read-only here** — CMDB is not in the kill-actuation chain; any actuator affordance deep-links to MC/auth. Carries the `HonestState` triad verbatim.
- **HonestState** — the `✔ confirmed · ◐ pending · ⇉ draining` triad (green/amber/violet), all three slots always shown even at zero; echoed live inside the gate-weakening consequence block.
- **TicketRef** — opaque mono ID chip on `--sub-750`, copy-on-click; used for `host_id`, `decision_id`/`jti`, Board ticket refs.
- **PrincipalRef** — kind-glyphed mono `sub`: ⬡ agent / ◐ operator / ⚙ service; used for `bound_by`, change-log author, proposer.
- **TierBadge** — the provenance badge: **`host-originated`/`UNTRUSTED` = striped-amber outline + ⚠ + the word UNTRUSTED on hover** (`--attn #E8B84B`, adversarial input). Used on every Wazuh-synced fact. `operator` on `facts_override`; `~ heuristic` micro-tag on group suggestions. **Taint is display-of-truth — no control clears it.**
- **StatePill** — one glyph+label pill per lifecycle state, never color-only (`● active`, `▲ stale`, `❄ FREEZE-ACTIVE`, `◼ CLOSED`).
- **DangerAction + ConfirmFriction** — destructive/gate-weakening = red (`--danger #E5594E`) behind typed-intent + auth live step-up (FULL variant); toward-less-action (tightening) = light **signal-cyan** (`--signal-500 #29B6D8`) single confirm, no typed intent.
- **Freshness** — `⟳` age stamp on every live/mirrored figure; past bound → amber `▲ STALE` with the safe reading spelled out; **never a false green** (stale/unavailable renders honest-unknown in halt-gold, not a fabricated healthy state).
- **ReviewChip** — needs-review/escalation pill carrying the machine reason verbatim + deep-link into MC's canonical queue (`/review/<ticket_id>`); CMDB **files, never clears**.
- **DataTable** — dense zebra (`--sub-750` stripe), sticky sortable header, mono ID column with copy, roving tabindex.
- **AuditInspector** (§7.2 cross-app pattern) — append-only row table with a chain-verify affordance following the false-green rule; used for policy-change history and the decision log.
- **Field / Modal** — inline-validated inputs; modal scrim with the halt affordance painted above it (never occluded).

**▣ Screens & views to build:** (11 side-rail destinations + break-glass; every screen enumerates loaded / loading-skeleton / empty-invitation / Pattern-R red error / Pattern-D gold degraded / stop-engaged)

**Global shell.** Header reads `SYSTEM STATE: ● G0 · policy HEAD 9f3a2c ⟳ 0.4s ── ◐ operator:ada  🔑 fresh`. Side rail (danger-tinted **⚠ Break-glass** entry visually set apart at the bottom):
```
┌ cmdb ──── SYSTEM STATE: ● G0 · policy HEAD 9f3a2c ⟳ 0.4s ── ◐ operator:ada  🔑 fresh ┐
│ [read-only HaltBand mirror renders here only when kill level > G0 or a dep is down]  │
├ rail ──┬─────────────────────────────────────────────────────────────────────────────┤
│ ▸Fleet │  <screen content>                                                            │
│ ▸Host  │                                                                              │
│ ▸Tiers ▸Tasks ▸Catalog ▸Sandbox ▸Discovery ▸Dry-run ▸History ▸Decisions ▸Escalations │
│ ⚠Break-glass  ← danger-tinted, set apart                                              │
└────────┴─────────────────────────────────────────────────────────────────────────────┘
```
- **Global degraded band (Pattern D):** when CMDB's own gate cannot serve (snapshot unhealthy, `policy_version != HEAD`, boot-integrity unverified, clock unsafe), every screen shows the **SAFE-STOPPED band** in halt-gold (⛊, *not* red) *before any content*: *"SYSTEM SAFE-STOPPED · policy snapshot unverified — every verdict is `deny(policy_unavailable)` by design. STILL TRUE: no host can be actioned; existing kill epochs enforced. DO: read history out-of-band; re-arm requires step-up ack."* This is the safety system working.

**1. Fleet list — `/fleet`.** The inventory truth-surface. `DataTable`, mono `host_id` column, filter chips `[tier▾][class▾][window▾][Wazuh▾]`, `/` focuses filter, `⟳ as-of` stamp.
```
Fleet · 21 hosts   [tier▾][class▾][window▾][Wazuh▾]   / filter        ⟳ as-of 8s
┌ host_id     │ criticality │ class    │ window-state      │ mode │ Wazuh         │ lifecycle │
│ [ nas-01 ]  │ ⬢ tier0     │ managed  │ ◼ CLOSED          │ ask  │ ● SYNCED ⟳3m  │ ● active  │
│ [ web-04 ]  │ ⬢ tier2     │ managed  │ ● IN-WINDOW 01:42 │ auto │ ● SYNCED ⟳2m  │ ● active  │
│ [ db-02 ]   │ ⬢ tier1     │ managed  │ ❄ FREEZE-ACTIVE   │ ask  │ ▲ STALE ⟳41m  │ ▲ stale   │
│ [ sbx-01 ]  │ — (no tier) │ ⚙ dispos.│ — (n/a)           │auto* │ — not enrolled│ ● active  │
│ [ mail-03 ] │ ✦ unpolici. │ managed  │ ◼ deny(no_policy) │ —    │ ● SYNCED ⟳1m  │ ▲ needs-tiering →Board │
└ disposable pool collapsed by default · [show 2 disposable]   *sandbox_exec carve-out only ┘
```
Row-click → Host detail. `criticality` = **CriticalityTier chip** (app-specific, NOT TierBadge). `window-state`/`lifecycle` = StatePill; `❄ FREEZE-ACTIVE` is amber `--attn`, never gold. `unpolicied` shows always-deny sentinel + `ReviewChip needs_tiering → Board`. `Wazuh` staleness on hover: *"verdicts unaffected — policy is CMDB's own fact."* **Empty** → "No hosts yet. Bind a discovered agent or author a non-agent asset." **Pattern-D** → whole table replaced by SAFE-STOPPED band (projection index unavailable → honest unknown, never a stale green table).

**2. Host detail / policy editor — `/fleet/<host_id>` — the ONLY policy writer in the suite.** Two columns: left = identity + live-evaluated posture; right = editable policy. **Every write routes through the ceremony (screen 3).**
```
[ nas-01 ]  ⬢ tier0 · managed · ● active                    [ Dry-run this host → ]
─ Evaluated now (same code path as Gateway & MCP) ──────────────── ⟳ as-of 0.2s ─
  window: ◼ CLOSED · next opens Sun 22:00 Europe/Oslo
  mode by action_class:  package_update ask · config_change ask · reboot ask(floor) …
  reason if queried now: [ not_in_window ]        policy_version 9f3a2c (= HEAD ✔)
─ FACTS (rebuildable mirror — NOT policy) ────────────────────────────────────────
  os_family linux ⟨TierBadge: host-originated · UNTRUSTED⟩  arch x86_64 ⟨host-originated⟩
  eol_date 2028-04 ⟨TierBadge: operator⟩  wazuh.agent_id 007 · bound_by ◐operator:ada [rebind…]
─ POLICY (canonical YAML — editing any cell opens the change-control ceremony) ────
  criticality tier: [tier0▾]      overrides (per action_class auto|ask): [edit matrix]
  snapshot_capability: [btrfs▾]  ⚠ moving away from 'none' is a GATE-WEAKENING edit
  maintenance windows: [ WindowScheduleEditor ]   on_window_close: [abort_and_rollback▾]
  ── CONSTITUTIONAL ABSENCE (printed fact) ────────────────────────────────────────
  🔒 This surface holds no lease, mutex, or approval record. CMDB is the policy VETO,
     not the trigger — cannot approve, claim, or execute. Agents cannot write policy.
  [ Propose policy change… ]  ← danger-primed; opens the ceremony
```
The "Evaluated now" panel is **byte-identical to the MCP `is_actionable_now` and the Gateway's binding verdict** (two-views-one-state). Facts provenance = TierBadge; taint is display-only, no clear control. FenceState/approval absence = printed §4.7 fact (🔒, **no greyed toggle**). **Pattern-D** → `evaluate()` can't run → panel shows `⚠ CANNOT CONFIRM — policy snapshot unavailable; treated as deny` in halt-gold, never a stale posture. **Pattern-R** → inline field-validation reject (e.g. RRULE part outside allowlist) in `Field` error style *before* the ceremony opens.

**3. ★ CENTERPIECE — the gate-weakening ceremony (propose → blast-radius preview → step-up confirm).** Every policy/registry/bind/sandbox mutation runs here. It **IS `ConfirmFriction`** filled with the app-specific **`BlastRadiusPreview`** and bound to the diff hash. Friction is chosen **by direction of the edit** (classified server-side, merely rendered here):
- **Tightening/benign** (add a freeze, disable sandbox knob, narrow a window) → **light** variant: single **signal-cyan** confirm, no typed intent, no step-up.
- **Gate-weakening** (any cell moves permissive; `ask→auto`; new allow window; `snapshot_capability` off `none`; tier downgrade; catalog/task-type reclass; bind/rebind; sandbox re-enable/create; key rotation) → **FULL** variant:
```
┌─ CONFIRM: WEAKEN POLICY  (nas-01 · snapshot_capability: none → btrfs) ── --danger header ┐
│ ⚠ CONSEQUENCE — this moves the system TOWARD MORE real-world action.                     │
│   'btrfs' gives nas-01 in-band rollback, so snapshot-gated classes stop routing to ask/  │
│   manual. Irreversible in effect until re-tightened.                                     │
│ ── BlastRadiusPreview (fills the ConfirmFriction app-specific slot) ────────────────────  │
│  This edit makes ▸ 4 (host × action_class) cells auto-executable  (were ask/manual)      │
│                  ▸ 1 host gains window coverage it lacked   ▸ full-shadow warnings: none  │
│  ┌ host   │ action_class   │ before │ after │   diff (canonical, mono):                   │
│  │ nas-01 │ package_update │ manual │ auto  │   - snapshot_capability: none                │
│  │ nas-01 │ config_change  │ ask    │ auto  │   + snapshot_capability: btrfs               │
│  │ …2 more                              │   diff_hash: 7c1e…a90 (confirm binds here)       │
│ live honest-state echo: suite ● G0 · confirmed 0 · pending 0 · draining 0                 │
│ Type  WEAKEN nas-01 snapshot  to confirm:  [▏                    ]                         │
│ Re-authenticate (step-up): 🔑 passkey · auth_time must be fresh  [Re-auth] (auth live)     │
│        [ Cancel ] (default focus, Esc)          [ Weaken policy ] ← --danger, disabled      │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
Primary disabled until typed-intent matches **AND** step-up fresh. On submit a live re-check runs at the commit instant; any drift (diff-hash mismatch, snapshot moved) ⇒ Pattern-R "policy moved under you — re-propose." On success: **commit → push to remote → *only then* snapshot swap** (push is a precondition for weakening), writing a hash-chained `policy_change_log` row. **Halt affordance never occluded.** **Pattern-R** → typed-intent mismatch (inline), step-up stale (`🔑 stale — re-auth`), or **push-failure on a weakening edit → the swap did not happen, edit refused** with a clear red error, commit parked. **Pattern-D** → the auth live-check transport is unreachable → the confirm **fails closed in halt-gold** ("cannot confirm authorization live — refusing to weaken"), *not* red.

**4. Tier catalog — `/tiers`.** `DataTable` of `tier0…tier3` + read-only `unpolicied` sentinel. Each row: CriticalityTier chip, its `{action_class → auto|ask}` default row (the **destructive-never-auto floor cells rendered locked `🔒 floor`** — printed absence, not a disabled toggle), and `{health_check_timeout_s, ssh_wait_timeout_s}`. Editing a default row or a floor-shrink attempt → ceremony; a floor-shrink is **rejected outright** as a §4.7 printed impossibility. **Pattern-D** → SAFE-STOPPED band.

**5. Task-type registry — `/tasks`.** `DataTable` of `{title, destructive, reversible, action_class default, external_verifier, verification_window_s}`. Board triage + auth PDP read this, so a reclassification toward reversible/less-destructive, verifier unbinding, or a permissive attribute is **gate-weakening** → ceremony. `external_verifier` values render as plain labels. **Empty** → "No task types registered — Board triage falls back to catalog-novelty. Add one." **Pattern-R** → duplicate `type_key`.

**6. Runbook-catalog policy attributes — `/catalog`.** `DataTable` of playbook **policy attributes only** (implementations are the Gateway's, read-only): `{action_class binding, risk_class, applicable_tiers, rollback_declared, rollback_method, sandbox_eligible}`. A cell can go `auto` only while a catalog entry exists with `rollback_declared: true`, so catalog-entry creation / `action_class` rebind / a `rollback_declared` false→true flip is **gate-relevant** → ceremony (BlastRadiusPreview shows which cells flip auto-eligible). **Empty** → "No playbook policy attributes — every class stays ask/manual until authored."

**7. Sandbox pool + KILL KNOB — `/sandbox`.** The immutable `disposable`-class pool (no tier, no windows, no Vault creds).
```
Sandbox pool · disposable class · orthogonal to tier          knob: ● ENABLED
┌ host_id │ class    │ Vault creds              │ verdict {sandbox_exec}                │
│ [sbx-01]│ ⚙ dispos.│ 🔒 none (by construction)│ permit · verdict_basis sandbox_carve_out │
└──────────────────────────────────────────────────────────────────────────────────────┘
  [ Disable sandbox pool ]  ← the OPERATOR'S SANDBOX KILL KNOB
   Disabling: instant, ceremony-free TIGHTENING (light signal-cyan) → every sandbox verdict
   becomes deny(sandbox_disabled).  Re-enabling / creating a slot: GATE-WEAKENING (→ ceremony).
  ⛊ Not a kill-switch: the global kill switch covers sandbox exec at the Gateway chokepoint;
     this knob is the policy-plane stop — deep-links to MC for the global halt.
```
Vault-creds absence = 🔒 printed fact. Verdict `permit` = **neutral `--ink-700` label, NOT green** (green is reserved for external-verifier confirmation; a policy permit is not a verification). A disposable record carrying any window/override/tier/Wazuh-bind is a config error → row shows `⚠ deny(sandbox_config_error) → Board` (ReviewChip). **Empty** → "No sandbox slots — Library curation cannot get sandbox evidence until a slot is created (gate-weakening)."

**8. Wazuh sync / discovery — `/discovery`.** Two-part split. Top = sync status (last poll Freshness, RBAC scopes, version probe); a sync failure renders the **mirror `▲ STALE` with "verdicts unaffected" — Pattern D at the mirror level, NOT a red console error** (a Wazuh outage is not the console breaking). Bottom = discovery queue of `discovered_agents` with no host record yet.
```
Wazuh sync · account: agent:read syscollector:read group:read · v4.14.2 ✔  last poll ⟳4m ● OK
─ Discovery queue · 3 unbound ────────────────────────────────────────────────────────────
┌ agent_id │ reported name ⟨host-originated⟩ │ os ⟨host-originated⟩ │ group (advisory) │ action │
│ 013      │ "web-05" ⟨UNTRUSTED⟩           │ linux ⟨UNTRUSTED⟩    │ web ~suggestion  │ [bind…][new host_id…]
└──────────────────────────────────────────────────────────────────────────────────────────┘
  ⚠ Reported names/groups are ATTACKER-INFLUENCEABLE at enrollment. Group membership is a
     UI-only tiering SUGGESTION, never auto-applied. Bind = gate-weakening, operator-confirmed,
     change-logged; a new host lands at 'unpolicied' + fires needs_tiering → Board.
```
Every Wazuh-reported field = TierBadge `host-originated`/`UNTRUSTED`; group suggestions carry `~ heuristic`. Bind/new-`host_id`/rebind → ceremony. **Empty** → "No unbound agents — inventory matches Wazuh." **Pattern-R** → bind to already-bound agent_id. **Pattern-D** → Wazuh unreachable = mirror STALE band with last-known set + as-of stamp, **not** red.

**9. Verdict dry-run / "explain this verdict" — `/dry-run` — app-specific `VerdictTrace`.** The operator runs the **same `evaluate()`** at an arbitrary `at`, subject-free, and sees *why* — the console half of the binding `POST /v1/decision`.
```
Explain a verdict   host_id [nas-01]  action_class [kernel_update▾]  at [2026-07-05 23:30 Oslo] [Explain]
─ VerdictTrace ────────────────────────────────────────────────────────────────────────────
  RESULT:  deny        ← neutral/danger outcome token, NOT green
  decision path (universal preconditions → class fork → window → mode):
    ✔ host resolved   ✔ snapshot healthy · policy_version 9f3a2c = HEAD
    ✔ action_class ∈ enum(7)   ✔ clock healthy (offset 0.3s, NTP-synced)
    ▸ class fork: managed → window algebra
       ✔ allow window w-sun-night covers T    ✕ freeze f-quarter-end also covers T
       → deny-overrides: effective_close = start of freeze → NOT cleanly in-window
    reason[]: [ freeze_active(f-quarter-end) ]   (CMDB-authored enum codes, never host free-text)
  policy_version 9f3a2c · valid_until = evaluated_at + 60s      [ copy trace ]
  NOTE: dry-run is UNSIGNED/advisory (no aud, no JWS) — mechanically unusable at the Gateway.
```
**Empty** → "Enter a host + action_class to trace a verdict." **Pattern-R** → unknown host/bad action_class renders the honest `deny(no_such_host)` / `deny(bad_action_class)` **as the correct result, not an error** (a deny is a valid answer). **Pattern-D** → `evaluate()` unavailable → SAFE-STOPPED band.

**10. Break-glass console — `/break-glass` — distinct, LOUD.** Operator-only emergency window minting; the ceremony with a **louder, freeze-specific re-type** + its own danger-tinted rail entry + a persistent BREAK-GLASS banner riding the whole console while a window is live.
```
⚠ BREAK-GLASS — emergency maintenance window
  Mints ONLY a one-shot bounded window (hard cap ≤4h, auto-expiring) or a time-boxed tier
  exception (same cap). NEVER touches the destructive-never-auto floor (🔒 printed fact).
  ┌─ CONFIRM: BREAK-GLASS (db-02 · emergency allow window 90m) ── --danger header ┐
  │ ⚠ This OVERRIDES an active freeze (allow < freeze < break-glass lattice).      │
  │   BlastRadiusPreview: db-02 becomes cleanly-in-window 90m; 3 classes clear.    │
  │ Type  OVERRIDE FREEZE db-02  to confirm: [▏           ] ← louder, freeze-specific
  │ Re-authenticate: 🔑 passkey fresh      [Cancel]   [Break glass] ← --danger      │
  └────────────────────────────────────────────────────────────────────────────────┘
  On arm: auto-files break_glass_posthoc review → Board (ReviewChip); distinct chain row.
```
CMDB **files, never clears** the post-hoc review. **Pattern-D** → if the change-control path can't fail-closed-verify, break-glass **refuses in halt-gold** ("cannot arm safely"), never a partial arm.

**11. Policy-change history — `/history` — `AuditInspector`, git-derived.** Hash-chained `policy_change_log` rows: timestamp (mono) · PrincipalRef · `edit_kind` verb · target (TicketRef) · `weakening` flag · `diff_hash` · `git_commit` · outcome StatePill. Carries the **out-of-band `git log` verification banner** — the CMDB-specific obligation.
```
Policy-change history                                                   [ chain-verify ]
┌ ⚠ VERIFY OUT-OF-BAND: this console can lie. Confirm the chain by reading `git log` on the ─┐
│   configured REMOTE, not here. Remote: git@…/cmdb_policy.git · local HEAD present on remote ✔ │
└──────────────────────────────────────────────────────────────────────────────────────────┘
  chain-verify: ✔ CHAIN INTACT (local)   [stale → ⚠ CANNOT CONFIRM CHAIN (gold); real break →
                                          ✕ CHAIN BROKEN (danger) — never false-green]
┌ ts       │ who          │ edit_kind    │ target    │ weakening │ diff_hash │ git_commit │ ok │
│ 12:04:11 │ ◐ operator:ada│ snapshot_cap │ [nas-01]  │ ⚠ YES     │ 7c1e…a90  │ 9f3a2c     │ ✔  │
│ 08:50:44 │ ◐ operator:ben│ add_freeze   │ [web-04]  │ tighten   │ …         │ …          │ ✔  │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
**Read-only always.** A restored-older `policy_version` shows a `▲ policy_version behind HEAD` banner in halt-gold here + on every verdict. **Pattern-D** → git/remote unreachable → banner flips to `⚠ CANNOT CONFIRM local HEAD is on remote — degraded; further weakening edits refused` (halt-gold), not red.

**12. Decision-log browser — `/decisions` — `AuditInspector`.** Canonical append-only `decision_log` (every issued verdict, binding + advisory), filterable by `host_id`/`action_class`/verdict/`policy_version`. Rows: `evaluated_at` · caller-selected `aud` · `host_id` (TicketRef) · `action_class` · verdict outcome token (neutral, not green) · `decision_id`/`jti` · `policy_version` · `verdict_basis`. **Pattern-D** → SQLite log unreadable → SAFE-STOPPED (a canonical store unavailable).

**13. Escalation-outbox status — `/escalations` → Board.** The durable outbox. `DataTable`; each row a `ReviewChip` with the **machine reason verbatim** + deep-link into MC's queue once Board mints the ticket.
```
Escalation outbox → Board    ⟳ as-of 6s   ● svc:cmdb present   Board intake: ● up
┌ kind                   │ target    │ state              │ deep-link              │
│ ⚑ needs_tiering        │ [mail-03] │ ◈ delivered        │ → mc/review/T-000481   │
│ ⚑ window_ambiguity     │ [db-02]   │ ◐ queued (retry 2) │ (awaiting Board mint)  │
│ ⚑ break_glass_posthoc  │ [db-02]   │ ◈ delivered        │ → mc/review/T-000480   │
└──────────────────────────────────────────────────────────────────────────────────┘
```
Reasons: `needs_tiering`, `window_ambiguity`, `break_glass_posthoc`, `missing_from_wazuh`, `policy_integrity_error`, `clock_skew`, `sandbox_config_error`, `dst_gap_window_never_opened`. **Degraded-but-honest is first-class:** until `svc:cmdb` + Board intake exist, escalations sit `queued` locally, flagged loudly in **Pattern D halt-gold — "queued, not dropped," never a red error and never hidden.** `[resend]` = benign (light friction). CMDB **files; only MC/Board clear.** This is a **producer view, NOT the ReviewQueue and not a fork of it.**

**◈ App-specific components (only where justified):**
- **`VerdictTrace`** (screen 9) — the arbitrary-`at` decision-path explainer: preconditions → class fork → window/deny-overrides lattice → `effective_close`/grace → `reason[]` enum codes. A domain-unique *policy-decision "why" tree*; no shared component renders an evaluation tree. Reuses TicketRef/PrincipalRef for chips; only the trace layout is new.
- **`BlastRadiusPreview`** (screen 3) — the derived-effect matrix diff ("makes N (host × class) cells auto-executable; J hosts gain coverage; full-shadow warnings"). It **fills the ConfirmFriction app-specific-preview slot** the shared dialog explicitly reserves — it does *not* re-draw the dialog (the dialog *is* ConfirmFriction). A domain-unique policy-impact simulation.
- **`WindowScheduleEditor`** (screen 2) — the RRULE-allowlist maintenance-window editor with DST fold/gap-aware occurrence preview and overnight/next-day-anchor rendering. An editor for recurring policy windows; no shared component authors RRULE + IANA-zone occurrences.
- **`CriticalityTier` chip** (screens 1/2/4) — `tier0…tier3` + `unpolicied` (✦) sentinel host-criticality classification. A small labeled chip, **deliberately NOT `TierBadge`**: host criticality carries no provenance/verification-independence semantics, so borrowing TierBadge's ✔/⧉/◑/⚠ glyphs would misrepresent it. (Flagged below.)
- **`PolicyMatrix`** (screens 2/4) — the (host/tier × action_class) → `auto`/`ask`/`deny(floor)` grid. Listed for completeness; it is a thin **configuration of DataTable**, not a bespoke visual (rows/cols are a DataTable; cells are plain mode labels; floor cells are the `🔒 floor` printed fact). Introduces no new visual.

**⚠ Safety / danger surfaces specific to this app:**
- **The gate-weakening ceremony is the whole point** — any policy edit that loosens a gate gets the FULL ConfirmFriction: red primary, typed-intent, auth live step-up, a `BlastRadiusPreview` naming the exact cells that become auto-executable, a diff-hash-bound confirm token, and a tamper-evident hash-chained audit row. Commit → **push to remote → only then snapshot swap** (push-failure refuses the weakening). Direction is classified server-side; the UI only renders it.
- **Two "tier" meanings, kept visually distinct (preserve both):** host-criticality tier uses the app-specific **`CriticalityTier` chip** (a small labeled classification chip), while the provenance **`TierBadge`** (striped-amber `UNTRUSTED` on host-originated facts) is reserved for its true meaning. This is the one place "tier" means two things in the suite — surfaced deliberately.
- **Maintenance-window "FREEZE" renders AMBER, never halt-gold.** A maintenance `freeze` is *policy* → `StatePill ❄ FREEZE-ACTIVE` in the `--attn` family (`#E8B84B`). Gold/`--halt` (`#F2842B`) is reserved suite-wide for the kill switch and dependency-down fail-closed **only**. Never draw a freeze as the `▮▮ FROZEN` kill pill.
- **Verdict outcomes are never green.** `permit`/`ask`/`deny` render as outcome tokens — `deny` danger outline, `ask` amber, **`permit` neutral `--ink-700`** — because green is reserved for external-verifier confirmation and a policy permit is not a verification.
- **Sandbox KILL KNOB is a policy tightening, not the suite kill.** Disabling = instant light-friction; re-enable/create = full ceremony. `⛊ Not a kill-switch` note deep-links to MC for the global halt.
- **Fail-closed is rendered as the system working, never as breakage:** missing/stale/ambiguous/unparseable facts → `deny` shown in halt-gold Pattern-D, never a red error and never a fabricated green. CMDB can lie to the operator; the git remote cannot — hence the out-of-band `git log` verify banner on history.
- **Constitutional absences are printed, not disabled:** no FenceState, no lease/mutex, no approval affordance, no Vault creds — each rendered as an affirmative 🔒 explained fact, **never a greyed-out toggle** (a disabled control implies a latent capability). The ⛔ actionable-stop glyph must never appear on these.
- **HaltBand is read-only** — CMDB hosts no kill actuator; `Shift+Esc` focuses the header which deep-links to MC/auth (plus the documented non-browser-captured fallback chord).

**⚑ Gaps flagged:** None new — the spec is complete for design. Every color, glyph, and behavior is drawn from the frozen tokens or an app-specific component justified in the spec. The three deliberate divergences the spec records (CriticalityTier chip ≠ TierBadge; freeze = amber ≠ halt-gold; HaltBand read-only / no kill actuator here) are called out above for the design review as intended nuances to preserve, **not** as gaps to fill.

---

### ⬢ INJECTION BLOCK — Agent Runtime (the engine room)

**Purpose (one line):** A deliberately thin operator status surface that reports the *physical truth* of the runtime host — model stack + supply-chain provenance, local GPU/inference headroom, TPM key-custody seal health, and this runtime's own drain/kill compliance — for the facts Mission Control cannot show because they live on the runtime hardware itself.

**Who uses it:** Operator-facing, one screen. Agents do NOT use this (the runtime *runs* agents; its control surface faces the operator/MC). The rich per-agent fleet console is **not here** — it is Mission Control's `LiveAgentView` at `mc.<SUITE_DOMAIN>/agents`, and this surface deep-links out to it. This app is the **client half** of the kill switch and hosts **no kill trigger**.

**Archetype:** Instrument (dark control-room), dark-only, throughout. One screen, no Workshop content anywhere (the runtime authors no documents).

**◇ Shared-system recap (reuse these — do not reinvent):**
- **AppShell** — dark side-rail (collapsed to one nav item) + global header (app name, `SYSTEM STATE` center zone, operator identity, read-only halt mirror right) + suite switcher carrying the one shared posture line. Substrate `--sub-900` bg `#0E1116`, panels `--sub-850` `#12161C`, header `--sub-800` `#171C24`; separation by 1px hairline `--sub-600` `#323C49`, never shadow.
- **PrincipalRef** — mono `sub`, kind-glyphed: ◐ operator (header, `operator:ada`), ⬡ agent (any per-agent count that drills in). Copy-on-click; an agent `sub` clicks through to MC `/agents/<sub>`. Never a bare human name.
- **TierBadge** — provenance on each model row: **Verified** family = `--ok` outline `#46B98A` + ✔ glyph (digest-pinned + Sigstore-signed). A model whose signature can't be confirmed does NOT get a Verified badge — it renders the false-green-forbidden unknown instead. Provenance is display-of-truth, never editable.
- **StatePill** — one glyph+label pill per state, never color-only: `● ONLINE` (`--ok`), `✕ ERROR` (`--danger` `#E5594E`), `● ACTIVE` / `⇉ DRAINING` (`--drain` `#A98CE8`) / `DRAINED` / `QUIESCED` for `drain_state`; TPM `● REACHABLE` / `▲ WARN` (`--attn` `#E8B84B`); Sigstore gate `⛊ ARMED`.
- **FenceState** — only if per-process rows ever render: healthy held lease is neutral `--ink-700` + 🔒 (never green); a zombie (heartbeat token behind Board's current gen) is `⚠ SUPERSEDED` in `--attn`, drawn identically to MC.
- **Freshness** — every physical figure carries `⟳ … · source · as-of` age stamp; past its bound goes amber `▲ STALE` with the safe reading spelled out. **Governs the false-green rule:** a stale/unconfirmable read renders halt-gold `⚠ CANNOT CONFIRM …`, never a fabricated green.
- **HaltBand** — full-width GOLD band under the header, `--halt-500` `#F2842B` on `--halt-tint` `#2E1D0B` wash, interlock ▮▮ (engaged) / shield ⛊ (safe-stopped), text `--halt-ink` `#FFD8A8`, never ✕, never red. **Read-only mirror here** — actuator deep-links to MC/auth. G2 uses the intensified doubled-glyph `▮▮▮▮` + edge striping variant.
- **DangerAction + ConfirmFriction** — used for the printed constitutional-absence facts (🔒, no affordance) and, if any local per-process maintenance action exists, the *toward-less-action* **light signal-cyan** confirm (`#29B6D8`) — never the full red typed-intent ceremony, because this surface can never move the system toward more action.
- **HonestState** — the `✔ confirmed · ◐ pending · ⇉ draining` triad wherever halted-agent counts appear; all three slots always shown; never "all stopped" while pending/draining > 0.
- **DataTable** — dense zebra (`--sub-750` `#1E242E` stripe), sticky header, mono ID column, copy-on-click; used for the model-stack table (and fleet-process rows if ever shown).
- **AuditInspector** (cross-app pattern, provenance mode) — the model-provenance ledger reuses this, not a bespoke view.
- **LiveAgentView** (cross-app pattern, MC-owned) — the rich fleet view lives there; this app deep-links (`[ MC fleet ▸ ]`) and, in the rare case it renders process rows, borrows that exact row anatomy so there is **one fleet, not two**.

**⬢ Screens & views to build:**

**Engine-Room Status (`/status`) — the one screen.** A single Instrument column of hairline-separated status panels inside `AppShell`; instrument-dense, no card-soup. Header shows app name + `the workforce (engine room)`, center `SYSTEM STATE` readout, operator `PrincipalRef` + `🔑 fresh/stale` step-up cue + `[ MC fleet ▸]` deep-link.

```
┌ AppShell header ───────────────────────────────────────────────────────────┐
│ agent-runtime · the workforce (engine room)   SYSTEM STATE: ● G0 NOMINAL    │
│                                     operator:ada ◐ · 🔑 fresh · [ MC fleet ▸]│
├─────────────────────────────────────────────────────────────────────────────┤
│  (no HaltBand at G0 — band appears only when posture > G0 or safe-stopped)   │
│  RUNTIME INSTANCE ──────────────────────────────────────────────────────    │
│  rt-9f2a…   supervisor ⟳ fresh 4.1s   roster 18 agents   drain_state ● ACTIVE│
│  🔒 This runtime holds NO host credentials · cannot approve or execute work. │ ← printed absence
│  MODEL STACK & PROVENANCE ───────────────────── DataTable + TierBadge + Pill │
│  logical role         model / digest      prov.       quant   loaded         │
│  adversarial-reviewer qwen 9c3f…          ✔ VERIFIED  Q6_K    ● ONLINE        │
│  scrum-master         llama a71b…         ✔ VERIFIED  Q5_K_M  ● ONLINE        │
│  hands-pool           mist 4d0e…          ✔ VERIFIED  Q4_K_M  ● ONLINE        │
│  embed (TEI, Library) qwen3 77ac…         ✔ VERIFIED  FP16    ● ONLINE        │
│  Sigstore load-gate: ⛊ ARMED · fail-closed · last verify ⟳ 6s                │
│  LOCAL-COMPUTE HEADROOM ──────────────────────────────── EngineHeadroom      │
│  VRAM  38.6 / 48.0 GB ▓▓▓▓▓▓▓░░ · decode streams 11 / knee C≈14              │
│  TPM sign queue depth 2 (serialized) · source: supervisor · as-of 3s         │
│  KEY-CUSTODY (TPM SEAL HEALTH) ───────────────────────── TPMSealStatus       │
│  /dev/tpmrm0 ● REACHABLE · PCR seal ● BOUND · attest ✔ CERTIFIED             │
│  agents sealed 15 fixedTPM · 3 soft-key   [ never shows keys ] · as-of 5s     │
│  DRAIN / KILL COMPLIANCE (client half) ─────────────────────────────────     │
│  commanded posture G0 · not draining.   MC owns actuation → [ MC fleet ▸ ]   │
└─────────────────────────────────────────────────────────────────────────────┘
```

Primary actions: read-only monitoring; deep-links to MC (`[ MC fleet ▸ ]`, every agent `sub` → `/agents/<sub>`); optional light-friction local maintenance only if exposed (see below). Panels top-to-bottom: **Runtime Instance** → **Model Stack & Provenance** (DataTable) → **Local-Compute Headroom** (`EngineHeadroom`) → **Key-Custody / TPM Seal** (`TPMSealStatus`) → **Drain / Kill Compliance**.

**Every state:**
- **Loaded / nominal** — the wireframe: `drain_state ● ACTIVE`, all models `✔ VERIFIED / ● ONLINE`, TPM `REACHABLE / BOUND / CERTIFIED`, headroom within knee C, all freshness fresh, suite posture `● G0 NOMINAL`.
- **Loading** — static skeleton rows matching each panel (no spinner). Header posture shows last-known with a `▲ reconnecting` Freshness stamp, never a fabricated green.
- **Empty (invitation)** — no runtime instance registered / no models loaded (fresh boot, pre-enrollment). Copy: *"No agent-runtime instance is reporting. Provision the runtime and enroll its TPM-sealed keys to populate the engine room. → runtime bring-up runbook ▸."* Model-table empty: *"No model loaded. The Sigstore load-gate admits only pinned, signed models — load a vetted role model to begin."*
- **Pattern-R error (red ✕)** — a *local, fixable* fault: a model **failed Sigstore verify at load** → `✕ PROVENANCE FAILED · load refused (fail-closed)` on that row in `--danger` `#E5594E`, showing pinned-vs-computed digest and *"model not admitted; fix the pin or re-sign — no unsigned model runs."* A provenance failure is Pattern R (the gate did its job) — explicitly distinct from a dependency outage.
- **False-green-forbidden unknowns (halt-gold)** — a physical read stale/unconfirmable but not an error: TPM unreadable → `⚠ CANNOT CONFIRM KEY SEAL — /dev/tpmrm0 unreadable (as-of 47s); treat custody as UNVERIFIED`; a stale model-signature check → `⚠ CANNOT CONFIRM PROVENANCE` (never a Verified badge, never green online). All in `--halt` gold, never green.
- **Pattern-D degraded (halt-gold ⛊, NOT red)** — the auth-outage / `QUIESCED_BY_OUTAGE` posture: a dependency (auth IdP, or the runtime's own status source) is down, so the runtime safe-stopped **by inference-of-absence** — categorically different from a commanded kill and rendered as the `SYSTEM SAFE-STOPPED` band: *"This is the safety system working, not an outage of the console. STILL TRUE: no new claims; sealed keys unusable off-host; existing kill epochs enforced. Drain posture: QUIESCED_BY_OUTAGE — inferred, not commanded."* `drain_state` shows `… QUIESCING / QUIESCED`. If the supervisor heartbeat itself is stale, the whole surface flips to `⚠ CANNOT CONFIRM FRESHNESS — treating as safe-stopped` and enters Pattern D.
- **Stop-engaged (global kill)** — when auth/MC report level > G0, the gold read-only `HaltBand` slides in under the header (G2 = intensified doubled-interlock). This surface additionally shows the **client-half truth**: `drain_state ● ACTIVE → ⇉ DRAINING → DRAINED`, plus the honest note *"drain compliance is client-side defense-in-depth; the hard stop is enforced at the Gateway chokepoint and auth revocation, not here."* The band's actuator deep-links to MC/auth — **no trigger rendered here.** Header never shows a green "all agents stopped"; counts use the `HonestState` triad.

**◈ App-specific components (only where justified):**
- **`EngineHeadroom`** — local-compute capacity gauges: VRAM-pool utilization (bar, e.g. `38.6 / 48.0 GB`), live decode-stream concurrency **against the measured knee C** (`streams 11 / knee C≈14`), and the TPM signing-queue depth (signing serialized at the one TPM). Carries `Freshness` (`source: supervisor · as-of`); degrades to halt-gold unknown when stale. A *readout*, never a control. **Not shared:** the suite has no gauge for GPU/VRAM/inference-concurrency headroom — a physical property of this Critical-infra host's model stack, existing nowhere else.
- **`TPMSealStatus`** — hardware key-custody health: `/dev/tpmrm0` reachability, PCR-policy seal binding, `TPM2_Certify` attestation result, and counts of fixedTPM-sealed vs soft-key agents. State parts via `StatePill`, unknowns via `Freshness`. **Hard constraints:** shows *health only* — **NEVER** key material, private blobs, or `sub`-linked secrets; obeys false-green absolutely (unconfirmable seal = halt-gold `CANNOT CONFIRM KEY SEAL`, never green). **Not shared:** a hardware-root-of-trust signal unique to the layer that physically holds the per-agent signing keys; no §4 badge expresses "seal bound / can't confirm seal."
- **Model-provenance ledger** — the append-only record of every model load (role, model id, commit digest, SHA-256, Sigstore signature ref, Model-BOM entry, verified/refused outcome). This is **NOT a new component** — it is the *provenance-mode pivot of the shared `AuditInspector`*, reachable as a sub-panel/expand from the Model-Stack panel. Chain/signature-verify affordance obeys the false-green rule: stale/failed verify = halt-gold `⚠ CANNOT CONFIRM` or danger-red `✕ SIGNATURE INVALID`, never a fabricated green. Read-only (append-only; corrections are new rows). Same rows feed MC's Stage-7 provenance display — one truth, two viewers.

**⚠ Safety / danger surfaces specific to this app:**
- **Kill-switch client half, not trigger.** This surface hosts NO global kill actuator (that is MC's `LiveAgentView` + auth L1 only). It shows the kill posture read-only via `HaltBand` and reports its own **drain compliance** (`ACTIVE → DRAINING → DRAINED`). Honest note printed, not implied: the hard stop is enforced at the Gateway chokepoint + auth revocation, not here — drain here is defense-in-depth.
- **Printed constitutional absence.** Per the destructive-absence rule, render 🔒 (lock, NOT ⛔, NOT a greyed toggle) on the affirmative facts: *"This runtime holds NO host credentials · cannot approve or execute work."* A disabled control would falsely imply a latent capability.
- **Commanded-kill (F) vs outage-quiesce (G) must render differently.** A commanded kill = gold `HaltBand` with `drain_state DRAINING/DRAINED`; an auth/dependency outage = gold `SYSTEM SAFE-STOPPED` band with `QUIESCED_BY_OUTAGE` (inferred, not commanded). This distinction is load-bearing — label each explicitly, never conflate, never render either as a red error.
- **False-green absolutism on physical truth.** TPM seal, model provenance, GPU headroom, supervisor freshness — every one obeys the never-false-green rule. A runtime that cannot prove its keys are sealed or its models are signed must *say so* in halt-gold, because those are Critical-infra safety properties.
- **Local maintenance (if exposed at all) is light friction only.** Restart a wedged supervisor / drain one process for a node reboot routes through `DangerAction` + `ConfirmFriction` **toward-less-action** (light signal-cyan `#29B6D8`, single confirm, no typed intent), scoped to this host, carrying the note that fleet-wide stop lives in MC. The runtime can never move the system *toward* more action — that full-red typed-intent ceremony does not exist here. Prefer to omit these and route the operator to MC.

**⚑ Gaps flagged:**
- **[GAP — operator/Claude Design to decide]** the exact visual encoding of the `EngineHeadroom` VRAM/decode-stream gauges (bar vs radial vs numeric-only) and how the "knee C" threshold is marked on the bar (tick, color-shift near capacity) is not specified beyond `▓▓▓▓▓▓▓░░` — pick a treatment within the token set; do NOT put headroom on the halt-gold ramp (gold is reserved for stop states; use neutral fill with `--attn` `#E8B84B` only as it approaches the knee).
- **[GAP — operator/Claude Design to decide]** whether this thin surface ever renders per-process fleet rows at all is left to the operator; if it does, they must reuse the MC `LiveAgentView` row anatomy verbatim (one fleet, not two). Default posture is to deep-link, not render.

---

### ⬢ INJECTION BLOCK — Proxy  *(no UI)*

**Skip — nothing to design.** The Proxy is the suite's reverse-proxy / TLS edge and forward-auth front door. It holds no product state and has **no human UI and no agent UI by construction**. Any proxy health the operator needs shows up *through* Mission Control's edge panel and the shell's suite-posture line — never a proxy-hosted screen. No injection block; do not build one.

---

### ⬢ INJECTION BLOCK — pdf (pdf-forge)  *(deferred — reconcile later)*

**Defer — do not build in this pass.** `pdf` (pdf-forge) is a self-contained, Safe-class homelab PDF tool (page-organize, compress, OCR, encrypt, etc.) that already has its own front-end and its own auth, and renders **none** of the suite's shared entities (no tickets, identities, tiers, fencing, kill switch, or review gates). It is orthogonal to this design system today.

**Later reconciliation (when the operator chooses to fold it in) is shell + tokens only, not safety grammar:** adopt the suite `AppShell` (so it appears in the switcher) and the color/type token sheet (re-skin its page-organize board, viewer, and dropzone — legitimate app-specific widgets that stay), treat it as a **Workshop** archetype, and migrate it to the suite auth edge. It gains **no** safety components (it has no stops, tickets, or provenance to show) — correctly the quietest app in the suite. `[GAP — operator to decide if/when pdf joins the suite shell.]`

---

# PART 3 — THE INJECTION GUIDE (how to use this package)

Paste order matters: some app blocks assume a shared surface already exists (chiefly Mission Control's canonical **Review Queue** and **Live-Agent View**). Follow this checklist.

### Step 0 — Build the system first
1. **Paste all of Part 1** into a fresh Claude Design session. Let it establish the token system, the safety visual grammar (the nine shared components), the interaction grammar, the shell, and the three cross-app patterns. Confirm it has built: the **HaltBand** (gold), the **ConfirmFriction** step-up ceremony, the **TierBadge**, **PrincipalRef/TicketRef** chips, the **DataTable**, and the **AppShell** with the suite switcher. These are the vocabulary every later block reuses.

### Step 1 — Build the system-defining apps (they own the surfaces others echo)
2. **Mission Control** — paste **first** among the apps. It owns the canonical **Review Queue** (`/review`), the canonical **Live-Agent View** (`/agents`), and the **global kill switch** actuator. Every other block that mentions "the review queue," "deep-link to MC," or "the live-agent row anatomy" assumes this exists.
3. **Board** — paste **second**. It defines the **ceremony/deliberation** surfaces and the **approval-record decision** surface (a Board-scoped filter of MC's queue). Notes' ceremony-thread render and any "approval" mention echo Board's model.

### Step 2 — Build the knowledge & comms apps
4. **Notes** — Workshop editor + graph + ceremony-thread; its review-attention view **deep-links to MC** (build MC first).
5. **Library** — its **ingestion review queue reuses MC's Review-Queue anatomy** (build MC first); provenance inspector + quarantine states.
6. **Drive** — artifact browser/preview + audit inspector + purge ceremony (self-contained beyond Part 1).
7. **Chat** — its feed **deep-links to MC's review queue** (build MC first); broadcast + ack.

### Step 3 — Build the critical-infra + engine-room (safety-focused, low-frills)
8. **Gateway** — execute monitor + four-check SoD pre-flight + audit chain; kill status is **read-only** and links to MC/auth (build MC first for the link target).
9. **Vault** — secrets admin (write-only) + access audit + break-glass ceremony.
10. **CMDB** — fleet/policy management + the **gate-weakening step-up ceremony** (the centerpiece) + blast-radius preview.
11. **Agent Runtime** — the thin engine-room status view; its any fleet rows **reuse MC's Live-Agent-View anatomy** (build MC first).

### Skip / defer
- **Proxy** — no UI; skip.
- **pdf** — deferred; build only if/when the operator folds it into the suite shell (shell + tokens, no safety grammar).

### Dependency summary (what must exist before what)
- **Everything** depends on **Part 1**.
- **MC before**: Notes (review-attention), Library (ingestion queue anatomy), Chat (queue deep-link), Board (queue filter), Gateway (kill link target), Agent Runtime (live-agent row anatomy).
- **Board before**: nothing hard, but pasting it second means Notes' ceremony-thread and any approval language have a reference.
- Gateway / Vault / CMDB / Drive need only Part 1 (the AuditInspector and ConfirmFriction ceremony are defined there) — MC-first is preferred only so their read-only kill mirrors and review chips have a live link target.

### Global reminders to keep pasting-in with each app (if Claude Design drifts)
- The **halt/safe-stop is gold `#F2842B`, never red**; a dependency outage is **gold** (Pattern D), not a red error.
- **Danger-red `#E5594E`** is only the operator's own destructive finger, always behind the step-up confirm ceremony.
- Every shared entity (ticket, identity, tier badge, fencing, kill band, review chip) is the **one shared component** — never a per-app redraw.
- **Never a false green**: a stale/unverified figure shows the honest unknown, not a fabricated OK.
- The **kill trigger lives only in Mission Control and auth**; every other app shows the halt band **read-only**.
