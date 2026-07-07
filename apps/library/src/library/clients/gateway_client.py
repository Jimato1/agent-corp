"""library.clients.gateway_client — Gateway get_sandbox_evidence(run_id).

Contract (gateway-cmdb-library-sandbox.md §G6, FROZEN both halves 2026-07-03):
    get_sandbox_evidence(run_id)  [scope gateway:read] → {
        run_id, ticket_id, profile_key, harness_version, input_ref,
        transcript_ref (content-addressed blob + hash in the Gateway audit chain),
        exit_status, env_fingerprint (image digest + package versions),
        started, finished }
  Hash-chained; joined to Library by `run_id`. Library stores evidence LINKS only.

This is the `get_execution_status(run_id)`-class read the Library registered as its
consumer requirement. It exists ONLY to VALIDATE Gateway-delivered evidence for the
auto-admit lane; coverage (`covered_anchors`) is DERIVED Library-side from this
payload, NEVER accepted from an agent (PLAN §2.4 F2).

NOTE: the auto-admit lane that consumes this is gated OFF by config
(Config.auto_admit_enabled, default False) until D-7 go-live. This client is built
and correct; it is simply not invoked while the lane is disabled.
"""
from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Callable, Optional

Transport = Callable[[str], tuple[int, bytes]]


class GatewayClient:
    def __init__(self, base_url: str, *, timeout_s: float = 10.0,
                 transport: Optional[Transport] = None, auth_token: str = ""):
        self.base_url = base_url.rstrip("/")
        self.timeout_s = timeout_s
        self._transport = transport
        self.auth_token = auth_token

    def get_sandbox_evidence(self, run_id: str) -> Optional[dict]:
        """Return the G6 evidence payload for a run_id, or None if unavailable/unknown.
        None ⇒ the auto-admit gate CANNOT be satisfied (fails closed to review)."""
        try:
            if self._transport is not None:
                status, body = self._transport(run_id)
            else:
                url = f"{self.base_url}/mcp/get_sandbox_evidence?run_id={urllib.parse.quote(run_id)}"
                headers = {}
                if self.auth_token:
                    headers["Authorization"] = f"Bearer {self.auth_token}"
                req = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(req, timeout=self.timeout_s) as r:
                    status, body = r.status, r.read()
        except Exception:
            return None
        if status != 200:
            return None
        try:
            obj = json.loads(body)
        except (ValueError, TypeError):
            return None
        if obj.get("run_id") != run_id:
            return None  # never accept evidence that doesn't bind to the requested run_id
        return obj
