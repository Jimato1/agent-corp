# Library — UI kit

The corporate reference shelf — a curated RAG corpus of externally-authored docs that
agents query for *cited, tier-tagged, version-correct* confirmation instead of trusting
model priors. **Both** archetypes: a Workshop reading pane (the doc body only) inside a
dark Instrument shell; every table, chip, and safety component stays Instrument-dark.
Library is **not** in the kill chain — read-only HaltBand, no fencing, no ticket-gate
clear.

### Screens (6)
- **Corpus Search** — the `ScopeResolver` (host_id XOR target_os/distro/ver/arch, honest
  `version_scope`, `include_unverified`) + a results DataTable carrying the full trust
  envelope inline (tier · version scope · evidence coverage ▣/▢ · the curation-ingested
  UNTRUSTED taint on **every** row) + the `DocReadingPane` (paper, covered spans shaded).
  Tier is a badge, **never a sort key**.
- **Doc / Provenance Inspector** — the evidence ledger (append-only) whose ATTESTATION
  column is the heart: `gateway_delivered` verified vs `agent_asserted` printed with the
  constitutional fact **✕ never satisfies the gate** (a §4.7 absence, no affordance), a
  content-bound sha column, chain-verify that's never green when stale, and the
  chunk/coverage map beside the paper body.
- **Ingestion Review** (admin, human-only) — Library's **own** admission gate (item id is
  `doc_id`, distinct from Board tickets): batched cross-referenced review with the
  `AdmissionDiff` sub-pane, bulk-approve capped at 10, and `agent-asserted → NOT
  admit-eligible` as a printed absence.
- **Tier-1 Spot-Audit** (admin) — auto-admissions surfaced for oversight; the `▲ TIGHTENED`
  switching chip (never green), uncovered-heavy rows drawn to the eye, and a poison-reject
  that gates cluster quarantine behind a *second* never-automatic confirm.
- **Collections & Lifecycle** (admin) — retirement/supersession that preserves evidence
  history; **no delete affordance exists anywhere** (printed absence).
- **Index Status** (admin) — the named home of the degraded modes: corpus↔index
  consistency under the false-green rule, Pattern-D gold banners (lexical-only,
  durability-degraded, pending_embed partial), and the full-friction reindex.

### App-specific components
`DocReadingPane` (paper body + per-chunk coverage overlay) · `ScopeResolver`
(version-scoped retrieval control) · `AdmissionDiff` (the anti-rubber-stamp diff surface).

### Files
`index.html` loads `../../_ds_bundle.js` → `lib-data.jsx` → `lib-parts.jsx` →
`lib-screens.jsx` → `app.jsx`.
