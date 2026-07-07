"""library.server — the integration Core service that MOUNTS both surfaces over ONE
state, plus the static operator UI. Mirrors auth's testable-router pattern.

Routing is a PURE function `LibraryApp.dispatch(method, path, headers, body) ->
(status, headers, body_bytes)`, unit-tested in-process AND booted for real via
`python -m library.server`. Both surfaces (Core API + MCP) are clients of the SAME
LibraryService; the UI is static files served from ui/build.

Boot: `python -m library.server` — binds LIBRARY_PORT (8080), edge network, resolving
auth at auth:8089 (DEPLOYMENT §4). Verified against DEPLOYMENT.md, not this restatement.
"""
from __future__ import annotations

import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Optional

from .api.core_api import CoreAPI
from .config import Config
from .clients.budget_client import BudgetClient
from .clients.cmdb_client import CMDBClient
from .clients.embed_client import EmbedClient
from .clients.gateway_client import GatewayClient
from .corpus.store import CorpusStore
from .index.db import IndexDB
from .ingest.fetcher import Fetcher
from .mcp.surface import MCPSurface
from .ops.opsdb import OpsDB
from .authz.rs import RSMiddleware
from .service import LibraryService


class LibraryApp:
    def __init__(self, config: Optional[Config] = None, *, build_index: bool = True,
                 service: Optional[LibraryService] = None):
        self.config = config or Config.from_env()
        c = self.config
        if service is not None:
            self.svc = service
        else:
            store = CorpusStore(c.data_dir, remote=c.corpus_git_remote)
            index = IndexDB(os.path.join(c.data_dir, "index.db"), c.embed_dim)
            ops = OpsDB(os.path.join(c.data_dir, "ops.db"))
            embed_client = EmbedClient(c.embed_url, c.embed_role, c.embed_dim,
                                       batch_max=c.embed_batch_max, timeout_s=c.embed_timeout_s) if c.embed_url else None
            cmdb_client = CMDBClient(c.cmdb_url, ttl_s=c.hostfacts_ttl_s) if c.cmdb_url else None
            # Gateway client exists but the auto-admit lane that USES it is gated OFF
            # (config.auto_admit_enabled, default False) until D-7 go-live.
            gateway_client = GatewayClient(c.gateway_url, timeout_s=c.gateway_read_timeout_s) if (
                c.auto_admit_enabled and c.gateway_url) else None
            budget_client = BudgetClient(c.budget_api, concurrency_ceiling=c.concurrency_ceiling,
                                         propose_quota_per_day=c.propose_quota_per_day)
            self.svc = LibraryService(
                c, store=store, index=index, ops=ops, embed_client=embed_client,
                cmdb_client=cmdb_client, gateway_client=gateway_client, budget_client=budget_client,
                fetcher=Fetcher(max_bytes=c.fetch_max_bytes, timeout_s=c.fetch_timeout_s,
                                allow_private=c.allow_private_fetch))
        self.svc.bootstrap(build_index=build_index)
        self.rs = RSMiddleware(self.config)
        self.core = CoreAPI(self.svc, self.rs, self.svc.ops)
        self.mcp = MCPSurface(self.svc, self.rs, self.svc.ops)

    # ── the pure router ──────────────────────────────────────────────────────
    def dispatch(self, method: str, path: str, headers: dict, body: bytes) -> tuple[int, dict, bytes]:
        if path.startswith("/mcp"):
            status, obj, extra = self.mcp.handle(method, path, headers, body)
            return self._finish(status, obj, extra)
        if path.startswith("/ui") or path == "/":
            return self._serve_ui(path)
        status, obj, extra = self.core.handle(method, path, headers, body)
        return self._finish(status, obj, extra)

    def _finish(self, status: int, obj, extra: dict) -> tuple[int, dict, bytes]:
        payload = json.dumps(obj).encode("utf-8")
        headers = {"Content-Type": "application/json", "Content-Length": str(len(payload))}
        headers.update(extra)
        return status, headers, payload

    def _serve_ui(self, path: str) -> tuple[int, dict, bytes]:
        rel = "corpus_search.html" if path in ("/", "/ui", "/ui/") else path[len("/ui/"):]
        rel = rel.split("?")[0].lstrip("/")
        if ".." in rel:
            return 400, {"Content-Type": "text/plain"}, b"bad path"
        full = os.path.join(self.config.ui_dir, rel)
        if not os.path.isfile(full):
            return 404, {"Content-Type": "text/plain"}, b"not found"
        ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
        with open(full, "rb") as f:
            data = f.read()
        return 200, {"Content-Type": ctype, "Content-Length": str(len(data))}, data


def make_handler(app: LibraryApp):
    class Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"

        def _do(self, method: str):
            length = int(self.headers.get("Content-Length", 0) or 0)
            body = self.rfile.read(length) if length else b""
            headers = {k: v for k, v in self.headers.items()}
            status, out_headers, payload = app.dispatch(method, self.path, headers, body)
            self.send_response(status)
            for k, v in out_headers.items():
                self.send_header(k, v)
            self.end_headers()
            if payload:
                self.wfile.write(payload)

        def do_GET(self):
            self._do("GET")

        def do_POST(self):
            self._do("POST")

        def do_PATCH(self):
            self._do("PATCH")

        def log_message(self, *args):
            pass

    return Handler


def main() -> None:
    config = Config.from_env()
    app = LibraryApp(config)
    handler = make_handler(app)
    server = ThreadingHTTPServer(("0.0.0.0", config.port), handler)
    print(f"library serving on :{config.port} (auth={config.auth_base}, aud={config.audience}, "
          f"auto_admit={'ENABLED' if config.auto_admit_enabled else 'DISABLED'})", flush=True)
    server.serve_forever()


if __name__ == "__main__":
    main()
