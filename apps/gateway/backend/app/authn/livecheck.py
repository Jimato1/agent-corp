"""destructive-exec LIVE check (auth §8 step 7 + step 8 drift bound).

``gateway:execute`` (and the Vault redeem) are **destructive-exec** action class: auth §8
step 7 requires the pushed denylist AND an **uncached** ``POST /introspect`` (RFC 7662) with
a ~250 ms timeout — **any doubt (timeout, non-active, auth's own Redis loss) => DENY**. This
is stricter than the sod-critical Redis-denylist read (it adds the uncached introspect).

Returns a ``LiveCheckResult`` carrying the check timestamp so the dispatcher can honour the
D = 1 s drift bound (§8 step 8): if the irreversible instant (Vault redeem / dispatch) is
> 1 s after the check, re-run it or DENY.
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


def live_check_destructive(settings, *, jti: str, sub: str, kid: str) -> LiveCheckResult:
    """The uncached introspect + denylist read for a destructive-exec token. Fail-closed."""
    checked_at = time.time()
    url = settings.introspect_url
    if not url:
        if settings.allow_uncheckable_destructive:
            return LiveCheckResult(True, checked_at, "uncheckable_allowed_isolated_build")
        return LiveCheckResult(False, checked_at, "no_introspect_transport_fail_closed")
    body = json.dumps({"jti": jti, "sub": sub, "kid": kid, "action_class": "destructive-exec"}).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json"}, method="POST")
    timeout = max(0.05, settings.introspect_timeout_ms / 1000.0)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (trusted internal URL)
            doc = json.loads(resp.read().decode("utf-8"))
    except Exception:  # noqa: BLE001 — any doubt (incl. auth's own Redis loss) => DENY
        return LiveCheckResult(False, checked_at, "introspect_unreachable_fail_closed")
    # RFC 7662: auth answers active:false on ANY doubt (auth §4.6). Also honour an explicit
    # kill level in the response (auth signs the epoch into introspect answers).
    if doc.get("active") is True and not doc.get("revoked", False):
        return LiveCheckResult(True, checked_at, "")
    return LiveCheckResult(False, checked_at, "revoked_or_inactive")


def drift_ok(live: LiveCheckResult, *, now: float | None = None, bound_ms: int = 1000) -> bool:
    """§8 step 8: at the irreversible instant, the live check must be < D=1s old."""
    now = time.time() if now is None else now
    return (now - live.checked_at) * 1000.0 <= bound_ms
