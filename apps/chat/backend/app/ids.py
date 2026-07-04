"""Identifier minting — Chat's own namespace only (IDENTIFIERS.md).

Chat mints exactly two ids, and never fabricates any other app's ids (a stored
``ticket_id`` / ``agent_id`` / ``source_id`` is opaque and copied verbatim):

* ``notification_id`` — ``N-`` + monotonic ULID. Prefix-typed (IDENTIFIERS rule 2);
  lexicographically ordered so the id itself doubles as the SSE ``Last-Event-ID``
  replay cursor (PLAN §1.5). The registry's canonical ``notification_id`` row.
* ``broadcast_id`` — ``B-`` + ULID. App-INTERNAL (deliberately NOT registered; not
  promoted until a consumer appears — PLAN §1.2).

The ULID is Crockford base32, 48-bit ms timestamp + 80 bits of randomness, so it is
monotonic at second granularity across a process and sorts by creation time. We do
NOT depend on ``Date.now``-style ambient time being stable across calls beyond
ordering; ``seq`` (the SQLite rowid) is the authoritative total order, the id is only
what clients see.
"""
from __future__ import annotations

import os
import time

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _encode(value: int, length: int) -> str:
    chars = []
    for _ in range(length):
        value, rem = divmod(value, 32)
        chars.append(_CROCKFORD[rem])
    return "".join(reversed(chars))


def new_ulid(now_ms: int | None = None) -> str:
    """A 26-char Crockford-base32 ULID (10 chars time + 16 chars randomness)."""
    if now_ms is None:
        now_ms = int(time.time() * 1000)
    rand = int.from_bytes(os.urandom(10), "big")
    return _encode(now_ms, 10) + _encode(rand, 16)


def new_notification_id(now_ms: int | None = None) -> str:
    return "N-" + new_ulid(now_ms)


def new_broadcast_id(now_ms: int | None = None) -> str:
    return "B-" + new_ulid(now_ms)
