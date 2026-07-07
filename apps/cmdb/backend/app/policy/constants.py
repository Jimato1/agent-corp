"""Frozen enums + the destructive-never-auto floor (cmdb-gateway-policy.md §4; sandbox §G5.4)."""
from __future__ import annotations

# The six REAL action classes (contract §4 verbatim), extensible ONLY via policy-plane
# change control — and adding an enum value is itself a statically-weakening edit (§6.2).
REAL_ACTION_CLASSES: tuple[str, ...] = (
    "package_update",
    "config_change",
    "service_restart",
    "reboot",
    "kernel_update",
    "destructive",
)

# The 7th class, frozen by the Gateway's §G: valid ONLY on the disposable branch. Real
# catalog playbooks never carry it; sandbox profiles carry only it.
SANDBOX_ACTION_CLASS = "sandbox_exec"

ACTION_CLASSES: tuple[str, ...] = REAL_ACTION_CLASSES + (SANDBOX_ACTION_CLASS,)

# The destructive-never-auto FLOOR: these classes can NEVER resolve `auto` on a managed
# host (§3.3). Enforced twice — the schema validator refuses authoring such a cell, and
# evaluate() re-asserts it at decision time. This floor may only GROW via change control;
# shrinking it is a cross-app contract amendment by construction.
FLOOR_NON_AUTO: frozenset[str] = frozenset({"reboot", "kernel_update", "destructive"})

# Host classes (sandbox contract §C1). `class` is IMMUTABLE after creation.
HOST_CLASSES: tuple[str, ...] = ("managed", "disposable")

# Criticality tiers (§4.1). `unpolicied` is a SYNTHETIC always-deny sentinel — not a file,
# not referenceable, not editable into a tier.
TIERS: tuple[str, ...] = ("tier0", "tier1", "tier2", "tier3")
UNPOLICIED = "unpolicied"

APPROVAL_MODES: tuple[str, ...] = ("auto", "ask")

# Window mid-run close semantics (D-6d) — POLICY the Gateway reads (its PLAN §7).
ON_WINDOW_CLOSE = ("abort_and_rollback", "finish_current_step")

# Enforced RRULE allowlist (§4.3). Anything else is rejected at schema level.
RRULE_ALLOWED_FREQ: frozenset[str] = frozenset({"DAILY", "WEEKLY", "MONTHLY"})
RRULE_ALLOWED_PARTS: frozenset[str] = frozenset(
    {"FREQ", "INTERVAL", "BYDAY", "BYHOUR", "BYMINUTE", "UNTIL"}
)

# snapshot_capability values (D-6a). 'none' routes snapshot-gated classes to ask/manual.
SNAPSHOT_CAPABILITIES: tuple[str, ...] = ("btrfs", "lvm", "zfs", "none")

# Verdict reason codes — CMDB-authored enums, NEVER host-originated free text (ARCH §12).
# (Documentation of the closed set the reason[] field may carry.)
REASON_CODES: frozenset[str] = frozenset({
    "no_such_host", "no_policy", "bad_action_class", "wrong_target_class",
    "clock_unsafe", "dst_unresolvable", "window_ambiguity", "grace_zone",
    "not_in_window", "in_window", "policy_unavailable", "sandbox_config_error",
    "sandbox_disabled", "freeze_active", "auto", "ask", "permit", "break_glass_active",
})
