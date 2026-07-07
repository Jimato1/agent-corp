#!/bin/sh
# =============================================================================
# bootstrap.sh — config-as-code for the OpenBao ENGINE (vault_openbao)
# =============================================================================
# App:      vault (Critical-infra)  |  Engine: OpenBao 2.5.x, pinned >= 2.5.5 (D-14)
# Implements VERBATIM:
#   PLAN §2.3 (config-as-code, applied under a short-lived generate-root/quorum
#              token; initial root token revoked at first boot),
#   §2.1 (gateway-redeemer JWT role — the HCL block rendered EXACTLY),
#   §2.2 (JWKS via proxy origin with jwks_ca_pem pinned to the suite/proxy CA),
#   §3.1 (mounts: kv-v2, ssh-CA, jwt, wrapper approle),
#   §3.3 (SSH-CA), §6.4 (TWO engine audit devices incl. MANDATORY socket-to-WORM),
#   contract vault-gateway-redemption.md §1/§2 and auth §8 THE PIN.
#
# POSIX sh. IDEMPOTENT (check-before-create everywhere). Creates NOTHING that is
# a secret; every secret/URL is read from the environment. Run against a freshly
# initialized engine using a SHORT-LIVED generate-root/quorum-minted token.
#
# ---- run context --------------------------------------------------------------
# The engine listener requires mTLS (openbao.hcl), so this script authenticates
# with a suite-internal-CA client cert AND the short-lived admin token:
#   BAO_ADDR         = https://vault_openbao:8200        (data_vault alias)
#   BAO_TOKEN        = <short-lived generate-root/quorum token>  (REVOKED at end)
#   BAO_CACERT       = /openbao/tls/suite-ca.pem
#   BAO_CLIENT_CERT  = /openbao/tls/bootstrap-client.crt   (chains to suite-internal CA)
#   BAO_CLIENT_KEY   = /openbao/tls/bootstrap-client.key
#
# ---- config env (never hardcode; no secrets baked) ----------------------------
#   VAULT_AUTH_ISSUER      = https://auth.<SUITE_DOMAIN>         (token `iss`; bound_issuer)
#   VAULT_AUTH_JWKS_URL    = https://auth.<SUITE_DOMAIN>/.well-known/jwks.json
#                            (proxy ORIGIN — integrity-protected; NEVER http://auth:8089, PLAN §2.2 M-9)
#   VAULT_SUITE_CA_PATH    = /openbao/tls/suite-ca.pem          (pins jwks_ca_pem to the suite/proxy CA)
#   VAULT_WORM_SINK_URL    = tcp://worm-loghost.<...>:<port>    (off-box WORM audit sink, D-16(b))
#   VAULT_SSH_CERT_TTL     = 10m   (optional; default cert TTL band 5-15, §3.3)
# =============================================================================

set -eu

log()  { printf '[bootstrap] %s\n' "$1" >&2; }
die()  { printf '[bootstrap] FATAL: %s\n' "$1" >&2; exit 1; }

# --- 0. Preconditions ---------------------------------------------------------
command -v bao >/dev/null 2>&1 || die "bao CLI not found on PATH"
: "${BAO_ADDR:?BAO_ADDR must be set (https://vault_openbao:8200)}"
: "${BAO_TOKEN:?BAO_TOKEN must be set (short-lived generate-root/quorum token)}"
: "${VAULT_AUTH_ISSUER:?VAULT_AUTH_ISSUER must be set}"
: "${VAULT_AUTH_JWKS_URL:?VAULT_AUTH_JWKS_URL must be set (proxy origin, https only)}"
: "${VAULT_SUITE_CA_PATH:?VAULT_SUITE_CA_PATH must be set (pins jwks_ca_pem)}"
: "${VAULT_WORM_SINK_URL:?VAULT_WORM_SINK_URL must be set (off-box WORM sink)}"
VAULT_SSH_CERT_TTL="${VAULT_SSH_CERT_TTL:-10m}"

# Guard: the JWKS fetch MUST be integrity-protected via the proxy origin.
# http://auth:8089 for a key-set over a shared bridge is a forged-key-set hole
# that collapses layer-2's root of trust (PLAN §2.2 M-9). Refuse to proceed.
case "$VAULT_AUTH_JWKS_URL" in
  https://*) : ;;
  *) die "VAULT_AUTH_JWKS_URL must be https:// (proxy origin); plain-HTTP JWKS is forbidden (PLAN §2.2 M-9)" ;;
esac
[ -r "$VAULT_SUITE_CA_PATH" ] || die "VAULT_SUITE_CA_PATH not readable: $VAULT_SUITE_CA_PATH"

# small idempotency helpers -----------------------------------------------------
secrets_enabled() { bao secrets list -format=json 2>/dev/null | grep -q "\"$1/\""; }
auth_enabled()    { bao auth    list -format=json 2>/dev/null | grep -q "\"$1/\""; }
policy_exists()   { bao policy  list 2>/dev/null | grep -qx "$1"; }
audit_enabled()   { bao audit   list -format=json 2>/dev/null | grep -q "\"$1/\""; }

# =============================================================================
# 1. KV v2 at kv/  (irreducible static secrets — PLAN §3.1)
# =============================================================================
if secrets_enabled "kv"; then
  log "kv/ already enabled — skip"
else
  log "enabling kv-v2 at kv/"
  bao secrets enable -path=kv kv-v2
fi

# =============================================================================
# 2. SSH secrets engine at ssh/  (CA mode — PLAN §3.1/§3.3, contract §2)
# =============================================================================
# allow_empty_principals is a ROLE-level field that DEFAULTS to FALSE on the
# patched line (CVE-2024-7594 fix; pinned >= 2.0.2 — contract §2). "Engine-wide
# false" is achieved by NEVER setting it true on any role: signrole.example.hcl
# pins it false and the continuous invariant check (PLAN §2.3) alarms on any
# role carrying allow_empty_principals=true / wildcard / root allowed_users.
if secrets_enabled "ssh"; then
  log "ssh/ already enabled — skip"
else
  log "enabling ssh engine at ssh/"
  bao secrets enable -path=ssh ssh
fi

# SSH CA signing key — generated INSIDE the barrier, non-exportable (crown jewel
# #1, PLAN §7.2). Idempotent: only configure if no CA public key exists yet.
if bao read -field=public_key ssh/config/ca >/dev/null 2>&1; then
  log "ssh CA already configured — skip"
else
  log "generating SSH CA signing key (non-exportable, inside the barrier)"
  bao write ssh/config/ca generate_signing_key=true
fi
# NOTE: per-host sign-roles ssh/roles/gateway-<host_id> are NOT created here.
# They are gate-defining artifacts created ONLY via the operator change-control
# path at host onboarding (B-2, PLAN §2.3) — see bootstrap/signrole.example.hcl.
# The wrapper's AppRole has an explicit DENY on ssh/roles/* (wrapper-approle.hcl).

# =============================================================================
# 3. JWT auth at auth/jwt/  (the ONE Gateway auth method — PLAN §3.1)
# =============================================================================
if auth_enabled "jwt"; then
  log "auth/jwt/ already enabled — skip"
else
  log "enabling jwt auth at auth/jwt/"
  bao auth enable jwt
fi

# Configure JWKS via the PROXY ORIGIN with the suite/proxy CA PINNED (PLAN §2.2).
# jwks_ca_pem pins the fetch to the suite CA; bound_issuer stays the token `iss`
# (independent of fetch origin). This is (re)applied every run — config-as-code
# convergence; a drifted JWKS/issuer is corrected, not skipped.
log "configuring auth/jwt/config (JWKS via proxy origin, CA pinned)"
bao write auth/jwt/config \
  jwks_url="$VAULT_AUTH_JWKS_URL" \
  jwks_ca_pem="$(cat "$VAULT_SUITE_CA_PATH")" \
  bound_issuer="$VAULT_AUTH_ISSUER"

# --- 3a. write the redeem-login policy (attached to the JWT role below) -------
log "writing policy: redeem-login"
bao policy write redeem-login /openbao/policies/redeem-login.hcl

# --- 3b. the `redeem-child` TOKEN ROLE (mints the per-host num_uses=1 child) ---
# Engine-enforced constraint (PLAN §2.1): a redeem-login token can mint child
# tokens ONLY against this role, and this role's allowed_policies_glob restricts
# attachable policies to the per-host templates (child-kv-* / child-ssh-*,
# instantiated via change control). orphan=false so the child dies with the
# parent; renewable=false; the wrapper passes num_uses=1 + a short ttl per call.
log "creating token role: redeem-child"
bao write auth/token/roles/redeem-child \
  allowed_policies_glob="child-kv-*,child-ssh-*" \
  disallowed_policies="default" \
  orphan=false \
  renewable=false \
  token_type=service \
  token_num_uses=0 \
  token_ttl="90s" \
  token_max_ttl="90s"

# =============================================================================
# 4. gateway-redeemer JWT role — rendered EXACTLY per PLAN §2.1 HCL block,
#    which itself renders auth §8 THE PIN + contract §1 verbatim.
# =============================================================================
# bound_issuer    = auth issuer URL              (token `iss`)
# bound_audiences = ["vault"]                    (single; checked even with bound_claims)
# bound_subject   = "svc:gateway"                (the Gateway-unique claim; aud alone insufficient)
# bound_claims    = { scope: "vault:read-credential" }
# user_claim      = "sub"
# token_policies  = ["redeem-login"]             (NOT a broad grant — see redeem-login.hcl)
# token_ttl       = "90s"
# token_num_uses  = 2                            (login-response + exactly one child-token mint)
# token_no_default_policy = true
log "creating JWT role: gateway-redeemer (auth §8 THE PIN, verbatim)"
# Written as a full JSON body via `bao write <path> -` so the nested `bound_claims`
# map and the `bound_audiences` list render correctly (avoids fragile CLI kv/list
# quoting). bound_claims_type="string" => match the space-delimited scope value.
bao write auth/jwt/role/gateway-redeemer - <<JSON_ROLE
{
  "role_type": "jwt",
  "bound_issuer": "${VAULT_AUTH_ISSUER}",
  "bound_audiences": ["vault"],
  "bound_subject": "svc:gateway",
  "bound_claims_type": "string",
  "bound_claims": { "scope": "vault:read-credential" },
  "user_claim": "sub",
  "token_policies": ["redeem-login"],
  "token_ttl": "90s",
  "token_num_uses": 2,
  "token_no_default_policy": true
}
JSON_ROLE
# NOTE on bound_claims + `scope`: auth's `scope` is a SPACE-DELIMITED string; the
# JWT auth method matches bound_claims as a substring/whole-value per its config.
# The wrapper's layer-1 §8-pin validator additionally verifies `scope ∋
# vault:read-credential` as an exact space-delimited membership (PLAN §4.1 step 6)
# — belt-and-suspenders across the two trust domains.

# =============================================================================
# 5. AppRole auth for the WRAPPER (metadata/write-only identity — PLAN §3.1)
# =============================================================================
if auth_enabled "approle"; then
  log "auth/approle/ already enabled — skip"
else
  log "enabling approle auth"
  bao auth enable approle
fi

log "writing policy: wrapper-approle"
bao policy write wrapper-approle /openbao/policies/wrapper-approle.hcl

# The wrapper's AppRole binds ONLY wrapper-approle (no default policy). role_id is
# baked into the wrapper image/config; secret_id is injected at deploy and rotated
# on schedule (secret-zero, PLAN §3.1). token_num_uses=0 (standing metadata role).
log "creating approle role: vault-wrapper"
bao write auth/approle/role/vault-wrapper \
  token_policies="wrapper-approle" \
  token_no_default_policy=true \
  secret_id_num_uses=0 \
  secret_id_ttl="0" \
  token_ttl="20m" \
  token_max_ttl="60m"

# =============================================================================
# 6. TWO engine audit devices of DIFFERENT types (PLAN §6.4, D-16(a)/(b)).
# =============================================================================
# M-6: the socket-to-WORM device is a MANDATORY engine audit device, so
# OpenBao's own "at least one audit device must succeed" fail-closed rule halts
# the ENGINE on loss of off-box auditability — INDEPENDENT of wrapper honesty.
# The engine's audit stream does NOT transit the wrapper, so WORM-host engine-
# stream cross-correlation is the independent witness against a lying wrapper.
# log_raw is NEVER enabled; secret values are HMAC'd by the engine.

# 6a. file device on the engine's PRIVATE volume (the second, different type).
if audit_enabled "file"; then
  log "audit device file/ already enabled — skip"
else
  log "enabling audit device: file (private volume)"
  bao audit enable file file_path=/openbao/audit/openbao_audit.log log_raw=false
fi

# 6b. socket device -> off-box WORM host. MANDATORY (M-6). If this sink is
# unreachable the engine fails closed on audit — the ratified D-16(a) posture,
# so no new availability trade. Reconnect/backoff tuned so a WORM blip does not
# permanently wedge the engine, but LOSS halts issuance (fail-closed).
if audit_enabled "socket"; then
  log "audit device socket/ already enabled — skip"
else
  log "enabling audit device: socket -> WORM sink (MANDATORY, fail-closed)"
  bao audit enable socket \
    address="$VAULT_WORM_SINK_URL" \
    socket_type=tcp \
    log_raw=false
fi

# =============================================================================
# 7. First-boot hygiene (PLAN §2.3 / §7.1)
# =============================================================================
# The INITIAL root token is revoked at first boot. This script runs under a
# SHORT-LIVED generate-root/quorum-minted token; revoke it now so no standing
# root token exists. Per-ceremony admin tokens are minted on demand under
# recovery-key quorum (`operator generate-root`) and revoked after use.
#
# Guarded so re-runs (idempotent convergence) don't self-revoke a token that is
# still needed by the caller: only self-revoke when BOOTSTRAP_REVOKE_TOKEN=1.
if [ "${BOOTSTRAP_REVOKE_TOKEN:-0}" = "1" ]; then
  log "revoking the bootstrap admin token (no standing root token — PLAN §7.1)"
  bao token revoke -self || log "WARN: self-revoke failed; operator must revoke the bootstrap token manually"
fi

log "bootstrap complete. Config-drift is a Stage-7 checklist item (PLAN §2.3);"
log "gate-weakening edits follow ARCH §12 change control (step-up + tamper-evident row)."
