"""Per-host mutex correctness (two concurrent execs, one host → serialized) + fencing
stale-reject. PLAN §3-4 / §5. Mutex correctness is a SECURITY property (prevents dpkg/apt
collisions), not a nicety."""
from __future__ import annotations

import threading

from app.checks import MUTEX_HELD, STALE_FENCE, HardReject
from app.checks.mutex import HostMutex, check_fencing
from .conftest import call_execute


def test_mutex_single_holder_sequential(make_app):
    app, _client, _c = make_app()
    db = app.state.db
    m1 = HostMutex(db, "nas-01", "R-1")
    m1.acquire()
    assert m1.held
    m2 = HostMutex(db, "nas-01", "R-2")
    try:
        raised = False
        try:
            m2.acquire()
        except HardReject as hr:
            raised = True
            assert hr.reason == MUTEX_HELD
        assert raised, "second acquire on the same host must be refused (never queued)"
    finally:
        m1.release()
    # after release the host is free again
    m3 = HostMutex(db, "nas-01", "R-3")
    m3.acquire()
    assert m3.held
    m3.release()


def test_mutex_two_concurrent_threads_one_winner(make_app):
    app, _client, _c = make_app()
    db = app.state.db
    results = {}
    start = threading.Barrier(2)

    def worker(name):
        m = HostMutex(db, "web-03", f"R-{name}")
        start.wait()
        try:
            m.acquire()
            results[name] = "won"
            # hold briefly so the other thread definitely contends
            import time
            time.sleep(0.1)
            m.release()
        except HardReject:
            results[name] = "refused"

    t1 = threading.Thread(target=worker, args=("a",))
    t2 = threading.Thread(target=worker, args=("b",))
    t1.start(); t2.start(); t1.join(); t2.join()
    assert sorted(results.values()) == ["refused", "won"], results  # exactly one winner


def test_mutex_different_hosts_both_acquire(make_app):
    app, _client, _c = make_app()
    db = app.state.db
    a = HostMutex(db, "h-a", "R-a"); a.acquire()
    b = HostMutex(db, "h-b", "R-b"); b.acquire()
    assert a.held and b.held
    a.release(); b.release()


def test_fencing_stale_reject_pure():
    check_fencing(5, 4)  # ok: 5 > 4
    raised = False
    try:
        check_fencing(4, 4)  # equal → stale
    except HardReject as hr:
        raised = True
        assert hr.reason == STALE_FENCE
    assert raised


def test_fencing_stale_reject_in_chain(make_app, executor):
    app, client, clients = make_app()
    # Host high-water is already 9; a consume that mints a lower fencing token is split-brain.
    app.state.runs.bump_fence("nas-01", 9)
    clients.board.consume_response["fencing_token"] = 3
    out = call_execute(client, executor)
    assert out["reason"] == STALE_FENCE
    assert len(app.state.dispatcher.dispatched) == 0
