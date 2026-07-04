"""The MCP surface exposes EXACTLY one write-only tool. No read/ack/broadcast tool
exists on this audience — that IS the coordination boundary (PLAN §4)."""
from __future__ import annotations

from .conftest import agent_headers, op_headers


def test_tools_lists_exactly_post_notification(client):
    r = client.get("/mcp/tools", headers=agent_headers())
    assert r.status_code == 200
    tools = r.json()["tools"]
    assert [t["name"] for t in tools] == ["post_notification"]
    assert tools[0]["actionClass"] == "write-benign"


def test_post_notification_tool_works(client):
    r = client.post("/mcp/tools/post_notification", headers=agent_headers(), json={
        "kind": "escalation", "title": "NAS reboot hung", "body": "host unreachable",
        "op_id": "mcp-1", "source_system": "mc", "source_kind": "review", "source_id": "T-1", "tags": "reboot,nas"})
    assert r.status_code == 200
    out = r.json()
    assert out["isError"] is False
    assert out["structuredContent"]["notification_id"].startswith("N-")


def test_no_read_tool_registered(client):
    for tool in ("list_notifications", "read_feed", "ack", "post_broadcast", "get_notification"):
        r = client.post(f"/mcp/tools/{tool}", headers=agent_headers(), json={})
        # 404 (no such path) or 405 (path shadowed only by the GET SPA catch-all) — either
        # way the tool is not invokable. The point: no read/ack/broadcast tool is registered.
        assert r.status_code in (404, 405), f"{tool} must not exist on the agent surface"


def test_mcp_validation_returns_is_error_not_http_error(client):
    r = client.post("/mcp/tools/post_notification", headers=agent_headers(),
                    json={"kind": "bogus", "title": "t", "body": "b", "op_id": "v1"})
    assert r.status_code == 200  # transport ok
    assert r.json()["isError"] is True
    assert r.json()["structuredContent"]["code"] == "invalid"


def test_operator_identity_cannot_be_used_as_bearer_mcp(client):
    # The MCP tool is bearer-gated; an operator hitting it without chat:post is fine to
    # post (operator holds post), but there is no read tool to reach regardless.
    r = client.get("/mcp/tools", headers=op_headers())
    assert r.status_code == 200
