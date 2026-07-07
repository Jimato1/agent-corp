"""RS authz: aud enforcement, scope gating, the human-kind gate on library:admin
(an agent can NEVER reach admission decisions), 401 bootstrap."""
import base64
import hashlib
import hmac
import json
import time
import unittest

from library.config import Config
from library.authz.rs import RSMiddleware
from library.errors import InsufficientScope, KindGateViolation, Unauthenticated


def _b64(obj):
    return base64.urlsafe_b64encode(json.dumps(obj).encode()).rstrip(b"=").decode()


def mint(secret, *, sub, scope, aud="library", iss="https://auth.suite.local", exp_in=300):
    header = {"alg": "HS256", "typ": "JWT", "kid": "test"}
    claims = {"sub": sub, "scope": scope, "aud": aud, "iss": iss,
              "exp": time.time() + exp_in, "iat": time.time()}
    si = f"{_b64(header)}.{_b64(claims)}".encode()
    sig = hmac.new(secret.encode(), si, hashlib.sha256).digest()
    return si.decode() + "." + base64.urlsafe_b64encode(sig).rstrip(b"=").decode()


class TestRSAuthz(unittest.TestCase):
    def setUp(self):
        self.cfg = Config.from_env()
        self.cfg.signer_alg = "HS256"
        self.cfg.at_secret = "secret-A"
        self.cfg.audience = "library"
        self.cfg.issuer = "https://auth.suite.local"
        self.rs = RSMiddleware(self.cfg)

    def _hdr(self, token):
        return {"Authorization": f"Bearer {token}"}

    def test_wrong_audience_rejected(self):
        tok = mint("secret-A", sub="agent:c", scope="library:read", aud="notes")
        with self.assertRaises(Unauthenticated):
            self.rs.authenticate(self._hdr(tok))

    def test_bad_signature_rejected(self):
        tok = mint("WRONG", sub="agent:c", scope="library:read")
        with self.assertRaises(Unauthenticated):
            self.rs.authenticate(self._hdr(tok))

    def test_read_scope_allows_search(self):
        tok = mint("secret-A", sub="agent:c", scope="library:read")
        pr = self.rs.authenticate(self._hdr(tok))
        self.assertEqual(self.rs.require(pr, "library_search"), "library:read")

    def test_missing_scope_denied(self):
        tok = mint("secret-A", sub="agent:c", scope="library:read")
        pr = self.rs.authenticate(self._hdr(tok))
        with self.assertRaises(InsufficientScope):
            self.rs.require(pr, "library_propose")

    def test_agent_cannot_reach_admin_even_with_scope(self):
        # an agent token that somehow carries library:admin is STILL kind-gated
        tok = mint("secret-A", sub="agent:evil", scope="library:admin")
        pr = self.rs.authenticate(self._hdr(tok))
        with self.assertRaises(KindGateViolation):
            self.rs.require(pr, "review_decision")

    def test_operator_admin_allowed(self):
        tok = mint("secret-A", sub="op:ada", scope="library:admin")
        pr = self.rs.authenticate(self._hdr(tok))
        self.assertEqual(self.rs.require(pr, "review_decision"), "library:admin")

    def test_missing_token_401_with_www_authenticate(self):
        with self.assertRaises(Unauthenticated):
            self.rs.authenticate({})
        self.assertIn("resource_metadata", self.rs.www_authenticate())

    def test_unclassified_op_fails_closed(self):
        tok = mint("secret-A", sub="op:ada", scope="library:admin")
        pr = self.rs.authenticate(self._hdr(tok))
        with self.assertRaises(InsufficientScope):
            self.rs.require(pr, "some_unknown_op")


if __name__ == "__main__":
    unittest.main()
