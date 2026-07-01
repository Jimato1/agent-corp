"""auth.verify — the forward-auth /api/verify LOGIC (PLAN §8).

The proxy issues ONE GET /api/verify subrequest per inbound request across every
subdomain; this package answers it. The core is a PURE function:

    forward_auth.verify(request_headers, deps) -> (status, response_headers)

implementing the PLAN §8.5 decision table where THE STATUS CODE IS THE CONTRACT,
and matching platform/proxy's auth_verify_stub.py EXACTLY:

    Cookie session=valid        -> 200 (human)  + signed X-Auth-Identity
    Authorization: Bearer valid -> 200 (agent)  + signed X-Auth-Identity
    Authorization: Bearer refused (authenticated-but-refused) -> 403
    browser + no/invalid cred   -> 302 Location=/login?rd=<X-Forwarded-Uri>
    agent   + no/invalid cred   -> 401 WWW-Authenticate: Bearer
    kill-switch / quiesce posture -> 403 at the door (§8.8)

NEVER 2xx-other-than-200 on allow (a stray 204/206 is NOT allow — §8.5). Reads
ONLY Authorization + Cookie for identity (+ X-Forwarded-Host for aud,
X-Forwarded-Uri for rd, Accept for browser detection). NEVER trusts an inbound
X-Auth-Identity / Remote-User / traceparent — the proxy scrubs, and auth
independently does not trust (§8.6). The authoritative traceparent is
SERVER-MINTED and bound to the validated sub; a client-supplied traceparent is
recorded only as claimed_parent (§8.7, finding 5f).

Import the deps seams (session lookup / bearer validation) that integration wires
to auth.tokens + the session store; this package does NOT import sibling builders.
"""
