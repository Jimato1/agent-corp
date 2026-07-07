"""MCP agent surface — TEN read-only tools (PLAN §7.2).

House pattern (matching the only built MCP surfaces, ``platform/auth`` and ``apps/chat``):
a hand-rolled tool registry mounted as HTTP, bearer-gated and audience-bound to ``cmdb``.
Transport: ``GET /mcp/tools`` (discovery) + ``POST /mcp/tools/{name}`` (invoke). No MCP SDK
exists anywhere in the repo; the deviation from the plan's "Streamable HTTP 2025-11-25"
target is recorded in ``verification/CHECKLIST.md``.

**Flat, low-arity, enum-biased** (D-17 schema-complexity ceiling): every tool takes ≤3
scalar/enum params; no nested objects. All tools are side-effect-free and backed by the ONE
``evaluate()``/snapshot — the SAME state the operator UI and the Gateway endpoint read.

**ZERO mutation verbs exist on this server** — not scope-denied; ABSENT. This IS the
"agents never write policy" boundary held by construction (§7.2). A regression guard at
import asserts no tool carries a write action class.
"""
from __future__ import annotations

from typing import Any, Callable

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_read
from ..policy.windows import evaluate_windows
from ..clock import now_dt
from ..services.decision import issue_verdict
from ..services.inventory import get_host_detail, resolve_host_facts

router = APIRouter(prefix="/mcp", tags=["mcp"])

_HOST = {"host_id": {"type": "string"}}
_HOST_AT = {"host_id": {"type": "string"}, "at": {"type": "string", "description": "advisory only"}}


def _schema(name: str, desc: str, props: dict, required: list[str]) -> dict:
    return {
        "name": name, "description": desc,
        "inputSchema": {"type": "object", "additionalProperties": False,
                        "required": required, "properties": props},
        "actionClass": "read",
    }


TOOLS: list[dict] = [
    _schema("is_actionable_now",
            "Advisory policy verdict for (host_id, action_class) NOW — same evaluate() as the "
            "Gateway's binding decision, but UNSIGNED (planning probe only, never redeemable).",
            {"host_id": {"type": "string"},
             "action_class": {"type": "string",
                              "enum": ["package_update", "config_change", "service_restart",
                                       "reboot", "kernel_update", "destructive", "sandbox_exec"]},
             "at": {"type": "string", "description": "advisory only; CMDB evaluates on its own clock"}},
            ["host_id", "action_class"]),
    _schema("is_in_window", "Is the host inside a maintenance window right now?", _HOST_AT, ["host_id"]),
    _schema("get_tier", "The host's criticality tier (or the unpolicied sentinel).", _HOST, ["host_id"]),
    _schema("get_maintenance_windows", "The host's maintenance windows + freezes.", _HOST, ["host_id"]),
    _schema("get_host_policy", "Full policy incl. per-tier timeouts, on_window_close, snapshot_capability.",
            _HOST, ["host_id"]),
    _schema("get_host", "Inventory facts (provenance-tagged) + policy summary.", _HOST, ["host_id"]),
    _schema("resolve_host_facts", "Library host-facts shape: os_family/distro/version/arch (facts ONLY).",
            _HOST, ["host_id"]),
    _schema("list_fleet", "List hosts, filterable by tier / class / window_state.",
            {"tier": {"type": "string"}, "class": {"type": "string", "enum": ["managed", "disposable"]},
             "window_state": {"type": "string"}}, []),
    _schema("list_task_types", "The CMDB-owned task-type registry (Board triage inputs).", {}, []),
    _schema("get_catalog_policy", "Runbook-catalog policy attributes for a playbook_key.",
            {"playbook_key": {"type": "string"}}, ["playbook_key"]),
]


def _ok(data: dict) -> dict:
    return {"isError": False, "structuredContent": data,
            "content": [{"type": "text", "text": "ok"}]}


def _err(code: str, message: str) -> dict:
    return {"isError": True, "structuredContent": {"code": code},
            "content": [{"type": "text", "text": message}]}


def _tool_is_actionable_now(state, args, sub) -> dict:
    claims, _ = issue_verdict(state, host_id=str(args.get("host_id", "")),
                             action_class=str(args.get("action_class", "")),
                             caller_sub=sub, binding=False, aud=None)
    return _ok(claims)


def _tool_is_in_window(state, args, sub) -> dict:
    snap, _ = state.store.current()
    h = snap.hosts.get(str(args.get("host_id", ""))) if snap else None
    if h is None:
        return _err("no_such_host", "no such host")
    wr = evaluate_windows(h.windows, now_dt())
    return _ok({"in_window": wr.in_window, "window_id": wr.window_id,
                "window_closes_at": wr.window_closes_at, "active_freeze": wr.active_freeze,
                "reason": wr.reason})


def _tool_get_tier(state, args, sub) -> dict:
    snap, _ = state.store.current()
    h = snap.hosts.get(str(args.get("host_id", ""))) if snap else None
    if h is None:
        return _err("no_such_host", "no such host")
    return _ok({"tier": h.tier or "unpolicied", "class": h.host_class})


def _tool_get_maintenance_windows(state, args, sub) -> dict:
    detail = get_host_detail(state.db, state.store.current()[0], str(args.get("host_id", "")))
    if detail is None:
        return _err("no_such_host", "no such host")
    return _ok({"windows": detail["windows"]})


def _tool_get_host_policy(state, args, sub) -> dict:
    snap, _ = state.store.current()
    hid = str(args.get("host_id", ""))
    h = snap.hosts.get(hid) if snap else None
    if h is None:
        return _err("no_such_host", "no such host")
    tier = snap.tiers.get(h.tier) if (snap and h.tier) else None
    return _ok({
        "host_id": h.host_id, "tier": h.tier or "unpolicied", "class": h.host_class,
        "overrides": dict(h.overrides), "snapshot_capability": h.snapshot_capability,
        "on_window_close": [w.on_window_close for w in h.windows],
        "health_check_timeout_s": tier.health_check_timeout_s if tier else None,
        "ssh_wait_timeout_s": tier.ssh_wait_timeout_s if tier else None,
    })


def _tool_get_host(state, args, sub) -> dict:
    detail = get_host_detail(state.db, state.store.current()[0], str(args.get("host_id", "")))
    if detail is None:
        return _err("no_such_host", "no such host")
    return _ok(detail)


def _tool_resolve_host_facts(state, args, sub) -> dict:
    facts = resolve_host_facts(state.db, state.store.current()[0], str(args.get("host_id", "")))
    if facts is None:
        return _err("not_found", "no such host / no facts")
    return _ok(facts)


def _tool_list_fleet(state, args, sub) -> dict:
    snap, integ = state.store.current()
    if snap is None:
        return _ok({"hosts": [], "gate_degraded": True})
    tier = args.get("tier"); klass = args.get("class"); ws_filter = args.get("window_state")
    out = []
    for h in snap.hosts.values():
        if tier and h.tier != tier:
            continue
        if klass and h.host_class != klass:
            continue
        wr = evaluate_windows(h.windows, now_dt()) if h.host_class == "managed" else None
        ws = ("FREEZE-ACTIVE" if (wr and wr.active_freeze) else
              "IN-WINDOW" if (wr and wr.in_window) else "CLOSED" if wr else "n/a")
        if ws_filter and ws != ws_filter:
            continue
        out.append({"host_id": h.host_id, "tier": h.tier or "unpolicied",
                    "class": h.host_class, "window_state": ws, "disposable": h.host_class == "disposable"})
    return _ok({"hosts": out})


def _tool_list_task_types(state, args, sub) -> dict:
    snap, _ = state.store.current()
    tts = [{"type_key": t.type_key, "destructive": t.destructive, "reversible": t.reversible,
            "action_class": t.action_class, "external_verifier": t.external_verifier}
           for t in (snap.task_types.values() if snap else [])]
    return _ok({"task_types": tts})


def _tool_get_catalog_policy(state, args, sub) -> dict:
    snap, _ = state.store.current()
    ce = snap.catalog.get(str(args.get("playbook_key", ""))) if snap else None
    if ce is None:
        return _err("not_found", "no such playbook")
    return _ok({"playbook_key": ce.playbook_key, "action_class": ce.action_class,
                "rollback_declared": ce.rollback_declared, "applicable_tiers": list(ce.applicable_tiers),
                "duration_estimate_s": ce.duration_estimate_s, "sandbox_eligible": ce.sandbox_eligible})


_DISPATCH: dict[str, Callable] = {
    "is_actionable_now": _tool_is_actionable_now,
    "is_in_window": _tool_is_in_window,
    "get_tier": _tool_get_tier,
    "get_maintenance_windows": _tool_get_maintenance_windows,
    "get_host_policy": _tool_get_host_policy,
    "get_host": _tool_get_host,
    "resolve_host_facts": _tool_resolve_host_facts,
    "list_fleet": _tool_list_fleet,
    "list_task_types": _tool_list_task_types,
    "get_catalog_policy": _tool_get_catalog_policy,
}


@router.get("/tools")
def list_tools(_: Principal = Depends(require_read)) -> dict:
    return {"tools": TOOLS}


@router.post("/tools/{name}")
def call_tool(name: str, args: dict[str, Any], request: Request,
              principal: Principal = Depends(require_read)) -> dict:
    fn = _DISPATCH.get(name)
    if fn is None:
        return _err("unknown_tool", f"no such tool {name!r} (or it is a mutation verb — none exist here)")
    return fn(request.app.state, args or {}, principal.sub)


# Regression guard: the agent surface is READ-ONLY by construction. Every tool must be a
# read action class and every dispatch entry must have a schema — a write verb can never be
# added here silently (the coordination boundary; PLAN §7.2).
assert set(_DISPATCH) == {t["name"] for t in TOOLS}
assert all(t["actionClass"] == "read" for t in TOOLS)
