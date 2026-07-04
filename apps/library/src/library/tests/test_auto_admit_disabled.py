"""End-to-end: the auto-admit lane is code-path DISABLED pre-D7 go-live, and there is
no propose→admitted path that bypasses the content-bound gate."""
import unittest

from library.tests.helpers import temp_service, opener_for
from library.ingest.fetcher import Fetcher

RUN = "R-01J000000000000000000000AA"
HV = "hv-0123456789ab"
URL = "https://example.org/lvextend"
MD = "# lvextend\n\n## Growing a volume\n\nRun lvextend to grow.\n"


class FakeGateway:
    def __init__(self, evidence):
        self._ev = evidence

    def get_sandbox_evidence(self, run_id):
        return self._ev if self._ev and self._ev.get("run_id") == run_id else None


def _propose_with_evidence(svc):
    svc.fetcher = Fetcher(opener=opener_for({URL: MD}))
    r = svc.propose(sub="agent:curator-1", op_id="op-1", source_url=URL, kind="man-page",
                    ticket_id="T-000123")
    doc_id = r["doc_id"]
    svc.attach_sandbox_evidence(sub="agent:curator-1", op_id="op-2", doc_id=doc_id,
                                run_id=RUN, harness_version=HV)
    return doc_id


class TestAutoAdmitDisabled(unittest.TestCase):
    def test_lane_disabled_even_with_valid_gateway_evidence(self):
        with temp_service(auto_admit=False) as svc:  # lane OFF (default)
            doc_id = _propose_with_evidence(svc)
            sha = svc.store.get(doc_id).meta["content_sha256"]
            # Even if a gateway would validate, the lane is OFF → never auto-admit.
            svc.gateway = FakeGateway({"run_id": RUN, "harness_version": HV, "exit_status": 0,
                                       "ticket_id": "T-000123", "content_sha256": sha})
            out = svc.request_admission(sub="agent:curator-1", op_id="op-3", doc_id=doc_id)
            self.assertEqual(out["outcome"], "queued_for_review")
            self.assertEqual(svc.store.get(doc_id).meta["admission"], "review_pending")

    def test_agent_asserted_never_admits_even_with_lane_on(self):
        with temp_service(auto_admit=True) as svc:       # lane ON
            svc.gateway = None                           # but Gateway unreachable
            doc_id = _propose_with_evidence(svc)
            out = svc.request_admission(sub="agent:curator-1", op_id="op-3", doc_id=doc_id)
            # no gateway_delivered evidence could be minted → never admitted by assertion
            self.assertNotEqual(out["outcome"], "admitted")
            self.assertNotEqual(svc.store.get(doc_id).meta["admission"], "admitted")

    def test_lane_on_with_validated_gateway_evidence_admits(self):
        with temp_service(auto_admit=True) as svc:
            doc_id = _propose_with_evidence(svc)
            sha = svc.store.get(doc_id).meta["content_sha256"]
            svc.gateway = FakeGateway({"run_id": RUN, "harness_version": HV, "exit_status": 0,
                                       "ticket_id": "T-000123", "input_ref": f"{doc_id}@rev1",
                                       "covered_anchors": ["growing-a-volume"]})
            out = svc.request_admission(sub="agent:curator-1", op_id="op-3", doc_id=doc_id)
            self.assertEqual(out["outcome"], "admitted")
            meta = svc.store.get(doc_id).meta
            self.assertEqual(meta["admission"], "admitted")
            self.assertEqual(meta["tier"], "sandbox-verified")
            # the gateway_delivered entry was SERVICE-minted (not the agent's claim)
            kinds = [(e["kind"], e["attestation"]) for e in meta["verification"]]
            self.assertIn(("sandbox", "gateway_delivered"), kinds)
            self.assertIn(("sandbox", "agent_asserted"), kinds)

    def test_gateway_evidence_for_other_doc_does_not_admit(self):
        # a real sandbox run bound to a DIFFERENT doc/input must not admit this one
        with temp_service(auto_admit=True) as svc:
            doc_id = _propose_with_evidence(svc)
            svc.gateway = FakeGateway({"run_id": RUN, "harness_version": HV, "exit_status": 0,
                                       "input_ref": "lib-SOMEOTHERDOC-revision"})
            out = svc.request_admission(sub="agent:curator-1", op_id="op-3", doc_id=doc_id)
            self.assertNotEqual(out["outcome"], "admitted")

    def test_gateway_evidence_without_input_ref_does_not_admit(self):
        # no input_ref ⇒ evidence cannot be bound to this doc ⇒ must not admit (D1)
        with temp_service(auto_admit=True) as svc:
            doc_id = _propose_with_evidence(svc)
            svc.gateway = FakeGateway({"run_id": RUN, "harness_version": HV, "exit_status": 0})
            out = svc.request_admission(sub="agent:curator-1", op_id="op-3", doc_id=doc_id)
            self.assertNotEqual(out["outcome"], "admitted")

    def test_gateway_harness_mismatch_does_not_admit(self):
        with temp_service(auto_admit=True) as svc:
            doc_id = _propose_with_evidence(svc)
            svc.gateway = FakeGateway({"run_id": RUN, "harness_version": "hv-ffffffffffff",
                                       "exit_status": 0})
            out = svc.request_admission(sub="agent:curator-1", op_id="op-3", doc_id=doc_id)
            self.assertNotEqual(out["outcome"], "admitted")

    def test_no_mcp_admin_tool_exists(self):
        from library.mcp.surface import TOOL_NAMES
        for forbidden in ("review_decision", "retire", "supersede", "reindex",
                          "collections_write", "admit", "library_admit"):
            self.assertNotIn(forbidden, TOOL_NAMES,
                             "there must be NO MCP path to admitted/admin operations")


if __name__ == "__main__":
    unittest.main()
