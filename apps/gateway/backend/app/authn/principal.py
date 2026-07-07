"""Principal resolution + scope gates (auth-apps-tokens-scopes.md §1/§8; PLAN §11 slice).

The `gateway` scope slice (Gateway Stage-2 countersign, PLAN §11/§16-A5):

* ``gateway:execute`` — **HOLDER** scope, executor agents (dynamic set). destructive-exec.
  Consumed as offered: HOLDER, ``aud=gateway``, full §8 pin honored at the tool handler AND
  middleware (cnf DPoP proof + uncached introspect + drift D=1s). This is Check-0.
* ``gateway:sandbox`` — NEW, non-holder, write-benign (tier-0). Curation-team personas only
  (``team`` label). **Grant-time exclusion:** never grantable with ``gateway:execute`` — a
  belt-and-suspenders structural check bars a principal that somehow carries both (§10 G2).
* ``gateway:read`` — NEW, non-holder, read tools + the operator console.

Two credential paths, both cryptographically verified — never trusted off a raw header:

* ``Authorization: Bearer <at+jwt>`` — agent/service path (scopes from the audience-bound
  token). The §8 holder path additionally applies to ``gateway:execute`` (Bearer + DPoP +
  live check).
* ``X-Auth-Identity`` — the operator browser path (proxy-injected on 200): read + the
  operator write paths (catalog change-control, orphan re-redemption) which ADD their own
  step-up (never reachable by an agent — no MCP path exists).

**Structurally absent** (the Vault four-tools pattern): no shell/command/credential/raw-SSH
tool, catalog writes, approval anything, halt writes — NOT registered on the agent surface.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable

from fastapi import Depends, Request

from ..config import Settings
from ..core.errors import Forbidden, Unauthenticated
from .dpop import DPoPError, verify_dpop
from .jwks import KeyRing
from .jwt import TokenError, decode_identity_header, validate_access_token
from .livecheck import LiveCheckResult, live_check_destructive

SCOPE_EXECUTE = "gateway:execute"   # HOLDER, executor agents, destructive-exec
SCOPE_SANDBOX = "gateway:sandbox"   # non-holder, curation-team, write-benign (tier-0)
SCOPE_READ = "gateway:read"         # non-holder, reads + operator console

_AGENT_KINDS = frozenset({"agent", "service"})


def kind_from_sub(sub: str) -> str:
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
    via: str = "bearer"  # bearer | identity
    jti: str | None = None
    kid: str | None = None
    cnf_jkt: str | None = None

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
            header, claims = validate_access_token(
                token, keyring,
                expected_iss=settings.auth_issuer,
                expected_aud=settings.auth_audience,
                now=now, leeway_s=settings.auth_clock_skew_seconds,
            )
        except TokenError as exc:
            raise Unauthenticated(f"invalid bearer token: {exc.message}") from exc
        sub = str(claims["sub"])
        scopes = frozenset(str(claims.get("scope", "")).split())
        cnf = claims.get("cnf") if isinstance(claims.get("cnf"), dict) else None
        return Principal(
            sub=sub, kind=kind_from_sub(sub), scopes=scopes, via="bearer",
            jti=claims.get("jti"), kid=header.get("kid"),
            cnf_jkt=(cnf or {}).get("jkt"),
        )

    # 2) X-Auth-Identity (operator browser path): read + operator console.
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
        if ptype == "agent":  # an agent should never arrive by browser session
            return Principal(sub=sub, kind="agent", scopes=frozenset({SCOPE_READ}), via="identity")
        return Principal(sub=sub, kind="operator", scopes=frozenset({SCOPE_READ}), via="identity")

    raise Unauthenticated()


def current_principal(request: Request) -> Principal:
    return _resolve(request)


def require_scope(scope: str) -> Callable[[Request], Principal]:
    """Dependency factory for read / sandbox scopes (non-destructive). ``gateway:execute`` is
    validated by the FULL §8 holder path in :func:`validate_execute_holder`, never here."""

    def _dep(principal: Principal = Depends(current_principal)) -> Principal:
        # Grant-time exclusion (§10 G2): sandbox and execute are never held together; refuse
        # structurally even if a token somehow carried both.
        if SCOPE_SANDBOX in principal.scopes and SCOPE_EXECUTE in principal.scopes:
            raise Forbidden(
                "gateway:sandbox and gateway:execute are never grantable to the same principal.",
                code="insufficient_scope",
            )
        if not principal.has(scope):
            raise Forbidden(f"missing required scope {scope!r}.", code="insufficient_scope")
        return principal

    return _dep


require_read = require_scope(SCOPE_READ)
require_sandbox = require_scope(SCOPE_SANDBOX)


# ---------------------------------------------------------------------------
# §8 holder-token validation for gateway:execute (destructive-exec). Check 0. VERBATIM.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class ExecutorContext:
    principal: Principal
    live: LiveCheckResult  # carries checked_at for the D=1s drift bound at the dispatch instant


class HolderRejected(Exception):
    def __init__(self, message: str, code: str = "holder_rejected") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def validate_execute_holder(request: Request) -> ExecutorContext:
    """The auth §8 validation algorithm for an inbound ``gateway:execute`` call, verbatim.

    Steps 1-4 (parse/kid/iss/exp/aud) by ``validate_access_token``; here the holder extras:
    scope+audience↔holder binding, mandatory ``cnf`` DPoP proof, and the destructive-exec
    LIVE check (pushed denylist AND uncached introspect, ~250ms → DENY). Step 8 drift is
    re-checked at the dispatch instant by the dispatcher, using ``ctx.live.checked_at``.
    """
    settings: Settings = request.app.state.settings
    keyring: KeyRing = request.app.state.keyring
    now = int(time.time())

    authz = (request.headers.get("authorization") or "").strip()
    if not authz.startswith("Bearer "):
        raise HolderRejected("gateway:execute requires a Bearer holder token (§8).", "unauthenticated")
    token = authz[len("Bearer "):].strip()
    try:
        header, claims = validate_access_token(
            token, keyring,
            expected_iss=settings.auth_issuer,
            expected_aud=settings.auth_audience,   # step 4: aud == self (gateway), single-valued
            now=now, leeway_s=settings.auth_clock_skew_seconds,  # step 3
        )
    except TokenError as exc:
        raise HolderRejected(f"invalid holder token: {exc.message}", "invalid_token") from exc

    sub = str(claims.get("sub", ""))
    scopes = set(str(claims.get("scope", "")).split())

    # Step 5: scope contains the holder scope AND the audience↔holder binding holds
    # (gateway:execute honored ONLY when aud == gateway — already checked == self).
    if SCOPE_EXECUTE not in scopes:
        raise HolderRejected("missing gateway:execute holder scope.", "insufficient_scope")
    # Grant-time exclusion (§10 G2): execute + sandbox never coexist.
    if SCOPE_SANDBOX in scopes:
        raise HolderRejected("gateway:execute and gateway:sandbox are never granted together.", "insufficient_scope")

    # Step 6: mandatory cnf sender-constraining proof. No proof, no validity.
    cnf = claims.get("cnf")
    if not isinstance(cnf, dict) or not (cnf.get("jkt") or cnf.get("x5t#S256")):
        raise HolderRejected("holder token has no cnf sender-constraining binding.", "invalid_token")
    jkt = cnf.get("jkt")
    if jkt:
        proof = request.headers.get("dpop")
        if not proof:
            raise HolderRejected("cnf.jkt present but no DPoP proof header supplied.", "invalid_token")
        htu = str(request.url).split("?")[0]
        try:
            verify_dpop(proof, expected_jkt=jkt, htm=request.method, htu=htu, now=now)
        except DPoPError as exc:
            raise HolderRejected(f"DPoP proof rejected: {exc.message}", "invalid_token") from exc
    else:
        # mTLS fallback: compare cnf.x5t#S256 against a proxy-forwarded client-cert thumbprint.
        presented = request.headers.get("x-client-cert-thumbprint")
        if not presented or presented != cnf.get("x5t#S256"):
            raise HolderRejected("mTLS cnf thumbprint not presented/verified.", "invalid_token")

    # Step 7: destructive-exec LIVE check (pushed denylist AND uncached introspect), fail-closed.
    live = live_check_destructive(settings, jti=str(claims.get("jti", "")), sub=sub, kid=str(header.get("kid", "")))
    if not live.ok:
        raise HolderRejected(f"destructive-exec live check failed: {live.reason}", "revoked")

    principal = Principal(
        sub=sub, kind=kind_from_sub(sub), scopes=frozenset(scopes), via="bearer",
        jti=claims.get("jti"), kid=header.get("kid"), cnf_jkt=jkt,
    )
    return ExecutorContext(principal=principal, live=live)
