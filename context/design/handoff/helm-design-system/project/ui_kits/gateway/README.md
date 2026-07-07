# Gateway — UI kit

**The Hands** — the only component in the suite that runs commands on real hosts, and
the operator's read-first control room for watching every host execution, proving its
segregation-of-duties, walking its immutable audit chain, and confirming the kill switch
physically bit. **Instrument**, dark-only — no Workshop pane; the only streaming text is
machine output in a mono console. The Gateway hosts **no kill trigger** (it deep-links
out); its only two human write paths are catalog change-control and orphan re-redemption.

### Screens (7)
- **Live Execution Monitor** — per-host cards (a layout of shared chips): run StatePill,
  TicketRefs, executor PrincipalRef, class + destructive TierBadge, FenceState, the
  `SoDChainStrip` collapsed to four ticks. No start-a-run control.
- **Run Detail + SoD Proof** — the signature screen: the full `SoDChainStrip`
  (0 CALLER → BOARD → CMDB → VAULT → MUTEX, reconstructed from the chain, with the
  printed "SoD is enforced in code, not here" absence and the first-failing-check-red
  rendering on a rejected preflight) + the streaming `RunConsole` (degrades to gold
  CANNOT-CONFIRM under a stop, never a frozen-green console).
- **Audit Trail** — `AuditInspector`: chain-verify green only on a completed walk, gold
  CANNOT-CONFIRM between, red CHAIN BROKEN for a detected break; MC anchor status.
- **Kill-switch Status** — read-only ENGAGED HaltBand + the L2-confirmation panel (the
  Gateway's own authoritative truth auth reads directly) + the honest halted-run triad;
  the actuator is **absent by construction** (printed fact + deep-links).
- **Catalog Registry** — the one operator write path: diff-hash-bound, step-up,
  blast-radius preview; "agents cannot write the catalog by any path".
- **Sandbox Runs** — tier-0 evidence with the `SandboxEvidenceView` provenance duality
  (input UNTRUSTED / evidence VERIFIED); no host parameter exists here.
- **Orphan Reconciliation** — the Gateway-local queue after a crash; re-redemption is a
  step-up ceremony; "the Gateway never auto-resumes a half-run".

### App-specific components
`SoDChainStrip` (the four-check evidence proof) · `RunConsole` (streaming machine-output
tail) · `SandboxEvidenceView` (tier-0 evidence detail). The false-green prohibition is
load-bearing above all apps here.

### Files
`index.html` loads `../../_ds_bundle.js` → `gw-data.jsx` → `gw-parts.jsx` →
`gw-screens.jsx` → `app.jsx`. Toggle **simulate kill** (bottom-right) to see the read-only
HaltBand + L2 panel + draining triad.
