# =============================================================================
# signrole.example.hcl — EXAMPLE per-host SSH-CA sign-role (gateway-<host_id>)
# =============================================================================
# Implements VERBATIM:  contract vault-gateway-redemption.md §2 (SSH-CA
#           build-failing invariants) + PLAN §3.3 (sign role) + §2.3 (B-2
#           change-control) + §3.1 (wrapper has explicit DENY on ssh/roles/*).
#
# ⚠ THIS IS AN EXAMPLE, NOT APPLIED BY bootstrap.sh. A per-host sign-role is a
# GATE-DEFINING artifact (it bounds allowed_users / valid_principals /
# allow_empty_principals). It is created ONLY via the operator CHANGE-CONTROL
# PATH — a short-lived generate-root/quorum token + operator STEP-UP re-auth +
# a TAMPER-EVIDENT audit row (ARCH §12, PLAN §2.3). It is NEVER created by the
# wrapper's standing AppRole (which has an explicit DENY on ssh/roles/* — B-2).
# The UI host-onboarding flow only STAGES a proposed role record; an operator
# step-up applies it through this path.
#
# CONTINUOUS INVARIANT CHECK (PLAN §2.3, not just Stage-7 drift): an alarm fires
# on ANY ssh/roles write seen in the OpenBao audit stream, and on ANY role
# carrying a wildcard (`*`/`+`) principal, `root`/wildcard allowed_users, or
# allow_empty_principals=true. Every field below is chosen to pass that check.
#
# BUILD-FAILING INVARIANTS this example satisfies (contract §2):
#   * allow_empty_principals = false           (CVE-2024-7594; pinned >= 2.0.2)
#   * valid_principals: NON-EMPTY, ticket-templated, server-derived — NEVER from
#     free request input. Bounded by allowed_users (pinned, no wildcard).
#   * key_id = <ticket_id>  (host auth-log correlation) — achieved via
#     key_id_format below + the wrapper setting the child token's display_name
#     to the ticket_id (PLAN §3.3; the sign endpoint has no direct key_id param).
#   * TTL ~10m (band 5-15, sized to one run — VAULT_SSH_CERT_TTL).
#   * NO wildcards anywhere.
# =============================================================================

# ---- Applied via the change-control path (operator step-up), e.g.: -----------
#
#   bao write ssh/roles/gateway-nas-01 - <<'EOF'
#   {
#     "key_type": "ca",
#     "allow_user_certificates": true,
#     "allow_host_certificates": false,
#
#     # PINNED principal set — the single service/login user this host permits.
#     # NEVER "root"+wildcard; NEVER "*". The wrapper passes valid_principals at
#     # sign time DERIVED server-side from the handle's registered principal and
#     # bounded to this set. allowed_users_template=false => no request templating.
#     "allowed_users": "svc-deploy",
#     "allowed_users_template": false,
#     "default_user": "",
#
#     # CVE-2024-7594 — MUST be false. A cert with empty principals authenticates
#     # as ANY user on the host. The continuous invariant check alarms on true.
#     "allow_empty_principals": false,
#
#     # key_id = <ticket_id> for host-auth-log correlation (contract §2). The
#     # wrapper mints the per-host child token with display_name = <ticket_id>,
#     # so this format yields key_id = "<ticket_id>".
#     "key_id_format": "{{token_display_name}}",
#
#     # One-run cert lifetime (band 5-15 min). Enforced/monitored NTP is a hard
#     # fleet precondition — clock skew silently extends validity (PLAN §3.3).
#     "ttl": "10m",
#     "max_ttl": "15m",
#
#     # Minimal extensions; no port-forwarding / agent-forwarding by default.
#     "default_extensions": { "permit-pty": "" },
#     "allowed_extensions": "permit-pty"
#   }
#   EOF
#
# ------------------------------------------------------------------------------
# HCL representation of the same role parameters (for review/diff before the
# operator step-up confirm — the UI renders this diff, PLAN §8 item 6):
# ------------------------------------------------------------------------------

key_type                = "ca"
allow_user_certificates = true
allow_host_certificates = false

allowed_users          = "svc-deploy"   # PINNED, no wildcard, not root
allowed_users_template = false
default_user           = ""             # EMPTY — principals are explicit, never defaulted

allow_empty_principals = false          # CVE-2024-7594 — build-failing if true

key_id_format          = "{{token_display_name}}"   # => key_id = <ticket_id> (contract §2)

ttl     = "10m"                         # one-run lifetime (VAULT_SSH_CERT_TTL; band 5-15)
max_ttl = "15m"

default_extensions = {
  permit-pty = ""
}
allowed_extensions = "permit-pty"
