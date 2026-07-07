"""JWS validation — access tokens (`at+jwt`) + the proxy's `X-Auth-Identity` header.

Local, offline RS validation per auth PLAN §5.1 / §8 claim shape. Resolve the key (is the
``kid`` current?) and verify the signature BEFORE trusting any claim value. Hand-rolled
compact-JWS over the ``cryptography``-backed verifiers in :mod:`app.authn.jwks` (identical
to apps/cmdb).
"""
from __future__ import annotations

import json

from .jwks import KeyRing, b64u_decode

TYP_ACCESS_TOKEN = "at+jwt"


class TokenError(Exception):
    """Any token validation failure. ``code`` maps to the wire reason."""

    def __init__(self, message: str, code: str = "invalid_token") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


def _split(token: str) -> tuple[str, str, str]:
    parts = token.split(".")
    if len(parts) != 3 or not all(parts):
        raise TokenError("expected three non-empty JWS segments (alg=none refused)", "malformed")
    return parts[0], parts[1], parts[2]


def _decode_json(seg: str, what: str) -> dict:
    try:
        obj = json.loads(b64u_decode(seg).decode("utf-8"))
    except Exception as exc:
        raise TokenError(f"{what} is not valid JSON: {exc}", "malformed") from exc
    if not isinstance(obj, dict):
        raise TokenError(f"{what} must be a JSON object", "malformed")
    return obj


def _verify_signature(h_seg: str, p_seg: str, s_seg: str, keyring: KeyRing) -> dict:
    header = _decode_json(h_seg, "JOSE header")
    kid = header.get("kid")
    if not kid:
        raise TokenError("JOSE header has no kid", "untrusted_kid")
    alg = header.get("alg")
    if not alg or alg == "none":
        raise TokenError("alg=none / missing alg is refused", "alg")
    verifier = keyring.verifier_for(kid)
    if verifier is None:
        raise TokenError(f"kid {kid!r} not in the current JWKS (unknown or retired)", "untrusted_kid")
    if alg != verifier.alg:
        raise TokenError(f"header alg {alg!r} != key alg {verifier.alg!r}", "alg")
    signing_input = f"{h_seg}.{p_seg}".encode("ascii")
    if not verifier.verify(signing_input, b64u_decode(s_seg)):
        raise TokenError("signature does not verify", "bad_signature")
    return header


def validate_access_token(
    token: str,
    keyring: KeyRing,
    *,
    expected_iss: str,
    expected_aud: str,
    now: int,
    leeway_s: int = 60,
) -> tuple[dict, dict]:
    """Validate an ``at+jwt`` and return ``(header, claims)``.

    Enforces: signature, ``kid`` current, ``alg`` match, ``typ==at+jwt``, ``iss``,
    ``aud`` single-valued == self, ``exp`` (with skew). Holder extras + revocation are the
    caller's (:mod:`app.authn.principal`).
    """
    h_seg, p_seg, s_seg = _split(token)
    header = _verify_signature(h_seg, p_seg, s_seg, keyring)
    if header.get("typ") != TYP_ACCESS_TOKEN:
        raise TokenError(f"unexpected typ {header.get('typ')!r}; want {TYP_ACCESS_TOKEN!r}", "malformed")

    claims = _decode_json(p_seg, "JWT payload")
    aud = claims.get("aud")
    if isinstance(aud, (list, tuple, set)):
        raise TokenError("aud must be EXACTLY ONE resource (RFC 8707), got a collection", "aud")
    for req in ("iss", "sub", "aud", "exp"):
        if req not in claims:
            raise TokenError(f"missing required claim {req!r}", "malformed")
    if claims["iss"] != expected_iss:
        raise TokenError(f"iss {claims['iss']!r} != expected", "iss")
    if aud != expected_aud:
        raise TokenError(f"aud {aud!r} != self {expected_aud!r}", "aud")
    if now > int(claims["exp"]) + leeway_s:
        raise TokenError("token expired", "expired")
    if "nbf" in claims and now + leeway_s < int(claims["nbf"]):
        raise TokenError("token not yet valid", "expired")
    return header, claims


def decode_identity_header(
    token: str,
    keyring: KeyRing,
    *,
    expected_iss: str,
    expected_aud: str,
    now: int,
    leeway_s: int = 60,
) -> dict:
    """Verify the proxy-injected ``X-Auth-Identity`` JWS and return its claims (operator UI path)."""
    h_seg, p_seg, s_seg = _split(token)
    _verify_signature(h_seg, p_seg, s_seg, keyring)
    claims = _decode_json(p_seg, "identity payload")
    if claims.get("iss") != expected_iss:
        raise TokenError("identity iss mismatch", "iss")
    if claims.get("aud") != expected_aud:
        raise TokenError(f"identity aud {claims.get('aud')!r} != self", "aud")
    exp = claims.get("exp")
    if exp is not None and now > int(exp) + leeway_s:
        raise TokenError("identity header expired", "expired")
    return claims
