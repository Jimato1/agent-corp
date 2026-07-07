"""Immutable audit chain (append-only, hash-chained, Ed25519-signed) + the kill-switch
chokepoint (halting the Gateway halts all destructive action, regardless of agent intent)."""
from __future__ import annotations

from .conftest import call_execute


# ---- audit chain -----------------------------------------------------------
def test_chain_appends_and_verifies(make_app):
    app, _client, _c = make_app()
    chain = app.state.chain
    chain.append(record_type="task_event", run_id="R-1", action="t1", outcome="0")
    chain.append(record_type="task_event", run_id="R-1", action="t2", outcome="0")
    intact, reason, _lo, _hi = chain.verify(0)
    assert intact, reason


def test_chain_detects_tampering(make_app):
    app, _client, _c = make_app()
    chain = app.state.chain
    chain.append(record_type="task_event", run_id="R-1", action="t1", outcome="0")
    # Tamper a past row's payload directly (simulating store-level rewrite).
    with app.state.db.tx() as c:
        c.execute("UPDATE audit_chain SET outcome = 'TAMPERED' WHERE seq = 1")
    intact, reason, _lo, _hi = chain.verify(0)
    assert not intact
    assert "hash mismatch" in reason or "signature" in reason


def test_rejection_is_a_first_class_chained_record(make_app, executor):
    app, client, clients = make_app()
    clients.cmdb.verdict = "deny"
    call_execute(client, executor)
    c = app.state.db.reader()
    try:
        c.execute("SELECT COUNT(*) AS n FROM audit_chain WHERE record_type = 'reject'")
        n = int(c.fetchone()["n"])
    finally:
        c.close()
    assert n >= 1  # the hostile-model telemetry MC watches


def test_every_dispatch_and_terminal_is_recorded(make_app, executor):
    app, client, _c = make_app()
    out = call_execute(client, executor)
    run_id = out["run_id"]
    c = app.state.db.reader()
    try:
        c.execute("SELECT record_type FROM audit_chain WHERE run_id = ?", (run_id,))
        types = {r["record_type"] for r in c.fetchall()}
    finally:
        c.close()
    # SoD proof reconstructible from the chain alone (PLAN §3).
    for needed in ("consume_approval", "cmdb_verdict", "cred_redeem", "mutex", "dispatch", "terminal"):
        assert needed in types, f"missing {needed} in {types}"


def test_no_plaintext_credential_in_audit(make_app, executor):
    app, client, _c = make_app()
    out = call_execute(client, executor)
    c = app.state.db.reader()
    try:
        c.execute("SELECT payload FROM audit_chain WHERE run_id = ?", (out["run_id"],))
        blobs = " ".join(str(r["payload"]) for r in c.fetchall())
    finally:
        c.close()
    assert "cred://" in blobs                       # the powerless handle IS logged
    for forbidden in ("private_key", "BEGIN OPENSSH", "signed_key", "plaintext"):
        assert forbidden not in blobs               # nothing credential-shaped ever


# ---- kill-switch chokepoint ------------------------------------------------
def test_kill_gate_refuses_dispatch_regardless_of_agent_intent(make_app, executor):
    app, client, clients = make_app()
    app.state.kill.observe(epoch=4471, level="G1")   # auth raised the kill epoch
    out = call_execute(client, executor)
    assert out["reason"] == "HALTED"
    assert len(app.state.dispatcher.dispatched) == 0
    assert clients.board.consumed is False           # never reached Board


def test_kill_epoch_is_monotonic(make_app):
    app, _client, _c = make_app()
    kill = app.state.kill
    kill.observe(epoch=10, level="G1")
    kill.observe(epoch=5, level="G0")                # stale epoch: must NOT lower the level
    assert kill.current()["level"] == "G1"
    assert kill.current()["epoch"] == 10


def test_halt_status_is_signed_l2_confirmed_source(make_app):
    app, _client, _c = make_app()
    app.state.kill.observe(epoch=4471, level="G1")
    tup = app.state.kill.halt_status()
    assert tup["epoch_seen"] == 4471 and tup["level"] == "G1"
    assert tup.get("sig") and tup.get("kid")         # signed tuple auth reads directly
    # the signature verifies under the Gateway's audit key
    import json
    body = json.dumps({k: tup[k] for k in ("epoch_seen", "level", "in_flight_runs",
                                           "last_dispatch_refused_at", "local_halt")},
                      separators=(",", ":"), sort_keys=True).encode()
    assert app.state.signer.verify(body, tup["sig"])


def test_halt_status_endpoint_readable_without_scope(make_app):
    app, client, _c = make_app()
    r = client.get("/api/halt-status")
    assert r.status_code == 200
    assert "epoch_seen" in r.json()


def test_kill_between_checks_and_redeem_issues_no_credential(make_app, executor):
    """A kill thrown AFTER the initial gate but BEFORE redeem must refuse to BEGIN redemption
    (§8 (2)) — no new credential is ever issued post-kill (verifier defect #1)."""
    app, client, clients = make_app()
    orig = clients.cmdb.decision
    calls = {"n": 0}

    def hooked(*a, **k):
        calls["n"] += 1
        if calls["n"] == 2:                       # the authoritative verdict, just before redeem
            app.state.kill.observe(epoch=9999, level="G1")
        return orig(*a, **k)

    clients.cmdb.decision = hooked
    out = call_execute(client, executor)
    assert out["reason"] == "HALTED"
    assert clients.vault.redeem_calls == 0         # credential never issued
    assert len(app.state.dispatcher.dispatched) == 0
    assert clients.board.consumed is True          # consume happened → reported failed(halted)


def test_kill_after_redeem_revokes_lease(make_app, executor):
    """A kill thrown between redeem and dispatch must revoke the just-issued lease (§8 (4))."""
    app, client, clients = make_app()
    orig = clients.vault.redeem

    def hooked(*a, **k):
        r = orig(*a, **k)
        app.state.kill.observe(epoch=9999, level="G1")   # kill lands post-redeem, pre-dispatch
        return r

    clients.vault.redeem = hooked
    out = call_execute(client, executor)
    assert out["reason"] == "HALTED"
    assert clients.vault.revoked == ["lse-1"]      # outstanding lease revoked
    assert len(app.state.dispatcher.dispatched) == 0
