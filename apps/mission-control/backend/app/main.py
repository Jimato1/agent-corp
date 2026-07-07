"""FastAPI application factory (mirrors apps/chat serve model).

Wires the one shared state (SQLite repo + composition clients + SSE broker) that the two
sibling surfaces sit on: the thin MCP tool surface (``/mcp``) and the operator UI's HTTP
API (``/api``). Registers ``/api`` + ``/mcp`` FIRST, then serves the built SPA at ``/``
with an ``index.html`` fallback (so the client-side review/agent routes resolve).
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from .api import api_router
from .authn.jwks import KeyRing
from .config import Settings, get_settings
from .core.errors import install_exception_handlers
from .core.logging import configure_logging
from .core.security import SecurityMiddleware
from .db import Database
from .mcp.surface import router as mcp_router
from .services.budget_store import BudgetStore
from .services.feed import FeedBroker
from .services.pollers import HeartbeatIngest, ResolvePoller
from .services.repo import Repository
from .services.upstream import AuthClient, BoardClient, EdgeClient

log = logging.getLogger("mc")


def _build_keyring(settings: Settings) -> KeyRing:
    ring = KeyRing(jwks_url=settings.auth_jwks_url, poll_seconds=settings.auth_jwks_poll_seconds)
    if settings.auth_test_hs256_secret:  # isolated-build test signer only
        ring.add_hs256("test-hs256", settings.auth_test_hs256_secret)
    with contextlib.suppress(Exception):
        ring.refresh()  # best-effort warm-up; the poller keeps it current
    return ring


async def _jwks_poller(ring: KeyRing, stop: asyncio.Event, poll_seconds: int) -> None:
    while not stop.is_set():
        try:
            await asyncio.wait_for(stop.wait(), timeout=poll_seconds)
        except asyncio.TimeoutError:
            await asyncio.to_thread(ring.refresh)


@contextlib.asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.broker.bind_loop(asyncio.get_running_loop())
    stop = asyncio.Event()
    app.state._stop = stop
    poller = asyncio.ensure_future(_jwks_poller(app.state.keyring, stop, app.state.settings.auth_jwks_poll_seconds))
    app.state.heartbeat.start()
    app.state.resolver.start()
    try:
        yield
    finally:
        stop.set()
        await app.state.heartbeat.stop()
        await app.state.resolver.stop()
        poller.cancel()
        with contextlib.suppress(asyncio.CancelledError, Exception):
            await poller
        app.state.db.close()


def _mount_frontend(app: FastAPI, static_dir: Path) -> None:
    index = static_dir / "index.html"
    assets = static_dir / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):  # noqa: ANN202
        if full_path.startswith(("api/", "mcp/")):
            return JSONResponse(
                {"error": {"code": "not_found", "message": "Not found.", "status": 404}}, status_code=404)
        candidate = (static_dir / full_path).resolve()
        with contextlib.suppress(ValueError):
            if candidate.is_file() and candidate.is_relative_to(static_dir.resolve()):
                return FileResponse(candidate)
        if index.is_file():
            return FileResponse(index)
        return JSONResponse({"status": "ok", "spa": "not_built"}, status_code=200)


def create_app(settings: Settings | None = None, *, keyring: KeyRing | None = None) -> FastAPI:
    """Build the app. Tests pass an in-memory ``keyring`` (+ a tmp DB via settings) so the
    whole pipeline runs offline with a symmetric test signer."""
    configure_logging(logging.INFO)
    settings = settings or get_settings()

    app = FastAPI(
        title="mc",
        version=settings.api_version,
        docs_url="/api/docs" if settings.expose_docs else None,
        openapi_url="/api/openapi.json" if settings.expose_docs else None,
        redoc_url=None,
        lifespan=_lifespan,
    )

    db = Database(settings.db_path)
    db.connect()
    broker = FeedBroker()
    repo = Repository(db, settings, broker)

    app.state.settings = settings
    app.state.db = db
    app.state.broker = broker
    app.state.repo = repo
    app.state.keyring = keyring or _build_keyring(settings)
    app.state.auth = AuthClient(settings)
    app.state.board = BoardClient(settings)
    app.state.edge = EdgeClient(settings)
    # The DEDICATED mc budget/WIP store — construction REFUSES an auth-private Redis URL.
    app.state.budget_store = BudgetStore(settings.budget_redis_url)
    app.state.heartbeat = HeartbeatIngest(repo, settings.runtime_sse_url)
    app.state.resolver = ResolvePoller(repo, app.state.board)

    app.add_middleware(SecurityMiddleware, api_version=settings.api_version)
    install_exception_handlers(app)

    @app.get("/healthz", include_in_schema=False)
    def healthz() -> JSONResponse:  # noqa: ANN202 — edge-internal liveness
        conn = db.reader()
        try:
            conn.execute("SELECT 1")
            anchors = conn.execute("SELECT COUNT(*) c FROM audit_anchor").fetchone()["c"]
        finally:
            conn.close()
        return JSONResponse({"status": "ok", "anchors": int(anchors),
                             "budget_backend": app.state.budget_store.backend})

    # The FROZEN alias: /ticket/<ticket_id> -> 302 /review/<ticket_id> (contract §2).
    @app.get("/ticket/{ticket_id:path}", include_in_schema=False)
    async def ticket_alias(ticket_id: str):  # noqa: ANN202
        return RedirectResponse(url=f"/review/{quote(ticket_id, safe='')}", status_code=302)

    # RFC 9728 protected-resource metadata (auth §1 bootstrap).
    @app.get("/.well-known/oauth-protected-resource", include_in_schema=False)
    def prm() -> JSONResponse:  # noqa: ANN202
        return JSONResponse({
            "resource": f"https://mc.{settings.suite_domain}",
            "authorization_servers": [settings.auth_issuer],
            "scopes_supported": ["mc:report", "mc:escalate", "mc:kill-switch",
                                 "mc:admin", "mc:read", "mc:anchor"],
        })

    # API + MCP FIRST — always matched before the SPA fallback.
    app.include_router(api_router)
    app.include_router(mcp_router)

    with contextlib.suppress(Exception):
        Path(settings.static_dir).mkdir(parents=True, exist_ok=True)
    _mount_frontend(app, Path(settings.static_dir))
    return app


app = create_app()
