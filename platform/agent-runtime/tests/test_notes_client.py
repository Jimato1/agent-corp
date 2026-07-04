"""Notes checkpoint client: fencing echo-and-reject-stale + constraint pinning
(PLAN §2.2/§2.5; contract C12)."""

import pytest

from agent_runtime.errors import StaleFenceError
from agent_runtime.notes_client import NotesClient


class FakeNotes:
    def __init__(self, fence=1):
        self.fence = fence
        self.writes = []

    def write_note(self, ticket_id, fencing_token, frontmatter, body, op_id):
        if fencing_token != self.fence:
            return {"isError": True, "code": "STALE_FENCE"}
        self.writes.append((ticket_id, fencing_token, frontmatter, body, op_id))
        return {"note_id": "N-01", "ok": True}

    def read_note(self, note_id):
        return {"note_id": note_id, "body": "checkpoint"}


def test_checkpoint_echoes_fencing_and_pins_governance():
    notes = FakeNotes(fence=5)
    client = NotesClient(notes)
    client.checkpoint("T-000001", 5, summary="did X", pinned_governance="AR must dissent")
    _, ft, fm, body, op = notes.writes[-1]
    assert ft == 5                                   # fencing token echoed
    assert fm["pinned_governance"] == "AR must dissent"   # pinned OUTSIDE the body
    assert fm["provenance"] == "agent-written"       # ARCH §12 provenance tag
    assert body == "did X"


def test_stale_fence_write_is_rejected_and_abandons():
    notes = FakeNotes(fence=9)
    client = NotesClient(notes)
    with pytest.raises(StaleFenceError):
        client.checkpoint("T-000001", 3, summary="x", pinned_governance="g")  # old fence
    assert notes.writes == []   # never persisted


def test_resume_reads_the_trail_not_a_replay():
    notes = FakeNotes()
    client = NotesClient(notes)
    out = client.resume_context("N-01")
    assert out["note_id"] == "N-01"
