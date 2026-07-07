"""Logging config. Reason codes are CMDB-authored enums; no host-originated string is
ever formatted into a log line as an interpolated control field (ARCH §12)."""
from __future__ import annotations

import logging


def configure_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
