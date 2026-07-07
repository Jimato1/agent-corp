"""The Notes client — checkpoint/resume writes (PLAN §2.2/§2.5; contract C12).

Notes is the durable checkpoint store (markdown = truth); the context window is a
cache. Two obligations enforced here IN CODE:

  * **Fencing echo-and-reject-stale on every ticket-bound write** — identical to the
    Board rule (IDENTIFIERS.md fencing row lists Notes as an "uncached live read"
    consumer). Every write on a ticket-bound note echoes the current fencing token;
    the Notes server validates it uncached against the Board and rejects stale; a
    stale rejection ⇒ StaleFenceError ⇒ ABANDON (never blind-retry).

  * **Constraint pinning survives compaction** — a checkpoint carries the pinned
    governance block (role prompt + "AR must dissent" + provenance rules) OUTSIDE
    the compactable region, so a resume re-reads it rather than a summary that may
    have silently dropped it (governance-decay defense, RESEARCH §8.A).

The Notes MCP transport is injected so the fencing logic is unit-tested without a
live Notes server; the concrete MCP transport is wired at runtime (INTEGRATION).
"""

from __future__ import annotations

from typing import Optional, Protocol

from .errors import StaleFenceError
from .ids import mint_op_id


class NotesTransport(Protocol):
    def write_note(self, ticket_id: str, fencing_token: int, frontmatter: dict,
                   body: str, op_id: str) -> dict: ...
    def read_note(self, note_id: str) -> dict: ...


class NotesClient:
    def __init__(self, transport: NotesTransport):
        self._t = transport

    def checkpoint(self, ticket_id: str, fencing_token: int, *, summary: str,
                   pinned_governance: str, status: str = "in_progress",
                   op_id: Optional[str] = None) -> dict:
        """Write a compacted, resumable checkpoint. Fencing token echoed; the Notes
        server rejects stale; the pinned governance is stored OUTSIDE the summary so
        a resume cannot lose it."""
        op_id = op_id or mint_op_id()
        frontmatter = {
            "type": "agent-checkpoint",
            "ticket_id": ticket_id,
            "status": status,
            "provenance": "agent-written",   # ARCH §12 provenance tag
            # pinned OUTSIDE the compactable body (survives compaction):
            "pinned_governance": pinned_governance,
        }
        resp = self._t.write_note(ticket_id, fencing_token, frontmatter, summary, op_id)
        if resp.get("isError"):
            if resp.get("code") in ("STALE_FENCE", "NOT_LEASE_HOLDER"):
                raise StaleFenceError(f"Notes write rejected (stale fence) on {ticket_id}: {resp}")
            return resp
        return resp

    def resume_context(self, note_id: str) -> dict:
        """Re-read the structured checkpoint trail to reconstruct state — NOT a
        transcript replay. The caller runs the §2.2 fencing re-check FIRST."""
        return self._t.read_note(note_id)
