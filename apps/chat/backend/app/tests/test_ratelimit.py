"""Chat's own per-sub post ceiling + the meta-notification (PLAN §11.3)."""
from __future__ import annotations

from .conftest import agent_headers, op_headers


def _post(client, kind, i):
    return client.post("/api/notifications", json={
        "kind": kind, "title": f"n{i}", "body": "b", "op_id": f"rl-{kind}-{i}"}, headers=agent_headers())


def test_general_ceiling_then_429_and_meta_notification(client):
    # settings.rate_post_per_hour == 5 in tests.
    for i in range(5):
        assert _post(client, "done", i).status_code == 200
    blocked = _post(client, "done", 99)
    assert blocked.status_code == 429
    assert blocked.headers.get("Retry-After")

    # A system-authored meta-notification was posted (operator is informed, not silent).
    feed = client.get("/api/notifications", headers=op_headers()).json()["notifications"]
    metas = [n for n in feed if n["system_authored"] and "rate-limited" in n["title"]]
    assert len(metas) == 1
    assert metas[0]["priority"] <= 3  # meta-notifications never loud


def test_escalation_has_headroom_above_general_ceiling(client):
    for i in range(5):
        _post(client, "done", i)  # exhaust the general ceiling
    # escalations still go through, up to their own ceiling (3 in tests).
    assert _post(client, "escalation", 0).status_code == 200
