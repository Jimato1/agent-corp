"""Typed error taxonomy for the inference facade and the loop.

The facade error set is FROZEN by contract
(``context/CONTRACTS/agent-runtime-library-inference.md`` §1):
    schema-unsatisfiable, backend-unavailable, model-provenance-failure
    (fail-closed), quota/concurrency-exhausted, and a defined quiesce/drain
    signal so callers get "unavailable, backoff" — never a hang.

``FacadeError.code`` values below are the frozen wire codes; the
contract-conformance test (tests/test_facade_contract.py) pins this set so a
drift fails the build (the contract's additive-only change rule, in code).
"""

from __future__ import annotations

from enum import Enum


class FacadeErrorCode(str, Enum):
    SCHEMA_UNSATISFIABLE = "schema-unsatisfiable"
    BACKEND_UNAVAILABLE = "backend-unavailable"
    MODEL_PROVENANCE_FAILURE = "model-provenance-failure"  # fail-closed
    QUOTA_EXHAUSTED = "quota-concurrency-exhausted"
    QUIESCE_DRAIN = "quiesce-drain"  # kill/drain/auth-outage: backoff, don't hang


# The exact frozen set — used by the conformance test, not just documentation.
FROZEN_FACADE_ERROR_CODES: frozenset[str] = frozenset(c.value for c in FacadeErrorCode)


class AgentRuntimeError(Exception):
    """Base for all runtime errors."""


class FacadeError(AgentRuntimeError):
    """A typed facade error. ``retryable`` tells the caller to back off vs give up."""

    def __init__(self, code: FacadeErrorCode, message: str, *, retryable: bool = False):
        self.code = code
        self.retryable = retryable
        super().__init__(f"[{code.value}] {message}")

    def as_dict(self) -> dict:
        return {"error": self.code.value, "message": str(self), "retryable": self.retryable}


class ProvenanceFailure(FacadeError):
    """A model failed the fail-closed provenance gate. NEVER loaded. Pattern-R."""

    def __init__(self, message: str):
        super().__init__(FacadeErrorCode.MODEL_PROVENANCE_FAILURE, message, retryable=False)


class QuiesceSignal(FacadeError):
    """Runtime is draining/killed/quiesced — return backoff, never hang."""

    def __init__(self, message: str = "runtime quiesced; back off and retry"):
        super().__init__(FacadeErrorCode.QUIESCE_DRAIN, message, retryable=True)


# ---- Loop / SoD guard errors (not facade wire errors) ----------------------


class TransitionForbidden(AgentRuntimeError):
    """The loop attempted a transition outside the agent-causable set.

    This is the SoD boundary as a CODE guard (PLAN §2.4). Raised regardless of
    what the driven model emitted; logged as a violation; never forwarded to the
    Board. Defense-in-depth over the Board's own hard rejection.
    """


class StaleFenceError(AgentRuntimeError):
    """A held fencing token is no longer current — the ticket is not ours.

    The runtime ABANDONS (drops the step, lets the lease lapse); it never
    blind-retries (RESEARCH §7.2 MENTOR spiral).
    """


class ClaimConflict(AgentRuntimeError):
    """Lost the atomic claim race — a business outcome, not a protocol error.

    The worker re-polls; it never treats the tool as broken
    (board-agents-claim.md §1).
    """


class AuthOutage(AgentRuntimeError):
    """Token mint failed (IdP 5xx / unreachable) — inferred absence, NOT a kill.

    Discriminated from a commanded drain by PROVENANCE OF THE SIGNAL
    (killswitch-chain.md §2 / PLAN §4.4). Triggers QUIESCED_BY_OUTAGE, never KILL.
    """
