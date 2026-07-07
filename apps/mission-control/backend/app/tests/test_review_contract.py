"""Producer-side conformance to the FROZEN mc-chat-review-resolve.md contract.

Consumers (Chat) are ALREADY built against this scheme, so the producer must match it
EXACTLY. Covers: the review-item URL scheme (§2), the 302 alias, the resolve-event shape
+ outcome mapping (§3), no-new-identifier (§1), and the never-a-bare-404 rule.
"""
from __future__ import annotations

from app.services.upstream import Sourced
from app.tests.conftest import op_headers, svc_headers


class _FakeBoard:
    base_url = "http://board:8080"

    def __init__(self, items=None, ticket=None):
        self._items = items or []
        self._ticket = ticket

    async def get_queue(self):
        return Sourced({"items": self._items}, "board", 0.1, stale=False)

    async def get_ticket(self, ticket_id):
        return Sourced(self._ticket, "board", 0.1, stale=self._ticket is None)

    async def get_wip(self):
        return Sourced({"global": 22, "cap": 30, "lock_generation": {}}, "board", 0.1)

    async def get_agent_lineage(self, sub):
        return Sourced({"nodes": []}, "board", 0.1)


def test_review_url_scheme_frozen(client):
    # https://mc.<SUITE_DOMAIN>/review/<ticket_id> — verbatim, opaque, url-encoded.
    repo = client.app.state.repo
    assert repo.s.review_url("T-000123") == "https://mc.suite.local/review/T-000123"


def test_ticket_alias_302_to_review(client):
    r = client.get("/ticket/T-000123", follow_redirects=False)
    assert r.status_code == 302
    assert r.headers["location"] == "/review/T-000123"


def test_queue_projection_carries_gate_provenance_and_url(client):
    client.app.state.board = _FakeBoard(items=[
        {"ticket_id": "T-000123", "state": "awaiting_approval", "tier": "tier2",
         "host_originated": True, "provenance_note": "Wazuh alert fields", "proposer": "agent:patcher-07"},
        {"ticket_id": "T-000217", "state": "needs_review", "tier": "tier2",
         "provenance": "gateway-delivered", "proposer": "agent:indexer-02"},
    ])
    r = client.get("/api/queue", headers=op_headers())
    assert r.status_code == 200
    body = r.json()
    items = {i["ticket_id"]: i for i in body["items"]}
    # host-originated => UNTRUSTED, auto-approve-lane INELIGIBLE (rendered, not decided).
    assert items["T-000123"]["provenance"]["tier"] == "untrusted"
    assert items["T-000123"]["provenance"]["auto_lane_eligible"] is False
    assert items["T-000123"]["review_url"] == "https://mc.suite.local/review/T-000123"
    assert items["T-000217"]["provenance"]["tier"] == "verified"
    # the full 11-state superset is exposed (not an invented subset).
    assert len(body["state_superset"]) == 11
    assert "executing" in body["state_superset"] and "verifying" in body["state_superset"]


def test_queue_item_never_bare_404(client):
    client.app.state.board = _FakeBoard(ticket=None)
    r = client.get("/api/queue/T-999999", headers=op_headers())
    assert r.status_code == 200
    body = r.json()
    assert body["in_queue"] is False
    assert body["message"] == "not in queue"
    assert body["review_url"] == "https://mc.suite.local/review/T-999999"


def test_resolve_event_shape_matches_frozen_contract(client):
    repo = client.app.state.repo
    seq = repo.record_resolution("T-000123", "awaiting_approval", "approved", "operator", "2026-07-06T09:44:02Z")
    ev = repo._resolve_event(seq)
    # Exact FROZEN field set + values (contract §3).
    assert ev == {
        "schema_version": 1,
        "ticket_id": "T-000123",
        "gate": "awaiting_approval",
        "outcome": "approved",
        "actor_kind": "operator",
        "resolved_at": "2026-07-06T09:44:02Z",
        "review_url": "https://mc.suite.local/review/T-000123",
    }
    # resolve_seq is the monotonic Last-Event-ID cursor; a too-old cursor is out of window.
    assert repo.seq_of(str(seq)) == seq
    assert repo.seq_of("999999") is None


def test_resolve_outcome_mapping(client):
    from app.services.pollers import ResolvePoller
    m = ResolvePoller._outcome
    assert m("awaiting_approval", "approved") == "approved"
    assert m("awaiting_approval", "executing") == "approved"   # consumed => approved
    assert m("awaiting_approval", "cancelled") == "rejected"
    assert m("needs_review", "done") == "review_cleared"
    assert m("needs_review", "todo") == "reworked"


def test_actor_kind_clamped_to_closed_enum(client):
    # actor_kind is a CLOSED enum on the frozen contract; a malformed/absent Board value must never
    # propagate into the emitted resolve event — it clamps to the safe human actor.
    from app.services.pollers import ResolvePoller
    k = ResolvePoller._actor_kind
    assert k("operator") == "operator"
    assert k("cmdb_tier_policy") == "cmdb_tier_policy"
    assert k("root") == "operator"          # unknown => operator
    assert k(None) == "operator"            # absent  => operator
    assert k("") == "operator"


def test_resolve_feed_scope_and_replay(client):
    # svc:chat mc:read may re-sync from the queue read (the reset recovery path).
    assert client.get("/api/queue", headers=svc_headers("svc:chat", "mc:read")).status_code == 200
    repo = client.app.state.repo
    s1 = repo.record_resolution("T-1", "needs_review", "review_cleared", "operator", "2026-07-06T10:00:00Z")
    s2 = repo.record_resolution("T-2", "awaiting_approval", "rejected", "operator", "2026-07-06T10:01:00Z")
    replay = repo.resolve_replay_after(str(s1))
    assert [e["seq"] for e in replay] == [s2]
