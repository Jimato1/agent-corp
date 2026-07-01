"""auth.tests.test_budgets — Phase-2 BUDGET ENFORCEMENT tests (PLAN §6).

Proves the four budget dimensions + the per-tool-call middleware run GREEN here
with a deterministic injected clock (no real sleeping):

  * GCRA allows within rate + rejects burst, recovers after the emission interval.
  * the concurrency semaphore hard-caps in-flight work, releases on `finally`, and
    the TTL-lease-expiry reaper reclaims a crashed holder's slot.
  * cooldown blocks a too-soon repeat, allows after the window, and replays an
    idempotent retry (same key) while rejecting a different key in-window.
  * the lifetime/liveness detector arms a sub-scoped freeze on no-progress (calls
    and wall-clock and total-calls triggers) — the safe direction only.
  * the middleware returns 429 (not queue-forever) over budget, fails CLOSED (503)
    for destructive classes when the counter store is down, and is allow-but-
    locally-bounded (degraded) for benign classes when the store is down; the
    kill-switch and a lifetime-armed sub freeze both stop destructive calls.
"""
from __future__ import annotations

import unittest

from auth.core.principals import (
    BudgetPolicy,
    ConcurrencyLimit,
    LifetimeLimit,
    RateLimit,
)
from auth.store.memory_hot import KILL_G1, KILL_G2, MemoryHotStore

from auth.budgets.gcra import GCRALimiter
from auth.budgets.semaphore import BudgetExceeded, ConcurrencySemaphore
from auth.budgets.cooldown import CooldownLimiter
from auth.budgets.lifetime import LifetimeDetector, freeze_key, is_frozen
from auth.budgets.middleware import (
    BudgetMiddleware,
    CLASS_DESTRUCTIVE,
    CLASS_READ,
    CLASS_SOD_CRITICAL,
    CLASS_WRITE_BENIGN,
)


class FakeClock:
    """Deterministic injectable clock returning MILLISECONDS. Never sleeps."""

    def __init__(self, start_ms: int = 1_000_000) -> None:
        self._ms = int(start_ms)

    def __call__(self) -> float:
        return float(self._ms)

    def advance(self, ms: int) -> None:
        self._ms += int(ms)

    def set(self, ms: int) -> None:
        self._ms = int(ms)


class DownHotStore:
    """A HotStore whose every op raises — models 'counter store unreachable'."""

    def __getattr__(self, name):
        def _raise(*a, **k):
            raise RuntimeError(f"counter store DOWN (op {name!r})")
        return _raise


# ---------------------------------------------------------------------------
# Dimension 1 — GCRA rate/compute
# ---------------------------------------------------------------------------

class TestGCRA(unittest.TestCase):
    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.clock = FakeClock()
        self.gcra = GCRALimiter(self.hot, self.clock)
        # T=100ms, tau=200ms → burst capacity floor(200/100)+1 = 3.
        self.rate = RateLimit(emission_interval_ms=100, burst_tau_ms=200)

    def test_allows_within_rate_then_rejects_burst(self):
        sub = "agent:patcher-07"
        # 3 back-to-back arrivals from idle are admitted.
        for i in range(3):
            d = self.gcra.check(sub, self.rate)
            self.assertTrue(d.allowed, f"arrival {i} should be allowed")
        # The 4th within the same instant is rejected with a positive retry_after.
        d = self.gcra.check(sub, self.rate)
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "rate")
        self.assertGreater(d.retry_after_ms, 0)

    def test_recovers_after_emission_interval(self):
        sub = "agent:patcher-07"
        for _ in range(3):
            self.gcra.check(sub, self.rate)
        self.assertFalse(self.gcra.check(sub, self.rate).allowed)
        # Advance exactly one emission interval → one more admit becomes available.
        self.clock.advance(100)
        self.assertTrue(self.gcra.check(sub, self.rate).allowed)

    def test_per_sub_isolation(self):
        for _ in range(3):
            self.gcra.check("agent:a", self.rate)
        self.assertFalse(self.gcra.check("agent:a", self.rate).allowed)
        # A different sub has its own independent bucket.
        self.assertTrue(self.gcra.check("agent:b", self.rate).allowed)


# ---------------------------------------------------------------------------
# Dimension 2 — leased concurrency semaphore
# ---------------------------------------------------------------------------

class TestSemaphore(unittest.TestCase):
    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.clock = FakeClock()
        self.sema = ConcurrencySemaphore(self.hot, self.clock)

    def test_hard_caps_concurrency(self):
        sub = "agent:x"
        l1 = self.sema.acquire(sub, limit=2)
        l2 = self.sema.acquire(sub, limit=2)
        self.assertEqual(self.sema.in_flight(sub), 2)
        # Third over the cap → reject (not queue).
        with self.assertRaises(BudgetExceeded) as ctx:
            self.sema.acquire(sub, limit=2)
        self.assertEqual(ctx.exception.reason, "concurrency")
        # The rejected acquire did NOT leak a slot.
        self.assertEqual(self.sema.in_flight(sub), 2)
        # Release one → a new acquire fits.
        self.sema.release(l1)
        self.assertEqual(self.sema.in_flight(sub), 1)
        l3 = self.sema.acquire(sub, limit=2)
        self.assertEqual(self.sema.in_flight(sub), 2)
        self.sema.release(l2)
        self.sema.release(l3)
        self.assertEqual(self.sema.in_flight(sub), 0)

    def test_releases_on_finally(self):
        sub = "agent:y"
        try:
            with self.sema.slot(sub, limit=1) as lease:
                self.assertEqual(self.sema.in_flight(sub), 1)
                raise ValueError("tool blew up mid-call")
        except ValueError:
            pass
        # Even on an exception the slot is released in `finally`.
        self.assertEqual(self.sema.in_flight(sub), 0)

    def test_lease_expiry_backstop_reaper(self):
        sub = "agent:z"
        # Acquire and "crash" (never release). Lease TTL = 1000ms.
        self.sema.acquire(sub, limit=1, lease_ttl_ms=1000)
        self.assertEqual(self.sema.in_flight(sub), 1)
        # Before expiry the reaper reclaims nothing.
        self.clock.advance(500)
        self.assertEqual(self.sema.reap_expired(), 0)
        self.assertEqual(self.sema.in_flight(sub), 1)
        # After the lease expires the backstop reaper reclaims the leaked slot.
        self.clock.advance(600)  # now 1100 > expiry 1000
        self.assertEqual(self.sema.reap_expired(), 1)
        self.assertEqual(self.sema.in_flight(sub), 0)
        # And the freed slot is usable again.
        self.sema.acquire(sub, limit=1)
        self.assertEqual(self.sema.in_flight(sub), 1)

    def test_release_is_idempotent(self):
        sub = "agent:w"
        lease = self.sema.acquire(sub, limit=1)
        self.sema.release(lease)
        self.sema.release(lease)  # double release must not underflow
        self.assertEqual(self.sema.in_flight(sub), 0)


# ---------------------------------------------------------------------------
# Dimension 3 — cooldown + idempotency
# ---------------------------------------------------------------------------

class TestCooldown(unittest.TestCase):
    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.clock = FakeClock()
        self.cool = CooldownLimiter(self.hot, self.clock)

    def test_blocks_too_soon_repeat(self):
        sub, cls = "agent:a", "sod-critical"
        self.assertTrue(self.cool.check(sub, cls, cooldown_ms=5000).allowed)
        d = self.cool.check(sub, cls, cooldown_ms=5000)
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "cooldown")
        self.assertEqual(d.retry_after_ms, 5000)

    def test_allows_after_window(self):
        sub, cls = "agent:a", "sod-critical"
        self.cool.check(sub, cls, cooldown_ms=5000)
        self.clock.advance(5000)
        self.assertTrue(self.cool.check(sub, cls, cooldown_ms=5000).allowed)

    def test_idempotent_replay_same_key_and_rejects_different_key(self):
        sub, cls = "agent:a", "destructive-exec"
        d1 = self.cool.check(sub, cls, cooldown_ms=5000, idempotency_key="k1")
        self.assertTrue(d1.allowed)
        self.assertFalse(d1.replay)
        # Same key inside the window → idempotent replay (allowed).
        d2 = self.cool.check(sub, cls, cooldown_ms=5000, idempotency_key="k1")
        self.assertTrue(d2.allowed)
        self.assertTrue(d2.replay)
        # A DIFFERENT key inside the window → rejected (cooldown active).
        d3 = self.cool.check(sub, cls, cooldown_ms=5000, idempotency_key="k2")
        self.assertFalse(d3.allowed)
        self.assertEqual(d3.reason, "cooldown")


# ---------------------------------------------------------------------------
# Dimension 4 — lifetime / liveness detector
# ---------------------------------------------------------------------------

class TestLifetime(unittest.TestCase):
    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.clock = FakeClock()
        self.hook_calls = []
        self.det = LifetimeDetector(
            self.hot, self.clock,
            freeze_hook=lambda sub, reason: self.hook_calls.append((sub, reason)),
        )

    def test_arms_freeze_on_no_progress_calls(self):
        sub = "agent:loop"
        pol = LifetimeLimit(no_progress_calls_trigger=3)
        st1 = self.det.record_call(sub, pol, progressed=False)
        st2 = self.det.record_call(sub, pol, progressed=False)
        self.assertFalse(st1.armed_freeze)
        self.assertFalse(st2.armed_freeze)
        st3 = self.det.record_call(sub, pol, progressed=False)
        self.assertTrue(st3.armed_freeze)
        self.assertEqual(st3.reason, "no_progress_calls")
        # Freeze is armed for this sub (read by the middleware step 0).
        self.assertTrue(is_frozen(self.hot, sub))
        self.assertEqual(self.hook_calls[-1], (sub, "no_progress_calls"))

    def test_progress_resets_no_progress_streak(self):
        sub = "agent:worker"
        pol = LifetimeLimit(no_progress_calls_trigger=3)
        self.det.record_call(sub, pol, progressed=False)
        self.det.record_call(sub, pol, progressed=False)
        # A state-advancing call resets the streak, so the loop is NOT armed.
        st = self.det.record_call(sub, pol, progressed=True)
        self.assertEqual(st.no_progress_streak, 0)
        self.assertFalse(st.armed_freeze)
        self.assertFalse(is_frozen(self.hot, sub))

    def test_arms_freeze_on_wall_clock(self):
        sub = "agent:slow"
        pol = LifetimeLimit(max_wall_clock_ms=1000)
        self.det.record_call(sub, pol, progressed=True)   # anchors start
        self.clock.advance(1000)
        st = self.det.record_call(sub, pol, progressed=True)
        self.assertTrue(st.armed_freeze)
        self.assertEqual(st.reason, "wall_clock")

    def test_arms_freeze_on_total_calls(self):
        sub = "agent:chatty"
        pol = LifetimeLimit(max_lifetime_tool_calls=2)
        self.assertFalse(self.det.record_call(sub, pol, progressed=True).armed_freeze)
        st = self.det.record_call(sub, pol, progressed=True)
        self.assertTrue(st.armed_freeze)
        self.assertEqual(st.reason, "lifetime_calls")

    def test_freeze_is_operator_clearable_only(self):
        sub = "agent:loop2"
        pol = LifetimeLimit(no_progress_calls_trigger=1)
        self.det.record_call(sub, pol, progressed=False)
        self.assertTrue(self.det.is_frozen(sub))
        # More no-progress calls never un-freeze; only an operator clear does.
        self.det.record_call(sub, pol, progressed=False)
        self.assertTrue(self.det.is_frozen(sub))
        self.det.clear_freeze(sub)
        self.assertFalse(self.det.is_frozen(sub))


# ---------------------------------------------------------------------------
# The middleware — the per-tool-call enforcement order + backpressure
# ---------------------------------------------------------------------------

class TestMiddleware(unittest.TestCase):
    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.clock = FakeClock()
        self.mw = BudgetMiddleware(self.hot, self.clock)

    def test_over_budget_returns_429_not_queue_forever(self):
        # Rate T=10s, tau=0 → burst 1. Second immediate call is rejected, NOT queued.
        pol = BudgetPolicy(owner="agent:a", rate=RateLimit(emission_interval_ms=10_000, burst_tau_ms=0))
        d1 = self.mw.check("agent:a", CLASS_READ, policy=pol)
        self.assertTrue(d1.allowed)
        self.assertEqual(d1.status, 200)
        d2 = self.mw.check("agent:a", CLASS_READ, policy=pol)
        self.assertFalse(d2.allowed)
        self.assertEqual(d2.status, 429)
        self.assertEqual(d2.reason, "rate")
        self.assertIn("Retry-After", d2.headers())

    def test_concurrency_over_budget_returns_429(self):
        pol = BudgetPolicy(owner="agent:a", concurrency=ConcurrencyLimit(global_max=1))
        with self.mw.enforce("agent:a", CLASS_READ, policy=pol) as first:
            self.assertTrue(first.allowed)
            # While the first slot is held, a second admission is rejected (429).
            second = self.mw.check("agent:a", CLASS_READ, policy=pol)
            self.assertFalse(second.allowed)
            self.assertEqual(second.status, 429)
            self.assertEqual(second.reason, "concurrency")

    def test_release_in_finally_frees_slot(self):
        pol = BudgetPolicy(owner="agent:a", concurrency=ConcurrencyLimit(global_max=1))
        with self.mw.enforce("agent:a", CLASS_READ, policy=pol) as d:
            self.assertTrue(d.allowed)
        # After the block the slot is released → the next admission is allowed.
        self.assertTrue(self.mw.check("agent:a", CLASS_READ, policy=pol).allowed)

    def test_destructive_fails_closed_when_counter_store_down(self):
        mw = BudgetMiddleware(DownHotStore(), self.clock)
        d = mw.check("agent:exec", CLASS_DESTRUCTIVE)
        self.assertFalse(d.allowed)
        self.assertEqual(d.status, 503)
        self.assertEqual(d.reason, "store_down_fail_closed")
        # sod-critical is likewise fail-closed.
        d2 = mw.check("agent:exec", CLASS_SOD_CRITICAL)
        self.assertEqual(d2.status, 503)

    def test_benign_allow_but_locally_bounded_when_store_down(self):
        mw = BudgetMiddleware(DownHotStore(), self.clock, local_per_sub_cap=2)
        d = mw.check("agent:reader", CLASS_READ)
        self.assertTrue(d.allowed)
        self.assertEqual(d.status, 200)
        self.assertTrue(d.degraded)
        self.assertEqual(d.headers().get("X-Budget-Degraded"), "true")

    def test_benign_local_floor_caps_even_when_store_down(self):
        # The Redis-INDEPENDENT ceiling still bounds in-flight work (finding 2b).
        mw = BudgetMiddleware(DownHotStore(), self.clock, local_per_sub_cap=2)
        with mw.enforce("agent:r", CLASS_READ) as d1, mw.enforce("agent:r", CLASS_READ) as d2:
            self.assertTrue(d1.allowed)
            self.assertTrue(d2.allowed)
            # Third concurrent benign call hits the local floor → 429 (NOT unbounded).
            d3 = mw.check("agent:r", CLASS_READ)
            self.assertFalse(d3.allowed)
            self.assertEqual(d3.status, 429)
            self.assertEqual(d3.reason, "concurrency")

    def test_kill_switch_g1_freezes_destructive_but_not_benign(self):
        self.hot.set_killswitch(KILL_G1, epoch=1)
        d = self.mw.check("agent:exec", CLASS_DESTRUCTIVE)
        self.assertFalse(d.allowed)
        self.assertEqual(d.status, 503)
        self.assertEqual(d.reason, "frozen")
        # Benign reads keep flowing under G1 ("stop the hands, keep thinking").
        self.assertTrue(self.mw.check("agent:exec", CLASS_READ).allowed)

    def test_kill_switch_g2_quiesces_all(self):
        self.hot.set_killswitch(KILL_G2, epoch=1)
        d = self.mw.check("agent:reader", CLASS_READ)
        self.assertFalse(d.allowed)
        self.assertEqual(d.status, 503)
        self.assertEqual(d.reason, "quiesce")

    def test_lifetime_armed_sub_freeze_blocks_destructive(self):
        # A lifetime-armed sub-scoped freeze stops destructive calls via step 0.
        self.hot.set_counter(freeze_key("agent:loop"), 1, ttl_ms=None)
        d = self.mw.check("agent:loop", CLASS_DESTRUCTIVE)
        self.assertFalse(d.allowed)
        self.assertEqual(d.status, 503)
        self.assertEqual(d.reason, "frozen")
        # A different, un-frozen agent is unaffected.
        self.assertTrue(self.mw.check("agent:other", CLASS_DESTRUCTIVE).allowed)

    def test_cooldown_replay_allows_idempotent_retry(self):
        pol = BudgetPolicy(owner="agent:a", cooldowns_ms={CLASS_WRITE_BENIGN: 5000})
        d1 = self.mw.check("agent:a", CLASS_WRITE_BENIGN, policy=pol, idempotency_key="k1")
        self.assertTrue(d1.allowed)
        # Same key inside the window replays; a different key is 429 cooldown.
        d2 = self.mw.check("agent:a", CLASS_WRITE_BENIGN, policy=pol, idempotency_key="k1")
        self.assertTrue(d2.allowed)
        self.assertTrue(d2.replay)
        d3 = self.mw.check("agent:a", CLASS_WRITE_BENIGN, policy=pol, idempotency_key="k2")
        self.assertFalse(d3.allowed)
        self.assertEqual(d3.reason, "cooldown")

    def test_admission_claim_blocks_concurrent_same_key_destructive(self):
        pol = BudgetPolicy(owner="agent:exec")
        # First destructive call holds the PENDING admission claim open.
        with self.mw.enforce("agent:exec", CLASS_DESTRUCTIVE, policy=pol, idempotency_key="job-1") as d1:
            self.assertTrue(d1.allowed)
            # A concurrent retry with the SAME key sees PENDING → 409 in_progress.
            d2 = self.mw.check("agent:exec", CLASS_DESTRUCTIVE, policy=pol, idempotency_key="job-1")
            self.assertFalse(d2.allowed)
            self.assertEqual(d2.status, 409)
            self.assertEqual(d2.reason, "in_progress")


if __name__ == "__main__":
    unittest.main()
