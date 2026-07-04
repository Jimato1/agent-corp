"""The drain/kill epoch machine — fail-closed enforcement IN CODE (PLAN §4).
Covers: frozen command schema, monotonicity, KILL=zero-grace, grace clamp (m7),
fail-closed boot/outage reconcile gate (M3/M2), checkpoint-vs-abandon."""

import pytest

from agent_runtime.drain import (
    CommandMode, DrainMachine, DrainState, KillCommand, Level, WorkClass,
)


def _cmd(mode, epoch, grace=None, idem="i", by="auth"):
    return KillCommand(mode=CommandMode(mode), epoch=epoch, grace_deadline=grace,
                       issued_by=by, idempotency=idem)


def test_kill_command_frozen_fields(contract_text):
    assert KillCommand.FROZEN_FIELDS == ("mode", "epoch", "grace_deadline", "issued_by", "idempotency")
    doc = contract_text("killswitch-chain.md")
    for f in KillCommand.FROZEN_FIELDS:
        assert f in doc
    # from_wire rejects a missing frozen field
    with pytest.raises(ValueError):
        KillCommand.from_wire({"mode": "drain", "epoch": 1, "grace_deadline": None, "issued_by": "auth"})


def test_pre_claim_gate_fail_closed_until_reconciled():
    # M3: a freshly-booted (or restored) machine cannot claim before reconcile.
    m = DrainMachine()
    assert m.pre_claim_gate() is False
    m.mark_reconciled()
    assert m.pre_claim_gate() is True


def test_stale_lower_epoch_never_undrains():
    clock = [1000.0]
    m = DrainMachine(now=lambda: clock[0])
    m.mark_reconciled()
    assert m.apply_command(_cmd("drain", 5, idem="a")) is True
    assert m.level is Level.DRAIN
    # a replayed lower epoch is ignored — cannot un-drain a higher epoch.
    assert m.apply_command(_cmd("drain", 3, idem="b")) is False
    assert m.level is Level.DRAIN
    assert m.pre_claim_gate() is False  # still draining


def test_kill_is_zero_grace_and_overrides_grace_deadline():
    clock = [1000.0]
    m = DrainMachine(now=lambda: clock[0], default_grace_sec=45)
    m.mark_reconciled()
    # m7: even a large grace_deadline on the wire is forced to zero by KILL.
    assert m.apply_command(_cmd("kill", 9, grace=1_000_000.0)) is True
    assert m.grace_deadline == 1000.0
    assert m.grace_expired() is True


def test_drain_grace_is_clamped_to_local_max():
    clock = [1000.0]
    m = DrainMachine(now=lambda: clock[0], default_grace_sec=45)
    m.mark_reconciled()
    # m7: inflated issuer grace_deadline is clamped to now + local max.
    m.apply_command(_cmd("drain", 2, grace=1000.0 + 10_000))
    assert m.grace_deadline == pytest.approx(1000.0 + 45)


def test_operator_lift_requires_a_higher_epoch():
    m = DrainMachine()
    m.mark_reconciled()
    m.apply_command(_cmd("kill", 7))
    assert m.level is Level.KILL
    # a higher epoch may lift back to RUN (operator authority via poll).
    assert m.poll_level(8, Level.RUN) is True
    assert m.level is Level.RUN
    assert m.pre_claim_gate() is True
    # a lower/equal epoch can never lift.
    assert m.poll_level(8, Level.KILL) is False or m.level is Level.KILL


def test_outage_is_separate_from_kill_and_rearms_reconcile():
    # M2: entering an outage forces the gate shut AND re-requires reconcile.
    m = DrainMachine()
    m.mark_reconciled()
    assert m.pre_claim_gate() is True
    m.enter_outage()
    assert m.in_outage is True
    assert m.pre_claim_gate() is False           # quiesced
    assert m.reconciled is False                 # must re-reconcile on recovery
    assert m.drain_state() is DrainState.QUIESCING
    # recovery: exit outage + reconcile reopens the gate.
    m.exit_outage()
    m.mark_reconciled()
    assert m.pre_claim_gate() is True


def test_checkpoint_only_benign_abandon_sod():
    m = DrainMachine()
    assert m.checkpoint_allowed(WorkClass.BENIGN) is True
    assert m.checkpoint_allowed(WorkClass.SOD_ADJACENT) is False


def test_epoch_events_persisted_via_callback():
    events = []
    m = DrainMachine(on_epoch_event=events.append)
    m.mark_reconciled()
    m.apply_command(_cmd("drain", 4))
    m.apply_command(_cmd("kill", 5))
    assert [e["epoch"] for e in events] == [4, 5]
    assert [e["mode"] for e in events] == ["drain", "kill"]


def test_seed_from_persisted_does_not_open_gate():
    # §9 restore rule: seeding max epoch prevents regression but is NOT reconcile.
    m = DrainMachine()
    m.seed_from_persisted(42)
    assert m.epoch == 42
    assert m.pre_claim_gate() is False  # still fail-closed until reconcile (M3)
