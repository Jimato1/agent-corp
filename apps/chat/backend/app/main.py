"""FastAPI application factory (matches apps/pdf serve model).

Wires the one shared state (SQLite + repo + feed broker) that the two sibling
surfaces sit on: the write-only MCP tool (``/mcp``) and the operator UI's HTTP API
(``/api``). Registers ``/api`` + ``/mcp`` FIRST, then serves the built SPA at ``/``
with an ``index.html`` fallback.
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import api_router
from .authn.jwks import KeyRing
from .config import Settings, get_settings
from .core.errors import install_exception_handlers
from .core.logging import configure_logging
from .core.security import SecurityMiddleware
from .db import Database
from .mcp.surface import router as mcp_router
from .services import backup as backup_svc
from .services.feed import FeedBroker
from .services.outbox import OutboxWorker
from .services.repo import Repository

log = logging.getLogger("chat")


def _build_keyring(settings: Settings) -> KeyRing:
    ring = KeyRing(jwks_url=settings.auth_jwks_url, poll_seconds=settings.auth_jwks_poll_seconds)
    # Isolated-build test signer: a symmetric key only reachable when configured.
    if settings.auth_test_hs256_secret:
        ring.add_hs256("test-hs256", settings.auth_test_hs256_secret)
    with contextlib.suppress(Exception):
        ring.refresh()  # best-effort warm-up; the background poller keeps it current
    return ring


async def _jwks_poller(ring: KeyRing, stop: asyncio.Event, poll_seconds: int) -> None:
    while not stop.is_set():
        try:
            await asyncio.wait_for(stop.wait(), timeout=poll_seconds)
        except asyncio.TimeoutError:
            await asyncio.to_thread(ring.refresh)


async def _nightly_maintenance(app: FastAPI, stop: asyncio.Event) -> None:
    """Run the backup + size-guard once per day (~02:00 UTC)."""
    while not stop.is_set():
        now = datetime.now(timezone.utc)
        nxt = now.replace(hour=2, minute=0, second=0, microsecond=0)
        if nxt <= now:
            nxt += timedelta(days=1)
        try:
            await asyncio.wait_for(stop.wait(), timeout=(nxt - now).total_seconds())
            return
        except asyncio.TimeoutError:
            pass
        with contextlib.suppress(Exception):
            await asyncio.to_thread(backup_svc.run_backup, app.state.db, app.state.settings, day=datetime.now(timezone.utc))
            await asyncio.to_thread(backup_svc.check_size_guard, app.state.db, app.state.settings, app.state.repo)


@contextlib.asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.broker.bind_loop(asyncio.get_running_loop())
    stop = asyncio.Event()
    app.state._stop = stop
    worker: OutboxWorker = app.state.outbox
    worker.start()
    poller = asyncio.ensure_future(_jwks_poller(app.state.keyring, stop, app.state.settings.auth_jwks_poll_seconds))
    maint = asyncio.ensure_future(_nightly_maintenance(app, stop))
    try:
        yield
    finally:
        stop.set()
        await worker.stop()
        for t in (poller, maint):
            t.cancel()
            with contextlib.suppress(asyncio.CancelledError, Exception):
                await t
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
                {"error": {"code": "not_found", "message": "Not found.", "status": 404}}, status_code=404
            )
        candidate = (static_dir / full_path).resolve()
        with contextlib.suppress(ValueError):
            if candidate.is_file() and candidate.is_relative_to(static_dir.resolve()):
                return FileResponse(candidate)
        if index.is_file():
            return FileResponse(index)
        return JSONResponse({"status": "ok", "spa": "not_built"}, status_code=200)


def create_app(settings: Settings | None = None, *, keyring: KeyRing | None = None) -> FastAPI:
    """Build the app. Tests pass an in-memory ``keyring`` (+ a tmp DB via settings) so
    the whole pipeline runs offline with a symmetric test signer."""
    configure_logging(logging.INFO)
    settings = settings or get_settings()

    app = FastAPI(
        title="chat",
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
    app.state.outbox = OutboxWorker(db, settings, repo)

    app.add_middleware(SecurityMiddleware, api_version=settings.api_version)
    install_exception_handlers(app)

    @app.get("/healthz", include_in_schema=False)
    def healthz() -> JSONResponse:  # noqa: ANN202 — edge-internal liveness
        conn = db.reader()
        try:
            conn.execute("SELECT 1")
            gave_up = conn.execute("SELECT COUNT(*) c FROM push_outbox WHERE status='gave_up'").fetchone()["c"]
        finally:
            conn.close()
        return JSONResponse({"status": "ok", "push_gave_up": int(gave_up)})

    # API + MCP FIRST — always matched before the SPA fallback.
    app.include_router(api_router)
    app.include_router(mcp_router)

    with contextlib.suppress(Exception):
        Path(settings.static_dir).mkdir(parents=True, exist_ok=True)
    _mount_frontend(app, Path(settings.static_dir))
    return app


app = create_app()
