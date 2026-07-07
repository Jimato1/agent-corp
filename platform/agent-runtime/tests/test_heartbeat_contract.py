"""Contract conformance: the heartbeat frames match agent-runtime-mc-heartbeat.md
FIELD-FOR-FIELD. A drift in the code OR the doc fails the build."""

from agent_runtime.heartbeat import (
    FLEET_FIELDS, NOT_IN_PER_AGENT_FRAME, PER_AGENT_FIELDS, FleetFrame,
    PerAgentFrame,
)

# From the FROZEN contract §2/§3 (the source of truth this test pins against).
EXPECTED_PER_AGENT = {
    "schema_version", "sub", "session_id", "claimed_ticket_id", "fencing_token",
    "process_alive_ts", "work_progress_ts", "step_seq", "model_version",
    "persona_version", "drain_state",
}
EXPECTED_FLEET = {
    "schema_version", "runtime_instance_id", "roster", "supervisor_ts",
    "runtime_drain_state",
}


def test_per_agent_frame_fields_frozen():
    assert set(PER_AGENT_FIELDS) == EXPECTED_PER_AGENT


def test_fleet_frame_fields_frozen():
    assert set(FLEET_FIELDS) == EXPECTED_FLEET


def test_frames_serialize_to_exactly_the_frozen_fields():
    pa = PerAgentFrame(
        sub="agent-1", session_id="sess-1", claimed_ticket_id="T-000123",
        fencing_token=7, process_alive_ts=1.0, work_progress_ts=1.0, step_seq=3,
        model_version="hands-pool", persona_version="1", drain_state="active",
    )
    assert set(pa.to_wire()) == EXPECTED_PER_AGENT
    ff = FleetFrame(runtime_instance_id="rt-1", roster=["agent-1"], supervisor_ts=1.0,
                    runtime_drain_state="active")
    assert set(ff.to_wire()) == EXPECTED_FLEET


def test_spawn_depth_is_NOT_in_the_frame():
    # Contract §2: spawn depth/lineage are derived by MC from Board reads, never
    # carried in the heartbeat (one authority per fact).
    for banned in NOT_IN_PER_AGENT_FRAME:
        assert banned not in PER_AGENT_FIELDS


def test_fields_appear_in_the_frozen_contract_doc(contract_text):
    doc = contract_text("agent-runtime-mc-heartbeat.md")
    for f in EXPECTED_PER_AGENT | EXPECTED_FLEET:
        if f == "schema_version":
            assert "schema_version" in doc
        else:
            assert f in doc, f"frozen frame field '{f}' not found in the contract doc"


def test_drain_state_vocabulary_matches_contract(contract_text):
    from agent_runtime.drain import FROZEN_DRAIN_STATES
    assert FROZEN_DRAIN_STATES == {"active", "draining", "drained", "quiescing", "quiesced"}
    doc = contract_text("agent-runtime-mc-heartbeat.md")
    for s in FROZEN_DRAIN_STATES:
        assert s in doc
