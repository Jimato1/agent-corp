"""Verdict-token signing (cmdb-gateway-verdict-token.md §1/§2) — the CMDB-local Ed25519 key.

The binding response of ``POST /v1/decision`` is a JWS, ``typ: cmdb-verdict+jws``, signed
with a **CMDB-LOCAL key, deliberately NOT auth's key** — the policy veto must not share a
trust root with the identity plane. The public key is served at ``GET /v1/verdict-jwks``;
the Gateway pins acceptance to keys from that endpoint and never accepts a verdict signed
by auth's identity keys.

``aud`` is set from the AUTHENTICATED caller (the anti-relay property, §3): only
``svc:gateway`` (→ ``gateway``) and ``svc:tier-approver`` (→ ``board``) get a signed
token; any other caller gets the unsigned advisory JSON. ``exp`` = ``valid_until`` with
zero-clock-skew validation on the Gateway side (§4 step 4).
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from ..authn.jwks import b64u_encode

_UTC = timezone.utc


def _epoch(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())


def _b64u_json(obj: dict) -> str:
    return b64u_encode(json.dumps(obj, separators=(",", ":"), sort_keys=True).encode("utf-8"))


class VerdictSigner:
    def __init__(self, key_path: Path, kid: str) -> None:
        self.kid = kid
        self._key = self._load_or_create(Path(key_path))
        self._pub = self._key.public_key()

    @staticmethod
    def _load_or_create(path: Path) -> Ed25519PrivateKey:
        if path.is_file():
            data = path.read_bytes()
            return serialization.load_pem_private_key(data, password=None)  # type: ignore[return-value]
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

    def sign_verdict(self, claims_struct: dict, *, aud: str, req_nonce: str | None) -> str:
        """Return a compact JWS over the §3.2 struct + the envelope claims (verdict-token §1)."""
        header = {"alg": "EdDSA", "typ": "cmdb-verdict+jws", "kid": self.kid}
        claims = dict(claims_struct)  # the full §3.2 struct (ISO strings retained)
        claims["iss"] = "cmdb"
        claims["jti"] = claims_struct["decision_id"]
        claims["aud"] = aud
        claims["exp"] = _epoch(claims_struct["valid_until"])
        claims["iat"] = _epoch(claims_struct["evaluated_at"])
        if req_nonce:
            claims["nonce"] = req_nonce
        signing_input = f"{_b64u_json(header)}.{_b64u_json(claims)}".encode("ascii")
        sig = self._key.sign(signing_input)
        return f"{signing_input.decode('ascii')}.{b64u_encode(sig)}"
