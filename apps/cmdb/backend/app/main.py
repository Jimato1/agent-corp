"""FastAPI application factory (matches apps/chat / apps/pdf serve model).

Wires the ONE shared state (SQLite + git policy repo + write-through snapshot + verdict
signer) that the two sibling surfaces sit on: the agent MCP tools (``/mcp``) and the human
console API. The human/machine HTTP router is mounted at BOTH ``/v1`` (the frozen contract
surface) and ``/api/v1`` (the operator console) — identical handlers, one state. The built
SPA is served at ``/`` with an index.html fallback.
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import v1_router
from .authn.jwks import KeyRing
from .config import Settings, get_settings
from .core.errors import install_exception_handlers
from .core.logging import configure_logging
from .core.security import SecurityMiddleware
from .db import Database
from .mcp.surface import router as mcp_router
from .policy.store import PolicyStore
from .services.change_control import ChangeControl
from .verdict.signer import VerdictSigner

log = logging.getLogger("cmdb")


def _build_keyring(settings: Settings) -> KeyRing:
    ring = KeyRing(jwks_url=settings.auth_jwks_url, poll_seconds=settings.auth_jwks_poll_seconds)
    if settings.auth_test_hs256_secret:
        ring.add_hs256("test-hs256", settings.auth_test_hs256_secret)
    with contextlib.suppress(Exception):
        ring.refresh()
    return ring


async def _jwks_poller(ring: KeyRing, stop: asyncio.Event, poll_seconds: int) -> None:
    while not stop.is_set():
        try:
            await asyncio.wait_for(stop.wait(), timeout=poll_seconds)
        except asyncio.TimeoutError:
            await asyncio.to_thread(ring.refresh)


async def _wazuh_poller(app: FastAPI, stop: asyncio.Event) -> None:
    from .services import wazuh
    s: Settings = app.state.settings
    if not s.wazuh_enabled:
        return
    while not stop.is_set():
        try:
            await asyncio.wait_for(stop.wait(), timeout=s.wazuh_poll_seconds)
            return
        except asyncio.TimeoutError:
            pass
        snap, _ = app.state.store.current()
        with contextlib.suppress(Exception):
            app.state.wazuh_last_status = await asyncio.to_thread(
                wazuh.poll_once, app.state.db, s, snap
            )


@contextlib.asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    stop = asyncio.Event()
    app.state._stop = stop
    poller = asyncio.ensure_future(_jwks_poller(app.state.keyring, stop, app.state.settings.auth_jwks_poll_seconds))
    wpoll = asyncio.ensure_future(_wazuh_poller(app, stop))
    try:
        yield
    finally:
        stop.set()
        for t in (poller, wpoll):
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
        if full_path.startswith(("api/", "mcp/", "v1/")):
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
    configure_logging(logging.INFO)
    settings = settings or get_settings()

    app = FastAPI(
        title="cmdb",
        version=settings.api_version,
        docs_url="/api/docs" if settings.expose_docs else None,
        openapi_url="/api/openapi.json" if settings.expose_docs else None,
        redoc_url=None,
        lifespan=_lifespan,
    )

    db = Database(settings.db_path)
    db.connect()
    store = PolicyStore(settings, db)
    store.bootstrap()
    store.boot()
    signer = VerdictSigner(settings.verdict_key_path, settings.verdict_kid)
    change_control = ChangeControl(settings, db, store)

    app.state.settings = settings
    app.state.db = db
    app.state.store = store
    app.state.signer = signer
    app.state.change_control = change_control
    app.state.keyring = keyring or _build_keyring(settings)
    app.state.wazuh_last_status = None

    app.add_middleware(SecurityMiddleware, api_version=settings.api_version)
    install_exception_handlers(app)

    @app.get("/healthz", include_in_schema=False)
    def healthz() -> JSONResponse:  # noqa: ANN202
        _, integ = store.current()
        return JSONResponse({"status": "ok", "gate_ok": integ.ok, "reason": integ.reason})

    # Contract surface + operator console + agent MCP — API/MCP FIRST, before the SPA fallback.
    app.include_router(v1_router, prefix="/v1")        # cmdb-gateway-policy.md paths
    app.include_router(v1_router, prefix="/api/v1")    # operator console (same handlers)
    app.include_router(mcp_router)

    with contextlib.suppress(Exception):
        Path(settings.static_dir).mkdir(parents=True, exist_ok=True)
    _mount_frontend(app, Path(settings.static_dir))
    return app


app = create_app()
