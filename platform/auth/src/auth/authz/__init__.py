"""auth.authz — the two-tier authorization surface (PLAN §5).

  * pep.py            — the Tier-1 local PEP decision sequence (§5.1): fast,
                        offline, 401-vs-403 wire semantics, routes to the PDP.
  * pdp.py            — the Tier-2 central PDP (§5.3): permit/deny + obligations,
                        the IMMUTABLE SoD `forbid` guardrail (forbid > permit),
                        the no-self-approval backstop, fail-closed on any doubt.
  * scope_tool_map.py — the scope -> MCP-tool table (§5.5) every app builds against.
  * policies/sod.cedar — the declarative production SoD `forbid` guardrail; its
                        pairs are parity-tested against auth.core.scopes.

Imports only from auth.core / auth.store / auth.crypto and the stdlib.
"""
from __future__ import annotations

from . import pdp, pep, scope_tool_map

__all__ = ["pep", "pdp", "scope_tool_map"]
