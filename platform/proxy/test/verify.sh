#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# proxy Stage-4 verification harness. Proves the edge + forward-auth against the
# auth §8 contract using the minimal auth stub. Run AFTER:
#     docker compose --env-file .env.internal up -d --build
#
# Usage:  ./test/verify.sh [internal|public]     (default: internal)
#
# Maps to PLAN §12 gates: #1 (dial-fail deny), #2 (hung deny), #3 (Authz/Cookie
# forwarded), #4 (exactly-200), #7 (headers on short-circuit), plus §8.5 decision
# table, §8.6 scrub (app + @auth), and internal-CA chain. (Gate #8 rate-limit keying
# is config-resolved — no trusted_proxies, key {remote_host}; Stage 5 adds a burst test.)
# Anything needing the REAL auth is out of scope here (see BUILD.md joint checkpoint).
# ═════════════════════════════════════════════════════════════════════════════
set -u
MODE="${1:-internal}"
ENVFILE=".env.${MODE}"
SUITE="$(grep -E '^SUITE_DOMAIN=' "$ENVFILE" | cut -d= -f2)"
IP="${PROXY_IP:-127.0.0.1}"
DC="docker compose --env-file $ENVFILE"
PASS=0; FAIL=0
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# curl through the edge: $1=host $2..=extra curl args. Emits "STATUS<TAB>headers-file<TAB>body-file".
edge() {
  local host="$1"; shift
  local hf="$TMP/h.$$" bf="$TMP/b.$$"
  local code
  code=$(curl -sS -k --max-time 8 --resolve "${host}:443:${IP}" \
        -o "$bf" -D "$hf" -w '%{http_code}' "https://${host}/" "$@" 2>/dev/null)
  printf '%s\t%s\t%s' "$code" "$hf" "$bf"
}

ok()   { PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; }
check(){ [ "$2" = "$3" ] && ok "$1 ($2)" || bad "$1 (want $3, got $2)"; }

echo "== proxy verify: mode=$MODE suite=$SUITE =="

# 0. Config validates inside the running container (selected mode's env applied).
if $DC exec -T proxy caddy validate --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
  ok "0 caddy validate (config parses for $MODE)"; else bad "0 caddy validate"; fi

# 1. Health.
if $DC exec -T proxy wget -qO- http://localhost:9100/healthz | grep -q ok; then
  ok "1 healthz"; else bad "1 healthz"; fi

# 2. Agent, no credential -> 401 (never redirect). A§8.5.
IFS=$'\t' read -r c hf bf < <(edge "board.$SUITE" -H 'Accept: application/json')
check "2 agent no-cred -> 401" "$c" "401"
grep -qi '^WWW-Authenticate: *Bearer' "$hf" && ok "2b WWW-Authenticate: Bearer" || bad "2b WWW-Authenticate: Bearer"
# 2c sec headers present on this SHORT-CIRCUIT response (S2-06 / gate #7).
grep -qi '^Strict-Transport-Security:' "$hf" && grep -qi '^X-Content-Type-Options: *nosniff' "$hf" \
  && ok "2c sec-headers on 401 short-circuit" || bad "2c sec-headers on 401 short-circuit"
# 2d Server header stripped.
grep -qi '^Server: *Caddy' "$hf" && bad "2d Server header stripped" || ok "2d Server header stripped"

# 3. Browser, no credential -> 302 to login. A§8.5.
IFS=$'\t' read -r c hf bf < <(edge "board.$SUITE" -H 'Accept: text/html')
check "3 browser no-cred -> 302" "$c" "302"
grep -qi '^Location: */login' "$hf" && ok "3b Location -> /login" || bad "3b Location -> /login"

# 4. Authenticated but refused at the door -> 403. A§8.5.
IFS=$'\t' read -r c hf bf < <(edge "board.$SUITE" -H 'Authorization: Bearer refused')
check "4 refused -> 403" "$c" "403"

# 5. Allowed agent -> 200 reaches upstream; only auth's X-Auth-Identity is copied.
IFS=$'\t' read -r c hf bf < <(edge "board.$SUITE" -H 'Authorization: Bearer valid-agent')
check "5 allow -> 200 (reaches upstream)" "$c" "200"
grep -q 'UPSTREAM=board' "$bf" && ok "5b reached board upstream" || bad "5b reached board upstream"
grep -qi 'X-Auth-Identity: *STUB\.' "$bf" && ok "5c upstream got auth's X-Auth-Identity" || bad "5c upstream got X-Auth-Identity"
# 5d Remote-User trap: auth SET it on its 200, but proxy copies ONLY X-Auth-Identity (A§8.7).
grep -qi 'Remote-User: *op:eide' "$bf" && bad "5d Remote-User trap NOT copied" || ok "5d Remote-User trap not copied"

# 6. SCRUB (A§8.6 R1 / gate): client injects identity headers on an allowed request.
IFS=$'\t' read -r c hf bf < <(edge "board.$SUITE" \
    -H 'Authorization: Bearer valid-agent' \
    -H 'X-Auth-Identity: FORGED' -H 'X_Auth_Identity: FORGED_US' \
    -H 'Remote-User: operator' -H 'X-Forwarded-Prefix: /admin')
check "6 scrub allow -> 200" "$c" "200"
grep -q 'FORGED' "$bf" && bad "6b forged identity did NOT reach upstream" || ok "6b forged identity did not reach upstream"
grep -qi 'X-Forwarded-Prefix: */admin' "$bf" && bad "6c forged X-Forwarded-Prefix stripped" || ok "6c forged X-Forwarded-Prefix stripped"
grep -qi 'X-Auth-Identity: *STUB\.' "$bf" && ok "6d upstream still has auth's identity" || bad "6d upstream still has auth's identity"

# 7. Exactly-200 (A§8.5): stub returns 204 (2xx but not 200) -> proxy DENIES, upstream not reached.
IFS=$'\t' read -r c hf bf < <(edge "board.$SUITE" -H 'Authorization: Bearer allow-204')
grep -q 'UPSTREAM=board' "$bf" && bad "7 204 must NOT reach upstream" || ok "7 204 denied (upstream not reached, got $c)"

# 8. @auth route is gate-EXEMPT but STILL scrubbed (S2-01). Inject identity, hit verify via @auth;
#    the stub echoes what it SAW — must be NONE (scrub ran before proxying to auth).
# (send a valid credential so X-Stub-Saw-Authorization is a REAL forwarding proof, not just header-exists)
hf="$TMP/ah"; curl -sS -k --max-time 8 --resolve "auth.$SUITE:443:$IP" -D "$hf" -o /dev/null \
    -H 'Authorization: Bearer valid-agent' \
    -H 'X-Auth-Identity: FORGED' -H 'Remote-User: operator' "https://auth.$SUITE/api/verify" >/dev/null 2>&1
grep -qi '^X-Stub-Saw-XAuthIdentity: *NONE' "$hf" && ok "8 @auth scrubbed client X-Auth-Identity" || bad "8 @auth scrubbed X-Auth-Identity"
grep -qi '^X-Stub-Saw-RemoteUser: *NONE' "$hf" && ok "8b @auth scrubbed client Remote-User" || bad "8b @auth scrubbed Remote-User"
grep -qi '^X-Stub-Saw-Authorization: *Bearer valid-agent' "$hf" && ok "8c Authorization forwarded to verify (A§8.3)" || bad "8c Authorization forwarded"

# 9. Unmapped subdomain -> default-deny 404 (F7).
IFS=$'\t' read -r c hf bf < <(edge "nope.$SUITE" -H 'Authorization: Bearer valid-agent')
check "9 unmapped host -> 404" "$c" "404"

# 10. FAIL-CLOSED: auth unreachable -> deny (gate #1). Stop auth, expect non-200 + no upstream.
echo "-- stopping auth (fail-closed unreachable) --"; $DC stop auth >/dev/null 2>&1
IFS=$'\t' read -r c hf bf < <(edge "board.$SUITE" -H 'Authorization: Bearer valid-agent')
{ [ "$c" != "200" ] && ! grep -q 'UPSTREAM=board' "$bf"; } && ok "10 auth down -> deny (got $c)" || bad "10 auth down must deny (got $c)"
$DC start auth >/dev/null 2>&1; sleep 3

# 11. FAIL-CLOSED: auth HUNG -> deny within the 250ms response_header_timeout (gate #2, S2-02).
echo "-- recreating auth with STUB_DELAY_MS=5000 (hung verify) --"
STUB_DELAY_MS=5000 $DC up -d auth >/dev/null 2>&1; sleep 3
# Time it with curl itself (portable) — NOT `date +%s%3N` (GNU-only; a silent-0 fallback
# would let 11b pass vacuously on macOS/BSD). P4-03.
b11="$TMP/b11"
read -r c t < <(curl -sS -k --max-time 8 --resolve "board.$SUITE:443:$IP" \
    -H 'Authorization: Bearer valid-agent' -o "$b11" -w '%{http_code} %{time_total}' \
    "https://board.$SUITE/" 2>/dev/null)
{ [ "$c" != "200" ] && ! grep -q 'UPSTREAM=board' "$b11"; } && ok "11 hung auth -> deny (got $c, ${t}s)" || bad "11 hung auth must deny (got $c)"
awk -v t="$t" 'BEGIN{exit !(t+0 < 3.0)}' && ok "11b denied fast (<3s; timeout fired) ${t}s" || bad "11b should deny fast, took ${t}s"
echo "-- restoring auth (no delay) --"; STUB_DELAY_MS=0 $DC up -d auth >/dev/null 2>&1; sleep 3

# 12. INTERNAL mode only: prove the internal-CA chain validates (no -k).
if [ "$MODE" = "internal" ]; then
  $DC exec -T proxy cat /data/caddy/pki/authorities/local/root.crt > "$TMP/root.crt" 2>/dev/null
  if [ -s "$TMP/root.crt" ]; then
    code=$(curl -sS --cacert "$TMP/root.crt" --max-time 8 --resolve "board.$SUITE:443:$IP" \
          -H 'Authorization: Bearer valid-agent' -o /dev/null -w '%{http_code}' "https://board.$SUITE/" 2>/dev/null)
    check "12 internal-CA chain validates (trusted curl)" "$code" "200"
  else bad "12 could not export internal root"; fi
fi

# ── Observability addendum (security-neutral) ────────────────────────────────
# 13. Native metrics reachable on the INTERNAL listener (from inside the container).
$DC exec -T proxy wget -qO- http://localhost:9100/metrics 2>/dev/null | grep -q 'caddy_' \
  && ok "13 /metrics served on internal :9100" || bad "13 /metrics on internal :9100"

# 14. Metrics NOT publicly reachable via :443 (the public site must never serve caddy_ metrics).
curl -sS -k --max-time 8 --resolve "board.$SUITE:443:$IP" -H 'Authorization: Bearer valid-agent' \
    -o "$TMP/m" "https://board.$SUITE/metrics" 2>/dev/null
grep -q 'caddy_http_requests_total' "$TMP/m" && bad "14 metrics leaked on public :443" || ok "14 metrics NOT public via :443"

# 15. /edge-info reports the mode; access log is JSON and never contains the token value.
$DC exec -T proxy wget -qO- http://localhost:9100/edge-info 2>/dev/null | grep -qi "\"mode\":\"${MODE^^}\"" \
  && ok "15 /edge-info reports mode=$MODE" || bad "15 /edge-info mode"
curl -sS -k --max-time 8 --resolve "board.$SUITE:443:$IP" -H 'Authorization: Bearer valid-agent' \
  -o /dev/null "https://board.$SUITE/" 2>/dev/null
logs=$($DC logs --tail=80 proxy 2>&1)
printf '%s' "$logs" | grep -q '"level"' && ok "15b access log is structured JSON" || bad "15b access log JSON"
printf '%s' "$logs" | grep -q 'valid-agent' && bad "15c token value NOT in logs" || ok "15c token value not in logs"

echo "== $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
