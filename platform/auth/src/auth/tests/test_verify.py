"""auth.tests.test_verify — forward-auth /api/verify LOGIC (PLAN §8).

REPLICATES platform/proxy's auth_verify_stub.py decision table against the REAL
verify() function, over the REAL HMAC test-signer and the REAL MemoryHotStore
(for the kill-switch posture). The injected session/bearer seams are fakes that
model the two credential types (§8.4). Everything here runs GREEN in-sandbox.

Proves (mirroring the stub + §8.5/§8.6/§8.7):
  * Cookie session=valid            -> EXACTLY 200 + signed X-Auth-Identity (human)
  * Authorization: Bearer valid     -> EXACTLY 200 + signed X-Auth-Identity (agent)
  * Authorization: Bearer refused   -> 403 (authenticated-but-refused-at-the-door)
  * browser + no/invalid cred       -> 302 Location=/login?rd=<X-Forwarded-Uri>
  * agent   + no/invalid cred       -> 401 WWW-Authenticate: Bearer
  * ALLOW is EXACTLY 200 — never a 204/206 (§8.5: only 200 is allow)
  * verify IGNORES an inbound X-Auth-Identity / Remote-User (does not trust it, §8.6)
  * the authoritative traceparent is SERVER-MINTED — a client-supplied one is
    recorded only as claimed_parent, never echoed as the attribution key (§8.7 5f)
  * kill-switch G2 quiesce posture yields 403 at the door for an agent (§8.8)

Stage-7 (CANNOT-VERIFY-HERE): re-run this same table END-TO-END through the real
proxy against the real auth container with proxy's own regression harness:
    cd platform/proxy && docker compose --env-file .env.internal up -d --build \
      && ./test/regression_headers.sh internal
(needs Docker + the built proxy + auth containers — not available in this sandbox).
"""
from __future__ import annotations

import unittest

from auth.core.tokens_model import (
    PRINCIPAL_TYPE_AGENT,
    PRINCIPAL_TYPE_HUMAN,
    TYP_IDENTITY_HEADER,
)
from auth.crypto.signer_hmac import HMACSigner
from auth.store.memory_hot import MemoryHotStore
from auth.verify.forward_auth import (
    DECISION_ALLOW,
    KILL_G2,
    STATUS_ALLOW,
    CredResult,
    Identity,
    VerifyDeps,
    decode_identity_header,
    verify,
)

ISSUER = "https://auth.suite.example"

# A DISTINCT key from the (hypothetical) access-token AS key — §8.7 requires the
# X-Auth-Identity key be separate from the access-token key. Here: its own kid.
IDENTITY_SIGNER = HMACSigner(b"x" * 32, kid="identity-key-1")


# ── fake credential seams (integration wires these to the session store + auth.tokens) ──

def _session_lookup(cookie_header: str, aud: str) -> CredResult:
    """Model the §8.4 1st credential: stateful server-side session lookup.

    session=valid  -> live human session (operator)
    session=disabled -> authenticated-but-refused (disabled/killed) -> 403
    anything else  -> invalid (fall through)
    """
    if "session=valid" in cookie_header:
        return CredResult.allow(Identity(
            sub="op:eide", principal_type=PRINCIPAL_TYPE_HUMAN,
            roles=frozenset({"role:operator"}),
        ))
    if "session=disabled" in cookie_header:
        return CredResult.refuse()
    return CredResult.invalid()


def _bearer_validate(token: str, aud: str) -> CredResult:
    """Model the §8.4 2nd credential: stateless JWT + live revocation check.

    "valid-agent" -> allowed agent ; "refused" -> authenticated-but-refused (403) ;
    anything else -> invalid (401/302).
    """
    if token == "valid-agent":
        return CredResult.allow(Identity(
            sub="agent:patcher-07", principal_type=PRINCIPAL_TYPE_AGENT,
            roles=frozenset({"role:agent-executor"}), client_id="agent:patcher-07",
        ))
    if token == "refused":
        return CredResult.refuse()
    return CredResult.invalid()


def _make_deps(hot: MemoryHotStore, **over) -> VerifyDeps:
    kw = dict(
        signer=IDENTITY_SIGNER,
        issuer=ISSUER,
        session_lookup=_session_lookup,
        bearer_validate=_bearer_validate,
        killswitch=hot.killswitch,
        identity_ttl_s=30,
        now=lambda: 1_700_000_000,
    )
    kw.update(over)
    return VerifyDeps(**kw)


class ForwardAuthDecisionTable(unittest.TestCase):
    """Replicates auth_verify_stub.py's decision table against real verify()."""

    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.deps = _make_deps(self.hot)

    # -- 200 allow paths ------------------------------------------------------

    def test_cookie_session_valid_is_exactly_200_with_identity(self):
        status, hdrs = verify(
            {"Cookie": "session=valid", "X-Forwarded-Host": "board.suite.example",
             "Accept": "text/html"},
            self.deps,
        )
        self.assertEqual(status, 200)
        self.assertEqual(status, STATUS_ALLOW)
        self.assertIn("X-Auth-Identity", hdrs)
        claims = decode_identity_header(hdrs["X-Auth-Identity"], IDENTITY_SIGNER)
        self.assertEqual(claims["sub"], "op:eide")
        self.assertEqual(claims["principal_type"], PRINCIPAL_TYPE_HUMAN)
        self.assertEqual(claims["aud"], "board")   # from X-Forwarded-Host
        self.assertEqual(claims["iss"], ISSUER)

    def test_bearer_valid_agent_is_exactly_200_with_identity(self):
        status, hdrs = verify(
            {"Authorization": "Bearer valid-agent",
             "X-Forwarded-Host": "gateway.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 200)
        self.assertIn("X-Auth-Identity", hdrs)
        claims = decode_identity_header(hdrs["X-Auth-Identity"], IDENTITY_SIGNER)
        self.assertEqual(claims["sub"], "agent:patcher-07")
        self.assertEqual(claims["principal_type"], PRINCIPAL_TYPE_AGENT)
        self.assertEqual(claims["aud"], "gateway")
        self.assertEqual(claims["client_id"], "agent:patcher-07")

    def test_allow_is_EXACTLY_200_never_204(self):
        # §8.5: only 200 is allow; a 2xx-other-than-200 must be impossible here.
        for req in (
            {"Cookie": "session=valid", "X-Forwarded-Host": "board.suite.example"},
            {"Authorization": "Bearer valid-agent", "X-Forwarded-Host": "board.suite.example"},
        ):
            status, _ = verify(req, self.deps)
            self.assertEqual(status, 200)
            self.assertNotIn(status, (201, 202, 203, 204, 205, 206))

    def test_identity_header_typ_is_identity_jwt(self):
        _, hdrs = verify(
            {"Authorization": "Bearer valid-agent", "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        import base64 as _b, json as _j
        h_seg = hdrs["X-Auth-Identity"].split(".")[0]
        header = _j.loads(_b.urlsafe_b64decode(h_seg + "=" * (-len(h_seg) % 4)))
        self.assertEqual(header["typ"], TYP_IDENTITY_HEADER)
        self.assertEqual(header["kid"], "identity-key-1")

    # -- deny paths -----------------------------------------------------------

    def test_bearer_refused_is_403(self):
        status, hdrs = verify(
            {"Authorization": "Bearer refused", "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 403)
        self.assertNotIn("X-Auth-Identity", hdrs)   # never mint identity on deny

    def test_browser_no_cred_is_302_with_rd(self):
        status, hdrs = verify(
            {"Accept": "text/html", "X-Forwarded-Host": "board.suite.example",
             "X-Forwarded-Uri": "/tickets/42"},
            self.deps,
        )
        self.assertEqual(status, 302)
        self.assertEqual(hdrs["Location"], "/login?rd=/tickets/42")

    def test_browser_no_cred_default_rd_is_root(self):
        status, hdrs = verify(
            {"Accept": "text/html", "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 302)
        self.assertEqual(hdrs["Location"], "/login?rd=/")

    def test_agent_no_cred_is_401_www_authenticate(self):
        status, hdrs = verify(
            {"X-Forwarded-Host": "board.suite.example"},   # no Accept, no cred
            self.deps,
        )
        self.assertEqual(status, 401)
        self.assertEqual(hdrs["WWW-Authenticate"], "Bearer")

    def test_agent_invalid_bearer_is_401(self):
        status, hdrs = verify(
            {"Authorization": "Bearer garbage", "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 401)
        self.assertEqual(hdrs["WWW-Authenticate"], "Bearer")

    def test_browser_with_authorization_is_not_treated_as_browser(self):
        # Accept: text/html BUT an Authorization header present -> not a browser
        # redirect; invalid bearer -> 401 (mirrors stub is_browser = html AND !authz).
        status, _ = verify(
            {"Accept": "text/html", "Authorization": "Bearer garbage",
             "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 401)

    def test_disabled_cookie_session_is_403(self):
        status, _ = verify(
            {"Cookie": "session=disabled", "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 403)

    def test_invalid_cookie_browser_falls_through_to_302(self):
        # expired/bogus cookie must not 403; it falls through to the no-cred path.
        status, hdrs = verify(
            {"Cookie": "session=expired", "Accept": "text/html",
             "X-Forwarded-Host": "board.suite.example", "X-Forwarded-Uri": "/x"},
            self.deps,
        )
        self.assertEqual(status, 302)
        self.assertEqual(hdrs["Location"], "/login?rd=/x")

    # -- credential ORDER (§8.4: cookie first, don't fall through on valid) ---

    def test_valid_cookie_wins_over_bearer(self):
        status, hdrs = verify(
            {"Cookie": "session=valid", "Authorization": "Bearer refused",
             "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 200)
        claims = decode_identity_header(hdrs["X-Auth-Identity"], IDENTITY_SIGNER)
        self.assertEqual(claims["principal_type"], PRINCIPAL_TYPE_HUMAN)


class TrustBoundary(unittest.TestCase):
    """§8.6: verify reads ONLY Authorization + Cookie for identity; it NEVER
    trusts an inbound identity/trust/traceparent header."""

    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.deps = _make_deps(self.hot)

    def test_inbound_x_auth_identity_is_ignored_and_overwritten(self):
        # A client injects a forged X-Auth-Identity + Remote-User. verify must not
        # trust them; on 200 it mints its OWN X-Auth-Identity (proxy already
        # scrubbed, and auth independently does not trust — defense in depth).
        status, hdrs = verify(
            {"Authorization": "Bearer valid-agent", "X-Forwarded-Host": "board.suite.example",
             "X-Auth-Identity": "FORGED.forged.forged",
             "X_Auth_Identity": "FORGEDUNDER", "Remote-User": "operator",
             "Remote-Groups": "approver", "X-Forwarded-User": "operator"},
            self.deps,
        )
        self.assertEqual(status, 200)
        # The minted header is a REAL signed JWT for the true sub, not the forgery.
        self.assertNotEqual(hdrs["X-Auth-Identity"], "FORGED.forged.forged")
        claims = decode_identity_header(hdrs["X-Auth-Identity"], IDENTITY_SIGNER)
        self.assertEqual(claims["sub"], "agent:patcher-07")   # from the Bearer, not Remote-User
        # No Remote-* convenience header is emitted (§8.7 default, finding 5e).
        self.assertNotIn("Remote-User", hdrs)
        self.assertNotIn("Remote-Groups", hdrs)

    def test_forged_identity_cannot_manufacture_an_allow(self):
        # No real credential, only a forged identity header + browser -> still 302,
        # never a 200. The forged header buys nothing.
        status, hdrs = verify(
            {"Accept": "text/html", "X-Forwarded-Host": "board.suite.example",
             "X-Auth-Identity": "FORGED", "Remote-User": "operator",
             "Remote-Groups": "approver"},
            self.deps,
        )
        self.assertEqual(status, 302)
        self.assertNotIn("X-Auth-Identity", hdrs)

    def test_authoritative_traceparent_is_server_minted_not_client_echoed(self):
        # A client crafts a traceparent to misattribute its actions. verify mints
        # its OWN authoritative traceparent (bound to sub via co-signing) and records
        # the client value only as claimed_parent — never as the attribution key.
        client_tp = "00-deadbeefdeadbeefdeadbeefdeadbeef-1111111111111111-01"
        deps = _make_deps(self.hot, new_traceparent=lambda: "00-" + "a" * 32 + "-" + "b" * 16 + "-01")
        _, hdrs = verify(
            {"Authorization": "Bearer valid-agent", "X-Forwarded-Host": "board.suite.example",
             "traceparent": client_tp},
            deps,
        )
        claims = decode_identity_header(hdrs["X-Auth-Identity"], IDENTITY_SIGNER)
        self.assertEqual(claims["traceparent"], "00-" + "a" * 32 + "-" + "b" * 16 + "-01")
        self.assertNotEqual(claims["traceparent"], client_tp)     # NOT echoed
        self.assertEqual(claims["claimed_parent"], client_tp)     # kept for audit only

    def test_no_client_traceparent_means_no_claimed_parent(self):
        _, hdrs = verify(
            {"Authorization": "Bearer valid-agent", "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        claims = decode_identity_header(hdrs["X-Auth-Identity"], IDENTITY_SIGNER)
        self.assertTrue(claims["traceparent"].startswith("00-"))
        self.assertNotIn("claimed_parent", claims)

    def test_tampered_identity_header_fails_verification(self):
        _, hdrs = verify(
            {"Authorization": "Bearer valid-agent", "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        tok = hdrs["X-Auth-Identity"]
        h, p, s = tok.split(".")
        # Flip a byte in the signature segment.
        bad = h + "." + p + "." + ("A" if s[0] != "A" else "B") + s[1:]
        with self.assertRaises(ValueError):
            decode_identity_header(bad, IDENTITY_SIGNER)


class KillSwitchPosture(unittest.TestCase):
    """§8.8: a kill-switch / quiesce posture yields 403 at the door for agents."""

    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.deps = _make_deps(self.hot)

    def test_g2_quiesce_refuses_agent_at_the_door(self):
        self.hot.set_killswitch(KILL_G2, epoch=5)
        status, hdrs = verify(
            {"Authorization": "Bearer valid-agent", "X-Forwarded-Host": "gateway.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 403)
        self.assertNotIn("X-Auth-Identity", hdrs)

    def test_g2_refuses_an_agent_typed_COOKIE_session_too(self):
        # Symmetry regression (review finding): the G2 "agents refused at the door"
        # posture must hold regardless of WHICH credential proved the identity. If a
        # future path ever mints an agent-typed session cookie, the door must still
        # 403 it — the quiesce gate is applied to the resolved identity, not only on
        # the Bearer branch.
        def _agent_cookie_lookup(cookie_header: str, aud: str) -> CredResult:
            if "session=agent" in cookie_header:
                return CredResult.allow(Identity(
                    sub="agent:sneaky", principal_type=PRINCIPAL_TYPE_AGENT,
                    roles=frozenset({"role:agent-executor"}),
                ))
            return CredResult.invalid()

        deps = _make_deps(self.hot, session_lookup=_agent_cookie_lookup)
        self.hot.set_killswitch(KILL_G2, epoch=5)
        status, hdrs = verify(
            {"Cookie": "session=agent", "X-Forwarded-Host": "gateway.suite.example"},
            deps,
        )
        self.assertEqual(status, 403)
        self.assertNotIn("X-Auth-Identity", hdrs)

    def test_g2_still_authenticates_the_operator(self):
        # Break-glass posture: the operator (human) must still get in to regain
        # control — never a blanket allow-all, never a blanket deny-all.
        self.hot.set_killswitch(KILL_G2, epoch=5)
        status, hdrs = verify(
            {"Cookie": "session=valid", "X-Forwarded-Host": "mc.suite.example"},
            self.deps,
        )
        self.assertEqual(status, 200)
        self.assertIn("X-Auth-Identity", hdrs)

    def test_kill_epoch_and_level_ride_in_the_identity_header(self):
        self.hot.set_killswitch("G1", epoch=9)   # freeze-destructive, door still open
        _, hdrs = verify(
            {"Authorization": "Bearer valid-agent", "X-Forwarded-Host": "board.suite.example"},
            self.deps,
        )
        claims = decode_identity_header(hdrs["X-Auth-Identity"], IDENTITY_SIGNER)
        self.assertEqual(claims["kill_level"], "G1")
        self.assertEqual(claims["kill_epoch"], 9)


class ResponseSplittingDefense(unittest.TestCase):
    """A hostile X-Forwarded-Uri must not smuggle CRLF/header injection into the
    302 Location (critical-infra: never reflect a raw client value)."""

    def setUp(self) -> None:
        self.hot = MemoryHotStore()
        self.deps = _make_deps(self.hot)

    def test_crlf_in_forwarded_uri_is_encoded(self):
        status, hdrs = verify(
            {"Accept": "text/html", "X-Forwarded-Host": "board.suite.example",
             "X-Forwarded-Uri": "/x\r\nSet-Cookie: evil=1"},
            self.deps,
        )
        self.assertEqual(status, 302)
        self.assertNotIn("\r", hdrs["Location"])
        self.assertNotIn("\n", hdrs["Location"])
        self.assertIn("%0D%0A", hdrs["Location"].upper())


if __name__ == "__main__":
    unittest.main()
