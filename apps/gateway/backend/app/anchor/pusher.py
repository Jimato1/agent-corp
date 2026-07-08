"""Anchor pusher — signed audit-chain HEADs → MC (seam #25; gateway-mc-audit-anchor.md).

A hash chain proves internal consistency only; **freshness is provable only by anchoring the
signed HEAD somewhere the Gateway host cannot rewrite.** MC retains the HEAD series as that
independent witness (an anchor, never a source of truth).

* **Push:** ``POST /api/anchors`` on MC, ``svc:gateway`` bearer scope ``mc:anchor``; payload
  ``{chain_id, seq, head_hash, signed_at, sig, prev_seq}``. Idempotent by ``(chain_id, seq)``.
* **Cadence:** every 100 records OR 5 min OR every run-terminal.
* **Backfill:** on (re)connect, read MC's advertised last ``(chain_id, seq)`` and re-push
  every retained HEAD above it (≥180d retention).
* **Failure:** anchor-push failure **alarms but does NOT halt** Gateway execution (the local
  chain remains fail-closed on its own audit-write). MC renders gaps as ``RESYNC-PENDING``.
* **Restore:** a restored DB whose latest HEAD for a ``chain_id`` is OLDER than MC's retained
  latest must continue under a NEW ``chain_id`` (never re-push a lower ``seq`` as current).
"""
from __future__ import annotations

from ..clock import now_iso


class AnchorPusher:
    def __init__(self, state) -> None:
        self.st = state

    def push_head(self) -> dict:
        """Checkpoint + best-effort push the current HEAD. Alarms (returns pushed:false) on
        failure; NEVER raises into the dispatcher (execution is not gated on anchoring)."""
        cp = self.st.chain.checkpoint()
        if cp is None:
            return {"pushed": False, "reason": "empty chain"}
        head = {"chain_id": cp["chain_id"], "seq": cp["head_seq"], "head_hash": cp["head_hash"],
                "signed_at": cp.get("signed_at", now_iso()), "sig": cp["sig"], "prev_seq": max(0, cp["head_seq"] - 1)}
        ok = self.st.clients.mc.push_anchor(head)
        if ok:
            with self.st.db.tx() as c:
                c.execute("UPDATE chain_heads SET pushed_to_mc_at = ? WHERE chain_id = ? AND head_seq = ?",
                          (now_iso(), cp["chain_id"], cp["head_seq"]))
        return {"pushed": ok, "chain_id": cp["chain_id"], "seq": cp["head_seq"]}

    def backfill(self) -> dict:
        """Re-push every retained HEAD above MC's advertised last (chain_id, seq)."""
        last = self.st.clients.mc.advertised_last(self.st.settings.chain_id)
        floor = int((last or {}).get("seq", -1)) if isinstance(last, dict) else -1
        c = self.st.db.reader()
        try:
            c.execute("SELECT * FROM chain_heads WHERE chain_id = ? AND head_seq > ? ORDER BY head_seq ASC",
                      (self.st.settings.chain_id, floor))
            rows = c.fetchall()
        finally:
            c.close()
        pushed = 0
        for row in rows:
            head = {"chain_id": row["chain_id"], "seq": row["head_seq"], "head_hash": row["head_hash"],
                    "signed_at": row["signed_at"], "sig": row["sig"], "prev_seq": max(0, int(row["head_seq"]) - 1)}
            if self.st.clients.mc.push_anchor(head):
                pushed += 1
        return {"pushed": pushed, "above_seq": floor}

    def anchor_status(self) -> dict:
        c = self.st.db.reader()
        try:
            c.execute("SELECT head_seq, pushed_to_mc_at FROM chain_heads WHERE chain_id = ? ORDER BY head_seq DESC LIMIT 1",
                      (self.st.settings.chain_id,))
            last = c.fetchone()
        finally:
            c.close()
        if not last:
            return {"status": "no_heads", "last_head_seq": None, "pushed": False}
        return {"status": "in_sync" if last["pushed_to_mc_at"] else "resync_pending",
                "last_head_seq": int(last["head_seq"]), "pushed_at": last["pushed_to_mc_at"]}
