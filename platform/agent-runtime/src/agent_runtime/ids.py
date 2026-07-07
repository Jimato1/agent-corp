"""Identifier minting + validation, per context/specs/IDENTIFIERS.md.

The runtime mints exactly TWO kinds of id and no cross-app id in another app's
namespace:

  * ``op_id``      — the caller-minted idempotency key (IDENTIFIERS.md row):
                     one per logical mutating operation, opaque, <=128 chars,
                     UUID recommended. Board/Notes collapse replays by it.
  * ``session_id`` — runtime-minted, HEARTBEAT-CONTRACT-SCOPED only
                     (IDENTIFIERS.md "deliberately NOT registered" — not a
                     cross-app id). Used inside the per-agent heartbeat frame.
  * ``model_id``   — minted by the inference facade (registered cross-app id):
                     served model id + resolved digest + provenance-verified flag.
                     See facade.py / provenance.py.

Every FOREIGN id (ticket_id, fencing_token/lock_generation, sub/agent_id) is
stored VERBATIM and never parsed for meaning beyond the stated format. Helpers
below only VALIDATE shape defensively; they never fabricate a foreign id.
"""

from __future__ import annotations

import re
import uuid

# ---- runtime-minted ids ----------------------------------------------------

_OP_ID_MAX = 128


def mint_op_id() -> str:
    """A fresh idempotency key for one logical mutating operation."""
    return f"op-{uuid.uuid4()}"


def mint_session_id() -> str:
    """A fresh heartbeat-scoped session id (NOT a cross-app id)."""
    return f"sess-{uuid.uuid4()}"


def valid_op_id(op_id: str) -> bool:
    return isinstance(op_id, str) and 0 < len(op_id) <= _OP_ID_MAX


# ---- foreign id shape checks (defensive only; never parsed for meaning) -----

_TICKET_RE = re.compile(r"^T-\d+$")  # Board: T- + zero-padded integer


def looks_like_ticket_id(value: str) -> bool:
    """Board ticket_id shape. Existence is validated via the Board API, never here."""
    return isinstance(value, str) and bool(_TICKET_RE.match(value))


def is_monotonic_advance(current: int, incoming: int) -> bool:
    """Fencing tokens / kill epochs are monotonic integers; higher never regresses.

    Used by the drain epoch machine (a stale lower epoch never un-drains) and by
    the fencing high-water comparison on crash-restart.
    """
    return int(incoming) >= int(current)
