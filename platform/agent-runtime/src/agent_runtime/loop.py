"""The inner ReAct loop with HARD termination guards (PLAN §2.3; RESEARCH §1.6).

Because "no API cost" makes the failure mode *never-terminating / confident
garbage* (not spend), the termination guards are load-bearing and enforced IN CODE
around the model, not delegated to it:

  * a hard iteration cap (force-escalate on exceed);
  * an explicit terminal transition the model must call (no implicit completion);
  * a stop condition tied to EXTERNALLY-VERIFIABLE state (a confirmed Board
    transition), never model self-assertion;
  * a no-progress detector (step_seq/time budget) that trips escalation, never spins;
  * a drain check every step (checkpoint benign / ABANDON near a SoD boundary);
  * the TransitionGuard on every transition (SoD boundary in code).

The model "decision" is injected (``decide``) so the CONTROL logic is unit-tested
with a scripted driver; the real driver calls ``facade.generate(role, …, schema)``
and parses the constrained tool call. A model that emits a forbidden transition is
hard-rejected by the guard, never forwarded.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable, Optional

from .board_client import BoardClient, Lease
from .config import Persona, RuntimeTunables
from .drain import DrainMachine, Level, WorkClass
from .errors import StaleFenceError, TransitionForbidden


class ActionKind(str, Enum):
    NOTES_READ = "notes_read"
    NOTES_WRITE = "notes_write"
    TRANSITION = "transition"      # terminal or escalation
    NOOP = "noop"


@dataclass
class Action:
    kind: ActionKind
    to_state: Optional[str] = None     # for TRANSITION
    reason: str = ""
    payload: Optional[dict] = None
    work_class: WorkClass = WorkClass.BENIGN


class LoopOutcome(str, Enum):
    COMPLETED = "completed"            # a valid terminal transition landed
    ESCALATED = "escalated"            # filed blocked/needs_review (cap/no-progress/unsat)
    ABANDONED = "abandoned"            # drain-abandon or stale fence — lease lapses
    VIOLATION_BLOCKED = "violation"    # model tried a forbidden transition — guarded + escalated


# a scripted-or-real decision function: (step_context) -> Action
DecideFn = Callable[[dict], Action]


class AgentLoop:
    def __init__(
        self,
        board: BoardClient,
        drain: DrainMachine,
        persona: Persona,
        tunables: RuntimeTunables,
        decide: DecideFn,
        *,
        on_progress: Optional[Callable[[int], None]] = None,
        logger=None,
    ):
        self._board = board
        self._drain = drain
        self._persona = persona
        self._t = tunables
        self._decide = decide
        self._on_progress = on_progress
        self._log = logger

    def run(self, lease: Lease, *, clock: Callable[[], float]) -> LoopOutcome:
        step_seq = 0
        last_progress_ts = clock()
        # the work class of the CURRENT in-flight step, so a mid-step drain abandons
        # near a SoD boundary and checkpoints only benign work (fix: no longer
        # hardcoded BENIGN).
        current_work_class = WorkClass.BENIGN

        for _ in range(self._t.max_steps):
            # (1) drain check every step — model-independent.
            if self._drain.level is not Level.RUN or self._drain.in_outage:
                return self._on_drain(lease, current_work_class)

            # (2) no-progress detector.
            if clock() - last_progress_ts > self._t.progress_budget_sec:
                return self._escalate(lease, "no-progress budget exceeded")

            # (3) ask the driver for the next action (real: facade.generate w/ schema).
            ctx = {"ticket_id": lease.ticket_id, "step_seq": step_seq,
                   "persona": self._persona.role, "must_dissent": self._persona.must_dissent}
            action = self._decide(ctx)
            current_work_class = action.work_class

            # (3b) re-check drain AFTER deciding, so a drain arriving DURING an
            # SoD-adjacent step abandons that step (never executes it) instead of
            # checkpointing a half-formed action toward the Gateway.
            if self._drain.level is not Level.RUN or self._drain.in_outage:
                return self._on_drain(lease, current_work_class)

            # (4) execute the action.
            if action.kind is ActionKind.TRANSITION:
                try:
                    self._board.transition(lease, action.to_state, reason=action.reason)
                except TransitionForbidden:
                    # SoD guard tripped — the model tried a forbidden target.
                    self._escalate(lease, "model attempted forbidden transition; auto-escalated")
                    return LoopOutcome.VIOLATION_BLOCKED
                except StaleFenceError:
                    return LoopOutcome.ABANDONED
                # a terminal/escalation transition is the ONLY legitimate stop.
                if action.to_state in ("needs_review", "awaiting_approval"):
                    return LoopOutcome.COMPLETED
                if action.to_state == "blocked":
                    return LoopOutcome.ESCALATED
                # in_progress/todo (release) — continue
            elif action.kind in (ActionKind.NOTES_READ, ActionKind.NOTES_WRITE):
                step_seq += 1
                last_progress_ts = clock()
                if self._on_progress:
                    self._on_progress(step_seq)
            # NOOP makes no progress — the detector will trip if it persists.

        # hard iteration cap hit without a terminal transition — escalate, never spin.
        return self._escalate(lease, f"hard step cap ({self._t.max_steps}) reached")

    # ---- helpers -----------------------------------------------------------

    def _on_drain(self, lease: Lease, work_class: WorkClass) -> LoopOutcome:
        """Checkpoint benign work; ABANDON anything near a SoD boundary (§4.3).

        The in-flight work class governs: SOD_ADJACENT work (in flight toward the
        Gateway) is ABANDONED — the lease lapses, the reaper requeues + increments
        the fence, so a drain never leaves a half-approved/mid-execution action
        recoverable. Benign work checkpoints to blocked(drained)."""
        if not self._drain.checkpoint_allowed(work_class):
            return LoopOutcome.ABANDONED  # SoD-adjacent → abandon, do not checkpoint
        try:
            self._board.transition(lease, "blocked", reason="drained")
        except (TransitionForbidden, StaleFenceError):
            return LoopOutcome.ABANDONED
        return LoopOutcome.ESCALATED

    def _escalate(self, lease: Lease, reason: str) -> LoopOutcome:
        try:
            self._board.transition(lease, "blocked", reason=reason)
        except (TransitionForbidden, StaleFenceError):
            return LoopOutcome.ABANDONED
        return LoopOutcome.ESCALATED
