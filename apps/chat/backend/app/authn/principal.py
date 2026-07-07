"""Principal resolution + scope gates (auth-apps-tokens-scopes.md §1; PLAN §5).

The scope slice (Chat's countersign, PLAN §5):

* ``chat:post``   — agents + operator — the ONLY agent-reachable capability.
* ``chat:read``   — operator only — feed, history, SSE, broadcast list.
* ``chat:manage`` — operator only — ack, broadcast create/revoke.

Two credential paths, both cryptographically verified — never trusted off a raw
header (the CVE-2026-30851 header-authz collapse is closed by always verifying the
``X-Auth-Identity`` signature):

* ``Authorization: Bearer <at+jwt>`` — the agent/service path. Scopes come straight
  from the audience-bound token (``aud==chat``). An agent token carries only
  ``chat:post`` (auth never grants agents read/manage), so it structurally cannot
  reach a read/manage endpoint.
* ``X-Auth-Identity`` — the operator browser path (proxy-injected on 200). A human
  principal is the operator and holds the full operator scope set.

**Defense in depth (the "agents never get read/broadcast" invariant, held at the RS
by construction):** a read/manage gate ALSO refuses any ``agent``/``service`` kind
even if a token somehow presented the scope — belt-and-suspenders over auth's
grant-time kind gate.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable

from fastapi import Depends, Request

from ..config import Settings, get_settings
from ..core.errors import Forbidden, Unauthenticated
from .jwks import KeyRing
from .jwt import TokenError, decode_identity_header, validate_access_token

SCOPE_POST = "chat:post"
SCOPE_READ = "chat:read"
SCOPE_MANAGE = "chat:manage"

_OPERATOR_SCOPES = frozenset({SCOPE_POST, SCOPE_READ, SCOPE_MANAGE})
_AGENT_KINDS = frozenset({"agent", "service"})
_OPERATOR_ONLY = frozenset({SCOPE_READ, SCOPE_MANAGE})


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

    @property
    def agent_kind(self) -> str:
        """The PrincipalRef display kind the UI expects (agent | service | operator)."""
        return self.kind

    def has(self, scope: str) -> bool:
        return scope in self.scopes


def _resolve(request: Request) -> Principal:
    settings: Settings = request.app.state.settings
    keyring: KeyRing = request.app.state.keyring
    import time

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
        return Principal(
            sub=sub, kind=kind_from_sub(sub), scopes=scopes,
            kill_level=str(claims.get("kill_level", "G0")),
            kill_epoch=int(claims.get("kill_epoch", 0)), via="bearer",
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
            # An agent should never arrive by browser session; grant only post.
            return Principal(sub=sub, kind="agent", scopes=frozenset({SCOPE_POST}),
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
    """Dependency factory: caller must hold ``scope``; read/manage additionally bar
    agent/service kinds (the invariant held by construction at the RS)."""

    def _dep(principal: Principal = Depends(current_principal)) -> Principal:
        if scope in _OPERATOR_ONLY and principal.kind in _AGENT_KINDS:
            raise Forbidden(
                f"{scope} is operator-only; principal kind {principal.kind!r} is barred "
                "(agents never get read/broadcast).",
                code="insufficient_scope",
            )
        if not principal.has(scope):
            raise Forbidden(f"missing required scope {scope!r}.", code="insufficient_scope")
        return principal

    return _dep


# Pre-built gate dependencies (import these on routes).
require_post = require_scope(SCOPE_POST)
require_read = require_scope(SCOPE_READ)
require_manage = require_scope(SCOPE_MANAGE)
