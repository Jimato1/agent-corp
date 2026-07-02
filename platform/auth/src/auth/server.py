"""auth.server — the integration Core API that MOUNTS every surface over ONE state.

PLAN §11 (API-first): this is the SOLE-WRITER Core API. It constructs exactly one
durable Store (SQLiteStore) and one HotStore (MemoryHotStore) and threads them
through every surface so all of them read/write the SAME state:

  * GET  /api/verify                      — the forward-auth §8 decision table
                                            (auth.verify.forward_auth.verify).
  * POST /pdp/decision                    — the central PDP (auth.authz.pdp.PDP).
  * GET  /jwks  /.well-known/*            — the AS metadata + JWKS auth OWNS.
  * POST /introspect  /revoke            — RFC 7662 / RFC 7009 (auth OWNS).
  * GET|POST /authorize /token           — Keycloak-adopted (CANNOT-VERIFY-HERE).
  * /admin/*                              — identity / roles / budgets / killswitch /
                                            revocation / break-glass operator surface.
  * /mcp/<tool>                           — the thin read/self-only agent MCP surface
                                            (auth.mcp.surface.AuthMCPSurface).
  * /ui/*                                 — the static operator console (ui/build).

Design for testability: all routing is a PURE function `AuthApp.dispatch(method,
path, headers, body) -> (status, headers, body_bytes)`. The stdlib
`ThreadingHTTPServer` handler is a thin shim over it, so the whole router is unit-
tested in-process (auth.tests.test_server) AND boots for real via
`python -m auth.server`.

────────────────────────────────────────────────────────────────────────────────
SQLite-NOW vs Postgres-LATER (settled decision #8): the durable Store here is
SQLiteStore behind the auth.core.interfaces.Store Protocol; the HotStore is the
in-process MemoryHotStore behind the HotStore Protocol. Swapping to Postgres +
active-active and replicated Redis is a CONSTRUCTOR swap in `AuthApp.__init__`
(pick PostgresStore / RedisHotStore), NOT a rewrite — every surface already speaks
only the Protocol. See CANNOT-VERIFY-HERE items at the bottom of this module.
────────────────────────────────────────────────────────────────────────────────

SIGNERS: in the sandbox we default to the stdlib HMAC test-signer so the full
token/verify LOGIC runs GREEN with no external crypto. Two DISTINCT keys are used
(§8.7): one for access tokens, a separate one for the X-Auth-Identity header. In
production set AUTH_SIGNER_ALG=EdDSA to select auth.crypto.signer_eddsa (requires
the 'cryptography' package; it raises LOUDLY if absent — never a fake signature).
"""
from __future__ import annotations

import json
import os
import secrets
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable, Dict, List, Optional, Tuple
from urllib.parse import urlparse

from .authz import scope_tool_map as STM
from .authz.pdp import PDP, LocalPIP, Obligation, PDPRequest, principal_ctx_from_store
from .budgets.middleware import BudgetMiddleware
from .core import scopes as S
from .core.errors import (
    AttestationRequired,
    AuthError,
    KindGateViolation,
    RoleHierarchyError,
    SoDViolation,
    UnknownPrincipal,
    UnknownRole,
    UnknownScope,
)
from .core.principals import (
    KIND_AGENT,
    KIND_HUMAN,
    KIND_SERVICE,
    AgentKey,
    BudgetPolicy,
    ConcurrencyLimit,
    LifetimeLimit,
    Principal,
    RateLimit,
    Role,
)
from .core.tokens_model import (
    PRINCIPAL_TYPE_AGENT,
    PRINCIPAL_TYPE_HUMAN,
    AccessTokenClaims,
)
from .crypto.signer_hmac import HMACSigner
from .killswitch.breakglass import BreakGlassController
from .killswitch.killswitch import KILL_G0, KILL_G1, KILL_G2, KillSwitchController
from .mcp.surface import AuthMCPSurface, CallerIdentity
from .store.factory import make_hotstore, make_store
from .store.memory_hot import MemoryHotStore
from .store.sqlite_store import SQLiteStore
from .tokens import revocation as REV
from .tokens.jwks import KeyRing
from .tokens.jwt import (
    TokenError,
    b64u_decode,
    mint_access_token,
    validate_access_token,
)
from .verify.forward_auth import CredResult, Identity, VerifyDeps, verify


# ---------------------------------------------------------------------------
# Small helpers.
# ---------------------------------------------------------------------------

def _json_bytes(obj: object) -> bytes:
    return json.dumps(obj, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _kid_of(token: str) -> Optional[str]:
    """Decode a JWS JOSE header and return its `kid` (best-effort, never raises)."""
    try:
        header = json.loads(b64u_decode(token.split(".")[0]))
        kid = header.get("kid")
        return kid if isinstance(kid, str) else None
    except Exception:
        return None


def _parse_cookie(cookie_header: str) -> Dict[str, str]:
    out: Dict[str, str] = {}
    for part in (cookie_header or "").split(";"):
        if "=" in part:
            k, v = part.split("=", 1)
            out[k.strip()] = v.strip()
    return out


# ---------------------------------------------------------------------------
# SessionStore — the human browser session seam (§8.4 first credential).
#
# Integration-owned (not a frozen subsystem): a minimal server-side session
# registry. It is deliberately NOT the token plane — a human cookie session
# resolves to a Principal in the SAME durable Store, so "who is this cookie?" and
# "is that principal still active?" both resolve against one shared state.
# In production this is the Keycloak-backed OIDC browser session; here it is an
# in-process registry so the forward-auth cookie path runs live.
# ---------------------------------------------------------------------------

class SessionStore:
    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._sessions: Dict[str, str] = {}   # sid -> sub

    def create(self, sub: str, *, sid: Optional[str] = None) -> str:
        sid = sid or "sess_" + secrets.token_hex(16)
        with self._lock:
            self._sessions[sid] = sub
        return sid

    def sub_for(self, sid: str) -> Optional[str]:
        with self._lock:
            return self._sessions.get(sid)

    def destroy(self, sid: str) -> None:
        with self._lock:
            self._sessions.pop(sid, None)


# ---------------------------------------------------------------------------
# The Core API application object (pure routing, one shared state).
# ---------------------------------------------------------------------------

class AuthApp:
    """Mounts every auth surface over ONE Store + ONE HotStore (the SOLE WRITER)."""

    def __init__(
        self,
        *,
        store: Optional[SQLiteStore] = None,
        hot: Optional[MemoryHotStore] = None,
        issuer: Optional[str] = None,
        ui_dir: Optional[str] = None,
        signer_alg: Optional[str] = None,
        seed_demo: bool = True,
    ) -> None:
        self.issuer = issuer or os.environ.get(
            "AUTH_ISSUER", "https://auth.suite.local"
        )
        # -- ONE shared state ------------------------------------------------
        # SQLite-NOW behind the Store Protocol (decision #8). Postgres + active-
        # active is a CONSTRUCTOR swap here (PostgresStore, same Protocol) — NOT a
        # rewrite; DATABASE_URL is the documented swap trigger (CANNOT-VERIFY-HERE).
        # The HotStore is the in-process MemoryHotStore now; RedisHotStore later.
        # Backend is a CONFIG choice behind the Protocol seam (decision #8): the
        # factory returns SQLite/Memory by default (unchanged for the 247-test suite)
        # and PostgresStore/RedisHotStore when AUTH_STORE=postgres / AUTH_HOTSTORE=redis
        # (the migrated substrate the container runs). An explicit store/hot (tests)
        # always wins.
        self.store = store if store is not None else make_store()
        self.hot = hot if hot is not None else make_hotstore()
        self.sessions = SessionStore()

        # -- signers: two DISTINCT keys (§8.7) -------------------------------
        self.signer_alg = (signer_alg or os.environ.get("AUTH_SIGNER_ALG", "HS256")).strip()
        self.access_signer, self.identity_signer = self._build_signers(self.signer_alg)

        # Access-token JWKS keyring (RS resolves a token's kid here).
        self.keyring = KeyRing()
        self.keyring.add_key(self.access_signer)

        # -- token TTLs ------------------------------------------------------
        self.access_ttl_s = int(os.environ.get("AUTH_ACCESS_TTL_S", "300"))
        self.identity_ttl_s = int(os.environ.get("AUTH_IDENTITY_TTL_S", "30"))

        # -- mounted surfaces (all over the ONE state) -----------------------
        self.killswitch = KillSwitchController(self.store, self.hot)
        self.breakglass = BreakGlassController(self.store, self.hot, self.killswitch)
        self.budgets = BudgetMiddleware(self.hot)
        self.mcp = AuthMCPSurface(self.store, self.hot)

        # -- verify() dependency bundle (§8) ---------------------------------
        self.verify_deps = VerifyDeps(
            signer=self.identity_signer,
            issuer=self.issuer,
            session_lookup=self._session_lookup,
            bearer_validate=self._bearer_validate,
            killswitch=self.hot.killswitch,
            identity_ttl_s=self.identity_ttl_s,
        )

        # -- static UI -------------------------------------------------------
        self.ui_dir = ui_dir or os.environ.get(
            "AUTH_UI_DIR",
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "ui", "build"),
        )

        # Admin bearer (operator break-glass into the admin surface for THIS build;
        # in prod the admin surface is gated by a verify'd session + auth:manage-identity).
        self.admin_token = os.environ.get("AUTH_ADMIN_TOKEN", "operator-demo-admin")

        if seed_demo:
            self._seed_demo()

    # ------------------------------------------------------------------ #
    # Signer construction (§8.7 — two DISTINCT keys, separate kids).
    # ------------------------------------------------------------------ #
    def _build_signers(self, alg: str):
        if alg.upper() == "EDDSA":
            # PRODUCTION path — CANNOT-VERIFY-HERE without 'cryptography'. Raises
            # LOUDLY if the primitive is absent (never a silent/fake signature).
            from .crypto.signer_eddsa import EdDSASigner
            return (
                EdDSASigner.generate(kid="at-eddsa-1"),
                EdDSASigner.generate(kid="identity-eddsa-1"),
            )
        # Sandbox default: stdlib HMAC test-signer, TWO distinct secrets/kids so the
        # X-Auth-Identity key is genuinely separate from the access-token key (§8.7).
        at_secret = os.environ.get("AUTH_AT_SECRET", "").encode() or secrets.token_bytes(32)
        id_secret = os.environ.get("AUTH_ID_SECRET", "").encode() or secrets.token_bytes(32)
        if len(at_secret) < 32:
            at_secret = at_secret.ljust(32, b"0")
        if len(id_secret) < 32:
            id_secret = id_secret.ljust(32, b"1")
        return (
            HMACSigner(at_secret, kid="at-hmac-1"),
            HMACSigner(id_secret, kid="identity-hmac-1"),
        )

    # ------------------------------------------------------------------ #
    # Token minting (auth is the SOLE minter).
    # ------------------------------------------------------------------ #
    def mint_token(
        self,
        sub: str,
        aud: str,
        scopes,
        *,
        client_id: Optional[str] = None,
        ttl_s: Optional[int] = None,
        now: Optional[int] = None,
    ) -> str:
        iat = int(time.time()) if now is None else int(now)
        level, epoch = self.hot.killswitch()
        claims = AccessTokenClaims(
            iss=self.issuer,
            sub=sub,
            aud=aud,
            scope=frozenset(scopes),
            iat=iat,
            exp=iat + (self.access_ttl_s if ttl_s is None else ttl_s),
            jti="at_" + secrets.token_hex(8),
            client_id=client_id,
            kill_epoch=epoch,
            kill_level=level,
        )
        return mint_access_token(claims, self.access_signer)

    # ------------------------------------------------------------------ #
    # verify() credential seams — wired to the ONE shared state (§8.4).
    # ------------------------------------------------------------------ #
    def _session_lookup(self, cookie_header: str, aud: str) -> CredResult:
        """1st credential (§8.4): a live human browser session -> a Principal.

        Resolves the cookie's session id to a sub in the SAME durable Store; a
        disabled/suspended principal is refused-at-the-door (403), an unknown
        cookie is invalid (fall through). Side-effect-free (§8.3)."""
        sid = _parse_cookie(cookie_header).get("session")
        if not sid:
            return CredResult.invalid()
        sub = self.sessions.sub_for(sid)
        if sub is None:
            return CredResult.invalid()
        principal = self.store.get_principal(sub)
        if principal is None:
            return CredResult.invalid()
        if principal.status != "active":
            return CredResult.refuse()
        ptype = PRINCIPAL_TYPE_HUMAN if principal.kind == KIND_HUMAN else PRINCIPAL_TYPE_AGENT
        return CredResult.allow(
            Identity(sub=sub, principal_type=ptype,
                     roles=self.store.roles_of(sub), client_id=principal.client_id)
        )

    def _bearer_validate(self, token: str, aud: str) -> CredResult:
        """2nd credential (§8.4): stateless local JWT validation + LIVE revocation.

        (1) local validate (signature/kid/iss/aud/exp) -> invalid on any failure;
        (2) resolve the principal in the durable Store -> refuse if it is
            gone/disabled; (3) LIVE revocation consult (fail-closed) -> refuse if
            revoked. Only then ALLOW. Never trusts anything but the token."""
        try:
            claims = validate_access_token(
                token, self.keyring,
                expected_iss=self.issuer, expected_aud=aud,
                now=int(time.time()), leeway_s=60,
            )
        except TokenError:
            return CredResult.invalid()
        except Exception:
            return CredResult.invalid()

        principal = self.store.get_principal(claims.sub)
        if principal is None or principal.status != "active":
            return CredResult.refuse()

        # LIVE revocation across jti/sub/kid/client (fail-closed on read failure).
        rd = REV.consult_denylist(
            self.hot,
            jti=claims.jti, sub=claims.sub, iat=claims.iat,
            client_id=claims.client_id, kid=_kid_of(token),
            enforcement=REV.Enforcement.LIVE_CHECK,
        )
        if not rd.allowed:
            return CredResult.refuse()

        ptype = PRINCIPAL_TYPE_HUMAN if principal.kind == KIND_HUMAN else PRINCIPAL_TYPE_AGENT
        return CredResult.allow(
            Identity(sub=claims.sub, principal_type=ptype,
                     roles=self.store.roles_of(claims.sub),
                     client_id=claims.client_id or principal.client_id)
        )

    # ------------------------------------------------------------------ #
    # Demo seed (so the live boot + curl proof exercises real state).
    # ------------------------------------------------------------------ #
    def _seed_demo(self) -> None:
        st = self.store
        # Operator (human) + a browser session with a KNOWN id for the curl proof.
        st.put_principal(Principal(sub="op:eide", kind=KIND_HUMAN, display_name="Operator"))
        st.put_role(Role(role_id="role:operator", direct_scopes=frozenset({
            S.AUTH_MANAGE_IDENTITY, S.AUTH_READ_IDENTITY, S.MC_KILL_SWITCH,
        }), kind_gate=frozenset({KIND_HUMAN})))
        st.assign_role("op:eide", "role:operator")
        self.sessions.create("op:eide", sid="valid")   # Cookie: session=valid -> 200

        # An executor agent (attested hardware key so it MAY hold an action-side role).
        st.put_principal(Principal(sub="agent:patcher-07", kind=KIND_AGENT,
                                   agent_class="executor", client_id="agent:patcher-07"))
        st.register_agent_key(AgentKey(
            sub="agent:patcher-07", kid="agentkey-1", public_jwk={"kty": "OKP", "crv": "Ed25519", "x": "demo"},
            storage_tier="tpm", non_exportable=True,
        ))
        # NB: `auth:self` is the MCP-surface session marker carried on the TOKEN's
        # scope claim (auth.mcp.surface) — deliberately NOT a grantable RBAC scope,
        # so a role never contains it. The role holds only canonical taxonomy scopes.
        st.put_role(Role(role_id="role:agent-self", direct_scopes=frozenset({
            S.AUTH_AUTHENTICATE, S.AUTH_READ_IDENTITY,
        }), kind_gate=frozenset({KIND_AGENT})))
        st.assign_role("agent:patcher-07", "role:agent-self")

        # A disabled agent, to demonstrate the 403 "refused-at-the-door" path live.
        st.put_principal(Principal(sub="agent:disabled-09", kind=KIND_AGENT,
                                   agent_class="executor", client_id="agent:disabled-09"))
        st.set_principal_status("agent:disabled-09", "disabled")

    def demo_tokens(self) -> Dict[str, str]:
        """Real minted tokens for the live curl proof (aud=board)."""
        return {
            "valid_agent": self.mint_token(
                "agent:patcher-07", "board", {S.BOARD_READ}, client_id="agent:patcher-07"),
            "refused_agent": self.mint_token(
                "agent:disabled-09", "board", {S.BOARD_READ}, client_id="agent:disabled-09"),
            "self_agent": self.mint_token(
                "agent:patcher-07", "auth", {"auth:self", S.AUTH_READ_IDENTITY},
                client_id="agent:patcher-07"),
        }

    # ================================================================== #
    # The pure router.
    # ================================================================== #
    def dispatch(
        self, method: str, path: str, headers: Dict[str, str], body: bytes
    ) -> Tuple[int, Dict[str, str], bytes]:
        parsed = urlparse(path)
        route = parsed.path
        try:
            # -- forward-auth (the headline §8 contract) ------------------
            if route == "/api/verify" and method == "GET":
                return self._route_verify(headers)

            # -- health ----------------------------------------------------
            if route in ("/healthz", "/livez") and method == "GET":
                return self._json(200, {"status": "ok", "issuer": self.issuer})

            # -- debug: real minted demo tokens (env-gated, boot-proof ONLY) --
            # Never enabled in prod; lets the live curl proof exercise the bearer
            # paths over a real socket with genuinely signed tokens.
            if route == "/debug/demo-tokens" and method == "GET" and \
                    os.environ.get("AUTH_DEMO") == "1":
                return self._json(200, self.demo_tokens())

            # -- AS metadata + JWKS (auth OWNS jwks; metadata points to Keycloak) --
            if route == "/.well-known/oauth-authorization-server" and method == "GET":
                return self._json(200, self._as_metadata())
            if route == "/.well-known/openid-configuration" and method == "GET":
                return self._json(200, self._as_metadata())
            if route in ("/jwks", "/jwks.json", "/.well-known/jwks.json") and method == "GET":
                return self._json(200, self.keyring.serve())

            # -- Keycloak-adopted endpoints (CANNOT-VERIFY-HERE) ----------
            if route in ("/authorize", "/token") :
                return self._json(501, {
                    "error": "adopted_by_keycloak",
                    "detail": (
                        f"{route} is served by the adopted Authorization Server (Keycloak), "
                        "not by auth-core. CANNOT-VERIFY-HERE in this sandbox. Operator closes "
                        "it by running the real Keycloak realm (docker compose) and the OIDC "
                        "code-flow integration test."),
                    "operator_command": "docker compose up -d keycloak && ./test/oidc_flow.sh",
                })

            # -- RFC 7662 introspection / RFC 7009 revocation (auth OWNS) -
            if route == "/introspect" and method == "POST":
                return self._route_introspect(body)
            if route == "/revoke" and method == "POST":
                return self._route_revoke(headers, body)

            # -- central PDP decision (auth.authz.pdp) --------------------
            if route == "/pdp/decision" and method == "POST":
                return self._route_pdp(body)

            # -- thin agent MCP surface (read/self-only) ------------------
            if route.startswith("/mcp/") and method == "POST":
                return self._route_mcp(route[len("/mcp/"):], headers, body)
            if route == "/mcp/tools" and method == "GET":
                return self._json(200, {"tools": list(self.mcp._tools.keys())})

            # -- operator admin surface -----------------------------------
            if route.startswith("/admin/"):
                return self._route_admin(method, route, headers, body)

            # -- static operator UI ---------------------------------------
            if route == "/" and method == "GET":
                return (302, {"Location": "/ui/overview.html"}, b"")
            if route.startswith("/ui/") and method == "GET":
                return self._route_static(route[len("/ui/"):])

            return self._json(404, {"error": "not_found", "path": route})
        except AuthError as e:
            return self._json(400, {"error": type(e).__name__, "detail": str(e)})
        except Exception:  # noqa: BLE001
            # Do NOT leak internal exception text to the client — on the migrated
            # substrate a psycopg/redis error would disclose DSN host/port/user, DB
            # and table names, or driver internals. Log server-side, return generic.
            import sys
            import traceback
            traceback.print_exc(file=sys.stderr)
            return self._json(500, {"error": "internal"})

    # ------------------------------------------------------------------ #
    # Route impls.
    # ------------------------------------------------------------------ #
    def _route_verify(self, headers: Dict[str, str]) -> Tuple[int, Dict[str, str], bytes]:
        status, resp_headers = verify(headers, self.verify_deps)
        # verify() returns only the headers the proxy copies upstream; add none else.
        return status, dict(resp_headers), b""

    def _as_metadata(self) -> Dict[str, object]:
        base = self.issuer.rstrip("/")
        return {
            "issuer": self.issuer,
            # authorize/token are the adopted Keycloak AS (CANNOT-VERIFY-HERE).
            "authorization_endpoint": f"{base}/authorize",
            "token_endpoint": f"{base}/token",
            # jwks/introspect/revocation are auth-OWNED and live here.
            "jwks_uri": f"{base}/jwks",
            "introspection_endpoint": f"{base}/introspect",
            "revocation_endpoint": f"{base}/revoke",
            "token_endpoint_auth_methods_supported": ["private_key_jwt", "tls_client_auth"],
            "dpop_signing_alg_values_supported": ["EdDSA", "ES256"],
            "resource_indicators_supported": True,   # RFC 8707 (decision #4)
            "grant_types_supported": ["client_credentials", "authorization_code"],
            "authorization_response_iss_parameter_supported": True,  # RFC 9207
            "scopes_supported": sorted(S.ALL_SCOPES),
            "id_token_signing_alg_values_supported": ["EdDSA", "ES256"],
            "_note": ("authorize/token are served by the adopted Keycloak realm "
                      "(CANNOT-VERIFY-HERE); jwks/introspect/revoke are auth-owned."),
        }

    def _route_introspect(self, body: bytes) -> Tuple[int, Dict[str, str], bytes]:
        """RFC 7662 — active/inactive + claims, with a LIVE revocation consult."""
        data = _parse_form_or_json(body)
        token = data.get("token")
        aud = data.get("aud") or data.get("resource")
        if not token:
            return self._json(400, {"error": "invalid_request", "detail": "token required"})
        # Introspection is authoritative: validate locally, then live-revoke.
        result: Dict[str, object] = {"active": False}
        try:
            claims = validate_access_token(
                token, self.keyring, expected_iss=self.issuer,
                expected_aud=aud or _kid_free_aud(token), now=int(time.time()), leeway_s=60,
            ) if aud else None
        except Exception:
            claims = None
        if aud and claims is not None:
            rd = REV.consult_denylist(
                self.hot, jti=claims.jti, sub=claims.sub, iat=claims.iat,
                client_id=claims.client_id, kid=_kid_of(token),
                enforcement=REV.Enforcement.LIVE_CHECK,
            )
            if rd.allowed:
                result = {
                    "active": True, "sub": claims.sub, "aud": claims.aud,
                    "scope": claims.scope_str(), "iss": claims.iss,
                    "exp": claims.exp, "iat": claims.iat, "jti": claims.jti,
                    "client_id": claims.client_id, "kill_level": claims.kill_level,
                    "kill_epoch": claims.kill_epoch,
                }
            else:
                result = {"active": False, "revocation_reason": rd.reason}
        elif not aud:
            result = {"active": False,
                      "error": "aud_required",
                      "detail": "introspection requires the resource/aud to check aud-binding"}
        return self._json(200, result)

    def _route_revoke(self, headers: Dict[str, str], body: bytes) -> Tuple[int, Dict[str, str], bytes]:
        """RFC 7009 shape — surgical single-token revoke (jti) via the HotStore."""
        if not self._is_admin(headers):
            return self._json(401, {"error": "unauthorized"})
        data = _parse_form_or_json(body)
        token = data.get("token")
        if not token:
            return self._json(400, {"error": "invalid_request"})
        # Decode the jti WITHOUT trusting the token beyond identifying it; revoke by jti.
        try:
            payload = json.loads(b64u_decode(token.split(".")[1]))
            jti = payload.get("jti")
            exp = int(payload.get("exp", int(time.time()) + self.access_ttl_s))
        except Exception:
            return self._json(400, {"error": "invalid_request"})
        if not jti:
            return self._json(400, {"error": "invalid_request", "detail": "no jti"})
        epoch = self.hot.deny_jti(jti, exp)
        self.store.append_audit({"event": "revoke_token", "jti": jti, "epoch": epoch})
        return self._json(200, {"revoked": True, "jti": jti, "epoch": epoch})

    def _route_pdp(self, body: bytes) -> Tuple[int, Dict[str, str], bytes]:
        """Central PDP decision (auth.authz.pdp). Live facts come from the SAME hot
        state; optional cross-app SoD facts (proposer/ticket/window/budget) are
        passed in the request context for THIS build (Board/CMDB PIP fan-out is a
        Stage-7 joint item)."""
        data = _parse_form_or_json(body)
        sub = data.get("principal") or data.get("sub")
        action = data.get("action")
        if not sub or not action:
            return self._json(400, {"error": "invalid_request",
                                    "detail": "principal and action required"})
        try:
            pctx = principal_ctx_from_store(
                self.store, sub,
                jti=data.get("jti"), client_id=data.get("client_id"),
                iat=data.get("iat"), kid=data.get("kid"),
            )
        except UnknownPrincipal:
            return self._json(404, {"error": "unknown_principal", "sub": sub})
        facts = data.get("facts") or {}
        pip = LocalPIP(
            self.hot,
            proposers=facts.get("proposers"),
            ticket_states=facts.get("ticket_states"),
            windows=facts.get("windows"),
            budgets=facts.get("budgets"),
        )
        decision = PDP(pip).evaluate(PDPRequest(
            principal=pctx,
            action=action,
            resource=data.get("resource") or {},
            context=data.get("context") or {},
        ))
        return self._json(200, {
            "decision": decision.decision,
            "reason": decision.reason,
            "permitted": decision.permitted,
            "required_scope": decision.required_scope,
            "obligations": [{"name": o.name, "params": o.params} for o in decision.obligations],
            "advice": list(decision.advice),
            "drift_bound_ms": decision.drift_bound_ms,
        })

    def _route_mcp(self, tool: str, headers: Dict[str, str], body: bytes
                   ) -> Tuple[int, Dict[str, str], bytes]:
        """The thin agent MCP surface: principal FORCED to the caller's own token."""
        authz = headers.get("authorization") or headers.get("Authorization") or ""
        if not authz.startswith("Bearer "):
            return self._json(401, {"error": "invalid_token"},
                              extra={"WWW-Authenticate": "Bearer"})
        token = authz[len("Bearer "):].strip()
        # The MCP surface is audience-bound to `auth`.
        try:
            claims = validate_access_token(
                token, self.keyring, expected_iss=self.issuer,
                expected_aud="auth", now=int(time.time()), leeway_s=60,
            )
        except Exception:
            return self._json(401, {"error": "invalid_token"},
                              extra={"WWW-Authenticate": "Bearer"})
        principal = self.store.get_principal(claims.sub)
        kind = principal.kind if principal is not None else KIND_AGENT
        caller = CallerIdentity.from_access_token(claims, kind=kind, kid=_kid_of(token))
        args = _parse_form_or_json(body) if body else {}
        try:
            result = self.mcp.call(tool, caller, args)
        except AuthError as e:
            return self._json(403, {"error": type(e).__name__, "detail": str(e)})
        return self._json(200, result)

    # -- admin surface --------------------------------------------------
    def _route_admin(self, method: str, route: str, headers: Dict[str, str], body: bytes
                     ) -> Tuple[int, Dict[str, str], bytes]:
        if not self._is_admin(headers):
            return self._json(401, {"error": "unauthorized",
                                    "detail": "admin surface requires the operator admin bearer"})
        data = _parse_form_or_json(body) if body else {}

        if route == "/admin/principals" and method == "GET":
            return self._json(200, {"principals": [
                {"sub": p.sub, "kind": p.kind, "agent_class": p.agent_class,
                 "status": p.status, "roles": sorted(self.store.roles_of(p.sub)),
                 "effective_scopes": sorted(self.store.effective_scopes(p.sub))}
                for p in self.store.list_principals()
            ]})

        if route == "/admin/principals" and method == "POST":
            p = Principal(
                sub=data["sub"], kind=data["kind"],
                agent_class=data.get("agent_class"), client_id=data.get("client_id"),
                display_name=data.get("display_name", ""),
            )
            self.store.put_principal(p)
            self.store.append_audit({"event": "create_principal", "sub": p.sub, "kind": p.kind})
            return self._json(200, {"created": p.sub})

        if route == "/admin/principals/status" and method == "POST":
            self.store.set_principal_status(data["sub"], data["status"])
            self.store.append_audit({"event": "set_status", "sub": data["sub"], "status": data["status"]})
            return self._json(200, {"sub": data["sub"], "status": data["status"]})

        if route == "/admin/roles/assign" and method == "POST":
            # This is where the §3.5 SSD check + attestation invariant fire.
            self.store.assign_role(data["sub"], data["role_id"])
            self.store.append_audit({"event": "assign_role", "sub": data["sub"], "role": data["role_id"]})
            return self._json(200, {"assigned": [data["sub"], data["role_id"]]})

        if route == "/admin/budgets" and method == "GET":
            sub = data.get("sub") or ""
            pol = self.store.get_budget_policy(sub)
            return self._json(200, {"owner": sub, "policy": _budget_public(pol)})

        if route == "/admin/budgets" and method == "POST":
            pol = _budget_from_request(data)
            self.store.put_budget_policy(pol)
            self.store.append_audit({"event": "set_budget", "owner": pol.owner})
            return self._json(200, {"owner": pol.owner, "policy": _budget_public(pol)})

        if route == "/admin/killswitch" and method == "GET":
            level, epoch = self.killswitch.current()
            return self._json(200, {"level": level, "epoch": epoch})

        if route == "/admin/killswitch" and method == "POST":
            ack = self.killswitch.arm(
                data["level"], issued_by=data.get("issued_by", "operator"),
                reason=data.get("reason", "operator action"),
            )
            return self._json(200, {"committed": ack.committed, "level": ack.level, "epoch": ack.epoch})

        if route == "/admin/revoke" and method == "POST":
            kind = data.get("kind", "sub")
            issued_by = data.get("issued_by", "operator")
            reason = data.get("reason", "operator revoke")
            if kind == "sub":
                ack = self.killswitch.revoke_principal(data["target"], issued_by=issued_by, reason=reason)
            elif kind == "client_id":
                ack = self.killswitch.disable_client(data["target"], issued_by=issued_by, reason=reason)
            elif kind == "kid":
                # The JWKS-kid-prune is the REDIS-INDEPENDENT kill (§7.3): it MUST
                # land first so the operator can STOP even with Redis down. Do the
                # local prune, THEN best-effort the Redis projection — if Redis is
                # unreachable the kill still bites (RS token validation fails suite-
                # wide on the next JWKS refresh); return an honest degraded ack.
                self.keyring.retire(data["target"])
                try:
                    ack = self.killswitch.retire_signing_key(
                        data["target"], issued_by=issued_by, reason=reason)
                except Exception:
                    return self._json(200, {"committed": True, "kind": kind,
                                            "degraded": "redis_unavailable"})
            else:
                return self._json(400, {"error": "invalid_request", "detail": f"unknown kind {kind!r}"})
            return self._json(200, {"committed": ack.committed, "epoch": ack.epoch, "kind": kind})

        if route == "/admin/breakglass" and method == "POST":
            session = self.breakglass.begin(
                data.get("offline_factor", "demo-hw-factor"),
                invoked_by=data.get("invoked_by", "operator"),
            )
            direction = data.get("direction", "stop")
            op = data["operation"]
            reason = data.get("reason", "break-glass")
            if direction == "stop":
                rec = session.stop(op, reason, kill_level=data.get("kill_level", KILL_G2),
                                   target=data.get("target"))
            else:
                rec = session.restore(op, reason, target=data.get("target"))
            return self._json(200, {
                "invocation_id": rec.invocation_id, "direction": rec.direction,
                "operation": rec.operation, "enacted": rec.enacted,
                "review_required": rec.review_required,
                "holds_action_side_scope": False,
            })

        if route == "/admin/audit" and method == "GET":
            return self._json(200, {"audit": self.store.read_audit()})

        return self._json(404, {"error": "not_found", "path": route})

    def _route_static(self, rel: str) -> Tuple[int, Dict[str, str], bytes]:
        rel = rel.split("?")[0]
        if not rel or rel.endswith("/"):
            rel = (rel + "overview.html") if rel else "overview.html"
        # Prevent path traversal.
        safe = os.path.normpath(rel).replace("\\", "/")
        if safe.startswith("..") or os.path.isabs(safe):
            return self._json(403, {"error": "forbidden"})
        full = os.path.join(self.ui_dir, safe)
        if not os.path.isfile(full):
            return self._json(404, {"error": "not_found", "file": rel})
        with open(full, "rb") as f:
            data = f.read()
        ctype = _content_type(full)
        return 200, {"Content-Type": ctype, "Cache-Control": "no-store"}, data

    # ------------------------------------------------------------------ #
    # helpers.
    # ------------------------------------------------------------------ #
    def _is_admin(self, headers: Dict[str, str]) -> bool:
        authz = headers.get("authorization") or headers.get("Authorization") or ""
        # Constant-time compare so the admin bearer can't be recovered byte-by-byte
        # via response timing (Critical-infra: this gates the kill switch / revoke).
        return secrets.compare_digest(authz, f"Bearer {self.admin_token}")

    def _json(self, status: int, obj: object, *, extra: Optional[Dict[str, str]] = None
              ) -> Tuple[int, Dict[str, str], bytes]:
        h = {"Content-Type": "application/json", "Cache-Control": "no-store"}
        if extra:
            h.update(extra)
        return status, h, _json_bytes(obj)


# ---------------------------------------------------------------------------
# Module-level helpers.
# ---------------------------------------------------------------------------

def _parse_form_or_json(body: bytes) -> Dict[str, object]:
    if not body:
        return {}
    text = body.decode("utf-8", "replace").strip()
    if not text:
        return {}
    if text[0] in "{[":
        try:
            obj = json.loads(text)
            return obj if isinstance(obj, dict) else {"_": obj}
        except Exception:
            return {}
    # application/x-www-form-urlencoded
    from urllib.parse import parse_qs
    out: Dict[str, object] = {}
    for k, v in parse_qs(text).items():
        out[k] = v[0] if len(v) == 1 else v
    return out


def _kid_free_aud(token: str) -> Optional[str]:
    """Best-effort read of the token's own aud (used only when introspection
    caller did not pin one — still requires it to match at validation)."""
    try:
        payload = json.loads(b64u_decode(token.split(".")[1]))
        aud = payload.get("aud")
        return aud if isinstance(aud, str) else None
    except Exception:
        return None


def _budget_public(pol: Optional[BudgetPolicy]) -> Optional[Dict[str, object]]:
    if pol is None:
        return None
    return {
        "owner": pol.owner,
        "rate": None if pol.rate is None else {
            "emission_interval_ms": pol.rate.emission_interval_ms,
            "burst_tau_ms": pol.rate.burst_tau_ms},
        "concurrency": None if pol.concurrency is None else {
            "global_max": pol.concurrency.global_max,
            "per_class_max": dict(pol.concurrency.per_class_max)},
        "lifetime": None if pol.lifetime is None else {
            "max_lifetime_tool_calls": pol.lifetime.max_lifetime_tool_calls,
            "max_wall_clock_ms": pol.lifetime.max_wall_clock_ms},
        "cooldowns_ms": dict(pol.cooldowns_ms),
        "version": pol.version,
    }


def _budget_from_request(data: Dict[str, object]) -> BudgetPolicy:
    rate = data.get("rate")
    conc = data.get("concurrency")
    life = data.get("lifetime")
    return BudgetPolicy(
        owner=data["owner"],  # type: ignore[index]
        rate=None if not rate else RateLimit(int(rate["emission_interval_ms"]), int(rate.get("burst_tau_ms", 0))),
        concurrency=None if not conc else ConcurrencyLimit(int(conc["global_max"]), dict(conc.get("per_class_max", {}))),
        lifetime=None if not life else LifetimeLimit(
            life.get("max_lifetime_tool_calls"), life.get("max_wall_clock_ms"),
            life.get("no_progress_calls_trigger"), life.get("no_progress_minutes_trigger")),
        cooldowns_ms=dict(data.get("cooldowns_ms", {})),  # type: ignore[arg-type]
    )


def _content_type(path: str) -> str:
    if path.endswith(".html"):
        return "text/html; charset=utf-8"
    if path.endswith(".css"):
        return "text/css; charset=utf-8"
    if path.endswith(".js"):
        return "application/javascript; charset=utf-8"
    if path.endswith(".json"):
        return "application/json"
    if path.endswith(".svg"):
        return "image/svg+xml"
    return "application/octet-stream"


# ---------------------------------------------------------------------------
# The stdlib HTTP handler — a THIN shim over AuthApp.dispatch.
# ---------------------------------------------------------------------------

def make_handler(app: AuthApp):
    class _Handler(BaseHTTPRequestHandler):
        protocol_version = "HTTP/1.1"
        server_version = "auth-core/0.1"

        def log_message(self, fmt, *args):  # keep the boot output tidy
            import sys
            sys.stderr.write("[auth] " + (fmt % args) + "\n")

        def _headers_dict(self) -> Dict[str, str]:
            return {k: v for k, v in self.headers.items()}

        def _handle(self, method: str) -> None:
            length = int(self.headers.get("Content-Length", "0") or "0")
            body = self.rfile.read(length) if length else b""
            status, headers, out = app.dispatch(method, self.path, self._headers_dict(), body)
            self.send_response(status)
            for k, v in headers.items():
                self.send_header(k, v)
            self.send_header("Content-Length", str(len(out)))
            self.end_headers()
            if out:
                self.wfile.write(out)

        def do_GET(self):
            self._handle("GET")

        def do_POST(self):
            self._handle("POST")

        def do_PUT(self):
            self._handle("PUT")

    return _Handler


def serve(host: str = "0.0.0.0", port: Optional[int] = None) -> None:
    port = port or int(os.environ.get("AUTH_PORT", "8089"))
    # On the migrated substrate the one-shot `auth.migrate` job seeds the shared
    # Postgres once; the active-active replicas must NOT re-seed (set AUTH_SEED_DEMO=0).
    # Default "1" preserves single-node/dev behaviour (`python -m auth.server` seeds).
    seed = os.environ.get("AUTH_SEED_DEMO", "1") == "1"
    app = AuthApp(seed_demo=seed)
    httpd = ThreadingHTTPServer((host, port), make_handler(app))
    import sys
    sys.stderr.write(
        f"[auth] Core API listening on {host}:{port} — issuer={app.issuer} "
        f"signer_alg={app.signer_alg}\n"
        f"[auth] surfaces: /api/verify /pdp/decision /jwks /introspect /revoke "
        f"/mcp/* /admin/* /ui/*\n"
    )
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.shutdown()


if __name__ == "__main__":
    serve()
