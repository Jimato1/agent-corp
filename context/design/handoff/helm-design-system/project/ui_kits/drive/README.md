# Drive — UI kit

The store for every non-markdown deliverable of agent work — rendered PDFs, exports,
generated files — keyed by the ticket that produced it. **Both** archetypes: Instrument
for the browser / metadata / admin, a Workshop preview pane inside the Instrument shell.
Drive is **not** in the kill chain (read-only HaltBand); browsing and download continue
under a stop by design.

### Screens (4)
- **Ticket Browser** — artifacts grouped by originating ticket; each group header shows
  the three-state verification `StatePill` (`✔ VERIFIED` / `◐ UNVERIFIED_PENDING` /
  `⛒ VERIFIED_ABSENT`) beside the TicketRef (never recoloring it), with provenance
  badges and `created_by` on every row. `verified_absent` collapses to an Admin deep-link.
- **Artifact Detail** — metadata + append-only version history with `FenceState` per
  version (the zombie `⚠ SUPERSEDED` drawn identically to Board/Gateway), and the
  `PreviewSurface` (image / paper text / embedded pdf, with a download-only card for
  off-allowlist types). Restore / Delete-mark are light (reversible) confirms. Toggle the
  demo to see the pdf renderer safe-stop (gold, "original bytes intact — Download works").
- **Upload** — a modal using the same two-step intent→bytes API as agents, with the
  `UploadDropzone` (per-file streaming StatePills). Not destructive → no ceremony.
- **Admin** — the one screen with a destructive act: the health strip (`DiskWatermarkMeter`
  obeying the false-green rule), the `verified_absent` escalation queue (resolved in
  Drive's own gate, not MC's), the GC console, and the Phase-2 **Purge** — full-friction
  DangerAction with a blast-radius preview that **fails closed** under auth-staleness or an
  engaged kill epoch.

### App-specific components
`PreviewSurface` (sniffed-allowlist media/doc viewer, embeds the pdf app) ·
`DiskWatermarkMeter` (fill-vs-threshold gauge, never green over the watermark) ·
`UploadDropzone` (streaming multi-file target).

### Files
`index.html` loads `../../_ds_bundle.js` → `dr-data.jsx` → `dr-parts.jsx` →
`dr-screens.jsx` → `app.jsx`.
