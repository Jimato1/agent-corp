"""Custody honesty (never fakes attestation) + supervisor fail-closed boot/status."""

import pytest

from agent_runtime.custody import KeyCustody, NullProvider, SoftwarePKCS11Provider
from agent_runtime.config import load_config
from agent_runtime.supervisor import Supervisor
from tests.conftest import ROOT


def test_null_provider_cannot_confirm_seal():
    c = KeyCustody(NullProvider())
    st = c.status()
    assert st.can_confirm_seal is False   # false-green forbidden: honest unknown
    assert st.attest_result == "unverified"


def test_software_token_never_claims_a_hardware_seal(monkeypatch):
    # a SoftHSM2 token is a real PKCS#11 backend but NOT a TPM — must not fake a seal.
    monkeypatch.setenv("AR_PKCS11_MODULE", "/usr/lib/softhsm/libsofthsm2.so")
    c = KeyCustody(SoftwarePKCS11Provider("/usr/lib/softhsm/libsofthsm2.so"))
    st = c.status()
    assert st.can_confirm_seal is False
    res = c.enroll("agent-1", is_executor=False)
    assert res.sealed is False and res.attest_result == "unverified"


def test_executor_persona_refused_on_non_attested_node():
    c = KeyCustody(NullProvider())
    with pytest.raises(PermissionError):
        c.enroll("exec-agent", is_executor=True)  # auth #6 — attested nodes only


def test_supervisor_boot_is_fail_closed_and_prints_absence():
    sup = Supervisor(config=load_config(ROOT / "config"))
    # M3: no auth transport wired → gate shut, not reconciled.
    assert sup.drain.reconciled is False
    assert sup.drain.pre_claim_gate() is False
    st = sup.status()
    # constitutional printed facts — always false, never a latent capability.
    assert st["holds_host_credentials"] is False
    assert st["can_approve_or_execute"] is False


def test_supervisor_models_fail_closed_in_sandbox():
    # no real hash/sig verifier → every model NOT admitted, honest not green.
    sup = Supervisor(config=load_config(ROOT / "config"))
    models = sup.models()
    assert models  # rows exist
    assert all(m["provenance_verified"] is False for m in models)
    assert all(m["online"] is False for m in models)
    assert sup.sigstore_gate_armed() is False  # UI renders CANNOT CONFIRM, not ARMED


def test_supervisor_headroom_is_marked_unmeasured():
    sup = Supervisor(config=load_config(ROOT / "config"))
    hr = sup.headroom()
    assert hr["measured"] is False  # PENDING-SIZING → UI shows estimate/cannot-confirm


def test_supervisor_applies_kill_command_and_persists_epoch():
    sup = Supervisor(config=load_config(ROOT / "config"))
    sup.drain.mark_reconciled()  # simulate a completed boot reconcile
    res = sup.apply_kill_command(
        {"mode": "kill", "epoch": 3, "grace_deadline": None, "issued_by": "auth", "idempotency": "x"}
    )
    assert res["applied"] is True and res["epoch"] == 3
    assert sup.db.max_kill_epoch() == 3  # append-only kill_epoch_log persisted
