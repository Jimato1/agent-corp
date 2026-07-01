"""auth.core.errors — typed errors for the identity gateway.

Every failure mode that a caller (Core API, MCP surface, UI, PDP, forward-auth)
must branch on is a distinct type here so it can be mapped to the right wire
status (§5.6) without string-sniffing. FailClosed is the catch-all "when in
doubt, deny" signal for high-stakes paths (decision #3).
"""
from __future__ import annotations

from typing import FrozenSet, Optional, Tuple


class AuthError(Exception):
    """Base class for every auth-owned error."""


# --- structural / model-integrity errors ------------------------------------

class ImmutableFieldError(AuthError):
    """Attempt to mutate a field that is immutable after creation.

    Guards Principal.sub / Principal.kind / Principal.agent_class (§3.5, §3.7,
    finding 4f): kind cannot be flipped to break_glass, sub is the audit-canonical
    anchor, agent_class gates which roles are assignable.
    """


class ConflictSetImmutableError(AuthError):
    """Attempt to mutate the compiled-in SoD ConflictSet at runtime (§3.5, finding 4a).

    The four holder conflict pairs are hardcoded constants. There is NO online
    admin/API/config path to delete, weaken, or widen them — a change is a code
    change + redeploy (settled decision #5). Any mutation attempt raises this.
    """


# --- authorization / SoD errors ---------------------------------------------

class SoDViolation(AuthError):
    """A mutation would let one principal hold a forbidden holder ConflictPair.

    Raised at GRANT/ASSIGNMENT time (never at token-mint time — the conflict is
    made impossible at rest, §3.5). Carries the offending principal and pair so
    the audit line and UI can name exactly what was refused.
    """

    def __init__(self, sub: str, pair: FrozenSet[str], message: Optional[str] = None):
        self.sub = sub
        self.pair = frozenset(pair)
        if message is None:
            a, b = sorted(self.pair)
            message = (
                f"SoD violation: principal {sub!r} would hold the forbidden "
                f"holder pair {{{a}, {b}}} in its effective scope closure"
            )
        super().__init__(message)


class KindGateViolation(AuthError):
    """A role was assigned to a principal whose kind/agent_class is not permitted.

    Holder scopes are reachable only through kind-restricted roles (§3.5 guarantee
    2): gateway:execute via executor agents; vault:read-credential via service
    principals only; break-glass roles only to kind=break_glass.
    """


class AttestationRequired(AuthError):
    """Refused activation of a holder/destructive role on a non-attested key.

    Assignment-time invariant (§3.6, finding 1a): any principal whose effective
    closure would contain a holder/destructive scope MUST have a registered
    AgentKey attested non_exportable (hardware-bound). A soft-key executor/holder
    is a NO-GO, refused here — not a permitted configuration.
    """


class InsufficientScope(AuthError):
    """Valid token, but it does not carry the coarse scope for the invoked surface.

    Maps to 403 error="insufficient_scope" (§5.6). Distinct from an SoD policy
    deny, which must NEVER be signalled as insufficient_scope (that would invite
    scope-widening — exactly the escalation we forbid).
    """

    def __init__(self, required_scope: str, message: Optional[str] = None):
        self.required_scope = required_scope
        super().__init__(message or f"insufficient_scope: requires {required_scope!r}")


# --- fail-closed / availability errors --------------------------------------

class FailClosed(AuthError):
    """High-stakes path could not confirm live state → deny (decision #3).

    Raised whenever a destructive / SoD-critical path cannot read authoritative
    revocation/kill state, an introspection dependency is lost, or a live check
    times out. The only safe answer is DENY. Never fail-open on these paths.
    """

    def __init__(self, reason: str, message: Optional[str] = None):
        self.reason = reason  # machine code, e.g. "revocation_unreadable", "timeout"
        super().__init__(message or f"fail-closed: {reason}")


class UnknownScope(AuthError):
    """Reference to a scope id that is not in the canonical taxonomy (§3.3)."""


class UnknownPrincipal(AuthError):
    """Reference to a sub that has no Principal in the store."""


class UnknownRole(AuthError):
    """Reference to a role id that has no Role in the store."""


class RoleHierarchyError(AuthError):
    """A hierarchy edge would create a cycle, or references a missing role."""
