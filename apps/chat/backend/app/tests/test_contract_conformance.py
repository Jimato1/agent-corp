"""Contract conformance: envelope shape, id formats, scope slice, priority bands,
and the spoofing-closed-by-construction guarantee (agent_id is never caller-supplied)."""
from __future__ import annotations

from app.authn.principal import SCOPE_MANAGE, SCOPE_POST, SCOPE_READ
from app.ids import new_broadcast_id, new_notification_id
from app.schemas import clamp_priority
from .conftest import agent_headers, op_headers

_ENVELOPE_KEYS = {
    "notification_id", "created_at", "agent_id", "agent_kind", "kind", "priority",
    "title", "body", "body_html", "tags", "ticket_id", "fencing_token",
    "source_system", "source_kind", "source_id", "deep_link", "repeat_count",
    "last_seen_at", "acked_at", "acked_by", "resolved_at", "resolved_source",
}


def test_envelope_shape(client):
    nid = client.post("/api/notifications", json={
        "kind": "done", "title": "t", "body": "b", "op_id": "c1"}, headers=agent_headers()).json()["notification_id"]
    env = client.get(f"/api/notifications/{nid}", headers=op_headers()).json()
    assert _ENVELOPE_KEYS.issubset(env.keys())


def test_id_formats():
    assert new_notification_id().startswith("N-")   # IDENTIFIERS: N- + ULID
    assert new_broadcast_id().startswith("B-")       # app-internal, B- + ULID
    assert len(new_notification_id()) == 2 + 26      # prefix + 26-char ULID


def test_scope_slice_constants():
    # PLAN §5 countersign — the exact three flat scopes, no variants.
    assert (SCOPE_POST, SCOPE_READ, SCOPE_MANAGE) == ("chat:post", "chat:read", "chat:manage")


def test_priority_bands_clamp():
    assert clamp_priority("escalation", 1) == 5      # escalation fixed at 5
    assert clamp_priority("needs_review", None) == 4
    assert clamp_priority("needs_review", 1) == 3    # clamped up into 3–4
    assert clamp_priority("done", 5) == 2            # clamped down into 1–2
    assert clamp_priority("done", None) == 2


def test_agent_id_is_stamped_from_token_not_body(client):
    # A body that tries to spoof agent_id is ignored: the stored agent_id is the token sub.
    nid = client.post("/api/notifications", json={
        "kind": "done", "title": "t", "body": "b", "op_id": "spoof-1",
        "agent_id": "agent:someone-else"}, headers=agent_headers()).json()["notification_id"]
    env = client.get(f"/api/notifications/{nid}", headers=op_headers()).json()
    assert env["agent_id"] == "agent:patcher-07"


def test_action_class_manifest():
    from app.mcp.surface import _POST_NOTIFICATION_SCHEMA
    assert _POST_NOTIFICATION_SCHEMA["actionClass"] == "write-benign"


def test_healthz_is_unauthenticated(client):
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_broadcast_lifecycle_states(client):
    b = client.post("/api/broadcasts", json={"body": "window opens", "priority": 3}, headers=op_headers()).json()
    assert b["broadcast_id"].startswith("B-")
    assert b["state"] == "active"
    rev = client.post(f"/api/broadcasts/{b['broadcast_id']}/revoke", headers=op_headers()).json()
    assert rev["state"] == "revoked"
