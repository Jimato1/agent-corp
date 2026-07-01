"""auth.tests.test_killswitch — Phase-2 KILL-SWITCH + BREAK-GLASS tests (PLAN §7).

Runs fully GREEN here with `python -m unittest` — no external server, pure stdlib.
Proves the security-critical stop-machinery holds:

  1. G1 `freeze-destructive` denies destructive/SoD but keeps benign flowing;
  2. G2 `quiesce-all` denies every agent/service token (humans + break-glass only);
  3. the §7.5 fail-closed matrix is CLOSED for gateway:execute / vault:redeem /
     board:approve / cmdb:write on ANY dependency loss, and OPEN-to-cached for
     benign reads;
  4. break-glass is STRUCTURALLY refused any action-side holder scope;
  5. break-glass STOP enacts (safe direction) while RESTORE is marked/logged;
  6. automated guardrails may only move toward LESS real-world action;
  7. write-before-ack ordering + monotonic epoch on the kill write path;
  8. single-use / time-boxed / auto-revoke + the loud audit/broadcast/needs_review
     artifacts; the VISIBLE-ABSENCE guarantees.
"""
from __future__ import annotations

import unittest

from auth.core import scopes as S
from auth.core.principals import (
    KIND_AGENT,
    KIND_BREAK_GLASS,
    KIND_HUMAN,
    KIND_SERVICE,
)
from auth.store.memory_hot import MemoryHotStore
from auth.store.sqlite_store import SQLiteStore

from auth.killswitch import killswitch as KS
from auth.killswitch import breakglass as BG
from auth.killswitch.killswitch import (
    CLASS_DESTRUCTIVE_EXEC,
    CLASS_PROPOSE,
    CLASS_READ,
    CLASS_SOD_CRITICAL,
    CLASS_WRITE_BENIGN,
    DECISION_CLOSED,
    DECISION_OPEN,
    DEP_JWKS,
    DEP_LIVE_PDP,
    DEP_NONE,
    DEP_REDIS,
    DEP_TIMEOUT,
    KILL_G0,
    KILL_G1,
    KILL_G2,
    KillSwitchController,
    action_class_for_scope,
    fail_closed_matrix,
    killswitch_denies,
)
from auth.killswitch.breakglass import (
    DIRECTION_RESTORE,
    DIRECTION_STOP,
    OP_ENGAGE_KILL,
    OP_LIFT_KILL,
    OP_REENABLE_AGENT,
    OP_REVOKE_PRINCIPAL,
    BreakGlassAuthError,
    BreakGlassConsumed,
    BreakGlassController,
    BreakGlassExpired,
    BreakGlassScopeForbidden,
)


# ---------------------------------------------------------------------------
# Test doubles (my own — no sibling-package imports).
# ---------------------------------------------------------------------------

class _RecordingLedger:
    """A minimal Store-shaped ledger sink that records append_audit calls and the
    global order in which durable / hot operations happen (for write-before-ack)."""

    def __init__(self, order_log):
        self.events = []
        self._order = order_log

    def append_audit(self, event):
        self.events.append(event)
        self._order.append(("ledger_append", event.get("scope_type") or event.get("event")))


class _FailingHot(MemoryHotStore):
    """A HotStore whose set_killswitch raises — to prove no ack precedes commit."""

    def __init__(self, order_log):
        super().__init__()
        self._order = order_log

    def set_killswitch(self, level, epoch):
        self._order.append(("hot_set", level))
        raise RuntimeError("simulated authoritative-SET failure")


class _OrderedHot(MemoryHotStore):
    def __init__(self, order_log):
        super().__init__()
        self._order = order_log

    def set_killswitch(self, level, epoch):
        self._order.append(("hot_set", level))
        super().set_killswitch(level, epoch)


# ===========================================================================
# 1. G1 freeze-destructive
# ===========================================================================

class TestG1FreezeDestructive(unittest.TestCase):
    def test_g1_denies_destructive_allows_benign(self):
        # Destructive / SoD-critical classes are frozen suite-wide.
        self.assertTrue(killswitch_denies(KILL_G1, CLASS_DESTRUCTIVE_EXEC, KIND_AGENT))
        self.assertTrue(killswitch_denies(KILL_G1, CLASS_SOD_CRITICAL, KIND_AGENT))
        # Benign reads / writes / planning keep flowing.
        self.assertFalse(killswitch_denies(KILL_G1, CLASS_READ, KIND_AGENT))
        self.assertFalse(killswitch_denies(KILL_G1, CLASS_WRITE_BENIGN, KIND_AGENT))
        self.assertFalse(killswitch_denies(KILL_G1, CLASS_PROPOSE, KIND_AGENT))

    def test_g1_via_scope_mapping(self):
        # gateway:execute is destructive -> denied; board:read is benign -> allowed.
        self.assertTrue(
            killswitch_denies(KILL_G1, action_class_for_scope(S.GATEWAY_EXECUTE), KIND_AGENT)
        )
        self.assertTrue(
            killswitch_denies(KILL_G1, action_class_for_scope(S.VAULT_READ_CREDENTIAL), KIND_AGENT)
        )
        self.assertTrue(
            killswitch_denies(KILL_G1, action_class_for_scope(S.BOARD_APPROVE), KIND_AGENT)
        )
        self.assertFalse(
            killswitch_denies(KILL_G1, action_class_for_scope(S.BOARD_READ), KIND_AGENT)
        )

    def test_controller_blocks_reflects_current_level(self):
        hot = MemoryHotStore()
        ks = KillSwitchController(SQLiteStore(), hot)
        # G0: nothing blocked.
        self.assertTrue(ks.blocks(CLASS_DESTRUCTIVE_EXEC, KIND_AGENT).allowed)
        ks.arm(KILL_G1, issued_by="op:eide", reason="stop the hands")
        dec = ks.blocks(CLASS_DESTRUCTIVE_EXEC, KIND_AGENT)
        self.assertFalse(dec.allowed)
        self.assertEqual(dec.level, KILL_G1)
        self.assertTrue(ks.blocks(CLASS_READ, KIND_AGENT).allowed)


# ===========================================================================
# 2. G2 quiesce-all
# ===========================================================================

class TestG2QuiesceAll(unittest.TestCase):
    def test_g2_denies_all_agent_tokens(self):
        # Every class, agent principal -> denied, even benign reads.
        for cls in (CLASS_READ, CLASS_WRITE_BENIGN, CLASS_PROPOSE, CLASS_SOD_CRITICAL,
                    CLASS_DESTRUCTIVE_EXEC):
            self.assertTrue(killswitch_denies(KILL_G2, cls, KIND_AGENT), cls)
        # Service principals are machine identities too -> denied under quiesce.
        self.assertTrue(killswitch_denies(KILL_G2, CLASS_READ, KIND_SERVICE))

    def test_g2_allows_humans_and_break_glass(self):
        self.assertFalse(killswitch_denies(KILL_G2, CLASS_READ, KIND_HUMAN))
        self.assertFalse(killswitch_denies(KILL_G2, CLASS_DESTRUCTIVE_EXEC, KIND_BREAK_GLASS))

    def test_break_glass_never_frozen(self):
        # break-glass STOP/RESTORE control-plane survives even a G2.
        for level in (KILL_G0, KILL_G1, KILL_G2):
            self.assertFalse(killswitch_denies(level, CLASS_SOD_CRITICAL, KIND_BREAK_GLASS))


# ===========================================================================
# 3. Fail-closed matrix (§7.5)
# ===========================================================================

class TestFailClosedMatrix(unittest.TestCase):
    _DEP_LOSSES = (DEP_LIVE_PDP, DEP_REDIS, DEP_JWKS, DEP_TIMEOUT)

    def test_destructive_and_sod_closed_on_any_dep_loss(self):
        for scope in (S.GATEWAY_EXECUTE, S.VAULT_READ_CREDENTIAL, S.BOARD_APPROVE,
                      S.CMDB_WRITE_POLICY):
            cls = action_class_for_scope(scope)
            self.assertIn(cls, (CLASS_DESTRUCTIVE_EXEC, CLASS_SOD_CRITICAL))
            for dep in self._DEP_LOSSES:
                self.assertEqual(
                    fail_closed_matrix(cls, dep, has_cached_jwt=True, has_cached_jwks=True),
                    DECISION_CLOSED,
                    f"{scope} under {dep} must be CLOSED",
                )

    def test_benign_reads_open_to_cached_except_jwks(self):
        # Reads fail OPEN to the cached JWT on PDP/Redis/timeout loss.
        for dep in (DEP_LIVE_PDP, DEP_REDIS, DEP_TIMEOUT):
            self.assertEqual(fail_closed_matrix(CLASS_READ, dep), DECISION_OPEN)
        # JWKS loss: reads OPEN only if a valid cached key set is held, else CLOSED.
        self.assertEqual(
            fail_closed_matrix(CLASS_READ, DEP_JWKS, has_cached_jwks=True), DECISION_OPEN
        )
        self.assertEqual(
            fail_closed_matrix(CLASS_READ, DEP_JWKS, has_cached_jwks=False), DECISION_CLOSED
        )

    def test_benign_writes_fail_open_except_jwks(self):
        # Mutating benign writes fail-open to cached JWT on PDP/timeout; open on Redis.
        self.assertEqual(fail_closed_matrix(CLASS_WRITE_BENIGN, DEP_REDIS), DECISION_OPEN)
        self.assertEqual(
            fail_closed_matrix(CLASS_WRITE_BENIGN, DEP_LIVE_PDP, has_cached_jwt=True), DECISION_OPEN
        )
        self.assertEqual(
            fail_closed_matrix(CLASS_WRITE_BENIGN, DEP_LIVE_PDP, has_cached_jwt=False),
            DECISION_CLOSED,
        )
        # JWKS loss closes mutating writes hard.
        self.assertEqual(fail_closed_matrix(CLASS_WRITE_BENIGN, DEP_JWKS), DECISION_CLOSED)
        self.assertEqual(fail_closed_matrix(CLASS_PROPOSE, DEP_JWKS), DECISION_CLOSED)

    def test_dep_none_proceeds(self):
        # No dependency lost -> matrix does not fail anything closed.
        self.assertEqual(fail_closed_matrix(CLASS_READ, DEP_NONE), DECISION_OPEN)
        self.assertEqual(fail_closed_matrix(CLASS_DESTRUCTIVE_EXEC, DEP_NONE), DECISION_OPEN)

    def test_rejects_bad_inputs(self):
        with self.assertRaises(ValueError):
            fail_closed_matrix("bogus-class", DEP_REDIS)
        with self.assertRaises(ValueError):
            fail_closed_matrix(CLASS_READ, "bogus-dep")


# ===========================================================================
# 4. Break-glass structurally refused any action-side holder scope
# ===========================================================================

class TestBreakGlassNoActionSide(unittest.TestCase):
    def test_scope_set_is_disjoint_from_action_side(self):
        self.assertTrue(BG.BREAK_GLASS_SCOPES.isdisjoint(S.ACTION_SIDE))
        # It holds neither gateway:execute nor vault:read-credential.
        self.assertNotIn(S.GATEWAY_EXECUTE, BG.BREAK_GLASS_SCOPES)
        self.assertNotIn(S.VAULT_READ_CREDENTIAL, BG.BREAK_GLASS_SCOPES)
        # It DOES hold the allowed governance pair + kill control.
        self.assertIn(S.BOARD_APPROVE, BG.BREAK_GLASS_SCOPES)
        self.assertIn(S.CMDB_WRITE_POLICY, BG.BREAK_GLASS_SCOPES)

    def test_assert_helper_refuses_action_side(self):
        BG.assert_break_glass_holds_no_action_side({S.BOARD_APPROVE, S.CMDB_WRITE_POLICY})  # ok
        with self.assertRaises(BreakGlassScopeForbidden):
            BG.assert_break_glass_holds_no_action_side({S.GATEWAY_EXECUTE})
        with self.assertRaises(BreakGlassScopeForbidden):
            BG.assert_break_glass_holds_no_action_side({S.VAULT_READ_CREDENTIAL})

    def test_session_refuses_execute_and_redeem_operations(self):
        hot = MemoryHotStore()
        ctl = BreakGlassController(SQLiteStore(), hot)
        # Attempt to route execute / redeem through STOP -> structural refusal.
        sess = ctl.begin("hw-factor", invoked_by="op:eide")
        with self.assertRaises(BreakGlassScopeForbidden):
            sess.stop(S.GATEWAY_EXECUTE, reason="malice")
        # Session was not consumed by a refused op (refusal precedes marking used).
        self.assertFalse(sess.used)
        sess2 = ctl.begin("hw-factor", invoked_by="op:eide")
        with self.assertRaises(BreakGlassScopeForbidden):
            sess2.stop("redeem_handle", reason="malice")

    def test_visible_absence_facts(self):
        # There is NO capability to act or to relax approve/execute — hardcoded False.
        self.assertFalse(BG.breakglass_can_cause_action())
        self.assertFalse(BG.relaxing_sod_is_a_capability())
        # And no method exists on the controller to do so.
        ctl = BreakGlassController(SQLiteStore(), MemoryHotStore())
        for forbidden in ("execute", "redeem", "relax_sod", "grant_execute", "approve_and_execute"):
            self.assertFalse(hasattr(ctl, forbidden), f"controller must not expose {forbidden!r}")


# ===========================================================================
# 5. Break-glass STOP enacts; RESTORE is logged/reviewed
# ===========================================================================

class TestBreakGlassStopRestore(unittest.TestCase):
    def test_stop_engage_kill_enacts_and_is_not_review_gated(self):
        hot = MemoryHotStore()
        ledger = SQLiteStore()
        ctl = BreakGlassController(ledger, hot)
        sess = ctl.begin("hw-factor", invoked_by="op:eide")
        rec = sess.stop(OP_ENGAGE_KILL, reason="suspected compromise", kill_level=KILL_G2)
        # Enacted in the safe direction: the hot kill level is now G2.
        self.assertTrue(rec.enacted)
        self.assertFalse(rec.review_required)  # stopping is never gated behind a second person
        self.assertEqual(rec.direction, DIRECTION_STOP)
        self.assertEqual(hot.killswitch()[0], KILL_G2)
        # Loud: audit line + broadcast + needs_review all produced.
        self.assertEqual(rec.audit["event"], "break_glass")
        self.assertFalse(rec.audit["holds_action_side_scope"])
        self.assertEqual(len(ctl.drain_broadcasts()), 1)
        self.assertEqual(len(ctl.drain_needs_review()), 1)

    def test_stop_revoke_principal_writes_denylist(self):
        hot = MemoryHotStore()
        ctl = BreakGlassController(SQLiteStore(), hot)
        sess = ctl.begin("hw-factor", invoked_by="op:eide", now=1000)
        sess.stop(OP_REVOKE_PRINCIPAL, reason="rogue agent", target="agent:patcher-07", now=1000)
        self.assertEqual(hot.revoked_before("agent:patcher-07"), 1000)

    def test_restore_is_logged_and_review_required(self):
        hot = MemoryHotStore()
        ledger = SQLiteStore()
        ctl = BreakGlassController(ledger, hot)
        sess = ctl.begin("hw-factor", invoked_by="op:eide")
        rec = sess.restore(OP_REENABLE_AGENT, reason="incident over", target="agent:patcher-07")
        self.assertEqual(rec.direction, DIRECTION_RESTORE)
        self.assertTrue(rec.review_required)          # RESTORE is always reviewed
        self.assertFalse(rec.enacted)                 # logged intent, not a silent mutation
        # A needs_review ticket was auto-filed and it is audited.
        reviews = ctl.drain_needs_review()
        self.assertEqual(len(reviews), 1)
        self.assertEqual(reviews[0]["status"], "awaiting_review")
        self.assertTrue(any(e.get("event") == "break_glass" for e in ledger.read_audit()))

    def test_offline_factor_required(self):
        ctl = BreakGlassController(SQLiteStore(), MemoryHotStore())
        with self.assertRaises(BreakGlassAuthError):
            ctl.begin("", invoked_by="op:eide")   # empty/missing factor rejected

    def test_single_use_and_time_boxed(self):
        hot = MemoryHotStore()
        ctl = BreakGlassController(SQLiteStore(), hot)
        # single-use: a second operation on the same session is refused.
        sess = ctl.begin("hw-factor", invoked_by="op:eide")
        sess.stop(OP_ENGAGE_KILL, reason="stop", kill_level=KILL_G1)
        with self.assertRaises(BreakGlassConsumed):
            sess.restore(OP_LIFT_KILL, reason="oops")
        # time-boxed: a session used past its deadline auto-revokes.
        sess2 = ctl.begin("hw-factor", invoked_by="op:eide", ttl_s=10, now=2000)
        with self.assertRaises(BreakGlassExpired):
            sess2.stop(OP_ENGAGE_KILL, reason="late", kill_level=KILL_G1, now=2011)
        self.assertTrue(sess2.auto_revoked)


# ===========================================================================
# 6. Automated guardrails only move toward LESS action
# ===========================================================================

class TestAutomatedGuardrailsSafeDirectionOnly(unittest.TestCase):
    def test_automated_may_escalate_toward_less_action(self):
        hot = MemoryHotStore()
        ks = KillSwitchController(SQLiteStore(), hot)
        # G0 -> G1 (more restrictive) is allowed for an automated guardrail.
        ack = ks.arm(KILL_G1, issued_by="automated:loop-detector", reason="no-progress loop",
                     automated=True)
        self.assertEqual(ack.level, KILL_G1)
        # G1 -> G2 (even more restrictive) allowed.
        ks.arm(KILL_G2, issued_by="automated:loop-detector", reason="persist", automated=True)
        self.assertEqual(hot.killswitch()[0], KILL_G2)

    def test_automated_may_not_move_toward_more_action(self):
        hot = MemoryHotStore()
        ks = KillSwitchController(SQLiteStore(), hot)
        ks.arm(KILL_G2, issued_by="op:eide", reason="quiesce")
        # An automated guardrail may NOT lift/loosen a kill (that is operator-only).
        with self.assertRaises(ValueError):
            ks.arm(KILL_G1, issued_by="automated:x", reason="loosen", automated=True)
        with self.assertRaises(ValueError):
            ks.arm(KILL_G0, issued_by="automated:x", reason="lift", automated=True)
        # The operator (non-automated) MAY lift it.
        ack = ks.arm(KILL_G0, issued_by="op:eide", reason="all clear")
        self.assertEqual(ack.level, KILL_G0)

    def test_mint_anomaly_auto_freeze_uses_safe_revoke(self):
        # The §7.8 mint-anomaly guardrail auto-revokes the client key in the safe
        # direction — a revoke never releases action.
        hot = MemoryHotStore()
        ks = KillSwitchController(SQLiteStore(), hot)
        ks.disable_client("agent:patcher-07", issued_by="automated:mint-anomaly",
                          reason="off-host mint burst")
        self.assertTrue(hot.is_client_disabled("agent:patcher-07"))


# ===========================================================================
# 7. Write-before-ack ordering + monotonic epoch
# ===========================================================================

class TestWriteBeforeAckAndEpoch(unittest.TestCase):
    def test_durable_append_precedes_hot_set(self):
        order = []
        ledger = _RecordingLedger(order)
        hot = _OrderedHot(order)
        ks = KillSwitchController(ledger, hot)
        ack = ks.arm(KILL_G1, issued_by="op:eide", reason="freeze")
        self.assertTrue(ack.committed)
        # Ordering: ledger append happened BEFORE the authoritative hot SET.
        kinds = [k for k, _ in order]
        self.assertEqual(kinds.index("ledger_append") < kinds.index("hot_set"), True)
        # The ledger recorded a global revocation-ledger entry.
        self.assertEqual(ledger.events[0]["event"], "revocation_ledger")
        self.assertEqual(ledger.events[0]["scope_type"], "global")

    def test_no_ack_if_hot_set_fails_but_ledger_is_durable(self):
        order = []
        ledger = _RecordingLedger(order)
        hot = _FailingHot(order)
        ks = KillSwitchController(ledger, hot)
        # The authoritative SET fails -> no ack is returned (exception propagates)...
        with self.assertRaises(RuntimeError):
            ks.arm(KILL_G2, issued_by="op:eide", reason="quiesce")
        # ...but the durable ledger append already committed first (finding 2d: a
        # durably-recorded kill never depends on the hot SET to be true).
        self.assertEqual(len(ledger.events), 1)
        self.assertEqual(ledger.events[0]["mode"], "quiesce-all")

    def test_kill_epoch_is_monotonic(self):
        hot = MemoryHotStore()
        ks = KillSwitchController(SQLiteStore(), hot)
        e1 = ks.arm(KILL_G1, issued_by="op", reason="a").epoch
        e2 = ks.arm(KILL_G2, issued_by="op", reason="b").epoch
        e3 = ks.arm(KILL_G1, issued_by="op", reason="c").epoch
        self.assertLess(e1, e2)
        self.assertLess(e2, e3)
        self.assertEqual(hot.killswitch(), (KILL_G1, e3))

    def test_ledger_ttl_hint_covers_max_token_ttl(self):
        # ttl_hint must be >= the longest token TTL band so a JWT never outlives its
        # denylist entry (§4.2 / §7.2). Default covers the 8h SSO-max band.
        hot = MemoryHotStore()
        ks = KillSwitchController(SQLiteStore(), hot)
        ack = ks.arm(KILL_G1, issued_by="op", reason="x")
        self.assertGreaterEqual(ack.entry.ttl_hint, 8 * 60 * 60)


if __name__ == "__main__":
    unittest.main(verbosity=2)
