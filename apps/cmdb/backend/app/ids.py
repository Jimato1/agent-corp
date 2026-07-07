"""Identifier minting — CMDB's own namespace only (IDENTIFIERS.md).

CMDB mints:

* ``decision_id`` — one per issued policy verdict; an opaque nonce carried inside the
  signed verdict token (IDENTIFIERS.md row: "opaque nonce inside the signed verdict
  token"; validated as part of verdict-token signature verification). We use ``D-`` +
  ULID: prefix-typed (IDENTIFIERS rule 2) and lexicographically time-ordered so the
  decision log sorts by issue time.
* ``host_id`` — CMDB's inventory PK, a lowercase DNS-safe slug. Minted ONLY by an
  operator action (never auto-minted from discovery, §2.1); we validate the slug shape
  but the operator supplies the value.

``window_id`` / ``policy_version`` are contract-scoped verdict-evidence fields
(deliberately NOT registered — IDENTIFIERS.md), minted inside the policy repo / from the
git commit; ``req_nonce`` is caller-minted (optional freshness), echoed verbatim.
"""
from __future__ import annotations

import os
import re
import time

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

# lowercase DNS-safe slug: labels of [a-z0-9-], not starting/ending with '-'.
_HOST_ID_RE = re.compile(r"^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$")


def _encode(value: int, length: int) -> str:
    chars = []
    for _ in range(length):
        value, rem = divmod(value, 32)
        chars.append(_CROCKFORD[rem])
    return "".join(reversed(chars))


def new_ulid(now_ms: int | None = None) -> str:
    if now_ms is None:
        now_ms = int(time.time() * 1000)
    rand = int.from_bytes(os.urandom(10), "big")
    return _encode(now_ms, 10) + _encode(rand, 16)


def new_decision_id(now_ms: int | None = None) -> str:
    return "D-" + new_ulid(now_ms)


def new_confirm_token() -> str:
    """Single-use propose→confirm token (§6.3). Opaque, contract-internal."""
    return "cft-" + new_ulid()


def is_valid_host_id(value: str) -> bool:
    return bool(value) and len(value) <= 253 and bool(_HOST_ID_RE.match(value))
