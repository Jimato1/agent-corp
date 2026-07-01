"""auth.mcp — the THIN agent / MCP surface (PLAN §9.2).

Surface B of the "two views, one state" invariant. Deliberately minimal: agents
interact with `auth` overwhelmingly via the OAuth `token` endpoint, not MCP tools.
These four tools are READ / SELF-ONLY:

  * whoami            — own sub, kind, roles, effective scopes, requestable
                        audiences, budget headroom
  * authorize_check   — dry-run (SELF, action, resource) before acting
  * introspect_self   — freshness/validity of the caller's OWN presented token
  * budget_self       — own effective caps + live usage (read-only self-throttle)

Hard constraints enforced here (Stage-7 "cannot escalate"):
  * read / self only; the acting `principal` is ALWAYS forced to the authenticated
    caller — an agent can never query or act on another principal;
  * NO tool mints a token, grants/revokes a role, or edits a budget — those
    writer methods are simply not reachable from this surface (structural);
  * every tool is scoped `auth:self` and audience-bound to `auth` (aud must be
    the auth RS); a token for any other audience cannot reach these tools.

Imports ONLY the frozen foundation (auth.core / auth.store / auth.crypto) + stdlib.
Integration wires this surface over the real Core API; this package owns the
self-service tool LOGIC and its self-only guarantees.
"""
from .surface import (
    AUTH_SELF_SCOPE,
    AUTH_SURFACE_AUDIENCE,
    TOOL_NAMES,
    AuthMCPSurface,
    CallerIdentity,
    CrossPrincipalDenied,
    NotSelfScoped,
)

__all__ = [
    "AuthMCPSurface",
    "CallerIdentity",
    "CrossPrincipalDenied",
    "NotSelfScoped",
    "AUTH_SELF_SCOPE",
    "AUTH_SURFACE_AUDIENCE",
    "TOOL_NAMES",
]
