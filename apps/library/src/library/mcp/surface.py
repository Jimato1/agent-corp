"""library.mcp.surface — MCP Streamable HTTP (spec 2025-11-25), thin over the service.

Schemas obey the D-17 ceiling: flat objects; string/enum/int params;
additionalProperties:false. The two `str[]` params (`source_urls`) are the only arrays
and are flagged for confirmation against what the gap-1.3 spike validates; the schemas
are DRAFTED now, frozen only after the spike passes (Library is not spike-gated but
inherits the ceiling).

There is NO admin/decision tool on this surface — NO MCP path to `admitted` that
bypasses the §2 gate, and no MCP path to approve/reject/retire/manage collections
(PLAN §7). request_admission runs the gate; the gate is the same content-bound
predicate the operator UI is bound by.
"""
from __future__ import annotations

import json
from typing import Optional

from ..errors import BadRequest, LibraryError
from ..authz.rs import RSMiddleware

PROTOCOL_VERSION = "2025-11-25"

KIND_ENUM = ["man-page", "cli-reference", "cli-guide", "prose-guide", "advisory", "other"]

TOOLS = [
    {
        "name": "library_search",
        "description": "Hybrid semantic + FTS retrieval over the reference shelf. Returns "
                       "chunks with a durable citation (doc_id + heading anchor + line-range), "
                       "provenance tier, per-chunk evidence_covered, version_scope, applies_to, "
                       "last_verified, and the curation-ingested provenance taint. `chunk_id` is "
                       "an ephemeral correlation field, not a citation. Supply host_id XOR "
                       "target_* (both ⇒ typed scope_conflict).",
        "inputSchema": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "query": {"type": "string"},
                "k": {"type": "integer", "minimum": 1, "maximum": 25},
                "host_id": {"type": "string"},
                "target_os_family": {"type": "string"},
                "target_distro": {"type": "string"},
                "target_version": {"type": "string"},
                "target_arch": {"type": "string"},
                "include_unverified": {"type": "boolean"},
            },
            "required": ["query"],
        },
    },
    {
        "name": "library_get_doc",
        "description": "Fetch a doc's frontmatter, evidence ledger, and chunk map by doc_id.",
        "inputSchema": {
            "type": "object", "additionalProperties": False,
            "properties": {"doc_id": {"type": "string"}}, "required": ["doc_id"],
        },
    },
    {
        "name": "library_propose",
        "description": "Propose ingestion of a source URL. The SERVICE fetches and hashes the "
                       "source (never the agent). Lands in the quarantine tier per the admission "
                       "rules — this NEVER writes to the trusted tier and NEVER rides the "
                       "auto-approve lane.",
        "inputSchema": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "op_id": {"type": "string"},
                "source_url": {"type": "string"},
                "kind": {"type": "string", "enum": KIND_ENUM},
                "ticket_id": {"type": "string"},
                "note": {"type": "string"},
            },
            "required": ["op_id", "source_url", "kind", "ticket_id"],
        },
    },
    {
        "name": "library_attach_sources",
        "description": "Attach cross-reference source URLs (curation). Returns the recomputed "
                       "HEURISTIC distinctness count — which raises review priority only and "
                       "NEVER confers trust or admits.",
        "inputSchema": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "op_id": {"type": "string"},
                "doc_id": {"type": "string"},
                # FLAGGED array (D-17): confirm against the gap-1.3 spike before freeze.
                "source_urls": {"type": "array", "items": {"type": "string"}, "maxItems": 20},
            },
            "required": ["op_id", "doc_id", "source_urls"],
        },
    },
    {
        "name": "library_attach_sandbox_evidence",
        "description": "Attach sandbox evidence references (curation). Recorded ATTESTATION="
                       "agent_asserted, which can NEVER satisfy the content-bound admission gate. "
                       "Only gateway-delivered evidence validated by the service admits; "
                       "covered_anchors are never accepted from the caller.",
        "inputSchema": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "op_id": {"type": "string"},
                "doc_id": {"type": "string"},
                "run_id": {"type": "string"},
                "harness_version": {"type": "string"},
            },
            "required": ["op_id", "doc_id", "run_id", "harness_version"],
        },
    },
    {
        "name": "library_request_admission",
        "description": "Run the content-bound admission gate. Outcome is queued_for_review, or "
                       "admitted ONLY when the operator has enabled the sandbox auto-admit lane "
                       "AND gateway-delivered content-bound evidence satisfies the gate "
                       "(pre-D7-go-live this lane is disabled, so the outcome is always "
                       "queued_for_review), or rejected_precondition.",
        "inputSchema": {
            "type": "object", "additionalProperties": False,
            "properties": {"op_id": {"type": "string"}, "doc_id": {"type": "string"}},
            "required": ["op_id", "doc_id"],
        },
    },
]

TOOL_NAMES = {t["name"] for t in TOOLS}


class MCPSurface:
    def __init__(self, service, rs: RSMiddleware, ops):
        self.svc = service
        self.rs = rs
        self.ops = ops

    def handle(self, method: str, path: str, headers: dict, body: bytes):
        if method == "GET":
            # no server-initiated stream needed; advertise liveness
            return 200, {"protocol": PROTOCOL_VERSION, "transport": "streamable-http"}, {}
        if method != "POST":
            return 405, {"error": "method_not_allowed"}, {}
        try:
            req = json.loads(body) if body else {}
        except (ValueError, TypeError):
            return 400, self._err(None, -32700, "parse error"), {}
        rpc_id = req.get("id")
        rpc_method = req.get("method")
        params = req.get("params") or {}

        if rpc_method == "initialize":
            return 200, {
                "jsonrpc": "2.0", "id": rpc_id,
                "result": {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {"tools": {"listChanged": False}},
                    "serverInfo": {"name": "library", "version": "0.1.0"},
                },
            }, {}
        if rpc_method in ("notifications/initialized", "ping"):
            return 200, {"jsonrpc": "2.0", "id": rpc_id, "result": {}}, {}
        if rpc_method == "tools/list":
            return 200, {"jsonrpc": "2.0", "id": rpc_id, "result": {"tools": TOOLS}}, {}
        if rpc_method == "tools/call":
            return self._call(rpc_id, params, headers)
        return 200, self._err(rpc_id, -32601, f"method not found: {rpc_method}"), {}

    def _call(self, rpc_id, params: dict, headers: dict):
        name = params.get("name")
        args = params.get("arguments") or {}
        if name not in TOOL_NAMES:
            return 200, self._err(rpc_id, -32602, f"unknown tool {name}"), {}
        try:
            pr = self.rs.authenticate(headers)
            self.rs.require(pr, name)          # scope + human-kind gate
            result = self._dispatch_tool(name, args, pr)
        except LibraryError as e:
            extra = {"WWW-Authenticate": self.rs.www_authenticate()} if e.status == 401 else {}
            # MCP tool error surfaced as an isError result (agent-legible) + HTTP status
            return e.status, {
                "jsonrpc": "2.0", "id": rpc_id,
                "result": {"isError": True, "content": [{"type": "text",
                            "text": json.dumps({"error": e.code, "message": e.message})}]},
            }, extra
        return 200, {
            "jsonrpc": "2.0", "id": rpc_id,
            "result": {
                "content": [{"type": "text", "text": json.dumps(result)}],
                "structuredContent": result,
                "isError": False,
            },
        }, {}

    def _dispatch_tool(self, name: str, args: dict, pr):
        if name == "library_search":
            # NOTE: the schema param is `target_version` (PLAN §7) but the internal scope
            # field is `major_version` — map explicitly so the param is not silently dead.
            target = {
                "os_family": args.get("target_os_family"),
                "distro": args.get("target_distro"),
                "major_version": args.get("target_version"),
                "arch": args.get("target_arch"),
            }
            target = {k: v for k, v in target.items() if v}
            return self.svc.search(
                query=args.get("query", ""), k=args.get("k"), host_id=args.get("host_id"),
                target=target or None, include_unverified=bool(args.get("include_unverified")))
        if name == "library_get_doc":
            return self.svc.get_doc(args.get("doc_id", ""))
        # mutating tools → idempotent via op_id
        return self._idem(pr, name, args)

    def _idem(self, pr, name: str, args: dict):
        op_id = args.get("op_id", "")
        from .. import ids
        if not ids.is_op_id(op_id):
            raise BadRequest("op_id required (≤128 chars)", code="validation_error")
        prior = self.ops.begin(op_id, pr.sub, name)
        if prior is not None:
            return prior.body
        try:
            if name == "library_propose":
                out = self.svc.propose(sub=pr.sub, op_id=op_id, source_url=args["source_url"],
                                       kind=args["kind"], ticket_id=args.get("ticket_id", ""),
                                       note=args.get("note", ""))
            elif name == "library_attach_sources":
                out = self.svc.attach_sources(sub=pr.sub, op_id=op_id, doc_id=args["doc_id"],
                                              source_urls=args.get("source_urls", []))
            elif name == "library_attach_sandbox_evidence":
                out = self.svc.attach_sandbox_evidence(sub=pr.sub, op_id=op_id, doc_id=args["doc_id"],
                                                       run_id=args.get("run_id", ""),
                                                       harness_version=args.get("harness_version", ""))
            elif name == "library_request_admission":
                out = self.svc.request_admission(sub=pr.sub, op_id=op_id, doc_id=args["doc_id"])
            else:
                raise BadRequest(f"no dispatch for {name}", code="validation_error")
        except Exception:
            self.ops.abort(op_id)
            raise
        self.ops.complete(op_id, 200, out)
        return out

    @staticmethod
    def _err(rpc_id, code, message):
        return {"jsonrpc": "2.0", "id": rpc_id, "error": {"code": code, "message": message}}
