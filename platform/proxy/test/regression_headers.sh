#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# A§8.9 proxy-agnostic header-injection regression test — the Stage-7 gate the
# proxy CONTRACT (auth §8.9) obliges this component to ship. Owned here; runs green
# now against the stub, and MUST be re-run against the real auth at the joint checkpoint.
#
# Run AFTER: docker compose --env-file .env.internal up -d --build
# Usage:     ./test/regression_headers.sh [internal|public]
#
# For each injected header a client must never control, on an ALLOWED request
# (Bearer valid-agent → 200 → upstream echo):
#   (1) the injected value must NOT reach the upstream (CVE-2026-30851 regression), and
#   (2) upstream must still see auth's own X-Auth-Identity (proves copy-only-on-200).
# Plus the @auth gate-exempt path is proven scrubbed via the stub's X-Stub-Saw echo.
# ═════════════════════════════════════════════════════════════════════════════
set -u
MODE="${1:-internal}"
SUITE="$(grep -E '^SUITE_DOMAIN=' ".env.${MODE}" | cut -d= -f2)"
IP="${PROXY_IP:-127.0.0.1}"
PASS=0; FAIL=0
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT

# Injections a client must never smuggle past the edge (dash, underscore, case, prefix, trace).
INJECT=(
  'X-Auth-Identity: FORGEDIDENT'
  'X_Auth_Identity: FORGEDUNDER'
  'Remote-User: operator'
  'Remote-Groups: approver'
  'REMOTE-USER: operatorcase'
  'X-Forwarded-User: operator'
  'X-Forwarded-Groups: approver'
  'X-Forwarded-Prefix: /admin'
  'X_Forwarded_Prefix: /adminunder'
  'traceparent: 00-deadbeefdeadbeefdeadbeefdeadbeef-1111111111111111-01'
  # MIXED dash/underscore variants (Stage-5): a separator-folding upstream (WSGI/CGI/nginx) would
  # conflate these with the real header; (scrub) must strip them too. Contract-sync gate.
  'X-Auth_Identity: FORGEDMIXA'
  'X_Auth-Identity: FORGEDMIXB'
  'X-Forwarded_Prefix: /adminmix'
)
# The distinctive substrings that must be ABSENT from the upstream echo if scrub worked.
NEEDLES=(FORGEDIDENT FORGEDUNDER operator approver operatorcase /admin /adminunder deadbeefdeadbeef FORGEDMIXA FORGEDMIXB /adminmix)

echo "== A§8.9 header-injection regression: mode=$MODE suite=$SUITE =="

# WARM-UP (discarded): absorb caddy-ratelimit issue #94 (spurious 429 on the FIRST request to an empty
# per-IP counter on Caddy 2.11.x). verify.sh's rate-limit burst + 65s cooldown can leave the counter
# empty right before this script runs, which is exactly #94's trigger — prime both zones first so the
# asserted requests below never hit a cold counter. Harmless if #94 is absent.
curl -sS -k --max-time 8 --resolve "board.$SUITE:443:$IP" -o /dev/null \
    -H 'Authorization: Bearer valid-agent' "https://board.$SUITE/" 2>/dev/null || true
curl -sS -k --max-time 8 --resolve "auth.$SUITE:443:$IP" -o /dev/null \
    -H 'Authorization: Bearer valid-agent' "https://auth.$SUITE/api/verify" 2>/dev/null || true

args=(-H 'Authorization: Bearer valid-agent')
for h in "${INJECT[@]}"; do args+=(-H "$h"); done

body="$TMP/body"
code=$(curl -sS -k --max-time 8 --resolve "board.$SUITE:443:$IP" \
      "${args[@]}" -o "$body" -w '%{http_code}' "https://board.$SUITE/" 2>/dev/null)

if [ "$code" = "200" ] && grep -q 'UPSTREAM=board' "$body"; then
  PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m request allowed, reached upstream (200)\n'
else
  FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m expected 200+upstream, got %s\n' "$code"
fi

for n in "${NEEDLES[@]}"; do
  if grep -qF "$n" "$body"; then
    FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m injected %-16s LEAKED to upstream\n' "$n"
  else
    PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m injected %-16s stripped\n' "$n"
  fi
done

# auth's own identity must still be present (copy-only-on-200 works).
if grep -qi 'X-Auth-Identity: *STUB\.' "$body"; then
  PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m auth X-Auth-Identity present at upstream\n'
else
  FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m auth X-Auth-Identity missing at upstream\n'
fi

# @auth gate-exempt path: prove the verify subrequest was scrubbed (stub saw NONE).
hf="$TMP/ah"
curl -sS -k --max-time 8 --resolve "auth.$SUITE:443:$IP" -D "$hf" -o /dev/null \
    -H 'Authorization: Bearer valid-agent' \
    -H 'X-Auth-Identity: FORGEDIDENT' -H 'X_Auth_Identity: FORGEDUNDER' -H 'Remote-User: operator' \
    "https://auth.$SUITE/api/verify" >/dev/null 2>&1
for pair in 'X-Stub-Saw-XAuthIdentity' 'X-Stub-Saw-XAuthIdentity-Underscore' 'X-Stub-Saw-RemoteUser'; do
  if grep -qi "^${pair}: *NONE" "$hf"; then
    PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m @auth verify saw %s = NONE\n' "$pair"
  else
    FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m @auth verify %s not scrubbed\n' "$pair"
  fi
done

echo "== $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
