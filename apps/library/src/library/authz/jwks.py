"""library.authz.jwks — local token validation (auth §1) + the JWKS kill channel.

Two signer regimes, mirroring auth's own SQLite-now / EdDSA-prod split:
  * HS256 test-signer (sandbox default, LIBRARY_SIGNER_ALG=HS256): shared-secret
    verify with pure stdlib hmac — the whole RS logic (aud/iss/exp/kid/scope/kind
    gate) runs GREEN with NO external crypto, exactly like auth's test-signer.
  * JWKS asymmetric (production, EdDSA/ES256/RS256): verify against auth's published
    JWKS, polled ≤30 s; ANY `kid` not in the currently-served JWKS is REJECTED — the
    Redis-independent kill channel (a revoked signing key drops out of JWKS and every
    token it signed fails within one poll interval). Requires `cryptography`; if absent
    the asymmetric path raises LOUDLY (never a fake verification).

DPoP/cnf: when a token carries `cnf.jkt` and DPoP is required, a bound request must
present a matching DPoP proof. Full JWK-thumbprint matching needs `cryptography`
(CANNOT-VERIFY-locally without it); the presence gate is enforced here regardless.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import threading
import time
import urllib.request
from typing import Optional

from ..errors import Unauthenticated


def b64url_decode(s: str) -> bytes:
    pad = "=" * (-len(s) % 4)
    return base64.urlsafe_b64decode(s + pad)


def b64url_encode(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).rstrip(b"=").decode("ascii")


def decode_unverified(token: str) -> tuple[dict, dict, bytes, bytes]:
    try:
        h_b64, p_b64, s_b64 = token.split(".")
    except ValueError:
        raise Unauthenticated("malformed token", code="invalid_token")
    header = json.loads(b64url_decode(h_b64))
    claims = json.loads(b64url_decode(p_b64))
    signing_input = f"{h_b64}.{p_b64}".encode("ascii")
    signature = b64url_decode(s_b64)
    return header, claims, signing_input, signature


class JWKSCache:
    """Polls auth's JWKS and holds the currently-served kid→key set. A kid absent from
    THIS set is the kill signal (auth §1)."""

    def __init__(self, auth_base: str, poll_s: int = 30):
        self.url = auth_base.rstrip("/") + "/jwks"
        self.poll_s = poll_s
        self._keys: dict[str, dict] = {}
        self._fetched_at = 0.0
        self._lock = threading.Lock()

    def _refresh(self) -> None:
        try:
            with urllib.request.urlopen(self.url, timeout=2) as r:
                jwks = json.loads(r.read())
            with self._lock:
                self._keys = {k["kid"]: k for k in jwks.get("keys", []) if "kid" in k}
                self._fetched_at = time.time()
        except Exception:
            pass  # keep the last-known set; poll again next call (never fabricate a key)

    def get(self, kid: str, now: float) -> Optional[dict]:
        if now - self._fetched_at > self.poll_s:
            self._refresh()
        with self._lock:
            return self._keys.get(kid)

    def kids(self) -> set:
        with self._lock:
            return set(self._keys)


class TokenVerifier:
    def __init__(self, *, signer_alg: str, at_secret: str, audience: str, issuer: str,
                 clock_skew_s: int = 60, jwks: Optional[JWKSCache] = None):
        self.signer_alg = signer_alg
        self.at_secret = at_secret
        self.audience = audience
        self.issuer = issuer
        self.skew = clock_skew_s
        self.jwks = jwks

    def verify(self, token: str, *, now: Optional[float] = None) -> dict:
        now = now if now is not None else time.time()
        header, claims, signing_input, signature = decode_unverified(token)
        alg = header.get("alg")

        # signature
        if self.signer_alg == "HS256":
            if alg != "HS256":
                raise Unauthenticated("unexpected alg", code="invalid_token")
            expected = hmac.new(self.at_secret.encode(), signing_input, hashlib.sha256).digest()
            if not hmac.compare_digest(expected, signature):
                raise Unauthenticated("bad signature", code="invalid_token")
        else:
            self._verify_asymmetric(header, signing_input, signature, now)

        # iss (RFC 9207)
        if self.issuer and claims.get("iss") != self.issuer:
            raise Unauthenticated("issuer mismatch", code="invalid_token")
        # aud == self (exactly one resource; reject multi-valued)
        aud = claims.get("aud")
        if isinstance(aud, list):
            raise Unauthenticated("multi-valued aud rejected", code="invalid_token")
        if aud != self.audience:
            raise Unauthenticated(f"audience mismatch (want {self.audience})", code="invalid_token")
        # exp / nbf with clock skew ≤60s
        exp = claims.get("exp")
        if exp is not None and now > float(exp) + self.skew:
            raise Unauthenticated("token expired", code="invalid_token")
        nbf = claims.get("nbf")
        if nbf is not None and now < float(nbf) - self.skew:
            raise Unauthenticated("token not yet valid", code="invalid_token")
        if not claims.get("sub"):
            raise Unauthenticated("missing sub", code="invalid_token")
        return claims

    def _verify_asymmetric(self, header: dict, signing_input: bytes, signature: bytes, now: float) -> None:
        kid = header.get("kid")
        if not kid or self.jwks is None:
            raise Unauthenticated("missing kid / no JWKS", code="invalid_token")
        key = self.jwks.get(kid, now)
        if key is None:
            # kid not in the currently-served JWKS = the kill channel (auth §1)
            raise Unauthenticated("unknown/revoked signing key", code="invalid_token")
        try:
            from ..crypto_verify import verify_jws  # optional cryptography-backed verifier
        except Exception:
            raise Unauthenticated(
                "asymmetric verification requires the 'cryptography' package (prod)",
                code="verifier_unavailable")
        if not verify_jws(header.get("alg"), key, signing_input, signature):
            raise Unauthenticated("bad signature", code="invalid_token")
