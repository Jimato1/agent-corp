# =============================================================================
# deny-all-nonredeem.hcl — belt-and-suspenders total deny
# =============================================================================
# Implements VERBATIM:  PLAN §2.1 (last bullet) — "the belt-and-suspenders
#               explicit deny stanza on kv/*, ssh/*, sys/*, identity/* attached
#               to any future non-redeem role."
#
# ATTACH THIS to any non-redeem engine role that might ever be created (e.g. a
# future read-only auditor login). It is deny-by-default made EXPLICIT and total.
#
# AGENTS GET NO ENGINE IDENTITY AT ALL (PLAN §2.1 / §3.5 / §10 axis 3): they
# never authenticate to the engine, no role maps them, and there is no token
# they can present. This stanza is NOT how agents are kept out — that is
# structural (no identity exists). This is the additional explicit floor so that
# if any non-redeem role is ever added, it starts from total denial and must be
# widened deliberately, never inheriting an accidental default grant.
#
# The one legitimate credential path — the Gateway's per-host num_uses=1 child
# token — is granted through `redeem-login` -> `redeem-child`, NOT here. This
# policy is never attached to `gateway-redeemer` or the wrapper AppRole.
# =============================================================================

path "kv/*" {
  capabilities = ["deny"]
}

path "ssh/*" {
  capabilities = ["deny"]
}

path "sys/*" {
  capabilities = ["deny"]
}

path "identity/*" {
  capabilities = ["deny"]
}
