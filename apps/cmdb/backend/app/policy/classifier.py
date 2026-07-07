"""The fail-closed weakening classifier (§6.2, AR clusters B/C).

Design rule (stated first): **any field a consumer (Gateway, Board, auth PDP) reads for
routing, rollback, mid-run behavior, or triage is policy, not "facts"** — its permissive
direction must be caught below, and **an edit the classifier cannot prove non-weakening is
treated as weakening**. The classifier itself fails closed.

Three layers over (old_snapshot → new_snapshot):

1. **Derived-effect diff (primary):** re-run the SAME ``resolve_approval_mode`` the gate
   uses across the full (host × real action_class) matrix and flag any cell moving toward
   ``auto`` — this catches creations, rebindings, and deletions-that-unblock that row-delta
   rules miss (e.g. a NEW catalog entry born ``rollback_declared: true`` flipping a cell
   auto-eligible — the one CRITICAL cluster-C finding). Plus the consumed routing/triage
   facts (snapshot_capability, on_window_close, tier timeouts, task-type attrs, catalog).
2. **Structural window rule (horizon-free):** any new allow window; any allow-window
   mutation not provably coverage-non-expanding (conservative: any change ⇒ weakening); any
   freeze removal/narrowing; any grace reduction. The 90-day occurrence sample is used ONLY
   for the human-readable blast-radius preview, NEVER as the classifier.
3. **Static kind list (belt-and-braces):** tier downgrade / host-gains-policy; snapshot_cap
   off ``none``; ``on_window_close`` toward ``finish_current_step``; pool re-enable;
   disposable-slot creation; Wazuh bind/rebind; catalog rollback enablement / tier widening
   / duration change; permissive task-type creation/reclassify / verifier unbind.

Any layer firing ⇒ ``weakening = True`` (the gate-weakening ceremony, §6.3).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import timedelta
from zoneinfo import ZoneInfo

from ..clock import now_dt
from .constants import REAL_ACTION_CLASSES, TIERS
from .evaluate import resolve_approval_mode
from .models import Snapshot, Window
from .windows import _all_occurrences  # occurrence sampler (preview only)

_TIER_STRICTNESS = {t: i for i, t in enumerate(TIERS)}  # tier0=0 strictest ... tier3=3 loosest


@dataclass
class BlastRadius:
    cells_made_auto: list[dict] = field(default_factory=list)
    hosts_gain_coverage: int = 0
    full_shadow_warnings: list[str] = field(default_factory=list)


@dataclass
class Classification:
    weakening: bool
    reasons: list[str]
    blast: BlastRadius


def _windows_by_id(host) -> dict[str, Window]:
    return {w.id: w for w in (host.windows if host else ())}


def _coverage_seconds(w: Window, days: int = 90) -> int:
    """Finite occurrence sample — PREVIEW ONLY (never the classifier decision)."""
    try:
        tz = ZoneInfo(w.tzid)
    except Exception:  # noqa: BLE001
        return 0
    t0 = now_dt()
    total = 0
    for occ in _all_occurrences(w, tz, t0):
        if occ.end_utc <= t0 or occ.start_utc >= t0 + timedelta(days=days):
            continue
        total += int((occ.end_utc - occ.start_utc).total_seconds())
    return total


def classify(old: Snapshot, new: Snapshot) -> Classification:
    reasons: list[str] = []
    blast = BlastRadius()

    # ---- Layer 1: derived-effect mode diff (the primary, catches all creation bypasses) ----
    for host_id, nh in new.hosts.items():
        oh = old.hosts.get(host_id)
        if nh.host_class != "managed":
            continue
        for ac in REAL_ACTION_CLASSES:
            new_mode = resolve_approval_mode(new, nh, ac)
            old_mode = resolve_approval_mode(old, oh, ac) if oh else "ask"
            if new_mode == "auto" and old_mode != "auto":
                blast.cells_made_auto.append(
                    {"host": host_id, "action_class": ac, "before": old_mode, "after": "auto"}
                )
    if blast.cells_made_auto:
        reasons.append("cells_made_auto_eligible")

    # ---- Layer 1b: consumed routing facts + triage attributes ----
    for host_id, nh in new.hosts.items():
        oh = old.hosts.get(host_id)
        old_cap = oh.snapshot_capability if oh else "none"
        if nh.snapshot_capability != "none" and old_cap == "none":
            reasons.append(f"snapshot_capability_enabled:{host_id}")
        # host gains policy (unpolicied -> tiered) or tier downgrade
        old_tier = oh.tier if oh else None
        if nh.tier is not None and old_tier is None:
            reasons.append(f"host_gains_policy:{host_id}")
        elif nh.tier is not None and old_tier is not None:
            if _TIER_STRICTNESS.get(nh.tier, 0) > _TIER_STRICTNESS.get(old_tier, 0):
                reasons.append(f"tier_downgrade:{host_id}")
        # Wazuh bind/rebind (§6.2 static list)
        if (nh.wazuh_agent_id or None) != (oh.wazuh_agent_id if oh else None):
            reasons.append(f"wazuh_bind:{host_id}")

    # tier timeout policy + on_window_close are Gateway-visible routing facts.
    for name, nt in new.tiers.items():
        ot = old.tiers.get(name)
        if ot and (nt.health_check_timeout_s != ot.health_check_timeout_s or
                   nt.ssh_wait_timeout_s != ot.ssh_wait_timeout_s):
            reasons.append(f"tier_timeout_changed:{name}")

    # ---- Layer 2: structural window rule (horizon-free) ----
    for host_id, nh in new.hosts.items():
        oh = old.hosts.get(host_id)
        old_w = _windows_by_id(oh)
        new_w = _windows_by_id(nh)
        for wid, w in new_w.items():
            prev = old_w.get(wid)
            if w.kind == "allow":
                if prev is None or prev.kind != "allow":
                    reasons.append(f"new_allow_window:{host_id}:{wid}")
                    blast.hosts_gain_coverage += 1
                elif w != prev:
                    # Any mutation not provably coverage-non-expanding ⇒ weakening (conservative).
                    reasons.append(f"allow_window_mutated:{host_id}:{wid}")
                    if w.grace_minutes < prev.grace_minutes:
                        reasons.append(f"grace_reduced:{host_id}:{wid}")
            elif w.kind == "freeze" and prev is not None and w != prev:
                reasons.append(f"freeze_narrowed:{host_id}:{wid}")
        for wid, w in old_w.items():
            if wid not in new_w and w.kind == "freeze":
                reasons.append(f"freeze_removed:{host_id}:{wid}")

    # full-shadow detection at authoring (§4.3): an allow window entirely shadowed by a freeze.
    for host_id, nh in new.hosts.items():
        allows = [w for w in nh.windows if w.kind == "allow"]
        freezes = [w for w in nh.windows if w.kind == "freeze"]
        for a in allows:
            if _coverage_seconds(a) > 0 and freezes and all(
                _coverage_seconds(a) > 0 and _shadowed(a, f) for f in freezes
            ):
                blast.full_shadow_warnings.append(f"{host_id}:{a.id}")

    # ---- Layer 3: static kind list (remaining) ----
    if new.sandbox_enabled and not old.sandbox_enabled:
        reasons.append("sandbox_pool_re_enabled")
    for host_id, nh in new.hosts.items():
        if nh.host_class == "disposable" and host_id not in old.hosts:
            reasons.append(f"disposable_slot_created:{host_id}")

    # catalog: rollback enablement / tier widening / new auto-enabling entry / duration change
    for pk, nce in new.catalog.items():
        oce = old.catalog.get(pk)
        if oce is None:
            if nce.rollback_declared:
                reasons.append(f"catalog_entry_created_rollback:{pk}")
        else:
            if nce.rollback_declared and not oce.rollback_declared:
                reasons.append(f"catalog_rollback_enabled:{pk}")
            if set(nce.applicable_tiers) - set(oce.applicable_tiers):
                reasons.append(f"catalog_tiers_widened:{pk}")
            if nce.duration_estimate_s != oce.duration_estimate_s:
                reasons.append(f"catalog_duration_changed:{pk}")
            if nce.action_class != oce.action_class:
                reasons.append(f"catalog_action_class_rebound:{pk}")

    # task-types: permissive creation / reclassify / verifier unbind (Board triage inputs)
    for tk, ntt in new.task_types.items():
        ott = old.task_types.get(tk)
        if ott is None:
            if (not ntt.destructive) or ntt.reversible or ntt.external_verifier == "none":
                reasons.append(f"task_type_created_permissive:{tk}")
        else:
            if ntt.reversible and not ott.reversible:
                reasons.append(f"task_type_more_reversible:{tk}")
            if (not ntt.destructive) and ott.destructive:
                reasons.append(f"task_type_less_destructive:{tk}")
            if ott.external_verifier != "none" and ntt.external_verifier == "none":
                reasons.append(f"task_type_verifier_unbound:{tk}")

    weakening = bool(reasons)
    return Classification(weakening=weakening, reasons=reasons, blast=blast)


def _shadowed(allow: Window, freeze: Window) -> bool:
    """Cheap heuristic full-shadow test for the PREVIEW: an allow whose 90-day sampled
    coverage is fully contained in a freeze of the same recurrence shape. Conservative —
    used only to surface a warning, never to gate."""
    if allow.tzid != freeze.tzid:
        return False
    return (
        allow.rrule == freeze.rrule
        and allow.start_local == freeze.start_local
        and allow.end_local == freeze.end_local
    )
