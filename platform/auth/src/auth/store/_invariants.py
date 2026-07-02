"""auth.store._invariants — the grant-time invariant DECISIONS, shared VERBATIM by
every durable Store backend (the SQLite test-store and the Postgres prod store).

WHY THIS MODULE EXISTS (Stage-5 migration, decision #8): the SSD/attestation/kind
enforcement is the single most security-critical logic in `auth`. Re-implementing it
per backend would risk divergence between what the 247 unit tests exercise (SQLite)
and what actually runs in prod (Postgres). Instead both backends delegate their four
widening mutations here, so the enforcement is ONE copy — parity is by CONSTRUCTION,
and the SQLite-backed unit suite is a faithful regression test for the Postgres path.

The actual SoD DECISION primitives live in auth.core.scopes (immutable, compiled-in,
unit-tested): `find_holder_conflict`, `find_holder_kind_violation`, `ACTION_SIDE`.
This module only APPLIES them over a store's recomputed post-mutation effective
closure for each affected principal, in the order that names an SoD collapse as such
(SSD first). It performs NO writes and holds NO state; the caller owns the
transaction and rolls it back atomically on any raise.

A backend need only expose the read facade below (all already on the Store Protocol
except `effective_roles`, a public alias each backend provides).
"""
from __future__ import annotations

from typing import FrozenSet, Iterable, List, Optional, Protocol, Set

from ..core import scopes as S
from ..core.errors import AttestationRequired, KindGateViolation, SoDViolation
from ..core.principals import AgentKey, Principal, Role

# Scopes that demand a hardware-bound (non_exportable) key at grant time
# (PLAN §3.6, finding 1a): the action-side holders that release real-world power.
ATTESTATION_REQUIRED_SCOPES: FrozenSet[str] = S.ACTION_SIDE


class GrantReadFacade(Protocol):
    """The read surface the invariant checks need — both backends implement it."""

    def effective_scopes(self, sub: str) -> FrozenSet[str]: ...
    def effective_roles(self, sub: str) -> Set[str]: ...
    def get_principal(self, sub: str) -> Optional[Principal]: ...
    def get_agent_keys(self, sub: str) -> List[AgentKey]: ...
    def get_role(self, role_id: str) -> Optional[Role]: ...


def enforce_grant_invariants(store: GrantReadFacade, affected_subs: Iterable[str]) -> None:
    """The COMPLETE grant-time invariant set, applied over the downward-transitive
    AFFECTED set on EVERY widening mutation (grant_scope_to_role /
    add_role_hierarchy_edge / assign_role / put_role). Closes review findings 1a
    (attestation) and 2 (kind-gating), which previously fired ONLY on assign_role.

    For EACH affected principal, over its recomputed POST-mutation effective closure
    (order matters — SSD first so an SoD collapse is named as such):
      (1) §3.5 SSD holder-pair conflict                     -> SoDViolation
      (2) §3.5 per-holder kind restriction (table)          -> KindGateViolation
      (3) §3.5 g2 role kind_gate/agent_class_gate over the
          EFFECTIVE role closure                            -> KindGateViolation
      (4) §3.6/finding-1a non-exportable-key attestation
          for action-side holders                           -> AttestationRequired
    Any raise leaves the caller to roll back its whole transaction (atomic reject)."""
    subs = list(affected_subs)
    enforce_ssd(store, subs)
    for sub in subs:
        enforce_holder_kind(store, sub)
        enforce_kind_gates(store, sub)
        enforce_attestation(store, sub)


def enforce_ssd(store: GrantReadFacade, affected_subs: Iterable[str]) -> None:
    for sub in affected_subs:
        pair = S.find_holder_conflict(store.effective_scopes(sub))
        if pair is not None:
            # Atomic reject — the caller's transaction is rolled back.
            raise SoDViolation(sub, pair)


def enforce_holder_kind(store: GrantReadFacade, sub: str) -> None:
    """§3.5 per-holder kind restriction over the effective closure: an agent can
    never EFFECTIVELY hold vault:read-credential/cmdb:write-policy; a service can
    never hold gateway:execute/board:approve; etc. Enforced here so the restriction
    holds regardless of the widening path (review finding 2)."""
    principal = store.get_principal(sub)
    if principal is None:
        return
    violation = S.find_holder_kind_violation(store.effective_scopes(sub), principal.kind)
    if violation is not None:
        scope, allowed = violation
        raise KindGateViolation(
            f"holder scope {scope!r} is restricted to kinds {sorted(allowed)}; "
            f"principal {sub!r} is kind={principal.kind!r} — refusing to grant "
            f"(PLAN §3.5 decision table). A grant/hierarchy/role-replacement "
            f"path cannot escalate a holder scope onto a disallowed kind."
        )


def enforce_kind_gates(store: GrantReadFacade, sub: str) -> None:
    """§3.5 guarantee 2: re-validate EVERY role in the principal's effective role
    closure against its immutable kind/agent_class — catches a kind-gated role
    reached via an inherited or replaced role, not just direct assignment."""
    principal = store.get_principal(sub)
    if principal is None:
        return
    for role_id in store.effective_roles(sub):
        role = store.get_role(role_id)
        if role is None:
            continue
        if role.kind_gate is not None and principal.kind not in role.kind_gate:
            raise KindGateViolation(
                f"role {role_id!r} is restricted to kinds {sorted(role.kind_gate)}; "
                f"{sub!r} is kind={principal.kind!r}"
            )
        if role.agent_class_gate is not None and (
            principal.agent_class is None
            or principal.agent_class not in role.agent_class_gate
        ):
            raise KindGateViolation(
                f"role {role_id!r} is restricted to agent_class "
                f"{sorted(role.agent_class_gate)}; {sub!r} is "
                f"agent_class={principal.agent_class!r}"
            )


def enforce_attestation(store: GrantReadFacade, sub: str) -> None:
    eff = store.effective_scopes(sub)
    needs = eff & ATTESTATION_REQUIRED_SCOPES
    if not needs:
        return
    keys = store.get_agent_keys(sub)
    if not any(k.is_hardware_bound and k.status == "active" for k in keys):
        raise AttestationRequired(
            f"principal {sub!r} would hold {sorted(needs)} but has no active "
            f"non-exportable (hardware-bound) AgentKey — a soft-key holder is a "
            f"NO-GO (PLAN §3.6, finding 1a). Refusing to activate the role."
        )
