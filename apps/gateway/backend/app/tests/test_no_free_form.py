"""No-free-form-command: the agent gets NO shell, NO free-form command, NO host list it can
widen. The wrapper STRUCTURALLY cannot forward module/module_args/cmdline (D-14). PLAN §4.2 /
§15-5."""
from __future__ import annotations

from app.engine.runner import (
    FORBIDDEN_RUNNER_KWARGS,
    DispatchSpec,
    _forbid_forward,
    build_runner_kwargs,
)
from app.mcp.surface import TOOLS
from .conftest import exec_headers


def test_runner_kwargs_never_contain_forbidden_keys():
    spec = DispatchSpec(run_id="R-1", playbook="patch_debian.yml",
                        extravars={"packages": ["openssl"]}, wall_clock_cap_s=600)
    kwargs = build_runner_kwargs(spec, private_data_dir="/x")
    assert not (FORBIDDEN_RUNNER_KWARGS & set(kwargs)), kwargs
    assert set(kwargs) == {"private_data_dir", "playbook", "extravars", "process_isolation", "timeout"}


def test_forbid_forward_refuses_injected_module():
    raised = False
    try:
        _forbid_forward({"playbook": "x.yml", "module": "shell", "module_args": "rm -rf /"})
    except RuntimeError:
        raised = True
    assert raised, "a forbidden runner kwarg must refuse to dispatch"


def test_execute_tool_schema_has_no_command_field():
    execute = next(t for t in TOOLS if t["name"] == "execute_approved_plan")
    props = set(execute["inputSchema"]["properties"])
    assert props == {"ticket_id", "host_id", "op_id"}          # names only — no command/extravars/host-list
    assert execute["inputSchema"]["additionalProperties"] is False


def test_agent_cannot_supply_a_command_argument(make_app, executor):
    app, client, _c = make_app()
    # Attempt to smuggle a command / extra field past the schema ceiling.
    env = client.post("/mcp/tools/execute_approved_plan", headers=exec_headers(executor),
                      json={"ticket_id": "T-000482", "host_id": "nas-01", "op_id": "op-1",
                            "command": "rm -rf /"}).json()
    assert env["isError"] is True
    assert env["structuredContent"]["code"] == "invalid"
    assert len(app.state.dispatcher.dispatched) == 0


def test_no_shell_or_credential_tool_is_registered():
    names = {t["name"] for t in TOOLS}
    for forbidden in ("run_command", "shell", "exec", "ssh", "read_credential", "redeem", "write_catalog"):
        assert forbidden not in names
    # exactly one destructive write tool + one write-benign sandbox tool.
    writes = {t["name"] for t in TOOLS if t["actionClass"] != "read"}
    assert writes == {"execute_approved_plan", "run_sandbox_test"}
