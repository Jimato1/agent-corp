"""API router aggregation. The MCP surface and this UI-facing API are siblings over
the one shared state in :mod:`app.services.repo` (PLAN §3) — neither downstream of
the other."""
from __future__ import annotations

from fastapi import APIRouter, Request

from ..services.repo import Repository


def get_repo(request: Request) -> Repository:
    return request.app.state.repo


api_router = APIRouter(prefix="/api")

from .broadcasts import router as _broadcasts  # noqa: E402
from .feed import router as _feed  # noqa: E402
from .health import router as _health  # noqa: E402
from .notifications import router as _notifications  # noqa: E402

api_router.include_router(_notifications)
api_router.include_router(_feed)
api_router.include_router(_broadcasts)
api_router.include_router(_health)
