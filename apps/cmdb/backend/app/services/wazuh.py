"""Wazuh sync — the read-only discovery feed (PLAN §8).

Poll a dedicated Wazuh RBAC account (agent:read, syscollector:read, group:read). Three-way
reconcile: new agent ⇒ ``discovered_agents`` queue (NEVER a host); gone ⇒ ``stale`` flag +
escalation after a threshold; drift ⇒ update the rebuildable facts mirror, log the diff,
**never touch policy**. Every synced field is provenance-tagged ``host-originated`` (a
managed host controls its own Syscollector output, ARCH §12). Sync failure ⇒ stale-flagged
mirror; VERDICTS ARE UNAFFECTED (policy is CMDB's own fact — a Wazuh outage must not halt
the gate, and equally can never open it).

Live Wazuh is CANNOT-VERIFY in an isolated build (no Wazuh server); ``wazuh_enabled`` is
off by default and the reconcile logic is unit-tested against injected agent lists.
"""
from __future__ import annotations

import json
import ssl
import urllib.request
from dataclasses import dataclass

from ..clock import now_iso
from . import escalations


@dataclass
class SyncStatus:
    ok: bool
    last_poll: str | None
    version: str | None
    reason: str = ""


def _authenticate(settings) -> str | None:
    url = f"{settings.wazuh_url.rstrip('/')}/security/user/authenticate?raw=true"
    auth = urllib.request.HTTPPasswordMgrWithDefaultRealm()
    auth.add_password(None, settings.wazuh_url, settings.wazuh_user, settings.wazuh_password)
    handler = urllib.request.HTTPBasicAuthHandler(auth)
    ctx = ssl.create_default_context()
    opener = urllib.request.build_opener(handler, urllib.request.HTTPSHandler(context=ctx))
    try:
        with opener.open(url, timeout=5.0) as resp:  # noqa: S310
            return resp.read().decode("utf-8").strip()
    except Exception:  # noqa: BLE001
        return None


def fetch_agents(settings, token: str) -> list[dict] | None:
    url = f"{settings.wazuh_url.rstrip('/')}/agents"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=5.0) as resp:  # noqa: S310
            doc = json.loads(resp.read().decode("utf-8"))
    except Exception:  # noqa: BLE001
        return None
    return doc.get("data", {}).get("affected_items", [])


def reconcile(db, snapshot, agents: list[dict]) -> dict:
    """Update the mirror + discovery queue from a Wazuh agent list. Returns a summary.

    The `snapshot` provides the bound wazuh_agent_id -> host_id mapping so an already-bound
    agent updates its host's facts mirror; an unknown agent lands in the discovery queue.
    Escalations (missing_from_wazuh) are enqueued via the outbox. NEVER writes policy.
    """
    bound: dict[str, str] = {}
    for h in (snapshot.hosts.values() if snapshot else []):
        if h.wazuh_agent_id:
            bound[str(h.wazuh_agent_id)] = h.host_id

    seen_ids: set[str] = set()
    new_discovered = 0
    updated_facts = 0
    now = now_iso()
    with db.write_lock:
        conn = db.writer
        with conn:
            for a in agents:
                aid = str(a.get("id", "")).strip()
                if not aid or aid == "000":  # 000 is the Wazuh manager itself
                    continue
                seen_ids.add(aid)
                os_info = a.get("os", {}) or {}
                if aid in bound:
                    host_id = bound[aid]
                    conn.execute(
                        "INSERT INTO inventory_facts(host_id, os_family, distro, distro_version, arch, "
                        "ip, liveness, syscollector_scan_interval, provenance, last_seen, updated_at) "
                        "VALUES (?,?,?,?,?,?,?,?, 'host-originated', ?, ?) "
                        "ON CONFLICT(host_id) DO UPDATE SET os_family=excluded.os_family, "
                        "distro=excluded.distro, distro_version=excluded.distro_version, arch=excluded.arch, "
                        "ip=excluded.ip, liveness=excluded.liveness, last_seen=excluded.last_seen, "
                        "updated_at=excluded.updated_at",
                        (host_id, os_info.get("platform"), os_info.get("name"), os_info.get("version"),
                         os_info.get("arch"), a.get("ip"), a.get("status"),
                         str(a.get("syscollector_scan_interval", "")), now, now),
                    )
                    updated_facts += 1
                else:
                    cur = conn.execute(
                        "INSERT INTO discovered_agents(wazuh_agent_id, reported_name, reported_os, "
                        "reported_group, first_seen, last_seen) VALUES (?,?,?,?,?,?) "
                        "ON CONFLICT(wazuh_agent_id) DO UPDATE SET reported_name=excluded.reported_name, "
                        "reported_os=excluded.reported_os, last_seen=excluded.last_seen",
                        (aid, a.get("name"), os_info.get("platform"),
                         ",".join(a.get("group", []) or []), now, now),
                    )
                    if cur.rowcount:
                        new_discovered += 1

    # A bound host that vanished from Wazuh: flag stale + escalate (missing_from_wazuh).
    missing = [hid for aid, hid in bound.items() if aid not in seen_ids]
    for hid in missing:
        escalations.enqueue(db, "missing_from_wazuh", host=hid)

    return {"seen": len(seen_ids), "new_discovered": new_discovered,
            "updated_facts": updated_facts, "missing": len(missing)}


def poll_once(db, settings, snapshot) -> SyncStatus:
    if not settings.wazuh_enabled:
        return SyncStatus(False, None, None, "wazuh_disabled")
    token = _authenticate(settings)
    if not token:
        return SyncStatus(False, now_iso(), None, "authenticate_failed")
    agents = fetch_agents(settings, token)
    if agents is None:
        return SyncStatus(False, now_iso(), None, "fetch_failed")
    reconcile(db, snapshot, agents)
    return SyncStatus(True, now_iso(), None, "")


def bind_agent(db, wazuh_agent_id: str, host_id: str) -> None:
    """Mark a discovered agent as bound (operator-confirmed). The actual host record + the
    wazuh mapping are written through the change-control ceremony; this just clears it from
    the queue."""
    with db.write_lock:
        conn = db.writer
        with conn:
            conn.execute("UPDATE discovered_agents SET bound_host_id=? WHERE wazuh_agent_id=?",
                         (host_id, wazuh_agent_id))
