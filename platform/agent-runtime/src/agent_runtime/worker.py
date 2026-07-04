"""The standing worker slot (PLAN §1.2). A long-lived worker per fleet slot that
claims per-ticket in-process sessions: the model warmup + key custody amortize,
while each TICKET runs in a fresh session so one ticket's context exhaustion or
prompt-poisoning cannot leak into the next.

Composes the already-tested primitives: the drain pre-claim gate + BoardClient
(claim/fencing/TransitionGuard) + AgentLoop (termination guards) + the heartbeat
registry (per-agent frame emission). ``poll_once`` is the unit of work and is
testable with fakes; the continuous ``run`` loop needs a live Board + model
(INTEGRATION).
"""

from __future__ import annotations

import time
from typing import Callable, Optional

from .board_client import BoardClient, Lease
from .config import Persona, RuntimeTunables
from .drain import DrainMachine
from .errors import ClaimConflict, StaleFenceError
from .heartbeat import HeartbeatRegistry, PerAgentFrame
from .ids import mint_session_id
from .loop import AgentLoop, DecideFn, LoopOutcome


class Worker:
    def __init__(
        self,
        sub: str,
        persona: Persona,
        board: BoardClient,
        drain: DrainMachine,
        heartbeats: HeartbeatRegistry,
        tunables: RuntimeTunables,
        decide: DecideFn,
        *,
        now: Callable[[], float] = time.time,
    ):
        self.sub = sub
        self.persona = persona
        self._board = board
        self._drain = drain
        self._hb = heartbeats
        self._t = tunables
        self._decide = decide
        self._now = now
        self._step_seq = 0

    def _emit(self, lease: Optional[Lease], session_id: str) -> None:
        frame = PerAgentFrame(
            sub=self.sub,
            session_id=session_id,
            claimed_ticket_id=(lease.ticket_id if lease else None),
            fencing_token=(lease.fencing_token if lease else None),
            process_alive_ts=self._now(),
            work_progress_ts=self._now(),
            step_seq=self._step_seq,
            model_version=self.persona.model_role,
            persona_version=self.persona.persona_version,
            drain_state=self._drain.drain_state().value,
        )
        self._hb.update_agent(frame)

    def poll_once(self) -> Optional[LoopOutcome]:
        """One claim→work cycle. Returns the loop outcome, or None if no claim
        (drain/quiesce/unreconciled gate shut, or lost race, or no work)."""
        session_id = mint_session_id()
        self._emit(None, session_id)

        # the pre-claim gate is enforced inside BoardClient.claim_next (fail-closed).
        try:
            lease = self._board.claim_next()
        except ClaimConflict:
            return None  # lost race — re-poll next tick, never treat as broken
        if lease is None:
            return None

        self._emit(lease, session_id)

        def on_progress(seq: int) -> None:
            self._step_seq = seq
            self._emit(lease, session_id)

        loop = AgentLoop(self._board, self._drain, self.persona, self._t, self._decide,
                         on_progress=on_progress)
        try:
            outcome = loop.run(lease, clock=self._now)
        except StaleFenceError:
            outcome = LoopOutcome.ABANDONED
        finally:
            self._hb.drop_agent(session_id)
        return outcome
