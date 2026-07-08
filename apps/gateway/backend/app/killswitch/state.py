"""Kill switch — the L2 physical stop (killswitch-chain.md; PLAN §8).

auth is the SINGLE enforcement point (L1, sole epoch writer); the Gateway is the **L2
physical stop outside auth's trust boundary**. Halting the Gateway halts all destructive
action suite-wide because the four-check chain (§3) is the ONLY path to execution and the
sandbox branch funnels through the same dispatcher.

* **Monotonic intake:** ``kill_state`` mirrors auth's epoch/level; a stale epoch NEVER lowers
  a level (a lower/stale epoch never un-does a higher one — IDENTIFIERS.md epoch rule).
* **At level ≥ G1:** ``gate()`` refuses all new dispatch (``execute_approved_plan`` and
  sandbox runs return HALTED before Check 1) and refuses to BEGIN Vault redemptions; the
  dispatcher cancels in-flight runs at the next safe task boundary via the runner
  ``cancel_callback`` (never SIGKILL a live dpkg transaction) and revokes outstanding leases.
* **L2 confirmation:** ``halt_status()`` is the tuple auth reads directly as the SOLE
  legitimate L2-CONFIRMED source; MC relays render only as STALE-UNKNOWN.

Two independent refusals: the Board ALSO refuses ``consume_approval`` at ≥ G1 — a Gateway
that somehow missed the epoch still cannot consume.
"""
from __future__ import annotations

import json

from ..clock import now_iso
from ..checks import HALTED, HardReject

_LEVEL_RANK = {"G0": 0, "G1": 1, "G2": 2}


class KillState:
    def __init__(self, db, signer) -> None:
        self.db = db
        self.signer = signer
        self._ensure_row()

    def _ensure_row(self) -> None:
        with self.db.tx() as c:
            c.execute("SELECT id FROM kill_state WHERE id = 1")
            if c.fetchone() is None:
                c.execute("INSERT INTO kill_state(id, epoch, level, local_halt, updated_at) VALUES (1,0,'G0',0,?)",
                          (now_iso(),))

    def current(self) -> dict:
        c = self.db.reader()
        try:
            c.execute("SELECT epoch, level, local_halt, last_refused_at FROM kill_state WHERE id = 1")
            return c.fetchone() or {"epoch": 0, "level": "G0", "local_halt": 0, "last_refused_at": None}
        finally:
            c.close()

    def observe(self, epoch: int, level: str) -> dict:
        """Monotonic update: only a STRICTLY HIGHER epoch may change level; a stale epoch is a no-op.

        A level change to a LOWER level requires a higher epoch (only the operator lifts a kill,
        killswitch-chain §6 — enforced upstream by auth; here we simply never lower on a stale epoch).
        """
        cur = self.current()
        if int(epoch) <= int(cur["epoch"]) and level == cur["level"]:
            return cur
        if int(epoch) < int(cur["epoch"]):
            return cur  # stale epoch never changes anything
        with self.db.tx() as c:
            c.execute("UPDATE kill_state SET epoch = ?, level = ?, updated_at = ? WHERE id = 1",
                      (int(epoch), level, now_iso()))
        return self.current()

    def set_local_halt(self, on: bool) -> None:
        with self.db.tx() as c:
            c.execute("UPDATE kill_state SET local_halt = ?, updated_at = ? WHERE id = 1",
                      (1 if on else 0, now_iso()))

    def note_refusal(self) -> None:
        with self.db.tx() as c:
            c.execute("UPDATE kill_state SET last_refused_at = ? WHERE id = 1", (now_iso(),))

    def is_frozen(self) -> bool:
        cur = self.current()
        return _LEVEL_RANK.get(str(cur["level"]), 0) >= 1 or bool(cur["local_halt"])

    def gate(self) -> None:
        """Refuse new dispatch at kill level ≥ G1 (or a local halt). Raises HALTED — obeyed
        regardless of what the driven agent wants (the chokepoint property)."""
        if self.is_frozen():
            self.note_refusal()
            raise HardReject(HALTED, "kill switch engaged (≥G1) — new dispatch refused", burned_approval=False)

    def in_flight(self) -> int:
        c = self.db.reader()
        try:
            c.execute("SELECT COUNT(*) AS n FROM runs WHERE state IN "
                      "('executing','health_check','rolling_back','reporting')")
            return int(c.fetchone()["n"])
        finally:
            c.close()

    def halt_status(self) -> dict:
        """The signed L2-CONFIRMED tuple auth reads directly (killswitch-chain §4, R9)."""
        cur = self.current()
        tup = {
            "epoch_seen": int(cur["epoch"]),
            "level": str(cur["level"]),
            "in_flight_runs": self.in_flight(),
            "last_dispatch_refused_at": cur["last_refused_at"],
            "local_halt": bool(cur["local_halt"]),
        }
        payload = json.dumps(tup, separators=(",", ":"), sort_keys=True).encode("utf-8")
        tup["sig"] = self.signer.sign(payload)
        tup["kid"] = self.signer.kid
        return tup
