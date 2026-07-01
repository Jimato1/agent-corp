"""auth.tests.test_server — the PHASE-3 integration layer over ONE shared state.

Exercises auth.server.AuthApp.dispatch() in-process (no socket bind) so the whole
router — the §8 /api/verify decision table, the PDP endpoint, jwks/introspect/
revoke, the thin MCP surface, and the admin surface — is proven GREEN here. The
live socket boot + curl proof is done separately by the build harness.

Everything runs over REAL subsystems (SQLiteStore + MemoryHotStore + the HMAC
test-signers + real token mint/validate + real verify()), so a green run proves
the surfaces actually agree on one state, not that a mock returned a canned value.
"""
from __future__ import annotations

import json
import unittest

from auth.core import scopes as S
from auth.server import AuthApp


def _body(resp):
    status, headers, out = resp
    payload = json.loads(out) if out and headers.get("Content-Type", "").startswith("application/json") else None
    return status, headers, payload


class VerifyDecisionTableLive(unittest.TestCase):
    """The headline §8 contract, wired to the real Store/HotStore/tokens."""

    def setUp(self):
        self.app = AuthApp()
        self.tok = self.app.demo_tokens()

    def _verify(self, headers):
        return self.app.dispatch("GET", "/api/verify", headers, b"")

    def test_cookie_session_valid_is_exactly_200(self):
        status, headers, _ = self._verify({
            "Cookie": "session=valid", "X-Forwarded-Host": "board.suite.local",
            "Accept": "text/html"})
        self.assertEqual(status, 200)
        self.assertIn("X-Auth-Identity", headers)

    def test_bearer_valid_agent_is_exactly_200(self):
        status, headers, _ = self._verify({
            "Authorization": f"Bearer {self.tok['valid_agent']}",
            "X-Forwarded-Host": "board.suite.local"})
        self.assertEqual(status, 200)
        self.assertIn("X-Auth-Identity", headers)

    def test_allow_is_exactly_200_never_2xx_other(self):
        status, _, _ = self._verify({
            "Cookie": "session=valid", "X-Forwarded-Host": "board.suite.local"})
        self.assertEqual(status, 200)
        self.assertNotIn(status, (201, 202, 203, 204, 205, 206))

    def test_bearer_refused_is_403(self):
        # A valid token for a DISABLED principal -> authenticated-but-refused (403).
        status, headers, _ = self._verify({
            "Authorization": f"Bearer {self.tok['refused_agent']}",
            "X-Forwarded-Host": "board.suite.local"})
        self.assertEqual(status, 403)
        self.assertNotIn("X-Auth-Identity", headers)

    def test_agent_no_cred_is_401(self):
        status, headers, _ = self._verify({"X-Forwarded-Host": "board.suite.local"})
        self.assertEqual(status, 401)
        self.assertEqual(headers.get("WWW-Authenticate"), "Bearer")

    def test_browser_no_cred_is_302(self):
        status, headers, _ = self._verify({
            "Accept": "text/html", "X-Forwarded-Host": "board.suite.local",
            "X-Forwarded-Uri": "/tickets/7"})
        self.assertEqual(status, 302)
        self.assertEqual(headers["Location"], "/login?rd=/tickets/7")

    def test_invalid_bearer_is_401(self):
        status, _, _ = self._verify({
            "Authorization": "Bearer not-a-real-jwt",
            "X-Forwarded-Host": "board.suite.local"})
        self.assertEqual(status, 401)

    def test_g2_quiesce_refuses_agent_at_the_door(self):
        self.app.hot.set_killswitch("G2", 3)
        status, _, _ = self._verify({
            "Authorization": f"Bearer {self.tok['valid_agent']}",
            "X-Forwarded-Host": "board.suite.local"})
        self.assertEqual(status, 403)

    def test_revoked_token_is_refused(self):
        # Revoke the whole principal, then the previously-valid token is refused.
        self.app.killswitch.revoke_principal("agent:patcher-07", issued_by="op", reason="t",
                                             now=2**31)
        status, _, _ = self._verify({
            "Authorization": f"Bearer {self.tok['valid_agent']}",
            "X-Forwarded-Host": "board.suite.local"})
        self.assertEqual(status, 403)


class PDPEndpoint(unittest.TestCase):
    def setUp(self):
        self.app = AuthApp()

    def _pdp(self, payload):
        return _body(self.app.dispatch("POST", "/pdp/decision", {}, json.dumps(payload).encode()))

    def test_insufficient_scope_denies(self):
        # patcher-07 does not hold board:approve -> deny.
        status, _, p = self._pdp({
            "principal": "agent:patcher-07", "action": STMactions().approve,
            "resource": {"ticket_id": "T1", "proposer_id": "someone-else"}})
        self.assertEqual(status, 200)
        self.assertFalse(p["permitted"])

    def test_unknown_principal_404(self):
        status, _, p = self._pdp({"principal": "nobody", "action": "Board::approve_ticket"})
        self.assertEqual(status, 404)


class STMactions:
    approve = "Board::approve_ticket"


class JWKSAndMetadata(unittest.TestCase):
    def setUp(self):
        self.app = AuthApp()

    def test_jwks_served(self):
        status, _, p = _body(self.app.dispatch("GET", "/jwks", {}, b""))
        self.assertEqual(status, 200)
        self.assertIn("keys", p)   # HMAC test-signer publishes none — [] is honest

    def test_metadata_points_to_owned_and_adopted(self):
        status, _, p = _body(self.app.dispatch(
            "GET", "/.well-known/oauth-authorization-server", {}, b""))
        self.assertEqual(status, 200)
        self.assertTrue(p["jwks_uri"].endswith("/jwks"))
        self.assertIn("authorization_endpoint", p)
        self.assertTrue(p["resource_indicators_supported"])

    def test_authorize_is_cannot_verify_here(self):
        status, _, p = _body(self.app.dispatch("GET", "/authorize", {}, b""))
        self.assertEqual(status, 501)
        self.assertEqual(p["error"], "adopted_by_keycloak")


class IntrospectAndRevoke(unittest.TestCase):
    def setUp(self):
        self.app = AuthApp()
        self.tok = self.app.demo_tokens()

    def test_introspect_active(self):
        status, _, p = _body(self.app.dispatch(
            "POST", "/introspect", {},
            json.dumps({"token": self.tok["valid_agent"], "aud": "board"}).encode()))
        self.assertEqual(status, 200)
        self.assertTrue(p["active"])
        self.assertEqual(p["sub"], "agent:patcher-07")

    def test_revoke_then_introspect_inactive(self):
        hdr = {"Authorization": f"Bearer {self.app.admin_token}"}
        status, _, p = _body(self.app.dispatch(
            "POST", "/revoke", hdr,
            json.dumps({"token": self.tok["valid_agent"]}).encode()))
        self.assertEqual(status, 200)
        self.assertTrue(p["revoked"])
        status, _, p = _body(self.app.dispatch(
            "POST", "/introspect", {},
            json.dumps({"token": self.tok["valid_agent"], "aud": "board"}).encode()))
        self.assertFalse(p["active"])

    def test_revoke_requires_admin(self):
        status, _, _ = _body(self.app.dispatch(
            "POST", "/revoke", {}, json.dumps({"token": self.tok["valid_agent"]}).encode()))
        self.assertEqual(status, 401)


class MCPSurface(unittest.TestCase):
    def setUp(self):
        self.app = AuthApp()
        self.tok = self.app.demo_tokens()

    def test_whoami_self_only(self):
        hdr = {"Authorization": f"Bearer {self.tok['self_agent']}"}
        status, _, p = _body(self.app.dispatch("POST", "/mcp/whoami", hdr, b"{}"))
        self.assertEqual(status, 200)
        self.assertEqual(p["sub"], "agent:patcher-07")
        self.assertTrue(p["self_only"])

    def test_cross_principal_is_refused(self):
        hdr = {"Authorization": f"Bearer {self.tok['self_agent']}"}
        status, _, p = _body(self.app.dispatch(
            "POST", "/mcp/whoami", hdr, json.dumps({"sub": "op:eide"}).encode()))
        self.assertEqual(status, 403)   # CrossPrincipalDenied

    def test_wrong_audience_token_refused(self):
        # A token minted for aud=board must not reach the auth MCP surface.
        hdr = {"Authorization": f"Bearer {self.tok['valid_agent']}"}
        status, _, _ = _body(self.app.dispatch("POST", "/mcp/whoami", hdr, b"{}"))
        self.assertEqual(status, 401)   # aud != auth -> validate fails

    def test_no_bearer_is_401(self):
        status, headers, _ = _body(self.app.dispatch("POST", "/mcp/whoami", {}, b"{}"))
        self.assertEqual(status, 401)
        self.assertEqual(headers.get("WWW-Authenticate"), "Bearer")


class AdminSurface(unittest.TestCase):
    def setUp(self):
        self.app = AuthApp()
        self.hdr = {"Authorization": f"Bearer {self.app.admin_token}"}

    def test_requires_admin(self):
        status, _, _ = _body(self.app.dispatch("GET", "/admin/principals", {}, b""))
        self.assertEqual(status, 401)

    def test_list_principals(self):
        status, _, p = _body(self.app.dispatch("GET", "/admin/principals", self.hdr, b""))
        self.assertEqual(status, 200)
        subs = {x["sub"] for x in p["principals"]}
        self.assertIn("op:eide", subs)

    def test_killswitch_arm_and_read(self):
        status, _, p = _body(self.app.dispatch(
            "POST", "/admin/killswitch", self.hdr, json.dumps({"level": "G1"}).encode()))
        self.assertEqual(status, 200)
        self.assertEqual(p["level"], "G1")
        status, _, p = _body(self.app.dispatch("GET", "/admin/killswitch", self.hdr, b""))
        self.assertEqual(p["level"], "G1")

    def test_sod_violation_is_refused_at_grant_time(self):
        # Create a role holding BOTH an approve-side and an action-side holder scope,
        # then attempt to assign it -> SSD conflict at grant time (atomic reject).
        from auth.core.principals import Role, Principal, AgentKey, KIND_SERVICE
        self.app.store.put_principal(Principal(sub="svc:x", kind=KIND_SERVICE, client_id="svc:x"))
        self.app.store.register_agent_key(AgentKey(
            sub="svc:x", kid="k", public_jwk={"kty": "OKP", "crv": "Ed25519", "x": "d"},
            storage_tier="hsm", non_exportable=True))
        self.app.store.put_role(Role(role_id="role:conflict", direct_scopes=frozenset({
            S.BOARD_APPROVE, S.GATEWAY_EXECUTE})))
        status, _, p = _body(self.app.dispatch(
            "POST", "/admin/roles/assign", self.hdr,
            json.dumps({"sub": "svc:x", "role_id": "role:conflict"}).encode()))
        self.assertEqual(status, 400)
        self.assertEqual(p["error"], "SoDViolation")

    def test_breakglass_stop_is_enacted_and_holds_no_action_side(self):
        status, _, p = _body(self.app.dispatch(
            "POST", "/admin/breakglass", self.hdr,
            json.dumps({"direction": "stop", "operation": "engage_kill",
                        "kill_level": "G2", "reason": "drill"}).encode()))
        self.assertEqual(status, 200)
        self.assertTrue(p["enacted"])
        self.assertFalse(p["holds_action_side_scope"])
        # The kill posture is now visible in the SAME shared state.
        level, _ = self.app.killswitch.current()
        self.assertEqual(level, "G2")


class StaticUI(unittest.TestCase):
    def setUp(self):
        self.app = AuthApp()

    def test_root_redirects_to_overview(self):
        status, headers, _ = self.app.dispatch("GET", "/", {}, b"")
        self.assertEqual(status, 302)
        self.assertEqual(headers["Location"], "/ui/overview.html")

    def test_overview_served(self):
        status, headers, out = self.app.dispatch("GET", "/ui/overview.html", {}, b"")
        self.assertEqual(status, 200)
        self.assertTrue(headers["Content-Type"].startswith("text/html"))
        self.assertIn(b"<", out)

    def test_path_traversal_blocked(self):
        status, _, _ = self.app.dispatch("GET", "/ui/../server.py", {}, b"")
        self.assertIn(status, (403, 404))


if __name__ == "__main__":
    unittest.main()
