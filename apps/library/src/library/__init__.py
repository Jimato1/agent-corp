"""library — the corporate Reference Library (Stage-4 build).

A curated RAG corpus (Standard risk class, ARCHITECTURE §12 untrusted-content
ingestion surface). Two sibling surfaces over ONE shared state (PLAN §6):

  * the Core REST API (library.api.core_api)  — the sole writer
  * the MCP agent surface   (library.mcp.surface)
  * the human UI            (ui/build, static)

The corpus markdown is CANONICAL; index.db is a rebuildable projection
(ARCHITECTURE §10). The content-bound admission gate (library.ingest.admission)
is the primary Stage-5 poisoning defense: no agreement count and no agent
judgment ever reaches the trusted tier.
"""

__version__ = "0.1.0"
