"""Injectable clock — the single source of 'now' (testable, MC server clock only)."""
from __future__ import annotations

from datetime import datetime, timezone


class Clock:
    def now(self) -> datetime:
        return datetime.now(timezone.utc)

    def iso(self) -> str:
        # RFC3339, second precision, Z-suffixed.
        return self.now().replace(microsecond=0).isoformat().replace("+00:00", "Z")

    def epoch(self) -> float:
        return self.now().timestamp()


SYSTEM_CLOCK = Clock()
