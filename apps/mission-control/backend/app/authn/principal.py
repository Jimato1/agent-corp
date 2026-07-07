"""Principal resolution + scope gates (auth-apps-tokens-scopes.md §1; MC PLAN §6.4).

MC's countersigned scope slice (PLAN §6.4 / auth `mc` row):

* ``mc:report``     — agents (MCP ``report_status``); advisory breadcrumb, display-only.
* ``mc:escalate``   — agents (MCP ``request_escalation``); pinned attention item.
* ``mc:kill-switch``— **operator only, Tier-2, never agent-mintable** — the relay
  ``POST /api/killswitch/raise`` (calls auth; MC is NOT a second enforcer).
* ``mc:admin``      — operator only — MC-local config/silences/filters/params.
* ``mc:read``       — read-only feed/queue scope; granted to **svc:chat** (resolve
  feed + queue reads) and held by the operator UI.
* ``mc:anchor``     — append-only anchor-push scope; granted to **svc:gateway**
  (``POST /api/anchors``).

Two credential paths, both cryptographically verified — NEVER trusted off a raw
header (the header-authz collapse is closed by always verifying the
``X-Auth-Identity`` signature, auth §8.6 Rule 3):

* ``Authorization: Bearer <at+jwt>`` — the agent/service path (``aud==mc``). Scopes
  come straight from the audience-bound token.
* ``X-Auth-Identity`` — the operator browser path (proxy-injected on 200). A human
  principal is the operator and holds the operator scope set.

**Defense in depth:** operator-only scopes additionally refuse any ``agent``/``service``
kind even if a token somehow presented the scope; ``mc:anchor`` refuses non-service
kinds. Belt-and-suspenders over auth's grant-time kind gate (auth §9 ``HOLDER_ALLOWED_KINDS``).
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, Request

from ..config import Settings
from ..core.errors import Forbidden, Unauthenticated
from .jwks import KeyRing
from .jwt import TokenError, decode_identity_header, validate_access_token

SCOPE_REPORT = "mc:report"
SCOPE_ESCALATE = "mc:escalate"
SCOPE_KILL = "mc:kill-switch"
SCOPE_ADMIN = "mc:admin"
SCOPE_READ = "mc:read"
SCOPE_ANCHOR = "mc:anchor"

# The operator (human, via verified X-Auth-Identity) drives the cockpit. Agents never
# arrive as operator; report/escalate/anchor are NOT operator scopes (they surface INTO
# the operator's screens, or are service producer seams).
_OPERATOR_SCOPES = frozenset({SCOPE_READ, SCOPE_ADMIN, SCOPE_KILL})

_AGENT_KINDS = frozenset({"agent", "service"})
_OPERATOR_ONLY = frozenset({SCOPE_KILL, SCOPE_ADMIN})   # bar agent/service kinds
_SERVICE_ONLY = frozenset({SCOPE_ANCHOR})               # bar operator/agent kinds


def kind_from_sub(sub: str) -> str:
    """Derive the principal kind from the ``sub`` prefix (IDENTIFIERS: opaque, but
    prefix-typed ``agent:`` / ``svc:`` / ``op:``)."""
    if sub.startswith("agent:"):
        return "agent"
    if sub.startswith("svc:"):
        return "service"
    if sub.startswith(("op:", "operator:")):
        return "operator"
    return "operator"  # a human session with an unprefixed sub is the operator


@dataclass(frozen=True)
class Principal:
    sub: str
    kind: str  # agent | service | operator
    scopes: frozenset[str]
    kill_level: str = "G0"
    kill_epoch: int = 0
    via: str = "bearer"  # bearer | identity
    # DPoP/sender-constraint proof material, forwarded UNTOUCHED on a relay (§5.1):
    # MC never re-signs; it passes the caller's proof through to auth verbatim.
    cnf_jkt: str | None = None

    @property
    def agent_kind(self) -> str:
        return self.kind

    def has(self, scope: str) -> bool:
        return scope in self.scopes


def _resolve(request: Request) -> Principal:
    settings: Settings = request.app.state.settings
    keyring: KeyRing = request.app.state.keyring
    now = int(time.time())
    authz = (request.headers.get("authorization") or "").strip()
    identity = request.headers.get("x-auth-identity")

    # 1) Bearer first (audience-bound, carries scopes directly).
    if authz.startswith("Bearer "):
        token = authz[len("Bearer "):].strip()
        try:
            claims = validate_access_token(
                token, keyring,
                expected_iss=settings.auth_issuer,
                expected_aud=settings.auth_audience,
                now=now, leeway_s=settings.auth_clock_skew_seconds,
            )
        except TokenError as exc:
            raise Unauthenticated(f"invalid bearer token: {exc.message}") from exc
        sub = str(claims["sub"])
        scopes = frozenset(str(claims.get("scope", "")).split())
        cnf = claims.get("cnf") or {}
        return Principal(
            sub=sub, kind=kind_from_sub(sub), scopes=scopes,
            kill_level=str(claims.get("kill_level", "G0")),
            kill_epoch=int(claims.get("kill_epoch", 0)), via="bearer",
            cnf_jkt=(cnf.get("jkt") if isinstance(cnf, dict) else None),
        )

    # 2) X-Auth-Identity (operator browser path).
    if identity:
        try:
            claims = decode_identity_header(
                identity, keyring,
                expected_iss=settings.auth_issuer,
                expected_aud=settings.auth_audience,
                now=now, leeway_s=settings.auth_clock_skew_seconds,
            )
        except TokenError as exc:
            raise Unauthenticated(f"invalid identity header: {exc.message}") from exc
        sub = str(claims.get("sub", ""))
        ptype = str(claims.get("principal_type", "human"))
        if ptype == "agent":
            # An agent should never arrive by browser session; grant only report/escalate.
            return Principal(sub=sub, kind="agent", scopes=frozenset({SCOPE_REPORT, SCOPE_ESCALATE}),
                             kill_level=str(claims.get("kill_level", "G0")),
                             kill_epoch=int(claims.get("kill_epoch", 0)), via="identity")
        return Principal(
            sub=sub, kind="operator", scopes=_OPERATOR_SCOPES,
            kill_level=str(claims.get("kill_level", "G0")),
            kill_epoch=int(claims.get("kill_epoch", 0)), via="identity",
        )

    raise Unauthenticated()


def current_principal(request: Request) -> Principal:
    """FastAPI dependency: the verified caller (or 401)."""
    return _resolve(request)


def require_scope(scope: str) -> Callable[[Request], Principal]:
    """Dependency factory: caller must hold ``scope``; kind gates apply defense-in-depth."""

    def _dep(principal: Principal = Depends(current_principal)) -> Principal:
        if scope in _OPERATOR_ONLY and principal.kind in _AGENT_KINDS:
            raise Forbidden(
                f"{scope} is operator-only; principal kind {principal.kind!r} is barred.",
                code="insufficient_scope",
            )
        if scope in _SERVICE_ONLY and principal.kind != "service":
            raise Forbidden(
                f"{scope} is a service-producer scope; principal kind {principal.kind!r} is barred.",
                code="insufficient_scope",
            )
        if not principal.has(scope):
            raise Forbidden(f"missing required scope {scope!r}.", code="insufficient_scope")
        return principal

    return _dep


# Pre-built gate dependencies (import these on routes).
require_report = require_scope(SCOPE_REPORT)
require_escalate = require_scope(SCOPE_ESCALATE)
require_kill = require_scope(SCOPE_KILL)
require_admin = require_scope(SCOPE_ADMIN)
require_read = require_scope(SCOPE_READ)
require_anchor = require_scope(SCOPE_ANCHOR)
