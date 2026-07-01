"""auth.tokens.dpop — DPoP (RFC 9449) proof-check LOGIC.

DPoP is auth's v1 default sender-constraining for agent tokens (PLAN §4.5):
the access token carries `cnf.jkt` = the SHA-256 JWK thumbprint (RFC 7638) of the
agent's proof key, and every request presents a fresh DPoP proof JWT signed by
that proof key. This module checks EVERYTHING about the proof except the
asymmetric signature primitive:

  * structure — header `typ` == "dpop+jwt", an embedded public `jwk`, an `alg`
    that is not "none";
  * `cnf.jkt` BINDING — the proof key's RFC 7638 thumbprint == the token's
    `cnf.jkt` (this is what ties the proof to the token; a mismatch means the
    proof was made with a different key → reject);
  * `htm` / `htu` — the proof is bound to THIS method + URI (anti-replay across
    endpoints);
  * `iat` freshness window — the proof is recent (anti-replay across time);
  * `jti` single-use — replay cache rejects a re-presented proof;
  * optional server `nonce` (RFC 9449 §8) and `ath` (access-token hash) binding.

CANNOT-VERIFY-HERE — the SIGNATURE PRIMITIVE:
  A real DPoP proof is signed by an ASYMMETRIC key (ES256/EdDSA) embedded in the
  header `jwk`; verifying it needs the 'cryptography' package to reconstruct a
  public key from the JWK. That primitive is DELEGATED to a Signer/Verifier
  passed in by the caller (`signature_verifier`), exactly as the build brief
  requires. In the sandbox we exercise ALL of the logic above using the stdlib
  HMAC test-signer as the primitive; in production the caller builds an EdDSA/
  ES256 Verifier from the header `jwk`. To close this item, on a build host with
  network:
      python -m pip install "cryptography>=42"
  then wire `verifier_from_jwk(header_jwk)` (a thin cryptography-backed factory)
  as `signature_verifier` and re-run this module's tests against real ES256/EdDSA
  proofs. The thumbprint/htm/htu/iat/nonce/replay LOGIC is primitive-agnostic and
  is fully verified here.
"""
from __future__ import annotations

import base64
import hashlib
import json
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, Optional

from ..core.errors import AuthError
from ..core.interfaces import Verifier
from .jwt import b64u_decode, b64u_encode


DPOP_TYP = "dpop+jwt"
# RFC 7638 required members per key type, in the canonical (lexicographic) order.
_THUMBPRINT_MEMBERS = {
    "OKP": ("crv", "kty", "x"),
    "EC": ("crv", "kty", "x", "y"),
    "RSA": ("e", "kty", "n"),
    "oct": ("k", "kty"),
}


class DPoPError(AuthError):
    """A DPoP proof failed a structural / binding / freshness / replay check."""

    def __init__(self, reason: str, message: Optional[str] = None) -> None:
        self.reason = reason  # machine code, e.g. "jkt_mismatch", "stale", "replay"
        super().__init__(message or f"DPoP proof rejected: {reason}")


@dataclass
class DPoPClaims:
    """The verified proof claims (returned on success)."""
    jti: str
    htm: str
    htu: str
    iat: int
    jkt: str                         # thumbprint of the embedded proof key
    nonce: Optional[str] = None
    ath: Optional[str] = None


# ---------------------------------------------------------------------------
# RFC 7638 JWK thumbprint (pure stdlib — the cnf.jkt binding key).
# ---------------------------------------------------------------------------

def jwk_thumbprint(jwk: Dict[str, Any]) -> str:
    """SHA-256 JWK thumbprint (RFC 7638), base64url, no padding.

    Only the REQUIRED members for the key type, lexicographically ordered, are
    hashed — extra members (kid, use, alg, ...) are excluded, so the thumbprint
    is stable regardless of how the JWK is decorated. This value is exactly what
    goes in the access token's `cnf.jkt`.
    """
    kty = jwk.get("kty")
    members = _THUMBPRINT_MEMBERS.get(kty) if isinstance(kty, str) else None
    if members is None:
        raise DPoPError("bad_jwk", f"unsupported/absent JWK kty {kty!r} for thumbprint")
    canonical: Dict[str, Any] = {}
    for m in members:
        if m not in jwk:
            raise DPoPError("bad_jwk", f"JWK missing required member {m!r} for kty {kty!r}")
        canonical[m] = jwk[m]
    # json.dumps with sort_keys + no whitespace == RFC 7638 canonical form.
    serialized = json.dumps(canonical, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return b64u_encode(hashlib.sha256(serialized).digest())


def compute_ath(access_token: str) -> str:
    """RFC 9449 `ath` — base64url SHA-256 of the ASCII access token string."""
    return b64u_encode(hashlib.sha256(access_token.encode("ascii")).digest())


# ---------------------------------------------------------------------------
# Replay cache — jti single-use within the freshness window (in-process).
# ---------------------------------------------------------------------------

class DPoPReplayCache:
    """Remembers seen proof `jti`s until they age out of the freshness window.

    In-process + TTL-GC'd. Production co-locates this in the same Redis the
    denylist uses so replay protection is suite-wide (a proof replayed at another
    RS is caught); the LOGIC — first-use accepted, second-use rejected, expired
    entries evictable — is identical and fully tested here.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._seen: Dict[str, int] = {}   # jti -> expiry unix seconds

    def check_and_remember(self, jti: str, expiry: int, now: int) -> bool:
        """Return True if `jti` is fresh (first use) and record it; False if it
        was already seen (replay)."""
        with self._lock:
            self._gc(now)
            if jti in self._seen:
                return False
            self._seen[jti] = expiry
            return True

    def _gc(self, now: int) -> None:
        expired = [j for j, exp in self._seen.items() if exp <= now]
        for j in expired:
            del self._seen[j]


# ---------------------------------------------------------------------------
# The proof check.
# ---------------------------------------------------------------------------

def _decode_segment(seg: str, what: str) -> Dict[str, Any]:
    obj = json.loads(b64u_decode(seg).decode("utf-8"))
    if not isinstance(obj, dict):
        raise DPoPError("malformed", f"DPoP {what} must be a JSON object")
    return obj


def verify_dpop_proof(
    proof: str,
    *,
    htm: str,
    htu: str,
    signature_verifier: Verifier,
    expected_jkt: Optional[str] = None,
    now: Optional[int] = None,
    max_iat_skew_s: int = 300,
    required_nonce: Optional[str] = None,
    expected_ath: Optional[str] = None,
    replay_cache: Optional[DPoPReplayCache] = None,
) -> DPoPClaims:
    """Check a DPoP proof JWT (RFC 9449). Raises DPoPError on any failure; returns
    the verified DPoPClaims on success.

    Parameters:
      htm/htu           — the HTTP method + full URI of THIS request; the proof
                          must be bound to them.
      signature_verifier — the primitive that checks the proof's signature. In
                          prod this is an ES256/EdDSA Verifier built from the
                          embedded header `jwk` (CANNOT-VERIFY-HERE without
                          'cryptography'); in tests it is the HMAC test-signer.
      expected_jkt      — the access token's `cnf.jkt`; the proof key's
                          thumbprint MUST equal it (the binding).
      max_iat_skew_s    — freshness window (proof too old OR too far future →
                          reject). Default 300s per common DPoP practice.
      required_nonce    — if set, the proof MUST carry this server nonce.
      expected_ath      — if set (typically compute_ath(access_token)), the proof
                          MUST carry a matching `ath`.
      replay_cache      — if set, the proof `jti` MUST be first-use.
    """
    now = int(time.time()) if now is None else int(now)

    parts = proof.split(".")
    if len(parts) != 3 or not all(parts):
        raise DPoPError("malformed", "DPoP proof must be 3 non-empty JWS segments")
    h_seg, p_seg, s_seg = parts

    try:
        header = _decode_segment(h_seg, "header")
        payload = _decode_segment(p_seg, "payload")
    except DPoPError:
        raise
    except Exception as exc:
        raise DPoPError("malformed", f"DPoP proof not decodable: {exc}") from exc

    # -- structure --------------------------------------------------------
    if header.get("typ") != DPOP_TYP:
        raise DPoPError("bad_typ", f"typ must be {DPOP_TYP!r}, got {header.get('typ')!r}")
    alg = header.get("alg")
    if not alg or alg == "none":
        raise DPoPError("bad_alg", "DPoP alg=none / missing is refused")
    jwk = header.get("jwk")
    if not isinstance(jwk, dict):
        raise DPoPError("no_jwk", "DPoP header must embed the public proof key as 'jwk'")
    if "d" in jwk:
        # A public JWK must never carry the private component.
        raise DPoPError("private_jwk", "DPoP header jwk contains a private component 'd'")

    # -- cnf.jkt binding (the tie to the access token) --------------------
    jkt = jwk_thumbprint(jwk)
    if expected_jkt is not None and jkt != expected_jkt:
        raise DPoPError(
            "jkt_mismatch",
            "DPoP proof key thumbprint != access token cnf.jkt (proof not bound to token)",
        )

    # -- signature primitive (DELEGATED; CANNOT-VERIFY asymmetric here) ---
    if header["alg"] != signature_verifier.alg:
        raise DPoPError(
            "alg_mismatch",
            f"proof alg {header['alg']!r} != verifier alg {signature_verifier.alg!r}",
        )
    signing_input = f"{h_seg}.{p_seg}".encode("ascii")
    if not signature_verifier.verify(signing_input, b64u_decode(s_seg)):
        raise DPoPError("bad_signature", "DPoP proof signature does not verify")

    # -- method / URI binding ---------------------------------------------
    p_htm = payload.get("htm")
    if not isinstance(p_htm, str) or p_htm.upper() != htm.upper():
        raise DPoPError("htm_mismatch", f"htm {p_htm!r} != request method {htm!r}")
    p_htu = payload.get("htu")
    if not isinstance(p_htu, str) or _normalize_htu(p_htu) != _normalize_htu(htu):
        raise DPoPError("htu_mismatch", f"htu {p_htu!r} != request URI {htu!r}")

    # -- freshness window --------------------------------------------------
    iat = payload.get("iat")
    if not isinstance(iat, (int, float)):
        raise DPoPError("no_iat", "DPoP proof missing numeric iat")
    iat = int(iat)
    if iat > now + max_iat_skew_s:
        raise DPoPError("future", f"DPoP iat {iat} is in the future (now {now})")
    if iat < now - max_iat_skew_s:
        raise DPoPError("stale", f"DPoP iat {iat} outside freshness window (now {now})")

    # -- jti single-use ----------------------------------------------------
    jti = payload.get("jti")
    if not isinstance(jti, str) or not jti:
        raise DPoPError("no_jti", "DPoP proof missing jti")
    if replay_cache is not None:
        if not replay_cache.check_and_remember(jti, iat + max_iat_skew_s, now):
            raise DPoPError("replay", f"DPoP proof jti {jti!r} already used (replay)")

    # -- optional nonce ----------------------------------------------------
    proof_nonce = payload.get("nonce")
    if required_nonce is not None and proof_nonce != required_nonce:
        raise DPoPError("nonce_mismatch", "DPoP proof nonce != required server nonce")

    # -- optional ath (access-token hash) ----------------------------------
    proof_ath = payload.get("ath")
    if expected_ath is not None and proof_ath != expected_ath:
        raise DPoPError("ath_mismatch", "DPoP proof ath != access-token hash")

    return DPoPClaims(
        jti=jti,
        htm=p_htm,
        htu=p_htu,
        iat=iat,
        jkt=jkt,
        nonce=proof_nonce if isinstance(proof_nonce, str) else None,
        ath=proof_ath if isinstance(proof_ath, str) else None,
    )


def _normalize_htu(htu: str) -> str:
    """RFC 9449 §4.3: compare htu without query/fragment, trailing-slash-tolerant."""
    base = htu.split("#", 1)[0].split("?", 1)[0]
    if len(base) > 1 and base.endswith("/"):
        base = base.rstrip("/")
    return base
