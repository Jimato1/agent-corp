"""MCP agent surface — deliberately THIN (PLAN §6.4). Two write-benign, display-only
tools; MC is a control plane the operator drives, not a place agents do work.

House pattern (matching the only built MCP surfaces, ``platform/auth/src/auth/mcp`` and
``apps/chat/backend/app/mcp``): a hand-rolled tool registry mounted as HTTP, bearer-gated
and audience-bound to ``mc``. The suite standardized on this rather than pulling in an
unvetted MCP SDK (none exists in the repo). Transport: ``GET /mcp/tools`` (discovery) +
``POST /mcp/tools/{name}`` (invoke). The plan's "Streamable HTTP 2025-11-25" target is a
documented deliberate deviation (verification/CHECKLIST.md), identical to chat's.

**Flat, low-arity, enum-biased** (D-17 schema-complexity ceiling): every param is a
scalar; no nested objects. Both tools are **display-only** and **NEVER mutate Board
state** — ``request_escalation`` creates a pinned attention item on MC's own surface;
Board escalation stays ``in_progress -> blocked`` on the Board (this is the coordination
boundary). ``sub`` is stamped from the authenticated subject, never a caller param.
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import ValidationError

from ..authn.principal import Principal, require_escalate, require_report
from ..schemas import ReportStatusIn, RequestEscalationIn

router = APIRouter(prefix="/mcp", tags=["mcp"])

_REPORT_STATUS_SCHEMA: dict[str, Any] = {
    "name": "report_status",
    "description": (
        "Post an advisory status breadcrumb onto your agent row in Mission Control. "
        "Display-only: it surfaces progress to the operator's live view. It does NOT "
        "coordinate work (use the Board) and does NOT change any ticket state."
    ),
    "inputSchema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["op_id", "status_note"],
        "properties": {
            "op_id": {"type": "string", "maxLength": 128, "description": "caller-minted idempotency key"},
            "ticket_id": {"type": "string", "description": "opaque; stored verbatim"},
            "status_note": {"type": "string", "maxLength": 500},
        },
    },
    "actionClass": "write-benign",
}

_REQUEST_ESCALATION_SCHEMA: dict[str, Any] = {
    "name": "request_escalation",
    "description": (
        "Raise a pinned attention item to the operator (dedup by sub+ticket_id). "
        "Display-only: it NEVER mutates Board state — a Board escalation stays a Board "
        "transition (in_progress -> blocked). Use this to draw the operator's eye, not "
        "to coordinate with other agents."
    ),
    "inputSchema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["op_id", "reason"],
        "properties": {
            "op_id": {"type": "string", "maxLength": 128},
            "ticket_id": {"type": "string"},
            "severity": {"type": "string", "enum": ["attention", "urgent"]},
            "reason": {"type": "string", "maxLength": 500},
        },
    },
    "actionClass": "write-benign",
}

_TOOLS = [_REPORT_STATUS_SCHEMA, _REQUEST_ESCALATION_SCHEMA]


def _ok(structured: dict, text: str) -> dict:
    return {"isError": False, "structuredContent": structured, "content": [{"type": "text", "text": text}]}


def _err(code: str, message: str) -> dict:
    return {"isError": True, "structuredContent": {"code": code}, "content": [{"type": "text", "text": message}]}


@router.get("/tools")
def list_tools(_: Principal = Depends(require_report)) -> dict:
    return {"tools": _TOOLS}


@router.post("/tools/report_status")
def call_report_status(args: dict[str, Any], request: Request,
                       principal: Principal = Depends(require_report)) -> dict:
    try:
        body = ReportStatusIn(**dict(args))
    except ValidationError as exc:
        return _err("invalid", f"schema validation failed: {exc.errors()[:3]}")
    repo = request.app.state.repo
    # Advisory breadcrumb: an mc_audit row + a live-view nudge. Display-only; no Board write.
    repo.audit(principal.sub, "report_status", body.ticket_id, "recorded", body.status_note[:200])
    request.app.state.broker.publish("ui", "liveness", None, {"sub": principal.sub, "breadcrumb": True})
    return _ok({"status": "recorded"}, f"status recorded for {principal.sub}")


@router.post("/tools/request_escalation")
def call_request_escalation(args: dict[str, Any], request: Request,
                            principal: Principal = Depends(require_escalate)) -> dict:
    try:
        body = RequestEscalationIn(**dict(args))
    except ValidationError as exc:
        return _err("invalid", f"schema validation failed: {exc.errors()[:3]}")
    repo = request.app.state.repo
    # Pinned attention item — dedup by (sub, ticket_id). NEVER mutates Board state.
    repo.audit(principal.sub, "request_escalation", body.ticket_id, body.severity, body.reason[:200])
    request.app.state.broker.publish(
        "ui", "anomaly", None,
        {"kind": "escalation", "sub": principal.sub, "ticket_id": body.ticket_id,
         "severity": body.severity, "reason": body.reason})
    return _ok({"status": "pinned"}, f"escalation pinned for {principal.sub}")


# Regression guard: exactly two write-benign, display-only tools on this audience.
assert [t["name"] for t in _TOOLS] == ["report_status", "request_escalation"]
assert all(t["actionClass"] == "write-benign" for t in _TOOLS)
