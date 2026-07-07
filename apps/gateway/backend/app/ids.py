"""Identifier minting (IDENTIFIERS.md — the Gateway mints ``run_id`` and ``harness_version``).

* ``run_id``          = ``R-`` + ULID (one per execution run on one host). Opaque to everyone
                        but the Gateway.
* ``harness_version`` = ``hv-`` + first 12 hex of sha256(harness image digest ‖ canonical
                        profile-catalog JSON) — Gateway-minted; binds sandbox evidence to a
                        trusted-computing-base version (gateway-cmdb-library-sandbox.md §G7).

Every OTHER id (``ticket_id`` T-…, ``approval_id`` A-…, ``plan_hash`` sha256:…, ``host_id``,
``release_id`` rel-…, ``decision_id``) is minted by another app and stored VERBATIM (opaque);
the Gateway never fabricates a value in another app's namespace.
"""
from __future__ import annotations

import hashlib
import json
import os
import secrets
import time

_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _ulid() -> str:
    """A monotonic-enough ULID (48-bit ms time + 80 bits randomness, Crockford base32)."""
    ms = int(time.time() * 1000)
    rand = int.from_bytes(secrets.token_bytes(10), "big")
    val = (ms << 80) | rand
    out = []
    for _ in range(26):
        out.append(_CROCKFORD[val & 0x1F])
        val >>= 5
    return "".join(reversed(out))


def mint_run_id() -> str:
    return "R-" + _ulid()


def harness_version(image_digest: str, profile_catalog: dict | list) -> str:
    """hv- + first 12 hex of sha256(image digest ‖ canonical profile-catalog JSON)."""
    canon = json.dumps(profile_catalog, separators=(",", ":"), sort_keys=True)
    h = hashlib.sha256((image_digest + "\x00" + canon).encode("utf-8")).hexdigest()
    return "hv-" + h[:12]


def op_uuid() -> str:
    return _ulid()
