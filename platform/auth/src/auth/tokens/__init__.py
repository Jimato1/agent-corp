"""auth.tokens — token minting/validation, JWKS, DPoP, and revocation.

Phase-2 build (PLAN §4). Four modules over the frozen foundation
(auth.core / auth.store / auth.crypto + stdlib only):

  * jwt.py        — mint/validate RFC 9068 `at+jwt` via the Signer interface.
  * jwks.py       — serve/rotate/retire signing `kid`s; retiring a kid is the
                    Redis-INDEPENDENT kill lever (PLAN §4.2, §7.3).
  * dpop.py       — DPoP (RFC 9449) proof-check LOGIC (cnf.jkt binding, htm/htu/
                    iat window/nonce/replay/ath); the asymmetric signature
                    primitive delegates to a Signer and is CANNOT-VERIFY-HERE.
  * revocation.py — the live denylist consult (jti / sub+revoked_before / kid /
                    client_id) + the §4.7 fast-path-vs-live-check decision table
                    as a callable policy.

Everything security-critical here is pure-stdlib so it runs GREEN under
`python -m unittest auth.tests.test_tokens`. The only CANNOT-VERIFY-HERE seam is
the asymmetric signature PRIMITIVE (EdDSA/ES256), isolated behind the Signer.
"""
from __future__ import annotations

from .jwt import (
    TokenError,
    MalformedToken,
    InvalidSignature,
    TokenExpired,
    WrongAudience,
    WrongIssuer,
    UntrustedKid,
    AlgorithmMismatch,
    mint_access_token,
    validate_access_token,
    b64u_encode,
    b64u_decode,
)
from .jwks import KeyRing, JWKSEntry, STATUS_ACTIVE, STATUS_ROTATING, STATUS_RETIRED
from .dpop import (
    DPoPError,
    DPoPClaims,
    DPoPReplayCache,
    verify_dpop_proof,
    jwk_thumbprint,
)
from .revocation import (
    Enforcement,
    RevocationDecision,
    classify,
    consult_denylist,
    evaluate,
)

__all__ = [
    "TokenError",
    "MalformedToken",
    "InvalidSignature",
    "TokenExpired",
    "WrongAudience",
    "WrongIssuer",
    "UntrustedKid",
    "AlgorithmMismatch",
    "mint_access_token",
    "validate_access_token",
    "b64u_encode",
    "b64u_decode",
    "KeyRing",
    "JWKSEntry",
    "STATUS_ACTIVE",
    "STATUS_ROTATING",
    "STATUS_RETIRED",
    "DPoPError",
    "DPoPClaims",
    "DPoPReplayCache",
    "verify_dpop_proof",
    "jwk_thumbprint",
    "Enforcement",
    "RevocationDecision",
    "classify",
    "consult_denylist",
    "evaluate",
]
