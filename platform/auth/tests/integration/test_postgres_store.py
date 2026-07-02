"""CANNOT-VERIFY-HERE integration test — PostgresStore against a REAL Postgres.

Proves the SoD/attestation enforcement holds on the migrated durable substrate,
including the NEW multi-writer hazard (two concurrent grants that jointly conflict
must not both commit — the SERIALIZABLE guard).

OPERATOR CLOSE-OUT (needs Docker/Postgres — cannot run in the Stage-4/5 sandbox):
    # against the compose stack:
    docker compose -f platform/auth/docker-compose.yml up -d postgres
    docker compose -f platform/auth/docker-compose.yml run --rm \
        -e TEST_DATABASE_URL=postgresql://auth:$POSTGRES_PASSWORD@postgres:5432/auth \
        auth-a python -m pytest tests/integration/test_postgres_store.py -v
    # or locally:
    PYTHONPATH=platform/auth/src TEST_DATABASE_URL=postgresql://auth:auth@localhost:5432/auth \
        python -m pytest platform/auth/tests/integration/test_postgres_store.py -v
"""
import os
import threading
import unittest

try:
    import psycopg  # noqa: F401
    _HAVE_PG = True
except Exception:
    _HAVE_PG = False

DSN = os.environ.get("TEST_DATABASE_URL") or os.environ.get("DATABASE_URL")

if _HAVE_PG and DSN:
    from auth.core import scopes as S
    from auth.core.errors import SoDViolation
    from auth.core.principals import KIND_AGENT, AgentKey, Principal, Role
    from auth.store.postgres_store import PostgresStore


@unittest.skipUnless(_HAVE_PG and DSN, "needs psycopg + TEST_DATABASE_URL/DATABASE_URL -> real Postgres")
class TestPostgresStoreSoD(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.store = PostgresStore(DSN, create_schema=True)

    def setUp(self):
        # clean slate each test (dedicated test DB expected)
        with psycopg.connect(DSN) as c:
            for t in ("assignments", "role_hierarchy", "role_scopes", "roles",
                      "agent_keys", "budget_policies", "principals", "audit"):
                c.execute(f"DELETE FROM {t}")
            c.commit()

    def _attested_agent(self, sub="agent:exec-1"):
        st = self.store
        st.put_principal(Principal(sub=sub, kind=KIND_AGENT, agent_class="executor", client_id=sub))
        st.register_agent_key(AgentKey(
            sub=sub, kid="k1", public_jwk={"kty": "OKP", "crv": "Ed25519", "x": "demo"},
            storage_tier="tpm", non_exportable=True,
        ))
        return sub

    def test_crud_roundtrip(self):
        st = self.store
        sub = self._attested_agent()
        self.assertEqual(st.get_principal(sub).kind, KIND_AGENT)
        st.put_role(Role(role_id="r:read", direct_scopes=frozenset({S.BOARD_READ}),
                         kind_gate=frozenset({KIND_AGENT})))
        st.assign_role(sub, "r:read")
        self.assertIn("r:read", st.roles_of(sub))
        self.assertIn(S.BOARD_READ, st.effective_scopes(sub))

    def test_ssd_rejects_approve_plus_execute_atomically(self):
        st = self.store
        sub = self._attested_agent()
        st.put_role(Role(role_id="r:approve", direct_scopes=frozenset({S.BOARD_APPROVE}),
                         kind_gate=frozenset({KIND_AGENT})))
        st.put_role(Role(role_id="r:exec", direct_scopes=frozenset({S.GATEWAY_EXECUTE}),
                         kind_gate=frozenset({KIND_AGENT})))
        st.assign_role(sub, "r:approve")                       # approve-side OK
        with self.assertRaises(SoDViolation):                  # + execute-side => conflict
            st.assign_role(sub, "r:exec")
        # atomic reject: the second assignment left NO trace
        self.assertNotIn("r:exec", st.roles_of(sub))
        self.assertNotIn(S.GATEWAY_EXECUTE, st.effective_scopes(sub))

    def test_concurrent_conflicting_grants_cannot_both_commit(self):
        """The multi-writer hazard: two replicas each add one side of a conflict
        pair to the SAME principal at the SAME time. SERIALIZABLE must ensure they
        do not BOTH land — the principal ends holding at most one holder side."""
        st = self.store
        sub = self._attested_agent()
        st.put_role(Role(role_id="r:approve", direct_scopes=frozenset({S.BOARD_APPROVE}),
                         kind_gate=frozenset({KIND_AGENT})))
        st.put_role(Role(role_id="r:exec", direct_scopes=frozenset({S.GATEWAY_EXECUTE}),
                         kind_gate=frozenset({KIND_AGENT})))
        errors = []
        barrier = threading.Barrier(2)

        def grant(role_id):
            try:
                barrier.wait()
                st.assign_role(sub, role_id)
            except Exception as e:  # SoDViolation or (retried-out) SerializationFailure
                errors.append(type(e).__name__)

        t1 = threading.Thread(target=grant, args=("r:approve",))
        t2 = threading.Thread(target=grant, args=("r:exec",))
        t1.start(); t2.start(); t1.join(); t2.join()

        eff = st.effective_scopes(sub)
        held = eff & S.HOLDER_SCOPES
        # The core guarantee: no principal ever holds BOTH an approve and an action side.
        self.assertIsNone(S.find_holder_conflict(eff),
                          f"SoD escaped under concurrency: principal holds {sorted(held)}")
        # At least one grant must have been rejected/aborted.
        self.assertTrue(len(errors) >= 1, "expected one of the racing grants to be refused")


if __name__ == "__main__":
    unittest.main()
