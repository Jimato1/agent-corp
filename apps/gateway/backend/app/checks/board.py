"""Check 1 — Board facts (1a) validation (pure). PLAN §3-1.

1a (no side effects): the ticket exists, ``status == 'approved'``, an ``approval_id`` is
present, and the ``host_id`` matches the request. Taint/lane facts are logged. **The agent
named ``ticket_id`` and ``host_id`` only** — every fact is read live from the Board PIP
(``GET /facts/ticket/{ticket_id}``, ``Cache-Control: no-store``), never request-supplied.

The consume itself (1c) is a side-effecting Board call handled by the orchestrator via the
Board client; the binding verification (1d) lives in ``catalog.verify_binding``.
"""
from __future__ import annotations

from . import HOST_MISMATCH, NO_APPROVED_TICKET, HardReject


def check_ticket_facts(facts: dict, ticket_id: str, host_id: str) -> dict:
    """Validate the Board /facts/ticket response. Return the approval binding, or raise."""
    if not facts or not facts.get("exists"):
        raise HardReject(NO_APPROVED_TICKET, f"ticket {ticket_id} does not exist")
    if facts.get("status") != "approved":
        raise HardReject(NO_APPROVED_TICKET,
                         f"ticket {ticket_id} status {facts.get('status')!r} != approved")
    approval_id = facts.get("approval_id")
    if not approval_id:
        raise HardReject(NO_APPROVED_TICKET, f"ticket {ticket_id} carries no approval_id")
    if facts.get("host_id") != host_id:
        raise HardReject(HOST_MISMATCH,
                         f"ticket host_id {facts.get('host_id')!r} != requested {host_id!r}")
    return {
        "approval_id": approval_id,
        "plan_note_id": facts.get("plan_note_id"),
        "plan_note_rev": facts.get("plan_note_rev"),
        "release_id": facts.get("release_id"),
        "taint_host_originated": bool(facts.get("taint_host_originated")),
        "lane": facts.get("lane"),
    }
