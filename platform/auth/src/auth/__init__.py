"""auth — the identity gateway (Critical-infra) for the agent-corp suite.

This package is the SOLE owner of identity state for the whole suite. Every
other app's MCP-surface authorization and every audit trail's "who did this"
resolves back to the contracts defined here.

Public contract surface for parallel builders (FROZEN — import only from these):
  - auth.core.scopes      : the one scope taxonomy + the IMMUTABLE SoD ConflictSet
  - auth.core.principals  : Principal / Role / RoleHierarchy / AgentKey / BudgetPolicy
  - auth.core.tokens_model: RFC 9068 access-token + X-Auth-Identity claim sets
  - auth.core.interfaces  : Store / HotStore / Signer Protocols
  - auth.core.errors      : typed errors (SoDViolation, FailClosed, InsufficientScope, ...)
  - auth.store            : Store / HotStore concrete impls (SQLite-now, Redis-later)
  - auth.crypto           : Signer impls (HMAC test-signer, EdDSA prod-signer)

See src/README.md for the package map and the SQLite-now / EdDSA-prod caveats.
"""

__all__ = ["core", "store", "crypto"]
__version__ = "0.1.0-stage4-foundation"
