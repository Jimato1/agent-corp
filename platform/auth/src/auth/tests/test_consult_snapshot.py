"""Stage-6 optimization guard: the batched consult_snapshot must produce IDENTICAL
values to the individual sequential reads, and consult_denylist's decision + reason +
deny-precedence + fail-closed behavior must be UNCHANGED by the batching.

Runs on MemoryHotStore (in-process) so the DECISION logic is fully exercised in the
sandbox. RedisHotStore.consult_snapshot mirrors the same field contract (its pipeline
mechanics are covered by tests/integration/test_redis_fanout.py against a real Redis).
"""
import time
import unittest

from auth.store.memory_hot import MemoryHotStore
from auth.tokens import revocation as REV


class TestConsultSnapshotParity(unittest.TestCase):
    def _assert_snapshot_matches_individual_reads(self, hot, *, jti, sub, kid, client_id):
        """The batched snapshot returns exactly what the individual reads return."""
        snap = hot.consult_snapshot(jti=jti, sub=sub, kid=kid, client_id=client_id)
        lvl, ep = hot.killswitch()
        self.assertEqual(snap.kill_level, lvl)
        self.assertEqual(snap.kill_epoch, ep)
        self.assertEqual(snap.jti_denied, hot.is_jti_denied(jti))
        self.assertEqual(snap.revoked_before, hot.revoked_before(sub))
        self.assertEqual(snap.kid_retired, hot.is_kid_retired(kid) if kid else False)
        self.assertEqual(
            snap.client_disabled, hot.is_client_disabled(client_id) if client_id else False
        )

    def test_clean_allow(self):
        hot = MemoryHotStore()
        self._assert_snapshot_matches_individual_reads(
            hot, jti="j1", sub="s1", kid="k1", client_id="c1")
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id="c1", kid="k1")
        self.assertTrue(d.allowed)

    def test_jti_denied(self):
        hot = MemoryHotStore()
        hot.deny_jti("j1", exp=int(time.time()) + 3600)
        self._assert_snapshot_matches_individual_reads(
            hot, jti="j1", sub="s1", kid="k1", client_id="c1")
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id="c1", kid="k1")
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "jti_revoked")

    def test_sub_revoked_before_watermark(self):
        hot = MemoryHotStore()
        hot.set_revoked_before("s1", epoch_ts=2000)
        self._assert_snapshot_matches_individual_reads(
            hot, jti="j1", sub="s1", kid="k1", client_id="c1")
        # token issued BEFORE the watermark -> denied
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id="c1", kid="k1")
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "sub_revoked_before")
        # token issued AFTER the watermark -> allowed
        d2 = REV.consult_denylist(hot, jti="j1", sub="s1", iat=3000, client_id="c1", kid="k1")
        self.assertTrue(d2.allowed)

    def test_kid_retired(self):
        hot = MemoryHotStore()
        hot.retire_kid("k1")
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id="c1", kid="k1")
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "kid_retired")

    def test_client_disabled(self):
        hot = MemoryHotStore()
        hot.disable_client("c1")
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id="c1", kid="k1")
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "client_disabled")

    def test_killswitch_g2_denies_even_when_all_else_clean(self):
        hot = MemoryHotStore()
        hot.set_killswitch("G2", 5)
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id="c1", kid="k1")
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "killswitch_g2_quiesce")

    def test_deny_precedence_jti_wins_over_client(self):
        # Both jti and client denied — the jti reason must win (order preserved).
        hot = MemoryHotStore()
        hot.deny_jti("j1", exp=int(time.time()) + 3600)
        hot.disable_client("c1")
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id="c1", kid="k1")
        self.assertEqual(d.reason, "jti_revoked")

    def test_deny_precedence_killswitch_wins_over_jti(self):
        hot = MemoryHotStore()
        hot.set_killswitch("G2", 9)
        hot.deny_jti("j1", exp=int(time.time()) + 3600)
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id="c1", kid="k1")
        self.assertEqual(d.reason, "killswitch_g2_quiesce")

    def test_fail_closed_when_snapshot_read_raises(self):
        class BoomHot:
            def consult_snapshot(self, **kw):
                raise RuntimeError("redis unreachable")
        d = REV.consult_denylist(BoomHot(), jti="j1", sub="s1", iat=1000)
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "revocation_unreadable")

    def test_none_kid_and_client_not_consulted(self):
        hot = MemoryHotStore()
        # even if a kid/client were denied, passing None must not consult them
        hot.retire_kid("k1")
        hot.disable_client("c1")
        snap = hot.consult_snapshot(jti="j1", sub="s1", kid=None, client_id=None)
        self.assertFalse(snap.kid_retired)
        self.assertFalse(snap.client_disabled)
        d = REV.consult_denylist(hot, jti="j1", sub="s1", iat=1000, client_id=None, kid=None)
        self.assertTrue(d.allowed)


if __name__ == "__main__":
    unittest.main()
