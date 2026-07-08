"""Check 3 — Vault credential redemption (vault-gateway-redemption.md; D-4).

The Gateway is the SOLE redeemer. It reads the powerless ``release_id`` off the ticket
(agent-written; non-redeemable everywhere except Vault's redeem endpoint), generates an
**ephemeral per-run keypair**, and redeems over the ``creds``-mTLS hop with the ``svc:gateway``
holder token whose ``cnf`` on this hop is **mTLS x5t#S256** (§13). Vault **independently
re-verifies the Board approval** (D-4) — so the Gateway MUST expect and handle Vault's 403/503
denials, never assume redeem succeeds.

``interpret_redeem`` is the pure decision: a denial/outage/expired release is CREDENTIAL_DENIED
(report ``executing → failed(reason=credential_denied)`` + escalate). **No plaintext ever
exists outside the redeeming process; nothing credential-shaped is returned to any agent or
written to any log — handle + HMAC only.**
"""
from __future__ import annotations

from . import CREDENTIAL_DENIED, HardReject


class VaultResult:
    """What a successful redeem yields the Gateway (a handle + a short-TTL SSH cert reference).

    The plaintext cert/key lives ONLY in the redeeming process's memory for the run; this
    object exposes the powerless ``handle`` + lease id for the audit record and revoke path.
    """

    def __init__(self, handle: str, lease_id: str, cert_ttl_s: int) -> None:
        self.handle = handle          # cred://hosts/<host_id>/<name> — powerless URI, safe to log
        self.lease_id = lease_id
        self.cert_ttl_s = cert_ttl_s


def interpret_redeem(status: int, body: dict | None) -> VaultResult:
    """Map a Vault redeem HTTP result to a VaultResult or a hard reject.

    ANY non-2xx (esp. Vault's D-4 403 on a not-yet-consumed/mismatched approval, or a 503
    seal/outage) → CREDENTIAL_DENIED. A denied redemption is a first-class exfiltration signal
    (contract §3: agent token → redeem → 403, always) — logged + escalated by the caller.
    """
    if status in (403, 401):
        raise HardReject(CREDENTIAL_DENIED,
                         f"Vault refused redemption (status {status}) — D-4 approval re-verify failed",
                         burned_approval=True)
    if status == 503 or status >= 500:
        raise HardReject(CREDENTIAL_DENIED,
                         f"Vault unreachable/sealed (status {status}) — fail closed",
                         burned_approval=True)
    if status < 200 or status >= 300 or not body:
        raise HardReject(CREDENTIAL_DENIED, f"Vault redeem returned unusable response (status {status})",
                         burned_approval=True)
    handle = body.get("handle")
    lease_id = body.get("lease_id")
    if not handle or not lease_id:
        raise HardReject(CREDENTIAL_DENIED, "Vault redeem response missing handle/lease", burned_approval=True)
    # Defensive: the wrapper must never return plaintext-shaped material to us in the body.
    for forbidden in ("private_key", "signed_key", "ssh_private", "certificate_key", "plaintext"):
        if forbidden in body:
            raise HardReject(CREDENTIAL_DENIED,
                             "Vault body contained plaintext-shaped material — refusing (data-hygiene)",
                             burned_approval=True)
    return VaultResult(handle=str(handle), lease_id=str(lease_id), cert_ttl_s=int(body.get("cert_ttl_s", 600)))
