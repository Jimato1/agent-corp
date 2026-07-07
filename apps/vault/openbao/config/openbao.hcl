# =============================================================================
# openbao.hcl — main OpenBao ENGINE server config  (sidecar: vault_openbao)
# =============================================================================
# App:      vault (Critical-infra)  |  Engine: OpenBao 2.5.x, pinned >= 2.5.5
# Ratified: D-14 (adopt OpenBao 2.5.x; NEVER the 2.6.0 beta)
# Implements VERBATIM:  PLAN §2 (deployment + two-layer model), §2.2 (engine
#           network topology / listener binding), §7.1 (seal chain: Transit
#           auto-unseal via vault_unsealer + recovery keys).
# DEPLOYMENT: §1 (data_vault network), §3a (vault_openbao sidecar, data_vault
#           ONLY, internal 8200, no host ports, edge-unreachable).
#
# This engine is the crypto/storage/leasing/audit barrier. It is the SECOND,
# INDEPENDENT enforcement layer behind the wrapper (PLAN §2.1): its deny-by-
# default ACL + JWT auth method re-validate the Gateway's OWN token against
# auth's JWKS before any credential path is readable. Layer-2 independence is
# the whole point — this config must be correct on its own, not "because the
# wrapper also checks."
# =============================================================================

# ui = false — this engine has NO human surface. The rich operator UI is the
# thin wrapper app (PLAN §1/§8), never OpenBao's built-in UI. Reducing the
# pre-auth HTTP surface on the highest-value listener in the suite (§10 axis 7).
ui = false

# disable_mlock = true — REQUIRED with integrated raft storage (raft mmaps its
# store; mlock + mmap interact badly) and standard for containerized OpenBao.
# The container instead runs with swap disabled at the host/compose layer.
# Secret material never touches swap because swap is off, not because mlock is on.
disable_mlock = true

# -----------------------------------------------------------------------------
# Storage — integrated raft, SINGLE NODE.
# -----------------------------------------------------------------------------
# Chosen (PLAN §7.3) specifically so `bao operator raft snapshot save` is the
# canonical backup mechanism for the CANONICAL-special-regime secret store.
# Single node: this is a homelab credential store, not an HA cluster; the raft
# snapshot is the DR primitive, not multi-node replication.
storage "raft" {
  path    = "/openbao/data"
  node_id = "vault_openbao_1"
}

# api_addr / cluster_addr — pinned to the engine's data_vault DNS alias
# (PLAN §2.2 M-8 wrapper->engine path pinning). Raft cluster traffic (8201)
# and API traffic (8200) both stay on data_vault; there is NO edge alias.
api_addr     = "https://vault_openbao:8200"
cluster_addr = "https://vault_openbao:8201"

# -----------------------------------------------------------------------------
# Listener — TCP with MUTUAL TLS, bound to the data_vault interface.
# -----------------------------------------------------------------------------
# BUILD-FAILING INVARIANT (PLAN §2.2 / §3.5 caveat 5 / DEPLOYMENT §1):
#   * This container joins `data_vault` ONLY (DEPLOYMENT §3a). It has NO `edge`
#     and NO `creds` interface. A TCP connect from any edge-only container MUST
#     get CONNECTION-REFUSED (not a TLS handshake). Stage-5/7 regression test.
#   * ONLY the wrapper holds a client cert chaining to the suite-internal CA
#     (PLAN §7.1 M-7). The Gateway has NO route here and NO client cert — its
#     JWT is usable only THROUGH the wrapper's redeem endpoint, so the D-4
#     checks cannot be sidestepped by a raw backend read.
#
# tls_require_and_verify_client_cert = true  ==> no valid client cert, no
# handshake. This is the network-placement half of the mTLS requirement
# ARCHITECTURE §11 makes independent of layer-7 auth.
#
# NOTE on `address`: the container is attached to data_vault ONLY, so 0.0.0.0
# resolves to the data_vault interface exclusively (there is no other NIC to
# bind). For defense-in-depth the compose owner MAY pin an explicit IPAM
# ipv4_address for this container and change `address` to "<that-ip>:8200";
# either way the edge-unreachable invariant above is what is tested, not the
# literal bind string.
listener "tcp" {
  address       = "0.0.0.0:8200"
  tls_cert_file = "/openbao/tls/openbao.crt"   # server cert, issued by the suite-internal offline CA (PLAN §7.1 M-7)
  tls_key_file  = "/openbao/tls/openbao.key"

  # mTLS — mandatory. Only the wrapper's client cert chains to this CA.
  tls_require_and_verify_client_cert = true
  tls_client_ca_file                 = "/openbao/tls/suite-ca.pem"

  tls_min_version = "tls13"

  # log_raw is a per-audit-device option and is NEVER enabled (see bootstrap.sh
  # M-6 comment). The raw/unauthenticated introspection endpoints stay disabled
  # (defaults). No cleartext request/response logging anywhere in this engine.
}

# -----------------------------------------------------------------------------
# Seal — Transit AUTO-UNSEAL against the vault_unsealer sidecar (D-16(c)).
# -----------------------------------------------------------------------------
# PLAN §7.1: unattended container/engine restarts for the credential store; a
# FULL-HOST cold start still requires an operator to Shamir-unseal the unsealer
# first (3-of-5), THEN this engine auto-unseals against it. Recovery keys for
# THIS engine are 3-of-5, escrowed offline — they are authorization material,
# NOT unseal keys (they cannot unseal if the unsealer is gone; stated in README).
#
# M-7 — the seal-stanza Transit token is ORPHAN + PERIODIC (non-expiring or
# explicitly renewed), scoped to ENCRYPT/DECRYPT on the ONE unseal key only.
# Its TTL/renewal is a stated custody line (PLAN §7.2) and its remaining TTL is
# surfaced on the operator status panel (PLAN §8.5) so silent expiry cannot
# surface only at the next restart.
#
# `address` and `token` are injected VIA ENV, never written here:
#   BAO_TRANSIT_SEAL_ADDRESS / VAULT_TRANSIT_SEAL_ADDRESS = https://vault_unsealer:8200 (data_vault alias)
#   BAO_TRANSIT_SEAL_TOKEN   / VAULT_TRANSIT_SEAL_TOKEN   = <orphan+periodic encrypt/decrypt-only token>
# The token is a secret (offline custody, §7.2) — it MUST NOT appear in this
# file or in any committed env template. Only the non-secret key_name/mount_path
# and the CA path live here.
seal "transit" {
  # address = injected via env (VAULT_TRANSIT_SEAL_ADDRESS) — points at vault_unsealer on data_vault
  # token   = injected via env (VAULT_TRANSIT_SEAL_TOKEN)   — orphan+periodic, encrypt/decrypt on key_name only (M-7)
  key_name        = "vault-unseal"
  mount_path      = "transit/"
  disable_renewal = "false"                    # periodic token is renewed (M-7); do NOT disable renewal

  # TLS to the unsealer (data_vault). CA is the suite-internal offline CA (M-7).
  tls_ca_cert     = "/openbao/tls/suite-ca.pem"
  tls_skip_verify = "false"
}

# Telemetry left minimal/off here; the operator status panel reads seal state,
# unsealer health, and seal-token remaining TTL through the wrapper (PLAN §8.5),
# not from a scrape endpoint exposed off data_vault.
