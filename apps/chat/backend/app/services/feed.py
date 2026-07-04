"""In-process SSE fan-out broker (PLAN §7).

The feed is **exactly the persisted table**: replay-from-history and live are one
code path (the SSE route reads history from SQLite by cursor, then attaches here for
the live tip). This broker is only the live-tip notifier — it holds no durable state
and is never a second source of truth. A dropped/duplicated live event is harmless:
a reconnecting client replays from the persisted history by ``Last-Event-ID``.

Publish is called from the sync write path (which FastAPI runs in a threadpool), so
it hands events to the asyncio loop via ``call_soon_threadsafe``.
"""
from __future__ import annotations

import asyncio
from typing import Any


class FeedBroker:
    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        q: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=256)
        self._subscribers.add(q)
        return q

    def unsubscribe(self, q: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(q)

    def publish(self, event: str, event_id: str, data: dict[str, Any]) -> None:
        """Thread-safe publish to all live subscribers (best-effort)."""
        payload = {"event": event, "id": event_id, "data": data}
        loop = self._loop
        if loop is None:
            return
        loop.call_soon_threadsafe(self._fan_out, payload)

    def _fan_out(self, payload: dict[str, Any]) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                # A slow client falls behind; it will re-sync from history on its next
                # reconnect (the durable feed is SQLite, not this queue).
                pass
