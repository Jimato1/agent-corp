"""library.clients.cmdb_client — CMDB resolve_host_facts (version-scoped retrieval).

Contract (cmdb-library-hostfacts.md, FROZEN in shape):
    resolve_host_facts(host_id) → {os_family, distro, distro_version, arch,
                                   [package_manager, eol_date]} | not_found
  * inventory facts ONLY (never tier/window/credential/policy).
  * short-TTL cacheable; scope `cmdb:read-policy`, audience `cmdb`.
  * FAIL-LOUD open-but-flagged: host_id supplied but CMDB unreachable / host unknown
    ⇒ Library DISABLES the hard version filter and flags version_scope=unverified
    (retrieval.py). This client returns None in that case — never a wrong fact.
  * `eol_date` consumed at QUERY time for the EOL soft penalty (never stored in index).
"""
from __future__ import annotations

import json
import time
import urllib.error
import urllib.parse
import urllib.request
from typing import Callable, Optional

Transport = Callable[[str], tuple[int, bytes]]


class CMDBClient:
    def __init__(self, base_url: str, *, ttl_s: int = 60, timeout_s: float = 5.0,
                 transport: Optional[Transport] = None, auth_token: str = ""):
        self.base_url = base_url.rstrip("/")
        self.ttl_s = ttl_s
        self.timeout_s = timeout_s
        self._transport = transport
        self.auth_token = auth_token
        self._cache: dict[str, tuple[float, Optional[dict]]] = {}

    def resolve_host_facts(self, host_id: str) -> Optional[dict]:
        now = time.time()
        hit = self._cache.get(host_id)
        if hit and now - hit[0] < self.ttl_s:
            return hit[1]
        facts = self._fetch(host_id)
        self._cache[host_id] = (now, facts)
        return facts

    def eol_date(self, host_id: str) -> Optional[str]:
        facts = self.resolve_host_facts(host_id)
        return facts.get("eol_date") if facts else None

    def _fetch(self, host_id: str) -> Optional[dict]:
        url = f"{self.base_url}/mcp/resolve_host_facts?host_id={urllib.parse.quote(host_id)}"
        try:
            if self._transport is not None:
                status, body = self._transport(host_id)
            else:
                headers = {}
                if self.auth_token:
                    headers["Authorization"] = f"Bearer {self.auth_token}"
                req = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout_s) as r:
                    status, body = r.status, r.read()
        except Exception:
            return None  # unreachable ⇒ fail-loud-open-but-flagged (caller flags unverified)
        if status != 200:
            return None  # host unknown / not_found ⇒ None (never a wrong filter)
        try:
            obj = json.loads(body)
        except (ValueError, TypeError):
            return None
        if obj.get("not_found") or not obj.get("os_family"):
            return None
        # keep only inventory fields (never policy) — defensive projection
        return {
            "os_family": obj.get("os_family"),
            "distro": obj.get("distro"),
            "distro_version": obj.get("distro_version"),
            "arch": obj.get("arch"),
            "package_manager": obj.get("package_manager"),
            "eol_date": obj.get("eol_date"),
        }
