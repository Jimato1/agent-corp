"""Logging config. NEVER logs anything credential-shaped (§3-3b / contract §6: handle +
HMAC only; ``log_raw`` forbidden; secret values HMAC'd)."""
from __future__ import annotations

import logging


def configure_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
