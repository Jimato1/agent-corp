# auth — Operator Console · Stage-3 UI/UX Specification

> **Status:** Stage-3 spec, **Critical-infra review folded in** (18 findings, all RESOLVED — see §10.2), ready to hand to Claude Design → Build. This is a SPEC of screens, states, and flows — not implementation, not components, not code. Layouts are described in words + ASCII wireframes; every screen enumerates every state; every flow enumerates every step.
>
> **App:** `auth`, the identity gateway of the agent-corp suite. **Risk class:** Critical-infra.
>
> **Grounding (do not re-read to build — this spec is self-contained):** PLAN §3 (principals/keys), §4 (token model + revocation/freshness), §5 (PDP decisions/reason codes), §6 (budgets), §7 (kill switch / HA / break-glass / fail-closed), §9.3 (operator UI over one shared state), §12 (accepted residuals); ARCHITECTURE (segregation of duties, four holders, kill switch bites at the Gateway); PROCESS (Stage-3 Critical-infra rigor); the 8 SETTLED DECISIONS in auth CLAUDE.md (notably **Decision #5** — the SoD approve/execute conflict-set is immutable with no runtime relax path). House visual precedent (`pdf-forge` DESIGN-SYSTEM) is adapted for a *safety/control console*; the paper/sheet metaphor is discarded.

---

## 1. Title, scope & governing principle

### 1.1 What this console is

The **auth operator console** is the **operator-only human surface** for the identity gateway: the place a single human operator authenticates, oversees the autonomous agent fleet, stops it, revokes principals, runs break-glass, audits "who did what," and manages identities/roles/budgets. It is the human sibling of auth's thin machine surface, over **one shared state** (PLAN §9.3, §9.4).

### 1.2 Scope boundary (hard)

- **Operator-only.** Everything in this spec is the human surface.
- **The agent / MCP surface has NO UI.** The agent surface (PLAN §9.2) is thin, read/self-only (`whoami`, `budget.self`, introspection of the caller's own token). It is machine-to-machine. **Do not design any UI for it.** Where an agent-facing value matters (e.g. `whoami` reflecting a change), it appears only as a note that the operator's mutation is immediately visible to the machine surface — never as a screen.
- **Not hosted here:** the *global* kill-switch actuation UI (owned by Mission Control, §7.8) — this console shows a **read-only mirror** of level/epoch plus a single labeled hand-off link, and hosts auth's own **identity-layer STOP (L1)** and **per-principal revocation**, which auth owns.

### 1.3 The governing design principle (applied on every screen)

> **Make the SAFE action EASY and the DANGEROUS action DELIBERATE — and always show the operator the TRUE state after they act.**

Three inseparable clauses:

1. **Safe = easy.** The identity-layer STOP is reachable in one unmistakable motion from any screen, on any breakpoint, even while a panel is loading or a dependency is down. Engaging a stop, revoking, and disabling — all movements toward *less* real-world action — carry the lightest friction that is still accident-proof.
2. **Dangerous = deliberate.** Lifting a stop, re-enabling, break-glass entry, break-glass RESTORE, deleting/rotating a holder key, widening a scope or budget — all movements toward *more* real-world action, or irreversible ones — sit behind **typed-intent + a plain-language consequence statement + (for high-stakes) step-up re-auth**. They cannot be triggered by accident or muscle memory.
3. **Honest post-action state.** The token model **cannot** promise instant total silence. The console therefore **never** renders a binary "STOPPED ✓." It resolves every stop/revoke into the honest triad **`N confirmed · M pending · K draining`** (§4.4), surfaces the ≤2-min benign-token staleness window (PLAN §4.2), shows per-RS denylist freshness/epoch lag, and flags in-flight destructive actions as *draining*. The copy discipline is absolute: the console may say "total silence" only when `pending 0 · draining 0`.

**Two ownership rules for alarm color, never crossed (the console's whole affective spine):**
- **RED is the operator's finger** — it marks the operator's own destructive / irreversible affordances (lift a stop, break-glass entry/restore, revoke a key, disable/delete a principal). Red = "*you* are about to do something that bites." Red is always behind friction.
- **HALT-GOLD is the system's safe posture** — kill-switch ENGAGED and dependency-down SAFE-STOPPED. Gold = "*the system* is safely stopped and working, not broken." Confusing "safe-stopped" with "error" is the single worst thing this console could do; gold is deliberately not red.

**Decision #5 is settled and shell-enforced:** there is **no control anywhere** — not in Roles & Scopes, not in Break-glass, not disabled, not "advanced" — to relax approve/execute separation. The capability is rendered as an **affirmative, explained absence**, never a greyed-out toggle. See §2.5 (component), §6 (break-glass), §8.2 (roles), §D-constraints in §3.5.

---

## 2. Design language & accessibility quality floor

*Stated once here; every screen references these tokens/components by name.* This is a **control room, not a document workshop**: inherit the house discipline (dark instrument substrate, ink ramp, ONE rationed accent, tabular truth, keyboard-first, quiet chrome, hairline separation, no card-soup shadow) and discard the paper metaphor. Boldness is spent in exactly one place — the **ENGAGED / SAFE-STOPPED signature** (§2.5.2).

### 2.1 Color tokens

**Substrate — cool near-black control-room surface**

| Token | Hex | Role |
|---|---|---|
| `--sub-950` | `#0A0C10` | App backdrop / deepest well |
| `--sub-900` | `#0E1116` | Default screen background |
| `--sub-850` | `#12161C` | Default panel / card bg |
| `--sub-800` | `#171C24` | Raised panels, header bar, side rail |
| `--sub-750` | `#1E242E` | Inset wells, table row stripe, code/data blocks |
| `--sub-700` | `#262E39` | Control fill, strong hairline |
| `--sub-600` | `#323C49` | Borders / dividers |
| `--sub-500` | `#45525F` | Stronger borders, control outline, disabled fill |

**Ink — foreground on substrate** (`--ink-900` on `--sub-900` ≈ 15:1; `--ink-600` ≈ 4.6:1 AA body floor; never place essential text below `--ink-600`).

| Token | Hex | Role |
|---|---|---|
| `--ink-900` | `#EEF2F6` | Primary text, headings, counts |
| `--ink-700` | `#C2CBD5` | Secondary text, active labels |
| `--ink-600` | `#94A1AE` | Muted labels, metadata (AA floor) |
| `--ink-500` | `#66727F` | Disabled text, non-essential hints only |

**Accent — "Signal" cyan (the ONE).** The single interactive color: focus, selection, active nav, and the **primary *safe* action** (a control that moves the system toward *less* real-world action is signal-cyan, because engaging safety is the encouraged path; only lifting safety or destroying identity turns red). Deliberately distinct from healthy-green so "interactive" never reads as "OK."

| Token | Hex | Role |
|---|---|---|
| `--signal-500` | `#29B6D8` | Focus ring, selection border, active nav, primary-safe button fill |
| `--signal-400` | `#4FCDEC` | Hover brighten |
| `--signal-600` | `#1B8AA6` | Pressed |
| `--signal-tint` | `#0E2A33` | Selected-row / active wash |
| `--signal-glow` | `#29B6D8` | Focus-ring halo (used at alpha, §2.7) |

**Semantics — rationed, appear only on state.**

| Token | Hex | Role |
|---|---|---|
| `--ok-500` | `#46B98A` | Healthy / online / **confirmed-halted** / success |
| `--ok-tint` | `#102C24` | OK banner/chip fill |
| `--attn-500` | `#E8B84B` | Warning / **pending-confirmation** / needs-attention (short of engaged) |
| `--attn-tint` | `#33290E` | Attention banner/chip fill |
| `--drain-500` | `#A98CE8` | **Draining / in-flight** — past its last reversible instant, still finishing (its own hue: not "done", not merely "waiting") |
| `--drain-tint` | `#231C39` | Draining chip fill |
| `--danger-500` | `#E5594E` | Operator's own **destructive/irreversible** affordances; hard client error; break-glass |
| `--danger-600` | `#C6473D` | Danger pressed |
| `--danger-tint` | `#351A18` | Error/danger banner fill |

> **Three honest colors for "how stopped is it?":** `confirmed` (green ✔, RS-acked the current epoch), `pending` (amber ◐, plausibly still acting within the ≤2-min TTL window), `draining` (violet ⇉, definitely still acting on an in-flight path). Collapsing these into one "stopped" is exactly the dishonesty this console exists to prevent.

**HALT / ENGAGED — the reserved safe-stop gold (the signature).** Used **only** for kill-switch-engaged and dependency-down safe-stop states. A warm orange-gold, deliberately *between* attention-amber and danger-red; never a small dot — always a **whole-surface treatment** (banner band + optional edge striping) with calm interlock/shield iconography (never ✕).

| Token | Hex | Role |
|---|---|---|
| `--halt-500` | `#F2842B` | ENGAGED / SAFE-STOPPED band fill-accent, level pips, engaged icon |
| `--halt-400` | `#FF9E4D` | Engaged hover / brighter pip |
| `--halt-tint` | `#2E1D0B` | Engaged/degraded banner wash (rides on `--sub-800`) |
| `--halt-edge` | `#F2842B @ 22%` | Optional 6px caution-interlock striping on the far edge of an ENGAGED banner (atmospheric, never the only signal) |
| `--halt-ink` | `#FFD8A8` | Text/figures inside an engaged band (AA on `--halt-tint`, ≈ 8:1) |

**Contrast intent (stated, must be preserved by Design):** body/label ≥ 4.5:1 on its background; large headings, chip text, level pips, focus rings, and the ENGAGED band edge ≥ 3:1 against `--sub-900`. The signal-cyan ring holds on `--sub-900` (≈4.8:1) and on `--halt-tint` (≈3.2:1). **Color is never the only signal:** every state also carries an **icon + text label** (engaged/degraded = interlock ▮▮ / shield-check ⛊ glyph + word; danger = triangle-bang; pending = hollow ring/clock ◐; draining = motion-arrows ⇉; confirmed = check ✔; error = ✕). A monochrome or color-blind operator reads the console fully from glyph + label + position.

### 2.2 Typography

Two faces, role-mapped.

| Role | Family (stack) | Why |
|---|---|---|
| UI / label / heading / body | **Inter** → `Inter, "Inter var", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` | Humanist grotesque, tall x-height, superb at 12–14px |
| Data / mono — `sub`, `jti`, `kid`, epochs, TTL clocks, hashes | **JetBrains Mono** → `"JetBrains Mono","IBM Plex Mono", ui-monospace, Consolas, monospace` | Unambiguous `0/O·1/l`; tabular; reads as machine truth |

- **Tabular figures are mandatory wherever a quantity appears.** Inter numerals run `font-feature-settings:"tnum" 1,"lnum" 1`; JetBrains Mono is natively tabular. Counts, epochs, freshness ages (ms), TTL countdowns (`01:47`), budget headroom (`3 / 8`) must not shift width as they tick.
- **All identifiers render mono** (`agent:patcher-07`, `jti a3f9…`, `kid 2026-06-key3`) with middle-truncation + copy-on-click; never wrapped.

**Scale** (px / line-height; ~1.2 ratio, tightened for instrument density):

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
| `--fs-status` | 22 / 26 | The header kill-level word (`G0 ARMED` / `G2 ENGAGED`) — the one always-loud readout |

Weights: Inter 400 body / 500 labels-controls / 600 headings; JetBrains Mono 400/500. Eyebrows 12px UPPERCASE +0.04em `--ink-600`. Mono never uppercases.

### 2.3 Spacing & layout grid (base unit = 4px)

| Token | px | Use |
|---|---|---|
| `--sp-1` | 4 | Icon-label gap, chip padding |
| `--sp-2` | 8 | Control inner padding, tight stacks |
| `--sp-3` | 12 | Default gap between related controls |
| `--sp-4` | 16 | Panel padding |
| `--sp-5` | 24 | Section separation |
| `--sp-6` | 32 | Major region separation |
| `--sp-8` | 48 | Screen outer gutter (desktop) |

**Control sizing:** default 32px; compact 28px; primary/touch 40px. Mobile (~375px) bumps interactive rows to ≥44×44px hit-area (expand padding, not visual size). Icon button 28px box / 16px glyph. **Content widths:** prose/dialog max 560px; data tables fluid; side rail 224px open / 56px collapsed.

### 2.4 Radii, borders, elevation

| Token | px | Use |
|---|---|---|
| `--r-ctl` | 4 | Inputs, buttons, chips |
| `--r-panel` | 6 | Panels, dialogs, header bar |
| `--r-pill` | 999 | Status pills / level pips only |

Flat machined panels; separation by **value-step + 1px hairline**, not shadow. Controls `1px solid --sub-500`, replaced (not stacked) by the focus ring on focus. **Chrome casts no shadow.** The only elevation is the **modal/confirm dialog** (`0 16px 48px rgba(4,6,10,.6)` + scrim `rgba(6,8,12,.66)`) and the **ENGAGED band**, which sits as an inset-lit strip (`inset 0 -1px 0 --halt-500 @ 40%` bottom keyline) so it reads as lit signage, not a card.

### 2.5 Component vocabulary (the reusable set — referenced by name everywhere)

**2.5.1 Status pill.** A `--r-pill` chip `[glyph] LABEL` at `--fs-label`, tabular. One per state family. Outline+dot on dark; filled only inside a banner of the same family. Never color-only.
```
● ONLINE      (--ok dot)         ▲ WARN         (--attn)
◼ DISABLED    (--ink-500 dot)    ⛒ REVOKED      (--danger outline)
▮▮ FROZEN G1  (--halt interlock) ✕ ERROR        (--danger)
```
**Glyph-reservation rule (console-wide, non-negotiable).** The **⛔ glyph is reserved exclusively for *actionable* STOP / deny / kill affordances** — the header/banner STOP buttons, `⛔ DENY` / `⛔ KILL` audit rows, and the active-break-glass hazard banner. **⛔ MUST NOT appear on any "this capability does not exist / cannot be done by construction" statement** (see §2.5.10, §6.5, §6.8): those are *printed constitutional facts*, not controls, and are rendered with a **lock / shield glyph (🔒 / ⛊)** and no interactive affordance. Putting the STOP-action glyph on a non-actionable prohibition invites the operator to read a constitutional statement as a clickable toggle — the exact "disabled control implies latent capability" misreading the console forbids. Design must never let the two share a glyph.

**2.5.2 ENGAGED / SAFE-STOPPED band — the signature element.** A **full-width horizontal band** directly under the global header, sticky until the posture clears. Two members, visually related (both `--halt` gold, both calm interlock iconography), labelled distinctly:

*(a) KILL-SWITCH ENGAGED* (operator/guardrail pulled a stop):
```
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← --halt-edge striping
┃ ▮▮  KILL-SWITCH ENGAGED · G1 FREEZE-DESTRUCTIVE            epoch 4471 ┃
┃ Destructive & approve/execute paths are refused suite-wide.          ┃
┃ Benign reads + planning continue by design.                         ┃
┃ 21 confirmed · 3 pending(≤2m) · 1 draining        [ Review halt → ]  ┃
▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
```
*(b) SYSTEM SAFE-STOPPED* (a dependency is down → fail-closed; this is **Pattern D**, §4.5):
```
┃ ⛊  SYSTEM SAFE-STOPPED · Redis unreachable          since 12:04:11 ┃
┃ This is the safety system working, not an outage of the console.   ┃
┃ STILL TRUE: destructive paths fail closed · existing kill epochs   ┃
┃   still enforced (JWKS-kid, Redis-independent) · reads bounded.    ┃
┃ DO: identity edits are paused; STOP still works; see runbook ▸     ┃
```
Both use `--halt-tint` bg on `--sub-800`, `--halt-500` icon + keyline, `--halt-ink` text. Icon is **interlock ▮▮ / shield-check ⛊**, never ✕. `G2 QUIESCE-ALL` uses an intensified variant (heavier band, doubled interlock glyph, full edge striping) — still gold, never red — so "full stop" reads across the room. The engaged word uses `--fs-status`. `role="status"` / `aria-live="assertive"`.

**2.5.3 Honest-state chip set — `confirmed / pending / draining`.** The reusable triad rendering the **true** aftermath of any stop/revoke, everywhere counts of halted principals appear. **Always all three slots shown even at zero**, so `pending 0 · draining 0` is a *positive* statement of confirmed silence and a nonzero pending/draining can never hide.
```
┌───────────────┬───────────────────┬────────────────────┐
│ ✔ 21 CONFIRMED │ ◐ 3 PENDING ≤2m   │ ⇉ 1 DRAINING       │
│ RS-ack'd this  │ within TTL window │ in-flight past its │
│ epoch (green)  │ (amber, ◐ ring +  │ reversible instant │
│                │ tabular countdown)│ (violet, ⇉ arrows) │
└───────────────┴───────────────────┴────────────────────┘
   hover/expand → list which sub / which RS / which jti / which host
```
- **Confirmed** = RS acknowledged the current revocation `epoch` (green ✔).
- **Pending** = revocation written & fanned out, but the principal *may* still act on a benign fast-path token for up to its remaining TTL (≤2 min, PLAN §4.2); a tabular countdown (`01:47`) rides the chip. Amber ◐.
- **Draining** = a destructive/high-stakes action already past its last reversible instant; it will finish and be logged; the console shows *what* is draining on *which* host/ticket/`jti`. Violet ⇉.
- **Copy discipline (absolute):** never say "all agents stopped" while `pending > 0` or `draining > 0`. Total-silence wording is permitted only at `pending 0 · draining 0 · N confirmed`.

**2.5.4 Confirm-with-friction dialog.** The single mechanism gating every dangerous/irreversible operator action. Friction scales with blast radius (`role="alertdialog"`, consequence block as accessible description).
```
┌─ CONFIRM: LIFT KILL-SWITCH  (G1 → G0) ───────────────────────┐  ← danger header (--danger)
│  ⚠ CONSEQUENCE                                               │  plain language, exact scope,
│  Lifting the freeze RE-ENABLES destructive & approve/execute │  irreversibility, blast radius,
│  paths for 24 agents suite-wide. This moves the system       │  DIRECTION (toward MORE action),
│  toward MORE real-world action.                              │  and the live honest-state echo.
│  Right now: 21 confirmed halted · 3 pending · 1 draining.    │
│  Draining action on host `nas-01` will continue regardless.  │
│  Type the level you are lifting to confirm:  [▏        ]  G0 │  typed-intent gate
│  Re-authenticate (step-up):  🔑 passkey · auth_time fresh    │  step-up for high-stakes (§4.7)
│         [ Cancel ]                    [ Lift to G0 ]  ←danger │
└──────────────────────────────────────────────────────────────┘
```
Rules: (1) primary button **disabled until typed-intent matches** *and* step-up is fresh; (2) **Cancel is the default focus and `Esc` target** (safe default); (3) the consequence block always states *direction* ("toward MORE / LESS real-world action") and echoes the live honest-state counts; (4) **engaging a stop** (toward less action) uses the *light* variant — single confirm, signal-cyan primary, no typed intent; **lifting / break-glass / destroy** always uses the *full* variant — typed-intent + step-up + red primary.

**The halt is NEVER occluded by a modal (safety override, §2.7).** Every confirm/lift/restore/budget-edit dialog is modal with a scrim, **but the header halt affordance is exempt**: it renders **above the scrim and stays interactive** (either the scrim carries a cut-out around the halt control, or the halt control paints above the modal layer), so an operator who realizes an agent is going rogue *while a non-STOP dialog is open* can still STOP without first finding Cancel. In parallel, **`Shift+Esc` is a single-keystroke global escape hatch** (§2.7): from inside *any* non-STOP modal it **force-dismisses that modal back to a safe cancel AND focuses the header ENGAGE-FREEZE**, overriding the `role="alertdialog"` focus-trap by design. The **only** modal exempt from this force-dismiss is the §5.1 Halt Control panel itself (it already contains a live actuator). No dialog may ever be a barrier between the operator and the stop.

**2.5.5 Degraded banner.** The Pattern-D header member (§2.5.2b / §4.5): amber shield-check, "what's still true / what to do," names the specific down dependency (Redis / PDP / durable writer / IdP), never red, never a spinner.

**2.5.6 Live-freshness indicator.** Compact readout of revocation-propagation health (PLAN §4.6 heartbeat/epoch), aggregate in the header and per-RS on the Kill Switch screen.
```
Aggregate (header):   ⟳ epoch 4471 · fresh 312ms · 24/24 RS current
Per-RS (expanded):    board   epoch 4471 ✔ 0.3s    gateway epoch 4471 ✔ 0.2s
                      vault   epoch 4471 ✔ 0.4s    cmdb    epoch 4470 ▲ 1.9s STALE→fail-closed
```
A **stale** RS (past its staleness bound) is amber `▲ STALE → fail-closed` — the safe reading ("this RS is denying its destructive path," not "broken"). If the heartbeat itself is stale (auth can't confirm its own epoch), the indicator flips to halt-gold "cannot confirm freshness — treating as safe-stopped" and the console enters Pattern D.

**2.5.7 The halt affordance (global).** A dedicated always-present control in the header right (§3.1): a segmented **level gauge** `G0 · G1 · G2` with the current level lit, plus a primary **`◉ ENGAGE FREEZE (G1)`** button one motion from any screen.

- **The header primary button IS the press-and-hold actuator — not a panel-opener.** Press-and-hold **directly on the header `◉ ENGAGE FREEZE (G1)`** engages G1 in **one motion** (≈600ms dwell, §2.5.8); there is **no** intermediary panel to traverse, no card to locate under a scrim. This is the default emergency pull and it must be the same deterministic muscle-memory motion on every screen. (The §5.1 Halt Control *panel* exists only for the **secondary** choices — escalate to G2, switch to single-agent scope — and is opened by a small `⋯ options` affordance *adjacent* to the primary button; it is **never** a mandatory step for the default G1 stop.)
- **Post-engage state is explicit — the button never lies "not yet done."** Once G1 is engaged, the header primary control **relabels to reflect the current posture** — `▮▮ G1 ENGAGED · Review halt ▸` on halt gold — and a **distinct** `Escalate to G2 ▸` hold-actuator appears beside it. The control **must mirror the gold level-pill and ENGAGED band**: an operator reading only the button reads "it's engaged," never a stale `ENGAGE FREEZE (G1)` that could prompt a redundant re-press or an accidental unclear escalation. At G2 the primary relabels `▮▮▮▮ G2 ENGAGED · Review halt ▸` and no further escalation actuator is shown.
- Escalate-to-G2 (a distinct, explicitly-focused ~1000ms hold, §2.5.8) and **lift any level** live behind §2.5.4 friction.

**2.5.8 Press-and-hold actuator.** The engage/revoke mechanic reconciling "fast" with "not accidental": press-and-hold (mouse-down or `Space`/`Enter` keydown) fills a radial ring over a dwell time; release before completion = abort; completion = engaged. G1 dwell ≈ 600ms (pre-focused); G2 dwell ≈ 1000ms (must be explicitly focused first, never pre-focused). No typing on stops (typing is reserved for the dangerous direction). `prefers-reduced-motion`: the radial fill becomes a **segmented numeric countdown** that still enforces the dwell — deliberateness preserved, animation dropped.

**2.5.9 Data table.** Dense rows (`--sp-2` vertical), zebra `--sub-750`, sticky sortable header, mono identifier column with copy, right-aligned tabular numerics, row focus = `--signal-500` left-rail + full-row ring, bulk-select column for revoke/disable (bulk destructive → §2.5.4). Roving tabindex; virtualized past ~200 rows; reflows to stacked cards below ~640px.

**2.5.10 Immutable ConflictSet matrix.** A read-only, lock-glyphed matrix (§8.2/§8.3) with **no edit affordances rendered at all** — see §3.5 constraint 1 and §6.

### 2.6 Motion

| Token | Value | Use |
|---|---|---|
| `--mo-fast` | 120ms | Hover, focus ring, control state |
| `--mo-base` | 180ms | Panel/dialog open, banner slide-in |
| `--mo-slow` | 240ms | Scrim, bottom-sheet |
| `--ease-out` | `cubic-bezier(.2,.7,.3,1)` | Entrances |
| `--ease-inout` | `cubic-bezier(.4,0,.2,1)` | Reversible state |

The **ENGAGED band** slides down 180ms + one 1.6s amber breathing pulse on the icon, then settles static. The `pending` ◐ ring rotates slowly (2s). The only other animated elements are the settling row-flash (pending→confirmed) and the hold-actuator radial fill. **`prefers-reduced-motion` (explicit fallback):** all transitions → 0ms/opacity-only; ENGAGED band appears instantly and does not pulse; ◐ ring does not rotate (countdown digits alone convey liveness); freshness `⟳` becomes static with the age number ticking; row transitions are instant glyph swaps; hold-actuator uses the numeric countdown. **Focus rings always render — they are state, not motion.** Loading uses static skeletons.

### 2.7 Accessibility quality floor (concrete, non-negotiable)

- **Responsive to ~375px** with no horizontal scroll ever (§3.3).
- **Always-visible keyboard focus:** 2px `--signal-500` ring, 2px offset, + 4px `--signal-glow @35%` halo, on every focusable element; never `outline:none` without replacement. Inside a gold band, insert a 1px `--sub-950` spacer so the ring holds ≥3:1.
- **WCAG AA contrast:** body/label ≥4.5:1; large text/pips/rings ≥3:1 (values §2.1).
- **Alarm/danger never color-only:** every state = color + icon + text label. Fully legible in grayscale and to color-blind operators.
- **Keyboard:** full operability; the halt affordance has a global shortcut (`Shift+Esc`) that **focuses** the ENGAGE-FREEZE control from anywhere and **never fires** a stop (focusing, not actuating, keeps it panic-safe). Critically, `Shift+Esc` is also a **global escape hatch**: pressed while any *non-STOP* modal is open (confirm/lift/restore/budget-edit/panels), it **force-dismisses that modal to a safe cancel and lands focus on the header ENGAGE-FREEZE in one keystroke**, explicitly overriding the modal's `alertdialog` focus-trap so the "from anywhere" guarantee is real, not defeated by trapping. It does **not** dismiss the §5.1 Halt Control panel (which is itself the actuator). Logical tab order; roving tabindex in tables; plain `Esc` closes dialogs to the safe (Cancel) default.
- **Screen-reader semantics:** ENGAGED band + degraded banner are `role="status"` / `aria-live="assertive"`; honest-state counts announce "21 confirmed halted, 3 pending within 2 minutes, 1 draining." Confirm dialogs are `role="alertdialog"`; a disabled primary button's reason is announced.
- **Touch:** ≥44×44px targets on mobile; the halt control is thumb-reachable and never collapses behind a menu on any breakpoint.
- **Timing/staleness:** any TTL countdown or freshness age is exposed as text for AT; no state depends solely on an animated pulse.

---

## 3. Global shell & information architecture

### 3.1 The persistent Global System-State Header (always visible, every screen)

A fixed top bar (`--sub-800`, hairline bottom) present on **every** screen including loading, empty, error, and degraded states. It is the operator's constant ground truth and the fastest path to STOP. Left→right, three always-present zones:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│  auth ▸ IDENTITY GATEWAY     │  SYSTEM STATE                    │           KILL-SWITCH            │
│  ┌───────────────────────┐   │  DEPS  ⛊ HEALTHY  ⟳ ep 4471      │   ┌─────────────────────────┐    │
│  │ [G0 ARMED]  ← lit     │   │  fresh 312ms · 24/24 RS current  │   │ G0 ● │ G1 ○ │ G2 ○      │    │
│  └───────────────────────┘   │  Redis ✔ PDP ✔ writer ✔ IdP ✔    │   └─────────────────────────┘    │
│  operator: op:eide 🔑fresh   │  FLEET ● nominal  (0 flagged)    │   [ ◉ ENGAGE FREEZE (G1) ]  ←cyan│
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
        …during a rogue-agent incident the FLEET line goes ▲ amber:
│  DEPS ⛊ HEALTHY  …            │  FLEET ▲ 2 AGENTS FLAGGED ▸  (deny-storm ×1 · budget-trip ×1)     │
```

> **Two independent truths, never conflated (finding-driven).** The center zone now carries **two separate readouts** so `⛊ HEALTHY` can never imply the fleet is quiet: **`DEPS`** = *auth's own dependency health* (Redis/PDP/writer/IdP + freshness — Pattern-D driver), and **`FLEET`** = *live agent-behavior health*. It is entirely possible (and must read clearly) that **DEPS ⛊ HEALTHY while FLEET ▲ FLAGGED**.

1. **Kill-switch LEVEL readout** (left, `--fs-status` — the console's single loudest word):
   - `G0 ARMED` — steady state. Calm `--ink-700` word on a quiet `--sub-750` pill with a small `--ok-500` armed-dot. "Armed" (not "OK/normal") because a safety system at rest is *armed and ready*, priming the operator that a stop exists.
   - `G1 FREEZE-DESTRUCTIVE — ENGAGED` — pill turns `--halt` gold with the interlock ▮▮ glyph; the full ENGAGED band (§2.5.2a) drops below the header.
   - `G2 QUIESCE-ALL — ENGAGED` — gold intensified (heavier band, edge striping, doubled interlock). Reads "full stop" across the room. (Read-only mirror of MC's authoritative level for the *global* switch; auth's own L1 identity stop is actuated here.)
2. **SYSTEM-HEALTH / degraded one-glance indicator** (center, `DEPS` line): `⛊ HEALTHY` (green shield) when all deps up; flips to `⛊ SAFE-STOPPED — <dep>` (halt gold shield-check) the instant Redis/PDP/durable-writer/IdP is unreachable (Pattern D). Adjacent: the **live-freshness indicator** (§2.5.6) aggregate + four dependency dots (`Redis · PDP · writer · IdP`), each `--ok`/`--attn`/`--halt`. This is the "is the system telling me the truth right now?" glance. It distinguishes *engaged-by-operator* (gold band, "working as intended") from *safe-stopped-by-dependency-loss* (gold shield + Pattern D) — two golds-of-meaning with different icons and copy, never conflated, never red. **This line reports auth's dependency health ONLY — never fleet behavior.**
   - **2a. FLEET-ANOMALY indicator** (center, `FLEET` line — persistent on EVERY screen): the cross-screen live-misbehavior signal. `● nominal (0 flagged)` in calm `--ink-700` when no principal is misbehaving; flips to **`▲ N AGENTS FLAGGED ▸`** (amber `--attn`, triangle-bang icon + count + word — never color-only) the instant the fleet-anomaly detectors fire. Driven by the **exact same signals** as the Timeline anomaly cues (§7.1): **deny-storm** per `sub`, **budget trips**, **mint anomalies / off-host mint**, **SSD-rejects**, and **`▲ high activity`** permit-rate spikes (§7.1). It is an **unacknowledged-incident counter**: a flagged principal stays counted until the operator **views/dispositions** it (opens its Principal Oversight §7.3, or revokes/disables it); it does not silently self-clear when the burst stops, so a rogue that flared while the operator was elsewhere is not lost. Clicking it opens the **Timeline pre-filtered to the flagged principals** (§7.1). The default thresholds are those defined in §7.1 (shown in the indicator's tooltip); on-screen (Timeline) and cross-screen (header) signals use one shared threshold set so they can never disagree. Because DEPS and FLEET are separate, `⛊ HEALTHY` can never mean "the fleet is quiet."
3. **The fastest path to halt** (right): the halt affordance (§2.5.7) — `G0·G1·G2` gauge showing current level + a one-motion **`◉ ENGAGE FREEZE (G1)`** primary button (signal-cyan when armed) that **is itself the press-and-hold actuator** (hold it directly → G1 engaged in one motion; no panel to open first, §2.5.7/§3.4). Pinned to the header on **every breakpoint** and rendered **above any modal scrim** so it is never occluded (§2.5.4); target of the global `Shift+Esc` focus shortcut and escape hatch (§2.7). **After G1 engages** the button relabels to `▮▮ G1 ENGAGED · Review halt ▸` (gold) with a distinct `Escalate to G2 ▸` hold-actuator beside it — it never keeps reading `ENGAGE FREEZE (G1)` once engaged (§2.5.7). Details §3.4.

Also in the header: **operator identity + step-up freshness** (`op:eide · 🔑 fresh` / `🔑 re-auth needed`) so the operator sees at a glance whether a high-stakes action will challenge them (PLAN §4.7); and a **break-glass indicator** (`break-glass: —` normally; `◆ BREAK-GLASS ACTIVE (op:eide, 6m left)` in red when a session is live, linking to that session).

> **Honesty in the header:** the header **never** shows a green "all agents stopped." When a stop is engaged, the level pill goes gold and the ENGAGED band carries the honest triad (§2.5.3).

### 3.2 Primary navigation / IA

A fixed left rail (224px open / 56px icon-only collapsed), `--sub-800`. Seven areas in **safety-first order** (stop at the top, administration below) — the order *encodes* the principle: in an emergency the operator's hand goes up-and-left, toward the stop, never hunting through admin.

```
┌──────────────────────────┐
│  ⌂  OVERVIEW  (§3.6)     │  System-state dashboard: fleet at a glance, honest state,
│                          │      standing hazards, flagged principals, quick STOP.
│  ⦿  KILL SWITCH &        │  ← the safety heart. Graduated G0/G1/G2, per-RS freshness,
│     REVOCATION           │      live denylist, surgical + bulk revoke, honest board.
│  ⛨  BREAK-GLASS          │  Offline-factor entry; STOP/RESTORE only; heavily audited.
│                          │      No approve/execute relax path exists here.
│  ▤  AUDIT · WHO DID THIS │  Authoritative cross-suite log; filter sub/client_id/aud/
│                          │      action; traceparent correlation; live vs historical.
│  ⋔  IDENTITIES           │  Principals (human/agent/service/break-glass); per-agent
│                          │      key lifecycle + attestation; create/disable.
│  ⚿  ROLES & SCOPES       │  Role catalog, grants, live SSD prevention; the immutable
│                          │      holder ConflictSet (read-only, cannot be relaxed).
│  ◷  BUDGETS              │  Compute/rate/concurrency/cooldown/lifetime; live headroom
│                          │      beside static limit. No dollars.
│  ─────────────────────   │
│  ⚙  session · sign out   │
└──────────────────────────┘
```

- Active item: `--signal-500` left-rail bar + `--signal-tint` wash + `--ink-900` label. Collapsed rail shows glyphs + tooltips; the **KILL SWITCH** glyph keeps a gold ring when any level > G0, so the collapsed rail still screams "engaged."
- **Break-glass** is visually set apart (hairline separator, `--danger`-outlined lock glyph) — reachable but never adjacent to routine actions; entering it is Pattern-heavy friction (§2.5.4 + offline factor).

### 3.3 Responsive behavior (down to ~375px)

- **≥1200px:** header + fixed rail (224px) + content. Kill gauge shows all three levels + labels.
- **768–1200px:** rail auto-collapses to 56px icon rail; header freshness compresses to `⟳ 4471 · 312ms · 24/24`.
- **<768px (incl. ~375px):** rail becomes a top hamburger **drawer**; content single-column; data tables reflow to stacked cards (identifier + status pill + primary action per card); never horizontal-scroll.
  - **The halt affordance NEVER collapses into the drawer.** On the narrowest screen the header keeps a persistent, thumb-reachable **`◉ FREEZE`** button + a compact level chip (`G1 ▮▮`). This is the one element exempt from mobile de-cluttering.
  - The ENGAGED / degraded band stays full-width and sticky; copy stacks vertically; the honest triad wraps to three rows but keeps all three visible.
  - Confirm-with-friction dialogs become full-screen sheets; typed-intent + step-up remain; Cancel stays the default/back action.

### 3.4 The halt affordance in detail (fastest path to STOP)

- **Engage G1 = one motion, on the header button itself.** From any screen: **press-and-hold the header `◉ ENGAGE FREEZE (G1)` directly** (or `Shift+Esc` to focus it, then hold) → the dwell completes (≈600ms, §2.5.8) → engaged. The header button **is** the actuator; there is **no** panel to open, locate a card in, and target under a scrim first. This is the single deterministic muscle-memory motion, identical on every screen and breakpoint. Consequence scope ("destructive & approve/execute refused suite-wide; reads continue") is printed beside the button and read *while* holding. The press-and-hold is what makes it fast yet accident-proof — no stray single click quiesces the suite, and typing is never required for a stop. (The §5.1 panel is opened only via a small `⋯ options` affordance for the *secondary* choices — escalate-to-G2 or single-agent scope — never as a step in the default G1 stop.)
- **Escalate to G2** = a distinct, explicitly-focused ~1000ms hold-actuator (§2.5.8), never a bare second press; **lift any level = full friction** (§2.5.4: typed-intent + step-up + red primary).
- **Honesty on actuation:** the instant a stop is written (write-before-ack, PLAN §4.6 — the actuator shows a brief `◴ committing…` until *both* the durable ledger append and the authoritative Redis SET commit — **or, when Redis is down, until the signed kill-epoch raise is durably committed**, see below), the ENGAGED band appears with `N confirmed · M pending · K draining` and resolves pending→confirmed as RS acks arrive. The control **never** flashes a green "Stopped ✓," and — per §2.5.7 — relabels to `▮▮ G1 ENGAGED · Review halt ▸` so the button itself reports the true post-action state.
- **Layer honesty:** a subhead states plainly — *"Engages the identity-layer stop (L1). Physical execution stop (L2) bites independently at the Gateway; the cross-layer global switch is co-owned with Mission Control."* (PLAN §7.1) — so the operator is never misled that this one control is the entire kill. From auth, the *global* switch is a labeled hand-off link to Mission Control; auth owns L1 + per-principal revocation.
- **Redis-independent, still ONE motion (finding-driven, the load-bearing fix).** If freshness shows **Redis down but auth itself is up** (writer/verify/IdP reachable, operator still authenticated), the header `◉ ENGAGE FREEZE (G1)` **stays a one-motion press-and-hold** — the *same* motion — except it now performs the **signed kill-epoch raise** (JWKS / AS-metadata / forward-auth header, Redis-independent, PLAN §7.3) instead of a Redis SET. **No typed intent, no offline hardware factor** is required for this path; the low-friction stop the operator already knows still works, and the button's helper text updates to *"STOP via signed kill epoch — Redis-independent."* The **offline-factor break-glass** path (§6) is reserved for the *different* failure where **auth itself (login/verify) is down** — it is not required merely because Redis is down. The console states this distinction explicitly wherever a degraded STOP is offered (§5.1-D, §5.5).

### 3.5 Two settled cross-screen constraints the shell hard-codes

1. **The immutable SoD ConflictSet — the relax capability visibly does not exist** (Decision #5). In **Roles & Scopes** and **Break-glass**, the four holder ConflictPairs render as a **read-only, lock-glyphed matrix** captioned *"Immutable — compiled-in. Cannot be edited, weakened, or disabled from this console."* There is **no** edit control, no toggle, no "advanced" affordance, no disabled-but-present button — the widget for relaxing it is simply **not rendered**. Break-glass presents **STOP** and **RESTORE** directions only. Conflicting grants are prevented **at input time** (the grant control disables with an inline explanation of *which* existing grant conflicts and why), not merely rejected on submit. The operator can never find, even by hunting, a path to co-hold approve+execute.
2. **Direction-aware friction, globally.** The shell classifies every operator action as **toward-less-action** (engage stop, revoke, disable, freeze — *safe*) or **toward-more-action** (lift a stop, re-enable, break-glass restore, widen a scope/budget, create a holder principal — *dangerous*). Safe-direction → **light** confirm (single step, signal-cyan). Dangerous-direction → **full** confirm-with-friction (§2.5.4). This is a shell-level property so every screen inherits "safe is easy, dangerous is deliberate" without re-litigating per screen.

### 3.6 Screen — Overview / landing dashboard (the fleet-at-a-glance oversight surface)

The **first screen the operator lands on** and the console's answer to *"is the whole agent workforce healthy right now, and if not, who — in one glance?"* It does not do live task cockpit work (that is Mission Control); it is the **identity/safety window into the fleet**. Composed of standing tiles, each row **pivoting into its drill-down**. It is a first-class specified screen (not deferred), with all five states.

```
┌ Global System-State Header (§3.1, pinned) ────────────────────────────────────────────────┐
├────────────────────────────────────────────────────────────────────────────────────────────┤
│  ┌── HALT POSTURE ───────────────────────────┐  ┌── STANDING HAZARDS ───────────────────┐  │
│  │ ● G0 ARMED · epoch 4471 · 24/24 RS fresh   │  │ ⚠ 1 SOFT-KEY NO-GO   patcher-09  ▸     │  │
│  │   No halt engaged.  [ ◉ FREEZE (Shift+Esc) │  │ ▮▮ 0 auto-frozen agents                │  │
│  │   — hold to stop the suite ]               │  │ ⊘ 0 SoD drift detected (reconcile ✔ 3s)│  │
│  │  (if engaged: the honest triad renders here │  │ 🔑 IdP ✔ · writer ✔ · Redis ✔          │  │
│  │   — ✔N confirmed ◐M pending ⇉K draining —   │  └─────────────────────────────────────────┘  │
│  │   plus Triggered-by if guardrail-initiated) │  ┌── FLEET ROSTER ───────────────────────┐  │
│  └────────────────────────────────────────────┘  │ agents  18  (●16 active ·◼2 disabled) │  │
│  ┌── FLAGGED PRINCIPALS (unacked) ───────────┐  │ services 4 · humans 1 · break-glass 1 │  │
│  │ ▲ patcher-07  6 denies/40s  self_approval  │  │ executors 7 · planners 9 · other 2    │  │
│  │              [ view ▸ ] [ revoke ▸ ]        │  └─────────────────────────────────────────┘  │
│  │ ▲ crawler-02  budget concurrency trip ×3   │  ┌── BUDGET-HEADROOM OUTLIERS ───────────┐  │
│  │              [ view ▸ ] [ revoke ▸ ]        │  │ planner-02  ▓░░░ 20% rate  · near cap ▸│  │
│  │ (empty → ● No flagged principals — fleet    │  │ crawler-02  ▓▓▓▓ 88% conc  · trip ▸    │  │
│  │  behavior nominal in this window.)          │  └─────────────────────────────────────────┘  │
│  └────────────────────────────────────────────┘  ┌── RECENT OVERSIGHT EVENTS ────────────┐  │
│                                                    │ 16:42 ⛔ DENY gateway:execute patcher-07│  │
│                                                    │ 16:41 ◆ ANOMALY mint off-host ▸        │  │
│                                                    │ … → Full timeline ▸                    │  │
│                                                    └─────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Tiles (each pivots into a drill-down):**
1. **Halt posture** — the honest resting `G0 ARMED` state *or*, if any level is engaged, the honest triad (§2.5.3) + benign-window + the `Triggered by:` attribution block when guardrail-initiated (§5.2); a one-motion `◉ FREEZE` hold-actuator is present here too. Pivots to §5.2.
2. **Standing hazards rollup** — the aggregate the drill-downs lacked: **count of soft-key NO-GO executors** (§8.1.1, pivots to the filtered Identities list), **count of frozen / auto-frozen agents**, **SoD drift count** with reconciliation freshness (§8.2.1), and the four dependency dots. Any nonzero hazard is amber+icon+text and pinned to the top.
3. **Flagged principals (unacknowledged)** — the same unacked-incident set as the header FLEET indicator (§3.1-2a): each flagged `sub` with its reason (deny-storm / budget trip / mint anomaly / SSD-reject / high activity) and inline `view ▸` (Principal Oversight §7.3) + `revoke ▸` (§5.3). Stays until dispositioned.
4. **Fleet roster / health tiles** — agents by status (active vs disabled) and by class (executor/planner/other), plus service/human/break-glass counts. Pivots to Identities.
5. **Budget-headroom outliers** — the principals nearest a cap or newly tripped (§8.3), each pivoting to its budget detail.
6. **Recent oversight-event strip** — the last few Signal-level events (§7.1), pivoting to the full Timeline.

**STATES — Overview:** **L** — header live; tiles skeleton; halt-posture + flagged tiles resolve first (they carry the safety signal). **E** — the *good* quiet fleet: `● Fleet behavior nominal — no flagged principals, no standing hazards, no halt engaged in this window.` (positive fact, never a blank). **P** — as drawn. **R** — a tile whose query fails shows a tile-scoped `couldn't load — retry` **without collapsing the screen**; the halt-posture and flagged-principals tiles are prioritized and the header stays live. **D** — Pattern D banner; the **halt-posture tile keeps a live one-motion STOP**, `revoke ▸` stays available (durable write-before-ack, emergency direction); live tiles (budget headroom, fleet counts sourced from Redis) render `last-known @ epoch … — counters stale` (greyed, never fabricated); **standing-hazard badges (soft-key NO-GO, auto-frozen) stay visible** — a degraded system must still show standing hazards. Safe-stopped, not blind.

---

## 4. The reusable STATE MODEL (named patterns)

Every screen declares its five states by **referencing these patterns** (e.g. *"empty: Pattern E; degraded: Pattern D"*) instead of re-describing them. **Every screen must specify all five.** The load-bearing one is **Pattern D**.

> **The critical conceptual split: Pattern R (error) ≠ Pattern D (degraded).** Pattern R = *"your action didn't apply / something you can fix"* — local, recoverable, **red**, the operator's problem. Pattern D = *"a dependency is down, so the system safe-stopped"* — systemic, **amber-gold, not red**, the safety system *working*. Never render a dependency outage as a red error. This distinction is the honesty core of the console.

### 4.1 Pattern L — Loading
Static **skeleton** matching the final layout (the header is real and live — **never** skeletoned; the operator must always see true system state and the halt affordance while a panel loads). Skeleton blocks `--sub-750` @60%, no shimmer under reduced-motion (single 1.2s opacity breathe otherwise). Known-live counts/epochs (from the header stream) render immediately; only panel-specific lists skeleton. Never blocks the halt affordance. Timeout → if the *data* endpoint is slow but auth is healthy, show a quiet inline "still loading…"; if a *dependency* is unreachable, transition to **Pattern D**, not a spinner-forever.

### 4.2 Pattern E — Empty
Centered, calm: outline glyph (`--ink-500`), `--fs-h1` headline, one line of `--fs-body` `--ink-600` explanation, and (if applicable) one primary **safe** action. Copy is specific and phrased as a *positive fact*: e.g. *"No principals disabled. The denylist is empty — every issued token is currently honored."* **Empty ≠ degraded:** an empty denylist because nothing is revoked (E) must never look like an empty denylist because Redis is unreadable (D). If the source can't be confirmed, it is **D**, not E.

### 4.3 Pattern P — Populated
Normal data state: tables/panels per §2.5.9, live values with tabular figures, status pills, honest-state chips where stops are shown. Live regions update in place (epoch, freshness, countdowns) without full reloads.

### 4.4 Pattern R — Error (recoverable, local, the operator's action)
**Inline banner** (not the header band): `--danger-tint` fill, 3px `--danger-500` left-border, ✕/⚠ glyph, `--ink-900` text + the machine reason in mono, surfaced **verbatim** from PLAN §5.6 semantics (`409 in_progress`, `403 dual_holder_forbidden`, `self_approval_forbidden`, `approval_consumed`, `budget_exhausted`, …). Scoped to the failed action (field/row/dialog) — never takes over the screen. Always states recovery, or — for policy denies — *"this is terminal — a wider scope will not help; file an escalation"* (an SoD deny must never read like "get more permission"). Distinct from D by **color (red vs gold), scope (local vs banner), icon (✕/⚠ vs interlock/shield)**.

### 4.5 Pattern D — DEGRADED / FAIL-CLOSED — *"SAFE-STOPPED, not broken"*
The state that proves this is a safety console. Triggered when auth or a dependency it needs is unavailable: **Redis** (denylist/counters), **PDP/Cedar**, the **durable writer** (SQLite→Postgres), or the **IdP** (PLAN §7.5, §7.6, §12.2). Contract:

- **Whole-console, not a toast.** The header center flips to `⛊ SAFE-STOPPED — <dependency>` (halt gold shield-check — never ✕, never red), and the **degraded banner** (§2.5.2b) drops full-width and sticky. Affected panels dim to read-only with an inset gold "paused" note pointing back to the banner.
- **Framed as the safety system working.** Headline `SYSTEM SAFE-STOPPED — <dep> unreachable`; subhead *"This is the safety system working, not a failure of the console."*
- **Say what is STILL TRUE:** destructive/approve/execute/redeem paths **fail closed** suite-wide; any already-engaged kill level **still holds**, enforced Redis-independently via **JWKS-`kid` prune + signed kill epoch** (PLAN §7.3); benign reads continue **bounded** (local in-process ceiling, PLAN §6.2); introspection still answers **correctly** (revoked stays revoked) from the durable mirror (PLAN §4.6) — degraded-but-correct, not blind.
- **Say what to DO (never a dead end):** which dependency is down and what it blocks now; **STOP still works** (halt affordance stays live, banner reiterates Redis-independent propagation); **Break-glass is reachable** (offline factor, does not depend on auth's live services) — linked directly; link the **out-of-band operator runbook** (Stage-7 deliverable, accepted residual PLAN §12.2) for legitimate emergency remediation that can't run in-band.
- **Honesty about the ≤2-min window (accepted residual):** if degraded coincides with an engaged stop, the honest triad still renders, and pending explicitly notes *"benign tokens already issued stay valid ≤ one agent TTL (≤2 min) until the JWKS-kid prune bounds them."*
- **Never:** a red error screen, a bare spinner, a generic "Something went wrong," or a blank table. A dependency outage here is a *posture*, not a *crash*. **Full outage vs partial stale-RS are distinguished** (a partial-freshness condition reads `▲ N/24 RS STALE — those RS are failing their destructive path closed` and lists which `aud` are stale).

```
┌ HEADER: G1 pill (if engaged) | ⛊ SAFE-STOPPED — Redis | ◉ FREEZE (live) ┐
├───────────────────────────────────────────────────────────────────────┤
│ ⛊  SYSTEM SAFE-STOPPED — Redis unreachable            since 12:04:11    │  ← halt gold band
│ This is the safety system working, not a failure of the console.       │     shield-check icon
│ STILL TRUE  ✔ destructive · approve · execute · redeem → fail CLOSED    │
│             ✔ engaged kill epochs still enforced (JWKS-kid, no Redis)   │
│             ✔ benign reads continue, locally bounded                    │
│             ✔ revoked tokens still introspect as revoked (durable)      │
│ DO          ▸ STOP still works (Redis-independent)   ▸ Break-glass ▸    │
│             ▸ Identity/budget EDITS are paused until Redis returns      │
│             ▸ Emergency remediation → operator runbook ▸                │
└───────────────────────────────────────────────────────────────────────┘
```

### 4.6 State-pattern quick-reference (every screen fills this)

| Pattern | Meaning | Color family | Icon | Scope | Key rule |
|---|---|---|---|---|---|
| **L** Loading | fetching panel data | substrate/neutral | skeleton | panel | header stays live; slow-dep → D not spinner |
| **E** Empty | no rows, source confirmed | neutral | outline glyph | panel | phrase as a positive fact; if source unconfirmed → D |
| **P** Populated | live data | neutral + semantics | pills/chips | panel | tabular figures; honest triad where stops shown |
| **R** Error | operator action failed, recoverable | **red** | ✕ / ⚠ | local | machine reason verbatim; states recovery; ≠ D |
| **D** Degraded | dependency down, fail-closed | **halt gold** | ⛊ interlock/shield | whole console | SAFE-STOPPED not broken; what's-still-true + what-to-do; STOP + break-glass live |

---

## 5. Kill switch & revocation (the hardest, most detailed section)

**The governing idea for this surface:** the kill switch is the SAFE action, so it is EASY (one motion, no typing, reachable everywhere). Lifting a halt / re-enabling / break-glass-restore is the DANGEROUS action, so it is DELIBERATE (typed intent, consequence, step-up). Relaxing approve⊕execute separation does not exist. Two things must never happen here: (1) render a state implying instant total silence; (2) render a dependency outage as "broken."

### 5.1 Screen — The Halt Control (engage flow)

**The default G1 stop does NOT require this panel.** Per §2.5.7/§3.4, the header `◉ ENGAGE FREEZE (G1)` is itself the one-motion press-and-hold actuator; engaging G1 is a direct hold on the header, no panel traversal. **This panel is opened only for the SECONDARY choices** — escalate to G2, or switch to single-agent (surgical) scope — via the small `⋯ options` affordance adjacent to the header button. It opens as a focused panel over a dimmed scrim (desktop: right-anchored ~420px sheet; mobile: full-screen sheet). It is a **control**, not a wizard — everything needed is on one surface: consequence statement + actuators. (Because the header halt stays live above the scrim per §2.5.4, opening this panel never removes the operator's one-motion G1 stop.)

```
┌─ HALT CONTROL ──────────────────────────────  epoch 4471 · G0 ─┐
│  Choose a stop depth. Engaging is immediate; lifting is not.    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▮▮ G1 · FREEZE DESTRUCTIVE          (default·recommended)  │  │
│  │    Stop the hands, keep thinking.                          │  │
│  │    DENIES suite-wide: gateway:execute · vault:redeem ·     │  │
│  │                       board:approve→execute chains         │  │
│  │    STILL ALLOWED:     benign reads · planning              │  │
│  │        ┌─────────────────────────────────────┐            │  │
│  │        │  ◯  HOLD TO ENGAGE  (0.6s)           │ ← radial   │  │
│  │        └─────────────────────────────────────┘    fill    │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ ▮▮▮▮ G2 · FULL STOP (quiesce-all)                          │  │
│  │    Suspected suite compromise. Denies ALL agent tokens.    │  │
│  │    Only humans + break-glass remain.                       │  │
│  │        ┌─────────────────────────────────────┐            │  │
│  │        │  ▮▮  HOLD TO FULL-STOP  (1.0s)       │            │  │
│  │        └─────────────────────────────────────┘            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  Scope:  ◉ Global (whole suite)   ○ Single agent…              │
│  ───────────────────────────────────────────────────────────  │
│  This is the STOP direction. There is no option here to relax  │
│  approval/execution separation — that capability does not exist.│
│  If Redis is down: the G1/G2 holds above still work (signed     │
│  kill epoch, Redis-independent — no typed intent, no HW key).   │
│  Break-glass STOP ▸  (offline factor — only if auth login/verify│
│                       itself is down)                           │
└─────────────────────────────────────────────────────────────────┘
```

**How engaging works — fast but not accidental** (§2.5.8): G1 actuator pre-focused; consequence text already on screen (read *while* acting — the hold *is* the "read the consequence" beat, so friction and honesty are one motion). Press-and-hold fills the ring; release-before-complete aborts (no state change); completion → straight to the Status Board (§5.2). G1 ≈600ms, pre-focused; G2 ≈1000ms and must be Tab-focused first (never pre-focused) — larger blast radius earns a larger, distinct motion, still with no typing. On engage, **write-before-ack** (PLAN §4.6): `◴ committing…` until both the durable ledger append **and** authoritative Redis SET commit — only then does the board render "engaged." The UI never claims engagement before the ledger is source of truth. (Redis down → emergency Redis-independent path §5.5, panel says so.)

**Scope selector** switches the same actuator to a **surgical** engage (typeahead over `sub`/`client_id`); the actuator relabels `HOLD TO FREEZE agent:patcher-07` and routes to Per-Agent Revocation (§5.3) — one muscle memory for all stops.

**The capability that must visibly not exist:** at the bottom, where an eye might hunt for an "advanced / override SoD" affordance, there is a **plain declarative line** — *"There is no option here to relax approval/execution separation — that capability does not exist."* Not a disabled button (a greyed control implies latent capability) — **absence with a one-line explanation.**

**STATES — Halt Control:** **L** — panel opens instantly with actuators **live**; if epoch/level is still loading the panel header shows `epoch …` but actuators are usable; consequence copy is static (never fetched). **E** — N/A (always actionable). **P** — as drawn. **R** — partial commit (ledger ok, Redis SET failed, or vice-versa) **does not show success**: `⚠ engage did not fully commit — retry, or use the signed-kill-epoch STOP`, actuator stays hot, Redis-independent path surfaced. **D — Redis-independent STOP (signed kill epoch)** *(renamed from "Break-glass STOP mode")*: when **Redis is down but auth is up**, the panel's global G1/G2 actuators remain **one-motion press-and-hold with NO typed intent and NO offline factor**, badged `via signed kill epoch + JWKS kid-prune (Redis-independent)`. This is the *same low-friction motion* — the header G1 hold performs it too (§3.4). The offline-factor **break-glass** path is **not** required here and is shown only as a secondary link labeled *"Break-glass (offline factor) — only needed if auth login/verify itself is down."* The single-agent (surgical) scope is disabled with a fail-closed explanation (surgical denylist writes need Redis); the operator is pointed to the still-available broader Redis-independent stop. STOP stays easy; the panel says exactly *how* and *why the offline factor is not needed*.

### 5.2 Screen — Halt Status Board (the honest post-action state) — *spec'd hardest*

After any engage or revoke the operator lands here. Its entire job is to tell the truth about what is actually stopped vs still settling, and to never imply silence the token model can't deliver.

```
┌─ HALT STATUS ─────────────────────────────────  epoch 4471 · engaged 00:12 ago ─┐
│  ▮▮ FREEZE DESTRUCTIVE (G1) · engaged by op:eide · reason: "runaway patcher"     │
│  ┌── TRIGGERED BY (shown when guardrail-initiated) ───────────────────────────┐ │
│  │  ◆ AUTO-FREEZE · principal agent:patcher-07 · reason: mint off-host          │ │
│  │  Response: SUITE-WIDE G1 (whole fleet frozen by ONE agent's key anomaly).    │ │
│  │  Contain the culprit, then lift:  [ Revoke patcher-07 / disable key ▸ ]      │ │
│  │                                    [ View principal ▸ ]                      │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│  ┌── WHAT IS STOPPED ─────────────────────────────────────────────────────────┐ │
│  │  L1 · Identity/PDP stop      APPLIED     denylist written · epoch 4471 SET   │ │
│  │  L2 · Gateway physical stop  CONFIRMED   source: Gateway/MC mirror · 0.4s ago│ │
│  │        (Either layer alone halts action — PLAN §7.1. L2 is a READ-ONLY       │ │
│  │         mirror; freshness qualified below.)                                 │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│  ┌── AGENTS (honest triad §2.5.3) ────────────────────────────────────────────┐ │
│  │   ✔  21  CONFIRMED HALTED    denylist applied · epoch acked                  │ │
│  │   ◐   3  PENDING ≤2m         not-yet-acked epoch (rows below)                │ │
│  │   ⇉   1  DRAINING            in-flight action on a HIGH-STAKES path          │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│  ┌── BENIGN-TOKEN STALENESS WINDOW ───────────────────────────────────────────┐ │
│  │   ⧗ 01:47 remaining · ends 15:42:09                                          │ │
│  │   Agents may still complete BENIGN READS on tokens issued before the halt    │ │
│  │   until they expire (≤ agent TTL ~2 min, PLAN §4.2). Every destructive,      │ │
│  │   approve, and redeem path is ALREADY blocked and live-checked. Expected.    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│  ┌── PER-RESOURCE-SERVER FRESHNESS (epoch 4471) ──────────────────────────────┐ │
│  │  RS         acked   lag    live-check     status                             │ │
│  │  gateway    4471    0.3s   enforcing      ✔ fresh                            │ │
│  │  vault      4471    0.4s   enforcing      ✔ fresh                            │ │
│  │  cmdb       4470    2.1s   stale→closed   ◐ catching up                      │ │
│  │  drive      4469    6.8s   stale→closed   ▲ resubscribing                    │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
│  [ Escalate to G2 · Full stop ▸ ]         [ Lift halt… (deliberate) ▸ ]          │
└──────────────────────────────────────────────────────────────────────────────────┘
```

**Triggered-by attribution (finding-driven, shown only for guardrail-initiated halts).** Because a single agent's mint-anomaly can auto-fire a **suite-wide** G1 (PLAN §3.6/§7.8), the board — the surface the operator lands on after a stop — must make the culprit and the fix immediately actionable, not something to reconstruct from the audit stream while the whole suite is frozen. When the halt was guardrail-initiated, a `TRIGGERED BY` block names **the principal**, **the anomaly reason** (off-host mint / mint-rate spike / new origin), and **states in plain copy whether the response was a suite-wide G1 or a targeted per-key auto-revoke** — so "is this a whole-fleet stop caused by one agent, or a targeted stop?" is unambiguous. It carries a one-click `Revoke <sub> / disable key ▸` and `View principal ▸`. The same attribution rides the header auto-freeze state (`▲ G1 FREEZE (auto) — patcher-07 ▸`). Operator-initiated halts omit this block (the header already names the operator + reason).

**Four honesty devices (each maps to a PLAN mechanism):**
1. **L1-applied vs L2-confirmed — with L2 freshness discipline** (PLAN §7.1, §1.2). Two independent rows, because either layer alone stops action and the operator must see *both* landed. L1 can be `APPLIED` while L2 is still `PENDING`; never collapse into one check. **auth holds only a read-only MIRROR of the L2 Gateway posture** (the kill bites physically at the Gateway, co-owned with Mission Control), so the L2 row carries the **same freshness discipline as the per-RS table**: a mono **as-of / mirror-age stamp** (`0.4s ago`), an explicit **`source: Gateway/MC mirror`** label, and three defined states — **`PENDING`** (not yet mirrored), **`CONFIRMED`** (fresh ack within bound), and **`STALE / UNKNOWN`** (mirror age past bound → *"cannot confirm L2 from here — verify at Mission Control ▸"*, **never silently "CONFIRMED"**). A stale mirror must never read as a live physical-stop confirmation. The "either layer alone halts action" copy stays.
2. **Agent reconciliation counts** — the honest triad (§2.5.3), never merged. `pending` = "we haven't heard the ack yet" (these RSes already fail their destructive path closed), not "still dangerous." `draining` shows `ticket`/`host`/`jti`. The three counts always sum to the affected population; if they don't, a `? N unaccounted` row appears rather than silently rounding — honesty over tidiness.
3. **Benign-token staleness countdown** (PLAN §4.2) — a first-class panel, not a footnote, present whenever the window is open; collapses to `✔ benign-token window closed — all pre-halt tokens expired` at zero. The console's explicit refusal to imply instant silence.
4. **Per-RS freshness / epoch lag** (PLAN §4.6/§7.3) — the dense mono "instrument readout"; `stale→closed` turns lag into a visibly-*safe* state ("this RS is denying its destructive path *because* it's stale").

**Live behavior:** counts/rows update live (SSE/websocket over the Core API; one shared state). pending→confirmed does a single 180ms `--ok` flash then settles (reduced-motion: glyph swap only). The header pill/band mirror this board continuously. The board **never auto-clears** — even at `24/24 acked · window closed` it stays an engaged posture until the operator explicitly lifts. Silence is never assumed.

**STATES — Status Board:** **L** — level/epoch header renders immediately (known from the engage); panels skeleton labeled `◴ gathering acks…`; crucially the **benign-window countdown starts from the known engage time**, honest before any RS ack. **E** — no active halt / G0 → the **all-clear resting state**: `● G0 ARMED · epoch 4471 · 24/24 RS fresh · no active revocations`, calm, *"No halt engaged. Open FREEZE (Shift+Esc) to stop the suite."* Empty here is a *good* state. **P** — as drawn. **R** — partial telemetry: an unreadable RS row shows `⚠ freshness unknown` (never assume fresh); if the whole feed drops: *"Ack telemetry lost — the halt is still written to the ledger (epoch 4471). Showing last-known; treat unconfirmed RSes as pending."* Halt *validity* is never in doubt because *telemetry* dropped. **D** — Redis-independent frame: L1/L2 rows show `L1 via JWKS kid-prune + signed kill epoch (Redis-independent)`; the per-RS table annotated `epoch source: signed JWKS/AS-metadata`, lag may read `unknown (Redis)`; benign-window note amended to *"pre-halt benign tokens validate for ≤ TTL until the kid-prune bounds them."* Message: the halt is in effect and safe; telemetry is coarser.

### 5.3 Screen — Per-Agent Revocation (surgical `sub` / disable)

Reached from Identities → agent → Revoke/Disable, from the Halt Control scope selector, from a Status-Board `DRAINING` row, or from any Audit row. Kills one principal without touching the rest of the suite (PLAN §4.6 principal granularity; §3.6 revocation steps).

```
┌─ REVOKE AGENT ─────────────────────────────────────────────────┐
│  agent:patcher-07 · client_id patcher-07 · class executor        │
│  roles: role:agent-executor   holder scopes: gateway:execute     │
│  Choose what to revoke (most surgical → broadest):               │
│   ○ One token (jti…)       deny a single specific token          │
│   ◉ This principal (sub)   deny ALL its live tokens now + block   │
│                            it from minting new ones               │
│   ○ + Disable client key   also revoke its signing key (kid) so   │
│                            it cannot re-mint even after expiry     │
│  What this does:                                                 │
│   • sets revoked_before[sub] = now → every token iat < now denied │
│   • Principal.status → disabled → new mints blocked (sub-second)   │
│   • pushes sub to denylist over auth:revocations (epoch bump)     │
│  Reason (required, audited):  [ runaway patch loop on db-3     ]  │
│        ┌─────────────────────────────────────┐                   │
│        │  ◯  HOLD TO REVOKE  (0.6s)           │                   │
│        └─────────────────────────────────────┘                   │
└──────────────────────────────────────────────────────────────────┘
```

**Granularity ladder** made explicit (PLAN §4.6): `jti` → `sub`+`revoked_before` (all its tokens + block re-mint) → `+ client_id`/`kid` disable (kill the *key*, the true root credential, §3.6). Default is `sub`. Revoking is a **stop** → low-friction **hold-to-revoke** + a **required reason** (audited) — the one field even the safe direction requires, because "who did this and why" is auth's whole point.

**Honest post-action confirmation** (write-before-ack, scoped to one principal):
```
✔ agent:patcher-07 revoked · epoch 4472
   L1  denylist applied (sub + revoked_before=now)      APPLIED
   mint blocked (Principal.status=disabled)             CONFIRMED (read-your-writes, all replicas)
   ⇉ 1 in-flight action DRAINING on gateway (ticket T-2291, host db-3)
   ◐ benign reads on its pre-existing tokens may complete for 01:44 (≤ TTL, §4.2)
   Live-check paths (approve/execute/redeem): blocked now.
   [ Watch on Status Board ▸ ]   [ Also engage global G1 ▸ ]
```
It never says "silenced." It says exactly which paths are blocked *now* (live-checked) and which benign activity may still drain (≤ TTL), and flags in-flight high-stakes actions.

**STATES:** **L** — principal header/roles/scopes skeleton; radios + reason usable immediately; actuator enabled only once the target `sub` is confirmed loaded (cannot hold-to-revoke a principal whose identity hasn't resolved — prevents revoking the wrong `sub`). **E** — opened without a target (deep link to a deleted principal) → *"No such live principal. Search identities ▸"* + typeahead. **P** — as drawn. **R** — partial-commit → no false success; actuator stays hot; offers Redis-independent global STOP fallback. **D** — surgical `sub`/`jti` writes need Redis → fail-closed banner: *"Surgical revocation needs the denylist (Redis), unreachable. You cannot deny one token right now — but you CAN stop this agent by stopping the suite (global STOP via the Redis-independent channel), or retire the AS key. Break-glass STOP ▸."* Offers the broader-but-available stop rather than pretending the surgical one worked.

### 5.4 Screen — Per-Token & Per-Key Revocation (`jti` / `client_id` / `kid`)

The most surgical and the most sweeping revocations share one screen — same mechanism at different granularities (PLAN §4.6). This is the honest home of the **Redis-independent global kill** via AS-key `kid` retirement (PLAN §7.3, §4.2).

```
┌─ TOKEN & KEY REVOCATION ──────────────────────────────────────────────────────┐
│  Granularity                                                                   │
│  ┌──────────┬───────────────────────────────────────────────────────────────┐ │
│  │ jti       │ one specific token · [ paste/scan jti ]       → surgical       │ │
│  │ client_id │ block a client from minting new tokens         → per-agent     │ │
│  │ kid  ▮▮   │ retire an AS SIGNING KEY · invalidates ALL tokens under it     │ │
│  │           │  = Redis-INDEPENDENT global kill (§7.3). Broadest stop there is.│ │
│  └──────────┴───────────────────────────────────────────────────────────────┘ │
│  Selected: kid = as-key-2026-06                                                │
│  Consequence: every token signed by this key is rejected by every RS within    │
│  the JWKS poll window (≤30s), with NO dependency on Redis. Humans re-auth;      │
│  agents re-mint under the new kid once you re-enable them.                      │
│  ⚠ THIS ALSO ENDS *YOUR* CONSOLE SESSION. Your human token is signed by this    │
│    key, so you (and all humans) will re-authenticate immediately. That is       │
│    EXPECTED — the retirement is already in effect. Break-glass stays reachable  │
│    via the OFFLINE factor and does NOT depend on this key.                      │
│  This is a STOP (safe direction), but it is SUITE-WIDE.                         │
│  Type the key id to confirm the blast radius:  [ as-key-2026-06        ]        │
│        ┌─────────────────────────────────────┐                                 │
│        │  ▮▮  HOLD TO RETIRE KEY  (1.0s)      │                                 │
│        └─────────────────────────────────────┘                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

`jti` and `client_id` are pure stops → hold-to-revoke, reason required, no typed confirm. **`kid` retirement** is still the *safe* direction but **suite-wide**, so it earns **one typed confirmation of the key id** — the exception where a stop gets typing, justified by scale, not direction (mirrors the G2 treatment). This screen states plainly that `kid`-prune needs no Redis and bounds pre-halt benign tokens within the JWKS poll window (≤30s) + agent TTL.

**Self-logout is disclosed AND its post-action reads as success, not failure (finding-driven).** Because the operator's own human token (T2, `at+jwt`, header `kid` = the AS signing key) is signed by the very key being retired, retiring it **ends the operator's console session**. The consequence block states this up front (wireframe above). On completion, the console routes to a **static / pre-bundled SAFE-STOPPED re-auth screen** (cached assets, no live API — the same surface family as §5.5 R) that reads *"Kill applied @ epoch 4473 — the AS key is retired and the retirement is already in effect. Re-authenticate to continue."* — so the forced logout reads unambiguously as *the stop succeeded*, never as *the console died* (the exact safe-stopped-vs-broken confusion the console exists to prevent). **AS-key rotation-overlap caveat:** if a *different* current `kid` is signing human tokens at the moment of retirement (rotation overlap), the screen states explicitly *"your session is signed by `<current-kid>` and survives this retirement"* — so the operator always knows in advance whether they will be bounced.

**Honest post-action:** `jti` → `✔ token jti=… denied · epoch 4473 · live-check paths reject immediately · benign paths reject on next validation.` `client_id` → `✔ client patcher-07 blocked from minting · existing tokens still valid ≤ TTL unless you also revoke sub/jti.` (names the residual explicitly). `kid` → a Status-Board-style reconciliation showing **RS JWKS poll progress** (`8/12 RS refreshed JWKS · retiring kid rejected`) + the ≤30s poll-window countdown — because for the Redis-independent path, freshness = JWKS poll, and the UI shows that source explicitly.

**STATES:** **L** — granularity selector + current JWKS key list (`kid`, status active/rotating/revoked, `not_before`) load; actuator disabled until a valid target. **E** — no target → actuator disabled, hint *"Select a granularity and target."* (The JWKS list is never truly empty — an empty active-signing-key list is itself an error state.) **P** — as drawn. **R** — invalid `jti` format → inline field validation (mono `code`); `kid` typed-confirm mismatch → actuator locked, field `--danger`, *"Key id doesn't match — this guards the blast radius."* **D** — `jti`/`client_id` disabled (need Redis) with the fail-closed banner; **`kid` retirement is PROMINENTLY AVAILABLE** as *the* Redis-independent kill — the concrete "you can still STOP" affordance under degradation.

### 5.5 Screen — SAFE-STOPPED (auth / Redis DOWN) — must read as safe, not broken

This is Pattern D (§4.5) rendered as a full standalone surface for the kill-switch area. The operator's mental model must snap to *"the system fell into the safe direction on purpose,"* not *"my safety console is broken."*

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  ⛊  SAFE-STOPPED — the suite is holding in a SAFE posture      (halt gold)       │
│  Redis is unreachable, so every destructive, approve, and redeem path is         │
│  FAILING CLOSED suite-wide. Nothing dangerous can happen right now. This is       │
│  the designed safe direction (§7.5), not a fault in the safety controls.          │
│  ┌── WHAT STILL WORKS ─────────────────────────────────────────────────────────┐│
│  │ ✔ STOP is still ONE MOTION — Redis-independent, no typed intent, no HW key:    ││
│  │                                                                                ││
│  │   ┌────────────────────────────────────────────────┐   ← PRIMARY, one-motion   ││
│  │   │  ◯  HOLD TO STOP — raise signed kill epoch (G1) │     press-and-hold (0.6s) ││
│  │   └────────────────────────────────────────────────┘     (JWKS/AS-metadata/    ││
│  │       ↳ same low-friction motion as the header FREEZE       forward-auth hdr)   ││
│  │                                                                                ││
│  │      Heavier / broader stops, only if you need them:                           ││
│  │        [ ⛊ RETIRE AS KEY ▸ ]  (suite-wide · typed kid · ends your session §5.4)││
│  │        [ ⛊ BREAK-GLASS STOP ▸ ] (offline factor — ONLY if auth login/verify    ││
│  │                                   itself is down; NOT needed just for Redis)   ││
│  │ ✔ Benign reads keep flowing, BOUNDED — local in-process ceiling (§6.2)         ││
│  │ ✔ Introspection answers CORRECTLY — revoked token still reads active:false     ││
│  │      from the durable mirror (degraded-but-correct — §4.6)                     ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
│  ┌── WHAT DOES NOT WORK (accepted, §12.2) ────────────────────────────────────┐  │
│  │ ✕ No in-band destructive / SoD-governed action — incl. legitimate emergency  │  │
│  │   remediation needing the Gateway. There is no way to approve+execute while   │  │
│  │   Redis is down; that is intentional and safe.                                │  │
│  │ ✕ Surgical per-token (jti) / per-agent (sub) denylist writes — need Redis.     │  │
│  │  → For legitimate emergency remediation: [ Open operator runbook ▸ ]           │  │
│  └──────────────────────────────────────────────────────────────────────────────┘│
│  Dependency status: Redis ✕ · auth-verify ✔ (2/2 replicas) · writer ✔ · PDP ⚠ ·   │
│                     JWKS ✔ served                                                 │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Requirements:** frame first (top line "holding in a SAFE posture," never "error/connection failed/crash"; halt gold, not red); **the most prominent affordance is the one-motion `HOLD TO STOP — raise signed kill epoch (G1)` press-and-hold** — the *same low-friction motion* as the header FREEZE, requiring **no typed intent and no offline hardware factor** when only Redis is down (auth still up). The heavier stops — `RETIRE AS KEY` (typed kid, suite-wide, ends the operator's own session §5.4) and offline-factor `BREAK-GLASS STOP` — sit *below* it as broader options, with break-glass explicitly labeled *"only if auth login/verify itself is down."* This ordering keeps **safe = easy exactly when seconds count**, instead of funneling a panicking operator into a hardware key or a typed key-id they don't need. Works-vs-doesn't as a two-column truth, each item traced to a PLAN mechanism; the accepted residual stated as *accepted*, with the out-of-band runbook as sanctioned path; a dependency-status strip distinguishing *which* dep is down (because "auth-verify still 2/2 replicas" is itself reassuring — the destructive plane is fail-closed, the verify plane isn't broken, PLAN §7.6); break-glass here presents STOP and RESTORE only.

**STATES:** **L** — `◴ checking dependencies…` but the **signed-kill-epoch HOLD TO STOP**, Retire-AS-key, and Break-glass STOP all stay live throughout (STOP never waits on a health check). **E** — N/A. **P** — as drawn. **R** — can't even reach the console's own backend → a **static, pre-bundled** SAFE-STOPPED page (cached assets, no API) still showing the runbook link and *"STOP is available out-of-band via the offline break-glass factor."* Even a fully dark backend leaves a path. **D** — this *is* the degraded state; sub-variants by which dep is down carry a tailored "what to do" line — when **only Redis** is down the one-motion signed-kill-epoch STOP is primary; when **auth verify/login** is down, the offline-factor break-glass is surfaced as the primary path.

### 5.6 Screen — Lift / Restore (the deliberate, high-friction direction)

Lifting a halt / re-enabling moves toward *more* real-world action, so this is where the friction lives. Reached only from an engaged Status Board or a revoked-agent record.

```
┌─ LIFT HALT ────────────────────────────────────────────────────┐
│  You are about to RELEASE agents back to action.                │
│  Currently engaged: ▮▮ G1 FREEZE · epoch 4471 · by op:eide       │
│  Lifting will RESUME:                                           │
│    • 24 agents' destructive/approve/execute paths               │
│    • gateway:execute + vault:redeem chains suite-wide           │
│  Right now: 21 confirmed halted · 3 pending · 1 draining.       │
│  Draining action on host nas-01 will continue regardless.       │
│  Step-up required (fresh sign-in):     [ ✓ verified 14s ago ]   │
│  Type the current epoch to release:    [ 4471          ]        │
│              [ Cancel ]        [ Release to G0 ]  ←danger        │
└──────────────────────────────────────────────────────────────────┘
```

**No hold-to-engage here** — instead the full friction: **step-up auth** (fresh `auth_time`, PLAN §4.7), **typed confirmation of the current live epoch** (proves the operator read live state), explicit consequence + live honest-state echo, red primary. Partial lift (re-enable one agent) uses friction proportional to blast radius; global lift is heaviest. On release, the pennant returns to `G0 ARMED` only after write-before-ack, and the Status Board shows the **resume reconciliation** (agents re-minting under the current `kid`, epoch acked) — honest in both directions.

**Break-glass RESTORE:** can lift/restore when auth is degraded, but is **logged + reviewed** and files the mandatory `needs_review` ticket (PLAN §7.7). The break-glass panel offers exactly two directions — **STOP** (fail-safe) and **RESTORE** (logged) — and **presents no capability to relax approve/execute separation** (Decision #5): that option is absent with the same one-line "this capability does not exist" explanation. Restoring re-enables a *normal* approver seat; it never itself approves or executes (structurally holds no action-side scope, PLAN §3.4).

**STATES:** **L** — posture header loads; Release stays disabled until step-up fresh AND typed epoch matches the *live re-fetched* epoch (if epoch changed under the operator, the field invalidates: *"posture changed — re-read before releasing"*). **E** — nothing to lift (already G0) → *"No halt engaged. Nothing to release."* **P** — as drawn. **R** — step-up fails/expired → Release disabled, *"Re-verify to release."*; epoch mismatch → field `--danger`, blocks release (prevents lifting against a stale mental model). **D** — Redis down → normal lift unavailable (can't clear the denylist) → routes to **Break-glass RESTORE** with its heavier audit path, plus the out-of-band runbook note.

---

## 6. Break-glass (deliberate friction · visible absence · unmissable record · degraded-first)

Break-glass is the operator's **out-of-band emergency lever** — the way the human regains and retains control (above all, the ability to STOP) when auth itself is degraded or compromised. Authorized **only** through a separate **offline factor** (pre-provisioned hardware key / offline credential held physically — **never** auth's normal login, **never** from Vault, since Vault is a holder that may be down). It can only ever move the suite toward **less** action (STOP) or **restore availability** (RESTORE); it **structurally holds no action-side holder scope** (PLAN §3.4). Its signature moment is the **"break the seal"** motion; from arm to exit a persistent red hazard banner rides the whole console.

### 6.1 Where it lives & the two ways in

Two entries, one flow: (1) **normal path** — from the Kill Switch & Revocation area, a distinct **sealed "Break-glass" panel** below and apart from the always-available kill switch (when auth is healthy, reach for the ordinary kill switch first); (2) **degraded path (first-class)** — a **standalone, dependency-light** entry (bookmarkable deep link that does not require auth's live login session), designed to work when auth is down. The UI must keep the **kill switch** (in-band, easy, always-there) and **break-glass** (out-of-band, sealed, deliberate) visibly distinct — never blur them.

### 6.2 Flow overview

```
[BG-0 Sealed entry] → [BG-1 Present offline factor] → [BG-2 Consequence + typed intent] → [BG-3 Active session console]
  "break the seal"      hardware key / offline cred      read what it WILL/WON'T do            STOP is one move away
  deliberate lift       NOT auth login, NOT Vault        type EXACT phrase to arm              RESTORE behind friction
       │                     │ factor invalid → R           │ mismatch → cannot arm                ├ BG-4 STOP result
       │ cancel              │ auth degraded → D path works   │                                    ├ BG-5 RESTORE (logged+reviewed)
       ▼                                                                                          └ BG-6 Exit / auto-revoke
  back to console                                                              ↓ (on arm, 3 records fire) ↓          │
                                                                broadcast to Chat + auto-file needs_review + audit   ▼
                                                                                                    [BG-7 History / audit view]
```
On **arming** (successful BG-2), three artifacts fire immediately and are shown firing: **append-only out-of-band audit** (`bg:*` provenance), **broadcast to operator Chat** (`chat:broadcast`), **auto-filed `needs_review` ticket** on the Board. The session is **single-use, time-boxed, auto-revoked** (PLAN §7.7): a visible countdown; on expiry/exit it auto-revokes and cannot be silently extended.

### 6.3 BG-0 — The sealed entry ("break the glass")

```
╭──────────────────────── EMERGENCY · UNDER GLASS ───────────────────────╮
│  🔒  BREAK-GLASS                                                        │
│      Out-of-band operator override for when auth itself is degraded    │
│      or compromised. Requires your OFFLINE factor (hardware key /      │
│      offline credential). NOT your normal login. NOT from Vault.       │
│      What it does:   STOP  (engage kill · revoke · disable · halt)     │
│      and            RESTORE (re-enable · lift kill · restore approver) │
│      What it can NEVER do:  approve+execute · redeem a credential ·    │
│                             relax approve/execute separation           │
│                       ┌─────────────────────────────┐                  │
│                       │  🔓  Lift the cover…         │  (deliberate)    │
│                       └─────────────────────────────┘                  │
╰────────────────────────────────────────────────────────────────────────╯
```
A recessed, etched emergency panel (`--sub-750`, inner shadow, faint hazard-stripe hairline) — **calm at rest**, not an alarm yet. "Lift the cover…" is intentionally a *two-beat* action (primary click reveals a confirm strip → Continue/Cancel) so a single stray click cannot begin. The does/can-never summary is printed on the tile *before* entry. The "break the seal" signature motion plays here (reduced-motion: instant swap).

**STATES — BG-0:** **L** — skeleton tile, affordance disabled "Checking break-glass availability…" (kill switch above loads independently). **E** — no offline factor provisioned → ⚠ *"No break-glass factor is provisioned for this operator… enroll ▸"*, affordance disabled with enrollment link. **P** — as drawn. **R** — can't confirm readiness → ⚠ *"Cannot confirm break-glass readiness. You may still attempt to present your factor,"* affordance **enabled** (fail toward reachable — this is the safety lever); any attempt is audited. **D** — the tile is **promoted** to the top of the region with a `--ok` "This is the intended path right now" hint; the cover is liftable; break-glass explicitly does not depend on the down dependency to open — the whole point.

### 6.4 BG-1 — Present the offline factor

WebAuthn / offline-credential challenge against `bg:operator-root` (`kind = break_glass`, immutable, never issuable a normal online token). Copy repeats **"NOT your normal login / NOT from Vault."** Cancel returns to BG-0 and still writes a lightweight audit line (loud by design).

**STATES — BG-1:** **L** — "Preparing offline challenge…"; if the offline verifier is unreachable but the factor is locally verifiable (hardware key), proceed anyway (must not hard-depend on auth). **E** — no factor enrolled → block + enrollment link + Cancel. **P** — challenge live, "Touch your hardware key now…" (reduced-motion: static "waiting…"). **R** — `factor_invalid` / `user_verification_failed` / `factor_revoked` → inline `--danger` banner (machine reason + icon + text), Retry/Cancel; repeated failures surface a lockout note + loud audit. **D** — the designed-for state: `--ok` posture strip *"auth is degraded — break-glass verification runs on the offline factor and does not depend on the unavailable service."* Success proceeds even while auth's online token path is dead; if audit/broadcast sinks are also down, warn but **do not block STOP** (records reconcile on recovery).

### 6.5 BG-2 — Consequence + typed-intent + the VISIBLE ABSENCE

```
┌──────────────────────── BREAK-GLASS · STEP 2 of 2 ────────────────────────┐
│  Operator: op:eide · via bg:operator-root · session TTL 15:00 (time-boxed) │
│  ┌── WHAT THIS SESSION LETS YOU DO ────────────────────────────────────┐  │
│  │ ✔ STOP    engage kill (G1/G2), revoke a principal/key, disable, halt  │  │
│  │ ✔ RESTORE re-enable, lift a kill, restore a normal approver seat      │  │
│  │           (logged + auto-reviewed)                                    │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌── WHAT THIS SESSION CANNOT DO — BY CONSTRUCTION ──────────────────────┐  │
│  │  (printed constitutional statement · lock glyph · NOT controls,        │  │
│  │   no hover/focus/click target — see glyph rule §2.5.1)                 │  │
│  │ 🔒 Cause execution (gateway:execute) — break-glass holds no execute    │  │
│  │ 🔒 Redeem a credential (vault:read-credential) — holds no such scope   │  │
│  │ 🔒 Relax the approve/execute separation.                               │  │
│  │    Compiled-in; cannot be changed here — or anywhere — at runtime.     │  │
│  │    There is no control for it in this console because the capability   │  │
│  │    does not exist. (Decision #5)                                       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  ┌── HONEST CONSEQUENCE ─────────────────────────────────────────────────┐  │
│  │ Engaging a STOP does not guarantee instant silence. Benign already-    │  │
│  │ issued tokens can remain valid up to ~2 min (agent TTL). The console   │  │
│  │ will show CONFIRMED halted vs still PENDING.                           │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│  This will: broadcast to operator Chat · file a needs_review ticket ·      │
│  write an append-only audit line — all immediately and unavoidably.        │
│  Reason for this override (required):  [______________________________]    │
│  Type  ENGAGE BREAK-GLASS  to arm:     [__________________]                │
│              [ Cancel ]     [ Arm break-glass session ] (disabled until     │
│                                                    phrase matches; --danger)│
└────────────────────────────────────────────────────────────────────────────┘
```
The **"CANNOT DO — BY CONSTRUCTION"** panel is the visible absence: **not** a greyed toggle — a **printed constitutional fact** styled as a 🔒 informational/locked statement with **no interactive affordance at all** (no hover, no focus target, no click). Per the glyph-reservation rule (§2.5.1) it uses the **lock glyph 🔒, never ⛔** — so a constitutional "this does not exist" line can never be misread as a clickable STOP-style prohibition. Typed intent is an **exact, case-sensitive phrase** (`ENGAGE BREAK-GLASS`), no autofill/paste-to-satisfy bypass; Arm stays disabled until match, then enables and recolors to `--danger`. Reason required. Time-box shown up front. Loudness pre-disclosed.

**STATES — BG-2:** **L** — consequence/capability panels are static (constitutional) and render instantly; only session-TTL + "sinks reachable?" may load. **E** — N/A. **P** — Arm disabled until reason present AND phrase matches. **R** — phrase mismatch / empty reason inline (non-blocking); if arming itself errors → `--danger` banner + Retry, state explicit ("NOT armed — retry" vs "armed"). **D** — if a loudness sink is down: `--attn` strip *"Chat broadcast / needs_review ticket cannot be delivered now and will be queued for reconciliation on recovery. This does NOT block arming — STOP is more important than the broadcast."* Arming proceeds; missing artifacts marked "pending reconciliation."

### 6.6 The three unmissable records (fired at arm-time)

Surfaced as first-class objects each with delivery status (delivered / pending-reconciliation): (1) **persistent hazard banner** (§6.7); (2) **Chat broadcast** — fixed-format *"⛔ BREAK-GLASS ENGAGED by op:eide at 14:03:22 · reason '…' · session bg-2026-0631-01 · TTL 15:00,"* shown as a `Broadcast: ✔ delivered` / `⏳ pending` chip; (3) **`needs_review` ticket** — auto-filed on the Board, pre-populated + appended live with every STOP/RESTORE taken, `needs_review ticket: #BG-1421 ✔ filed`; underlying all three, the **append-only `bg:*` audit** (viewable in BG-7). All three are write-before-nothing-blocks: they never gate STOP, but their delivery status is always shown truthfully.

### 6.7 The persistent BREAK-GLASS banner (across the WHOLE console)

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ ⛔ BREAK-GLASS ACTIVE · op:eide · session bg-2026-0631-01 · auto-revokes in 12:47   │
│    STOP is one move away →  [ ⛔ STOP AGENTS ]        [ Review session ]  [ End now ] │
└────────────────────────────────────────────────────────────────────────────────────┘
```
Full-width, pinned above all nav on **every** screen, `--danger-tint` fill + `--danger-500` 3px bottom rule + ⛔ icon + text (never color-only). Not dismissible while live; carries the live auto-revoke countdown; embeds the fastest safe action **⛔ STOP AGENTS** reachable directly from every screen. **STOP AGENTS is a press-and-hold** that engages the **default G1** in one motion (≈600ms) with BG-4 honesty; STOP never requires typed intent. **Escalation to G2 does NOT fire on a bare second tap** — a plain double-press must never quiesce the whole suite. After G1 engages, the banner surfaces a **distinct, explicitly-focused `Escalate to G2 ▸` hold-actuator (~1000ms, never pre-focused, reduced-motion → numeric countdown)** — the *same* deliberate G2 motion as §2.5.8/§5.1, so there is exactly one G2 motion across the whole console and G2's larger blast radius keeps its accident-proofing everywhere. At ~375px it collapses to two lines with **STOP AGENTS full-width and never in overflow**. Reduced-motion: plain text countdown, no pulse.

**STATES — banner:** **L** — resumes from session state on refresh (if briefly unknown, shows "⛔ Break-glass session state loading…" rather than hiding — fail toward showing the hazard). **E** — absent (no session). **P** — as drawn. **R** — session channel lost → `--attn` *"⛔ Break-glass ACTIVE — live session link lost; STOP still available, actions may lag."* Never silently disappears. **D** — coexists with the SAFE-STOPPED strip; STOP remains primary.

### 6.8 BG-3 — Active-session console (STOP/RESTORE surface)

STOP block dominant (top, `--danger` accents, largest hit targets, **press-and-hold**, **never** typed intent — **G1 default is one motion (≈600ms)**; **G2 is a distinct, explicitly-focused ~1000ms hold-actuator, never a bare second tap** (§2.5.8/§6.7), so the full-quiesce keeps its accident-proofing here too). **LIVE STATE block is the honesty core**: the honest triad (`✔ N confirmed · ◐ M pending · ⇉ K draining`), the benign-token window countdown, per-RS freshness, and **L2 Gateway physical stop shown separately with its mirror-age/source qualifier** (§5.2, PLAN §7.1) — never collapsed into one "stopped," never a stale mirror shown as live "CONFIRMED." **RESTORE block** friction-gated (typed `RESTORE` + reason, appends to `needs_review` flagged as a restore, never above STOP). A **NOT AVAILABLE — BY CONSTRUCTION** block restates the visible absence in the working surface — a **printed 🔒 locked statement, never a disabled button and never the ⛔ glyph** (§2.5.1 glyph rule).

**STATES — BG-3:** **L** — control blocks render immediately (constitutional); LIVE STATE skeleton "gathering halt confirmations…"; STOP usable before counts load. **E** — before any STOP this session, LIVE STATE reads "No stop engaged yet · G0 · nothing halted" (honest empty, not a fake "all safe"). **P** — as drawn, counts live. **R** — a STOP that fails to commit → inline `--danger` + Retry and LIVE STATE explicitly "kill NOT engaged"; live-state channel error → `--attn` "halt confirmations unavailable — treat as PENDING" (honest worst-case). **D** — LIVE STATE integrates the degraded posture and **steers to the Redis-independent levers** ("use G2 quiesce + Gateway halt (L2) which do not depend on Redis"; STOP via JWKS-`kid`-prune / signed kill epoch surfaced as the reliable path).

### 6.9 BG-4 — STOP result (honest halt) · BG-5 — RESTORE · BG-6 — Exit/auto-revoke

- **BG-4 STOP result** — lightweight confirm (single press, no typed intent), then a result surface that **never says "all stopped"** while any pending/draining/benign-window is open; offers the next safe escalation (G2) inline. **STATES:** **L** "engaging… awaiting halt confirmations" (engage not blocked on downstream). **P** honest result. **R** "STOP NOT engaged — <reason>. Retry, or use the Redis-independent kill (retire AS key / G2)." **D** pre-selects the `kid`-prune path with an honest ≤30s bound, never "instant."
- **BG-5 RESTORE** — typed `RESTORE` + reason; reminds that **lifting a kill does not and cannot relax SoD**. **STATES:** **E** "Nothing to restore." **R** "NOT restored — retry" explicit. **D** warns the restore may lag until the degraded dependency recovers; shows post-restore state honestly ("kill lifted in ledger; per-RS propagation pending").
- **BG-6 Exit / auto-revoke** — ending is honest about what **remains in effect** (posture unchanged: G1 still engaged; revoked principals stay revoked) and leaves the `needs_review` ticket open. Auto-revoke on TTL is non-silent, cannot be extended (a new session is a new single-use invocation); mid-action TTL either completes-then-revokes or cleanly cancels with an explicit message — never an ambiguous half-state. **STATES:** **R** "session NOT ended — retry; if auth is unreachable, the time-box still auto-revokes." **D** exit works offline (authority came from the offline factor); records reconcile on recovery.

### 6.10 BG-7 — Break-glass history / audit

An expandable per-session log (STOP ⛔ vs RESTORE 🔓 distinguished), each linking to its audit line, Chat broadcast, and `needs_review` ticket with open/closed status shown so an **un-reviewed** break-glass stands out. **Failed/cancelled attempts are recorded too** (loud by design). Mono/tabular timestamps/epochs/counts; correlatable by `traceparent`/`sub`.

**STATES — BG-7:** **L** table skeleton. **E** "No break-glass sessions recorded" — a *good* calm empty. **P** as drawn. **R** *"Cannot load break-glass history — the append-only record could not be read. This does not mean it is empty."* (never imply absence from a read failure). **D** served from the durable mirror ("served from durable audit mirror (hot index degraded)"); entries with pending-reconciliation delivery flagged.

### 6.11 Degraded is the FIRST-CLASS path

Break-glass is *specifically* the flow that must work when auth is degraded, so degraded is a primary path, not a fallback: entry never depends on the down dependency; STOP is always reachable and **steered to the working lever** (JWKS-`kid`-prune AS-key rotation + signed kill epoch, L2 Gateway halt); honesty about bounds (≤30s poll, ≤2-min TTL, per-RS unconfirmable → treat as PENDING), never "all stopped"; loud-record sinks may be down and STOP still wins (artifacts queue as pending-reconciliation); the accepted residual (§12.2) is stated, with the out-of-band runbook as the sanctioned path for emergency real-world remediation. Break-glass restores *control*; it does not (and structurally cannot) execute.

---

## 7. Audit / observability (the oversight instrument)

auth is the **authoritative "who did this" source** for the entire suite. Mission Control is the live agent cockpit and home of the *global* kill switch; they are siblings over shared state, not duplicates. This surface can *read* posture and *revoke a principal* (auth owns per-principal revocation); to *arm the global switch* it hands off to Mission Control (one labeled link, never a second copy of the control). From any MC agent, one can deep-link into this console filtered to that agent's `sub`. **Non-goals (boundaries):** no global-kill actuation UI here (read-only mirror + hand-off); no SoD-relax affordance anywhere (Decision #5 — audit *evidences* SoD and *reports* `dual_holder_forbidden`, never a relax control); no agent/MCP audit surface; no re-enable / lift-kill / break-glass-restore controls on scanning screens (those live behind friction on Kill Switch / Identities).

### 7.1 Screen A — The Event Timeline ("Who Did What") — primary/landing view

A dense, filterable, scannable stream of **oversight-relevant events** (not raw request logs — benign fast-path permits are sampled/suppressed by default). Three-zone instrument layout:

```
┌─ Global System-State Header (§3.1, pinned) ─────────────────────────────────────────────┐
├──────────────┬────────────────────────────────────────────────────────┬────────────────┤
│  FILTER RAIL │  EVENT STREAM (the hero)                                │  DETAIL /      │
│  (220px)     │  [ ▮ LIVE TAIL ]  [ Query history ]     Signal ▸ All    │  INSPECTOR     │
│  Principal   │  ─────────────────────────────────────────────────────  │  (340px)       │
│  ▸ sub       │  16:42:07.318  ⛔ DENY  gateway:execute                  │  (empty until  │
│  ▸ client_id │      agent:patcher-07 → aud=gateway · self_approval_… ▸  │   a row is     │
│  ▸ kind      │  16:42:06.001  ▲ TRIP  budget concurrency               │   selected —   │
│  App (aud)   │      agent:crawler-02 → 429 concurrency · cap 1         │   §7.2)        │
│  ▸ board …   │  16:41:58.774  ◆ ANOMALY  mint off-host                 │                │
│  Action-class│      agent:patcher-07 → auto-freeze G1 (safe dir) ▸     │                │
│  ▸ destr-exec│  16:41:44.006  ⟲ REVOKE sub                             │                │
│  ▸ sod-crit  │      op:eide revoked agent:rogue-09 · 17/18 RS ack ▸    │                │
│  Decision    │  ─────────────────────────────────────────────────────  │                │
│  ▸ deny/trip │  … virtualized; older rows load on scroll …            │                │
│  Time window │                                                         │                │
│  [ Export ▾ ]│                                                         │                │
└──────────────┴────────────────────────────────────────────────────────┴────────────────┘
```

**Event row anatomy** (two-line dense record; every machine field JetBrains-Mono tabular): `timestamp` (`HH:MM:SS.mmm`, monotonic) · **severity glyph + tag** (`⛔ DENY` / `▲ TRIP` / `◆ ANOMALY` / `● PERMIT` / `⟲ REVOKE` / `⛔ KILL` / `◆ BREAK-GLASS` / `⊘ SSD-REJECT` — glyph **and** word **and** color, never color alone) · `action` (canonical id, PLAN §5.3) · **`sub`** (stable, the attribution key, always shown, click→pivot) · `client_id` (when ≠ sub, with a `kind` badge) · `aud` (target app/RS) · `decision` (permit/deny) · `reason` (machine code, verbatim PLAN §5.6, truncated with full in detail) · `epoch` · `▸` (expand). Not inline but always in detail: `jti`, DPoP `jkt`/cert thumbprint, mint origin, `issued_by`, authoritative `traceparent`, and `claimed_parent` (flagged untrusted, PLAN §8.7).

**Legibility at a glance:** alarm rows get a 3px `--danger` left rule + faint tint; warn rows `--attn` rule; permit/notice a thin neutral/signal rule. Alarm rows get a single slow glyph pulse on arrival in live tail (reduced-motion: glyph+tag+rule carry it).

**Anomaly cues (thresholds specified, shown, and shared with the header FLEET indicator §3.1-2a):**
- **Deny-cluster cue** — a sticky inline chip `▲ agent:patcher-07 — 6 denies in 40s [ pivot ] [ revoke ]`. **Default threshold: ≥ 5 denies from one `sub` within a rolling 60s window** (the same for SSD-reject storms). The active threshold is **displayed in the chip's tooltip/detail** (`fires at ≥5 / 60s · configurable`) so the operator can reason about false negatives/positives, and it is **operator-configurable** (a settings value; changing it updates both the Timeline chip and the header indicator).
- **High-activity cue (within-budget runaway)** — because the default `Signal` filter suppresses benign fast-path permits, a runaway agent flooding *permitted* reads/writes could otherwise be silent until it trips a budget. A `▲ high activity` chip fires when a `sub`'s **permitted-event rate exceeds a baseline multiple (default: ≥ 4× its rolling-24h baseline, sustained ≥ 30s)**, analogous to the deny-cluster chip, with `[ pivot ] [ revoke ]`. (Budget trips and the MC no-progress/liveness detector remain the authoritative catch for hard runaways; this cue adds an *early behavioral* signal.) Threshold shown in tooltip, operator-configurable.
- All anomaly cues (deny-storm, SSD-reject, budget trip, mint anomaly, high-activity) feed the **one shared threshold set** that also drives the persistent header FLEET-anomaly indicator (§3.1-2a) and the Overview flagged-principals tile (§3.6), so on-screen and cross-screen signals can never disagree.

**Filter/pivot rail** (combinable, AND across groups / OR within): Principal (`sub`/`client_id`/`kind`), App (`aud`), Action-class (`read`/`write-benign`/`propose`/`sod-critical`/`destructive-exec` + operator/guardrail/kill/revoke/break-glass families), Decision (permit/deny/trip/anomaly), Reason code (multi-select, PLAN §5.6), Time window (15m/1h/24h/custom → drives Live vs Historical). A **Signal filter** at the top of the stream (`Signal ▸ All`) defaults to suppressing benign fast-path permits (the "oversight instrument, not log dump" default). Active filters render as removable chips; **`Save view`** persists a filter set. Pivot actions from any row (`▸`/right-click/keyboard `p`/`t`/`r`): pivot-to-principal (§7.3), pivot-to-trace (§7.4), revoke-this-principal (§7.5).

**Live vs Historical:** `▮ LIVE TAIL` subscribes to the hot event stream (Redis pub/sub) — a `● live` dot pulses (reduced-motion static); `+N new` counter prevents scroll-yank. `Query history` runs a bounded query over the **durable append-only store** (always readable even when Redis is down — this is what keeps audit alive under degradation).

**STATES — Timeline:** **L** — header renders first from last-known cached posture tagged `↻ confirming…`; 6–8 skeleton stream rows; filter rail interactive immediately (header never blank on a safety console). **E** — two distinct empties: *empty by filter* (`No events match these filters in the last 15m. [Clear] [Widen to 24h]`, neutral) vs *genuinely quiet* (`● Quiet — no oversight-relevant events in this window. 4,102 benign reads sampled-out (show All).`, reassuring, states what was suppressed). **P** — as drawn. **R** — query/render failure while auth core is reachable → inline `--danger` banner `Audit query failed — <machine code> [Retry]`; filters/header stay live; distinct from D (the system is not necessarily safe-stopped, the query just failed). **D** — the load-bearing state: an **amber (`▲`) degraded banner** *"DEGRADED — SYSTEM IS SAFE-STOPPED, NOT BROKEN"* — because **the audit trail is append-only durable, historical audit REMAINS FULLY READABLE** (stated prominently so the operator never thinks they've gone blind); `Live tail` disabled and relabeled `LIVE TAIL (paused)`; `Query history` unaffected and **emphasized (✔)**; the header freshness switches to `⚠ RS freshness UNKNOWN` (never fabricates a green number); separates *what still works* (durable history, revoke, Redis-independent kill via MC) from *what's paused* (live tail, freshness confirmation); runbook link; partial-stale variant lists which `aud` are stale.

### 7.2 Screen B — Event Detail / Drill-down (inspector)

Full tabular truth for one event + correlations + jump-offs (right inspector on desktop; bottom sheet on mobile). **`traceparent` is the authoritative, server-generated correlation key** (PLAN §8.7), links to the chain view. **`claimed_parent` is always rendered adjacent, flagged `⚠ UNTRUSTED (client)`** in muted `--attn` text — visually subordinate, never used to group/pivot. **Reason codes get plain-language expansion** on hover/focus (`self_approval_forbidden → "This principal is the ticket's proposer; a proposer can never approve their own work (§3.5)."`, etc.) — turning the log into oversight. **Obligation trail** for destructive-path permits shows `consume_approval ✔ · fencing_token=… · admission_claim ✔ · revocation_fresh_at ✔ (0.4s < D)`. Jump-offs: `[ pivot → ]`, `[ view chain → ]`, `[ Revoke <sub>… ]`.

**STATES — Detail:** **L** — field skeletons; header (glyph/action/time) resolves first from the loaded stream row. **E** — no selection → `Select an event to inspect. Keyboard: ↑/↓ move, Enter open.` **P** — as above. **R** — `Could not load full detail — <code>. Summary fields shown from the stream.` (inline row summary always remains). **D** — served entirely from the durable audit line, fully available, tagged `served from durable store`; live-only fields (e.g. "is this token still on the denylist right now?") show `live status unavailable (Redis down) — historical record intact`, never fabricated.

### 7.3 Screen C — Principal Oversight ("is agent X misbehaving?")

Per-principal rollup answering the misbehavior question with the stop one click away. Sections: **Oversight summary** (permits/denies/trips/anomalies/holder-path counts over the window + a deny-reason histogram — the fastest "what kind of trouble" read; elevated deny rate raises a `▲ elevated deny rate` header tag); **Budget headroom (live, PLAN §6)** — concurrency `n/max`, rate GCRA %, active cooldowns, and the **fourth lifetime/liveness dimension** (no-progress detector); **Mint health (PLAN §3.6)** — last mint time/origin (host-attested ✔ / ◆ off-host), mint-rate vs baseline, **key storage attestation** (`TPM non-exportable ✔` — a hard invariant for holder/destructive principals), any mint-anomaly auto-freeze; **scoped event stream** (Screen A pre-filtered to this `sub`). Actions: `Revoke…` (all live tokens denied), `Disable client…` (blocks new mints — the key-layer kill) — both **safe-direction single-confirm** with an honest consequence. **Re-enable is deliberately NOT here** (dangerous direction; lives behind friction on Identities) so this scanning screen never becomes an accidental un-stop.

**STATES — Principal:** **L** — header + skeleton tiles; header live. **E** — principal exists, no events in window (`No events for … in the last 1h. [widen]`) vs principal not found (`No principal with sub "…". It may have been GC'd or never existed.`). **P** — as above. **R** — per-tile error (e.g. budget tile `live headroom unavailable — <code> [retry]`) without failing the whole screen (durable audit summary still renders). **D** — durable oversight summary and scoped history render **fully**; live budget/mint tiles show `live state unavailable (Redis down) — historical activity intact` (amber, never fabricated); `Revoke` remains available (durable write-before-ack) with a degraded note. Safe-stopped, not blind.

### 7.4 Screen D — Destructive-Chain Correlation (multi-key: ticket / approval / trace)

Correlates a full destructive chain across apps (propose → claim → approve *by a different principal* → execute → redeem). A vertical trace, one row per hop, spanning Board/CMDB/Gateway/Vault audiences.

**Correlation model — NOT a single trace-id (finding-driven).** A destructive chain unfolds across separate agent invocations and re-mints minutes or hours apart, so those async hops **may not share one `traceparent`**. Correlating on trace-id alone would silently return a partial or empty chain — a false "nothing to see" on the exact surface a Critical-infra audit exists to prevent. Therefore the screen correlates on **three first-class keys, in priority order:**
1. **`ticket_id`** (e.g. `T-1042`) — the Board ticket is the chain's canonical spine; the Board propagates it across every hop of the propose/claim/approve/execute/redeem lifecycle.
2. **`approval_id`** — the single-use approval, which binds the approve hop to the execute/redeem hops that consumed it.
3. **authoritative `traceparent`** — the server-generated trace, used to stitch hops that *do* share a trace within a single invocation.

The trace **shows which key stitched each hop** (a small `by ticket` / `by approval` / `by trace` tag per joined segment), so the operator can see when the chain crossed an async/re-mint boundary rather than assuming one unbroken trace. The **authoritative `traceparent` propagation** across the lifecycle is stated: auth records the server-generated trace on each hop and the Board carries `ticket_id` + `approval_id` as the durable correlation keys; where a re-mint starts a new trace-id, the ticket/approval keys bridge it. `claimed_parent` remains **untrusted, recorded, never used to attribute**.

```
┌─ CHAIN · ticket T-1042 (+ approval AP-3391 · traces 00-9f3c8a…) · sub-attributed ✔ ─────┐
│  correlated by: ticket_id (primary) · approval_id · 2 trace-ids stitched                 │
│  claimed_parent on entry: 00-DEAD…  ⚠ UNTRUSTED — recorded, never used to attribute      │
│  16:40:02 ● PERMIT board:propose  agent:deployer-01  aud=board   T-1042                   │
│  16:40:05 ● PERMIT board:claim    agent:deployer-01  aud=board   lock host web-03         │
│  16:41:10 ● PERMIT board:approve  op:eide  ◄ DIFFERENT principal (proposer≠approver §3.5) │
│  16:41:40 ⛔ DENY   gateway:execute agent:patcher-07 aud=gateway approval_consumed ▲ 2nd  │
│  16:41:41 ● PERMIT gateway:execute agent:deployer-01 aud=gateway fence#8814 ✔             │
│  16:41:41 ● PERMIT vault:read-cred svc:gateway       aud=vault   redeem (GW only)         │
│  16:41:58 ◇ done   execute_approved_plan · host web-03 · consume_approval ✔               │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```
The **SoD story reads top-to-bottom** — the UI *shows* approve and execute performed by **different principals** (`◄ DIFFERENT principal`), the point of a Critical-infra audit surface; the **single-use approval violation** (`approval_consumed` on a second execute) is highlighted inline; **`claimed_parent`** appears once at the header, flagged untrusted, so a grafting attempt is *visible* but never mis-attributes.

**STATES — Chain:** **L** — vertical skeleton hops. **E — honesty-safe, never "no chain exists":** if the current key returns only the seed event, the empty state reads `Only this event shares <key>. A destructive chain can span multiple trace-ids across async re-mints — correlate by ticket / approval instead ▸` with the **fallback key one click away** (try `ticket_id`, then `approval_id`), plus `[ show as single event ]`. It never asserts absence of a chain from a single-key miss. **P** — as above. **R** — `Chain assembly failed — <code>. Individual events still openable from the timeline.` **D** — reconstructed from the durable store (ticket/approval keys are durable and survive Redis loss), renders fully for completed history; an in-flight chain during degradation shows a trailing `▲ chain may be incomplete — live stream paused (Redis down); destructive hops are failing closed`.

### 7.5 Overlay — Revoke confirm (the safe action, launched from audit)

Revoke is the *stopping* direction — **easy to reach** (from the header, any row, detail, principal screen) and gated only by a **single confirm with a mandatory honesty block**: it states the ≤2-min benign staleness window (never misleads that revoke = instant total silence), the fact SoD-critical/destructive paths are already denied, and requires a reason. On confirm → write-before-ack; success toast carries the **honest propagation status** (`Revoked. 17/18 RS confirmed denied @ epoch 4472; 1 pending confirmation.`), not "done/silenced." **No re-enable here.** (This overlay is the same mechanism as §5.3; audit is one of its launch points.)

### 7.6 Export — for the git-backed audit trail

`[ Export ▾ ]` exports the current filtered/queried set for the operator's git-backed, diffable audit trail (Markdown-is-truth invariant). Scope (current filters+window / this trace / this principal) · Format (**JSONL** signed lines / **Markdown table** human-diffable / CSV) · Include toggles (authoritative traceparent, claimed_parent flagged untrusted, reason codes, epoch, obligations). **Preserves the trust distinction** (traceparent authoritative; claimed_parent labeled, never as key) and carries append-only line hashes. Reads the durable store → works in the degraded state. **STATES:** L (assembling) · E (`0 events in scope — adjust filters`) · P (dialog) · R (`export failed — <code>; try a narrower window`) · D (works; note `exporting from durable store; live tail excluded`).

### 7.7 Flows (audit)

- **Flow 1 — Scan → spot → stop:** Timeline (Live, Signal) → deny-cluster chip `▲ 6 denies in 40s` → pivot to Principal Oversight (confirms elevated deny rate, `self_approval_forbidden ×31`, mint anomaly) → `Revoke…` → confirm overlay with the honest ≤2-min limit → reason + confirm → button works until durable+Redis commit → success toast `Revoked. 17/18 RS confirmed @ epoch 4472; 1 pending.` (not "silenced") → a `⟲ REVOKE` row appears converging to `18/18`.
- **Flow 2 — Live incident → freeze → honest accounting:** alarm rows arrive (mint anomaly + guardrail auto-freeze) → header flips `▲ G1 FREEZE (auto)` → operator decides a full stop → `Global kill → Mission Control` (hand-off) → returning, the console mirrors `⛔ G2 QUIESCE-ALL` → the stream shows per-agent halt accounting `N confirmed · M pending` (never "all halted" until confirmations reach that count).
- **Flow 3 — Reconstruct a destructive chain:** any execute/redeem row → `view chain →` → Screen D assembles by authoritative traceparent → reads propose→approve→execute→redeem, `proposer≠approver` evidenced, any `approval_consumed`/`dual_holder_forbidden` flagged → optional `Export ▸ this trace`.
- **Flow 4 — Export for git trail:** filter/query → `Export ▾` → scope/format (Markdown for diffability) → integrity-preserving export.
- **Flow 5 — Investigate under degradation:** dependency drops → header `⚠ RS freshness UNKNOWN`; Timeline shows the amber degraded banner (safe-stopped, not broken) → Live tail paused, `Query history` works from the durable store → operator investigates, can still Revoke (durable write) or hand off to the Redis-independent global kill via MC → `[Runbook]` links out-of-band remediation. At no point does the operator go blind.

---

## 8. Routine management (identities · roles/scopes · budgets)

The day-to-day CRUD surfaces (PLAN §9.3) — deliberately quieter than the safety surfaces, but carrying the same non-negotiables: safe=easy/dangerous=deliberate; every screen has a Pattern-D degraded state; every stop/disable/revoke shows the honest post-state; the immutable SoD invariant is shown and never editable; soft-key-on-holder is a loud NO-GO.

**The friction ladder (uniform across all three areas)** — the shell's direction-aware friction (§3.5), tiered by irreversibility:

| Tier | Feel | Applies to | Gate |
|---|---|---|---|
| **T0 — immediate** | one click | all reads, nav, filters | none |
| **T1 — light** | single confirm + consequence line + Undo | edit a budget limit (reversible); register a key on a fresh agent; assign a **non-holder** role | inline confirm (signal-cyan), states effect |
| **T2 — deliberate** | typed-intent modal + consequence + honest post-state | **disable** a principal; **revoke** a key; **rotate** a holder principal's key | operator types the exact `sub`/`kid`; modal names blast radius; §2.5.4 full variant; on commit → honest post-state (§2.5.3) |
| **T3 — structurally absent / out-of-band** | capability does not exist online | relax/delete a holder ConflictPair; create/assign a `kind=break_glass` principal; flip `Principal.kind` | **not rendered as a live control** — shown as the immutable invariant with an explanation; the UI offers no path to defeat it |

### 8.1 Identities

**8.1.1 List** — grouped tabs (Humans / Agents / Services / Break-glass — humans and agents are **never pooled**; the tab counts make the separation explicit). Columns: `sub` (mono, immutable) · `kind` · `class` · `status` · **KEY ATTESTATION (first-class column)** · `headroom`.
```
┌ Identities ───────────────────────────────────────────────  [+ New identity ▾]┐
│ ◉ All  ○ Humans(1)  ○ Agents(18 · ⚠1 NO-GO)  ○ Services(4)  ○ Break-glass(1)   │
│ Filters:  [Active ▾]   [ Attestation ▾: all / non-exportable / soft-key NO-GO ] │
├──────────────┬────────┬──────────┬─────────┬───────────────────────┬──────────┤
│ op:eide      │ 👤human│ —        │ ●active │ passkey ✓ · TOTP recov│ —        │
│ patcher-07   │ 🤖agent│ executor │ ●active │ 🔒 TPM non-exportable  │ ▓▓▓░ 62% │
│ patcher-09   │ 🤖agent│ executor │▮▮frozen │ ⚠ SOFT-KEY NO-GO (DRIFT)│ ▓▓▓▓ 88%│
│ planner-02   │ 🤖agent│ planner  │ ●active │ 🔑 OS-keystore (ok*)   │ ▓░░░ 20% │
│ svc:gateway  │ ⚙svc   │ —        │ ●active │ 🔒 HSM non-exportable   │ —        │
│ bg:root      │ ⛨break │ —        │ ○offline│ offline factor (n/a)   │ —        │
└──────────────┴────────┴──────────┴─────────┴───────────────────────┴──────────┘
```
Executor-capable / holder / destructive principals MUST be hardware-bound / non-exportable (PLAN §3.6, Decision #6). A soft-key on such a principal is a **build NO-GO**, surfaced loudly (`⚠ SOFT-KEY NO-GO`, icon+text+color, pinned to the top of agents). `ok*` marks weaker tiers legitimate *only* for pure read/planner agents holding no holder scope.

**A soft-key executor can NEVER be a clean `●active` (finding-driven — labeled as drift, un-missable).** auth **refuses at assignment time** to activate a holder/destructive role on a non-attested key (§3.6/§8.1.3), so a soft-key-holder cannot be *granted* into existence. The only way one appears is **drift** — e.g. a key that degraded/was rotated to a soft tier *after* the holder grant, caught by the reconciliation guardrail (§3.5/§8.2.1). Such a row is therefore rendered as **drift**: the reconciliation/mint-anomaly guardrail **auto-freezes** it (status `▮▮ frozen`, PLAN §3.6), and the attestation cell reads `⚠ SOFT-KEY NO-GO (DRIFT)` — never a plain `●active`. It is pinned to the top of the Agents tab and never scrolls out of view.

**Fleet-level standing-hazard surfacing (finding-driven):** the list carries an **`Attestation ▾` filter/sort** (`all / non-exportable / soft-key NO-GO`) and the **Agents tab shows a standing NO-GO count badge** (`Agents(18 · ⚠1 NO-GO)`), so "how many executors are on non-attested keys right now?" is answerable at a glance, not by eyeballing 18 rows. The same aggregate is surfaced as a **standing-hazard tile on the Overview dashboard (§3.6)** and as an item feeding the **header FLEET-anomaly indicator (§3.1-2a)** — the highest-severity standing hazard finally has an at-a-glance rollup in every oversight surface.

`[+ New identity ▾]` splits New human / New agent (§8.1.4); service/break-glass creation is T3 (greyed with a "created only via the break-glass path" tooltip).

**8.1.2 Human detail** — passkey/WebAuthn first factor + TOTP recovery; no signing-key row (humans use the IdP SSO session); `sub`/`kind` immutable. Disable is T2 (ends live sessions, PLAN §4.7, + honest post-state).

**8.1.3 Agent detail** — a prominent **KEY ATTESTATION panel** conditional on the effective closure: for any principal whose closure holds a holder/destructive scope it shows `🔒 REQUIRED & SATISFIED` or, if the registered key is soft, a full-width **alarm block** *"⚠ NO-GO: this executor's key is a soft-key. auth will not activate a holder/destructive role on a non-attested key (§3.6). Rotate to a TPM/HSM non-exportable key, or the executor role cannot be granted."* Plus a **Signing keys** panel (public half only — private never transits auth): `kid` · status (`active`/`rotating` with a live overlap countdown / `revoked`) · storage tier · registered date · `[Rotate] [Revoke ⚠]`. Plus a **Mint activity** row surfacing the mint-anomaly detector state (baseline, recent mints, any safe-direction auto-freeze that fired, link to Audit).

**8.1.4 Flows** — **Create human** (T1→enrollment: `sub`+name+SoD-checked role → one-time passkey registration (origin-bound; UI warns if the public hostname/TLS isn't finalized) + TOTP recovery; status `pending-enrollment` until first passkey). **Create agent** (T1→key registration: `sub` + immutable `agent_class` + starting role; **key registration is client-originated** — the agent generates its keypair locally, the operator registers only the **public JWK** + attestation evidence for executor/holder agents; the UI **refuses a private key** and says so; `class=executor` or a holder-scope closure with non-attested key → **blocked at commit** with the NO-GO explanation). **Register key** (T1). **Rotate key** (T1 planners / **T2** holders: register new `kid` active → old → `rotating` overlap ≥ max TTL live countdown → `revoked`; holder rotation restates the new key must also be non-exportable). **Revoke key** (T2 → honest post-state). **Disable principal** (T2, typed `sub`, consequence block, → honest post-state N confirmed/M pending; re-enable is a *separate* T1 action toward more availability, never bundled into disable).

**STATES — Identities (all):** **L** — skeleton rows (tabular widths preserved so nothing reflows); header posture immediate. **E** — only agent/service tabs can be empty pre-provisioning (`No agents registered yet… ▸ New agent`); the human tab is never empty. A freshly created agent with **no key** → attestation panel `⚠ No key registered — agent cannot authenticate/mint until a key is registered` + `[+ Register key]`. **P** — as drawn; virtualize past ~50 rows. **R** — query failed, deps up → inline non-blocking `Couldn't load identities — retry`, retains last-known list greyed. **D** — global banner; **create/edit disabled** (writes paused) but **disable/revoke remain enabled via the emergency path** (STOP direction, Redis-independent), badged `emergency STOP available`; any `⚠ SOFT-KEY — NO-GO` badges stay visible (a degraded system must still show standing hazards); mint counters render `last-known @ epoch …`.

### 8.2 Roles & Scopes — with the static approve⊕execute separation made visible

The load-bearing idea: the operator can *see* that approve-side and action-side holder scopes never co-exist on a principal, and conflicting grants are impossible **at input time**.

**8.2.1 Principal roles + SoD view** — a **SoD HOLDER CHECK** panel splits the four holder scopes into side **A** = {`board:approve`, `cmdb:write-policy`} ⊕ side **X** = {`gateway:execute`, `vault:read-credential`}. The **verdict line is `SEPARATION INTACT` / `SEPARATION VIOLATED`** (never the word "HOLDS" — see the wording note below), and the panel carries **reconciliation freshness** so a green verdict is never shown from a stale or unavailable drift-check. Below it, **Effective scopes** (the inherited/transitive closure) with holder scopes badged and their source role shown.

*(a) INTACT — the normal, green state:*
```
┌ SoD HOLDER CHECK (approve ⊕ execute) ──────  reconcile ✔ drift-checked 3s ago ─┐
│  AUTHORIZATION side (A)          ⊕            ACTION side (X)                   │
│  ▸ board:approve      ✗ not held             ▸ gateway:execute    ✓ held        │
│  ▸ cmdb:write-policy  ✗ not held             ▸ vault:read-cred    ✗ not held    │
│  ✅ SEPARATION INTACT — this principal occupies at most ONE side.               │
└─────────────────────────────────────────────────────────────────────────────────┘
```
(For the operator, both governance scopes on side A are the allowed pair: `✅ SEPARATION INTACT — both are governance (allowed pair)`.)

*(b) VIOLATED — DRIFT DETECTED — the loud third state (finding-driven; this is the state that proves the panel actually checks):*
```
┌ SoD HOLDER CHECK (approve ⊕ execute) ──────  ⊘ reconcile: DRIFT @ 6s ago ──────┐
│  AUTHORIZATION side (A)          ⊕            ACTION side (X)                   │
│  ▸ board:approve      ✓ held (drifted)       ▸ gateway:execute    ✓ held        │
│  ⊘ SEPARATION VIOLATED — DRIFT DETECTED                                         │
│    ConflictPair board:approve ● gateway:execute co-held by agent:rogue-04       │
│    Source: uninterposed grant via <path> (off the Core-API path).               │
│    Reassurance: this token is denied at every PDP by the immutable Cedar        │
│      `forbid` — NO dual-scoped token is honored anywhere. This is drift in a     │
│      grant record, not an approve+execute that will be allowed.                 │
│    [ Revoke agent:rogue-04 ▸ ]   [ Disable principal ▸ ]   [ View source ▸ ]     │
└─────────────────────────────────────────────────────────────────────────────────┘
```
The VIOLATED state is **driven by the PLAN §3.5 reconciliation-guardrail signal — NOT by auth's own local grant closure** (which is input-gated and would keep showing green even while a drifted token spans both sides in the wild). It names the offending **ConflictPair**, the offending **principal**, and the **source** (which uninterposed/off-path grant), states the reassurance **verbatim** ("denied at every PDP by the immutable `forbid` — no dual-scoped token is honored"), and offers `Revoke` / `Disable` of the affected principal. It uses the `⊘` glyph + amber/danger + text (never color-only).

**Reconciliation freshness gates the green.** The panel shows the **drift-check age** (`reconcile ✔ 3s ago`). If the reconciliation read is **stale or unavailable**, the panel must **not** show a fabricated green — it renders `⚠ CANNOT CONFIRM SEPARATION — drift-check unavailable (as-of <age>); treat as UNVERIFIED` (halt-gold, the safe reading), never `SEPARATION INTACT`.

> **Wording note (finding-driven):** the verdict word is **`SEPARATION INTACT` / `SEPARATION VIOLATED`**, and `held / not held` is reserved **strictly** for per-scope occupancy — eliminating the near-homograph collision where a fast scan could conflate "`HELD`" (a scope is occupied — data) with a passing verdict "`HOLDS`". The two now share no root.

**STATES — SoD HOLDER CHECK panel:** **L** — panel skeleton; the verdict is **never** rendered from a partial/ambiguous closure (server-side computed). **E** — a base-role principal → both sides `✗ not held` + `✅ SEPARATION INTACT (neither side occupied)`. **P** — INTACT (a) or VIOLATED (b) as drawn. **R** — closure/verdict computation failed → **fail safe**: `⚠ couldn't compute the separation verdict — treated as UNVERIFIED` (never a fabricated green), and dependent grant controls default non-selectable (§8.2.2 R). **D** — if the reconciliation read is down, the panel shows `⚠ CANNOT CONFIRM SEPARATION` (halt-gold, unverified) rather than a stale green; the immutable ConflictSet reference (§8.2.3) stays fully visible so the operator can still audit the invariant while safe-stopped.

**8.2.2 Grant flow — conflicts impossible at input time, with "why"** — conflicting options are **rendered non-selectable (🚫), not merely warned** (PLAN §9.3 "PREVENT, not just detect"). Each disabled option **states which existing grant conflicts and which immutable ConflictPair applies**, computed over the **full inherited/effective + downward-transitive closure** (so a conflict two levels down is also disabled with its reason). A **live "effective closure after this grant" preview** with the `SEPARATION INTACT` verdict (same wording as §8.2.1, never "HOLDS") lets the operator confirm the invariant before committing. Blocked at input for: any second holder scope; any `vault:*` credential scope on a `kind=agent` (kind-gating); granting an **executor role to a soft-key agent** (attestation gate, links to the key panel). The API rejects identically — the UI mirrors the authoritative check, never the sole gate.
```
┌ Manage roles · agent:patcher-07 ──────────────────────────────────────────  [×] ┐
│  ◉ role:agent-planner      (adds board:run-ceremony)                  [Grant]    │
│  ◌ role:operator-approver  🚫 UNAVAILABLE                                         │
│      └ would grant board:approve → conflicts with HELD gateway:execute            │
│        (ConflictPair board:approve ● gateway:execute). approve ⊕ execute          │
│  ◌ any role incl. vault:read-credential  🚫 UNAVAILABLE                           │
│      └ vault:read-credential is SERVICE-only; agents may not hold it (kind-gating)│
│  Preview of effective closure AFTER this grant:  ✅ SEPARATION INTACT (one side)   │
└──────────────────────────────────────────────────────────────────────────────────┘
```
Grant of a non-holder role = T1 (confirm + Undo); a grant that adds a holder scope = T1 but the confirm restates the resulting side occupied and requires attestation satisfied.

**8.2.3 Conflict-set reference — the immutable invariant, visibly un-editable** — a read-only matrix with **no edit affordances at all** (Decision #5, §2.5.10, §3.5 constraint 1):
```
┌ SoD Conflict Set · "sod-holders"  🔒 IMMUTABLE (compiled-in) ───────────────────────┐
│                     board:approve  cmdb:write-policy  vault:read-cred  gateway:execute│
│  board:approve            —              ○ allowed          ● excl.        ● excl.    │
│  cmdb:write-policy     ○ allowed            —               ● excl.        ● excl.    │
│  vault:read-cred        ● excl.          ● excl.               —           ● excl.    │
│  gateway:execute        ● excl.          ● excl.           ● excl.            —       │
│  ● mutually exclusive (approve-side ⊕ action-side)   ○ allowed (both governance)     │
│  This matrix and its Cedar `forbid` are HARDCODED. They cannot be added, deleted,    │
│  weakened, or disabled from this console or the Core API.  [no edit controls rendered]│
└──────────────────────────────────────────────────────────────────────────────────────┘
```

**STATES — Roles & Scopes (all sub-views):** **L** — SoD-check panel skeleton; effective closure computed server-side (never render a partial/ambiguous holder verdict). **E** — a principal with only `role:agent-base` → both sides `✗ not held` + `✅ HOLDS (neither side occupied)`. **P** — as above. **R** — closure computation failed → grant UI **fails safe**: options default to **non-selectable** with *"couldn't verify effective closure; grants disabled until re-checked"* (never fail-open on a SoD control). **D** — global banner; **all grant/revoke controls disabled** (writes paused); the **read-only SoD view and the immutable ConflictSet reference remain fully visible** (the operator can still audit that separation holds while safe-stopped); closures render from last-known durable state.

### 8.3 Budgets — static caps vs live consumption, headroom, trips

Budgets are compute/time/concurrency — **never dollars** (PLAN §6). Overview table + a reserved **Global WIP** row (the `org`/`*` principal — the same shared Redis state Mission Control renders/edits; a note states MC owns the global **kill switch** + WIP, auth holds the policy; no parallel tally). Headroom bars are live (Redis counters, carry the freshness rule §2.5.6-style tag); low headroom badged `⚠` (icon+text).

Per-agent detail shows **all four dimensions** (PLAN §6.1): rate/compute (GCRA `T,τ`), concurrency (`global_max`, `per_class_max`), cooldown per action-class, and **lifetime/liveness** (wall-clock compute + MC no-progress detector) — static **limit** always beside **current consumption** and **live headroom**. A **Recent trips** panel lists the `429` over-budget events (`reason=rate|cooldown|concurrency`, `Retry-After`), each linking to the audit line. A fail-mode line reminds: destructive/SoD classes **fail-closed** on Redis loss; benign = **allow-but-locally-bounded** (so a degraded budget view is *safe*, not permissive).

**Edit limits (T1 — routine, reversible):** inline edit of `T`/`τ`/`global_max`/`per_class_max`/cooldowns/lifetime, single confirm with consequence line + **Undo** toast (versioned `BudgetPolicy`). No typed-intent — tightening only *reduces* action (safe direction). One soft guard: raising a destructive-class concurrency above 1 shows a caution ("weakens the double-execution backstop") but is permitted.

**STATES — Budgets:** **L** — static limits render immediately from durable policy; live counters/headroom spinner until Redis responds (never a fake 0%). **E** — agent on role default with no override (`Using role default (role:agent-executor). No principal override. [Add override]`); trips `No trips in the selected window.` **P** — as drawn. **R** — counter read failed (Redis up, query erred) → headroom cells `—` + retry; static limits still shown. **D** — global banner; **Edit disabled** (policy write paused); live consumption/headroom/in-flight render `last-known @ epoch … — counters stale` (greyed, never fabricated); a line states the safe fallback actually in force ("destructive/SoD fail-closed; benign allow-but-locally-bounded by the in-process ceiling"); trips list only up to last-known.

---

## 9. Global states matrix (Stage-3 exit criterion — every screen defines all five)

| Screen | Loading (L) | Empty (E) | Populated (P) | Error (R) | **Degraded (D)** |
|---|---|---|---|---|---|
| **Global header / halt affordance** (§3.1) | posture from cache `↻`; **halt live** | N/A (G0 is a posture) | posture ticker + freshness + FLEET indicator | posture-unknown → SAFE-STOPPED, never false green | DEPS gold `⛊ SAFE-STOPPED — <dep>`; STOP live; FLEET still reports separately |
| **Overview dashboard** (§3.6, landing) | tiles skeleton; header live; halt+flagged tiles first | quiet-fleet positive-fact | fleet + honest state + hazards + flagged + recent audit | tile-scoped error, screen survives | banner; live tiles "last-known"; STOP + revoke live; NO-GO/auto-frozen hazards stay |
| **Halt Control** (§5.1) | actuators live before data | N/A | G1/G2 actuators + scope | partial commit ≠ success; actuator hot | **Redis-independent STOP (signed kill epoch)** — one motion, no typed intent/no offline factor; offline break-glass only if auth itself down |
| **Halt Status Board** (§5.2) | header from engage; **countdown already running** | all-clear resting state (calm) | full honesty board + Triggered-by (if guardrail) + L2 mirror-age | partial telemetry → per-RS/L2 "unknown," halt intact | Redis-independent freshness (JWKS), coarser, still safe |
| **Per-Agent Revocation** (§5.3) | principal skeleton; controls usable | no target → search | granularity ladder + reason + hold | partial commit ≠ success | surgical disabled; offer broader available STOP |
| **Token & Key Revocation** (§5.4) | JWKS key list loads | actuator disabled til target | jti/client_id/kid + typed kid confirm | invalid target / kid mismatch locks actuator | jti/client_id disabled; **kid retire PROMINENT** |
| **SAFE-STOPPED** (§5.5) | checking deps; STOP live throughout | N/A | works/doesn't two-column + runbook | static cached page + offline break-glass path | this *is* the state; sub-variants by downed dep |
| **Lift / Restore** (§5.6) | posture header; release gated | nothing to lift | step-up + typed-epoch + consequence | step-up/epoch mismatch blocks | normal lift unavailable → break-glass RESTORE (logged) |
| **BG-0 Sealed entry** (§6.3) | skeleton tile, disabled | "no factor provisioned" → enroll | sealed tile, cover liftable | "can't confirm readiness" → still liftable | tile **promoted**; safe-hint; opens without down dep |
| **BG-1 Present factor** (§6.4) | preparing challenge | no factor enrolled | challenge live | `factor_invalid` + retry, audited | designed path: offline verify, proceeds while auth down |
| **BG-2 Consequence + arm** (§6.5) | static panels instant | N/A | arm disabled til reason+phrase | phrase/reason/arm errors explicit | records queue "pending reconciliation"; arm NOT blocked |
| **Break-glass banner** (§6.7) | resume from session state | absent (no session) | ⛔ ACTIVE + countdown + STOP | channel lost → caution, still shows | coexists with SAFE-STOPPED strip |
| **BG-3 Active console** (§6.8) | controls instant, state skeleton | "no stop engaged yet" honest | full control surface | STOP fail = "kill NOT engaged" explicit | steers to Redis-independent levers |
| **BG-4 STOP result** (§6.9) | "engaging…" | N/A | honest halt result (N✔/M◐/K⇉) | "STOP NOT engaged" + fallback | kid-prune path, honest ≤30s bound |
| **BG-5 RESTORE** (§6.9) | typed-intent gate | "nothing to restore" | confirm + reason + typed | "NOT restored" explicit | warns restore may lag until recovery |
| **BG-6 Exit / auto-revoke** (§6.9) | "ending…" | N/A | posture-unchanged notice | "NOT ended" → TTL still auto-revokes | exits offline; reconcile on recovery |
| **BG-7 History** (§6.10) | table skeleton | "no sessions" (calm, good) | expandable session/action log | "cannot load ≠ empty" | served from durable mirror; pending-reconciliation flags |
| **Audit Timeline** (§7.1) | skeleton rows; header cache `↻` | filter-empty vs quiet-empty | live tail / history | inline query-fail + retry | amber safe-stopped; **history readable (durable)**; live tail paused; freshness UNKNOWN; runbook |
| **Event Detail** (§7.2) | field skeleton; header from row | no-selection prompt | full tabular truth + jumps | summary-from-row fallback | served from durable; live-only fields honestly "unavailable" |
| **Principal Oversight** (§7.3) | header + tile skeletons | no-events vs not-found | summary + live tiles + scoped stream | per-tile error, screen survives | durable summary/history full; live tiles "unavailable"; revoke works |
| **Destructive-Chain** (§7.4) | hop skeletons | single-key miss → honesty-safe "may span trace-ids; correlate by ticket/approval ▸" | multi-key (ticket/approval/trace) trace + SoD evidence | assembly-fail, events still openable | durable reconstruction (ticket/approval keys survive Redis); in-flight boundary flagged |
| **Revoke confirm** (§5.3/§7.5) | — | — | confirm + mandatory honesty block | write-fail (no false ack) | works (durable write-before-ack) + degraded note |
| **Audit Export** (§7.6) | assembling | 0-in-scope | dialog | export-fail + narrow-window hint | works (durable read; live tail excluded) |
| **Identities list** (§8.1.1) | skeleton rows (widths preserved) | agent/service pre-provision; human never empty | grouped tabs + attestation column/filter + NO-GO tab badge; soft-key holder shown as frozen DRIFT | query fail → last-known greyed | create/edit paused; disable/revoke live (emergency); NO-GO badges stay |
| **Identity detail** (§8.1.2/.3) | header first; panels lazy | fresh agent, no key → register prompt | attestation + key lifecycle + mint | panel-scoped errors | register/rotate/edit paused; disable/revoke live; counters last-known |
| **Roles & Scopes** (§8.2) | SoD-check skeleton | base-role → SEPARATION INTACT (neither side) | SoD check (INTACT / **VIOLATED-DRIFT**) + grants + ConflictSet | closure-fail → **UNVERIFIED, never green**; grants fail SAFE (non-selectable) | grants disabled; drift-check down → "CANNOT CONFIRM SEPARATION" (never stale green); read-only SoD + immutable matrix stay visible |
| **Budgets** (§8.3) | static limits instant; counters spinner | role-default no-override; no trips | 4 dimensions + trips | counter read fail → `—` + retry | edit paused; live numbers last-known greyed; safe-fallback line |

*Every human-facing screen and every state is specified above; the agent/MCP surface has no UI (§1.2) and is intentionally absent from this matrix.*

---

## 10. Open questions for Claude Design + Stage-3 review placeholder

### 10.1 Open questions for Claude Design

1. **Overview/landing dashboard — now specified (§3.6), remaining question is tuning only.** The Overview is fully wireframed as a first-class screen with all five states (§3.6): halt-posture, standing-hazards rollup, unacknowledged flagged-principals, fleet roster, budget-headroom outliers, recent-oversight strip, each pivoting to its drill-down. **Open for Design:** validate the exact tile *priority/ordering* and density under real fleet sizes, and confirm the flagged-principals tile and header FLEET indicator (§3.1-2a) share one unacknowledged-incident model without double-counting. (No longer deferred — the landing oversight surface is specified, not a TODO.)
2. **`Shift+Esc` global shortcut.** Proposed to *focus* (never fire) the ENGAGE-FREEZE control. Confirm no OS/browser conflict on target platforms; propose a documented alternative if so. It must never actuate a stop by itself.
3. **G2 intensified-gold vs the kill-switch module's original red.** This spec resolves the seam in favor of the shell rule ("gold is the system's safe posture; red is the operator's finger") — G2 ENGAGED is *intensified gold*, not red. Confirm the intensified-gold treatment reads as "more severe than G1" across the room without borrowing danger-red; if not, propose a texture/weight cue (not hue) to escalate G1→G2.
4. **Press-and-hold dwell times** (G1 ≈600ms, G2 ≈1000ms) and their reduced-motion numeric-countdown equivalents — validate against operator usability under stress; confirm the touch long-press mapping at ~375px.
5. **Honest-triad at scale.** For very large fleets, confirm the expand-to-list behavior of the `confirmed/pending/draining` chips (virtualization, grouping by RS vs by `sub`) and how the "unaccounted" reconciliation row renders.
6. **Break-glass "break the seal" motion** — confirm the exact signature animation and its instant reduced-motion swap read as equally deliberate.
7. **Runbook link target.** The out-of-band operator runbook is a Stage-7 deliverable (PLAN §12.2); confirm the link's resting behavior before that artifact exists (placeholder page vs disabled-with-note).
8. **Deep-link contract with Mission Control** (MC agent → auth Principal Oversight filtered to `sub`; auth → MC for global-kill hand-off) — confirm URL/route shape so the hand-off link and inbound deep-links are stable.
9. **Export formats** — confirm whether JSONL signed lines and the Markdown-table diffable format both ship in Build, or whether Markdown-first satisfies the git-backed-audit invariant for Stage-3.

### 10.2 Stage-3 review (findings & dispositions)

Critical-infra review across three lenses, all returning **YES_WITH_FIXES**. **18 findings total → 18 RESOLVED, 0 ACCEPTED-as-is.** Of these, **12 are honesty/safety breaks; all 12 are RESOLVED** (a break may never merely be accepted). Each entry states *where/how* the spec now handles it.

**Lens verdicts (three):** killswitch-under-pressure **YES_WITH_FIXES** · oversight-adequacy **YES_WITH_FIXES** · sod-honesty-safety **YES_WITH_FIXES**.

#### Lens A — killswitch-under-pressure

- **A1 · critical · HONESTY/SAFETY BREAK — Under Redis-down the fastest STOP carried heavy friction; the Redis-independent one-motion halt was prose, not an actuator.** **RESOLVED.** §3.4 now specifies that with Redis-down-but-auth-up the header `◉ ENGAGE FREEZE (G1)` **stays a one-motion press-and-hold performing the signed kill-epoch raise — no typed intent, no offline factor**. §5.5 SAFE-STOPPED promotes a first-class `HOLD TO STOP — raise signed kill epoch (G1)` press-and-hold **above** `RETIRE AS KEY` and `BREAK-GLASS STOP`. §5.1-D is **renamed** from "Break-glass STOP mode" to **"Redis-independent STOP (signed kill epoch)"**, and the offline-factor break-glass path is explicitly reserved for the *different* failure where auth login/verify itself is down. The "safe is easy" principle now holds exactly when seconds count.
- **A2 · high · HONESTY/SAFETY BREAK — Ambiguous whether the header ENGAGE-FREEZE is the actuator or opens a panel (undefined panic step-count).** **RESOLVED.** §2.5.7, §3.4, and §5.1 now state unambiguously that the **header button IS the press-and-hold actuator** — hold it directly → G1 engaged in one motion, no panel traversal. The §5.1 panel is opened only via a `⋯ options` affordance for the secondary choices (G2, single-agent scope) and is never a step in the default G1 stop.
- **A3 · high · HONESTY/SAFETY BREAK — Open modals scrim over and focus-trap away the "always reachable" halt; `Shift+Esc` conflicted with alertdialog trapping.** **RESOLVED.** §2.5.4 and §2.7 now specify the header halt renders **above the modal scrim and stays interactive**, and `Shift+Esc` is a **single-keystroke global escape hatch** that force-dismisses any non-STOP modal to a safe cancel **and** focuses the header ENGAGE-FREEZE, overriding the alertdialog focus-trap by design. Only the §5.1 Halt Control panel (which contains the actuator) is exempt.
- **A4 · medium · HONESTY/SAFETY BREAK — Break-glass banner "second press escalates toward G2" bypassed the deliberate G2 hold.** **RESOLVED** (same fix as SOD-4/A-B16). §6.7 (and §6.8, §2.5.7) now require the banner's first press to engage **G1**, and escalation to **G2 to use a distinct, explicitly-focused ~1000ms hold-actuator (never pre-focused, never a bare second tap)** — one G2 motion across the whole console.
- **A5 · medium · HONESTY/SAFETY BREAK — Header ENGAGE-FREEZE post-engage label unspecified (could read "not yet done" when done).** **RESOLVED.** §2.5.7 and §3.1-zone-3 now specify the header primary **relabels to `▮▮ G1 ENGAGED · Review halt ▸`** on engage (and `▮▮▮▮ G2 ENGAGED` at G2), mirroring the gold pill/band, with a distinct `Escalate to G2 ▸` actuator — it never keeps reading `ENGAGE FREEZE (G1)` once engaged.

#### Lens B — oversight-adequacy

- **B1 · high · HONESTY/SAFETY BREAK — No cross-screen live-misbehavior signal; a deny-storming agent was visible only on the Timeline while the header read HEALTHY.** **RESOLVED.** §3.1 splits the center header zone into **two independent readouts — `DEPS` (auth dependency health) and `FLEET` (live agent-behavior health)** — with a persistent **FLEET-anomaly indicator (`▲ N AGENTS FLAGGED ▸`)** on every screen, driven by the same detectors as the Timeline, color+icon+text, click-through to the pre-filtered Timeline, implemented as an **unacknowledged-incident counter** that persists until the operator dispositions each principal. `⛊ HEALTHY` can no longer imply the fleet is quiet.
- **B2 · high — The primary at-a-glance Overview/landing dashboard was unspecified (deferred to an open question).** **RESOLVED.** Added **§3.6 — a fully wireframed first-class Overview** with all five states (incl. Pattern D): halt-posture (honest triad + Triggered-by), standing-hazards rollup (soft-key NO-GO count, auto-frozen count, SoD-drift count), unacknowledged flagged-principals with jump-to-revoke, fleet roster, budget-headroom outliers, recent-oversight strip — each pivoting to its drill-down. Open Question #1 downgraded to tuning-only.
- **B3 · high · HONESTY/SAFETY BREAK — Destructive-chain correlated only on `traceparent`; async hops may not share a trace-id and the empty state read as "no chain exists."** **RESOLVED.** §7.4 now correlates on **three first-class keys in priority order — `ticket_id`, `approval_id`, then `traceparent`** — shows *which key stitched each hop* (`by ticket`/`by approval`/`by trace`), and states how the authoritative trace is propagated / bridged across re-mints. The empty state is rewritten honesty-safe: *"Only this event shares `<key>`. A destructive chain can span multiple trace-ids across async re-mints — correlate by ticket / approval instead ▸"* with the fallback one click away. No more false-blindness.
- **B4 · medium — Soft-key NO-GO not filterable/aggregated at fleet level.** **RESOLVED.** §8.1.1 adds an **`Attestation ▾` filter/sort**, a **standing NO-GO count badge on the Agents tab** (`Agents(18 · ⚠1 NO-GO)`), and surfaces the aggregate as an **Overview standing-hazard tile (§3.6)** and a **header FLEET-indicator input (§3.1-2a)**. It also clarifies a soft-key holder can never be a clean `●active` (refused at assignment per §3.6) — it can only appear as **drift**, so the example row is now `▮▮ frozen · ⚠ SOFT-KEY NO-GO (DRIFT)`, pinned and un-missable.
- **B5 · medium — A single agent's mint-anomaly auto-freeze can trip a suite-wide G1, but halt surfaces didn't attribute the triggering principal or offer jump-to-revoke.** **RESOLVED.** §5.2 Halt Status Board adds a **`TRIGGERED BY` attribution block** (shown for guardrail-initiated halts) naming the principal, the anomaly reason, and **explicitly whether the response was suite-wide G1 vs a targeted per-key auto-revoke**, with one-click `Revoke <sub> / disable key ▸` and `View principal ▸`. The same attribution rides the header auto-freeze state and the Overview halt tile.
- **B6 · low — Runaway-but-permitted agent (looping within budget, all PERMITs) suppressed by the default Signal filter with no dedicated detector.** **RESOLVED.** §7.1 adds a **`▲ high activity` cue** (default ≥ 4× rolling-24h baseline sustained ≥ 30s) that feeds the same header FLEET indicator and Overview rollup, while documenting that budget trips + the MC no-progress/liveness detector remain the authoritative catch — the boundary is now a stated decision, not a gap.
- **B7 · low — Deny-cluster / anomaly thresholds unspecified.** **RESOLVED.** §7.1 specifies **defaults (≥ 5 denies / rolling 60s; high-activity ≥ 4× baseline / 30s)**, shows the active threshold in the chip tooltip, states they are **operator-configurable**, and binds them to **one shared threshold set** that also drives the header FLEET indicator (§3.1-2a) so on-screen and cross-screen signals cannot disagree.

#### Lens C — sod-honesty-safety

- **C1 · high · HONESTY/SAFETY BREAK — SoD HOLDER CHECK panel drew only the green "HOLDS" state — no VIOLATED/drift rendering (could assert a separation guarantee it wasn't checking).** **RESOLVED.** §8.2.1 adds a loud third state **`⊘ SEPARATION VIOLATED — DRIFT DETECTED`**, driven by the **PLAN §3.5 reconciliation-guardrail signal (not auth's local grant closure)**, naming the ConflictPair, principal, and uninterposed source, stating the reassurance verbatim ("denied at every PDP by the immutable `forbid` — no dual-scoped token is honored"), with `Revoke`/`Disable`. The panel renders **reconciliation freshness** and, when the drift-check is stale/unavailable, shows `⚠ CANNOT CONFIRM SEPARATION — treat as UNVERIFIED` (halt-gold) rather than a fabricated green. Full L/E/P/R/D states specified.
- **C2 · high · HONESTY/SAFETY BREAK — kid-retirement consequence omitted that it invalidates the operator's own session and forces re-auth mid-emergency.** **RESOLVED.** §5.4 consequence block now states *"THIS ALSO ENDS YOUR CONSOLE SESSION — you (and all humans) re-authenticate immediately; the retirement is already in effect; break-glass remains reachable via the offline factor and does NOT depend on this key."* Post-action UX routes to a **static/pre-bundled SAFE-STOPPED re-auth screen** confirming *"kill applied @ epoch — re-authenticate to continue; retirement already in effect,"* so the forced logout reads as success, not a dead console. The AS-key rotation-overlap case (a different current `kid` signing human tokens → session survives) is stated explicitly.
- **C3 · medium · HONESTY/SAFETY BREAK — Halt Status Board showed L2 Gateway physical-stop as flat "CONFIRMED" with no freshness/source qualifier, though auth holds only a read-only mirror.** **RESOLVED.** §5.2 gives the L2 row the **same freshness discipline as the per-RS table**: a mono **mirror-age stamp** (`0.4s ago`), an explicit **`source: Gateway/MC mirror`** label, and defined states **PENDING / CONFIRMED / STALE-UNKNOWN** (`cannot confirm L2 from here — verify at Mission Control ▸`). A stale mirror never reads as a live confirmation; the "either layer alone halts action" copy stays. Mirrored into BG-3 (§6.8).
- **C4 · medium · HONESTY/SAFETY BREAK — Break-glass banner double-press-to-G2 with no dwell contradicted the console's own G2 accident-proofing.** **RESOLVED** (unified with A4). §6.7/§6.8/§2.5.7 now require G2 escalation to use the distinct, explicitly-focused ~1000ms hold-actuator; a bare second tap can never quiesce the suite. One G2 motion console-wide.
- **C5 · medium · HONESTY/SAFETY BREAK — The ⛔ glyph was overloaded onto the visible-absence panels (BG-2 CANNOT-DO, BG-3 NOT-AVAILABLE), undermining "the capability visibly does not exist."** **RESOLVED.** A **glyph-reservation rule** added to §2.5.1 (and referenced in §2.5.10): **⛔ is reserved exclusively for actionable STOP/deny/kill affordances and MUST NOT appear on any "cannot do / does not exist" statement**, which now render with the **lock glyph 🔒** as printed constitutional facts with no interactive affordance. §6.5 and §6.8 wireframes/prose updated to 🔒; the BG-2 Arm button no longer carries ⛔.
- **C6 · low — "HELD" vs "HOLDS" near-homograph on the SoD panel misreadable under pressure.** **RESOLVED.** §8.2.1 renames the verdict line to **`✅ SEPARATION INTACT` / `⊘ SEPARATION VIOLATED`** and reserves **`held / not held` strictly for per-scope occupancy**; §8.2.2 grant preview uses the same `SEPARATION INTACT` wording. The two terms now share no root.

**Global-states matrix re-confirmed:** §9 still asserts **all five states (L/E/P/R/D) for every human-facing screen, including the new Overview (§3.6)**; the matrix rows for Global header, Overview, Halt Control (D → Redis-independent STOP), Halt Status Board (Triggered-by + L2 mirror-age), Destructive-Chain (multi-key), Identities (attestation filter + NO-GO + drift), and Roles & Scopes (INTACT/VIOLATED + UNVERIFIED) were updated to match these revisions. The agent/MCP surface remains intentionally UI-less (§1.2).
