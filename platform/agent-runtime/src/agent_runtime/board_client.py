"""The Board loop client (consumes ``context/CONTRACTS/board-agents-claim.md``).

Implements the client obligations of the frozen claim/lease/fencing/transition
protocol (PLAN §2). Everything SoD- or fencing-relevant is enforced IN CODE:

  * **TransitionGuard** — the loop may cause ONLY the agent-causable transitions
    (TICKET_STATE_MACHINE.md §2 / board-agents-claim.md §4). Any attempt at
    approved/executing/verifying/done/failed/cancelled is hard-rejected, logged as
    a violation, and NEVER forwarded to the Board — regardless of what the driven
    model emitted. Defense-in-depth OVER the Board's own hard rejection.

  * **Fencing echo-and-reject-stale** — every side-effecting call echoes the
    current fencing token; the RECEIVING server (Board) is the high-water
    authority and rejects stale tokens. On any restart/reconnect the client
    re-reads lease state and compares tokens BEFORE acting ("am I still the lease
    holder at the current fence?"). A stale token ⇒ the ticket is not ours ⇒
    ABANDON (never blind-retry — RESEARCH §7.2).

The Board MCP transport is injected so the protocol LOGIC is unit-tested without a
live Board; the concrete MCP Streamable-HTTP transport (spec 2025-11-25) is wired
at runtime. A live Board round-trip is INTEGRATION.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Protocol

from .drain import DrainMachine
from .errors import ClaimConflict, StaleFenceError, TransitionForbidden
from .ids import mint_op_id

# board-agents-claim.md §4 / TICKET_STATE_MACHINE.md §2 — the ONLY agent-causable
# transitions. This set is the SoD boundary expressed as the tool surface.
AGENT_CAUSABLE_TARGETS: frozenset[str] = frozenset(
    {"in_progress", "awaiting_approval", "needs_review", "blocked", "todo"}
)
# Explicitly forbidden to agents (the runtime never causes any of these):
SOD_FORBIDDEN_TARGETS: frozenset[str] = frozenset(
    {"approved", "executing", "verifying", "done", "failed", "cancelled"}
)


@dataclass
class Lease:
    ticket_id: str
    fencing_token: int      # Board-minted, monotonic per resource (lock_generation)
    lease_ttl_sec: float


class BoardTransport(Protocol):
    """The MCP surface the Board exposes (indicative names; semantics bind)."""
    def claim_next(self) -> dict: ...
    def heartbeat(self, ticket_id: str, fencing_token: int) -> dict: ...
    def transition(self, ticket_id: str, fencing_token: int, to_state: str, op_id: str, reason: str) -> dict: ...
    def read_lease(self, ticket_id: str) -> dict: ...


class TransitionGuard:
    """The in-code SoD guard. Rejects any non-agent-causable target BEFORE the wire."""

    @staticmethod
    def check(to_state: str) -> None:
        if to_state in AGENT_CAUSABLE_TARGETS:
            return
        # Log-as-violation happens at the caller; here we hard-reject.
        raise TransitionForbidden(
            f"transition to '{to_state}' is NOT agent-causable (SoD boundary, "
            f"TICKET_STATE_MACHINE.md §2). Forbidden set touched: "
            f"{to_state in SOD_FORBIDDEN_TARGETS}. Never forwarded to the Board."
        )


class BoardClient:
    def __init__(self, transport: BoardTransport, drain: DrainMachine, *, logger=None):
        self._t = transport
        self._drain = drain
        self._log = logger

    # ---- claim -------------------------------------------------------------

    def claim_next(self) -> Optional[Lease]:
        """Attempt one atomic claim. Returns a Lease, or None on a lost race.

        FAIL-CLOSED: the pre-claim gate is checked FIRST — a draining/quiesced/
        unreconciled runtime can never win a claim (the gate makes the Gateway's
        'nothing new arrives' true by construction)."""
        if not self._drain.pre_claim_gate():
            return None  # drain/kill/outage/unreconciled — do not even ask
        resp = self._t.claim_next()
        if resp.get("isError"):
            code = resp.get("code")
            if code == "CLAIM_CONFLICT":
                raise ClaimConflict(str(resp))
            # zero rows / no work is a business outcome, not an error to the caller
            return None
        return Lease(
            ticket_id=resp["ticket_id"],
            fencing_token=int(resp["fencing_token"]),
            lease_ttl_sec=float(resp.get("lease_ttl_sec", 300.0)),
        )

    # ---- fencing re-check (crash/reconnect/wedge-recovery) -----------------

    def recheck_fence(self, lease: Lease) -> None:
        """FIRST question after any restart/reconnect: am I still the holder at the
        current fence? Stale ⇒ StaleFenceError ⇒ the caller ABANDONS (RESEARCH §8.A)."""
        state = self._t.read_lease(lease.ticket_id)
        current = int(state.get("fencing_token", -1))
        owner = state.get("current_owner")
        if current != lease.fencing_token:
            raise StaleFenceError(
                f"fence advanced on {lease.ticket_id}: held {lease.fencing_token} != "
                f"current {current} — ticket is not ours (owner={owner}); abandoning"
            )

    # ---- heartbeat (progress-gated lease renewal) --------------------------

    def heartbeat(self, lease: Lease, *, progress_ok: bool) -> bool:
        """Renew the Board lease — GATED on the work-progress predicate. A wedged
        agent (no progress) does NOT renew, so it self-fences and releases the host
        lock (RESEARCH §2.1). Returns True if renewed."""
        if not progress_ok:
            return False
        resp = self._t.heartbeat(lease.ticket_id, lease.fencing_token)
        if resp.get("isError"):
            # a stale-token heartbeat rejection means we were reaped — abandon.
            if resp.get("code") in ("STALE_FENCE", "NOT_LEASE_HOLDER"):
                raise StaleFenceError(f"heartbeat rejected on {lease.ticket_id}: {resp}")
            return False
        return True

    # ---- transition (guarded + fencing-echoed + reject-stale) --------------

    def transition(self, lease: Lease, to_state: str, *, reason: str = "", op_id: Optional[str] = None) -> dict:
        """Cause an agent transition. TransitionGuard runs FIRST (SoD). The current
        fencing token is echoed; the Board rejects stale tokens (echo-and-reject-
        stale); a stale rejection ⇒ StaleFenceError ⇒ abandon, never blind-retry."""
        try:
            TransitionGuard.check(to_state)
        except TransitionForbidden:
            if self._log:
                self._log.warning("SOD_VIOLATION: attempted forbidden transition to %s on %s",
                                  to_state, lease.ticket_id)
            raise
        op_id = op_id or mint_op_id()
        resp = self._t.transition(lease.ticket_id, lease.fencing_token, to_state, op_id, reason)
        if resp.get("isError"):
            if resp.get("code") in ("STALE_FENCE", "NOT_LEASE_HOLDER"):
                raise StaleFenceError(f"transition rejected (stale fence) on {lease.ticket_id}: {resp}")
            return resp
        return resp
