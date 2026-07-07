"""DPoP proof-of-possession verification (RFC 9449) — the ``cnf`` sender-constraining
check the §8 pin makes MANDATORY on every holder-scope token.

A ``cmdb:write-policy`` token without a verifiable proof is INVALID — reject, never
downgrade (auth §8 claim-shape row ``cnf``). We verify a real DPoP proof:

* the ``DPoP`` request header is a compact JWS with ``typ: dpop+jwt`` carrying an
  embedded public ``jwk``;
* the JWK's RFC 7638 thumbprint equals the token's ``cnf.jkt`` (the token is bound to
  THIS key);
* ``htm`` (HTTP method) and ``htu`` (HTTP URI, sans query/fragment) match the request;
* ``iat`` is fresh (within a small window);
* the proof signature verifies under the embedded JWK.

mTLS ``cnf.x5t#S256`` is the verified fallback (auth §8 / decision #7); this build's
transport is DPoP-first, so the mTLS thumbprint is compared against a proxy-forwarded
client-cert thumbprint header when present. When neither proof channel is available the
holder validation fails closed — no proof, no validity.
"""
from __future__ import annotations

import hashlib
import json
import time

from .jwks import b64u_decode, b64u_encode


class DPoPError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def jwk_thumbprint(jwk: dict) -> str:
    """RFC 7638 JWK thumbprint (SHA-256, base64url) — the ``jkt`` value."""
    kty = jwk.get("kty")
    if kty == "OKP":
        members = {"crv": jwk["crv"], "kty": "OKP", "x": jwk["x"]}
    elif kty == "EC":
        members = {"crv": jwk["crv"], "kty": "EC", "x": jwk["x"], "y": jwk["y"]}
    elif kty == "RSA":
        members = {"e": jwk["e"], "kty": "RSA", "n": jwk["n"]}
    else:
        raise DPoPError(f"unsupported jwk kty {kty!r} for thumbprint")
    canon = json.dumps(members, separators=(",", ":"), sort_keys=True).encode("ascii")
    return b64u_encode(hashlib.sha256(canon).digest())


def _verifier_from_public_jwk(jwk: dict):
    from .jwks import _verifier_from_jwk  # reuse the RS key parser

    v = _verifier_from_jwk(jwk)
    if v is None or v.alg == "HS256":  # a DPoP proof must be asymmetric
        raise DPoPError("DPoP jwk is not a supported asymmetric key")
    return v


def verify_dpop(
    proof: str,
    *,
    expected_jkt: str,
    htm: str,
    htu: str,
    now: int,
    max_age_s: int = 300,
) -> None:
    """Verify a DPoP proof JWS binds the request to ``expected_jkt``. Raises on failure."""
    parts = proof.split(".")
    if len(parts) != 3 or not all(parts):
        raise DPoPError("malformed DPoP proof")
    try:
        header = json.loads(b64u_decode(parts[0]).decode("utf-8"))
        claims = json.loads(b64u_decode(parts[1]).decode("utf-8"))
    except Exception as exc:  # noqa: BLE001
        raise DPoPError(f"undecodable DPoP proof: {exc}") from exc
    if header.get("typ") != "dpop+jwt":
        raise DPoPError("DPoP typ is not dpop+jwt")
    jwk = header.get("jwk")
    if not isinstance(jwk, dict):
        raise DPoPError("DPoP header carries no embedded jwk")
    thumb = jwk_thumbprint(jwk)
    if thumb != expected_jkt:
        raise DPoPError("DPoP jwk thumbprint != token cnf.jkt (wrong key)")
    if str(claims.get("htm", "")).upper() != htm.upper():
        raise DPoPError("DPoP htm != request method")
    # Compare htu without query/fragment.
    proof_htu = str(claims.get("htu", "")).split("?")[0].split("#")[0]
    req_htu = htu.split("?")[0].split("#")[0]
    if proof_htu != req_htu:
        raise DPoPError(f"DPoP htu {proof_htu!r} != request {req_htu!r}")
    iat = claims.get("iat")
    if not isinstance(iat, (int, float)) or abs(now - int(iat)) > max_age_s:
        raise DPoPError("DPoP iat missing or stale")
    verifier = _verifier_from_public_jwk(jwk)
    signing_input = f"{parts[0]}.{parts[1]}".encode("ascii")
    if not verifier.verify(signing_input, b64u_decode(parts[2])):
        raise DPoPError("DPoP proof signature does not verify")


def now_epoch() -> int:
    return int(time.time())
