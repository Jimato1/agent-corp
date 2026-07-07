"""The unified review + approval queue producer (PLAN §1.4, §7; contract §1-2).

MC is the CANONICAL owner of this queue. The review-item identity **IS the Board
``ticket_id``** — MC mints no id (contract §1). Decisions are written **browser-direct
to Board** under the operator's own session (§5.3) — deliberately NOT an MC route, so no
approve-capable credential ever rests in MC's backend.

Every item carries the gate discriminator, criticality tier, provenance taint
(host-originated => auto-approve-lane INELIGIBLE — rendered, not decided, ARCH §12),
and the ack state keyed on ``(ticket_id, gate, entry)`` (gate-entry freshness, A10).
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from ..authn.principal import Principal, require_read
from . import get_board, get_repo

router = APIRouter(tags=["queue"])

# The full 11-state superset MC renders (TICKET_STATE_MACHINE.md §1) — never an invented subset.
STATE_SUPERSET = [
    "todo", "in_progress", "awaiting_approval", "approved", "executing",
    "verifying", "needs_review", "blocked", "done", "failed", "cancelled",
]
_GATE_STATES = {"awaiting_approval", "needs_review", "blocked"}


def _gate_of(state: str, item: dict) -> str:
    if state == "awaiting_approval":
        return "awaiting_approval"
    if state == "blocked" and item.get("escalation"):
        return "escalated"
    return "needs_review"


def _provenance(item: dict) -> dict:
    """Render provenance taint (rendered, not decided). Host-originated => UNTRUSTED,
    auto-approve-lane ineligible (ARCH §12) — the UI shows the fact; the server enforces
    the lane."""
    taint = str(item.get("provenance") or item.get("taint") or "single")
    host_orig = bool(item.get("host_originated")) or taint in ("host-originated", "untrusted")
    if host_orig:
        return {"tier": "untrusted", "auto_lane_eligible": False, "note": item.get("provenance_note", "host-originated")}
    if taint in ("gateway-delivered", "verified"):
        return {"tier": "verified", "auto_lane_eligible": True, "note": taint}
    if taint == "cross-referenced":
        return {"tier": "corroborated", "auto_lane_eligible": True, "note": taint}
    return {"tier": "single", "auto_lane_eligible": True, "note": taint}


def _project(item: dict, repo) -> dict:
    state = str(item.get("state") or item.get("status") or "needs_review")
    gate = _gate_of(state, item)
    entry = int(item.get("gate_entry", 1))
    tid = str(item.get("ticket_id") or item.get("id"))
    return {
        "ticket_id": tid,
        "state": state,
        "gate": gate,
        "gate_entry": entry,
        "tier": item.get("tier"),
        "provenance": _provenance(item),
        "proposer": item.get("proposer") or item.get("claimed_by"),
        "age": item.get("age"),
        "reason": item.get("reason") or item.get("escalation_reason"),
        "ceremony_phase": item.get("ceremony_phase"),
        "acked": repo.is_acked(tid, gate, entry),
        "review_url": repo.s.review_url(tid),
    }


@router.get("/queue")
async def queue(request: Request, filter: str | None = None, _: Principal = Depends(require_read)):
    board = get_board(request)
    repo = get_repo(request)
    src = await board.get_queue()
    if src.data is None:
        # Honest degrade — decisions must be disabled by the UI against an unknown state.
        return {"source": "board", "stale": True, "error": src.error,
                "decisions_enabled": False, "items": [], "state_superset": STATE_SUPERSET}
    raw = src.data.get("items", src.data) if isinstance(src.data, dict) else src.data
    items = [_project(i, repo) for i in (raw or []) if str(i.get("state") or i.get("status")) in _GATE_STATES]
    if filter and filter != "all":
        want = "escalated" if filter == "escalations" else filter
        items = [i for i in items if i["gate"] == want]
    return {"source": "board", "stale": src.stale, "as_of_seconds": round(src.as_of, 3),
            "decisions_enabled": not src.stale, "items": items, "state_superset": STATE_SUPERSET}


@router.get("/queue/{ticket_id:path}")
async def queue_item(ticket_id: str, request: Request, _: Principal = Depends(require_read)):
    board = get_board(request)
    repo = get_repo(request)
    src = await board.get_ticket(ticket_id)
    # Latest resolution + gate history for a ticket MC has observed resolve.
    history = repo._read_all(
        "SELECT gate, outcome, actor_kind, resolved_at FROM resolve_log WHERE ticket_id=? "
        "ORDER BY resolve_seq DESC", (ticket_id,))
    if src.data is None:
        # Never a bare 404 for a well-formed ticket_id (contract §2): "not in queue" + Board link.
        return {"ticket_id": ticket_id, "in_queue": False, "stale": src.stale,
                "message": "not in queue", "board_link": f"{board.base_url}/tickets/{ticket_id}",
                "resolution_history": history, "review_url": repo.s.review_url(ticket_id)}
    item = _project(src.data if isinstance(src.data, dict) else {"ticket_id": ticket_id}, repo)
    item.update({"in_queue": item["state"] in _GATE_STATES, "resolution_history": history,
                 "plan": (src.data or {}).get("plan"), "stale": src.stale})
    return item
