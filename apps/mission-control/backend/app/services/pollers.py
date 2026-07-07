"""Background workers (started in the lifespan):

* **HeartbeatIngest** — the CONSUMER half of ``agent-runtime-mc-heartbeat.md``: MC opens
  ONE SSE client connection per runtime instance to the runtime's telemetry producer and
  projects each frame into ``agent_view`` / ``fleet_view`` (display-only; MC never mutates
  ticket state from this stream). When no runtime URL is configured, MC is passive and the
  fleet is honestly empty ("no agents have reported").

* **ResolvePoller** — MC observes the Board queue and emits the FROZEN resolve-event feed
  for Chat (``mc-chat-review-resolve.md`` §3) when a ticket it was tracking leaves a gate.
  Advisory, at-least-once, **MC-observed** (downtime windows are honest gaps). It also
  clears stale ack marks whose ``(ticket_id, gate, entry)`` is no longer an active gate
  entry (gate-entry freshness, A10).
"""
from __future__ import annotations

import asyncio
import contextlib
import json
import logging

import httpx

log = logging.getLogger("mc")

# outcome mapping (contract §3): current-gate -> observed terminal transition
_APPROVE_TERMINALS = {"approved", "executing", "verifying", "done", "failed"}
_REJECT_TERMINALS = {"cancelled"}
_ACTOR_KINDS = {"operator", "cmdb_tier_policy"}   # closed enum on the frozen resolve contract §3


class HeartbeatIngest:
    def __init__(self, repo, runtime_sse_url: str) -> None:
        self._repo = repo
        self._url = runtime_sse_url
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()

    def start(self) -> None:
        if self._url:
            self._task = asyncio.ensure_future(self._run())

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await self._task

    async def _run(self) -> None:
        while not self._stop.is_set():
            try:
                async with httpx.AsyncClient(timeout=None) as client:
                    async with client.stream("GET", self._url) as resp:
                        event = None
                        async for line in resp.aiter_lines():
                            if self._stop.is_set():
                                return
                            if line.startswith("event:"):
                                event = line.split(":", 1)[1].strip()
                            elif line.startswith("data:"):
                                await self._ingest(event, line.split(":", 1)[1].strip())
                            elif line == "":
                                event = None
            except Exception as exc:
                log.info("heartbeat ingest reconnect: %s", exc)
                with contextlib.suppress(asyncio.TimeoutError):
                    await asyncio.wait_for(self._stop.wait(), timeout=2.0)

    async def _ingest(self, event: str | None, data: str) -> None:
        try:
            frame = json.loads(data)
        except Exception:
            return
        if event == "fleet" or "roster" in frame:
            await asyncio.to_thread(self._repo.upsert_fleet_frame, frame)
        else:
            await asyncio.to_thread(self._repo.upsert_agent_frame, frame)


class ResolvePoller:
    def __init__(self, repo, board, interval: float = 5.0) -> None:
        self._repo = repo
        self._board = board
        self._interval = interval
        self._task: asyncio.Task | None = None
        self._stop = asyncio.Event()
        self._tracked: dict[str, tuple[str, int]] = {}   # ticket_id -> (gate, entry)

    def start(self) -> None:
        self._task = asyncio.ensure_future(self._run())

    async def stop(self) -> None:
        self._stop.set()
        if self._task:
            self._task.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await self._task

    async def _run(self) -> None:
        while not self._stop.is_set():
            with contextlib.suppress(Exception):
                await self._tick()
            with contextlib.suppress(asyncio.TimeoutError):
                await asyncio.wait_for(self._stop.wait(), timeout=self._interval)

    async def _tick(self) -> None:
        src = await self._board.get_queue()
        if src.data is None:
            return   # honest gap; MC-observed only
        raw = src.data.get("items", src.data) if isinstance(src.data, dict) else src.data
        current: dict[str, tuple[str, int]] = {}
        active_ack_keys: set[str] = set()
        for it in (raw or []):
            tid = str(it.get("ticket_id") or it.get("id"))
            state = str(it.get("state") or it.get("status"))
            gate = ("awaiting_approval" if state == "awaiting_approval"
                    else "escalated" if (state == "blocked" and it.get("escalation"))
                    else "needs_review")
            entry = int(it.get("gate_entry", 1))
            current[tid] = (gate, entry)
            active_ack_keys.add(f"{tid}|{gate}|{entry}")

        # Detect resolutions: a tracked ticket that left its gate.
        for tid, (gate, entry) in list(self._tracked.items()):
            if tid not in current or current[tid] != (gate, entry):
                await self._maybe_emit(tid, gate, raw)
        self._tracked = {tid: ge for tid, ge in current.items() if ge[0] in ("awaiting_approval", "needs_review")}

        await asyncio.to_thread(self._repo.clear_stale_acks, active_ack_keys)

    async def _maybe_emit(self, ticket_id: str, gate: str, items: list) -> None:
        ticket = await self._board.get_ticket(ticket_id)
        new_state = None
        actor = "operator"
        if ticket.data and isinstance(ticket.data, dict):
            new_state = str(ticket.data.get("state") or ticket.data.get("status"))
            actor = self._actor_kind(ticket.data.get("resolved_by_kind"))
        outcome = self._outcome(gate, new_state)
        if outcome is None:
            return
        resolved_at = (ticket.data or {}).get("resolved_at") if ticket.data else None
        await asyncio.to_thread(self._repo.record_resolution, ticket_id, gate, outcome,
                                actor, resolved_at or self._repo.clock.iso())

    @staticmethod
    def _actor_kind(raw: object) -> str:
        # actor_kind is a CLOSED enum on the frozen resolve contract {operator, cmdb_tier_policy}.
        # Board's field is upstream and could carry an unknown/absent value; clamp so a malformed
        # value can never propagate into the contract'd event (default to the safe human actor).
        return raw if raw in _ACTOR_KINDS else "operator"

    @staticmethod
    def _outcome(gate: str, new_state: str | None) -> str | None:
        if new_state is None:
            return None
        if gate == "awaiting_approval":
            if new_state in _APPROVE_TERMINALS:
                return "approved"
            if new_state in _REJECT_TERMINALS:
                return "rejected"
        if gate == "needs_review":
            if new_state == "done":
                return "review_cleared"
            if new_state == "todo":
                return "reworked"
        return None
