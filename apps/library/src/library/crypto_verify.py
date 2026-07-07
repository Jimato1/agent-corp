"""library.crypto_verify — OPTIONAL asymmetric JWS verification (production).

Imported lazily only on the JWKS asymmetric path (jwks.py). Requires `cryptography`
(requirements.txt). If the package is absent the caller raises LOUDLY — it NEVER falls
back to accepting a token unverified. This is the production substitute for the HS256
test-signer, exactly like auth's EdDSA activation.
"""
from __future__ import annotations

from .authz.jwks import b64url_decode


def verify_jws(alg: str, jwk: dict, signing_input: bytes, signature: bytes) -> bool:
    from cryptography.hazmat.primitives.asymmetric import ec, ed25519, padding
    from cryptography.hazmat.primitives import hashes
    from cryptography.exceptions import InvalidSignature

    kty = jwk.get("kty")
    try:
        if kty == "OKP" and alg == "EdDSA":
            pub = ed25519.Ed25519PublicKey.from_public_bytes(b64url_decode(jwk["x"]))
            pub.verify(signature, signing_input)
            return True
        if kty == "EC" and alg == "ES256":
            x = int.from_bytes(b64url_decode(jwk["x"]), "big")
            y = int.from_bytes(b64url_decode(jwk["y"]), "big")
            pub = ec.EllipticCurvePublicNumbers(x, y, ec.SECP256R1()).public_key()
            # ES256 signatures are raw r||s; convert to DER
            from cryptography.hazmat.primitives.asymmetric.utils import encode_dss_signature
            n = len(signature) // 2
            r = int.from_bytes(signature[:n], "big")
            s = int.from_bytes(signature[n:], "big")
            pub.verify(encode_dss_signature(r, s), signing_input, ec.ECDSA(hashes.SHA256()))
            return True
        if kty == "RSA" and alg == "RS256":
            from cryptography.hazmat.primitives.asymmetric import rsa
            n = int.from_bytes(b64url_decode(jwk["n"]), "big")
            e = int.from_bytes(b64url_decode(jwk["e"]), "big")
            pub = rsa.RSAPublicNumbers(e, n).public_key()
            pub.verify(signature, signing_input, padding.PKCS1v15(), hashes.SHA256())
            return True
    except InvalidSignature:
        return False
    return False
