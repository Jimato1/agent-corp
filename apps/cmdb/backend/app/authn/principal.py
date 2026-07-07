"""Principal resolution + scope gates (auth-apps-tokens-scopes.md §1/§8; PLAN §6.1/§7.1).

The `cmdb` scope slice (this app's countersign, PLAN §7.1):

* ``cmdb:read-policy``  — all read tools + POST /v1/decision + host-facts + registries.
  Grantable to all agent roles + operator + ``svc:tier-approver`` + ``svc:gateway`` +
  ``svc:library``. Read; never mutates.
* ``cmdb:write-policy`` — HOLDER scope, **human operator principals ONLY** (auth compiled
  kind-gate). Every policy/registry/bind/sandbox/break-glass mutation. sod-critical.
* ``cmdb:manage``       — non-holder, human-only, write-benign (sync-trigger, drift-ack,
  resend, sandbox-disable).

Two credential paths, both cryptographically verified — never trusted off a raw header:

* ``Authorization: Bearer <at+jwt>`` — agent/service path (scopes from the audience-bound
  token). AND the §8 holder path for writes (Bearer at+jwt + DPoP proof).
* ``X-Auth-Identity`` — the operator browser path (proxy-injected on 200), full read +
  ``cmdb:manage``. Policy WRITES additionally require a §8 holder token (the step-up).

**Defense in depth for "agents never write policy" (PLAN §6.1/§7.2), held four ways:**
(1) auth kind-gate — no machine principal can mint ``cmdb:write-policy``; (2) this §8
holder validation with mandatory ``cnf`` + live check; (3) principal-class rejection by
construction — the write path refuses any non-``op:*`` ``sub`` even if it somehow carried
the scope; (4) the agent MCP server contains ZERO mutation verbs (structural absence).
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
from .livecheck import LiveCheckResult, live_check_sod_critical

SCOPE_READ = "cmdb:read-policy"
SCOPE_WRITE = "cmdb:write-policy"   # HOLDER, human-only, sod-critical
SCOPE_MANAGE = "cmdb:manage"        # non-holder, human-only, write-benign

_OPERATOR_SCOPES = frozenset({SCOPE_READ, SCOPE_MANAGE})
_AGENT_KINDS = frozenset({"agent", "service"})


def kind_from_sub(sub: str) -> str:
    if sub.startswith("agent:"):
        return "agent"
    if sub.startswith("svc:"):
        return "service"
    if sub.startswith(("op:", "operator:")):
        return "operator"
    return "operator"  # a human session with an unprefixed sub is the operator


# The verdict token's `aud` is set from the AUTHENTICATED caller identity (verdict-token
# §3, the anti-relay property). A tier-approver read can never mint a Gateway-redeemable
# permit; only a caller mapping to a concrete audience gets a SIGNED token at all.
_AUD_BY_CALLER: dict[str, str] = {
    "svc:gateway": "gateway",
    "svc:tier-approver": "board",
}


def audience_for_caller(sub: str) -> str | None:
    """Return the verdict-token audience for this caller, or None (=> unsigned advisory)."""
    return _AUD_BY_CALLER.get(sub)


@dataclass(frozen=True)
class Principal:
    sub: str
    kind: str  # agent | service | operator
    scopes: frozenset[str]
    via: str = "bearer"  # bearer | identity
    jti: str | None = None
    kid: str | None = None
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

    # 2) X-Auth-Identity (operator browser path): full read + manage.
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
        return Principal(sub=sub, kind="operator", scopes=_OPERATOR_SCOPES, via="identity")

    raise Unauthenticated()


def current_principal(request: Request) -> Principal:
    return _resolve(request)


def require_scope(scope: str) -> Callable[[Request], Principal]:
    """Dependency factory for read / manage scopes. ``cmdb:manage`` additionally bars
    agent/service kinds (human-only), belt-and-suspenders over auth's grant-time gate."""

    def _dep(principal: Principal = Depends(current_principal)) -> Principal:
        if scope == SCOPE_MANAGE and principal.kind in _AGENT_KINDS:
            raise Forbidden(
                f"{scope} is operator-only; principal kind {principal.kind!r} is barred.",
                code="insufficient_scope",
            )
        if not principal.has(scope):
            raise Forbidden(f"missing required scope {scope!r}.", code="insufficient_scope")
        return principal

    return _dep


require_read = require_scope(SCOPE_READ)
require_manage = require_scope(SCOPE_MANAGE)


# ---------------------------------------------------------------------------
# §8 holder-token validation for cmdb:write-policy (sod-critical). VERBATIM.
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class HolderContext:
    principal: Principal
    live: LiveCheckResult  # carries checked_at for the D=1s drift bound at the commit instant


class HolderRejected(Exception):
    def __init__(self, message: str, code: str = "holder_rejected") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def validate_holder_write(request: Request) -> HolderContext:
    """The auth §8 validation algorithm for an inbound ``cmdb:write-policy`` call, verbatim.

    Steps 1-4 (parse/kid/iss/exp/aud) are done by ``validate_access_token``; here we add
    the holder extras: scope+audience↔holder binding, mandatory ``cnf`` DPoP proof, the
    principal-class (human-only) defense, and the sod-critical LIVE denylist check.
    """
    settings: Settings = request.app.state.settings
    keyring: KeyRing = request.app.state.keyring
    now = int(time.time())

    authz = (request.headers.get("authorization") or "").strip()
    if not authz.startswith("Bearer "):
        raise HolderRejected("cmdb:write-policy requires a Bearer holder token (§8).", "unauthenticated")
    token = authz[len("Bearer "):].strip()
    try:
        header, claims = validate_access_token(
            token, keyring,
            expected_iss=settings.auth_issuer,
            expected_aud=settings.auth_audience,     # step 4: aud == self (cmdb), single-valued
            now=now, leeway_s=settings.auth_clock_skew_seconds,  # step 3
        )
    except TokenError as exc:
        raise HolderRejected(f"invalid holder token: {exc.message}", "invalid_token") from exc

    sub = str(claims.get("sub", ""))
    scopes = set(str(claims.get("scope", "")).split())

    # Step 5: scope contains the holder scope AND the audience↔holder binding holds
    # (cmdb:write-policy honored ONLY when aud == cmdb — already checked == self).
    if SCOPE_WRITE not in scopes:
        raise HolderRejected("missing cmdb:write-policy holder scope.", "insufficient_scope")

    # Defense-in-depth (3): principal-class rejection by construction — human-only.
    # A holder token from a machine principal cannot exist (auth kind-gate), but we refuse
    # any non-op:* sub structurally rather than trusting absence-of-scope alone.
    if kind_from_sub(sub) != "operator" or not sub.startswith(("op:", "operator:")):
        raise HolderRejected(
            f"cmdb:write-policy is human-only; principal {sub!r} is not an operator.", "insufficient_scope"
        )

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

    # Step 7: sod-critical LIVE denylist check (never skipped, never cached), fail-closed.
    live = live_check_sod_critical(settings, jti=str(claims.get("jti", "")), sub=sub, kid=str(header.get("kid", "")))
    if not live.ok:
        raise HolderRejected(f"sod-critical live check failed: {live.reason}", "revoked")

    principal = Principal(
        sub=sub, kind="operator", scopes=frozenset(scopes), via="bearer",
        jti=claims.get("jti"), kid=header.get("kid"), cnf_jkt=jkt,
    )
    return HolderContext(principal=principal, live=live)


def drift_ok(live: LiveCheckResult, *, now: float | None = None, bound_s: float = 1.0) -> bool:
    """§8 step 8: at the irreversible instant, the live check must be < D=1s old."""
    now = time.time() if now is None else now
    return (now - live.checked_at) <= bound_s
