"""MCP + Core API dispatch: two views over one state, flat schemas, no trusted-tier
bypass, propose lands quarantine, replay idempotency."""
import json
import unittest

from library.tests.helpers import temp_service, opener_for
from library.ingest.fetcher import Fetcher
from library.mcp.surface import MCPSurface, TOOLS, TOOL_NAMES
from library.api.core_api import CoreAPI
from library.authz.rs import RSMiddleware
from library.config import Config


def _debug_headers(sub, scopes):
    return {"X-Debug-Sub": sub, "X-Debug-Scopes": scopes}


def _wire(svc):
    cfg = svc.config
    cfg.allow_debug_principal = True
    rs = RSMiddleware(cfg)
    return CoreAPI(svc, rs, svc.ops), MCPSurface(svc, rs, svc.ops)


class TestMCP(unittest.TestCase):
    def test_tool_schemas_flat_and_closed(self):
        for t in TOOLS:
            sch = t["inputSchema"]
            self.assertFalse(sch.get("additionalProperties", True))
            for name, spec in sch["properties"].items():
                # flat: only scalar types + the two flagged arrays
                self.assertIn(spec["type"], ("string", "integer", "boolean", "array"))
                if spec["type"] == "array":
                    self.assertEqual(name, "source_urls")
                    self.assertEqual(spec["items"]["type"], "string")

    def test_no_admin_tools_on_mcp(self):
        for forbidden in ("review_decision", "retire", "supersede", "reindex", "collections_write"):
            self.assertNotIn(forbidden, TOOL_NAMES)

    def test_tools_list_and_initialize(self):
        with temp_service() as svc:
            _core, mcp = _wire(svc)
            st, obj, _ = mcp.handle("POST", "/mcp", {}, json.dumps(
                {"jsonrpc": "2.0", "id": 1, "method": "initialize"}).encode())
            self.assertEqual(obj["result"]["protocolVersion"], "2025-11-25")
            st, obj, _ = mcp.handle("POST", "/mcp", {}, json.dumps(
                {"jsonrpc": "2.0", "id": 2, "method": "tools/list"}).encode())
            names = {t["name"] for t in obj["result"]["tools"]}
            self.assertEqual(names, TOOL_NAMES)

    def test_propose_via_mcp_lands_quarantine_never_trusted(self):
        with temp_service() as svc:
            svc.fetcher = Fetcher(opener=opener_for({"https://x/a": "# A\n\nbody\n"}))
            _core, mcp = _wire(svc)
            call = {"jsonrpc": "2.0", "id": 3, "method": "tools/call",
                    "params": {"name": "library_propose", "arguments": {
                        "op_id": "op-1", "source_url": "https://x/a", "kind": "man-page",
                        "ticket_id": "T-000001"}}}
            st, obj, _ = mcp.handle("POST", "/mcp", _debug_headers("agent:c", "library:propose"),
                                    json.dumps(call).encode())
            self.assertEqual(st, 200)
            res = obj["result"]["structuredContent"]
            self.assertEqual(res["admission"], "quarantined")
            self.assertEqual(res["tier"], "single-source")

    def test_mcp_scope_denied_without_scope(self):
        with temp_service() as svc:
            _core, mcp = _wire(svc)
            call = {"jsonrpc": "2.0", "id": 4, "method": "tools/call",
                    "params": {"name": "library_propose", "arguments": {
                        "op_id": "op-1", "source_url": "https://x/a", "kind": "man-page",
                        "ticket_id": "T-000001"}}}
            st, obj, _ = mcp.handle("POST", "/mcp", _debug_headers("agent:c", "library:read"),
                                    json.dumps(call).encode())
            self.assertTrue(obj["result"]["isError"])

    def test_api_idempotent_replay(self):
        with temp_service() as svc:
            svc.fetcher = Fetcher(opener=opener_for({"https://x/a": "# A\n\nbody\n"}))
            core, _mcp = _wire(svc)
            body = json.dumps({"op_id": "op-9", "source_url": "https://x/a", "kind": "man-page",
                               "ticket_id": "T-000001"}).encode()
            h = _debug_headers("agent:c", "library:propose")
            st1, o1, _ = core.handle("POST", "/api/proposals", h, body)
            st2, o2, _ = core.handle("POST", "/api/proposals", h, body)
            self.assertEqual(o1["doc_id"], o2["doc_id"], "replay must collapse to prior result")

    def test_mcp_target_version_param_is_wired(self):
        # D2 regression: the schema `target_version` param must actually reach the
        # major_version scope filter (not be silently dropped).
        with temp_service() as svc:
            svc.fetcher = Fetcher(opener=opener_for({"https://x/v": "# netplan\n\n## apply\n\napply netplan on 24.04\n"}))
            _core, mcp = _wire(svc)
            d = svc.propose(sub="agent:c", op_id="o1", source_url="https://x/v",
                            kind="prose-guide", ticket_id="T-000001")["doc_id"]
            rec = svc.store.get(d)
            rec.meta["applies_to"] = [{"os_family": "linux", "distro": "ubuntu",
                                       "version": "24.04", "arch": "amd64", "lifecycle": "current"}]
            svc.store.rewrite_frontmatter(d, rec.meta, sub="op:t")
            svc.operator_decision(sub="op:ada", doc_id=d, decision="admit", op_id="adm")
            svc.reindex(mode="full")

            def search(ver):
                call = {"jsonrpc": "2.0", "id": 9, "method": "tools/call",
                        "params": {"name": "library_search", "arguments": {
                            "query": "apply netplan", "target_os_family": "linux",
                            "target_distro": "ubuntu", "target_version": ver, "target_arch": "amd64"}}}
                _st, obj, _ = mcp.handle("POST", "/mcp", _debug_headers("agent:c", "library:read"),
                                         json.dumps(call).encode())
                return obj["result"]["structuredContent"]["results"]

            self.assertTrue(any(r["doc_id"] == d for r in search("24.04")), "24.04 must match")
            self.assertFalse(any(r["doc_id"] == d for r in search("22.04")),
                             "target_version=22.04 must EXCLUDE a 24.04 doc — param must be live")

    def test_healthz_public(self):
        with temp_service() as svc:
            core, _mcp = _wire(svc)
            st, o, _ = core.handle("GET", "/healthz", {}, b"")
            self.assertEqual(st, 200)
            st, o, _ = core.handle("GET", "/.well-known/oauth-protected-resource", {}, b"")
            self.assertIn("library:admin", o["scopes_supported"])


if __name__ == "__main__":
    unittest.main()
