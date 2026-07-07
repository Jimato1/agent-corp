"""The liveness engine — implements ``agent-runtime-mc-heartbeat.md`` §4 verbatim
(PLAN §4). Pure logic over heartbeat frames + operator-set guardrail params; NO
liveness threshold is compiled in (D-12 DEFERRED — every number is a parameter).

Classification (per-agent, §4.1):
* **wedged** ⇔ ``process_alive_ts`` fresh ∧ ``work_progress_ts``/``step_seq`` stale past
  that role's **progress budget**. Until a per-role budget is SET, wedged
  classification is **DARK** (the contract forbids a fleet-constant default). The interim
  compensating signal is an unthresholded "longest-since-progress" sort, tagged
  *not wedged-classified / PRE-SIZING* (residual A12).
* **crashed/suspect** ⇔ both stale; suspicion via **phi-accrual** (threshold param,
  default 8; ``noisy_net_phi`` 12) — NOT a fixed missed-N-beats boolean.
* **drained / quiesced** ⇔ reported ``drain_state`` (expected silence — never flagged dead).
* **DRAINED** is a distinct terminal REPORT, never inferred from silence.
  **QUIESCED_BY_OUTAGE** is its own posture (inferred absence != commanded drain).
* **zombie** ⇔ heartbeat ``fencing_token`` older than the Board's current generation for
  that resource (Board read) — render as zombie, never healthy.

Correlated-loss suppression + population gate (§4.2): if the fraction of agents crossing
the suspicion threshold within one window exceeds ``suppress_fraction`` of the roster
denominator, per-agent death display is suppressed and a single FLEET_LIVENESS_ANOMALY is
raised (suppression hides the flood, never the fact).
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any


@dataclass
class LivenessParams:
    """Operator-set, PRE-SIZING until confirmed post gap-1.2. All display/triage only."""
    phi_threshold: float = 8.0
    noisy_net_phi: float = 12.0
    suppress_fraction: float = 0.40
    suppress_window_seconds: float = 60.0
    heartbeat_stale_seconds: float = 30.0
    # per-role progress budgets in seconds; a role ABSENT here => wedged DARK for that role.
    progress_budget: dict[str, float] = field(default_factory=dict)
    presizing: bool = True


def _phi(elapsed: float, mean_interval: float) -> float:
    """phi-accrual suspicion (exponential-interval approximation).

    phi = -log10(P(no beat within `elapsed`)) with P = exp(-elapsed/mean). Monotonic in
    elapsed; higher = more suspicious. Honest and cheap; the *threshold* is a param.
    """
    if mean_interval <= 0:
        mean_interval = 1.0
    p = math.exp(-elapsed / mean_interval)
    p = max(p, 1e-12)
    return round(-math.log10(p), 2)


def _role_of(frame: dict[str, Any]) -> str:
    """Persona/role key for progress-budget lookup (e.g. 'patcher' from 'patcher@qwen3-32b')."""
    pv = str(frame.get("persona_version") or frame.get("model_version") or "")
    return pv.split("@", 1)[0] if pv else ""


@dataclass
class AgentLiveness:
    sub: str
    liveness: str                 # live|suspect|drained|draining|quiesced|wedged
    phi: float | None
    hb_age: float | None          # seconds since process_alive_ts
    progress_age: float | None    # seconds since work_progress_ts
    suspect: bool                 # crossed the phi threshold this window (for the population gate)
    flags: list[dict[str, Any]] = field(default_factory=list)
    wedged_dark: bool = False     # progress budget UNSET for this role => not classifiable


def classify_agent(
    frame: dict[str, Any],
    params: LivenessParams,
    now: float,
    *,
    board_current_gen: int | None = None,
) -> AgentLiveness:
    """Classify one agent's liveness from its latest frame (contract §4)."""
    drain_state = str(frame.get("drain_state") or "active")
    proc_ts = frame.get("process_alive_ts")
    prog_ts = frame.get("work_progress_ts")
    mean_interval = float(frame.get("mean_interval") or params.heartbeat_stale_seconds / 3.0)

    hb_age = (now - float(proc_ts)) if proc_ts is not None else None
    prog_age = (now - float(prog_ts)) if prog_ts is not None else None

    flags: list[dict[str, Any]] = []

    # --- zombie: fencing gen behind Board's current gen for the locked resource ---
    ft = frame.get("fencing_token")
    if board_current_gen is not None and ft is not None:
        try:
            if int(ft) < int(board_current_gen):
                flags.append({
                    "type": "SUPERSEDED", "detail": f"gen{ft} SUPERSEDED by gen{board_current_gen}",
                    "fence": {"gen": int(ft), "supBy": int(board_current_gen), "state": "superseded"},
                })
        except (TypeError, ValueError):
            pass

    # --- commanded drain / quiesce: expected silence, never flagged dead ---
    if drain_state in ("draining", "quiescing"):
        return AgentLiveness(frame["sub"], "draining", None, hb_age, prog_age, False, flags)
    if drain_state == "drained":
        # A distinct terminal REPORT — never inferred from silence.
        return AgentLiveness(frame["sub"], "drained", None, hb_age, prog_age, False, flags)
    if drain_state == "quiesced":
        return AgentLiveness(frame["sub"], "quiesced", None, hb_age, prog_age, False, flags)

    proc_stale = hb_age is None or hb_age > params.heartbeat_stale_seconds
    prog_stale = prog_age is None or prog_age > params.heartbeat_stale_seconds

    phi = _phi(hb_age, mean_interval) if hb_age is not None else params.noisy_net_phi + 1
    suspect = proc_stale and prog_stale and phi >= params.phi_threshold

    if suspect:
        # crashed suspicion (phi over threshold, both beats stale)
        return AgentLiveness(frame["sub"], "suspect", phi, hb_age, prog_age, True, flags)

    # --- wedged: process alive but no inner-loop progress past the ROLE budget ---
    role = _role_of(frame)
    budget = params.progress_budget.get(role)
    if not proc_stale and prog_age is not None:
        if budget is None:
            # DARK — the contract forbids a fleet-constant default. Interim: rank by raw age.
            if prog_age > params.heartbeat_stale_seconds:
                flags.append({
                    "type": "NO-PROGRESS",
                    "detail": f"longest-since-progress {int(prog_age)}s",
                    "presizing": True,   # not wedged-classified
                })
            return AgentLiveness(frame["sub"], "live", phi, hb_age, prog_age, False, flags, wedged_dark=True)
        if prog_age > budget:
            flags.append({"type": "WEDGED", "detail": f"no progress {int(prog_age)}s > budget {int(budget)}s"})
            return AgentLiveness(frame["sub"], "wedged", phi, hb_age, prog_age, False, flags)

    return AgentLiveness(frame["sub"], "live", phi, hb_age, prog_age, False, flags)


@dataclass
class FleetVerdict:
    total: int
    roster: int
    suspect_count: int
    suppressed: bool
    anomaly: bool
    reason: str | None = None


def population_gate(
    classifications: list[AgentLiveness],
    roster: int,
    params: LivenessParams,
) -> FleetVerdict:
    """Correlated-loss suppression (§4.2): if suspects exceed ``suppress_fraction`` of the
    roster denominator, suppress per-agent death display and raise ONE anomaly. MC never
    mass-declares death on a synchronized cliff. Suppression hides the flood, not the fact.
    """
    total = len(classifications)
    denom = max(roster, total, 1)
    suspects = sum(1 for c in classifications if c.suspect)
    frac = suspects / denom
    suppressed = suspects > 0 and frac > params.suppress_fraction
    return FleetVerdict(
        total=total, roster=roster, suspect_count=suspects,
        suppressed=suppressed, anomaly=suppressed,
        reason=(f"{suspects}/{denom} agents suspect — display suppressed pending fleet check"
                if suppressed else None),
    )
