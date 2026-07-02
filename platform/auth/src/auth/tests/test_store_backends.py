"""Stage-5 migration parity — RUNNABLE HERE (no Postgres/Redis needed).

These assert that the production backends (PostgresStore / RedisHotStore) satisfy
the SAME Protocol the whole service is wired to, expose the SAME surface as the
build-store doubles, and — the load-bearing claim — that the SQLite store the 247
tests exercise DELEGATES its grant-time SoD enforcement to the SAME shared module
the Postgres store uses. So "SoD holds on the migrated substrate" is proven by
construction here, and closed end-to-end by the CANNOT-VERIFY-HERE integration
tests (tests/integration/) against a real Postgres/Redis.
"""
import inspect
import unittest

from auth.core import scopes as S
from auth.core.interfaces import HotStore, Store
from auth.store import _invariants as INV
from auth.store.memory_hot import MemoryHotStore
from auth.store.postgres_store import PostgresStore
from auth.store.redis_hot import RedisHotStore
from auth.store.sqlite_store import SQLiteStore


def _public_methods(cls) -> set:
    return {m for m in dir(cls) if not m.startswith("_") and callable(getattr(cls, m))}


def _protocol_methods(proto) -> set:
    return {
        m for m in dir(proto)
        if not m.startswith("_") and m not in ("mro",)
    }


class TestBackendProtocolConformance(unittest.TestCase):
    def test_postgres_store_satisfies_store_protocol(self):
        # runtime_checkable, method-only Protocol -> structural issubclass is valid.
        self.assertTrue(issubclass(PostgresStore, Store))

    def test_redis_hot_satisfies_hotstore_protocol(self):
        self.assertTrue(issubclass(RedisHotStore, HotStore))

    def test_sqlite_store_still_satisfies_store_protocol(self):
        self.assertTrue(issubclass(SQLiteStore, Store))

    def test_memory_hot_still_satisfies_hotstore_protocol(self):
        self.assertTrue(issubclass(MemoryHotStore, HotStore))


class TestBackendSurfaceParity(unittest.TestCase):
    def test_postgres_covers_every_store_protocol_method(self):
        missing = _protocol_methods(Store) - _public_methods(PostgresStore)
        self.assertEqual(missing, set(), f"PostgresStore missing Store methods: {missing}")

    def test_redis_covers_every_hotstore_protocol_method(self):
        missing = _protocol_methods(HotStore) - _public_methods(RedisHotStore)
        self.assertEqual(missing, set(), f"RedisHotStore missing HotStore methods: {missing}")

    def test_sqlite_and_postgres_have_the_same_public_store_surface(self):
        # both back the same Core API; drift would mean a path exists on one backend
        # that the other cannot serve. Ignore backend-only helpers (init_schema/read_audit).
        ignore = {"init_schema", "read_audit"}
        a = _public_methods(SQLiteStore) - ignore
        b = _public_methods(PostgresStore) - ignore
        self.assertEqual(a, b, f"store surface drift: only-sqlite={a - b} only-pg={b - a}")


class TestSoDEnforcementIsSharedNotReimplemented(unittest.TestCase):
    def test_sqlite_delegates_grant_invariants_to_shared_module(self):
        src = inspect.getsource(SQLiteStore._enforce_grant_invariants)
        self.assertIn("INV.enforce_grant_invariants", src,
                      "SQLite store must delegate SoD enforcement to auth.store._invariants")

    def test_postgres_delegates_grant_invariants_to_shared_module(self):
        # every widening mutation on the Postgres store routes through the shared module.
        for meth in ("put_role", "grant_scope_to_role", "add_role_hierarchy_edge", "assign_role"):
            src = inspect.getsource(getattr(PostgresStore, meth))
            self.assertIn("INV.enforce_grant_invariants", src,
                          f"PostgresStore.{meth} must call the shared invariant enforcement")

    def test_shared_invariants_bind_to_immutable_core_scopes(self):
        # the attestation set + SoD decision primitives are the compiled-in ones,
        # not a per-backend copy — so the ConflictSet survives the substrate swap.
        self.assertIs(INV.ATTESTATION_REQUIRED_SCOPES, S.ACTION_SIDE)
        self.assertTrue(hasattr(S, "find_holder_conflict"))
        self.assertTrue(hasattr(S, "find_holder_kind_violation"))

    def test_both_backends_compute_closure_with_shared_graph(self):
        for cls in (SQLiteStore, PostgresStore):
            src = inspect.getsource(cls)
            self.assertIn("GRAPH.", src, f"{cls.__name__} must use the shared _graph helpers")


if __name__ == "__main__":
    unittest.main()
