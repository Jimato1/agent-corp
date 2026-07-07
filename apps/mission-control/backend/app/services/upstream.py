"""Composition clients — the BFF's API-composition layer (PLAN §2).

Every upstream read returns a :class:`Sourced` carrying ``source`` + ``as_of`` +
``stale`` so the honesty discipline holds end-to-end: on a source failure the tile goes
**STALE-UNKNOWN loudly** (never zero, never green, never a stale value as fresh). MC
owns nothing here — it composes Board/auth/edge reads with a short-TTL cache. Every
read is **display-advisory**: never an input to another service's authz/enforcement
(the resolve-fence generalized — PLAN §6.1).

The kill relay is the one write to auth: MC forwards the operator's sender-bound proof
UNTOUCHED (MC never re-signs; §5.1) and returns auth's ``(status, body)`` so the route
can fail-loud on any non-2xx. MC holds no standing kill credential.
"""
from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

import httpx


@dataclass
class Sourced:
    """A composed read with provenance + freshness (drives the false-green rule)."""
    data: Any
    source: str
    as_of: float                       # seconds since the read (age)
    stale: bool = False
    error: str | None = None
    provenance: str | None = None      # e.g. "auth-direct" for an L2-CONFIRMED read

    def to_json(self) -> dict[str, Any]:
        return {
            "data": self.data, "source": self.source,
            "as_of_seconds": round(self.as_of, 3), "stale": self.stale,
            "error": self.error, "provenance": self.provenance,
        }


class _TTLCache:
    def __init__(self, ttl: float) -> None:
        self._ttl = ttl
        self._store: dict[str, tuple[float, Any]] = {}

    def get(self, key: str) -> tuple[Any, float] | None:
        hit = self._store.get(key)
        if hit is None:
            return None
        ts, val = hit
        return (val, time.time() - ts)

    def put(self, key: str, val: Any) -> None:
        self._store[key] = (time.time(), val)


class _BaseClient:
    def __init__(self, base_url: str, *, ttl: float = 5.0, timeout: float = 2.5) -> None:
        self.base_url = base_url.rstrip("/")
        self._cache = _TTLCache(ttl)
        self._timeout = timeout

    async def _get_json(self, path: str, source: str, **params: Any) -> Sourced:
        url = f"{self.base_url}{path}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.get(url, params=params or None)
            if resp.status_code >= 400:
                return Sourced(None, source, 0.0, stale=True, error=f"{source} {resp.status_code}")
            data = resp.json()
            self._cache.put(source + path, data)
            return Sourced(data, source, 0.0, stale=False)
        except Exception as exc:  # network/timeout — degrade honestly, keep last-good if any
            cached = self._cache.get(source + path)
            if cached is not None:
                val, age = cached
                return Sourced(val, source, age, stale=True, error=str(exc))
            return Sourced(None, source, 0.0, stale=True, error=str(exc))


class AuthClient(_BaseClient):
    """auth control-plane: posture/epoch read, budget-check API (S5 Option B), kill relay."""

    def __init__(self, settings) -> None:
        super().__init__(settings.auth_base_url, ttl=settings.source_ttl_seconds)
        self._s = settings

    async def get_posture(self) -> Sourced:
        """Kill mirror: epoch/level + L1/L2. **L2-CONFIRMED = auth's DIRECT Gateway read
        ONLY** (H5/R9). Any value whose provenance is an MC relay renders at most
        STALE-UNKNOWN — regardless of freshness. CONFIRMED additionally degrades to
        STALE-UNKNOWN past ``posture_freshness_bound`` (PLAN §5.2)."""
        s = await self._get_json(self._s.auth_posture_path, "auth")
        if s.data is None:
            return s
        l2 = (s.data or {}).get("l2", {}) if isinstance(s.data, dict) else {}
        prov = l2.get("provenance")
        # MC never upgrades PENDING on its own; a non-auth-direct L2 is capped STALE-UNKNOWN.
        s.provenance = prov
        return s

    async def get_budget_status(self, sub: str | None = None) -> Sourced:
        """Per-sub budget dimensions via auth's budget-check API — NOT via any Redis."""
        return await self._get_json(self._s.auth_budget_api_path, "auth", sub=sub)

    async def relay_killswitch(self, level: str, reason: str, issued_by: str,
                               forward_headers: dict[str, str]) -> tuple[int, dict[str, Any] | None, str | None]:
        """Best-effort relay to auth's level-addressed trigger (R8 CLOSED shape).

        The caller (MC button) requests a LEVEL and never supplies an epoch; auth mints
        ``epoch := current + 1`` write-before-ack. MC forwards the operator's
        sender-bound proof (Authorization + DPoP) UNTOUCHED; MC never re-signs and holds
        no standing kill credential. Returns (status, body, error). Any non-2xx/timeout
        => the route renders HALT NOT CONFIRMED and hands off to auth's console.
        """
        url = f"{self.base_url}{self._s.auth_killswitch_path}"
        payload = {"level": level, "issued_by": issued_by, "reason": reason}
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(url, json=payload, headers=forward_headers)
            body: dict[str, Any] | None
            try:
                body = resp.json()
            except Exception:
                body = None
            return resp.status_code, body, None
        except Exception as exc:
            return 0, None, str(exc)


class BoardClient(_BaseClient):
    """Board composition reads (queue/lineage/WIP) + the operator WIP relay."""

    def __init__(self, settings) -> None:
        super().__init__(settings.board_base_url, ttl=settings.source_ttl_seconds)
        self._s = settings

    async def get_queue(self) -> Sourced:
        return await self._get_json("/api/queue", "board")

    async def get_ticket(self, ticket_id: str) -> Sourced:
        from urllib.parse import quote
        return await self._get_json(f"/api/tickets/{quote(ticket_id, safe='')}", "board")

    async def get_agent_lineage(self, sub: str) -> Sourced:
        from urllib.parse import quote
        return await self._get_json(f"/api/agents/{quote(sub, safe='')}/lineage", "board")

    async def get_wip(self) -> Sourced:
        return await self._get_json("/api/wip", "board")

    async def relay_wip(self, cap: int, issued_by: str, forward_headers: dict[str, str]) -> tuple[int, str | None]:
        url = f"{self.base_url}{self._s.board_wip_path}"
        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                resp = await client.post(url, json={"global_cap": cap, "issued_by": issued_by},
                                         headers=forward_headers)
            return resp.status_code, None
        except Exception as exc:
            return 0, str(exc)


class EdgeClient(_BaseClient):
    """mc_prometheus / mc_blackbox reads for the Edge panel (OBSERVABILITY.md, R10)."""

    def __init__(self, settings) -> None:
        super().__init__(settings.prometheus_url, ttl=settings.source_ttl_seconds)
        self._s = settings
        self._blackbox = settings.blackbox_url.rstrip("/")

    async def query(self, promql: str) -> Sourced:
        return await self._get_json("/api/v1/query", "mc_prometheus", query=promql)
