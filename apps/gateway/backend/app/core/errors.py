"""Error model + verbatim wire semantics (auth-apps-tokens-scopes.md §1 / auth PLAN §5.6).

Every RS in the suite returns the SAME status semantics:

* 401 — missing/invalid credential → re-mint (``WWW-Authenticate: Bearer`` + RFC 9728 pointer).
* 403 — authenticated but insufficient scope / PDP-deny / refused at the door.
* 409 — idempotency / host-locked / drift conflict.
* 429 — budget / rate limit.
* 503 — a fail-closed dependency outage.

A hard-reject in the four-check chain (NO_APPROVED_TICKET, STALE_FENCE, FLOOR_VIOLATION, …)
is a first-class *business* outcome on the MCP surface: it returns a structured ``isError``
tool result AND a hash-chained rejection audit record — it is NOT an HTTP error.
"""
from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status: int = 400
    code: str = "bad_request"

    def __init__(self, message: str, *, code: str | None = None, status: int | None = None,
                 headers: dict[str, str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        if code is not None:
            self.code = code
        if status is not None:
            self.status = status
        self.headers = headers or {}


class Unauthenticated(AppError):
    status = 401
    code = "unauthenticated"

    def __init__(self, message: str = "Authentication required.", **kw) -> None:
        headers = {"WWW-Authenticate": 'Bearer resource_metadata="/.well-known/oauth-protected-resource"'}
        headers.update(kw.pop("headers", {}))
        super().__init__(message, headers=headers, **kw)


class Forbidden(AppError):
    status = 403
    code = "insufficient_scope"


class Conflict(AppError):
    status = 409
    code = "conflict"


class RateLimited(AppError):
    status = 429
    code = "rate_limited"

    def __init__(self, message: str = "Rate limit exceeded.", *, retry_after: int = 30, **kw) -> None:
        headers = {"Retry-After": str(retry_after)}
        headers.update(kw.pop("headers", {}))
        super().__init__(message, headers=headers, **kw)


class Unavailable(AppError):
    status = 503
    code = "unavailable"


class ValidationFailed(AppError):
    status = 400
    code = "invalid"


def _payload(err: AppError) -> dict:
    return {"error": {"code": err.code, "message": err.message, "status": err.status}}


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:  # noqa: ANN202
        return JSONResponse(_payload(exc), status_code=exc.status, headers=exc.headers)
