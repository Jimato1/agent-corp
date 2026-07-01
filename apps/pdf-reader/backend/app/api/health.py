"""GET /api/health — trivial liveness probe (no disk/CPU work). API §7."""
from __future__ import annotations

from fastapi import APIRouter

from app import __version__

router = APIRouter(tags=["system"])


@router.get("/health")
async def health() -> dict:
    return {"status": "ok", "version": __version__}
