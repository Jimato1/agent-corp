# Chat — UI kit

The suite's **doorbell, not its door** — the operator's live agent→operator
notification/escalation feed plus a soft operator→fleet broadcast. **Both** archetypes:
an Instrument-dark shell wrapping a Workshop reading pane for agent markdown bodies.
Chat is **not** in the kill chain (read-only HaltBand), hosts no queue, clears no gate.

### Screens (4)
- **Feed** — the live stream. Each row leads with the app-specific `KindBadge`
  (kind glyph + server-clamped priority band P1–P5); un-acked **escalations pin to top
  in the attention family (amber, never halt-gold)**; the ReviewChip deep-link is always
  captioned "(target wins)"; `FenceState` is advisory-only (greyed). Ack / Ack-all are
  light confirms.
- **Notification detail** — the deep-link landing: a target-wins snapshot caption, the
  body on the Workshop paper surface, and the sanitization made visible (raw HTML +
  remote images stripped to dead text, body links dead — the **only** live link is the
  template-derived MC deep-link, anti-phishing).
- **Broadcast** — the operator→fleet composer + active banner (signal/attention family,
  **deliberately not gold, not a HaltBand**) + history. The non-authority statement is a
  printed 🔒 absence ("a broadcast does not stop, gate, or command"). Post/Revoke are
  light confirms.
- **Health** — the doorbell's own liveness under the **false-green prohibition** (a
  doorbell that lies about whether it can ring is the worst failure): SSE / push sink /
  DB size / backup / the honest amber `▲ awaiting mc:read grant` resolve-seam row.

### App-specific components
`KindBadge` — the one Chat-unique widget: it composes a ReviewChip / StatePill and adds
the priority band no shared component carries. Escalations are attention-amber, never
gold.

### Files
`index.html` loads `../../_ds_bundle.js` → `ch-data.jsx` → `ch-parts.jsx` →
`ch-screens.jsx` → `app.jsx`.
