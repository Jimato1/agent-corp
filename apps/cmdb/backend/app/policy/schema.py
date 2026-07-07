"""Markdown/YAML frontmatter schema + validators (PLAN §2, §4, §10 step 1).

The canonical store is operator-authored markdown with schema-validated YAML frontmatter.
The validator refuses:

* a destructive-never-auto FLOOR cell being authored ``auto`` (§3.3 — the floor may only
  grow via change control; a validator that let it shrink would be the bug);
* an RRULE part outside the enforced allowlist (§4.3);
* a malformed action_class / tier / host_class;
* a disposable record carrying tier/windows/overrides/wazuh bind (sandbox §C6 config error).

Class immutability (§5) is a WRITE-path property (no edit path changes ``class``), enforced
in the change-control layer, not here — this module validates a single file's shape.
"""
from __future__ import annotations

import yaml

from .constants import (
    APPROVAL_MODES,
    FLOOR_NON_AUTO,
    HOST_CLASSES,
    ON_WINDOW_CLOSE,
    REAL_ACTION_CLASSES,
    RRULE_ALLOWED_FREQ,
    RRULE_ALLOWED_PARTS,
    SANDBOX_ACTION_CLASS,
    SNAPSHOT_CAPABILITIES,
    TIERS,
)
from .models import CatalogEntry, Host, TaskType, Tier, Window


class SchemaError(Exception):
    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


def parse_frontmatter(text: str) -> dict:
    """Parse ``---\\n<yaml>\\n---`` frontmatter. Body (if any) is ignored for policy."""
    t = text.lstrip("﻿").lstrip()
    if t.startswith("---"):
        rest = t[3:]
        end = rest.find("\n---")
        block = rest[:end] if end != -1 else rest
    else:
        block = t
    try:
        data = yaml.safe_load(block) or {}
    except yaml.YAMLError as exc:
        raise SchemaError(f"unparseable YAML frontmatter: {exc}") from exc
    if not isinstance(data, dict):
        raise SchemaError("frontmatter must be a YAML mapping")
    return data


def _validate_rrule(rrule: str) -> None:
    parts = {}
    for kv in rrule.split(";"):
        if not kv.strip():
            continue
        k, _, v = kv.partition("=")
        parts[k.strip().upper()] = v.strip()
    if "FREQ" not in parts:
        raise SchemaError("RRULE requires FREQ")
    if parts["FREQ"] not in RRULE_ALLOWED_FREQ:
        raise SchemaError(f"RRULE FREQ {parts['FREQ']!r} not in allowlist {sorted(RRULE_ALLOWED_FREQ)}")
    illegal = set(parts) - RRULE_ALLOWED_PARTS
    if illegal:
        raise SchemaError(f"RRULE parts {sorted(illegal)} are rejected (allowlist {sorted(RRULE_ALLOWED_PARTS)})")
    if "UNTIL" in parts and not parts["UNTIL"].endswith("Z"):
        raise SchemaError("RRULE UNTIL must be UTC (trailing Z)")


def build_window(d: dict) -> Window:
    if not isinstance(d, dict):
        raise SchemaError("window entry must be a mapping")
    wid = str(d.get("id") or "").strip()
    if not wid:
        raise SchemaError("window requires an id")
    kind = str(d.get("kind", "allow"))
    if kind not in ("allow", "freeze"):
        raise SchemaError(f"window kind {kind!r} must be allow|freeze")
    tzid = str(d.get("tzid") or "").strip()
    if not tzid:
        raise SchemaError("window requires an explicit IANA tzid")
    on_close = str(d.get("on_window_close", "abort_and_rollback"))
    if on_close not in ON_WINDOW_CLOSE:
        raise SchemaError(f"on_window_close {on_close!r} must be one of {ON_WINDOW_CLOSE}")
    grace = int(d.get("grace_minutes", 0) or 0)
    rrule = d.get("rrule")
    start_at = d.get("start_at")
    if rrule:
        _validate_rrule(str(rrule))
        if not d.get("start_local"):
            raise SchemaError("recurring window requires start_local")
        if not d.get("end_local"):
            raise SchemaError("recurring window requires end_local")
        return Window(
            id=wid, kind=kind, tzid=tzid, grace_minutes=grace, on_window_close=on_close,
            rrule=str(rrule), start_local=str(d["start_local"]), end_local=str(d["end_local"]),
            break_glass=bool(d.get("break_glass", False)),
            overrides_freeze=bool(d.get("overrides_freeze", False)),
        )
    if start_at:
        if not d.get("end_at"):
            raise SchemaError("one-shot window requires end_at")
        return Window(
            id=wid, kind=kind, tzid=tzid, grace_minutes=grace, on_window_close=on_close,
            start_at=str(start_at), end_at=str(d["end_at"]), one_shot=True,
            break_glass=bool(d.get("break_glass", False)),
            overrides_freeze=bool(d.get("overrides_freeze", False)),
        )
    raise SchemaError("window must be recurring (rrule) or one-shot (start_at/end_at)")


def _validate_mode_map(m: dict, *, where: str) -> dict[str, str]:
    out: dict[str, str] = {}
    for k, v in (m or {}).items():
        ac = str(k)
        mode = str(v)
        if ac not in REAL_ACTION_CLASSES:
            raise SchemaError(f"{where}: {ac!r} is not a real action_class {REAL_ACTION_CLASSES}")
        if mode not in APPROVAL_MODES:
            raise SchemaError(f"{where}: mode {mode!r} must be auto|ask")
        # The destructive-never-auto FLOOR: refuse authoring such a cell (§3.3).
        if mode == "auto" and ac in FLOOR_NON_AUTO:
            raise SchemaError(f"{where}: {ac!r} is a floor class and can never be authored 'auto'")
        out[ac] = mode
    return out


def build_tier(name: str, d: dict) -> Tier:
    if name not in TIERS:
        raise SchemaError(f"tier {name!r} not in {TIERS}")
    defaults = _validate_mode_map(d.get("defaults", {}), where=f"tier {name} defaults")
    return Tier(
        name=name, defaults=defaults,
        health_check_timeout_s=int(d.get("health_check_timeout_s", 60) or 60),
        ssh_wait_timeout_s=int(d.get("ssh_wait_timeout_s", 120) or 120),
    )


def build_host(d: dict) -> Host:
    host_id = str(d.get("host_id") or "").strip()
    if not host_id:
        raise SchemaError("host requires host_id")
    host_class = str(d.get("class", "managed"))
    if host_class not in HOST_CLASSES:
        raise SchemaError(f"host class {host_class!r} must be managed|disposable")
    tier = d.get("tier")
    tier = str(tier) if tier else None
    if tier is not None and tier not in TIERS:
        raise SchemaError(f"host tier {tier!r} not in {TIERS} (the unpolicied sentinel is synthetic, not a value)")
    overrides = _validate_mode_map(d.get("overrides", {}), where=f"host {host_id} overrides")
    snapcap = str(d.get("snapshot_capability", "none"))
    if snapcap not in SNAPSHOT_CAPABILITIES:
        raise SchemaError(f"snapshot_capability {snapcap!r} must be one of {SNAPSHOT_CAPABILITIES}")
    windows = tuple(build_window(w) for w in (d.get("windows") or []))
    wazuh = d.get("wazuh") or {}

    if host_class == "disposable":
        # Sandbox §C6: a disposable record carrying tier/windows/overrides/wazuh bind is a
        # config error. We reject it at authoring; evaluate() ALSO fail-closes at decision
        # time (deny(sandbox_config_error)) as defense-in-depth.
        if tier is not None or windows or overrides or wazuh.get("agent_id"):
            raise SchemaError(
                f"disposable host {host_id!r} must carry no tier/windows/overrides/wazuh bind (sandbox §C6)"
            )

    return Host(
        host_id=host_id, host_class=host_class, tier=tier, overrides=overrides,
        windows=windows, snapshot_capability=snapcap,
        facts_override={str(k): str(v) for k, v in (d.get("facts_override") or {}).items()},
        wazuh_agent_id=(str(wazuh["agent_id"]) if wazuh.get("agent_id") else None),
        wazuh_bound_at=wazuh.get("bound_at"), wazuh_bound_by=wazuh.get("bound_by"),
        lifecycle=str(d.get("lifecycle", "active")),
    )


def build_task_type(d: dict) -> TaskType:
    tk = str(d.get("type_key") or "").strip()
    if not tk:
        raise SchemaError("task-type requires type_key")
    ac = str(d.get("action_class", ""))
    if ac not in REAL_ACTION_CLASSES:
        raise SchemaError(f"task-type action_class {ac!r} must be a real class")
    return TaskType(
        type_key=tk, title=str(d.get("title", tk)),
        destructive=bool(d.get("destructive", True)),
        reversible=bool(d.get("reversible", False)),
        action_class=ac,
        external_verifier=str(d.get("external_verifier", "none")),
        verification_window_s=int(d.get("verification_window_s", 0) or 0),
        notes=str(d.get("notes", "")),
    )


def build_catalog_entry(d: dict) -> CatalogEntry:
    pk = str(d.get("playbook_key") or "").strip()
    if not pk:
        raise SchemaError("catalog entry requires playbook_key")
    ac = str(d.get("action_class", ""))
    if ac not in REAL_ACTION_CLASSES and ac != SANDBOX_ACTION_CLASS:
        raise SchemaError(f"catalog action_class {ac!r} invalid")
    return CatalogEntry(
        playbook_key=pk, action_class=ac,
        risk_class=str(d.get("risk_class", "")),
        applicable_tiers=tuple(str(x) for x in (d.get("applicable_tiers") or [])),
        rollback_declared=bool(d.get("rollback_declared", False)),
        rollback_method=str(d.get("rollback_method", "")),
        duration_estimate_s=int(d.get("duration_estimate_s", 0) or 0),
        sandbox_eligible=bool(d.get("sandbox_eligible", False)),
    )
