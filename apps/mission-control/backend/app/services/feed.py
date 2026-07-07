"""In-process SSE fan-out broker (PLAN §2, LiveStream §5.5).

The broker is the live-tip notifier only — it holds no durable state and is never a
second source of truth. MC multiplexes two channels through it: the browser UI feed
(``/api/events``) and the FROZEN resolve-event feed for Chat (``/api/events/resolve``).
A dropped/duplicated live event is harmless: a reconnecting client replays from the
persisted history (``resolve_log``) or the REST read by ``Last-Event-ID``.

Publish is called from the sync write path (FastAPI runs it in a threadpool), so it
hands events to the asyncio loop via ``call_soon_threadsafe``. Each subscriber may
filter by ``channel`` so the resolve feed never leaks browser-UI events and vice-versa.
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

    def publish(self, channel: str, event: str, event_id: str | None, data: dict[str, Any]) -> None:
        """Thread-safe publish to all live subscribers (best-effort)."""
        payload = {"channel": channel, "event": event, "id": event_id, "data": data}
        loop = self._loop
        if loop is None:
            return
        loop.call_soon_threadsafe(self._fan_out, payload)

    def _fan_out(self, payload: dict[str, Any]) -> None:
        for q in list(self._subscribers):
            try:
                q.put_nowait(payload)
            except asyncio.QueueFull:
                # A slow client falls behind; it re-syncs from history/REST on reconnect
                # (the durable feed is the DB, not this queue).
                pass
