# CLAUDE.md — Drive (`drive`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to Drive. Run the 7-stage pipeline; this app is **Standard**, so normal rigor applies.

## Identity

Drive is **the artifact store for everything that isn't markdown** — the binary/non-note outputs of the org's work (rendered PDFs, exports, generated files), organized by the ticket that produced them. Notes holds the thinking; Drive holds the deliverables that thinking produced.

## Risk class: Standard

## Agent surface (MCP)

- Put / get / list files **by ticket**, so every artifact traces back to the work that made it.

## Human surface (UI)

- Browse, preview, and download artifacts.
- Previews lean on the `pdf` app as a callable render/view tool (do not reimplement rendering here).

## Key mechanics to build

- **Ticket-keyed storage:** artifacts are addressable by ticket id; a stored file always names its provenance.
- **Markdown stays in Notes:** Drive is explicitly for non-markdown outputs — do not make it a second source of truth (root invariant).
- **Per-app storage default** (§9): SQLite for metadata + a file store; no shared DB unless research shows a forced dependency.
- **Preview via `pdf`:** integrate the pdf render/view tool for in-browser preview rather than building a viewer.

## Definition of done (Stage 7)

- Both surfaces put/get/list the same artifacts over one shared state.
- Every artifact is traceable to its originating ticket.
- Preview path works through the `pdf` tool; no markdown canonicalized here.
- Standard invariants pass (MCP authz, audit logging of state changes).
## SETTLED DECISIONS (ratified 2026-07-02 — `context/RATIFICATIONS_2026-07-02.md`)

1. **(D-14)** **Build: plain filesystem CAS** (blobs by SHA-256) **+ SQLite metadata/version chain**. MinIO rejected (upstream archived Apr 2026); SeaweedFS/Garage/Nextcloud rejected. **Versity Gateway is the designated zero-migration S3 swap-path** if an external S3 consumer ever materializes — no suite component speaks S3 today.
