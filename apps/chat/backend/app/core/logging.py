"""Logging setup. Secrets never reach logs (Standard Stage-5): the ingest
secret-pattern reject (``app.security.hygiene``) means credential shapes are refused
at the door; log records here carry only ids + machine reasons, never bodies.
"""
from __future__ import annotations

import logging


def configure_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
