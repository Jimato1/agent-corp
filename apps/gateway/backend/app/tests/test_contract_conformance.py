"""Contract-conformance: the CMDB verdict-token §4 validation algorithm (verbatim). These
prove COUNTERSIGN-1 (Gateway confirms §4 steps 2-3 and 8 are coded — esp. the aud=='gateway'
anti-relay reject and the host_class/verdict_basis surface cross-check)."""
from __future__ import annotations

import time

import pytest

from app.authn.jwks import KeyRing, _verifier_from_jwk
from app.checks import (
    CMDB_DENY,
    VERDICT_EXPIRED,
    VERDICT_INVALID,
    VERDICT_REPLAY,
    WINDOW_MUST_FIT,
    WRONG_TARGET_CLASS,
    HardReject,
)
from app.checks.cmdb import validate_verdict
from .conftest import VerdictSigner, _iso


def _claims(**over):
    now = int(time.time())
    base = {"verdict": "permit", "iss": "cmdb", "aud": "gateway", "jti": f"D-{now}-{id(over)}",
            "iat": now, "exp": now + 60, "valid_until": _iso(now + 60), "evaluated_at": _iso(now),
            "policy_version": "pv1", "host_class": "managed", "grace": 0}
    base.update(over)
    return base


@pytest.fixture
def sv():
    return VerdictSigner()


@pytest.fixture
def ring(sv):
    return sv.keyring()


def _validate(jws, ring, **kw):
    defaults = dict(expected_aud="gateway", require_host_class="managed", require_verdict_basis=None,
                    seen_decision_id=lambda _d: False, est_duration_s=30, has_consumed_approval=True)
    defaults.update(kw)
    return validate_verdict(jws, ring, **defaults)


def test_permit_managed_validates(sv, ring):
    claims = _validate(sv.sign(_claims()), ring)
    assert claims["verdict"] == "permit"


def test_board_audience_is_rejected_anti_relay(sv, ring):
    # A tier-approver verdict (aud=board) must never be Gateway-redeemable (§3 anti-relay).
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims(aud="board")), ring)
    assert e.value.reason == VERDICT_INVALID


def test_multi_valued_audience_is_rejected(sv, ring):
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims(aud=["gateway", "board"])), ring)
    assert e.value.reason == VERDICT_INVALID


def test_wrong_issuer_rejected(sv, ring):
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims(iss="evil")), ring)
    assert e.value.reason == VERDICT_INVALID


def test_expired_verdict_rejected_zero_skew(sv, ring):
    now = int(time.time())
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims(exp=now - 1, valid_until=_iso(now - 1))), ring)
    assert e.value.reason == VERDICT_EXPIRED


def test_unknown_kid_rejected(ring):
    other = VerdictSigner(kid="cmdb-verdict-OTHER")
    with pytest.raises(HardReject) as e:
        _validate(other.sign(_claims()), ring)          # signed by a kid not in the served set
    assert e.value.reason == VERDICT_INVALID


def test_auth_key_verdict_rejected(sv):
    # A verdict must be signed by CMDB's LOCAL key, never accepted under auth's identity keys:
    # an empty verdict keyring (no CMDB key) rejects everything.
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims()), KeyRing())
    assert e.value.reason == VERDICT_INVALID


def test_replayed_decision_id_rejected(sv, ring):
    seen = set()

    def seen_cb(did):
        if did in seen:
            return True
        seen.add(did)
        return False

    claims = _claims()
    jws = sv.sign(claims)
    _validate(jws, ring, seen_decision_id=seen_cb)      # first use OK
    with pytest.raises(HardReject) as e:
        _validate(jws, ring, seen_decision_id=seen_cb)  # replay
    assert e.value.reason == VERDICT_REPLAY


def test_deny_rejected(sv, ring):
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims(verdict="deny")), ring)
    assert e.value.reason == CMDB_DENY


def test_ask_without_consumed_approval_rejected(sv, ring):
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims(verdict="ask")), ring, has_consumed_approval=False)
    assert e.value.reason == CMDB_DENY


def test_wrong_host_class_rejected(sv, ring):
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims(host_class="disposable")), ring, require_host_class="managed")
    assert e.value.reason == WRONG_TARGET_CLASS


def test_must_fit_rejects_when_window_too_small(sv, ring):
    now = int(time.time())
    # window closes in 10s but est_duration is 300s → must-fit fails.
    with pytest.raises(HardReject) as e:
        _validate(sv.sign(_claims(window_closes_at=_iso(now + 10))), ring, est_duration_s=300)
    assert e.value.reason == WINDOW_MUST_FIT
