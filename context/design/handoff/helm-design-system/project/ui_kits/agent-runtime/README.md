# Agent Runtime — UI kit

A deliberately **thin** operator status surface (one screen) reporting the *physical truth*
of the runtime host — model stack + supply-chain provenance, local GPU/inference headroom,
TPM key-custody seal health, and this runtime's own drain/kill compliance — the facts
Mission Control cannot show because they live on the runtime hardware itself. **Instrument**,
dark-only. The rich per-agent fleet console is **not here** (it's MC's LiveAgentView); this
surface deep-links out and is the **client half** of the kill switch, hosting no trigger.

### The one screen (`/status`) — panels top to bottom
Runtime Instance (printed absence: "holds NO host credentials · cannot approve or execute
work") → Model Stack & Provenance (DataTable + TierBadge, Sigstore load-gate ARMED) →
`EngineHeadroom` (VRAM / decode-stream-vs-knee / TPM sign-queue) → `TPMSealStatus`
(hardware key-custody health, never keys) → Drain / Kill Compliance (client half).

### The load-bearing distinction this kit demonstrates
Toggle the demo (bottom-right) between the three postures:
- **G0 nominal** — all VERIFIED / ONLINE, TPM REACHABLE/BOUND/CERTIFIED.
- **Commanded kill (F)** — gold `▮▮ KILL-SWITCH ENGAGED` HaltBand + `drain_state ⇉ DRAINING`
  + the honest triad; "the hard stop is at the Gateway chokepoint + auth revocation, not here."
- **Outage-quiesce (G)** — gold `⛊ SYSTEM SAFE-STOPPED` band + `QUIESCED_BY_OUTAGE`
  (inferred, not commanded) + TPM/headroom degrade to `CANNOT CONFIRM` in gold, never a
  fabricated green. **The two are rendered differently and never conflated.**

### App-specific components
`EngineHeadroom` (physical VRAM/decode/TPM-queue gauges; neutral fill, `--attn` near the
knee, never on the halt-gold ramp) · `TPMSealStatus` (hardware-root-of-trust health only) ·
the model-provenance ledger is the provenance-mode pivot of the shared AuditInspector, not a
new component.

### Flagged gaps (per the brief, left to design)
The exact `EngineHeadroom` gauge encoding (chosen here: neutral horizontal bar, amber near
the knee) and whether per-process fleet rows ever render (default: deep-link to MC, not
render — honored here).

### Files
`index.html` loads `../../_ds_bundle.js` → `ar-app.jsx` (single file: data + parts + the one
screen).
