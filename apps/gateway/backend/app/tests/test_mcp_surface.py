"""MCP agent surface — structural absence + scope gating (PLAN §11). The surface is thin: one
execute tool, one sandbox tool, reads. A read token cannot execute; a wrong-audience token is
refused; unknown/structurally-absent verbs 404."""
from __future__ import annotations

from .conftest import exec_headers, mint_access


def test_tools_discovery_requires_read_scope(make_app):
    app, client, _c = make_app()
    r = client.get("/mcp/tools", headers={"Authorization": f"Bearer {mint_access('agent:x', 'gateway:read')}"})
    assert r.status_code == 200
    names = {t["name"] for t in r.json()["tools"]}
    assert names == {"execute_approved_plan", "run_sandbox_test", "get_execution_status",
                     "get_host_health", "get_fleet_posture", "get_sandbox_evidence", "list_playbooks"}


def test_tools_discovery_denied_without_any_scope(make_app):
    app, client, _c = make_app()
    r = client.get("/mcp/tools", headers={"Authorization": f"Bearer {mint_access('agent:x', 'notreal:scope')}"})
    assert r.status_code == 403


def test_read_token_cannot_execute(make_app, executor):
    app, client, _c = make_app()
    # A gateway:read token (no holder scope, no cnf) cannot drive execute_approved_plan.
    r = client.post("/mcp/tools/execute_approved_plan",
                    headers={"Authorization": f"Bearer {mint_access('agent:x', 'gateway:read')}"},
                    json={"ticket_id": "T-1", "host_id": "h", "op_id": "o"})
    assert r.json()["isError"] is True
    assert len(app.state.dispatcher.dispatched) == 0


def test_wrong_audience_token_refused(make_app):
    app, client, _c = make_app()
    # aud != gateway → refused at validation (audience↔holder binding).
    tok = mint_access("agent:x", "gateway:read", aud="board")
    r = client.get("/mcp/tools", headers={"Authorization": f"Bearer {tok}"})
    assert r.status_code == 401


def test_unknown_tool_is_not_found(make_app):
    app, client, _c = make_app()
    r = client.post("/mcp/tools/run_command",
                    headers={"Authorization": f"Bearer {mint_access('agent:x', 'gateway:read')}"},
                    json={"cmd": "whoami"})
    assert r.json()["isError"] is True
    assert r.json()["structuredContent"]["code"] == "unknown_tool"


def test_reads_work_with_read_scope(make_app, executor):
    app, client, _c = make_app()
    # Do a real run first so there is something to read.
    from .conftest import call_execute
    out = call_execute(client, executor)
    r = client.post("/mcp/tools/get_execution_status",
                    headers={"Authorization": f"Bearer {mint_access('agent:x', 'gateway:read')}"},
                    json={"run_id": out["run_id"]})
    assert r.json()["isError"] is False
    assert r.json()["structuredContent"]["run_id"] == out["run_id"]


def test_list_playbooks_returns_catalog(make_app):
    app, client, _c = make_app()
    r = client.post("/mcp/tools/list_playbooks",
                    headers={"Authorization": f"Bearer {mint_access('agent:x', 'gateway:read')}"}, json={})
    keys = {p["playbook_key"] for p in r.json()["structuredContent"]["playbooks"]}
    assert "patch_debian" in keys and "reboot_host" in keys
