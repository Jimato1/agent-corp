"""Test harness — the whole pipeline runs offline with a symmetric HS256 test signer
and an in-memory key ring, exactly as ``platform/auth`` tests do (the security-critical
LOGIC stays fully runnable without a live auth or network).
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from app.authn.jwks import KeyRing
from app.config import Settings
from app.main import create_app

_SECRET = "test-signing-secret"
_KID = "test-hs256"
_ISS = "https://auth.test/"
_AUD = "chat"


def _b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _sign(header: dict, payload: dict) -> str:
    h = _b64u(json.dumps(header, separators=(",", ":"), sort_keys=True).encode())
    p = _b64u(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signing_input = f"{h}.{p}".encode("ascii")
    sig = hmac.new(_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64u(sig)}"


def bearer(sub: str, scope: str, *, aud: str = _AUD, ttl: int = 120, kill_level: str = "G0") -> str:
    now = int(time.time())
    header = {"alg": "HS256", "kid": _KID, "typ": "at+jwt"}
    payload = {"iss": _ISS, "sub": sub, "aud": aud, "scope": scope,
               "iat": now, "exp": now + ttl, "jti": f"jti-{now}-{sub}", "kill_level": kill_level}
    return _sign(header, payload)


def identity(sub: str, principal_type: str = "human", *, aud: str = _AUD, kill_level: str = "G0") -> str:
    now = int(time.time())
    header = {"alg": "HS256", "kid": _KID, "typ": "auth-id+jwt"}
    payload = {"iss": _ISS, "sub": sub, "principal_type": principal_type, "aud": aud,
               "iat": now, "exp": now + 30, "jti": f"idh-{now}", "kill_level": kill_level}
    return _sign(header, payload)


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def id_header(token: str) -> dict:
    return {"X-Auth-Identity": token}


@pytest.fixture()
def settings(tmp_path) -> Settings:
    return Settings(
        db_path=tmp_path / "chat.sqlite3",
        backup_dir=tmp_path / "backups",
        static_dir=tmp_path / "static",
        auth_issuer=_ISS,
        auth_audience=_AUD,
        auth_test_hs256_secret=_SECRET,
        ntfy_enabled=False,          # no network in tests; SSE/UI is the durable path
        suite_domain="suite.local",
        rate_post_per_hour=5,        # low ceiling so the rate-limit test is cheap
        rate_escalation_per_hour=3,
    )


@pytest.fixture()
def client(settings) -> TestClient:
    ring = KeyRing(jwks_url=None).add_hs256(_KID, _SECRET)
    app = create_app(settings, keyring=ring)
    with TestClient(app) as c:
        yield c


# Convenience principals -------------------------------------------------------------
def op_headers() -> dict:
    return id_header(identity("op:ada"))


def agent_headers(scope: str = "chat:post") -> dict:
    return auth_header(bearer("agent:patcher-07", scope))
