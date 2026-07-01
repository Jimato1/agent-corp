"""auth.core.tokens_model — token/claim dataclasses (PLAN §4.3, §8.7).

Pure value objects for the two signed artifacts auth mints:
  * AccessTokenClaims  — the RFC 9068 `at+jwt` access token (§4.3), audience-bound.
  * IdentityHeaderClaims — the signed X-Auth-Identity header the forward-auth
    verify endpoint sets on 200 (§8.7), signed by a DISTINCT key from the access
    token key.

No signing here — that is the Signer's job (auth.crypto). No validation policy
here — that is the PEP/PDP's job. These just pin the claim SHAPE so the minter,
the RS validators, and the tests all agree on one structure.

Design note: `aud` is EXACTLY ONE resource (decision #4, RFC 8707). It is typed
as `str`, never a list — one token, one audience. A minter that tries to set
multiple audiences is a bug the type makes obvious.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, FrozenSet, List, Optional, Tuple


# JOSE header typ values.
TYP_ACCESS_TOKEN = "at+jwt"        # RFC 9068
TYP_IDENTITY_HEADER = "identity+jwt"   # auth's forward-auth X-Auth-Identity (§8.7)

# Principal type as it appears in the identity header (§8.7).
PRINCIPAL_TYPE_HUMAN = "human"
PRINCIPAL_TYPE_AGENT = "agent"


@dataclass(frozen=True)
class JOSEHeader:
    """The protected JOSE header. `kid` selects the signing key; `alg` the algorithm."""
    alg: str
    kid: str
    typ: str = TYP_ACCESS_TOKEN


@dataclass(frozen=True)
class Confirmation:
    """RFC 7800 `cnf` sender-constraining claim (PLAN §4.5).

    Exactly one of jkt (DPoP, RFC 9449) / x5t_s256 (mTLS, RFC 8705) is set for an
    agent token. Absent for human browser-origin-bound tokens (not required v1).
    """
    jkt: Optional[str] = None            # DPoP JWK thumbprint  -> serialized as cnf.jkt
    x5t_s256: Optional[str] = None       # mTLS cert thumbprint -> serialized as cnf["x5t#S256"]

    def as_claim(self) -> Dict[str, str]:
        out: Dict[str, str] = {}
        if self.jkt is not None:
            out["jkt"] = self.jkt
        if self.x5t_s256 is not None:
            out["x5t#S256"] = self.x5t_s256
        return out

    def is_bound(self) -> bool:
        return self.jkt is not None or self.x5t_s256 is not None


@dataclass
class AccessTokenClaims:
    """RFC 9068 `at+jwt` claim set (PLAN §4.3).

    iss  — RS MUST verify == the single auth issuer (RFC 9207 issuer-id adopted now).
    sub  — stable, audit-canonical; MAY == client_id.
    aud  — EXACTLY ONE resource; RS MUST verify == self (no wildcard).
    scope — coarse capability only (the tool SURFACE); no fine-grained/SoD/budget facts.
    jti  — surgical single-token revocation key.
    cnf  — DPoP jkt / mTLS x5t#S256 (agents).
    kill_epoch — the current kill-switch epoch signed in (§7.3, Redis-independent).
    """
    iss: str
    sub: str
    aud: str                                   # EXACTLY ONE — never a list
    scope: FrozenSet[str]                      # coarse capability set
    iat: int                                   # unix seconds
    exp: int                                   # unix seconds
    jti: str
    client_id: Optional[str] = None            # agent; key for client/key-level revocation
    cnf: Optional[Confirmation] = None         # sender-constraining
    kill_epoch: int = 0                        # monotonic kill-switch epoch (§7.3)
    kill_level: str = "G0"                     # G0 | G1 | G2 (§7.2)
    auth_time: Optional[int] = None            # human step-up (fresh auth)
    # W3C traceparent is propagated alongside (NOT a JWT claim) — see IdentityHeaderClaims.

    def __post_init__(self) -> None:
        if isinstance(self.aud, (list, tuple, set, frozenset)):
            raise ValueError(
                "AccessTokenClaims.aud must be EXACTLY ONE resource (decision #4, "
                "RFC 8707) — got a collection. One token, one audience."
            )
        self.scope = frozenset(self.scope)
        if self.exp <= self.iat:
            raise ValueError("token exp must be after iat")

    def scope_str(self) -> str:
        """OAuth space-delimited scope string (sorted for determinism)."""
        return " ".join(sorted(self.scope))

    def to_payload(self) -> Dict[str, object]:
        """The JWT payload dict (claim names on the wire)."""
        payload: Dict[str, object] = {
            "iss": self.iss,
            "sub": self.sub,
            "aud": self.aud,
            "scope": self.scope_str(),
            "iat": self.iat,
            "exp": self.exp,
            "jti": self.jti,
            "kill_epoch": self.kill_epoch,
            "kill_level": self.kill_level,
        }
        if self.client_id is not None:
            payload["client_id"] = self.client_id
        if self.cnf is not None and self.cnf.is_bound():
            payload["cnf"] = self.cnf.as_claim()
        if self.auth_time is not None:
            payload["auth_time"] = self.auth_time
        return payload


@dataclass
class IdentityHeaderClaims:
    """The signed X-Auth-Identity JWT set on 200 by the verify endpoint (PLAN §8.7).

    Signed by a DISTINCT key from the access-token AS key (separate rotation/kid).
    The backend cryptographically verifies signature + aud before trusting any claim.

    traceparent here is the AUTHORITATIVE, SERVER-MINTED value bound to the
    validated sub (finding 5f). Any client-supplied traceparent is recorded ONLY
    as claimed_parent, never as the attribution key.
    """
    iss: str
    sub: str
    principal_type: str                        # human | agent (§8.7)
    aud: str                                    # app selected by X-Forwarded-Host
    roles: FrozenSet[str]
    iat: int
    exp: int
    jti: str
    kill_epoch: int                            # current kill epoch (§7.3)
    kill_level: str                            # G0 | G1 | G2
    traceparent: str                           # AUTHORITATIVE, server-minted, bound to sub
    client_id: Optional[str] = None
    claimed_parent: Optional[str] = None       # untrusted client traceparent (audit only)

    def __post_init__(self) -> None:
        if self.principal_type not in (PRINCIPAL_TYPE_HUMAN, PRINCIPAL_TYPE_AGENT):
            raise ValueError(
                f"principal_type must be {PRINCIPAL_TYPE_HUMAN!r} or {PRINCIPAL_TYPE_AGENT!r}"
            )
        if isinstance(self.aud, (list, tuple, set, frozenset)):
            raise ValueError("IdentityHeaderClaims.aud must be exactly one resource")
        self.roles = frozenset(self.roles)

    def to_payload(self) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "iss": self.iss,
            "sub": self.sub,
            "principal_type": self.principal_type,
            "aud": self.aud,
            "roles": sorted(self.roles),
            "iat": self.iat,
            "exp": self.exp,
            "jti": self.jti,
            "kill_epoch": self.kill_epoch,
            "kill_level": self.kill_level,
            "traceparent": self.traceparent,
        }
        if self.client_id is not None:
            payload["client_id"] = self.client_id
        if self.claimed_parent is not None:
            payload["claimed_parent"] = self.claimed_parent
        return payload
