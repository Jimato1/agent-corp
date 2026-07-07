"""Translating a typed policy edit into (a) a candidate in-memory snapshot for the
classifier and (b) the actual file writes for the commit — from ONE frontmatter dict, so
the classified diff and the committed diff can never diverge.
"""
from __future__ import annotations

import copy
import hashlib
import json

import yaml

from ..policy.models import Snapshot
from ..policy.schema import (
    SchemaError,
    build_catalog_entry,
    build_host,
    build_task_type,
    build_tier,
)

TARGET_KINDS = ("host", "tier", "task_type", "catalog", "sandbox_pool")
_DIR = {"host": "hosts", "tier": "tiers", "task_type": "task-types", "catalog": "catalog"}


def render_frontmatter(d: dict) -> str:
    return "---\n" + yaml.safe_dump(d, sort_keys=False) + "---\n"


def _canonical(obj) -> bytes:
    return json.dumps(obj, separators=(",", ":"), sort_keys=True).encode("utf-8")


def diff_hash(target_kind: str, key: str, action: str, before: dict | None, after: dict | None) -> str:
    return hashlib.sha256(
        _canonical({"target_kind": target_kind, "key": key, "action": action,
                    "before": before, "after": after})
    ).hexdigest()


def apply_edit_to_snapshot(snap: Snapshot, target_kind: str, key: str, action: str,
                           frontmatter: dict | None) -> Snapshot:
    """Return a NEW candidate Snapshot with the edit applied (validated). Raises SchemaError."""
    hosts = dict(snap.hosts)
    tiers = dict(snap.tiers)
    task_types = dict(snap.task_types)
    catalog = dict(snap.catalog)
    sandbox_enabled = snap.sandbox_enabled

    if target_kind == "host":
        if action == "delete":
            hosts.pop(key, None)
        else:
            fm = dict(frontmatter or {})
            fm.setdefault("host_id", key)
            fm.setdefault("class", "managed")
            if fm.get("class") != "managed":
                raise SchemaError("managed hosts only via the host target; disposable via sandbox_pool")
            # Class immutability (§5): a host may never change class.
            old = hosts.get(key)
            if old is not None and old.host_class != fm["class"]:
                raise SchemaError(f"host {key!r} class is immutable ({old.host_class} -> {fm['class']} refused)")
            hosts[key] = build_host(fm)
    elif target_kind == "tier":
        if action == "delete":
            raise SchemaError("tiers cannot be deleted (the catalog is fixed at four)")
        tiers[key] = build_tier(key, dict(frontmatter or {}))
    elif target_kind == "task_type":
        if action == "delete":
            task_types.pop(key, None)
        else:
            fm = dict(frontmatter or {}); fm.setdefault("type_key", key)
            task_types[key] = build_task_type(fm)
    elif target_kind == "catalog":
        if action == "delete":
            catalog.pop(key, None)
        else:
            fm = dict(frontmatter or {}); fm.setdefault("playbook_key", key)
            catalog[key] = build_catalog_entry(fm)
    elif target_kind == "sandbox_pool":
        fm = dict(frontmatter or {})
        sandbox_enabled = bool(fm.get("enabled", True))
        # rebuild disposable hosts from slots; drop any prior disposable hosts
        hosts = {hid: h for hid, h in hosts.items() if h.host_class != "disposable"}
        for slot in fm.get("slots", []) or []:
            sd = dict(slot); sd["class"] = "disposable"
            old = snap.hosts.get(sd.get("host_id", ""))
            if old is not None and old.host_class != "disposable":
                raise SchemaError(f"host {sd.get('host_id')!r} class is immutable (managed -> disposable refused)")
            h = build_host(sd)
            hosts[h.host_id] = h
    else:
        raise SchemaError(f"unknown target_kind {target_kind!r}")

    return Snapshot(
        git_commit=snap.git_commit, hosts=hosts, tiers=tiers, task_types=task_types,
        catalog=catalog, sandbox_enabled=sandbox_enabled,
    )


def render_files(target_kind: str, key: str, action: str, frontmatter: dict | None) -> tuple[dict[str, str], tuple[str, ...]]:
    """The actual file writes/deletes for the commit."""
    if target_kind == "sandbox_pool":
        return {"sandbox/pool.md": render_frontmatter(dict(frontmatter or {}))}, ()
    d = _DIR[target_kind]
    rel = f"{d}/{key}.md"
    if action == "delete":
        return {}, (rel,)
    fm = dict(frontmatter or {})
    return {rel: render_frontmatter(fm)}, ()


def frontmatter_from_model(snap: Snapshot, target_kind: str, key: str) -> dict | None:
    """Serialize the CURRENT object to a frontmatter dict for the diff's `before` side."""
    if target_kind == "host":
        h = snap.hosts.get(key)
        if not h:
            return None
        return {
            "host_id": h.host_id, "class": h.host_class, "tier": h.tier,
            "overrides": dict(h.overrides), "snapshot_capability": h.snapshot_capability,
            "windows": [_window_fm(w) for w in h.windows],
            "wazuh": ({"agent_id": h.wazuh_agent_id} if h.wazuh_agent_id else {}),
        }
    if target_kind == "tier":
        t = snap.tiers.get(key)
        return None if not t else {
            "tier": t.name, "defaults": dict(t.defaults),
            "health_check_timeout_s": t.health_check_timeout_s, "ssh_wait_timeout_s": t.ssh_wait_timeout_s,
        }
    if target_kind == "task_type":
        tt = snap.task_types.get(key)
        return None if not tt else {
            "type_key": tt.type_key, "title": tt.title, "destructive": tt.destructive,
            "reversible": tt.reversible, "action_class": tt.action_class,
            "external_verifier": tt.external_verifier, "verification_window_s": tt.verification_window_s,
        }
    if target_kind == "catalog":
        ce = snap.catalog.get(key)
        return None if not ce else {
            "playbook_key": ce.playbook_key, "action_class": ce.action_class, "risk_class": ce.risk_class,
            "applicable_tiers": list(ce.applicable_tiers), "rollback_declared": ce.rollback_declared,
            "rollback_method": ce.rollback_method, "duration_estimate_s": ce.duration_estimate_s,
            "sandbox_eligible": ce.sandbox_eligible,
        }
    if target_kind == "sandbox_pool":
        slots = [{"host_id": h.host_id} for h in snap.hosts.values() if h.host_class == "disposable"]
        return {"enabled": snap.sandbox_enabled, "slots": slots}
    return None


def _window_fm(w) -> dict:
    out = {"id": w.id, "kind": w.kind, "tzid": w.tzid, "grace_minutes": w.grace_minutes,
           "on_window_close": w.on_window_close}
    if w.rrule:
        out.update({"rrule": w.rrule, "start_local": w.start_local, "end_local": w.end_local})
    if w.start_at:
        out.update({"start_at": w.start_at, "end_at": w.end_at})
    if w.break_glass:
        out["break_glass"] = True
    if w.overrides_freeze:
        out["overrides_freeze"] = True
    return out
