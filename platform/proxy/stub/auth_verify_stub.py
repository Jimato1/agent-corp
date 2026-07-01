#!/usr/bin/env python3
"""
MINIMAL auth /api/verify STUB — Stage-4 Build test double ONLY.

It exists so the proxy's forward-auth branching can be proven end-to-end WITHOUT the
real `auth` component (which does not exist yet). It emulates the auth §8.5 decision
table (the status code IS the contract) and §8.7 identity headers. It is NOT auth:
no real tokens, no signatures, no revocation, no sessions. Replace with the real
`auth` container at the Stage-7 joint checkpoint — see BUILD.md.

Behaviour (GET /api/verify), decided by the credentials the PROXY forwarded
(Authorization + Cookie) and the client class (Accept), per A§8.3/8.4/8.5:

  Cookie contains  session=valid        -> 200 (human)   + X-Auth-Identity (+ Remote-User trap)
  Authorization:   Bearer valid-agent   -> 200 (agent)   + X-Auth-Identity (+ Remote-User trap)
  Authorization:   Bearer refused       -> 403 (authenticated-but-refused-at-the-door)
  Authorization:   Bearer allow-204     -> 204 (2xx-but-NOT-200: proxy MUST still deny; A§8.5)
  no / invalid credential, browser       -> 302 Location=/login?rd=...  (Accept: text/html, no Authorization)
  no / invalid credential, agent         -> 401 WWW-Authenticate: Bearer

Every 2xx/deny response also ECHOES what identity headers the verify subrequest
actually carried, as `X-Stub-Saw-*`, so the harness can PROVE the scrub:
a client-injected X-Auth-Identity / Remote-User must arrive here as NONE (A§8.6 R1),
while Authorization / Cookie must arrive present (A§8.3).

Test knobs (env, simulate auth degradation for the fail-closed gates):
  STUB_DELAY_MS      sleep this long before replying (hung-verify test; expect proxy
                     to deny within its 250ms response_header_timeout — PLAN S2-02).
  STUB_FORCE_STATUS  force this status for /api/verify regardless (e.g. 500 → 5xx fail-closed).

Any non-verify path (/, /login, ...) returns 200 "auth stub portal" so the @auth
route (gate-exempt) can be exercised too.
"""
import os
import sys
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("PORT", "8080"))
DELAY_MS = int(os.environ.get("STUB_DELAY_MS", "0"))
FORCE_STATUS = os.environ.get("STUB_FORCE_STATUS", "").strip()

# A fake, clearly-not-real "signed identity" so upstream echoes prove it was auth that set it.
FAKE_X_AUTH_IDENTITY = "STUB.eyJzdWIiOiJvcDplaWRlIn0.not-a-real-signature"


def _saw(headers, name):
    v = headers.get(name)
    return v if v is not None else "NONE"


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("[auth-stub] " + (fmt % args) + "\n")

    def _send(self, status, body=b"", extra_headers=None):
        self.send_response(status)
        for k, v in (extra_headers or {}).items():
            self.send_header(k, v)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if body:
            self.wfile.write(body)

    def _echo_saw(self):
        # Prove to the harness what the proxy forwarded to /api/verify.
        h = self.headers
        return {
            "X-Stub-Saw-XAuthIdentity": _saw(h, "X-Auth-Identity"),
            "X-Stub-Saw-XAuthIdentity-Underscore": _saw(h, "X_Auth_Identity"),
            "X-Stub-Saw-RemoteUser": _saw(h, "Remote-User"),
            "X-Stub-Saw-XForwardedUser": _saw(h, "X-Forwarded-User"),
            "X-Stub-Saw-XForwardedPrefix": _saw(h, "X-Forwarded-Prefix"),
            "X-Stub-Saw-Authorization": _saw(h, "Authorization"),
            "X-Stub-Saw-Cookie": _saw(h, "Cookie"),
            "X-Stub-Saw-XForwardedHost": _saw(h, "X-Forwarded-Host"),
        }

    def do_GET(self):
        if DELAY_MS:
            time.sleep(DELAY_MS / 1000.0)

        path = self.path.split("?", 1)[0]
        if path != "/api/verify":
            # @auth route portal / login target (gate-exempt path).
            self._send(200, b"auth stub portal")
            return

        if FORCE_STATUS:
            self._send(int(FORCE_STATUS), b"forced", self._echo_saw())
            return

        h = self.headers
        authz = (h.get("Authorization") or "").strip()
        cookie = h.get("Cookie") or ""
        accept = h.get("Accept") or ""

        cookie_valid = "session=valid" in cookie
        is_browser = ("text/html" in accept) and not authz

        allow = cookie_valid or authz == "Bearer valid-agent"

        if allow:
            hdrs = self._echo_saw()
            hdrs["X-Auth-Identity"] = FAKE_X_AUTH_IDENTITY
            # TRAP: also set Remote-User. Proxy copies ONLY X-Auth-Identity (A§8.7),
            # so upstream must NOT see this Remote-User.
            hdrs["Remote-User"] = "op:eide"
            self._send(200, b"allow", hdrs)
        elif authz == "Bearer refused":
            self._send(403, b"refused at the door", self._echo_saw())
        elif authz == "Bearer allow-204":
            # 2xx but NOT 200 — the proxy's @ok matcher is status 200, so this denies.
            self._send(204, b"", self._echo_saw())
        elif is_browser:
            rd = h.get("X-Forwarded-Uri") or "/"
            hdrs = self._echo_saw()   # P4-02: deny branches echo too (docstring contract)
            hdrs["Location"] = "/login?rd=" + rd
            self._send(302, b"", hdrs)
        else:
            hdrs = self._echo_saw()   # P4-02: so the @auth scrub proof works uncredentialed
            hdrs["WWW-Authenticate"] = "Bearer"
            self._send(401, b"unauthenticated", hdrs)

    # verify is GET-only (A§8.3); prove the proxy never sends a body-bearing method.
    def do_POST(self):
        self._send(405, b"verify is GET-only")


if __name__ == "__main__":
    sys.stderr.write(
        f"[auth-stub] listening :{PORT} delay={DELAY_MS}ms force={FORCE_STATUS or '-'}\n"
    )
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
