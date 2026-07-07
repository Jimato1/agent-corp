# =============================================================================
# unsealer.hcl — the MINIMAL second OpenBao  (sidecar: vault_unsealer)
# =============================================================================
# App:      vault (Critical-infra)  |  Engine: OpenBao 2.5.x, pinned >= 2.5.5 (D-14)
# Implements VERBATIM:  PLAN §7.1 (seal chain — Transit auto-unseal source),
#           §1 (component table: vault_unsealer, Transit engine only, one wrapped
#           unseal key, file storage, its own Shamir seal).
# DEPLOYMENT: §3a (vault_unsealer sidecar, data_vault ONLY, internal 8200, no host ports).
#
# WHAT THIS HOLDS:  NO suite secrets. Its entire job is to hold the ONE Transit
# key that wraps the main engine's unseal key (PLAN §1 / §7.1). It is deliberately
# the smallest possible OpenBao — one secrets engine (Transit), one key. Losing
# it is recoverable (its file store is tiny and quiesced-backupable, PLAN §7.3),
# but a TORN unsealer backup is permanent fleet-wide credential loss, so the
# Stage-7 drill includes an unsealer-restore leg (PLAN §7.1).
#
# SEAL:  this engine uses its OWN Shamir seal (3-of-5, offline-escrowed shares,
# distinct envelopes from the main engine's recovery keys — PLAN §7.1). There is
# NO `seal` stanza below: absence of a seal stanza == Shamir. This is the ONE
# place in the seal chain an operator physically unseals at cold start.
# NEVER a Static-Key seal anywhere (PLAN §7.1).
# =============================================================================

ui = false

# disable_mlock = true — containerized; swap disabled at host/compose layer.
disable_mlock = true

# -----------------------------------------------------------------------------
# Storage — FILE (not raft). Tiny, changes only on unseal-key rotation, so its
# backup is a quiesced file-level copy (PLAN §7.3).
# -----------------------------------------------------------------------------
storage "file" {
  path = "/openbao/data"
}

api_addr = "https://vault_unsealer:8200"

# -----------------------------------------------------------------------------
# Listener — TLS on data_vault.
# -----------------------------------------------------------------------------
# The main engine (vault_openbao) connects here as a Transit CLIENT, presenting
# the orphan+periodic seal token (M-7) for AuthN. Server-side TLS protects the
# unseal-key wrapping/unwrapping traffic on data_vault.
#
# Client-cert mTLS is OPTIONAL hardening here and can be enabled by adding
#   tls_require_and_verify_client_cert = true
#   tls_client_ca_file                 = "/openbao/tls/suite-ca.pem"
# (the main engine would then present its client cert in addition to the seal
# token). Kept to server-auth TLS by default to match "a TLS listener" (PLAN §1);
# the seal token is the AuthN primitive.
#
# data_vault-ONLY: like the main engine, this container joins data_vault only
# (DEPLOYMENT §3a); 0.0.0.0 resolves to the data_vault interface exclusively.
listener "tcp" {
  address         = "0.0.0.0:8200"
  tls_cert_file   = "/openbao/tls/unsealer.crt"   # issued by the suite-internal offline CA (PLAN §7.1 M-7)
  tls_key_file    = "/openbao/tls/unsealer.key"
  tls_min_version = "tls13"
}

# -----------------------------------------------------------------------------
# The Transit engine + the single unseal key are RUNTIME mounts (a config file
# cannot enable a secrets engine). They are provisioned once, at unsealer init,
# after the operator Shamir-unseals this engine:
#
#   bao secrets enable transit                       # (idempotent: check `bao secrets list`)
#   bao write -f transit/keys/vault-unseal type=aes256-gcm96 exportable=false allow_plaintext_backup=false
#   # then mint the main engine's seal token — ORPHAN + PERIODIC, encrypt/decrypt
#   # on THIS key only (M-7), attached to a policy granting exactly:
#   #   path "transit/encrypt/vault-unseal" { capabilities = ["update"] }
#   #   path "transit/decrypt/vault-unseal" { capabilities = ["update"] }
#   # and NOTHING else. That token is what VAULT_TRANSIT_SEAL_TOKEN carries.
#
# This block is documentation of the one-time setup; it is NOT executed by this
# config file. See README.md "Init order".
# -----------------------------------------------------------------------------
