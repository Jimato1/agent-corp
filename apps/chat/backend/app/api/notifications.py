"""Notification endpoints (PLAN §3). ``POST`` is the ONE agent-reachable capability
(``chat:post``); everything else is operator-only (``chat:read`` / ``chat:manage``)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_manage, require_post, require_read
from ..core.errors import ValidationFailed
from ..schemas import BatchAckIn, PostNotificationIn
from ..security.hygiene import SecretDetected
from ..services.ratelimit import enforce_post_limit
from ..services.repo import Repository
from . import get_repo

router = APIRouter(tags=["notifications"])


@router.post("/notifications")
def post_notification(
    body: PostNotificationIn,
    request: Request,
    principal: Principal = Depends(require_post),
    repo: Repository = Depends(get_repo),
) -> dict:
    settings = request.app.state.settings
    enforce_post_limit(repo, settings, principal.sub, body.kind)
    try:
        # agent_id is stamped from the authenticated subject — NEVER from the body.
        result = repo.post_notification(principal.sub, body.model_dump())
    except SecretDetected as exc:
        repo.audit(principal.sub, "reject_secret_pattern", None, exc.what)
        raise ValidationFailed(str(exc), code="secret_pattern") from exc
    return {"notification_id": result.notification_id, "status": result.status}


@router.get("/notifications")
def list_notifications(
    request: Request,
    kind: str | None = None,
    min_priority: int | None = None,
    agent_id: str | None = None,
    ticket_id: str | None = None,
    acked: bool | None = None,
    since: str | None = None,
    limit: int = 50,
    _: Principal = Depends(require_read),
    repo: Repository = Depends(get_repo),
) -> dict:
    envelopes, next_cursor = repo.list_notifications(
        kind=kind, min_priority=min_priority, agent_id=agent_id,
        ticket_id=ticket_id, acked=acked, since=since, limit=limit,
    )
    return {"notifications": envelopes, "next_cursor": next_cursor}


@router.get("/notifications/{notification_id}")
def get_notification(
    notification_id: str,
    _: Principal = Depends(require_read),
    repo: Repository = Depends(get_repo),
) -> dict:
    env = repo.get_notification(notification_id)
    if env is None:
        raise ValidationFailed(
            "This notification is no longer in the retained window.",
            code="not_found", status=404,
        )
    env["audit"] = repo.audit_trail(notification_id)
    return env


@router.post("/notifications/{notification_id}/ack")
def ack_notification(
    notification_id: str,
    principal: Principal = Depends(require_manage),
    repo: Repository = Depends(get_repo),
) -> dict:
    result = repo.ack(notification_id, principal.sub)
    if result is None:
        raise ValidationFailed("Unknown notification.", code="not_found", status=404)
    return result


@router.post("/notifications/ack")
def batch_ack(
    body: BatchAckIn,
    principal: Principal = Depends(require_manage),
    repo: Repository = Depends(get_repo),
) -> dict:
    count = repo.batch_ack(body.up_to_seq, body.kind, principal.sub)
    return {"acked_count": count}
