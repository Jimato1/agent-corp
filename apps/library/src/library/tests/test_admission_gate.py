"""The crown-jewel test: the content-bound admission gate (PLAN §2.2 / §12.1).

Adversarial unit tests over the PURE predicate — no I/O — proving that no agreement
count and no agent judgment reaches the trusted tier.
"""
import unittest

from library.ingest import admission as A


SHA = "a" * 64
OTHER = "b" * 64


def sandbox(attestation, sha=SHA, hv="hv-0123456789ab", run="R-0"):
    return {"kind": "sandbox", "attestation": attestation, "attested_content_sha256": sha,
            "harness_version": hv, "run_id": run}


def crossref(n):
    return {"kind": "crossref", "distinct_origins": n, "attestation": "agent_asserted"}


class TestGatePredicate(unittest.TestCase):
    def test_agent_asserted_never_satisfies(self):
        meta = {"content_sha256": SHA, "verification": [sandbox("agent_asserted")]}
        ok, _ = A.sandbox_gate_satisfied(meta)
        self.assertFalse(ok, "agent-asserted evidence must NEVER satisfy the gate")

    def test_gateway_delivered_content_bound_satisfies(self):
        meta = {"content_sha256": SHA, "verification": [sandbox("gateway_delivered")]}
        ok, _ = A.sandbox_gate_satisfied(meta)
        self.assertTrue(ok)

    def test_content_binding_required(self):
        # gateway-delivered but attesting a DIFFERENT byte-state ⇒ not content-bound
        meta = {"content_sha256": SHA, "verification": [sandbox("gateway_delivered", sha=OTHER)]}
        ok, _ = A.sandbox_gate_satisfied(meta)
        self.assertFalse(ok)

    def test_missing_harness_version_does_not_satisfy(self):
        e = sandbox("gateway_delivered")
        e["harness_version"] = ""
        meta = {"content_sha256": SHA, "verification": [e]}
        ok, _ = A.sandbox_gate_satisfied(meta)
        self.assertFalse(ok)

    def test_no_agreement_count_ever_admits(self):
        # 999 cross-referenced origins is still NOT admission
        meta = {"content_sha256": SHA, "verification": [crossref(999)]}
        ok, _ = A.sandbox_gate_satisfied(meta)
        self.assertFalse(ok)
        d = A.evaluate(meta, auto_admit_enabled=True, min_distinct=3)
        self.assertNotEqual(d.outcome, A.Outcome.AUTO_ADMIT)
        self.assertEqual(d.outcome, A.Outcome.QUEUE_REVIEW)

    def test_evaluate_auto_admit_requires_lane_enabled(self):
        meta = {"content_sha256": SHA, "verification": [sandbox("gateway_delivered")]}
        # lane OFF: satisfied gate STILL does not auto-admit — routes to operator
        d_off = A.evaluate(meta, auto_admit_enabled=False, min_distinct=3)
        self.assertEqual(d_off.outcome, A.Outcome.QUEUE_REVIEW)
        self.assertTrue(d_off.gate_satisfied)
        # lane ON: satisfied gate auto-admits
        d_on = A.evaluate(meta, auto_admit_enabled=True, min_distinct=3)
        self.assertEqual(d_on.outcome, A.Outcome.AUTO_ADMIT)

    def test_agent_asserted_sandbox_routes_to_review_never_admit(self):
        meta = {"content_sha256": SHA, "verification": [sandbox("agent_asserted")]}
        for lane in (True, False):
            d = A.evaluate(meta, auto_admit_enabled=lane, min_distinct=3)
            self.assertNotEqual(d.outcome, A.Outcome.AUTO_ADMIT)

    def test_no_evidence_stays_quarantined(self):
        meta = {"content_sha256": SHA, "verification": []}
        d = A.evaluate(meta, auto_admit_enabled=True, min_distinct=3)
        self.assertEqual(d.outcome, A.Outcome.QUARANTINE)

    def test_run_id_binding_one_doc(self):
        seen = {"R-0": ("lib-DOC1", SHA)}
        self.assertTrue(A.run_id_binding_ok("lib-DOC1", SHA, "R-0", seen))
        self.assertFalse(A.run_id_binding_ok("lib-DOC2", SHA, "R-0", seen),
                         "one run_id must bind to exactly one (doc_id, content_sha)")


if __name__ == "__main__":
    unittest.main()
