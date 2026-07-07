"""Retrieval: version-scoped filtering (old-distro doc must not answer for a new host),
scope conflict, tier/taint envelope, degraded modes."""
import unittest

from library.errors import ScopeConflict
from library.tests.helpers import temp_service, opener_for
from library.ingest.fetcher import Fetcher


def _admit(svc, doc_id, applies_to):
    """Force a doc to admitted with explicit applies_to targets (operator path)."""
    rec = svc.store.get(doc_id)
    rec.meta["applies_to"] = applies_to
    svc.store.rewrite_frontmatter(doc_id, rec.meta, sub="op:test")
    svc.operator_decision(sub="op:ada", doc_id=doc_id, decision="admit", op_id=f"adm-{doc_id}")
    svc.reindex(mode="full")


class TestRetrieval(unittest.TestCase):
    def test_version_filter_excludes_wrong_distro(self):
        with temp_service() as svc:
            svc.fetcher = Fetcher(opener=opener_for({
                "https://x/u22": "# netplan 22\n\n## apply\n\nnetplan apply on ubuntu 22.04\n",
                "https://x/u24": "# netplan 24\n\n## apply\n\nnetplan apply on ubuntu 24.04\n",
            }))
            d22 = svc.propose(sub="agent:c", op_id="o1", source_url="https://x/u22",
                              kind="prose-guide", ticket_id="T-000001")["doc_id"]
            d24 = svc.propose(sub="agent:c", op_id="o2", source_url="https://x/u24",
                              kind="prose-guide", ticket_id="T-000002")["doc_id"]
            _admit(svc, d22, [{"os_family": "linux", "distro": "ubuntu", "version": "22.04",
                               "arch": "amd64", "lifecycle": "current"}])
            _admit(svc, d24, [{"os_family": "linux", "distro": "ubuntu", "version": "24.04",
                               "arch": "amd64", "lifecycle": "current"}])
            # query scoped to 24.04 must NOT return the 22.04 doc as exact
            resp = svc.search(query="netplan apply", target={
                "os_family": "linux", "distro": "ubuntu", "major_version": "24.04", "arch": "amd64"})
            doc_ids = {r["doc_id"] for r in resp["results"]}
            self.assertIn(d24, doc_ids)
            self.assertNotIn(d22, doc_ids, "an old-distro doc must not answer for a new host")
            for r in resp["results"]:
                self.assertEqual(r["version_scope"], "exact")
                self.assertEqual(r["provenance_taint"], "curation-ingested")

    def test_scope_conflict_is_typed(self):
        with temp_service() as svc:
            with self.assertRaises(ScopeConflict):
                svc.search(query="x", host_id="host-1",
                           target={"os_family": "linux"})

    def test_no_scope_flags_unverified(self):
        with temp_service() as svc:
            svc.fetcher = Fetcher(opener=opener_for({"https://x/a": "# A\n\ncontent about foo\n"}))
            d = svc.propose(sub="agent:c", op_id="o1", source_url="https://x/a",
                            kind="prose-guide", ticket_id="T-000001")["doc_id"]
            _admit(svc, d, [{"os_family": "linux", "distro": "ubuntu", "version": "24.04",
                             "arch": "amd64", "lifecycle": "current"}])
            resp = svc.search(query="foo")  # no scope
            self.assertEqual(resp["version_scope_source"], "none")
            for r in resp["results"]:
                self.assertEqual(r["version_scope"], "unverified")

    def test_rejected_never_returned(self):
        with temp_service() as svc:
            svc.fetcher = Fetcher(opener=opener_for({"https://x/p": "# P\n\npoison unique-token-zzz\n"}))
            d = svc.propose(sub="agent:c", op_id="o1", source_url="https://x/p",
                            kind="prose-guide", ticket_id="T-000001")["doc_id"]
            svc.operator_decision(sub="op:ada", doc_id=d, decision="reject", op_id="rj-1")
            # even with include_unverified, rejected is excluded unconditionally
            resp = svc.search(query="unique-token-zzz", include_unverified=True)
            self.assertEqual([r for r in resp["results"] if r["doc_id"] == d], [])


if __name__ == "__main__":
    unittest.main()
