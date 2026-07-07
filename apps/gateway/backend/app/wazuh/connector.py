"""Wazuh connector — READ-ONLY (§7). It NEVER executes; no Wazuh write path exists here.

Two clients, both credentials Vault-held, read-only via Wazuh RBAC: the Indexer ``:9200``
(``_search`` over ``wazuh-states-vulnerabilities-*`` — the PRIMARY posture/verification
source) and the Server API ``:55000`` (agent liveness, Syscollector metadata). Version-probe
at startup; refuse 5.x.

Duties: baseline posture pulls for recon (``get_fleet_posture`` read tool) and **verification
polling** — after ``executing → verifying``, poll for **document disappearance** of each
``(vulnerability.id, agent.id)`` pair recorded pre-patch (D-9), then submit evidence to the
Board (which flips ``verifying → done|failed``). ``agent.id → host_id`` only via CMDB's
mapping, never raw alert fields (alert text is host-originated adversarial input, ARCH §12).
**Done is confirmed externally** — the connector is that external verifier's reader.
"""
from __future__ import annotations


class WazuhConnector:
    def __init__(self, settings, http) -> None:
        self.s = settings
        self.http = http

    def _headers(self) -> dict:
        # Credentials are Vault handles in prod; this build reads posture without secrets.
        return {"Accept": "application/json"}

    def enabled(self) -> bool:
        return bool(self.s.wazuh_enabled)

    def posture(self, host_id: str | None = None) -> dict:
        """Read-only posture for recon (get_fleet_posture). Never mutates Wazuh."""
        if not self.enabled():
            return {"available": False, "reason": "wazuh disabled", "hosts": []}
        try:
            q = {"query": {"match_all": {}}} if host_id is None else {"query": {"term": {"agent.id": host_id}}}
            r = self.http.post(f"{self.s.wazuh_indexer_url}/wazuh-states-vulnerabilities-*/_search",
                               headers=self._headers(), json=q, timeout=3.0)
            data = r.json()
            hits = (data.get("hits") or {}).get("hits", [])
            # provenance: every field here is host-originated (adversarial input) — never
            # interpolated into a command; returned as read-only DATA carrying its taint.
            return {"available": True, "count": len(hits),
                    "vulnerabilities": [h.get("_source", {}) for h in hits], "provenance": "host-originated"}
        except Exception as exc:  # noqa: BLE001
            return {"available": False, "reason": str(exc), "hosts": []}

    def verify_remediation(self, pairs: list[dict]) -> dict:
        """Poll for document disappearance of each (vulnerability.id, agent.id) pair (D-9).

        Returns evidence ``{result: confirmed|refuted|timeout, evidence:{...}}`` the caller
        submits to the Board. Requires a completed post-change scan (Syscollector interval).
        """
        if not self.enabled():
            return {"result": "timeout", "evidence": {"reason": "wazuh disabled"}}
        still_present = []
        for pair in pairs:
            try:
                q = {"query": {"bool": {"must": [
                    {"term": {"vulnerability.id": pair["vulnerability_id"]}},
                    {"term": {"agent.id": pair["agent_id"]}}]}}}
                r = self.http.post(f"{self.s.wazuh_indexer_url}/wazuh-states-vulnerabilities-*/_search",
                                   headers=self._headers(), json=q, timeout=3.0)
                total = (r.json().get("hits") or {}).get("total", {}).get("value", 0)
                if total:
                    still_present.append(pair)
            except Exception:
                return {"result": "timeout", "evidence": {"reason": "indexer unreachable"}}
        if still_present:
            return {"result": "refuted", "evidence": {"still_present": still_present}}
        return {"result": "confirmed", "evidence": {"absence_result": "all pairs gone"}}
