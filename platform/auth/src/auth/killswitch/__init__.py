"""auth.killswitch — the graduated kill switch + operator break-glass (PLAN §7).

Two modules, one job: give the operator a way to STOP that (a) is graduated
(G0/G1/G2, §7.2), (b) writes an authoritative append-only revocation-ledger entry
BEFORE it is acknowledged (write-before-ack, §4.6 finding 3d), (c) fans the freeze
posture out over the HotStore + publish channel (§7.3), and (d) provides an
offline-factor-gated break-glass that can only ever move toward LESS real-world
action — it structurally holds NO action-side holder scope, so break-glass can
never itself execute or redeem a credential (§3.4, §7.7).

  * killswitch.py  — KillSwitchController (graduated arm + surgical revoke), the
                     killswitch-denies decision (§7.2), and the fail-closed matrix
                     (§7.5) as a pure callable.
  * breakglass.py  — BreakGlassController: offline-factor-gated STOP/RESTORE only;
                     single-use / time-boxed / auto-revoke; loud audit + broadcast +
                     auto-filed needs_review shapes; the VISIBLE-ABSENCE guarantee
                     that relaxing approve/execute is not a capability at all.

Imports ONLY auth.core / auth.store / auth.crypto + stdlib. No sibling-package
imports — integration wires the surfaces on top of this.
"""

from .killswitch import (
    KILL_G0,
    KILL_G1,
    KILL_G2,
    CLASS_READ,
    CLASS_WRITE_BENIGN,
    CLASS_PROPOSE,
    CLASS_SOD_CRITICAL,
    CLASS_DESTRUCTIVE_EXEC,
    DEP_NONE,
    DEP_LIVE_PDP,
    DEP_REDIS,
    DEP_JWKS,
    DEP_TIMEOUT,
    DECISION_OPEN,
    DECISION_CLOSED,
    KillAck,
    KillDecision,
    KillSwitchController,
    RevocationLedgerEntry,
    action_class_for_scope,
    fail_closed_matrix,
    killswitch_denies,
)
from .breakglass import (
    DIRECTION_STOP,
    DIRECTION_RESTORE,
    STOP_OPERATIONS,
    RESTORE_OPERATIONS,
    BREAK_GLASS_SCOPES,
    BreakGlassController,
    BreakGlassSession,
    BreakGlassRecord,
    BreakGlassError,
    BreakGlassAuthError,
    BreakGlassScopeForbidden,
    BreakGlassConsumed,
    BreakGlassExpired,
    breakglass_can_cause_action,
    relaxing_sod_is_a_capability,
)

__all__ = [
    "KILL_G0",
    "KILL_G1",
    "KILL_G2",
    "CLASS_READ",
    "CLASS_WRITE_BENIGN",
    "CLASS_PROPOSE",
    "CLASS_SOD_CRITICAL",
    "CLASS_DESTRUCTIVE_EXEC",
    "DEP_NONE",
    "DEP_LIVE_PDP",
    "DEP_REDIS",
    "DEP_JWKS",
    "DEP_TIMEOUT",
    "DECISION_OPEN",
    "DECISION_CLOSED",
    "KillAck",
    "KillDecision",
    "KillSwitchController",
    "RevocationLedgerEntry",
    "action_class_for_scope",
    "fail_closed_matrix",
    "killswitch_denies",
    "DIRECTION_STOP",
    "DIRECTION_RESTORE",
    "STOP_OPERATIONS",
    "RESTORE_OPERATIONS",
    "BREAK_GLASS_SCOPES",
    "BreakGlassController",
    "BreakGlassSession",
    "BreakGlassRecord",
    "BreakGlassError",
    "BreakGlassAuthError",
    "BreakGlassScopeForbidden",
    "BreakGlassConsumed",
    "BreakGlassExpired",
    "breakglass_can_cause_action",
    "relaxing_sod_is_a_capability",
]
