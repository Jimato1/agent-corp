"""Health + session endpoints.

* ``GET /healthz`` — edge-internal liveness (no auth); used by the container
  HEALTHCHECK and the proxy readiness gate.
* ``GET /api/health/signals`` — the operator Health strip (``chat:read``).
* ``GET /api/session`` — the shell's identity + read-only kill mirror. Chat is NOT
  in the kill chain (``killswitch-chain.md`` §1): it echoes the kill posture it saw
  on the caller's token/identity header, read-only, and enforces nothing on it.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, current_principal, require_read
from ..services import health as health_svc
from ..services.repo import Repository
from . import get_repo

router = APIRouter(tags=["health"])


@router.get("/health/signals")
def health_signals(
    request: Request,
    _: Principal = Depends(require_read),
    repo: Repository = Depends(get_repo),
) -> dict:
    db = request.app.state.db
    settings = request.app.state.settings
    broker = request.app.state.broker
    subs = len(getattr(broker, "_subscribers", ()))
    return {"signals": health_svc.signals(db, settings, sse_subscribers=subs)}


@router.get("/session")
def session(principal: Principal = Depends(current_principal)) -> dict:
    return {
        "sub": principal.sub,
        "kind": principal.kind,
        "kill_level": principal.kill_level,
        "kill_epoch": principal.kill_epoch,
        # Chat is out of the kill chain: this is a READ-ONLY mirror with no actuator.
        "in_kill_chain": False,
    }
