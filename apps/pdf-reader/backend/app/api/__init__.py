"""HTTP layer — parse, validate, enqueue, serialize. No engine calls here."""
from __future__ import annotations

from fastapi import APIRouter

from . import health, jobs

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(jobs.router)
