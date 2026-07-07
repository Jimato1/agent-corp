"""Contract conformance: the verdict shape (cmdb-gateway-policy.md §1), the signed
verdict token (cmdb-gateway-verdict-token.md §1-§3), host-facts (cmdb-library-hostfacts.md),
and dual-mounting of the contract (/v1) + console (/api/v1) surfaces."""
from __future__ import annotations

import json

from app.authn.jwks import b64u_decode
from app.tests.conftest import mint_access, read_headers, seed

GW = {"Authorization": f"Bearer {mint_access('svc:gateway', 'cmdb:read-policy')}"}
TIER_APPROVER = {"Authorization": f"Bearer {mint_access('svc:tier-approver', 'cmdb:read-policy')}"}

_REQUIRED_VERDICT_FIELDS = {
    "verdict", "in_window", "window_id", "window_opens_at", "window_closes_at",
    "seconds_remaining", "grace", "active_freeze", "tier", "approval_mode", "decision_id",
    "evaluated_at", "valid_until", "policy_version", "tzid", "reason",
    # additive (sandbox seam):
    "host_class", "verdict_basis",
}


def _in_window_host(app):
    seed(app, {
        "hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2",
                            "windows": [{"id": "w", "kind": "allow", "tzid": "Etc/UTC",
                                         "rrule": "FREQ=DAILY", "start_local": "00:00", "end_local": "23:59"}]},
        "catalog/pkg.md": {"playbook_key": "pkg", "action_class": "package_update",
                           "rollback_declared": True, "applicable_tiers": ["tier2"]},
    })


def test_verdict_shape_has_all_frozen_fields(app_client):
    app, client = app_client
    _in_window_host(app)
    v = client.post("/v1/decision", json={"host_id": "web-04", "action_class": "package_update"},
                    headers=GW).json()["verdict"]
    assert _REQUIRED_VERDICT_FIELDS.issubset(set(v))


def test_signed_verdict_token_verifies_with_verdict_jwks(app_client):
    app, client = app_client
    _in_window_host(app)
    r = client.post("/v1/decision", json={"host_id": "web-04", "action_class": "package_update",
                                          "req_nonce": "n-123"}, headers=GW).json()
    token = r["token"]
    assert token
    h_seg, p_seg, s_seg = token.split(".")
    header = json.loads(b64u_decode(h_seg))
    claims = json.loads(b64u_decode(p_seg))
    assert header["typ"] == "cmdb-verdict+jws" and header["alg"] == "EdDSA"
    assert claims["iss"] == "cmdb" and claims["aud"] == "gateway"
    assert claims["jti"] == claims["decision_id"] and claims["nonce"] == "n-123"
    # The signature verifies against the served verdict JWKS (Ed25519, CMDB-local key).
    jwks = client.get("/v1/verdict-jwks").json()
    jwk = next(k for k in jwks["keys"] if k["kid"] == header["kid"])
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
    pk = Ed25519PublicKey.from_public_bytes(b64u_decode(jwk["x"]))
    pk.verify(b64u_decode(s_seg), f"{h_seg}.{p_seg}".encode())  # raises on failure


def test_tier_approver_gets_board_audience_not_gateway(app_client):
    app, client = app_client
    _in_window_host(app)
    r = client.post("/v1/decision", json={"host_id": "web-04", "action_class": "package_update"},
                    headers=TIER_APPROVER).json()
    claims = json.loads(b64u_decode(r["token"].split(".")[1]))
    assert claims["aud"] == "board"  # anti-relay: never a gateway-redeemable permit


def test_host_facts_shape_and_404(app_client):
    app, client = app_client
    seed(app, {"hosts/nas-01.md": {"host_id": "nas-01", "class": "managed", "tier": "tier0",
                                   "facts_override": {"os_family": "linux", "distro": "debian",
                                                      "distro_version": "12", "arch": "x86_64"}}})
    r = client.get("/v1/hosts/nas-01/facts", headers=read_headers())
    assert r.status_code == 200
    f = r.json()
    assert set(f) >= {"os_family", "distro", "distro_version", "arch", "package_manager", "eol_date"}
    assert "tier" not in f and "windows" not in f  # facts ONLY — the seam must not widen
    assert f["facts_provenance"]["os_family"] == "operator"
    # honest 404 for an unknown host
    assert client.get("/v1/hosts/ghost/facts", headers=read_headers()).status_code == 404


def test_contract_and_console_surfaces_both_serve(app_client):
    app, client = app_client
    _in_window_host(app)
    a = client.post("/v1/decision", json={"host_id": "web-04", "action_class": "package_update"}, headers=GW)
    b = client.post("/api/v1/decision", json={"host_id": "web-04", "action_class": "package_update"}, headers=GW)
    assert a.status_code == b.status_code == 200
    assert a.json()["verdict"]["verdict"] == b.json()["verdict"]["verdict"]
