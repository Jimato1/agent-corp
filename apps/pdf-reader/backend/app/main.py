"""FastAPI application factory.

Serve model (D4/D6): register ``/api/*`` routers FIRST, then serve the built SPA
at ``/`` with an ``index.html`` fallback for client-side routes. (FastAPI has no
``app.frontend()`` helper as named in the plan; this is the closest sane
equivalent — StaticFiles for assets + a catch-all fallback, API routes matched
first so a bogus ``/assets/x.js`` 404s while ``/organize`` falls back to the SPA.)
"""
from __future__ import annotations

import contextlib
import logging
from collections.abc import AsyncIterator
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import api_router
from .config import get_settings
from .core.errors import install_exception_handlers
from .core.logging import configure_logging
from .core.security import SecurityMiddleware


@contextlib.asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    manager = None
    with contextlib.suppress(Exception):
        from .jobs.manager import get_manager

        manager = get_manager()
        manager.start()
    try:
        yield
    finally:
        if manager is not None:
            with contextlib.suppress(Exception):
                manager.shutdown()


def _mount_frontend(app: FastAPI, static_dir: Path) -> None:
    """Serve the built SPA at '/', falling back to index.html for deep links."""
    index = static_dir / "index.html"
    assets = static_dir / "assets"
    if assets.is_dir():
        app.mount("/assets", StaticFiles(directory=assets), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa(full_path: str):  # noqa: ANN202
        if full_path.startswith("api/"):
            return JSONResponse(
                {"error": {"code": "not_found", "message": "Not found.", "status": 404}}, status_code=404
            )
        candidate = (static_dir / full_path).resolve()
        with contextlib.suppress(ValueError):
            if candidate.is_file() and candidate.is_relative_to(static_dir.resolve()):
                return FileResponse(candidate)
        if index.is_file():
            return FileResponse(index)
        # SPA not built (dev without a build) — a placeholder keeps the shell green.
        return JSONResponse({"status": "ok", "spa": "not_built"}, status_code=200)


def create_app() -> FastAPI:
    configure_logging(logging.INFO)
    settings = get_settings()

    # Docs/OpenAPI are an anonymous recon aid if the app is ever reachable
    # directly (auth lives at the proxy) — gate them behind a dev-only setting.
    app = FastAPI(
        title="pdf-forge",
        version=settings.api_version,
        docs_url="/api/docs" if settings.expose_docs else None,
        openapi_url="/api/openapi.json" if settings.expose_docs else None,
        redoc_url=None,
        lifespan=_lifespan,
    )

    app.add_middleware(SecurityMiddleware, api_version=settings.api_version)
    install_exception_handlers(app)

    # API FIRST (D4) — always matched before the SPA fallback.
    app.include_router(api_router)

    with contextlib.suppress(Exception):
        settings.jobs_dir.mkdir(parents=True, exist_ok=True)

    # SPA LAST.
    _mount_frontend(app, settings.static_dir)
    return app


app = create_app()
