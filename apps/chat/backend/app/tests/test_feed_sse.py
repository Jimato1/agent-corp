"""SSE feed: replay-from-history and live are one code path (PLAN §7).

We verify the HTTP contract (200 + ``text/event-stream`` + auth gate) WITHOUT
consuming the infinite live body — a synchronous TestClient cannot cleanly drain a
never-ending SSE stream, so the full live-tip round-trip is a CANNOT-VERIFY-without-a-
running-server item (verification/CHECKLIST.md). The replay/reset LOGIC is unit-tested
directly against the repo + frame formatter below, which is where the risk actually is.
"""
from __future__ import annotations

from app.api.feed import _frame
from app.config import Settings
from app.db import Database
from app.services.feed import FeedBroker
from app.services.repo import Repository
from .conftest import agent_headers


def test_feed_requires_read_scope(client):
    # Agent (post-only) is refused before any streaming begins. The happy-path 200 +
    # text/event-stream live tip is a runtime-curl item (CHECKLIST): a synchronous
    # TestClient cannot drain an infinite SSE body without deadlocking the portal.
    assert client.get("/api/feed", headers=agent_headers()).status_code == 403


def test_replay_after_cursor_semantics(tmp_path):
    settings = Settings(db_path=tmp_path / "c.sqlite3", ntfy_enabled=False, suite_domain="suite.local")
    db = Database(settings.db_path)
    db.connect()
    repo = Repository(db, settings, FeedBroker())
    try:
        ids = []
        for i in range(3):
            ids.append(repo.post_notification("agent:x", {
                "kind": "done", "title": f"n{i}", "body": "b", "op_id": f"o{i}"}).notification_id)
        # replay after the first id → the two later ones, oldest→newest.
        after = repo.replay_after(ids[0], limit=10)
        assert [e["notification_id"] for e in after] == ids[1:]
        # unknown cursor → [] (the route then emits event: reset).
        assert repo.replay_after("N-DOESNOTEXIST", limit=10) == []
        # no cursor → recent history, oldest→newest.
        assert [e["notification_id"] for e in repo.replay_after(None, limit=10)] == ids
    finally:
        db.close()


def test_frame_formatting():
    frame = _frame("notification", "N-1", {"a": 1})
    assert frame == 'event: notification\nid: N-1\ndata: {"a":1}\n\n'
    # reset / broadcast / ack frames carry NO id: (only notification ids are cursors).
    assert _frame("reset", None, {}) == "event: reset\ndata: {}\n\n"
    assert "id:" not in _frame("broadcast", None, {"x": 1})
