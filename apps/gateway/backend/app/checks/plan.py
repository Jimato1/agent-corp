"""Check 1b — plan-bytes re-hash + invocation parse (no side effects).

The Gateway fetches the pinned plan revision bytes from Notes (``plan_note_id``@
``plan_note_rev`` via ``svc:gateway`` + ``notes:read``, A2), recomputes ``sha256:`` over the
EXACT bytes, and parses the fenced playbook-invocation list from those SAME bytes. **The
agent supplied none of this** — a lying Notes yields a hash mismatch and a refusal
(fail-closed), never a wrong execution (PLAN §17-2).

Invocation format (the fenced list in the plan note): one JSON object per invocation,
``{"playbook_key", "version", "extravars": {...}}``. ``params_hash`` canonicalises each so
it can be matched against the Board allowlist row.
"""
from __future__ import annotations

import hashlib
import json

from . import ALLOWLIST_MISMATCH, HardReject


def recompute_plan_hash(plan_bytes: bytes) -> str:
    return "sha256:" + hashlib.sha256(plan_bytes).hexdigest()


def params_hash(invocation: dict) -> str:
    """Canonical hash over (playbook_key, version, extravars) — matches the Board allowlist row."""
    canon = json.dumps({
        "playbook_key": invocation.get("playbook_key"),
        "version": invocation.get("version"),
        "extravars": invocation.get("extravars", {}),
    }, separators=(",", ":"), sort_keys=True)
    return "ph:" + hashlib.sha256(canon.encode("utf-8")).hexdigest()


def parse_invocations(plan_bytes: bytes) -> list[dict]:
    """Parse the fenced ```gateway-invocations``` JSON block from the plan note bytes.

    Robust to a plain-JSON test note (a top-level list or a {"invocations": [...]} object).
    Anything unparseable is an ALLOWLIST_MISMATCH by construction (we cannot bind it).
    """
    text = plan_bytes.decode("utf-8", errors="replace")
    block = None
    marker = "```gateway-invocations"
    if marker in text:
        rest = text.split(marker, 1)[1]
        block = rest.split("```", 1)[0]
    else:
        block = text
    try:
        obj = json.loads(block)
    except Exception as exc:  # noqa: BLE001
        raise HardReject(ALLOWLIST_MISMATCH, f"plan invocations not parseable: {exc}") from exc
    if isinstance(obj, dict):
        obj = obj.get("invocations", [])
    if not isinstance(obj, list) or not obj:
        raise HardReject(ALLOWLIST_MISMATCH, "plan carries no invocations")
    out = []
    for inv in obj:
        if not isinstance(inv, dict) or "playbook_key" not in inv:
            raise HardReject(ALLOWLIST_MISMATCH, "malformed invocation entry")
        out.append({"playbook_key": str(inv["playbook_key"]), "version": str(inv.get("version", "")),
                    "extravars": inv.get("extravars", {}) or {}})
    return out
