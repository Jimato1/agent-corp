# CONTRACT — agent-runtime → Library (embed) + every hosted role (generate): the inference facade

> **Status: FROZEN in shape** (MERGE-RESEARCH-1, 2026-07-02); model pins and throughput numbers finalize with the gap-1.2 sizing artifact (they are its explicit line items). Producer: **agent-runtime** (seams C9/C15). Consumers: **Library** (`embed()`, cross-app over `edge`) and every hosted agent role (`generate()`, runtime-internal). Reconciles runtime RESEARCH §5.4/§5.5 with Library RESEARCH §2.

## 1. Shared facade semantics (both operations)

- OpenAI-compatible wire (`/v1/*`), but **the contract is the facade, not any one server's quirks** — the backend (vLLM primary / SGLang alternate / llama.cpp quiesce lane / TEI embeddings) is swappable behind it.
- **Model selection by logical role, never raw model name** (`adversarial-reviewer`, `library-embedder`, …); the runtime resolves role → pinned digest from versioned config. A caller can never request an unvetted model.
- **Pinned-model guarantee:** every response carries `model_id` + resolved digest + provenance-verified flag — any output is attributable to an exact signed model. The same fail-closed provenance gate (safetensors-only, digest-pinned, SHA-256 + Sigstore-verified) covers the embedding model: poisoning it poisons Library retrieval and the recon grounding.
- **Typed errors:** schema-unsatisfiable, backend-unavailable, model-provenance-failure (fail-closed), quota/concurrency-exhausted, and a defined **quiesce/drain signal** — during a kill or auth outage callers get "unavailable, backoff", never a hang.

## 2. `embed()` — the Library-binding slice

`embed(texts[], input_type: query|document) → {vectors, model_id, dim}` with, frozen:
1. **Dimension fixed per model** (default 1024 — Qwen3-Embedding-0.6B is the recommended pin, final authority = gap-1.2); any MRL-truncation target is a Library-side storage declaration recorded HERE when chosen.
2. **L2-normalized vectors, cosine distance.**
3. **Instruction/prefix convention pinned identically at ingest and query time** (mismatch silently degrades retrieval — it is part of this contract, not an implementation detail).
4. Batching: ≤256 texts/call accepted (server may sub-batch); max input tokens stated by the runtime.
5. Throughput budget (sizing-artifact line item): ~500–2000 chunks/sec class; full 10⁶-chunk re-embed within tens of minutes. **Library re-embed load and the reranker are explicit gap-1.2 scope.**
6. **`model_id` on every call** — the Library compares it and triggers a full re-embed on any swap rather than mixing incompatible vectors. A model/dim change is a breaking change to this contract: versioned, announced, never silent.
7. Backpressure: explicit 429/busy + retry-after (bulk re-embed yields to live query load); per-item failures reported, never silently dropped.
8. Optional capability flag: token-level embeddings + span mean-pooling (late chunking) — requested, not hard-depended-on.

## 3. `generate()` — structured-output slice (feeds the gap-1.3 spike)

Structured-output mode = schema/grammar constraint (XGrammar default, Outlines fallback, GBNF on the llama.cpp lane) + backend hint; **role schemas are validated against the chosen backend at config-load** (schema-feature gaps like array-length/int-bounds fall back explicitly, never discovered at runtime). Constrained decoding guarantees syntax, not semantics — the gap-1.3 spike measures semantic transition correctness before Board/Notes freeze tool schemas (seam C10).

## 4. Centralization decision — **RATIFIED D-13 (2026-07-02)**

Library embeds via the runtime's facade (dedicated TEI instance), never loading its own embedder — one guarded provenance surface. **agent-runtime is accordingly a hard dependency of Library indexing** (query serving over an already-built index survives runtime downtime; ingestion/re-embed does not). Binding on both Stage-2 plans.
