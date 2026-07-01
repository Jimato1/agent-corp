"""auth.tests.test_authz — Phase-2 AUTHZ (PEP + PDP) tests (PLAN §5).

Proves the load-bearing authz properties actually hold and RUN GREEN here:

  1. Cedar/compiled parity: the five `forbid` pairs in policies/sod.cedar EQUAL
     auth.core.scopes.conflict_pairs() exactly (§3.5 guarantee 3).
  2. `forbid` overrides `permit`: a principal effectively spanning an approve-side
     AND an action-side holder scope is DENIED dual_holder_forbidden for BOTH the
     approve action and the execute action (mis-issued dual-scoped token caught
     at use — the tertiary guardrail).
  3. The PEP rejects a valid token that lacks the tool's coarse scope with
     403 insufficient_scope + a scope hint (§5.1 step 6, §5.6).
  4. The PDP FAILS CLOSED when the PIP/context it needs is unavailable (decision #3).
  5. The no-self-approval backstop: sub == proposer_id is denied
     self_approval_forbidden (§3.5 finding 5c), while a distinct approver permits.
"""
from __future__ import annotations

import re
import unittest
from pathlib import Path
from typing import Optional

from auth.core import scopes as S
from auth.core.principals import (
    KIND_AGENT,
    KIND_HUMAN,
    KIND_SERVICE,
)
from auth.core.tokens_model import AccessTokenClaims
from auth.store.memory_hot import MemoryHotStore

from auth.authz import pdp as PDP
from auth.authz import pep as PEP
from auth.authz import scope_tool_map as STM


# ===========================================================================
# Test doubles.
# ===========================================================================

class _StubValidator:
    """A TokenValidator stand-in: returns preset claims iff aud matches, else raises.

    Cryptographic validation (sig/iss/exp/kid/cnf) is auth.tokens' job at
    integration; here we exercise the PEP's OWN steps (bearer parse, aud pin,
    coarse-scope gate, routing) with deterministic claims.
    """

    def __init__(self, claims: AccessTokenClaims) -> None:
        self._claims = claims

    def validate(self, token: str, *, expected_aud: str,
                 now: Optional[int] = None, dpop_proof: Optional[str] = None) -> AccessTokenClaims:
        if token == "BAD":
            raise ValueError("bad signature")
        if self._claims.aud != expected_aud:
            # aud==self (§5.1 step 5): a token for another app is invalid here.
            raise ValueError(f"aud {self._claims.aud!r} != expected {expected_aud!r}")
        return self._claims


class _RaisingPIP:
    """A PIP whose live reads are unavailable — drives the PDP fail-closed path."""

    def killswitch_level(self) -> str:
        raise PDP.PIPUnavailable("kill state unreadable (dependency down)")

    def is_principal_revoked(self, *a, **k) -> bool:
        raise PDP.PIPUnavailable("revocation unreadable")

    def ticket_proposer(self, ticket_id: str):
        raise PDP.PIPUnavailable("board unreachable")

    def ticket_state(self, ticket_id: str):
        raise PDP.PIPUnavailable("board unreachable")

    def host_in_window(self, host_id: str) -> bool:
        raise PDP.PIPUnavailable("cmdb unreachable")

    def budget_ok(self, sub: str, action_class: str) -> bool:
        raise PDP.PIPUnavailable("redis unreachable")


def _claims(aud: str, scopes, sub: str = "agent:patcher-07", **kw) -> AccessTokenClaims:
    return AccessTokenClaims(
        iss="https://auth.suite.local",
        sub=sub,
        aud=aud,
        scope=frozenset(scopes),
        iat=1_000,
        exp=1_120,
        jti="jti-" + sub,
        **kw,
    )


def _healthy_pip(**facts) -> PDP.LocalPIP:
    return PDP.LocalPIP(MemoryHotStore(), **facts)


# ===========================================================================
# 1. Cedar / compiled-in parity (§3.5 guarantee 3).
# ===========================================================================

class TestCedarParity(unittest.TestCase):
    def _cedar_pairs(self):
        cedar = Path(PDP.__file__).parent / "policies" / "sod.cedar"
        text = cedar.read_text(encoding="utf-8")
        # Strip // comments so no example scope in prose is mistaken for policy.
        code = "\n".join(line.split("//", 1)[0] for line in text.splitlines())
        pairs = set()
        for block in re.findall(r"forbid\s*\([^)]*\)\s*when\s*\{(.*?)\}", code, re.DOTALL):
            scopes = re.findall(r'contains\(\s*"([a-z]+:[a-z-]+)"\s*\)', block)
            self.assertEqual(
                len(scopes), 2,
                f"each forbid block must name exactly 2 scopes; got {scopes}",
            )
            pairs.add(frozenset(scopes))
        return frozenset(pairs)

    def test_cedar_pairs_equal_compiled_pairs(self):
        cedar_pairs = self._cedar_pairs()
        compiled = S.conflict_pairs()
        self.assertEqual(
            cedar_pairs, compiled,
            "sod.cedar forbid pairs must EQUAL auth.core.scopes.conflict_pairs() "
            "exactly — the declarative guardrail and the compiled-in ConflictSet "
            "are one invariant in two encodings",
        )

    def test_exactly_five_pairs(self):
        self.assertEqual(len(self._cedar_pairs()), 5)

    def test_allowed_governance_pair_absent(self):
        # The ○ pair {board:approve, cmdb:write-policy} must NOT be forbidden.
        self.assertNotIn(S.ALLOWED_GOVERNANCE_PAIR, self._cedar_pairs())


# ===========================================================================
# 2. `forbid` overrides `permit` — dual-holder denied for BOTH actions.
# ===========================================================================

class TestDualHolderForbidden(unittest.TestCase):
    def _dual_ctx(self):
        # A mis-issued / drifted principal that effectively spans approve-side
        # (board:approve) AND action-side (gateway:execute). Grant-time SSD makes
        # this impossible at rest; the PDP must still deny it at use.
        return PDP.PrincipalCtx(
            sub="agent:rogue",
            kind=KIND_AGENT,
            effective_scopes=frozenset({S.BOARD_APPROVE, S.GATEWAY_EXECUTE}),
            jti="jti-rogue",
            iat=1_050,
        )

    def test_cannot_be_permitted_approve_side(self):
        pdp = PDP.PDP(_healthy_pip())
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._dual_ctx(),
            action=STM.ACTION_BOARD_APPROVE,
            resource={"ticket_id": "T-1", "proposer_id": "agent:other"},
        ))
        self.assertFalse(d.permitted)
        self.assertEqual(d.reason, PDP.DUAL_HOLDER_FORBIDDEN)

    def test_cannot_be_permitted_action_side(self):
        pdp = PDP.PDP(_healthy_pip(ticket_states={"T-1": "approved"}, windows={"h1": True}))
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._dual_ctx(),
            action=STM.ACTION_GATEWAY_EXECUTE,
            resource={"ticket_id": "T-1", "host_id": "h1"},
        ))
        self.assertFalse(d.permitted)
        # forbid overrides permit: it is dual_holder, NOT insufficient_scope and
        # NOT a mere execute-policy deny.
        self.assertEqual(d.reason, PDP.DUAL_HOLDER_FORBIDDEN)

    def test_sod_deny_is_never_insufficient_scope(self):
        # §5.6 key rule: an SoD deny must not invite scope-widening.
        pdp = PDP.PDP(_healthy_pip())
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._dual_ctx(),
            action=STM.ACTION_BOARD_APPROVE,
            resource={"ticket_id": "T-1", "proposer_id": "agent:other"},
        ))
        self.assertNotEqual(d.reason, PDP.INSUFFICIENT_SCOPE)


# ===========================================================================
# 3. PEP — insufficient scope -> 403 insufficient_scope.
# ===========================================================================

class TestPEPInsufficientScope(unittest.TestCase):
    def test_valid_token_missing_scope_is_403(self):
        # Valid board token, but only board:read — calling approve needs board:approve.
        claims = _claims("board", {S.BOARD_READ}, sub="op:eide")
        pep = PEP.PEP("board", _StubValidator(claims))
        out = pep.authorize("Bearer good-token", "board.approve_ticket")
        self.assertEqual(out.route, PEP.ROUTE_DENY)
        self.assertEqual(out.http_status, 403)
        self.assertEqual(out.error, PEP.ERR_INSUFFICIENT_SCOPE)
        self.assertEqual(out.required_scope, S.BOARD_APPROVE)
        self.assertIn("insufficient_scope", out.www_authenticate)
        self.assertIn(S.BOARD_APPROVE, out.www_authenticate)

    def test_missing_token_is_401(self):
        pep = PEP.PEP("board", _StubValidator(_claims("board", {S.BOARD_READ})))
        out = pep.authorize(None, "board.list_tickets")
        self.assertEqual(out.http_status, 401)
        self.assertIn("Bearer", out.www_authenticate)
        self.assertIn("resource_metadata", out.www_authenticate)

    def test_invalid_token_is_401(self):
        pep = PEP.PEP("board", _StubValidator(_claims("board", {S.BOARD_READ})))
        out = pep.authorize("Bearer BAD", "board.list_tickets")
        self.assertEqual(out.http_status, 401)
        self.assertEqual(out.error, PEP.ERR_INVALID_TOKEN)

    def test_wrong_audience_is_401(self):
        # A token minted for gateway must be rejected at the board RS (aud==self).
        claims = _claims("gateway", {S.GATEWAY_EXECUTE})
        pep = PEP.PEP("board", _StubValidator(claims))
        out = pep.authorize("Bearer good", "board.list_tickets")
        self.assertEqual(out.http_status, 401)

    def test_fast_path_allow(self):
        claims = _claims("board", {S.BOARD_READ})
        pep = PEP.PEP("board", _StubValidator(claims))
        out = pep.authorize("Bearer good", "board.list_tickets")
        self.assertEqual(out.route, PEP.ROUTE_FAST_PATH)
        self.assertEqual(out.http_status, 200)

    def test_pdp_gated_tool_routes_to_pdp(self):
        claims = _claims("board", {S.BOARD_APPROVE}, sub="op:eide")
        pep = PEP.PEP("board", _StubValidator(claims))
        out = pep.authorize("Bearer good", "board.approve_ticket")
        self.assertEqual(out.route, PEP.ROUTE_PDP)
        self.assertEqual(out.action_id, STM.ACTION_BOARD_APPROVE)
        self.assertIsNone(out.http_status)

    def test_unclassified_tool_fails_closed(self):
        claims = _claims("board", {S.BOARD_READ})
        pep = PEP.PEP("board", _StubValidator(claims))
        out = pep.authorize("Bearer good", "board.mystery_tool")
        self.assertEqual(out.http_status, 403)
        self.assertEqual(out.error, PEP.ERR_UNKNOWN_TOOL)


# ===========================================================================
# 4. PDP FAILS CLOSED when context/PIP unavailable (decision #3).
# ===========================================================================

class TestPDPFailClosed(unittest.TestCase):
    def _executor_ctx(self):
        return PDP.PrincipalCtx(
            sub="agent:patcher-07",
            kind=KIND_AGENT,
            effective_scopes=frozenset({S.GATEWAY_EXECUTE}),
            jti="jti-1",
            iat=1_050,
        )

    def test_execute_fails_closed_when_pip_unavailable(self):
        pdp = PDP.PDP(_RaisingPIP())
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._executor_ctx(),
            action=STM.ACTION_GATEWAY_EXECUTE,
            resource={"ticket_id": "T-9", "host_id": "h1"},
        ))
        self.assertFalse(d.permitted)
        self.assertEqual(d.reason, PDP.FAIL_CLOSED)

    def test_approve_fails_closed_when_proposer_unknown(self):
        # No proposer on the resource AND the PIP cannot supply it -> cannot prove
        # sub != proposer -> fail closed (never permit an unverifiable approval).
        approver = PDP.PrincipalCtx(
            sub="op:eide", kind=KIND_HUMAN,
            effective_scopes=frozenset({S.BOARD_APPROVE}), jti="j", iat=1_050,
        )
        pdp = PDP.PDP(_healthy_pip())  # healthy kill/rev, but no proposer fact
        d = pdp.evaluate(PDP.PDPRequest(
            principal=approver, action=STM.ACTION_BOARD_APPROVE,
            resource={"ticket_id": "T-nostate"},
        ))
        self.assertFalse(d.permitted)
        self.assertEqual(d.reason, PDP.FAIL_CLOSED)

    def test_unknown_action_fails_closed(self):
        pdp = PDP.PDP(_healthy_pip())
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._executor_ctx(), action="Bogus::action", resource={},
        ))
        self.assertFalse(d.permitted)
        self.assertEqual(d.reason, PDP.FAIL_CLOSED)


# ===========================================================================
# 5. No-self-approval backstop (§3.5 finding 5c).
# ===========================================================================

class TestNoSelfApproval(unittest.TestCase):
    def _approver(self, sub):
        return PDP.PrincipalCtx(
            sub=sub, kind=KIND_HUMAN,
            effective_scopes=frozenset({S.BOARD_APPROVE}), jti="j-" + sub, iat=1_050,
        )

    def test_self_approval_denied(self):
        pdp = PDP.PDP(_healthy_pip())
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._approver("op:eide"),
            action=STM.ACTION_BOARD_APPROVE,
            resource={"ticket_id": "T-5", "proposer_id": "op:eide"},  # sub == proposer
        ))
        self.assertFalse(d.permitted)
        self.assertEqual(d.reason, PDP.SELF_APPROVAL_FORBIDDEN)

    def test_self_approval_via_pip_proposer_denied(self):
        # proposer comes from the Board PIP, not the resource — still caught.
        pdp = PDP.PDP(_healthy_pip(proposers={"T-6": "agent:patcher-07"}))
        d = pdp.evaluate(PDP.PDPRequest(
            principal=PDP.PrincipalCtx(
                sub="agent:patcher-07", kind=KIND_HUMAN,
                effective_scopes=frozenset({S.BOARD_APPROVE}), jti="j", iat=1_050,
            ),
            action=STM.ACTION_BOARD_APPROVE,
            resource={"ticket_id": "T-6"},
        ))
        self.assertFalse(d.permitted)
        self.assertEqual(d.reason, PDP.SELF_APPROVAL_FORBIDDEN)

    def test_distinct_approver_permitted(self):
        pdp = PDP.PDP(_healthy_pip())
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._approver("op:eide"),
            action=STM.ACTION_BOARD_APPROVE,
            resource={"ticket_id": "T-5", "proposer_id": "agent:patcher-07"},
        ))
        self.assertTrue(d.permitted)
        self.assertEqual(d.reason, PDP.PERMIT)
        names = {o.name for o in d.obligations}
        self.assertIn("record_audit", names)
        self.assertIn("revocation_fresh_at", names)


# ===========================================================================
# 6. Positive destructive path + revocation/kill live checks.
# ===========================================================================

class TestExecutePath(unittest.TestCase):
    def _executor(self):
        return PDP.PrincipalCtx(
            sub="agent:patcher-07", kind=KIND_AGENT,
            effective_scopes=frozenset({S.GATEWAY_EXECUTE}),
            jti="jti-exec", client_id="agent:patcher-07", iat=1_050,
        )

    def test_execute_permit_with_full_obligations(self):
        pip = _healthy_pip(ticket_states={"T-1": "approved"}, windows={"h1": True})
        pdp = PDP.PDP(pip)
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._executor(),
            action=STM.ACTION_GATEWAY_EXECUTE,
            resource={"ticket_id": "T-1", "host_id": "h1"},
            context={"idempotency_key": "idem-1"},
        ))
        self.assertTrue(d.permitted)
        names = {o.name for o in d.obligations}
        for required in ("admission_claim", "acquire_host_mutex", "fencing_token",
                         "consume_approval", "revocation_fresh_at", "enforce_idempotency"):
            self.assertIn(required, names)

    def test_execute_denied_when_approval_consumed(self):
        pip = _healthy_pip(ticket_states={"T-1": "done"}, windows={"h1": True})
        pdp = PDP.PDP(pip)
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._executor(),
            action=STM.ACTION_GATEWAY_EXECUTE,
            resource={"ticket_id": "T-1", "host_id": "h1"},
        ))
        self.assertEqual(d.reason, PDP.APPROVAL_CONSUMED)

    def test_execute_denied_when_revoked(self):
        hot = MemoryHotStore()
        hot.set_revoked_before("agent:patcher-07", 2_000)  # watermark > token iat
        pip = PDP.LocalPIP(hot, ticket_states={"T-1": "approved"}, windows={"h1": True})
        pdp = PDP.PDP(pip)
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._executor(),
            action=STM.ACTION_GATEWAY_EXECUTE,
            resource={"ticket_id": "T-1", "host_id": "h1"},
        ))
        self.assertEqual(d.reason, PDP.REVOKED)

    def test_execute_denied_under_g1_freeze(self):
        hot = MemoryHotStore()
        hot.set_killswitch("G1", 1)
        pip = PDP.LocalPIP(hot, ticket_states={"T-1": "approved"}, windows={"h1": True})
        pdp = PDP.PDP(pip)
        d = pdp.evaluate(PDP.PDPRequest(
            principal=self._executor(),
            action=STM.ACTION_GATEWAY_EXECUTE,
            resource={"ticket_id": "T-1", "host_id": "h1"},
        ))
        self.assertEqual(d.reason, PDP.KILL_SWITCH_ENGAGED)

    def test_agent_cannot_redeem_vault(self):
        # vault:read-credential is the svc:gateway machine scope only; an agent
        # principal presenting it (mis-grant) is denied wrong_principal.
        pip = _healthy_pip(ticket_states={"T-1": "approved"})
        pdp = PDP.PDP(pip)
        agent = PDP.PrincipalCtx(
            sub="agent:patcher-07", kind=KIND_AGENT,
            effective_scopes=frozenset({S.VAULT_READ_CREDENTIAL}), jti="j", iat=1_050,
        )
        d = pdp.evaluate(PDP.PDPRequest(
            principal=agent, action=STM.ACTION_VAULT_REDEEM,
            resource={"ticket_id": "T-1"},
        ))
        self.assertEqual(d.reason, PDP.WRONG_PRINCIPAL)

    def test_gateway_service_can_redeem(self):
        pip = _healthy_pip(ticket_states={"T-1": "executing"})
        pdp = PDP.PDP(pip)
        svc = PDP.PrincipalCtx(
            sub="svc:gateway", kind=KIND_SERVICE,
            effective_scopes=frozenset({S.VAULT_READ_CREDENTIAL}), jti="j", iat=1_050,
        )
        d = pdp.evaluate(PDP.PDPRequest(
            principal=svc, action=STM.ACTION_VAULT_REDEEM, resource={"ticket_id": "T-1"},
        ))
        self.assertTrue(d.permitted)

    def test_agent_cannot_write_cmdb_policy(self):
        # cmdb:write-policy is operator-identity only (PLAN §3.5). The PDP kind
        # backstop DENIES a mis-granted agent even if it carried the scope, mirroring
        # _decide_redeem / _decide_kill_switch (review finding 2 backstop).
        pdp = PDP.PDP(_healthy_pip())
        agent = PDP.PrincipalCtx(
            sub="agent:patcher-07", kind=KIND_AGENT,
            effective_scopes=frozenset({S.CMDB_WRITE_POLICY}), jti="j", iat=1_050,
        )
        d = pdp.evaluate(PDP.PDPRequest(
            principal=agent, action=STM.ACTION_CMDB_WRITE_POLICY, resource={},
        ))
        self.assertFalse(d.permitted)
        self.assertEqual(d.reason, PDP.WRONG_PRINCIPAL)

    def test_operator_can_write_cmdb_policy(self):
        pdp = PDP.PDP(_healthy_pip())
        op = PDP.PrincipalCtx(
            sub="op:eide", kind=KIND_HUMAN,
            effective_scopes=frozenset({S.CMDB_WRITE_POLICY}), jti="j", iat=1_050,
        )
        d = pdp.evaluate(PDP.PDPRequest(
            principal=op, action=STM.ACTION_CMDB_WRITE_POLICY, resource={},
        ))
        self.assertTrue(d.permitted)


# ===========================================================================
# 7. scope_tool_map sanity — every rule references the frozen taxonomy.
# ===========================================================================

class TestScopeToolMap(unittest.TestCase):
    def test_every_required_scope_is_valid(self):
        for tool, rule in STM.SCOPE_TOOL_MAP.items():
            for sc in rule.required_scopes:
                self.assertTrue(S.is_valid_scope(sc), f"{tool} -> unknown scope {sc}")

    def test_holder_tools_are_pdp_gated(self):
        # Every tool whose required scope is a HOLDER scope must be PDP-gated.
        for tool, rule in STM.SCOPE_TOOL_MAP.items():
            if rule.required_scopes & S.HOLDER_SCOPES:
                self.assertTrue(rule.pdp_gated, f"{tool} carries a holder scope but is not PDP-gated")

    def test_gated_tools_have_action_id(self):
        for tool, rule in STM.SCOPE_TOOL_MAP.items():
            if rule.pdp_gated:
                self.assertIsNotNone(rule.action_id)
                self.assertIs(STM.rule_for_action(rule.action_id), rule)


if __name__ == "__main__":
    unittest.main()
