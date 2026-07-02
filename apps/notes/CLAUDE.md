# CLAUDE.md — Notes (`notes`)

> Read `context/ARCHITECTURE.md` and `context/PROCESS.md` first. This file only covers what is specific to Notes. Run the 7-stage pipeline; this app is **Standard**, so normal rigor applies.

## Identity

Notes is **the agents' external memory and the org's work product** — the Confluence-style place where thinking and output live. Markdown is the source of truth here in the most literal sense: the database is a rebuildable index, the files are canonical. This is where recon findings ground the debate, where the planning huddle physically happens, and where retros write lessons that feed the next cycle.

## Risk class: Standard

## Agent surface (MCP)

- Read / write / search / link notes.
- **Search is a tool, not a context dump:** expose SQLite FTS5 query, return only what's relevant per step.
- Structured templates per note type the agent fills in (constrained outputs).

## Human surface (UI)

- WYSIWYG editor that stores as markdown (leaning Milkdown or TipTap/ProseMirror — validate in research).
- Review surface for `needs_review` artifacts; browse `[[wikilinks]]` and backlinks.

## Key mechanics to build

- **Notes as external memory** (§5): YAML frontmatter carries status/type/links/tags; per-type templates (e.g. Research: Objective / What I did / Findings / Open questions / Next step).
- **`[[wikilinks]]` + backlinks** as associative memory.
- **Search (SQLite FTS5)** exposed as a tool; the index is rebuildable from the markdown, never canonical.
- **Git-backed audit trail** (§5): notes are files, so every agent edit is diffable and reversible — non-negotiable for autonomous operation.
- **Where the conversation lives** (§6): the deliberation thread for a planning ticket is persisted here as a structured note, giving the operator a reviewable record of every huddle. Explicitly **not** the Chat app.

## Definition of done (Stage 7)

- Markdown remains canonical: DB/index fully rebuildable from files, proven.
- Both surfaces read/write the same notes over one shared state.
- Git history captures every agent edit; search returns scoped results, not dumps.
- Standard invariants pass (MCP authz, audit logging of state changes).
