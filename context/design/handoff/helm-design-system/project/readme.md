# Helm — Design System

**The console for a company of machines.**

Helm is a self-hosted "mini-corporation" of continuous, local AI agents that run a
coordinated suite of work apps — a Board, Notes, a Library, Drive, Chat, and a
Mission-Control cockpit — governed by a critical-infra core (Gateway, Vault, CMDB)
on an identity-and-edge platform. **One human operator** sets the objectives,
approves the risky actions, and can **stop everything with one motion.**

> The name "Helm" is the operator's seat — one person steering, and when needed
> halting, an autonomous fleet. It carries the safety soul of the system: a hand
> always on the stop. The design system does not depend on the name (Overseer,
> Cohort, Bastion are equally rename-able) — nothing here hard-codes it.

This is an **operator/agent control suite**, not a marketing site and not a consumer
document app. Picture a **calm, serious control room wrapped around a document
workshop**: on most screens the operator is *supervising a fleet of autonomous
agents doing real, sometimes-destructive work* ("what is the fleet doing, and can I
stop it?"), and on some screens *reading and reviewing the documents those agents
produce* ("what did it make, and is it any good?").

The feeling to build: **information-dense, quiet, trustworthy, instrument-like.**
Tabular truth over whitespace. Hairline separation over drop-shadows and card-soup.
Keyboard-first. Low marketing polish — elegance comes from precision in spacing and
type, not ornament. The one place we spend boldness is **safety**.

---

## ✦ The single most important idea — safety is the signature

The most memorable, most repeated visual element across all ten apps is the way the
system shows that it has **safely stopped**, and the way it **never lies about
whether it actually stopped.** The suite's identity is:

> *"A system that stops in a calm **gold** posture — not a red alarm — and always
> tells you the honest truth about what is still running."*

If a designer remembers one thing, it is this. Everything else stays disciplined and
out of the way.

### The affective spine — three colors with fixed jobs (never crossed)

Each color means **exactly one thing**, everywhere:

- **Signal-cyan `#29B6D8` = "interactive."** Focus rings, selection, active
  navigation, and the primary **safe** action. Deliberately **not green**, so "you
  can click this" never reads as "this is fine."
- **Halt-gold `#F2842B` = "the *system* is safely stopped and working."** The
  kill-switch is engaged, or a dependency is down and the system failed *closed*.
  Gold is calm and reassuring, deliberately **not red**. Rendering a safe-stop as an
  error (red) is the single worst mistake any screen here can make.
- **Danger-red `#E5594E` = "the *operator's* own finger on something destructive."**
  Lifting a stop, break-glass, revoking, deleting, purging, widening a permission,
  weakening a safety gate. Red always sits behind friction (a confirm ceremony).
  Red = "*you* are about to do something that bites."

Everything else is **rationed** and appears only on state, never as decoration:
healthy-green `#46B98A`, attention-amber `#E8B84B`, draining-violet `#A98CE8`.

**Color is never the only signal.** Every state also carries a **glyph + a text
label**, so the suite is fully legible in grayscale and to a color-blind operator.
One reserved glyph: **⛔ is only ever an actionable STOP/deny/kill button** — never
put it on a "this can't be done by construction" statement (those use a 🔒/⛊ lock and
are not clickable).

---

## Sources

This design system was authored from a **detailed written brief** (a product &
brand specification for Helm). There was **no attached codebase, Figma file, or
slide deck** — the brief is the sole source of truth, and every value here
(colors, type scale, spacing, the safety grammar, the ten apps) is transcribed
directly from it.

The brief notes that one platform app — **auth** (the identity gateway) — *already
shipped a mature operator console*, and this entire system was **derived from it**:
the tokens, the halt-gold grammar, the honest-stop triad, the confirm ceremony, the
`Shift+Esc` behavior, and the Pattern R/D error split all originate in auth's shipped
UI. **Nothing here should contradict auth's console — it is the reference
implementation of the system, not an exception to it.** Two things this system
*adds* that auth doesn't use (no conflict): the **Workshop paper reading mode**
(auth is Instrument-only) and the **suite app-switcher** in the shell.

> If a real auth codebase or Figma becomes available, reconcile against it and
> update the token values / component contracts here to match the shipped source.

---

## The two archetypes

Every screen is one of two archetypes, sharing **one** token system and **one**
safety grammar:

- **Instrument** (control-room) — the dark surface, compact density, Inter + mono.
  Used by Mission Control, Board, Gateway, Vault, CMDB, Agent Runtime, and admin
  views. **Dark-only.**
- **Workshop** (document) — a warm-paper reading/editing pane (with Source Serif 4)
  **set inside** the same dark Instrument shell. Used by Notes and Library content,
  Drive previews, the Chat feed. Only Workshop *content panes* offer the paper/dark
  reading choice.

**The hard rule:** the safety grammar and the shell are **archetype-invariant** — a
ticket ref, an identity, a tier badge, a kill band, a confirm ceremony look **exactly
the same** in a Workshop pane and an Instrument screen. The archetype only changes the
*content substrate and reading affordances*, never how a shared entity or a stop is
drawn. That is precisely what makes Notes and the Gateway feel like the same company.

---

## The ten apps (+ engine room)

| App | Archetype | Owns / notable |
|---|---|---|
| **Mission Control** | Instrument | The cockpit. Owns the **global kill actuation**, the canonical **Review/Approval Queue** (`/review`), and the canonical **Live-Agent view** (`/agents`). |
| **auth** | Instrument | Identity gateway & **reference implementation**. Hosts the identity-layer stop + per-principal revocation and a **read-only mirror** of the global kill level. |
| **Board** | Instrument | Work planning. Shows a Board-scoped *filter* of the review queue; **mints the approval record**, so it hosts that decision. |
| **Notes** | Workshop | Document authoring. Warm-paper reading pane; deep-links out to MC's review queue. |
| **Library** | Workshop | Knowledge base. Reuses the review-queue *anatomy* for its **ingestion-admission gate** (keyed by document, not ticket). |
| **Drive** | Workshop/Instrument | Files. Workshop previews; a Drive **purge** is a red DangerAction. |
| **Chat** | Workshop | The **doorbell** — surfaces a review chip and deep-links into MC. |
| **Gateway** | Instrument | Critical-infra tool catalog. A catalog write is a red DangerAction. |
| **Vault** | Instrument | Secrets. **Never shows a stored secret back** — the canonical "printed absence". |
| **CMDB** | Instrument | Config/topology. Weakening a policy gate is a red DangerAction bound to the exact diff. |
| *Agent Runtime* | Instrument | The engine room. **No rich fleet UI of its own** — status is surfaced *through* MC's Live-Agent view. |

**Boundaries to respect:** auth hosts the identity-layer stop + per-principal
revocation and a read-only kill mirror; **Mission Control owns the global kill
actuation and the canonical review-queue and live-agent views.** Don't move those.

---

## CONTENT FUNDAMENTALS — how Helm writes

The copy is the voice of a **calm, precise instrument that refuses to lie**. It reads
like a trustworthy flight console, not a chatbot and not marketing.

**Voice & tone**
- **Plain, declarative, exact.** State facts and consequences; never hype, never
  reassure with vibes. "Destructive & approve/execute paths are refused suite-wide;
  benign reads continue." — that register, everywhere.
- **Honest over comforting.** The system says what is *still* true. It will say
  *"2 pending — may still act for up to ~2 min"* rather than *"all stopped."* Copy
  discipline around stops is **absolute** (see below).
- **Quietly authoritative, never alarmist.** A safe-stop is described as *the safety
  system working*, not an outage or a failure. Gold copy is reassuring in tone.
- **Low ceremony, high stakes.** Short lines. No exclamation. No emoji as decoration
  (the only "emoji-like" marks are the functional state glyphs — see Iconography).

**Person & address**
- Address the operator as **you** for actions and consequences: *"you are about to
  do something that bites,"* *"this moves the system toward MORE real-world action."*
- Refer to the system and agents in the **third person**: *"the system safe-stopped,"*
  *"agent:patcher-07 is draining."* Never anthropomorphize agents with "I".
- The operator is singular and central — copy assumes **one** person at the helm.

**Casing**
- **Sentence case** for body, dialog copy, and most headings. *"Review halt," "Lift
  stop," "Nothing here yet."*
- **UPPERCASE eyebrows / labels** with `+0.04em` tracking for section labels, nav
  groups, and column headers: *`SYSTEM STATE`, `NEEDS REVIEW`, `PROVENANCE`.*
- **UPPERCASE for loud status words** and hard state tokens: `KILL-SWITCH ENGAGED`,
  `SYSTEM SAFE-STOPPED`, `SUPERSEDED`, `UNTRUSTED`, `STALE`, `REVOKED`, `DISABLED`.
  These are the shouted truths; everything else stays quiet.

**Machine truth vs. prose**
- Anything a machine emits — IDs, tokens, epochs, TTLs, hashes, log lines, reasons —
  renders in **mono**, verbatim, never softened: `agent:patcher-07`, `T-000123`,
  `lease 04:12`, `board_escalation`, `gen 47`. Machine *reasons* are shown raw
  (`window_ambiguity`) with a plain-language gloss beside them, never replaced by one.
- Numbers that tick use **tabular figures** and always carry a **freshness stamp**;
  a stale number says so (`▲ STALE · last good 41s ago`) and never fakes a fresh "OK".

**The absolute rules (copy that must never break)**
1. **Never say "all stopped" while `pending` or `draining` is above zero.** The
   honest-stop triad always shows all three counts, even at zero.
2. **Never render a dependency outage as a red error.** A failed-closed dependency is
   gold and framed as *the safety system working* (Pattern D), not red (Pattern R).
3. **Never dress a heuristic label as verified.** Heuristics are marked `~ heuristic`;
   only an external verifier earns `✔ verified` (green).
4. **A "can't be done by construction" fact is a calm printed statement, not a
   disabled control.** "An agent can never approve its own work." — stated, locked,
   never a greyed-out toggle.

**Representative copy**
- Kill band: *"KILL-SWITCH ENGAGED — destructive & approve/execute paths are refused
  suite-wide; benign reads continue."* + *"Review halt →"*
- Failed-closed: *"SYSTEM SAFE-STOPPED — a dependency is down, so the system failed
  closed. This is the safety system working, not an outage."*
- Empty state: *"Nothing here yet — approvals you're on the hook for will land here.
  [Open the review queue]"* (an invitation, never a shrug).
- Danger consequence: *"This lifts the suite-wide stop. It moves the system toward
  MORE real-world action. 4 agents will resume within ~2 min. This is irreversible
  for actions already in flight."*
- Printed absence: *"🔒 The vault never displays a stored secret. You can rotate or
  revoke it; you cannot read it back."*

---

## VISUAL FOUNDATIONS

**Overall vibe.** A quiet, machined instrument. Flat dark surfaces separated by
hairlines and one-step value changes — *not* by shadow or rounded card-soup. The
screen should read like a well-set table of truth: dense, aligned, tabular, with the
one warm light source being **safety gold**.

**Color.** A cool near-black surface ramp (`#0A0C10` → `#45525F`) with a four-stop
ink ramp (`#EEF2F6` → `#66727F`, muted `#94A1AE` is the minimum readable). The
affective spine (cyan / gold / red) carries all meaning; green/amber/violet are
rationed to state. The one warm surface is the **Workshop paper** (`#F5F3ED` page,
`#1C1E22` ink) — a lit sheet inside the dark desk, used only in document content
panes. See `tokens/colors.css`.

**Type.** Inter for all chrome; JetBrains Mono for all machine truth; Source Serif 4
for Workshop reading bodies only. A tight, dense scale (11 → 26px) with one
deliberately loud member: the **22/26 status word** (the kill-level readout), the
single loudest thing on any screen. Tabular figures mandatory on anything that ticks.
See `tokens/typography.css`.

**Spacing & density.** 4px base; steps 4 · 8 · 12 · 16 · 24 · 32 · 48. Controls are
28 / 32 / 40px. Density is a feature — prefer a tight table to airy cards. On mobile,
interactive rows expand hit-area to ≥44px *without growing visually*.

**Backgrounds.** No imagery, no gradients-as-decoration, no textures, no hand-drawn
anything. The background is a flat dark surface value. The **only** intentional
"gradient/glow" in the system is the soft gold light of a lit **HaltBand**, and the
only warm field is the Workshop paper. Full-bleed imagery does not belong in the
Instrument shell.

**Borders & separation.** 1px hairlines (`#323C49`, stronger `#45525F`). Panels are
**flat and machined**: a one-step change in surface value + a hairline defines an
edge. The band's edge striping uses a 2px edge.

**Shadows.** Exactly two things cast a shadow: a **modal dialog** (over its scrim) and
the **lit safety band** (a soft gold glow). Nothing else — no card shadows, no hover
lift. See `--shadow-dialog`, `--shadow-halt` in `tokens/elevation.css`.

**Radii.** Small and consistent: **4px** controls (buttons, inputs, chips), **6px**
panels/cards/dialogs, **full-round** for status pills only. No large or playful radii.

**Cards.** A "card" here is a flat panel: `--surface-panel` fill, 1px hairline, 6px
radius, **no shadow**. Raised regions (headers, rails) step up to `--surface-raised`.
Insets (wells, code, table stripes) step down to `--surface-inset`. Separation is by
value + hairline, always.

**Motion.** Restrained and *functional* — motion signals state, it never decorates.
Quick eases (`cubic-bezier(0.2,0,0,1)`), fades, and skeleton→content swaps; **no bounce,
no springy overshoot, no decorative loops.** Durations 120 / 180 / 240ms. Implemented once
in `tokens/motion.css`, hooked onto the **shared** component classes so all ten apps inherit
one motion vocabulary with zero per-kit forking:
- **Band reveal + lit breathe** — the gold `HaltBand` arrives with a calm slide+fade
  (`translateY(-8px)→0`), then *breathes* very slowly (~3.6s G1 / 2.8s G2) as the suite's one
  warm light source. This is the single loop we allow, and only because an engaged stop is a
  live, ongoing posture — it is calm, never a blink (a blink would read as alarm/red).
- **Honest-stop motion** — inside `HonestState`, only the **non-zero** in-flight states move:
  pending `◐` ticks, draining `⇉` keeps drifting (still finishing). Zero-count segments are
  still and dimmed. Motion here *is* the honesty.
- **Freshness** — a live figure's dot beats slowly (~2.4s); a `STALE ▲` pulses amber for
  attention. A stale reading never sits still pretending to be fresh, and never fakes green.
- **Ceremony** — the `ConfirmFriction` scrim fades and the dialog rises (`translateY(8px)+
  scale .985→1`); the **stop actuator dwell** fills a ring over ~600ms G1 / ~1000ms G2.
- **Tables** — row hover fades over 120ms (the truth-surface stays crisp, not jumpy).

`prefers-reduced-motion: reduce` collapses transition durations to 0 **and** removes every
loop/entrance, leaving the honest end-state visible (print/PDF/export get content, never a
pre-animation blank).

**Hover / press.** Hover lightens a control fill by one perceptual step or brightens
the accent (`--interactive-hover`); it never lifts with shadow. Press darkens
(`--interactive-press`); a stop actuator instead *fills its ring*. No scale-shrink
gimmicks. Links underline on hover.

**Focus.** Always visible — a **cyan ring** (`--ring-focus`), never removed without a
replacement. Roving focus in tables; `/` focuses search; `Esc` closes a dialog to its
safe (Cancel) default. `Shift+Esc` focuses (never fires) the halt control.

**Transparency & blur.** Used sparingly: the modal **scrim** (`rgba(6,8,11,.66)`) and
nothing else structural. No frosted-glass panels, no blurred backgrounds as style.

**Imagery vibe.** N/A for the Instrument shell (there is none). Where product content
carries imagery (a Drive preview, a Library doc), it sits **inside** a Workshop paper
pane and is treated as content, not chrome — never bled behind the shell.

**Tables — the truth-surface.** Dense rows, subtle zebra striping
(`--surface-inset`), a sticky sortable header, a mono ID column with copy-on-click,
right-aligned tabular numbers, and a clear focused-row state (a cyan left-edge +
raised fill). Tables reflow to stacked cards on narrow screens.

---

## ICONOGRAPHY

Helm's iconography is **deliberately glyph-forward and text-backed.** The system's
meaning-bearing marks are a small, fixed set of **Unicode glyphs**, each paired with a
text label so the interface is fully legible in grayscale and to color-blind
operators. This is a design decision, not a shortcut: the safety glyphs are part of
the brand.

**The reserved state glyphs (never repurpose these):**

| Glyph | Meaning | Notes |
|---|---|---|
| **▮▮** / **⛊** | kill engaged / safe-stopped | calm interlock / shield-check. **Never** an ✕. |
| **▮▮▮▮** | G2 full quiesce | the *doubled* interlock — escalation by shape, not hue |
| **⛔** | actionable STOP / deny / kill **button** | **only** on a clickable stop; never on a printed-absence fact |
| **🔒** / **⛊** | locked fact / held lease / "can't by construction" | a held lock is **neutral**, not green; **not** clickable |
| **⚠** | danger / untrusted / superseded / stale | the caution mark |
| **◐** | pending (may still act) · also the **operator** identity kind | + a live countdown when it's a pending stop |
| **⇉** | draining (past last reversible point) | violet |
| **✔** | confirmed / verified | green |
| **✕** | error (Pattern R only) | the recoverable, operator-side error |
| **⧉** | cross-referenced / corroborated | cyan tier |
| **◑** | single-source / agent-asserted | amber tier — treat with suspicion |
| **⬡** | **agent** identity kind | e.g. `⬡ agent:patcher-07` |
| **⚙** | **service** identity kind | e.g. `⚙ svc:tier-approver` |
| **⬢/◈** | needs-review | `◈ NEEDS REVIEW` |
| **⚑** | escalated | `⚑ ESCALATED` |
| **▲** | stale / freshness warning | `▲ STALE` |
| **♥** | heartbeat | e.g. `♥ 0.8s` in a FenceState |
| **⛒ / ◼** | revoked / disabled principal | its own status pill |

These are rendered in Inter (or as native emoji where the character is emoji-default,
e.g. 🔒), sized to match their line, and **always** sit beside a text label — never
alone as the only signal.

**General UI icons (nav, chevrons, search, copy, close, sort, kebab).** For the
non-semantic chrome icons the brief does not enumerate a house set, so the system uses
**[Lucide](https://lucide.dev)** (loaded from CDN) — a thin, even-stroke, geometric
line set that matches the quiet-instrument aesthetic (1.5px stroke, 16–20px, currentColor).
This is a **flagged substitution**: Lucide is the closest CDN match to the intended
feel, not a shipped house icon font. If Helm has (or ships) its own icon set, swap the
`<i data-lucide>` usages for it and update this section.

**Rules of thumb.** No decorative icons. No emoji as decoration. Icons are 16–20px,
`currentColor`, and inherit the ink ramp. A semantic state icon is **never** used for
decoration and a decorative Lucide icon is **never** used to carry a safety state.

> **Logo.** The brief provides **no logo or brand mark.** Per policy, none was drawn
> or invented. Wherever a mark would sit (the rail header, the app-switcher), Helm
> renders the **wordmark in plain type** — "Helm" in Inter 600 with the app name in a
> muted mono eyebrow. If a real mark exists, drop it into `assets/` and replace the
> wordmark component.

---

## Index / manifest

### Root
- **`styles.css`** — the global CSS entry point consumers link. `@import` manifest only.
- **`readme.md`** — this design guide.
- **`SKILL.md`** — Agent-Skills-compatible entry (for use in Claude Code).

### Tokens (`tokens/`)
- `fonts.css` — the three webfonts (Inter, JetBrains Mono, Source Serif 4) via Google Fonts.
- `colors.css` — surfaces, ink ramp, Workshop paper, the affective spine, state palette, semantic aliases.
- `typography.css` — families, weights, the type scale, role utilities.
- `spacing.css` — 4px spacing scale, control heights, radii, shell layout, z-index.
- `elevation.css` — the two shadows (dialog, halt), scrim, focus ring, motion tokens.
- `motion.css` — the suite-wide motion layer (band reveal + breathe, honest-stop
  motion, freshness beat/pulse, ceremony rise, table hover); reduced-motion guards.
- `base.css` — element defaults, focus, scrollbars, the `.workshop-surface` opt-in.

### Components (`components/`) — 26 exports, grouped by concern
The reusable primitives. Import via `const { Name } = window.HelmDesignSystem_f4cb26`.

- **core/** — `Button`, `IconButton`, `Input`, `StatusPill`
- **identity/** — `TicketRef`, `PrincipalRef`, `TierBadge`, `FenceState`
- **safety/** (the signature grammar) — `HaltBand`, `StopActuator`, `HonestState`, `ConfirmFriction`, `DangerAction`, `PrintedAbsence`, `ReviewChip`, `FreshnessStamp`
- **shell/** — `NavRail`, `AppHeader` (+ `KillMirror`), `SuiteSwitcher` (+ the `HELM_APPS` list)
- **data/** — `DataTable`, `LivenessClass`, `Skeleton`, `EmptyState`, `ErrorState`

Each component directory carries a `<Name>.jsx`, a `<Name>.d.ts` (props contract),
a `<Name>.prompt.md` (usage), and one `@dsCard` demo `.html`.

**The nine shared safety entities** (build once, reuse everywhere — never fork):
`TicketRef`, `PrincipalRef`, `TierBadge`, `FenceState`, `HaltBand`, `DangerAction`
(+ `PrintedAbsence`), `ReviewChip`, `HonestState`, `ConfirmFriction`. These must look
and behave identically in every app — that identical-ness is what makes ten apps feel
like one system.

**Intentional additions** (beyond the entities the brief names explicitly, added
because the shell/tables demand them): `Button`, `IconButton`, `Input`, `StatusPill`
(base primitives), `StopActuator` (the press-and-hold half of the kill-switch),
`FreshnessStamp`, `NavRail`/`AppHeader`/`SuiteSwitcher` (the shell the brief describes
in prose), `DataTable`/`LivenessClass` (the truth-surface + the "never a bare green
dot" liveness), `Skeleton`/`EmptyState`/`ErrorState` (the three honest defaults).

### Foundation cards (`guidelines/`)
17 specimen cards across **Colors** (spine, surfaces, ink, state, paper, washes),
**Type** (families, scale, status word, mono, reading), **Spacing** (scale, controls,
shell), and **Brand** (wordmark, glyphs, error split).

### UI kits (`ui_kits/`)
High-fidelity, click-through recreations, each `{index.html, app.jsx, README.md}`:
- **`mission-control/`** — the cockpit (Instrument), **10 screens**: Overview,
  LiveAgentView (`/agents`), Agent drill-in, ReviewQueue (`/review`), Review item,
  HaltControl (`/halt`), Budgets, Edge, Anchors, Settings. Owns the global kill
  actuation and the canonical review-queue + live-agent views. App-specific parts:
  AttentionBand, FleetAnomalyBanner, SpawnTree, BudgetMeter, EdgeTile,
  HaltNotConfirmed. Honors the false-green rule and phi-accrual liveness throughout.
  Files: `index.html` + `mc-data/parts/screens.jsx` + `app.jsx`.
- **`auth/`** — the identity gateway & reference implementation (Instrument).
  Principals, per-principal revocation, the identity-layer stop, a read-only global
  kill mirror, and the canonical Audit/Provenance Inspector.
- **`notes/`** — document authoring (Workshop), **6 screens**: Corpus browser,
  the warm-paper Note Editor (own/effective taint rail, wikilink chips, paper/dark
  toggle), the seven-phase Deliberation thread record, the taint-propagating Link
  graph, the read-only Review-attention view (MC queue, never cleared here), and the
  git-trailer Provenance/History inspector. Notes-specific parts: NoteEditor,
  LinkGraph, DeliberationThreadView. Holds no ticket/approval/kill authority.
- **`vault/`** — secrets custody (Instrument), **6 screens**: the write-only Secrets
  Manager (no value column, constitutional-absence band), Host Onboarding (SignRoleStager),
  Access Audit (exfiltration pin + false-green chain-verify), Releases (revoke with the
  honesty carve-out), Status/DR (the SealChainPanel crown-jewels, false-green discipline),
  and Change Control (full ceremony for every gate-weakening edit). Vault-specific parts:
  SecretWriteForm, SignRoleStager, SealChainPanel. Read-only kill mirror.
- **`board/`** — the coordination spine (Instrument), **4 screens**: Lifecycle Kanban
  (column-per-state + blocked swimlane + Kanban/Table toggle), Ticket detail +
  CeremonyRibbon, Approval queue + decision (the SoD seam — immutable allowlist,
  diff-hash-bound approve, four-eyes printed absence, kill-gated minting), and the
  tabbed Management Console (WIP policy, triggers, lineage, escalations, violations,
  audit). Board-specific parts: LifecycleKanban, CeremonyRibbon, TicketLineageTree.
  The Board is the fencing authority; kill mirror is read-only.
- **`library/`** — the reference shelf (Workshop/Instrument), **6 screens**: corpus
  search with the trust envelope inline (tier · version scope · coverage · taint),
  the doc/provenance inspector, the Library-owned ingestion admission gate, the
  tier-1 spot-audit stream, collections/lifecycle, and index status. Library-specific
  parts: DocReadingPane, ScopeResolver, AdmissionDiff. Not in the kill chain.
- **`drive/`** — the artifact store (Instrument/Workshop), **4 screens**: ticket
  browser (three-state verification beside the ticket), artifact detail with the
  PreviewSurface + per-version fencing, the upload modal, and the admin console
  (health strip, verified_absent queue, GC Purge that fails closed). Drive-specific
  parts: PreviewSurface, DiskWatermarkMeter, UploadDropzone. Read-only kill mirror.
- **`chat/`** — the doorbell (Instrument/Workshop), **4 screens**: the notification
  feed (KindBadge with priority band, escalations pinned in amber not gold), the
  notification detail (target-wins snapshot, sanitized body), the broadcast composer
  (non-authority printed absence), and the health strip (false-green honesty).
  Chat-specific part: KindBadge. Not in the kill chain.
- **`gateway/`** — the hands (Instrument), **7 screens**: live execution monitor,
  run detail with the four-check SoD proof strip + streaming RunConsole, the audit
  chain, the read-only L2 kill-switch confirmation, the diff-hash-bound catalog write,
  the tier-0 sandbox evidence browser (UNTRUSTED input / VERIFIED evidence duality),
  and orphan reconciliation. Gateway-specific parts: SoDChainStrip, RunConsole,
  SandboxEvidenceView. The L2 physical-stop source; no kill trigger (deep-links out).
- **`cmdb/`** — the policy plane (Instrument), **13 rail destinations**: Fleet, Host
  policy-editor (the one policy writer, with the gate-weakening ceremony + BlastRadiusPreview),
  Tiers, Tasks, Catalog, Sandbox (+ kill knob), Discovery, Dry-run (VerdictTrace), History
  (out-of-band git-verify), Decisions, Escalations, Break-glass. CMDB-specific parts:
  VerdictTrace, BlastRadiusPreview, CriticalityTier chip. Preserves the two-"tier"
  distinction, amber-freeze, and never-green verdicts. Read-only kill mirror (policy veto,
  not trigger).
- **`agent-runtime/`** — the engine room (Instrument, **thin, one screen**): runtime
  instance (printed absence), model stack + Sigstore provenance, EngineHeadroom
  (VRAM/decode/TPM-queue), TPMSealStatus (hardware key-custody), and drain/kill
  compliance. Demonstrates the commanded-kill vs outage-quiesce distinction. Deep-links
  to MC's LiveAgentView; hosts no kill trigger. Single file `ar-app.jsx`.
- **`proxy/`** — the TLS edge / forward-auth front door. **No UI by construction** (per
  its spec) — rendered as an explicit constitutional-absence page (printed 🔒 fact + a
  map of where its health actually shows: MC's Edge panel + the shell suite-posture line),
  not an invented screen. Single self-contained `index.html`.

Each kit's `index.html` is tagged both `@dsCard` (Design System tab) and
`@startingPoint` (screen seed).

### The three cross-app composites (owned, never forked)
- **Review / Approval Queue** — Mission Control owns the canonical version at `/review`.
- **Audit / Provenance Inspector** — one append-only, verify-obeying table family.
- **Live-Agent activity view** — Mission Control owns the canonical version at `/agents`.

---

## Caveats & substitutions (please read)
- **Fonts** load from **Google Fonts** (Inter, JetBrains Mono, Source Serif 4 are the
  real specified families — no substitution — but they are CDN-hosted, not shipped as
  local binaries, so the compiler lists "Fonts: none"). If you need offline/self-hosted
  binaries, drop the `.woff2` files in and add `@font-face` rules to `tokens/fonts.css`.
- **Icons**: safety/state marks are the specified **Unicode glyphs**; general chrome
  icons use **Lucide via CDN** as the closest match to the intended feel — a flagged
  substitution, swap for a house set if one exists (see ICONOGRAPHY).
- **No logo** was provided, so none was drawn — the wordmark stands in (see Brand).
- Some glyphs (⛔, 🔒) are emoji-default; the system forces text presentation, but exact
  rendering is platform-dependent. Verify on your target and swap if a red ⛔ emoji
  clashes with the gold stop story.
