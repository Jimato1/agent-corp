"""The heartbeat / liveness producer (PRODUCES ``agent-runtime-mc-heartbeat.md``).

The supervisor is the SINGLE SSE producer to MC (never N per-agent connections;
`edge` only). Field sets are copied BYTE-FOR-BYTE from the frozen contract; the
conformance test (tests/test_heartbeat_contract.py) pins these tuples so any drift
fails the build (the contract's additive-only change rule, in code).

The runtime emits the two INDEPENDENT signals + the roster denominator that make
MC's crashed/wedged/correlated-outage/drained distinction computable — it does NOT
implement MC's accrual/suppression display logic. MC owns the display; the runtime
guarantees the inputs. Two beats to two authorities, never collapsed: lease renewal
→ Board (authoritative, progress-gated); this telemetry → MC (advisory).
"""

from __future__ import annotations

import json
import threading
import time
from dataclasses import asdict, dataclass, field
from typing import Optional

from . import SCHEMA_VERSION
from .drain import DrainState

# ---- FROZEN field tuples (heartbeat contract §2 / §3) ----------------------

PER_AGENT_FIELDS = (
    "schema_version", "sub", "session_id", "claimed_ticket_id", "fencing_token",
    "process_alive_ts", "work_progress_ts", "step_seq", "model_version",
    "persona_version", "drain_state",
)
FLEET_FIELDS = (
    "schema_version", "runtime_instance_id", "roster", "supervisor_ts",
    "runtime_drain_state",
)
# Contract §2 "Not in the frame": spawn depth / lineage caps (MC derives from Board).
NOT_IN_PER_AGENT_FRAME = ("spawn_depth", "lineage", "parent")


@dataclass
class PerAgentFrame:
    sub: str                       # auth-minted, opaque
    session_id: str                # runtime-minted, contract-scoped
    claimed_ticket_id: Optional[str]
    fencing_token: Optional[int]   # Board-minted (lets MC flag zombies)
    process_alive_ts: float        # supervisor beat
    work_progress_ts: float        # emitted from inside the loop at each Board/Notes step
    step_seq: int                  # monotonic progress marker
    model_version: str
    persona_version: str
    drain_state: str               # ∈ {active,draining,drained,quiescing,quiesced}
    schema_version: int = SCHEMA_VERSION

    def to_wire(self) -> dict:
        d = asdict(self)
        assert set(d) == set(PER_AGENT_FIELDS), "per-agent frame drifted from frozen contract"
        assert d["drain_state"] in {s.value for s in DrainState}
        return d


@dataclass
class FleetFrame:
    runtime_instance_id: str
    roster: list[str]              # the population denominator (dead-man switch)
    supervisor_ts: float
    runtime_drain_state: str
    schema_version: int = SCHEMA_VERSION

    def to_wire(self) -> dict:
        d = asdict(self)
        assert set(d) == set(FLEET_FIELDS), "fleet frame drifted from frozen contract"
        return d


class HeartbeatRegistry:
    """The single aggregation point. Workers push their per-agent frame here; the
    supervisor emits the fleet frame; the SSE endpoint serializes both. Absence of
    the fleet frame = the runtime itself is down (one event, not N deaths)."""

    def __init__(self, runtime_instance_id: str, now=time.time):
        self._id = runtime_instance_id
        self._now = now
        self._agents: dict[str, PerAgentFrame] = {}
        self._runtime_drain_state = DrainState.ACTIVE.value
        self._lock = threading.Lock()

    def update_agent(self, frame: PerAgentFrame) -> None:
        with self._lock:
            self._agents[frame.session_id] = frame

    def drop_agent(self, session_id: str) -> None:
        with self._lock:
            self._agents.pop(session_id, None)

    def set_runtime_drain_state(self, state: str) -> None:
        with self._lock:
            self._runtime_drain_state = state

    def roster(self) -> list[str]:
        with self._lock:
            return [f.sub for f in self._agents.values()]

    def fleet_frame(self) -> FleetFrame:
        with self._lock:
            return FleetFrame(
                runtime_instance_id=self._id,
                roster=[f.sub for f in self._agents.values()],
                supervisor_ts=self._now(),
                runtime_drain_state=self._runtime_drain_state,
            )

    def snapshot(self) -> dict:
        """A single SSE frame carrying the fleet frame + all per-agent frames."""
        with self._lock:
            agents = [f.to_wire() for f in self._agents.values()]
        return {"fleet": self.fleet_frame().to_wire(), "agents": agents}

    def sse_event(self) -> str:
        return f"data: {json.dumps(self.snapshot())}\n\n"
