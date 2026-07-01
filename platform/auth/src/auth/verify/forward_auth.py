"""auth.verify.forward_auth — the pure /api/verify function (PLAN §8).

verify(request_headers, deps) -> (status, response_headers)

This is the forward-auth FRONT DOOR logic. It is defense-in-depth, NOT the
authorization boundary (§8.1): it answers only "is this principal authenticated,
and may it reach this app-surface at all?" — never "may this agent call this
specific destructive tool?" (that is the RS's Tier-1 + Tier-2 job, §5). It does
NOT enforce budgets (§6) and is side-effect-free / idempotent (§8.3: no session
mutation, no INCR, no revocation write).

────────────────────────────────────────────────────────────────────────────
LATENCY BUDGET (§8.3): the proxy times this subrequest out at <= 250 ms and
fails CLOSED on timeout/5xx. verify() does only in-memory header parsing, the
injected session/bearer checks (a hot in-memory/Redis lookup + one local JWT
validation), a killswitch read, and ONE asymmetric sign of the short-lived
X-Auth-Identity header. There is NO blocking network I/O on this path in this
package; the live-revocation consult that the SoD-critical surfaces need is done
by the injected bearer validator (deps.bearer_validate), which integration wires
to the authoritative-read introspection path. Keep the total under 250 ms.
────────────────────────────────────────────────────────────────────────────

DEPENDENCY INJECTION (strict ownership): this package imports ONLY auth.core /
auth.crypto and the stdlib. The two identity seams — "is this cookie a live
human session?" and "is this Bearer a valid, non-revoked agent token for this
aud?" — are injected as callables on VerifyDeps. Integration wires them to the
session store and auth.tokens; the unit tests wire real fakes over the real
HMAC signer + MemoryHotStore. This keeps the security-critical decision LOGIC
pure and fully runnable here.
"""
from __future__ import annotations

import base64
import json
import secrets
from dataclasses import dataclass, field
from typing import Callable, Dict, FrozenSet, Mapping, Optional, Tuple
from urllib.parse import quote

from auth.core.interfaces import Signer
from auth.core.tokens_model import (
    PRINCIPAL_TYPE_AGENT,
    PRINCIPAL_TYPE_HUMAN,
    TYP_IDENTITY_HEADER,
    IdentityHeaderClaims,
)

# ── kill-switch levels (mirror auth.store.memory_hot / PLAN §7.2) ────────────
KILL_G0 = "G0"   # normal
KILL_G1 = "G1"   # freeze-destructive (bites at the Gateway / live-check, §8.8)
KILL_G2 = "G2"   # global stop / quiesce — agents get a 403 posture at the door

# ── the ONLY success status. §8.5: exactly 200 == allow; a 204/206 is NOT. ──
STATUS_ALLOW = 200

# ── credential-check outcomes returned by the injected session/bearer seams ─
DECISION_ALLOW = "allow"       # authenticated + permitted to reach this surface
DECISION_REFUSE = "refuse"     # authenticated but refused-at-the-door -> 403
DECISION_INVALID = "invalid"   # no/invalid credential -> 401 (agent) / 302 (browser)


@dataclass(frozen=True)
class Identity:
    """The verified principal a session/bearer check resolves to (on ALLOW)."""
    sub: str
    principal_type: str                        # human | agent
    roles: FrozenSet[str] = field(default_factory=frozenset)
    client_id: Optional[str] = None


@dataclass(frozen=True)
class CredResult:
    """Outcome of an injected credential check.

    decision is one of DECISION_ALLOW / DECISION_REFUSE / DECISION_INVALID.
    identity is present iff decision == DECISION_ALLOW.
    """
    decision: str
    identity: Optional[Identity] = None

    @classmethod
    def allow(cls, identity: Identity) -> "CredResult":
        return cls(DECISION_ALLOW, identity)

    @classmethod
    def refuse(cls) -> "CredResult":
        return cls(DECISION_REFUSE, None)

    @classmethod
    def invalid(cls) -> "CredResult":
        return cls(DECISION_INVALID, None)


@dataclass(frozen=True)
class VerifyDeps:
    """Everything verify() needs, injected so the LOGIC stays pure + testable.

    signer          — the X-Auth-Identity signing key. §8.7 REQUIRES this be a
                      DISTINCT key from auth's access-token AS key (separate
                      rotation/kid). In prod this is an EdDSA/ES256 signer over a
                      key that never validates access tokens; here the tests use
                      an HMAC test-signer to exercise the mint LOGIC.
    issuer          — the single auth issuer written as `iss` (RFC 9207).
    identity_ttl_s  — X-Auth-Identity lifetime (§8.7: short ≈ subrequest lifetime).
    session_lookup  — (cookie_header, aud) -> CredResult   [1st, §8.4]
    bearer_validate — (bearer_token, aud) -> CredResult    [2nd, §8.4]
    killswitch      — () -> (level, epoch)  (HotStore.killswitch)
    now             — () -> unix seconds
    new_jti         — () -> a fresh jti for the identity header
    new_traceparent — () -> the AUTHORITATIVE, server-minted W3C traceparent
                      (bound to sub by being co-signed into X-Auth-Identity, §8.7)
    """
    signer: Signer
    issuer: str
    session_lookup: Callable[[str, str], CredResult]
    bearer_validate: Callable[[str, str], CredResult]
    killswitch: Callable[[], Tuple[str, int]]
    identity_ttl_s: int = 30
    now: Callable[[], int] = None  # type: ignore[assignment]
    new_jti: Callable[[], str] = None  # type: ignore[assignment]
    new_traceparent: Callable[[], str] = None  # type: ignore[assignment]

    def __post_init__(self) -> None:
        if self.now is None:
            import time as _t
            object.__setattr__(self, "now", lambda: int(_t.time()))
        if self.new_jti is None:
            object.__setattr__(self, "new_jti", lambda: "idh_" + secrets.token_hex(8))
        if self.new_traceparent is None:
            object.__setattr__(self, "new_traceparent", _mint_traceparent)


# ── W3C traceparent minting (server-authoritative, §8.7 finding 5f) ──────────

def _mint_traceparent() -> str:
    """A fresh W3C traceparent: 00-<32hex trace-id>-<16hex span-id>-01.

    SERVER-generated — NEVER derived from a client-supplied traceparent. It is
    bound to the validated sub by being co-signed into the X-Auth-Identity JWT
    alongside sub (finding 5f): a client cannot craft it to misattribute a
    destructive-chain action under another principal's trace id.
    """
    return f"00-{secrets.token_hex(16)}-{secrets.token_hex(8)}-01"


# ── JOSE / JWT compact helpers (stdlib only) ─────────────────────────────────

def _b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64url_decode(seg: str) -> bytes:
    pad = "=" * (-len(seg) % 4)
    return base64.urlsafe_b64decode(seg + pad)


def _jwt_compact(payload: Dict[str, object], signer: Signer, typ: str) -> str:
    """Assemble a signed compact JWS. Signs via the injected Signer (never fakes).

    header {alg, kid, typ}. The Signer raises loudly if its primitive is
    unavailable — this never emits an unsigned/fake token.
    """
    header = {"alg": signer.alg, "kid": signer.kid, "typ": typ}
    h = _b64url(json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    p = _b64url(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8"))
    signing_input = f"{h}.{p}".encode("ascii")
    sig = signer.sign(signing_input)
    return f"{h}.{p}.{_b64url(sig)}"


def decode_identity_header(token: str, signer: Signer) -> Dict[str, object]:
    """Verify the X-Auth-Identity signature and return its claims (RS-side helper).

    Backends MUST cryptographically verify signature + aud before trusting any
    claim (§8.7). Raises ValueError on a malformed token or a bad signature.
    """
    try:
        h_seg, p_seg, s_seg = token.split(".")
    except ValueError:
        raise ValueError("malformed X-Auth-Identity: expected three dot-separated segments")
    signing_input = f"{h_seg}.{p_seg}".encode("ascii")
    if not signer.verify(signing_input, _b64url_decode(s_seg)):
        raise ValueError("X-Auth-Identity signature verification FAILED")
    return json.loads(_b64url_decode(p_seg))


# ── header access (case-insensitive; underscore variants are NOT identity) ───

def _lower_headers(request_headers: Mapping[str, str]) -> Dict[str, str]:
    """Normalize header names to lowercase for case-insensitive lookup.

    NOTE: we deliberately DO NOT read any identity/trust header (X-Auth-Identity,
    Remote-User, X-Forwarded-User/Groups/Prefix, inbound traceparent as
    attribution) for the authz decision. The proxy scrubs them (§8.6 R1); auth
    independently does not trust them. The only client-supplied headers read for
    IDENTITY are Authorization + Cookie (§8.3).
    """
    return {str(k).lower(): v for k, v in request_headers.items()}


def _aud_from_host(host: str) -> str:
    """X-Forwarded-Host -> the app-surface / audience (§8.3).

    The `app` segment IS the RFC 8707 audience discriminator (auth.core.scopes):
    board.<suite> -> "board", auth.<suite> -> "auth". Strips any :port.
    """
    if not host:
        return ""
    return host.split(":", 1)[0].split(".", 1)[0].strip().lower()


def _mint_identity_header(identity: Identity, aud: str, deps: VerifyDeps,
                          claimed_parent: Optional[str]) -> str:
    """Build + sign the X-Auth-Identity JWT set on 200 (§8.7)."""
    iat = int(deps.now())
    claims = IdentityHeaderClaims(
        iss=deps.issuer,
        sub=identity.sub,
        principal_type=identity.principal_type,
        aud=aud,
        roles=identity.roles,
        iat=iat,
        exp=iat + int(deps.identity_ttl_s),
        jti=deps.new_jti(),
        kill_epoch=deps.killswitch()[1],
        kill_level=deps.killswitch()[0],
        traceparent=deps.new_traceparent(),   # AUTHORITATIVE, server-minted
        client_id=identity.client_id,
        claimed_parent=claimed_parent,         # untrusted client value, audit-only
    )
    return _jwt_compact(claims.to_payload(), deps.signer, TYP_IDENTITY_HEADER)


def _allow(identity: Identity, aud: str, deps: VerifyDeps,
           claimed_parent: Optional[str]) -> Tuple[int, Dict[str, str]]:
    """Return the ONLY allow response: EXACTLY 200 + a fresh signed X-Auth-Identity.

    §8.7 default: emit ONLY the signature-verified X-Auth-Identity — NOT the
    Remote-User/Remote-Groups convenience headers (advisory headers re-create the
    CVE-2026-30851 header-authz collapse behind the door, finding 5e). The
    response-header dict is freshly built here, so any inbound identity header is
    structurally absent from what the proxy copies upstream.
    """
    hdr = _mint_identity_header(identity, aud, deps, claimed_parent)
    return STATUS_ALLOW, {"X-Auth-Identity": hdr, "Cache-Control": "no-store"}


def verify(request_headers: Mapping[str, str],
           deps: VerifyDeps) -> Tuple[int, Dict[str, str]]:
    """The forward-auth decision (PLAN §8.5). Status code IS the contract.

    Returns (status, response_headers). The proxy branches on status:
      200 -> copy response headers upstream + forward ;  302 -> redirect browser ;
      401 -> return to agent ;  403 -> return (posture deny).
    """
    h = _lower_headers(request_headers)
    authz = (h.get("authorization") or "").strip()
    cookie = h.get("cookie") or ""
    accept = h.get("accept") or ""
    aud = _aud_from_host(h.get("x-forwarded-host") or "")
    uri = h.get("x-forwarded-uri") or "/"
    # Inbound traceparent is UNTRUSTED — captured only as claimed_parent for audit,
    # NEVER used as the attribution key (§8.7 finding 5f).
    claimed_parent = h.get("traceparent") or None

    # Mirror Authelia ordering (§8.4): a browser has Accept: text/html AND no
    # Authorization. (Matches proxy's auth_verify_stub is_browser exactly.)
    is_browser = ("text/html" in accept) and not authz

    # Global quiesce posture (§8.8): at G2 (global stop) an AGENT is refused at the
    # door with a 403 posture; the operator (human) still authenticates so they can
    # regain control (break-glass never blanket-allows). The physical bite stays at
    # the Gateway (§7.1) — this is the door reflection of it.
    kill_level, _kill_epoch = deps.killswitch()

    # The G2 quiesce posture is applied to the RESOLVED identity regardless of
    # which credential proved it (Cookie or Bearer), so "agents are refused at the
    # door under G2" holds symmetrically — it does not silently fail open if any
    # future path ever mints an agent session cookie (review finding, forward_auth).
    def _gated_allow(identity: Identity) -> Tuple[int, Dict[str, str]]:
        if kill_level == KILL_G2 and identity.principal_type == PRINCIPAL_TYPE_AGENT:
            return 403, {}   # quiesce posture (§8.8) — uniform across credential types
        return _allow(identity, aud, deps, claimed_parent)

    # ── 1. Cookie session first (§8.4: valid cookie -> use it) ───────────────
    if cookie:
        sres = deps.session_lookup(cookie, aud)
        if sres.decision == DECISION_ALLOW and sres.identity is not None:
            return _gated_allow(sres.identity)
        if sres.decision == DECISION_REFUSE:
            return 403, {}
        # DECISION_INVALID (expired/bogus cookie): fall through to Bearer / no-cred.

    # ── 2. Authorization: Bearer (§8.4: stateless hot path + live check) ─────
    if authz.startswith("Bearer "):
        token = authz[len("Bearer "):].strip()
        bres = deps.bearer_validate(token, aud)
        if bres.decision == DECISION_ALLOW and bres.identity is not None:
            return _gated_allow(bres.identity)
        if bres.decision == DECISION_REFUSE:
            return 403, {}       # authenticated-but-refused-at-the-door
        # DECISION_INVALID: no/invalid credential -> fall through.

    # ── 3. No / invalid credential (§8.5) ────────────────────────────────────
    if is_browser:
        # rd is URL-encoded to neutralize CRLF/response-splitting via a hostile
        # X-Forwarded-Uri (critical-infra: never reflect a raw client value into a
        # response header). Location -> login with return-to.
        return 302, {"Location": "/login?rd=" + quote(uri, safe="/?=&:@-._~")}
    # Non-browser (agent) client -> 401 challenge.
    return 401, {"WWW-Authenticate": "Bearer"}
