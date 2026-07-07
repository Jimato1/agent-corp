"""Read helpers over the rebuildable Wazuh mirror + the policy snapshot.

Host-facts (cmdb-library-hostfacts.md) come from the mirror + ``facts_override`` for
non-agent assets. This surface is inventory facts ONLY — never tier/window/credential/
policy fields (the seam must not widen). Failures are honest 404s, never guesses.
"""
from __future__ import annotations


def _facts_row(db, host_id: str) -> dict | None:
    conn = db.reader()
    try:
        r = conn.execute("SELECT * FROM inventory_facts WHERE host_id=?", (host_id,)).fetchone()
        return dict(r) if r else None
    finally:
        conn.close()


def resolve_host_facts(db, snapshot, host_id: str) -> dict | None:
    """The frozen `resolve_host_facts` shape (hostfacts §1). None => honest 404."""
    if snapshot is None:
        return None
    host = snapshot.hosts.get(host_id)
    if host is None:
        return None
    row = _facts_row(db, host_id) or {}
    ov = host.facts_override or {}
    # facts_override (operator-authored) takes precedence for non-agent assets; else mirror.
    facts = {
        "os_family": ov.get("os_family") or row.get("os_family"),
        "distro": ov.get("distro") or row.get("distro"),
        "distro_version": ov.get("distro_version") or row.get("distro_version"),
        "arch": ov.get("arch") or row.get("arch"),
        "package_manager": ov.get("package_manager") or row.get("package_manager"),
        "eol_date": ov.get("eol_date"),
    }
    # Additive A12: provenance so the Library can weight its hard filter honestly.
    facts["facts_provenance"] = {
        k: ("operator" if ov.get(k) else "host-originated")
        for k in ("os_family", "distro", "distro_version", "arch", "package_manager")
    }
    if facts["os_family"] is None and facts["distro"] is None and facts["arch"] is None:
        return None  # no facts known yet — honest 404, never a fabricated shape
    return facts


def get_host_detail(db, snapshot, host_id: str) -> dict | None:
    """Full inventory + policy view for the operator Host screen. Facts carry provenance."""
    if snapshot is None:
        return None
    host = snapshot.hosts.get(host_id)
    if host is None:
        return None
    row = _facts_row(db, host_id) or {}
    return {
        "host_id": host.host_id,
        "class": host.host_class,
        "tier": host.tier,
        "lifecycle": host.lifecycle,
        "overrides": dict(host.overrides),
        "snapshot_capability": host.snapshot_capability,
        "windows": [
            {"id": w.id, "kind": w.kind, "tzid": w.tzid, "grace_minutes": w.grace_minutes,
             "on_window_close": w.on_window_close, "rrule": w.rrule,
             "start_local": w.start_local, "end_local": w.end_local,
             "start_at": w.start_at, "end_at": w.end_at, "break_glass": w.break_glass}
            for w in host.windows
        ],
        "wazuh": {"agent_id": host.wazuh_agent_id, "bound_at": host.wazuh_bound_at,
                  "bound_by": host.wazuh_bound_by},
        "facts": {
            "os_family": row.get("os_family"), "distro": row.get("distro"),
            "distro_version": row.get("distro_version"), "arch": row.get("arch"),
            "ip": row.get("ip"), "liveness": row.get("liveness"),
            "last_seen": row.get("last_seen"), "provenance": row.get("provenance", "host-originated"),
        },
        "facts_override": dict(host.facts_override),
    }


def list_discovered(db) -> list[dict]:
    conn = db.reader()
    try:
        rows = conn.execute(
            "SELECT * FROM discovered_agents WHERE bound_host_id IS NULL ORDER BY last_seen DESC"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()
