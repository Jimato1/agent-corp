"""Test harness — an isolated build: HS256 test signer for auth tokens, real Ed25519 DPoP
proofs, tmp SQLite + tmp git policy repo. No live auth / Wazuh / remote required."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time

import pytest
from fastapi.testclient import TestClient

from app.authn.jwks import KeyRing, b64u_encode
from app.config import Settings
from app.main import create_app

HS_SECRET = "test-signer-secret"
HS_KID = "test-hs256"


def _b64u(obj: dict) -> str:
    return b64u_encode(json.dumps(obj, separators=(",", ":"), sort_keys=True).encode())


def mint_access(sub: str, scope: str, *, aud: str = "cmdb", cnf_jkt: str | None = None,
                ttl: int = 120) -> str:
    """An HS256 `at+jwt` signed by the isolated-build test signer."""
    header = {"alg": "HS256", "typ": "at+jwt", "kid": HS_KID}
    now = int(time.time())
    claims = {"iss": "https://auth.suite.local/", "sub": sub, "aud": aud,
              "scope": scope, "iat": now, "exp": now + ttl, "jti": f"jti-{sub}-{now}"}
    if cnf_jkt:
        claims["cnf"] = {"jkt": cnf_jkt}
    signing_input = f"{_b64u(header)}.{_b64u(claims)}".encode()
    sig = hmac.new(HS_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f"{signing_input.decode()}.{b64u_encode(sig)}"


class Operator:
    """An operator principal with an Ed25519 DPoP key (for holder writes)."""

    def __init__(self, sub: str = "op:ada") -> None:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
        from cryptography.hazmat.primitives import serialization

        self.sub = sub
        self._key = Ed25519PrivateKey.generate()
        raw = self._key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw)
        self.jwk = {"kty": "OKP", "crv": "Ed25519", "x": b64u_encode(raw)}
        canon = json.dumps({"crv": "Ed25519", "kty": "OKP", "x": self.jwk["x"]},
                           separators=(",", ":"), sort_keys=True).encode()
        self.jkt = b64u_encode(hashlib.sha256(canon).digest())

    def token(self, scope: str = "cmdb:write-policy cmdb:read-policy") -> str:
        return mint_access(self.sub, scope, cnf_jkt=self.jkt)

    def dpop(self, method: str, url: str) -> str:
        header = {"typ": "dpop+jwt", "alg": "EdDSA", "jwk": self.jwk}
        claims = {"htm": method.upper(), "htu": url.split("?")[0], "iat": int(time.time()),
                  "jti": f"dpop-{int(time.time()*1000)}"}
        signing_input = f"{_b64u(header)}.{_b64u(claims)}".encode()
        sig = self._key.sign(signing_input)
        return f"{signing_input.decode()}.{b64u_encode(sig)}"


@pytest.fixture
def make_app(tmp_path):
    created = []

    def _make(**overrides):
        base = dict(
            db_path=tmp_path / f"cmdb-{len(created)}.sqlite3",
            policy_repo_path=tmp_path / f"policy-{len(created)}",
            require_remote=False,
            allow_uncheckable_sodcritical=True,
            auth_test_hs256_secret=HS_SECRET,
            auth_jwks_url="",  # no network in tests
            wazuh_enabled=False,
            static_dir=tmp_path / f"static-{len(created)}",
            verdict_key_path=tmp_path / f"verdict-{len(created)}.key",
        )
        base.update(overrides)
        settings = Settings(**base)
        ring = KeyRing().__class__()
        ring.add_hs256(HS_KID, HS_SECRET)
        app = create_app(settings, keyring=ring)
        client = TestClient(app)
        created.append((app, client))
        return app, client

    yield _make
    for app, client in created:
        with __import__("contextlib").suppress(Exception):
            app.state.db.close()


@pytest.fixture
def app_client(make_app):
    return make_app()


@pytest.fixture
def operator():
    return Operator()


def read_headers(scope: str = "cmdb:read-policy", sub: str = "op:ada") -> dict:
    return {"Authorization": f"Bearer {mint_access(sub, scope)}"}


def holder_headers(operator: "Operator", method: str, path: str,
                   scope: str = "cmdb:write-policy cmdb:read-policy") -> dict:
    url = "http://testserver" + path
    return {"Authorization": f"Bearer {operator.token(scope)}", "DPoP": operator.dpop(method, url)}


def seed(app, files: dict[str, str]) -> str:
    """Directly write policy files + commit + append a matching chain row + reload the
    snapshot (bypasses the ceremony — for arranging test state). Keeps boot-integrity OK
    (chain tip git_commit == HEAD)."""
    import yaml as _yaml
    from app import chainlog

    store = app.state.store
    rendered = {}
    for rel, fm in files.items():
        rendered[rel] = "---\n" + _yaml.safe_dump(fm, sort_keys=False) + "---\n" if isinstance(fm, dict) else fm
    store.write_files(rendered)
    commit = store.commit("test: seed policy", sub="op:test", session=None)
    chainlog.append_chain(app.state.db, sub="op:test", jti=None, session=None,
                          edit_kind="test_seed", weakening=False, diff_hash=None,
                          git_commit=commit, confirm_token_id=None)
    store.reload_snapshot()
    return commit
