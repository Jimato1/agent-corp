# RESEARCH.md — Reference Library (`library`)

> **Stage 1 — Research.** Risk class: **Standard** (one elevated obligation: corpus poisoning via ingestion is the mandatory primary Stage-5 threat axis — ARCHITECTURE §12, `apps/library/CLAUDE.md`).
> **Artifact status:** complete. Every OPEN research question in `apps/library/CLAUDE.md` has a researched recommendation; every external-system fact is cited (web-verified 2026-07, not inherited from training data); every cross-app dependency is named as a `context/CONTRACTS/` candidate to freeze before Stage-2 exit.
> **Method:** web-grounded fan-out across six research axes + an adversarial fact-check pass that re-verified every version/license/benchmark claim against the primary source (repo / model card / license file). Corrections from that pass are folded into the facts below.
> **Scope discipline:** this is Stage 1 — feature landscape, cited integration facts, and recommendations. **No schemas, no API definitions, no code.** Data model and surfaces are specified in Stage 2 (`planning/PLAN.md`).

---

## 0. What the Library is — and the provenance boundary that defines it

The Library is **the corporate reference shelf**: a curated RAG corpus of **externally-authored** documentation (vendor docs, man pages, distro guides — "everything an agent needs to confirm an Ubuntu command") that local agents query for **fast, cited, tier-tagged, version-correct** confirmation *instead of* model priors or live web search.

The single most load-bearing design fact is the boundary against **Notes**:

| | **Notes** (lab notebook) | **Library** (reference shelf) |
|---|---|---|
| Content origin | agent-**written** working memory | externally-**ingested** documentation |
| Provenance | internal authorship (`agent_id`, git history) | tiered external provenance (source URL, verification evidence) |
| Trust posture | trusted-by-construction (own agents wrote it) | **untrusted-by-construction** (raw internet is adversarial input — §12) |
| Retrieval | FTS5 over notes | hybrid semantic + FTS with **tier + version returned inline** |
| Canonical store | markdown corpus + git remote | markdown corpus + provenance/verification frontmatter |

Keeping them separate keeps the provenance boundary clean: Notes may be trusted because our own agents authored it under audit; the Library **may not**, because its inputs are attacker-influenceable. That single asymmetry drives the entire tier model (§4), the poisoning threat model (§6), and the "curation outputs never ride the auto-approve lane" rule (§6, §7). Every recommendation below is subordinate to it.

**Invariant anchors this app inherits (not to be reinvented):**
- Markdown corpus **canonical**; chunk/vector/FTS index is a **rebuildable projection** — destroy it, re-embed from files, identical retrieval (ARCHITECTURE §10; durability table: "corpus canonical, index rebuildable").
- Two views, one state: MCP surface and human UI are siblings over one API.
- The Library **holds no credentials and cannot act.** Sandbox verification runs through the **Gateway** against **CMDB tier-0 disposable** targets — the Library has *no execution path of its own* (ARCHITECTURE §5, `apps/library/CLAUDE.md`).
- `doc_id` is minted by the Library (immutable frontmatter `id`, Dendron pattern); chunk IDs are `doc_id#<n>`, derived, never stored cross-app (`context/specs/IDENTIFIERS.md`).

---

## 1. Hybrid retrieval architecture (vector + FTS, and whether a reranker earns its latency)

**Question (CLAUDE.md):** how mature self-hosted setups combine vector + FTS (BM25/FTS5), and whether a local reranker earns its latency at homelab scale — favoring designs where full re-embed from files is cheap.

### Findings (cited)

- **The repo's own default — SQLite (`sqlite-vec` + FTS5) in one file — is the correct primary choice** at the Library's scale (10³–10⁵ docs → 10⁴–~10⁵ chunks). The whole index is a single `.db` deleted and rebuilt from the markdown corpus in one pass, with no external service to coordinate. `sqlite-vec` (Apache-2.0, current 0.1.x, pre-v1) supports metadata/auxiliary/partition-key columns and `rowid IN (...)` pre-filtering — exactly what tier + version filtering needs. Its **one hard limitation is brute-force KNN only (no ANN index as of mid-2026)** — the maintainer's tracking issue confirms ANN is still pre-v1 wishlist. Brute force over ~10⁵ vectors is single-digit-to-tens of ms; approaching 10⁶ high-dim vectors it degrades. Mitigations: metadata/partition pre-filtering (shrinks the scanned set), int8/binary quantization (supported since v0.1.0). [github.com/asg017/sqlite-vec; issue #25; alexgarcia.xyz sqlite-vec stable release]
- **FTS5 (ships with SQLite, public domain) is a sufficient BM25 engine** and lives in the *same* file as `sqlite-vec`, so one rebuild regenerates both halves. Tantivy (Rust, MIT — richer tokenizers, phrase/prefix queries) is the documented **upgrade path only if** FTS5's tokenizer/ranking proves inadequate on man-page/CLI content — not a Stage-1 requirement. [turso.tech/blog/beyond-fts5]
- **Reciprocal Rank Fusion (RRF, k≈60) is the 2026 industry-standard fusion baseline** and the right default here: it fuses on *rank* only, sidestepping score normalization, and is the recommended starting point across OpenSearch / ParadeDB / MongoDB guidance. Weighted/convex fusion (CombSUM/CombMNZ) only wins with reliable score normalization *and* a strong prior that one backend is better — a later tuning experiment, not the default. [opensearch.org RRF; paradedb.com RRF]
- **A local cross-encoder reranker is a conditional YES — pluggable, not an MVP hard dependency.** General guidance says skip reranking when a small curated corpus already yields >80% precision@10 under a <200 ms budget (the Library partly fits — hence not mandatory). But two things flip it *for this app*: (a) the failure mode is an agent trusting a wrong / wrong-version chunk — exactly the "good recall, poor top-k precision" case a cross-encoder fixes for a 5–15 pt NDCG@10 lift at <200 ms; (b) the local cost model (free compute, generous latency budget for a *reference lookup*, not autocomplete) removes the usual reason to skip. Small Apache-2.0 rerankers make it cheap: **bge-reranker-v2-m3** (568M, Apache-2.0, ~2–4 GB VRAM) or **Qwen3-Reranker-0.6B** (Apache-2.0, runs on 8 GB+). ⚠️ **jina-reranker is license-flagged** (historically CC-BY-NC; confirm SPDX — avoid if non-commercial). [futureagi.com best rerankers 2026; localaimaster reranking guide; mixedbread mxbai-rerank-v2]
- **Re-embed cost is dominated by embedding *inference* (owned by agent-runtime), not index build.** Index build is row inserts (trivial). At the stated scale a sub-1B embedder re-embeds 10⁴–10⁵ chunks in seconds-to-minutes and 10⁶ in tens-of-minutes — so "destroy index, re-embed, identical retrieval" is genuinely routine (nightly/on-demand). This *confirms* the ARCHITECTURE §10 rebuildable-index invariant is cheap in practice. [spheron.network TEI throughput; qwenlm.github.io]

### Current facts (web-verified; corrections from the fact-check pass folded in)

| Component | Version (2026-07) | License | Fit note |
|---|---|---|---|
| **sqlite-vec** | 0.1.x (pre-v1, breaking changes expected) | **Apache-2.0** | Single-file, metadata+partition filtering, int8/binary quant. **Brute-force KNN only** — the one scale constraint. Primary vector store. |
| **SQLite FTS5** | ships w/ SQLite 3.x | Public Domain | Built-in BM25 (`rank`), same file as `sqlite-vec`. Lexical half. |
| **RRF** (algorithm) | n/a | n/a | k≈60 equal-weight default fusion. |
| **bge-reranker-v2-m3** | v2-m3 | Apache-2.0 | 568M cross-encoder, ~2–4 GB VRAM. Safe default reranker. |
| **Qwen3-Reranker** | 0.6B/4B/8B | Apache-2.0 | 0.6B runs on 8 GB+; strong instruction-following. |
| **mxbai-rerank-v2** | base 0.5B / large 1.5B | Apache-2.0 | large-v2 ~8× faster than bge-reranker-v2-gemma per vendor; RL-trained. |
| **pgvector** (escape hatch) | **≥0.8.2** (0.8.2 fixed CVE-2026-3172 buffer overflow in parallel HNSW builds; one source cites 0.8.4) | PostgreSQL License | HNSW + `hnsw.iterative_scan` (0.8.0) for filtered ANN. Postgres scale escape hatch. |
| **pgvectorscale** (escape hatch) | 0.9.0 (**released 2025-11-04**, adds PG18) | PostgreSQL License | DiskANN/StreamingDiskANN + SBQ compression for the >10⁶ regime. |
| **LanceDB** (alt escape hatch) | active 2026 OSS | Apache-2.0 (single-LICENSE fetch, treat as high-confidence) | Embedded/columnar, native hybrid (vector+BM25/Tantivy)+RRF, ANN → scales past brute force while staying file-based. |
| **Tantivy** (FTS upgrade) | 2026 | MIT | BM25, rich tokenizers/phrase/prefix. FTS upgrade path only if FTS5 bites. |
| Qdrant / Milvus / Chroma / Weaviate | 2026 | Apache-2.0 / Apache-2.0 / Apache-2.0 / BSD-3 | All strong ANN+filtering, but each adds a **second service + second store to back up** — against the single-file default. See §5 for Qdrant's *exact filterable-HNSW* relevance. |

### Recommendation

**Primary architecture (optimized so full re-embed from markdown is cheap and routine):**
1. **Store:** `sqlite-vec` vector index **in the same SQLite `.db`** as the FTS5 index. One file, one backup, one atomic rebuild. Carry `tier`, `os_family/distro/version/arch`, `collection`, `status` as metadata + partition-key columns so retrieval **pre-filters by tier and version before scoring** — which *also* shrinks `sqlite-vec`'s brute-force scan set, directly mitigating its weakness. Use int8 quantization on dense vectors.
2. **Lexical:** SQLite FTS5 / BM25 over the same corpus in the same file.
3. **Fusion:** RRF (k=60, equal weight) over vector top-N and FTS5 top-N.
4. **Reranker:** pluggable cross-encoder stage (bge-reranker-v2-m3 or Qwen3-Reranker-0.6B), **served by agent-runtime alongside the embedder over the same model-stack seam**, reranking top-~20 → top-~5. Ship MVP without it; add it on **eval evidence** (a measured top-k precision gap), not reflex.
5. **Scale escape hatch (pre-decided, not deferred):** if the corpus outgrows comfortable brute force (approaching 10⁶ high-dim chunks and latency exceeds budget even after quantization + pre-filtering), migrate the *vector half* to **pgvector ≥0.8.2 + pgvectorscale 0.9.0** (sanctioned by the repo default's "unless shared data forces Postgres" clause; the corpus is canonical so migration is just a re-embed into a different index — no data-loss risk). **LanceDB** is the alternative if staying single-file/embedded is preferred over standing up Postgres; worth a Stage-2/Stage-6 spike.

> **Note the §5 coupling:** the mandatory *hard* version/distro filter (§5) interacts with the store choice. `sqlite-vec` pre-filters exactly via `rowid IN (...)`; pgvector post-filters (recall collapse under selective filters) and would therefore **require physical partitioning by (os_family, distro, major_version)**. Qdrant's filterable-HNSW enforces filters exactly at traversal time. This is the strongest single argument for keeping the version constraint as **partition routing**, not a per-query selective filter — and it makes a distro-scoped re-verify touch only one partition. Resolve store-vs-filter jointly in Stage 2.

---

## 2. Embedding model, where it runs, re-embed cost, and the `embed()` contract

**Question (CLAUDE.md):** candidate local embedding models (quality vs VRAM vs speed vs license), re-embed cost at corpus scale, and the *contract* the Library needs from agent-runtime — a cross-app seam, specified as one.

### Findings (cited)

- The 2025–2026 open field is topped by **Qwen3-Embedding-8B** (Apache-2.0, #1 open MMTEB ~70.58 as of 2025-06) and proprietary **Gemini-Embedding-001** (not self-hostable; its "68.32" headline is the **MTEB Multilingual v2 mean**, corrected from the mislabel "English MTEB"). For a **routinely-re-embedded** local corpus the decisive axes are permissive license, **small-but-strong** retrieval, **long context** (man pages/guides run long), **Matryoshka** truncatable dims (cheap storage/rebuild), and first-class vLLM/SGLang serving. These push toward the *small* end. [qwenlm.github.io/blog/qwen3-embedding; awesomeagents.ai MTEB Apr 2026; arxiv 2503.07891]
- **Re-embed cost is dominated by params × tokens, not by dimension.** On a single 24 GB consumer GPU (3090/4090-class), fp16 batched via vLLM/SGLang, a sub-1B embedder sustains ~500–2000 short chunks/sec → 10⁴ in seconds, 10⁵ in ~1–3 min, 10⁶ in ~10–40 min. An 8B model runs ~10–30× slower (hours at 10⁶) and stores 4× the vectors. **Because the index is re-embedded routinely, a smaller strong-retrieval model beats a marginally-higher-scoring large one.** [qwenlm.github.io; contracollective local-embeddings 2026]
- **Matryoshka (MRL) support is common among the strong candidates** (Qwen3 all sizes, nomic-embed-v1.5, EmbeddingGemma, arctic-embed-2.0, mxbai, jina v3/v4) and directly lowers storage + rebuild cost: store a truncated vector (e.g. 256-dim) in the index while the markdown stays canonical.
- **License traps** (avoid for a corporate deployment): **jina-embeddings-v3** is CC-BY-NC-4.0 (non-commercial); **jina-embeddings-v4** is the **Qwen Research License** (research-only; ~3.8B params — corrected from "~3B"); **EmbeddingGemma-300m** ships under the custom **Gemma Terms** (commercial permitted but under a Prohibited-Use Policy — not OSI-open) with only **2048-token context**; **NVIDIA Llama-Embed-Nemotron-8B** is **`customized-nscl-v1` (non-commercial) + Llama-3.1 Community License** (corrected from "UNVERIFIED"). Prefer Apache-2.0/MIT models. [huggingface jina-v3/v4, embeddinggemma-300m, nvidia/llama-embed-nemotron-8b]

### Current facts (web-verified; fact-check corrections folded in)

| Model | Params / dims / ctx | License | Note |
|---|---|---|---|
| **Qwen3-Embedding-0.6B** ⭐ primary | 0.6B / 1024 (MRL→32) / 32K | **Apache-2.0** | MMTEB 64.33; ~1.2–2 GB VRAM fp16; instruction-aware (prefix queries); vLLM/SGLang embedding support since Q1 2026. Best fit: long ctx, small, cheap re-embed, permissive. |
| **gte-modernbert-base** ⭐ light fallback | 149M / 768 / 8192 | Apache-2.0 | MTEB 64.38, strong long-doc + code/COIR; ~0.6 GB VRAM. ~4× cheaper; good for CLI/code docs (English-strong). |
| **bge-m3** (alt primary if native hybrid wanted) | 560M / 1024 / 8192 | **MIT** | Emits dense + sparse + ColBERT in one model — can feed *both* halves of hybrid retrieval from one embed pass. |
| Qwen3-Embedding-4B / 8B | 4B/2560, 8B/4096 / 32K | Apache-2.0 | MMTEB 69.45 / 70.58 (#1 open). Quality ceiling but re-embed hours at 10⁶ — poor fit for a rebuilt index. |
| arctic-embed-m/l-v2.0 | 305M/768, 568M/1024 (MRL→256) / 8192 | Apache-2.0 | Solid Apache-2.0 multilingual mid options. |
| nomic-embed-text-v1.5 | 137M / 768 (MRL 64–768) / 8192 | Apache-2.0 | Ultra-light, fully open data/code; very cheap re-embed. |
| bge-large-en-v1.5 / multilingual-e5-large / mxbai-embed-large-v1 | 335–560M / 1024 / **512** | MIT / MIT / Apache-2.0 | Mature but **512-ctx** forces fine chunking for long guides. (e5 needs `query:`/`passage:` prefixes; correct card: `huggingface.co/intfloat/e5-large-v2`.) |
| jina-v3 / jina-v4 / EmbeddingGemma / Nemotron-8B | — | **CC-BY-NC / Qwen-Research / Gemma-Terms / nscl+Llama** | **License-encumbered — avoid** unless operator explicitly accepts. |

### Recommendation

- **Primary: Qwen3-Embedding-0.6B (Apache-2.0).** 32K context embeds whole man pages / large structure-aware chunks without aggressive splitting; 1024-dim MRL enables cheap truncated index storage; small enough that a full 10⁶-chunk re-embed is ~10–40 min on one 24 GB card; strong retrieval (same family as the #1 open model); the exact serving path (vLLM/SGLang) agent-runtime will use.
- **Light fallback: gte-modernbert-base (Apache-2.0)** if GPU headroom tightens (CLI/code-heavy content).
- **Alt primary if native hybrid is attractive: bge-m3 (MIT).**
- The **model choice is formally owned by agent-runtime's gap-1.2 GPU-sizing artifact** (the embedding load belongs there — `context/CONTRACTS/README.md`, GAP_REMEDIATION §3). The Library's role is to **name the seam and its constraints** and to flag that *re-embed throughput at 10⁴–10⁶ chunks and the chosen dimension are a Library-blocking input.*

### The `embed()` seam — to be **frozen in `context/CONTRACTS/`** (do not assume; specify as a contract)

Producer **agent-runtime**, consumer **Library**. Conceptual shape (Stage-2 formalizes the schema): `embed(texts[], input_type: query|document) → { vectors, model_id, dim }`. The contract must pin:
- **Dims** — fixed per model, **hard-coupled to the ANN index** (default 1024 for Qwen3-0.6B/bge-m3; any MRL-truncation target, e.g. 256, is a Library-side storage declaration in the contract).
- **Normalization** = L2 unit vectors; **distance metric** = cosine (all recommended models train for it).
- **Instruction/prefix convention** pinned *identically at ingest and query* (Qwen3 query-instruction; e5-style `query:`/`passage:` if ever used) — a mismatch silently degrades retrieval.
- **Batch size** (e.g. accept ≤256 texts/call, server may sub-batch) and **max input tokens**.
- **Latency/throughput budget** (target ~500–2000 chunks/sec for sub-1B; full 10⁶ re-embed within tens of minutes).
- **`model_id` returned on every call** so the Library detects a server-side model swap and triggers a full re-embed rather than mixing incompatible vectors. *(A model or dim change silently invalidates the whole index — this is the reason the seam must be versioned.)*
- **Error/backpressure** — explicit 429/"busy" + retry-after so a bulk re-embed yields to live query load; per-item failures reported, never silently dropped.
- **Optional capability flag:** token-level embeddings + span mean-pooling (enables **late chunking** — §3). *Requested, not hard-depended on.*

---

## 3. Chunking strategy and citation carry-back

**Question (CLAUDE.md):** structure-aware vs fixed; how it differs for man pages / CLI reference vs prose guides; how chunk boundaries carry citations back to source.

### Findings (cited)

- **Structure-aware, deterministic chunking beats semantic/neural for reference corpora.** Two 2025 studies (arXiv 2504.19754 "Reconstructing Context"; 2606.00881 "Chunking Methods … Effectiveness vs Computational Cost") find semantic chunking's compute is *not* justified by consistent gains; a Feb-2026 benchmark ranked **recursive 512-token first (69% acc)** while semantic landed at 54% and was ~14× slower. Critically for this app, **only deterministic splitters satisfy the rebuildable-index invariant** — model-driven boundary detection drifts across re-embeds and breaks "destroy → re-embed → identical retrieval." [arxiv 2504.19754; 2606.00881; digitalapplied 2026 playbook]
- **Anthropic Contextual Retrieval is the single largest verified quality lever**: prepending 50–100 tokens of chunk-specific context before embedding cuts top-20 retrieval failure **35%** (embeddings), **49%** (+contextual BM25), **67%** (+reranking). But the LLM-generated form is **non-deterministic** — it must be *persisted* to the corpus to stay reproducible. A **deterministic substitute — prepend heading-path + doc-title + version** — captures much of the anchoring benefit for free. [anthropic.com/engineering/contextual-retrieval]
- **Jina Late Chunking** (embed the whole long doc, then mean-pool per span so each chunk carries whole-doc context) is a **modest** win that **grows with document length** — but the specific "3.63%" figure **could not be verified** against the paper (the abstract claims only "superior results across various retrieval tasks"); treat it as *directionally positive, unquantified*. It **constrains the embed seam**: requires a long-context model exposing token-level embeddings + span pooling (§2 optional capability). [arxiv 2409.04701 — corrected]
- **Man pages / CLI reference vs prose guides need different treatment** — but markdown headings are the natural boundary for both (sources are converted to markdown at ingestion, so headings map directly to split points). Man pages: short, densely structured (NAME/SYNOPSIS/OPTIONS/EXAMPLES); split by section/flag, keep small pages whole, never split a flag from its description, no overlap. Prose guides: recursive header-split, ~512 tokens, ~10–15% overlap, never crossing an H1/H2. [unstructured.io chunking best practices; learn.microsoft.com RAG chunking; firecrawl best chunking]
- **Citation carry-back** = store structural + positional metadata *beside* (not inside) the clean chunk text, anchored to the canonical markdown: `char_offset_start/end` (exact machine anchor into the canonical file), `heading_path` + anchor slug (human-friendly), derived `line_range`, `source_url(s)`, `version/distro/date`, `tier`, `chunk_index`, and a `content_hash`. ~10–15% storage overhead for full traceability. [tensorlake.ai rag-citations; apxml chunk-metadata]

### Current facts (web-verified; corrections folded in)

| Tool / technique | Version | License | Note |
|---|---|---|---|
| **langchain-text-splitters** (`MarkdownHeaderTextSplitter`, `RecursiveCharacterTextSplitter`) | 1.1.2 | MIT | Deterministic; header-splitter emits heading-path metadata (ideal for citation). |
| **semchunk** | **4.1.1** (2026-06-13; 3.x superseded — corrected from 3.2.5) | MIT | Fast deterministic recursive/token chunker. |
| **chonkie** | 1.6.8 (2026-06-01) | MIT | RecursiveChunker, CodeChunker (tree-sitter — good for SYNOPSIS/flag blocks), LateChunker. Avoid its Semantic/Neural chunkers for boundaries. |
| **unstructured** (OSS lib) | current | Apache-2.0 | Doc→element ETL; use only if ingestion must parse non-markdown (PDF/HTML) before conversion. |
| Anthropic Contextual Retrieval | method (2024, current) | n/a | 35/49/67% failure-rate cuts; LLM form must be persisted. |
| Jina Late Chunking | method (arXiv 2409.04701 v3) | n/a | Directional gain, grows with doc length; needs long-ctx token-level embed. |

### Recommendation

**Per-format, structure-aware, deterministic chunking**, keyed off markdown headings:
- **Man pages / CLI reference:** split by section (NAME/SYNOPSIS/DESCRIPTION/OPTIONS/EXAMPLES/SEE ALSO); keep whole if <~512 tokens; split large OPTIONS per flag but never separate a flag from its description; no overlap.
- **Prose guides:** recursive header-split, target **512 tokens / ~64-token (10–15%) overlap**, never crossing H1/H2.
- **Deterministic contextual anchoring** (cheap form of Anthropic Contextual Retrieval): prepend a deterministic header before embedding — e.g. `"tar (GNU tar 1.35, Ubuntu 24.04) > OPTIONS > --exclude"`. Full anchoring benefit, zero LLM cost, reproducible. Reserve LLM-generated contextualization for a later opt-in **only if** the generated string is written back into the canonical corpus.
- **Late chunking:** record as a *desired* embed-seam capability; do **not** hard-depend.
- **Citation metadata per chunk** (stored beside the text): `chunk_id`, `doc_id`, `source_url(s)`, `version/distro/date` (mandatory), `tier`, `heading_path`+anchor, `char_offset_start/end`, `line_range`, `chunk_index`, `chunker_config_id` (lib+version+tokenizer+size+overlap+rules), `content_hash`.
- **Rebuildable-index guarantee:** chunking is a pure function of (canonical markdown bytes, version-pinned chunker config). Pin chunker lib+version+tokenizer at corpus level; store per-chunk `content_hash` so a rebuild is verifiable byte-identical. **This is why deterministic (not semantic/neural/LLM) boundaries are mandatory.**

---

## 4. Provenance / confidence tier model (the core design) — thresholds

**Question (CLAUDE.md):** how retrieval carries the tier *with* the content; what N for cross-referencing; the operator spot-audit sampling rate for auto-admitted tier-1.

### The tier model (from `apps/library/CLAUDE.md`, validated by research)

1. **`sandbox-verified`** — testable claim actually executed in a tier-0 sandbox, evidence attached → **auto-admitted** to trusted tier; operator spot-audits.
2. **`cross-referenced`** — N provenance-distinct sources agree, claim not executable → **batched operator review** admits (lower confidence).
3. **`single-source` / `agent-authored`** — **quarantine**; retrievable only behind an explicit `unverified` flag.

### Findings (cited)

- **Production RAG increasingly carries per-chunk provenance + confidence + enforced citations** so the consuming model knows what it leans on — validating the Library's design of returning **tier + source + version inline with every chunk** rather than as an afterthought. Research systems (ProvenAI provenance-native traces; SURE-RAG sufficiency/uncertainty) formalize evidence-specific uncertainty (missing evidence, retrieval uncertainty, evidence disagreement, support-refute conflict). [tensorlake.ai rag-citations; arxiv 2606.26449; 2605.03534]
- **Cross-referencing alone cannot confer trust** — internet sources are **correlated** (mirrors, forks, Wikipedia mirrors, SEO farms, shared upstream = **circular reporting**). Canonical real-world cases: the 2002 Niger-uranium forgeries and Iraq-WMD reporting, where repetition manufactured false confidence. N-agreement measures **popularity, not truth** (§6). [en.wikipedia.org/wiki/Circular_reporting; arxiv 2409.16241]
- **Statistical acceptance sampling gives a defensible spot-audit framework.** ISO 2859-1 / ANSI-ASQ Z1.4 (successor to MIL-STD-105E) define AQL attribute sampling with **switching rules** (normal→tightened→reduced). A trusted-tier poison is a **critical defect** → argues a low AQL (0.1% critical index) and *tightened switching*: catch one poisoned auto-admit → escalate to 100% inspection + quarantine the source. [eurofins AQL; variation.com sampling plans]

### Recommendation (thresholds — with the operator defaults)

- **N for cross-referencing: N ≥ 3, but with a provenance-distinctness test, not a raw count.** Sources must have different upstream origins (dedupe mirrors/forks/SEO copies by host + content-hash + canonical-upstream clustering *before* counting). Two sources is the journalism floor; internet correlation justifies raising to 3 **and** rejecting sets that collapse to one origin. **Cross-referenced content *always* lands in the tier-2 batched-review queue — never the trusted tier.** N raises priority/ordering within review; it does not confer trust. The load-bearing mechanism is *distinctness*, not the count — its concrete implementation is a Stage-2 decision.
- **Tier-1 auto-admit spot-audit rate: start at 100%, settle to 5% steady-state, under Z1.4 switching.** While the corpus + sandbox harness are young, audit 100% (cheap at 10³-scale; it calibrates trust in the harness). Step down to a **5% random baseline** once the harness has a clean track record; **any single confirmed poisoned auto-admit trips tightened inspection → 100%** and quarantines the implicated source/harness version until cleared. **100% audit of any batch produced after a sandbox-harness change** (the harness is the root of trust — §6).
- **Provenance-carrying retrieval:** return `tier + source_url(s) + version/distro/date + verification-evidence link` inline with every chunk; quarantine-tier chunks retrievable **only** behind an explicit `unverified` flag; stamp every curation-agent output with a provenance taint that makes it **structurally ineligible for the auto-approve execution lane** (§12), independent of its Library tier.

---

## 5. Staleness — version/distro/date, supersession, and the CMDB fact-query seam

**Question (CLAUDE.md):** model version/supersession; retrieval filters by the target host's CMDB facts (a 22.04 doc must not answer for a 24.04 host); name the CMDB seam. *(This axis was verified clean by the adversarial pass — no corrections.)*

### Findings (cited)

- **Versioned-docs systems use two orthogonal mechanisms** — per-version content **snapshots** (Docusaurus `versioned_docs/`, Read-the-Docs versions) *and* structured **"applies-to" metadata** (Elastic's `applies_to` lifecycle block: `{product: state [since X.Y]}`; Ubuntu's per-release manpages). Model version scope as **both** corpus partitioning and queryable frontmatter. [docusaurus versioning; readthedocs versions; elastic.co versioning-availability; manpages.ubuntu.com]
- **Supersession without destroying history is solved**: retain the old rendition but exclude it from default retrieval (Read-the-Docs "hidden but online" semantics), with a "latest" pointer and per-version identity. Combined with the repo's immutable `doc_id`, the clean model is **one `doc_id` per distro-version rendition**, linked by a lineage/family key + `supersedes`/`superseded_by`, so **each version keeps its own sandbox-verification evidence** (a 22.04 doc's evidence stays valid for 22.04 hosts after a 24.04 doc exists). [readthedocs hiding-a-version]
- **Retrieval-time version filtering must be EXACT, and stores differ decisively.** Qdrant's filterable-HNSW enforces filters exactly during ANN traversal; **pgvector post-filters** → recall collapses under selective filters (default `hnsw.ef_search=40`: a 10%-selective filter yields ~4 results; 0.8.0 iterative scans only partially mitigate). Because version correctness is a **hard** requirement, either use exact filterable pre-filtering **or physically partition** the corpus by `(os_family, distro, major_version)` so version scoping is partition routing, not a selective filter (also localizes a distro-scoped re-embed to one partition). [qdrant vector-search-filtering; dev.to no-pre-filtering-in-pgvector; postgresql pgvector 0.8.0]
- **RAG-freshness consensus: version/expiry mismatch must be HARD-removed before the model sees it; age is a SOFT ranking penalty.** "Documents with expiry dates can't just be down-ranked; they have to be removed completely." Age → `score = α·cosine + β·recency_decay` with a per-class half-life (news ~days, reference-architecture ~years). "Recency means *as of when the document is true*" — use content/system-of-record `last_verified`, **never storage mtime**. Man pages/CLI refs are a long-half-life class: age re-orders, rarely excludes. [ragaboutit knowledge-decay; arxiv 2509.19376; glenrhodes freshness-rot]

### Current facts (web-verified)

| Store (version-filter lens) | Version | License | Filter behavior |
|---|---|---|---|
| **Qdrant** | server ~1.18.x; client 1.18.0 (2026-05-11) | Apache-2.0 | Filters **exact/hard** during ANN traversal (filterable-HNSW). Cleanest for the mandatory hard version filter. |
| **pgvector** | ≥0.8.2 (0.8.2 fixed CVE-2026-3172) | PostgreSQL License | **Post-filters** → recall collapse under selective filters. Viable only with corpus partitioned by distro/version. |
| Elastic `applies_to` (schema pattern) | current | doc pattern | `{deployment/product: lifecycle-state [since X.Y]}` — directly adoptable frontmatter shape. |
| Docusaurus / Read-the-Docs (supersession pattern) | current | doc pattern | Snapshot-per-version + "hidden but online" superseded docs. |

### Recommendation

- **Frontmatter direction** (Stage-2 formalizes): keep immutable `doc_id`, **one `doc_id` per distro-version rendition**, linked by lineage/family key. Add (1) an Elastic-style `applies_to` list `{os_family, distro, version_constraint, arch, lifecycle: current|deprecated|removed}`; (2) supersession fields `status: current|superseded|retired`, `supersedes`, `superseded_by`, `valid_from`, `valid_until`; (3) freshness fields `source_published`, `last_verified` (distinct; "as of when true"), `source_url(s)`, derived `distro_eol`. Old renditions **retained** in the canonical corpus and index-buildable, but excluded from default retrieval.
- **Hard-filter vs penalty policy:** `os_family + distro + major_version + arch` mismatch = **HARD FILTER** (exclude — worse than no doc); `status != current` = **HARD FILTER** by default (unless caller requests history/evidence); minor-version proximity within a distro = **SOFT** (prefer exact minor, allow nearest-older with penalty + flag); age via `last_verified` = **SOFT** exponential decay, long half-life for man pages (re-orders, never excludes); distro EOL = strong penalty + prominent stale flag.
- **Architecture:** prefer Qdrant-style exact filterable-HNSW **and/or** physical partitioning by `(os_family, distro, major_version)`. If pgvector is chosen for operational simplicity, **partitioning is mandatory**.

### The CMDB host-facts seam — to be **frozen as `context/CONTRACTS/cmdb-library-hostfacts.md`**

Producer **CMDB**, consumer **Library**. Conceptual shape: `resolve_host_facts(host_id) → {os_family, distro, distro_version, arch, [package_manager, eol_date]} | not_found`.
- `host_id` is **CMDB-minted, stored/passed opaquely** (never parsed — `context/specs/IDENTIFIERS.md`).
- **Strictly narrower than the gateway↔cmdb policy seam** — the Library must receive **only** inventory facts, **never** tier/window/credential/policy fields (it is Standard-class and cannot act). Read-only, short-TTL-cacheable.
- The Library query API **also accepts explicit `target_os/target_distro/target_version/arch`** so it never hard-depends on CMDB at query time.
- **Fail loud + open-but-flagged:** if `host_id` is supplied but CMDB is unreachable/unknown, return results with the hard version filter **disabled** and every chunk flagged `version_scope=unverified` — **never silently apply a possibly-wrong filter, never imply correctness.** This rule belongs in the frozen contract.

---

## 6. Corpus poisoning via ingestion (Stage-5 PRIMARY threat, §12)

**Question (CLAUDE.md):** the ingestion trust model — why cross-referencing alone does not defeat poisoning; why sandbox evidence is the strong signal; how trusted-tier admission is gated. *(This is the elevated Standard-risk obligation.)*

### Findings (cited)

- **RAG corpora are poisonable with a handful of documents.** **PoisonedRAG** (arXiv 2402.07867, USENIX Security 2025): **~90% attack success by injecting just 5 crafted texts per target question** into a knowledge base of *millions*. Each poisoned text satisfies a *retrieval condition* (ranks top-k) + a *generation condition* (steers the answer). **Corpus poisoning of dense retrievers** (EMNLP 2023, arXiv 2310.19156): **as few as 10 adversarial passages fool >90% of queries**; 50 optimized passages transfer to >94% *out-of-domain*. Cheaper/black-box follow-ons: AGGD (2406.05087), influential-token attacks (2503.21315). *(No attack literally named "GhostRAG" was found — flagged UNVERIFIED; the gradient-poisoning family above is the real referent.)* **Blast radius is a handful-of-documents problem, not a bulk-volume one.**
- **Curation agents are the most injection-exposed principals in the company.** Indirect prompt injection hides instructions in retrieved documents; the payload is never typed by a user and is **trusted implicitly because it arrives via the system-controlled retrieval path** — so every defense built for direct (user-turn) injection fails. A curation agent that fetches raw internet docs *both* reads the adversarial text *and* decides what enters the corpus — maximal exposure. This is exactly why **§12 forbids curation outputs from riding the auto-approve lane into fleet execution.** [aquilax indirect-prompt-injection; tianpan document-injection]
- **Cross-referencing alone does not defeat poisoning** (see §4): correlated sources → circular reporting → N-agreement is popularity, not truth.
- **Sandbox-execution evidence is categorically stronger** — a testable claim executed in a tier-0 disposable sandbox is confirmed **by reality, not by consensus**; poisoning consensus doesn't change what a command actually does. This maps onto the load-bearing invariant **"done is confirmed externally, not self-reported"** (the Wazuh-confirms-the-patch pattern). Consensus verifies *how well sources agree*; execution verifies *the claim itself* — which is why sandbox-verified is the **only** tier safe to auto-admit.

### Recommendation — the ingestion trust model / admission gate

Keep the three-tier model; harden the gate:
1. **The core anti-poisoning invariant — trusted-tier writes are gated by a hard precondition, not agent judgment:** `(sandbox_evidence_present AND harness_attested) OR operator_review_approved`. **No agreement count can satisfy this gate** — cross-referencing never auto-admits. This directly delivers the Stage-7 DoD: *"a poisoning attempt via propose-ingestion cannot reach the trusted tier without sandbox evidence or operator review."*
2. **The sandbox harness is the root of trust** — sandbox evidence must bind to a specific harness/config version; a forged/altered harness would forge reality. **Treat the harness as trusted computing base and gate its changes under §12 policy-plane change control** (step-up-confirmed, tamper-evident). This is a design input to Gateway/CMDB, flagged as an open decision.
3. **Cross-referencing → tier-2 review only**, N ≥ 3 provenance-distinct (§4), never trusted-tier.
4. **Non-executable-but-important prose** (distro guides, security advisories) can *never* be sandbox-verified and therefore can *never* reach the trusted tier under this gate — its ceiling is tier-2 (human-reviewed). Whether to add a separate **curated-authority allowlist** for known-good vendor origins is an operator decision.
5. **Provenance taint propagation:** curation-agent outputs carry a taint marking them structurally ineligible for auto-approve fleet execution, independent of Library tier (§12).

---

## 7. The curation team — behavior, not machinery (ARCHITECTURE §6)

**Question (CLAUDE.md):** how a standing re-verification team is modeled **without giving the Library any action capability.**

### Findings / recommendation

A team is a **composition of existing primitives, not new containers** (ARCHITECTURE §6, §"Teams"):
- **A standing epic** ("keep the library accurate and current") on the **Board**.
- **A persona set** (agent-runtime config) with the `team` label (design input already recorded for Board + auth Stage-2 schemas — GAP_REMEDIATION §3).
- **A ticket-type/tag subscription** — the role-ready routing; curation agents claim tagged tickets **atomically via the Board**, like everyone else. Teams never negotiate work among themselves — **the Board remains the only coordinator.**
- **A steward persona** (Scrum Master pattern scoped to the domain) owns the epic's triage/decomposition.
- **Three kickoff types:** human-filed, **scheduled** (re-verify corpus slices — a scheduled kickoff), **event-driven** (e.g. a retro-note lesson flags undocumented behavior — an event kickoff).

**Crucially, the Library holds no execution path.** When curation needs to *test* a documentation claim, it does **not** execute anything itself: it files/claims a sandbox-verification ticket that runs **through the Gateway against CMDB tier-0 `disposable` targets**, and captures the returned evidence to attach to the proposed doc. The Library only **stores evidence links and assigns tiers**; the executing authority is the Gateway, the policy authority is CMDB, the coordination authority is the Board. This preserves segregation of duties verbatim — a Standard-class app that "confirms *how*" while the external verifier still "confirms *done*."

This is a **behavior specified over Board + Gateway/CMDB + agent-runtime primitives**; the Library builds *no* team machinery. Its only additions are: (a) the `team`/tag-aware ingestion ticket types it emits, and (b) the ability to attach sandbox evidence to a doc and gate admission on it (§6).

---

## 8. The two surfaces (agent MCP + human UI)

**Question (CLAUDE.md):** agent MCP (query→cited/tiered/versioned chunks; propose-ingestion landing per tier rules; curation tools scoped via auth) and the human UI (browse/inspect-provenance; batched review queue + tier-1 spot-audit stream; collection/retirement management). *(Two views, one state — siblings over one API.)*

### Findings / recommendation (feature landscape — schemas are Stage 2)

**Agent surface (MCP — one server per app, per ARCHITECTURE §9; verify current MCP SDK/transport at build time, don't inherit):**
- **Query** — hybrid semantic + FTS retrieval returning **chunks + citation (URL#anchor or file+line-range) + provenance tier + version metadata**, filtered by `host_id`-resolved (or explicit) version facts (§5). Quarantine-tier results only behind an explicit `unverified` flag (§4).
- **Propose ingestion** — lands **per tier rules** (§4/§6); **never a direct write to the trusted tier.** Sandbox-verified proposals carry evidence links; everything else quarantines or routes to review.
- **Curation-team tools** (verify / cross-reference / attach sandbox evidence) — **scoped to curation personas via auth** (see the auth seam below).

**Human surface (UI):**
- **Browse/search the corpus**; inspect any doc's provenance, sources, and verification evidence (the audit view that makes tiers legible).
- **Ingestion review queue** — batched approval for tier-2 (`cross-referenced`) admissions; a **spot-audit stream** for tier-1 (`sandbox-verified`) auto-admissions, sampled per §4's rate/switching rules.
- **Collection management** + **retirement/deprecation** of stale docs (drives §5 supersession: mark superseded/retired without deleting evidence).

**Both surfaces exercise one shared state** — the MCP query and the UI browse hit the same retrieval; the MCP propose and the UI review queue are two ends of one ingestion pipeline. Neither is downstream of the other.

---

## 9. Cross-app seams to freeze in `context/CONTRACTS/` before Stage-2 exit

Per the **seam rule** (`context/CONTRACTS/README.md`): assumptions in one app's prose do **not** bind another app — only a frozen contract binds both sides. Two of these are already *indexed* as known seams in CONTRACTS/README; the other two this research surfaces as required. **Each is a blocked dependency until frozen — not a fact to assume** (this is exactly the gap-6.1 "consuming app invents duties the producer never agreed to" risk).

| Seam | Producer → Consumer | Surface (conceptual) | Status | Notes |
|---|---|---|---|---|
| **`library ↔ agent-runtime` — embeddings** | agent-runtime → Library | `embed(texts[], input_type) → {vectors, model_id, dim}` | **Indexed** in CONTRACTS/README; **write it** | Pin dims/normalization/metric/prefix/batch/latency/`model_id`/backpressure + optional token-level capability (§2). Embedding load belongs in agent-runtime's gap-1.2 GPU-sizing artifact. |
| **`cmdb ↔ library` — host facts** | CMDB → Library | `resolve_host_facts(host_id) → {os_family, distro, distro_version, arch, [pkg_mgr, eol]}` | **New — this research surfaces it**; write as `cmdb-library-hostfacts.md` | **Narrower than** the gateway↔cmdb policy seam: inventory facts only, no tier/window/creds/policy. Fail-loud+open-but-flagged on CMDB-down (§5). |
| **`library ↔ gateway/cmdb` — tier-0 sandbox verification** | Gateway (exec) + CMDB (policy) → Library (evidence consumer) | `execute_in_sandbox`-style run against a CMDB `disposable` target; **evidence capture** returned for tier-1 admission | **Indexed** in CONTRACTS/README; **write it** | Library has **no execution path** — it only files the ticket and consumes evidence (§7). Harness version is the root of trust (§6) → §12 change control. Design inputs already flagged to CMDB (`disposable` class + auto-approve) and Gateway (evidence capture) in GAP_REMEDIATION §3. |
| **`auth ↔ library` — scope→tool map** | auth → Library | scope→MCP-tool map (query vs propose vs curation-tools); curation personas scoped | **New instance of the known `auth ↔ each app` seam**; countersign the Library slice in Stage 2 | auth defines scopes unilaterally in its PLAN; the Library's Stage-2 must **consume and countersign its slice** (CONTRACTS/README). Curation tools (verify/attach-evidence) restricted to curation personas; the `team` label lands in Board+auth schemas (GAP_REMEDIATION §3). |

**Identifiers consumed** (verbatim, opaque — `context/specs/IDENTIFIERS.md`): `host_id` (CMDB), `ticket_id`/`approval_id` (Board, for ingestion/verification tickets), `agent_id`/`sub` (auth, authorship of proposals), `run_id` (Gateway, sandbox-evidence join). **Minted by the Library:** `doc_id` (immutable frontmatter `id`; chunks `doc_id#<n>`, derived, never stored cross-app). **State machine consumed:** ingestion/verification tickets follow the Board-owned `context/specs/TICKET_STATE_MACHINE.md` (`needs_review` for tier-2 admissions is human-only to clear). **Deployment:** compose/DNS name `library`, internal port **8080**, joins **`edge`** only (never `creds` — Standard-class), no host ports, SQLite in `library_data` volume (`context/specs/DEPLOYMENT.md`).

---

## 10. Answers to the CLAUDE.md OPEN research questions (explicit mapping)

| OPEN question (CLAUDE.md §"OPEN research questions") | Recommendation | Where |
|---|---|---|
| **Chunking strategy** (structure-aware vs fixed; man pages vs prose) | Per-format structure-aware **deterministic** markdown-header chunking; man pages by section/flag (whole if <512 tok, no overlap), prose recursive 512-tok/~64 overlap; deterministic contextual-header prepend; late chunking deferred to embed-seam capability. | §3 |
| **Embedding model + where it runs + re-embed cost** | Primary **Qwen3-Embedding-0.6B** (Apache-2.0), light fallback **gte-modernbert-base**, alt **bge-m3**; served by **agent-runtime** over the `embed()` seam; full re-embed ~10–40 min at 10⁶ chunks (routine). Model choice formally owned by agent-runtime's GPU-sizing artifact. | §2 |
| **Hybrid search weighting; reranking latency** | **RRF k=60 equal-weight** default; reranker a **pluggable** cross-encoder (bge-reranker-v2-m3 / Qwen3-Reranker-0.6B), added on eval evidence, not MVP. | §1 |
| **Tier thresholds** (N for cross-ref; tier-1 spot-audit sampling) | **N ≥ 3 provenance-distinct** (distinctness, not count; always → tier-2 review, never auto-admit); **spot-audit 100%→5%** under Z1.4 switching, 100% after any harness change. | §4 |
| **Corpus versioning / supersession without deleting evidence** | **One `doc_id` per distro-version rendition** + lineage key + `supersedes`/`superseded_by`; old renditions retained + index-buildable but excluded from default retrieval (Read-the-Docs "hidden" semantics); Elastic-style `applies_to`; **hard** version/distro filter, **soft** age decay. | §5 |

---

## 11. Open decisions for the operator (nothing below is settled here)

1. **Vector store / filter coupling** *(highest-leverage, spans §1 + §5):* `sqlite-vec`+FTS5 single-file (repo default, brute-force-only, exact `rowid` pre-filter) **[my default]** — with a **pre-committed escape hatch** to pgvector≥0.8.2+pgvectorscale (requires partitioning to make the hard version filter safe) or LanceDB (stays embedded). Or adopt **Qdrant** now for exact filterable-HNSW. *Recommend: start single-file `sqlite-vec`; partition by `(os_family, distro, major_version)` from day one so version scoping is routing, not a selective filter; keep pgvector+pgvectorscale as the sanctioned escape.*
2. **Embedding model pin** *(cross-app — agent-runtime must load/serve it; dimension is baked into the index):* default **Qwen3-Embedding-0.6B (1024-dim)**. Confirm, and confirm **rejection of license-encumbered models** (Jina v3/v4, EmbeddingGemma, Nemotron-8B).
3. **Reranker at MVP** — ship without **[my default: add on eval evidence]**, or enable bge-reranker-v2-m3 from day one given free local compute.
4. **Tier-1 spot-audit steady-state rate** — **5%** with Z1.4 tightened-switching (100% while young; 100% after harness change) **[my default]**; confirm the acceptable residual-poisoning-vs-audit-labor tradeoff.
5. **Cross-referencing N** — **3 provenance-distinct** **[my default]**; the real control is distinctness, so 2 may suffice given the tier is human-gated anyway.
6. **Sandbox harness as a §12 policy-plane object** requiring step-up/tamper-evident change control — **recommend yes** (it is the root of trust for auto-admission); a design input to Gateway/CMDB.
7. **Non-executable prose ceiling** — accept permanent **tier-2 (human-reviewed)** status for un-sandboxable docs, or add a **curated-authority allowlist** for known-good vendor origins.
8. **Minor-version fallback** — return nearest-older + loud `version_scope=approximate` flag **[my default]**, or hard-empty (forcing a curation ticket) for high-risk task types.
9. **MRL-truncated index storage** (e.g. 256-dim) — **keep full dim initially, revisit in Stage 6** **[my default]**.

---

## 12. How the Stage-1 exit criteria are met (PROCESS.md)

**Exit criterion — "every deferred decision relevant to this app has a researched recommendation":**
- All five CLAUDE.md OPEN research questions answered with a concrete recommendation + operator default (§10, cross-referenced to §1–§5).
- Standard-risk elevated obligation (corpus poisoning) researched to Stage-5-threat depth with a cited attack literature and a hard admission-gate recommendation (§6).
- Curation-team-without-action-capability (§7) and both surfaces (§8) specified at feature-landscape depth (schemas correctly deferred to Stage 2).

**Exit criterion — "all external-system facts are cited, not assumed":**
- Every version/license/benchmark fact is web-verified against a primary source (repo / model card / license file / paper) and carries a URL; an **adversarial fact-check pass** re-verified them and its corrections are folded in (pgvector 0.8.2+/CVE-2026-3172; pgvectorscale 0.9.0 dated 2025-11; semchunk 4.1.1; Jina late-chunking figure marked unverifiable; Nemotron-8B non-commercial license; Gemini "68.32" is a multilingual mean). One item is explicitly flagged **UNVERIFIED** ("GhostRAG" — no such named attack found; the real referent is the gradient-poisoning family).
- Every cross-app dependency is named as a **`context/CONTRACTS/` candidate to freeze** rather than assumed (§9), honoring the seam rule and the gap-6.1 risk.

**Not done here (correctly out of Stage-1 scope):** data model, API/MCP schemas, UI screens, and any code — these are Stage 2 (`planning/PLAN.md`) and Stage 3 (`ui/UI_SPEC.md`). The four seam contracts in §9 must be **frozen before Stage-2 exit**.

---

## References (grouped; all fetched/verified 2026-07)

**Hybrid retrieval / stores / rerankers:** github.com/asg017/sqlite-vec (+ issue #25); alexgarcia.xyz sqlite-vec stable release; thelinuxcode FTS5 in practice; turso.tech/blog/beyond-fts5; opensearch.org RRF; paradedb.com RRF; maxpetrusenko RRF vs weighted; futureagi.com best rerankers 2026; localaimaster reranking guide; mixedbread.com mxbai-rerank-v2; agentset.ai bge-reranker-v2-m3; spheron.network TEI self-host; postgresql.org pgvector 0.8.0 / 0.8.2; dbi-services pgvector DBA guide; docs.lancedb.com hybrid-search; qdrant.tech; github.com/chroma-core/chroma; github.com/milvus-io/milvus-lite; github.com/weaviate/weaviate.

**Embedding models:** qwenlm.github.io/blog/qwen3-embedding; github.com/QwenLM/Qwen3-Embedding; huggingface.co BAAI/bge-m3, bge-large-en-v1.5, intfloat/multilingual-e5-large & e5-large-v2, Alibaba-NLP/gte-modernbert-base, Snowflake/snowflake-arctic-embed-m-v2.0, mixedbread-ai/mxbai-embed-large-v1, jinaai/jina-embeddings-v3 & v4, google/embeddinggemma-300m, nvidia/llama-embed-nemotron-8b; nomic.ai nomic-embed-text-v1; snowflake.com arctic-embed-2 blog; awesomeagents.ai MTEB leaderboard Apr 2026; arxiv 2503.07891 (Gemini Embedding).

**Chunking / citations:** anthropic.com/engineering/contextual-retrieval; arxiv 2409.04701 (late chunking), 2504.19754, 2606.00881; jina.ai late-chunking; weaviate.io late-chunking; digitalapplied 2026 chunking playbook; unstructured.io chunking best-practices & metadata; learn.microsoft.com RAG chunking; firecrawl best chunking; tensorlake.ai rag-citations; apxml chunk-metadata; libraries.io langchain-text-splitters; pypi.org/project/semchunk; github.com/chonkie-inc/chonkie; github.com/Unstructured-IO/unstructured.

**Poisoning / provenance / sampling:** arxiv 2402.07867 (PoisonedRAG) + usenix.org presentation; arxiv 2310.19156 (corpus poisoning) + aclanthology PDF; arxiv 2406.05087 (AGGD), 2503.21315 (influential tokens), 2409.16241 (LLM echo chamber), 2606.26449 (ProvenAI), 2605.03534 (SURE-RAG); aquilax.ai indirect-prompt-injection; tianpan.co document-injection; en.wikipedia.org/wiki/Circular_reporting; eurofins AQL; variation.com sampling plans.

**Versioning / staleness:** docusaurus.io versioning; docs.readthedocs.com versions & hiding-a-version; elastic.co versioning-availability; manpages.ubuntu.com; devdocs.io/man; qdrant.tech vector-search-filtering & filterable-hnsw; dev.to no-pre-filtering-in-pgvector; ragaboutit knowledge-decay; arxiv 2509.19376 (recency prior); glenrhodes freshness-rot.

**Internal specs inherited (not external):** `context/ARCHITECTURE.md` §5/§6/§10/§11/§12; `context/PROCESS.md`; `context/specs/IDENTIFIERS.md`; `context/specs/TICKET_STATE_MACHINE.md`; `context/specs/DEPLOYMENT.md`; `context/CONTRACTS/README.md`; `context/GAP_REMEDIATION.md`; `apps/library/CLAUDE.md`.
