# Helm · Master Design Brief (paste FIRST into Claude Design)

> This is Part 1 of the Helm design-brief package: the whole shared visual-system seed. **Paste this entire file into a fresh Claude Design session first**, then paste each per-app block from `apps/` one at a time (order in `INJECTION-GUIDE.md`). Source of truth: `../DESIGN_SYSTEM.md`; consumer map: `../DESIGN_REVIEW.md`.

---

## 0 · Ratified resolutions (2026-07-03) — read before building

The GAP flags scattered through this package are **resolved**; build to these decisions (operator approved the name and delegated the rest to recommendation). Full ledger: `context/DESIGN_REVIEW.md` §5.1.

- **Suite name = `Helm`** (approved). **Kill-switch dwell** ~600ms G1 / ~1000ms G2 — tunable defaults, not locked. **`Shift+Esc` fallback chord = `Alt+Shift+H`** ("Halt", focus-not-fire), used if a Stage-7 test shows Chromium captures `Shift+Esc`.
- **MC pre-sizing numbers stay UNSET** — build the explicit `⚠ PRE-SIZING DEFAULT / UNSET` state, never fabricate a number.
- **"Tier" is two different things:** the provenance **`TierBadge`** (verified/cross-referenced/single-source/UNTRUSTED) is **not** CMDB's host-**criticality** tier — CMDB uses a separate `CriticalityTier` chip. Never merge them. (Likewise CMDB's maintenance-window "FREEZE" is **amber**, never halt-gold — gold is the kill switch only.)
- **Notes taint-downgrade** is not a note-UI control (taint is display-only); if built at all it's an admin-console `DangerAction`. **Notes/Drive cross-app gate decoration** deep-links out until the relevant read scope / Chat exist — an honest degraded state, not a bug.
- **Drive recent-view** is designed as if a ticket index exists. **Agent Runtime** shows engine-room status only (segmented headroom bars with a "knee" tick; **no** fleet rows — those live in Mission Control). **pdf** stays deferred.

---

# PART 1 — THE MASTER BRIEF

*Paste this whole part into Claude Design first. It is written to stand completely alone as the seed for the entire visual system.*

## 1A · Suite name & blurb  `[APPROVED — ratified 2026-07-03; renameable without design impact]`

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
