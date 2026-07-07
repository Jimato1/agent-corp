"""The ONE pure evaluator (PLAN §3.3) — the only decision code path.

``evaluate()`` is side-effect-free and called byte-identically by (1) the binding
``POST /v1/decision``, (2) every advisory MCP tool, (3) the operator dry-run. This IS
"two views, one state" for the CMDB.

Universal preconditions run BEFORE any class branch; the class fork substitutes only
window/floor/approval semantics, never input validation or environment health (AR cluster
A). A missing/stale/ambiguous/unparseable fact DENIES; it never defaults open.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from ..clock import ClockHealth
from .constants import ACTION_CLASSES, FLOOR_NON_AUTO, SANDBOX_ACTION_CLASS
from .models import Snapshot
from .windows import evaluate_windows

_UTC = timezone.utc


def _iso(dt: datetime) -> str:
    dt = dt.astimezone(_UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


@dataclass
class Verdict:
    verdict: str                      # deny | ask | permit
    reason: list[str]
    decision_id: str
    evaluated_at: str
    valid_until: str
    policy_version: str
    in_window: bool = False
    window_id: str | None = None
    window_opens_at: str | None = None
    window_closes_at: str | None = None
    seconds_remaining: int | None = None
    grace: int = 0
    active_freeze: str | None = None
    tier: str | None = None
    approval_mode: str | None = None  # auto | ask | None
    tzid: str | None = None
    host_class: str | None = None      # additive (sandbox seam)
    verdict_basis: str | None = None   # additive: policy | sandbox_carve_out
    escalations: list[dict] = field(default_factory=list)

    def to_claims(self) -> dict:
        """The canonical §3.2 response shape + additive fields (contract-exact)."""
        return {
            "verdict": self.verdict,
            "in_window": self.in_window,
            "window_id": self.window_id,
            "window_opens_at": self.window_opens_at,
            "window_closes_at": self.window_closes_at,
            "seconds_remaining": self.seconds_remaining,
            "grace": self.grace,
            "active_freeze": self.active_freeze,
            "tier": self.tier,
            "approval_mode": self.approval_mode,
            "decision_id": self.decision_id,
            "evaluated_at": self.evaluated_at,
            "valid_until": self.valid_until,
            "policy_version": self.policy_version,
            "tzid": self.tzid,
            "reason": list(self.reason),
            "host_class": self.host_class,
            "verdict_basis": self.verdict_basis,
        }


def resolve_approval_mode(snapshot: Snapshot, host, action_class: str) -> str:
    """The time-independent auto-eligibility of a (host, action_class) cell.

    Shared BYTE-IDENTICALLY by ``evaluate()`` (the in-window arm) and the weakening
    classifier's derived-effect diff (§6.2 layer 1) — so the classifier can never disagree
    with what the gate would actually decide. A disposable host / sandbox class / unpolicied
    host has no managed mode; returns 'ask' as the safe floor for those degenerate inputs.
    """
    if host is None or host.host_class != "managed" or host.tier is None:
        return "ask"
    if action_class not in FLOOR_NON_AUTO and action_class in ACTION_CLASSES:
        tier = snapshot.tiers.get(host.tier)
        tier_default = tier.defaults.get(action_class) if tier else None
        mode = host.overrides.get(action_class) or tier_default or "ask"
        if mode == "auto":
            has_auto_eligible = any(
                ce.action_class == action_class and ce.rollback_declared
                for ce in snapshot.catalog.values()
            )
            if not has_auto_eligible:
                mode = "ask"
        return mode
    return "ask"  # floor classes can never be auto


def _valid_until(now: datetime, ttl_s: int, effective_close_iso: str | None, grace_min: int) -> str:
    base = now + timedelta(seconds=ttl_s)
    if effective_close_iso:
        close = datetime.fromisoformat(effective_close_iso.replace("Z", "+00:00"))
        deadline = close - timedelta(minutes=grace_min)
        return _iso(min(base, deadline))
    return _iso(base)  # degenerate no-window arm (§3.2)


def evaluate(
    snapshot: Snapshot | None,
    integrity_ok: bool,
    *,
    host_id: str,
    action_class: str,
    now: datetime,
    decision_id: str,
    clock: ClockHealth,
    ttl_s: int = 60,
) -> Verdict:
    evaluated_at = _iso(now)
    pv = snapshot.git_commit if snapshot else ""

    def deny(reason_code: str, *, escal: dict | None = None, extra: str | None = None) -> Verdict:
        reasons = [reason_code] + ([extra] if extra else [])
        v = Verdict(
            verdict="deny", reason=reasons, decision_id=decision_id, evaluated_at=evaluated_at,
            valid_until=_iso(now + timedelta(seconds=ttl_s)), policy_version=pv,
            in_window=False, grace=0, verdict_basis="policy",
        )
        if escal:
            v.escalations.append(escal)
        return v

    # ---- Universal preconditions (before ANY branch) ----
    # P0 (dominant): boot-integrity / snapshot health. A restore/rollback => deny-all (§1).
    if snapshot is None or not integrity_ok:
        return deny("policy_unavailable", escal={"kind": "policy_integrity_error", "host": host_id})

    # P1: resolve host (aliases resolve to one host_id BEFORE lookup, §2.1).
    canon = snapshot.resolve_alias(host_id)
    if canon is None:
        return deny("no_such_host")
    host = snapshot.hosts[canon]

    # P2: action_class enum — checked BEFORE the fork (AR cluster A: a disposable host must
    # never get a signed permit for a nonexistent class).
    if action_class not in ACTION_CLASSES:
        return deny("bad_action_class")

    # P3: clock health — before the fork, so no verdict is signed off an unsafe clock (§3.5).
    if not clock.ok:
        return deny("clock_unsafe", escal={"kind": "clock_skew", "host": canon})

    # ---- Class fork (keyed on the STORED class, never any request input) ----
    if host.host_class == "disposable":
        # The carve-out substitutes ONLY window/floor/approval semantics; input validation
        # + environment health already ran above.
        if action_class != SANDBOX_ACTION_CLASS:
            return deny("wrong_target_class")
        # §C6 fail-closed INSIDE the carve-out: a disposable record carrying any real policy
        # field is a config error (schema forbids it, but re-assert at decision time).
        if host.tier is not None or host.windows or host.overrides or host.wazuh_agent_id:
            return deny("sandbox_config_error", escal={"kind": "sandbox_config_error", "host": canon})
        if not snapshot.sandbox_enabled:
            return deny("sandbox_disabled")  # operator-intentional; no escalation
        return Verdict(
            verdict="permit", reason=["permit"], decision_id=decision_id, evaluated_at=evaluated_at,
            valid_until=_iso(now + timedelta(seconds=ttl_s)), policy_version=pv,
            in_window=True, window_id=None, window_opens_at=None, window_closes_at=None,
            seconds_remaining=None, grace=0, active_freeze=None, tier=None,
            approval_mode="auto", tzid=None, host_class="disposable",
            verdict_basis="sandbox_carve_out",
        )

    # managed
    if action_class == SANDBOX_ACTION_CLASS:
        return deny("wrong_target_class")
    if host.tier is None:  # unpolicied sentinel
        return deny("no_policy", escal={"kind": "needs_tiering", "host": canon})

    # ---- Window algebra (managed only) ----
    wr = evaluate_windows(host.windows, now)
    if wr.dst_error:
        return deny("dst_unresolvable", escal={"kind": "dst_gap_window_never_opened", "host": canon})
    if wr.ambiguity:
        return deny("window_ambiguity",
                    escal={"kind": "window_ambiguity", "host": canon, "window_id": wr.window_id})

    # ---- Approval mode (managed only) — the SAME resolver the classifier uses ----
    # (catalog auto-eligibility re-checked LIVE; the destructive-never-auto floor forces
    # ask; §3.3 step 7). resolve_approval_mode is the single source of truth.
    mode = resolve_approval_mode(snapshot, host, action_class)

    if not wr.in_window:
        # not_in_window / freeze_active / grace_zone — all deny, evidence retained.
        v = Verdict(
            verdict="deny", reason=wr.reason, decision_id=decision_id, evaluated_at=evaluated_at,
            valid_until=_valid_until(now, ttl_s, wr.window_closes_at, wr.grace),
            policy_version=pv, in_window=False, window_id=wr.window_id,
            window_opens_at=wr.window_opens_at, window_closes_at=wr.window_closes_at,
            seconds_remaining=wr.seconds_remaining, grace=wr.grace, active_freeze=wr.active_freeze,
            tier=host.tier, approval_mode=mode, tzid=wr.tzid, host_class="managed",
            verdict_basis="policy",
        )
        return v

    # in_window: deterministic mapping — auto => permit, ask => ask.
    final = "permit" if mode == "auto" else "ask"
    return Verdict(
        verdict=final, reason=[mode], decision_id=decision_id, evaluated_at=evaluated_at,
        valid_until=_valid_until(now, ttl_s, wr.window_closes_at, wr.grace),
        policy_version=pv, in_window=True, window_id=wr.window_id,
        window_opens_at=wr.window_opens_at, window_closes_at=wr.window_closes_at,
        seconds_remaining=wr.seconds_remaining, grace=wr.grace, active_freeze=None,
        tier=host.tier, approval_mode=mode, tzid=wr.tzid, host_class="managed",
        verdict_basis="policy",
    )
