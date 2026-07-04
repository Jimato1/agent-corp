"""Rebuildable-index proof (ARCHITECTURE §10 / PLAN §5.3 part 1): destroy index.db and
rebuild from the markdown corpus → BYTE-IDENTICAL chunk manifest."""
import os
import tempfile
import unittest

from library.index.db import IndexDB
from library.tests.helpers import make_service, opener_for, FakeEmbedder
from library.ingest.fetcher import Fetcher

DOCS = {
    "https://example.org/tar": "# tar\n\n## OPTIONS\n\n--exclude skip files\n\n--verbose talk\n",
    "https://example.org/lvm": "# LVM\n\n## Resize\n\nUse lvextend then resize2fs.\n\n## Notes\n\nCareful.\n",
}


class TestRebuildable(unittest.TestCase):
    def test_destroy_and_rebuild_manifest_identical(self):
        tmp = tempfile.mkdtemp()
        svc = None
        try:
            svc = make_service(tmp)
            svc.fetcher = Fetcher(opener=opener_for(DOCS))
            for i, url in enumerate(DOCS):
                svc.propose(sub="agent:c", op_id=f"op-{i}", source_url=url, kind="man-page",
                            ticket_id="T-000001")
            before = svc.reindex(mode="full")
            manifest_before = before["manifest_hash"]

            # DESTROY the index file entirely, rebuild from corpus
            svc.index.close()
            os.remove(os.path.join(tmp, "index.db"))
            svc.index = IndexDB(os.path.join(tmp, "index.db"), svc.config.embed_dim)
            svc.index.create_schema()
            after = svc.reindex(mode="full")

            self.assertEqual(manifest_before, after["manifest_hash"],
                             "chunk manifest must be byte-identical after a full rebuild")
            self.assertEqual(before["chunk_count"], after["chunk_count"])
            self.assertGreater(after["chunk_count"], 0)
        finally:
            if svc is not None:
                svc.index.close()
                svc.ops.close()
            import shutil
            shutil.rmtree(tmp, ignore_errors=True)

    def test_chunker_config_id_stable(self):
        from library.index.chunker import chunker_config_id
        self.assertEqual(chunker_config_id(), chunker_config_id())
        self.assertTrue(chunker_config_id().startswith("cc-"))


if __name__ == "__main__":
    unittest.main()
