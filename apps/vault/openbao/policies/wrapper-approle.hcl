# =============================================================================
# wrapper-approle.hcl — the WRAPPER's engine identity policy (auth/approle)
# =============================================================================
# Attached to:  the wrapper's AppRole (secret-zero: role_id baked, secret_id
#               injected at deploy, rotated on schedule — PLAN §3.1).
# Implements VERBATIM:  PLAN §3.1 (mounts/identities — the wrapper AppRole row),
#               §2.1 (two-layer model), §2.3 (B-2 change-control of ssh/roles).
#
# THE WRAPPER IS A STRUCTURAL PLAINTEXT MITM ON EVERY REDEMPTION BY DESIGN
# (PLAN §10 axis 2 / M-1), but its STANDING engine identity is metadata/write-
# ONLY. It CANNOT read credential values and CANNOT sign SSH certs with this
# policy. During a redemption the wrapper reads/signs using the GATEWAY's OWN
# JWT (auth/jwt/login -> per-host num_uses=1 child token, PLAN §2.1), NOT this
# AppRole. This policy is what a compromised wrapper is limited to AT REST.
#
# ACL precedence reminder (OpenBao/Vault): the MOST SPECIFIC matching path
# governs. `kv/data/hosts/*` (create/update) is more specific than the general
# `kv/data/*` deny, so rotation writes land while READ is granted NOWHERE and
# explicitly DENIED on the general path.
# =============================================================================

# --- Rotation writes: create/update new KV v2 versions for host secrets. ------
# NO read, NO delete. Rotation writes are a write-only path (PLAN §3.1/§3.4).
path "kv/data/hosts/*" {
  capabilities = ["create", "update"]
}

# --- Handle projection: read/list KV v2 METADATA only (never the data). -------
# The wrapper rebuilds its handle table (rebuildable projection, PLAN §5.3) from
# metadata. Metadata carries version markers/timestamps, NOT secret values.
path "kv/metadata/*" {
  capabilities = ["read", "list"]
}

# --- EXPLICIT DENY: credential-value READ. ------------------------------------
# Belt-and-suspenders. Read is granted nowhere above; this makes the denial
# explicit and total for every kv/data path not overridden to write-only above.
# A compromised wrapper CANNOT read stored plaintext with its standing identity.
path "kv/data/*" {
  capabilities = ["deny"]
}

# --- EXPLICIT DENY: SSH signing. ----------------------------------------------
# The wrapper never signs with its standing identity; SSH signing happens ONLY
# through the Gateway's per-host num_uses=1 child token (PLAN §2.1).
path "ssh/sign/*" {
  capabilities = ["deny"]
}

# --- EXPLICIT DENY: SSH ROLES (write INCLUDED).  B-2. -------------------------
# THE WRAPPER HOLDS NO RUNTIME WRITE TO ssh/roles (PLAN §2.3 / §3.1 / §3.5).
# A per-host sign-role is a GATE-DEFINING artifact (it bounds valid_principals,
# allowed_users, allow_empty_principals). If the wrapper could rewrite a role it
# could add `+root` / allow_empty_principals=true then sign a root cert on the
# next redemption — collapsing the two trust domains into one. Role edits go
# ONLY through the operator change-control path (bootstrap under a generate-root/
# quorum token + step-up + tamper-evident row — PLAN §2.3, signrole.example.hcl).
path "ssh/roles/*" {
  capabilities = ["deny"]
}

# --- EXPLICIT DENY: response wrapping. ----------------------------------------
# Response wrapping is NOT used as an access-control primitive (contract §1;
# PLAN §4.6). `sys/wrapping/*` is unused and denied to every role so no bearer
# wrap token can ever be minted from this identity.
path "sys/wrapping/*" {
  capabilities = ["deny"]
}
