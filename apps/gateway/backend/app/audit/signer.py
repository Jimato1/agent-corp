"""Audit-chain signing key — the Gateway-LOCAL Ed25519 key (§9).

Signs: every audit record's ``record_hash``, every chain HEAD checkpoint anchored to MC
(seam #25), and the ``/api/halt-status`` tuple auth reads directly as the sole L2-CONFIRMED
source. Key custody (host-mounted file vs TPM) is O1 — a Stage-5 secret-material-DR decision;
here it is a file readable only by the app user, **not** in the image (config
``GATEWAY_SIGNING_KEY_FILE``), auto-generated on first boot for an isolated build.
"""
from __future__ import annotations

from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from ..authn.jwks import b64u_encode


class AuditSigner:
    def __init__(self, key_path: Path, kid: str) -> None:
        self.kid = kid
        self._key = self._load_or_create(Path(key_path))
        self._pub = self._key.public_key()

    @staticmethod
    def _load_or_create(path: Path) -> Ed25519PrivateKey:
        if path.is_file():
            return serialization.load_pem_private_key(path.read_bytes(), password=None)  # type: ignore[return-value]
        key = Ed25519PrivateKey.generate()
        path.parent.mkdir(parents=True, exist_ok=True)
        pem = key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        path.write_bytes(pem)
        try:
            path.chmod(0o600)
        except OSError:
            pass
        return key

    def sign(self, data: bytes) -> str:
        return b64u_encode(self._key.sign(data))

    def verify(self, data: bytes, sig_b64u: str) -> bool:
        from cryptography.exceptions import InvalidSignature

        from ..authn.jwks import b64u_decode

        try:
            self._pub.verify(b64u_decode(sig_b64u), data)
            return True
        except InvalidSignature:
            return False

    def public_x(self) -> str:
        raw = self._pub.public_bytes(
            encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw
        )
        return b64u_encode(raw)

    def jwks(self) -> dict:
        return {"keys": [{
            "kty": "OKP", "crv": "Ed25519", "use": "sig", "alg": "EdDSA",
            "kid": self.kid, "x": self.public_x(),
        }]}
