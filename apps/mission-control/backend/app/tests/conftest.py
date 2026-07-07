"""Test harness — the whole pipeline runs offline with a symmetric HS256 test signer and
an in-memory key ring, exactly as ``platform/auth`` / ``apps/chat`` tests do. Upstreams
(auth/Board/edge) are absent, so composition reads degrade honestly (STALE-UNKNOWN) —
which is itself a tested property. Tests that need a specific upstream result inject a
fake client onto ``app.state``.
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
_AUD = "mc"


def _b64u(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _sign(header: dict, payload: dict) -> str:
    h = _b64u(json.dumps(header, separators=(",", ":"), sort_keys=True).encode())
    p = _b64u(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signing_input = f"{h}.{p}".encode("ascii")
    sig = hmac.new(_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f"{h}.{p}.{_b64u(sig)}"


def bearer(sub: str, scope: str, *, aud: str = _AUD, ttl: int = 120, cnf_jkt: str | None = None) -> str:
    now = int(time.time())
    header = {"alg": "HS256", "kid": _KID, "typ": "at+jwt"}
    payload = {"iss": _ISS, "sub": sub, "aud": aud, "scope": scope,
               "iat": now, "exp": now + ttl, "jti": f"jti-{now}-{sub}"}
    if cnf_jkt:
        payload["cnf"] = {"jkt": cnf_jkt}
    return _sign(header, payload)


def identity(sub: str, principal_type: str = "human", *, aud: str = _AUD) -> str:
    now = int(time.time())
    header = {"alg": "HS256", "kid": _KID, "typ": "auth-id+jwt"}
    payload = {"iss": _ISS, "sub": sub, "principal_type": principal_type, "aud": aud,
               "iat": now, "exp": now + 60, "jti": f"idh-{now}"}
    return _sign(header, payload)


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def op_headers() -> dict:
    return {"X-Auth-Identity": identity("op:ada")}


def agent_headers(scope: str = "mc:report") -> dict:
    return auth_header(bearer("agent:patcher-07", scope))


def svc_headers(sub: str, scope: str) -> dict:
    return auth_header(bearer(sub, scope, cnf_jkt="jkt-xyz"))


@pytest.fixture()
def settings(tmp_path) -> Settings:
    return Settings(
        db_path=tmp_path / "mc.sqlite3",
        backup_dir=tmp_path / "backups",
        static_dir=tmp_path / "static",
        auth_issuer=_ISS,
        auth_audience=_AUD,
        auth_test_hs256_secret=_SECRET,
        suite_domain="suite.local",
        budget_redis_url="",   # in-process fallback in tests (no network)
        runtime_sse_url="",    # passive heartbeat ingest in tests
    )


@pytest.fixture()
def client(settings) -> TestClient:
    ring = KeyRing(jwks_url=None).add_hs256(_KID, _SECRET)
    app = create_app(settings, keyring=ring)
    with TestClient(app) as c:
        yield c
