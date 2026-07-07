"""JWKS key ring + JWS verifiers (auth-apps-tokens-scopes.md §1 baseline).

CMDB is a resource server: it validates auth's ``at+jwt`` tokens LOCALLY against auth's
published JWKS (no third-party JWT library — the house value from ``platform/auth``:
hand-rolled over ``cryptography``). Supported production algs: ``EdDSA`` (Ed25519,
``kty=OKP``) and ``ES256`` (P-256, ``kty=EC``). ``HS256`` (``kty=oct``) is reachable
ONLY when ``CMDB_AUTH_TEST_HS256_SECRET`` is configured (isolated-build test signer); a
real JWKS never publishes symmetric keys.

A retired/unknown ``kid`` resolves to ``None`` → the caller rejects. That is the
Redis-independent kill lever: auth retiring a kid from its served JWKS invalidates every
token signed by it within one poll interval (<=30s). Refresh REPLACES the JWKS-sourced
set wholesale so a retired kid never lingers (chat-stage4 gotcha).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import threading
import time
import urllib.request
from typing import Protocol


def b64u_decode(seg: str) -> bytes:
    if not isinstance(seg, str):
        raise ValueError("base64url segment must be str")
    pad = "=" * (-len(seg) % 4)
    return base64.urlsafe_b64decode(seg + pad)


def b64u_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


class Verifier(Protocol):
    alg: str

    def verify(self, signing_input: bytes, signature: bytes) -> bool: ...


class _HS256Verifier:
    alg = "HS256"

    def __init__(self, secret: bytes) -> None:
        self._secret = secret

    def verify(self, signing_input: bytes, signature: bytes) -> bool:
        expected = hmac.new(self._secret, signing_input, hashlib.sha256).digest()
        return hmac.compare_digest(expected, signature)


class _Ed25519Verifier:
    alg = "EdDSA"

    def __init__(self, public_key) -> None:
        self._pk = public_key

    def verify(self, signing_input: bytes, signature: bytes) -> bool:
        from cryptography.exceptions import InvalidSignature

        try:
            self._pk.verify(signature, signing_input)
            return True
        except InvalidSignature:
            return False


class _ES256Verifier:
    alg = "ES256"

    def __init__(self, public_key) -> None:
        self._pk = public_key

    def verify(self, signing_input: bytes, signature: bytes) -> bool:
        from cryptography.exceptions import InvalidSignature
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.primitives.asymmetric import ec, utils

        if len(signature) != 64:  # JOSE ES256 is raw r||s, 32+32
            return False
        r = int.from_bytes(signature[:32], "big")
        s = int.from_bytes(signature[32:], "big")
        der = utils.encode_dss_signature(r, s)
        try:
            self._pk.verify(der, signing_input, ec.ECDSA(hashes.SHA256()))
            return True
        except InvalidSignature:
            return False


def _verifier_from_jwk(jwk: dict) -> Verifier | None:
    kty = jwk.get("kty")
    try:
        if kty == "OKP" and jwk.get("crv") == "Ed25519":
            from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

            return _Ed25519Verifier(Ed25519PublicKey.from_public_bytes(b64u_decode(jwk["x"])))
        if kty == "EC" and jwk.get("crv") == "P-256":
            from cryptography.hazmat.primitives.asymmetric.ec import (
                SECP256R1,
                EllipticCurvePublicNumbers,
            )

            x = int.from_bytes(b64u_decode(jwk["x"]), "big")
            y = int.from_bytes(b64u_decode(jwk["y"]), "big")
            return _ES256Verifier(EllipticCurvePublicNumbers(x, y, SECP256R1()).public_key())
        if kty == "oct":  # symmetric test key (isolated build only)
            return _HS256Verifier(b64u_decode(jwk["k"]))
    except Exception:
        return None
    return None


class KeyRing:
    """A thread-safe ``kid -> Verifier`` map with an optional JWKS refresh source."""

    def __init__(self, jwks_url: str | None = None, poll_seconds: int = 30) -> None:
        self._jwks_url = jwks_url
        self._poll_seconds = poll_seconds
        self._lock = threading.Lock()
        self._by_kid: dict[str, Verifier] = {}
        self._static: dict[str, Verifier] = {}
        self._fetched_at = 0.0
        self._last_refresh_attempt = 0.0

    def add(self, kid: str, verifier: Verifier) -> "KeyRing":
        with self._lock:
            self._static[kid] = verifier
            self._by_kid[kid] = verifier
        return self

    def add_hs256(self, kid: str, secret: str | bytes) -> "KeyRing":
        raw = secret.encode("utf-8") if isinstance(secret, str) else secret
        return self.add(kid, _HS256Verifier(raw))

    def verifier_for(self, kid: str) -> Verifier | None:
        with self._lock:
            v = self._by_kid.get(kid)
        if v is not None:
            return v
        if self._jwks_url and (time.time() - self._last_refresh_attempt) > 1.0:
            self.refresh()
            with self._lock:
                return self._by_kid.get(kid)
        return None

    def stale(self) -> bool:
        return bool(self._jwks_url) and (time.time() - self._fetched_at) > self._poll_seconds

    def refresh(self) -> bool:
        if not self._jwks_url:
            return False
        self._last_refresh_attempt = time.time()
        try:
            with urllib.request.urlopen(self._jwks_url, timeout=2.5) as resp:  # noqa: S310 (trusted internal URL)
                doc = json.loads(resp.read().decode("utf-8"))
        except Exception:
            return False
        built: dict[str, Verifier] = {}
        for jwk in doc.get("keys", []):
            kid = jwk.get("kid")
            v = _verifier_from_jwk(jwk)
            if kid and v is not None:
                built[kid] = v
        if not built:
            return False
        with self._lock:
            # REPLACE the JWKS-sourced set wholesale — a retired kid stops validating within
            # one poll interval (the Redis-independent kill lever). Static test keys survive.
            self._by_kid = {**self._static, **built}
            self._fetched_at = time.time()
        return True
