"""auth.crypto.signer_eddsa — the PRODUCTION EdDSA (Ed25519) signer.

CANNOT-VERIFY-HERE: this signer requires the third-party 'cryptography' package
(libsodium/OpenSSL-backed Ed25519), which is NOT guaranteed installed in the
Stage-4 sandbox. It is the production signer for auth's access tokens and the
distinct X-Auth-Identity header key (§8.7).

HONESTY CONTRACT (build brief): if 'cryptography' is absent, construction raises
a LOUD RuntimeError naming the exact install command. It NEVER falls back to a
fake/silent/HMAC signature — a security component that silently degrades its
signing primitive is worse than one that refuses to start.

TO CLOSE THIS CANNOT-VERIFY-HERE, the operator/CI runs (build host with network):
    python -m pip install "cryptography>=42"
then re-runs the EdDSA round-trip test:
    cd platform/auth/src && python -m unittest auth.tests.test_foundation -v
(the EdDSA test is skipped automatically when 'cryptography' is unavailable, and
executes for real once it is installed).

Key handling in prod:
  * auth generates/holds the PRIVATE Ed25519 key (or it is TPM/HSM-sealed).
  * The PUBLIC half is published in the JWKS (kty=OKP, crv=Ed25519) for offline
    RS validation. The access-token key and the X-Auth-Identity key are DISTINCT
    keys with separate kids and rotation (§8.7).
"""
from __future__ import annotations

from typing import Optional

_IMPORT_ERROR: Optional[Exception] = None
try:  # pragma: no cover - availability depends on the build host
    from cryptography.hazmat.primitives.asymmetric.ed25519 import (
        Ed25519PrivateKey,
        Ed25519PublicKey,
    )
    from cryptography.exceptions import InvalidSignature

    _HAVE_CRYPTOGRAPHY = True
except Exception as exc:  # ImportError, or a broken partial install
    _HAVE_CRYPTOGRAPHY = False
    _IMPORT_ERROR = exc


_PIP_HINT = (
    "The production EdDSA signer requires the 'cryptography' package. "
    "Install it on the build host: python -m pip install \"cryptography>=42\". "
    "This signer NEVER fakes a signature — refusing to start."
)


def cryptography_available() -> bool:
    """True iff the asymmetric primitive is importable (so tests can skip cleanly)."""
    return _HAVE_CRYPTOGRAPHY


class EdDSASigner:
    """Ed25519 Signer implementing auth.core.interfaces.Signer.

    Raises RuntimeError at construction if 'cryptography' is unavailable — a loud,
    explicit failure, never a silent fallback.
    """

    def __init__(self, private_key: object, kid: str) -> None:
        if not _HAVE_CRYPTOGRAPHY:
            raise RuntimeError(f"{_PIP_HINT} (import error: {_IMPORT_ERROR!r})")
        if not isinstance(private_key, Ed25519PrivateKey):
            raise TypeError(
                "EdDSASigner requires a cryptography Ed25519PrivateKey; "
                "use EdDSASigner.generate() to make one"
            )
        self._sk: Ed25519PrivateKey = private_key
        self._pk: Ed25519PublicKey = private_key.public_key()
        self._kid = kid

    @classmethod
    def generate(cls, kid: str) -> "EdDSASigner":
        if not _HAVE_CRYPTOGRAPHY:
            raise RuntimeError(_PIP_HINT + f" (import error: {_IMPORT_ERROR!r})")
        return cls(Ed25519PrivateKey.generate(), kid)

    @property
    def kid(self) -> str:
        return self._kid

    @property
    def alg(self) -> str:
        return "EdDSA"

    def sign(self, signing_input: bytes) -> bytes:
        if not isinstance(signing_input, (bytes, bytearray)):
            raise TypeError("signing_input must be bytes")
        return self._sk.sign(bytes(signing_input))

    def verify(self, signing_input: bytes, signature: bytes) -> bool:
        try:
            self._pk.verify(bytes(signature), bytes(signing_input))
            return True
        except InvalidSignature:
            return False
        except Exception:
            return False

    def public_jwk(self) -> dict:
        """The public half as a JWK (kty=OKP, crv=Ed25519) for JWKS publication."""
        import base64

        raw = self._pk.public_bytes_raw()
        x = base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")
        return {"kty": "OKP", "crv": "Ed25519", "x": x, "kid": self._kid, "alg": "EdDSA", "use": "sig"}
