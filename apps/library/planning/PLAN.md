# PLAN.md — Reference Library (`library`) — Stage 2 (Planning)

> **Stage 2 — Planning.** Risk class: **Standard**, elevated obligation: corpus poisoning via ingestion is the mandatory primary Stage-5 threat axis (ARCHITECTURE §12, `apps/library/CLAUDE.md`).
> **Artifact status:** complete to the Stage-2 exit criteria, with three explicitly-marked pending dependencies (**PENDING-SIZING**, **PENDING-D7**, **PENDING-R7** — §11). Adversarial review run in two passes (inline self-critique + an independent critic agent against the drafted plan) and folded in (§14).
> **Authorities inherited (build against, never reinvent):** `context/CONTRACTS/agent-runtime-library-inference.md` (FROZEN in shape; D-13 ratified), `context/CONTRACTS/cmdb-library-hostfacts.md` (FROZEN in shape), `context/CONTRACTS/gateway-cmdb-library-sandbox.md` (SKETCH — D-7 makes filling it a Gateway+CMDB Stage-2 exit item), `context/CONTRACTS/auth-apps-tokens-scopes.md` §1–2 (FROZEN; library scope slice = auth item R7), `context/specs/IDENTIFIERS.md`, `context/specs/TICKET_STATE_MACHINE.md`, `context/specs/DEPLOYMENT.md`, `context/RATIFICATIONS_2026-07-02.md` (D-7, D-13, D-14 MCP pin, D-17 schema ceiling), `research/RESEARCH.md` (Stage-1 recommendations, operator-endorsed).
> **Stage-1 inheritance check (performed at this session's start): no contradictions** between RESEARCH.md and the frozen contracts. One deviation recorded: RESEARCH §12 required all four seams frozen before Stage-2 exit; operator instruction (2026-07-02) supersedes — the two unfrozen seams are planned around as PENDING-D7 / PENDING-R7 instead, and the work they block (curation go-live; curation-tool auth binding) is marked blocked, not assumed.

---

## 0. Scope of this plan

One containerized service (`library`, port 8080, `edge` network only, SQLite in `library_data` — DEPLOYMENT §2) exposing **one core API** consumed by **two sibling surfaces**: an MCP server for agents and a human UI. This document specifies the data model, admission state machine, retrieval pipeline, ingestion pipeline, both surfaces, contract bindings, durability/backup, the Stage-5 threat-model outline, and build sequencing. **No code, no UI build** — UI screens are enumerated for Stage 3.

Locked inputs this plan encodes without relitigating:

| Decision | Value | Source |
|---|---|---|
| Vector+FTS store | `sqlite-vec` + FTS5, one file, partition-key pre-filtering; pgvector≥0.8.2+pgvectorscale (or LanceDB) as pre-decided escape hatch | RESEARCH §1/§11.1 |
| Fusion | RRF, k=60, equal weight | RESEARCH §1 |
| Reranker | pluggable cross-encoder stage, **OFF at MVP**, enabled on eval evidence; served via the same runtime facade | RESEARCH §1/§11.3 |
| Embedding | via agent-runtime TEI facade **only** (D-13 ratified — hard dependency of *indexing*); recommended pin Qwen3-Embedding-0.6B, 1024-dim; **final dim + throughput = gap-1.2** | `agent-runtime-library-inference.md` §2/§4 |
| Chunking | per-format, structure-aware, **deterministic** (markdown headings); prose 512-tok/~10–15% overlap; man pages by section/flag, no overlap; deterministic contextual header prepend | RESEARCH §3 |
| Cross-reference N | **N ≥ 3 provenance-distinct** sources (distinctness test, not raw count); always → batched review, never auto-admit | RESEARCH §4 (ratified threshold) |
| Tier-1 spot-audit | **100% while young → 5% steady-state random baseline**, ANSI-Z1.4-style switching: any confirmed poisoned auto-admit → 100% tightened; **100% of any batch after a harness change** | RESEARCH §4 (ratified threshold) |
| Version filter | `os_family+distro+major_version+arch` mismatch = HARD exclude; `status != current` = HARD; minor-version proximity = SOFT (`version_scope=approximate`); age = SOFT decay on `last_verified` | RESEARCH §5; `cmdb-library-hostfacts.md` §3 |
| MCP transport | Streamable HTTP, spec pin **2025-11-25** suite-wide | D-14 |
| Tool-schema ceiling | flat, low-arity, enum-biased until the gap-1.3 spike validates more | D-17 |

---

## 1. Data model

### 1.1 Canonical store: the markdown corpus (git-backed)

The corpus is a git repository inside the `library_data` volume with a **configured remote** (backup mechanism — §1.5). Layout partitions by the doc's *primary* version target so most hard-filter work is *routing*, not a selective filter, and a distro-scoped re-verify or re-embed touches one subtree (multi-target filtering is handled by `doc_targets` rows — §1.3):

```
corpus/
  <os_family>/<distro>/<major_version>/     # e.g. linux/ubuntu/24.04/ — primary target
    <slug>.md                               # admitted docs (any admitted tier)
  any/                                      # version-agnostic or many-target references
  _quarantine/                              # ALL proposals land here first; never leaves
    <slug>.md                               #   without passing the §2 admission gate
  _audit/                                   # append-only JSONL: admission decisions,
    admissions-YYYY-MM.jsonl                #   denials, spot-audit sample draws (§1.4)
```

Rules:
- **Admitted doc bodies are immutable.** Any content change mints a new `doc_id` linked by `lineage_key`/`supersedes` — evidence always attests exactly one byte-state (§2.2). A body edit to a quarantined (not-yet-admitted) doc is allowed and invalidates any evidence entries whose `attested_content_sha256` no longer matches.
- A doc moves `_quarantine/ → partition/` exactly once, at admission, in the same git commit as its frontmatter admission stamp. Rejected docs stay in `_quarantine/` (`admission: rejected`) as an audit record and are **never retrievable — excluded unconditionally at index-build and at query time, under every flag**.
- Every mutation (proposal write, evidence attach, admission, supersession, retirement, audit-log append) = one git commit by the service, committer identity carrying the acting `sub`; **push to remote on every admission-lane and audit-lane commit, at most 5 min behind otherwise**. **Push failure does not block admission** (the local commit is the canonical record) but raises a loud degraded-durability banner (UI + `/api/admin/index-status`) and a bounded retry loop; a push backlog past 30 min escalates to the operator.
- The service is the **single writer** to the corpus (all writes serialize through it); agents and operators mutate only via the API.

### 1.2 Frontmatter schema (per doc — the canonical record)

```yaml
id: lib-01J...                # doc_id, Library-minted, immutable; format `lib-` + ULID
                              #   (IDENTIFIERS.md format cell amended alongside this plan)
title: "tar — GNU tar 1.35"
collection: cli-reference     # operator-managed grouping
kind: man-page | cli-guide | prose-guide | advisory | other   # drives chunker profile

tier: sandbox-verified | cross-referenced | single-source | agent-authored
admission: quarantined | review_pending | admitted | rejected
status: current | superseded | retired          # lifecycle, orthogonal to admission

sources:                       # provenance; ≥1; hashes recorded by the SERVICE's fetcher
  - url: https://...
    fetched_at: 2026-07-02T...
    content_sha256: ...
    origin_cluster: gnu.org    # HEURISTIC upstream-origin key (distinctness test) — always
                               #   rendered as heuristic in the UI, never as verified fact
    attached_by: service | agent   # agent-picked source sets render distinctly in review
applies_to:                    # Elastic-style; ≥1 entry mandatory (staleness hard line);
  - {os_family: linux, distro: ubuntu, version: "24.04", arch: amd64, lifecycle: current}
  - {os_family: linux, distro: ubuntu, version: "22.04", arch: amd64, lifecycle: current}
lineage_key: tar-manpage       # groups distro-version renditions of one logical doc
supersedes: lib-...            # optional
superseded_by: lib-...         # optional
source_published: 2026-01-10
last_verified: 2026-07-01      # "as of when true" — NEVER storage mtime
valid_until: null              # optional expiry; past it → HARD-removed from retrieval

verification:                  # evidence ledger; append-only
  - kind: sandbox              # sandbox | crossref | operator_review | spot_audit
    attestation: gateway_delivered | agent_asserted   # agent_asserted can NEVER satisfy
                               #   the §2.2 gate; pre-D7 entries are all agent_asserted
    attested_content_sha256: ...   # the body hash this evidence attests; gate requires
                               #   equality with current content_sha256
    run_id: R-...              # Gateway-minted, stored opaquely
    harness_version: ...       # identifier pending IDENTIFIERS.md mint at D-7 freeze
    ticket_id: T-000123
    verified_at: ...
    covered_anchors: [...]     # post-D7: derived Library-side from Gateway-delivered
                               #   transcript data, never copied from an agent claim (§2.4)
  - kind: crossref
    source_urls: [...]         # the N≥3 provenance-distinct set
    distinct_origins: 3

provenance_taint: curation-ingested    # ALWAYS present on ingested docs (ARCH §12);
                                       #   consumed by Board lane-eligibility (seam #29)
proposed_by: <sub>             # auth-minted, opaque
ticket_id: T-...               # the Board ticket the proposal rode in on
proposed_at: ...
admitted_by: <sub|operator>    # + admitted_at, admission_gate: sandbox_auto | operator_review
content_sha256: ...            # of the body below the frontmatter
```

`doc_id` is minted once, survives renames/moves; chunk IDs are `doc_id#<n>`, derived at index time, **never stored cross-app** (IDENTIFIERS.md) — and therefore **ephemeral**: the durable citation consumers may persist is `doc_id + heading anchor + line-range` (§3); `chunk_id` is a response-internal correlation field, documented as such in the tool descriptions.

### 1.3 Rebuildable projection: the index (`index.db`, SQLite, one file)

Destroy-and-rebuild is a first-class operation (§5.3). The index is a **pure function of the corpus** — no column may hold data that does not originate in corpus frontmatter/bodies (adversarial finding F4: an earlier `distro_eol` column violated this and was removed; EOL penalties now compute at query time from CMDB's `eol_date` when host facts are present). Schema sketch:

```sql
-- pinned build metadata: a rebuild is valid only if these match or a full re-embed ran
CREATE TABLE index_meta (
  model_id TEXT, model_digest TEXT, dim INTEGER,        -- from embed() responses (PENDING-SIZING)
  chunker_config_id TEXT,                                -- lib+version+tokenizer+size+overlap+rules
  corpus_commit TEXT, built_at TEXT);

CREATE TABLE docs (
  doc_id TEXT PRIMARY KEY, title TEXT, collection TEXT, kind TEXT,
  tier TEXT, admission TEXT, status TEXT,
  lineage_key TEXT, last_verified TEXT, valid_until TEXT,
  primary_partition TEXT,                    -- corpus dir the file lives in
  pending_embed INTEGER DEFAULT 0,           -- 1 = FTS-served, vectors queued (§4)
  content_sha256 TEXT);

CREATE TABLE doc_targets (                   -- one row PER applies_to entry (multi-target)
  doc_id TEXT REFERENCES docs,
  os_family TEXT, distro TEXT, major_version TEXT, arch TEXT, lifecycle TEXT,
  PRIMARY KEY (doc_id, os_family, distro, major_version, arch));

CREATE TABLE chunks (
  chunk_rowid INTEGER PRIMARY KEY,           -- joins vec + fts halves
  chunk_id TEXT UNIQUE,                      -- doc_id#<n>, derived, ephemeral
  doc_id TEXT REFERENCES docs,
  heading_path TEXT, anchor TEXT,
  char_start INTEGER, char_end INTEGER, line_start INTEGER, line_end INTEGER,
  evidence_covered INTEGER,                  -- 1 iff under a gateway_delivered covered_anchor (§2.4)
  content_hash TEXT, text TEXT);

CREATE VIRTUAL TABLE chunks_fts USING fts5(text, heading_path, content='chunks', content_rowid='chunk_rowid');

CREATE VIRTUAL TABLE chunks_vec USING vec0(
  embedding float[1024],                     -- dim = index_meta.dim (PENDING-SIZING)
  tier TEXT PARTITION KEY, os_family TEXT PARTITION KEY,
  distro TEXT PARTITION KEY, major_version TEXT PARTITION KEY,   -- PRIMARY target (routing
  +chunk_rowid INTEGER);                     --   optimization); doc_targets is the hard filter
```

- The **hard version filter is the `doc_targets` join** (exact, multi-target-correct); vec partition keys carry the primary target purely as a brute-force-scan-set optimization and never substitute for the join.
- **Status/admission transitions propagate to `index.db` synchronously**, in the same service operation as the git commit: `rejected`/`retired`/`superseded` remove or demote rows *immediately* — **only additions may lag the corpus; removals never do.** A rejection that fails to reach the index fails the whole operation loudly (finding F3).
- Vectors int8-quantized; MRL truncation deferred (open decision §15, default keep full dim).
- The FTS and vector halves live in **the same file**: one delete, one rebuild, one backup exclusion.

### 1.4 Operational state (`ops.db`, SQLite — **CANONICAL**)

Contains only what is genuinely not derivable from the corpus: Z1.4 switching state (`normal | tightened`), reindex job history, transient queues. **Audit-grade records — admission decisions, denials, spot-audit sample draws — do NOT live here:** they append to the git-backed `_audit/` JSONL stream in the corpus repo (§1.1), inheriting its push cadence, so no admission-audit record ever sits behind a daily backup window (finding F8). `ops.db` is classified CANONICAL (ARCHITECTURE §10 has no third class), snapshot daily. **Restore-consistency rule:** on any restore where `ops.db` is lost or older than the corpus, the sampling switch resets to **tightened (100% audit)** until the operator explicitly clears it — a restore can only make auditing stricter, never looser.

### 1.5 Durability classification & restore consistency (ARCHITECTURE §10)

| Store | Class | Backup mechanism + cadence |
|---|---|---|
| `corpus/` (markdown + frontmatter + `_audit/` + git history) | **CANONICAL** | git remote; push on every admission/audit commit, ≤5 min lag otherwise |
| `index.db` | rebuildable | none — deleted and rebuilt from corpus (§5.3 proves it) |
| `ops.db` | **CANONICAL** (switching state, job history) | daily snapshot; fail-stricter restore rule (§1.4) |

**Corpus↔index restore rule (finding F9):** on every startup and after any restore, the service hard-compares `index_meta.corpus_commit` against corpus HEAD. If the index commit is not an ancestor-or-equal of HEAD (index *leads* corpus — e.g. corpus restored to an older state), the index is **invalid**: vector+FTS serving is suspended (empty-with-error, not stale results) until a mandatory full rebuild completes. Drilled at Stage 7 alongside the backup restore.

---

## 2. Provenance tiers and the admission state machine (the core design)

### 2.1 Tiers (provenance class — what the evidence is)

1. **`sandbox-verified`** — testable claims actually executed in a tier-0 sandbox via the Gateway, evidence (`run_id` + `harness_version`, gateway-delivered) attached → **auto-admit**, operator spot-audits. **Path structurally disabled until `gateway-cmdb-library-sandbox.md` freezes (PENDING-D7).**
2. **`cross-referenced`** — **N ≥ 3 provenance-distinct** sources agree (distinctness = different `origin_cluster` after mirror/fork/SEO dedup by host + content-hash + canonical-upstream clustering); not executable → **batched operator review** admits. N raises queue priority, never confers trust — and the cluster assignment is a *heuristic*, presented as such (§8.3).
3. **`single-source` / `agent-authored`** — quarantine; retrievable only behind an explicit `include_unverified` flag, always flagged. Quarantined docs **are chunked and indexed** (flagged rows) so the charter's "retrievable behind the flag" is real, not vacuous (finding F5).

### 2.2 Admission (lifecycle — where the doc may be served from)

```
                     ┌──────────────► rejected (terminal, audit-retained, never served)
propose ─► quarantined ─► review_pending ─► admitted ─► (status: current ─► superseded ─► retired)
                     └──────────────────────► admitted        [sandbox auto-lane, PENDING-D7]
```

**The trusted-tier gate is a hard precondition, never agent judgment — and it is content-bound:**

```
admit(doc) ⇔ ∃ evidence e: e.kind = sandbox
             ∧ e.attestation = gateway_delivered            -- agent_asserted NEVER satisfies
             ∧ e.attested_content_sha256 = doc.content_sha256  -- evidence binds to exact bytes
             ∧ harness_attested(e)                          -- e.harness_version verifies against
                                                            --   the Gateway attestation record
                                                            --   (mechanism = D-7 freeze; until
                                                            --   then this conjunct is undefined
                                                            --   and the lane is DISABLED)
           ∨ operator_review_approved                       -- human-only, batched UI
```

No agreement count satisfies it. Admitted bodies are immutable (§1.1), so evidence can never drift from the bytes it attested — a re-verified or corrected doc is a **new** `doc_id` in the lineage (finding F1). This is the Stage-7 DoD sentence, encoded. Transitions:

| Transition | Caused by |
|---|---|
| `(new) → quarantined` | any principal with propose scope (agent via MCP, operator via UI) |
| `quarantined → review_pending` | service, automatically, when a crossref evidence entry with `distinct_origins ≥ 3` lands |
| `review_pending/quarantined → admitted` | **operator only** (batched review UI), or **service-automatic iff the gate predicate above holds** (PENDING-D7) |
| `* → rejected` | operator only — propagates to the index synchronously (§1.3) |
| `admitted → superseded/retired` | operator, or service on `superseded_by` link (supersession keeps evidence history — one `doc_id` per distro-version rendition, lineage-linked) |

Spot-audit lane: every auto-admitted doc enters the sampling pool at the ratified rate (100% young → 5% steady; tightened→100% on any confirmed poison; 100% after any `harness_version` change). A spot-audit failure flips the doc to `rejected` (synchronous index removal) and trips tightened switching. **Cluster-wide quarantine of the implicated `origin_cluster` is operator-confirmed, not automatic, whenever that cluster contains previously-admitted docs** — cluster assignment is heuristic and an attacker must not be able to weaponize a mis-clustered poison into mass-suppressing legitimate content (finding F16).

### 2.3 Provenance taint (ARCH §12, seam #29)

Every ingested doc and every retrieval result carries `provenance_taint: curation-ingested`. The Library **exposes** the taint; the **Board** computes lane eligibility from it (design input already recorded for Board Stage-2). Curation outputs therefore can never ride the auto-approve lane — enforced where lanes live, visible from here.

### 2.4 Chunk-level evidence coverage (anti tier-riding)

A sandbox-verified doc may contain prose that no execution ever touched; a poisoner could ride one verified command into trusted-tier prose. Mitigation: chunks under evidence-covered headings get `evidence_covered: true`, all others `false`; retrieval returns the doc tier **and** the per-chunk coverage flag; the spot-audit UI renders uncovered sections prominently.

**Coverage is never agent-testimony** (finding F2): post-D7, `covered_anchors` is **derived Library-side from the Gateway-delivered evidence payload** (transcript/commands joined by `run_id`), with the Library validating the evidence against the Gateway (e.g. a `get_execution_status(run_id)`-class read — a requirement this plan registers on the D-7 contract freeze, §5.4) and enforcing that **one `run_id` binds to exactly one `(doc_id, content_sha256)`** — no run_id reuse across docs. Anything an agent merely asserts is recorded `attestation: agent_asserted`, sets `evidence_covered = 0`, and can never satisfy the gate. Admission stays doc-level (simplicity); the consuming agent and the auditor both see exactly what reality confirmed.

---

## 3. Retrieval pipeline (query path)

```
query ──► resolve version scope ──► candidate set (pre-filter) ──► score ──► fuse ──► [rerank] ──► results
```

1. **Version scope:** caller supplies `host_id` (resolved via CMDB `resolve_host_facts`, cached ≤60 s) **or** explicit `target_os/target_distro/target_version/arch`. **Precedence is defined, not implicit: if both are supplied, the call fails with a typed `scope_conflict` error** (finding F15 — no silent precedence). Per the frozen contract: CMDB unreachable / host unknown ⇒ hard filter **disabled**, every chunk flagged `version_scope: unverified` — never a silently-wrong filter. No scope supplied ⇒ same flagged behavior.
2. **Pre-filter (hard, explicit predicate):** `doc_targets` join on `(os_family, distro, major_version, arch)` (vec partition keys as scan-set optimization only) ∧ `status = current` ∧ `valid_until` unexpired ∧ — by flag:
   - default: `admission = admitted`
   - `include_unverified = true`: `admission ∈ {admitted, quarantined, review_pending}`, quarantine-tier chunks individually flagged
   - **`admission = rejected` is excluded unconditionally, under every flag, at build and at query time.**
3. **Score:** `embed(query, input_type=query)` via the runtime facade → sqlite-vec KNN top-50 over the pre-filtered set, **and** FTS5/BM25 top-50 (query string escaped/sanitized — FTS5 syntax is never evaluated from raw caller input).
4. **Fuse:** RRF k=60, equal weight → top-k (default 8, max 25).
5. **Rerank (pluggable, OFF at MVP):** cross-encoder over top-20 → top-5 via the same runtime facade, behind a config flag; enabled only on measured precision evidence (Stage 6).
6. **Soft ranking adjustments:** minor-version proximity penalty (+ `version_scope: approximate` flag on nearest-older fallback); exponential age decay on `last_verified` with long half-life for `man-page`/`cli-reference` kinds; **distro-EOL penalty + stale flag computed at query time from CMDB's `eol_date`** when host facts are present (never stored in the index — §1.3).

**Every result carries, inline:** chunk text, `chunk_id` (ephemeral correlation field), **durable citation = `doc_id` + source URL + heading anchor + file line-range** (the form consumers may persist — §1.2), `tier`, `evidence_covered`, `version_scope` (`exact | approximate | unverified`), `applies_to` slice, `last_verified`, `provenance_taint`, evidence links. The consuming agent always knows what it leans on.

**Degraded modes (fail loud, never silently wrong):**
- **agent-runtime down** (D-13 hard dependency is on *indexing*, not query): semantic half unavailable → serve **FTS-only**, response-level flag `retrieval_mode: lexical_only`. Queries never hang on the facade (typed errors/backoff per the inference contract).
- **CMDB down:** contract behavior above.
- **`model_id` mismatch detected on any embed call:** index is stale-incompatible → serve FTS-only + flag, schedule full re-embed (never mix vector spaces).
- **Docs with `pending_embed = 1`** (admitted while runtime was down — §4): served from the FTS half, response flags `retrieval_mode: partial` — an admitted doc is never silently invisible.
- **Index invalid (corpus↔index commit mismatch, §1.5):** suspend serving with a typed error — stale results are worse than no results.

---

## 4. Ingestion pipeline (propose → admit)

```
propose(source_url, kind, ticket_id, op_id)
  ─► SERVICE fetches url (SSRF-guarded: https-only, public-IP-only with resolve-then-connect
       pinning, no private redirects, size cap 2 MB, timeout, MIME allowlist)
  ─► convert to markdown (pure function; html→md / man→md profiles; no JS execution)
  ─► mint doc_id, write to _quarantine/ with full frontmatter (tier per evidence present,
       provenance_taint stamped, sources[].content_sha256 recorded by the service)
  ─► git commit  +  chunk/embed/index into the QUARANTINE-flagged rows (§2.1 — quarantine
       is retrievable behind the flag, so it is indexed, flagged, from the start)
  ─► admission per §2 (review queue ⟶ operator / sandbox lane PENDING-D7)
  ─► on admission: move to partition dir, re-stamp frontmatter, flip index rows to admitted
       (synchronous, §1.3); additions may lag, removals never do
```

- The **service** fetches and hashes sources — an agent never supplies body content for a URL-sourced doc, so provenance hashes are minted by trusted code, not by the most injection-exposed principal. (`agent-authored` docs are the explicit exception and are pinned to the quarantine tier.)
- Embedding calls: `input_type=document`, batch ≤256, honor 429/retry-after backpressure (bulk work yields to live queries). **If the runtime is down at index time, the FTS insert proceeds and the vector insert queues (`pending_embed = 1`, visible in index-status and flagged at query time)** — pinned so neither silent invisibility nor a hidden hard query-time dependency can emerge (finding F17).
- Fetch/convert/chunk are deterministic; chunking is a pure function of (canonical bytes, `chunker_config_id`) — the rebuildable-index invariant depends on this.
- Deterministic contextual anchoring: each chunk embeds with a prepended header `"<title> (<version scope>) > <heading path>"` — persisted derivation, zero LLM cost, reproducible. LLM-generated contextualization is out of scope unless later written back into the corpus.
- **Proposal rate limiting:** per-`sub` proposal quota (config, default 50/day) on top of auth's generic budget middleware — a poisoning campaign is a volume play; make volume observable and bounded.
- Curation *work* (which slices to re-verify, when) is Board tickets claimed by curation agents (ARCH §6 team pattern); the Library never calls the Board or the Gateway for coordination — it stores `ticket_id` opaquely and serves state. Scheduled/event kickoffs live on the Board. (The one Gateway read this plan registers as a D-7 requirement is evidence validation — §2.4/§5.4.)

### 4.1 Re-verification & staleness jobs

- Nightly integrity sweep: sample chunks, recompute `content_hash` against corpus (index-tamper detection); verify `index_meta.corpus_commit` against HEAD (full check also at startup — §1.5).
- Staleness surfacing: docs past `valid_until` (hard-removed from retrieval) or with EOL/deprecated `applies_to.lifecycle` flagged into the UI retirement queue — retirement is operator-decided, never automatic deletion (evidence history preserved). Re-verification produces a **new lineage doc**, never an in-place body edit (§1.1).

---

## 5. Cross-app contract bindings

### 5.1 agent-runtime `embed()` (FROZEN in shape; D-13 ratified)

Consumed verbatim: `embed(texts[], input_type) → {vectors, model_id, dim}`; L2-normalized, cosine; prefix convention pinned identically at ingest and query; ≤256 texts/call; 429/retry-after honored; per-item failures surfaced. `model_id` compared **on every call** — any swap ⇒ flag index incompatible, full re-embed. **The contract does NOT promise bit-reproducible vectors, and this plan does not assume it** (finding F10 — see §5.3). **PENDING-SIZING:** `dim` (default 1024/Qwen3-0.6B) and re-embed throughput budget are gap-1.2 line items; `index_meta` treats them as config, not constants. Optional late-chunking capability: requested, not depended on.

### 5.2 CMDB `resolve_host_facts` (FROZEN in shape)

Consumed verbatim: inventory facts only, never policy fields; opaque `host_id`; short-TTL cache (60 s); fail-loud open-but-flagged (§3.1); `eol_date` consumed at query time for the EOL soft penalty (§3.6). Explicit target params keep query-time independence from CMDB.

### 5.3 Rebuildable-index proof (ARCH §10; Stage-7 DoD)

`POST /api/admin/reindex {mode: full}` deletes `index.db`, walks the corpus, re-chunks (pinned `chunker_config_id`), re-embeds, rebuilds both halves. **Two-part verification, split by what is actually guaranteed** (finding F10):
1. **Deterministic half — exact:** the chunk manifest (chunk boundaries, `content_hash` set, doc/target rows, flags) must be **byte-identical** to the previous build's manifest.
2. **Statistical half — thresholded:** embedding is not bit-reproducible across GPU runs, so retrieval equivalence over the smoke query set is measured, with the tolerance fixed *now*: **recall@8 ≥ 0.95 and Spearman rank correlation ≥ 0.95 per query** against the pre-destroy baseline. Defined at Stage 2 precisely so it cannot be quietly weakened under Stage-7 pressure.

### 5.4 Sandbox evidence (SKETCH — PENDING-D7)

The Library's consumer half is fixed and encoded here (§2.2 gate; §1.2 evidence fields; §2.4 coverage derivation). **Requirements this plan registers on the D-7 freeze** (consumer-side needs for the producers' Stage-2, per the sketch's own §2–3): evidence delivered or validatable Gateway-side (a `get_execution_status(run_id)`-class read is sufficient), evidence payload rich enough to derive `covered_anchors` (command transcript + exit status + config fingerprint, joined by `run_id`), `harness_version` minted in IDENTIFIERS.md, and harness attestation verifiable by the Library. Until the contract re-issues FROZEN: the auto-admit lane is **code-path disabled** (config constant, not a hidden branch); **every pre-freeze evidence entry is `attestation: agent_asserted` and permanently unable to satisfy the gate — the D-7 flip does not retroactively bless stored assertions** (finding F2); curation go-live is blocked. Nothing else in this plan waits on it.

### 5.5 auth (FROZEN baseline; library slice PENDING-R7)

RS duties consumed verbatim from `auth-apps-tokens-scopes.md` §1–2: local JWKS validation (poll ≤30 s, kid-prune kill channel), `iss` + `aud == library`, DPoP/`cnf` where bound, RFC 9728 metadata + 401 bootstrap, verbatim error semantics, budget middleware, revocation subscription with staleness fail-closed on destructive paths (the Library has none), principal only from validated token / verified `X-Auth-Identity`. **One reconciliation flag, not resolved here (finding F14):** the budget middleware keys off "the one shared Redis," which DEPLOYMENT §3 declares auth-private (`data_auth`) — a suite-wide contradiction for every RS, recorded for the auth R7 session; the Library implements the middleware interface and its Redis-down local-bound fallback either way.

**Proposed scope slice** (to countersign when auth's R7 session adds the `library` audience — nothing binds until then):
- `library:read` → `library_search`, `library_get_doc`
- `library:propose` → `library_propose`
- `library:curate` → `library_attach_sources`, `library_attach_sandbox_evidence`, `library_request_admission` (curation personas only; `team` label lands in the auth schema per R7)
- **`library:admin`** → admission decisions, rejection, retirement, supersession, collections, reindex — **human-principal-kind-gated, operator-only** (mirroring the `vault:manage`/`mc:admin` pattern; finding F11 — an explicit scope, not an invented "session-only" mechanism outside auth's model). Never minted to any agent principal.

**Risk / action-class manifest** (the §1 Stage-2 deliverable — every API-reachable operation classified; nothing left to fail-closed live-check by omission):

| Operation | Class |
|---|---|
| `library_search`, `library_get_doc`, review-queue/index-status reads | read |
| `library_propose`, `library_attach_sources`, `library_attach_sandbox_evidence`, `library_request_admission` | propose |
| admission decision, reject, retire, supersede, collections, reindex (`library:admin`) | write-benign (operator-only; state changes inside one Standard-class app; no external effect) |
| *(none)* | sod-critical / destructive-exec — the Library holds no credentials and no execution path |

---

## 6. Core API (one shared state; both surfaces are clients)

REST+JSON, service-internal port 8080, behind proxy forward-auth. Mutating endpoints take caller-minted `op_id` (IDENTIFIERS.md row) — replays collapse to the prior result.

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/search` | POST | hybrid retrieval (§3); params mirror the MCP tool |
| `/api/docs/{doc_id}` | GET | doc + frontmatter + evidence ledger (+`?body=true`) |
| `/api/docs/{doc_id}/chunks` | GET | chunk listing w/ citations (audit view) |
| `/api/proposals` | POST | propose ingestion (§4) → returns `doc_id` |
| `/api/proposals/{doc_id}/sources` | POST | attach crossref source set (curation; `attached_by: agent` recorded) |
| `/api/proposals/{doc_id}/evidence` | POST | attach sandbox evidence (curation; recorded `agent_asserted` until D-7 wiring delivers/validates Gateway-side) |
| `/api/proposals/{doc_id}/request-admission` | POST | run the §2 gate; routes to review queue or (post-D7) auto-lane |
| `/api/review-queue` | GET | batched tier-2 queue + tier-1 spot-audit stream (operator) |
| `/api/review-queue/{doc_id}/decision` | POST | approve/reject (`library:admin`) |
| `/api/docs/{doc_id}/retire`, `/supersede` | POST | lifecycle (`library:admin`) |
| `/api/collections` | GET/POST/PATCH | collection management (`library:admin`) |
| `/api/admin/reindex`, `/api/admin/index-status` | POST/GET | rebuild + status incl. push-backlog and `pending_embed` banners (`library:admin`) |
| `/healthz`, `/.well-known/oauth-protected-resource` | GET | liveness; RFC 9728 |

Audit logging: every state change logged with `sub`, `op_id`, `traceparent`, outcome; admission decisions/denials and spot-audit draws additionally append to the git-backed `_audit/` stream (§1.4); scope denials are first-class log events.

## 7. MCP surface (agents)

One MCP server (Streamable HTTP, **2025-11-25 pin**), thin adapter over §6 — never a second state. Schemas obey the D-17 ceiling: flat objects, string/enum/int params, `additionalProperties: false`; the two `str[]` params below are the only arrays and are flagged for confirmation against what the gap-1.3 spike validates; schemas are drafted now, **frozen only after the spike passes** (conservative posture; Library is not spike-gated but inherits the ceiling).

| Tool | Params (all flat) | Returns |
|---|---|---|
| `library_search` | `query` (str), `k?` (int≤25), `host_id?` (str) **XOR** `target_os_family?/target_distro?/target_version?/target_arch?` (str) — supplying both ⇒ typed `scope_conflict` error, never silent precedence | chunks per §3 (durable citation + tier + `evidence_covered` + `version_scope` + taint); response-level `retrieval_mode`; `chunk_id` documented ephemeral |
| `library_get_doc` | `doc_id` (str) | frontmatter, evidence ledger, chunk map |
| `library_propose` | `op_id`, `source_url` (str), `kind` (enum), `ticket_id` (str), `note?` (str) | `doc_id`, landing tier, admission state |
| `library_attach_sources` | `op_id`, `doc_id`, `source_urls` (str[]) | recomputed heuristic distinctness count, new admission state |
| `library_attach_sandbox_evidence` | `op_id`, `doc_id`, `run_id`, `harness_version` | recorded (`agent_asserted` pre-D7; Gateway-validated post-D7 — `covered_anchors` never accepted from the caller, §2.4); gate result (auto-lane PENDING-D7 → always `review_pending` at MVP) |
| `library_request_admission` | `op_id`, `doc_id` | gate outcome: `queued_for_review` \| `admitted` (PENDING-D7) \| `rejected_precondition` |

No admin/decision tools exist on the agent surface — **there is no MCP path to `admitted` that bypasses the §2 gate**, and no MCP path at all to approve, reject, retire, or manage collections.

## 8. Human UI (screens enumerated; spec = Stage 3)

1. **Corpus browser/search** — same retrieval as agents (two views, one state), tier/version badges on every hit.
2. **Doc inspector** — provenance, sources with hashes + heuristic origin clusters (labeled heuristic), `attached_by` provenance, full evidence ledger with attestation status, chunk/citation map, git history link.
3. **Ingestion review queue** — batched tier-2 approvals with per-doc diff view; **bulk-approve batch size capped (default 10)**; agent-picked source sets rendered visually distinct from service-discovered ones; distinctness shown as *heuristic evidence*, never as a verified-independence badge (finding F7 — the human gate must not be designed into a rubber stamp).
4. **Spot-audit stream** — sampled tier-1 auto-admissions (post-D7), switching-state indicator (normal/tightened), fail action → doc rejected + *operator-confirmed* cluster quarantine (§2.2).
5. **Collections & lifecycle** — manage collections, retirement/supersession queue (staleness flags surface here).
6. **Index status** — model_id/dim/chunker config, last rebuild, corpus-commit check result, push-backlog banner, `pending_embed` count, degraded-mode banners (lexical-only, CMDB-down).

## 9. Deployment binding (DEPLOYMENT.md — cited, not restated)

Service `library`, port 8080, `edge` only (never `creds`), no host ports, volume `library_data` (corpus git repo + `index.db` + `ops.db`), env prefix `LIBRARY_*`, auth at `auth:8089`. Stage-4 exit verifies against the spec, not this restatement.

## 10. Sequencing (Stage-4 build order, API-first)

1. Corpus store + frontmatter schema + git plumbing (single-writer service core, `_audit/` stream).
2. Deterministic chunkers (+ `chunker_config_id` pinning) + index build from corpus (FTS half first — works before runtime lands).
3. `embed()` client + vector half + hybrid retrieval + RRF (FTS-only mode is the standing fallback).
4. Ingestion pipeline + admission gate + review queue API (+ synchronous-removal propagation).
5. MCP adapter (2025-11-25 pin) → 6. UI (Stage-3 spec) → 7. reindex/rebuild proof + restore drill + degraded-mode drills.

## 11. PENDING register (plan-around, never assume)

| Marker | What is pending | Producer/owner | What this plan does meanwhile |
|---|---|---|---|
| **PENDING-SIZING** | embedding **dim** (default 1024) and **re-embed throughput** budget (reindex scheduling, bulk-batch pacing) | gap-1.2 sizing artifact (agent-runtime) | `dim` is `index_meta` config, not a constant; throughput numbers appear only as targets; index schema final numbers land when gap-1.2 publishes |
| **PENDING-D7** | tier-0 sandbox seam: CMDB `disposable` class, Gateway `execute_in_sandbox` + evidence capture/validation read, `harness_version` mint + attestation | Gateway + CMDB Stage-2 (mandatory exit items, ratified D-7); Library's consumer requirements registered in §5.4 | auto-admit lane **code-path disabled**; all evidence recorded `agent_asserted` and permanently gate-ineligible (no retroactive blessing); curation **go-live blocked**; tier-2 review lane fully functional without it |
| **PENDING-R7** | auth `library` audience + scope slice (`library:read/propose/curate/admin`), curation-persona scoping, `team` label | auth next session (R7) | RS baseline implemented against §1–2 of the frozen auth contract; scope slice **proposed** in §5.5 and countersigned when offered; budget-middleware Redis contradiction flagged for the same session; until then the MCP surface cannot ship authenticated — build order puts it after core API anyway |

## 12. Threat model outline (Stage-5 primary: corpus poisoning via ingestion)

To be expanded into `security/THREAT_MODEL.md`; the axes and their design answers:

1. **Poisoning via propose-ingestion** (PoisonedRAG-class: ~5 crafted docs suffice). Answer: the §2 content-bound hard gate — no agent-judgment path to `admitted`; cross-referencing never auto-admits (correlated internet sources = circular reporting — N-agreement is popularity, not truth); **sandbox execution is the only strong signal** because reality, not consensus, confirms a testable claim.
2. **Evidence forgery / tier-riding**: evidence is gateway-delivered + content-hash-bound + one-run_id-one-doc (§2.2/§2.4); `covered_anchors` never agent-supplied; pre-D7 assertions permanently gate-ineligible.
3. **Poison persistence after detection**: rejection propagates to the serving index synchronously; removals never lag (§1.3).
4. **Sybil/correlated sources**: heuristic origin-cluster distinctness before N counts; agent-picked source sets marked; bulk-approve caps; per-`sub` proposal quotas; cluster quarantine operator-confirmed to prevent denial-of-trust inversion.
5. **Harness forgery** (the root of trust): evidence binds to `harness_version`; harness changes fall under §12 policy-plane change control (Gateway/CMDB side, PENDING-D7); Library's lever = 100% audit of post-change batches.
6. **Indirect prompt injection through retrieved content**: chunk text is adversarial input to consumers; every result carries tier + taint so consumers and the Board lane computation can act on it; curation agents (max-exposure principals) hold only propose-class scopes — nothing they can be steered into doing here is destructive.
7. **SSRF via source fetching**: service-side fetcher guards incl. resolve-then-connect pinning (§4).
8. **Index tamper / silent divergence**: index disposable; nightly hash sweep + startup corpus-commit check; rebuild proof; `model_id` mismatch → lexical-only, never mixed vector spaces.
9. **Version-spoofing / staleness as an attack**: mandatory `applies_to`, `doc_targets` hard filter, fail-loud `version_scope` flags, `valid_until` hard removal.
10. **FTS5 query injection / resource abuse**: query sanitization; k caps; budget middleware + per-`sub` proposal quotas; doc-size and chunk-count caps.
11. **Scope abuse**: no destructive tools exist; admission/lifecycle behind `library:admin` (human-kind-gated); auth slice countersign (PENDING-R7).

## 13. What the Library is NOT (boundary restatement, one line each)

Not Notes (external provenance, not agent memory); no execution path (Gateway executes; the Library's only Gateway interaction is the read-side evidence validation registered for D-7); no credentials (never joins `creds`); no policy authority (consumes CMDB facts, never tier/window); not a second coordinator (Board coordinates curation work).

## 14. Adversarial review (Stage-2 requirement) — two passes, findings, dispositions

**Pass 1 (inline, during drafting)** surfaced and pre-fixed: tier-riding via doc-level tiers (→ §2.4), query-time runtime-dependency creep (→ FTS-only mode), restore weakening the audit switch (→ fail-stricter rule), agent-supplied bodies forging provenance (→ service-side fetch), SSRF (→ fetcher guards), rejected-doc re-entry on rebuild (→ unconditional exclusion), chunker drift (→ config pinning), `include_unverified` self-serve reading (accepted — charter behavior, flagged + taint-carried), git remote as tamper channel (accepted — push-only deploy key, no service-side pull-merge), embedder supply chain (covered at the seam: runtime's Sigstore gate; Library lever = model_id pinning).

**Pass 2 (independent critic agent against the drafted plan)** — findings and dispositions:

| # | Sev | Attack | Disposition |
|---|---|---|---|
| F1 | HIGH | Evidence not content-bound: verify-then-mutate keeps stale attestations satisfying the gate | **Fixed** — `attested_content_sha256` on every evidence entry; gate requires hash equality; admitted bodies immutable, changes mint a new lineage doc (§1.1/§1.2/§2.2) |
| F2 | HIGH | Evidence (esp. `covered_anchors`) is agent-asserted; pre-D7 entries could be retroactively blessed; run_id replay across docs | **Fixed** — `attestation: gateway_delivered \| agent_asserted`; asserted entries permanently gate-ineligible; coverage derived from Gateway-delivered payload only; one run_id ⇔ one (doc_id, content_sha256); D-7 consumer requirements registered (§2.4/§5.4) |
| F3 | HIGH | "Index lags corpus" lets rejected/retired poison keep serving until next reindex | **Fixed** — removals/demotions propagate synchronously in the same operation; only additions may lag; failed removal fails loud (§1.3) |
| F4 | HIGH | `distro_eol` in the index has no corpus source — breaks the pure-function rebuild invariant | **Fixed** — column removed; EOL penalty computed at query time from CMDB `eol_date` (§1.3/§3.6) |
| F5 | MED | Quarantine promised retrievable but never indexed; `rejected` arguably servable behind the flag | **Fixed** — quarantine indexed (flagged) from proposal; explicit retrieval predicate; rejected excluded unconditionally (§2.1/§3.2/§4) |
| F6 | MED | `applies_to` is plural but layout + docs table were single-target — multi-target docs silently dropped for some hosts | **Fixed** — `doc_targets` rows are the hard filter; partition dir demoted to primary-target routing optimization (§1.1/§1.3) |
| F7 | MED | Distinctness heuristic gameable; count rendered as trust inside a bulk-approve UI = designed-down human gate | **Fixed in mechanics, residual accepted** — heuristic labeling, agent-set marking, bulk cap 10, per-`sub` quotas (§4/§8.3); residual: distinctness stays a heuristic — the operator gate is the control, and the UI now says so |
| F8 | MED | "canonical-lite" ops.db hid audit-grade records behind a daily backup window | **Fixed** — ops.db reclassified CANONICAL; audit-grade rows moved to the git-backed `_audit/` stream (§1.1/§1.4) |
| F9 | MED | No corpus↔index restore rule — a restored corpus with a surviving newer index serves ghosts | **Fixed** — startup/post-restore ancestor check on `index_meta.corpus_commit`; invalid ⇒ suspend serving until full rebuild; added to Stage-7 drill (§1.5) |
| F10 | MED | "Identical rankings" rebuild criterion unfalsifiable (embedding non-deterministic; seam never promised it) | **Fixed** — split criterion: byte-identical chunk manifest (exact) + recall@8 ≥0.95 / Spearman ≥0.95 (thresholds fixed now, §5.3) |
| F11 | MED | "No scope, operator-session-only" invents an authz mechanism outside auth's model; operator ops unclassified in the manifest | **Fixed** — explicit `library:admin` scope proposed for R7 countersign (human-kind-gated); manifest classifies every operation (§5.5) |
| F12 | MED | `chunk_id` handed out as a citation key while explicitly unstable/never-stored-cross-app | **Fixed** — durable citation = doc_id + anchor + line-range; chunk_id documented ephemeral (§1.2/§3/§7) |
| F13 | LOW | `doc_id` format pinned in-plan before the IDENTIFIERS.md format cell says so | **Fixed** — IDENTIFIERS.md doc_id format cell amended alongside this plan (Library is the minting app; one-cell change) |
| F14 | LOW | Budget middleware requires "the one shared Redis" that DEPLOYMENT declares auth-private | **Flagged, not resolved** (suite-wide, not Library's to fix) — recorded for the auth R7 session (§5.5) |
| F15 | LOW–MED | `library_search` host_id/target_* implicit XOR = undefined precedence for local models; arrays strain the D-17 ceiling | **Fixed** — typed `scope_conflict` error on conflict; arrays flagged for spike confirmation before freeze (§3.1/§7) |
| F16 | LOW | Automatic cluster-wide quarantine is attacker-steerable into denial-of-trust against legitimate sources | **Fixed** — cluster quarantine operator-confirmed when the cluster contains previously-admitted docs (§2.2) |
| F17 | LOW–MED | Push-failure and runtime-down-at-admission behavior unspecified — one implementable branch of each violates stated invariants | **Fixed** — push failure: admission proceeds + loud banner + retry + 30-min escalation; runtime down: FTS insert now, vectors queued as `pending_embed`, flagged (§1.1/§4/§3) |

Residual risks accepted: pass-1 items AR-8/AR-9 as stated; F7's irreducible heuristic distinctness (control = the operator gate, honestly presented); AR-5's DNS-rebinding tail (mitigated by resolve-then-connect pinning; Stage-5 verification item).

## 15. Open decisions (defaults encoded; operator may override)

1. **Reranker at MVP** — default OFF, enable on eval evidence (Stage 6).
2. **MRL truncation** (e.g. 256-dim storage) — default full dim; revisit at Stage 6 with gap-1.2 numbers.
3. **Non-executable prose ceiling** — default: permanent tier-2; the curated-authority allowlist for known-good vendor origins remains an unexercised operator option.
4. **Minor-version fallback** — default: nearest-older + `version_scope: approximate`; hard-empty alternative available per task type if Stage-5 red-teaming demands.
5. **Per-`sub` proposal quota** — default 50/day; operator-tunable.
6. **Bulk-approve batch cap** — default 10; operator-tunable (trade review labor vs rubber-stamp pressure).

## 16. Stage-2 exit criteria mapping (PROCESS.md)

- **"Data model and both surfaces (MCP + UI) specified over one shared state"** — §1–2 (data model + admission state machine), §6 (the one API), §7 (MCP as thin adapter), §8 (UI as sibling client). ✅
- **"Adversarial concerns resolved or explicitly accepted with reason"** — §14: two passes; 4 HIGH + 9 MED/LOW fixed in design, 1 flagged cross-app, residuals accepted with reasons. ✅
- **Contract discipline** — every cross-app behavior cites a frozen contract or is PENDING-registered (§5, §11); consumer-side requirements on the unfrozen D-7 seam are registered as requirements, not assumed as facts. ✅
- **Known non-exit items, by operator instruction:** curation go-live (PENDING-D7), authenticated MCP shipping (PENDING-R7), final index numbers (PENDING-SIZING) — tracked, not blocking this artifact.
