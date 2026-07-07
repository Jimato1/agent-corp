"""MCP agent surface — deliberately HIGH-LEVEL (CLAUDE.md; PLAN §11).

ONE write tool (``execute_approved_plan`` — names a plan, bounded params, NOTHING else), one
sandbox tool, and reads. House pattern (matching apps/cmdb, platform/auth): a hand-rolled
registry mounted as HTTP — ``GET /mcp/tools`` (discovery) + ``POST /mcp/tools/{name}`` (invoke).

**Flat, low-arity, enum-biased** (D-17 schema ceiling): every tool ≤4 scalar/enum args,
``additionalProperties:false``, all required.

**Structurally ABSENT** (the Vault four-tools pattern — NOT "rejected", *not registered*): any
shell / raw command / credential / raw-SSH tool, catalog writes, approval anything, halt-status
writes, task-cancel beyond own context. A regression guard at import asserts the surface holds
exactly these seven tools and no mutation verb outside ``execute_approved_plan`` /
``run_sandbox_test``.

Auth per tool: ``execute_approved_plan`` runs the FULL §8 holder path (Check 0 — cnf DPoP +
uncached introspect + drift). ``run_sandbox_test`` needs ``gateway:sandbox`` (grant-excluded
from ``gateway:execute``). Reads need ``gateway:read``.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Request

from ..authn.principal import (
    SCOPE_READ,
    SCOPE_SANDBOX,
    Principal,
    current_principal,
    validate_execute_holder,
)
from ..core.errors import Forbidden
from ..authn.principal import HolderRejected

router = APIRouter(prefix="/mcp", tags=["mcp"])

_PROFILE_ENUM = ["sbx_pytest", "sbx_lint"]


def _schema(name: str, desc: str, props: dict, required: list[str], scope: str, action_class: str) -> dict:
    return {
        "name": name, "description": desc,
        "inputSchema": {"type": "object", "additionalProperties": False,
                        "required": required, "properties": props},
        "scope": scope, "actionClass": action_class,
    }


TOOLS: list[dict] = [
    _schema("execute_approved_plan",
            "Execute an APPROVED plan on ONE host. Names a plan by ticket; the Gateway runs the "
            "vetted parameterized playbook after the four-check SoD chain. You supply NO commands.",
            {"ticket_id": {"type": "string"}, "host_id": {"type": "string"}, "op_id": {"type": "string"}},
            ["ticket_id", "host_id", "op_id"], "gateway:execute", "destructive-exec"),
    _schema("run_sandbox_test",
            "Run a tier-0 sandbox test against a fresh disposable container (no host). Evidence "
            "returns for the Library admission gate.",
            {"ticket_id": {"type": "string"}, "profile_key": {"type": "string", "enum": _PROFILE_ENUM},
             "input_ref": {"type": "string"}, "op_id": {"type": "string"}},
            ["ticket_id", "profile_key", "input_ref", "op_id"], "gateway:sandbox", "write-benign"),
    _schema("get_execution_status", "Status of a run by run_id.", {"run_id": {"type": "string"}},
            ["run_id"], "gateway:read", "read"),
    _schema("get_host_health", "Latest health/lock/fence view for a host.", {"host_id": {"type": "string"}},
            ["host_id"], "gateway:read", "read"),
    _schema("get_fleet_posture", "Wazuh-derived read-only posture (recon).",
            {"host_id": {"type": "string"}}, [], "gateway:read", "read"),
    _schema("get_sandbox_evidence", "Tier-0 evidence for a sandbox run_id.", {"run_id": {"type": "string"}},
            ["run_id"], "gateway:read", "read"),
    _schema("list_playbooks", "Catalog keys, param schemas, classes, estimates (huddle input).",
            {}, [], "gateway:read", "read"),
]

# Structural-absence guard: exactly one destructive tool + one write-benign tool; the rest read.
_WRITE_TOOLS = {t["name"] for t in TOOLS if t["actionClass"] != "read"}
assert _WRITE_TOOLS == {"execute_approved_plan", "run_sandbox_test"}, "unexpected write verb on the agent surface"
_FORBIDDEN_NAMES = {"run_command", "shell", "exec", "ssh", "read_credential", "redeem",
                    "write_catalog", "approve", "set_halt", "cancel_run"}
assert not (_FORBIDDEN_NAMES & {t["name"] for t in TOOLS}), "a structurally-absent tool leaked onto the surface"


def _ok(data: dict) -> dict:
    return {"isError": bool(data.get("isError", False)), "structuredContent": data,
            "content": [{"type": "text", "text": data.get("message", "ok")}]}


def _err(code: str, message: str) -> dict:
    return {"isError": True, "structuredContent": {"code": code, "reason": code},
            "content": [{"type": "text", "text": message}]}


def _require(request: Request, scope: str) -> Principal:
    p = current_principal(request)
    # Grant-time exclusion (§10 G2): sandbox + execute never coexist.
    if SCOPE_SANDBOX in p.scopes and "gateway:execute" in p.scopes:
        raise Forbidden("gateway:sandbox and gateway:execute never coexist.", code="insufficient_scope")
    if not p.has(scope):
        raise Forbidden(f"missing required scope {scope!r}.", code="insufficient_scope")
    return p


@router.get("/tools")
def list_tools(request: Request) -> dict:
    _require(request, SCOPE_READ)
    return {"tools": TOOLS}


@router.post("/tools/{name}")
def call_tool(name: str, args: dict[str, Any], request: Request) -> dict:
    st = request.app.state
    args = args or {}

    if name == "execute_approved_plan":
        # Check 0 — the FULL §8 holder path (cnf DPoP + uncached introspect + drift bound).
        try:
            ctx = validate_execute_holder(request)
        except HolderRejected as exc:
            return _err(exc.code, exc.message)
        for k in ("ticket_id", "host_id", "op_id"):
            if not isinstance(args.get(k), str) or not args.get(k):
                return _err("invalid", f"missing/invalid {k!r} (3 strings, additionalProperties:false)")
        if set(args) - {"ticket_id", "host_id", "op_id"}:
            return _err("invalid", "unexpected argument (schema ceiling: exactly ticket_id/host_id/op_id)")
        return _ok(st.orchestrator.execute_approved_plan(
            principal=ctx.principal, live=ctx.live,
            ticket_id=args["ticket_id"], host_id=args["host_id"], op_id=args["op_id"]))

    if name == "run_sandbox_test":
        p = _require(request, SCOPE_SANDBOX)
        for k in ("ticket_id", "profile_key", "input_ref", "op_id"):
            if not isinstance(args.get(k), str) or not args.get(k):
                return _err("invalid", f"missing/invalid {k!r}")
        if args["profile_key"] not in _PROFILE_ENUM:
            return _err("invalid", "profile_key not in enum")
        return _ok(st.sandbox.run_sandbox_test(principal=p, ticket_id=args["ticket_id"],
                                               profile_key=args["profile_key"], input_ref=args["input_ref"],
                                               op_id=args["op_id"]))

    # reads
    p = _require(request, SCOPE_READ)
    if name == "get_execution_status":
        row = st.runs.get(str(args.get("run_id", "")))
        return _ok(row) if row else _err("not_found", "no such run")
    if name == "get_host_health":
        return _ok(_host_view(st, str(args.get("host_id", ""))))
    if name == "get_fleet_posture":
        return _ok(st.wazuh.posture(args.get("host_id")))
    if name == "get_sandbox_evidence":
        ev = st.sandbox.get_evidence(str(args.get("run_id", "")))
        return _ok(ev) if ev else _err("not_found", "no such sandbox run")
    if name == "list_playbooks":
        return _ok({"playbooks": [
            {"playbook_key": e["playbook_key"], "version": e["version"], "action_class": e["action_class"],
             "rollback": e["rollback"], "est_duration_s": e["est_duration_s"], "status": e["status"]}
            for e in st.catalog.all() if e["status"] == "active"]})
    return _err("unknown_tool", f"no such tool {name!r} (or it is a structurally-absent verb — none exist here)")


def _host_view(st, host_id: str) -> dict:
    fence = st.runs.current_fence(host_id)
    active = st.runs.list(state="active", host_id=host_id, limit=1)
    return {"host_id": host_id, "fence": fence, "active_run": active[0]["run_id"] if active else None}
