# =============================================================================
# redeem-login.hcl — the policy attached to the `gateway-redeemer` JWT role
# =============================================================================
# Attached to:  the OpenBao JWT auth role `gateway-redeemer` (PLAN §2.1 HCL block;
#               token_policies = ["redeem-login"], token_no_default_policy = true).
# Implements VERBATIM:  PLAN §2.1 (the login yields ONLY the right to mint ONE
#               per-host child token — NOT a broad read/sign grant).
#
# WHY THIS IS NOT A BROAD GRANT (the load-bearing point):
# The §8 pin forbids any host/ticket claim in the Gateway JWT, so the engine
# CANNOT bind a login to the approved host from the token alone (PLAN §2.1 B-1).
# Therefore the login token itself grants NOTHING on kv/ssh directly. Its ONE
# capability is to mint a single CHILD token, whose policy the wrapper templates
# per request — from the D-4-verified host_id — to EXACTLY:
#     read   on kv/data/hosts/<host_id>/*        (child-token-kv.hcl.tmpl)   OR
#     update on ssh/sign/gateway-<host_id>       (child-token-ssh.hcl.tmpl)
# (whichever the handle kind needs — NEVER both), with num_uses = 1.
# The per-host num_uses=1 + short TTL child token IS the real layer-2 bound
# (engine host-scoping is unattainable from the token — PLAN §2.1 / §10.2).
#
# MECHANISM (engine-enforced, keeps a compromised login token from escalating):
# The child token is minted against the token ROLE `redeem-child` (created in
# bootstrap.sh), whose `allowed_policies_glob` restricts attachable policies to
# `child-kv-*` / `child-ssh-*` — the per-host policies instantiated from the two
# templates via the change-control path (like ssh/roles, B-2). This policy grants
# create ONLY on `auth/token/create/redeem-child`; it does NOT grant
# `auth/token/create` (the generic path, which could attach arbitrary policies
# up to the parent set) and it carries NO kv/ssh capability of its own.
# =============================================================================

# ONLY capability: mint one child token via the constrained `redeem-child` role.
# The wrapper passes: policies=["child-kv-<host_id>"] OR ["child-ssh-<host_id>"],
# num_uses=1, a short explicit ttl (bounded by the 90s login token_ttl), and
# display_name=<ticket_id> (so the SSH role's key_id_format yields key_id=<ticket_id>,
# contract §2 / signrole.example.hcl). num_uses=1 is set ON THE TOKEN at create
# time, not in the policy.
path "auth/token/create/redeem-child" {
  capabilities = ["create", "update"]
}

# Nothing else. No kv read, no ssh sign, no sys/*, no identity/*. If the login
# token leaks, it can mint at most one child token constrained to a single host's
# single-use read OR sign — and only while its 90s TTL / 2 uses last (PLAN §2.1).
