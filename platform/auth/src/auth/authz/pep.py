"""auth.authz.pep — the local Policy Enforcement Point (PLAN §5.1).

The PEP is the fast, offline Tier-1 gate that lives inline in EVERY resource
server's MCP/API layer. It runs the §5.1 decision sequence per call and fails at
the first failure:

  1. Bearer present & well-formed.
  2. Signature vs auth JWKS (respect kid; reject any kid NOT in the currently
     served JWKS — Redis-independent global kill, finding 2a).
  3. iss == the single auth issuer (RFC 9207).
  4. exp/nbf within <=60s skew.
  5. aud == THIS resource (no wildcard) — the on-the-wire anti-replay boundary.
  6. Coarse scope for the invoked tool present (§5.5) — THE ONLY place a *valid*
     token is rejected for permission => 403 insufficient_scope.
  7. DPoP/cnf proof matches.
  8. Route to the Tier-2 PDP if the tool is PDP-gated (§5.2); else fast-path allow.

Steps 2-5 and 7 are cryptographic token validation — the job of the token
subsystem (`auth.tokens`, a sibling package integration wires in). To keep the
PEP independently testable and its ownership clean, that work is injected behind
the `TokenValidator` seam; the PEP OWNS steps 1, 6 and 8 (the authz decision) and
the 401-vs-403 wire semantics (§5.6).

401 = unauthenticated / invalid / revoked token -> re-mint (WWW-Authenticate:
Bearer). 403 insufficient_scope = valid token, missing capability -> step-up. A
PDP policy deny is a DISTINCT terminal 403 (see pdp.py) and MUST NOT be
signalled as insufficient_scope (which would invite scope-widening, §5.6).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol, runtime_checkable

from ..core.tokens_model import AccessTokenClaims
from . import scope_tool_map as STM

# Routing outcomes.
ROUTE_FAST_PATH = "fast_path"   # Tier-1 allow — execute now
ROUTE_PDP = "pdp"               # Tier-2 — caller MUST call the PDP before executing
ROUTE_DENY = "deny"             # rejected at the PEP

# PEP-level error codes (map to the wire per §5.6).
ERR_INVALID_TOKEN = "invalid_token"          # 401
ERR_INSUFFICIENT_SCOPE = "insufficient_scope"  # 403 (scope hint)
ERR_UNKNOWN_TOOL = "unknown_tool"            # 403 fail-closed (unclassified, §4.7)
ERR_PROOF_MISMATCH = "invalid_dpop_proof"    # 401 (sender-constraining, §4.5)


@runtime_checkable
class TokenValidator(Protocol):
    """Steps 2-5 & 7 of §5.1 — the cryptographic token validation seam.

    `auth.tokens` implements this at integration (JWKS signature incl. the
    kid-in-current-JWKS check, iss, exp/nbf skew, aud==expected, cnf/DPoP). It
    MUST RAISE on ANY failure (invalid signature, retired kid, wrong iss, expired,
    wrong aud, bad/missing DPoP proof); the PEP maps a raise to a 401. It MUST NOT
    return claims for an invalid token.
    """
    def validate(self, token: str, *, expected_aud: str, now: Optional[int] = None,
                 dpop_proof: Optional[str] = None) -> AccessTokenClaims:
        ...


@dataclass(frozen=True)
class PEPOutcome:
    """The PEP's verdict for one call."""
    route: str                              # ROUTE_FAST_PATH | ROUTE_PDP | ROUTE_DENY
    http_status: Optional[int]              # 200 fast-path allow; 401/403 deny; None if PDP-pending
    error: Optional[str] = None             # PEP error code on deny
    www_authenticate: Optional[str] = None  # header value on 401/403 (§5.1, §5.6)
    required_scope: Optional[str] = None     # scope hint on insufficient_scope
    claims: Optional[AccessTokenClaims] = None
    action_id: Optional[str] = None         # canonical PDP action id when route==PDP

    @property
    def allowed_fast_path(self) -> bool:
        return self.route == ROUTE_FAST_PATH


class PEP:
    """Tier-1 local enforcement for one resource server (one audience).

    `audience` is this RS's own audience (aud==self, §5.1 step 5) — the validator
    is told to require exactly this audience, so a token minted for another app is
    rejected here (401), never honoured.
    """

    def __init__(self, audience: str, validator: TokenValidator, *,
                 resource_metadata_url: Optional[str] = None) -> None:
        self._aud = audience
        self._validator = validator
        self._rmd = resource_metadata_url or f"https://{audience}/.well-known/oauth-protected-resource"

    # -- the §5.1 sequence -------------------------------------------------
    def authorize(self, authorization_header: Optional[str], tool: str, *,
                  now: Optional[int] = None, dpop_proof: Optional[str] = None) -> PEPOutcome:
        # STEP 1 — Bearer present & well-formed.
        token = _extract_bearer(authorization_header)
        if token is None:
            return self._unauthenticated(ERR_INVALID_TOKEN)

        # STEPS 2-5, 7 — cryptographic validation (injected). expected_aud pins
        # aud==self; the validator also enforces the kid-in-current-JWKS kill,
        # iss, exp/nbf skew, and the DPoP/cnf proof. Any failure => 401.
        try:
            claims = self._validator.validate(
                token, expected_aud=self._aud, now=now, dpop_proof=dpop_proof
            )
        except Exception:  # noqa: BLE001 — any validation failure is a 401 (fail-closed)
            return self._unauthenticated(ERR_INVALID_TOKEN)

        # Resolve the tool -> §5.5 rule. Unclassified tool => fail closed (§4.7).
        rule = STM.rule_for(tool)
        if rule is None:
            return PEPOutcome(
                route=ROUTE_DENY, http_status=403, error=ERR_UNKNOWN_TOOL, claims=claims,
            )

        # STEP 6 — coarse scope for the invoked tool. THE only place a valid token
        # is rejected for *permission* => 403 insufficient_scope, with a scope hint.
        missing = rule.required_scopes - set(claims.scope)
        if missing:
            required = sorted(missing)[0]
            return PEPOutcome(
                route=ROUTE_DENY,
                http_status=403,
                error=ERR_INSUFFICIENT_SCOPE,
                www_authenticate=f'Bearer error="insufficient_scope", scope="{required}"',
                required_scope=required,
                claims=claims,
            )

        # STEP 8 — route. PDP-gated tools MUST additionally clear the Tier-2 PDP
        # before executing; the PEP does not itself permit them.
        if rule.pdp_gated:
            return PEPOutcome(
                route=ROUTE_PDP, http_status=None, claims=claims, action_id=rule.action_id,
            )

        # Fast-path allow (§5.1): valid token, correct aud, coarse scope present,
        # not PDP-gated. Max exposure is one TTL (accepted, §4.7).
        return PEPOutcome(route=ROUTE_FAST_PATH, http_status=200, claims=claims)

    # -- helpers -----------------------------------------------------------
    def _unauthenticated(self, error: str) -> PEPOutcome:
        # 401 with WWW-Authenticate: Bearer + resource_metadata so a freshly
        # spawned agent can bootstrap (401 -> discover auth -> mint -> retry, §5.1).
        return PEPOutcome(
            route=ROUTE_DENY,
            http_status=401,
            error=error,
            www_authenticate=f'Bearer resource_metadata="{self._rmd}"',
        )


def _extract_bearer(authorization_header: Optional[str]) -> Optional[str]:
    """Parse `Authorization: Bearer <token>` (scheme case-insensitive). None if
    absent/malformed/empty."""
    if not authorization_header or not isinstance(authorization_header, str):
        return None
    parts = authorization_header.strip().split(None, 1)
    if len(parts) != 2:
        return None
    scheme, token = parts
    if scheme.lower() != "bearer" or not token.strip():
        return None
    return token.strip()
