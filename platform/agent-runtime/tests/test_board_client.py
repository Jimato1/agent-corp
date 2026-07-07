"""Board loop client: TransitionGuard (SoD in code) + fencing echo-and-reject-stale
+ progress-gated heartbeat + crash-restart fence re-check (PLAN §2)."""

import pytest

from agent_runtime.board_client import (
    AGENT_CAUSABLE_TARGETS, SOD_FORBIDDEN_TARGETS, BoardClient, Lease,
    TransitionGuard,
)
from agent_runtime.drain import DrainMachine
from agent_runtime.errors import StaleFenceError, TransitionForbidden


class FakeBoard:
    def __init__(self, fence=1):
        self.fence = fence
        self.transition_calls = []
        self.claim_calls = 0

    def claim_next(self):
        self.claim_calls += 1
        return {"ticket_id": "T-000001", "fencing_token": self.fence, "lease_ttl_sec": 300}

    def heartbeat(self, ticket_id, fencing_token):
        if fencing_token != self.fence:
            return {"isError": True, "code": "STALE_FENCE"}
        return {"ok": True}

    def transition(self, ticket_id, fencing_token, to_state, op_id, reason):
        if fencing_token != self.fence:
            return {"isError": True, "code": "STALE_FENCE"}
        self.transition_calls.append((ticket_id, fencing_token, to_state, op_id, reason))
        return {"ok": True}

    def read_lease(self, ticket_id):
        return {"fencing_token": self.fence, "current_owner": "someone-else"}


def _reconciled_drain():
    m = DrainMachine()
    m.mark_reconciled()
    return m


def test_transition_guard_matches_state_machine():
    # the agent-causable set is exactly TICKET_STATE_MACHINE §2.
    assert AGENT_CAUSABLE_TARGETS == {"in_progress", "awaiting_approval", "needs_review", "blocked", "todo"}
    assert SOD_FORBIDDEN_TARGETS == {"approved", "executing", "verifying", "done", "failed", "cancelled"}


@pytest.mark.parametrize("forbidden", sorted(SOD_FORBIDDEN_TARGETS))
def test_forbidden_transition_is_never_forwarded(forbidden):
    board = FakeBoard()
    client = BoardClient(board, _reconciled_drain())
    lease = Lease("T-000001", 1, 300)
    with pytest.raises(TransitionForbidden):
        client.transition(lease, forbidden)
    # the guard runs BEFORE the wire — the Board never sees the forbidden call.
    assert board.transition_calls == []


@pytest.mark.parametrize("allowed", sorted(AGENT_CAUSABLE_TARGETS))
def test_agent_causable_transitions_pass(allowed):
    board = FakeBoard()
    client = BoardClient(board, _reconciled_drain())
    lease = Lease("T-000001", 1, 300)
    client.transition(lease, allowed, reason="ok")
    assert board.transition_calls and board.transition_calls[-1][2] == allowed


def test_guard_check_directly():
    TransitionGuard.check("needs_review")  # ok
    with pytest.raises(TransitionForbidden):
        TransitionGuard.check("executing")


def test_claim_blocked_while_gate_shut():
    board = FakeBoard()
    drain = DrainMachine()  # NOT reconciled → gate shut (M3)
    client = BoardClient(board, drain)
    assert client.claim_next() is None
    assert board.claim_calls == 0  # never even asks the Board


def test_stale_fence_on_transition_raises_abandon():
    board = FakeBoard(fence=5)
    client = BoardClient(board, _reconciled_drain())
    stale_lease = Lease("T-000001", 3, 300)  # holds an old fence
    with pytest.raises(StaleFenceError):
        client.transition(stale_lease, "needs_review")


def test_recheck_fence_detects_advance():
    board = FakeBoard(fence=9)
    client = BoardClient(board, _reconciled_drain())
    stale_lease = Lease("T-000001", 4, 300)
    with pytest.raises(StaleFenceError):
        client.recheck_fence(stale_lease)  # first question after restart — not ours
    # a current lease passes.
    client.recheck_fence(Lease("T-000001", 9, 300))


def test_heartbeat_is_progress_gated():
    board = FakeBoard()
    client = BoardClient(board, _reconciled_drain())
    lease = Lease("T-000001", 1, 300)
    assert client.heartbeat(lease, progress_ok=False) is False  # wedged → no renew (self-fence)
    assert client.heartbeat(lease, progress_ok=True) is True


def test_heartbeat_stale_fence_raises():
    board = FakeBoard(fence=7)
    client = BoardClient(board, _reconciled_drain())
    with pytest.raises(StaleFenceError):
        client.heartbeat(Lease("T-000001", 2, 300), progress_ok=True)
