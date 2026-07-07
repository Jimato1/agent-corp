"""The ReAct loop's hard termination guards (PLAN §2.3) — the 'never terminating /
confident garbage' defense, enforced in code around a scripted model driver."""

from agent_runtime.board_client import BoardClient, Lease
from agent_runtime.config import Persona, RuntimeTunables
from agent_runtime.drain import CommandMode, DrainMachine, KillCommand, Level
from agent_runtime.drain import WorkClass
from agent_runtime.loop import Action, ActionKind, AgentLoop, LoopOutcome
from tests.test_board_client import FakeBoard


def _persona():
    return Persona(role="hands-pool", model_role="hands-pool", prompts={"system": "x"},
                   scopes=["board:write"], persona_version="1")


def _setup(decide, tunables=None, drain=None):
    board = FakeBoard()
    drain = drain or DrainMachine()
    drain.mark_reconciled()
    client = BoardClient(board, drain)
    t = tunables or RuntimeTunables(max_steps=5, progress_budget_sec=1e9)
    loop = AgentLoop(client, drain, _persona(), t, decide)
    return loop, board, drain


def test_completes_on_valid_terminal_transition():
    steps = iter([Action(ActionKind.NOTES_READ), Action(ActionKind.NOTES_WRITE),
                  Action(ActionKind.TRANSITION, to_state="needs_review", reason="done")])
    loop, board, _ = _setup(lambda ctx: next(steps))
    out = loop.run(Lease("T-000001", 1, 300), clock=lambda: 0.0)
    assert out is LoopOutcome.COMPLETED
    assert board.transition_calls[-1][2] == "needs_review"


def test_hard_step_cap_escalates_never_spins():
    # a model that only ever emits NOOP must be force-escalated at the cap.
    loop, board, _ = _setup(lambda ctx: Action(ActionKind.NOOP),
                            tunables=RuntimeTunables(max_steps=4, progress_budget_sec=1e9))
    out = loop.run(Lease("T-000001", 1, 300), clock=lambda: 0.0)
    assert out is LoopOutcome.ESCALATED
    assert board.transition_calls[-1][2] == "blocked"


def test_unsatisfiable_escalates_blocked():
    # the 'must-escalate' variant: the model files blocked with a reason.
    loop, board, _ = _setup(lambda ctx: Action(ActionKind.TRANSITION, to_state="blocked", reason="unsatisfiable"))
    out = loop.run(Lease("T-000001", 1, 300), clock=lambda: 0.0)
    assert out is LoopOutcome.ESCALATED


def test_forbidden_transition_is_guarded_and_escalated():
    # a steered model emitting a forbidden terminal state is blocked by the guard
    # and auto-escalated — NEVER forwarded to the Board.
    loop, board, _ = _setup(lambda ctx: Action(ActionKind.TRANSITION, to_state="done", reason="lying"))
    out = loop.run(Lease("T-000001", 1, 300), clock=lambda: 0.0)
    assert out is LoopOutcome.VIOLATION_BLOCKED
    # 'done' never reached the Board; only the escalation 'blocked' did.
    assert all(c[2] != "done" for c in board.transition_calls)
    assert any(c[2] == "blocked" for c in board.transition_calls)


def test_drain_mid_loop_checkpoints_benign_work():
    drain = DrainMachine()
    drain.mark_reconciled()
    # command a drain before the loop runs a step.
    drain.apply_command(KillCommand(CommandMode.DRAIN, 1, None, "auth", "i"))
    loop, board, _ = _setup(lambda ctx: Action(ActionKind.NOTES_WRITE), drain=drain)
    out = loop.run(Lease("T-000001", 1, 300), clock=lambda: 0.0)
    # benign work checkpoints to blocked(drained); nothing forbidden happens.
    assert out is LoopOutcome.ESCALATED
    assert board.transition_calls[-1][2] == "blocked"


def test_drain_arriving_during_sod_adjacent_step_abandons():
    # a drain arriving DURING an SoD-adjacent step (e.g. filing a plan for approval)
    # must ABANDON that step, never checkpoint — a drain can never leave a
    # half-approved action recoverable.
    drain = DrainMachine()
    drain.mark_reconciled()

    def decide(ctx):
        # simulate the drain landing mid-step, then the model tries an SoD step.
        drain.apply_command(KillCommand(CommandMode.DRAIN, 1, None, "auth", "i"))
        return Action(ActionKind.TRANSITION, to_state="awaiting_approval",
                      reason="plan filed", work_class=WorkClass.SOD_ADJACENT)

    loop, board, _ = _setup(decide, drain=drain)
    out = loop.run(Lease("T-000001", 1, 300), clock=lambda: 0.0)
    assert out is LoopOutcome.ABANDONED
    # the SoD-adjacent transition never reached the Board — lease left to lapse.
    assert board.transition_calls == []


def test_no_progress_detector_escalates():
    # progress budget 0 with a NOOP model → tripped immediately, no spin.
    loop, board, _ = _setup(lambda ctx: Action(ActionKind.NOOP),
                            tunables=RuntimeTunables(max_steps=100, progress_budget_sec=0.0))
    clock = [0.0]
    def tick():
        clock[0] += 1.0
        return clock[0]
    out = loop.run(Lease("T-000001", 1, 300), clock=tick)
    assert out is LoopOutcome.ESCALATED
