"""FastAPI surface (PLAN §8). Two views over one runtime state:
  * the operator Engine-Room status UI + its read-mostly API (§8 table);
  * the cross-app ``embed()`` facade (Library, over `edge`) and the inbound
    drain/kill command intake (C4).

There is deliberately NO agent MCP surface — agents do not call the runtime
(constitutional inversion, auth §3 "No RS scopes"). Status endpoints sit behind
the proxy forward-auth (operator identity); the runtime exposes no agent audience.

The FastAPI import is guarded so the pure logic modules import without web deps.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Optional

from .errors import FacadeError
from .supervisor import Supervisor

try:
    from fastapi import FastAPI, Request, Response
    from fastapi.responses import HTMLResponse, JSONResponse, StreamingResponse
    from fastapi.staticfiles import StaticFiles
    _HAVE_FASTAPI = True
except ImportError:  # pragma: no cover - web deps optional for unit tests
    _HAVE_FASTAPI = False


WEB_DIR = Path(__file__).resolve().parent.parent.parent / "web"


def create_app(supervisor: Optional[Supervisor] = None):
    if not _HAVE_FASTAPI:  # pragma: no cover
        raise RuntimeError("FastAPI is required to create the web app (pip install fastapi uvicorn)")

    sup = supervisor or Supervisor()
    app = FastAPI(title="agent-runtime", version="0.1.0")

    @app.on_event("startup")
    async def _boot():  # pragma: no cover - integration (needs live auth)
        # M3 fail-closed boot: reconcile the kill epoch before the gate can open.
        ok = sup.boot_reconcile()
        app.state.reconciled = ok

    @app.get("/healthz")
    async def healthz():
        return {"ok": True, "reconciled": sup.drain.reconciled}

    # ---- read-mostly status API (UI_SPEC §5) ------------------------------

    @app.get("/api/runtime/status")
    async def status():
        return sup.status()

    @app.get("/api/runtime/models")
    async def models():
        return {"models": sup.models(), "sigstore_gate_armed": sup.sigstore_gate_armed()}

    @app.get("/api/runtime/headroom")
    async def headroom():
        return sup.headroom()

    @app.get("/api/runtime/keys/custody")
    async def keys_custody():
        return sup.keys_custody()

    @app.get("/api/runtime/drain")
    async def drain():
        return sup.drain_status()

    @app.get("/api/runtime/provenance")
    async def provenance():
        return {"ledger": sup.provenance_ledger()}

    # ---- inbound drain/kill command (C4) ----------------------------------

    @app.post("/api/runtime/drain/command")
    async def drain_command(request: Request):
        wire = await request.json()
        try:
            return sup.apply_kill_command(wire)
        except (ValueError, KeyError) as exc:
            return JSONResponse({"error": "bad command", "detail": str(exc)}, status_code=422)

    # ---- heartbeat SSE producer → MC (C2) ---------------------------------

    @app.get("/api/runtime/heartbeat/stream")
    async def heartbeat_stream():
        async def gen():
            # one producer connection; the fleet frame + per-agent frames.
            yield sup.heartbeats.sse_event()
        return StreamingResponse(gen(), media_type="text/event-stream")

    # ---- cross-app embed() facade (C9; Library dependency) ----------------

    @app.post("/api/runtime/embed")
    async def embed(request: Request):
        from .errors import FacadeErrorCode
        body = await request.json()
        try:
            return sup.facade.embed(body.get("texts", []), body.get("input_type", "document"))
        except FacadeError as exc:
            # Contract §2.7: backpressure surfaces as an explicit 429 + Retry-After so
            # bulk re-embed yields to live query load. Other retryable errors → 503;
            # schema errors → 422.
            if exc.code is FacadeErrorCode.QUOTA_EXHAUSTED:
                return JSONResponse(exc.as_dict(), status_code=429, headers={"Retry-After": "1"})
            code = 503 if exc.retryable else 422
            return JSONResponse(exc.as_dict(), status_code=code)

    # ---- static Engine-Room UI (Helm, vendored) ---------------------------

    if WEB_DIR.exists():
        app.mount("/web", StaticFiles(directory=str(WEB_DIR)), name="web")

        @app.get("/status", response_class=HTMLResponse)
        @app.get("/", response_class=HTMLResponse)
        async def ui_root():
            index = WEB_DIR / "index.html"
            return HTMLResponse(index.read_text(encoding="utf-8")) if index.exists() else HTMLResponse("<h1>agent-runtime</h1>")

    return app
