"""Test harness — an isolated build (Stage-7 stub-double pattern): HS256 test signer for auth
tokens, real Ed25519 DPoP proofs, a test CMDB verdict signer, tmp SQLite, the FakeDispatcher,
and FAKE holder clients (Board/Notes/CMDB/Vault/MC). No live auth / Board / CMDB / Vault /
Wazuh required.

The four-check chain is verified against these fakes; the FULL-CHAIN-REJECTS-ON-REAL-INFRA
tests (live Board consume, real CMDB verdict, real Vault redeem over mTLS) are
CANNOT-VERIFY-IN-SANDBOX and are marked for the operator (see verification/CHECKLIST.md).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import time

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

from app.authn.jwks import KeyRing, _verifier_from_jwk, b64u_encode
from app.checks.plan import params_hash, recompute_plan_hash
from app.config import Settings
from app.main import create_app

HS_SECRET = "test-signer-secret"
HS_KID = "test-hs256"
VERDICT_KID = "cmdb-verdict-test"


def _b64u(obj: dict) -> str:
    return b64u_encode(json.dumps(obj, separators=(",", ":"), sort_keys=True).encode())


def mint_access(sub: str, scope: str, *, aud: str = "gateway", cnf_jkt: str | None = None, ttl: int = 120) -> str:
    header = {"alg": "HS256", "typ": "at+jwt", "kid": HS_KID}
    now = int(time.time())
    claims = {"iss": "https://auth.suite.local/", "sub": sub, "aud": aud,
              "scope": scope, "iat": now, "exp": now + ttl, "jti": f"jti-{sub}-{now}"}
    if cnf_jkt:
        claims["cnf"] = {"jkt": cnf_jkt}
    signing_input = f"{_b64u(header)}.{_b64u(claims)}".encode()
    sig = hmac.new(HS_SECRET.encode(), signing_input, hashlib.sha256).digest()
    return f"{signing_input.decode()}.{b64u_encode(sig)}"


class Executor:
    """An executor agent principal with an Ed25519 DPoP key (for the gateway:execute holder path)."""

    def __init__(self, sub: str = "agent:patcher-07") -> None:
        self.sub = sub
        self._key = Ed25519PrivateKey.generate()
        raw = self._key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw)
        self.jwk = {"kty": "OKP", "crv": "Ed25519", "x": b64u_encode(raw)}
        canon = json.dumps({"crv": "Ed25519", "kty": "OKP", "x": self.jwk["x"]},
                           separators=(",", ":"), sort_keys=True).encode()
        self.jkt = b64u_encode(hashlib.sha256(canon).digest())

    def token(self, scope: str = "gateway:execute") -> str:
        return mint_access(self.sub, scope, cnf_jkt=self.jkt)

    def dpop(self, method: str, url: str) -> str:
        header = {"typ": "dpop+jwt", "alg": "EdDSA", "jwk": self.jwk}
        claims = {"htm": method.upper(), "htu": url.split("?")[0], "iat": int(time.time()),
                  "jti": f"dpop-{int(time.time()*1000)}"}
        signing_input = f"{_b64u(header)}.{_b64u(claims)}".encode()
        sig = self._key.sign(signing_input)
        return f"{signing_input.decode()}.{b64u_encode(sig)}"


class VerdictSigner:
    """A test stand-in for CMDB's LOCAL Ed25519 verdict-signing key."""

    def __init__(self, kid: str = VERDICT_KID) -> None:
        self.kid = kid
        self._key = Ed25519PrivateKey.generate()
        raw = self._key.public_key().public_bytes(
            encoding=serialization.Encoding.Raw, format=serialization.PublicFormat.Raw)
        self.jwk = {"kty": "OKP", "crv": "Ed25519", "kid": kid, "x": b64u_encode(raw), "alg": "EdDSA"}

    def sign(self, claims: dict, *, typ: str = "cmdb-verdict+jws") -> str:
        header = {"alg": "EdDSA", "typ": typ, "kid": self.kid}
        signing_input = f"{_b64u(header)}.{_b64u(claims)}".encode("ascii")
        sig = self._key.sign(signing_input)
        return f"{signing_input.decode()}.{b64u_encode(sig)}"

    def keyring(self) -> KeyRing:
        ring = KeyRing()
        ring.add(self.kid, _verifier_from_jwk(self.jwk))
        return ring


# ---- Fake holder clients (the frozen contract shapes, verbatim) -------------

class FakeBoard:
    def __init__(self) -> None:
        self.ticket = None
        self.approval = None
        self.consume_response = None
        self.consume_error = None          # ('HOST_LOCKED'|'APPROVAL_CONSUMED'|'APPROVAL_REVOKED')
        self.outcomes: list = []
        self.consumed = False

    def facts_ticket(self, ticket_id):
        return self.ticket

    def facts_approval(self, approval_id):
        return self.approval or {"approver_kind": "operator"}

    def host_lock(self, host_id):
        return {"exists": False, "lock_generation": 0}

    def consume_approval(self, approval_id, ticket_id, host_id, op_id):
        from app.checks import APPROVAL_CONSUMED, APPROVAL_REVOKED, HOST_LOCKED, HardReject
        if self.consume_error == "HOST_LOCKED":
            raise HardReject(HOST_LOCKED, "host locked", escalate=False)
        if self.consume_error == "APPROVAL_CONSUMED":
            raise HardReject(APPROVAL_CONSUMED, "already consumed")
        if self.consume_error == "APPROVAL_REVOKED":
            raise HardReject(APPROVAL_REVOKED, "revoked")
        self.consumed = True
        return self.consume_response

    def report_run_outcome(self, *a, **k):
        self.outcomes.append((a, k))

    def submit_verification(self, *a, **k):
        pass


class FakeNotes:
    def __init__(self, plan_bytes: bytes = b"") -> None:
        self._bytes = plan_bytes

    def plan_bytes(self, note_id, note_rev):
        return self._bytes


class FakeCmdb:
    def __init__(self, signer: VerdictSigner) -> None:
        self.signer = signer
        self.verdict = "permit"
        self.host_class = "managed"
        self.verdict_basis = None
        self.valid_for_s = 60
        self.window_closes_at = None
        self._n = 0

    def decision(self, host_id, action_class, ticket_ref, req_nonce=None):
        self._n += 1
        now = int(time.time())
        did = f"D-test-{self._n}-{now}"
        claims = {"verdict": self.verdict, "iss": "cmdb", "aud": "gateway",
                  "jti": did, "decision_id": did, "iat": now, "exp": now + self.valid_for_s,
                  "valid_until": _iso(now + self.valid_for_s), "evaluated_at": _iso(now),
                  "policy_version": "abc123", "host_class": self.host_class,
                  "tier": "tier2", "approval_mode": "ask", "in_window": True, "grace": 0}
        if self.verdict_basis is not None:
            claims["verdict_basis"] = self.verdict_basis
        if self.window_closes_at is not None:
            claims["window_closes_at"] = _iso(self.window_closes_at)
        return self.signer.sign(claims)

    def verdict_jwks(self):
        return {"keys": [self.signer.jwk]}


class FakeVault:
    def __init__(self) -> None:
        self.status = 200
        self.body = {"handle": "cred://hosts/nas-01/root", "lease_id": "lse-1", "cert_ttl_s": 600}
        self.redeem_calls = 0
        self.revoked: list = []

    def redeem(self, ticket_id, release_id, approval_id, run_id, public_key):
        self.redeem_calls += 1
        return self.status, self.body

    def revoke(self, lease_id):
        self.revoked.append(lease_id)
        return True


class FakeMc:
    def advertised_last(self, chain_id):
        return {"chain_id": chain_id, "seq": -1}

    def push_anchor(self, head):
        return True


class FakeClients:
    def __init__(self, signer: VerdictSigner, *, plan_bytes: bytes) -> None:
        self.board = FakeBoard()
        self.notes = FakeNotes(plan_bytes)
        self.cmdb = FakeCmdb(signer)
        self.vault = FakeVault()
        self.mc = FakeMc()
        self.verdict_keyring = None


def _iso(epoch: int) -> str:
    from datetime import datetime, timezone
    return datetime.fromtimestamp(epoch, timezone.utc).isoformat().replace("+00:00", "Z")


# ---- The canonical happy-path plan + its consume response -------------------

def happy_plan_bytes() -> bytes:
    inv = {"playbook_key": "patch_debian", "version": "v1",
           "extravars": {"packages": ["openssl"], "reboot_if_needed": True}}
    body = "# Plan\n```gateway-invocations\n" + json.dumps([inv]) + "\n```\n"
    return body.encode("utf-8")


def happy_consume_response(plan_bytes: bytes, *, fencing_token: int = 1) -> dict:
    inv = {"playbook_key": "patch_debian", "version": "v1",
           "extravars": {"packages": ["openssl"], "reboot_if_needed": True}}
    return {
        "approval_id": "A-000001", "ticket_id": "T-000482", "host_id": "nas-01",
        "plan_hash": recompute_plan_hash(plan_bytes),
        "plan_note_id": "N-plan", "plan_note_rev": 3, "action_class": "package_update",
        "allowlist": [{"seq": 0, "playbook_key": "patch_debian", "params_hash": params_hash(inv)}],
        "fencing_token": fencing_token,
    }


def happy_ticket_facts() -> dict:
    return {"exists": True, "status": "approved", "approval_id": "A-000001", "host_id": "nas-01",
            "plan_note_id": "N-plan", "plan_note_rev": 3, "release_id": "rel-abc",
            "taint_host_originated": False, "lane": "operator"}


# ---- Fixtures ---------------------------------------------------------------

@pytest.fixture
def verdict_signer():
    return VerdictSigner()


@pytest.fixture
def make_app(tmp_path, verdict_signer):
    created = []

    def _make(*, plan_bytes: bytes | None = None, **overrides):
        plan_bytes = happy_plan_bytes() if plan_bytes is None else plan_bytes
        base = dict(
            db_url=f"sqlite:///{tmp_path}/gw-{len(created)}.sqlite3",
            signing_key_file=tmp_path / f"audit-{len(created)}.key",
            fake_runner=True,
            allow_uncheckable_destructive=True,   # isolated build: introspect transport absent
            auth_test_hs256_secret=HS_SECRET,
            auth_jwks_url="",
            cmdb_url="",
            static_dir=tmp_path / f"static-{len(created)}",
        )
        base.update(overrides)
        settings = Settings(**base)
        ring = KeyRing()
        ring.add_hs256(HS_KID, HS_SECRET)
        clients = FakeClients(verdict_signer, plan_bytes=plan_bytes)
        clients.board.ticket = happy_ticket_facts()
        clients.board.consume_response = happy_consume_response(plan_bytes)
        app = create_app(settings, keyring=ring, verdict_keyring=verdict_signer.keyring(),
                         dispatcher=None, clients=clients)
        client = TestClient(app)
        created.append((app, client))
        return app, client, clients

    yield _make
    import contextlib as _c
    for app, _client in created:
        with _c.suppress(Exception):
            app.state.db.close()


@pytest.fixture
def app_bundle(make_app):
    return make_app()


@pytest.fixture
def executor():
    return Executor()


def exec_headers(executor: Executor, path: str = "/mcp/tools/execute_approved_plan",
                 scope: str = "gateway:execute") -> dict:
    url = "http://testserver" + path
    return {"Authorization": f"Bearer {executor.token(scope)}", "DPoP": executor.dpop("POST", url)}


def call_execute(client, executor, *, ticket_id="T-000482", host_id="nas-01", op_id="op-1") -> dict:
    """Invoke execute_approved_plan and return the tool's structuredContent (run result / reject)."""
    env = client.post("/mcp/tools/execute_approved_plan",
                      headers=exec_headers(executor),
                      json={"ticket_id": ticket_id, "host_id": host_id, "op_id": op_id}).json()
    return env.get("structuredContent", env)
