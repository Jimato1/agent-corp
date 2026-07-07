"""THE FOUR-CHECK SoD CHAIN (each check a coded hard-reject; none skippable, none
agent-overridable). PLAN §3.

``HardReject`` is the single failure type every check raises. The dispatcher catches it,
writes a first-class hash-chained **rejection** audit record (the hostile-model telemetry MC
watches), marks the run rejected/failed with the machine reason, escalates, and returns a
structured business error to the agent — **never a stack trace, never a path to dispatch.**
The agent supplied nothing but names; every fact was verified against its owning service.
"""
from __future__ import annotations


class HardReject(Exception):
    """A four-check chain refusal. ``reason`` is a stable machine code (the audit reason)."""

    def __init__(self, reason: str, message: str = "", *, burned_approval: bool = False,
                 escalate: bool = True) -> None:
        super().__init__(message or reason)
        self.reason = reason
        self.message = message or reason
        self.burned_approval = burned_approval  # true once consume has happened (report executing->failed)
        self.escalate = escalate


# Machine reasons (stable; surfaced in the audit chain + the S2 rejected-preflight render).
NO_APPROVED_TICKET = "NO_APPROVED_TICKET"
HOST_MISMATCH = "HOST_MISMATCH"
PLAN_BYTES_UNAVAILABLE = "PLAN_BYTES_UNAVAILABLE"
HOST_LOCKED = "HOST_LOCKED"                 # consume lost the host lock — approval NOT burned, retry
APPROVAL_CONSUMED = "APPROVAL_CONSUMED"     # already consumed (terminal)
APPROVAL_REVOKED = "APPROVAL_REVOKED"
PLAN_HASH_MISMATCH = "PLAN_HASH_MISMATCH"
ALLOWLIST_MISMATCH = "ALLOWLIST_MISMATCH"
UNKNOWN_PLAYBOOK = "UNKNOWN_PLAYBOOK"
PARAM_SCHEMA_VIOLATION = "PARAM_SCHEMA_VIOLATION"
FLOOR_VIOLATION = "FLOOR_VIOLATION"
CMDB_DENY = "CMDB_DENY"
VERDICT_INVALID = "VERDICT_INVALID"         # bad sig / kid / aud / iss / typ
VERDICT_EXPIRED = "VERDICT_EXPIRED"
VERDICT_REPLAY = "VERDICT_REPLAY"
WRONG_TARGET_CLASS = "WRONG_TARGET_CLASS"
WINDOW_MUST_FIT = "WINDOW_MUST_FIT"
STALE_FENCE = "STALE_FENCE"
MUTEX_HELD = "MUTEX_HELD"                   # local advisory lock busy while holding a Board hold — invariant violation
CREDENTIAL_DENIED = "CREDENTIAL_DENIED"     # Vault 403/503/expired release
HALTED = "HALTED"                           # kill switch >= G1 refuses dispatch
DEPENDENCY_DOWN = "DEPENDENCY_DOWN"         # a holder is unreachable => fail closed
