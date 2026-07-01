"""auth.tests.test_mcp — the THIN agent MCP surface (PLAN §9.2, Surface B).

Proves the self-only / read-only guarantees that make the surface Stage-7
"cannot escalate / cannot assume another principal":

  1. whoami returns ONLY the caller's own sub/roles/effective-scopes/requestable-
     audiences/budget-headroom — never another principal;
  2. authorize_check dry-runs (self only), forces the principal to the caller, and
     never mints/grants; deny reasons for insufficient_scope / revoked / killed /
     unknown_action;
  3. introspect_self introspects only the caller's OWN token (active/expired/revoked)
     and refuses to target another principal's token;
  4. budget_self is READ-ONLY (mutates nothing) and reflects policy + live usage;
  5. every attempt to pass a DIFFERENT principal is refused (forced to caller);
  6. no tool can escalate scope or mutate identity — proven by running all four
     tools through a Store guard that raises if ANY writer method is touched, and
     by asserting the effective scope closure is unchanged;
  7. the surface is audience-bound to `auth` and requires the `auth:self` scope;
  8. there is NO mint/grant/revoke/budget-edit tool to dispatch to.

Pure stdlib; runs GREEN with `python -m unittest`.
"""
from __future__ import annotations

import json
import time
import unittest

from auth.core import scopes as S
from auth.core.errors import AuthError
from auth.core.principals import (
    AGENT_CLASS_EXECUTOR,
    KIND_AGENT,
    STORE_TPM,
    AgentKey,
    BudgetPolicy,
    ConcurrencyLimit,
    LifetimeLimit,
    Principal,
    RateLimit,
    Role,
)
from auth.core.tokens_model import (
    PRINCIPAL_TYPE_AGENT,
    AccessTokenClaims,
    Confirmation,
)
from auth.store.memory_hot import MemoryHotStore
from auth.store.sqlite_store import SQLiteStore
from auth.mcp import (
    AUTH_SELF_SCOPE,
    AUTH_SURFACE_AUDIENCE,
    TOOL_NAMES,
    AuthMCPSurface,
    CallerIdentity,
    CrossPrincipalDenied,
    NotSelfScoped,
)

CALLER_SUB = "agent:patcher-07"
OTHER_SUB = "agent:other-08"

_AGENT_BASE_SCOPES = frozenset(
    {
        S.AUTH_AUTHENTICATE,
        S.BOARD_READ,
        S.BOARD_CREATE,
        S.BOARD_PROPOSE,
        S.NOTES_READ,
        S.NOTES_WRITE,
        S.MC_REPORT,
        S.CMDB_READ_POLICY,
        S.VAULT_REFERENCE,
        S.DRIVE_READ,
        S.CHAT_POST,
        S.PDF_RENDER,
    }
)


def _tpm_key(sub: str, kid: str) -> AgentKey:
    return AgentKey(
        sub=sub,
        kid=kid,
        public_jwk={"kty": "OKP", "crv": "Ed25519", "x": "AAAA"},
        alg="EdDSA",
        storage_tier=STORE_TPM,
        non_exportable=True,
        status="active",
        cnf_jkt="jkt-" + sub,
        proof_key_co_located=True,
    )


def build_store() -> SQLiteStore:
    """A store with an executor agent (holds gateway:execute) + a second agent."""
    st = SQLiteStore(":memory:")

    # Roles.
    st.put_role(
        Role(
            role_id="role:agent-base",
            direct_scopes=_AGENT_BASE_SCOPES,
            kind_gate=frozenset({KIND_AGENT}),
        )
    )
    st.put_role(
        Role(
            role_id="role:agent-executor",
            direct_scopes=frozenset({S.GATEWAY_EXECUTE}),
            kind_gate=frozenset({KIND_AGENT}),
            agent_class_gate=frozenset({AGENT_CLASS_EXECUTOR}),
        )
    )
    st.add_role_hierarchy_edge("role:agent-executor", "role:agent-base")

    # Caller principal — an executor agent with a non-exportable key.
    st.put_principal(
        Principal(
            sub=CALLER_SUB,
            kind=KIND_AGENT,
            agent_class=AGENT_CLASS_EXECUTOR,
            client_id=CALLER_SUB,
            display_name="Patcher 07",
        )
    )
    st.register_agent_key(_tpm_key(CALLER_SUB, "kid-agent-1"))
    st.assign_role(CALLER_SUB, "role:agent-base")
    st.assign_role(CALLER_SUB, "role:agent-executor")  # attestation-checked

    # A second, unrelated agent — used to prove cross-principal isolation.
    st.put_principal(
        Principal(
            sub=OTHER_SUB,
            kind=KIND_AGENT,
            agent_class=AGENT_CLASS_EXECUTOR,
            client_id=OTHER_SUB,
            display_name="Other 08",
        )
    )
    st.assign_role(OTHER_SUB, "role:agent-base")

    # Budgets: a role default + a more-restrictive principal override.
    st.put_budget_policy(
        BudgetPolicy(
            owner="role:agent-base",
            concurrency=ConcurrencyLimit(global_max=5),
        )
    )
    st.put_budget_policy(
        BudgetPolicy(
            owner=CALLER_SUB,
            rate=RateLimit(emission_interval_ms=1000, burst_tau_ms=5000),
            concurrency=ConcurrencyLimit(global_max=3, per_class_max={"destructive-exec": 1}),
            lifetime=LifetimeLimit(max_lifetime_tool_calls=100),
            cooldowns_ms={"destructive-exec": 30000},
        )
    )
    return st


def make_caller(**overrides) -> CallerIdentity:
    now = int(time.time())
    base = dict(
        sub=CALLER_SUB,
        kind=KIND_AGENT,
        aud=AUTH_SURFACE_AUDIENCE,
        scopes=frozenset({AUTH_SELF_SCOPE, S.AUTH_AUTHENTICATE}),
        jti="jti-caller-1",
        client_id=CALLER_SUB,
        iat=now - 10,
        exp=now + 110,
        kid="kid-agent-1",
        cnf_bound=True,
    )
    base.update(overrides)
    return CallerIdentity(**base)


class _ReadOnlyStoreGuard:
    """Wraps a Store; raises if ANY writer method is invoked.

    Proves the MCP surface never mutates identity/role/budget state — the
    structural "no agent tool creates/disables/grants/revokes/edits" guarantee.
    """

    _WRITERS = frozenset(
        {
            "put_principal",
            "set_principal_status",
            "put_role",
            "grant_scope_to_role",
            "add_role_hierarchy_edge",
            "assign_role",
            "revoke_role",
            "register_agent_key",
            "set_agent_key_status",
            "put_budget_policy",
            "append_audit",
        }
    )

    def __init__(self, inner) -> None:
        object.__setattr__(self, "_inner", inner)

    def __getattr__(self, name):
        if name in _ReadOnlyStoreGuard._WRITERS:
            def _blocked(*a, **k):
                raise AssertionError(
                    f"read/self-only MCP surface called Store writer {name!r} — "
                    f"a tool mutated identity state (forbidden by §9.2)"
                )
            return _blocked
        return getattr(object.__getattribute__(self, "_inner"), name)


class _ReadOnlyHotGuard:
    """Wraps a HotStore; raises if any MUTATING method is invoked."""

    _WRITERS = frozenset(
        {
            "deny_jti",
            "set_revoked_before",
            "disable_client",
            "retire_kid",
            "set_killswitch",
            "incr_concurrency",
            "decr_concurrency",
            "set_counter",
            "publish_revocation",
        }
    )

    def __init__(self, inner) -> None:
        object.__setattr__(self, "_inner", inner)

    def __getattr__(self, name):
        if name in _ReadOnlyHotGuard._WRITERS:
            def _blocked(*a, **k):
                raise AssertionError(
                    f"read/self-only MCP surface called HotStore mutator {name!r}"
                )
            return _blocked
        return getattr(object.__getattribute__(self, "_inner"), name)


class MCPTestBase(unittest.TestCase):
    def setUp(self) -> None:
        self.store = build_store()
        self.hot = MemoryHotStore()
        self.surface = AuthMCPSurface(self.store, self.hot)
        self.caller = make_caller()

    def tearDown(self) -> None:
        self.store.close()


# ---------------------------------------------------------------------------
# whoami
# ---------------------------------------------------------------------------
class TestWhoami(MCPTestBase):
    def test_returns_own_identity_only(self):
        out = self.surface.whoami(self.caller)
        self.assertEqual(out["sub"], CALLER_SUB)
        self.assertEqual(out["principal_type"], PRINCIPAL_TYPE_AGENT)
        self.assertEqual(out["kind"], KIND_AGENT)
        self.assertIn("role:agent-executor", out["roles"])
        self.assertIn(S.GATEWAY_EXECUTE, out["effective_scopes"])
        self.assertIn(S.BOARD_READ, out["effective_scopes"])
        self.assertEqual(out["holder_scopes"], [S.GATEWAY_EXECUTE])
        self.assertTrue(out["self_only"])

    def test_requestable_audiences_are_mechanical(self):
        out = self.surface.whoami(self.caller)
        expected = sorted({S.audience_of(s) for s in self.store.effective_scopes(CALLER_SUB)})
        self.assertEqual(out["requestable_audiences"], expected)
        self.assertIn("gateway", out["requestable_audiences"])

    def test_never_leaks_another_principal(self):
        blob = json.dumps(self.surface.whoami(self.caller))
        self.assertNotIn(OTHER_SUB, blob)

    def test_includes_budget_headroom(self):
        out = self.surface.whoami(self.caller)
        hr = out["budget_headroom"]
        # Most-restrictive merge picks the principal override cap of 3.
        self.assertEqual(hr["concurrency_cap"], 3)
        self.assertEqual(hr["lifetime_cap"], 100)


# ---------------------------------------------------------------------------
# authorize_check
# ---------------------------------------------------------------------------
class TestAuthorizeCheck(MCPTestBase):
    def test_permit_held_scope(self):
        out = self.surface.authorize_check(self.caller, {"action": S.BOARD_PROPOSE})
        self.assertEqual(out["decision"], "permit")
        self.assertEqual(out["reason"], "permit")
        self.assertEqual(out["principal"], CALLER_SUB)
        self.assertFalse(out["authoritative"])  # dry-run only

    def test_permit_holder_scope_executor_holds(self):
        out = self.surface.authorize_check(self.caller, {"action": S.GATEWAY_EXECUTE})
        self.assertEqual(out["decision"], "permit")

    def test_deny_scope_not_held(self):
        out = self.surface.authorize_check(self.caller, {"action": S.BOARD_APPROVE})
        self.assertEqual(out["decision"], "deny")
        self.assertEqual(out["reason"], "insufficient_scope")

    def test_unknown_action(self):
        out = self.surface.authorize_check(self.caller, {"action": "not-a-scope"})
        self.assertEqual(out["decision"], "deny")
        self.assertEqual(out["reason"], "unknown_action")

    def test_missing_action(self):
        out = self.surface.authorize_check(self.caller, {})
        self.assertEqual(out["reason"], "unknown_action")

    def test_deny_when_revoked(self):
        self.hot.deny_jti(self.caller.jti, self.caller.exp)
        out = self.surface.authorize_check(self.caller, {"action": S.BOARD_PROPOSE})
        self.assertEqual(out["decision"], "deny")
        self.assertEqual(out["reason"], "revoked")

    def test_deny_on_global_kill(self):
        self.hot.set_killswitch("G2", 1)
        out = self.surface.authorize_check(self.caller, {"action": S.BOARD_READ})
        self.assertEqual(out["reason"], "killed")

    def test_g1_freezes_holder_but_not_benign(self):
        self.hot.set_killswitch("G1", 1)
        held_holder = self.surface.authorize_check(self.caller, {"action": S.GATEWAY_EXECUTE})
        benign = self.surface.authorize_check(self.caller, {"action": S.BOARD_READ})
        self.assertEqual(held_holder["reason"], "killed")
        self.assertEqual(benign["decision"], "permit")

    def test_cannot_target_other_principal(self):
        with self.assertRaises(CrossPrincipalDenied):
            self.surface.authorize_check(
                self.caller, {"action": S.BOARD_PROPOSE, "principal": OTHER_SUB}
            )

    def test_resource_is_echoed(self):
        out = self.surface.authorize_check(
            self.caller, {"action": S.BOARD_PROPOSE, "resource": "ticket:42"}
        )
        self.assertEqual(out["resource"], "ticket:42")


# ---------------------------------------------------------------------------
# introspect_self
# ---------------------------------------------------------------------------
class TestIntrospectSelf(MCPTestBase):
    def test_active_token(self):
        out = self.surface.introspect_self(self.caller)
        self.assertTrue(out["active"])
        self.assertEqual(out["sub"], CALLER_SUB)
        self.assertEqual(out["reason"], "active")
        self.assertTrue(out["cnf_bound"])

    def test_expired_token(self):
        now = int(time.time())
        caller = make_caller(iat=now - 300, exp=now - 60)
        out = self.surface.introspect_self(caller)
        self.assertFalse(out["active"])
        self.assertEqual(out["reason"], "expired")

    def test_revoked_by_sub_watermark(self):
        # revoked_before AFTER the token's iat -> token denied.
        self.hot.set_revoked_before(CALLER_SUB, self.caller.iat + 5)
        out = self.surface.introspect_self(self.caller)
        self.assertFalse(out["active"])
        self.assertEqual(out["reason"], "revoked_sub")

    def test_revoked_by_jti(self):
        self.hot.deny_jti(self.caller.jti, self.caller.exp)
        out = self.surface.introspect_self(self.caller)
        self.assertFalse(out["active"])
        self.assertEqual(out["reason"], "revoked_jti")

    def test_revoked_by_client_disable(self):
        self.hot.disable_client(CALLER_SUB)
        out = self.surface.introspect_self(self.caller)
        self.assertFalse(out["active"])
        self.assertEqual(out["reason"], "revoked_client")

    def test_kid_retired(self):
        self.hot.retire_kid("kid-agent-1")
        out = self.surface.introspect_self(self.caller)
        self.assertFalse(out["active"])
        self.assertEqual(out["reason"], "revoked_kid")

    def test_surfaces_kill_posture(self):
        self.hot.set_killswitch("G1", 7)
        out = self.surface.introspect_self(self.caller)
        self.assertTrue(out["frozen"])
        self.assertEqual(out["kill_level"], "G1")

    def test_cannot_introspect_another_principals_token(self):
        with self.assertRaises(CrossPrincipalDenied):
            self.surface.introspect_self(self.caller, {"token_sub": OTHER_SUB})
        with self.assertRaises(CrossPrincipalDenied):
            self.surface.introspect_self(self.caller, {"sub": OTHER_SUB})


# ---------------------------------------------------------------------------
# budget_self
# ---------------------------------------------------------------------------
class TestBudgetSelf(MCPTestBase):
    def test_reflects_effective_policy(self):
        out = self.surface.budget_self(self.caller)
        self.assertEqual(out["principal"], CALLER_SUB)
        self.assertTrue(out["read_only"])
        # Most-restrictive merge: principal cap 3 beats role default 5.
        self.assertEqual(out["policy"]["concurrency"]["global_max"], 3)
        self.assertEqual(out["policy"]["lifetime"]["max_lifetime_tool_calls"], 100)

    def test_reflects_live_usage_and_headroom(self):
        # Simulate 2 in-flight + 40 lifetime calls via the documented key families.
        self.hot.set_counter(f"budget:conc:{CALLER_SUB}", 2)
        self.hot.set_counter(f"budget:life:{CALLER_SUB}", 40)
        out = self.surface.budget_self(self.caller)
        self.assertEqual(out["usage"]["concurrency_in_flight"], 2)
        self.assertEqual(out["headroom"]["concurrency"], 1)   # 3 - 2
        self.assertEqual(out["headroom"]["lifetime_calls"], 60)  # 100 - 40

    def test_is_read_only(self):
        # Run through guards that raise on any mutation; must not raise.
        ro_surface = AuthMCPSurface(_ReadOnlyStoreGuard(self.store), _ReadOnlyHotGuard(self.hot))
        before = self.hot.get_counter(f"budget:conc:{CALLER_SUB}")
        out = ro_surface.budget_self(self.caller)
        after = self.hot.get_counter(f"budget:conc:{CALLER_SUB}")
        self.assertEqual(before, after)
        self.assertTrue(out["read_only"])

    def test_cannot_target_other_principal(self):
        with self.assertRaises(CrossPrincipalDenied):
            self.surface.budget_self(self.caller, {"principal": OTHER_SUB})


# ---------------------------------------------------------------------------
# Cross-principal + escalation guarantees (Stage-7 shaped)
# ---------------------------------------------------------------------------
class TestSelfOnlyAndNoEscalation(MCPTestBase):
    def test_every_tool_forces_principal_to_caller(self):
        for key in ("sub", "principal", "target", "target_sub", "on_behalf_of", "for_sub"):
            with self.assertRaises(CrossPrincipalDenied):
                self.surface.whoami(self.caller, {key: OTHER_SUB})
            with self.assertRaises(CrossPrincipalDenied):
                self.surface.budget_self(self.caller, {key: OTHER_SUB})
            with self.assertRaises(CrossPrincipalDenied):
                self.surface.introspect_self(self.caller, {key: OTHER_SUB})
            with self.assertRaises(CrossPrincipalDenied):
                self.surface.authorize_check(
                    self.caller, {"action": S.BOARD_READ, key: OTHER_SUB}
                )

    def test_matching_self_principal_is_allowed(self):
        # Passing your OWN sub explicitly is fine (forced == provided).
        out = self.surface.whoami(self.caller, {"sub": CALLER_SUB})
        self.assertEqual(out["sub"], CALLER_SUB)

    def test_no_tool_mutates_store_or_scope(self):
        ro_store = _ReadOnlyStoreGuard(self.store)
        ro_hot = _ReadOnlyHotGuard(self.hot)
        ro_surface = AuthMCPSurface(ro_store, ro_hot)
        before = self.store.effective_scopes(CALLER_SUB)
        # Exercise all four tools through the guards — any writer call raises.
        ro_surface.whoami(self.caller)
        ro_surface.authorize_check(self.caller, {"action": S.BOARD_PROPOSE})
        ro_surface.introspect_self(self.caller)
        ro_surface.budget_self(self.caller)
        after = self.store.effective_scopes(CALLER_SUB)
        self.assertEqual(before, after)

    def test_client_id_arg_must_be_own(self):
        with self.assertRaises(CrossPrincipalDenied):
            self.surface.whoami(self.caller, {"client_id": "agent:other-08"})


# ---------------------------------------------------------------------------
# Surface gating + dispatch
# ---------------------------------------------------------------------------
class TestSurfaceGating(MCPTestBase):
    def test_requires_auth_audience(self):
        wrong_aud = make_caller(aud="board")
        with self.assertRaises(NotSelfScoped):
            self.surface.call("whoami", wrong_aud)

    def test_requires_auth_self_scope(self):
        no_self = make_caller(scopes=frozenset({S.AUTH_AUTHENTICATE}))
        with self.assertRaises(NotSelfScoped):
            self.surface.call("whoami", no_self)

    def test_dispatch_all_four_tools(self):
        self.assertEqual(set(self.surface._tools), set(TOOL_NAMES))
        self.assertEqual(self.surface.call("whoami", self.caller)["sub"], CALLER_SUB)
        self.assertIn(
            self.surface.call("authorize_check", self.caller, {"action": S.BOARD_READ})["decision"],
            ("permit", "deny"),
        )
        self.assertTrue(self.surface.call("introspect_self", self.caller)["active"])
        self.assertTrue(self.surface.call("budget_self", self.caller)["read_only"])

    def test_no_mint_or_grant_tool_exists(self):
        for forbidden in ("mint", "issue_token", "grant_role", "revoke_role", "set_budget", "create_principal"):
            self.assertNotIn(forbidden, self.surface._tools)
            with self.assertRaises(AuthError):
                self.surface.call(forbidden, self.caller)


# ---------------------------------------------------------------------------
# CallerIdentity adapter + immutability
# ---------------------------------------------------------------------------
class TestCallerIdentity(unittest.TestCase):
    def test_from_access_token(self):
        now = int(time.time())
        claims = AccessTokenClaims(
            iss="https://auth.suite",
            sub=CALLER_SUB,
            aud=AUTH_SURFACE_AUDIENCE,
            scope=frozenset({AUTH_SELF_SCOPE, S.AUTH_AUTHENTICATE}),
            iat=now - 5,
            exp=now + 115,
            jti="jti-x",
            client_id=CALLER_SUB,
            cnf=Confirmation(jkt="thumb"),
            kill_epoch=3,
            kill_level="G0",
        )
        caller = CallerIdentity.from_access_token(claims, kind=KIND_AGENT, kid="kid-9")
        self.assertEqual(caller.sub, CALLER_SUB)
        self.assertEqual(caller.aud, AUTH_SURFACE_AUDIENCE)
        self.assertIn(AUTH_SELF_SCOPE, caller.scopes)
        self.assertTrue(caller.cnf_bound)
        self.assertEqual(caller.kid, "kid-9")
        self.assertEqual(caller.principal_type(), PRINCIPAL_TYPE_AGENT)

    def test_identity_is_immutable(self):
        caller = make_caller()
        with self.assertRaises(Exception):
            caller.sub = OTHER_SUB  # frozen dataclass
        with self.assertRaises(Exception):
            caller.scopes = frozenset({"board:approve"})  # cannot widen


if __name__ == "__main__":
    unittest.main()
