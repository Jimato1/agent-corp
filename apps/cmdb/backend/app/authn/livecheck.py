"""sod-critical LIVE revocation check (auth §8 step 7; PLAN §6.1, A11 seam).

For a ``cmdb:write-policy`` (sod-critical) token, auth §8 requires an **authoritative
denylist read** (``jti`` + ``sub`` + ``kid`` + kill level), fail-closed, never cached.
DEPLOYMENT §3 makes auth's Redis auth-private, so CMDB reaches the authoritative check
behind a transport seam — an **auth-exposed check API** (root-review-#2 / S5 Option B).
This module IS that seam:

* ``revocation_check_url`` set → POST the token facts, DENY on non-``active`` / any error /
  timeout (fail-closed).
* not set → the sod-critical path is UNCHECKABLE. It fails CLOSED unless
  ``allow_uncheckable_sodcritical`` is explicitly set for an isolated build (documented,
  never true in production).

Returns a ``LiveCheckResult`` carrying the check timestamp so the confirm path can honour
the D = 1 s drift bound (§8 step 8): if the irreversible commit happens > 1 s after the
check, the caller re-runs it or denies.
"""
from __future__ import annotations

import json
import time
import urllib.request
from dataclasses import dataclass


@dataclass(frozen=True)
class LiveCheckResult:
    ok: bool
    checked_at: float
    reason: str = ""


def live_check_sod_critical(settings, *, jti: str, sub: str, kid: str) -> LiveCheckResult:
    checked_at = time.time()
    url = settings.revocation_check_url
    if not url:
        if settings.allow_uncheckable_sodcritical:
            return LiveCheckResult(True, checked_at, "uncheckable_allowed_isolated_build")
        return LiveCheckResult(False, checked_at, "no_live_check_transport_fail_closed")
    body = json.dumps({"jti": jti, "sub": sub, "kid": kid, "action_class": "sod-critical"}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(req, timeout=0.25) as resp:  # noqa: S310 (trusted internal URL)
            doc = json.loads(resp.read().decode("utf-8"))
    except Exception:  # noqa: BLE001 — any doubt (incl. auth's own Redis loss) => DENY
        return LiveCheckResult(False, checked_at, "live_check_unreachable_fail_closed")
    if doc.get("active") is True and not doc.get("revoked", False):
        return LiveCheckResult(True, checked_at, "")
    return LiveCheckResult(False, checked_at, "revoked_or_inactive")
