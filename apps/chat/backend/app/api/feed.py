"""SSE feed (PLAN §7). The feed IS the persisted table: replay-from-history and live
are one code path. A too-old cursor gets ``event: reset`` → the client re-syncs from
``GET /api/notifications`` then resumes at the live tip. One-way only; no client→
server messages on this channel."""
from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from ..authn.principal import Principal, require_read
from ..services.feed import FeedBroker
from ..services.repo import Repository
from . import get_repo

router = APIRouter(tags=["feed"])

_HEARTBEAT_SECONDS = 25.0


def _frame(event: str, event_id: str | None, data: dict) -> str:
    """Format one SSE frame. ONLY notification frames carry an ``id:`` — the SSE
    ``Last-Event-ID`` replay cursor is a ``notification_id`` (PLAN §1.5), so
    broadcast/ack/reset frames deliberately omit ``id:`` (a broadcast id or the reset
    sentinel is not a valid cursor and would otherwise trigger a reset loop on
    reconnect)."""
    id_line = f"id: {event_id}\n" if event_id is not None else ""
    return f"event: {event}\n{id_line}data: {json.dumps(data, separators=(',', ':'))}\n\n"


@router.get("/feed")
async def feed(
    request: Request,
    since: str | None = None,
    _: Principal = Depends(require_read),
    repo: Repository = Depends(get_repo),
) -> StreamingResponse:
    broker: FeedBroker = request.app.state.broker
    cursor = since or request.headers.get("last-event-id")

    async def gen() -> AsyncIterator[str]:
        queue = broker.subscribe()
        try:
            # 1) Replay from history (or reset on a too-old cursor).
            if cursor is not None and repo._seq_of(cursor) is None:
                yield _frame("reset", None, {"reason": "cursor_out_of_window"})
                for env in repo.replay_after(None, limit=100):
                    yield _frame("notification", env["notification_id"], env)
            else:
                for env in repo.replay_after(cursor, limit=200):
                    yield _frame("notification", env["notification_id"], env)
            # 2) Go live.
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_SECONDS)
                    # Only notification frames advance the Last-Event-ID cursor.
                    eid = str(payload["id"]) if payload["event"] == "notification" else None
                    yield _frame(payload["event"], eid, payload["data"])
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            broker.unsubscribe(queue)

    return StreamingResponse(
        gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-store", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
    )
