# Mission Control — UI kit

The manager's single console over the whole suite. **Instrument** archetype on
**every** screen — no Workshop/reading pane anywhere (MC shows plans, transcripts,
and note *references* but deep-links out to Notes/Library to edit). Dark-only,
compact density, Inter + JetBrains Mono.

MC is one of only **two** apps whose header halt affordance is a **live actuator**
(the other is auth); everywhere else it is a read-only mirror. MC **owns** the
canonical `ReviewQueue` (`/review`) and `LiveAgentView` (`/agents`) that every other
app's deep-links resolve against, and it **hosts the actuation** of the global kill
switch (wired to *call* auth — MC mints no epoch and stores no authoritative halted
state).

### The load-bearing rules this kit demonstrates
- **Never a false green.** Every mirrored/streamed figure carries a `source`/`as-of`
  stamp; a stale/unavailable read renders `STALE-UNKNOWN` / `CANNOT CONFIRM` in
  halt-gold, never a frozen green (see Edge's "simulate sidecar down", Agents' "simulate
  correlated loss").
- **Liveness is never a bare green dot** — it's the phi-accrual figure `φ7.2` + last-beat
  age `♥9.4s` + a state pill (`● LIVE / ▲ SUSPECT / ⇉ DRAINING / ◼ DRAINED / QUIESCED`).
- **Cockpit-not-enforcer**, rendered as constitutional absence: the kill button *calls*
  auth; queue decisions write *browser-direct to Board*. Printed 🔒 absences, never greyed
  toggles.
- **Directional friction**: engaging a stop / tightening a budget = toward-**less** →
  light cyan single-confirm, press-and-hold (never typed). Lifting / widening / approving
  = toward-**more** → full red ceremony with typed-intent + step-up.
- **HonestState copy discipline**: the `✔ confirmed · ◐ pending · ⇉ draining` triad shows
  all three even at zero; never "all stopped" while pending/draining > 0.

### Screens (10)
`Overview` (`/`) · `LiveAgentView` (`/agents`) · `AgentDrillIn` (`/agents/<sub>`) ·
`ReviewQueue` (`/review`) · `ReviewItem` (`/review/<ticket_id>`) · `HaltControl`
(`/halt`) · `Budgets` (`/budgets`) · `Edge` (`/edge`) · `Anchors` (`/anchors`) ·
`Settings` (`/settings`).

### App-specific components (compose shared chips, never redraw a shared entity)
`AttentionBand` · `FleetAnomalyBanner` · `SpawnTree` · `BudgetMeter` (4-dim, never
dollars) · `EdgeTile` · `HaltNotConfirmed` (full-viewport fail-loud takeover, gold not
red) · plus helpers `SourceStamp`, `KillLevelPill`, `Liveness`, `Panel`.

### Files
`index.html` loads, in order: `../../_ds_bundle.js` → `mc-data.jsx` (sample fleet /
queue / anchors / budgets / edge / kill mirror) → `mc-parts.jsx` (app components) →
`mc-screens.jsx` (the 10 screens) → `app.jsx` (shell + router).

### Try it
Engage the header **freeze** actuator (hold) → the gold `HaltBand` + honest triad
appear and the rail posture turns gold; lift it from `/halt` (typed-intent + step-up).
On `/halt` click **simulate auth call failure** → the `HaltNotConfirmed` takeover. On
`/agents` click **simulate correlated loss** → the `FleetAnomalyBanner` + STALE-UNKNOWN
cells. Open a review item and approve the untrusted destructive op (watch the
requested→confirmed transition — never a false green in between).

### Flagged gaps (from the brief — placeholders, not decisions)
`suppress_fraction 40%`, `suppress_window 60s`, `phi_threshold 8`, `noisy_net_phi 12`,
and per-role `progress_budget` are **PRE-SIZING / UNSET** (see `/settings`) pending
measurement; the UI nags until set and nothing enforces on a PRE-SIZING value.
`HoldToActuate` dwell (G1 ≈600ms / G2 ≈1000ms) and the `Shift+Esc` focus chord are
tunable Build defaults, not locked.
