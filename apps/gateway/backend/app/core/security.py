"""Security response middleware (matches apps/cmdb). Stamps ``X-API-Version`` + hardening
headers on every response. Authz itself is per-endpoint (authn.principal), never here."""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, api_version: str = "1") -> None:
        super().__init__(app)
        self.api_version = api_version

    async def dispatch(self, request: Request, call_next) -> Response:
        resp = await call_next(request)
        resp.headers.setdefault("X-API-Version", self.api_version)
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        resp.headers.setdefault("Referrer-Policy", "no-referrer")
        resp.headers.setdefault("Cache-Control", "no-store")
        return resp
