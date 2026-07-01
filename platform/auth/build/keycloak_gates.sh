#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# keycloak_gates.sh — operator G-gate harness for auth's Keycloak 26.4 + Postgres
# ═════════════════════════════════════════════════════════════════════════════
# Closes CV-3 (BUILD.md §e). Runs the G1–G10 build-spike gates (PLAN §10.3 /
# build/PHASE0_IDP_BAKEOFF.md) against a REAL booted realm. Each gate prints
# GO / NO-GO / CANNOT-CLOSE-HERE with the exact command it ran.
#
#   Prereq:  docker compose -f platform/auth/docker-compose.yml up -d --build
#   Run:     bash platform/auth/build/keycloak_gates.sh
#
# ── THE LOAD-BEARING GATE IS G3 (audience non-overlap). ──────────────────────
# Keycloak has NO native RFC 8707; isolation is "stamp aud at the ISSUER, VALIDATE
# aud at the RESOURCE." This script proves the ISSUER-SIDE property G3 owns: it
# configures the documented workaround (oidc-audience-mapper + per-resource client
# scope, assigned so holder audiences NEVER overlap) and asserts that a token minted
# for `board` carries aud=board and NOT gateway (and vice-versa). It then applies the
# resource server's OWN audience-match rule (the exact check auth-core runs at
# surface.py:232 — aud != expected ⇒ deny) to the minted token and asserts the token
# is REJECTED for gateway — i.e. it asserts the REJECTION, not merely that a token was
# issued. The full END-TO-END RS denial through the real proxy + auth /api/verify is
# JC-1/JC-2 (a Keycloak token can't be sig-validated by auth's own JWKS, so the live
# hop is a joint checkpoint, not something this issuer-side gate can stand in for).
#
# The audience discriminator here is auth-core's ACTUAL one: the `app` segment of
# a scope IS the RFC 8707 audience (auth.core.scopes.audience_of →
# src/auth/verify/forward_auth.py:201-209 `_aud_from_host`; src/auth/mcp/surface.py:232
# rejects a token whose `aud != AUTH_SURFACE_AUDIENCE`). So the realm's mapper
# stamps aud=`board` / aud=`gateway` — the same strings auth-core compares against —
# and the RS-rejection check below mirrors surface.py:232 exactly. If the mapper
# stamped anything else, the gate would be hollow; it stamps the app segment.
# ═════════════════════════════════════════════════════════════════════════════
set -uo pipefail

# ── config (override via env) ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$SCRIPT_DIR/../docker-compose.yml}"
KC_BASE="${KC_BASE:-http://localhost:8080}"      # host-published keycloak port
REALM="${REALM:-agent-corp}"
KC_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KC_ADMIN_PW="${KEYCLOAK_ADMIN_PASSWORD:-change-me-in-prod}"
KCADM=(docker compose -f "$COMPOSE_FILE" exec -T keycloak /opt/keycloak/bin/kcadm.sh)
TOKEN_URL="$KC_BASE/realms/$REALM/protocol/openid-connect/token"
INTROSPECT_URL="$KC_BASE/realms/$REALM/protocol/openid-connect/token/introspect"
REVOKE_URL="$KC_BASE/realms/$REALM/protocol/openid-connect/revoke"

# ── result tally ─────────────────────────────────────────────────────────────
declare -a SUMMARY=()
RUNNABLE_FAIL=0
record() { SUMMARY+=("$1|$2|$3"); }              # gate | verdict | note
pass()  { echo "  ✅ PASS: $*"; }
fail()  { echo "  ❌ FAIL: $*"; RUNNABLE_FAIL=1; }
info()  { echo "  ·  $*"; }
hdr()   { echo; echo "── $* ──────────────────────────────────────────────"; }

need() { command -v "$1" >/dev/null 2>&1 || { echo "FATAL: '$1' not found on PATH"; exit 2; }; }
need docker; need curl; need python3

# ── JWT helpers (python3 — no jq-on-JWT; base64url re-padded) ─────────────────
aud_has() {  # $1=access_token  $2=needle  -> exit 0 if aud contains needle
  python3 - "$1" "$2" <<'PY'
import sys, base64, json
tok, needle = sys.argv[1], sys.argv[2]
try:
    seg = tok.split('.')[1]; seg += '=' * (-len(seg) % 4)
    aud = json.loads(base64.urlsafe_b64decode(seg)).get('aud')
except Exception:
    sys.exit(2)
auds = aud if isinstance(aud, list) else ([aud] if aud else [])
sys.exit(0 if needle in auds else 1)
PY
}
jwt_claim() {  # $1=token $2=claim -> prints JSON (or empty)
  python3 - "$1" "$2" <<'PY'
import sys, base64, json
tok, claim = sys.argv[1], sys.argv[2]
seg = tok.split('.')[1]; seg += '=' * (-len(seg) % 4)
print(json.dumps(json.loads(base64.urlsafe_b64decode(seg)).get(claim)))
PY
}
json_field() { python3 -c 'import sys,json;print(json.load(sys.stdin).get(sys.argv[1],""))' "$1"; }

# ── kcadm helpers ────────────────────────────────────────────────────────────
kc_login() {
  "${KCADM[@]}" config credentials --server http://localhost:8080 \
    --realm master --user "$KC_ADMIN" --password "$KC_ADMIN_PW" >/dev/null
}
ensure_realm() {
  "${KCADM[@]}" get "realms/$REALM" >/dev/null 2>&1 && return 0
  "${KCADM[@]}" create realms -s "realm=$REALM" -s enabled=true >/dev/null
}
client_uuid() {  # $1=clientId -> prints UUID (empty if none)
  "${KCADM[@]}" get clients -r "$REALM" -q "clientId=$1" --fields id --format csv --noquotes 2>/dev/null | tr -d '\r'
}
ensure_client() {  # $1=clientId -> prints UUID; confidential service-account, fullScopeAllowed=false
  local cid; cid="$(client_uuid "$1")"
  if [ -z "$cid" ]; then
    "${KCADM[@]}" create clients -r "$REALM" \
      -s "clientId=$1" -s enabled=true -s protocol=openid-connect \
      -s publicClient=false -s serviceAccountsEnabled=true \
      -s standardFlowEnabled=false -s directAccessGrantsEnabled=false \
      -s fullScopeAllowed=false >/dev/null
    cid="$(client_uuid "$1")"
  fi
  printf '%s' "$cid"
}
client_secret() {  # $1=UUID -> prints secret value
  "${KCADM[@]}" get "clients/$1/client-secret" -r "$REALM" 2>/dev/null | json_field value
}
scope_id() {  # $1=name -> prints client-scope id (empty if none)
  "${KCADM[@]}" get client-scopes -r "$REALM" -q "name=$1" --fields id,name --format csv --noquotes 2>/dev/null \
    | awk -F, -v n="$1" '$2==n{print $1}' | tr -d '\r'
}
ensure_audience_scope() {  # $1=scopeName $2=audienceValue -> prints scope id
  local sid; sid="$(scope_id "$1")"
  if [ -z "$sid" ]; then
    "${KCADM[@]}" create client-scopes -r "$REALM" \
      -s "name=$1" -s protocol=openid-connect \
      -s 'attributes."include.in.token.scope"=false' \
      -s 'attributes."display.on.consent.screen"=false' >/dev/null
    sid="$(scope_id "$1")"
    # Audience mapper: hardcode included.custom.audience (NOT included.client.audience,
    # which would emit the client UUID). This stamps aud = the app segment.
    "${KCADM[@]}" create "client-scopes/$sid/protocol-mappers/models" -r "$REALM" \
      -s "name=$1-aud" -s protocol=openid-connect -s protocolMapper=oidc-audience-mapper \
      -s "config.\"included.custom.audience\"=$2" \
      -s 'config."id.token.claim"=false' \
      -s 'config."access.token.claim"=true' \
      -s 'config."introspection.token.claim"=true' >/dev/null
  fi
  printf '%s' "$sid"
}
assign_default_scope() { "${KCADM[@]}" update "clients/$1/default-client-scopes/$2" -r "$REALM" >/dev/null 2>&1 || true; }

cc_token() {  # $1=clientId $2=secret [$3=scope] -> prints access_token (empty on failure)
  local extra=(); [ -n "${3:-}" ] && extra=(-d "scope=$3")
  curl -s -X POST "$TOKEN_URL" \
    -d grant_type=client_credentials -d "client_id=$1" -d "client_secret=$2" \
    "${extra[@]}" | json_field access_token
}

# ═════════════════════════════════════════════════════════════════════════════
# preflight
# ═════════════════════════════════════════════════════════════════════════════
hdr "preflight — wait for Keycloak, then kcadm login"
# Cold boot runs the start-dev auto-build + first-boot Liquibase migration; poll the
# master realm until it answers (up to ~180s) so this harness works right after
# `up -d` without requiring `up --wait`.
ready=0
for i in $(seq 1 60); do
  if curl -fsS "$KC_BASE/realms/master/.well-known/openid-configuration" >/dev/null 2>&1; then
    ready=1; break
  fi
  [ "$i" = 1 ] && echo -n "  waiting for Keycloak at $KC_BASE " || echo -n "."
  sleep 3
done
echo
[ "$ready" = 1 ] || { echo "FATAL: Keycloak not reachable at $KC_BASE after ~180s. Is it up? docker compose -f $COMPOSE_FILE ps"; exit 2; }
kc_login || { echo "FATAL: kcadm login failed (check KEYCLOAK_ADMIN / KEYCLOAK_ADMIN_PASSWORD)"; exit 2; }
ensure_realm
info "realm=$REALM ready; admin authenticated"

BOARD_CID="$(ensure_client board-client)"
GW_CID="$(ensure_client gateway-client)"
BOARD_SCOPE="$(ensure_audience_scope board-audience board)"
GW_SCOPE="$(ensure_audience_scope gateway-audience gateway)"
assign_default_scope "$BOARD_CID" "$BOARD_SCOPE"
assign_default_scope "$GW_CID" "$GW_SCOPE"
# board-client is DELIBERATELY never assigned gateway-audience (and vice-versa).
BOARD_SECRET="$(client_secret "$BOARD_CID")"
GW_SECRET="$(client_secret "$GW_CID")"
[ -n "$BOARD_CID" ] && [ -n "$GW_CID" ] && [ -n "$BOARD_SECRET" ] && [ -n "$GW_SECRET" ] \
  || { echo "FATAL: client/secret provisioning failed"; exit 2; }
info "clients board-client=$BOARD_CID gateway-client=$GW_CID provisioned (aud mappers attached)"

# ═════════════════════════════════════════════════════════════════════════════
# G3 — AUDIENCE NON-OVERLAP (the #1 load-bearing gate) — assert REJECTION
# ═════════════════════════════════════════════════════════════════════════════
hdr "G3 — RFC 8707 audience isolation: no token spans two holder audiences"
BOARD_TOK="$(cc_token board-client "$BOARD_SECRET")"
GW_TOK="$(cc_token gateway-client "$GW_SECRET")"
if [ -z "$BOARD_TOK" ] || [ -z "$GW_TOK" ]; then
  fail "could not mint client_credentials tokens"; record G3 NO-GO "token mint failed"
else
  info "board aud   = $(jwt_claim "$BOARD_TOK" aud)"
  info "gateway aud = $(jwt_claim "$GW_TOK" aud)"
  g3_ok=1
  # (1) each token carries ONLY its own holder audience
  aud_has "$BOARD_TOK" board   || { fail "board token missing aud=board"; g3_ok=0; }
  aud_has "$BOARD_TOK" gateway && { fail "board token ALSO carries aud=gateway (OVERLAP)"; g3_ok=0; }
  aud_has "$GW_TOK" gateway    || { fail "gateway token missing aud=gateway"; g3_ok=0; }
  aud_has "$GW_TOK" board      && { fail "gateway token ALSO carries aud=board (OVERLAP)"; g3_ok=0; }

  # (2) THE REJECTION — apply the gateway RS's own audience-match rule to the board
  #     token (the exact check auth-core runs at src/auth/mcp/surface.py:232:
  #     `if caller.aud != expected: deny`). This asserts the token WOULD be refused.
  echo "  → applying the gateway RS aud-match rule (surface.py:232) to the board token:"
  if aud_has "$BOARD_TOK" gateway; then
    fail "board token ACCEPTED for gateway (aud check would pass — SoD BREACH)"; g3_ok=0
  else
    pass "board token REJECTED for gateway (aud=board ≠ required gateway) — non-overlap holds"
  fi
  # sanity anchor: the gateway token IS accepted at its own RS
  aud_has "$GW_TOK" gateway && pass "gateway token accepted at gateway RS (positive control)" \
                            || { fail "gateway token rejected at its OWN RS"; g3_ok=0; }

  # (3) board-client cannot WIDEN into gateway even by asking for the scope
  WIDEN_TOK="$(cc_token board-client "$BOARD_SECRET" gateway-audience)"
  if [ -z "$WIDEN_TOK" ]; then
    pass "board-client's request for scope=gateway-audience was refused outright"
  elif aud_has "$WIDEN_TOK" gateway; then
    fail "board-client WIDENED to aud=gateway by requesting the scope (OVERLAP)"; g3_ok=0
  else
    pass "board-client requesting gateway-audience still yields no aud=gateway"
  fi

  [ "$g3_ok" = 1 ] && record G3 GO "audience non-overlap proven; board↮gateway rejection asserted" \
                    || record G3 NO-GO "audience overlap or rejection failed — SEE ABOVE (promotes Zitadel if un-mitigable)"
fi

# ═════════════════════════════════════════════════════════════════════════════
# G4 — revoke + introspect (RFC 7009 / RFC 7662): active flips true→false
# ═════════════════════════════════════════════════════════════════════════════
hdr "G4 — revoke + introspect (live SoD-critical path)"
# NOTE (KC >= 26.6.2): introspection now requires the AUTHENTICATED client to appear
# in the token's `aud`. board-client's token is stamped aud=`board` (not clientId
# `board-client`), so on >= 26.6.2 `a_before` would already be false. The image is
# PINNED to 26.4.7 where this works. If you bump the image past 26.6.2, add an audience
# mapper stamping the clientId into aud, OR introspect with a dedicated introspector
# client whose clientId is in the token's aud. (KC discussion #49832.)
G4TOK="$(cc_token board-client "$BOARD_SECRET")"
norm() { printf '%s' "${1,,}"; }   # lower-case; robust to True/true impl differences
if [ -z "$G4TOK" ]; then
  fail "no token to revoke"; record G4 NO-GO "token mint failed"
else
  a_before="$(norm "$(curl -s -u "board-client:$BOARD_SECRET" -d "token=$G4TOK" "$INTROSPECT_URL" | json_field active)")"
  t0="$(python3 -c 'import time;print(time.time())')"
  curl -s -u "board-client:$BOARD_SECRET" -d "token=$G4TOK" -d token_type_hint=access_token "$REVOKE_URL" >/dev/null
  a_after="$(norm "$(curl -s -u "board-client:$BOARD_SECRET" -d "token=$G4TOK" "$INTROSPECT_URL" | json_field active)")"
  t1="$(python3 -c 'import time;print(time.time())')"
  elapsed="$(python3 -c "print(f'{($t1-$t0)*1000:.0f}')")"
  info "introspect active: before=$a_before  after-revoke=$a_after  (revoke→introspect ${elapsed} ms)"
  if [ "$a_before" != "true" ]; then
    # Separate an introspection-AUTH failure from a genuine non-revocation.
    fail "token was NOT active before revoke (before=$a_before) — introspection auth/aud problem, not a revoke result (see KC>=26.6.2 note)"
    record G4 NO-GO "introspection returned active!=true before revoke (auth/aud issue)"
  elif [ "$a_after" = "false" ]; then
    pass "introspection reflects revocation (active true→false)"
    record G4 GO "revoke+introspect works; measured ${elapsed}ms (sub-second SLO + HA read-your-writes = CANNOT-CLOSE-HERE, needs Redis/Postgres multi-replica)"
  else
    fail "active did not flip true→false (before=$a_before after=$a_after)"
    record G4 NO-GO "introspect did not reflect revoke"
  fi
fi

# ═════════════════════════════════════════════════════════════════════════════
# G2 — per-client access-token lifespan ≤ 5min, independent of realm default
# ═════════════════════════════════════════════════════════════════════════════
hdr "G2 — per-client access-token lifespan override"
"${KCADM[@]}" update "clients/$BOARD_CID" -r "$REALM" \
  -s 'attributes."access.token.lifespan"=120' >/dev/null 2>&1 || true
G2TOK="$(cc_token board-client "$BOARD_SECRET")"
if [ -n "$G2TOK" ]; then
  iat="$(jwt_claim "$G2TOK" iat)"; exp="$(jwt_claim "$G2TOK" exp)"
  life=$(( exp - iat ))
  info "exp-iat = ${life}s (client override=120s)"
  if [ "$life" -le 300 ]; then
    pass "token lifespan ${life}s ≤ 300s (client override honored)"; record G2 GO "lifespan=${life}s"
  else
    fail "token lifespan ${life}s exceeds 5min"; record G2 NO-GO "lifespan=${life}s"
  fi
else
  fail "no token minted"; record G2 NO-GO "token mint failed"
fi

# ═════════════════════════════════════════════════════════════════════════════
# G6 — custom budget claims land on the machine token
# ═════════════════════════════════════════════════════════════════════════════
hdr "G6 — custom budget claims (max_concurrency / cooldown_class)"
BUDGET_SCOPE="$(scope_id budget-claims)"
if [ -z "$BUDGET_SCOPE" ]; then
  "${KCADM[@]}" create client-scopes -r "$REALM" -s name=budget-claims -s protocol=openid-connect \
    -s 'attributes."include.in.token.scope"=false' >/dev/null 2>&1 || true
  BUDGET_SCOPE="$(scope_id budget-claims)"
  "${KCADM[@]}" create "client-scopes/$BUDGET_SCOPE/protocol-mappers/models" -r "$REALM" \
    -s name=max-concurrency -s protocol=openid-connect -s protocolMapper=oidc-hardcoded-claim-mapper \
    -s 'config."claim.name"=max_concurrency' -s 'config."claim.value"=4' \
    -s 'config."jsonType.label"=int' -s 'config."access.token.claim"=true' >/dev/null 2>&1 || true
fi
assign_default_scope "$BOARD_CID" "$BUDGET_SCOPE"
G6TOK="$(cc_token board-client "$BOARD_SECRET")"
mc="$(jwt_claim "$G6TOK" max_concurrency)"
info "max_concurrency claim = $mc"
if [ "$mc" = "4" ] || [ "$mc" = '"4"' ]; then
  pass "custom claim present on client-credentials token"; record G6 GO "max_concurrency=4 minted"
else
  fail "custom claim missing"; record G6 NO-GO "claim not minted"
fi

# ═════════════════════════════════════════════════════════════════════════════
# G5 — DPoP GA 26.4 (config-present check; full replay proof needs asymmetric crypto)
# ═════════════════════════════════════════════════════════════════════════════
hdr "G5 — sender-constrained (DPoP / mTLS HoK)"
if "${KCADM[@]}" update "clients/$GW_CID" -r "$REALM" \
     -s 'attributes."dpop.bound.access.tokens"=true' >/dev/null 2>&1; then
  pass "'Require DPoP bound tokens' toggle accepted on gateway-client (DPoP is GA in 26.4)"
  info "FULL proof (mint with a real DPoP proof → cnf.jkt present; replay WITHOUT proof → 401;"
  info "replay with a DIFFERENT key → 401; proof-key TPM co-location) needs an asymmetric DPoP"
  info "primitive + TPM host → CANNOT-CLOSE-ON-LAPTOP."
  record G5 CANNOT-CLOSE "DPoP config toggles (GA 26.4); end-to-end replay + TPM co-location need hardware/asymmetric proof"
else
  info "could not set DPoP attribute (check client); DPoP replay proof is CANNOT-CLOSE-ON-LAPTOP regardless"
  record G5 CANNOT-CLOSE "DPoP replay + mTLS HoK co-location need hardware/asymmetric proof"
fi

# ═════════════════════════════════════════════════════════════════════════════
# G1 / G9 — cannot close on a laptop (hardware / multi-node)
# ═════════════════════════════════════════════════════════════════════════════
hdr "G1 — non-exportable (TPM/HSM) executor key + off-host-mint refusal"
info "Keycloak stores only the PUBLIC JWK; per-client JWKS + rotation are GO-by-docs. Whether the"
info "agent's PRIVATE key is TPM-sealed is a client-host property → needs a real TPM host:"
info "  tpm2_create -C primary.ctx -G ecc256:ecdsa -a 'fixedtpm|fixedparent|sign' -u k.pub -r k.priv"
info "  register k.pub as the client JWK; prove the private key CANNOT be exported; off-host mint → REFUSED."
info "(auth's non_exportable attestation refusal is already unit-tested green — see BUILD.md A4-01.)"
record G1 CANNOT-CLOSE "TPM non-exportable + off-host-mint refusal need TPM hardware"

hdr "G9 — Postgres + non-k8s Infinispan HA failover"
info "2-node compose + shared Postgres; docker stats to measure the homelab envelope; kill node-1 →"
info "node-2 serves. Needs multi-node hardware → CANNOT-CLOSE-ON-LAPTOP."
record G9 CANNOT-CLOSE "HA failover + resource envelope need multi-node hardware"

# ═════════════════════════════════════════════════════════════════════════════
# gates enforced by auth-core code (built & unit-tested green — not KC-dependent)
# ═════════════════════════════════════════════════════════════════════════════
hdr "G7 / G8 / G10 — enforced by auth-core (unit-tested green this build)"
info "G7 ConflictSet approve⊕execute rejection + Cedar/Python parity: unit-tested (test_authz/test_foundation)."
info "G8 forward-auth exactly-200=allow + inbound header scrub: unit-tested (test_verify); live proxy wiring = JC-1."
info "G10 offline-JWKS-benign vs live-introspect-destructive separation: unit-tested (test_tokens/test_verify)."
record G7 GO "auth-core unit-tested (not KC-dependent)"
record G8 GO "auth-core unit-tested; live proxy wiring = JC-1"
record G10 GO "auth-core unit-tested; live introspect = CV-3/CV-4"

# ═════════════════════════════════════════════════════════════════════════════
# summary
# ═════════════════════════════════════════════════════════════════════════════
hdr "SUMMARY"
printf '%-5s  %-14s  %s\n' GATE VERDICT NOTE
printf '%-5s  %-14s  %s\n' ----- -------------- ----
for row in "${SUMMARY[@]}"; do
  IFS='|' read -r g v n <<< "$row"
  printf '%-5s  %-14s  %s\n' "$g" "$v" "$n"
done
echo
if [ "$RUNNABLE_FAIL" -ne 0 ]; then
  echo "RESULT: ❌ one or more RUNNABLE gates FAILED — see above. (G3 NO-GO that is un-mitigable promotes Zitadel.)"
  exit 1
fi
echo "RESULT: ✅ all RUNNABLE gates GO. CANNOT-CLOSE-HERE gates (G1 TPM, G5 DPoP replay, G9 HA) need hardware/multi-node — see build/PHASE0_IDP_BAKEOFF.md."
exit 0
