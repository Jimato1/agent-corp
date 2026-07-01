"""Security headers + CSP, request-id, and forward-auth identity (audit only).

CSP is tight: no ``unsafe-eval`` and ``worker-src 'self'`` (pdf.js/pdf-lib run
same-origin workers; pdf.js is configured with isEvalSupported:false). Auth is at
the reverse proxy (D5) — Remote-User/Remote-Email are read for audit only and
never drive an authorization decision.
"""
from __future__ import annotations

import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app.config import get_settings

CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "worker-src 'self' blob:; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "frame-ancestors 'none'"
)


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, api_version: str = "1"):
        super().__init__(app)
        self.api_version = api_version

    async def dispatch(self, request: Request, call_next):  # noqa: ANN001, ANN201
        # Cap/scrub a client-supplied request id (never reflect CRLF into headers).
        raw_rid = (request.headers.get("X-Request-ID") or "").translate({0x0D: None, 0x0A: None})[:64]
        rid = raw_rid or uuid.uuid4().hex
        request.state.request_id = rid

        # Audit-only identity (never trusted for authz). Only honor the forward-auth
        # headers when the request came from a configured trusted proxy IP; otherwise
        # a direct caller could forge the audit trail. Empty allow-list = trust (LAN
        # default, documented) — set PDFFORGE_TRUSTED_PROXY_IPS when exposing directly.
        trusted = get_settings().trusted_proxy_ips
        client_ip = request.client.host if request.client else None
        if not trusted or client_ip in trusted:
            request.state.remote_user = request.headers.get("Remote-User")
            request.state.remote_email = request.headers.get("Remote-Email")
        else:
            request.state.remote_user = None
            request.state.remote_email = None

        response = await call_next(request)

        response.headers["X-API-Version"] = self.api_version
        response.headers["X-Request-ID"] = rid
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Content-Security-Policy", CSP)
        return response
