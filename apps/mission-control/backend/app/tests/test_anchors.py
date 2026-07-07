"""Audit-anchor receive-and-retain (seam #25; gateway-mc-audit-anchor.md).

Append-only, idempotent by (chain_id, seq); gap => RESYNC-PENDING (benign, backfill-cleared);
same (chain_id, seq) different hash => regression/fork alarm. MC anchors the hash, not the
contents; the copy is never read back into a decision path.
"""
from __future__ import annotations

from app.tests.conftest import op_headers, svc_headers


def _push(client, chain, seq, h):
    return client.post("/api/anchors", headers=svc_headers("svc:gateway", "mc:anchor"),
                       json={"chain_id": chain, "seq": seq, "head_hash": h})


def test_retain_and_idempotent(client):
    assert _push(client, "gw-main", 1, "h1").json()["status"] == "retained"
    assert _push(client, "gw-main", 2, "h2").json()["status"] == "retained"
    # re-push of an already-retained HEAD is a safe no-op (bulk backfill safe).
    assert _push(client, "gw-main", 1, "h1").json()["status"] == "duplicate"


def test_advertises_last_retained_for_backfill(client):
    _push(client, "gw-main", 1, "h1")
    body = _push(client, "gw-main", 5, "h5").json()   # a gap: 2,3,4 missing
    assert body["last_retained"] == {"chain_id": "gw-main", "seq": 5}


def test_gap_is_resync_pending_not_tamper(client):
    _push(client, "gw-main", 1, "h1")
    _push(client, "gw-main", 3, "h3")                 # 2 missing
    r = client.get("/api/anchors?chain_id=gw-main", headers=op_headers())
    chain = r.json()["chains"][0]
    assert chain["status"] == "resync_pending"
    assert 2 in chain["gaps"]


def test_hash_conflict_is_regression_alarm(client):
    _push(client, "gw-main", 1, "h1")
    body = _push(client, "gw-main", 1, "DIFFERENT").json()   # same seq, different hash
    assert body["status"] == "regression"
    actions = [(r["action"], r["outcome"]) for r in client.app.state.repo.audit_tail()]
    assert ("anchor_fork", "alarm") in actions
