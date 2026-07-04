"""Auth degraded mode: QUIESCED_BY_OUTAGE (not KILL), backoff/breaker, and the
M2/M3 kill-epoch reconcile that reopens the fail-closed gate (PLAN §4.4/§5)."""

import pytest

from agent_runtime.auth_client import AuthClient
from agent_runtime.custody import KeyCustody, NullProvider
from agent_runtime.drain import DrainMachine, Level
from agent_runtime.errors import AuthOutage


def _client(post=None, get=None, threshold=3):
    custody = KeyCustody(NullProvider())
    drain = DrainMachine()
    ac = AuthClient(custody, drain, http_post=post, http_get=get,
                    fail_threshold=threshold, rand=lambda: 0.5)
    return ac, drain


def test_mint_5xx_raises_auth_outage_not_kill():
    ac, drain = _client(post=lambda p, b: (503, {}))
    with pytest.raises(AuthOutage):
        ac.mint_token("agent-1")
    # an outage is inferred absence — the machine is NOT killed.
    assert drain.level is Level.RUN


def test_repeated_failures_open_breaker_and_quiesce():
    ac, drain = _client(threshold=3)
    for _ in range(3):
        ac.on_mint_failure()
    assert drain.in_outage is True         # entered QUIESCED_BY_OUTAGE
    assert drain.pre_claim_gate() is False # gate shut
    assert drain.reconciled is False       # M2: must reconcile before resuming


def test_full_jitter_backoff_is_bounded_and_grows():
    ac, drain = _client()
    ac._base, ac._cap = 1.0, 60.0
    s0 = ac.next_backoff_sleep()  # ceiling 1 → 0.5
    s1 = ac.next_backoff_sleep()  # ceiling 2 → 1.0
    s2 = ac.next_backoff_sleep()  # ceiling 4 → 2.0
    assert 0 <= s0 <= 1 and 0 <= s1 <= 2 and 0 <= s2 <= 4
    assert s2 > s0


def test_reconcile_adopts_epoch_and_opens_gate():
    # M3: gate shut until a successful epoch poll; then it opens.
    ac, drain = _client(get=lambda p: (200, {"epoch": 12, "level": "run"}))
    assert drain.pre_claim_gate() is False
    assert ac.reconcile_kill_epoch() is True
    assert drain.epoch == 12
    assert drain.reconciled is True
    assert drain.pre_claim_gate() is True


def test_reconcile_seeing_kill_transitions_to_kill_not_resume():
    # M2: a KILL raised during the blackout is adopted on recovery — never resume.
    ac, drain = _client(get=lambda p: (200, {"epoch": 20, "level": "kill"}))
    ac.reconcile_kill_epoch()
    assert drain.level is Level.KILL
    assert drain.pre_claim_gate() is False  # killed → still no claim


def test_reconcile_failure_keeps_gate_shut():
    ac, drain = _client(get=lambda p: (503, {}))
    assert ac.reconcile_kill_epoch() is False
    assert drain.reconciled is False
    assert drain.pre_claim_gate() is False  # fail-closed: no gate open on failed poll


def test_no_auth_transport_is_fail_closed():
    ac, drain = _client()  # no get wired (integration)
    assert ac.reconcile_kill_epoch() is False
    assert drain.pre_claim_gate() is False
