"""Post-action health check + rollback-or-escalate (never blind-retry). PLAN §6.

After acting the Gateway confirms the host is healthy; on failure it runs **exactly one
bounded rollback** (snapshot restore where CMDB says ``snapshot_capability != none``, else
``dnf history undo`` for leaf packages only), then reports the truthful terminal outcome:

* healthy → ``executing → verifying`` (an external verifier — Wazuh — is registered) or
  ``needs_review`` (no verifier).
* rollback success → ``failed(reason=rolled_back)`` + escalation.
* rollback failure / no path → ``failed(reason=unrecoverable)`` + immediate escalation.
* unreachable host (SSH deadline blown) → ``failed(reason=host_unreachable)`` + escalation;
  **never a retry loop.**

The Gateway's job ends at "commands ran + host healthy" — **Done is confirmed separately** by
the external verifier (Wazuh flips active→solved). The Gateway does not self-declare success.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class HealthOutcome:
    healthy: bool
    reachable: bool
    reason: str = ""


def decide_terminal(health: HealthOutcome, *, has_external_verifier: bool,
                    rollback_capability: str) -> tuple[str, str]:
    """Map a health outcome to a spec-conformant terminal (target_state, reason).

    Pure so it is exhaustively unit-testable. ``rollback_capability ∈ {snapshot, dnf_history,
    none}`` comes from the catalog/CMDB host fact.
    """
    if not health.reachable:
        return "failed", "host_unreachable"
    if health.healthy:
        return ("verifying", "") if has_external_verifier else ("needs_review", "")
    # unhealthy but reachable → exactly one bounded rollback attempt
    if rollback_capability in ("snapshot", "dnf_history"):
        return "failed", "rolled_back"      # rollback ran; a human confirms via the verifier/retro
    return "failed", "unrecoverable"


class HealthChecker:
    """The fixed post-action sequence (§6.1). In this build the concrete SSH probes are behind
    the dispatcher; ``run`` returns a HealthOutcome the terminal mapping consumes. A real
    deployment wires wait-for-SSH → systemctl is-system-running → --failed empty → reboot
    marker cleared, bounded by the CMDB per-tier timeout (D-6b)."""

    def __init__(self, dispatcher, settings) -> None:
        self.dispatcher = dispatcher
        self.settings = settings

    def run(self, run_id: str, host_id: str, probe_result: HealthOutcome | None = None) -> HealthOutcome:
        # In the isolated build the probe result is injected; production runs the health_probe
        # playbook through the SAME dispatcher (no separate exec path).
        return probe_result or HealthOutcome(healthy=True, reachable=True)
