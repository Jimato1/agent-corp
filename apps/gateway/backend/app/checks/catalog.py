"""The playbook catalog (registry #2 — the Gateway owns implementations) + Check 1d/2a logic.

The catalog binds each ``(playbook_key, version)`` to a ``content_sha256``, an
``action_class`` (six real classes + the sandbox-only 7th), an ``extravars_schema``
(enum/regex-bounded), an ``est_duration_s``, and a ``rollback`` capability. **No agent-reachable
write path exists** — mutation is operator-vetted, step-up-confirmed change control (§4.1).

Check 1d (binding verification) and Check 2a (action_class derivation + the non-auto floor)
live here as pure functions over catalog rows + the parsed invocations. The **agent supplied
none of these values** — they come from Board + Notes + the Gateway's own catalog.
"""
from __future__ import annotations

import json
import re

from . import (
    ALLOWLIST_MISMATCH,
    FLOOR_VIOLATION,
    PARAM_SCHEMA_VIOLATION,
    UNKNOWN_PLAYBOOK,
    HardReject,
)
from .plan import params_hash

# The six real CMDB-owned action classes (extensible only via policy-plane change control) +
# the 7th sandbox-only class. Worst-class ordering for `derive_action_class`.
REAL_CLASSES = ["config_change", "service_restart", "package_update", "reboot", "kernel_update", "destructive"]
_CLASS_RANK = {c: i for i, c in enumerate(REAL_CLASSES)}
SANDBOX_CLASS = "sandbox_exec"
DESTRUCTIVE_CLASSES = {"destructive", "reboot", "kernel_update"}

# Initial catalog (PLAN §4.1). content_sha256 is a placeholder here; the real value is the
# sha256 of the admin-authored playbook file, registered under change control.
INITIAL_CATALOG = [
    {"playbook_key": "patch_debian", "version": "v1", "action_class": "package_update",
     "rollback": "snapshot", "est_duration_s": 360, "sandbox_profile": 0,
     "extravars_schema": {"packages": {"type": "list", "item_regex": r"^[a-z0-9][a-z0-9+.\-]*$"},
                          "reboot_if_needed": {"type": "enum", "enum": [True, False]}}},
    {"playbook_key": "patch_rhel", "version": "v1", "action_class": "package_update",
     "rollback": "dnf_history", "est_duration_s": 360, "sandbox_profile": 0,
     "extravars_schema": {"security_only": {"type": "enum", "enum": [True, False]}}},
    {"playbook_key": "reboot_host", "version": "v1", "action_class": "reboot",
     "rollback": "none", "est_duration_s": 180, "sandbox_profile": 0, "extravars_schema": {}},
    {"playbook_key": "service_restart", "version": "v1", "action_class": "service_restart",
     "rollback": "none", "est_duration_s": 60, "sandbox_profile": 0,
     "extravars_schema": {"service": {"type": "regex", "regex": r"^[a-zA-Z0-9@._\-]+$"}}},
    {"playbook_key": "health_probe", "version": "v1", "action_class": "config_change",
     "rollback": "none", "est_duration_s": 30, "sandbox_profile": 0, "extravars_schema": {}},
    {"playbook_key": "sbx_pytest", "version": "v1", "action_class": SANDBOX_CLASS,
     "rollback": "none", "est_duration_s": 120, "sandbox_profile": 1,
     "extravars_schema": {"input_ref": {"type": "regex", "regex": r"^[A-Za-z0-9:/@._\-#]+$"}}},
]


class Catalog:
    """Loads the ``playbook_catalog`` table; seeds the initial catalog if empty."""

    def __init__(self, db) -> None:
        self.db = db

    def seed_if_empty(self) -> None:
        c = self.db.reader()
        try:
            c.execute("SELECT COUNT(*) AS n FROM playbook_catalog")
            n = int(c.fetchone()["n"])
        finally:
            c.close()
        if n:
            return
        from ..clock import now_iso  # noqa: F401 (kept for parity)
        for e in INITIAL_CATALOG:
            content = "sha256:" + _content_placeholder(e["playbook_key"], e["version"])
            with self.db.tx() as w:
                w.execute(
                    "INSERT INTO playbook_catalog(playbook_key, version, content_sha256, action_class, "
                    "extravars_schema, est_duration_s, rollback, sandbox_profile, signed_by, status) "
                    "VALUES (?,?,?,?,?,?,?,?,?, 'active')",
                    (e["playbook_key"], e["version"], content, e["action_class"],
                     json.dumps(e["extravars_schema"], separators=(",", ":"), sort_keys=True),
                     e["est_duration_s"], e["rollback"], e["sandbox_profile"], "gateway-audit-1"),
                )

    def all(self) -> list[dict]:
        c = self.db.reader()
        try:
            c.execute("SELECT * FROM playbook_catalog ORDER BY playbook_key, version")
            return c.fetchall()
        finally:
            c.close()

    def lookup(self, playbook_key: str, version: str) -> dict | None:
        c = self.db.reader()
        try:
            c.execute("SELECT * FROM playbook_catalog WHERE playbook_key = ? AND version = ? AND status = 'active'",
                      (playbook_key, version))
            return c.fetchone()
        finally:
            c.close()


def _content_placeholder(key: str, version: str) -> str:
    import hashlib
    return hashlib.sha256(f"{key}@{version}".encode()).hexdigest()


# ---- Check 1d — binding verification (post-consume, before anything irreversible) ----------

def verify_binding(consume_resp: dict, recomputed_hash: str, invocations: list[dict],
                   catalog: Catalog) -> str:
    """Return the derived ``action_class``, or raise HardReject on any binding failure.

    (a) response plan_hash == our recomputed hash;
    (b) every parsed invocation's params_hash appears in the returned allowlist, and no
        allowlist row is unmatched;
    (c) every playbook_key exists in playbook_catalog at the pinned version;
    (d) every extravars set validates against that playbook's extravars_schema.
    """
    from . import PLAN_HASH_MISMATCH

    if consume_resp.get("plan_hash") != recomputed_hash:
        raise HardReject(PLAN_HASH_MISMATCH,
                         "Board/Notes plan bytes disagree — a human must look",
                         burned_approval=True)

    allow = consume_resp.get("allowlist") or []
    allow_hashes = {row.get("params_hash") for row in allow}
    inv_hashes = set()
    resolved: list[dict] = []
    for inv in invocations:
        entry = catalog.lookup(inv["playbook_key"], inv["version"])
        if entry is None:
            raise HardReject(UNKNOWN_PLAYBOOK,
                             f"no active catalog entry {inv['playbook_key']}@{inv['version']}",
                             burned_approval=True)
        validate_extravars(json.loads(entry["extravars_schema"]) if isinstance(entry["extravars_schema"], str)
                           else entry["extravars_schema"], inv["extravars"])
        ph = params_hash(inv)
        inv_hashes.add(ph)
        resolved.append(entry)

    # Every invocation must be allowlisted AND every allowlist row must be matched (no unmatched).
    if inv_hashes != allow_hashes:
        raise HardReject(ALLOWLIST_MISMATCH,
                         "invocation set does not exactly match the Board allowlist",
                         burned_approval=True)

    return derive_action_class(resolved)


def derive_action_class(catalog_entries: list[dict]) -> str:
    """Worst class across the invocations' catalog bindings — NEVER from the request/ticket type."""
    worst = None
    for e in catalog_entries:
        cls = e["action_class"]
        if cls == SANDBOX_CLASS:
            return SANDBOX_CLASS
        rank = _CLASS_RANK.get(cls, 0)
        if worst is None or rank > _CLASS_RANK.get(worst, -1):
            worst = cls
    return worst or "config_change"


def enforce_floor(action_class: str, approver_kind: str, rollback_worst: str) -> None:
    """Independent of CMDB, hold the destructive-never-auto floor (§3-2a).

    ``action_class ∈ destructive-family`` (or a non-snapshot ``rollback=none``) with
    ``approver_kind == tier_policy`` (an AUTO approval) → FLOOR_VIOLATION. A compromised CMDB
    returning permit-for-everything still causes ZERO destructive auto actions.
    """
    is_destructive = action_class in DESTRUCTIVE_CLASSES or rollback_worst == "none"
    if is_destructive and approver_kind == "tier_policy":
        raise HardReject(FLOOR_VIOLATION,
                         f"{action_class} (rollback={rollback_worst}) may not be auto-approved by tier policy",
                         burned_approval=True)


def validate_extravars(schema: dict, extravars: dict) -> None:
    """Enum/regex-bounded validation. Unknown keys are refused (additionalProperties:false)."""
    if extravars is None:
        extravars = {}
    for key in extravars:
        if key not in schema:
            raise HardReject(PARAM_SCHEMA_VIOLATION, f"unknown extravar {key!r}", burned_approval=True)
    for key, spec in schema.items():
        if key not in extravars:
            continue
        val = extravars[key]
        kind = spec.get("type")
        if kind == "enum":
            if val not in spec.get("enum", []):
                raise HardReject(PARAM_SCHEMA_VIOLATION, f"{key!r} not in enum", burned_approval=True)
        elif kind == "regex":
            if not isinstance(val, str) or not re.fullmatch(spec["regex"], val):
                raise HardReject(PARAM_SCHEMA_VIOLATION, f"{key!r} fails regex", burned_approval=True)
        elif kind == "list":
            if not isinstance(val, list):
                raise HardReject(PARAM_SCHEMA_VIOLATION, f"{key!r} must be a list", burned_approval=True)
            item_re = spec.get("item_regex")
            for item in val:
                if item_re and (not isinstance(item, str) or not re.fullmatch(item_re, item)):
                    raise HardReject(PARAM_SCHEMA_VIOLATION, f"{key!r} item fails regex", burned_approval=True)
