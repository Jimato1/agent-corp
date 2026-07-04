"""library.authz.rs — the RS middleware (auth §1). Principal → scope → kind → budget.

Principal is derived ONLY from a validated bearer token or a verified X-Auth-Identity
signature — NEVER an advisory/forwarded header (auth §8.6 Rule 3). Enforces:
  * coarse scope per tool/op (403 insufficient_scope + hint)
  * the human-kind gate on library:admin (403 kind_gate, never-retry) — F11
  * DPoP presence when the token is cnf-bound and DPoP is required
  * budget middleware (429) — Library has no fail-closed path (no sod/destructive op)

On a missing/invalid token the 401 carries WWW-Authenticate with resource_metadata so
a fresh agent bootstraps (RFC 9728): 401 → discover → mint audience-bound token → retry.
"""
from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass, field
from typing import Optional

from .. import ids
from ..errors import InsufficientScope, KindGateViolation, Unauthenticated
from . import scopes as S
from .jwks import JWKSCache, TokenVerifier, b64url_decode


@dataclass
class Principal:
    sub: str
    kind: str                      # agent | service | human
    scopes: frozenset = field(default_factory=frozenset)
    cnf_jkt: Optional[str] = None
    via: str = "token"             # token | identity_header | debug


class RSMiddleware:
    def __init__(self, config, *, verifier: Optional[TokenVerifier] = None):
        self.config = config
        self.jwks = None
        if config.signer_alg != "HS256":
            self.jwks = JWKSCache(config.auth_base, config.jwks_poll_s)
        self.verifier = verifier or TokenVerifier(
            signer_alg=config.signer_alg, at_secret=config.at_secret,
            audience=config.audience, issuer=config.issuer,
            clock_skew_s=config.clock_skew_s, jwks=self.jwks)

    def www_authenticate(self) -> str:
        return f'Bearer resource_metadata="{self.config.resource_metadata_url}"'

    # ── authentication ──────────────────────────────────────────────────────────
    def authenticate(self, headers: dict, *, now: Optional[float] = None) -> Principal:
        h = {k.lower(): v for k, v in headers.items()}

        # 1) verified X-Auth-Identity (auth-signed identity assertion, distinct key §8.7)
        xid = h.get("x-auth-identity")
        if xid:
            claims = self._verify_identity_header(xid, now)
            return self._principal_from_claims(claims, via="identity_header")

        # 2) bearer token (local validation)
        authz = h.get("authorization", "")
        if authz.startswith("Bearer "):
            token = authz[7:].strip()
            claims = self.verifier.verify(token, now=now)
            p = self._principal_from_claims(claims, via="token")
            # DPoP presence gate when cnf-bound and required
            if self.config.require_dpop and p.cnf_jkt and "dpop" not in h:
                raise Unauthenticated("DPoP proof required for cnf-bound token", code="invalid_token")
            return p

        # 3) debug principal — ONLY when explicitly enabled (in-proc dispatch tests)
        if self.config.allow_debug_principal and h.get("x-debug-sub"):
            sub = h["x-debug-sub"]
            sc = frozenset((h.get("x-debug-scopes", "")).split())
            return Principal(sub=sub, kind=ids.principal_kind(sub), scopes=sc, via="debug")

        raise Unauthenticated("missing bearer token", code="missing_token")

    def _verify_identity_header(self, xid: str, now) -> dict:
        # X-Auth-Identity is a compact JWS signed with auth's IDENTITY key (separate
        # from the access-token key). HS256 test regime verifies with id_secret.
        try:
            h_b64, p_b64, s_b64 = xid.split(".")
        except ValueError:
            raise Unauthenticated("malformed X-Auth-Identity", code="invalid_token")
        signing_input = f"{h_b64}.{p_b64}".encode()
        sig = b64url_decode(s_b64)
        if self.config.signer_alg == "HS256":
            expected = hmac.new(self.config.id_secret.encode(), signing_input, hashlib.sha256).digest()
            if not hmac.compare_digest(expected, sig):
                raise Unauthenticated("bad X-Auth-Identity signature", code="invalid_token")
            claims = json.loads(b64url_decode(p_b64))
        else:
            # production: verify against auth's JWKS identity key (cryptography)
            from ..crypto_verify import verify_jws
            header = json.loads(b64url_decode(h_b64))
            key = self.jwks.get(header.get("kid", ""), now or 0) if self.jwks else None
            if key is None or not verify_jws(header.get("alg"), key, signing_input, sig):
                raise Unauthenticated("bad X-Auth-Identity signature", code="invalid_token")
            claims = json.loads(b64url_decode(p_b64))
        if claims.get("aud") != self.config.audience:
            raise Unauthenticated("X-Auth-Identity audience mismatch", code="invalid_token")
        return claims

    def _principal_from_claims(self, claims: dict, *, via: str) -> Principal:
        sub = claims.get("sub", "")
        scope_val = claims.get("scope", "")
        sc = set(scope_val.split()) if isinstance(scope_val, str) else set(claims.get("scopes", []))
        cnf = claims.get("cnf") or {}
        return Principal(sub=sub, kind=ids.principal_kind(sub), scopes=frozenset(sc),
                         cnf_jkt=cnf.get("jkt"), via=via)

    # ── authorization ───────────────────────────────────────────────────────────
    def require(self, principal: Principal, op: str) -> str:
        """Enforce the scope + human-kind gate for a tool/operation. Returns the scope."""
        scope = S.scope_for_tool(op)
        if scope is None:
            # unclassified ⇒ fail closed (auth §1: never live-check by omission)
            raise InsufficientScope(f"operation {op} is unclassified", code="insufficient_scope")
        if scope not in principal.scopes:
            raise InsufficientScope(
                f"requires {scope}", code="insufficient_scope")
        if scope in S.HUMAN_KIND_REQUIRED and principal.kind != "human":
            # library:admin is human-principal-kind-gated — never an agent (F11)
            raise KindGateViolation(
                f"{scope} is operator-only (human principal kind); "
                f"principal kind={principal.kind} refused", code="kind_gate")
        return scope
