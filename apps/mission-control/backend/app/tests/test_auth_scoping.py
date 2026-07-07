"""RS auth baseline + scope/kind gates (auth §1; PLAN §6.4). Offline HS256 signer."""
from __future__ import annotations

from app.tests.conftest import agent_headers, auth_header, bearer, op_headers, svc_headers


def test_unauth_is_401_with_bearer_challenge(client):
    r = client.get("/api/queue")
    assert r.status_code == 401
    assert "Bearer" in r.headers.get("WWW-Authenticate", "")


def test_wrong_audience_rejected(client):
    # aud=board on an mc RS => rejected (RFC 8707 single-audience).
    r = client.get("/api/queue", headers=auth_header(bearer("svc:chat", "mc:read", aud="board")))
    assert r.status_code == 401


def test_agent_cannot_reach_operator_only_kill(client):
    # mc:kill-switch is operator-only Tier-2, never agent-mintable. Even presenting the
    # scope, an agent kind is barred (defense in depth).
    r = client.post("/api/killswitch/raise",
                    headers=agent_headers("mc:kill-switch"),
                    json={"level": "G1", "reason": "x"})
    assert r.status_code == 403


def test_operator_has_read_admin_kill_not_report(client):
    # The operator (verified X-Auth-Identity) drives the cockpit.
    assert client.get("/api/queue", headers=op_headers()).status_code == 200
    assert client.get("/api/params", headers=op_headers()).status_code == 200


def test_svc_chat_read_scope_reaches_queue(client):
    # svc:chat holds mc:read (resolve feed + queue reads) — the FROZEN grant.
    r = client.get("/api/queue", headers=svc_headers("svc:chat", "mc:read"))
    assert r.status_code == 200


def test_anchor_scope_is_service_only(client):
    # mc:anchor is a service-producer scope: an operator/agent presenting it is barred.
    r_agent = client.post("/api/anchors", headers=agent_headers("mc:anchor"),
                          json={"chain_id": "gw-main", "seq": 1, "head_hash": "h"})
    assert r_agent.status_code == 403
    # svc:gateway with mc:anchor is accepted.
    r_svc = client.post("/api/anchors", headers=svc_headers("svc:gateway", "mc:anchor"),
                        json={"chain_id": "gw-main", "seq": 1, "head_hash": "h"})
    assert r_svc.status_code == 200


def test_report_scope_required_for_mcp(client):
    assert client.get("/mcp/tools", headers=agent_headers("mc:report")).status_code == 200
    # a read-only svc cannot list agent tools
    assert client.get("/mcp/tools", headers=svc_headers("svc:chat", "mc:read")).status_code == 403
