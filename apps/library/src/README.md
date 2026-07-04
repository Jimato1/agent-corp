# library — source (Stage-4 build)

The Reference Library: a curated RAG corpus. Two sibling surfaces over ONE shared
state (PLAN §6) — the Core REST API and the MCP agent surface — plus a static operator
UI. Standard risk class with the §12 untrusted-content ingestion surface as its
primary Stage-5 threat.

## Layout

```
library/
  server.py         # ThreadingHTTPServer + the PURE dispatch() router mounting both surfaces + UI
  service.py        # LibraryService — the ONE shared state both surfaces are clients of
  config.py         # the LIBRARY_* env surface (DEPLOYMENT.md)
  ids.py errors.py  # IDENTIFIERS.md formats + the typed error→HTTP taxonomy
  corpus/           # CANONICAL store: markdown + frontmatter (JSON-per-key dialect) + git + _audit
  index/            # REBUILDABLE projection: deterministic chunker, index.db (FTS5 + portable vectors), hybrid RRF retrieval
  ingest/           # admission.py (THE content-bound gate — pure, dependency-free) + SSRF-guarded fetcher
  clients/          # embed() facade · CMDB host-facts · Gateway sandbox-evidence · budget — injectable seams
  authz/            # RS middleware: JWKS validation, aud, DPoP, human-kind gate, scope map
  api/  mcp/        # the Core REST API + the MCP Streamable-HTTP adapter (2025-11-25)
  ops/              # ops.db: op_id idempotency + Z1.4 switching + jobs
  tests/            # unit + admission-gate + auto-admit-disabled + rebuildable + retrieval + RS authz
```

## The two load-bearing safety properties (verify these first)

1. **The content-bound admission gate** (`ingest/admission.py`). No agreement count and
   no agent judgment reaches the trusted tier. Only a SERVICE-minted `gateway_delivered`
   evidence entry (content-hash-bound, harness-attested, validated against the Gateway's
   own record — never copied from an agent claim) or an operator review admits.
2. **The auto-admit lane is code-path DISABLED** (`config.auto_admit_enabled`, default
   `False`) until D-7 go-live. While disabled, `request_admission` NEVER auto-admits —
   every doc routes to operator review. There is NO MCP path to `admitted`.

## Run

```
# tests (stdlib unittest — no third-party needed)
PYTHONPATH=src python -m unittest discover -s src/library/tests -v

# boot
PYTHONPATH=src LIBRARY_DATA_DIR=/tmp/libdata python -m library.server
```
