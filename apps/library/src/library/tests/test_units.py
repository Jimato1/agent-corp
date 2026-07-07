"""Unit tests: SSRF guard, frontmatter round-trip, chunker determinism, ID validators."""
import unittest

from library.ingest.fetcher import is_public_ip, html_to_markdown
from library.corpus import frontmatter as fm
from library.index import chunker as ck
from library import ids


class TestSSRF(unittest.TestCase):
    def test_private_and_loopback_blocked(self):
        for bad in ("127.0.0.1", "10.0.0.5", "192.168.1.1", "169.254.1.1", "::1",
                    "0.0.0.0", "172.16.0.1"):
            self.assertFalse(is_public_ip(bad), f"{bad} must be non-public")

    def test_public_allowed(self):
        for good in ("1.1.1.1", "8.8.8.8", "93.184.216.34"):
            self.assertTrue(is_public_ip(good))

    def test_html_to_markdown_drops_scripts(self):
        md = html_to_markdown("<h1>Title</h1><script>evil()</script><p>hello</p>")
        self.assertIn("# Title", md)
        self.assertIn("hello", md)
        self.assertNotIn("evil", md)


class TestFrontmatter(unittest.TestCase):
    def test_round_trip_nested(self):
        meta = {"id": "lib-X", "applies_to": [{"os_family": "linux", "version": "24.04"}],
                "verification": [{"kind": "sandbox", "attestation": "agent_asserted"}],
                "valid_until": None, "content_sha256": "abc"}
        body = "# Doc\n\nbody line\n"
        text = fm.compose(meta, body)
        m2, b2 = fm.parse(text)
        self.assertEqual(m2, meta)
        self.assertEqual(b2, body)

    def test_body_hash_excludes_frontmatter(self):
        b = "same body\n"
        self.assertEqual(fm.body_sha256(b), fm.body_sha256(b))


class TestChunker(unittest.TestCase):
    def test_deterministic(self):
        body = "# tar\n\n## OPTIONS\n\n--exclude skip\n\n--verbose loud\n"
        a = ck.chunk_document(title="tar", version_scope="1.35", kind="man-page", body=body)
        b = ck.chunk_document(title="tar", version_scope="1.35", kind="man-page", body=body)
        self.assertEqual([c.content_hash for c in a], [c.content_hash for c in b])
        self.assertGreater(len(a), 0)

    def test_manpage_options_split_per_flag(self):
        long_opts = "\n\n".join(f"--flag{i} description number {i} " + "word " * 60 for i in range(20))
        body = f"# cmd\n\n## OPTIONS\n\n{long_opts}\n"
        chunks = ck.chunk_document(title="cmd", version_scope="1", kind="man-page", body=body)
        # per-flag splitting produced multiple option chunks
        self.assertGreater(len([c for c in chunks if "OPTIONS >" in c.heading_path]), 1)

    def test_contextual_header_prepended(self):
        body = "# tar\n\n## OPTIONS\n\n--exclude skip\n"
        chunks = ck.chunk_document(title="tar", version_scope="GNU tar 1.35", kind="man-page", body=body)
        self.assertTrue(any("tar (GNU tar 1.35)" in c.embed_text for c in chunks))


class TestIDs(unittest.TestCase):
    def test_doc_id_format(self):
        d = ids.new_doc_id()
        self.assertTrue(ids.is_doc_id(d), d)
        self.assertFalse(ids.is_doc_id("lib-short"))

    def test_validators(self):
        self.assertTrue(ids.is_ticket_id("T-000123"))
        self.assertTrue(ids.is_harness_version("hv-0123456789ab"))
        self.assertFalse(ids.is_harness_version("hv-XYZ"))
        self.assertTrue(ids.is_op_id("x" * 128))
        self.assertFalse(ids.is_op_id("x" * 129))

    def test_principal_kind(self):
        self.assertEqual(ids.principal_kind("agent:c"), "agent")
        self.assertEqual(ids.principal_kind("op:ada"), "human")
        self.assertEqual(ids.principal_kind("svc:x"), "service")


if __name__ == "__main__":
    unittest.main()
