"""Time helpers. The Gateway evaluates cert/verdict expiry on its OWN clock under enforced
NTP (vault-gateway-redemption.md §2; cmdb-gateway-verdict-token.md §4 step 4 zero-skew)."""
from __future__ import annotations

from datetime import datetime, timezone

_UTC = timezone.utc


def now_dt() -> datetime:
    return datetime.now(_UTC)


def now_iso() -> str:
    return now_dt().isoformat().replace("+00:00", "Z")


def now_epoch() -> int:
    return int(now_dt().timestamp())


def epoch_of(iso: str) -> int:
    return int(datetime.fromisoformat(iso.replace("Z", "+00:00")).timestamp())
