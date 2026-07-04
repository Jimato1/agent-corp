"""Core API: post → list → get → ack, plus op_id idempotency and dedup collapse."""
from __future__ import annotations

from .conftest import agent_headers, op_headers


def _post(client, **over):
    body = {"kind": "needs_review", "title": "Research note ready", "body": "safe-patch practice",
            "op_id": "op-1", "ticket_id": "T-000210", "source_system": "mc",
            "source_kind": "review", "source_id": "T-000210"}
    body.update(over)
    return client.post("/api/notifications", json=body, headers=agent_headers())


def test_post_then_list_and_get(client):
    r = _post(client)
    assert r.status_code == 200, r.text
    nid = r.json()["notification_id"]
    assert nid.startswith("N-")

    lst = client.get("/api/notifications", headers=op_headers())
    assert lst.status_code == 200
    ids = [n["notification_id"] for n in lst.json()["notifications"]]
    assert nid in ids

    det = client.get(f"/api/notifications/{nid}", headers=op_headers())
    assert det.status_code == 200
    env = det.json()
    assert env["kind"] == "needs_review"
    assert env["priority"] == 4                      # clamped default for needs_review
    assert env["agent_id"] == "agent:patcher-07"     # stamped from the token
    assert env["deep_link"]["url"] == "https://mc.suite.local/review/T-000210"
    assert env["deep_link"]["caption"] == "target wins"
    assert "body_html" in env and "audit" in env


def test_op_id_idempotency(client):
    a = _post(client, op_id="dup").json()["notification_id"]
    b = _post(client, op_id="dup", title="different title").json()["notification_id"]
    assert a == b  # a retry returns the existing id, never a duplicate row


def test_dedup_collapse_bumps_repeat(client):
    a = _post(client, op_id="x1", dedup_key="same-condition").json()["notification_id"]
    b = _post(client, op_id="x2", dedup_key="same-condition").json()["notification_id"]
    assert a == b
    det = client.get(f"/api/notifications/{a}", headers=op_headers()).json()
    assert det["repeat_count"] == 1  # bumped once


def test_ack_and_batch_ack(client):
    nid = _post(client, op_id="ack-1").json()["notification_id"]
    r = client.post(f"/api/notifications/{nid}/ack", headers=op_headers())
    assert r.status_code == 200
    assert r.json()["acked_by"] == "op:ada"

    _post(client, op_id="ack-2")
    seq = client.get("/api/notifications", headers=op_headers()).json()["notifications"][0]["seq"]
    r = client.post("/api/notifications/ack", json={"up_to_seq": seq}, headers=op_headers())
    assert r.status_code == 200
    assert r.json()["acked_count"] >= 1
