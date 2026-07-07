"""MCP agent surface — thin, flat, display-only (PLAN §6.4)."""
from __future__ import annotations

from app.mcp.surface import _TOOLS
from app.tests.conftest import agent_headers


def test_exactly_two_flat_display_only_tools(client):
    r = client.get("/mcp/tools", headers=agent_headers("mc:report"))
    assert r.status_code == 200
    names = [t["name"] for t in r.json()["tools"]]
    assert names == ["report_status", "request_escalation"]
    for t in r.json()["tools"]:
        schema = t["inputSchema"]
        assert schema["additionalProperties"] is False           # closed schema
        # flat, low-arity, enum-biased: every property is a scalar (no nested objects/arrays)
        assert all(p.get("type") in ("string", "integer", "number", "boolean")
                   for p in schema["properties"].values())
        assert t["actionClass"] == "write-benign"


def test_report_status_is_display_only_and_stamps_sub(client):
    r = client.post("/mcp/tools/report_status", headers=agent_headers("mc:report"),
                    json={"op_id": "op-1", "ticket_id": "T-1", "status_note": "retrying apt lock"})
    assert r.status_code == 200
    assert r.json()["isError"] is False
    # sub is stamped server-side (never a caller param) — the audit row attributes the caller.
    audit = client.app.state.repo.audit_tail()
    assert audit[0]["actor_sub"] == "agent:patcher-07"
    assert audit[0]["action"] == "report_status"


def test_request_escalation_never_mutates_board(client):
    r = client.post("/mcp/tools/request_escalation", headers=agent_headers("mc:escalate"),
                    json={"op_id": "op-2", "ticket_id": "T-1", "severity": "urgent", "reason": "apt held 14m"})
    assert r.status_code == 200
    body = r.json()
    assert body["isError"] is False and body["structuredContent"]["status"] == "pinned"
    # It is a pinned attention item on MC's OWN surface — the description states it never
    # touches Board state (coordination boundary).
    desc = next(t for t in _TOOLS if t["name"] == "request_escalation")["description"]
    assert "NEVER mutates Board state" in desc


def test_escalate_scope_required(client):
    # a report-only token cannot call escalate.
    r = client.post("/mcp/tools/request_escalation", headers=agent_headers("mc:report"),
                    json={"op_id": "x", "reason": "y"})
    assert r.status_code == 403


def test_bad_schema_returns_iserror_not_http_error(client):
    r = client.post("/mcp/tools/report_status", headers=agent_headers("mc:report"),
                    json={"op_id": "x"})   # missing required status_note
    assert r.status_code == 200            # transport OK
    assert r.json()["isError"] is True     # business failure => structured isError (Board convention)
