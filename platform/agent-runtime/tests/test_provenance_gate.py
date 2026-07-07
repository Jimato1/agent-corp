"""The fail-closed model-provenance gate (PLAN §6.2). Every negative path must
FAIL CLOSED (raise, no admission); the good path records the ledger."""

import pytest

from agent_runtime.errors import ProvenanceFailure
from agent_runtime.provenance import ModelPin, ProvenanceGate

GOOD_DIGEST = "a" * 64
GOOD_SHA = "b" * 64


def _pin(**kw):
    base = dict(role="hands-pool", model_id="org/model", repo="org/model",
                commit_digest=GOOD_DIGEST, quant="Q4_K_M", sha256=GOOD_SHA,
                sig_ref="sigstore:ok", fmt="safetensors")
    base.update(kw)
    return ModelPin(**base)


def test_pickle_format_denied():
    gate = ProvenanceGate(hash_fn=lambda p: p.sha256, sig_verify_fn=lambda p: True)
    with pytest.raises(ProvenanceFailure):
        gate.verify(_pin(fmt="pickle"))


def test_mutable_tag_instead_of_digest_denied():
    gate = ProvenanceGate(hash_fn=lambda p: p.sha256, sig_verify_fn=lambda p: True)
    for bad in ("main", "latest", "v1.2", "short"):
        with pytest.raises(ProvenanceFailure):
            gate.verify(_pin(commit_digest=bad))


def test_sha256_mismatch_fails_closed():
    gate = ProvenanceGate(hash_fn=lambda p: "c" * 64, sig_verify_fn=lambda p: True)
    with pytest.raises(ProvenanceFailure):
        gate.verify(_pin())


def test_bad_signature_fails_closed():
    gate = ProvenanceGate(hash_fn=lambda p: p.sha256, sig_verify_fn=lambda p: False)
    with pytest.raises(ProvenanceFailure):
        gate.verify(_pin())


def test_no_verifiers_fails_closed_by_default():
    # sandbox default: no real hash/sig verifier wired → NOT admitted (honest).
    gate = ProvenanceGate()
    with pytest.raises(ProvenanceFailure):
        gate.verify(_pin())
    assert gate.fully_armed is False


def test_good_path_admits_and_records_ledger():
    ledger = []
    gate = ProvenanceGate(hash_fn=lambda p: p.sha256, sig_verify_fn=lambda p: True,
                          on_ledger=ledger.append)
    rec = gate.verify(_pin())
    assert rec.outcome == "verified"
    assert ledger and ledger[-1].outcome == "verified"
    assert gate.fully_armed is True


def test_soft_posture_never_fabricates_a_green():
    # the sandbox soft-posture may skip an ABSENT verifier — but it must record
    # outcome='unverified', NEVER 'verified' (the escape hatch cannot fake a green).
    ledger = []
    gate = ProvenanceGate(allow_unverified_in_sandbox=True, on_ledger=ledger.append)
    rec = gate.verify(_pin())  # no verifiers wired, but soft posture allows load
    assert rec.outcome == "unverified"           # honest unknown, not a green
    assert gate.fully_armed is False
    # a HARD failure (pickle) still raises even under the soft posture.
    with pytest.raises(ProvenanceFailure):
        gate.verify(_pin(fmt="pickle"))


def test_soft_posture_still_verifies_when_verifiers_present():
    # if verifiers ARE wired, the soft flag is irrelevant — a real pass is 'verified'.
    gate = ProvenanceGate(hash_fn=lambda p: p.sha256, sig_verify_fn=lambda p: True,
                          allow_unverified_in_sandbox=True)
    assert gate.verify(_pin()).outcome == "verified"


def test_refusal_is_also_recorded_then_raised():
    ledger = []
    gate = ProvenanceGate(hash_fn=lambda p: "c" * 64, sig_verify_fn=lambda p: True,
                          on_ledger=ledger.append)
    with pytest.raises(ProvenanceFailure):
        gate.verify(_pin())
    assert ledger and ledger[-1].outcome == "refused"  # complete audit of load attempts
