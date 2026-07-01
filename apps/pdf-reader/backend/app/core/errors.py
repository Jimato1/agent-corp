"""Error shaping + FastAPI exception handlers → the ErrorResponse envelope.

User-facing messages are blunt and specific but NEVER leak a stack trace or
engine stderr (API §1.5, SCOPE §5a). Every non-2xx API response uses this shape.
"""
from __future__ import annotations

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

log = logging.getLogger("pdfforge")


class AppError(Exception):
    """A domain error carrying a stable machine code + HTTP status."""

    def __init__(self, code: str, message: str, status: int = 400, details: dict | None = None, headers: dict | None = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.status = status
        self.details = details
        self.headers = headers


# Convenience constructors for the codes the contract names (API §8).
def file_too_large(limit_mb: int) -> AppError:
    return AppError("file_too_large", f"That file is over the {limit_mb} MB limit.", 413, {"limit_mb": limit_mb})


def not_a_pdf() -> AppError:
    return AppError("not_a_pdf", "That isn't a PDF. pdf-forge checks the file's contents, not its name.", 415)


def bad_pdf_structure(msg: str = "Couldn't read the PDF — it looks damaged.") -> AppError:
    return AppError("bad_pdf_structure", msg, 400)


def queue_full(retry_after: int) -> AppError:
    return AppError("queue_full", "Every press is busy right now. Try again shortly.", 429,
                    {"retry_after": retry_after}, {"Retry-After": str(retry_after)})


def disk_full() -> AppError:
    return AppError("disk_full", "Not enough working room on the server. Free some space and retry.", 507)


def job_not_found() -> AppError:
    return AppError("job_not_found", "No such job.", 404)


def result_gone() -> AppError:
    return AppError("result_gone", "These results have expired and were cleared.", 404)


def job_not_terminal() -> AppError:
    return AppError("job_not_terminal", "This job isn't finished yet.", 409)


def wrong_password() -> AppError:
    return AppError("wrong_password", "Wrong password.", 422)


def invalid_options(message: str) -> AppError:
    return AppError("invalid_options", message, 422)


def unknown_op(op: str) -> AppError:
    return AppError("unknown_op", f"Unknown operation: {op}.", 404)


def _envelope(code: str, message: str, status: int, request_id: str, details: dict | None) -> dict:
    body: dict = {"code": code, "message": message, "status": status, "request_id": request_id}
    if details:
        body["details"] = details
    return {"error": body}


def install_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(request: Request, exc: AppError):  # noqa: ANN202
        rid = _request_id(request)
        return JSONResponse(
            status_code=exc.status,
            content=_envelope(exc.code, exc.message, exc.status, rid, exc.details),
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):  # noqa: ANN202
        rid = _request_id(request)
        return JSONResponse(
            status_code=422,
            content=_envelope("invalid_request", "The request was malformed.", 422, rid, None),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http(request: Request, exc: StarletteHTTPException):  # noqa: ANN202
        rid = _request_id(request)
        code = {404: "not_found", 405: "method_not_allowed"}.get(exc.status_code, "http_error")
        message = exc.detail if isinstance(exc.detail, str) else "Request failed."
        return JSONResponse(status_code=exc.status_code, content=_envelope(code, message, exc.status_code, rid, None))

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):  # noqa: ANN202
        rid = _request_id(request)
        # Log server-side with detail; return a sanitized envelope (no stack/stderr).
        log.exception("unhandled error [request_id=%s]", rid)
        return JSONResponse(
            status_code=500,
            content=_envelope("internal_error", "Something went wrong on the server.", 500, rid, None),
        )


def _request_id(request: Request) -> str:
    rid = request.headers.get("X-Request-ID")
    if not rid:
        rid = getattr(request.state, "request_id", None)
    if not rid:
        rid = uuid.uuid4().hex
    return rid
