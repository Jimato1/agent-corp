"""D-7 tier-0 sandbox: the degenerated four-holder chain (no Vault, no host param), the
sandbox_exec carve-out both directions, harness attestation, and the non-leak barriers.
gateway-cmdb-library-sandbox.md §G."""
from __future__ import annotations

from app.mcp.surface import TOOLS
from .conftest import mint_access


def _sandbox_headers(sub="agent:curator-1", scope="gateway:sandbox"):
    return {"Authorization": f"Bearer {mint_access(sub, scope)}"}


def _call_sandbox(client, clients, *, profile="sbx_pytest"):
    return client.post("/mcp/tools/run_sandbox_test", headers=_sandbox_headers(),
                       json={"ticket_id": "T-000733", "profile_key": profile,
                             "input_ref": "note:N-x@rev14", "op_id": "op-s"}).json()


def _arrange_sandbox(clients):
    clients.board.ticket = {"exists": True, "status": "in_progress", "claimed_by": "agent:curator-1",
                            "host_id": None, "fencing_token": 5}
    clients.cmdb.host_class = "disposable"
    clients.cmdb.verdict_basis = "sandbox_carve_out"
    clients.cmdb.verdict = "permit"


def test_sandbox_happy_captures_evidence_and_mints_harness(make_app):
    app, client, clients = make_app()
    _arrange_sandbox(clients)
    env = _call_sandbox(client, clients)
    sc = env["structuredContent"]
    assert sc["isError"] is False, sc
    assert sc["harness_version"].startswith("hv-")
    ev = app.state.sandbox.get_evidence(sc["run_id"])
    assert ev and ev["profile_key"] == "sbx_pytest" and ev["harness_version"] == sc["harness_version"]


def test_sandbox_needs_disposable_class_both_directions(make_app):
    app, client, clients = make_app()
    _arrange_sandbox(clients)
    clients.cmdb.host_class = "managed"          # a managed verdict on the sandbox branch → refuse
    env = _call_sandbox(client, clients)
    assert env["structuredContent"]["reason"] == "WRONG_TARGET_CLASS"


def test_sandbox_needs_carve_out_basis(make_app):
    app, client, clients = make_app()
    _arrange_sandbox(clients)
    clients.cmdb.verdict_basis = None            # not the carve-out
    env = _call_sandbox(client, clients)
    assert env["structuredContent"]["reason"] == "WRONG_TARGET_CLASS"


def test_sandbox_tool_has_no_host_parameter():
    sbx = next(t for t in TOOLS if t["name"] == "run_sandbox_test")
    props = set(sbx["inputSchema"]["properties"])
    assert props == {"ticket_id", "profile_key", "input_ref", "op_id"}
    assert "host_id" not in props                # a real host_id is UNREPRESENTABLE (§G4)


def test_sandbox_branch_is_vault_free(make_app):
    # Even with Vault denying everything, the sandbox path succeeds — it has NO Vault client (§G3).
    app, client, clients = make_app()
    _arrange_sandbox(clients)
    clients.vault.status = 403
    env = _call_sandbox(client, clients)
    assert env["structuredContent"]["isError"] is False


def test_sandbox_module_imports_no_vault_client():
    import app.sandbox.harness as h
    src = open(h.__file__, encoding="utf-8").read()
    assert "VaultClient" not in src and "vault.redeem" not in src   # structural non-leak barrier


def test_sandbox_refused_without_claim(make_app):
    app, client, clients = make_app()
    _arrange_sandbox(clients)
    clients.board.ticket["claimed_by"] = "agent:someone-else"
    env = _call_sandbox(client, clients)
    assert env["structuredContent"]["reason"] == "NOT_CLAIMANT"


def test_sandbox_kill_switch_covered(make_app):
    app, client, clients = make_app()
    _arrange_sandbox(clients)
    app.state.kill.observe(epoch=1, level="G1")
    env = _call_sandbox(client, clients)
    assert env["structuredContent"]["reason"] == "HALTED"


def test_sandbox_rejects_malformed_input_ref(make_app):
    app, client, clients = make_app()
    _arrange_sandbox(clients)
    env = client.post("/mcp/tools/run_sandbox_test", headers=_sandbox_headers(),
                      json={"ticket_id": "T-000733", "profile_key": "sbx_pytest",
                            "input_ref": "note; rm -rf /", "op_id": "op-s"}).json()
    assert env["structuredContent"]["reason"] == "BAD_INPUT_REF"


def test_execute_and_sandbox_scopes_never_coexist(make_app):
    app, client, _c = make_app()
    # A principal carrying BOTH scopes is refused structurally (grant-time exclusion §10 G2).
    headers = {"Authorization": f"Bearer {mint_access('agent:x', 'gateway:execute gateway:sandbox')}"}
    r = client.post("/mcp/tools/run_sandbox_test", headers=headers,
                    json={"ticket_id": "T-1", "profile_key": "sbx_pytest", "input_ref": "x", "op_id": "o"})
    assert r.status_code == 403
