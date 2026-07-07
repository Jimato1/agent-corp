"""Authz + the agent MCP surface: agents can read (query policy) but the surface has ZERO
mutation verbs; read scope is required; the surface is read-only by construction (§7.2)."""
from __future__ import annotations

from app.mcp.surface import TOOLS, _DISPATCH
from app.tests.conftest import mint_access, read_headers, seed


def agent(scope="cmdb:read-policy", sub="agent:worker-1"):
    return {"Authorization": f"Bearer {mint_access(sub, scope)}"}


def test_mcp_surface_is_read_only_by_construction():
    # Every registered tool is a read; the dispatch table matches the schemas exactly.
    assert {t["name"] for t in TOOLS} == set(_DISPATCH)
    assert all(t["actionClass"] == "read" for t in TOOLS)
    assert len(TOOLS) == 10  # the ten read tools; no mutation verb exists


def test_mcp_tools_discovery_requires_read_scope(app_client):
    app, client = app_client
    assert client.get("/mcp/tools").status_code == 401  # no token
    assert client.get("/mcp/tools", headers=agent()).status_code == 200
    # An agent with the wrong scope is refused.
    assert client.get("/mcp/tools", headers=agent("chat:post")).status_code == 403


def test_agent_is_actionable_now_is_advisory_unsigned(app_client):
    app, client = app_client
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"}})
    r = client.post("/mcp/tools/is_actionable_now",
                    json={"host_id": "web-04", "action_class": "package_update"}, headers=agent())
    assert r.status_code == 200
    body = r.json()
    assert body["isError"] is False
    assert body["structuredContent"]["verdict"] == "deny"  # no window => deny, a valid answer


def test_agent_cannot_invoke_a_mutation_verb(app_client):
    app, client = app_client
    # There is no policy-write tool to call; an attempt to invoke one is an unknown_tool error.
    r = client.post("/mcp/tools/write_policy", json={}, headers=agent())
    assert r.json()["isError"] is True and r.json()["structuredContent"]["code"] == "unknown_tool"


def test_agent_cannot_reach_the_write_api(app_client):
    app, client = app_client
    seed(app, {"hosts/web-04.md": {"host_id": "web-04", "class": "managed", "tier": "tier2"}})
    # The propose endpoint is a holder path — an agent bearer never satisfies it.
    r = client.post("/v1/policy/propose",
                    json={"target_kind": "host", "key": "web-04", "action": "upsert", "frontmatter": {}},
                    headers=agent())
    assert r.status_code in (401, 403)
    # And cmdb:manage benign ops bar agent/service kinds.
    assert client.post("/v1/sync/trigger", headers=agent("cmdb:manage")).status_code == 403


def test_read_endpoints_require_read_scope(app_client):
    app, client = app_client
    assert client.get("/v1/hosts").status_code == 401
    assert client.get("/v1/hosts", headers=read_headers()).status_code == 200
