"""auth.tokens.jwks — serve / rotate / RETIRE signing keys (the kill lever).

The KeyRing is auth's published set of signing keys. Each entry pairs a `kid`
with a Verifier (the public-key check seam) and its published public JWK. An RS
resolves a token's `kid` here to get the Verifier for local validation
(auth.tokens.jwt.validate_access_token).

Two properties this module owns:

  * ROTATION with overlapping validity (PLAN §3.6): a new `kid` comes in
    `active`, the previous `active` becomes `rotating` (still honored during the
    overlap window ≥ max token TTL), and is later `retired`.
  * RETIREMENT IS A KILL LEVER (PLAN §4.2 / §7.3, finding 2a): retiring a `kid`
    removes it from the served JWKS AND makes `verifier_for(kid)` return None, so
    EVERY token signed by that kid fails validation immediately — with NO Redis
    involvement. This is the Redis-independent global/mass revocation channel
    (break-glass AS-key rotation nukes all tokens under the old kid).

The access-token signing key and the X-Auth-Identity header key are DISTINCT
keys with separate kids and independent rotation (PLAN §8.7). Nothing here forces
them to share a KeyRing — a deployment holds one KeyRing per key role.

CANNOT-VERIFY-HERE: in production the served public JWKS is fetched by each RS
over HTTP and polled on a ≤30s cadence (+ on any signature failure), so a retired
kid propagates suite-wide within the poll window. That HTTP fetch/poll loop and
its cadence are an integration concern (the proxy/RS side); this module is the
authoritative in-process source of truth those endpoints serialize. Close with
the forward-auth/JWKS-poll integration test on a real deployment (§8/§10 G8/G10).
"""
from __future__ import annotations

import threading
from dataclasses import dataclass
from typing import Dict, List, Optional

from ..core.interfaces import Signer, Verifier


STATUS_ACTIVE = "active"        # current primary signer
STATUS_ROTATING = "rotating"    # superseded but still honored during the overlap
STATUS_RETIRED = "retired"      # KILLED — not served, verifier_for() → None

# A key is "current" (its tokens still validate) iff active or rotating.
_CURRENT_STATUSES = frozenset({STATUS_ACTIVE, STATUS_ROTATING})
_VALID_STATUSES = frozenset({STATUS_ACTIVE, STATUS_ROTATING, STATUS_RETIRED})


@dataclass
class JWKSEntry:
    """One key in the ring: kid + Verifier + published public JWK + status."""
    kid: str
    verifier: Verifier
    public_jwk: Optional[Dict[str, object]]
    alg: str
    status: str = STATUS_ACTIVE

    @property
    def is_current(self) -> bool:
        return self.status in _CURRENT_STATUSES


class KeyRing:
    """Thread-safe registry of signing keys keyed by `kid` (PLAN §4.2, §7.3).

    Accepts either a Signer (auth holds it; we keep only its public verify side +
    kid + alg) or a bare Verifier (an RS holds only this). For the stdlib HMAC
    test-signer the same object is both — which is exactly why HMAC lets us
    exercise all of the validate/rotate/retire LOGIC without asymmetric crypto.
    """

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._entries: Dict[str, JWKSEntry] = {}

    # -- registration ------------------------------------------------------
    def add_key(
        self,
        key: Verifier,
        *,
        public_jwk: Optional[Dict[str, object]] = None,
        status: str = STATUS_ACTIVE,
    ) -> JWKSEntry:
        if status not in _VALID_STATUSES:
            raise ValueError(f"invalid key status {status!r}")
        with self._lock:
            entry = JWKSEntry(
                kid=key.kid,
                verifier=key,
                public_jwk=(dict(public_jwk) if public_jwk is not None else self._maybe_jwk(key)),
                alg=key.alg,
                status=status,
            )
            self._entries[key.kid] = entry
            return entry

    @staticmethod
    def _maybe_jwk(key: object) -> Optional[Dict[str, object]]:
        # Asymmetric signers can publish a public JWK; the HMAC test-signer cannot
        # (a symmetric secret must NEVER be published). Best-effort, never fatal.
        fn = getattr(key, "public_jwk", None)
        if callable(fn):
            try:
                return dict(fn())
            except Exception:
                return None
        return None

    def rotate_in(
        self,
        new_key: Verifier,
        *,
        public_jwk: Optional[Dict[str, object]] = None,
    ) -> JWKSEntry:
        """Bring `new_key` in as active; demote the current active(s) to rotating
        (overlapping validity — old tokens keep validating during the overlap)."""
        with self._lock:
            for e in self._entries.values():
                if e.status == STATUS_ACTIVE:
                    e.status = STATUS_ROTATING
            return self.add_key(new_key, public_jwk=public_jwk, status=STATUS_ACTIVE)

    # -- the kill lever ----------------------------------------------------
    def retire(self, kid: str) -> None:
        """Retire a kid: drop it from the served JWKS and fail all its tokens
        (PLAN §4.2/§7.3). Redis-INDEPENDENT mass/global revocation. Idempotent;
        retiring an unknown kid is a no-op (the effect — 'not current' — already
        holds)."""
        with self._lock:
            e = self._entries.get(kid)
            if e is not None:
                e.status = STATUS_RETIRED

    # -- resolution / serving ---------------------------------------------
    def verifier_for(self, kid: str) -> Optional[Verifier]:
        """The Verifier for `kid`, or None if unknown OR retired. Used by
        auth.tokens.jwt.validate_access_token — a None here → UntrustedKid."""
        with self._lock:
            e = self._entries.get(kid)
            if e is None or not e.is_current:
                return None
            return e.verifier

    def is_current(self, kid: str) -> bool:
        with self._lock:
            e = self._entries.get(kid)
            return e is not None and e.is_current

    def status_of(self, kid: str) -> Optional[str]:
        with self._lock:
            e = self._entries.get(kid)
            return e.status if e is not None else None

    def active_kid(self) -> Optional[str]:
        with self._lock:
            for kid, e in self._entries.items():
                if e.status == STATUS_ACTIVE:
                    return kid
            return None

    def serve(self) -> Dict[str, List[Dict[str, object]]]:
        """The RFC 7517 JWKS document: public JWKs of the CURRENT keys only.

        Retired keys are excluded — that exclusion IS the kill. Entries with no
        publishable JWK (the HMAC test-signer) are omitted; a symmetric secret is
        never published, by design.
        """
        with self._lock:
            keys: List[Dict[str, object]] = []
            for e in self._entries.values():
                if e.is_current and e.public_jwk is not None:
                    jwk = dict(e.public_jwk)
                    jwk.setdefault("kid", e.kid)
                    keys.append(jwk)
            return {"keys": keys}

    def kids(self) -> List[str]:
        with self._lock:
            return list(self._entries.keys())
