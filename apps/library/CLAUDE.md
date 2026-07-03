# CLAUDE.md — Reference Library (`library`)

> Read `/context/ARCHITECTURE.md` and `/context/PROCESS.md` first. This file only covers what is specific to the Library. Run the 7-stage pipeline; this app is **Standard**, with one elevated obligation: its ingestion path is a first-class §12 (untrusted-content) surface and cannot be designed without it.

## Identity

The Library is **the corporate reference shelf** — a curated RAG corpus of externally-authored documentation (vendor docs, man pages, distro guides — e.g. "everything an agent needs to confirm an Ubuntu command") that agents query for fast, cited confirmation instead of model priors or live web search. It is deliberately NOT Notes: Notes is the lab notebook (agent-*written* working memory, internal provenance, FTS); the Library is the reference shelf (externally-*ingested* documentation, tiered provenance, semantic + FTS hybrid retrieval). Keeping them separate keeps the provenance boundary clean.

(Added 2026-07-01 by operator decision, extending the gap-remediation pass — see `context/GAP_REMEDIATION.md` §3 "Operator additions.")

## Risk class: Standard

It cannot act and holds no credentials — but it feeds *every* agent's context, so its integrity failure mode is quality poisoning, not privilege escalation. The §12 untrusted-content policy applies to its ingestion path in full, and its Stage-5 threat model must treat **corpus poisoning via ingestion** as the primary attack.

## Invariant compliance

- **Markdown is the source of truth:** the corpus is markdown files (converted at ingestion) with YAML frontmatter carrying provenance tier, source URL(s), version/distro/date metadata, and verification evidence links. The chunk/vector/FTS index is a **rebuildable projection** — blow it away, re-embed from the files (ARCHITECTURE §10: corpus canonical, index rebuildable).
- **Two views, one state:** MCP surface and human UI over one API.

## Provenance / confidence tiers (the core design)

Every document and chunk carries a tier; **retrieval always returns the tier with the content** so a consuming agent knows what it leans on:

1. **`sandbox-verified`** — testable claims that actually executed in a tier-0 sandbox (ARCHITECTURE §5), evidence attached. **Auto-admitted** to the trusted tier; operator spot-audits.
2. **`cross-referenced`** — N independent sources agree; claim not executable. Lower confidence; batched operator review admits. (Cross-referencing alone does not defeat poisoning — internet sources are correlated — hence it ranks below sandbox.)
3. **`single-source` / `agent-authored`** — quarantine tier; retrievable only with an explicit "unverified" flag.

**Hard lines:**
- Staleness is a first-class hazard: version/distro/date metadata is mandatory (an Ubuntu 22.04 doc confidently misleading an agent on a 24.04 host is worse than no doc). Retrieval filters by the target host's CMDB facts where applicable.
- **The Library confirms *how*; the external verifier still confirms *done*.** Retrieval never substitutes for Wazuh-grade verification of real-world actions.
- Curation agents read raw internet content and are the most injection-exposed principals in the company: per §12, curation outputs never ride the auto-approve lane into fleet execution.

## The curation team (behavior, not new machinery)

Curation is a standing **team** per ARCHITECTURE §6: a standing epic ("keep the library accurate and current") + a persona set + a ticket-tag subscription. Scheduled kickoffs re-verify corpus slices; event kickoffs fire on new-info triggers (e.g. lessons pushed from retro notes flagging undocumented behavior); a steward persona owns the epic's triage. Agents *propose* ingestion; admission follows the tier rules above. Sandbox testing runs through the **Gateway against CMDB tier-0 disposable targets** — never via any execution path of the Library's own (the Library has none).

## Agent surface (MCP)

- Query: hybrid semantic + FTS search returning chunks + citations + provenance tier + version metadata.
- Propose ingestion (lands per tier rules; never direct write to the trusted tier).
- Curation-team tools (verify, cross-reference, attach sandbox evidence) — scoped to curation personas via auth.

## Human surface (UI)

- Browse/search the corpus; inspect any doc's provenance, sources, and verification evidence.
- Ingestion review queue (batched approval for tier-2 admissions; spot-audit stream for tier-1 auto-admissions).
- Manage collections, retirement/deprecation of stale docs.

## Key mechanics to build

- Ingestion pipeline: fetch → convert to markdown + frontmatter → chunk → embed → index, with tier assignment.
- Hybrid retrieval (vector + FTS5) with tier/version filtering; citation-bearing results.
- Rebuildable index proven: full re-embed from the markdown corpus.
- Embedding inference served by **agent-runtime's model stack** (a `context/CONTRACTS/` seam; embedding load belongs in the gap-1.2 GPU sizing artifact).

## OPEN research questions (Stage 1)

- Chunking strategy (structure-aware vs fixed; man pages vs prose guides).
- Embedding model choice + where it runs (agent-runtime seam) + re-embed cost at corpus scale.
- Hybrid search weighting; whether reranking earns its latency locally.
- Tier thresholds: what N for cross-referencing; what sampling rate for operator spot-audit of tier-1.
- Corpus versioning: how a doc supersedes an older distro version without deleting evidence history.

## Definition of done (Stage 7)

- An agent's query returns cited, tier-tagged, version-correct chunks; a poisoning attempt via propose-ingestion demonstrably cannot reach the trusted tier without sandbox evidence or operator review.
- Index destroyed and fully rebuilt from the markdown corpus with identical retrieval behavior.
- Both surfaces exercise the same state; ingestion queue round-trips through the human UI.
