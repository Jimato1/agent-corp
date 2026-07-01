# auth Operator Console — UI build MANIFEST (Phase-2 UI)

Dependency-free static HTML/CSS/JS realizing `ui/UI_SPEC.md`. **No node, no build
step, no framework.** Open any `.html` directly in a browser; the shared shell
partial (`shell.js`) injects the Global System-State Header, the ENGAGED/degraded
band, and the break-glass hazard banner, then wires the press-and-hold actuators
and the `Shift+Esc` halt-focus shortcut.

> **Visual rendering is CANNOT-VERIFY-HERE** (no browser in this sandbox). The
> HTML/CSS/JS is **real and structurally valid** — every `.html` parses via
> `python -m html.parser` (see below) and all block tags balance. Pixel-accurate
> contrast, layout reflow, focus-ring rendering, and animation timing must be
> confirmed in a real browser by the operator (command below).

## A11y floor (stated once, in `tokens.css` header; enforced across all screens)
WCAG 2.1 AA — body/label contrast ≥4.5:1, large text/pips/rings/band-edge ≥3:1;
colour is **never** the only signal (every state = colour + icon + text label,
legible in grayscale/colour-blind); always-visible 2px signal-cyan focus ring +
halo; `prefers-reduced-motion` drops all animation and turns the press-and-hold
ring into a segmented **numeric countdown** that still enforces the dwell; touch
targets ≥44×44px; responsive to ~375px with no horizontal scroll.

---

## REAL (fully built, structurally valid, browser-runnable interaction)

| File | UI_SPEC | What is real |
|---|---|---|
| `tokens.css` | §2 | The full design language: substrate/ink/signal/semantic/**HALT-GOLD** colour tokens (incl. the intensified-gold ENGAGED treatment distinct from operator-red), tabular figures, type scale, spacing, radii, motion, and the component vocabulary (status pill, ENGAGED/SAFE-STOPPED band + **G2 non-hue escalation** variant, honest triad chips, confirm dialog, press-and-hold actuator, data table, immutable ConflictSet matrix, visible-absence block, Pattern-R error). Reduced-motion + focus-ring rules. |
| `shell.css` | §3 | Global header layout (3 zones: level word · **DEPS vs FLEET** two independent truths · kill gauge + FREEZE), nav rail (safety-first order, gold ring on KILL when >G0), break-glass banner, **halt-above-scrim exemption**, responsive down to ~375px (halt never collapses into a drawer). |
| `shell.js` | §3.1, §2.5.7-8, §2.7 | **Shared shell partial** — injects header/band/bg-banner from `window.AUTH_SHELL`; renders the level word, DEPS+FLEET readouts, kill gauge, and the FREEZE actuator that **relabels post-engage** (`▮▮ G1 ENGAGED · Review halt ▸`, never a stale "not yet done"). Reusable **press-and-hold actuator** (radial fill; reduced-motion numeric countdown; release-before-complete aborts; Space/Enter). **`Shift+Esc`** focuses (never fires) the FREEZE control + escape-hatch dismiss of non-STOP modals; documented **fallback chord `Ctrl+Alt+H`**. |
| `halt_control.html` | §5.1 | Halt Control (secondary choices). **G1 press-and-hold ~600ms pre-focused (autofocus); G2 ~1000ms not pre-focused** — dwell times tunable via `--dwell-*` / `data-dwell`. Reduced-motion numeric countdown. Scope selector (global/single-agent). **Visible-absence** line (lock glyph, no control) for the SoD-relax capability. Redis-independent STOP note. Keyboard-shortcut legend (Shift+Esc + Ctrl+Alt+H fallback). |
| `halt_status_board.html` | §5.2 | The **honest post-action board**. `TRIGGERED BY` block (guardrail auto-freeze, suite-wide-vs-targeted stated) with jump-to-revoke. **L1-APPLIED vs L2-Gateway-CONFIRMED** with mirror-age + `source: Gateway/MC mirror` + PENDING/CONFIRMED/STALE-UNKNOWN (never a false CONFIRMED). **confirmed/pending/draining triad that always sums** (live JS proves the sum; injects `? N unaccounted` if it wouldn't). **Benign-token staleness countdown** (live ≤2-min interval, collapses to "window closed"). **Per-RS epoch freshness** table with `stale→closed`. Escalate-G2 hold + deliberate Lift. |
| `breakglass.html` | §6 | The **VISIBLE-ABSENCE** panel: "CANNOT DO — BY CONSTRUCTION" printed constitutional statements with **🔒 LOCK glyph (never ⛔ STOP glyph)** and **no interactive affordance** (no hover/focus/click). STOP/RESTORE-only capability list. **Typed-intent arm** (exact case-sensitive `ENGAGE BREAK-GLASS`, **paste blocked**, Arm disabled until reason + phrase match, then recolours danger — real JS). Immutable ConflictSet matrix. Rendered in the degraded (auth-down) first-class path. |
| `safe_stopped.html` | §5.5 | The auth/Redis-DOWN **"SAFE-STOPPED not broken"** surface. Halt-gold frame ("holding in a SAFE posture", never red/"error"). **Most prominent affordance = one-motion `HOLD TO STOP — raise signed kill epoch (G1)`** (no typed intent / no HW key) above RETIRE-AS-KEY and offline BREAK-GLASS STOP. Works-vs-doesn't two-column truth; dependency-status strip ("auth-verify still 2/2 replicas"). |

## SCAFFOLD (honest stubs — real markup + spec references; data mocked, writes/live-feeds CANNOT-VERIFY-HERE)

| File | UI_SPEC | Scaffolded (marked with an on-screen SCAFFOLD note) |
|---|---|---|
| `overview.html` | §3.6 | Landing dashboard tiles: halt posture, standing hazards (soft-key NO-GO / auto-frozen / SoD-drift), unacknowledged flagged principals, fleet roster, budget outliers, recent oversight strip. |
| `identities.html` | §8.1 | Grouped tabs + **key-attestation as a first-class column**; soft-key-on-holder shown ONLY as **`▮▮ frozen · ⚠ SOFT-KEY NO-GO (DRIFT)`** (pinned), Attestation filter, NO-GO tab badge. |
| `roles_scopes.html` | §8.2 | **Visible SSD prevention**: SoD HOLDER CHECK verdict (`SEPARATION INTACT`, UNVERIFIED fallback), conflicts rendered **non-selectable (🚫) at input time with "why"**, immutable ConflictSet matrix (no edit affordances). |
| `budgets.html` | §8.3 | Four budget dimensions (rate/concurrency/cooldown/lifetime) — static limit beside consumption + live headroom; recent trips; never dollars. |
| `audit_timeline.html` | §7.1 | Event stream + filter/inspector layout, deny-cluster anomaly chip with shown threshold, traceparent-vs-claimed-parent note; audit-screen scaffold notes **both exports ship — Markdown + signed JSONL**. |

---

## Stage-3 resolutions applied in this build
- **Intensified-gold G2 + NON-HUE escalation cue** (`tokens.css .halt-band--g2`, `shell.css .gs-level--g2`): heavier keyline, larger word, doubled interlock glyph, wider edge striping, inset ring — escalation by weight/shape/size, **never** by borrowing danger-red.
- **`Shift+Esc` halt-focus** wired to *focus* (never fire) the FREEZE control from anywhere, plus escape-hatch modal dismiss; **documented non-browser-captured fallback chord `Ctrl+Alt+H`** wired identically and surfaced in the halt-screen legend + `aria-keyshortcuts`.
- **Audit exports**: `audit_timeline.html` states **both Markdown + signed JSONL** ship.
- **Header FREEZE relabels post-engage** (A5); **G2 only via distinct ~1000ms hold**, never a bare second tap (A4/C4); **glyph reservation** — 🔒 for constitutional absence, ⛔ only for actionable STOP (C5); **L2 mirror freshness** never a false CONFIRMED (C3); **SEPARATION INTACT/VIOLATED** wording, never "HOLDS" (C6).

## CANNOT-VERIFY-HERE (and how the operator closes each)
1. **Visual rendering / contrast / reflow / focus rings / animation** — no browser in the sandbox.
   Close it: open the files, e.g. `python -m http.server 8080 --directory "platform/auth/ui/build"` then browse `http://localhost:8080/halt_control.html`; verify with axe DevTools + a colour-blindness simulator + `prefers-reduced-motion` toggled.
2. **Live data** (SSE/websocket over the Core API, Redis pub/sub freshness, real `/api/verify`, denylist epochs, budget counters) — no backend here. The pages run a **static mock**; actuator "completion" simulates write-before-ack locally. Close it: serve the Phase-1 Core API and point the shell's fetch layer at it (integration task).
3. **Real halt actuation / break-glass arming** — needs the auth backend + the offline WebAuthn factor. Close it: run the Stage-7 human-halt drill against the deployed stack.

## HTML parse validation (run in this sandbox — REAL, GREEN)
Command:
```
python -c "import html.parser,sys,glob; [html.parser.HTMLParser().feed(open(f,encoding='utf-8').read()) for f in glob.glob(r'C:\Users\eide1\Documents\Vibe Coded Apps\agent-corp\platform\auth\ui\build\**\*.html',recursive=True)]; print('HTML OK')"
```
Output: `HTML OK` — all 9 `.html` files parse; a supplementary block-tag balance check (`div/section/table/head/body/html`) reports **0 mismatches** across all 9 files.
