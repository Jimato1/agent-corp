"""Broadcast endpoints (PLAN §1.2/§3). A broadcast is a soft, UI-only advisory —
explicitly weaker than the kill switch and nowhere in the kill chain. Operator-only
(``chat:manage`` to write, ``chat:read`` to list). No agent read path exists."""
from __future__ import annotations

from datetime import timedelta

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_manage, require_read
from ..clock import now_dt, to_iso
from ..core.errors import ValidationFailed
from ..schemas import BroadcastIn
from ..security.hygiene import SecretDetected
from ..services.repo import Repository
from . import get_repo

router = APIRouter(tags=["broadcasts"])


@router.post("/broadcasts")
def create_broadcast(
    body: BroadcastIn,
    request: Request,
    principal: Principal = Depends(require_manage),
    repo: Repository = Depends(get_repo),
) -> dict:
    settings = request.app.state.settings
    expires_at = body.expires_at or to_iso(now_dt() + timedelta(hours=settings.broadcast_default_expiry_hours))
    try:
        return repo.create_broadcast(principal.sub, body.body, body.priority, expires_at)
    except SecretDetected as exc:
        repo.audit(principal.sub, "reject_secret_pattern", None, exc.what)
        raise ValidationFailed(str(exc), code="secret_pattern") from exc


@router.get("/broadcasts")
def list_broadcasts(
    active: bool = False,
    _: Principal = Depends(require_read),
    repo: Repository = Depends(get_repo),
) -> dict:
    return {"broadcasts": repo.list_broadcasts(active_only=active)}


@router.post("/broadcasts/{broadcast_id}/revoke")
def revoke_broadcast(
    broadcast_id: str,
    principal: Principal = Depends(require_manage),
    repo: Repository = Depends(get_repo),
) -> dict:
    result = repo.revoke_broadcast(broadcast_id, principal.sub)
    if result is None:
        raise ValidationFailed("Unknown broadcast.", code="not_found", status=404)
    return result
