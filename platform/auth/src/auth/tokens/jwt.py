"""auth.tokens.jwt — mint + validate RFC 9068 `at+jwt` access tokens.

The compact JWS is built on top of the Signer interface (auth.core.interfaces):
swapping the HMAC test-signer for the EdDSA/ES256 production signer is a config
swap; NONE of the token LOGIC here changes. This lets the whole claim/aud/exp/
jti/kid/cnf pipeline run GREEN in the sandbox with the stdlib HMAC signer, while
the asymmetric primitive is isolated behind Signer.sign/verify.

MINT  (auth is the SOLE minter):
  header = {alg, kid, typ:"at+jwt"}    payload = AccessTokenClaims.to_payload()
  token  = b64u(header) + "." + b64u(payload) + "." + b64u(sign(signing_input))

VALIDATE (every RS does this locally on the benign fast path, PLAN §4.7):
  * signature over the exact transmitted signing input (tamper → reject);
  * header `alg` == the resolving key's alg (blocks alg-confusion / alg=none);
  * `kid` resolves in the CURRENT JWKS (a retired kid → reject: the Redis-
    independent kill lever, PLAN §4.2/§7.3);
  * `exp` not passed (with optional small leeway) — expired → reject;
  * `aud` == self, EXACTLY ONE resource (decision #4, RFC 8707) — never a list;
  * `iss` == the single auth issuer (RFC 9207 issuer identification, adopted now).

Revocation (jti/sub/client denylist) is a SEPARATE, LIVE concern handled in
auth.tokens.revocation — deliberately NOT folded into local validation, because
the fast path accepts ≤ TTL staleness (PLAN §4.2) and only live-check paths pay
the denylist round-trip (PLAN §4.7).
"""
from __future__ import annotations

import base64
import json
from typing import Any, Dict, Optional, Tuple

from ..core.errors import AuthError
from ..core.interfaces import Signer, Verifier
from ..core.tokens_model import (
    TYP_ACCESS_TOKEN,
    AccessTokenClaims,
    Confirmation,
)


# ---------------------------------------------------------------------------
# Errors — one distinct type per rejection reason so callers map cleanly to the
# §5.6 wire status (401/403) without string-sniffing.
# ---------------------------------------------------------------------------

class TokenError(AuthError):
    """Base for every token mint/validate failure."""


class MalformedToken(TokenError):
    """Not three base64url segments, or the header/payload is not valid JSON."""


class InvalidSignature(TokenError):
    """Signature does not verify over the transmitted signing input (tamper)."""


class TokenExpired(TokenError):
    """`exp` is in the past (beyond leeway)."""


class WrongAudience(TokenError):
    """`aud` != self, or `aud` is a collection (must be EXACTLY ONE, RFC 8707)."""


class WrongIssuer(TokenError):
    """`iss` != the single auth issuer (RFC 9207 issuer identification)."""


class UntrustedKid(TokenError):
    """`kid` is absent, unknown, or RETIRED in the current JWKS (kill lever)."""


class AlgorithmMismatch(TokenError):
    """Header `alg` does not match the resolving key's alg (alg-confusion guard)."""


# ---------------------------------------------------------------------------
# base64url helpers (JOSE — unpadded). Exported; DPoP reuses them.
# ---------------------------------------------------------------------------

def b64u_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def b64u_decode(segment: str) -> bytes:
    if not isinstance(segment, str):
        raise MalformedToken("base64url segment must be str")
    pad = "=" * (-len(segment) % 4)
    try:
        return base64.urlsafe_b64decode(segment + pad)
    except Exception as exc:  # binascii.Error and friends
        raise MalformedToken(f"invalid base64url segment: {exc}") from exc


def _json_segment(obj: Dict[str, Any]) -> str:
    # Compact, deterministic serialization for the signing input.
    return b64u_encode(json.dumps(obj, separators=(",", ":"), sort_keys=False).encode("utf-8"))


def _decode_json_segment(segment: str, what: str) -> Dict[str, Any]:
    try:
        obj = json.loads(b64u_decode(segment).decode("utf-8"))
    except MalformedToken:
        raise
    except Exception as exc:
        raise MalformedToken(f"{what} is not valid JSON: {exc}") from exc
    if not isinstance(obj, dict):
        raise MalformedToken(f"{what} must be a JSON object")
    return obj


# ---------------------------------------------------------------------------
# MINT
# ---------------------------------------------------------------------------

def mint_access_token(claims: AccessTokenClaims, signer: Signer) -> str:
    """Serialize + sign an `at+jwt` (PLAN §4.3). auth is the sole minter.

    The JOSE header binds `alg`+`kid` from the signer so validators can resolve
    the exact key and reject alg-confusion. `typ` is `at+jwt` (RFC 9068).
    """
    header = {"alg": signer.alg, "kid": signer.kid, "typ": TYP_ACCESS_TOKEN}
    signing_input = f"{_json_segment(header)}.{_json_segment(claims.to_payload())}"
    signature = signer.sign(signing_input.encode("ascii"))
    if not signature:
        # Honesty guard: a signer that returns an empty/fake signature is a
        # security failure. Never emit an unsigned token.
        raise TokenError(
            "signer returned an empty signature — refusing to emit an unsigned "
            "token (a real signer MUST raise loudly if its primitive is absent)"
        )
    return f"{signing_input}.{b64u_encode(signature)}"


# ---------------------------------------------------------------------------
# VALIDATE
# ---------------------------------------------------------------------------

def _split(token: str) -> Tuple[str, str, str]:
    if not isinstance(token, str):
        raise MalformedToken("token must be a compact-JWS string")
    parts = token.split(".")
    if len(parts) != 3:
        raise MalformedToken(f"expected 3 JWS segments, got {len(parts)}")
    h, p, s = parts
    if not (h and p and s):
        raise MalformedToken("empty JWS segment (unsigned/alg=none tokens are refused)")
    return h, p, s


def _reconstruct_claims(payload: Dict[str, Any]) -> AccessTokenClaims:
    aud = payload.get("aud")
    if isinstance(aud, (list, tuple, set)):
        # Structural guard: a multi-audience token is not something auth mints
        # (decision #4). Reject before it can be honored anywhere.
        raise WrongAudience("aud must be EXACTLY ONE resource (RFC 8707), got a collection")
    for req in ("iss", "sub", "aud", "iat", "exp", "jti"):
        if req not in payload:
            raise MalformedToken(f"missing required claim {req!r}")
    scope_raw = payload.get("scope", "")
    scope = frozenset(str(scope_raw).split()) if scope_raw else frozenset()
    cnf_obj: Optional[Confirmation] = None
    cnf = payload.get("cnf")
    if isinstance(cnf, dict):
        cnf_obj = Confirmation(jkt=cnf.get("jkt"), x5t_s256=cnf.get("x5t#S256"))
    return AccessTokenClaims(
        iss=payload["iss"],
        sub=payload["sub"],
        aud=payload["aud"],
        scope=scope,
        iat=int(payload["iat"]),
        exp=int(payload["exp"]),
        jti=payload["jti"],
        client_id=payload.get("client_id"),
        cnf=cnf_obj,
        kill_epoch=int(payload.get("kill_epoch", 0)),
        kill_level=str(payload.get("kill_level", "G0")),
        auth_time=(int(payload["auth_time"]) if payload.get("auth_time") is not None else None),
    )


def validate_access_token(
    token: str,
    keyring: "KeyRingLike",
    *,
    expected_iss: str,
    expected_aud: str,
    now: int,
    leeway_s: int = 0,
) -> AccessTokenClaims:
    """Local (offline) RS validation of an `at+jwt` (PLAN §4.7 fast path).

    Order matters: resolve the key (kid current?) and verify the signature
    BEFORE trusting any claim value. Returns the parsed claims on success;
    raises a specific TokenError subclass otherwise.

    `keyring` need only expose `verifier_for(kid) -> Optional[Verifier]` (a
    retired/unknown kid resolves to None → UntrustedKid). auth.tokens.jwks.KeyRing
    satisfies this; a test may pass any object with that method.
    """
    h_seg, p_seg, s_seg = _split(token)

    header = _decode_json_segment(h_seg, "JOSE header")
    kid = header.get("kid")
    if not kid:
        raise UntrustedKid("JOSE header has no kid")
    alg = header.get("alg")
    if not alg or alg == "none":
        raise AlgorithmMismatch("alg=none / missing alg is refused")
    typ = header.get("typ")
    if typ != TYP_ACCESS_TOKEN:
        raise MalformedToken(f"unexpected typ {typ!r}; want {TYP_ACCESS_TOKEN!r}")

    verifier = keyring.verifier_for(kid)
    if verifier is None:
        # Unknown OR retired kid — the Redis-independent mass/global kill (§4.2).
        raise UntrustedKid(f"kid {kid!r} is not in the current JWKS (unknown or retired)")
    if header["alg"] != verifier.alg:
        # alg-confusion guard: the token must be signed with the key's real alg.
        raise AlgorithmMismatch(
            f"header alg {header['alg']!r} != key alg {verifier.alg!r} for kid {kid!r}"
        )

    signing_input = f"{h_seg}.{p_seg}".encode("ascii")
    signature = b64u_decode(s_seg)
    if not verifier.verify(signing_input, signature):
        raise InvalidSignature(f"signature does not verify for kid {kid!r}")

    payload = _decode_json_segment(p_seg, "JWT payload")
    claims = _reconstruct_claims(payload)

    # RFC 9207 issuer identification — RS MUST verify iss == the single auth issuer.
    if claims.iss != expected_iss:
        raise WrongIssuer(f"iss {claims.iss!r} != expected {expected_iss!r}")

    # RFC 8707 — RS MUST verify aud == self (exactly one resource).
    if claims.aud != expected_aud:
        raise WrongAudience(f"aud {claims.aud!r} != self {expected_aud!r}")

    if now > claims.exp + leeway_s:
        raise TokenExpired(f"token expired at {claims.exp} (now {now}, leeway {leeway_s}s)")

    return claims


# Structural alias for the keyring dependency (avoids importing jwks here and a
# circular import; jwks.KeyRing is the concrete impl).
class KeyRingLike:  # pragma: no cover - documentation/typing marker
    def verifier_for(self, kid: str) -> Optional[Verifier]:  # noqa: D401
        ...
