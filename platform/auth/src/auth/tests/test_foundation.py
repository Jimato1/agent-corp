"""auth.tests.test_foundation — Phase-1 FOUNDATION smoke tests.

Proves the frozen contracts the parallel Stage-4 builders depend on actually
hold, and that the security-critical core logic runs GREEN here:

  1. the SoD ConflictSet is IMMUTABLE (mutation raises) — decision #5 / finding 4a;
  2. the five holder ConflictPairs are EXACTLY {approve-side x action-side} plus
     the action-side internal pair, and exclude the allowed governance pair;
  3. the SQLite Store round-trips a Principal;
  4. an attempt to grant a conflicting holder pair is REJECTED atomically (§3.5),
     including the downward-transitive hierarchy-edge staging attack;
  5. the HMAC test-signer signs + verifies + detects tamper;
  6. Principal.sub/kind/agent_class are immutable after creation (finding 4f);
  7. the EdDSA production signer either round-trips (if 'cryptography' present) or
     raises a LOUD error (never a fake sign) — CANNOT-VERIFY-HERE otherwise.
"""
from __future__ import annotations

import itertools
import time
import unittest

from auth.core import scopes as S
from auth.core.errors import (
    AttestationRequired,
    ConflictSetImmutableError,
    ImmutableFieldError,
    KindGateViolation,
    SoDViolation,
)
from auth.core.principals import (
    AGENT_CLASS_EXECUTOR,
    AGENT_CLASS_PLANNER,
    KIND_AGENT,
    KIND_HUMAN,
    KIND_SERVICE,
    STORE_TPM,
    AgentKey,
    Principal,
    Role,
)
from auth.core.interfaces import HotStore, Signer, Store
from auth.crypto.signer_hmac import HMACSigner
from auth.crypto import signer_eddsa
from auth.store.memory_hot import MemoryHotStore
from auth.store.sqlite_store import SQLiteStore


class TestConflictSetImmutable(unittest.TestCase):
    def test_cannot_set_attribute(self):
        with self.assertRaises(ConflictSetImmutableError):
            S.CONFLICT_SET.some_new_attr = "x"  # type: ignore[attr-defined]

    def test_cannot_overwrite_pairs(self):
        with self.assertRaises(ConflictSetImmutableError):
            S.CONFLICT_SET._pairs = frozenset()  # type: ignore[attr-defined]

    def test_cannot_delete_attribute(self):
        with self.assertRaises(ConflictSetImmutableError):
            del S.CONFLICT_SET.name  # type: ignore[misc]

    def test_pairs_are_frozenset_of_frozensets(self):
        pairs = S.conflict_pairs()
        self.assertIsInstance(pairs, frozenset)
        for p in pairs:
            self.assertIsInstance(p, frozenset)
        # The returned pairs collection cannot be mutated either.
        with self.assertRaises(AttributeError):
            pairs.add(frozenset({"x", "y"}))  # type: ignore[attr-defined]


class TestConflictPairs(unittest.TestCase):
    def test_exactly_five_pairs(self):
        self.assertEqual(len(S.conflict_pairs()), 5)
        self.assertEqual(S.CONFLICT_SET.cardinality(), 1)

    def test_four_holder_scopes(self):
        self.assertEqual(
            S.HOLDER_SCOPES,
            frozenset(
                {
                    S.BOARD_APPROVE,
                    S.CMDB_WRITE_POLICY,
                    S.GATEWAY_EXECUTE,
                    S.VAULT_READ_CREDENTIAL,
                }
            ),
        )
        for s in S.HOLDER_SCOPES:
            self.assertTrue(S.is_holder(s))
            self.assertTrue(S.SCOPES[s].is_holder)
        # Exactly the four holders are flagged is_holder across the whole taxonomy.
        flagged = {sid for sid, sd in S.SCOPES.items() if sd.is_holder}
        self.assertEqual(flagged, set(S.HOLDER_SCOPES))

    def test_pairs_are_all_holder_combos_except_governance(self):
        all_combos = {frozenset(c) for c in itertools.combinations(sorted(S.HOLDER_SCOPES), 2)}
        expected = all_combos - {S.ALLOWED_GOVERNANCE_PAIR}
        self.assertEqual(S.conflict_pairs(), expected)

    def test_every_cross_side_pair_is_a_conflict(self):
        # {approve-side} x {action-side} == 4 cross pairs, all conflicts.
        cross = 0
        for a in S.APPROVE_SIDE:
            for x in S.ACTION_SIDE:
                self.assertIn(frozenset({a, x}), S.conflict_pairs())
                self.assertTrue(S.CONFLICT_SET.is_conflict(a, x))
                cross += 1
        self.assertEqual(cross, 4)
        # Plus the action-side internal pair (gateway:execute x vault:read-credential).
        self.assertIn(
            frozenset({S.GATEWAY_EXECUTE, S.VAULT_READ_CREDENTIAL}), S.conflict_pairs()
        )

    def test_governance_pair_is_allowed_not_a_conflict(self):
        self.assertNotIn(S.ALLOWED_GOVERNANCE_PAIR, S.conflict_pairs())
        self.assertFalse(S.CONFLICT_SET.is_conflict(S.BOARD_APPROVE, S.CMDB_WRITE_POLICY))
        self.assertIsNone(S.find_holder_conflict({S.BOARD_APPROVE, S.CMDB_WRITE_POLICY}))

    def test_find_holder_conflict(self):
        self.assertEqual(
            S.find_holder_conflict({S.BOARD_APPROVE, S.GATEWAY_EXECUTE, S.BOARD_READ}),
            frozenset({S.BOARD_APPROVE, S.GATEWAY_EXECUTE}),
        )
        self.assertIsNone(S.find_holder_conflict({S.BOARD_READ, S.NOTES_WRITE}))


class TestProtocolConformance(unittest.TestCase):
    def test_impls_match_protocols(self):
        self.assertIsInstance(SQLiteStore(), Store)
        self.assertIsInstance(MemoryHotStore(), HotStore)
        self.assertIsInstance(HMACSigner(b"0" * 32, "kid-test"), Signer)


class TestPrincipalRoundTrip(unittest.TestCase):
    def test_store_roundtrips_principal(self):
        store = SQLiteStore()
        p = Principal(sub="agent:patcher-07", kind=KIND_AGENT, agent_class=AGENT_CLASS_EXECUTOR)
        store.put_principal(p)
        got = store.get_principal("agent:patcher-07")
        self.assertIsNotNone(got)
        self.assertEqual(got.sub, "agent:patcher-07")
        self.assertEqual(got.kind, KIND_AGENT)
        self.assertEqual(got.agent_class, AGENT_CLASS_EXECUTOR)
        self.assertEqual(got.status, "active")

    def test_human_principal_has_no_agent_class(self):
        store = SQLiteStore()
        store.put_principal(Principal(sub="op:eide", kind=KIND_HUMAN))
        got = store.get_principal("op:eide")
        self.assertIsNone(got.agent_class)


class TestPrincipalImmutability(unittest.TestCase):
    def test_sub_kind_agent_class_immutable(self):
        p = Principal(sub="agent:x", kind=KIND_AGENT, agent_class=AGENT_CLASS_PLANNER)
        with self.assertRaises(ImmutableFieldError):
            p.kind = KIND_HUMAN
        with self.assertRaises(ImmutableFieldError):
            p.sub = "agent:y"
        with self.assertRaises(ImmutableFieldError):
            p.agent_class = AGENT_CLASS_EXECUTOR
        # status IS mutable (kill lever).
        p.status = "disabled"
        self.assertEqual(p.status, "disabled")

    def test_break_glass_forbids_online_token(self):
        from auth.core.principals import KIND_BREAK_GLASS

        p = Principal(sub="bg:operator-root", kind=KIND_BREAK_GLASS)
        self.assertTrue(p.online_token_forbidden)


class TestSSDGrantRejection(unittest.TestCase):
    """The load-bearing §3.5 enforcement, over the full downward-transitive affected set."""

    def _seed_operator_like(self, store: SQLiteStore) -> None:
        store.put_principal(Principal(sub="op:eide", kind=KIND_HUMAN))
        store.put_role(Role(role_id="role:ops-approve", direct_scopes=frozenset({S.BOARD_APPROVE})))
        store.assign_role("op:eide", "role:ops-approve")

    def test_direct_conflicting_grant_rejected(self):
        store = SQLiteStore()
        self._seed_operator_like(store)
        # Granting gateway:execute onto a role the operator holds -> approve XOR execute.
        with self.assertRaises(SoDViolation) as ctx:
            store.grant_scope_to_role("role:ops-approve", S.GATEWAY_EXECUTE)
        self.assertEqual(ctx.exception.pair, frozenset({S.BOARD_APPROVE, S.GATEWAY_EXECUTE}))
        # Atomic: the scope was NOT committed.
        self.assertNotIn(S.GATEWAY_EXECUTE, store.effective_scopes("op:eide"))
        self.assertNotIn(S.GATEWAY_EXECUTE, store.role_scope_closure("role:ops-approve"))

    def test_assignment_of_conflicting_role_rejected(self):
        store = SQLiteStore()
        store.put_principal(Principal(sub="svc:gateway", kind=KIND_SERVICE))
        store.put_role(Role(role_id="role:cred", direct_scopes=frozenset({S.VAULT_READ_CREDENTIAL})))
        store.put_role(Role(role_id="role:approve", direct_scopes=frozenset({S.BOARD_APPROVE})))
        # A non-exportable key so attestation does not mask the SoD result for the
        # vault:read-credential holder.
        store.register_agent_key(
            AgentKey(
                sub="svc:gateway",
                kid="kid-hw-1",
                public_jwk={"kty": "OKP", "crv": "Ed25519", "x": "AAAA"},
                storage_tier=STORE_TPM,
                non_exportable=True,
            )
        )
        store.assign_role("svc:gateway", "role:cred")
        with self.assertRaises(SoDViolation):
            store.assign_role("svc:gateway", "role:approve")
        self.assertNotIn(S.BOARD_APPROVE, store.effective_scopes("svc:gateway"))

    def test_hierarchy_edge_staging_attack_caught_at_edge_insert(self):
        """Empty role inherits board:approve; then add edge from an execute-holder
        role -> the conflict must be caught at the EDGE insert via the downward
        fan-out (finding 4e), not left uncaught."""
        store = SQLiteStore()
        store.put_principal(
            Principal(sub="agent:exec-1", kind=KIND_AGENT, agent_class=AGENT_CLASS_EXECUTOR)
        )
        store.register_agent_key(
            AgentKey(
                sub="agent:exec-1",
                kid="kid-hw-2",
                public_jwk={"kty": "OKP", "crv": "Ed25519", "x": "BBBB"},
                storage_tier=STORE_TPM,
                non_exportable=True,
            )
        )
        # Executor holds gateway:execute.
        store.put_role(
            Role(role_id="role:exec", direct_scopes=frozenset({S.GATEWAY_EXECUTE}))
        )
        store.assign_role("agent:exec-1", "role:exec")
        # A staged empty role that (later) inherits board:approve.
        store.put_role(Role(role_id="role:empty"))
        store.put_role(
            Role(role_id="role:has-approve", direct_scopes=frozenset({S.BOARD_APPROVE}))
        )
        store.add_role_hierarchy_edge("role:empty", "role:has-approve")
        # role:empty now yields board:approve. Wire it under the executor's role:
        # this edge's affected set is every executor -> must REJECT.
        with self.assertRaises(SoDViolation):
            store.add_role_hierarchy_edge("role:exec", "role:empty")
        self.assertNotIn(S.BOARD_APPROVE, store.effective_scopes("agent:exec-1"))

    def test_allowed_governance_pair_permitted(self):
        store = SQLiteStore()
        store.put_principal(Principal(sub="op:eide", kind=KIND_HUMAN))
        store.put_role(
            Role(
                role_id="role:operator",
                direct_scopes=frozenset({S.BOARD_APPROVE, S.CMDB_WRITE_POLICY}),
            )
        )
        store.assign_role("op:eide", "role:operator")  # must NOT raise
        eff = store.effective_scopes("op:eide")
        self.assertIn(S.BOARD_APPROVE, eff)
        self.assertIn(S.CMDB_WRITE_POLICY, eff)


class TestAttestationInvariant(unittest.TestCase):
    def test_soft_key_executor_refused(self):
        """A holder/destructive role on a principal without a non-exportable key
        is a NO-GO, refused at assignment (§3.6, finding 1a)."""
        store = SQLiteStore()
        store.put_principal(
            Principal(sub="agent:soft", kind=KIND_AGENT, agent_class=AGENT_CLASS_EXECUTOR)
        )
        store.put_role(Role(role_id="role:exec", direct_scopes=frozenset({S.GATEWAY_EXECUTE})))
        with self.assertRaises(AttestationRequired):
            store.assign_role("agent:soft", "role:exec")
        self.assertNotIn(S.GATEWAY_EXECUTE, store.effective_scopes("agent:soft"))

    def test_hardware_key_executor_activates(self):
        store = SQLiteStore()
        store.put_principal(
            Principal(sub="agent:hard", kind=KIND_AGENT, agent_class=AGENT_CLASS_EXECUTOR)
        )
        store.register_agent_key(
            AgentKey(
                sub="agent:hard",
                kid="kid-hw-3",
                public_jwk={"kty": "OKP", "crv": "Ed25519", "x": "CCCC"},
                storage_tier=STORE_TPM,
                non_exportable=True,
            )
        )
        store.put_role(Role(role_id="role:exec", direct_scopes=frozenset({S.GATEWAY_EXECUTE})))
        store.assign_role("agent:hard", "role:exec")  # must NOT raise
        self.assertIn(S.GATEWAY_EXECUTE, store.effective_scopes("agent:hard"))


class TestKindGating(unittest.TestCase):
    def test_kind_gate_blocks_wrong_kind(self):
        store = SQLiteStore()
        store.put_principal(
            Principal(sub="agent:planner-1", kind=KIND_AGENT, agent_class=AGENT_CLASS_PLANNER)
        )
        store.put_role(
            Role(
                role_id="role:operator",
                direct_scopes=frozenset({S.MC_ADMIN}),
                kind_gate=frozenset({KIND_HUMAN}),
            )
        )
        with self.assertRaises(KindGateViolation):
            store.assign_role("agent:planner-1", "role:operator")


class TestGrantInvariantsOnAllWideningPaths(unittest.TestCase):
    """Review findings 1a + 2: the non-exportable-key attestation and the
    per-holder kind restriction must hold on EVERY widening path — not only
    assign_role. Previously grant_scope_to_role / add_role_hierarchy_edge /
    put_role skipped them, letting a soft-key or wrong-kind principal acquire a
    holder scope. These prove the fail-opens are closed and atomic."""

    _HW = dict(storage_tier=STORE_TPM, non_exportable=True)

    def _soft_executor(self, store: SQLiteStore, sub: str = "agent:soft") -> None:
        store.put_principal(
            Principal(sub=sub, kind=KIND_AGENT, agent_class=AGENT_CLASS_EXECUTOR)
        )

    # ---- finding 1a: attestation on grant_scope_to_role -----------------
    def test_soft_key_executor_refused_via_grant_scope_to_role(self):
        store = SQLiteStore()
        self._soft_executor(store)
        store.put_role(Role(role_id="role:base"))          # holder-free
        store.assign_role("agent:soft", "role:base")       # passes (no holder yet)
        with self.assertRaises(AttestationRequired):
            store.grant_scope_to_role("role:base", S.GATEWAY_EXECUTE)
        # Atomic: the soft-key agent did NOT acquire gateway:execute.
        self.assertNotIn(S.GATEWAY_EXECUTE, store.effective_scopes("agent:soft"))
        self.assertNotIn(S.GATEWAY_EXECUTE, store.role_scope_closure("role:base"))

    # ---- finding 1a: attestation on add_role_hierarchy_edge -------------
    def test_soft_key_executor_refused_via_hierarchy_edge(self):
        store = SQLiteStore()
        self._soft_executor(store)
        store.put_role(Role(role_id="role:base"))
        store.put_role(Role(role_id="role:exec", direct_scopes=frozenset({S.GATEWAY_EXECUTE})))
        store.assign_role("agent:soft", "role:base")
        with self.assertRaises(AttestationRequired):
            store.add_role_hierarchy_edge("role:base", "role:exec")
        self.assertNotIn(S.GATEWAY_EXECUTE, store.effective_scopes("agent:soft"))

    # ---- finding 1a: attestation on put_role (role replacement) ---------
    def test_soft_key_executor_refused_via_put_role_replacement(self):
        store = SQLiteStore()
        self._soft_executor(store)
        store.put_role(Role(role_id="role:base"))
        store.assign_role("agent:soft", "role:base")
        with self.assertRaises(AttestationRequired):
            store.put_role(Role(role_id="role:base",
                                direct_scopes=frozenset({S.GATEWAY_EXECUTE})))
        self.assertNotIn(S.GATEWAY_EXECUTE, store.effective_scopes("agent:soft"))

    # ---- finding 2: an agent can NEVER acquire vault:read-credential -----
    def test_agent_refused_vault_read_credential_via_grant(self):
        store = SQLiteStore()
        # Even WITH a hardware key (so attestation would pass), kind gates it.
        store.put_principal(
            Principal(sub="agent:x", kind=KIND_AGENT, agent_class=AGENT_CLASS_EXECUTOR)
        )
        store.register_agent_key(AgentKey(
            sub="agent:x", kid="k", public_jwk={"kty": "OKP", "crv": "Ed25519", "x": "z"},
            **self._HW))
        store.put_role(Role(role_id="role:agent", kind_gate=frozenset({KIND_AGENT})))
        store.assign_role("agent:x", "role:agent")
        with self.assertRaises(KindGateViolation):
            store.grant_scope_to_role("role:agent", S.VAULT_READ_CREDENTIAL)
        self.assertNotIn(S.VAULT_READ_CREDENTIAL, store.effective_scopes("agent:x"))

    # ---- finding 2: an agent can NEVER acquire cmdb:write-policy ---------
    def test_agent_refused_cmdb_write_policy_via_hierarchy_edge(self):
        store = SQLiteStore()
        store.put_principal(
            Principal(sub="agent:y", kind=KIND_AGENT, agent_class=AGENT_CLASS_PLANNER)
        )
        store.put_role(Role(role_id="role:agent", kind_gate=frozenset({KIND_AGENT})))
        store.put_role(Role(role_id="role:policy",
                            direct_scopes=frozenset({S.CMDB_WRITE_POLICY})))
        store.assign_role("agent:y", "role:agent")
        with self.assertRaises(KindGateViolation):
            store.add_role_hierarchy_edge("role:agent", "role:policy")
        self.assertNotIn(S.CMDB_WRITE_POLICY, store.effective_scopes("agent:y"))

    def test_holder_allowed_kinds_mirror_principal_constants(self):
        # The literals in scopes.HOLDER_ALLOWED_KINDS must equal the real KIND_*.
        from auth.core.principals import KIND_AGENT as A, KIND_HUMAN as H, KIND_SERVICE as SV
        self.assertEqual(S.HOLDER_ALLOWED_KINDS[S.VAULT_READ_CREDENTIAL], frozenset({SV}))
        self.assertEqual(S.HOLDER_ALLOWED_KINDS[S.CMDB_WRITE_POLICY], frozenset({H}))
        self.assertEqual(S.HOLDER_ALLOWED_KINDS[S.GATEWAY_EXECUTE], frozenset({A}))
        self.assertEqual(S.HOLDER_ALLOWED_KINDS[S.BOARD_APPROVE], frozenset({H, A}))
        # Every holder scope is covered by the kind map.
        self.assertEqual(set(S.HOLDER_ALLOWED_KINDS), set(S.HOLDER_SCOPES))

    def test_holder_allowed_kinds_is_immutable_at_runtime(self):
        # Compiled-in constant, NO runtime relax path (decision #5): the kind-gating
        # table must be read-only like CONFLICT_SET / HOLDER_SCOPES, so in-process
        # code cannot widen which principal kinds may hold a holder scope.
        with self.assertRaises(TypeError):
            S.HOLDER_ALLOWED_KINDS[S.GATEWAY_EXECUTE] = frozenset({"agent", "human"})  # type: ignore[index]
        with self.assertRaises(TypeError):
            S.HOLDER_ALLOWED_KINDS["new:holder"] = frozenset({"agent"})  # type: ignore[index]


class TestHMACSigner(unittest.TestCase):
    def test_sign_verify_roundtrip(self):
        signer = HMACSigner(b"k" * 32, "kid-hmac-1")
        self.assertEqual(signer.alg, "HS256")
        self.assertEqual(signer.kid, "kid-hmac-1")
        msg = b"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZ2VudDp4In0"
        sig = signer.sign(msg)
        self.assertTrue(signer.verify(msg, sig))

    def test_detects_tamper(self):
        signer = HMACSigner(b"k" * 32, "kid-hmac-1")
        msg = b"header.payload"
        sig = signer.sign(msg)
        self.assertFalse(signer.verify(b"header.payloadX", sig))       # tampered input
        self.assertFalse(signer.verify(msg, sig[:-1] + bytes([sig[-1] ^ 0x01])))  # tampered sig

    def test_rejects_weak_secret(self):
        with self.assertRaises(ValueError):
            HMACSigner(b"short", "kid")


class TestEdDSASigner(unittest.TestCase):
    """CANNOT-VERIFY-HERE unless 'cryptography' is installed. See signer_eddsa docstring."""

    def test_loud_failure_or_real_roundtrip(self):
        if signer_eddsa.cryptography_available():
            signer = signer_eddsa.EdDSASigner.generate("kid-ed-1")
            self.assertEqual(signer.alg, "EdDSA")
            msg = b"header.payload"
            sig = signer.sign(msg)
            self.assertTrue(signer.verify(msg, sig))
            self.assertFalse(signer.verify(b"header.payloadX", sig))
            self.assertEqual(signer.public_jwk()["kty"], "OKP")
        else:
            # It MUST raise loudly, never silently/fakely sign.
            with self.assertRaises(RuntimeError):
                signer_eddsa.EdDSASigner.generate("kid-ed-1")
            self.skipTest(
                "cryptography not installed — EdDSA CANNOT-VERIFY-HERE. Close with: "
                'python -m pip install "cryptography>=42"'
            )


if __name__ == "__main__":
    unittest.main(verbosity=2)
