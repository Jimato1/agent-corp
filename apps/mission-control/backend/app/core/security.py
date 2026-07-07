"""Response security headers + a strict CSP.

MC is dark-only Instrument; the Helm components use React inline style attributes,
so ``style-src 'unsafe-inline'`` is required. Fonts are bundled locally (@fontsource),
so ``font-src 'self'``. ``connect-src 'self'`` keeps the SSE multiplex same-origin.
``frame-ancestors 'none'`` blocks clickjacking of the operator cockpit.

The SSE endpoints (long-lived, carry no markup) are exempted from CSP.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "  # Helm inline styles + webfont CSS
    "img-src 'self' data:; "
    "font-src 'self' https://fonts.gstatic.com; "  # the real Helm webfonts (matches built siblings)
    "connect-src 'self'; "                 # SSE multiplex is same-origin
    "object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
)

_SSE_PATHS = ("/api/events", "/api/events/resolve")


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
        if request.url.path not in _SSE_PATHS:
            response.headers.setdefault("Content-Security-Policy", _CSP)
        return response
