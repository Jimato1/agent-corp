"""API router aggregation. The MCP surface and this UI-facing API are siblings over the
one shared state (PLAN §6) — neither downstream of the other. Every read endpoint here
is **display-advisory** (PLAN §6.1): never an input to another service's authz/
enforcement/liveness decision."""
from __future__ import annotations

from fastapi import APIRouter, Request

from ..services.repo import Repository


def get_repo(request: Request) -> Repository:
    return request.app.state.repo


def get_auth(request: Request):
    return request.app.state.auth


def get_board(request: Request):
    return request.app.state.board


def get_edge(request: Request):
    return request.app.state.edge


def get_budget_store(request: Request):
    return request.app.state.budget_store


api_router = APIRouter(prefix="/api")

from .anchors import router as _anchors  # noqa: E402
from .budgets import router as _budgets  # noqa: E402
from .edge import router as _edge  # noqa: E402
from .events import router as _events  # noqa: E402
from .fleet import router as _fleet  # noqa: E402
from .killswitch import router as _killswitch  # noqa: E402
from .posture import router as _posture  # noqa: E402
from .queue import router as _queue  # noqa: E402
from .admin import router as _admin  # noqa: E402

for _r in (_fleet, _queue, _posture, _budgets, _edge, _anchors, _events, _killswitch, _admin):
    api_router.include_router(_r)
