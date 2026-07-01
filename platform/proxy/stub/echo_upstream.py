#!/usr/bin/env python3
"""
Echo upstream — Stage-4 Build test double standing in for a real app container.

Returns 200 with a body that dumps EVERY request header it received, so the harness
can prove the trust boundary at the UPSTREAM edge (A§8.6):
  • auth's `X-Auth-Identity` reached upstream on an allowed request, and
  • NO client-injected identity header (X-Auth-Identity: FORGED, Remote-User: operator,
    X-Forwarded-User, X-Forwarded-Prefix, underscore twins, crafted traceparent) survived,
  • and the Remote-User trap the auth stub set on its 200 did NOT get copied (only
    X-Auth-Identity is copied — A§8.7).

Replace with the real board/notes/… RS containers as they are built.
"""
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8080"))
NAME = os.environ.get("UPSTREAM_NAME", "echo")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write(f"[{NAME}] " + (fmt % args) + "\n")

    def _handle(self):
        lines = [f"UPSTREAM={NAME}", f"METHOD={self.command}", f"PATH={self.path}", "--- headers ---"]
        for k in sorted(self.headers.keys()):
            lines.append(f"{k}: {self.headers.get(k)}")
        body = ("\n".join(lines) + "\n").encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    do_GET = _handle
    do_POST = _handle
    do_HEAD = _handle


if __name__ == "__main__":
    sys.stderr.write(f"[{NAME}] listening :{PORT}\n")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
