"""Liveness engine (contract §4; PLAN §4). D-12 thresholds are PARAMETERIZED, not
hardcoded: wedged classification is DARK until a per-role progress budget is SET, and the
correlated-loss population gate reads operator params. Liveness is never a bare green dot.
"""
from __future__ import annotations

from app.liveness.engine import AgentLiveness, LivenessParams, classify_agent, population_gate

_NOW = 1_000_000.0


def _frame(**kw):
    base = {"sub": "agent:x", "process_alive_ts": _NOW, "work_progress_ts": _NOW,
            "step_seq": 5, "persona_version": "patcher@qwen3-32b", "drain_state": "active"}
    base.update(kw)
    return base


def test_live_carries_phi_and_age_not_bare_dot():
    cl = classify_agent(_frame(), LivenessParams(), _NOW)
    assert cl.liveness == "live"
    assert cl.phi is not None                      # phi figure, not a bare green dot
    assert cl.hb_age is not None


def test_drained_is_terminal_report_never_inferred():
    cl = classify_agent(_frame(drain_state="drained", process_alive_ts=None, work_progress_ts=None),
                        LivenessParams(), _NOW)
    assert cl.liveness == "drained"                # distinct terminal REPORT, not "crashed"
    assert cl.suspect is False


def test_zombie_when_fencing_behind_board_gen():
    cl = classify_agent(_frame(fencing_token="46"), LivenessParams(), _NOW, board_current_gen=47)
    assert any(f["type"] == "SUPERSEDED" for f in cl.flags)


def test_wedged_dark_until_progress_budget_set():
    # process alive but no progress for a long time; NO progress budget for this role.
    stale = _NOW - 900
    p = LivenessParams(progress_budget={})          # UNSET => DARK
    cl = classify_agent(_frame(work_progress_ts=stale), p, _NOW)
    assert cl.wedged_dark is True                    # not classified wedged (no invented threshold)
    assert cl.liveness != "wedged"
    assert any(f.get("presizing") for f in cl.flags)  # interim "longest-since-progress", labelled PRE-SIZING


def test_wedged_classified_only_once_budget_set():
    stale = _NOW - 900
    p = LivenessParams(progress_budget={"patcher": 300.0})   # operator SET the budget
    cl = classify_agent(_frame(work_progress_ts=stale), p, _NOW)
    assert cl.liveness == "wedged"
    assert cl.wedged_dark is False


def test_suspect_crosses_phi_threshold():
    stale = _NOW - 600
    p = LivenessParams(phi_threshold=8.0, heartbeat_stale_seconds=30.0)
    cl = classify_agent(_frame(process_alive_ts=stale, work_progress_ts=stale), p, _NOW)
    assert cl.liveness == "suspect"
    assert cl.suspect is True


def test_population_gate_suppresses_synchronized_cliff():
    p = LivenessParams(suppress_fraction=0.40)
    suspects = [AgentLiveness(f"a{i}", "suspect", 9.0, 40, 40, True) for i in range(6)]
    calm = [AgentLiveness(f"b{i}", "live", 1.0, 1, 1, False) for i in range(4)]
    verdict = population_gate(suspects + calm, roster=10, params=p)
    assert verdict.suppressed is True               # 6/10 > 40% => suppress the flood
    assert verdict.anomaly is True
    assert "suspect" in verdict.reason              # names WHAT is suppressed (the fact stays loud)


def test_population_gate_does_not_suppress_below_fraction():
    p = LivenessParams(suppress_fraction=0.40)
    suspects = [AgentLiveness("a0", "suspect", 9.0, 40, 40, True)]
    calm = [AgentLiveness(f"b{i}", "live", 1.0, 1, 1, False) for i in range(9)]
    verdict = population_gate(suspects + calm, roster=10, params=p)
    assert verdict.suppressed is False


def test_params_seeded_presizing_no_compiled_enforcement(client):
    # guardrail_params are seeded PRE-SIZING; progress budgets are ABSENT (wedged DARK).
    p = client.app.state.repo.liveness_params()
    assert p.progress_budget == {}                  # no compiled-in per-role budget
    rows = {r["key"]: r for r in client.app.state.repo.get_params_raw()}
    assert rows["suppress_fraction"]["presizing"] == 1
    assert rows["phi_threshold"]["presizing"] == 1
