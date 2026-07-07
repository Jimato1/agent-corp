"""Server clock (PLAN §1.1: Chat uses its own server clock only — no cross-clock math).

RFC 3339 / ISO-8601 UTC strings with a trailing ``Z`` are the one stored timestamp
format, so string comparison equals chronological comparison and every consumer
parses one shape.
"""
from __future__ import annotations

from datetime import datetime, timezone


def now_dt() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return to_iso(now_dt())


def to_iso(dt: datetime) -> str:
    dt = dt.astimezone(timezone.utc)
    return dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{dt.microsecond // 1000:03d}Z"
