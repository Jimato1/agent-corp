"""auth.tokens.revocation — the live denylist consult + the §4.7 decision table.

Two things live here, both callable policies:

  1. consult_denylist() — the LIVE revocation check against the HotStore, over
     the three granularities (PLAN §4.6):
        * surgical      jti            → is_jti_denied
        * principal     sub + iat      → iat < revoked_before[sub]
        * key/kid       kid            → is_kid_retired
        * client        client_id      → is_client_disabled
     It is FAIL-CLOSED (finding 2c/A): if authoritative revocation state cannot
     be read, it returns DENY (reason "revocation_unreadable"), NEVER allow. It
     also reads the kill switch and denies under a G2 quiesce.

  2. classify() + evaluate() — the §4.7 fast-path-vs-live-check DECISION TABLE as
     a callable policy. A benign read is the LOCAL fast path (no denylist consult;
     ≤ TTL staleness accepted). A holder/destructive/kill scope is a LIVE check;
     the two real-world-power scopes (gateway:execute, vault:read-credential) take
     the additional synchronous introspection dependency. Anything Tier-2 and
     otherwise unclassified defaults to LIVE (fail-closed).

This module does NOT validate signatures/exp/aud — that is auth.tokens.jwt's job
on the local fast path. Here we assume a locally-valid token and answer the
orthogonal question "has it (or its principal/key/client) been revoked, and does
this call-path even require asking?"
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Optional

from ..core.errors import FailClosed
from ..core.interfaces import HotStore
from ..core.scopes import (
    ACTION_SIDE,
    MC_KILL_SWITCH,
    require_scope,
)
from ..core.tokens_model import AccessTokenClaims


# The G2 kill level = full quiesce (PLAN §7.2): benign paths fail closed too.
KILL_G2 = "G2"


class Enforcement(Enum):
    """The §4.7 call-path classes that matter for revocation freshness."""
    FAST_PATH = "fast_path"                      # local JWT only; NO denylist consult
    LIVE_CHECK = "live_check"                    # authoritative denylist read
    LIVE_PLUS_INTROSPECT = "live_plus_introspect"  # + synchronous uncached introspection

    @property
    def requires_live_check(self) -> bool:
        return self is not Enforcement.FAST_PATH

    @property
    def requires_introspection(self) -> bool:
        return self is Enforcement.LIVE_PLUS_INTROSPECT


@dataclass(frozen=True)
class RevocationDecision:
    """Outcome of a revocation consult / evaluate call."""
    allowed: bool
    enforcement: Enforcement
    reason: Optional[str] = None          # machine code when denied
    granularity: Optional[str] = None     # "jti" | "sub" | "kid" | "client_id" | "killswitch"

    @classmethod
    def allow(cls, enforcement: Enforcement) -> "RevocationDecision":
        return cls(allowed=True, enforcement=enforcement)

    @classmethod
    def deny(
        cls,
        enforcement: Enforcement,
        reason: str,
        granularity: Optional[str] = None,
    ) -> "RevocationDecision":
        return cls(allowed=False, enforcement=enforcement, reason=reason, granularity=granularity)


# ---------------------------------------------------------------------------
# 1. The §4.7 decision table — classify a required scope.
# ---------------------------------------------------------------------------

def classify(required_scope: str) -> Enforcement:
    """Map a required scope to its §4.7 enforcement class.

      * gateway:execute / vault:read-credential (the ACTION side — real-world
        power) → LIVE_PLUS_INTROSPECT (pushed denylist AND synchronous uncached
        introspection).
      * mc:kill-switch and every other Tier-2 scope (holders board:approve /
        cmdb:write-policy, board:claim, admin scopes, ...) → LIVE_CHECK. This is
        the "default for anything Tier-2/unclassified = live-check, fail-closed"
        rule (PLAN §4.7).
      * Tier-1 scopes (benign reads, reversible writes) → FAST_PATH (no denylist
        consult; ≤ TTL staleness accepted, PLAN §4.2).

    An unknown scope raises UnknownScope via require_scope — auth never
    fast-paths a scope it does not recognize.
    """
    if required_scope in ACTION_SIDE:
        return Enforcement.LIVE_PLUS_INTROSPECT
    sd = require_scope(required_scope)  # raises UnknownScope for anything off-taxonomy
    if required_scope == MC_KILL_SWITCH:
        return Enforcement.LIVE_CHECK
    if sd.tier == 2:
        return Enforcement.LIVE_CHECK
    return Enforcement.FAST_PATH


# ---------------------------------------------------------------------------
# 2. The live denylist consult (fail-closed).
# ---------------------------------------------------------------------------

def consult_denylist(
    hot: HotStore,
    *,
    jti: str,
    sub: str,
    iat: int,
    client_id: Optional[str] = None,
    kid: Optional[str] = None,
    enforcement: Enforcement = Enforcement.LIVE_CHECK,
) -> RevocationDecision:
    """Consult the authoritative denylist across all granularities (PLAN §4.6).

    FAIL-CLOSED (finding 2c/A): any error reading authoritative state → DENY with
    reason 'revocation_unreadable'. A live-check path must NEVER return allow from
    'could not read revocation state'.
    """
    try:
        # Stage-6: ONE batched round-trip for all granularities (the Redis impl
        # pipelines them). The deny-PRECEDENCE below is byte-for-byte the same order
        # as the previous sequential reads — batching changes round-trips, not the
        # decision. The only difference is no server-side early-exit (we fetched all
        # keys), which is cheap and irrelevant to correctness.
        snap = hot.consult_snapshot(jti=jti, sub=sub, kid=kid, client_id=client_id)

        # kill switch first (§6.6 step 0): a G2 quiesce denies even here.
        if snap.kill_level == KILL_G2:
            return RevocationDecision.deny(enforcement, "killswitch_g2_quiesce", "killswitch")

        if snap.jti_denied:
            return RevocationDecision.deny(enforcement, "jti_revoked", "jti")

        if snap.revoked_before is not None and iat < snap.revoked_before:
            return RevocationDecision.deny(enforcement, "sub_revoked_before", "sub")

        if kid is not None and snap.kid_retired:
            return RevocationDecision.deny(enforcement, "kid_retired", "kid")

        if client_id is not None and snap.client_disabled:
            return RevocationDecision.deny(enforcement, "client_disabled", "client_id")

    except FailClosed:
        # Already the safe direction — propagate its reason as a deny.
        raise
    except Exception:
        # Could not read authoritative revocation state → fail closed.
        return RevocationDecision.deny(enforcement, "revocation_unreadable")

    return RevocationDecision.allow(enforcement)


# ---------------------------------------------------------------------------
# 3. The full callable policy — classify then (only if needed) consult.
# ---------------------------------------------------------------------------

def evaluate(
    claims: AccessTokenClaims,
    hot: HotStore,
    *,
    required_scope: str,
) -> RevocationDecision:
    """The end-to-end §4.7 policy for one already-locally-valid token.

    Classifies the call path from `required_scope`; on the FAST_PATH it returns
    allow WITHOUT touching the denylist (≤ TTL staleness accepted). On any
    live-check path it consults the authoritative denylist across jti / sub / kid
    / client_id and fails closed. The `enforcement` on the result tells the caller
    whether it must additionally take the synchronous introspection dependency
    (gateway:execute / vault:read-credential).
    """
    enforcement = classify(required_scope)
    if enforcement is Enforcement.FAST_PATH:
        return RevocationDecision.allow(enforcement)

    kid = None  # the JOSE header kid is not on the claims; the caller may re-pass
    return consult_denylist(
        hot,
        jti=claims.jti,
        sub=claims.sub,
        iat=claims.iat,
        client_id=claims.client_id,
        kid=kid,
        enforcement=enforcement,
    )
