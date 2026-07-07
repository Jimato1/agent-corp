"""library.errors — typed error taxonomy mapped to the auth §5.6 HTTP semantics.

The RS error contract (auth-apps-tokens-scopes.md §1, verbatim):
  401 → re-mint (token missing/expired/bad signature/unknown kid)
  403 insufficient_scope (+hint)   → coarse scope missing
  403 PDP-deny (machine reason)    → never-retry authorization denial
  409 in_progress                  → op_id replay still running / conflicting decision
  429 budget                       → budget/quota exhausted
  503 fail-closed                  → a dependency the path REQUIRES is down

Library holds no sod-critical/destructive path, so 503-fail-closed applies only
where a required dependency (agent-runtime for *indexing*, never query) is down.
"""
from __future__ import annotations


class LibraryError(Exception):
    """Base — carries an HTTP status, a machine `code`, and an operator-facing hint."""

    status = 500
    code = "internal_error"

    def __init__(self, message: str = "", *, code: str | None = None, status: int | None = None):
        super().__init__(message or self.code)
        self.message = message or self.code
        if code is not None:
            self.code = code
        if status is not None:
            self.status = status

    def to_body(self) -> dict:
        return {"error": self.code, "message": self.message}


# ── 400 — malformed request (recoverable operator error, Pattern R) ───────────
class BadRequest(LibraryError):
    status = 400
    code = "bad_request"


class ScopeConflict(BadRequest):
    """host_id AND target_* both supplied — undefined precedence is refused, never
    silently resolved (PLAN §3 finding F15)."""

    code = "scope_conflict"


class ValidationError(BadRequest):
    code = "validation_error"


# ── 401 — authentication (re-mint) ────────────────────────────────────────────
class Unauthenticated(LibraryError):
    status = 401
    code = "unauthenticated"


# ── 403 — authorization ───────────────────────────────────────────────────────
class InsufficientScope(LibraryError):
    """Coarse scope missing — retryable after obtaining scope (hinted)."""

    status = 403
    code = "insufficient_scope"


class KindGateViolation(LibraryError):
    """A human-principal-kind-gated op (library:admin) attempted by a non-human
    principal (PLAN §5.5 F11). Never-retry."""

    status = 403
    code = "kind_gate"


# ── 404 ───────────────────────────────────────────────────────────────────────
class NotFound(LibraryError):
    status = 404
    code = "not_found"


# ── 409 — idempotency / lifecycle conflict ────────────────────────────────────
class InProgress(LibraryError):
    status = 409
    code = "in_progress"


class Conflict(LibraryError):
    status = 409
    code = "conflict"


# ── 422 — the admission gate refused a precondition (the constitutional refusal)
class AdmissionPreconditionFailed(LibraryError):
    """The content-bound trusted-tier gate was not satisfied (PLAN §2.2). This is
    NOT a bug and NOT retryable by the agent — no agreement count or assertion can
    ever satisfy it. Only gateway-delivered content-bound evidence or an operator
    review admits."""

    status = 422
    code = "admission_precondition_failed"


# ── 429 — budget / rate ───────────────────────────────────────────────────────
class BudgetExceeded(LibraryError):
    status = 429
    code = "budget_exceeded"


# ── 503 — a REQUIRED dependency is down; fail closed ──────────────────────────
class DependencyDown(LibraryError):
    status = 503
    code = "dependency_down"
