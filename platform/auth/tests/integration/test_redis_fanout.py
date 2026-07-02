"""CANNOT-VERIFY-HERE integration test — RedisHotStore cross-replica fan-out.

Proves the kill-switch/revocation propagates across auth replicas through the SHARED
Redis, that the pub/sub delta carries the monotonic epoch, and the heartbeat advances.

OPERATOR CLOSE-OUT (needs Docker/Redis — cannot run in the sandbox):
    docker compose -f platform/auth/docker-compose.yml up -d redis
    docker compose -f platform/auth/docker-compose.yml run --rm \
        -e TEST_REDIS_URL=redis://redis:6379/0 \
        auth-a python -m pytest tests/integration/test_redis_fanout.py -v
    # or locally:
    docker run -p 6379:6379 -d redis:7 redis-server --appendonly yes
    PYTHONPATH=platform/auth/src TEST_REDIS_URL=redis://localhost:6379/0 \
        python -m pytest platform/auth/tests/integration/test_redis_fanout.py -v
"""
import os
import time
import unittest

try:
    import redis  # noqa: F401
    _HAVE_REDIS = True
except Exception:
    _HAVE_REDIS = False

URL = os.environ.get("TEST_REDIS_URL") or os.environ.get("REDIS_URL")

if _HAVE_REDIS and URL:
    from auth.store.redis_hot import RedisHotStore


@unittest.skipUnless(_HAVE_REDIS and URL, "needs redis + TEST_REDIS_URL/REDIS_URL -> real Redis")
class TestRedisCrossReplicaFanout(unittest.TestCase):
    def setUp(self):
        # Two SEPARATE client instances = two auth replicas over the SAME Redis.
        self.replica_a = RedisHotStore(URL, start_heartbeat=False)
        self.replica_b = RedisHotStore(URL, start_heartbeat=False)
        self.replica_a._r.flushdb()

    def tearDown(self):
        self.replica_a.close()
        self.replica_b.close()

    def test_jti_revoke_on_A_is_visible_on_B(self):
        jti = "tok-123"
        self.assertFalse(self.replica_b.is_jti_denied(jti))
        epoch = self.replica_a.deny_jti(jti, exp=int(time.time()) + 300)
        self.assertGreater(epoch, 0)
        # Cross-replica: B reads the SAME shared Redis key — sees it immediately.
        self.assertTrue(self.replica_b.is_jti_denied(jti))

    def test_killswitch_on_A_is_visible_on_B(self):
        self.assertEqual(self.replica_b.killswitch(), ("G0", 0))
        self.replica_a.set_killswitch("G2", 7)
        self.assertEqual(self.replica_b.killswitch(), ("G2", 7))

    def test_revoked_before_is_monotonic_and_visible(self):
        self.replica_a.set_revoked_before("agent:x", 1000)
        self.replica_a.set_revoked_before("agent:x", 500)   # must not move backwards
        self.assertEqual(self.replica_b.revoked_before("agent:x"), 1000)

    def test_consult_snapshot_pipeline_matches_individual_reads(self):
        """Stage-6: the ONE-round-trip pipelined snapshot returns the SAME values as
        the individual reads, cross-replica, for every granularity."""
        self.replica_a.deny_jti("j9", exp=int(time.time()) + 300)
        self.replica_a.set_revoked_before("s9", 1500)
        self.replica_a.retire_kid("k9")
        self.replica_a.disable_client("c9")
        self.replica_a.set_killswitch("G1", 3)
        # Read the batched snapshot on the OTHER replica (shared Redis).
        snap = self.replica_b.consult_snapshot(jti="j9", sub="s9", kid="k9", client_id="c9")
        self.assertEqual((snap.kill_level, snap.kill_epoch), self.replica_b.killswitch())
        self.assertEqual(snap.jti_denied, self.replica_b.is_jti_denied("j9"))
        self.assertEqual(snap.revoked_before, self.replica_b.revoked_before("s9"))
        self.assertEqual(snap.kid_retired, self.replica_b.is_kid_retired("k9"))
        self.assertEqual(snap.client_disabled, self.replica_b.is_client_disabled("c9"))
        self.assertTrue(snap.jti_denied and snap.kid_retired and snap.client_disabled)
        self.assertEqual(snap.revoked_before, 1500)
        # A clean token: snapshot all-clear.
        clean = self.replica_b.consult_snapshot(jti="none", sub="none", kid="none", client_id="none")
        self.assertFalse(clean.jti_denied or clean.kid_retired or clean.client_disabled)
        self.assertIsNone(clean.revoked_before)

    def test_epoch_is_monotonic_across_revocations(self):
        e1 = self.replica_a.deny_jti("a", int(time.time()) + 60)
        e2 = self.replica_a.disable_client("c1")
        e3 = self.replica_b.retire_kid("kid-9")
        self.assertTrue(e1 < e2 < e3, f"epoch not monotonic: {e1},{e2},{e3}")
        self.assertEqual(self.replica_b.current_epoch(), e3)

    def test_pubsub_delta_carries_new_epoch(self):
        received = []
        thread = self.replica_b.subscribe_revocations(lambda data: received.append(data))
        time.sleep(0.2)  # let the subscribe settle
        epoch = self.replica_a.deny_jti("push-1", int(time.time()) + 60)
        deadline = time.time() + 3
        while time.time() < deadline and not received:
            time.sleep(0.05)
        thread.stop()
        self.assertTrue(received, "no revocation delta received on auth:revocations")
        # delta format 'type|target|epoch'
        self.assertIn(f"|{epoch}", received[-1])

    def test_heartbeat_reports_current_epoch(self):
        self.replica_a.deny_jti("hb-1", int(time.time()) + 60)
        ep, ts = self.replica_b.heartbeat()
        self.assertEqual(ep, self.replica_b.current_epoch())
        self.assertGreater(ts, 0)


if __name__ == "__main__":
    unittest.main()
