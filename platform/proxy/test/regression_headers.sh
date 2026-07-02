#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# A§8.9 proxy-agnostic header-injection regression test — the Stage-7 gate the
# proxy CONTRACT (auth §8.9) obliges this component to ship. Owned here; runs green
# now against the stub, and MUST be re-run against the real auth at the joint checkpoint.
#
# Run AFTER: docker compose --env-file .env.internal up -d --build
# Usage:     ./test/regression_headers.sh [internal|public]
#   stub (default): against the Stage-4 auth stub → 16/16 (the verified baseline).
#   real (JC-1):    AUTH_TARGET=real ./test/regression_headers.sh internal
#                   → drives the REAL auth (needs AUTH_DEMO=1); mints a real agent token,
#                     asserts a signed 3-segment JWT at the upstream, skips the stub-only
#                     X-Stub-Saw echoes. Run from the ROOT joint compose (see JOINT_CHECKPOINT.md).
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

# ── JC-1: harness target (default `stub` keeps the verified 16/16; `real` = joint run) ──
# AUTH_TARGET=stub (default): literal stub credential + assert the stub's `X-Auth-Identity:
#   STUB.` echo + the stub-only `X-Stub-Saw-*` verify-path scrub echoes. Byte-identical to
#   the Stage-5 baseline.
# AUTH_TARGET=real: mint a GENUINE agent token from auth's AUTH_DEMO=1 /debug/demo-tokens and
#   assert the upstream X-Auth-Identity is a structurally-valid 3-segment JWT (real auth emits
#   `eyJ…`, never `STUB.`). The @auth `X-Stub-Saw-*` echoes cannot run (real auth emits none) —
#   the verify-path scrub is guarded by the SAME `(scrub)` snippet as the upstream path (which
#   IS asserted below), and JC-1 step 5 documents this. The forged-header strip battery (the
#   A§8.9 wall) runs UNCHANGED against real auth — only the credential differs.
AUTH_TARGET="${AUTH_TARGET:-stub}"
JWT_RE='^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$'
if [ "$AUTH_TARGET" = "real" ]; then
  demo=$(curl -sS -k --max-time 8 --resolve "auth.$SUITE:443:$IP" \
        "https://auth.$SUITE/debug/demo-tokens" 2>/dev/null)
  TOK_VALID=$(printf '%s' "$demo" | sed -n 's/.*"valid_agent":"\([^"]*\)".*/\1/p')
  [ -n "$TOK_VALID" ] || { echo "FATAL: no real agent token minted (is AUTH_DEMO=1 on real auth, /debug/demo-tokens reachable?)"; exit 2; }
else
  TOK_VALID="valid-agent"
fi

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

echo "== A§8.9 header-injection regression: mode=$MODE suite=$SUITE auth-target=$AUTH_TARGET =="

# WARM-UP (discarded): absorb caddy-ratelimit issue #94 (spurious 429 on the FIRST request to an empty
# per-IP counter on Caddy 2.11.x). verify.sh's rate-limit burst + 65s cooldown can leave the counter
# empty right before this script runs, which is exactly #94's trigger — prime both zones first so the
# asserted requests below never hit a cold counter. Harmless if #94 is absent.
curl -sS -k --max-time 8 --resolve "board.$SUITE:443:$IP" -o /dev/null \
    -H "Authorization: Bearer $TOK_VALID" "https://board.$SUITE/" 2>/dev/null || true
curl -sS -k --max-time 8 --resolve "auth.$SUITE:443:$IP" -o /dev/null \
    -H "Authorization: Bearer $TOK_VALID" "https://auth.$SUITE/api/verify" 2>/dev/null || true

args=(-H "Authorization: Bearer $TOK_VALID")
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

# auth's own identity must still be present at the upstream (copy-only-on-200 works).
# stub: literal `X-Auth-Identity: STUB.`  ·  real: a structurally-valid signed 3-segment JWT.
if [ "$AUTH_TARGET" = "real" ]; then
  ident=$(grep -i '^X-Auth-Identity:' "$body" | head -1 | sed 's/^[^:]*: *//; s/[[:space:]]*$//')
  if printf '%s' "$ident" | grep -qE "$JWT_RE"; then
    PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m upstream X-Auth-Identity is a valid 3-segment JWT (real auth)\n'
  else
    FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m upstream X-Auth-Identity not a JWT (got: %.24s…)\n' "$ident"
  fi
elif grep -qi 'X-Auth-Identity: *STUB\.' "$body"; then
  PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m auth X-Auth-Identity present at upstream\n'
else
  FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m auth X-Auth-Identity missing at upstream\n'
fi

# @auth gate-exempt path: prove the verify subrequest was scrubbed (stub echoes what it SAW).
# Real auth emits no X-Stub-Saw echo — the verify-path scrub is guarded by the SAME (scrub)
# snippet as the upstream path (asserted above), so we skip the echo assertions in real mode
# (documented, JC-1 step 5) rather than fail spuriously.
if [ "$AUTH_TARGET" = "real" ]; then
  printf '  \033[33mSKIP\033[0m @auth X-Stub-Saw scrub echoes — real auth emits none; verify-path scrub shares the (scrub) snippet asserted above (JOINT_CHECKPOINT.md JC-1 step 5)\n'
else
  hf="$TMP/ah"
  curl -sS -k --max-time 8 --resolve "auth.$SUITE:443:$IP" -D "$hf" -o /dev/null \
      -H "Authorization: Bearer $TOK_VALID" \
      -H 'X-Auth-Identity: FORGEDIDENT' -H 'X_Auth_Identity: FORGEDUNDER' -H 'Remote-User: operator' \
      "https://auth.$SUITE/api/verify" >/dev/null 2>&1
  for pair in 'X-Stub-Saw-XAuthIdentity' 'X-Stub-Saw-XAuthIdentity-Underscore' 'X-Stub-Saw-RemoteUser'; do
    if grep -qi "^${pair}: *NONE" "$hf"; then
      PASS=$((PASS+1)); printf '  \033[32mPASS\033[0m @auth verify saw %s = NONE\n' "$pair"
    else
      FAIL=$((FAIL+1)); printf '  \033[31mFAIL\033[0m @auth verify %s not scrubbed\n' "$pair"
    fi
  done
fi

echo "== $PASS passed, $FAIL failed =="
[ "$FAIL" -eq 0 ]
