"""SSE surfaces (PLAN §6.1, §7.2; LiveStream §5.5).

* ``GET /api/events`` — the browser multiplex for MC's own UI (event: liveness|queue|
  posture|budget|anomaly). Advisory display state.
* ``GET /api/events/resolve`` — the **FROZEN resolve-event feed for Chat**
  (``mc-chat-review-resolve.md`` §3): one event per queue-item resolution MC observes on
  the Board; ``Last-Event-ID`` = ``resolve_seq``; a too-old cursor gets ``event: reset``
  → the subscriber re-syncs from ``GET /api/queue`` and resumes at the tip. Scope
  ``mc:read`` (svc:chat). Advisory, at-least-once, MC-observed — never authoritative.

Streams terminate at token exp and on ``auth:revocations`` (A6) — modelled here as a
disconnect check; a revoked operator session re-auths to resume.
"""
from __future__ import annotations

import asyncio
import json
from typing import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from ..authn.principal import Principal, require_read
from . import get_repo

router = APIRouter(tags=["events"])

_HEARTBEAT_SECONDS = 25.0


def _frame(event: str, event_id: str | None, data: dict) -> str:
    id_line = f"id: {event_id}\n" if event_id is not None else ""
    return f"event: {event}\n{id_line}data: {json.dumps(data, separators=(',', ':'))}\n\n"


def _sse_headers() -> dict:
    return {"Cache-Control": "no-store", "X-Accel-Buffering": "no", "Connection": "keep-alive"}


@router.get("/events")
async def events(request: Request, _: Principal = Depends(require_read)) -> StreamingResponse:
    broker = request.app.state.broker

    async def gen() -> AsyncIterator[str]:
        queue = broker.subscribe()
        try:
            yield ": mc-events-open\n\n"
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_SECONDS)
                    if payload.get("channel") != "ui":
                        continue   # don't leak resolve-feed events onto the browser multiplex
                    yield _frame(payload["event"], None, payload["data"])
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            broker.unsubscribe(queue)

    return StreamingResponse(gen(), media_type="text/event-stream", headers=_sse_headers())


@router.get("/events/resolve")
async def resolve_feed(request: Request, since: str | None = None,
                       _: Principal = Depends(require_read)) -> StreamingResponse:
    """The FROZEN producer feed for Chat (contract §3)."""
    repo = get_repo(request)
    broker = request.app.state.broker
    cursor = since or request.headers.get("last-event-id")

    async def gen() -> AsyncIterator[str]:
        queue = broker.subscribe()
        try:
            # 1) Replay from history (or reset on a too-old cursor).
            if cursor is not None and repo.seq_of(cursor) is None and cursor not in ("", "0"):
                yield _frame("reset", None, {"reason": "cursor_out_of_window"})
                for ev in repo.resolve_replay_after(None, limit=100):
                    yield _frame("resolve", str(ev["seq"]), ev["event"])
            else:
                for ev in repo.resolve_replay_after(cursor, limit=200):
                    yield _frame("resolve", str(ev["seq"]), ev["event"])
            # 2) Go live.
            while True:
                if await request.is_disconnected():
                    break
                try:
                    payload = await asyncio.wait_for(queue.get(), timeout=_HEARTBEAT_SECONDS)
                    if payload.get("channel") != "resolve":
                        continue
                    yield _frame("resolve", payload["id"], payload["data"])
                except asyncio.TimeoutError:
                    yield ": keep-alive\n\n"
        finally:
            broker.unsubscribe(queue)

    return StreamingResponse(gen(), media_type="text/event-stream", headers=_sse_headers())
