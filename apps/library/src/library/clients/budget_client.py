"""library.clients.budget_client — budget middleware (auth-exposed budget API + F14).

DEPLOYMENT §3 / auth §1 resolution of finding F14: RSes NEVER open auth's Redis. They
reach the shared budget dimensions via an auth-exposed budget-check/admission API, and
keep a Redis-independent, always-available in-process CONCURRENCY CEILING.

Fallback rule (auth §1, verbatim):
  budget-API unreachable ⇒ benign paths allow-but-locally-bounded; sod/destructive
  paths 503 fail-closed. The Library has NO sod/destructive path (PLAN §5.5 manifest),
  so an outage degrades to the local ceiling only — it never opens a hole.

Also enforces the per-`sub` proposal quota (PLAN §4, default 50/day): a poisoning
campaign is a volume play, so volume is observable and bounded even without auth.
"""
from __future__ import annotations

import json
import threading
import time
import urllib.request
from typing import Callable, Optional

from ..errors import BudgetExceeded

Transport = Callable[[str, bytes, dict], tuple[int, bytes]]


class BudgetClient:
    def __init__(self, budget_api: str = "", *, concurrency_ceiling: int = 32,
                 propose_quota_per_day: int = 50, timeout_s: float = 0.25,
                 transport: Optional[Transport] = None, clock: Callable[[], float] = time.time):
        self.budget_api = budget_api.rstrip("/")
        self.ceiling = concurrency_ceiling
        self.propose_quota = propose_quota_per_day
        self.timeout_s = timeout_s  # ~250ms live-check timeout (auth §2)
        self._transport = transport
        self._clock = clock
        self._inflight = 0
        self._lock = threading.Lock()
        self._propose_counts: dict[str, list] = {}  # sub -> [day_epoch, count]

    # ── in-process concurrency ceiling (always available) ─────────────────────
    def acquire(self) -> None:
        with self._lock:
            if self._inflight >= self.ceiling:
                raise BudgetExceeded("in-process concurrency ceiling reached")
            self._inflight += 1

    def release(self) -> None:
        with self._lock:
            if self._inflight > 0:
                self._inflight -= 1

    # ── per-sub proposal quota (volume bound on poisoning campaigns) ──────────
    def check_propose_quota(self, sub: str) -> None:
        day = int(self._clock()) // 86400
        with self._lock:
            rec = self._propose_counts.get(sub)
            if not rec or rec[0] != day:
                rec = [day, 0]
                self._propose_counts[sub] = rec
            if rec[1] >= self.propose_quota:
                raise BudgetExceeded(f"proposal quota {self.propose_quota}/day reached")
            rec[1] += 1

    # ── shared budget dimensions via auth's budget API (best-effort, benign) ──
    def check_shared_budget(self, sub: str, action_class: str) -> None:
        """Consult auth's budget API. Unreachable ⇒ benign allow (Library has no
        sod/destructive path that must fail closed)."""
        if not self.budget_api:
            return  # no API configured — local ceiling governs
        payload = json.dumps({"sub": sub, "action_class": action_class}).encode()
        headers = {"Content-Type": "application/json"}
        try:
            if self._transport is not None:
                status, body = self._transport(self.budget_api, payload, headers)
            else:
                req = urllib.request.Request(self.budget_api + "/budget/check",
                                             data=payload, headers=headers, method="POST")
                with urllib.request.urlopen(req, timeout=self.timeout_s) as r:
                    status, body = r.status, r.read()
        except Exception:
            return  # benign allow-but-locally-bounded (auth §1 fallback)
        if status == 429:
            raise BudgetExceeded("shared budget exhausted")
        # any other status ⇒ benign allow
