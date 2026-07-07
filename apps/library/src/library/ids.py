"""library.ids — ID minting + validation (IDENTIFIERS.md, verbatim formats).

  doc_id          library-minted   `lib-` + ULID (26 Crockford base32)   IMMUTABLE
  chunk_id        library-derived  `doc_id#<n>`  — EPHEMERAL, never cross-app
  op_id           client-minted    opaque, ≤128 chars                    idempotency
  ticket_id       Board-minted     `T-` + digits                        opaque
  run_id          Gateway-minted   `R-` + ULID                          opaque
  harness_version Gateway-minted   `hv-` + 12 hex                       validated by ==
  sub             auth-minted      OIDC sub; agent:* / svc:* / op:*     opaque

Rule (IDENTIFIERS.md): prefix-typed where practical; NEVER parse a composite ID by
string-splitting for semantics; store/compare opaque IDs verbatim. The one derived,
non-opaque form is chunk_id, which is documented ephemeral and never persisted
cross-app.
"""
from __future__ import annotations

import os
import re
import struct
import time

# Crockford base32 alphabet (ULID spec) — excludes I, L, O, U.
_CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"


def _encode_crockford(data: bytes) -> str:
    # 128 bits → 26 chars. Standard ULID encoding.
    num = int.from_bytes(data, "big")
    out = []
    for _ in range(26):
        out.append(_CROCKFORD[num & 0x1F])
        num >>= 5
    return "".join(reversed(out))


def new_ulid(now_ms: int | None = None) -> str:
    """A monotonic-enough ULID: 48-bit ms timestamp + 80 random bits.

    Determinism note: ULIDs are intentionally NON-deterministic (they carry time +
    randomness) and are only ever minted for a *new* logical object. Nothing in the
    rebuildable-index path re-mints an ID — doc_id lives in the canonical corpus
    frontmatter and is read back, never regenerated (§1.2). So ULID randomness does
    not threaten the pure-function rebuild.
    """
    if now_ms is None:
        now_ms = int(time.time() * 1000)
    ts = struct.pack(">Q", now_ms)[2:]  # low 48 bits
    rand = os.urandom(10)
    return _encode_crockford(ts + rand)


def new_doc_id(now_ms: int | None = None) -> str:
    return "lib-" + new_ulid(now_ms)


def chunk_id(doc_id: str, n: int) -> str:
    """Ephemeral response-internal correlation field. NEVER persisted cross-app; the
    durable citation is doc_id + heading anchor + line-range (PLAN §1.2/§3)."""
    return f"{doc_id}#{n}"


# ── validators (validation posture per IDENTIFIERS.md) ────────────────────────
_DOC_RE = re.compile(r"^lib-[0-9A-HJKMNP-TV-Z]{26}$")
_TICKET_RE = re.compile(r"^T-\d{1,12}$")
_RUN_RE = re.compile(r"^R-[0-9A-HJKMNP-TV-Z]{26}$")
_HV_RE = re.compile(r"^hv-[0-9a-f]{12}$")
_SUB_RE = re.compile(r"^(agent|svc|op):[A-Za-z0-9._\-]{1,64}$")


def is_doc_id(s: str) -> bool:
    return bool(isinstance(s, str) and _DOC_RE.match(s))


def is_ticket_id(s: str) -> bool:
    return bool(isinstance(s, str) and _TICKET_RE.match(s))


def is_run_id(s: str) -> bool:
    return bool(isinstance(s, str) and _RUN_RE.match(s))


def is_harness_version(s: str) -> bool:
    return bool(isinstance(s, str) and _HV_RE.match(s))


def is_sub(s: str) -> bool:
    return bool(isinstance(s, str) and _SUB_RE.match(s))


def is_op_id(s: str) -> bool:
    return bool(isinstance(s, str) and 0 < len(s) <= 128)


def principal_kind(sub: str) -> str:
    """agent | service | human — derived from the sub prefix (opaque otherwise)."""
    if sub.startswith("agent:"):
        return "agent"
    if sub.startswith("svc:"):
        return "service"
    if sub.startswith("op:"):
        return "human"
    return "unknown"
