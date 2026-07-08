"""FastAPI application factory (matches apps/cmdb serve model).

Wires the ONE shared state (gateway-private Postgres/SQLite + audit chain + signer + the four
holders' clients + the ansible-runner dispatcher + kill state) that the two sibling surfaces
sit on: the agent MCP tools (``/mcp``) and the human console API (``/api``). The dispatcher is
reached ONLY through ``execute_approved_plan`` and the four-check chain — never a raw endpoint.
Boot refuses dispatch until JWKS + kill-state are synced (DEPLOYMENT §13).
"""
from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .anchor.pusher import AnchorPusher
from .api import api_router
from .audit.chain import AuditChain
from .audit.signer import AuditSigner
from .authn.jwks import KeyRing
from .checks.catalog import Catalog
from .config import Settings, get_settings
from .core.errors import install_exception_handlers
from .core.logging import configure_logging
from .core.security import SecurityMiddleware
from .db import Database
from .engine.health import HealthChecker
from .engine.runner import AnsibleRunnerDispatcher, FakeDispatcher
from .killswitch.state import KillState
from .mcp.surface import router as mcp_router
from .sandbox.harness import SandboxRunner
from .service.clients import Clients
from .service.dispatch import Orchestrator
from .service.runs_store import RunsStore
from .wazuh.connector import WazuhConnector

log = logging.getLogger("gateway")


def _build_keyring(settings: Settings) -> KeyRing:
    ring = KeyRing(jwks_url=settings.auth_jwks_url, poll_seconds=settings.auth_jwks_poll_seconds)
    if settings.auth_test_hs256_secret:
        ring.add_hs256("test-hs256", settings.auth_test_hs256_secret)
    with contextlib.suppress(Exception):
        ring.refresh()
    return ring


def _build_verdict_keyring(settings: Settings) -> KeyRing:
    url = (settings.cmdb_url + "/v1/verdict-jwks") if settings.cmdb_url else None
    ring = KeyRing(jwks_url=url, poll_seconds=settings.auth_jwks_poll_seconds)
    with contextlib.suppress(Exception):
        ring.refresh()
    return ring


async def _jwks_poller(ring: KeyRing, stop: asyncio.Event, poll_seconds: int) -> None:
    while not stop.is_set():
        with contextlib.suppress(asyncio.TimeoutError):
            await asyncio.wait_for(stop.wait(), timeout=poll_seconds)
            return
        await asyncio.to_thread(ring.refresh)


@contextlib.asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    stop = asyncio.Event()
    app.state._stop = stop
    poller = asyncio.ensure_future(_jwks_poller(app.state.keyring, stop, app.state.settings.auth_jwks_poll_seconds))
    vpoller = asyncio.ensure_future(_jwks_poller(app.state.verdict_keyring, stop, app.state.settings.auth_jwks_poll_seconds))
    try:
        yield
    finally:
        stop.set()
        for t in (poller, vpoller):
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
            return JSONResponse({"error": {"code": "not_found", "message": "Not found.", "status": 404}}, status_code=404)
        candidate = (static_dir / full_path).resolve()
        with contextlib.suppress(ValueError):
            if candidate.is_file() and candidate.is_relative_to(static_dir.resolve()):
                return FileResponse(candidate)
        if index.is_file():
            return FileResponse(index)
        return JSONResponse({"status": "ok", "spa": "not_built"}, status_code=200)


def create_app(settings: Settings | None = None, *, keyring: KeyRing | None = None,
               verdict_keyring: KeyRing | None = None, dispatcher=None, clients=None) -> FastAPI:
    configure_logging(logging.INFO)
    settings = settings or get_settings()

    app = FastAPI(
        title="gateway",
        version=settings.api_version,
        docs_url="/api/docs" if settings.expose_docs else None,
        openapi_url="/api/openapi.json" if settings.expose_docs else None,
        redoc_url=None,
        lifespan=_lifespan,
    )

    db = Database(settings.db_url)
    db.connect()
    signer = AuditSigner(settings.signing_key_file, settings.signing_kid)
    chain = AuditChain(db, signer, settings.chain_id)
    # Genesis record so the chain is never empty (every dispatch/reject anchors to it).
    if chain.head() is None:
        chain.append(record_type="genesis", action="boot", outcome="ok", payload={"chain_id": settings.chain_id})

    catalog = Catalog(db)
    catalog.seed_if_empty()
    kill = KillState(db, signer)
    runs = RunsStore(db)
    disp = dispatcher or (FakeDispatcher() if settings.fake_runner else
                          AnsibleRunnerDispatcher(str(settings.playbook_project_dir)))

    app.state.settings = settings
    app.state.db = db
    app.state.signer = signer
    app.state.chain = chain
    app.state.catalog = catalog
    app.state.kill = kill
    app.state.runs = runs
    app.state.dispatcher = disp
    app.state.keyring = keyring or _build_keyring(settings)
    app.state.verdict_keyring = verdict_keyring or _build_verdict_keyring(settings)
    app.state.clients = clients or Clients(settings, verdict_keyring=app.state.verdict_keyring)
    # Clients built here don't carry the verdict keyring by default — attach it for the checks.
    app.state.clients.verdict_keyring = app.state.verdict_keyring
    app.state.wazuh = WazuhConnector(settings, _maybe_http())
    app.state.health = HealthChecker(disp, settings)
    app.state.anchor = AnchorPusher(app.state)
    app.state.sandbox = SandboxRunner(app.state)
    app.state.orchestrator = Orchestrator(app.state)

    app.add_middleware(SecurityMiddleware, api_version=settings.api_version)
    install_exception_handlers(app)

    @app.get("/healthz", include_in_schema=False)
    def healthz() -> JSONResponse:  # noqa: ANN202
        ok, reason, _lo, _hi = chain.verify(max(0, (chain.head() or {"head_seq": 0})["head_seq"]))
        return JSONResponse({"status": "ok", "kill_level": kill.current()["level"], "chain_ok": ok})

    @app.get("/jwks", include_in_schema=False)
    def jwks() -> JSONResponse:  # noqa: ANN202
        # The Gateway audit-HEAD signing public key (auth/MC verify anchors + halt-status against it).
        return JSONResponse(signer.jwks())

    # API/MCP FIRST, before the SPA fallback.
    app.include_router(api_router, prefix="/api")   # operator console (UI_SPEC §12)
    app.include_router(api_router, prefix="/v1")    # contract surface (halt-status read by auth)
    app.include_router(mcp_router)

    with contextlib.suppress(Exception):
        Path(settings.static_dir).mkdir(parents=True, exist_ok=True)
    _mount_frontend(app, Path(settings.static_dir))
    return app


def _maybe_http():
    try:
        import httpx
        return httpx.Client()
    except Exception:
        return None


app = None
with contextlib.suppress(Exception):
    app = create_app()
