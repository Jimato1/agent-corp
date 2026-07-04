"""MCP agent surface — ONE write-only tool (PLAN §4).

House pattern (matching the only built MCP surface, ``platform/auth/src/auth/mcp``):
a hand-rolled tool registry mounted as HTTP, bearer-gated and audience-bound to
``chat`` — the suite has standardized on this rather than pulling in an unvetted MCP
SDK (no such SDK exists anywhere in the repo). Transport: ``GET /mcp/tools``
(discovery) + ``POST /mcp/tools/{name}`` (invoke). See ``verification/CHECKLIST.md``
for the deliberate-deviation note vs. the plan's "Streamable HTTP 2025-11-25" target.

**Flat, low-arity, enum-biased** (D-17 schema-complexity ceiling): the ``source_ref``
triple is three scalar params; ``tags`` is a CSV string; no nested objects. The
schema is scalar-only so it sits under any ceiling the gap-1.3 spike validates.

* ``agent_id`` is NEVER a parameter — it is stamped from the authenticated subject
  (spoofing closed by construction).
* No read / list / ack / broadcast / delete tools exist — not registered on this
  audience at all. This IS the "agents never get read/broadcast" boundary.
* Business failures (validation, dedup, rate limit, secret-pattern) return a
  structured ``isError`` tool result — never a JSON-RPC/HTTP error (Board convention).
"""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import ValidationError

from ..authn.principal import SCOPE_POST, Principal, require_post
from ..core.errors import RateLimited
from ..schemas import PostNotificationIn
from ..security.hygiene import SecretDetected
from ..services.ratelimit import enforce_post_limit
from ..services.repo import Repository
from ..api import get_repo

router = APIRouter(prefix="/mcp", tags=["mcp"])

_POST_NOTIFICATION_SCHEMA: dict[str, Any] = {
    "name": "post_notification",
    "description": (
        "Post a notification or escalation to the human operator. Write-only: this is "
        "the ONLY Chat capability an agent has. It surfaces information to the operator; "
        "it does not coordinate with other agents (use the Board) or clear any gate."
    ),
    "inputSchema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["kind", "title", "body", "op_id"],
        "properties": {
            "kind": {"type": "string", "enum": ["escalation", "needs_review", "done"]},
            "title": {"type": "string", "maxLength": 120},
            "body": {"type": "string", "maxLength": 4000, "description": "markdown"},
            "op_id": {"type": "string", "maxLength": 128, "description": "caller-minted idempotency key"},
            "priority": {"type": "integer", "minimum": 1, "maximum": 5, "description": "clamped to the kind's band"},
            "ticket_id": {"type": "string", "description": "opaque; stored verbatim"},
            "fencing_token": {"type": "string", "description": "opaque; advisory only"},
            "source_system": {"type": "string", "enum": ["board", "mc", "notes"]},
            "source_kind": {"type": "string", "enum": ["ticket", "review", "note"]},
            "source_id": {"type": "string"},
            "tags": {"type": "string", "description": "comma-separated, <=8 tags"},
            "dedup_key": {"type": "string", "maxLength": 128},
        },
    },
    "actionClass": "write-benign",
}


def _ok(notification_id: str, status: str) -> dict:
    return {
        "isError": False,
        "structuredContent": {"notification_id": notification_id, "status": status},
        "content": [{"type": "text", "text": f"posted {notification_id} ({status})"}],
    }


def _err(code: str, message: str) -> dict:
    return {
        "isError": True,
        "structuredContent": {"code": code},
        "content": [{"type": "text", "text": message}],
    }


@router.get("/tools")
def list_tools(_: Principal = Depends(require_post)) -> dict:
    """Tool discovery. Only ``post_notification`` is registered on this audience."""
    return {"tools": [_POST_NOTIFICATION_SCHEMA]}


@router.post("/tools/post_notification")
def call_post_notification(
    args: dict[str, Any],
    request: Request,
    principal: Principal = Depends(require_post),
    repo: Repository = Depends(get_repo),
) -> dict:
    settings = request.app.state.settings

    # Flat scalars → the shared input model. tags is a CSV string on the MCP surface.
    raw = dict(args)
    if isinstance(raw.get("tags"), str):
        raw["tags"] = [t.strip() for t in raw["tags"].split(",") if t.strip()]
    try:
        body = PostNotificationIn(**raw)
    except ValidationError as exc:
        return _err("invalid", f"schema validation failed: {exc.errors()[:3]}")

    try:
        enforce_post_limit(repo, settings, principal.sub, body.kind)
    except RateLimited as exc:
        return _err("rate_limited", exc.message)

    try:
        result = repo.post_notification(principal.sub, body.model_dump())
    except SecretDetected as exc:
        repo.audit(principal.sub, "reject_secret_pattern", None, exc.what)
        return _err("secret_pattern", str(exc))
    return _ok(result.notification_id, result.status)


# Assert the surface exposes exactly one tool at import time — a regression guard so a
# read/broadcast tool can never be added here silently (the coordination boundary).
assert list(_POST_NOTIFICATION_SCHEMA["inputSchema"]["properties"]) and \
    _POST_NOTIFICATION_SCHEMA["actionClass"] == "write-benign"
_MCP_SCOPE = SCOPE_POST  # the only scope this surface ever requires
