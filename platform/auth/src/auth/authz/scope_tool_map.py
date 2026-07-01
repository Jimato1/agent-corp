"""auth.authz.scope_tool_map — the scope -> MCP-tool mapping table (PLAN §5.5).

This is THE contract every app builds its MCP-surface authz against: for each
representative tool of every suite app it pins

  * the required coarse scope(s)  — the token *surface* the PEP checks (Tier-1);
  * whether the tool is fast-path or PDP-gated (Tier-2, §5.2);
  * the budget action-class (§6.2) the tool is metered under;
  * the canonical PDP action id (§5.3) for the gated tools.

`app:capability` scopes are the frozen taxonomy in auth.core.scopes — this module
NEVER re-declares them, it only references them, so the audience discriminator and
the SoD holder marking stay single-sourced.

The mapping itself is a plain declarative table; the PEP (pep.py) reads it to
answer "which scope does this tool need and does it route to the PDP?", and the
PDP (pdp.py) reads it in reverse (action id -> required scope) so both tiers agree
on one table.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, FrozenSet, Optional

from ..core import scopes as S

# ---------------------------------------------------------------------------
# Budget action-class taxonomy (PLAN §6.2) — the enforcement key for budgets.
# ---------------------------------------------------------------------------
CLASS_READ = "read"
CLASS_WRITE_BENIGN = "write-benign"
CLASS_PROPOSE = "propose"
CLASS_SOD_CRITICAL = "sod-critical"
CLASS_DESTRUCTIVE = "destructive-exec"

# ---------------------------------------------------------------------------
# Canonical PDP action ids (PLAN §5.3) for the PDP-gated tools. Namespaced
# `App::tool` so the PDP switch and the audit line name exactly one action.
# ---------------------------------------------------------------------------
ACTION_BOARD_CLAIM = "Board::claim_ticket"
ACTION_BOARD_APPROVE = "Board::approve_ticket"
ACTION_CMDB_WRITE_POLICY = "CMDB::write_policy"
ACTION_VAULT_REDEEM = "Vault::redeem_handle"
ACTION_GATEWAY_EXECUTE = "Gateway::execute_approved_plan"
ACTION_MC_KILL_SWITCH = "MC::set_kill_switch"


@dataclass(frozen=True)
class ToolRule:
    """One row of the §5.5 table — immutable."""
    tool: str
    required_scopes: FrozenSet[str]
    pdp_gated: bool                     # Tier-2? (§5.2)
    action_class: str                  # §6.2 budget class
    action_id: Optional[str] = None    # canonical PDP action id (gated tools only)

    def __post_init__(self) -> None:
        # Fail loud if a rule references a scope outside the frozen taxonomy —
        # keeps this table honest against auth.core.scopes.
        for sc in self.required_scopes:
            if not S.is_valid_scope(sc):
                raise ValueError(
                    f"tool {self.tool!r} requires unknown scope {sc!r} "
                    f"(not in the auth.core.scopes taxonomy)"
                )
        if self.pdp_gated and self.action_id is None:
            raise ValueError(f"PDP-gated tool {self.tool!r} must declare an action_id")


def _r(tool: str, scopes, pdp: bool, cls: str, action_id: Optional[str] = None) -> ToolRule:
    return ToolRule(tool, frozenset(scopes), pdp, cls, action_id)


# ---------------------------------------------------------------------------
# The table (PLAN §5.5) — representative tools of EVERY suite app.
# fast = Tier-1 local PEP only; PDP = additionally hits the central PDP.
# ---------------------------------------------------------------------------
_RULES = (
    # board -----------------------------------------------------------------
    _r("board.list_tickets", {S.BOARD_READ}, False, CLASS_READ),
    _r("board.get_ticket", {S.BOARD_READ}, False, CLASS_READ),
    _r("board.propose_plan", {S.BOARD_PROPOSE}, False, CLASS_PROPOSE),
    _r("board.update_ticket", {S.BOARD_UPDATE}, False, CLASS_WRITE_BENIGN),
    _r("board.run_ceremony", {S.BOARD_RUN_CEREMONY}, False, CLASS_WRITE_BENIGN),
    # PDP-gated: concurrency/WIP + per-host lock + cooldown.
    _r("board.claim_ticket", {S.BOARD_CLAIM}, True, CLASS_WRITE_BENIGN, ACTION_BOARD_CLAIM),
    # PDP-gated HOLDER: SoD sub != proposer_id (Board owner AND PDP backstop).
    _r("board.approve_ticket", {S.BOARD_APPROVE}, True, CLASS_SOD_CRITICAL, ACTION_BOARD_APPROVE),
    # cmdb ------------------------------------------------------------------
    _r("cmdb.query_policy", {S.CMDB_READ_POLICY}, False, CLASS_READ),
    _r("cmdb.read_inventory", {S.CMDB_READ}, False, CLASS_READ),
    # PDP-gated HOLDER: policy authority.
    _r("cmdb.write_policy", {S.CMDB_WRITE_POLICY}, True, CLASS_SOD_CRITICAL, ACTION_CMDB_WRITE_POLICY),
    # vault -----------------------------------------------------------------
    _r("vault.reference_handle", {S.VAULT_REFERENCE}, False, CLASS_READ),
    # PDP-gated HOLDER: credential redemption (Gateway principal ONLY, never cached).
    _r("vault.redeem_handle", {S.VAULT_READ_CREDENTIAL}, True, CLASS_DESTRUCTIVE, ACTION_VAULT_REDEEM),
    # gateway ---------------------------------------------------------------
    _r("gateway.read_monitor", {S.GATEWAY_READ}, False, CLASS_READ),
    # PDP-gated HOLDER: execution authority (single-use approval, fencing, live rev).
    _r("gateway.execute_approved_plan", {S.GATEWAY_EXECUTE}, True, CLASS_DESTRUCTIVE, ACTION_GATEWAY_EXECUTE),
    # notes -----------------------------------------------------------------
    _r("notes.read", {S.NOTES_READ}, False, CLASS_READ),
    _r("notes.search", {S.NOTES_SEARCH}, False, CLASS_READ),
    _r("notes.write", {S.NOTES_WRITE}, False, CLASS_WRITE_BENIGN),
    # mc --------------------------------------------------------------------
    _r("mc.report_status", {S.MC_REPORT}, False, CLASS_READ),
    _r("mc.request_escalation", {S.MC_ESCALATE}, False, CLASS_WRITE_BENIGN),
    # PDP-gated: operator identity only; break-glass audited.
    _r("mc.set_kill_switch", {S.MC_KILL_SWITCH}, True, CLASS_SOD_CRITICAL, ACTION_MC_KILL_SWITCH),
    # drive -----------------------------------------------------------------
    _r("drive.get", {S.DRIVE_READ}, False, CLASS_READ),
    _r("drive.list", {S.DRIVE_READ}, False, CLASS_READ),
    _r("drive.put", {S.DRIVE_WRITE}, False, CLASS_WRITE_BENIGN),
    # chat ------------------------------------------------------------------
    _r("chat.read_feed", {S.CHAT_READ}, False, CLASS_READ),
    _r("chat.post_notification", {S.CHAT_POST}, False, CLASS_WRITE_BENIGN),
    # pdf (Safe class) ------------------------------------------------------
    _r("pdf.render", {S.PDF_RENDER}, False, CLASS_READ),
    _r("pdf.view", {S.PDF_VIEW}, False, CLASS_READ),
)

# tool name -> rule
SCOPE_TOOL_MAP: Dict[str, ToolRule] = {rule.tool: rule for rule in _RULES}

# canonical PDP action id -> rule (reverse index the PDP uses)
ACTION_ID_MAP: Dict[str, ToolRule] = {
    rule.action_id: rule for rule in _RULES if rule.action_id is not None
}


# ---------------------------------------------------------------------------
# Read helpers (the only surface the PEP/PDP import).
# ---------------------------------------------------------------------------

def rule_for(tool: str) -> Optional[ToolRule]:
    """The ToolRule for an MCP tool name, or None if the tool is unclassified.

    An unclassified tool has NO fast-path entry — the caller MUST fail closed
    (PLAN §4.7: 'Default for anything unclassified = live-check, fail-closed').
    """
    return SCOPE_TOOL_MAP.get(tool)


def rule_for_action(action_id: str) -> Optional[ToolRule]:
    """The ToolRule for a canonical PDP action id (reverse lookup for the PDP)."""
    return ACTION_ID_MAP.get(action_id)


def required_scopes(tool: str) -> Optional[FrozenSet[str]]:
    rule = SCOPE_TOOL_MAP.get(tool)
    return rule.required_scopes if rule else None


def is_pdp_gated(tool: str) -> bool:
    rule = SCOPE_TOOL_MAP.get(tool)
    return bool(rule and rule.pdp_gated)
