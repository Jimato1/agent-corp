# Notes — UI kit

The org's Confluence-style external memory & work product — where agents write recon
findings, the planning huddle is recorded, and retros write lessons. Markdown is the
literal source of truth; the index is rebuildable. Notes holds **no** ticket-lifecycle,
approval, or kill authority — it renders truth read-only and deep-links out to the
owner (Board / Mission Control).

**Archetype: BOTH.** A **Workshop** reading/writing content pane inside the dark
**Instrument** shell — the *one* place in the suite the "document as warm paper" surface
appears (`--paper-page` + Source Serif 4 at 17/28, with a dark-reading alternate). The
shell, rail, header, tables, and **every safety chip stay Instrument-dark** in both
reading modes. There is no "light Instrument".

### Screens (6)
- **S1 Corpus Browser & Search** — the searchable corpus as a DataTable; each row shows
  the note's **effective** taint (own ∨ transitive). `/` focuses search.
- **S2 Note Editor** — the `NoteEditor` paper pane + a metadata rail composed *only* of
  shared chips (TicketRef, TierBadge showing own **and** effective + `tainted_via`,
  FenceState, PrincipalRef). `ticket-status` renders as a muted `mirror · authority:
  Board`, never an authoritative pill. Taint's absence is a printed 🔒 fact. Paper/dark toggle.
- **S3 Deliberation Thread** — `DeliberationThreadView`: seven fixed phase sections,
  per-turn `PrincipalRef` attribution, Independent-positions / adversarial-review
  structure, ground truth **linked (never inlined)** so an operator sees the huddle rests
  on ⚠ UNTRUSTED input. No converge/escalate button — "phase transitions happen on the Board".
- **S4 Link Graph & Backlinks** — `LinkGraph` canvas (nodes carry taint; the second
  place effective-taint propagation is visible) synced with a backlinks DataTable.
- **S5 Review-Attention** — consumes MC's canonical queue read-only (ReviewChips +
  deep-links); a footer prints "Reviews are cleared on the Board / Mission Control,
  never here". Gate state is read live with a mandatory Freshness stamp.
- **S6 Provenance & History Inspector** — `AuditInspector`: git-trailer audit rows with
  a chain-verify that is **never green when stale/failed**, and a provenance pivot
  (own vs effective, `tainted_via`) — read-only, no correction control.

### App-specific components
`NoteEditor` (the one Workshop paper authoring surface) · `LinkGraph` (wikilink/backlink
canvas) · `DeliberationThreadView` (the seven-phase ceremony record). The metadata rail
is deliberately **not** a component — it's a composition of shared chips.

### Safety seams
Taint is display-only (printed 🔒 absence, never an editable control); the clear-review
control is absent by construction; ticket-bound writes fail **closed in gold** when the
Board is unreachable (Pattern D, never red); the audit chain and every mirror obey the
false-green prohibition; HaltBand is read-only (Notes isn't in the kill chain).

### Files
`index.html` loads `../../_ds_bundle.js` → `nt-data.jsx` → `nt-parts.jsx` →
`nt-screens.jsx` → `app.jsx`. Try: open "Canary batch findings" (paper editor, toggle
paper/dark, see own vs effective taint); open "NAS reboot huddle" (deliberation record);
Graph (taint propagation); History (git audit + provenance pivot).

### Flagged gaps (from the brief)
The rare operator-only taint-**downgrade** endpoint is deliberately kept off all note
surfaces (API-only until an admin-console decision). S5's live gate decoration needs the
session to carry `mc:read`; until confirmed it renders the honest "not scoped for MC"
Pattern-R state and deep-links out.
