"""Structured logging — privacy-first: NEVER logs document content or client
filenames' path components. Only job ids, ops, states, byte counts, codes."""
from __future__ import annotations

import logging
import sys


def configure_logging(level: int = logging.INFO) -> None:
    root = logging.getLogger()
    if root.handlers:
        return
    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    root.addHandler(handler)
    root.setLevel(level)


log = logging.getLogger("pdfforge")
