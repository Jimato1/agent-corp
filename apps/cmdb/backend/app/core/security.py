"""Response security headers + a strict CSP.

The operator console is dark-only Instrument; the SPA is fully self-hosted (fonts +
assets bundled), so a tight CSP costs nothing. ``frame-ancestors 'none'`` blocks
clickjacking of the policy-editor / gate-weakening ceremony.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "  # Helm components use React inline style attributes
    "img-src 'self' data:; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
)


class SecurityMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, api_version: str = "1") -> None:
        super().__init__(app)
        self.api_version = api_version

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("X-API-Version", self.api_version)
        response.headers.setdefault("Content-Security-Policy", _CSP)
        return response
