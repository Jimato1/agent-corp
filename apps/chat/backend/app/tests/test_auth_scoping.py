"""The load-bearing invariant: agents can ONLY post — never read, ack, or broadcast.

Enforced two ways (defense in depth): agents never hold ``chat:read``/``chat:manage``
(auth grant-time), AND the RS bars agent/service kinds from read/manage endpoints
even if a token somehow presented the scope (PLAN §5; UI_SPEC cross-app discipline)."""
from __future__ import annotations

from .conftest import agent_headers, auth_header, bearer, id_header, identity, op_headers


def test_agent_can_post(client):
    r = client.post("/api/notifications", json={
        "kind": "escalation", "title": "NAS reboot hung", "body": "host unreachable", "op_id": "e1"},
        headers=agent_headers())
    assert r.status_code == 200


def test_agent_cannot_read_feed_history(client):
    r = client.get("/api/notifications", headers=agent_headers())
    assert r.status_code == 403
    assert r.json()["error"]["code"] == "insufficient_scope"


def test_agent_cannot_open_sse_feed(client):
    r = client.get("/api/feed", headers=agent_headers())
    assert r.status_code == 403


def test_agent_cannot_ack(client):
    nid = client.post("/api/notifications", json={
        "kind": "done", "title": "done", "body": "b", "op_id": "d1"}, headers=agent_headers()).json()["notification_id"]
    r = client.post(f"/api/notifications/{nid}/ack", headers=agent_headers())
    assert r.status_code == 403


def test_agent_cannot_broadcast(client):
    r = client.post("/api/broadcasts", json={"body": "hi fleet", "priority": 3}, headers=agent_headers())
    assert r.status_code == 403


def test_agent_cannot_list_broadcasts(client):
    assert client.get("/api/broadcasts", headers=agent_headers()).status_code == 403


def test_agent_with_forged_read_scope_still_barred(client):
    """Even if a token carried chat:read (auth never grants it), the RS kind-gate bars
    an agent principal from read/manage — belt-and-suspenders by construction."""
    forged = auth_header(bearer("agent:evil", "chat:post chat:read chat:manage"))
    assert client.get("/api/notifications", headers=forged).status_code == 403
    assert client.post("/api/broadcasts", json={"body": "x", "priority": 3}, headers=forged).status_code == 403


def test_agent_identity_header_barred_from_read(client):
    hdr = id_header(identity("agent:sneaky", principal_type="agent"))
    assert client.get("/api/notifications", headers=hdr).status_code == 403


def test_operator_can_read_and_manage(client):
    assert client.get("/api/notifications", headers=op_headers()).status_code == 200
    assert client.get("/api/broadcasts", headers=op_headers()).status_code == 200
    r = client.post("/api/broadcasts", json={"body": "window opens 22:00", "priority": 3}, headers=op_headers())
    assert r.status_code == 200


def test_missing_credential_is_401(client):
    assert client.get("/api/notifications").status_code == 401
    assert client.post("/api/notifications", json={
        "kind": "done", "title": "t", "body": "b", "op_id": "z"}).status_code == 401
