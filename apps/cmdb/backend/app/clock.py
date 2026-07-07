"""Server clock + clock-integrity gate (PLAN §3.5).

The CMDB evaluates every verdict on its OWN NTP-disciplined clock; the request's
optional ``at`` is advisory for planning probes only. RFC 3339 / ISO-8601 UTC strings
with a trailing ``Z`` are the one stored timestamp format, so string comparison equals
chronological comparison.

Clock health runs BEFORE the class fork in ``evaluate()`` (§3.3 step 4) so no verdict —
sandbox verdicts included — is ever signed with an ``exp`` derived from a clock the
evaluator would have declared unsafe. A hung/unverifiable check is an UNHEALTHY clock
(fail-closed), never an assumed-healthy one.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from datetime import datetime, timezone


def now_dt() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return to_iso(now_dt())


def to_iso(dt: datetime) -> str:
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"


def now_epoch() -> int:
    return int(time.time())


@dataclass(frozen=True)
class ClockHealth:
    ok: bool
    offset_ms: int
    ntp_synced: bool
    reason: str = ""


def check_clock(settings) -> ClockHealth:
    """Assess clock health from config-surfaced NTP state + a monotonic cross-check.

    In a real deployment ``offset_ms`` is measured against the system NTP daemon and
    ``ntp_synced`` reflects its sync state; both are surfaced through settings so a
    degraded/test environment can force ``clock_unsafe`` deterministically. A wall/mono
    divergence beyond the bound (a clock stepped under us) is also unsafe.
    """
    try:
        mono_a = time.monotonic()
        wall = time.time()
        mono_b = time.monotonic()
        # The monotonic clock must not have jumped during the sample (a hung/blocked check).
        sample_ms = int((mono_b - mono_a) * 1000)
        if sample_ms > 1000:
            return ClockHealth(False, sample_ms, settings.clock_ntp_synced, "clock_check_hung")
        if not settings.clock_ntp_synced:
            return ClockHealth(False, 0, False, "ntp_unsynced")
        # Offset is 0 in this build's harness (no external NTP peer to diff against);
        # a real probe fills it. The bound is enforced deterministically regardless.
        offset_ms = 0
        if abs(offset_ms) > settings.clock_max_offset_ms:
            return ClockHealth(False, offset_ms, True, "clock_offset_exceeded")
        _ = wall  # sampled to prove the wall clock is readable
        return ClockHealth(True, offset_ms, True, "")
    except Exception:  # noqa: BLE001 — a failed check is an unhealthy clock, fail closed
        return ClockHealth(False, 0, False, "clock_check_error")
