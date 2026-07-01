"""auth.tests.test_tokens — Phase-2 TOKENS / JWKS / DPoP / REVOCATION tests.

Every security-critical token path is exercised with the stdlib HMAC test-signer
so it runs GREEN here. The only CANNOT-VERIFY-HERE seam is the ASYMMETRIC
signature primitive (EdDSA/ES256), which is isolated behind the Signer interface
and delegated in DPoP — the surrounding LOGIC (claims/aud/exp/jti/kid/cnf/
revocation/decision-table/thumbprint/htm/htu/iat/replay) is fully verified.

Run:
  cd platform/auth/src && python -m unittest auth.tests.test_tokens -v
"""
from __future__ import annotations

import time
import unittest

from auth.core import scopes as S
from auth.core.errors import UnknownScope
from auth.core.tokens_model import AccessTokenClaims, Confirmation
from auth.crypto.signer_hmac import HMACSigner
from auth.store.memory_hot import MemoryHotStore

from auth.tokens import (
    AlgorithmMismatch,
    DPoPError,
    DPoPReplayCache,
    Enforcement,
    InvalidSignature,
    KeyRing,
    MalformedToken,
    TokenExpired,
    UntrustedKid,
    WrongAudience,
    WrongIssuer,
    b64u_decode,
    b64u_encode,
    classify,
)

# compute_ath is not part of the package __all__; import directly.
from auth.tokens.dpop import compute_ath, jwk_thumbprint, verify_dpop_proof
from auth.tokens.jwt import mint_access_token, validate_access_token
from auth.tokens.revocation import consult_denylist, evaluate, RevocationDecision


ISS = "https://auth.suite.local"
AUD = "board"
# Anchored at real wall-clock: MemoryHotStore GCs denied jtis whose exp <= now()
# (real time), so denylist test exps must be in the real future.
NOW = int(time.time())


def _signer(kid: str = "kid-at-1") -> HMACSigner:
    return HMACSigner(b"a" * 32, kid)


def _keyring(signer: HMACSigner) -> KeyRing:
    kr = KeyRing()
    kr.add_key(signer)  # HMAC signer is its own verifier
    return kr


def _claims(**over) -> AccessTokenClaims:
    base = dict(
        iss=ISS,
        sub="agent:patcher-07",
        aud=AUD,
        scope=frozenset({S.BOARD_READ}),
        iat=NOW,
        exp=NOW + 120,
        jti="jti-1",
        client_id="agent:patcher-07",
    )
    base.update(over)
    return AccessTokenClaims(**base)


# ---------------------------------------------------------------------------
# JWT mint -> validate
# ---------------------------------------------------------------------------

class TestMintValidateRoundTrip(unittest.TestCase):
    def test_roundtrip(self):
        signer = _signer()
        kr = _keyring(signer)
        token = mint_access_token(_claims(), signer)
        got = validate_access_token(token, kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)
        self.assertEqual(got.sub, "agent:patcher-07")
        self.assertEqual(got.aud, AUD)
        self.assertEqual(got.jti, "jti-1")
        self.assertIn(S.BOARD_READ, got.scope)
        self.assertEqual(got.client_id, "agent:patcher-07")

    def test_roundtrip_preserves_cnf_and_kill_fields(self):
        signer = _signer()
        kr = _keyring(signer)
        claims = _claims(cnf=Confirmation(jkt="thumb-xyz"), kill_epoch=7, kill_level="G1")
        token = mint_access_token(claims, signer)
        got = validate_access_token(token, kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)
        self.assertIsNotNone(got.cnf)
        self.assertEqual(got.cnf.jkt, "thumb-xyz")
        self.assertEqual(got.kill_epoch, 7)
        self.assertEqual(got.kill_level, "G1")


class TestValidationRejections(unittest.TestCase):
    def setUp(self):
        self.signer = _signer()
        self.kr = _keyring(self.signer)
        self.token = mint_access_token(_claims(), self.signer)

    def test_tamper_payload_rejected(self):
        h, p, s = self.token.split(".")
        # Flip a bit in the payload segment -> signature must fail.
        tampered_payload = b64u_encode(b64u_decode(p) + b" ")
        bad = f"{h}.{tampered_payload}.{s}"
        with self.assertRaises(InvalidSignature):
            validate_access_token(bad, self.kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)

    def test_tamper_signature_rejected(self):
        h, p, s = self.token.split(".")
        raw = bytearray(b64u_decode(s))
        raw[-1] ^= 0x01
        bad = f"{h}.{p}.{b64u_encode(bytes(raw))}"
        with self.assertRaises(InvalidSignature):
            validate_access_token(bad, self.kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)

    def test_wrong_aud_rejected(self):
        with self.assertRaises(WrongAudience):
            validate_access_token(
                self.token, self.kr, expected_iss=ISS, expected_aud="gateway", now=NOW + 1
            )

    def test_wrong_iss_rejected(self):
        with self.assertRaises(WrongIssuer):
            validate_access_token(
                self.token, self.kr, expected_iss="https://evil", expected_aud=AUD, now=NOW + 1
            )

    def test_expired_rejected(self):
        with self.assertRaises(TokenExpired):
            validate_access_token(
                self.token, self.kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1000
            )

    def test_expired_within_leeway_ok(self):
        got = validate_access_token(
            self.token, self.kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 125, leeway_s=10
        )
        self.assertEqual(got.sub, "agent:patcher-07")

    def test_alg_none_rejected(self):
        # Forge a header with alg=none over the same payload -> must be refused.
        import json
        h = b64u_encode(json.dumps({"alg": "none", "kid": "kid-at-1", "typ": "at+jwt"}).encode())
        _, p, _ = self.token.split(".")
        # Non-empty (bogus) signature segment so validation reaches the alg check
        # rather than the empty-segment guard; alg=none must still be refused.
        with self.assertRaises(AlgorithmMismatch):
            validate_access_token(f"{h}.{p}.AA", self.kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)

    def test_malformed_rejected(self):
        with self.assertRaises(MalformedToken):
            validate_access_token("not-a-jwt", self.kr, expected_iss=ISS, expected_aud=AUD, now=NOW)

    def test_unknown_kid_rejected(self):
        # A token from a signer whose kid was never registered in the ring.
        other = HMACSigner(b"b" * 32, "kid-unknown")
        token = mint_access_token(_claims(), other)
        with self.assertRaises(UntrustedKid):
            validate_access_token(token, self.kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)

    def test_alg_confusion_rejected(self):
        # Same kid registered, but token forged with a different alg in the header.
        import json
        _, p, _ = self.token.split(".")
        forged_header = b64u_encode(
            json.dumps({"alg": "RS256", "kid": "kid-at-1", "typ": "at+jwt"}).encode()
        )
        # Re-sign the (forged header . payload) with the HMAC key so signature is
        # valid but alg claims RS256 != key alg HS256.
        signing_input = f"{forged_header}.{p}".encode("ascii")
        sig = b64u_encode(self.signer.sign(signing_input))
        with self.assertRaises(AlgorithmMismatch):
            validate_access_token(
                f"{forged_header}.{p}.{sig}", self.kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1
            )


# ---------------------------------------------------------------------------
# JWKS — rotate / retire (the Redis-independent kill lever)
# ---------------------------------------------------------------------------

class TestKeyRing(unittest.TestCase):
    def test_retired_kid_denies_validation(self):
        signer = _signer()
        kr = _keyring(signer)
        token = mint_access_token(_claims(), signer)
        # Valid before retirement.
        validate_access_token(token, kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)
        # Retire the kid -> every token under it fails, with NO Redis involvement.
        kr.retire(signer.kid)
        self.assertIsNone(kr.verifier_for(signer.kid))
        self.assertFalse(kr.is_current(signer.kid))
        with self.assertRaises(UntrustedKid):
            validate_access_token(token, kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)

    def test_rotation_overlapping_validity(self):
        old = _signer("kid-old")
        kr = _keyring(old)
        old_token = mint_access_token(_claims(), old)
        new = HMACSigner(b"c" * 32, "kid-new")
        kr.rotate_in(new)
        # Old kid demoted to rotating but STILL honored during overlap.
        self.assertEqual(kr.status_of("kid-old"), "rotating")
        self.assertEqual(kr.active_kid(), "kid-new")
        validate_access_token(old_token, kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)
        # New kid works too.
        new_token = mint_access_token(_claims(jti="jti-new"), new)
        validate_access_token(new_token, kr, expected_iss=ISS, expected_aud=AUD, now=NOW + 1)

    def test_serve_excludes_hmac_secret_and_retired(self):
        signer = _signer()
        kr = _keyring(signer)
        # HMAC test-signer has no publishable public JWK -> never served.
        self.assertEqual(kr.serve(), {"keys": []})
        # An asymmetric-shaped entry with a public JWK IS served, until retired.
        class _FakeVerifier:
            kid = "kid-ed"
            alg = "EdDSA"
            def verify(self, si, sig):  # noqa: D401
                return True
        pub = {"kty": "OKP", "crv": "Ed25519", "x": "abc"}
        kr.add_key(_FakeVerifier(), public_jwk=pub)
        served = kr.serve()["keys"]
        self.assertEqual(len(served), 1)
        self.assertEqual(served[0]["kid"], "kid-ed")
        kr.retire("kid-ed")
        self.assertEqual(kr.serve(), {"keys": []})


# ---------------------------------------------------------------------------
# DPoP — proof-check logic (signature primitive delegated to the HMAC signer)
# ---------------------------------------------------------------------------

# A crafted OKP public JWK to compute a stable thumbprint; the HMAC signer stands
# in for the asymmetric signature primitive (CANNOT-VERIFY-HERE for real EdDSA).
DPOP_JWK = {"kty": "OKP", "crv": "Ed25519", "x": "11qYAYKxCrfVS_7TyWQHOg7hcvPapiMlrwIaaPcHURo"}
HTU = "https://board.suite.local/mcp"
HTM = "POST"


def _make_proof(signer: HMACSigner, *, htm=HTM, htu=HTU, iat=NOW, jti="dpop-1",
                nonce=None, ath=None, jwk=None, typ="dpop+jwt", alg=None):
    import json
    header = {"typ": typ, "alg": alg or signer.alg, "jwk": jwk if jwk is not None else DPOP_JWK}
    payload = {"htm": htm, "htu": htu, "iat": iat, "jti": jti}
    if nonce is not None:
        payload["nonce"] = nonce
    if ath is not None:
        payload["ath"] = ath
    h = b64u_encode(json.dumps(header).encode())
    p = b64u_encode(json.dumps(payload).encode())
    sig = b64u_encode(signer.sign(f"{h}.{p}".encode("ascii")))
    return f"{h}.{p}.{sig}"


class TestDPoP(unittest.TestCase):
    def setUp(self):
        self.signer = HMACSigner(b"d" * 32, "kid-dpop")
        self.jkt = jwk_thumbprint(DPOP_JWK)

    def test_thumbprint_rfc7638_stable_and_ignores_extras(self):
        # Extra members (kid/use/alg) must not change the thumbprint.
        decorated = dict(DPOP_JWK, kid="whatever", use="sig", alg="EdDSA")
        self.assertEqual(jwk_thumbprint(decorated), self.jkt)

    def test_valid_proof(self):
        proof = _make_proof(self.signer)
        claims = verify_dpop_proof(
            proof, htm=HTM, htu=HTU, signature_verifier=self.signer,
            expected_jkt=self.jkt, now=NOW,
        )
        self.assertEqual(claims.jti, "dpop-1")
        self.assertEqual(claims.jkt, self.jkt)

    def test_jkt_mismatch_rejected(self):
        proof = _make_proof(self.signer)
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(
                proof, htm=HTM, htu=HTU, signature_verifier=self.signer,
                expected_jkt="some-other-thumbprint", now=NOW,
            )
        self.assertEqual(ctx.exception.reason, "jkt_mismatch")

    def test_wrong_htm_rejected(self):
        proof = _make_proof(self.signer)
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(proof, htm="GET", htu=HTU, signature_verifier=self.signer, now=NOW)
        self.assertEqual(ctx.exception.reason, "htm_mismatch")

    def test_wrong_htu_rejected(self):
        proof = _make_proof(self.signer)
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(
                proof, htm=HTM, htu="https://gateway.suite.local/mcp",
                signature_verifier=self.signer, now=NOW,
            )
        self.assertEqual(ctx.exception.reason, "htu_mismatch")

    def test_htu_query_and_trailing_slash_tolerated(self):
        proof = _make_proof(self.signer, htu="https://board.suite.local/mcp/")
        # request htu with a query string + no trailing slash still matches.
        verify_dpop_proof(
            proof, htm=HTM, htu="https://board.suite.local/mcp?x=1",
            signature_verifier=self.signer, now=NOW,
        )

    def test_stale_iat_rejected(self):
        proof = _make_proof(self.signer, iat=NOW - 10_000)
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(proof, htm=HTM, htu=HTU, signature_verifier=self.signer, now=NOW)
        self.assertEqual(ctx.exception.reason, "stale")

    def test_future_iat_rejected(self):
        proof = _make_proof(self.signer, iat=NOW + 10_000)
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(proof, htm=HTM, htu=HTU, signature_verifier=self.signer, now=NOW)
        self.assertEqual(ctx.exception.reason, "future")

    def test_bad_signature_rejected(self):
        proof = _make_proof(self.signer)
        wrong = HMACSigner(b"e" * 32, "kid-dpop")  # different secret -> verify fails
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(proof, htm=HTM, htu=HTU, signature_verifier=wrong, now=NOW)
        self.assertEqual(ctx.exception.reason, "bad_signature")

    def test_bad_typ_rejected(self):
        proof = _make_proof(self.signer, typ="jwt")
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(proof, htm=HTM, htu=HTU, signature_verifier=self.signer, now=NOW)
        self.assertEqual(ctx.exception.reason, "bad_typ")

    def test_replay_rejected(self):
        cache = DPoPReplayCache()
        proof = _make_proof(self.signer)
        verify_dpop_proof(
            proof, htm=HTM, htu=HTU, signature_verifier=self.signer,
            now=NOW, replay_cache=cache,
        )
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(
                proof, htm=HTM, htu=HTU, signature_verifier=self.signer,
                now=NOW, replay_cache=cache,
            )
        self.assertEqual(ctx.exception.reason, "replay")

    def test_nonce_required(self):
        proof = _make_proof(self.signer)  # no nonce
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(
                proof, htm=HTM, htu=HTU, signature_verifier=self.signer,
                now=NOW, required_nonce="server-nonce-123",
            )
        self.assertEqual(ctx.exception.reason, "nonce_mismatch")
        ok = _make_proof(self.signer, nonce="server-nonce-123", jti="dpop-2")
        verify_dpop_proof(
            ok, htm=HTM, htu=HTU, signature_verifier=self.signer,
            now=NOW, required_nonce="server-nonce-123",
        )

    def test_ath_binding(self):
        access_token = "the.access.token"
        ath = compute_ath(access_token)
        good = _make_proof(self.signer, ath=ath, jti="dpop-ath-ok")
        verify_dpop_proof(
            good, htm=HTM, htu=HTU, signature_verifier=self.signer, now=NOW, expected_ath=ath,
        )
        bad = _make_proof(self.signer, ath="wrong", jti="dpop-ath-bad")
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(
                bad, htm=HTM, htu=HTU, signature_verifier=self.signer, now=NOW, expected_ath=ath,
            )
        self.assertEqual(ctx.exception.reason, "ath_mismatch")

    def test_private_jwk_in_header_rejected(self):
        proof = _make_proof(self.signer, jwk=dict(DPOP_JWK, d="private-scalar"))
        with self.assertRaises(DPoPError) as ctx:
            verify_dpop_proof(proof, htm=HTM, htu=HTU, signature_verifier=self.signer, now=NOW)
        self.assertEqual(ctx.exception.reason, "private_jwk")


# ---------------------------------------------------------------------------
# Revocation — live denylist + §4.7 decision table
# ---------------------------------------------------------------------------

class TestDecisionTable(unittest.TestCase):
    def test_benign_read_is_fast_path(self):
        self.assertEqual(classify(S.BOARD_READ), Enforcement.FAST_PATH)
        self.assertEqual(classify(S.NOTES_READ), Enforcement.FAST_PATH)
        self.assertEqual(classify(S.CMDB_READ_POLICY), Enforcement.FAST_PATH)
        self.assertEqual(classify(S.VAULT_REFERENCE), Enforcement.FAST_PATH)
        self.assertEqual(classify(S.BOARD_PROPOSE), Enforcement.FAST_PATH)  # reversible write

    def test_approve_side_holders_live_check(self):
        self.assertEqual(classify(S.BOARD_APPROVE), Enforcement.LIVE_CHECK)
        self.assertEqual(classify(S.CMDB_WRITE_POLICY), Enforcement.LIVE_CHECK)

    def test_action_side_holders_live_plus_introspect(self):
        self.assertEqual(classify(S.GATEWAY_EXECUTE), Enforcement.LIVE_PLUS_INTROSPECT)
        self.assertEqual(classify(S.VAULT_READ_CREDENTIAL), Enforcement.LIVE_PLUS_INTROSPECT)
        self.assertTrue(classify(S.GATEWAY_EXECUTE).requires_introspection)
        self.assertTrue(classify(S.VAULT_READ_CREDENTIAL).requires_live_check)

    def test_kill_switch_live_check(self):
        self.assertEqual(classify(S.MC_KILL_SWITCH), Enforcement.LIVE_CHECK)

    def test_other_tier2_defaults_live_check(self):
        self.assertEqual(classify(S.BOARD_CLAIM), Enforcement.LIVE_CHECK)
        self.assertEqual(classify(S.AUTH_MANAGE_IDENTITY), Enforcement.LIVE_CHECK)

    def test_unknown_scope_raises(self):
        with self.assertRaises(UnknownScope):
            classify("bogus:scope")


class TestLiveRevocation(unittest.TestCase):
    def setUp(self):
        self.hot = MemoryHotStore()

    def test_fast_path_never_consults_denylist(self):
        # Even a denied jti is allowed on the FAST_PATH (staleness <= TTL accepted).
        self.hot.deny_jti("jti-1", exp=NOW + 120)
        claims = _claims(scope=frozenset({S.BOARD_READ}))
        d = evaluate(claims, self.hot, required_scope=S.BOARD_READ)
        self.assertTrue(d.allowed)
        self.assertEqual(d.enforcement, Enforcement.FAST_PATH)

    def test_revoked_jti_denied_on_live_path(self):
        self.hot.deny_jti("jti-1", exp=NOW + 120)
        claims = _claims(scope=frozenset({S.BOARD_APPROVE}))
        d = evaluate(claims, self.hot, required_scope=S.BOARD_APPROVE)
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "jti_revoked")
        self.assertEqual(d.granularity, "jti")

    def test_sub_revoked_before_denies_older_tokens(self):
        # Revoke everything for the sub issued before NOW+60.
        self.hot.set_revoked_before("agent:patcher-07", NOW + 60)
        old = _claims(iat=NOW, scope=frozenset({S.GATEWAY_EXECUTE}))
        d_old = consult_denylist(
            self.hot, jti=old.jti, sub=old.sub, iat=old.iat,
            client_id=old.client_id, enforcement=Enforcement.LIVE_PLUS_INTROSPECT,
        )
        self.assertFalse(d_old.allowed)
        self.assertEqual(d_old.reason, "sub_revoked_before")
        # A token minted AFTER the watermark is fine.
        new = _claims(iat=NOW + 120, exp=NOW + 240, jti="jti-2")
        d_new = consult_denylist(self.hot, jti=new.jti, sub=new.sub, iat=new.iat)
        self.assertTrue(d_new.allowed)

    def test_kid_retired_denied(self):
        self.hot.retire_kid("kid-at-1")
        d = consult_denylist(self.hot, jti="jti-1", sub="agent:x", iat=NOW, kid="kid-at-1")
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "kid_retired")

    def test_client_disabled_denied(self):
        self.hot.disable_client("agent:patcher-07")
        d = consult_denylist(
            self.hot, jti="jti-1", sub="agent:patcher-07", iat=NOW,
            client_id="agent:patcher-07",
        )
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "client_disabled")

    def test_g2_quiesce_denies_even_live_path(self):
        self.hot.set_killswitch("G2", 1)
        d = consult_denylist(self.hot, jti="jti-1", sub="agent:x", iat=NOW)
        self.assertFalse(d.allowed)
        self.assertEqual(d.granularity, "killswitch")

    def test_clean_token_allowed_on_live_path(self):
        claims = _claims(scope=frozenset({S.BOARD_APPROVE}))
        d = evaluate(claims, self.hot, required_scope=S.BOARD_APPROVE)
        self.assertTrue(d.allowed)
        self.assertEqual(d.enforcement, Enforcement.LIVE_CHECK)

    def test_fail_closed_when_denylist_unreadable(self):
        class _BrokenHot(MemoryHotStore):
            def is_jti_denied(self, jti):
                raise RuntimeError("redis down")
        broken = _BrokenHot()
        d = consult_denylist(broken, jti="jti-1", sub="agent:x", iat=NOW)
        self.assertFalse(d.allowed)
        self.assertEqual(d.reason, "revocation_unreadable")


if __name__ == "__main__":
    unittest.main(verbosity=2)
