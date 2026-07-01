"""auth.crypto.signer_hmac — stdlib HS256 TEST-signer (implements Signer).

Symmetric HMAC-SHA256 over the JWT signing input. Pure stdlib (hmac + hashlib),
so it runs GREEN in the sandbox and lets the test suite exercise EVERY piece of
token logic without any external crypto dependency.

WHY THIS IS A TEST-SIGNER, NOT PRODUCTION (honesty, per the build brief):
  * HS256 is SYMMETRIC — the same secret signs and verifies. It CANNOT be
    published in a JWKS for offline RS validation (that would leak the signing
    secret to every RS). Production MUST use the asymmetric EdDSA/ES256 signer
    (auth.crypto.signer_eddsa), where auth holds the private half and RSes hold
    only the public half via JWKS.
  * It is here to prove the TOKEN LOGIC (claim assembly, aud/exp/jti/kid/cnf
    handling, revocation checks, tamper detection) is correct — the logic is
    signer-agnostic. Swapping in the EdDSA signer is a config swap; the token
    logic under test does not change.
"""
from __future__ import annotations

import hashlib
import hmac


class HMACSigner:
    """HS256 Signer. Symmetric secret; test/dev use ONLY."""

    def __init__(self, secret: bytes, kid: str) -> None:
        if not isinstance(secret, (bytes, bytearray)):
            raise TypeError("HMACSigner secret must be bytes")
        if len(secret) < 32:
            # HS256 with < 256-bit keys is weak; even for a test-signer, refuse.
            raise ValueError("HMACSigner secret must be >= 32 bytes (256 bits)")
        self._secret = bytes(secret)
        self._kid = kid

    @property
    def kid(self) -> str:
        return self._kid

    @property
    def alg(self) -> str:
        return "HS256"

    def sign(self, signing_input: bytes) -> bytes:
        if not isinstance(signing_input, (bytes, bytearray)):
            raise TypeError("signing_input must be bytes")
        return hmac.new(self._secret, bytes(signing_input), hashlib.sha256).digest()

    def verify(self, signing_input: bytes, signature: bytes) -> bool:
        expected = self.sign(signing_input)
        # Constant-time comparison — never a short-circuit ==.
        return hmac.compare_digest(expected, bytes(signature))
