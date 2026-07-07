"""Parsed policy models — the in-memory shape of the canonical markdown store.

These are the objects the write-through snapshot holds and ``evaluate()`` reads. They are
parsed from YAML frontmatter (``policy.store``) and never mutated in place; a write builds
a fresh snapshot and swaps it atomically (§1).
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True)
class Window:
    """A maintenance window (allow) or freeze. Recurring (rrule) or one-shot (absolute)."""

    id: str
    kind: str  # allow | freeze
    tzid: str
    grace_minutes: int = 0
    on_window_close: str = "abort_and_rollback"
    # Recurring form:
    rrule: str | None = None
    start_local: str | None = None  # "HH:MM"
    end_local: str | None = None    # "HH:MM"; <= start_local => resolves next calendar day
    # One-shot form (emergency/break-glass, or a bounded exception):
    start_at: str | None = None     # ISO local wall time e.g. "2026-07-05T22:00"
    end_at: str | None = None
    one_shot: bool = False
    break_glass: bool = False
    overrides_freeze: bool = False  # a break-glass window explicitly confirmed to beat a freeze


@dataclass(frozen=True)
class Tier:
    name: str
    defaults: dict[str, str]  # action_class -> auto|ask
    health_check_timeout_s: int = 60
    ssh_wait_timeout_s: int = 120


@dataclass(frozen=True)
class Host:
    host_id: str
    host_class: str  # managed | disposable  (IMMUTABLE)
    tier: str | None  # ref into the tier catalog; None => unpolicied sentinel
    overrides: dict[str, str] = field(default_factory=dict)  # per-action_class auto|ask
    windows: tuple[Window, ...] = ()
    snapshot_capability: str = "none"
    facts_override: dict[str, str] = field(default_factory=dict)
    wazuh_agent_id: str | None = None
    wazuh_bound_at: str | None = None
    wazuh_bound_by: str | None = None
    lifecycle: str = "active"  # active | stale | retired


@dataclass(frozen=True)
class TaskType:
    type_key: str
    title: str
    destructive: bool
    reversible: bool
    action_class: str
    external_verifier: str = "none"
    verification_window_s: int = 0
    notes: str = ""


@dataclass(frozen=True)
class CatalogEntry:
    playbook_key: str
    action_class: str
    risk_class: str
    applicable_tiers: tuple[str, ...]
    rollback_declared: bool
    rollback_method: str = ""
    duration_estimate_s: int = 0
    sandbox_eligible: bool = False


@dataclass(frozen=True)
class Snapshot:
    """The atomic policy view the gate reads. Built from HEAD; ``git_commit`` is
    ``policy_version`` in every verdict."""

    git_commit: str
    hosts: dict[str, Host]
    tiers: dict[str, Tier]
    task_types: dict[str, TaskType]
    catalog: dict[str, CatalogEntry]
    sandbox_enabled: bool = True

    def resolve_alias(self, host_id: str) -> str | None:
        """Aliases resolve to one host_id BEFORE any policy lookup (§2.1). In this build
        the host_id IS canonical; the hook exists for future alias tables."""
        return host_id if host_id in self.hosts else None
