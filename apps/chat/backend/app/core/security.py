"""Response security headers + a strict CSP (PLAN §12 injection defense).

The CSP is a second wall behind the render-time sanitizer: even if some markup ever
slipped through, ``img-src 'self' data:`` blocks remote-image tracking/exfil and
``script-src 'self'`` blocks injected script. ``connect-src 'self'`` keeps the SSE
feed same-origin. ``frame-ancestors 'none'`` blocks clickjacking of the operator UI.
"""
from __future__ import annotations

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

_CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self' 'unsafe-inline'; "  # Helm components use React inline style attributes
    "img-src 'self' data:; "               # NO remote images — reinforces the sanitizer
    "font-src 'self'; "                    # fonts are bundled locally (@fontsource)
    "connect-src 'self'; "                 # SSE feed is same-origin
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
        # Do not set CSP on the SSE stream (long-lived) — it carries no markup anyway.
        if request.url.path != "/api/feed":
            response.headers.setdefault("Content-Security-Policy", _CSP)
        return response
