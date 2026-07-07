"""Human + machine HTTP surface (over the SAME state the MCP tools serve).

The one router is mounted TWICE by ``main`` — at ``/v1`` (the frozen contract surface the
Gateway / Library / agents call: ``POST /v1/decision``, ``GET /v1/verdict-jwks``,
``GET /v1/hosts/{id}/facts``, ``GET /v1/task-types`` …) and at ``/api/v1`` (the operator
console's expectation). Identical handlers, identical state — two views, one state."""
from __future__ import annotations

from fastapi import APIRouter, Request

from .decision import router as decision_router
from .hosts import router as hosts_router
from .logs import router as logs_router
from .registries import router as registries_router
from .write import router as write_router


def get_state(request: Request):
    return request.app.state


v1_router = APIRouter()
v1_router.include_router(decision_router)
v1_router.include_router(hosts_router)
v1_router.include_router(registries_router)
v1_router.include_router(logs_router)
v1_router.include_router(write_router)
