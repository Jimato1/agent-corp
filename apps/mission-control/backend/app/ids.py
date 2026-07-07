"""Identifier discipline (IDENTIFIERS.md).

**MC mints NO cross-app identifier.** The review-item identity IS the Board-minted
``ticket_id`` (stored verbatim, opaque, never parsed — contract §1). Agent ``sub`` is
auth-minted. ``op_id`` is caller-minted. ``resolve_seq`` is an MC-internal monotonic
replay cursor (contract-scoped, on IDENTIFIERS' deliberately-NOT-registered list) —
it is the rowid of ``resolve_log``, never a cross-app ID.

The only local ids MC generates are opaque rowids for its own append-only audit
tables (SQLite ``INTEGER PRIMARY KEY``). This module provides a monotonic ULID for
any internal, non-cross-app labelling need only.
"""
from __future__ import annotations

import os
import time

_B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"  # Crockford
_last_ms = 0
_last_rand = 0


def ulid(now_ms: int | None = None) -> str:
    """A monotonic ULID (internal use only — NOT a cross-app identifier)."""
    global _last_ms, _last_rand
    ms = now_ms if now_ms is not None else int(time.time() * 1000)
    if ms == _last_ms:
        _last_rand += 1
        rand = _last_rand
    else:
        _last_ms = ms
        rand = int.from_bytes(os.urandom(10), "big")
        _last_rand = rand
    ts = ""
    for _ in range(10):
        ts = _B32[ms & 31] + ts
        ms >>= 5
    rnd = ""
    for _ in range(16):
        rnd = _B32[rand & 31] + rnd
        rand >>= 5
    return ts + rnd
