# DESIGN_SYSTEM.md — Suite-Wide Design System (FROZEN CONTRACT)

> **Status: FROZEN** (Stage-3, 2026-07-03). This is a **root-level contract**, consumed the way apps consume `context/CONTRACTS/` and `context/specs/`. A Stage-4 build reads this file to learn how to render every shared entity and interaction; it does **not** reinvent them. Per-app `ui/UI_SPEC.md` files **cite this document by section/component ID** and specify only what is genuinely app-specific.
>
> **Authority & scope:** Owns the suite's visual language, the **safety visual grammar** (§4 — the thing that makes ten apps read as one trustworthy system), interaction grammar (§5), shared components (§6), and the three cross-app patterns (§7). It does **not** own product state, API shapes, or ticket/identifier semantics — those live in the app PLANs, `context/CONTRACTS/`, `context/specs/`. Where a token or rule here disagrees with a frozen contract's *data* rule, the contract wins; where an app's prose invents a one-off rendering for an entity §4 defines, **this document wins** (that is the whole point of freezing it).
>
> **Harmonization note (auth is BUILT):** `platform/auth` shipped a mature operator console (`platform/auth/ui/UI_SPEC.md`, 1135 lines). This design system is **derived from that console and is a superset of it** — auth's tokens, safety grammar, and honest-state discipline are promoted here verbatim as the suite baseline. Where this document extends auth (a light *Workshop* reading mode auth never needed; a suite app-switcher), §9 records the reconciliation. Nothing here silently contradicts shipped auth UI; the two deltas that touch auth are called out in §9 and are additive.
>
> **Change rule:** tokens and component contracts are **additive-only**. A change to an existing token value, a safety-grammar rule, or a cross-app pattern requires amending this document with the affected app sessions citing it. New tokens/components may be added freely.

---

## 1. The design thesis (why the suite looks the way it does)

The product is a **company of machines with one human manager**. The interface is not a marketing site and not a document app — it is a **control room wrapped around a workshop**: the operator supervises autonomous agents doing real, sometimes-destructive work, and also reads and writes the documents those agents produce. Every screen answers one of two questions: *"what is the fleet doing, and can I stop it?"* or *"what did it produce, and is it any good?"*

Two consequences drive every choice below:

1. **Safety is the signature, not decoration.** The single most memorable, most repeated visual element across all ten apps is the **HALT-GOLD safe-stop grammar** and the **honest-state triad** (`confirmed · pending · draining`). The suite's identity is *"a system that stops in a calm gold posture and never lies to you about whether it actually stopped."* We spend our boldness here and keep everything else quiet, dense, and instrument-like. This is the brief-specific choice — not a warm-cream serif site, not a single-acid-accent dark site.
2. **Information density over polish.** This is an operator/agent tool suite. Favor tabular truth, hairline separation, tight type, and keyboard-first operation over generous whitespace and card-soup shadow. Elegance is precision in spacing and type, not ornament.

**The one accent rule (the affective spine, never crossed):**
- **Signal-cyan** = *interactive* (focus, selection, active nav, the primary **safe** action). Deliberately not green, so "you can click this" never reads as "this is OK."
- **HALT-GOLD** = *the system is safely stopped and working* (kill-switch engaged, dependency-down fail-closed). Gold, deliberately **not red**. Confusing "safe-stopped" with "broken" is the worst thing any screen in this suite can do.
- **Danger-red** = *the operator's own finger on a destructive/irreversible affordance* (lift a stop, break-glass, revoke, delete, purge, widen a scope, weaken a policy gate). Red always sits behind friction (§5.1).

Green (`--ok`), amber (`--attn`), and violet (`--drain`) are **rationed semantics** that appear only on state, never as chrome.

---

## 2. Two surface archetypes (the reconciliation that keeps it one suite)

The suite spans a control room and a document workshop. Rather than two design systems, there is **one token system and one safety grammar rendered in two archetypes**. An app declares which archetype its screens use; most Critical-infra and coordination apps are Instrument, the two knowledge apps are Workshop, and several apps use both (an Instrument shell around a Workshop reading pane).

| | **Instrument** (control room) | **Workshop** (document) |
|---|---|---|
| **Apps** | auth, mission-control, board, gateway, vault, cmdb, agent-runtime, drive-admin | notes, library, drive-browse/preview, chat-feed |
| **Job** | monitor, decide, stop | read, write, review long-form content |
| **Substrate** | dark `--sub-*` control-room surface (default) | **reading surface** `--paper-*` for the content column; the app *shell* stays Instrument-dark |
| **Density** | `compact` (28–32px rows) | `comfortable` (editor/reading measure, 40px+ line rhythm) |
| **Primary type** | Inter + JetBrains Mono | + **Source Serif 4** for long-form note/library body (reading), Inter for chrome |
| **Motion** | minimal, state-only | minimal + editor affordances |

**Hard rule — the safety grammar (§4) and the shell (§6.1) are archetype-invariant.** A ticket ref, an identity chip, a tier badge, a fencing state, a kill/quiesce band, a destructive affordance, and a needs-review chip render **identically** in Workshop and Instrument. The archetype only changes the *content substrate and reading affordances*, never how a shared entity or a stop is drawn. This is what makes Notes and the Gateway feel like the same company.

**Dark/light:** Instrument is **dark-only** (a control room is dark by design; auth shipped dark-only and this is preserved). Workshop **content panes** offer a light reading surface (`--paper-*`) and a dark reading surface (`--sub-850` body), operator-selectable; the surrounding shell, nav, and every §4 safety component stay dark in both. Do not offer a "light Instrument."

---

## 3. Visual language (tokens)

> These are the suite tokens. Auth's shipped values are adopted verbatim (`--sub-*`, `--ink-*`, `--signal-*`, semantics, `--halt-*`, spacing, radii, motion). **New** tokens added for Workshop mode are marked ⊕. A build imports this as its `:root` token sheet.

### 3.1 Substrate — cool near-black control-room surface (Instrument, and every shell)

| Token | Hex | Role |
|---|---|---|
| `--sub-950` | `#0A0C10` | App backdrop / deepest well |
| `--sub-900` | `#0E1116` | Default screen background |
| `--sub-850` | `#12161C` | Default panel / card bg; dark reading surface |
| `--sub-800` | `#171C24` | Raised panels, header bar, side rail |
| `--sub-750` | `#1E242E` | Inset wells, table row stripe, code/data blocks |
| `--sub-700` | `#262E39` | Control fill, strong hairline |
| `--sub-600` | `#323C49` | Borders / dividers |
| `--sub-500` | `#45525F` | Stronger borders, control outline, disabled fill |

### 3.2 ⊕ Paper — reading surface (Workshop content column only)

Used **only** inside a Workshop content pane (a note body, a library document, a rendered ceremony thread). Never for the shell, nav, tables of system state, or any §4 component.

| Token | Hex | Role |
|---|---|---|
| `--paper-100` | `#F5F3ED` | Reading-surface background (warm off-white; not pure white — less glare in a dark shell) |
| `--paper-200` | `#EAE7DE` | Reading-surface inset / code block on paper |
| `--paper-ink-900` | `#1C1E22` | Reading body text on paper (≈14:1) |
| `--paper-ink-600` | `#5A5F68` | Muted reading metadata on paper (AA) |
| `--paper-rule` | `#D8D4C8` | Hairline rules, blockquote border on paper |

> The paper column sits inside a dark Instrument shell like a lit sheet on a control desk. This is the *one* place the "document" reads as paper; auth deliberately discarded the paper metaphor for its console and that stands — paper is a Workshop-content affordance, not a suite-wide surface.

### 3.3 Ink — foreground on substrate

`--ink-900` on `--sub-900` ≈ 15:1; `--ink-600` ≈ 4.6:1 (AA body floor). Never place essential text below `--ink-600`.

| Token | Hex | Role |
|---|---|---|
| `--ink-900` | `#EEF2F6` | Primary text, headings, counts |
| `--ink-700` | `#C2CBD5` | Secondary text, active labels |
| `--ink-600` | `#94A1AE` | Muted labels, metadata (AA floor) |
| `--ink-500` | `#66727F` | Disabled text, non-essential hints only |

### 3.4 Accent — "Signal" cyan (the ONE interactive color)

Focus, selection, active nav, and the **primary *safe* action**. Distinct from healthy-green so "interactive" never reads as "OK."

| Token | Hex | Role |
|---|---|---|
| `--signal-500` | `#29B6D8` | Focus ring, selection border, active nav, primary-safe button fill |
| `--signal-400` | `#4FCDEC` | Hover brighten |
| `--signal-600` | `#1B8AA6` | Pressed |
| `--signal-tint` | `#0E2A33` | Selected-row / active wash |
| `--signal-glow` | `#29B6D8` | Focus-ring halo (used at alpha) |

### 3.5 Semantics — rationed, appear only on state

| Token | Hex | Role |
|---|---|---|
| `--ok-500` | `#46B98A` | Healthy / online / confirmed / success |
| `--ok-tint` | `#102C24` | OK banner/chip fill |
| `--attn-500` | `#E8B84B` | Warning / pending / needs-attention (short of engaged) |
| `--attn-tint` | `#33290E` | Attention banner/chip fill |
| `--drain-500` | `#A98CE8` | Draining / in-flight — past its last reversible instant |
| `--drain-tint` | `#231C39` | Draining chip fill |
| `--danger-500` | `#E5594E` | Operator's own destructive/irreversible affordance; hard client error; break-glass |
| `--danger-600` | `#C6473D` | Danger pressed |
| `--danger-tint` | `#351A18` | Error/danger banner fill |

### 3.6 HALT / ENGAGED — the reserved safe-stop gold (the signature)

Used **only** for kill-switch-engaged and dependency-down safe-stop states. A warm orange-gold, deliberately *between* attention-amber and danger-red; **never a small dot — always a whole-surface treatment** (banner band + optional edge striping) with calm interlock/shield iconography (never ✕).

| Token | Hex | Role |
|---|---|---|
| `--halt-500` | `#F2842B` | ENGAGED / SAFE-STOPPED band accent, level pips, engaged icon |
| `--halt-400` | `#FF9E4D` | Engaged hover / brighter pip |
| `--halt-tint` | `#2E1D0B` | Engaged/degraded banner wash (rides on `--sub-800`) |
| `--halt-edge` | `#F2842B @ 22%` | Optional 6px caution-interlock striping on a band's far edge (atmospheric, never the only signal) |
| `--halt-ink` | `#FFD8A8` | Text/figures inside an engaged band (AA on `--halt-tint`, ≈8:1) |

> **Three honest colors for "how stopped is it?":** `confirmed` (green ✔), `pending` (amber ◐, within TTL), `draining` (violet ⇉, in-flight). Collapsing these into one "stopped" is exactly the dishonesty the suite exists to prevent (§4.8).

### 3.7 Contrast & color-independence (non-negotiable, suite-wide)

- Body/label ≥ **4.5:1**; large headings, chip text, level pips, focus rings, band edges ≥ **3:1** against their background.
- **Color is never the only signal.** Every state carries **icon + text label**: engaged/degraded = interlock ▮▮ / shield-check ⛊; danger = triangle-bang ⚠; pending = hollow ring/clock ◐; draining = motion-arrows ⇉; confirmed = check ✔; error = ✕. A monochrome or color-blind operator reads any screen fully from glyph + label + position.
- The **⛔ glyph is reserved exclusively for *actionable* STOP / deny / kill affordances.** It must **never** appear on a "this cannot be done by construction" statement — those are printed constitutional facts, rendered with a **lock / shield glyph (🔒 / ⛊)** and no interactive affordance (§4.7 destructive-absence rule).

### 3.8 Typography

| Role | Family (stack) | Use |
|---|---|---|
| UI / label / heading / body | **Inter** → `Inter, "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | All chrome, tables, controls, Instrument body |
| Data / mono — `sub`, `jti`, `kid`, epochs, TTL, hashes, IDs | **JetBrains Mono** → `"JetBrains Mono","IBM Plex Mono", ui-monospace, Consolas, monospace` | Unambiguous `0/O·1/l`; tabular machine truth |
| ⊕ Long-form reading (Workshop content only) | **Source Serif 4** → `"Source Serif 4", "Iowan Old Style", Georgia, serif` | Note/library **body prose** in a reading pane; humanist serif for sustained reading. Not for chrome, tables, or any §4 component. |

- **Tabular figures mandatory wherever a quantity appears.** Inter numerals `font-feature-settings:"tnum" 1,"lnum" 1`; JetBrains Mono is natively tabular. Counts, epochs, freshness ages, TTL countdowns, budget headroom must not shift width as they tick.
- **All cross-app identifiers render mono** (`agent:patcher-07`, `T-000123`, `jti a3f9…`, `kid 2026-06-key3`) with middle-truncation + copy-on-click; never wrapped.

**Scale** (px / line-height; ~1.2 ratio, instrument-dense):

| Token | px / lh | Role |
|---|---|---|
| `--fs-micro` | 11 / 15 | Dense metadata, epoch/freshness chips, table captions |
| `--fs-label` | 12 / 16 | UI labels, control text, nav labels (UPPERCASE eyebrows +0.04em) |
| `--fs-body` | 13 / 20 | Body, dialog copy, consequence statements |
| `--fs-data` | 13 / 18 | Mono data rows |
| `--fs-base` | 14 / 20 | Inputs, primary controls |
| `--fs-h3` | 16 / 22 | Panel titles |
| `--fs-h2` | 20 / 26 | Screen titles |
| `--fs-h1` | 26 / 32 | Empty-state / engaged-state headline (sparingly) |
| `--fs-status` | 22 / 26 | The always-loud readout (kill-level word, HALT headline) |
| ⊕ `--fs-read` | 17 / 28 | Workshop reading-pane body (Source Serif 4), operator zoomable 15–20px |

Weights: Inter 400 body / 500 labels-controls / 600 headings; JetBrains Mono 400/500; Source Serif 4 400/600. Eyebrows 12px UPPERCASE +0.04em `--ink-600`. Mono never uppercases.

### 3.9 Spacing (base unit = 4px)

`--sp-1` 4 · `--sp-2` 8 · `--sp-3` 12 · `--sp-4` 16 · `--sp-5` 24 · `--sp-6` 32 · `--sp-8` 48.
Control sizing: default 32px; compact 28px; primary/touch 40px. Mobile (~375px) bumps interactive rows to ≥44×44px hit-area (expand padding, not visual size). Content widths: prose/dialog max 560px; ⊕ Workshop reading measure **62–72ch**; data tables fluid; side rail 224px open / 56px collapsed.

### 3.10 Radii, borders, elevation

`--r-ctl` 4 (inputs/buttons/chips) · `--r-panel` 6 (panels/dialogs/header) · `--r-pill` 999 (status pills/level pips).
Flat machined panels; separation by **value-step + 1px hairline**, not shadow. Controls `1px solid --sub-500`, replaced (not stacked) by the focus ring on focus. **Chrome casts no shadow.** The only elevation is the **modal/confirm dialog** (`0 16px 48px rgba(4,6,10,.6)` + scrim `rgba(6,8,12,.66)`) and the **ENGAGED band** (inset-lit strip, `inset 0 -1px 0 --halt-500 @ 40%` keyline — reads as lit signage, not a card).

### 3.11 Motion

`--mo-fast` 120ms (hover/focus/control state) · `--mo-base` 180ms (panel/dialog/banner) · `--mo-slow` 240ms (scrim/sheet). `--ease-out` `cubic-bezier(.2,.7,.3,1)` entrances; `--ease-inout` `cubic-bezier(.4,0,.2,1)` reversible state.
The **ENGAGED band** slides down 180ms + one 1.6s gold breathing pulse on the icon, then settles static. The `pending` ◐ ring rotates slowly (2s). Only other animated elements: settling row-flash (pending→confirmed) and the hold-actuator radial fill.
**`prefers-reduced-motion` (explicit, suite-wide):** all transitions → 0ms/opacity-only; ENGAGED band appears instantly, does not pulse; ◐ ring does not rotate (countdown digits convey liveness); freshness `⟳` static with the age ticking; row transitions are instant glyph swaps; hold-actuator uses a **segmented numeric countdown** that still enforces the dwell. **Focus rings always render — they are state, not motion.** Loading uses static skeletons, never spinners for content (a bare spinner is reserved for a genuinely indeterminate job, §5.4).

---

## 4. THE SAFETY VISUAL GRAMMAR (the heart — every app renders these identically)

These are the entities that recur across apps and **must be one canonical component each**. A per-app spec references them by ID (e.g. "renders `TicketRef` per DESIGN_SYSTEM §4.1"); it does **not** redefine them. The consistency sweep (§DESIGN_REVIEW) exists to catch any app that invents a one-off where one of these applies.

### 4.1 `TicketRef` — ticket / work-item reference

Every ticket, run, release, review-item reference. **Opaque and mono** (`ticket_id` per `IDENTIFIERS.md` — stored verbatim, never parsed for meaning).
```
[ T-000123 ]     ← --r-ctl chip, JetBrains Mono, --ink-700 on --sub-750, copy-on-click
```
- Middle-truncates if long; full value on hover + copy. Never wrapped.
- **When it resolves to a queue item, it is a deep-link** to the canonical review queue: `https://mc.<SUITE_DOMAIN>/review/<ticket_id>` (§7.1). A well-formed `ticket_id` never renders a bare 404 — MC renders "not in queue" + a Board link.
- Related-ID variants share the chip with a leading kind glyph and a distinct label but identical shape: run `R-…`, release `rel-…`, approval `approval_id`, host `host_id`. The **kind is a label, never a color** — all ID chips are `--ink-700`/mono.
- Provenance/taint on the *ticket* rides as a §4.3 badge **beside** the chip, never recoloring the chip itself.

### 4.2 `PrincipalRef` — agent / operator / service identity (`sub`)

Every "who did this." Resolves back to auth (the one identity source). **Mono `sub`, kind-glyphed.**
```
⬡ agent:patcher-07      ◐ operator:ada        ⚙ svc:tier-approver
```
- Kind glyph distinguishes **agent** `⬡` / **operator (human)** `◐` / **service** `⚙` — glyph + text, never color-coded alone.
- Mono, middle-truncate, copy-on-click. Click → the agent drill-in `https://mc.<SUITE_DOMAIN>/agents/<sub>` (§7.3) where a live view exists; otherwise a hovercard (role, last-seen, budget headroom).
- **Never renders a bare human-name without the `sub`** — "who did this" is always the auth-resolved principal, because the audit trail resolves to `sub`, not a display name.
- A **revoked / disabled** principal renders with the §4.5 state suffix (`⛒ REVOKED`, `◼ DISABLED`) — the identity chip carries its own lifecycle state.

### 4.3 `TierBadge` — provenance / trust-tier / taint badge

The single component for every trust/provenance signal in the suite. **Shape = severity family; text = the exact tier; glyph = independence of the label.** Rendered wherever content or facts carry provenance: Library tiers, Notes taint, Board taint+lane, Drive `created_by`/`derived`, CMDB `host-originated` facts, MC's rendered taint.

| Family | Members (text label) | Treatment |
|---|---|---|
| **Verified** | `sandbox-verified` (Library), `gateway-delivered` evidence, `verified` (Drive) | `--ok` outline, ✔ glyph — an *external verifier* confirmed it |
| **Corroborated** | `cross-referenced` (Library) | `--signal` outline, ⧉ glyph — corroborated, not independently verified |
| **Single/asserted** | `single-source`, `agent-authored`/`agent_asserted`, Notes `own` taint | `--attn` outline, ◑ glyph — one source or self-asserted; **treat with suspicion** |
| **Host-originated / tainted** | `host-originated`, `curation-ingested`, Notes `effective` taint (raised) | `--halt`… **no** — see rule below | 
| **Untrusted input** | host-originated, externally-originated (ARCHITECTURE §12) | `--attn` **striped** outline + ⚠ glyph + the word `UNTRUSTED` on hover — this content is adversarial input to the models |

**Hard rules:**
- **Host-originated / externally-originated content is an `UNTRUSTED` badge, and its presence is a machine-readable fact the UI must surface, never bury.** ARCHITECTURE §12: such content makes a plan **auto-approve-ineligible**. The badge is the operator's cue that this item cannot take the auto lane; the UI **renders that fact, it does not decide it** (the decision is server-side).
- **Taint is display-of-truth, never editable in the UI.** No control anywhere lets an operator "clear taint." Provenance is raised-only and server-owned.
- **Heuristic labels render as heuristic.** Library's origin-cluster / distinctness labels carry a `~ heuristic` micro-tag; they must never be drawn to look like a verified tier.
- Do **not** put trust tiers on the halt-gold ramp — gold is reserved for §4.5 stop states only. Untrusted uses striped amber.

### 4.4 `FenceState` — fencing token / lease / mutex state

Renders the liveness and ownership of a claim (Board lease, Gateway host-mutex, Drive/Notes write-fence). The operator's cue for "is this claim still real?"
```
🔒 gen 47 · lease 04:12 · ♥ 0.8s      (healthy: held, fresh heartbeat, TTL counting)
▲ gen 47 · lease 00:03 · ♥ 9.4s      (attention: heartbeat stale, lease near expiry)
⚠ gen 46 · SUPERSEDED by gen 47       (zombie: stale fencing vs current generation)
```
- **Generation is mono and monotone** (`gen 47`), lease TTL is a tabular countdown, heartbeat age is a live freshness figure (§4.9).
- A **zombie** (holder's fencing generation is behind the resource's current generation) is the canonical "this agent thinks it holds a lock it lost" state — `--attn`, ⚠, the word `SUPERSEDED`. This is how MC renders a zombie agent, how Gateway renders a lost mutex, how Board renders a reaped lease. One component.
- Fencing is **advisory-display in some apps** (Chat stores it verbatim but pings outside the reject-set). Those render the chip **greyed with an `advisory` micro-tag** so the operator knows this surface does not enforce on it.
- Never green: a healthy held lease is `--ink-700` neutral with a 🔒 glyph. Green is reserved for *external-verifier confirmation* (§4.3 Verified / §4.8 confirmed), not for "a lock is held."

### 4.5 Lifecycle-state pill (`StatePill`) — the one status chip

Every principal/host/ticket/run lifecycle state is this pill: `[glyph] LABEL`, `--fs-label`, tabular, **outline+dot on dark, filled only inside a banner of the same family**. One per state family, never color-only.
```
● ONLINE      (--ok dot)        ▲ WARN          (--attn)         ◐ PENDING   (--attn ring)
◼ DISABLED    (--ink-500 dot)   ⛒ REVOKED       (--danger outline)
▮▮ FROZEN G1  (--halt interlock) ⛊ SAFE-STOPPED (--halt shield)  ✕ ERROR    (--danger)
⇉ DRAINING    (--drain arrows)  ✔ CONFIRMED     (--ok check)     ⧗ VERIFYING (--signal)
```
Ticket lifecycle states (per `TICKET_STATE_MACHINE.md`) map onto this pill: `todo · in_progress · awaiting_approval · approved · executing · verifying · needs_review · done · failed · cancelled · blocked`. The **authoritative state set and transitions live in `TICKET_STATE_MACHINE.md`**; this component only fixes how a state is *drawn*. An app that renders the lifecycle (Board kanban columns, MC queue) uses these pills for column headers and row status.

### 4.6 Kill-switch / quiesce state — the ENGAGED / SAFE-STOPPED band (`HaltBand`)

**The signature element**, archetype-invariant, identical in every app that can see a stop. A **full-width horizontal band** directly under the global header, sticky until the posture clears. Two members, both `--halt` gold, both calm interlock/shield iconography, labelled distinctly:

*(a) KILL-SWITCH ENGAGED* (operator/guardrail pulled a stop):
```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← --halt-edge striping
┃ ▮▮  KILL-SWITCH ENGAGED · G1 FREEZE-DESTRUCTIVE          epoch 4471 ┃
┃ Destructive & approve/execute paths are refused suite-wide.        ┃
┃ Benign reads + planning continue by design.                        ┃
┃ 21 confirmed · 3 pending(≤2m) · 1 draining      [ Review halt → ]  ┃
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```
*(b) SYSTEM SAFE-STOPPED* (a dependency is down → fail-closed — **Pattern D**, §5.5):
```
┃ ⛊  SYSTEM SAFE-STOPPED · Redis unreachable           since 12:04:11 ┃
┃ This is the safety system working, not an outage of the console.    ┃
┃ STILL TRUE: destructive paths fail closed · existing kill epochs    ┃
┃   still enforced · reads bounded.  DO: STOP still works; runbook ▸  ┃
```
- Both: `--halt-tint` bg on `--sub-800`, `--halt-500` icon + keyline, `--halt-ink` text. Icon is interlock ▮▮ / shield-check ⛊, **never ✕**. `role="status"` / `aria-live="assertive"`.
- **`G2 QUIESCE-ALL` uses an intensified variant** — heavier band, **doubled interlock glyph `▮▮▮▮`**, full edge striping — **still gold, never red**, so "full stop" reads across the room. Per auth SETTLED #9 / RATIFICATIONS D-9-adjacent, the intensification carries a **non-hue cue (weight + doubled glyph + striping)**, not shade delta alone.
- **Every app renders `HaltBand` from the same source of truth.** auth is the single kill-switch enforcement point; the level/epoch is read from auth (or, for the L2-confirmed physical state, from Gateway direct — see `killswitch-chain.md`). MC hosts the **actuation** (the button, §7.3); auth hosts the identity-layer STOP; **every other app shows the band read-only** and, if it can see the actuator at all, deep-links to MC/auth. No app but MC and auth renders a kill *trigger*.
- **Honesty in every header:** a header **never** shows a green "all agents stopped." When a stop is engaged, the level readout goes gold and the band carries the honest triad (§4.8).

### 4.7 Destructive-action affordance (`DangerAction`) + the destructive-*absence* rule

Any operator affordance that moves the system toward **more real-world action or an irreversible change** — lift a stop, break-glass, revoke/disable/delete a principal, purge (Drive GC), weaken a policy gate (CMDB), widen a scope/budget, rotate/delete a key, write a playbook (Gateway catalog).
- **Always danger-red, always behind friction** (§5.1 confirm-with-friction; step-up for high-stakes). Red = "*you* are about to do something that bites."
- The affordance **states the direction** ("this moves the system toward MORE real-world action") and echoes live honest-state (§4.8) in its consequence block.
- **Destructive-absence rule (constitutional facts are printed, not disabled).** Where a capability *cannot exist by construction* (auth's immutable approve/execute separation; "an agent cannot approve its own work"; "this surface cannot relax SoD"), it is rendered as an **affirmative, explained absence** with a **lock/shield glyph 🔒/⛊ and no interactive affordance** — **never a greyed-out toggle** (a disabled control implies a latent capability that could be enabled). The ⛔ glyph (reserved for *actionable* stop/deny) must never appear on such a statement.

### 4.8 Honest-state triad (`HonestState`) — `confirmed · pending · draining`

The reusable triad rendering the **true** aftermath of any stop/revoke, everywhere counts of halted principals appear. **All three slots always shown even at zero**, so `pending 0 · draining 0` is a *positive* statement of confirmed silence and a nonzero pending/draining can never hide.
```
┌────────────────┬────────────────────┬─────────────────────┐
│ ✔ 21 CONFIRMED │ ◐ 3 PENDING ≤2m    │ ⇉ 1 DRAINING        │
│ RS-ack'd epoch │ within TTL window  │ in-flight, past its │
│ (green ✔)      │ (amber ◐+countdown)│ reversible instant  │
└────────────────┴────────────────────┴─────────────────────┘
   hover/expand → which sub / which RS / which jti / which host
```
- **Confirmed** = the revocation-consuming RS acknowledged the current epoch (green ✔). **Pending** = written & fanned out, but the principal may still act on a benign fast-path token for ≤ its TTL (≤2 min); tabular countdown on the chip (amber ◐). **Draining** = a destructive/high-stakes action already past its last reversible instant; will finish and be logged; shows *what* on *which* host/ticket/`jti` (violet ⇉).
- **Copy discipline (absolute, suite-wide):** never render "all agents stopped" / "total silence" while `pending > 0` or `draining > 0`. That wording is permitted only at `pending 0 · draining 0 · N confirmed`. This discipline binds every app that shows a stop aftermath, not just auth.

### 4.9 Freshness / staleness indicator (`Freshness`) — and the "never a false green" rule

Any live figure sourced from a stream/heartbeat/mirror carries a **freshness stamp** and a **source stamp**. This is how the suite refuses to fabricate confidence.
```
⟳ epoch 4471 · fresh 312ms · 24/24 RS current        (aggregate, header)
board epoch 4471 ✔ 0.3s   cmdb epoch 4470 ▲ 1.9s STALE→fail-closed   (per-source)
source: board · as-of 2s ago                          (per-tile provenance)
```
- A figure past its staleness bound goes **amber `▲ STALE`** with the safe reading spelled out (`→ fail-closed`, `→ treating as safe-stopped`) — **stale means "denying / holding safe," not "broken."**
- **The false-green prohibition (suite-wide):** if the underlying read is stale or unavailable, a panel **must not** show a fabricated healthy/green/"intact" state. It renders the honest unknown — e.g. `⚠ CANNOT CONFIRM — <thing> unavailable (as-of <age>); treat as UNVERIFIED` in **halt-gold** (the safe reading), never a green "OK." This binds MC's mirrored tiles (`STALE-UNKNOWN`), auth's separation panel (`CANNOT CONFIRM SEPARATION`), Vault's seal panel, Gateway's anchor status — all one rule.
- If the heartbeat itself is stale (the app can't confirm its own liveness source), it flips to halt-gold "cannot confirm freshness — treating as safe-stopped" and enters Pattern D (§5.5).

### 4.10 Needs-review / escalation state (`ReviewChip`)

The post-work review gate (`needs_review`) and escalation states (A1 `board_escalation`, A2 break-glass review births, stuck-huddle). Renders as a `StatePill` (§4.5) **plus a deep-link into the canonical queue** (§7.1).
```
◈ NEEDS REVIEW  → mc/review/T-000123        ⚑ ESCALATED · board_escalation  → mc/review/…
```
- **Machine reason is always shown** where one exists (`board_escalation`, `unmapped_wazuh_agent`, `window_ambiguity`, break-glass provenance) — the operator sees *why* it escalated, not just that it did. Reason text is `--ink-600` mono-ish, verbatim from the source.
- **Apps surface it; only MC/Board clear it.** Notes, Chat, Library, Drive render `needs_review` and **deep-link out** to the canonical queue to clear it — they never host a "clear review" control for a ticket gate. (Library's *ingestion admission* is a distinct gate it *does* own — §7.1 reconciliation.)

---

## 5. Interaction grammar

### 5.1 Confirm-with-friction + step-up ceremony (`ConfirmFriction`) — the one gate for every dangerous op

The single mechanism gating every §4.7 destructive/irreversible action across the suite: CMDB policy gate-weakening, Vault gate-weakening & manage, Gateway catalog writes, Drive GC purge, Board approve/reject, kill-switch lift, break-glass, key rotation, scope/budget widening. Friction scales with blast radius (`role="alertdialog"`; consequence block is the accessible description).
```
┌─ CONFIRM: <ACTION>  (<from> → <to>) ─────────────────────────┐  ← danger header (--danger)
│  ⚠ CONSEQUENCE — plain language, exact scope, irreversibility,│
│    DIRECTION ("toward MORE real-world action"), blast radius, │
│    and the live honest-state echo (§4.8).                    │
│  <e.g. blast-radius preview: "makes N cells auto-executable"> │  app-specific preview
│  Type <intent> to confirm:  [▏          ]                    │  typed-intent gate
│  Re-authenticate (step-up):  🔑 passkey · auth_time fresh     │  step-up for high-stakes
│         [ Cancel ]                    [ <Action> ]  ← danger  │
└──────────────────────────────────────────────────────────────┘
```
**Rules (suite-wide):**
1. Primary button **disabled until typed-intent matches AND step-up is fresh** (where step-up applies).
2. **Cancel is default focus and the `Esc` target** (safe default).
3. Consequence block always states **direction** and echoes live honest-state counts.
4. **Two friction tiers, mapped by direction of action:**
   - **Toward *less* action** (engage a stop, revoke, disable, quiesce) → the **light** variant: single confirm, **signal-cyan** primary, no typed intent. Engaging safety is the encouraged path.
   - **Toward *more* / irreversible action** (lift, re-enable, break-glass, destroy, weaken a gate, widen) → the **full** variant: typed-intent + step-up (auth Tier-2 live re-auth) + **red** primary.
5. **The step-up is an auth live re-check**, not a local password box. For gate-weakening policy edits (CMDB) and Vault manage, the confirm token is **diff-hash-bound** (the thing you confirm is the exact diff you saw) and the action writes a **tamper-evident audit row** (ARCHITECTURE §12 policy-plane change control).
6. **The halt is NEVER occluded by a modal** (§5.3).

### 5.2 Press-and-hold actuator (`HoldToActuate`) — fast but not accidental

The engage/quiesce mechanic reconciling "fast" with "not accidental," used for **stops only** (typing is reserved for the dangerous direction). Press-and-hold (mouse-down or `Space`/`Enter` keydown) fills a radial ring over a dwell; release before completion = abort; completion = engaged.
- **G1 dwell ≈ 600ms** (may be pre-focused). **G2 dwell ≈ 1000ms** (must be **explicitly focused first, never pre-focused** — one deliberate G2 motion console-wide; never a bare second tap). These are **tunable Build defaults, validated by touch under simulated stress at ~375px in Stage 7** (auth SETTLED #12) — not locked numbers.
- `prefers-reduced-motion`: the radial fill becomes a **segmented numeric countdown** that still enforces the dwell.

### 5.3 The halt is always reachable (`Shift+Esc`) — safety override

- The **header halt affordance is exempt from every scrim.** Any confirm/lift/edit dialog is modal, **but the halt control renders above the scrim and stays interactive** — an operator who sees an agent going rogue mid-dialog can STOP without first finding Cancel.
- **`Shift+Esc` is the global escape hatch:** from inside *any non-STOP* modal it **force-dismisses to a safe cancel AND focuses the header ENGAGE-FREEZE**, overriding the `alertdialog` focus-trap by design. It **focuses, never fires** (focusing, not actuating, keeps it panic-safe). The only modal it does not dismiss is a Halt Control panel that already contains a live actuator.
- **`Shift+Esc` is APPROVED as the Build default but NOT yet validated** (auth SETTLED #11) — Chromium may capture it. Every app's build **must implement a documented fallback chord that is not browser-captured**, selectable if the Stage-7 physical test fails. This is a suite-wide obligation, not auth-only.
- **Where a stop is even visible:** apps that are not in the kill chain (Chat, pdf) show no halt actuator; apps that can *see* system posture (MC, auth, board, gateway, vault, cmdb, notes, library, drive) render the read-only `HaltBand` and, if they surface the trigger at all, deep-link to MC/auth. Only **MC** (global) and **auth** (identity-layer L1) host live actuators.

### 5.4 Loading / empty / error (three honest defaults)

- **Loading:** static **skeletons** matching the target layout (never a full-screen spinner). A bare spinner is permitted only for a genuinely indeterminate async *job* (pdf render, Gateway run start) with no known duration; it carries a text label of what's running.
- **Empty:** an empty screen is an **invitation to act**, not a shrug — states plainly what would appear here and the one action that populates it. No mascots, no "nothing to see."
- **Error — the Pattern R vs Pattern D split (the honesty core, suite-wide):**
  - **Pattern R (error)** = *"your action didn't apply / something you can fix"* — local, recoverable, **red ✕**, the operator's problem. States what happened and how to fix it, in the interface's voice (never apologizes, never vague).
  - **Pattern D (degraded)** = *"a dependency is down, so the system safe-stopped"* — systemic, **halt-gold ⛊, not red**, the safety system *working*. Renders the §4.6b SAFE-STOPPED band with "what's still true / what to do." **Never render a dependency outage as a red error.** This distinction is non-negotiable and binds every app.

### 5.5 Real-time (SSE) pattern (`LiveStream`)

The suite's real-time surfaces (MC multiplex `/api/events`, Board `ceremony_events`, Notes/Chat/Gateway SSE tails, MC's resolve feed for Chat) share one client contract:
- **SSE, `Last-Event-ID` replay, keep-alive < 60s.** On a too-old cursor → `event: reset` → the client re-syncs from the REST read (`GET /api/queue`, etc.) then resumes at the live tip. This is the frozen MC pattern (`mc-chat-review-resolve.md` §3) generalized.
- **Every streamed figure carries `Freshness` (§4.9).** When the stream stalls past its bound, the surface degrades to `STALE`/`STALE-UNKNOWN` (never a frozen-but-green tile), and if the stream is a *safety* signal, to Pattern D.
- **Streams terminate at token `exp` and on `auth:revocations`** (a revoked operator's live view stops; the app re-auths to resume). This is a security property rendered as an honest "session ended — re-authenticate" state, not a silent freeze.
- **Advisory, at-least-once, observed-only semantics are surfaced, not hidden:** where a feed is MC-observed (may have honest downtime gaps), consumers reconcile via read-time derivation and the UI never treats the feed as authoritative for a gate.

### 5.6 Keyboard model (suite-wide)

Full keyboard operability is a floor, not a feature. `Shift+Esc` = global halt-focus (§5.3). `Esc` = close dialog to the safe (Cancel) default. Roving tabindex in tables; logical tab order; `/` focuses the primary search/filter where one exists; `g` then a letter for cross-app nav in the shell switcher (§6.1). Every focusable element shows the §3 focus ring; `outline:none` without replacement is a build failure.

---

## 6. Shared components (the reusable chrome)

### 6.1 App shell & suite switcher (`AppShell`)

One shell, every app. Left **side rail** (224px open / 56px collapsed, glyph+tooltip when collapsed), **global header** (app name + one-line identity of what this app is, `SYSTEM STATE` center zone, halt affordance / read-only `HaltBand` mirror right), content region.
- **The suite switcher** lives in the header/rail: a labeled list of the ten apps the operator has scope for, each a subdomain link (`https://<app>.<SUITE_DOMAIN>`), with the **current suite posture** (kill level, any Pattern-D dependency) shown *once* in the switcher so posture is legible no matter which app you're in. Active app: `--signal-500` left-rail bar + `--signal-tint` wash. Collapsed rail keeps the **halt glyph gold-ringed when any level > G0**, so even a collapsed rail screams "engaged."
- **Identity in the header:** the logged-in operator (`PrincipalRef` §4.2) + a session-freshness stamp; a step-up-required action shows a `🔑 fresh` / `🔑 stale` cue.
- Every app sits behind the proxy forward-auth; the shell assumes an authenticated human session and renders the `auth:revocations` "session ended" state (§5.5) if it drops.

### 6.2 Data table (`DataTable`)

Dense rows (`--sp-2` vertical), zebra `--sub-750`, sticky sortable header, **mono identifier column with copy**, right-aligned tabular numerics, row focus = `--signal-500` left-rail + full-row ring, optional bulk-select column (bulk destructive → §5.1). Roving tabindex; virtualized past ~200 rows; **reflows to stacked cards below ~640px**. This is the truth-surface of the whole suite — Board tickets, MC agents, Gateway runs, Vault releases, CMDB fleet, Drive artifacts, audit rows all use it.

### 6.3 Forms & inputs (`Field`)

`1px solid --sub-500`, focus ring replaces border, `--fs-base`, 32px default height. Inline validation (never only-on-submit), error text in `--danger` below the field with a triangle-bang, label always visible (no placeholder-as-label). Mono inputs for identifiers/hashes. Destructive form submits route through §5.1.

### 6.4 Modal / dialog (`Modal`)

The only elevated surface (§3.10). Scrim `rgba(6,8,12,.66)`; `--r-panel`; **the halt affordance is cut out of / painted above every scrim** (§5.3). `role="dialog"`; a confirm dialog is `role="alertdialog"` with the consequence block as accessible description. `Esc` → safe cancel; `Shift+Esc` → force-cancel + focus halt.

### 6.5 Toast / inline notice (`Toast`)

Transient confirmation of an operator action, **matching the action's own verb** ("Published" for a Publish button). Never used for **safety-critical** state (a stop, an escalation, a degraded dependency) — those are **persistent bands/pills** (§4.6, §4.10, §5.4-D), never a toast that can be missed. `--ok` for success, `--danger` for a recoverable error, **never gold** (gold is a persistent posture, not a transient message).

---

## 7. Cross-app patterns (design once; consumed, never forked)

These appear in multiple apps and MUST be one design. An app that shows one of these **consumes the canonical version** below; it does not build its own.

### 7.1 The Review / Approval Queue (`ReviewQueue`) — **Mission Control owns the canonical version**

Both human gates — *pre-execution approval* (`awaiting_approval`) and *post-work review* (`needs_review`) — are **one unified queue, hosted by MC** at `https://mc.<SUITE_DOMAIN>/review` (item: `/review/<ticket_id>`), per the FROZEN `mc-chat-review-resolve.md` contract. The review-item identity **IS the Board `ticket_id`** — no new identifier is minted.
- **Canonical queue (MC):** a `DataTable` of queue items, each row a `TicketRef` + gate `StatePill` (`awaiting_approval` / `needs_review`) + `PrincipalRef` (proposer/author) + `TierBadge` (provenance; **host-originated ⇒ auto-lane-ineligible**, rendered) + age/`Freshness`. Item page renders the plan/artifact, the ceremony transcript link, and the decision affordance. **Decisions are `DangerAction` (§4.7/§5.1)** written **browser-direct to Board under the operator's own session** — MC holds no standing approve credential.
- **Consumers deep-link in, never fork:**
  - **Chat** = "the doorbell; MC is the door" — its notifications deep-link to `/review/<ticket_id>` (source_ref `{system:"mc",kind:"review",id}`) and subscribe to the resolve feed. It renders a `ReviewChip`, not a queue.
  - **Notes** renders `needs_review` on a note and **deep-links out** to clear it.
  - **Board** owns the *approval-record minting* and may show its **own approval-queue view** in the management console — but that view uses the same `ReviewQueue` row anatomy and the same `/review/<ticket_id>` deep-links; it is a Board-scoped filter of the canonical queue, **not a parallel design**.
  - **Library ingestion admission** is a **distinct gate Library owns** (admit externally-ingested docs to a trust tier — `library:admin`). It is **not** the ticket-review queue and does not live in MC. It **reuses the `ReviewQueue` component anatomy** (batched rows, bulk-approve with a batch cap, per-item `TierBadge` + diff, `DangerAction` admit/reject) but is a Library-internal operator gate. The reconciliation: *same component, different queue and different authority* — Library must render it with the shared component and must **not** invent a bespoke approval visual. Cross-app tickets never appear in Library's ingestion queue and vice-versa.
- **Ack / re-nag** keyed on `(ticket_id, gate, entry)` (MC contract). Resolve events are advisory/at-least-once/**MC-observed** — the UI reconciles via read-time derivation and **never treats the feed as authoritative for the gate** (§5.5).

### 7.2 Audit / Provenance Inspector (`AuditInspector`)

Every audit/provenance surface in the suite (auth "who did what," Gateway per-command audit + chain-verify, Vault redemption/denial ledger, CMDB policy-change history from git, Library evidence ledger, Drive version history, Board ceremony/audit browser) is **one component family**:
- A `DataTable` of append-only rows, each row: timestamp (mono, tabular) · `PrincipalRef` (who) · action verb · `TicketRef`/target · outcome `StatePill` · a **`TierBadge`/provenance** where the row carries trust info.
- **Tamper-evidence is rendered, not asserted:** where the log is hash-chained/signed (auth, Gateway, Vault, CMDB-git), the inspector shows a **chain-verify affordance** and a **verify-result** using the §4.9 rule — a **stale or failed verify never renders green**; it renders `⚠ CANNOT CONFIRM CHAIN` in halt-gold, or `✕ CHAIN BROKEN` in danger-red for an actual detected break. CMDB's git-derived history carries the **out-of-band `git log` verification banner**.
- **Provenance mode:** for Library/Notes/Drive, the same component pivots to show a document's provenance lineage (source tier, evidence ledger with `gateway_delivered` vs `agent_asserted` attestation, coverage flags) — the "inspector" is the read-only truth of *where this came from and who touched it*.
- **Read-only, always.** No inspector ever edits history (append-only is the point). Corrections are new rows.

### 7.3 Live-agent / activity view (`LiveAgentView`) — **Mission Control owns the canonical version**

The cockpit's fleet view at `https://mc.<SUITE_DOMAIN>/agents` (drill-in `/agents/<sub>`), fed by agent-runtime heartbeats (`agent-runtime-mc-heartbeat.md`):
- Per-agent rows: `PrincipalRef` + **liveness class** (phi-accrual — **never a bare green dot**; last-beat age via `Freshness`) + current step/`TicketRef` + `FenceState` (zombie = stale fencing vs Board's current gen) + budget headroom + an **attention band** (wedged / zombie / depth-vs-cap / consecutive-failure / time-in-step). Spawn tree from Board lineage.
- **agent-runtime has no rich UI of its own** — it is the engine room; its fleet/process status is surfaced **through** this MC view (agent-runtime's own `UI_SPEC` is minimal operator status only, §Part-B). Where agent-runtime exposes a thin process/drain status surface, it renders with the same `LiveAgentView` row anatomy so an operator sees one consistent fleet, not two.
- **Kill actuation lives here** (the global kill button, §5.2/§5.3) with the fail-loud `HALT NOT CONFIRMED` → deep-link to auth's outage-surviving `safe_stopped` console. The button **calls auth's revocation** (MC is the cockpit affordance, never a second enforcer; auth is the single enforcement point — `killswitch-chain.md`, RATIFICATIONS MC-btn).

---

## 8. How a per-app UI_SPEC consumes this document

A Stage-4 build reads `DESIGN_SYSTEM.md` for *how to render*, then the app's `ui/UI_SPEC.md` for *what this app shows*. Each per-app spec MUST:
1. **Declare its archetype(s)** (§2) and which screens are Instrument vs Workshop.
2. **Cite shared components by ID** ("the queue is `ReviewQueue` §7.1"; "identities are `PrincipalRef` §4.2") — never re-specify a §4/§5/§6/§7 component's visuals.
3. **List its app-specific components** and **justify** why each cannot be a shared one (a genuinely domain-unique widget — a Milkdown editor, a wikilink graph, a PageGrid — is fine; a bespoke re-draw of a ticket chip is a consistency failure).
4. **Specify the human-surface half of its API** (screens/states over the *same* state the MCP surface serves — two views, one state), so Stage-4 builds both siblings over one API.
5. **Enumerate every screen's states** (loaded / loading-skeleton / empty / Pattern-R error / Pattern-D degraded / stop-engaged) using §5.4's honest defaults.

The **consistency sweep** (`context/DESIGN_REVIEW.md`) checks every app against this: does it render each shared entity via the §4 component? Any one-off where a shared pattern exists is flagged for the operator.

---

## 9. Reconciliation with the shipped auth console

`platform/auth/ui/UI_SPEC.md` (BUILT) is the origin of this system. Reconciliation:
- **Adopted verbatim from auth → promoted to suite baseline:** all §3 tokens, the `HaltBand` (§4.6), `HonestState` triad (§4.8), `ConfirmFriction` (§5.1), `HoldToActuate` (§5.2), `Shift+Esc` safety override (§5.3), Pattern R/D split (§5.4), `StatePill` (§4.5), `Freshness` + false-green rule (§4.9), the ⛔-glyph reservation and destructive-absence rule (§3.7/§4.7), `DataTable` (§6.2). Auth needs **no change**; it already conforms because it *is* the source.
- **Two additive extensions auth does not use (no contradiction):**
  1. **Workshop archetype + `--paper-*` + Source Serif 4 (§2/§3.2/§3.8).** Auth is Instrument-only and never needed a reading surface. This extends the token set for Notes/Library; auth ignores it. *Additive.*
  2. **Suite app-switcher in `AppShell` (§6.1).** Auth's console predates a suite-wide switcher and shows only auth. Reconciliation: auth's shell **gains the switcher and the read-only suite-posture line** when convenient (a small additive change, not a redesign) — until then auth remains conformant as a single-app shell. Recorded as the one auth-touching follow-up. *Additive, non-blocking.*
- **Ownership boundaries preserved, not re-litigated:** auth hosts the **identity-layer L1 STOP + per-principal revocation** and a **read-only mirror** of the global kill level; **MC owns the global kill actuation** and the canonical `ReviewQueue`/`LiveAgentView`. This design system encodes those boundaries (§4.6, §7.1, §7.3); it does not move them.
- **Naming:** auth's console calls its accent "Signal cyan," its gold "HALT," its triad "confirmed/pending/draining" — identical here. No term is renamed; a build reading either document finds the same vocabulary.

---

## 10. Freeze summary

Frozen: §3 tokens, §4 safety grammar (9 canonical components), §5 interaction grammar, §6 shared chrome, §7 three cross-app patterns (`ReviewQueue`/`AuditInspector`/`LiveAgentView`), §8 consumption contract. Additive-only change rule (top of file). Component index: `context/DESIGN_SYSTEM_COMPONENTS.md`. Consistency sweep + consumer matrix: `context/DESIGN_REVIEW.md`.
